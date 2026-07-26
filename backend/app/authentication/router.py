import random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import logging
import secrets
import os

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.user import User, RoleEnum, UserStatusEnum
from app.models.auth import OtpRequest, AuthSession, LoginHistory
from app.schemas.auth import OtpRequestSchema, OtpVerifySchema, TokenSchema, RefreshTokenSchema
from app.authentication.jwt import create_access_token, create_refresh_token, get_current_user
from app.services.sms_service import get_sms_provider, SmsProvider

router = APIRouter(prefix="/auth", tags=["Authentication"])

IS_DEV = os.getenv("SMS_PROVIDER", "DEV") == "DEV"

def _mask_phone(phone: str) -> str:
    if len(phone) <= 4:
        return "***"
    return phone[0] + "*" * (len(phone) - 5) + phone[-4:]

def generate_otp() -> str:
    """Cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)

@router.post("/request-otp", status_code=status.HTTP_200_OK)
async def request_otp(data: OtpRequestSchema, db: AsyncSession = Depends(get_db)):
    masked_phone = _mask_phone(data.phone_number)
    logger.info(f"OTP request received for {masked_phone} (role={data.role})")

    # Rate limit: max 5 OTP requests per phone per 5 minutes
    result = await db.execute(
        select(OtpRequest)
        .where(OtpRequest.phone_number == data.phone_number)
        .where(OtpRequest.created_at >= datetime.now(timezone.utc) - timedelta(minutes=5))
    )
    requests_in_last_5m = result.scalars().all()
    if len(requests_in_last_5m) >= 5:
        logger.warning(f"Rate limit hit for {masked_phone}: {len(requests_in_last_5m)} requests in last 5 min")
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please wait 5 minutes.")

    otp_code = generate_otp()
    logger.info(f"OTP generated for {masked_phone}")

    # Send via configured SMS provider
    sms_provider: SmsProvider = get_sms_provider()
    logger.info(f"Dispatching OTP to {masked_phone} via {sms_provider.__class__.__name__}")

    try:
        success = await sms_provider.send_otp(data.phone_number, otp_code)
    except Exception as e:
        logger.error(f"SMS Provider exception for {masked_phone}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"SMS provider error: {str(e)}")

    if not success:
        logger.error(f"SMS Provider returned failure for {masked_phone}")
        raise HTTPException(status_code=500, detail="Failed to deliver OTP. Please try again.")

    logger.info(f"OTP dispatched successfully to {masked_phone}")

    # Store OTP in DB
    otp_record = OtpRequest(
        phone_number=data.phone_number,
        otp_code=otp_code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    db.add(otp_record)
    await db.commit()
    logger.info(f"OTP stored in DB for {masked_phone}. Expires: {otp_record.expires_at}")

    # In DEV mode, include the OTP in the response so the frontend can display it
    response: dict = {"message": "OTP sent successfully"}
    if IS_DEV:
        response["dev_otp"] = otp_code
        response["dev_note"] = "DEV MODE: OTP is included in this response only for local testing. Remove in production."

    return response


@router.get("/dev/otp/{phone_number}", tags=["Development"])
async def dev_get_latest_otp(phone_number: str, db: AsyncSession = Depends(get_db)):
    """
    DEV ONLY endpoint: Returns the latest unverified OTP for a phone number.
    This endpoint is disabled in production (when SMS_PROVIDER != DEV).
    """
    if not IS_DEV:
        raise HTTPException(status_code=403, detail="This endpoint is only available in development mode.")

    result = await db.execute(
        select(OtpRequest)
        .where(OtpRequest.phone_number == phone_number)
        .where(OtpRequest.verified == False)
        .where(OtpRequest.expires_at >= datetime.now(timezone.utc))
        .order_by(OtpRequest.created_at.desc())
    )
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(status_code=404, detail="No active OTP found for this number.")

    return {
        "phone_number": phone_number,
        "otp_code": otp_record.otp_code,
        "expires_at": otp_record.expires_at.isoformat(),
        "attempts": otp_record.attempts,
        "dev_note": "DEV MODE ONLY — never expose this in production"
    }


@router.post("/verify-otp", response_model=TokenSchema)
async def verify_otp(request: Request, data: OtpVerifySchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OtpRequest)
        .where(OtpRequest.phone_number == data.phone_number)
        .where(OtpRequest.verified == False)
        .order_by(OtpRequest.created_at.desc())
    )
    otp_request = result.scalars().first()

    masked_phone = _mask_phone(data.phone_number)
    logger.info(f"OTP verification attempt for {masked_phone}")

    if not otp_request:
        logger.warning(f"Verification failed: no pending OTP for {masked_phone}")
        raise HTTPException(status_code=400, detail="No pending OTP request found. Please request a new OTP.")

    if otp_request.expires_at < datetime.now(timezone.utc):
        logger.warning(f"Verification failed: OTP expired for {masked_phone}")
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if otp_request.attempts >= 3:
        logger.warning(f"Verification failed: max attempts reached for {masked_phone}")
        raise HTTPException(status_code=400, detail="Maximum attempts reached. Please request a new OTP.")

    if otp_request.otp_code != data.otp_code:
        otp_request.attempts += 1
        await db.commit()
        remaining = 3 - otp_request.attempts
        logger.warning(f"Verification failed: invalid OTP for {masked_phone} (attempt {otp_request.attempts}/3)")
        raise HTTPException(status_code=400, detail=f"Invalid OTP code. {remaining} attempt(s) remaining.")

    otp_request.verified = True
    logger.info(f"OTP verified for {masked_phone}")

    # Find or create user
    user_result = await db.execute(
        select(User).where(User.phone_number == data.phone_number).where(User.role == data.role)
    )
    user = user_result.scalars().first()

    is_new_user = False
    if not user:
        is_new_user = True
        user = User(phone_number=data.phone_number, role=data.role)
        db.add(user)
        await db.flush()
        logger.info(f"New user created for {masked_phone} (role={data.role})")
    else:
        logger.info(f"Existing user authenticated: {masked_phone}")

    # Generate JWT tokens
    access_token = create_access_token(subject=str(user.id), role=getattr(user.role, 'value', user.role))
    refresh_token = create_refresh_token(subject=str(user.id))
    logger.info(f"JWT tokens generated for {masked_phone}")

    # Save auth session
    client_ip = request.client.host if request.client else None
    session = AuthSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        device_info=data.device_info,
        ip_address=client_ip
    )
    db.add(session)

    # Record login history
    history = LoginHistory(
        user_id=user.id,
        phone_number=data.phone_number,
        ip_address=client_ip,
        status="SUCCESS",
        browser=request.headers.get("user-agent")
    )
    db.add(history)

    await db.commit()
    logger.info(f"Auth session created for {masked_phone}. Login complete.")

    return TokenSchema(
        access_token=access_token,
        refresh_token=refresh_token,
        is_new_user=is_new_user
    )


@router.post("/refresh", response_model=TokenSchema)
async def refresh_token(request: Request, data: RefreshTokenSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuthSession)
        .where(AuthSession.refresh_token == data.refresh_token)
        .where(AuthSession.is_revoked == False)
    )
    session = result.scalars().first()

    if not session or session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalars().first()

    if not user or user.status != UserStatusEnum.ACTIVE:
        raise HTTPException(status_code=401, detail="User inactive or deleted")

    access_token = create_access_token(subject=str(user.id), role=getattr(user.role, 'value', user.role))
    new_refresh_token = create_refresh_token(subject=str(user.id))

    session.refresh_token = new_refresh_token
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.commit()

    return TokenSchema(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
async def logout(data: RefreshTokenSchema, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(AuthSession)
        .where(AuthSession.refresh_token == data.refresh_token)
        .where(AuthSession.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "Logged out successfully"}

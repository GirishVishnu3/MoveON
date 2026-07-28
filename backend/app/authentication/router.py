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
from app.models.user import User, UserStatusEnum
from app.models.auth import OtpRequest, AuthSession, LoginHistory
from app.schemas.auth import OtpRequestSchema, OtpVerifySchema, TokenSchema, RefreshTokenSchema
from app.authentication.jwt import create_access_token, create_refresh_token, get_current_user
from app.services.sms_service import get_sms_provider, OtpResult, generate_local_otp

router = APIRouter(prefix="/auth", tags=["Authentication"])

logger.info(f"[AUTH] SMS_PROVIDER={os.getenv('SMS_PROVIDER', 'LOCAL')} initialised")


def _mask_phone(phone: str) -> str:
    if len(phone) <= 4:
        return "***"
    return phone[0] + "*" * (len(phone) - 5) + phone[-4:]


def _make_aware(dt) -> datetime:
    """SQLite returns naive datetimes — attach UTC timezone so comparisons don't crash."""
    if dt is None:
        return dt
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# POST /auth/request-otp
# ---------------------------------------------------------------------------
@router.post("/request-otp", status_code=status.HTTP_200_OK)
async def request_otp(data: OtpRequestSchema, db: AsyncSession = Depends(get_db)):
    """
    Trigger OTP delivery to the provided phone number via SMS.
    Returns only a success confirmation — the OTP is never included in the response.
    """
    masked = _mask_phone(data.phone_number)
    logger.info(f"OTP request received for {masked} (role={data.role})")

    # Rate limit: max 5 requests per phone per 5 minutes (DB-tracked for all modes)
    now_utc = datetime.now(timezone.utc)
    five_min_ago = now_utc - timedelta(minutes=5)
    rate_result = await db.execute(
        select(OtpRequest)
        .where(OtpRequest.phone_number == data.phone_number)
        .where(OtpRequest.created_at >= five_min_ago.replace(tzinfo=None))
    )
    if len(rate_result.scalars().all()) >= 5:
        logger.warning(f"Rate limit exceeded for {masked}")
        raise HTTPException(
            status_code=429,
            detail="Too many OTP requests. Please wait 5 minutes before trying again.",
        )

    provider = get_sms_provider()
    logger.info(f"Using SMS provider: {provider.__class__.__name__}")

    if provider.manages_otp_lifecycle:
        # --- Twilio Verify path: Twilio generates & delivers the OTP ---
        try:
            result = await provider.send_otp(data.phone_number)
        except Exception as exc:
            logger.error(f"SMS provider exception for {masked}: {exc}", exc_info=True)
            raise HTTPException(status_code=503, detail="SMS service unavailable. Please try again shortly.")

        if result == OtpResult.INVALID_NUMBER:
            raise HTTPException(status_code=422, detail="Invalid phone number. Please check the number and try again.")
        if result != OtpResult.SENT:
            logger.error(f"Provider returned {result} for {masked}")
            raise HTTPException(status_code=503, detail="Failed to send OTP. Please try again.")

        # Store a rate-limit record (no OTP stored — Twilio owns it)
        db.add(OtpRequest(
            phone_number=data.phone_number,
            otp_code="",   # not stored — managed by Twilio
            expires_at=now_utc + timedelta(minutes=10),
        ))
        await db.commit()
        logger.info(f"OTP dispatched via Twilio Verify for {masked}")

    else:
        # --- LOCAL path: we generate + store the OTP, log it to server console only ---
        otp_code = generate_local_otp()
        # Log OTP to SERVER CONSOLE only — it is never sent to the API client
        logger.warning(
            f"[LOCAL] OTP for {masked}: {otp_code}  "
            "(server log only — set SMS_PROVIDER=TWILIO_VERIFY for real SMS)"
        )
        db.add(OtpRequest(
            phone_number=data.phone_number,
            otp_code=otp_code,
            expires_at=now_utc + timedelta(minutes=5),
        ))
        await db.commit()
        logger.info(f"[LOCAL] OTP stored for {masked}")

    return {"message": "OTP sent to your registered mobile number."}


# ---------------------------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------------------------
@router.post("/verify-otp", response_model=TokenSchema)
async def verify_otp(request: Request, data: OtpVerifySchema, db: AsyncSession = Depends(get_db)):
    """
    Validate the OTP entered by the user and issue JWT tokens on success.
    The backend validates the OTP — the client is never told whether the OTP
    was correct or incorrect beyond a single generic error message to prevent enumeration.
    """
    masked = _mask_phone(data.phone_number)
    logger.info(f"OTP verification attempt for {masked}")

    provider = get_sms_provider()

    if provider.manages_otp_lifecycle:
        # --- Twilio Verify path: delegate validation to Twilio ---
        try:
            result = await provider.verify_otp(data.phone_number, data.otp_code)
        except Exception as exc:
            logger.error(f"Verify exception for {masked}: {exc}", exc_info=True)
            raise HTTPException(status_code=503, detail="Verification service unavailable. Please try again.")

        if result == OtpResult.APPROVED:
            logger.info(f"OTP approved by Twilio Verify for {masked}")
        elif result == OtpResult.MAX_ATTEMPTS:
            raise HTTPException(status_code=400, detail="Too many incorrect attempts. Please request a new OTP.")
        elif result == OtpResult.EXPIRED:
            raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
        else:
            # INVALID, FAILED — do not hint whether code was wrong or expired
            raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")

    else:
        # --- LOCAL path: validate against our DB ---
        otp_result = await db.execute(
            select(OtpRequest)
            .where(OtpRequest.phone_number == data.phone_number)
            .where(OtpRequest.verified == False)
            .order_by(OtpRequest.created_at.desc())
        )
        otp_record = otp_result.scalars().first()

        if not otp_record:
            logger.warning(f"No pending OTP found for {masked}")
            raise HTTPException(status_code=400, detail="No pending OTP. Please request a new one.")

        if _make_aware(otp_record.expires_at) < datetime.now(timezone.utc):
            logger.warning(f"OTP expired for {masked}")
            raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

        if otp_record.attempts >= 3:
            logger.warning(f"Max OTP attempts reached for {masked}")
            raise HTTPException(status_code=400, detail="Too many incorrect attempts. Please request a new OTP.")

        if otp_record.otp_code != data.otp_code:
            otp_record.attempts += 1
            await db.commit()
            remaining = 3 - otp_record.attempts
            logger.warning(f"Incorrect OTP for {masked} (attempt {otp_record.attempts}/3)")
            raise HTTPException(
                status_code=400,
                detail=f"Incorrect OTP. {remaining} attempt(s) remaining.",
            )

        otp_record.verified = True
        logger.info(f"[LOCAL] OTP verified for {masked}")

    # ---------------------------------------------------------------------------
    # OTP accepted — find or create the user, then issue JWT tokens
    # ---------------------------------------------------------------------------
    user_result = await db.execute(
        select(User)
        .where(User.phone_number == data.phone_number)
        .where(User.role == data.role)
    )
    user = user_result.scalars().first()

    is_new_user = False
    if not user:
        is_new_user = True
        user = User(phone_number=data.phone_number, role=data.role)
        db.add(user)
        await db.flush()
        logger.info(f"New user created for {masked} (role={data.role})")
    else:
        logger.info(f"Existing user authenticated: {masked}")

    access_token = create_access_token(subject=str(user.id), role=getattr(user.role, "value", user.role))
    refresh_token = create_refresh_token(subject=str(user.id))

    client_ip = request.client.host if request.client else None
    db.add(AuthSession(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        device_info=data.device_info,
        ip_address=client_ip,
    ))
    db.add(LoginHistory(
        user_id=user.id,
        phone_number=data.phone_number,
        ip_address=client_ip,
        status="SUCCESS",
        browser=request.headers.get("user-agent"),
    ))
    await db.commit()
    logger.info(f"JWT issued for {masked}. Login complete.")

    return TokenSchema(access_token=access_token, refresh_token=refresh_token, is_new_user=is_new_user)


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------
@router.post("/refresh", response_model=TokenSchema)
async def refresh_token(request: Request, data: RefreshTokenSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuthSession)
        .where(AuthSession.refresh_token == data.refresh_token)
        .where(AuthSession.is_revoked == False)
    )
    session = result.scalars().first()

    if not session or _make_aware(session.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalars().first()

    if not user or user.status != UserStatusEnum.ACTIVE:
        raise HTTPException(status_code=401, detail="User account is inactive or deleted.")

    new_access = create_access_token(subject=str(user.id), role=getattr(user.role, "value", user.role))
    new_refresh = create_refresh_token(subject=str(user.id))

    session.refresh_token = new_refresh
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.commit()

    return TokenSchema(access_token=new_access, refresh_token=new_refresh)


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------
@router.post("/logout")
async def logout(
    data: RefreshTokenSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(AuthSession)
        .where(AuthSession.refresh_token == data.refresh_token)
        .where(AuthSession.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "Logged out successfully."}

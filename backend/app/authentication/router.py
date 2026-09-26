from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import logging
from firebase_admin import auth as firebase_auth

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.user import User, UserStatusEnum
from app.models.auth import AuthSession, LoginHistory
from app.schemas.auth import PhoneOtpRequestSchema, PhoneOtpVerifySchema, TokenSchema, RefreshTokenSchema
from app.authentication.jwt import create_access_token, create_refresh_token, get_current_user
from passlib.context import CryptContext
from app.models.otp import PhoneOTP
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
@router.post("/request-otp")
async def request_otp(data: PhoneOtpRequestSchema, db: AsyncSession = Depends(get_db)):
    """
    Generate a 6-digit OTP for the phone number.
    """
    phone_number = data.phone_number.strip()
    
    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    otp_hash = pwd_context.hash(otp_code)
    
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Invalidate older OTPs for this phone number
    await db.execute(delete(PhoneOTP).where(PhoneOTP.phone_number == phone_number))
    
    otp_entry = PhoneOTP(phone_number=phone_number, otp_hash=otp_hash, expires_at=expires_at)
    db.add(otp_entry)
    await db.commit()
    
    logger.info(f"OTP requested for {phone_number}")
    return {"message": "OTP generated successfully.", "otp": otp_code}

# ---------------------------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------------------------
@router.post("/verify-otp", response_model=TokenSchema)
async def verify_otp(request: Request, data: PhoneOtpVerifySchema, db: AsyncSession = Depends(get_db)):
    """
    Verify the OTP and issue JWT tokens.
    """
    phone_number = data.phone_number.strip()
    
    # Verify OTP
    result = await db.execute(select(PhoneOTP).where(PhoneOTP.phone_number == phone_number))
    otp_entry = result.scalars().first()
    
    if not otp_entry:
        raise HTTPException(status_code=400, detail="No active OTP request found for this phone number.")
        
    if _make_aware(otp_entry.expires_at) < datetime.now(timezone.utc):
        await db.execute(delete(PhoneOTP).where(PhoneOTP.phone_number == phone_number))
        await db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    if not pwd_context.verify(data.otp, otp_entry.otp_hash):
        raise HTTPException(status_code=401, detail="Invalid OTP code.")
        
    # OTP is valid, delete it
    await db.execute(delete(PhoneOTP).where(PhoneOTP.phone_number == phone_number))
    
    # Find or create user
    user_result = await db.execute(
        select(User)
        .where(User.phone_number == phone_number)
        .where(User.role == data.role)
    )
    user = user_result.scalars().first()

    is_new_user = False
    if not user:
        is_new_user = True
        user = User(phone_number=phone_number, role=data.role, full_name=data.full_name)
        db.add(user)
        await db.flush()
        logger.info(f"New user created for {phone_number} (role={data.role})")
    else:
        logger.info(f"Existing user authenticated: {phone_number}")

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
        phone_number=phone_number,
        ip_address=client_ip,
        status="SUCCESS",
        browser=request.headers.get("user-agent"),
    ))
    await db.commit()
    logger.info(f"JWT issued for {phone_number}. Login complete.")

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

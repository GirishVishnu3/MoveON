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
from app.schemas.auth import FirebaseLoginSchema, TokenSchema, RefreshTokenSchema
from app.authentication.jwt import create_access_token, create_refresh_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
# POST /auth/login-firebase
# ---------------------------------------------------------------------------
@router.post("/login-firebase", response_model=TokenSchema)
async def login_firebase(request: Request, data: FirebaseLoginSchema, db: AsyncSession = Depends(get_db)):
    """
    Authenticate a user using a Firebase ID token.
    This replaces the old request-otp/verify-otp flow. Firebase handles the OTP on the frontend.
    """
    try:
        # Verify the Firebase ID token
        decoded_token = firebase_auth.verify_id_token(data.id_token)
        phone_number = decoded_token.get('phone_number')
        
        if not phone_number:
            raise HTTPException(status_code=400, detail="Firebase token does not contain a phone number.")
            
    except Exception as exc:
        logger.error(f"Firebase token verification failed: {exc}", exc_info=True)
        raise HTTPException(status_code=401, detail="Invalid Firebase token.")

    masked = _mask_phone(phone_number)
    logger.info(f"Firebase login attempt for {masked} (role={data.role})")

    # ---------------------------------------------------------------------------
    # Find or create the user, then issue JWT tokens
    # ---------------------------------------------------------------------------
    user_result = await db.execute(
        select(User)
        .where(User.phone_number == phone_number)
        .where(User.role == data.role)
    )
    user = user_result.scalars().first()

    is_new_user = False
    if not user:
        is_new_user = True
        user = User(phone_number=phone_number, role=data.role)
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
        phone_number=phone_number,
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

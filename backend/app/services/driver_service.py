import hashlib
import os
import secrets
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.driver import DriverRepository
from app.schemas.driver import DriverBasicInfoRegisterSchema
from app.models.driver import (
    Driver, AccountStatusEnum, VerificationStatusEnum, OnboardingStatusEnum, DriverOnlineStatusEnum
)
from app.authentication.jwt import create_access_token, create_refresh_token

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with random salt."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return f"{salt}${pwd_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored salt$hash."""
    if not stored_hash or '$' not in stored_hash:
        return False
    salt, original_hash = stored_hash.split('$', 1)
    pwd_hash = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return pwd_hash == original_hash

class DriverAuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DriverRepository(db)

    async def register_basic_info(self, data: DriverBasicInfoRegisterSchema, ip_address: Optional[str] = None, user_agent: Optional[str] = None):
        # 1. Duplicate check
        conflicts = await self.repo.check_duplicates(data.phone_number, data.email)
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=list(conflicts.values())[0]
            )

        # 2. Hash password
        pwd_hash = hash_password(data.password)

        # 3. Create driver payload
        driver_data = {
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone_number": data.phone_number,
            "email": data.email,
            "password_hash": pwd_hash,
            "account_status": AccountStatusEnum.REGISTERED,
            "verification_status": VerificationStatusEnum.PENDING,
            "onboarding_status": OnboardingStatusEnum.STEP1_BASIC_INFO,
            "online_status": DriverOnlineStatusEnum.OFFLINE,
            "wallet_balance": 0.0,
            "rating": 0.0,
            "completed_rides": 0,
            "cancellation_count": 0,
            "acceptance_rate": 0.0,
            "earnings": 0.0,
        }

        profile_data = {
            "dob": data.dob,
            "gender": data.gender,
            "profile_photo_url": data.profile_photo_url,
            "preferred_language": data.preferred_language,
        }

        address_data = {
            "street_address": data.street_address,
            "city": data.city,
            "state": data.state,
            "pincode": data.pincode,
            "landmark": data.landmark,
        }

        emergency_data = {
            "name": data.emergency_contact_name,
            "phone_number": data.emergency_contact_phone,
            "contact_relationship": data.emergency_contact_relationship,
        }

        driver = await self.repo.create_driver(driver_data, profile_data, address_data, emergency_data)

        # 4. Audit Log
        await self.repo.log_audit(
            driver_id=str(driver.id),
            event_type="DRIVER_REGISTER_BASIC_INFO",
            details={"phone_number": data.phone_number, "email": data.email, "driver_id_code": driver.driver_id_code},
            ip_address=ip_address,
            user_agent=user_agent
        )

        return driver

    async def authenticate_driver(self, phone_number: str, password: Optional[str] = None, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Driver:
        driver = await self.repo.get_by_phone(phone_number)
        if not driver:
            await self.repo.log_audit(
                driver_id=None,
                event_type="DRIVER_LOGIN_FAILED",
                details={"phone_number": phone_number, "reason": "Driver not found"},
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(status_code=401, detail="Driver account not found. Please register first.")

        if password and not verify_password(password, driver.password_hash):
            await self.repo.log_audit(
                driver_id=str(driver.id),
                event_type="DRIVER_LOGIN_FAILED",
                details={"phone_number": phone_number, "reason": "Invalid password"},
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise HTTPException(status_code=401, detail="Invalid password.")

        await self.repo.log_audit(
            driver_id=str(driver.id),
            event_type="DRIVER_LOGIN_SUCCESS",
            details={"phone_number": phone_number},
            ip_address=ip_address,
            user_agent=user_agent
        )

        return driver

    def create_tokens_for_driver(self, driver: Driver) -> dict:
        access_token = create_access_token(subject=str(driver.id), role="DRIVER")
        refresh_token = create_refresh_token(subject=str(driver.id))
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "driver": driver
        }

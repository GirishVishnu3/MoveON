from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.models.driver import (
    Driver, DriverProfile, DriverAddress, EmergencyContact,
    DriverAuditLog, DriverDraft, DriverStatus,
    AccountStatusEnum, VerificationStatusEnum, OnboardingStatusEnum
)
import math

class DriverRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, driver_id: str) -> Driver | None:
        result = await self.session.execute(
            select(Driver)
            .options(
                selectinload(Driver.profile),
                selectinload(Driver.address),
                selectinload(Driver.emergency_contact)
            )
            .where(Driver.id == driver_id)
        )
        return result.scalars().first()

    async def get_by_phone(self, phone_number: str) -> Driver | None:
        result = await self.session.execute(
            select(Driver)
            .options(
                selectinload(Driver.profile),
                selectinload(Driver.address),
                selectinload(Driver.emergency_contact)
            )
            .where(Driver.phone_number == phone_number)
        )
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Driver | None:
        result = await self.session.execute(
            select(Driver).where(Driver.email == email)
        )
        return result.scalars().first()

    async def check_duplicates(self, phone_number: str, email: str, aadhaar: str = None, dl: str = None, pan: str = None) -> dict:
        conditions = [Driver.phone_number == phone_number, Driver.email == email]
        if aadhaar:
            conditions.append(Driver.aadhaar_number == aadhaar)
        if dl:
            conditions.append(Driver.driving_license_number == dl)
        if pan:
            conditions.append(Driver.pan_number == pan)

        result = await self.session.execute(
            select(Driver).where(or_(*conditions))
        )
        drivers = result.scalars().all()

        conflicts = {}
        for d in drivers:
            if d.phone_number == phone_number:
                conflicts["phone_number"] = "Mobile number is already registered as a driver."
            if d.email == email:
                conflicts["email"] = "Email address is already registered as a driver."
            if aadhaar and d.aadhaar_number == aadhaar:
                conflicts["aadhaar_number"] = "Aadhaar number is already registered."
            if dl and d.driving_license_number == dl:
                conflicts["driving_license_number"] = "Driving license number is already registered."
            if pan and d.pan_number == pan:
                conflicts["pan_number"] = "PAN number is already registered."

        return conflicts

    async def create_driver(self, driver_data: dict, profile_data: dict, address_data: dict, emergency_data: dict) -> Driver:
        driver = Driver(**driver_data)
        self.session.add(driver)
        await self.session.flush()

        profile = DriverProfile(driver_id=driver.id, **profile_data)
        address = DriverAddress(driver_id=driver.id, **address_data)
        emergency = EmergencyContact(driver_id=driver.id, **emergency_data)

        self.session.add_all([profile, address, emergency])
        await self.session.commit()
        return await self.get_by_id(str(driver.id))

    async def log_audit(self, driver_id: str, event_type: str, details: dict = None, ip_address: str = None, user_agent: str = None, device_type: str = None, os_info: str = None):
        log = DriverAuditLog(
            driver_id=driver_id,
            event_type=event_type,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=device_type,
            operating_system=os_info
        )
        self.session.add(log)
        await self.session.commit()

    async def save_draft(self, phone_number: str, draft_data: dict):
        result = await self.session.execute(
            select(DriverDraft).where(DriverDraft.phone_number == phone_number)
        )
        draft = result.scalars().first()
        if not draft:
            draft = DriverDraft(phone_number=phone_number, draft_data=draft_data)
            self.session.add(draft)
        else:
            draft.draft_data = draft_data
        await self.session.commit()
        return draft

    async def get_draft(self, phone_number: str):
        result = await self.session.execute(
            select(DriverDraft).where(DriverDraft.phone_number == phone_number)
        )
        return result.scalars().first()

    async def get_driver_status(self, driver_id: str):
        result = await self.session.execute(select(DriverStatus).where(DriverStatus.driver_id == driver_id))
        return result.scalars().first()

    async def upsert_driver_status(self, driver_id: str, is_online: bool = None, lat: float = None, lon: float = None, current_workload: str = None, vehicle_category: str = None):
        driver = await self.get_driver_status(driver_id)
        if not driver:
            driver = DriverStatus(driver_id=driver_id)
            self.session.add(driver)

        if is_online is not None:
            driver.is_online = is_online
        if lat is not None:
            driver.lat = lat
        if lon is not None:
            driver.lon = lon
        if current_workload is not None:
            driver.current_workload = current_workload
        if vehicle_category is not None:
            driver.vehicle_category = vehicle_category

        await self.session.commit()
        await self.session.refresh(driver)
        return driver

    async def find_nearby_drivers(self, lat: float, lon: float, radius_km: float, vehicle_category: str):
        lat_diff = radius_km / 111.0
        lon_diff = radius_km / (111.0 * math.cos(math.radians(lat)))

        min_lat, max_lat = lat - lat_diff, lat + lat_diff
        min_lon, max_lon = lon - lon_diff, lon + lon_diff

        query = select(DriverStatus).where(
            and_(
                DriverStatus.is_online == True,
                DriverStatus.current_workload == "IDLE",
                DriverStatus.vehicle_category == vehicle_category,
                DriverStatus.lat >= min_lat,
                DriverStatus.lat <= max_lat,
                DriverStatus.lon >= min_lon,
                DriverStatus.lon <= max_lon
            )
        )
        result = await self.session.execute(query)
        return result.scalars().all()

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.schemas.driver import (
    DriverBasicInfoRegisterSchema, DriverOtpVerifySchema, DriverLoginSchema,
    DriverResponseSchema, DriverTokenResponseSchema, DriverDraftSchema
)
from app.schemas.auth import OtpRequestSchema
from app.services.driver_service import DriverAuthService
from app.repositories.driver import DriverRepository
from app.authentication.router import request_otp as core_request_otp, verify_otp as core_verify_otp
from app.authentication.jwt import get_current_user

router = APIRouter(prefix="/driver/auth", tags=["Driver Authentication"])

def get_client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None

@router.post("/register", response_model=DriverTokenResponseSchema, status_code=status.HTTP_201_CREATED)
async def register_driver(data: DriverBasicInfoRegisterSchema, request: Request, db: AsyncSession = Depends(get_db)):
    service = DriverAuthService(db)
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    driver = await service.register_basic_info(data, ip_address=ip_address, user_agent=user_agent)
    tokens = service.create_tokens_for_driver(driver)
    return tokens

@router.post("/request-otp")
async def request_driver_otp(data: OtpRequestSchema, db: AsyncSession = Depends(get_db)):
    data.role = "DRIVER"
    return await core_request_otp(data, db)

@router.post("/verify-otp", response_model=DriverTokenResponseSchema)
async def verify_driver_otp(request: Request, data: DriverOtpVerifySchema, db: AsyncSession = Depends(get_db)):
    repo = DriverRepository(db)
    driver = await repo.get_by_phone(data.phone_number)

    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found. Please complete registration first.")

    service = DriverAuthService(db)
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    await repo.log_audit(
        driver_id=str(driver.id),
        event_type="DRIVER_OTP_VERIFIED",
        details={"phone_number": data.phone_number},
        ip_address=ip_address,
        user_agent=user_agent
    )

    tokens = service.create_tokens_for_driver(driver)
    return tokens

@router.post("/login", response_model=DriverTokenResponseSchema)
async def login_driver(request: Request, data: DriverLoginSchema, db: AsyncSession = Depends(get_db)):
    service = DriverAuthService(db)
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")

    driver = await service.authenticate_driver(
        phone_number=data.phone_number,
        password=data.password,
        ip_address=ip_address,
        user_agent=user_agent
    )

    tokens = service.create_tokens_for_driver(driver)
    return tokens

@router.post("/draft")
async def save_driver_draft(data: DriverDraftSchema, db: AsyncSession = Depends(get_db)):
    repo = DriverRepository(db)
    await repo.save_draft(data.phone_number, data.draft_data)
    return {"message": "Draft saved successfully", "phone_number": data.phone_number}

@router.get("/draft/{phone_number}")
async def get_driver_draft(phone_number: str, db: AsyncSession = Depends(get_db)):
    repo = DriverRepository(db)
    draft = await repo.get_draft(phone_number)
    if not draft:
        return {"phone_number": phone_number, "draft_data": None}
    return {"phone_number": phone_number, "draft_data": draft.draft_data}

@router.get("/me", response_model=DriverResponseSchema)
async def get_current_driver_me(phone_number: str, db: AsyncSession = Depends(get_db)):
    repo = DriverRepository(db)
    driver = await repo.get_by_phone(phone_number)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

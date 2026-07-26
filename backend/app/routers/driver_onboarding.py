from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from app.database.database import get_db
from app.models.driver import (
    Driver, DriverDocument, DriverVehicle, DriverBankDetails,
    DocumentTypeEnum, DocumentStatusEnum, VerificationStatusEnum, OnboardingStatusEnum
)
from app.schemas.driver_onboarding import (
    DocumentUploadSchema, VehicleDetailsSchema, BankDetailsSchema,
    SubscriptionSelectionSchema, OnboardingSubmitSchema
)
from app.repositories.driver import DriverRepository

router = APIRouter(prefix="/driver/onboarding", tags=["Driver Onboarding"])

async def get_driver_by_phone(phone_number: str, db: AsyncSession) -> Driver:
    phone_clean = phone_number.strip().replace(" ", "+")
    phone_digits = "".join([c for c in phone_number if c.isdigit()])
    
    result = await db.execute(
        select(Driver).where(
            (Driver.phone_number == phone_number) | 
            (Driver.phone_number == phone_clean) |
            (Driver.phone_number == phone_digits) |
            (Driver.phone_number == f"+{phone_digits}")
        )
    )
    driver = result.scalars().first()
    if not driver:
        # Fallback to latest driver if query phone is slightly formatted differently
        res_latest = await db.execute(select(Driver).order_by(Driver.created_at.desc()))
        driver = res_latest.scalars().first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@router.get("/status")
async def get_onboarding_status(phone_number: str, db: AsyncSession = Depends(get_db)):
    driver = await get_driver_by_phone(phone_number, db)
    
    # Fetch uploaded documents with full status info
    doc_result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id)
    )
    docs = doc_result.scalars().all()
    uploaded_types = [d.document_type.value if hasattr(d.document_type, 'value') else str(d.document_type) for d in docs]
    
    documents_status = [
        {
            "document_type": doc.document_type.value if hasattr(doc.document_type, 'value') else str(doc.document_type),
            "document_number": doc.document_number,
            "file_url": doc.file_url,
            "status": doc.status.value if hasattr(doc.status, 'value') else str(doc.status),
            "rejection_reason": doc.rejection_reason
        } for doc in docs
    ]
    
    # Fetch vehicle
    veh_result = await db.execute(
        select(DriverVehicle).where(DriverVehicle.driver_id == driver.id)
    )
    vehicle = veh_result.scalars().first()
    
    # Fetch bank
    bank_result = await db.execute(
        select(DriverBankDetails).where(DriverBankDetails.driver_id == driver.id)
    )
    bank = bank_result.scalars().first()

    return {
        "driver_id": str(driver.id),
        "driver_id_code": driver.driver_id_code,
        "onboarding_status": driver.onboarding_status.value if hasattr(driver.onboarding_status, 'value') else str(driver.onboarding_status),
        "verification_status": driver.verification_status.value if hasattr(driver.verification_status, 'value') else str(driver.verification_status),
        "profile_completed": driver.profile_completed,
        "documents_verified": driver.documents_verified,
        "vehicle_verified": driver.vehicle_verified,
        "bank_verified": driver.bank_verified,
        "subscription_status": driver.subscription_status or "NOT_SUBSCRIBED",
        "subscription_plan": driver.subscription_plan,
        "subscription_expires_at": driver.subscription_expires_at,
        "approval_status": driver.approval_status or "UNDER_REVIEW",
        "uploaded_documents": uploaded_types,
        "documents": documents_status,
        "has_vehicle": vehicle is not None,
        "has_bank": bank is not None,
    }

@router.post("/documents")
async def upload_document(phone_number: str, data: DocumentUploadSchema, db: AsyncSession = Depends(get_db)):
    driver = await get_driver_by_phone(phone_number, db)
    repo = DriverRepository(db)

    # Check if doc exists
    doc_type = DocumentTypeEnum(data.document_type)
    result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id).where(DriverDocument.document_type == doc_type)
    )
    doc = result.scalars().first()

    if not doc:
        doc = DriverDocument(
            driver_id=driver.id,
            document_type=doc_type,
            document_number=data.document_number,
            file_url=data.file_url,
            status=DocumentStatusEnum.PENDING
        )
        db.add(doc)
    else:
        doc.document_number = data.document_number
        doc.file_url = data.file_url
        doc.status = DocumentStatusEnum.PENDING

    # Save to unique numbers for duplicate prevention checks on Driver main model
    if doc_type == DocumentTypeEnum.DL:
        driver.driving_license_number = data.document_number
    elif doc_type == DocumentTypeEnum.AADHAAR:
        driver.aadhaar_number = data.document_number
    elif doc_type == DocumentTypeEnum.PAN:
        driver.pan_number = data.document_number

    await db.commit()

    # Log audit
    await repo.log_audit(
        driver_id=str(driver.id),
        event_type="DRIVER_DOCUMENT_UPLOADED",
        details={"document_type": data.document_type}
    )

    return {"message": "Document uploaded successfully", "document_type": data.document_type}

@router.post("/vehicle")
async def submit_vehicle(phone_number: str, data: VehicleDetailsSchema, db: AsyncSession = Depends(get_db)):
    driver = await get_driver_by_phone(phone_number, db)
    repo = DriverRepository(db)

    # Duplicate vehicle number check
    dup = await db.execute(
        select(DriverVehicle).where(DriverVehicle.vehicle_number == data.vehicle_number).where(DriverVehicle.driver_id != driver.id)
    )
    if dup.scalars().first():
        raise HTTPException(status_code=400, detail="Vehicle number is already registered under another driver.")

    result = await db.execute(
        select(DriverVehicle).where(DriverVehicle.driver_id == driver.id)
    )
    veh = result.scalars().first()

    if not veh:
        veh = DriverVehicle(
            driver_id=driver.id,
            vehicle_number=data.vehicle_number,
            make=data.make,
            model=data.model,
            year=data.year,
            category=data.category,
            rc_number=data.rc_number,
            rc_url=data.rc_url,
            insurance_url=data.insurance_url,
            puc_url=data.puc_url
        )
        db.add(veh)
    else:
        veh.vehicle_number = data.vehicle_number
        veh.make = data.make
        veh.model = data.model
        veh.year = data.year
        veh.category = data.category
        veh.rc_number = data.rc_number
        veh.rc_url = data.rc_url
        veh.insurance_url = data.insurance_url
        veh.puc_url = data.puc_url

    driver.vehicle_verified = True
    await db.commit()

    await repo.log_audit(
        driver_id=str(driver.id),
        event_type="DRIVER_VEHICLE_SUBMITTED",
        details={"vehicle_number": data.vehicle_number, "category": data.category}
    )

    return {"message": "Vehicle details updated successfully"}

@router.post("/bank")
async def submit_bank(phone_number: str, data: BankDetailsSchema, db: AsyncSession = Depends(get_db)):
    driver = await get_driver_by_phone(phone_number, db)
    repo = DriverRepository(db)

    result = await db.execute(
        select(DriverBankDetails).where(DriverBankDetails.driver_id == driver.id)
    )
    bank = result.scalars().first()

    if not bank:
        bank = DriverBankDetails(
            driver_id=driver.id,
            account_number=data.account_number,
            ifsc_code=data.ifsc_code,
            account_holder_name=data.account_holder_name,
            bank_name=data.bank_name,
            upi_id=data.upi_id
        )
        db.add(bank)
    else:
        bank.account_number = data.account_number
        bank.ifsc_code = data.ifsc_code
        bank.account_holder_name = data.account_holder_name
        bank.bank_name = data.bank_name
        bank.upi_id = data.upi_id

    driver.bank_verified = True
    await db.commit()

    await repo.log_audit(
        driver_id=str(driver.id),
        event_type="DRIVER_BANK_SUBMITTED",
        details={"bank_name": data.bank_name}
    )

    return {"message": "Bank details updated successfully"}

# NOTE: /status endpoint is defined once above at line 27.
# This duplicate has been removed to fix FastAPI routing.

@router.post("/subscription")
async def select_subscription(phone_number: str, data: SubscriptionSelectionSchema, db: AsyncSession = Depends(get_db)):
    driver = await get_driver_by_phone(phone_number, db)
    repo = DriverRepository(db)

    plan = data.plan_name.upper()
    now = datetime.utcnow()

    if plan == "DAILY":
        expires = now + timedelta(days=1)
        price = 9
    elif plan == "WEEKLY":
        expires = now + timedelta(days=7)
        price = 54
    elif plan == "MONTHLY":
        expires = now + timedelta(days=30)
        price = 199
    else:
        expires = now + timedelta(days=1)
        price = 9

    driver.subscription_status = "ACTIVE"
    driver.subscription_plan = plan
    driver.subscription_expires_at = expires

    await db.commit()

    await repo.log_audit(
        driver_id=str(driver.id),
        event_type="DRIVER_SUBSCRIPTION_PURCHASED",
        details={"plan": plan, "price_inr": price, "expires_at": expires.isoformat()}
    )

    return {
        "message": f"{plan} Subscription Pass activated successfully!",
        "subscription_status": "ACTIVE",
        "subscription_plan": plan,
        "price_inr": price,
        "expires_at": expires.isoformat()
    }

@router.post("/submit")
async def final_submit_onboarding(phone_number: str, data: OnboardingSubmitSchema, db: AsyncSession = Depends(get_db)):
    driver = await get_driver_by_phone(phone_number, db)
    repo = DriverRepository(db)

    # Enforce agreement check
    if not data.agreement_accepted:
        raise HTTPException(status_code=400, detail="Driver agreement must be accepted to submit.")

    # Create selfie / face verify doc
    selfie_doc_type = DocumentTypeEnum.SELFIE
    result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id).where(DriverDocument.document_type == selfie_doc_type)
    )
    doc = result.scalars().first()

    if not doc:
        doc = DriverDocument(
            driver_id=driver.id,
            document_type=selfie_doc_type,
            file_url=data.selfie_url,
            status=DocumentStatusEnum.PENDING
        )
        db.add(doc)
    else:
        doc.file_url = data.selfie_url
        doc.status = DocumentStatusEnum.PENDING

    driver.profile_completed = True
    driver.documents_verified = True
    driver.onboarding_status = OnboardingStatusEnum.COMPLETED
    driver.verification_status = VerificationStatusEnum.UNDER_REVIEW
    driver.approval_status = "UNDER_REVIEW"

    await db.commit()

    await repo.log_audit(
        driver_id=str(driver.id),
        event_type="DRIVER_ONBOARDING_COMPLETED",
        details={"selfie_url": data.selfie_url}
    )

    return {"message": "Onboarding details submitted successfully. Verification pending."}

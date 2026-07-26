from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List
from app.database.database import get_db
from app.models.driver import (
    Driver, DriverDocument, DriverVehicle, DriverBankDetails,
    DocumentTypeEnum, DocumentStatusEnum, VerificationStatusEnum, OnboardingStatusEnum
)

router = APIRouter(prefix="/admin/drivers", tags=["Admin - Driver Verification"])

class DocumentVerifyRequest(BaseModel):
    driver_id: str
    document_type: str
    action: str = Field(..., example="APPROVE") # APPROVE or REJECT
    rejection_reason: Optional[str] = None

class DriverApproveAllRequest(BaseModel):
    driver_id: str

@router.get("/verifications")
async def list_pending_verifications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Driver))
    drivers = result.scalars().all()

    verifications_list = []
    for d in drivers:
        # Fetch driver docs
        doc_result = await db.execute(
            select(DriverDocument).where(DriverDocument.driver_id == d.id)
        )
        docs = doc_result.scalars().all()

        # Fetch vehicle
        v_result = await db.execute(
            select(DriverVehicle).where(DriverVehicle.driver_id == d.id)
        )
        vehicle = v_result.scalars().first()

        verifications_list.append({
            "driver_id": str(d.id),
            "full_name": f"{d.first_name} {d.last_name}",
            "phone_number": d.phone_number,
            "email": d.email,
            "approval_status": d.approval_status or "PENDING",
            "onboarding_status": d.onboarding_status.value if hasattr(d.onboarding_status, "value") else str(d.onboarding_status),
            "documents_verified": d.documents_verified,
            "subscription_status": d.subscription_status or "NOT_SUBSCRIBED",
            "vehicle": {
                "vehicle_number": vehicle.vehicle_number if vehicle else None,
                "make": vehicle.make if vehicle else None,
                "model": vehicle.model if vehicle else None,
                "rc_url": vehicle.rc_url if vehicle else None,
            } if vehicle else None,
            "documents": [
                {
                    "document_type": doc.document_type.value if hasattr(doc.document_type, "value") else str(doc.document_type),
                    "document_number": doc.document_number,
                    "file_url": doc.file_url,
                    "status": doc.status.value if hasattr(doc.status, "value") else str(doc.status),
                    "rejection_reason": doc.rejection_reason
                } for doc in docs
            ]
        })

    return verifications_list

@router.post("/verify-document")
async def verify_driver_document(body: DocumentVerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DriverDocument).where(DriverDocument.driver_id == body.driver_id))
    docs = result.scalars().all()

    target_doc = None
    for doc in docs:
        doc_type_str = doc.document_type.value if hasattr(doc.document_type, "value") else str(doc.document_type)
        if doc_type_str == body.document_type:
            target_doc = doc
            break

    if not target_doc:
        raise HTTPException(status_code=440, detail=f"Document {body.document_type} not found for driver.")

    if body.action.upper() == "APPROVE":
        target_doc.status = DocumentStatusEnum.VERIFIED
        target_doc.rejection_reason = None
    elif body.action.upper() == "REJECT":
        target_doc.status = DocumentStatusEnum.REJECTED
        target_doc.rejection_reason = body.rejection_reason or "Document photo is unclear or invalid."
    else:
        raise HTTPException(status_code=400, detail="Action must be APPROVE or REJECT.")

    await db.commit()
    return {"message": f"Document {body.document_type} updated to {target_doc.status}."}

@router.post("/approve-all")
async def approve_driver_account(body: DriverApproveAllRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Driver).where(Driver.id == body.driver_id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")

    driver.approval_status = "APPROVED"
    driver.verification_status = VerificationStatusEnum.VERIFIED
    driver.documents_verified = True
    driver.vehicle_verified = True
    driver.bank_verified = True

    # Mark all docs as approved
    doc_result = await db.execute(select(DriverDocument).where(DriverDocument.driver_id == driver.id))
    for doc in doc_result.scalars().all():
        doc.status = DocumentStatusEnum.VERIFIED

    await db.commit()
    return {"message": f"Driver {driver.first_name} {driver.last_name} fully approved!"}

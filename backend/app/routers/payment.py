from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.authentication.jwt import get_current_user
from app.schemas.payment import PaymentInitiateRequest, PaymentResponse
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payment", tags=["Payment"])

@router.post("/initiate", response_model=PaymentResponse)
async def initiate_payment(
    request: PaymentInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    payment_service = PaymentService(db)
    
    success, msg, payment = await payment_service.process_payment(
        booking_ref=request.booking_ref,
        user_id=current_user.id,
        amount=request.amount,
        method=request.method
    )
    
    if not success:
        # If it failed due to insufficient wallet balance, we still return 400
        raise HTTPException(status_code=400, detail=msg)
        
    return PaymentResponse(
        booking_ref=request.booking_ref,
        amount=payment.amount,
        method=payment.method.value,
        status=payment.status.value,
        transaction_ref=payment.transaction_ref,
        message=msg
    )

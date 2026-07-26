from pydantic import BaseModel
from typing import Optional
from app.models.payment import PaymentMethod, PaymentStatus

class PaymentInitiateRequest(BaseModel):
    booking_ref: str
    amount: float
    method: PaymentMethod

class PaymentResponse(BaseModel):
    booking_ref: str
    amount: float
    method: str
    status: str
    transaction_ref: Optional[str]
    message: str

class InvoiceResponse(BaseModel):
    invoice_number: str
    total_amount: float
    pdf_url: Optional[str]
    generated_at: str
    payment_method: str

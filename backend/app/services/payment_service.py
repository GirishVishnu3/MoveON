import uuid
from typing import Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import Payment, PaymentStatus, PaymentMethod, Invoice
from app.models.wallet import ReferenceType
from app.services.wallet_service import WalletService
from app.repositories.booking import BookingRepository
from datetime import datetime

class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.wallet_service = WalletService(db)
        self.booking_repo = BookingRepository(db)

    async def process_payment(self, booking_ref: str, user_id: uuid.UUID, amount: float, method: PaymentMethod) -> Tuple[bool, str, Optional[Payment]]:
        booking = await self.booking_repo.get_booking_by_ref(booking_ref)
        if not booking:
            return False, "Booking not found", None
            
        # Create payment record
        payment = Payment(
            booking_id=booking.id,
            user_id=user_id,
            amount=amount,
            method=method,
            status=PaymentStatus.PENDING,
            transaction_ref=f"TXN-{uuid.uuid4().hex[:8].upper()}"
        )
        self.db.add(payment)
        
        # If Wallet, try deducting from wallet
        if method == PaymentMethod.WALLET:
            success, msg, _ = await self.wallet_service.debit_wallet(
                user_id=user_id,
                amount=amount,
                reference_type=ReferenceType.RIDE_PAYMENT,
                reference_id=str(booking.id)
            )
            if not success:
                payment.status = PaymentStatus.FAILED
                payment.gateway_response = msg
                await self.db.commit()
                return False, msg, payment
                
            payment.status = PaymentStatus.SUCCESS
            payment.gateway_response = "Wallet deduction successful"
        else:
            # Mocking other gateways (Stripe, UPI, Cash)
            payment.status = PaymentStatus.SUCCESS
            payment.gateway_response = "Mock gateway payment successful"

        await self.db.commit()
        await self.db.refresh(payment)

        if payment.status == PaymentStatus.SUCCESS:
            # Handle driver earnings payout
            if booking.driver_id:
                platform_fee = amount * 0.20 # 20% platform fee
                driver_earning = amount - platform_fee
                await self.wallet_service.credit_wallet(
                    user_id=booking.driver_id,
                    amount=driver_earning,
                    reference_type=ReferenceType.RIDE_EARNING,
                    reference_id=str(booking.id)
                )

            # Generate Invoice
            await self._generate_invoice(booking.id, payment.id, amount)

        return True, "Payment successful", payment

    async def _generate_invoice(self, booking_id: uuid.UUID, payment_id: uuid.UUID, amount: float):
        invoice = Invoice(
            booking_id=booking_id,
            payment_id=payment_id,
            invoice_number=f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            total_amount=amount,
            pdf_url=None # We can generate this on the fly when requested
        )
        self.db.add(invoice)
        await self.db.commit()

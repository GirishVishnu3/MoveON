import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Float, Enum as SAEnum, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database.database import Base

class TransactionType(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"

class ReferenceType(str, enum.Enum):
    RIDE_PAYMENT = "RIDE_PAYMENT"
    RIDE_EARNING = "RIDE_EARNING"
    DEPOSIT = "DEPOSIT"
    PAYOUT = "PAYOUT"
    REFUND = "REFUND"
    PROMO_CREDIT = "PROMO_CREDIT"

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    balance = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = relationship("WalletTransaction", back_populates="wallet")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id = Column(UUID(as_uuid=True), ForeignKey("wallets.id"), nullable=False, index=True)
    
    amount = Column(Float, nullable=False)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    reference_type = Column(SAEnum(ReferenceType), nullable=False)
    reference_id = Column(String(100), nullable=True) # Could be booking_id, payment_id, etc.
    
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="transactions")

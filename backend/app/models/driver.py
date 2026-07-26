import enum
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, Enum, ForeignKey, Integer, JSON, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class AccountStatusEnum(str, enum.Enum):
    REGISTERED = "REGISTERED"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"

class VerificationStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class OnboardingStatusEnum(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    STEP1_BASIC_INFO = "STEP1_BASIC_INFO"
    STEP2_DOCUMENTS = "STEP2_DOCUMENTS"
    STEP3_VEHICLE = "STEP3_VEHICLE"
    COMPLETED = "COMPLETED"

class DriverOnlineStatusEnum(str, enum.Enum):
    OFFLINE = "OFFLINE"
    ONLINE = "ONLINE"
    IN_TRIP = "IN_TRIP"

class DocumentTypeEnum(str, enum.Enum):
    DL = "DL"
    AADHAAR = "AADHAAR"
    PAN = "PAN"
    RC = "RC"
    INSURANCE = "INSURANCE"
    PUC = "PUC"
    SELFIE = "SELFIE"

class DocumentStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

def generate_driver_id_code() -> str:
    """Generate unique Driver ID code in format DRV-XXXXXXXX."""
    return f"DRV-{secrets.token_hex(4).upper()}"

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id_code = Column(String(20), unique=True, index=True, nullable=False, default=generate_driver_id_code)
    
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)

    account_status = Column(Enum(AccountStatusEnum), default=AccountStatusEnum.REGISTERED, nullable=False)
    verification_status = Column(Enum(VerificationStatusEnum), default=VerificationStatusEnum.PENDING, nullable=False)
    onboarding_status = Column(Enum(OnboardingStatusEnum), default=OnboardingStatusEnum.NOT_STARTED, nullable=False)
    online_status = Column(Enum(DriverOnlineStatusEnum), default=DriverOnlineStatusEnum.OFFLINE, nullable=False)

    wallet_balance = Column(Float, default=0.0, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    completed_rides = Column(Integer, default=0, nullable=False)
    cancellation_count = Column(Integer, default=0, nullable=False)
    acceptance_rate = Column(Float, default=0.0, nullable=False)
    earnings = Column(Float, default=0.0, nullable=False)

    # Identifiers for duplication prevention
    aadhaar_number = Column(String(20), unique=True, nullable=True)
    driving_license_number = Column(String(50), unique=True, nullable=True)
    pan_number = Column(String(20), unique=True, nullable=True)

    # Onboarding Completion Flags
    profile_completed = Column(Boolean, default=False, nullable=False)
    documents_verified = Column(Boolean, default=False, nullable=False)
    vehicle_verified = Column(Boolean, default=False, nullable=False)
    bank_verified = Column(Boolean, default=False, nullable=False)
    subscription_status = Column(String(50), default="NOT_SUBSCRIBED", nullable=False)
    subscription_plan = Column(String(50), nullable=True) # DAILY, WEEKLY, MONTHLY
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    approval_status = Column(String(50), default="PENDING", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profile = relationship("DriverProfile", back_populates="driver", uselist=False, cascade="all, delete-orphan")
    address = relationship("DriverAddress", back_populates="driver", uselist=False, cascade="all, delete-orphan")
    emergency_contact = relationship("EmergencyContact", back_populates="driver", uselist=False, cascade="all, delete-orphan")
    documents = relationship("DriverDocument", back_populates="driver", cascade="all, delete-orphan")
    vehicle = relationship("DriverVehicle", back_populates="driver", uselist=False, cascade="all, delete-orphan")
    bank_details = relationship("DriverBankDetails", back_populates="driver", uselist=False, cascade="all, delete-orphan")

class DriverProfile(Base):
    __tablename__ = "driver_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    dob = Column(String(20), nullable=True) # YYYY-MM-DD
    gender = Column(String(20), nullable=True) # MALE, FEMALE, OTHER
    profile_photo_url = Column(Text, nullable=True)
    preferred_language = Column(String(20), default="en", nullable=False)

    driver = relationship("Driver", back_populates="profile")

class DriverAddress(Base):
    __tablename__ = "driver_addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)

    street_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    pincode = Column(String(10), nullable=False)
    landmark = Column(String(150), nullable=True)

    driver = relationship("Driver", back_populates="address")

class EmergencyContact(Base):
    __tablename__ = "driver_emergency_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)

    name = Column(String(150), nullable=False)
    phone_number = Column(String(20), nullable=False)
    contact_relationship = Column(String(50), nullable=False)

    driver = relationship("Driver", back_populates="emergency_contact")

class DriverDocument(Base):
    __tablename__ = "driver_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False)
    
    document_type = Column(Enum(DocumentTypeEnum), nullable=False)
    document_number = Column(String(100), nullable=True)
    file_url = Column(Text, nullable=False)
    status = Column(Enum(DocumentStatusEnum), default=DocumentStatusEnum.PENDING, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    driver = relationship("Driver", back_populates="documents")

class DriverVehicle(Base):
    __tablename__ = "driver_vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)

    vehicle_number = Column(String(50), unique=True, nullable=False)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(String(30), nullable=False) # AUTO, MINI, SEDAN, SUV, BIKE
    rc_number = Column(String(100), nullable=True)
    rc_url = Column(Text, nullable=True)
    insurance_url = Column(Text, nullable=True)
    puc_url = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    driver = relationship("Driver", back_populates="vehicle")

class DriverBankDetails(Base):
    __tablename__ = "driver_bank_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)

    account_number = Column(String(50), nullable=False)
    ifsc_code = Column(String(20), nullable=False)
    account_holder_name = Column(String(150), nullable=False)
    bank_name = Column(String(100), nullable=False)
    upi_id = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    driver = relationship("Driver", back_populates="bank_details")

class DriverAuditLog(Base):
    __tablename__ = "driver_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True) # REGISTER_INITIATED, OTP_SENT, OTP_VERIFIED, LOGIN_SUCCESS, etc.
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(50), nullable=True)
    operating_system = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class DriverDraft(Base):
    __tablename__ = "driver_registration_drafts"

    phone_number = Column(String(20), primary_key=True)
    draft_data = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class DriverStatus(Base):
    __tablename__ = "driver_status"

    driver_id = Column(String, primary_key=True, index=True)
    is_online = Column(Boolean, default=False)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    vehicle_category = Column(String, nullable=True)
    rating = Column(Float, default=5.0)
    acceptance_rate = Column(Float, default=1.0)
    current_workload = Column(String, default="IDLE") # IDLE, ON_TRIP, OFFLINE
    status_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

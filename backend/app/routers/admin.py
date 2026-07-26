from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db
from app.authentication.jwt import get_current_user
from app.authentication.rbac import RequirePermission
from app.models.user import User, RoleEnum
from app.schemas.admin import AdminMetricsResponse, AdminUserResponse, UserStatusUpdateRequest
from app.services.admin_service import AdminService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/metrics", response_model=AdminMetricsResponse)
async def get_metrics(
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    metrics = await service.get_dashboard_metrics()
    return metrics

@router.get("/users", response_model=list[AdminUserResponse])
async def get_users(
    role: str = "RIDER",
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    service = AdminService(db)
    try:
        role_enum = RoleEnum(role.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    users = await service.get_users(role_enum, limit, offset)
    return [
        AdminUserResponse(
            id=str(u.id),
            role=u.role.value,
            phone_number=u.phone_number,
            full_name=u.full_name,
            email=u.email,
            status=u.status.value,
            created_at=u.created_at.isoformat() if u.created_at else ""
        ) for u in users
    ]

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    request: UserStatusUpdateRequest,
    req: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_status = user.status.value
    
    from app.models.user import UserStatusEnum
    try:
        user.status = UserStatusEnum(request.status.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    # Audit log
    audit_service = AuditService(db)
    client_ip = req.client.host if req.client else "unknown"
    
    await audit_service.log_action(
        admin_id="00000000-0000-0000-0000-000000000000",
        action_type="USER_STATUS_UPDATE",
        target_entity="USER",
        target_id=user_id,
        previous_values={"status": old_status},
        new_values={"status": user.status.value},
        ip_address=client_ip
    )
    
    await db.commit()
    return {"message": "Status updated"}


@router.get("/bookings")
async def get_all_bookings(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    from app.models.booking import Booking
    result = await db.execute(
        select(Booking).order_by(Booking.created_at.desc()).limit(limit).offset(offset)
    )
    bookings = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "booking_ref": b.booking_ref,
            "rider_id": str(b.rider_id),
            "status": b.status.value,
            "ride_type": b.ride_type.value,
            "pickup_address": b.pickup_address,
            "destination_address": b.destination_address,
            "final_fare": b.final_fare,
            "created_at": b.created_at.isoformat() if b.created_at else "",
        } for b in bookings
    ]


@router.get("/finance")
async def get_payments(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    from app.models.payment import Payment
    from app.models.booking import Booking
    result = await db.execute(
        select(Payment, Booking.booking_ref)
        .join(Booking, Payment.booking_id == Booking.id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()
    return [
        {
            "id": str(p.id),
            "booking_ref": booking_ref,
            "amount": float(p.amount),
            "status": p.status.value,
            "payment_method": p.payment_method,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        } for p, booking_ref in rows
    ]


@router.get("/support")
async def get_support_tickets(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    from app.models.support import SupportTicket
    result = await db.execute(
        select(SupportTicket).order_by(SupportTicket.created_at.desc()).limit(limit).offset(offset)
    )
    tickets = result.scalars().all()
    return [
        {
            "id": str(t.id),
            "user_id": str(t.user_id),
            "subject": t.subject,
            "status": t.status.value,
            "priority": t.priority.value,
            "created_at": t.created_at.isoformat() if t.created_at else "",
        } for t in tickets
    ]


@router.get("/audit")
async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    from app.models.audit import AuditLog
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "admin_id": str(l.admin_id),
            "action_type": l.action_type,
            "target_entity": l.target_entity,
            "target_id": l.target_id,
            "outcome": l.outcome,
            "timestamp": l.timestamp.isoformat() if l.timestamp else "",
        } for l in logs
    ]


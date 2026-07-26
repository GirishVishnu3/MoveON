from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
from app.database.database import get_db
from app.authentication.jwt import get_current_user
from app.models.notification import Notification, NotificationCategory, NotificationPreference
from app.schemas.notification import NotificationResponse, DeviceTokenRequest, NotificationPreferenceResponse, NotificationPreferenceUpdateRequest
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            id=str(n.id),
            category=n.category.value,
            title=n.title,
            message=n.message,
            priority=n.priority.value,
            is_read=n.is_read,
            metadata_data=n.metadata_data,
            created_at=n.created_at.isoformat()
        ) for n in notifications
    ]

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    result = await db.execute(select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id))
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    await db.commit()
    return {"message": "Marked as read"}

@router.post("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All marked as read"}

@router.post("/device")
async def register_device(
    request: DeviceTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = NotificationService(db)
    await service.register_device_token(current_user.id, request.token, request.platform.value)
    return {"message": "Device registered successfully"}

@router.get("/preferences", response_model=list[NotificationPreferenceResponse])
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = NotificationService(db)
    prefs = await service.get_preferences(current_user.id)
    
    # If no preferences exist, we could return defaults for all categories
    # But for now, returning what's in the DB is fine. The service automatically handles missing ones on send.
    
    return [
        NotificationPreferenceResponse(
            category=p.category.value,
            push_enabled=p.push_enabled,
            email_enabled=p.email_enabled,
            sms_enabled=p.sms_enabled,
            in_app_enabled=p.in_app_enabled
        ) for p in prefs
    ]

@router.put("/preferences")
async def update_preferences(
    request: NotificationPreferenceUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    service = NotificationService(db)
    pref = await service.get_or_create_preference(current_user.id, request.category)
    
    pref.push_enabled = request.push_enabled
    pref.email_enabled = request.email_enabled
    pref.sms_enabled = request.sms_enabled
    pref.in_app_enabled = request.in_app_enabled
    
    await db.commit()
    return {"message": "Preferences updated"}

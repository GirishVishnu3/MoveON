import uuid
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.notification import Notification, NotificationPreference, NotificationCategory, NotificationPriority, DeviceToken
from app.models.user import User

class MockPushProvider:
    @staticmethod
    def send(token: str, title: str, body: str, data: Dict[str, Any]):
        print(f"[PUSH -> {token}] {title}: {body} | Data: {data}")

class MockSMSProvider:
    @staticmethod
    def send(phone_number: str, message: str):
        print(f"[SMS -> {phone_number}] {message}")

class MockEmailProvider:
    @staticmethod
    def send(email: str, subject: str, html_body: str):
        print(f"[EMAIL -> {email}] {subject}")

class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_preferences(self, user_id: uuid.UUID) -> list[NotificationPreference]:
        result = await self.db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
        return result.scalars().all()

    async def get_or_create_preference(self, user_id: uuid.UUID, category: NotificationCategory) -> NotificationPreference:
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id, 
                NotificationPreference.category == category
            )
        )
        pref = result.scalars().first()
        if not pref:
            pref = NotificationPreference(user_id=user_id, category=category)
            self.db.add(pref)
            await self.db.commit()
            await self.db.refresh(pref)
        return pref

    async def register_device_token(self, user_id: uuid.UUID, token: str, platform: str):
        # Invalidate old tokens for this user/platform if needed, or just upsert
        result = await self.db.execute(select(DeviceToken).where(DeviceToken.token == token))
        existing = result.scalars().first()
        if existing:
            existing.user_id = user_id
            existing.is_active = True
        else:
            new_token = DeviceToken(user_id=user_id, token=token, platform=platform)
            self.db.add(new_token)
        await self.db.commit()

    async def send_notification(
        self,
        user_id: uuid.UUID,
        category: NotificationCategory,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        metadata_data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        # Create and store notification
        notification = Notification(
            user_id=user_id,
            category=category,
            title=title,
            message=message,
            priority=priority,
            metadata_data=metadata_data
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        # Get user details for delivery
        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalars().first()
        
        if not user:
            return notification

        # Check preferences
        pref = await self.get_or_create_preference(user_id, category)

        # Deliver via PUSH
        if pref.push_enabled:
            tokens_result = await self.db.execute(
                select(DeviceToken).where(DeviceToken.user_id == user_id, DeviceToken.is_active == True)
            )
            tokens = tokens_result.scalars().all()
            for t in tokens:
                MockPushProvider.send(t.token, title, message, metadata_data or {})

        # Deliver via SMS
        if pref.sms_enabled and user.phone_number:
            MockSMSProvider.send(user.phone_number, f"{title}: {message}")

        # Deliver via Email
        if pref.email_enabled and user.email:
            MockEmailProvider.send(user.email, title, f"<p>{message}</p>")

        # Deliver In-App (WebSocket)
        if pref.in_app_enabled:
            from app.routers.websocket import manager
            # We prefix user_id with roles typically (e.g. rider_uuid or driver_uuid).
            # To be safe, we might just try both or rely on a standard format.
            # Assuming client connects as "rider_{user_id}" or "driver_{user_id}"
            role_prefix = user.role.value.lower()
            client_id = f"{role_prefix}_{user_id}"
            
            payload = {
                "type": "NOTIFICATION",
                "data": {
                    "id": str(notification.id),
                    "category": category.value,
                    "title": title,
                    "message": message,
                    "priority": priority.value,
                    "is_read": False,
                    "metadata_data": metadata_data,
                    "created_at": notification.created_at.isoformat()
                }
            }
            # Fire and forget WS message
            import asyncio
            asyncio.create_task(manager.send_personal_message(payload, client_id))

        return notification

import uuid
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_action(
        self,
        admin_id: uuid.UUID,
        action_type: str,
        target_entity: str,
        target_id: str,
        previous_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        device_info: Optional[str] = None,
        outcome: str = "SUCCESS"
    ) -> AuditLog:
        """
        Creates an audit log entry for an administrative action.
        This does not commit the session so it can be part of the larger transaction.
        """
        log_entry = AuditLog(
            admin_id=admin_id,
            action_type=action_type,
            target_entity=target_entity,
            target_id=target_id,
            previous_values=previous_values,
            new_values=new_values,
            ip_address=ip_address,
            device_info=device_info,
            outcome=outcome
        )
        self.db.add(log_entry)
        return log_entry

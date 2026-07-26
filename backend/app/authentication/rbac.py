from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.database import get_db
from app.authentication.jwt import get_current_user
from app.models.user import User, RoleEnum
from app.models.admin import AdminProfile, AdminRoleEnum

class RequirePermission:
    def __init__(self, required_permission: str = None):
        self.required_permission = required_permission

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> AdminProfile:
        if current_user.role != RoleEnum.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. Admin access required."
            )
            
        result = await db.execute(select(AdminProfile).where(AdminProfile.user_id == current_user.id))
        admin_profile = result.scalars().first()
        
        if not admin_profile:
            # Fallback for old admins without a profile, treat as Super Admin or reject
            # For a secure system, we reject.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin profile not found."
            )
            
        # Super Admins bypass permission checks
        if admin_profile.admin_role == AdminRoleEnum.SUPER_ADMIN:
            return admin_profile
            
        if self.required_permission:
            if self.required_permission not in admin_profile.permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permission: {self.required_permission}"
                )
                
        return admin_profile

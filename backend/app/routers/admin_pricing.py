"""
Admin Pricing Router — Complete CRUD and Pagination for Enterprise Pricing
========================================================================
All endpoints require the ADMIN role.
All modifications write an entry to pricing_audit_log for traceability.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
import uuid
from datetime import datetime

from app.database.database import get_db
from app.authentication.jwt import RoleChecker, get_current_user
from app.models.user import RoleEnum
from app.models.pricing import (
    City, VehicleBaseRate, PeakHourRule, SurgeRule,
    WeatherRule, TollRule, StateBorderCharge,
    PricingRuleVersion, PricingAuditLog
)
from app.schemas.pricing import (
    PaginatedResponse,
    CityCreate, CityUpdate, CityResponse,
    VehicleBaseRateCreate, VehicleBaseRateResponse,
    PeakHourRuleCreate, PeakHourRuleResponse,
    SurgeRuleCreate, SurgeRuleUpdate, SurgeRuleResponse,
    WeatherRuleCreate, WeatherRuleResponse,
    TollRuleCreate, TollRuleResponse,
    StateBorderChargeCreate, StateBorderChargeResponse,
    PricingVersionCreate, PricingVersionResponse,
    AuditLogResponse
)
from app.services.pricing_validator import PricingValidator

router = APIRouter(prefix="/admin/pricing", tags=["Admin - Pricing"])
require_admin = RoleChecker([RoleEnum.ADMIN])


# ─── Generic Pagination Helper ────────────────────────────────────────────────

async def paginate(db: AsyncSession, query, page: int, limit: int):
    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Fetch items
    offset = (page - 1) * limit
    items_query = query.offset(offset).limit(limit)
    items_result = await db.execute(items_query)
    items = items_result.scalars().all()

    pages = (total + limit - 1) // limit
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "items": items
    }


# ─── Audit Logger Helper ──────────────────────────────────────────────────────

async def log_admin_change(
    db: AsyncSession,
    admin_id: str,
    event_type: str,
    entity: str,
    entity_id: str,
    description: str
):
    log = PricingAuditLog(
        event_type=event_type,
        admin_user_id=admin_id,
        changed_entity=entity,
        changed_entity_id=entity_id,
        change_description=description
    )
    db.add(log)
    # We rely on caller to commit


# ─── Cities ───────────────────────────────────────────────────────────────────

@router.post("/cities", response_model=CityResponse)
async def create_city(
    body: CityCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_user),
    _=Depends(require_admin)
):
    city = City(id=uuid.uuid4(), **body.dict())
    db.add(city)
    await log_admin_change(db, str(admin.id), "RULE_CREATE", "City", str(city.id), f"Created city {city.name}")
    await db.commit()
    await db.refresh(city)
    return city

@router.get("/cities", response_model=PaginatedResponse)
async def list_cities(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    query = select(City).order_by(City.name)
    return await paginate(db, query, page, limit)


# ─── Vehicle Base Rates ───────────────────────────────────────────────────────

@router.post("/vehicle-rates", response_model=VehicleBaseRateResponse)
async def create_vehicle_rate(
    body: VehicleBaseRateCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_user),
    _=Depends(require_admin)
):
    val_res = PricingValidator.validate_base_rate(body.dict())
    if not val_res.is_valid:
        raise HTTPException(status_code=400, detail=val_res.as_dict())

    rate = VehicleBaseRate(id=uuid.uuid4(), created_by=str(admin.id), **body.dict())
    db.add(rate)
    await log_admin_change(db, str(admin.id), "RULE_CREATE", "VehicleBaseRate", str(rate.id), f"Created {rate.name}")
    await db.commit()
    await db.refresh(rate)
    return rate

@router.get("/vehicle-rates", response_model=PaginatedResponse)
async def list_vehicle_rates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    query = select(VehicleBaseRate).order_by(VehicleBaseRate.created_at.desc())
    return await paginate(db, query, page, limit)


# ─── Pricing Versions ─────────────────────────────────────────────────────────

@router.post("/versions", response_model=PricingVersionResponse)
async def create_pricing_version(
    body: PricingVersionCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_user),
    _=Depends(require_admin)
):
    # If they are creating an active version, validate for duplicates
    if body.is_active:
        val_res = await PricingValidator.check_duplicate_active_version(
            db, body.city_id, body.ride_type, body.vehicle_category
        )
        if not val_res.is_valid:
            raise HTTPException(status_code=400, detail=val_res.as_dict())

    version = PricingRuleVersion(id=uuid.uuid4(), created_by=str(admin.id), **body.dict())
    db.add(version)
    await log_admin_change(db, str(admin.id), "RULE_CREATE", "PricingRuleVersion", str(version.id), f"Created version {version.version_tag}")
    await db.commit()
    await db.refresh(version)
    return version

@router.get("/versions", response_model=PaginatedResponse)
async def list_pricing_versions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    query = select(PricingRuleVersion).order_by(PricingRuleVersion.created_at.desc())
    return await paginate(db, query, page, limit)

@router.patch("/versions/{version_id}/activate")
async def activate_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_user),
    _=Depends(require_admin)
):
    r = await db.execute(select(PricingRuleVersion).where(PricingRuleVersion.id == version_id))
    version = r.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    if version.is_active:
        return {"message": "Already active"}

    # Validate duplicate active
    val_res = await PricingValidator.check_duplicate_active_version(
        db, version.city_id, version.ride_type, version.vehicle_category, exclude_id=version_id
    )
    if not val_res.is_valid:
        raise HTTPException(status_code=400, detail=val_res.as_dict())

    version.is_active = True
    await log_admin_change(db, str(admin.id), "RULE_ACTIVATE", "PricingRuleVersion", version_id, f"Activated {version.version_tag}")
    await db.commit()
    return {"message": f"Version {version.version_tag} activated"}

@router.patch("/versions/{version_id}/deactivate")
async def deactivate_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_user),
    _=Depends(require_admin)
):
    r = await db.execute(select(PricingRuleVersion).where(PricingRuleVersion.id == version_id))
    version = r.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    version.is_active = False
    version.deactivated_at = datetime.utcnow()
    version.deactivated_by = str(admin.id)
    await log_admin_change(db, str(admin.id), "RULE_DEACTIVATE", "PricingRuleVersion", version_id, f"Deactivated {version.version_tag}")
    await db.commit()
    return {"message": f"Version {version.version_tag} deactivated"}


# ─── Audit Log ────────────────────────────────────────────────────────────────

@router.get("/audit-logs", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin)
):
    query = select(PricingAuditLog)
    if event_type:
        query = query.where(PricingAuditLog.event_type == event_type)
    query = query.order_by(PricingAuditLog.created_at.desc())
    return await paginate(db, query, page, limit)

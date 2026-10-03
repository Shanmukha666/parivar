from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional, Dict, Any

from app.database import get_db
from app.models.models import Trade, Provider, Scheme, Pathway, OutcomeMetric, DataSource, Story
from app.schemas.schemas import MetricIngest
from app.core.supabase_auth import admin_user
from datetime import date, timedelta
from app.core.tools import get_outcomes, get_pathway, find_providers, get_schemes, get_story, recommend_trades

router = APIRouter()

def is_stale(verification_date: date | None, today: date | None = None) -> bool:
    return bool(verification_date and verification_date < (today or date.today()) - timedelta(days=730))

@router.get("/outcomes")
async def list_verified_outcomes(
    trade_id: Optional[int] = Query(None, gt=0),
    provider_id: Optional[int] = Query(None, gt=0),
    district: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    include_demo: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(OutcomeMetric, DataSource).join(DataSource, DataSource.id == OutcomeMetric.source_id)
    if trade_id:
        stmt = stmt.where(OutcomeMetric.trade_id == trade_id)
    if provider_id:
        stmt = stmt.where(OutcomeMetric.provider_id == provider_id)
    if district:
        stmt = stmt.where(func.lower(OutcomeMetric.district) == district.lower())
    if state:
        stmt = stmt.where(func.lower(OutcomeMetric.state) == state.lower())
    if not include_demo:
        stmt = stmt.where(
            OutcomeMetric.verification_status == "verified",
            OutcomeMetric.is_synthetic.is_(False),
        )
    result = await db.execute(stmt.order_by(OutcomeMetric.year.desc(), OutcomeMetric.id.desc()))
    today = date.today()
    return [{
        "id": metric.id,
        "trade_id": metric.trade_id,
        "provider_id": metric.provider_id,
        "state": metric.state,
        "district": metric.district,
        "metric_key": metric.metric_key,
        "metric_value": float(metric.metric_value) if metric.metric_value is not None else None,
        "metric_text": metric.metric_text,
        "unit": metric.unit,
        "year": metric.year,
        "sample_size": metric.sample_size,
        "verification_status": metric.verification_status,
        "is_synthetic": metric.is_synthetic,
        "data_quality": metric.data_quality,
        "confidence": float(metric.confidence) if metric.confidence is not None else None,
        "verification_date": metric.verification_date.isoformat() if metric.verification_date else None,
        "stale": is_stale(metric.verification_date, today),
        "source": {
            "publisher": source.publisher,
            "title": source.title,
            "url": source.source_url,
            "document_reference": source.document_reference,
        },
    } for metric, source in result.all()]

@router.post("/outcomes/metrics", status_code=status.HTTP_201_CREATED)
async def ingest_outcome_metric(
    payload: MetricIngest,
    current_user=Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    source = DataSource(
        publisher=payload.publisher,
        title=payload.source_title,
        source_url=payload.source_url,
        document_reference=payload.document_reference,
    )
    db.add(source)
    await db.flush()
    metric = OutcomeMetric(
        trade_id=payload.trade_id,
        provider_id=payload.provider_id,
        state=payload.state,
        district=payload.district,
        metric_key=payload.metric_key,
        metric_value=payload.metric_value,
        metric_text=payload.metric_text,
        unit=payload.unit,
        year=payload.year,
        sample_size=payload.sample_size,
        source_id=source.id,
        verification_date=payload.verification_date.date() if payload.verification_date else None,
        verification_status=payload.verification_status,
        data_quality=payload.data_quality,
        confidence=payload.confidence,
        is_synthetic=payload.is_synthetic,
    )
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return {"id": metric.id, "verification_status": metric.verification_status, "is_synthetic": metric.is_synthetic}

@router.get("/trades")
async def list_trades(
    district: Optional[str] = Query(None),
    interest: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    if interest:
        interests_list = [i.strip() for i in interest.split(",") if i.strip()]
        rec = await recommend_trades(
            interests=interests_list,
            state=state or "Telangana",
            district=district,
            db=db
        )
        if rec.get("trades"):
            return rec["trades"]

    stmt = select(Trade).order_by(Trade.id)
    result = await db.execute(stmt)
    trades = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "name_en": t.name_en,
            "name_local": t.name_local or {},
            "sector": t.sector,
            "nsqf_level": t.nsqf_level,
            "duration_months": t.duration_months,
            "entry_qualification": t.entry_qualification,
            "safety_notes": t.safety_notes,
            "job_roles": t.job_roles or [],
            "description_simple": t.description_simple or {}
        }
        for t in trades
    ]

@router.get("/trades/{id}")
async def get_trade(id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Trade).where(Trade.id == id)
    result = await db.execute(stmt)
    trade = result.scalars().first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
        
    return {
        "id": trade.id,
        "name_en": trade.name_en,
        "name_local": trade.name_local or {},
        "sector": trade.sector,
        "nsqf_level": trade.nsqf_level,
        "duration_months": trade.duration_months,
        "entry_qualification": trade.entry_qualification,
        "safety_notes": trade.safety_notes,
        "job_roles": trade.job_roles or [],
        "description_simple": trade.description_simple or {}
    }

@router.get("/trades/{id}/outcomes")
async def get_trade_outcomes(
    id: int,
    district: Optional[str] = Query(None),
    state: Optional[str] = Query("Telangana"),
    db: AsyncSession = Depends(get_db)
):
    outcomes = await get_outcomes(trade_id=id, state=state, district=district, db=db)
    return outcomes

@router.get("/trades/{id}/pathway")
async def get_trade_pathway(id: int, db: AsyncSession = Depends(get_db)):
    pathway = await get_pathway(trade_id=id, db=db)
    return pathway

@router.get("/trades/{id}/story")
async def get_trade_story(
    id: int,
    district: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    story = await get_story(trade_id=id, district=district, db=db)
    return story

@router.get("/providers")
async def list_providers(
    trade_id: Optional[int] = Query(None),
    district: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Provider)
    if district:
        stmt = stmt.where(func.lower(Provider.district) == district.lower())
    elif state:
        stmt = stmt.where(func.lower(Provider.state) == state.lower())
        
    stmt = stmt.order_by(Provider.name).limit(20)
    result = await db.execute(stmt)
    providers = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "type": p.type,
            "state": p.state,
            "district": p.district,
            "accreditation": p.accreditation,
            "fee_inr": p.fee_inr,
            "contact": p.contact
            ,"verified": p.verified,
            "is_synthetic": p.is_synthetic,
        }
        for p in providers
    ]

@router.get("/schemes")
async def list_schemes(
    state: Optional[str] = Query(None),
    income_bracket: Optional[str] = Query(None),
    trade_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    schemes_data = await get_schemes(state=state or "Telangana", income_bracket=income_bracket, trade_id=trade_id, db=db)
    return schemes_data.get("schemes", [])

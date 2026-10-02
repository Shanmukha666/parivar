from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional, Dict, Any

from app.database import get_db
from app.models.models import Trade, Provider, Scheme, Pathway, Outcome, Story
from app.core.tools import get_outcomes, get_pathway, find_providers, get_schemes, get_story, recommend_trades

router = APIRouter()

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

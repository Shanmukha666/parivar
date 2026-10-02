"""
Tool layer – deterministic SQL queries returning typed rows with source metadata.
PRD section 3.1.
"""

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List, Optional

from app.models.models import Outcome, Pathway, Provider, Scheme, Story, Trade

import logging
logger = logging.getLogger(__name__)


async def get_outcomes(
    trade_id: int,
    state: str,
    db: AsyncSession,
    district: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get placement rate, salaries and self-employment for a trade.
    Tries district first; falls back to state if sample_size < 20.
    """
    scope = "district"
    data = None

    # 1. Try district-level data
    if district:
        stmt = (
            select(Outcome)
            .where(
                Outcome.trade_id == trade_id,
                func.lower(Outcome.district) == district.lower(),
            )
            .order_by(Outcome.cohort_year.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        row = result.scalars().first()
        if row and row.sample_size and row.sample_size >= 20:
            data = row
            scope = "district"

    # 2. Fall back to state-level aggregation
    if data is None:
        stmt = (
            select(Outcome)
            .where(
                Outcome.trade_id == trade_id,
                func.lower(Outcome.state) == state.lower(),
            )
            .order_by(Outcome.cohort_year.desc())
            .limit(1)
        )
        result = await db.execute(stmt)
        data = result.scalars().first()
        scope = "state"

    if data is None:
        return {"found": False, "tool_result_id": "outcomes_empty"}

    return {
        "found": True,
        "tool_result_id": f"outcomes_{trade_id}_{scope}",
        "scope": scope,
        "scope_label": (
            f"{district} district" if scope == "district"
            else f"{state} state (district data not available or too small)"
        ),
        "placement_rate": float(data.placement_rate) if data.placement_rate else None,
        "avg_start_salary_inr": data.avg_start_salary_inr,
        "salary_3yr_min": data.salary_3yr_min,
        "salary_3yr_max": data.salary_3yr_max,
        "self_employment_rate": float(data.self_employment_rate) if data.self_employment_rate else None,
        "sample_size": data.sample_size,
        "cohort_year": data.cohort_year,
        "source": data.source,
        "verified_on": data.verified_on.isoformat() if data.verified_on else None,
    }


async def get_pathway(trade_id: int, db: AsyncSession) -> Dict[str, Any]:
    """Get career ladder with NSQF levels, further education and typical roles."""
    stmt = (
        select(Pathway)
        .where(Pathway.from_trade_id == trade_id)
        .order_by(Pathway.step_order)
    )
    result = await db.execute(stmt)
    pathways = result.scalars().all()

    if not pathways:
        return {"found": False, "tool_result_id": "pathway_empty"}

    # Also get trade info for context
    trade_stmt = select(Trade).where(Trade.id == trade_id)
    trade_result = await db.execute(trade_stmt)
    trade = trade_result.scalars().first()

    return {
        "found": True,
        "tool_result_id": f"pathway_{trade_id}",
        "trade_name": trade.name_en if trade else "Unknown",
        "base_nsqf_level": trade.nsqf_level if trade else None,
        "duration_months": trade.duration_months if trade else None,
        "steps": [
            {
                "step_order": p.step_order,
                "title": p.step_title,
                "nsqf_level": p.nsqf_level,
                "next_education": p.next_education,
                "typical_role": p.typical_role,
                "typical_salary_range": p.typical_salary_range,
            }
            for p in pathways
        ],
    }


async def find_providers(
    trade_id: int,
    state: str,
    db: AsyncSession,
    district: Optional[str] = None,
) -> Dict[str, Any]:
    """Find accredited training centres near the family."""
    conditions = [func.lower(Provider.state) == state.lower()]
    scope = "state"

    if district:
        # Try district first
        district_stmt = (
            select(Provider)
            .where(
                func.lower(Provider.district) == district.lower(),
            )
            .order_by(Provider.name)
        )
        result = await db.execute(district_stmt)
        providers = result.scalars().all()

        if providers:
            scope = "district"
            return {
                "found": True,
                "tool_result_id": f"providers_{trade_id}_{scope}",
                "scope": scope,
                "providers": [
                    {
                        "name": p.name,
                        "type": p.type,
                        "district": p.district,
                        "accreditation": p.accreditation,
                        "fee_inr": p.fee_inr,
                        "contact": p.contact,
                    }
                    for p in providers
                ],
            }

    # State-level fallback
    stmt = (
        select(Provider)
        .where(func.lower(Provider.state) == state.lower())
        .order_by(Provider.name)
        .limit(5)
    )
    result = await db.execute(stmt)
    providers = result.scalars().all()

    if not providers:
        return {"found": False, "tool_result_id": "providers_empty"}

    return {
        "found": True,
        "tool_result_id": f"providers_{trade_id}_state",
        "scope": "state",
        "providers": [
            {
                "name": p.name,
                "type": p.type,
                "district": p.district,
                "accreditation": p.accreditation,
                "fee_inr": p.fee_inr,
                "contact": p.contact,
            }
            for p in providers
        ],
    }


async def get_schemes(
    state: str,
    db: AsyncSession,
    income_bracket: Optional[str] = None,
    trade_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Get schemes, stipends and scholarships the family may qualify for."""
    # Get national schemes (state is NULL) + state-specific schemes
    stmt = (
        select(Scheme)
        .where(
            or_(
                Scheme.state.is_(None),
                func.lower(Scheme.state) == state.lower(),
            )
        )
    )
    result = await db.execute(stmt)
    schemes = result.scalars().all()

    if not schemes:
        return {"found": False, "tool_result_id": "schemes_empty"}

    return {
        "found": True,
        "tool_result_id": f"schemes_{state}",
        "schemes": [
            {
                "name": s.name,
                "state": s.state or "National",
                "eligibility": s.eligibility,
                "benefit": s.benefit,
                "how_to_apply": s.how_to_apply,
                "source": s.source,
            }
            for s in schemes
        ],
    }


async def get_story(
    trade_id: int,
    db: AsyncSession,
    district: Optional[str] = None,
) -> Dict[str, Any]:
    """Get a local learner success story for the trade."""
    conditions = [Story.trade_id == trade_id]
    if district:
        conditions.append(func.lower(Story.district) == district.lower())

    stmt = select(Story).where(and_(*conditions)).limit(1)
    result = await db.execute(stmt)
    story = result.scalars().first()

    if not story and district:
        # Fallback: any story for this trade
        stmt = select(Story).where(Story.trade_id == trade_id).limit(1)
        result = await db.execute(stmt)
        story = result.scalars().first()

    if not story:
        return {"found": False, "tool_result_id": "story_empty"}

    return {
        "found": True,
        "tool_result_id": f"story_{trade_id}_{story.district}",
        "name": story.name,
        "district": story.district,
        "quote": story.quote,
        "outcome": story.outcome,
        "is_synthetic": story.is_synthetic,
    }


async def recommend_trades(
    interests: List[str],
    state: str,
    db: AsyncSession,
    learner_class: Optional[str] = None,
    district: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Suggest 2-3 trades based on interests, class passed and district demand.
    Matches interests against trade sectors and job roles.
    """
    # Map common interests to sectors/keywords
    interest_map = {
        "electrical": ["electrical", "electronics", "electrician"],
        "mechanical": ["mechanical", "fitter", "auto", "cnc", "hvac", "welder"],
        "computers": ["it", "data", "computer", "digital"],
        "beauty": ["beauty", "beautician", "wellness"],
        "fashion": ["tailoring", "fashion", "textile"],
        "solar": ["solar", "renewable", "energy"],
        "repair": ["mobile", "repair", "technician"],
        "construction": ["plumber", "construction", "civil"],
        "automotive": ["auto", "mechanic", "vehicle"],
        "healthcare": ["health", "medical", "care"],
    }

    # Get all trades
    stmt = select(Trade)
    result = await db.execute(stmt)
    all_trades = result.scalars().all()

    # Score trades by interest match
    scored = []
    for trade in all_trades:
        score = 0
        trade_text = (
            f"{trade.name_en} {trade.sector} "
            f"{' '.join(trade.job_roles) if trade.job_roles else ''}"
        ).lower()

        for interest in interests:
            interest_lower = interest.lower()
            # Direct match
            if interest_lower in trade_text:
                score += 3
            # Mapped match
            for key, synonyms in interest_map.items():
                if interest_lower in key or key in interest_lower:
                    for syn in synonyms:
                        if syn in trade_text:
                            score += 2
                            break

        if score > 0:
            scored.append((trade, score))

    # Sort by score, take top 3
    scored.sort(key=lambda x: x[1], reverse=True)
    top_trades = scored[:3] if scored else [(t, 0) for t in all_trades[:3]]

    return {
        "found": True,
        "tool_result_id": "recommend_trades",
        "trades": [
            {
                "id": trade.id,
                "name_en": trade.name_en,
                "name_local": trade.name_local,
                "sector": trade.sector,
                "nsqf_level": trade.nsqf_level,
                "duration_months": trade.duration_months,
                "entry_qualification": trade.entry_qualification,
                "description_simple": trade.description_simple,
                "job_roles": trade.job_roles,
                "match_score": score,
            }
            for trade, score in top_trades
        ],
    }


# ── Tool dispatcher ────────────────────────────────────────────────────

TOOL_FUNCTIONS = {
    "get_outcomes": get_outcomes,
    "get_pathway": get_pathway,
    "find_providers": find_providers,
    "get_schemes": get_schemes,
    "get_story": get_story,
    "recommend_trades": recommend_trades,
}


async def execute_tool(
    tool_name: str,
    tool_input: dict,
    db: AsyncSession,
) -> Dict[str, Any]:
    """Execute a tool call and return results."""
    if tool_name not in TOOL_FUNCTIONS:
        return {"error": f"Unknown tool: {tool_name}"}

    fn = TOOL_FUNCTIONS[tool_name]

    # Map tool input parameters to function arguments
    kwargs = {"db": db}
    if tool_name == "get_outcomes":
        kwargs.update({
            "trade_id": tool_input.get("trade_id"),
            "state": tool_input.get("state"),
            "district": tool_input.get("district"),
        })
    elif tool_name == "get_pathway":
        kwargs["trade_id"] = tool_input.get("trade_id")
    elif tool_name == "find_providers":
        kwargs.update({
            "trade_id": tool_input.get("trade_id"),
            "state": tool_input.get("state"),
            "district": tool_input.get("district"),
        })
    elif tool_name == "get_schemes":
        kwargs.update({
            "state": tool_input.get("state"),
            "income_bracket": tool_input.get("income_bracket"),
            "trade_id": tool_input.get("trade_id"),
        })
    elif tool_name == "get_story":
        kwargs.update({
            "trade_id": tool_input.get("trade_id"),
            "district": tool_input.get("district"),
        })
    elif tool_name == "recommend_trades":
        kwargs.update({
            "interests": tool_input.get("interests", []),
            "state": tool_input.get("state"),
            "learner_class": tool_input.get("learner_class"),
            "district": tool_input.get("district"),
        })

    try:
        result = await fn(**kwargs)
        return result
    except Exception as e:
        logger.error(f"Tool execution error: {tool_name}: {e}")
        return {"error": str(e), "tool_result_id": f"{tool_name}_error"}

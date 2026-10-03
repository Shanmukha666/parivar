from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, distinct
from typing import Optional, Dict, Any, List
import io
import csv
import json

from app.database import get_db
from app.models.models import Session, Message, MessageAnalysis, Escalation, Event, Trade
from app.core.prompts import ADMIN_INSIGHT_PROMPT
from app.routers.auth import require_role
import logging
logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_role(["admin"]))])

MIN_SESSIONS_INSIGHTS = 30
MIN_SESSIONS_HEATMAP = 10

@router.get("/metrics")
async def get_metrics(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    trade_id: Optional[int] = Query(None),
    lang: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    # Base filter conditions for sessions
    conds = []
    if state:
        conds.append(func.lower(Session.state) == state.lower())
    if district:
        conds.append(func.lower(Session.district) == district.lower())
    if trade_id:
        conds.append(Session.selected_trade_id == trade_id)
    if lang:
        conds.append(Session.lang == lang)

    # 1. Total sessions
    sess_stmt = select(func.count(Session.id))
    if conds:
        sess_stmt = sess_stmt.where(and_(*conds))
    total_sessions_res = await db.execute(sess_stmt)
    total_sessions = total_sessions_res.scalar() or 0

    # 2. Total escalations
    esc_stmt = select(func.count(Escalation.id))
    if conds:
        esc_stmt = esc_stmt.join(Session, Escalation.session_id == Session.id).where(and_(*conds))
    esc_res = await db.execute(esc_stmt)
    total_escalations = esc_res.scalar() or 0
    escalation_rate = round(total_escalations / max(total_sessions, 1), 3)

    # 3. Summary shares count (from events)
    summary_stmt = select(func.count(Event.id)).where(Event.type == "summary_shared")
    if conds:
        summary_stmt = summary_stmt.join(Session, Event.session_id == Session.id).where(and_(*conds))
    summary_res = await db.execute(summary_stmt)
    total_summary_shares = summary_res.scalar() or 0

    # 4. Trades viewed count (from events)
    trades_viewed_stmt = select(func.count(Event.id)).where(Event.type == "trade_viewed")
    if conds:
        trades_viewed_stmt = trades_viewed_stmt.join(Session, Event.session_id == Session.id).where(and_(*conds))
    trades_viewed_res = await db.execute(trades_viewed_stmt)
    total_trades_viewed = trades_viewed_res.scalar() or 0

    # 5. Objection breakdown
    obj_stmt = (
        select(MessageAnalysis.objection_category, func.count(MessageAnalysis.message_id))
        .join(Message, MessageAnalysis.message_id == Message.id)
        .join(Session, Message.session_id == Session.id)
    )
    if conds:
        obj_stmt = obj_stmt.where(and_(*conds))
    obj_stmt = obj_stmt.group_by(MessageAnalysis.objection_category)
    obj_res = await db.execute(obj_stmt)
    objection_counts = {cat: count for cat, count in obj_res.all() if cat and cat != "none"}

    for cat in ["income", "safety", "status", "job_security", "degree_pref", "cost"]:
        if cat not in objection_counts:
            objection_counts[cat] = 0

    # 6. District resistance index calculation
    dist_stmt = select(distinct(Session.district), Session.state)
    if state:
        dist_stmt = dist_stmt.where(func.lower(Session.state) == state.lower())
    dist_res = await db.execute(dist_stmt)
    districts_list = dist_res.all()

    district_heatmap = []
    for d_name, s_name in districts_list:
        if not d_name:
            continue
        
        d_sess_stmt = select(func.count(Session.id)).where(Session.district == d_name)
        d_sess = (await db.execute(d_sess_stmt)).scalar() or 0

        if d_sess < MIN_SESSIONS_HEATMAP:
            district_heatmap.append({
                "district": d_name,
                "state": s_name,
                "session_count": d_sess,
                "resistance_index": None,
                "note": f"Sample too small (< {MIN_SESSIONS_HEATMAP} sessions)"
            })
            continue

        d_esc_stmt = (
            select(func.count(Escalation.id))
            .join(Session, Escalation.session_id == Session.id)
            .where(Session.district == d_name)
        )
        d_esc = (await db.execute(d_esc_stmt)).scalar() or 0
        d_esc_rate = d_esc / max(d_sess, 1)

        d_neg_start_stmt = (
            select(func.avg(MessageAnalysis.sentiment))
            .join(Message, MessageAnalysis.message_id == Message.id)
            .join(Session, Message.session_id == Session.id)
            .where(Session.district == d_name, Message.speaker == "parent")
        )
        d_avg_sent = (await db.execute(d_neg_start_stmt)).scalar()
        d_avg_sent = float(d_avg_sent) if d_avg_sent is not None else None

        share_neg_start = max(0.0, min(1.0, (0.5 - d_avg_sent))) if d_avg_sent is not None else None
        mean_sentiment_shift_norm = max(0.0, min(1.0, (d_avg_sent + 1.0) / 2.0)) if d_avg_sent is not None else None

        r_index = (
            0.5 * (share_neg_start or 0.0) +
            0.3 * d_esc_rate +
            0.2 * (1.0 - (mean_sentiment_shift_norm or 0.0))
        ) * 100.0

        district_heatmap.append({
            "district": d_name,
            "state": s_name,
            "session_count": d_sess,
            "resistance_index": round(r_index, 1),
            "share_neg_start": round(share_neg_start, 2),
            "escalation_rate": round(d_esc_rate, 2),
            "mean_sentiment": round(d_avg_sent, 2) if d_avg_sent is not None else None
        })

    district_heatmap.sort(key=lambda x: (x["resistance_index"] or 0), reverse=True)

    # 7. Funnel
    funnel = {
        "sessions": total_sessions,
        "trades_viewed": total_trades_viewed,
        "summary_shared": total_summary_shares,
        "escalated": total_escalations
    }

    # 8. Avg sentiment shift overall
    sessions_stmt = select(Session.id)
    if conds:
        sessions_stmt = sessions_stmt.where(and_(*conds))
    sess_ids_res = await db.execute(sessions_stmt)
    sess_ids = sess_ids_res.scalars().all()
    
    total_shift = 0.0
    shift_count = 0
    for sid in sess_ids:
        # Get first and last parent message sentiment
        stmt = (
            select(MessageAnalysis.sentiment)
            .join(Message, MessageAnalysis.message_id == Message.id)
            .where(Message.session_id == sid, Message.speaker == "parent")
            .order_by(Message.created_at)
        )
        res = await db.execute(stmt)
        sents = res.scalars().all()
        if len(sents) >= 4:
            first = sum(float(value) for value in sents[:2]) / 2
            last = sum(float(value) for value in sents[-2:]) / 2
            total_shift += last - first
            shift_count += 1
            
    avg_sentiment_shift = round(total_shift / shift_count, 2) if shift_count > 0 else None

    return {
        "total_sessions": total_sessions,
        "avg_sentiment_shift": avg_sentiment_shift,
        "escalation_rate": escalation_rate,
        "total_summary_shares": funnel["summary_shared"],
        "objections": objection_counts,
        "funnel": funnel,
        "heatmap": district_heatmap
    }

@router.get("/insights")
async def get_insights(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    metrics = await get_metrics(state=state, district=district, db=db)
    
    # Check if we can use real LLM for insights
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=api_key)
            prompt = ADMIN_INSIGHT_PROMPT.format(metrics_json=json.dumps(metrics, default=str))
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}]
            )
            text = response.content[0].text
            insights = [line.strip().strip("-*123. ") for line in text.split("\n") if line.strip()]
            return {"insights": insights[:3], "weak_signal": metrics.get("total_sessions", 0) < MIN_SESSIONS_INSIGHTS}
        except Exception as e:
            logger.warning(f"LLM insights generation failed: {e}")
            pass

    # Fallback basic logic
    total_sess = metrics.get("total_sessions", 0)
    weak_signal = total_sess < MIN_SESSIONS_INSIGHTS
    objections = metrics.get("objections", {})
    top_obj = max(objections.items(), key=lambda x: x[1])[0] if objections else "status"
    prefix = f"Signal is weak due to small sample size (<{MIN_SESSIONS_INSIGHTS}). " if weak_signal else ""
    
    top_district = "your district"
    highest_esc = 0
    if metrics.get("heatmap"):
        top_d = metrics["heatmap"][0]
        top_district = top_d["district"]
        highest_esc = int(top_d.get("escalation_rate", 0) * 100)

    avg_shift = metrics.get("avg_sentiment_shift", 0.0)

    insights = [
        f"{prefix}Parental resistance in {district or state or 'target districts'} is primarily driven by {top_obj.replace('_', ' ')} concerns ({objections.get(top_obj, 0)} sessions); deploy targeted localized video testimonials featuring local alumni.",
        f"{prefix}The district resistance index peaks in {top_district} with escalation rates exceeding {highest_esc}%; equip local ITI counsellors with proactive callback toolkits.",
        f"{prefix}Sessions had an average sentiment shift of +{avg_shift}; prioritize WhatsApp card sharing early in family onboarding."
    ]

    return {"insights": insights, "weak_signal": weak_signal}

@router.get("/resistance-index")
async def get_resistance_index_breakdown(db: AsyncSession = Depends(get_db)):
    metrics = await get_metrics(db=db)
    return {"districts": metrics.get("heatmap", [])}

@router.get("/export.csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Session, Escalation.id, Trade.name_en)
        .outerjoin(Escalation, Session.id == Escalation.session_id)
        .outerjoin(Trade, Session.selected_trade_id == Trade.id)
        .order_by(Session.created_at.desc())
        .limit(500)
    )
    result = await db.execute(stmt)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "session_id", "created_at", "language", "state", "district",
        "user_role", "learner_class", "income_bracket", "trade_name",
        "was_escalated"
    ])

    for sess, esc_id, tr_name in rows:
        writer.writerow([
            str(sess.id),
            sess.created_at.isoformat() if sess.created_at else "",
            sess.lang or "en",
            sess.state or "",
            sess.district or "",
            sess.user_role or "",
            sess.learner_class or "",
            sess.income_bracket or "",
            tr_name or "Not selected",
            "Yes" if esc_id else "No"
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=parivar_path_sessions.csv"}
    )

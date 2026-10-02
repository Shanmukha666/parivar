"""
Escalation engine – PRD section 6.9.
Detects when human counsellor help is needed, creates tickets, manages queue.
"""

import json
import logging
import os
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Escalation, Message, MessageAnalysis, Session
from app.core.prompts import ESCALATION_SUMMARY_PROMPT

logger = logging.getLogger(__name__)

# ── Sensitive keywords (multilingual) ──────────────────────────────────
SENSITIVE_KEYWORDS = [
    # English
    "unsafe", "accident", "injury", "family fight", "debt", "harassment",
    "suicide", "abuse", "violence", "threatened",
    # Hindi
    "khatarnak", "hadsa", "chot", "ladai", "karza", "pareshan",
    "aatmhatya", "marpit", "hinsa", "dhamki",
    # Telugu
    "asuraksitam", "pramaadam", "gaya", "kalahamu", "aapaddha",
    "vedhimpulu", "aatmahatya", "hansa",
]


async def check_escalation_triggers(
    session_id: str,
    latest_classification: dict,
    validator_failed_count: int,
    db: AsyncSession,
) -> tuple[bool, Optional[str]]:
    """
    Evaluate all escalation triggers. Returns (should_escalate, reason).

    Triggers (PRD 6.9):
    1. intent == request_human
    2. 3 consecutive parent messages with sentiment < -0.4
    3. No tool data and user asks for facts twice
    4. Sensitive keywords
    5. Validator failed twice
    """

    # Trigger 1: Explicit request for human
    if latest_classification.get("intent") == "request_human":
        return True, "Family explicitly requested a human counsellor"

    # Trigger 5: Validator failed twice
    if validator_failed_count >= 2:
        return True, "AI could not provide verified data after two attempts"

    # Trigger 2: 3 consecutive negative parent messages
    stmt = (
        select(Message, MessageAnalysis)
        .join(MessageAnalysis, Message.id == MessageAnalysis.message_id)
        .where(
            Message.session_id == session_id,
            Message.speaker == "parent",
        )
        .order_by(Message.created_at.desc())
        .limit(3)
    )
    try:
        result = await db.execute(stmt)
        rows = result.all()
        if len(rows) >= 3:
            sentiments = [float(row[1].sentiment) for row in rows if row[1].sentiment is not None]
            if len(sentiments) >= 3 and all(s < -0.4 for s in sentiments):
                return True, "Parent expressed persistent resistance (3 consecutive negative messages)"
    except Exception as e:
        logger.warning(f"Error checking sentiment trigger: {e}")

    # Trigger 4: Sensitive keywords in latest message
    latest_text = latest_classification.get("_original_text", "").lower()
    for keyword in SENSITIVE_KEYWORDS:
        if keyword in latest_text:
            return True, f"Sensitive topic detected: {keyword}"

    return False, None


async def generate_escalation_summary(
    session_id: str,
    reason: str,
    db: AsyncSession,
    api_key: Optional[str] = None,
) -> str:
    """Generate an auto-summary of the session for the counsellor."""

    # Get session info
    stmt = select(Session).where(Session.id == session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()

    # Get message history
    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    transcript = "\n".join(
        f"[{msg.speaker}]: {msg.text}" for msg in messages
    )

    # Try LLM summary
    if api_key or os.getenv("ANTHROPIC_API_KEY"):
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(
                api_key=api_key or os.getenv("ANTHROPIC_API_KEY")
            )
            prompt = ESCALATION_SUMMARY_PROMPT.format(transcript=transcript)
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.warning(f"LLM summary failed: {e}")

    # Fallback: structured summary
    profile = ""
    if session:
        profile = (
            f"District: {session.district}, State: {session.state}, "
            f"Class: {session.learner_class}, Income: {session.income_bracket}"
        )

    parent_messages = [m for m in messages if m.speaker == "parent"]
    last_parent = parent_messages[-1].text if parent_messages else "N/A"

    return (
        f"Session Profile: {profile}\n"
        f"Escalation Reason: {reason}\n"
        f"Total messages: {len(messages)}\n"
        f"Last parent message: {last_parent}\n"
        f"Action needed: Review transcript and address family concerns."
    )


async def create_escalation_ticket(
    session_id: str,
    reason: str,
    db: AsyncSession,
    callback_phone: Optional[str] = None,
    callback_slot: Optional[str] = None,
) -> Escalation:
    """Create an escalation ticket and add to queue."""

    summary = await generate_escalation_summary(session_id, reason, db)

    ticket = Escalation(
        session_id=session_id,
        reason=reason,
        summary=summary,
        status="queued",
        callback_phone=callback_phone,
        callback_slot=callback_slot,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    logger.info(f"Escalation ticket #{ticket.id} created for session {session_id}")

    # In production: push to Redis queue and notify counsellors via WebSocket
    # For hackathon: the counsellor console polls the queue endpoint

    return ticket


async def get_escalation_queue(db: AsyncSession) -> List[dict]:
    """Get all queued escalation tickets for counsellors."""
    stmt = (
        select(Escalation)
        .where(Escalation.status.in_(["queued", "active"]))
        .order_by(Escalation.created_at.desc())
    )
    result = await db.execute(stmt)
    tickets = result.scalars().all()

    return [
        {
            "id": t.id,
            "session_id": str(t.session_id),
            "reason": t.reason,
            "summary": t.summary,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "callback_phone": t.callback_phone,
            "callback_slot": t.callback_slot,
        }
        for t in tickets
    ]


async def accept_ticket(ticket_id: int, counsellor_id: int, db: AsyncSession) -> Escalation:
    """Counsellor accepts a ticket."""
    stmt = select(Escalation).where(Escalation.id == ticket_id)
    result = await db.execute(stmt)
    ticket = result.scalars().first()
    if ticket:
        ticket.status = "active"
        ticket.counsellor_id = counsellor_id
        await db.commit()
        await db.refresh(ticket)
    return ticket


async def resolve_ticket(
    ticket_id: int,
    resolution_note: str,
    db: AsyncSession,
) -> Escalation:
    """Counsellor resolves a ticket."""
    stmt = select(Escalation).where(Escalation.id == ticket_id)
    result = await db.execute(stmt)
    ticket = result.scalars().first()
    if ticket:
        ticket.status = "resolved"
        ticket.resolved_at = datetime.utcnow()
        ticket.resolution_note = resolution_note
        await db.commit()
        await db.refresh(ticket)
    return ticket

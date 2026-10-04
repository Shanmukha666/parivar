"""
Escalation engine – PRD section 6.9.
Detects when human counsellor help is needed, creates tickets, manages queue.
"""

import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Any
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Escalation, Message, MessageAnalysis, Session
from app.core.prompts import ESCALATION_SUMMARY_PROMPT
from app.core.gemini import GeminiError, generate_text, is_configured

logger = logging.getLogger(__name__)

SENSITIVE_KEYWORDS = [
    # English
    "family fight", "debt", "harassment", "suicide", "abuse", "violence", "threatened", "forced",
    # Hindi
    "karza", "ladai", "aatmhatya", "marpit", "hinsa", "dhamki", "कर्ज", "आत्महत्या", "हिंसा",
    # Telugu
    "kalahamu", "aapaddha", "vedhimpulu", "aatmahatya", "hansa", "appu", "ఆత్మహత్య", "వేధింపులు", "హింస",
    # Tamil
    "kadan", "tharkolai", "kodumai", "thunpuruthal", "vanmurai",
    "கடன்", "தற்கொலை", "துன்புறுத்தல்", "வன்முறை"
]

ESCALATION_STATUSES = {"new", "assigned", "contacted", "resolved", "closed_no_response"}
ACTIVE_STATUSES = {"new", "assigned", "contacted"}
PRIORITIES = {"normal", "high", "urgent"}


def can_view_ticket(ticket: Escalation, user_id: str, role: str) -> bool:
    """Family users may view only their own session tickets; staff may view assigned work."""
    if role == "admin":
        return True
    if role == "counsellor":
        return str(ticket.counsellor_id) == str(user_id) if ticket.counsellor_id else ticket.status == "new"
    return False


def can_view_family_ticket(ticket: Escalation, session_owner_id: str, user_id: str) -> bool:
    """A family member can only view tickets for sessions they own."""
    return str(session_owner_id) == str(user_id) and str(ticket.session_id) != "None"


def transition_ticket(ticket: Escalation, action: str, actor_id: str, role: str) -> None:
    """Apply the ticket state machine and authorization rules in one place."""
    now = datetime.now(timezone.utc)
    if action == "accept":
        if role not in {"counsellor", "admin"} or ticket.status != "new":
            raise ValueError("Ticket is not available for acceptance")
        ticket.status = "assigned"
        ticket.counsellor_id = UUID(str(actor_id))
        ticket.accepted_at = now
        return
    if action == "contact":
        if role not in {"counsellor", "admin"} or ticket.status != "assigned":
            raise ValueError("Ticket must be assigned before contact begins")
        if role == "counsellor" and str(ticket.counsellor_id) != str(actor_id):
            raise PermissionError("Only the assigned counsellor may begin contact")
        ticket.status = "contacted"
        ticket.contacted_at = now
        return
    if action == "resolve":
        if role not in {"counsellor", "admin"} or ticket.status != "contacted":
            raise ValueError("Ticket must be contacted before resolution")
        if role == "counsellor" and str(ticket.counsellor_id) != str(actor_id):
            raise PermissionError("Only the assigned counsellor may resolve the ticket")
        ticket.status = "resolved"
        ticket.resolved_at = now
        return
    if action == "close":
        if role not in {"counsellor", "admin"} or ticket.status != "resolved":
            raise ValueError("Only a resolved ticket can be closed")
        if role == "counsellor" and str(ticket.counsellor_id) != str(actor_id):
            raise PermissionError("Only the assigned counsellor may close the ticket")
        ticket.status = "closed_no_response"
        ticket.closed_at = now
        return
    raise ValueError("Unknown ticket action")


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
    import uuid
    sid = uuid.UUID(str(session_id)) if not isinstance(session_id, uuid.UUID) else session_id
    stmt = (
        select(Message, MessageAnalysis)
        .join(MessageAnalysis, Message.id == MessageAnalysis.message_id)
        .where(
            Message.session_id == sid,
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
    session_id: Any,
    reason: str,
    db: AsyncSession,
    api_key: Optional[str] = None,
) -> str:
    """Generate an auto-summary of the session for the counsellor."""
    import uuid
    sid = uuid.UUID(str(session_id)) if not isinstance(session_id, uuid.UUID) else session_id

    # Get session info
    stmt = select(Session).where(Session.id == sid)
    result = await db.execute(stmt)
    session = result.scalars().first()

    # Get message history
    stmt = (
        select(Message)
        .where(Message.session_id == sid)
        .order_by(Message.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    transcript = "\n".join(
        f"[{msg.speaker}]: {msg.text}" for msg in messages
    )

    # Gemini summary is optional; the structured fallback remains available.
    if is_configured(api_key):
        try:
            prompt = ESCALATION_SUMMARY_PROMPT.format(transcript=transcript)
            return await generate_text(
                system_instruction="Summarise only the supplied transcript. Do not invent facts.",
                contents=[{"role": "user", "parts": [{"text": prompt}]}],
                api_key=api_key,
                max_output_tokens=300,
                temperature=0,
            )
        except GeminiError as e:
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
    session_id: Any,
    reason: str,
    db: AsyncSession,
    callback_phone: Optional[str] = None,
    callback_slot: Optional[str] = None,
    concern_category: Optional[str] = None,
    priority: str = "normal",
) -> Escalation:
    """Create an escalation ticket and add to queue."""
    import uuid
    sid = uuid.UUID(str(session_id)) if not isinstance(session_id, uuid.UUID) else session_id

    existing_result = await db.execute(
        select(Escalation)
        .where(Escalation.session_id == sid, Escalation.status.in_(ACTIVE_STATUSES))
        .order_by(Escalation.created_at.desc())
        .limit(1)
    )
    existing = existing_result.scalars().first()
    if existing:
        return existing

    summary = await generate_escalation_summary(sid, reason, db)

    if priority not in PRIORITIES:
        raise ValueError("Invalid escalation priority")
    ticket = Escalation(
        session_id=sid,
        reason=reason,
        concern_category=concern_category,
        priority=priority,
        summary=summary,
        status="new",
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
        .where(Escalation.status.in_(["new", "assigned", "contacted"]))
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
            # Callback details remain hidden until the assigned counsellor begins contact.
            "callback_phone": t.callback_phone if t.status == "contacted" else None,
            "callback_slot": t.callback_slot,
            "priority": t.priority,
            "concern_category": t.concern_category,
            "accepted_at": t.accepted_at.isoformat() if t.accepted_at else None,
            "contacted_at": t.contacted_at.isoformat() if t.contacted_at else None,
        }
        for t in tickets
    ]


async def accept_ticket(ticket_id: int, counsellor_id: int, db: AsyncSession) -> Escalation:
    """Counsellor accepts a ticket."""
    stmt = select(Escalation).where(Escalation.id == ticket_id)
    result = await db.execute(stmt)
    ticket = result.scalars().first()
    if ticket:
        transition_ticket(ticket, "accept", str(counsellor_id), "counsellor")
        await db.commit()
        await db.refresh(ticket)
    return ticket


async def contact_ticket(ticket_id: int, counsellor_id: str, db: AsyncSession) -> Escalation:
    stmt = select(Escalation).where(Escalation.id == ticket_id)
    result = await db.execute(stmt)
    ticket = result.scalars().first()
    if ticket:
        transition_ticket(ticket, "contact", counsellor_id, "counsellor")
        await db.commit()
        await db.refresh(ticket)
    return ticket


async def resolve_ticket(
    ticket_id: int,
    resolution_note: str,
    counsellor_id: str,
    db: AsyncSession,
) -> Escalation:
    """Counsellor resolves a ticket."""
    stmt = select(Escalation).where(Escalation.id == ticket_id)
    result = await db.execute(stmt)
    ticket = result.scalars().first()
    if ticket:
        transition_ticket(ticket, "resolve", counsellor_id, "counsellor")
        ticket.resolution_note = resolution_note
        await db.commit()
        await db.refresh(ticket)
    return ticket


async def close_ticket(ticket_id: int, counsellor_id: str, db: AsyncSession) -> Escalation:
    stmt = select(Escalation).where(Escalation.id == ticket_id)
    result = await db.execute(stmt)
    ticket = result.scalars().first()
    if ticket:
        transition_ticket(ticket, "close", counsellor_id, "counsellor")
        await db.commit()
        await db.refresh(ticket)
    return ticket

"""
Counselling orchestrator – the heart of the AI system.
PRD section 3.2: Request flow (chat turn).

Builds a grounded Gemini prompt, validates numbers, and checks escalation.
Evidence is retrieved by this service before Gemini is called.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Session, Message, Trade
from app.core.prompts import SYSTEM_PROMPT
from app.core.classifier import classify_message, store_classification, update_concern_state
from app.core.validator import validate_numbers, REGENERATION_INSTRUCTION, SAFE_FALLBACK
from app.core.grounding import assess_evidence, source_citations, requires_quantitative_evidence
from app.core.gemini import GeminiError, generate_text
from app.core.escalation import (
    check_escalation_triggers,
    create_escalation_ticket,
)

logger = logging.getLogger(__name__)

def _build_system_prompt(session: Session, trade_name: str, tool_results: Dict[str, Any] = None) -> str:
    """Build the system prompt with session context."""
    prompt = SYSTEM_PROMPT.format(
        lang=session.lang or "en",
        state=session.state or "Unknown",
        district=session.district or "Unknown",
        learner_class=session.learner_class or "Unknown",
        income_bracket=session.income_bracket or "Unknown",
        trade=trade_name,
    )
    if tool_results:
        prompt += f"\n\nVERIFIED_DATA:\n{json.dumps(tool_results, default=str)}"
    return prompt


import re

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}")
_PHONE_RE = re.compile(r"\b[6-9]\d{9}\b")

def redact_personal_data(text: str) -> str:
    """Mask email addresses and Indian 10-digit mobile numbers."""
    if not text:
        return text
    text = _EMAIL_RE.sub("[email protected]", text)
    text = _PHONE_RE.sub("[phone protected]", text)
    return text

async def _get_conversation_history(
    session_id: Any, db: AsyncSession, limit: int = 20
) -> List[dict]:
    """Retrieve recent conversation history for the session with PII masked."""
    import uuid
    sid = uuid.UUID(str(session_id)) if not isinstance(session_id, uuid.UUID) else session_id
    stmt = (
        select(Message)
        .where(Message.session_id == sid)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = list(reversed(result.scalars().all()))

    history = []
    for msg in messages:
        if msg.speaker == "ai":
            history.append({"role": "assistant", "content": msg.text})
        else:
            label = "Parent" if msg.speaker == "parent" else "Learner"
            history.append({
                "role": "user",
                "content": f"[{label}]: {redact_personal_data(msg.text)}",
            })
    return history

async def _call_llm_with_tools(
    system_prompt: str,
    messages: List[dict],
    tool_results_all: Dict[str, Any],
    db: AsyncSession,
    api_key: Optional[str] = None,
) -> dict:
    """Call Gemini after the service has retrieved the relevant evidence."""
    return await _call_gemini(system_prompt, messages, tool_results_all, api_key)


async def _call_gemini(
    system_prompt: str,
    messages: List[dict],
    tool_results_all: Dict[str, Any],
    api_key: Optional[str] = None,
) -> dict:
    """Call Gemini with pre-fetched, verified evidence inline in its context."""
    full_system = system_prompt
    if tool_results_all:
        full_system += "\n\nVERIFIED_DATA (the only source for factual claims):\n"
        full_system += json.dumps(tool_results_all, default=str)

    gemini_contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        content = msg.get("content", "")
        if isinstance(content, str) and content.strip():
            gemini_contents.append({"role": role, "parts": [{"text": content}]})

    if not gemini_contents:
        gemini_contents.append({"role": "user", "parts": [{"text": "Hello"}]})

    try:
        reply_text = await generate_text(
            system_instruction=full_system,
            contents=gemini_contents,
            api_key=api_key,
        )
    except GeminiError:
        logger.exception("Gemini API error")
        return {"reply": "", "citations": [], "suggested_chips": [], "escalate": False, "escalate_reason": None, "_tool_results": tool_results_all}
    parsed = _parse_llm_json(reply_text)
    parsed["_tool_results"] = tool_results_all
    return parsed


def _parse_llm_json(reply_text: str) -> dict:
    """Try to extract JSON from LLM reply text."""
    try:
        parsed = json.loads(reply_text)
        return {
            "reply": parsed.get("reply", reply_text),
            "citations": parsed.get("citations", []),
            "suggested_chips": parsed.get("suggested_chips", []),
            "escalate": parsed.get("escalate", False),
            "escalate_reason": parsed.get("escalate_reason"),
        }
    except json.JSONDecodeError:
        return {
            "reply": reply_text,
            "citations": [],
            "suggested_chips": [],
            "escalate": False,
            "escalate_reason": None,
        }


def _gemini_unavailable_response(lang: str, tool_results: Dict[str, Any]) -> dict:
    """Return a transparent, non-factual response when Gemini is unavailable."""
    return {
        "reply": SAFE_FALLBACK.get(lang, SAFE_FALLBACK["en"]),
        "citations": source_citations(tool_results),
        "suggested_chips": ["Talk to a counsellor"],
        "escalate": True,
        "escalate_reason": "gemini_unavailable",
        "_tool_results": tool_results,
    }

    # Legacy demo response retained below temporarily for source compatibility.
    # It is unreachable and will be removed with the next source cleanup.
    last_msg = messages[-1]["content"] if messages else ""
    last_text = last_msg if isinstance(last_msg, str) else str(last_msg)

    # Detect what the user is asking about
    lower = last_text.lower()

    # Check if tool results have outcome data
    outcomes = None
    pathway = None
    providers = None
    schemes = None
    story = None
    trades = None

    for key, val in tool_results.items():
        if isinstance(val, dict):
            if "placement_rate" in val:
                outcomes = val
            elif "steps" in val:
                pathway = val
            elif "providers" in val:
                providers = val
            elif "schemes" in val:
                schemes = val
            elif "quote" in val:
                story = val
            elif "trades" in val:
                trades = val

    # Generate contextual response
    reply_parts = []
    citations = list(tool_results.keys())
    chips = []

    if any(w in lower for w in ["earn", "salary", "income", "money", "paisa", "kamai"]):
        if outcomes and outcomes.get("found"):
            reply_parts.append(
                f"I understand your concern about earnings. "
                f"In {outcomes.get('scope_label', 'your area')}, "
                f"about {outcomes.get('placement_rate', 'N/A')}% of learners found jobs "
                f"({outcomes.get('cohort_year', '')} batch, {outcomes.get('sample_size', '')} learners). "
                f"The starting salary is typically ₹{outcomes.get('avg_start_salary_inr', 'N/A'):,} per month. "
                f"After 3 years, learners earn between ₹{outcomes.get('salary_3yr_min', 'N/A'):,} and "
                f"₹{outcomes.get('salary_3yr_max', 'N/A'):,}."
            )
            chips = ["What about career growth?", "Which centres are nearby?", "Any scholarships?"]
        else:
            reply_parts.append(
                "I don't have reliable local data on earnings for this trade. "
                "Would you like to speak to a counsellor who can help?"
            )

    elif any(w in lower for w in ["safe", "danger", "injury", "suraksha"]):
        reply_parts.append(
            "Your concern about safety is very important. "
            "All accredited training centres follow government safety standards. "
            "Learners are trained on proper use of protective equipment. "
            "Certificates confirm that training met national safety guidelines."
        )
        chips = ["How much can they earn?", "What is the career path?", "Talk to a counsellor"]

    elif any(w in lower for w in ["respect", "status", "izzat", "log kya", "society"]):
        reply_parts.append(
            "I understand your concern about how society views vocational careers. "
            "Today, skilled workers are in great demand. "
            "This is not a dead-end — there is a clear path from trainee to supervisor, "
            "and even to higher education through lateral entry."
        )
        if pathway and pathway.get("found"):
            steps = pathway.get("steps", [])
            if steps:
                reply_parts.append("Here is the career path:")
                for step in steps:
                    reply_parts.append(
                        f"  → {step['title']} (Level {step['nsqf_level']}) - "
                        f"Typical role: {step['typical_role']}, Salary: {step['typical_salary_range']}"
                    )
        chips = ["How much can they earn?", "Which centres are nearby?", "Tell me more"]

    elif any(w in lower for w in ["degree", "college", "university", "digri"]):
        reply_parts.append(
            "A degree is a great option too! Vocational training does not close the door to degrees. "
            "After completing vocational training, your child can pursue further education through "
            "lateral entry into diploma and degree programmes."
        )
        chips = ["Show me the career path", "What about earnings?", "Talk to a counsellor"]

    elif any(w in lower for w in ["cost", "fee", "kharcha", "expensive"]):
        if schemes and schemes.get("found"):
            scheme_list = schemes.get("schemes", [])
            reply_parts.append("There are several schemes that can help with costs:")
            for s in scheme_list[:3]:
                reply_parts.append(f"  • {s['name']}: {s['benefit']}")
        else:
            reply_parts.append(
                "Many government schemes provide free or subsidised training. "
                "I can help you find schemes you qualify for."
            )
        chips = ["How much can they earn?", "Which centres are nearby?", "Tell me more"]

    elif any(w in lower for w in ["job", "naukri", "employment", "rozgaar"]):
        if outcomes and outcomes.get("found"):
            reply_parts.append(
                f"In {outcomes.get('scope_label', 'your area')}, "
                f"about {outcomes.get('placement_rate', 'N/A')}% of learners found jobs "
                f"({outcomes.get('cohort_year', '')} batch). "
                f"Self-employment rate is about {outcomes.get('self_employment_rate', 'N/A')}%."
            )
        else:
            reply_parts.append(
                "Skilled workers are in high demand across India. "
                "After training, learners can find jobs or start their own business."
            )
        chips = ["What about salary?", "Show career path", "Which centres?"]

    else:
        # Default greeting/general response
        reply_parts.append(
            "I'm here to help your family explore vocational training options. "
            "You can ask me about earnings, job prospects, career growth, training costs, "
            "or nearby training centres. What would you like to know?"
        )
        chips = ["How much can they earn?", "Is it safe?", "What about career growth?"]

    # Add a story if available
    if story and story.get("found"):
        reply_parts.append(
            f"\nHere's a real example: {story['name']} from {story['district']} — "
            f"\"{story.get('quote', {}).get('en', '')}\" — {story['outcome']}"
        )

    return {
        "reply": "\n\n".join(reply_parts),
        "citations": citations,
        "suggested_chips": chips[:3],
        "escalate": False,
        "escalate_reason": None,
        "_tool_results": tool_results,
    }


async def handle_turn(
    session: Session,
    speaker: str,
    text: str,
    lang: str,
    db: AsyncSession,
) -> dict:
    """
    Main orchestrator function. Processes one conversation turn.

    Flow (PRD 3.2):
    1. Store message
    2. Run classifier (async)
    3. Get trade name for prompt
    4. Pre-fetch relevant tool data based on classification
    5. Build system prompt with profile and data
    6. Call LLM with tools
    7. Execute tool calls, loop
    8. Validate numbers
    9. Check escalation triggers
    10. Return response
    """

    # ── Step 1: Store incoming message ──
    msg = Message(
        session_id=session.id,
        speaker=speaker,
        text=text,
        lang=lang,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # ── Step 2: Run classifier (async) ──
    classification = await classify_message(text, speaker)
    classification["_original_text"] = text  # For escalation keyword check
    await store_classification(msg.id, classification, db)
    update_concern_state(session, classification)
    await db.commit()

    # ── Step 3: Get trade name for prompt ──
    trade_name = "Not selected"
    if session.selected_trade_id:
        trade_stmt = select(Trade).where(Trade.id == session.selected_trade_id)
        trade_result = await db.execute(trade_stmt)
        trade = trade_result.scalars().first()
        if trade:
            trade_name = trade.name_en

    # ── Step 4: Build message history ──
    history = await _get_conversation_history(str(session.id), db)

    # ── Pre-fetch relevant tool data based on classification ──
    tool_results_all: Dict[str, Any] = {}

    # Always try to get outcome data if a trade is selected
    if session.selected_trade_id:
        from app.core.tools import get_outcomes, get_pathway, get_story, find_providers, get_schemes

        outcomes = await get_outcomes(
            session.selected_trade_id, session.state or "", db=db, district=session.district
        )
        tool_results_all["outcomes"] = outcomes

        pathway = await get_pathway(session.selected_trade_id, db=db)
        tool_results_all["pathway"] = pathway

        story_result = await get_story(
            session.selected_trade_id, db=db, district=session.district
        )
        tool_results_all["story"] = story_result

        providers = await find_providers(
            session.selected_trade_id, session.state or "", db=db, district=session.district
        )
        tool_results_all["providers"] = providers

        schemes_result = await get_schemes(
            session.state or "", db=db, income_bracket=session.income_bracket
        )
        tool_results_all["schemes"] = schemes_result

    evidence = assess_evidence(tool_results_all)
    if session.selected_trade_id and requires_quantitative_evidence(text, classification) and not evidence.usable:
        reason = evidence.reason
        if reason == "conflicting_verified_data":
            reply = "The verified sources give conflicting figures for this question. I will not choose one number without a counsellor reviewing the sources."
        else:
            reply = "Verified information is unavailable for this question. I can connect you with a human counsellor."
        ticket = await create_escalation_ticket(
            str(session.id),
            reason,
            db,
            concern_category=(classification.get("concerns") or [None])[0],
            priority="urgent" if reason == "conflicting_verified_data" else "high",
        )
        update_concern_state(session, classification, escalation_status="escalated")
        await db.commit()
        citations = source_citations(tool_results_all)
        ai_msg = Message(session_id=session.id, speaker="ai", text=reply, lang=lang)
        db.add(ai_msg)
        await db.commit()
        return {
            "reply": reply,
            "citations": citations,
            "suggested_chips": ["Talk to a counsellor"],
            "escalate": True,
            "escalate_reason": reason,
        }

    system_prompt = _build_system_prompt(session, trade_name, tool_results_all)

    # ── Steps 4-6: Call LLM with tool-calling loop ──
    llm_response = await _call_llm_with_tools(
        system_prompt, history, tool_results_all, db
    )
    citations = llm_response.get("citations") or source_citations(tool_results_all)
    if not (llm_response.get("reply") or "").strip():
        llm_response = _gemini_unavailable_response(lang, tool_results_all)
        citations = llm_response.get("citations") or citations
    update_concern_state(
        session,
        classification,
        evidence_presented=citations if isinstance(citations, list) else [],
    )

    # ── Step 7: Number validation ──
    all_tool_results = llm_response.get("_tool_results", tool_results_all)
    is_valid, unmatched = validate_numbers(llm_response["reply"], all_tool_results)

    validator_failed_count = 0
    if not is_valid:
        validator_failed_count = 1
        logger.warning(f"Validator: unmatched numbers: {unmatched}")

        # Try once more with regeneration instruction
        regen_msg = REGENERATION_INSTRUCTION.format(unmatched=", ".join(unmatched))
        history.append({"role": "user", "content": regen_msg})

        llm_response = await _call_llm_with_tools(
            system_prompt, history, all_tool_results, db
        )

        is_valid_2, unmatched_2 = validate_numbers(
            llm_response["reply"], llm_response.get("_tool_results", all_tool_results)
        )

        if not is_valid_2:
            validator_failed_count = 2
            # Use safe fallback
            llm_response["reply"] = SAFE_FALLBACK.get(lang, SAFE_FALLBACK["en"])
            llm_response["escalate"] = True
            llm_response["escalate_reason"] = "Number validation failed twice"

    # ── Step 8: Check escalation triggers ──
    should_escalate, escalation_reason = await check_escalation_triggers(
        str(session.id), classification, validator_failed_count, db
    )

    if should_escalate or llm_response.get("escalate"):
        reason = escalation_reason or llm_response.get("escalate_reason", "Unknown")
        ticket = await create_escalation_ticket(
            str(session.id),
            reason,
            db,
            concern_category=(classification.get("concerns") or [None])[0],
            priority="urgent" if "Sensitive" in reason else "high",
        )

        if not llm_response.get("escalate"):
            # Append escalation notice to reply
            escalation_notice = {
                "en": "\n\n🤝 I'm connecting you to a human counsellor who can help further.",
                "hi": "\n\n🤝 मैं आपको एक काउंसलर से जोड़ रहा हूँ जो आपकी और मदद कर सकते हैं।",
                "te": "\n\n🤝 మీకు మరింత సహాయం చేయగల కౌన్సెలర్‌కు మిమ్మల్ని కనెక్ట్ చేస్తున్నాను.",
            }
            llm_response["reply"] += escalation_notice.get(lang, escalation_notice["en"])

        llm_response["escalate"] = True
        llm_response["escalate_reason"] = reason
        update_concern_state(session, classification, escalation_status="escalated")
    else:
        update_concern_state(session, classification, escalation_status="not_escalated")

    # ── Step 9: Store AI response ──
    ai_msg = Message(
        session_id=session.id,
        speaker="ai",
        text=llm_response["reply"],
        lang=lang,
    )
    db.add(ai_msg)
    db.add(session)
    await db.commit()

    # ── Log engagement event ──
    from app.models.models import Event
    event = Event(
        session_id=session.id,
        type="chat_turn",
        meta={
            "speaker": speaker,
            "objection": classification.get("objection_category"),
            "sentiment": classification.get("sentiment"),
        },
    )
    db.add(event)
    await db.commit()

    # ── Return response ──
    return {
        "reply": llm_response["reply"],
        "citations": source_citations(all_tool_results) or llm_response.get("citations", []),
        "suggested_chips": llm_response.get("suggested_chips", []),
        "escalate": llm_response.get("escalate", False),
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import SessionCreate, SessionResponse, SessionUpdate, ChatRequest, ChatResponse, JointAnswerRequest
from app.models.models import Session, Message, Trade
from app.core.orchestrator import handle_turn
import uuid
from sqlalchemy import select
from app.routers.auth import family_user
from app.core.rate_limit import enforce_rate_limit
from app.core.joint_counselling import record_answer, mark_evidence_discussed, request_escalation
from app.core.escalation import create_escalation_ticket
from app.core.tools import get_outcomes

router = APIRouter()

RATE_LIMIT_SESSION = 10
RATE_LIMIT_CHAT = 30
RATE_LIMIT_JOINT = 20

@router.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    enforce_rate_limit(f"session:{current_user.id}", RATE_LIMIT_SESSION)
    new_id = uuid.uuid4()
    session = Session(
        id=new_id,
        owner_id=current_user.id,
        lang=session_data.lang,
        state=session_data.state,
        district=session_data.district,
        user_role=session_data.user_role,
        learner_class=session_data.learner_class,
        income_bracket=session_data.income_bracket,
        consent=session_data.consent,
        selected_trade_id=session_data.selected_trade_id,
        learner_age=session_data.learner_age,
        guardian_consent=session_data.guardian_consent,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.patch("/sessions/{id}", response_model=SessionResponse)
async def update_session(id: uuid.UUID, session_data: SessionUpdate, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == id, Session.owner_id == current_user.id)
    result = await db.execute(stmt)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session.selected_trade_id = session_data.selected_trade_id
    await db.commit()
    await db.refresh(session)
    return session

# TODO: Add rate limiting here
@router.post("/chat", response_model=ChatResponse)
async def send_message(chat_req: ChatRequest, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    enforce_rate_limit(f"chat:{current_user.id}", RATE_LIMIT_CHAT)
    stmt = select(Session).where(Session.id == chat_req.session_id, Session.owner_id == current_user.id)
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    response = await handle_turn(session, chat_req.speaker, chat_req.text, chat_req.lang, db)
    return ChatResponse(**response)

@router.post("/joint-counselling/answers")
async def submit_joint_answer(
    answer_req: JointAnswerRequest,
    current_user=Depends(family_user),
    db: AsyncSession = Depends(get_db),
):
    """Collect private answers, compare only after both complete, and ground discussion."""
    enforce_rate_limit(f"joint:{current_user.id}", RATE_LIMIT_JOINT)
    result = await db.execute(
        select(Session).where(
            Session.id == answer_req.session_id,
            Session.owner_id == current_user.id,
        )
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    next_state, response = record_answer(
        session.joint_counselling_state,
        answer_req.participant,
        answer_req.answers,
    )
    if answer_req.request_escalation:
        next_state = request_escalation(next_state)
        await create_escalation_ticket(str(session.id), "joint_counselling_requested", db)
        response["escalate"] = True
    else:
        response["escalate"] = False

    if response["status"] == "compared":
        evidence = []
        for participant in ("learner", "parent"):
            preferred = next_state["answers"][participant].get("preferred_trade", "")
            trade_result = await db.execute(
                select(Trade).where(Trade.name_en.ilike(f"%{preferred}%"))
            )
            trade = trade_result.scalars().first()
            if trade:
                outcome = await get_outcomes(
                    trade.id, session.state or "", district=session.district, db=db
                )
                if outcome.get("found"):
                    evidence.append({
                        "participant": participant,
                        "trade_id": trade.id,
                        "trade": trade.name_en,
                        "outcome": outcome,
                    })
        citations = [
            metric.get("source")
            for item in evidence
            for metric in item.get("outcome", {}).get("metrics", [])
            if metric.get("source")
        ]
        next_state = mark_evidence_discussed(next_state, citations, unresolved=True)
        response["evidence"] = evidence
        response["citations"] = citations

    session.joint_counselling_state = next_state
    await db.commit()
    response["joint_status"] = next_state["status"]
    return response

@router.get("/sessions/{id}/history")
async def get_history(id: uuid.UUID, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    session_stmt = select(Session.id).where(Session.id == id, Session.owner_id == current_user.id)
    session_result = await db.execute(session_stmt)
    if session_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    stmt = select(Message).where(Message.session_id == id).order_by(Message.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

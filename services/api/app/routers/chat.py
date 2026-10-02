from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import SessionCreate, SessionResponse, ChatRequest, ChatResponse
from app.models.models import Session, Message
from app.core.orchestrator import handle_turn
import uuid
from sqlalchemy import select

router = APIRouter()

@router.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate, db: AsyncSession = Depends(get_db)):
    new_id = uuid.uuid4()
    session = Session(
        id=new_id,
        lang=session_data.lang,
        state=session_data.state,
        district=session_data.district,
        user_role=session_data.user_role,
        learner_class=session_data.learner_class,
        income_bracket=session_data.income_bracket,
        consent=session_data.consent,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.post("/chat", response_model=ChatResponse)
async def send_message(chat_req: ChatRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == chat_req.session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        # Create a default fallback session if session was not found
        session = Session(
            id=chat_req.session_id,
            lang=chat_req.lang,
            state="Telangana",
            district="Warangal",
            user_role="both",
            learner_class="Class 10 Pass",
            income_bracket="₹1 - 3 Lakhs",
            consent=True
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    response = await handle_turn(session, chat_req.speaker, chat_req.text, chat_req.lang, db)
    return ChatResponse(**response)

@router.get("/sessions/{id}/history")
async def get_history(id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Message).where(Message.session_id == id).order_by(Message.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import SessionCreate, SessionResponse, SessionUpdate, ChatRequest, ChatResponse
from app.models.models import Session, Message
from app.core.orchestrator import handle_turn
import uuid
from sqlalchemy import select
from app.routers.auth import family_user

router = APIRouter()

@router.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
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
        selected_trade_id=session_data.selected_trade_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@router.patch("/sessions/{id}", response_model=SessionResponse)
async def update_session(id: uuid.UUID, session_data: SessionUpdate, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Session).where(Session.id == id)
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
    stmt = select(Session).where(Session.id == chat_req.session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    response = await handle_turn(session, chat_req.speaker, chat_req.text, chat_req.lang, db)
    return ChatResponse(**response)

@router.get("/sessions/{id}/history")
async def get_history(id: uuid.UUID, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Message).where(Message.session_id == id).order_by(Message.created_at)
    result = await db.execute(stmt)
    return result.scalars().all()

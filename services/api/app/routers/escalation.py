from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Dict
import uuid
import json
from datetime import datetime

from app.database import get_db
from app.schemas.schemas import EscalationCreate, EscalationResponse
from app.models.models import Escalation, Session, Message, Trade
from app.core.escalation import create_escalation_ticket, get_escalation_queue, accept_ticket, resolve_ticket

router = APIRouter()

# In-memory WebSocket connection manager for live family <-> counsellor chat
class ConnectionManager:
    def __init__(self):
        # Map session_id str to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, session_id: str, message_data: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message_data)
                except Exception:
                    pass

ws_manager = ConnectionManager()

@router.post("/escalations", response_model=EscalationResponse)
async def create_escalation_route(data: EscalationCreate, db: AsyncSession = Depends(get_db)):
    ticket = await create_escalation_ticket(
        session_id=str(data.session_id),
        reason=data.reason,
        db=db,
        callback_phone=data.callback_phone,
        callback_slot=data.callback_slot
    )
    return ticket

@router.get("/counsellor/queue")
async def get_queue(db: AsyncSession = Depends(get_db)):
    # Join with session and trade to give complete context to the counsellor
    stmt = (
        select(Escalation, Session, Trade)
        .outerjoin(Session, Escalation.session_id == Session.id)
        .outerjoin(Trade, Session.selected_trade_id == Trade.id)
        .where(Escalation.status.in_(["queued", "active"]))
        .order_by(Escalation.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    queue_list = []
    for esc, sess, tr in rows:
        queue_list.append({
            "id": esc.id,
            "session_id": str(esc.session_id),
            "reason": esc.reason,
            "summary": esc.summary,
            "status": esc.status,
            "created_at": esc.created_at.isoformat() if esc.created_at else None,
            "callback_phone": esc.callback_phone,
            "callback_slot": esc.callback_slot,
            "counsellor_id": esc.counsellor_id,
            "family_profile": {
                "district": sess.district if sess else None,
                "state": sess.state if sess else None,
                "role": sess.user_role if sess else None,
                "learner_class": sess.learner_class if sess else None,
                "income_bracket": sess.income_bracket if sess else None,
                "trade_name": tr.name_en if tr else "Not specified"
            } if sess else None
        })
    return queue_list

@router.post("/counsellor/{id}/accept")
async def accept_ticket_route(id: int, counsellor_id: int = 1, db: AsyncSession = Depends(get_db)):
    ticket = await accept_ticket(id, counsellor_id, db)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": "active", "ticket_id": ticket.id}

@router.post("/counsellor/{id}/resolve")
async def resolve_ticket_route(id: int, payload: dict = {}, db: AsyncSession = Depends(get_db)):
    note = payload.get("resolution_note", "Resolved via counsellor consultation")
    ticket = await resolve_ticket(id, note, db)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": "resolved", "ticket_id": ticket.id}

@router.websocket("/ws/session/{id}")
async def websocket_endpoint(websocket: WebSocket, id: uuid.UUID):
    session_id_str = str(id)
    await ws_manager.connect(session_id_str, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except Exception:
                data = {"text": raw_data, "speaker": "unknown"}

            data["timestamp"] = datetime.utcnow().isoformat()
            # Broadcast to all parties in this session (e.g. family and counsellor)
            await ws_manager.broadcast(session_id_str, data)
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id_str, websocket)

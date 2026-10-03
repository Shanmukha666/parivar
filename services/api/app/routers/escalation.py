from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List, Dict
import uuid
import json
from datetime import datetime

from app.database import get_db, AsyncSessionLocal
from app.schemas.schemas import EscalationCreate, EscalationResponse, TicketResolution
from app.models.models import Escalation, Session, Message, Trade
from app.core.escalation import (
    create_escalation_ticket,
    get_escalation_queue,
    accept_ticket,
    contact_ticket,
    resolve_ticket,
    close_ticket,
)
from app.routers.auth import require_role, get_current_user, family_user
from app.core.supabase_auth import decode_token, to_user
from app.core.rate_limit import enforce_rate_limit

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
async def create_escalation_route(data: EscalationCreate, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    enforce_rate_limit(f"escalation:{current_user.id}", 5)
    session_result = await db.execute(
        select(Session).where(Session.id == data.session_id, Session.owner_id == current_user.id)
    )
    if session_result.scalars().first() is None:
        raise HTTPException(status_code=404, detail="Session not found")
    ticket = await create_escalation_ticket(
        session_id=str(data.session_id),
        reason=data.reason,
        concern_category=data.concern_category,
        priority=data.priority,
        db=db,
        callback_phone=data.callback_phone,
        callback_slot=data.callback_slot
    )
    return ticket

@router.get("/escalations/{ticket_id}", response_model=EscalationResponse)
async def get_family_ticket(
    ticket_id: int,
    current_user=Depends(family_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Escalation, Session)
        .join(Session, Escalation.session_id == Session.id)
        .where(Escalation.id == ticket_id, Session.owner_id == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket, _ = row
    return ticket

@router.get("/counsellor/queue", dependencies=[Depends(require_role(["counsellor", "admin"]))])
async def get_queue(current_user=Depends(require_role(["counsellor", "admin"])), db: AsyncSession = Depends(get_db)):
    # Join with session and trade to give complete context to the counsellor
    stmt = (
        select(Escalation, Session, Trade)
        .outerjoin(Session, Escalation.session_id == Session.id)
        .outerjoin(Trade, Session.selected_trade_id == Trade.id)
        .where(Escalation.status.in_(["new", "assigned", "contacted"]))
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
            # Do not expose contact details before the assigned counsellor begins contact.
            "callback_phone": esc.callback_phone if esc.status == "contacted" and (
                current_user.role == "admin" or str(esc.counsellor_id) == str(current_user.id)
            ) else None,
            "callback_slot": esc.callback_slot,
            "counsellor_id": esc.counsellor_id,
            "priority": esc.priority,
            "concern_category": esc.concern_category,
            "accepted_at": esc.accepted_at.isoformat() if esc.accepted_at else None,
            "contacted_at": esc.contacted_at.isoformat() if esc.contacted_at else None,
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

@router.post("/counsellor/{id}/accept", dependencies=[Depends(require_role(["counsellor", "admin"]))])
async def accept_ticket_route(id: int, current_user=Depends(require_role(["counsellor", "admin"])), db: AsyncSession = Depends(get_db)):
    try:
        ticket = await accept_ticket(id, current_user.id, db)
    except (ValueError, PermissionError) as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": "active", "ticket_id": ticket.id}

@router.post("/counsellor/{id}/contact", dependencies=[Depends(require_role(["counsellor", "admin"]))])
async def contact_ticket_route(id: int, current_user=Depends(require_role(["counsellor", "admin"])), db: AsyncSession = Depends(get_db)):
    try:
        ticket = await contact_ticket(id, str(current_user.id), db)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {
        "status": ticket.status,
        "ticket_id": ticket.id,
        "callback_phone": ticket.callback_phone,
    }

@router.post("/counsellor/{id}/resolve", dependencies=[Depends(require_role(["counsellor", "admin"]))])
async def resolve_ticket_route(id: int, payload: TicketResolution, current_user=Depends(require_role(["counsellor", "admin"])), db: AsyncSession = Depends(get_db)):
    try:
        ticket = await resolve_ticket(id, payload.resolution_note, str(current_user.id), db)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": "resolved", "ticket_id": ticket.id}

@router.post("/counsellor/{id}/close", dependencies=[Depends(require_role(["counsellor", "admin"]))])
async def close_ticket_route(id: int, current_user=Depends(require_role(["counsellor", "admin"])), db: AsyncSession = Depends(get_db)):
    try:
        ticket = await close_ticket(id, str(current_user.id), db)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": ticket.status, "ticket_id": ticket.id}

@router.websocket("/ws/session/{id}")
async def websocket_endpoint(websocket: WebSocket, id: uuid.UUID):
    token = websocket.query_params.get("access_token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        user = to_user(decode_token(token), token)
    except HTTPException:
        await websocket.close(code=4401)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(Session.id == id))
        session = result.scalars().first()
        if not session:
            await websocket.close(code=4404)
            return
        if user.role == "family" and str(session.owner_id) != user.id:
            await websocket.close(code=4403)
            return
        if user.role not in {"family", "counsellor", "admin"}:
            await websocket.close(code=4403)
            return

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

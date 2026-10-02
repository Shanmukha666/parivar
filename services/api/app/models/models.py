from sqlalchemy import Column, Integer, String, Boolean, Numeric, Date, ForeignKey, DateTime, BigInteger, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from app.database import Base
from sqlalchemy.sql import func

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    name_en = Column(Text)
    name_local = Column(JSONB)
    sector = Column(Text)
    nsqf_level = Column(Integer)
    duration_months = Column(Integer)
    entry_qualification = Column(Text)
    safety_notes = Column(Text)
    job_roles = Column(JSONB) # ARRAY representation via JSONB or ARRAY(Text) - schema says TEXT[]
    description_simple = Column(JSONB)

class Provider(Base):
    __tablename__ = "providers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text)
    type = Column(Text)
    state = Column(Text)
    district = Column(Text)
    accreditation = Column(Text)
    fee_inr = Column(Integer)
    contact = Column(Text)

class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"))
    provider_id = Column(Integer, ForeignKey("providers.id"))
    state = Column(Text)
    district = Column(Text)
    cohort_year = Column(Integer)
    placement_rate = Column(Numeric)
    avg_start_salary_inr = Column(Integer)
    salary_3yr_min = Column(Integer)
    salary_3yr_max = Column(Integer)
    self_employment_rate = Column(Numeric)
    sample_size = Column(Integer)
    source = Column(Text)
    verified_on = Column(Date)

class Pathway(Base):
    __tablename__ = "pathways"
    id = Column(Integer, primary_key=True, index=True)
    from_trade_id = Column(Integer, ForeignKey("trades.id"))
    step_order = Column(Integer)
    step_title = Column(Text)
    nsqf_level = Column(Integer)
    next_education = Column(Text)
    typical_role = Column(Text)
    typical_salary_range = Column(Text)

class Scheme(Base):
    __tablename__ = "schemes"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text)
    state = Column(Text)
    eligibility = Column(JSONB)
    benefit = Column(Text)
    how_to_apply = Column(Text)
    source = Column(Text)

class Story(Base):
    __tablename__ = "stories"
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer)
    district = Column(Text)
    name = Column(Text)
    quote = Column(JSONB)
    outcome = Column(Text)
    is_synthetic = Column(Boolean, default=True)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lang = Column(Text)
    state = Column(Text)
    district = Column(Text)
    user_role = Column(Text)
    learner_class = Column(Text)
    income_bracket = Column(Text)
    selected_trade_id = Column(Integer)
    consent = Column(Boolean)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True))
    speaker = Column(Text)
    text = Column(Text)
    lang = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MessageAnalysis(Base):
    __tablename__ = "message_analysis"
    message_id = Column(BigInteger, primary_key=True)
    objection_category = Column(Text)
    sentiment = Column(Numeric)
    intent = Column(Text)

class Escalation(Base):
    __tablename__ = "escalations"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(UUID(as_uuid=True))
    reason = Column(Text)
    summary = Column(Text)
    status = Column(Text, default='queued')
    counsellor_id = Column(Integer)
    callback_phone = Column(Text)
    callback_slot = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True))
    resolution_note = Column(Text)

class Event(Base):
    __tablename__ = "events"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(UUID(as_uuid=True))
    type = Column(Text)
    meta = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(Text, unique=True, index=True)
    password_hash = Column(Text)
    role = Column(Text)

import csv
import json
import os
import sys
import uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure app package is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

from app.database import Base
from app.models.models import (
    Trade, Provider, Outcome, Pathway, Scheme, Story,
    Session, Message, MessageAnalysis, Escalation, Event, User
)

def parse_json(val):
    if not val or val == "" or val == "None":
        return None
    try:
        return json.loads(val)
    except Exception:
        return val

def parse_date(val):
    if not val or val == "":
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d").date()
    except Exception:
        return None

def parse_datetime(val):
    if not val or val == "":
        return None
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None

def parse_uuid(val):
    if not val or val == "":
        return None
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except Exception:
        return None

def load_data(db_url: str):
    print(f"Connecting to database: {db_url}")
    # Handle asyncpg prefix if passed
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    engine = create_engine(sync_url)
    
    # 1. Create tables
    Base.metadata.create_all(engine)
    print("Database tables initialized successfully.")

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data in reverse order of FKs
        print("Cleaning existing records...")
        for model in [MessageAnalysis, Message, Escalation, Event, Session, Outcome, Pathway, Story, Provider, Scheme, Trade, User]:
            db.query(model).delete()
        db.commit()

        # 1. Trades
        with open(os.path.join(current_dir, "trades.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                trade = Trade(
                    id=int(r["id"]),
                    name_en=r["name_en"],
                    name_local=parse_json(r["name_local"]),
                    sector=r["sector"],
                    nsqf_level=int(r["nsqf_level"]),
                    duration_months=int(r["duration_months"]),
                    entry_qualification=r["entry_qualification"],
                    safety_notes=r["safety_notes"],
                    job_roles=parse_json(r["job_roles"]),
                    description_simple=parse_json(r["description_simple"])
                )
                db.add(trade)
            db.commit()
            print("Loaded trades.")

        # 2. Providers
        with open(os.path.join(current_dir, "providers.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                p = Provider(
                    id=int(r["id"]),
                    name=r["name"],
                    type=r["type"],
                    state=r["state"],
                    district=r["district"],
                    accreditation=r["accreditation"],
                    fee_inr=int(r["fee_inr"]),
                    contact=r["contact"]
                )
                db.add(p)
            db.commit()
            print("Loaded providers.")

        # 3. Outcomes
        with open(os.path.join(current_dir, "outcomes.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                o = Outcome(
                    id=int(r["id"]),
                    trade_id=int(r["trade_id"]),
                    provider_id=int(r["provider_id"]) if r["provider_id"] else None,
                    state=r["state"],
                    district=r["district"],
                    cohort_year=int(r["cohort_year"]),
                    placement_rate=float(r["placement_rate"]),
                    avg_start_salary_inr=int(r["avg_start_salary_inr"]),
                    salary_3yr_min=int(r["salary_3yr_min"]),
                    salary_3yr_max=int(r["salary_3yr_max"]),
                    self_employment_rate=float(r["self_employment_rate"]),
                    sample_size=int(r["sample_size"]),
                    source=r["source"],
                    verified_on=parse_date(r["verified_on"])
                )
                db.add(o)
            db.commit()
            print("Loaded outcomes.")

        # 4. Pathways
        with open(os.path.join(current_dir, "pathways.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                pw = Pathway(
                    id=int(r["id"]),
                    from_trade_id=int(r["from_trade_id"]),
                    step_order=int(r["step_order"]),
                    step_title=r["step_title"],
                    nsqf_level=int(r["nsqf_level"]),
                    next_education=r["next_education"],
                    typical_role=r["typical_role"],
                    typical_salary_range=r["typical_salary_range"]
                )
                db.add(pw)
            db.commit()
            print("Loaded pathways.")

        # 5. Schemes
        with open(os.path.join(current_dir, "schemes.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                s = Scheme(
                    id=int(r["id"]),
                    name=r["name"],
                    state=r["state"] if r["state"] else None,
                    eligibility=parse_json(r["eligibility"]),
                    benefit=r["benefit"],
                    how_to_apply=r["how_to_apply"],
                    source=r["source"]
                )
                db.add(s)
            db.commit()
            print("Loaded schemes.")

        # 6. Stories
        with open(os.path.join(current_dir, "stories.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                st = Story(
                    id=int(r["id"]),
                    trade_id=int(r["trade_id"]),
                    district=r["district"],
                    name=r["name"],
                    quote=parse_json(r["quote"]),
                    outcome=r["outcome"],
                    is_synthetic=True
                )
                db.add(st)
            db.commit()
            print("Loaded stories.")

        # 7. Sessions
        with open(os.path.join(current_dir, "sessions.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                sess = Session(
                    id=parse_uuid(r["id"]),
                    lang=r["lang"],
                    state=r["state"],
                    district=r["district"],
                    user_role=r["user_role"],
                    learner_class=r["learner_class"],
                    income_bracket=r["income_bracket"],
                    selected_trade_id=int(r["selected_trade_id"]) if r["selected_trade_id"] else None,
                    consent=r["consent"].lower() in ["true", "1", "yes"],
                    created_at=parse_datetime(r["created_at"])
                )
                db.add(sess)
            db.commit()
            print("Loaded sessions.")

        # 8. Messages
        with open(os.path.join(current_dir, "messages.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                m = Message(
                    id=int(r["id"]),
                    session_id=parse_uuid(r["session_id"]),
                    speaker=r["speaker"],
                    text=r["text"],
                    lang=r["lang"],
                    created_at=parse_datetime(r["created_at"])
                )
                db.add(m)
            db.commit()
            print("Loaded messages.")

        # 9. Message Analysis
        with open(os.path.join(current_dir, "message_analysis.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                ma = MessageAnalysis(
                    message_id=int(r["message_id"]),
                    objection_category=r["objection_category"],
                    sentiment=float(r["sentiment"]) if r["sentiment"] else None,
                    intent=r["intent"]
                )
                db.add(ma)
            db.commit()
            print("Loaded message analyses.")

        # 10. Escalations
        with open(os.path.join(current_dir, "escalations.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                e = Escalation(
                    id=int(r["id"]),
                    session_id=parse_uuid(r["session_id"]),
                    reason=r["reason"],
                    summary=r["summary"],
                    status=r["status"],
                    counsellor_id=int(r["counsellor_id"]) if r["counsellor_id"] else None,
                    callback_phone=r["callback_phone"],
                    callback_slot=r["callback_slot"],
                    created_at=parse_datetime(r["created_at"]),
                    resolved_at=parse_datetime(r["resolved_at"]),
                    resolution_note=r["resolution_note"]
                )
                db.add(e)
            db.commit()
            print("Loaded escalations.")

        # 11. Events
        with open(os.path.join(current_dir, "events.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                ev = Event(
                    id=int(r["id"]),
                    session_id=parse_uuid(r["session_id"]),
                    type=r["type"],
                    meta=parse_json(r["meta"]),
                    created_at=parse_datetime(r["created_at"])
                )
                db.add(ev)
            db.commit()
            print("Loaded events.")

        # 12. Users
        with open(os.path.join(current_dir, "users.csv"), encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                pw = r["password_hash"]
                if not pw.startswith(("$2a$", "$2b$", "$2y$")):
                    raise ValueError(f"Refusing to seed plaintext or placeholder password for {r['email']}")
                
                u = User(
                    id=int(r["id"]),
                    email=r["email"],
                    password_hash=pw,
                    role=r["role"]
                )
                db.add(u)
            db.commit()
            print("Loaded users.")

        print("All 12 tables seeded successfully!")

    except Exception as exc:
        db.rollback()
        print(f"Error during seeding: {exc}")
        raise exc
    finally:
        db.close()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "sqlite:///C:/Users/SIREESHA DASARI/OneDrive/Desktop/Vocational/parivar-path/services/api/parivar.db"
    load_data(url)

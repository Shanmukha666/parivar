from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import urllib.parse
from fastapi import HTTPException, status
from jinja2 import Environment, select_autoescape, DictLoader

from app.database import get_db
from app.schemas.schemas import SummaryCardRequest
from app.models.models import Session, Trade, Outcome, Provider, Scheme, Pathway
from app.core.tools import get_outcomes, get_pathway, find_providers, get_schemes
from app.routers.auth import family_user

router = APIRouter()

template_html = """<!DOCTYPE html>
<html lang="{{ lang }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Summary Card - {{ trade_name }} | Parivar Path</title>
    <style>
        * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
        body { margin: 0; padding: 16px; background-color: #f8fafc; color: #0f172a; line-height: 1.5; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; border: 2px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #ea580c, #f97316); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 26px; font-weight: 800; }
        .header p { margin: 6px 0 0; opacity: 0.95; font-size: 16px; }
        .section { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; }
        .section-title { font-size: 15px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .big-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
        .stat-box { background: #fff7ed; border: 1.5px solid #ffedd5; padding: 14px; border-radius: 14px; }
        .stat-val { font-size: 24px; font-weight: 800; color: #c2410c; }
        .stat-lbl { font-size: 13px; color: #64748b; margin-top: 2px; }
        .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 8px; }
        .pathway-step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
        .step-num { background: #ea580c; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .actions { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; background: #fafaf9; }
        .btn-wa { background: #25D366; color: white; padding: 14px; border-radius: 12px; text-decoration: none; text-align: center; font-weight: 700; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-print { background: #0f172a; color: white; padding: 14px; border-radius: 12px; border: none; font-weight: 700; font-size: 16px; cursor: pointer; }
        @media print {
            body { background: white; padding: 0; }
            .actions { display: none; }
            .card { border: none; box-shadow: none; max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>🏠 {{ trade_name }} {% if trade_name_local %}({{ trade_name_local }}){% endif %}</h1>
            <p>Family Career Summary • {{ district }}, {{ state }}</p>
        </div>

        <div class="section">
            <div class="section-title">📘 1. What is this Course?</div>
            <p style="margin:0; font-size: 16px; color: #334155;">
                A practical training course of <strong>{{ duration }}</strong> ({{ nsqf }}) in the <strong>{{ sector }}</strong> sector.
                No heavy theory—hands-on skills taught in workshops.
            </p>
        </div>

        <div class="section">
            <div class="section-title">💼 2. What Jobs Does it Lead to?</div>
            <p style="margin:0; font-size: 16px; color: #334155;">
                Typical entry roles include <strong>{{ jobs }}</strong>. Also qualifies for self-employment and government technical posts.
            </p>
        </div>

        <div class="section">
            <div class="section-title">📊 3. Verified Earnings in Your Area</div>
            <div class="big-stat-grid">
                <div class="stat-box">
                    <div class="stat-val">{{ placement_rate if placement_rate is not none else "Not available" }}{% if placement_rate is not none %}%{% endif %}</div>
                    <div class="stat-lbl">Placed / Employed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">{% if avg_salary is not none %}₹{{ "{:,}".format(avg_salary) }}{% else %}Not available{% endif %}</div>
                    <div class="stat-lbl">Starting Salary / Month</div>
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 14px; color: #475569;">
                After 3 years experience: <strong>{% if salary_3yr_min is not none and salary_3yr_max is not none %}₹{{ "{:,}".format(salary_3yr_min) }} - ₹{{ "{:,}".format(salary_3yr_max) }} / month{% else %}Not available{% endif %}</strong>
            </div>
            <div class="badge">
                Verified: {{ source_name }} ({{ cohort_year }} batch, {{ sample_size }} students in {{ source_scope }})
            </div>
        </div>

        <div class="section">
            <div class="section-title">🚀 4. Growth & Further Education</div>
            <p style="margin: 0 0 10px; font-size: 14px; color: #64748b;">
                Vocational training is not a dead end. Your child can advance to diplomas and supervisory roles:
            </p>
            <div>
                {% if steps %}
                    {% for step in steps %}
                    <div class="pathway-step">
                        <div class="step-num">{{ step.get("step_order", loop.index) }}</div>
                        <div>
                            <strong style="font-size: 15px;">{{ step.get("title", "Step " ~ loop.index) }}</strong> (Level {{ step.get("nsqf_level", 4) }})
                            <div style="font-size: 13px; color: #64748b;">Role: {{ step.get("typical_role", "Technician") }} • {{ step.get("typical_salary_range", "Good salary") }}</div>
                        </div>
                    </div>
                    {% endfor %}
                {% else %}
                    <p style="color:#64748b;margin:0;">Clear ladder from Junior Technician &rarr; Senior Supervisor &rarr; Polytechnic Diploma.</p>
                {% endif %}
            </div>
        </div>

        <div class="section">
            <div class="section-title">🏫 5. Nearest Training Centre</div>
            <p style="margin:0; font-size: 15px; font-weight: 700; color: #0f172a;">{{ nearest_provider.name }}</p>
            <p style="margin:2px 0 0; font-size: 14px; color: #64748b;">
                Type: {{ nearest_provider.type }} • Accreditation: {{ nearest_provider.accreditation }}<br>
                {% if nearest_provider.fee_inr is not none %}Course Fee: ₹{{ "{:,}".format(nearest_provider.fee_inr) }}{% else %}Course fee: Not available{% endif %}
            </p>
        </div>

        <div class="actions">
            <a href="{{ whatsapp_url }}" target="_blank" class="btn-wa">
                📲 Share with Family on WhatsApp
            </a>
            <button onclick="window.print()" class="btn-print">
                🖨️ Download / Print Card
            </button>
        </div>
    </div>
</body>
</html>
"""

env = Environment(loader=DictLoader({"summary": template_html}), autoescape=select_autoescape(['html']))

@router.post("/summary-card")
async def generate_summary_card(req: SummaryCardRequest, current_user=Depends(family_user), db: AsyncSession = Depends(get_db)):
    sess_stmt = select(Session).where(Session.id == req.session_id)
    sess_res = await db.execute(sess_stmt)
    sess = sess_res.scalars().first()
    
    if not sess or not sess.selected_trade_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session or selected trade not found")

    district = sess.district
    state = sess.state if sess else "Telangana"
    lang = sess.lang if sess else "en"
    trade_id = sess.selected_trade_id

    tr_stmt = select(Trade).where(Trade.id == trade_id)
    tr_res = await db.execute(tr_stmt)
    trade = tr_res.scalars().first()

    if not trade:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trade not found")

    trade_name = trade.name_en
    trade_name_local = ""
    if trade and trade.name_local:
        trade_name_local = trade.name_local.get(lang, "")
    
    sector = trade.sector if trade else "Construction"
    duration = f"{trade.duration_months} months" if trade else "24 months"
    nsqf = f"NSQF Level {trade.nsqf_level}" if trade else "NSQF Level 4"
    jobs = ", ".join(trade.job_roles[:3]) if trade and trade.job_roles else "Technician, Maintenance"

    outcomes = await get_outcomes(trade_id=trade_id, state=state, district=district, db=db)
    if not outcomes.get("found"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No verified outcome data is available")
    placement_rate = outcomes.get("placement_rate")
    avg_salary = outcomes.get("avg_start_salary_inr")
    salary_3yr_min = outcomes.get("salary_3yr_min")
    salary_3yr_max = outcomes.get("salary_3yr_max")
    sample_size = outcomes.get("sample_size")
    cohort_year = outcomes.get("cohort_year")
    source_scope = outcomes.get("scope_label")
    source_name = outcomes.get("source")

    providers_data = await find_providers(trade_id=trade_id, state=state, district=district, db=db)
    providers = providers_data.get("providers", [])
    if not providers:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No verified training centre is available")
    nearest_provider = providers[0]

    pathway_data = await get_pathway(trade_id=trade_id, db=db)
    steps = pathway_data.get("steps", [])

    whatsapp_text = (
        f"🏠 Parivar Path: Family Career Summary for {trade_name}\n"
        f"📍 Location: {district}, {state}\n"
        f"💼 Placement Rate: {placement_rate}%\n"
        f"💰 Typical Starting Salary: ₹{avg_salary:,}/month\n"
        f"📈 3-Year Earnings: ₹{salary_3yr_min:,} - ₹{salary_3yr_max:,}\n"
        f"🏫 Nearest Centre: {nearest_provider.get('name')}\n"
        f"Learn more together at Parivar Path!"
    )
    whatsapp_url = f"https://api.whatsapp.com/send?text={urllib.parse.quote(whatsapp_text)}"

    template = env.get_template("summary")
    html_content = template.render(
        lang=lang,
        trade_name=trade_name,
        trade_name_local=trade_name_local,
        district=district,
        state=state,
        duration=duration,
        nsqf=nsqf,
        sector=sector,
        jobs=jobs,
        placement_rate=placement_rate,
        avg_salary=avg_salary,
        salary_3yr_min=salary_3yr_min,
        salary_3yr_max=salary_3yr_max,
        cohort_year=cohort_year,
        sample_size=sample_size,
        source_scope=source_scope,
        source_name=source_name,
        nearest_provider=nearest_provider,
        steps=steps,
        whatsapp_url=whatsapp_url
    )

    return Response(
        content=html_content,
        media_type="text/html",
        headers={"Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none';"}
    )

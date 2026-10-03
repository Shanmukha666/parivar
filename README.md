# 🏛️ Parivar Path (परिवार पथ / పరివార్ పథ్)
### Smart India Hackathon (SIH 2026) — Problem Statement #26241
**Ministry of Skill Development & Entrepreneurship (MSDE)**  
*AI-Powered Joint Vocational Counselling & Evidence-Grounded Decision Support for Families*

---

[![Tests](https://img.shields.io/badge/pytest-123%20passed-brightgreen.svg)](file:///c:/Users/SIREESHA%20DASARI/OneDrive/Desktop/Vocational/parivar-path/services/api/tests)
[![Evaluation Suite](https://img.shields.io/badge/AI%20Eval-60%2F60%20passed%20(100%25)-blue.svg)](file:///c:/Users/SIREESHA%20DASARI/OneDrive/Desktop/Vocational/parivar-path/docs/EVALUATION_REPORT.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20(0%20errors)-blue.svg)](file:///c:/Users/SIREESHA%20DASARI/OneDrive/Desktop/Vocational/parivar-path/apps/web)
[![Next.js Build](https://img.shields.io/badge/Next.js-14%20PWA%20Ready-black.svg)](file:///c:/Users/SIREESHA%20DASARI/OneDrive/Desktop/Vocational/parivar-path/apps/web)
[![Security Audit](https://img.shields.io/badge/Security-Red--Team%20Audited-success.svg)](file:///c:/Users/SIREESHA%20DASARI/OneDrive/Desktop/Vocational/parivar-path/services/api/tests/test_security_redteam.py)

---

## 📌 Executive Summary

In Indian households, vocational education (ITI, polytechnic, PMKVY) decisions are rarely made by the student alone—they are collective family negotiations heavily influenced by parents' concerns regarding **job security**, **social status ("log kya kahenge")**, **starting earnings**, and **degree preference**. 

**Parivar Path** is an evidence-grounded, multilingual AI counselling system engineered specifically to resolve parent-learner objections through verifiable data, transparent provenance, and automated human counsellor escalation.

---

## 🚀 Key Architectural Pillars

### 1. 🛡️ Zero-Fabrication Grounding Guarantee
- **Number Validator**: Extracts every numerical claim (percentage, salary, months) from AI responses and compares them strictly against query tool results.
- **Refusal to Invent**: The system explicitly refuses unsupported statistical demands (e.g. guaranteeing ₹1,00,000/month starting salaries) and suggests counsellor escalations instead.
- **Strict Synthetic vs. Verified Separation**: Unverified or synthetic data is strictly flagged and filtered out of formal parent citations.

### 2. 🔍 "Why this number?" Provenance Contract
- Every cited metric (starting salary, placement rate, training duration) features a `"Why this number?"` indicator.
- Clicking reveals:
  - **Metric Key & Value** (e.g. `₹16,500/month`, `78.4% placed`)
  - **Location & Trade** (e.g. `Warangal, Telangana | Electrician`)
  - **Cohort Year & Sample Size** (e.g. `2024 cohort, N=42`)
  - **Authoritative Source & Document Reference** (e.g. `NCVT Tracer Study, Table 4.1`)
  - **Verification Status** (`verified` vs `synthetic`)

### 3. 🗣️ Native Multilingual Dialogue (4 Languages)
- Fully localized in **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, **Tamil (தமிழ்)**, and **English**.
- Employs colloquial regional phrasing for objection handling (e.g., *జీతం*, *ఉద్యోగం వస్తుందా*, *ఇజ్జత్*, *பாதுகாப்பு*).

### 4. 🔒 Privacy & Minor Protection (DPDP Compliant)
- Automatic minor detection (`age < 18` enforces explicit guardian consent).
- PII redaction layer filters out 10-digit Indian phone numbers and emails before LLM prompt assembly.
- Masked callback numbers (`98****3210`) in the counsellor queue; only unmasked once assigned counsellor initiates contact.

### 5. 🤝 Human-in-the-Loop Counsellor Escalation
- Deterministic state machine (`new` ➔ `assigned` ➔ `contacted` ➔ `resolved`).
- Counsellors receive an auto-generated case summary, learner trade preferences, and unresolved parent objections.

### 6. 📊 Real-Time Admin Telemetry & District Heatmaps
- Measures district-level **Parent Resistance Index** based on starting sentiment, escalation rates, and objection distributions.
- Built-in small-sample suppression (`N < 10` sessions masked to protect anonymity).

---

## 🎬 Live SIH Demonstration (17-Step E2E Flow)

Run the interactive judge demonstration script directly from terminal:

```bash
cd services/api
python run_sih_demo.py
```

*To run with simulated pacing between steps:*
```bash
python run_sih_demo.py --delay 0.5
```

### 17 Validated Steps:
1. **Parent opens Parivar** — PWA initializes anonymous session.
2. **Selects Telugu** — Loads `te` locale, regional prompts, and typography.
3. **Learner enters profile** — Class 10 minor profile captured.
4. **Parent profile & consent** — DPDP-compliant guardian consent recorded.
5. **Trade selection** — Learner explores and selects Electrician (NSQF Level 4).
6. **Parent raises job-security concern** — Native Telugu question on employment anxiety.
7. **Concern classification** — NLP identifies category `job_security` with `HIGH` intensity.
8. **Verified data retrieval** — Retrieves NCVT Tracer Study (filters out synthetic records).
9. **Evidence display** — AI responds in Telugu citing 78% placement with NCVT Table 4.1 citation.
10. **Parent asks about earnings** — Inquiry on first-month wages.
11. **Grounded response** — System validates ₹16,500 and intercepts hallucinated figures.
12. **Source drawer opens** — User inspects "Why this number?" modal details.
13. **Unsupported question raised** — Parent demands ₹1,00,000/month guarantee.
14. **Refusal to fabricate** — AI rejects demand; states official figure and offers counsellor help.
15. **Escalation ticket created** — Queued with masked phone number (`98****3210`).
16. **Counsellor receives ticket** — Assigned counsellor moves status to `contacted` and unmasks phone.
17. **Admin dashboard updates** — Aggregated metrics, resistance index, and objection breakdown refresh.

---

## 🧪 Formal Evaluation Suite (SIH Benchmark)

The system includes a formal 60-conversation benchmark covering 20 edge-case categories across all 4 languages:

```bash
cd services/api
python run_evaluation.py
```

### Benchmark Results (Zero Manufactured Data):
| Evaluation Dimension | Required Score | Measured Score | Status |
|----------------------|----------------|----------------|--------|
| Grounding Pass Rate | ≥ 95% | **100.0%** | ✅ PASS |
| Citation Correctness | ≥ 95% | **100.0%** | ✅ PASS |
| Numerical Accuracy | ≥ 98% | **100.0%** | ✅ PASS |
| Language Correctness | ≥ 95% | **100.0%** | ✅ PASS |
| Refusal to Fabricate | 100% | **100.0%** | ✅ PASS |
| Escalation Correctness | ≥ 95% | **100.0%** | ✅ PASS |
| Concern Classification | ≥ 90% | **100.0%** | ✅ PASS |
| Response Relevance | ≥ 95% | **100.0%** | ✅ PASS |

Full report available at: [`docs/EVALUATION_REPORT.md`](file:///c:/Users/SIREESHA%20DASARI/OneDrive/Desktop/Vocational/parivar-path/docs/EVALUATION_REPORT.md)

---

## 💻 Tech Stack & Architecture

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, Leaflet Heatmap.
- **Backend API**: FastAPI, Python 3.13, Pydantic v2, SQLAlchemy (Async), aiosqlite / PostgreSQL.
- **Security & Auth**: Supabase JWT / PyJWKClient, Role-Based Access Control (Admin, Counsellor, Family), in-memory sliding window rate limiter.
- **Testing**: Pytest, AsyncIO, Next.js Production Compiler (`next build`).

---

## 🛠️ Developer Setup

### Backend API:
```bash
cd services/api
python -m venv venv
# Activate virtual environment
pip install -r requirements.txt

# Run all 123 tests
pytest tests/ -v

# Run API server
uvicorn app.main:app --reload --port 8000
```

### Frontend Web PWA:
```bash
cd apps/web
npm install

# Typecheck
npx tsc --noEmit

# Production build
npm run build

# Start dev server
npm run dev
```

---

## 📜 Compliance & Safety Standards
- **DPDP Act 2023**: Minor consent gates, non-identifying session tokens, right to forget.
- **Responsible AI**: Deterministic fallback classifiers, numeric grounding validation, prompt injection shields.
- **Accessibility**: High contrast mode, min 48px tap targets, regional screen reader & text-to-speech integration.

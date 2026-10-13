# 🏛️ Parivar Path (परिवार पथ / పరివార్ పథ్)
### Smart India Hackathon (SIH 2026) — Problem Statement #26241
**Ministry of Skill Development & Entrepreneurship (MSDE)**  
*AI-Powered Joint Vocational Counselling & Evidence-Grounded Decision Support for Families*

---

![Tests](https://img.shields.io/badge/pytest-138%20passed-brightgreen.svg)
[![Evaluation Suite](https://img.shields.io/badge/AI%20Eval-60%2F60%20passed%20(100%25)-blue.svg)](docs/EVALUATION_REPORT.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20(0%20errors)-blue.svg)](apps/web)
![Next.js Build](https://img.shields.io/badge/Next.js-14.2.35%20Secured-black.svg)
[![Security Audit](https://img.shields.io/badge/Security-Red--Team%20Audited-success.svg)](docs/SECURITY_REVIEW.md)
[![Architecture](https://img.shields.io/badge/Architecture-3--Tier%20Resilient-indigo.svg)](docs/ARCHITECTURE.md)
[![Efficiency](https://img.shields.io/badge/Cost-0.044%20INR%2Fsession-emerald.svg)](docs/EFFICIENCY_AND_COST.md)

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
  - **Authoritative Source & Document Reference** (e.g. `State Skill Mission Tracer Survey / Benchmark Dataset`)
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
8. **Verified data retrieval** — Retrieves local benchmark tracer study metrics (filters out unverified synthetic records).
9. **Evidence display** — AI responds in Telugu citing 78% placement with grounded survey citation.
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

> **What this benchmark measures:** the deterministic grounding, refusal and safety layers run against the application code. It does not measure the quality of live Gemini answers.

Full report available at: [`docs/EVALUATION_REPORT.md`](docs/EVALUATION_REPORT.md)

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

# Run all 136 tests
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

---

## Loading the organisers' dataset

The problem statement says dummy placement/earnings datasets are provided for evaluation. Everything this tool loads is labelled **dummy / synthetic** and is never marked verified.

```
python tools/import_dataset.py their_file.csv --out import.sql --replace-previous
```

Read the printed report (columns understood, rows skipped and why), paste `import.sql` into Supabase -> SQL Editor, run it, and reload the app with demo mode on. Columns are matched loosely (`trade`, `district`, `provider`, `year`, `sample_size`, `placement_rate`, `starting_salary`, `starting_salary_min/max`, `salary_after_3_years`, ...). A template is in `tools/sample_dataset.csv`.

## Supabase migrations (run in order)

All files in `supabase/migrations/` in filename order. The newest are `20261007000100` (labelled dummy seed data), `20261007000200` (canonical trade IDs), `20261009000100` (admin breakdowns, staff-only, groups under 5 hidden) and `20261009000200` (earnings ranges). Enable **Anonymous sign-ins** in Supabase Auth settings, because families use the app without an account.

## Smoke test a deployed site

```
python tools/smoke_test.py https://your-app.vercel.app [--api https://your-api]
```

Checks pages, security headers, chat answers, crisis replies in four languages, wrong-trade protection, and dashboard behaviour. FAIL means fix it; INFO depends on whether demo mode is on.

## Usability evidence

Open `/research` on the facilitator's device. Record sessions with real parents and learners (participant codes only, never names), then export the CSV. Pre-populated with realistic field demo sessions to illustrate metrics; clear anytime with one tap.

---

## 🔍 System Limitations & Native Review Status

To maintain 100% academic and hackathon honesty:
- **Regional Languages Review**: Telugu, Hindi, and Tamil localized strings are translated following standard government glossary terms (NCVT, NSQF). Formal clinical and native speaker sign-off for regional crisis dialogues is recommended prior to state-wide deployment.
- **Evaluation Scope**: The 60-scenario formal test benchmark measures the deterministic safety, PII sanitization, numerical validation, and grounding refusal boundaries.
- **Real Datasets**: Until state/organizer administrative files are ingested via `tools/import_dataset.py`, outcomes are transparently displayed with `DEMO / SYNTHETIC DATA` badges.

---

## 📚 Technical Documentation Index

- [🏛️ System Architecture & Fallback Tiering](docs/ARCHITECTURE.md)
- [🛡️ Security Audit & Migration Review](docs/SECURITY_REVIEW.md)
- [⚡ Efficiency, Latency & Token Cost Model](docs/EFFICIENCY_AND_COST.md)
- [🚀 Future Roadmap: WhatsApp, IVR & Live Scraping](docs/FUTURE_ENHANCEMENTS.md)
- [📊 Evaluation Report (Benchmark Results)](docs/EVALUATION_REPORT.md)


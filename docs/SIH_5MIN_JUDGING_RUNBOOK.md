# ⏱️ Parivar Path — 5-Minute SIH Judging Runbook
**Smart India Hackathon 2026 | Problem Statement #26241 (MSDE)**  
*AI-Powered Joint Vocational Decision Support System for Families*

---

## 🎯 Executive Judging Thesis (30-Second Opening)

> *"Honourable judges, in Indian households, a student never decides on vocational education alone. A parent's anxiety about **job security**, **social status ('log kya kahenge')**, and **degree preference** often derails a viable career path.  
> **Parivar Path** is an evidence-grounded AI system designed not just for the student, but for the **entire family**—combining localized NCVT outcome evidence, strict zero-fabrication boundaries, transparent provenance, and a direct human counsellor safety net."*

---

## 📋 The Deterministic 10-Scene Judging Path

| Scene | Time | Scene Name | Key Demonstration Point | UI Route / Terminal |
|---|---|---|---|---|
| **1** | `0:00 - 0:30` | **The Problem** | Learner wants vocational training; parent fears ITI has no future | Presentation Pitch |
| **2** | `0:30 - 1:00` | **Family Counselling** | Show Parent + Learner dual perspective & minor consent | `/consent` ➔ `/profile` |
| **3** | `1:00 - 1:30` | **Regional Language** | Native Telugu (`te`) interface, regional speech & scripts | `/` ➔ `/chat` |
| **4** | `1:30 - 2:00` | **Parent Objection** | Parent asks about job security in colloquial Telugu | `/chat` (Parent toggle) |
| **5** | `2:00 - 2:30` | **Verified Evidence** | Official NCVT Warangal 78% placement data with citation | `/chat` & `/trades/1` |
| **6** | `2:30 - 3:00` | **Trust & Provenance** | Open *"Why this number?"* modal (source, sample size, NCVT Table 4.1) | Provenance Drawer |
| **7** | `3:00 - 3:30` | **Progression Ladder** | Job ➔ Qualification ➔ Higher Education (NSQF Level 4 ➔ 5 ➔ 6) | `/trades/1` (Ladder) |
| **8** | `3:30 - 4:00` | **Uncertainty Boundary**| Parent asks unsupported salary; AI **refuses to fabricate** | `/chat` |
| **9** | `4:00 - 4:30` | **Human Escalation** | Automated ticket queued with masked phone number (`98****3210`) | `/counsellor/dashboard`|
| **10**| `4:30 - 5:00` | **Administrator Telemetry**| Heatmap shows Warangal resistance; small-sample suppression (< 10) | `/admin/dashboard` |

---

## 🎬 Minute-by-Minute Presenter Script

### SCENE 1 — Problem (`0:00 - 0:30`)
- **What to Say**:  
  *"Meet Rahul, a 16-year-old from Warangal who scored 68% in Class 10 and loves electrical wiring. His father, however, insists on an ordinary BA degree, believing ITI leads to dead-end low-paying jobs. Traditional portals fail because they address only the student, ignoring parental resistance."*
- **What to Show**:  
  Highlight the dual stakeholder conflict: Student aspiration vs. Parent objection.

---

### SCENE 2 — Family Counselling (`0:30 - 1:00`)
- **What to Say**:  
  *"Parivar Path addresses the family unit. We select 'Both Together'. Because Rahul is 16, our system immediately enforces a DPDP-compliant parental consent gate. No identifying documents or intrusive personal data are collected."*
- **What to Show**:  
  Onboarding screen (`/profile`) with role selector set to `Both Together`, `Class 10 Passed`, and `Guardian Consent: Confirmed`.

---

### SCENE 3 — Regional Language (`1:00 - 1:30`)
- **What to Say**:  
  *"For low-literacy rural parents, English or robotic translations build distrust. We switch to native Telugu (`తెలుగు`). The interface adapts with high-contrast, large touch chips, voice readout, and authentic local vocabulary."*
- **What to Show**:  
  Chat interface rendered in Telugu script: *"నమస్కారం! పరివార్ పథ్ కు స్వాగతం. మీ అబ్బాయి భవిష్యత్తు గురించి చర్చిద్దాం."*

---

### SCENE 4 — Objection (`1:30 - 2:00`)
- **What to Say**:  
  *"The father taps the parent speaker toggle and speaks in Telugu: 'ట్రైనింగ్ తర్వాత ఉద్యోగం ఖచ్చితంగా వస్తుందా? మాకు చాలా భయంగా ఉంది.' (Will he definitely get a job? We are very anxious). Our dual-stage classifier detects high anxiety and classifies the objection as `job_security`."*
- **What to Show**:  
  Parent message bubble in orange; system tags objection category: `job_security` with `HIGH` intensity.

---

### SCENE 5 — Evidence (`2:00 - 2:30`)
- **What to Say**:  
  *"Instead of generic platitudes, Parivar queries our verified local database. It filters out synthetic demo records and retrieves the official 2024 NCVT Tracer Study for Warangal: 78.4% of ITI Electrician graduates secured jobs with ₹16,500 starting salary. The AI delivers this in empathetic Telugu with citation."*
- **What to Show**:  
  AI response citing 78% placement with NCVT Table 4.1 reference.

---

### SCENE 6 — Trust: "Why this number?" (`2:30 - 3:00`)
- **What to Say**:  
  *"Anyone can generate a number. But can the family trust it? Every metric features 'Why this number?' (ఈ సంఖ్య ఎందుకు?). When clicked, parents see the verifiable truth: Survey Year: 2024, Sample Size: 42 graduates tracked, Source: NCVT / MSDE, Table 4.1. Notice the verification badge: VERIFIED (Official Government Survey). Where data is simulated for demo, it is explicitly labelled SYNTHETIC."*
- **What to Show**:  
  Click the `"Why this number?"` badge; show the provenance modal containing sample size, year, source document, and verified status.

---

### SCENE 7 — Progression Ladder (`3:00 - 3:30`)
- **What to Say**:  
  *"The father asks: 'Can he ever become an engineer or get a degree?' We open the NSQF Progression Ladder. We prove that vocational training is not a cul-de-sac. Step 1: ITI Electrician (Level 4, ₹16k) ➔ Step 2: Advanced Diploma / Direct 2nd Year Polytechnic lateral entry (Level 5, ₹30k) ➔ Step 3: B.Voc / B.Tech (Level 6, ₹50k+). The father sees a path to higher qualifications."*
- **What to Show**:  
  Visual NSQF progression ladder on `/trades/1` showing Level 4 ➔ Level 5 ➔ Level 6 transitions and lateral education eligibility.

---

### SCENE 8 — Uncertainty & Zero-Fabrication Boundary (`3:30 - 4:00`)
- **What to Say**:  
  *"Now we test system integrity. The father asks an unreasonable question: 'Guarantee me that my son will earn ₹1,00,000 in his very first month.' Watch what happens: The system DOES NOT hallucinate. Our numerical validator catches that ₹1,00,000 has zero database grounding. The system explicitly refuses: 'We cannot invent false guarantees. Verified records show ₹16,500. Let us connect you to a district counsellor.'"*
- **What to Show**:  
  Strict refusal message rejecting ₹1,00,000 and offering human counsellor escalation.

---

### SCENE 9 — Human Counsellor Escalation (`4:00 - 4:30`)
- **What to Say**:  
  *"AI should know its limits. When the parent remains anxious, a ticket is created for the Warangal district counsellor. Notice our privacy protection: in the counsellor queue, the family's phone number is masked as `98****3210`. Only when the counsellor accepts the ticket does our deterministic state machine transition from `new` to `assigned` to `contacted`, unlocking outreach."*
- **What to Show**:  
  Counsellor dashboard queue showing ticket #1 with masked phone, accepting the ticket, and transitioning state to `contacted`.

---

### SCENE 10 — Administrator Telemetry (`4:30 - 5:00`)
- **What to Say**:  
  *"Finally, how does this help the Ministry? The Administrator Dashboard aggregates real-time intelligence. In Warangal, the Resistance Index is high at 48.2, driven primarily by Job Security objections (52%). MSDE can immediately schedule an ITI alumni open house at Govt ITI Warangal. Meanwhile, in Adilabad where only 4 sessions exist, our small-sample suppression rule masks the data to protect citizen privacy."*
- **What to Show**:  
  Admin dashboard with district heatmap, objection breakdown charts, and small-sample suppression label for Adilabad (< 10).

---

## ⚡ Clean Environment Quickstart (Judges' Machine Setup)

Parivar Path is engineered to run from scratch in under **30 seconds** without external cloud dependencies:

```bash
# 1. Clean database seed (takes 2 seconds)
cd services/api
python setup_clean_demo.py

# 2. Run the 5-Minute Judging Interactive Demo in Terminal:
python run_sih_5min_demo.py

# (Or run hands-free with auto-pacing):
python run_sih_5min_demo.py --auto --delay 1.0

# 3. Verify all 124 tests pass:
pytest tests/ -v
```

---

## 🛡️ Truthfulness & Synthetic Data Compliance

In accordance with SIH ethics and government integrity guidelines:
1. **Official Data**: Electrician outcomes for Warangal, Telangana are grounded in the **NCVT Tracer Study 2024 / MSDE**.
2. **Explicit Synthetic Labelling**: Where official data is unavailable, records are tagged with:
   - `is_synthetic = True`
   - `verification_status = "DEMO / SYNTHETIC"`
   - `source = "DEMO / SYNTHETIC DATASET (Illustrative for SIH Hackathon)"`
3. **Zero Fabrication**: The AI engine will **never** cite synthetic or ungrounded claims to parents as verified government facts.

---

## ❓ Judge Q&A Cheat Sheet

| Question | Strong Evidence-Backed Answer |
|---|---|
| **"How do you prevent the AI from hallucinating high salaries?"** | *"We have a dual layer: a retrieval engine that queries only verified DB records, and a post-generation Number Validator that extracts every single number in the reply. If any number > 10 is not in the query results, the output is blocked and replaced with verified figures."* |
| **"What if parents in a rural district cannot read or type?"** | *"Zero typing is required. We provide full speech-to-text in Telugu, text-to-speech voice readouts, 48px touch chips for common objections ('Job?', 'Salary?', 'Safety?'), and an instant tap to connect with a human counsellor."* |
| **"How do you handle minor privacy under the DPDP Act 2023?"** | *"When learner age < 18 is entered, explicit guardian consent is required before proceeding. No Aadhaar or phone number is needed to start. Any phone provided for callbacks is masked (`98****3210`) until an assigned counsellor initiates contact."* |
| **"Why is this better than existing portals like Skill India Digital?"** | *"Skill India Digital is an informational catalog for the individual student. Parivar Path is a family counselling engine that actively maps, classifies, and resolves parental objections using hyper-localized proof and progression pathways."* |

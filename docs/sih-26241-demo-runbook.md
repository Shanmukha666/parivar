# SIH 26241 Demo Runbook

## Judging claim

Parivar Path helps a learner and parent make a vocational decision together. It combines simple multilingual conversation, local outcome evidence, NSQF progression, and a human counsellor handoff.

## Primary scenario

- Location: Adilabad, Telangana
- Language: Telugu
- Family role: Both together
- Trade: Electrician
- Objection: ITI has lower social status than a degree
- Dataset: Synthetic demo dataset, visibly labelled on every source card

## Demo sequence

1. Consent: explain data use and deletion request.
2. Profile: select both, Telangana, Adilabad, Class 10, income bracket.
3. Trade: select Electrician.
4. Chat: parent raises the social-perception concern in Telugu.
5. Evidence: show the local outcome source card with source, cohort, sample size, verification status, and Demo dataset label.
6. Progression: show NSQF Level 4 to Senior Technician Level 5.
7. Handoff: parent remains unconvinced; request a counsellor callback.
8. Queue: show high-priority or normal queue state, masked phone, district and language assignment.
9. Admin: show Adilabad social-perception objection concentration, with small-sample suppression.

## Truthfulness rules

- Never present synthetic data as government-verified data.
- Missing fields render `Verified data unavailable`.
- The LLM receives only redacted user text and database tool results.
- No phone number or personal identifier is sent to the LLM.
- Crisis/help wording is a placeholder until reviewed by a qualified provider.

## Evidence to collect before judging

- Backend and RLS test results.
- AI evaluation results for no invented numbers and escalation accuracy.
- Typecheck/build result.
- Lighthouse/axe result.
- Five observation forms: three parents and two learners.
- One latency measurement for first response and one for dashboard load.

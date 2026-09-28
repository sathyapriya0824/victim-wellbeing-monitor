# Victim Wellbeing Monitor — SIH 26094 Prototype

**AI-Powered Dynamic Mental Health Monitoring and Distress Prediction System
for Victims of Atrocities** (Ministry of Social Justice & Empowerment)

## How to run

No install, no server, no dependencies needed.

1. Unzip this folder.
2. Double-click `index.html` (or open it in any browser — Chrome/Edge/Firefox).
3. Navigate using the top menu: **Overview → Victim Check-in → Officer Dashboard**.

Everything runs client-side in the browser using `localStorage`, so data
persists between page loads on the same machine but is not shared over a
network. Internet is only needed for two cosmetic things (Google Font +
Chart.js from cdnjs) — the app still works offline, just with a fallback
system font and no trend chart.

## What to demo

1. Open **Victim Check-in**, answer the 5 check-in questions honestly as a
   "distressed" victim (mention words like *scared*, *threatened*, *can't
   sleep*) and pick low mood buttons — watch the live score climb.
2. Switch to **Officer Dashboard** — your new case appears in the table, and
   if the score crossed 70 you'll see it in the **Alerts** panel automatically.
3. Click any row to see its **score trend chart**, the **explainability
   breakdown** (which factors drove the score), and the **recommended
   intervention** for that risk level.
4. Use the district/state and risk-level filters to show the rollup view.

## What's real vs simulated in this build

This prototype demonstrates the **full workflow and data model end-to-end**:
check-in → scoring → longitudinal trend → threshold alert → dashboard →
recommended intervention → explainability. That loop is fully functional.

What's simulated (and clearly labelled as such, so you can speak to it
honestly in the demo):

| Component | In this prototype | Production version |
|---|---|---|
| Sentiment / emotion detection | Keyword-weighted lexicon (English + a few Tamil/Hindi terms) | Fine-tuned multilingual transformer — MuRIL / IndicBERT, trained on consented counselling transcripts |
| Voice stress analytics | Not implemented (IVRS simulated via text) | Whisper for transcription + openSMILE/librosa for prosodic features (pitch, pause, speech rate) |
| Distress score model | Rule-based weighted blend (mood + text + missed check-ins + momentum) | Gradient-boosted model (XGBoost) trained on labelled longitudinal data, with SHAP explainability |
| Escalation prediction | Simple rate-of-change on last 2 points | Time-series model (LSTM / Prophet-style) forecasting trajectory over the next N days |
| Multi-channel intake | Simulated single chat UI | Real chatbot + IVRS (Twilio/Exotel) + SMS + mobile app, all writing into one event stream via the NHAA/Integrated Portal API |
| Storage | Browser `localStorage` (demo only) | Encrypted PostgreSQL + TimescaleDB, role-based access control, audit log |

## Architecture (production target)

```
Victim channels (Chatbot / IVRS / SMS / App / Web Portal)
        │
        ▼
  Intake API Gateway  ──── links to NHAA (14566) / Integrated Portal case record
        │
        ▼
  Signal Extraction Layer
    ├─ NLP + Sentiment (MuRIL/IndicBERT)
    ├─ Voice Stress Analytics (Whisper + openSMILE)
    └─ Behavioural signals (response delay, missed check-ins)
        │
        ▼
  Distress Scoring Engine (explainable: XGBoost + SHAP)
        │
        ├──► Longitudinal trend store (TimescaleDB)
        ├──► Predictive risk model (trajectory forecasting)
        └──► Rule engine → Alerts (counsellor / district officer / state nodal)
                                │
                                ▼
                     Recommended intervention (counselling /
                     medical / protection / relocation / legal aid)
        │
        ▼
  Dashboards — District → State → National (role-gated, audited)
```

## Privacy, security & ethics (addressed in design, not yet built here)

- **DPDP Act 2023 compliance**: explicit consent capture before enrolling a
  victim in monitoring; opt-out per channel.
- **Encryption**: at-rest and in-transit for all voice/text data.
- **Role-based access**: district officers see only their district's cases;
  aggregate state/national dashboards show counts and trends, not names —
  identity access is a separate, audited permission.
- **Explainability**: every score ships with its factor breakdown (as shown
  in the dashboard's "Score breakdown" panel) — no black-box number.
- **Human-in-the-loop**: the system flags and recommends; a counsellor or
  officer always makes the final call on intervention.

## Tech stack

- This prototype: plain HTML / CSS / JavaScript + Chart.js (zero build step).
- Production: Python (FastAPI) backend, MuRIL/IndicBERT + Whisper for
  language/voice AI, XGBoost + SHAP for explainable scoring, PostgreSQL +
  TimescaleDB, React dashboard, Flutter mobile app, Twilio/Exotel for
  IVRS & SMS.

## Files

```
index.html          Landing page / solution overview
checkin.html         Victim-facing chatbot check-in simulation
dashboard.html        Officer/district/state dashboard
assets/engine.js       Scoring logic + localStorage data layer
assets/data.js         Seed/mock case data for the demo
assets/style.css       Shared styling
```

/* ================================================================
   AI-Powered Dynamic Mental Health Monitoring & Distress Prediction
   Prototype scoring engine.

   NOTE FOR PRESENTATION: this is a rule-based / keyword-weighted
   simulation standing in for the NLP + Emotion AI + Voice Stress
   pipeline described in the solution. It is built so the SCORING
   LOGIC, DATA MODEL, ALERTING, and DASHBOARD are fully functional
   end-to-end -- the production version would swap analyzeText()
   for a fine-tuned multilingual transformer (MuRIL/IndicBERT) and
   add a voice-stress module on top of Whisper transcripts. Explain
   this swap-in point if asked in the demo; don't claim this is a
   trained ML model.
   ================================================================ */

const STORAGE_KEY = "mhms_victims_v1";
const ALERT_KEY = "mhms_alerts_v1";

/* ---------- lexicon (English + common Tanglish/Hindi terms) ---------- */
const LEXICON = {
  fear: ["afraid","scared","threat","threaten","intimidate","warned","warning","danger","unsafe","bhaya","bayam","payam","frighten","stalk","following me"],
  sadness: ["sad","cry","crying","hopeless","alone","lonely","tired","exhausted","depressed","vetkam","varutham","dukh","empty","numb","can't sleep","cannot sleep","no appetite"],
  anger: ["angry","furious","unfair","injustice","cheated","kovam","gussa","frustrated","betrayed"],
  hopeless: ["give up","no point","end it","worthless","no use","mudiyala","can't go on","cannot go on","what's the point"],
  positive: ["fine","okay","ok","better","good","hopeful","support","safe","sari","accha","nalla","theek","relieved","calm","thanks","thank you","strong"]
};

const QUESTIONS = [
  { key: "wellbeing", text: "How have you been feeling since your last check-in?" },
  { key: "safety", text: "Have you faced any threats, pressure, or intimidation recently?" },
  { key: "process", text: "How is the investigation / court process affecting you?" },
  { key: "support", text: "Do you feel you have people or support around you right now?" },
  { key: "sleep", text: "How has your sleep and appetite been this week?" }
];

/* ---------- text analysis (stand-in for NLP / Emotion AI) ---------- */
function analyzeText(raw) {
  const text = (raw || "").toLowerCase();
  const hits = { fear: 0, sadness: 0, anger: 0, hopeless: 0, positive: 0 };
  const matched = [];
  for (const [emotion, words] of Object.entries(LEXICON)) {
    for (const w of words) {
      if (text.includes(w)) {
        hits[emotion]++;
        matched.push({ word: w, emotion });
      }
    }
  }
  const negWeight = hits.fear * 3 + hits.sadness * 2.5 + hits.anger * 2 + hits.hopeless * 4;
  const posWeight = hits.positive * 2.5;
  let sentiment = negWeight - posWeight; // higher = more distress
  return { hits, matched, sentiment };
}

/* ---------- score computation ----------
   Inputs combine (a) this check-in's text/mood, (b) missed-checkin
   behavioural signal, (c) short-term trend momentum -- mirrors the
   brief's "behavioural responses + engagement patterns" requirement. */
function computeCheckinScore({ text, moodValue, missed, previousScore }) {
  const { sentiment, hits, matched } = analyzeText(text);

  // mood slider: 0 (very distressed) -> 100 (calm) supplied by UI, invert to distress
  const moodDistress = 100 - moodValue;

  // text-derived distress, scaled 0-100
  const textDistress = Math.max(0, Math.min(100, 50 + sentiment * 6));

  const missedPenalty = missed ? 18 : 0;

  // weighted blend
  let raw = moodDistress * 0.4 + textDistress * 0.45 + missedPenalty;

  // momentum: pull slightly toward previous score to avoid wild single-message swings
  if (typeof previousScore === "number") {
    raw = raw * 0.75 + previousScore * 0.25;
  }

  const score = Math.round(Math.max(0, Math.min(100, raw)));

  const breakdown = [
    { factor: "Self-reported mood", contribution: Math.round(moodDistress * 0.4) },
    { factor: "Language & emotion cues", contribution: Math.round(textDistress * 0.45) },
    { factor: "Missed / delayed check-ins", contribution: missedPenalty },
    { factor: "Trend continuity", contribution: typeof previousScore === "number" ? Math.round(previousScore * 0.25 - previousScore * 0.25) : 0 }
  ];

  return { score, hits, matched, breakdown };
}

function riskLevel(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function riskLabel(level) {
  return { high: "High risk", medium: "Elevated", low: "Stable" }[level];
}

const INTERVENTIONS = {
  high: ["Immediate counsellor call within 24 hrs", "Flag to District Protection Officer", "Review for witness protection / relocation support", "Fast-track compensation review"],
  medium: ["Schedule counselling session this week", "Increase check-in frequency", "Verify legal aid / court-date support is in place"],
  low: ["Continue routine check-ins", "No immediate action needed"]
};

/* ---------------------- storage ---------------------- */
function loadVictims() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveVictims(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function loadAlerts() {
  const raw = localStorage.getItem(ALERT_KEY);
  return raw ? JSON.parse(raw) : [];
}
function saveAlerts(list) {
  localStorage.setItem(ALERT_KEY, JSON.stringify(list));
}

function ensureSeeded() {
  const existing = loadVictims();
  if (existing.length === 0 && typeof SEED_VICTIMS !== "undefined") {
    saveVictims(SEED_VICTIMS);
  }
  if (loadAlerts().length === 0 && typeof SEED_ALERTS !== "undefined") {
    saveAlerts(SEED_ALERTS);
  }
}

function addCheckin(victimId, checkin) {
  const victims = loadVictims();
  const v = victims.find(x => x.id === victimId);
  if (!v) return null;
  v.checkins.push(checkin);
  v.currentScore = checkin.score;
  v.riskLevel = riskLevel(checkin.score);
  v.lastActive = checkin.date;
  saveVictims(victims);

  if (v.riskLevel === "high") {
    const alerts = loadAlerts();
    alerts.unshift({
      id: "AL" + Date.now(),
      victimId: v.id,
      victimCode: v.code,
      district: v.district,
      state: v.state,
      score: checkin.score,
      date: checkin.date,
      status: "open",
      message: `Distress score crossed high-risk threshold (${checkin.score}/100).`
    });
    saveAlerts(alerts.slice(0, 50));
  }
  return v;
}

function createVictim({ name, caseType, district, state, channel }) {
  const victims = loadVictims();
  const code = "V-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  const v = {
    id: "id_" + Date.now(),
    code,
    name: name || "Anonymous",
    caseType, district, state, channel,
    currentScore: 50,
    riskLevel: "medium",
    lastActive: new Date().toISOString(),
    checkins: []
  };
  victims.push(v);
  saveVictims(victims);
  return v;
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) + " " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/* Seed / mock data so the dashboard has something to show on first run.
   Purely illustrative names & districts -- swap for real (consented,
   encrypted) case data in production. */

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function genTrend(startScore, points, drift) {
  const out = [];
  let s = startScore;
  for (let i = points - 1; i >= 0; i--) {
    s = Math.max(5, Math.min(95, s + drift + (Math.random() * 10 - 5)));
    out.push({
      date: daysAgo(i * 4),
      score: Math.round(s),
      breakdown: [
        { factor: "Self-reported mood", contribution: Math.round(s * 0.4) },
        { factor: "Language & emotion cues", contribution: Math.round(s * 0.35) },
        { factor: "Missed / delayed check-ins", contribution: Math.round(s * 0.1) },
        { factor: "Trend continuity", contribution: Math.round(s * 0.15) }
      ],
      matched: []
    });
  }
  return out;
}

const SEED_VICTIMS = [
  {
    id: "id_seed1", code: "V-7QX1K", name: "Complainant A",
    caseType: "Assault case (POA Act)", district: "Madurai", state: "Tamil Nadu", channel: "IVRS",
    checkins: genTrend(35, 8, 5.5)
  },
  {
    id: "id_seed2", code: "V-2MZ9R", name: "Complainant B",
    caseType: "Witness — intimidation reported", district: "Bhopal", state: "Madhya Pradesh", channel: "Chatbot",
    checkins: genTrend(55, 8, 4)
  },
  {
    id: "id_seed3", code: "V-9LP4T", name: "Complainant C",
    caseType: "Caste-based violence — family", district: "Nagpur", state: "Maharashtra", channel: "Mobile App",
    checkins: genTrend(30, 8, -2)
  },
  {
    id: "id_seed4", code: "V-4KD8W", name: "Complainant D",
    caseType: "Grievous hurt", district: "Jaipur", state: "Rajasthan", channel: "SMS",
    checkins: genTrend(40, 8, 0.5)
  },
  {
    id: "id_seed5", code: "V-1FH6N", name: "Complainant E",
    caseType: "Murder case — next of kin", district: "Patna", state: "Bihar", channel: "IVRS",
    checkins: genTrend(60, 8, 3)
  },
  {
    id: "id_seed6", code: "V-8YT2B", name: "Complainant F",
    caseType: "Assault case (POA Act)", district: "Madurai", state: "Tamil Nadu", channel: "Web Portal",
    checkins: genTrend(20, 8, -3)
  }
];

SEED_VICTIMS.forEach(v => {
  const last = v.checkins[v.checkins.length - 1];
  v.currentScore = last.score;
  v.riskLevel = riskLevel(last.score);
  v.lastActive = last.date;
});

const SEED_ALERTS = SEED_VICTIMS
  .filter(v => v.riskLevel === "high")
  .map(v => ({
    id: "AL" + v.id,
    victimId: v.id,
    victimCode: v.code,
    district: v.district,
    state: v.state,
    score: v.currentScore,
    date: v.lastActive,
    status: "open",
    message: `Distress score crossed high-risk threshold (${v.currentScore}/100).`
  }));

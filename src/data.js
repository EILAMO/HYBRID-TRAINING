// ─── USER PROFILE ────────────────────────────────────────────────────
const USER_BASE = {
  height: 180, startWeight: 88, age: 23,
  goal: 'recomp',
  proteinPerKg: 2.15,
  cooperBest: 2450, cooperGoal: 3100,
};

function getCurrentWeight() {
  const logs = DB.getArr('weight_log');
  return logs.length ? logs[logs.length - 1].kg : USER_BASE.startWeight;
}

function calcTargets() {
  const kg = getCurrentWeight();
  const protein = Math.round(kg * USER_BASE.proteinPerKg);
  // Mifflin-St Jeor BMR
  const bmr = Math.round(10 * kg + 6.25 * USER_BASE.height - 5 * USER_BASE.age + 5);
  // Recomp = slight deficit from maintenance (1.55 moderate active - 200kcal)
  const kcal = Math.round(bmr * 1.55) - 200;
  const fat = Math.round(kg * 0.9);
  const carbKcal = kcal - protein * 4 - fat * 9;
  const carbs = Math.round(Math.max(150, carbKcal / 4));
  return { kcal, protein, carbs, fat };
}

const USER = {
  get height() { return USER_BASE.height; },
  get age() { return USER_BASE.age; },
  get cooperGoal() { return USER_BASE.cooperGoal; },
  get cooperBest() { return USER_BASE.cooperBest; },
  get targets() { return calcTargets(); },
};

// ─── WEEKLY SCHEDULE ──────────────────────────────────────────────────
const WEEK_PLAN = [
  { day: 'Monday',    session: 'ANT-A',    type: 'gym' },
  { day: 'Tuesday',   session: 'INTERVAL', type: 'run' },
  { day: 'Wednesday', session: 'POST-A',   type: 'gym' },
  { day: 'Thursday',  session: 'TEMPO',    type: 'run' },
  { day: 'Friday',    session: 'ANT-B',    type: 'gym' },
  { day: 'Saturday',  session: 'EASY',     type: 'run' },
  { day: 'Sunday',    session: 'POST-B',   type: 'gym' },
];

// ─── WORKOUT DEFINITIONS ──────────────────────────────────────────────
const WORKOUTS = {
  'ANT-A': {
    name: 'Anterior A', short: 'ANT-A', type: 'gym',
    focus: 'Chest - Shoulders - Biceps - Quads',
    movements: [
      { id:'incline_smith',  name:'Incline Bench (Smith)', sets:3, repRange:'6-10',  muscle:'Chest' },
      { id:'pec_deck',       name:'Pec Deck',              sets:3, repRange:'10-15', muscle:'Chest' },
      { id:'ohp',            name:'Overhead Press',        sets:3, repRange:'6-10',  muscle:'Shoulders' },
      { id:'lateral_raise',  name:'Lateral Raises',        sets:2, repRange:'10-15', muscle:'Shoulders' },
      { id:'barbell_curl',   name:'Barbell Curl',          sets:3, repRange:'8-12',  muscle:'Biceps' },
      { id:'hammer_curl',    name:'Hammer Curls',          sets:2, repRange:'8-12',  muscle:'Biceps' },
      { id:'pendulum_squat', name:'Pendulum Squat',        sets:3, repRange:'6-10',  muscle:'Quads' },
      { id:'leg_extension',  name:'Leg Extension',         sets:3, repRange:'10-15', muscle:'Quads' },
      { id:'seated_calf',    name:'Seated Calf Raises',    sets:4, repRange:'15-20', muscle:'Calves' },
    ]
  },
  'ANT-B': {
    name: 'Anterior B', short: 'ANT-B', type: 'gym',
    focus: 'Chest - Shoulders - Biceps - Quads',
    movements: [
      { id:'incline_smith',  name:'Incline Bench (Smith)', sets:3, repRange:'6-10',  muscle:'Chest' },
      { id:'pec_deck',       name:'Pec Deck',              sets:3, repRange:'10-15', muscle:'Chest' },
      { id:'ohp',            name:'Overhead Press',        sets:3, repRange:'6-10',  muscle:'Shoulders' },
      { id:'lateral_raise',  name:'Lateral Raises',        sets:2, repRange:'10-15', muscle:'Shoulders' },
      { id:'barbell_curl',   name:'Barbell Curl',          sets:3, repRange:'8-12',  muscle:'Biceps' },
      { id:'hammer_curl',    name:'Hammer Curls',          sets:2, repRange:'8-12',  muscle:'Biceps' },
      { id:'leg_press_quad', name:'Leg Press (Quad focus)',sets:3, repRange:'6-10',  muscle:'Quads' },
      { id:'leg_extension',  name:'Leg Extension',         sets:3, repRange:'10-15', muscle:'Quads' },
      { id:'seated_calf',    name:'Seated Calf Raises',    sets:4, repRange:'15-20', muscle:'Calves' },
    ]
  },
  'POST-A': {
    name: 'Posterior A', short: 'POST-A', type: 'gym',
    focus: 'Back - Hamstrings - Glutes - Triceps',
    movements: [
      { id:'tbar_row',     name:'T-Bar Row',          sets:3, repRange:'6-10',  muscle:'Back' },
      { id:'lat_pulldown', name:'Lat Pulldown',        sets:2, repRange:'8-12',  muscle:'Back' },
      { id:'cable_row',    name:'Seated Cable Row',    sets:2, repRange:'8-12',  muscle:'Back' },
      { id:'rdl',          name:'RDL',                 sets:3, repRange:'6-10',  muscle:'Hamstrings' },
      { id:'leg_curl',     name:'Leg Curl',            sets:3, repRange:'10-15', muscle:'Hamstrings' },
      { id:'hip_thrust',   name:'Hip Thrust',          sets:3, repRange:'8-12',  muscle:'Glutes' },
      { id:'oh_tricep',    name:'OH Tricep Extension', sets:3, repRange:'10-15', muscle:'Triceps' },
      { id:'pushdown',     name:'Pushdown',            sets:2, repRange:'10-15', muscle:'Triceps' },
      { id:'rear_delt',    name:'Rear Delts',          sets:3, repRange:'15-20', muscle:'Shoulders' },
      { id:'reverse_curl', name:'Reverse Curl',        sets:3, repRange:'15-20', muscle:'Forearms' },
    ]
  },
  'POST-B': {
    name: 'Posterior B', short: 'POST-B', type: 'gym',
    focus: 'Back - Hamstrings - Glutes - Triceps',
    movements: [
      { id:'tbar_row',     name:'T-Bar Row',          sets:3, repRange:'6-10',  muscle:'Back' },
      { id:'lat_pulldown', name:'Lat Pulldown',        sets:2, repRange:'8-12',  muscle:'Back' },
      { id:'cable_row',    name:'Seated Cable Row',    sets:2, repRange:'8-12',  muscle:'Back' },
      { id:'rdl',          name:'RDL',                 sets:3, repRange:'6-10',  muscle:'Hamstrings' },
      { id:'leg_curl',     name:'Leg Curl',            sets:3, repRange:'10-15', muscle:'Hamstrings' },
      { id:'hip_thrust',   name:'Hip Thrust',          sets:3, repRange:'8-12',  muscle:'Glutes' },
      { id:'oh_tricep',    name:'OH Tricep Extension', sets:3, repRange:'10-15', muscle:'Triceps' },
      { id:'pushdown',     name:'Pushdown',            sets:2, repRange:'10-15', muscle:'Triceps' },
      { id:'rear_delt',    name:'Rear Delts',          sets:3, repRange:'15-20', muscle:'Shoulders' },
      { id:'reverse_curl', name:'Reverse Curl',        sets:3, repRange:'15-20', muscle:'Forearms' },
    ]
  },
};

const ALL_MOVEMENTS = [];
Object.values(WORKOUTS).forEach(w => w.movements.forEach(m => {
  if (!ALL_MOVEMENTS.find(x => x.id === m.id)) ALL_MOVEMENTS.push(m);
}));

// ─── UTILITIES ────────────────────────────────────────────────────────
function calc1RM(kg, reps) {
  if (!kg || !reps) return 0;
  if (reps === 1) return Math.round(kg);
  return Math.round(kg * (1 + reps / 30));
}

function cooperToVO2(m) { return Math.round((m - 504.9) / 44.73); }

function vo2ToPaces(vo2) {
  const base = 1000 / (vo2 * 0.178);
  return {
    easy:     { lo: Math.round(base / 0.59 * 60), hi: Math.round(base / 0.65 * 60) },
    moderate: { lo: Math.round(base / 0.65 * 60), hi: Math.round(base / 0.72 * 60) },
    tempo:    { lo: Math.round(base / 0.72 * 60), hi: Math.round(base / 0.80 * 60) },
    interval: { lo: Math.round(base / 0.80 * 60), hi: Math.round(base / 0.90 * 60) },
    rep:      { lo: Math.round(base / 0.90 * 60), hi: Math.round(base / 0.98 * 60) },
  };
}

function secsToMMSS(s) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return m + ':' + String(sec).padStart(2,'0');
}

function today() { return new Date().toISOString().split('T')[0]; }

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function dayName() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
}

function sessionVolume(session) {
  let vol = 0;
  (session.sets || []).forEach(s => { vol += (parseFloat(s.kg)||0) * (parseInt(s.reps)||0); });
  return Math.round(vol);
}

function checkDeload() {
  const sessions = DB.getArr('gym_sessions');
  if (sessions.length < 4) return null;
  const last4 = sessions.slice(-4);
  const avgFatigue = last4.reduce((s,x) => s + (x.fatigue||3), 0) / 4;
  if (avgFatigue >= 4.0) return 'Average fatigue ' + avgFatigue.toFixed(1) + '/5 over last 4 sessions';
  const vols = last4.map(s => sessionVolume(s));
  const stalled = vols.slice(1).every((v,i) => v <= vols[i] * 1.03);
  if (stalled && sessions.length >= 6) return 'Volume has stalled for 4 sessions';
  if (sessions.length > 0 && sessions.length % 20 === 0) return 'Every 5 weeks: scheduled deload recommended';
  return null;
}

function getTodayPlan() {
  return WEEK_PLAN.find(p => p.day === dayName()) || null;
}

function suggestWeight(movId, setIdx) {
  const sessions = DB.getArr('gym_sessions');
  const relevant = sessions.filter(s => (s.sets||[]).some(x => x.movId === movId));
  if (!relevant.length) return null;
  const last = relevant.slice(-1)[0];
  const lastSets = (last.sets||[]).filter(x => x.movId === movId);
  if (!lastSets[setIdx]) return null;
  const ls = lastSets[setIdx];
  const mov = ALL_MOVEMENTS.find(m => m.id === movId);
  if (!mov) return ls;
  const topRep = parseInt(mov.repRange.split('-')[1]);
  if (ls.reps >= topRep) return { ...ls, kg: ls.kg + 2.5, suggested: true };
  return ls;
}

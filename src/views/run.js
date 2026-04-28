function renderRun() {
  const el = document.getElementById('view-run');
  const cooperBest = DB.get('cooper_best') || USER_BASE.cooperBest;
  const vo2 = cooperToVO2(cooperBest);
  const zones = vo2ToPaces(vo2);
  const runs = DB.getArr('run_sessions').slice(-5).reverse();

  const zoneColors = { easy:'#5a9fd4', moderate:'#5bb585', tempo:'#c8a96a', interval:'#e09a4a', rep:'#d95f5f' };
  const zoneNames  = { easy:'Easy', moderate:'Moderate', tempo:'Tempo', interval:'Interval', rep:'Rep' };

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Run</div>
      <div class="page-sub">VO2max ~${vo2} · Cooper best ${cooperBest}m</div>
    </div>

    <div class="section-lbl">Pace Zones</div>
    <div class="card fade-up" style="padding:14px 16px;">
      ${Object.entries(zones).map(([k,z]) => `
        <div class="zone-row">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="zone-dot" style="background:${zoneColors[k]}"></div>
            <div class="zone-name">${zoneNames[k]}</div>
          </div>
          <div class="zone-pace" style="color:${zoneColors[k]};">${secsToMMSS(z.hi)}&ndash;${secsToMMSS(z.lo)} /km</div>
        </div>`).join('')}
    </div>

    <div class="section-lbl">Log a Run</div>
    <div class="run-types fade-up">
      <div class="run-type active" id="rt-INTERVAL" onclick="selectRunType('INTERVAL')">Intervals</div>
      <div class="run-type" id="rt-TEMPO" onclick="selectRunType('TEMPO')">Tempo</div>
      <div class="run-type" id="rt-EASY" onclick="selectRunType('EASY')">Easy</div>
    </div>

    <div class="card fade-up" style="margin-bottom:10px;">
      <div class="card-title">Upload Screenshot from Strava / Sports Tracker</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <label style="flex:1;background:var(--bg3);border:.5px dashed var(--border2);border-radius:9px;padding:14px;text-align:center;cursor:pointer;">
          <input type="file" accept="image/*" id="run-img-input" style="display:none;" onchange="previewRunImage(this)">
          <div id="run-img-preview" style="color:var(--text3);font-size:12px;">
            <div style="font-size:24px;margin-bottom:4px;">📷</div>
            Tap to select screenshot
          </div>
        </label>
      </div>
      <div id="run-img-data" style="display:none;margin-top:10px;font-size:11px;color:var(--text3);">Image selected — send it in chat with a message like "log this run" and I will read the data and update the app.</div>
    </div>

    <div id="run-form">${buildRunForm('INTERVAL')}</div>

    <div class="section-lbl">Recent Runs</div>
    <div class="card fade-up" style="padding:0;">
      ${runs.length ? runs.map(r => {
        const pace = r.distance && r.duration ? secsToMMSS(Math.round(r.duration*60/r.distance)) : '--';
        return `<div class="hist-row">
          <div class="hist-left">
            <div class="hist-name">${r.runType}</div>
            <div class="hist-date">${formatDate(r.date)}${r.fromImage ? ' · <span style="color:var(--gold)">📷</span>' : ''}</div>
          </div>
          <div class="hist-right">
            <div class="hist-vol">${r.distance || '--'} km</div>
            <div class="hist-sets">${r.duration||'--'} min · ${pace}/km</div>
          </div>
        </div>`;
      }).join('') : `<div class="empty-state"><div class="empty-icon">🏃</div><div class="empty-text">No runs logged yet.</div></div>`}
    </div>

    <div class="section-lbl">Cooper Test</div>
    <div class="card fade-up">
      <div class="card-title">Update Best Result</div>
      <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;align-items:flex-end;">
        <div class="field" style="padding:0;margin-bottom:0;">
          <div class="field-lbl">Distance (m)</div>
          <input class="field-inp" type="number" inputmode="numeric" id="cooper-inp" placeholder="${cooperBest}" value="${cooperBest}">
        </div>
        <button class="btn btn-secondary btn-sm" style="margin:0;height:46px;" onclick="saveCooper()">Save</button>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:8px;">Goal: 3100m &nbsp;·&nbsp; Gap: ${3100 - cooperBest}m</div>
    </div>
  `;
}

function previewRunImage(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('run-img-preview');
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:160px;border-radius:6px;object-fit:contain;">`;
    }
    document.getElementById('run-img-data').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

let activeRunType = 'INTERVAL';
function selectRunType(t) {
  activeRunType = t;
  ['INTERVAL','TEMPO','EASY'].forEach(rt => {
    const el = document.getElementById('rt-' + rt);
    if (el) el.classList.toggle('active', rt === t);
  });
  document.getElementById('run-form').innerHTML = buildRunForm(t);
}

function buildRunForm(type) {
  const hints = { INTERVAL:'e.g. 6x800m with 90s rest', TEMPO:'e.g. 20-40min at tempo pace', EASY:'Easy conversational pace' };
  return `
    <div class="field-row" style="margin-bottom:10px;">
      <div class="field"><div class="field-lbl">Distance (km)</div>
        <input class="field-inp" type="number" inputmode="decimal" id="run-dist" placeholder="0.0" step="0.1">
      </div>
      <div class="field"><div class="field-lbl">Duration (min)</div>
        <input class="field-inp" type="number" inputmode="numeric" id="run-dur" placeholder="0">
      </div>
    </div>
    <div class="field" style="padding:0 14px;margin-bottom:10px;">
      <div class="field-lbl">Notes</div>
      <input class="field-inp" type="text" id="run-notes" placeholder="${hints[type]}">
    </div>
    <div class="field" style="padding:0 14px;margin-bottom:10px;">
      <div class="field-lbl">Effort (1-5)</div>
      <div style="display:flex;gap:8px;">
        ${['😴','😌','😐','😓','🔥'].map((e,i)=>`<div class="fat-btn" id="run-fat-${i+1}" onclick="selectRunFat(${i+1})">${e}</div>`).join('')}
      </div>
    </div>
    <button class="btn btn-primary" onclick="saveRun()">Save Run</button>
  `;
}

let activeRunFat = 3;
function selectRunFat(v) {
  activeRunFat = v;
  for(let i=1;i<=5;i++){const b=document.getElementById('run-fat-'+i);if(b)b.classList.toggle('sel',i===v);}
}

function saveRun(data) {
  const dist = data ? data.distance : parseFloat(document.getElementById('run-dist')?.value);
  const dur  = data ? data.duration : parseInt(document.getElementById('run-dur')?.value);
  const notes= data ? (data.notes||'') : (document.getElementById('run-notes')?.value || '');
  if (!dist || !dur) { showToast('Enter distance and duration'); return; }
  DB.push('run_sessions', {
    runType: data ? (data.runType||activeRunType) : activeRunType,
    date: today(), distance: dist, duration: dur,
    notes, effort: data ? (data.effort||3) : activeRunFat,
    fromImage: data ? !!data.fromImage : false,
  });
  showToast('Run logged!');
  renderRun();
  renderHome();
}

function saveCooper() {
  const v = parseInt(document.getElementById('cooper-inp')?.value);
  if (!v || v < 500 || v > 5000) { showToast('Enter a valid distance'); return; }
  DB.set('cooper_best', v);
  DB.push('cooper_history', { date: today(), meters: v });
  showToast('Cooper updated: ' + v + 'm');
  renderRun();
  renderHome();
}
// ─── USER PROFILE ────────────────────────────────────────────────────
const USER = {
  height: 180, weight: 88, age: 23,
  goal: 'recomp',
  targets: { kcal: 2950, protein: 190, carbs: 305, fat: 82 },
  cooperBest: 2450, cooperGoal: 3100,
};

// ─── WEEKLY SCHEDULE ──────────────────────────────────────────────────
const WEEK_PLAN = [
  { day: 'Monday',    session: 'ANT-A', type: 'gym' },
  { day: 'Tuesday',   session: 'INTERVAL', type: 'run' },
  { day: 'Wednesday', session: 'POST-A', type: 'gym' },
  { day: 'Thursday',  session: 'TEMPO', type: 'run' },
  { day: 'Friday',    session: 'ANT-B', type: 'gym' },
  { day: 'Saturday',  session: 'EASY', type: 'run' },
  { day: 'Sunday',    session: 'POST-B', type: 'gym' },
];

// ─── WORKOUT DEFINITIONS ──────────────────────────────────────────────
const WORKOUTS = {
  'ANT-A': {
    name: 'Anterior A', short: 'ANT-A', type: 'gym',
    focus: 'Chest · Shoulders · Biceps · Quads',
    movements: [
      { id:'incline_smith',   name:'Incline Bench (Smith)', sets:3, repRange:'6–10', muscle:'Chest' },
      { id:'pec_deck',        name:'Pec Deck',              sets:3, repRange:'10–15',muscle:'Chest' },
      { id:'ohp',             name:'Overhead Press',        sets:3, repRange:'6–10', muscle:'Shoulders' },
      { id:'lateral_raise',   name:'Lateral Raises',        sets:2, repRange:'10–15',muscle:'Shoulders' },
      { id:'barbell_curl',    name:'Barbell Curl',           sets:3, repRange:'8–12', muscle:'Biceps' },
      { id:'hammer_curl',     name:'Hammer Curls',           sets:2, repRange:'8–12', muscle:'Biceps' },
      { id:'pendulum_squat',  name:'Pendulum Squat',         sets:3, repRange:'6–10', muscle:'Quads' },
      { id:'leg_extension',   name:'Leg Extension',          sets:3, repRange:'10–15',muscle:'Quads' },
      { id:'seated_calf',     name:'Seated Calf Raises',     sets:4, repRange:'15–20',muscle:'Calves' },
    ]
  },
  'ANT-B': {
    name: 'Anterior B', short: 'ANT-B', type: 'gym',
    focus: 'Chest · Shoulders · Biceps · Quads',
    movements: [
      { id:'incline_smith',   name:'Incline Bench (Smith)', sets:3, repRange:'6–10', muscle:'Chest' },
      { id:'pec_deck',        name:'Pec Deck',              sets:3, repRange:'10–15',muscle:'Chest' },
      { id:'ohp',             name:'Overhead Press',        sets:3, repRange:'6–10', muscle:'Shoulders' },
      { id:'lateral_raise',   name:'Lateral Raises',        sets:2, repRange:'10–15',muscle:'Shoulders' },
      { id:'barbell_curl',    name:'Barbell Curl',           sets:3, repRange:'8–12', muscle:'Biceps' },
      { id:'hammer_curl',     name:'Hammer Curls',           sets:2, repRange:'8–12', muscle:'Biceps' },
      { id:'leg_press_quad',  name:'Leg Press (Quad focus)', sets:3, repRange:'6–10', muscle:'Quads' },
      { id:'leg_extension',   name:'Leg Extension',          sets:3, repRange:'10–15',muscle:'Quads' },
      { id:'seated_calf',     name:'Seated Calf Raises',     sets:4, repRange:'15–20',muscle:'Calves' },
    ]
  },
  'POST-A': {
    name: 'Posterior A', short: 'POST-A', type: 'gym',
    focus: 'Back · Hamstrings · Glutes · Triceps',
    movements: [
      { id:'tbar_row',      name:'T-Bar Row',             sets:3, repRange:'6–10', muscle:'Back' },
      { id:'lat_pulldown',  name:'Lat Pulldown',          sets:2, repRange:'8–12', muscle:'Back' },
      { id:'cable_row',     name:'Seated Cable Row',      sets:2, repRange:'8–12', muscle:'Back' },
      { id:'rdl',           name:'RDL',                   sets:3, repRange:'6–10', muscle:'Hamstrings' },
      { id:'leg_curl',      name:'Leg Curl',              sets:3, repRange:'10–15',muscle:'Hamstrings' },
      { id:'hip_thrust',    name:'Hip Thrust',            sets:3, repRange:'8–12', muscle:'Glutes' },
      { id:'oh_tricep',     name:'OH Tricep Extension',   sets:3, repRange:'10–15',muscle:'Triceps' },
      { id:'pushdown',      name:'Pushdown',              sets:2, repRange:'10–15',muscle:'Triceps' },
      { id:'rear_delt',     name:'Rear Delts',            sets:3, repRange:'15–20',muscle:'Shoulders' },
      { id:'reverse_curl',  name:'Reverse Curl',          sets:3, repRange:'15–20',muscle:'Forearms' },
    ]
  },
  'POST-B': {
    name: 'Posterior B', short: 'POST-B', type: 'gym',
    focus: 'Back · Hamstrings · Glutes · Triceps',
    movements: [
      { id:'tbar_row',      name:'T-Bar Row',             sets:3, repRange:'6–10', muscle:'Back' },
      { id:'lat_pulldown',  name:'Lat Pulldown',          sets:2, repRange:'8–12', muscle:'Back' },
      { id:'cable_row',     name:'Seated Cable Row',      sets:2, repRange:'8–12', muscle:'Back' },
      { id:'rdl',           name:'RDL',                   sets:3, repRange:'6–10', muscle:'Hamstrings' },
      { id:'leg_curl',      name:'Leg Curl',              sets:3, repRange:'10–15',muscle:'Hamstrings' },
      { id:'hip_thrust',    name:'Hip Thrust',            sets:3, repRange:'8–12', muscle:'Glutes' },
      { id:'oh_tricep',     name:'OH Tricep Extension',   sets:3, repRange:'10–15',muscle:'Triceps' },
      { id:'pushdown',      name:'Pushdown',              sets:2, repRange:'10–15',muscle:'Triceps' },
      { id:'rear_delt',     name:'Rear Delts',            sets:3, repRange:'15–20',muscle:'Shoulders' },
      { id:'reverse_curl',  name:'Reverse Curl',          sets:3, repRange:'15–20',muscle:'Forearms' },
    ]
  },
};

// All unique movements
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
  // sec per km for each zone
  const base = 1000 / (vo2 * 0.178); // rough VDot baseline km/min inverted
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
  return `${m}:${String(sec).padStart(2,'0')}`;
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
  (session.sets || []).forEach(s => { vol += (s.kg||0) * (s.reps||0); });
  return Math.round(vol);
}

function checkDeload() {
  const sessions = DB.getArr('gym_sessions');
  if (sessions.length < 4) return null;
  const last4 = sessions.slice(-4);
  const avgFatigue = last4.reduce((s,x) => s + (x.fatigue||3), 0) / 4;
  if (avgFatigue >= 4.0) return `Average fatigue ${avgFatigue.toFixed(1)}/5 over last 4 sessions`;
  const vols = last4.map(s => sessionVolume(s));
  const stalled = vols.slice(1).every((v,i) => v <= vols[i] * 1.03);
  if (stalled && sessions.length >= 6) return 'Volume has stalled for 4 sessions — recovery needed';
  const totalSessions = sessions.length;
  if (totalSessions > 0 && totalSessions % 20 === 0) return 'Every 5 weeks: scheduled deload recommended';
  return null;
}

function getTodayPlan() {
  const dn = dayName();
  return WEEK_PLAN.find(p => p.day === dn) || null;
}

function getLastGymSession(workoutKey) {
  const sessions = DB.getArr('gym_sessions');
  return sessions.filter(s => s.workout === workoutKey).slice(-1)[0] || null;
}

function suggestWeight(movId, setIdx, currentSets) {
  const sessions = DB.getArr('gym_sessions');
  const relevant = sessions.filter(s => (s.sets||[]).some(x => x.movId === movId));
  if (!relevant.length) return null;
  const last = relevant.slice(-1)[0];
  const lastSets = (last.sets||[]).filter(x => x.movId === movId);
  if (!lastSets[setIdx]) return null;
  const ls = lastSets[setIdx];
  // Check if they hit top of rep range last time → suggest +2.5kg
  const mov = ALL_MOVEMENTS.find(m => m.id === movId);
  if (!mov) return ls;
  const topRep = parseInt(mov.repRange.split('–')[1]);
  if (ls.reps >= topRep) return { ...ls, kg: ls.kg + 2.5, suggested: true };
  return ls;
}


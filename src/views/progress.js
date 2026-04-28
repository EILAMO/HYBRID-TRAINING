let selectedMovId = ALL_MOVEMENTS[0]?.id || 'incline_smith';
let progressChart = null;

function renderProgress() {
  const el = document.getElementById('view-progress');
  const gymSessions = DB.getArr('gym_sessions');
  const runSessions = DB.getArr('run_sessions');

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Progress</div>
      <div class="page-sub">Volume & strength history</div>
    </div>

    <div class="section-lbl">Select Movement</div>
    <div class="pill-row fade-up" id="mov-pills">
      ${ALL_MOVEMENTS.map(m => `
        <div class="pill ${m.id===selectedMovId?'active':''}" onclick="selectMov('${m.id}')">${m.name}</div>
      `).join('')}
      <div class="pill" id="pill-run" onclick="selectMov('__run__')">Run Distance</div>
      <div class="pill" id="pill-cooper" onclick="selectMov('__cooper__')">Cooper</div>
    </div>

    <div id="progress-content" class="fade-up"></div>
  `;
  renderProgressContent(selectedMovId);
}

function selectMov(id) {
  selectedMovId = id;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  const pills = document.querySelectorAll('.pill');
  pills.forEach(p => {
    if (p.textContent.trim() === (ALL_MOVEMENTS.find(m=>m.id===id)?.name || (id==='__run__'?'Run Distance':'Cooper'))) {
      p.classList.add('active');
    }
  });
  renderProgressContent(id);
}

function renderProgressContent(id) {
  const container = document.getElementById('progress-content');
  if (!container) return;

  if (id === '__run__') { renderRunProgress(container); return; }
  if (id === '__cooper__') { renderCooperProgress(container); return; }

  const sessions = DB.getArr('gym_sessions');
  const mov = ALL_MOVEMENTS.find(m => m.id === id);
  if (!mov) return;

  // Collect per-session data for this movement
  const points = [];
  sessions.forEach(s => {
    const movSets = (s.sets||[]).filter(x => x.movId === id && x.kg && x.reps);
    if (!movSets.length) return;
    const vol = movSets.reduce((acc, x) => acc + (parseFloat(x.kg)||0)*(parseInt(x.reps)||0), 0);
    const best1rm = Math.max(...movSets.map(x => calc1RM(parseFloat(x.kg), parseInt(x.reps))));
    points.push({ date: s.date, vol: Math.round(vol), best1rm, sets: movSets });
  });

  if (!points.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-text">No data for ${mov.name} yet.<br>Log a session to see your progress.</div></div>`;
    return;
  }

  const lastPoint = points[points.length-1];
  const prevPoint = points.length > 1 ? points[points.length-2] : null;
  const volChange = prevPoint ? lastPoint.vol - prevPoint.vol : 0;
  const allBest1rm = Math.max(...points.map(p=>p.best1rm));
  const totalVol = points.reduce((a,p)=>a+p.vol,0);

  container.innerHTML = `
    <div class="metric-grid" style="margin-top:4px;">
      <div class="metric"><div class="metric-val gold">${allBest1rm}</div><div class="metric-lbl">Best 1RM (kg)</div></div>
      <div class="metric"><div class="metric-val ${volChange>=0?'green':'red'}">${volChange>=0?'+':''}${volChange}</div><div class="metric-lbl">Vol Change</div></div>
      <div class="metric"><div class="metric-val">${points.length}</div><div class="metric-lbl">Sessions</div></div>
    </div>
    <div class="chart-wrap">
      <div style="height:180px;"><canvas id="prog-chart" class="chart-canvas"></canvas></div>
    </div>
    <div class="section-lbl">Session History — ${mov.name}</div>
    <div class="card" style="padding:0;">
      ${points.slice().reverse().map(p => `
        <div class="hist-row">
          <div class="hist-left">
            <div class="hist-name">${formatDate(p.date)}</div>
            <div class="hist-date">1RM ~${p.best1rm}kg</div>
          </div>
          <div class="hist-right">
            <div class="hist-vol">${p.vol} kg·reps</div>
            <div class="hist-sets">${p.sets.length} sets</div>
          </div>
        </div>`).join('')}
    </div>
  `;

  setTimeout(() => {
    makeLineChart('prog-chart',
      points.map(p => p.date.slice(5)),
      [
        { label: 'Volume', data: points.map(p=>p.vol), color:'rgb(200,169,106)' },
        { label: '1RM (kg)', data: points.map(p=>p.best1rm), color:'rgb(91,181,133)' },
      ]
    );
  }, 50);
}

function renderRunProgress(container) {
  const runs = DB.getArr('run_sessions');
  if (!runs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏃</div><div class="empty-text">No runs logged yet.</div></div>`;
    return;
  }
  const byType = { INTERVAL: [], TEMPO: [], EASY: [] };
  runs.forEach(r => { if (byType[r.runType]) byType[r.runType].push(r); });

  container.innerHTML = `
    <div class="metric-grid" style="margin-top:4px;">
      <div class="metric"><div class="metric-val gold">${runs.length}</div><div class="metric-lbl">Total Runs</div></div>
      <div class="metric"><div class="metric-val">${Math.round(runs.reduce((a,r)=>a+(r.distance||0),0)*10)/10}km</div><div class="metric-lbl">Total Dist</div></div>
      <div class="metric"><div class="metric-val green">${Math.max(...runs.map(r=>r.distance||0))}km</div><div class="metric-lbl">Longest</div></div>
    </div>
    <div class="chart-wrap"><div style="height:180px;"><canvas id="run-chart" class="chart-canvas"></canvas></div></div>
    <div class="section-lbl">All Runs</div>
    <div class="card" style="padding:0;">
      ${runs.slice().reverse().map(r => {
        const pace = r.distance && r.duration ? secsToMMSS(Math.round(r.duration*60/r.distance)) : '–';
        return `<div class="hist-row">
          <div><div class="hist-name">${r.runType}</div><div class="hist-date">${formatDate(r.date)}</div></div>
          <div style="text-align:right;"><div class="hist-vol">${r.distance}km</div><div class="hist-sets">${r.duration}min · ${pace}/km</div></div>
        </div>`;
      }).join('')}
    </div>`;
  setTimeout(() => {
    makeLineChart('run-chart', runs.map(r=>r.date.slice(5)),
      [{ label:'Distance (km)', data: runs.map(r=>r.distance||0), color:'rgb(91,181,133)' }]);
  }, 50);
}

function renderCooperProgress(container) {
  const hist = DB.getArr('cooper_history');
  const best = DB.get('cooper_best') || USER.cooperBest;
  const pct = Math.round(best / USER.cooperGoal * 100);
  container.innerHTML = `
    <div class="metric-grid-2" style="margin-top:4px;">
      <div class="metric"><div class="metric-val gold">${best}m</div><div class="metric-lbl">Best Result</div></div>
      <div class="metric"><div class="metric-val">${3100-best}m</div><div class="metric-lbl">To Goal</div></div>
    </div>
    <div class="card">
      <div class="card-title">Progress to 3100m</div>
      <div class="cooper-track"><div class="cooper-fill" style="width:${pct}%"></div></div>
      <div class="cooper-lbl-row" style="margin-top:6px;"><span>${pct}%</span><span>3100m</span></div>
    </div>
    ${hist.length > 1 ? `<div class="chart-wrap"><div style="height:160px;"><canvas id="cooper-chart"></canvas></div></div>` : ''}
    <div class="section-lbl">Cooper History</div>
    <div class="card" style="padding:0;">
      ${hist.length ? hist.slice().reverse().map(h=>`
        <div class="hist-row">
          <div class="hist-name">${formatDate(h.date)}</div>
          <div style="font-family:'DM Mono',monospace;font-size:14px;color:var(--gold);">${h.meters}m</div>
        </div>`).join('') :
        `<div class="empty-state"><div class="empty-text" style="padding:16px;">No test results yet.<br>Log one in the Run tab.</div></div>`}
    </div>`;
  if (hist.length > 1) {
    setTimeout(() => makeLineChart('cooper-chart', hist.map(h=>h.date.slice(5)),
      [{label:'Meters', data:hist.map(h=>h.meters), color:'rgb(200,169,106)'}]), 50);
  }
}

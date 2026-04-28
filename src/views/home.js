function renderHome() {
  const el = document.getElementById('view-home');
  const plan = getTodayPlan();
  const deload = checkDeload();
  const gymSessions = DB.getArr('gym_sessions');
  const runSessions = DB.getArr('run_sessions');
  const allSessions = [...gymSessions, ...runSessions];
  const weekSessions = allSessions.filter(s => {
    const d = new Date(s.date); const now = new Date();
    const diff = (now - d) / 86400000;
    return diff <= 7;
  });
  const cooperBest = DB.get('cooper_best') || USER.cooperBest;
  const vo2 = cooperToVO2(cooperBest);
  const cooperPct = Math.min(100, Math.round((cooperBest / USER.cooperGoal) * 100));
  const todayNutr = DB.get('nutrition_' + today()) || { kcal:0, protein:0, carbs:0, fat:0 };

  let deloadHTML = '';
  if (deload) {
    deloadHTML = `<div class="deload-banner fade-up">
      <div class="deload-icon">⚠️</div>
      <div class="deload-text"><strong>Deload recommended</strong><br>${deload}</div>
    </div>`;
  }

  let planHTML = '';
  if (plan) {
    const isGym = plan.type === 'gym';
    const wo = isGym ? WORKOUTS[plan.session] : null;
    planHTML = `
      <div class="section-lbl">Today — ${dayName()}</div>
      <div class="card card-gold fade-up" style="cursor:pointer" onclick="${isGym ? `startWorkout('${plan.session}')` : `switchView('run')`}">
        <div class="card-title">${plan.type === 'gym' ? 'Gym Session' : 'Run Session'}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--gold);">${isGym ? wo.name : plan.session}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px;">${isGym ? wo.focus : 'Track your run'}</div>
          </div>
          <div style="font-size:28px;opacity:.5;">${isGym ? '🏋️' : '🏃'}</div>
        </div>
        <div style="margin-top:12px;">
          <div style="font-size:11px;color:var(--text3);margin-bottom:5px;">Tap to start</div>
          <div style="height:2px;background:var(--bg4);border-radius:1px;overflow:hidden;">
            <div style="width:0%;height:100%;background:var(--gold);border-radius:1px;"></div>
          </div>
        </div>
      </div>`;
  } else {
    planHTML = `<div class="section-lbl">Today</div>
    <div class="card fade-up"><div class="card-title">Rest Day</div>
    <div style="font-size:13px;color:var(--text3);">Recovery is part of the process.</div></div>`;
  }

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">APEX</div>
      <div class="page-sub">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
    </div>
    ${deloadHTML}
    ${planHTML}
    <div class="section-lbl">This Week</div>
    <div class="metric-grid fade-up">
      <div class="metric"><div class="metric-val gold">${weekSessions.length}</div><div class="metric-lbl">Sessions</div></div>
      <div class="metric"><div class="metric-val">${gymSessions.length}</div><div class="metric-lbl">Total Lifts</div></div>
      <div class="metric"><div class="metric-val">${runSessions.length}</div><div class="metric-lbl">Total Runs</div></div>
    </div>
    <div class="section-lbl">Cooper Goal — 3100m</div>
    <div class="card fade-up">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <div><span style="font-family:'DM Mono',monospace;font-size:22px;color:var(--gold);">${cooperBest}m</span><span style="font-size:11px;color:var(--text3);margin-left:6px;">best</span></div>
        <div style="font-size:11px;color:var(--text3);">VO2max ~${vo2}</div>
      </div>
      <div class="cooper-track"><div class="cooper-fill" style="width:${cooperPct}%"></div></div>
      <div class="cooper-lbl-row" style="margin-top:6px;">
        <span>${cooperPct}% of goal</span>
        <span>3100m</span>
      </div>
    </div>
    <div class="section-lbl">Today's Nutrition</div>
    <div class="card fade-up">
      <div style="margin-bottom:12px;">
        <div class="macro-bar-lbl" style="display:flex;justify-content:space-between;margin-bottom:5px;">
          <span style="font-size:12px;color:var(--text2);">Calories</span>
          <span style="font-size:12px;font-family:'DM Mono',monospace;">${todayNutr.kcal} / ${USER.targets.kcal} kcal</span>
        </div>
        <div class="macro-track"><div class="macro-fill cal" style="width:${Math.min(100,Math.round(todayNutr.kcal/USER.targets.kcal*100))}%"></div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
        <div><div style="font-family:'DM Mono',monospace;font-size:16px;color:var(--green);">${todayNutr.protein}g</div><div style="font-size:9px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Protein</div></div>
        <div><div style="font-family:'DM Mono',monospace;font-size:16px;color:var(--blue);">${todayNutr.carbs}g</div><div style="font-size:9px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Carbs</div></div>
        <div><div style="font-family:'DM Mono',monospace;font-size:16px;color:var(--red);">${todayNutr.fat}g</div><div style="font-size:9px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-top:2px;">Fat</div></div>
      </div>
    </div>
    <div class="section-lbl">Weekly Schedule</div>
    <div class="card fade-up">
      ${WEEK_PLAN.map(p => {
        const isToday = p.day === dayName();
        const isDone = allSessions.some(s => s.date === today() && (s.workout === p.session || s.runType === p.session));
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:.5px solid var(--border);${p.day===WEEK_PLAN[WEEK_PLAN.length-1].day?'border-bottom:none':''}">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:6px;height:6px;border-radius:50%;background:${isToday?'var(--gold)':isDone?'var(--green)':'var(--bg5)'}"></div>
            <div style="font-size:13px;${isToday?'color:var(--text);font-weight:500':'color:var(--text2)'};">${p.day}</div>
          </div>
          <div style="font-size:11px;color:${isToday?'var(--gold)':'var(--text3)'};">${p.session} <span style="font-size:10px;opacity:.6;">${p.type}</span></div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function startWorkout(key) {
  switchView('workout');
  setTimeout(() => beginWorkoutSession(key), 100);
}

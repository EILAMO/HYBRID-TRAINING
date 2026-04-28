let activeWorkout = null; // { key, sets: [{movId, kg, reps}], startTime, fatigue }

function renderWorkout() {
  const el = document.getElementById('view-workout');
  if (activeWorkout) { renderActiveWorkout(); return; }

  const gymSessions = DB.getArr('gym_sessions');
  const last5 = gymSessions.slice(-5).reverse();

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Lift</div>
      <div class="page-sub">Select a session to begin</div>
    </div>
    <div class="section-lbl">Start Session</div>
    <div class="workout-sel-grid fade-up">
      ${Object.entries(WORKOUTS).map(([k,w]) => `
        <div class="workout-sel-btn" onclick="beginWorkoutSession('${k}')">
          <div class="wsel-key">${k}</div>
          <div class="wsel-name">${w.name}</div>
          <div class="wsel-moves">${w.movements.length} movements</div>
        </div>`).join('')}
    </div>
    <div class="section-lbl">Recent Sessions</div>
    <div class="card fade-up" style="padding:0;">
      ${last5.length ? last5.map(s => `
        <div class="hist-row">
          <div class="hist-left">
            <div class="hist-name">${WORKOUTS[s.workout]?.name || s.workout}</div>
            <div class="hist-date">${formatDate(s.date)}</div>
          </div>
          <div class="hist-right">
            <div class="hist-vol">${sessionVolume(s).toLocaleString()} kg·reps</div>
            <div class="hist-sets">${(s.sets||[]).length} sets · fatigue ${s.fatigue||'–'}/5</div>
          </div>
        </div>`).join('') : `<div class="empty-state"><div class="empty-icon">🏋️</div><div class="empty-text">No sessions yet.<br>Start your first workout above.</div></div>`}
    </div>
  `;
}

function beginWorkoutSession(key) {
  const wo = WORKOUTS[key];
  if (!wo) return;
  activeWorkout = {
    key, startTime: Date.now(), fatigue: 3,
    sets: wo.movements.flatMap(m =>
      Array.from({length: m.sets}, (_,i) => ({ movId: m.id, setIdx: i, kg: '', reps: '' }))
    )
  };
  renderActiveWorkout();
}

function renderActiveWorkout() {
  const el = document.getElementById('view-workout');
  const wo = WORKOUTS[activeWorkout.key];
  const elapsed = Math.round((Date.now() - activeWorkout.startTime) / 60000);

  let movHTML = wo.movements.map(m => {
    const best1rm = getBest1RM(m.id);
    const setRows = Array.from({length: m.sets}, (_,i) => {
      const setData = activeWorkout.sets.find(s => s.movId === m.id && s.setIdx === i) || {};
      const prev = suggestWeight(m.id, i, null);
      let prevStr = '–';
      let prevClass = '';
      if (prev) {
        prevStr = `${prev.kg}×${prev.reps}`;
        if (setData.kg && setData.reps) {
          const newVol = (setData.kg||0)*(setData.reps||0);
          const prevVol = (prev.kg||0)*(prev.reps||0);
          if (newVol > prevVol) prevClass = 'up';
          else if (newVol < prevVol) prevClass = 'down';
        }
        if (prev.suggested) prevStr = `↑${prev.kg}×?`;
      }
      return `<div class="set-row">
        <div class="set-n">S${i+1}</div>
        <input class="set-inp" type="number" inputmode="decimal" placeholder="kg"
          value="${setData.kg||''}"
          onchange="updateSet('${m.id}',${i},'kg',this.value)"
          onblur="updateSet('${m.id}',${i},'kg',this.value)">
        <input class="set-inp" type="number" inputmode="numeric" placeholder="reps"
          value="${setData.reps||''}"
          onchange="updateSet('${m.id}',${i},'reps',this.value)"
          onblur="updateSet('${m.id}',${i},'reps',this.value)">
        <div class="set-prev ${prevClass}">${prevStr}</div>
      </div>`;
    }).join('');

    return `<div class="mov-block">
      <div class="mov-head">
        <div>
          <div class="mov-name">${m.name}</div>
          <div class="mov-scheme">${m.sets}×${m.repRange} · ${m.muscle}</div>
        </div>
        <div>${best1rm ? `<span class="mov-1rm">1RM ~${best1rm}kg</span>` : ''}</div>
      </div>
      <div class="mov-sets">
        <div class="set-hdr">
          <span></span><span>kg</span><span>reps</span><span style="text-align:right">prev</span>
        </div>
        ${setRows}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="page-header">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div class="page-title">${wo.name}</div>
          <div class="page-sub">${elapsed}min · ${wo.focus}</div>
        </div>
        <button class="btn btn-danger btn-sm" onclick="cancelWorkout()" style="width:auto;margin:0;">Cancel</button>
      </div>
    </div>
    <div style="height:10px;"></div>
    ${movHTML}
    <div class="section-lbl">Session Fatigue</div>
    <div class="fatigue-wrap fade-up">
      <div class="fatigue-lbl">How do you feel after this session?</div>
      <div class="fatigue-row">
        ${['😴','😌','😐','😓','🔥'].map((e,i) => `
          <div class="fat-btn ${activeWorkout.fatigue === i+1 ? 'sel':''}" onclick="setFatigue(${i+1})">${e}</div>
        `).join('')}
      </div>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-primary" onclick="finishWorkout()">✓ &nbsp;Finish Session</button>
    </div>
  `;
  el.scrollTop = 0;
}

function updateSet(movId, setIdx, field, val) {
  const s = activeWorkout.sets.find(x => x.movId === movId && x.setIdx === setIdx);
  if (s) s[field] = parseFloat(val) || '';
}

function setFatigue(v) {
  activeWorkout.fatigue = v;
  document.querySelectorAll('.fat-btn').forEach((b,i) => b.classList.toggle('sel', i+1===v));
}

function finishWorkout() {
  const filledSets = activeWorkout.sets.filter(s => s.kg && s.reps);
  if (!filledSets.length) { showToast('Log at least one set first'); return; }
  const session = {
    workout: activeWorkout.key,
    date: today(),
    duration: Math.round((Date.now() - activeWorkout.startTime) / 60000),
    fatigue: activeWorkout.fatigue,
    sets: activeWorkout.sets,
    totalVolume: sessionVolume({ sets: activeWorkout.sets }),
  };
  DB.push('gym_sessions', session);
  activeWorkout = null;
  showToast('Session saved 💪');
  renderWorkout();
  renderHome();
}

function cancelWorkout() {
  if (!confirm('Cancel this session? Progress will be lost.')) return;
  activeWorkout = null;
  renderWorkout();
}

function getBest1RM(movId) {
  const sessions = DB.getArr('gym_sessions');
  let best = 0;
  sessions.forEach(s => {
    (s.sets||[]).filter(x => x.movId === movId && x.kg && x.reps).forEach(x => {
      const orm = calc1RM(parseFloat(x.kg), parseInt(x.reps));
      if (orm > best) best = orm;
    });
  });
  return best || null;
}

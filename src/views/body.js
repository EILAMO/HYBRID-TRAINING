function renderBody() {
  const el = document.getElementById('view-body');
  const weights = DB.getArr('weight_log');
  const measurements = DB.getArr('measurements');
  const lastWeight = weights.length ? weights[weights.length-1] : null;
  const prevWeight = weights.length > 1 ? weights[weights.length-2] : null;
  const weightChange = lastWeight && prevWeight ? Math.round((lastWeight.kg - prevWeight.kg)*10)/10 : null;

  const lastMeasure = measurements.length ? measurements[measurements.length-1] : null;

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Body</div>
      <div class="page-sub">Weight · Measurements</div>
    </div>

    <div class="section-lbl">Current Weight</div>
    <div class="metric-grid fade-up">
      <div class="metric">
        <div class="metric-val gold">${lastWeight ? lastWeight.kg : '–'}</div>
        <div class="metric-lbl">kg now</div>
      </div>
      <div class="metric">
        <div class="metric-val ${weightChange===null?'':weightChange<=0?'green':'red'}">${weightChange!==null?(weightChange>0?'+':'')+weightChange:'–'}</div>
        <div class="metric-lbl">vs prev</div>
      </div>
      <div class="metric">
        <div class="metric-val">${weights.length}</div>
        <div class="metric-lbl">Entries</div>
      </div>
    </div>

    <div style="padding:0 14px;margin-bottom:12px;">
      <div style="display:grid;grid-template-columns:1fr 80px;gap:8px;align-items:flex-end;">
        <div class="field" style="padding:0;margin-bottom:0;">
          <div class="field-lbl">Log Weight (kg)</div>
          <input class="field-inp" type="number" inputmode="decimal" id="weight-inp" placeholder="${lastWeight?.kg||88}" step="0.1">
        </div>
        <button class="btn btn-primary btn-sm" style="margin:0;height:46px;" onclick="logWeight()">Add</button>
      </div>
    </div>

    ${weights.length > 2 ? `
    <div class="chart-wrap fade-up"><div style="height:160px;"><canvas id="weight-chart"></canvas></div></div>` : ''}

    <div class="section-lbl">Body Measurements</div>
    <div class="card fade-up card-gold">
      ${lastMeasure ? `
        <div class="body-grid" style="padding:0;margin:0 0 4px;">
          ${[
            ['Chest', lastMeasure.chest, 'cm'],
            ['Waist', lastMeasure.waist, 'cm'],
            ['Hips', lastMeasure.hips, 'cm'],
            ['Arms', lastMeasure.arms, 'cm'],
            ['Thighs', lastMeasure.thighs, 'cm'],
            ['Shoulders', lastMeasure.shoulders, 'cm'],
          ].map(([lbl, val, unit]) => val ? `
            <div style="padding:10px 0;border-bottom:.5px solid var(--border);">
              <div style="font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">${lbl}</div>
              <div style="font-family:'DM Mono',monospace;font-size:20px;color:var(--text);">${val}<span style="font-size:11px;color:var(--text3);margin-left:2px;">${unit}</span></div>
            </div>` : '').join('')}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:8px;">Last logged: ${formatDate(lastMeasure.date)}</div>
      ` : `<div style="color:var(--text3);font-size:13px;">No measurements logged yet.</div>`}
    </div>
    <button class="btn btn-secondary fade-up" onclick="openMeasureModal()">+ Log Measurements</button>

    <div class="section-lbl">Weight History</div>
    <div class="card fade-up" style="padding:0;">
      ${weights.length ? weights.slice().reverse().slice(0,10).map(w => `
        <div class="hist-row">
          <div class="hist-date" style="font-size:13px;">${formatDate(w.date)}</div>
          <div style="font-family:'DM Mono',monospace;font-size:15px;color:var(--gold);">${w.kg} kg</div>
        </div>`).join('') :
        `<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-text">No weight logged yet.</div></div>`}
    </div>
  `;

  if (weights.length > 2) {
    setTimeout(() => {
      const movAvg = weights.map((_,i) => {
        const slice = weights.slice(Math.max(0,i-3), i+1);
        return Math.round(slice.reduce((a,w)=>a+w.kg,0)/slice.length*10)/10;
      });
      makeLineChart('weight-chart',
        weights.map(w=>w.date.slice(5)),
        [
          { label: 'Weight', data: weights.map(w=>w.kg), color:'rgb(200,169,106)' },
          { label: '7d avg', data: movAvg, color:'rgb(91,181,133)' },
        ]
      );
    }, 50);
  }
}

function logWeight() {
  const v = parseFloat(document.getElementById('weight-inp')?.value);
  if (!v || v < 30 || v > 250) { showToast('Enter a valid weight'); return; }
  DB.push('weight_log', { date: today(), kg: v });
  showToast(`Weight logged: ${v}kg`);
  renderBody();
}

function openMeasureModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div style="padding:0 18px 20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:16px;">Body Measurements</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        ${[
          ['Chest', 'chest'], ['Waist', 'waist'], ['Hips', 'hips'],
          ['Arms (flexed)', 'arms'], ['Thighs', 'thighs'], ['Shoulders', 'shoulders']
        ].map(([lbl,id]) => `
          <div class="field" style="padding:0;">
            <div class="field-lbl">${lbl} (cm)</div>
            <input class="field-inp" type="number" inputmode="decimal" id="m-${id}" placeholder="0" step="0.5">
          </div>`).join('')}
      </div>
      <button class="btn btn-primary" onclick="saveMeasurements()">Save Measurements</button>
    </div>
  `);
}

function saveMeasurements() {
  const ids = ['chest','waist','hips','arms','thighs','shoulders'];
  const data = { date: today() };
  ids.forEach(id => {
    const v = parseFloat(document.getElementById('m-'+id)?.value);
    if (v) data[id] = v;
  });
  if (Object.keys(data).length < 2) { showToast('Enter at least one measurement'); return; }
  DB.push('measurements', data);
  closeModal();
  showToast('Measurements saved');
  renderBody();
}

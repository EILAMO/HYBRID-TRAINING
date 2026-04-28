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

function renderRun() {
  const el = document.getElementById('view-run');
  if (!el) return;
  const cooperBest = DB.get('cooper_best') || USER_BASE.cooperBest;
  const vo2 = cooperToVO2(cooperBest);
  const zones = vo2ToPaces(vo2);
  const runs = DB.getArr('run_sessions').slice(-5).reverse();

  const zoneColors = { easy:'#5a9fd4', moderate:'#5bb585', tempo:'#c8a96a', interval:'#e09a4a', rep:'#d95f5f' };
  const zoneNames  = { easy:'Easy', moderate:'Moderate', tempo:'Tempo', interval:'Interval', rep:'Rep' };

  const recentHTML = runs.length ? runs.map(r => {
    const pace = r.distance && r.duration ? secsToMMSS(Math.round(r.duration * 60 / r.distance)) : '--';
    return '<div class="hist-row">' +a
      '<div class="hist-left">' +
        '<div class="hist-name">' + r.runType + '</div>' +
        '<div class="hist-date">' + formatDate(r.date) + (r.fromImage ? ' · 📷' : '') + '</div>' +
      '</div>' +
      '<div class="hist-right">' +
        '<div class="hist-vol">' + (r.distance || '--') + ' km</div>' +
        '<div class="hist-sets">' + (r.duration || '--') + ' min · ' + pace + '/km</div>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="empty-state"><div class="empty-icon">🏃</div><div class="empty-text">No runs logged yet.</div></div>';

  const zonesHTML = Object.entries(zones).map(function(entry) {
    const k = entry[0]; const z = entry[1];
    return '<div class="zone-row">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div class="zone-dot" style="background:' + zoneColors[k] + '"></div>' +
        '<div class="zone-name">' + zoneNames[k] + '</div>' +
      '</div>' +
      '<div class="zone-pace" style="color:' + zoneColors[k] + ';">' + secsToMMSS(z.hi) + '–' + secsToMMSS(z.lo) + ' /km</div>' +
    '</div>';
  }).join('');

  el.innerHTML =
    '<div class="page-header">' +
      '<div class="page-title">Run</div>' +
      '<div class="page-sub">VO2max ~' + vo2 + ' · Cooper best ' + cooperBest + 'm</div>' +
    '</div>' +

    '<div class="section-lbl">Pace Zones</div>' +
    '<div class="card fade-up" style="padding:14px 16px;">' + zonesHTML + '</div>' +

    '<div class="section-lbl">Log a Run</div>' +
    '<div class="run-types fade-up">' +
      '<div class="run-type active" id="rt-INTERVAL" onclick="selectRunType(\'INTERVAL\')">Intervals</div>' +
      '<div class="run-type" id="rt-TEMPO" onclick="selectRunType(\'TEMPO\')">Tempo</div>' +
      '<div class="run-type" id="rt-EASY" onclick="selectRunType(\'EASY\')">Easy</div>' +
    '</div>' +

    '<div class="card fade-up" style="margin-bottom:10px;">' +
      '<div class="card-title">Upload Screenshot — Strava / Sports Tracker</div>' +
      '<label style="display:block;background:var(--bg3);border:.5px dashed var(--border2);border-radius:9px;padding:20px;text-align:center;cursor:pointer;">' +
        '<input type="file" accept="image/*" id="run-img-input" style="display:none;" onchange="previewRunImage(this)">' +
        '<div id="run-img-preview" style="color:var(--text3);font-size:12px;">' +
          '<div style="font-size:28px;margin-bottom:6px;">📷</div>' +
          'Tap to select screenshot' +
        '</div>' +
      '</label>' +
      '<div id="run-img-data" style="display:none;margin-top:10px;font-size:11px;color:var(--text3);line-height:1.5;">Image ready — send it in this chat with a message like "log this run" and I will read the data automatically.</div>' +
    '</div>' +

    '<div id="run-form"></div>' +

    '<div class="section-lbl">Recent Runs</div>' +
    '<div class="card fade-up" style="padding:0;">' + recentHTML + '</div>' +

    '<div class="section-lbl">Cooper Test</div>' +
    '<div class="card fade-up">' +
      '<div class="card-title">Update Best Result</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px;gap:8px;align-items:flex-end;">' +
        '<div class="field" style="padding:0;margin-bottom:0;">' +
          '<div class="field-lbl">Distance (m)</div>' +
          '<input class="field-inp" type="number" inputmode="numeric" id="cooper-inp" placeholder="' + cooperBest + '" value="' + cooperBest + '">' +
        '</div>' +
        '<button class="btn btn-secondary btn-sm" style="margin:0;height:46px;" onclick="saveCooper()">Save</button>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px;">Goal: 3100m · Gap: ' + (3100 - cooperBest) + 'm</div>' +
    '</div>';

  // Build form after render
  setTimeout(function() { buildAndInsertRunForm('INTERVAL'); }, 10);
}

function previewRunImage(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('run-img-preview');
    if (preview) preview.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;max-height:180px;border-radius:8px;object-fit:contain;">';
    const info = document.getElementById('run-img-data');
    if (info) info.style.display = 'block';
  };
  reader.readAsDataURL(input.files[0]);
}

var activeRunType = 'INTERVAL';
var activeRunFat = 3;

function selectRunType(t) {
  activeRunType = t;
  ['INTERVAL','TEMPO','EASY'].forEach(function(rt) {
    var el = document.getElementById('rt-' + rt);
    if (el) el.classList.toggle('active', rt === t);
  });
  buildAndInsertRunForm(t);
}

function buildAndInsertRunForm(type) {
  var hints = { INTERVAL:'e.g. 6x800m with 90s rest', TEMPO:'e.g. 20-40min at tempo pace', EASY:'Easy conversational pace' };
  var emojis = ['😴','😌','😐','😓','🔥'];
  var fatHTML = emojis.map(function(e, i) {
    return '<div class="fat-btn' + (activeRunFat === i+1 ? ' sel' : '') + '" id="run-fat-' + (i+1) + '" onclick="selectRunFat(' + (i+1) + ')">' + e + '</div>';
  }).join('');

  var html =
    '<div class="field-row" style="margin-bottom:10px;">' +
      '<div class="field"><div class="field-lbl">Distance (km)</div>' +
        '<input class="field-inp" type="number" inputmode="decimal" id="run-dist" placeholder="0.0" step="0.1"></div>' +
      '<div class="field"><div class="field-lbl">Duration (min)</div>' +
        '<input class="field-inp" type="number" inputmode="numeric" id="run-dur" placeholder="0"></div>' +
    '</div>' +
    '<div class="field" style="padding:0 14px;margin-bottom:10px;">' +
      '<div class="field-lbl">Notes</div>' +
      '<input class="field-inp" type="text" id="run-notes" placeholder="' + hints[type] + '">' +
    '</div>' +
    '<div class="field" style="padding:0 14px;margin-bottom:10px;">' +
      '<div class="field-lbl">Effort (1–5)</div>' +
      '<div style="display:flex;gap:8px;">' + fatHTML + '</div>' +
    '</div>' +
    '<button class="btn btn-primary" onclick="saveRun()">Save Run</button>';

  var form = document.getElementById('run-form');
  if (form) form.innerHTML = html;
}

function selectRunFat(v) {
  activeRunFat = v;
  for (var i = 1; i <= 5; i++) {
    var b = document.getElementById('run-fat-' + i);
    if (b) b.classList.toggle('sel', i === v);
  }
}

function saveRun(data) {
  var dist = data ? data.distance : parseFloat(document.getElementById('run-dist') && document.getElementById('run-dist').value);
  var dur  = data ? data.duration : parseInt(document.getElementById('run-dur') && document.getElementById('run-dur').value);
  var notes = data ? (data.notes || '') : (document.getElementById('run-notes') ? document.getElementById('run-notes').value : '');
  if (!dist || !dur) { showToast('Enter distance and duration'); return; }
  DB.push('run_sessions', {
    runType: data ? (data.runType || activeRunType) : activeRunType,
    date: today(), distance: dist, duration: dur,
    notes: notes, effort: data ? (data.effort || 3) : activeRunFat,
    fromImage: data ? !!data.fromImage : false,
  });
  showToast('Run logged!');
  renderRun();
  renderHome();
}

function saveCooper() {
  var inp = document.getElementById('cooper-inp');
  var v = inp ? parseInt(inp.value) : 0;
  if (!v || v < 500 || v > 5000) { showToast('Enter a valid distance'); return; }
  DB.set('cooper_best', v);
  DB.push('cooper_history', { date: today(), meters: v });
  showToast('Cooper updated: ' + v + 'm');
  renderRun();
  renderHome();
}

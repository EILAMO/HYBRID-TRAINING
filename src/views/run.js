var gpsState = {
  active: false, watchId: null, coords: [],
  startTime: null, distance: 0, lastCoord: null,
  timerInterval: null, splits: [], lastSplitDist: 0, lastSplitTime: null,
};

function renderRun() {
  var el = document.getElementById('view-run');
  if (!el) return;
  var cooperBest = DB.get('cooper_best') || USER_BASE.cooperBest;
  var vo2 = cooperToVO2(cooperBest);
  var zones = vo2ToPaces(vo2);
  var runs = DB.getArr('run_sessions').slice(-5).reverse();
  var plan = TrainingEngine.generateWeekPlan();
  var deload = TrainingEngine.needsDeload();
  var stress = TrainingEngine.weeklyStress(0);

  var zoneColors = { easy:'#5a9fd4', moderate:'#5bb585', tempo:'#c8a96a', interval:'#e09a4a', rep:'#d95f5f' };
  var zoneNames  = { easy:'Easy', moderate:'Moderate', tempo:'Tempo', interval:'Interval', rep:'Rep' };

  var zonesHTML = Object.entries(zones).map(function(e) {
    var k = e[0]; var z = e[1];
    return '<div class="zone-row">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div class="zone-dot" style="background:' + zoneColors[k] + '"></div>' +
        '<div class="zone-name">' + zoneNames[k] + '</div>' +
      '</div>' +
      '<div class="zone-pace" style="color:' + zoneColors[k] + ';">' + secsToMMSS(z.hi) + '–' + secsToMMSS(z.lo) + ' /km</div>' +
    '</div>';
  }).join('');

  // Weekly plan sessions
  var planHTML = plan.sessions.map(function(s, i) {
    var intensityColor = s.intensity <= 2 ? 'var(--green)' : s.intensity <= 3 ? 'var(--gold)' : 'var(--red)';
    var intensityLabel = s.intensity <= 2 ? 'Easy' : s.intensity <= 3 ? 'Moderate' : s.intensity <= 4 ? 'Hard' : 'Very Hard';
    var dots = '';
    for (var d = 1; d <= 5; d++) {
      dots += '<div style="width:7px;height:7px;border-radius:50%;background:' + (d <= s.intensity ? intensityColor : 'var(--bg5)') + ';"></div>';
    }
    return '<div style="background:var(--bg3);border:.5px solid var(--border2);border-radius:12px;padding:14px;margin-bottom:8px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
        '<div style="font-size:13px;font-weight:500;">' + s.label + '</div>' +
        '<div style="display:flex;gap:3px;">' + dots + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">' +
        '<div style="background:var(--bg2);border-radius:7px;padding:8px;">' +
          '<div style="font-size:9px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;">Distance</div>' +
          '<div style="font-family:\'DM Mono\',monospace;font-size:13px;margin-top:2px;">' + s.distance + '</div>' +
        '</div>' +
        '<div style="background:var(--bg2);border-radius:7px;padding:8px;">' +
          '<div style="font-size:9px;color:var(--text3);letter-spacing:1px;text-transform:uppercase;">Target pace</div>' +
          '<div style="font-family:\'DM Mono\',monospace;font-size:13px;margin-top:2px;color:' + intensityColor + ';">' + s.targetPace + '</div>' +
        '</div>' +
      '</div>' +
      (s.sets ? '<div style="font-size:11px;color:var(--gold);margin-bottom:6px;">📍 ' + s.sets + ' · rest: ' + s.restBetween + '</div>' : '') +
      '<div style="font-size:12px;color:var(--text2);line-height:1.5;">' + s.description + '</div>' +
    '</div>';
  }).join('');

  var deloadBanner = '';
  if (deload) {
    var reasons = {
      high_effort: 'Recent runs have been very hard — this week is a recovery week.',
      high_volume: 'High training volume detected — backing off this week.',
      gym_fatigue: 'Gym fatigue is high — reducing run intensity.',
      scheduled: 'Scheduled recovery week every 4 weeks.',
    };
    deloadBanner = '<div class="deload-banner" style="margin:0 14px 12px;">' +
      '<div class="deload-icon">🔄</div>' +
      '<div class="deload-text"><strong>Recovery Week</strong><br>' + (reasons[deload] || '') + '</div>' +
    '</div>';
  }

  var recentHTML = runs.length ? runs.map(function(r) {
    var pace = r.distance && r.duration ? secsToMMSS(Math.round(r.duration * 60 / r.distance)) : '--';
    return '<div class="hist-row">' +
      '<div class="hist-left">' +
        '<div class="hist-name">' + r.runType + (r.gps ? ' <span style="font-size:10px;color:var(--gold);">GPS</span>' : '') + '</div>' +
        '<div class="hist-date">' + formatDate(r.date) + '</div>' +
      '</div>' +
      '<div class="hist-right">' +
        '<div class="hist-vol">' + (r.distance || '--') + ' km</div>' +
        '<div class="hist-sets">' + (r.duration || '--') + ' min · ' + pace + '/km · effort ' + (r.effort||'–') + '/5</div>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="empty-state"><div class="empty-icon">🏃</div><div class="empty-text">No runs logged yet.</div></div>';

  el.innerHTML =
    '<div class="page-header">' +
      '<div class="page-title">Run</div>' +
      '<div class="page-sub">VO2max ~' + vo2 + ' · Cooper ' + cooperBest + 'm · Goal 3100m</div>' +
    '</div>' +

    deloadBanner +

    // WEEKLY PLAN
    '<div class="section-lbl">This Week\'s Run Plan</div>' +
    '<div style="padding:0 14px;margin-bottom:4px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<div style="font-size:11px;color:var(--text3);">Auto-generated · updates weekly</div>' +
        '<div style="font-size:11px;color:var(--gold);">' + (plan.type === 'deload' ? '🔄 Recovery' : plan.type === 'base' ? '🏗 Base' : plan.type === 'moderate' ? '📈 Build' : '🔥 Peak') + '</div>' +
      '</div>' +
      planHTML +
    '</div>' +

    // GPS TRACKER
    '<div class="section-lbl">GPS Tracker</div>' +
    '<div class="card card-gold fade-up" id="gps-card">' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">' +
        '<div style="text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:30px;color:var(--gold);" id="gps-dist">0.00</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:2px;">km</div></div>' +
        '<div style="text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:30px;" id="gps-time">0:00</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:2px;">time</div></div>' +
        '<div style="text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:30px;color:var(--green);" id="gps-pace">--:--</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:2px;">/km</div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">' +
        '<div style="text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:15px;" id="gps-speed">--</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);">km/h</div></div>' +
        '<div style="text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:15px;" id="gps-splits">--</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);">last km</div></div>' +
        '<div style="text-align:center;"><div style="font-family:\'DM Mono\',monospace;font-size:15px;" id="gps-accuracy">--</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);">gps</div></div>' +
      '</div>' +
      '<div class="run-types" style="margin:0 0 12px;">' +
        '<div class="run-type active" id="gps-rt-INTERVAL" onclick="setGpsRunType(\'INTERVAL\')">Intervals</div>' +
        '<div class="run-type" id="gps-rt-TEMPO" onclick="setGpsRunType(\'TEMPO\')">Tempo</div>' +
        '<div class="run-type" id="gps-rt-EASY" onclick="setGpsRunType(\'EASY\')">Easy</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<button class="btn btn-primary" style="margin:0;" id="gps-start-btn" onclick="startGPS()">▶ Start</button>' +
        '<button class="btn btn-danger" style="margin:0;display:none;" id="gps-stop-btn" onclick="stopGPS()">■ Finish</button>' +
      '</div>' +
      '<div id="gps-status" style="font-size:11px;color:var(--text3);text-align:center;margin-top:8px;min-height:16px;"></div>' +
    '</div>' +

    // PACE ZONES
    '<div class="section-lbl">Your Pace Zones</div>' +
    '<div class="card fade-up" style="padding:14px 16px;">' + zonesHTML + '</div>' +

    // MANUAL LOG
    '<div class="section-lbl">Manual Log</div>' +
    '<div class="run-types fade-up">' +
      '<div class="run-type active" id="rt-INTERVAL" onclick="selectRunType(\'INTERVAL\')">Intervals</div>' +
      '<div class="run-type" id="rt-TEMPO" onclick="selectRunType(\'TEMPO\')">Tempo</div>' +
      '<div class="run-type" id="rt-EASY" onclick="selectRunType(\'EASY\')">Easy</div>' +
    '</div>' +
    '<div id="run-form"></div>' +

    // SCREENSHOT
    '<div class="card fade-up" style="margin:0 14px 10px;">' +
      '<div class="card-title">Upload Screenshot — Strava / Sports Tracker</div>' +
      '<label style="display:block;background:var(--bg3);border:.5px dashed var(--border2);border-radius:9px;padding:20px;text-align:center;cursor:pointer;">' +
        '<input type="file" accept="image/*" id="run-img-input" style="display:none;" onchange="previewRunImage(this)">' +
        '<div id="run-img-preview" style="color:var(--text3);font-size:12px;"><div style="font-size:28px;margin-bottom:6px;">📷</div>Tap to select screenshot</div>' +
      '</label>' +
      '<div id="run-img-data" style="display:none;margin-top:10px;font-size:11px;color:var(--text3);line-height:1.5;">Ready — send in chat as "log this run" and I\'ll read it automatically.</div>' +
    '</div>' +

    // RECENT
    '<div class="section-lbl">Recent Runs</div>' +
    '<div class="card fade-up" style="padding:0;">' + recentHTML + '</div>' +

    // COOPER
    '<div class="section-lbl">Cooper Test</div>' +
    '<div class="card fade-up">' +
      '<div class="card-title">Update Best Result</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px;gap:8px;align-items:flex-end;">' +
        '<div class="field" style="padding:0;margin-bottom:0;"><div class="field-lbl">Distance (m)</div>' +
          '<input class="field-inp" type="number" inputmode="numeric" id="cooper-inp" value="' + cooperBest + '"></div>' +
        '<button class="btn btn-secondary btn-sm" style="margin:0;height:46px;" onclick="saveCooper()">Save</button>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:8px;">Goal 3100m · Gap: ' + (3100 - cooperBest) + 'm · VO2max ~' + vo2 + '</div>' +
    '</div>';

  setTimeout(function() { buildAndInsertRunForm('INTERVAL'); }, 10);
}

var gpsRunType = 'INTERVAL';
function setGpsRunType(t) {
  gpsRunType = t;
  ['INTERVAL','TEMPO','EASY'].forEach(function(rt) {
    var el = document.getElementById('gps-rt-' + rt);
    if (el) el.classList.toggle('active', rt === t);
  });
}

function startGPS() {
  if (!navigator.geolocation) { showToast('GPS not available'); return; }
  var status = document.getElementById('gps-status');
  if (status) status.textContent = 'Getting GPS signal...';
  gpsState.active = true;
  gpsState.coords = [];
  gpsState.distance = 0;
  gpsState.lastCoord = null;
  gpsState.startTime = Date.now();
  gpsState.splits = [];
  gpsState.lastSplitDist = 0;
  gpsState.lastSplitTime = Date.now();
  var startBtn = document.getElementById('gps-start-btn');
  var stopBtn = document.getElementById('gps-stop-btn');
  if (startBtn) startBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'block';
  gpsState.timerInterval = setInterval(updateGPSTimer, 1000);
  gpsState.watchId = navigator.geolocation.watchPosition(
    function(pos) { onGPSPosition(pos); },
    function(err) { var s = document.getElementById('gps-status'); if (s) s.textContent = 'GPS error: ' + err.message; },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  );
}

function onGPSPosition(pos) {
  if (!gpsState.active) return;
  var lat = pos.coords.latitude;
  var lng = pos.coords.longitude;
  var acc = Math.round(pos.coords.accuracy);
  var speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6 * 10) / 10 : null;
  gpsState.coords.push({ lat: lat, lng: lng, t: Date.now() });
  if (gpsState.lastCoord && acc < 35) {
    gpsState.distance += haversine(gpsState.lastCoord.lat, gpsState.lastCoord.lng, lat, lng);
  }
  gpsState.lastCoord = { lat: lat, lng: lng };
  if (gpsState.distance - gpsState.lastSplitDist >= 1.0) {
    var splitTime = (Date.now() - gpsState.lastSplitTime) / 1000;
    gpsState.splits.push(Math.round(splitTime));
    gpsState.lastSplitDist = Math.floor(gpsState.distance);
    gpsState.lastSplitTime = Date.now();
  }
  var distEl = document.getElementById('gps-dist');
  var paceEl = document.getElementById('gps-pace');
  var speedEl = document.getElementById('gps-speed');
  var accEl = document.getElementById('gps-accuracy');
  var splitsEl = document.getElementById('gps-splits');
  var statusEl = document.getElementById('gps-status');
  if (distEl) distEl.textContent = gpsState.distance.toFixed(2);
  if (speedEl) speedEl.textContent = speed !== null ? speed : '--';
  if (accEl) accEl.textContent = acc + 'm';
  if (statusEl) statusEl.textContent = acc < 10 ? '● GPS locked' : acc < 25 ? '● Good' : '○ Weak signal';
  var elapsed = (Date.now() - gpsState.startTime) / 1000;
  if (gpsState.distance > 0.1 && paceEl) {
    paceEl.textContent = secsToMMSS(Math.round(elapsed / gpsState.distance));
  }
  if (gpsState.splits.length > 0 && splitsEl) {
    splitsEl.textContent = secsToMMSS(gpsState.splits[gpsState.splits.length - 1]);
  }
}

function updateGPSTimer() {
  if (!gpsState.active) return;
  var elapsed = Math.floor((Date.now() - gpsState.startTime) / 1000);
  var el = document.getElementById('gps-time');
  if (el) {
    var h = Math.floor(elapsed / 3600);
    var m = Math.floor((elapsed % 3600) / 60);
    var s = elapsed % 60;
    el.textContent = h > 0 ? h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') : m + ':' + String(s).padStart(2,'0');
  }
}

function stopGPS() {
  if (!gpsState.active) return;
  gpsState.active = false;
  if (gpsState.watchId !== null) { navigator.geolocation.clearWatch(gpsState.watchId); gpsState.watchId = null; }
  if (gpsState.timerInterval) { clearInterval(gpsState.timerInterval); gpsState.timerInterval = null; }
  var elapsed = Math.round((Date.now() - gpsState.startTime) / 1000);
  var dist = Math.round(gpsState.distance * 100) / 100;
  if (dist < 0.1) { showToast('Too short to save'); renderRun(); return; }
  DB.push('run_sessions', {
    runType: gpsRunType, date: today(),
    distance: dist, duration: Math.round(elapsed / 60),
    effort: 3, gps: true, splits: gpsState.splits, notes: 'GPS tracked',
  });
  showToast('Run saved — ' + dist + ' km!');
  renderRun(); renderHome();
}

function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  var hints = { INTERVAL:'e.g. 6x400m at interval pace', TEMPO:'e.g. 30min at tempo pace', EASY:'Easy conversational pace' };
  var emojis = ['😴','😌','😐','😓','🔥'];
  var fatHTML = emojis.map(function(e,i) {
    return '<div class="fat-btn' + (activeRunFat===i+1?' sel':'') + '" id="run-fat-'+(i+1)+'" onclick="selectRunFat('+(i+1)+')">' + e + '</div>';
  }).join('');
  var html =
    '<div class="field-row" style="margin-bottom:10px;">' +
      '<div class="field"><div class="field-lbl">Distance (km)</div><input class="field-inp" type="number" inputmode="decimal" id="run-dist" placeholder="0.0" step="0.1"></div>' +
      '<div class="field"><div class="field-lbl">Duration (min)</div><input class="field-inp" type="number" inputmode="numeric" id="run-dur" placeholder="0"></div>' +
    '</div>' +
    '<div class="field" style="padding:0 14px;margin-bottom:10px;"><div class="field-lbl">Notes</div><input class="field-inp" type="text" id="run-notes" placeholder="' + hints[type] + '"></div>' +
    '<div class="field" style="padding:0 14px;margin-bottom:10px;"><div class="field-lbl">Effort (1–5)</div><div style="display:flex;gap:8px;">' + fatHTML + '</div></div>' +
    '<button class="btn btn-primary" onclick="saveRun()">Save Run</button>';
  var form = document.getElementById('run-form');
  if (form) form.innerHTML = html;
}

function selectRunFat(v) {
  activeRunFat = v;
  for (var i=1;i<=5;i++){var b=document.getElementById('run-fat-'+i);if(b)b.classList.toggle('sel',i===v);}
}

function previewRunImage(input) {
  if (!input.files||!input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var p = document.getElementById('run-img-preview');
    if (p) p.innerHTML = '<img src="'+e.target.result+'" style="max-width:100%;max-height:180px;border-radius:8px;object-fit:contain;">';
    var d = document.getElementById('run-img-data');
    if (d) d.style.display = 'block';
  };
  reader.readAsDataURL(input.files[0]);
}

function saveRun(data) {
  var dist = data ? data.distance : parseFloat(document.getElementById('run-dist')&&document.getElementById('run-dist').value);
  var dur  = data ? data.duration : parseInt(document.getElementById('run-dur')&&document.getElementById('run-dur').value);
  var notes = data ? (data.notes||'') : (document.getElementById('run-notes')?document.getElementById('run-notes').value:'');
  if (!dist||!dur) { showToast('Enter distance and duration'); return; }
  DB.push('run_sessions', {
    runType: data?(data.runType||activeRunType):activeRunType,
    date: today(), distance: dist, duration: dur,
    notes: notes, effort: data?(data.effort||3):activeRunFat,
    fromImage: data?!!data.fromImage:false,
  });
  showToast('Run logged!');
  renderRun(); renderHome();
}

function saveCooper() {
  var inp = document.getElementById('cooper-inp');
  var v = inp ? parseInt(inp.value) : 0;
  if (!v||v<500||v>5000) { showToast('Enter a valid distance'); return; }
  DB.set('cooper_best', v);
  DB.push('cooper_history', { date: today(), meters: v });
  showToast('Cooper updated: ' + v + 'm');
  renderRun(); renderHome();
}

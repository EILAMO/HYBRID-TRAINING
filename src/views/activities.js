function renderActivities() {
  var el = document.getElementById('view-activities');
  if (!el) return;
  var activities = DB.getArr('activities').slice(-20).reverse();

  var recentHTML = activities.length ? activities.map(function(a, i) {
    var realIdx = DB.getArr('activities').length - 1 - i;
    return '<div class="hist-row" style="align-items:flex-start;">' +
      '<div style="flex:1;">' +
        '<div class="hist-name">' + a.sport + '</div>' +
        '<div class="hist-date">' + formatDate(a.date) + (a.notes ? ' · ' + a.notes : '') + '</div>' +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0;">' +
        (a.duration ? '<div class="hist-vol">' + a.duration + ' min</div>' : '') +
        (a.kcal ? '<div class="hist-sets">' + a.kcal + ' kcal</div>' : '') +
        '<div style="margin-top:4px;"><button onclick="deleteActivity(' + realIdx + ')" style="font-size:10px;color:var(--text3);background:none;border:none;cursor:pointer;">✕</button></div>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="empty-state"><div class="empty-icon">🎾</div><div class="empty-text">No activities logged yet.<br>Add your first activity below.</div></div>';

  // Weekly summary
  var now = new Date();
  var weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  var wS = weekStart.toISOString().split('T')[0];
  var weekActivities = DB.getArr('activities').filter(function(a) { return a.date >= wS; });
  var weekMins = weekActivities.reduce(function(acc, a) { return acc + (a.duration || 0); }, 0);
  var weekKcal = weekActivities.reduce(function(acc, a) { return acc + (a.kcal || 0); }, 0);

  el.innerHTML =
    '<div class="page-header">' +
      '<div class="page-title">Activities</div>' +
      '<div class="page-sub">All sports & training</div>' +
    '</div>' +

    '<div class="section-lbl">This Week</div>' +
    '<div class="metric-grid fade-up">' +
      '<div class="metric"><div class="metric-val gold">' + weekActivities.length + '</div><div class="metric-lbl">Sessions</div></div>' +
      '<div class="metric"><div class="metric-val">' + weekMins + '</div><div class="metric-lbl">Minutes</div></div>' +
      '<div class="metric"><div class="metric-val green">' + weekKcal + '</div><div class="metric-lbl">kcal</div></div>' +
    '</div>' +

    '<div class="section-lbl">Log Activity</div>' +
    '<div style="padding:0 14px;">' +

      // Sport name
      '<div style="margin-bottom:10px;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Sport / Activity</div>' +
        '<input class="field-inp" type="text" id="act-sport" placeholder="e.g. Tennis, Swimming, Cycling..." style="width:100%;">' +
      '</div>' +

      // Quick sport buttons
      '<div style="display:flex;gap:7px;overflow-x:auto;margin-bottom:12px;padding-bottom:2px;scrollbar-width:none;">' +
        ['Tennis','Football','Swimming','Cycling','Basketball','Padel','Hiking','Yoga'].map(function(s) {
          return '<div style="flex-shrink:0;background:var(--bg3);border:.5px solid var(--border2);border-radius:20px;padding:6px 14px;font-size:11px;color:var(--text2);cursor:pointer;" onclick="setActivitySport(\'' + s + '\')">' + s + '</div>';
        }).join('') +
      '</div>' +

      // Duration + kcal
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
        '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Duration (min)</div>' +
        '<input class="field-inp" type="number" inputmode="numeric" id="act-duration" placeholder="60" style="width:100%;"></div>' +
        '<div><div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Calories (optional)</div>' +
        '<input class="field-inp" type="number" inputmode="numeric" id="act-kcal" placeholder="0" style="width:100%;"></div>' +
      '</div>' +

      // Notes
      '<div style="margin-bottom:12px;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Notes</div>' +
        '<input class="field-inp" type="text" id="act-notes" placeholder="e.g. Won 2-1, felt great..." style="width:100%;">' +
      '</div>' +

      // Screenshot upload
      '<div style="background:var(--bg2);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Upload Screenshot (optional)</div>' +
        '<label style="display:block;background:var(--bg3);border:.5px dashed var(--border2);border-radius:9px;padding:16px;text-align:center;cursor:pointer;">' +
          '<input type="file" accept="image/*" id="act-img-input" style="display:none;" onchange="previewActivityImage(this)">' +
          '<div id="act-img-preview" style="color:var(--text3);font-size:12px;">' +
            '<div style="font-size:24px;margin-bottom:4px;">📷</div>Tap to add screenshot from Sports Tracker / Strava' +
          '</div>' +
        '</label>' +
        '<div id="act-img-info" style="display:none;margin-top:8px;font-size:11px;color:var(--text3);">Screenshot added — send it in chat to log stats automatically.</div>' +
      '</div>' +

      // Effort
      '<div style="margin-bottom:14px;">' +
        '<div style="font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Effort (1–5)</div>' +
        '<div style="display:flex;gap:8px;">' +
          ['😴','😌','😐','😓','🔥'].map(function(e, i) {
            return '<div class="fat-btn" id="act-fat-' + (i+1) + '" onclick="selectActFat(' + (i+1) + ')">' + e + '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<button class="btn btn-primary" style="width:100%;margin:0 0 16px;" onclick="saveActivity()">Save Activity</button>' +
    '</div>' +

    '<div class="section-lbl">Recent Activities</div>' +
    '<div class="card fade-up" style="padding:0;">' + recentHTML + '</div>';
}

var actFat = 3;

function setActivitySport(name) {
  var inp = document.getElementById('act-sport');
  if (inp) inp.value = name;
}

function selectActFat(v) {
  actFat = v;
  for (var i = 1; i <= 5; i++) {
    var b = document.getElementById('act-fat-' + i);
    if (b) b.classList.toggle('sel', i === v);
  }
}

function previewActivityImage(input) {
  if (!input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var p = document.getElementById('act-img-preview');
    if (p) p.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%;max-height:160px;border-radius:8px;object-fit:contain;">';
    var d = document.getElementById('act-img-info');
    if (d) d.style.display = 'block';
  };
  reader.readAsDataURL(input.files[0]);
}

function saveActivity() {
  var sportInp = document.getElementById('act-sport');
  var durInp = document.getElementById('act-duration');
  var kcalInp = document.getElementById('act-kcal');
  var notesInp = document.getElementById('act-notes');

  var sport = sportInp ? sportInp.value.trim() : '';
  var duration = durInp ? parseInt(durInp.value) : 0;
  var kcal = kcalInp ? parseInt(kcalInp.value) : 0;
  var notes = notesInp ? notesInp.value.trim() : '';

  if (!sport) { showToast('Enter a sport or activity name'); return; }
  if (!duration || duration <= 0) { showToast('Enter duration in minutes'); return; }

  DB.push('activities', {
    sport: sport,
    date: today(),
    duration: duration,
    kcal: kcal || 0,
    notes: notes,
    effort: actFat,
  });

  // Clear form
  if (sportInp) sportInp.value = '';
  if (durInp) durInp.value = '';
  if (kcalInp) kcalInp.value = '';
  if (notesInp) notesInp.value = '';
  var preview = document.getElementById('act-img-preview');
  if (preview) preview.innerHTML = '<div style="font-size:24px;margin-bottom:4px;">📷</div>Tap to add screenshot from Sports Tracker / Strava';
  var info = document.getElementById('act-img-info');
  if (info) info.style.display = 'none';
  actFat = 3;

  showToast(sport + ' logged!');
  renderActivities();
  renderHome();
}

function deleteActivity(idx) {
  var activities = DB.getArr('activities');
  activities.splice(idx, 1);
  DB.set('activities', activities);
  renderActivities();
}

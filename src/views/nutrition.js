var todayMeals = [];
var favFoods = [];

function renderNutrition() {
  var el = document.getElementById('view-nutrition');
  if (!el) return;
  todayMeals = DB.get('nutrition_meals_' + today()) || [];
  favFoods = DB.getArr('fav_foods');
  var T = USER.targets;
  var totals = calcTotals(todayMeals);
  var calPct  = Math.min(100, Math.round(totals.kcal / T.kcal * 100));
  var protPct = Math.min(100, Math.round(totals.protein / T.protein * 100));
  var carbPct = Math.min(100, Math.round(totals.carbs / T.carbs * 100));
  var fatPct  = Math.min(100, Math.round(totals.fat / T.fat * 100));

  var favHTML = '';
  if (favFoods.length) {
    favHTML = '<div class="section-lbl">Favourites</div>' +
      '<div style="overflow-x:auto;padding:0 14px 8px;display:flex;gap:8px;scrollbar-width:none;">' +
      favFoods.map(function(f, i) {
        return '<div style="flex-shrink:0;background:var(--bg3);border:.5px solid var(--border2);border-radius:10px;padding:10px 14px;cursor:pointer;min-width:110px;" onclick="addFavourite(' + i + ')">' +
          '<div style="font-size:13px;font-weight:500;margin-bottom:2px;">' + f.name + '</div>' +
          '<div style="font-size:10px;color:var(--text3);">' + f.kcal + 'kcal · ' + f.protein + 'g P</div>' +
          '<div style="font-size:9px;color:var(--gold);margin-top:4px;">Tap to add</div>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  var mealsHTML = todayMeals.length ? todayMeals.map(function(m, i) {
    return '<div class="meal-row">' +
      '<div style="flex:1;">' +
        '<div class="meal-name">' + m.name + '</div>' +
        '<div class="meal-macros">' + m.protein + 'g P · ' + m.carbs + 'g C · ' + m.fat + 'g F</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div class="meal-kcal">' + m.kcal + ' kcal</div>' +
        '<button style="font-size:16px;color:var(--text3);background:none;border:none;cursor:pointer;" onclick="deleteMeal(' + i + ')">✕</button>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="empty-state"><div class="empty-icon">🥗</div><div class="empty-text">No meals logged today.<br>Add food below.</div></div>';

  el.innerHTML =
    '<div class="page-header">' +
      '<div class="page-title">Nutrition</div>' +
      '<div class="page-sub">' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' · Auto-calculated from your weight</div>' +
    '</div>' +

    '<div class="section-lbl">Daily Targets</div>' +
    '<div class="card fade-up">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">' +
        '<div style="font-size:11px;color:var(--text3);">Calories</div>' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:13px;">' + totals.kcal + ' / ' + T.kcal + ' kcal</div>' +
      '</div>' +
      '<div class="macro-track" style="height:7px;margin-bottom:16px;"><div class="macro-fill cal" style="width:' + calPct + '%"></div></div>' +
      '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;color:var(--text2);">Protein</span><span style="font-size:12px;font-family:\'DM Mono\',monospace;">' + totals.protein + 'g / ' + T.protein + 'g</span></div>' +
        '<div class="macro-track"><div class="macro-fill prot" style="width:' + protPct + '%"></div></div>' +
      '</div>' +
      '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;color:var(--text2);">Carbs</span><span style="font-size:12px;font-family:\'DM Mono\',monospace;">' + totals.carbs + 'g / ' + T.carbs + 'g</span></div>' +
        '<div class="macro-track"><div class="macro-fill carb" style="width:' + carbPct + '%"></div></div>' +
      '</div>' +
      '<div>' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-size:12px;color:var(--text2);">Fat</span><span style="font-size:12px;font-family:\'DM Mono\',monospace;">' + totals.fat + 'g / ' + T.fat + 'g</span></div>' +
        '<div class="macro-track"><div class="macro-fill fat" style="width:' + fatPct + '%"></div></div>' +
      '</div>' +
    '</div>' +

    '<div class="section-lbl">Add Food</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 14px;margin-bottom:8px;">' +
      '<button class="btn btn-primary btn-sm" style="width:auto;margin:0;" onclick="openScanModal()">📷 Scan</button>' +
      '<button class="btn btn-secondary btn-sm" style="width:auto;margin:0;" onclick="openManualModal()">✏️ Manual</button>' +
    '</div>' +
    '<div style="padding:0 14px;margin-bottom:12px;">' +
      '<button class="btn btn-secondary" style="margin:0;width:100%;" onclick="openSearchModal()">🔍 Search by Product Name</button>' +
    '</div>' +

    favHTML +

    '<div class="section-lbl">Today\'s Meals</div>' +
    '<div class="card fade-up" style="padding:0;">' + mealsHTML + '</div>' +

    '<div class="section-lbl">Remaining</div>' +
    '<div class="metric-grid fade-up">' +
      '<div class="metric"><div class="metric-val ' + (T.kcal-totals.kcal<0?'red':'gold') + '">' + (T.kcal-totals.kcal) + '</div><div class="metric-lbl">kcal left</div></div>' +
      '<div class="metric"><div class="metric-val ' + (T.protein-totals.protein<0?'red':'green') + '">' + (T.protein-totals.protein) + 'g</div><div class="metric-lbl">protein left</div></div>' +
      '<div class="metric"><div class="metric-val">' + (T.carbs-totals.carbs) + 'g</div><div class="metric-lbl">carbs left</div></div>' +
    '</div>';
}

function calcTotals(meals) {
  return meals.reduce(function(acc, m) {
    return {
      kcal: acc.kcal + (m.kcal||0),
      protein: Math.round((acc.protein + (m.protein||0))*10)/10,
      carbs: Math.round((acc.carbs + (m.carbs||0))*10)/10,
      fat: Math.round((acc.fat + (m.fat||0))*10)/10,
    };
  }, { kcal:0, protein:0, carbs:0, fat:0 });
}

function saveMeal(meal) {
  todayMeals = DB.get('nutrition_meals_' + today()) || [];
  todayMeals.push(meal);
  DB.set('nutrition_meals_' + today(), todayMeals);
  DB.set('nutrition_' + today(), calcTotals(todayMeals));
  closeModal();
  renderNutrition();
  renderHome();
  showToast('Added: ' + meal.name);
}

function deleteMeal(i) {
  todayMeals.splice(i, 1);
  DB.set('nutrition_meals_' + today(), todayMeals);
  DB.set('nutrition_' + today(), calcTotals(todayMeals));
  renderNutrition();
  renderHome();
}

function addFavourite(i) {
  var f = favFoods[i];
  if (!f) return;
  openModal(
    '<div class="modal-handle"></div>' +
    '<div style="padding:0 18px 20px;">' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:16px;">' + f.name + '</div>' +
      '<div class="field" style="padding:0;margin-bottom:12px;">' +
        '<div class="field-lbl">Amount (g)</div>' +
        '<input class="field-inp" type="number" inputmode="numeric" id="fav-amount" value="100">' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:16px;">Per 100g: ' + f.kcal + 'kcal · ' + f.protein + 'g P · ' + f.carbs + 'g C · ' + f.fat + 'g F</div>' +
      '<button class="btn btn-primary" onclick="addFavAmounted(' + i + ')">Add to Today</button>' +
    '</div>'
  );
}

function addFavAmounted(i) {
  var f = favFoods[i];
  var amount = parseFloat(document.getElementById('fav-amount').value) || 100;
  var r = amount / 100;
  saveMeal({
    name: f.name + ' (' + amount + 'g)',
    kcal: Math.round(f.kcal * r),
    protein: Math.round(f.protein * r * 10)/10,
    carbs: Math.round(f.carbs * r * 10)/10,
    fat: Math.round(f.fat * r * 10)/10,
  });
}

function openManualModal() {
  openModal(
    '<div class="modal-handle"></div>' +
    '<div style="padding:0 18px 20px;">' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:16px;">Add Food</div>' +
      '<div class="field" style="padding:0;margin-bottom:10px;"><div class="field-lbl">Food Name</div><input class="field-inp" type="text" id="m-name" placeholder="e.g. Chicken breast"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
        '<div class="field" style="padding:0;"><div class="field-lbl">Calories (kcal)</div><input class="field-inp" type="number" inputmode="numeric" id="m-kcal" placeholder="0"></div>' +
        '<div class="field" style="padding:0;"><div class="field-lbl">Protein (g)</div><input class="field-inp" type="number" inputmode="decimal" id="m-prot" placeholder="0"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">' +
        '<div class="field" style="padding:0;"><div class="field-lbl">Carbs (g)</div><input class="field-inp" type="number" inputmode="decimal" id="m-carb" placeholder="0"></div>' +
        '<div class="field" style="padding:0;"><div class="field-lbl">Fat (g)</div><input class="field-inp" type="number" inputmode="decimal" id="m-fat" placeholder="0"></div>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;">' +
        '<input type="checkbox" id="m-fav" style="width:18px;height:18px;">' +
        '<span style="font-size:13px;color:var(--text2);">Save to favourites</span>' +
      '</label>' +
      '<button class="btn btn-primary" onclick="submitManual()">Add to Today</button>' +
    '</div>'
  );
}

function submitManual() {
  var name = document.getElementById('m-name').value.trim();
  var kcal = parseInt(document.getElementById('m-kcal').value) || 0;
  var prot = parseFloat(document.getElementById('m-prot').value) || 0;
  var carb = parseFloat(document.getElementById('m-carb').value) || 0;
  var fat  = parseFloat(document.getElementById('m-fat').value) || 0;
  var fav  = document.getElementById('m-fav').checked;
  if (!name) { showToast('Enter a food name'); return; }
  if (fav) {
    var favs = DB.getArr('fav_foods');
    favs.push({ name:name, kcal:kcal, protein:prot, carbs:carb, fat:fat });
    DB.set('fav_foods', favs);
  }
  saveMeal({ name:name, kcal:kcal, protein:prot, carbs:carb, fat:fat });
}

// ─── BARCODE SCANNER ──────────────────────────────────────────────────
var scannerActive = false;
var scannerStream = null;

function openScanModal() {
  openModal(
    '<div class="modal-handle"></div>' +
    '<div style="padding:0 18px 20px;">' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:6px;">Scan Barcode</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Point camera at barcode on product</div>' +
      '<div style="position:relative;background:#000;border-radius:12px;overflow:hidden;margin-bottom:14px;height:220px;">' +
        '<video id="scan-video" style="width:100%;height:220px;object-fit:cover;" autoplay playsinline muted></video>' +
        '<canvas id="scan-canvas" style="display:none;"></canvas>' +
        '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">' +
          '<div style="width:220px;height:80px;border:2px solid var(--gold);border-radius:8px;opacity:.8;"></div>' +
        '</div>' +
        '<div id="scan-status" style="position:absolute;bottom:10px;left:0;right:0;text-align:center;font-size:11px;color:#fff;background:rgba(0,0,0,.5);padding:4px;">Starting camera...</div>' +
      '</div>' +
      '<div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:14px;">Or enter barcode manually:</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px;gap:8px;margin-bottom:14px;">' +
        '<input class="field-inp" type="number" inputmode="numeric" id="scan-code" placeholder="EAN barcode number">' +
        '<button class="btn btn-secondary btn-sm" style="margin:0;height:46px;" onclick="lookupBarcode()">Search</button>' +
      '</div>' +
      '<div id="scan-result"></div>' +
    '</div>'
  );
  setTimeout(startScanner, 300);
}

function startScanner() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    document.getElementById('scan-status').textContent = 'Camera not available — use manual entry';
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(function(stream) {
      scannerStream = stream;
      scannerActive = true;
      var video = document.getElementById('scan-video');
      if (!video) { stopScanner(); return; }
      video.srcObject = stream;
      video.play();
      document.getElementById('scan-status').textContent = 'Point at barcode...';
      scanFrame();
    })
    .catch(function(err) {
      var s = document.getElementById('scan-status');
      if (s) s.textContent = 'Camera denied — use manual entry below';
    });
}

function stopScanner() {
  scannerActive = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach(function(t){ t.stop(); });
    scannerStream = null;
  }
}

function scanFrame() {
  if (!scannerActive) return;
  var video = document.getElementById('scan-video');
  var canvas = document.getElementById('scan-canvas');
  if (!video || !canvas || video.readyState !== 4) {
    setTimeout(scanFrame, 200);
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  // Use BarcodeDetector if available (Chrome Android, some iOS)
  if (window.BarcodeDetector) {
    var detector = new BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128'] });
    detector.detect(canvas)
      .then(function(codes) {
        if (codes.length > 0) {
          var code = codes[0].rawValue;
          stopScanner();
          document.getElementById('scan-status').textContent = 'Found: ' + code;
          var inp = document.getElementById('scan-code');
          if (inp) inp.value = code;
          lookupBarcode();
        } else {
          if (scannerActive) setTimeout(scanFrame, 300);
        }
      })
      .catch(function() {
        if (scannerActive) setTimeout(scanFrame, 300);
      });
  } else {
    // BarcodeDetector not available — show message
    var s = document.getElementById('scan-status');
    if (s) s.textContent = 'Auto-scan not supported on this browser — enter barcode below';
    scannerActive = false;
  }
}

// Stop scanner when modal closes
var origCloseModal = closeModal;
closeModal = function() {
  stopScanner();
  origCloseModal();
};

async function lookupBarcode() {
  var inp = document.getElementById('scan-code');
  var code = inp ? inp.value.trim() : '';
  if (!code) { showToast('Enter a barcode'); return; }
  var resultEl = document.getElementById('scan-result');
  if (resultEl) resultEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:16px;">Searching...</div>';
  try {
    var res = await fetch('https://world.openfoodfacts.org/api/v0/product/' + code + '.json');
    var data = await res.json();
    if (data.status !== 1 || !data.product) {
      if (resultEl) resultEl.innerHTML = '<div style="color:var(--red);font-size:13px;padding:8px 0;">Product not found. Try manual entry.</div>';
      return;
    }
    var p = data.product;
    var n = p.nutriments;
    var name = p.product_name || p.product_name_fi || 'Unknown product';
    var kcal = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
    var prot = Math.round((n['proteins_100g']||0)*10)/10;
    var carb = Math.round((n['carbohydrates_100g']||0)*10)/10;
    var fat  = Math.round((n['fat_100g']||0)*10)/10;
    if (resultEl) resultEl.innerHTML =
      '<div style="background:var(--bg3);border:.5px solid var(--border2);border-radius:11px;padding:14px;">' +
        '<div style="font-size:14px;font-weight:500;margin-bottom:4px;">' + name + '</div>' +
        '<div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Per 100g: ' + kcal + 'kcal · ' + prot + 'g P · ' + carb + 'g C · ' + fat + 'g F</div>' +
        '<div class="field" style="padding:0;margin-bottom:12px;">' +
          '<div class="field-lbl">Amount (g)</div>' +
          '<input class="field-inp" type="number" inputmode="numeric" id="scan-amount" value="100">' +
        '</div>' +
        '<label style="display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer;">' +
          '<input type="checkbox" id="scan-fav" style="width:18px;height:18px;">' +
          '<span style="font-size:13px;color:var(--text2);">Save to favourites</span>' +
        '</label>' +
        '<button class="btn btn-primary" onclick="addScannedProduct(\'' + name.replace(/'/g,"\\'") + '\',' + kcal + ',' + prot + ',' + carb + ',' + fat + ')">Add to Today</button>' +
      '</div>';
  } catch(e) {
    if (resultEl) resultEl.innerHTML = '<div style="color:var(--red);font-size:13px;">Network error. Check connection.</div>';
  }
}

function addScannedProduct(name, kcal100, prot100, carb100, fat100) {
  var amount = parseFloat(document.getElementById('scan-amount').value) || 100;
  var fav = document.getElementById('scan-fav').checked;
  var r = amount / 100;
  var meal = {
    name: name + ' (' + amount + 'g)',
    kcal: Math.round(kcal100 * r),
    protein: Math.round(prot100 * r * 10)/10,
    carbs: Math.round(carb100 * r * 10)/10,
    fat: Math.round(fat100 * r * 10)/10,
  };
  if (fav) {
    var favs = DB.getArr('fav_foods');
    favs.push({ name:name, kcal:kcal100, protein:prot100, carbs:carb100, fat:fat100 });
    DB.set('fav_foods', favs);
  }
  saveMeal(meal);
}

// ─── FOOD NAME SEARCH ─────────────────────────────────────────────────
function openSearchModal() {
  openModal(
    '<div class="modal-handle"></div>' +
    '<div style="padding:0 18px 20px;">' +
      '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:6px;">Search Food</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-bottom:14px;">Search by product name — Finnish products included</div>' +
      '<div style="display:grid;grid-template-columns:1fr 80px;gap:8px;margin-bottom:14px;">' +
        '<input class="field-inp" type="text" id="food-search-inp" placeholder="e.g. Atria kanafile" onkeydown="if(event.key===\'Enter\')searchFood()">' +
        '<button class="btn btn-primary btn-sm" style="margin:0;height:46px;" onclick="searchFood()">Search</button>' +
      '</div>' +
      '<div id="food-search-results"></div>' +
    '</div>'
  );
  setTimeout(function() {
    var inp = document.getElementById('food-search-inp');
    if (inp) inp.focus();
  }, 300);
}

async function searchFood() {
  var inp = document.getElementById('food-search-inp');
  var query = inp ? inp.value.trim() : '';
  if (!query) { showToast('Enter a product name'); return; }
  var resultsEl = document.getElementById('food-search-results');
  if (resultsEl) resultsEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:16px;">Searching...</div>';

  try {
    var url = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' +
      encodeURIComponent(query) +
      '&search_simple=1&action=process&json=1&page_size=8&lc=fi,en&fields=product_name,product_name_fi,nutriments,code';
    var res = await fetch(url);
    var data = await res.json();
    var products = (data.products || []).filter(function(p) {
      var n = p.nutriments;
      return p.product_name && n && (n['energy-kcal_100g'] || n['energy-kcal']);
    });

    if (!products.length) {
      if (resultsEl) resultsEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:8px 0;">No results found. Try a different name or use barcode.</div>';
      return;
    }

    if (resultsEl) resultsEl.innerHTML =
      '<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">' + products.length + ' results</div>' +
      products.map(function(p, i) {
        var n = p.nutriments;
        var name = p.product_name_fi || p.product_name || 'Unknown';
        var kcal = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
        var prot = Math.round((n['proteins_100g']||0)*10)/10;
        var carb = Math.round((n['carbohydrates_100g']||0)*10)/10;
        var fat  = Math.round((n['fat_100g']||0)*10)/10;
        return '<div style="background:var(--bg3);border:.5px solid var(--border2);border-radius:11px;padding:14px;margin-bottom:8px;cursor:pointer;" onclick="selectSearchResult(\'' +
          name.replace(/'/g,"\\'").replace(/"/g,'&quot;') + '\',' + kcal + ',' + prot + ',' + carb + ',' + fat + ')">' +
          '<div style="font-size:13px;font-weight:500;margin-bottom:4px;">' + name + '</div>' +
          '<div style="font-size:11px;color:var(--text3);">Per 100g: ' + kcal + ' kcal · ' + prot + 'g P · ' + carb + 'g C · ' + fat + 'g F</div>' +
        '</div>';
      }).join('');
  } catch(e) {
    if (resultsEl) resultsEl.innerHTML = '<div style="color:var(--red);font-size:13px;">Network error. Check connection.</div>';
  }
}

function selectSearchResult(name, kcal100, prot100, carb100, fat100) {
  var resultsEl = document.getElementById('food-search-results');
  if (resultsEl) resultsEl.innerHTML =
    '<div style="background:var(--bg3);border:.5px solid var(--border2);border-radius:11px;padding:14px;">' +
      '<div style="font-size:14px;font-weight:500;margin-bottom:4px;">' + name + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Per 100g: ' + kcal100 + 'kcal · ' + prot100 + 'g P · ' + carb100 + 'g C · ' + fat100 + 'g F</div>' +
      '<div class="field" style="padding:0;margin-bottom:12px;">' +
        '<div class="field-lbl">Amount (g)</div>' +
        '<input class="field-inp" type="number" inputmode="numeric" id="search-amount" value="100" placeholder="100">' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer;">' +
        '<input type="checkbox" id="search-fav" style="width:18px;height:18px;">' +
        '<span style="font-size:13px;color:var(--text2);">Save to favourites</span>' +
      '</label>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
        '<button class="btn btn-secondary btn-sm" style="margin:0;" onclick="openSearchModal()">← Back</button>' +
        '<button class="btn btn-primary btn-sm" style="margin:0;" onclick="addSearchedProduct(\'' + name.replace(/'/g,"\\'") + '\',' + kcal100 + ',' + prot100 + ',' + carb100 + ',' + fat100 + ')">Add to Today</button>' +
      '</div>' +
    '</div>';
}

function addSearchedProduct(name, kcal100, prot100, carb100, fat100) {
  var amount = parseFloat(document.getElementById('search-amount').value) || 100;
  var fav = document.getElementById('search-fav').checked;
  var r = amount / 100;
  var meal = {
    name: name + ' (' + amount + 'g)',
    kcal: Math.round(kcal100 * r),
    protein: Math.round(prot100 * r * 10)/10,
    carbs: Math.round(carb100 * r * 10)/10,
    fat: Math.round(fat100 * r * 10)/10,
  };
  if (fav) {
    var favs = DB.getArr('fav_foods');
    favs.push({ name:name, kcal:kcal100, protein:prot100, carbs:carb100, fat:fat100 });
    DB.set('fav_foods', favs);
  }
  saveMeal(meal);
}

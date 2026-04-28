let todayMeals = [];
let favFoods = [];

function renderNutrition() {
  const el = document.getElementById('view-nutrition');
  todayMeals = DB.get('nutrition_meals_' + today()) || [];
  favFoods = DB.getArr('fav_foods');

  const totals = calcTotals(todayMeals);
  const T = USER.targets;

  const calPct  = Math.min(100, Math.round(totals.kcal / T.kcal * 100));
  const protPct = Math.min(100, Math.round(totals.protein / T.protein * 100));
  const carbPct = Math.min(100, Math.round(totals.carbs / T.carbs * 100));
  const fatPct  = Math.min(100, Math.round(totals.fat / T.fat * 100));

  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Nutrition</div>
      <div class="page-sub">${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
    </div>

    <div class="section-lbl">Daily Targets</div>
    <div class="card fade-up">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--text3);">Calories</div>
        <div style="font-family:'DM Mono',monospace;font-size:13px;">${totals.kcal} / ${T.kcal} kcal</div>
      </div>
      <div class="macro-track" style="height:7px;margin-bottom:16px;">
        <div class="macro-fill cal" style="width:${calPct}%"></div>
      </div>
      <div class="macro-bars">
        ${[
          ['Protein', totals.protein, T.protein, 'prot', protPct, 'g'],
          ['Carbs',   totals.carbs,   T.carbs,   'carb', carbPct, 'g'],
          ['Fat',     totals.fat,     T.fat,     'fat',  fatPct,  'g'],
        ].map(([name,cur,tgt,cls,pct,u]) => `
          <div class="macro-bar" style="margin-bottom:10px;">
            <div class="macro-bar-lbl">
              <span>${name}</span>
              <span>${cur}${u} / ${tgt}${u}</span>
            </div>
            <div class="macro-track"><div class="macro-fill ${cls}" style="width:${pct}%"></div></div>
          </div>`).join('')}
      </div>
    </div>

    <div class="section-lbl">Add Food</div>
    <div style="display:flex;gap:8px;padding:0 14px;margin-bottom:12px;">
      <button class="btn btn-secondary btn-sm" style="flex:1;width:auto;margin:0;" onclick="openScanModal()">📷 &nbsp;Scan Barcode</button>
      <button class="btn btn-secondary btn-sm" style="flex:1;width:auto;margin:0;" onclick="openManualModal()">✏️ &nbsp;Manual Entry</button>
    </div>
    ${favFoods.length ? `
    <div class="section-lbl">Favourites</div>
    <div style="overflow-x:auto;padding:0 14px 8px;display:flex;gap:8px;scrollbar-width:none;">
      ${favFoods.map((f,i) => `
        <div style="flex-shrink:0;background:var(--bg3);border:.5px solid var(--border2);border-radius:10px;padding:10px 14px;cursor:pointer;min-width:110px;" onclick="addFavourite(${i})">
          <div style="font-size:13px;font-weight:500;margin-bottom:2px;">${f.name}</div>
          <div style="font-size:10px;color:var(--text3);">${f.kcal}kcal · ${f.protein}g P</div>
          <div style="font-size:9px;color:var(--gold);margin-top:4px;">Tap to add</div>
        </div>`).join('')}
    </div>` : ''}

    <div class="section-lbl">Today's Meals</div>
    <div class="card fade-up" style="padding:0;">
      ${todayMeals.length ? todayMeals.map((m,i) => `
        <div class="meal-row">
          <div style="flex:1;">
            <div class="meal-name">${m.name}</div>
            <div class="meal-macros">${m.protein}g P · ${m.carbs}g C · ${m.fat}g F</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="meal-kcal">${m.kcal} kcal</div>
            <button class="meal-del" onclick="deleteMeal(${i})">✕</button>
          </div>
        </div>`).join('') :
        `<div class="empty-state"><div class="empty-icon">🥗</div><div class="empty-text">No meals logged today.<br>Add food above.</div></div>`}
    </div>
    <div class="section-lbl">Remaining</div>
    <div class="metric-grid fade-up">
      <div class="metric"><div class="metric-val ${T.kcal-totals.kcal<0?'red':'gold'}">${T.kcal-totals.kcal}</div><div class="metric-lbl">kcal left</div></div>
      <div class="metric"><div class="metric-val ${T.protein-totals.protein<0?'red':'green'}">${T.protein-totals.protein}g</div><div class="metric-lbl">protein left</div></div>
      <div class="metric"><div class="metric-val">${T.carbs-totals.carbs}g</div><div class="metric-lbl">carbs left</div></div>
    </div>
  `;
}

function calcTotals(meals) {
  return meals.reduce((acc, m) => ({
    kcal: acc.kcal + (m.kcal||0),
    protein: acc.protein + (m.protein||0),
    carbs: acc.carbs + (m.carbs||0),
    fat: acc.fat + (m.fat||0),
  }), { kcal:0, protein:0, carbs:0, fat:0 });
}

function saveMeal(meal) {
  todayMeals = DB.get('nutrition_meals_' + today()) || [];
  todayMeals.push(meal);
  DB.set('nutrition_meals_' + today(), todayMeals);
  const totals = calcTotals(todayMeals);
  DB.set('nutrition_' + today(), totals);
  closeModal();
  renderNutrition();
  renderHome();
  showToast(`Added: ${meal.name}`);
}

function deleteMeal(i) {
  todayMeals.splice(i, 1);
  DB.set('nutrition_meals_' + today(), todayMeals);
  DB.set('nutrition_' + today(), calcTotals(todayMeals));
  renderNutrition();
  renderHome();
}

function addFavourite(i) {
  const f = favFoods[i];
  if (!f) return;
  openModal(`
    <div class="modal-handle"></div>
    <div style="padding:0 18px 20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:16px;">${f.name}</div>
      <div class="field" style="padding:0;margin-bottom:16px;">
        <div class="field-lbl">Amount (g)</div>
        <input class="field-inp" type="number" inputmode="numeric" id="fav-amount" value="100" placeholder="100">
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:16px;">Per 100g: ${f.kcal}kcal · ${f.protein}g P · ${f.carbs}g C · ${f.fat}g F</div>
      <button class="btn btn-primary" onclick="addFavAmounted(${i})">Add to Today</button>
    </div>
  `);
}

function addFavAmounted(i) {
  const f = favFoods[i];
  const amount = parseFloat(document.getElementById('fav-amount')?.value) || 100;
  const ratio = amount / 100;
  saveMeal({
    name: `${f.name} (${amount}g)`,
    kcal: Math.round(f.kcal * ratio),
    protein: Math.round(f.protein * ratio),
    carbs: Math.round(f.carbs * ratio),
    fat: Math.round(f.fat * ratio),
  });
}

function openManualModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div style="padding:0 18px 20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:16px;">Add Food</div>
      <div class="field" style="padding:0;margin-bottom:10px;">
        <div class="field-lbl">Food Name</div>
        <input class="field-inp" type="text" id="m-name" placeholder="e.g. Chicken breast">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div class="field" style="padding:0;"><div class="field-lbl">Calories (kcal)</div><input class="field-inp" type="number" inputmode="numeric" id="m-kcal" placeholder="0"></div>
        <div class="field" style="padding:0;"><div class="field-lbl">Protein (g)</div><input class="field-inp" type="number" inputmode="decimal" id="m-prot" placeholder="0"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <div class="field" style="padding:0;"><div class="field-lbl">Carbs (g)</div><input class="field-inp" type="number" inputmode="decimal" id="m-carb" placeholder="0"></div>
        <div class="field" style="padding:0;"><div class="field-lbl">Fat (g)</div><input class="field-inp" type="number" inputmode="decimal" id="m-fat" placeholder="0"></div>
      </div>
      <label style="display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;">
        <input type="checkbox" id="m-fav" style="width:18px;height:18px;">
        <span style="font-size:13px;color:var(--text2);">Save to favourites</span>
      </label>
      <button class="btn btn-primary" onclick="submitManual()">Add to Today</button>
    </div>
  `);
}

function submitManual() {
  const name  = document.getElementById('m-name')?.value?.trim();
  const kcal  = parseInt(document.getElementById('m-kcal')?.value) || 0;
  const prot  = parseFloat(document.getElementById('m-prot')?.value) || 0;
  const carb  = parseFloat(document.getElementById('m-carb')?.value) || 0;
  const fat   = parseFloat(document.getElementById('m-fat')?.value) || 0;
  const fav   = document.getElementById('m-fav')?.checked;
  if (!name) { showToast('Enter a food name'); return; }
  const meal = { name, kcal, protein: prot, carbs: carb, fat };
  if (fav) {
    const favs = DB.getArr('fav_foods');
    favs.push({ name, kcal, protein: prot, carbs: carb, fat });
    DB.set('fav_foods', favs);
  }
  saveMeal(meal);
}

function openScanModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div style="padding:0 18px 20px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;margin-bottom:6px;">Scan Barcode</div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:16px;">Enter barcode number from product packaging</div>
      <div class="field" style="padding:0;margin-bottom:12px;">
        <div class="field-lbl">Barcode (EAN)</div>
        <input class="field-inp" type="number" inputmode="numeric" id="scan-code" placeholder="e.g. 6415600014001">
      </div>
      <button class="btn btn-primary" onclick="lookupBarcode()">🔍 &nbsp;Look Up Product</button>
      <div id="scan-result" style="margin-top:16px;"></div>
    </div>
  `);
}

async function lookupBarcode() {
  const code = document.getElementById('scan-code')?.value?.trim();
  if (!code) { showToast('Enter a barcode'); return; }
  const resultEl = document.getElementById('scan-result');
  resultEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:16px;">Searching...</div>';
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      resultEl.innerHTML = '<div style="color:var(--red);font-size:13px;">Product not found. Try manual entry.</div>';
      return;
    }
    const p = data.product;
    const n = p.nutriments;
    const name = p.product_name || p.product_name_fi || 'Unknown product';
    const kcal = Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
    const prot = Math.round((n['proteins_100g'] || 0) * 10) / 10;
    const carb = Math.round((n['carbohydrates_100g'] || 0) * 10) / 10;
    const fat  = Math.round((n['fat_100g'] || 0) * 10) / 10;
    resultEl.innerHTML = `
      <div style="background:var(--bg3);border:.5px solid var(--border2);border-radius:11px;padding:14px;">
        <div style="font-size:14px;font-weight:500;margin-bottom:4px;">${name}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Per 100g: ${kcal}kcal · ${prot}g P · ${carb}g C · ${fat}g F</div>
        <div class="field" style="padding:0;margin-bottom:12px;">
          <div class="field-lbl">Amount (g)</div>
          <input class="field-inp" type="number" inputmode="numeric" id="scan-amount" value="100" placeholder="100">
        </div>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:12px;cursor:pointer;">
          <input type="checkbox" id="scan-fav" style="width:18px;height:18px;">
          <span style="font-size:13px;color:var(--text2);">Save to favourites</span>
        </label>
        <button class="btn btn-primary" onclick="addScannedProduct('${name.replace(/'/g,"\\'")}',${kcal},${prot},${carb},${fat})">Add to Today</button>
      </div>`;
  } catch(e) {
    resultEl.innerHTML = '<div style="color:var(--red);font-size:13px;">Network error. Check connection.</div>';
  }
}

function addScannedProduct(name, kcal100, prot100, carb100, fat100) {
  const amount = parseFloat(document.getElementById('scan-amount')?.value) || 100;
  const fav = document.getElementById('scan-fav')?.checked;
  const ratio = amount / 100;
  const meal = {
    name: `${name} (${amount}g)`,
    kcal: Math.round(kcal100 * ratio),
    protein: Math.round(prot100 * ratio * 10) / 10,
    carbs: Math.round(carb100 * ratio * 10) / 10,
    fat: Math.round(fat100 * ratio * 10) / 10,
  };
  if (fav) {
    const favs = DB.getArr('fav_foods');
    favs.push({ name, kcal: kcal100, protein: prot100, carbs: carb100, fat: fat100 });
    DB.set('fav_foods', favs);
  }
  saveMeal(meal);
}

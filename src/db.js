const DB = {
  _k: k => 'apex2_' + k,
  get(k) { try { return JSON.parse(localStorage.getItem(DB._k(k))); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(DB._k(k), JSON.stringify(v)); } catch {} },
  getArr(k) { return DB.get(k) || []; },
  push(k, item) { const a = DB.getArr(k); a.push(item); DB.set(k, a); return a; },
  del(k) { localStorage.removeItem(DB._k(k)); },
};

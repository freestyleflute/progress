/* Ernährung: Tagesübersicht, Mahlzeiten, Scanner, eigene Produkte. */
'use strict';

let foodDay = dayKey();
const MEAL_ICON = { breakfast: I.sun, lunch: I.bowl, dinner: I.moon, snack: I.apple };
const NUT_LABEL = {
  kcal: ['Kalorien', 'kcal'], protein: ['Protein', 'g'], carbs: ['Kohlenhydrate', 'g'], fat: ['Fett', 'g'],
  salt: ['Salz', 'g'], fiber: ['Ballaststoffe', 'g'], caffeine: ['Koffein', 'mg'],
};

function dayEntries(key) {
  const d = S.diary[key];
  if (!d) return { breakfast: [], lunch: [], dinner: [], snack: [] };
  return Object.assign({ breakfast: [], lunch: [], dinner: [], snack: [] }, d);
}
function entryNutrients(e) {
  const f = (e.grams || 0) / 100;
  const out = {};
  NUTRIENTS.forEach(k => { out[k] = (num(e.per100[k]) || 0) * f; });
  return out;
}
function sumEntries(list) {
  const t = Object.fromEntries(NUTRIENTS.map(k => [k, 0]));
  list.forEach(e => { const n = entryNutrients(e); NUTRIENTS.forEach(k => { t[k] += n[k]; }); });
  return t;
}
function dayTotals(key) {
  const d = dayEntries(key);
  return sumEntries(MEALS.flatMap(([m]) => d[m]));
}

function renderFood() {
  const v = document.getElementById('view');
  const g = S.settings.goals;
  const d = dayEntries(foodDay);
  const t = dayTotals(foodDay);
  const left = g.kcal - t.kcal;
  const over = left < 0;

  const macro = (k, color) => {
    const pct = g[k] ? t[k] / g[k] : 0;
    return `<div class="macro">
      <span class="name">${NUT_LABEL[k][0]}</span>
      <div class="bar-track"><div class="bar-fill ${pct > 1.05 ? 'over' : ''}" style="width:${clamp(pct, 0, 1) * 100}%;background:${color}"></div></div>
      <span class="val">${fmt(t[k])} / ${fmt(g[k])} g</span>
    </div>`;
  };
  const mini = (k) => {
    const [label, unit] = NUT_LABEL[k];
    const pct = g[k] ? t[k] / g[k] : 0;
    const dec = k === 'salt' ? 1 : 0;
    // Salz und Koffein sind Obergrenzen (rot bei Überschreitung), Ballaststoffe ein Mindestziel
    const isLimit = k !== 'fiber';
    return `<div class="mini-ring">
      <div class="ring ${isLimit && pct > 1 ? 'over' : ''}">${ringSVG(pct, 8, 74)}<div class="center"><b>${Math.round(pct * 100)}%</b></div></div>
      <span class="name">${label}</span>
      <span class="val">${fmt(t[k], dec)} / ${fmt(g[k], dec)} ${unit}</span>
    </div>`;
  };

  v.innerHTML = `
    <div class="head"><h1>Ernährung</h1><div class="actions"><button class="icon-btn" id="goalsBtn" aria-label="Ziele einstellen">${I.gear}</button></div></div>
    <div class="datenav">
      <button id="dPrev" aria-label="Vorheriger Tag">${I.left}</button>
      <span class="label">${prettyDay(foodDay)}</span>
      <button id="dNext" aria-label="Nächster Tag">${I.right}</button>
    </div>
    <section class="card">
      <div class="summary">
        <div class="side"><b>${fmt(t.kcal)}</b><span>Gegessen</span></div>
        <div class="ring ${over ? 'over' : ''}">${ringSVG(g.kcal ? t.kcal / g.kcal : 0)}
          <div class="center"><b>${fmt(Math.abs(left))}</b><span>${over ? 'kcal zu viel' : 'kcal übrig'}</span></div>
        </div>
        <div class="side"><b>${fmt(g.kcal)}</b><span>Ziel</span></div>
      </div>
      <div class="macros">
        ${macro('protein', 'var(--green)')}
        ${macro('carbs', 'var(--carb)')}
        ${macro('fat', 'var(--fat)')}
      </div>
    </section>
    <section class="card">
      <div class="card-title"><h2>Salz, Ballaststoffe & Koffein</h2></div>
      <div class="micro">${mini('salt')}${mini('fiber')}${mini('caffeine')}</div>
    </section>
    ${MEALS.map(([m, label]) => {
      const list = d[m];
      const mt = sumEntries(list);
      return `<section class="card meal">
        <div class="meal-head">
          <div class="meal-icon">${MEAL_ICON[m]}</div>
          <div class="t"><b>${label}</b><span>${list.length ? `${fmt(mt.kcal)} kcal · P ${fmt(mt.protein)} · K ${fmt(mt.carbs)} · F ${fmt(mt.fat)}` : 'Noch nichts eingetragen'}</span></div>
          <button class="add-btn" data-add="${m}" aria-label="${label} hinzufügen">${I.plus}</button>
        </div>
        ${list.length ? `<div class="entries">${list.map(e => {
          const n = entryNutrients(e);
          return `<button class="entry" data-entry="${m}:${e.id}">
            <div class="t"><b>${esc(e.name)}</b><span>${fmt(e.grams)} g${e.brand ? ' · ' + esc(e.brand) : ''}</span></div>
            <span class="k">${fmt(n.kcal)} kcal</span>
          </button>`;
        }).join('')}</div>
        <button class="btn small save-meal" data-savemeal="${m}">${I.bookmark}Als Mahlzeit speichern</button>` : ''}
      </section>`;
    }).join('')}
  `;

  $('#dPrev').onclick = () => { foodDay = addDays(foodDay, -1); renderFood(); };
  $('#dNext').onclick = () => { foodDay = addDays(foodDay, 1); renderFood(); };
  $('#goalsBtn').onclick = () => openSettings();
  $$('[data-add]').forEach(b => b.onclick = () => openAddFood(b.dataset.add));
  $$('[data-savemeal]').forEach(b => b.onclick = () => openSaveMeal(b.dataset.savemeal));
  $$('[data-entry]').forEach(b => b.onclick = () => {
    const [m, id] = b.dataset.entry.split(':');
    openEntry(m, id);
  });
}

/* ---------- Lebensmittel hinzufügen ---------- */
function openAddFood(meal) {
  const mealName = MEALS.find(x => x[0] === meal)[1];
  let mode = 'scan';
  const el = openSheet({
    title: `${mealName} hinzufügen`,
    body: `<div class="seg" id="addSeg">
        <button data-mode="scan">Scannen</button>
        <button data-mode="mine">Produkte</button>
        <button data-mode="meals">Mahlzeiten</button>
        <button data-mode="manual">Manuell</button>
      </div>
      <div id="addBody"></div>`,
    onClose: () => stopScanner(),
  });
  const body = el.querySelector('#addBody');
  const show = (m, auto = true) => {
    mode = m;
    $$('#addSeg button', el).forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    stopScanner();
    if (m === 'scan') renderScan(body, meal, el, auto);
    if (m === 'mine') renderMine(body, meal, el);
    if (m === 'meals') renderSavedMeals(body, meal, el);
    if (m === 'manual') openProductForm({ meal, product: null, parent: el });
  };
  $$('#addSeg button', el).forEach(b => b.onclick = () => {
    if (b.dataset.mode === 'manual') { openProductForm({ meal, product: null, parent: el }); return; }
    show(b.dataset.mode);
  });
  show(Object.keys(S.products).length ? 'mine' : 'scan', false);
}

/* Scanner: Vollbild-Kamera (scanner.js). Im Sheet gibt es Start, Foto und Eintippen. */
let activeScanner = null;
function stopScanner() {
  if (activeScanner) { activeScanner.close(); activeScanner = null; }
}

function renderScan(body, meal, sheetEl, autoStart = true) {
  body.innerHTML = `
    <button class="scan-start" id="scanStart">${I.barcode}<b>Barcode scannen</b><span>Kamera im Vollbild öffnen</span></button>
    <div class="row">
      <input class="input" id="codeInput" inputmode="numeric" pattern="[0-9]*" placeholder="Barcode eintippen" autocomplete="off">
      <button class="btn small primary" id="codeGo" style="flex:none">Suchen</button>
    </div>`;
  const start = () => {
    activeScanner = openScanner({
      onCode: (code) => { activeScanner = null; handleBarcode(code, meal, sheetEl); },
      onManual: () => { activeScanner = null; setTimeout(() => body.querySelector('#codeInput').focus(), 250); },
    });
  };
  body.querySelector('#scanStart').onclick = start;
  body.querySelector('#codeGo').onclick = () => {
    const code = normalizeCode(body.querySelector('#codeInput').value);
    if (code.length >= 6) handleBarcode(code, meal, sheetEl);
    else toast('Bitte einen gültigen Barcode eingeben');
  };
  loadZXing().catch(() => {});
  if (autoStart) start();
}

function findProductByBarcode(code) {
  return Object.values(S.products).find(p => p.barcode === code);
}

async function handleBarcode(code, meal, sheetEl) {
  const local = findProductByBarcode(code);
  if (local) { openProductForm({ meal, product: local, parent: sheetEl }); return; }
  toast('Suche Produkt …');
  try {
    const p = await fetchOFF(code);
    document.getElementById('toast').hidden = true;
    if (p) openProductForm({ meal, product: p, parent: sheetEl, isNew: true });
    else {
      toast('Nicht gefunden – bitte Werte von der Packung eintragen');
      openProductForm({ meal, product: { barcode: code, name: '', brand: '', per100: {} }, parent: sheetEl, isNew: true });
    }
  } catch (e) {
    toast('Keine Verbindung – bitte Werte manuell eintragen');
    openProductForm({ meal, product: { barcode: code, name: '', brand: '', per100: {} }, parent: sheetEl, isNew: true });
  }
}

async function fetchOFF(code) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_de,brands,nutriments,serving_quantity,quantity`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) {
    if (r.status === 404) return null;
    throw new Error('http ' + r.status);
  }
  const j = await r.json();
  if (j.status !== 1 || !j.product) return null;
  const p = j.product;
  const n = p.nutriments || {};
  const val = (k) => { const x = num(n[k]); return isNaN(x) ? null : x; };
  let kcal = val('energy-kcal_100g');
  if (kcal == null && val('energy_100g') != null) kcal = val('energy_100g') / 4.184;
  let salt = val('salt_100g');
  if (salt == null && val('sodium_100g') != null) salt = val('sodium_100g') * 2.5;
  const caf = val('caffeine_100g'); // Open Food Facts gibt Koffein in g pro 100 g an
  const round = (x, d = 1) => x == null ? '' : Math.round(x * 10 ** d) / 10 ** d;
  return {
    barcode: code,
    name: (p.product_name_de || p.product_name || '').trim(),
    brand: (p.brands || '').split(',')[0].trim(),
    serving: num(p.serving_quantity) || null,
    per100: {
      kcal: round(kcal, 0), protein: round(val('proteins_100g')), carbs: round(val('carbohydrates_100g')),
      fat: round(val('fat_100g')), salt: round(salt, 2), fiber: round(val('fiber_100g')),
      caffeine: caf == null ? '' : Math.round(caf * 1000),
    },
  };
}

function renderMine(body, meal, sheetEl) {
  body.innerHTML = `
    <input class="input" id="pSearch" type="search" placeholder="Produkt suchen" autocomplete="off">
    <div class="list" id="pList"></div>`;
  const list = body.querySelector('#pList');
  const draw = () => {
    const q = body.querySelector('#pSearch').value.trim().toLowerCase();
    const items = Object.values(S.products)
      .filter(p => !q || (p.name + ' ' + (p.brand || '')).toLowerCase().includes(q))
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    list.innerHTML = items.length ? items.map(p => `
      <button class="list-item" data-pid="${p.id}">
        <div class="t"><b>${esc(p.name)}</b><span>${p.brand ? esc(p.brand) + ' · ' : ''}${fmt(p.per100.kcal)} kcal · ${fmt(p.per100.protein, 1)} g Protein / 100 g</span></div>
        <svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
      </button>`).join('')
      : `<div class="empty">${q ? 'Kein Produkt gefunden.' : 'Noch keine Produkte gespeichert. Scanne dein erstes Produkt oder lege es manuell an.'}</div>`;
    $$('[data-pid]', list).forEach(b => b.onclick = () => openProductForm({ meal, product: S.products[b.dataset.pid], parent: sheetEl }));
  };
  body.querySelector('#pSearch').oninput = draw;
  draw();
}

/* Produktformular: Werte pro 100 g + Menge */
function openProductForm({ meal, product, parent, isNew }) {
  const p = product ? JSON.parse(JSON.stringify(product)) : { name: '', brand: '', barcode: '', per100: {} };
  const exists = p.id && S.products[p.id];
  const mealName = MEALS.find(x => x[0] === meal)[1];
  const fields = [
    ['kcal', 'Kalorien (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Kohlenhydrate (g)'], ['fat', 'Fett (g)'],
    ['salt', 'Salz (g)'], ['fiber', 'Ballaststoffe (g)'], ['caffeine', 'Koffein (mg)'],
  ];
  // Bekannte Produkte: Menge zuerst. Neue/leere Produkte: erst die Werte von der Packung.
  const known = !!(p.name && num(p.per100.kcal) >= 0 && p.per100.kcal !== '' && p.per100.kcal != null);
  const details = `
      <div class="eyebrow">Produktdaten</div>
      <div class="field"><label for="pfName">Name</label><input class="input" id="pfName" value="${esc(p.name)}" placeholder="z. B. Skyr Natur"></div>
      <div class="grid2">
        <div class="field"><label for="pfBrand">Marke</label><input class="input" id="pfBrand" value="${esc(p.brand || '')}" placeholder="optional"></div>
        <div class="field"><label for="pfServ">Portion (g)</label><input class="input" id="pfServ" inputmode="decimal" value="${p.serving ? fmt(p.serving) : ''}" placeholder="optional"></div>
      </div>
      ${p.barcode ? `<p class="muted" style="margin:0;font-size:13px">Barcode ${esc(p.barcode)}</p>` : ''}
      <div class="eyebrow">Nährwerte pro 100 g</div>
      <div class="grid2">${fields.map(([k, l]) => `<div class="field"><label for="pf_${k}">${l}</label><input class="input" id="pf_${k}" inputmode="decimal" value="${p.per100[k] === '' || p.per100[k] == null ? '' : String(p.per100[k]).replace('.', ',')}" placeholder="0"></div>`).join('')}</div>`;
  const amount = `
      <div class="eyebrow">Menge</div>
      <div class="chips" id="pfQuick"></div>
      <div class="field"><label for="pfGrams">Gramm</label><input class="input" id="pfGrams" inputmode="decimal" value="${p.serving ? fmt(p.serving) : 100}"></div>
      <div class="card" style="background:var(--card);padding:14px" id="pfPreview"></div>
      <button class="btn primary" id="pfAdd">${I.plus}Zu ${esc(mealName)} hinzufügen</button>`;
  const el = openSheet({
    title: p.name || 'Neues Produkt',
    body: `
      ${known ? amount + details : details + amount}
      ${exists ? `<button class="btn" id="pfSave">Nur Produkt speichern</button><button class="btn danger" id="pfDel">${I.trash}Produkt löschen</button>` : ''}
    `,
  });
  const read = () => {
    const per100 = {};
    fields.forEach(([k]) => { const v = num(el.querySelector('#pf_' + k).value); per100[k] = isNaN(v) ? 0 : v; });
    return {
      id: p.id || uid(),
      name: el.querySelector('#pfName').value.trim(),
      brand: el.querySelector('#pfBrand').value.trim(),
      barcode: p.barcode || '',
      serving: num(el.querySelector('#pfServ').value) || null,
      per100,
      lastUsed: p.lastUsed || 0,
    };
  };
  const quick = () => {
    const serv = num(el.querySelector('#pfServ').value);
    const opts = [];
    if (serv > 0) opts.push([serv, `1 Portion (${fmt(serv)} g)`]);
    [50, 100, 150, 200, 250].forEach(g => opts.push([g, `${g} g`]));
    el.querySelector('#pfQuick').innerHTML = opts.map(([g, l]) => `<button class="chip" data-g="${g}">${l}</button>`).join('');
    $$('[data-g]', el).forEach(b => b.onclick = () => { el.querySelector('#pfGrams').value = fmt(num(b.dataset.g)); preview(); });
  };
  const preview = () => {
    const prod = read();
    const g = num(el.querySelector('#pfGrams').value) || 0;
    const n = entryNutrients({ grams: g, per100: prod.per100 });
    el.querySelector('#pfPreview').innerHTML = `
      <div class="summary" style="grid-template-columns:repeat(4,1fr);gap:6px">
        <div class="side"><b>${fmt(n.kcal)}</b><span>kcal</span></div>
        <div class="side"><b>${fmt(n.protein)}</b><span>Protein</span></div>
        <div class="side"><b>${fmt(n.carbs)}</b><span>Kohlenh.</span></div>
        <div class="side"><b>${fmt(n.fat)}</b><span>Fett</span></div>
      </div>`;
  };
  quick(); preview();
  el.querySelector('#pfServ').oninput = () => { quick(); preview(); };
  $$('.input', el).forEach(i => i.addEventListener('input', preview));

  const saveProduct = () => {
    const prod = read();
    if (!prod.name) { toast('Bitte einen Namen eingeben'); return null; }
    prod.lastUsed = Date.now();
    S.products[prod.id] = prod;
    return prod;
  };
  el.querySelector('#pfAdd').onclick = () => {
    const grams = num(el.querySelector('#pfGrams').value);
    if (!(grams > 0)) { toast('Bitte eine Menge eingeben'); return; }
    const prod = saveProduct();
    if (!prod) return;
    const day = S.diary[foodDay] || (S.diary[foodDay] = {});
    (day[meal] || (day[meal] = [])).push({ id: uid(), pid: prod.id, name: prod.name, brand: prod.brand, grams, per100: { ...prod.per100 } });
    save();
    haptic();
    closeSheet(el);
    if (parent) closeSheet(parent);
    renderFood();
    toast(`${prod.name} hinzugefügt`);
  };
  if (exists) {
    el.querySelector('#pfSave').onclick = () => { if (saveProduct()) { save(); closeSheet(el); toast('Produkt gespeichert'); refreshMine(parent, meal); } };
    el.querySelector('#pfDel').onclick = async () => {
      if (await confirmSheet({ title: 'Produkt löschen?', text: 'Das Produkt verschwindet aus „Meine Produkte“. Bereits eingetragene Mahlzeiten bleiben erhalten.' })) {
        delete S.products[p.id];
        save();
        closeSheet(el);
        refreshMine(parent, meal);
      }
    };
  }
}
function refreshMine(parent, meal) {
  if (!parent || !document.body.contains(parent)) return;
  const on = parent.querySelector('#addSeg button.on');
  if (on && on.dataset.mode === 'mine') renderMine(parent.querySelector('#addBody'), meal, parent);
}

/* Eintrag bearbeiten */
function openEntry(meal, id) {
  const list = dayEntries(foodDay)[meal];
  const e = list.find(x => x.id === id);
  if (!e) return;
  const el = openSheet({
    title: e.name,
    body: `
      <div class="field"><label for="enGrams">Menge (g)</label><input class="input" id="enGrams" inputmode="decimal" value="${fmt(e.grams)}"></div>
      <div class="field"><label for="enMeal">Mahlzeit</label><select class="input" id="enMeal">${MEALS.map(([m, l]) => `<option value="${m}" ${m === meal ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="card" style="padding:14px" id="enPrev"></div>
      <button class="btn primary" id="enSave">Speichern</button>
      <button class="btn danger" id="enDel">${I.trash}Eintrag löschen</button>`,
  });
  const prev = () => {
    const g = num(el.querySelector('#enGrams').value) || 0;
    const n = entryNutrients({ grams: g, per100: e.per100 });
    el.querySelector('#enPrev').innerHTML = `<div class="grid3" style="grid-template-columns:repeat(4,1fr)">
      ${[['kcal', 'kcal', 0], ['protein', 'Protein', 0], ['carbs', 'Kohlenh.', 0], ['fat', 'Fett', 0], ['salt', 'Salz g', 1], ['fiber', 'Ballastst.', 0], ['caffeine', 'Koffein mg', 0]]
        .map(([k, l, d]) => `<div class="side" style="text-align:center"><b class="num" style="display:block;font-size:17px">${fmt(n[k], d)}</b><span class="muted" style="font-size:12px">${l}</span></div>`).join('')}</div>`;
  };
  prev();
  el.querySelector('#enGrams').oninput = prev;
  el.querySelector('#enSave').onclick = () => {
    const g = num(el.querySelector('#enGrams').value);
    if (!(g > 0)) { toast('Bitte eine Menge eingeben'); return; }
    const target = el.querySelector('#enMeal').value;
    const day = S.diary[foodDay];
    day[meal] = day[meal].filter(x => x.id !== id);
    e.grams = g;
    (day[target] || (day[target] = [])).push(e);
    save(); closeSheet(el); renderFood();
  };
  el.querySelector('#enDel').onclick = () => {
    const day = S.diary[foodDay];
    day[meal] = day[meal].filter(x => x.id !== id);
    save(); closeSheet(el); renderFood(); toast('Eintrag gelöscht');
  };
}


/* ---------- Gespeicherte Mahlzeiten ---------- */
function savedMealTotals(sm, factor = 1) {
  return sumEntries(sm.items.map(it => ({ grams: it.grams * factor, per100: it.per100 })));
}

function openSaveMeal(mealKey) {
  const list = dayEntries(foodDay)[mealKey];
  if (!list.length) return;
  const label = MEALS.find(x => x[0] === mealKey)[1];
  const t = sumEntries(list);
  const el = openSheet({
    title: 'Mahlzeit speichern',
    body: `
      <div class="field"><label for="smName">Name</label><input class="input" id="smName" placeholder="z. B. Protein-Frühstück" value=""></div>
      <p class="muted" style="margin:0;font-size:14px">${list.length} Lebensmittel aus ${esc(label)} · ${fmt(t.kcal)} kcal · ${fmt(t.protein)} g Protein</p>
      <div class="list">${list.map(e => `<div class="list-item"><div class="t"><b>${esc(e.name)}</b><span>${fmt(e.grams)} g</span></div><span class="muted num">${fmt(entryNutrients(e).kcal)} kcal</span></div>`).join('')}</div>
      <button class="btn primary" id="smSave">${I.bookmark}Speichern</button>`,
  });
  setTimeout(() => el.querySelector('#smName').focus(), 350);
  el.querySelector('#smSave').onclick = () => {
    const name = el.querySelector('#smName').value.trim();
    if (!name) { toast('Bitte einen Namen eingeben'); return; }
    const id = uid();
    S.meals[id] = {
      id, name, created: Date.now(), lastUsed: Date.now(),
      items: list.map(e => ({ pid: e.pid, name: e.name, brand: e.brand || '', grams: e.grams, per100: { ...e.per100 } })),
    };
    save(); closeSheet(el); toast(`„${name}“ gespeichert`);
  };
}

function addSavedMeal(id, mealKey, factor = 1) {
  const sm = S.meals[id];
  const day = S.diary[foodDay] || (S.diary[foodDay] = {});
  const arr = day[mealKey] || (day[mealKey] = []);
  sm.items.forEach(it => arr.push({ id: uid(), pid: it.pid, name: it.name, brand: it.brand, grams: Math.round(it.grams * factor * 10) / 10, per100: { ...it.per100 } }));
  sm.lastUsed = Date.now();
  save(); haptic();
}

function renderSavedMeals(body, mealKey, sheetEl) {
  const items = Object.values(S.meals).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  body.innerHTML = items.length ? `<div class="list">${items.map(sm => {
    const t = savedMealTotals(sm);
    return `<div class="list-item">
      <button class="t" data-smopen="${sm.id}" style="text-align:left"><b>${esc(sm.name)}</b><span>${sm.items.length} Lebensmittel · ${fmt(t.kcal)} kcal · ${fmt(t.protein)} g Protein</span></button>
      <button class="add-btn" data-smadd="${sm.id}" aria-label="${esc(sm.name)} hinzufügen">${I.plus}</button>
    </div>`;
  }).join('')}</div>`
    : `<div class="empty">Noch keine Mahlzeiten gespeichert. Trag die Lebensmittel einmal normal ein und tippe dann in der Mahlzeit auf „Als Mahlzeit speichern“.</div>`;
  $$('[data-smadd]', body).forEach(b => b.onclick = () => {
    const sm = S.meals[b.dataset.smadd];
    addSavedMeal(sm.id, mealKey);
    closeSheet(sheetEl); renderFood(); toast(`${sm.name} hinzugefügt`);
  });
  $$('[data-smopen]', body).forEach(b => b.onclick = () => openSavedMeal(b.dataset.smopen, mealKey, sheetEl, body));
}

function openSavedMeal(id, mealKey, parentSheet, parentBody) {
  const sm = S.meals[id];
  const mealName = MEALS.find(x => x[0] === mealKey)[1];
  let factor = 1;
  const el = openSheet({
    title: sm.name,
    body: `
      <div class="field"><label>Portion</label>
        <div class="seg" id="smFactor">${[0.5, 1, 1.5, 2].map(f => `<button data-f="${f}" class="${f === 1 ? 'on' : ''}">${fmt(f, f % 1 ? 1 : 0)}×</button>`).join('')}</div></div>
      <div class="card" style="padding:14px" id="smTot"></div>
      <div class="list" id="smItems"></div>
      <button class="btn primary" id="smAdd">${I.plus}Zu ${esc(mealName)} hinzufügen</button>
      <div class="field"><label for="smRename">Name ändern</label><input class="input" id="smRename" value="${esc(sm.name)}"></div>
      <button class="btn" id="smRenameBtn">Namen speichern</button>
      <button class="btn danger" id="smDel">${I.trash}Mahlzeit löschen</button>`,
  });
  const draw = () => {
    const t = savedMealTotals(sm, factor);
    el.querySelector('#smTot').innerHTML = `<div class="summary" style="grid-template-columns:repeat(4,1fr);gap:6px">
      <div class="side"><b>${fmt(t.kcal)}</b><span>kcal</span></div><div class="side"><b>${fmt(t.protein)}</b><span>Protein</span></div>
      <div class="side"><b>${fmt(t.carbs)}</b><span>Kohlenh.</span></div><div class="side"><b>${fmt(t.fat)}</b><span>Fett</span></div></div>`;
    el.querySelector('#smItems').innerHTML = sm.items.map((it, i) => `<div class="list-item"><div class="t"><b>${esc(it.name)}</b><span class="num">${fmt(it.grams * factor, (it.grams * factor) % 1 ? 1 : 0)} g</span></div>
      <button class="icon-btn" style="width:32px;height:32px;color:var(--red)" data-rmit="${i}" aria-label="Aus Mahlzeit entfernen">${I.close}</button></div>`).join('');
    $$('[data-rmit]', el).forEach(b => b.onclick = () => {
      if (sm.items.length <= 1) { toast('Eine Mahlzeit braucht mindestens ein Lebensmittel'); return; }
      sm.items.splice(+b.dataset.rmit, 1); save(); draw();
    });
  };
  draw();
  $$('#smFactor button', el).forEach(b => b.onclick = () => { factor = num(b.dataset.f); $$('#smFactor button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  el.querySelector('#smAdd').onclick = () => {
    addSavedMeal(id, mealKey, factor);
    closeSheet(el); closeSheet(parentSheet); renderFood(); toast(`${sm.name} hinzugefügt`);
  };
  el.querySelector('#smRenameBtn').onclick = () => {
    const n = el.querySelector('#smRename').value.trim();
    if (!n) { toast('Bitte einen Namen eingeben'); return; }
    sm.name = n; save(); toast('Name gespeichert'); renderSavedMeals(parentBody, mealKey, parentSheet);
  };
  el.querySelector('#smDel').onclick = async () => {
    if (await confirmSheet({ title: 'Mahlzeit löschen?', text: `„${sm.name}“ wird gelöscht. Bereits eingetragene Lebensmittel bleiben erhalten.` })) {
      delete S.meals[id]; save(); closeSheet(el); renderSavedMeals(parentBody, mealKey, parentSheet);
    }
  };
}

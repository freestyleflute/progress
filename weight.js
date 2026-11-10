/* Gewicht: Eingabe, Verlauf-Graph, Ziel und Progressionsempfehlungen. */
'use strict';

let weightRange = '1M';
const RANGES = [['1W', 7], ['1M', 30], ['3M', 91], ['6M', 182], ['1J', 365], ['Alle', 0]];
const GOAL_LABEL = { cut: 'Diät', maintain: 'Halten', bulk: 'Aufbau' };
const RATE_OPTS = { cut: [0.25, 0.5, 0.75, 1], bulk: [0.1, 0.25, 0.5] };
const MIN_DAYS = 14;

function weightSeries() {
  return Object.entries(S.weights).map(([d, kg]) => ({ d, kg })).sort((a, b) => a.d < b.d ? -1 : 1);
}
/* 7-Tage-Durchschnitt je Messung */
function smooth(series) {
  return series.map((p) => {
    const win = series.filter(q => q.d <= p.d && daysBetween(q.d, p.d) < 7);
    return { d: p.d, kg: p.kg, avg: win.reduce((a, q) => a + q.kg, 0) / win.length };
  });
}
/* Lineare Regression über die letzten n Tage → kg pro Woche */
function trendPerWeek(series, n) {
  const today = dayKey();
  const pts = series.filter(p => daysBetween(p.d, today) <= n);
  if (pts.length < 5) return null;
  const xs = pts.map(p => daysBetween(pts[0].d, p.d));
  if (xs[xs.length - 1] < 10) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.kg, 0) / pts.length;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (pts[i].kg - my); sxx += (x - mx) ** 2; });
  return sxx ? (sxy / sxx) * 7 : null;
}
function currentAvg(series) {
  if (!series.length) return null;
  const last = series[series.length - 1].d;
  const win = series.filter(p => daysBetween(p.d, last) < 7);
  return win.reduce((a, p) => a + p.kg, 0) / win.length;
}

function recommendation() {
  const series = weightSeries();
  const st = S.settings;
  const today = dayKey();
  if (series.length < 2) return { state: 'collect', days: series.length ? 1 : 0 };
  const span = daysBetween(series[0].d, today);
  if (span < MIN_DAYS || series.filter(p => daysBetween(p.d, today) <= 21).length < 6) {
    return { state: 'collect', days: Math.min(span, MIN_DAYS) };
  }
  const rate = trendPerWeek(series, 21);
  if (rate == null) return { state: 'collect', days: Math.min(span, MIN_DAYS) };
  const avg = currentAvg(series);
  const targetPct = st.goal === 'cut' ? -st.rate.cut : st.goal === 'bulk' ? st.rate.bulk : 0;
  const target = avg * targetPct / 100;
  const diff = target - rate; // > 0: mehr essen
  const sinceAdjust = st.lastAdjust ? daysBetween(st.lastAdjust, today) : 999;
  const due = sinceAdjust >= 14;
  const snoozed = st.dismissedRec && daysBetween(st.dismissedRec, today) < 3;
  const tol = Math.max(0.1, Math.abs(target) * 0.25);
  let delta = 0;
  let tdee = null;
  if (bodyComplete()) {
    // Gesamtumsatz aus Formel und echtem Verlauf (gegessen minus Gewichtsänderung) kombinieren
    tdee = estimateTDEE(avg, rate);
    const recKcal = Math.round((tdee.value + target * 7700 / 7) / 50) * 50;
    const d = recKcal - st.goals.kcal;
    if (Math.abs(diff) > tol || Math.abs(d) >= 150) delta = clamp(d, -400, 400);
    if (Math.abs(delta) < 100) delta = 0;
  } else if (Math.abs(diff) > tol) {
    delta = clamp(Math.round(diff * 7700 / 7 / 50) * 50, -300, 300);
    if (Math.abs(delta) < 100) delta = Math.sign(diff) * 100;
  }
  return { state: 'ready', rate, target, avg, delta, due, snoozed, sinceAdjust, tdee };
}
function hasActiveRec() {
  const r = recommendation();
  return r.state === 'ready' && r.due && !r.snoozed && r.delta !== 0;
}

function recCardHTML(r) {
  const st = S.settings;
  if (r.state === 'collect') {
    const sr = startRecommendation();
    if (sr && Math.abs(sr.kcal - st.goals.kcal) >= 100) {
      return `<section class="rec">
        <div class="eyebrow">Startempfehlung aus deinen Körperdaten</div>
        <div class="delta num">${fmt(sr.kcal)} kcal / Tag</div>
        <p>Gesamtumsatz geschätzt <b class="num">${fmt(sr.tdee)} kcal</b>, für ${GOAL_LABEL[st.goal]} ${st.goal === 'maintain' ? 'ohne Anpassung' : `${sr.adj > 0 ? '+' : '–'}${fmt(Math.abs(sr.adj))} kcal`}. Dazu ${fmt(sr.protein)} g Protein, ${fmt(sr.fat)} g Fett und ${fmt(sr.carbs)} g Kohlenhydrate. Nach ${MIN_DAYS} Tagen Messungen passt die App das an deinen echten Verlauf an (${r.days}/${MIN_DAYS}).</p>
        <div class="row"><button class="btn primary" id="startApply">Übernehmen</button></div>
      </section>`;
    }
    return `<section class="card">
      <div class="card-title"><h2>Progressionsempfehlung</h2><span class="sub">${r.days}/${MIN_DAYS} Tage</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${r.days / MIN_DAYS * 100}%"></div></div>
      <p class="muted" style="margin:0;font-size:14px">Nach ${MIN_DAYS} Tagen mit Messungen vergleicht die App deinen Trend mit deinem Ziel und schlägt dir neue Kalorien vor. Am genauesten wird es, wenn du dich täglich morgens nach dem Aufstehen wiegst.</p>
    </section>`;
  }
  const rateTxt = `${r.rate > 0 ? '+' : ''}${fmt(r.rate, 2)} kg/Woche`;
  const tgtTxt = `${r.target > 0 ? '+' : ''}${fmt(r.target, 2)} kg/Woche`;
  if (r.delta === 0) {
    return `<section class="rec">
      <h2>Du liegst im Plan</h2>
      <p>Dein Trend: <b class="num">${rateTxt}</b>, Ziel (${GOAL_LABEL[st.goal]}): <b class="num">${tgtTxt}</b>. Behalte deine ${fmt(st.goals.kcal)} kcal bei.</p>
      ${r.tdee ? `<p class="tgt-sub">Geschätzter Gesamtumsatz: <b class="num">${fmt(r.tdee.value)} kcal</b> (${r.tdee.source}).</p>` : ''}
    </section>`;
  }
  if (!r.due || r.snoozed) {
    const wait = Math.max(0, 14 - r.sinceAdjust);
    return `<section class="card">
      <div class="card-title"><h2>Progressionsempfehlung</h2></div>
      <p class="muted" style="margin:0;font-size:14px">Dein Trend: <b class="num">${rateTxt}</b>, Ziel: <b class="num">${tgtTxt}</b>. ${r.snoozed ? 'Erinnerung pausiert für ein paar Tage.' : `Deine letzte Anpassung ist ${r.sinceAdjust} Tage her. Gib ihr noch ${wait} Tage Zeit, bevor du wieder änderst.`}</p>
    </section>`;
  }
  const more = r.delta > 0;
  const why = st.goal === 'cut'
    ? (more ? 'Du nimmst schneller ab als geplant. Das kostet auf Dauer Muskeln und Leistung.' : 'Du nimmst langsamer ab als geplant.')
    : st.goal === 'bulk'
      ? (more ? 'Du nimmst langsamer zu als geplant.' : 'Du nimmst schneller zu als geplant. Das wäre vor allem Fett.')
      : (more ? 'Dein Gewicht sinkt, obwohl du halten willst.' : 'Dein Gewicht steigt, obwohl du halten willst.');
  return `<section class="rec ${more ? '' : 'warn'}">
    <div class="eyebrow">Neue Empfehlung</div>
    <div class="delta ${more ? 'green' : 'red'}">${more ? '+' : '–'}${fmt(Math.abs(r.delta))} kcal / Tag</div>
    <p>${why} Trend: <b class="num">${rateTxt}</b>, Ziel: <b class="num">${tgtTxt}</b>. Neues Kalorienziel: <b class="num">${fmt(st.goals.kcal + r.delta)} kcal</b>. Protein bleibt, die Änderung geht auf Kohlenhydrate und Fett.</p>
    ${r.tdee ? `<p class="tgt-sub">Dein Gesamtumsatz liegt geschätzt bei <b class="num">${fmt(r.tdee.value)} kcal</b> (${r.tdee.source}).</p>` : ''}
    <div class="row"><button class="btn primary" id="recApply">Übernehmen</button><button class="btn" id="recLater">Später</button></div>
  </section>`;
}

function applyRec(delta) {
  const g = S.settings.goals;
  g.kcal = Math.max(1200, g.kcal + delta);
  g.carbs = Math.max(50, Math.round(g.carbs + delta * 0.7 / 4));
  g.fat = Math.max(35, Math.round(g.fat + delta * 0.3 / 9));
  S.settings.lastAdjust = dayKey();
  S.settings.dismissedRec = null;
  save();
}

function chartSVG(points, days) {
  const W = 360, H = 210, L = 38, R = 12, T = 12, B = 26;
  if (points.length < 2) {
    return `<div class="empty">${points.length ? 'Trage noch einen zweiten Wert ein, dann erscheint dein Verlauf.' : 'Trage dein erstes Gewicht ein, dann erscheint hier dein Verlauf.'}</div>`;
  }
  const first = points[0].d, last = points[points.length - 1].d;
  const startKey = days ? addDays(dayKey(), -days + 1) : first;
  const spanDays = Math.max(1, daysBetween(startKey, days ? dayKey() : last));
  const vals = points.flatMap(p => [p.kg, p.avg]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(0.4, (hi - lo) * 0.15);
  lo = Math.floor((lo - pad) * 2) / 2; hi = Math.ceil((hi + pad) * 2) / 2;
  const x = d => L + (daysBetween(startKey, d) / spanDays) * (W - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => lo + (hi - lo) * i / ticks).map(v =>
    `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis" x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v, 1)}</text>`).join('');
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ');
  const area = `${line} L${x(last).toFixed(1)},${H - B} L${x(points[0].d).toFixed(1)},${H - B} Z`;
  const dots = points.map(p => `<circle class="raw" cx="${x(p.d).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="2.6"/>`).join('');
  const lbl = (d, anchor) => { const dt = parseDay(d); return `<text class="axis" x="${x(d).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${dt.getDate()}. ${MON[dt.getMonth()]}</text>`; };
  const endP = points[points.length - 1];
  const tg = S.settings.targetWeight;
  const tgLine = tg && tg >= lo && tg <= hi ? `<line class="target" x1="${L}" x2="${W - R}" y1="${y(tg).toFixed(1)}" y2="${y(tg).toFixed(1)}"/><text class="axis tlabel" x="${W - R}" y="${(y(tg) - 5).toFixed(1)}" text-anchor="end">Ziel ${fmt(tg, 1)}</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">
    ${grid}${tgLine}
    <path class="area" d="${area}"/>
    ${dots}
    <path class="avg" d="${line}"/>
    <circle class="end" cx="${x(endP.d).toFixed(1)}" cy="${y(endP.avg).toFixed(1)}" r="5.5"/>
    ${lbl(startKey, 'start')}${lbl(days ? dayKey() : last, 'end')}
  </svg>`;
}

function renderWeight() {
  setTimeout(() => { if (typeof injectBackupBanner === 'function') injectBackupBanner(); }, 0);
  const v = document.getElementById('view');
  const st = S.settings;
  const all = smooth(weightSeries());
  const range = RANGES.find(r => r[0] === weightRange);
  const days = range[1];
  const pts = days ? all.filter(p => daysBetween(p.d, dayKey()) < days) : all;
  const latest = all[all.length - 1];
  const todayVal = S.weights[dayKey()];
  const r = recommendation();
  const change = pts.length >= 2 ? pts[pts.length - 1].avg - pts[0].avg : null;
  const rate = trendPerWeek(weightSeries(), 21);

  v.innerHTML = `
    <div class="head"><h1>Gewicht</h1><div class="actions"><button class="icon-btn" id="wSet" aria-label="Einstellungen">${I.gear}</button></div></div>
    <section class="card">
      <div class="card-title"><h2>${todayVal ? 'Heute gewogen' : 'Gewicht eintragen'}</h2><span class="sub">${latest ? '7-Tage-Schnitt ' + fmt(latest.avg, 1) + ' kg' : ''}</span></div>
      <div id="wWheel"></div>
      <div class="date-row"><label for="wDate">Datum</label><input class="input" id="wDate" type="date" value="${dayKey()}" max="${dayKey()}"></div>
      <button class="btn primary" id="wSave">${todayVal ? 'Aktualisieren' : 'Speichern'}</button>
    </section>
    ${forecastCardHTML(latest, rate)}
    ${recCardHTML(r)}
    <section class="card">
      <div class="seg" id="wRange">${RANGES.map(([k]) => `<button data-r="${k}" class="${k === weightRange ? 'on' : ''}">${k}</button>`).join('')}</div>
      <div class="chart">${chartSVG(pts, days)}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>7-Tage-Schnitt</span><span><i style="background:var(--muted);border-radius:50%"></i>Messung</span></div>
      <div class="stats">
        <div class="stat"><b>${latest ? fmt(latest.avg, 1) : '–'}</b><span>Schnitt kg</span></div>
        <div class="stat"><b class="${change == null ? '' : (st.goal === 'bulk' ? change >= 0 : change <= 0) ? 'green' : 'red'}">${change == null ? '–' : (change > 0 ? '+' : '') + fmt(change, 1)}</b><span>im Zeitraum</span></div>
        <div class="stat"><b>${rate == null ? '–' : (rate > 0 ? '+' : '') + fmt(rate, 2)}</b><span>kg / Woche</span></div>
      </div>
    </section>
    ${bodyCardHTML(latest)}
    <section class="card">
      <div class="card-title"><h2>Ziel</h2><button class="btn small" id="tgtBtn">${st.targetWeight ? `Zielgewicht ${fmt(st.targetWeight, 1)} kg` : 'Zielgewicht festlegen'}</button></div>
      <div class="seg" id="wGoal">${['cut', 'maintain', 'bulk'].map(g => `<button data-g="${g}" class="${st.goal === g ? 'on' : ''}">${GOAL_LABEL[g]}</button>`).join('')}</div>
      ${st.goal === 'maintain' ? '<p class="muted" style="margin:0;font-size:14px">Ziel: Gewicht stabil halten.</p>' : `
        <div class="field"><label>Tempo (% Körpergewicht pro Woche)</label>
        <div class="seg" id="wRate">${RATE_OPTS[st.goal].map(x => `<button data-rt="${x}" class="${st.rate[st.goal] === x ? 'on' : ''}">${st.goal === 'cut' ? '–' : '+'}${fmt(x, 2)} %</button>`).join('')}</div></div>
        <p class="muted" style="margin:0;font-size:14px">${latest ? `Das sind etwa ${fmt(latest.avg * st.rate[st.goal] / 100, 2)} kg pro Woche. ` : ''}${st.goal === 'cut' ? 'Bewährt sind 0,5 bis 1 % pro Woche, langsamer schützt die Muskulatur besser.' : 'Für sauberen Aufbau eher langsam, etwa 0,25 % pro Woche.'}</p>`}
    </section>
    <section class="card">
      <div class="card-title"><h2>Messungen <span class="muted num" style="font-weight:500;font-size:15px">${all.length}</span></h2>
        <label class="btn small" for="csvFile" style="cursor:pointer">${I.upload}CSV importieren</label></div>
      <input type="file" id="csvFile" accept=".csv,text/csv,text/plain,text/comma-separated-values" hidden>
      ${all.length ? `<div class="list">${all.slice().reverse().slice(0, 14).map(p => `
        <button class="list-item" data-wd="${p.d}"><div class="t"><b class="num">${fmt(p.kg, 1)} kg</b><span>${prettyDay(p.d)}</span></div><span class="muted num" style="font-size:14px">Ø ${fmt(p.avg, 1)}</span></button>`).join('')}</div>` : '<div class="empty">Noch keine Messungen.</div>'}
    </section>`;

  $('#wSet').onclick = () => openSettings();
  $('#csvFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) openCsvImport(f); };
  const startVal = todayVal || (latest ? latest.kg : 80);
  const picker = weightWheels($('#wWheel'), startVal);
  $('#wSave').onclick = () => {
    const val = picker.get();
    const d = $('#wDate').value || dayKey();
    if (!(val > 25 && val < 350)) { toast('Bitte ein gültiges Gewicht eingeben'); return; }
    S.weights[d] = Math.round(val * 10) / 10;
    save(); haptic(); renderWeight(); updateWeightDot(); toast('Gewicht gespeichert');
  };
  $('#wDate').onchange = () => { const d = $('#wDate').value; if (S.weights[d]) picker.set(S.weights[d]); };
  if ($('#tgtBtn')) $('#tgtBtn').onclick = openTargetPicker;
  if ($('#tgtSet')) $('#tgtSet').onclick = openTargetPicker;
  $$('#wRange button').forEach(b => b.onclick = () => { weightRange = b.dataset.r; renderWeight(); });
  $$('#wGoal button').forEach(b => b.onclick = () => { st.goal = b.dataset.g; save(); renderWeight(); updateWeightDot(); });
  $$('#wRate button').forEach(b => b.onclick = () => { st.rate[st.goal] = num(b.dataset.rt); save(); renderWeight(); updateWeightDot(); });
  $$('[data-wd]').forEach(b => b.onclick = async () => {
    const d = b.dataset.wd;
    if (await confirmSheet({ title: 'Messung löschen?', text: `${fmt(S.weights[d], 1)} kg vom ${prettyDay(d)} löschen?` })) {
      delete S.weights[d]; save(); renderWeight(); updateWeightDot();
    }
  });
  if ($('#recApply')) $('#recApply').onclick = () => { applyRec(r.delta); renderWeight(); updateWeightDot(); toast(`Neues Ziel: ${fmt(st.goals.kcal)} kcal`); };
  if ($('#bodyBtn')) $('#bodyBtn').onclick = openBodyEditor;
  if ($('#startApply')) $('#startApply').onclick = () => {
    const sr = startRecommendation();
    Object.assign(st.goals, { kcal: sr.kcal, protein: sr.protein, fat: sr.fat, carbs: sr.carbs });
    st.lastAdjust = dayKey(); save(); renderWeight(); toast(`Neues Ziel: ${fmt(sr.kcal)} kcal`);
  };
  if ($('#recLater')) $('#recLater').onclick = () => { st.dismissedRec = dayKey(); save(); renderWeight(); updateWeightDot(); };
}

function updateWeightDot() {
  const dot = document.getElementById('weightDot');
  if (dot) dot.hidden = !hasActiveRec();
}


/* ---------- Drehräder für Gewicht ---------- */
const WHEEL_H = 44;
function wheel(container, values, index, label) {
  const el = document.createElement('div');
  el.className = 'wheel';
  el.setAttribute('role', 'listbox');
  el.setAttribute('aria-label', label);
  el.tabIndex = 0;
  el.innerHTML = `<div class="wheel-pad"></div>${values.map((v, i) => `<div class="wheel-item" data-i="${i}">${v}</div>`).join('')}<div class="wheel-pad"></div>`;
  container.appendChild(el);
  let cur = index;
  const items = $$('.wheel-item', el);
  const mark = () => items.forEach((it, i) => { const d = Math.abs(i - cur); it.className = 'wheel-item' + (d === 0 ? ' sel' : d === 1 ? ' n1' : ''); });
  const go = (i, smooth) => { cur = clamp(i, 0, values.length - 1); el.scrollTo({ top: cur * WHEEL_H, behavior: smooth ? 'smooth' : 'auto' }); mark(); };
  requestAnimationFrame(() => go(index, false));
  let t;
  el.addEventListener('scroll', () => {
    const i = clamp(Math.round(el.scrollTop / WHEEL_H), 0, values.length - 1);
    if (i !== cur) { cur = i; mark(); }
    clearTimeout(t);
    t = setTimeout(() => { if (Math.abs(el.scrollTop - cur * WHEEL_H) > 1) go(cur, true); }, 120);
  }, { passive: true });
  items.forEach((it, i) => it.addEventListener('click', () => go(i, true)));
  el.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') { go(cur - 1, true); e.preventDefault(); }
    if (e.key === 'ArrowDown') { go(cur + 1, true); e.preventDefault(); }
  });
  mark();
  return { get: () => cur, set: (i) => go(i, false) };
}

const KG_MIN = 30, KG_MAX = 250;
function weightWheels(container, value) {
  container.innerHTML = '<div class="wheels"><div class="wheel-band"></div></div>';
  const box = container.querySelector('.wheels');
  const v = clamp(Math.round((value || 80) * 10) / 10, KG_MIN, KG_MAX + 0.9);
  const ints = Array.from({ length: KG_MAX - KG_MIN + 1 }, (_, i) => KG_MIN + i);
  const a = wheel(box, ints, Math.floor(v) - KG_MIN, 'Kilogramm');
  const sep = document.createElement('span'); sep.className = 'wheel-sep'; sep.textContent = ','; box.appendChild(sep);
  const b = wheel(box, Array.from({ length: 10 }, (_, i) => i), Math.round((v % 1) * 10) % 10, 'Nachkommastelle');
  const unit = document.createElement('span'); unit.className = 'wheel-unit'; unit.textContent = 'kg'; box.appendChild(unit);
  a.el = box.children[1];
  return {
    get: () => Math.round(((KG_MIN + a.get()) + b.get() / 10) * 10) / 10,
    set: (w) => { const x = Math.round(w * 10) / 10; a.set(Math.floor(x) - KG_MIN); b.set(Math.round((x % 1) * 10) % 10); },
  };
}

/* ---------- Zielgewicht & Prognose ---------- */
function openTargetPicker() {
  const st = S.settings;
  const series = smooth(weightSeries());
  const cur = series.length ? series[series.length - 1].avg : 80;
  const el = openSheet({
    title: 'Zielgewicht',
    body: `<div id="tgtWheel"></div>
      <button class="btn primary" id="tgtSave">Ziel speichern</button>
      ${st.targetWeight ? '<button class="btn danger" id="tgtDel">Zielgewicht entfernen</button>' : ''}`,
  });
  const pk = weightWheels(el.querySelector('#tgtWheel'), st.targetWeight || Math.round((cur + (st.goal === 'bulk' ? 3 : -5)) * 10) / 10);
  el.querySelector('#tgtSave').onclick = () => {
    const t = pk.get();
    st.targetWeight = t;
    st.targetStart = Math.round(cur * 10) / 10;
    st.targetSetOn = dayKey();
    // Ziel passend zur Richtung setzen
    if (series.length) {
      if (t < cur - 0.3 && st.goal !== 'cut') st.goal = 'cut';
      if (t > cur + 0.3 && st.goal !== 'bulk') st.goal = 'bulk';
    }
    save(); closeSheet(el); renderWeight(); updateWeightDot(); toast(`Zielgewicht ${fmt(t, 1)} kg gespeichert`);
  };
  if (st.targetWeight) el.querySelector('#tgtDel').onclick = () => {
    st.targetWeight = null; st.targetStart = null; save(); closeSheet(el); renderWeight();
  };
}

function forecastCardHTML(latest, trend) {
  const st = S.settings;
  if (!st.targetWeight) {
    return latest ? `<button class="wcard" id="tgtSet"><div class="t"><b>Zielgewicht festlegen</b><span>Dann siehst du, wann du es voraussichtlich erreichst</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>` : '';
  }
  if (!latest) return '';
  const tgt = st.targetWeight;
  const cur = latest.avg;
  const remaining = tgt - cur;
  const start = st.targetStart || cur;
  const total = tgt - start;
  const prog = total ? clamp((cur - start) / total, 0, 1) : 1;
  const bar = `<div class="tgt-bar"><div class="bar-track"><div class="bar-fill" style="width:${prog * 100}%"></div></div>
    <div class="tgt-ends num"><span>Start ${fmt(start, 1)}</span><span>${fmt(prog * 100, 0)} %</span><span>Ziel ${fmt(tgt, 1)}</span></div></div>`;
  if (Math.abs(remaining) < 0.15 || (total && (cur - start) / total >= 1)) {
    return `<section class="rec"><div class="eyebrow">Zielgewicht</div><div class="delta green">Ziel erreicht</div>
      <p>Dein Schnitt liegt bei <b class="num">${fmt(cur, 1)} kg</b>. Leg ein neues Ziel fest oder stell auf „Halten“ um.</p>${bar}</section>`;
  }
  const dir = Math.sign(remaining);
  const planRate = st.goal === 'cut' ? -cur * st.rate.cut / 100 : st.goal === 'bulk' ? cur * st.rate.bulk / 100 : 0;
  const fits = (r) => r != null && Math.sign(r) === dir && Math.abs(r) >= 0.03;
  const eta = (r) => { const weeks = remaining / r; return { weeks, date: addDays(dayKey(), Math.round(weeks * 7)) }; };
  const dtxt = (k) => { const d = parseDay(k); return `${d.getDate()}. ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const wtxt = (w) => w < 1.5 ? `${Math.max(1, Math.round(w * 7))} Tagen` : `${fmt(w, 0)} Wochen`;
  let main, sub = '';
  if (fits(trend)) {
    const e = eta(trend);
    main = `<div class="delta">in ca. ${wtxt(e.weeks)}</div><p>Bei deinem aktuellen Trend von <b class="num">${trend > 0 ? '+' : ''}${fmt(trend, 2)} kg/Woche</b> erreichst du <b class="num">${fmt(tgt, 1)} kg</b> etwa am <b>${dtxt(e.date)}</b>.</p>`;
    if (fits(planRate)) { const p = eta(planRate); sub = `<p class="tgt-sub">Mit deinem geplanten Tempo (${planRate > 0 ? '+' : ''}${fmt(planRate, 2)} kg/Woche) wäre es etwa der ${dtxt(p.date)}.</p>`; }
  } else if (fits(planRate)) {
    const p = eta(planRate);
    main = `<div class="delta">in ca. ${wtxt(p.weeks)}</div><p>Mit deinem geplanten Tempo von <b class="num">${planRate > 0 ? '+' : ''}${fmt(planRate, 2)} kg/Woche</b> erreichst du <b class="num">${fmt(tgt, 1)} kg</b> etwa am <b>${dtxt(p.date)}</b>.</p>`;
    sub = `<p class="tgt-sub">${trend == null ? 'Sobald du ein paar Wochen gewogen hast, rechnet die Prognose mit deinem echten Trend.' : `Dein aktueller Trend (${trend > 0 ? '+' : ''}${fmt(trend, 2)} kg/Woche) geht noch nicht in Richtung Ziel.`}</p>`;
  } else {
    main = `<div class="delta red">Keine Prognose</div><p>${st.goal === 'maintain' ? `Dein Ziel steht auf „Halten“. Stell es auf ${dir < 0 ? '„Diät“' : '„Aufbau“'}, um ${fmt(Math.abs(remaining), 1)} kg ${dir < 0 ? 'abzunehmen' : 'zuzunehmen'}.` : `Dein Ziel und dein Zielgewicht passen nicht zusammen. Stell das Ziel auf ${dir < 0 ? '„Diät“' : '„Aufbau“'}.`}</p>`;
  }
  return `<section class="rec"><div class="eyebrow">Prognose · noch ${fmt(Math.abs(remaining), 1)} kg</div>${main}${sub}${bar}</section>`;
}


/* ---------- Körperdaten & Energiebedarf ---------- */
const ACTIVITY = { low: ['Sitzend', 1.3, 'Bürojob, wenig Schritte'], normal: ['Normal', 1.4, 'etwas Bewegung im Alltag'], high: ['Aktiv', 1.55, 'Job auf den Beinen, viele Schritte'] };
function bodyComplete() {
  const b = S.settings.body || {};
  return b.height > 120 && b.age > 12 && (b.sex === 'm' || b.sex === 'f');
}
function trainingDaysPerWeek() {
  const n = Object.values(S.plan || {}).filter(id => S.workouts[id]).length;
  return n || 3;
}
function bmr(kg) {
  const b = S.settings.body;
  return 10 * kg + 6.25 * b.height - 5 * b.age + (b.sex === 'm' ? 5 : -161);
}
function activityFactor() {
  const b = S.settings.body;
  return Math.min(1.9, (ACTIVITY[b.activity || 'normal'][1]) + 0.04 * trainingDaysPerWeek());
}
function formulaTDEE(kg) { return bmr(kg) * activityFactor(); }

/* Durchschnittlich gegessene Kalorien der letzten 21 Tage (nur Tage mit Einträgen) */
function loggedIntake() {
  const days = [];
  for (let i = 1; i <= 21; i++) {
    const k = addDays(dayKey(), -i);
    const t = dayTotals(k);
    if (t.kcal > 800) days.push(t.kcal);
  }
  return days.length >= 10 ? { avg: days.reduce((a, b) => a + b, 0) / days.length, n: days.length } : null;
}

function estimateTDEE(kg, ratePerWeek) {
  const f = formulaTDEE(kg);
  const intake = loggedIntake();
  const eaten = intake ? intake.avg : S.settings.goals.kcal;
  const observed = eaten - ratePerWeek * 7700 / 7;
  const w = intake ? 0.7 : 0.5;
  const value = Math.round(clamp(w * observed + (1 - w) * f, f * 0.75, f * 1.3) / 10) * 10;
  return { value, formula: Math.round(f), source: intake ? `Formel + ${intake.n} Tage Ernährungstagebuch + Gewichtsverlauf` : 'Formel + Gewichtsverlauf' };
}

function startRecommendation() {
  if (!bodyComplete()) return null;
  const series = smooth(weightSeries());
  if (!series.length) return null;
  const st = S.settings;
  const kg = series[series.length - 1].avg;
  const tdee = Math.round(formulaTDEE(kg) / 10) * 10;
  const rateKg = st.goal === 'cut' ? -kg * st.rate.cut / 100 : st.goal === 'bulk' ? kg * st.rate.bulk / 100 : 0;
  const adj = Math.round(rateKg * 7700 / 7 / 50) * 50;
  const kcal = Math.max(1200, Math.round((tdee + adj) / 50) * 50);
  const protein = Math.round(kg * (st.goal === 'cut' ? 2.0 : 1.8));
  const fat = Math.round(kg * 0.8);
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, tdee, adj, protein, fat, carbs };
}

function bodyCardHTML(latest) {
  const b = S.settings.body || {};
  if (!bodyComplete()) {
    return `<button class="wcard" id="bodyBtn"><div class="t"><b>Körperdaten angeben</b><span>Größe, Alter und Geschlecht für genauere Kalorien</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>`;
  }
  const kg = latest ? latest.avg : null;
  const bmi = kg ? kg / ((b.height / 100) ** 2) : null;
  return `<section class="card">
    <div class="card-title"><h2>Körperdaten</h2><button class="btn small" id="bodyBtn">${I.edit}Bearbeiten</button></div>
    <span class="muted" style="font-size:14px">${b.height} cm · ${b.age} Jahre · ${b.sex === 'm' ? 'männlich' : 'weiblich'} · Alltag ${ACTIVITY[b.activity || 'normal'][0].toLowerCase()} · ${trainingDaysPerWeek()} Trainings/Woche</span>
    ${kg ? `<div class="stats">
      <div class="stat"><b>${fmt(bmi, 1)}</b><span>BMI</span></div>
      <div class="stat"><b>${fmt(Math.round(bmr(kg) / 10) * 10)}</b><span>Grundumsatz</span></div>
      <div class="stat"><b>${fmt(Math.round(formulaTDEE(kg) / 10) * 10)}</b><span>Gesamtumsatz</span></div>
    </div>
    <span class="muted" style="font-size:12px">Schätzung nach Mifflin-St Jeor in kcal pro Tag. Der BMI unterschätzt Muskulatur, nimm ihn nur als grobe Orientierung.</span>` : '<span class="muted" style="font-size:14px">Trag dein Gewicht ein, dann siehst du hier deinen Energiebedarf.</span>'}
  </section>`;
}

function openBodyEditor() {
  const b = Object.assign({ activity: 'normal' }, S.settings.body || {});
  const el = openSheet({
    title: 'Körperdaten',
    body: `
      <div class="grid2">
        <div class="field"><label for="bdH">Größe (cm)</label><input class="input" id="bdH" inputmode="numeric" value="${b.height || ''}" placeholder="z. B. 180"></div>
        <div class="field"><label for="bdA">Alter</label><input class="input" id="bdA" inputmode="numeric" value="${b.age || ''}" placeholder="z. B. 25"></div>
      </div>
      <div class="field"><label>Geschlecht</label><div class="seg" id="bdS"><button data-v="m">Männlich</button><button data-v="f">Weiblich</button></div></div>
      <div class="field"><label>Alltag (ohne Training)</label><div class="seg" id="bdAct">${Object.entries(ACTIVITY).map(([k, v]) => `<button data-v="${k}">${v[0]}</button>`).join('')}</div>
        <span class="muted" id="bdActTxt" style="font-size:13px"></span></div>
      <p class="muted" style="margin:0;font-size:13px">Dein Training wird über den Wochenplan automatisch eingerechnet.</p>
      <button class="btn primary" id="bdSave">Speichern</button>`,
  });
  const mark = () => {
    $$('#bdS button', el).forEach(x => x.classList.toggle('on', x.dataset.v === b.sex));
    $$('#bdAct button', el).forEach(x => x.classList.toggle('on', x.dataset.v === b.activity));
    el.querySelector('#bdActTxt').textContent = ACTIVITY[b.activity][2];
  };
  $$('#bdS button', el).forEach(x => x.onclick = () => { b.sex = x.dataset.v; mark(); });
  $$('#bdAct button', el).forEach(x => x.onclick = () => { b.activity = x.dataset.v; mark(); });
  mark();
  el.querySelector('#bdSave').onclick = () => {
    b.height = Math.round(num(el.querySelector('#bdH').value));
    b.age = Math.round(num(el.querySelector('#bdA').value));
    if (!(b.height >= 120 && b.height <= 230)) { toast('Bitte eine Größe zwischen 120 und 230 cm eingeben'); return; }
    if (!(b.age >= 13 && b.age <= 100)) { toast('Bitte ein gültiges Alter eingeben'); return; }
    if (!b.sex) { toast('Bitte das Geschlecht auswählen'); return; }
    S.settings.body = b;
    save(); closeSheet(el); renderWeight(); updateWeightDot(); toast('Körperdaten gespeichert');
  };
}

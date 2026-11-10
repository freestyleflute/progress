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
  if (Math.abs(diff) > tol) {
    delta = clamp(Math.round(diff * 7700 / 7 / 50) * 50, -300, 300);
    if (Math.abs(delta) < 100) delta = Math.sign(diff) * 100;
  }
  return { state: 'ready', rate, target, avg, delta, due, snoozed, sinceAdjust };
}
function hasActiveRec() {
  const r = recommendation();
  return r.state === 'ready' && r.due && !r.snoozed && r.delta !== 0;
}

function recCardHTML(r) {
  const st = S.settings;
  if (r.state === 'collect') {
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
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewichtsverlauf">
    ${grid}
    <path class="area" d="${area}"/>
    ${dots}
    <path class="avg" d="${line}"/>
    <circle class="end" cx="${x(endP.d).toFixed(1)}" cy="${y(endP.avg).toFixed(1)}" r="5.5"/>
    ${lbl(startKey, 'start')}${lbl(days ? dayKey() : last, 'end')}
  </svg>`;
}

function renderWeight() {
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
      ${latest ? `<div class="big-weight"><b>${fmt(latest.kg, 1)}</b><span>kg · ${prettyDay(latest.d)}</span></div>` : ''}
      <div class="row">
        <input class="input" id="wIn" inputmode="decimal" placeholder="z. B. ${latest ? fmt(latest.kg, 1) : '80,0'}" value="${todayVal ? fmt(todayVal, 1) : ''}" aria-label="Gewicht in kg">
        <input class="input" id="wDate" type="date" value="${dayKey()}" max="${dayKey()}" aria-label="Datum">
      </div>
      <button class="btn primary" id="wSave">Speichern</button>
    </section>
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
    <section class="card">
      <div class="card-title"><h2>Ziel</h2></div>
      <div class="seg" id="wGoal">${['cut', 'maintain', 'bulk'].map(g => `<button data-g="${g}" class="${st.goal === g ? 'on' : ''}">${GOAL_LABEL[g]}</button>`).join('')}</div>
      ${st.goal === 'maintain' ? '<p class="muted" style="margin:0;font-size:14px">Ziel: Gewicht stabil halten.</p>' : `
        <div class="field"><label>Tempo (% Körpergewicht pro Woche)</label>
        <div class="seg" id="wRate">${RATE_OPTS[st.goal].map(x => `<button data-rt="${x}" class="${st.rate[st.goal] === x ? 'on' : ''}">${st.goal === 'cut' ? '–' : '+'}${fmt(x, 2)} %</button>`).join('')}</div></div>
        <p class="muted" style="margin:0;font-size:14px">${latest ? `Das sind etwa ${fmt(latest.avg * st.rate[st.goal] / 100, 2)} kg pro Woche. ` : ''}${st.goal === 'cut' ? 'Bewährt sind 0,5 bis 1 % pro Woche, langsamer schützt die Muskulatur besser.' : 'Für sauberen Aufbau eher langsam, etwa 0,25 % pro Woche.'}</p>`}
    </section>
    <section class="card">
      <div class="card-title"><h2>Messungen</h2><span class="sub">${all.length}</span></div>
      ${all.length ? `<div class="list">${all.slice().reverse().slice(0, 14).map(p => `
        <button class="list-item" data-wd="${p.d}"><div class="t"><b class="num">${fmt(p.kg, 1)} kg</b><span>${prettyDay(p.d)}</span></div><span class="muted num" style="font-size:14px">Ø ${fmt(p.avg, 1)}</span></button>`).join('')}</div>` : '<div class="empty">Noch keine Messungen.</div>'}
    </section>`;

  $('#wSet').onclick = () => openSettings();
  $('#wSave').onclick = () => {
    const val = num($('#wIn').value);
    const d = $('#wDate').value || dayKey();
    if (!(val > 25 && val < 350)) { toast('Bitte ein gültiges Gewicht eingeben'); return; }
    S.weights[d] = Math.round(val * 10) / 10;
    save(); haptic(); renderWeight(); updateWeightDot(); toast('Gewicht gespeichert');
  };
  $('#wDate').onchange = () => { const d = $('#wDate').value; $('#wIn').value = S.weights[d] ? fmt(S.weights[d], 1) : ''; };
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
  if ($('#recLater')) $('#recLater').onclick = () => { st.dismissedRec = dayKey(); save(); renderWeight(); updateWeightDot(); };
}

function updateWeightDot() {
  const dot = document.getElementById('weightDot');
  if (dot) dot.hidden = !hasActiveRec();
}

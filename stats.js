/* Statistik & persönliche Rekorde pro Übung. */
'use strict';

/* ---------- Körpergewicht ----------
   mode 'bw': Last = Körpergewicht + Zusatzgewicht, mode 'assist': Last = Körpergewicht – Unterstützung */
function exMode(exId, item) {
  if (item && item.mode !== undefined) return item.mode || null;
  const ex = S.exercises[exId];
  return (ex && ex.mode) || null;
}
function bwAt(ts) {
  const key = dayKey(new Date(ts));
  const ks = Object.keys(S.weights).sort();
  let v = null;
  for (const k of ks) { if (k <= key) v = S.weights[k]; else { if (v == null) v = S.weights[k]; break; } }
  return v;
}
function currentBW() { return bwAt(Date.now()); }
function effKg(mode, added, bw) {
  const a = num(added) || 0;
  if (!mode) return a;
  if (bw == null) return mode === 'assist' ? 0 : a;
  return mode === 'assist' ? Math.max(0, bw - a) : bw + a;
}
function kgShort(v) { return `${fmt(v, v % 1 ? 1 : 0)} kg`; }

/* Geschätztes 1RM nach Epley */
function e1rm(kg, reps) {
  kg = num(kg); reps = num(reps);
  if (!(kg > 0) || !(reps > 0)) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

/* Verlauf einer Übung: eine Zeile pro Training */
function exerciseHistory(exId, excludeId) {
  return S.sessions
    .filter(s => s.id !== excludeId)
    .slice().sort((a, b) => a.start - b.start)
    .map(s => {
      const it = s.items.find(x => x.exId === exId);
      if (!it) return null;
      const mode = exMode(exId, it);
      const bw = it.bw != null ? it.bw : bwAt(s.start);
      const sets = it.sets.filter(x => x.done).map(x => ({ kg: effKg(mode, x.kg, bw), add: num(x.kg) || 0, mode, reps: num(x.reps) || 0 }));
      if (!sets.length) return null;
      return {
        sid: s.id,
        start: s.start,
        d: dayKey(new Date(s.start)),
        sets,
        e1rm: Math.max(...sets.map(x => e1rm(x.kg, x.reps))),
        maxKg: Math.max(...sets.map(x => x.kg)),
        maxReps: Math.max(...sets.map(x => x.reps)),
        reps: sets.reduce((a, x) => a + x.reps, 0),
        volume: sets.reduce((a, x) => a + x.kg * x.reps, 0),
        bestSet: sets.reduce((b, x) => (x.kg * x.reps > b.kg * b.reps ? x : b), sets[0]),
      };
    })
    .filter(Boolean);
}

/* Bestwerte bis heute (ohne aktives Training) */
function exerciseBests(exId, excludeId) {
  const h = exerciseHistory(exId, excludeId);
  if (!h.length) return null;
  const pick = (k) => h.reduce((b, x) => (x[k] > b[k] ? x : b), h[0]);
  return { e1rm: pick('e1rm'), maxKg: pick('maxKg'), maxReps: pick('maxReps'), volume: pick('volume'), count: h.length, hist: h };
}

const PR_TYPES = {
  e1rm: 'Geschätztes 1RM',
  maxKg: 'Schwerstes Gewicht',
  maxReps: 'Meiste Wiederholungen',
  volume: 'Trainingsvolumen',
};
function prValueText(type, row) {
  if (type === 'e1rm') return `${fmt(row.e1rm, 1)} kg`;
  if (type === 'maxKg') return `${fmt(row.maxKg, row.maxKg % 1 ? 1 : 0)} kg`;
  if (type === 'maxReps') return `${row.maxReps} Wdh`;
  return `${fmt(row.volume)} kg`;
}

/* Alle Rekord-Ereignisse chronologisch. Das erste Training einer Übung zählt nicht als Rekord. */
function allPRs() {
  const out = [];
  Object.keys(Object.fromEntries(S.sessions.flatMap(s => s.items.map(it => [it.exId, 1])))).forEach(exId => {
    const h = exerciseHistory(exId);
    const bodyweight = h.every(r => r.maxKg === 0);
    const types = bodyweight ? ['maxReps'] : ['e1rm', 'maxKg', 'volume'];
    const best = {};
    h.forEach((r, i) => {
      types.forEach(t => {
        if (i > 0 && r[t] > best[t] + 1e-9) out.push({ exId, type: t, row: r, prev: best[t] });
        best[t] = Math.max(best[t] ?? 0, r[t]);
      });
    });
  });
  return out.sort((a, b) => b.row.start - a.row.start);
}

function exName(exId) {
  const ex = S.exercises[exId];
  if (ex) return ex.name;
  for (const s of S.sessions) { const it = s.items.find(x => x.exId === exId); if (it) return it.name; }
  return 'Übung';
}

/* Mehrere Rekorde derselben Übung im selben Training zusammenfassen */
function groupPRs(prs) {
  const order = ['e1rm', 'maxKg', 'maxReps', 'volume'];
  const map = new Map();
  prs.forEach(p => {
    const k = p.exId + '|' + p.row.sid;
    if (!map.has(k)) map.set(k, { exId: p.exId, row: p.row, types: [] });
    map.get(k).types.push(p.type);
  });
  return [...map.values()].map(g => (g.types.sort((a, b) => order.indexOf(a) - order.indexOf(b)), g));
}

/* Karte auf der Trainingsseite */
function prCardHTML() {
  const prs = allPRs();
  const weekStartTs = weekStart().getTime();
  const thisWeek = prs.filter(p => p.row.start >= weekStartTs).length;
  return `<section class="card">
    <div class="card-title"><h2>Persönliche Rekorde</h2><span class="sub">${thisWeek} diese Woche</span></div>
    ${prs.length ? `<div class="list">${groupPRs(prs).slice(0, 5).map(g => {
      const d = new Date(g.row.start);
      const main = g.types[0];
      return `<button class="list-item" data-stat="${g.exId}">
        <span class="trophy">${I.trophy}</span>
        <div class="t"><b>${esc(exName(g.exId))}</b><span>${g.types.map(t => PR_TYPES[t]).join(', ')} · ${d.getDate()}. ${MON[d.getMonth()]}</span></div>
        <span class="num" style="font-weight:600;font-size:15px;white-space:nowrap">${prValueText(main, g.row)}</span>
      </button>`;
    }).join('')}</div>` : '<div class="empty">Sobald du eine Übung zum zweiten Mal trainierst und dich steigerst, erscheinen hier deine Rekorde.</div>'}
    <button class="btn" id="allStatsBtn">${I.chart}Statistik pro Übung</button>
  </section>`;
}

/* Liniendiagramm für Übungswerte */
function lineChartSVG(pts, unit, days) {
  const W = 360, H = 200, L = 40, R = 12, T = 14, B = 26;
  if (pts.length < 2) return `<div class="empty">${pts.length ? 'Nach dem nächsten Training mit dieser Übung siehst du hier deinen Verlauf.' : 'Im gewählten Zeitraum gibt es noch keine Daten.'}</div>`;
  const startKey = days ? addDays(dayKey(), -days + 1) : pts[0].d;
  const endKey = days ? dayKey() : pts[pts.length - 1].d;
  const span = Math.max(1, daysBetween(startKey, endKey));
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  const pad = Math.max((hi - lo) * 0.15, hi * 0.03, 1);
  lo = Math.max(0, lo - pad); hi = hi + pad;
  const x = d => L + daysBetween(startKey, d) / span * (W - L - R);
  const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const dec = hi - lo < 10 ? 1 : 0;
  const grid = [0, 1, 2, 3, 4].map(i => lo + (hi - lo) * i / 4).map(v =>
    `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="axis" x="${L - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v, dec)}</text>`).join('');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].d).toFixed(1)},${H - B} L${x(pts[0].d).toFixed(1)},${H - B} Z`;
  const maxV = Math.max(...pts.map(p => p.v));
  const dots = pts.map(p => `<circle class="${p.v === maxV ? 'best' : 'pt'}" cx="${x(p.d).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${p.v === maxV ? 5.5 : 3.2}"/>`).join('');
  const lbl = (d, a) => { const t = parseDay(d); return `<text class="axis" x="${x(d).toFixed(1)}" y="${H - 8}" text-anchor="${a}">${t.getDate()}. ${MON[t.getMonth()]}</text>`; };
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Verlauf in ${unit}">${grid}<path class="area" d="${area}"/><path class="avg" d="${line}"/>${dots}${lbl(startKey, 'start')}${lbl(endKey, 'end')}</svg>`;
}

/* Statistik-Sheet einer Übung */
const STAT_METRICS = [
  ['e1rm', 'Kraft', 'kg', 'Geschätztes 1RM pro Training (Epley-Formel)'],
  ['maxKg', 'Gewicht', 'kg', 'Schwerstes Gewicht pro Training'],
  ['reps', 'Wdh', 'Wdh', 'Wiederholungen pro Training, alle Sätze zusammen'],
  ['volume', 'Volumen', 'kg', 'Volumen pro Training (Gewicht × Wiederholungen)'],
];
const STAT_RANGES = [['1M', 30], ['3M', 91], ['6M', 182], ['1J', 365], ['Alle', 0]];

function openExerciseStats(exId) {
  const h = exerciseHistory(exId);
  const bodyweight = h.length && h.every(r => r.maxKg === 0);
  let metric = bodyweight ? 'reps' : 'e1rm';
  let range = 'Alle';
  const ex = S.exercises[exId];
  const el = openSheet({
    title: exName(exId),
    headRight: ex ? `<button class="icon-btn" id="stEdit" aria-label="Übung bearbeiten">${I.edit}</button>` : '',
    body: '<div id="stBody" style="display:flex;flex-direction:column;gap:14px"></div>',
  });
  if (ex) el.querySelector('#stEdit').onclick = () => openExerciseEditor(exId, () => { closeSheet(el); });

  const draw = () => {
    const body = el.querySelector('#stBody');
    if (!h.length) {
      body.innerHTML = `<p class="muted" style="margin:0">${ex ? esc(musclesText(ex)) : ''}</p>
        <div class="empty">Noch keine Trainings mit dieser Übung. Nach deinem ersten Training erscheinen hier Rekorde und Graphen.</div>`;
      return;
    }
    const days = STAT_RANGES.find(r => r[0] === range)[1];
    const rows = days ? h.filter(r => daysBetween(r.d, dayKey()) < days) : h;
    const m = STAT_METRICS.find(x => x[0] === metric);
    const pts = rows.map(r => ({ d: r.d, v: r[metric] }));
    const b = exerciseBests(exId);
    const first = pts[0], last = pts[pts.length - 1];
    const change = pts.length >= 2 && first.v > 0 ? (last.v - first.v) / first.v * 100 : null;
    const weeks = pts.length >= 2 ? Math.max(1, daysBetween(first.d, last.d) / 7) : null;
    const perWeek = pts.length >= 2 ? (last.v - first.v) / weeks : null;
    const lastRow = h[h.length - 1];
    const prevRow = h.length > 1 ? h[h.length - 2] : null;
    const sinceBest = daysBetween(b[bodyweight ? 'maxReps' : 'e1rm'].d, dayKey());
    const recTile = (k, label, val, row) => `<div class="stat"><b>${val}</b><span>${label}</span><span class="when">${row ? prettyDay(row.d) : ''}</span></div>`;
    const kgTxt = v => `${fmt(v, v % 1 ? 1 : 0)} kg`;

    body.innerHTML = `
      ${ex ? `<p class="muted" style="margin:0;font-size:14px">${esc(musclesText(ex))}</p>` : ''}
      ${(() => { const pr = progressionFor(exId); return pr ? `<div class="eyebrow">Nächstes Training</div>${progressionHTML(pr)}` : ''; })()}
      <div class="eyebrow">Rekorde</div>
      <div class="stats" style="grid-template-columns:repeat(2,1fr)">
        ${bodyweight ? '' : recTile('e1rm', 'Geschätztes 1RM', kgTxt(Math.round(b.e1rm.e1rm * 10) / 10), b.e1rm)}
        ${bodyweight ? '' : recTile('maxKg', 'Schwerstes Gewicht', kgTxt(b.maxKg.maxKg), b.maxKg)}
        ${recTile('maxReps', 'Meiste Wdh in einem Satz', `${b.maxReps.maxReps}`, b.maxReps)}
        ${bodyweight ? '' : recTile('volume', 'Bestes Trainingsvolumen', kgTxt(Math.round(b.volume.volume)), b.volume)}
      </div>
      <div class="seg" id="stMetric">${STAT_METRICS.filter(x => !bodyweight || x[0] === 'reps').map(([k, l]) => `<button data-m="${k}" class="${k === metric ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="seg" id="stRange">${STAT_RANGES.map(([k]) => `<button data-r="${k}" class="${k === range ? 'on' : ''}">${k}</button>`).join('')}</div>
      <p class="muted" style="margin:0;font-size:13px">${m[3]}</p>
      <div class="chart">${lineChartSVG(pts, m[2], days)}</div>
      <div class="eyebrow">Insights</div>
      <div class="stats">
        <div class="stat"><b class="${change == null ? '' : change >= 0 ? 'green' : 'red'}">${change == null ? '–' : (change > 0 ? '+' : '') + fmt(change, 0) + ' %'}</b><span>im Zeitraum</span></div>
        <div class="stat"><b>${perWeek == null ? '–' : (perWeek > 0 ? '+' : '') + fmt(perWeek, 1)}</b><span>${m[2]} pro Woche</span></div>
        <div class="stat"><b>${rows.length}</b><span>Trainings</span></div>
      </div>
      <div class="list insights">
        <div class="list-item"><div class="t"><b>Letztes Training</b><span class="num">${prettyDay(lastRow.d)} · ${lastRow.sets.map(x => setText(x)).join(' · ')}</span></div></div>
        ${prevRow ? `<div class="list-item"><div class="t"><b>Gegenüber dem Training davor</b><span class="num">${compareText(lastRow, prevRow, bodyweight)}</span></div></div>` : ''}
        <div class="list-item"><div class="t"><b>Letzter Rekord</b><span>${sinceBest === 0 ? 'Heute' : `vor ${sinceBest} Tagen`}${!bodyweight && sinceBest >= 28 && h.length >= 4 ? ' · seit 4 Wochen kein neues Bestwert, eventuell Wiederholungsbereich oder Übungsreihenfolge ändern' : ''}</span></div></div>
        ${!bodyweight ? `<div class="list-item"><div class="t"><b>Bester Satz</b><span class="num">${setText(b.volume.bestSet)} (${fmt(b.volume.bestSet.kg * b.volume.bestSet.reps)} kg Volumen)</span></div></div>` : ''}
      </div>
      <div class="eyebrow">Alle Trainings</div>
      <div class="list">${h.slice().reverse().map(r => `<div class="list-item"><div class="t"><b>${prettyDay(r.d)}</b><span class="num">${r.sets.map(x => setText(x)).join(' · ')}</span></div>
        <span class="muted num" style="font-size:13px;white-space:nowrap">${bodyweight ? r.reps + ' Wdh' : '1RM ' + fmt(r.e1rm, 0)}</span></div>`).join('')}</div>`;
    $$('#stMetric button', body).forEach(x => x.onclick = () => { metric = x.dataset.m; draw(); });
    $$('#stRange button', body).forEach(x => x.onclick = () => { range = x.dataset.r; draw(); });
  };
  draw();
}

function compareText(a, b, bodyweight) {
  const parts = [];
  const d = (v, unit, dec = 0) => `${v > 0 ? '+' : ''}${fmt(v, dec)} ${unit}`;
  if (!bodyweight) parts.push(`1RM ${d(a.e1rm - b.e1rm, 'kg', 1)}`);
  parts.push(`Wdh ${d(a.reps - b.reps, '')}`.trim());
  if (!bodyweight) parts.push(`Volumen ${d(a.volume - b.volume, 'kg')}`);
  return parts.join(' · ');
}

/* Übersicht aller Übungen mit Kennzahl */
function openAllStats() {
  const ids = Object.keys(Object.fromEntries(S.sessions.flatMap(s => s.items.map(it => [it.exId, 1]))));
  const rows = ids.map(id => ({ id, b: exerciseBests(id) })).filter(r => r.b).sort((a, z) => z.b.hist[z.b.hist.length - 1].start - a.b.hist[a.b.hist.length - 1].start);
  const el = openSheet({
    title: 'Statistik',
    body: rows.length ? `<div class="list">${rows.map(({ id, b }) => {
      const bw = b.hist.every(r => r.maxKg === 0);
      return `<button class="list-item" data-stat="${id}">
        <div class="t"><b>${esc(exName(id))}</b><span>${b.count} Trainings · zuletzt ${prettyDay(b.hist[b.hist.length - 1].d)}</span></div>
        <span class="num" style="font-weight:600;white-space:nowrap">${bw ? b.maxReps.maxReps + ' Wdh' : '1RM ' + fmt(b.e1rm.e1rm, 0) + ' kg'}</span>
        <svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>`;
    }).join('')}</div>` : '<div class="empty">Noch keine Trainings gespeichert.</div>',
  });
  $$('[data-stat]', el).forEach(b => b.onclick = () => openExerciseStats(b.dataset.stat));
}


/* ---------- Progressionsvorschlag ----------
   Regel: Wurden beim letzten Training in irgendeinem Satz 12+ Wiederholungen geschafft, mehr Gewicht.
   +5 kg bei großen Beinübungen ab 40 kg, sonst +2,5 kg. Bei Übungen mit Unterstützung wird diese reduziert. */
const PROG_REPS = 12;
const LOWER_BODY = ['quads', 'hamstrings', 'glutes', 'adductors'];
function progressionFor(exId, excludeId) {
  const h = exerciseHistory(exId, excludeId);
  if (!h.length) return null;
  const last = h[h.length - 1];
  const ex = S.exercises[exId] || {};
  const name = ex.name || exName(exId);
  const mode = exMode(exId);
  const assisted = mode === 'assist' || (!mode && /unterstütz|assist/i.test(name));
  if (mode === 'bw') {
    const add = Math.max(...last.sets.map(x => x.add || 0));
    const hitBw = last.sets.some(x => x.reps >= PROG_REPS);
    const mr = Math.max(...last.sets.map(x => x.reps));
    const cur = add ? `BW+${kgShort(add)}` : 'BW';
    return hitBw
      ? { type: 'up', kg: add + 2.5, inc: 2.5, text: `${PROG_REPS}+ geschafft! Heute BW+${kgShort(add + 2.5)} Zusatzgewicht (+2,5 kg)` }
      : { type: 'reps', kg: add, text: `Bleib bei ${cur} und schaff mehr Wiederholungen als letztes Mal (${mr}). Ab ${PROG_REPS} kommt Zusatzgewicht dazu.` };
  }
  const kgs = last.sets.map(x => (x.mode ? x.add : x.kg)).filter(x => x > 0);
  const hit = last.sets.some(x => x.reps >= PROG_REPS);
  const maxReps = Math.max(...last.sets.map(x => x.reps));
  if (!kgs.length && !assisted) {
    return hit
      ? { type: 'bw', text: `${maxReps} Wdh geschafft. Nimm Zusatzgewicht (+2,5 kg) oder mach die Wiederholungen langsamer.` }
      : { type: 'reps', text: `Ziel: mehr Wiederholungen als letztes Mal (${maxReps}), bis ${PROG_REPS}.` };
  }
  const base = assisted ? Math.min(...kgs) : Math.max(...kgs);
  const lower = (ex.primary || []).some(m => LOWER_BODY.includes(m));
  const inc = lower && base >= 40 ? 5 : 2.5;
  const kgTxt = v => `${fmt(v, v % 1 ? 1 : 0)} kg`;
  if (!hit) {
    const lbl = assisted && mode === 'assist' ? `BW−${kgTxt(base)}` : kgTxt(base);
    return { type: 'reps', kg: base, text: `Bleib bei ${lbl} und schaff mehr Wiederholungen als letztes Mal (${maxReps}). Ab ${PROG_REPS} geht es ${assisted ? 'mit weniger Unterstützung weiter' : 'hoch'}.` };
  }
  if (assisted) {
    const kg = Math.max(0, base - inc);
    return { type: 'up', kg, inc: -inc, text: `${PROG_REPS}+ geschafft! Weniger Unterstützung: ${mode === 'assist' ? 'BW−' : ''}${kgTxt(kg)} (–${fmt(inc, inc % 1 ? 1 : 0)} kg)` };
  }
  const kg = base + inc;
  return { type: 'up', kg, inc, text: `${PROG_REPS}+ geschafft! Heute ${kgTxt(kg)} (+${fmt(inc, inc % 1 ? 1 : 0)} kg)` };
}
function progressionHTML(p) {
  if (!p) return '';
  return `<div class="prog-tip ${p.type === 'up' ? 'up' : ''}">${p.type === 'up' ? I.up : I.right}<span>${esc(p.text)}</span></div>`;
}

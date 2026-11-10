/* CSV-Import für Gewichtsdaten aus anderen Apps. Erkennt Trennzeichen, Spalten, Datumsformate und kg/lbs. */
'use strict';

function csvParse(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const sample = lines.slice(0, 10).join('\n');
  const count = (d) => sample.split('\n').map(l => splitLine(l, d).length);
  let delim = ',';
  let bestScore = 0;
  [',', ';', '\t', '|'].forEach(d => {
    const c = count(d);
    const consistent = c.every(x => x === c[0]);
    const score = c[0] > 1 ? c[0] * (consistent ? 2 : 1) : 0;
    if (score > bestScore) { bestScore = score; delim = d; }
  });
  return lines.map(l => splitLine(l, delim).map(c => c.trim()));
}
function splitLine(line, d) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === d && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/* Datum → 'YYYY-MM-DD'. order: 'dmy' | 'mdy' für Formate mit / oder . */
function csvDate(v, order = 'dmy') {
  if (!v) return null;
  v = v.trim();
  let m;
  if ((m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return mkDate(+m[1], +m[2], +m[3]);
  if ((m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/))) {
    let y = +m[3]; if (y < 100) y += 2000;
    const a = +m[1], b = +m[2];
    const sep = v.match(/^\d{1,2}([./-])/)[1];
    const useMdy = sep === '.' ? false : order === 'mdy';
    return useMdy ? mkDate(y, a, b) : mkDate(y, b, a);
  }
  if (/^\d{10}(\.\d+)?$/.test(v)) return dayKey(new Date(+v * 1000));
  if (/^\d{13}$/.test(v)) return dayKey(new Date(+v));
  const t = Date.parse(v);
  if (!isNaN(t) && /[a-zA-Z]{3}/.test(v)) return dayKey(new Date(t));
  return null;
}
function mkDate(y, mo, d) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getMonth() !== mo - 1) return null;
  return dayKey(dt);
}
function csvNum(v) {
  if (v == null) return NaN;
  const s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s) return NaN;
  // "1.234,5" oder "1,234.5" sauber lesen
  if (s.includes(',') && s.includes('.')) return s.lastIndexOf(',') > s.lastIndexOf('.') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(/,/g, ''));
  return parseFloat(s.replace(',', '.'));
}

function csvAnalyze(rows) {
  const first = rows[0] || [];
  const hasHeader = first.some(c => c && isNaN(csvNum(c)) && !csvDate(c));
  const header = hasHeader ? first : first.map((_, i) => `Spalte ${i + 1}`);
  const data = hasHeader ? rows.slice(1) : rows;
  const nCols = Math.max(...rows.map(r => r.length));
  const cols = Array.from({ length: nCols }, (_, i) => data.map(r => r[i] || ''));
  const dateScore = cols.map(c => c.filter(v => csvDate(v)).length);
  let dateCol = dateScore.indexOf(Math.max(...dateScore));
  const nameHit = (i, re) => re.test((header[i] || '').toLowerCase());
  const weightScore = cols.map((c, i) => {
    if (i === dateCol) return -1;
    const vals = c.map(csvNum).filter(x => x > 20 && x < 800);
    let sc = vals.length;
    if (nameHit(i, /gewicht|weight|körpergewicht|kg|lb|mass|masse/)) sc += data.length;
    if (nameHit(i, /fett|fat|bmi|muskel|muscle|wasser|water|bone|knochen|%|kcal|puls|time|zeit/)) sc -= data.length;
    return sc;
  });
  const weightCol = weightScore.indexOf(Math.max(...weightScore));
  // Datumsreihenfolge bei a/b/yyyy erraten
  let order = 'dmy';
  const slash = cols[dateCol] ? cols[dateCol].filter(v => /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v)) : [];
  if (slash.some(v => +v.split('/')[1] > 12)) order = 'mdy';
  const unit = nameHit(weightCol, /lb|pound|pfund/) ? 'lbs' : 'kg';
  return { header, data, dateCol, weightCol, order, unit, ambiguousOrder: slash.length > 0 && !slash.some(v => +v.split('/')[0] > 12 || +v.split('/')[1] > 12) };
}

function csvCollect(a, cfg) {
  const perDay = {};
  let skipped = 0;
  a.data.forEach(r => {
    const d = csvDate(r[cfg.dateCol], cfg.order);
    let w = csvNum(r[cfg.weightCol]);
    if (cfg.unit === 'lbs') w = w * 0.45359237;
    if (!d || !(w > 25 && w < 350)) { skipped++; return; }
    (perDay[d] || (perDay[d] = [])).push(w);
  });
  const days = Object.keys(perDay).sort();
  const values = Object.fromEntries(days.map(d => [d, Math.round(perDay[d].reduce((x, y) => x + y, 0) / perDay[d].length * 10) / 10]));
  return { values, days, skipped };
}

function openCsvImport(file) {
  const r = new FileReader();
  r.onload = () => {
    let rows;
    try { rows = csvParse(String(r.result)); } catch (e) { rows = []; }
    if (rows.length < 2) { toast('Die Datei enthält keine lesbaren Daten'); return; }
    const a = csvAnalyze(rows);
    const cfg = { dateCol: a.dateCol, weightCol: a.weightCol, order: a.order, unit: a.unit, overwrite: true };
    const opts = (sel) => a.header.map((h, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(h || 'Spalte ' + (i + 1))}</option>`).join('');
    const el = openSheet({
      title: 'Gewicht importieren',
      body: `
        <p class="muted" style="margin:0;font-size:14px">${esc(file.name)} · ${a.data.length} Zeilen</p>
        <div class="grid2">
          <div class="field"><label for="ciDate">Datum-Spalte</label><select class="input" id="ciDate">${opts(cfg.dateCol)}</select></div>
          <div class="field"><label for="ciW">Gewicht-Spalte</label><select class="input" id="ciW">${opts(cfg.weightCol)}</select></div>
        </div>
        <div class="field"><label>Einheit in der Datei</label><div class="seg" id="ciUnit"><button data-u="kg">kg</button><button data-u="lbs">lbs</button></div></div>
        <div class="field" id="ciOrderWrap" ${a.ambiguousOrder ? '' : 'hidden'}><label>Datumsformat (z. B. 03/05/2024)</label><div class="seg" id="ciOrder"><button data-o="dmy">Tag/Monat</button><button data-o="mdy">Monat/Tag</button></div></div>
        <div class="field"><label>Wenn es an einem Tag schon einen Wert gibt</label><div class="seg" id="ciOver"><button data-ov="1">Ersetzen</button><button data-ov="0">Behalten</button></div></div>
        <div class="card" style="padding:14px;gap:8px" id="ciPrev"></div>
        <button class="btn primary" id="ciGo">${I.upload}Importieren</button>`,
    });
    const segSet = (id, attr, val) => $$(`#${id} button`, el).forEach(b => b.classList.toggle('on', b.dataset[attr] === String(val)));
    const draw = () => {
      segSet('ciUnit', 'u', cfg.unit); segSet('ciOrder', 'o', cfg.order); segSet('ciOver', 'ov', cfg.overwrite ? 1 : 0);
      const res = csvCollect(a, cfg);
      const existing = res.days.filter(d => S.weights[d] != null).length;
      const prev = el.querySelector('#ciPrev');
      if (!res.days.length) {
        prev.innerHTML = `<b class="red">Keine gültigen Werte gefunden.</b><span class="muted" style="font-size:14px">Prüfe Datum- und Gewicht-Spalte. Erwartet werden Werte zwischen 25 und 350 kg.</span>`;
        el.querySelector('#ciGo').disabled = true;
        return;
      }
      el.querySelector('#ciGo').disabled = false;
      const f = res.days[0], l = res.days[res.days.length - 1];
      prev.innerHTML = `
        <div class="stats">
          <div class="stat"><b>${res.days.length}</b><span>Tage</span></div>
          <div class="stat"><b>${fmt(res.values[f], 1)}</b><span>erster Wert</span></div>
          <div class="stat"><b>${fmt(res.values[l], 1)}</b><span>letzter Wert</span></div>
        </div>
        <span class="muted" style="font-size:14px">${longDate(f)} bis ${longDate(l)}${existing ? ` · ${existing} Tage gibt es schon` : ''}${res.skipped ? ` · ${res.skipped} Zeilen übersprungen` : ''}</span>
        <span class="muted" style="font-size:13px">Mehrere Messungen am selben Tag werden gemittelt.</span>`;
    };
    el.querySelector('#ciDate').onchange = e => { cfg.dateCol = +e.target.value; draw(); };
    el.querySelector('#ciW').onchange = e => { cfg.weightCol = +e.target.value; draw(); };
    $$('#ciUnit button', el).forEach(b => b.onclick = () => { cfg.unit = b.dataset.u; draw(); });
    $$('#ciOrder button', el).forEach(b => b.onclick = () => { cfg.order = b.dataset.o; draw(); });
    $$('#ciOver button', el).forEach(b => b.onclick = () => { cfg.overwrite = b.dataset.ov === '1'; draw(); });
    el.querySelector('#ciGo').onclick = () => {
      const res = csvCollect(a, cfg);
      let n = 0;
      res.days.forEach(d => { if (cfg.overwrite || S.weights[d] == null) { S.weights[d] = res.values[d]; n++; } });
      save(); closeSheet(el); weightRange = 'Alle'; renderWeight(); updateWeightDot();
      toast(`${n} Messungen importiert`);
    };
    draw();
  };
  r.onerror = () => toast('Datei konnte nicht gelesen werden');
  r.readAsText(file);
}

function longDate(k) { const d = parseDay(k); return `${d.getDate()}. ${MON[d.getMonth()]} ${d.getFullYear()}`; }

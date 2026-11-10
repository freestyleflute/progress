/* Start, Tabs, Einstellungen, Backup. */
'use strict';

let currentTab = 'food';
const TAB_KEY = 'progress-tab';

function setTab(t) {
  currentTab = t;
  try { sessionStorage.setItem(TAB_KEY, t); } catch (e) {}
  $$('#tabbar .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  if (t === 'food') renderFood();
  if (t === 'train') renderTrain();
  if (t === 'weight') renderWeight();
  injectBackupBanner();
  window.scrollTo(0, 0);
}

function openSettings(section) {
  const g = S.settings.goals;
  const st = S.settings;
  const goalField = (k, label, unit) => `<div class="field"><label for="g_${k}">${label} (${unit})</label><input class="input" id="g_${k}" inputmode="decimal" value="${fmt(g[k], k === 'salt' ? 1 : 0)}"></div>`;
  const el = openSheet({
    title: 'Einstellungen',
    body: `
      <div class="eyebrow" id="secFood">Ernährungsziele pro Tag</div>
      <div class="grid2">
        ${goalField('kcal', 'Kalorien', 'kcal')}
        ${goalField('protein', 'Protein', 'g')}
        ${goalField('carbs', 'Kohlenhydrate', 'g')}
        ${goalField('fat', 'Fett', 'g')}
        ${goalField('salt', 'Salz max.', 'g')}
        ${goalField('fiber', 'Ballaststoffe', 'g')}
        ${goalField('caffeine', 'Koffein max.', 'mg')}
      </div>
      <p class="muted" id="macroCheck" style="margin:0;font-size:13px"></p>

      <div class="eyebrow" id="secTrain" style="margin-top:8px">Training</div>
      <div class="field"><label>Pausen-Timer</label>
        <div class="seg" id="restSeg">${[60, 90, 120, 150, 180, 240].map(s => `<button data-rs="${s}" class="${st.restSec === s ? 'on' : ''}">${clockStr(s * 1000)}</button>`).join('')}</div></div>
      <div class="field"><label>Sekundäre Muskeln zählen als</label>
        <div class="seg" id="secSeg">${[0.25, 0.5].map(f => `<button data-sf="${f}" class="${st.secondaryFactor === f ? 'on' : ''}">${fmt(f, 2)} Satz</button>`).join('')}</div></div>
      <div class="field"><label>Wachstumszone (Sätze pro Muskel und Woche)</label>
        <div class="grid3">
          <div class="field"><label for="zLow">Minimum</label><input class="input" id="zLow" inputmode="numeric" value="${st.zones.low}"></div>
          <div class="field"><label for="zOpt">Optimal ab</label><input class="input" id="zOpt" inputmode="numeric" value="${st.zones.opt}"></div>
          <div class="field"><label for="zHigh">Optimal bis</label><input class="input" id="zHigh" inputmode="numeric" value="${st.zones.high}"></div>
        </div></div>

      <button class="btn primary" id="setSave">Speichern</button>

      <div class="eyebrow" style="margin-top:8px">Daten</div>
      <p class="muted" style="margin:0;font-size:14px">Alle Daten liegen nur auf diesem iPhone. Exportiere regelmäßig ein Backup, z. B. in die Dateien-App oder iCloud.</p>
      <p style="margin:0;font-size:14px;font-weight:600">${backupLabel()}</p>
      <button class="btn" id="expBtn">Backup exportieren</button>
      <label class="btn" for="impFile" style="cursor:pointer">Backup importieren</label>
      <input type="file" id="impFile" accept="application/json,.json" hidden>
      <button class="btn danger" id="resetBtn">Alle Daten löschen</button>`,
  });
  const check = () => {
    const p = num(el.querySelector('#g_protein').value) || 0, c = num(el.querySelector('#g_carbs').value) || 0, f = num(el.querySelector('#g_fat').value) || 0;
    const k = num(el.querySelector('#g_kcal').value) || 0;
    const sum = p * 4 + c * 4 + f * 9;
    el.querySelector('#macroCheck').textContent = `Deine Makros ergeben ${fmt(sum)} kcal${Math.abs(sum - k) > 50 ? ` (Kalorienziel: ${fmt(k)} kcal)` : ' und passen zum Kalorienziel.'}`;
  };
  ['kcal', 'protein', 'carbs', 'fat'].forEach(k => el.querySelector('#g_' + k).addEventListener('input', check));
  check();
  let restSec = st.restSec, secF = st.secondaryFactor;
  $$('#restSeg button', el).forEach(b => b.onclick = () => { restSec = +b.dataset.rs; $$('#restSeg button', el).forEach(x => x.classList.toggle('on', x === b)); });
  $$('#secSeg button', el).forEach(b => b.onclick = () => { secF = num(b.dataset.sf); $$('#secSeg button', el).forEach(x => x.classList.toggle('on', x === b)); });

  el.querySelector('#setSave').onclick = () => {
    for (const k of NUTRIENTS) {
      const val = num(el.querySelector('#g_' + k).value);
      if (!(val >= 0)) { toast('Bitte alle Ziele als Zahl eingeben'); return; }
      g[k] = val;
    }
    const lo = num(el.querySelector('#zLow').value), op = num(el.querySelector('#zOpt').value), hi = num(el.querySelector('#zHigh').value);
    if (!(lo > 0 && op > lo && hi > op)) { toast('Zonen: Minimum < optimal ab < optimal bis'); return; }
    st.zones = { low: lo, opt: op, high: hi };
    st.restSec = restSec;
    st.secondaryFactor = secF;
    save(); closeSheet(el); setTab(currentTab); toast('Gespeichert');
  };
  el.querySelector('#expBtn').onclick = exportBackup;
  el.querySelector('#impFile').onchange = (e) => importBackup(e.target.files[0], el);
  el.querySelector('#resetBtn').onclick = async () => {
    if (await confirmSheet({ title: 'Alle Daten löschen?', text: 'Ernährung, Trainings, Übungen und Gewicht werden unwiderruflich gelöscht. Exportiere vorher ein Backup.', okLabel: 'Alles löschen' })) {
      S = defaultState(); saveNow(); closeAllSheets(); setTab('food'); toast('Alle Daten gelöscht');
    }
  };
  if (section === 'training') setTimeout(() => el.querySelector('#secTrain').scrollIntoView({ block: 'start' }), 350);
}

async function exportBackup() {
  saveNow();
  const name = `progress-backup-${dayKey()}.json`;
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Progress Backup' });
      markBackup();
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  markBackup();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- Backup-Erinnerung ---------- */
const BACKUP_DAYS = 7;
function markBackup() {
  S.settings.lastBackup = Date.now();
  S.settings.backupSnooze = null;
  saveNow();
  toast('Backup erstellt');
  const b = document.getElementById('backupBanner');
  if (b) b.remove();
}
function backupDue() {
  const st = S.settings;
  const hasData = S.sessions.length || Object.keys(S.diary).length || Object.keys(S.weights).length;
  if (!hasData) return null;
  if (st.backupSnooze && Date.now() < st.backupSnooze) return null;
  const now = Date.now();
  if (st.lastBackup) {
    const days = Math.floor((now - st.lastBackup) / 86400000);
    return days >= BACKUP_DAYS ? days : null;
  }
  const since = Math.floor((now - (st.createdAt || now)) / 86400000);
  return since >= 3 ? -1 : null;
}
function backupLabel() {
  const lb = S.settings.lastBackup;
  if (!lb) return 'Noch kein Backup erstellt';
  const d = new Date(lb);
  const days = Math.floor((Date.now() - lb) / 86400000);
  return `Letztes Backup: ${d.getDate()}. ${MON[d.getMonth()]} ${d.getFullYear()}${days ? ` (vor ${days} ${days === 1 ? 'Tag' : 'Tagen'})` : ' (heute)'}`;
}
function injectBackupBanner() {
  const due = backupDue();
  const head = document.querySelector('#view .head');
  if (due == null || !head || document.getElementById('backupBanner')) return;
  const el = document.createElement('section');
  el.className = 'backup-banner';
  el.id = 'backupBanner';
  el.innerHTML = `<div class="t"><b>${due < 0 ? 'Sichere deine Daten' : `Letztes Backup vor ${due} Tagen`}</b>
      <span>Alles liegt nur auf diesem iPhone. Ein Backup in iCloud oder der Dateien-App schützt deinen Fortschritt.</span></div>
    <div class="row"><button class="btn small primary" data-bk>Jetzt sichern</button><button class="btn small" data-later>Später</button></div>`;
  head.after(el);
  el.querySelector('[data-bk]').onclick = exportBackup;
  el.querySelector('[data-later]').onclick = () => { S.settings.backupSnooze = Date.now() + 2 * 86400000; save(); el.remove(); };
}

function importBackup(file, sheetEl) {
  if (!file) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const data = JSON.parse(r.result);
      if (!data || typeof data !== 'object' || !data.settings || !data.exercises) throw new Error('format');
      if (!(await confirmSheet({ title: 'Backup importieren?', text: 'Deine aktuellen Daten werden durch das Backup ersetzt.', okLabel: 'Importieren', danger: false }))) return;
      S = migrate(data);
      saveNow();
      closeAllSheets();
      setTab(currentTab);
      updateWeightDot();
      toast('Backup importiert');
    } catch (e) {
      toast('Diese Datei ist kein gültiges Backup');
    }
  };
  r.readAsText(file);
}

/* ---------- Start ---------- */
(function init() {
  $$('#tabbar .tab').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  let start = 'food';
  try { start = sessionStorage.getItem(TAB_KEY) || 'food'; } catch (e) {}
  if (S.active) start = 'train';
  if (hasPlan() && !S.settings.planSince) { S.settings.planSince = dayKey(); save(); }
  setTab(start);
  updateWeightDot();
  // Tageswechsel, wenn die App lange offen bleibt
  let lastDay = dayKey();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && dayKey() !== lastDay) {
      if (foodDay === lastDay) foodDay = dayKey();
      lastDay = dayKey();
      setTab(currentTab);
      updateWeightDot();
    }
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();

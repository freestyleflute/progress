/* Training: Wochenvolumen-Karte, eigene Trainings, Übungen, aktives Training, Pausen-Timer. */
'use strict';

let showVolDetail = false;

/* ---------- Wochenvolumen ---------- */
function weeklyVolume(ref = new Date()) {
  const start = weekStart(ref);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const f = S.settings.secondaryFactor;
  const vol = Object.fromEntries(MUSCLES.map(([m]) => [m, 0]));
  S.sessions.forEach(s => {
    const t = new Date(s.start);
    if (t < start || t >= end) return;
    s.items.forEach(it => {
      const ex = S.exercises[it.exId] || it;
      const done = it.sets.filter(st => st.done && st.type !== 'w').length;
      if (!done) return;
      (ex.primary || []).forEach(m => { vol[m] += done; });
      (ex.secondary || []).forEach(m => { vol[m] += done * f; });
    });
  });
  return vol;
}

function musclesText(ex) {
  const p = (ex.primary || []).map(m => MUSCLE_NAME[m]);
  const s = (ex.secondary || []).map(m => MUSCLE_NAME[m]);
  return p.join(', ') + (s.length ? ` · sekundär: ${s.join(', ')}` : '');
}

function zoneColor(v) {
  const z = zoneOf(v);
  return { '': 'var(--muscle)', z1: 'color-mix(in srgb, var(--green) 35%, var(--muscle))', z2: 'var(--yellow)', z3: 'var(--green)', z4: 'var(--orange)' }[z];
}

function renderTrain() {
  setTimeout(() => { if (typeof injectBackupBanner === 'function') injectBackupBanner(); }, 0);
  const v = document.getElementById('view');
  const vol = weeklyVolume();
  const z = S.settings.zones;
  const inZone = MUSCLES.filter(([m]) => vol[m] >= z.opt).length;
  const pct = Math.round(inZone / MUSCLES.length * 100);
  const max = Math.max(z.high + 4, ...Object.values(vol));

  // Wochenleiste
  const ws = weekStart();
  const todayK = dayKey();
  const trainedDays = new Set(S.sessions.map(s => dayKey(new Date(s.start))));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });

  const workouts = Object.values(S.workouts).sort((a, b) => (a.order || 0) - (b.order || 0));
  const recent = S.sessions.slice().sort((a, b) => b.start - a.start).slice(0, 5);

  v.innerHTML = `
    <div class="head"><h1>Training</h1><div class="actions">
      ${streakBadgeHTML()}
      <button class="icon-btn" id="exLibBtn" aria-label="Übungen verwalten">${I.list}</button>
      <button class="icon-btn" id="trSetBtn" aria-label="Einstellungen">${I.gear}</button>
    </div></div>
    ${S.active ? `<button class="wcard" id="resumeBtn" style="background:var(--green-soft);box-shadow:inset 0 0 0 1.5px var(--green)">
        <div class="t"><b>${esc(S.active.name)} läuft</b><span>Seit ${fmtDuration(Date.now() - S.active.start)} · tippen zum Fortsetzen</span></div>
        <span class="play">${I.play}</span></button>` : ''}
    ${todayCardHTML()}
    <section class="card mapcard">
      <div class="card-title">
        <div><h2>Muskeln diese Woche</h2></div>
        <button class="btn small" id="volToggle">${showVolDetail ? 'Weniger' : 'Details'}</button>
      </div>
      <div><div class="pct">${pct}%<small>${inZone} von ${MUSCLES.length} in der Wachstumszone</small></div></div>
      ${bodyMapHTML(vol)}
      <div class="legend">
        <span><i style="background:var(--muscle)"></i>0</span>
        <span><i style="background:color-mix(in srgb, var(--green) 35%, var(--muscle))"></i>unter ${z.low}</span>
        <span><i style="background:var(--yellow)"></i>${z.low}–${z.opt}</span>
        <span><i style="background:var(--green)"></i>${z.opt}–${z.high} optimal</span>
        <span><i style="background:var(--orange)"></i>über ${z.high}</span>
      </div>
      ${showVolDetail ? `<div>
        <p class="muted" style="margin:0 0 6px;font-size:13px">Sätze pro Woche. Primär = 1 Satz, sekundär = ${fmt(S.settings.secondaryFactor, 2)} Satz. Grün hinterlegt ist die Wachstumszone.</p>
        ${MUSCLES.map(([m, name]) => `<div class="vol-row">
          <span class="n">${name}</span>
          <div class="vol-track"><div class="zone" style="left:${z.opt / max * 100}%;width:${(z.high - z.opt) / max * 100}%"></div><div class="fill" style="width:${Math.min(vol[m] / max, 1) * 100}%;background:${zoneColor(vol[m])}"></div></div>
          <span class="v">${fmt(vol[m], vol[m] % 1 ? 1 : 0)}</span>
        </div>`).join('')}
      </div>` : ''}
    </section>
    <section class="card">
      <div class="card-title"><h2>Wochenplan</h2><button class="btn small" id="planBtn">${I.calendar}Bearbeiten</button></div>
      <div class="week">${days.map((d, i) => {
        const k = dayKey(d);
        const w = S.workouts[S.plan[i]];
        return `<div class="d ${trainedDays.has(k) ? 'done' : ''} ${k === todayK ? 'today' : ''}">${WD[d.getDay()]}<i>${d.getDate()}</i><small class="plan-lbl ${w ? '' : 'rest'}">${w ? esc(w.name) : 'Ruhe'}</small></div>`;
      }).join('')}</div>
      <span class="muted" style="font-size:13px">${S.sessions.filter(s => new Date(s.start) >= ws).length} Trainings diese Woche · grün = trainiert</span>
    </section>
    ${prCardHTML()}
    <section class="card">
      <div class="card-title"><h2>Meine Trainings</h2><button class="btn small primary" id="newWo">${I.plus}Neu</button></div>
      ${workouts.length ? workouts.map(w => `
        <div class="wcard">
          <button class="t" data-edit-wo="${w.id}" style="text-align:left"><b>${esc(w.name)}</b><span>${w.items.length} Übungen · ${w.items.map(it => esc((S.exercises[it.exId] || {}).name || '')).filter(Boolean).slice(0, 3).join(', ')}${w.items.length > 3 ? ' …' : ''}</span></button>
          <button class="play" data-start-wo="${w.id}" aria-label="${esc(w.name)} starten">${I.play}</button>
        </div>`).join('')
      : `<div class="empty">Erstelle dein erstes Training, z. B. „Push“ oder „Beine“.</div>`}
      <button class="btn" id="emptyWo">Leeres Training starten</button>
    </section>
    <section class="card">
      <div class="card-title"><h2>Verlauf</h2></div>
      ${recent.length ? `<div class="list">${recent.map(s => {
        const sets = s.items.reduce((a, it) => a + it.sets.filter(x => x.done).length, 0);
        const d = new Date(s.start);
        return `<button class="list-item" data-sess="${s.id}">
          <div class="t"><b>${esc(s.name)}</b><span>${WD[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]} · ${sets} Sätze · ${fmtDuration((s.end || s.start) - s.start)}</span></div>
          <svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>`;
      }).join('')}</div>` : `<div class="empty">Hier erscheinen deine abgeschlossenen Trainings.</div>`}
    </section>`;

  $('#volToggle').onclick = () => { showVolDetail = !showVolDetail; renderTrain(); };
  $('#exLibBtn').onclick = () => openExerciseLibrary();
  $('#trSetBtn').onclick = () => openSettings('training');
  $('#newWo').onclick = () => openWorkoutEditor(null);
  $('#planBtn').onclick = openPlanEditor;
  if ($('#streakBadge')) $('#streakBadge').onclick = openStreakInfo;
  if ($('#todayStart')) $('#todayStart').onclick = () => startWorkout($('#todayStart').dataset.wo);
  if ($('#todayPlan')) $('#todayPlan').onclick = openPlanEditor;
  $('#emptyWo').onclick = () => startWorkout(null);
  if ($('#resumeBtn')) $('#resumeBtn').onclick = () => showWorkout();
  $$('[data-edit-wo]').forEach(b => b.onclick = () => openWorkoutEditor(b.dataset.editWo));
  $$('[data-start-wo]').forEach(b => b.onclick = () => startWorkout(b.dataset.startWo));
  $$('[data-sess]').forEach(b => b.onclick = () => openSession(b.dataset.sess));
  $$('#view [data-stat]').forEach(b => b.onclick = () => openExerciseStats(b.dataset.stat));
  $('#allStatsBtn').onclick = openAllStats;
  $$('.bodymap .m').forEach(p => p.addEventListener('click', () => openMuscleDetail(p.dataset.m)));
  $$('#view .vol-row').forEach((r, i) => r.addEventListener('click', () => openMuscleDetail(MUSCLES[i][0])));
}

function fmtDuration(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${min % 60} min` : `${min} min`;
}

/* ---------- Übungen ---------- */
function openExerciseLibrary(onPick) {
  const el = openSheet({
    title: onPick ? 'Übung auswählen' : 'Übungen',
    body: `<input class="input" id="exSearch" type="search" placeholder="Übung suchen" autocomplete="off">
      <button class="btn" id="exNew">${I.plus}Neue Übung</button>
      <div class="list" id="exList"></div>`,
  });
  const draw = () => {
    const q = el.querySelector('#exSearch').value.trim().toLowerCase();
    const items = Object.values(S.exercises).filter(e => !q || e.name.toLowerCase().includes(q) || musclesText(e).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    el.querySelector('#exList').innerHTML = items.map(e => `
      <button class="list-item" data-ex="${e.id}">
        <div class="t"><b>${esc(e.name)}</b><span>${esc(musclesText(e))}</span></div>
        ${onPick ? `<span class="add-btn" style="width:34px;height:34px">${I.plus}</span>` : '<svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>'}
      </button>`).join('') || '<div class="empty">Keine Übung gefunden.</div>';
    $$('[data-ex]', el).forEach(b => b.onclick = () => {
      if (onPick) { onPick(b.dataset.ex); closeSheet(el); }
      else openExerciseStats(b.dataset.ex);
    });
  };
  el.querySelector('#exSearch').oninput = draw;
  el.querySelector('#exNew').onclick = () => openExerciseEditor(null, (id) => {
    if (onPick && id) { onPick(id); closeSheet(el); } else draw();
  });
  draw();
}

function openExerciseEditor(id, onDone) {
  const ex = id ? JSON.parse(JSON.stringify(S.exercises[id])) : { id: uid(), name: '', primary: [], secondary: [] };
  const el = openSheet({
    title: id ? 'Übung bearbeiten' : 'Neue Übung',
    body: `
      <div class="field"><label for="exName">Name</label><input class="input" id="exName" value="${esc(ex.name)}" placeholder="z. B. Bankdrücken"></div>
      <div class="field"><label>Art der Übung</label>
        <div class="seg" id="exMode"><button data-md="">Normal</button><button data-md="bw">Körpergewicht</button><button data-md="assist">Unterstützt</button></div>
        <span class="muted" id="exModeTxt" style="font-size:13px"></span></div>
      <div class="eyebrow">Muskelgruppen</div>
      <p class="muted" style="margin:-6px 0 0;font-size:13px">Einmal tippen = primär (zählt 1 Satz), zweimal = sekundär (zählt ${fmt(S.settings.secondaryFactor, 2)} Satz), dreimal = entfernen.</p>
      <div class="chips" id="exChips"></div>
      <button class="btn primary" id="exSave">Speichern</button>
      ${id ? `<button class="btn danger" id="exDel">${I.trash}Übung löschen</button>` : ''}`,
  });
  const draw = () => {
    el.querySelector('#exChips').innerHTML = MUSCLES.map(([m, n]) => {
      const st = ex.primary.includes(m) ? 'p' : ex.secondary.includes(m) ? 's' : '';
      return `<button class="chip ${st}" data-mu="${m}">${n}${st ? ` <small>${st === 'p' ? 'P' : 'S'}</small>` : ''}</button>`;
    }).join('');
    $$('[data-mu]', el).forEach(b => b.onclick = () => {
      const m = b.dataset.mu;
      if (ex.primary.includes(m)) { ex.primary = ex.primary.filter(x => x !== m); ex.secondary.push(m); }
      else if (ex.secondary.includes(m)) { ex.secondary = ex.secondary.filter(x => x !== m); }
      else ex.primary.push(m);
      draw();
    });
  };
  draw();
  const MODE_TXT = { '': 'Das eingetragene Gewicht zählt.', bw: 'Leer = nur Körpergewicht (BW). Eingetragene kg sind Zusatzgewicht, gerechnet wird BW + Zusatzgewicht.', assist: 'Eingetragene kg sind die Unterstützung der Maschine, gerechnet wird BW – Unterstützung.' };
  const markMode = () => {
    $$('#exMode button', el).forEach(b => b.classList.toggle('on', b.dataset.md === (ex.mode || '')));
    el.querySelector('#exModeTxt').textContent = MODE_TXT[ex.mode || ''];
  };
  $$('#exMode button', el).forEach(b => b.onclick = () => { ex.mode = b.dataset.md || null; markMode(); });
  markMode();
  el.querySelector('#exSave').onclick = () => {
    ex.name = el.querySelector('#exName').value.trim();
    if (!ex.name) { toast('Bitte einen Namen eingeben'); return; }
    if (!ex.primary.length) { toast('Bitte mindestens einen primären Muskel wählen'); return; }
    S.exercises[ex.id] = ex;
    save(); closeSheet(el); if (onDone) onDone(ex.id);
    if (currentTab === 'train') renderTrain();
  };
  if (id) el.querySelector('#exDel').onclick = async () => {
    if (await confirmSheet({ title: 'Übung löschen?', text: 'Sie wird aus allen Trainingsvorlagen entfernt. Dein Verlauf bleibt erhalten.' })) {
      const old = S.exercises[id];
      Object.values(S.workouts).forEach(w => { w.items = w.items.filter(it => it.exId !== id); });
      // Im Verlauf Muskelgruppen behalten, damit das Wochenvolumen stimmt
      S.sessions.forEach(s => s.items.forEach(it => { if (it.exId === id) { it.primary = old.primary; it.secondary = old.secondary; } }));
      delete S.exercises[id];
      save(); closeSheet(el); if (onDone) onDone(null);
      if (currentTab === 'train') renderTrain();
    }
  };
}

/* ---------- Trainingsvorlagen ---------- */
function openWorkoutEditor(id) {
  const w = id ? JSON.parse(JSON.stringify(S.workouts[id])) : { id: uid(), name: '', items: [], order: Object.keys(S.workouts).length };
  const el = openSheet({
    title: id ? 'Training bearbeiten' : 'Neues Training',
    body: `
      <div class="field"><label for="woName">Name</label><input class="input" id="woName" value="${esc(w.name)}" placeholder="z. B. Push, Pull, Beine"></div>
      <div class="eyebrow">Übungen</div>
      <div class="list" id="woList"></div>
      <button class="btn" id="woAdd">${I.plus}Übung hinzufügen</button>
      <button class="btn primary" id="woSave">Speichern</button>
      ${id ? `<button class="btn danger" id="woDel">${I.trash}Training löschen</button>` : ''}`,
  });
  const draw = () => {
    const list = el.querySelector('#woList');
    list.innerHTML = w.items.length ? w.items.map((it, i) => {
      const ex = S.exercises[it.exId];
      return `<div class="list-item">
        <div class="t"><b>${esc(ex ? ex.name : 'Gelöschte Übung')}</b><span>${ex ? esc(musclesText(ex)) : ''}</span></div>
        <div class="row" style="flex:none;gap:4px;align-items:center">
          <button class="icon-btn" style="width:32px;height:32px" data-sm="${i}" aria-label="Weniger Sätze">–</button>
          <span class="num" style="min-width:52px;text-align:center;font-size:14px">${it.sets} Sätze</span>
          <button class="icon-btn" style="width:32px;height:32px" data-sp="${i}" aria-label="Mehr Sätze">+</button>
          <button class="icon-btn" style="width:32px;height:32px" data-up="${i}" aria-label="Nach oben">${I.up}</button>
          <button class="icon-btn" style="width:32px;height:32px;color:var(--red)" data-rm="${i}" aria-label="Entfernen">${I.close}</button>
        </div></div>`;
    }).join('') : '<div class="empty">Noch keine Übungen.</div>';
    $$('[data-sm]', list).forEach(b => b.onclick = () => { const it = w.items[+b.dataset.sm]; it.sets = Math.max(1, it.sets - 1); draw(); });
    $$('[data-sp]', list).forEach(b => b.onclick = () => { const it = w.items[+b.dataset.sp]; it.sets = Math.min(10, it.sets + 1); draw(); });
    $$('[data-up]', list).forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i > 0) { [w.items[i - 1], w.items[i]] = [w.items[i], w.items[i - 1]]; draw(); } });
    $$('[data-rm]', list).forEach(b => b.onclick = () => { w.items.splice(+b.dataset.rm, 1); draw(); });
  };
  draw();
  el.querySelector('#woAdd').onclick = () => openExerciseLibrary((exId) => { w.items.push({ exId, sets: 3 }); draw(); });
  el.querySelector('#woSave').onclick = () => {
    w.name = el.querySelector('#woName').value.trim();
    if (!w.name) { toast('Bitte einen Namen eingeben'); return; }
    S.workouts[w.id] = w;
    save(); closeSheet(el); renderTrain();
  };
  if (id) el.querySelector('#woDel').onclick = async () => {
    if (await confirmSheet({ title: 'Training löschen?', text: `„${w.name}“ wird gelöscht. Dein Verlauf bleibt erhalten.` })) {
      delete S.workouts[id];
      Object.keys(S.plan).forEach(k => { if (S.plan[k] === id) delete S.plan[k]; });
      save(); closeSheet(el); renderTrain();
    }
  };
}

/* ---------- Verlauf ---------- */
function lastPerformance(exId, excludeId) {
  const s = S.sessions.filter(x => x.id !== excludeId).sort((a, b) => b.start - a.start)
    .find(x => x.items.some(it => it.exId === exId && it.sets.some(st => st.done)));
  if (!s) return null;
  const it = s.items.find(x => x.exId === exId);
  const mode = exMode(exId, it);
  return it.sets.filter(st => st.done).map(st => ({ ...st, mode }));
}
/* Vorwert passend zum Satz: Aufwärmsätze mit Aufwärmsätzen vergleichen, Arbeitssätze mit Arbeitssätzen */
function prevFor(last, sets, j) {
  if (!last) return null;
  const isW = sets[j].type === 'w';
  const idx = sets.slice(0, j).filter(x => (x.type === 'w') === isW).length;
  return last.filter(x => (x.type === 'w') === isW)[idx] || null;
}
const SET_TYPES = [[undefined, ''], ['w', 'A'], ['d', 'D'], ['f', 'V']];
const SET_TYPE_NAME = { w: 'Aufwärmsatz', d: 'Dropsatz', f: 'Bis zum Versagen' };
function nextSetType(t) { const i = SET_TYPES.findIndex(x => x[0] === t); return SET_TYPES[(i + 1) % SET_TYPES.length][0]; }
function exRest(exId) { const ex = S.exercises[exId]; return (ex && ex.rest) || S.settings.restSec; }

/* Satz als Text. Bei Körpergewichtsübungen: BW, BW+10 kg, BW−20 kg */
function setText(st) {
  const raw = st.add != null ? st.add : num(st.kg) || 0;
  const tag = st.type ? ` (${SET_TYPES.find(x => x[0] === st.type)[1]})` : '';
  if (st.mode === 'bw') return `${raw ? 'BW+' + kgShort(raw) : 'BW'} × ${st.reps}${tag}`;
  if (st.mode === 'assist') return `${raw ? 'BW−' + kgShort(raw) : 'BW'} × ${st.reps}${tag}`;
  return `${fmt(num(st.kg), num(st.kg) % 1 ? 1 : 0)} kg × ${st.reps}${tag}`;
}

function openSession(id) {
  const s = S.sessions.find(x => x.id === id);
  if (!s) return;
  const d = new Date(s.start);
  const el = openSheet({
    title: s.name,
    headRight: `<button class="icon-btn" id="sesEdit" aria-label="Training bearbeiten">${I.edit}</button>`,
    body: `<p class="muted" style="margin:0">${WD[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]} ${d.getFullYear()} · ${fmtDuration((s.end || s.start) - s.start)}</p>
      ${s.items.map(it => {
        const done = it.sets.filter(x => x.done);
        if (!done.length) return '';
        return `<div class="card" style="padding:14px;gap:6px"><b>${esc((S.exercises[it.exId] || it).name)}</b>
          <span class="muted num" style="font-size:14px">${done.map(x => setText({ ...x, mode: exMode(it.exId, it) })).join(' · ')}</span></div>`;
      }).join('')}
      <button class="btn" id="sesEdit2">${I.edit}Training bearbeiten</button>
      <button class="btn danger" id="sesDel">${I.trash}Training aus Verlauf löschen</button>`,
  });
  const edit = () => { closeSheet(el); openSessionEditor(id); };
  el.querySelector('#sesEdit').onclick = edit;
  el.querySelector('#sesEdit2').onclick = edit;
  el.querySelector('#sesDel').onclick = async () => {
    if (await confirmSheet({ title: 'Training löschen?', text: 'Es wird aus dem Verlauf und dem Wochenvolumen entfernt.' })) {
      S.sessions = S.sessions.filter(x => x.id !== id); save(); closeSheet(el); renderTrain();
    }
  };
}

/* Abgeschlossenes Training bearbeiten: Sätze ändern, löschen, ergänzen, Übungen entfernen */
function openSessionEditor(id) {
  const orig = S.sessions.find(x => x.id === id);
  if (!orig) return;
  const s = JSON.parse(JSON.stringify(orig));
  const el = openSheet({
    title: 'Training bearbeiten',
    body: `<div class="field"><label for="seName">Name</label><input class="input" id="seName" value="${esc(s.name)}"></div>
      <div id="seBody" style="display:flex;flex-direction:column;gap:12px"></div>
      <button class="btn" id="seAddEx">${I.plus}Übung hinzufügen</button>
      <button class="btn primary" id="seSave">Speichern</button>`,
  });
  const body = el.querySelector('#seBody');
  const draw = () => {
    body.innerHTML = s.items.map((it, i) => {
      const mode = exMode(it.exId, it);
      return `<div class="ex">
        <div class="ex-head"><div class="t"><b>${esc((S.exercises[it.exId] || it).name)}</b></div>
          <button class="icon-btn" style="width:34px;height:34px" data-serm="${i}" aria-label="Übung entfernen">${I.trash}</button></div>
        <div class="sets se">
          <span class="hd">Satz</span><span class="hd">${mode === 'bw' ? '+kg' : mode === 'assist' ? '−kg' : 'kg'}</span><span class="hd">Wdh</span><span class="hd"></span>
          ${it.sets.map((st, j) => `<button class="no st-${st.type || 'n'}" data-setype="${i}:${j}">${st.type ? SET_TYPES.find(x => x[0] === st.type)[1] : j + 1}</button>
            <input class="input" inputmode="decimal" data-sekg="${i}:${j}" value="${esc(String(st.kg).replace('.', ','))}" aria-label="Gewicht">
            <input class="input" inputmode="numeric" data-serp="${i}:${j}" value="${esc(st.reps)}" aria-label="Wiederholungen">
            <button class="ck" data-sedel="${i}:${j}" aria-label="Satz löschen">${I.close}</button>`).join('')}
        </div>
        <button class="btn small" data-seadd="${i}" style="align-self:flex-start">${I.plus}Satz</button>
      </div>`;
    }).join('') || '<div class="empty">Keine Übungen mehr.</div>';
    $$('[data-sekg]', body).forEach(x => x.oninput = () => { const [i, j] = x.dataset.sekg.split(':'); s.items[i].sets[j].kg = x.value.replace(',', '.'); });
    $$('[data-serp]', body).forEach(x => x.oninput = () => { const [i, j] = x.dataset.serp.split(':'); s.items[i].sets[j].reps = x.value.replace(/\D/g, ''); });
    $$('[data-setype]', body).forEach(x => x.onclick = () => { const [i, j] = x.dataset.setype.split(':'); const st = s.items[i].sets[j]; st.type = nextSetType(st.type); if (!st.type) delete st.type; draw(); });
    $$('[data-sedel]', body).forEach(x => x.onclick = () => { const [i, j] = x.dataset.sedel.split(':').map(Number); s.items[i].sets.splice(j, 1); if (!s.items[i].sets.length) s.items.splice(i, 1); draw(); });
    $$('[data-seadd]', body).forEach(x => x.onclick = () => { const it = s.items[+x.dataset.seadd]; const l = it.sets[it.sets.length - 1]; it.sets.push({ kg: l ? l.kg : '0', reps: l ? l.reps : '10', done: true }); draw(); });
    $$('[data-serm]', body).forEach(x => x.onclick = () => { s.items.splice(+x.dataset.serm, 1); draw(); });
  };
  draw();
  el.querySelector('#seAddEx').onclick = () => openExerciseLibrary((exId) => {
    const ex = S.exercises[exId];
    s.items.push({ exId, name: ex.name, primary: ex.primary, secondary: ex.secondary, mode: ex.mode || null, bw: ex.mode ? bwAt(s.start) : null, sets: [{ kg: '', reps: '', done: true }] });
    draw();
  });
  el.querySelector('#seSave').onclick = () => {
    for (const it of s.items) for (const st of it.sets) {
      if (!(num(st.reps) > 0)) { toast('Bitte bei jedem Satz Wiederholungen eintragen'); return; }
      if (st.kg === '' || isNaN(num(st.kg))) st.kg = '0';
      st.done = true;
    }
    if (!s.items.length) { toast('Ein Training braucht mindestens eine Übung. Zum Entfernen „Löschen“ nutzen.'); return; }
    s.name = el.querySelector('#seName').value.trim() || s.name;
    const idx = S.sessions.findIndex(x => x.id === id);
    S.sessions[idx] = s;
    save(); closeSheet(el); renderTrain(); toast('Training gespeichert');
  };
}

/* ---------- Muskel-Details: woher kommt das Wochenvolumen ---------- */
function openMuscleDetail(m) {
  const start = weekStart();
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const f = S.settings.secondaryFactor;
  const rows = [];
  S.sessions.filter(s => { const t = new Date(s.start); return t >= start && t < end; }).sort((a, b) => a.start - b.start).forEach(s => {
    s.items.forEach(it => {
      const ex = S.exercises[it.exId] || it;
      const n = it.sets.filter(st => st.done && st.type !== 'w').length;
      if (!n) return;
      const prim = (ex.primary || []).includes(m), sec = (ex.secondary || []).includes(m);
      if (!prim && !sec) return;
      rows.push({ d: new Date(s.start), name: ex.name, n, role: prim ? 'primär' : 'sekundär', val: prim ? n : n * f });
    });
  });
  const total = rows.reduce((a, r) => a + r.val, 0);
  const z = S.settings.zones;
  const zoneTxt = !total ? 'Diese Woche noch nicht trainiert.' : total < z.low ? `Unter dem Minimum von ${z.low} Sätzen.` : total < z.opt ? `Noch ${fmt(z.opt - total, total % 1 ? 1 : 0)} Sätze bis zur Wachstumszone.` : total <= z.high ? 'In der Wachstumszone.' : `Über ${z.high} Sätzen, der Zusatznutzen wird hier klein.`;
  const ideas = total < z.opt ? Object.values(S.exercises).filter(e => (e.primary || []).includes(m)).sort((a, b) => (a.primary.length - b.primary.length) || a.name.localeCompare(b.name, 'de')).slice(0, 5) : [];
  openSheet({
    title: MUSCLE_NAME[m],
    body: `<div class="big-weight"><b class="num" style="color:${zoneColor(total)}">${fmt(total, total % 1 ? 1 : 0)}</b><span>Sätze diese Woche</span></div>
      <p class="muted" style="margin:0">${zoneTxt}</p>
      ${rows.length ? `<div class="list">${rows.map(r => `<div class="list-item"><div class="t"><b>${esc(r.name)}</b><span>${WD[r.d.getDay()]}, ${r.d.getDate()}. ${MON[r.d.getMonth()]} · ${r.n} ${r.n === 1 ? 'Satz' : 'Sätze'} ${r.role}</span></div><span class="num" style="font-weight:600">+${fmt(r.val, r.val % 1 ? 1 : 0)}</span></div>`).join('')}</div>` : ''}
      ${ideas.length ? `<div class="eyebrow">Übungen dafür</div><div class="chips">${ideas.map(e => `<span class="chip">${esc(e.name)}</span>`).join('')}</div>` : ''}`,
  });
}

/* ---------- Aktives Training ---------- */
let woTick = null;
let workoutLocked = false;

function startWorkout(woId) {
  if (S.active) {
    confirmSheet({ title: 'Training läuft noch', text: `„${S.active.name}“ ist noch offen. Möchtest du es fortsetzen?`, okLabel: 'Fortsetzen', danger: false })
      .then(ok => { if (ok) showWorkout(); });
    return;
  }
  const w = woId ? S.workouts[woId] : null;
  S.active = {
    id: uid(), workoutId: woId, name: w ? w.name : 'Training', start: Date.now(),
    items: w ? w.items.filter(it => S.exercises[it.exId]).map(it => newItem(it.exId, it.sets)) : [],
  };
  save();
  showWorkout();
}

function newItem(exId, n = 3) {
  const ex = S.exercises[exId];
  return { exId, name: ex.name, sets: Array.from({ length: n }, () => ({ kg: '', reps: '', done: false })) };
}

function showWorkout() {
  const box = document.getElementById('workout');
  box.hidden = false;
  if (!workoutLocked) { lockScroll(); workoutLocked = true; }
  drawWorkout();
  keepAwake(true);
  clearInterval(woTick);
  woTick = setInterval(() => {
    const t = $('#woElapsed');
    if (t && S.active) t.textContent = clockStr(Date.now() - S.active.start);
  }, 1000);
}
/* Bildschirm während des Trainings anlassen (wenn das iPhone es erlaubt) */
let wakeLock = null, wantAwake = false;
async function keepAwake(on) {
  wantAwake = on;
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && wantAwake) keepAwake(true); });
function hideWorkout() {
  document.getElementById('workout').hidden = true;
  keepAwake(false);
  if (workoutLocked) { unlockScroll(); workoutLocked = false; }
  clearInterval(woTick);
  if (currentTab === 'train') renderTrain();
}
function clockStr(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0');
}

const openNotes = new Set();
function liveStats(a) {
  const bw = currentBW();
  let vol = 0, sets = 0;
  a.items.forEach(it => {
    const mode = exMode(it.exId);
    it.sets.forEach(st => {
      if (!st.done || st.type === 'w') return;
      sets++;
      vol += effKg(mode, st.kg, bw) * (num(st.reps) || 0);
    });
  });
  return { vol, sets, total: a.items.reduce((n, it) => n + it.sets.length, 0) };
}

function drawWorkout() {
  const a = S.active;
  const box = document.getElementById('workout');
  if (!a) { hideWorkout(); return; }
  const scrollY = box.querySelector('.wb') ? box.querySelector('.wb').scrollTop : 0;
  const ls = liveStats(a);
  box.innerHTML = `
    <div class="wh">
      <button class="icon-btn" id="woMin" aria-label="Minimieren">${I.down}</button>
      <div class="t"><b>${esc(a.name)}</b>
        <span class="live num"><em id="woElapsed">${clockStr(Date.now() - a.start)}</em> · ${fmt(ls.vol)} kg · ${ls.sets}/${ls.total} Sätze</span></div>
      <button class="btn small primary" id="woFinish">Beenden</button>
    </div>
    <div class="wb">
      ${a.items.map((it, i) => {
        const ex = S.exercises[it.exId] || it;
        const last = lastPerformance(it.exId, a.id);
        const best = exerciseBests(it.exId, a.id);
        const bw = best && best.hist.every(r => r.maxKg === 0);
        const prog = progressionFor(it.exId, a.id);
        const mode = exMode(it.exId);
        const curBW = currentBW();
        const kgHint = (pv, st) => {
          const v = st.type !== 'w' && prog && prog.kg != null ? prog.kg : pv ? num(pv.kg) : null;
          if (v == null) return mode ? 'BW' : 'kg';
          return mode && !v ? 'BW' : String(v);
        };
        const eff = st => effKg(mode, st.kg, curBW);
        const isPR = st => st.done && st.type !== 'w' && best && (bw ? num(st.reps) > best.maxReps.maxReps : (e1rm(eff(st), st.reps) > best.e1rm.e1rm + 1e-9 || eff(st) > best.maxKg.maxKg));
        const note = (S.exercises[it.exId] || {}).note || '';
        const noteOpen = openNotes.has(it.exId);
        const restS = exRest(it.exId);
        const custom = !!(S.exercises[it.exId] || {}).rest;
        return `<div class="ex">
          <div class="ex-head">
            <button class="t" data-statex="${it.exId}" style="text-align:left"><b>${esc(ex.name)}</b><span>${esc(musclesText(ex))}${mode ? ` · ${mode === 'assist' ? 'Unterstützt' : 'Körpergewicht'}${curBW ? ' (' + kgShort(curBW) + ')' : ', bitte Gewicht eintragen'}` : ''} · Statistik ›</span></button>
            <button class="icon-btn" style="width:34px;height:34px" data-rmex="${i}" aria-label="Übung entfernen">${I.trash}</button>
          </div>
          <div class="ex-tools">
            <button class="tool ${note ? 'has' : ''} ${noteOpen ? 'on' : ''}" data-note="${i}" aria-expanded="${noteOpen}">${I.edit}Notiz${note && !noteOpen ? '<i class="dotm"></i>' : ''}</button>
            <button class="tool ${custom ? 'has' : ''}" data-rest="${i}">${I.clock}${clockStr(restS * 1000)}</button>
            <button class="tool" data-swap="${i}">${I.swap}Tauschen</button>
          </div>
          ${noteOpen ? `<textarea class="input note-in" id="note_${i}" data-notein="${i}" rows="2" placeholder="z. B. Sitz Stufe 4, Polster auf 6">${esc(note)}</textarea>` : ''}
          <div class="ex-last">${last ? 'Letztes Mal: ' + last.map(setText).join(' · ') : 'Noch keine Vorwerte'}</div>
          ${progressionHTML(prog)}
          <div class="sets">
            <span class="hd">Satz</span><span class="hd">Vorher</span><span class="hd">${mode === 'bw' ? '+kg' : mode === 'assist' ? '−kg' : 'kg'}</span><span class="hd">Wdh</span><span class="hd">✓</span>
            ${it.sets.map((st, j) => {
              const pv = prevFor(last, it.sets, j);
              const workNo = it.sets.slice(0, j + 1).filter(x => x.type !== 'w').length;
              const lbl = st.type ? SET_TYPES.find(x => x[0] === st.type)[1] : workNo;
              return `<button class="no st-${st.type || 'n'}" data-stype="${i}:${j}" aria-label="Satztyp ändern: ${st.type ? SET_TYPE_NAME[st.type] : 'normal'}">${isPR(st) ? `<span class="trophy" title="Neuer Rekord">${I.trophy}</span>` : lbl}</button>
                <span class="prev">${pv ? setText({ ...pv, type: undefined }) : '–'}</span>
                <input class="input ${st.done ? 'dn' : ''}" inputmode="decimal" id="kg_${i}_${j}" data-kg="${i}:${j}" value="${esc(String(st.kg).replace('.', ','))}" placeholder="${esc(kgHint(pv, st).replace('.', ','))}" aria-label="Gewicht Satz ${j + 1}">
                <input class="input ${st.done ? 'dn' : ''}" inputmode="numeric" id="rp_${i}_${j}" data-rp="${i}:${j}" value="${esc(st.reps)}" placeholder="${pv ? esc(String(pv.reps)) : 'Wdh'}" aria-label="Wiederholungen Satz ${j + 1}">
                <button class="ck ${st.done ? 'on' : ''}" data-ck="${i}:${j}" aria-label="Satz ${j + 1} abhaken">${I.check}</button>`;
            }).join('')}
          </div>
          ${!S.settings.setTypeHint ? '<p class="hint">Tipp: Satznummer antippen für Aufwärm- (A), Drop- (D) oder Versagenssatz (V). Aufwärmsätze zählen nicht ins Volumen.</p>' : ''}
          <div class="ex-actions">
            <button class="btn small" data-addset="${i}">${I.plus}Satz</button>
            <button class="btn small" data-rmset="${i}" ${it.sets.length <= 1 ? 'disabled' : ''}>– Satz</button>
          </div>
        </div>`;
      }).join('')}
      <button class="btn" id="woAddEx">${I.plus}Übung hinzufügen</button>
      ${a.items.length > 1 ? `<button class="btn" id="woSort">${I.list}Reihenfolge ändern</button>` : ''}
      <button class="btn danger" id="woDiscard">Training verwerfen</button>
    </div>
    ${restTimerHTML()}`;
  box.querySelector('.wb').scrollTop = scrollY;
  $$('.input.dn', box).forEach(inp => { inp.style.background = 'var(--green-soft)'; inp.style.borderColor = 'transparent'; });

  $('#woMin').onclick = hideWorkout;
  $('#woFinish').onclick = finishWorkout;
  $('#woDiscard').onclick = async () => {
    if (await confirmSheet({ title: 'Training verwerfen?', text: 'Alle Eingaben dieses Trainings gehen verloren.', okLabel: 'Verwerfen' })) {
      S.active = null; stopRest(); save(); hideWorkout();
    }
  };
  $$('[data-statex]', box).forEach(b => b.onclick = () => openExerciseStats(b.dataset.statex));
  $('#woAddEx').onclick = () => openExerciseLibrary((exId) => { a.items.push(newItem(exId, 3)); save(); drawWorkout(); });
  if ($('#woSort')) $('#woSort').onclick = () => openReorder(a.items, () => { save(); drawWorkout(); });
  $$('[data-note]', box).forEach(b => b.onclick = () => {
    const id = a.items[+b.dataset.note].exId;
    if (openNotes.has(id)) openNotes.delete(id); else openNotes.add(id);
    drawWorkout();
    const ta = $('#note_' + b.dataset.note); if (ta) ta.focus();
  });
  $$('[data-notein]', box).forEach(ta => ta.oninput = () => {
    const ex = S.exercises[a.items[+ta.dataset.notein].exId];
    if (ex) { ex.note = ta.value; save(); }
  });
  $$('[data-rest]', box).forEach(b => b.onclick = () => openRestPicker(a.items[+b.dataset.rest].exId));
  $$('[data-swap]', box).forEach(b => b.onclick = () => openSwap(+b.dataset.swap));
  $$('[data-stype]', box).forEach(b => b.onclick = () => {
    const [i, j] = b.dataset.stype.split(':').map(Number);
    const st = a.items[i].sets[j];
    st.type = nextSetType(st.type);
    if (!st.type) delete st.type;
    if (!S.settings.setTypeHint) S.settings.setTypeHint = true;
    save(); drawWorkout();
    toast(st.type ? SET_TYPE_NAME[st.type] : 'Normaler Satz');
  });
  $$('[data-kg]', box).forEach(inp => inp.oninput = () => { const [i, j] = inp.dataset.kg.split(':'); a.items[i].sets[j].kg = inp.value.replace(',', '.'); save(); });
  $$('[data-rp]', box).forEach(inp => inp.oninput = () => { const [i, j] = inp.dataset.rp.split(':'); a.items[i].sets[j].reps = inp.value.replace(/\D/g, ''); save(); });
  $$('[data-ck]', box).forEach(b => b.onclick = () => {
    const [i, j] = b.dataset.ck.split(':').map(Number);
    const st = a.items[i].sets[j];
    if (!st.done) {
      const kgIn = $('#kg_' + i + '_' + j), rpIn = $('#rp_' + i + '_' + j);
      if (st.kg === '' && kgIn.placeholder === 'BW') st.kg = '0';
      else if (st.kg === '' && kgIn.placeholder && kgIn.placeholder !== 'kg') st.kg = kgIn.placeholder.replace(',', '.');
      if (st.reps === '' && rpIn.placeholder && rpIn.placeholder !== 'Wdh') st.reps = rpIn.placeholder;
      if (st.reps === '' || !(num(st.reps) > 0)) { toast('Bitte Wiederholungen eintragen'); rpIn.focus(); return; }
      if (st.kg === '') st.kg = '0';
      st.done = true;
      haptic();
      startRest(st.type === 'w' ? Math.min(60, exRest(a.items[i].exId)) : exRest(a.items[i].exId));
      const best = st.type === 'w' ? null : exerciseBests(a.items[i].exId, a.id);
      if (best) {
        const mode = exMode(a.items[i].exId);
        const cbw = currentBW();
        const ef = x => effKg(mode, x.kg, cbw);
        const bw = best.hist.every(r => r.maxKg === 0);
        const prevInSession = a.items[i].sets.filter((x, k) => k !== j && x.done && x.type !== 'w');
        const sessBest = Math.max(0, ...prevInSession.map(x => bw ? num(x.reps) : e1rm(ef(x), x.reps)));
        const val = bw ? num(st.reps) : e1rm(ef(st), st.reps);
        const rec = bw ? best.maxReps.maxReps : best.e1rm.e1rm;
        if (val > rec + 1e-9 && val > sessBest) {
          toast(bw ? `Neuer Rekord: ${st.reps} Wiederholungen` : `Neuer Rekord: ${setText({ ...st, mode })} (1RM ≈ ${fmt(val, 1)} kg)`);
        } else if (!bw && ef(st) > best.maxKg.maxKg && !prevInSession.some(x => ef(x) >= ef(st))) {
          toast(mode ? `Neuer Rekord: ${setText({ ...st, mode }).split(' × ')[0]} (${kgShort(ef(st))} gesamt)` : `Neuer Rekord: ${kgShort(ef(st))} schwerstes Gewicht`);
        }
      }
    } else st.done = false;
    save(); drawWorkout();
  });
  $$('[data-addset]', box).forEach(b => b.onclick = () => {
    const it = a.items[+b.dataset.addset];
    const lastSet = it.sets[it.sets.length - 1];
    it.sets.push({ kg: lastSet ? lastSet.kg : '', reps: '', done: false });
    save(); drawWorkout();
  });
  $$('[data-rmset]', box).forEach(b => b.onclick = () => { const it = a.items[+b.dataset.rmset]; if (it.sets.length > 1) it.sets.pop(); save(); drawWorkout(); });
  $$('[data-rmex]', box).forEach(b => b.onclick = async () => {
    const it = a.items[+b.dataset.rmex];
    if (await confirmSheet({ title: 'Übung entfernen?', text: `„${it.name}“ wird aus diesem Training entfernt.`, okLabel: 'Entfernen' })) {
      a.items.splice(+b.dataset.rmex, 1); save(); drawWorkout();
    }
  });
  bindRestTimer();
}

/* ---------- Pausenzeit pro Übung ---------- */
function openRestPicker(exId) {
  const ex = S.exercises[exId];
  if (!ex) return;
  const opts = [60, 90, 120, 150, 180, 240, 300];
  const el = openSheet({
    title: 'Pause: ' + ex.name,
    body: `<p class="muted" style="margin:0;font-size:14px">Gilt immer für diese Übung. Standard ist ${clockStr(S.settings.restSec * 1000)}.</p>
      <div class="chips">${opts.map(o => `<button class="chip ${ex.rest === o ? 'p' : ''}" data-r="${o}">${clockStr(o * 1000)}</button>`).join('')}</div>
      <button class="btn" data-r="0">${ex.rest ? 'Zurück auf Standard' : 'Standard beibehalten'}</button>`,
  });
  $$('[data-r]', el).forEach(b => b.onclick = () => {
    const v = +b.dataset.r;
    if (v) ex.rest = v; else delete ex.rest;
    save(); closeSheet(el); drawWorkout();
  });
}

/* ---------- Übung tauschen ---------- */
function swapCandidates(exId) {
  const ex = S.exercises[exId] || {};
  const P = new Set(ex.primary || []), Sx = new Set(ex.secondary || []);
  const stem = n => String(n || '').toLowerCase().split(/[\s(]/)[0];
  const base = stem(ex.name);
  return Object.values(S.exercises).filter(e => e.id !== exId).map(e => {
    let sc = 0;
    (e.primary || []).forEach(m => { sc += P.has(m) ? 3 : Sx.has(m) ? -1 : -2; });
    (e.secondary || []).forEach(m => { sc += Sx.has(m) ? 1 : P.has(m) ? 0.5 : -0.5; });
    sc -= [...P].filter(m => !(e.primary || []).includes(m)).length * 2;
    if (base && stem(e.name) === base) sc += 2; // gleiche Übung, anderes Gerät
    return { e, sc };
  }).filter(x => x.sc > 1).sort((a, b) => b.sc - a.sc || a.e.name.localeCompare(b.e.name, 'de')).slice(0, 15);
}
function openSwap(i) {
  const a = S.active;
  const it = a.items[i];
  const cands = swapCandidates(it.exId);
  const el = openSheet({
    title: 'Übung tauschen',
    body: `<p class="muted" style="margin:0;font-size:14px">Statt „${esc(it.name)}“. Oben stehen Übungen mit denselben Hauptmuskeln.</p>
      <div class="list">${cands.map(c => `<button class="list-item" data-to="${c.e.id}"><div class="t"><b>${esc(c.e.name)}</b><span>${esc(musclesText(c.e))}</span></div><svg class="chev" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>`).join('') || '<div class="empty">Keine passende Übung gefunden.</div>'}</div>
      <button class="btn" id="swAll">${I.search}Alle Übungen durchsuchen</button>`,
  });
  const doSwap = (toId) => {
    const done = it.sets.filter(st => st.done);
    const nItem = newItem(toId, Math.max(1, it.sets.length - done.length));
    if (done.length) {
      it.sets = done;               // erledigte Sätze bleiben bei der alten Übung
      a.items.splice(i + 1, 0, nItem);
    } else a.items.splice(i, 1, nItem);
    save(); closeSheet(el); drawWorkout();
    toast(`Getauscht gegen ${S.exercises[toId].name}`);
  };
  $$('[data-to]', el).forEach(b => b.onclick = () => doSwap(b.dataset.to));
  el.querySelector('#swAll').onclick = () => openExerciseLibrary(doSwap);
}

/* ---------- Reihenfolge per Ziehen ---------- */
function openReorder(items, onDone) {
  const order = items.slice();
  const el = openSheet({
    title: 'Reihenfolge',
    body: `<p class="muted" style="margin:0;font-size:14px">Am Griff rechts ziehen.</p><div class="reorder" id="roList"></div>
      <button class="btn primary" id="roSave">Fertig</button>`,
  });
  const list = el.querySelector('#roList');
  const draw = () => {
    list.innerHTML = order.map((it, i) => `<div class="ro-row" data-i="${i}"><span class="ro-no num">${i + 1}</span><b>${esc(it.name || (S.exercises[it.exId] || {}).name || '')}</b><span class="ro-grip" data-grip="${i}" aria-label="Ziehen">${I.grip}</span></div>`).join('');
    $$('[data-grip]', list).forEach(g => g.addEventListener('pointerdown', startDrag));
  };
  let drag = null;
  function startDrag(e) {
    e.preventDefault();
    const row = e.target.closest('.ro-row');
    const rows = $$('.ro-row', list);
    drag = { from: +row.dataset.i, y0: e.clientY, h: row.getBoundingClientRect().height + 8, row, rows, to: +row.dataset.i };
    row.classList.add('drag');
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    e.target.addEventListener('pointermove', moveDrag);
    e.target.addEventListener('pointerup', endDrag, { once: true });
    e.target.addEventListener('pointercancel', endDrag, { once: true });
  }
  function moveDrag(e) {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    drag.row.style.transform = `translateY(${dy}px)`;
    const to = clamp(drag.from + Math.round(dy / drag.h), 0, order.length - 1);
    drag.to = to;
    drag.rows.forEach((r, k) => {
      if (k === drag.from) return;
      let shift = 0;
      if (drag.from < to && k > drag.from && k <= to) shift = -drag.h;
      if (drag.from > to && k < drag.from && k >= to) shift = drag.h;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }
  function endDrag(e) {
    e.target.removeEventListener('pointermove', moveDrag);
    if (!drag) return;
    const [m] = order.splice(drag.from, 1);
    order.splice(drag.to, 0, m);
    drag = null;
    draw();
  }
  draw();
  el.querySelector('#roSave').onclick = () => {
    items.splice(0, items.length, ...order);
    closeSheet(el); onDone();
  };
}

async function finishWorkout() {
  const a = S.active;
  const doneSets = a.items.reduce((n, it) => n + it.sets.filter(s => s.done).length, 0);
  if (!doneSets) {
    if (await confirmSheet({ title: 'Keine Sätze abgehakt', text: 'Ohne abgehakte Sätze wird nichts gespeichert. Training verwerfen?', okLabel: 'Verwerfen' })) {
      S.active = null; stopRest(); save(); hideWorkout();
    }
    return;
  }
  const open = a.items.reduce((n, it) => n + it.sets.filter(s => !s.done).length, 0);
  if (open && !(await confirmSheet({ title: 'Training beenden?', text: `${open} Sätze sind nicht abgehakt und werden nicht gezählt.`, okLabel: 'Beenden', danger: false }))) return;
  const streakBefore = streakInfo();
  const sess = JSON.parse(JSON.stringify(a));
  sess.end = Date.now();
  sess.items = sess.items.map(it => {
    const ex = S.exercises[it.exId];
    const mode = ex ? ex.mode || null : it.mode || null;
    return { exId: it.exId, name: ex ? ex.name : it.name, primary: ex ? ex.primary : it.primary, secondary: ex ? ex.secondary : it.secondary, mode, bw: mode ? currentBW() : null, sets: it.sets.filter(s => s.done) };
  }).filter(it => it.sets.length);
  S.sessions.push(sess);
  S.active = null;
  stopRest();
  save();
  hideWorkout();
  showWorkoutSummary(sess, streakBefore);
}

/* ---------- Pausen-Timer ---------- */
let rest = { end: 0, dur: 0, timer: null, beeped: false };
let audioCtx = null;

function startRest(sec) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) {}
  rest.dur = sec || S.settings.restSec;
  rest.end = Date.now() + rest.dur * 1000;
  rest.beeped = false;
  runRest();
}
function stopRest() {
  rest.end = 0;
  clearInterval(rest.timer);
  const t = $('#restTimer');
  if (t) t.hidden = true;
}
function runRest() {
  clearInterval(rest.timer);
  rest.timer = setInterval(updateRest, 250);
  updateRest();
}
function restTimerHTML() {
  return `<div class="timer" id="restTimer" ${rest.end ? '' : 'hidden'}>
    <div class="tt"><small id="restLbl">Pause</small><span id="restTime">0:00</span></div>
    <button class="sm" id="restMinus">–15</button>
    <button class="sm" id="restPlus">+15</button>
    <button class="sm" id="restSkip">Fertig</button>
    <div class="prog" id="restProg"></div>
  </div>`;
}
function bindRestTimer() {
  const m = $('#restMinus'), p = $('#restPlus'), s = $('#restSkip');
  if (!m) return;
  m.onclick = () => { rest.end -= 15000; updateRest(); };
  p.onclick = () => { rest.end += 15000; rest.dur += 15; rest.beeped = false; updateRest(); };
  s.onclick = stopRest;
  if (rest.end) runRest();
}
function updateRest() {
  const el = $('#restTimer');
  if (!el || !rest.end) return;
  el.hidden = false;
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  const timeEl = $('#restTime'), lbl = $('#restLbl'), prog = $('#restProg');
  if (left > 0) {
    el.classList.remove('done');
    timeEl.textContent = clockStr(left * 1000);
    lbl.textContent = 'Pause';
    prog.style.width = (clamp(1 - left / rest.dur, 0, 1) * 100) + '%';
  } else {
    el.classList.add('done');
    timeEl.textContent = 'Los geht’s';
    lbl.textContent = 'Pause vorbei';
    prog.style.width = '100%';
    if (!rest.beeped) { rest.beeped = true; beep(); haptic(); }
    if (left < -8) stopRest();
  }
}
function beep() {
  if (!audioCtx) return;
  try {
    [0, 0.18, 0.36].forEach(t => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.15);
      o.connect(g).connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.16);
    });
  } catch (e) {}
}


/* ---------- Wochenplan ---------- */
const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
function todayIdx() { return (new Date().getDay() + 6) % 7; }

function todayCardHTML() {
  const hasPlan = Object.values(S.plan).some(id => S.workouts[id]);
  const idx = todayIdx();
  if (!hasPlan) {
    if (!Object.keys(S.workouts).length) return '';
    return `<button class="wcard" id="todayPlan">
      <div class="t"><b>Wochenplan anlegen</b><span>Leg fest, an welchem Tag du welches Training machst</span></div>
      <span class="trophy">${I.calendar}</span></button>`;
  }
  const w = S.workouts[S.plan[idx]];
  const todayK = dayKey();
  const doneToday = S.sessions.some(s => dayKey(new Date(s.start)) === todayK && (!w || s.workoutId === w.id));
  // Nächstes geplantes Training
  let next = null;
  for (let i = 1; i <= 7 && !next; i++) { const nw = S.workouts[S.plan[(idx + i) % 7]]; if (nw) next = [i, nw]; }
  const nextTxt = next ? `Nächstes: ${esc(next[1].name)} ${next[0] === 1 ? 'morgen' : 'am ' + WD_LONG[(idx + next[0]) % 7]}` : '';
  if (!w) {
    return `<section class="card today-card rest">
      <div class="eyebrow">Heute · ${WD_LONG[idx]}</div>
      <div class="today-row"><div class="t"><b>Ruhetag</b><span>${doneToday ? 'Du hast heute trotzdem trainiert. ' : 'Erholung gehört zum Wachstum. '}${nextTxt}</span></div></div>
    </section>`;
  }
  return `<section class="card today-card">
    <div class="eyebrow">Heute · ${WD_LONG[idx]}</div>
    <div class="today-row">
      <div class="t"><b>${esc(w.name)}</b><span>${doneToday ? 'Erledigt, stark! ' + nextTxt : `${w.items.length} Übungen · ${w.items.reduce((a, it) => a + it.sets, 0)} Sätze`}</span></div>
      ${doneToday ? `<span class="play done">${I.check}</span>` : `<button class="play" id="todayStart" data-wo="${w.id}" aria-label="${esc(w.name)} starten">${I.play}</button>`}
    </div>
  </section>`;
}

function openPlanEditor() {
  const workouts = Object.values(S.workouts).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!workouts.length) { toast('Erstelle zuerst ein Training unter „Meine Trainings“'); return; }
  const plan = { ...S.plan };
  const el = openSheet({
    title: 'Wochenplan',
    body: `<p class="muted" style="margin:0;font-size:14px">Wähle für jeden Tag ein Training oder einen Ruhetag. Der Plan gilt jede Woche.</p>
      <div class="list">${WD_LONG.map((name, i) => `
        <div class="list-item plan-row">
          <div class="t"><b>${name}</b></div>
          <select class="input" id="plan_${i}" style="width:58%;flex:none">
            <option value="">Ruhetag</option>
            ${workouts.map(w => `<option value="${w.id}" ${plan[i] === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
          </select>
        </div>`).join('')}</div>
      <button class="btn primary" id="planSave">Plan speichern</button>`,
  });
  el.querySelector('#planSave').onclick = () => {
    const np = {};
    for (let i = 0; i < 7; i++) { const v = el.querySelector('#plan_' + i).value; if (v) np[i] = v; }
    S.plan = np;
    if (!S.settings.planSince) S.settings.planSince = dayKey();
    save(); closeSheet(el); renderTrain(); toast('Wochenplan gespeichert');
  };
}

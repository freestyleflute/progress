/* Flammen-Streak nach Wochenplan + Trainings-Briefing nach dem Beenden. */
'use strict';

function hasPlan() { return Object.values(S.plan || {}).some(id => S.workouts[id]); }
function planIdxOf(key) { return (parseDay(key).getDay() + 6) % 7; }

/* Ein Tag zählt, wenn er laut Plan Ruhetag ist oder an einem Trainingstag trainiert wurde.
   Gestartet wird am ersten Trainingstag ab Anlegen des Plans. */
function streakInfo() {
  if (!hasPlan()) return { active: false, current: 0, best: 0, today: 'none' };
  const trained = new Set(S.sessions.map(s => dayKey(new Date(s.start))));
  const since = S.settings.planSince || dayKey();
  const firstTrain = [...trained].filter(d => d >= since).sort()[0];
  const today = dayKey();
  const plannedOn = (d) => !!S.workouts[S.plan[planIdxOf(d)]];
  const okOn = (d) => (plannedOn(d) ? trained.has(d) : true);
  const todayState = plannedOn(today) ? (trained.has(today) ? 'done' : 'pending') : 'rest';
  if (!firstTrain) return { active: true, current: 0, best: S.settings.bestStreak || 0, today: todayState, started: false };

  // Längste Serie vorwärts berechnen
  let run = 0, best = 0;
  for (let d = firstTrain; d <= today; d = addDays(d, 1)) {
    if (d === today && todayState === 'pending') break;
    if (okOn(d)) { run++; best = Math.max(best, run); } else run = 0;
  }
  // Aktuelle Serie rückwärts
  let cur = 0;
  let d = today;
  if (todayState === 'pending') d = addDays(today, -1);
  for (; d >= firstTrain; d = addDays(d, -1)) {
    if (!okOn(d)) break;
    cur++;
  }
  best = Math.max(best, cur, S.settings.bestStreak || 0);
  if (best !== S.settings.bestStreak) { S.settings.bestStreak = best; save(); }
  return { active: true, current: cur, best, today: todayState, started: true };
}

function flameSVG(cls = '') {
  return `<svg class="flame ${cls}" viewBox="0 0 64 80" aria-hidden="true">
    <path class="f-out" d="M32 2c4 14 22 22 22 44a22 22 0 0 1-44 0c0-10 5-17 10-22 0 8 4 12 8 13-3-12 0-25 4-35z"/>
    <path class="f-in" d="M32 36c3 7 12 11 12 22a12 12 0 0 1-24 0c0-6 3-10 6-12 0 4 2 6 4 7-1-6 0-12 2-17z"/>
  </svg>`;
}

function streakBadgeHTML() {
  const s = streakInfo();
  if (!s.active) return '';
  const dim = s.current === 0 || s.today === 'pending';
  return `<button class="streak-badge ${dim ? 'dim' : ''}" id="streakBadge" aria-label="Streak ${s.current} Tage">${flameSVG()}<b class="num">${s.current}</b></button>`;
}

function openStreakInfo() {
  const s = streakInfo();
  const msg = !s.started
    ? 'Deine Streak startet mit deinem ersten geplanten Training.'
    : s.today === 'pending'
      ? 'Heute steht ein Training an. Schließ es ab, damit die Flamme heute dazukommt.'
      : s.today === 'rest' ? 'Heute ist Ruhetag, die Flamme hast du schon.' : 'Heute erledigt. Stark!';
  openSheet({
    title: 'Deine Streak',
    body: `<div class="streak-hero">${flameSVG('big')}<b class="num">${s.current}</b><span>${s.current === 1 ? 'Tag' : 'Tage'} in Folge</span></div>
      <p class="muted" style="margin:0;text-align:center">${msg}</p>
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div class="stat"><b>${s.current}</b><span>aktuell</span></div>
        <div class="stat"><b>${s.best}</b><span>beste Serie</span></div>
      </div>
      <div class="list">
        <div class="list-item"><div class="t"><b>Ruhetage</b><span>Jeder Ruhetag aus deinem Wochenplan gibt automatisch eine Flamme.</span></div></div>
        <div class="list-item"><div class="t"><b>Trainingstage</b><span>Ein geplanter Trainingstag gibt eine Flamme, sobald du an dem Tag trainiert hast.</span></div></div>
        <div class="list-item"><div class="t"><b>Ausgelassen</b><span>Lässt du ein geplantes Training aus, beginnt die Streak von vorn.</span></div></div>
      </div>`,
  });
}

/* ---------- Briefing nach dem Training ---------- */
function showWorkoutSummary(sess, streakBefore) {
  const sets = sess.items.reduce((a, it) => a + it.sets.length, 0);
  const reps = sess.items.reduce((a, it) => a + it.sets.reduce((b, st) => b + (num(st.reps) || 0), 0), 0);
  const volume = sess.items.reduce((a, it) => a + it.sets.reduce((b, st) => b + (num(st.kg) || 0) * (num(st.reps) || 0), 0), 0);
  const dur = (sess.end || Date.now()) - sess.start;
  const prs = groupPRs(allPRs().filter(p => p.row.sid === sess.id));
  const after = streakInfo();
  const gained = after.current > streakBefore.current;
  const muscles = [...new Set(sess.items.flatMap(it => it.primary || []))].map(m => MUSCLE_NAME[m]);
  // Vergleich mit dem letzten Mal desselben Trainings
  const prev = S.sessions.filter(s => s.id !== sess.id && s.name === sess.name && s.start < sess.start).sort((a, b) => b.start - a.start)[0];
  const prevVol = prev ? prev.items.reduce((a, it) => a + it.sets.reduce((b, st) => b + (num(st.kg) || 0) * (num(st.reps) || 0), 0), 0) : null;
  const volDiff = prevVol ? (volume - prevVol) / prevVol * 100 : null;

  const ov = document.createElement('div');
  ov.className = 'summary-ov';
  ov.innerHTML = `
    <div class="sum-wrap">
      <div class="sum-streak ${gained ? 'gained' : ''}">
        ${flameSVG('big')}
        <div class="sum-count num"><span id="sumCount">${gained ? streakBefore.current : after.current}</span></div>
        <div class="sum-sub">${after.active ? (gained ? 'Streak verlängert!' : after.started ? `${after.current} Tage Streak` : 'Training erledigt') : 'Training erledigt'}</div>
      </div>
      <h2 class="sum-title">${esc(sess.name)} geschafft</h2>
      <div class="sum-grid">
        <div class="sum-tile"><b class="num">${fmtDuration(dur)}</b><span>Dauer</span></div>
        <div class="sum-tile"><b class="num">${fmt(volume)} kg</b><span>Volumen${volDiff != null ? ` · <em class="${volDiff >= 0 ? 'green' : 'red'}">${volDiff >= 0 ? '+' : ''}${fmt(volDiff, 0)} %</em>` : ''}</span></div>
        <div class="sum-tile"><b class="num">${sets}</b><span>Sätze</span></div>
        <div class="sum-tile"><b class="num">${reps}</b><span>Wiederholungen</span></div>
      </div>
      ${prs.length ? `<div class="sum-prs">
        <div class="eyebrow">${prs.length === 1 ? 'Neuer Rekord' : `${prs.length} neue Rekorde`}</div>
        ${prs.map((g, i) => `<div class="sum-pr" style="animation-delay:${0.6 + i * 0.12}s"><span class="trophy">${I.trophy}</span>
          <div class="t"><b>${esc(exName(g.exId))}</b><span>${g.types.map(t => PR_TYPES[t]).join(', ')}</span></div>
          <span class="num">${prValueText(g.types[0], g.row)}</span></div>`).join('')}
      </div>` : ''}
      ${muscles.length ? `<div class="sum-muscles">${muscles.map(m => `<span class="chip">${esc(m)}</span>`).join('')}</div>` : ''}
      <button class="btn primary" id="sumDone">Fertig</button>
    </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#sumDone').onclick = () => {
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 250);
    if (currentTab === 'train') renderTrain();
  };
  if (gained) {
    setTimeout(() => {
      const c = ov.querySelector('#sumCount');
      c.classList.add('bump');
      c.textContent = after.current;
      haptic();
    }, 900);
  }
}

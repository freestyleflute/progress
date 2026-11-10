/* UI-Helfer: Icons, Sheets, Toasts, Bestätigungen. */
'use strict';

const I = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
  barcode: '<svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  bowl: '<svg viewBox="0 0 24 24"><path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  apple: '<svg viewBox="0 0 24 24"><path d="M12 7c-1.5-1.5-6-2-7 2.5S6.5 20 9 20c1.3 0 1.8-.6 3-.6s1.7.6 3 .6c2.5 0 5-6 4-10.5S13.5 5.5 12 7zM12 7c0-2 1-3.5 3-4"/></svg>',
  trophy: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19 9 12l4 3 7-9"/><path d="M4 4v15h16"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  flash: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  keyboard: '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ---------- Hintergrund sperren, solange ein Fenster offen ist ---------- */
let lockCount = 0, lockY = 0;
function lockScroll() {
  if (lockCount++ > 0) return;
  lockY = window.scrollY || 0;
  const b = document.body.style;
  b.position = 'fixed'; b.top = `-${lockY}px`; b.left = '0'; b.right = '0'; b.width = '100%'; b.overflow = 'hidden';
}
function unlockScroll() {
  if (lockCount === 0 || --lockCount > 0) return;
  const b = document.body.style;
  b.position = ''; b.top = ''; b.left = ''; b.right = ''; b.width = ''; b.overflow = '';
  window.scrollTo(0, lockY);
}
/* Wischen auf Flächen ohne eigenen Scrollbereich nie an die Seite durchreichen */
function blockTouchScroll(el) {
  el.addEventListener('touchmove', (e) => {
    let n = e.target;
    while (n && n !== el) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) return;
      n = n.parentElement;
    }
    e.preventDefault();
  }, { passive: false });
}

/* ---------- Sheets (von unten) ---------- */
const sheetStack = [];
function openSheet({ title, body, onMount, onClose, headRight = '' }) {
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = `
    <div class="backdrop"></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="grab"></div>
      <div class="ph"><h3>${esc(title)}</h3><div class="row" style="flex:none;gap:8px">${headRight}<button class="icon-btn" data-close aria-label="Schließen">${I.close}</button></div></div>
      <div class="pb">${body}</div>
    </div>`;
  document.getElementById('sheets').appendChild(el);
  lockScroll();
  blockTouchScroll(el);
  const entry = { el, onClose };
  sheetStack.push(entry);
  el.querySelector('.backdrop').addEventListener('click', () => closeSheet(el));
  el.querySelector('[data-close]').addEventListener('click', () => closeSheet(el));
  enableSwipeClose(el);
  if (onMount) onMount(el.querySelector('.pb'), el);
  return el;
}
function closeSheet(el) {
  const idx = el ? sheetStack.findIndex(s => s.el === el) : sheetStack.length - 1;
  if (idx < 0) return;
  const [entry] = sheetStack.splice(idx, 1);
  if (entry.onClose) entry.onClose();
  entry.el.classList.add('closing');
  unlockScroll();
  setTimeout(() => entry.el.remove(), 220);
}
function closeAllSheets() {
  while (sheetStack.length) closeSheet();
}
function enableSwipeClose(el) {
  const panel = el.querySelector('.panel');
  const handle = el.querySelector('.grab');
  const ph = el.querySelector('.ph');
  let y0 = null, dy = 0;
  const start = e => { y0 = e.touches[0].clientY; dy = 0; panel.style.transition = 'none'; };
  const move = e => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  };
  const end = () => {
    if (y0 == null) return;
    panel.style.transition = 'transform .2s ease';
    if (dy > 110) closeSheet(el);
    else panel.style.transform = '';
    y0 = null;
  };
  [handle, ph].forEach(h => {
    h.addEventListener('touchstart', start, { passive: true });
    h.addEventListener('touchmove', move, { passive: true });
    h.addEventListener('touchend', end);
  });
}

/* Bestätigung im Sheet (confirm() gibt es in Web-Apps nicht zuverlässig) */
function confirmSheet({ title, text, okLabel = 'Löschen', danger = true }) {
  return new Promise(resolve => {
    let done = false;
    const el = openSheet({
      title,
      body: `<p class="muted" style="margin:0">${esc(text)}</p>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button>
        <button class="btn" data-cancel>Abbrechen</button>`,
      onClose: () => { if (!done) resolve(false); },
    });
    el.querySelector('[data-ok]').onclick = () => { done = true; resolve(true); closeSheet(el); };
    el.querySelector('[data-cancel]').onclick = () => closeSheet(el);
  });
}

/* Ring-SVG */
function ringSVG(pct, stroke = 12, size = 168) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(pct, 0, 1);
  return `<svg viewBox="0 0 ${size} ${size}">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
    <circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/>
  </svg>`;
}

function haptic() {
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
}

/* Datenspeicher: alles liegt lokal auf dem Gerät (localStorage). */
'use strict';

const STORE_KEY = 'progress-app-v1';

const MUSCLES = [
  ['chest', 'Brust'],
  ['front_delt', 'Vordere Schulter'],
  ['side_delt', 'Seitliche Schulter'],
  ['rear_delt', 'Hintere Schulter'],
  ['biceps', 'Bizeps'],
  ['triceps', 'Trizeps'],
  ['forearms', 'Unterarme'],
  ['lats', 'Latissimus'],
  ['upper_back', 'Oberer Rücken / Trapez'],
  ['lower_back', 'Unterer Rücken'],
  ['abs', 'Bauch'],
  ['glutes', 'Gesäß'],
  ['quads', 'Quadrizeps'],
  ['hamstrings', 'Beinbeuger'],
  ['adductors', 'Adduktoren'],
  ['calves', 'Waden'],
];
const MUSCLE_NAME = Object.fromEntries(MUSCLES);

const DEFAULT_EXERCISES = [
  ['Weites Rudern (Maschine)', ['upper_back', 'rear_delt'], ['lats', 'biceps', 'forearms']],
  ['Enges Kabelrudern', ['lats', 'upper_back'], ['biceps', 'rear_delt', 'forearms']],
  ['High-Row-Maschine', ['lats', 'upper_back'], ['biceps', 'rear_delt']],
  ['Reverse Flys (Maschine)', ['rear_delt'], ['upper_back']],
  ['Weite Klimmzüge', ['lats'], ['upper_back', 'biceps', 'forearms']],
  ['Weite Klimmzüge mit Unterstützung', ['lats'], ['upper_back', 'biceps', 'forearms']],
  ['Enger Latzug', ['lats'], ['biceps', 'upper_back', 'forearms']],
  ['Lat-Überzüge (Kabel)', ['lats'], ['triceps']],
  ['Preacher-Curl-Maschine', ['biceps'], ['forearms']],
  ['Hammer Curls (Seil)', ['biceps', 'forearms'], []],
  ['Schrägbankdrücken (Smith Machine)', ['chest'], ['front_delt', 'triceps']],
  ['Dips', ['chest', 'triceps'], ['front_delt']],
  ['Butterfly (Maschine)', ['chest'], ['front_delt']],
  ['Schulterpresse (Maschine)', ['front_delt'], ['side_delt', 'triceps']],
  ['Seitheben (Maschine, sitzend)', ['side_delt'], []],
  ['Seitheben (Kabel)', ['side_delt'], []],
  ['Trizeps-Pushdowns (Seil)', ['triceps'], []],
  ['Romanian Deadlifts (Kurzhanteln)', ['hamstrings', 'glutes'], ['lower_back', 'adductors', 'forearms']],
  ['Hack-Squat-Maschine', ['quads'], ['glutes', 'adductors']],
  ['Leg Curl (liegend, Maschine)', ['hamstrings'], ['calves']],
  ['Leg Extension (sitzend)', ['quads'], []],
  ['Adduktorenmaschine', ['adductors'], []],
  ['Wadenheben (sitzend)', ['calves'], []],
  ['Kabel-Crunches (kniend)', ['abs'], []],
  ['Leg Raises (liegend)', ['abs'], []],
];

const MEALS = [
  ['breakfast', 'Frühstück'],
  ['lunch', 'Mittagessen'],
  ['dinner', 'Abendessen'],
  ['snack', 'Snacks'],
];

const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat', 'salt', 'fiber', 'caffeine'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultState() {
  const exercises = {};
  DEFAULT_EXERCISES.forEach(([name, primary, secondary], i) => {
    const id = 'ex' + String(i + 1).padStart(2, '0');
    exercises[id] = { id, name, primary, secondary };
  });
  return {
    version: 1,
    settings: {
      goals: { kcal: 2200, protein: 170, carbs: 220, fat: 70, salt: 6, fiber: 30, caffeine: 400 },
      restSec: 120,
      secondaryFactor: 0.5,
      zones: { low: 4, opt: 10, high: 20 },
      goal: 'cut',
      rate: { cut: 0.5, bulk: 0.25 },
      lastAdjust: null,
      dismissedRec: null,
    },
    products: {},
    meals: {},
    plan: {},
    diary: {},
    exercises,
    workouts: {},
    sessions: [],
    active: null,
    weights: {},
  };
}

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    return defaultState();
  }
}

function migrate(data) {
  const base = defaultState();
  const out = Object.assign(base, data);
  out.settings = Object.assign(defaultState().settings, data.settings || {});
  out.settings.goals = Object.assign(defaultState().settings.goals, (data.settings || {}).goals || {});
  out.settings.zones = Object.assign(defaultState().settings.zones, (data.settings || {}).zones || {});
  out.settings.rate = Object.assign(defaultState().settings.rate, (data.settings || {}).rate || {});
  return out;
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 150);
}
function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (e) {
    toast('Speichern fehlgeschlagen – bitte Backup exportieren');
  }
}
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

/* ---------- Datum ---------- */
function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(key, n) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7; // Montag = 0
  x.setDate(x.getDate() - wd);
  return x;
}
function daysBetween(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / 86400000);
}
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
function prettyDay(key) {
  const today = dayKey();
  if (key === today) return 'Heute';
  if (key === addDays(today, -1)) return 'Gestern';
  if (key === addDays(today, 1)) return 'Morgen';
  const d = parseDay(key);
  return `${WD[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`;
}

/* ---------- Zahlen ---------- */
function fmt(n, dec = 0) {
  if (n == null || isNaN(n)) return '–';
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function num(v) {
  if (v == null) return NaN;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? NaN : n;
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

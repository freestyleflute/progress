/* Körperkarte vorne/hinten. Linke Körperhälfte wird gezeichnet und gespiegelt. */
'use strict';

const BODY_SIL = 'M100,50 L93,50 C93,56 91,61 85,63 C73,65 61,65 54,71 C46,78 44,90 45,102 C43,116 42,128 41,141 C37,160 34,180 33,201 C31,209 29,217 31,226 C35,231 40,229 41,222 C43,214 46,207 48,201 C52,185 56,165 58,147 C60,133 62,120 64,110 C66,126 68,148 70,168 C68,180 66,190 66,201 C63,230 65,260 70,291 C70,320 72,350 75,382 C73,392 69,398 71,403 L94,403 C94,396 94,389 92,381 C94,352 96,322 94,294 C98,262 98,232 100,208 Z';

/* Vorderseite: [Muskel, Pfad] */
const FRONT = [
  ['upper_back', 'M93,54 C91,60 87,63 79,65 C86,67 91,67 95,66 Z'],
  ['side_delt', 'M55,71 C48,76 45,86 45.5,99 C47,100 49,101 51,102 C48.5,93 48,83 55,71 Z'],
  ['front_delt', 'M66,68 C58,69 53,74 51,84 C50,92 52,99 56,104 C60,96 64,86 69,76 C70,73 69,70 66,68 Z'],
  ['chest', 'M98,70 L72,71 C65,79 61,92 62,105 C70,114 85,116 98,112 Z'],
  ['biceps', 'M57,108 C53,116 50,127 49,139 C52,143 56,143 58,139 C60,128 62,117 62,109 Z'],
  ['forearms', 'M48,147 C44,162 40,180 37,198 C40,200 43,201 46,200 C50,185 54,166 56,149 C53,147 50,146 48,147 Z'],
  ['abs', 'M98,118 L82,118 C78,140 78,162 81,186 C88,192 93,194 98,194 Z'],
  ['abs', 'M79,120 C73,136 71,155 72,170 C74,176 77,181 79,185 C76,162 76,140 79,120 Z'],
  ['quads', 'M71,207 C66,231 68,259 74,285 C80,289 86,289 90,285 C92,261 92,233 88,213 C82,209 77,207 71,207 Z'],
  ['adductors', 'M90,214 C93,233 93,252 92,266 C96,250 98,231 99,212 Z'],
  ['calves', 'M72,301 C70,321 72,341 76,357 C78,341 78,319 76,301 Z'],
];
const FRONT_DETAIL = [
  'M83,132 L98,131', 'M82,148 L98,147', 'M82,165 L98,165', // Bauchsegmente
  'M80,232 C82,252 84,270 86,286', // Quadrizeps-Teilung
];

/* Rückseite */
const BACK = [
  ['upper_back', 'M99,53 C94,60 86,64 73,68 C80,76 90,92 99,122 Z'],
  ['side_delt', 'M55,71 C48,76 45,86 45.5,99 C47,100 49,101 51,102 C48.5,93 48,83 55,71 Z'],
  ['rear_delt', 'M71,69 C62,69 55,73 52,82 C51,91 52,98 56,103 C60,93 66,83 74,74 C74,72 73,70 71,69 Z'],
  ['triceps', 'M53,105 C49,117 47,128 46,140 C50,144 56,144 59,139 C61,127 62,116 60,107 Z'],
  ['forearms', 'M47,147 C43,162 39,180 36,198 C39,200 42,201 45,200 C49,185 53,166 55,149 C52,147 49,146 47,147 Z'],
  ['lats', 'M75,79 C69,92 65,104 66,120 C70,140 76,156 84,166 C90,150 94,136 97,126 C90,105 83,91 75,79 Z'],
  ['lower_back', 'M98,128 C93,141 89,156 87,172 C91,182 95,186 99,186 Z'],
  ['glutes', 'M98,190 C86,186 74,190 68,201 C66,215 70,227 80,231 C88,233 94,229 99,223 Z'],
  ['hamstrings', 'M70,234 C68,254 70,273 74,289 C80,293 86,293 90,289 C92,271 92,251 90,235 C84,235 76,235 70,234 Z'],
  ['adductors', 'M91,236 C93,252 93,266 92,277 C96,263 98,249 99,232 Z'],
  ['calves', 'M74,301 C70,317 70,335 74,349 C80,353 86,351 90,345 C92,331 92,315 90,301 C84,297 78,297 74,301 Z'],
];
const BACK_DETAIL = [
  'M80,240 C81,258 82,274 82,291', // Beinbeuger-Teilung
  'M82,303 C82,318 82,334 82,350', // Waden-Teilung
];

function zoneOf(v) {
  const z = S.settings.zones;
  if (!v || v <= 0) return '';
  if (v < z.low) return 'z1';
  if (v < z.opt) return 'z2';
  if (v <= z.high) return 'z3';
  return 'z4';
}

function bodyHalf(parts, details, vol) {
  const shapes = parts.map(([m, d]) => `<path class="m ${zoneOf(vol[m])}" data-m="${m}" d="${d}"><title>${esc(MUSCLE_NAME[m])}: ${fmt(vol[m] || 0, 1)} Sätze</title></path>`).join('');
  const det = details.map(d => `<path class="detail" d="${d}"/>`).join('');
  return `<path class="sil" d="${BODY_SIL}"/>${shapes}${det}`;
}

function bodyFigure(parts, details, vol, caption) {
  const half = bodyHalf(parts, details, vol);
  return `<svg viewBox="20 0 160 430" role="img" aria-label="Körper ${caption}">
    <ellipse class="sil" cx="100" cy="30" rx="15" ry="19"/>
    <g>${half}</g>
    <g transform="translate(200,0) scale(-1,1)">${half}</g>
    <text class="cap" x="100" y="425">${caption}</text>
  </svg>`;
}

function bodyMapHTML(vol) {
  return `<div class="bodymap">
    ${bodyFigure(FRONT, FRONT_DETAIL, vol, 'VORNE')}
    ${bodyFigure(BACK, BACK_DETAIL, vol, 'HINTEN')}
  </div>`;
}

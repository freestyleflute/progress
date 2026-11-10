/* Vollbild-Barcode-Scanner.
   Erkennung mit zxing-wasm (ZXing-C++ als WebAssembly): liest EAN/UPC in jeder Ausrichtung.
   Gibt es im Browser einen eingebauten BarcodeDetector, wird zusätzlich dieser genutzt. */
'use strict';

const ZXING_URL = 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.0.2/dist/iife/reader/index.js';
const SCAN_FORMATS = ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'];
let zxingLoad = null;

function loadZXing() {
  if (window.ZXingWASM) return Promise.resolve(window.ZXingWASM);
  if (zxingLoad) return zxingLoad;
  zxingLoad = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = ZXING_URL;
    s.onload = () => {
      try { window.ZXingWASM.prepareZXingModule({ fireImmediately: true }); } catch (e) {}
      res(window.ZXingWASM);
    };
    s.onerror = () => { zxingLoad = null; rej(new Error('zxing')); };
    document.head.appendChild(s);
  });
  return zxingLoad;
}

/* Prüfziffer für EAN-8/EAN-13/UPC-A */
function validGtin(code) {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return code.length >= 6;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((a, d, i) => a + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
function normalizeCode(text) {
  let c = String(text || '').replace(/\D/g, '');
  if (c.length === 12) c = '0' + c; // UPC-A als EAN-13 speichern, so wie Open Food Facts
  return c;
}

let nativeDetector = null;
async function getNativeDetector() {
  if (nativeDetector !== null) return nativeDetector;
  nativeDetector = false;
  try {
    if ('BarcodeDetector' in window) {
      const fmts = await window.BarcodeDetector.getSupportedFormats();
      const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => fmts.includes(f));
      if (want.length) nativeDetector = new window.BarcodeDetector({ formats: want });
    }
  } catch (e) { nativeDetector = false; }
  return nativeDetector;
}

/* Optionen absteigend: volle Einstellungen, dann schlichtere, falls eine Version Namen anders erwartet */
const READER_OPTS = [
  { formats: SCAN_FORMATS, tryHarder: true, tryRotate: true, tryInvert: false, tryDownscale: true, maxNumberOfSymbols: 1 },
  { formats: ['EAN13', 'EAN8', 'UPCA', 'UPCE'], tryHarder: true, maxNumberOfSymbols: 1 },
  { tryHarder: true, maxNumberOfSymbols: 1 },
];
let readerOptIdx = 0;
async function readWithFallback(Z, img) {
  while (readerOptIdx < READER_OPTS.length) {
    try { return await Z.readBarcodes(img, READER_OPTS[readerOptIdx]); }
    catch (e) { readerOptIdx++; }
  }
  readerOptIdx = 0;
  return [];
}

/* Liest Barcodes aus Canvas-Bilddaten */
async function decodeImageData(img) {
  const nd = await getNativeDetector();
  if (nd) {
    try {
      const r = await nd.detect(img);
      if (r && r.length) return r[0].rawValue;
    } catch (e) {}
  }
  const Z = await loadZXing();
  const res = await readWithFallback(Z, img);
  const hit = res && res.find(r => r.text && (r.isValid === undefined || r.isValid));
  return hit ? hit.text : null;
}

/* Barcode aus einem Foto lesen (Fallback, nutzt die normale iPhone-Kamera mit bestem Autofokus) */
async function decodeFile(file) {
  const bmp = await createImageBitmap(file);
  const tries = [1600, 1000, 2400];
  for (const maxW of tries) {
    const scale = Math.min(1, maxW / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const code = await decodeImageData(ctx.getImageData(0, 0, c.width, c.height));
    if (code) return code;
  }
  return null;
}

/* Vollbild-Scanner. Ruft onCode(code) einmal auf. */
function openScanner({ onCode, onManual }) {
  const ov = document.createElement('div');
  ov.className = 'scan-ov';
  ov.innerHTML = `
    <video playsinline muted autoplay></video>
    <div class="scan-shade"></div>
    <div class="scan-box"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><div class="scan-laser"></div></div>
    <div class="scan-top">
      <button class="scan-btn" data-x aria-label="Scanner schließen">${I.close}</button>
      <span class="scan-title">Barcode scannen</span>
      <button class="scan-btn" data-torch aria-label="Licht" hidden>${I.flash}</button>
    </div>
    <p class="scan-hint">Barcode in den Rahmen halten. Die Richtung ist egal.</p>
    <div class="scan-bottom">
      <label class="scan-pill" for="scanPhoto">${I.camera}Foto aufnehmen</label>
      <input type="file" id="scanPhoto" accept="image/*" capture="environment" hidden>
      <button class="scan-pill" data-manual>${I.keyboard}Eintippen</button>
    </div>`;
  document.body.appendChild(ov);
  lockScroll();
  blockTouchScroll(ov);
  try { scanAudio = scanAudio || new (window.AudioContext || window.webkitAudioContext)(); scanAudio.resume(); } catch (e) {}
  const video = ov.querySelector('video');
  const hint = ov.querySelector('.scan-hint');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let stream = null, track = null, stopped = false, busy = false, frame = 0, done = false;

  const close = () => {
    if (stopped) return;
    stopped = true;
    unlockScroll();
    if (stream) stream.getTracks().forEach(t => t.stop());
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 200);
  };
  const found = (raw) => {
    if (done) return;
    const code = normalizeCode(raw);
    if (!validGtin(code)) return;
    done = true;
    ov.classList.add('hit');
    beepScan();
    haptic();
    setTimeout(() => { close(); onCode(code); }, 250);
  };

  ov.querySelector('[data-x]').onclick = close;
  ov.querySelector('[data-manual]').onclick = () => { close(); if (onManual) onManual(); };
  ov.querySelector('#scanPhoto').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    hint.textContent = 'Foto wird gelesen …';
    try {
      const code = await decodeFile(f);
      if (code) found(code);
      else hint.textContent = 'Im Foto wurde kein Barcode gefunden. Näher ran und scharf stellen.';
    } catch (err) { hint.textContent = 'Foto konnte nicht gelesen werden.'; }
  };

  // Kamera starten
  (async () => {
    loadZXing().catch(() => {});
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hint.textContent = 'Live-Kamera nicht verfügbar. Nutze „Foto aufnehmen“ oder „Eintippen“.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
      });
    } catch (e) {
      hint.textContent = 'Kein Kamerazugriff. Erlaube die Kamera: Einstellungen › Safari › Kamera. Oder nutze „Foto aufnehmen“.';
      return;
    }
    if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
    track = stream.getVideoTracks()[0];
    video.srcObject = stream;
    try { await video.play(); } catch (e) {}
    // Autofokus, leichter Zoom (damit man das Handy nicht zu nah halten muss) und Licht, wenn verfügbar
    try {
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      const adv = [];
      if (caps.focusMode && caps.focusMode.includes('continuous')) adv.push({ focusMode: 'continuous' });
      if (caps.zoom && caps.zoom.max >= 1.6) adv.push({ zoom: Math.min(2, caps.zoom.max) });
      if (adv.length) await track.applyConstraints({ advanced: adv });
      if (caps.torch) {
        const tb = ov.querySelector('[data-torch]');
        tb.hidden = false;
        let on = false;
        tb.onclick = async () => { on = !on; try { await track.applyConstraints({ advanced: [{ torch: on }] }); tb.classList.toggle('on', on); } catch (e) {} };
      }
    } catch (e) {}
    try { await loadZXing(); } catch (e) {
      if (!(await getNativeDetector())) { hint.textContent = 'Scanner braucht beim ersten Mal Internet. Nutze vorerst „Eintippen“.'; return; }
    }
    loop();
  })();

  async function loop() {
    if (stopped || done) return;
    if (!busy && video.readyState >= 2 && video.videoWidth) {
      busy = true;
      try {
        const vw = video.videoWidth, vh = video.videoHeight;
        frame++;
        // Abwechselnd: Bildmitte in hoher Auflösung und ganzes Bild verkleinert (für schräg gehaltene Codes)
        let sx, sy, sw, sh, maxW;
        if (frame % 3 !== 0) {
          sw = Math.round(vw * 0.86); sh = Math.round(vh * 0.6);
          sx = Math.round((vw - sw) / 2); sy = Math.round((vh - sh) / 2); maxW = 1280;
        } else { sx = 0; sy = 0; sw = vw; sh = vh; maxW = 960; }
        const scale = Math.min(1, maxW / Math.max(sw, sh));
        canvas.width = Math.round(sw * scale); canvas.height = Math.round(sh * scale);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const code = await decodeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
        if (code) found(code);
      } catch (e) {}
      busy = false;
    }
    if (!stopped && !done) requestAnimationFrame(loop);
  }
  return { close };
}

let scanAudio = null;
function beepScan() {
  try {
    scanAudio = scanAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = scanAudio.createOscillator(), g = scanAudio.createGain();
    o.frequency.value = 1400; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, scanAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, scanAudio.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, scanAudio.currentTime + 0.12);
    o.connect(g).connect(scanAudio.destination);
    o.start(); o.stop(scanAudio.currentTime + 0.13);
  } catch (e) {}
}

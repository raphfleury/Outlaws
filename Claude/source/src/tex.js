// Procedural textures: every surface in the game is painted on a canvas at
// startup. For each one we paint a colour image AND a grey "height" image; the
// height image is converted to a normal map so the surface reacts to light.
import * as THREE from 'three';
import { rng } from './util.js';

const cv = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};

// --- tileable noise (lattice wraps at `per`) -------------------------------
function th(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s + 7, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function tnoise(x, y, per, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (n) => ((n % per) + per) % per;
  const a = th(w(xi), w(yi), s), b = th(w(xi + 1), w(yi), s);
  const c = th(w(xi), w(yi + 1), s), d = th(w(xi + 1), w(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function tfbm(u, v, per, oct, s) {
  let amp = 0.5, sum = 0, n = 0, p = per;
  for (let i = 0; i < oct; i++) {
    sum += amp * tnoise(u * p, v * p, p, s + i * 13);
    n += amp; amp *= 0.5; p *= 2;
  }
  return sum / n;
}

/** Per-pixel fill: fn(u, v) -> [r, g, b] (0..255). */
function fill(c, fn) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  const img = ctx.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = fn(x / w, y / h), i = (y * w + x) * 4;
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

function blurred(c, px) {
  const o = cv(c.width, c.height), x = o.getContext('2d');
  x.filter = `blur(${px}px)`;
  // draw 3x3 so the blur wraps at the tile borders
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) x.drawImage(c, i * c.width, j * c.height);
  return o;
}

/** Turn a grey height image into a tangent-space normal map. */
function normalFrom(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = cv(w, h), octx = out.getContext('2d');
  const img = octx.createImageData(w, h), d = img.data;
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
    const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const inv = 1 / Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    d[i] = (-dx * inv * 0.5 + 0.5) * 255;
    d[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
    d[i + 2] = (inv * 0.5 + 0.5) * 255;
    d[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}

export function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}
const rot90 = (t) => {
  const r = t.clone();
  r.center.set(0.5, 0.5); r.rotation = Math.PI / 2; r.needsUpdate = true;
  return r;
};

// --- individual surfaces ---------------------------------------------------

function woodPlanks(seed = 1) {
  const S = 512, r = rng(seed), c = cv(S), h = cv(S);
  const a = c.getContext('2d'), b = h.getContext('2d');
  const n = 8, pw = S / n;
  for (let i = 0; i < n; i++) {
    const L = 178 + r() * 56, x0 = i * pw;
    a.fillStyle = `rgb(${L},${L * 0.88},${L * 0.72})`; a.fillRect(x0, 0, pw, S);
    const hb = 140 + r() * 50;
    b.fillStyle = `rgb(${hb},${hb},${hb})`; b.fillRect(x0, 0, pw, S);
    for (let k = 0; k < 46; k++) {           // grain streaks
      let x = x0 + r() * pw; const ph = r() * 9, fr = 0.01 + r() * 0.02, am = r() * 2.5;
      const dark = r() < 0.75;
      a.strokeStyle = dark ? `rgba(60,36,16,${0.05 + r() * 0.16})` : `rgba(255,240,215,${0.05 + r() * 0.1})`;
      b.strokeStyle = dark ? `rgba(0,0,0,${0.1 + r() * 0.2})` : `rgba(255,255,255,0.12)`;
      a.lineWidth = b.lineWidth = 0.6 + r() * 1.6;
      a.beginPath(); b.beginPath();
      for (let y = 0; y <= S; y += 16) {
        const xx = Math.min(x0 + pw - 1, Math.max(x0 + 1, x + Math.sin(y * fr + ph) * am));
        if (y === 0) { a.moveTo(xx, y); b.moveTo(xx, y); } else { a.lineTo(xx, y); b.lineTo(xx, y); }
      }
      a.stroke(); b.stroke();
    }
    if (r() < 0.6) {                          // knot
      const kx = x0 + pw * (0.3 + r() * 0.4), ky = r() * S;
      for (let q = 5; q > 0; q--) {
        a.strokeStyle = `rgba(50,28,12,${0.16 + q * 0.05})`; a.lineWidth = 1.2;
        a.beginPath(); a.ellipse(kx, ky, q * 2.2, q * 3.6, 0, 0, 7); a.stroke();
      }
      b.fillStyle = 'rgba(0,0,0,0.35)'; b.beginPath(); b.ellipse(kx, ky, 5, 8, 0, 0, 7); b.fill();
    }
    a.fillStyle = 'rgba(20,10,4,0.85)'; a.fillRect(x0 - 1.5, 0, 3, S);
    b.fillStyle = '#000'; b.fillRect(x0 - 2.5, 0, 5, S);
    if (i === 0) { a.fillRect(S - 1.5, 0, 3, S); b.fillRect(S - 2.5, 0, 5, S); }
    for (const ny of [40, 296]) {             // nail heads
      a.fillStyle = 'rgba(30,22,18,0.8)'; a.beginPath(); a.arc(x0 + pw / 2, (ny + r() * 20) % S, 2, 0, 7); a.fill();
    }
  }
  return { map: tex(c), normalMap: tex(normalFrom(blurred(h, 0.7), 2.6), false) };
}

function plaster(seed = 2) {
  const S = 256, c = cv(S), h = cv(S);
  fill(c, (u, v) => {
    const n = tfbm(u, v, 4, 5, seed), m = tfbm(u, v, 16, 3, seed + 5);
    const L = 205 + n * 40 + (m - 0.5) * 22;
    return [L, L * 0.97, L * 0.92];
  });
  fill(h, (u, v) => { const n = tfbm(u, v, 8, 5, seed + 9) * 255; return [n, n, n]; });
  return { map: tex(c), normalMap: tex(normalFrom(h, 1.4), false) };
}

function stoneWall(seed = 3) {
  const S = 512, r = rng(seed), c = cv(S), h = cv(S);
  const a = c.getContext('2d'), b = h.getContext('2d');
  a.fillStyle = '#4c463f'; a.fillRect(0, 0, S, S);
  b.fillStyle = '#181818'; b.fillRect(0, 0, S, S);
  const rows = 8, rh = S / rows;
  for (let j = 0; j < rows; j++) {
    let x = -r() * 60;
    while (x < S) {
      const w = 46 + r() * 70, L = 178 + r() * 42, t = r() * 10 - 5;
      a.fillStyle = `rgb(${L + t},${L},${L - t * 0.6 - 8})`;
      for (const ox of [0, -S]) {             // draw twice so blocks wrap
        a.beginPath(); a.roundRect(x + 3 + ox, j * rh + 3, w - 6, rh - 6, 7); a.fill();
      }
      const hv = 170 + r() * 80;
      b.fillStyle = `rgb(${hv},${hv},${hv})`;
      b.beginPath(); b.roundRect(x + 4, j * rh + 4, w - 8, rh - 8, 9); b.fill();
      b.beginPath(); b.roundRect(x + 4 - S, j * rh + 4, w - 8, rh - 8, 9); b.fill();
      x += w;
    }
  }
  // speckle
  for (let i = 0; i < 9000; i++) {
    a.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)';
    a.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
  }
  return { map: tex(c), normalMap: tex(normalFrom(blurred(h, 2.2), 5), false) };
}

function shingles(seed = 4) {
  const S = 512, r = rng(seed), c = cv(S), h = cv(S);
  const a = c.getContext('2d'), b = h.getContext('2d');
  const rows = 8, rh = S / rows;
  for (let j = 0; j < rows; j++) {
    const g = b.createLinearGradient(0, j * rh, 0, (j + 1) * rh);
    g.addColorStop(0, '#333'); g.addColorStop(0.9, '#eee'); g.addColorStop(1, '#111');
    b.fillStyle = g; b.fillRect(0, j * rh, S, rh);
    let x = -r() * 40;
    while (x < S + 40) {
      const w = 34 + r() * 30, L = 165 + r() * 70;
      for (const ox of [0, -S]) {
        a.fillStyle = `rgb(${L},${L * 0.9},${L * 0.78})`;
        a.fillRect(x + ox, j * rh, w - 1.5, rh);
        a.fillStyle = 'rgba(20,12,6,0.75)'; a.fillRect(x + ox + w - 1.5, j * rh, 1.5, rh);
        b.fillStyle = '#000'; b.fillRect(x + ox + w - 2, j * rh, 2.5, rh);
      }
      x += w;
    }
    const sh = a.createLinearGradient(0, j * rh, 0, j * rh + 14);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    a.fillStyle = sh; a.fillRect(0, j * rh, S, 14);
  }
  for (let i = 0; i < 2500; i++) {
    a.fillStyle = `rgba(40,25,10,${0.05 + r() * 0.1})`;
    a.fillRect(r() * S, r() * S, 1, 6 + r() * 18);
  }
  return { map: tex(c), normalMap: tex(normalFrom(blurred(h, 1), 3.2), false) };
}

function kawara() {
  // Japanese clay roof tiles: rounded vertical ridges, stepped rows.
  const S = 256, c = cv(S), h = cv(S);
  const rows = 4, cols = 4;
  fill(h, (u, v) => {
    const ridge = Math.pow(Math.abs(Math.cos(u * Math.PI * cols)), 0.7);
    const row = (v * rows) % 1;
    const L = (0.25 + 0.6 * ridge) * (0.6 + 0.4 * row) * 255 * (row > 0.96 ? 0.2 : 1);
    return [L, L, L];
  });
  fill(c, (u, v) => {
    const ridge = Math.abs(Math.cos(u * Math.PI * cols)), row = (v * rows) % 1;
    const n = tfbm(u, v, 8, 3, 21);
    const L = 150 + ridge * 60 + n * 40 - (row > 0.94 ? 80 : 0) - (row < 0.1 ? 30 : 0);
    return [L * 0.93, L * 0.97, L * 1.04];
  });
  return { map: tex(c), normalMap: tex(normalFrom(h, 3), false) };
}

function thatch(seed = 6) {
  const S = 256, r = rng(seed), c = cv(S), h = cv(S);
  const a = c.getContext('2d'), b = h.getContext('2d');
  a.fillStyle = '#b79b62'; a.fillRect(0, 0, S, S);
  b.fillStyle = '#777'; b.fillRect(0, 0, S, S);
  for (let i = 0; i < 5000; i++) {
    const x = r() * S, y = r() * S, l = 10 + r() * 40, L = 120 + r() * 120;
    a.strokeStyle = `rgba(${L},${L * 0.85},${L * 0.5},0.5)`;
    b.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
    a.lineWidth = b.lineWidth = 1;
    for (const oy of [0, -S]) {
      a.beginPath(); a.moveTo(x, y + oy); a.lineTo(x + r() * 4 - 2, y + l + oy); a.stroke();
      b.beginPath(); b.moveTo(x, y + oy); b.lineTo(x + r() * 4 - 2, y + l + oy); b.stroke();
    }
  }
  return { map: tex(c), normalMap: tex(normalFrom(h, 2.2), false) };
}

function ground(seed = 7) {
  // Neutral, bright detail texture: the terrain's own colours are multiplied in.
  const S = 512, r = rng(seed), c = cv(S), h = cv(S);
  const hctx = fill(h, (u, v) => {
    const n = tfbm(u, v, 6, 6, seed) * 0.75 + tfbm(u, v, 48, 2, seed + 3) * 0.25;
    const L = n * 255; return [L, L, L];
  });
  const ctx = fill(c, (u, v) => {
    const n = tfbm(u, v, 6, 6, seed), m = tfbm(u, v, 64, 2, seed + 3);
    const L = 176 + n * 62 + (m - 0.5) * 34;
    return [L, L * 0.985, L * 0.96];
  });
  for (let i = 0; i < 520; i++) {            // pebbles
    const x = r() * S, y = r() * S, s = 1 + r() * 3.2, L = 120 + r() * 110;
    ctx.fillStyle = `rgba(${L},${L},${L},0.75)`;
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.75, r() * 3, 0, 7); ctx.fill();
    hctx.fillStyle = 'rgba(255,255,255,0.8)';
    hctx.beginPath(); hctx.ellipse(x, y, s, s * 0.75, 0, 0, 7); hctx.fill();
  }
  return { map: tex(c), normalMap: tex(normalFrom(h, 2.4), false) };
}

function rakedSand() {
  const S = 256, c = cv(S), h = cv(S);
  fill(h, (u, v) => { const L = (Math.sin(v * Math.PI * 2 * 12) * 0.5 + 0.5) * 255; return [L, L, L]; });
  fill(c, (u, v) => {
    const n = tfbm(u, v, 32, 3, 44), w = Math.sin(v * Math.PI * 2 * 12);
    const L = 214 + n * 30 + w * 8;
    return [L, L * 0.98, L * 0.94];
  });
  return { map: tex(c), normalMap: tex(normalFrom(h, 2.2), false) };
}

function cobble(seed = 9) {
  const S = 512, r = rng(seed), c = cv(S), h = cv(S);
  const a = c.getContext('2d'), b = h.getContext('2d');
  a.fillStyle = '#3d3a35'; a.fillRect(0, 0, S, S);
  b.fillStyle = '#000'; b.fillRect(0, 0, S, S);
  const N = 9, cell = S / N;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const cx = (i + 0.5 + (j % 2) * 0.5) * cell + (r() - 0.5) * 12, cy = (j + 0.5) * cell + (r() - 0.5) * 10;
    const rx = cell * (0.4 + r() * 0.1), ry = cell * (0.36 + r() * 0.1), L = 135 + r() * 80, ang = r() * 3;
    for (const ox of [0, -S]) {
      a.fillStyle = `rgb(${L},${L * 0.98},${L * 0.93})`;
      a.beginPath(); a.ellipse(cx + ox, cy, rx, ry, ang, 0, 7); a.fill();
      const g = b.createRadialGradient(cx + ox, cy, 2, cx + ox, cy, rx);
      g.addColorStop(0, '#fff'); g.addColorStop(0.7, '#bbb'); g.addColorStop(1, '#222');
      b.fillStyle = g; b.beginPath(); b.ellipse(cx + ox, cy, rx, ry, ang, 0, 7); b.fill();
    }
  }
  for (let i = 0; i < 6000; i++) {
    a.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
    a.fillRect(r() * S, r() * S, 2, 2);
  }
  return { map: tex(c), normalMap: tex(normalFrom(blurred(h, 1.5), 4), false) };
}

function shoji() {
  const S = 256, c = cv(S), a = c.getContext('2d');
  const g = a.createRadialGradient(S / 2, S * 0.6, 10, S / 2, S / 2, S * 0.8);
  g.addColorStop(0, '#fff3d6'); g.addColorStop(1, '#e9cf9c');
  a.fillStyle = g; a.fillRect(0, 0, S, S);
  a.fillStyle = '#2a1a10';
  for (let i = 0; i <= 4; i++) a.fillRect(i * (S / 4) - 3, 0, 6, S);
  for (let j = 0; j <= 4; j++) a.fillRect(0, j * (S / 4) - 3, S, 6);
  return { map: tex(c) };
}

function bambooStalk() {
  const W = 64, H = 256, c = cv(W, H), a = c.getContext('2d');
  const g = a.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#b9d38a'); g.addColorStop(0.5, '#a9c878'); g.addColorStop(1, '#b9d38a');
  a.fillStyle = g; a.fillRect(0, 0, W, H);
  a.fillStyle = 'rgba(255,255,220,0.5)'; a.fillRect(0, H - 14, W, 6);
  a.fillStyle = 'rgba(40,60,20,0.75)'; a.fillRect(0, H - 8, W, 5);
  a.fillStyle = 'rgba(255,255,220,0.35)'; a.fillRect(0, 0, W, 4);
  return { map: tex(c) };
}

/** Alpha-cut foliage card: many slim leaves on a transparent background. */
function leafCard(seed, hue = [70, 120, 40], long = true) {
  const S = 256, r = rng(seed), c = cv(S), a = c.getContext('2d');
  for (let i = 0; i < 95; i++) {
    const x = S * (0.12 + r() * 0.76), y = S * (0.1 + r() * 0.8);
    const k = 0.7 + r() * 0.6;
    a.fillStyle = `rgb(${hue[0] * k},${hue[1] * k},${hue[2] * k})`;
    a.save(); a.translate(x, y); a.rotate((r() - 0.5) * 2.2 + (long ? Math.PI / 2 : 0));
    a.beginPath();
    if (long) a.ellipse(0, 0, 20 + r() * 12, 3.2 + r() * 1.5, 0, 0, 7);
    else a.ellipse(0, 0, 9 + r() * 6, 6 + r() * 4, 0, 0, 7);
    a.fill(); a.restore();
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t };
}

function windowGlow() {
  const W = 128, H = 160, c = cv(W, H), a = c.getContext('2d');
  a.fillStyle = '#1c120a'; a.fillRect(0, 0, W, H);
  const g = a.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#ff9a3a');
  a.fillStyle = g;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) a.fillRect(10 + i * 56, 10 + j * 72, 52, 68);
  a.fillStyle = 'rgba(120,40,20,0.55)';      // curtains
  a.beginPath(); a.moveTo(10, 10); a.quadraticCurveTo(40, 70, 10, 150); a.fill();
  a.beginPath(); a.moveTo(118, 10); a.quadraticCurveTo(88, 70, 118, 150); a.fill();
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t };
}

/** Text on a board/banner (shop signs, title boards). */
export function signTexture(text, o = {}) {
  const W = o.w || 512, H = o.h || 128, c = cv(W, H), a = c.getContext('2d');
  a.fillStyle = o.bg || '#e8d8b0'; a.fillRect(0, 0, W, H);
  if (o.border !== false) { a.strokeStyle = o.fg || '#3a1c0c'; a.lineWidth = 8; a.strokeRect(8, 8, W - 16, H - 16); }
  const r = rng(text.length * 31 + 5);
  for (let i = 0; i < 300; i++) { a.fillStyle = `rgba(60,40,20,${r() * 0.08})`; a.fillRect(r() * W, r() * H, 30 * r(), 2); }
  a.fillStyle = o.fg || '#3a1c0c';
  a.textAlign = 'center'; a.textBaseline = 'middle';
  let size = o.size || H * 0.6;
  a.font = `${size}px ${o.font || 'Rye'}, serif`;
  const tw = a.measureText(text).width;
  if (tw > W * 0.86) { size *= (W * 0.86) / tw; a.font = `${size}px ${o.font || 'Rye'}, serif`; }
  a.fillText(text, W / 2, H / 2 + size * 0.04);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Build a texture from a custom drawing function (flags, emblems). */
export function drawTexture(w, h, draw) {
  const c = cv(w, h); draw(c.getContext('2d'), w, h);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// --- material library ------------------------------------------------------
// Every material uses vertex colours, so one shared material can be tinted
// per object. `userData.tile` = metres covered by one repeat of the texture.

export function makeMaterials() {
  const std = (o, tile = 2) => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, ...o });
    m.userData.tile = tile;
    return m;
  };
  const M = {};
  const wood = woodPlanks(1);
  M.wood = std({ ...wood, normalScale: new THREE.Vector2(1, 1), roughness: 0.86 }, 2);
  M.woodH = std({ map: rot90(wood.map), normalMap: rot90(wood.normalMap), roughness: 0.86 }, 2);
  M.plaster = std({ ...plaster(), roughness: 0.95 }, 3);
  M.stone = std({ ...stoneWall(), roughness: 0.92 }, 3);
  M.shingle = std({ ...shingles(), side: THREE.DoubleSide }, 3);
  M.kawara = std({ ...kawara(), side: THREE.DoubleSide, roughness: 0.55, metalness: 0.1 }, 1.6);
  M.thatch = std({ ...thatch(), side: THREE.DoubleSide, roughness: 1 }, 2);
  M.ground = std({ ...ground(), roughness: 0.96 }, 5);
  M.raked = std({ ...rakedSand(), roughness: 1 }, 2.2);
  M.cobble = std({ ...cobble(), roughness: 0.85 }, 2.6);
  M.flat = std({});
  M.flat2 = std({ side: THREE.DoubleSide });
  M.rock = std({ flatShading: true, roughness: 0.95 });
  M.rock.userData.rocky = true;
  M.metal = std({ roughness: 0.38, metalness: 0.75 });
  M.cloth = std({ side: THREE.DoubleSide, roughness: 1 });
  const sj = shoji();
  M.shoji = std({ map: sj.map, emissiveMap: sj.map, emissive: new THREE.Color(1.5, 1.05, 0.55), roughness: 1 }, 1.8);
  const wg = windowGlow();
  M.window = std({ map: wg.map, emissiveMap: wg.map, emissive: new THREE.Color(2.2, 1.5, 0.7) }, 1);
  M.bamboo = std({ ...bambooStalk(), roughness: 0.5 }, 1);
  M.bambooLeaf = std({ ...leafCard(11, [96, 150, 58], true), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  M.leaf = std({ ...leafCard(12, [200, 200, 200], false), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
  // Unlit, over-bright material: anything painted with it glows (bloom).
  M.glow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  // what breaks: wood, paper and bamboo walls can be broken through; ground, rock, roofing, leaves, glass and light are never "small things"
  M.wood.userData.breakable = M.woodH.userData.breakable = M.bamboo.userData.breakable = 'wood'; M.shoji.userData.breakable = 'paper';
  for (const k of ['ground', 'raked', 'cobble', 'rock', 'glow', 'leaf', 'bambooLeaf', 'window', 'shoji', 'kawara', 'shingle', 'thatch']) if (M[k]) M[k].userData.noTrinket = true;
  M.glow.color.setScalar(4);
  M.glow.userData = { tile: 1, noShadow: true };
  M.window.userData.noShadow = true;
  return M;
}

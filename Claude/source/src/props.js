// Props shared by the levels: instancing helper, fences, barrels, plants.
import * as THREE from 'three';
import { xf, merge, paint, rockGeo } from './build.js';
import { gBox, gCyl, gSph, gCone, gCap, makeHumanoid, lookFor } from './actors.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

/**
 * Draw one geometry many times in a single GPU call.
 * items: [{x,y,z, ry, s | [sx,sy,sz], c (tint)}]
 */
export function instanced(geo, mat, items, o = {}) {
  if (!geo.attributes.color) paint(geo, 0xffffff);      // materials multiply by vertex colour
  if (o.thin) {                                          // shuffled (always the same way), so that the first half of the list is spread over the whole map
    items = items.slice(); let k = 12345;
    for (let i = items.length - 1; i > 0; i--) { k = (k * 1103515245 + 12345) & 0x7fffffff; const j = k % (i + 1), t = items[i]; items[i] = items[j]; items[j] = t; }
  }
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    _e.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _p.set(it.x, it.y, it.z);
    if (Array.isArray(it.s)) _s.set(it.s[0], it.s[1], it.s[2]); else _s.setScalar(it.s ?? 1);
    im.setMatrixAt(i, _m.compose(_p, _q, _s));
    if (it.c !== undefined) im.setColorAt(i, _c.set(it.c));
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = o.cast ?? true; im.receiveShadow = o.receive ?? true;
  im.frustumCulled = false;
  if (o.thin) { im.userData.thin = true; im.userData.full = items.length; }
  return im;
}

/** Post-and-rail fence from (x0,z0) to (x1,z1) on terrain. */
/** The collider of a standing animal: a box as long and as wide as its body, turned the way it faces (not a cylinder, which stands out far beyond its flanks). */
export function beast(W, x, z, ry, wide, long, y0, y1, fwd = 0.1) { W.addBox(x + Math.sin(ry) * fwd, z + Math.cos(ry) * fwd, wide, long, ry, y0, y1); }

export function fence(B, M, x0, z0, x1, z1, o = {}) {
  const { h = 1.25, rails = 3, c = 0x8a6a4a, solid = true, gap = 2.3 } = o;
  const W = B.world, len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / gap)), ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = W.height(x, z);
    { const t2 = Math.min(n, i + 0.5) / n, cx = x0 + (x1 - x0) * t2, cz = z0 + (z1 - z0) * t2;      // each bay (its post and its rails) breaks on its own
      B.piece({ hp: 55, kind: 'wood', color: c, x: cx, y, z: cz, r: i < n ? len / n / 2 + 0.1 : 0.12, top: y + h }); }
    B.box(M.wood, 0.14, h + 0.15, 0.14, x, y - 0.05, z, { ry: ry + (i % 3) * 0.1, c });
    if (i < n) {
      const xb = x0 + (x1 - x0) * (i + 1) / n, zb = z0 + (z1 - z0) * (i + 1) / n, yb = W.height(xb, zb);
      const seg = Math.hypot(xb - x, zb - z), tilt = Math.atan2(yb - y, seg);
      for (let k = 0; k < rails; k++) {
        const ry_ = h * (0.3 + 0.6 * k / Math.max(1, rails - 1));
        B.box(M.woodH, seg + 0.1, 0.09, 0.05, (x + xb) / 2, (y + yb) / 2 + ry_, (z + zb) / 2, { ry, rz: tilt, c });
      }
      if (solid) W.addBox((x + xb) / 2, (z + zb) / 2, seg + 0.1, 0.2, ry, Math.min(y, yb) - 1, (y + yb) / 2 + h * 0.95);      // one collider per bay, as high as its top rail: on a slope a single box for the whole line stood far above the rails
    }
    B.endPiece();
  }
}

/** Chapters in which gunpowder or fuel is about: there, one barrel in three is a keg that blows up, painted red so that it can be told apart. */
const KEGS = { west: 1, japan: 1, war: 1, russia: 1, tibet: 1, aztec: 1 };
export function barrel(B, M, x, y, z, c = 0x8a623a) {
  const W = B.world, n = (W.barrelN = (W.barrelN || 0) + 1), keg = !!KEGS[W.chapter] && n % 3 === 2;
  if (keg) c = 0x8e2a1c;
  B.piece({ hp: keg ? 15 : 45, kind: 'wood', boom: keg, color: c, x, y, z, r: 0.37, top: y + 0.95, loot: keg ? null : 'barrel' });
  B.cyl(M.wood, 0.36, 0.33, 0.95, x, y, z, { c, solid: true, seg: 12 });
  B.cyl(M.metal, 0.372, 0.372, 0.05, x, y + 0.2, z, { c: keg ? 0x141416 : 0x3a3a3e, seg: 12, open: true });
  B.cyl(M.metal, 0.372, 0.372, 0.05, x, y + 0.7, z, { c: keg ? 0x141416 : 0x3a3a3e, seg: 12, open: true });
  if (keg) B.cyl(M.flat, 0.25, 0.25, 0.012, x, y + 0.95, z, { c: 0xd8c8a0, seg: 12 });     // a pale lid: the mark of the powder
  B.endPiece();
}

export function crate(B, M, x, y, z, s = 0.8, ry = 0, c = 0xa07a4a) {
  B.piece({ hp: 30 + s * 30, kind: 'wood', color: c, x, y, z, r: s * 0.71, top: y + s, loot: 'crate' });
  B.box(M.wood, s, s, s, x, y, z, { ry, c, solid: true });
  B.box(M.woodH, s + 0.04, 0.1, s + 0.04, x, y + s - 0.1, z, { ry, c: 0x6a4a2a });
  B.box(M.woodH, s + 0.04, 0.1, s + 0.04, x, y, z, { ry, c: 0x6a4a2a });
  B.endPiece();
}

/** A tuft of grass blades (for instancing). Height 1, blades lean outward. */
export function tuftGeo(blades = 6, c0 = 0x3a5a22, c1 = 0x9ab84a) {
  const P = [], C = [], U = [], a = new THREE.Color(c0), b = new THREE.Color(c1);
  for (let i = 0; i < blades; i++) {
    const ang = (i / blades) * 6.283 + Math.sin(i * 7.1), lean = 0.25 + (i % 3) * 0.14, w = 0.045, hh = 0.6 + ((i * 37) % 10) / 25;
    const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz * w, pz = dx * w, ox = dx * 0.06, oz = dz * 0.06;
    const tip = [ox + dx * lean * hh, hh, oz + dz * lean * hh], mid = [ox + dx * lean * hh * 0.35, hh * 0.55, oz + dz * lean * hh * 0.35];
    P.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, mid[0] + px * 0.7, mid[1], mid[2] + pz * 0.7,
      ox - px, 0, oz - pz, mid[0] + px * 0.7, mid[1], mid[2] + pz * 0.7, mid[0] - px * 0.7, mid[1], mid[2] - pz * 0.7,
      mid[0] - px * 0.7, mid[1], mid[2] - pz * 0.7, mid[0] + px * 0.7, mid[1], mid[2] + pz * 0.7, tip[0], tip[1], tip[2]);
    for (const k of [0, 0, 0.55, 0, 0.55, 0.55, 0.55, 0.55, 1]) { const c = a.clone().lerp(b, k); C.push(c.r, c.g, c.b); U.push(0, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  // all normals point up so grass is lit like the ground it stands on
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(P.length / 3).fill([0, 1, 0]).flat(), 3));
  return g;
}

/** Saguaro cactus. */
export function cactusGeo() {
  const G = 0x4f7a3c, parts = [gCap(0.3, 3.2, G, [0, 1.9, 0])];
  parts.push(gCap(0.2, 0.9, G, [0.6, 1.9, 0], [0, 0, Math.PI / 2]), gCap(0.2, 1.3, G, [1.05, 2.6, 0]));
  parts.push(gCap(0.18, 0.7, G, [-0.5, 2.5, 0], [0, 0, Math.PI / 2]), gCap(0.18, 0.9, G, [-0.85, 3.05, 0]));
  return merge(parts);
}

/** Conifer: trunk + stacked cones. Height ~ 9. */
export function pineGeo(dark = 0x2e5c34, light = 0x427c42) {
  const parts = [gCyl(0.16, 0.3, 3.2, 0x4a3220, [0, 1.6, 0], [0, 0, 0], 1, 6)];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = 2.3 * (1 - t * 0.82), y = 1.9 + t * 6.2;
    parts.push(gCone(r, 2.6 - t * 0.8, i % 2 ? dark : light, [Math.sin(i * 2.3) * 0.1, y + 0.9, Math.cos(i * 1.7) * 0.1], [0, i * 0.7, 0], 1, 7));
  }
  return merge(parts);
}

/** Broadleaf tree made of a bent trunk and foliage blobs. */
export function blobTreeGeo(o = {}) {
  const { trunk = 0x3a2a20, leaf = [0xf2b8c6, 0xf7d0d8, 0xe89ab0], h = 5, spread = 3, blobs = 9, seed = 1 } = o;
  const parts = [], rnd = (i) => { const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  parts.push(gCyl(0.2, 0.36, h * 0.5, trunk, [0.1, h * 0.25, 0], [0, 0, -0.12], 1, 7));
  parts.push(gCyl(0.12, 0.2, h * 0.45, trunk, [0.5, h * 0.62, 0.1], [0.2, 0, -0.55], 1, 6), gCyl(0.1, 0.18, h * 0.45, trunk, [-0.35, h * 0.64, -0.2], [-0.3, 0, 0.6], 1, 6));
  for (let i = 0; i < blobs; i++) {
    const a = rnd(i) * 6.283, r = Math.sqrt(rnd(i + 20)) * spread, y = h * 0.78 + rnd(i + 40) * h * 0.4, s = 0.9 + rnd(i + 60) * 0.9;
    const g = new THREE.IcosahedronGeometry(s, 1);
    parts.push(xf(g, [Math.cos(a) * r, y, Math.sin(a) * r], [rnd(i) * 3, rnd(i + 5) * 3, 0], [1, 0.72, 1], leaf[i % leaf.length]));
  }
  return merge(parts);
}

/** Simple low-poly horse (static). */
export function horseGeo(coat = 0x6a4428, mane = 0x1c120c) {
  const p = [];
  p.push(gCap(0.36, 1.1, coat, [0, 1.35, 0], [Math.PI / 2, 0, 0], [1, 1, 1.1]));
  p.push(gCap(0.17, 0.75, coat, [0, 1.95, 0.85], [0.75, 0, 0]));                       // neck
  p.push(gCap(0.14, 0.36, coat, [0, 2.28, 1.3], [1.85, 0, 0]), gBox(0.2, 0.2, 0.2, 0x2a1c14, [0, 2.17, 1.55]));
  p.push(gCone(0.05, 0.14, coat, [0.09, 2.5, 1.12]), gCone(0.05, 0.14, coat, [-0.09, 2.5, 1.12]));
  p.push(gBox(0.06, 0.7, 0.12, mane, [0, 2.1, 0.72], [0.75, 0, 0]));
  for (const [x, z] of [[0.2, 0.6], [-0.2, 0.6], [0.2, -0.65], [-0.2, -0.65]]) p.push(gCap(0.075, 0.9, coat, [x, 0.55, z]), gBox(0.14, 0.12, 0.16, 0x1a120c, [x, 0.06, z]));
  p.push(gCone(0.1, 0.9, mane, [0, 1.1, -1.0], [-2.7, 0, 0]));
  return merge(p);
}

/**
 * Oared ship, bow toward local +Z. o: {len, wide, hull, viking (dragon prow and
 * striped sail) or Greek (bronze ram, painted eye), sail, sail2, lambda, shields}
 */
export function ship(B, M, x, y, z, ry, o = {}) {
  const { len = 16, wide = 1.5, hull = 0x4a3222, viking = false, sail = 0xa01414, sail2, lambda = false, shields = null, mast = true } = o;
  const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  B.geo(M.flat, new THREE.SphereGeometry(1, 14, 8), [x, y + 0.45, z], [0, ry, 0], [wide, 1.15, len / 2], hull);
  B.box(M.woodH, wide * 1.5, 0.14, len * 0.84, x, y + 0.95, z, { ry, c: 0x7a5a3a });
  for (const sx of [-1, 1]) {
    const [gx, gz] = P(sx * wide * 0.78, 0); B.box(M.woodH, 0.12, 0.42, len * 0.82, gx, y + 0.95, gz, { ry, c: hull });
    for (let i = 0; i < 8; i++) { const [ox, oz] = P(sx * (wide * 0.8 + 1.1), -len * 0.3 + i * len * 0.085); B.box(M.wood, 2.6, 0.05, 0.1, ox, y + 0.55, oz, { ry, rz: sx * -0.42, c: 0x8a6a44 }); }
    if (shields) for (let i = 0; i < 9; i++) { const [hx, hz] = P(sx * (wide * 0.86), -len * 0.34 + i * len * 0.085); B.geo(M.flat, new THREE.CylinderGeometry(0.34, 0.34, 0.05, 12), [hx, y + 1.2, hz], [0, ry, Math.PI / 2], 1, shields[i % shields.length]); }
    if (!viking) { const [ex, ez] = P(sx * wide * 0.7, len * 0.36); B.geo(M.flat, new THREE.SphereGeometry(0.22, 8, 6), [ex, y + 0.9, ez], [0, ry, 0], [0.3, 1, 1.5], 0xf0ece0); }
  }
  for (const e of [1, -1]) {                       // stem and stern posts
    const tilt = viking ? 0.42 : 0.6, h = viking ? 3.4 : e < 0 ? 3.2 : 1.3, zl = e * (len / 2 - 0.55);
    const [px, pz] = P(0, zl + e * Math.sin(tilt) * h * 0.5);
    B.cyl(M.flat, 0.09, 0.2, h, px, y + 0.6 + (Math.cos(tilt) * h - h) / 2, pz, { ry, rx: e * tilt, c: hull, seg: 6 });
    if (viking && e > 0) { const [dx, dz] = P(0, zl + Math.sin(tilt) * h + 0.2); B.box(M.flat, 0.2, 0.26, 0.5, dx, y + 0.5 + Math.cos(tilt) * h, dz, { ry, rx: 0.3, c: 0xc9a030 }); }
  }
  if (!viking) { const [rx_, rz_] = P(0, len / 2 + 0.2); B.geo(M.metal, new THREE.ConeGeometry(0.34, 1.7, 6), [rx_, y + 0.3, rz_], [Math.PI / 2, ry, 0], 1, 0xc9a050); }
  if (mast) {
    B.cyl(M.wood, 0.1, 0.13, 7.2, x, y + 0.9, z, { c: 0x6a4a2e, seg: 6 });
    B.box(M.wood, 5.4, 0.1, 0.1, x, y + 7.2, z, { ry, c: 0x6a4a2e });
    if (sail2 !== undefined) for (let i = 0; i < 5; i++) { const [sx_, sz_] = P(-2 + i, 0); B.box(M.cloth, 1.0, 4.2, 0.04, sx_, y + 2.95, sz_, { ry, c: i % 2 ? sail2 : sail }); }
    else B.box(M.cloth, 5.0, 4.2, 0.04, x, y + 2.95, z, { ry, c: sail });
    if (lambda) for (const k of [-1, 1]) { const [lx, lz] = P(k * 0.6, 0.04); B.box(M.cloth, 0.34, 2.9, 0.03, lx, y + 3.5, lz, { ry, rz: k * 0.4, c: 0xf0ece0 }); }
  }
  B.world.addBox(x, z, wide * 2.3, len, ry, y - 2, y + 2.3);
}

/** A straight round bar between two points given as [x, y, z]. r = radius at a, r2 = radius at b. */
export function rod(B, mat, a, b, r = 0.05, c = 0x6a4a2e, r2 = r, seg = 6) {
  _p.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _p.length(); if (len < 1e-4) return;
  _q.setFromUnitVectors(_s.set(0, 1, 0), _p.divideScalar(len)); _e.setFromQuaternion(_q, 'YXZ');
  B.geo(mat, new THREE.CylinderGeometry(r2, r, len, seg), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [_e.x, _e.y, _e.z], 1, c);
}

/**
 * Viking longship that can be boarded and walked: main deck, raised platforms at bow and
 * stern, bulwarks, sea chests, mast and sail, dragon prow. Bow toward local +Z; it floats
 * on water at y = 0. o: {len, beam, hull, strake (painted top plank), gilt, sail, sail2,
 * furled, shields, tent: [c1, c2], gang: [x, z] (where the gangplank touches land or jetty)}
 * Returns { P(lx, lz) -> [x, z], P3, D (deck height), hi (platform height), H (half length) }.
 */
export function drakkar(B, M, x, z, ry, o = {}) {
  const { len = 23, beam = 4.8, hull = 0x3a2a1c, strake = 0x8a1c1c, gilt = 0xc9a030, sail = 0x8a1c1c, sail2 = 0xe8e0d0, furled = false, shields = [0x8a1c1c, 0xc8a030, 0x1c4a7a], tent = null, gang = null } = o;
  const W = B.world, c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c], P3 = (lx, y, lz) => [x + lx * c + lz * s, y, z - lx * s + lz * c];
  const D = 1.0, RAISE = 0.45, N = 24, H = len / 2, tOf = (i) => -1 + 2 * i / N, DARK = 0x2a2018;
  const bre = (t) => beam / 2 * Math.pow(1 - Math.pow(Math.abs(t), 2.3), 0.8);          // half breadth at the gunwale
  const top = (t) => D + 0.75 + 1.9 * Math.pow(Math.abs(t), 3.2);                        // the gunwale sweeps up toward bow and stern
  const keel = (t) => -1.0 + 1.9 * Math.pow(Math.abs(t), 3.6);
  const halfAt = (t, y) => { const k = keel(t), q = (y - k) / (top(t) - k); return q <= 0 ? 0 : q >= 1 ? bre(t) : bre(t) * Math.pow(Math.sin(Math.acos(1 - q)), 0.75); };
  const dh = (t) => D + (t < -0.58 || t > 0.66 ? RAISE : 0);                             // deck height: platforms at stern and bow
  let gw = null;
  if (gang) { const dx = gang[0] - x, dz = gang[1] - z, lx = dx * c - dz * s; gw = { side: Math.sign(lx), z: dx * s + dz * c, lx: Math.abs(lx), half: 1.0 }; }

  { // hull: overlapping planks from keel to gunwale on both sides
    const MS = 7, pos = [], col = [], ca = new THREE.Color(hull), cb = new THREE.Color(hull).multiplyScalar(1.35), cs = new THREE.Color(strake);
    const pt = (i, j, sg) => { const t = tOf(i), a = j / MS * Math.PI / 2, k = keel(t); return [sg * bre(t) * Math.pow(Math.sin(a), 0.75), k + (top(t) - k) * (1 - Math.cos(a)), t * H]; };
    for (const sg of [-1, 1]) for (let i = 0; i < N; i++) for (let j = 0; j < MS; j++) {
      const q = [pt(i, j, sg), pt(i + 1, j, sg), pt(i + 1, j + 1, sg), pt(i, j + 1, sg)], cc = j === MS - 1 ? cs : j % 2 ? cb : ca;
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k]); col.push(cc.r, cc.g, cc.b); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    B.geo(M.flat2, g, [x, 0, z], [0, ry, 0], 1);
  }
  { // deck planks following the outline of the hull, and the invisible floor and bulwarks under them
    const pos = [], uv = [];
    for (let i = 1; i < N - 1; i++) {
      const t0 = tOf(i), t1 = tOf(i + 1), tm = (t0 + t1) / 2, y = dh(tm), a = halfAt(t0, y), b = halfAt(t1, y), z0 = t0 * H, z1 = t1 * H;
      const q = [[-a, y, z0], [a, y, z0], [b, y, z1], [-b, y, z1]];
      for (const k of [0, 2, 1, 0, 3, 2]) { pos.push(...q[k]); uv.push(q[k][0] / 2, q[k][2] / 2); }
      const [cx, cz] = P(0, (z0 + z1) / 2); W.addBox(cx, cz, 2 * Math.max(a, b), z1 - z0 + 0.02, ry, -1.6, y);
      for (const sg of [-1, 1]) for (let h = 0; h < 2; h++) {
        const ax = sg * (a + (b - a) * h / 2), bx = sg * (a + (b - a) * (h + 1) / 2), az = z0 + (z1 - z0) * h / 2, bz = z0 + (z1 - z0) * (h + 1) / 2, mz = (az + bz) / 2;
        if (gw && sg === gw.side && Math.abs(mz - gw.z) < gw.half) continue;                 // the gangway stays open
        const [wx, wz] = P((ax + bx) / 2, mz); W.addBox(wx, wz, 0.26, Math.hypot(bx - ax, bz - az) + 0.06, ry + Math.atan2(bx - ax, bz - az), -1.6, top(tm) - 0.02);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    B.geo(M.woodH, g, [x, 0, z], [0, ry, 0], 1, 0x8a6a48);
    for (const e of [-1, 1]) { const t = e * (1 - 2 / N), [wx, wz] = P(0, t * H + e * 0.14); W.addBox(wx, wz, 2 * halfAt(t, D + RAISE) + 0.5, 0.3, ry, -1.6, top(t)); }   // closed at both ends
    for (const t of [tOf(5), tOf(20)]) { const [wx, wz] = P(0, t * H); B.box(M.woodH, 2 * halfAt(t, D + RAISE * 0.6), RAISE, 0.08, wx, D, wz, { ry, c: 0x5a4028 }); }        // the step up to each platform
  }
  if (gw) { // boarding: a step inside, a board across the gunwale, and a plank down to land (a stair of invisible steps under it)
    const t = gw.z / H, hb = halfAt(t, D), sg = gw.side, yT = top(t), wid = 2 * gw.half + 0.3;
    { const [ax, az] = P(sg * (hb - 0.7), gw.z); B.box(M.woodH, 0.6, (yT - D) / 2, wid, ax, D, az, { ry, c: 0x6a5238, solid: true }); }
    { const [ax, az] = P(sg * (hb + 0.1), gw.z); B.box(M.woodH, 1.0, 0.12, wid, ax, yT - 0.12, az, { ry, c: 0x7a5a3a }); W.addBox(ax, az, 1.0, wid, ry, -1.6, yT); }
    const x0 = hb + 0.6, run = Math.max(0.3, gw.lx - x0), yB = W.groundAt(gang[0], gang[1], 2.5), drop = yT - yB, n = Math.max(1, Math.ceil(drop / 0.36));
    for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, [ax, az] = P(sg * (x0 + run * f), gw.z); W.addBox(ax, az, run / n + 0.02, 1.4, ry, -1.6, yT - drop * f); }
    { const [ax, az] = P(sg * (x0 + run / 2), gw.z); B.box(M.woodH, Math.hypot(run, drop) + 0.3, 0.07, 1.3, ax, (yT + yB) / 2 - 0.03, az, { ry, rz: -sg * Math.atan2(drop, run), c: 0x8a6a48 }); }
  }
  { // mast, yard, sail and rigging
    const mz = 0.3, [mx, mw] = P(0, mz), yy = D + 9.3;
    B.cyl(M.wood, 0.13, 0.19, 10.4, mx, D - 0.3, mw, { c: 0x6a4a2e, seg: 8 }); W.addCyl(mx, mw, 0.24, D - 1, D + 10);
    B.box(M.woodH, 0.5, 0.24, 1.5, mx, D, mw, { ry, c: 0x5a4028 });
    rod(B, M.wood, P3(-4.2, yy, mz + 0.22), P3(4.2, yy, mz + 0.22), 0.08, 0x6a4a2e);
    if (furled) {
      B.geo(M.cloth, new THREE.CylinderGeometry(0.3, 0.3, 7.6, 8), P3(0, yy - 0.32, mz + 0.22), [0, ry, Math.PI / 2], 1, sail2);
      for (let i = -3; i <= 3; i++) B.geo(M.flat, new THREE.TorusGeometry(0.31, 0.03, 4, 8), P3(i * 1.1, yy - 0.32, mz + 0.22), [0, ry + Math.PI / 2, 0], 1, DARK);
    } else for (let i = 0; i < 7; i++) { const [sx, sz] = P(-3.3 + i * 1.1, mz + 0.24); B.box(M.cloth, 1.1, 6.3, 0.04, sx, yy - 6.4, sz, { ry, c: i % 2 ? sail2 : sail }); }
    for (const e of [-1, 1]) rod(B, M.flat, P3(0, D + 10, mz), P3(0, top(0.94) + 0.2, e * 0.94 * H), 0.02, DARK);
    for (const sg of [-1, 1]) for (const dz of [-1.6, 1.6]) rod(B, M.flat, P3(0, D + 9.7, mz), P3(sg * bre((mz + dz) / H), top((mz + dz) / H), mz + dz), 0.02, DARK);
    if (!furled) for (const sg of [-1, 1]) rod(B, M.flat, P3(sg * 3.8, yy - 6.4, mz + 0.24), P3(sg * bre(-0.42), top(-0.42), -0.42 * H), 0.015, DARK);   // sheets
  }
  for (const e of [1, -1]) { // stem and stern posts: the dragon's head forward, its curled tail aft
    const y0 = top(1) - 0.15, pts = [[H - 0.08, y0], [H + 0.3, y0 + 0.95], [H + 0.42, y0 + 1.85], [H + 0.2, y0 + 2.6]];
    for (let i = 0; i < 3; i++) rod(B, M.flat, P3(0, pts[i][1], e * pts[i][0]), P3(0, pts[i + 1][1], e * pts[i + 1][0]), 0.17 - i * 0.025, hull, 0.145 - i * 0.025, 7);
    const [hz, hy] = pts[3];
    if (e > 0) {
      const [ax, az] = P(0, hz + 0.34); B.box(M.flat, 0.3, 0.3, 0.8, ax, hy - 0.05, az, { ry, rx: 0.22, c: gilt });
      { const [bx, bz] = P(0, hz + 0.42); B.box(M.flat, 0.22, 0.07, 0.6, bx, hy - 0.22, bz, { ry, rx: 0.5, c: gilt }); B.box(M.flat, 0.08, 0.03, 0.42, bx, hy - 0.14, bz, { ry, rx: 0.36, c: 0xb01c1c }); }
      for (const k of [-1, 1]) { B.geo(M.glow, new THREE.SphereGeometry(0.05, 8, 6), P3(k * 0.155, hy + 0.14, hz + 0.5), [0, 0, 0], 1, 0xff5a20); B.geo(M.flat, new THREE.ConeGeometry(0.06, 0.34, 6), P3(k * 0.1, hy + 0.36, hz + 0.02), [-0.7, ry, 0], 1, gilt); }
      for (let i = 0; i < 3; i++) B.geo(M.flat, new THREE.ConeGeometry(0.07, 0.3, 5), P3(0, pts[i + 1][1] - 0.1, pts[i + 1][0] - 0.22 - i * 0.02), [-1.2, ry, 0], 1, gilt);
    } else B.geo(M.flat, new THREE.TorusGeometry(0.4, 0.085, 6, 12, Math.PI * 1.5), P3(0, hy + 0.28, -(hz - 0.36)), [0, ry + Math.PI / 2, 0.5], 1, gilt);
  }
  for (let i = 6; i <= 18; i += 2) for (const sg of [-1, 1]) {      // sea chests: the rowers sat on them
    const t = tOf(i), lz = t * H; if (gw && sg === gw.side && Math.abs(lz - gw.z) < 1.9) continue;
    const [ax, az] = P(sg * (halfAt(t, D) - 0.48), lz);
    B.box(M.woodH, 0.5, 0.4, 0.8, ax, D, az, { ry, c: [0x6a4a2e, 0x5a4028, 0x7a5a3a][(i / 2 + (sg > 0 ? 1 : 0)) % 3], solid: true }); B.box(M.metal, 0.52, 0.04, 0.1, ax, D + 0.37, az, { ry, c: 0x3a3e44 });
  }
  for (let i = 6; i < 18; i++) for (const sg of [-1, 1]) {           // shields along the rail
    const t = tOf(i) + 1 / N, lz = t * H; if (gw && sg === gw.side && Math.abs(lz - gw.z) < 1.4) continue;
    B.geo(M.flat, new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12), P3(sg * (bre(t) + 0.06), top(t) - 0.32, lz), [0, ry, Math.PI / 2], 1, shields[i % shields.length]);
    B.geo(M.metal, new THREE.SphereGeometry(0.09, 8, 6), P3(sg * (bre(t) + 0.1), top(t) - 0.32, lz), [0, 0, 0], 1, 0xc9ced6);
  }
  { // the oars, stowed on two crutches above head height
    for (const lz of [-1.9, -5.9]) { const [ax, az] = P(0, lz); B.cyl(M.wood, 0.06, 0.08, 2.5, ax, D, az, { c: 0x5a4028, seg: 6 }); W.addCyl(ax, az, 0.12, D - 0.5, D + 2.5); B.box(M.wood, 0.7, 0.08, 0.1, ax, D + 2.5, az, { ry, c: 0x5a4028 }); }
    for (let i = 0; i < 6; i++) { const lx = -0.28 + i * 0.11; rod(B, M.wood, P3(lx, D + 2.63, -6.5), P3(lx, D + 2.63, -1.3), 0.03, 0x8a6a44); const [ax, az] = P(lx, -6.3 - (i % 2) * 0.25); B.box(M.wood, 0.03, 0.14, 0.7, ax, D + 2.56, az, { ry, c: 0x8a6a44 }); }
  }
  if (tent) { // a striped tent pitched over the deck forward of the mast, open at both ends
    const z0 = 1.9, z1 = 6.7, n = 4, ridge = D + 3.0;
    for (let i = 0; i < n; i++) {
      const za = z0 + (z1 - z0) * i / n, zb = za + (z1 - z0) / n, zm = (za + zb) / 2, hw = bre(zm / H) + 0.05, base = top(zm / H) + 0.02, sl = Math.hypot(hw, ridge - base);
      for (const sg of [-1, 1]) { const [tx, tz] = P(sg * hw / 2, zm); B.box(M.cloth, sl, 0.04, zb - za, tx, (ridge + base) / 2 - 0.02, tz, { ry, rz: -sg * Math.atan2(ridge - base, hw), c: tent[i % 2] }); }
    }
    rod(B, M.wood, P3(0, ridge, z0 - 0.3), P3(0, ridge, z1 + 0.3), 0.06, 0x5a4028);
    for (const ze of [z0, z1]) for (const sg of [-1, 1]) rod(B, M.wood, P3(sg * (bre(ze / H) + 0.05), top(ze / H), ze), P3(-sg * 0.55, ridge + 0.75, ze), 0.06, 0x5a4028);
    for (const [lx, lz, cc] of [[-1.15, 4.6, 0x8a7458], [1.15, 3.2, 0x5a4632]]) { const [ax, az] = P(lx, lz); B.box(M.cloth, 0.85, 0.12, 1.9, ax, D, az, { ry, c: cc }); }   // furs to sleep on
  }
  { // steering oar on the right-hand quarter, with its tiller; a coil of rope in the bow
    const t = -0.8, lz = t * H, hb = halfAt(t, D + RAISE);
    rod(B, M.wood, P3(-(hb + 0.3), D + RAISE + 1.5, lz + 0.1), P3(-(hb + 0.45), -1.1, lz - 0.5), 0.06, 0x6a4a2e);
    rod(B, M.wood, P3(-(hb + 0.31), D + RAISE + 1.25, lz + 0.05), P3(-0.3, D + RAISE + 1.15, lz + 0.05), 0.035, 0x6a4a2e);
    { const [ax, az] = P(-(hb + 0.42), lz - 0.38); B.box(M.wood, 0.06, 1.3, 0.44, ax, -1.0, az, { ry, rx: 0.22, c: 0x6a4a2e }); }
    B.geo(M.flat, new THREE.TorusGeometry(0.34, 0.07, 5, 12), P3(0.35, D + RAISE + 0.07, 0.76 * H), [Math.PI / 2, 0, 0], 1, 0xb8a070);
  }
  return { P, P3, D, hi: D + RAISE, H };
}

/** Fire bowl on a tripod. Returns the flame position [x, y, z]. */
export function brazier(B, M, x, y, z, s = 1) {
  for (let i = 0; i < 3; i++) B.cyl(M.metal, 0.025 * s, 0.03 * s, 1.15 * s, x + Math.cos(i * 2.09) * 0.2 * s, y, z + Math.sin(i * 2.09) * 0.2 * s, { c: 0x2a2a2e, seg: 5, rz: Math.cos(i * 2.09) * -0.22, rx: Math.sin(i * 2.09) * 0.22 });
  B.cyl(M.metal, 0.36 * s, 0.2 * s, 0.22 * s, x, y + 1.05 * s, z, { c: 0x3a3a3e, seg: 10 });
  B.geo(M.glow, new THREE.ConeGeometry(0.22 * s, 0.55 * s, 6), [x, y + 1.5 * s, z], [0, 0, 0], 1, 0xff7a20);
  B.world.addCyl(x, z, 0.32 * s, y - 1, y + 1.3 * s);
  return [x, y + 1.45 * s, z];
}

/**
 * Hollow building shell that can be walked into. (x, z) = centre, y = floor level, o.ry = rotation.
 * Local frame: 's' = +z, 'n' = -z, 'e' = +x, 'w' = -x.
 * o: { w, d, h, t (wall thickness), mat, c, mats: {n,s,e,w}, cs: {n,s,e,w}, base (depth below y),
 *      doors: [{ side, at, w, h }], wins: [{ side, at, w, y, h }], floor: {mat, c} | false, ceil: {mat, c} | false }
 * Returns P(lx, lz) -> [worldX, worldZ].
 */
export function room(B, M, x, y, z, o) {
  const { w, d, h = 3.2, t = 0.3, ry = 0, mat = M.plaster, c = 0xffffff, base = 0.5 } = o;
  const cs = Math.cos(ry), sn = Math.sin(ry), P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  const piece = (side, a0, a1, y0, y1) => {
    if (a1 - a0 < 0.02 || y1 - y0 < 0.02) return;
    const m = (a0 + a1) / 2, L = a1 - a0, ns = side === 'n' || side === 's';
    const off = (side === 's' || side === 'e' ? 1 : -1) * ((ns ? d : w) / 2 - t / 2);
    const [px, pz] = ns ? P(m, off) : P(off, m);
    B.box((o.mats && o.mats[side]) || mat, ns ? L : t, y1 - y0, ns ? t : L, px, y + y0, pz, { ry, c: (o.cs && o.cs[side]) ?? c, solid: true });
  };
  for (const side of ['n', 's', 'e', 'w']) {
    const ns = side === 'n' || side === 's', half = ns ? w / 2 : d / 2 - t;
    const ops = [...(o.doors || []).filter((q) => q.side === side).map((q) => ({ a: q.at - (q.w ?? 1.5) / 2, b: q.at + (q.w ?? 1.5) / 2, y0: 0, y1: q.h ?? 2.4 })),
      ...(o.wins || []).filter((q) => q.side === side).map((q) => ({ a: q.at - (q.w ?? 1.2) / 2, b: q.at + (q.w ?? 1.2) / 2, y0: q.y ?? 1.1, y1: (q.y ?? 1.1) + (q.h ?? 1.1) }))].sort((p, q) => p.a - q.a);
    let cur = -half;
    for (const op of ops) {
      piece(side, cur, op.a, -base, h);
      piece(side, op.a, op.b, -base, op.y0);        // threshold or window sill
      piece(side, op.a, op.b, op.y1, h);            // lintel
      cur = op.b;
    }
    piece(side, cur, half, -base, h);
  }
  if (o.floor !== false) B.box((o.floor && o.floor.mat) || M.woodH, w - t, base + 0.06, d - t, x, y - base, z, { ry, c: (o.floor && o.floor.c) ?? 0x7a5a3e, solid: true });
  if (o.ceil !== false) B.box((o.ceil && o.ceil.mat) || M.woodH, w, 0.2, d, x, y + h, z, { ry, c: (o.ceil && o.ceil.c) ?? 0x5a4030, solid: true });
  return P;
}

/** Flight of steps going down from yTop, starting at (x, z) and running along local +Z. */
export function steps(B, M, x, z, ry, yTop, n = 4, o = {}) {
  const { w = 2, rise = 0.36, run = 0.5, mat = M.stone, c = 0xb0a898 } = o, cs = Math.cos(ry), sn = Math.sin(ry);
  for (let k = 0; k < n; k++) { const lz = (k + 0.5) * run; B.box(mat, w, 3, run + 0.02, x + lz * sn, yTop - (k + 1) * rise - 3, z + lz * cs, { ry, c, solid: true }); }
}

/** Heap of rubble: a few rocks and a low collider. */
export function rubble(B, M, x, y, z, r = 1.2, c = 0x9a9488, n = 7) {
  for (let i = 0; i < n; i++) { const a = i * 2.4, d = (i % 3) * r * 0.35, s = r * (0.28 + (i % 4) * 0.09); B.geo(M.rock, rockGeo(i + 2, 0), [x + Math.cos(a) * d, y + s * 0.4, z + Math.sin(a) * d], [i, a, 0], [s, s * 0.7, s], c); }
  B.world.addCyl(x, z, r * 0.75, y - 1, y + r * 0.42);
}
/** Shelves against a wall, with goods on them. (x, z) = centre, w along local X. */
export function shelf(B, M, x, y, z, ry, w = 3, h = 2.2, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry), cols = o.goods || [0xb83a2a, 0x3a5a8a, 0xd8c060, 0x5a7a4a];
  B.piece({ hp: 100, kind: 'wood', color: o.c ?? 0x5a4028, x, y, z, r: w / 2, top: y + h, spot: { x: x + 0.22 * s, y: y + 0.8, z: z + 0.22 * c, hw: w / 2 - 0.3, hd: 0.08, ry } });   // the second shelf from the floor
  B.box(M.woodH, w, h, 0.45, x, y, z, { ry, c: o.c ?? 0x5a4028, solid: true });
  for (let k = 0; k < Math.floor(h / 0.6); k++) for (let i = 0; i < Math.floor(w / 0.42); i++) { if ((i * 7 + k * 3) % 5 === 0) continue; const lx = -w / 2 + 0.25 + i * 0.42; B.box(M.flat, 0.26, 0.3, 0.2, x + lx * c + 0.24 * s, y + 0.2 + k * 0.6, z - lx * s + 0.24 * c, { ry, c: cols[(i + k) % cols.length] }); }
  B.endPiece();
}

/** Row of iron bars from (x0,z0) to (x1,z1), between heights y0 and y1. */
export function bars(B, M, x0, z0, x1, z1, y0, y1, o = {}) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / (o.gap ?? 0.17))), ry = Math.atan2(-(z1 - z0), x1 - x0), c = o.c ?? 0x2a2a2e;
  for (let i = 0; i <= n; i++) B.cyl(M.metal, 0.022, 0.022, y1 - y0, x0 + (x1 - x0) * i / n, y0, z0 + (z1 - z0) * i / n, { c, seg: 5 });
  for (const yy of [y0, (y0 + y1) / 2 - 0.03, y1 - 0.06]) B.box(M.metal, L + 0.04, 0.06, 0.07, (x0 + x1) / 2, yy, (z0 + z1) / 2, { ry, c });
  if (o.solid !== false) B.world.addBox((x0 + x1) / 2, (z0 + z1) / 2, L, 0.1, ry, y0, y1);
}

export { gBox, gCyl, gSph, gCone, gCap, xf, merge, paint };

/**
 * A flat-topped rock that can be climbed: a block of coloured bands with a zigzag stair of rock steps up one face.
 * The stair is on the local +Z face (flip = -1: on the -Z face). Each leg rises h / legs; the steps are 0.3 m high and
 * 1 m deep, so walkers and enemies can climb it. o: { w, d, h, legs, bands, y (ground level), flip, cover }
 * Returns { top } (height of the summit).
 */
export function butte(B, M, x, z, o = {}) {
  const { w = 16, d = 12, h = 12, legs = 4, bands = [0x9a4a2e, 0xb8623a, 0xc98a5a, 0xa85436, 0xd09a6a], y = 0, flip = 1, lw = 1.9, cover = 0x8a5236, topC } = o;
  const rise = h / legs, n = Math.ceil(rise / 0.3), run = 1.0, L = n * run, band = (yy) => bands[Math.max(0, Math.min(bands.length - 1, Math.floor((yy - y) / h * bands.length)))];
  // The body: thin layers, each a block (flush with the stair face) plus an eight-sided bulge on the back and the sides,
  // every second one set back, so the rock reads as weathered ledges. The two top layers are the cap rock: blocks only.
  const nb = o.layers ?? 7, hb = h / nb, R0 = Math.min(w, d) * 0.62;
  for (let i = 0; i < nb; i++) {
    const c = bands[i % bands.length], inset = (i % 2) * 0.5, foot = i === 0 ? 1.5 : 0, y0 = y + i * hb - foot, hh = hb + foot;
    B.box(M.rock, w - 2 * inset, hh, d - inset, x, y0, z - flip * inset / 2, { c });
    if (i < nb - 2) { const R = R0 - inset - i * 0.12; B.geo(M.rock, new THREE.CylinderGeometry(R * 0.95, R, hh, 8), [x, y0 + hh / 2, z - flip * (d / 2 - R * 0.55)], [0, 0.39 + i * 0.26, 0], [w / d * 0.95, 1, 1], c); }
  }
  B.world.addBox(x, z, w, d, 0, y - 2, y + h);
  B.world.addCyl(x, z - flip * (d / 2 - R0 * 0.55), R0 * 0.9, y - 2, y + h - 2 * hb - 0.2);
  for (let i = 0; i < 9; i++) {                             // fallen boulders round the foot, away from the stair
    const a2 = Math.PI * (1.08 + i * 0.105) * flip, rr = R0 * (1.25 + (i % 3) * 0.12), sc = 0.8 + (i % 4) * 0.45, bx = x + Math.cos(a2) * rr * w / d, bz = z - flip * (d / 2 - R0 * 0.55) + Math.sin(a2) * rr;
    B.geo(M.rock, rockGeo(i + 2, 1), [bx, y + sc * 0.25, bz], [0, i * 1.7, 0], [sc, sc * 0.8, sc], bands[i % bands.length]); B.world.addCyl(bx, bz, sc * 0.8, y - 1, y + sc * 0.7);
  }
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) {     // crags on the two flanks, so no face is a flat wall
    const sc = 1.5 + (i % 2) * 0.8;
    B.geo(M.rock, rockGeo(i + 7, 1), [x + sd * (w / 2 - 0.35), y + h * (0.08 + i * 0.185), z + flip * d * (0.4 - (i % 3) * 0.2)], [0, i * 2.1 + sd, 0], [sc * 0.85, sc * 1.05, sc], bands[(i + 1) % bands.length]);
  }
  if (topC !== undefined) B.box(M.ground, w - 1.0, 0.06, d - 0.6, x, y + h, z + flip * 0.05, { c: topC });
  for (let k = 0; k < legs; k++) {
    const dir = k % 2 ? -1 : 1, lz = z + flip * (d / 2 + lw / 2 + (legs - 1 - k) * lw);
    for (let i = 0; i < n; i++) { const top = y + k * rise + (i + 1) * rise / n; B.box(M.rock, run + 0.02, top - y + 1.5, lw, x + dir * (-L / 2 + (i + 0.5) * run), y - 1.5, lz, { c: band(top - 0.2), solid: true }); }
    if (k < legs - 1) { const top = y + (k + 1) * rise; B.box(M.rock, lw, top - y + 1.5, lw * 2, x + dir * (L / 2 + lw / 2), y - 1.5, lz - flip * lw / 2, { c: band(top - 0.2), solid: true }); }   // the turn
  }
  const T = y + h;                                         // boulders on the summit: cover to crouch behind
  [[-w * 0.3, -d / 2 + 0.9, 2.6, 0.9], [w * 0.22, -d / 2 + 0.9, 3.0, 0.9], [-w / 2 + 0.9, -0.5, 0.9, 2.8], [w / 2 - 0.9, 1.0, 0.9, 2.4]].forEach(([lx, lz2, sx, sz], i) => {
    B.geo(M.rock, rockGeo(i + 5, 1), [x + lx, T + 0.28, z + flip * lz2], [0, 0, 0], [sx * 0.56, 0.92, sz * 0.56], cover);
    B.world.addBox(x + lx, z + flip * lz2, sx, sz, 0, T - 0.2, T + 0.95);
  });
  return { top: T };
}

/**
 * A ladder against a wall or the edge of a deck. (x, z) = the wall where the ladder touches it at the top, (nx, nz) = the direction away
 * from the wall. Walk into it to climb to y1. o.lean = metres the foot stands out per metre of height (0 = upright).
 */
export function ladder(B, M, x, z, nx, nz, y0, y1, o = {}) {
  const { c = 0x8a6a44, lean = 0 } = o, ry = Math.atan2(nx, nz), top = y1 + 0.95;
  if (!lean) {
    const px = x + nx * 0.14, pz = z + nz * 0.14;
    for (const k of [-1, 1]) B.box(M.wood, 0.07, top - y0 + 0.2, 0.07, px + nz * k * 0.3, y0 - 0.2, pz - nx * k * 0.3, { ry, c });
    for (let yy = y0 + 0.3; yy < top - 0.1; yy += 0.32) B.box(M.wood, 0.62, 0.045, 0.045, px, yy, pz, { ry, c });
  } else {                                                  // two rails and the rungs, all tilted back toward the wall
    const ang = Math.atan(lean), rot = [-ang, ry, 0], at = (yy, k) => { const d = lean * (y1 - yy) + 0.1; return [x + nx * d + nz * k * 0.3, yy, z + nz * d - nx * k * 0.3]; };
    for (const k of [-1, 1]) B.geo(M.wood, new THREE.BoxGeometry(0.08, (top - y0 + 0.3) / Math.cos(ang), 0.08), at((top + y0 - 0.3) / 2, k), rot, 1, c);
    for (let yy = y0 + 0.3; yy < top - 0.1; yy += 0.32) B.geo(M.wood, new THREE.BoxGeometry(0.62, 0.05, 0.05), at(yy, 0), rot, 1, c);
  }
  B.world.ladders.push({ x, z, nx, nz, y0, y1, lean });
}

/** A raised hide: a deck on four posts with a low wall on three sides (open on the local +Z side) and a light roof, with a ladder up to it. */
export function stand(B, M, x, y, z, ry, o = {}) {
  const { h = 3.3, w = 3, d = 3, c = 0x7a5a3a, wall = 1.0, roof = 0x5a4632 } = o, cs = Math.cos(ry), sn = Math.sin(ry), P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = P(a * (w / 2 - 0.15), b * (d / 2 - 0.15)); B.box(M.wood, 0.2, h + (roof !== null ? 2.3 : 0), 0.2, px, y - 0.3, pz, { ry, c: 0x5a4028 }); B.world.addCyl(px, pz, 0.14, y - 1, y + h - 0.2); }
  B.box(M.woodH, w, 0.2, d, x, y + h - 0.2, z, { ry, c, solid: true });
  { const [a, b] = P(0, -d / 2 + 0.08); B.box(M.wood, w, wall, 0.16, a, y + h, b, { ry, c, solid: true }); }
  for (const k of [-1, 1]) { const [a, b] = P(k * (w / 2 - 0.08), 0); B.box(M.wood, 0.16, wall, d, a, y + h, b, { ry, c, solid: true }); }
  if (roof !== null) B.box(M.woodH, w + 0.6, 0.12, d + 0.6, x, y + h + 2.0, z, { ry, c: roof });
  if (o.steps !== false) { const [a, b] = P(0, d / 2); ladder(B, M, a, b, sn, cs, y - 0.2, y + h); }      // a ladder on the open side
}

/** A low den that can only be entered crouching: the door is 1.25 m high. Local +Z has the door. */
export function den(B, M, x, y, z, ry, o = {}) {
  const { w = 3.4, d = 3.2, mat = M.stone, c = 0x8a8478, floor = { mat: M.ground, c: 0x6a5a48 }, ceil = { mat, c } } = o;
  return room(B, M, x, y, z, { w, d, h: 1.95, t: 0.35, ry, mat, c, base: 1.6, doors: [{ side: 's', at: 0, w: 1.4, h: 1.25 }], floor, ceil });
}

/**
 * A great boulder with a flat, grassy top, reached by a wooden ladder that leans against its flank.
 * (x, z) = centre, y = ground level under it. o: { rx, rz, h, seed, ladder (the side the ladder stands on, an angle),
 * rock: [colours], grass, cross (true = a summit cross at the rim) }. Returns { top } (height of the flat top).
 */
export function boulder(B, M, x, y, z, o = {}) {
  const { rx = 8, rz = 7, h = 7.5, seed = 3, ladder: la = 0.35, rock = [0x8c8880, 0x767470, 0x9a968c, 0x6e6c6a], grass = 0x587f36, grass2 = 0x7c9c48, moss = 0x6a7a44 } = o;
  const W = B.world, AMP = 0.17, CUT = 0.5, SINK = 0.3, PW = 2.7, Hy = h / (CUT + SINK), yc = y + SINK * Hy, T = y + h;
  const side = (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), PW)), 1 / PW);        // how far out the rock reaches at height u: steep flanks, a broad top
  // the rock: a sphere pushed in and out by noise, its top sliced flat; grass on the flat, moss on the shoulders
  const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453; return v - Math.floor(v); };
  const wav = (vx, vy, vz, f, ph) => Math.sin(vx * f + ph) * Math.cos(vy * f * 1.13 + ph * 1.7) + Math.sin(vz * f * 0.91 + ph * 0.6) * Math.cos(vx * f * 0.77 - ph);   // about -2 .. 2
  const bump = (vx, vy, vz) => 1 + (0.085 * wav(vx, vy, vz, 2.1, seed) + 0.045 * wav(vx, vy, vz, 5.3, seed * 2.3)) * (1 - Math.min(1, Math.max(0, (vy - 0.2) / 0.3)));   // no bumps near the flat top: its rim stays where the floor is
  const g = new THREE.IcosahedronGeometry(1, 3).toNonIndexed(), P = g.attributes.position, col = new Float32Array(P.count * 3);
  const c = new THREE.Color(), c2 = new THREE.Color(), cg = new THREE.Color(grass), cg2 = new THREE.Color(grass2), cm = new THREE.Color(moss);
  for (let i = 0; i < P.count; i++) {
    const vx = P.getX(i), vy = P.getY(i), vz = P.getZ(i);
    const k = bump(vx, vy, vz), rh = Math.hypot(vx, vz) || 1, q = side(vy) / rh * k;
    P.setXYZ(i, vx * q, Math.min(CUT, vy * (1 + (k - 1) * 0.5)), vz * q);
  }
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  for (let f = 0; f < P.count; f += 3) {
    va.set(P.getX(f) * rx, P.getY(f) * Hy, P.getZ(f) * rz); vb.set(P.getX(f + 1) * rx, P.getY(f + 1) * Hy, P.getZ(f + 1) * rz).sub(va); vc.set(P.getX(f + 2) * rx, P.getY(f + 2) * Hy, P.getZ(f + 2) * rz).sub(va);
    const ny = vb.cross(vc).normalize().y, fi = f / 3, mx = (P.getX(f) + P.getX(f + 1) + P.getX(f + 2)) / 3, my = (P.getY(f) + P.getY(f + 1) + P.getY(f + 2)) / 3, mz = (P.getZ(f) + P.getZ(f + 1) + P.getZ(f + 2)) / 3;
    if (ny > 0.36) c.copy(cg).lerp(cg2, hsh(fi, 1));                                                                         // the flat top and every ledge carry grass
    else {
      c.set(rock[0]).lerp(c2.set(rock[1]), Math.min(1, Math.max(0, wav(mx, my, mz, 1.4, seed * 0.7) * 0.25 + 0.5))).multiplyScalar(0.86 + hsh(fi, 2) * 0.28);
      if (my > -0.05) c.lerp(cm, Math.min(0.75, Math.max(0, ny + 0.25) * 1.3 * (0.35 + hsh(fi, 3) * 0.65)));                // moss where the face leans back
    }
    for (let j = 0; j < 3; j++) { col[(f + j) * 3] = c.r; col[(f + j) * 3 + 1] = c.g; col[(f + j) * 3 + 2] = c.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  B.geo(M.rock, g, [x, yc, z], [0, 0, 0], [rx, Hy, rz]);
  B.geo(M.ground, new THREE.CylinderGeometry(1, 1, 0.05, 28), [x, T + 0.01, z], [0, 0, 0], [rx * side(CUT) * 0.985, 1, rz * side(CUT) * 0.985], grass);     // turf on the flat top, the same as the meadow
  // what you can stand on and bump into: six nested slabs under the flat top (their corners lie on its oval rim), six more for the body
  const px = rx * side(CUT) * 0.97, pz = rz * side(CUT) * 0.97;
  for (let i = 0; i < 6; i++) { const a = (i + 0.5) * Math.PI / 12; W.addBox(x, z, 2 * Math.cos(a) * px, 2 * Math.sin(a) * pz, 0, T - 1.2, T); }
  for (let i = 0; i < 6; i++) { const a = (i + 0.5) * Math.PI / 12; W.addBox(x, z, 2 * Math.cos(a) * rx * 0.96, 2 * Math.sin(a) * rz * 0.96, 0, y - 2, T - 1.3); }
  // the ladder: it touches the rim at the top and leans just enough to clear the rock's widest bulge on that side
  const dX = Math.cos(la) * rx, dZ = Math.sin(la) * rz, Rd = Math.hypot(dX, dZ), nX = dX / Rd, nZ = dZ / Rd, fT = side(CUT) + 0.008;
  let lean = 0.1;
  for (let da = -0.08; da <= 0.081; da += 0.04) for (let vy = -0.3; vy < 0.44; vy += 0.02) {
    const sq = Math.sqrt(1 - vy * vy), k = bump(Math.cos(la + da) * sq, vy, Math.sin(la + da) * sq), yy = yc + Math.min(CUT, vy * (1 + (k - 1) * 0.5)) * Hy;
    lean = Math.max(lean, ((side(vy) * k - fT) * Rd + 0.14) / (T - yy));
  }
  const lx = x + dX * fT, lz = z + dZ * fT; let yF = y;
  for (let q = 0; q < 2; q++) yF = W.height(lx + nX * lean * (T - yF), lz + nZ * lean * (T - yF));
  ladder(B, M, lx, lz, nX, nZ, yF, T, { lean });
  W.addBox(lx - nX * 0.75, lz - nZ * 0.75, 1.5, 1.3, -Math.atan2(nZ, nX), T - 0.4, T);                // firm ground where you step off the ladder
  for (let i = 0; i < 11; i++) {                             // round the foot, but not where the ladder stands: fallen rocks and tussocks
    const a = la + 0.6 + i * (Math.PI * 2 - 1.2) / 10 + (hsh(i, 90) - 0.5) * 0.3, stone = i % 3 !== 1, sc = stone ? 0.7 + hsh(i, 91) * hsh(i, 92) * 2.6 : 1.1 + hsh(i, 93) * 0.8, rr = 1.03 + hsh(i, 94) * 0.2;
    const bx = x + Math.cos(a) * rx * rr, bz = z + Math.sin(a) * rz * rr, by = W.height(bx, bz);
    B.geo(stone ? M.rock : M.ground, rockGeo(i + 6, stone ? 1 : 2), [bx, by + sc * (stone ? 0.3 : 0.05), bz], [stone ? hsh(i, 95) * 0.5 : 0, i * 2.3, 0], [sc * (stone ? 1 : 1.5), sc * (stone ? 0.8 + hsh(i, 96) * 0.4 : 0.38), sc * (stone ? 0.8 + hsh(i, 97) * 0.5 : 1.4)], stone ? rock[i % rock.length] : c.copy(cg).lerp(cg2, hsh(i, 98)).getHex());
    if (stone && sc > 1.2) W.addCyl(bx, bz, sc * 0.75, by - 1, by + sc * 0.8);
  }
  for (let i = 0; i < 3; i++) {                              // a few stones on top to crouch behind
    const a = la + Math.PI * (0.5 + i * 0.5), bx = x + Math.cos(a) * px * 0.72, bz = z + Math.sin(a) * pz * 0.72, sc = 0.8 + (i % 2) * 0.35;      // never where the ladder arrives
    B.geo(M.rock, rockGeo(i + 4, 1), [bx, T + sc * 0.3, bz], [0, i * 1.9, 0], [sc * 1.1, sc * 0.95, sc * 0.8], rock[i % rock.length]); W.addBox(bx, bz, sc * 1.7, sc * 1.2, -i * 1.9, T - 0.2, T + sc * 0.95);
  }
  if (o.cross) {                                             // a summit cross of dark iron, set in a rough stone at the rim, a few steps from where the ladder arrives
    const a = la - 0.6, bx = x + Math.cos(a) * px * 0.8, bz = z + Math.sin(a) * pz * 0.8, ry = -a, IR = 0x34302c, Hc = 3.5, ya = T + 0.35 + Hc * 0.7;
    B.geo(M.rock, rockGeo(9, 1), [bx, T + 0.2, bz], [0, a, 0], [0.75, 0.5, 0.62], rock[2]); W.addCyl(bx, bz, 0.5, T - 0.2, T + 0.5); W.addCyl(bx, bz, 0.12, T, T + 0.35 + Hc);
    B.box(M.metal, 0.09, Hc, 0.11, bx, T + 0.35, bz, { ry, c: IR }); B.box(M.metal, 0.09, 0.11, 1.7, bx, ya, bz, { ry, c: IR });
    B.box(M.metal, 0.07, 0.1, 0.25, bx, T + 0.35 + Hc, bz, { ry, c: IR });                                                  // the ends flare, as hammered iron does
    for (const sd of [-1, 1]) B.box(M.metal, 0.07, 0.25, 0.1, bx - Math.sin(a) * sd * 0.9, ya - 0.07, bz + Math.cos(a) * sd * 0.9, { ry, c: IR });
  }
  return { top: T };
}

// ---------------------------------------------------------------------------
// Furniture, stores and people: what fills the insides of buildings and the life around them.
// In all of these (x, z) is the centre, y the floor under it (inside a `room` the floor lies 0.06 above the room's y),
// ry the turn, and "local +Z" the front. Sizes are in metres.

/** Local frame of a thing standing at (x, z) and turned by ry: P(lx, lz) -> [worldX, worldZ]. The same frame as `room`. */
export const local = (x, z, ry = 0) => { const cs = Math.cos(ry), sn = Math.sin(ry); return (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs]; };

/** A table: a top on four legs. o: { w, d, h, c, top (colour of the top), solid (false = no collider) }. Returns the height of its top. */
export function table(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 1.6, d = 0.8, h = 0.78, c = 0x6a4a2e, solid = true } = o, P = local(x, z, ry);
  B.piece({ hp: 60, kind: 'wood', color: c, x, y, z, r: Math.hypot(w, d) / 2, top: y + h, sweep: { hw: w / 2, hd: d / 2, ry }, spot: 'top' });
  B.box(M.woodH, w, 0.07, d, x, y + h - 0.07, z, { ry, c: o.top ?? c });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = P(a * (w / 2 - 0.08), b * (d / 2 - 0.08)); B.box(M.wood, 0.08, h - 0.07, 0.08, px, y, pz, { ry, c }); }
  if (solid) B.world.addBox(x, z, w, d, ry, y, y + h);
  B.endPiece();
  return y + h;
}

/** A bench or a stool (w about 0.4). o: { w, d, h, c, back (height of a back rest, on the local -Z side) } */
export function bench(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 1.6, d = 0.36, h = 0.45, c = 0x6a4a2e, back = 0 } = o, P = local(x, z, ry);
  B.box(M.woodH, w, 0.06, d, x, y + h - 0.06, z, { ry, c });
  for (const a of w > 0.7 ? [-1, 1] : [0]) { const [px, pz] = P(a * (w / 2 - 0.12), 0); B.box(M.wood, w > 0.7 ? 0.07 : w * 0.6, h - 0.06, d - 0.08, px, y, pz, { ry, c }); }
  if (back) { const [px, pz] = P(0, -d / 2 + 0.03); B.box(M.woodH, w, back, 0.05, px, y + h, pz, { ry, c }); }
  B.world.addBox(x, z, w, d, ry, y, y + h);
}

/** A bed: frame, mattress, blanket and pillow; the head is on the local -Z side. o: { w, l, h, c, blanket, pillow, head (height of a headboard, 0 = none) } */
export function bed(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 0.95, l = 2.0, h = 0.45, c = 0x5a4028, blanket = 0x8a3a2a, pillow = 0xe6e0d0, head = 0.45 } = o, P = local(x, z, ry);
  B.box(M.woodH, w, h - 0.14, l, x, y, z, { ry, c }); B.box(M.cloth, w - 0.06, 0.14, l - 0.08, x, y + h - 0.14, z, { ry, c: 0xd8d0c0 });
  { const [px, pz] = P(0, l * 0.17); B.box(M.cloth, w - 0.02, 0.05, l * 0.62, px, y + h, pz, { ry, c: blanket }); }
  { const [px, pz] = P(0, -l / 2 + 0.26); B.box(M.cloth, w * 0.62, 0.1, 0.3, px, y + h, pz, { ry, c: pillow }); }
  if (head) { const [px, pz] = P(0, -l / 2 + 0.03); B.box(M.woodH, w, h + head, 0.06, px, y, pz, { ry, c }); }
  B.world.addBox(x, z, w, l, ry, y, y + h);
}

/** A chest with a lid and two iron bands. o: { w, h, d, c, band } */
export function chest(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 1.0, h = 0.6, d = 0.55, c = 0x5a4028, band = 0x2a2a2e } = o, P = local(x, z, ry);
  B.piece({ hp: 80, kind: 'wood', color: c, x, y, z, r: Math.hypot(w, d) / 2, top: y + h, sweep: { hw: w / 2, hd: d / 2, ry }, loot: 'chest', spot: 'top' });
  B.box(M.woodH, w, h * 0.7, d, x, y, z, { ry, c, solid: true }); B.box(M.woodH, w + 0.04, h * 0.3, d + 0.04, x, y + h * 0.7, z, { ry, c });
  for (const a of [-1, 1]) { const [px, pz] = P(a * w * 0.3, 0); B.box(M.metal, 0.06, h + 0.01, d + 0.06, px, y, pz, { ry, c: band }); }
  { const [px, pz] = P(0, d / 2 + 0.03); B.box(M.metal, 0.09, 0.12, 0.03, px, y + h * 0.58, pz, { ry, c: band }); }
  B.endPiece();
}

/** A cluster of jars or pots. o: { n, s (size: 1 = knee-high, 2.6 = a man-high store jar), c: [colours], spread, solid } */
export function pots(B, M, x, y, z, o = {}) {
  const { n = 4, s = 1, c = [0xb0683c, 0x9a5a34, 0xc07a48], spread = 0.5 * s + 0.15, solid = true } = o;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = i ? spread * (0.6 + (i % 3) * 0.25) : 0, k = s * (0.8 + (i % 3) * 0.2), px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, col = c[i % c.length];
    B.piece({ hp: 8 + 6 * k, kind: 'clay', color: col, x: px, y, z: pz, r: 0.2 * k, top: y + 0.55 * k });
    B.cyl(M.flat, 0.2 * k, 0.11 * k, 0.34 * k, px, y, pz, { c: col, seg: 9 }); B.cyl(M.flat, 0.09 * k, 0.2 * k, 0.16 * k, px, y + 0.34 * k, pz, { c: col, seg: 9 }); B.cyl(M.flat, 0.11 * k, 0.09 * k, 0.05 * k, px, y + 0.5 * k, pz, { c: col, seg: 9 });
    if (solid) B.world.addCyl(px, pz, 0.2 * k, y - 0.5, y + 0.55 * k);
    B.endPiece();
  }
}

/** A heap of sacks, two layers deep: the lower layer is a step, the upper one cover to crouch behind. o: { c, w (length of the heap) } */
export function sacks(B, M, x, y, z, ry = 0, o = {}) {
  const { c = 0xb8a47c, w = 1.8 } = o, P = local(x, z, ry), n = Math.max(2, Math.round(w / 0.6));
  B.piece({ hp: 110, kind: 'cloth', color: c, x, y, z, r: Math.hypot(w, 1.45) / 2, top: y + 0.78 });
  const sack = (lx, yy, lz, turn, col) => { const [px, pz] = P(lx, lz); B.geo(M.cloth, new THREE.CapsuleGeometry(0.21, 0.36, 3, 8), [px, yy + 0.19, pz], [Math.PI / 2, 0, -(ry + turn)], [1.2, 1, 0.82], col); };
  for (let i = 0; i < n; i++) { sack(-w / 2 + (i + 0.5) * w / n, y, -0.2, 0.08 * (i % 3 - 1), c); sack(-w / 2 + (i + 0.5) * w / n, y, 0.48, 0.1 * ((i + 1) % 3 - 1), i % 2 ? c : 0xa8946c); }
  for (let i = 0; i < n - 1; i++) sack(-w / 2 + (i + 1) * w / n, y + 0.36, -0.14, 0.12 * (i % 2 ? 1 : -1), i % 2 ? 0xa8946c : c);
  B.world.addBox(x, z, w, 1.45, ry, y - 0.3, y + 0.4); { const [px, pz] = P(0, -0.18); B.world.addBox(px, pz, w - 0.5, 0.75, ry, y, y + 0.78); }
  B.endPiece();
}

/** A rug or a mat on the floor (no collider). o: { w, d, c, border } */
export function rug(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 2, d = 1.3, c = 0x8a3a2a, border = 0x3a2a22 } = o;
  B.box(M.cloth, w, 0.02, d, x, y + 0.004, z, { ry, c: border }); B.box(M.cloth, w - 0.24, 0.02, d - 0.24, x, y + 0.012, z, { ry, c });
}

/** An open hearth: a ring of stones, logs, a flame. o: { r, stones (colour), pot (true = a cooking pot on a tripod) }. Returns the flame position [x, y, z] (for sparks or a light). */
export function hearth(B, M, x, y, z, o = {}) {
  const { r = 0.55, stones = 0x6a6a66 } = o;
  for (let i = 0; i < 8; i++) { const a = i * 0.785; B.geo(M.rock, rockGeo(i + 3, 0), [x + Math.cos(a) * r, y + 0.08, z + Math.sin(a) * r], [0, a, 0], [0.2, 0.14, 0.16], stones); }
  for (let i = 0; i < 3; i++) B.geo(M.wood, new THREE.CylinderGeometry(0.05, 0.06, r * 1.5, 6), [x, y + 0.08 + i * 0.03, z], [Math.PI / 2, 0, i * 1.05], 1, 0x2a1c14);
  B.geo(M.glow, new THREE.ConeGeometry(r * 0.34, r * 0.9, 6), [x, y + 0.14 + r * 0.45, z], [0, 0, 0], 1, 0xff7a20);
  if (o.pot) { for (let i = 0; i < 3; i++) B.cyl(M.metal, 0.02, 0.02, 1.25, x + Math.cos(i * 2.09) * r * 0.9, y, z + Math.sin(i * 2.09) * r * 0.9, { c: 0x2a2a2e, seg: 5, rz: Math.cos(i * 2.09) * 0.36, rx: Math.sin(i * 2.09) * -0.36 });
    B.cyl(M.metal, 0.24, 0.17, 0.26, x, y + 0.62, z, { c: 0x26262a, seg: 10 }); }
  B.world.addCyl(x, z, r + 0.1, y - 0.5, y + 0.3);
  return [x, y + 0.35, z];
}

/**
 * A wagon you can crawl under: its bed lies `clear` (default 1.2 m) above the ground, on four wheels; the wheels are thin colliders.
 * It runs along local Z (the shafts point to +Z). o: { w, l, clear, c, wheel, load: 'hay' | 'crates' | 'barrels' | null, shafts (false = none) }
 */
export function cart(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 1.7, l = 3.2, clear = 1.2, c = 0x6a4a2e, wheel = 0x3a2a1e, load = null, shafts = true } = o, P = local(x, z, ry), R = clear - 0.42, top = y + clear + 0.14;
  B.piece({ hp: 160, kind: 'wood', color: c, x, y, z, r: Math.hypot(w + 0.4, l) / 2, top });
  B.box(M.woodH, w, 0.14, l, x, y + clear, z, { ry, c, solid: true });
  for (const a of [-1, 1]) { const [px, pz] = P(a * (w / 2 - 0.04), 0); B.box(M.wood, 0.07, 0.42, l, px, top, pz, { ry, c, solid: true }); }
  for (const b of [-1, 1]) { const [px, pz] = P(0, b * (l / 2 - 0.04)); B.box(M.wood, w, 0.42, 0.07, px, top, pz, { ry, c, solid: b < 0 }); }
  for (const b of [-1, 1]) { const [ax, az] = P(0, b * (l / 2 - 0.75)); B.geo(M.wood, new THREE.CylinderGeometry(0.06, 0.06, w + 0.5, 6), [ax, y + R, az], [Math.PI / 2, 0, -(ry + Math.PI / 2)], 1, wheel); B.box(M.wood, w * 0.7, clear - R - 0.02, 0.16, ax, y + R, az, { ry, c: wheel });
    for (const a of [-1, 1]) { const [px, pz] = P(a * (w / 2 + 0.16), b * (l / 2 - 0.75)); B.geo(M.wood, new THREE.CylinderGeometry(R, R, 0.1, 14), [px, y + R, pz], [Math.PI / 2, 0, -(ry + Math.PI / 2)], 1, wheel);
      B.geo(M.metal, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 8), [px, y + R, pz], [Math.PI / 2, 0, -(ry + Math.PI / 2)], 1, 0x2a2a2e); B.world.addBox(px, pz, 0.14, R * 1.7, ry, y - 0.5, y + R * 2); } }
  if (shafts) for (const a of [-1, 1]) { const [px, pz] = P(a * 0.45, l / 2 + 1.0); B.geo(M.wood, new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), [px, y + clear * 0.62, pz], [Math.PI / 2 + 0.36, 0, -ry], 1, wheel); }
  if (load === 'hay') { B.geo(M.thatch, new THREE.SphereGeometry(1, 10, 6), [x, top + 0.2, z], [0, ry, 0], [w * 0.52, 0.75, l * 0.5], 0xc8a850); B.world.addBox(x, z, w - 0.2, l - 0.2, ry, top, top + 0.8); }
  if (load === 'crates') for (const [lx, lz, sz] of [[-0.35, -0.8, 0.8], [0.4, -0.75, 0.7], [0, 0.2, 0.9], [-0.3, 1.0, 0.6]]) { const [px, pz] = P(lx, lz); crate(B, M, px, top, pz, sz, ry + lx); }
  if (load === 'barrels') for (const [lx, lz] of [[-0.4, -0.9], [0.4, -0.9], [-0.4, 0], [0.4, 0], [0, 0.9]]) { const [px, pz] = P(lx, lz); barrel(B, M, px, top, pz); }
  B.endPiece();
  return { top };
}

/**
 * A raised wooden floor on posts, open underneath: a porch, a pier, a loft, a scaffold, a fighting step behind a wall. With h = 1.3 the player can
 * crouch under it; enemies cannot. o: { w, d, h, c, post, mat, rails: 'nsew' (sides that get a rail 1 m high), rail (its height),
 * ladder: 'n'|'s'|'e'|'w' (a ladder on that side: the player only), steps: 'n'|'s'|'e'|'w' (a flight of stairs on that side: enemies can follow),
 * at (where along that side the ladder or stairs stand, default the middle), stepW (width of the stairs) }. Returns P (the local frame) with P.top.
 */
export function deck(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 4, d = 3, h = 1.3, c = 0x7a5a3a, post = 0x5a4028, mat = M.woodH, rails = '', rail = 1.0, at = 0, stepW = 1.6 } = o, P = local(x, z, ry), cs = Math.cos(ry), sn = Math.sin(ry);
  B.box(mat, w, 0.16, d, x, y + h - 0.16, z, { ry, c, solid: true });
  const nx = Math.max(2, Math.round(w / 2.6) + 1), nz = Math.max(2, Math.round(d / 2.6) + 1);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1) continue;
    const [px, pz] = P(-w / 2 + 0.12 + i * (w - 0.24) / (nx - 1), -d / 2 + 0.12 + j * (d - 0.24) / (nz - 1)); B.box(M.wood, 0.16, h + 0.3, 0.16, px, y - 0.3, pz, { ry, c: post }); B.world.addCyl(px, pz, 0.1, y - 1, y + h - 0.16); }
  const side = { s: [0, d / 2, w, sn, cs, ry], n: [0, -d / 2, w, -sn, -cs, ry + Math.PI], e: [w / 2, 0, d, cs, -sn, ry + Math.PI / 2], w: [-w / 2, 0, d, -cs, sn, ry - Math.PI / 2] };
  for (const k of rails) { const [lx, lz, len] = side[k], ns = k === 'n' || k === 's', [px, pz] = P(lx * (1 - 0.06 / (w / 2 || 1)), lz * (1 - 0.06 / (d / 2 || 1)));
    B.box(M.woodH, ns ? len : 0.08, 0.08, ns ? 0.08 : len, px, y + h + rail - 0.08, pz, { ry, c: post }); B.box(M.woodH, ns ? len : 0.06, 0.06, ns ? 0.06 : len, px, y + h + rail * 0.5, pz, { ry, c: post });
    for (let i = 0; i <= Math.round(len / 1.3); i++) { const t = -len / 2 + 0.05 + i * (len - 0.1) / Math.round(len / 1.3), [qx, qz] = ns ? P(t, lz * (1 - 0.06 / (d / 2))) : P(lx * (1 - 0.06 / (w / 2)), t); B.box(M.wood, 0.08, rail, 0.08, qx, y + h, qz, { ry, c: post }); }
    B.world.addBox(px, pz, ns ? len : 0.12, ns ? 0.12 : len, ry, y + h, y + h + rail); }
  const edge = (k) => { const [lx, lz, , ex, ez, sry] = side[k], ns = k === 'n' || k === 's', [px, pz] = ns ? P(at, lz) : P(lx, at); return [px, pz, ex, ez, sry]; };
  if (o.ladder) { const [px, pz, ex, ez] = edge(o.ladder); ladder(B, M, px, pz, ex, ez, y, y + h, { c: post }); }
  if (o.steps) { const [px, pz, , , sry] = edge(o.steps), n = Math.ceil(h / 0.32); steps(B, M, px, pz, sry, y + h, n, { w: stepW, rise: h / n, run: 0.42, mat: M.woodH, c }); }
  P.top = y + h;
  return P;
}

/** A market stall: a counter under a cloth roof on four poles, goods on the counter; behind the counter there is room to hide. o: { w, d, h, c, cloth, cloth2, goods: [colours] | false } */
export function stall(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 3, d = 2.2, h = 2.3, c = 0x6a4a2e, cloth = 0xb83a2a, cloth2 = 0xe6dcc0, goods = [0xb83a2a, 0xd8b23a, 0x5a8a3a, 0xc86a2a, 0x8a5a8a] } = o, P = local(x, z, ry), n = Math.max(2, Math.round(w / 0.5));
  { const [cx, cz] = P(0, d / 2 - 0.3);                   // the counter: where something can be laid
    B.piece({ hp: 130, kind: 'wood', color: c, x, y, z, r: Math.hypot(w, d) / 2, top: y + h, sweep: { hw: w / 2 + 0.2, hd: d / 2 + 0.3, ry, y0: 0.85, y1: 1.5 }, spot: { x: cx, y: y + 0.9, z: cz, hw: w / 2 - 0.3, hd: 0.15, ry } }); }
  { const [px, pz] = P(0, d / 2 - 0.3); B.box(M.woodH, w, 0.9, 0.6, px, y, pz, { ry, c, solid: true }); }
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = P(a * (w / 2 - 0.06), b * (d / 2 - 0.06)); B.box(M.wood, 0.1, h, 0.1, px, y, pz, { ry, c }); B.world.addCyl(px, pz, 0.08, y - 0.5, y + h); }
  for (let i = 0; i < n; i++) { const [px, pz] = P(-w / 2 - 0.15 + (i + 0.5) * (w + 0.3) / n, 0); B.box(M.cloth, (w + 0.3) / n, 0.04, d + 0.5, px, y + h, pz, { ry, c: i % 2 ? cloth2 : cloth }); }
  { const [px, pz] = P(0, d / 2 + 0.24); B.box(M.cloth, w + 0.3, 0.3, 0.03, px, y + h - 0.3, pz, { ry, c: cloth }); }
  if (goods) for (let i = 0; i < Math.floor(w / 0.42); i++) { const [px, pz] = P(-w / 2 + 0.3 + i * 0.42, d / 2 - 0.3 + (i % 2 ? 0.1 : -0.08)), col = goods[i % goods.length];
    if (i % 3 === 0) B.box(M.flat, 0.3, 0.14, 0.3, px, y + 0.9, pz, { ry: ry + i, c: col }); else if (i % 3 === 1) B.geo(M.flat, new THREE.SphereGeometry(0.13, 7, 5), [px, y + 1.0, pz], [0, 0, 0], [1, 0.8, 1], col); else B.cyl(M.flat, 0.1, 0.13, 0.24, px, y + 0.9, pz, { c: col, seg: 8 }); }
  B.endPiece();
}

/** A low passage that can only be crawled through: two walls and a roof, open at both ends, running along local Z. Its roof can be walked on. o: { len, w, h (clear height, 1.2), t, mat, c, top (thickness of the roof) } */
export function crawlway(B, M, x, y, z, ry = 0, o = {}) {
  const { len = 4, w = 1.3, h = 1.2, t = 0.3, mat = M.stone, c = 0x8a8478, top = 0.3 } = o, P = local(x, z, ry);
  for (const a of [-1, 1]) { const [px, pz] = P(a * (w / 2 + t / 2), 0); B.box(mat, t, h + 0.5, len, px, y - 0.5, pz, { ry, c, solid: true }); }
  B.box(mat, w + 2 * t, top, len, x, y + h, z, { ry, c, solid: true });
}

/** A stack of firewood or timber: cover as high as h, logs lying along local Z. o: { w, h, d, c } */
export function woodpile(B, M, x, y, z, ry = 0, o = {}) {
  const { w = 2.4, h = 1.1, d = 0.9, c = 0x7a5a3a } = o, P = local(x, z, ry), r = 0.13, cols = Math.max(2, Math.floor(w / (r * 2))), rows = Math.max(1, Math.floor(h / (r * 1.75)));
  B.piece({ hp: 150, kind: 'wood', color: c, x, y, z, r: Math.hypot(w, d) / 2, top: y + rows * r * 1.75 });
  for (let k = 0; k < rows; k++) for (let i = 0; i < cols - (k % 2); i++) { const [px, pz] = P(-w / 2 + r + (i + (k % 2) * 0.5) * (w - 2 * r) / (cols - 1), 0);
    B.geo(M.wood, new THREE.CylinderGeometry(r, r, d, 6), [px, y + r + k * r * 1.75, pz], [Math.PI / 2, 0, -ry], 1, (i + k) % 3 ? c : 0x8a6a48); }
  for (const a of [-1, 1]) { const [px, pz] = P(a * (w / 2 + 0.05), 0); B.box(M.wood, 0.1, h + 0.2, 0.1, px, y, pz, { ry, c: 0x4a3420 }); }
  B.world.addBox(x, z, w + 0.1, d, ry, y - 0.3, y + rows * r * 1.75 + 0.05);
  B.endPiece();
}

/** A haystack. o: { r, h, c } */
export function haystack(B, M, x, y, z, o = {}) {
  const { r = 1.5, h = 2.3, c = 0xc8a850 } = o;
  B.piece({ hp: 70, kind: 'straw', color: c, x, y, z, r, top: y + h });
  B.cyl(M.thatch, r * 0.86, r, h * 0.45, x, y - 0.1, z, { c, seg: 12 }); B.geo(M.thatch, new THREE.ConeGeometry(r * 0.92, h * 0.65, 12), [x, y + h * 0.45 - 0.1 + h * 0.325, z], [0, 0, 0], 1, c);
  B.world.addCyl(x, z, r * 0.88, y - 1, y + h * 0.8);
  B.endPiece();
}

const POSES = {
  stand: () => {},
  talk: (f) => { f.armR.rotation.x = -1.1; f.armR.rotation.z = 0.3; f.armL.rotation.x = -0.25; },
  point: (f) => { f.armR.rotation.x = -1.5; f.armL.rotation.x = 0.1; },
  carry: (f) => { f.armR.rotation.x = -1.2; f.armL.rotation.x = -1.2; f.armR.rotation.z = 0.25; f.armL.rotation.z = -0.25; },
  work: (f) => { f.hips.rotation.x = 0.5; f.armR.rotation.x = -0.9; f.armL.rotation.x = -0.6; },
  pray: (f) => { f.hips.rotation.x = 0.16; f.armR.rotation.x = -1.3; f.armL.rotation.x = -1.3; f.armR.rotation.z = 0.5; f.armL.rotation.z = -0.5; },
  cheer: (f) => { f.armR.rotation.x = -2.8; f.armL.rotation.x = -2.8; f.armR.rotation.z = -0.3; f.armL.rotation.z = 0.3; },
  hips: (f) => { f.armR.rotation.z = -0.5; f.armL.rotation.z = 0.5; f.armR.rotation.x = 0.2; f.armL.rotation.x = 0.2; },
};

/**
 * Somebody who takes no part in the fight. look = a name known to `lookFor` in actors.js (for instance 'westWoman', 'norseWoman', 'monk').
 * o: { pose: 'stand' | 'talk' | 'point' | 'carry' | 'work' | 'pray' | 'cheer' | 'hips' | 'sit' | 'lie', or a function (f) => {...} that turns the joints
 *      (f.hips, f.armL, f.armR, f.legL, f.legR; negative rotation.x lifts a limb forward, positive hips.rotation.x bows),
 *      seat: height of what the figure sits or lies on (pose 'sit': 0 = on the ground, 0.45 = a bench; pose 'lie': the top of the bed),
 *      over: { ... } changes to the look (colours, hat: null, weapon: null ...), rand: a random function (default: the same sequence every time),
 *      solid: false = no collider, arms: [xR, xL] quick override of the two arm angles }
 * Returns the figure (f.group is the THREE.Group). Pass the figures of a level to `idle` in its update() so that they breathe and look about.
 */
let _pq = 0.17;
export function person(B, M, root, look, x, y, z, yaw = 0, o = {}) {
  const rq = o.rand || (() => (_pq = (_pq + 0.381966) % 1));
  const spec = { ...lookFor(look, rq), weapon: null, weapon2: null, ...o.over }, f = makeHumanoid(M, spec), s = f.scale || 1, pose = o.pose || 'stand', seat = o.seat ?? 0;
  f.group.position.set(x, y, z); f.group.rotation.y = yaw;
  if (pose === 'sit') {                     // thighs level on the seat, shins hanging from the knees down to the floor
    const up = seat + 0.1;
    if (seat > 0.2) { f.group.position.y = y + up - 0.92 * s; f.legL.rotation.x = -1.45; f.legR.rotation.x = -1.37; f.shinL.rotation.x = 1.45; f.shinR.rotation.x = 1.3; }
    else { const a = Math.acos(Math.min(1, up / (0.92 * s))); f.group.position.y = y + up - 0.92 * s; f.legL.rotation.x = -a; f.legR.rotation.x = -a + 0.08; }
    f.armR.rotation.x = -0.5; f.armL.rotation.x = -0.45;
  }
  else if (pose === 'lie') { f.group.rotation.x = -Math.PI / 2; f.group.position.y = y + seat + 0.13; }
  else if (typeof pose === 'function') pose(f); else (POSES[pose] || POSES.stand)(f);
  if (o.arms) { f.armR.rotation.x = o.arms[0]; f.armL.rotation.x = o.arms[1]; }
  if ((spec.extras || []).some((e) => e === 'dress' || e === 'robe' || e === 'kosode' || e === 'chuba' || e === 'hakama') && f.hips.rotation.x > 0.24) f.hips.rotation.x = 0.24;   // a long skirt is one piece with the body: bowing deeply would swing it up
  root.add(f.group);
  const cyl = o.solid !== false && pose !== 'lie' ? B.world.addCyl(x, z, 0.36, y - 1, y + (pose === 'sit' ? seat + 1.0 : 1.8)) : null;
  f.base = { hy: f.hips.rotation.y, hz: f.hips.rotation.z, ar: f.armR.rotation.x, al: f.armL.rotation.x, ph: rq() * 20, still: pose === 'lie' };
  if (pose !== 'lie') {                     // every bystander is known to the world: they take fright, look at the player, can be hurt (see crowd.js)
    const who = { f, x, y, z, yaw, sit: pose === 'sit', cyl };
    if (cyl) cyl.person = who;
    (B.world.people || (B.world.people = [])).push(who);
  }
  return f;
}

/** Let bystanders breathe, shift their weight and look about. Call it from the level's update(dt, t, g) with the list of figures made by `person`. */
export function idle(people, t) {
  for (const f of people) { const b = f.base; if (!b || b.still || f.busy) continue;     // busy: frightened, talking to the player, or dead (crowd.js moves it)
    f.hips.rotation.y = b.hy + Math.sin(t * 0.37 + b.ph) * 0.22 + Math.sin(t * 0.9 + b.ph * 2) * 0.05; f.hips.rotation.z = b.hz + Math.sin(t * 0.6 + b.ph) * 0.02;
    f.armR.rotation.x = b.ar + Math.sin(t * 0.8 + b.ph) * 0.05; f.armL.rotation.x = b.al + Math.sin(t * 0.7 + b.ph * 1.3) * 0.05; }
}

// The size of a chapter's map, chosen on the hero screen (and by the host in a game for two):
//  - small: only the heart of the chapter, from where the hero comes in to where the boss stands; the edge is roped off;
//  - medium: the chapter as it was made;
//  - large: half as wide again, with outskirts round it: hamlets of the chapter's own kind (houses one can walk into, furniture,
//    yards, fences, trees), their people at work, horses, smoke from the chimneys, and more enemies among them.
// Everything here is worked out from the chapter alone (its own random numbers, not the game's), so both browsers of a game for two
// build the same outskirts.
import * as THREE from 'three';
import * as K from './props.js';
import { Heightfield } from './build.js';
import { TYPES } from './actors.js';
import { rng } from './util.js';
import { hamletName } from './places.js';

/** How each chapter builds: walls, roofs, the people, the trees, what stands in a yard. */
const STYLE = {
  west: { wall: 'wood', wc: [0x9a7a58, 0x8a6a4a, 0xb09070], roof: 'shingle', rc: [0x6a5040, 0x5a4434], pitch: 0.35, folk: ['westMan', 'westWoman'], tree: 'cactus', yard: ['barrel', 'crate', 'cart', 'haystack', 'woodpile'], horse: 0x6a4428, chimney: true },
  japan: { wall: 'plaster', wc: [0xe8e0cc, 0xd8ccb0], roof: 'kawara', rc: [0x4a4a52, 0x3a3a42], pitch: 0.5, folk: ['japanMan', 'japanWoman'], tree: 'blob', leaf: [0x4a6a2a, 0x5a7a34, 0x3a5a22], yard: ['pots', 'sacks', 'woodpile', 'crate'] },
  swiss: { boats: { len: 7, wide: 1.1, mast: false, hull: 0x5a4030 }, wall: 'wood', wc: [0x7a4a2a, 0x8a5a34], roof: 'shingle', rc: [0x5a4a3a, 0x6a5a48], pitch: 0.6, folk: ['swissMan', 'swissWoman'], tree: 'pine', yard: ['woodpile', 'haystack', 'cart', 'barrel'], horse: 0x7a5434, chimney: true },
  greece: { boats: { len: 15, sail: 0xe8dcc0, hull: 0x3a2a1c }, wall: 'plaster', wc: [0xf2ede0, 0xe8e2d0], roof: 'flat', rc: [0xd8d0bc], folk: ['greekMan', 'greekWoman'], tree: 'blob', leaf: [0x6a7a4a, 0x7a8a5a, 0x5a6a3a], yard: ['pots', 'sacks', 'pots'] },
  north: { boats: { len: 15, viking: true, sail: 0x8a1c1c, hull: 0x3a2a1c, shields: [0x8a1c1c, 0xe8e0d0] }, wall: 'wood', wc: [0x6a4a30, 0x5a4028], roof: 'thatch', rc: [0x6a7a3a, 0x7a6a3a], pitch: 0.65, folk: ['norseMan', 'norseWoman'], tree: 'pine', yard: ['woodpile', 'barrel', 'sacks', 'crate'], chimney: true },
  war: { wall: 'stone', wc: [0xb8ac98, 0xa89c88], roof: 'kawara', rc: [0x8a4a3a, 0x7a3e30], pitch: 0.5, folk: ['frenchMan', 'frenchWoman'], tree: 'blob', leaf: [0x3a5a2a, 0x4a6a30, 0x2e4a22], yard: ['haystack', 'cart', 'barrel', 'woodpile'], horse: 0x5a3a22, chimney: true },
  russia: { wall: 'wood', wc: [0x6a4a2e, 0x7a5a3a], roof: 'shingle', rc: [0x4a5a4a, 0x5a4a3a], pitch: 0.5, folk: ['russianMan', 'russianWoman'], tree: 'pine', yard: ['woodpile', 'barrel', 'crate', 'sacks'], chimney: true },
  tibet: { wall: 'plaster', wc: [0xe8e2d4, 0xd8d0c0], trim: 0x7a2a22, roof: 'flat', rc: [0x5a3a2a], folk: ['tibetMan', 'tibetWoman', 'nepalWoman'], tree: 'none', yard: ['sacks', 'woodpile', 'pots'], chimney: true },
  aztec: { boats: { len: 6, wide: 0.8, mast: false, hull: 0x6a4a2a }, wall: 'plaster', wc: [0xd8c8a8, 0xc8b890], roof: 'thatch', rc: [0xb89a58, 0xa88a48], pitch: 0.6, folk: ['mexicaMan', 'mexicaWoman'], tree: 'cactus', yard: ['pots', 'sacks', 'pots'] },
};
const WALL = { wood: 'wood', plaster: 'plaster', stone: 'stone' }, ROOF = { shingle: 'shingle', kawara: 'kawara', thatch: 'thatch' };

/** The bounds as a rectangle (a round map is boxed by its circle). */
const rectOf = (b) => (b.r ? { x0: (b.x || 0) - b.r, x1: (b.x || 0) + b.r, z0: (b.z || 0) - b.r, z1: (b.z || 0) + b.r } : b);
/** Is (x, z) inside bounds b, m metres in from the edge? */
const inside = (b, x, z, m = 0) => (b.r ? Math.hypot(x - (b.x || 0), z - (b.z || 0)) < b.r - m : x > b.x0 + m && x < b.x1 - m && z > b.z0 + m && z < b.z1 - m);

/**
 * Change the chapter to the size wanted, after it is built and before its meshes are merged. Returns what the game needs to keep
 * going (the chimneys that smoke), or null for a chapter as it was made.
 */
export function resize(ctx, size) {
  const { world: W, level: L } = ctx;
  if (!W.bounds || (size !== 'small' && size !== 'large')) return null;
  return size === 'small' ? shrink(ctx) : grow(ctx);
}

// ---- small -------------------------------------------------------------------------------------------------------------------
function shrink({ world: W, level: L, B, M }) {
  const b = W.bounds, S = L.spawn, boss = L.enemies.find(([t]) => TYPES[t].boss);
  const bx = boss ? boss[1] : S.x, bz = boss ? boss[2] : S.z, cx = (S.x + bx) / 2, cz = (S.z + bz) / 2;
  if (b.r) {
    const need = Math.max(Math.hypot(S.x - cx, S.z - cz), Math.hypot(bx - cx, bz - cz)) + 16;
    W.bounds = { r: Math.min(b.r, Math.max(b.r * 0.6, need)), x: cx, z: cz };
  } else {
    const hx = (b.x1 - b.x0) * 0.3, hz = (b.z1 - b.z0) * 0.3, m = 14;
    W.bounds = {
      x0: Math.max(b.x0, Math.min(cx - hx, Math.min(S.x, bx) - m)), x1: Math.min(b.x1, Math.max(cx + hx, Math.max(S.x, bx) + m)),
      z0: Math.max(b.z0, Math.min(cz - hz, Math.min(S.z, bz) - m)), z1: Math.min(b.z1, Math.max(cz + hz, Math.max(S.z, bz) + m)),
    };
  }
  L.enemies = L.enemies.filter(([t, x, z]) => TYPES[t].boss || inside(W.bounds, x, z, 1.5));     // those who stood outside are not there
  rope(W, B, M, b);
  return { small: true };
}

/** The edge of a small map: posts and a rope with little flags, wherever one could walk up to it. */
function rope(W, B, M, old) {
  const nb = W.bounds, pts = [];
  if (nb.r) { const n = Math.ceil(nb.r * 6.283 / 3); for (let i = 0; i <= n; i++) { const a = i / n * 6.283; pts.push([[(nb.x || 0) + Math.cos(a) * nb.r, (nb.z || 0) + Math.sin(a) * nb.r]]); } }
  else for (const [ax, az, bx2, bz2] of [[nb.x0, nb.z0, nb.x1, nb.z0], [nb.x1, nb.z0, nb.x1, nb.z1], [nb.x1, nb.z1, nb.x0, nb.z1], [nb.x0, nb.z1, nb.x0, nb.z0]]) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx2 - ax, bz2 - az) / 3)); const side = [];
    for (let i = 0; i <= n; i++) side.push([ax + (bx2 - ax) * i / n, az + (bz2 - az) * i / n]);
    pts.push(side);
  }
  const line = nb.r ? [pts.map((p) => p[0])] : pts;
  const ok = ([x, z]) => {
    if (!inside(old, x, z, -0.5)) return null;                      // the old edge is an edge already
    const g = W.height(x, z); if (g < W.waterY + 0.05) return null;
    const y = W.groundAt(x, z, g + 0.3); if (y - g > 0.4) return null;        // on a floor, a deck, a roof: leave it
    if (W.inBox(x, z, y, 1.2)) return null;                          // in a wall
    const q = { x, y, z }; W.collide(q, 0.12, 1.2); if (Math.abs(q.x - x) + Math.abs(q.z - z) > 0.01) return null;   // in a rock, a tree
    return y;
  };
  let flagI = 0;
  for (const side of line) {
    let prev = null;
    for (const p of side) {
      const y = ok(p);
      if (y === null) { prev = null; continue; }
      B.cyl(M.wood, 0.05, 0.06, 1.15, p[0], y - 0.1, p[1], { c: 0x6a4a2e, seg: 6 });
      if (prev) {
        K.rod(B, M.flat, [prev[0], prev[1] + 0.95, prev[2]], [p[0], y + 0.95, p[1]], 0.018, 0xd8c8a0, 0.018, 4);
        for (const k of [0.5]) {                                    // red and white flags on the rope
          const fx = prev[0] + (p[0] - prev[0]) * k, fz = prev[2] + (p[1] - prev[2]) * k, fy = prev[1] + (y - prev[1]) * k + 0.93, a = Math.atan2(p[0] - prev[0], p[1] - prev[2]);
          B.geo(M.cloth, new THREE.ConeGeometry(0.09, 0.2, 3), [fx, fy - 0.1, fz], [Math.PI, a, 0], 1, flagI++ % 2 ? 0xe8e2d4 : 0xb82a22);
        }
      }
      prev = [p[0], y, p[1]];
    }
  }
}

// ---- large -------------------------------------------------------------------------------------------------------------------
function grow(ctx) {
  const { world: W, level: L, B, M, root, def, index } = ctx, st = STYLE[def.id] || STYLE.west, hf = Heightfield.last;
  const old = W.bounds, o = rectOf(old), lim = hf ? hf.size / 2 - 30 : 1e9;
  if (old.r) W.bounds = { r: Math.min(old.r * 1.45, lim - Math.hypot(old.x || 0, old.z || 0)), x: old.x || 0, z: old.z || 0 };
  else {
    const cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2, hx = (o.x1 - o.x0) * 0.75, hz = (o.z1 - o.z0) * 0.75;
    W.bounds = { x0: Math.max(-lim, cx - hx), x1: Math.min(lim, cx + hx), z0: Math.max(-lim, cz - hz), z1: Math.min(lim, cz + hz) };
  }
  const nb = W.bounds, R = rng(7919 + index * 104729), rr = rectOf(nb);
  // where a hamlet can stand: in the new ground round the old, on dry, gentle land, clear of what is there already
  const sites = [], why = { ring: 0, near: 0, water: 0, steep: 0, busy: 0 };
  for (let i = 0; i < 3000 && sites.length < 9; i++) {
    const x = rr.x0 + R() * (rr.x1 - rr.x0), z = rr.z0 + R() * (rr.z1 - rr.z0);
    if (!inside(nb, x, z, 16) || inside(old, x, z, -12)) { why.ring++; continue; }
    if (sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 46 * 46)) { why.near++; continue; }
    const y = W.height(x, z); if (y < W.waterY + 0.8) { why.water++; continue; }
    let lo = y, hi = y, wet = false;
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, h = W.height(x + Math.cos(a) * 11, z + Math.sin(a) * 11); lo = Math.min(lo, h); hi = Math.max(hi, h); if (h < W.waterY + 0.4) wet = true; }
    if (wet) { why.water++; continue; }
    if (hi - lo > 16) { why.steep++; continue; }
    if (crowded(W, x, z, hi - lo > 4.5 ? 19 : 14)) { why.busy++; continue; }
    if (hi - lo > 4.5) {                                            // on a hillside: the ground is levelled for it first
      if (!hf || !terrace(root, hf, x, z, (lo + hi) / 2, 17, 27)) { why.steep++; continue; }
      sites.push({ x, y: W.height(x, z), z, cut: true });
    } else sites.push({ x, y, z });
  }
  // where the new ground is mostly water: boats at anchor, with their crews
  const boats = [];
  if (st.boats && sites.length < 3 && isFinite(W.waterY)) for (let i = 0; i < 600 && boats.length < 4; i++) {
    const x = rr.x0 + R() * (rr.x1 - rr.x0), z = rr.z0 + R() * (rr.z1 - rr.z0);
    if (!inside(nb, x, z, 10) || inside(old, x, z, -14) || boats.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < 40 * 40)) continue;
    let dry = false; for (let k = 0; k < 8 && !dry; k++) { const a = k / 8 * 6.283; for (const r of [0, 5, 10]) if (W.height(x + Math.cos(a) * r, z + Math.sin(a) * r) > W.waterY - 1.2) dry = true; }
    if (dry || crowded(W, x, z, 12)) continue;
    boats.push({ x, z, ry: R() * 6.283 });
  }
  const out = { chimneys: [], large: true, hamlets: sites.length, why }, trees = [], horses = [];
  const kinds = foeKinds(L.enemies);
  out.places = []; const used = new Set();
  for (const s of sites) { hamlet(ctx, st, s, R, out, trees, horses, kinds); out.places.push([hamletName(def.id, R, used), s.x, s.z, 16]); }
  for (const b of boats) {
    const y = W.waterY + 0.25; K.ship(B, M, b.x, y, b.z, b.ry, st.boats);
    const crew = st.boats.len > 10 ? 2 : 1, c = Math.cos(b.ry), sn = Math.sin(b.ry);
    for (let k = 0; k < crew; k++) { const lz = (k ? -1 : 1) * st.boats.len * 0.22; K.person(B, M, root, st.folk[k % st.folk.length].replace('Woman', 'Man'), b.x + lz * sn, y + (st.boats.len > 10 ? 1.09 : 0.4), b.z + lz * c, R() * 6.283, { pose: k ? 'work' : 'stand', rand: R, solid: false, stay: true }); }
  }
  out.boats = boats.length;
  // trees and stones over the new ground
  for (let i = 0; i < 260 && st.tree !== 'none'; i++) {
    const x = rr.x0 + R() * (rr.x1 - rr.x0), z = rr.z0 + R() * (rr.z1 - rr.z0);
    if (!inside(nb, x, z, 2) || inside(old, x, z, -4)) continue;
    const y = W.height(x, z); if (y < W.waterY + 0.3 || crowded(W, x, z, 3) || sites.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 18 * 18)) continue;
    if (R() < 0.45) trees.push({ x, y, z, ry: R() * 6.28, s: 0.8 + R() * 0.5 });
  }
  plant(W, root, M, st, trees, index);
  return out;
}

/**
 * Level the ground at (x, z) to height y: flat within r0 metres, blending into the hillside by r1. The heightfield and its mesh both
 * change. Returns false if the mesh of the ground cannot be found.
 */
function terrace(root, hf, x, z, y, r0, r1) {
  const n = hf.n, half = hf.size / 2, c = hf.cell, mesh = root.children.find((o) => o.isMesh && o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count === n * n);
  if (!mesh) return false;
  const pos = mesh.geometry.attributes.position, i0 = Math.max(0, Math.floor((x - r1 + half) / c)), i1 = Math.min(n - 1, Math.ceil((x + r1 + half) / c)), j0 = Math.max(0, Math.floor((z - r1 + half) / c)), j1 = Math.min(n - 1, Math.ceil((z + r1 + half) / c));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const vx = -half + i * c, vz = -half + j * c, d = Math.hypot(vx - x, vz - z); if (d >= r1) continue;
    const t = d <= r0 ? 1 : 1 - (d - r0) / (r1 - r0), k = t * t * (3 - 2 * t), q = j * n + i;
    hf.data[q] = hf.data[q] * (1 - k) + y * k; pos.setY(q, hf.data[q]);
  }
  pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
  return true;
}

/** Is there anything solid near (x, z)? */
function crowded(W, x, z, r) {
  for (const b of W.boxes) if (Math.abs(b.x - x) < r + (b.r || 1) && Math.abs(b.z - z) < r + (b.r || 1)) return true;
  for (const c of W.cyls) if (Math.hypot(c.x - x, c.z - z) < r + c.r) return true;
  return false;
}
/** The chapter's ordinary enemies, as many times as each comes (no boss, nobody fixed on a perch or in ambush). */
function foeKinds(list) {
  const out = [];
  for (const [t, , , o] of list) if (!TYPES[t].boss && !TYPES[t].rider && !(o && (o.static || o.ambush))) out.push(t);
  return out.length ? out : list.filter(([t]) => !TYPES[t].boss).map(([t]) => t);
}

/** A hamlet of two or three houses round a yard: furniture inside, things in the yard, people, a horse, a fence, trees, enemies. */
function hamlet(ctx, st, s, R, out, trees, horses, kinds) {
  const { world: W, level: L, B, M, root } = ctx, pick = (a) => a[Math.floor(R() * a.length)];
  const n = 2 + (R() < 0.55 ? 1 : 0), a0 = R() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * (6.283 / n) + (R() - 0.5) * 0.5, d = 8 + R() * 2.5, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
    house(ctx, st, x, z, Math.atan2(s.x - x, s.z - z), 5 + R() * 2, 4.2 + R() * 1.4, R, out);
  }
  // the yard
  const yard = (k) => { const a = R() * 6.283, d = 2 + R() * 3.2; const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; return [x, W.height(x, z), z, a]; };
  for (let k = 0; k < 3 + Math.floor(R() * 3); k++) {
    const [x, y, z, a] = yard(k), what = pick(st.yard);
    if (crowded(W, x, z, 1.2)) continue;
    if (what === 'barrel') K.barrel(B, M, x, y, z);
    else if (what === 'crate') K.crate(B, M, x, y, z, 0.7 + R() * 0.3, a);
    else if (what === 'cart') K.cart(B, M, x, y, z, a, {});
    else if (what === 'haystack') K.haystack(B, M, x, y, z, { r: 1.2, h: 1.9 });
    else if (what === 'woodpile') K.woodpile(B, M, x, y, z, a, {});
    else if (what === 'sacks') K.sacks(B, M, x, y, z, a, {});
    else K.pots(B, M, x, y, z, { n: 3 });
  }
  // its people: at work, talking, looking on
  const folk = 2 + Math.floor(R() * 3);
  for (let k = 0; k < folk; k++) for (let tries = 0; tries < 6; tries++) {
    const a = R() * 6.283, d = 1 + R() * 5, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
    if (crowded(W, x, z, 0.6)) continue;
    K.person(B, M, root, pick(st.folk), x, W.height(x, z), z, R() * 6.283, { pose: pick(['stand', 'talk', 'work', 'hips', 'carry']), rand: R });
    break;
  }
  if (st.horse && R() < 0.7) {                                      // a horse tied up by the yard
    const a = R() * 6.283, x = s.x + Math.cos(a) * 6, z = s.z + Math.sin(a) * 6, ry = R() * 6.283;
    if (!crowded(W, x, z, 1.5)) K.animal(B, M, root, 'horse', K.horseGeo(st.horse, 0x1c120c), x, W.height(x, z), z, ry, { s: 0.8, coat: st.horse, box: [0.9, 2.8, 2.1, 0.2] });
  }
  // a fence along one side, and trees about
  { const a = R() * 6.283, x0 = s.x + Math.cos(a) * 13, z0 = s.z + Math.sin(a) * 13, b = a + 1.57, l = 6 + R() * 5;
    if (!crowded(W, x0, z0, 2)) K.fence(B, M, x0 - Math.cos(b) * l, z0 - Math.sin(b) * l, x0 + Math.cos(b) * l, z0 + Math.sin(b) * l, {}); }
  for (let k = 0; k < 4; k++) { const a = R() * 6.283, d = 14 + R() * 8, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; if (!crowded(W, x, z, 2.5)) trees.push({ x, y: W.height(x, z), z, ry: R() * 6.28, s: 0.8 + R() * 0.5 }); }
  // and the enemies who are about
  for (let k = 0; k < 2 + (R() < 0.5 ? 1 : 0); k++) { const a = R() * 6.283, d = 3 + R() * 9; L.enemies.push([pick(kinds), s.x + Math.cos(a) * d, s.z + Math.sin(a) * d, {}]); }
}

/** A house one can walk into: walls with a door and windows, a roof, a chimney, and what is inside. */
function house(ctx, st, x, z, ry, w, d, R, out) {
  const { world: W, B, M } = ctx, cs = Math.cos(ry), sn = Math.sin(ry), P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  let lo = Infinity, hi = -Infinity;
  for (const [lx, lz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, 0]]) { const [px, pz] = P(lx, lz), h = W.height(px, pz); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  const y = hi + 0.15, H = 2.8, wallM = M[WALL[st.wall]] || M.wood, wc = st.wc[Math.floor(R() * st.wc.length)], rc = st.rc[Math.floor(R() * st.rc.length)];
  K.room(B, M, x, y, z, { w, d, h: H, t: 0.25, ry, mat: wallM, c: wc, base: y - lo + 0.4, doors: [{ side: 's', at: (R() - 0.5) * (w - 2.2), w: 1.3, h: 2.2 }],
    wins: [{ side: 'e', at: 0, w: 1, h: 0.9, y: 1.2 }, { side: 'w', at: 0, w: 1, h: 0.9, y: 1.2 }, { side: 'n', at: (R() - 0.5) * (w - 2), w: 1, h: 0.9, y: 1.2 }],
    floor: { mat: M.woodH, c: 0x7a5a3e }, ceil: false });
  const top = y + H;
  if (st.roof === 'flat') {
    B.box(M.plaster, w + 0.3, 0.25, d + 0.3, x, top, z, { ry, c: rc, solid: true });
    if (st.trim) B.box(M.plaster, w + 0.34, 0.22, d + 0.34, x, top - 0.3, z, { ry, c: st.trim });      // a dark band under the roof
    for (const [lx, lz, ww, dd] of [[0, d / 2 + 0.07, w + 0.3, 0.16], [0, -d / 2 - 0.07, w + 0.3, 0.16], [w / 2 + 0.07, 0, 0.16, d + 0.3], [-w / 2 - 0.07, 0, 0.16, d + 0.3]]) { const [px, pz] = P(lx, lz); B.box(M.plaster, ww, 0.45, dd, px, top + 0.25, pz, { ry, c: wc }); }
  } else {
    const a = st.pitch, run = d / 2 + 0.35, rise = run * Math.tan(a), len = run / Math.cos(a), roofM = M[ROOF[st.roof]] || M.shingle;
    for (const sgn of [1, -1]) { const [px, pz] = P(0, sgn * run / 2); B.box(roofM, w + 0.6, 0.12, len, px, top + rise / 2 - 0.35 * Math.tan(a) - 0.06, pz, { ry, rx: sgn * a, c: rc }); }   // meets the wall at its top, the eaves a little lower
    const gh = (d / 2) * Math.tan(a), sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, gh)]);
    for (const sgn of [1, -1]) {                                    // the gable ends
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }); g.translate(0, 0, -0.11);
      const [px, pz] = P(sgn * (w / 2 - 0.12), 0); B.geo(wallM, g, [px, top, pz], [0, ry + Math.PI / 2, 0], 1, wc);
    }
  }
  if (st.chimney) {
    const [px, pz] = P(w * 0.28, -d * 0.18), ch = st.roof === 'flat' ? top + 1.1 : top + (d / 2) * Math.tan(st.pitch || 0) + 0.5;
    B.box(M.stone, 0.5, ch - top + 0.2, 0.5, px, top - 0.2, pz, { ry, c: 0x8a8278 });
    out.chimneys.push({ x: px, y: ch + 0.25, z: pz, t: R() * 5 });
  }
  // inside: a table and a bench, a bed or a chest, pots or a shelf
  const F = y + 0.06, inP = (lx, lz) => P(lx, lz);
  { const [tx, tz] = inP(-w * 0.18, -d * 0.12); K.table(B, M, tx, F, tz, ry, { w: 1.3, d: 0.7 }); const [bx, bz] = inP(-w * 0.18, -d * 0.12 + 0.75); K.bench(B, M, bx, F, bz, ry, { w: 1.2 }); }
  if (R() < 0.6) { const [qx, qz] = inP(w / 2 - 0.75, -d / 2 + 1.25); K.bed(B, M, qx, F, qz, ry, { w: 0.9, l: 1.9 }); }
  else { const [qx, qz] = inP(w / 2 - 0.7, -d / 2 + 0.6); K.chest(B, M, qx, F, qz, ry + Math.PI, {}); }
  { const [qx, qz] = inP(-w / 2 + 0.55, d / 2 - 0.6); K.pots(B, M, qx, F, qz, { n: 2, s: 0.8 }); }
}

/** The trees of the chapter's kind over the new ground (instanced), each with a trunk to bump into. */
function plant(W, root, M, st, trees, index) {
  if (!trees.length || st.tree === 'none') return;
  const geo = st.tree === 'pine' ? K.pineGeo() : st.tree === 'cactus' ? K.cactusGeo() : K.blobTreeGeo({ leaf: st.leaf, trunk: 0x4a3424, h: 5, spread: 2.6, seed: index + 3 });
  root.add(K.instanced(geo, M.flat, trees, { cast: true }));
  for (const t of trees) W.addCyl(t.x, t.z, 0.3 * t.s, t.y, t.y + 3);
}

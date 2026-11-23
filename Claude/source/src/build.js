// World construction + physics.
//  - Builder:  collects thousands of small shapes and merges them into a few
//              big meshes (one per material) so the GPU draws them in one go.
//  - World:    the invisible collision model (boxes, cylinders, terrain) used
//              for walking, bullets and enemy line of sight.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp } from './util.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

/** Give every vertex of a geometry the same colour. */
export function paint(g, color) {
  _c.set(color);
  const n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Move/rotate/scale + colour a fresh geometry and make it merge-ready. */
export function xf(geo, p = [0, 0, 0], r = [0, 0, 0], s = 1, c = 0xffffff) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  _e.set(r[0], r[1], r[2], 'YXZ'); _q.setFromEuler(_e);
  _p.set(p[0], p[1], p[2]);
  if (typeof s === 'number') _s.setScalar(s); else _s.set(s[0], s[1], s[2]);
  g.applyMatrix4(_m.compose(_p, _q, _s));
  if (!g.attributes.color) paint(g, c);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

export const merge = (list) => mergeGeometries(list, false);

/** Box whose texture repeats every `tile` metres regardless of its size. */
export function boxGeo(w, h, d, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const ou = Math.random(), ov = Math.random();
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i;
    uv.setXY(k, uv.getX(k) * dims[f][0] / tile + ou, uv.getY(k) * dims[f][1] / tile + ov);
  }
  return g;
}

function rawGeo(P, U) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(U), 2));
  g.computeVertexNormals();
  return g;
}

/** Gable roof: triangular prism, ridge along Z. Base at y=0. */
export function prismGeo(w, h, d, tile = 1) {
  const x = w / 2, z = d / 2, sl = Math.hypot(x, h) / tile, dl = d / tile;
  const P = [], U = [];
  const quad = (a, b, c, e) => { P.push(...a, ...b, ...c, ...a, ...c, ...e); U.push(0, 0, 0, sl, dl, sl, 0, 0, dl, sl, dl, 0); };
  quad([-x, 0, z], [0, h, z], [0, h, -z], [-x, 0, -z]);
  quad([x, 0, -z], [0, h, -z], [0, h, z], [x, 0, z]);
  P.push(-x, 0, z, x, 0, z, 0, h, z, x, 0, -z, -x, 0, -z, 0, h, -z);
  U.push(0, 0, w / tile, 0, x / tile, h / tile, 0, 0, w / tile, 0, x / tile, h / tile);
  return rawGeo(P, U);
}

/**
 * Japanese-style hipped roof: concave slopes and corners that sweep upward.
 * Eaves at y=0, ridge (along X) at y=h.
 */
export function curvedRoofGeo(w, d, h, o = {}) {
  const { ridge = 0.45, up = 0.7, curve = 1.9, tile = 1, nt = 7, ns = 10 } = o;
  const ex = w / 2, ez = d / 2, rx = ex * ridge;
  const sides = [
    [[-rx, 0], [rx, 0], [-ex, ez], [ex, ez]],
    [[rx, 0], [-rx, 0], [ex, -ez], [-ex, -ez]],
    [[-rx, 0], [-rx, 0], [-ex, -ez], [-ex, ez]],
    [[rx, 0], [rx, 0], [ex, ez], [ex, -ez]],
  ];
  const P = [], U = [];
  const pt = (sd, s, t) => {
    const tx = sd[0][0] + (sd[1][0] - sd[0][0]) * s, tz = sd[0][1] + (sd[1][1] - sd[0][1]) * s;
    const bx = sd[2][0] + (sd[3][0] - sd[2][0]) * s, bz = sd[2][1] + (sd[3][1] - sd[2][1]) * s;
    const y = h * Math.pow(1 - t, curve) + up * Math.pow(Math.abs(2 * s - 1), 4) * t * t * t;
    return [tx + (bx - tx) * t, y, tz + (bz - tz) * t];
  };
  for (const sd of sides) {
    const len = Math.hypot(sd[3][0] - sd[2][0], sd[3][1] - sd[2][1]) / tile;
    const sl = Math.hypot(h, Math.hypot(sd[2][0] - sd[0][0], sd[2][1] - sd[0][1])) / tile;
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
      const s0 = i / ns, s1 = (i + 1) / ns, t0 = j / nt, t1 = (j + 1) / nt;
      const a = pt(sd, s0, t0), b = pt(sd, s0, t1), c = pt(sd, s1, t1), e = pt(sd, s1, t0);
      const tri = (p, q, r, up_, uq, ur) => {
        // keep the triangle facing upward/outward
        const ny = (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]);
        if (ny >= 0) { P.push(...p, ...q, ...r); U.push(...up_, ...uq, ...ur); }
        else { P.push(...p, ...r, ...q); U.push(...up_, ...ur, ...uq); }
      };
      tri(a, b, c, [s0 * len, t0 * sl], [s0 * len, t1 * sl], [s1 * len, t1 * sl]);
      tri(a, c, e, [s0 * len, t0 * sl], [s1 * len, t1 * sl], [s1 * len, t0 * sl]);
    }
  }
  return rawGeo(P, U);
}

/** Lumpy boulder. */
export function rockGeo(seed = 1, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.7) * Math.sin(z * 3.3 + seed * 0.3);
    const k = 1 + n * 0.28;
    pos.setXYZ(i, x * k, y * k * 0.75, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------

export class Builder {
  constructor(world) { this.world = world; this.parts = new Map(); this.cur = null; this.stack = []; this.order = []; this.noTrinkets = 0; }

  add(mat, geo) {
    let a = this.parts.get(mat);
    if (!a) this.parts.set(mat, (a = []));
    a.push(geo);
    if (this.cur) geo.userData.piece = this.cur;
    else if (!this.noTrinkets && !mat.userData.noTrinket) this.order.push({ geo, mat });     // may turn out to be a small thing that breaks at a touch (see trinkets)
    return this;
  }
  /**
   * Small things the levels put about (bottles, cups, lamps, books, tools, signs, ornaments), merged into the world like everything
   * else: every shape no bigger than about 30 cm across that has no collider of its own becomes a breakable "trinket", grouped with the
   * shapes added just before it that touch it (the parts of one lamp). A trinket has no collider: shots, blows and blasts find it by its
   * bounding sphere (see Havoc.trinketsAlong), and it breaks at the first touch.
   */
  trinkets() {
    const W = this.world, groups = [];
    let g = null;
    for (const { geo, mat } of this.order) {
      if (geo.userData.piece || geo.userData.solid) { g = null; continue; }
      geo.computeBoundingSphere(); const bs = geo.boundingSphere;
      if (!bs || bs.radius > 0.32 || bs.radius < 0.01) { g = null; continue; }
      if (g && g.c.distanceTo(bs.center) < g.r + bs.radius + 0.05 && g.r < 0.42) { g.list.push(geo); const d = g.c.distanceTo(bs.center); g.r = Math.max(g.r, d + bs.radius); g.wood = g.wood || mat.userData.breakable === 'wood'; }
      else { g = { list: [geo], c: bs.center.clone(), r: bs.radius, wood: mat.userData.breakable === 'wood' }; groups.push(g); }
    }
    for (const t of groups) {
      const col = t.list[0].attributes.color, cc = col ? new THREE.Color(col.array[0], col.array[1], col.array[2]) : new THREE.Color(0x888888);
      const p = { id: W.pieces.length, hp: 1, hp0: 1, kind: t.wood ? 'wood' : 'clay', boom: false, color: cc.getHex(), x: t.c.x, y: t.c.y - t.r, z: t.c.z, r: t.r, top: t.c.y + t.r, cy: t.c.y, ranges: [], cols: [], broken: false, trinket: true };
      W.pieces.push(p); W.trinkets.push(p);
      for (const q of t.list) q.userData.piece = p;
    }
    this.order = [];
  }
  /**
   * A thing that can be shot to pieces (a crate, a barrel, a jar). Everything added until endPiece() belongs to it: its shapes still go into
   * the big merged meshes (no extra draw calls), and the piece remembers where they lie in them, so that they can be made to vanish.
   * o: { hp, kind: 'wood' | 'clay' | 'straw' | 'cloth', boom (explodes), color, x, y, z, r (radius), top (height of its top),
   *      sweep: { hw, hd, ry } (a table top: what lies on it, merged into the world by the level, goes when it breaks) }
   * Pieces may nest (the crates loaded on a cart are pieces of their own): endPiece() returns to the one around it.
   */
  piece(o) {
    const W = this.world, p = { id: W.pieces.length, hp: 40, kind: 'wood', boom: false, color: 0x8a623a, ...o, ranges: [], cols: [], broken: false };
    p.hp0 = p.hp;
    W.pieces.push(p); this.stack.push(this.cur); this.cur = W.curPiece = p;
    return p;
  }
  endPiece() { this.cur = this.world.curPiece = this.stack.pop() || null; }
  /** Box with (x,y,z) = centre of its BASE. o: {ry, rx, rz, c (colour), solid} */
  box(mat, w, h, d, x, y, z, o = {}) {
    // a wall or a door of wood, paper or bamboo (upright, thin, solid) can be broken through: it is a piece of its own. Stone and plaster stand.
    const wall = o.solid && !this.cur && mat.userData.breakable && h >= 1.0 && Math.min(w, d) <= 0.5 && Math.max(w, d) >= 0.5 && !o.rx && !o.rz;
    if (wall) { const paper = mat.userData.breakable === 'paper'; this.piece({ hp: paper ? 25 : clamp(Math.max(w, d) * h * 28, 110, 230), kind: paper ? 'paper' : 'wood', color: o.c ?? 0xb08a5a, x, y, z, r: Math.max(w, d) / 2, top: y + h, wall: true }); }
    const g = xf(boxGeo(w, h, d, mat.userData.tile || 1), [x, y + h / 2, z], [o.rx || 0, o.ry || 0, o.rz || 0], 1, o.c ?? 0xffffff);
    if (o.solid) g.userData.solid = true;
    this.add(mat, g);
    if (o.solid) this.world.addBox(x, z, w, d, o.ry || 0, y, y + h);
    if (wall) this.endPiece();
    return this;
  }
  /** Vertical cylinder/cone standing on (x,y,z). */
  cyl(mat, rt, rb, h, x, y, z, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 10, 1, !!o.open);
    const t = mat.userData.tile || 1, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(6.28 * Math.max(rt, rb) / t)), uv.getY(i) * h / t);
    const q = xf(g, [x, y + h / 2, z], [o.rx || 0, o.ry || 0, o.rz || 0], 1, o.c ?? 0xffffff);
    if (o.solid) q.userData.solid = true;
    this.add(mat, q);
    if (o.solid) this.world.addCyl(x, z, Math.max(rt, rb), y, y + h);
    return this;
  }
  /** Any geometry. */
  geo(mat, g, p, r, s, c) { return this.add(mat, xf(g, p, r, s, c)); }

  build(parent) {
    const out = [];
    this.trinkets();
    for (const [mat, list] of this.parts) {
      const mesh = new THREE.Mesh(merge(list), mat);
      let at = 0;
      for (const g of list) { const n = g.attributes.position.count; if (g.userData.piece) g.userData.piece.ranges.push({ mesh, start: at, count: n }); at += n; }
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = !mat.userData.noShadow;
      parent.add(mesh); out.push(mesh);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
    return out;
  }
}

// ---------------------------------------------------------------------------

/** Regular grid of terrain heights with smooth (bilinear) lookup. */
export class Heightfield {
  constructor(size, segs, fn) {
    this.size = size; this.segs = segs; this.n = segs + 1; this.cell = size / segs; Heightfield.last = this;   // the chapter's ground (how far it reaches limits how large its map can be)
    this.data = new Float32Array(this.n * this.n);
    const half = size / 2;
    for (let j = 0; j < this.n; j++) for (let i = 0; i < this.n; i++)
      this.data[j * this.n + i] = fn(-half + i * this.cell, -half + j * this.cell);
  }
  h(x, z) {
    const n = this.n;
    const fx = clamp((x + this.size / 2) / this.cell, 0, n - 1.0001);
    const fz = clamp((z + this.size / 2) / this.cell, 0, n - 1.0001);
    const i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, d = this.data, k = j * n + i;
    return d[k] * (1 - u) * (1 - v) + d[k + 1] * u * (1 - v) + d[k + n] * (1 - u) * v + d[k + n + 1] * u * v;
  }
  /** colorFn(x, z, h, normalY) -> THREE.Color (linear) */
  mesh(material, colorFn) {
    const g = new THREE.PlaneGeometry(this.size, this.size, this.segs, this.segs);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, uv = g.attributes.uv, tile = material.userData.tile || 4;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.data[i]);
      uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile);
    }
    g.computeVertexNormals();
    const nor = g.attributes.normal, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const c = colorFn(pos.getX(i), pos.getZ(i), pos.getY(i), nor.getY(i));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true; m.castShadow = false;
    return m;
  }
}

// ---------------------------------------------------------------------------

const STEP = 0.5;   // highest ledge you can walk up without jumping

export class World {
  constructor() {
    this.boxes = []; this.cyls = [];
    this.ladders = [];             // {x, z, nx, nz, y0, y1, lean}: where it touches the wall at the top, the direction away from it, bottom and top, metres out per metre down
    this.height = () => 0;         // terrain height function
    this.bounds = null;            // {x0,x1,z0,z1} or {r} hard limits
    this.maxSlope = 1.15;          // steeper terrain cannot be climbed
    this.waterY = -Infinity;       // terrain below this is too deep to enter
    this.pieces = []; this.curPiece = null;   // things that can be shot to pieces (see Builder.piece)
    this.trinkets = [];                        // the small ones among them, which have no collider (see Builder.trinkets)
  }
  addBox(x, z, w, d, ry, y0, y1) {
    const b = { x, z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), y0, y1, r: Math.hypot(w, d) / 2 };
    if (this.curPiece) { b.piece = this.curPiece; this.curPiece.cols.push(b); }
    this.boxes.push(b);
  }
  addCyl(x, z, r, y0, y1) { const c = { x, z, r, y0, y1 }; if (this.curPiece) { c.piece = this.curPiece; this.curPiece.cols.push(c); } this.cyls.push(c); return c; }
  /** Take away the colliders of a piece that has been broken. */
  removeCols(p) { const gone = new Set(p.cols); this.boxes = this.boxes.filter((b) => !gone.has(b)); this.cyls = this.cyls.filter((c) => !gone.has(c)); }

  /** Height of the floor under a point for something whose feet are at feetY. */
  groundAt(x, z, feetY) {
    let g = this.height(x, z);
    const lim = feetY + STEP;
    for (const b of this.boxes) {
      if (b.y1 <= g || b.y1 > lim) continue;
      const dx = x - b.x, dz = z - b.z;
      if (dx * dx + dz * dz > b.r * b.r) continue;
      const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      if (Math.abs(lx) <= b.hw + 1e-6 && Math.abs(lz) <= b.hd + 1e-6) g = b.y1;
    }
    return g;
  }

  /** The ladder that a body at p stands in front of and faces (fx, fz = the way it looks), or null. */
  /** Is (x, z) within the bounds of the map, m metres in from the edge? */
  inside(x, z, m = 0) {
    const B = this.bounds; if (!B) return true;
    return B.r ? Math.hypot(x - (B.x || 0), z - (B.z || 0)) < B.r - m : x > B.x0 + m && x < B.x1 - m && z > B.z0 + m && z < B.z1 - m;
  }
  ladderFor(p, fx, fz) {
    for (const L of this.ladders) {
      const k = (L.lean || 0) * Math.max(0, L.y1 - p.y), dx = p.x - L.x - L.nx * k, dz = p.z - L.z - L.nz * k, out = dx * L.nx + dz * L.nz, lat = dz * L.nx - dx * L.nz;   // (a leaning ladder stands further out the lower you are)
      if (out > 0.05 && out < 1.0 && Math.abs(lat) < 0.55 && p.y > L.y0 - 0.4 && p.y < L.y1 + 0.1 && -(fx * L.nx + fz * L.nz) > 0.4) return L;
    }
    return null;
  }

  /** Is this point inside a solid box at body height? (Pushing a body out of one box can push it into the next and back, which looks like a fit.) */
  inBox(x, z, y, h) {
    for (const b of this.boxes) {
      if (b.y1 <= y + STEP || b.y0 >= y + h) continue;
      const dx = x - b.x, dz = z - b.z;
      if (dx * dx + dz * dz > b.r * b.r) continue;
      const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) return true;
    }
    return false;
  }

  /** The lowest top of a solid box above height y at this point, or Infinity: the next floor up. */
  nextUp(x, z, y) {
    let best = Infinity;
    for (const b of this.boxes) {
      if (b.y1 <= y + 0.01 || b.y1 >= best) continue;
      const dx = x - b.x, dz = z - b.z;
      if (dx * dx + dz * dz > b.r * b.r) continue;
      const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      if (Math.abs(lx) <= b.hw + 1e-6 && Math.abs(lz) <= b.hd + 1e-6) best = b.y1;
    }
    return best;
  }

  /** Can a walker go from (x0,z0) toward (x1,z1) given slope and water? */
  walkable(x0, z0, x1, z1, feetY) {
    const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz);
    if (d < 1e-6) return true;
    const px = x0 + (dx / d) * 0.6, pz = z0 + (dz / d) * 0.6;
    const h0 = this.height(x0, z0), h1 = this.height(px, pz);
    if (feetY !== undefined && feetY > Math.max(h0, this.waterY) + 0.4) return this.groundAt(px, pz, feetY + 0.5) - feetY < 0.55;   // up on a deck or a roof: the slope of the ground below does not matter
    if (h1 < this.waterY) {
      if (feetY !== undefined && this.groundAt(px, pz, feetY) >= this.waterY) return true;   // a bridge, a jetty or a deck carries the walker over deep water
      if (h1 < h0) return false;
    }
    return (h1 - h0) / 0.6 < this.maxSlope;
  }

  /** Push a vertical capsule (radius r, height h, feet at p.y) out of obstacles. */
  collide(p, r, h) {
    for (let pass = 0; pass < 2; pass++) {
      for (const b of this.boxes) {
        if (b.y1 <= p.y + STEP || b.y0 >= p.y + h) continue;
        const dx = p.x - b.x, dz = p.z - b.z, rr = b.r + r;
        if (dx * dx + dz * dz > rr * rr) continue;
        let lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
        const cx = clamp(lx, -b.hw, b.hw), cz = clamp(lz, -b.hd, b.hd);
        const ex = lx - cx, ez = lz - cz, d2 = ex * ex + ez * ez;
        if (d2 >= r * r) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2), k = (r - d) / d;
          lx += ex * k; lz += ez * k;
        } else if (b.hw - Math.abs(lx) < b.hd - Math.abs(lz)) lx = Math.sign(lx || 1) * (b.hw + r);
        else lz = Math.sign(lz || 1) * (b.hd + r);
        p.x = b.x + lx * b.c + lz * b.s;
        p.z = b.z - lx * b.s + lz * b.c;
      }
      for (const c of this.cyls) {
        if (c.y1 <= p.y + STEP || c.y0 >= p.y + h) continue;
        const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + r, d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 1e-4;
        p.x = c.x + (dx / d) * rr; p.z = c.z + (dz / d) * rr;
      }
    }
    const B = this.bounds;
    if (B) {
      if (B.r) {
        const d = Math.hypot(p.x - (B.x || 0), p.z - (B.z || 0));
        if (d > B.r) { p.x = (B.x || 0) + ((p.x - (B.x || 0)) / d) * B.r; p.z = (B.z || 0) + ((p.z - (B.z || 0)) / d) * B.r; }
      } else {
        p.x = clamp(p.x, B.x0, B.x1); p.z = clamp(p.z, B.z0, B.z1);
      }
    }
  }

  /**
   * Cast a ray (origin o, unit direction d). Returns the nearest hit
   * {t, nx, ny, nz} within `max` metres, or null.
   */
  raycast(o, d, max = 300) {
    let best = max, nx = 0, ny = 1, nz = 0, hit = false, obj = null;
    for (const b of this.boxes) {
      const ox = o.x - b.x, oz = o.z - b.z;
      const lox = ox * b.c - oz * b.s, loz = ox * b.s + oz * b.c;
      const ldx = d.x * b.c - d.z * b.s, ldz = d.x * b.s + d.z * b.c;
      let t0 = 0, t1 = best, axis = -1, sgn = 0, ok = true;
      // x slab
      if (Math.abs(ldx) < 1e-8) { if (Math.abs(lox) > b.hw) ok = false; }
      else {
        let a = (-b.hw - lox) / ldx, c = (b.hw - lox) / ldx, s = -1;
        if (a > c) { const t = a; a = c; c = t; s = 1; }
        if (a > t0) { t0 = a; axis = 0; sgn = s; }
        if (c < t1) t1 = c;
        if (t0 > t1) ok = false;
      }
      if (!ok) continue;
      // y slab
      if (Math.abs(d.y) < 1e-8) { if (o.y < b.y0 || o.y > b.y1) continue; }
      else {
        let a = (b.y0 - o.y) / d.y, c = (b.y1 - o.y) / d.y, s = -1;
        if (a > c) { const t = a; a = c; c = t; s = 1; }
        if (a > t0) { t0 = a; axis = 1; sgn = s; }
        if (c < t1) t1 = c;
        if (t0 > t1) continue;
      }
      // z slab
      if (Math.abs(ldz) < 1e-8) { if (Math.abs(loz) > b.hd) continue; }
      else {
        let a = (-b.hd - loz) / ldz, c = (b.hd - loz) / ldz, s = -1;
        if (a > c) { const t = a; a = c; c = t; s = 1; }
        if (a > t0) { t0 = a; axis = 2; sgn = s; }
        if (c < t1) t1 = c;
        if (t0 > t1) continue;
      }
      if (axis < 0 || t0 >= best) continue;
      best = t0; hit = true; obj = b;
      if (axis === 1) { nx = 0; ny = sgn; nz = 0; }
      else if (axis === 0) { nx = sgn * b.c; ny = 0; nz = -sgn * b.s; }
      else { nx = sgn * b.s; ny = 0; nz = sgn * b.c; }
    }
    for (const c of this.cyls) {
      const ox = o.x - c.x, oz = o.z - c.z;
      const A = d.x * d.x + d.z * d.z;
      if (A < 1e-8) continue;
      const Bq = ox * d.x + oz * d.z, C = ox * ox + oz * oz - c.r * c.r;
      const disc = Bq * Bq - A * C;
      if (disc < 0) continue;
      const t = (-Bq - Math.sqrt(disc)) / A;
      if (t <= 0 || t >= best) continue;
      const y = o.y + d.y * t;
      if (y < c.y0 || y > c.y1) continue;
      best = t; hit = true; obj = c;
      nx = (ox + d.x * t) / c.r; ny = 0; nz = (oz + d.z * t) / c.r;
    }
    // terrain: march, then refine
    const step = 0.7;
    let pt = 0, above = o.y - this.height(o.x, o.z) > 0;
    if (above) {
      for (let t = step; t < best + step; t += step) {
        const tt = Math.min(t, best);
        const y = o.y + d.y * tt, gh = this.height(o.x + d.x * tt, o.z + d.z * tt);
        if (y < gh) {
          let lo = pt, hi = tt;
          for (let i = 0; i < 6; i++) {
            const mid = (lo + hi) / 2;
            if (o.y + d.y * mid < this.height(o.x + d.x * mid, o.z + d.z * mid)) hi = mid; else lo = mid;
          }
          best = lo; hit = true; nx = 0; ny = 1; nz = 0; obj = null;
          break;
        }
        pt = tt;
        if (tt >= best) break;
      }
    }
    return hit ? { t: best, nx, ny, nz, piece: obj && obj.piece && !obj.piece.broken ? obj.piece : null, person: obj && obj.person && !obj.person.dead ? obj.person : null } : null;
  }

  /** True if nothing solid lies between two points. */
  clear(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz);
    if (len < 0.01) return true;
    _ro.x = ax; _ro.y = ay; _ro.z = az;
    _rd.x = dx / len; _rd.y = dy / len; _rd.z = dz / len;
    return this.raycast(_ro, _rd, len - 0.05) === null;
  }
}
const _ro = { x: 0, y: 0, z: 0 }, _rd = { x: 0, y: 0, z: 0 };

// ---------------------------------------------------------------------------

/**
 * Navigation grid: the walkable area sampled in small cells, with A* route
 * finding. Built once per level from the same collision model the player uses,
 * so enemies walk around walls and through doors instead of pushing at them.
 */
export class Nav {
  constructor(world, cell = 0.7) {
    const B = world.bounds, b = B.r ? { x0: (B.x || 0) - B.r, x1: (B.x || 0) + B.r, z0: (B.z || 0) - B.r, z1: (B.z || 0) + B.r } : B;
    this.w = world; this.cell = cell; this.x0 = b.x0 + 0.0137; this.z0 = b.z0 + 0.0171;   // off the round numbers that level geometry likes
    this.nx = Math.ceil((b.x1 - b.x0) / cell); this.nz = Math.ceil((b.z1 - b.z0) / cell);
    const n = this.nx * this.nz;
    this.free = new Uint8Array(n); this.hgt = new Float32Array(n); this.onT = new Uint8Array(n); this.links = new Map();
    this.g = new Float32Array(n); this.from = new Int32Array(n); this.mark = new Uint32Array(n); this.stamp = 0;
    // While the grid is built, the world's colliders are swapped for the few near each cell (buckets of 4 x 4 cells):
    // every test below then looks at a handful of boxes instead of all of them.
    const allB = world.boxes, allC = world.cyls, BS = cell * 4, bnx = Math.ceil(this.nx / 4) + 1, bnz = Math.ceil(this.nz / 4) + 1, bb = new Array(bnx * bnz), bc = new Array(bnx * bnz), none = [];
    const put = (arr, o, r) => {
      const i0 = Math.max(0, Math.floor((o.x - r - this.x0) / BS)), i1 = Math.min(bnx - 1, Math.floor((o.x + r - this.x0) / BS)), j0 = Math.max(0, Math.floor((o.z - r - this.z0) / BS)), j1 = Math.min(bnz - 1, Math.floor((o.z + r - this.z0) / BS));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (arr[j * bnx + i] ||= []).push(o);
    };
    for (const b of allB) put(bb, b, b.r + 0.7); for (const c of allC) put(bc, c, c.r + 0.7);
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const q0 = (j >> 2) * bnx + (i >> 2);
      world.boxes = bb[q0] || none; world.cyls = bc[q0] || none;
      this.cellAt(i, j);
    }
    world.boxes = allB; world.cyls = allC;
  }
  /** Work out one cell of the grid from the world's colliders: its floor height, and whether a body fits there. */
  cellAt(i, j) {
    const world = this.w, cell = this.cell, p = this._p || (this._p = { x: 0, y: 0, z: 0 });
    const x = this.x0 + (i + 0.5) * cell, z = this.z0 + (j + 0.5) * cell, k = j * this.nx + i;
    this.free[k] = 0; this.onT[k] = 0;
    const gy = world.height(x, z), wet = gy < world.waterY, g0 = wet ? world.waterY : gy;   // over deep water the search starts at the surface: a bridge or a deck may cross it
    if (wet && world.groundAt(x, z, g0 + 4) < world.waterY) { this.hgt[k] = gy; return; }   // open water
    // find the lowest surface here on which a body fits: the ground, or a floor / step / plinth above it
    let y = Math.max(g0, world.groundAt(x, z, g0 + 0.05)), fits = false;
    for (let tries = 0; tries < 8; tries++) {
      for (let q = 0; q < 8; q++) { const up = world.groundAt(x, z, y); if (up > y + 0.01) y = up; else break; }   // a walker is lifted onto anything within step height
      p.x = x; p.y = y; p.z = z; world.collide(p, 0.25, 1.7);
      if (!(wet && y < world.waterY + 0.02) && Math.abs(p.x - x) + Math.abs(p.z - z) < 0.03 && !world.inBox(x, z, y, 1.7)) { fits = true; break; }   // the water surface itself is never a place to stand
      const y2 = world.nextUp(x, z, y);
      if (y2 - g0 > 18) break;                            // nothing higher. (A roof is found too, but with no steps up to it nothing links it to the ground.)
      y = y2;
    }
    this.hgt[k] = y; this.onT[k] = !wet && y - gy < 0.03 ? 1 : 0; if (fits && !(wet && y < world.waterY + 0.02)) this.free[k] = 1;
  }
  /** Something in this square (x0..x1, z0..z1) has changed (a crate shot to pieces): work its cells out again. */
  refresh(x0, z0, x1, z1) {
    const i0 = Math.max(0, Math.floor((x0 - this.x0) / this.cell) - 1), i1 = Math.min(this.nx - 1, Math.floor((x1 - this.x0) / this.cell) + 1);
    const j0 = Math.max(0, Math.floor((z0 - this.z0) / this.cell) - 1), j1 = Math.min(this.nz - 1, Math.floor((z1 - this.z0) / this.cell) + 1);
    const W = this.w, allB = W.boxes, allC = W.cyls, m = 2.5;                   // only the colliders near the square take part: a break costs no more than a few milliseconds
    W.boxes = allB.filter((b) => b.x + b.r > x0 - m && b.x - b.r < x1 + m && b.z + b.r > z0 - m && b.z - b.r < z1 + m);
    W.cyls = allC.filter((c) => c.x + c.r > x0 - m && c.x - c.r < x1 + m && c.z + c.r > z0 - m && c.z - c.r < z1 + m);
    try { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.cellAt(i, j); } finally { W.boxes = allB; W.cyls = allC; }
    this.links.clear();
  }
  idx(x, z) { const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell); return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : j * this.nx + i; }
  /** Nearest walkable cell to a point (searches a few rings outward). */
  near(x, z, y) {
    const fit = (k) => this.free[k] && (y === undefined || Math.abs(this.hgt[k] - y) < 0.9);      // same storey as the walker, not the crate beside him
    const k = this.idx(x, z); if (k >= 0 && fit(k)) return k;
    const ci = Math.floor((x - this.x0) / this.cell), cj = Math.floor((z - this.z0) / this.cell);
    for (let r = 1; r <= 5; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
      if (fit(j * this.nx + i)) return j * this.nx + i;
    }
    return y === undefined ? -1 : this.near(x, z);
  }
  /** Can a body walk from cell a to its neighbour b? Slopes of open ground, and steps of at most half a metre. */
  ok(a, b) {
    if (!this.free[b]) return false;
    const ha = this.hgt[a], hb = this.hgt[b], d = Math.abs(ha - hb);
    if (d <= 0.52) return true;
    if (this.onT[a] && this.onT[b]) {                 // open ground: any way down, but up only as steeply as a walker can climb (the same limit as World.walkable)
      if (hb < ha) return d <= 0.5 + this.cell * 1.42 * this.w.maxSlope;
      const df = Math.abs(a - b); return d <= this.cell * (df === 1 || df === this.nx ? 1 : 1.414) * this.w.maxSlope * 0.85;   // with a margin, so routes take the stair, not the edge of what is climbable
    }
    if (d > 1.3) return false;
    const lo = Math.min(a, b), df = Math.max(a, b) - lo, key = lo * 4 + (df === 1 ? 0 : df === this.nx - 1 ? 1 : df === this.nx ? 2 : 3);
    let v = this.links.get(key);
    if (v === undefined) {                    // a flight of stairs? walk it in three short strides and see whether each one is a step, not a wall
      const nx = this.nx, c = this.cell, xa = this.x0 + ((a % nx) + 0.5) * c, za = this.z0 + (((a / nx) | 0) + 0.5) * c, xb = this.x0 + ((b % nx) + 0.5) * c, zb = this.z0 + (((b / nx) | 0) + 0.5) * c;
      const y1 = this.w.groundAt(xa + (xb - xa) / 3, za + (zb - za) / 3, ha), y2 = this.w.groundAt(xa + (xb - xa) * 2 / 3, za + (zb - za) * 2 / 3, y1);
      v = Math.abs(y1 - ha) <= 0.52 && Math.abs(y2 - y1) <= 0.52 && Math.abs(hb - y2) <= 0.52; this.links.set(key, v);
    }
    return v;
  }
  /** Route from a to b as a list of [x, z] points, or null. A* with a binary heap. */
  path(ax, az, bx, bz, limit = 30000, ay, by) {
    const s = this.near(ax, az, ay), t = this.near(bx, bz, by); if (s < 0 || t < 0) return null;
    if (s === t) return [[bx, bz]];
    const nx = this.nx, g = this.g, from = this.from, mark = this.mark, st = (this.stamp += 2), closed = st + 1;
    const ti = t % nx, tj = (t / nx) | 0;
    const hs = (k) => { const dx = Math.abs((k % nx) - ti), dz = Math.abs(((k / nx) | 0) - tj); return (dx + dz - 0.586 * Math.min(dx, dz)) * 1.1; };
    const hk = [], hf = [];
    const push = (k, f) => { let i = hk.length; hk.push(k); hf.push(f); while (i > 0) { const pa = (i - 1) >> 1; if (hf[pa] <= f) break; hk[i] = hk[pa]; hf[i] = hf[pa]; i = pa; } hk[i] = k; hf[i] = f; };
    const pop = () => { const k = hk[0], lk = hk.pop(), lf = hf.pop(), n = hk.length; if (n) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hk[i] = hk[c]; hf[i] = hf[c]; i = c; } hk[i] = lk; hf[i] = lf; } return k; };
    g[s] = 0; from[s] = -1; mark[s] = st; push(s, hs(s));
    let found = false, steps = 0;
    while (hk.length && steps++ < limit) {
      const c = pop();
      if (mark[c] === closed) continue;
      if (c === t) { found = true; break; }
      mark[c] = closed;
      const ci = c % nx, cj = (c / nx) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= this.nz) continue;
        const k = j * nx + i; if (mark[k] === closed || !this.ok(c, k)) continue;
        if (di && dj && (!this.free[cj * nx + i] || !this.free[j * nx + ci])) continue;      // no cutting corners
        const ng = g[c] + (di && dj ? 1.414 : 1);
        if (mark[k] === st && ng >= g[k]) continue;
        g[k] = ng; from[k] = c; mark[k] = st; push(k, ng + hs(k));
      }
    }
    if (!found) return null;
    const out = []; for (let k = t; k >= 0 && k !== s; k = from[k]) out.push([this.x0 + ((k % nx) + 0.5) * this.cell, this.z0 + (((k / nx) | 0) + 0.5) * this.cell]);
    out.reverse(); out.push([bx, bz]);
    return out;
  }
}

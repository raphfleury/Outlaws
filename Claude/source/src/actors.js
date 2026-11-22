// Characters: the figure builder (used for enemies and for the hero shown in
// each level's opening shot), enemy behaviour, and flying projectiles.
import * as THREE from 'three';
import { xf, merge } from './build.js';
import { clamp, damp, TAU } from './util.js';

// --- tiny shape helpers: each returns a coloured, positioned geometry --------
export const gBox = (w, h, d, c, p, r, s) => xf(new THREE.BoxGeometry(w, h, d), p, r, s, c);
export const gCyl = (rt, rb, h, c, p, r, s, seg = 10) => xf(new THREE.CylinderGeometry(rt, rb, h, seg), p, r, s, c);
export const gSph = (rad, c, p, s, seg = 10) => xf(new THREE.SphereGeometry(rad, seg, Math.max(6, seg - 2)), p, [0, 0, 0], s, c);
export const gCone = (rad, h, c, p, r, s, seg = 12) => xf(new THREE.ConeGeometry(rad, h, seg), p, r, s, c);
export const gCap = (rad, len, c, p, r, s) => xf(new THREE.CapsuleGeometry(rad, len, 3, 8), p, r, s, c);

/** A throwing star lying flat (thin along y): n sharp points and a hole in the middle, dark steel with bright ground edges. R = radius to the tips. */
export function gStar(R, p, r, s, n = 8) {
  const shape = (ro, ri, hole) => {
    const sh = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, q = i % 2 ? ri : ro; sh[i ? 'lineTo' : 'moveTo'](Math.cos(a) * q, Math.sin(a) * q); }
    sh.closePath(); const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); sh.holes.push(h); return sh;
  };
  const plate = (ro, ri, t, c) => { const g = new THREE.ExtrudeGeometry(shape(ro, ri, R * 0.15), { depth: t, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -t / 2); g.rotateX(Math.PI / 2); return xf(g, [0, 0, 0], [0, 0, 0], 1, c); };
  return xf(merge([plate(R, R * 0.42, R * 0.07, 0xe4e8ee), plate(R * 0.76, R * 0.36, R * 0.13, 0x33363c)]), p, r, s);      // the bright edge shows all round the darker, thicker body
}

const STEEL = 0xc9ced6, DARKSTEEL = 0x555a62, WOODC = 0x6b4526;

/** Weapon geometry in the right arm's local space (hand at y = -0.6). */
function weaponParts(kind, flat, metal) {
  const X = Math.PI / 2;
  switch (kind) {
    case 'revolver':
      flat.push(gBox(0.035, 0.11, 0.05, WOODC, [0, -0.6, -0.035], [0.3, 0, 0]));
      metal.push(gBox(0.036, 0.13, 0.065, DARKSTEEL, [0, -0.69, 0.005]), gCyl(0.014, 0.014, 0.2, DARKSTEEL, [0, -0.83, 0.02]));
      break;
    case 'rifle':
      flat.push(gBox(0.045, 0.42, 0.08, WOODC, [0, -0.42, 0.0]), gBox(0.04, 0.3, 0.05, WOODC, [0, -0.75, 0.0]));
      metal.push(gCyl(0.014, 0.014, 0.75, DARKSTEEL, [0, -0.95, 0.02]), gBox(0.03, 0.14, 0.06, DARKSTEEL, [0, -0.6, 0.01]));
      break;
    case 'crossbow':
      flat.push(gBox(0.05, 0.75, 0.06, WOODC, [0, -0.72, 0]), gBox(0.62, 0.035, 0.03, 0x8a6a3a, [0, -1.06, 0]),
        gBox(0.58, 0.008, 0.008, 0xe8e0c8, [0, -0.9, 0]));
      metal.push(gBox(0.03, 0.05, 0.08, DARKSTEEL, [0, -1.1, 0]));
      break;
    case 'bow': {
      const A = Math.PI * 0.8, R = 0.62;
      flat.push(xf(new THREE.TorusGeometry(R, 0.013, 5, 16, A), [0, -0.6 + R * 0.93, 0], [0, X, -X - A / 2], 1, 0x3a2414));
      flat.push(gBox(0.006, 0.006, 2 * R * Math.sin(A / 2), 0xe8e0c8, [0, -0.6 + R * 0.93 - R * Math.cos(A / 2), 0]));
      break;
    }
    case 'katana':
      flat.push(gBox(0.03, 0.035, 0.26, 0x1a1a22, [0, -0.6, 0.04]), gCyl(0.045, 0.045, 0.012, 0x2a2418, [0, -0.6, 0.175], [X, 0, 0]));
      metal.push(gBox(0.01, 0.034, 0.78, STEEL, [0, -0.6, 0.57], [-0.03, 0, 0]));
      break;
    case 'sword':
      flat.push(gBox(0.03, 0.035, 0.2, 0x3a2414, [0, -0.6, 0.02]), gBox(0.2, 0.03, 0.03, 0x8a7a40, [0, -0.6, 0.14]));
      metal.push(gBox(0.012, 0.055, 0.86, STEEL, [0, -0.6, 0.58]));
      break;
    case 'smg':
      metal.push(gCyl(0.02, 0.02, 0.5, DARKSTEEL, [0, -0.78, 0.02]), gBox(0.03, 0.05, 0.2, DARKSTEEL, [0.09, -0.74, 0.02], [0, Math.PI / 2, 0]), gBox(0.03, 0.2, 0.03, DARKSTEEL, [0, -0.5, 0.0]));
      break;
    case 'spear':
      flat.push(gCyl(0.018, 0.018, 2.3, WOODC, [0, -0.6, 0.45], [X, 0, 0], 1, 6));
      metal.push(gCone(0.036, 0.34, 0xc9a050, [0, -0.6, 1.76], [X, 0, 0], 1, 6), gCone(0.022, 0.14, 0xc9a050, [0, -0.6, -0.76], [-X, 0, 0], 1, 6));
      break;
    case 'javelin':   // points forward when the arm is raised overhead to throw
      flat.push(gCyl(0.013, 0.013, 1.5, WOODC, [0, -0.6, -0.2], [X, 0, 0], 1, 5));
      metal.push(gCone(0.026, 0.2, 0xc9ced6, [0, -0.6, -1.05], [-X, 0, 0], 1, 5));
      break;
    case 'xiphos':
      flat.push(gBox(0.03, 0.035, 0.16, 0x3a2414, [0, -0.6, 0.02]), gBox(0.14, 0.03, 0.03, 0xc9a050, [0, -0.6, 0.11]));
      metal.push(gBox(0.012, 0.06, 0.56, STEEL, [0, -0.6, 0.4]));
      break;
    case 'macuahuitl':  // a wooden blade set with obsidian along both edges
      flat.push(gBox(0.035, 0.075, 0.9, 0x6a4a2a, [0, -0.6, 0.42]), gCyl(0.028, 0.028, 0.2, 0x3a2414, [0, -0.6, -0.05], [X, 0, 0], 1, 6));
      for (let i = 0; i < 6; i++) for (const e of [-1, 1]) flat.push(gBox(0.014, 0.05, 0.1, 0x101014, [0, -0.6 + e * 0.058, 0.18 + i * 0.118]));
      break;
    case 'club':
      flat.push(gCyl(0.085, 0.03, 0.95, 0x5a3a20, [0, -0.6, 0.38], [X, 0, 0], 1, 7));
      break;
    case 'axe':
      flat.push(gCyl(0.018, 0.02, 0.75, WOODC, [0, -0.6, 0.28], [X, 0, 0], 1, 6));
      metal.push(gBox(0.014, 0.2, 0.16, STEEL, [0, -0.68, 0.58]), gBox(0.03, 0.06, 0.07, DARKSTEEL, [0, -0.6, 0.6]));
      break;
    case 'daneaxe':
      flat.push(gCyl(0.02, 0.022, 1.7, WOODC, [0, -0.6, 0.5], [X, 0, 0], 1, 6));
      metal.push(gBox(0.014, 0.36, 0.26, STEEL, [0, -0.74, 1.24]), gBox(0.035, 0.07, 0.09, DARKSTEEL, [0, -0.6, 1.26]));
      break;
    case 'halberd':
      flat.push(gCyl(0.02, 0.02, 2.3, WOODC, [0, -0.6, 0.45], [X, 0, 0], 1, 6));
      metal.push(gBox(0.012, 0.3, 0.24, STEEL, [0, -0.5, 1.42]), gCone(0.03, 0.4, STEEL, [0, -0.6, 1.78], [X, 0, 0], 1, 6),
        gBox(0.012, 0.12, 0.08, STEEL, [0, -0.72, 1.44]));
      break;
  }
}

/** A weapon lying on the ground, to be picked up: the same shapes the enemies carry, laid flat and centred. */
const DROP_PARTS = { revolver: 'revolver', carbine: 'rifle', rifle: 'rifle', sten: 'smg', bow: 'bow', crossbow: 'crossbow', javelin: 'javelin', axe: 'axe', dart: 'javelin' };
export function dropMesh(kind, M) {
  const flat = [], metal = [], g = new THREE.Group();
  if (DROP_PARTS[kind]) weaponParts(DROP_PARTS[kind], flat, metal);
  else if (kind === 'shuriken') for (let i = 0; i < 3; i++) metal.push(gStar(0.1, [i * 0.05 - 0.05, -0.6 + i * 0.012, 0], [0, i * 0.7, Math.PI / 2]));
  else flat.push(xf(new THREE.IcosahedronGeometry(0.11, 0), [0, -0.6, 0], [0.4, 0.2, 0], [1, 0.8, 1.1], 0x8a8478));
  const geos = [flat.length && merge(flat), metal.length && merge(metal)].filter(Boolean);
  const box = new THREE.Box3(); for (const q of geos) { q.rotateX(Math.PI / 2); q.computeBoundingBox(); box.union(q.boundingBox); }
  const c = box.getCenter(new THREE.Vector3());
  geos.forEach((q, i) => { q.translate(-c.x, -c.y, -c.z); const m = new THREE.Mesh(q, geos.length === 2 && i === 1 || !flat.length ? M.metal : M.flat); m.castShadow = true; g.add(m); });
  g.scale.setScalar(1.25);
  return g;
}

/**
 * Build an articulated figure from simple coloured shapes.
 * The result faces +Z; its origin is between the feet.
 */
export function makeHumanoid(M, sp) {
  const S = { skin: 0xd6a37c, hair: 0x2a1a10, shirt: 0x8a3a2a, pants: 0x34425c, boots: 0x2a1c12, belt: 0x1c120a, legR: 0.085, ...sp };
  S.sleeve ??= S.shirt;
  const T = [], AL = [], AR = [], LL = [], LR = [], WM = [], TM = [];
  // torso + head (pivot = hips)
  T.push(gCyl(0.205, 0.165, 0.56, S.shirt, [0, 0.28, 0], [0, 0, 0], [1, 1, 0.64]));
  T.push(gCyl(0.172, 0.172, 0.07, S.belt, [0, 0.02, 0], [0, 0, 0], [1, 1, 0.66]));
  T.push(gCyl(0.05, 0.06, 0.1, S.skin, [0, 0.6, 0]));
  const HY = 0.76;
  if (S.hat !== 'hood' && S.hat !== 'helm' && S.hat !== 'tengai' && S.hat !== 'bull') {
    T.push(gSph(0.125, S.skin, [0, HY, 0], [1, 1.12, 1.04]));
    T.push(gBox(0.03, 0.045, 0.04, S.skin, [0, HY - 0.01, 0.125]));
    T.push(gBox(0.026, 0.016, 0.012, 0x0c0c0c, [0.046, HY + 0.028, 0.119]), gBox(0.026, 0.016, 0.012, 0x0c0c0c, [-0.046, HY + 0.028, 0.119]));
    if (S.hair !== null) T.push(gSph(0.13, S.hair, [0, HY + 0.03, -0.035], [1.02, 1, 1.02]));
    T.push(gBox(0.022, 0.055, 0.04, S.skin, [0.128, HY - 0.005, 0.0]), gBox(0.022, 0.055, 0.04, S.skin, [-0.128, HY - 0.005, 0.0]),        // ears
      gBox(0.052, 0.009, 0.012, S.lip ?? 0x8a4a3c, [0, HY - 0.064, 0.12]));                                                               // mouth
    if (S.hair !== null && S.hat !== 'corinthian') T.push(gBox(0.042, 0.011, 0.012, S.brow ?? S.hair, [0.046, HY + 0.05, 0.121], [0, 0, -0.08]), gBox(0.042, 0.011, 0.012, S.brow ?? S.hair, [-0.046, HY + 0.05, 0.121], [0, 0, 0.08]));
  }
  for (const f of S.face || []) {
    if (f === 'moustache') T.push(gBox(0.1, 0.022, 0.02, S.hair, [0, HY - 0.045, 0.125]), gBox(0.02, 0.05, 0.02, S.hair, [0.055, HY - 0.07, 0.118]), gBox(0.02, 0.05, 0.02, S.hair, [-0.055, HY - 0.07, 0.118]));
    if (f === 'beard') T.push(gSph(0.105, S.hair, [0, HY - 0.075, 0.045], [1.1, 1.05, 0.95]), gBox(0.1, 0.02, 0.02, S.hair, [0, HY - 0.04, 0.127]));
    if (f === 'longbeard') T.push(gSph(0.11, S.hair, [0, HY - 0.08, 0.045], [1.12, 1.1, 0.95]), gCone(0.09, 0.2, S.hair, [0, HY - 0.2, 0.09], [Math.PI, 0, 0], [1, 1, 0.6]), gBox(0.1, 0.02, 0.02, S.hair, [0, HY - 0.04, 0.127]));
    if (f === 'bandana') T.push(gBox(0.21, 0.09, 0.13, S.accent ?? 0x8a1c1c, [0, HY - 0.06, 0.06]), gCone(0.07, 0.12, S.accent ?? 0x8a1c1c, [0, HY - 0.16, 0.1], [Math.PI, 0, 0], [1, 1, 0.4]));
    if (f === 'headband') T.push(gCyl(0.132, 0.132, 0.03, S.accent ?? 0xffffff, [0, HY + 0.05, 0]));
    if (f === 'topknot') T.push(gSph(0.045, S.hair, [0, HY + 0.17, -0.04]));
    if (f === 'longhair') T.push(gSph(0.136, S.hair, [0, HY - 0.01, -0.05], [1.05, 1.25, 0.9]), gBox(0.2, 0.36, 0.07, S.hair, [0, HY - 0.27, -0.125], [0.12, 0, 0]),
      gBox(0.045, 0.3, 0.11, S.hair, [0.122, HY - 0.13, -0.01]), gBox(0.045, 0.3, 0.11, S.hair, [-0.122, HY - 0.13, -0.01]));
    if (f === 'bun') T.push(gSph(0.137, S.hair, [0, HY + 0.008, -0.04], [1.04, 1.1, 0.98]), gSph(0.062, S.hair, [0, HY + 0.03, -0.17]));                                       // hair drawn back into a knot
    if (f === 'plaits') T.push(gSph(0.137, S.hair, [0, HY + 0.002, -0.045], [1.05, 1.16, 0.95]), gCyl(0.03, 0.021, 0.46, S.hair, [0.118, HY - 0.3, 0.118], [-0.1, 0, 0], 1, 6), gCyl(0.03, 0.021, 0.46, S.hair, [-0.118, HY - 0.3, 0.118], [-0.1, 0, 0], 1, 6),
      gSph(0.027, S.tie ?? S.hair, [0.118, HY - 0.5, 0.139]), gSph(0.027, S.tie ?? S.hair, [-0.118, HY - 0.5, 0.139]));                                                         // two long plaits over the shoulders
    if (f === 'kerchief') T.push(gSph(0.14, S.kerchief ?? 0xe6e0d0, [0, HY + 0.022, -0.032], [1.04, 1.06, 1.06]), gCone(0.085, 0.2, S.kerchief ?? 0xe6e0d0, [0, HY - 0.15, -0.105], [Math.PI, 0, 0], [1, 1, 0.5]));   // a headscarf, knotted at the nape
    if (f === 'eyepatch') T.push(gBox(0.062, 0.046, 0.02, 0x0a0a0a, [-0.046, HY + 0.028, 0.124]), gBox(0.272, 0.016, 0.272, 0x0a0a0a, [0, HY + 0.05, 0], [0, 0, 0.22]));
    if (f === 'glasses') T.push(xf(new THREE.TorusGeometry(0.03, 0.006, 4, 10), [0.046, HY + 0.028, 0.127], [0, 0, 0], 1, 0x15151a), xf(new THREE.TorusGeometry(0.03, 0.006, 4, 10), [-0.046, HY + 0.028, 0.127], [0, 0, 0], 1, 0x15151a),
      gBox(0.035, 0.008, 0.008, 0x15151a, [0, HY + 0.032, 0.129]), gBox(0.008, 0.008, 0.12, 0x15151a, [0.078, HY + 0.03, 0.07]), gBox(0.008, 0.008, 0.12, 0x15151a, [-0.078, HY + 0.03, 0.07]));
    if (f === 'baldtop') T.push(gSph(0.126, S.skin, [0, HY + 0.055, 0.012], [0.93, 0.9, 0.95]));
    if (f === 'oneeye') T.push(gBox(0.2, 0.05, 0.03, S.skin, [0, HY + 0.028, 0.115]), gSph(0.05, 0xf4f0e0, [0, HY + 0.04, 0.105], [1, 1, 0.6]), gSph(0.022, 0x101010, [0, HY + 0.04, 0.138]),
      gBox(0.16, 0.022, 0.02, S.hair, [0, HY + 0.1, 0.12]));
    if (f === 'snakes') for (let i = 0; i < 9; i++) { const a = i * 0.7; T.push(gCyl(0.012, 0.02, 0.2, 0x3a7a3a, [Math.cos(a) * 0.12, HY + 0.14 + (i % 3) * 0.02, Math.sin(a) * 0.12 - 0.02], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], 1, 5),
      gSph(0.02, 0x2a5a2a, [Math.cos(a) * 0.2, HY + 0.2 + (i % 3) * 0.02, Math.sin(a) * 0.2 - 0.02])); }
    if (f === 'toothbrush') T.push(gBox(0.04, 0.03, 0.02, S.hair, [0, HY - 0.048, 0.127]), gBox(0.13, 0.05, 0.1, S.hair, [0.035, HY + 0.1, 0.07], [0, 0, -0.3]));
    if (f === 'brows') T.push(gBox(0.075, 0.03, 0.02, 0x14100c, [0.048, HY + 0.06, 0.121]), gBox(0.075, 0.03, 0.02, 0x14100c, [-0.048, HY + 0.06, 0.121]));
    if (f === 'horns') T.push(gCone(0.03, 0.13, 0x2a2018, [0.085, HY + 0.17, 0], [0, 0, -0.3]), gCone(0.03, 0.13, 0x2a2018, [-0.085, HY + 0.17, 0], [0, 0, 0.3]));
    if (f === 'jaw') T.push(gSph(0.1, S.skin, [0, HY - 0.082, 0.028], [1.2, 0.8, 1.06]), gSph(0.045, S.skin, [0, HY - 0.118, 0.095], [1.3, 0.8, 1]));          // heavy jaw and jutting chin
    if (f === 'tie') T.push(gBox(0.036, 0.27, 0.012, S.accent ?? 0x15120f, [0, 0.42, 0.152]), gBox(0.05, 0.04, 0.016, S.accent ?? 0x15120f, [0, 0.565, 0.146]), gBox(0.1, 0.06, 0.012, 0xe8e4d8, [0, 0.572, 0.14]));
    if (f === 'chinbeard') T.push(gSph(0.1, S.hair, [0, HY - 0.095, 0.04], [1.1, 0.85, 0.95]), gBox(0.03, 0.12, 0.05, S.hair, [0.115, HY - 0.05, 0.03]), gBox(0.03, 0.12, 0.05, S.hair, [-0.115, HY - 0.05, 0.03]));   // beard without a moustache
    if (f === 'bigmoustache') T.push(gBox(0.13, 0.036, 0.03, S.hair, [0, HY - 0.044, 0.128]), gBox(0.03, 0.05, 0.025, S.hair, [0.066, HY - 0.06, 0.122], [0, 0, 0.5]), gBox(0.03, 0.05, 0.025, S.hair, [-0.066, HY - 0.06, 0.122], [0, 0, -0.5]));
    if (f === 'pipe') T.push(gCyl(0.008, 0.008, 0.1, 0x3a2414, [0.05, HY - 0.08, 0.165], [1.25, 0, 0.3], 1, 5), gCyl(0.02, 0.016, 0.04, 0x3a2414, [0.066, HY - 0.085, 0.21], [0, 0, 0], 1, 6));
    if (f === 'mole') T.push(gSph(0.012, 0x4a3020, [0.018, HY - 0.092, 0.115]));
    if (f === 'mop') T.push(gSph(0.142, S.hair, [0, HY + 0.062, -0.048], [1.08, 0.95, 1.08]), gBox(0.19, 0.03, 0.05, S.hair, [0.01, HY + 0.112, 0.082], [0, 0, -0.1]), gBox(0.05, 0.14, 0.14, S.hair, [0.125, HY + 0.0, -0.03]), gBox(0.05, 0.14, 0.14, S.hair, [-0.125, HY + 0.0, -0.03]));
    if (f === 'shimada') T.push(gSph(0.14, S.hair, [0, HY + 0.045, -0.03], [1.12, 0.95, 1.08]),                            // a geisha's swept-up hair
      gSph(0.085, S.hair, [0, HY + 0.2, -0.05], [1.25, 0.8, 1]), gSph(0.07, S.hair, [0, HY + 0.07, -0.16], [1.3, 0.9, 0.9]),         // top knot and back loop
      gSph(0.06, S.hair, [0.13, HY + 0.02, -0.02], [0.7, 1.1, 1.2]), gSph(0.06, S.hair, [-0.13, HY + 0.02, -0.02], [0.7, 1.1, 1.2]),
      gCyl(0.006, 0.006, 0.32, 0xd9b23a, [0, HY + 0.2, -0.05], [0, 0, Math.PI / 2], 1, 5),                                           // a long pin through the knot
      gSph(0.03, S.cord ?? 0xc81c2c, [0.09, HY + 0.15, 0.06]), gSph(0.022, 0xf6c6d4, [0.115, HY + 0.115, 0.075]), gBox(0.012, 0.08, 0.012, 0xd9b23a, [0.122, HY + 0.05, 0.085]));
    if (f === 'neckerchief') T.push(gCyl(0.072, 0.075, 0.045, S.accent ?? 0xa81c1c, [0, 0.615, 0]), gCone(0.095, 0.15, S.accent ?? 0xa81c1c, [0, 0.54, 0.095], [Math.PI, 0, 0], [1, 1, 0.45]));
  }
  const HT = HY + 0.105;                     // top of the head
  switch (S.hat) {
    case 'cowboy':
      T.push(gCyl(0.27, 0.27, 0.02, S.hatC, [0, HT - 0.01, 0], [0.06, 0, 0], [1, 1, 1.08], 16), gCyl(0.1, 0.125, 0.15, S.hatC, [0, HT + 0.07, 0], [0.06, 0, 0]),
        gCyl(0.127, 0.127, 0.03, S.hatBand ?? 0x1a1208, [0, HT + 0.015, 0], [0.06, 0, 0]));
      break;
    case 'sombrero':
      T.push(gCyl(0.4, 0.4, 0.02, S.hatC, [0, HT - 0.02, 0], [0, 0, 0], 1, 18), gCyl(0.41, 0.4, 0.045, S.hatBand ?? 0x8a1c1c, [0, HT, 0], [0, 0, 0], 1, 18).scale(1, 1, 1),
        gCyl(0.39, 0.39, 0.05, S.hatC, [0, HT + 0.004, 0], [0, 0, 0], 1, 18), gCyl(0.05, 0.13, 0.22, S.hatC, [0, HT + 0.1, 0]));
      break;
    case 'kasa':
      T.push(gCone(0.33, 0.16, S.hatC ?? 0xc2a35e, [0, HT + 0.04, 0], [0, 0, 0], 1, 16));
      break;
    case 'morion':  // the Spanish helmet: a steel bowl with a comb, its brim curling up fore and aft
      TM.push(gSph(0.142, STEEL, [0, HT - 0.035, 0], [1, 0.95, 1.08]), gBox(0.022, 0.09, 0.3, STEEL, [0, HT + 0.07, 0]),
        gCyl(0.205, 0.205, 0.022, STEEL, [0, HY + 0.045, 0], [0, 0, 0], [0.82, 1, 1.3], 12), gBox(0.1, 0.02, 0.1, STEEL, [0, HY + 0.085, 0.24], [-0.5, 0, 0]), gBox(0.1, 0.02, 0.1, STEEL, [0, HY + 0.085, -0.24], [0.5, 0, 0]));
      if (S.plume) T.push(gCone(0.05, 0.34, S.plume, [0, HT + 0.2, -0.1], [-0.5, 0, 0]));
      break;
    case 'feather': { // a Mexica war headdress: a gold band and a fan of long plumes
      const q = S.hatC ?? 0x1f9a5a;
      T.push(gCyl(0.137, 0.137, 0.06, 0xd9a820, [0, HY + 0.07, 0], [0, 0, 0], 1, 12));
      for (let i = -3; i <= 3; i++) T.push(gBox(0.045, 0.42 - Math.abs(i) * 0.04, 0.012, i % 2 ? q : 0x2ac8c0, [i * 0.055, HT + 0.2 - Math.abs(i) * 0.02, -0.05], [-0.25, 0, -i * 0.2]));
      break;
    }
    case 'diadem':  // the turquoise diadem of a Mexica lord: a band rising to a point over the brow
      T.push(gCyl(0.138, 0.138, 0.07, 0x2ac8c0, [0, HY + 0.07, 0], [0, 0, 0], 1, 12), gCone(0.09, 0.2, 0x2ac8c0, [0, HT + 0.06, 0.085], [0.25, 0, 0], [1, 1, 0.4], 4), gBox(0.03, 0.03, 0.02, 0xd9a820, [0, HY + 0.08, 0.14]));
      break;
    case 'kettle':
      TM.push(gSph(0.14, STEEL, [0, HT - 0.03, 0], [1, 0.75, 1.05]), gCyl(0.23, 0.25, 0.02, STEEL, [0, HT - 0.03, 0], [0, 0, 0], 1, 16));
      T.push(gSph(0.133, 0x8a8f96, [0, HY - 0.01, -0.02], [1.05, 1.15, 1]));   // mail coif
      break;
    case 'helm':
      TM.push(gCyl(0.135, 0.14, 0.27, STEEL, [0, HY + 0.01, 0], [0, 0, 0], 1, 12), gCyl(0.1, 0.135, 0.05, STEEL, [0, HY + 0.17, 0], [0, 0, 0], 1, 12));
      T.push(gBox(0.2, 0.018, 0.05, 0x050505, [0, HY + 0.03, 0.118]), gBox(0.02, 0.12, 0.05, 0x050505, [0, HY - 0.03, 0.12]));
      if (S.plume) T.push(gCone(0.05, 0.35, S.plume, [0, HY + 0.33, -0.05], [-0.4, 0, 0]));
      break;
    case 'kabuto':
      TM.push(gSph(0.145, S.hatC ?? 0x1a1a1e, [0, HT - 0.035, 0], [1, 0.85, 1.05]));
      T.push(gCone(0.26, 0.12, S.hatC ?? 0x1a1a1e, [0, HT - 0.1, -0.05], [0.25, 0, 0], [1, 1, 1.1], 14),
        ...(S.crest ? [xf(new THREE.TorusGeometry(0.21, 0.016, 4, 16, Math.PI * 0.9), [0.02, HT + 0.27, 0.1], [0, 0, Math.PI + 0.42], [1, 1, 0.6], 0xe0b828)]   // great crescent moon
          : [gBox(0.02, 0.2, 0.012, 0xd9b23a, [0.07, HT + 0.1, 0.1], [0, 0, -0.5]), gBox(0.02, 0.2, 0.012, 0xd9b23a, [-0.07, HT + 0.1, 0.1], [0, 0, 0.5])]),
        gBox(0.16, 0.1, 0.02, 0x8a1c1c, [0, HY - 0.07, 0.12]));              // face guard
      break;
    case 'hood':
      T.push(gSph(0.14, S.shirt, [0, HY, 0], [1, 1.12, 1.04]), gBox(0.17, 0.04, 0.03, S.skin, [0, HY + 0.028, 0.118]),
        gBox(0.026, 0.014, 0.012, 0x050505, [0.046, HY + 0.028, 0.135]), gBox(0.026, 0.014, 0.012, 0x050505, [-0.046, HY + 0.028, 0.135]));
      break;
    case 'corinthian': {   // bronze helmet with a horsehair crest
      const bz = S.hatC ?? 0xb8893a, cr = S.plume ?? 0xb01c1c;
      TM.push(gSph(0.148, bz, [0, HY + 0.02, 0], [1, 1.18, 1.1]), gBox(0.03, 0.2, 0.03, bz, [0, HY - 0.06, 0.137]),
        gBox(0.075, 0.2, 0.04, bz, [0.088, HY - 0.08, 0.112]), gBox(0.075, 0.2, 0.04, bz, [-0.088, HY - 0.08, 0.112]));
      T.push(gBox(0.2, 0.03, 0.02, 0x050505, [0, HY + 0.03, 0.152]));
      if (S.crestSide) T.push(gBox(0.52, 0.2, 0.05, cr, [0, HT + 0.15, 0]), gBox(0.52, 0.05, 0.07, bz, [0, HT + 0.05, 0]));
      else T.push(gBox(0.05, 0.2, 0.42, cr, [0, HT + 0.15, -0.03]), gBox(0.05, 0.3, 0.08, cr, [0, HT - 0.0, -0.27], [0.5, 0, 0]));
      break;
    }
    case 'pilos':   // conical felt cap of sailors and travellers
      T.push(gCone(0.15, 0.2, S.hatC ?? 0xe0d4b0, [0, HT + 0.05, 0], [0, 0, 0], 1, 12), gCyl(0.15, 0.156, 0.04, S.hatC ?? 0xe0d4b0, [0, HT - 0.06, 0], [0, 0, 0], 1, 12));
      break;
    case 'lion':    // the Nemean lion's head worn as a hood
      T.push(gSph(0.152, S.hatC ?? 0xc9963a, [0, HY + 0.035, -0.03], [1.08, 1.1, 1.08]), gCone(0.045, 0.09, S.hatC ?? 0xc9963a, [0.09, HT + 0.07, 0]),
        gCone(0.045, 0.09, S.hatC ?? 0xc9963a, [-0.09, HT + 0.07, 0]), gBox(0.2, 0.045, 0.06, 0xf0e8d0, [0, HY + 0.09, 0.12]));
      break;
    case 'nasal':   // conical iron helmet with a nose guard
      TM.push(gSph(0.142, STEEL, [0, HT - 0.035, 0], [1, 0.95, 1.05]), gCone(0.1, 0.12, STEEL, [0, HT + 0.1, 0], [0, 0, 0], 1, 10), gBox(0.03, 0.14, 0.02, STEEL, [0, HY + 0.0, 0.135]),
        gCyl(0.146, 0.146, 0.035, DARKSTEEL, [0, HY + 0.06, 0], [0, 0, 0], [1, 1, 1.05], 12));
      break;
    case 'horned': { // chieftain's helmet: iron bowl, gilt band, two ox horns
      const bone = 0xe8dcc0;
      TM.push(gSph(0.146, STEEL, [0, HT - 0.035, 0], [1, 0.98, 1.05]), gBox(0.03, 0.14, 0.02, STEEL, [0, HY + 0.0, 0.137]),
        gCyl(0.15, 0.15, 0.04, S.hatBand ?? DARKSTEEL, [0, HY + 0.06, 0], [0, 0, 0], [1, 1, 1.05], 12), gCyl(0.02, 0.02, 0.03, S.hatBand ?? DARKSTEEL, [0, HT + 0.1, 0]));
      for (const s of [-1, 1]) T.push(gCyl(0.036, 0.05, 0.13, bone, [s * 0.17, HT + 0.0, 0], [0, 0, -s * 1.15], 1, 7), gCyl(0.024, 0.036, 0.12, bone, [s * 0.25, HT + 0.075, 0], [0, 0, -s * 0.55], 1, 7),
        gCone(0.024, 0.13, bone, [s * 0.285, HT + 0.185, 0], [0, 0, -s * 0.08], 1, 7));
      break;
    }
    case 'fedora':
      T.push(gCyl(0.21, 0.21, 0.018, S.hatC ?? 0x2a2a2e, [0, HT - 0.02, 0.01], [0.07, 0, 0], [1, 1, 1.08], 16), gCyl(0.112, 0.128, 0.12, S.hatC ?? 0x2a2a2e, [0, HT + 0.04, 0], [0.07, 0, 0], [1, 1, 1.1], 12),
        gCyl(0.13, 0.13, 0.028, S.hatBand ?? 0x0c0c0c, [0, HT - 0.0, 0], [0.07, 0, 0], [1, 1, 1.1], 12));
      break;
    case 'ushanka': // fur hat with the flaps tied up
      T.push(gCyl(0.15, 0.156, 0.13, S.hatC ?? 0x5a5a5a, [0, HT - 0.0, 0], [0, 0, 0], [1, 1, 1.06], 12), gBox(0.325, 0.085, 0.2, S.hatC ?? 0x5a5a5a, [0, HT - 0.02, -0.01]),
        gBox(0.17, 0.085, 0.03, S.hatC ?? 0x5a5a5a, [0, HT - 0.0, 0.155]));
      if (S.hatStar) T.push(gBox(0.03, 0.03, 0.012, S.hatStar, [0, HT + 0.005, 0.172]));
      break;
    case 'mao':     // soft field cap with a short visor
      T.push(gCyl(0.146, 0.14, 0.085, S.hatC ?? 0x8a8a4a, [0, HT + 0.0, 0], [0, 0, 0], [1, 1, 1.05], 12), gBox(0.16, 0.012, 0.085, S.hatC ?? 0x8a8a4a, [0, HT - 0.035, 0.15], [0.25, 0, 0]),
        gBox(0.028, 0.028, 0.012, S.hatStar ?? 0xc81c1c, [0, HT + 0.005, 0.15]));
      break;
    case 'furhat':  // Khampa fox-fur hat
      T.push(gSph(0.172, S.hatC ?? 0x8a5a2a, [0, HT - 0.03, -0.01], [1.1, 0.62, 1.1]), gCone(0.1, 0.1, S.hatBand ?? 0xb01c1c, [0, HT + 0.07, 0], [0, 0, 0], 1, 10));
      break;
    case 'crown':   // Tibetan royal turban
      T.push(gCyl(0.152, 0.146, 0.09, 0xf0ece0, [0, HT - 0.01, 0], [0, 0, 0], [1, 1, 1.05], 12), gCyl(0.095, 0.135, 0.15, S.hatC ?? 0xb01c1c, [0, HT + 0.1, 0], [0, 0, 0], 1, 10),
        gCyl(0.155, 0.155, 0.025, 0xd9b23a, [0, HT - 0.05, 0], [0, 0, 0], [1, 1, 1.05], 12), gSph(0.03, 0xd9b23a, [0, HT + 0.19, 0]));
      break;
    case 'fez':     // black fez with a tassel
      T.push(gCyl(0.1, 0.128, 0.15, S.hatC ?? 0x15151a, [0, HT + 0.045, 0], [0, 0, 0], 1, 12), gBox(0.012, 0.11, 0.012, 0xd9b23a, [0.07, HT + 0.07, 0.07]), gCyl(0.02, 0.02, 0.012, 0xd9b23a, [0, HT + 0.125, 0], [0, 0, 0], 1, 6));
      break;
    case 'stahl':   // steel helmet with a flared rim
      T.push(gSph(0.15, S.hatC ?? 0x4a5248, [0, HT - 0.045, -0.005], [1.02, 0.84, 1.1]), gCyl(0.165, 0.175, 0.05, S.hatC ?? 0x4a5248, [0, HY + 0.035, -0.02], [0.08, 0, 0], [1, 1, 1.1], 14));
      break;
    case 'peaked':  // officer's peaked cap
      T.push(gCyl(0.165, 0.14, 0.07, S.hatC ?? 0x5a6258, [0, HT + 0.03, 0], [0.12, 0, 0], 1, 14), gCyl(0.138, 0.136, 0.05, S.hatBand ?? 0x2a3a2e, [0, HT - 0.025, 0], [0, 0, 0], 1, 14),
        gBox(0.17, 0.012, 0.09, 0x0c0c0c, [0, HT - 0.05, 0.14], [0.3, 0, 0]));
      break;
    case 'pilotka': // side cap
      T.push(gBox(0.13, 0.07, 0.25, S.hatC ?? 0x6a6a3a, [0, HT + 0.0, -0.01], [0, 0, 0.12]), gBox(0.022, 0.022, 0.012, 0xc81c1c, [0, HT + 0.0, 0.118]));
      break;
    case 'beret':
      T.push(gSph(0.15, S.hatC ?? 0x1a1a22, [0.015, HT - 0.015, -0.01], [1.08, 0.45, 1.08]));
      break;
    case 'felt':   // medieval felt hat with a feather
      T.push(gCyl(0.19, 0.2, 0.02, S.hatC, [0, HT - 0.01, 0.02], [0.1, 0, 0], [1, 1, 1.25], 14), gCone(0.14, 0.2, S.hatC, [0, HT + 0.08, -0.01], [-0.25, 0, 0], 1, 12),
        gBox(0.012, 0.3, 0.05, S.plume ?? 0xffffff, [0.1, HT + 0.14, -0.06], [-0.5, 0, 0.2]));
      break;
    case 'bull': {  // the Minotaur's head
      const c = S.hatC ?? 0x4a2c1a, bone = 0xe8dcc0;
      T.push(gSph(0.16, c, [0, HY + 0.01, -0.01], [1.05, 1.1, 1.1]), gBox(0.17, 0.13, 0.2, c, [0, HY - 0.06, 0.16]), gBox(0.18, 0.06, 0.05, 0x2a1810, [0, HY - 0.085, 0.262]),
        gBox(0.035, 0.025, 0.02, 0xd81c1c, [0.075, HY + 0.045, 0.148]), gBox(0.035, 0.025, 0.02, 0xd81c1c, [-0.075, HY + 0.045, 0.148]),
        gBox(0.09, 0.05, 0.03, c, [0.2, HY + 0.05, -0.02], [0, 0, 0.3]), gBox(0.09, 0.05, 0.03, c, [-0.2, HY + 0.05, -0.02], [0, 0, -0.3]),
        xf(new THREE.TorusGeometry(0.035, 0.008, 4, 10), [0, HY - 0.12, 0.262], [0, 0, 0], 1, 0xd9b23a), gSph(0.1, c, [0, HY - 0.1, -0.02], [1.5, 1, 1.2]));
      for (const s of [-1, 1]) T.push(gCyl(0.03, 0.045, 0.14, bone, [s * 0.2, HT + 0.02, 0], [0, 0, -s * 1.2], 1, 7), gCone(0.03, 0.2, bone, [s * 0.29, HT + 0.13, 0], [0, 0, -s * 0.25], 1, 7));
      break;
    }
    case 'tiara':   // tall Persian crown
      T.push(gCyl(0.15, 0.135, 0.2, S.hatC ?? 0xd9b23a, [0, HT + 0.07, 0], [0, 0, 0], 1, 12), gCyl(0.14, 0.14, 0.04, 0x5a2a7a, [0, HT - 0.01, 0], [0, 0, 0], 1, 12), gCyl(0.156, 0.156, 0.025, 0xb01c1c, [0, HT + 0.165, 0], [0, 0, 0], 1, 12));
      break;
    case 'tengai': { // the komuso's basket of woven reed, worn over the whole head
      const c = S.hatC ?? 0xcdb682, d = 0xa48c58, rr = (dy) => 0.165 + 0.025 * (dy + 0.16) / 0.36;
      T.push(gCyl(0.19, 0.165, 0.36, c, [0, HY + 0.02, 0], [0, 0, 0], 1, 14), gCyl(0.193, 0.193, 0.02, d, [0, HY + 0.2, 0], [0, 0, 0], 1, 14));
      for (const dy of [-0.14, -0.07, 0.11, 0.16]) T.push(gCyl(rr(dy) + 0.003, rr(dy) + 0.003, 0.012, d, [0, HY + dy, 0], [0, 0, 0], 1, 14));
      T.push(gBox(0.2, 0.075, 0.02, 0x8a7446, [0, HY + 0.02, 0.172]));                 // the open weave he looks through
      break;
    }
    case 'wataboshi': // white silk hood
      T.push(gSph(0.168, S.hatC ?? 0xf4f0ea, [0, HY + 0.05, -0.07], [1.08, 1.1, 1.0]), gBox(0.3, 0.24, 0.05, S.hatC ?? 0xf4f0ea, [0, HY - 0.17, -0.15], [0.2, 0, 0]));
      break;
    case 'cowl':   // herdsman's hood
      T.push(gSph(0.142, S.hatC, [0, HY + 0.02, -0.03], [1.05, 1.1, 1.05]), gCone(0.25, 0.22, S.hatC, [0, HY - 0.2, 0], [0, 0, 0], [1, 1, 0.75], 12));
      break;
  }
  for (const e of S.extras || []) {
    if (e === 'vest') T.push(gBox(0.15, 0.44, 0.285, S.vest ?? 0x2a2018, [0.125, 0.3, 0]), gBox(0.15, 0.44, 0.285, S.vest ?? 0x2a2018, [-0.125, 0.3, 0]));
    if (e === 'poncho') {
      const pc = S.poncho ?? 0xa8522a, p2 = S.poncho2 ?? 0xe8d8a0, q = Math.PI / 4;
      T.push(gCyl(0.1, 0.36, 0.3, pc, [0, 0.43, 0], [0, 0, 0], [1, 1, 0.72], 12), gCyl(0.36, 0.47, 0.2, pc, [0, 0.2, 0], [0, q, 0], 1, 4),
        gCyl(0.47, 0.5, 0.05, p2, [0, 0.08, 0], [0, q, 0], 1, 4), gCyl(0.5, 0.52, 0.05, pc, [0, 0.03, 0], [0, q, 0], 1, 4), gCyl(0.42, 0.44, 0.04, p2, [0, 0.2, 0], [0, q, 0], 1, 4),
        gCyl(0.09, 0.13, 0.06, p2, [0, 0.58, 0], [0, 0, 0], [1, 1, 0.8], 10));
    }
    if (e === 'bandolier') T.push(gBox(0.5, 0.05, 0.3, 0x3a2414, [0, 0.32, 0], [0, 0, 0.9]));
    if (e === 'coat') T.push(gCyl(0.215, 0.26, 0.62, S.coat ?? 0x15120f, [0, -0.2, -0.03], [0, 0, 0], [1, 1, 0.6], 10), gCyl(0.215, 0.215, 0.56, S.coat ?? 0x15120f, [0, 0.29, -0.012], [0, 0, 0], [1.03, 1, 0.66]));
    if (e === 'star') T.push(gCyl(0.03, 0.03, 0.01, 0xd9b23a, [0.09, 0.4, 0.125], [Math.PI / 2, 0, 0], 1, 5));
    if (e === 'obi') T.push(gCyl(0.19, 0.185, 0.1, S.accent ?? 0x1a1a1a, [0, 0.07, 0], [0, 0, 0], [1, 1, 0.68]));
    if (e === 'kimono') T.push(gBox(0.05, 0.5, 0.02, S.trim ?? 0xe8e0d0, [0.05, 0.36, 0.125], [0, 0, 0.32]), gBox(0.05, 0.5, 0.02, S.trim ?? 0xe8e0d0, [-0.05, 0.36, 0.125], [0, 0, -0.32]));
    if (e === 'hakama') T.push(gCyl(0.175, 0.3, 0.72, S.pants, [0, -0.36, 0], [0, 0, 0], [1, 1, 0.62], 10));
    if (e === 'armor') T.push(gBox(0.4, 0.34, 0.3, S.armor ?? 0x7a1c1c, [0, 0.3, 0]), gBox(0.16, 0.05, 0.3, S.armor ?? 0x7a1c1c, [0.3, 0.52, 0]), gBox(0.16, 0.05, 0.3, S.armor ?? 0x7a1c1c, [-0.3, 0.52, 0]),
      gBox(0.42, 0.26, 0.31, S.armor2 ?? 0x1a1a1e, [0, -0.16, 0]));
    if (e === 'tabard') {      // red-white-red surcoat
      const cs = S.tabard ?? [0xb01c1c, 0xf0ece0, 0xb01c1c];
      cs.forEach((c, i) => T.push(gBox(0.37, 0.28, 0.3, c, [0, 0.42 - i * 0.28, 0])));
    }
    if (e === 'lion') T.push(gBox(0.37, 0.84, 0.3, 0xe0b020, [0, 0.14, 0]), gBox(0.16, 0.3, 0.02, 0xb01c1c, [0, 0.28, 0.152]), gBox(0.08, 0.1, 0.02, 0xb01c1c, [0.06, 0.48, 0.152]));
    if (e === 'cape') T.push(gBox(0.5, 1.05, 0.03, S.cape ?? 0x8a1414, [0, 0.0, -0.17], [0.12, 0, 0]));
    if (e === 'smock') T.push(gCyl(0.21, 0.27, 0.5, S.shirt, [0, -0.14, 0], [0, 0, 0], [1, 1, 0.64], 10));
    if (e === 'quiver') T.push(gCyl(0.05, 0.045, 0.5, 0x4a2c14, [0.1, 0.3, -0.16], [0, 0, -0.4]), gBox(0.06, 0.1, 0.02, 0xe8e0d0, [0.2, 0.56, -0.16], [0, 0, -0.4]));
    if (e === 'cuirass') T.push(gCyl(0.218, 0.186, 0.5, S.armor ?? 0xb8893a, [0, 0.31, 0], [0, 0, 0], [1, 1, 0.68], 10), gBox(0.2, 0.03, 0.02, 0x8a6424, [0, 0.36, 0.13]));
    if (e === 'kilt') T.push(gCyl(0.19, 0.275, 0.34, S.kilt ?? 0xe8e0d0, [0, -0.13, 0], [0, 0, 0], [1, 1, 0.66], 10), gCyl(0.276, 0.28, 0.04, S.kilt2 ?? 0x8a6424, [0, -0.29, 0], [0, 0, 0], [1, 1, 0.66], 10));
    if (e === 'lionskin') T.push(gBox(0.5, 0.95, 0.04, S.hatC ?? 0xc9963a, [0, 0.04, -0.17], [0.1, 0, 0]), gBox(0.09, 0.3, 0.05, S.hatC ?? 0xc9963a, [0.12, 0.44, 0.125], [0, 0, 0.55]),
      gBox(0.09, 0.3, 0.05, S.hatC ?? 0xc9963a, [-0.12, 0.44, 0.125], [0, 0, -0.55]));
    if (e === 'fur') T.push(gBox(0.52, 0.95, 0.05, S.fur ?? 0x5a4632, [0, 0.03, -0.175], [0.1, 0, 0]), gCyl(0.25, 0.27, 0.13, S.fur2 ?? 0x8a7458, [0, 0.52, -0.02], [0, 0, 0], [1, 1, 0.8], 9));
    if (e === 'pelt') {       // dressed in animal skins: shaggy fur over the shoulders, paws down the chest, a ragged pelt on the back, a fur kilt
      const f1 = S.fur ?? 0x5a4632, f2 = S.fur2 ?? 0x8a7458, hide = S.hide ?? 0x3a2a1c, DK = 0x15120f;
      T.push(gCyl(0.19, 0.25, 0.1, f2, [0, 0.55, -0.01], [0, 0, 0], [1, 1, 0.8], 9));                                                   // a ruff round the neck
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; T.push(gCone(0.105, 0.27, i % 2 ? f1 : f2, [Math.sin(a) * 0.25, 0.47, Math.cos(a) * 0.15 - 0.01], [2.0, a, 0], 1, 5)); }   // tufts of fur standing out over the shoulders
      T.push(gBox(0.1, 0.36, 0.05, f1, [0.17, 0.3, 0.14], [0, 0, 0.12]), gBox(0.1, 0.36, 0.05, f1, [-0.17, 0.3, 0.14], [0, 0, -0.12]),     // the forelegs of the skin hang down the chest,
        gBox(0.12, 0.075, 0.06, f2, [0.195, 0.11, 0.145]), gBox(0.12, 0.075, 0.06, f2, [-0.195, 0.11, 0.145]),                             // each ending in a paw
        gBox(0.56, 0.74, 0.06, f1, [0, 0.12, -0.185], [0.1, 0, 0]),                                                                   // the pelt on the back,
        gBox(0.21, 0.44, 0.05, f1, [0.15, -0.4, -0.215], [0.15, 0, 0.09]), gBox(0.19, 0.34, 0.05, f1, [-0.16, -0.35, -0.215], [0.15, 0, -0.1]),   // hanging in two uneven flaps
        gCyl(0.032, 0.012, 0.3, f2, [0.01, -0.66, -0.235], [0.2, 0, 0], 1, 5),                                                        // with the tail still on it
        gCyl(0.215, 0.29, 0.26, f1, [0, -0.13, 0], [0, 0, 0], [1, 1, 0.68], 9),                                                       // a fur kilt
        gCyl(0.222, 0.222, 0.05, hide, [0, 0.03, 0], [0, 0, 0], [1, 1, 0.7], 10), gBox(0.06, 0.07, 0.02, 0x9a8a5a, [0, 0.03, 0.157]));        // a hide belt and its buckle
      for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; T.push(gCone(0.075, 0.2, i % 2 ? f2 : f1, [Math.sin(a) * 0.27, -0.33, Math.cos(a) * 0.185], [Math.PI, a, 0], 1, 4)); }   // its hem torn into points
      if (S.peltHead) T.push(gBox(0.17, 0.13, 0.19, f1, [-0.3, 0.61, 0.0]), gBox(0.1, 0.075, 0.13, f2, [-0.3, 0.585, 0.15]), gBox(0.045, 0.03, 0.03, DK, [-0.3, 0.6, 0.215]),   // the beast's head on the left shoulder:
        gBox(0.022, 0.022, 0.02, DK, [-0.345, 0.635, 0.095]), gBox(0.022, 0.022, 0.02, DK, [-0.255, 0.635, 0.095]),                                                          // skull, muzzle, nose, eyes,
        gCone(0.038, 0.08, f1, [-0.355, 0.705, -0.03], [0, 0, 0], 1, 4), gCone(0.038, 0.08, f1, [-0.245, 0.705, -0.03], [0, 0, 0], 1, 4));                                   // and two ears
    }
    if (e === 'braids') T.push(gCyl(0.022, 0.016, 0.26, S.hair, [0.07, HY - 0.2, 0.09], [0.1, 0, 0], 1, 5), gCyl(0.022, 0.016, 0.26, S.hair, [-0.07, HY - 0.2, 0.09], [0.1, 0, 0], 1, 5));
    if (e === 'dress') T.push(gCyl(0.19, 0.33, 0.86, S.dress ?? S.shirt, [0, -0.42, 0], [0, 0, 0], [1, 1, 0.7], 12), gCyl(0.2, 0.19, 0.1, S.dress ?? S.shirt, [0, 0.05, 0], [0, 0, 0], [1, 1, 0.68], 10),    // a skirt to the ankles,
      gSph(0.11, S.bodice ?? S.shirt, [0, 0.37, 0.05], [1.45, 0.75, 0.72]), gCyl(0.332, 0.337, 0.05, S.hem ?? S.dress ?? S.shirt, [0, -0.83, 0], [0, 0, 0], [1, 1, 0.7], 12));                               // a fitted bodice, a band at the hem
    if (e === 'apron') { const ac = S.apron ?? 0xe6e0d0; T.push(gBox(0.3, 0.62, 0.02, ac, [0, -0.3, 0.182], [-0.114, 0, 0]), gBox(0.37, 0.05, 0.26, ac, [0, 0.04, 0]));
      if (S.bib) T.push(gBox(0.22, 0.27, 0.02, ac, [0, 0.2, 0.138]));
      (S.stripes || []).forEach((c, i, all) => { const st = 0.62 / all.length, yy = 0.01 - (i + 0.5) * st; T.push(gBox(0.304, st * 0.7, 0.022, c, [0, yy, 0.185 - (yy + 0.3) * 0.114], [-0.114, 0, 0])); }); }      // woven bands across it
    if (e === 'collar') T.push(gBox(0.11, 0.15, 0.02, S.collar ?? 0xf0ece0, [0, 0.47, 0.126]), gCyl(0.075, 0.1, 0.05, S.collar ?? 0xf0ece0, [0, 0.575, 0], [0, 0, 0], [1, 1, 0.85], 9));               // a blouse showing at the neck
    if (e === 'brooches') { const bc = S.brooch ?? 0xc9a050, sc = S.strap ?? S.dress ?? S.shirt;                                                            // shoulder straps pinned by two brooches, a string of beads between them
      T.push(gBox(0.035, 0.24, 0.02, sc, [0.085, 0.4, 0.12], [-0.25, 0, 0]), gBox(0.035, 0.24, 0.02, sc, [-0.085, 0.4, 0.12], [-0.25, 0, 0]), gSph(0.03, bc, [0.085, 0.42, 0.135], [1, 1.3, 0.5]), gSph(0.03, bc, [-0.085, 0.42, 0.135], [1, 1.3, 0.5]),
        gBox(0.15, 0.016, 0.014, S.beads ?? bc, [0, 0.395, 0.14])); }
    if (e === 'shawl') T.push(gCyl(0.15, 0.262, 0.2, S.shawl ?? 0x6a4a3a, [0, 0.45, -0.005], [0, 0, 0], [1, 1, 0.7], 12), gCyl(0.262, 0.25, 0.1, S.shawl ?? 0x6a4a3a, [0, 0.3, -0.005], [0, 0, 0], [1, 1, 0.7], 12));      // a shawl over the shoulders
    if (e === 'robe') T.push(gCyl(0.185, 0.3, 0.8, S.robe ?? S.pants, [0, -0.39, 0], [0, 0, 0], [1, 1, 0.64], 10), gBox(0.52, 0.1, 0.32, S.sash ?? S.robe ?? S.pants, [0, 0.34, 0], [0, 0, 0.78]),
      gCyl(0.2, 0.19, 0.12, S.robe ?? S.pants, [0, 0.06, 0], [0, 0, 0], [1, 1, 0.68], 10));
    if (e === 'chuba') T.push(gCyl(0.22, 0.31, 0.72, S.coat ?? 0x5a3a26, [0, -0.3, -0.01], [0, 0, 0], [1, 1, 0.64], 10), gCyl(0.222, 0.222, 0.56, S.coat ?? 0x5a3a26, [0, 0.29, -0.012], [0, 0, 0], [1.04, 1, 0.68]),
      gCyl(0.313, 0.318, 0.05, S.fur2 ?? 0xb89a70, [0, -0.64, -0.01], [0, 0, 0], [1, 1, 0.64], 10), gCyl(0.1, 0.19, 0.08, S.fur2 ?? 0xb89a70, [0, 0.57, -0.01], [0, 0, 0], [1, 1, 0.8], 9),
      gCyl(0.228, 0.228, 0.08, S.accent ?? 0xb8862a, [0, 0.05, -0.01], [0, 0, 0], [1.04, 1, 0.68], 10), gBox(0.06, 0.5, 0.02, S.fur2 ?? 0xb89a70, [0.04, 0.33, 0.148], [0, 0, 0.3]));
    if (e === 'belted') T.push(gCyl(0.224, 0.224, 0.05, S.belt2 ?? 0x14120f, [0, 0.07, -0.012], [0, 0, 0], [1.04, 1, 0.67], 10), gBox(0.05, 0.05, 0.02, 0xb8a050, [0, 0.07, 0.143]),
      gBox(0.09, 0.14, 0.02, S.coat ?? 0x15120f, [0.07, 0.5, 0.135], [0, 0, 0.5]), gBox(0.09, 0.14, 0.02, S.coat ?? 0x15120f, [-0.07, 0.5, 0.135], [0, 0, -0.5]));
    if (e === 'scarf') T.push(gCyl(0.085, 0.09, 0.07, S.scarf ?? 0xf0ece0, [0, 0.6, 0], [0, 0, 0], [1, 1, 0.9], 9), gBox(0.07, 0.42, 0.025, S.scarf ?? 0xf0ece0, [0.06, 0.38, 0.14]));
    if (e === 'tabs') T.push(gBox(0.05, 0.03, 0.02, 0xc81c1c, [0.06, 0.575, 0.105]), gBox(0.05, 0.03, 0.02, 0xc81c1c, [-0.06, 0.575, 0.105]));
    if (e === 'medals') { for (let i = 0; i < 6; i++) T.push(gBox(0.034, 0.03, 0.012, [0xc81c1c, 0xd9b23a, 0x2a5ac8][i % 3], [0.05 + (i % 3) * 0.04, 0.45 - Math.floor(i / 3) * 0.04, 0.146])); T.push(gCyl(0.022, 0.022, 0.01, 0xd9b23a, [-0.09, 0.44, 0.146], [Math.PI / 2, 0, 0], 1, 5)); }
    if (e === 'chain') T.push(gBox(0.28, 0.024, 0.02, 0xd9b23a, [0, 0.5, 0.146]), gSph(0.03, 0xd9b23a, [0, 0.45, 0.15]));
    if (e === 'belly') T.push(gSph(0.2, S.coat ?? S.shirt, [0, 0.17, 0.035], [1.03, 0.92, 0.53]));
    if (e === 'epaulettes') T.push(gBox(0.15, 0.03, 0.13, 0xd9b23a, [0.265, 0.565, 0]), gBox(0.15, 0.03, 0.13, 0xd9b23a, [-0.265, 0.565, 0]));
    if (e === 'sash') T.push(gBox(0.52, 0.075, 0.33, S.sash ?? 0xb01c1c, [0, 0.32, 0], [0, 0, 0.85]));
    if (e === 'shakuhachi') T.push(gCyl(0.017, 0.021, 0.56, 0xb89a5a, [0, 0.45, 0.3], [-0.68, 0, 0], 1, 7), gCyl(0.024, 0.024, 0.025, 0x6a5430, [0, 0.256, 0.457], [-0.68, 0, 0], 1, 7),   // bamboo flute, held to the mouth
      gBox(0.13, 0.09, 0.06, 0x3a2618, [0.02, 0.26, 0.15]), gBox(0.012, 0.3, 0.012, 0xe8e0d0, [0.07, 0.42, 0.13], [0, 0, 0.25]));                                                          // alms box on its cord
    if (e === 'kosode') T.push(gCyl(0.19, 0.235, 0.86, S.robe ?? S.shirt, [0, -0.42, 0], [0, 0, 0], [1, 1, 0.62], 12), gCyl(0.238, 0.24, 0.07, S.hem ?? 0xb01c2c, [0, -0.83, 0], [0, 0, 0], [1, 1, 0.62], 12),   // narrow kimono to the ankles, coloured hem
      gCyl(0.208, 0.2, 0.2, S.accent ?? 0xc9a84a, [0, 0.15, 0], [0, 0, 0], [1, 1, 0.66], 12), gBox(0.3, 0.26, 0.1, S.accent ?? 0xc9a84a, [0, 0.2, -0.17]),                                                   // wide obi, knotted behind
      gCyl(0.211, 0.211, 0.025, S.cord ?? 0xb01c2c, [0, 0.15, 0], [0, 0, 0], [1, 1, 0.66], 12),
      gBox(0.05, 0.42, 0.02, S.trim ?? 0xb01c2c, [0.045, 0.42, 0.128], [0, 0, 0.3]), gBox(0.05, 0.42, 0.02, S.trim ?? 0xb01c2c, [-0.045, 0.42, 0.128], [0, 0, -0.3]));
    if (e === 'wagasa') { // oil-paper umbrella resting on the right shoulder
      const r = [-0.541, 0, -0.039], d = [0.039, 0.857, -0.514], at = (k) => [-0.12 + d[0] * k, 1.2 + d[1] * k, -0.3 + d[2] * k], c1 = S.umbrella ?? 0xb01c2c;
      T.push(gCyl(0.011, 0.011, 1.4, 0x8a6a3a, [-0.1475, 0.6, 0.06], r, 1, 6), gCone(0.64, 0.19, c1, at(-0.02), r, 1, 20), gCyl(0.354, 0.474, 0.036, S.umbrella2 ?? 0xf0e8d8, at(-0.043), r, 1, 20),
        gCyl(0.03, 0.055, 0.07, 0x2a2018, at(0.1), r, 1, 8), gCyl(0.05, 0.05, 0.1, 0x2a2018, at(-0.16), r, 1, 8));
      for (let i = 0; i < 10; i++) T.push(xf(gBox(1.27, 0.008, 0.012, 0x3a2a1c, [0, 0, 0], [0, i * Math.PI / 10, 0]), at(-0.121), r));   // the ribs, seen from below
    }
    if (e === 'scabbard') T.push(gBox(0.03, 0.05, 0.8, 0x15151a, [-0.19, 0.02, -0.12], [0.5, 0, 0]));
  }
  // limbs (pivot = shoulder / hip, limb hangs down -Y)
  for (const A of [AL, AR]) {
    A.push(gCap(S.armR ?? 0.062, 0.5, S.sleeve, [0, -0.27, 0]), gSph(0.06, S.glove ?? S.skin, [0, -0.6, 0]));
    if (S.wideSleeve) A.push(gBox(0.11, 0.3, 0.2, S.sleeve, [0, -0.36, -0.03]));
    if (S.cuff) A.push(gCyl(0.07, 0.066, 0.1, S.cuff, [0, -0.5, 0]));
  }
  if (S.armband) AL.push(gCyl(0.07, 0.07, 0.08, S.armband, [0, -0.16, 0]));
  for (const L of [LL, LR]) {
    L.push(gCap(S.legR, 0.72, S.pants, [0, -0.41, 0]), gBox(0.13, 0.13, 0.28, S.boots, [0, -0.855, 0.045]));
    if (S.bootTop) L.push(gCyl(0.1, 0.09, 0.3, S.boots, [0, -0.66, 0]));
  }
  weaponParts(S.weapon, AR, WM);
  if (S.weapon2 === 'revolver') { const f = [], m = []; weaponParts('revolver', f, m); AL.push(...f, ...m); }
  if (S.aspis !== undefined) {
    AL.push(gCyl(0.37, 0.37, 0.04, S.aspis, [0.03, -0.42, 0.13], [Math.PI / 2, 0, 0], 1, 16), gCyl(0.07, 0.07, 0.07, S.aspisBoss ?? 0xc9a050, [0.03, -0.42, 0.15], [Math.PI / 2, 0, 0], 1, 8));
    if (S.lambda) AL.push(gBox(0.045, 0.36, 0.012, S.lambda, [0.105, -0.44, 0.153], [0, 0, 0.3]), gBox(0.045, 0.36, 0.012, S.lambda, [-0.045, -0.44, 0.153], [0, 0, -0.3]));
    if (S.aspis2 !== undefined) AL.push(gBox(0.7, 0.09, 0.012, S.aspis2, [0.03, -0.42, 0.153]), gBox(0.09, 0.7, 0.012, S.aspis2, [0.03, -0.42, 0.153]));
  }
  if (S.shield) AL.push(gBox(0.05, 0.56, 0.42, S.shield, [0.08, -0.45, 0.05]), gBox(0.02, 0.5, 0.1, 0xf0ece0, [0.11, -0.45, 0.05]));

  const mat = M.flat.clone(); mat.userData.keep = false;
  const mk = (list, m = mat) => { const o = new THREE.Mesh(merge(list), m); o.castShadow = true; o.receiveShadow = true; return o; };
  const group = new THREE.Group(); group.rotation.order = 'YXZ';
  const hips = new THREE.Group(); hips.position.y = 0.92; group.add(hips);
  hips.add(mk(T));
  if (TM.length) hips.add(mk(TM, M.metal));
  const armL = mk(AL), armR = mk(AR), legL = mk(LL), legR = mk(LR);
  armL.position.set(0.275, 0.5, 0); armR.position.set(-0.275, 0.5, 0);
  legL.position.set(0.1, 0.92, 0); legR.position.set(-0.1, 0.92, 0);
  hips.add(armL, armR); group.add(legL, legR);
  if (WM.length) armR.add(mk(WM, M.metal));
  group.scale.setScalar(S.scale || 1);
  return { group, hips, armL, armR, legL, legR, mat, scale: S.scale || 1 };
}

/**
 * A horseman: a figure lifted into the saddle of a horse. The rig's two "legs" are the horse's fore and hind pairs, so the walk cycle
 * moves the horse; the rider's own legs hang astride and stay still. Faces +Z.
 */
export function makeRider(M, sp) {
  const man = makeHumanoid(M, sp), g = man.group, mat = man.mat, X = Math.PI / 2, coat = sp.horse ?? 0x5a3a22, dark = 0x1a120c, UP = 0.8;
  const mk = (list) => { const o = new THREE.Mesh(merge(list), mat); o.castShadow = true; o.receiveShadow = true; return o; };
  man.hips.position.y += UP;
  for (const [L, e] of [[man.legL, 1], [man.legR, -1]]) { L.position.set(e * 0.3, 0.92 + UP, 0.02); L.rotation.set(-0.5, 0, e * 0.55); }
  g.add(mk([gCap(0.36, 1.1, coat, [0, 1.35, 0], [X, 0, 0], [1, 1, 1.1]), gCap(0.17, 0.75, coat, [0, 1.95, 0.85], [0.75, 0, 0]), gCap(0.14, 0.36, coat, [0, 2.28, 1.3], [1.85, 0, 0]), gBox(0.2, 0.2, 0.2, dark, [0, 2.17, 1.55]),
    gCone(0.05, 0.14, coat, [0.09, 2.5, 1.12]), gCone(0.05, 0.14, coat, [-0.09, 2.5, 1.12]), gBox(0.06, 0.7, 0.12, dark, [0, 2.1, 0.72], [0.75, 0, 0]), gCone(0.1, 0.9, dark, [0, 1.1, -1.0], [-2.7, 0, 0]),
    gBox(0.5, 0.07, 0.62, 0x7a1c1c, [0, 1.73, -0.05]), gBox(0.78, 0.46, 0.05, 0x7a1c1c, [0, 1.47, -0.05], [0, X, 0])]));                      // the horse, with a red saddle cloth
  const pair = () => mk([gCap(0.075, 0.9, coat, [0.2, -0.5, 0]), gCap(0.075, 0.9, coat, [-0.2, -0.5, 0]), gBox(0.14, 0.12, 0.16, dark, [0.2, -1.0, 0]), gBox(0.14, 0.12, 0.16, dark, [-0.2, -1.0, 0])]);
  const fore = pair(), hind = pair(); fore.position.set(0, 1.06, 0.62); hind.position.set(0, 1.06, -0.65); g.add(fore, hind);
  return { group: g, hips: man.hips, armL: man.armL, armR: man.armR, legL: fore, legR: hind, mat, scale: man.scale };
}

/** Guard dog: same rig interface as a figure, so the enemy code can drive it. Faces +Z. */
export function makeDog(M) {
  const BK = 0x241c14, TAN = 0xa87a48, X = Math.PI / 2;
  const body = merge([gCap(0.17, 0.5, BK, [0, 0.52, 0], [X, 0, 0], [1, 1.05, 1]), gCap(0.15, 0.2, TAN, [0, 0.47, 0.12], [X, 0, 0]), gCap(0.1, 0.18, BK, [0, 0.66, 0.42], [0.9, 0, 0]),
    gSph(0.12, BK, [0, 0.8, 0.52], [1, 0.95, 1.15]), gBox(0.09, 0.08, 0.17, TAN, [0, 0.76, 0.66]), gBox(0.05, 0.03, 0.03, 0x0a0a0a, [0, 0.78, 0.75]),
    gCone(0.04, 0.11, BK, [0.065, 0.93, 0.5]), gCone(0.04, 0.11, BK, [-0.065, 0.93, 0.5]), gCap(0.035, 0.34, BK, [0, 0.48, -0.5], [-0.9, 0, 0])]);
  const legs = () => merge([gCap(0.045, 0.34, TAN, [0.1, -0.22, 0]), gCap(0.045, 0.34, TAN, [-0.1, -0.22, 0]), gBox(0.07, 0.05, 0.1, BK, [0.1, -0.45, 0.02]), gBox(0.07, 0.05, 0.1, BK, [-0.1, -0.45, 0.02])]);
  const mat = M.flat.clone(); mat.userData.keep = false;
  const mk = (g) => { const o = new THREE.Mesh(g, mat); o.castShadow = true; o.receiveShadow = true; return o; };
  const group = new THREE.Group(); group.rotation.order = 'YXZ';
  const hips = new THREE.Group(); group.add(hips); hips.add(mk(body));
  const armL = new THREE.Object3D(), armR = new THREE.Object3D(); hips.add(armL, armR);
  const legL = mk(legs()), legR = mk(legs()); legL.position.set(0, 0.48, 0.3); legR.position.set(0, 0.48, -0.3); group.add(legL, legR);
  return { group, hips, armL, armR, legL, legR, mat, scale: 1 };
}

// --- looks -------------------------------------------------------------------
const SKINS = [0xd6a37c, 0xc68e63, 0xe0b48e, 0xb07a52];
export function lookFor(type, r) {
  const pick = (a) => a[Math.floor(r() * a.length)];
  switch (type) {
    case 'cowboy': return { skin: pick(SKINS), hair: pick([0x2a1a10, 0x4a3018, 0x1a1210]), shirt: pick([0x8a2c22, 0x3a5a7a, 0x8a7a52, 0x4a5a3a]), pants: pick([0x33415c, 0x4a3c2c, 0x2c3440]),
      hat: 'cowboy', hatC: pick([0x3a2a1a, 0x1a1612, 0x8a7250, 0x5a3c22]), extras: r() < 0.6 ? ['vest'] : [], vest: pick([0x2a2018, 0x4a3520, 0x1c1c22]),
      face: r() < 0.5 ? ['bandana'] : r() < 0.6 ? ['moustache'] : [], accent: pick([0x8a1c1c, 0x1c3a6a, 0x2a2a2a]), weapon: 'revolver' };
    case 'bandit': return { skin: pick([0xb07a52, 0xc68e63, 0xa87048]), hair: 0x14100c, shirt: 0xe0d6c0, pants: pick([0x5a4630, 0x3a3028]), hat: 'sombrero', hatC: pick([0xc9b27a, 0xb89a5a, 0xd6c49a]),
      hatBand: pick([0x8a1c1c, 0x1c5a3a, 0x2a2a6a]), extras: r() < 0.65 ? ['poncho'] : ['bandolier'], poncho: pick([0xa8442a, 0x2a6a5a, 0x7a2a4a, 0xb8862a]), poncho2: pick([0xe8d8a0, 0x1a1a1a, 0xd04a2a]),
      face: ['moustache'], weapon: 'rifle' };
    case 'westBoss': return { skin: 0xc79a78, hair: 0x101010, shirt: 0x2a2a30, pants: 0x15151a, boots: 0x0a0a0a, hat: 'cowboy', hatC: 0x0c0c0e, hatBand: 0xb0b0b8, extras: ['coat', 'star'], coat: 0x14110f,
      face: ['moustache'], weapon: 'revolver', weapon2: 'revolver', scale: 1.14 };
    case 'ninja': return { skin: pick(SKINS), shirt: pick([0x14141c, 0x1a1a2a, 0x101418]), pants: 0x121218, boots: 0x0a0a0c, belt: 0x5a1414, hat: 'hood', weapon: 'katana', glove: 0x14141c, extras: ['scabbard'] };
    case 'komuso': return { skin: pick(SKINS), hair: 0x0c0c0c, shirt: 0x17171c, sleeve: 0x17171c, pants: 0x17171c, boots: 0xf0ece0, hat: 'tengai', extras: ['robe', 'kimono', 'obi', 'shakuhachi'], robe: 0x17171c,
      sash: pick([0xc9a84a, 0xb8943a]), trim: 0xf0ece0, accent: pick([0x2a3a6a, 0x4a2a5a]), wideSleeve: true };
    case 'geisha': { const k = Math.floor(r() * 3), main = [0x8fb0d0, 0xd8a8b8, 0x6a4a8a][k];
      return { skin: 0xf2e9e2, lip: 0xc81c2c, hair: 0x0c0c0e, shirt: main, robe: main, sleeve: main, pants: main, hem: [0x6a4a8a, 0xb01c2c, 0xd9b23a][k], accent: [0xc9a84a, 0x2a5a4a, 0xb01c2c][k], cord: [0xb01c2c, 0xd9b23a, 0xf0e8d8][k],
        trim: 0xb01c2c, boots: 0xf0ece0, hat: null, face: ['shimada'], extras: ['kosode', 'wagasa'], umbrella: [0xb01c2c, 0xd8c9a0, 0x2a3a6a][k], umbrella2: [0xf0e8d8, 0x8a3a2a, 0xf0e8d8][k], wideSleeve: true, scale: 0.94 }; }
    case 'ronin': return { skin: pick(SKINS), hair: 0x0c0c0c, shirt: pick([0x4a5a6a, 0x6a4a3a, 0x3a4a3a, 0x5a3a4a]), pants: pick([0x2a2a32, 0x3a3228, 0x1e2a36]), boots: 0xd8cfb8, legR: 0.1,
      hat: r() < 0.55 ? 'kasa' : null, face: r() < 0.5 ? ['topknot', 'moustache'] : ['topknot'], extras: ['kimono', 'obi', 'hakama', 'scabbard'], wideSleeve: true, weapon: 'katana' };
    case 'archer': return { skin: pick(SKINS), hair: 0x0c0c0c, shirt: pick([0x5a4a3a, 0x3a4a5a]), pants: 0x2a2a30, boots: 0xd8cfb8, hat: 'kasa', hatC: 0xb09a5a, extras: ['kimono', 'obi', 'hakama', 'quiver'], wideSleeve: true, weapon: 'bow' };
    case 'japanBoss': return { skin: 0xd6a37c, hair: 0x0c0c0c, shirt: 0x1a1a20, pants: 0x1a1a20, boots: 0x101010, hat: 'kabuto', hatC: 0x1a1a1e, extras: ['armor', 'hakama', 'scabbard'], armor: 0x8a1818, armor2: 0x15151a,
      wideSleeve: true, weapon: 'katana', scale: 1.18 };
    case 'halberdier': return { skin: pick(SKINS), hair: 0x3a2a1a, shirt: 0x8a8f96, pants: 0x6a2020, boots: 0x2a1c12, hat: 'kettle', extras: ['tabard'], glove: 0x4a3a2a, face: r() < 0.4 ? ['moustache'] : [], weapon: 'halberd' };
    case 'crossbowman': return { skin: pick(SKINS), hair: 0x3a2a1a, shirt: 0x7a6a4a, pants: 0x4a3a2a, boots: 0x2a1c12, hat: 'kettle', extras: ['tabard', 'quiver'], weapon: 'crossbow' };
    case 'knight': return { skin: 0xd6a37c, shirt: 0x9a9fa6, pants: 0x8a8f96, boots: 0x6a6f76, hat: 'helm', extras: ['tabard'], glove: 0x8a8f96, weapon: 'sword', shield: 0xb01c1c, scale: 1.08, armR: 0.07, legR: 0.095 };
    case 'swissBoss': return { skin: 0xd6a37c, shirt: 0x9a9fa6, pants: 0x8a8f96, boots: 0x4a4a52, hat: 'helm', plume: 0xb01c1c, extras: ['lion', 'cape'], cape: 0x7a1010, glove: 0x8a8f96, weapon: 'sword', shield: 0xe0b020, scale: 1.16, armR: 0.07, legR: 0.095 };
    // heroes (opening shots) and friendly Waldstaetten
    case 'gunslinger': return { skin: 0xc99a74, hair: 0x4a3018, shirt: 0x9a8a6a, pants: 0x3a4660, boots: 0x3a2414, hat: 'cowboy', hatC: 0x9a7a52, hatBand: 0x3a2414, extras: ['vest', 'star'], vest: 0x4a3020,
      face: ['moustache'], weapon: 'revolver', cuff: 0x4a3020 };
    case 'samurai': return { skin: 0xd6a37c, hair: 0x0c0c0c, shirt: 0x24304e, pants: 0x1a1e2c, boots: 0xe0d8c0, legR: 0.1, hat: null, face: ['topknot', 'headband'], accent: 0xf0f0f0,
      extras: ['kimono', 'obi', 'hakama', 'quiver', 'scabbard'], trim: 0xd9b23a, wideSleeve: true, weapon: 'bow' };
    // ---- Normandy 1944 ----
    case 'soldier': return { skin: pick(SKINS), hair: pick([0x8a6a3a, 0x5a3a1c, 0x3a2a1a]), shirt: 0x5c6458, pants: 0x565e52, boots: 0x14120f, bootTop: true, belt: 0x14120f, hat: 'stahl', extras: ['bandolier'], weapon: 'rifle' };
    case 'gunner': return { skin: pick(SKINS), hair: 0x5a3a1c, shirt: 0x5c6458, pants: 0x565e52, boots: 0x14120f, bootTop: true, belt: 0x14120f, hat: 'stahl', weapon: 'smg' };
    case 'officer': return { skin: pick(SKINS), hair: 0x8a6a3a, shirt: 0x626a5e, pants: 0x565e52, boots: 0x0c0c0c, bootTop: true, belt: 0x14120f, hat: 'peaked', extras: ['coat'], coat: 0x586054, glove: 0x1a1a1a, weapon: 'revolver' };
    case 'warBoss': return { skin: 0xd0a888, hair: 0xb8b0a0, shirt: 0x3a3e3a, pants: 0x30342f, boots: 0x0a0a0a, bootTop: true, belt: 0x0a0a0a, hat: 'peaked', hatC: 0x30342f, hatBand: 0x1a1a1a, extras: ['coat'], coat: 0x1c1c1e,
      glove: 0x101010, face: ['eyepatch'], weapon: 'smg', scale: 1.14 };
    case 'pavlichenko': return { skin: 0xe2bc9c, hair: 0x2a1c12, shirt: 0x6e6c3c, pants: 0x5a5a34, boots: 0x14120f, bootTop: true, belt: 0x4a3018, hat: 'pilotka', hatC: 0x6e6c3c, face: ['longhair'], extras: ['bandolier'], weapon: 'rifle', scale: 0.96 };
    case 'hall': return { skin: 0xe0b89a, hair: 0x6a4424, shirt: 0xb09a6e, pants: 0x4a4a52, boots: 0x2a1c12, belt: 0x4a3018, hat: 'beret', hatC: 0x22222a, face: ['longhair', 'neckerchief'], accent: 0x7a2a2a, extras: ['coat'], coat: 0xa8946a, weapon: 'smg', scale: 0.97 };
    case 'bavaud': return { skin: 0xdcb08c, hair: 0x4a3018, shirt: 0xe0dcd0, pants: 0x2a2a32, boots: 0x14120f, belt: 0x14120f, hat: null, face: ['neckerchief'], accent: 0x3a3a44, extras: ['coat'], coat: 0x2a3040, weapon: 'revolver' };
    // ---- Spartans ----
    case 'hoplite': return { skin: 0xc68e63, hair: 0x1a1410, shirt: 0x8a1414, sleeve: 0xc68e63, pants: 0xc68e63, boots: 0xb8893a, bootTop: true, hat: 'corinthian', plume: 0xb01c1c,
      extras: ['cuirass', 'kilt', 'cape'], cape: 0xa01414, kilt: 0x8a1414, aspis: 0xb8893a, lambda: 0x8a1414, weapon: 'spear' };
    case 'peltast': return { skin: 0xc68e63, hair: 0x1a1410, shirt: 0x8a1414, sleeve: 0xc68e63, pants: 0xc68e63, boots: 0x6a4a2a, hat: 'pilos', hatC: 0xb8893a,
      extras: ['smock'], belt: 0x2a1c12, face: r() < 0.5 ? ['beard'] : [], weapon: 'javelin' };
    case 'greeceBoss': return { skin: 0xc68e63, hair: 0x1a1410, shirt: 0x8a1414, sleeve: 0xc68e63, pants: 0xc68e63, boots: 0xd9b23a, bootTop: true, hat: 'corinthian', hatC: 0xd9b23a, plume: 0xf0ece0, crestSide: true,
      extras: ['cuirass', 'kilt', 'cape'], armor: 0xd9b23a, cape: 0x7a0c0c, kilt: 0x7a0c0c, aspis: 0xd9b23a, lambda: 0x7a0c0c, weapon: 'spear', scale: 1.17 };
    // ---- rival Vikings ----
    case 'viking': return { skin: pick(SKINS), hair: pick([0xb8893a, 0x8a5a2a, 0x5a3a1c, 0xc8a050]), shirt: pick([0x5a6a4a, 0x6a4a3a, 0x4a5a6a, 0x7a6a4a]), pants: pick([0x4a4034, 0x3a3a40]), boots: 0x3a2818, bootTop: true,
      hat: r() < 0.62 ? 'nasal' : r() < 0.25 ? 'horned' : null, face: ['beard', 'braids'], extras: ['pelt'], peltHead: r() < 0.5, ...(([a, b]) => ({ fur: a, fur2: b }))(pick([[0x5a4632, 0x8a7458], [0x3a3028, 0x6a5a48], [0x7a7a76, 0xb0b0aa], [0x6a5038, 0xb8a888], [0x2a2420, 0x5a5048]])), aspis: pick([0x8a1c1c, 0x1c4a7a, 0x2a5a2a, 0xc8a030]), aspis2: pick([0xe8e0d0, 0x1a1a1a, 0xc8a030]),
      aspisBoss: 0x9a9fa6, weapon: r() < 0.5 ? 'axe' : 'sword' };
    case 'berserker': return { skin: 0xc68e63, hair: pick([0x8a3a1c, 0x5a3a1c, 0xb8893a]), shirt: 0xc68e63, sleeve: 0xc68e63, pants: 0x4a3a2a, boots: 0x3a2818, hat: null, face: ['longhair', 'longbeard'],
      extras: ['pelt'], peltHead: true, fur: 0x3a3028, fur2: 0x6a5a48, weapon: 'axe', scale: 1.06 };
    case 'bowman': return { skin: pick(SKINS), hair: pick([0xb8893a, 0x5a3a1c]), shirt: pick([0x5a4a3a, 0x4a5a4a]), pants: 0x3a3a40, boots: 0x3a2818, bootTop: true, hat: 'cowl', hatC: pick([0x4a4a3a, 0x5a3a2a]),
      face: ['beard'], extras: ['pelt', 'quiver'], ...(([a, b]) => ({ fur: a, fur2: b }))(pick([[0x5a4632, 0x8a7458], [0x3a3028, 0x6a5a48], [0x7a7a76, 0xb0b0aa], [0x6a5038, 0xb8a888], [0x2a2420, 0x5a5048]])), weapon: 'bow' };
    case 'northBoss': return { skin: 0xd0a07a, hair: 0x9a9a92, shirt: 0x8a8f96, pants: 0x3a3a44, boots: 0x2a1c12, bootTop: true, hat: 'horned', hatBand: 0xd9b23a, face: ['longbeard', 'braids'], extras: ['pelt'], peltHead: true, fur: 0xe8e4dc, fur2: 0xf4f0e8,
      glove: 0x4a3a2a, weapon: 'daneaxe', scale: 1.2 };
    case 'chieftain': return { skin: pick(SKINS), hair: pick([0xb8893a, 0x8a3a1c, 0x9a9a92]), shirt: 0x8a8f96, pants: pick([0x4a2a2a, 0x2a3a4a]), boots: 0x2a1c12, bootTop: true, hat: 'horned', hatBand: 0xb8893a,
      face: ['longbeard', 'braids'], extras: ['pelt'], peltHead: true, fur: pick([0x2a2420, 0x6a5038, 0x8a8a86]), fur2: 0xb8a888, aspis: pick([0x8a1c1c, 0x1a1a1a, 0x1c4a7a]), aspis2: 0xc8a030, aspisBoss: 0xc9a050,
      glove: 0x4a3a2a, weapon: r() < 0.5 ? 'sword' : 'axe', scale: 1.12, armR: 0.07, legR: 0.095 };
    // ---- Moscow 1974: the Committee and its helpers ----
    case 'agent': return { skin: pick(SKINS), hair: pick([0x3a2a1a, 0x1a1410, 0x8a7a5a]), shirt: 0xd8d4c8, pants: pick([0x2a2a30, 0x3a3a3e, 0x2e2a26]), boots: 0x0c0c0c, hat: 'fedora', hatC: pick([0x2a2a2e, 0x3a3630, 0x4a4a4e]),
      extras: ['coat', 'belted'], coat: pick([0x2c2c32, 0x4a463c, 0x5a5a5e, 0x3a342c]), glove: 0x14120f, weapon: 'revolver' };
    case 'militia': return { skin: pick(SKINS), hair: 0x5a3a1c, shirt: 0x4a5560, pants: 0x3a4450, boots: 0x0c0c0c, bootTop: true, hat: 'ushanka', hatC: 0x5a6068, hatStar: 0xc81c1c,
      extras: ['coat', 'belted'], coat: 0x4a5560, belt2: 0x5a3a1c, glove: 0x2a1c12, weapon: 'smg' };
    case 'russiaBoss': return { skin: 0xd8b090, hair: 0x8a8a84, shirt: 0x5a6054, pants: 0x2a3050, boots: 0x0a0a0a, bootTop: true, hat: 'peaked', hatC: 0x5a6054, hatBand: 0x1c3a9a,
      extras: ['coat', 'belted'], coat: 0x50564c, belt2: 0x4a2c14, glove: 0x14120f, face: ['moustache'], weapon: 'revolver', weapon2: 'revolver', scale: 1.14 };
    // ---- Tibet 1959 ----
    case 'pla': return { skin: pick([0xd8b088, 0xc89a70, 0xe0b890]), hair: 0x0c0c0c, shirt: 0x8a8a4e, pants: 0x82824a, boots: 0x2a2416, belt: 0x4a2c14, hat: 'mao', hatC: 0x8a8a4e, extras: ['tabs', 'bandolier'], weapon: 'rifle' };
    case 'plaGunner': return { skin: pick([0xd8b088, 0xc89a70]), hair: 0x0c0c0c, shirt: 0x8a8a4e, pants: 0x82824a, boots: 0x2a2416, belt: 0x4a2c14, hat: 'ushanka', hatC: 0x8a8454, hatStar: 0xc81c1c, extras: ['tabs'], weapon: 'smg' };
    case 'redguard': return { skin: pick([0xd8b088, 0xc89a70, 0xe0b890]), hair: 0x0c0c0c, shirt: pick([0x5a6a3e, 0x4a5a6a, 0x66704a]), pants: pick([0x4a5a36, 0x3a4658]), boots: 0x14120f, belt: 0x4a2c14, hat: 'mao',
      hatC: pick([0x5a6a3e, 0x4a5a6a]), armband: 0xc81c1c, weapon: 'club' };
    case 'tibetBoss': return { skin: 0xd0a880, hair: 0x0c0c0c, shirt: 0x7e7e46, pants: 0x74743e, boots: 0x0a0a0a, bootTop: true, hat: 'peaked', hatC: 0x7e7e46, hatBand: 0xb01c1c, extras: ['coat', 'belted', 'tabs'], coat: 0x7a7a44,
      belt2: 0x4a2c14, glove: 0x2a1c12, weapon: 'revolver', scale: 1.14 };
    // ---- heroes and friends of chapters VII and VIII ----
    case 'solzhenitsyn': return { skin: 0xd8ac8a, hair: 0x4a3420, shirt: 0x4e4e46, pants: 0x3a3a38, boots: 0x2a2620, bootTop: true, hat: null, face: ['baldtop', 'chinbeard'], extras: ['coat'], coat: 0x4e4e46,
      belt: 0x2a1c12, weapon: 'smg', scale: 1.04 };
    case 'sakharov': return { skin: 0xe0b89a, hair: 0xb8b4aa, shirt: 0xe8e4d8, sleeve: 0x4a4a54, pants: 0x3e3e48, boots: 0x14120f, hat: null, face: ['baldtop', 'glasses', 'tie'], accent: 0x3a2228,
      extras: ['coat'], coat: 0x4a4a54, weapon: 'revolver' };
    case 'nureyev': return { skin: 0xe0b694, hair: 0x2a1c12, shirt: 0x1c1c22, pants: 0x16161a, boots: 0x0c0c0c, hat: null, face: ['mop'], extras: ['coat', 'scarf'], coat: 0x1c1c22, scarf: 0xf0ece0,
      weapon: 'revolver', scale: 0.99, legR: 0.09 };
    case 'gompo': return { skin: 0xc0875c, hair: 0x0c0c0c, shirt: 0x5a3422, pants: 0x3a2a20, boots: 0x4a2c14, bootTop: true, hat: 'furhat', hatC: 0x9a6a34, face: ['moustache', 'braids'],
      extras: ['chuba', 'bandolier'], coat: 0x5a3422, fur2: 0xc8a878, accent: 0xb01c1c, weapon: 'rifle', scale: 1.05 };
    case 'pachen': return { skin: 0xc89468, hair: null, shirt: 0x7a1c22, sleeve: 0x7a1c22, pants: 0x7a1c22, boots: 0x4a2c14, hat: null, face: [], extras: ['robe'], robe: 0x7a1c22, sash: 0xd9a020, belt: 0xd9a020,
      weapon: 'revolver', scale: 0.96 };
    case 'songtsen': return { skin: 0xc89468, hair: 0x0c0c0c, shirt: 0xa01c1c, pants: 0x6a1414, boots: 0xd9b23a, bootTop: true, hat: 'crown', face: ['moustache', 'longhair'],
      extras: ['chuba', 'quiver', 'scabbard'], coat: 0xa01c1c, fur2: 0xd9b23a, accent: 0xd9b23a, weapon: 'bow', scale: 1.04 };
    case 'dalai': return { skin: 0xd0a078, hair: 0x14100c, shirt: 0xe0a82a, sleeve: 0xe0a82a, pants: 0x7a1c22, boots: 0x4a2c14, hat: null, face: ['glasses'], extras: ['robe'], robe: 0x7a1c22, sash: 0x7a1c22, belt: 0x7a1c22, scale: 0.98 };
    case 'monk': return { skin: pick([0xc89468, 0xb8845c, 0xd0a078]), hair: null, shirt: 0x7a1c22, sleeve: pick([0x7a1c22, 0xd9a020]), pants: 0x7a1c22, boots: 0x4a2c14, hat: null, extras: ['robe'], robe: pick([0x7a1c22, 0x8a2428]),
      sash: pick([0x7a1c22, 0xd9a020]), belt: 0x7a1c22 };
    case 'khampa': return { skin: pick([0xc0875c, 0xb07a52]), hair: 0x0c0c0c, shirt: 0x4a3020, pants: 0x3a2a20, boots: 0x4a2c14, bootTop: true, hat: r() < 0.6 ? 'furhat' : null, hatC: pick([0x9a6a34, 0x6a4a2a]),
      face: r() < 0.5 ? ['moustache', 'braids'] : ['braids'], extras: ['chuba'], coat: pick([0x5a3422, 0x3a3a48, 0x4a2a2a]), fur2: 0xc8a878, accent: pick([0xb01c1c, 0xd9a020]), weapon: 'rifle' };
    // ---- villains, playable in Duel mode only ----
    case 'jesse': return { skin: 0xd0a07a, hair: 0x3a2414, shirt: 0x4a4a52, pants: 0x2a2a30, boots: 0x1a1410, hat: 'cowboy', hatC: 0x1c1814, hatBand: 0x4a3a2a, extras: ['coat'], coat: 0x6a5a44, face: ['beard'], weapon: 'revolver' };
    case 'clanton': return { skin: 0xc89870, hair: 0x2a1c12, shirt: 0x8a3028, pants: 0x4a3c2c, boots: 0x2a1c12, hat: 'cowboy', hatC: 0xb89a6a, extras: ['vest', 'bandolier'], vest: 0x4a3520,
      face: ['moustache', 'neckerchief'], accent: 0x1a1a1a, weapon: 'revolver' };
    case 'belle': return { skin: 0xe0b89a, hair: 0x1a1210, shirt: 0x3a1c3a, pants: 0x2a142a, boots: 0x1a1410, hat: 'cowboy', hatC: 0x14100e, hatBand: 0x8a1c3a, face: ['longhair'], extras: ['robe'], robe: 0x3a1c3a, sash: 0x8a1c3a,
      weapon: 'revolver', weapon2: 'revolver', scale: 0.97 };
    case 'nobunaga': return { skin: 0xd6a37c, hair: 0x0c0c0c, shirt: 0x15151a, pants: 0x15151a, boots: 0x101010, hat: 'kabuto', hatC: 0x15151a, face: ['moustache'], extras: ['armor', 'hakama', 'cape', 'scabbard'], armor: 0x1a1a20, armor2: 0x7a1414,
      cape: 0x9a1414, wideSleeve: true, weapon: 'katana', scale: 1.05 };
    case 'kojiro': return { skin: 0xe0b890, hair: 0x0c0c0c, shirt: 0x5a3a7a, pants: 0x2a2a3a, boots: 0xe0d8c0, legR: 0.1, hat: null, face: ['longhair', 'topknot'], extras: ['kimono', 'obi', 'hakama', 'scabbard'], trim: 0xe8e0d0, accent: 0xd9b23a,
      wideSleeve: true, weapon: 'katana' };
    case 'fuma': return { skin: 0xc0875c, shirt: 0x5a1418, pants: 0x1a1214, boots: 0x0a0a0c, belt: 0x0a0a0a, hat: 'hood', glove: 0x1a1214, extras: ['scabbard', 'fur'], fur: 0x1a1214, fur2: 0x3a2a2a, weapon: 'katana', scale: 1.14, armR: 0.072, legR: 0.098 };
    case 'gessler': return { skin: 0xd8ac8a, hair: 0x4a3018, shirt: 0x7a1418, pants: 0x2a2a30, boots: 0x1a1410, bootTop: true, hat: 'felt', hatC: 0x7a1418, plume: 0xf0ece0, face: ['beard'], extras: ['coat', 'cape', 'chain'], coat: 0x7a1418, cape: 0x2a2a30,
      weapon: 'crossbow' };
    case 'charles': return { skin: 0xd8ac8a, hair: 0x14100c, shirt: 0x9a9fa6, pants: 0x8a8f96, boots: 0x4a4a52, hat: null, extras: ['cuirass', 'cape', 'chain'], armor: 0xaeb4bc, cape: 0x1c3a8a, glove: 0x8a8f96, weapon: 'halberd', scale: 1.05, armR: 0.07, legR: 0.095 };
    case 'leopold': return { skin: 0xd6a37c, shirt: 0x9a9fa6, pants: 0x8a8f96, boots: 0x6a6f76, hat: 'helm', plume: 0xf0ece0, extras: ['tabard', 'cape'], cape: 0xb01c1c, glove: 0x8a8f96, weapon: 'sword', shield: 0xb01c1c, scale: 1.08, armR: 0.07, legR: 0.095 };
    case 'cyclops': return { skin: 0xb89070, hair: 0x2a2018, shirt: 0xb89070, pants: 0xb89070, boots: 0xb89070, belt: 0x3a2414, hat: null, face: ['oneeye', 'beard'], extras: ['kilt'], kilt: 0x6a5038, kilt2: 0x3a2414, weapon: 'club', scale: 1.32, armR: 0.08, legR: 0.105 };
    case 'minotaur': return { skin: 0x8a5a3a, hair: 0x2a1a10, shirt: 0x8a5a3a, sleeve: 0x8a5a3a, pants: 0x8a5a3a, boots: 0x1a1410, belt: 0x3a2414, hat: 'bull', hatC: 0x4a2c1a, extras: ['kilt'], kilt: 0x7a1c1c, kilt2: 0xd9b23a, weapon: 'axe',
      scale: 1.25, armR: 0.08, legR: 0.105 };
    case 'xerxes': return { skin: 0xb8845c, hair: 0x14100c, shirt: 0x5a2a7a, sleeve: 0x5a2a7a, pants: 0x5a2a7a, boots: 0xd9b23a, belt: 0xd9b23a, hat: 'tiara', face: ['longbeard'], extras: ['robe', 'chain', 'quiver'], robe: 0x5a2a7a, sash: 0xd9b23a,
      wideSleeve: true, cuff: 0xd9b23a, weapon: 'bow', scale: 1.06 };
    case 'medusa': return { skin: 0x8ab08a, hair: 0x2a5a2a, shirt: 0x2a4a3a, sleeve: 0x8ab08a, pants: 0x8ab08a, boots: 0x8a7a3a, belt: 0xd9b23a, hat: null, face: ['snakes'], extras: ['robe'], robe: 0x2a4a3a, sash: 0xd9b23a, weapon: 'javelin', scale: 0.98 };
    case 'antinous': return { skin: 0xd0a078, hair: 0x1a120c, shirt: 0x6a2a7a, sleeve: 0xd0a078, pants: 0xd0a078, boots: 0x8a6424, bootTop: true, belt: 0xd9b23a, hat: null, face: ['headband'], accent: 0xd9b23a, extras: ['smock', 'cape'], cape: 0x8a1c5a,
      weapon: 'javelin' };
    // ---- chapter IX: the Spaniards and their captains, the defenders of Tenochtitlan ----
    case 'rodelero': return { skin: pick(SKINS), hair: pick([0x1a1410, 0x3a2a1a, 0x5a3a1c]), shirt: 0x9aa0a8, sleeve: pick([0x7a2a22, 0x2a3a5a, 0x6a5a2a]), pants: pick([0x7a2a22, 0x2a3a5a, 0x4a3a2a]), boots: 0x2a1c12, bootTop: true,
      hat: 'morion', face: r() < 0.7 ? ['beard'] : ['moustache'], extras: ['cuirass'], armor: 0xaeb4bc, aspis: 0x8a9098, aspisBoss: 0x5a5f66, weapon: 'sword' };
    case 'ballestero': return { skin: pick(SKINS), hair: pick([0x1a1410, 0x3a2a1a]), shirt: pick([0x6a5a3a, 0x7a3a2a, 0x3a4a5a]), pants: pick([0x4a3a2a, 0x2a2a30]), boots: 0x2a1c12, bootTop: true,
      hat: r() < 0.6 ? 'morion' : 'cowl', hatC: 0x5a3a2a, face: ['beard'], extras: ['smock', 'quiver'], weapon: 'crossbow' };
    case 'arcabucero': return { skin: pick(SKINS), hair: pick([0x1a1410, 0x3a2a1a]), shirt: 0x9aa0a8, sleeve: pick([0x6a5a2a, 0x2a3a5a, 0x7a2a22]), pants: pick([0x4a3a2a, 0x7a2a22]), boots: 0x2a1c12, bootTop: true,
      hat: 'morion', face: ['beard'], extras: ['cuirass', 'bandolier'], armor: 0x9aa0a8, weapon: 'rifle' };
    case 'jinete': return { skin: pick(SKINS), hair: 0x1a1410, shirt: 0xb4bac2, sleeve: 0xb4bac2, pants: 0x8a8f96, boots: 0x2a1c12, bootTop: true, hat: 'morion', plume: 0xb01c1c, face: ['beard'],
      extras: ['cuirass', 'cape'], armor: 0xb4bac2, cape: 0x8a1414, glove: 0x8a8f96, weapon: 'spear', horse: pick([0x5a3a22, 0x2a1c14, 0x8a6a48, 0xb8a888]) };
    case 'cannoneer': return { skin: pick(SKINS), hair: 0x3a2a1a, shirt: 0xd8d0b8, pants: 0x4a3a2a, boots: 0x2a1c12, bootTop: true, hat: 'cowl', hatC: 0x7a2a22, face: ['beard'], extras: ['bandolier'], weapon: 'club' };
    case 'aztecBoss': return { skin: 0xd8ac8a, hair: 0x1a1410, shirt: 0xc4cad2, sleeve: 0xc4cad2, pants: 0x9a9fa6, boots: 0x3a3a40, bootTop: true, hat: 'morion', plume: 0xd9a820, face: ['beard'],
      extras: ['cuirass', 'cape'], armor: 0xc4cad2, cape: 0x7a1010, glove: 0x8a8f96, weapon: 'sword', aspis: 0xc9a030, aspisBoss: 0x8a1414, scale: 1.18, armR: 0.07, legR: 0.095 };
    case 'cuauhtemoc': return { skin: 0xb07a50, hair: 0x0c0c0c, shirt: 0xf0e8d0, sleeve: 0xb07a50, pants: 0xb07a50, boots: 0x8a6a3a, belt: 0xd9a820, hat: 'feather', hatC: 0x1f9a5a, face: ['longhair'],
      extras: ['kilt', 'cape'], kilt: 0xf0e8d0, kilt2: 0x2ac8c0, cape: 0x1f8a7a, aspis: 0x2ac8c0, aspis2: 0xd9a820, aspisBoss: 0xd9a820, weapon: 'macuahuitl', scale: 1.04 };
    case 'tzilacatzin': return { skin: 0xa87048, hair: 0x0c0c0c, shirt: 0x2a8a4a, sleeve: 0x2a8a4a, pants: 0x2a8a4a, boots: 0x8a6a3a, belt: 0xd9a820, hat: null, face: ['topknot'],
      extras: ['kilt'], kilt: 0xe8d8a0, kilt2: 0xb01c1c, aspis: 0xb01c1c, aspis2: 0xe8d8a0, aspisBoss: 0x2ac8c0, weapon: 'macuahuitl', scale: 1.1, armR: 0.07, legR: 0.1 };
    case 'nezahualcoyotl': return { skin: 0xb07a50, hair: 0x0c0c0c, shirt: 0x2a6a9a, sleeve: 0xb07a50, pants: 0xb07a50, boots: 0x8a6a3a, belt: 0xd9a820, hat: 'diadem', face: ['longhair'],
      extras: ['kilt', 'cape', 'quiver'], kilt: 0xf0e8d0, kilt2: 0x2a6a9a, cape: 0x2a6a9a, weapon: 'bow', scale: 1.02 };
    case 'cortes': return { skin: 0xd8ac8a, hair: 0x1a1410, shirt: 0x1a1a1e, sleeve: 0x1a1a1e, pants: 0x1a1a1e, boots: 0x15120f, bootTop: true, hat: 'morion', plume: 0xf0ece0, face: ['beard'],
      extras: ['cuirass', 'cape'], armor: 0x8a8f96, cape: 0x1a1a1e, weapon: 'sword', scale: 1.02 };
    case 'alvarado': return { skin: 0xe0b89a, hair: 0xc85a1c, shirt: 0xb4bac2, sleeve: 0x8a1c1c, pants: 0x8a1c1c, boots: 0x2a1c12, bootTop: true, hat: null, face: ['longhair', 'beard'],
      extras: ['cuirass', 'cape'], armor: 0xc4cad2, cape: 0xb01c1c, weapon: 'sword', scale: 1.06 };
    case 'guzman': return { skin: 0xd0a078, hair: 0x15120f, shirt: 0x3a2a3a, sleeve: 0x3a2a3a, pants: 0x2a2a30, boots: 0x15120f, bootTop: true, hat: 'morion', face: ['longbeard'],
      extras: ['cuirass'], armor: 0x6a6f76, weapon: 'crossbow' };
    case 'bloodaxe': return { skin: 0xd0a07a, hair: 0x8a2a14, shirt: 0x5a2424, pants: 0x3a3a40, boots: 0x2a1c12, bootTop: true, hat: 'nasal', face: ['longbeard'], extras: ['pelt', 'cape'], cape: 0x8a1414, fur: 0x4a2a1c, fur2: 0x8a5a3a, aspis: 0x8a1c1c, aspis2: 0x1a1a1a, aspisBoss: 0x9a9fa6,
      weapon: 'axe', scale: 1.08 };
    case 'ivar': return { skin: 0xe6c8b0, hair: 0xd8c890, shirt: 0x3a4a5a, pants: 0x2a2a30, boots: 0x2a1c12, bootTop: true, hat: null, face: ['longhair', 'beard'], extras: ['pelt'], peltHead: true, fur: 0x1c1c22, fur2: 0x4a4a52, weapon: 'sword', scale: 0.98 };
    case 'loki': return { skin: 0xe0bca0, hair: 0xb0401c, shirt: 0x2a5a3a, pants: 0x1c2a22, boots: 0x2a1c12, bootTop: true, belt: 0xd9b23a, hat: null, face: ['longhair', 'headband'], accent: 0xd9b23a, extras: ['smock', 'cape'], cape: 0x1c4a2a, weapon: 'axe' };
    case 'hitler': return { skin: 0xe0bca0, hair: 0x1a1410, brow: 0x1a1410, shirt: 0x7a6a4a, pants: 0x1a1a1c, boots: 0x0a0a0a, bootTop: true, belt: 0x2a1c12, hat: null, face: ['toothbrush', 'tie'], accent: 0x15120f, extras: ['coat', 'belted'], coat: 0x7a6a4a,
      belt2: 0x2a1c12, weapon: 'revolver' };
    case 'mussolini': return { skin: 0xd4a684, hair: null, shirt: 0x15151a, pants: 0x565c4e, boots: 0x0a0a0a, bootTop: true, belt: 0x0a0a0a, hat: 'fez', hatC: 0x15151a, face: ['jaw'], brow: 0x2a2018, extras: ['coat', 'belly', 'belted', 'medals'], coat: 0x565c4e,
      belt2: 0x0a0a0a, glove: 0x15151a, weapon: 'smg', scale: 1.03, armR: 0.078, legR: 0.105 };   // bald, heavy jaw, black fez, black shirt under a grey-green tunic
    case 'goring': return { skin: 0xe6c0a8, hair: 0x8a7a5a, shirt: 0xa8b4c0, pants: 0xa8b4c0, boots: 0x0a0a0a, bootTop: true, hat: 'peaked', hatC: 0xa8b4c0, hatBand: 0xf0ece0, face: ['jaw'], extras: ['coat', 'belly', 'belted', 'medals', 'epaulettes'], coat: 0xa8b4c0, belt2: 0x8a6424,
      weapon: 'rifle', scale: 1.06, armR: 0.08, legR: 0.11 };
    case 'stalin': return { skin: 0xd8ac8a, hair: 0x4a4a4a, shirt: 0xd8d4c4, pants: 0x2a3050, boots: 0x0a0a0a, bootTop: true, hat: null, face: ['bigmoustache', 'pipe'], extras: ['coat', 'belted', 'epaulettes'], coat: 0xd8d4c4,
      belt2: 0x4a2c14, weapon: 'revolver' };
    case 'andropov': return { skin: 0xe0bca0, hair: 0x9a9a94, shirt: 0xe8e4d8, sleeve: 0x2a2a32, pants: 0x2a2a32, boots: 0x14120f, hat: null, face: ['glasses', 'tie'], accent: 0x5a1c1c, extras: ['coat'], coat: 0x22222a, weapon: 'revolver' };
    case 'beria': return { skin: 0xd8ac8a, hair: 0x3a3a3a, shirt: 0xe8e4d8, sleeve: 0x1c1c22, pants: 0x1c1c22, boots: 0x14120f, hat: 'fedora', hatC: 0x1c1c22, face: ['glasses', 'tie'], accent: 0x15120f, extras: ['coat', 'belted'], coat: 0x1c1c22,
      weapon: 'revolver' };
    case 'brezhnev': return { skin: 0xd8ac8a, hair: 0x1a1410, shirt: 0xe8e4d8, sleeve: 0x2a3040, pants: 0x2a3040, boots: 0x14120f, hat: null, face: ['brows', 'jaw', 'tie'], accent: 0x7a1c1c, extras: ['coat', 'belly', 'medals'], coat: 0x2a3040, weapon: 'smg',
      scale: 1.03, armR: 0.07 };
    case 'mao': return { skin: 0xd8b088, hair: 0x14100c, shirt: 0x6a7078, pants: 0x62686e, boots: 0x14120f, belt: 0x62686e, hat: null, face: ['baldtop', 'mole'], extras: ['coat', 'belly'], coat: 0x6a7078, weapon: 'rifle' };
    case 'langdarma': return { skin: 0xb8845c, hair: 0x0c0c0c, shirt: 0x1a1a22, pants: 0x15151a, boots: 0x4a2c14, bootTop: true, hat: null, face: ['horns', 'moustache', 'longhair'], extras: ['chuba', 'quiver', 'scabbard'], coat: 0x1a1a22, fur2: 0x7a1c22,
      accent: 0x7a1c22, weapon: 'bow', scale: 1.05 };
    case 'jiangqing': return { skin: 0xe0b890, hair: 0x0c0c0c, shirt: 0x5a6a3e, pants: 0x4a5a36, boots: 0x14120f, belt: 0x4a2c14, hat: 'mao', hatC: 0x5a6a3e, face: ['glasses'], weapon: 'revolver', scale: 0.96 };
    // ---- heroes of Greece and the North ----
    case 'ulysses': return { skin: 0xc8946c, hair: 0x3a2414, shirt: 0x2a4a7a, sleeve: 0xc8946c, pants: 0xc8946c, boots: 0x6a4a2a, belt: 0x8a6424, hat: 'pilos', hatC: 0xe0d4b0, face: ['beard'],
      extras: ['smock', 'cape'], cape: 0x6a2a2a, weapon: 'javelin' };
    case 'achilles': return { skin: 0xd8a882, hair: 0xc8a050, shirt: 0xe8e0d0, sleeve: 0xd8a882, pants: 0xd8a882, boots: 0xd9b23a, bootTop: true, hat: 'corinthian', hatC: 0xd9b23a, plume: 0x1c4a9a,
      extras: ['cuirass', 'kilt'], armor: 0xd9b23a, kilt: 0xf0ece0, kilt2: 0x1c4a9a, aspis: 0xd9b23a, aspisBoss: 0x1c4a9a, weapon: 'javelin', scale: 1.04 };
    case 'heracles': return { skin: 0xc0875c, hair: 0x1a120c, shirt: 0xc0875c, sleeve: 0xc0875c, pants: 0xc0875c, boots: 0x6a4a2a, belt: 0x3a2414, hat: 'lion', hatC: 0xc9963a, face: ['beard'],
      extras: ['lionskin', 'kilt'], kilt: 0x8a6a3a, kilt2: 0x3a2414, weapon: 'club', scale: 1.13, armR: 0.078, legR: 0.1 };
    case 'erik': return { skin: 0xdcae8c, hair: 0xb0401c, shirt: 0x3a5a3a, pants: 0x4a4034, boots: 0x3a2818, bootTop: true, belt: 0x2a1c12, hat: null, face: ['longhair', 'longbeard', 'braids'],
      extras: ['pelt'], peltHead: true, fur: 0x5a4632, fur2: 0x9a7a52, weapon: 'axe', scale: 1.06 };
    case 'leif': return { skin: 0xe0b694, hair: 0xd8b860, shirt: 0x9a9fa6, pants: 0x3a4a6a, boots: 0x3a2818, bootTop: true, hat: null, face: ['longhair', 'beard'],
      extras: ['pelt', 'cape'], cape: 0x1c4a8a, fur: 0xb8a888, fur2: 0xe0d8c4, weapon: 'sword' };
    case 'ragnar': return { skin: 0xd0a07a, hair: 0x2a1c12, shirt: 0x4a3a2a, pants: 0x6a5a48, boots: 0x2a1c12, bootTop: true, legR: 0.105, hat: null, face: ['topknot', 'longbeard', 'braids'],
      extras: ['pelt'], peltHead: true, fur: 0x3a3028, fur2: 0x5a4a3a, weapon: 'axe', scale: 1.08 };
    // ---- the nine playable heroes ----
    case 'earp': return { skin: 0xd0a07a, hair: 0x2a1c12, shirt: 0xe8e4d8, sleeve: 0x16161a, pants: 0x18181c, boots: 0x0c0c0c, hat: 'cowboy', hatC: 0x121214, hatBand: 0x2e2e34,
      extras: ['coat', 'star'], coat: 0x16161a, face: ['bigmoustache'], weapon: 'revolver', cuff: 0xe8e4d8 };
    case 'calamity': return { skin: 0xd8a882, hair: 0x6a3a1a, shirt: 0xa67848, pants: 0x74563a, boots: 0x3a2414, belt: 0x2a1c12, hat: 'cowboy', hatC: 0x6a4a2a, hatBand: 0x2a1c12,
      extras: ['bandolier'], face: ['longhair', 'neckerchief'], accent: 0xa81c1c, weapon: 'revolver', cuff: 0x8a623a, scale: 0.97 };
    case 'billy': return { skin: 0xdcb08c, hair: 0x6a4a28, shirt: 0xd9d2c0, pants: 0x4a4038, boots: 0x2a1c12, hat: 'cowboy', hatC: 0x3a3028, hatBand: 0x1a1410,
      extras: ['vest'], vest: 0x3a2a1c, face: ['neckerchief'], accent: 0x2a4a7a, weapon: 'revolver', scale: 0.95 };
    case 'musashi': return { skin: 0xd0a078, hair: 0x0c0c0c, shirt: 0x2c2c32, pants: 0x5a5d64, boots: 0xd8cfb8, legR: 0.1, hat: null, face: ['longhair', 'topknot', 'moustache'],
      extras: ['kimono', 'obi', 'hakama', 'scabbard'], trim: 0x9a9fa6, accent: 0x15151a, wideSleeve: true, weapon: 'katana' };
    case 'tomoe': return { skin: 0xe6c0a0, hair: 0x0a0a0a, shirt: 0xf0ece0, pants: 0x8a1c1c, boots: 0xe0d8c0, legR: 0.1, hat: null, face: ['longhair', 'headband'], accent: 0xf4f4f4,
      extras: ['armor', 'hakama', 'scabbard'], armor: 0xa81c1c, armor2: 0x7a1414, wideSleeve: true, weapon: 'katana', scale: 0.96 };
    case 'date': return { skin: 0xd6a37c, hair: 0x0c0c0c, shirt: 0x2a2a34, pants: 0x24242c, boots: 0x101014, belt: 0xc9a23a, hat: 'kabuto', hatC: 0x1e1e26, crest: true, face: ['eyepatch'],
      extras: ['armor', 'hakama', 'scabbard'], armor: 0x30303a, armor2: 0x1c1c24, glove: 0x15151a, wideSleeve: true, weapon: 'katana', scale: 1.03 };
    case 'winkelried': return { skin: 0xd09a74, hair: 0x6a4a28, shirt: 0x9a9fa6, pants: 0x8a8f96, boots: 0x3a2818, hat: null, face: ['beard'], extras: ['tabard'],
      tabard: [0xc81c1c, 0xc81c1c, 0xf0ece0], glove: 0x8a8f96, weapon: 'halberd', scale: 1.05 };
    case 'stauffacher': return { skin: 0xd09a74, hair: 0xbcb8ae, shirt: 0x8a1c1c, pants: 0x4a3a2a, boots: 0x3a2818, belt: 0x2a1c12, hat: 'cowl', hatC: 0x8a1c1c, face: ['longbeard'],
      extras: ['smock'], weapon: 'crossbow', bootTop: true };
    case 'tell': return { skin: 0xd09a74, hair: 0x5a3a1c, shirt: 0xcfc6ae, sleeve: 0xcfc6ae, pants: 0x5a4a34, boots: 0x3a2818, hat: 'felt', hatC: 0x3a4a2a, plume: 0xf0ece0, face: ['longbeard'],
      extras: ['smock', 'quiver'], belt: 0x3a2414, weapon: 'crossbow', bootTop: true };
    case 'confederate': return { skin: pick(SKINS), hair: pick([0x5a3a1c, 0x8a6a3a, 0x3a2a1a, 0x9a9a90]), shirt: pick([0xcfc6ae, 0x8a7a5a, 0x6a5a40, 0x7a3a2a]), pants: pick([0x5a4a34, 0x4a4030, 0x3a3a3a]), boots: 0x3a2818,
      hat: r() < 0.5 ? 'cowl' : 'felt', hatC: pick([0x6a5a40, 0x3a4a2a, 0x7a2a22]), plume: 0xf0ece0, face: [r() < 0.5 ? 'longbeard' : 'beard'], extras: ['smock'], weapon: 'halberd', bootTop: true };
    // ---- people who take no part in the fight: the men and women who live where the chapters are set (no weapon, no helmet) ----
    case 'westWoman': { const d = pick([0x6a3a4a, 0x3a4a6a, 0x7a6a4a, 0x4a5a3a, 0x8a4a3a, 0x5a5a66]);
      return { skin: pick(SKINS), hair: pick([0x2a1a10, 0x5a3a1c, 0x8a5a2a, 0x1a1210, 0xb89050]), shirt: d, sleeve: d, pants: d, dress: d, hem: 0xe6dcc8, boots: 0x2a1c12, hat: null, face: ['bun'], lip: 0xa8483c,
        extras: r() < 0.6 ? ['dress', 'apron'] : ['dress', 'shawl'], shawl: pick([0x4a3a30, 0x3a3a44]), scale: 0.94 }; }
    case 'westMan': return { skin: pick(SKINS), hair: pick([0x2a1a10, 0x4a3018, 0x8a8a84, 0x1a1210]), shirt: pick([0xe0d8c8, 0xc8c0a8, 0x9aa0a8]), pants: pick([0x3a3430, 0x4a4034, 0x2c3440]), boots: 0x2a1c12,
      hat: r() < 0.4 ? 'fedora' : null, hatC: pick([0x2a2420, 0x3a342c]), extras: ['vest'], vest: pick([0x2a2018, 0x3a2a2a, 0x1c1c22]), face: [pick(['moustache', 'beard', 'bigmoustache'])] };
    case 'japanWoman': { const d = pick([0x3a4a6a, 0x6a5a48, 0x5a6a5a, 0x7a4a4a, 0x4a4a5a]);
      return { skin: pick([0xe6c0a0, 0xdcb494, 0xe0b890]), hair: 0x0c0c0e, shirt: d, robe: d, sleeve: d, pants: d, hem: pick([0x2a2a3a, 0x8a3a2a, 0xc8b070]), accent: pick([0x8a2a22, 0xc8a84a, 0x2a4a3a]), boots: 0xe0d8c0, legR: 0.1,
        hat: r() < 0.3 ? 'kasa' : null, hatC: 0xc8b070, face: ['bun'], lip: 0xa8483c, extras: ['kosode', 'obi'], scale: 0.93 }; }
    case 'japanMan': return { skin: pick([0xd6a37c, 0xc89868, 0xd0a078]), hair: 0x0c0c0c, shirt: pick([0x4a5a6a, 0x6a5a40, 0x3a4a3a, 0x5a4a3a]), pants: pick([0x3a3a3a, 0x4a4438, 0x2a3040]), boots: 0xd8cfb8, legR: 0.1,
      hat: r() < 0.6 ? 'kasa' : null, hatC: 0xc8b070, face: r() < 0.5 ? ['topknot'] : [], extras: ['kimono', 'obi'], accent: 0x2a2a2a, trim: 0xd8d0c0 };
    case 'swissWoman': { const d = pick([0x7a2a22, 0x3a4a6a, 0x4a5a34, 0x6a4a2a, 0x5a3a4a]), b = pick([0x3a2a22, 0x2a3a2a, 0x4a2a2a, d]);
      return { skin: pick([0xe0b48e, 0xe6c0a0, 0xd6a37c]), hair: pick([0xc8a050, 0x8a6a3a, 0x5a3a1c, 0xd8b860]), shirt: b, sleeve: 0xe6e0d0, pants: d, dress: d, hem: 0x2a2018, boots: 0x3a2818, hat: null, lip: 0xa8483c,
        face: [r() < 0.5 ? 'kerchief' : 'plaits'], kerchief: pick([0xe6e0d0, 0x8a3a2a, 0xd8cdb0]), extras: ['dress', 'apron'], apron: pick([0xe6e0d0, 0x8a9ab0, 0xc8c0a8]), scale: 0.94 }; }
    case 'swissMan': return { skin: pick(SKINS), hair: pick([0x5a3a1c, 0x8a6a3a, 0x3a2a1a, 0x9a9a90]), shirt: pick([0xcfc6ae, 0x8a7a5a, 0x6a5a40, 0x5a6a4a]), pants: pick([0x5a4a34, 0x4a4030, 0x3a3a34]), boots: 0x3a2818, bootTop: true,
      hat: r() < 0.6 ? 'felt' : null, hatC: pick([0x6a5a40, 0x3a4a2a, 0x4a3a2a]), face: [r() < 0.5 ? 'longbeard' : 'beard'], extras: ['smock'], belt: 0x2a1c12 };
    case 'greekWoman': { const d = pick([0xf0ece0, 0xe8d8a0, 0xd8b23a, 0x9ab0c8, 0xc86a4a, 0x8a5a8a, 0xe6e0d0]);
      const sk = pick([0xd8a878, 0xc89868, 0xe0b48e]);
      return { skin: sk, hair: pick([0x14100c, 0x2a1a10, 0x4a3018, 0x6a4424]), shirt: d, sleeve: sk, pants: sk, dress: d, hem: pick([0x2a4a8a, 0x8a1c1c, 0xc9a050, 0x2a2a2a]), boots: 0x8a6a3a, belt: 0xc9a050,
        hat: null, face: ['bun', 'headband'], accent: pick([0xc9a050, 0xf0ece0, 0x8a1c1c]), lip: 0xa8483c, extras: r() < 0.35 ? ['dress', 'brooches', 'shawl'] : ['dress', 'brooches'], shawl: pick([0x8a5a8a, 0x2a4a8a, 0xc86a4a]), beads: 0xc9a050, scale: 0.94 }; }
    case 'greekMan': { const sk = pick([0xc89868, 0xb8845c, 0xd8a878]);
      return { skin: sk, hair: pick([0x14100c, 0x2a1a10, 0x9a9a90]), shirt: pick([0xf0ece0, 0xd8c8a0, 0x9ab0c8, 0xc86a4a]), sleeve: sk, pants: sk, boots: 0x8a6a3a, belt: 0x6a4a2a,
        hat: r() < 0.3 ? 'pilos' : null, face: r() < 0.7 ? ['beard'] : [], extras: ['smock'] }; }
    case 'norseWoman': { const d = pick([0x7a2a22, 0x2a4a6a, 0x3a5a3a, 0x8a6a2a, 0x5a3a5a, 0x4a4a52]), u = pick([0xd8ccb0, 0xe6e0d0, 0xb8c4d0]);
      return { skin: pick([0xe6c8b0, 0xe0bca0, 0xecd0b8]), hair: pick([0xe0c878, 0xd8b860, 0xe8d498, 0xe0c878, 0xc8a050, 0xb8602c]), shirt: d, sleeve: u, pants: u, dress: d, hem: pick([0xc9a050, 0xe6e0d0, 0x8a1c1c]), boots: 0x3a2818, belt: 0x3a2818,
        hat: null, face: [r() < 0.75 ? 'plaits' : 'longhair', 'headband'], accent: pick([0xc9a050, 0x8a1c1c, 0x2a4a6a]), tie: 0xc9a050, lip: 0xb86a5a, brooch: 0xb8862a, beads: pick([0x2a6a9a, 0xd08a2a, 0x8a1c1c]),
        extras: r() < 0.4 ? ['dress', 'brooches', 'shawl'] : ['dress', 'brooches'], shawl: pick([0x5a4632, 0x7a7a76, 0x3a3028]), scale: 0.95 }; }
    case 'norseMan': return { skin: pick([0xe0bca0, 0xdcae8c, 0xe6c8b0]), hair: pick([0xd8b860, 0xb8893a, 0x8a3a1c, 0x5a3a1c, 0xe0c878]), shirt: pick([0x5a6a4a, 0x7a3a2a, 0x3a4a6a, 0x8a7a52]), pants: pick([0x4a4034, 0x3a3a34, 0x4a3a2a]), boots: 0x3a2818,
      bootTop: true, belt: 0x2a1c12, hat: null, face: r() < 0.6 ? ['longhair', 'beard'] : ['longbeard'], extras: r() < 0.4 ? ['smock', 'cape'] : ['smock'], cape: pick([0x5a4632, 0x3a4a3a, 0x4a4a52]) };
    case 'frenchWoman': { const d = pick([0x3a4a6a, 0x5a5a5a, 0x6a3a3a, 0x4a4a3a, 0x3a3a44]);
      return { skin: pick([0xe0b89a, 0xe6c0a0, 0xd6a88a]), hair: pick([0x2a1c12, 0x5a3a1c, 0x8a6a3a, 0x9a9a90]), shirt: d, sleeve: d, pants: d, dress: d, boots: 0x2a1c12, hat: null, lip: 0xa8483c,
        face: [r() < 0.5 ? 'kerchief' : 'bun'], kerchief: pick([0x3a4a6a, 0xd8cdb0, 0x8a3a2a]), extras: r() < 0.6 ? ['dress', 'apron'] : ['dress', 'shawl'], apron: pick([0xd8d0c0, 0x8a9ab0]), bib: true, shawl: 0x3a3a3a, scale: 0.94 }; }
    case 'frenchMan': return { skin: pick([0xe0b89a, 0xd6a88a]), hair: pick([0x2a1c12, 0x5a3a1c, 0x9a9a90]), shirt: pick([0xd8d0c0, 0xb8c0c8, 0xa8a090]), pants: pick([0x3a3a44, 0x4a4034, 0x33415c]), boots: 0x2a1c12,
      hat: 'beret', hatC: pick([0x22222a, 0x3a2a22]), face: [pick(['moustache', 'bigmoustache', 'pipe'])], extras: ['vest'], vest: pick([0x2a2a30, 0x4a3a2a, 0x3a3a3a]) };
    case 'cure': return { skin: 0xe0b89a, hair: 0x9a9a90, shirt: 0x15151a, sleeve: 0x15151a, pants: 0x15151a, boots: 0x0c0c0c, belt: 0x15151a, hat: null, face: ['glasses'], extras: ['robe'], robe: 0x15151a, sash: 0x15151a };
    case 'russianWoman': { const d = pick([0x4a4a52, 0x5a4a3a, 0x3a4a5a, 0x5a3a3a]);
      return { skin: pick([0xe6c8b0, 0xe0bca0]), hair: pick([0x8a6a3a, 0x5a3a1c, 0xc8a050, 0x9a9a90]), shirt: d, sleeve: d, pants: d, dress: pick([0x3a3a44, 0x4a3a30, 0x2a3a4a]), boots: pick([0x8a8478, 0x1a1410]), hat: null, lip: 0xa8483c,
        face: ['kerchief'], kerchief: pick([0xb83a2a, 0xe6e0d0, 0x3a5a8a, 0xc8a84a]), extras: ['dress', 'coat'], coat: d, scale: 0.94 }; }
    case 'russianMan': return { skin: pick([0xe0bca0, 0xdcae8c]), hair: pick([0x5a3a1c, 0x2a1c12, 0x9a9a90]), shirt: 0x4a4a52, pants: pick([0x2a2a30, 0x3a3a34]), boots: 0x14120f, bootTop: true, hat: 'ushanka', hatC: pick([0x3a3028, 0x4a4a52, 0x2a2420]),
      face: r() < 0.5 ? ['moustache'] : [], extras: ['coat'], coat: pick([0x3a3a44, 0x4a4034, 0x2a3040]) };
    case 'tibetWoman': case 'nepalWoman': { const d = pick([0x1c1c22, 0x2a1c18, 0x3a2420, 0x24242c]), b = pick([0xf0ece0, 0xe0a82a, 0xd85a8a, 0x3a9ac8, 0xb83a2a, 0x9a4ab0]), nep = type === 'nepalWoman';      // a dark sleeveless chuba over a bright blouse, the striped apron of a married woman
      return { skin: nep ? pick([0xb8845c, 0xa87048, 0xc0875c]) : pick([0xc89468, 0xb8845c, 0xd0a078]), hair: 0x0c0c0c, shirt: d, sleeve: b, pants: d, dress: nep && r() < 0.4 ? pick([0x1c5a6a, 0x5a1c3a]) : d, hem: 0x15151a, boots: 0x4a2c14, belt: 0xe0c060, hat: null,
        lip: 0xa8483c, face: [r() < 0.5 ? 'plaits' : 'longhair'], tie: 0x2ac8c0, collar: b, extras: ['dress', 'apron', 'collar'], apron: 0xd8d0c0, scale: 0.94,
        stripes: pick([[0xb83a2a, 0x2a5a8a, 0xe0a82a, 0x3a7a4a, 0xd85a8a, 0x2a5a8a, 0xe0a82a, 0xb83a2a], [0x3a7a4a, 0xe0a82a, 0xb83a2a, 0x2a5a8a, 0xd8d0c0, 0xb83a2a, 0x3a7a4a, 0x9a4ab0], [0x2a5a8a, 0xd85a8a, 0xe0a82a, 0x15151a, 0xb83a2a, 0x3a7a4a, 0xe0a82a, 0x2a5a8a]]) }; }
    case 'tibetMan': return { skin: pick([0xc0875c, 0xb07a52]), hair: 0x0c0c0c, shirt: 0xb82a22, sleeve: pick([0xb82a22, 0x6a1c22]), pants: pick([0x3a4a5a, 0x3a2a20]), boots: 0x4a2c14, bootTop: true,                                   // a Khampa: wine-red chuba, red shirt, a broad felt hat
      hat: r() < 0.7 ? 'cowboy' : null, hatC: pick([0xb89a70, 0x8a7a6a, 0xd8c8a8]), hatBand: 0x3a2a20, face: r() < 0.4 ? ['longhair', 'moustache'] : ['longhair'], extras: ['chuba'], coat: pick([0x6a1c22, 0x5a1a24, 0x4a2a2a]), fur2: 0x4a1418, accent: pick([0xb01c1c, 0xd9a020]) };
    case 'nun': return { skin: pick([0xc89468, 0xd0a078, 0xe0b890]), hair: null, shirt: pick([0xe0a82a, 0xb82a22, 0x7a1c22]), sleeve: 0x7a1c22, pants: 0x7a1c22, boots: 0x4a2c14, hat: null, lip: 0xa8483c, face: r() < 0.3 ? ['glasses'] : [],
      extras: ['robe', 'shawl'], robe: pick([0x7a1c22, 0x8a2428]), sash: 0x7a1c22, shawl: 0x7a1c22, belt: 0x7a1c22, scale: 0.93 };
    case 'mexicaWoman': { const s = pick([0xb07a50, 0xa87048, 0xb8845c]);
      return { skin: s, hair: 0x0c0c0c, shirt: 0xf0e8d0, sleeve: s, pants: s, dress: pick([0xf0e8d0, 0xe8dcc0, 0xd8c8a0]), hem: pick([0xa02c20, 0x2a6a9a, 0x2ac8c0, 0xd9a820]), boots: s, belt: pick([0xa02c20, 0x2a6a9a]), hat: null, lip: 0x8a3a30,
        face: [r() < 0.5 ? 'bun' : 'plaits'], extras: ['dress', 'smock'], scale: 0.93 }; }
    case 'mexicaMan': { const s = pick([0xb07a50, 0xa87048, 0xb8845c]);
      return { skin: s, hair: 0x0c0c0c, shirt: s, sleeve: s, pants: s, boots: s, belt: 0xf0e8d0, hat: null, face: [], extras: ['kilt', 'cape'], kilt: 0xf0e8d0, kilt2: pick([0xa02c20, 0x2a6a9a]), cape: pick([0xf0e8d0, 0xd8c8a0, 0xe8dcc0]) }; }
  }
  return {};
}

// --- behaviour ---------------------------------------------------------------
export const TYPES = {
  cowboy: { hp: 60, speed: 3.4, ranged: true, range: 46, rMin: 9, rMax: 24, dmg: 9, cool: [1.1, 2.3], windup: 0.5, spread: 0.035, proj: 'bullet', pspeed: 80, sight: 46 },
  bandit: { hp: 75, speed: 3.1, ranged: true, range: 65, rMin: 14, rMax: 34, dmg: 14, cool: [1.9, 3.1], windup: 0.75, spread: 0.02, proj: 'bullet', pspeed: 95, sight: 55, twoHand: true },
  westBoss: { hp: 340, speed: 3.9, ranged: true, range: 50, rMin: 8, rMax: 20, dmg: 10, cool: [1.3, 2.0], windup: 0.45, spread: 0.04, proj: 'bullet', pspeed: 80, sight: 60, burst: 3, boss: true },
  ninja: { hp: 50, speed: 6.6, melee: true, reach: 2.1, dmg: 15, windup: 0.3, recover: 0.55, zigzag: true, throws: true, sight: 30 },
  ronin: { hp: 110, speed: 4.3, melee: true, reach: 2.3, dmg: 24, windup: 0.45, recover: 0.75, sight: 34 },
  archer: { hp: 60, speed: 3.0, ranged: true, range: 55, rMin: 12, rMax: 30, dmg: 15, cool: [2.1, 3.3], windup: 0.8, spread: 0.022, proj: 'arrow', pspeed: 44, sight: 50, twoHand: true },
  japanBoss: { hp: 440, speed: 5.2, melee: true, reach: 2.6, dmg: 30, windup: 0.4, recover: 0.5, sight: 45, boss: true, throws: true },
  halberdier: { hp: 85, speed: 4.0, melee: true, reach: 2.9, dmg: 22, windup: 0.5, recover: 0.8, sight: 40, thrust: true },
  soldier: { hp: 70, speed: 3.4, ranged: true, range: 55, rMin: 12, rMax: 30, dmg: 11, cool: [1.4, 2.6], windup: 0.6, spread: 0.028, proj: 'bullet', pspeed: 90, sight: 50, twoHand: true },
  officer: { hp: 60, speed: 3.8, ranged: true, range: 40, rMin: 7, rMax: 18, dmg: 9, cool: [0.8, 1.6], windup: 0.4, spread: 0.04, proj: 'bullet', pspeed: 80, sight: 46 },
  gunner: { hp: 80, speed: 3.0, ranged: true, range: 70, rMin: 10, rMax: 40, dmg: 8, cool: [2.2, 3.2], windup: 0.7, spread: 0.055, proj: 'bullet', pspeed: 95, sight: 62, burst: 5, twoHand: true },
  dog: { hp: 35, speed: 7.6, melee: true, reach: 1.7, dmg: 12, windup: 0.22, recover: 0.6, sight: 44, dog: true, hit: [[0.55, 0.42, false], [0.72, 0.3, true]] },
  warBoss: { hp: 460, speed: 3.9, ranged: true, range: 50, rMin: 8, rMax: 22, dmg: 9, cool: [1.2, 1.9], windup: 0.45, spread: 0.045, proj: 'bullet', pspeed: 85, sight: 60, burst: 4, boss: true, twoHand: true },
  hoplite: { hp: 100, speed: 3.8, melee: true, reach: 2.8, dmg: 22, windup: 0.5, recover: 0.8, sight: 40, thrust: true },
  peltast: { hp: 60, speed: 3.4, ranged: true, range: 40, rMin: 9, rMax: 22, dmg: 14, cool: [2.0, 3.0], windup: 0.7, spread: 0.03, proj: 'javelin', pspeed: 34, sight: 46, thrower: true },
  greeceBoss: { hp: 460, speed: 4.6, melee: true, reach: 2.9, dmg: 30, windup: 0.42, recover: 0.5, sight: 50, boss: true, thrust: true },
  viking: { hp: 95, speed: 4.1, melee: true, reach: 2.3, dmg: 22, windup: 0.45, recover: 0.75, sight: 38 },
  berserker: { hp: 70, speed: 6.2, melee: true, reach: 2.2, dmg: 20, windup: 0.3, recover: 0.5, zigzag: true, sight: 36 },
  bowman: { hp: 60, speed: 3.0, ranged: true, range: 55, rMin: 12, rMax: 30, dmg: 15, cool: [2.1, 3.3], windup: 0.8, spread: 0.022, proj: 'arrow', pspeed: 44, sight: 50, twoHand: true },
  northBoss: { hp: 480, speed: 4.4, melee: true, reach: 3.0, dmg: 32, windup: 0.5, recover: 0.6, sight: 50, boss: true },
  chieftain: { hp: 200, speed: 4.3, melee: true, reach: 2.7, dmg: 28, windup: 0.45, recover: 0.65, sight: 44 },
  agent: { hp: 65, speed: 3.8, ranged: true, range: 42, rMin: 7, rMax: 18, dmg: 9, cool: [0.8, 1.6], windup: 0.4, spread: 0.04, proj: 'bullet', pspeed: 80, sight: 46 },
  militia: { hp: 85, speed: 3.1, ranged: true, range: 65, rMin: 10, rMax: 36, dmg: 8, cool: [2.1, 3.1], windup: 0.7, spread: 0.055, proj: 'bullet', pspeed: 95, sight: 58, burst: 4, twoHand: true },
  russiaBoss: { hp: 480, speed: 4.0, ranged: true, range: 50, rMin: 8, rMax: 20, dmg: 10, cool: [1.2, 1.9], windup: 0.45, spread: 0.04, proj: 'bullet', pspeed: 85, sight: 60, burst: 3, boss: true },
  pla: { hp: 70, speed: 3.4, ranged: true, range: 60, rMin: 12, rMax: 32, dmg: 11, cool: [1.5, 2.7], windup: 0.6, spread: 0.028, proj: 'bullet', pspeed: 90, sight: 54, twoHand: true },
  plaGunner: { hp: 80, speed: 3.0, ranged: true, range: 70, rMin: 10, rMax: 40, dmg: 8, cool: [2.2, 3.2], windup: 0.7, spread: 0.055, proj: 'bullet', pspeed: 95, sight: 62, burst: 5, twoHand: true },
  redguard: { hp: 60, speed: 5.8, melee: true, reach: 2.2, dmg: 15, windup: 0.32, recover: 0.55, zigzag: true, sight: 36 },
  tibetBoss: { hp: 480, speed: 4.0, ranged: true, range: 55, rMin: 8, rMax: 22, dmg: 10, cool: [1.2, 1.9], windup: 0.45, spread: 0.04, proj: 'bullet', pspeed: 85, sight: 62, burst: 3, boss: true },
  duelist: { hp: 100, speed: 0, ranged: true, range: 0, rMin: 0, rMax: 0, dmg: 0, cool: [1, 1], windup: 1, spread: 0, proj: 'bullet', pspeed: 80, sight: 0 },   // the other player in a duel
  crossbowman: { hp: 70, speed: 2.8, ranged: true, range: 60, rMin: 14, rMax: 32, dmg: 18, cool: [2.7, 3.7], windup: 0.9, spread: 0.018, proj: 'bolt', pspeed: 52, sight: 55, twoHand: true },
  knight: { hp: 190, speed: 3.3, melee: true, reach: 2.4, dmg: 28, windup: 0.5, recover: 0.8, sight: 40 },
  rodelero: { hp: 100, speed: 3.9, melee: true, reach: 2.4, dmg: 22, windup: 0.45, recover: 0.75, sight: 40 },
  ballestero: { hp: 70, speed: 2.8, ranged: true, range: 60, rMin: 14, rMax: 32, dmg: 18, cool: [2.7, 3.7], windup: 0.9, spread: 0.018, proj: 'bolt', pspeed: 52, sight: 55, twoHand: true },
  arcabucero: { hp: 70, speed: 2.7, ranged: true, range: 60, rMin: 12, rMax: 30, dmg: 30, cool: [4.2, 5.4], windup: 1.1, spread: 0.035, proj: 'bullet', pspeed: 90, sight: 54, twoHand: true },   // slow to load, hard when it hits
  jinete: { hp: 230, speed: 6.2, melee: true, reach: 3.3, dmg: 30, windup: 0.5, recover: 0.9, sight: 55, thrust: true, rider: true, hit: [[2.5, 0.22, true], [2.1, 0.34, false], [1.35, 0.62, false], [0.7, 0.45, false]] },
  cannoneer: { hp: 90, speed: 2.6, ranged: true, range: 85, rMin: 10, rMax: 80, dmg: 45, cool: [5.5, 7.0], windup: 1.3, spread: 0.012, proj: 'ball', pspeed: 58, sight: 85 },
  aztecBoss: { hp: 460, speed: 4.3, melee: true, reach: 2.7, dmg: 30, windup: 0.42, recover: 0.55, sight: 50, boss: true },
  swissBoss: { hp: 440, speed: 4.4, melee: true, reach: 2.7, dmg: 30, windup: 0.42, recover: 0.55, sight: 50, boss: true },
};

const _o = { x: 0, y: 0, z: 0 }, _d = { x: 0, y: 0, z: 0 };
let _uid = 1;

export class Enemy {
  constructor(game, type, x, z, o = {}) {
    this.game = game; this.type = type; this.cfg = TYPES[type]; this.id = _uid++;
    const r = game.rand;
    this.rig = this.cfg.dog ? makeDog(game.M) : this.cfg.rider ? makeRider(game.M, lookFor(o.look ?? type, r)) : makeHumanoid(game.M, lookFor(o.look ?? type, r));
    this.scale = this.rig.scale;
    this.pos = new THREE.Vector3(x, game.world.groundAt(x, z, o.up !== undefined ? game.world.height(x, z) + o.up : o.y ?? 2), z);   // o.up: floor of a building on a slope
    this.home = this.pos.clone();
    this.yaw = o.yaw ?? r() * TAU;
    this.hp = this.cfg.hp; this.state = o.ambush ? 'hidden' : 'idle';
    this.static = !!o.static;                 // stays put (balcony / rooftop shooters)
    this.patrol = o.patrol ?? (!this.static && r() < 0.5);
    this.ambushDist = o.ambush === true ? 15 : o.ambush || 0;
    this.cool = 1 + r() * 1.5; this.aim = 0; this.burst = 0; this.strike = 0; this.recover = 0;
    this.strafe = r.sign(); this.strafeT = 1 + r() * 2; this.los = false; this.seeT = r() * 0.3;
    this.walk = r() * 6; this.moving = 0; this.flinch = 0; this.flash = 0; this.stuck = 0; this.detour = 0; this.detourDir = 1;
    this.wanderT = 2 + r() * 4; this.wander = null; this.throwT = 2 + r() * 2; this.deathT = 0; this.react = 0;
    this.armPose = 0; this.name = o.name; this.path = null; this.pathI = 0; this.pathT = r() * 0.6; this.slump = false;
    game.gfx.root.add(this.rig.group);
    this.rig.group.visible = this.state !== 'hidden';
    this.sync();
  }
  get alive() { return this.state !== 'dead'; }
  get eyeY() { return this.pos.y + 1.6 * this.scale; }

  sync() {
    const g = this.rig.group;
    g.position.copy(this.pos); g.rotation.y = this.yaw;
  }

  alert(delay = 0) {
    if (this.state !== 'idle') return;
    this.state = 'combat'; this.react = delay + 0.35 + this.game.rand() * 0.5;
    if (delay === 0) { if (this.cfg.dog) this.game.sound.bark(); else this.game.sound.shout(); }
    for (const e of this.game.enemies) if (e !== this && e.state === 'idle' && e.pos.distanceToSquared(this.pos) < 11 * 11) e.alert(0.3 + this.game.rand() * 0.6);
  }

  /** True if every navigation cell on the straight line to (x, z) is walkable. */
  straightFree(x, z) {
    const nav = this.game.nav, dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(d / (nav.cell * 0.7)));
    for (let i = 1; i <= n; i++) { const k = nav.idx(this.pos.x + dx * i / n, this.pos.z + dz * i / n); if (k < 0 || !nav.free[k]) return false; }
    return true;
  }
  /** Unit direction of the next step toward the player: straight if the way is open, otherwise along a route. */
  toward(dx, dz, dist, dt) {
    const G = this.game, P = this.tgt || G.player, nav = G.nav;
    if (!nav) return [dx / dist, dz / dist];
    this.pathT -= dt;
    if (this.los && dist < 16 && this.straightFree(P.pos.x, P.pos.z)) { this.path = null; return [dx / dist, dz / dist]; }
    if (!this.path || this.pathT <= 0) { this.pathT = 0.7 + G.rand() * 0.6; this.path = nav.path(this.pos.x, this.pos.z, P.pos.x, P.pos.z, 30000, this.pos.y, P.pos.y); this.pathI = 0; }
    const path = this.path;
    if (!path) return [dx / dist, dz / dist];
    while (this.pathI < path.length - 1 && Math.hypot(path[this.pathI][0] - this.pos.x, path[this.pathI][1] - this.pos.z) < 0.75) this.pathI++;
    const n = path[this.pathI], ex = n[0] - this.pos.x, ez = n[1] - this.pos.z, el = Math.hypot(ex, ez) || 1;
    return [ex / el, ez / el];
  }

  /** Ray vs. the body's hit spheres. Returns {t, head} or null. */
  rayHit(o, d, max) {
    if (this.state === 'dead' || this.state === 'hidden') return null;
    const s = this.scale, P = this.pos;
    let best = null;
    const test = (cy, r, head) => {
      const ox = o.x - P.x, oy = o.y - (P.y + cy * s), oz = o.z - P.z, rr = r * s;
      const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - rr * rr;
      const disc = b * b - c;
      if (disc < 0) return;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < max && (!best || t < best.t)) best = { t, head };
    };
    if (this.cfg.hit) for (const h of this.cfg.hit) test(h[0], h[1], h[2]);
    else { test(1.68, 0.2, true); test(1.28, 0.31, false); test(0.92, 0.29, false); test(0.52, 0.25, false); test(0.18, 0.2, false); }
    return best;
  }

  damage(amount, head, fromX, fromZ) {
    if (!this.alive || this.state === 'hidden') return false;
    if (this.puppet) { this.flinch = 1; this.flash = 1; this.game.duel.send({ t: 'ehit', i: this.idx, d: amount, h: head ? 1 : 0, x: fromX, z: fromZ }); return false; }   // duel guest: the host decides
    this.hp -= amount * (head ? 2.5 : 1);
    this.flinch = 1; this.flash = 1;
    if (this.state === 'idle') { this.state = 'combat'; this.react = 0.25; for (const e of this.game.enemies) if (e.state === 'idle' && e.pos.distanceToSquared(this.pos) < 144) e.alert(0.4); }
    if (this.hp <= 0) {
      this.state = 'dead'; this.deathT = 0;
      this.yaw = Math.atan2(fromX - this.pos.x, fromZ - this.pos.z);   // face the shot, fall away from it
      this.fallDir = this.game.rand() < 0.25 ? 1 : -1;
      const W = this.game.world, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), y = this.pos.y + 0.7;
      const room = (s) => W.clear(this.pos.x, y, this.pos.z, this.pos.x + fx * s * 1.9, y, this.pos.z + fz * s * 1.9);
      if (!room(this.fallDir)) { if (room(-this.fallDir)) this.fallDir = -this.fallDir; else this.slump = true; }   // against a wall: fall the other way, or sink down
      if (this.game.enemyDown) this.game.enemyDown(this);
      return true;
    }
    return false;
  }

  update(dt) {
    const G = this.game, P = (this.tgt = G.duel ? G.duel.targetFor(this) : G.player), cfg = this.cfg, rig = this.rig, r = G.rand;
    this.flash = Math.max(0, this.flash - dt * 7); this.flinch = Math.max(0, this.flinch - dt * 5);
    rig.mat.emissive.setScalar(this.flash * 0.7);

    if (this.poison > 0 && this.alive && !this.puppet) {                       // poison: it goes on working for five seconds, and turns the skin green
      this.poison -= dt; this.poisonT = (this.poisonT || 0) + dt; rig.mat.color.setRGB(0.7, 1, 0.64);
      if (this.poisonT >= 0.5) { this.poisonT = 0; G.hitEnemy(this, 7, false, this.pos.x, this.pos.y + 1.2, this.pos.z, G.player.pos.x, G.player.pos.z, true); }
      if (this.poison <= 0 && this.alive) rig.mat.color.setRGB(1, 1, 1);
    }
    if (this.state === 'dead') {
      this.deathT += dt;
      const t = Math.min(1, this.deathT / 0.55), e = t * t;
      if (this.cfg.dog || this.cfg.rider) rig.group.rotation.z = e * 1.45;  // a dog rolls onto its side, and so does a horse with its rider
      else if (this.slump) { rig.group.rotation.x = this.fallDir * e * 0.5; rig.legL.rotation.x = rig.legR.rotation.x = -e * 1.3; }
      else rig.group.rotation.x = this.fallDir * e * 1.5 + (t >= 1 ? 0 : Math.sin(t * 9) * 0.03);
      rig.group.position.y = this.pos.y + (this.slump ? -e * 0.55 : e * 0.14) * this.scale;
      rig.armL.rotation.x = damp(rig.armL.rotation.x, -0.6, 6, dt); rig.armR.rotation.x = damp(rig.armR.rotation.x, 0.5, 6, dt);
      rig.armL.rotation.z = damp(rig.armL.rotation.z, 0.9, 6, dt); rig.armR.rotation.z = damp(rig.armR.rotation.z, -0.7, 6, dt);
      rig.legL.rotation.x = damp(rig.legL.rotation.x, 0.25, 6, dt); rig.legR.rotation.x = damp(rig.legR.rotation.x, -0.2, 6, dt);
      return;
    }
    if (this.puppet) { this.puppetUpdate(dt); return; }

    const dx = P.pos.x - this.pos.x, dz = P.pos.z - this.pos.z, dist = Math.hypot(dx, dz) || 0.001;
    const duck = P.duck || 0, dy = (P.pos.y + 1.2 - 0.5 * duck) - (this.pos.y + 1.4 * this.scale);   // a crouching target is lower, and harder to see
    this.seeT -= dt;
    if (this.seeT <= 0) {
      this.seeT = 0.18 + r() * 0.12;
      this.los = dist < 110 && G.world.clear(this.pos.x, this.eyeY, this.pos.z, P.pos.x, P.pos.y + 1.5 - 0.7 * duck, P.pos.z);
    }

    if (this.state === 'hidden') {
      if (dist < this.ambushDist && !P.dead) {
        this.state = 'combat'; this.react = 0.45; rig.group.visible = true;
        G.poof(this.pos.x, this.pos.y + 1, this.pos.z);
      }
      return;
    }

    let mvx = 0, mvz = 0, speed = 0, wantYaw = this.yaw, pose = 0;   // pose: 0 rest, 1 aim/ready
    if (this.state === 'idle') {
      if (!P.dead && !G.peace) {
        const facing = Math.cos(this.yaw - Math.atan2(dx, dz));
        const sneak = !!P.sneaking, st = (P.mods.stealth ?? 1) * (1 - 0.4 * duck) * (sneak ? 0.65 : 1);   // a spy is noticed later, and so is anyone who crouches or sneaks
        if (this.los && dist < cfg.sight * st && (facing > -0.2 || dist < (sneak ? 3 : 10) * st)) this.alert();
        else if (G.noise > 0 && dist < (cfg.sight * 0.55 + 8) * st) this.alert(0.2);
        else if (P.sprinting && P.onGround && dist < 12 && Math.hypot(P.vel.x, P.vel.z) > 6) this.alert(0.4);   // running feet are heard, even from behind a wall
      }
      if (this.patrol) {
        this.wanderT -= dt;
        if (this.wander) {
          const wx = this.wander.x - this.pos.x, wz = this.wander.z - this.pos.z, wd = Math.hypot(wx, wz);
          if (wd < 0.4 || this.wanderT < -6) { this.wander = null; this.wanderT = 2 + r() * 5; }
          else { mvx = wx / wd; mvz = wz / wd; speed = 1.2; wantYaw = Math.atan2(wx, wz); }
        } else if (this.wanderT <= 0) this.wander = { x: this.home.x + (r() - 0.5) * 7, z: this.home.z + (r() - 0.5) * 7 };
      }
    } else if (!P.dead) {
      // ---- combat ----
      wantYaw = Math.atan2(dx, dz);
      this.react -= dt;
      const tx = dx / dist, tz = dz / dist, px = -tz, pz = tx;
      if (cfg.ranged) {
        pose = this.aim > 0 || this.burst > 0 ? 1 : 0.35;
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeT = 0.8 + r() * 2.2; this.strafe = r() < 0.25 ? 0 : r.sign(); }
        if (!this.static && this.aim <= 0) {
          let fwd = 0;
          if (!this.los || dist > cfg.rMax) fwd = 1; else if (dist < cfg.rMin) fwd = -0.8;
          const go = fwd > 0 ? this.toward(dx, dz, dist, dt) : [tx, tz];
          const side = fwd > 0 && this.path ? 0 : this.strafe * 0.8;            // no side-stepping while following a route
          mvx = go[0] * fwd + px * side; mvz = go[1] * fwd + pz * side;
          speed = cfg.speed * (fwd > 0 && !this.los ? 1.25 : 1);
        }
        if (this.react <= 0) {
          this.cool -= dt;
          if (this.aim > 0) {
            this.aim -= dt;
            if (this.aim <= 0) { this.fire(dx, dy, dz, dist); if (cfg.burst) { this.burst = cfg.burst - 1; this.burstT = 0.16; } }
          } else if (this.burst > 0) {
            this.burstT -= dt;
            if (this.burstT <= 0) { this.fire(dx, dy, dz, dist); this.burst--; this.burstT = 0.16; }
          } else if (this.cool <= 0 && this.los && dist < cfg.range) {
            this.aim = cfg.windup; this.cool = cfg.cool[0] + r() * (cfg.cool[1] - cfg.cool[0]);
          }
        }
      } else {
        // melee: close in, wind up, strike
        pose = 1;
        if (this.strike > 0) {
          this.strike -= dt;
          if (this.strike <= 0) {
            if (cfg.dog) G.sound.bark(); else G.sound.slash();
            if (dist < cfg.reach + 0.5 && Math.abs(P.pos.y - this.pos.y) < 2 && G.world.clear(this.pos.x, this.pos.y + (cfg.dog ? 0.6 : 1.2), this.pos.z, P.pos.x, P.pos.y + 1.1, P.pos.z)) G.hurtTarget(P, cfg.dmg, this.pos, true);   // no blows through walls
            this.recover = cfg.recover;
          }
        } else if (this.recover > 0) this.recover -= dt;
        else if (dist < cfg.reach * 0.85 && this.react <= 0) this.strike = cfg.windup;
        else {
          let zig = 0;
          if (cfg.zigzag && dist > 5) zig = Math.sin(G.time * 3.1 + this.id * 1.7) * 0.9;
          const go = this.toward(dx, dz, dist, dt); if (this.path) zig = 0;
          mvx = go[0] + px * zig; mvz = go[1] + pz * zig; speed = cfg.speed * (dist > 4 ? 1 : 0.75);
          if (cfg.throws && this.los && dist > 7 && dist < 26 && this.react <= 0) {
            this.throwT -= dt;
            if (this.throwT <= 0) { this.throwT = (cfg.boss ? 1.6 : 2.6) + r() * 2; this.throwStar(dx, dy, dz, dist); }
          }
        }
      }
    }

    // closing in on a target that cannot see him, an enemy goes slowly and quietly: then he does not show on the player's map
    this.sneaking = this.state === 'combat' && !cfg.dog && !cfg.rider && !this.los && dist < 28 && speed > 0;
    if (this.sneaking) speed *= 0.6;
    // ---- movement ----
    if (speed > 0) {
      const ml = Math.hypot(mvx, mvz) || 1; mvx /= ml; mvz /= ml;
      if (this.detour > 0) { this.detour -= dt; const ox = mvx; mvx = -mvz * this.detourDir * 0.9 + ox * 0.3; mvz = ox * this.detourDir * 0.9 + mvz * 0.3; }
      const bx = this.pos.x, bz = this.pos.z;
      const steps = Math.max(1, Math.ceil(speed * dt / 0.25));               // small steps: nothing is ever skipped over
      for (let q = 0; q < steps; q++) {
        const sx = this.pos.x, sz = this.pos.z, nx = sx + mvx * speed * dt / steps, nz = sz + mvz * speed * dt / steps;
        if (G.world.walkable(sx, sz, nx, nz, this.pos.y)) { this.pos.x = nx; this.pos.z = nz; }
        G.world.collide(this.pos, 0.38, 1.7);
      }
      for (const e of G.enemies) {            // keep some distance from each other
        if (e === this || !e.alive || e.state === 'hidden') continue;
        const ex = this.pos.x - e.pos.x, ez = this.pos.z - e.pos.z, d2 = ex * ex + ez * ez;
        if (d2 < 1.2 && d2 > 1e-5) { const d = Math.sqrt(d2), k = (1.1 - d) / d * 0.5; this.pos.x += ex * k; this.pos.z += ez * k; }
      }
      {                                       // ...and never stand inside the player
        const ex = this.pos.x - P.pos.x, ez = this.pos.z - P.pos.z, d2 = ex * ex + ez * ez, rr = cfg.dog ? 0.7 : 0.8;
        if (d2 < rr * rr && d2 > 1e-6 && Math.abs(P.pos.y - this.pos.y) < 1.6) { const d = Math.sqrt(d2); this.pos.x = P.pos.x + ex / d * rr; this.pos.z = P.pos.z + ez / d * rr; }
      }
      G.world.collide(this.pos, 0.38, 1.7);
      const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
      if (moved < speed * dt * 0.35) this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt * 2);
      if (this.stuck > 0.35) { this.stuck = 0; this.detour = 0.7 + r() * 0.6; this.detourDir = r.sign(); if (this.wander) this.wander = null; }
      this.moving = damp(this.moving, Math.min(1, moved / dt / 3), 10, dt);
      this.walk += moved * 2.6;
    } else this.moving = damp(this.moving, 0, 10, dt);
    const gy = G.world.groundAt(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y = gy > this.pos.y ? gy : Math.max(gy, this.pos.y - 12 * dt);
    if (this.pos.y < G.world.waterY - 1.2) { this.wetT = (this.wetT || 0) + dt; if (this.wetT > 1.5) { this.pos.copy(this.home); this.path = null; this.wetT = 0; } } else this.wetT = 0;   // fallen into deep water: back to where he started

    // ---- pose / animation ----
    let dYaw = wantYaw - this.yaw; dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    this.yaw += dYaw * Math.min(1, dt * (this.state === 'combat' ? 9 : 4));
    this.sync();
    const sw = Math.sin(this.walk) * 0.75 * this.moving;
    rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
    rig.group.position.y = this.pos.y + Math.abs(Math.cos(this.walk)) * 0.04 * this.moving;
    rig.hips.rotation.x = this.moving * 0.08 - this.flinch * 0.35 + (cfg.melee && pose ? 0.12 : 0);
    rig.hips.rotation.y = Math.sin(this.walk) * 0.08 * this.moving;
    this.armPose = damp(this.armPose, pose, 12, dt);
    const pitch = Math.atan2(dy, dist);
    let ax, lx = sw * -0.7, lz = 0.08, az = -0.08;
    if (cfg.melee) {
      // ready stance -> raise high during wind-up -> chop down on the strike
      const up = this.strike > 0 ? 1 - this.strike / cfg.windup : 0;
      const down = this.recover > 0 ? Math.max(0, this.recover / cfg.recover - 0.55) / 0.45 : 0;
      ax = -1.25 * this.armPose - up * 1.6 + (this.recover > 0 ? (1 - down) * 1.0 - down * 1.6 : 0);
      if (cfg.thrust) { ax = -0.35 * this.armPose - up * 0.5; rig.hips.rotation.x += up * -0.2 + (this.recover > 0 ? down * 0.5 : 0); }
      lx = -0.5 * this.armPose + sw * -0.4;
      az = 0.25 * this.armPose; lz = -0.2 * this.armPose;
    } else {
      ax = (-Math.PI / 2 - pitch) * this.armPose + sw * 0.5 * (1 - this.armPose);
      if (cfg.twoHand) { lx = (-1.25 - pitch) * this.armPose + lx * (1 - this.armPose); lz = -0.55 * this.armPose + 0.08; az = 0.12 * this.armPose; }
      if (this.type === 'westBoss') { lx = ax; lz = 0.05; }
      if (cfg.thrower) ax = this.state === 'combat' ? -2.9 - (this.aim > 0 ? 0.35 : 0) : -0.3;   // arm overhead, javelin level
    }
    rig.armR.rotation.x = ax; rig.armR.rotation.z = az;
    rig.armL.rotation.x = lx; rig.armL.rotation.z = lz;
  }

  /** Duel guest: this enemy is simulated on the host; here it only follows the host's reports. */
  puppetUpdate(dt) {
    const n = this.net, rig = this.rig; if (!n) return;
    if (n.st === 2) { if (this.state !== 'dead') { this.hp = 0; this.state = 'dead'; this.deathT = 0; this.fallDir = -1; if (this.game.enemyDown) this.game.enemyDown(this); } return; }
    this.state = n.st === 1 ? 'combat' : 'idle'; this.sneaking = !!n.sn;
    const bx = this.pos.x, bz = this.pos.z, k = Math.min(1, dt * 12);
    this.pos.x += (n.x - bx) * k; this.pos.y += (n.y - this.pos.y) * k; this.pos.z += (n.z - bz) * k;
    let dy = n.yaw - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * k;
    const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
    this.moving = damp(this.moving, Math.min(1, moved / Math.max(dt, 1e-3) / 3), 10, dt); this.walk += moved * 2.6;
    this.sync();
    const sw = Math.sin(this.walk) * 0.75 * this.moving;
    rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
    this.armPose = damp(this.armPose, n.pose, 12, dt);
    rig.armR.rotation.x = (this.cfg.melee ? -1.25 : -Math.PI / 2) * this.armPose + sw * 0.5 * (1 - this.armPose);
    rig.armL.rotation.x = this.cfg.twoHand ? -1.25 * this.armPose : sw * -0.7;
  }

  fire(dx, dy, dz, dist) {
    const G = this.game, cfg = this.cfg, r = G.rand, P = this.tgt || G.player;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const mx = this.pos.x + fx * 0.75 - fz * 0.2 * this.scale, my = this.pos.y + 1.42 * this.scale, mz = this.pos.z + fz * 0.75 + fx * 0.2 * this.scale;
    // aim at the chest, with a little lead and a random error
    const tt = dist / cfg.pspeed * 0.45;
    let ax = P.pos.x + P.vel.x * tt - mx, ay = P.pos.y + 1.15 - 0.5 * (P.duck || 0) - my, az = P.pos.z + P.vel.z * tt - mz;
    if (cfg.proj !== 'bullet') ay += dist * dist / (cfg.pspeed * cfg.pspeed) * 4.5;   // arc compensation
    const l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
    const sp = cfg.spread * (0.6 + r());
    ax += (r() - 0.5) * 2 * sp; ay += (r() - 0.5) * 1.4 * sp; az += (r() - 0.5) * 2 * sp;
    G.shots.spawn(cfg.proj, mx, my, mz, ax, ay, az, cfg.pspeed, false, cfg.dmg);
    if (G.duel) G.duel.enemyShot(cfg.proj, mx, my, mz, ax, ay, az, cfg.pspeed);
    if (cfg.proj === 'bullet' || cfg.proj === 'ball') { G.muzzle(mx + ax * 0.3, my + ay * 0.3, mz + az * 0.3, ax, ay, az, cfg.proj === 'ball' ? 2.2 : 0.7); G.sound.gun(cfg.proj === 'ball' ? 1 : Math.max(0.15, 0.8 - dist / 90), Math.min(1, dist / 70)); }
    else G.sound.bow();
  }
  throwStar(dx, dy, dz, dist) {
    const G = this.game, P = this.tgt || G.player;
    const my = this.pos.y + 1.4 * this.scale, tt = dist / 30 * 0.5;
    let ax = P.pos.x + P.vel.x * tt - this.pos.x, ay = P.pos.y + 1.2 - 0.5 * (P.duck || 0) - my + dist * 0.02, az = P.pos.z + P.vel.z * tt - this.pos.z;
    const l = Math.hypot(ax, ay, az);
    G.shots.spawn('star', this.pos.x + ax / l * 0.6, my, this.pos.z + az / l * 0.6, ax / l, ay / l, az / l, 30, false, 8);
    if (G.duel) G.duel.enemyShot('star', this.pos.x + ax / l * 0.6, my, this.pos.z + az / l * 0.6, ax / l, ay / l, az / l, 30);
    G.sound.whiz();
  }
}

// --- projectiles -------------------------------------------------------------

export class Shots {
  constructor(game) {
    this.game = game; this.list = [];
    const M = game.M;
    const arrow = merge([gCyl(0.008, 0.008, 0.8, 0x6a4a2a, [0, 0, -0.4], [Math.PI / 2, 0, 0], 1, 5), gCone(0.02, 0.07, 0xb0b4bc, [0, 0, 0.03], [Math.PI / 2, 0, 0], 1, 5),
      gBox(0.05, 0.004, 0.12, 0xf0ece0, [0, 0, -0.74]), gBox(0.004, 0.05, 0.12, 0xf0ece0, [0, 0, -0.74])]);
    const bolt = merge([gCyl(0.011, 0.011, 0.42, 0x4a3018, [0, 0, -0.21], [Math.PI / 2, 0, 0], 1, 5), gCone(0.024, 0.07, 0xb0b4bc, [0, 0, 0.03], [Math.PI / 2, 0, 0], 1, 5),
      gBox(0.05, 0.004, 0.09, 0x7a1c1c, [0, 0, -0.38])]);
    const star = gStar(0.095);
    const streak = merge([gBox(0.03, 0.03, 1.6, 0xffc86a, [0, 0, -0.8])]);
    const javelin = merge([gCyl(0.013, 0.013, 1.5, 0x6b4526, [0, 0, -0.75], [Math.PI / 2, 0, 0], 1, 5), gCone(0.028, 0.22, 0xc9ced6, [0, 0, 0.1], [Math.PI / 2, 0, 0], 1, 5)]);
    const axe = merge([gCyl(0.016, 0.018, 0.5, 0x6b4526, [0, 0, -0.1], [Math.PI / 2, 0, 0], 1, 5), gBox(0.014, 0.18, 0.14, 0xc9ced6, [0, -0.07, 0.1]), gBox(0.03, 0.05, 0.06, 0x555a62, [0, 0, 0.12])]);
    const ball = gSph(0.13, 0x2a2c30, [0, 0, 0]), stone = xf(new THREE.IcosahedronGeometry(0.12, 0), [0, 0, 0], [0.4, 0.2, 0], [1, 0.8, 1.1], 0x8a8478);
    const dart = merge([gCyl(0.008, 0.008, 0.95, 0x8a6a3a, [0, 0, -0.42], [Math.PI / 2, 0, 0], 1, 5), gCone(0.02, 0.1, 0x15161a, [0, 0, 0.1], [Math.PI / 2, 0, 0], 1, 5),
      gBox(0.07, 0.004, 0.16, 0x1f9a5a, [0, 0, -0.84]), gBox(0.004, 0.07, 0.16, 0x2ac8c0, [0, 0, -0.84])]);
    // bombs, thrown by the player: a bundle of dynamite, a stick grenade, a clay fire bomb
    const dynamite = merge([0, 1, 2].map((i) => gCyl(0.019, 0.019, 0.2, 0xb02a1c, [(i - 1) * 0.036, 0, 0], [Math.PI / 2, 0, 0], 1, 8)).concat([gBox(0.11, 0.045, 0.025, 0xd8c8a0, [0, 0, 0])]));
    const grenade = merge([gCyl(0.017, 0.017, 0.24, 0x6a4a2a, [0, 0, -0.06], [Math.PI / 2, 0, 0], 1, 8), gCyl(0.04, 0.04, 0.09, 0x4a5236, [0, 0, 0.1], [Math.PI / 2, 0, 0], 1, 10)]);
    const hbomb = merge([gSph(0.075, 0x1c1a18, [0, 0, 0]), gCyl(0.03, 0.03, 0.03, 0x5a3a22, [0, 0.075, 0], [0, 0, 0], 1, 8)]);
    this.geo = { arrow, bolt, star, bullet: streak, javelin, axe, ball, dart, stone, dynamite, grenade, hbomb };
    this.mat = { arrow: M.flat, bolt: M.flat, star: M.metal, bullet: M.glow, javelin: M.flat, axe: M.flat, ball: M.metal, dart: M.flat, stone: M.flat, dynamite: M.flat, grenade: M.flat, hbomb: M.flat };
    this.tracerGeo = merge([gBox(1, 1, 1, 0xffe2a0, [0, 0, 0.5])]);
    this.tracerMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    this.tracers = [];
    this._v = new THREE.Vector3();
  }
  reset() { this.list.length = 0; this.tracers.length = 0; }

  spawn(kind, x, y, z, dx, dy, dz, speed, fromPlayer, dmg, grav) {
    const mesh = new THREE.Mesh(this.geo[kind], this.mat[kind]);
    mesh.castShadow = kind !== 'bullet';
    mesh.position.set(x, y, z);
    this.game.gfx.root.add(mesh);
    const g = grav ?? (kind === 'bullet' ? 0 : kind === 'star' ? 3 : 9);
    const spin = kind === 'axe' ? 22 : kind === 'stone' ? 9 : 0;
    const s = { kind, mesh, x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, g, fromPlayer, dmg, life: 5, near: false, stuck: 0, spin };
    if (BOMB_KINDS[kind]) { s.bomb = true; s.fuse = BOMB_KINDS[kind]; s.life = 99; }
    this.list.push(s);
    return s;
  }
  /** Remove every projectile and tracer from the scene (between duel rounds). */
  clear() { for (const s of this.list) s.mesh.removeFromParent(); for (const t of this.tracers) { t.m.removeFromParent(); t.m.material.dispose(); } this.reset(); }
  tracer(ax, ay, az, bx, by, bz) {
    const m = new THREE.Mesh(this.tracerGeo, this.tracerMat.clone());
    m.position.set(ax, ay, az); m.lookAt(bx, by, bz);
    m.scale.set(0.02, 0.02, Math.hypot(bx - ax, by - ay, bz - az));
    this.game.gfx.root.add(m);
    this.tracers.push({ m, t: 0.09 });
  }

  update(dt) {
    const G = this.game, W = G.world, P = G.player;
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i]; tr.t -= dt;
      tr.m.material.opacity = Math.max(0, tr.t / 0.09);
      if (tr.t <= 0) { tr.m.removeFromParent(); tr.m.material.dispose(); this.tracers.splice(i, 1); }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      if (s.bomb) { if (this.bomb(s, dt)) { s.mesh.removeFromParent(); this.list.splice(i, 1); } continue; }
      if (s.stuck > 0) {                       // arrow lodged somewhere: fade out later
        s.stuck -= dt;
        if (s.stuck <= 0) { s.mesh.removeFromParent(); this.list.splice(i, 1); }
        continue;
      }
      s.life -= dt; s.vy -= s.g * dt;
      const sp = Math.hypot(s.vx, s.vy, s.vz), len = sp * dt;
      _o.x = s.x; _o.y = s.y; _o.z = s.z; _d.x = s.vx / sp; _d.y = s.vy / sp; _d.z = s.vz / sp;
      const wh = W.raycast(_o, _d, len);
      let tMax = wh ? wh.t : len, hitEnemy = null, head = false, hitPlayer = false, hitRemote = false;
      if (s.fromPlayer) {
        for (const e of G.enemies) { const h = e.rayHit(_o, _d, tMax); if (h) { tMax = h.t; hitEnemy = e; head = h.head; } }
      } else if (!s.ghost) {                    // a ghost only shows what the other side of a duel fired; it hits nothing here
        const R = G.duel && G.duel.isHost && G.duel.remote;                     // in a duel the host's enemies can also hit the other player
        if (R) { const h = R.rayHit(_o, _d, tMax); if (h) { tMax = h.t; hitRemote = true; } }
        // closest approach of this step's segment to the player's body axis
        if (!P.dead) for (const [cy, rr] of [[1.45, 0.34], [0.95, 0.42], [0.4, 0.36]]) {
          const ox = s.x - P.pos.x, oy = s.y - (P.pos.y + cy * (1 - 0.4 * P.duck)), oz = s.z - P.pos.z;
          const b = ox * _d.x + oy * _d.y + oz * _d.z, t = clamp(-b, 0, tMax);
          const qx = ox + _d.x * t, qy = oy + _d.y * t, qz = oz + _d.z * t, d2 = qx * qx + qy * qy + qz * qz;
          if (d2 < rr * rr) { hitPlayer = true; hitRemote = false; tMax = t; break; }
          if (d2 < 2.2 && !s.near && s.kind === 'bullet') { s.near = true; G.sound.whiz(); }
        }
      }
      s.x += _d.x * tMax; s.y += _d.y * tMax; s.z += _d.z * tMax;
      s.mesh.position.set(s.x, s.y, s.z);
      if (s.kind === 'star') { s.mesh.rotation.y += dt * 30; } else { s.mesh.lookAt(s.x + _d.x, s.y + _d.y, s.z + _d.z); if (s.spin) s.mesh.rotateX((5 - s.life) * s.spin); }
      if (hitPlayer) { G.hurtPlayer(s.dmg, this._v.set(s.x - _d.x * 5, s.y, s.z - _d.z * 5), false); s.mesh.removeFromParent(); this.list.splice(i, 1); continue; }
      if (hitRemote) { G.duel.send({ t: 'hit', d: s.dmg, x: s.x - _d.x * 5, z: s.z - _d.z * 5 }); s.mesh.removeFromParent(); this.list.splice(i, 1); continue; }
      if (hitEnemy) {
        G.hitEnemy(hitEnemy, s.dmg, head, s.x, s.y, s.z, P.pos.x, P.pos.z);
        if (s.kind === 'dart' && hitEnemy.alive) hitEnemy.poison = 5;                       // the dart was poisoned
        if (s.kind === 'bullet') { s.mesh.removeFromParent(); this.list.splice(i, 1); }
        else { hitEnemy.rig.hips.attach(s.mesh); s.stuck = 30; }
        continue;
      }
      if (wh) {
        if (wh.piece && !s.ghost) G.havoc.damage(wh.piece, s.dmg * (s.kind === 'ball' ? 3 : 1), s.x, s.y, s.z);   // crates, barrels and jars are shot to pieces
        G.impact(s.x, s.y, s.z, wh.nx, wh.ny, wh.nz, s.kind);
        if (s.kind === 'bullet' || (wh.piece && wh.piece.broken)) { s.mesh.removeFromParent(); this.list.splice(i, 1); }
        else { s.stuck = s.fromPlayer ? 40 : 12; s.mesh.position.set(s.x - _d.x * 0.05, s.y - _d.y * 0.05, s.z - _d.z * 0.05); }
        continue;
      }
      if (s.life <= 0) { s.mesh.removeFromParent(); this.list.splice(i, 1); }
    }
  }
  /** A thrown bomb: it flies, bounces off whatever it meets, rolls to a stop, and goes off when its fuse has burnt down. Returns true when it is gone. */
  bomb(s, dt) {
    const G = this.game, W = G.world;
    s.fuse -= dt;
    if (s.fuse <= 0) { G.havoc.explode(s.x, s.y + 0.15, s.z); return true; }
    if (Math.random() < dt * 40) G.gfx.glow.spawn(s.x, s.y + 0.08, s.z, (Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5, { life: 0.25, s0: 0.03, s1: 0.005, r: 3, g: 1.8, b: 0.6, a: 1, grav: 4 });   // the burning fuse
    if (!s.rest) {
      s.vy -= s.g * dt;
      const sp = Math.hypot(s.vx, s.vy, s.vz), len = sp * dt;
      if (sp > 1e-4) {
        _o.x = s.x; _o.y = s.y; _o.z = s.z; _d.x = s.vx / sp; _d.y = s.vy / sp; _d.z = s.vz / sp;
        const wh = W.raycast(_o, _d, len + 0.06);
        if (wh) {
          const t = Math.max(0, wh.t - 0.06); s.x += _d.x * t; s.y += _d.y * t; s.z += _d.z * t;
          const dn = s.vx * wh.nx + s.vy * wh.ny + s.vz * wh.nz;
          s.vx = (s.vx - 2 * dn * wh.nx) * 0.4; s.vy = (s.vy - 2 * dn * wh.ny) * 0.3; s.vz = (s.vz - 2 * dn * wh.nz) * 0.4;
          if (Math.abs(dn) > 3) G.sound.tick();
          if (wh.ny > 0.6 && Math.hypot(s.vx, s.vy, s.vz) < 1.4) s.rest = true;
        } else { s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; }
      }
      const gy = W.groundAt(s.x, s.z, s.y);
      if (s.y < gy + 0.05) { s.y = gy + 0.05; if (s.vy < 0) s.vy = -s.vy * 0.3; s.vx *= 0.6; s.vz *= 0.6; if (Math.hypot(s.vx, s.vy, s.vz) < 1.4) s.rest = true; }
      s.mesh.rotation.x += dt * 9; s.mesh.rotation.z += dt * 4;
    }
    s.mesh.position.set(s.x, s.y, s.z);
    return false;
  }
}
/** The bombs, and how long their fuse burns (seconds). */
const BOMB_KINDS = { dynamite: 2.4, grenade: 2.2, hbomb: 2.0 };

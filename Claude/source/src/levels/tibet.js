// Chapter VIII - the road south of Lhasa, March 1959.
import * as THREE from 'three';
import { Heightfield, prismGeo, rockGeo } from '../build.js';
import { makeAmbient, windify } from '../gfx.js';
import { signTexture } from '../tex.js';
import { instanced, room, steps, crate, tuftGeo, horseGeo, gBox, gCyl, gCone, gSph, gCap, xf, merge, stand, den, beast, ladder, boulder, shelf, barrel, rubble, table, bench, bed, chest, pots, sacks, rug, hearth, woodpile, haystack, deck, person, idle, animal } from '../props.js';
import { fbm, ridged, smooth } from '../util.js';

export const tibet = {
  id: 'tibet', theme: 'theme-tibet', chapter: 'Chapter VIII', title: 'Che La', place: 'The road south of Lhasa · Tibet · March 1959',
  story: 'On the night of 17 March the Dalai Lama left Lhasa in a soldier’s cloak. He rides south for the passes, and the army is closing the road ahead of him. Go before the caravan: clear the valley, the village and the monastery on the ridge, so that he can cross to India.',
  weapon: 'carbine', weaponName: 'Rifle & knife', alt: 'right mouse — aim   ·   F — knife', knife: true,
  heroes: [
    { look: 'gompo', name: 'Gompo Tashi Andrugtsang', who: 'Khampa leader of the Chushi Gangdruk', trait: 'Marksman', effect: 'rifle: one shot fells a soldier', mods: {}, sleeve: 0x5a3422, cuff: 0xc8a878 },
    { look: 'pachen', name: 'Ani Pachen', who: 'The warrior nun who led her clan on horseback', trait: 'Rider', effect: 'pistol; moves 20% faster', weapon: 'revolver', weaponName: 'Pistol & knife', mods: { speed: 1.2 }, sleeve: 0x7a1c22, cuff: 0xd9a020 },
    { look: 'songtsen', name: 'Songtsen Gampo', who: 'The king who founded the Tibetan empire', trait: 'King of old', effect: 'bow and sword; takes 20% less damage', weapon: 'bow', weaponName: 'Bow & sword', alt: 'right mouse — sword', mods: { armor: 0.8 }, sleeve: 0xa01c1c, cuff: 0xd9b23a },
  ],
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> fire &nbsp; <kbd>Right mouse</kbd> aim &nbsp; <kbd>R</kbd> reload &nbsp; <kbd>F</kbd> knife',
  foes: 'soldiers remain', foesNone: 'The pass is open', bossName: 'Commander Zhao', bossDown: 'The column has lost its commander', pickupText: 'Butter tea  +35',
  deadTitle: 'Snow closes the road', deadSub: 'The caravan waits for a scout who does not return.', clearTitle: 'The pass is open',
  build,
};

const WHITE = 0xf2eee2, MAROON = 0x7a2420, GOLD = 0xd9b23a, FLAGS = [0x2a5ac8, 0xf4f4f0, 0xc82a22, 0x2a9a4a, 0xe8c020];

function dPoly(pts, x, z) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], vx = pts[i + 1][0] - ax, vz = pts[i + 1][1] - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}

function build({ game, gfx, world, B, M, root, rand, shared }) {
  const R = rand, PI = Math.PI;
  const PATH = [[0, 106], [2, 70], [9, 42], [7, 10], [0, -20], [0, -32]];
  const HILL = { x: 0, z: -78, top: 13.5 };
  const GULLY = [[-48, -14], [-45, -28], [-50, -42], [-43, -56], [-40, -64]], TRACK = [[60, -23], [84, -22], [126, -27]];
  const inGully = (x, z) => (1 - smooth(2, 8.5, dPoly(GULLY, x, z))) * smooth(-12, -20, z) * smooth(-68, -58, z);
  // ---- terrain: a high valley under a ring of snow peaks -----------------------------------
  const hf = new Heightfield(1300, 400, (x, z) => {
    const calm = 1 - (1 - smooth(3, 10, dPoly(PATH, x, z))) * 0.85;
    let h = 3 + (30 - z) * 0.035 + (fbm(x * 0.022 + 5, z * 0.022, 4, 31) - 0.5) * 4.2 * calm;
    const vil = 1 - smooth(22, 34, Math.hypot(x - 14, z - 26)); h = h * (1 - vil * 0.85) + 3.3 * vil * 0.85;       // the village terrace
    h -= (1 - smooth(9, 22, Math.hypot(x + 58, z - 4))) * 3.2;                                                      // the lake
    h -= inGully(x, z) * 2.4;                                                                                       // the dry stream bed that runs from the lake to the foot of the hill
    let hill = 1 - smooth(25, 43, Math.hypot(x - HILL.x, z - HILL.z));
    if (Math.abs(x) < 5.2 && z > -54 && z < -29) hill = smooth(-30, -53, z);                                        // the stairway
    h = h * (1 - hill) + HILL.top * hill;
    const r = Math.hypot(x, z), m = smooth(140, 430, r);
    return h + m * (36 + ridged(x * 0.004 + 2, z * 0.004 + 9, 5, 13) * 250) + smooth(116, 190, r) * 14 * fbm(x * 0.02 + 1, z * 0.02, 3, 8);
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -124, x1: 124, z0: -122, z1: 112 };
  world.maxSlope = 0.95; world.waterY = -50;
  const cA = new THREE.Color(0xb09a5e), cB = new THREE.Color(0x8a7646), cP = new THREE.Color(0xc4b08a), cR = new THREE.Color(0x7c6a58), cS = new THREE.Color(0xf4f6fa), cF = new THREE.Color(0xd8dcd8), cT = new THREE.Color(0xdcc67c), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h, ny) => {
    tmp.copy(cA).lerp(cB, fbm(x * 0.03 + 3, z * 0.03, 3, 9));
    tmp.lerp(cP, (1 - smooth(1.2, 3.4, dPoly(PATH, x, z))) * 0.85);
    tmp.lerp(cF, (1 - smooth(13, 20, Math.hypot(x + 58, z - 4))) * 0.7);
    tmp.lerp(cF, inGully(x, z) * 0.35); tmp.lerp(cP, (1 - smooth(1.4, 3.6, dPoly(TRACK, x, z))) * 0.8);
    tmp.lerp(cT, smooth(43, 46, x) * smooth(80, 77, x) * smooth(58, 61, z) * smooth(83, 80, z) * 0.8);                 // the barley stubble of the terraces
    tmp.lerp(cR, 1 - smooth(0.62, 0.84, ny));
    tmp.lerp(cS, smooth(34, 62, h + fbm(x * 0.02, z * 0.02, 3, 2) * 16) * smooth(0.45, 0.7, ny));
    return tmp;
  }));

  // ---- pieces ---------------------------------------------------------------------------------
  const frame = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
  const top = (P, w, d, x, z) => Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05;
  const at = (P, lx, lz, y) => { const [a, b] = P(lx, lz); return [a, y, b]; };          // a place in a local frame as x, y, z
  const lights = [], fires = [], people = [], sites = [];                               // sites: [x, z, r] of new places that rocks, shrubs and grass keep out of
  const who = (look, x, y, z, yaw, o) => { const f = person(B, M, root, look, x, y, z, yaw, o); people.push(f); return f; };
  const lamp =(x, y, z, i = 26, d = 15, c = 0xffb060) => { if (lights.length >= 6) return; const l = new THREE.PointLight(c, i, d, 1.7); l.position.set(x, y, z); root.add(l); lights.push(l); };
  /** String of prayer flags between two points. */
  const flags = (x0, y0, z0, x1, y1, z1, n = 12) => {
    const ry = Math.atan2(-(z1 - z0), x1 - x0), L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, sag = Math.sin(t * PI) * L * 0.07; B.box(M.cloth, 0.42, 0.3, 0.015, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - sag - 0.3, z0 + (z1 - z0) * t, { ry, rz: (i % 3 - 1) * 0.12, c: FLAGS[i % 5] }); }
    for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + 1) / 6, m = (t0 + t1) / 2, sag = Math.sin(m * PI) * L * 0.07; B.box(M.flat, L / 6 + 0.05, 0.015, 0.015, x0 + (x1 - x0) * m, y0 + (y1 - y0) * m - sag - 0.02, z0 + (z1 - z0) * m, { ry, rz: Math.atan2((y1 - y0) / 6 - (Math.sin(t1 * PI) - Math.sin(t0 * PI)) * L * 0.07, Math.hypot(x1 - x0, z1 - z0) / 6), c: 0x3a3028 }); }
  };
  /** Whitewashed stupa. */
  const chorten = (x, z, s = 1) => {
    const y = world.height(x, z) - 0.3;
    B.box(M.plaster, 3.0 * s, 0.8 * s, 3.0 * s, x, y, z, { c: WHITE, solid: true }); B.box(M.plaster, 2.4 * s, 0.5 * s, 2.4 * s, x, y + 0.8 * s, z, { c: WHITE }); B.box(M.plaster, 1.9 * s, 0.5 * s, 1.9 * s, x, y + 1.3 * s, z, { c: WHITE });
    B.box(M.plaster, 3.1 * s, 0.14 * s, 3.1 * s, x, y + 0.66 * s, z, { c: MAROON });
    B.geo(M.plaster, new THREE.SphereGeometry(0.95 * s, 14, 10), [x, y + 2.55 * s, z], [0, 0, 0], [1, 1.05, 1], WHITE);
    B.box(M.plaster, 0.6 * s, 0.4 * s, 0.6 * s, x, y + 3.45 * s, z, { c: WHITE }); B.geo(M.metal, new THREE.ConeGeometry(0.3 * s, 1.4 * s, 10), [x, y + 4.55 * s, z], [0, 0, 0], 1, GOLD);
    B.geo(M.metal, new THREE.SphereGeometry(0.16 * s, 8, 6), [x, y + 5.35 * s, z], [0, 0, 0], 1, GOLD);
  };
  /** Tea churn: a tall wooden tube with brass bands and its plunger. */
  const churn = (x, y, z) => { B.cyl(M.wood, 0.1, 0.11, 1.1, x, y, z, { c: 0x6a4a2e, seg: 9 }); for (const k of [0.12, 0.55, 0.98]) B.cyl(M.metal, 0.115, 0.115, 0.05, x, y + k, z, { c: GOLD, seg: 9 }); B.cyl(M.wood, 0.02, 0.02, 0.5, x, y + 1.1, z, { c: 0x4a3626, seg: 5 }); world.addCyl(x, z, 0.14, y - 0.5, y + 1.1); };
  /** Upright loom with a half-woven striped cloth on it; its front is local +Z. */
  const loom = (x, y, z, ry) => {
    const P = frame(x, z, ry);
    for (const s of [-1, 1]) B.box(M.wood, 0.09, 1.7, 0.09, ...at(P, s * 0.7, 0, y), { ry, c: 0x6a4a2e });
    for (const yy of [0.25, 1.6]) B.box(M.wood, 1.6, 0.09, 0.09, x, y + yy, z, { ry, c: 0x6a4a2e });
    B.box(M.cloth, 1.2, 1.26, 0.02, x, y + 0.34, z, { ry, c: 0xe8e0d0 });
    FLAGS.forEach((c, i) => B.box(M.cloth, 1.2, 0.09, 0.02, ...at(P, 0, 0.015, y + 0.36 + i * 0.1), { ry, c }));
    world.addBox(x, z, 1.6, 0.3, ry, y, y + 1.7);
  };
  /** Put something into the arms of a figure made by `who` (parts: coloured geometries, in the frame of its hips). */
  const carry = (f, parts) => { const m = new THREE.Mesh(merge(parts), M.flat); m.castShadow = true; f.hips.add(m); return f; };
  const basket = (c = 0xd8c070) => [gCyl(0.22, 0.15, 0.28, 0xb89a60, [0, 0.2, 0.42], [0, 0, 0], 1, 10), gSph(0.2, c, [0, 0.33, 0.42], [1, 0.5, 1])];
  /** A roofed rack of prayer wheels from (ax, az) to (bx, bz). */
  const wheelWall = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.max(world.height(ax, az), world.height(bx, bz), world.height(mx, mz)), n = Math.round(L / 0.9);
    for (const yy of [0.5, 1.5]) B.box(M.woodH, L, 0.12, 0.5, mx, y + yy, mz, { ry, c: MAROON }); B.box(M.woodH, L + 0.5, 0.1, 1.0, mx, y + 2.05, mz, { ry, c: 0x2a2018 });
    for (let i = 0; i <= n; i++) { const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n; if (i % 5 === 0) B.box(M.wood, 0.14, 2.6, 0.14, px, y - 0.5, pz, { ry, c: MAROON }); else B.cyl(M.metal, 0.26, 0.26, 0.74, px, y + 0.68, pz, { c: i % 2 ? GOLD : 0xb8862a, seg: 10 }); }
    world.addBox(mx, mz, L, 0.6, ry, y - 1, y + 1.62);
  };
  /** A heap of mani stones: a low dry wall with carved and painted slabs leaning against it. Cover to crouch behind. */
  const maniPile = (x, z, ry, L = 3.4) => {
    const P = frame(x, z, ry), y = world.height(x, z) - 0.6;
    B.box(M.stone, L, 1.7, 0.9, x, y, z, { ry, c: 0xb8ae9c, solid: true });
    for (let i = 0; i < Math.floor(L / 0.7); i++) for (const s of [-1, 1]) B.box(M.flat, 0.55, 0.36, 0.06, ...at(P, -L / 2 + 0.4 + i * 0.7, s * 0.47, y + 1.05 + (i % 2) * 0.2), { ry, rx: s * -0.2, c: FLAGS[(i + (s > 0 ? 2 : 0)) % 5] });
  };
  /** Flat-roofed Tibetan house; front (+Z local) has the door. o: { back (a rear door), roof (a ladder to the roof), kind: 'store' | 'loom' | 'trader' | 'cell' (what is kept in it) } */
  const house = (x, z, ry, w = 8, d = 7, o = {}) => {
    const h = 3.3, P = frame(x, z, ry), yf = top(P, w, d, x, z), f = yf + 0.06, INK = 0x15120f, E = ry - PI / 2;      // E: the turn of things that stand against the east wall
    room(B, M, x, yf, z, { w, d, h, t: 0.45, ry, mat: M.plaster, c: WHITE, base: 2.6, doors: [{ side: 's', at: -w * 0.18, w: 1.7, h: 2.15 }].concat(o.back ? [{ side: 'n', at: w * 0.32, w: 1.6, h: 2.15 }] : []),
      wins: [{ side: 's', at: w * 0.24, w: 1.0, y: 1.2, h: 0.9 }, { side: 'e', at: 0, w: 1.0, y: 1.2, h: 0.9 }], floor: { mat: M.ground, c: 0x8a7a62 }, ceil: { mat: M.woodH, c: 0x5a4030 } });
    steps(B, M, ...P(-w * 0.18, d / 2), ry, f, 6, { w: 2, c: 0xd8d0c0 });
    if (o.back) steps(B, M, ...P(w * 0.32, -d / 2), ry + PI, f, 6, { w: 1.9, c: 0xd8d0c0 });
    if (!o.roof) { const [a, b] = P(-w / 2 - 0.4, d * 0.1); B.box(M.thatch, 0.7, 1.35, d * 0.4, a, world.height(a, b) - 0.3, b, { ry, c: 0x4a3a2a, solid: true }); }      // dried dung stacked against the wall: cover to crouch behind
    sites.push([x, z, Math.hypot(w, d) / 2]);
    if (o.roof) {                                                                              // a ladder up the east wall; on the roof stacks of dried dung, the fuel of the high plateau, as a parapet
      const T = yf + h + 0.98; world.addBox(x, z, w + 0.5, d + 0.5, ry, yf + h + 0.2, T);
      { const [a, b] = P(w / 2 + 0.25, d * 0.3); ladder(B, M, a, b, Math.cos(ry), -Math.sin(ry), world.height(...P(w / 2 + 0.9, d * 0.3)) - 0.1, T); }
      for (const [lx, lz, sw, sd] of [[0, d / 2 - 0.35, w * 0.6, 0.7], [-w / 2 + 0.35, 0, 0.7, d * 0.55]]) B.box(M.thatch, sw, 0.9, sd, ...at(P, lx, lz, T), { ry, c: 0x4a3a2a, solid: true });
      B.cyl(M.plaster, 0.16, 0.34, 0.7, ...at(P, w / 2 - 0.9, -d / 2 + 0.9, T), { c: WHITE, seg: 8 });                      // the little oven in which juniper is burnt
    }
    if (o.kind === 'store') { sacks(B, M, ...at(P, w / 2 - 1.25, 1.7, f), E, { w: 1.8 }); churn(...at(P, 1.0, d / 2 - 0.9, f)); pots(B, M, ...at(P, 0.2, d / 2 - 0.95, f), { n: 3, s: 1.2, solid: false }); }
    if (o.kind === 'loom') {                                                                   // the weaver at her loom, wool in a basket beside her
      loom(...at(P, w / 2 - 1.3, 0.8, f), ry); bench(B, M, ...at(P, w / 2 - 1.3, 1.5, f), ry, { w: 0.4, h: 0.42 });
      who('tibetWoman', ...at(P, w / 2 - 1.3, 1.5, f), ry + PI, { pose: 'sit', seat: 0.42, arms: [-1.05, -0.9] });
      { const [a, b] = P(w / 2 - 2.5, 1.9); B.cyl(M.thatch, 0.3, 0.24, 0.3, a, f, b, { c: 0xb89a60, seg: 10 }); for (let k = 0; k < 4; k++) B.geo(M.cloth, new THREE.SphereGeometry(0.12, 7, 5), [a + Math.cos(k * 1.7) * 0.12, f + 0.32, b + Math.sin(k * 1.7) * 0.12], [0, 0, 0], 1, [0xe8e0d0, 0xb83a2a, 0xe8e0d0, 0x2a5a8a][k]); }
      rug(B, M, ...at(P, 0.2, 1.3, f), ry, { w: 2.2, d: 1.4, c: 0x2a4a8a, border: 0x9a2a2a });
    }
    if (o.kind === 'trader') {                                                                 // bricks of tea from the caravan road, saddles on a beam, a chest
      { const [a, b] = P(w / 2 - 0.95, 1.8); B.box(M.flat, 0.9, 0.66, 1.3, a, f, b, { ry, c: 0x6a4a2c, solid: true }); B.box(M.flat, 0.7, 0.33, 0.9, a, f + 0.66, b, { ry, c: 0x7a5632 }); for (const k of [0.22, 0.44]) B.box(M.flat, 0.92, 0.02, 1.32, a, f + k, b, { ry, c: 0x1c140c }); }
      { const [a, b] = P(w / 2 - 0.8, -d / 2 + 1.5); B.box(M.wood, 0.12, 0.12, 1.9, a, f + 0.85, b, { ry, c: 0x5a4028 }); for (const k of [-0.8, 0.8]) B.box(M.wood, 0.1, 0.85, 0.1, ...at(P, w / 2 - 0.8, -d / 2 + 1.5 + k, f), { ry, c: 0x5a4028 });
        for (const k of [-0.4, 0.4]) { B.box(M.flat, 0.5, 0.22, 0.52, ...at(P, w / 2 - 0.8, -d / 2 + 1.5 + k, f + 0.93), { ry, c: 0x6a3a22 }); B.box(M.cloth, 0.62, 0.05, 0.6, ...at(P, w / 2 - 0.8, -d / 2 + 1.5 + k, f + 0.89), { ry, c: k < 0 ? 0x9a2a2a : 0x2a4a8a }); }
        world.addBox(a, b, 0.6, 1.9, ry, f, f + 1.15); }
      chest(B, M, ...at(P, 0.9, d / 2 - 0.85, f), ry + PI, { c: 0x8a2a2a, band: 0xb8862a });
    }
    if (o.kind === 'cell') {                                                                   // a monk's cell: scriptures on a shelf, a low reading table
      shelf(B, M, ...at(P, w / 2 - 0.68, 1.7, f), E, 2.0, 1.8, { c: 0xa01c1c, goods: [0xe0a82a, 0xd86a2a, 0xb83a2a, 0xe8c020] });
      table(B, M, ...at(P, 1.3, 1.6, f), ry, { w: 1.0, d: 0.6, h: 0.4, c: 0xa01c1c }); B.box(M.cloth, 0.5, 0.07, 0.16, ...at(P, 1.3, 1.6, f + 0.4), { ry, c: 0xe0a82a }); rug(B, M, ...at(P, 1.3, 2.3, f), ry, { w: 1.2, d: 0.8, c: MAROON });
    }
    B.box(M.plaster, w + 0.3, 0.6, d + 0.3, x, yf + h + 0.2, z, { ry, c: MAROON }); B.box(M.flat, w + 0.5, 0.18, d + 0.5, x, yf + h + 0.8, z, { ry, c: 0x2a2018 });
    for (const [lx, ww] of [[w * 0.24, 1.0], [-w * 0.18, 1.7]]) {                              // black frames widening downward, a yellow valance
      const [fx, fz] = P(lx, d / 2 + 0.04), yt = ww > 1.2 ? 2.15 : 2.1;
      B.box(M.flat, ww + 0.5, 0.16, 0.1, fx, yf + yt, fz, { ry, c: INK }); B.box(M.cloth, ww + 0.4, 0.2, 0.06, fx, yf + yt + 0.16, fz, { ry, c: 0xe0a82a });
      for (const s of [-1, 1]) { const [sx, sz] = P(lx + s * (ww / 2 + 0.14), d / 2 + 0.04); B.box(M.flat, 0.2, ww > 1.2 ? 2.15 : 1.0, 0.1, sx, yf + (ww > 1.2 ? 0 : 1.15), sz, { ry, rz: s * 0.05, c: INK }); }
    }
    for (const [a, b] of [[-1, -1], [1, 1]]) { const [px, pz] = P(a * (w / 2 - 0.25), b * (d / 2 - 0.25)); B.cyl(M.wood, 0.03, 0.03, 2.4, px, yf + h + 0.9, pz, { c: 0x6a4a30, seg: 5 }); for (let k = 0; k < 5; k++) B.box(M.cloth, 0.5, 0.3, 0.02, px + 0.28, yf + h + 1.4 + k * 0.36, pz, { ry, c: FLAGS[k] }); }
    const [hx, hz] = P(w * 0.2, -d * 0.12); B.box(M.stone, 1.0, 0.55, 1.0, hx, f, hz, { ry, c: 0x4a4038, solid: true }); B.geo(M.glow, new THREE.ConeGeometry(0.16, 0.4, 6), [hx, f + 0.75, hz], [0, 0, 0], 1, 0xff7a20); B.cyl(M.metal, 0.22, 0.26, 0.3, hx, f + 0.55, hz, { c: 0x2a2a2e, seg: 9 });
    const [bx, bz] = P(-w / 2 + 0.85, -d * 0.08); B.box(M.woodH, 0.8, 0.42, d * 0.5, bx, f, bz, { ry, c: 0x6a3a22, solid: true }); B.box(M.cloth, 0.76, 0.05, d * 0.48, bx, f + 0.42, bz, { ry, c: 0x9a2a2a });
    const [ax, az] = P(0.4, -d / 2 + 0.75); B.box(M.woodH, 1.6, 1.0, 0.45, ax, f, az, { ry, c: 0xb8862a, solid: true });
    for (const k of [-0.5, 0, 0.5]) { const [lx, lz] = P(0.4 + k, -d / 2 + 0.75); B.cyl(M.metal, 0.05, 0.03, 0.1, lx, f + 1.0, lz, { c: GOLD, seg: 7 }); B.geo(M.glow, new THREE.SphereGeometry(0.035, 5, 4), [lx, f + 1.16, lz], [0, 0, 0], [1, 1.7, 1], 0xffb040); }
    return yf + h + 0.98;
  };
  const extraFoes = [], extraPicks = [];
  /** Seated Buddha, gilded: lotus throne, crossed legs, the right hand touching the earth, a bowl in the left, a halo. About 2.5 m high at s = 1; faces local +Z. */
  const buddha = (x, y, z, ry = 0, s = 1) => {
    const HAIR = 0x1a2a6a, G2 = 0xb8862a, X = PI / 2, g = [], f = [];
    g.push(gCyl(1.2, 1.25, 0.12, G2, [0, 0.06, 0], [0, 0, 0], 1, 16), gCyl(1.05, 0.9, 0.26, GOLD, [0, 0.25, 0], [0, 0, 0], 1, 16));
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; f.push(gCone(0.2, 0.34, i % 2 ? 0xd86a4a : 0xe89a6a, [Math.cos(a) * 1.02, 0.2, Math.sin(a) * 1.02], [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], 1, 6)); }   // lotus petals
    g.push(gSph(0.5, GOLD, [0, 0.62, 0.1], [1.8, 0.5, 1.2]), gSph(0.27, GOLD, [0.62, 0.62, 0.22], [1.2, 0.8, 1.3]), gSph(0.27, GOLD, [-0.62, 0.62, 0.22], [1.2, 0.8, 1.3]));                                             // crossed legs
    g.push(gCyl(0.36, 0.45, 0.78, GOLD, [0, 1.17, 0], [0, 0, 0], [1, 1, 0.72], 12), gSph(0.4, GOLD, [0, 1.38, 0.02], [1.06, 0.8, 0.76]), gSph(0.2, GOLD, [0.43, 1.5, 0]), gSph(0.2, GOLD, [-0.43, 1.5, 0]));
    f.push(gBox(0.84, 0.1, 0.52, 0xb8501c, [0.02, 1.3, 0], [0, 0, 0.72]));                                                                                                                                              // the robe over one shoulder
    g.push(gCap(0.105, 0.42, GOLD, [0.5, 1.22, 0.05], [0.2, 0, 0.14]), gCap(0.105, 0.42, GOLD, [-0.5, 1.22, 0.05], [0.2, 0, -0.14]));
    g.push(gCap(0.09, 0.4, GOLD, [0.3, 0.9, 0.36], [X, -0.95, 0]), gSph(0.11, GOLD, [0.04, 0.86, 0.5], [1.4, 0.6, 1]));                                                                                                  // left hand in the lap
    g.push(gCap(0.09, 0.38, GOLD, [-0.55, 0.92, 0.3], [0.95, 0, 0]), gSph(0.1, GOLD, [-0.56, 0.68, 0.52], [1, 1.4, 0.8]));                                                                                               // right hand touches the earth
    f.push(gSph(0.14, HAIR, [0.04, 0.97, 0.5], [1, 0.7, 1]));                                                                                                                                                           // alms bowl
    g.push(gCyl(0.13, 0.15, 0.16, GOLD, [0, 1.62, 0]), gSph(0.3, GOLD, [0, 1.94, 0.02], [0.95, 1.1, 0.98]), gBox(0.05, 0.32, 0.08, GOLD, [0.285, 1.88, 0]), gBox(0.05, 0.32, 0.08, GOLD, [-0.285, 1.88, 0]), gBox(0.045, 0.1, 0.05, GOLD, [0, 1.91, 0.3]));
    f.push(gSph(0.305, HAIR, [0, 2.06, -0.03], [0.99, 0.9, 1]), gSph(0.13, HAIR, [0, 2.33, -0.04]), gBox(0.1, 0.02, 0.02, 0x15120f, [0.11, 1.97, 0.287]), gBox(0.1, 0.02, 0.02, 0x15120f, [-0.11, 1.97, 0.287]),
      gBox(0.11, 0.025, 0.02, 0xb83a2a, [0, 1.82, 0.29]), gSph(0.025, 0xf4f4f0, [0, 2.05, 0.29]));
    g.push(gCone(0.05, 0.14, GOLD, [0, 2.5, -0.04]), xf(new THREE.TorusGeometry(0.6, 0.04, 6, 24), [0, 1.98, -0.34], [0, 0, 0], 1, GOLD), xf(new THREE.TorusGeometry(1.0, 0.045, 6, 26), [0, 1.2, -0.42], [0, 0, 0], 1, GOLD));
    f.push(gCyl(0.6, 0.6, 0.04, 0xa01c1c, [0, 1.98, -0.34], [X, 0, 0], 1, 20), gCyl(1.0, 1.0, 0.04, 0x1a5a3a, [0, 1.2, -0.42], [X, 0, 0], 1, 22));                                                                    // halo and aureole
    B.geo(M.metal, merge(g), [x, y, z], [0, ry, 0], s); B.geo(M.flat, merge(f), [x, y, z], [0, ry, 0], s);
    world.addBox(x, z, 2.3 * s, 2.0 * s, ry, y - 0.2, y + 2.5 * s);
  };
  /** Small temple; the door is on the local +Z side. Returns { P, yf, f }. */
  const temple = (x, z, ry, w, d, h, c = 0xa83a2a) => {
    const P = frame(x, z, ry), yf = top(P, w, d, x, z), f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h, t: 0.55, ry, mat: M.plaster, c, base: 2.6, doors: [{ side: 's', at: 0, w: 2.4, h: 2.8 }], floor: { mat: M.woodH, c: 0x6a3a22 }, ceil: { mat: M.woodH, c: MAROON } });
    steps(B, M, ...P(0, d / 2), ry, f, 6, { w: 3, c: 0xd8d0c0 });
    B.box(M.plaster, w + 0.3, 0.9, d + 0.3, x, yf + h + 0.2, z, { ry, c: MAROON }); B.box(M.flat, w + 0.6, 0.2, d + 0.6, x, yf + h + 1.1, z, { ry, c: 0x2a2018 });
    for (let i = 0; i < Math.floor(w / 1.1); i++) { const [a, b] = P(-w / 2 + 0.6 + i * 1.1, d / 2 + 0.17); B.cyl(M.flat, 0.2, 0.2, 0.06, a, yf + h + 0.45, b, { rx: PI / 2, ry, c: WHITE, seg: 10 }); }
    B.box(M.plaster, w * 0.45, 0.5, d * 0.45, x, yf + h + 1.25, z, { ry, c: MAROON }); B.geo(M.metal, new THREE.ConeGeometry(Math.min(w, d) * 0.3, 1.5, 4), [x, yf + h + 2.5, z], [0, ry + PI / 4, 0], 1, GOLD);
    for (const sg of [-1, 1]) {                                               // a row of prayer wheels on each side of the door
      for (let k = 0; k < 3; k++) { const [a, b] = P(sg * (w / 4 + 0.2 + k * 0.75), d / 2 + 0.45); B.cyl(M.metal, 0.24, 0.24, 0.7, a, yf + 0.75, b, { c: k % 2 ? GOLD : 0xb8862a, seg: 10 }); }
      const [a, b] = P(sg * (w / 4 + 0.95), d / 2 + 0.45); B.box(M.woodH, 2.4, 0.12, 0.5, a, yf + 1.5, b, { ry, c: MAROON }); B.box(M.woodH, 2.4, 0.12, 0.5, a, yf + 0.6, b, { ry, c: MAROON }); world.addBox(a, b, 2.4, 0.6, ry, yf - 3, yf + 1.6);
    }
    return { P, yf, f };
  };
  const yakGeo = (c) => merge([gCap(0.5, 1.2, c, [0, 1.05, 0], [PI / 2, 0, 0], [1, 1, 1.1]), gBox(0.96, 0.55, 1.6, c, [0, 0.62, 0]), gSph(0.4, c, [0, 1.52, 0.45], [1, 1, 1.3]), gCap(0.23, 0.3, c, [0, 1.0, 1.15], [1.2, 0, 0]),
    gBox(0.3, 0.22, 0.24, 0x4a3c30, [0, 0.8, 1.42]), gCone(0.05, 0.4, 0xd8d0c0, [0.3, 1.32, 1.12], [0, 0, -0.9]), gCone(0.05, 0.4, 0xd8d0c0, [-0.3, 1.32, 1.12], [0, 0, 0.9]),
    ...[[0.28, 0.55], [-0.28, 0.55], [0.28, -0.55], [-0.28, -0.55]].map(([lx, lz]) => gCap(0.1, 0.5, c, [lx, 0.3, lz])), gBox(0.16, 0.75, 0.16, c, [0, 0.78, -0.98])]);
  const yak = (x, z, ry, c = 0x1a1410) => animal(B, M, root, 'yak', yakGeo(c), x, world.height(x, z), z, ry, { coat: c, box: [1.1, 2.6, 1.7, 0.1] });
  const figure = (look, x, z, yaw, pose) => who(look, x, world.height(x, z), z, yaw, { pose: pose || 'stand', rand: R });   // bystanders like the others
  const tent = (x, z, ry) => { const y = world.height(x, z) - 0.2; B.geo(M.cloth, prismGeo(4.2, 2.3, 5.4, 2), [x, y, z], [0, ry, 0], 1, 0x5a6038); world.addBox(x, z, 3.6, 5.2, ry, y - 1, y + 2); };
  /** Army tent you can walk through: canvas walls, a door at each end. Returns { P, f } (its local frame and its floor). */
  const armyTent = (x, z, ry) => {
    const w = 4.8, d = 6.4, P = frame(x, z, ry), yf = top(P, w, d, x, z), f = yf + 0.06, C = 0x5a6038;
    room(B, M, x, yf, z, { w, d, h: 2.3, t: 0.14, ry, mat: M.cloth, c: C, base: 1.2, doors: [{ side: 's', at: 0, w: 1.7, h: 2.15 }, { side: 'n', at: 0, w: 1.7, h: 2.15 }], floor: { mat: M.ground, c: 0xc8b890 }, ceil: false });
    B.box(M.cloth, w, 0.04, d, x, yf + 2.3, z, { ry, c: 0x8a9466 }); B.geo(M.cloth, prismGeo(w + 0.5, 1.4, d + 0.3, 2), [x, yf + 2.3, z], [0, ry, 0], 1, C);
    for (const s of [-1, 1]) steps(B, M, ...P(0, s * d / 2), ry + (s < 0 ? PI : 0), f, 2, { w: 1.9, rise: 0.3, mat: M.ground, c: 0x6a5a48 });
    sites.push([x, z, 4.6]);
    return { P, f };
  };
  /** Army lorry. Its bed lies 1.25 m above the ground: between the rear axle and the cab you can crawl under it. open = the tail is open: over the two crates behind it you get into the bed, crouching under the tilt. */
  const truck = (x, z, ry, open) => {
    const P = frame(x, z, ry), y = world.height(x, z), C = 0x4e5a34, TILT = 0x66704a, bed = y + 1.25;
    B.box(M.flat, 2.1, 1.75, 1.7, ...at(P, 0, 2.0, y + 0.85), { ry, c: C }); B.box(M.flat, 2.12, 0.5, 1.2, ...at(P, 0, 2.0, y + 1.95), { ry, c: 0x1c2630 }); B.box(M.flat, 1.7, 1.0, 1.0, ...at(P, 0, 3.25, y + 0.7), { ry, c: C });
    world.addBox(...P(0, 2.45), 2.1, 2.6, ry, y - 1, y + 2.6);
    B.box(M.woodH, 2.2, 0.1, 4.0, ...at(P, 0, -0.85, bed), { ry, c: C }); for (const s of [-1, 1]) B.box(M.flat, 0.12, 0.2, 5.4, ...at(P, s * 0.45, -0.2, bed - 0.2), { ry, c: 0x1c1c1e });
    for (const s of [-1, 1]) { B.box(M.cloth, 0.04, 0.95, 3.96, ...at(P, s * 1.08, -0.85, bed + 0.1), { ry, c: TILT }); B.box(M.cloth, 0.72, 0.04, 3.96, ...at(P, s * 0.81, -0.85, bed + 1.26), { ry, rz: -s * 0.7, c: TILT }); }
    B.box(M.cloth, 1.14, 0.04, 3.96, ...at(P, 0, -0.85, bed + 1.5), { ry, c: TILT });
    const flap = (lz) => { B.box(M.cloth, 2.12, 0.95, 0.04, ...at(P, 0, lz, bed + 0.1), { ry, c: TILT }); B.box(M.cloth, 1.62, 0.45, 0.04, ...at(P, 0, lz, bed + 1.05), { ry, c: TILT }); };
    flap(1.12);
    for (const [lx, lz] of [[1.0, 2.6], [-1.0, 2.6], [1.0, -1.6], [-1.0, -1.6]]) B.geo(M.flat, new THREE.CylinderGeometry(0.5, 0.5, 0.3, 12), at(P, lx, lz, y + 0.5), [0, ry, PI / 2], 1, 0x15151a);
    B.geo(M.flat, new THREE.CylinderGeometry(0.09, 0.09, 2.0, 6), at(P, 0, -1.6, y + 0.5), [0, ry, PI / 2], 1, 0x1c1c1e); world.addBox(...P(0, -1.6), 2.3, 0.5, ry, y - 1, y + 0.95);
    B.box(M.flat, 0.03, 0.3, 0.3, ...at(P, 1.07, 2.0, y + 1.2), { ry, rx: PI / 4, c: 0xc81c1c });
    if (!open) { flap(-2.83); world.addBox(...P(0, -0.85), 2.2, 4.0, ry, bed, bed + 1.6); return; }
    world.addBox(...P(0, -0.85), 2.2, 4.0, ry, bed, bed + 0.1); world.addBox(...P(0, -0.85), 2.2, 4.0, ry, bed + 1.45, bed + 1.6); world.addBox(...P(0, 1.1), 2.2, 0.1, ry, bed, bed + 1.6);
    for (const s of [-1, 1]) world.addBox(...P(s * 1.08, -0.85), 0.1, 4.0, ry, bed, bed + 1.6);
    for (const [lx, lz, hh] of [[0.35, -4.2, 0.4], [-0.1, -3.3, 0.88]]) { B.box(M.wood, 0.9, hh + 0.4, 0.9, ...at(P, lx, lz, y - 0.4), { ry, c: 0x7a8452, solid: true }); B.box(M.woodH, 0.94, 0.08, 0.94, ...at(P, lx, lz, y + hh - 0.075), { ry, c: 0x5a6238 }); }
    for (const [lx, lz, s] of [[-0.55, 0.5, 0.7], [0.5, 0.3, 0.6]]) crate(B, M, ...at(P, lx, lz, bed + 0.1), s, ry + lx, 0x5a6038);
    extraPicks.push([...P(0.2, -1.2), 0, 1.4]);
  };

  // ---- the caravan at the start: the Dalai Lama, two monks, two Khampa riders ------------------
  figure('dalai', -4.6, 95.2, 0.65, (f) => { f.armR.rotation.x = -1.35; f.armR.rotation.z = 0.25; f.armL.rotation.x = -0.4; });
  figure('khampa', -7.4, 93.6, 0.5, (f) => { f.armR.rotation.x = -1.25; f.armR.rotation.z = 0.12; }); figure('khampa', -2.4, 92.4, 0.9, (f) => { f.armR.rotation.x = -1.25; f.armR.rotation.z = 0.12; });
  figure('monk', -6.4, 96.8, 0.8, (f) => { f.armR.rotation.x = -0.9; f.armL.rotation.x = -0.9; f.armR.rotation.z = 0.5; f.armL.rotation.z = -0.5; }); figure('monk', -3.4, 97.6, 0.4);
  for (const [x, z, ry, c, m] of [[-10, 98.5, 1.3, 0x6a4428, 0x14100c], [-8.2, 101.4, 0.9, 0xb8a080, 0xe8e0d0], [-5.2, 103.2, 0.6, 0x2a1c14, 0x14100c]]) {
    const saddle = gBox(0.75, 0.08, 0.9, [0x9a2a2a, 0x2a4a8a, 0xb8862a][Math.round(ry * 10) % 3], [0, 1.46, 0]);      // the saddle cloth goes where the horse goes
    animal(B, M, root, 'horse', merge([horseGeo(c, m), saddle]), x, world.height(x, z), z, ry, { coat: c, box: [0.9, 2.8, 2, 0.25] });
  }
  { const y = world.height(-12, 94); B.cyl(M.wood, 0.05, 0.07, 6, -12, y - 0.2, 94, { c: 0x6a4a30, seg: 6 }); world.addCyl(-12, 94, 0.1, y - 1, y + 6); flags(-12, y + 5.8, 94, -4, world.height(-4, 88) + 0.4, 88, 14); flags(-12, y + 5.8, 94, -16, world.height(-16, 100) + 0.4, 100, 10); }
  chorten(8, 92, 1.1);
  who('tibetMan', -7.3, world.height(-7.3, 100.2), 100.2, -2.4, { pose: (f) => { f.armR.rotation.x = -1.1; f.armR.rotation.z = 0.15; f.armL.rotation.x = -0.2; } });      // a third Khampa holds the horses

  // ---- chortens and the mani wall on the way ---------------------------------------------------
  for (let i = 0; i < 7; i++) chorten(-40 + i * 3.6, 60 - (i % 2) * 0.6, 0.8);
  { // two Nepalese traders rest with their bales at the west end of the row
    const x = -45.4, z = 60.6, y = world.height(x, z);
    sacks(B, M, x, y, z, PI / 2, { w: 2.4, c: 0x9a7a52 }); for (const [lz, c] of [[-0.75, 0xb83a2a], [0.1, 0x2a5a8a], [0.85, 0xd8a030]]) B.geo(M.cloth, new THREE.SphereGeometry(0.3, 8, 6), [x + 1.25, y + 0.2, z + lz], [0, lz, 0], [1, 0.62, 1.25], c);
    B.cyl(M.thatch, 0.3, 0.2, 0.6, x - 0.9, y, z + 1.7, { c: 0xb89a60, seg: 10 }); B.cyl(M.thatch, 0.3, 0.2, 0.6, x - 0.5, y, z - 1.9, { c: 0xa88a54, seg: 10 }); world.addCyl(x - 0.9, z + 1.7, 0.3, y - 1, y + 0.6);
    who('nepalWoman', x + 0.5, y, z - 0.3, PI / 2, { pose: 'sit', seat: 0.36 }); who('nepalWoman', x + 2.2, y, z + 1.0, -2.2, { pose: 'talk' });
    sites.push([x + 0.6, z, 3.6]);
  }
  { const x0 = 16, z0 = 52, x1 = 30, z1 = 55, L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), y = Math.min(world.height(x0, z0), world.height(x1, z1)) - 0.5;
    B.box(M.stone, L, 1.7, 1.0, (x0 + x1) / 2, y, (z0 + z1) / 2, { ry, c: 0xb8ae9c, solid: true });
    for (let i = 0; i < 16; i++) { const t = (i + 0.5) / 16; B.box(M.flat, 0.6, 0.4, 0.06, x0 + (x1 - x0) * t, y + 0.9 + (i % 2) * 0.25, z0 + (z1 - z0) * t + 0.52, { ry, rx: -0.2, c: [0xc82a22, 0x2a5ac8, 0xe8c020, 0xf4f4f0, 0x2a9a4a][i % 5] }); } }
  // ---- the village ----------------------------------------------------------------------------
  const r1 = house(-3, 35, 0.25, 8, 7, { kind: 'store', roof: true }), r2 = house(27, 37, -0.3, 9, 7, { kind: 'loom' }); house(31, 19, -1.5, 8, 6.5, { back: true }); house(-5, 16, 1.4, 8, 7, { back: true }); house(22, 6, 2.8, 8, 6.5, { kind: 'trader', roof: true });
  chorten(13, 27, 1.3);
  { const y = world.height(13, 27); flags(-3, r1, 35, 13, y + 6.2, 27, 14); flags(27, r2, 37, 13, y + 6.2, 27, 14); }
  for (const [x, z] of [[10, 34], [18, 31]]) { const y = world.height(x, z); B.geo(M.thatch, new THREE.ConeGeometry(1.4, 2.2, 9), [x, y + 1.0, z], [0, 0, 0], 1, 0xc8a858); world.addCyl(x, z, 1.1, y - 1, y + 2); }
  { const lowWall = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.min(world.height(ax, az), world.height(bx, bz), world.height(mx, mz)) - 0.6; B.box(M.stone, L, 1.75, 0.6, mx, y, mz, { ry, c: 0xa89c88, solid: true }); };
    lowWall(34, 28, 46, 28); lowWall(46, 28, 46, 38); lowWall(34, 38, 46, 38); lowWall(34, 28, 34, 31.5); }
  { // a low fodder shed against the wall of the pen: crouch under its roof, behind the hay
    const y = world.height(38.6, 36.4); deck(B, M, 38.6, y, 36.45, 0, { w: 4.2, d: 2.4, h: 1.4, c: 0x6a5238 }); B.geo(M.thatch, prismGeo(2.9, 0.7, 4.7, 1), [38.6, y + 1.4, 36.45], [0, PI / 2, 0], 1, 0xc8a858); haystack(B, M, 37.3, y, 36.8, { r: 0.6, h: 1.0 });
  }
  yak(40, 33, 0.6); yak(42.5, 30.5, 2.4, 0x3a2a1c); yak(-15, 27, 1.4); yak(44, 9, -0.6, 0x2a1c14); yak(-72, 38, 0.3); yak(-68, 42, 2.0, 0x4a3a2a); yak(60, 60, 1.1); yak(-30, 80, 2.6);
  // nomad tent of black yak hair, a ruined fort
  { const x = -74, z = 30, ry = 0.3, P = frame(x, z, ry), yf = top(P, 6.4, 5.4, x, z), f = yf + 0.06;      // you can go in
    room(B, M, x, yf, z, { w: 6.4, d: 5.4, h: 2.05, t: 0.18, ry, mat: M.cloth, c: 0x1c1814, base: 1.6, doors: [{ side: 's', at: 0, w: 1.8, h: 1.9 }], floor: { mat: M.ground, c: 0x6a5a48 }, ceil: false });
    B.geo(M.cloth, prismGeo(7.0, 1.9, 6.0, 2), [x, yf + 2.0, z], [0, ry, 0], 1, 0x1c1814);
    for (const sg of [-1, 1]) { const [a, b] = P(sg * 4.0, 0); B.box(M.wood, 0.08, 3.2, 0.08, a, yf - 0.3, b, { ry, rz: sg * -0.3, c: 0x5a4028 }); }
    { const [a, b] = P(0, -0.3); B.cyl(M.stone, 0.45, 0.5, 0.3, a, f, b, { c: 0x4a4038, seg: 9, solid: true }); B.geo(M.glow, new THREE.ConeGeometry(0.2, 0.5, 6), [a, f + 0.55, b], [0, 0, 0], 1, 0xff7a20); fires.push([a, f + 0.5, b]); }
    for (const [lx, lz, c] of [[-2.1, -1.2, 0x8a2a2a], [2.1, -1.0, 0x2a4a8a]]) { const [a, b] = P(lx, lz); B.box(M.cloth, 1.2, 0.14, 2.2, a, f, b, { ry, c }); }
    { const [a, b] = P(-1.9, 1.6); B.box(M.woodH, 0.9, 0.6, 0.6, a, f, b, { ry, c: 0xb8862a, solid: true }); }
    extraPicks.push([...P(2.0, 1.4), 0, 1.6]);
  }
  { // the village temple: a great gilded Buddha, butter lamps, painted pillars, thangkas
    const R2 = PI / 2, t = temple(-24, 2, R2, 10, 9, 5.2), { P, f } = t;
    { const [a, b] = P(0, -2.2); B.box(M.woodH, 4.6, 0.5, 3.6, a, f, b, { ry: R2, c: 0xa01c1c, solid: true }); B.box(M.metal, 4.8, 0.08, 3.8, a, f + 0.5, b, { ry: R2, c: GOLD }); buddha(a, f + 0.58, b, R2, 1.45); }
    for (const sg of [-1, 1]) { const [a, b] = P(sg * 3.2, 1.0); B.cyl(M.flat, 0.24, 0.28, 5.2, a, f, b, { c: 0xa01c1c, seg: 10 }); B.box(M.flat, 0.8, 0.26, 0.8, a, f + 4.9, b, { ry: R2, c: 0x2a5ac8 }); world.addCyl(a, b, 0.3, f - 0.2, f + 5.2); }
    { const [a, b] = P(0, 0.5); B.box(M.woodH, 3.2, 0.8, 0.7, a, f, b, { ry: R2, c: 0x6a3a22, solid: true }); for (let k = 0; k < 7; k++) { const [c1, c2] = P(-1.35 + k * 0.45, 0.5); B.cyl(M.metal, 0.07, 0.04, 0.12, c1, f + 0.8, c2, { c: GOLD, seg: 7 }); B.geo(M.glow, new THREE.SphereGeometry(0.04, 5, 4), [c1, f + 1.0, c2], [0, 0, 0], [1, 1.8, 1], 0xffb040); } }
    for (const sg of [-1, 1]) for (let k = 0; k < 2; k++) { const [a, b] = P(sg * 4.41, -1.6 + k * 3.2); B.box(M.cloth, 1.5, 2.4, 0.05, a, f + 1.6, b, { ry: PI, c: [0x2a5ac8, 0xc82a22][k] }); B.box(M.cloth, 0.9, 1.5, 0.08, a, f + 2.05, b, { ry: PI, c: GOLD }); }
    for (const sg of [-1, 1]) { const [a, b] = P(sg * 1.7, 2.7); B.box(M.cloth, 1.0, 0.22, 2.2, a, f, b, { ry: R2, c: MAROON }); }
    extraFoes.push(['redguard', ...P(-2.8, 2.4), { up: 1.8, patrol: false }], ['pla', -14, 7, {}]); extraPicks.push([...P(3.4, -0.4), 0, 1.8]);
    { const y = world.height(-14.5, -4); B.cyl(M.wood, 0.06, 0.09, 7, -14.5, y - 0.2, -4, { c: 0x6a4a30, seg: 6 }); world.addCyl(-14.5, -4, 0.12, y - 1, y + 7); flags(-14.5, y + 6.8, -4, -19.6, t.yf + 6.2, 6.8, 10); flags(-14.5, y + 6.8, -4, -19.6, t.yf + 6.2, -2.8, 8); }
  }
  { // the ruined fort: a breach in the east wall to crawl through, a ladder to the roof with its broken battlements, a guard post inside
    const x = 80, z = 40, w = 8, d = 8, P = frame(x, z, 0), yf = top(P, w, d, x, z), f = yf + 0.06, T = yf + 4.7;
    room(B, M, x, yf, z, { w, d, h: 4, t: 0.7, mat: M.stone, c: 0xb8ac98, base: 3, doors: [{ side: 'w', at: 0, w: 1.8, h: 2.3 }, { side: 'e', at: 1.9, w: 1.4, h: 1.2 }], wins: [{ side: 's', at: 0, w: 0.6, y: 1.2, h: 1.2 }, { side: 'n', at: 0, w: 0.6, y: 1.2, h: 1.2 }],
      floor: { mat: M.ground, c: 0x7a6a56 }, ceil: { mat: M.woodH, c: 0x4a3626 } });
    steps(B, M, x - w / 2, z, -PI / 2, yf + 0.06, 6, { w: 2, c: 0xb8ac98 });
    steps(B, M, x + w / 2, z + 1.9, PI / 2, f, 2, { w: 1.6, rise: 0.3, c: 0xb8ac98 }); rubble(B, M, x + 5.5, world.height(x + 5.5, z + 4.1), z + 4.1, 1.1, 0xb8ac98);
    B.box(M.stone, 8.3, 0.5, 8.3, x, yf + 4.2, z, { c: MAROON, solid: true }); for (const [a, b, hh] of [[-1, -1, 2.6], [1, -1, 1.4], [1, 1, 3.2], [-1, 1, 0.8]]) B.box(M.stone, 2.2, hh, 2.2, x + a * 2.9, T, z + b * 2.9, { c: 0xb8ac98, solid: true });
    B.box(M.stone, 0.6, 0.9, 3.6, x - 3.75, T, z, { c: 0xb8ac98, solid: true }); B.box(M.stone, 3.6, 0.9, 0.6, x, T, z + 3.75, { c: 0xb8ac98, solid: true });
    ladder(B, M, x + 0.9, z - 4.15, 0, -1, world.height(x + 0.9, z - 4.9) - 0.1, T);
    bed(B, M, x - 1.3, f, z - 2.8, PI / 2, { w: 0.8, l: 1.9, h: 0.4, c: 0x4a4a3a, blanket: 0x66704a, pillow: 0xc8c4b0, head: 0 }); crate(B, M, x + 2.5, f, z + 0.2, 0.6, -0.2, 0x5a6038); crate(B, M, x + 2.45, f + 0.6, z + 0.2, 0.45, 0.3, 0x5a6038);
    { const ty = table(B, M, x - 2.4, f, z + 2.8, 0, { w: 1.2, d: 0.7, c: 0x5a4a32 }); B.box(M.flat, 0.3, 0.16, 0.22, x - 2.55, ty, z + 2.8, { c: 0x15151a }); B.box(M.flat, 0.34, 0.06, 0.08, x - 2.55, ty + 0.18, z + 2.8, { c: 0x15151a }); B.cyl(M.metal, 0.06, 0.07, 0.14, x - 2.0, ty, z + 2.7, { c: 0x6a6e5a, seg: 8 }); }
    for (const [rx, rz, s] of [[72, 46, 1.3], [86, 33, 1.0], [74, 33, 0.8]]) { const y = world.height(rx, rz); B.geo(M.rock, rockGeo(3, 1), [rx, y + s * 0.3, rz], [0, rx, 0], [s * 1.3, s * 0.8, s], 0xa89c88); world.addCyl(rx, rz, s * 0.9, y - 1, y + s * 0.9); }
    crate(B, M, x + 2.2, yf + 0.06, z - 2.2, 0.9, 0.3, 0x5a6038);
  }
  // ---- the frozen lake ------------------------------------------------------------------------
  { const iy = world.height(-58, 4) + 1.1; B.cyl(M.metal, 16.5, 16.5, 0.1, -58, iy - 0.1, 4, { c: 0x8fd6dc, seg: 30 }); world.addBox(-58, 4, 31, 31, 0, iy - 3, iy); chorten(-40, 12, 0.9); }
  // ---- the army camp ---------------------------------------------------------------------------
  {
    tent(40, -27, 1.4); truck(54, -26, 2.2); truck(47, -32, 1.9, true);
    { // the sleeping tent: four cots, a locker between each pair
      const { P, f } = armyTent(44, -12, 0.2);
      for (const sx of [-1, 1]) { for (const sz of [-1, 1]) bed(B, M, ...at(P, sx * 1.75, sz * 1.6, f), 0.2 + (sz < 0 ? PI : 0), { w: 0.8, l: 1.9, h: 0.4, c: 0x4a4a3a, blanket: 0x66704a, pillow: 0xc8c4b0, head: 0 }); chest(B, M, ...at(P, sx * 1.85, 0, f), 0.2 - sx * PI / 2, { w: 0.7, h: 0.4, d: 0.5, c: 0x4e5a34 }); }
    }
    { // the command tent: a map on the table, the radio on a crate, ammunition
      const { P, f } = armyTent(52, -14, -0.2), ty = table(B, M, ...at(P, -1.45, 0.4, f), -0.2 + PI / 2, { w: 1.8, d: 1.0, c: 0x5a4a32 });
      B.box(M.cloth, 0.8, 0.012, 1.3, ...at(P, -1.45, 0.4, ty), { ry: -0.2, c: 0xd8cfa8 }); for (const [lx, lz, c] of [[-1.3, 0.1, 0xb83a2a], [-1.6, 0.7, 0x2a5a8a], [-1.4, 0.9, 0xb83a2a]]) B.box(M.flat, 0.07, 0.02, 0.07, ...at(P, lx, lz, ty + 0.012), { ry: lx, c });
      B.cyl(M.metal, 0.06, 0.08, 0.2, ...at(P, -1.7, -0.3, ty), { c: 0x3a3e3a, seg: 8 }); B.geo(M.glow, new THREE.SphereGeometry(0.05, 6, 5), at(P, -1.7, -0.3, ty + 0.27), [0, 0, 0], [1, 1.5, 1], 0xffc060);
      crate(B, M, ...at(P, 1.75, -2.0, f), 0.8, -0.2, 0x5a6038); B.box(M.metal, 0.6, 0.36, 0.3, ...at(P, 1.75, -2.0, f + 0.8), { ry: -0.2, c: 0x3e4526 }); B.box(M.flat, 0.22, 0.14, 0.02, ...at(P, 1.6, -1.84, f + 0.93), { ry: -0.2, c: 0x15151a }); B.cyl(M.metal, 0.012, 0.012, 1.0, ...at(P, 1.98, -2.0, f + 1.16), { c: 0x8a8e8a, seg: 4 });
      crate(B, M, ...at(P, 1.8, 1.5, f), 0.7, 0.1, 0x5a6038); crate(B, M, ...at(P, 1.75, 2.35, f), 0.6, -0.4, 0x5a6038); bench(B, M, ...at(P, -0.55, 0.4, f), -0.2 + PI / 2, { w: 1.2, c: 0x5a4a32 });
    }
    const y = world.height(48, -20);
    for (const [cx, cz, s, r] of [[46, -19, 0.9, 0.2], [47.1, -19.4, 0.8, 0.6], [46.4, -19.2, 0.7, 0.1], [51, -21, 1.0, 0.4]]) crate(B, M, cx, world.height(cx, cz) + (s === 0.7 ? 0.9 : 0), cz, s, r, 0x5a6038);
    B.cyl(M.metal, 0.05, 0.07, 9, 49, y - 0.2, -17, { c: 0xb8bcc2, seg: 6 }); B.box(M.cloth, 2.4, 1.5, 0.04, 50.3, y + 7.2, -17, { c: 0xc81c1c }); world.addCyl(49, -17, 0.1, y - 1, y + 9);
    B.cyl(M.metal, 0.04, 0.12, 14, 56, world.height(56, -18) - 0.2, -18, { c: 0x3a3e3a, seg: 5 }); for (let k = 0; k < 3; k++) B.box(M.metal, 1.6 - k * 0.4, 0.04, 0.04, 56, world.height(56, -18) + 9 + k * 1.6, -18, { c: 0x3a3e3a });
    const t = signTexture('人民解放军', { font: '"Microsoft YaHei", SimHei, sans-serif', bg: '#a81c1c', fg: '#f0d040', border: false }); t.userData.own = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.2, 0.1), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); m.position.set(42, world.height(42, -19) + 2.2, -19); m.rotation.y = 0.5; root.add(m);
    for (const s of [-1, 1]) B.box(M.wood, 0.12, 2.9, 0.12, 42 + s * 1.9, world.height(42, -19) - 0.2, -19 - s * 1.05, { c: 0x4a3c2c }); world.addBox(42, -19, 4.6, 0.3, 0.5, y - 2, y + 3);
    for (const [fx, fz] of [[48, -23]]) { const fy = world.height(fx, fz); for (let i = 0; i < 6; i++) B.cyl(M.wood, 0.07, 0.08, 1.0, fx, fy + 0.05, fz, { rz: 1.2, ry: i * 1.05, c: 0x2a1a10, seg: 5 }); B.geo(M.glow, new THREE.ConeGeometry(0.34, 0.9, 7), [fx, fy + 0.6, fz], [0, 0, 0], 1, 0xff7a20); fires.push([fx, fy + 0.7, fz]); world.addCyl(fx, fz, 0.7, fy - 1, fy + 0.9); }
  }
  // ---- the stairway and the monastery on the ridge ------------------------------------------------
  for (let i = 0; i < 37; i++) { const z = -29.6 - i * 0.62; B.box(M.stone, 9.6, 0.5, 0.68, 0, world.height(0, z) - 0.42, z, { c: i % 2 ? 0xd8d0c0 : 0xcfc6b4, solid: true }); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const z = -30.5 - i * 3.7; B.box(M.plaster, 0.9, 1.7, 3.7, s * 5.3, world.height(s * 5.3, z - 1.8) - 0.5, z - 1.8, { c: WHITE, solid: true }); B.box(M.plaster, 1.0, 0.16, 3.7, s * 5.3, world.height(s * 5.3, z - 1.8) + 1.2, z - 1.8, { c: MAROON }); }
  { // gateway chorten at the foot of the stair
    const y = world.height(0, -27) - 0.3; for (const s of [-1, 1]) B.box(M.plaster, 2.2, 4.2, 2.6, s * 3.3, y, -27, { c: WHITE, solid: true });
    B.box(M.plaster, 9.2, 0.9, 2.9, 0, y + 4.2, -27, { c: WHITE }); B.box(M.plaster, 9.4, 0.2, 3.1, 0, y + 4.0, -27, { c: MAROON });
    B.geo(M.plaster, new THREE.SphereGeometry(1.2, 14, 10), [0, y + 6.0, -27], [0, 0, 0], [1, 1.05, 1], WHITE); B.geo(M.metal, new THREE.ConeGeometry(0.34, 1.7, 10), [0, y + 8.0, -27], [0, 0, 0], 1, GOLD);
    flags(-3.3, y + 5.1, -27, -14, world.height(-14, -20) + 0.5, -20, 12); flags(3.3, y + 5.1, -27, 14, world.height(14, -20) + 0.5, -20, 12);
  }
  {
    const x = 0, z = -84, Y = HILL.top + 0.05, F = Y + 0.06, WINS = [['s', -9.5], ['s', 9.5], ['e', -2], ['e', 4.6], ['w', 0], ['w', 4.6]];
    room(B, M, x, Y, z, { w: 26, d: 18, h: 7, t: 0.7, mat: M.plaster, c: WHITE, base: 1.6, doors: [{ side: 's', at: 0, w: 3.4, h: 3.4 }, { side: 'e', at: 1.6, w: 1.8, h: 2.4 }, { side: 'n', at: 8, w: 1.8, h: 2.4 }],
      wins: WINS.map(([side, a]) => ({ side, at: a, w: 1.6, y: 4.5, h: 1.2 })), floor: { mat: M.woodH, c: 0x6a3a22 }, ceil: { mat: M.woodH, c: MAROON } });
    for (const [side, a] of WINS) {                                                                           // the windows of the gallery: black frames, a yellow valance
      const ns = side === 's', wx = ns ? x + a : x + (side === 'e' ? 13.04 : -13.04), wz = ns ? z + 9.04 : z + a;
      for (const [yy, hh, c] of [[4.4, 0.1, 0x15120f], [5.7, 0.14, 0x15120f], [5.84, 0.2, 0xe0a82a]]) B.box(c === 0xe0a82a ? M.cloth : M.flat, ns ? 2.0 : 0.1, hh, ns ? 0.1 : 2.0, wx, Y + yy, wz, { c });
    }
    B.box(M.plaster, 26.3, 2.2, 18.3, x, Y + 7.2, z, { c: MAROON, solid: true }); B.box(M.flat, 26.6, 0.2, 18.6, x, Y + 9.4, z, { c: 0x2a2018 });
    for (let i = 0; i < 12; i++) B.cyl(M.flat, 0.22, 0.22, 0.06, x - 11 + i * 2, Y + 8.3, z + 9.18, { rx: PI / 2, c: WHITE, seg: 10 });
    B.geo(M.metal, new THREE.ConeGeometry(6.4, 2.8, 4), [x, Y + 11.0, z], [0, PI / 4, 0], [1.25, 1, 0.9], GOLD); B.box(M.plaster, 9, 0.9, 6.4, x, Y + 9.5, z, { c: MAROON });
    B.cyl(M.metal, 0.3, 0.4, 1.4, x, Y + 12.2, z, { c: GOLD, seg: 10 }); B.geo(M.metal, new THREE.SphereGeometry(0.34, 8, 6), [x, Y + 13.8, z], [0, 0, 0], 1, GOLD);
    for (const s of [-1, 1]) { B.cyl(M.metal, 0.26, 0.3, 1.6, x + s * 12.4, Y + 9.6, z + 8.4, { c: GOLD, seg: 9 }); B.geo(M.metal, new THREE.ConeGeometry(0.28, 0.6, 9), [x + s * 12.4, Y + 11.5, z + 8.4], [0, 0, 0], 1, GOLD); }
    B.geo(M.metal, new THREE.TorusGeometry(0.62, 0.09, 6, 16), [x, Y + 10.4, z + 9.3], [0, 0, 0], 1, GOLD); for (let k = 0; k < 4; k++) B.box(M.metal, 0.05, 1.2, 0.05, x, Y + 9.8, z + 9.3, { rz: k * PI / 4, c: GOLD });
    for (const s of [-1, 1]) B.box(M.metal, 0.3, 0.5, 0.7, x + s * 1.5, Y + 9.6, z + 9.3, { ry: s * 0.2, c: GOLD });                     // the two deer beside the wheel
    // porch
    B.box(M.woodH, 14, 0.3, 3.2, x, Y + 4.6, z + 10.4, { c: MAROON }); B.box(M.cloth, 14, 0.5, 0.05, x, Y + 4.1, z + 11.95, { c: 0xe0a82a });
    for (const px of [-6, -2.4, 2.4, 6]) { B.cyl(M.flat, 0.28, 0.32, 4.6, x + px, Y, z + 11.4, { c: 0xa01c1c, seg: 10 }); B.box(M.flat, 0.9, 0.3, 0.9, x + px, Y + 4.3, z + 11.4, { c: 0x2a5ac8 }); world.addCyl(x + px, z + 11.4, 0.34, Y - 1, Y + 4.6); }
    for (const s of [-1, 1]) { B.box(M.cloth, 0.6, 3.4, 0.05, x + s * 2.0, Y, z + 9.06, { c: 0x15120f }); B.box(M.woodH, 5.4, 0.12, 0.5, x + s * 10, Y + 1.5, z + 9.4, { c: MAROON }); B.box(M.woodH, 5.4, 0.12, 0.5, x + s * 10, Y + 0.6, z + 9.4, { c: MAROON });
      for (let k = 0; k < 6; k++) B.cyl(M.metal, 0.26, 0.26, 0.74, x + s * (7.8 + k * 0.88), Y + 0.72, z + 9.4, { c: k % 2 ? GOLD : 0xb8862a, seg: 10 });               // prayer wheels
      world.addBox(x + s * 10, z + 9.4, 5.4, 0.6, 0, Y, Y + 1.6); }
    // inside: pillars, cushions, the great image, butter lamps
    for (const px of [-4.6, 4.6]) for (const pz of [5.2, 1.6, -2, -5.6]) { B.cyl(M.flat, 0.3, 0.34, 7, x + px, F, z + pz, { c: 0xa01c1c, seg: 10 }); B.box(M.flat, 1.0, 0.3, 1.0, x + px, F + 6.6, z + pz, { c: 0x2a5ac8 }); B.box(M.cloth, 0.5, 2.6, 0.5, x + px, F + 3.6, z + pz, { c: FLAGS[(pz + 6) % 5 | 0] }); world.addCyl(x + px, z + pz, 0.36, F - 0.2, F + 7); }
    for (const px of [-2.3, 2.3, -7.4, 7.4]) B.box(M.cloth, 1.1, 0.24, 9.4, x + px, F, z - 0.2, { c: px * px > 20 ? 0x8a2a2a : MAROON });
    B.box(M.woodH, 5.6, 1.3, 4.0, x, F, z - 6.3, { c: 0xa01c1c, solid: true }); B.box(M.metal, 5.8, 0.14, 4.2, x, F + 1.3, z - 6.3, { c: GOLD });
    buddha(x, F + 1.44, z - 6.35, 0, 1.5);                                                                    // the great image
    B.box(M.woodH, 4.4, 0.85, 0.8, x, F, z - 3.3, { c: 0x6a3a22, solid: true });
    for (let k = 0; k < 9; k++) { B.cyl(M.metal, 0.07, 0.04, 0.12, x - 1.8 + k * 0.45, F + 0.85, z - 3.3, { c: GOLD, seg: 7 }); B.geo(M.glow, new THREE.SphereGeometry(0.04, 5, 4), [x - 1.8 + k * 0.45, F + 1.05, z - 3.3], [0, 0, 0], [1, 1.8, 1], 0xffb040); }
    for (const s of [-1, 1]) for (let k = s < 0 ? 1 : 0; k < 3; k++) { B.box(M.cloth, 0.06, 2.6, 1.7, x + s * 12.2, F + 0.75, z - 5 + k * 4.4, { c: [0x2a5ac8, 0xc82a22, 0x2a9a4a][k] }); B.box(M.cloth, 0.08, 1.6, 1.0, x + s * 12.16, F + 1.25, z - 5 + k * 4.4, { c: GOLD }); }
    lamp(x, F + 3.2, z - 3.6, 60, 22, 0xffb060);
    steps(B, M, x, z + 9, 0, F, 2, { w: 14, rise: 0.06, run: 0.4, c: 0xd8d0c0 });
    { // a wooden gallery round three sides of the hall, with a stair up to it along the west wall
      const GH = F + 3.6, OAK = 0x9a5a34, RED = 0xa01c1c, BOOKS = [0xe0a82a, 0xd86a2a, 0xb83a2a, 0xe8c020];
      for (const [gx, gz, gw, gd] of [[-11.1, 3.15, 2.4, 10.3], [11.1, 2.15, 2.4, 12.3], [0, 7.1, 19.8, 2.4]]) B.box(M.woodH, gw, 0.16, gd, x + gx, GH - 0.16, z + gz, { c: OAK, solid: true });
      steps(B, M, x - 11.1, z - 2, PI, GH, 11, { w: 1.6, rise: 0.3, run: 0.42, mat: M.woodH, c: OAK });
      const rail = (ax, az, bx, bz) => {
        const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), n = Math.round(L / 1.5);
        for (const yy of [0.45, 0.93]) B.box(M.woodH, L, 0.07, 0.07, x + (ax + bx) / 2, GH + yy, z + (az + bz) / 2, { ry, c: RED });
        for (let i = 0; i <= n; i++) B.box(M.wood, 0.08, 1.0, 0.08, x + ax + (bx - ax) * i / n, GH, z + az + (bz - az) * i / n, { c: RED });
        world.addBox(x + (ax + bx) / 2, z + (az + bz) / 2, L, 0.12, ry, GH, GH + 1.0);
      };
      rail(-9.9, -2, -9.9, 5.9); rail(-9.9, 5.9, 9.9, 5.9); rail(9.9, 5.9, 9.9, -4); rail(9.9, -4, 12.3, -4);
      for (const [px, pz] of [[-9.9, 5.9], [-9.9, 1.9], [-9.9, -2], [9.9, 5.9], [9.9, 0.9], [9.9, -4], [-3.3, 5.9], [3.3, 5.9]]) { B.box(M.wood, 0.2, 3.44, 0.2, x + px, F, z + pz, { c: RED }); world.addCyl(x + px, z + pz, 0.13, F, GH - 0.16); }
      // the long low tables of the monks with their scriptures, the shelves of books beside the image, the great drum, the long horns
      for (const px of [-3.35, 3.35, -6.35, 6.35]) { B.box(M.woodH, 0.5, 0.42, 8.6, x + px, F, z - 0.2, { c: RED, solid: true }); B.box(M.metal, 0.54, 0.03, 8.64, x + px, F + 0.34, z - 0.2, { c: GOLD });
        for (let k = 0; k < 7; k++) B.box(M.cloth, 0.14, 0.08, 0.46, x + px, F + 0.42, z - 3.9 + k * 1.24, { c: BOOKS[(k + (px > 0 ? 1 : 0)) % 2] }); }
      shelf(B, M, x - 6.3, F, z - 8.05, 0, 5.4, 3.2, { c: RED, goods: BOOKS }); shelf(B, M, x + 4.8, F, z - 8.05, 0, 2.6, 3.2, { c: RED, goods: BOOKS });
      { const dx = x - 6.2, dz = z + 7.2; B.box(M.wood, 1.6, 0.1, 0.5, dx, F, dz, { c: RED }); for (const s of [-1, 1]) B.box(M.wood, 0.08, 1.9, 0.08, dx + s * 0.72, F, dz, { c: RED }); B.box(M.wood, 1.52, 0.08, 0.08, dx, F + 1.9, dz, { c: RED });
        B.cyl(M.flat, 0.6, 0.6, 0.28, dx, F + 0.86, dz, { rx: PI / 2, c: 0x1a5a3a, seg: 16 }); for (const s of [-1, 1]) B.cyl(M.flat, 0.52, 0.52, 0.02, dx, F + 0.99, dz + s * 0.15, { rx: PI / 2, c: 0xe8dcc0, seg: 16 }); world.addBox(dx, dz, 1.6, 0.5, 0, F, F + 1.9); }
      { const hx = x + 6.2, hz = z + 7.2; for (const s of [-1, 1]) B.geo(M.metal, new THREE.CylinderGeometry(0.035, 0.17, 2.9, 10), [hx, F + 0.64, hz + s * 0.22], [0, 0, PI / 2 + 0.06], 1, 0xb8862a);
        for (const k of [-0.9, 1.0]) B.box(M.wood, 0.12, 0.5, 0.8, hx + k, F, hz, { c: RED }); world.addBox(hx, hz, 3.0, 0.8, 0, F, F + 0.8); }
      // what the soldiers threw about on their way to the fire: two tables on their sides, books on the floor
      for (const [px, pz, ry] of [[3.3, 5.3, 0.5], [-3.2, 4.8, -0.8]]) { B.box(M.woodH, 1.2, 0.07, 0.6, x + px, F + 0.28, z + pz, { ry, rx: 1.25, c: RED }); world.addBox(x + px, z + pz, 1.2, 0.3, ry, F, F + 0.6); }
      for (let k = 0; k < 9; k++) B.box(M.cloth, 0.14, 0.07, 0.46, x - 2.6 + (k * 1.37) % 5.4, F, z + 4.9 + (k * 0.83) % 2.1, { ry: k * 1.9, c: BOOKS[k % 2] });
    }
    // courtyard: the bonfire of scriptures, the tall prayer pole, the great chorten, monks' houses
    const fy = world.height(0, -64);
    for (let i = 0; i < 8; i++) B.box(M.woodH, 0.9, 0.12, 0.3, (R() - 0.5) * 1.6, fy + 0.05 + i * 0.07, -64 + (R() - 0.5) * 1.6, { ry: R() * 3, rz: (R() - 0.5) * 0.4, c: [0xb8862a, 0x8a2a2a, 0xe8dcc0][i % 3] });
    B.geo(M.glow, new THREE.ConeGeometry(0.6, 1.5, 7), [0, fy + 1.1, -64], [0, 0, 0], 1, 0xff7a20); fires.push([0, fy + 1.0, -64]); world.addCyl(0, -64, 1.1, fy - 1, fy + 1.2); lamp(0, fy + 1.6, -64, 46, 18, 0xff8a40);
    B.box(M.cloth, 3.4, 1.0, 0.05, -5.5, fy + 2.6, -60.5, { ry: 0.5, c: 0xc81c1c }); for (const s of [-1, 1]) B.box(M.wood, 0.08, 3.4, 0.08, -5.5 + s * 1.5, fy, -60.5 - s * 0.8, { c: 0x4a3c2c });
    chorten(15, -62, 2); house(-21, -68, 0.4, 9, 6.5, { kind: 'cell' }); house(22, -72, -0.5, 8, 6.5, { kind: 'cell', roof: true });
    { // the mani chapel beside the great hall: one huge prayer wheel and a small Buddha
      const t = temple(21.5, -88.5, 0, 7, 7, 4.2, WHITE), P2 = t.P, f2 = t.f;
      { const [a, b] = P2(0, 0.3); B.cyl(M.metal, 0.85, 0.85, 2.3, a, f2 + 0.35, b, { c: 0xa01c1c, seg: 14 }); for (const yy of [0.35, 1.43, 2.51]) B.cyl(M.metal, 0.88, 0.88, 0.14, a, f2 + yy, b, { c: GOLD, seg: 14 }); B.cyl(M.wood, 0.07, 0.07, 3.6, a, f2, b, { c: 0x4a3626, seg: 6 }); world.addCyl(a, b, 0.9, f2 - 0.2, f2 + 2.8); }
      { const [a, b] = P2(0, -2.3); B.box(M.woodH, 2.6, 0.7, 1.4, a, f2, b, { c: 0xa01c1c, solid: true }); buddha(a, f2 + 0.7, b, 0, 0.7); }
      extraPicks.push([...P2(2.3, 1.7), 0, 1.8]); extraFoes.push(['plaGunner', 17, -80, {}]);
    }
    { // the monastery kitchen, open toward the hall: the great tea cauldron on its stove, churns, fuel, bowls on the table
      const kx = -20, kz = -86, R2 = PI / 2, P = frame(kx, kz, R2), yf = top(P, 7, 4.6, kx, kz), f = yf + 0.06;
      room(B, M, kx, yf, kz, { w: 7, d: 4.6, h: 2.9, t: 0.4, ry: R2, mat: M.plaster, c: WHITE, base: 2.4, doors: [{ side: 's', at: 0, w: 5.6, h: 2.5 }], floor: { mat: M.ground, c: 0x7a6a56 }, ceil: { mat: M.woodH, c: 0x4a3626 } });
      B.box(M.plaster, 7.3, 0.5, 4.9, kx, yf + 3.1, kz, { ry: R2, c: MAROON }); B.box(M.flat, 7.5, 0.16, 5.1, kx, yf + 3.6, kz, { ry: R2, c: 0x2a2018 });
      B.box(M.plaster, 2.2, 0.8, 1.2, ...at(P, -1.7, -1.25, f), { ry: R2, c: 0x8a7866, solid: true }); B.box(M.glow, 0.5, 0.3, 0.04, ...at(P, -1.7, -0.63, f + 0.12), { ry: R2, c: 0xff7a20 });
      B.cyl(M.metal, 0.66, 0.5, 0.5, ...at(P, -1.7, -1.25, f + 0.8), { c: 0x3a2a22, seg: 14 }); B.cyl(M.flat, 0.6, 0.6, 0.02, ...at(P, -1.7, -1.25, f + 1.27), { c: 0xb88a5a, seg: 14 }); B.cyl(M.wood, 0.025, 0.025, 1.2, ...at(P, -1.45, -1.2, f + 1.0), { rz: 0.45, c: 0x4a3626, seg: 5 });
      churn(...at(P, 0.15, -1.55, f)); churn(...at(P, 0.6, -1.45, f)); woodpile(B, M, ...at(P, 2.3, -1.45, f), R2, { w: 1.5, h: 1.0, d: 0.8, c: 0x4a3a2a });
      { const ty = table(B, M, ...at(P, 1.3, 0.7, f), R2, { w: 1.6, d: 0.8, h: 0.72, c: 0x6a4a2e }); for (let k = 0; k < 5; k++) B.cyl(M.wood, 0.09, 0.05, 0.07, ...at(P, 0.75 + k * 0.28, 0.6 + (k % 2) * 0.2, ty), { c: k % 2 ? 0x7a4a26 : 0x8a5a30, seg: 8 }); }
      pots(B, M, ...at(P, -2.55, 0.9, f), { n: 3, s: 1.5, solid: false }); sacks(B, M, ...at(P, 2.45, 1.75, f), R2 + PI / 2, { w: 1.2 });
      extraPicks.push([...P(-0.3, 0.5), 0, 0.6]);
    }
    { // the pilgrims' circuit round the hill: prayer wheels behind the hall, heaps of mani stones along the way up from the stream bed
      wheelWall(-12, -99.6, 4, -99.6); maniPile(-34.5, -66, -1.23); maniPile(-29.5, -77, -1.54); maniPile(-25, -93.5, 1.01); maniPile(15, -98.5, -0.63);
      for (const [ax, az, bx, bz] of [[-35.5, -68.5, -30.5, -79], [-30.5, -79, -26.5, -94.5]]) {
        for (const [px, pz] of [[ax, az], [bx, bz]]) { const y = world.height(px, pz); B.cyl(M.wood, 0.05, 0.07, 3.4, px, y - 0.3, pz, { c: 0x6a4a30, seg: 6 }); }
        flags(ax, world.height(ax, az) + 3.0, az, bx, world.height(bx, bz) + 3.0, bz, 14);
      }
      // four nuns on the circuit behind the hall: one turns a wheel, one prays, two talk
      const ny = world.height(-8, -98);
      who('nun', -8.2, ny, -98.85, PI, { pose: (f) => { f.armR.rotation.x = -1.35; f.armR.rotation.z = -0.1; f.armL.rotation.x = -0.25; } }); who('nun', -10.6, ny, -98.3, PI + 0.25, { pose: 'pray' });
      who('nun', -5.6, ny, -97.3, 1.2, { pose: 'talk' }); who('nun', -4.3, ny, -96.8, -1.9, { pose: (f) => { f.armR.rotation.x = -0.9; f.armL.rotation.x = -0.9; f.armR.rotation.z = 0.45; f.armL.rotation.z = -0.45; } });
    }
    const py = world.height(-11, -60); B.cyl(M.wood, 0.08, 0.12, 10, -11, py - 0.2, -60, { c: 0x6a4a30, seg: 6 }); world.addCyl(-11, -60, 0.14, py - 1, py + 10);
    for (const [ex, ez] of [[-20, -56], [-4, -54], [-16, -64], [-6, -66]]) flags(-11, py + 9.6, -60, ex, world.height(ex, ez) + 0.5, ez, 12);
  }

  { // a log footbridge over the dry stream bed: cross it, or pass under it unseen
    const x = -47.5, z = -35, ry = 1.913, P = frame(x, z, ry), T = Math.max(world.height(...P(0, 8)), world.height(...P(0, -8))) + 0.05;
    for (let i = 0; i < 4; i++) B.geo(M.wood, new THREE.CylinderGeometry(0.2, 0.22, 16.4, 7), at(P, -0.6 + i * 0.4, 0, T - 0.19), [PI / 2, 0, -ry], [1, 1, 0.9], i % 2 ? 0x6a5238 : 0x5a4630);
    for (const lz of [-3.4, 3.4]) for (const lx of [-0.7, 0.7]) { const [a, b] = P(lx, lz), y = world.height(a, b); B.cyl(M.wood, 0.11, 0.13, T - y, a, y - 0.2, b, { c: 0x4a3a28, seg: 6 }); world.addCyl(a, b, 0.14, y - 1, T - 0.3); }
    world.addBox(x, z, 1.6, 16, ry, T - 0.25, T);
  }
  // a great rock east of the stream bed, as high as the monastery court: a ladder on the side the soldiers cannot see
  boulder(B, M, -31, world.height(-31, -48), -48, { rx: 6.5, rz: 6, h: 9, seed: 5, ladder: PI, rock: [0x8a7c6a, 0x7a6e60, 0x9a8c7a, 0x6e6458], grass: 0xb09a5e, grass2: 0xc8ae60, moss: 0x8a7c5a }); sites.push([-31, -48, 10]);
  { // the barley terraces north-east of the village: low dry-stone walls to crouch behind, sheaves, a threshing floor, a field barn with a hay loft
    const wall = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 7);
      for (let i = 0; i < n; i++) { const x0 = ax + (bx - ax) * i / n, z0 = az + (bz - az) * i / n, x1 = ax + (bx - ax) * (i + 1) / n, z1 = az + (bz - az) * (i + 1) / n;
        B.box(M.stone, Math.hypot(x1 - x0, z1 - z0) + 0.3, 1.45, 0.7, (x0 + x1) / 2, Math.min(world.height(x0, z0), world.height(x1, z1)) - 0.5, (z0 + z1) / 2, { ry: Math.atan2(-(z1 - z0), x1 - x0), c: 0xa89c88, solid: true }); } };
    wall(46, 62, 56, 62); wall(64, 62.5, 76, 63); wall(44, 69, 55, 69.5); wall(59, 69.5, 72, 69); wall(48, 77, 63, 77.5); wall(67, 77.5, 78, 77);
    for (let i = 0; i < 9; i++) { const sx = 48 + (i * 7.3) % 28, sz = 64.5 + (i % 3) * 4.2 + (i % 2) * 2.6; B.geo(M.thatch, new THREE.ConeGeometry(0.45, 1.1, 7), [sx, world.height(sx, sz) + 0.5, sz], [0, i, 0], 1, 0xd8b860); }
    { const tx = 60, tz = 86, ty = Math.max(world.height(tx, tz), world.height(tx + 3, tz), world.height(tx - 3, tz), world.height(tx, tz + 3), world.height(tx, tz - 3)) + 0.04;      // the threshing floor: stamped earth, a post, the heap of grain
      B.cyl(M.ground, 4.6, 4.6, 0.5, tx, ty - 0.5, tz, { c: 0xb8a070, seg: 22 }); world.addBox(tx, tz, 6.5, 6.5, 0, ty - 0.5, ty); world.addBox(tx, tz, 6.5, 6.5, PI / 4, ty - 0.5, ty);
      B.cyl(M.wood, 0.07, 0.1, 2.3, tx, ty, tz, { c: 0x5a4028, seg: 6 }); world.addCyl(tx, tz, 0.12, ty, ty + 2.3); B.geo(M.thatch, new THREE.ConeGeometry(1.0, 0.55, 12), [tx + 2.2, ty + 0.27, tz - 1.6], [0, 0, 0], 1, 0xe2c870);
      for (const [lx, lz] of [[-2.4, 1.2], [-1.6, 2.4]]) B.cyl(M.thatch, 0.42, 0.36, 0.1, tx + lx, ty, tz + lz, { c: 0xb89a60, seg: 12 });
      haystack(B, M, tx - 4.4, world.height(tx - 4.4, tz + 4.2), tz + 4.2, { r: 1.3, h: 2.1 }); haystack(B, M, tx + 1.5, world.height(tx + 1.5, tz + 5.6), tz + 5.6, { r: 1.1, h: 1.8 });
      carry(who('tibetWoman', 60, world.height(60, 80.4), 80.4, 0.3, { pose: 'carry' }), basket());
      sites.push([tx, tz, 6.5]);
    }
    { const x = 71, z = 88, w = 7, d = 5.5, ry = -PI / 2, P = frame(x, z, ry), yf = top(P, w, d, x, z), f = yf + 0.06;       // the field barn, its wide door toward the threshing floor
      room(B, M, x, yf, z, { w, d, h: 4.1, t: 0.5, ry, mat: M.stone, c: 0xb8ac98, base: 2, doors: [{ side: 's', at: 0, w: 3.4, h: 2.4 }], floor: { mat: M.ground, c: 0x7a6a56 }, ceil: { mat: M.woodH, c: 0x4a3626 } });
      B.box(M.plaster, w + 0.3, 0.5, d + 0.3, x, yf + 4.3, z, { ry, c: MAROON }); B.box(M.flat, w + 0.5, 0.16, d + 0.5, x, yf + 4.8, z, { ry, c: 0x2a2018 }); steps(B, M, ...P(0, d / 2), ry, f, 2, { w: 3.6, rise: 0.3, c: 0xb8ac98 });
      deck(B, M, ...at(P, 0, -1.1, f), ry, { w: 5.9, d: 2.3, h: 2.1, ladder: 's', at: -2.1, c: 0x7a5a3a });                  // the hay loft
      haystack(B, M, ...at(P, 1.7, -1.3, f + 2.1), { r: 0.85, h: 1.2 }); for (const [lx, lz] of [[0.3, -1.7], [-0.6, -1.75]]) B.box(M.thatch, 0.8, 0.5, 0.5, ...at(P, lx, lz, f + 2.1), { ry, c: 0xc8a850 });
      sacks(B, M, ...at(P, -1.7, -1.3, f), ry, { w: 1.8 }); pots(B, M, ...at(P, 1.2, -1.5, f), { n: 3, s: 1.3, solid: false });
      for (const k of [0, 1]) B.cyl(M.wood, 0.025, 0.03, 2.0, ...at(P, 2.9, 0.6 + k * 0.35, f), { rz: 0.16, c: 0x6a4a2e, seg: 5 });
      extraPicks.push([...P(-0.6, -1.0), 0, 2.4]);
      // a hearth before the door: a woman works the tea churn; the herdsman and his yaks stand behind the barn
      { const [hx, hz] = P(3.0, 4.6), hy = world.height(hx, hz); fires.push(hearth(B, M, hx, hy, hz, { pot: true })); const [cx, cz] = P(4.2, 4.95), cy = world.height(cx, cz); churn(cx, cy, cz);
        who('tibetWoman', ...at(P, 4.2, 4.33, cy), ry, { pose: (q) => { q.hips.rotation.x = 0.12; q.armR.rotation.x = -1.0; q.armL.rotation.x = -1.0; q.armR.rotation.z = 0.2; q.armL.rotation.z = -0.2; } }); }
      yak(77.5, 94, 0.8); yak(80, 90.5, 2.3, 0x3a2a1c);
      { const hy = world.height(76.6, 91.6); who('tibetMan', 76.6, hy, 91.6, 0.4, { pose: 'hips' }); B.cyl(M.wood, 0.02, 0.025, 1.8, 77.0, hy, 91.4, { rz: 0.1, c: 0x5a4028, seg: 5 }); }
      sites.push([x, z, 6.5]);
    }
  }
  { // the checkpoint on the lorry track east of the camp: a barrier to duck under, a sentry box, sandbags, oil drums
    const x = 84, z = -22, y = Math.max(world.height(x, z), world.height(x, z - 2.6), world.height(x, z + 2.6));
    B.box(M.wood, 0.1, 0.1, 6.2, x, y + 1.25, z + 0.3, { c: 0xe8e4d8 }); for (let k = 0; k < 5; k++) B.box(M.wood, 0.11, 0.11, 0.6, x, y + 1.245, z - 2.2 + k * 1.2, { c: 0xb82a22 }); world.addBox(x, z, 0.14, 5.6, 0, y + 1.25, y + 1.4);
    for (const s of [-1, 1]) { B.box(M.wood, 0.16, 1.5, 0.16, x - 0.16, y - 0.3, z + s * 2.8, { c: 0x4a3c2c }); world.addCyl(x - 0.16, z + s * 2.8, 0.14, y - 1, y + 1.3); } B.box(M.metal, 0.3, 0.3, 0.4, x, y + 1.05, z + 3.3, { c: 0x2a2a2e });
    { const bx = 86.4, bz = -17.6, by = top(frame(bx, bz, 0), 1.9, 1.9, bx, bz);                                           // the sentry box, open toward the track
      room(B, M, bx, by, bz, { w: 1.9, d: 1.9, h: 2.3, t: 0.1, mat: M.woodH, c: 0x7a8a52, base: 1, doors: [{ side: 'n', at: 0, w: 1.4, h: 2.1 }], floor: { mat: M.woodH, c: 0x8a7a5a }, ceil: { mat: M.woodH, c: 0x5a6a3a } });
      B.geo(M.woodH, prismGeo(2.3, 0.6, 2.3, 1), [bx, by + 2.5, bz], [0, 0, 0], 1, 0x5a6a3a); B.box(M.flat, 0.3, 0.2, 0.1, bx + 0.7, by + 1.3, bz + 0.78, { c: 0x15151a }); extraPicks.push([bx, bz, 0, 0.6]); }
    sacks(B, M, 81.6, world.height(81.6, -25.4), -25.4, 0.15, { w: 2.4, c: 0x8a8a5e }); sacks(B, M, 86.6, world.height(86.6, -25.8), -25.8, -0.4, { w: 2.4, c: 0x8a8a5e });
    for (const [bx, bz] of [[88.4, -18.6], [89.2, -17.9], [88.5, -17.6]]) barrel(B, M, bx, world.height(bx, bz), bz, 0x4e5a34);
    extraFoes.push(['pla', 82, -19.5, {}], ['pla', 87.5, -23.5, { patrol: true }]); sites.push([x + 1.5, z, 8]);
  }
  { // the old hermit sits in his cell
    const y = world.height(-20, 49.1) + 0.08; B.box(M.cloth, 0.8, 0.12, 0.8, -20.6, y, 48.35, { c: MAROON }); sites.push([-20, 49.1, 2.4]);
    who('monk', -20.6, y, 48.35, 0.2, { pose: 'sit', seat: 0.12, arms: [-0.55, -0.55], over: { hair: 0xd8d4cc, face: ['chinbeard'], skin: 0xb8845c } });
  }
  // ---- rocks, juniper, dry grass ------------------------------------------------------------------
  const inSite = (x, z) => sites.some(([a, b, r]) => Math.hypot(x - a, z - b) < r);
  const built = (x, z) => inSite(x, z) || dPoly(GULLY, x, z) < 7 || dPoly(TRACK, x, z) < 3.5 || (x > 42 && x < 83 && z > 58 && z < 97) || dPoly(PATH, x, z) < 4 || Math.hypot(x - 14, z - 26) < 30 || Math.hypot(x - HILL.x, z - HILL.z) < 40 || Math.hypot(x - 48, z + 21) < 15 || Math.hypot(x + 58, z - 4) < 18 || Math.hypot(x + 6, z - 97) < 10
    || Math.hypot(x - 80, z - 40) < 9 || Math.hypot(x + 74, z - 30) < 7 || (Math.abs(x) < 7 && z < -26 && z > -54) || (x < -22 && x > -44 && Math.abs(z - 60) < 4);
  const rocks = [], shrubs = [], tufts = [];
  for (let i = 0; i < 340; i++) {
    const x = (R() - 0.5) * 360, z = (R() - 0.5) * 360, h = world.height(x, z); if (built(x, z)) continue;
    const s = 0.4 + R() * R() * 3.2;
    rocks.push({ x, y: h + s * 0.2, z, ry: R() * 6, s: [s, s * 0.8, s], c: R.pick([0x8a7c6a, 0x9a8c7a, 0x7a6e60]) });
    if (Math.hypot(x + 24, z - 2) < 10) { rocks.pop(); continue; }
    if (s > 1 && Math.abs(x) < 128 && z > -126 && z < 116) world.addCyl(x, z, s * 0.85, h - 2, h + s * 0.7);
  }
  for (let i = 0; i < 260; i++) { const x = (R() - 0.5) * 230, z = (R() - 0.5) * 220, h = world.height(x, z); if (built(x, z) || h > 40 || fbm(x * 0.04, z * 0.04, 2, 6) < 0.5) continue; const s = 0.5 + R() * 0.8; shrubs.push({ x, y: h + 0.2, z, ry: R() * 6, s: [s * 1.3, s * 0.75, s * 1.3], c: R.pick([0x3a4a2c, 0x4a5632, 0x2e3e26]) }); if (Math.hypot(x + 24, z - 2) < 10) shrubs.pop(); }
  for (let i = 0; i < 90000 && tufts.length < 20000; i++) {
    const x = (R() - 0.5) * 236, z = (R() - 0.5) * 226, h = world.height(x, z);
    if (h > 34 || dPoly(PATH, x, z) < 1.6 || Math.hypot(x + 58, z - 4) < 17 || Math.hypot(x - HILL.x, z - HILL.z) < 27 || (Math.abs(x) < 5.5 && z < -28 && z > -54)) continue;
    tufts.push({ x, y: h, z, ry: R() * 6.28, s: [0.35 + R() * 0.4, 0.2 + R() * 0.35, 0.35 + R() * 0.4], c: R.pick([0xd8c070, 0xc8ae60, 0xb89a50, 0xe2cc84]) });
    if (Math.hypot(x + 24, z - 2) < 9 || Math.hypot(x + 74, z - 30) < 4.8 || inSite(x, z)) tufts.pop();
  }
  root.add(instanced(rockGeo(5, 1), M.rock, rocks, { solid: true }));
  root.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.rock, shrubs));
  root.add(instanced(tuftGeo(5, 0xa8904a, 0xffffff), windify(M.flat2.clone(), shared, 0.26, 1, 2.4), tufts, { cast: false, thin: true }));
  root.add(makeAmbient(shared, { count: 320, box: 40, boxY: 14, size: 0.04, colorA: 0xffffff, colorB: 0xfff4d8, alpha: 0.55, fall: -0.02, wind: [0.9, 0, 0.3], flutter: 0.9 }));
  const eagle = new THREE.Mesh(merge([gBox(2.8, 0.03, 0.55, 0x2a2018, [0, 0, 0]), gBox(0.3, 0.06, 1.0, 0x2a2018, [0, 0, 0.1]), gBox(0.5, 0.03, 0.3, 0x2a2018, [0, 0, 0.6])]), M.flat); root.add(eagle);

  { // a lookout beside the road (up its ladder), a hermit's cell to crawl into
    const clearAt = (x, z, r) => { world.cyls = world.cyls.filter((c) => Math.hypot(c.x - x, c.z - z) > r + c.r); };
    clearAt(20, 59, 4); stand(B, M, 20, world.height(20, 58.7), 58.7, 0, { c: 0x8a6a48, roof: 0x7a2420 });
    clearAt(-20, 49.5, 4); den(B, M, -20, world.height(-20, 49.1) + 0.02, 49.1, 0, { mat: M.stone, c: 0xa89c88 }); extraPicks.push([-20, 49.3, 0, 0.6]);
  }
  const enemies = [
    ['pla', 4, 78, {}], ['pla', -6, 71, { patrol: true }], ['redguard', 8, 65, {}], ['pla', -35.5, -62, {}], ['redguard', -46.5, -38, {}],
    ['pla', 5, 45, {}], ['redguard', 6, 30, {}], ['redguard', 18, 23, {}], ['plaGunner', 24, 15, {}], ['pla', -3, 35, { up: 1.8, patrol: false }], ['pla', 31, 19, { up: 1.8, patrol: false }], ['redguard', 38, 25, {}],
    ['plaGunner', 80, 40, { up: 1.8, patrol: false }], ['pla', 71, 37, {}], ['pla', -44, 14, {}], ['redguard', -50, -13, {}],
    ['pla', 45, -17, {}], ['pla', 53, -20, { patrol: true }], ['plaGunner', 49, -27, {}], ['pla', 41, -23, {}],
    ['pla', -3, -24, {}], ['pla', 3.4, -24, {}], ['redguard', 0, -41, {}],
    ['redguard', -5, -61, {}], ['redguard', 5, -62, {}], ['redguard', -2.5, -67.5, {}], ['pla', 11, -67, {}], ['plaGunner', -14, -71, {}], ['pla', -21, -68, { up: 1.8, patrol: false }],
    ['redguard', 7.5, -82, { up: 1.8, patrol: false, yaw: 0 }], ['pla', -7.5, -80, { up: 1.8, patrol: false, yaw: 0 }], ['tibetBoss', 0, -70.5, { yaw: 0, patrol: false }],
  ];
  const bowl = merge([gCyl(0.13, 0.07, 0.1, 0x7a4a26, [0, 0, 0], [0, 0, 0], 1, 10), gCyl(0.115, 0.115, 0.012, 0xd8b88a, [0, 0.045, 0], [0, 0, 0], 1, 10), gCyl(0.075, 0.09, 0.03, 0xc8ccd0, [0, -0.06, 0], [0, 0, 0], 1, 10), gCone(0.12, 0.08, 0xc8ccd0, [0, 0.11, 0], [0, 0, 0], 1, 10)]);
  let ft = 0;
  return {
    env: {
      sunDir: [0.46, 0.72, 0.52], sunColor: 0xfff4e0, sunLight: 0xfff6ea, sunIntensity: 4.9, sunSize: 0.0005,
      skyTop: 0x0c40a8, skyHorizon: 0x9ac6ee, skyGround: 0x8aa0b8, haze: 0.45,
      fogColor: 0xb2d0ec, fogDensity: 0.0009, hemiSky: 0xa8c8ff, hemiGround: 0x9a8a62, hemiIntensity: 1.7, envIntensity: 0.7,
      cloudCover: 0.42, cloudScale: 0.34, cloudLit: 0xffffff, cloudShade: 0xa0b0c8,
      bloom: 0.3, bloomRadius: 0.6, bloomThreshold: 1.4, rays: 0.22, rayThreshold: 2.6, exposure: 0.9,
      saturation: 1.18, contrast: 1.08, vignette: 0.3, tintHi: 0xfffaf0, tintLo: 0xe4f0ff, shadowRange: 95,
    },
    spawn: { x: 0, z: 101, yaw: 0 },
    vista: { c: [0, 6, 20], r: 62, h: 15, a: 1.6, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[3, 84], [-1.2, 36.6, 0, 1.8], [13, 21], [50.5, -17.5], [-44, 8], [81.4, 42, 0, 1.8], [0, -56], [8.4, -88.4, 0, 1.8], [23.2, -70.6, 0, 1.8]].concat(extraPicks),
    dust: [0.8, 0.72, 0.54], water: [], heroLight: 30,
    makePickup: () => new THREE.Mesh(bowl, M.flat),
    update(dt, t, g) {
      idle(people, t);
      eagle.position.set(Math.cos(t * 0.11) * 60, 58 + Math.sin(t * 0.3) * 4, -20 + Math.sin(t * 0.11) * 60); eagle.rotation.y = -t * 0.11; eagle.rotation.z = 0.25;
      if (lights[0]) lights[0].intensity = 60 + Math.sin(t * 9) * 6 + Math.sin(t * 5.3) * 5;
      ft -= dt;
      if (ft <= 0) {
        ft = 0.06; const G = g.gfx;
        for (const f of fires) { G.glow.spawn(f[0] + (Math.random() - 0.5) * 0.6, f[1], f[2] + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.5, 1.4 + Math.random() * 1.6, (Math.random() - 0.5) * 0.5, { life: 0.7 + Math.random() * 0.5, s0: 0.45, s1: 0.04, r: 3, g: 1.1, b: 0.25, a: 0.9 });
          if (Math.random() < 0.4) G.soft.spawn(f[0], f[1] + 0.9, f[2], 1.0, 1.7, 0.3, { life: 5, s0: 0.6, s1: 3.6, r: 0.22, g: 0.2, b: 0.2, a: 0.3, drag: 0.12 }); }
      }
    },
  };
}

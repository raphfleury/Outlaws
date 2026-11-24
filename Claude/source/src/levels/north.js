// Chapter V - a Norwegian fjord in winter, under the northern lights.
import * as THREE from 'three';
import { Heightfield, prismGeo, rockGeo } from '../build.js';
import { makeAmbient, makeWater, windify } from '../gfx.js';
import { instanced, room, steps, pineGeo, drakkar, crate, brazier, barrel, gBox, gCyl, gCone, gSph, xf, merge, stand, den, table, bench, bed, chest, pots, sacks, rug, hearth, woodpile, deck, boulder, ladder, rod, beast, horseGeo, person, idle, animal } from '../props.js';
import { fbm, ridged, smooth } from '../util.js';

export const north = {
  id: 'north', theme: 'theme-north', chapter: 'Chapter V', title: 'Jarnvik', place: 'Jarnvik · Norway · winter of 985',
  story: 'You sail home through the ice and find another jarl\'s shields hanging on your hall. His raiders hold the village and the gate. Land under the northern lights, fight through the snow, and take back the high seat.',
  weapon: 'axe', weaponName: 'Throwing axes & flail', alt: 'right mouse — flail',
  heroes: [
    { look: 'erik', name: 'Erik the Red', who: 'Outlaw and founder of Greenland', trait: 'Hot temper', effect: 'throws axes much faster', mods: { fire: 0.6 }, sleeve: 0x3a5a3a, cuff: 0x5a4632 },
    { look: 'leif', name: 'Leif Erikson', who: 'Leif the Lucky, who sailed to Vinland', trait: 'The Lucky', effect: 'takes 30% less damage', mods: { armor: 0.7 }, sleeve: 0x9a9fa6, cuff: 0x1c4a8a },
    { look: 'ragnar', name: 'Ragnar Lothbrok', who: 'Legendary sea-king and raider', trait: 'Raider', effect: 'faster, harder blows with the flail', mods: { melee: 0.75, meleeDmg: 1.7, reach: 0.4 }, sleeve: 0x4a3a2a, cuff: 0x3a3028 },
  ],
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> throw an axe &nbsp; <kbd>Right mouse</kbd> aim (the line shows where it lands) &nbsp; <kbd>F</kbd> swing the flail',
  foes: 'raiders remain', foesNone: 'The hall is yours', bossName: 'Jarl Hrafn the Grey', bossDown: 'The grey jarl has fallen', pickupText: 'Mead  +35',
  deadTitle: 'Valhalla', deadSub: 'The valkyries lift you from the snow.', clearTitle: 'The high seat is yours',
  build,
};

const TIMBER = 0x6a4a30, DARKT = 0x4a3220, SNOW = 0xe9f1fa;

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
  const R = rand;
  const PATH = [[2, 58], [0, 40], [-4, 22], [0, 2], [0, -24], [0, -40]];
  const SKERRIES = [[-55, 150, 26, 9], [75, 190, 34, 14], [15, 270, 30, 11], [-120, 240, 24, 8]];
  // ---- terrain: snowfield sloping to the fjord, mountains on three sides ---------------
  const hf = new Heightfield(1200, 380, (x, z) => {
    let base = 3.2 + (30 - z) * 0.045 + (fbm(x * 0.025, z * 0.025, 4, 12) - 0.5) * 3.2 * (1 - (1 - smooth(2, 8, dPoly(PATH, x, z))) * 0.8);
    base += 5 * (1 - smooth(20, 40, Math.hypot(x, z + 52)));                               // rise of the jarl's hall
    const sea = smooth(56, 86, z);
    base = base * (1 - sea) - 7.5 * sea;
    const r = Math.hypot(x * 0.95, z > 0 ? z * 0.34 : z * 0.9);
    const m = smooth(116, 332, r);
    let h = base + m * (34 + ridged(x * 0.0044 + 11, z * 0.0044 + 2, 5, 9) * 330) + smooth(104, 164, r) * 15 * fbm(x * 0.02 + 3, z * 0.02, 3, 4);
    for (const [ix, iz, rr, ht] of SKERRIES) h = Math.max(h, -7.5 + (ht + 7.5) * (1 - smooth(rr * 0.25, rr, Math.hypot(x - ix, z - iz))));
    return h;
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -114, x1: 114, z0: -96, z1: 92 };            // far enough out for the moored ships; open water stops a walker by itself
  world.maxSlope = 0.95; world.waterY = -0.8;
  const cSnow = new THREE.Color(SNOW), cSnow2 = new THREE.Color(0xcfdcec), cRock = new THREE.Color(0x4a505a), cRock2 = new THREE.Color(0x6a707a), cShore = new THREE.Color(0x565c66),
    cPath = new THREE.Color(0xb9c4d2), cBed = new THREE.Color(0x0c1c2c), tmp = new THREE.Color(), tmp2 = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h, ny) => {
    if (h < -0.2) return tmp.copy(cShore).lerp(cBed, smooth(-0.2, -3, h));
    const n = fbm(x * 0.04, z * 0.04, 3, 6);
    tmp.copy(cSnow).lerp(cSnow2, n);
    tmp.lerp(cPath, (1 - smooth(0.8, 2.6, dPoly(PATH, x, z))) * 0.7);
    tmp.lerp(cShore, 1 - smooth(0.2, 1.3, h));
    tmp.lerp(tmp2.copy(cRock).lerp(cRock2, n), 1 - smooth(0.6, 0.8, ny));
    return tmp;
  }));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), makeWater(shared, { deep: 0x06141f, scale: 0.4, flow: [0.06, 0.1], alpha: 0.86 }));
  sea.rotation.x = -Math.PI / 2; root.add(sea);
  for (let i = 0; i < 46; i++) {                                                             // ice floes
    const x = (R() - 0.5) * 260, z = 68 + R() * 150, s = 1.5 + R() * R() * 7;
    if (world.height(x, z) > -1) continue;
    B.cyl(M.flat, s, s * 0.94, 0.22, x, -0.08, z, { c: R.pick([0xdfeaf6, 0xc9d8ea, 0xeef4fb]), seg: 5 + Math.floor(R() * 3), ry: R() * 3 });
  }

  // ---- buildings --------------------------------------------------------------------------
  const lights = [], fires = [], smokes = [];
  const torch = (x, y, z, i = 26, d = 15) => { const l = new THREE.PointLight(0xff9a48, i, d, 1.7); l.position.set(x, y, z); root.add(l); lights.push({ l, i, ph: R() * 9 }); };
  const frame = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
  /**
   * Timber longhouse with a steep snow-laden roof; long axis = local Z, door on the +X side. o: { wall, roof, doors (the great hall: its own doors,
   * furnished separately), more: [further doors], open: [[side, k]] (real window openings at k * length along that side; none = lit panes),
   * east (false = no bench on the east side) }. A door with st gets that many steps down outside. Returns { P, y, f (the floor) }.
   */
  const longhouse = (x, z, ry, l = 15, w = 6.2, o = {}) => {
    const d = l, P = frame(x, z, ry), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, y = yf - 0.3, wall = o.wall ?? 2.1, rh = o.roof ?? 3.4, f = yf + 0.06;
    const doors = o.doors ?? [{ side: 'e', at: -l * 0.18, w: 1.7, h: 1.95, st: 6 }, ...(o.more || [])];
    room(B, M, x, yf, z, { w, d: l, h: wall, t: 0.32, ry, mat: M.woodH, c: TIMBER, base: 2.6, doors, wins: (o.open || []).map(([side, k]) => ({ side, at: l * k, w: 0.8, y: 1.0, h: 0.72 })),
      floor: { mat: M.ground, c: 0x6a5a48 }, ceil: { mat: M.woodH, c: DARKT } });
    for (const q of doors) {                                             // steps down from each door, and the door itself, standing open
      if (!q.st) continue;
      const [ox, oz, turn] = { e: [1, 0, Math.PI / 2], w: [-1, 0, -Math.PI / 2], s: [0, 1, 0], n: [0, -1, Math.PI] }[q.side], lx = ox ? ox * w / 2 : q.at, lz = oz ? oz * l / 2 : q.at;
      steps(B, M, ...P(lx, lz), ry + turn, f, q.st, { w: q.w + 0.3, c: 0x7a808a });
      const [dx, dz] = P(lx + ox * 0.6 - (oz ? q.w / 2 + 0.05 : 0), lz + oz * 0.6 - (ox ? q.w / 2 + 0.05 : 0)); B.box(M.woodH, ox ? 1.1 : 0.1, 1.9, ox ? 0.1 : 1.1, dx, yf, dz, { ry, c: 0x2a1c12 });
    }
    { const [hx, hz] = P(0, l * 0.1); B.box(M.stone, 0.9, 0.3, 2.6, hx, f, hz, { ry, c: 0x5a5f68, solid: true }); B.geo(M.glow, new THREE.ConeGeometry(0.28, 0.7, 6), [hx, f + 0.65, hz], [0, 0, 0], 1, 0xff7a20);
      if (!o.doors) {                                                    // the great hall is furnished separately
      const [wx, wz] = P(-(w / 2 - 0.72), 0); B.box(M.woodH, 0.7, 0.42, l * 0.62, wx, f, wz, { ry, c: 0x5a4028, solid: true }); B.box(M.cloth, 0.66, 0.06, l * 0.3, wx, f + 0.42, wz, { ry, c: 0x8a7458 });
      if (o.east !== false) { const [ex, ez] = P(w / 2 - 0.72, l * 0.23); B.box(M.woodH, 0.7, 0.42, l * 0.36, ex, f, ez, { ry, c: 0x5a4028, solid: true }); }
      for (let i = 0; i < 3; i++) { const [sx, sz] = P(-(w / 2 - 0.36), -l * 0.3 + i * l * 0.3); B.geo(M.flat, new THREE.CylinderGeometry(0.36, 0.36, 0.05, 12), [sx, f + 1.35, sz], [0, ry, Math.PI / 2], 1, [0x8a1c1c, 0xc8a030, 0x1c4a7a][i]); } } }
    B.geo(M.shingle, prismGeo(w + 1.6, rh, l + 1.2, 3), [x, y + wall + 0.3, z], [0, ry, 0], 1, SNOW);
    for (const e of [-1, 1]) {
      const [gx, gz] = P(0, e * (l / 2 + 0.02)); B.geo(M.woodH, prismGeo(w, rh - 0.4, 0.3, 2), [gx, y + wall + 0.3, gz], [0, ry, 0], 1, DARKT);
      for (const k of [-1, 1]) { const [cx, cz] = P(k * 0.55, e * (l / 2 + 0.55)); B.box(M.wood, 0.16, 2.6, 0.16, cx, y + wall + rh - 0.9, cz, { ry, rz: k * -0.5, c: DARKT }); }   // crossed gable boards
    }
    if (!o.open) for (const zz of [0.12, 0.34]) { const [wx, wz] = P(w / 2 + 0.03, l * zz); B.geo(M.window, new THREE.BoxGeometry(0.07, 0.5, 0.7), [wx, y + 1.55, wz], [0, ry, 0]); }
    for (let i = 0; i < 3; i++) { const [sx, sz] = P(w / 2 + 0.06, -l * 0.42 + i * 0.95); B.geo(M.flat, new THREE.CylinderGeometry(0.36, 0.36, 0.05, 12), [sx, y + 1.45, sz], [0, ry, Math.PI / 2], 1, R.pick([0x8a1c1c, 0x1c4a7a, 0xc8a030, 0x2a5a2a])); }
    const [fx, fz] = P(0, l * 0.1); smokes.push([fx, y + wall + rh + 0.4, fz]);
    return { P, y, f };
  };
  // The people of Jarnvik take no part in the fight: they are kept in a list so that they breathe and look about.
  const people = [], extraFoes = [], extraPicks = [];
  const who = (look, x, y, z, yaw, o) => { const p = person(B, M, root, look, x, y, z, yaw, o); people.push(p); return p; };
  const hold = (p, arm, parts) => { const m = new THREE.Mesh(merge(parts), p.mat); m.castShadow = true; arm.add(m); };          // something carried in a hand
  const basket = (x, y, z, c) => { B.cyl(M.thatch, 0.3, 0.24, 0.32, x, y, z, { c: 0xa8905a, seg: 10, solid: true }); B.geo(M.flat, new THREE.SphereGeometry(0.27, 8, 6), [x, y + 0.31, z], [0, 0, 0], [1, 0.5, 1], c); };
  const cauldron = (x, yb, z, yTop) => { B.cyl(M.flat, 0.3, 0.19, 0.3, x, yb, z, { c: 0x3a3a42, seg: 10 }); B.cyl(M.flat, 0.33, 0.33, 0.04, x, yb + 0.28, z, { c: 0x55555e, seg: 10 });
    B.box(M.flat, 0.03, yTop - yb - 0.3, 0.03, x, yb + 0.3, z, { c: 0x3a3a42 }); world.addCyl(x, z, 0.3, yb - 0.5, yb + 0.4); };
  const palisade = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.46);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t + (R() - 0.5) * 0.08, z = z0 + (z1 - z0) * t + (R() - 0.5) * 0.08, y = world.height(x, z), h = 3.1 + R() * 0.5;
      B.cyl(M.wood, 0.21, 0.23, h, x, y - 0.3, z, { c: R.pick([0x6a4c30, 0x5a4028, 0x76583a]), seg: 6 }); B.geo(M.flat, new THREE.ConeGeometry(0.23, 0.5, 6), [x, y + h - 0.05, z], [0, 0, 0], 1, SNOW); }
    world.addBox((x0 + x1) / 2, (z0 + z1) / 2, len, 0.55, Math.atan2(-(z1 - z0), x1 - x0), -5, world.height((x0 + x1) / 2, (z0 + z1) / 2) + 3.2);
  };
  const runestone = (x, z, s = 1) => {
    const y = world.height(x, z);
    B.geo(M.rock, rockGeo(7, 1), [x, y + 1.2 * s, z], [0, R() * 3, 0.06], [0.75 * s, 2.2 * s, 0.32 * s], 0x6a707a);
    for (let i = 0; i < 7; i++) B.box(M.glow, 0.05, 0.2 + (i % 3) * 0.08, 0.02, x - 0.3 * s + (i % 4) * 0.2 * s, y + (0.9 + Math.floor(i / 4) * 0.7) * s, z + 0.33 * s, { rz: (i % 2 ? 0.5 : -0.4), c: 0x3ad8ff });
    world.addCyl(x, z, 0.6 * s, y - 1, y + 2.4 * s);
  };

  // village
  const BOTH = [['e', 0.12], ['e', 0.34], ['w', -0.15], ['w', 0.15]], HALF = Math.PI / 2;
  { // a dwelling with a second door in the gable toward the shore: a way through to the bonfire. A bed, a chest, jars, a fur on the floor
    const ry = 0.25, { P, f } = longhouse(-19, 30, ry, 15, 6.2, { open: BOTH, more: [{ side: 's', at: 0, w: 1.6, h: 1.95, st: 6 }] });
    { const [a, b] = P(2.25, -5.6); bed(B, M, a, f, b, ry, { blanket: 0x6a5038, pillow: 0xd8ccb0, head: 0 }); } { const [a, b] = P(-0.5, -6.8); chest(B, M, a, f, b, ry); }
    { const [a, b] = P(-2.0, -6.3); pots(B, M, a, f, b, { n: 3, s: 1.1 }); } { const [a, b] = P(1.0, -3.9); rug(B, M, a, f, b, ry, { w: 1.3, d: 1.9, c: 0x8a7458, border: 0x5a4632 }); }
    { const [a, b] = P(2.3, 9.2); who('norseWoman', a, world.height(a, b), b, ry, { pose: (g) => { g.armR.rotation.x = -2.1; g.armR.rotation.z = 0.45; } }); }                                 // she stands beside the gable door and looks out to sea
  }
  { // the cook house, with a second door toward the bonfire: a cauldron on its chain over the fire, a table with bowls, a quern, jars and sacks of grain
    const ry = -0.3, { P, f } = longhouse(18, 27, ry, 14, 6.2, { open: BOTH, more: [{ side: 'w', at: 5.6, w: 1.6, h: 1.95, st: 6 }] });
    { const [a, b] = P(0, 0.55); cauldron(a, f + 0.85, b, f + 2.04); B.geo(M.glow, new THREE.ConeGeometry(0.2, 0.45, 6), [a, f + 0.52, b], [0, 0, 0], 1, 0xff7a20); }
    { const [a, b] = P(0, -0.45), p = who('norseWoman', a, f, b, ry, { pose: 'work', over: { hair: 0xd8b860 } }); hold(p, p.armR, [gCyl(0.014, 0.014, 0.55, 0x8a6a44, [0, -0.82, 0.05], [0.3, 0, 0], 1, 5)]); }   // she stirs the pot
    { const [a, b] = P(0, -5.95), top = table(B, M, a, f, b, ry, { w: 1.8, d: 0.8 }); for (let i = 0; i < 4; i++) { const [c, e] = P(-0.65 + i * 0.42, -5.95 + (i % 2) * 0.2 - 0.1); B.cyl(M.flat, 0.1, 0.06, 0.06, c, top, e, { c: 0x8a6a44, seg: 8 }); }
      const [c, e] = P(0.72, -5.9); B.geo(M.flat, new THREE.SphereGeometry(0.14, 8, 6), [c, top + 0.06, e], [0, 0, 0], [1, 0.55, 1], 0xb8904a); }
    { const [a, b] = P(0, -5.05); bench(B, M, a, f, b, ry, { w: 0.4 }); } { const [a, b] = P(2.2, -5.95); pots(B, M, a, f, b, { n: 3, s: 1.1 }); } { const [a, b] = P(2.0, -4.35); sacks(B, M, a, f, b, ry + HALF, { w: 1.2 }); }
    { const [a, b] = P(-2.25, -5.5); B.cyl(M.stone, 0.28, 0.3, 0.14, a, f, b, { c: 0x7a7a76, seg: 12, solid: true }); B.cyl(M.stone, 0.26, 0.26, 0.1, a, f + 0.14, b, { c: 0x8a8a84, seg: 12 }); B.box(M.wood, 0.04, 0.16, 0.04, a + 0.15, f + 0.24, b, { c: DARKT }); }
  }
  { // the weaver's house: an upright loom with its stone weights against the east wall, baskets of wool, fur beds at both ends
    const ry = 1.35, { P, f } = longhouse(-27, 9, ry, 12, 5.6, { east: false }), lz = 2.76, [lx0, lz0] = P(2.26, lz);
    for (const e of [-1, 1]) { const [a, b] = P(2.26, lz + e * 0.85); B.box(M.wood, 0.09, 1.95, 0.09, a, f, b, { ry, c: DARKT }); }
    B.box(M.wood, 0.1, 0.1, 1.9, lx0, f + 1.8, lz0, { ry, c: DARKT });
    { const [a, b] = P(2.16, lz); B.box(M.wood, 0.05, 0.05, 1.7, a, f + 0.95, b, { ry, c: 0x8a6a44 }); }
    { const [a, b] = P(2.22, lz); B.box(M.cloth, 0.03, 0.55, 1.4, a, f + 1.24, b, { ry, c: 0xd8ccb0 }); B.box(M.cloth, 0.036, 0.07, 1.4, a, f + 1.36, b, { ry, c: 0x8a1c1c }); B.box(M.cloth, 0.036, 0.04, 1.4, a, f + 1.5, b, { ry, c: 0x1c4a7a }); }
    for (let i = 0; i < 10; i++) { const [a, b] = P(2.2, lz - 0.66 + i * 0.147); B.box(M.cloth, 0.012, 1.0, 0.012, a, f + 0.26, b, { c: 0xe6e0d0 }); B.geo(M.rock, rockGeo(i, 0), [a, f + 0.2, b], [0, i, 0], 0.07, 0x8a8478); }
    world.addBox(lx0, lz0, 0.45, 1.9, ry, f, f + 1.95);
    { const [a, b] = P(1.5, lz); who('norseWoman', a, f, b, ry + HALF, { pose: (g) => { g.armR.rotation.x = -1.75; g.armL.rotation.x = -1.3; } }); }                                // the weaver at her loom
    { const [a, b] = P(2.1, 0.35); basket(a, f, b, 0xe6e0d0); } { const [a, b] = P(2.05, -0.45); basket(a, f, b, 0x7a7a76); }
    for (const e of [-1, 1]) { const [a, b] = P(0.9, e * 5.15); bed(B, M, a, f, b, ry + HALF, { blanket: e < 0 ? 0x6a5038 : 0x7a7a76, pillow: 0xd8ccb0, head: 0 }); }
    { const [a, b] = P(-1.6, 5.3); chest(B, M, a, f, b, ry); } { const [a, b] = P(0.9, -3.7); rug(B, M, a, f, b, ry, { w: 1.6, d: 1.1, c: 0x8a7458, border: 0x5a4632 }); }
  }
  { // the mead store: casks on a rack, standing barrels, a table with a jug and drinking horns, a chest
    const ry = 1.75, { P, f } = longhouse(27, 7, ry, 12, 5.6, { east: false });
    { const [a, b] = P(1.85, 2.9); B.box(M.woodH, 1.0, 0.25, 3.2, a, f, b, { ry, c: DARKT }); world.addBox(a, b, 1.1, 3.2, ry, f, f + 1.1); }
    for (let i = 0; i < 3; i++) { const [a, b] = P(1.85, 1.9 + i); B.geo(M.wood, new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), [a, f + 0.67, b], [0, ry, HALF], 1, 0x8a623a);
      for (const e of [-0.3, 0.3]) { const [c, d2] = P(1.85 + e, 1.9 + i); B.geo(M.metal, new THREE.CylinderGeometry(0.43, 0.43, 0.05, 12, 1, true), [c, f + 0.67, d2], [0, ry, HALF], 1, 0x3a3a3e); }
      const [c, d2] = P(1.32, 1.9 + i); B.box(M.wood, 0.1, 0.04, 0.04, c, f + 0.42, d2, { ry, c: DARKT }); }
    for (const [lx, lz] of [[1.7, 5.1], [0.8, 5.2], [-1.2, 5.25]]) { const [a, b] = P(lx, lz); barrel(B, M, a, f, b); }
    { const [a, b] = P(0.3, -5.0), top = table(B, M, a, f, b, ry, { w: 1.6, d: 0.8 }); for (let i = 0; i < 4; i++) { const [c, e] = P(-0.3 + i * 0.3, -5.0 + (i % 2) * 0.24 - 0.12); B.geo(M.flat, new THREE.ConeGeometry(0.04, 0.24, 6), [c, top + 0.045, e], [0, i * 1.3, HALF - 0.3], 1, 0xe8dcc0); }
      const [c, e] = P(0.85, -5.0); B.cyl(M.flat, 0.08, 0.11, 0.26, c, top, e, { c: 0xb0683c, seg: 9 }); }
    { const [a, b] = P(-1.3, -5.3); chest(B, M, a, f, b, ry); }
    { const [a, b] = P(0.95, 2.4), p = who('norseWoman', a, f, b, ry + HALF, { pose: (g) => { g.armR.rotation.x = -1.0; g.armL.rotation.z = 0.2; } }); hold(p, p.armL, [gCyl(0.07, 0.1, 0.24, 0xb0683c, [0, -0.78, 0], [0, 0, 0], 1, 8)]); }   // she draws mead into a jug
  }
  { // the fisherman's house: barrels of salted fish, a net on the wall, dried cod on a pole, oars, a basket of the day's catch
    const ry = 0.1, { P, f } = longhouse(40, 38, ry, 10, 5.2);
    for (const [lx, lz] of [[-1.4, -4.1], [-0.55, -4.2], [1.5, -4.05]]) { const [a, b] = P(lx, lz); barrel(B, M, a, f, b, 0x7a5a3a); }
    { const [a, b] = P(0.3, -4.63); B.box(M.cloth, 2.8, 1.2, 0.02, a, f + 0.65, b, { ry, c: 0x6a6048 }); for (let i = 0; i < 7; i++) { const [c, e] = P(-1.0 + i * 0.43, -4.61); B.box(M.cloth, 0.02, 1.2, 0.02, c, f + 0.65, e, { ry, c: 0x3a3628 }); B.geo(M.flat, new THREE.SphereGeometry(0.05, 6, 5), [c, f + 1.86, e], [0, 0, 0], 1, 0x8a5a3a); }
      for (let i = 0; i < 3; i++) B.box(M.cloth, 2.8, 0.02, 0.025, a, f + 0.9 + i * 0.33, b, { ry, c: 0x3a3628 }); }
    { const [a, b] = P(-1.6, 4.35), [c, e] = P(1.6, 4.35); rod(B, M.wood, [a, f + 1.9, b], [c, f + 1.9, e], 0.03, 0x6a4a2e); for (let i = 0; i < 9; i++) { const [gx, gz] = P(-1.4 + i * 0.35, 4.35); B.box(M.flat, 0.1, 0.45, 0.03, gx, f + 1.43, gz, { ry, rz: (i % 2) * 0.1, c: 0xb8b0a0 }); } }
    for (const k of [0, 1]) { const [a, b] = P(2.1, -4.45 + k * 0.18); B.box(M.wood, 0.05, 1.95, 0.1, a, f, b, { ry, rz: 0.06, c: 0x8a6a44 }); }
    { const [a, b] = P(1.5, -3.2); basket(a, f, b, 0xb0b4b8); }
  }
  longhouse(-78, 20, 0.5, 11, 5.4);                                                          // the outlying farm in the west
  { const pen = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 2), ry = Math.atan2(-(bz - az), bx - ax);
      for (let i = 0; i <= n; i++) { const px = ax + (bx - ax) * i / n, pz = az + (bz - az) * i / n; B.box(M.wood, 0.16, 1.4, 0.16, px, world.height(px, pz) - 0.2, pz, { c: DARKT }); }
      const my = world.height((ax + bx) / 2, (az + bz) / 2); for (const hh of [0.5, 0.95]) B.box(M.woodH, L, 0.1, 0.08, (ax + bx) / 2, my + hh, (az + bz) / 2, { ry, c: DARKT }); world.addBox((ax + bx) / 2, (az + bz) / 2, L, 0.25, ry, my - 2, my + 1.2); };
    pen(-92, 26, -84, 34); pen(-84, 34, -72, 32); pen(-92, 26, -90, 16);
    for (const [hx, hz] of [[-86, 28], [-82, 30]]) { const y = world.height(hx, hz); B.geo(M.thatch, new THREE.ConeGeometry(1.4, 2.2, 8), [hx, y + 1.0, hz], [0, 0, 0], 1, 0xd8d2b8); world.addCyl(hx, hz, 1.1, y - 1, y + 2); }
    barrel(B, M, -73, world.height(-73, 24.5), 24.5); barrel(B, M, -72.2, world.height(-72.2, 25.3), 25.3); }
  // The bleached skull of a horned beast, as offered to the old gods. (x, y, z) = its middle, ry = the way it looks, k = size.
  const skull = (x, y, z, ry, k = 1) => {
    const BONE = 0xe6dcc4, DK = 0x1c1814, sn = Math.sin(ry), cs = Math.cos(ry), at = (lx, ly, lz) => [x + (lx * cs + lz * sn) * k, y + ly * k, z + (-lx * sn + lz * cs) * k];
    B.geo(M.flat, new THREE.SphereGeometry(0.2, 8, 6), at(0, 0, 0), [0, ry, 0], [k, 0.85 * k, 1.2 * k], BONE);                                  // the brain case
    B.geo(M.flat, new THREE.BoxGeometry(0.2, 0.15, 0.36), at(0, -0.06, 0.3), [0.18, ry, 0], k, BONE);                                            // the long muzzle,
    B.geo(M.flat, new THREE.BoxGeometry(0.13, 0.1, 0.16), at(0, -0.12, 0.52), [0.25, ry, 0], k, 0xd8ccb0);                                       // narrowing to the nose
    for (const e of [-1, 1]) {
      B.geo(M.flat, new THREE.BoxGeometry(0.06, 0.08, 0.09), at(e * 0.105, 0.0, 0.14), [0, ry, 0], k, DK);                                       // eye sockets
      B.geo(M.flat, new THREE.ConeGeometry(0.05, 0.3, 6), at(e * 0.3, 0.1, -0.02), [0, ry, -e * 1.25], k, 0xd8ccb0);                             // the horns go out,
      B.geo(M.flat, new THREE.ConeGeometry(0.035, 0.26, 6), at(e * 0.5, 0.26, -0.02), [0, ry, -e * 0.35], k, 0xc8bc9c);                          // then up
    }
  };
  { // the hof: a small temple of the old gods in the eastern wood
    const x = 76, z = -24, w = 7, d = 7, P = frame(x, z, 0), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h: 3.2, t: 0.34, mat: M.woodH, c: DARKT, base: 2.6, doors: [{ side: 'w', at: 0, w: 1.8, h: 2.3 }], floor: { mat: M.ground, c: 0x5a4c3e }, ceil: { mat: M.woodH, c: DARKT } });
    steps(B, M, x - w / 2, z, -Math.PI / 2, f, 6, { w: 2.2, c: 0x7a808a });
    B.geo(M.shingle, prismGeo(w + 1.6, 4.6, d + 1.4, 3), [x, yf + 3.2, z], [0, Math.PI / 2, 0], 1, SNOW);
    for (const e of [-1, 1]) { B.geo(M.woodH, prismGeo(d, 4.0, 0.3, 2), [x + e * (w / 2 + 0.02), yf + 3.2, z], [0, Math.PI / 2, 0], 1, DARKT); B.box(M.flat, 0.25, 0.5, 0.9, x + e * (w / 2 + 0.5), yf + 7.6, z, { ry: Math.PI / 2, rx: 0.5 * e, c: 0xc9a030 }); }
    B.cyl(M.wood, 0.34, 0.42, 2.5, x + 2.2, f, z, { c: 0x4a3626, seg: 8, solid: true }); B.geo(M.wood, new THREE.SphereGeometry(0.42, 8, 6), [x + 2.2, f + 2.6, z], [0, 0, 0], [1, 1.1, 1], 0x4a3626);
    for (const s of [-1, 1]) B.box(M.glow, 0.05, 0.07, 0.12, x + 1.8, f + 2.68, z + s * 0.16, { c: 0x3ad8ff });
    B.geo(M.metal, new THREE.TorusGeometry(0.3, 0.04, 6, 14), [x + 1.4, f + 1.0, z], [Math.PI / 2, 0, 0], 1, 0xd9b23a); B.box(M.stone, 0.9, 0.9, 0.9, x + 1.4, f, z, { c: 0x5a5f68, solid: true });
    for (const s of [-1, 1]) { fires.push(brazier(B, M, x - w / 2 - 1.6, world.height(x - w / 2 - 1.6, z + s * 2.2), z + s * 2.2, 1.0).concat(1)); }
    runestone(x - 8, z + 6, 1.1); runestone(x - 7, z - 7, 0.9);
    skull(x - w / 2 - 0.28, f + 2.75, z, -Math.PI / 2, 1.5);                                                                                     // over the door
    for (const [dx, dz] of [[-3.2, 2.0], [-3.2, -2.0], [-6.2, 2.9], [-6.2, -2.9]]) {                                                             // on stakes beside the way in
      const px = x - w / 2 + dx, pz = z + dz, py = world.height(px, pz);
      B.cyl(M.wood, 0.045, 0.06, 1.9, px, py - 0.2, pz, { c: DARKT, seg: 6 }); skull(px, py + 1.78, pz, -Math.PI / 2 + dz * 0.12, 0.95); world.addCyl(px, pz, 0.12, py - 1, py + 1.9);
    }
    skull(x + 1.35, f + 1.08, z, -Math.PI / 2, 0.8);                                                                                             // an offering on the stone before the idol
    who('norseMan', x - 0.2, f, z + 1.7, Math.atan2(2.4, -1.7), { pose: 'cheer', over: { shirt: 0xd8d0c0, cape: 0xe8e4dc, extras: ['smock', 'cape'], hair: 0x9a9a92, face: ['longhair', 'longbeard'] } });   // the gothi, calling on the old gods
  }
  { // bonfire in the middle of the village
    const x = 0, z = 22, y = world.height(x, z);
    for (let i = 0; i < 7; i++) B.cyl(M.wood, 0.12, 0.14, 1.6, x, y + 0.1, z, { rz: 1.15, ry: i * 0.9, c: 0x2a1a10, seg: 5 });
    for (let i = 0; i < 10; i++) B.geo(M.rock, rockGeo(i, 0), [x + Math.cos(i * 0.63) * 1.15, y + 0.1, z + Math.sin(i * 0.63) * 1.15], [0, i, 0], 0.26, 0x6a707a);
    B.geo(M.glow, new THREE.ConeGeometry(0.5, 1.3, 7), [x, y + 0.9, z], [0, 0, 0], 1, 0xff7a20);
    fires.push([x, y + 1.0, z, 2.2]); torch(x, y + 1.6, z, 60, 22); world.addCyl(x, z, 1.1, y - 1, y + 1.4);
  }
  for (const [x, z] of [[-9, 34], [10, 14], [-12, 16]]) {                                  // fish-drying racks
    const y = world.height(x, z); for (const s of [-1, 1]) B.box(M.wood, 0.12, 2.2, 0.12, x + s * 1.3, y - 0.1, z, { c: DARKT }); B.box(M.wood, 2.8, 0.1, 0.1, x, y + 2.0, z, { c: DARKT });
    for (let i = 0; i < 6; i++) B.box(M.flat, 0.12, 0.5, 0.04, x - 1 + i * 0.4, y + 1.48, z, { c: 0xb8b0a0, rz: (i % 2) * 0.1 });
    world.addBox(x, z, 2.8, 0.3, 0, y - 1, y + 2.1);
  }
  barrel(B, M, -14.6, world.height(-14.6, 25), 25); barrel(B, M, 21.5, world.height(21.5, 20), 20); barrel(B, M, 22.3, world.height(22.3, 20.6), 20.6);
  // palisade with a gate, torches on the gateposts
  palisade(-36, -3, -3.6, -3); palisade(3.6, -3, 36, -3); palisade(-36, -3, -38.43, -29.15); palisade(-38.59, -30.85, -40, -46); palisade(36, -3, 40, -46);
  { // a wolf hole dug under the west side of the palisade: crouch through it into the yard (nobody else gets in that way)
    const x = -38.51, z = -30, y = Math.max(world.height(x - 0.6, z), world.height(x + 0.6, z));
    world.addBox(x, z, 1.8, 0.55, Math.atan2(43, -4), y + 1.25, y + 3.3);
    rod(B, M.wood, [-38.41, y + 1.4, -28.95], [-38.61, y + 1.4, -31.05], 0.14, 0x5a4028);
    for (let i = 0; i < 4; i++) { const px = -38.45 - i * 0.04, pz = -29.4 - i * 0.42; B.cyl(M.wood, 0.21, 0.23, 1.7 + (i % 2) * 0.3, px, y + 1.5, pz, { c: [0x6a4c30, 0x5a4028, 0x76583a][i % 3], seg: 6 }); B.geo(M.flat, new THREE.ConeGeometry(0.23, 0.5, 6), [px, y + 3.45 + (i % 2) * 0.3, pz], [0, 0, 0], 1, SNOW); }
    for (const s of [-1, 1]) { B.geo(M.ground, new THREE.SphereGeometry(1, 8, 6), [x + s * 1.5, world.height(x + s * 1.5, z + s * 1.3) - 0.1, z + s * 1.3], [0, 0, 0], [0.9, 0.42, 0.7], 0x8a8478); B.geo(M.ground, new THREE.CylinderGeometry(1.0, 1.0, 0.05, 10), [x + s * 0.5, world.height(x + s * 0.5, z) + 0.01, z], [0, 0, 0], 1, 0x7a746a); }
  }
  { // two of your kin, bound back to back at a post in the yard, unhurt
    const x = -30, z = -20, y = world.height(x, z);
    B.cyl(M.wood, 0.16, 0.18, 2.4, x, y - 0.2, z, { c: DARKT, seg: 8 }); world.addCyl(x, z, 0.18, y - 1, y + 2.2);
    who('norseMan', x + 0.46, y, z, HALF, { pose: 'sit', arms: [0.75, 0.75] }); who('norseWoman', x - 0.46, y, z, -HALF, { pose: 'sit', arms: [0.75, 0.75] });
    for (const yy of [0.5, 0.62]) B.geo(M.flat, new THREE.TorusGeometry(0.66, 0.022, 5, 18), [x, y + yy, z], [HALF, 0, 0], [1, 0.62, 1], 0xb8a070);
  }
  for (const s of [-1, 1]) { // a fighting step behind the palisade on either side of the gate: stairs up from the yard, a ladder at the far end, room to crouch under it
    const x = s * 11, z = -4.25, y = Math.max(world.height(x - 5, z), world.height(x, z), world.height(x + 5, z));
    deck(B, M, x, y, z, Math.PI, { w: 11, d: 1.6, h: 2.2, c: 0x6a4c30, post: DARKT, steps: 's', at: s * 3, stepW: 1.5 });
    world.addBox(x, z, 11, 1.6, 0, y + 1.3, y + 2.04); for (const e of [-1, 1]) B.box(M.woodH, 11, 0.12, 0.1, x, y + 1.3, z + e * 0.68, { c: DARKT });
    ladder(B, M, s * 16.5, z, s, 0, world.height(s * 17, z), y + 2.2, { c: 0x5a4028 });
    extraFoes.push(['bowman', s * 10, z, { up: 2.6, patrol: false }]);
  }
  for (const s of [-1, 1]) { const y = world.height(s * 4.2, -3); B.box(M.wood, 0.5, 4.6, 0.5, s * 4.2, y - 0.3, -3, { c: DARKT, solid: true }); fires.push(brazier(B, M, s * 5.6, y, 0.2, 1.1).concat(1)); }
  B.box(M.woodH, 9.4, 0.5, 0.6, 0, world.height(0, -3) + 4.2, -3, { c: DARKT });
  torch(0, world.height(0, 0) + 2.4, 0.6, 46, 18);
  // the jarl's great hall
  {
    const x = 0, z = -56, h = longhouse(x, z, Math.PI / 2, 27, 9.5, { wall: 2.9, roof: 5.2, open: [['e', 0.12], ['e', 0.34]], doors: [{ side: 'w', at: 0, w: 3.2, h: 2.8 }, { side: 'e', at: 11.5, w: 1.6, h: 2.1, st: 6 }] }), y = h.y, f = h.f;   // a back door in the south wall, behind the benches
    for (const e of [-1, 1]) { B.box(M.wood, 0.4, 5.5, 0.4, e * 2.2, y, z + 5.1, { c: DARKT }); B.box(M.flat, 0.3, 0.5, 0.8, e * 2.2, y + 5.5, z + 5.3, { rx: 0.4, c: 0xc9a030 }); }   // carved door posts
    for (const e of [-1, 1]) B.box(M.woodH, 0.14, 2.9, 1.5, x + e * 1.75, y + 0.3, z + 5.6, { c: 0x2a1c12 });                       // hall doors, open
    B.box(M.woodH, 5.4, 0.4, 0.6, x, y + 3.4, z + 5.1, { c: DARKT });
    skull(x, y + 4.05, z + 5.5, 0, 1.9); for (const e of [-1, 1]) skull(x + e * 2.2, y + 2.5, z + 5.42, e * 0.25, 1.0);                          // horned skulls over the door and on its posts
    for (const lx of [-8.1, -2.7, 2.7, 8.1]) for (const s of [-1, 1]) { B.cyl(M.wood, 0.2, 0.24, 2.9, x + lx, y + 0.3, z + s * 1.9, { c: DARKT, seg: 8 }); world.addCyl(x + lx, z + s * 1.9, 0.26, y, y + 3.2); }   // roof posts
    B.box(M.woodH, 1.6, 0.5, 1.2, x - 11.6, y + 0.36, z, { c: 0x3a2a1c, solid: true }); B.box(M.woodH, 0.2, 2.2, 1.4, x - 12.3, y + 0.36, z, { c: DARKT }); B.box(M.cloth, 1.3, 0.1, 1.0, x - 11.6, y + 0.86, z, { c: 0xe8e4dc });   // the high seat
    for (const s of [-1, 1]) B.box(M.woodH, 5.2, 0.72, 0.8, x + 7.4, y + 0.36, z + s * 3.2, { c: 0x5a4028, solid: true });
    torch(x - 4, y + 2.6, z, 44, 20);
    // the hall furnished: two long tables with horns and trenchers, box beds against the north wall (crouch in), chests behind the high seat, hangings and crossed spears on the walls, a cauldron over the long fire
    for (const s of [-1, 1]) { const top = table(B, M, -5.5, f, z + s * 3.0, 0, { w: 5, d: 0.9, h: 0.8, c: 0x5a4028 }); bench(B, M, -5.5, f, z + s * 4.05, 0, { w: 4.6, c: 0x5a4028 });
      for (let i = 0; i < 5; i++) { const tx = -7.5 + i, tz = z + s * 3.0 + (i % 2 ? 0.2 : -0.2); B.cyl(M.flat, 0.13, 0.13, 0.025, tx, top, tz, { c: 0x8a6a44, seg: 10 }); B.geo(M.flat, new THREE.ConeGeometry(0.04, 0.24, 6), [tx + 0.3, top + 0.045, tz - s * 0.1], [0, i * 1.3, HALF - 0.3], 1, 0xe8dcc0); }
      B.cyl(M.flat, 0.09, 0.12, 0.28, -5.2, top, z + s * 3.0, { c: 0xb0683c, seg: 9 }); }
    for (const bx of [-11.9, -9.8]) { room(B, M, bx, f, z + 3.74, { w: 2.0, d: 1.36, h: 1.95, t: 0.1, ry: Math.PI, mat: M.woodH, c: 0x5a4028, base: 0.02, doors: [{ side: 's', at: 0, w: 1.0, h: 1.25 }], floor: false, ceil: { mat: M.woodH, c: DARKT } });
      rug(B, M, bx, f, z + 3.7, 0, { w: 1.6, d: 1.0, c: 0x8a7458, border: 0x5a4632 }); B.box(M.cloth, 0.3, 0.1, 0.6, bx + 0.6, f + 0.02, z + 3.75, { c: 0xd8ccb0 }); }
    chest(B, M, -12.75, f, z + 1.1, HALF); chest(B, M, -12.75, f, z - 1.1, HALF, { band: 0xc9a030 });
    for (const [hx, c] of [[-9.6, 0x8a1c1c], [-5.5, 0x1c4a7a], [-1.4, 0x8a1c1c]]) { B.box(M.cloth, 2.4, 1.1, 0.03, hx, f + 1.3, z - 4.4, { c }); for (const yy of [1.38, 2.2]) B.box(M.cloth, 2.4, 0.1, 0.04, hx, f + yy, z - 4.4, { c: 0xc9a030 }); B.box(M.wood, 2.6, 0.06, 0.06, hx, f + 2.4, z - 4.39, { c: DARKT }); }
    B.box(M.cloth, 0.03, 1.5, 3.2, -13.14, f + 1.05, z, { c: 0x8a1c1c }); for (const zz of [-1.2, 0, 1.2]) B.box(M.cloth, 0.04, 1.5, 0.12, -13.14, f + 1.05, z + zz, { c: 0xc9a030 });
    for (const s of [-1, 1]) { rod(B, M.wood, [13.1, f + 0.7, z - s * 1.1], [13.1, f + 2.5, z + s * 1.1], 0.03, 0x6a4a2e); B.geo(M.metal, new THREE.ConeGeometry(0.06, 0.32, 6), [13.1, f + 2.6, z + s * 1.22], [s * 0.55, 0, 0], 1, 0xc9ced6); }
    B.geo(M.flat, new THREE.CylinderGeometry(0.46, 0.46, 0.06, 14), [13.06, f + 1.55, z], [0, 0, HALF], 1, 0x8a1c1c); B.geo(M.metal, new THREE.SphereGeometry(0.1, 8, 6), [13.0, f + 1.55, z], [0, 0, 0], 1, 0xc9ced6);
    cauldron(1.85, f + 0.9, z, f + 2.84);
    who('norseMan', -10.6, f, z + 1.7, HALF, { pose: 'talk', over: { shirt: 0x3a4a6a, cape: 0x7a2a22, extras: ['smock', 'cape'] } });                                             // the skald, reciting beside the high seat
    for (let i = 0; i < 5; i++) B.box(M.stone, 6 - i * 0.2, 0.3, 0.7, x, y - 1.2 + i * 0.3, z + 8.3 - i * 0.7, { c: 0x7a808a, solid: true });
    B.box(M.stone, 5.2, 3.3, 1.1, x, y - 3, z + 5.2, { c: 0x7a808a, solid: true });                                                   // landing in front of the door
    for (const e of [-1, 1]) { fires.push(brazier(B, M, e * 4.6, world.height(e * 4.6, z + 9), z + 9, 1.3).concat(1.2)); for (let i = 0; i < 4; i++) B.geo(M.flat, new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12), [e * (4.2 + i * 2.2), y + 1.9, z + 4.82], [Math.PI / 2, 0, 0], 1, [0x8a1c1c, 0xc8a030, 0x1c4a7a, 0xe8e0d0][i]); }
    torch(0, y + 3, z + 10, 70, 24);
  }
  { // boat shed on the shore, a boat drawn up inside
    const x = -20, z = 49, w = 6.4, d = 12, P = frame(x, z, 0), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h: 3.0, t: 0.32, mat: M.woodH, c: TIMBER, base: 2.6, doors: [{ side: 's', at: 0, w: 4.6, h: 2.8 }, { side: 'e', at: -3.4, w: 1.7, h: 2.0 }], floor: { mat: M.ground, c: 0x6a5a48 }, ceil: { mat: M.woodH, c: DARKT } });
    B.geo(M.shingle, prismGeo(w + 1.6, 3.0, d + 1.2, 3), [x, yf + 3.0, z], [0, 0, 0], 1, SNOW);
    steps(B, M, x, z + d / 2, 0, f, 7, { w: 4.4, c: 0x7a808a }); steps(B, M, x + w / 2, z - 3.4, Math.PI / 2, f, 6, { w: 2, c: 0x7a808a });
    B.geo(M.flat, new THREE.SphereGeometry(1, 12, 6), [x - 0.4, f + 0.45, z - 0.6], [0, 0, 0], [1.05, 0.62, 3.9], 0x4a3626); B.box(M.woodH, 1.5, 0.08, 6.2, x - 0.4, f + 0.72, z - 0.6, { c: 0x7a5a3a }); world.addBox(x - 0.4, z - 0.6, 1.9, 7.4, 0, f, f + 1.0);
    for (let i = 0; i < 4; i++) B.box(M.wood, 0.07, 2.6, 0.12, x + 2.75, f + 0.2, z + 1 + i * 0.5, { rz: 0.12, c: 0x8a6a44 });
    barrel(B, M, x + 2.3, f, z - 5.1); barrel(B, M, x - 2.4, f, z + 4.4);
    for (let k = 0; k < 3; k++) B.geo(M.flat, new THREE.TorusGeometry(0.36 - k * 0.03, 0.07, 5, 12), [x - 2.35, f + 0.07 + k * 0.13, z - 4.9], [HALF, 0, 0], 1, 0xb8a070);                    // coils of rope,
    B.cyl(M.metal, 0.26, 0.2, 0.32, x - 2.5, f, z - 2.9, { c: 0x4a4a52, seg: 10, solid: true }); B.cyl(M.flat, 0.24, 0.24, 0.02, x - 2.5, f + 0.3, z - 2.9, { c: 0x14110e, seg: 10 }); B.box(M.wood, 0.03, 0.7, 0.03, x - 2.42, f + 0.2, z - 2.9, { rz: -0.3, c: 0x6a4a2e });   // a pot of tar with its brush,
    B.geo(M.cloth, new THREE.CylinderGeometry(0.2, 0.2, 5.2, 8), [x - 2.7, f + 1.7, z + 0.4], [HALF, 0, 0], 1, 0xe8e0d0); for (let k = 0; k < 4; k++) { B.geo(M.flat, new THREE.TorusGeometry(0.21, 0.03, 4, 8), [x - 2.7, f + 1.7, z - 1.7 + k * 1.4], [0, 0, 0], 1, 0x8a1c1c); B.box(M.wood, 0.4, 0.06, 0.06, x - 2.7, f + 1.47, z - 1.7 + k * 1.4, { c: DARKT }); }   // a furled sail on pegs along the wall
    extraFoes.push(['viking', x + 1.9, z - 1.5, { up: 1.8, patrol: false }]); extraPicks.push([x + 2.1, z - 3.6, 0, 1.8]);
  }
  { // the smithy: an open shed with forge and anvil
    const x = 31, z = 22, y = world.height(x, z);
    B.box(M.woodH, 5.2, 2.6, 0.3, x, y - 0.3, z - 2.1, { c: TIMBER, solid: true }); B.box(M.woodH, 0.3, 2.6, 4.2, x + 2.5, y - 0.3, z, { c: TIMBER, solid: true });
    for (const [a, b] of [[-2.4, 2.0], [2.4, 2.0], [-2.4, -2.0]]) { B.box(M.wood, 0.24, 2.6, 0.24, x + a, y - 0.3, z + b, { c: DARKT }); world.addCyl(x + a, z + b, 0.18, y - 1, y + 2.4); }
    B.geo(M.shingle, prismGeo(6.2, 1.6, 5.4, 3), [x, y + 2.3, z], [0, 0, 0], 1, SNOW);
    B.box(M.stone, 1.5, 0.9, 1.1, x + 1.4, y - 0.1, z - 1.2, { c: 0x5a5f68, solid: true }); B.geo(M.glow, new THREE.ConeGeometry(0.3, 0.6, 6), [x + 1.4, y + 1.05, z - 1.2], [0, 0, 0], 1, 0xff7a20); fires.push([x + 1.4, y + 1.1, z - 1.2, 0.8]);
    B.cyl(M.wood, 0.3, 0.34, 0.55, x - 0.4, y - 0.05, z + 0.2, { c: DARKT, seg: 8 }); B.box(M.metal, 0.7, 0.24, 0.26, x - 0.4, y + 0.5, z + 0.2, { c: 0x3a3e44 }); world.addCyl(x - 0.4, z + 0.2, 0.4, y - 1, y + 0.8);
    for (let i = 0; i < 4; i++) { B.box(M.wood, 0.05, 0.8, 0.05, x - 1.8 + i * 0.5, y + 0.9, z - 1.9, { c: 0x8a6a44 }); B.box(M.metal, 0.22, 0.2, 0.03, x - 1.8 + i * 0.5, y + 1.6, z - 1.9, { c: 0xc9ced6 }); }
    B.box(M.cloth, 0.5, 0.26, 0.8, x + 0.25, y + 0.55, z - 1.35, { rz: 0.12, c: 0x5a4632 }); B.box(M.wood, 0.6, 0.55, 0.9, x + 0.25, y, z - 1.35, { c: DARKT, solid: true }); B.box(M.metal, 0.3, 0.05, 0.05, x + 0.6, y + 0.6, z - 1.35, { c: 0x3a3e44 });   // the bellows on their block,
    B.box(M.woodH, 0.5, 0.45, 1.2, x + 1.95, y, z + 0.9, { c: DARKT, solid: true }); B.box(M.flat, 0.4, 0.02, 1.1, x + 1.95, y + 0.4, z + 0.9, { c: 0x4a5a6a });                                                                               // the quench trough,
    B.geo(M.stone, new THREE.CylinderGeometry(0.36, 0.36, 0.12, 14), [x - 1.75, y + 0.62, z + 0.9], [0, 0, HALF], 1, 0x8a8a84); for (const e of [-1, 1]) B.box(M.wood, 0.08, 0.7, 0.5, x - 1.75 + e * 0.16, y, z + 0.9, { c: DARKT }); world.addCyl(x - 1.75, z + 0.9, 0.38, y - 1, y + 1.0);   // a grindstone,
    B.geo(M.flat, new THREE.ConeGeometry(0.42, 0.4, 8), [x + 2.0, y + 0.18, z - 0.2], [0, 0, 0], 1, 0x1c1a18);                                                                                                                                 // charcoal,
    { const top = table(B, M, x - 1.1, y, z - 1.55, 0, { w: 1.8, d: 0.5, h: 0.75, c: DARKT }); for (let i = 0; i < 3; i++) B.box(M.metal, 0.2, 0.05, 0.14, x - 1.7 + i * 0.5, top, z - 1.55, { ry: i * 0.5, c: 0x6a6e76 }); }                            // and a bench with axe heads still to be ground
    extraFoes.push(['berserker', x - 0.6, z + 2.6, {}]);
  }
  runestone(-9, -30, 1.2); runestone(9, -30, 1.2); runestone(-48, 30, 1.0); runestone(30, 50, 0.9);
  { // burial mound that can be walked up, inside a ring of standing stones set out in the shape of a ship
    const x = 56, z = 6, y = world.height(x, z); B.geo(M.ground, new THREE.SphereGeometry(7, 14, 8), [x, y - 3.2, z], [0, 0, 0], [1, 0.7, 1], SNOW);
    for (const [r, t] of [[4.9, 0.38], [4.3, 0.76], [3.6, 1.1], [2.7, 1.42], [1.6, 1.64]]) for (const a of [0.26, 0.785, 1.31]) world.addBox(x, z, 2 * r * Math.cos(a), 2 * r * Math.sin(a), 0, y - 3, y + t);
    for (let k = 0; k < 10; k++) for (const s of k % 9 ? [-1, 1] : [1]) {
      const t = -1 + k * 2 / 9, px = x + s * 6.8 * Math.pow(1 - t * t, 0.55), pz = z + t * 11, py = world.height(px, pz), q = k % 9 ? 0.75 + Math.abs(t) * 0.3 : 1.7;
      B.geo(M.rock, rockGeo(k + 2 + s, 1), [px, py + 0.75 * q, pz], [0, k * 1.3 + s, 0], [0.45 * q, 1.25 * q, 0.32 * q], 0x6a707a); if (q > 1.5) world.addCyl(px, pz, 0.5, py - 1, py + 2.4);
    }
  }
  { // the shipyard on the east shore: a half-planked hull on its stocks (crawl under the keel), stacked planks and logs, a tar pot on the fire, the builder at his bench
    const x = 80, z = 49, H = 7, N = 12, MS = 6, g = Math.max(...[-6, -3, 0, 3, 6].map((k) => world.height(x + k, z))), K = g + 1.45, y = (a, b) => world.height(a, b);
    const bre = (t) => 1.9 * Math.pow(1 - Math.pow(Math.abs(t), 2.3), 0.8), keel = (t) => K + 1.3 * Math.pow(Math.abs(t), 3.6), top = (t) => K + 1.35 + 1.5 * Math.pow(Math.abs(t), 3.2);
    const pt = (i, j, sg) => { const t = -1 + 2 * i / N, a = j / MS * HALF, k = keel(t); return [x + t * H, k + (top(t) - k) * (1 - Math.cos(a)), z + sg * bre(t) * Math.pow(Math.sin(a), 0.75)]; };
    const pos = [], col = [], ca = new THREE.Color(0x8a6a48), cb = new THREE.Color(0x6a4e34);
    for (const sg of [-1, 1]) for (let i = 0; i < N; i++) for (let j = 0; j < (sg < 0 ? 4 : 2); j++) {      // the strakes fitted so far: four on the landward side, two on the other
      if (j === 3 && i > 6) continue;
      const q = [pt(i, j, sg), pt(i + 1, j, sg), pt(i + 1, j + 1, sg), pt(i, j + 1, sg)], cc = j % 2 ? cb : ca;
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k]); col.push(cc.r, cc.g, cc.b); }
    }
    const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); hull.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); hull.computeVertexNormals(); B.geo(M.flat2, hull, [0, 0, 0], [0, 0, 0], 1);
    for (let i = 0; i < N; i++) rod(B, M.wood, pt(i, 0, 1), pt(i + 1, 0, 1), 0.11, 0x5a4028);                                                    // the keel,
    for (const e of [-1, 1]) rod(B, M.wood, [x + e * H, K + 1.3, z], [x + e * (H + 0.5), K + 3.7, z], 0.11, 0x5a4028, 0.07);                     // stem and stern post,
    for (let i = 1; i < N; i++) for (const sg of [-1, 1]) for (let j = 0; j < MS; j++) rod(B, M.wood, pt(i, j, sg), pt(i, j + 1, sg), 0.05, 0x7a5a3a);   // the ribs
    for (const t of [-0.65, -0.25, 0.25, 0.65]) B.box(M.woodH, 0.5, keel(t) - 0.1 - g + 0.4, 0.7, x + t * H, g - 0.4, z, { c: DARKT, solid: true });       // the stocks under the keel
    for (const i of [3, 6, 9]) for (const sg of [-1, 1]) { const p = pt(i, 3, sg); rod(B, M.wood, [p[0], y(p[0], z + sg * 3.1) - 0.2, z + sg * 3.1], p, 0.06, 0x5a4028); }   // and the shores that hold her upright
    world.addBox(x, z, 12.6, 3.3, 0, K - 0.1, K + 2.2); extraPicks.push([x, z, 0, 0.1]);
    { const px = 74.5, pz = 44.2, py = y(px, pz); for (let k = 0; k < 4; k++) { B.box(M.woodH, 5.2 - (k % 2) * 0.3, 0.1, 1.1, px, py + 0.1 + k * 0.2, pz, { ry: 0.2, c: k % 2 ? 0x8a6a48 : 0x7a5a3a }); for (const e of [-1.8, 0, 1.8]) B.box(M.wood, 0.1, 0.1, 1.1, px + e * 0.98, py + k * 0.2, pz - e * 0.2, { ry: 0.2, c: DARKT }); }
      world.addBox(px, pz, 5.2, 1.1, 0.2, py - 0.5, py + 0.9); }
    woodpile(B, M, 86.5, y(86.5, 44.5), 44.5, 0.3, { w: 2.4, h: 1.1, d: 3.6 });
    { const fl = hearth(B, M, 76.5, y(76.5, 53.5), 53.5, { pot: true }); fires.push([fl[0], fl[1], fl[2], 0.6]); barrel(B, M, 75.2, y(75.2, 54.2), 54.2, 0x2a2420); barrel(B, M, 75.6, y(75.6, 55.1), 55.1, 0x3a2e24); }
    { const px = 84.5, pz = 53.6, py = y(px, pz); B.box(M.woodH, 4.2, 0.42, 0.56, px, py + 0.22, pz, { ry: -0.15, c: DARKT, solid: true }); for (const e of [-1.5, 1.5]) B.box(M.stone, 0.4, 0.24, 0.7, px + e, py - 0.02, pz + e * 0.15, { ry: -0.15, c: 0x5a5f68 });   // the trough where planks are steamed until they bend
      B.box(M.flat, 4.0, 0.02, 0.4, px, py + 0.6, pz, { ry: -0.15, c: 0x5a6a7a }); B.box(M.woodH, 5.0, 0.05, 0.3, px + 0.7, py + 0.64, pz - 0.1, { ry: -0.15, rz: 0.06, c: 0x8a6a48 }); }
    { const px = 76.8, pz = 45.2, py = y(px, pz), P = frame(px, pz, 0.2), top = table(B, M, px, py, pz, 0.2, { w: 2.4, d: 0.7, h: 0.75, c: DARKT }); B.box(M.woodH, 3.0, 0.05, 0.3, px, top, pz, { ry: 0.2, c: 0x8a6a48 });
      const [a, b] = P(0.2, 0.8), p = who('norseMan', a, y(a, b), b, 0.2 + Math.PI, { pose: 'work' }); hold(p, p.armR, [gCyl(0.016, 0.016, 0.5, 0x6a4a2e, [0, -0.62, 0.2], [HALF, 0, 0], 1, 5), gBox(0.03, 0.14, 0.1, 0x9a9fa6, [0, -0.66, 0.45])]);   // the boat builder trims a plank with his adze
      const [c, e] = P(2.1, -0.2); chest(B, M, c, y(c, e), e, 0.2); }
    { const px = 73.2, pz = 49.5, py = y(px, pz); B.cyl(M.wood, 0.3, 0.34, 0.55, px, py - 0.05, pz, { c: DARKT, seg: 8, solid: true }); B.box(M.wood, 0.04, 0.6, 0.04, px + 0.12, py + 0.5, pz, { rz: -0.5, c: 0x8a6a44 }); B.box(M.metal, 0.03, 0.14, 0.16, px - 0.02, py + 0.52, pz, { rz: -0.5, c: 0xc9ced6 }); }
    extraFoes.push(['viking', 84, 45.5, {}], ['bowman', 74, 52.5, {}]);
  }
  { // the cod racks on the shore: stockfish hung so thick that only a crouching man gets through underneath
    const x = 20, z = 54, y = Math.max(world.height(x - 4, z), world.height(x, z), world.height(x + 4, z));
    for (let i = 0; i < 5; i++) { for (const s of [-1, 1]) { const px = x - 4 + i * 2, pz = z + s * 1.05; B.box(M.wood, 0.12, 2.6, 0.12, px, y - 0.5, pz, { c: DARKT }); if (i % 4 === 0) world.addCyl(px, pz, 0.1, y - 1, y + 2.1); } B.box(M.wood, 0.09, 0.09, 2.3, x - 4 + i * 2, y + 2.02, z, { c: DARKT }); }
    for (let k = 0; k < 5; k++) { const pz = z - 0.9 + k * 0.45; B.box(M.wood, 8.4, 0.07, 0.07, x, y + 2.11, pz, { c: 0x6a4a2e });
      for (let i = 0; i < 20; i++) { const L = 0.5 + ((i + k) % 3) * 0.07; B.box(M.flat, 0.11, L, 0.035, x - 3.95 + i * 0.41 + (k % 2) * 0.2, y + 2.1 - L, pz, { rz: ((i + k) % 2) * 0.12 - 0.06, c: (i + k) % 3 ? 0xb8b0a0 : 0xa49c8c }); } }
    world.addBox(x, z, 8.4, 2.2, 0, y + 1.3, y + 2.2);
    { const a = x + 3.4, b = z + 1.9, p = who('norseWoman', a, world.height(a, b), b, Math.PI, { pose: (g) => { g.armR.rotation.x = -2.3; g.armL.rotation.x = -2.0; }, over: { hair: 0xe8d498 } }); hold(p, p.armR, [gBox(0.1, 0.45, 0.03, 0xb8b0a0, [0, -0.85, 0])]); basket(a + 0.9, world.height(a + 0.9, b + 0.2), b + 0.2, 0xb0b4b8); }   // she hangs up the catch
  }
  { // a boat turned keel up on two trestles beside the boat shed: shelter to crawl under
    const x = -28, z = 56, ry = 1.2, y = Math.max(world.height(x - 1.5, z), world.height(x + 1.5, z)), P = frame(x, z, ry);
    B.geo(M.flat2, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, HALF), [x, y + 1.3, z], [0, ry, 0], [0.95, 0.62, 2.9], 0x4a3626); B.box(M.wood, 0.08, 0.1, 4.6, x, y + 1.88, z, { ry, c: DARKT });
    for (const e of [-1, 1]) { const [a, b] = P(0, e * 1.6); B.box(M.wood, 2.4, 0.12, 0.14, a, y + 1.18, b, { ry, c: DARKT }); for (const s of [-1, 1]) { const [c, d2] = P(s * 1.1, e * 1.6); B.box(M.wood, 0.1, 1.6, 0.1, c, y - 0.4, d2, { ry, c: DARKT }); world.addCyl(c, d2, 0.08, y - 1, y + 1.2); } }
    world.addBox(x, z, 1.9, 5.6, ry, y + 1.25, y + 1.95);
  }
  for (const [x, z, ry] of [[-24, 36, 0.25], [23, 33, -0.3], [-31, 3, 1.35]]) {       // firewood stacked in an L behind the houses: cover to crouch behind
    woodpile(B, M, x, world.height(x, z), z, ry, { w: 2.6, h: 1.3 }); const [a, b] = frame(x, z, ry)(1.75, 0.85); woodpile(B, M, a, world.height(a, b), b, ry + HALF, { w: 1.6, h: 1.3 });
  }
  { // a sledge loaded with furs and a cask, left between the houses
    const x = 6, z = 34, ry = 0.7, y = world.height(x, z), P = frame(x, z, ry);
    for (const s of [-1, 1]) { const [a, b] = P(s * 0.45, 0); B.box(M.wood, 0.08, 0.1, 2.8, a, y + 0.02, b, { ry, c: DARKT }); const [c, e] = P(s * 0.45, 1.55); B.box(M.wood, 0.08, 0.1, 0.6, c, y + 0.14, e, { ry, rx: -0.6, c: DARKT });
      for (const k of [-0.9, 0, 0.9]) { const [u, v] = P(s * 0.45, k); B.box(M.wood, 0.07, 0.34, 0.07, u, y + 0.1, v, { ry, c: DARKT }); } }
    B.box(M.woodH, 1.1, 0.08, 2.4, x, y + 0.42, z, { ry, c: 0x6a4a2e });
    { const [a, b] = P(0, -0.45); B.box(M.cloth, 1.0, 0.45, 1.3, a, y + 0.5, b, { ry, c: 0x6a5038 }); B.box(M.cloth, 0.9, 0.12, 1.0, a, y + 0.95, b, { ry: ry + 0.2, c: 0x8a7458 }); } { const [a, b] = P(0, 0.75); barrel(B, M, a, y + 0.5, b); }
    world.addBox(x, z, 1.1, 2.4, ry, y - 0.3, y + 1.05);
  }
  { // the beacon crag in the western wood: up its ladder a fire bowl, and a view over the palisade into the yard
    const x = -62, z = -26, y = world.height(x, z), top = boulder(B, M, x, y, z, { rx: 6, rz: 5, h: 6.5, seed: 5, ladder: 0.9, rock: [0x6a707a, 0x5a606a, 0x7a808a, 0x4a505a], grass: SNOW, grass2: 0xcfdcec, moss: 0xdfe8f2 }).top;
    fires.push(brazier(B, M, x - 1, top, z - 0.5, 1.2).concat(1.2)); woodpile(B, M, x + 1.4, top, z - 2.0, 0.4, { w: 1.4, h: 0.6, d: 0.8 });
    extraPicks.push([x - 0.5, z + 1.6, top + 0.05]); extraFoes.push(['viking', x + 9, z + 6, {}]);
  }
  { // the farm's byre: an open-fronted shed with a hay loft up a ladder (crouch under it) and a pony at the manger; sheep and another pony in the pen
    const x = -87.5, z = 21, y = world.height(x, z);
    B.box(M.woodH, 0.25, 3.9, 6.85, x - 2.75, y - 0.6, z, { c: TIMBER, solid: true }); for (const s of [-1, 1]) B.box(M.woodH, 5.3, 3.9, 0.25, x - 0.1, y - 0.6, z + s * 3.3, { c: TIMBER, solid: true });
    B.box(M.wood, 0.22, 3.9, 0.22, x + 2.45, y - 0.6, z, { c: DARKT }); world.addCyl(x + 2.45, z, 0.14, y - 1, y + 3.3); B.box(M.woodH, 0.2, 0.25, 6.6, x + 2.45, y + 3.05, z, { c: DARKT });
    B.geo(M.shingle, prismGeo(6.7, 1.7, 7.9, 3), [x, y + 3.3, z], [0, 0, 0], 1, SNOW);
    for (const s of [-1, 1]) B.geo(M.woodH, prismGeo(5.3, 1.45, 0.25, 2), [x - 0.1, y + 3.3, z + s * 3.3], [0, 0, 0], 1, DARKT);
    deck(B, M, x - 1.4, y, z, HALF, { w: 6.3, d: 2.4, h: 1.9, c: 0x6a4c30, post: DARKT, ladder: 's', at: 2.2 });
    B.geo(M.thatch, new THREE.SphereGeometry(1, 10, 6), [x - 1.7, y + 2.0, z + 1.5], [0, 0, 0], [0.85, 0.6, 1.4], 0xc8a850); world.addBox(x - 1.7, z + 1.5, 1.5, 2.4, 0, y + 1.9, y + 2.5); B.geo(M.thatch, new THREE.SphereGeometry(1, 8, 6), [x - 2.0, y + 1.95, z - 2.4], [0, 0, 0], [0.55, 0.4, 0.6], 0xb89a48);
    extraPicks.push([x - 1.4, z - 1.2, y + 1.95]);
    B.box(M.woodH, 0.5, 0.5, 6.0, x - 2.3, y + 0.3, z, { c: DARKT, solid: true }); B.box(M.thatch, 0.4, 0.12, 5.8, x - 2.3, y + 0.76, z, { c: 0xc8a850 }); for (const s of [-1, 1]) B.box(M.woodH, 2.0, 1.1, 0.1, x - 1.05, y, z + s * 1.05, { c: DARKT, solid: true });
    for (const [a, b, ry] of [[x + 1.3, z + 1.3, Math.PI + 0.1], [-88.4, 27.7, 2.2]]) animal(B, M, root, 'pony', horseGeo(0xc8a878, 0x2a2018), a, world.height(a, b), b, ry, { s: 0.75, coat: 0xc8a878, box: [0.8, 2.5, 1.75, 0.1] });
    const sheepGeo = merge([gSph(0.3, 0xffffff, [0, 0.56, 0], [0.9, 0.85, 1.45]), gBox(0.15, 0.17, 0.24, 0x2a2420, [0, 0.7, 0.5], [0.3, 0, 0]), ...[[0.13, 0.28], [-0.13, 0.28], [0.13, -0.28], [-0.13, -0.28]].map(([a, b]) => gCyl(0.035, 0.03, 0.4, 0x2a2420, [a, 0.2, b], [0, 0, 0], 1, 5))]);
    [[-84.6, 31.4, 0.4], [-80.2, 31.0, 2.1], [-79.2, 27.2, 4.0], [-83.6, 26.3, 5.2], [-76.4, 30.6, 1.2], [-87.4, 29.6, 3.0], [-81.4, 28.9, 0.9]].forEach(([a, b, ry], i) => {
      const sz = 0.9 + (i % 3) * 0.1; animal(B, M, root, 'sheep', sheepGeo, a, world.height(a, b), b, ry, { s: sz, c: [0xffffff, 0xd8d0c0, 0x8a7a68][i % 3], box: [0.5 / sz, 1.0 / sz, 0.85 / sz, 0] });
    });
    { const a = -80.4, b = 29.6, p = who('norseMan', a, world.height(a, b), b, -2.2, { pose: (g) => { g.armR.rotation.x = -0.35; g.armL.rotation.z = 0.3; }, over: { cape: 0x5a4632, extras: ['smock', 'cape'] } }); hold(p, p.armR, [gCyl(0.02, 0.022, 1.7, 0x6a4a2e, [0, -0.6, 0], [0.35, 0, 0], 1, 6)]); }   // the shepherd, leaning on his staff
    { const a = -82.8, b = 23.4, p = who('norseWoman', a, world.height(a, b), b, 1.3, { pose: (g) => { g.armL.rotation.z = 0.35; g.armR.rotation.x = -0.1; } }); hold(p, p.armR, [gCyl(0.13, 0.1, 0.22, 0x8a6a44, [0, -0.86, 0], [0, 0, 0], 1, 9), gBox(0.012, 0.2, 0.012, 0x3a2a1c, [0, -0.68, 0])]); }   // she carries a pail of milk to the house
  }
  { // the charcoal burners' clearing in the wood behind the hall: a smoking kiln, stacked logs, a lean-to with a bed of furs; the back door of the hall is a short walk from here
    const x = -28, z = -86, y = world.height(x, z), hy = (a, b) => world.height(a, b);
    B.geo(M.ground, new THREE.SphereGeometry(2.4, 12, 6, 0, Math.PI * 2, 0, HALF), [x, y - 0.1, z], [0, 0, 0], [1, 0.8, 1], 0x3a342e); B.geo(M.ground, new THREE.SphereGeometry(1.5, 10, 5, 0, Math.PI * 2, 0, 0.9), [x, y + 0.72, z], [0, 0, 0], [1, 0.8, 1], 0xdfe8f2); world.addCyl(x, z, 2.2, y - 1, y + 1.9);
    for (let i = 0; i < 4; i++) B.box(M.glow, 0.16, 0.1, 0.05, x + Math.cos(i * 1.6 + 0.4) * 2.3, y + 0.25, z + Math.sin(i * 1.6 + 0.4) * 2.3, { ry: -(i * 1.6 + 0.4) + HALF, c: 0xff5a18 });
    smokes.push([x, y + 2.1, z]); fires.push([x, y + 1.9, z, 0.5]);
    woodpile(B, M, x + 5.2, hy(x + 5.2, z - 2), z - 2, 0.3, { w: 2.4, h: 1.1, d: 2.2 }); woodpile(B, M, x + 4.2, hy(x + 4.2, z + 3), z + 3, 1.3, { w: 2.0, h: 0.9, d: 2.0 });
    { const px = x - 4.5, pz = z + 2.5, py = hy(px, pz); B.geo(M.flat, new THREE.ConeGeometry(1.1, 0.7, 9), [px, py + 0.3, pz], [0, 0, 0], 1, 0x1c1a18); world.addCyl(px, pz, 0.8, py - 1, py + 0.45); sacks(B, M, px + 1.9, hy(px + 1.9, pz + 0.6), pz + 0.6, 0.5, { w: 1.2, c: 0x4a4038 }); }
    { const px = x - 1.5, pz = z - 5.5, py = hy(px, pz);                                                                                              // the lean-to: its roof comes down to the ground at the back
      for (const s of [-1, 1]) { B.box(M.wood, 0.12, 2.1, 0.12, px + s * 1.6, py - 0.3, pz + 1.2, { c: DARKT }); world.addCyl(px + s * 1.6, pz + 1.2, 0.1, py - 1, py + 1.8); }
      B.box(M.wood, 3.4, 0.1, 0.1, px, py + 1.75, pz + 1.2, { c: DARKT }); B.box(M.woodH, 3.5, 0.08, 3.0, px, py + 0.98, pz - 0.05, { rx: -0.6, c: 0x5a4028 }); B.box(M.flat, 3.5, 0.05, 2.9, px, py + 1.06, pz - 0.05, { rx: -0.6, c: SNOW });
      world.addBox(px, pz - 1.0, 3.4, 0.6, 0, py - 0.5, py + 0.8); bed(B, M, px - 0.4, py, pz + 0.35, HALF, { h: 0.3, blanket: 0x6a5038, pillow: 0x8a7458, head: 0 }); extraPicks.push([px + 1.0, pz + 0.5, 0, 0.1]); }
    { const px = x + 1.5, pz = z + 4.5, py = hy(px, pz); B.cyl(M.wood, 0.3, 0.34, 0.55, px, py - 0.05, pz, { c: DARKT, seg: 8, solid: true }); B.box(M.wood, 0.04, 0.6, 0.04, px + 0.12, py + 0.5, pz, { rz: -0.5, c: 0x8a6a44 }); B.box(M.metal, 0.03, 0.14, 0.16, px - 0.02, py + 0.52, pz, { rz: -0.5, c: 0xc9ced6 }); }
    extraFoes.push(['viking', x + 2, z - 1.5, {}]);
  }
  { // pack ice frozen in between your ship and the jetty: a way to the moored ships that does not cross the beach
    const way = [[-4, 65.2], [-6.3, 67.3], [-8.8, 69], [-11.6, 70.2], [-14.5, 71], [-17.4, 71.6], [-20.3, 72.5], [-23.2, 73.3], [-26, 74.3], [-28.9, 74.9], [-31.8, 75.4], [-34.6, 76], [-37, 76.6]];
    way.forEach(([x, z], i) => { B.cyl(M.flat, 2.0, 1.9, 0.3, x, -0.13, z, { c: [0xdfeaf6, 0xeef4fb, 0xd3e0f0][i % 3], seg: 7 + (i % 2), ry: i * 1.1 }); world.addBox(x, z, 2.7, 2.7, 0, -1.6, 0.17); });
    B.box(M.flat, 1.5, 0.4, 2.0, -37.7, 0.1, 76.6, { ry: 0.2, rz: 0.08, c: 0xc9d8ea }); world.addBox(-37.7, 76.6, 1.5, 2.0, 0, -1.6, 0.49);              // a slab pushed up against the piles: the step onto the jetty
  }
  // jetty and ships
  { const x = -40; B.box(M.woodH, 3, 0.25, 18, x, 0.55, 70, { c: 0x6a5238, solid: true }); for (let i = 0; i < 6; i++) for (const s of [-1, 1]) B.cyl(M.wood, 0.14, 0.14, 2.6, x + s * 1.4, -1.6, 62 + i * 3.2, { c: 0x4a3828, seg: 6 }); fires.push(brazier(B, M, x + 2.2, world.height(x + 2.2, 59), 59, 1).concat(1)); torch(x + 2.2, 2.6, 59, 34, 16); }
  { // four longships that can be boarded: two at the jetty, your own on the beach, the grey jarl's great ship in the east
    const put = (sh, lx, lz, f) => { const [a, b] = sh.P(lx, lz); f(a, b); };
    const west = drakkar(B, M, -45.5, 77.5, Math.PI, { furled: true, gang: [-41.3, 74] });
    put(west, -0.9, 5.6, (a, b) => barrel(B, M, a, west.D, b)); put(west, 0.9, -3.6, (a, b) => crate(B, M, a, west.D, b, 0.8, 0.3));
    extraFoes.push(['viking', ...west.P(0.7, -2.6), { y: 1.6, patrol: false }]); extraPicks.push([...west.P(0, 0.76 * west.H), 2.0]);
    const east = drakkar(B, M, -34.5, 77.5, 0, { hull: 0x2e241c, strake: 0x1a1a1a, sail: 0x1a1a1a, sail2: 0x8a1c1c, shields: [0x1a1a1a, 0x8a1c1c], gang: [-38.7, 74] });
    put(east, 0.8, 3.4, (a, b) => crate(B, M, a, east.D, b, 0.9, 0.2)); put(east, 0.8, 4.5, (a, b) => barrel(B, M, a, east.D, b));
    extraFoes.push(['bowman', ...east.P(0, -8.6), { y: 2.2, patrol: false }]);
    const own = drakkar(B, M, 10, 70, Math.PI / 2, { hull: 0x4a3626, strake: 0x1c4a8a, sail: 0x1c4a8a, sail2: 0xe8e0d0, shields: [0x1c4a8a, 0xe8e0d0], gang: [7, 63.4] });   // your own ship
    put(own, -0.9, 4.2, (a, b) => barrel(B, M, a, own.D, b)); put(own, -0.9, 5.3, (a, b) => barrel(B, M, a, own.D, b)); put(own, 0.9, 5, (a, b) => crate(B, M, a, own.D, b, 0.8, 0.4));
    put(own, -1.82, -1.92, (a, b) => who('norseMan', a, own.D, b, Math.PI, { pose: 'sit', seat: 0.4, over: { shirt: 0x1c4a8a } }));                // two of your crew wait aboard: one on his sea chest,
    put(own, 0, 8.8, (a, b) => who('norseMan', a, own.hi, b, Math.PI + 0.15, { pose: 'point', over: { shirt: 0xd8d0c0, cape: 0x1c4a8a, extras: ['smock', 'cape'] } }));   // one in the bow, pointing at the hall
    const big = drakkar(B, M, 58, 70.6, -Math.PI / 2, { len: 27, beam: 5.4, hull: 0x2a1e16, strake: 0xc9a030, furled: true, sail2: 0x8a1c1c, shields: [0xc9a030, 0x8a1c1c, 0x1a1a1a], tent: [0x8a1c1c, 0xe8e0d0], gang: [61, 63.6] });
    put(big, 0.9, -11, (a, b) => { B.box(M.woodH, 0.9, 0.6, 0.6, a, big.hi, b, { ry: -Math.PI / 2, c: 0x5a4028, solid: true }); B.box(M.metal, 0.92, 0.08, 0.62, a, big.hi + 0.56, b, { ry: -Math.PI / 2, c: 0xc9a030 }); });   // the jarl's chest
    put(big, -1.0, -5.2, (a, b) => barrel(B, M, a, big.D, b)); put(big, 1.1, -6.2, (a, b) => crate(B, M, a, big.D, b, 0.9, 0.5));
    extraFoes.push(['chieftain', ...big.P(-0.3, -10.4), { y: 2.2, patrol: false }], ['viking', ...big.P(0.3, 4.4), { y: 1.6, patrol: false }], ['berserker', ...big.P(-0.5, -4), { y: 1.6, patrol: false }]);
    extraPicks.push([...big.P(-1.0, 5.6), 1.6]);
    fires.push(brazier(B, M, 60, world.height(60, 61.5), 61.5, 1).concat(1)); torch(60, world.height(60, 61.5) + 2.2, 61.5, 30, 16);
  }

  // ---- the thing field: where the free men of the district meet to make law and settle quarrels. A ring of standing stones round a low
  //      mound, the law rock on top of it, where the lawspeaker stands and speaks; a few have come early and wait --------------------------
  {
    const x = -58, z = -47, y = world.height(x, z), GR = [0x7a7c80, 0x8a8c8e, 0x6e7074];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + 0.13, r = 7.6 + (i % 3) * 0.3, sx = x + Math.cos(a) * r, sz = z + Math.sin(a) * r, h = 1.5 + ((i * 7) % 5) * 0.18, sy = world.height(sx, sz);
      B.geo(M.rock, rockGeo(30 + i, 1), [sx, sy + h * 0.45, sz], [((i % 3) - 1) * 0.06, -a, 0.04], [0.42, h * 0.55, 0.26], GR[i % 3]);
      world.addCyl(sx, sz, 0.36, sy - 1, sy + h);
    }
    B.geo(M.rock, new THREE.SphereGeometry(2.6, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), [x, y - 0.15, z], [0, 0, 0], [1, 0.32, 1], 0xe8eef4);   // the mound, under snow
    world.addCyl(x, z, 2.2, y - 1, y + 0.62);
    B.geo(M.rock, rockGeo(51, 1), [x, y + 0.75, z], [0, 0.4, 0], [0.9, 0.22, 0.7], 0x8a8c90);                                                       // the law rock
    world.addCyl(x, z, 0.8, y - 1, y + 0.95);
    { const px = x + 1.8, pz = z - 1.4, py = world.height(px, pz); B.cyl(M.wood, 0.06, 0.07, 2.6, px, py, pz, { c: 0x4a3626, seg: 6 }); world.addCyl(px, pz, 0.1, py - 1, py + 2.6);   // a staff with a shield hung on it
      B.geo(M.wood, new THREE.CylinderGeometry(0.45, 0.45, 0.06, 16), [px, py + 1.7, pz + 0.1], [Math.PI / 2, 0, 0], 1, 0xb82a22); B.geo(M.metal, new THREE.SphereGeometry(0.09, 8, 6), [px, py + 1.7, pz + 0.15], [0, 0, 0], 1, 0xb0b0b0); }
    who('norseMan', x - 0.2, y + 0.95, z + 0.1, 0.4, { pose: 'talk', over: { cape: 0x2a4a6a, extras: ['smock', 'cape'] } });                         // the lawspeaker on the law rock
    for (const [a, look, pose] of [[0.6, 'norseMan', 'hips'], [1.1, 'norseWoman', 'stand'], [1.6, 'norseMan', 'stand'], [-0.4, 'norseMan', 'talk']]) {   // the first to come
      const px = x + Math.sin(a) * 4.6, pz = z + Math.cos(a) * 4.6; who(look, px, world.height(px, pz), pz, a + Math.PI, { pose });
    }
  }

  // ---- forest, rocks ---------------------------------------------------------------------------
  const nearBuilt = (x, z) => dPoly(PATH, x, z) < 4.5 || (Math.abs(x) < 46 && z < 48 && z > -70 && (Math.abs(z + 3) < 2.5 || (Math.abs(x) < 19 && z > -9.5 && z < 0) || Math.hypot(x, z - 22) < 7 || Math.hypot(x, z + 56) < 20))
    || [[-19, 30], [18, 27], [-27, 9], [27, 7], [40, 38]].some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 10) || Math.hypot(x - 56, z - 6) < 13 || z > 52 || Math.hypot(x + 80, z - 24) < 15 || Math.hypot(x + 20, z - 49) < 10 || Math.hypot(x - 31, z - 22) < 6 || Math.hypot(x - 74, z + 24) < 11
    || [[80, 49, 13], [-62, -26, 10], [-28, -86, 9], [-58, -47, 13], [-38.5, -30, 4], [-30, -20, 3.5], [6, 34, 3.5], [-16.5, 40, 4], [11.5, -64, 5]].some(([hx, hz, r]) => Math.hypot(x - hx, z - hz) < r);   // the new places: shipyard, crag, charcoal clearing, wolf hole, the post, sledge, the steps of two doors
  const pines = [], rocks = [];
  for (let i = 0; i < 70000 && pines.length < 1900; i++) {
    const x = (R() - 0.5) * 900, z = (R() - 0.5) * 900, h = world.height(x, z), inPlay = Math.abs(x) < 118 && z > -100 && z < 60;
    if (h < 1.6 || h > 120) continue;
    if (inPlay) { if (nearBuilt(x, z) || fbm(x * 0.04 + 20, z * 0.04, 2, 3) < 0.56) continue; } else if (fbm(x * 0.011, z * 0.011 + 8, 3, 5) < 0.47 && R() < 0.85) continue;
    if (Math.abs(world.height(x + 2, z) - h) > 3.2) continue;
    const s = 0.75 + R() * 0.9;
    pines.push({ x, y: h - 0.3, z, ry: R() * 6.28, s: [s, s * (0.9 + R() * 0.4), s], c: R.pick([0xffffff, 0xe8f0f8, 0xd8e4f0]) });
    if (inPlay) world.addCyl(x, z, 0.4 * s, h - 2, h + 9);
  }
  root.add(instanced(pineGeo(0x21402e, 0xe6eef8), windify(M.rock.clone(), shared, 0.14, 9, 1.0), pines));
  for (let i = 0; i < 300; i++) {
    const x = (R() - 0.5) * 340, z = (R() - 0.5) * 340, h = world.height(x, z); if (h < -1.5 || nearBuilt(x, z)) continue;
    const s = 0.4 + R() * R() * 3;
    rocks.push({ x, y: h + s * 0.2, z, ry: R() * 6, s: [s, s * 0.8, s], c: R.pick([0x5a606a, 0x6a707a, 0xdfe8f2]) });
    if (s > 1 && Math.abs(x) < 118 && z > -100 && z < 66) world.addCyl(x, z, s * 0.85, h - 2, h + s * 0.7);
  }
  for (const [ix, iz, rr] of SKERRIES) for (let k = 0; k < 7; k++) { const a = R() * 6.28, x = ix + Math.cos(a) * rr * 0.7, z = iz + Math.sin(a) * rr * 0.7, s = 2 + R() * 6; rocks.push({ x, y: world.height(x, z) + s * 0.3, z, ry: R() * 6, s: [s, s * 1.5, s], c: 0x565c66 }); }
  root.add(instanced(rockGeo(4, 1), M.rock, rocks, { solid: true }));

  // ---- atmosphere ---------------------------------------------------------------------------------
  root.add(makeAmbient(shared, { count: 1700, box: 34, boxY: 18, size: 0.05, colorA: 0xffffff, colorB: 0xdfeaff, alpha: 0.9, fall: 1.5, wind: [0.9, 0, 0.4], flutter: 0.7 }));

  { // a watch platform in the village (up its ladder), an earth cellar to crawl into
    const clearAt = (x, z, r) => { world.cyls = world.cyls.filter((c) => Math.hypot(c.x - x, c.z - z) > r + c.r); };
    clearAt(-5, 30, 4); stand(B, M, -5, world.height(-5, 29.7), 29.7, 0, { c: 0x5a4028, roof: 0xdfe8f2 });
    clearAt(30, 43.5, 4); den(B, M, 30, world.height(30, 43.1) + 0.02, 43.1, 0, { mat: M.woodH, c: 0x4a3626 }); B.geo(M.ground, new THREE.SphereGeometry(3.2, 12, 8), [30, world.height(30, 43.1) + 1.2, 43.1], [0, 0, 0], [1, 0.42, 1], 0xdfe8f2);
    extraPicks.push([30, 43.3, 0, 0.6]);
  }
  const enemies = [
    ['viking', -9, 44, {}], ['bowman', 15, 41, {}], ['viking', -21, 22, { patrol: true }], ['berserker', 6, 26, {}], ['bowman', 30, 17, {}], ['viking', -7, 11, {}],
    ['chieftain', -40, 54, {}], ['berserker', -46, 48, {}], ['bowman', -33, 50, {}],
    ['chieftain', -3, 1, {}], ['viking', 3.5, 1, {}],
    ['berserker', -15, -22, {}], ['viking', 13, -24, { patrol: true }], ['bowman', 19, -36, {}], ['chieftain', -7, -40, {}], ['berserker', 7, -40, {}], ['northBoss', 0, -45, { yaw: 0, patrol: false }],
    ['viking', -8, -56, { up: 1.8, patrol: false, yaw: 0 }], ['viking', 8, -57, { up: 1.8, patrol: false, yaw: 0 }], ['berserker', 17.7, 23.3, { up: 1.8, patrol: false }],
    ['viking', -72, 23, {}], ['bowman', -82, 12, {}], ['berserker', -77, 29, {}], ['chieftain', 70, -22, {}], ['viking', 75, -25.4, { up: 1.8, patrol: false }],
  ];
  const horn = merge([xf(new THREE.TorusGeometry(0.2, 0.05, 6, 10, Math.PI * 0.9), [0, 0, 0], [0, 0, 0.3], 1, 0xe8dcc0), gCyl(0.062, 0.062, 0.04, 0xc9a030, [0.2, 0.06, 0], [0, 0, 1.2], 1, 8)]);
  let ft = 0;
  return {
    env: {
      sunDir: [0.5, 0.56, 0.66], sunColor: 0x8fa8dc, sunLight: 0xa9c2ff, sunIntensity: 2.3, sunSize: 0.0022,
      skyTop: 0x040b20, skyHorizon: 0x12304c, skyGround: 0x0a1a2c, haze: 0.5,
      fogColor: 0x14263a, fogDensity: 0.0034, hemiSky: 0x7e9be0, hemiGround: 0x9db0d2, hemiIntensity: 1.5, envIntensity: 0.65,
      cloudCover: 0.3, cloudScale: 0.4, cloudLit: 0x30446a, cloudShade: 0x0e1828, stars: 1.1, moonDir: [0.5, 0.56, 0.66], aurora: 1,
      bloom: 0.6, bloomRadius: 0.75, bloomThreshold: 1.0, rays: 0.05, rayThreshold: 3.0, exposure: 1.4,
      saturation: 1.08, contrast: 1.06, vignette: 0.45, tintHi: 0xfff2e2, tintLo: 0xdbe6ff, shadowRange: 90,
    },
    spawn: { x: 2, z: 57.5, yaw: 0 },
    vista: { c: [0, 6, 20], r: 60, h: 14, a: 1.5, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[-13, 27], [12, 8], [-36, 52], [-12, -14], [14, -44], [10, -58, 0, 1.8], [77, -22, 0, 1.8], [-80.3, 18.4, 0, 1.8]].concat(extraPicks),
    dust: [0.9, 0.94, 1.0], water: [[0, 68, 26], [-40, 66, 26]], heroLight: 46,
    makePickup: () => new THREE.Mesh(horn, M.flat),
    update(dt, t, g) {
      for (const L of lights) L.l.intensity = L.i * (0.82 + Math.sin(t * 13 + L.ph) * 0.1 + Math.sin(t * 5.7 + L.ph * 2) * 0.08);
      idle(people, t);
      ft -= dt;
      if (ft <= 0) {
        ft = 0.06;
        for (const f of fires) {
          const k = f[3] || 1;
          g.gfx.glow.spawn(f[0] + (Math.random() - 0.5) * 0.3 * k, f[1], f[2] + (Math.random() - 0.5) * 0.3 * k, (Math.random() - 0.5) * 0.5, 1.3 + Math.random() * 1.2 * k, (Math.random() - 0.5) * 0.5, { life: 0.6 + Math.random() * 0.5, s0: 0.28 * k, s1: 0.03, r: 3, g: 1.1, b: 0.25, a: 0.9 });
        }
        const s = smokes[Math.floor(Math.random() * smokes.length)];
        g.gfx.soft.spawn(s[0], s[1], s[2], 0.7, 1.1, 0.3, { life: 5, s0: 0.5, s1: 3.2, r: 0.55, g: 0.6, b: 0.7, a: 0.16, drag: 0.1 });
      }
    },
  };
}

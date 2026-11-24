// Chapter VI - Normandy, before dawn on 6 June 1944: hedgerows, a stone village, a coastal battery.
import * as THREE from 'three';
import { Heightfield, prismGeo, rockGeo } from '../build.js';
import { makeAmbient, makeWater, windify } from '../gfx.js';
import { instanced, room as shell, steps, rubble, tuftGeo, blobTreeGeo, barrel, crate, gCyl, gCone, merge, stand, den, ladder, shelf, table, bench, bed, chest, sacks, woodpile, haystack, cart, deck, rod, person, idle } from '../props.js';
import { fbm, smooth } from '../util.js';
import { makeHumanoid } from '../actors.js';

export const war = {
  id: 'war', theme: 'theme-war', chapter: 'Chapter VI', title: 'Sainte-Aubine', place: 'Sainte-Aubine · Normandy · 6 June 1944, before dawn',
  story: 'The invasion fleet is at sea, and the guns above Sainte-Aubine can reach it. London asks one agent on the ground to silence the battery before first light. Cross the hedgerows, slip through the village, and reach the bunkers on the cliff.',
  weapon: 'sten', weaponName: 'Sten gun & knife', alt: 'right mouse — aim   ·   F — knife', knife: true,
  heroes: [
    { look: 'pavlichenko', name: 'Lyudmila Pavlichenko', who: 'Soviet sniper, 309 confirmed kills', trait: 'Sniper', effect: 'scoped rifle: one shot fells a soldier', weapon: 'rifle', weaponName: 'Scoped rifle & knife', alt: 'right mouse — scope   ·   F — knife', mods: {}, sleeve: 0x6e6c3c, cuff: 0x4a3018 },
    { look: 'hall', name: 'Virginia Hall', who: 'American spy, “the limping lady”', trait: 'Spy', effect: 'Sten gun; sentries notice her much later', mods: { stealth: 0.55 }, sleeve: 0xa8946a, cuff: 0x7a6a48 },
    { look: 'bavaud', name: 'Maurice Bavaud', who: 'Of Neuchâtel, who set out to shoot Hitler in 1938', trait: 'Sure hand', effect: 'pistol whose shots hit 60% harder', weapon: 'revolver', weaponName: 'Pistol & knife', mods: { gun: 1.6 }, sleeve: 0x2a3040, cuff: 0xe0dcd0 },
  ],
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> fire &nbsp; <kbd>Right mouse</kbd> aim &nbsp; <kbd>R</kbd> reload &nbsp; <kbd>F</kbd> knife',
  foes: 'sentries remain', foesNone: 'The guns are silent', bossName: 'Major Kessler', bossDown: 'The battery has lost its commander', pickupText: 'Calvados  +35',
  deadTitle: 'Missing in action', deadSub: 'London waits for a signal that never comes.', clearTitle: 'The guns are silent',
  build,
};

const GREY = 0x565e54, CONCRETE = 0x8a8c86, SLATE = 0x4a5058, STONE = 0xc9c0ae;

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
  const ROAD = [[0, 104], [0, 62], [-5, 32], [0, 6], [0, -30], [4, -60], [0, -86]], LANE = [[-60, 62], [-60, 1]];
  // ---- terrain: rolling fields ending in a chalk cliff above the sea --------------------
  const hf = new Heightfield(1000, 300, (x, z) => {
    const dL = dPoly(LANE, x, z), calm = 1 - (1 - smooth(2.5, 9, Math.min(dPoly(ROAD, x, z), dL))) * 0.85;
    let h = 9 + (fbm(x * 0.02 + 6, z * 0.02, 4, 17) - 0.5) * 3.6 * calm - 0.5 * (1 - smooth(1.5, 6, dL));       // the lane in the west lies half a metre below the fields
    const village = (1 - smooth(22, 34, Math.abs(x))) * (1 - smooth(26, 36, Math.abs(z - 2))); h = h * (1 - village * 0.8) + 9 * village * 0.8;
    const battery = (1 - (x < 0 ? smooth(66, 80, -x) : smooth(40, 56, x))) * (1 - smooth(14, 22, Math.abs(z + 80))); h = h * (1 - battery * 0.9) + 9.4 * battery * 0.9;
    const halt = smooth(36, 46, x) * (1 - smooth(8, 16, Math.abs(z + 49))); h = h * (1 - halt) + 9.2 * halt;                 // the railway line and its halt
    const cider = (1 - smooth(12, 20, Math.abs(x + 77))) * (1 - smooth(10, 18, Math.abs(z - 74))); h = h * (1 - cider * 0.9) + 9.3 * cider * 0.9;
    const sea = smooth(-98, -106, z);
    return h * (1 - sea) - 7 * sea;
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -118, x1: 118, z0: -97, z1: 106 };
  world.maxSlope = 0.95; world.waterY = 1;
  const cG1 = new THREE.Color(0x4c6636), cG2 = new THREE.Color(0x667c40), cWheat = new THREE.Color(0x978a52), cRoad = new THREE.Color(0x6c6456), cChalk = new THREE.Color(0xd9d5c6),
    cBed = new THREE.Color(0x2a3a48), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h, ny) => {
    if (h < 0.5) return tmp.copy(cChalk).lerp(cBed, smooth(0.5, -3, h));
    tmp.copy(cG1).lerp(cG2, fbm(x * 0.04, z * 0.04, 3, 6));
    tmp.lerp(cWheat, smooth(0.55, 0.62, fbm(x * 0.012 + 20, z * 0.012, 2, 9)) * 0.7);
    tmp.lerp(cRoad, (1 - smooth(1.6, 3.6, Math.min(dPoly(ROAD, x, z), dPoly(LANE, x, z) + 0.6))) * 0.9);
    tmp.lerp(cChalk, 1 - smooth(0.55, 0.85, ny));
    return tmp;
  }));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), makeWater(shared, { deep: 0x101c2c, scale: 0.4, flow: [0.05, 0.12], alpha: 0.9 }));
  sea.rotation.x = -Math.PI / 2; root.add(sea);

  // ---- building blocks -----------------------------------------------------------------
  const frame = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
  const lamps = [];
  const lamp = (x, y, z, i = 26, d = 15, c = 0xffb060) => { const l = new THREE.PointLight(c, i, d, 1.7); l.position.set(x, y, z); root.add(l); lamps.push(l); };
  const bushes = [], holes = [];
  /** A hedgerow on its bank. cuts: distances from its start where animals have worn a hole through it, low enough that only somebody crouching gets through. */
  const hedge = (x0, z0, x1, z1, cuts = []) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const run = (a, b) => { const n = Math.ceil((b - a) / 9), L = (b - a) / n; let lo = 1e9, hi = -1e9;                       // drawn in short pieces that follow the ground; one collider
      for (let i = 0; i < n; i++) { const m = a + (i + 0.5) * L, mx = x0 + ux * m, mz = z0 + uz * m, y = world.height(mx, mz); lo = Math.min(lo, y); hi = Math.max(hi, y);
        B.box(M.ground, L + 0.02, 1.1, 2.4, mx, y - 0.4, mz, { ry, c: 0x5a5238 }); B.box(M.flat, L + 0.02, 1.9, 1.5, mx, y + 0.6, mz, { ry, c: 0x2e4426 }); }
      world.addBox(x0 + ux * (a + b) / 2, z0 + uz * (a + b) / 2, b - a, 1.9, ry, lo - 2, hi + 2.9); };
    let a = 0;
    for (const d of cuts) { const hx = x0 + ux * d, hz = z0 + uz * d, y = Math.max(world.height(hx, hz), world.height(hx - uz, hz + ux), world.height(hx + uz, hz - ux));
      run(a, d - 0.8); a = d + 0.8; holes.push([hx, hz]);
      B.box(M.flat, 1.7, 1.25, 1.5, hx, y + 1.25, hz, { ry, c: 0x2e4426 }); B.box(M.ground, 1.5, 0.05, 2.8, hx, world.height(hx, hz) - 0.03, hz, { ry, c: 0x6c6456 }); world.addBox(hx, hz, 1.6, 1.9, ry, y + 1.22, y + 2.9); }
    run(a, len);
    for (let d = 0; d <= len; d += 1.3) { const t = d / len, over = cuts.some((q) => Math.abs(q - d) < 1.6), s = (0.7 + R() * 0.7) * (over ? 0.6 : 1);
      bushes.push({ x: x0 + (x1 - x0) * t + (R() - 0.5) * 0.7, y: world.height(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t) + (over ? 2.5 + R() * 0.3 : 1.9 + R() * 0.9), z: z0 + (z1 - z0) * t + (R() - 0.5) * 0.7, ry: R() * 6, s: [s * 1.2, s, s * 1.2], c: R.pick([0x2e4426, 0x3a5230, 0x28401f]) }); }
  };
  const people = [], extraFoes = [], extraPicks = [], bare = [], HALF = Math.PI / 2, OAK = 0xa8875c;
  const noGrass = (x, z, w, d, ry = 0) => bare.push([x, z, w / 2, d / 2, Math.cos(ry), Math.sin(ry)]);                     // a floor through which no grass grows
  const room = (b, m, x, y, z, o) => { noGrass(x, z, o.w, o.d, o.ry); return shell(b, m, x, y, z, o); };
  /** For fitting out a room: P = its local frame (front = +Z), f = its floor, ry = its turn. put() places a shared prop, bx() and cy() a box or a cylinder, who() somebody; at() gives a point. */
  const kit = (P, f, ry) => ({
    put: (fn, lx, lz, ...rest) => { const [a, b] = P(lx, lz); return fn(B, M, a, f, b, ...rest); },
    bx: (mat, w, h, d, lx, ly, lz, o = {}) => { const [a, b] = P(lx, lz); B.box(mat, w, h, d, a, f + ly, b, { ry, ...o }); },
    cy: (mat, rt, rb, h, lx, ly, lz, o = {}) => { const [a, b] = P(lx, lz); B.cyl(mat, rt, rb, h, a, f + ly, b, o); },
    at: (lx, ly, lz) => { const [a, b] = P(lx, lz); return [a, f + ly, b]; },
    who: (look, lx, lz, turn, o) => { const [a, b] = P(lx, lz); people.push(person(B, M, root, look, a, f, b, ry + turn, o)); },
  });
  /** What stands in a house of width w and depth d: the life of a village, room by room. K = the kit of the ground floor, K2 = that of the floor above. */
  const furnish = (kind, K, w, d, ry, lit, K2) => {
    const { put, bx, cy, who } = K;
    const chair = (lx, lz, t, c = 0x8a6a48) => { bx(M.woodH, 0.45, 0.45, 0.42, lx, 0, lz, { ry: ry + t, c }); bx(M.woodH, 0.45, 0.5, 0.05, lx - Math.sin(t) * 0.19, 0.45, lz - Math.cos(t) * 0.19, { ry: ry + t, c }); };   // chairs and stools are too small to stop anybody
    const stove = (lx, lz) => { cy(M.metal, 0.3, 0.34, 0.9, lx, 0, lz, { c: 0x1c1c1e, solid: true, seg: 10 }); cy(M.metal, 0.08, 0.08, 1.7, lx, 0.9, lz, { c: 0x1c1c1e, seg: 6 }); };
    if (kind === 'home') {                               // a kitchen that is also the bedroom: table and stool, bed, stove, a chest, the dresser with the plates
      bx(M.woodH, 1.3, 0.74, 0.8, w * 0.16, 0, -d * 0.12, { c: 0xa08058, solid: true }); if (lit) bx(M.glow, 0.1, 0.24, 0.1, w * 0.16, 0.74, -d * 0.12, { c: 0xffb050 });
      bx(M.wood, 0.42, 0.45, 0.42, w * 0.16, 0, -d * 0.12 + 0.75, { c: 0x9a7a52 });
      bx(M.woodH, 0.95, 0.5, 1.9, -w / 2 + 0.9, 0, -d / 2 + 1.35, { c: 0x9a7a52, solid: true }); bx(M.cloth, 0.9, 0.1, 1.55, -w / 2 + 0.9, 0.5, -d / 2 + 1.35, { c: 0x6a7a8a });
      stove(w / 2 - 0.85, -d / 2 + 0.85);
      bx(M.woodH, 0.55, 0.6, 1.0, -w / 2 + 0.8, 0, d / 2 - 1.3, { c: OAK }); bx(M.metal, 0.57, 0.05, 1.02, -w / 2 + 0.8, 0.4, d / 2 - 1.3, { c: 0x2a2a2e }); put(shelf, w / 2 - 0.63, 0.9, ry - HALF, 1.5, 1.9, { c: OAK, goods: [0xe8e4d8, 0x8a9ab0, 0xd8cdb0] });
    } else if (kind === 'cafe') {                        // the café, which is also the mairie: zinc counter and bottles, two tables, the mayor's desk under the notice board
      bx(M.woodH, 0.6, 1.05, 3.0, -3.0, 0, -1.9, { c: 0x9a7a52, solid: true }); bx(M.metal, 0.7, 0.04, 3.1, -3.0, 1.05, -1.9, { c: 0xa8b0b4 });
      put(shelf, -4.35, -1.9, ry + HALF, 2.8, 2.1, { c: OAK, goods: [0x2e5a34, 0x8a5a1c, 0x6a1c1c, 0xd8cdb0] });
      for (const [i, lz] of [[0, -2.9], [1, -2.2], [2, -1.2]]) cy(M.flat, 0.04, 0.045, 0.26, -3.0, 1.09, lz, { c: [0x2e5a34, 0x8a5a1c, 0x2e5a34][i], seg: 7 });
      for (const [lx, lz] of [[2.7, 1.5], [0.2, 2.5]]) { put(table, lx, lz, ry, { c: OAK, w: 0.9, d: 0.9 }); for (const s of [-1, 1]) cy(M.wood, 0.17, 0.15, 0.45, lx + s * 0.75, 0, lz, { c: 0xa08058, seg: 8 }); cy(M.flat, 0.04, 0.045, 0.26, lx + 0.1, 0.78, lz, { c: 0x2e5a34, seg: 7 }); cy(M.flat, 0.035, 0.03, 0.09, lx - 0.2, 0.78, lz + 0.15, { c: 0xd8e0e0, seg: 7 }); }
      stove(4.1, 3.0);
      put(table, 3.6, -0.6, ry + HALF, { w: 1.4, d: 0.7, c: 0x8a6a48 }); chair(4.25, -0.6, -HALF); bx(M.flat, 0.5, 0.03, 0.36, 3.6, 0.78, -0.5, { c: 0xe8e0c8 }); bx(M.flat, 0.3, 0.07, 0.22, 3.55, 0.78, -1.0, { c: 0x3a2a22 });
      bx(M.woodH, 0.05, 1.0, 1.5, 4.57, 1.2, -0.6, { c: 0x7a5c3c }); for (const [lz, ly, s] of [[-1.1, 1.6, 0.34], [-0.6, 1.5, 0.42], [-0.1, 1.65, 0.3], [-0.55, 1.28, 0.26]]) bx(M.flat, 0.02, s * 1.3, s, 4.54, ly - 0.25, lz, { c: 0xe8e0c8 });
      if (lit) bx(M.glow, 0.1, 0.24, 0.1, 3.75, 0.78, -0.2, { c: 0xffb050 });
      { const { put: put2, bx: bx2, who: who2 } = K2;      // upstairs: the innkeeper's room. His wife watches the square from the window.
        put2(bed, -3.9, -2.3, ry, { c: OAK, w: 1.3, blanket: 0x6a3a3a }); bx2(M.woodH, 0.55, 2.0, 1.4, -4.3, 0, 1.6, { c: 0x8a6a48, solid: true }); put2(chest, -1.9, 3.2, ry + Math.PI, { c: OAK });
        put2(table, 3.8, 2.9, ry, { c: OAK, w: 0.9, d: 0.7 }); bx2(M.flat, 0.3, 0.12, 0.3, 3.8, 0.78, 2.9, { c: 0xe8e4d8 }); bx2(M.cloth, 2.2, 0.02, 1.5, 0.6, 0.004, 1.0, { c: 0x6a3a3a });
        who2('frenchWoman', 2.0, 3.0, 0, { arms: [-0.75, -0.1] }); }
    } else if (kind === 'bakery') {                      // the bakery: the oven is hot, the trough full of flour, the first loaves lie on the shelves
      bx(M.stone, 2.2, 2.0, 1.9, 2.95, 0, -2.4, { c: 0xb8a890, solid: true }); bx(M.flat, 0.8, 0.5, 0.06, 2.95, 0.75, -1.43, { c: 0x120c08 }); bx(M.glow, 0.62, 0.16, 0.05, 2.95, 0.77, -1.435, { c: 0xff7a20 });
      bx(M.stone, 0.7, 0.64, 0.7, 2.95, 2.0, -2.8, { c: 0xb8a890 }); rod(B, M.wood, K.at(1.4, 0.04, -0.5), K.at(1.7, 1.9, -1.5), 0.025, 0x8a6a44);
      bx(M.woodH, 1.6, 0.7, 0.75, -0.2, 0, -2.85, { c: 0xa07a4e, solid: true }); bx(M.cloth, 1.45, 0.05, 0.6, -0.2, 0.7, -2.85, { c: 0xf0ece0 });
      bx(M.woodH, 2.4, 0.95, 0.6, -0.3, 0, 0.9, { c: 0xa08058, solid: true });
      for (let i = 0; i < 5; i++) B.geo(M.flat, new THREE.SphereGeometry(0.16, 8, 6), [...K.at(-1.2 + i * 0.42, 1.03, 0.9 + (i % 2) * 0.08)], [0, i, 0], [1, 0.55, i % 2 ? 1.5 : 1], i % 2 ? 0xb8843c : 0xc89a5a);
      put(shelf, 3.87, 1.6, ry - HALF, 2.4, 2.0, { c: OAK, goods: [0xc89a5a, 0xb8843c, 0xd8b070] }); put(sacks, -3.3, -2.5, ry + HALF, { w: 1.4, c: 0xd8d0c0 });
      who('frenchMan', 2.95, -0.5, Math.PI, { pose: 'carry', over: { hat: null, shirt: 0xe8e4d8, extras: ['apron'], apron: 0xe8e4d8, bib: true, pants: 0x8a8478 } });
      who('frenchWoman', -0.3, 0.15, 0, { pose: 'hips', over: { extras: ['dress', 'apron'], apron: 0xe8e4d8, bib: true, face: ['bun'] } });
    } else if (kind === 'school') {                      // the village school: three rows of desks, the teacher's desk, blackboard, wall map and stove
      for (const lx of [1.2, -0.3, -1.8]) { put(table, lx, -1.6, ry + HALF, { w: 2.6, d: 0.45, h: 0.66, c: 0xa08058, solid: false }); put(bench, lx - 0.5, -1.6, ry + HALF, { w: 2.6, h: 0.42, c: 0xa08058 }); }
      put(table, 3.0, -1.2, ry + HALF, { w: 1.4, d: 0.7, c: 0x8a6a48 }); B.geo(M.flat, new THREE.SphereGeometry(0.15, 10, 8), [...K.at(3.0, 0.99, -1.7)], [0.4, 0, 0], 1, 0x4a6a8a); cy(M.wood, 0.06, 0.09, 0.07, 3.0, 0.78, -1.7, { c: 0x7a5c3c, seg: 8 });
      bx(M.woodH, 0.06, 1.34, 2.54, 4.08, 0.88, -1.2, { c: 0x9a7a52 }); bx(M.flat, 0.05, 1.2, 2.4, 4.05, 0.95, -1.2, { c: 0x1e2a24 }); for (let i = 0; i < 3; i++) bx(M.flat, 0.01, 0.025, 1.5 - i * 0.4, 4.02, 1.8 - i * 0.22, -1.4 - i * 0.2, { c: 0xdcdcd4 });
      bx(M.flat, 1.5, 1.1, 0.03, -2.6, 1.15, -3.33, { c: 0xd8cfa8 }); for (const [a, b, c] of [[-2.9, 1.7, 0x9ab08a], [-2.4, 1.5, 0xc8a878], [-2.7, 1.35, 0xb89aa8]]) bx(M.flat, 0.5, 0.3, 0.035, a, b, -3.33, { c });
      stove(3.4, 2.7);
      who('frenchWoman', 3.2, 0.5, -HALF, { pose: 'carry', over: { extras: ['dress', 'collar'], face: ['bun'], dress: 0x3a3a44, shirt: 0x3a3a44, sleeve: 0x3a3a44 } });
    } else if (kind === 'forge') {                       // the smithy: hearth under its hood, bellows, anvil, quenching tub, the bench with the tools, coal in the corner
      bx(M.stone, 1.8, 0.9, 1.1, 2.3, 0, -2.75, { c: 0x8a8478, solid: true }); bx(M.glow, 1.0, 0.06, 0.6, 2.3, 0.9, -2.75, { c: 0xff5a18 }); bx(M.metal, 1.9, 0.8, 1.2, 2.3, 1.84, -2.75, { c: 0x2a2a2e });
      bx(M.woodH, 0.6, 0.3, 1.0, 3.75, 0.55, -2.6, { c: 0x5a3a22 }); bx(M.wood, 0.12, 0.55, 0.12, 3.75, 0, -2.6, { c: 0x7a5c3c });
      cy(M.wood, 0.28, 0.32, 0.5, 1.7, 0, -1.0, { c: 0x9a7a52, solid: true, seg: 8 }); bx(M.metal, 0.3, 0.16, 0.2, 1.7, 0.5, -1.0, { c: 0x2a2a2e }); bx(M.metal, 0.66, 0.12, 0.2, 1.7, 0.66, -1.0, { c: 0x2a2a2e });
      cy(M.wood, 0.4, 0.36, 0.55, 3.3, 0, -0.9, { c: 0xa08058, solid: true, seg: 12 }); cy(M.flat, 0.36, 0.36, 0.02, 3.3, 0.5, -0.9, { c: 0x0c1820, seg: 12 });
      put(table, -3.6, -0.6, ry + HALF, { w: 2.6, d: 0.8, h: 0.9, c: 0x9a7a52 }); bx(M.metal, 0.2, 0.25, 0.2, -3.5, 0.9, -1.5, { c: 0x2a2a2e }); for (const [lz, t] of [[-0.6, 0.5], [0.0, -0.3], [0.4, 1.2]]) bx(M.wood, 0.34, 0.05, 0.05, -3.6, 0.9, lz, { ry: ry + t, c: 0xa07a4e });
      for (let i = 0; i < 4; i++) B.geo(M.metal, new THREE.TorusGeometry(0.1, 0.022, 4, 8, 4.4), [...K.at(-4.07, 1.6 + (i % 2) * 0.3, -1.4 + i * 0.5)], [0, ry + HALF, -0.6], 1, 0x3a3a3e);
      for (let i = 0; i < 3; i++) rod(B, M.metal, K.at(-3.6, 0, 2.5 + i * 0.2), K.at(-4.06, 2.3, 2.6 + i * 0.2), 0.016, 0x3a3a3e);
      B.geo(M.wood, new THREE.TorusGeometry(0.52, 0.045, 5, 14), [...K.at(3.98, 0.56, 1.6)], [0, ry + HALF, 0], 1, 0x9a7a52); put(rubble, -3.3, -2.7, 0.8, 0x1c1c20, 6);
    } else if (kind === 'manor') {                       // the manor, taken over as a headquarters: dining table, the library, the commander's desk with a field telephone, the fireplace
      put(table, 2.4, -1.1, ry, { w: 3.2, d: 1.1, c: 0x8a6a48 }); for (const [lx, lz, t] of [[1.4, -1.95, 0], [3.4, -1.95, 0], [1.4, -0.25, Math.PI], [3.4, -0.25, Math.PI]]) chair(lx, lz, t);
      for (const lx of [1.6, 3.2]) { cy(M.metal, 0.02, 0.05, 0.3, lx, 0.78, -1.1, { c: 0xb8923a, seg: 6 }); bx(M.glow, 0.04, 0.08, 0.04, lx, 1.08, -1.1, { c: 0xffb050 }); }
      put(shelf, -3.6, -3.87, ry, 2.8, 2.2, { c: OAK, goods: [0x6a1c1c, 0x1c3a2a, 0x3a2a1a, 0x8a7a52] }); put(shelf, 4.5, -3.87, ry, 2.8, 2.2, { c: OAK, goods: [0x3a2a1a, 0x8a7a52, 0x1c2a4a, 0x6a1c1c] });
      bx(M.woodH, 0.5, 2.1, 0.35, 1.7, 0, -3.9, { c: 0x7a5c3c }); bx(M.flat, 0.3, 0.3, 0.02, 1.7, 1.5, -3.715, { c: 0xe8e0c8 });
      put(table, -4.6, 0.6, ry + HALF, { w: 1.8, d: 0.9, c: 0x7a5c3c }); chair(-5.5, 0.6, HALF, 0x7a5c3c);
      bx(M.flat, 0.2, 0.16, 0.3, -4.6, 0.78, 1.1, { c: 0x3a4038 }); bx(M.flat, 0.07, 0.06, 0.24, -4.6, 0.94, 1.1, { c: 0x15151a }); bx(M.flat, 0.36, 0.02, 0.5, -4.6, 0.78, 0.3, { c: 0xe8e0c8 }); bx(M.glow, 0.1, 0.2, 0.1, -4.85, 0.78, -0.1, { c: 0xffb050 });
      bx(M.flat, 0.03, 1.2, 1.9, -6.57, 1.1, 0.6, { c: 0xd8cfa8 }); for (let i = 0; i < 5; i++) bx(M.flat, 0.035, 0.03, 0.4 + (i % 2) * 0.3, -6.56, 1.4 + (i % 3) * 0.3, 0.2 + i * 0.2, { c: i % 2 ? 0xb81c1c : 0x1c3a7a });
      bx(M.stone, 0.5, 1.5, 1.9, 6.35, 0, 1.0, { c: 0xc8c2b4, solid: true }); bx(M.flat, 0.06, 0.85, 1.0, 6.08, 0, 1.0, { c: 0x120c08 }); bx(M.glow, 0.06, 0.1, 0.6, 6.04, 0.04, 1.0, { c: 0xff7a20 }); bx(M.stone, 0.7, 0.1, 2.1, 6.3, 1.5, 1.0, { c: 0xa8a294 });
      bx(M.metal, 0.04, 0.9, 1.2, 6.57, 1.7, 1.0, { c: 0xb8923a }); bx(M.flat, 0.045, 0.74, 1.04, 6.56, 1.78, 1.0, { c: 0x3a4a44 });
      chair(4.9, 1.0, HALF, 0x6a2a2a); bx(M.cloth, 2.0, 0.02, 1.5, 4.3, 0.004, 1.0, { c: 0x6a3a3a }); put(chest, 5.0, 3.75, ry + Math.PI, { c: OAK, w: 1.6, h: 0.9 });
    }
  };
  /** Stone house with a slate roof; front (+Z local) has the door. kind = what it is inside (see furnish); the café has its upper floor open, up a stair. */
  const house = (x, z, ry, w = 8, d = 7, h = 5.4, lit = false, kind = 'home') => {
    const P = frame(x, z, ry), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, y = yf - 0.3, f = yf + 0.06;
    const up = kind === 'cafe', U = yf + 2.96, uy = up ? 4.15 : 3.4, joists = { mat: M.woodH, c: 0x7a6448 };
    room(B, M, x, yf, z, { w, d, h: 2.7, t: 0.4, ry, mat: M.stone, c: STONE, base: 2.6, doors: [{ side: 's', at: -w * 0.22, w: 1.6, h: 2.15 }],
      wins: [{ side: 's', at: w * 0.2, w: 0.9, y: 1.05, h: 1.15 }].concat(up ? [] : [{ side: 'n', at: 0, w: 0.9, y: 1.05, h: 1.15 }]), floor: { mat: M.woodH, c: 0x8a7252 }, ceil: up ? false : joists });
    if (up) {                                            // a second room above, its floor left open over the stair that climbs along the back wall
      const xt = -1, zs = -d / 2 + 1.15;
      room(B, M, x, yf + 2.9, z, { w, d, h: h - 3.1, t: 0.4, ry, mat: M.stone, c: STONE, base: 0.2, floor: false, ceil: joists,
        wins: [{ side: 's', at: w * 0.2, w: 0.9, y: 0.95, h: 1.2 }, { side: 's', at: -w * 0.22, w: 0.9, y: 0.95, h: 1.2 }] });
      for (const [a, b, sw, sd] of [[(xt - w / 2 + 0.1) / 2, 0, xt + w / 2 - 0.1, d - 0.2], [(xt + w / 2 - 0.1) / 2, 0.9, w / 2 - xt - 0.1, d - 2.0], [(xt + 3.5 + w / 2) / 2, -d / 2 + 1.0, w / 2 - xt - 3.7, 1.8]]) { const [sx, sz] = P(a, b); B.box(M.woodH, sw, 0.26, sd, sx, yf + 2.7, sz, { ry, c: 0x8a7252, solid: true }); }
      { const [sx, sz] = P(xt, zs); steps(B, M, sx, sz, ry + HALF, U, 7, { w: 1.5, rise: 2.9 / 8, run: 0.45, mat: M.woodH, c: 0x9a8262 }); }
    } else B.box(M.stone, w, h - 2.9, d, x, yf + 2.9, z, { ry, c: STONE, solid: true });                                // elsewhere the upper floor stays shut
    steps(B, M, ...P(-w * 0.22, d / 2), ry, f, 6, { w: 1.8, c: 0xa8a294 });
    furnish(kind, kit(P, f, ry), w, d, ry, lit, up && kit(P, U, ry));
    B.geo(M.shingle, prismGeo(d + 0.8, 2.6, w + 0.9, 3), [x, y + h + 0.3, z], [0, ry + Math.PI / 2, 0], 1, SLATE);
    for (const e of [-1, 1]) { const [gx, gz] = P(e * (w / 2 + 0.01), 0); B.geo(M.stone, prismGeo(d, 2.3, 0.3, 3), [gx, y + h + 0.3, gz], [0, ry + Math.PI / 2, 0], 1, STONE); }
    const [dx, dz] = P(-w * 0.22 - 0.85, d / 2 + 0.55); B.box(M.woodH, 0.1, 2.15, 1.1, dx, yf, dz, { ry, c: 0x3a4a44 });      // door, standing open
    for (const [lx, ly] of [[w * 0.2, 1.3], [-w * 0.22, uy], [w * 0.2, uy]]) {
      const [wx, wz] = P(lx, d / 2 + 0.03);
      if (ly > 2 && !up) B.box(M.flat, 0.9, 1.2, 0.08, wx, y + ly, wz, { ry, c: 0x10161c });
      for (const s of [-1, 1]) { const [sx, sz] = P(lx + s * 0.68, d / 2 + 0.05); B.box(M.woodH, 0.42, 1.25, 0.05, sx, y + ly - 0.02, sz, { ry, c: 0x52686a }); }
    }
    const [cx, cz] = P(w * 0.3, 0); B.box(M.stone, 0.8, 1.7, 0.8, cx, y + h + 1.6, cz, { ry, c: 0xb0a898 });
  };
  const sandbags = (x0, z0, x1, z1, rows = 4) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), n = Math.max(2, Math.round(len / 0.62));
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) { const t = (i + (r % 2) * 0.5) / n; if (t > 1) continue; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; B.box(M.cloth, 0.6, 0.22, 0.36, x, world.height(x, z) + r * 0.21 - 0.05, z, { ry: ry + (R() - 0.5) * 0.15, c: R.pick([0xa6976c, 0x968860, 0xb2a478]) }); }
    world.addBox((x0 + x1) / 2, (z0 + z1) / 2, len, 0.5, ry, -5, world.height((x0 + x1) / 2, (z0 + z1) / 2) + rows * 0.21);
  };
  const wire = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), n = Math.round(len / 3);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; B.box(M.wood, 0.1, 1.5, 0.1, x, world.height(x, z) - 0.2, z, { c: 0x4a3c2c, rz: (i % 2 ? 0.12 : -0.1) }); }
    const y = world.height((x0 + x1) / 2, (z0 + z1) / 2);
    for (const hh of [0.35, 0.75, 1.15]) B.box(M.flat, len, 0.025, 0.025, (x0 + x1) / 2, y + hh, (z0 + z1) / 2, { ry, c: 0x2a2a2c });
    world.addBox((x0 + x1) / 2, (z0 + z1) / 2, len, 0.4, ry, -5, y + 1.3);
  };
  /** Plain military cross marking (white outline, black bars). */
  const cross = (x, y, z, ry, s = 0.5) => { const P = frame(x, z, ry); B.box(M.flat, s, s * 0.34, 0.03, x, y - s * 0.17, z, { ry, c: 0xf0f0f0 }); B.box(M.flat, s * 0.34, s, 0.03, x, y - s * 0.5, z, { ry, c: 0xf0f0f0 }); const [fx, fz] = P(0, 0.02); B.box(M.flat, s * 0.9, s * 0.18, 0.03, fx, y - s * 0.09, fz, { ry, c: 0x101010 }); B.box(M.flat, s * 0.18, s * 0.9, 0.03, fx, y - s * 0.45, fz, { ry, c: 0x101010 }); };
  const wheel = (x, y, z, ry, r = 0.45) => B.geo(M.flat, new THREE.CylinderGeometry(r, r, 0.26, 12), [x, y, z], [0, ry, Math.PI / 2], 1, 0x15151a);
  const truck = (x, z, ry) => {
    const P = frame(x, z, ry), y = world.height(x, z);
    B.box(M.flat, 2.1, 1.5, 1.7, ...(() => { const [a, b] = P(0, 2.1); return [a, y + 0.75, b]; })(), { ry, c: GREY });
    { const [a, b] = P(0, 3.25); B.box(M.flat, 1.7, 0.75, 0.9, a, y + 0.65, b, { ry, c: GREY }); }
    { const [a, b] = P(0, -0.7); B.box(M.woodH, 2.2, 0.25, 4.0, a, y + 0.85, b, { ry, c: 0x4e5648 }); B.geo(M.cloth, new THREE.CylinderGeometry(1.1, 1.1, 3.9, 12, 1, true, 0, Math.PI), [a, y + 1.1, b], [Math.PI / 2, ry + Math.PI / 2, 0], [1, 1, 1.25], 0x5a6050); }
    for (const [lx, lz] of [[1.05, 2.5], [-1.05, 2.5], [1.05, -1.3], [-1.05, -1.3]]) { const [a, b] = P(lx, lz); wheel(a, y + 0.45, b, ry); }
    { const [a, b] = P(1.07, 2.1); cross(a, y + 1.6, b, ry + Math.PI / 2, 0.5); }
    world.addBox(x + Math.sin(ry) * 0.6, z + Math.cos(ry) * 0.6, 2.4, 6.2, ry, y - 1, y + 2.6);
  };
  const tank = (x, z, ry) => {
    const P = frame(x, z, ry), y = world.height(x, z), C = 0x8a7c54;
    B.box(M.flat, 2.9, 0.95, 5.8, x, y + 0.55, z, { ry, c: C });
    for (const s of [-1, 1]) { const [a, b] = P(s * 1.5, 0); B.box(M.flat, 0.6, 0.8, 6.2, a, y + 0.05, b, { ry, c: 0x2a2a2c }); for (let i = 0; i < 6; i++) { const [wx, wz] = P(s * 1.82, -2.5 + i); wheel(wx, y + 0.42, wz, ry, 0.38); } }
    { const [a, b] = P(0, 2.7); B.box(M.flat, 2.9, 0.7, 1.2, a, y + 0.75, b, { ry, rx: 0.5, c: C }); }
    { const [a, b] = P(0, 0.2); B.box(M.flat, 2.2, 0.85, 2.6, a, y + 1.5, b, { ry, c: C }); B.cyl(M.flat, 0.4, 0.4, 0.3, a, y + 2.35, b - 0, { c: C, seg: 10 }); }
    { const [a, b] = P(0, 3.0); B.geo(M.metal, new THREE.CylinderGeometry(0.09, 0.11, 3.6, 8), [a, y + 1.95, b], [Math.PI / 2, ry, 0], 1, 0x3a3a3c); }
    for (const s of [-1, 1]) { const [a, b] = P(s * 1.12, 0.2); cross(a, y + 2.15, b, ry + s * Math.PI / 2, 0.55); }
    world.addBox(x, z, 3.7, 6.4, ry, y - 1, y + 2.5);
  };
  /** A gun casemate, open at the back: the gun room with its gun, shells and hoist. The gun looks out to sea through the embrasure. perch = a ladder leans against the roof, and a camouflage net is stretched up there. */
  const casemate = (x, z, perch = false) => {
    const y = world.height(x, z) - 0.25, f = y + 0.36, { bx, cy, at } = kit(frame(x, z, 0), f, 0);
    room(B, M, x, y + 0.3, z, { w: 10, d: 8.5, h: 3.9, t: 0.8, mat: M.plaster, c: CONCRETE, base: 2, doors: [{ side: 's', at: 0, w: 1.6, h: 2.2 }], wins: [{ side: 'n', at: 0, w: 4.6, y: 1.7, h: 1.5 }],
      floor: { mat: M.plaster, c: 0x5a5c58 }, ceil: false });
    B.box(M.plaster, 10, 1.0, 8.5, x, y + 4.2, z, { c: CONCRETE, solid: true }); B.box(M.plaster, 11.2, 0.9, 9.7, x, y + 5.2, z, { c: 0x7c7e78, solid: true });
    B.geo(M.metal, new THREE.CylinderGeometry(0.2, 0.3, 8.4, 10), [x, y + 2.85, z - 5.4], [0.1 - Math.PI / 2, 0, 0], 1, 0x6a7060);                 // the gun: barrel, breech, cradle, pedestal, hand wheel
    bx(M.metal, 0.7, 0.7, 0.9, 0, 1.7, -1.0, { c: 0x5a6052 }); bx(M.metal, 0.9, 0.45, 2.6, 0, 1.55, -2.5, { c: 0x7a8070 }); cy(M.metal, 0.75, 0.95, 1.6, 0, 0, -2.3, { c: 0x7a8070, seg: 12, solid: true });
    bx(M.metal, 1.7, 1.3, 0.08, 0, 1.6, -3.3, { c: 0x7a8070 }); B.geo(M.metal, new THREE.TorusGeometry(0.22, 0.03, 5, 12), at(0.62, 1.5, -1.9), [0, HALF, 0], 1, 0x1c1c1e);
    bx(M.woodH, 0.5, 0.4, 3.4, -3.9, 0, 0.9, { c: 0x4a3e30, solid: true });                                                                   // shells standing ready, crates, the trolley under the hoist rail
    for (let i = 0; i < 14; i++) { const lx = -4.0 + (i % 2) * 0.24, lz = -0.55 + (i >> 1) * 0.48; cy(M.metal, 0.085, 0.085, 0.5, lx, 0.4, lz, { c: 0xa88a3a, seg: 8 }); cy(M.metal, 0.02, 0.085, 0.22, lx, 0.9, lz, { c: 0x4a4e48, seg: 8 }); }
    for (const [lz, sz, t] of [[2.7, 0.9, 0.1], [1.7, 0.8, -0.15], [0.75, 0.7, 0.2]]) { bx(M.wood, sz, sz, sz, 3.72, 0, lz, { ry: t, c: 0x6a6a52 }); bx(M.woodH, sz + 0.04, 0.1, sz + 0.04, 3.72, sz - 0.1, lz, { ry: t, c: 0x4a4a3a }); } world.addBox(x + 3.72, z + 1.75, 0.95, 2.9, 0, f, f + 0.8);
    bx(M.metal, 0.14, 0.2, 6.4, 1.6, 3.7, 0.3, { c: 0x2a2a2e }); bx(M.metal, 0.03, 1.3, 0.03, 1.6, 2.4, 1.6, { c: 0x2a2a2e }); B.geo(M.metal, new THREE.TorusGeometry(0.09, 0.025, 4, 8, 4.4), at(1.6, 2.32, 1.6), [0, 0, -2.2], 1, 0x2a2a2e);
    bx(M.metal, 0.7, 0.44, 1.1, 1.6, 0, 1.6, { c: 0x3a3e3a }); B.geo(M.metal, new THREE.CylinderGeometry(0.085, 0.085, 0.6, 8), at(1.6, 0.53, 1.6), [HALF, 0, 0], 1, 0xa88a3a);
    bx(M.glow, 0.3, 0.07, 0.3, -1.2, 3.75, 1.8, { c: 0xffd9a0 }); bx(M.metal, 1.5, 2.2, 0.08, 1.7, 0, 4.32, { c: 0x3a3e3a });
    for (const s of [-1, 1]) { B.box(M.plaster, 2.4, 3.2, 5, x + s * 6, y, z + 1.5, { rz: s * -0.5, c: 0x4e5a3c }); world.addBox(x + s * 6.3, z + 1.5, 2.6, 5, 0, y, y + 2.4); }   // earth banked against the walls
    if (perch) {                                           // up the ladder at the back: a camouflage net on the roof. Crouch under it and watch the yard.
      ladder(B, M, x - 3.4, z + 4.85, 0, 1, world.height(x - 3.4, z + 5.6), y + 6.1, { lean: 0.1 });
      B.box(M.cloth, 4.6, 0.06, 4.2, x + 2.6, y + 7.34, z + 1.6, { c: 0x4a5236, solid: true }); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(M.wood, 0.1, 1.3, 0.1, x + 2.6 + a * 2.2, y + 6.1, z + 1.6 + b * 2.0, { c: 0x3a3028 });
      for (let i = 0; i < 7; i++) B.box(M.cloth, 0.9 + (i % 3) * 0.5, 0.03, 0.7 + (i % 2) * 0.5, x + 1.0 + (i % 4) * 1.05, y + 7.4, z + 0.2 + (i % 3) * 1.3, { ry: i, c: i % 2 ? 0x3a4426 : 0x6a6a44 });
    }
  };
  /** A trench line revetted with boards and sandbags, 1.3 m high: whoever crouches in it is not seen from outside. pts = its centre line. */
  const trench = (pts) => {
    const dir = (i) => { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az); return [(bx - ax) / L, (bz - az) / L]; };
    for (const sd of [-1, 1]) {
      const off = pts.map(([px, pz], i) => {                                    // the wall line, mitred at the bends
        const [ax, az] = dir(Math.max(0, i - 1)), [bx, bz] = dir(Math.min(pts.length - 2, i)), mx = -az - bz, mz = ax + bx, ml = Math.hypot(mx, mz), k = sd / (ml * ((mx * -az + mz * ax) / ml));
        return [px + mx * k, pz + mz * k];
      });
      for (let i = 0; i < off.length - 1; i++) {
        const [ax, az] = off[i], [bx, bz] = off[i + 1], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.min(world.height(ax, az), world.height(bx, bz), world.height(mx, mz));
        B.box(M.woodH, L + 0.2, 1.5, 0.2, mx, y - 0.4, mz, { ry, c: 0x5a4a38 }); B.box(M.cloth, L + 0.3, 0.22, 0.44, mx, y + 1.1, mz, { ry, c: i % 2 ? 0x968860 : 0xa6976c }); world.addBox(mx, mz, L + 0.2, 0.3, ry, y - 1, y + 1.32);
      }
    }
    for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], mx = (ax + bx) / 2, mz = (az + bz) / 2; B.box(M.woodH, Math.hypot(bx - ax, bz - az), 0.05, 1.1, mx, world.height(mx, mz) - 0.01, mz, { ry: Math.atan2(-(bz - az), bx - ax), c: 0x6a5a44 }); }   // duckboards
  };
  /** A goods wagon standing on the line at z = -52: its floor is high enough to crawl under. open = a low-sided wagon with a ladder at its east end, otherwise a closed van. */
  const wagon = (x, open) => {
    const z = -52, y = world.height(x, z) + 0.2, D = y + 1.22, T = D + 0.2, RED = 0x6a3a2e;
    B.box(M.woodH, 7.6, 0.2, 2.7, x, D, z, { c: 0x4a3c2c, solid: true });
    for (const s of [-1, 1]) { B.box(M.metal, 7.6, 0.24, 0.12, x, D - 0.24, z + s * 1.2, { c: 0x1c1c1e });
      B.geo(M.metal, new THREE.CylinderGeometry(0.07, 0.07, 1.7, 8), [x + s * 2.5, y + 0.62, z], [HALF, 0, 0], 1, 0x1c1c1e); world.addBox(x + s * 2.5, z, 0.3, 1.7, 0, y - 1, D);                    // a wheel set
      for (const k of [-1, 1]) { B.geo(M.metal, new THREE.CylinderGeometry(0.5, 0.5, 0.12, 14), [x + s * 2.5, y + 0.62, z + k * 0.72], [HALF, 0, 0], 1, 0x2a2a2e);
        B.geo(M.metal, new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), [x + s * 4.0, D - 0.1, z + k * 0.85], [0, 0, HALF], 1, 0x1c1c1e); B.geo(M.metal, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 10), [x + s * 4.26, D - 0.1, z + k * 0.85], [0, 0, HALF], 1, 0x1c1c1e); } }
    if (open) {                                              // low sides, the east end let down, a ladder up to the load
      for (const s of [-1, 1]) B.box(M.woodH, 7.6, 0.9, 0.1, x, T, z + s * 1.3, { c: RED, solid: true });
      B.box(M.woodH, 0.1, 0.9, 2.7, x - 3.75, T, z, { c: RED, solid: true }); ladder(B, M, x + 3.8, z, 1, 0, y, T, { c: 0x3a3a3e });
      crate(B, M, x - 2.6, T, z - 0.5, 1.0, 0.2, 0x6a6a52); crate(B, M, x - 1.4, T, z + 0.6, 0.8, -0.3, 0x6a6a52); barrel(B, M, x + 0.6, T, z - 0.7, 0x4a5248);
    } else {                                                 // a closed van with its sliding door
      B.box(M.woodH, 7.5, 2.3, 2.6, x, T, z, { c: RED, solid: true }); B.box(M.metal, 7.8, 0.12, 2.9, x, T + 2.3, z, { c: 0x3a3a3e });
      for (const s of [-1, 1]) { B.box(M.woodH, 1.9, 2.1, 0.06, x + 0.4, T + 0.08, z + s * 1.32, { c: 0x5a3026 }); B.box(M.metal, 2.6, 0.06, 0.08, x, T + 2.22, z + s * 1.34, { c: 0x1c1c1e }); for (const k of [-1, 1]) B.box(M.metal, 0.08, 2.3, 0.05, x + k * 3.7, T, z + s * 1.31, { c: 0x1c1c1e }); }
    }
  };
  /** A hay rick hollowed out by the farm children: a den to crawl into. The opening is on the local +Z side. */
  const ricks = [];
  const rick = (x, z, ry) => {
    const y = world.height(x, z) + 0.02; ricks.push([x, z]); noGrass(x, z, 3.4, 3.2, ry);
    den(B, M, x, y, z, ry, { mat: M.thatch, c: 0xc8a850, floor: { mat: M.ground, c: 0x8a7a52 } }); B.geo(M.thatch, prismGeo(4.3, 1.7, 4.1, 2), [x, y + 2.1, z], [0, ry, 0], 1, 0xb89a48);
  };

  // ---- the landing: a crashed glider and a parachute in the orchard ---------------------
  {
    const x = 11, z = 98, y = world.height(x, z), ry = 0.5, P = frame(x, z, ry);
    B.geo(M.flat, new THREE.CylinderGeometry(1.0, 0.6, 11, 10), [x, y + 1.0, z], [Math.PI / 2, ry, 0.12], 1, 0x3a4234);
    { const [a, b] = P(0.6, 2.0); B.box(M.flat, 19, 0.22, 2.6, a, y + 1.9, b, { ry, rz: 0.16, c: 0x3a4234 }); for (const k of [-6.4, -5.6, 5.6, 6.4]) { const [sx, sz] = P(k + 0.6, 2.0); B.box(M.flat, 0.5, 0.24, 2.64, sx, y + 1.9 + k * 0.16, sz, { ry, rz: 0.16, c: Math.abs(k) > 6 ? 0xf0f0f0 : 0x101010 }); } }
    { const [a, b] = P(0, -5.2); B.box(M.flat, 5, 0.16, 1.4, a, y + 1.4, b, { ry, c: 0x3a4234 }); B.box(M.flat, 0.16, 1.8, 1.6, a, y + 1.2, b, { ry, c: 0x3a4234 }); }
    world.addBox(x, z, 2.4, 11, ry, y - 1, y + 2.4);
    lamp(x - 2.5, y + 1.4, z + 3.5, 30, 14, 0xff8a40);
  }
  const fires = [[8.5, world.height(8.5, 101.5) + 0.5, 101.5]];
  {
    const x = -7, z = 89, y = world.height(x, z);
    B.geo(M.cloth, new THREE.SphereGeometry(2.6, 12, 8, 0, 6.283, 0, Math.PI / 2), [x, y + 5.2, z], [0.5, 0, 0.3], [1, 0.6, 1], 0xe8e4d8);
    for (let i = 0; i < 6; i++) B.box(M.flat, 0.02, 3.4, 0.02, x + Math.cos(i * 1.05) * 1.2, y + 2.2, z + Math.sin(i * 1.05) * 1.2, { rz: Math.cos(i * 1.05) * 0.3, rx: Math.sin(i * 1.05) * -0.3, c: 0xd8d4c8 });
    B.cyl(M.metal, 0.3, 0.3, 1.5, x, y + 1.2, z, { rz: 0.3, c: 0x4a5248, seg: 10 });
  }

  // ---- hedgerows ----------------------------------------------------------------------------
  // (the fifth number and those after it: holes worn through the hedge, to crawl through; the two hedges at x = -62.4 and -57.6 shut in the sunken lane)
  for (const h of [[-7, 100, -7, 68, 18], [7, 94, 7, 70, 14], [-62, 64, -11, 64, 26], [11, 68, 64, 68, 19], [-42, 64, -42, 30, 10], [40, 68, 40, 30, 13], [-78, 36, -63.3, 36], [-56.7, 36, -42, 36], [40, 44, 80, 44],
    [-64, -30, -9, -30, 39], [9, -34, 64, -34, 21], [-34, -30, -34, -62, 18], [36, -34, 36, -64, 18], [-80, 0, -34, 0, 20], [36, -4, 82, -4], [64, 6, 64, 40], [110, 2, 110, 42],
    [-62.4, 61, -62.4, 0.9], [-57.6, 61, -57.6, 0.9, 13, 45]]) hedge(h[0], h[1], h[2], h[3], h.slice(4));
  root.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.rock, bushes));

  // ---- farm --------------------------------------------------------------------------------
  house(-25, 50, 0.1, 10, 7, 5.2, true); house(-13, 44, 1.5, 11, 7, 4.2);
  { const y = world.height(-20, 56); B.box(M.stone, 14, 1.4, 0.5, -24, y - 0.3, 57.5, { c: STONE, solid: true }); B.cyl(M.stone, 0.9, 1.0, 0.8, -18, world.height(-18, 50) - 0.1, 50, { c: STONE, solid: true, seg: 12 }); }
  lamp(-26, world.height(-26, 54) + 2.6, 54.5, 20, 12);

  // ---- the village ------------------------------------------------------------------------------
  house(-15, 20, Math.PI / 2, 9, 7.5, 5.6); house(15, 22, -Math.PI / 2, 9, 7.5, 5.8, true, 'bakery'); house(-16, 5, Math.PI / 2, 10, 8, 6.2, true, 'cafe'); house(-15, -11, Math.PI / 2, 9, 7.5, 5.4, false, 'school');
  house(15, -16, -Math.PI / 2, 9, 7.5, 5.6, false, 'forge'); house(-27, 14, 0.2, 8, 7, 5.2); house(28, -22, 2.9, 8, 7, 5.2);
  const hanging = [];
  { // church with its tower
    const x = 24, z = 2, y = world.height(x, z) - 0.3;
    room(B, M, x, y + 0.3, z, { w: 9, d: 18, h: 3.6, t: 0.6, mat: M.stone, c: STONE, base: 2.4, doors: [{ side: 'w', at: 6, w: 2.0, h: 3.0 }, { side: 'w', at: -5.5, w: 2.2, h: 3.6 }, { side: 'e', at: -2, w: 3.4, h: 3.6 }, { side: 'n', at: 1.6, w: 2.6, h: 3.6 }],
      floor: { mat: M.cobble, c: 0xa8a294 }, ceil: false });   // the church was hit in the bombing: breaches in three walls, no roof
    for (const [lx, lz, w2, d2, hh] of [[-4.2, -8.7, 0.6, 0.6, 3.6], [4.2, -8.7, 0.6, 0.6, 2.2], [-1.8, -8.7, 2.4, 0.6, 4.4], [-4.2, 1.5, 0.6, 5, 3.0], [-4.2, 8.2, 0.6, 1.6, 4.6], [4.2, 5.5, 0.6, 6, 2.6], [4.2, -6.5, 0.6, 3, 1.4], [4.2, 0.6, 0.6, 1.4, 3.8]])
      B.box(M.stone, w2, hh, d2, x + lx, y + 3.9, z + lz, { c: STONE, solid: true });                       // what is left of the upper walls
    for (const [bx, bz, ry, rz, L] of [[0.5, -3, 0.5, 0.35, 7], [-1.5, 3.5, -0.9, 0.5, 6], [1.8, 6, 1.4, 0.25, 5]]) B.box(M.wood, L, 0.24, 0.24, x + bx, y + 1.3, z + bz, { ry, rz, c: 0x1a1612 });   // charred roof beams
    rubble(B, M, x + 1.5, y + 0.36, z - 1, 1.6, 0xb8b0a0, 9); rubble(B, M, x - 2, y + 0.36, z + 4.5, 1.3, 0xb8b0a0); rubble(B, M, x + 6.4, y + 0.3, z - 2, 1.8, 0xb8b0a0, 9); rubble(B, M, x - 0.5, y + 0.3, z - 11, 1.5, 0xb8b0a0); rubble(B, M, x - 6.2, y + 0.3, z - 5.5, 1.4, 0xb8b0a0);
    fires.push([x + 1.5, y + 1.0, z - 1]);
    people.push(person(B, M, root, 'cure', x + 0.5, y + 0.36, z - 5.9, Math.PI, { pose: 'pray' }));                                   // the curé has stayed with his church
    B.box(M.woodH, 1.0, 3.0, 0.12, x - 5.1, y + 0.3, z + 4.9, { ry: 0.5, c: 0x3a2a1c });                                             // side door, ajar
    { const f = y + 0.36;
      B.box(M.stone, 2.4, 1.1, 1.0, x, f, z - 7.4, { c: 0xc8c2b4, solid: true }); B.box(M.cloth, 2.5, 0.04, 1.1, x, f + 1.1, z - 7.4, { c: 0xf0ece0 }); B.box(M.wood, 0.1, 1.5, 0.1, x, f + 1.6, z - 8.2, { c: 0x2a2018 }); B.box(M.wood, 0.7, 0.1, 0.1, x, f + 2.5, z - 8.2, { c: 0x2a2018 });
      for (const s of [-1, 1]) { B.cyl(M.flat, 0.03, 0.03, 0.3, x + s * 0.8, f + 1.12, z - 7.4, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.045, 5, 4), [x + s * 0.8, f + 1.48, z - 7.4], [0, 0, 0], [1, 1.6, 1], 0xffb040);
        for (let i = 0; i < 5; i++) { B.box(M.woodH, 2.6, 0.45, 0.45, x + s * 2.3, f, z - 4.4 + i * 1.7, { c: 0x4a3626, solid: true }); B.box(M.woodH, 2.6, 0.5, 0.07, x + s * 2.3, f + 0.45, z - 4.2 + i * 1.7, { c: 0x4a3626 }); } } }
    { // the tower is hollow: a ladder to a landing, a second one to the broken belfry, high above the square. Its parapets hide whoever crouches.
      const tz = z + 11.4, F = y + 0.36, L1 = F + 4.4, T = y + 9.3;
      room(B, M, x, y + 0.3, tz, { w: 5.2, d: 5.2, h: 9, t: 0.6, mat: M.stone, c: STONE, base: 2.4, doors: [{ side: 'w', at: 0, w: 1.6, h: 2.4 }], wins: [{ side: 'e', at: 0, w: 0.6, y: 5.5, h: 1.2 }],
        floor: { mat: M.cobble, c: 0xa8a294 }, ceil: false });
      B.box(M.woodH, 1.8, 0.2, 4.0, x + 1.1, L1 - 0.2, tz, { c: 0x8a7252, solid: true }); ladder(B, M, x + 0.2, tz + 1.2, -1, 0, F, L1);
      B.box(M.woodH, 2.8, 0.2, 4.0, x - 0.6, T - 0.2, tz, { c: 0x8a7252, solid: true }); B.box(M.woodH, 1.2, 0.2, 2.0, x + 1.4, T - 0.2, tz - 1.0, { c: 0x8a7252, solid: true }); ladder(B, M, x + 0.8, tz + 1.0, 1, 0, L1, T);
      for (const [a, b, hh] of [[-2, -2, 3.6], [2, -2, 1.5], [-2, 2, 2.3], [2, 2, 5.2]]) B.box(M.stone, 1.2, hh, 1.2, x + a, T, tz + b, { c: STONE, solid: true });   // the broken top of the tower
      for (const [a, b, hh] of [[-2.3, 0, 0.9], [2.3, 0, 1.1], [0, -2.3, 0.7], [0, 2.3, 1.3]]) B.box(M.stone, a ? 0.6 : 2.8, hh, a ? 2.8 : 0.6, x + a, T, tz + b, { c: STONE, solid: true });
      B.box(M.wood, 0.22, 0.22, 4.4, x - 1.2, T + 2.3, tz, { c: 0x1a1612, rx: 0.14 }); B.box(M.woodH, 0.08, 2.4, 1.5, x - 2.66, y + 0.3, tz - 1.6, { c: 0x3a2a1c });        // a charred bell beam; the door stands open
      rubble(B, M, x - 1.2, F, tz - 1.2, 0.9, 0xb8b0a0, 5); crate(B, M, x + 1.4, L1, tz - 1.3, 0.7, 0.3); extraPicks.push([x - 1.0, tz - 0.9, T]);
      // a paratrooper dropped in the night, his canopy caught on the highest stump of the tower: he hangs against the east wall, kicking,
      // reaching up to the risers. (On 6 June 1944 John Steele of the 82nd Airborne hung so from the church tower of Sainte-Mère-Église.)
      { const top = T + 5.2, ax = x + 2, az = tz + 2, fx = x + 3.05, fz = tz + 2.05, fy = T + 0.6;
        const can = new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), cp = can.attributes.position;
        for (let i = 0; i < cp.count; i++) { const vx = cp.getX(i), vy = cp.getY(i), vz = cp.getZ(i); cp.setXYZ(i, vx, vy * 0.55 - Math.max(0, vx) * 0.55 + Math.sin(vz * 2.3) * 0.08, vz); }   // draped over the stump, hanging down the side he hangs on
        can.computeVertexNormals(); B.geo(M.cloth, can, [ax + 0.3, top - 0.15, az], [0, 0, -0.25], 1, 0xe2dece);
        const hx = fx - 0.05, hy = fy + 1.55;
        for (const [dx, dz] of [[1.7, -1.0], [1.9, 0.4], [1.5, 1.3], [0.8, 1.9], [0.8, -1.7]]) {   // the rigging lines, from the edge of the canopy down to his harness
          const ex = ax + 0.3 + dx * 0.6, ey = top - 0.9 - dx * 0.5, ez = az + dz, L = Math.hypot(ex - hx, ey - hy, ez - fz);
          const g = new THREE.CylinderGeometry(0.008, 0.008, L, 3); g.translate(0, L / 2, 0);
          const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xb8b4a4 })); m.position.set(hx, hy, fz); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ex - hx, ey - hy, ez - fz).normalize()); root.add(m);
        }
        const f = makeHumanoid(M, { skin: 0xd6a37c, hair: 0x5a3a1c, shirt: 0x7a7452, sleeve: 0x7a7452, pants: 0x75704e, boots: 0x4a2c1a, bootTop: true, belt: 0x3a3020, hat: 'm1', hatC: 0x4a4e3a, extras: ['bandolier'], weapon: null });
        f.group.position.set(fx, fy, fz); f.group.rotation.y = Math.PI / 2; root.add(f.group);
        f.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.14), new THREE.MeshStandardMaterial({ color: 0x5a5a3c, roughness: 0.9 })); f.mesh.position.set(0, 1.08, 0.2); f.group.add(f.mesh);   // the reserve chute on his chest
        world.addCyl(fx, fz, 0.32, fy - 0.1, fy + 1.85);
        hanging.push({ f, fy, ph: 0 }); }
    }
    B.cyl(M.metal, 0.5, 0.78, 1.0, x - 4.6, y + 0.5, z + 14.2, { rz: 1.25, c: 0x6a7a5a, seg: 12 }); world.addCyl(x - 4.6, z + 14.2, 0.8, y, y + 1.2); rubble(B, M, x + 3.4, y + 0.3, z + 14.6, 1.6, 0xb8b0a0, 9);   // the bell lies where it fell
    B.box(M.flat, 0.1, 1.4, 1.0, x - 4.52, y + 2.2, z, { c: 0x141c26 });
  }
  { const y = world.height(0, 2); B.box(M.cobble, 20, 0.14, 44, 0, y - 0.06, 2, { c: 0xb8b2a4 }); B.cyl(M.stone, 1.9, 2.1, 0.8, 0, y, 2, { c: STONE, solid: true, seg: 14 }); B.cyl(M.stone, 0.35, 0.45, 1.9, 0, y + 0.3, 2, { c: STONE, seg: 8 }); B.cyl(M.flat, 1.6, 1.6, 0.02, 0, y + 0.7, 2, { c: 0x0c1820, seg: 14 }); }
  tank(6.5, -8, 0.25); truck(-6.5, 12, 3.3);
  // checkpoint at the southern entrance
  sandbags(2.5, 29, 9, 29); sandbags(2.5, 29, 2.5, 25.5); sandbags(-9.5, 29, -3.5, 29, 3);
  { const y = world.height(0, 30); B.box(M.wood, 0.18, 1.3, 0.18, -3.2, y - 0.1, 30.2, { c: 0x2a2a2a }); B.box(M.flat, 5.6, 0.1, 0.1, -0.5, y + 1.15, 30.2, { rz: 0.06, c: 0xd8d8d8 }); for (let i = 0; i < 4; i++) B.box(M.flat, 0.7, 0.104, 0.104, -2.4 + i * 1.4, y + 1.1 + i * 0.085, 30.2, { rz: 0.06, c: 0xb81c1c });
    B.geo(M.metal, new THREE.CylinderGeometry(0.035, 0.05, 1.3, 6), [5.4, y + 1.05, 28.6], [Math.PI / 2, 0.1, 0], 1, 0x2a2a2c); lamp(-3.5, y + 2.6, 27.5, 26, 14); B.box(M.wood, 0.12, 2.8, 0.12, -3.6, y, 27.2, { c: 0x3a3028 }); B.box(M.glow, 0.2, 0.22, 0.2, -3.6, y + 2.6, 27.4, { c: 0xffa040 }); }
  barrel(B, M, 9.6, world.height(9.6, 26), 26, 0x4a5248); barrel(B, M, 10.4, world.height(10.4, 26.6), 26.6, 0x4a5248); crate(B, M, -10, world.height(-10, 26), 26, 0.9, 0.3, 0x6a6a52);
  lamp(0, world.height(0, 2) + 3.2, -2, 22, 16, 0xffc890);

  { // the farm's barn, and the marks of the night's bombing
    const x = -36, z = 45, w = 7, d = 9, P = frame(x, z, 0), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h: 4.4, t: 0.4, mat: M.stone, c: STONE, base: 2.6, doors: [{ side: 'e', at: 0, w: 3.0, h: 3.0 }],
      wins: [{ side: 'n', at: -1.6, w: 1.0, y: 1.3, h: 0.9 }, { side: 'n', at: 1.6, w: 1.2, y: 2.36, h: 1.7 }, { side: 'e', at: -3.0, w: 1.2, y: 3.0, h: 1.0 }], floor: { mat: M.ground, c: 0x8a7a52 }, ceil: { mat: M.woodH, c: 0x4a3a2c } });
    B.geo(M.shingle, prismGeo(w + 0.9, 2.6, d + 0.8, 3), [x, yf + 4.6, z], [0, 0, 0], 1, SLATE);
    // the hayloft over the north end, up a ladder: its hay door opens above the fields, its window looks down on the farmyard
    deck(B, M, x, f, z - 2.95, 0, { w: 6.2, d: 2.8, h: 2.3, ladder: 's', at: -1.8 });
    for (const [lx, lz, ly] of [[-2.3, -3.7, 0], [-0.6, -3.8, 0], [-2.3, -3.6, 0.8], [2.4, -2.2, 0]]) B.box(M.cloth, 1.5, 0.8, 0.9, x + lx, f + 2.3 + ly, z + lz, { c: 0xb8a060, solid: !ly });
    B.box(M.wood, 0.16, 0.16, 1.5, x + 1.6, yf + 4.15, z - 5.1, { c: 0x3a2e24 }); B.box(M.flat, 0.03, 1.4, 0.03, x + 1.6, yf + 2.75, z - 5.7, { c: 0xb8a070 });
    steps(B, M, x + w / 2, z, Math.PI / 2, f, 6, { w: 3.2, c: 0xa8a294 });
    for (const [lx, lz, ly] of [[-2.5, -3.6, 0], [-1.0, -3.7, 0], [-1.8, -3.65, 0.8], [-2.5, 3.6, 0], [-2.4, 2.4, 0]]) B.box(M.cloth, 1.5, 0.8, 0.9, x + lx, f + ly, z + lz, { c: 0xb8a060, solid: true });
    B.box(M.woodH, 1.2, 0.5, 2.2, x + 1.6, f + 0.5, z + 3.0, { c: 0x5a4632 }); world.addBox(x + 1.6, z + 3.0, 1.2, 2.2, 0, f, f + 1.1); for (const k of [-0.8, 0.8]) B.cyl(M.wood, 0.42, 0.42, 0.08, x + 0.95, f + 0.02, z + 3.0 + k, { rz: Math.PI / 2, c: 0x3a2e24, seg: 12 });
    extraFoes.push(['soldier', x - 0.4, z - 0.5, { up: 1.8, patrol: false, yaw: 1.57 }], ['soldier', 25.6, 7, { up: 1.6, patrol: false }]);
    extraPicks.push([x - 2.4, z + 0.6, 0, 1.8]);
    for (const [cx, cz, r] of [[-18, -46, 2.6], [22, -52, 2.2], [14, 58, 2.4], [50, 17, 2.8], [-52, 16, 2.4], [-24, 78, 2.0]]) {                     // bomb craters
      const y = world.height(cx, cz); B.cyl(M.flat, r, r * 0.7, 0.07, cx, y + 0.02, cz, { c: 0x16130f, seg: 14 });
      for (let k = 0; k < 4; k++) rubble(B, M, cx + Math.cos(k * 1.7) * (r + 0.5), y - 0.05, cz + Math.sin(k * 1.7) * (r + 0.5), 0.9, 0x5a5238, 4);
    }
  }
  // ---- the manor in the east, the mill in the west ----------------------------------------------
  {
    house(92, 22, -Math.PI / 2, 14, 9, 6.6, true, 'manor');
    const wall = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.min(world.height(ax, az), world.height(bx, bz), world.height(mx, mz)) - 0.8;
      B.box(M.stone, L, 2.7, 0.55, mx, y, mz, { ry, c: STONE, solid: true }); B.box(M.stone, L + 0.1, 0.14, 0.75, mx, y + 2.7, mz, { ry, c: 0x8a8478 }); };
    wall(76, 7, 104, 7); wall(76, 37, 104, 37); wall(104, 7, 104, 37); wall(76, 7, 76, 18.5); wall(76, 25.5, 76, 37);
    for (const zz of [18.5, 25.5]) { const y = world.height(76, zz); B.box(M.stone, 0.9, 3.4, 0.9, 76, y - 0.8, zz, { c: STONE, solid: true }); B.geo(M.stone, new THREE.SphereGeometry(0.34, 8, 6), [76, y + 2.9, zz], [0, 0, 0], 1, 0x8a8478); }
    truck(83, 31, 0.5); barrel(B, M, 80, world.height(80, 12), 12, 0x4a5248); barrel(B, M, 80.8, world.height(80.8, 12.5), 12.5, 0x4a5248); crate(B, M, 82, world.height(82, 11), 11, 0.9, 0.2, 0x6a6a52); crate(B, M, 98, world.height(98, 33), 33, 1.0, 0.6, 0x6a6a52);
    { const y = world.height(86, 14); B.cyl(M.stone, 1.0, 1.1, 0.85, 86, y - 0.1, 14, { c: STONE, solid: true, seg: 12 }); B.cyl(M.flat, 0.8, 0.8, 0.02, 86, y + 0.7, 14, { c: 0x0c1820, seg: 12 }); }
    sandbags(72, 19, 72, 25, 4);
    for (let i = 0; i < 3; i++) B.box(M.wood, 1.0, 0.5 + i * 0.5, 1.0, 88 + i, world.height(88 + i, 6.2), 6.2, { c: i % 2 ? 0x6a6a52 : 0x7a6a4a, solid: true });   // crates stacked against the wall outside: a back way over it into the court
    // windmill: the store below, and up a ladder the milling floor with its stones and a window over the fields to the east
    const x = -92, z = -24, w = 6.6, d = 6.6, P = frame(x, z, 0), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05;
    room(B, M, x, yf, z, { w, d, h: 3.2, t: 0.6, mat: M.stone, c: STONE, base: 3, doors: [{ side: 'e', at: 0, w: 1.7, h: 2.2 }], wins: [{ side: 's', at: 0, w: 0.8, y: 1.1, h: 1.0 }, { side: 'n', at: 0, w: 0.8, y: 1.1, h: 1.0 }],
      floor: { mat: M.woodH, c: 0x5a4632 }, ceil: false });
    steps(B, M, x + w / 2, z, Math.PI / 2, yf + 0.06, 6, { w: 2.0, c: 0xa8a294 });
    const U = yf + 3.4;
    for (const [lx, lz, sw, sd] of [[1.0, 0, 4.6, 6.6], [-2.3, -2.0, 2.0, 2.6], [-2.3, 2.0, 2.0, 2.6]]) B.box(M.woodH, sw, 0.2, sd, x + lx, yf + 3.2, z + lz, { c: 0x8a7252, solid: true });   // the floor above, open over the ladder
    ladder(B, M, x - 1.3, z, -1, 0, yf + 0.06, U);
    for (let i = 0; i < 8; i++) {                          // the wall of the milling floor, eight stone panels; the one to the east has the window
      const a = i * Math.PI / 4, px = x + Math.cos(a) * 3.0, pz = z + Math.sin(a) * 3.0;
      for (const [y0, hh] of i ? [[0, 3.2]] : [[0, 1.0], [2.2, 1.0]]) B.box(M.stone, 2.9, hh, 0.5, px, U + y0, pz, { ry: HALF - a, c: STONE, solid: true });
    }
    B.cyl(M.woodH, 3.0, 3.0, 0.2, x, U + 3.0, z, { c: 0x7a6448, seg: 12 }); B.cyl(M.stone, 2.3, 2.95, 4.3, x, yf + 6.6, z, { c: STONE, seg: 12 }); world.addBox(x, z, 6.2, 6.2, 0, U + 3.0, yf + 11);
    B.box(M.woodH, 1.8, 0.5, 1.8, x + 0.4, U, z - 1.3, { c: 0x9a7a52, solid: true }); B.cyl(M.rock, 0.75, 0.75, 0.3, x + 0.4, U + 0.5, z - 1.3, { c: 0xa8a294, seg: 14 }); B.cyl(M.rock, 0.72, 0.72, 0.28, x + 0.4, U + 0.84, z - 1.3, { c: 0xb8b0a0, seg: 14 });   // the stones, the hopper, the shaft and its great wheel
    B.geo(M.woodH, new THREE.ConeGeometry(0.5, 0.6, 4), [x + 0.4, U + 1.6, z - 1.3], [Math.PI, 0.785, 0], 1, 0xa07a4e); B.cyl(M.wood, 0.08, 0.08, 1.9, x + 0.4, U + 1.12, z - 1.3, { c: 0x6a5842, seg: 6 }); B.geo(M.wood, new THREE.TorusGeometry(0.8, 0.07, 5, 14), [x + 0.4, U + 2.6, z - 1.3], [HALF, 0, 0], 1, 0x6a5842);
    sacks(B, M, x + 0.5, U, z + 1.7, 0, { w: 1.4, c: 0xd8d0b8 }); B.box(M.stone, 1.1, 0.08, 0.3, x + 3.36, U + 0.92, z, { ry: HALF, c: 0x8a8478 });
    B.geo(M.shingle, new THREE.ConeGeometry(2.8, 2.6, 12), [x, yf + 12.2, z], [0, 0, 0], 1, SLATE);
    B.cyl(M.wood, 0.14, 0.14, 1.6, x + 2.6, yf + 9.0, z, { rz: Math.PI / 2, c: 0x3a2e24, seg: 6 });
    for (let k = 0; k < 2; k++) B.box(M.wood, 0.1, 9.6, 0.16, x + 3.3, yf + 5.0, z, { rx: k * Math.PI / 2 + 0.4, c: 0x3a2e24 });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; B.box(M.cloth, 0.04, 3.4, 1.0, x + 3.36, yf + 9.8 - 1.7 + Math.cos(a) * 2.9, z - Math.sin(a) * 2.9 + Math.cos(a) * 0.5, { rx: a, c: 0xb8b0a0 }); }
    B.box(M.woodH, 1.3, 0.8, 0.8, x - 1.6, yf + 0.06, z - 1.6, { c: 0x5a4028, solid: true }); for (const [qx, qz] of [[x - 1.7, z + 1.6], [x - 0.9, z + 1.9], [x - 1.4, z + 1.2]]) B.geo(M.cloth, new THREE.SphereGeometry(0.34, 8, 6), [qx, yf + 0.3, qz], [0, 0, 0], [1, 0.75, 1], 0xd8d0b8);
    world.addBox(x - 1.4, z + 1.6, 1.4, 1.2, 0, yf, yf + 0.6);
    sandbags(-86, -20, -82, -20, 4); sandbags(-82, -20, -82, -27, 4);
  }

  // ---- north: the field of stakes, the wire, the battery -------------------------------------------
  for (let i = 0; i < 46; i++) { const x = (R() - 0.5) * 60, z = -36 - R() * 26; if (dPoly(ROAD, x, z) < 4 || holes.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 3)) continue; const y = world.height(x, z); B.cyl(M.wood, 0.1, 0.13, 3.2, x, y - 0.3, z, { c: 0x5a4a38, seg: 6, rz: (R() - 0.5) * 0.12 }); world.addCyl(x, z, 0.14, y - 1, y + 3); }
  wire(-60, -65, -46.6, -65); wire(-43.4, -65, -4.5, -65); wire(8.5, -65, 62, -65);
  casemate(-27, -86, true); casemate(27, -86);
  { // command bunker
    const x = 0, z = -86, y = world.height(x, z) - 0.4;
    room(B, M, x, y + 0.3, z, { w: 12, d: 8, h: 3.3, t: 0.7, mat: M.plaster, c: CONCRETE, base: 2, doors: [{ side: 's', at: -4, w: 1.7, h: 2.2 }], wins: [{ side: 's', at: 1.6, w: 6, y: 1.45, h: 0.5 }],
      floor: { mat: M.plaster, c: 0x5a5c58 }, ceil: { mat: M.plaster, c: CONCRETE } });
    B.box(M.plaster, 13.4, 0.8, 9.2, x, y + 3.6, z, { c: 0x7c7e78 });
    { const f = y + 0.36;                                                                                  // inside: map table, radio, bunks
      B.box(M.woodH, 2.6, 0.8, 1.4, x + 1.5, f, z - 0.6, { c: 0x4a3e30, solid: true }); B.box(M.flat, 2.2, 0.02, 1.1, x + 1.5, f + 0.8, z - 0.6, { c: 0xd8cfa8 });
      for (let i = 0; i < 5; i++) B.box(M.flat, 0.5 + (i % 2) * 0.3, 0.022, 0.03, x + 1.0 + (i % 3) * 0.4, f + 0.82, z - 0.9 + i * 0.16, { ry: i * 0.5, c: i % 2 ? 0xb81c1c : 0x1c3a7a });
      B.box(M.metal, 1.0, 0.7, 0.5, x + 5.0, f + 0.75, z - 3.0, { c: 0x3a4038 }); B.box(M.woodH, 1.3, 0.75, 0.6, x + 5.0, f, z - 3.0, { c: 0x4a3e30, solid: true }); B.box(M.glow, 0.12, 0.06, 0.02, x + 4.8, f + 1.2, z - 2.74, { c: 0x60ff80 });
      for (const k of [0, 1]) { B.box(M.metal, 0.9, 0.08, 1.9, x - 4.7, f + 0.4 + k * 0.95, z - 2.4, { c: 0x3a3e3a }); B.box(M.cloth, 0.85, 0.1, 1.8, x - 4.7, f + 0.48 + k * 0.95, z - 2.4, { c: 0x5c6458 }); }
      world.addBox(x - 4.7, z - 2.4, 0.9, 1.9, 0, f, f + 1.6);
      lamp(x + 1, f + 2.7, z - 0.5, 22, 11, 0xffd9a0); }
    B.cyl(M.wood, 0.06, 0.08, 7, x + 5, y + 4.4, z + 2, { c: 0x3a3a3a, seg: 6 }); B.box(M.cloth, 2.0, 1.3, 0.04, x + 6.05, y + 10.4, z + 2, { c: 0x3a3e3a });
    cross(x + 6.05, y + 11.3, z + 2.03, 0, 0.9);
    sandbags(-8, -79.5, -2.5, -79.5, 4); sandbags(2.5, -79.5, 8, -79.5, 4);
    lamp(-4, y + 3.2, z + 5.6, 30, 15); lamp(6, y + 3.2, z + 7, 26, 15);
  }
  { // ---- the trench: through a gap in the wire to the western casemate, and out to the lookout on the cliff ----------------
    trench([[-45, -58.5], [-45, -66]]); trench([[-45, -68], [-54, -77], [-61.5, -83], [-61.5, -86.4]]); trench([[-43.6, -67.2], [-36, -72.5], [-30.5, -79.5]]);
    // the lookout: a low concrete post with a slit over the sea; a ladder leads to its roof, where the rangefinder stands behind sandbags
    const x = -61.5, z = -89.8, y = world.height(x, z) - 0.3, T = y + 3.3, { put, bx, at } = kit(frame(x, z, 0), y + 0.36, 0);
    room(B, M, x, y + 0.3, z, { w: 4.8, d: 4.4, h: 2.4, t: 0.5, mat: M.plaster, c: CONCRETE, base: 2, doors: [{ side: 's', at: 0, w: 1.5, h: 2.1 }],
      wins: [{ side: 'n', at: 0, w: 3.4, y: 1.25, h: 0.6 }], floor: { mat: M.plaster, c: 0x5a5c58 }, ceil: { mat: M.plaster, c: CONCRETE } });
    B.box(M.plaster, 5.4, 0.4, 5.0, x, y + 2.9, z, { c: 0x7c7e78, solid: true }); ladder(B, M, x + 2.7, z + 1.5, 1, 0, world.height(x + 3.2, z + 1.5), T, { c: 0x3a3a3e });
    B.box(M.cloth, 5.0, 0.6, 0.45, x, T, z - 2.2, { c: 0xa6976c, solid: true }); B.box(M.cloth, 0.45, 0.6, 4.4, x - 2.4, T, z, { c: 0x968860, solid: true }); B.box(M.cloth, 0.45, 0.6, 2.8, x + 2.4, T, z - 0.8, { c: 0xb2a478, solid: true });
    B.cyl(M.metal, 0.1, 0.16, 1.25, x, T, z - 1.0, { c: 0x3a3e3a, seg: 8, solid: true }); B.geo(M.metal, new THREE.CylinderGeometry(0.09, 0.09, 1.7, 8), [x, T + 1.32, z - 1.0], [0, 0, HALF], 1, 0x3a3e3a);
    for (const s of [-1, 1]) B.box(M.metal, 0.12, 0.12, 0.3, x + s * 0.8, T + 1.26, z - 1.12, { c: 0x1c1c1e });
    put(table, -1.3, 0.5, HALF, { w: 1.4, d: 0.7, c: 0x8a765a }); bx(M.wood, 0.36, 0.45, 0.36, -0.55, 0, 0.5, { c: OAK }); bx(M.flat, 0.5, 0.02, 0.7, -1.3, 0.78, 0.6, { c: 0xd8cfa8 }); bx(M.flat, 0.2, 0.16, 0.3, -1.4, 0.78, -0.05, { c: 0x3a4038 });
    bx(M.glow, 0.09, 0.16, 0.09, -1.5, 0.78, 1.05, { c: 0xffb050 }); put(crate, 1.4, 1.1, 0.7, 0.2, 0x6a6a52);
    for (let i = 0; i < 3; i++) rod(B, M.metal, at(0.4 + Math.cos(i * 2.09) * 0.35, 0, -1.1 + Math.sin(i * 2.09) * 0.35), at(0.4, 1.3, -1.1), 0.02, 0x2a2a2e); bx(M.metal, 0.34, 0.12, 0.2, 0.4, 1.3, -1.15, { c: 0x1c1c1e });
    extraFoes.push(['soldier', x + 0.6, z - 0.2, { up: 1.0, patrol: false, yaw: Math.PI }], ['soldier', -28.5, -83.8, { up: 1.0, patrol: false }], ['soldier', 29, -83.6, { up: 1.0, patrol: false }]);
    extraPicks.push([x - 1.3, z + 0.9, 0, 1.2]);
  }
  { // ---- the railway halt in the east: the line, a small station, two goods wagons left on the track -------------------------
    const zt = -52, yt = world.height(85, zt), x = 85, z = -44.6, yf = yt + 0.4, { put, bx, cy, who } = kit(frame(x, z, 0), yf + 0.06, 0);
    noGrass(99, zt, 110, 3.8); noGrass(x, -48.65, 16, 3.1); B.box(M.ground, 110, 0.6, 3.4, 99, yt - 0.4, zt, { c: 0x77736a }); world.addBox(99, zt, 110, 3.4, 0, yt - 2, yt + 0.2);
    for (const s of [-1, 1]) B.box(M.metal, 110, 0.12, 0.07, 99, yt + 0.2, zt + s * 0.72, { c: 0x3a3a3e });
    for (let sx = 44.6; sx < 132; sx += 0.8) B.box(M.wood, 0.24, 0.08, 2.5, sx, yt + 0.16, zt, { c: 0x2a2018 });
    for (const s of [-1, 1]) B.box(M.wood, 0.3, 1.3, 0.3, 44.3, yt + 0.2, zt + s * 0.72, { c: 0x5a4a3a }); B.box(M.wood, 0.3, 0.3, 2.4, 44.3, yt + 1.0, zt, { c: 0x8a1c1c }); world.addBox(44.3, zt, 0.4, 2.4, 0, yt, yt + 1.5);   // the buffer stop
    for (const px of [50, 72, 108]) { B.cyl(M.wood, 0.09, 0.12, 6.6, px, yt - 0.3, -54.8, { c: 0x5a4a3a, seg: 6 }); B.box(M.wood, 1.4, 0.1, 0.1, px, yt + 5.7, -54.8, { c: 0x5a4a3a }); }   // telegraph poles
    B.box(M.cobble, 16, 0.8, 3.1, x, yt - 0.4, -48.65, { c: 0xa8a294, solid: true });                                                    // the platform, the station behind it
    room(B, M, x, yf, z, { w: 9, d: 5, h: 3.0, t: 0.35, mat: M.stone, c: 0xc9b8a0, base: 2.4, doors: [{ side: 'n', at: -2, w: 1.6, h: 2.2 }, { side: 's', at: -2, w: 1.6, h: 2.2 }],
      wins: [{ side: 'n', at: 2.2, w: 1.0, y: 1.0, h: 1.2 }], floor: { mat: M.woodH, c: 0x8a7252 }, ceil: { mat: M.woodH, c: 0x6a5842 } });
    B.geo(M.shingle, prismGeo(5.9, 2.0, 9.9, 3), [x, yf + 3.2, z], [0, HALF, 0], 1, SLATE); for (const e of [-1, 1]) B.geo(M.stone, prismGeo(5, 1.75, 0.3, 3), [x + e * 4.51, yf + 3.2, z], [0, HALF, 0], 1, 0xc9b8a0);
    steps(B, M, x - 2, z + 2.5, 0, yf + 0.06, 2, { w: 1.8, rise: 0.23, c: 0xa8a294 });
    B.box(M.woodH, 9.4, 0.1, 2.7, x, yf + 2.75, z - 3.85, { c: 0x5a4a3a }); for (const k of [-1, 0, 1]) { B.box(M.wood, 0.14, 2.75, 0.14, x + k * 4.4, yf, -49.6, { c: 0x5a4a3a }); world.addCyl(x + k * 4.4, -49.6, 0.1, yf - 1, yf + 2.7); }   // the canopy
    for (const s of [-1, 1]) B.box(M.wood, 0.1, 2.3, 0.1, x - 6.6 + s * 1.2, yf, -47.5, { c: 0x2a2a2e }); B.box(M.flat, 2.7, 0.6, 0.04, x - 6.6, yf + 1.7, -47.5, { c: 0xf0f0f0 }); B.box(M.flat, 2.5, 0.44, 0.06, x - 6.6, yf + 1.78, -47.5, { c: 0x1c3a6a });   // the name board
    bench(B, M, x + 0.3, yf, -47.42, Math.PI, { w: 1.8, back: 0.5, c: 0x3a4a44 }); for (const [a, b] of [[5.2, -48.1], [5.65, -48.3], [5.3, -48.6]]) { B.cyl(M.metal, 0.18, 0.2, 0.5, x + a, yf, b, { c: 0x8a9096, seg: 9 }); B.cyl(M.metal, 0.1, 0.18, 0.16, x + a, yf + 0.5, b, { c: 0x8a9096, seg: 9 }); } world.addCyl(x + 5.4, -48.35, 0.5, yf - 1, yf + 0.66);
    B.box(M.metal, 0.08, 3.0, 0.08, x + 7.4, yf, -47.6, { c: 0x2a2a2e }); B.box(M.glow, 0.2, 0.24, 0.2, x + 7.4, yf + 3.0, -47.6, { c: 0xffc070 });
    bx(M.woodH, 0.3, 1.05, 3.2, 1.3, 0, -0.55, { c: 0x9a7a52, solid: true }); bx(M.wood, 0.1, 1.3, 0.1, 1.3, 1.05, 1.0, { c: 0x9a7a52 }); bx(M.woodH, 0.14, 0.1, 3.3, 1.3, 2.3, -0.55, { c: 0x9a7a52 });      // inside: the ticket counter, the office behind it, the waiting room
    bx(M.metal, 0.12, 0.04, 0.12, 1.3, 1.05, 0.3, { c: 0x2a2a2e }); bx(M.glow, 0.09, 0.14, 0.09, 1.3, 1.09, 0.3, { c: 0xffb050 }); bx(M.metal, 0.13, 0.04, 0.13, 1.3, 1.23, 0.3, { c: 0x2a2a2e });
    put(table, 3.6, -1.2, HALF, { w: 1.4, d: 0.7, c: 0x8a6a48 }); bx(M.flat, 0.4, 0.03, 0.3, 3.6, 0.78, -0.9, { c: 0xe8e0c8 }); bx(M.metal, 0.12, 0.06, 0.2, 3.55, 0.78, -1.5, { c: 0xb8923a });
    put(shelf, 3.93, 0.9, -HALF, 1.6, 1.9, { c: OAK, goods: [0xe8e0c8, 0xc8b890, 0xd8cdb0] });
    put(bench, -3.85, 0, HALF, { w: 2.4, back: 0.5, c: 0x9a7a52 }); put(bench, 0.2, -1.92, 0, { w: 1.6, back: 0.5, c: 0x9a7a52 });
    cy(M.metal, 0.3, 0.34, 0.9, 0.5, 0, 1.6, { c: 0x1c1c1e, solid: true, seg: 10 }); cy(M.metal, 0.08, 0.08, 2.0, 0.5, 0.9, 1.6, { c: 0x1c1c1e, seg: 6 });
    bx(M.woodH, 0.5, 0.5, 0.06, 0.2, 1.85, -2.12, { c: 0x7a5c3c }); bx(M.flat, 0.4, 0.4, 0.02, 0.2, 1.9, -2.085, { c: 0xe8e0c8 }); bx(M.flat, 0.03, 0.17, 0.02, 0.2, 2.1, -2.07, { c: 0x15151a }); bx(M.flat, 0.12, 0.03, 0.02, 0.26, 2.09, -2.07, { c: 0x15151a });
    bx(M.flat, 1.3, 0.9, 0.04, 0.2, 1.2, 2.12, { c: 0x26382e }); for (let i = 0; i < 3; i++) bx(M.flat, 0.34, 0.7, 0.02, -0.2 + i * 0.4, 1.3, 2.09, { c: 0xe8e0c8 });
    bx(M.woodH, 0.8, 0.5, 0.5, -3.5, 0, 1.75, { c: 0xa07a4e, ry: 0.3 }); bx(M.flat, 0.6, 0.4, 0.2, -2.9, 0, 1.9, { c: 0x8a6a48, ry: -0.3 });
    who('frenchMan', 2.4, -0.3, -HALF, { pose: 'talk', over: { shirt: 0x2a3448, vest: 0x1e2636, pants: 0x2a3040, hatC: 0x1e2636 } });                 // the railwayman keeps to his office
    wagon(64, false); wagon(101, true);
    extraFoes.push(['soldier', 80, -48.6, { up: 1.0, patrol: true }], ['soldier', 66, -47.5, {}], ['dog', 92, -56.5, {}]); extraPicks.push([100, zt, world.height(100, zt) + 1.8]);
  }
  { // ---- the cider farm in the south-west: the press house, the cart shed, the yard --------------------------------------------
    const x = -80, z = 70, w = 9, d = 6.5, yf = Math.max(world.height(x, z), world.height(x - 4.5, z - 3.2), world.height(x + 4.5, z - 3.2), world.height(x - 4.5, z + 3.2), world.height(x + 4.5, z + 3.2)) + 0.05, { put, bx, cy, at, who } = kit(frame(x, z, 0), yf + 0.06, 0);
    room(B, M, x, yf, z, { w, d, h: 3.0, t: 0.4, mat: M.stone, c: STONE, base: 2.6, doors: [{ side: 'e', at: 0.6, w: 2.2, h: 2.4 }], wins: [{ side: 's', at: -1.5, w: 0.9, y: 1.1, h: 1.0 }],
      floor: { mat: M.cobble, c: 0x9a9488 }, ceil: { mat: M.woodH, c: 0x6a5842 } });
    B.geo(M.thatch, prismGeo(d + 1.0, 3.0, w + 1.0, 2), [x, yf + 3.2, z], [0, HALF, 0], 1, 0x8a7a52); for (const e of [-1, 1]) B.geo(M.stone, prismGeo(d, 2.6, 0.3, 3), [x + e * (w / 2 + 0.01), yf + 3.2, z], [0, HALF, 0], 1, STONE);
    steps(B, M, x + w / 2, z + 0.6, HALF, yf + 0.06, 2, { w: 2.4, c: 0xa8a294 });
    bx(M.woodH, 1.7, 0.45, 1.7, -2.3, 0, -0.9, { c: 0x9a7a52, solid: true }); cy(M.wood, 0.62, 0.62, 0.75, -2.3, 0.45, -0.9, { c: 0x7a5a3a, seg: 12 }); for (const ly of [0.6, 1.05]) cy(M.metal, 0.635, 0.635, 0.05, -2.3, ly, -0.9, { c: 0x2a2a2e, seg: 12, open: true });   // the press: tub, cage, screw, beam and lever
    cy(M.metal, 0.05, 0.05, 1.5, -2.3, 0.45, -0.9, { c: 0x2a2a2e, seg: 6 }); for (const s of [-1, 1]) bx(M.wood, 0.14, 1.9, 0.14, -2.3 + s * 0.78, 0, -0.9, { c: 0x9a7a52 }); bx(M.woodH, 1.9, 0.18, 0.2, -2.3, 1.9, -0.9, { c: 0x9a7a52 });
    rod(B, M.wood, at(-2.3, 1.75, -0.9), at(-1.1, 1.3, -0.1), 0.03, 0xa07a4e); cy(M.wood, 0.2, 0.17, 0.3, -1.2, 0, -1.3, { c: 0xa07a4e, seg: 9 });
    for (const lx of [0.7, 2.1, 3.4]) { B.geo(M.wood, new THREE.CylinderGeometry(0.55, 0.55, 1.3, 12), at(lx, 0.85, -2.1), [HALF, 0, 0], 1, 0xa07a4e); for (const k of [-0.4, 0.4]) B.geo(M.metal, new THREE.CylinderGeometry(0.56, 0.56, 0.06, 12, 1, true), at(lx, 0.85, -2.1 + k), [HALF, 0, 0], 1, 0x2a2a2e); }   // three casks of last year's cider
    for (const lz of [-2.5, -1.7]) bx(M.wood, 4.2, 0.3, 0.2, 2.05, 0, lz, { c: 0x5a4a3a }); world.addBox(x + 2.05, z - 2.1, 4.2, 1.4, 0, yf, yf + 1.46);
    put(table, 2.4, 1.5, 0, { c: OAK, w: 1.6, d: 0.8 }); put(bench, 2.4, 2.3, Math.PI, { c: OAK, w: 1.6, back: 0.45 }); cy(M.flat, 0.04, 0.045, 0.24, 2.0, 0.78, 1.4, { c: 0x8a5a1c, seg: 7 }); for (const lx of [2.5, 2.9]) cy(M.flat, 0.07, 0.04, 0.06, lx, 0.78, 1.6, { c: 0xd8cdb0, seg: 8 });
    bx(M.glow, 0.09, 0.15, 0.09, 1.85, 0.78, 1.7, { c: 0xffb050 });
    for (const [lx, lz] of [[3.5, -1.2], [2.8, -0.9], [-3.6, 2.3]]) { cy(M.wood, 0.32, 0.26, 0.32, lx, 0, lz, { c: 0x8a6a3a, seg: 10, solid: true }); for (let i = 0; i < 7; i++) B.geo(M.flat, new THREE.SphereGeometry(0.075, 6, 5), at(lx + Math.cos(i * 0.9) * (i ? 0.17 : 0), 0.34, lz + Math.sin(i * 0.9) * (i ? 0.17 : 0)), [0, 0, 0], 1, i % 3 ? 0xa83a2a : 0x9aa83a); }   // baskets of apples
    B.geo(M.flat, new THREE.SphereGeometry(1, 10, 6, 0, 6.283, 0, HALF), at(-3.4, 0, 0.9), [0, 0, 0], [0.75, 0.45, 0.9], 0x8a9a3a); world.addCyl(x - 3.4, z + 0.9, 0.6, yf, yf + 0.4);
    who('frenchWoman', 2.8, 2.25, Math.PI, { pose: 'sit', seat: 0.45 }); who('frenchMan', -1.0, 0.1, -2.27, { pose: 'work', over: { extras: ['vest'], shirt: 0xb8a888 } });   // the farmer and his wife sit out the night among the casks
    extraPicks.push([x + 2.2, z + 1.5, 0, 1.2]);
    const ys = world.height(-70, 79.5) + 0.05;                                                              // the cart shed, open to the yard
    noGrass(-70, 79.5, 6.5, 4.4); B.box(M.woodH, 6.5, 2.9, 0.3, -70, ys - 0.4, 81.55, { c: 0x5a4a38, solid: true }); for (const e of [-1, 1]) { B.box(M.woodH, 0.3, 2.9, 4.4, -70 + e * 3.1, ys - 0.4, 79.5, { c: 0x5a4a38, solid: true }); B.box(M.wood, 0.16, 2.5, 0.16, -70 + e * 1.1, ys, 77.4, { c: 0x4a3a2c }); }
    B.box(M.ground, 6.2, 0.08, 4.3, -70, ys - 0.02, 79.5, { c: 0x8a7a52 }); B.box(M.thatch, 7.3, 0.16, 5.3, -70, ys + 2.5, 79.5, { c: 0x8a7a52 });
    barrel(B, M, -71.6, ys + 0.06, 80.6); barrel(B, M, -70.7, ys + 0.06, 80.8); woodpile(B, M, -67.85, ys + 0.06, 80.1, HALF, { w: 2.0, h: 1.0 });
    { const wy = world.height(-76, 78); B.cyl(M.stone, 0.9, 1.0, 0.8, -76, wy - 0.1, 78, { c: STONE, solid: true, seg: 12 }); B.cyl(M.flat, 0.72, 0.72, 0.02, -76, wy + 0.6, 78, { c: 0x0c1820, seg: 12 });
      for (const s of [-1, 1]) B.box(M.wood, 0.12, 1.9, 0.12, -76 + s * 0.85, wy, 78, { c: 0x5a4a3a }); B.box(M.wood, 2.0, 0.12, 0.12, -76, wy + 1.8, 78, { c: 0x5a4a3a }); B.box(M.flat, 0.02, 0.9, 0.02, -76, wy + 0.9, 78, { c: 0xb8a070 }); }   // the well
    barrel(B, M, -74.6, world.height(-74.6, 72.6), 72.6); barrel(B, M, -74.5, world.height(-74.5, 68), 68);
  }
  { // ---- the churchyard east of the church: a low wall to crouch behind, graves, the memorial to the dead of the last war ------
    const low = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.min(world.height(ax, az), world.height(bx, bz));
      B.box(M.stone, L, 1.5, 0.45, mx, y - 0.5, mz, { ry, c: STONE, solid: true }); B.box(M.stone, L + 0.1, 0.1, 0.6, mx, y + 1.0, mz, { ry, c: 0x8a8478 }); };
    low(31, -2.2, 44, -2.2); low(44, -2.2, 44, 13); low(30, 13, 35.9, 13); low(38.5, 13, 44, 13);
    for (const gx of [36.1, 38.3]) { const y = world.height(gx, 13); B.box(M.stone, 0.6, 1.9, 0.6, gx, y - 0.5, 13, { c: STONE }); }
    { const y = world.height(37.2, 5.5); B.box(M.ground, 1.5, 0.05, 15, 37.2, y - 0.02, 5.5, { c: 0x8a8272 }); }
    { const x = 37.2, z = 4.6, y = world.height(x, z);                                                       // the memorial: a plain obelisk and a bronze wreath, no names
      B.box(M.stone, 2.4, 0.3, 2.4, x, y - 0.1, z, { c: 0xb0a898, solid: true }); B.box(M.stone, 1.3, 1.1, 1.3, x, y + 0.2, z, { c: 0xc8c2b4, solid: true });
      B.cyl(M.stone, 0.22, 0.48, 2.8, x, y + 1.3, z, { c: 0xc8c2b4, seg: 4, ry: 0.785 }); B.geo(M.metal, new THREE.TorusGeometry(0.26, 0.05, 5, 12), [x, y + 0.8, z + 0.67], [0, 0, 0], 1, 0x6a5a34); }
    for (const [i, gx] of [[0, 32.7], [1, 34.9], [2, 41.4]]) for (let j = 0; j < 5; j++) {
      if ((i * 3 + j * 2) % 7 === 3) continue;
      const gz = 0.2 + j * 2.5, y = world.height(gx, gz), hh = 0.8 + ((i + j * 2) % 3) * 0.14;
      B.box(M.stone, 1.8, 0.16, 0.8, gx, y - 0.04, gz, { c: (i + j) % 2 ? 0xa8a294 : 0x9a9488 });
      if ((i + j) % 4 === 1) { B.box(M.metal, 0.06, 1.2, 0.06, gx - 0.95, y, gz, { c: 0x2a2a2e }); B.box(M.metal, 0.06, 0.06, 0.6, gx - 0.95, y + 0.8, gz, { c: 0x2a2a2e }); world.addCyl(gx - 0.95, gz, 0.12, y - 1, y + 1.2); }
      else B.box(M.stone, 0.16, hh, 0.7, gx - 0.95, y - 0.1, gz, { c: (i + j) % 3 ? 0xb8b0a0 : 0xa8a294, solid: true });
    }
    for (const [tx, tz] of [[31.4, 11.4], [42.6, -0.9]]) { const y = world.height(tx, tz); B.cyl(M.wood, 0.14, 0.2, 1.2, tx, y - 0.1, tz, { c: 0x5a4a3a, seg: 6, solid: true }); B.geo(M.rock, new THREE.ConeGeometry(1.0, 4.4, 8), [tx, y + 3.0, tz], [0, 0, 0], 1, 0x1e3222); }   // two yews
    bench(B, M, 41, world.height(41, 12.4), 12.4, Math.PI, { w: 1.6, back: 0.45, c: 0x9a7a52 });
    people.push(person(B, M, root, 'frenchWoman', 33.95, world.height(33.95, 5.2), 5.2, -HALF, { pose: 'pray', over: { hair: 0x9a9a90, dress: 0x2a2a30, shirt: 0x2a2a30, sleeve: 0x2a2a30, pants: 0x2a2a30, extras: ['dress', 'shawl'], shawl: 0x1e1e22, face: ['kerchief'], kerchief: 0x1e1e22 } }));   // an old woman at her husband's grave
  }
  { // ---- hay ricks to crawl into, haystacks, the hay wain in the farmyard (crawl under it); the two men who wait for the agent ------
    rick(55, 56, Math.PI); rick(70, 82, -HALF); rick(-74, 47, HALF);
    for (const [hx, hz, r] of [[58.6, 58.2, 1.5], [51.6, 53.6, 1.3], [73.2, 85.6, 1.4], [-77.2, 50.6, 1.5], [-71.4, 43.4, 1.3], [-86.5, 79.5, 1.6]]) { haystack(B, M, hx, world.height(hx, hz), hz, { r, h: r * 1.6 }); ricks.push([hx, hz]); }
    cart(B, M, -33, world.height(-33, 54.2), 54.2, 0.15, { load: 'hay' });
    people.push(person(B, M, root, 'frenchMan', -11.9, world.height(-11.9, 77.7), 77.7, 2.76, { pose: 'point', over: { extras: ['coat'], coat: 0x4a4034, hatC: 0x22222a } }));   // the Resistance contact, by the dugout: he points the way to the village
    { const px = 11.2, pz = 96.18, y = world.height(px, pz);                                                 // a glider pilot, wounded in the landing, rests against the wreck
      people.push(person(B, M, root, 'frenchMan', px, y, pz, 2.07, { pose: 'sit', seat: 0, arms: [-0.25, -1.15], over: { hat: null, face: ['headband'], accent: 0xf0f0f0, hair: 0x5a3a1c, shirt: 0x7a6e48, sleeve: 0x7a6e48, pants: 0x74683f, boots: 0x1a1410, belt: 0x8a7a52, extras: [] } }));
      B.cyl(M.cloth, 0.14, 0.15, 0.05, px + 0.75, y, pz - 0.35, { c: 0x6a1c2a, seg: 10 }); B.cyl(M.metal, 0.09, 0.09, 0.2, px + 0.6, y, pz + 0.5, { c: 0x5a5a34, seg: 8 }); B.box(M.cloth, 0.3, 0.1, 0.22, px + 0.85, y, pz + 0.2, { c: 0xe8e4d8 }); }
  }
  const beams = [];
  for (const [x, z, ph] of [[-15, -74, 0], [16, -76, 2.1], [40, -80, 4.0]]) {
    const y = world.height(x, z); B.cyl(M.metal, 0.5, 0.6, 1.0, x, y, z, { c: 0x3a3e3a, seg: 10, solid: true }); B.cyl(M.metal, 0.7, 0.7, 0.5, x, y + 1.0, z, { c: 0x4a4e48, seg: 12 }); B.geo(M.glow, new THREE.CylinderGeometry(0.6, 0.6, 0.06, 12), [x, y + 1.55, z], [0, 0, 0], 1, 0xcfe0ff);
    const g = new THREE.ConeGeometry(9, 150, 16, 1, true); g.translate(0, -75, 0); g.rotateX(Math.PI);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, y + 1.6, z); m.renderOrder = 3; root.add(m); beams.push({ m, ph });
  }
  // the fleet on the horizon
  for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 1900, z = -620 - R() * 500, s = 0.6 + R() * 1.6; B.box(M.flat, 26 * s, 3.2 * s, 5 * s, x, 0, z, { c: 0x0c1016 }); B.box(M.flat, 8 * s, 4 * s, 4 * s, x + 2 * s, 3.2 * s, z, { c: 0x0c1016 }); B.box(M.flat, 0.8 * s, 6 * s, 0.8 * s, x - 3 * s, 4 * s, z, { c: 0x0c1016 }); }

  // ---- trees, grass, rocks --------------------------------------------------------------------------
  const built = (x, z) => dPoly(ROAD, x, z) < 5 || (Math.abs(x) < 34 && Math.abs(z - 2) < 30) || (Math.abs(x) < 50 && z < -66) || (x < -8 && x > -36 && z > 38 && z < 60) || Math.hypot(x - 11, z - 98) < 9 || (x > 62 && x < 110 && z > 2 && z < 42) || Math.hypot(x + 90, z + 23) < 12 || Math.hypot(x + 36, z - 45) < 8
    || (x > 29 && x < 46 && z > -4 && z < 15) || (Math.abs(x + 60) < 5.5 && z > -1 && z < 63) || (x > 42 && Math.abs(z + 49) < 9) || (Math.abs(x + 77) < 14 && Math.abs(z - 74) < 12) || (x < -26 && x > -68 && z < -56) || (x > 86 && x < 92 && z > 3 && z < 8)
    || Math.hypot(x + 13.5, z - 76.5) < 5 || Math.hypot(x - 11, z - 72) < 4 || holes.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 4.5) || ricks.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 4.5);   // the last two lines: the new places, the holes in the hedges, ricks and haystacks
  const apples = [], poplars = [], tufts = [], rocks = [];
  for (let i = 0; i < 3000 && apples.length < 62; i++) { const x = (R() - 0.5) * 230, z = -60 + R() * 160, h = world.height(x, z); if (built(x, z) || fbm(x * 0.05, z * 0.05, 2, 5) < 0.52) continue; const s = 0.8 + R() * 0.5; apples.push({ x, y: h - 0.15, z, ry: R() * 6.28, s }); world.addCyl(x, z, 0.3 * s, h - 2, h + 5); }
  for (let i = 0; i < 3000 && poplars.length < 54; i++) { const x = (R() - 0.5) * 236, z = -64 + R() * 168, h = world.height(x, z); if (built(x, z)) continue; const s = 0.9 + R() * 0.6; poplars.push({ x, y: h - 0.2, z, ry: R() * 6.28, s: [s, s * (1.1 + R() * 0.5), s] }); world.addCyl(x, z, 0.35 * s, h - 2, h + 9); }
  apples.push({ x: -7, y: world.height(-7, 89) - 0.15, z: 89, ry: 1, s: 1.3 });
  root.add(instanced(blobTreeGeo({ leaf: [0x3c5a30, 0x4a6a3a, 0x33502a], trunk: 0x3a2e24, h: 3.6, spread: 2.4, blobs: 9, seed: 8 }), M.rock, apples));
  root.add(instanced(merge([gCyl(0.16, 0.24, 2.2, 0x4a3e30, [0, 1.1, 0], [0, 0, 0], 1, 6), gCone(1.1, 10, 0x35502e, [0, 6.8, 0], [0, 0, 0], 1, 8), gCone(0.85, 5, 0x41603a, [0, 5.4, 0], [0, 1, 0], 1, 7)]), windify(M.rock.clone(), shared, 0.2, 10, 1.1), poplars));
  for (let i = 0; i < 90000 && tufts.length < 22000; i++) {
    const x = (R() - 0.5) * 240, z = -96 + R() * 200, h = world.height(x, z);
    if (h < 6 || dPoly(ROAD, x, z) < 1.8 || (Math.abs(x) < 10 && Math.abs(z - 2) < 22) || bare.some(([bx, bz, hw, hd, c, s]) => Math.abs((x - bx) * c - (z - bz) * s) < hw && Math.abs((x - bx) * s + (z - bz) * c) < hd)) continue;
    tufts.push({ x, y: h, z, ry: R() * 6.28, s: [0.35 + R() * 0.45, 0.25 + R() * 0.5, 0.35 + R() * 0.45], c: R.pick([0x5c7a3c, 0x4e6c34, 0x6a8644, 0x8a8a4c]) });
  }
  root.add(instanced(tuftGeo(5, 0x6a7a4a, 0xffffff), windify(M.flat2.clone(), shared, 0.22, 1, 1.8), tufts, { cast: false, thin: true }));
  for (let i = 0; i < 40; i++) { const x = (R() - 0.5) * 200, z = -100 - R() * 6, s = 1 + R() * 3; rocks.push({ x, y: world.height(x, z) + s * 0.2, z, ry: R() * 6, s: [s, s * 0.8, s], c: 0xd0ccbc }); }
  root.add(instanced(rockGeo(3, 1), M.rock, rocks, { solid: true }));

  // ---- atmosphere ---------------------------------------------------------------------------------
  root.add(makeAmbient(shared, { count: 380, box: 36, boxY: 12, size: 0.045, colorA: 0xffe0b0, colorB: 0xffffff, additive: true, alpha: 0.35, bright: 1.2, fall: -0.03, wind: [0.4, 0, 0.3], flutter: 0.6 }));

  { // a hunter's stand among the hedgerows (up its ladder), a dugout to crawl into
    const clearAt = (x, z, r) => { world.cyls = world.cyls.filter((c) => Math.hypot(c.x - x, c.z - z) > r + c.r); };
    clearAt(11, 72, 4); stand(B, M, 11, world.height(11, 71.7), 71.7, 0, { c: 0x5a4a34, roof: 0x4a4a3a });
    clearAt(-14, 75.5, 4); noGrass(-14, 75.1, 3.4, 3.2); den(B, M, -14, world.height(-14, 75.1) + 0.02, 75.1, 0, { mat: M.woodH, c: 0x4a3c2c }); B.box(M.ground, 4.6, 0.5, 4.4, -14, world.height(-14, 75.1) + 1.97, 75.1, { c: 0x4a5a34 });
    extraPicks.push([-14, 75.3, 0, 0.6]);
  }
  const enemies = [
    ['soldier', 2, 76, {}], ['dog', -1, 72, {}], ['soldier', -4, 67, { patrol: true }],
    ['soldier', -19, 52, {}], ['officer', -27, 44.5, {}], ['dog', -17, 41, {}],
    ['gunner', 5.6, 27, { static: true, yaw: 0 }], ['soldier', -5, 31.5, {}], ['dog', 1, 33, {}],
    ['soldier', -8, 12, { patrol: true }], ['officer', 8, 6, {}], ['soldier', 10, -12, {}], ['dog', -6, -8, {}], ['soldier', -9, -19, {}],
    ['soldier', -6, -41, {}], ['dog', 6, -45, {}], ['soldier', 14, -53, { patrol: true }],
    ['gunner', -5.2, -78.2, { static: true, yaw: 0 }], ['soldier', 13, -73, {}], ['officer', -12, -72, {}], ['dog', 5, -70, {}], ['soldier', 24, -76, {}], ['warBoss', 0, -75, { yaw: 0, patrol: false }],
    ['officer', 3.5, -87.5, { up: 1.6, patrol: false, yaw: 0 }], ['soldier', -16, 5, { up: 1.8, patrol: false }],
    ['officer', 92, 22, { up: 1.8, patrol: false }], ['soldier', 82, 24, {}], ['soldier', 97, 31, { patrol: true }], ['dog', 80, 17, {}],
    ['gunner', -84.5, -22.5, { static: true, yaw: 1.2 }], ['soldier', -92, -24, { up: 1.8, patrol: false }],
  ];
  const bottle = merge([gCyl(0.07, 0.08, 0.22, 0x8a5a1c, [0, 0, 0], [0, 0, 0], 1, 8), gCyl(0.028, 0.06, 0.1, 0x8a5a1c, [0, 0.16, 0], [0, 0, 0], 1, 8), gCyl(0.032, 0.032, 0.035, 0xc8a878, [0, 0.225, 0], [0, 0, 0], 1, 6), gCyl(0.082, 0.082, 0.09, 0xe8dcc0, [0, -0.01, 0], [0, 0, 0], 1, 8)]);
  let ft = 0, flak = 0;
  return {
    env: {
      sunDir: [0.72, 0.075, -0.69], sunColor: 0xff9050, lightDir: [-0.42, 0.62, 0.66], sunLight: 0xa9bef2, sunIntensity: 2.3, sunSize: 0.0009,
      skyTop: 0x0b1836, skyHorizon: 0x6a6686, skyGround: 0x2a3040, haze: 0.5,
      fogColor: 0x4a5268, fogDensity: 0.0046, hemiSky: 0x8ea4e2, hemiGround: 0x5c6458, hemiIntensity: 2.3, envIntensity: 0.9,
      cloudCover: 0.52, cloudScale: 0.4, cloudLit: 0xd88c70, cloudShade: 0x262c44, stars: 0.5, moonDir: [-0.5, 0.6, 0.6],
      bloom: 0.5, bloomRadius: 0.7, bloomThreshold: 1.1, rays: 0.5, rayThreshold: 1.4, exposure: 1.5,
      saturation: 1.02, contrast: 1.08, vignette: 0.48, tintHi: 0xfff0e0, tintLo: 0xdfe6ff, shadowRange: 85,
    },
    spawn: { x: 0, z: 97.5, yaw: 0 },
    vista: { c: [0, 6, 20], r: 60, h: 14, a: 1.5, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[-22, 47.5], [3.5, 23], [-10, 1], [8, -47], [10, -79], [-3, -88.6, 0, 1.6], [93.5, 24.5, 0, 1.8], [-93.6, -25.4, 0, 1.8], [24, -3, 0, 1.6]].concat(extraPicks),
    dust: [0.5, 0.48, 0.42], water: [[0, -104, 30]], heroLight: 40,
    makePickup: () => new THREE.Mesh(bottle, M.flat),
    update(dt, t, g) {
      for (const h of hanging) {                                                             // the paratrooper on the tower: he sways, kicks, reaches up
        const f = h.f, k = Math.sin(t * 1.7), r = Math.max(0, Math.sin(t * 0.45));
        f.group.rotation.z = Math.sin(t * 0.8) * 0.05; f.group.rotation.x = Math.sin(t * 0.6) * 0.04;
        f.legL.rotation.x = k * 0.45 - 0.1; f.legR.rotation.x = -k * 0.4 - 0.15; if (f.shinL) { f.shinL.rotation.x = 0.3 + Math.max(0, k) * 0.6; f.shinR.rotation.x = 0.3 + Math.max(0, -k) * 0.6; }
        f.armR.rotation.x = -2.6 - r * 0.35 + Math.sin(t * 2.3) * 0.08; f.armL.rotation.x = -2.5 - r * 0.3 + Math.sin(t * 2.1 + 1) * 0.08; f.armR.rotation.z = 0.25; f.armL.rotation.z = -0.25;
        f.hips.rotation.y = Math.sin(t * 0.35) * 0.35;
      }
      for (const b of beams) { b.m.rotation.set(0.35 + Math.sin(t * 0.21 + b.ph) * 0.3, 0, Math.sin(t * 0.13 + b.ph * 1.7) * 0.75, 'YXZ'); }
      idle(people, t);
      lamps.forEach((l, i) => { if (i === 0) l.intensity = 26 + Math.sin(t * 13) * 6 + Math.sin(t * 7.1) * 4; });
      ft -= dt; flak -= dt;
      const G = g.gfx;
      if (ft <= 0) {
        ft = 0.06;
        for (const f of fires) { G.glow.spawn(f[0] + (Math.random() - 0.5) * 0.5, f[1], f[2] + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 1.4 + Math.random() * 1.4, (Math.random() - 0.5) * 0.5, { life: 0.7 + Math.random() * 0.5, s0: 0.4, s1: 0.04, r: 3, g: 1.1, b: 0.25, a: 0.9 });
          if (Math.random() < 0.4) G.soft.spawn(f[0], f[1] + 0.8, f[2], 0.6, 1.6, 0.3, { life: 4, s0: 0.5, s1: 3, r: 0.2, g: 0.2, b: 0.22, a: 0.3, drag: 0.15 }); }
        const p = G.camera.position, x = p.x + (Math.random() - 0.5) * 60, z = p.z + (Math.random() - 0.5) * 60;              // ground mist
        G.soft.spawn(x, world.height(x, z) + 0.4 + Math.random() * 0.6, z, 0.3, 0.02, 0.15, { life: 7 + Math.random() * 4, s0: 2.5, s1: 6, r: 0.5, g: 0.54, b: 0.66, a: 0.05, drag: 0 });
      }
      if (flak <= 0) {                                                  // anti-aircraft fire far out over the sea
        flak = 0.25 + Math.random() * 0.9;
        const x = (Math.random() - 0.5) * 700, y = 70 + Math.random() * 160, z = -260 - Math.random() * 380;
        for (let i = 0; i < 5; i++) G.glow.spawn(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, z, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0, { life: 0.5 + Math.random() * 0.4, s0: 7, s1: 1, r: 3, g: 1.8, b: 0.8, a: 0.9 });
        if (Math.random() < 0.5) { const tx = (Math.random() - 0.5) * 500, tz = -200 - Math.random() * 200, vx = (Math.random() - 0.5) * 30; for (let i = 0; i < 7; i++) G.glow.spawn(tx + vx * i * 0.12, 12 + i * 9, tz, vx, 75, 0, { life: 1.6, s0: 2.2, s1: 1.2, r: 3, g: 1.2, b: 0.3, a: 0.9 }); }
      }
    },
  };
}

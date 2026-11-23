// Chapter IX - Tenochtitlan, the evening of 30 June 1520: the last rain, a low sun, the Great Temple, the city round it (palace, market, canal),
// and three ways over the lake to the western shore: the causeway, the aqueduct beside it and the garden plots.
import * as THREE from 'three';
import { Heightfield, rockGeo } from '../build.js';
import { makeAmbient, makeWater, windify } from '../gfx.js';
import { instanced, room, steps, blobTreeGeo, tuftGeo, cactusGeo, brazier, gBox, gCyl, gCone, gSph, xf, merge, stand, den, ladder, rod, deck, stall, pots, sacks, rug, hearth, bench, chest, barrel, crate, rubble, boulder, local, person, idle } from '../props.js';
import { fbm, ridged, smooth } from '../util.js';

export const aztec = {
  id: 'aztec', theme: 'theme-aztec', chapter: 'Chapter IX', title: 'Tenochtitlan', place: 'Tenochtitlan · the lake of Mexico · 30 June 1520',
  story: 'Dusk, and the rain is easing. The strangers who seized your king are stealing out of the city over the western causeway, heavy with the gold of the temples. The drum on the Great Temple has woken Tenochtitlan. Do not let them reach the shore.',
  weapon: 'dart', weaponName: 'Poisoned darts & obsidian club', alt: 'right mouse — club',
  heroes: [
    { look: 'cuauhtemoc', name: 'Cuauhtémoc', who: 'The Descending Eagle, last ruler of the Mexica', trait: 'Descending Eagle', effect: 'poisoned darts that fly faster and hit harder', mods: { power: 1.25 }, sleeve: 0xb07a50, cuff: 0xd9a820 },
    { look: 'tzilacatzin', name: 'Tzilacatzin', who: 'Warrior of Tlatelolco, who felled Spaniards with stones', trait: 'Stone thrower', effect: 'hurls heavy stones; starts with 130 health', weapon: 'stone', weaponName: 'Stones & obsidian club', mods: { hp: 130 }, sleeve: 0x2a8a4a, cuff: 0xd9a820 },
    { look: 'nezahualcoyotl', name: 'Nezahualcóyotl', who: 'The Fasting Coyote, poet-king of Texcoco', trait: 'Fasting Coyote', effect: 'bow and club; moves 15% faster', weapon: 'bow', weaponName: 'Bow & obsidian club', mods: { speed: 1.15 }, sleeve: 0xb07a50, cuff: 0x2ac8c0 },
  ],
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> throw or shoot &nbsp; <kbd>Right mouse</kbd> aim (the line shows where it lands) &nbsp; <kbd>F</kbd> swing the club',
  foes: 'invaders remain', foesNone: 'The causeway is clear', bossName: 'Captain Luján of the rear guard', bossDown: 'The captain has fallen', pickupText: 'Cacao  +35',
  deadTitle: 'Mictlan', deadSub: 'The water of the lake closes over you.', clearTitle: 'The city is free tonight',
  build,
};

const STONE = 0xa8a294, STUC = 0xe6e0d0, RED = 0xa02c20, BLUE = 0x2a6a9a, GOLD = 0xe0b028, GOLD2 = 0xb8862a, BONE = 0xe2d8c0, TURQ = 0x2ac8c0, WOOD = 0x6a4a2c;
const mix = (a, b, t) => a + (b - a) * t;

/** A palm: a leaning trunk and a crown of drooping fronds. */
function palmGeo(seed = 1) {
  const parts = [gCyl(0.13, 0.19, 3.2, 0x5a4a34, [0.12, 1.6, 0], [0, 0, -0.08], 1, 6), gCyl(0.1, 0.13, 3.0, 0x5a4a34, [0.42, 4.5, 0], [0, 0, -0.14], 1, 6)];
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + seed, t = 1.75 + (i % 3) * 0.16; parts.push(xf(new THREE.ConeGeometry(0.46, 3.0, 4), [0.62 + Math.sin(a) * 1.05, 5.75 - (i % 3) * 0.12, Math.cos(a) * 1.05], [t, a, 0], [1, 1, 0.22], i % 2 ? 0x4a9a4c : 0x3a8040)); }
  return merge(parts);
}
/** A clump of big leaves: the undergrowth. */
function bushGeo() {
  const parts = [];
  for (let i = 0; i < 6; i++) { const a = i * 1.05; parts.push(xf(new THREE.ConeGeometry(0.34, 1.5, 4), [Math.sin(a) * 0.42, 0.62, Math.cos(a) * 0.42], [0.85, a, 0], [1, 1, 0.3], [0x448e46, 0x56a650, 0x38783c][i % 3])); }
  parts.push(xf(new THREE.IcosahedronGeometry(0.5, 0), [0, 0.42, 0], [0, 0, 0], [1.1, 0.8, 1.1], 0x38783c));
  return merge(parts);
}

/** A tree for the far shores: the same shape as the near ones, in a fraction of the triangles. */
function farTreeGeo() {
  const parts = [gCyl(0.2, 0.34, 4.2, 0x5a4632, [0.1, 2.1, 0], [0, 0, -0.1], 1, 5)];
  for (const [x, y, z, s, c] of [[0, 6.2, 0, 2.3, 0x42904a], [1.6, 5.2, 0.6, 1.7, 0x56a652], [-1.3, 5.4, -0.9, 1.8, 0x387c40], [0.2, 7.4, 1.0, 1.5, 0x4c9a4e]]) parts.push(xf(new THREE.IcosahedronGeometry(s, 0), [x, y, z], [x, y, 0], [1, 0.74, 1], c));
  return merge(parts);
}

function build({ game, gfx, world, B, M, root, rand, shared }) {
  const R = rand;
  const GAPS = [2, -27, -56], CW = 4.5, VOL = [-150, -360], VR = 240, VH = 240, PY = 1.75;                     // gaps in the causeway, its half width, the volcano, the paved level of the precinct
  const SIDE = { '-1': -40, 1: -44 }, AQ = -11, AQY = 2.3, PLOT = 0.8, PIER = 1.0;                             // where the side stairs leave the causeway (west, east), the aqueduct (its x, its top), the top of a garden plot, of a pier
  const CHIN = [[-22, 4, 14, 9], [24, 0, 12, 10], [-34, -14, 10, 12], [30, -22, 12, 9], [-20, -36, 9, 9], [54, 6, 10, 14], [-54, 2, 9, 12], [22, -44, 12, 10], [26, -64, 10, 10], [22, -84, 10, 10]];   // garden plots on the water
  // ---- terrain: a city island in a highland lake, the far shore, a ring of mountains and one volcano ----
  const hf = new Heightfield(1300, 400, (x, z) => {
    const n = fbm(x * 0.03, z * 0.03, 3, 7);
    let h = -3 - n * 0.6;                                                                   // the lake bed
    const isl = 1 - smooth(0.8, 1.0, Math.hypot(x / 86, (z - 76) / 64));
    h = mix(h, 1.5 + (n - 0.5) * 0.3, isl);                                                // the island of the city
    if (x > 40.5 && x < 47.5) h = Math.min(h, -3);                                         // the canal between the precinct and the market quarter
    for (const [cx, cz, w, d] of CHIN) h = Math.max(h, mix(-3.2, 0.75, (1 - smooth(w / 2 - 1.6, w / 2, Math.abs(x - cx))) * (1 - smooth(d / 2 - 1.6, d / 2, Math.abs(z - cz)))));
    const ml = smooth(-86, -97, z);
    h = Math.max(h, mix(-3.4, 1.5 + (-z - 92) * 0.035 + (n - 0.5) * 1.5, ml));              // the western shore, where the causeway lands
    const r = Math.hypot(x, z), outer = smooth(190, 270, r);
    h = Math.max(h, mix(-3.4, 2 + outer * 12 + n * 3, outer));                              // the lake is ringed by land,
    h += smooth(300, 620, r) * (30 + ridged(x * 0.004 + 3, z * 0.004 + 9, 5, 4) * 260);     // and the land by mountains
    const dv = Math.hypot(x - VOL[0], z - VOL[1]), cone = Math.max(0, 1 - dv / VR);
    if (cone > 0) h = Math.max(h, VH * Math.pow(cone, 1.25) - (dv < 30 ? (1 - dv / 30) * 36 : 0) + n * 5 * cone);   // the volcano, with its crater
    return h;
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -82, x1: 82, z0: -140, z1: 134 };
  world.maxSlope = 0.95; world.waterY = -0.5;
  const cGrass = new THREE.Color(0x4a7a3a), cGrass2 = new THREE.Color(0x5e8c42), cEarth = new THREE.Color(0x7a6248), cMud = new THREE.Color(0x5a5040), cBed = new THREE.Color(0x1a2c2c),
    cRock = new THREE.Color(0x6e6a62), cAsh = new THREE.Color(0x4a4038), cSnow = new THREE.Color(0xeef2f6), cForest = new THREE.Color(0x2a5c30), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h, ny) => {
    if (h < 0.1) return tmp.copy(cMud).lerp(cBed, smooth(0.1, -2.5, h));
    const n = fbm(x * 0.05, z * 0.05, 3, 2), dv = Math.hypot(x - VOL[0], z - VOL[1]);
    tmp.copy(cGrass).lerp(cGrass2, n).lerp(cEarth, smooth(0.55, 0.75, fbm(x * 0.11, z * 0.11, 2, 5)) * 0.6);
    tmp.lerp(cMud, 1 - smooth(0.1, 0.9, h));
    tmp.lerp(cForest, smooth(6, 26, h)); tmp.lerp(cRock, smooth(120, 190, h));
    tmp.lerp(cRock, 1 - smooth(0.55, 0.78, ny));
    if (dv < VR) { tmp.lerp(cAsh, smooth(VR * 0.72, VR * 0.42, dv)); tmp.lerp(cSnow, smooth(VH * 0.6, VH * 0.72, h + (n - 0.5) * 30) * smooth(26, 44, dv)); }   // ash slopes, a cap of snow, bare rock at the rim
    return tmp;
  }));
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), makeWater(shared, { deep: 0x15424e, scale: 0.5, flow: [0.03, 0.05], alpha: 0.86 }));
  lake.rotation.x = -Math.PI / 2; root.add(lake);
  B.geo(M.glow, new THREE.SphereGeometry(27, 12, 6), [VOL[0], VH - 33, VOL[1]], [0, 0, 0], [1, 0.22, 1], 0xff5a1a);     // the fire in the crater

  const lights = [], fires = [];
  const torch = (x, y, z, i = 26, d = 15) => { const l = new THREE.PointLight(0xff9a48, i, d, 1.7); l.position.set(x, y, z); root.add(l); lights.push({ l, i, ph: R() * 9 }); };
  const fire = (x, y, z, s = 1.1, light = 0) => { fires.push(brazier(B, M, x, y, z, s).concat(s)); if (light) torch(x, y + 1.9 * s, z, light, 20); };
  const extraFoes = [], extraPicks = [];

  // ---- gold: what the temples held, and what the strangers are carrying off ----
  /** A small heap of goldwork. k = how many pieces (1 to 6). */
  const gold = (x, y, z, ry = 0, k = 5) => {
    const p = [];
    if (k > 0) p.push(gBox(0.34, 0.26, 0.03, GOLD, [0, 0.2, 0], [-0.5, 0, 0]), gSph(0.09, GOLD, [0, 0.36, -0.07], [1, 1.1, 0.8]), gCyl(0.19, 0.19, 0.025, GOLD2, [0, 0.45, -0.12], [1.05, 0, 0], [1, 1, 0.6], 12),   // a pectoral: plate, face, fan of feathers
      gSph(0.03, GOLD, [-0.13, 0.42, -0.1]), gSph(0.03, GOLD, [0.13, 0.42, -0.1]));
    if (k > 1) p.push(gCyl(0.2, 0.2, 0.025, GOLD, [0.36, 0.03, 0.1], [0, 0, 0], 1, 14), gCyl(0.07, 0.07, 0.03, GOLD2, [0.36, 0.045, 0.1], [0, 0, 0], 1, 10));                                               // a sun disc
    if (k > 2) p.push(gBox(0.3, 0.07, 0.12, GOLD, [-0.32, 0.035, 0.16], [0, 0.5, 0]), gBox(0.3, 0.07, 0.12, GOLD2, [-0.28, 0.1, 0.12], [0, -0.3, 0]));                                                         // two bars, melted down
    if (k > 3) p.push(gCyl(0.05, 0.065, 0.2, GOLD, [0.12, 0.1, 0.34], [0, 0, 0], 1, 7), gSph(0.06, GOLD, [0.12, 0.25, 0.34]), gBox(0.16, 0.04, 0.03, GOLD2, [0.12, 0.31, 0.34]));                               // a little figure with a headdress
    if (k > 4) for (let i = 0; i < 5; i++) p.push(gSph(0.035, i % 2 ? GOLD : GOLD2, [-0.1 + Math.cos(i * 1.3) * 0.16, 0.035, 0.42 + Math.sin(i * 1.3) * 0.1]));                                              // bells
    if (k > 5) p.push(gSph(0.13, GOLD, [-0.34, 0.2, -0.22], [1, 0.9, 1.15]), gBox(0.13, 0.06, 0.1, GOLD2, [-0.34, 0.08, -0.15]), gBox(0.04, 0.045, 0.03, TURQ, [-0.39, 0.22, -0.09]), gBox(0.04, 0.045, 0.03, TURQ, [-0.29, 0.22, -0.09]));   // a golden skull with turquoise eyes
    B.geo(M.metal, merge(p), [x, y, z], [0, ry, 0], 1.5);
  };
  /** A skull of bone. */
  const skullGeo = (c = BONE) => merge([gSph(0.11, c, [0, 0, 0], [1, 0.95, 1.15], 6), gBox(0.12, 0.07, 0.1, c, [0, -0.09, 0.05]), gBox(0.035, 0.04, 0.03, 0x15120f, [-0.04, 0.0, 0.115]), gBox(0.035, 0.04, 0.03, 0x15120f, [0.04, 0.0, 0.115])]);

  // ---- the causeway: a stone road on the water, cut by three canals ----
  for (const [z0, z1] of [[34, GAPS[0] + 2.3], [GAPS[0] - 2.3, GAPS[1] + 2.3], [GAPS[1] - 2.3, GAPS[2] + 2.3], [GAPS[2] - 2.3, -99]]) {
    B.box(M.stone, CW * 2, 4.4, z0 - z1, 0, -3, (z0 + z1) / 2, { c: STONE, solid: true });                              // its top is at 1.4
    for (const e of [-1, 1]) for (const [za, zb] of z0 > SIDE[e] && z1 < SIDE[e] ? [[z0, SIDE[e] + 1], [SIDE[e] - 1, z1]] : [[z0, z1]])       // a low parapet: too high to step over, low enough to shoot over;
      B.box(M.stone, 0.5, 0.62, za - zb, e * (CW - 0.25), 1.4, (za + zb) / 2, { c: 0x8e887a, solid: true });                                // it opens where a side stair goes down to a jetty
  }
  B.box(M.stone, CW * 2, 1.2, 13.4, 0, 0.38, 36.4, { c: STONE, solid: true });                                          // the road from the gate to the water, a hand higher
  for (let z = 26; z > -96; z -= 11) for (const e of [-1, 1]) B.cyl(M.wood, 0.13, 0.15, 3.4, e * (CW + 0.5), -2.2, z + e * 2, { c: 0x3a2c1e, seg: 6 });   // mooring posts in the water
  // first canal: the timber bridge the strangers carried with them, still in place
  B.box(M.woodH, 5.4, 0.3, 5.6, 0, 1.12, GAPS[0], { c: WOOD, solid: true }); for (const e of [-1, 1]) B.box(M.wood, 0.25, 0.62, 6, e * 2.6, 1.4, GAPS[0], { c: 0x4a3420, solid: true });
  // (where a canal cuts the road, the parapet turns the corner and runs across to the crossing, so nobody walks into the water)
  const lip = (gz, xa, xb) => { for (const e of [-1, 1]) for (const [x0, x1] of [[-CW, xa], [xb, CW]]) if (x1 - x0 > 0.3) B.box(M.stone, x1 - x0, 0.62, 0.5, (x0 + x1) / 2, 1.4, gz + e * 2.55, { c: 0x8e887a, solid: true }); };
  lip(GAPS[0], -2.7, 2.7); lip(GAPS[1], -2.3, 1.2); lip(GAPS[2], -2.1, 1.15);
  for (const [gz, xa, xb] of [[GAPS[1], -2.5, 1.9], [GAPS[2], -2.25, 1.3]]) for (const x of [xa, xb]) B.box(M.wood, 0.22, 0.62, 5.2, x, 1.3, gz, { c: 0x4a3420, solid: true });   // side rails of the two rough crossings
  // second canal: no bridge; they are crossing on what fell in: chests, bales, a cart
  for (const [x, z, w, top, c] of [[-0.6, GAPS[1] + 1.4, 3.4, 1.25, 0x6a4a2c], [0.4, GAPS[1] - 0.1, 3.2, 1.0, 0x8a7458], [-0.3, GAPS[1] - 1.6, 3.6, 1.2, 0x5a4028]]) B.box(M.wood, w, top + 3, 1.95, x, -3, z, { c, solid: true });
  B.geo(M.wood, new THREE.CylinderGeometry(0.7, 0.7, 0.12, 10), [2.3, 0.5, GAPS[1] + 0.3], [1.1, 0.4, 0.3], 1, 0x4a3420); B.box(M.wood, 2.2, 0.5, 1.2, 2.4, -0.1, GAPS[1] - 0.9, { ry: 0.5, rz: 0.4, c: 0x5a4028 });
  gold(-0.5, 1.25, GAPS[1] + 1.4, 0.6, 3); gold(0.4, 1.0, GAPS[1] - 0.1, 2.2, 5);
  // third canal: two planks
  B.box(M.woodH, 1.6, 0.25, 5.6, -1.3, 1.17, GAPS[2], { c: WOOD, solid: true }); B.box(M.woodH, 1.6, 0.25, 5.6, 0.35, 1.15, GAPS[2], { ry: 0.04, c: 0x5a4028, solid: true });
  for (const [z, e] of [[24, 1], [-10, -1], [-38, 1], [-66, -1], [-88, 1]]) fire(e * (CW - 1.0), 1.4, z, 1.1, 26);       // braziers along the road
  for (const [x, z, k, ry] of [[1.6, 16, 2, 0.4], [-2.2, -8, 1, 2], [2.4, -18, 3, 4], [-1.8, -44, 2, 1], [1.2, -64, 1, 3], [-2.6, -76, 4, 5]]) gold(x, 1.4, z, ry, k);   // dropped as they ran

  // ---- the sacred precinct: a paved square within a wall, the Great Temple at its head ----
  B.box(M.stone, 76, 0.7, 66, 0, PY - 0.7, 75, { c: 0xbab4a6, solid: true });
  const wall = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    B.box(M.plaster, len, 2.3, 0.9, mx, PY - 0.3, mz, { ry, c: STUC, solid: true }); B.box(M.flat, len + 0.04, 0.4, 0.98, mx, PY + 2.0, mz, { ry, c: RED }); };
  wall(-37, 42.5, -7, 42.5); wall(7, 42.5, 37, 42.5); wall(-37, 107.5, 37, 107.5);
  wall(-37, 42.5, -37, 67); wall(-37, 73, -37, 107.5); wall(37, 42.5, 37, 57.3); wall(37, 58.7, 37, 67); wall(37, 73, 37, 107.5);   // side gates: west to the palace, east to the market
  for (const e of [-1, 1]) for (const k of [-1, 1]) { B.box(M.plaster, 1.3, 3.4, 1, e * 37, PY - 0.3, 70 + k * 2.5, { c: STUC, solid: true }); B.box(M.flat, 1.4, 0.4, 1.1, e * 37, PY + 3.1, 70 + k * 2.5, { c: e < 0 ? RED : BLUE }); }
  B.box(M.plaster, 0.9, 0.75, 1.4, 37, PY + 1.25, 58, { c: STUC, solid: true }); B.box(M.flat, 0.98, 0.4, 1.44, 37, PY + 2.0, 58, { c: RED });     // a drain through the east wall: crawl out to the canal
  for (const k of [-1, 1]) B.box(M.stone, 1.0, 1.25, 0.12, 37, PY, 58 + k * 0.76, { c: 0x6e6a60 });
  for (const e of [-1, 1]) {                                                                // serpent heads at the gate
    B.box(M.stone, 1.5, 1.3, 2.6, e * 6.8, PY, 41.2, { c: 0x8a9484, solid: true }); B.box(M.stone, 1.3, 0.35, 1.1, e * 6.8, PY, 39.6, { c: 0x7a8474 });
    for (const k of [-1, 1]) B.box(M.flat, 0.16, 0.3, 0.16, e * 6.8 + k * 0.5, PY + 0.35, 39.75, { c: 0xf0ece0 });
    for (const k of [-1, 1]) B.box(M.glow, 0.2, 0.2, 0.06, e * 6.8 + k * 0.4, PY + 0.95, 39.88, { c: 0xff8a30 });
    fire(e * 9.4, PY, 40.6, 1.2, 30);
  }
  // The Great Temple: four terraces, a stair as steep as the pyramid's own face, two shrines on top.
  const F = 62, TOP = PY + 17, SX = 6.5, NS = 38, RISE = 17 / NS, RUN = 0.48, SET = NS * RUN / 4;   // front of the base, height of the top, half width of the stair, its steps
  for (let k = 0; k < 4; k++) {
    const z0 = F + SET * k, z1 = 102 - 2 * k, hw = 20 - 2.5 * k, top = PY + 4.25 * (k + 1), c = k % 2 ? 0xd8d2c2 : STUC;
    for (const e of [-1, 1]) B.box(M.plaster, hw - SX, top - PY + 1, z1 - z0, e * (hw + SX) / 2, PY - 1, (z0 + z1) / 2, { c, solid: true });      // the terrace on either side of the stair
    B.box(M.plaster, SX * 2, top - PY + 1, z1 - (z0 + SET), 0, PY - 1, (z0 + SET + z1) / 2, { c, solid: true });                                  // and behind it
    for (const e of [-1, 1]) B.box(M.flat, hw - SX + 0.1, 0.45, z1 - z0 + 0.1, e * (hw + SX) / 2, top - 0.45, (z0 + z1) / 2, { c: k % 2 ? BLUE : RED });
  }
  for (let j = 1; j <= NS; j++) B.box(M.stone, SX * 2, j * RISE + 1, RUN + 0.02, 0, PY - 1, F + (j - 0.5) * RUN, { c: j % 2 ? 0xbcb6a8 : 0xb2ac9e, solid: true });   // the stair: solid stone under every tread
  for (const e of [-1, 1]) {                                                                 // balustrades, each ending in a serpent's head
    B.box(M.stone, 1.3, 1.1, 2.0, e * (SX + 0.45), PY, F - 1.2, { c: 0x8a9484, solid: true }); for (const k of [-1, 1]) B.box(M.glow, 0.18, 0.18, 0.06, e * (SX + 0.45) + k * 0.35, PY + 0.8, F - 2.22, { c: 0xff8a30 });
  }
  for (const [e, col, nm] of [[-1, BLUE, 0xe8f0f8], [1, RED, 0xf0ece0]]) {                    // the shrine of the rain god and the shrine of the war god
    const x = e * 5.8, z = 90.5;
    room(B, M, x, TOP, z, { w: 8, d: 7, h: 4.6, t: 0.4, mat: M.plaster, c: STUC, base: 0.4, doors: [{ side: 'n', at: 0, w: 2.6, h: 3.1 }], floor: { mat: M.stone, c: 0x9a9488 }, ceil: { mat: M.plaster, c: 0xd8d2c2 } });
    B.box(M.flat, 8.5, 3.8, 3.2, x, TOP + 4.8, z + 0.6, { c: col }); B.box(M.flat, 8.7, 0.5, 3.4, x, TOP + 8.6, z + 0.6, { c: nm });               // the tall roof comb
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) B.geo(M.flat, new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), [x - 2.8 + i * 1.4, TOP + 5.8 + j * 1.5, z - 1.02], [Math.PI / 2, 0, 0], 1, e < 0 ? 0xf0f4f8 : 0xf0ece0);
    for (const k of [-1, 1]) B.box(M.flat, 0.5, 3.1, 0.3, x + k * 1.6, TOP, z - 3.6, { c: col });                                                 // painted door posts
    B.box(M.stone, 1.6, 0.9, 1.0, x, TOP + 0.06, z + 2.3, { c: 0x7a7468, solid: true }); gold(x, TOP + 0.98, z + 2.3, e * 0.4, 6); gold(x - 2.4, TOP + 0.08, z + 1.2, 2, 4); gold(x + 2.4, TOP + 0.08, z + 1.4, 4.2, 5);   // an altar heaped with gold
    torch(x, TOP + 2.6, z, 30, 12);
  }
  B.cyl(M.wood, 0.6, 0.55, 1.3, 0, TOP, 85.6, { c: 0x5a3a22, seg: 12, solid: true }); B.geo(M.flat, new THREE.CylinderGeometry(0.58, 0.58, 0.06, 12), [0, TOP + 1.33, 85.6], [0, 0, 0], 1, 0xd8c8a0);   // the great drum
  for (const e of [-1, 1]) fire(e * 10.6, TOP, 83.4, 1.3, 34);
  extraPicks.push([0, 87.5, TOP + 0.5]);
  // the skull rack: rows of skulls on poles above a stone platform, and before it a golden skull on an altar
  { const x = -24, z = 53; B.box(M.stone, 12.6, 0.9, 4.2, x, PY, z, { c: 0x8e887a, solid: true });
    for (let i = 0; i < 7; i++) B.box(M.wood, 0.16, 3.3, 0.16, x - 6 + i * 2, PY + 0.9, z, { c: 0x3a2c1e });
    const sk = [];
    for (let r = 0; r < 5; r++) { B.box(M.wood, 12.2, 0.06, 0.06, x, PY + 1.45 + r * 0.56, z, { c: 0x3a2c1e });
      for (let i = 0; i < 26; i++) { if ((i * 7 + r * 3) % 13 === 5) continue; sk.push({ x: x - 5.85 + i * 0.468, y: PY + 1.45 + r * 0.56, z, ry: ((i + r) % 5 - 2) * 0.12, s: [1, 1, 1] }); } }
    root.add(instanced(skullGeo(), M.flat, sk, { cast: false }));
    world.addBox(x, z, 12.4, 0.5, 0, PY + 0.9, PY + 4.3);
    B.box(M.stone, 1.4, 1.0, 1.2, x, PY, z - 4.2, { c: 0x7a7468, solid: true }); gold(x + 0.34, PY + 0.84, z - 4.0, 0, 6); gold(x - 0.3, PY + 1.0, z - 4.2, 3, 2);
    for (const e of [-1, 1]) fire(x + e * 7.6, PY, z - 1.5, 1.1, e > 0 ? 24 : 0); }
  // the round temple of the wind god under its thatched cone: a ring of wall on a low platform, entered through the jaws of a serpent
  { const x = 23, z = 54, y = PY + 0.4, N = 12, RW = 3.5;
    B.cyl(M.plaster, 4.7, 4.9, 0.4, x, PY, z, { c: STUC, seg: 18, solid: true });
    for (let i = 1; i < N; i++) { const a = i / N * 6.2832; B.box(M.plaster, 2 * RW * Math.tan(Math.PI / N) + 0.14, 3.4, 0.4, x + Math.sin(a) * RW, y, z - Math.cos(a) * RW, { ry: -a, c: 0xd8d2c2, solid: true }); }
    B.box(M.plaster, 2.0, 0.9, 0.4, x, y + 2.5, z - RW, { c: 0xd8d2c2, solid: true }); B.box(M.flat, 2.3, 0.3, 0.5, x, y + 2.5, z - RW - 0.06, { c: RED });
    for (const k of [-1, 1]) { B.box(M.flat, 0.3, 2.5, 0.5, x + k * 1.0, y, z - RW - 0.06, { c: RED }); B.box(M.glow, 0.22, 0.22, 0.06, x + k * 0.55, y + 3.05, z - RW - 0.22, { c: 0xff8a30 });       // door posts, eyes and fangs
      for (const q of [0.25, 0.6]) B.geo(M.flat, new THREE.ConeGeometry(0.08, 0.36, 5), [x + k * q, y + 2.33, z - RW - 0.1], [Math.PI, 0, 0], 1, 0xf0ece0); }
    B.cyl(M.plaster, 3.8, 3.8, 0.2, x, y + 3.4, z, { c: 0xd0cabc, seg: 14, solid: true }); B.geo(M.thatch, new THREE.ConeGeometry(4.3, 4.4, 14), [x, y + 5.8, z], [0, 0, 0], 1, 0xb89a58);
    B.box(M.stone, 1.4, 0.8, 0.7, x, y, z + 2.3, { c: 0x7a7468, solid: true }); rug(B, M, x, y, z + 0.2, 0, { w: 2.2, d: 1.5, c: 0xc8b070, border: 0x8a7a48 });                        // the altar, with conch trumpets and a fan of feathers
    for (const [k, c] of [[-1, 0xf0d8c8], [1, 0xe8c8b8]]) B.geo(M.flat, new THREE.ConeGeometry(0.11, 0.34, 7), [x + k * 0.4, y + 0.9, z + 2.25], [0, 0, k * 1.35], 1, c);
    for (let i = -2; i <= 2; i++) B.box(M.flat, 0.07, 0.6, 0.02, x + i * 0.09, y + 0.8, z + 2.55, { rz: -i * 0.22, c: i % 2 ? TURQ : 0x1f9a5a });
    for (const k of [-1, 1]) { B.cyl(M.flat, 0.2, 0.13, 0.5, x + k * 1.7, y, z + 1.6, { c: 0x9a5a34, seg: 9, solid: true }); B.geo(M.glow, new THREE.ConeGeometry(0.09, 0.2, 5), [x + k * 1.7, y + 0.6, z + 1.6], [0, 0, 0], 1, 0xff7a20); } }  // incense burners
  for (const [x, z] of [[-29, 105], [34.5, 102], [31, 48]]) fire(x, PY, z, 1.2, 0);

  // ---- houses, a watchtower of reeds, a steam bath to crawl into ----
  const people = [], canoes = [], GROVE = [], MAT = { c: 0xc8b070, border: 0x8a7a48 }, CITY = 0xa89e8a;
  const who = (look, x, y, z, yaw, o) => { const f = person(B, M, root, look, x, y, z, yaw, o); people.push(f); return f; };
  /** A house of one room under a flat roof. o: { y (floor level; default: on the terrain), doors, flat (true = the roof can be walked on) }. */
  const house = (x, z, ry, w = 7, d = 6, band = RED, o = {}) => {
    const y = o.y ?? Math.max(world.height(x, z), world.height(x + 3, z + 3), world.height(x - 3, z - 3)) + 0.1;
    room(B, M, x, y, z, { w, d, h: 2.9, t: 0.35, ry, mat: M.plaster, c: STUC, base: 1.6, doors: o.doors || [{ side: 's', at: 0, w: 1.8, h: 2.2 }], floor: { mat: M.ground, c: 0x6a5a48 }, ceil: { mat: M.plaster, c: 0xd0cabc } });
    B.box(M.flat, w + 0.1, 0.4, d + 0.1, x, y + (o.flat ? 2.6 : 2.7), z, { ry, c: band }); if (!o.flat) B.box(M.plaster, w + 0.2, 0.3, d + 0.2, x, y + 3.1, z, { ry, c: STUC });
    B.box(M.plaster, w - 0.7, 0.04, d - 0.7, x, y + (o.flat ? 2.56 : 2.66), z, { ry, c: 0xd0cabc });                                         // the ceiling, under the painted band
    return { x, z, ry, w, d, y: y + 0.06, top: y + 3.1 };
  };
  const basket = (x, y, z, c) => { B.cyl(M.thatch, 0.27, 0.2, 0.3, x, y, z, { c: 0xb89a58, seg: 9 }); B.cyl(M.flat, 0.24, 0.24, 0.04, x, y + 0.27, z, { c, seg: 9 }); };
  /**
   * What a Mexica household keeps: a sleeping mat, store jars, baskets of maize and chilli, the household god in its niche, and one thing more.
   * kind: 'hearth' (the fire, a griddle with tortillas, the grinding stone), 'loom', 'store' (great jars, bales of cloaks), 'sleep' (more mats, a reed chest, a seat).
   * turn = how far the door wall is turned from the room's own +Z side. Returns the frame it used (door toward +Z) with hw, hd (half the inner size), ry, y.
   */
  const home = (h, kind, turn = 0) => {
    const ry = h.ry + turn, F = local(h.x, h.z, ry), y = h.y, hw = (turn ? h.d : h.w) / 2 - 0.35, hd = (turn ? h.w : h.d) / 2 - 0.35, at = (lx, lz, fn) => { const [x, z] = F(lx, lz); fn(x, z); };
    at(-hw + 1.0, -hd + 1.25, (x, z) => rug(B, M, x, y, z, ry, { w: 1.5, d: 2.0, ...MAT }));
    at(hw - 0.75, -hd + 0.75, (x, z) => { pots(B, M, x, y, z, { n: 3, s: 1.5, spread: 0.45, solid: false }); world.addBox(x, z, 1.3, 1.3, ry, y, y + 0.8); });
    at(hw - 0.5, 0.5, (x, z) => basket(x, y, z, 0xd8b23a)); at(hw - 0.55, 1.15, (x, z) => basket(x, y, z, 0xa02c20));
    at(0, -hd + 0.15, (x, z) => { B.box(M.stone, 0.7, 0.08, 0.26, x, y + 1.25, z, { ry, c: 0x8a8478 }); B.box(M.flat, 0.16, 0.34, 0.12, x, y + 1.33, z, { ry, c: 0x9a5a34 }); B.box(M.flat, 0.22, 0.1, 0.14, x, y + 1.67, z, { ry, c: TURQ }); });
    if (kind === 'hearth') {
      at(0.2, -0.4, (x, z) => hearth(B, M, x, y, z, { r: 0.42 }));
      at(1.1, -1.0, (x, z) => { B.cyl(M.flat, 0.34, 0.34, 0.04, x, y + 0.1, z, { c: 0x5a4034, seg: 12 }); for (let i = 0; i < 3; i++) B.cyl(M.flat, 0.11, 0.11, 0.015, x - 0.1 + i * 0.1, y + 0.14 + i * 0.015, z + (i - 1) * 0.08, { c: 0xe0c880, seg: 8 }); });
      at(-hw + 1.2, 1.2, (x, z) => { B.box(M.stone, 0.36, 0.16, 0.62, x, y + 0.02, z, { ry, rx: 0.14, c: 0x5a5a58 }); B.geo(M.stone, new THREE.CylinderGeometry(0.05, 0.05, 0.42, 6), [x, y + 0.25, z], [0, ry, Math.PI / 2], 1, 0x6a6a66); });
    } else if (kind === 'loom') {                                                             // a backstrap loom: the warp runs from a post down to the weaver's waist
      at(-hw + 0.5, hd - 0.3, (x, z) => { B.box(M.wood, 0.1, 1.6, 0.1, x, y, z, { ry, c: 0x4a3420 }); B.box(M.wood, 0.7, 0.04, 0.04, x, y + 1.3, z, { ry, c: 0x8a6a44 }); });
      at(-hw + 0.5, hd - 1.15, (x, z) => B.box(M.cloth, 0.55, 0.02, 1.88, x, y + 0.9, z, { ry, rx: -0.44, c: 0xe8dcc0 }));
      at(-hw + 0.5, hd - 1.75, (x, z) => B.box(M.cloth, 0.56, 0.025, 0.55, x, y + 0.63, z, { ry, rx: -0.44, c: 0xa02c20 }));
      at(-hw + 0.5, hd - 2.0, (x, z) => B.box(M.wood, 0.7, 0.04, 0.04, x, y + 0.5, z, { ry, c: 0x8a6a44 }));
    } else if (kind === 'store') {
      at(-hw + 0.85, hd - 0.85, (x, z) => { pots(B, M, x, y, z, { n: 2, s: 2.4, spread: 0.5, solid: false }); world.addBox(x, z, 1.5, 1.5, ry, y, y + 1.3); });
      at(-hw + 0.7, 0.3, (x, z) => { B.box(M.cloth, 0.9, 0.5, 0.6, x, y, z, { ry, c: 0xe8dcc0, solid: true }); B.box(M.cloth, 0.86, 0.12, 0.56, x, y + 0.5, z, { ry, c: 0x2a6a9a }); });
      at(0.9, -hd + 0.5, (x, z) => basket(x, y, z, 0x6a3a22)); at(1.5, -hd + 0.55, (x, z) => basket(x, y, z, 0xe8e0c8));
    } else {
      at(-hw + 2.7, -hd + 1.25, (x, z) => { rug(B, M, x, y, z, ry, { w: 1.5, d: 2.0, ...MAT }); B.box(M.cloth, 1.3, 0.05, 1.0, x, y + 0.02, z, { ry, c: 0x8a3a2a }); });
      at(-hw + 0.45, hd - 1.1, (x, z) => chest(B, M, x, y, z, ry + Math.PI / 2, { w: 0.9, h: 0.5, c: 0xb89a58, band: 0x8a7438 }));
      at(-hw + 1.3, hd - 0.6, (x, z) => bench(B, M, x, y, z, ry, { w: 0.45, h: 0.3, c: 0xb89a58 }));
    }
    return Object.assign(F, { hw, hd, ry, y });
  };
  /** A granary: a great clay jar under a cap of thatch. Solid: cover for a body. */
  const granary = (x, y, z, s = 1) => {
    B.cyl(M.stone, 0.95 * s, 1.0 * s, 0.9, x, y - 0.6, z, { c: 0x8a8478, seg: 10 }); B.geo(M.plaster, new THREE.SphereGeometry(1, 12, 8), [x, y + 0.3 + 1.2 * s, z], [0, 0, 0], [1.2 * s, 1.3 * s, 1.2 * s], 0xb89468);
    B.geo(M.thatch, new THREE.ConeGeometry(1.5 * s, 1.1 * s, 12), [x, y + 0.3 + 2.75 * s, z], [0, 0, 0], 1, 0xb89a58); world.addCyl(x, z, 1.15 * s, y - 1, y + 2.6 * s);
  };
  { const F = home(house(-21, 33.5, 0.2), 'hearth'), [x, z] = F(-F.hw + 1.2, 1.85); who('mexicaWoman', x, F.y, z, F.ry + Math.PI, { pose: 'sit', arms: [-0.85, -0.8] }); }           // a woman at the grinding stone
  { const h = house(23, 35, -0.3, 6.5, 6, BLUE), F = home(h, 'sleep'), [x, z] = F(2.3, F.hd + 1.0), y = world.height(x, z);                                                          // an old man with a staff beside his door
    who('mexicaMan', x, y, z, h.ry + 0.4, { pose: 'hips', over: { hair: 0xb8b4ac, cape: 0xd8c8a0 }, arms: [-0.7, 0.1] }); rod(B, M.wood, [x + 0.34, y, z + 0.28], [x + 0.3, y + 1.5, z + 0.2], 0.022, 0x6a4a2c); }

  // ---- the city round the precinct: two quarters on stone embankments; between the precinct and the market quarter runs a canal ----
  B.box(M.stone, 32, 5.5, 68, -54, PY - 5.5, 74, { c: CITY, solid: true }); B.box(M.stone, 3, 5.5, 68, 39.5, PY - 5.5, 74, { c: CITY, solid: true }); B.box(M.stone, 25, 5.5, 68, 59.5, PY - 5.5, 74, { c: CITY, solid: true });
  B.box(M.stone, 10, 0.04, 4, -43, PY, 70, { c: 0xc8c2b4 }); B.box(M.stone, 3.4, 0.04, 26.4, -46.25, PY, 54.2, { c: 0xc8c2b4 }); B.box(M.stone, 19, 0.04, 4, 56.5, PY, 70, { c: 0xc8c2b4 });       // paved streets from the two side gates
  for (const [x, cuts] of [[40.85, [56.8, 59.2, 68, 72, 79.4, 83.2]], [47.15, [56.8, 59.2, 68, 72, 83.8, 87.8]]]) { let a = 40;                                                                 // kerbs along both quays, open at the bridges and the water stairs
    for (let i = 0; i <= cuts.length; i += 2) { const b = cuts[i] ?? 108; B.box(M.stone, 0.3, 0.55, b - a, x, PY, (a + b) / 2, { c: 0x8e887a, solid: true }); a = cuts[i + 1]; } }
  B.box(M.stone, 6, 0.6, 4, 44, PY - 0.6, 70, { c: 0xb2ac9e, solid: true }); for (const k of [-1, 1]) B.box(M.stone, 6, 0.55, 0.3, 44, PY, 70 + k * 1.85, { c: 0x8e887a, solid: true });               // the stone bridge before the east gate
  B.box(M.woodH, 6.6, 0.16, 2.2, 44, PY - 0.13, 58, { c: WOOD, solid: true }); for (const k of [-1, 1]) B.box(M.wood, 6.2, 0.24, 0.2, 44, PY - 0.37, 58 + k * 0.8, { c: 0x4a3420 });                    // a plank bridge where the drain comes out
  steps(B, M, 41.6, 80, 0, PY, 5, { w: 1.2, rise: 0.29, run: 0.6, c: 0x9a9486 }); steps(B, M, 46.4, 87.6, Math.PI, PY, 5, { w: 1.2, rise: 0.29, run: 0.6, c: 0x9a9486 });                               // water stairs on both quays,
  B.box(M.woodH, 5.6, 0.08, 1.6, 44, 0.22, 83.8, { c: 0x7a5a3a, solid: true }); canoes.push({ x: 44, z: 83.4, ry: Math.PI / 2 }, { x: 44, z: 84.2, ry: Math.PI / 2 });                                  // and between them two canoes lashed under a deck of planks: a way across below the street
  canoes.push({ x: 44.3, z: 49, ry: 0.06 }, { x: 43.2, z: 97, ry: -0.1 }, { x: 45.4, z: 63.5, ry: 0 });
  who('mexicaWoman', 39.3, PY, 63.2, 1.2, { pose: 'carry' }); basket(39.7, PY + 0.9, 63.35, 0xd8b23a);                                                                                              // a woman with a basket of maize on the quay

  // the palace of Axayacatl, where the strangers were lodged and which they left tonight: three wings round a patio, a stair to the roof
  { const y = PY, H = 3.4, RY = PY + H + 0.2, F = y + 0.06, wing = (x, z, w, d, doors, wins) => room(B, M, x, y, z, { w, d, h: H, t: 0.4, mat: M.plaster, c: STUC, doors, wins, floor: { mat: M.stone, c: 0x9a9488 }, ceil: { mat: M.plaster, c: 0xd0cabc } });
    wing(-58.5, 63.5, 21, 7, [{ side: 's', at: 4, w: 2.4, h: 2.6 }], [{ side: 'n', at: 0, w: 1.6, y: 1.0, h: 1.3 }, { side: 'n', at: 7, w: 1.6, y: 1.0, h: 1.3 }]);
    wing(-58.5, 86.5, 21, 7, [{ side: 'n', at: 2, w: 2.4, h: 2.6 }], [{ side: 's', at: -3, w: 1.6, y: 1.0, h: 1.3 }]);
    wing(-65.5, 75, 7, 16, [{ side: 'e', at: 0, w: 2.2, h: 2.6 }], [{ side: 'w', at: -4, w: 1.6, y: 1.0, h: 1.3 }, { side: 'w', at: 4, w: 1.6, y: 1.0, h: 1.3 }]);
    B.box(M.plaster, 1, H + 0.7, 1.2, -48.5, y - 0.5, 67.6, { c: STUC, solid: true }); B.box(M.plaster, 1, H + 0.7, 11.2, -48.5, y - 0.5, 77.4, { c: STUC, solid: true }); B.box(M.plaster, 1, 0.8, 3.6, -48.5, y + 2.8, 70, { c: STUC, solid: true });   // the gate wall
    for (const k of [-1, 1]) B.box(M.flat, 0.5, 2.8, 0.4, -47.95, y, 70 + k * 2.0, { c: RED });
    for (const [w, d, x, z] of [[21.1, 0.06, -58.5, 59.98], [21.1, 0.06, -58.5, 90.02], [0.06, 30.1, -69.02, 75], [0.06, 30.1, -47.98, 75]]) B.box(M.flat, w, 0.45, d, x, y + 2.9, z, { c: RED });                                                        // a red band under the roof line
    for (const [w, d, x, z] of [[21, 0.3, -58.5, 60.15], [21, 0.3, -58.5, 89.85], [0.3, 29.4, -68.85, 75], [0.3, 29.4, -48.15, 75]]) B.box(M.plaster, w, 0.5, d, x, RY, z, { c: STUC, solid: true });                                                     // and a low wall round the roof
    steps(B, M, -51, 83, Math.PI, RY, 9, { w: 1.8, rise: 0.36, run: 0.5, c: 0xb2ac9e });
    ladder(B, M, -57, 90, 0, 1, PY, RY);
    // the patio: fodder and a rail for the horses, kegs of powder, a chest forced open and what fell out of it
    GROVE.push([-56.5, 76.5, 1.3]); B.cyl(M.thatch, 1.0, 1.2, 0.9, -60, y, 81, { c: 0xc8a850, seg: 10, solid: true }); B.box(M.wood, 3.2, 0.1, 0.1, -60.5, y + 1.05, 78.6, { c: 0x5a4028 });
    for (const k of [-1, 1]) B.cyl(M.wood, 0.07, 0.08, 1.1, -60.5 + k * 1.5, y, 78.6, { c: 0x5a4028, seg: 6, solid: true });
    B.box(M.stone, 0.7, 0.6, 1.9, -58.2, y, 72.4, { ry: 0.5, c: 0x8a9484, solid: true }); B.box(M.flat, 0.5, 0.05, 0.5, -58.55, y + 0.6, 71.75, { ry: 0.5, c: TURQ });                                // an image of a god, thrown down
    hearth(B, M, -54.6, y, 80.2, { r: 0.5 }); for (const [x, z, r] of [[-59.2, 79.6, 0.3], [-61, 77.4, 1.2], [-57.6, 80.8, 2]]) B.box(M.thatch, 1.5, 0.03, 1.0, x, y, z, { ry: r, c: 0xc8a850 });      // their cook fire still burns; straw lies about
    barrel(B, M, -60.6, y, 68.3); barrel(B, M, -59.7, y, 68.1); crate(B, M, -58.6, y, 68.3, 0.8, 0.3); chest(B, M, -53.6, y, 73.6, 0.7); gold(-52.9, y, 74.4, 1, 3); gold(-54.6, y, 72.6, 4, 1);
    // south wing: the hall where the soldiers slept, and behind a wall they broke through the treasure of the old king
    for (const z of [61.5, 65.5]) B.box(M.plaster, 0.4, H, 2.2, -62, y, z, { c: STUC, solid: true });
    rubble(B, M, -61.1, F, 63.0, 0.7, 0xd8d2c2, 6); rubble(B, M, -62.9, F, 64.2, 0.5, 0xd8d2c2, 5);
    B.box(M.stone, 0.6, 0.7, 4.4, -68.1, F, 63.5, { c: 0x8a8478, solid: true }); gold(-68.1, F + 0.7, 62.4, 1.6, 2); gold(-68.1, F + 0.7, 64.8, 1.2, 1); gold(-66.2, F, 61.6, 1, 4); gold(-64.6, F, 65.4, 3, 2);
    chest(B, M, -65.8, F, 65.7, 0.2, { c: 0xb89a58, band: 0x8a7438 }); extraPicks.push([-65, 63.4, PY + 0.5]);
    for (let i = 0; i < 4; i++) { const x = -60.3 + i * 1.5; B.box(M.thatch, 0.9, 0.14, 1.9, x, F, 61.6, { c: 0xc8a850 }); B.box(M.cloth, 0.8, 0.05, 1.1, x, F + 0.14, 61.9, { c: [0x7a2a22, 0x4a4a3a, 0x2a3a5a, 0x6a5a3a][i] }); }
    B.box(M.wood, 0.1, 0.1, 2.6, -49.4, F + 1.0, 62.6, { c: 0x5a4028 }); for (const k of [-1, 1]) { B.box(M.wood, 0.1, 1.0, 0.1, -49.4, F, 62.6 + k * 1.2, { c: 0x5a4028 }); B.geo(M.flat, new THREE.SphereGeometry(0.3, 8, 6), [-49.4, F + 1.14, 62.6 + k * 0.6], [0, 0, 0], [0.75, 0.5, 1.1], 0x5a3a22); }   // saddles on a rail
    world.addBox(-49.4, 62.6, 0.6, 2.6, 0, F, F + 1.3);
    { const x = -49.6, z = 65.6; B.box(M.wood, 0.08, 1.7, 0.08, x, F, z, { c: 0x4a3420 }); B.box(M.wood, 0.08, 0.08, 0.9, x, F + 1.35, z, { c: 0x4a3420 }); world.addCyl(x, z, 0.3, F, F + 1.8);                 // a breastplate and a helmet left on their stand
      B.geo(M.metal, new THREE.CylinderGeometry(0.22, 0.19, 0.5, 9), [x, F + 1.12, z], [0, 0, 0], [0.7, 1, 1], 0xaeb4bc); B.geo(M.metal, new THREE.SphereGeometry(0.15, 8, 6), [x, F + 1.8, z], [0, 0, 0], [1, 0.85, 1.2], 0xaeb4bc); B.box(M.metal, 0.02, 0.1, 0.36, x, F + 1.88, z, { c: 0xaeb4bc }); }
    // west wing: the hearth where they melted the goldwork of the temples into bars
    hearth(B, M, -66.6, F, 79.4, { r: 0.7, pot: true }); for (let i = 0; i < 7; i++) B.box(M.metal, 0.3, 0.07, 0.12, -64.2 + (i % 2) * 0.05, F + Math.floor(i / 3) * 0.07, 80.6 + (i % 3) * 0.15, { ry: 0.1 * (i % 2), c: i % 2 ? GOLD : GOLD2 });
    sacks(B, M, -67.5, F, 70.6, Math.PI / 2, { c: 0x3a3632, w: 1.8 }); B.box(M.stone, 0.9, 0.5, 0.7, -67.8, F, 75, { c: 0x6a6a66, solid: true }); gold(-67.8, F + 0.5, 75, 1.6, 1); gold(-66.4, F, 73, 2, 2); gold(-64.4, F, 77.4, 5, 1);
    // north wing: the captains' quarters
    for (let i = 0; i < 3; i++) { const x = -67.4 + i * 1.9; B.box(M.woodH, 0.95, 0.3, 2.0, x, F, 88.4, { c: 0x5a4028 }); B.box(M.cloth, 0.9, 0.08, 1.9, x, F + 0.3, 88.4, { c: 0xd8d0c0 }); B.box(M.cloth, 0.92, 0.05, 1.1, x, F + 0.38, 88.0, { c: [0x7a2a22, 0x2a3a5a, 0x6a5a2a][i] }); }
    world.addBox(-65.5, 88.4, 4.8, 2.0, 0, F, F + 0.4);
    B.box(M.woodH, 2.2, 0.07, 0.9, -53.2, F + 0.71, 88.6, { c: 0x6a4a2e }); for (const k of [-1, 1]) B.box(M.wood, 0.1, 0.71, 0.8, -53.2 + k * 0.9, F, 88.6, { c: 0x5a4028 }); world.addBox(-53.2, 88.6, 2.2, 0.9, 0, F, F + 0.78);
    bench(B, M, -53.2, F, 87.6); B.cyl(M.flat, 0.11, 0.08, 0.26, -53.7, F + 0.78, 88.6, { c: 0x9a5a34, seg: 8 }); B.box(M.flat, 0.5, 0.01, 0.36, -52.8, F + 0.785, 88.6, { ry: 0.3, c: 0xe8dcc0 });
    chest(B, M, -49.3, F, 88.8, Math.PI / 2); barrel(B, M, -49.2, F, 84.3); barrel(B, M, -49.2, F, 85.2);
    { const x = -66, z = 75; who('mexicaMan', x, RY, z, Math.PI, { arms: [-2.25, -0.2], over: { cape: 0xe8dcc0 } }); B.geo(M.flat, new THREE.ConeGeometry(0.1, 0.32, 7), [x - 0.12, RY + 1.5, z - 0.3], [1.2, 0, 0], 1, 0xf0d8c8); }   // on the roof a man blows the conch to rouse the quarter
  }

  // a row of four houses along the outside of the west wall: a ladder at the south end, a stair at the north end, planks from roof to roof
  { const x = -41.75, RH = PY + 3.1, kinds = ['store', 'loom', 'hearth', 'sleep'];
    for (let i = 0; i < 4; i++) { const z = 43.5 + i * 6.2, h = house(x, z, 0, 5.5, 5, i % 2 ? BLUE : RED, { y: PY, flat: true, doors: [{ side: 'w', at: 0, w: 1.6, h: 2.2 }] }), F = home(h, kinds[i], -Math.PI / 2);
      B.box(M.plaster, 0.3, 0.5, 5, x + 2.6, RH, z, { c: STUC, solid: true });                                                              // a low wall on the precinct side
      if (i < 3) B.box(M.woodH, 1.8, 0.1, 2.0, x - 0.5 + (i % 2) * 0.9, RH - 0.05, z + 3.1, { ry: 0.06 - (i % 2) * 0.1, c: WOOD, solid: true });
      if (i === 1) { const [wx, wz] = F(-F.hw + 0.5, F.hd - 2.25); who('mexicaWoman', wx, F.y, wz, F.ry, { pose: 'sit', arms: [-1.0, -0.9] }); } }   // the weaver at her loom
    ladder(B, M, x - 2.75, 42.1, -1, 0, PY, RH);
    B.box(M.stone, 1.5, 3.76, 1.8, -39.75, PY - 1, 65.5, { c: 0xb2ac9e, solid: true }); steps(B, M, -40.5, 65.5, -Math.PI / 2, PY + 2.76, 7, { w: 1.8, rise: 0.345, run: 0.5, c: 0xb2ac9e });
  }
  // the rest of the west quarter: a house in its garden south of the palace, a granary and fruit trees north of it
  home(house(-58, 47, 0, 7, 6, BLUE, { y: PY }), 'hearth'); granary(-65.5, PY, 50.5); granary(-58, PY, 96, 1.1); granary(-45, PY, 99);
  GROVE.push([-66, 56, 1.1], [-51.5, 55, 1], [-66.5, 43, 1.2], [-51, 43, 0.9], [-63.5, 99, 1.2], [-53, 103, 1.1], [-47.5, 94.5, 1], [-67, 105, 1], [-41.5, 104, 1.1], [-42, 78, 1], [-42.5, 88, 1.2]);

  // ---- the market quarter beyond the canal: stalls under awnings, two raised floors for the dealers in cloaks and pots (room to crawl underneath), goods laid out on mats ----
  for (const [x, z, e, cl, goods] of [[52, 61, 1, RED, [0xb83a2a, 0xd8b23a, 0x5a8a3a]], [52, 79, 1, 0x2a6a9a, [0x6a3a22, 0xe8e0c8, 0x8a5a34]], [52, 83.6, 1, 0xd9a820, [0x1f9a5a, 0x2ac8c0, 0xb01c1c]], [62, 60, -1, 0xd9a820, [0x15120f, 0x3a3a40, 0xe8e0c8]], [62, 64.6, -1, 0x2a8a4a, [0xc86a2a, 0xd8b23a, 0xa02c20]], [62, 80, -1, RED, [0xe8dcc0, 0x2a6a9a, 0xd9a820]]])
    stall(B, M, x, PY, z, e * Math.PI / 2, { cloth: cl, cloth2: 0xe6dcc0, goods });
  for (const [z, side, c] of [[62, 's', 0x2a6a9a], [80, 'n', RED]]) { const y = deck(B, M, 57, PY, z, 0, { w: 2.6, d: 5, h: 1.4, steps: side, stepW: 1.5 }).top;
    rug(B, M, 57, y, z, 0, { w: 2.2, d: 4.4, ...MAT });
    if (side === 's') for (let i = 0; i < 5; i++) B.box(M.cloth, 0.8, 0.12 + (i % 3) * 0.1, 0.55, 56.5 + (i % 2) * 0.95, y, z - 1.8 + i * 0.75, { ry: (i % 3 - 1) * 0.12, c: [0xe8dcc0, c, 0xd9a820, 0xa02c20, 0x1f8a7a][i] });      // cotton cloaks, folded
    else { pots(B, M, 56.6, y, z + 1.2, { n: 4, s: 1.1, solid: false }); pots(B, M, 57.3, y, z - 0.6, { n: 3, s: 1.6, c: [0x8a4a2c, 0xb0683c, 0x3a2a22], solid: false }); } }
  rug(B, M, 55.5, PY, 88.5, 0.1, { w: 2.6, d: 1.8, ...MAT }); for (const [x, z, c] of [[54.8, 88.2, 0x6a3a22], [55.6, 88.9, 0xd8b23a], [56.3, 88.3, 0xa02c20], [55.3, 88.1, 0xe8e0c8]]) basket(x, PY + 0.02, z, c);                    // cacao, maize, chilli, salt
  rug(B, M, 60.5, PY, 88, -0.15, { w: 2.4, d: 1.6, ...MAT }); for (let i = 0; i < 7; i++) B.box(M.flat, 0.05, 0.02, 0.26, 59.7 + i * 0.26, PY + 0.03, 88 + (i % 2) * 0.2, { ry: 0.4 + i * 0.3, c: 0x15151a });                             // blades of obsidian
  rug(B, M, 56.5, PY, 54, 0, { w: 2.6, d: 1.6, ...MAT }); for (let i = 0; i < 6; i++) B.box(M.flat, 0.09, 0.02, 0.7, 55.6 + i * 0.36, PY + 0.03, 54, { ry: (i - 2.5) * 0.12, c: [0x1f9a5a, TURQ, 0xb01c1c, 0xd9a820][i % 4] });              // feathers
  for (const [x, z] of [[65.2, 85], [65.4, 86.3]]) { B.box(M.thatch, 0.9, 0.7, 0.9, x, PY, z, { ry: 0.2, c: 0xb89a58, solid: true }); B.geo(M.flat, new THREE.SphereGeometry(0.2, 7, 5), [x + 0.1, PY + 0.86, z], [0, 0, 0], [1, 0.9, 1.3], 0x3a2a22); B.box(M.flat, 0.06, 0.12, 0.06, x + 0.1, PY + 1.0, z + 0.24, { c: 0xb01c1c }); }   // turkeys in wicker cages
  sacks(B, M, 65.6, PY, 67, Math.PI / 2, { c: 0x8a6a48 }); sacks(B, M, 50.2, PY, 74.6, 0, { c: 0xb8a47c, w: 2.4 }); granary(68, PY, 61); granary(68, PY, 77, 1.1);
  home(house(67.5, 48, -Math.PI / 2, 7, 6, BLUE, { y: PY }), 'store'); home(house(67.5, 95, -Math.PI / 2, 7, 6, RED, { y: PY }), 'sleep'); home(house(54.5, 45.5, 0, 7, 6, RED, { y: PY }), 'hearth');
  GROVE.push([52, 98, 1.1], [59, 102, 1.2], [65, 104, 1], [50, 104.5, 1], [63, 53, 1], [69.5, 56, 1.1], [49.5, 53, 0.9], [69, 86, 1]);
  who('mexicaWoman', 51.7, PY, 79.5, Math.PI / 2 + 0.3, { pose: 'talk' }); who('mexicaWoman', 51.5, PY, 83.3, Math.PI / 2 - 0.4, { pose: 'sit', seat: 0, arms: [-0.6, -0.5] });                                                             // two market women behind their stalls

  // ---- inside the precinct: the House of the Eagles, a pillared hall open to the square; the ball court ----
  { const x = 29, z = 90, y = PY + 0.3, T = y + 3.6;
    B.box(M.stone, 8, 0.3, 14, x, PY, z, { c: 0xb2ac9e, solid: true }); B.box(M.plaster, 0.5, 3.2, 14, x + 3.75, y, z, { c: STUC, solid: true }); for (const k of [-1, 1]) B.box(M.plaster, 7.5, 3.2, 0.5, x - 0.25, y, z + k * 6.75, { c: STUC, solid: true });
    for (const dz of [-3.6, 0, 3.6]) { B.box(M.plaster, 0.8, 3.2, 0.8, x - 3.6, y, z + dz, { c: 0xd8d2c2, solid: true }); B.box(M.flat, 0.86, 0.5, 0.86, x - 3.6, y + 1.2, z + dz, { c: BLUE }); }
    B.box(M.plaster, 8.6, 0.4, 14.6, x, y + 3.2, z, { c: 0xd0cabc, solid: true }); B.box(M.flat, 8.7, 0.3, 14.7, x, y + 3.25, z, { c: RED });
    for (const dz of [-5, -1.7, 1.7, 5]) B.box(M.plaster, 0.5, 0.7, 1.5, x - 4.0, T, z + dz, { c: STUC, solid: true });                                              // merlons on the roof: cover for whoever climbs the ladder
    B.box(M.stone, 0.7, 0.5, 13, x + 3.15, y, z, { c: 0x9a9488, solid: true }); B.box(M.flat, 0.72, 0.16, 13.02, x + 3.15, y + 0.3, z, { c: 0x2a8a7a });                 // the painted bench along the walls
    for (const k of [-1, 1]) { B.box(M.stone, 5.6, 0.5, 0.7, x - 0.1, y, z + k * 6.15, { c: 0x9a9488, solid: true }); B.box(M.flat, 5.62, 0.16, 0.72, x - 0.1, y + 0.3, z + k * 6.15, { c: 0x2a8a7a });
      fire(x - 0.6, y, z + k * 3.2, 0.9); rug(B, M, x + 1.4, y, z + k * 3.2, 0, { w: 1.6, d: 2.2, ...MAT });
      B.box(M.stone, 0.9, 1.1, 1.2, x - 4.9, PY, z + k * 6.4, { c: 0x8a9484, solid: true }); B.geo(M.stone, new THREE.ConeGeometry(0.28, 0.7, 4), [x - 5.5, PY + 0.8, z + k * 6.4], [0, 0, 1.9], 1, 0xd9a820);   // eagle heads flank the front
      for (const q of [-1, 1]) B.box(M.glow, 0.06, 0.16, 0.16, x - 5.36, PY + 0.95, z + k * 6.4 + q * 0.3, { c: 0xff8a30 }); }
    for (let i = 0; i < 5; i++) B.box(M.flat, 0.5, 0.5, 0.05, x + 3.47, y + 1.6, z - 4.8 + i * 2.4, { ry: Math.PI / 2, rz: Math.PI / 4, c: i % 2 ? GOLD2 : 0x2a8a7a });  // shields painted on the back wall
    ladder(B, M, x + 1.5, z - 7.3, 0, -1, PY, T, { lean: 0.1 });
  }
  { const z = 89, L = 22, T = PY + 2.2;                                                                                                                         // the ball court: an alley between two banks, a stone ring on each, stairs at both ends
    for (const [x, e] of [[-33.25, 1], [-24.75, -1]]) {
      B.box(M.plaster, 3.5, 3.2, L, x, PY - 1, z, { c: STUC, solid: true }); B.box(M.flat, 3.54, 0.4, L + 0.04, x, T - 0.9, z, { c: e > 0 ? RED : BLUE });
      B.box(M.stone, 0.8, 0.45, L, x + e * 2.15, PY, z, { c: 0xb2ac9e, solid: true });
      B.box(M.stone, 0.3, 0.3, 0.3, x + e * 1.85, T - 0.25, z, { c: 0x8a9484 }); B.geo(M.stone, new THREE.TorusGeometry(0.42, 0.11, 6, 14), [x + e * 2.35, T - 0.1, z], [0, 0, 0], 1, 0x8a9484);
      for (const k of [-1, 1]) { steps(B, M, x, z + k * L / 2, k > 0 ? 0 : Math.PI, T, 5, { w: 2.4, rise: 2.2 / 6, run: 0.5, c: 0xb2ac9e }); B.box(M.plaster, 0.5, 0.7, 2.2, x - e * 1.5, T, z + k * 6, { c: STUC, solid: true }); }
    }
    B.geo(M.flat, new THREE.SphereGeometry(0.13, 8, 6), [-28.2, PY + 0.13, 84.6], [0, 0, 0], 1, 0x1a1614);
  }
  // on the Great Temple a man beats the great drum: it is this drum that has woken the city
  who('mexicaMan', 0, TOP, 86.55, Math.PI, { arms: [-1.05, -0.5], over: { cape: 0x1a1a1e, kilt2: 0xa02c20 } });
  stand(B, M, 30, world.height(30, 31), 31, 0.4, { c: 0x8a7a4a, roof: 0xb89a58 });
  { const x = -33, z = 33.5, y = world.height(x, z) + 0.02; den(B, M, x, y, z, -0.5, { mat: M.plaster, c: 0xb8b0a0 }); B.geo(M.plaster, new THREE.SphereGeometry(2.7, 12, 8), [x, y + 1.3, z], [0, 0, 0], [1, 0.55, 1], 0xc8c0b0); extraPicks.push([x, z, 0, 0.6]); }

  // ---- the garden plots: beds of black earth staked out in the lake. East of the causeway a walk of planks links them, from the island to the far shore ----
  { const stakes = [];
    for (const [cx, cz, w, d] of CHIN) { const hw = w / 2 - 0.6, hd = d / 2 - 0.6;
      B.box(M.ground, hw * 2, 4.4, hd * 2, cx, PLOT - 4.4, cz, { c: 0x6a5a44, solid: true });
      for (let t = -hw; t <= hw + 0.01; t += 0.7) for (const e of [-1, 1]) stakes.push({ x: cx + t, y: -0.7, z: cz + e * (hd + 0.07), ry: t, s: [1, 1 + (Math.abs(t * 7.3) % 1) * 0.2, 1] });
      for (let t = -hd + 0.7; t < hd; t += 0.7) for (const e of [-1, 1]) stakes.push({ x: cx + e * (hw + 0.07), y: -0.7, z: cz + t, ry: t, s: [1, 1 + (Math.abs(t * 7.3) % 1) * 0.2, 1] }); }
    root.add(instanced(xf(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 5), [0, 0.85, 0], [0, 0, 0], 1, 0x5a4632), M.wood, stakes, { cast: false })); }
  /** A walk of planks on posts over the water from (x0, z0) to (x1, z1): wide enough for the men who follow you. */
  const pier = (x0, z0, x1, z1, top = PIER, w = 1.8) => { const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    B.box(M.woodH, len, 0.14, w, (x0 + x1) / 2, top - 0.14, (z0 + z1) / 2, { ry: Math.atan2(-uz, ux), c: WOOD, solid: true });
    for (let t = 0.6; t < len; t += 3.2) for (const e of [-1, 1]) B.cyl(M.wood, 0.09, 0.11, top + 3.3, x0 + ux * t - uz * e * (w / 2 - 0.1), -3.4, z0 + uz * t + ux * e * (w / 2 - 0.1), { c: 0x3a2c1e, seg: 6 }); };
  pier(24, 26, 24, 4.2); pier(27, -4.2, 27, -18.3); pier(26, -25.7, 26, -39.8); pier(24, -48.2, 24, -59.8); pier(24, -68.2, 24, -79.8); pier(22, -88.2, 22, -99.5);
  pier(CW, SIDE[1], 16.8, SIDE[1], PIER, 2);                                                                    // the side stair off the causeway: a jetty to the plots
  { const x = 32.6, z = -22, y = PLOT;                                                                         // a gardener's hut of reeds on one of the plots
    room(B, M, x, y, z, { w: 3, d: 3.4, h: 2.1, t: 0.2, mat: M.thatch, c: 0xb89a58, base: 0.3, doors: [{ side: 'w', at: 0, w: 1.5, h: 1.9 }], floor: { mat: M.ground, c: 0x6a5a48 }, ceil: { mat: M.thatch, c: 0xa88a48 } });
    B.geo(M.thatch, new THREE.ConeGeometry(2.9, 1.3, 4), [x, y + 2.95, z], [0, Math.PI / 4, 0], 1, 0xb89a58); rug(B, M, x + 0.5, y + 0.06, z - 0.7, 0, { w: 1.4, d: 1.6, ...MAT });
    basket(x + 0.9, y + 0.06, z + 1.1, 0xd8b23a); basket(x + 0.3, y + 0.06, z + 1.2, 0x5a8a3a); rod(B, M.wood, [x - 0.6, y + 0.06, z + 1.35], [x - 0.7, y + 1.6, z + 1.45], 0.025, 0x6a4a2c); B.box(M.wood, 0.14, 0.4, 0.03, x - 0.6, y + 0.06, z + 1.36, { c: 0x5a4028 });   // the digging stick
    extraPicks.push([x + 0.3, z, y + 0.5]); }
  stand(B, M, 19.4, PLOT, -41.5, Math.PI, { w: 2.6, d: 2.6, c: 0x8a7a4a, roof: 0xb89a58 });                    // a lookout of reeds over the maize, from where the whole road can be seen

  // ---- the aqueduct that brings the springs of Chapultepec to the city: a wall of masonry west of the causeway, its channel wide enough to run along ----
  for (const [za, zb] of [[30, -60.4], [-63.6, -118]]) { const L = za - zb, zc = (za + zb) / 2;
    B.box(M.stone, 2.4, 6.3, L, AQ, AQY - 6.3, zc, { c: 0x9a9486, solid: true });
    for (const e of [-1, 1]) B.box(M.stone, 0.3, 0.14, L, AQ + e * 1.05, AQY, zc, { c: 0x8e887a });
    B.box(M.flat, 1.1, 0.03, L - 0.6, AQ, AQY, zc, { c: 0x2f6a7a }); }
  B.box(M.woodH, 1.8, 0.14, 4.4, AQ + 0.1, AQY - 0.1, -62, { ry: 0.05, c: WOOD, solid: true });                 // where a span has fallen in, a plank lies across
  for (const [x, z, s] of [[AQ - 0.9, -61.4, 0.7], [AQ + 0.8, -62.6, 0.9], [AQ + 2.0, -61.8, 0.6]]) B.geo(M.rock, rockGeo(3 + s * 10 | 0, 0), [x, -0.15, z], [0, x, 0], [s, s * 0.7, s], 0x9a9486);
  steps(B, M, AQ, 30, 0, AQY, 2, { w: 2.4, rise: 0.3, run: 0.5, c: 0x9a9486 });                                   // steps down into the city,
  steps(B, M, AQ + 1.2, SIDE[-1], Math.PI / 2, AQY, 2, { w: 2, rise: 0.3, run: 0.5, c: 0x9a9486 }); pier(AQ + 2.2, SIDE[-1], -CW, SIDE[-1], 1.4, 2);   // to a jetty from the causeway,
  for (const e of [-1, 1]) steps(B, M, AQ + e * 1.2, -100, e * Math.PI / 2, AQY, 3, { w: 2.4, rise: 0.3, run: 0.5, c: 0x9a9486 });                     // on both sides where it comes ashore,
  for (const [z, x1] of [[4, -15.8], [-36, -16.3]]) { steps(B, M, AQ - 1.2, z, -Math.PI / 2, AQY, 3, { w: 2, rise: 0.3, run: 0.5, c: 0x9a9486 }); pier(AQ - 2.7, z, x1, z, PIER, 2); }   // and twice to the garden plots west of it,
  pier(-27, 0.4, -31.4, -8.9); pier(-30.5, -19.1, -23.5, -32.4);                                                                                    // which planks join into a round of their own

  // ---- canoes: moored along the causeway and the plots, and out on the water the people of the lake, come to see the strangers go ----
  for (const [x, z, ry] of [[5.7, 15, 0.05], [-5.8, -9, -0.04], [5.8, -80, 0.03], [29.3, -11, 0.1], [22.6, -54, -0.1], [15.2, -84, 0.2], [-23.5, -5.5, 0.4], [-14.5, 12, 0.3], [-36, -24, 0.5], [-17.5, -52, -0.2]]) canoes.push({ x, z, ry });
  /** A canoe out on the lake with its crew: [look, place along the hull, 'pole' | 'paddle' | 'point', the way he or she faces]. Nobody in it is armed. */
  const afloat = (x, z, ry, crew) => { canoes.push({ x, z, ry }); const F = local(x, z, ry);
    for (const [look, lz, what, yaw] of crew) { const [px, pz] = F(0, lz), [hx, hz] = local(px, pz, yaw)(0.3, 0.3);
      if (what === 'paddle') { who(look, px, -0.04, pz, yaw, { pose: 'sit', arms: [-0.9, -0.5], solid: false, stay: true }); rod(B, M.wood, [hx, -0.5, hz], [px + (hx - px) * 0.7, 1.0, pz + (hz - pz) * 0.7], 0.022, 0x8a6a44); B.box(M.wood, 0.16, 0.5, 0.03, hx, -0.55, hz, { ry: yaw, c: 0x8a6a44 }); }
      else if (what === 'pole') { who(look, px, -0.04, pz, yaw, { arms: [-0.95, -0.6], solid: false, stay: true }); rod(B, M.wood, [hx + (hx - px) * 0.3, -3, hz + (hz - pz) * 0.3], [hx, 2.5, hz], 0.025, 0x8a6a44); }
      else who(look, px, -0.04, pz, yaw, { pose: 'point', solid: false, stay: true }); } };
  afloat(11.5, -31, 0.15, [['mexicaMan', 1.6, 'pole', 0.15], ['mexicaWoman', -1.1, 'paddle', 0.15]]); afloat(-19, -22, 0.3, [['mexicaMan', 1.5, 'pole', 0.3]]);
  afloat(11.5, -13, 0.12, [['mexicaMan', 1.3, 'point', -1.4]]); afloat(11, -70, -0.1, [['mexicaMan', -1.3, 'pole', -1.2]]);

  // ---- what the strangers threw down as they ran: bales, chests and kegs heaped across half the road ----
  for (const [e, z] of [[-1, -33], [1, -61.5], [-1, -84]]) { sacks(B, M, e * 2.3, 1.4, z, 0.1 * e, { c: 0x8a7458, w: 2.4 }); chest(B, M, e * 3.3, 1.4, z + 1.2, 0.5 * e); crate(B, M, e * 1.4, 1.4, z + 1.25, 0.8, 0.3); barrel(B, M, e * 0.6, 1.4, z - 0.2); gold(e * 2.5, 1.4, z + 2.0, z, 2); }

  // ---- the landing: where the causeway comes ashore, a village of the lake people; their canoes are drawn up on the beach ----
  const SHORE = [[-22, -108], [22, -110], [-32, -124], [-5, -129], [14, -126], [35, -121], [-41, -108], [36, -103.5]];
  home(house(-22, -108, 0.15), 'store'); home(house(22, -110, -0.2, 6.5, 6, BLUE), 'hearth'); home(house(-32, -124, 0.5, 7, 6, BLUE), 'sleep'); home(house(-5, -129, 0.1), 'hearth'); home(house(14, -126, -0.15, 6.5, 6, BLUE), 'loom'); home(house(35, -121, -0.6), 'store');
  for (const [x, z, s] of [[5, -118, 1.1], [27, -116.5, 1]]) granary(x, world.height(x, z) - 0.15, z, s);
  boulder(B, M, -41, world.height(-41, -108), -108, { rx: 4.6, rz: 4.2, h: 5, ladder: 0.2, seed: 5 });                         // a rock to climb, with the whole landing below it
  { const x = 36, z = -103.5, y = Math.max(world.height(x - 2, z), world.height(x + 2, z), world.height(x, z - 2.5), world.height(x, z + 2.5));   // three canoes upturned on trestles to dry: room to crawl underneath
    for (let i = -1; i <= 1; i++) canoes.push({ x: x + i * 0.95, y: y + 1.68, z, ry: i * 0.03, rx: Math.PI });
    for (const k of [-1, 1]) { B.box(M.wood, 3.5, 0.1, 0.12, x, y + 1.2, z + k * 1.7, { c: 0x5a4028 }); for (const q of [-1, 1]) { B.cyl(M.wood, 0.07, 0.08, 2.0, x + q * 1.65, y - 0.8, z + k * 1.7, { c: 0x5a4028, seg: 6 }); world.addCyl(x + q * 1.65, z + k * 1.7, 0.1, y - 1, y + 1.2); } }
    world.addBox(x, z, 2.9, 5.2, 0, y + 1.25, y + 1.7); }
  for (const [x, z, ry] of [[-28, -96.6, 0.25], [9.5, -96.4, -0.15], [30, -96.2, 0.3], [-47, -96.8, 0.5]]) canoes.push({ x, y: Math.max(world.height(x, z), 0) + 0.02, z, ry, rz: 0.08 });
  { const bird = merge([gSph(0.2, 0x3a2a22, [0, 0.38, 0], [1, 0.9, 1.3]), gCyl(0.27, 0.27, 0.03, 0x5a4632, [0, 0.52, -0.27], [1.2, 0, 0], 1, 10), gCyl(0.035, 0.045, 0.24, 0x8a8a9a, [0, 0.6, 0.22]), gSph(0.05, 0xb01c1c, [0, 0.74, 0.24]),
      gCyl(0.015, 0.015, 0.24, 0xd9a820, [0.07, 0.12, 0]), gCyl(0.015, 0.015, 0.24, 0xd9a820, [-0.07, 0.12, 0])]);                    // turkeys loose between the houses
    root.add(instanced(bird, M.flat, [[18.5, -118.5, 0.5], [19.6, -119.4, 2.6], [17.4, -120.2, 4], [-26, -116, 1], [-25, -117.2, 3.3], [61, 91.5, 2], [62.2, 92.4, 5]].map(([x, z, ry]) => ({ x, y: z > 0 ? PY : world.height(x, z), z, ry })))); }
  root.add(instanced(merge([gBox(0.8, 0.08, 4.8, 0x6a4a2c, [0, 0.04, 0]), gBox(0.07, 0.36, 5.0, 0x6a4a2c, [-0.43, 0.2, 0], [0, 0, 0.12]), gBox(0.07, 0.36, 5.0, 0x6a4a2c, [0.43, 0.2, 0], [0, 0, -0.12]),
    gBox(0.8, 0.07, 0.75, 0x5a3e24, [0, 0.2, 2.6], [-0.55, 0, 0]), gBox(0.8, 0.07, 0.75, 0x5a3e24, [0, 0.2, -2.6], [0.55, 0, 0])]), M.wood, canoes.map((c) => ({ y: -0.1, ...c }))));   // every canoe of the level: a trough with square, upturned ends

  // ---- greenery: the lake shore and the gardens run wild in the rain ----
  const open = (x, z) => (Math.abs(x) < 73.5 && z > 38.5 && z < 110) || (Math.abs(x) < 7.5 && z < 44 && z > -116) || (Math.abs(x - AQ) < 3 && z < 36) || Math.hypot(x / 44, (z + 116) / 17) < 1
    || (Math.abs(x) < 40 && z > 24 && z < 39 && fbm(x * 0.09 + 7, z * 0.09, 2, 3) < 0.6)                                    // before the gate only groves are left
    || CHIN.some(([cx, cz, w, d]) => Math.abs(x - cx) < w / 2 + 1 && Math.abs(z - cz) < d / 2 + 1) || (Math.abs(x - 22) < 2.5 && z < -92 && z > -101) || (Math.abs(x - 24) < 2.5 && z > 20 && z < 30)
    || [[-21, 33.5], [23, 35], [30, 31], [-33, 33.5]].concat(SHORE).some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 6.5);
  const inPlay = (x, z) => Math.abs(x) < 84 && z > -142 && z < 136;
  const trees = [[], [], []], far = [], palms = [], bushes = [], reeds = [], cacti = [];
  // the jungle you walk in: trees set close, but never closer than a body needs to pass between them
  const taken = new Set();
  for (let i = 0; i < 14000; i++) {
    const x = (R() - 0.5) * 168, z = -142 + R() * 278, h = world.height(x, z);
    if (h < 0.85 || h > 16 || open(x, z)) continue;
    const key = Math.round(x / 2.7) + ',' + Math.round(z / 2.7); if (taken.has(key)) continue; taken.add(key);
    const s = 1.0 + R() * 0.9;
    trees[Math.floor(R() * 3)].push({ x, y: h - 0.3, z, ry: R() * 6.28, s: [s, s * (0.9 + R() * 0.5), s], c: R.pick([0xffffff, 0xd8e8d0, 0xc0d8b8, 0xe8f0d0]) });
    world.addCyl(x, z, 0.3 * s, h - 2, h + 7);
  }
  GROVE.forEach(([x, z, s], i) => { trees[i % 3].push({ x, y: PY - 0.3, z, ry: i * 1.7, s: [s, s * 1.1, s], c: [0xffffff, 0xd8e8d0, 0xe8f0d0][i % 3] }); world.addCyl(x, z, 0.3 * s, PY - 1, PY + 7); });   // the fruit trees of the city's gardens
  [[0x46964a, 0x5cae54, 0x3a8040], [0x5aa046, 0x72b852, 0x488a3a], [0x44946a, 0x58ac78, 0x387c58]].forEach((leaf, k) => root.add(instanced(blobTreeGeo({ leaf, trunk: 0x5a4632, h: 8 + k, spread: 3.0, blobs: 5, seed: 3 + k * 4 }), windify(M.rock.clone(), shared, 0.2, 8, 1.2), trees[k])));
  // the forest of the far shores and the lower slopes: the same trees, drawn more simply
  for (let i = 0; i < 120000 && far.length < 2600; i++) {
    const x = (R() - 0.5) * 1000, z = (R() - 0.5) * 1000, h = world.height(x, z);
    if (h < 0.9 || h > 120 || inPlay(x, z) || Math.hypot(x - VOL[0], z - VOL[1]) < VR * 0.55) continue;
    if (fbm(x * 0.012, z * 0.012 + 4, 3, 5) < 0.3 && R() < 0.7) continue;
    const s = 1.3 + R() * 1.4; far.push({ x, y: h - 0.3, z, ry: R() * 6.28, s: [s, s * (0.9 + R() * 0.4), s], c: R.pick([0xffffff, 0xd8e8d0, 0xb8d0b0, 0xe8f0c8]) });
  }
  root.add(instanced(farTreeGeo(), M.rock, far, { cast: false, thin: true }));
  for (let i = 0; i < 40000 && palms.length < 520; i++) {
    const x = (R() - 0.5) * 520, z = (R() - 0.5) * 620, h = world.height(x, z), play = inPlay(x, z);
    if (h < 0.75 || h > 18 || (play && open(x, z))) continue;
    const s = 0.85 + R() * 0.7; palms.push({ x, y: h - 0.2, z, ry: R() * 6.28, s: [s, s * (0.9 + R() * 0.3), s], c: R.pick([0xffffff, 0xd8e8d0]) });
    if (play) world.addCyl(x, z, 0.2 * s, h - 2, h + 6);
  }
  root.add(instanced(palmGeo(2), windify(M.rock.clone(), shared, 0.3, 6, 1.5), palms));
  for (let i = 0; i < 60000 && bushes.length < 1500; i++) {
    const x = (R() - 0.5) * 176, z = -144 + R() * 282, h = world.height(x, z);
    if (h < 0.7 || h > 16 || open(x, z)) continue;
    const s = 0.5 + R() * 0.6; bushes.push({ x, y: h - 0.05, z, ry: R() * 6.28, s: [s, s * (0.7 + R() * 0.5), s], c: R.pick([0xffffff, 0xc8e0c0, 0xe8f0d0]) });
  }
  root.add(instanced(bushGeo(), windify(M.rock.clone(), shared, 0.25, 1.5, 1.8), bushes, { cast: false, thin: true }));
  for (let i = 0; i < 60000 && reeds.length < 2600; i++) {
    const x = (R() - 0.5) * 200, z = (R() - 0.5) * 300, h = world.height(x, z);
    if (h < -0.7 || h > 0.9 || (Math.abs(x) < CW + 0.8 && z < 36) || (Math.abs(x) < 73 && z > 39.5 && z < 108.5) || (Math.abs(x - AQ) < 1.6 && z < 31) || (Math.abs(x - 23) < 2.2 && (z > 19 || z < -91))) continue;   // none through the paving, the aqueduct or the planks
    const s = 1.5 + R() * 1.6; reeds.push({ x, y: Math.max(h, -0.08) - 0.05, z, ry: R() * 6.28, s: [s * 0.8, s, s * 0.8], c: R.pick([0xb8c890, 0x98b070, 0xd0c890, 0x88a868]) });
  }
  root.add(instanced(tuftGeo(7, 0x4a6a3a, 0xffffff), windify(M.flat2.clone(), shared, 0.3, 1, 2.2), reeds, { cast: false, thin: true }));
  for (const [cx, cz, w, d] of CHIN) for (let i = 0; i < 46; i++) { const x = cx + (R() - 0.5) * (w - 3.4), z = cz + (R() - 0.5) * (d - 3.4), s = 1.9 + R() * 0.7; cacti.push({ x, y: world.height(x, z) - 0.05, z, ry: R() * 6, s: [s * 0.55, s, s * 0.55], c: R.pick([0xd8e890, 0xb8d070]) }); }
  root.add(instanced(tuftGeo(5, 0x3a6a2a, 0xffffff), windify(M.flat2.clone(), shared, 0.24, 1, 1.8), cacti, { cast: false, thin: true }));     // maize on the garden plots
  const nopal = [];
  for (let i = 0; i < 4000 && nopal.length < 60; i++) { const x = (R() - 0.5) * 130, z = -96 - R() * 46, h = world.height(x, z); if (h < 1 || open(x, z)) continue; const s = 0.7 + R() * 0.7; nopal.push({ x, y: h, z, ry: R() * 6, s: [s, s, s], c: 0xffffff }); }
  root.add(instanced(cactusGeo(), M.rock, nopal));
  // the great cypress by the landing, under which the story says their captain wept
  { const x = 13, z = -103, h = world.height(x, z); root.add(instanced(blobTreeGeo({ leaf: [0x1c3c22, 0x26502c, 0x183420], trunk: 0x3a2a1e, h: 7, spread: 3.4, blobs: 14, seed: 9 }), M.rock, [{ x, y: h - 0.4, z, ry: 1, s: [2.1, 2.0, 2.1], c: 0xffffff }])); world.addCyl(x, z, 0.9, h - 2, h + 12); }
  const rocks = [];
  for (let i = 0; i < 160; i++) { const x = (R() - 0.5) * 200, z = (R() - 0.5) * 320, h = world.height(x, z); if (h < 0.6 || open(x, z)) continue; const s = 0.3 + R() * R() * 1.6; rocks.push({ x, y: h + s * 0.15, z, ry: R() * 6, s: [s, s * 0.7, s], c: R.pick([0x5a5c58, 0x6a6c66, 0x4a4c48]) }); }
  root.add(instanced(rockGeo(4, 1), M.rock, rocks, { solid: true }));

  // ---- the last of the rain, catching the low sun ----
  root.add(makeAmbient(shared, { count: 1500, box: 28, boxY: 18, size: 0.026, colorA: 0xffe2b8, colorB: 0xd8c8c0, alpha: 0.42, fall: 17, wind: [1.4, 0, 0.6], flutter: 0.04 }));

  // ---- the rear guard's cannon, turned back on the city, and the captain's chest ----
  { const z = -72, y = 1.4; B.box(M.wood, 0.5, 0.36, 1.9, 0, y + 0.42, z - 0.5, { rx: -0.2, c: 0x5a4028 });                                           // the trail of the carriage
    for (const e of [-1, 1]) B.geo(M.wood, new THREE.CylinderGeometry(0.62, 0.62, 0.12, 12), [e * 0.62, y + 0.62, z + 0.3], [0, 0, Math.PI / 2], 1, 0x4a3420);
    B.geo(M.metal, new THREE.CylinderGeometry(0.15, 0.2, 2.2, 10), [0, y + 0.95, z + 0.6], [Math.PI / 2 - 0.08, 0, 0], 1, 0x3a3c42); B.geo(M.metal, new THREE.CylinderGeometry(0.19, 0.19, 0.12, 10), [0, y + 1.03, z + 1.66], [Math.PI / 2 - 0.08, 0, 0], 1, 0x55585e);
    for (let i = 0; i < 6; i++) B.geo(M.metal, new THREE.SphereGeometry(0.13, 8, 6), [-1.3 + (i % 3) * 0.27, y + 0.13 + Math.floor(i / 3) * 0.22, z - 0.2 + Math.floor(i / 3) * 0.13], [0, 0, 0], 1, 0x2a2c30);
    world.addBox(0, z + 0.3, 1.5, 2.6, 0, y, y + 1.2); }
  { const x = 3.4, z = -105.5, y = world.height(x, z); B.box(M.wood, 1.5, 0.75, 0.95, x, y, z, { ry: 0.4, c: 0x4a3420, solid: true }); B.box(M.wood, 1.5, 0.1, 0.95, x - 0.2, y + 0.95, z - 0.42, { ry: 0.4, rx: -1.0, c: 0x5a4028 });
    gold(x, y + 0.75, z, 0.4, 6); gold(x + 1.1, y, z + 0.7, 2, 5); gold(x - 1.2, y, z + 0.5, 4, 4); }
  const enemies = [
    ['rodelero', -10, 47, {}], ['rodelero', 12, 60, { patrol: true }], ['ballestero', 24, 46, {}], ['ballestero', -26, 47.5, {}], ['arcabucero', 8.5, 74.6, { y: PY + 13.2, static: true, yaw: Math.PI }], ['rodelero', 20, 64, {}],
    ['rodelero', -3, 38.5, {}], ['rodelero', 3, 36, {}], ['arcabucero', 0, 31.5, {}],
    ['ballestero', -26, 39, {}], ['rodelero', 29, 41, { patrol: true }], ['arcabucero', 30, 31, { up: 3.6, static: true, yaw: 3.6 }],
    ['rodelero', -2, 22, {}], ['ballestero', 2, 14, {}], ['jinete', 0, 9, {}],
    ['rodelero', 2, -6, {}], ['arcabucero', -2, -12, {}], ['rodelero', -1.5, -19, {}], ['ballestero', 2.2, -22, {}],
    ['jinete', 0, -36, {}], ['rodelero', -2, -42, {}], ['arcabucero', 2, -47, {}], ['ballestero', -2.4, -51, {}],
    ['cannoneer', 1.1, -73.6, { static: true, yaw: 0 }], ['arcabucero', -2.6, -72, { patrol: false }], ['rodelero', 2, -64, {}], ['rodelero', -2, -80, {}], ['ballestero', 2.5, -86, {}], ['jinete', 0, -92, {}],
    ['aztecBoss', 0, -104, { yaw: 0, patrol: false }], ['rodelero', -6, -102, {}], ['rodelero', 6, -101, {}], ['arcabucero', -4, -113, {}], ['ballestero', 14, -99, {}], ['jinete', -20, -100, {}], ['rodelero', 12, -114, {}],
    ['rodelero', -55, 72, {}], ['ballestero', -60, 86.3, {}], ['ballestero', -41.75, 55.9, { y: PY + 3.4, static: true, yaw: Math.PI / 2 }],                       // the palace and the roofs beside it
    ['rodelero', 55, 70, {}], ['ballestero', 64, 73, {}], ['arcabucero', 57, 80, { y: PY + 1.6 }], ['ballestero', -33.25, 92, { y: PY + 2.4 }],                       // the market; the ball court
    ['rodelero', 24, 0, {}], ['ballestero', 26, -64, {}], ['arcabucero', AQ, -30, { y: AQY + 0.2 }],                                                                // the garden plots; the aqueduct
  ];
  const cup = merge([gCyl(0.1, 0.075, 0.17, 0x6a3a22, [0, 0.085, 0], [0, 0, 0], 1, 9), gCyl(0.104, 0.104, 0.025, GOLD, [0, 0.17, 0], [0, 0, 0], 1, 9), gCyl(0.08, 0.08, 0.01, 0x3a1c10, [0, 0.185, 0], [0, 0, 0], 1, 9)]);
  let ft = 0;
  return {
    env: {
      sunDir: [0.52, 0.24, -0.82], sunColor: 0xff9a52, sunLight: 0xffbc84, sunIntensity: 4.2, sunSize: 0.0009,
      skyTop: 0x34488e, skyHorizon: 0xf2a462, skyGround: 0x7a5e58, haze: 0.5,
      fogColor: 0xd29c7a, fogDensity: 0.002, hemiSky: 0xa8b4e4, hemiGround: 0x8e7a5c, hemiIntensity: 2.3, envIntensity: 0.8,
      cloudCover: 0.62, cloudScale: 0.42, cloudLit: 0xffc88e, cloudShade: 0x6e4c5e,
      bloom: 0.36, bloomRadius: 0.65, bloomThreshold: 1.3, rays: 0.4, rayThreshold: 1.8, exposure: 1.12,
      saturation: 1.16, contrast: 1.08, vignette: 0.34, tintHi: 0xfff0dc, tintLo: 0xe6ecff, shadowRange: 90,
    },
    spawn: { x: 0, z: 52, yaw: 0 },
    vista: { c: [0, 8, 64], r: 64, h: 36, a: -1.6, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[12, 47], [-8, 20], [2, -14], [-2, -42], [2, -70], [-5, -109], [57, 62, PY + 1.9], [AQ, -76, AQY + 0.5], [29, 90, PY + 4.4]].concat(extraPicks),
    dust: [1.0, 0.86, 0.7], water: [[0, 10, 30], [0, -40, 30]], heroLight: 46,
    makePickup: () => new THREE.Mesh(cup, M.flat),
    update(dt, t, g) {
      idle(people, t);
      for (const L of lights) L.l.intensity = L.i * (0.8 + Math.sin(t * 13 + L.ph) * 0.11 + Math.sin(t * 5.7 + L.ph * 2) * 0.09);
      ft -= dt;
      if (ft <= 0) {
        ft = 0.06;
        for (const f of fires) {
          const k = f[3] || 1;
          g.gfx.glow.spawn(f[0] + (Math.random() - 0.5) * 0.3 * k, f[1], f[2] + (Math.random() - 0.5) * 0.3 * k, (Math.random() - 0.5) * 0.5, 1.3 + Math.random() * 1.2 * k, (Math.random() - 0.5) * 0.5, { life: 0.6 + Math.random() * 0.5, s0: 0.28 * k, s1: 0.03, r: 3, g: 1.1, b: 0.25, a: 0.9 });
        }
        if (Math.random() < 0.35) g.gfx.soft.spawn(VOL[0] + (Math.random() - 0.5) * 24, VH - 26, VOL[1] + (Math.random() - 0.5) * 24, 2.2, 6 + Math.random() * 4, 0.6, { life: 16, s0: 20, s1: 90, r: 0.5, g: 0.42, b: 0.42, a: 0.3, drag: 0.03 });   // the volcano smokes, lit from below
      }
    },
  };
}

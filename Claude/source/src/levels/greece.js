// Chapter IV - a Greek island in the age of heroes: beaches, a village, a temple on the hill.
import * as THREE from 'three';
import { Heightfield, prismGeo, rockGeo } from '../build.js';
import { makeAmbient, makeWater, windify } from '../gfx.js';
import { makeHumanoid } from '../actors.js';
import { drawTexture } from '../tex.js';
import { instanced, room, steps, tuftGeo, blobTreeGeo, ship, brazier, gBox, gCyl, gCone, gSph, gCap, xf, merge, stand, ladder, boulder, rod, shelf, local, table, bench, bed, chest, pots, sacks, rug, hearth, woodpile, haystack, deck, stall, crawlway, person, idle, beast, rubble, animal } from '../props.js';
import { fbm, smooth } from '../util.js';

export const greece = {
  id: 'greece', theme: 'theme-greece', chapter: 'Chapter IV', title: 'Ithaca', kanji: 'Ἰθάκη', place: 'Ithaca · the Ionian Sea · the age of heroes',
  story: 'You come home across the wine-dark sea and find red cloaks on your shore. Spartan ships lie in the harbour and their captain feasts in the temple on the hill. Land on the beach, cross the village, and climb to the sanctuary.',
  weapon: 'javelin', weaponName: 'Javelins & sword', alt: 'right mouse — sword',
  heroes: [
    { look: 'ulysses', name: 'Ulysses', who: 'King of Ithaca, the man of many wiles', trait: 'Sure aim', effect: 'javelins fly faster and hit harder', mods: { power: 1.3 }, sleeve: 0xc8946c, cuff: 0x8a6424 },
    { look: 'achilles', name: 'Achilles', who: 'Greatest warrior of the Trojan War', trait: 'Nearly invulnerable', effect: 'takes 35% less damage', mods: { armor: 0.65 }, sleeve: 0xd8a882, cuff: 0xd9b23a },
    { look: 'heracles', name: 'Heracles', who: 'Strongest of heroes, of the twelve labours', trait: 'Strength of ten', effect: 'starts with 170 health', mods: { hp: 170 }, sleeve: 0xc0875c, cuff: 0xc9963a },
  ],
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> throw a javelin &nbsp; <kbd>Right mouse</kbd> aim (the line shows where it lands) &nbsp; <kbd>F</kbd> sword cut',
  foes: 'Spartans remain', foesNone: 'The island is yours again', bossName: 'Lykos, captain of Sparta', bossDown: 'The Spartan captain has fallen', pickupText: 'Ambrosia  +35',
  deadTitle: 'To the shades', deadSub: 'The ferryman takes his coin.', clearTitle: 'Ithaca is home again',
  build,
};

const MARBLE = 0xece6d6, TERRA = 0xc4683a, BLUE = 0x2a5a9a;

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
  const PATH = [[0, 98], [0, 70], [5, 46], [0, 24], [0, 2], [0, -13]];
  const HILL = { x: 0, z: -52, top: 16 };
  const ISLETS = [[210, 70, 36, 13], [-230, -70, 46, 24], [70, 250, 30, 9], [-150, 230, 22, 15], [330, -160, 60, 30], [-60, -300, 50, 20]];
  const GOAT = [[-47, -53.1], [-17, -53.1]];                 // the goat path: a second way up the temple hill, from the west
  const ISLE = [56, 104], BAR = [[31, 98], ISLE, [77, 77]];  // Poseidon's islet in the south-east bay, and the sandbar that leads to it and on to the cape
  // ---- terrain: one island with a harbour bay, a hill, and islets around ---------------
  const hf = new Heightfield(1000, 320, (x, z) => {
    const d = Math.hypot(x, z / 1.25);
    let land = 1 - smooth(74, 104, d);
    land = Math.max(land, 1 - smooth(16, 34, Math.hypot(x - 92, z - 58)));                // the fishermen's cape in the south-east
    land *= 1 - (1 - smooth(14, 32, Math.hypot(x + 98, z - 16))) * 0.92;                 // harbour bay in the west
    const calm = 1 - (1 - smooth(2, 9, dPoly(PATH, x, z))) * 0.85;
    let h = -7.5 + land * 12 + (fbm(x * 0.03, z * 0.03, 4, 3) - 0.5) * 3.4 * land * land * calm;
    h += 3.2 * Math.exp(-((x - 74) ** 2 + (z + 8) ** 2) / 260) * land;                   // headland of the round temple
    const hd = Math.hypot(x - HILL.x, z - HILL.z);
    let hill = 1 - smooth(25, 33.5, hd);
    if (Math.abs(x) < 5.2 && z > -34.5 && z < -7.5) hill = smooth(-9, -33, z);            // the stairway: 24 m long, so no step is higher than a walker can climb
    if (Math.abs(z + 53.1) < 3.4 && x > -45.5 && x < -17.5) hill = smooth(-44, -19, x);   // the goat path: a ramp of earth, then a cut in the rim
    h = h * (1 - hill) + HILL.top * hill;
    for (const [ix, iz, r, ht] of ISLETS) h = Math.max(h, -7.5 + (ht + 7.5) * (1 - smooth(r * 0.3, r, Math.hypot(x - ix, z - iz))));
    return Math.max(h, -7.5 + 9.5 * (1 - smooth(3, 22, Math.hypot(x - ISLE[0], z - ISLE[1]))), -7.5 + 7.1 * (1 - smooth(5, 9, dPoly(BAR, x, z))));   // a low islet, and a bar of sand you can wade along
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -104, x1: 128, z0: -108, z1: 116 };
  world.maxSlope = 0.95; world.waterY = -0.9;
  const cSand = new THREE.Color(0xeedcae), cDry = new THREE.Color(0xd2bc7c), cGreen = new THREE.Color(0xa3a45e), cRock = new THREE.Color(0xd8cfb8), cPath = new THREE.Color(0xd9c79c),
    cShallow = new THREE.Color(0x46b8b4), cDeep = new THREE.Color(0x0d587a), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h, ny) => {
    if (h < 0) return tmp.copy(cSand).lerp(cShallow, smooth(0, -1.4, h)).lerp(cDeep, smooth(-1.4, -5.5, h));
    tmp.copy(cDry).lerp(cGreen, smooth(0.5, 0.72, fbm(x * 0.022 + 9, z * 0.022, 3, 7)) * 0.8);
    tmp.lerp(cPath, (1 - smooth(1.0, 3.0, Math.min(dPoly(PATH, x, z), dPoly(GOAT, x, z)))) * 0.85);
    tmp.lerp(cSand, 1 - smooth(1.6, 3.6, h));
    tmp.lerp(cRock, 1 - smooth(0.62, 0.86, ny));
    return tmp;
  }));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), makeWater(shared, { deep: 0x1c8cae, scale: 0.42, flow: [0.1, 0.06], alpha: 0.4 }));
  sea.rotation.x = -Math.PI / 2; root.add(sea);

  // ---- building blocks ----------------------------------------------------------------
  const frame = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
  const column = (x, y, z, h, r = 0.46) => {
    B.cyl(M.plaster, r * 0.85, r, h, x, y, z, { c: MARBLE, seg: 14 });
    B.cyl(M.plaster, r * 1.3, r * 0.86, 0.22, x, y + h, z, { c: MARBLE, seg: 14 });
    B.box(M.plaster, r * 2.7, 0.2, r * 2.7, x, y + h + 0.22, z, { c: MARBLE });
    world.addCyl(x, z, r + 0.04, y - 1, y + h);
  };
  const at = (P, lx, y, lz) => { const [x, z] = P(lx, lz); return [x, y, z]; };             // a point of a local frame as [x, y, z]
  const people = [];                                                                         // the islanders, who take no part in the fight
  const folk = (look, x, z, yaw, o = {}) => { const f = person(B, M, root, look, x, o.y ?? world.height(x, z), z, yaw, o); people.push(f); return f; };
  const pithos = (x, y, z, s = 3.4) => pots(B, M, x, y, z, { n: 1, s, c: [0xb8683c] });     // a store jar; 3.4 = as high as a man's chest: something to hide behind
  const heap = (x, y, z, r, o) => { pots(B, M, x, y, z, { ...o, solid: false }); world.addCyl(x, z, r, y - 0.5, y + 0.55 * o.s); };   // a cluster of jars with one collider for all of them
  const shieldOn = (x, y, z, ry, c = 0xb8893a) => { B.geo(M.metal, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 14), [x, y, z], [Math.PI / 2, ry, 0], 1, c); B.geo(M.metal, new THREE.SphereGeometry(0.12, 8, 5), [x, y, z], [0, 0, 0], [1, 1, 1], 0xd9b23a); };   // a votive shield on a wall
  /** A village house. o: { back: true = a second door in the back wall, flat: true = a flat roof with an outside stair, fit(P, f, ry) = what its trade adds } */
  const house = (x, z, ry, w = 7, d = 6, h = 3.1, o = {}) => {
    const P = frame(x, z, ry), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h, t: 0.3, ry, mat: M.plaster, c: 0xf2ede0, base: 2.6, doors: [{ side: 's', at: -w * 0.2, w: 1.6, h: 2.1 }].concat(o.back ? [{ side: 'n', at: 0.3, w: 1.6, h: 2.1 }] : []),
      wins: [{ side: 's', at: w * 0.24, w: 0.9, y: 1.15, h: 0.85 }].concat(o.back ? [] : [{ side: 'n', at: 0, w: 0.9, y: 1.15, h: 0.85 }]), floor: { mat: M.cobble, c: 0xe0d6c0 }, ceil: { mat: M.woodH, c: 0x8a6a48 } });
    steps(B, M, ...P(-w * 0.2, d / 2), ry, f, 6, { w: 1.9, c: 0xe6dfcc });
    if (o.back) { steps(B, M, ...P(0.3, -d / 2), ry + Math.PI, f, 6, { w: 1.9, c: 0xe6dfcc }); const [bx, bz] = P(1.15, -d / 2 - 0.55); B.box(M.woodH, 0.1, 2.1, 1.1, bx, yf, bz, { ry, c: 0x2c5a8a }); }
    if (o.flat) {                                                                            // a roof to stand on: a low wall round it, a landing and a stair along the east wall
      const top = yf + h + 0.2;
      for (const [lx, lz, pw, pd] of [[0, -d / 2 + 0.15, w, 0.3], [0, d / 2 - 0.15, w, 0.3], [-w / 2 + 0.15, 0, 0.3, d], [w / 2 - 0.15, 1.0, 0.3, d - 2.0]]) { const [px, pz] = P(lx, lz); B.box(M.plaster, pw, 0.9, pd, px, top, pz, { ry, c: 0xf2ede0, solid: true }); }
      { const [px, pz] = P(w / 2 + 0.65, -d / 2 + 0.75); B.box(M.plaster, 1.2, 5, 1.5, px, top - 5, pz, { ry, c: 0xe6dfcc, solid: true }); }
      steps(B, M, ...P(w / 2 + 0.65, -d / 2 + 1.5), ry, top, 11, { w: 1.2, rise: 0.4, c: 0xe6dfcc });
      { const [px, pz] = P(-1.2, 0.6); rug(B, M, px, top, pz, ry, { w: 2.2, d: 1.5, c: 0xc8b070, border: 0x8a6a3a }); for (let i = 0; i < 14; i++) { const [qx, qz] = P(-2.0 + (i % 5) * 0.4, 0.15 + Math.floor(i / 5) * 0.4); B.geo(M.flat, new THREE.SphereGeometry(0.07, 6, 4), [qx, top + 0.06, qz], [0, 0, 0], [1, 0.6, 1], i % 3 ? 0x5a3a5a : 0x7a5a2a); } }   // figs drying on a mat
      { const [px, pz] = P(-w / 2 + 1.0, -d / 2 + 1.0); heap(px, top, pz, 0.6, { n: 3, s: 1.3, spread: 0.55 }); }
    } else B.geo(M.kawara, prismGeo(w + 1.2, 1.35, d + 1.2, 1.6), [x, yf + h, z], [0, ry, 0], 1, TERRA);
    if (o.fit) o.fit(P, f, ry);
    const [dx, dz] = P(-w * 0.2 - 0.85, d / 2 + 0.55); B.box(M.woodH, 0.1, 2.1, 1.1, dx, yf, dz, { ry, c: 0x2c5a8a });      // blue door, open
    const [wx, wz] = P(w * 0.24, d / 2 + 0.03); B.box(M.woodH, 1.0, 0.1, 0.14, wx, yf + 1.06, wz, { ry, c: 0x2c5a8a });
    const [bx, bz] = P(w * 0.38, d / 2 + 0.7), by = world.height(bx, bz);
    B.cyl(M.flat, 0.24, 0.13, 0.62, bx, by, bz, { c: TERRA, seg: 9 }); B.cyl(M.flat, 0.1, 0.14, 0.2, bx, by + 0.62, bz, { c: TERRA, seg: 9 });
    const [tx, tz] = P(w * 0.2, -d * 0.14); B.box(M.woodH, 1.2, 0.7, 0.7, tx, f, tz, { ry, c: 0x7a5a3a, solid: true }); B.cyl(M.flat, 0.16, 0.08, 0.14, tx, f + 0.7, tz, { c: TERRA, seg: 9 });
    const [ex, ez] = P(-w / 2 + 0.85, -d / 2 + 1.3); B.box(M.woodH, 0.9, 0.45, 1.8, ex, f, ez, { ry, c: 0x6a4a2e, solid: true }); B.box(M.cloth, 0.86, 0.08, 1.5, ex, f + 0.45, ez, { ry, c: 0x2c5a8a });
    for (const k of [0, 1]) { const [qx, qz] = P(w / 2 - 0.6 - k * 0.55, -d / 2 + 0.6); B.cyl(M.flat, 0.24, 0.13, 0.62, qx, f, qz, { c: TERRA, seg: 9 }); B.cyl(M.flat, 0.1, 0.14, 0.2, qx, f + 0.62, qz, { c: TERRA, seg: 9 }); world.addCyl(qx, qz, 0.24, f, f + 0.8); }
  };
  const statue = (x, z, ry, s = 1.5) => {
    const y = world.height(x, z), c = 0xe2dccc;
    B.box(M.plaster, 1.5, 1.3, 1.5, x, y - 0.2, z, { c: MARBLE, solid: true }); B.box(M.plaster, 1.8, 0.2, 1.8, x, y + 1.1, z, { c: MARBLE });
    const f = makeHumanoid(M, { lip: c, skin: c, hair: c, shirt: c, sleeve: c, pants: c, boots: c, belt: c, hat: 'corinthian', hatC: c, plume: c, extras: ['cuirass', 'kilt'], armor: c, kilt: c, kilt2: c, aspis: c, aspisBoss: c, weapon: 'spear', scale: s });
    f.group.position.set(x, y + 1.3, z); f.group.rotation.y = ry; f.armR.rotation.x = -1.25; f.armR.rotation.z = 0.12; root.add(f.group);
  };

  const extraFoes = [], extraPicks = [], grove = [];
  // mosaic floor: border, meander, a sun and four dolphins, cut into small stones
  const mosaicTex = drawTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a3a5a'; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28); g.strokeStyle = '#a83a2a'; g.lineWidth = 6; g.strokeRect(40, 40, w - 80, h - 80);
    g.strokeStyle = '#2a3a5a'; g.lineWidth = 6;
    for (let i = 0; i < 12; i++) for (const y of [62, h - 92]) { const x = 62 + i * 33; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y); g.lineTo(x + 22, y); g.lineTo(x + 22, y + 20); g.lineTo(x + 10, y + 20); g.lineTo(x + 10, y + 10); g.stroke(); }
    for (let i = 0; i < 10; i++) for (const x of [62, w - 92]) { const y = 102 + i * 31; g.beginPath(); g.moveTo(x + 30, y); g.lineTo(x, y); g.lineTo(x, y + 22); g.lineTo(x + 20, y + 22); g.lineTo(x + 20, y + 10); g.lineTo(x + 10, y + 10); g.stroke(); }
    g.translate(w / 2, h / 2);
    g.fillStyle = '#1c5a7a'; g.beginPath(); g.arc(0, 0, 130, 0, 6.283); g.fill();
    g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(0, 0, 112, 0, 6.283); g.fill();
    for (let i = 0; i < 16; i++) { g.rotate(6.283 / 16); g.fillStyle = i % 2 ? '#c8862a' : '#a83a2a'; g.beginPath(); g.moveTo(0, -30); g.lineTo(13, -100); g.lineTo(-13, -100); g.closePath(); g.fill(); }
    g.fillStyle = '#d9b23a'; g.beginPath(); g.arc(0, 0, 32, 0, 6.283); g.fill();
    for (let i = 0; i < 4; i++) { g.rotate(1.5708); g.fillStyle = '#1c5a7a'; g.beginPath(); g.ellipse(0, -165, 34, 13, 0.3, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(-30, -160); g.lineTo(-50, -177); g.lineTo(-47, -150); g.closePath(); g.fill(); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.strokeStyle = 'rgba(60,50,40,0.3)'; g.lineWidth = 1;
    for (let i = 0; i <= w; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  });
  mosaicTex.userData.own = true;
  const mosaicMat = new THREE.MeshStandardMaterial({ map: mosaicTex, roughness: 0.55 });
  const mosaic = (x, y, z, w, d, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mosaicMat); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; root.add(m); };
  /** Athena: helmet with a crest, long robe, shield and spear, on a plinth. */
  const athena = (x, z, ry, s, c, plinth = 1.5) => {
    const y = world.height(x, z) - 0.2;
    B.box(M.plaster, 1.25 * s, plinth, 1.25 * s, x, y, z, { c: MARBLE, solid: true }); B.box(M.plaster, 1.4 * s, 0.18, 1.4 * s, x, y + plinth - 0.18, z, { c: MARBLE });
    const f = makeHumanoid(M, { lip: c, brow: c, skin: c, hair: c, shirt: c, sleeve: c, pants: c, boots: c, belt: c, hat: 'corinthian', hatC: c, plume: c, face: ['longhair'], extras: ['robe', 'cuirass'], robe: c, sash: c, armor: c, aspis: c, aspisBoss: c, weapon: 'spear', scale: s });
    f.group.position.set(x, y + plinth, z); f.group.rotation.y = ry; f.armR.rotation.x = -1.25; f.armR.rotation.z = 0.12; root.add(f.group);
  };

  // ---- the temple on the hill ----------------------------------------------------------
  {
    const x = 0, z = -57, y0 = HILL.top - 0.1, w = 13, l = 25, ch = 6.4;
    for (let i = 0; i < 3; i++) B.box(M.plaster, w + 3.6 - i * 0.9, 0.4, l + 3.6 - i * 0.9, x, y0 + i * 0.4, z, { c: MARBLE, solid: true });
    const y = y0 + 1.2;
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) column(x - w / 2 + i * (w / 5), y, z + s * l / 2, ch);
    for (let i = 1; i < 10; i++) for (const s of [-1, 1]) column(x + s * w / 2, y, z - l / 2 + i * (l / 10), ch);
    room(B, M, x, y, z - 1.2, { w: w - 4.6, d: l - 9, h: ch + 0.2, t: 0.5, mat: M.plaster, c: 0xf0eadc, base: 0.05, doors: [{ side: 's', at: 0, w: 2.4, h: 4.2 }],
      floor: { mat: M.cobble, c: 0xe8e0d0 }, ceil: { mat: M.plaster, c: 0xe2dccc } });                                              // cella, open to the faithful
    for (const s of [-1, 1]) B.box(M.metal, 0.12, 4.2, 1.2, x + s * 1.3, y, z - 1.2 + (l - 9) / 2 + 0.62, { c: 0x9a7030 });       // bronze doors, thrown open
    for (const s of [-1, 1]) { B.cyl(M.metal, 0.3, 0.16, 0.9, x + s * 2.6, y + 0.06, z - 6.2, { c: 0xb8893a, seg: 8 }); B.geo(M.glow, new THREE.ConeGeometry(0.2, 0.5, 6), [x + s * 2.6, y + 1.2, z - 6.2], [0, 0, 0], 1, 0xff7a20); world.addCyl(x + s * 2.6, z - 6.2, 0.3, y, y + 1); }
    table(B, M, x, y + 0.06, z - 4.6, 0, { w: 1.8, d: 0.8, c: 0x8a6a48, top: 0xe2dccc }); pots(B, M, x, y + 0.84, z - 4.6, { n: 3, s: 0.55, c: [0xd9b23a, 0xb8893a], spread: 0.36, solid: false });   // the offering table before the goddess
    for (const s of [-1, 1]) {                                                               // chests of gifts in the corners; shields hung up by thankful sailors
      chest(B, M, x + s * 3.0, y + 0.06, z - 8.2, 0, { c: 0x6a4a2e, band: 0xb8893a });
      for (const k of [0, 1, 2]) shieldOn(x + s * 3.66, y + 2.6, z - 4.4 + k * 2.6, Math.PI / 2, k % 2 ? 0x8a3a2a : 0xb8893a);
    }
    const ey = y + ch + 0.42;
    for (const s of [-1, 1]) { B.box(M.plaster, w + 1.4, 1.0, 1.3, x, ey, z + s * l / 2, { c: MARBLE }); B.box(M.plaster, 1.3, 1.0, l + 1.4, x + s * w / 2, ey, z, { c: MARBLE }); }
    for (let i = 0; i < 13; i++) for (const s of [-1, 1]) B.box(M.flat, 0.5, 0.42, 0.06, x - 6 + i, ey + 0.5, z + s * (l / 2 + 0.66), { c: i % 2 ? BLUE : 0xb83a2a });
    for (const s of [-1, 1]) {
      B.geo(M.plaster, prismGeo(w + 2.2, 2.7, 0.7, 3), [x, ey + 1.0, z + s * (l / 2 + 0.2)], [0, 0, 0], 1, MARBLE);
      B.geo(M.flat, prismGeo(w - 0.6, 1.9, 0.2, 3), [x, ey + 1.15, z + s * (l / 2 + 0.52)], [0, 0, 0], 1, BLUE);
      for (const k of [-1, 0, 1]) B.geo(M.metal, new THREE.ConeGeometry(0.28, 0.9, 6), [x + k * (w / 2 + 0.9), ey + (k ? 1.4 : 4.1), z + s * (l / 2 + 0.2)], [0, 0, 0], 1, 0xd9b23a);
    }
    B.geo(M.kawara, prismGeo(w + 2.6, 2.75, l + 2.2, 1.6), [x, ey + 1.0, z], [0, 0, 0], 1, TERRA);
    // altar and fire bowls in front
    B.box(M.plaster, 3.4, 1.1, 1.6, 0, HILL.top - 0.1, -36.5, { c: MARBLE, solid: true }); B.box(M.plaster, 3.8, 0.18, 2.0, 0, HILL.top + 1.0, -36.5, { c: MARBLE });
  }
  const fires = [brazier(B, M, -5.5, HILL.top, -34, 1.2), brazier(B, M, 5.5, HILL.top, -34, 1.2), brazier(B, M, -6, world.height(-6, -11), -11), brazier(B, M, 6, world.height(6, -11), -11)];
  statue(-11, -33, 0.4, 1.6); statue(11, -33, -0.4, 1.6); athena(0, -64.5, 0, 2.3, 0xd9b23a, 1.3); mosaic(0, HILL.top + 1.2, -56.6, 6.6, 6.6);   // the goddess of the house, in gold, inside the cella
  athena(15.5, -40, -0.5, 3.0, 0x6a8a6e, 2.2);                                              // Athena in bronze, watching the stair
  // stairway (the terrain underneath is a ramp)
  for (let i = 0; i < 40; i++) { const z = -9 - i * 0.6; B.box(M.plaster, 9.6, 0.5, 0.66, 0, world.height(0, z - 0.3) - 0.42, z - 0.3, { c: i % 2 ? 0xe6dfcc : 0xdcd4c0, solid: true }); }
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const z = -9 - i * 3.6; B.box(M.plaster, 0.9, 1.6, 3.7, s * 5.3, world.height(s * 5.3, z - 1.8) - 0.5, z - 1.8, { c: MARBLE, solid: true }); }

  // ---- village and agora ------------------------------------------------------------------
  { const y = world.height(0, 24); B.box(M.cobble, 16, 0.14, 15, 0, y - 0.06, 24, { c: 0xf0e8d4 }); mosaic(0, y + 0.1, 24, 9, 9); }
  // every house has its trade: what stands inside and beside it (P = the house's own frame, f = its floor, ry = its turn; the east wall is at +w/2)
  const eastShelf = (P, f, ry, w, lz, len, goods) => { const [sx, sz] = P(w / 2 - 0.55, lz); shelf(B, M, sx, f, sz, ry - Math.PI / 2, len, 1.9, { goods, c: 0x6a4a2e }); };
  const basket = (x, y, z, fill) => { B.cyl(M.thatch, 0.3, 0.23, 0.34, x, y, z, { c: 0xb89a5a, seg: 10 }); B.geo(M.flat, new THREE.SphereGeometry(0.27, 8, 5), [x, y + 0.32, z], [0, 0, 0], [1, 0.45, 1], fill); };
  const dome = (x, y, z, r, c) => B.geo(M.plaster, new THREE.SphereGeometry(r, 14, 7, 0, 6.283, 0, 1.571), [x, y, z], [0, 0, 0], [1, 1.1, 1], c);
  const hydria = () => new THREE.Mesh(merge([gCyl(0.16, 0.09, 0.3, TERRA, [0, 0.15, 0], [0, 0, 0], 1, 9), gCyl(0.07, 0.15, 0.12, TERRA, [0, 0.36, 0], [0, 0, 0], 1, 9), gCyl(0.1, 0.07, 0.04, TERRA, [0, 0.44, 0], [0, 0, 0], 1, 9)]), M.flat);
  /** An upright loom, its warp held taut by stones: wood in a house, stone in the cave of the nymphs. It stands across local X. */
  const loom = (x, y, z, ry, stone) => {
    const P = local(x, z, ry), mat = stone ? M.rock : M.wood, c = stone ? 0xb8b2a4 : 0x6a4a2e;
    for (const s of [-1, 1]) { const [px, pz] = P(s * 0.85, 0); B.box(mat, 0.1, 2.1, 0.1, px, y, pz, { ry, c }); }
    B.box(mat, 1.9, 0.1, 0.12, x, y + 2.0, z, { ry, c }); B.box(M.cloth, 1.45, 0.75, 0.03, x, y + 1.22, z, { ry, c: stone ? 0x5a3a8a : 0x7a2a5a }); B.box(M.cloth, 1.45, 0.08, 0.035, x, y + 1.22, z, { ry, c: 0xd9b23a });
    for (let i = 0; i < 12; i++) { const [px, pz] = P(-0.66 + i * 0.12, 0); B.box(M.flat, 0.012, 0.95, 0.012, px, y + 0.3, pz, { ry, c: 0xe6e0d0 }); if (i % 2 === 0) B.geo(M.rock, new THREE.SphereGeometry(0.05, 6, 4), [px, y + 0.27, pz], [0, 0, 0], [1, 1.4, 1], 0x9a9488); }
    world.addBox(x, z, 1.9, 0.3, ry, y, y + 2.1);
  };
  const dogGeo = (() => { const G = 0x8a8780, L = 0xb4b0a8, D = 0x6a6862, X = Math.PI / 2;        // an old dog lying down, head on its paws; it looks along +Z
    return merge([gCap(0.17, 0.5, G, [0, 0.16, 0], [X, 0, 0], [1.15, 1, 0.85]), gSph(0.12, G, [0.03, 0.12, 0.5], [1, 0.85, 1.15]), gBox(0.09, 0.07, 0.16, L, [0.03, 0.08, 0.64]), gBox(0.04, 0.03, 0.03, 0x1a1a1a, [0.03, 0.09, 0.73]),
      gBox(0.03, 0.1, 0.07, D, [0.14, 0.13, 0.46]), gBox(0.03, 0.1, 0.07, D, [-0.08, 0.13, 0.46]), gCap(0.04, 0.28, L, [0.13, 0.045, 0.45], [X, 0, 0]), gCap(0.04, 0.28, L, [-0.1, 0.045, 0.45], [X, 0, 0]),
      gCap(0.055, 0.2, G, [0.18, 0.07, -0.25], [X, 0, 0]), gCap(0.055, 0.2, G, [-0.18, 0.07, -0.25], [X, 0, 0]), gCap(0.03, 0.3, G, [0.14, 0.04, -0.55], [X, 0.7, 0])]); })();
  /** Put something long into a figure's right hand so that it stands upright: a staff, a crook. grip = how far up the shaft the hand holds it. */
  const inHand = (f, parts, arm = f.armR) => { const m = new THREE.Mesh(merge(parts), M.flat); m.castShadow = true; m.rotation.x = -arm.rotation.x; m.position.set(0, -0.6, 0.03); arm.add(m); };
  const staffParts = (f, len, crook) => { const g = 1.42 - 0.6 * Math.cos(f.armR.rotation.x), p = [gCyl(0.022, 0.028, len, 0x6a4a2e, [0, len / 2 - g, 0], [0, 0, 0], 1, 6)]; if (crook) p.push(xf(new THREE.TorusGeometry(0.11, 0.022, 5, 8, Math.PI), [0, len - g, 0.11], [0, Math.PI / 2, 0], 1, 0x6a4a2e)); return p; };
  const potter = (P, f, ry) => {                                                             // shelves of ware inside; the kiln, the wheel and the potter himself outside
    eastShelf(P, f, ry, 7, 1.0, 2.2, [0xb0683c, 0x9a5a34, 0xc07a48, 0x2a2420]);
    const [kx, kz] = P(5.4, -0.6), ky = world.height(kx, kz); dome(kx, ky - 0.05, kz, 1.1, 0xb87a52); B.cyl(M.plaster, 0.2, 0.3, 0.45, kx, ky + 1.1, kz, { c: 0x8a5a3a, seg: 8 }); world.addCyl(kx, kz, 1.1, ky - 1, ky + 1.3);
    { const [mx, mz] = P(5.4, 0.42); B.box(M.glow, 0.5, 0.36, 0.2, mx, ky + 0.05, mz, { ry, c: 0xff6a18 }); const [qx, qz] = P(4.0, 1.4); heap(qx, world.height(qx, qz), qz, 0.75, { n: 5, s: 1.1, c: [0xb0683c, 0x9a5a34, 0x2a2420] }); }
    const [wx, wz] = P(1.2, 4.6), wy = world.height(wx, wz), [sx, sz] = P(1.2, 5.45);
    B.cyl(M.stone, 0.45, 0.45, 0.1, wx, wy, wz, { c: 0x9a9488, seg: 14 }); B.cyl(M.wood, 0.05, 0.05, 0.62, wx, wy + 0.1, wz, { c: 0x5a4028, seg: 6 }); B.cyl(M.stone, 0.36, 0.36, 0.06, wx, wy + 0.7, wz, { c: 0xb8ae98, seg: 14 });
    B.cyl(M.flat, 0.15, 0.09, 0.26, wx, wy + 0.76, wz, { c: 0xa8683c, seg: 10 }); world.addCyl(wx, wz, 0.45, wy - 1, wy + 0.76);
    bench(B, M, sx, world.height(sx, sz), sz, ry, { w: 0.42, h: 0.42 }); folk('greekMan', sx, sz, ry + Math.PI, { pose: 'sit', seat: 0.42, arms: [-1.05, -1.0], over: { shirt: 0xd8c8a0, hat: null } });
  };
  const smith = (P, f, ry) => {                                                              // the bronze-smith: forge, anvil, ingots, a shield and spears ready for their owners
    { const [x, z] = P(3.0, 2.0); B.box(M.stone, 1.2, 0.8, 0.9, x, f, z, { ry, c: 0x8a8478, solid: true }); B.box(M.glow, 0.8, 0.05, 0.5, x, f + 0.8, z, { ry, c: 0xff5a14 }); }
    { const [x, z] = P(1.7, 1.5); B.cyl(M.wood, 0.26, 0.3, 0.5, x, f, z, { c: 0x5a4028, seg: 8, solid: true }); B.box(M.metal, 0.5, 0.16, 0.2, x, f + 0.5, z, { ry, c: 0x3a3a3e }); }
    for (let k = 0; k < 4; k++) { const [x, z] = P(3.25, 0.5); B.box(M.metal, 0.5, 0.07, 0.3, x, f + k * 0.07, z, { ry: ry + k * 0.25, c: 0xb8793a }); }
    { const [x, z] = P(3.66, -0.9); shieldOn(x, f + 1.7, z, ry - Math.PI / 2); }
    for (const k of [0, 1]) rod(B, M.wood, at(P, 3.3, f, -1.5 - k * 0.25), at(P, 3.62, f + 2.3, -1.6 - k * 0.25), 0.02, 0x7a5a3a);
  };
  const baker = (P, f, ry) => {                                                              // flour and a quern inside; the bread oven outside, and the woman who bakes
    { const [x, z] = P(1.6, 1.9); sacks(B, M, x, f, z, ry, { w: 1.6, c: 0xd8ccb0 }); }
    { const [x, z] = P(2.25, 0.2); B.cyl(M.stone, 0.32, 0.34, 0.18, x, f, z, { c: 0x9a9488, seg: 12 }); B.cyl(M.stone, 0.26, 0.28, 0.14, x, f + 0.18, z, { c: 0x8a8478, seg: 12 }); B.cyl(M.wood, 0.02, 0.02, 0.2, x + 0.18, f + 0.32, z, { c: 0x5a4028, seg: 5 }); }
    const [ox, oz] = P(5.0, -0.4), oy = world.height(ox, oz); B.cyl(M.stone, 1.05, 1.1, 0.6, ox, oy - 0.1, oz, { c: 0xd8cfb8, seg: 12 }); dome(ox, oy + 0.5, oz, 0.95, 0xe6dcc6); world.addCyl(ox, oz, 1.1, oy - 1, oy + 1.5);
    { const [mx, mz] = P(5.0, 0.5); B.box(M.glow, 0.5, 0.3, 0.16, mx, oy + 0.55, mz, { ry, c: 0xff7a20 }); }
    const [tx, tz] = P(6.9, 0.9), ty = world.height(tx, tz), top = table(B, M, tx, ty, tz, ry, { w: 1.4, d: 0.7 });
    for (let i = 0; i < 5; i++) { const [lx, lz] = P(6.4 + (i % 3) * 0.45, 0.75 + Math.floor(i / 3) * 0.32); B.geo(M.flat, new THREE.SphereGeometry(0.15, 8, 5), [lx, top + 0.05, lz], [0, 0, 0], [1, 0.5, 1], i % 2 ? 0xc89a5a : 0xb8864a); }
    { const [wx, wz] = P(5.0, 1.45); folk('greekWoman', wx, wz, ry + Math.PI, { pose: 'work', over: { dress: 0xe8d8a0, shirt: 0xe8d8a0, extras: ['dress', 'brooches', 'apron'], apron: 0xf0ece0 } }); }
  };
  const store = (P, f, ry) => {                                                              // the oil store: jars as high as your chest, sacks
    for (const lz of [-0.4, 0.9, 2.2]) { const [x, z] = P(3.05, lz); pithos(x, f, z); }
    { const [x, z] = P(1.0, 2.2); sacks(B, M, x, f, z, ry); }
  };
  const wool = (P, f, ry) => {                                                               // cheeses on the shelf, baskets of wool
    eastShelf(P, f, ry, 6, 0.8, 2.0, [0xe8d8a0, 0xd8c060, 0xf0ece0]);
    for (const [lx, lz] of [[1.55, 2.2], [0.8, 2.3]]) { const [x, z] = P(lx, lz); basket(x, f, z, 0xf0ece0); }
  };
  const wine = (P, f) => { const [x, z] = P(1.9, 1.2); heap(x, f, z, 1.0, { n: 5, s: 1.6, c: [0xb0683c, 0x9a5a34] }); };
  house(-17, 39, 0.3, 7, 6, 3.1, { fit: potter }); house(-23, 23, 1.4, 8, 6, 3.1, { back: true, fit: smith }); house(-15, 9, -0.2, 6, 6, 3.1, { fit: baker }); house(17, 38, -0.4, 8, 6.5, 3.1, { back: true, fit: store });
  house(-34, 36, 0.9, 6, 5.5, 3.1, { fit: wool }); house(34, 44, 0.2, 6, 5.5, 3.1, { flat: true, fit: wine });
  statue(0, 24, 0, 1.7);
  { // stoa on the east side of the agora, open toward the square
    const x = 24, z = 12, l = 24, y = world.height(x, z) - 0.2;
    B.box(M.plaster, 7.4, 0.5, l + 1.4, x, y, z, { c: MARBLE, solid: true });
    B.box(M.plaster, 0.6, 4.4, l, x + 3.2, y + 0.5, z, { c: 0xf0eadc, solid: true });
    for (let i = 0; i < 9; i++) column(x - 3.1, y + 0.5, z - l / 2 + 0.6 + i * (l - 1.2) / 8, 3.7, 0.34);
    B.box(M.plaster, 7.6, 0.5, l + 1.2, x, y + 4.6, z, { c: MARBLE });
    B.box(M.kawara, 8.2, 0.16, l + 1.8, x, y + 5.3, z, { rz: 0.1, c: TERRA });
    // the market under the colonnade: two stalls, a fishmonger's high bench (crouch under it), store jars at both ends
    const f = y + 0.5;
    stall(B, M, x + 1.7, f, z - 7, -Math.PI / 2, { c: 0xb8946a, cloth: 0x2a5a9a, goods: [0xb0683c, 0xd8b23a, 0x5a8a3a, 0x8a5a8a] }); stall(B, M, x + 1.7, f, z + 6.5, -Math.PI / 2, { c: 0xb8946a, cloth: 0xb83a2a, goods: [0xd8b23a, 0x5a8a3a, 0xc86a2a, 0x8a1c1c] });
    folk('greekWoman', x + 2.05, z + 6.8, -Math.PI / 2, { y: f, pose: 'talk', over: { dress: 0x9ab0c8, shirt: 0x9ab0c8 } });
    B.box(M.woodH, 1.4, 0.1, 3.4, x + 1.9, f + 1.25, z - 0.4, { c: 0x7a5a3a, solid: true });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(M.wood, 0.1, 1.25, 0.1, x + 1.9 + a * 0.6, f, z - 0.4 + b * 1.6, { c: 0x5a4028 });
    for (let i = 0; i < 7; i++) B.geo(M.metal, new THREE.SphereGeometry(0.2, 8, 5), [x + 1.7 + (i % 2) * 0.42, f + 1.4, z - 1.7 + i * 0.42], [0, 0.4 + i, 0], [0.4, 0.3, 1.2], i % 3 ? 0xb8c4cc : 0x8a9aa8);   // the catch
    { const sy = f + 1.35, sz = z + 1.0; B.cyl(M.metal, 0.02, 0.02, 0.5, x + 1.9, sy, sz, { c: 0xb8893a, seg: 5 }); B.box(M.metal, 0.03, 0.03, 0.7, x + 1.9, sy + 0.5, sz, { c: 0xb8893a }); for (const s of [-1, 1]) B.cyl(M.metal, 0.13, 0.08, 0.04, x + 1.9, sy + 0.2, sz + s * 0.32, { c: 0xb8893a, seg: 10 }); }   // the scales
    for (const [ax, az] of [[2.0, -10.6], [0.9, -11.0], [2.1, 10.8], [1.0, 11.2]]) pithos(x + ax, f, z + az);
    for (const az of [-3.4, 3.2]) heap(x + 2.2, f, z + az, 0.7, { n: 3, s: 1.3, c: [TERRA, 0xb0683c], spread: 0.6 });
    // the roof can be walked on (four strips that follow its slope); a ladder stands at the north end
    for (let i = 0; i < 4; i++) { const lx = -3.075 + i * 2.05; world.addBox(x + lx, z, 2.05, l + 1.8, 0, y + 4.6, y + 5.46 + lx * 0.1); }
    ladder(B, M, x - 1.025, z - l / 2 - 0.9, 0, -1, world.height(x - 1.025, z - l / 2 - 1.2), y + 5.36);
  }
  { // well, and the women who fetch water there
    const y = world.height(-6, 30); B.cyl(M.stone, 0.9, 1.0, 0.8, -6, y - 0.1, 30, { c: 0xe0d8c4, solid: true, seg: 12 }); B.cyl(M.flat, 0.7, 0.7, 0.02, -6, y + 0.68, 30, { c: 0x14323c, seg: 12 });
    folk('greekWoman', -7.07, 30.98, Math.atan2(1.07, -0.98), { pose: 'work' }); pots(B, M, -7.9, world.height(-7.9, 30.2), 30.2, { n: 1, s: 1.3, c: [TERRA] });
    const w = folk('greekWoman', -3.6, 28.0, 1.0, { pose: (g) => { g.armR.rotation.x = -2.9; g.armR.rotation.z = 0.36; } }), j = hydria(); j.position.y = 0.84; w.hips.add(j);   // she carries her jar home on her head
    folk('greekWoman', -2.5, 28.9, -2.2, { pose: 'talk' }); pots(B, M, -2.0, world.height(-2.0, 28.3), 28.3, { n: 1, s: 1.3, c: [TERRA] });
  }
  // round temple on the eastern headland
  {
    const x = 74, z = -8, y = world.height(x, z) - 0.3;
    const f = y + 0.9, A = 5.5 * 0.628, ca = Math.cos(A), sa = Math.sin(A);                 // the door looks west, between two columns
    B.cyl(M.plaster, 5.4, 5.6, 0.9, x, y, z, { c: MARBLE, seg: 24 });
    for (let i = 0; i < 5; i++) { const a = (i + 0.5) * Math.PI / 10; world.addBox(x, z, 2 * Math.cos(a) * 5.5, 2 * Math.sin(a) * 5.5, 0, y - 1, f); }   // the round floor, as five slabs
    steps(B, M, x + ca * 5.2, z + sa * 5.2, Math.atan2(ca, sa), f, 5, { w: 2.6, rise: 0.3, c: 0xe6dfcc });
    for (let i = 0; i < 10; i++) column(x + Math.cos(i * 0.628) * 4.3, f, z + Math.sin(i * 0.628) * 4.3, 4.2, 0.36);
    for (let k = 0; k < 10; k++) {                                                           // the round cella: a ring of wall with one door
      const a = (k + 0.5) * 0.628, wx = x + Math.cos(a) * 2.85, wz = z + Math.sin(a) * 2.85;
      if (k === 5) B.box(M.plaster, 1.86, 2.25, 0.36, wx, f + 2.4, wz, { ry: Math.PI / 2 - a, c: 0xf0eadc }); else B.box(M.plaster, 1.86, 4.65, 0.36, wx, f, wz, { ry: Math.PI / 2 - a, c: 0xf0eadc, solid: true });
    }
    B.cyl(M.plaster, 0.55, 0.62, 0.9, x, f, z, { c: MARBLE, seg: 12, solid: true }); B.cyl(M.metal, 0.4, 0.22, 0.2, x, f + 0.9, z, { c: 0xb8893a, seg: 10 }); B.geo(M.glow, new THREE.ConeGeometry(0.2, 0.5, 6), [x, f + 1.35, z], [0, 0, 0], 1, 0xff7a20);   // the hearth of the island, never let go out
    folk('greekWoman', x + 1.35, z + 0.75, Math.atan2(-1.35, -0.75), { y: f, pose: 'pray', over: { dress: 0xf0ece0, shirt: 0xf0ece0, hem: 0xc9a050, accent: 0xc9a050, extras: ['dress', 'brooches'] } });   // the priestess who tends it
    pots(B, M, x - 0.2, f, z + 1.85, { n: 3, s: 0.9, c: [0xd9b23a, TERRA], spread: 0.4 }); chest(B, M, x + 1.6, f, z - 1.1, 2.17, { c: 0x6a4a2e, band: 0xb8893a });
    fires.push([x, f + 1.3, z]); extraPicks.push([x - 0.9, z - 1.7, 0, 1.6]);
    B.cyl(M.plaster, 5.0, 5.0, 0.7, x, y + 5.55, z, { c: MARBLE, seg: 24 });
    B.geo(M.kawara, new THREE.ConeGeometry(5.5, 2.4, 24), [x, y + 7.45, z], [0, 0, 0], 1, TERRA);
    B.geo(M.metal, new THREE.SphereGeometry(0.3, 8, 6), [x, y + 8.8, z], [0, 0, 0], 1, 0xd9b23a);
  }

  // ---- a villa with a colonnaded court, a theatre, an olive grove --------------------------
  {
    const x = 50, z = 24, w = 14, d = 13, P = frame(x, z, 0), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h: 3.4, t: 0.35, mat: M.plaster, c: 0xf2ede0, base: 2.6, doors: [{ side: 'w', at: 0, w: 2.4, h: 2.6 }], wins: [{ side: 's', at: -3, w: 1.0, y: 1.2, h: 0.9 }, { side: 'n', at: -3, w: 1.0, y: 1.2, h: 0.9 }],
      floor: { mat: M.cobble, c: 0xe0d6c0 }, ceil: false });
    steps(B, M, x - w / 2, z, -Math.PI / 2, f, 6, { w: 2.8, c: 0xe6dfcc });
    for (const [lx, lz] of [[-3, -2.7], [0.4, -2.7], [-3, 2.7], [0.4, 2.7]]) column(x + lx, f, z + lz, 3.0, 0.3);
    B.box(M.plaster, 3.0, 0.4, 2.4, x - 1.3, f, z, { c: MARBLE, solid: true }); B.box(M.glow, 2.5, 0.02, 1.9, x - 1.3, f + 0.36, z, { c: 0x1a5a6a });      // the pool that catches the rain
    mosaic(x - 1.3, f + 0.03, z, 6.4, 6.4);
    for (const s of [-1, 1]) {                                                                  // roofs over the walks; the court is open to the sky
      B.box(M.kawara, w, 0.16, 3.4, x, yf + 3.4, z + s * 4.8, { rx: s * 0.1, c: TERRA }); B.box(M.kawara, 3.2, 0.16, 6.4, x - 5.4, yf + 3.4, z, { c: TERRA });
      room(B, M, x + 4.9, yf, z + s * 4.0, { w: 3.4, d: 4.0, h: 3.0, t: 0.25, mat: M.plaster, c: 0xe8e0d0, base: 0.05, doors: [{ side: 'w', at: 0, w: 1.6, h: 2.2 }], floor: { mat: M.cobble, c: 0xd8cebc }, ceil: { mat: M.woodH, c: 0x8a6a48 } });
    }
    B.box(M.kawara, 3.8, 0.16, 12.4, x + 4.9, yf + 3.4, z, { c: TERRA });
    B.box(M.woodH, 0.8, 0.45, 1.9, x + 5.8, f, z - 4.2, { c: 0x6a4a2e, solid: true }); B.box(M.cloth, 0.76, 0.1, 1.6, x + 5.8, f + 0.45, z - 4.2, { c: 0x8a1c5a });
    B.box(M.stone, 1.0, 0.7, 1.0, x + 5.6, f, z + 4.9, { c: 0xb8ae98, solid: true }); B.geo(M.glow, new THREE.ConeGeometry(0.16, 0.4, 6), [x + 5.6, f + 0.9, z + 4.9], [0, 0, 0], 1, 0xff7a20);
    for (const [ax, az] of [[x - 6, z + 5.4], [x - 5.4, z + 5.6], [x - 6, z - 5.5]]) { B.cyl(M.flat, 0.26, 0.14, 0.7, ax, f, az, { c: TERRA, seg: 9 }); B.cyl(M.flat, 0.1, 0.16, 0.22, ax, f + 0.7, az, { c: TERRA, seg: 9 }); world.addCyl(ax, az, 0.26, f, f + 0.9); }
    // dining couches under the north walk and a woman of the house resting there; the upright loom under the south walk.
    // The weaver is Penelope, in a fine purple dress with a gold band in her hair: she weaves by day and waits.
    for (const cx of [-3.6, 0]) bed(B, M, x + cx, f, z - 5.55, Math.PI / 2, { w: 0.85, l: 1.9, h: 0.5, c: 0x6a4a2e, blanket: 0x8a1c5a, pillow: 0xd9b23a, head: 0.25 });
    table(B, M, x - 1.8, f, z - 5.3, 0, { w: 0.9, d: 0.6, h: 0.42 }); pots(B, M, x - 1.8, f + 0.42, z - 5.3, { n: 3, s: 0.5, c: [0xd9b23a, TERRA], spread: 0.22, solid: false });
    folk('greekWoman', x + 0.1, z - 5.3, 0, { y: f, pose: 'sit', seat: 0.5, over: { dress: 0xc86a4a, shirt: 0xc86a4a } });
    loom(x - 1.6, f, z + 5.9, 0); basket(x - 3.2, f, z + 5.6, 0x7a3a8a); basket(x - 0.25, f, z + 5.7, 0xf0ece0);
    folk('greekWoman', x - 1.6, z + 5.05, 0, { y: f, arms: [-1.45, -1.2], over: { dress: 0x6a3a8a, shirt: 0x6a3a8a, hem: 0xd9b23a, accent: 0xd9b23a, belt: 0xd9b23a, extras: ['dress', 'brooches'] } });
    pithos(x + 0.9, f, z + 5.5); pithos(x + 2.0, f, z + 5.5);
    // Argos, Odysseus' old grey dog, lies by the door and still listens for his master
    animal(B, M, root, 'dog', dogGeo, x - 7.7, world.height(x - 7.7, z + 2.4), z + 2.4, -2.4, { lying: true, coat: 0x8a8780, box: [0.5, 1.2, 0.35, 0.05] });
    extraFoes.push(['hoplite', x - 4.6, z + 1.2, { up: 1.8, patrol: false, yaw: -1.57 }], ['peltast', x + 4.8, z + 3.6, { up: 1.8, patrol: false, yaw: -1.57 }]); extraPicks.push([x + 4.6, z - 3.4, 0, 1.8]);
  }
  { // theatre: five rows of marble seats round a mosaic floor, and a stage house with three doors
    const cx = 42, cz = -24, yb = world.height(cx, cz);
    for (let k = 0; k < 5; k++) { const r = 5.2 + k * 1.1, n = 8 + k, L = r * 2.8 / n + 0.06; for (let i = 0; i < n; i++) { const a = -1.4 + (i + 0.5) * 2.8 / n; B.box(M.plaster, 1.1, (k + 1) * 0.4 + 3, L, cx + Math.cos(a) * r, yb - 3, cz + Math.sin(a) * r, { ry: -a, c: (i + k) % 2 ? MARBLE : 0xe2dccc, solid: true }); } }
    B.cyl(M.cobble, 4.6, 4.6, 0.1, cx, yb - 0.04, cz, { c: 0xe8e0d0, seg: 24 }); mosaic(cx, yb + 0.08, cz, 5.4, 5.4);
    room(B, M, cx - 7.4, yb, cz, { w: 2.6, d: 10, h: 3.2, t: 0.3, mat: M.plaster, c: 0xf0eadc, base: 2.6, doors: [{ side: 'e', at: -3, w: 1.6, h: 2.3 }, { side: 'e', at: 0, w: 1.6, h: 2.3 }, { side: 'e', at: 3, w: 1.6, h: 2.3 }, { side: 'w', at: 0, w: 1.6, h: 2.3 }],
      floor: { mat: M.cobble, c: 0xd8cebc }, ceil: { mat: M.plaster, c: MARBLE } });
    B.box(M.plaster, 3.2, 0.3, 10.6, cx - 7.4, yb + 3.4, cz, { c: MARBLE });
    for (const dz of [-4.4, -1.5, 1.5, 4.4]) column(cx - 5.7, yb, cz + dz, 2.9, 0.26);
    world.addBox(cx - 7.4, cz, 3.2, 10.6, 0, yb + 3.4, yb + 3.7); ladder(B, M, cx - 9.0, cz + 3.3, -1, 0, world.height(cx - 9.4, cz + 3.3), yb + 3.7);   // the roof of the stage house, where the gods appear: up a ladder at the back
    { // an old singer of tales sits on the seats with his lyre, and sings to nobody
      const a = 0.95, bx = cx + Math.cos(a) * 6.0, bz = cz + Math.sin(a) * 6.0, b = folk('greekMan', bx, bz, Math.atan2(-Math.cos(a), -Math.sin(a)), { y: yb + 0.4, pose: 'sit', seat: 0.4, arms: [-0.85, -1.15], over: { hair: 0xb8b4a8, shirt: 0xe6e0d0, hat: null, face: ['beard'] } });
      b.armR.rotation.z = 0.45;
      inHand(b, [gBox(0.24, 0.16, 0.07, 0x8a6a3a, [0, 0.08, 0]), gCyl(0.014, 0.018, 0.4, 0xc9a050, [-0.11, 0.34, 0], [0, 0, 0.12], 1, 5), gCyl(0.014, 0.018, 0.4, 0xc9a050, [0.11, 0.34, 0], [0, 0, -0.12], 1, 5), gBox(0.3, 0.025, 0.025, 0x8a6a3a, [0, 0.5, 0]),
        ...[-0.06, -0.02, 0.02, 0.06].map((sx) => gBox(0.006, 0.36, 0.006, 0xf0ece0, [sx, 0.32, 0.03]))], b.armL);
    }
    extraFoes.push(['hoplite', cx + 1.4, cz + 0.6, {}], ['peltast', cx - 7.4, cz - 3.2, { up: 1.6, patrol: false }]); extraPicks.push([cx - 7.4, cz + 3.4, 0, 1.6]);
  }
  { // olive grove with its press
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const x = -46 + i * 4.3 + (R() - 0.5) * 1.4, z = -25 + j * 4.3 + (R() - 0.5) * 1.4, h = world.height(x, z); if (h < 2.6 || (i === 2 && j === 4)) continue;
      const s = 0.85 + R() * 0.5; grove.push({ x, y: h - 0.15, z, ry: R() * 6.28, s }); world.addCyl(x, z, 0.35 * s, h - 2, h + 5);
    }
    const px = -37.4, pz = -7.2, py = world.height(px, pz);
    B.cyl(M.stone, 1.3, 1.4, 0.6, px, py - 0.1, pz, { c: 0xd8cfb8, seg: 14, solid: true }); B.cyl(M.stone, 0.7, 0.7, 0.4, px + 0.3, py + 0.75, pz, { rx: Math.PI / 2, c: 0xb8ae98, seg: 14 });
    B.cyl(M.wood, 0.07, 0.07, 3.2, px, py + 0.95, pz, { rz: Math.PI / 2, c: 0x6a4a30, seg: 6 }); B.cyl(M.wood, 0.1, 0.1, 1.5, px, py + 0.5, pz, { c: 0x6a4a30, seg: 6 });
    for (const [ax, az] of [[px + 2, pz + 0.6], [px + 2.5, pz - 0.2], [px - 1.9, pz + 1.2]]) { const ay = world.height(ax, az); B.cyl(M.flat, 0.26, 0.14, 0.7, ax, ay, az, { c: TERRA, seg: 9 }); B.cyl(M.flat, 0.1, 0.16, 0.22, ax, ay + 0.7, az, { c: TERRA, seg: 9 }); world.addCyl(ax, az, 0.26, ay - 1, ay + 0.9); }
    extraFoes.push(['peltast', -36, -13, {}]);
  }

  // ---- the fishermen's cape: two houses and a beacon tower -------------------------------
  {
    const net = (P, f, ry, w) => { const [x, z] = P(w / 2 - 0.34, 0.9); B.box(M.cloth, 0.03, 1.3, 2.3, x, f + 0.9, z, { ry, c: 0x8a9a8a }); for (const k of [0, 1]) rod(B, M.wood, at(P, w / 2 - 0.9, f, -1.5 - k * 0.2), at(P, w / 2 - 0.4, f + 2.5, -1.6 - k * 0.2), 0.025, 0x8a6a44); };   // a net on the wall, oars in the corner
    const fisher = (P, f, ry) => { net(P, f, ry, 7); for (const [lx, lz] of [[2.6, 2.1], [1.8, 2.25]]) { const [x, z] = P(lx, lz); basket(x, f, z, 0xb8c4cc); } };
    const salter = (P, f, ry) => {                                                           // salt jars inside, the catch drying on a rack outside
      net(P, f, ry, 6); { const [x, z] = P(1.9, 1.7); heap(x, f, z, 0.75, { n: 4, s: 1.2, c: [0xd8cfb8, 0xb0683c], spread: 0.55 }); }
      const [rx, rz] = P(4.6, 0), y = world.height(rx, rz);
      for (const k of [-1, 1]) { const [px, pz] = P(4.6, k * 1.3); B.box(M.wood, 0.08, 1.9, 0.08, px, y - 0.2, pz, { c: 0x6a4a30 }); }
      rod(B, M.wood, at(P, 4.6, y + 1.6, -1.4), at(P, 4.6, y + 1.6, 1.4), 0.03, 0x6a4a30); world.addBox(rx, rz, 0.2, 2.8, ry, y - 1, y + 1.7);
      for (let i = 0; i < 8; i++) { const [px, pz] = P(4.6, -1.05 + i * 0.3); B.geo(M.metal, new THREE.SphereGeometry(0.2, 8, 5), [px, y + 1.38, pz], [1.571, ry, 0], [0.3, 0.4, 1.0], i % 3 ? 0xb8c4cc : 0x9aa8b0); }
    };
    house(88, 51, -1.2, 7, 6, 3.1, { back: true, fit: fisher }); house(97, 61, 2.4, 6, 5.5, 3.1, { fit: salter });
    { // an old fisherman sits by the drying nets and mends one
      const y = world.height(87.4, 60.2); bench(B, M, 87.4, y, 60.2, 0, { w: 0.42, h: 0.42 }); folk('greekMan', 87.4, 60.2, -2.2, { pose: 'sit', seat: 0.42, arms: [-0.9, -0.8], over: { hair: 0xb8b4a8, hat: 'pilos', hatC: 0xd8c8a0, face: ['beard'], shirt: 0x9ab0c8 } });
      B.geo(M.cloth, new THREE.SphereGeometry(0.5, 8, 5), [86.85, y + 0.1, 59.45], [0, 0, 0], [1, 0.3, 0.8], 0x8a9a8a); basket(88.3, world.height(88.3, 59.3), 59.3, 0xb8c4cc);
    }
    const x = 101, z = 50, w = 5.4, d = 5.4, P = frame(x, z, 0), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05;
    room(B, M, x, yf, z, { w, d, h: 3.2, t: 0.5, mat: M.plaster, c: MARBLE, base: 3, doors: [{ side: 'w', at: 0, w: 1.7, h: 2.2 }], wins: [{ side: 's', at: 0, w: 0.6, y: 1.2, h: 1.0 }, { side: 'e', at: 0, w: 0.6, y: 1.2, h: 1.0 }],
      floor: { mat: M.cobble, c: 0xe0d6c0 }, ceil: { mat: M.woodH, c: 0x8a6a48 } });
    steps(B, M, x - w / 2, z, -Math.PI / 2, yf + 0.06, 6, { w: 2.0, c: 0xe6dfcc });
    B.cyl(M.plaster, 1.9, 2.6, 6.4, x, yf + 3.4, z, { c: MARBLE, seg: 12 }); world.addCyl(x, z, 2.4, yf + 3.3, yf + 10.2);
    B.cyl(M.plaster, 2.4, 2.0, 0.4, x, yf + 9.8, z, { c: MARBLE, seg: 12 }); B.cyl(M.metal, 0.9, 0.5, 0.5, x, yf + 10.2, z, { c: 0xb8893a, seg: 10 }); world.addCyl(x, z, 0.8, yf + 10, yf + 10.8);
    // the fire platform can be reached: a long ladder up the north side, a low wall round the top to crouch behind
    const top = yf + 10.2;
    for (let i = 0; i < 4; i++) { const a = (i + 0.5) * Math.PI / 8; world.addBox(x, z, 2 * Math.cos(a) * 2.4, 2 * Math.sin(a) * 2.4, 0, yf + 9.8, top); }
    for (let k = 0; k < 8; k++) { if (k === 6) continue; const a = k * Math.PI / 4; B.box(M.plaster, 1.86, 0.55, 0.25, x + Math.cos(a) * 2.25, top, z + Math.sin(a) * 2.25, { ry: Math.PI / 2 - a, c: MARBLE, solid: true }); }
    ladder(B, M, x, z - 2.4, 0, -1, world.height(x, z - 3.3), top, { lean: 0.075 }); extraPicks.push([x + 1.25, z + 1.2, 0, 10.6]);
    B.geo(M.glow, new THREE.ConeGeometry(0.7, 1.6, 7), [x, yf + 11.4, z], [0, 0, 0], 1, 0xff7a20);
    for (const [ax, az] of [[x + 1.6, z - 1.6], [x + 1.5, z + 1.5], [x - 0.2, z + 1.8]]) { B.cyl(M.flat, 0.26, 0.14, 0.7, ax, yf + 0.06, az, { c: TERRA, seg: 9 }); B.cyl(M.flat, 0.1, 0.16, 0.22, ax, yf + 0.76, az, { c: TERRA, seg: 9 }); world.addCyl(ax, az, 0.26, yf, yf + 0.9); }
    for (const [nx, nz, ry] of [[92, 62, 0.4], [85, 58, 1.3]]) {                                           // nets drying on poles
      const y = world.height(nx, nz), c = Math.cos(ry), s = Math.sin(ry);
      for (const k of [-1, 1]) B.box(M.wood, 0.1, 2.3, 0.1, nx + k * 1.6 * c, y - 0.2, nz - k * 1.6 * s, { c: 0x6a4a30 });
      B.box(M.cloth, 3.2, 1.3, 0.03, nx, y + 0.75, nz, { ry, c: 0x8a9a8a }); B.box(M.wood, 3.4, 0.07, 0.07, nx, y + 2.05, nz, { ry, c: 0x6a4a30 }); world.addBox(nx, nz, 3.3, 0.25, ry, y - 1, y + 2.1);
    }
    for (const [bx, bz, ry, up] of [[104, 62, 0.7, 1.5], [99, 68, 1.9, 0]]) {                            // two boats keel up: one on the sand, one on trestles for mending (crawl under it)
      const y = Math.max(0.2, world.height(bx, bz)) + up, P = local(bx, bz, ry);
      B.geo(M.flat, new THREE.SphereGeometry(1, 10, 6), [bx, y + 0.25, bz], [0, ry, 0], [0.75, 0.55, 2.4], 0x3a5a7a); B.box(M.woodH, 1.0, 0.08, 3.6, bx, y + 0.5, bz, { ry, c: 0x8a6a48 }); world.addBox(bx, bz, 1.5, 4.6, ry, up ? y - 0.25 : y - 1, y + 0.9);
      if (up) for (const k of [-1, 1]) { const [tx, tz] = P(0, k * 1.5); B.box(M.wood, 1.9, 0.1, 0.12, tx, y - 0.14, tz, { ry, c: 0x6a4a30 }); for (const s of [-1, 1]) rod(B, M.wood, at(P, s * 1.1, y - up - 0.2, k * 1.5), at(P, s * 0.7, y - 0.1, k * 1.5), 0.045, 0x6a4a30); }
    }
  }

  // ---- ships ---------------------------------------------------------------------------------
  ship(B, M, -3, 0.25, 109.5, 0.25, { len: 13, hull: 0x3a2a1c, sail: 0xe8dcc0 });                    // your own ship, drawn up on the home beach
  const shore = (z) => { let x = -40; while (x > -110 && world.height(x, z) > 0.35) x -= 0.5; return x; };
  ship(B, M, shore(8) - 2, 0.3, 8, -1.3, { len: 17, sail: 0xa01414, lambda: true, shields: [0xb8893a, 0x8a1414] });
  ship(B, M, shore(24) - 2, 0.3, 24, -1.75, { len: 17, sail: 0xa01414, lambda: true, shields: [0xb8893a, 0x8a1414] });
  ship(B, M, -150, 0.25, 60, 0.9, { len: 18, sail: 0xa01414, lambda: true, shields: [0xb8893a, 0x8a1414] });
  { // landing stage and supplies in the harbour
    const x = shore(16), y = 0.5;
    B.box(M.woodH, 9, 0.2, 2.4, x - 2.5, y, 16, { c: 0x8a6a48, solid: true });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) B.cyl(M.wood, 0.12, 0.12, 2.2, x - 6 + i * 2.3, -1.2, 16 + s * 1.1, { c: 0x6a4a30, seg: 6 });
    for (let i = 0; i < 9; i++) { const ax = x + 5 + R() * 6, az = 12 + R() * 9, ay = world.height(ax, az); B.cyl(M.flat, 0.26, 0.14, 0.7, ax, ay, az, { c: TERRA, seg: 9 }); B.cyl(M.flat, 0.1, 0.16, 0.22, ax, ay + 0.7, az, { c: TERRA, seg: 9 }); }
    for (const [ax, az] of [[9, 9.6], [10.2, 10.1], [9.4, 23.2], [8.2, 23.7]]) pithos(x + ax, world.height(x + ax, az), az);                // store jars as high as your chest: cover at both ends of the camp
    for (const [tx, tz, ry] of [[x + 14, 26, 1.75], [x + 16, 4, 1.35]]) {                                 // the Spartans' tents, open at both ends: two cots under the eaves, shield and spears at the ready
      const P = local(tx, tz, ry), ty = world.height(tx, tz), W = 4.2, L = 4.6, H = 3.0, sl = Math.hypot(W / 2, H) + 0.1, a = Math.atan2(H, W / 2);
      for (const s of [-1, 1]) {
        const [px, pz] = P(s * W / 4, 0); B.box(M.cloth, sl, 0.04, L, px, ty + H / 2 - 0.02, pz, { ry, rz: -s * a, c: 0xa01414 });
        const [qx, qz] = P(s * 1.6, 0); world.addBox(qx, qz, 1.0, L, ry, ty - 1, ty + 2.2);
        const [cx, cz] = P(s * 1.45, s * 0.6); B.box(M.woodH, 0.7, 0.28, 1.9, cx, ty, cz, { ry, c: 0x6a4a2e }); B.box(M.cloth, 0.66, 0.06, 1.5, cx, ty + 0.28, cz, { ry, c: 0x7a6a52 });
        for (const e of [-1, 1]) rod(B, M.wood, at(P, s * W / 2, ty - 0.2, e * L / 2), at(P, -s * 0.12, ty + H + 0.25, e * L / 2), 0.045, 0x5a4028);
      }
      rod(B, M.wood, at(P, 0, ty + H, -L / 2 - 0.2), at(P, 0, ty + H, L / 2 + 0.2), 0.04, 0x5a4028);
      { const [sx, sz] = P(-1.05, -1.3); B.geo(M.metal, new THREE.CylinderGeometry(0.45, 0.45, 0.05, 14), [sx, ty + 0.5, sz], [Math.PI / 2 - 0.3, ry + Math.PI / 2, 0], 1, 0xb8893a); rod(B, M.wood, at(P, -1.0, ty, -1.9), at(P, -0.55, ty + 2.2, -1.9), 0.02, 0x7a5a3a); }
      { const [sx, sz] = P(1.0, -1.7); pots(B, M, sx, ty, sz, { n: 2, s: 1.2, c: [TERRA], spread: 0.3, solid: false }); }
    }
  }
  // islets: a small shrine on the nearest one
  { const [ix, iz] = ISLETS[0], y = world.height(ix, iz); B.box(M.plaster, 7, 4, 10, ix, y - 0.5, iz, { c: MARBLE }); B.geo(M.kawara, prismGeo(8.4, 1.8, 11.4, 1.6), [ix, y + 3.5, iz], [0, 0, 0], 1, TERRA); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283 + 0.3, r = 520 + (i % 3) * 90; B.geo(M.flat, new THREE.SphereGeometry(1, 14, 8), [Math.cos(a) * r, -6, Math.sin(a) * r], [0, i, 0], [150 + (i % 4) * 60, 34 + (i * 37) % 40, 110 + (i % 3) * 50], 0x9db2c4); }

  // ---- new ground: goat path and treasury, the cave of the nymphs, the farm, the vineyard, the quarry, the shipwright's beach, Poseidon's islet ----
  /** A dry-stone wall in pieces of about 3 m, each standing on its own ground. */
  const wall = (x0, z0, x1, z1, h = 1.0) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 3)), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; B.box(M.stone, len / n + 0.05, h + 0.6, 0.5, x, world.height(x, z) - 0.6, z, { ry, c: i % 2 ? 0xd8cfb8 : 0xcfc5ad, solid: true }); }
  };
  const X = Math.PI / 2;
  const goatGeo = merge([gCap(0.16, 0.48, 0xffffff, [0, 0.55, 0], [X, 0, 0]), gCap(0.07, 0.2, 0xffffff, [0, 0.75, 0.38], [0.7, 0, 0]), gSph(0.1, 0xffffff, [0, 0.88, 0.5], [0.85, 0.95, 1.35]),
    gCone(0.025, 0.22, 0x8a8478, [0.05, 1.03, 0.44], [-0.6, 0, 0], 1, 5), gCone(0.025, 0.22, 0x8a8478, [-0.05, 1.03, 0.44], [-0.6, 0, 0], 1, 5), gCone(0.03, 0.12, 0xe0e0e0, [0, 0.76, 0.58], [Math.PI, 0, 0], 1, 5), gCap(0.025, 0.1, 0xffffff, [0, 0.62, -0.36], [-0.8, 0, 0]),
    ...[[0.09, 0.26], [-0.09, 0.26], [0.09, -0.26], [-0.09, -0.26]].map(([a, b]) => gCap(0.032, 0.36, 0xb0a898, [a, 0.21, b]))]);
  const pigGeo = merge([gCap(0.24, 0.5, 0xffffff, [0, 0.42, 0], [X, 0, 0]), gSph(0.17, 0xffffff, [0, 0.42, 0.5], [1, 1, 1.2]), gCyl(0.07, 0.085, 0.12, 0xd8b0a0, [0, 0.38, 0.72], [X, 0, 0], 1, 8), gCone(0.05, 0.1, 0xffffff, [0.1, 0.58, 0.46]), gCone(0.05, 0.1, 0xffffff, [-0.1, 0.58, 0.46]),
    ...[[0.12, 0.25], [-0.12, 0.25], [0.12, -0.25], [-0.12, -0.25]].map(([a, b]) => gCap(0.045, 0.14, 0xe0d0c8, [a, 0.11, b]))]);
  const flock = (kind, geo, list, tints, wide, long, high) => {                              // animals standing about: [x, z, ry, size]
    list.forEach(([x, z, ry, s = 1], i) => animal(B, M, root, kind, geo, x, world.groundAt(x, z, world.height(x, z) + 0.3), z, ry, { s, c: tints[i % tints.length], box: [wide / s, long / s, high / s, 0] }));
  };
  { // the goat path up the west flank of the hill: rocks along its edges for cover, and a small treasury where it reaches the top
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = -43 + i * 4.4 + (s > 0 ? 2 : 0), z = -53.1 + s * 3.0, y = world.height(x, z), k = 0.8 + (i % 3) * 0.3; B.geo(M.rock, rockGeo(i + 3, 1), [x, y + k * 0.25, z], [0, i * 1.3, 0], [k, k * 0.85, k * 0.9], i % 2 ? 0xd8cfb8 : 0xc8bea6); world.addCyl(x, z, k * 0.7, y - 1, y + k * 0.8); }
    const x = -16.5, z = -64, y = HILL.top + 0.25;
    room(B, M, x, y, z, { w: 4.4, d: 5.2, h: 3.0, t: 0.35, mat: M.plaster, c: 0xf0eadc, base: 0.6, doors: [{ side: 's', at: 0, w: 1.6, h: 2.2 }], floor: { mat: M.cobble, c: 0xe8e0d0 }, ceil: { mat: M.plaster, c: 0xe2dccc } });
    B.box(M.plaster, 5.2, 0.4, 2.2, x, y - 0.4, z + 3.6, { c: MARBLE, solid: true }); for (const s of [-1, 1]) column(x + s * 1.75, y, z + 4.1, 2.78, 0.24);
    B.geo(M.kawara, prismGeo(5.4, 1.3, 7.8, 1.6), [x, y + 3.2, z + 1.1], [0, 0, 0], 1, TERRA); B.box(M.plaster, 5.0, 0.3, 2.3, x, y + 2.9, z + 3.6, { c: MARBLE });
    for (const s of [-1, 1]) { chest(B, M, x + s * 0.95, y + 0.06, z - 1.85, 0, { c: 0x6a4a2e, band: 0xd9b23a }); shieldOn(x + s * 1.82, y + 1.9, z - 0.4, Math.PI / 2, s > 0 ? 0xb8893a : 0x8a3a2a); }
    table(B, M, x + 1.1, y + 0.06, z + 0.9, Math.PI / 2, { w: 1.3, d: 0.6, c: 0x8a6a48 }); pots(B, M, x + 1.1, y + 0.84, z + 0.9, { n: 3, s: 0.5, c: [0xd9b23a, 0xc9a050], spread: 0.3, solid: false }); pithos(x - 1.2, y + 0.06, z + 1.2, 2.6);
  }
  { // the cave of the nymphs (Odyssey XIII): a rock with two mouths, the northern one for men, the southern one - too low to walk through - for the gods.
    // Inside: the nymphs' looms and jars of stone, a spring, and the chest of gifts that Odysseus hid here
    const cx = -58, cz = -50, w = 7.5, d = 6.5, C = 0xc8bea6, y = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].map(([a, b]) => world.height(cx + a * w / 2, cz + b * d / 2))) + 0.05, f = y + 0.06;
    room(B, M, cx, y, cz, { w, d, h: 2.7, t: 0.6, mat: M.rock, c: C, base: 1.5, doors: [{ side: 'n', at: 0, w: 1.8, h: 2.2 }, { side: 's', at: 1.2, w: 1.4, h: 1.25 }], floor: { mat: M.ground, c: 0xb8a888 }, ceil: { mat: M.rock, c: C } });
    [[-1.6, 4.7, -0.6, 4.0, 1.8, 3.4], [1.9, 4.6, 0.8, 3.7, 1.7, 3.2], [-5.05, 1.0, 0, 1.0, 2.6, 3.6], [5.05, 1.0, 0.2, 1.0, 2.5, 3.6], [-2.9, 1.0, -4.55, 1.5, 2.6, 1.0], [2.9, 1.0, -4.55, 1.5, 2.5, 1.0], [-2.2, 1.0, 4.55, 2.0, 2.6, 1.0], [3.3, 1.0, 4.55, 1.05, 2.4, 1.0],
      [-4.6, 1.2, -4.1, 1.3, 2.8, 1.3], [4.6, 1.2, -4.1, 1.3, 2.6, 1.3], [-4.6, 1.2, 4.1, 1.3, 2.7, 1.3], [4.6, 1.2, 4.1, 1.3, 2.8, 1.3]].forEach(([lx, ly, lz, sx, sy, sz], i) => B.geo(M.rock, rockGeo(i + 2, 1), [cx + lx, y + ly, cz + lz], [0, 0, 0], [sx, sy, sz], [C, 0xd8cfb8, 0xb8ae98][i % 3]));
    for (const [lx, lz, bw, bd] of [[-4.5, 0, 1.5, d + 3], [4.5, 0, 1.5, d + 3], [-3.0, -4.0, 4.2, 1.5], [3.0, -4.0, 4.2, 1.5], [-2.3, 4.0, 5.6, 1.5], [3.5, 4.0, 3.2, 1.5]]) world.addBox(cx + lx, cz + lz, bw, bd, 0, y - 1.5, y + 3);
    for (const [lx, lz, k] of [[-3.0, -2.9, 0.9], [3.0, -2.9, 0.8], [-3.0, 3.0, 0.8], [3.05, 3.0, 0.6], [3.1, 0.1, 0.5], [-0.9, 3.1, 0.6]]) B.geo(M.rock, rockGeo(k * 10, 1), [cx + lx, f + k * 0.5, cz + lz], [0, 0, 0], [k, k * 1.6, k], 0xb8ae98);   // rock in the corners, stone hanging from the roof
    for (let i = 0; i < 9; i++) { const k = 0.2 + (i % 3) * 0.08; B.geo(M.rock, new THREE.ConeGeometry(k * 0.6, k * 2.4, 6), [cx - 2.4 + (i % 4) * 1.6 + (i % 2) * 0.3, y + 2.7 - k * 1.2, cz - 2.0 + Math.floor(i / 4) * 1.9 + (i % 3) * 0.3], [Math.PI, i, 0], 1, i % 2 ? 0xb8ae98 : C); }
    loom(cx - 2.85, f, cz - 1.2, X, true); loom(cx - 2.85, f, cz + 1.1, X, true);
    B.cyl(M.rock, 0.9, 1.0, 0.14, cx - 1.4, f, cz + 1.9, { c: 0xb8ae98, seg: 12 }); B.cyl(M.glow, 0.72, 0.72, 0.03, cx - 1.4, f + 0.13, cz + 1.9, { c: 0x2a9aa8, seg: 12 });
    heap(cx + 2.4, f, cz + 1.0, 0.75, { n: 3, s: 1.5, c: [0xb8b2a4, 0xa8a294], spread: 0.5 });
    chest(B, M, cx + 2.75, f, cz - 1.7, X, { c: 0x5a4028, band: 0xd9b23a }); pots(B, M, cx + 2.6, f, cz - 2.6, { n: 2, s: 0.7, c: [0xd9b23a], spread: 0.25, solid: false });
    extraPicks.push([cx + 1.3, cz - 0.8, 0, 0.9]); extraFoes.push(['peltast', -52, -42, {}]);
  }
  { // a shepherd with his crook, and his goats, on the meadow above the cave
    flock('goat', goatGeo, [[-50.5, -37, 0.4, 1], [-48.2, -38.4, 2.1, 0.9], [-52.6, -35.2, -1.2, 1.05], [-47.4, -35.6, 3.0, 0.85], [-51.2, -33.2, 1.5, 0.95]], [0xe8e0d0, 0x8a7458, 0xf0ece0, 0x5a4a3c, 0xc8b898], 0.4, 1.1, 1.0);
    const s = folk('greekMan', -49.2, -34.2, -2.6, { arms: [-1.0, 0.05], over: { hat: 'pilos', hatC: 0xc8b890, shirt: 0xd8c8a0 } }); inHand(s, staffParts(s, 1.9, true));
  }
  { // the swineherd's farm (Odyssey XIV): a hut, a walled yard, sties with roofs so low that only a crouching man gets under them.
    // The old man with the staff is Eumaeus, who kept faith with his master
    house(-51, 61, X, 6, 5, 3.1, { fit: (P, f) => { const [hx, hz] = P(1.7, 1.2); hearth(B, M, hx, f, hz, { pot: true }); const [rx, rz] = P(-0.4, 0.9); rug(B, M, rx, f, rz, X, { w: 1.8, d: 1.1, c: 0xb8a070, border: 0x6a5a40 }); } });
    wall(-45, 55, -33, 55); wall(-45, 69, -33, 69); wall(-33, 55, -33, 60.3); wall(-33, 63.7, -33, 69);
    for (const dx of [-42.2, -36.8]) { const y = world.height(dx, 57); deck(B, M, dx, y, 57, 0, { w: 4.4, d: 2.8, h: 1.3, c: 0xb89a5a, mat: M.thatch }); rug(B, M, dx, y + 0.03, 57, 0, { w: 3.6, d: 2.2, c: 0xc8a850, border: 0xb89a4a }); }
    flock('pig', pigGeo, [[-42.4, 57.1, 1.2, 1], [-37.0, 56.9, -0.7, 0.9], [-39.9, 63.6, 0, 1.05], [-38.9, 65.7, Math.PI, 0.95], [-36.2, 61, -2.0, 1], [-41.5, 61.4, 1.0, 0.8]], [0x6a5448, 0x8a6a5a, 0x4a3c34, 0xb89080], 0.5, 1.1, 0.75);
    { const y = world.height(-39.5, 64.6); B.box(M.wood, 2.2, 0.32, 0.5, -39.5, y, 64.6, { c: 0x5a4028, solid: true }); B.box(M.flat, 2.0, 0.03, 0.34, -39.5, y + 0.3, 64.6, { c: 0x8a7a52 }); }
    haystack(B, M, -35.3, world.height(-35.3, 66.7), 66.7); haystack(B, M, -43.3, world.height(-43.3, 67), 67, { r: 1.2, h: 1.9 });
    const e = folk('greekMan', -40.4, 60.0, 0.5, { arms: [-1.0, 0.05], over: { hair: 0x9a9a90, hat: null, face: ['beard'], shirt: 0xb8a888 } }); inHand(e, staffParts(e, 1.8));
    extraFoes.push(['hoplite', -37, 63, {}]);
  }
  { // the vineyard between the villa and the round temple: rows of vines to duck behind, terrace walls, a treading vat
    const vines = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
      const x = 62 + i * 3.2, z = 14.5 + j * 5, y = world.height(x, z);
      for (const k of [-1, 0, 1]) { B.box(M.wood, 0.08, 1.5, 0.08, x, world.height(x, z + k * 2.2) - 0.2, z + k * 2.2, { c: 0x6a4a30 }); vines.push({ x, y: world.height(x, z + k * 1.6) + 0.9, z: z + k * 1.6, ry: (k + i) * 0.12, s: [0.42, 0.48, 1.0], c: [0x5a7a34, 0x6a8a3c, 0x4c6a2c][(i + j + k + 3) % 3] }); }
      B.box(M.wood, 0.05, 0.05, 4.8, x, y + 1.22, z, { c: 0x6a4a30 }); if (j % 2 === 0) world.addBox(x, z + 2.5, 0.6, 9.9, 0, y - 1, world.height(x, z + 2.5) + 1.3);
      for (const k of [-1.5, 0.4, 1.9]) B.geo(M.flat, new THREE.SphereGeometry(0.1, 6, 4), [x + (k > 0 ? 0.3 : -0.3), y + 0.72, z + k], [0, 0, 0], [1, 1.5, 1], 0x5a2a6a);
    }
    root.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.rock, vines));
    wall(60.5, 9.6, 67, 9.6, 0.9); wall(70, 9.6, 76.5, 9.6, 0.9); wall(60.5, 34.6, 66, 34.6, 0.9); wall(69, 34.6, 76.5, 34.6, 0.9);
    const y = world.height(59.2, 12.8); B.box(M.stone, 2.2, 0.7, 1.5, 59.2, y - 0.1, 12.8, { c: 0xd8cfb8, solid: true }); B.box(M.flat, 1.9, 0.04, 1.2, 59.2, y + 0.58, 12.8, { c: 0x5a2248 });
    pots(B, M, 59.2, world.height(59.2, 14.1), 14.1, { n: 1, s: 1.4, c: [TERRA] }); basket(60.8, world.height(60.8, 12.3), 12.3, 0x5a2a6a); basket(60.9, world.height(60.9, 13.4), 13.4, 0x5a2a6a);
    extraFoes.push(['peltast', 70, 22, {}]);
  }
  { // the marble quarry behind the hill: three benches of cut stone (the upper ones are a jump each), blocks, a sledge, a hoist
    const qx = 8, qz = -94.5, y = world.height(qx, qz) - 0.35;
    [[10, 7, 0.8, 0], [7, 5, 1.6, -0.6], [4, 3, 2.4, 0.5]].forEach(([w, d, top, dx], i) => B.box(M.plaster, w, top + 1.5, d, qx + dx, y - 1.5, qz + (7 - d) / 2, { c: i % 2 ? 0xe2dccc : MARBLE, solid: true }));
    for (const [bx, bz, w, h, d, ry] of [[15.6, -96, 1.4, 0.9, 1.0, 0.3], [-0.6, -98, 1.8, 0.8, 0.9, -0.2], [12, -101.5, 1.2, 0.7, 0.8, 0.8]]) B.box(M.plaster, w, h + 0.3, d, bx, world.height(bx, bz) - 0.3, bz, { ry, c: MARBLE, solid: true });
    { const sx = -0.5, sz = -92.3, sy = world.height(sx, sz);                                // a block on its sledge, on rollers
      for (const k of [-0.8, 0, 0.8]) B.geo(M.wood, new THREE.CylinderGeometry(0.09, 0.09, 1.7, 7), [sx + k, sy + 0.09, sz], [X, 0, 0], 1, 0x6a4a30);
      for (const k of [-1, 1]) B.box(M.wood, 2.6, 0.14, 0.16, sx, sy + 0.18, sz + k * 0.5, { c: 0x5a4028 }); B.box(M.plaster, 1.6, 0.9, 1.1, sx, sy + 0.32, sz, { c: 0xe2dccc }); world.addBox(sx, sz, 2.6, 1.2, 0, sy - 1, sy + 1.22); }
    { const hx = 15, hz = -91.6, hy = world.height(hx, hz);                                  // the hoist: two spars, a rope, a block hanging at chest height (duck under it)
      for (const k of [-1, 1]) rod(B, M.wood, [hx + k * 1.3, hy - 0.2, hz], [hx, hy + 4.3, hz], 0.07, 0x5a4028); rod(B, M.flat, [hx, hy + 4.2, hz], [hx, hy + 2.0, hz], 0.02, 0x8a7a52);
      B.box(M.plaster, 1.0, 0.75, 0.8, hx, hy + 1.25, hz, { ry: 0.3, c: MARBLE, solid: true }); }
    rubble(B, M, 4, world.height(4, -99.6), -99.6, 1.0, 0xe2dccc); rubble(B, M, 11.6, world.height(11.6, -98.6), -98.6, 0.8, 0xd8cfb8);
    extraFoes.push(['hoplite', -4, -99, {}]);
  }
  { // the shipwright's beach: a hull on its stocks (crawl under the keel), timber, a workbench, a cauldron of pitch
    const sx = 24, sz = 91, ry = 1.96, P = local(sx, sz, ry), yb = Math.max(...[[0, 0], [1.3, 4], [-1.3, 4], [1.3, -4], [-1.3, -4]].map(([a, b]) => world.height(...P(a, b)))) + 1.3;
    B.geo(M.flat, new THREE.SphereGeometry(1, 14, 8), [sx, yb + 1.05, sz], [0, ry, 0], [1.45, 1.1, 4.6], 0x4a3222); B.box(M.woodH, 2.3, 0.1, 7.4, sx, yb + 1.55, sz, { ry, c: 0x8a6a48 }); world.addBox(sx, sz, 2.6, 8.4, ry, yb, yb + 1.9);
    for (let i = -3; i <= 3; i++) { const [px, pz] = P(0, i); B.box(M.wood, 2.6 - Math.abs(i) * 0.25, 0.16, 0.12, px, yb + 1.62, pz, { ry, c: 0x6a4a2e }); }
    for (const k of [-1, 1]) {
      const [tx, tz] = P(0, k * 3.3); B.box(M.wood, 3.6, 0.18, 0.2, tx, yb + 0.1, tz, { ry, c: 0x6a4a30 });
      for (const s of [-1, 1]) { const [px, pz] = P(s * 1.65, k * 3.3), g = world.height(px, pz); B.box(M.wood, 0.16, yb + 0.1 - g + 0.4, 0.16, px, g - 0.4, pz, { ry, c: 0x5a4028 }); rod(B, M.wood, at(P, s * 2.5, world.height(...P(s * 2.5, k * 1.2)) - 0.2, k * 1.2), at(P, s * 1.25, yb + 0.9, k * 1.2), 0.05, 0x6a4a30); }
    }
    { const [wx, wz] = P(-4.2, 1.5); woodpile(B, M, wx, world.height(wx, wz), wz, ry, { w: 2.2, d: 2.6, h: 0.9 }); const [vx, vz] = P(-4.0, -2.4); woodpile(B, M, vx, world.height(vx, vz), vz, ry + 0.2, { w: 1.6, d: 3.0, h: 0.6, c: 0x8a6a48 }); }
    { const [tx, tz] = P(4.0, 1.6), ty = world.height(tx, tz), top = table(B, M, tx, ty, tz, ry + X, { w: 1.8, d: 0.8 }); B.box(M.wood, 0.5, 0.05, 0.05, tx, top, tz, { ry: ry + 0.6, c: 0x5a4028 }); B.box(M.metal, 0.05, 0.04, 0.16, tx + 0.2, top, tz + 0.1, { ry: ry + 0.6, c: 0xb8893a }); }
    { const [hx, hz] = P(4.2, -2.4); fires.push(hearth(B, M, hx, world.height(hx, hz), hz, { pot: true })); }
  }
  { // Poseidon's islet at the end of the sandbar: four columns, a roof, the god's trident set in a stone
    const [ix, iz] = ISLE, y = world.height(ix, iz) - 0.15;
    B.box(M.plaster, 4.4, 1.5, 4.4, ix, y - 1, iz, { c: MARBLE, solid: true });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) column(ix + a * 1.7, y + 0.5, iz + b * 1.7, 2.6, 0.24);
    B.box(M.plaster, 4.6, 0.35, 4.6, ix, y + 3.52, iz, { c: MARBLE }); B.geo(M.kawara, prismGeo(5.0, 1.1, 5.0, 1.6), [ix, y + 3.87, iz], [0, 0, 0], 1, TERRA);
    B.box(M.plaster, 0.8, 0.7, 0.8, ix, y + 0.5, iz - 0.7, { c: 0xe2dccc, solid: true }); B.cyl(M.metal, 0.03, 0.03, 2.1, ix, y + 1.2, iz - 0.7, { c: 0xb8893a, seg: 6 }); B.box(M.metal, 0.6, 0.04, 0.04, ix, y + 2.9, iz - 0.7, { c: 0xb8893a });
    for (const k of [-1, 0, 1]) B.geo(M.metal, new THREE.ConeGeometry(0.035, 0.42, 5), [ix + k * 0.28, y + 3.13, iz - 0.7], [0, 0, 0], 1, 0xb8893a);
    pots(B, M, ix + 0.9, y + 0.5, iz + 0.5, { n: 3, s: 0.8, c: [TERRA, 0xd9b23a], spread: 0.35, solid: false }); extraPicks.push([ix - 0.8, iz + 0.7, 0, 0.9]);
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4, r = 5.5 + (i % 3) * 1.2, rx = ix + Math.cos(a) * r, rz = iz + Math.sin(a) * r, k = 0.5 + (i % 3) * 0.35; B.geo(M.rock, rockGeo(i + 1, 1), [rx, world.height(rx, rz) + k * 0.2, rz], [0, i, 0], [k, k * 0.8, k], 0xc8bea6); }
  }
  boulder(B, M, -66, world.height(-66, -8), -8, { rx: 6, rz: 5, h: 6, seed: 5, ladder: 0.2, rock: [0xd8cfb8, 0xc8bea6, 0xe0d8c4, 0xb8ae98], grass: 0xa3a45e, grass2: 0xb8b070, moss: 0xb0a878 });   // a limestone crag above the harbour camp, up a ladder on its landward side

  // ---- vegetation -------------------------------------------------------------------------------
  const built = (x, z) => dPoly(PATH, x, z) < 3.6 || (Math.abs(x) < 9 && z < 34 && z > 14) || (x > 18 && x < 30 && z > -4 && z < 26) || Math.hypot(x - HILL.x, z - HILL.z) < 36 || Math.hypot(x - 74, z + 8) < 9 || Math.hypot(x - 93, z - 56) < 15 || Math.hypot(x - 50, z - 24) < 12 || Math.hypot(x - 41, z + 24) < 13 || Math.hypot(x + 37.4, z + 7.2) < 4
    || [[-17, 39], [-23, 23], [-15, 9], [17, 38], [-34, 36], [34, 44]].some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 8.5)
    || dPoly(GOAT, x, z) < 6 || Math.hypot(x + 58, z + 50) < 9 || Math.hypot(x + 50, z + 36) < 5 || (x > -57 && x < -31 && z > 53 && z < 71) || (x > 57 && x < 78 && z > 8 && z < 36) || (z < -88 && Math.abs(x - 7) < 12)
    || Math.hypot(x - 24, z - 91) < 8 || Math.hypot(x + 66, z + 8) < 9 || Math.hypot(x - 9, z - 84) < 4 || Math.hypot(x + 16, z - 69.5) < 5 || Math.hypot(x + 59, z - 15) < 16;
  const indoors = [[-17, 39], [-23, 23], [-15, 9], [17, 38], [-34, 36], [34, 44], [88, 51], [97, 61], [-51, 61], [-58, -50, 4.5], [50, 24, 7.5]];   // floors that grass must not grow through
  const olives = [], cypress = [], rocks = [], tufts = [], poppies = [], bushes = [];
  for (let i = 0; i < 4000 && olives.length < 60; i++) { const x = (R() - 0.5) * 190, z = -85 + R() * 195, h = world.height(x, z); if (h < 2.6 || h > 9 || built(x, z) || fbm(x * 0.04, z * 0.04, 2, 4) < 0.5) continue; const s = 0.8 + R() * 0.6; olives.push({ x, y: h - 0.15, z, ry: R() * 6.28, s }); world.addCyl(x, z, 0.35 * s, h - 2, h + 5); }
  for (let i = 0; i < 4000 && cypress.length < 46; i++) { const x = (R() - 0.5) * 180, z = -85 + R() * 190, h = world.height(x, z); if (h < 2.8 || h > 9 || built(x, z)) continue; const s = 0.8 + R() * 0.7; cypress.push({ x, y: h - 0.2, z, ry: R() * 6.28, s: [s, s * (1 + R() * 0.4), s] }); world.addCyl(x, z, 0.4 * s, h - 2, h + 8); }
  for (const o of grove) olives.push(o);
  root.add(instanced(blobTreeGeo({ leaf: [0x8f9f6a, 0xa8b47e, 0x7c8c5a], trunk: 0x5a4a3a, h: 3.4, spread: 2.5, blobs: 9, seed: 5 }), M.rock, olives));
  root.add(instanced(merge([gCyl(0.14, 0.2, 1.4, 0x4a3a2c, [0, 0.7, 0], [0, 0, 0], 1, 6), gCone(0.95, 8.6, 0x2f4d30, [0, 5.4, 0], [0, 0, 0], 1, 8), gCone(0.7, 4, 0x3a5a38, [0, 4.2, 0], [0, 1, 0], 1, 7)]), windify(M.rock.clone(), shared, 0.12, 9, 1.0), cypress));
  for (let i = 0; i < 300; i++) { const a = R() * 6.283, d = 80 + R() * 26, x = Math.cos(a) * d, z = Math.sin(a) * d * 1.25, h = world.height(x, z); if (h < -2.5 || h > 3) continue; const s = 0.4 + R() * R() * 2.6; rocks.push({ x, y: h + s * 0.2, z, ry: R() * 6, s: [s, s * 0.8, s], c: R.pick([0xd8cfb8, 0xc8bea6, 0xb8ae98]) }); if (s > 1 && h > -0.5) world.addCyl(x, z, s * 0.8, h - 2, h + s * 0.7); }
  for (const [ix, iz, r] of ISLETS) for (let k = 0; k < 6; k++) { const a = R() * 6.28, x = ix + Math.cos(a) * r * 0.9, z = iz + Math.sin(a) * r * 0.9, s = 2 + R() * 5; rocks.push({ x, y: world.height(x, z) + s * 0.3, z, ry: R() * 6, s: [s, s * 1.3, s], c: 0xc8bea6 }); }
  root.add(instanced(rockGeo(6, 1), M.rock, rocks, { solid: true }));
  for (let i = 0; i < 60000 && tufts.length < 16000; i++) {
    const x = (R() - 0.5) * 200, z = -88 + R() * 200, h = world.height(x, z);
    if (h < 3.2 || dPoly(PATH, x, z) < 1.4 || Math.hypot(x - HILL.x, z - HILL.z) < 25 || (Math.abs(x) < 8.5 && z < 32 && z > 16) || dPoly(GOAT, x, z) < 3.4 || (x > 20.3 && x < 27.7 && z > -0.7 && z < 24.7) || indoors.some(([hx, hz, r = 4]) => Math.hypot(x - hx, z - hz) < r)) continue;
    tufts.push({ x, y: h, z, ry: R() * 6.28, s: [0.35 + R() * 0.4, 0.2 + R() * 0.35, 0.35 + R() * 0.4], c: R.pick([0xd9c878, 0xc8b868, 0xa8ac5c, 0xe2d48a]) });
    if (i % 9 === 0) poppies.push({ x: x + 0.3, y: h, z: z + 0.2, ry: R() * 6, s: 0.7 + R() * 0.6, c: R.pick([0xe0301c, 0xe0301c, 0xf0d040, 0xffffff]) });
    if (i % 120 === 0 && !built(x, z)) { const s = 0.5 + R() * 0.6; bushes.push({ x, y: h + 0.2, z, ry: R() * 6, s: [s * 1.3, s * 0.8, s * 1.3], c: R.pick([0x5a7040, 0x6a7c4a, 0x4c6238]) }); }
  }
  root.add(instanced(tuftGeo(5, 0xa89a5a, 0xffffff), windify(M.flat2.clone(), shared, 0.22, 1, 2.0), tufts, { cast: false, thin: true }));
  root.add(instanced(merge([gBox(0.012, 0.3, 0.012, 0x4a6a2a, [0, 0.15, 0]), xf(new THREE.IcosahedronGeometry(0.06, 0), [0, 0.32, 0], [0, 0, 0], [1, 0.6, 1], 0xffffff)]), windify(M.flat.clone(), shared, 0.2, 0.4, 2.0), poppies, { cast: false, thin: true }));
  root.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.rock, bushes));

  // ---- atmosphere ---------------------------------------------------------------------------------
  root.add(makeAmbient(shared, { count: 300, box: 40, boxY: 14, size: 0.04, colorA: 0xffffff, colorB: 0xfff4c8, alpha: 0.6, fall: -0.02, wind: [0.5, 0, 0.2], flutter: 0.8 }));
  const gullGeo = merge([gBox(1.5, 0.03, 0.26, 0xf4f4f0, [0, 0, 0]), gBox(0.2, 0.06, 0.6, 0xf4f4f0, [0, 0, 0.05])]);
  const gulls = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(gullGeo, M.flat); root.add(m); return { m, r: 40 + i * 22, h: 26 + i * 6, sp: 0.16 + i * 0.03, ph: i * 1.7, cx: i % 2 ? -40 : 30, cz: i % 2 ? 60 : -10 }; });

  { // a lookout above the landing beach (up its ladder); an old cistern and its drain: crawl in at one end and out at the other, past the first guards
    stand(B, M, 9, world.height(9, 83.7), 83.7, 0, { c: 0xb8a070, roof: 0xb86a42 });
    const y = Math.max(...[71.1, 69.5, 68, 66.5].map((z) => world.height(-16, z))) + 0.02;
    room(B, M, -16, y, 71.1, { w: 3.4, d: 3.2, h: 1.95, t: 0.35, mat: M.plaster, c: 0xe8e0d0, base: 1.6, doors: [{ side: 's', at: 0, w: 1.4, h: 1.25 }, { side: 'n', at: 0, w: 1.4, h: 1.25 }], floor: { mat: M.ground, c: 0x6a5a48 }, ceil: { mat: M.plaster, c: 0xe8e0d0 } });
    crawlway(B, M, -16, y, 68, 0, { len: 3, h: 1.25, mat: M.plaster, c: 0xe8e0d0 }); extraPicks.push([-16, 71.3, 0, 0.6]);
    rubble(B, M, -17.6, world.height(-17.6, 66.2), 66.2, 0.8, 0xd8cfb8); rubble(B, M, -14.3, world.height(-14.3, 69.2), 69.2, 0.6, 0xc8bea6);
  }
  const enemies = [
    ['hoplite', 5, 76, {}], ['peltast', -9, 63, {}], ['hoplite', 19, 58, { patrol: true }],
    ['peltast', -21, 31, {}], ['hoplite', -5, 33, {}], ['hoplite', 9, 20, { patrol: true }], ['peltast', 21, 10, { y: 6 }], ['hoplite', 12, 3, {}],
    ['hoplite', -58, 16, {}], ['peltast', -54, 26, {}], ['hoplite', -62, 5, { patrol: true }],
    ['peltast', 68, -3, {}], ['hoplite', 62, -11, {}],
    ['hoplite', -5, -7, {}], ['hoplite', 5, -7, {}],
    ['peltast', -12, -30, {}], ['peltast', 12, -30, {}], ['hoplite', -7, -39, {}], ['hoplite', 7, -39, {}], ['greeceBoss', 0, -42, { yaw: 0, patrol: false }],
    ['hoplite', -2.4, -58, { up: 1.8, patrol: false, yaw: 0 }], ['hoplite', 17, 38, { up: 1.8, patrol: false }], ['peltast', 34, 44, { up: 4.2, static: true }], ['hoplite', -50, -51, {}],
    ['hoplite', 91, 57, {}], ['peltast', 95, 53, {}], ['hoplite', 100.4, 50.6, { up: 1.8, patrol: false }],
  ];
  const jar = merge([gCyl(0.16, 0.08, 0.3, 0xd9b23a, [0, 0, 0], [0, 0, 0], 1, 9), gCyl(0.06, 0.1, 0.12, 0xd9b23a, [0, 0.2, 0], [0, 0, 0], 1, 9), gCyl(0.09, 0.09, 0.03, 0xf0ece0, [0, 0.27, 0], [0, 0, 0], 1, 9)]);
  let ft = 0;
  return {
    env: {
      sunDir: [-0.42, 0.74, 0.52], sunColor: 0xfff2d8, sunLight: 0xfff6e6, sunIntensity: 4.6, sunSize: 0.0005,
      skyTop: 0x1462c6, skyHorizon: 0xa6d2f0, skyGround: 0x6aa8c8, haze: 0.6,
      fogColor: 0xa9d2ec, fogDensity: 0.0011, hemiSky: 0xb4d6ff, hemiGround: 0xd6c494, hemiIntensity: 1.7, envIntensity: 0.7,
      cloudCover: 0.44, cloudScale: 0.36, cloudLit: 0xffffff, cloudShade: 0xa6b6cc,
      bloom: 0.3, bloomRadius: 0.6, bloomThreshold: 1.5, rays: 0.2, rayThreshold: 2.8, exposure: 0.88,
      saturation: 1.2, contrast: 1.07, vignette: 0.28, tintHi: 0xfffaf0, tintLo: 0xe4f2ff, shadowRange: 95,
    },
    spawn: { x: 0, z: 99, yaw: 0 },
    vista: { c: [0, 6, 30], r: 60, h: 14, a: 1.5, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[-3, 62], [11, 27], [-52, 14], [66, -5], [0, -33.5], [2.6, -61, 0, 1.8], [101.8, 51.4, 0, 1.8], [-22.5, 23.5, 0, 1.8]].concat(extraPicks),
    dust: [0.78, 0.7, 0.52], water: [[0, 112, 30], [-70, 16, 34], [84, -8, 24], [56, 98, 26]],
    makePickup: () => new THREE.Mesh(jar, M.flat),
    update(dt, t, g) {
      idle(people, t);
      for (const b of gulls) { const a = t * b.sp + b.ph; b.m.position.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(t * 0.5 + b.ph) * 2, b.cz + Math.sin(a) * b.r); b.m.rotation.set(0, -a, 0.3); }
      ft -= dt;
      if (ft <= 0) {
        ft = 0.06;
        for (const f of fires) {
          g.gfx.glow.spawn(f[0] + (Math.random() - 0.5) * 0.2, f[1], f[2] + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.4, 1.2 + Math.random(), (Math.random() - 0.5) * 0.4, { life: 0.6 + Math.random() * 0.4, s0: 0.26, s1: 0.03, r: 3, g: 1.1, b: 0.25, a: 0.9 });
          if (Math.random() < 0.3) g.gfx.soft.spawn(f[0], f[1] + 0.6, f[2], 0.5, 1.3, 0.2, { life: 3, s0: 0.3, s1: 1.6, r: 0.6, g: 0.6, b: 0.6, a: 0.14, drag: 0.2 });
        }
      }
    },
  };
}

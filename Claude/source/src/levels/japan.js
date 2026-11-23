// Chapter II - a shrine path through a bamboo forest at dusk.
import * as THREE from 'three';
import { Heightfield, curvedRoofGeo, rockGeo } from '../build.js';
import { makeAmbient, makeWater, windify } from '../gfx.js';
import { instanced, room, steps, shelf, tuftGeo, blobTreeGeo, gBox, gCyl, gCone, gSph, gCap, xf, merge, paint, stand, den, ladder, boulder, fence, beast, local, table, bed, chest, pots, sacks, rug, hearth, woodpile, haystack, deck, person, idle, animal } from '../props.js';
import { fbm, smooth, clamp } from '../util.js';

export const japan = {
  id: 'japan', theme: 'theme-japan', chapter: 'Chapter II', title: 'Kagemori', kanji: '影森', place: 'Kagemori shrine · Japan · 1600',
  story: 'Your lord is dead and his killers hold the shrine of the shadow forest. Ninja wait among the bamboo, masterless swordsmen guard the steps. Walk the path of the gates and take back the sacred ground.',
  weapon: 'shuriken',
  heroes: [
    { look: 'musashi', name: 'Miyamoto Musashi', who: 'Undefeated duellist, master of two swords', trait: 'Two swords', effect: 'faster katana cuts with longer reach', mods: { melee: 0.62, reach: 0.6 }, sleeve: 0x2c2c32, cuff: 0x1a1a1e },
    { look: 'tomoe', name: 'Tomoe Gozen', who: 'Woman warrior of the Genpei War', trait: 'Swift hands', effect: 'throws her stars almost twice as fast', mods: { fire: 0.55 }, sleeve: 0xf0ece0, cuff: 0xa81c1c },
    { look: 'date', name: 'Date Masamune', who: 'The One-Eyed Dragon of Sendai', trait: 'Black armour', effect: 'takes 30% less damage', mods: { armor: 0.7 }, sleeve: 0x17171c, cuff: 0xd9b23a },
  ], weaponName: 'Shuriken & katana', alt: 'right mouse — katana',
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> throw stars &nbsp; <kbd>Right mouse</kbd> aim (the line shows where they land) &nbsp; <kbd>F</kbd> katana cut',
  foes: 'foes remain', foesNone: 'The shrine is silent', bossName: 'Kurogane, the Iron Ronin', bossDown: 'Kurogane has fallen', pickupText: 'Rice cake  +35',
  deadTitle: 'Honour lost', deadSub: 'The forest keeps your name.', clearTitle: 'The shrine is restored',
  build,
};

const RED = 0xc8301c, DARK = 0x2a1c14, INK = 0x15110e;

function build({ game, gfx, world, B, M, root, rand, shared }) {
  const R = rand;
  const pathX = (z) => (z > 38 ? Math.sin((z - 38) * 0.085) * 5 : 0);
  // side trails: gate path -> rice paddies -> tea hut; gate path -> great boulder -> charcoal camp -> hermitage; hamlet -> mossy stair -> behind the pagoda
  const TRAILS = [[4, 65.2, 9, 64.6], [9, 64.6, 21, 55.5], [26, 45.5, 30, 36], [2.7, 68.2, -12, 64], [-12, 64, -24, 60], [-24, 60, -42, 58], [-42, 58, -52, 58], [-55, 50, -53, 40], [-53, 40, -49, 33], [-35, -14, -42, -23], [-42, -30, -34, -38]];
  const trailD = (x, z) => { let m = 99; for (const [ax, az, bx, bz] of TRAILS) { const dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return m; };
  const CAMP = { x: -58, z: 57 }, campF = (x, z) => 1 - smooth(9, 14, Math.hypot(x - CAMP.x, z - CAMP.z));
  const padF = (x, z) => (1 - smooth(27, 31, Math.abs(x - 46))) * (1 - smooth(14, 18, Math.abs(z - 59)));      // the paddies and their farm yard: level ground
  // ---- terrain ------------------------------------------------------------------
  const POND = { x: -1, z: 24, r: 11.5 };
  const hf = new Heightfield(360, 180, (x, z) => {
    let h = (fbm(x * 0.03 + 9, z * 0.03, 4, 21) - 0.5) * 2.2;
    const onPath = Math.max(1 - smooth(2, 7, Math.abs(x - pathX(z))), 1 - smooth(1.5, 5, trailD(x, z)), campF(x, z));
    h *= 1 - onPath * 0.85;
    const flat = (1 - smooth(58, 68, Math.abs(x))) * (1 - smooth(8, 16, Math.abs(z - 8) - 30));
    h *= 1 - flat * 0.8;
    const pd = Math.hypot(x - POND.x, z - POND.z);
    h -= (1 - smooth(POND.r - 4, POND.r + 1.5, pd)) * 1.5;
    const pad = padF(x, z); h = h * (1 - pad) + 0.3 * pad;
    // shrine terrace: +3 m, reached by a ramp (the stairs) in the middle
    const stair = Math.abs(x) < 4.2 ? smooth(-23.5, -32.5, z) : smooth(-27.6, -29.2, z);
    h = h * (1 - stair) + 3 * stair;
    const north = smooth(31, 37, z);                                    // north of the pond the valley is wider; south of it a wooded bank closes it
    const out = Math.max(smooth(64 + 18 * north, 124 + 18 * north, Math.abs(x)), smooth(76, 140, Math.abs(z)));
    return h + out * (fbm(x * 0.012, z * 0.012 + 4, 4, 3) * 36 + 4) + (1 - north) * smooth(63.5, 68, Math.abs(x)) * 6;
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -80, x1: 80, z0: -76, z1: 79 };
  for (const s of [-1, 1]) world.addBox(s * 74.5, -22, 18, 115, 0, -20, 80);       // the bank is the edge of the world there
  world.maxSlope = 1.0; world.waterY = -1.05;
  const cMoss = new THREE.Color(0x4a5c30), cDirt = new THREE.Color(0x6a5a44), cDark = new THREE.Color(0x35432a), cGravel = new THREE.Color(0xb0a898), cMud = new THREE.Color(0x4a4232), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z) => {
    tmp.copy(cMoss).lerp(cDark, fbm(x * 0.05, z * 0.05, 3, 6));
    tmp.lerp(cDirt, (1 - smooth(1.2, 3.4, Math.abs(x - pathX(z)))) * 0.9 * (z > -24 ? 1 : 0));
    if (z < -30 && Math.abs(x) < 34) tmp.lerp(cGravel, 0.85);
    tmp.lerp(cDirt, Math.max((1 - smooth(0.8, 2.6, trailD(x, z))) * 0.85, campF(x, z) * 0.7));
    if (x > 30) tmp.lerp(cMud, padF(x, z) * 0.8);
    return tmp;
  }));

  // ---- reusable pieces -------------------------------------------------------------
  const lights = [], people = [];
  const kneel = (f) => { f.group.position.y -= 0.6 * f.scale; f.armR.rotation.x = -0.7; f.armL.rotation.x = -0.6; };   // sitting on the heels on a raised floor: the legs are out of sight below the boards
  const lamp = (x, y, z, i = 14, d = 10) => { if (lights.length < 9) { const l = new THREE.PointLight(0xffa050, i, d, 1.8); l.position.set(x, y, z); root.add(l); lights.push(l); } };
  const torii = (x, z, ry = 0, s = 1) => {
    const y = world.height(x, z), c = Math.cos(ry), sn = Math.sin(ry), P = (lx) => [x + lx * c, z - lx * sn];
    for (const side of [-1, 1]) {
      const [px, pz] = P(side * 1.9 * s);
      B.cyl(M.flat, 0.19 * s, 0.23 * s, 4.3 * s, px, y, pz, { c: RED, rz: side * 0.035, ry, seg: 10 });
      B.cyl(M.flat, 0.27 * s, 0.3 * s, 0.45 * s, px, y - 0.05, pz, { c: INK, seg: 10 });
      world.addCyl(px, pz, 0.26 * s, y - 1, y + 4.3 * s);
    }
    B.box(M.flat, 4.7 * s, 0.24 * s, 0.2 * s, x, y + 3.25 * s, z, { ry, c: RED });
    B.box(M.flat, 0.2 * s, 0.5 * s, 0.14 * s, x, y + 3.5 * s, z, { ry, c: RED });
    B.box(M.flat, 5.1 * s, 0.26 * s, 0.34 * s, x, y + 4.02 * s, z, { ry, c: RED });
    B.box(M.flat, 5.5 * s, 0.16 * s, 0.46 * s, x, y + 4.28 * s, z, { ry, c: INK });
    for (const side of [-1, 1]) { const [ex, ez] = P(side * 2.95 * s); B.box(M.flat, 0.85 * s, 0.16 * s, 0.46 * s, ex, y + 4.36 * s, ez, { ry, rz: side * 0.24, c: INK }); B.box(M.flat, 0.7 * s, 0.24 * s, 0.34 * s, ex - side * 0.12 * c, y + 4.1 * s, ez + side * 0.12 * sn, { ry, rz: side * 0.2, c: RED }); }
  };
  const lantern = (x, z, lit = true, s = 1) => {
    const y = world.groundAt(x, z, world.height(x, z) + 0.2), G = 0x8a8c84;
    B.cyl(M.rock, 0.3 * s, 0.38 * s, 0.25 * s, x, y, z, { c: G, seg: 6 });
    B.cyl(M.rock, 0.13 * s, 0.16 * s, 0.9 * s, x, y + 0.25 * s, z, { c: G, seg: 6 });
    B.cyl(M.rock, 0.34 * s, 0.2 * s, 0.14 * s, x, y + 1.15 * s, z, { c: G, seg: 6 });
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) B.box(M.rock, 0.06 * s, 0.34 * s, 0.06 * s, x + sx * 0.17 * s, y + 1.29 * s, z + sz * 0.17 * s, { c: G });
    if (lit) B.box(M.glow, 0.24 * s, 0.26 * s, 0.24 * s, x, y + 1.32 * s, z, { c: 0xff9a3a });
    B.geo(M.rock, new THREE.ConeGeometry(0.46 * s, 0.34 * s, 6), [x, y + 1.8 * s, z], [0, 0.5, 0], 1, G);
    B.geo(M.rock, new THREE.SphereGeometry(0.08 * s, 6, 5), [x, y + 2.02 * s, z], [0, 0, 0], 1, G);
    world.addCyl(x, z, 0.3 * s, y - 1, y + 1.9 * s);
  };
  /** Timber-framed house with glowing paper screens and a sweeping roof. */
  const house = (x, z, w, d, o = {}) => {
    const { ry = 0, h = 2.9, roof = M.kawara, roofC = 0x56646a, roofH = 2.6, up = 0.7, base = 0.5, wallC = 0xe8e0cc, over = 1.5 } = o;
    const y = o.y ?? world.height(x, z);
    const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    B.box(M.woodH, w + 1.6, base, d + 1.6, x, y, z, { ry, c: 0x5a4030, solid: true });                      // veranda platform
    const n = Math.max(2, Math.floor(w / 2.1)), bw = w / n, mid = Math.floor(n / 2), lxm = -w / 2 + (mid + 0.5) * bw, fy = y + base + 0.06;
    room(B, M, x, y + base, z, { w, d, h, t: 0.2, ry, mat: M.plaster, c: wallC, base: 0.04, ceil: false, floor: { mat: M.thatch, c: 0xb8aa70 },
      doors: [{ side: 's', at: lxm, w: bw - 0.25, h: 2.1 }, { side: 'n', at: lxm, w: bw - 0.25, h: 2.1 }] });
    for (const sz of [-1, 1]) { const [px, pz] = P(lxm, sz * (d / 2 + 1.2)); B.box(M.stone, 1.5, 0.75, 0.7, px, y - 0.5, pz, { ry, c: 0x8c8a80, solid: true }); }   // stepping stones
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [px, pz] = P(sx * w / 2, sz * d / 2); B.box(M.wood, 0.24, h, 0.24, px, y + base, pz, { ry, c: DARK }); }
    for (const sz of [-1, 1]) { const [bx, bz] = P(0, sz * (d / 2 + 0.02)); B.box(M.woodH, w + 0.2, 0.2, 0.12, bx, y + base + h - 0.2, bz, { ry, c: DARK }); B.box(M.woodH, w + 0.2, 0.16, 0.12, bx, y + base, bz, { ry, c: DARK }); }
    for (const sx of [-1, 1]) { const [bx, bz] = P(sx * (w / 2 + 0.02), 0); B.box(M.woodH, 0.12, 0.2, d + 0.2, bx, y + base + h - 0.2, bz, { ry, c: DARK }); }
    for (let i = 0; i < n; i++) {                                                                       // shoji screens, front + back (the middle bay stands open)
      if (i === mid) continue;
      const lx = -w / 2 + (i + 0.5) * (w / n);
      for (const sz of [-1, 1]) { const [sx_, sz_] = P(lx, sz * (d / 2 + 0.04)); B.box(M.shoji, w / n - 0.3, 1.9, 0.06, sx_, y + base + 0.12, sz_, { ry }); }
    }
    for (let i = 0; i <= n; i++) { const lx = -w / 2 + i * (w / n); for (const sz of [-1, 1]) { const [px, pz] = P(lx, sz * (d / 2 + 0.05)); B.box(M.wood, 0.14, h, 0.1, px, y + base, pz, { ry, c: DARK }); } }
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const [px, pz] = P(sx * (w / 2 + 0.6), -d / 2 - 0.5 + i * (d + 1) / 3); B.box(M.wood, 0.16, h + 0.1, 0.16, px, y + base, pz, { ry, c: DARK }); }
    B.box(M.woodH, w + 2.4, 0.16, d + 2.4, x, y + base + h, z, { ry, c: 0x3a2a20 });
    B.geo(roof, curvedRoofGeo(w + over * 2, d + over * 2, roofH, { up, tile: roof.userData.tile, ridge: 0.5 }), [x, y + base + h + 0.14, z], [0, ry, 0], 1, roofC);
    B.box(M.flat, w * 0.52 + over, 0.22, 0.3, x, y + base + h + roofH, z, { ry, c: 0x2a3034 });
    return { y: y + base, fy, P };
  };
  // small things for the insides: a cushion, a paper floor lamp, a scroll hanging flat on a wall (the wall runs along local Z), a folding screen, a bale or roll lying along local Z
  const cushion = (x, y, z, ry, c) => B.box(M.cloth, 0.5, 0.07, 0.5, x, y, z, { ry, c });
  const andon = (x, y, z, ry = 0) => { B.box(M.wood, 0.3, 0.12, 0.3, x, y, z, { ry, c: DARK }); B.box(M.glow, 0.24, 0.4, 0.24, x, y + 0.12, z, { ry, c: 0xffa040 }); };
  const scroll = (x, y, z, ry) => { B.box(M.cloth, 0.02, 1.15, 0.5, x, y, z, { ry, c: 0xe8e0c8 }); for (const [k, h] of [[0.62, 0.34], [0.26, 0.22]]) B.box(M.flat, 0.03, h, 0.06, x, y + k, z, { ry, c: INK }); for (const k of [-0.03, 1.15]) B.box(M.wood, 0.05, 0.04, 0.58, x, y + k, z, { ry, c: DARK }); };
  const byobu = (x, y, z, ry, n = 3, h = 1.55) => { const Q = local(x, z, ry); for (let k = 0; k < n; k++) { const [bx, bz] = Q((k - (n - 1) / 2) * 0.62, (k % 2) * 0.2 - 0.1); B.box(M.shoji, 0.7, h, 0.04, bx, y, bz, { ry: ry + (k % 2 ? -0.5 : 0.5) }); } world.addBox(x, z, n * 0.62 + 0.14, 0.34, ry, y, y + h); };
  const lie = (mat, r, len, x, y, z, ry, c, seg = 10) => B.geo(mat, new THREE.CylinderGeometry(r, r, len, seg), [x, y + r, z], [Math.PI / 2, 0, -ry], 1, c);

  // ---- A: the gate path through the bamboo ---------------------------------------------
  for (let i = 0; i < 9; i++) { const z = 70 - i * 3.6; torii(pathX(z), z, Math.atan2(pathX(z + 1) - pathX(z - 1), 2) * -1); }
  for (let i = 0; i < 6; i++) { const z = 74 - i * 7.5, side = i % 2 ? 1 : -1; lantern(pathX(z) + side * 3.1, z, true); if (i % 2 === 0) lamp(pathX(z) + side * 3.1, world.height(pathX(z), z) + 1.6, z, 16, 11); }
  for (let z = 78; z > 37; z -= 1.15) {                                                               // stepping stones
    const x = pathX(z) + (R() - 0.5) * 0.7, y = world.height(x, z);
    B.cyl(M.rock, 0.42 + R() * 0.2, 0.46 + R() * 0.2, 0.1, x, y - 0.04, z, { c: R.pick([0x8a8a82, 0x9a9890, 0x7a7c76]), seg: 7, ry: R() * 3 });
  }

  // ---- B: pond, bridge, garden ------------------------------------------------------------
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 1.2, 40), makeWater(shared, { deep: 0x0a2422, scale: 1.4, flow: [0.05, 0.03], alpha: 0.86 }));
  water.rotation.x = -Math.PI / 2; water.position.set(POND.x, -0.42, POND.z); root.add(water);
  {
    // arched bridge along z, from z=36 to z=12
    const z0 = 36, z1 = 12, n = 16, top = 1.75;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, za = z0 + (z1 - z0) * t0, zb = z0 + (z1 - z0) * t1;
      const ya = Math.sin(t0 * Math.PI) * top, yb = Math.sin(t1 * Math.PI) * top, ym = (ya + yb) / 2, len = Math.hypot(zb - za, yb - ya);
      B.box(M.woodH, 2.8, 0.16, len + 0.05, 0, ym - 0.02, (za + zb) / 2, { rx: Math.atan2(yb - ya, za - zb), c: 0x8a3a26 });
      world.addBox(0, (za + zb) / 2, 2.8, Math.abs(zb - za) + 0.02, 0, -1.5, ym + 0.1);
      for (const s of [-1, 1]) {
        B.box(M.flat, 0.09, 0.09, len + 0.05, s * 1.35, ym + 0.95, (za + zb) / 2, { rx: Math.atan2(yb - ya, za - zb), c: RED });
        if (i % 2 === 0) { B.box(M.flat, 0.13, 1.15, 0.13, s * 1.35, ya - 0.05, za, { c: RED }); B.geo(M.flat, new THREE.SphereGeometry(0.1, 8, 6), [s * 1.35, ya + 1.18, za], [0, 0, 0], [1, 1.3, 1], INK); }
      }
    }
    for (const s of [-1, 1]) { world.addBox(s * 1.45, 24, 0.2, 24, 0, -1, 3.2); for (const z of [z0, z1]) { B.box(M.flat, 0.2, 1.3, 0.2, s * 1.35, world.height(0, z) - 0.1, z, { c: RED }); } }
  }
  // lily pads, shore rocks
  for (let i = 0; i < 22; i++) { const a = R() * 6.28, r = 3 + R() * 7, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r; if (Math.abs(x) < 2) continue; B.cyl(M.flat, 0.3 + R() * 0.25, 0.3, 0.02, x, -0.41, z, { c: R.pick([0x3a6a34, 0x4a7a3c]), seg: 9 }); if (R() < 0.35) B.geo(M.flat, new THREE.SphereGeometry(0.1, 6, 5), [x, -0.33, z], [0, 0, 0], [1, 0.7, 1], 0xf6c6d4); }
  const rocks = [];
  for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + R() * 0.2, r = POND.r + 0.3 + R() * 1.5, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r; if (Math.abs(x) < 2.4) continue; const s = 0.4 + R() * 0.8; rocks.push({ x, y: world.height(x, z) + s * 0.2, z, ry: R() * 6, s: [s, s * 0.7, s], c: R.pick([0x6c7068, 0x7c8078, 0x5c6460]) }); }
  // zen garden (west of the pond)
  {
    const gx = -27, gz = 22, gw = 15, gd = 12, y = world.height(gx, gz) + 0.02;
    B.box(M.raked, gw, 0.12, gd, gx, y - 0.04, gz, { c: 0xf0ebe0 });
    for (const [rx, rz, s] of [[-4, 2, 1.5], [-2.6, 3.2, 0.8], [3.5, -2.5, 1.2], [4.6, -1.6, 0.6], [0.5, 0.2, 0.9]]) {
      rocks.push({ x: gx + rx, y: y + s * 0.3, z: gz + rz, ry: R() * 6, s: [s, s * 0.85, s * 0.8], c: 0x62665e });
      B.cyl(M.flat, s * 1.25, s * 1.3, 0.05, gx + rx, y + 0.05, gz + rz, { c: 0x4a6a34, seg: 12 });
      world.addCyl(gx + rx, gz + rz, s * 0.8, y - 1, y + s);
    }
    for (const [wx, wz, ww, wd] of [[gx, gz - gd / 2 - 0.3, gw + 1.2, 0.5], [gx - gw / 2 - 0.3, gz, 0.5, gd + 1.2], [gx, gz + gd / 2 + 0.3, gw + 1.2, 0.5]]) {
      B.box(M.plaster, ww, 1.3, wd, wx, y - 0.2, wz, { c: 0xe6dec8, solid: true });
      B.box(M.kawara, ww + 0.3, 0.14, wd + 0.5, wx, y + 1.1, wz, { c: 0x56646a });
    }
    lantern(gx + 6.2, gz + 4.6, true, 0.9); lamp(gx + 6.2, y + 1.5, gz + 4.6, 10, 9);
  }
  // tea house east of the pond, houses of the hamlet
  const tea = house(22, 25, 7, 5.5, { ry: -0.25, roofC: 0x4e5c60, h: 2.6, roofH: 2.2 });
  lamp(20, tea.y + 1.8, 21, 18, 12);
  const farmW = house(-24, -6, 9, 6.5, { ry: 0.2, roof: M.thatch, roofC: 0xa08a58, roofH: 3.6, up: 0.2, over: 1.2 });
  const farmE = house(23, -10, 10, 7, { ry: -0.12, roof: M.thatch, roofC: 0x9a8454, roofH: 3.8, up: 0.2, over: 1.2 });
  const small = house(-30, -20, 6, 5, { ry: 0.5, roofC: 0x56646a, roofH: 2.2, h: 2.5 });
  { // tea house: a sunken hearth with its iron kettle, bowls on a tray, an alcove with a scroll and a flowering twig, a shelf of tea things, a low table
    const { P, fy } = tea, ry = -0.25;
    { const [ax, az] = P(-2.1, 0.3); B.box(M.woodH, 0.72, 0.05, 0.72, ax, fy, az, { ry, c: 0x2a1c14 }); B.box(M.flat, 0.54, 0.06, 0.54, ax, fy, az, { ry, c: 0x8a8478 }); B.box(M.glow, 0.3, 0.08, 0.3, ax, fy, az, { ry: ry + 0.7, c: 0xff7a30 });
      B.cyl(M.metal, 0.12, 0.15, 0.2, ax, fy + 0.08, az, { c: 0x26262a, seg: 9 }); B.cyl(M.metal, 0.04, 0.06, 0.05, ax, fy + 0.28, az, { c: 0x26262a, seg: 7 }); world.addBox(ax, az, 0.72, 0.72, ry, fy - 0.2, fy + 0.7); }
    for (const [lx, lz, c] of [[-2.1, 1.3, 0x6a2a3a], [-2.1, -0.7, 0x2a3a5a], [2.1, 1.8, 0x6a2a3a], [2.1, 0.2, 0x3a5a4a]]) { const [px, pz] = P(lx, lz); cushion(px, fy, pz, ry, c); }
    { const [px, pz] = P(-1.42, 0.3); B.box(M.woodH, 0.3, 0.03, 0.5, px, fy, pz, { ry, c: 0x3a1c14 }); for (const [k, c] of [[-0.14, 0x2a2a2a], [0.1, 0x7a5a48]]) { const [bx, bz] = P(-1.42, 0.3 + k); B.cyl(M.flat, 0.065, 0.04, 0.07, bx, fy + 0.03, bz, { c, seg: 9 }); } }
    { const [px, pz] = P(-2.98, -1.3); B.box(M.woodH, 0.6, 0.12, 1.8, px, fy, pz, { ry, c: 0x3a2618 }); const [sx, sz] = P(-3.27, -1.3); scroll(sx, fy + 0.75, sz, ry);
      const [vx, vz] = P(-2.95, -0.7); B.cyl(M.flat, 0.05, 0.07, 0.24, vx, fy + 0.12, vz, { c: 0x3a5a6a, seg: 8 }); B.cyl(M.wood, 0.012, 0.012, 0.6, vx, fy + 0.3, vz, { rz: 0.25, c: DARK, seg: 5 });
      for (const [dx, dy] of [[-0.06, 0.8], [0.02, 0.66], [-0.1, 0.56]]) B.geo(M.flat, new THREE.SphereGeometry(0.05, 6, 5), [vx + dx, fy + dy, vz], [0, 0, 0], 1, 0xffc9d6); }
    { const [px, pz] = P(2.98, -1.2); shelf(B, M, px, fy, pz, ry - Math.PI / 2, 1.6, 1.3, { goods: [0x2a2a2a, 0x7a5a48, 0xc8b070, 0x4a6a5a], c: 0x3a2618 }); }
    { const [px, pz] = P(2.1, 1.0), top = table(B, M, px, fy, pz, ry, { w: 0.9, d: 0.6, h: 0.3, c: 0x3a2618 }); B.cyl(M.flat, 0.09, 0.07, 0.13, px, top, pz, { c: 0x5a3a2a, seg: 9 }); for (const k of [-0.28, 0.26]) { const [bx, bz] = P(2.1 + k, 1.05); B.cyl(M.flat, 0.045, 0.03, 0.06, bx, top, bz, { c: 0xe8e0d0, seg: 8 }); } }
    { const [px, pz] = P(2.9, 2.15); andon(px, fy, pz, ry); }
  }
  // ---- the deer scarer (shishi-odoshi) in the tea garden: water from the spout fills the bamboo, it tips, empties into the basin,
  //      swings back and its tail knocks on the stone; see `update` for the movement and the sound -------------------------------
  const scarer = { x: 15.2, z: 22.6, ry: 0.5, t: 2.6, phase: 0, rest: -0.42, down: 0.34 };
  {
    const K = scarer, y = world.height(K.x, K.z), c = Math.cos(K.ry), sn = Math.sin(K.ry), P = (lx, lz) => [K.x + lx * c + lz * sn, K.z - lx * sn + lz * c];
    const BAM = 0xa8a24e, OLD = 0x847640, STONE = 0x6a6e66, Q = Math.PI / 2, mesh = (parts, m = M.flat) => { const o = new THREE.Mesh(merge(parts), m); o.castShadow = true; o.receiveShadow = true; return o; };
    const G = new THREE.Group(); G.position.set(K.x, y, K.z); G.rotation.y = K.ry; root.add(G);                    // local frame: +z from the knocking stone to the spout
    G.add(mesh([
      gCyl(0.03, 0.036, 0.72, OLD, [0.1, 0.3, 0], [0, 0, 0], 1, 7), gCyl(0.03, 0.036, 0.72, OLD, [-0.1, 0.3, 0], [0, 0, 0], 1, 7), gCyl(0.012, 0.012, 0.3, INK, [0, 0.5, 0], [0, 0, Q], 1, 5),        // two posts and the axle
      gCyl(0.045, 0.052, 1.2, BAM, [0, 0.5, 1.32], [0, 0, 0], 1, 8), gCyl(0.05, 0.05, 0.02, OLD, [0, 0.42, 1.32], [0, 0, 0], 1, 8), gCyl(0.05, 0.05, 0.02, OLD, [0, 0.8, 1.32], [0, 0, 0], 1, 8),      // the post of the spout
      gCyl(0.022, 0.022, 0.72, BAM, [0, 0.985, 0.98], [Q - 0.1, 0, 0], 1, 6),                                                                                                           // the spout
      gSph(0.24, STONE, [0, 0.09, -0.47], [1.15, 0.68, 0.9]),                                                                                                                           // the stone it knocks on
      ...[[0.42, 0.62, 0.2], [0.3, 1.08, 0.17], [-0.36, 1.0, 0.19], [-0.44, 0.58, 0.16], [0.02, 0.4, 0.13]].map(([lx, lz, r]) => gSph(r, STONE, [lx, r * 0.3, lz], [1.1, 0.7, 0.95])),        // the basin: a ring of stones
      gCyl(0.36, 0.36, 0.05, 0x14302e, [0, 0.03, 0.78], [0, 0, 0], 1, 12),                                                                                                               // and the water in it
    ]));
    const pivot = new THREE.Group(); pivot.position.set(0, 0.5, 0); pivot.rotation.x = K.rest; G.add(pivot);
    pivot.add(mesh([gCyl(0.047, 0.047, 1.2, BAM, [0, 0, 0.1], [Q, 0, 0], 1, 9), gCyl(0.036, 0.036, 0.012, INK, [0, 0, 0.701], [Q, 0, 0], 1, 9),                                           // the bamboo: open at the front,
      ...[-0.5, -0.22, 0.14, 0.48].map((lz) => gCyl(0.05, 0.05, 0.022, OLD, [0, 0, lz], [Q, 0, 0], 1, 9))]));                                                                            // closed at the tail, a ring at each node
    const wet = new THREE.MeshBasicMaterial({ color: 0xbcdce6, transparent: true, opacity: 0.6, depthWrite: false });
    const thread = new THREE.CylinderGeometry(1, 1, 1, 6); thread.translate(0, -0.5, 0);                           // hangs down from its origin
    K.trickle = new THREE.Mesh(thread, wet); K.trickle.position.set(0, 0.945, 0.63); G.add(K.trickle);            // the thread of water from the spout
    K.gush = new THREE.Mesh(thread, wet); K.gush.visible = false; G.add(K.gush);                                   // what the bamboo pours out
    K.pivot = pivot; K.y = y; [K.bx, K.bz] = P(0, 0.78);
    B.cyl(M.flat, 1.5, 1.56, 0.05, ...((q) => [q[0], y + 0.005, q[1]])(P(0, 0.4)), { c: 0x3c5a30, seg: 14 });      // a bed of moss
    { const [ax, az] = P(0, 0.2); world.addCyl(ax, az, 0.55, y - 1, y + 0.7); } { const [ax, az] = P(0, 1.32); world.addCyl(ax, az, 0.09, y - 1, y + 1.1); }
    { const [lx, lz] = P(-1.15, 1.2); lantern(lx, lz, true, 0.7); }
  }
  { // west farmhouse: the sunken hearth with its pot hook and a woman tending it, a clay stove, water jars, rice bales, a straw coat and hat on the wall, hoes, bedding and a chest
    const { P, fy } = farmW, ry = 0.2;
    { const [ax, az] = P(-2.1, 0.1); B.box(M.woodH, 1.25, 0.1, 1.25, ax, fy, az, { ry, c: 0x2a1c14 }); B.box(M.flat, 1.0, 0.11, 1.0, ax, fy, az, { ry, c: 0x8a8478 }); B.box(M.glow, 0.36, 0.15, 0.3, ax, fy, az, { ry: ry + 0.6, c: 0xff7a30 });
      B.cyl(M.wood, 0.02, 0.02, 2.1, ax, fy + 0.72, az, { c: DARK, seg: 5 }); B.box(M.wood, 0.34, 0.09, 0.04, ax, fy + 1.5, az, { ry, rz: 0.3, c: 0x4a3420 }); B.cyl(M.metal, 0.2, 0.15, 0.24, ax, fy + 0.5, az, { c: 0x26262a, seg: 10 });
      world.addBox(ax, az, 1.25, 1.25, ry, fy - 0.2, fy + 0.8); }
    { const [px, pz] = P(-2.1, 1.55); rug(B, M, px, fy, pz, ry, { w: 1.5, d: 0.75, c: 0xb8a868, border: 0x7a6a40 }); people.push(person(B, M, root, 'japanWoman', px, fy, pz, ry + Math.PI, { pose: kneel, over: { hat: null } })); }
    { const [px, pz] = P(-3.55, 0.1); rug(B, M, px, fy, pz, ry + Math.PI / 2, { w: 1.5, d: 0.75, c: 0xb8a868, border: 0x7a6a40 }); }
    { const [px, pz] = P(-3.45, -2.5); B.box(M.plaster, 1.4, 0.7, 0.8, px, fy, pz, { ry, c: 0x8a7460, solid: true }); const [gx, gz] = P(-3.75, -2.09); B.box(M.glow, 0.3, 0.22, 0.03, gx, fy + 0.08, gz, { ry, c: 0xff6a20 });
      const [ax, az] = P(-3.75, -2.5); B.cyl(M.metal, 0.24, 0.2, 0.2, ax, fy + 0.7, az, { c: 0x26262a, seg: 10 }); B.cyl(M.wood, 0.26, 0.26, 0.04, ax, fy + 0.9, az, { c: 0x6a4a30, seg: 10 }); const [bx, bz] = P(-3.1, -2.5); B.cyl(M.metal, 0.18, 0.15, 0.16, bx, fy + 0.7, bz, { c: 0x26262a, seg: 10 }); }
    { const [px, pz] = P(-1.5, -2.45); pots(B, M, px, fy, pz, { n: 2, s: 1.6, c: [0x6a4a38, 0x4a4a48] }); }
    for (const [lz, up] of [[2.05, 0], [2.67, 0], [2.36, 0.52]]) { const [px, pz] = P(-3.5, lz); lie(M.thatch, 0.3, 0.7, px, fy + up, pz, ry + Math.PI / 2, 0xc8b070); }
    { const [px, pz] = P(-3.5, 2.36); world.addBox(px, pz, 0.75, 1.25, ry, fy, fy + 1.1); }
    { const [px, pz] = P(-4.16, -0.95); B.geo(M.thatch, new THREE.ConeGeometry(0.42, 0.95, 8), [px, fy + 1.05, pz], [0, ry, 0], [0.4, 1, 1], 0xb8a060); B.geo(M.thatch, new THREE.ConeGeometry(0.34, 0.14, 10), [px, fy + 1.78, pz], [0, ry, -Math.PI / 2], 1, 0xc8b070); }
    for (const k of [0, 1]) { const [px, pz] = P(3.95 - k * 0.3, -2.8); B.cyl(M.wood, 0.022, 0.022, 1.45, px, fy, pz, { rx: -0.1, rz: 0.06 * (k ? 1 : -1), c: 0x6a4a30, seg: 5 }); B.box(M.metal, 0.16, 0.26, 0.03, px, fy + 1.3, pz + 0.04, { ry, rx: -0.5, c: 0x4a4a50 }); }
    { const [px, pz] = P(3.4, 1.4); bed(B, M, px, fy, pz, ry, { w: 0.9, l: 1.9, h: 0.2, head: 0, blanket: 0x3a4a6a }); }
    { const [px, pz] = P(3.75, -1.2); chest(B, M, px, fy, pz, ry + Math.PI / 2, { w: 1.2, h: 0.55, d: 0.5, c: 0x4a3020 }); }
    { const [px, pz] = P(2.75, -2.7); andon(px, fy, pz, ry); }
  }
  { // east farmhouse, a weaver's: the loom and the woman at it, baskets of yarn, dye jars, lengths of cloth on a pole, a spinning wheel; a shelf of cloth, a chest, a bed and a brazier
    const { P, fy } = farmE, ry = -0.12;
    { const [ax, az] = P(-3.3, -1.3), L = local(ax, az, ry);
      for (const k of [-1, 1]) { for (const lz of [-0.75, 0.75]) { const [px, pz] = L(k * 0.45, lz); B.box(M.wood, 0.07, lz < 0 ? 1.15 : 0.5, 0.07, px, fy, pz, { ry, c: 0x5a4028 }); } const [px, pz] = L(k * 0.45, 0); B.box(M.wood, 0.06, 0.06, 1.6, px, fy + 0.38, pz, { ry, c: 0x5a4028 }); }
      { const [px, pz] = L(0, -0.75); B.box(M.wood, 0.97, 0.1, 0.1, px, fy + 0.85, pz, { ry, c: 0x6a4a30 }); B.box(M.wood, 0.97, 0.06, 0.06, px, fy + 1.12, pz, { ry, c: 0x5a4028 }); }
      { const [px, pz] = L(0, 0.75); B.box(M.wood, 0.97, 0.1, 0.1, px, fy + 0.44, pz, { ry, c: 0x6a4a30 }); }
      { const [px, pz] = L(0, -0.1); B.box(M.cloth, 0.74, 0.012, 1.32, px, fy + 0.7, pz, { ry, rx: 0.3, c: 0xe8e0d0 }); const [hx, hz] = L(0, -0.25); B.box(M.wood, 0.86, 0.3, 0.03, hx, fy + 0.6, hz, { ry, c: 0x4a3420 }); }
      { const [px, pz] = L(0, 0.52); B.box(M.cloth, 0.74, 0.02, 0.4, px, fy + 0.51, pz, { ry, rx: 0.3, c: 0x2a3a6a }); }
      world.addBox(ax, az, 1.0, 1.6, ry, fy, fy + 0.95);
      const [wx, wz] = P(-3.3, -0.05); people.push(person(B, M, root, 'japanWoman', wx, fy, wz, ry + Math.PI, { pose: kneel, arms: [-1.0, -0.95], over: { hat: null, shirt: 0x5a6a5a, robe: 0x5a6a5a, sleeve: 0x5a6a5a } }));
    }
    for (const [lx, lz] of [[-2.2, 0.35], [-4.25, 0.6]]) { const [px, pz] = P(lx, lz); B.cyl(M.thatch, 0.24, 0.19, 0.18, px, fy, pz, { c: 0xa8905a, seg: 10 }); for (let k = 0; k < 3; k++) B.geo(M.flat, new THREE.SphereGeometry(0.085, 7, 5), [px + Math.cos(k * 2.1) * 0.1, fy + 0.2, pz + Math.sin(k * 2.1) * 0.1], [0, 0, 0], 1, [0xd8d0c0, 0x2a3a6a, 0x8a2a22][k]); }
    { const [px, pz] = P(-3.7, 2.2); pots(B, M, px, fy, pz, { n: 3, s: 1.5, c: [0x2a3a6a, 0x3a3050, 0x5a4a40] }); }
    { const [px, pz] = P(-2.9, -3.02); B.box(M.wood, 3.3, 0.05, 0.05, px, fy + 1.75, pz, { ry, c: DARK }); for (let k = 0; k < 3; k++) { const [cx, cz] = P(-4.0 + k * 1.05, -3.02); B.box(M.cloth, 0.8, 1.25 - k * 0.2, 0.02, cx, fy + 0.5 + k * 0.2, cz, { ry, c: [0x2a3a6a, 0xe8e0d0, 0x8a3a2a][k] }); } }
    { const [px, pz] = P(-1.8, 2.55); B.box(M.wood, 0.8, 0.06, 0.22, px, fy, pz, { ry, c: 0x5a4028 }); B.box(M.wood, 0.06, 0.5, 0.06, px, fy, pz, { ry, c: 0x5a4028 }); B.geo(M.wood, new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12), [px, fy + 0.45, pz], [Math.PI / 2, ry, 0], 1, 0x6a4a30); world.addCyl(px, pz, 0.35, fy, fy + 0.8); }
    { const [px, pz] = P(4.52, -2.0); shelf(B, M, px, fy, pz, ry - Math.PI / 2, 2.0, 1.4, { goods: [0x2a3a6a, 0xe8e0d0, 0x8a3a2a, 0xc8a84a], c: 0x4a3020 }); }
    { const [px, pz] = P(4.3, -0.25); chest(B, M, px, fy, pz, ry + Math.PI / 2, { w: 1.1, h: 0.55, d: 0.5, c: 0x4a3020 }); }
    { const [px, pz] = P(4.0, 1.95); bed(B, M, px, fy, pz, ry, { w: 0.9, l: 1.9, h: 0.2, head: 0, blanket: 0x7a3a3a }); }
    { const [px, pz] = P(3.1, -0.4); B.cyl(M.flat, 0.32, 0.24, 0.32, px, fy, pz, { c: 0x3a4a5a, seg: 10, solid: true }); B.cyl(M.glow, 0.24, 0.24, 0.03, px, fy + 0.3, pz, { c: 0xff7a30, seg: 10 }); }
    { const [px, pz] = P(2.85, 2.9); andon(px, fy, pz, ry); }
  }
  { // the small house: two beds on the mats, a go board between two cushions, a lamp, a scroll
    const { P, fy } = small, ry = 0.5;
    for (const [lx, c] of [[-2.25, 0x4a3a5a], [-1.2, 0x3a5a4a]]) { const [px, pz] = P(lx, -1.2); bed(B, M, px, fy, pz, ry, { w: 0.9, l: 1.9, h: 0.18, head: 0, blanket: c }); }
    { const [px, pz] = P(-1.6, 1.3), top = table(B, M, px, fy, pz, ry, { w: 0.46, d: 0.44, h: 0.26, c: 0xc8a860 }); for (let k = 0; k < 9; k++) B.cyl(M.flat, 0.02, 0.02, 0.012, px + ((k * 5) % 7 - 3) * 0.05, top, pz + ((k * 3) % 7 - 3) * 0.05, { c: k % 2 ? 0xf0ece0 : 0x15151a, seg: 6 }); }
    for (const [lx, c] of [[-2.3, 0x6a2a3a], [-0.9, 0x2a3a5a]]) { const [px, pz] = P(lx, 1.3); cushion(px, fy, pz, ry, c); }
    { const [px, pz] = P(-2.5, 2.05); andon(px, fy, pz, ry); const [sx, sz] = P(-2.77, 0.2); scroll(sx, fy + 0.75, sz, ry); }
  }
  lamp(-19, 2.2, -1.5, 14, 11); lamp(17.5, 2.2, -5, 14, 11);
  lantern(-4.2, 9, true); lantern(4.2, 9, true); lantern(-4.2, 40, true); lantern(4.2, 40, false);
  { // the well on the hamlet green under its little roof, and a woman drawing water
    const x = -4.5, z = -9, y = world.height(x, z);
    B.cyl(M.stone, 0.8, 0.86, 0.85, x, y - 0.15, z, { c: 0x8c8a80, seg: 10, solid: true }); B.cyl(M.flat, 0.66, 0.66, 0.02, x, y + 0.45, z, { c: 0x10201e, seg: 10 });
    for (const s of [-1, 1]) { B.box(M.wood, 0.14, 2.6, 0.14, x + s * 1.05, y - 0.2, z, { c: DARK }); world.addCyl(x + s * 1.05, z, 0.1, y - 1, y + 2.4); }
    B.box(M.wood, 2.4, 0.12, 0.12, x, y + 2.15, z, { c: DARK }); B.geo(M.thatch, curvedRoofGeo(3.2, 2.4, 0.8, { up: 0.1, tile: M.thatch.userData.tile, ridge: 0.6 }), [x, y + 2.4, z], [0, 0, 0], 1, 0xa08a58);
    B.geo(M.wood, new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), [x, y + 2.0, z], [0, 0, Math.PI / 2], 1, 0x4a3420); B.cyl(M.flat, 0.015, 0.015, 1.25, x, y + 0.8, z + 0.13, { c: 0xd8c890, seg: 5 });
    B.cyl(M.wood, 0.16, 0.13, 0.26, x, y + 0.62, z + 0.13, { c: 0x6a4a30, seg: 9 }); B.cyl(M.wood, 0.17, 0.14, 0.28, x + 1.0, world.height(x + 1, z + 1.3), z + 1.3, { c: 0x6a4a30, seg: 9 });
    people.push(person(B, M, root, 'japanWoman', x, world.height(x, z + 1.3), z + 1.3, Math.PI, { arms: [-1.75, -1.3], over: { hat: null } }));
  }
  { // the rice granary on stilts: crawl under it, or climb the ladder into the loft, whose slit looks toward the shrine steps
    const x = -11, z = 0, y = world.height(x, z), top = deck(B, M, x, y, z, 0, { w: 3.8, d: 4.4, h: 1.45, c: 0x6a4a30, ladder: 's' }).top;
    room(B, M, x, top, z - 0.65, { w: 3.6, d: 3.0, h: 2.0, t: 0.18, mat: M.woodH, c: 0x7a5a3a, base: 0.02, floor: false, ceil: false, doors: [{ side: 's', at: 0, w: 1.1, h: 1.85 }], wins: [{ side: 'n', at: 0, w: 2.0, y: 1.2, h: 0.5 }, { side: 'e', at: 0, w: 1.4, y: 1.2, h: 0.5 }] });
    B.geo(M.thatch, curvedRoofGeo(5.4, 5.8, 2.0, { up: 0.15, tile: M.thatch.userData.tile, ridge: 0.4 }), [x, top + 2.0, z - 0.3], [0, 0, 0], 1, 0xa08a58);
    for (const up of [0, 0.52]) lie(M.thatch, 0.3, 0.7, x - 1.25, top + up, z - 1.25 + up * 0.4, 0, 0xc8b070); world.addBox(x - 1.25, z - 1.15, 0.7, 0.95, 0, top, top + 1.1);
  }
  { // the cow shed: a thatched roof on posts, plank walls waist-high on three sides, the ox at its trough, hay in the other half
    const x = 11.5, z = -2.5, y = world.height(x, z), W = 0x6a5038, C = 0x2a2220;
    for (const [dx, dz] of [[-2.5, -1.7], [0, -1.7], [2.5, -1.7], [-2.5, 1.7], [0, 1.7], [2.5, 1.7]]) { B.box(M.wood, 0.18, dz < 0 ? 2.3 : 2.75, 0.18, x + dx, y - 0.2, z + dz, { c: DARK }); if (dz > 0) world.addCyl(x + dx, z + dz, 0.12, y - 1, y + 2.4); }
    B.box(M.woodH, 5.0, 1.2, 0.12, x, y - 0.1, z - 1.7, { c: W, solid: true }); for (const s of [-1, 1]) B.box(M.woodH, 0.12, 1.2, 3.4, x + s * 2.5, y - 0.1, z, { c: W, solid: true }); B.box(M.woodH, 0.1, 1.0, 2.2, x, y - 0.1, z - 0.6, { c: W, solid: true });
    B.box(M.thatch, 6.2, 0.3, 4.8, x, y + 2.25, z, { rx: -0.13, c: 0xa08a58 });
    const ox = [gCap(0.4, 0.95, C, [0, 1.0, 0], [Math.PI / 2, 0, 0], [1, 1, 1.05]), gBox(0.34, 0.36, 0.5, C, [0, 1.12, 0.98], [0.25, 0, 0]), gBox(0.25, 0.2, 0.18, 0x4a3a34, [0, 1.0, 1.26], [0.25, 0, 0]), gCone(0.09, 0.8, C, [0, 0.85, -0.98], [-2.9, 0, 0])];
    for (const k of [-1, 1]) { ox.push(gCone(0.04, 0.32, 0xe0d8c0, [k * 0.24, 1.36, 0.9], [0, 0, k * -1.1], 1, 6), gBox(0.1, 0.07, 0.03, C, [k * 0.2, 1.26, 0.8])); for (const lz of [0.6, -0.62]) ox.push(gCap(0.085, 0.55, C, [k * 0.22, 0.38, lz])); }
    animal(B, M, root, 'ox', merge(ox), x + 1.3, y, z - 0.35, 0, { coat: C, box: [0.8, 2.1, 1.5, 0.1] });
    B.box(M.woodH, 1.5, 0.45, 0.4, x + 1.3, y, z + 1.25, { c: 0x5a4028, solid: true }); B.box(M.thatch, 1.3, 0.1, 0.28, x + 1.3, y + 0.4, z + 1.25, { c: 0xc8b060 });
    B.geo(M.thatch, new THREE.SphereGeometry(1, 9, 6), [x - 1.3, y + 0.1, z - 0.7], [0, 0, 0], [1.0, 0.6, 0.85], 0xc8b060); world.addBox(x - 1.3, z - 0.8, 1.8, 1.4, 0, y - 0.2, y + 0.45);
    B.cyl(M.wood, 0.02, 0.02, 1.6, x - 2.3, y, z + 0.6, { rz: -0.08, c: 0x6a4a30, seg: 5 });
  }
  // straw stacks on the green, firewood against the farmhouses, two vegetable plots behind low bamboo fences
  for (const [x, z, r] of [[6, -14, 1.25], [-15.5, -13, 1.1], [17.6, 8.2, 1.2]]) haystack(B, M, x, world.height(x, z), z, { r, h: 2.3, c: 0xc8b060 });
  { const [px, pz] = farmW.P(6.0, 0.3); woodpile(B, M, px, world.height(px, pz), pz, 0.2 + Math.PI / 2, { w: 2.6, h: 1.15 }); const [qx, qz] = farmE.P(-6.5, -0.5); woodpile(B, M, qx, world.height(qx, qz), qz, -0.12 + Math.PI / 2, { w: 2.4, h: 1.0 }); }
  for (const [x, z, sx] of [[-18.5, 4.5, 1], [13, 5.2, -1]]) {
    for (let r = 0; r < 4; r++) { const zz = z - 1.5 + r, y = world.height(x, zz); B.box(M.ground, 5.4, 0.3, 0.5, x, y - 0.16, zz, { c: 0x4a3a2a }); for (let k = 0; k < 8; k++) B.geo(M.flat, new THREE.SphereGeometry(0.15, 6, 4), [x - 2.4 + k * 0.68, world.height(x - 2.4 + k * 0.68, zz) + 0.2, zz], [0, k + r, 0], [1, r % 2 ? 0.75 : 1.3, 1], r % 2 ? 0x5a8a3a : 0x3a6a30); }
    fence(B, M, x + sx * 3.1, z - 2.3, x + sx * 3.1, z + 2.3, { h: 0.85, rails: 2, c: 0xa8a860 }); fence(B, M, x - 3.1, z + 2.3, x + 3.1, z + 2.3, { h: 0.85, rails: 2, c: 0xa8a860, gap: 2.1 });
  }
  { // a fishing jetty on the west shore of the pond, a flat boat moored alongside, an angler at its end
    const ry = 2.156, P = deck(B, M, -8.47, -1.4, 28.95, ry, { w: 1.7, d: 7, h: 1.55, c: 0x7a5a3a }), H = 0x4a3222;
    { const [bx, bz] = P(1.5, 1.3); B.box(M.woodH, 1.2, 0.5, 3.8, bx, -0.62, bz, { ry, c: H }); world.addBox(bx, bz, 1.2, 3.8, ry, -1.2, -0.12); const [qx, qz] = P(1.3, 1.6); lie(M.wood, 0.03, 3.4, qx, -0.12, qz, ry, 0x8a6a44, 6); }
    for (const k of [-1, 1]) { const [sx, sz] = P(1.5 + k * 0.62, 1.3); B.box(M.woodH, 0.08, 0.34, 3.9, sx, -0.3, sz, { ry, c: H }); const [ex, ez] = P(1.5, 1.3 + k * 2.05); B.box(M.woodH, 1.1, 0.3, 0.5, ex, -0.3, ez, { ry, rx: k * -0.5, c: H }); }
    { const [ax, az] = P(0, 3.28), f = person(B, M, root, 'japanMan', ax, P.top - 0.45, az, ry, { pose: 'sit', seat: 0.45, over: { hat: 'kasa' } }); people.push(f);
      f.armR.add(new THREE.Mesh(merge([gCyl(0.008, 0.016, 2.6, 0xb8a060, [0, -0.62, 1.25], [Math.PI / 2 - 0.1, 0, 0], 1, 5), gCyl(0.004, 0.004, 1.3, 0xe8e0d0, [0, -1.32, 2.2], [0.5, 0, 0], 1, 4)]), M.flat));
      const [kx, kz] = P(-0.5, 2.7); B.cyl(M.thatch, 0.16, 0.13, 0.22, kx, P.top, kz, { c: 0xa8905a, seg: 9 }); }
  }

  // ---- C: steps and shrine precinct ---------------------------------------------------------
  for (let i = 0; i < 10; i++) { B.box(M.stone, 8.4, 0.3, 0.92, 0, 0.0 + i * 0.3, -24 - i * 0.9, { c: 0x9c9a90, solid: true }); }
  for (const s of [-1, 1]) { B.box(M.stone, 0.7, 4.2, 9.6, s * 4.6, -0.6, -28.2, { c: 0x8c8a80, solid: true }); B.box(M.stone, 30, 4.4, 1.2, s * 19.8, -1.0, -28.6, { c: 0x8a887e, solid: true }); lantern(s * 5.6, -22.2, true, 1.15); }
  torii(0, -21.2, 0, 1.5);
  lamp(0, 3.4, -22.5, 20, 14);
  // main hall
  {
    const x = 0, z = -56, y = 3;
    B.box(M.stone, 16, 1.0, 12.5, x, y, z, { c: 0x9a988e, solid: true });
    for (let i = 0; i < 3; i++) B.box(M.stone, 6, 0.33, 0.6, x, y + i * 0.33, z + 6.25 + (2 - i) * 0.6 + 0.3, { c: 0x9c9a90, solid: true });
    steps(B, M, x + 2.6, z - 6.25, Math.PI, y + 1, 2, { w: 3, rise: 0.333, run: 0.6, c: 0x9c9a90 });                 // down from the back door
    room(B, M, x, y + 1, z - 0.6, { w: 11.5, d: 8, h: 3.6, t: 0.3, mat: M.plaster, c: 0xece4d0, base: 0.04, doors: [{ side: 's', at: 0, w: 2.3, h: 2.7 }, { side: 'n', at: 2.6, w: 1.6, h: 2.2 }], floor: { mat: M.woodH, c: 0x6a4a30 }, ceil: { mat: M.woodH, c: 0x4a2a22 } });
    {                                             // inside: altar with the sacred mirror, drums, offering tables, two tall screens that make side aisles; a back door beside the altar
      const fy = y + 1.06, zb = z - 0.6 - 3.2;
      B.box(M.woodH, 3.6, 0.9, 1.0, x, fy, zb, { c: 0x7a1c16, solid: true }); B.box(M.woodH, 2.2, 0.5, 0.7, x, fy + 0.9, zb, { c: 0x8a2018 });
      B.cyl(M.metal, 0.46, 0.46, 0.05, x, fy + 1.55, zb + 0.1, { rx: Math.PI / 2, c: 0xe0c060, seg: 18 }); B.box(M.wood, 0.9, 0.12, 0.3, x, fy + 1.4, zb + 0.1, { c: 0x2a1a12 });
      for (const sx of [-1, 1]) {
        B.cyl(M.wood, 0.5, 0.5, 0.7, x + sx * 4.6, fy + 0.5, zb + 0.4, { rz: Math.PI / 2, c: 0x8a3a22, seg: 12 }); B.box(M.wood, 0.9, 0.5, 0.7, x + sx * 4.6, fy, zb + 0.4, { c: 0x2a1a12, solid: true });
        B.cyl(M.flat, 0.04, 0.04, 0.3, x + sx * 1.3, fy + 0.9, zb + 0.2, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.05, 5, 4), [x + sx * 1.3, fy + 1.26, zb + 0.2], [0, 0, 0], [1, 1.7, 1], 0xffb040);
        B.box(M.shoji, 0.05, 1.7, 2.2, x + sx * 5.4, fy, z + 0.4, {});
        byobu(x + sx * 2.9, fy, z + 0.4, Math.PI / 2, 4, 1.9);
        const top = table(B, M, x + sx * 0.8, fy, zb + 1.15, 0, { w: 0.6, d: 0.5, h: 0.5, c: 0xd8c8a0 }); B.cyl(M.flat, 0.05, 0.06, 0.17, x + sx * 0.95, top, zb + 1.15, { c: 0xf0ece0, seg: 8 });
        for (const [r, up] of [[0.11, 0], [0.08, 0.1]]) B.geo(M.flat, new THREE.SphereGeometry(r, 8, 6), [x + sx * 0.68, top + 0.06 + up, zb + 1.15], [0, 0, 0], [1, 0.7, 1], 0xf6f2e8);
      }
      for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) world.addCyl(x - 6.4 + i * 2.56, z - 0.6 + sz * 4.9, 0.24, y, y + 4.7);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) world.addCyl(x + sx * 6.4, z - 3.2 + i * 2.5, 0.24, y, y + 4.7);
    }
    for (let i = 0; i < 6; i++) for (const sz of [-1, 1]) B.cyl(M.flat, 0.2, 0.22, 3.7, x - 6.4 + i * 2.56, y + 1, z - 0.6 + sz * 4.9, { c: RED, seg: 10 });
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) B.cyl(M.flat, 0.2, 0.22, 3.7, x + sx * 6.4, y + 1, z - 3.2 + i * 2.5, { c: RED, seg: 10 });
    for (let i = 0; i < 5; i++) if (i !== 2) B.box(M.shoji, 2.0, 2.6, 0.08, x - 4.6 + i * 2.3, y + 1.1, z + 3.46, {});
    B.box(M.woodH, 14.4, 0.3, 11.4, x, y + 4.6, z - 0.6, { c: RED });
    B.geo(M.kawara, curvedRoofGeo(18.5, 15.5, 4.4, { up: 1.25, tile: 1.6, ridge: 0.5, curve: 2.1 }), [x, y + 4.9, z - 0.6], [0, 0, 0], 1, 0x4a5a60);
    B.box(M.flat, 10.4, 0.4, 0.5, x, y + 9.25, z - 0.6, { c: 0x23292c });
    for (const sx of [-1, 1]) B.geo(M.metal, new THREE.ConeGeometry(0.22, 0.9, 6), [x + sx * 5.0, y + 9.9, z - 0.6], [0, 0, sx * -0.5], 1, 0xd9b23a);
    // offering box, rope with paper streamers
    B.box(M.woodH, 2.2, 0.8, 0.9, x - 2.56, y + 1, z + 5.3, { c: 0x4a3222, solid: true });
    B.cyl(M.flat, 0.09, 0.09, 6.2, x, y + 4.15, z + 4.5, { rz: Math.PI / 2, c: 0xd8c890, seg: 6 });
    for (let i = 0; i < 5; i++) B.box(M.cloth, 0.22, 0.5, 0.01, x - 2.4 + i * 1.2, y + 3.55, z + 4.5, { c: 0xffffff });
    lamp(x - 3, y + 2.6, z + 5.5, 24, 16); lamp(x + 3, y + 2.6, z + 5.5, 24, 16);
    for (const sx of [-1, 1]) { lantern(sx * 5.5, -44, true, 1.2); lantern(sx * 5.5, -36, true, 1.0); }
  }
  // five-storey pagoda against the sunset: the ground floor can be entered and, up a ladder through a hatch, the second storey with its window slits
  {
    const x = -22, z = -50; let y = 3, w = 6.2;
    B.box(M.stone, 8.2, 0.8, 8.2, x, y, z, { c: 0x9a988e, solid: true }); y += 0.8;
    const HX0 = -2.3, HX1 = -0.9, HZ0 = 0.5, HZ1 = 1.8;                 // the hatch, measured from the middle
    const slab = (half, y0, y1, c) => { for (const [ax, bx, az, bz] of [[-half, HX0, -half, half], [HX1, half, -half, half], [HX0, HX1, -half, HZ0], [HX0, HX1, HZ1, half]]) B.box(M.woodH, bx - ax, y1 - y0, bz - az, x + (ax + bx) / 2, y0, z + (az + bz) / 2, { c, solid: true }); };
    const holed = (g, r) => {                                           // a roof without its middle, where the storey above stands in it
      const src = g.index ? g.toNonIndexed() : g, P = src.attributes.position, keep = [], out = new THREE.BufferGeometry();
      for (let i = 0; i < P.count; i += 3) { let inside = true; for (let j = i; j < i + 3; j++) if (Math.max(Math.abs(P.getX(j)), Math.abs(P.getZ(j))) > r) inside = false; if (!inside) keep.push(i, i + 1, i + 2); }
      for (const k of Object.keys(src.attributes)) { const a = src.attributes[k], n = a.itemSize, arr = new Float32Array(keep.length * n); keep.forEach((v, q) => { for (let j = 0; j < n; j++) arr[q * n + j] = a.array[v * n + j]; }); out.setAttribute(k, new THREE.BufferAttribute(arr, n)); }
      return out;
    };
    for (let i = 0; i < 5; i++) {
      if (i === 0) {
        room(B, M, x, y, z, { w, d: w, h: 2.1, t: 0.3, mat: M.plaster, c: 0xece4d0, base: 0.05, doors: [{ side: 's', at: 0, w: 1.8, h: 1.95 }, { side: 'e', at: 0, w: 1.8, h: 1.95 }], floor: { mat: M.woodH, c: 0x5a4030 }, ceil: false });
        B.cyl(M.flat, 0.3, 0.3, 2.1, x, y, z, { c: RED, seg: 10, solid: true });
        steps(B, M, x, z + 4.1, 0, y, 2, { w: 2.4, rise: 0.4, run: 0.5, c: 0x9c9a90 }); steps(B, M, x + 4.1, z, Math.PI / 2, y, 2, { w: 2.4, rise: 0.4, run: 0.5, c: 0x9c9a90 });
        B.box(M.woodH, 1.2, 0.6, 0.5, x - 1.6, y + 0.06, z - 2.2, { c: 0x7a1c16, solid: true }); B.geo(M.metal, new THREE.SphereGeometry(0.22, 8, 6), [x - 1.6, y + 0.9, z - 2.2], [0, 0, 0], [1, 1.2, 1], 0xd9b23a);
        slab(w / 2, y + 2.1, y + 2.3, 0x3a2a20); slab(2.6, y + 2.3, y + 2.95, 0x9a7a50); ladder(B, M, x - 1.6, z + HZ0, 0, 1, y + 0.06, y + 2.95);
      } else if (i === 1) {                      // the upper room: slits on all four sides, the pillar passing through, arrows and a lamp left by the watch
        room(B, M, x, y, z, { w, d: w, h: 2.1, t: 0.25, mat: M.plaster, c: 0xece4d0, base: 0.02, floor: false, ceil: { mat: M.woodH, c: 0x3a2a20 }, wins: ['n', 's', 'e', 'w'].map((side) => ({ side, at: 0, w: 2.4, y: 1.2, h: 0.55 })) });
        B.cyl(M.flat, 0.3, 0.3, 2.1, x, y, z, { c: RED, seg: 10, solid: true });
        shelf(B, M, x + 1.1, y, z - 2.1, 0, 1.6, 0.9, { goods: [0xc8b070, 0x8a1c1c, 0x2a3a5a], c: 0x3a2618 }); chest(B, M, x + 2.0, y, z + 0.6, Math.PI / 2, { w: 0.9, h: 0.5, d: 0.45, c: 0x4a3020 });
        for (let k = 0; k < 6; k++) B.cyl(M.wood, 0.012, 0.012, 0.85, x + 1.95 + (k % 3) * 0.06, y, z - 0.75 + k * 0.05, { rz: -0.12, c: 0xc8b890, seg: 4 });
        cushion(x + 1.2, y, z + 1.6, 0.3, 0x2a3a5a); andon(x + 2.0, y, z + 1.9);
      } else B.box(M.plaster, w, 2.1, w, x, y, z, { c: 0xece4d0 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(M.flat, 0.22, 2.1, 0.22, x + sx * w / 2, y, z + sz * w / 2, { c: RED });
      if (i > 1) B.box(M.flat, w + 0.15, 0.2, w + 0.15, x, y + 1.9, z, { c: RED });
      else for (const s of [-1, 1]) { B.box(M.flat, w + 0.15, 0.2, 0.3, x, y + 1.9, z + s * w / 2, { c: RED }); B.box(M.flat, 0.3, 0.2, w + 0.15, x + s * w / 2, y + 1.9, z, { c: RED }); }
      for (const s of [-1, 1]) { if (i === 1 || (i === 0 && s === 1)) continue; B.box(M.shoji, w * 0.34, 1.3, 0.06, x, y + 0.35, z + s * (w / 2 + 0.03), {}); }
      const tiles = curvedRoofGeo(w + 3.4, w + 3.4, 1.25, { up: 0.75, tile: 1.6, ridge: 0.02, curve: 1.9, nt: i ? 7 : 14 });
      B.geo(M.kawara, i ? tiles : holed(tiles, 2.5), [x, y + 2.1, z], [0, 0, 0], 1, 0x48585e);
      y += 2.95; w *= 0.84;
    }
    B.cyl(M.metal, 0.07, 0.1, 3.6, x, y - 0.4, z, { c: 0xd9b23a, seg: 6 });
    for (let i = 0; i < 6; i++) B.cyl(M.metal, 0.34 - i * 0.035, 0.34 - i * 0.035, 0.06, x, y + 0.5 + i * 0.38, z, { c: 0xd9b23a, seg: 10 });
  }
  const extraFoes = [], extraPicks = [[-20.7, -48.7, 7.35]];             // one rice cake waits in the upper room of the pagoda
  { // the shrine's storehouse (kura), white with a heavy roof
    const x = 27.5, z = -50, y = 3;
    room(B, M, x, y, z, { w: 6, d: 5, h: 3.2, t: 0.4, mat: M.plaster, c: 0xf0ece0, base: 0.4, doors: [{ side: 'w', at: 0, w: 1.7, h: 2.2 }], floor: { mat: M.woodH, c: 0x5a4030 }, ceil: { mat: M.woodH, c: 0x3a2a20 } });
    B.geo(M.kawara, curvedRoofGeo(8.2, 7.2, 2.3, { up: 0.5, tile: 1.6, ridge: 0.5 }), [x, y + 3.4, z], [0, 0, 0], 1, 0x48585e);
    B.box(M.woodH, 0.14, 2.2, 1.6, x - 3.3, y, z - 1.7, { c: 0x2a2018 });                           // the heavy door, slid open
    shelf(B, M, x + 2.3, y + 0.06, z, -Math.PI / 2, 3.6, 2.2, { goods: [0x8a1c1c, 0x1a1a1e, 0xd9b23a] }); shelf(B, M, x - 0.4, y + 0.06, z - 1.85, 0, 3, 2.0, { goods: [0xc8b070, 0x5a3a2a] });
    for (const [bx, bz] of [[x - 1.6, z + 1.5], [x - 0.6, z + 1.6], [x - 1.1, z + 1.55]]) B.cyl(M.thatch, 0.3, 0.3, 0.7, bx, y + 0.36 + (bx === x - 1.1 ? 0.55 : 0), bz, { rz: Math.PI / 2, c: 0xc8b070, seg: 10 });
    world.addBox(x - 1.1, z + 1.55, 1.9, 0.7, 0, y, y + 1.3);
    extraFoes.push(['ronin', x - 0.6, z - 0.2, { y: 3.6, patrol: false, yaw: -1.57 }]); extraPicks.push([x + 0.6, z + 1.4, 3.6]);
  }
  { // bell tower: four posts, a great bronze bell
    const x = -17, z = -66, y = 3;
    B.box(M.stone, 4.6, 0.4, 4.6, x, y - 0.02, z, { c: 0x9a988e, solid: true });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B.cyl(M.flat, 0.18, 0.22, 3.8, x + sx * 1.6, y + 0.38, z + sz * 1.6, { c: RED, seg: 10 }); world.addCyl(x + sx * 1.6, z + sz * 1.6, 0.26, y, y + 4.2); }
    B.geo(M.kawara, curvedRoofGeo(6.4, 6.4, 2.0, { up: 0.7, tile: 1.6, ridge: 0.3 }), [x, y + 4.2, z], [0, 0, 0], 1, 0x48585e);
    B.cyl(M.metal, 0.5, 0.62, 1.2, x, y + 2.2, z, { c: 0x4a6a5a, seg: 14 }); B.cyl(M.metal, 0.05, 0.05, 0.8, x, y + 3.4, z, { c: 0x2a2a2e, seg: 5 });
    B.cyl(M.wood, 0.09, 0.09, 2.0, x + 1.3, y + 2.7, z, { rz: Math.PI / 2, c: 0x6a4a30, seg: 6 });
    extraFoes.push(['ninja', x + 0.3, z + 2.6, { y: 3.6, ambush: 10 }], ['ninja', -20.4, -48, { y: 4.2, ambush: 8 }]);
  }
  // sacred tree with rope, basin
  B.cyl(M.wood, 0.7, 0.95, 6, 20, 3, -44, { c: 0x4a3828, solid: true, seg: 9 });
  B.cyl(M.flat, 0.9, 0.9, 0.16, 20, 4.4, -44, { c: 0xd8c890, seg: 10 });
  for (let i = 0; i < 6; i++) B.box(M.cloth, 0.2, 0.45, 0.01, 20 + Math.cos(i * 1.05) * 0.93, 3.9, -44 + Math.sin(i * 1.05) * 0.93, { ry: -i * 1.05 + Math.PI / 2, c: 0xffffff });
  { // the purification pavilion with its stone basin and ladles, at the head of the steps
    const x = -10.5, z = -33.8, y = 3;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B.cyl(M.flat, 0.1, 0.12, 2.5, x + sx * 1.4, y, z + sz * 1.0, { c: RED, seg: 8 }); world.addCyl(x + sx * 1.4, z + sz * 1.0, 0.14, y, y + 2.5); }
    B.box(M.woodH, 3.2, 0.12, 2.4, x, y + 2.42, z, { c: 0x3a2a20 }); B.geo(M.kawara, curvedRoofGeo(4.6, 3.8, 1.2, { up: 0.45, tile: 1.6, ridge: 0.5 }), [x, y + 2.54, z], [0, 0, 0], 1, 0x48585e);
    B.box(M.stone, 1.8, 0.75, 0.9, x, y, z, { c: 0x7c8078, solid: true }); B.box(M.flat, 1.5, 0.02, 0.6, x, y + 0.74, z, { c: 0x16302c });
    B.cyl(M.flat, 0.03, 0.03, 0.9, x + 0.6, y + 0.75, z - 0.3, { rz: 0.5, c: 0xa8b070, seg: 6 });
    for (const k of [-1, 0]) { B.cyl(M.wood, 0.012, 0.012, 0.5, x + k * 0.45 - 0.1, y + 0.55, z + 0.36, { rz: Math.PI / 2, c: 0xb8a060, seg: 5 }); B.cyl(M.wood, 0.05, 0.05, 0.07, x + k * 0.45 - 0.36, y + 0.76, z + 0.36, { c: 0xb8a060, seg: 7 }); }
  }
  { // a rack of offering casks wrapped in straw: cover on the other side of the steps
    const x = 11, z = -34, y = 3; B.box(M.woodH, 3.7, 0.12, 0.8, x, y, z, { c: 0x4a3222 });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { const cx = x + (i - 2) * 0.68, cy = y + 0.12 + r * 0.62; lie(M.thatch, 0.3, 0.62, cx, cy, z, 0, 0xd8caa0, 12); for (const k of [-1, 1]) B.geo(M.flat, new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), [cx, cy + 0.3, z + k * 0.315], [Math.PI / 2, 0, 0], 1, (i + r) % 2 ? 0x8a1c1c : 0x1c2a5a); }
    for (const s of [-1, 1]) B.box(M.wood, 0.1, 1.5, 0.7, x + s * 1.82, y, z, { c: 0x4a3222 }); world.addBox(x, z, 3.75, 0.8, 0, y, y + 1.4);
  }
  { // the inner sanctuary behind the hall: a small shrine of plain wood on a stone base, forked finials on its thatched roof; inside, a sword on its stand and a paper wand
    const x = 0, z = -70, y = 3, fy = y + 1.2, W = 0x8a6a44;
    B.box(M.stone, 7.6, 1.2, 6.4, x, y, z, { c: 0x9a988e, solid: true }); steps(B, M, x, z + 3.2, 0, fy, 3, { w: 2.6, rise: 0.3, run: 0.5, c: 0x9c9a90 });
    room(B, M, x, fy, z - 0.5, { w: 4.4, d: 3.6, h: 2.5, t: 0.25, mat: M.woodH, c: 0xb89a6a, base: 0.04, doors: [{ side: 's', at: 0, w: 1.6, h: 2.1 }], floor: { mat: M.woodH, c: 0x7a5a3a }, ceil: { mat: M.woodH, c: 0x5a4030 } });
    B.geo(M.thatch, curvedRoofGeo(6.4, 5.6, 2.0, { up: 0.15, tile: M.thatch.userData.tile, ridge: 0.7 }), [x, fy + 2.7, z - 0.5], [0, 0, 0], 1, 0x6a5a40); B.box(M.woodH, 4.8, 0.2, 0.3, x, fy + 4.68, z - 0.5, { c: DARK });
    for (let i = 0; i < 5; i++) lie(M.wood, 0.11, 0.9, x - 1.6 + i * 0.8, fy + 4.86, z - 0.5, 0, W, 8);
    for (const sx of [-1, 1]) for (const k of [-1, 1]) B.box(M.wood, 0.1, 2.0, 0.14, x + sx * 2.35, fy + 4.0, z - 0.5, { rx: k * 0.62, c: W });
    for (const sx of [-1, 1]) {                    // red rails round the base
      B.box(M.flat, 0.1, 0.1, 6.3, x + sx * 3.7, fy + 0.85, z, { c: RED }); for (let i = 0; i < 4; i++) B.box(M.flat, 0.12, 0.95, 0.12, x + sx * 3.7, fy, z - 3.1 + i * 2.07, { c: RED }); world.addBox(x + sx * 3.7, z, 0.14, 6.3, 0, fy, fy + 0.95);
      B.box(M.flat, 2.3, 0.1, 0.1, x + sx * 2.55, fy + 0.85, z + 3.1, { c: RED }); B.box(M.flat, 0.12, 0.95, 0.12, x + sx * 1.4, fy, z + 3.1, { c: RED }); world.addBox(x + sx * 2.55, z + 3.1, 2.3, 0.14, 0, fy, fy + 0.95);
      lantern(x + sx * 4.8, z + 4.6, true, 0.9);
    }
    B.cyl(M.flat, 0.07, 0.07, 2.4, x, fy + 2.25, z + 1.36, { rz: Math.PI / 2, c: 0xd8c890, seg: 6 }); for (let i = 0; i < 3; i++) B.box(M.cloth, 0.2, 0.4, 0.01, x - 0.7 + i * 0.7, fy + 1.8, z + 1.36, { c: 0xffffff });
    B.box(M.woodH, 1.4, 0.7, 0.6, x, fy + 0.06, z - 1.85, { c: W, solid: true }); for (const k of [-1, 1]) B.box(M.wood, 0.06, 0.2, 0.06, x + k * 0.4, fy + 0.76, z - 1.85, { c: DARK }); B.box(M.metal, 1.05, 0.03, 0.05, x, fy + 0.96, z - 1.85, { c: 0xc8ccd0 }); B.box(M.cloth, 1.44, 0.02, 0.3, x, fy + 0.76, z - 1.62, { c: 0xf0ece0 });
    for (const k of [-1, 1]) { B.cyl(M.flat, 0.025, 0.025, 0.2, x + k * 0.6, fy + 0.78, z - 1.65, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.04, 5, 4), [x + k * 0.6, fy + 1.03, z - 1.65], [0, 0, 0], [1, 1.7, 1], 0xffb040); }
    B.cyl(M.wood, 0.015, 0.015, 0.7, x + 1.3, fy + 0.06, z - 1.7, { c: DARK, seg: 5 }); for (const k of [-1, 1]) B.box(M.cloth, 0.1, 0.34, 0.01, x + 1.3 + k * 0.07, fy + 0.42, z - 1.7, { rz: k * 0.25, c: 0xffffff });
  }
  { // two more ways onto the terrace: a mossy side stair at the far west end (enemies use it too), and a ladder up the retaining wall in the east, for you alone
    steps(B, M, -42, -29.3, 0, 3, 8, { w: 2.8, rise: 0.375, run: 0.6, c: 0x7c8470 });
    for (const s of [-1, 1]) B.box(M.stone, 0.45, 0.6, 5.9, -42 + s * 1.62, 1.45, -26.9, { rx: 0.56, c: 0x6c7464 });
    torii(-42, -23.4, 0, 0.8); lantern(-39.6, -31.6, true, 0.9);
    ladder(B, M, 30, -28, 0, 1, world.height(30, -27.6), 3.4, { c: 0x7a5a38 }); B.box(M.stone, 2.6, 1.7, 1.5, 30, 1.4, -29.9, { c: 0x8a887e, solid: true });
  }

  // ---- D: the dojo compound east of the hamlet, a hermitage in the western bamboo ---------------
  {
    const y0 = house(50, -6, 13, 8, { ry: Math.PI / 2, roofC: 0x4a5a60, h: 3.0, roofH: 3.0 }).fy;
    // in the hall: a scroll on the end wall, a suit of armour on its stand, the great drum, a tub of wooden swords
    scroll(50, y0 + 0.95, 0.27, Math.PI / 2);
    { const x = 48.2, z = -0.55; B.box(M.woodH, 0.6, 0.4, 0.5, x, y0, z, { c: 0x2a1c14, solid: true }); B.cyl(M.wood, 0.04, 0.04, 1.0, x, y0 + 0.4, z, { c: DARK, seg: 6 }); B.box(M.flat, 0.62, 0.3, 0.36, x, y0 + 0.62, z, { c: 0x15151a }); B.box(M.flat, 0.5, 0.48, 0.32, x, y0 + 0.92, z, { c: 0x1a2a4a });
      for (const k of [-1, 1]) B.box(M.flat, 0.2, 0.06, 0.34, x + k * 0.34, y0 + 1.36, z, { rz: k * -0.3, c: 0x1a2a4a }); for (let k = 0; k < 3; k++) B.box(M.metal, 0.5, 0.03, 0.33, x, y0 + 1.0 + k * 0.13, z, { c: 0xd9b23a });
      B.geo(M.flat, new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [x, y0 + 1.52, z], [0, 0, 0], [1.05, 1, 1.15], 0x15151a); B.box(M.flat, 0.46, 0.04, 0.5, x, y0 + 1.5, z, { c: 0x15151a }); for (const k of [-1, 1]) B.box(M.metal, 0.035, 0.26, 0.02, x + k * 0.09, y0 + 1.58, z - 0.2, { rz: k * -0.5, c: 0xd9b23a }); world.addCyl(x, z, 0.4, y0, y0 + 1.7); }
    { const x = 51.9, z = -0.75; for (const k of [-1, 1]) { B.box(M.wood, 0.08, 0.75, 0.08, x + k * 0.36, y0, z - 0.2, { rx: -0.25, c: DARK }); B.box(M.wood, 0.08, 0.75, 0.08, x + k * 0.36, y0, z + 0.2, { rx: 0.25, c: DARK }); }
      B.geo(M.wood, new THREE.CylinderGeometry(0.42, 0.42, 0.62, 14), [x, y0 + 1.05, z], [Math.PI / 2, 0, 0], 1, 0x8a3a22); for (const k of [-1, 1]) B.geo(M.flat, new THREE.CylinderGeometry(0.39, 0.39, 0.02, 14), [x, y0 + 1.05, z + k * 0.32], [Math.PI / 2, 0, 0], 1, 0xe8e0c8); world.addBox(x, z, 0.95, 0.75, 0, y0, y0 + 1.5); }
    { const x = 47.3, z = -11.7; B.cyl(M.wood, 0.26, 0.22, 0.5, x, y0, z, { c: 0x6a4a30, seg: 10, solid: true }); for (let k = 0; k < 5; k++) B.cyl(M.wood, 0.02, 0.025, 1.0, x + Math.cos(k * 1.3) * 0.1, y0 + 0.1, z + Math.sin(k * 1.3) * 0.1, { rx: Math.sin(k * 1.3) * 0.16, rz: Math.cos(k * 1.3) * -0.16, c: 0xa07a4a, seg: 5 }); }
    for (const [lx, lz] of [[52.6, -10], [52.6, -6], [52.6, -2]]) { B.box(M.woodH, 0.5, 1.5, 1.9, lx, y0, lz, { c: 0x3a2618, solid: true }); for (let k = 0; k < 4; k++) B.box(M.metal, 0.05, 1.2, 0.05, lx - 0.3, y0 + 0.25, lz - 0.6 + k * 0.4, { rx: 0.1, c: 0xc8ccd0 }); }
    for (const [lx, lz] of [[48, -9.5], [48.4, -2.5]]) { B.cyl(M.thatch, 0.26, 0.3, 1.1, lx, y0 + 0.3, lz, { c: 0xc8b070, seg: 8 }); B.cyl(M.wood, 0.06, 0.06, 1.9, lx, y0, lz, { c: DARK, seg: 6 }); B.geo(M.thatch, new THREE.SphereGeometry(0.2, 8, 6), [lx, y0 + 1.6, lz], [0, 0, 0], 1, 0xc8b070); world.addCyl(lx, lz, 0.3, y0, y0 + 1.8); }
    const wall = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = Math.min(world.height(ax, az), world.height(bx, bz), world.height(mx, mz)) - 0.6;
      B.box(M.plaster, L, 2.7, 0.45, mx, y, mz, { ry, c: 0xe4dcc8, solid: true }); B.box(M.stone, L + 0.1, 0.9, 0.55, mx, y, mz, { ry, c: 0x8c8a80 }); B.box(M.kawara, L + 0.3, 0.16, 0.95, mx, y + 2.7, mz, { ry, c: 0x56646a }); return y + 2.7; };
    { // the north wall has a low water gate: crouch through it into the court
      const top = Math.max(wall(38.5, 11.5, 51.2, 11.5), wall(52.8, 11.5, 60, 11.5)), g = Math.max(world.height(52, 11), world.height(52, 12));
      B.box(M.stone, 1.9, top - g - 1.25, 0.5, 52, g + 1.25, 11.5, { c: 0x8c8a80, solid: true }); B.box(M.kawara, 1.9, 0.16, 0.95, 52, top, 11.5, { c: 0x56646a }); B.box(M.raked, 1.3, 0.05, 3.2, 52, g - 0.02, 11.5, { c: 0x8a8a84 });
    }
    wall(38.5, -22.5, 60, -22.5); wall(60, -22.5, 60, 11.5); wall(38.5, -22.5, 38.5, -9.5); wall(38.5, -2.5, 38.5, 11.5);
    torii(38.5, -6, Math.PI / 2, 1.1); lantern(36.6, -9.2, true, 1.0); lantern(36.6, -2.8, true, 1.0);
    for (const [px, pz] of [[42.5, 3], [44.5, 6], [42.5, 8.5], [56, 6.5]]) { const y = world.height(px, pz); B.cyl(M.wood, 0.11, 0.13, 1.7, px, y - 0.2, pz, { c: 0x6a4a30, seg: 7, solid: true }); B.cyl(M.thatch, 0.16, 0.16, 0.5, px, y + 0.95, pz, { c: 0xc8b070, seg: 8 }); }
    for (const [px, pz] of [[57, -18.5], [53.5, -19.5]]) { const y = world.height(px, pz); B.cyl(M.thatch, 0.7, 0.7, 0.16, px, y + 0.7, pz, { rx: Math.PI / 2 - 0.15, c: 0xd8c890, seg: 16 }); B.cyl(M.flat, 0.24, 0.24, 0.18, px, y + 1.3, pz, { rx: Math.PI / 2 - 0.15, c: 0xb01c1c, seg: 12 }); B.box(M.wood, 0.1, 1.5, 0.1, px, y - 0.1, pz + 0.3, { rx: 0.3, c: DARK }); world.addCyl(px, pz, 0.6, y - 1, y + 2.2); }
    for (const [px, pz, s] of [[45, -17, 1.4], [42, -14.5, 1.0], [56, 2.5, 1.2]]) { const y = world.height(px, pz); B.geo(M.rock, rockGeo(4, 1), [px, y + s * 0.3, pz], [0, px, 0], [s, s * 0.8, s], 0x7c7e78); world.addCyl(px, pz, s * 0.8, y - 1, y + s * 0.9); }
    { // the hermit's hut: a sutra desk, a small altar with a gilded figure, a mat and a rolled bed, his bowl and staff
      const { P, fy } = house(-50, 24, 6, 5, { ry: 0.3, roof: M.thatch, roofC: 0x9a8454, roofH: 2.8, up: 0.2, over: 1.1, h: 2.5 }), ry = 0.3;
      { const [px, pz] = P(-1.9, 0.95), top = table(B, M, px, fy, pz, ry, { w: 0.9, d: 0.36, h: 0.3, c: 0x3a2618 }); B.box(M.cloth, 0.5, 0.012, 0.24, px, top, pz, { ry, c: 0xe8e0c8 }); const [ix, iz] = P(-1.55, 0.95); B.box(M.flat, 0.1, 0.03, 0.07, ix, top, iz, { ry, c: INK }); const [cx, cz] = P(-1.9, 1.6); cushion(cx, fy, cz, ry, 0x4a4a5a); }
      { const [px, pz] = P(-1.9, -1.98); B.box(M.woodH, 0.9, 0.95, 0.5, px, fy, pz, { ry, c: 0x3a1c14, solid: true }); B.geo(M.metal, new THREE.SphereGeometry(0.11, 8, 6), [px, fy + 1.08, pz], [0, 0, 0], [1, 1.25, 0.9], 0xd9b23a); B.geo(M.metal, new THREE.SphereGeometry(0.06, 8, 6), [px, fy + 1.27, pz], [0, 0, 0], 1, 0xd9b23a);
        for (const k of [-1, 1]) { const [qx, qz] = P(-1.9 + k * 0.32, -1.9); B.cyl(M.flat, 0.02, 0.02, 0.14, qx, fy + 0.95, qz, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.03, 5, 4), [qx, fy + 1.13, qz], [0, 0, 0], [1, 1.7, 1], 0xffb040); } }
      { const [px, pz] = P(-1.75, -0.6); rug(B, M, px, fy, pz, ry, { w: 1.8, d: 0.9, c: 0xb8a868, border: 0x7a6a40 }); const [bx, bz] = P(-2.2, 2.05); lie(M.cloth, 0.16, 0.95, bx, fy, bz, ry + Math.PI / 2, 0x6a6a8a); }
      { const [px, pz] = P(-2.62, -1.15); B.cyl(M.wood, 0.02, 0.02, 1.6, px, fy, pz, { rz: 0.08, c: 0x6a4a30, seg: 5 }); const [bx, bz] = P(-2.4, -0.85); B.cyl(M.flat, 0.1, 0.06, 0.07, bx, fy, bz, { c: 0x2a1c14, seg: 9 }); const [sx, sz] = P(-2.77, 0.3); scroll(sx, fy + 0.75, sz, ry); }
    }
    lantern(-44.5, 21.5, true, 1.0); torii(-41, 24.5, Math.PI / 2 + 0.2, 0.8);
    for (const [px, pz, s] of [[-55, 19, 1.5], [-46, 30, 1.1], [-53.5, 30.5, 0.9]]) { const y = world.height(px, pz); B.geo(M.rock, rockGeo(6, 1), [px, y + s * 0.3, pz], [0, pz, 0], [s, s * 0.8, s], 0x70746c); world.addCyl(px, pz, s * 0.8, y - 1, y + s * 0.9); }
  }

  // ---- E: the new land in the north: rice paddies in the east, a great boulder and a charcoal burners' camp in the west ------
  { // rice paddies: flooded fields between walkable dikes, young rice in rows, two people planting, a scarecrow; in the yard a barn open to the fields, with a hay loft
    const Y = 0.3, x0 = 31, x1 = 72, z0 = 46, z1 = 72, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, fw = (x1 - x0) / 3, fd = (z1 - z0) / 2;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), makeWater(shared, { deep: 0x2a3a2c, scale: 2.4, flow: [0.012, 0.007], alpha: 0.72 })); pool.rotation.x = -Math.PI / 2; pool.position.set(cx, Y + 0.1, cz); root.add(pool);
    for (let i = 0; i < 4; i++) B.box(M.ground, 1.5, 0.5, z1 - z0 + 1.5, x0 + i * fw, Y - 0.2, cz, { c: 0x5a6238, solid: true });
    for (let j = 0; j < 3; j++) B.box(M.ground, x1 - x0 + 1.5, 0.49, 1.5, cx, Y - 0.2, z0 + j * fd, { c: 0x5a6238, solid: true });
    const shoots = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) for (let a = 1.5; a < fw - 1.2; a += 0.85) for (let b = 1.3; b < fd - 1.0; b += 0.6) {
      if (i === 0 && j === 0 && a > 6) continue;                          // the field nearest the yard is only half planted
      const k = Math.sin(a * 12.9 + b * 78.2 + i * 3 + j) * 43758.5; shoots.push({ x: x0 + i * fw + a + (k - Math.floor(k) - 0.5) * 0.12, y: Y + 0.02, z: z0 + j * fd + b, ry: k, s: [0.3, 0.5 + (k - Math.floor(k)) * 0.2, 0.3] });
    }
    root.add(instanced(tuftGeo(5, 0x4a7a2a, 0xb0dc60), windify(M.flat2.clone(), shared, 0.15, 1, 1.6), shoots, { cast: false }));
    const stoop = (f) => { f.hips.rotation.x = 1.05; f.armR.rotation.x = -1.35; f.armL.rotation.x = -1.2; f.legL.rotation.x = 0.12; f.legR.rotation.x = -0.1; };
    people.push(person(B, M, root, 'japanWoman', 37.7, Y, 51, -Math.PI / 2, { pose: stoop, over: { hat: 'kasa', extras: ['kimono', 'obi'], shirt: 0x3a4a6a, sleeve: 0x3a4a6a, pants: 0x4a4a5a, accent: 0x8a2a22 } }), person(B, M, root, 'japanMan', 38.1, Y, 54.6, -1.9, { pose: stoop, over: { hat: 'kasa' } }));
    { const x = 64.5, z = 52.5; B.cyl(M.wood, 0.04, 0.05, 2.1, x, Y - 0.2, z, { c: 0x6a4a30, seg: 6, solid: true }); B.box(M.wood, 1.5, 0.06, 0.06, x, Y + 1.4, z, { ry: 0.5, c: 0x6a4a30 }); B.box(M.cloth, 1.3, 0.75, 0.05, x, Y + 0.75, z, { ry: 0.5, c: 0x5a4a6a });
      B.geo(M.thatch, new THREE.SphereGeometry(0.15, 8, 6), [x, Y + 1.72, z], [0, 0, 0], 1, 0xc8b070); B.geo(M.thatch, new THREE.ConeGeometry(0.36, 0.16, 10), [x, Y + 1.9, z], [0, 0, 0.12], 1, 0xb09a5a); }
    { const x = 23, z = 50.5, y = Y + 0.05, fy = y + 0.06;
      room(B, M, x, y, z, { w: 5, d: 7, h: 3.0, t: 0.2, mat: M.woodH, c: 0x6a5038, base: 0.3, doors: [{ side: 'e', at: 0, w: 5.6, h: 2.5 }], floor: { mat: M.ground, c: 0x6a5a48 }, ceil: false });
      B.geo(M.thatch, curvedRoofGeo(9.2, 7.2, 2.6, { up: 0.2, tile: M.thatch.userData.tile, ridge: 0.5 }), [x, y + 3.0, z], [0, Math.PI / 2, 0], 1, 0x9a8454);
      const loft = deck(B, M, x - 1.3, fy, z, 0, { w: 2.0, d: 6.4, h: 2.05, c: 0x7a5a3a, ladder: 'e', at: -2.0 }).top;
      B.geo(M.thatch, new THREE.SphereGeometry(1, 9, 6), [x - 1.5, loft + 0.05, z + 1.9], [0, 0, 0], [0.85, 0.55, 1.2], 0xc8b060); extraPicks.push([x - 1.3, z + 0.3, loft + 0.6]);
      sacks(B, M, x - 1.55, fy, z + 2.1, Math.PI / 2, { w: 1.8 }); B.cyl(M.flat, 0.01, 0.01, 0.5, x + 1.2, fy + 2.3, z - 1.4, { c: INK, seg: 4 }); B.geo(M.glow, new THREE.SphereGeometry(0.16, 8, 6), [x + 1.2, fy + 2.15, z - 1.4], [0, 0, 0], [1, 1.3, 1], 0xffa040);
      for (const [dx, dz] of [[1.5, 2.6], [0.6, 2.75]]) B.cyl(M.thatch, 0.4, 0.32, 0.5, x + dx, fy, z + dz, { c: 0xa8905a, seg: 10, solid: true });
      for (const k of [0, 1]) { B.cyl(M.wood, 0.022, 0.022, 1.5, x - 2.2, fy, z - 2.6 + k * 0.35, { rz: 0.1, c: 0x6a4a30, seg: 5 }); B.box(M.metal, 0.03, 0.26, 0.16, x - 2.2, fy + 1.32, z - 2.6 + k * 0.35, { rz: 0.6, c: 0x4a4a50 }); }
    }
    for (const [x, z] of [[28.4, 56.4], [28.3, 47.3]]) haystack(B, M, x, Y, z, { r: 1.15, h: 2.2, c: 0xc8b060 });
    lantern(8.6, 66.4, true, 0.8); lantern(-0.6, 69.3, true, 0.8);                                             // where the side trails leave the gate path
  }
  // the great mossy boulder beside the western trail: up its ladder for a look over the gate path and the pond
  extraPicks.push([-27, 51.5, boulder(B, M, -27, world.height(-27, 51.5), 51.5, { rx: 5.2, rz: 4.6, h: 5.2, seed: 5, ladder: Math.PI / 2 }).top + 0.6]);
  { // charcoal burners' camp: an earth kiln to crawl into, a lean-to with a bed, a cooking fire, a chopping block, stacked wood, bales of charcoal, cut bamboo; a man with his load of sticks
    const g = (x, z) => world.height(x, z);
    { const x = -64.5, z = 59.5, y = g(x, z) + 0.02, E = 0x4a4034;
      den(B, M, x, y, z, Math.PI / 2, { w: 3.4, d: 3.2, mat: M.ground, c: 0x5a4a3a, floor: { mat: M.ground, c: 0x2a2622 } });
      B.geo(M.ground, new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), [x, y + 2.0, z], [0, 0, 0], [2.35, 1.0, 2.45], E);
      for (const [dx, dz, k] of [[-2.85, 0, 3], [-0.3, 2.9, 5], [-0.3, -2.9, 7]]) B.geo(M.ground, rockGeo(k, 1), [x + dx, y + 0.6, z + dz], [0, k, 0], [1.1, 1.6, 1.1], E);
      B.cyl(M.rock, 0.2, 0.28, 0.9, x - 1.1, y + 2.5, z, { c: 0x3a3632, seg: 7 }); B.geo(M.flat, rockGeo(3, 0), [x - 0.75, y + 0.2, z], [0, 1, 0], [0.7, 0.5, 1.0], 0x15151a); B.geo(M.glow, rockGeo(4, 0), [x - 0.8, y + 0.16, z + 0.2], [0, 2, 0], [0.3, 0.2, 0.36], 0xff5a18);
      for (const k of [-1, 1]) B.box(M.stone, 0.3, 1.3, 0.34, x + 1.66, y - 0.05, z + k * 0.87, { c: 0x9a988e }); B.box(M.stone, 0.34, 0.3, 2.1, x + 1.66, y + 1.25, z, { c: 0x9a988e }); extraPicks.push([x + 0.35, z, 0, 0.5]);
    }
    { const x = -57, z = 64.5, y = g(x, z);
      for (const s of [-1, 1]) { B.box(M.wood, 0.14, 2.15, 0.14, x + s * 1.7, y - 0.1, z - 1.25, { c: DARK }); world.addCyl(x + s * 1.7, z - 1.25, 0.1, y - 1, y + 2); }
      B.box(M.thatch, 4.0, 0.16, 3.6, x, y + 0.95, z + 0.2, { rx: 0.6, c: 0xa08a58 }); world.addBox(x, z + 1.2, 4.0, 1.2, 0, y - 0.5, y + 1.3);
      bed(B, M, x - 0.8, y, z - 0.1, Math.PI / 2, { w: 0.8, l: 1.8, h: 0.16, head: 0, blanket: 0x5a5a48 }); pots(B, M, x + 1.0, y, z + 0.1, { n: 3, s: 1, c: [0x6a4a38, 0x4a4a48] });
    }
    hearth(B, M, -57.5, g(-57.5, 58), 58, { pot: true });
    B.cyl(M.wood, 0.3, 0.32, 0.5, -54, g(-54, 60.5) - 0.05, 60.5, { c: 0x7a5a3a, seg: 9, solid: true }); B.cyl(M.wood, 0.02, 0.02, 0.7, -54.15, g(-54, 60.5) + 0.45, 60.5, { rz: 0.9, c: 0x6a4a30, seg: 5 }); B.box(M.metal, 0.16, 0.1, 0.03, -53.9, g(-54, 60.5) + 0.5, 60.5, { rz: 0.9, c: 0x4a4a50 });
    woodpile(B, M, -51.8, g(-51.8, 62.5), 62.5, 0.3, { w: 2.6, h: 1.2 }); woodpile(B, M, -61, g(-61, 51.2), 51.2, 1.2, { w: 2.2, h: 1.0 }); sacks(B, M, -61, g(-61, 63.7), 63.7, 0.4, { c: 0x8a7a50, w: 1.8 });
    { const x = -51.5, z = 53, y = g(x, z); for (const k of [-1, 1]) B.box(M.wood, 0.1, 1.35, 0.1, x + k * 0.9, y - 0.1, z + 0.6, { c: DARK }); B.box(M.wood, 2.0, 0.08, 0.08, x, y + 1.15, z + 0.6, { c: DARK });
      for (let k = 0; k < 7; k++) B.cyl(M.flat, 0.04, 0.048, 4.2, x - 0.6 + k * 0.2, y - 1.3, z, { rx: 1.15 + (k % 3) * 0.03, c: k % 2 ? 0xa8c070 : 0xc8d898, seg: 6 }); world.addBox(x, z, 1.9, 3.6, 0, y - 0.5, y + 0.95); }
    { const f = person(B, M, root, 'japanMan', -55.3, g(-55.3, 59.5), 59.5, 0.95, { pose: 'carry', over: { hat: null, face: ['topknot'] } }); people.push(f);
      f.hips.add(new THREE.Mesh(merge([0, 1, 2, 3, 4, 5].map((k) => gCyl(0.028, 0.028, 0.95, k % 2 ? 0x8a6a44 : 0x6a4a30, [(k % 2) * 0.03, 0.26 + (k % 3) * 0.07, -0.21 - (k % 2) * 0.07], [0, 0, Math.PI / 2 + (k - 2.5) * 0.03], 1, 5)).concat(gBox(0.03, 0.26, 0.2, 0xd8c890, [0, 0.33, -0.25]))), M.flat)); }
  }
  { // people of the valley who take no part in the fight: wandering flute monks (komuso) and geisha under their umbrellas, an old man on the tea-house veranda, a pilgrim praying toward the shrine
    let q = 0; const rq = () => (q = (q + 0.381) % 1);
    const figure = (look, x, z, yaw, pose, over) => { people.push(person(B, M, root, look, x, world.height(x, z), z, yaw, { pose, over, rand: rq })); };   // bystanders like the others: they stroll, take fright, can be hurt
    const flute = (f) => { f.armR.rotation.x = -0.98; f.armR.rotation.z = 0.45; f.armL.rotation.x = -1.1; f.armL.rotation.z = -0.5; };
    const stroll = (f) => { f.armR.rotation.x = -0.71; f.armR.rotation.z = 0.17; f.armL.rotation.x = -0.32; f.armL.rotation.z = -0.12; f.legL.rotation.x = 0.1; f.legR.rotation.x = -0.1; };
    figure('komuso', pathX(62.5) + 2.6, 62.5, -1.2, flute); figure('komuso', -45.6, 23.6, 1.5, flute); figure('komuso', -7.5, -37.5, 0.5, flute);
    figure('geisha', 3.1, 42.8, 0.3, stroll); figure('geisha', 17.4, 29.2, -1.6, stroll); figure('geisha', 33.5, -4.6, -1.3, stroll);
    figure('geisha', -18.2, 19.6, -1.5, stroll, { shirt: 0xf4f0ea, robe: 0xf4f0ea, sleeve: 0xf4f0ea, pants: 0xf4f0ea, hem: 0xc8321c, accent: 0xe8e0d0, cord: 0xc8321c, trim: 0xe8a8a0, hat: 'wataboshi', face: [], umbrella: 0xe6e0d0, umbrella2: 0x55504a });
    { const [px, pz] = tea.P(-4.2, 0.3); people.push(person(B, M, root, 'japanMan', px, tea.y - 0.5, pz, -0.25 - Math.PI / 2, { pose: 'sit', seat: 0.5, over: { hat: null, hair: 0xb8b8b0, face: ['topknot'], shirt: 0x5a5a4a } })); }
    { const x = 6.8, z = -19.6, y = world.height(x, z), white = 0xe8e4d8; people.push(person(B, M, root, 'japanMan', x, y, z, Math.PI, { pose: 'pray', over: { hat: 'kasa', shirt: white, sleeve: white, pants: white, accent: white } })); B.cyl(M.wood, 0.022, 0.022, 1.6, x + 0.55, y - 0.1, z - 0.1, { rz: -0.05, c: 0x6a4a30, seg: 5 }); }
  }

  // ---- vegetation ------------------------------------------------------------------------------
  const clearing = (x, z) => {
    if (x > 34 && x < 62 && z > -25 && z < 14) return true;                                            // dojo compound
    if (x < -36 && x > -59 && z > 16 && z < 33) return true;                                           // hermitage
    if (Math.abs(x - pathX(z)) < 2.7) return true;
    if (z < -29 && Math.abs(x) < 33 && z > -72) return true;                                           // shrine precinct
    if (Math.abs(x) < 9 && z <= -72 && z > -77) return true;                                           // inner sanctuary
    if (trailD(x, z) < 2.3 || (Math.abs(x + 42) < 2.8 && z > -32 && z < -22)) return true;             // side trails, mossy stair
    if (x > 17.5 && x < 75.5 && z > 43.5 && z < 74.5) return true;                                     // rice paddies and farm yard
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < 10.5 || Math.hypot((x + 27) / 8, (z - 51.5) / 7.4) < 1) return true;   // charcoal camp, great boulder
    if (z > -29 && z < 9 && Math.abs(x) < 36) return true;                                             // hamlet
    if (z >= 9 && z < 38 && Math.abs(x) < 38) return true;                                             // pond + gardens
    return false;
  };
  const stalks = [], tops = [];
  for (let i = 0; i < 50000 && stalks.length < 2700; i++) {
    const x = (R() - 0.5) * 190, z = -95 + R() * 195;
    if (clearing(x, z)) continue;
    const near = Math.abs(x - pathX(z)) < 16 || (Math.abs(x) < 50 && z < 40) || trailD(x, z) < 12;
    if (!near && R() < 0.55) continue;
    if (fbm(x * 0.09, z * 0.09, 2, 8) < 0.38) continue;
    const y = world.height(x, z) - 0.2, s = 0.75 + R() * 0.6, lean = (R() - 0.5) * 0.12;
    stalks.push({ x, y, z, ry: R() * 6.28, rz: lean, rx: (R() - 0.5) * 0.1, s: [0.8 + R() * 0.7, s, 0.8 + R() * 0.7], c: R.pick([0xb8d48a, 0x9cc070, 0xc8d898, 0x8ab060]) });
    tops.push({ x, y, z, ry: R() * 6.28, rz: lean, s, c: R.pick([0xffffff, 0xe0f0c0, 0xc8e0a0]) });
    if ((Math.abs(x) < 65 || z > 34) && Math.abs(x) < 82 && z > -78 && z < 81) world.addCyl(x, z, 0.13, y - 1, y + 12);
  }
  const stalkGeo = new THREE.CylinderGeometry(0.06, 0.085, 13, 6, 1, true); stalkGeo.translate(0, 6.5, 0); paint(stalkGeo, 0xffffff);
  { const uv = stalkGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 14); }
  const cards = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.PlaneGeometry(3.0, 2.6); g.rotateX(-0.5 - (i % 3) * 0.25);
    g.rotateY(i * 2.4); g.translate(Math.sin(i * 2.4) * 0.7, 6.2 + i * 1.05, Math.cos(i * 2.4) * 0.7);
    cards.push(xf(g));
  }
  root.add(instanced(stalkGeo, windify(M.bamboo.clone(), shared, 0.55, 13, 0.9), stalks));
  root.add(instanced(merge(cards), windify(M.bambooLeaf.clone(), shared, 0.55, 13, 0.9), tops));
  // cherry, maple and pine
  const tree = (geo, list) => root.add(instanced(geo, M.rock, list));
  const spot = (x, z, s, col = true) => { if (col) world.addCyl(x, z, 0.4 * s, -2, 8); return { x, y: world.height(x, z) - 0.1, z, ry: R() * 6.28, s }; };
  tree(blobTreeGeo({ leaf: [0xffc9d6, 0xffe2e8, 0xf9aec2], h: 4.6, spread: 3.2, blobs: 11, seed: 3 }), [spot(-13, 33, 1.1), spot(12, 14, 1.0), spot(15.5, 34, 1.25), spot(-14, -37, 1.3), spot(13, -39, 1.2), spot(-9, 6, 0.9)]);
  tree(blobTreeGeo({ leaf: [0xc8401c, 0xe0702a, 0xa82a18], h: 4.2, spread: 2.8, blobs: 9, seed: 7 }), [spot(-17, 11, 1.0), spot(30, 16, 1.2), spot(-33, -30, 1.1), spot(27, -36, 1.2), spot(31, 2, 0.9)]);
  tree(blobTreeGeo({ leaf: [0x23412a, 0x2f5234, 0x1c3824], h: 5.2, spread: 2.6, blobs: 8, seed: 11, trunk: 0x2a2018 }), [spot(-34, 30, 1.2), spot(34, 30, 1.1), spot(-36, 6, 1.0), spot(36, -22, 1.2), spot(26, -62, 1.3), spot(-30, -64, 1.2), spot(20, -44, 1.6, false)]);
  root.add(instanced(rockGeo(5, 1), M.rock, rocks, { solid: true }));
  const tufts = [], bushes = [];
  for (let i = 0; i < 10500; i++) {
    const x = (R() - 0.5) * 162, z = -76 + R() * 156;
    if (Math.abs(x - pathX(z)) < 1.5 || (z < -30 && Math.abs(x) < 33) || Math.hypot(x - POND.x, z - POND.z) < POND.r || (Math.abs(x + 27) < 8 && Math.abs(z - 22) < 6.5)) continue;
    if (trailD(x, z) < 1.3 || (x > 30 && x < 73 && z > 45 && z < 73) || (Math.abs(x - 23) < 2.8 && Math.abs(z - 50.5) < 3.8) || Math.hypot(x - CAMP.x, z - CAMP.z) < 10) continue;
    tufts.push({ x, y: world.height(x, z), z, ry: R() * 6.28, s: [0.4 + R() * 0.5, 0.25 + R() * 0.5, 0.4 + R() * 0.5], c: R.pick([0x7a9a4a, 0x5a8038, 0x8aa858, 0x4a6a30]) });
  }
  root.add(instanced(tuftGeo(6, 0x7a8a5a, 0xffffff), windify(M.flat2.clone(), shared, 0.2, 1, 1.6), tufts, { cast: false, thin: true }));
  for (let i = 0; i < 90; i++) { const x = (R() - 0.5) * 80, z = -70 + R() * 110; if (clearing(x, z) && !(Math.abs(x) > 28) && !(z > 9 && z < 38 && Math.abs(x) > 14)) continue; if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1 || trailD(x, z) < 1.8 || Math.hypot(x - 22, z - 25) < 6.5 || Math.hypot(x - 31, z - 30) < 3.5 || Math.hypot(x + 30, z + 20) < 5.5 || Math.hypot(x - 30, z + 28.5) < 2.5) continue; const s = 0.6 + R() * 0.7; bushes.push({ x, y: world.height(x, z) + 0.2, z, ry: R() * 6, s: [s * 1.3, s * 0.8, s * 1.3], c: R.pick([0x35502c, 0x44663a, 0xb8506a, 0x2c4426]) }); }
  root.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.rock, bushes));
  // distant hills and one great snow-capped mountain behind the shrine
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + 0.2, r = 260 + (i % 3) * 60; B.geo(M.rock, new THREE.ConeGeometry(110 + (i % 4) * 30, 60 + (i * 37) % 70, 7), [Math.cos(a) * r, 10, Math.sin(a) * r], [0, i, 0], 1, 0x26343a); }
  B.geo(M.rock, new THREE.ConeGeometry(260, 250, 20), [-380, 60, -640], [0, 0, 0], 1, 0x2e3a52);
  B.geo(M.rock, new THREE.ConeGeometry(88, 86, 20), [-380, 144.5, -640], [0, 0, 0], 1, 0xf0e8ee);

  // ---- atmosphere ----------------------------------------------------------------------------------
  root.add(makeAmbient(shared, { count: 520, box: 30, boxY: 16, size: 0.085, colorA: 0xffc4d6, colorB: 0xfff0f4, petal: true, alpha: 0.95, fall: 0.55, wind: [0.5, 0, -0.25], flutter: 1.3 }));
  root.add(makeAmbient(shared, { count: 130, box: 36, boxY: 5, size: 0.11, colorA: 0xd8ff7a, colorB: 0xfff0a0, additive: true, blink: true, alpha: 1, bright: 2.6, fall: 0, wind: [0.05, 0, 0.03], flutter: 1.6 }));

  { // places to climb and to hide: a watch platform in the dojo court (up its ladder), a tea hut whose door is a crawl-in hatch
    const clearAt = (x, z, r) => { world.cyls = world.cyls.filter((c) => Math.hypot(c.x - x, c.z - z) > r + c.r); };
    clearAt(50, -18, 4); stand(B, M, 50, world.height(50, -18.3), -18.3, 0, { c: 0x6a4630, roof: 0x4e5c60 });
    clearAt(31, 30, 4); den(B, M, 31, world.height(31, 30.1) + 0.02, 30.1, 0, { mat: M.plaster, c: 0xe6dec8, floor: { mat: M.woodH, c: 0xb8a070 } }); B.box(M.thatch, 4.6, 0.5, 4.4, 31, world.height(31, 30.1) + 1.97, 30.1, { c: 0xa08a58 });
    extraPicks.push([31, 30.3, 0, 0.6]);
  }
  const enemies = [
    ['ninja', 4, 58, { ambush: 13 }], ['ninja', -5, 51, { ambush: 13 }], ['ninja', 5.5, 45, { ambush: 12 }],
    ['ronin', -8, 39, { yaw: 0 }], ['archer', 0, 23.5, { y: 3, static: true, yaw: 0 }], ['ninja', 14, 19, { ambush: 14 }],
    ['ronin', -20, 14, { patrol: true }], ['archer', 19.6, 21.4, { y: 2, static: true, yaw: 2.5 }],
    ['ronin', -14, -4, {}], ['ronin', 14, -9, { patrol: true }], ['ninja', -8, -16, { ambush: 15 }], ['ninja', 9, -19, { ambush: 15 }],
    ['archer', -3, -33.5, { y: 4, static: true, yaw: 0 }], ['archer', 3, -33.5, { y: 4, static: true, yaw: 0 }],
    ['ronin', -9, -42, {}], ['ronin', 9, -42, {}], ['japanBoss', 0, -47.5, { yaw: 0, patrol: false }],
    ['ronin', 43, -4, {}], ['ronin', 50.5, -7, { patrol: false, yaw: -1.57 }], ['ninja', 55, 5, { ambush: 12 }], ['archer', 46, 7, {}],
    ['ninja', -50, 24, { ambush: 9 }], ['ronin', -45, 27, {}], ['ninja', -4.4, -57.6, { y: 4.3, ambush: 9 }], ['ronin', 23, -10.5, { patrol: false }],
    ['archer', 24.3, 51.6, {}], ['ronin', 44.7, 60.5, { patrol: true }], ['ronin', -55, 55.5, {}], ['ninja', -61.5, 53.5, { ambush: 10 }],                // paddies, charcoal camp
    ['archer', -40, -34, { y: 3.4 }], ['ninja', -5.6, -68.2, { y: 3.4, ambush: 9 }],                                                                  // head of the mossy stair, inner sanctuary
  ];
  const cake = merge([gSph(0.14, 0xf6f2e8, [0, 0, 0], [1, 0.8, 1]), gBox(0.18, 0.1, 0.03, 0x1c2a1c, [0, -0.04, 0.12]), gCyl(0.2, 0.2, 0.02, 0x8a6a3a, [0, -0.12, 0], [0, 0, 0], 1, 8)]);
  let mt = 0;
  return {
    env: {
      sunDir: [-0.5, 0.2, -0.84], sunColor: 0xff8a50, sunLight: 0xffa878, sunIntensity: 3.4, sunSize: 0.0012,
      skyTop: 0x1c2c66, skyHorizon: 0xf68a62, skyGround: 0x5a4a5a, haze: 0.5,
      fogColor: 0x8f6e80, fogDensity: 0.0078, hemiSky: 0x7f92d8, hemiGround: 0x3a3440, hemiIntensity: 1.9, envIntensity: 0.7,
      cloudCover: 0.52, cloudScale: 0.4, cloudLit: 0xffa888, cloudShade: 0x5a4a72, stars: 0.45, moonDir: [0.55, 0.6, 0.5],
      bloom: 0.55, bloomRadius: 0.75, bloomThreshold: 1.15, rays: 0.55, rayThreshold: 1.5, exposure: 1.2,
      saturation: 1.12, contrast: 1.06, vignette: 0.42, tintHi: 0xffeedd, tintLo: 0xdce4ff, shadowRange: 70,
    },
    spawn: { x: 0.3, z: 76.5, yaw: 0 },
    vista: { c: [-1, 3, 22], r: 15, h: 9.5, a: 1.2, speed: 0.03 },   // circles above the pond, clear of the bamboo
    enemies: enemies.concat(extraFoes), pickups: [[-2.5, 41], [18, 24, 2], [-23, -1.5, 2], [0, -30.5, 4], [14, -52, 4], [3.8, -58.6, 4.3], [50, -11, 1.5], [-51, 25, 1.5]].concat(extraPicks),
    dust: [0.42, 0.4, 0.34], water: [[POND.x, POND.z, 26], [51.5, 59, 30]], heroLight: 70,
    makePickup: () => new THREE.Mesh(cake, M.flat),
    update(dt, t, g) {
      idle(people, t);
      { // the deer scarer: 4.4 s filling, half a second tipping, three quarters pouring, a quick swing back, the knock and a small rebound
        const K = scarer, a = K.rest, b = K.down; K.t += dt; if (K.t >= 6.3) { K.t -= 6.3; K.phase = 0; }
        const u = K.t, ang = u < 4.4 ? a + (u > 3.8 ? Math.sin(u * 38) * 0.012 * (u - 3.8) / 0.6 : 0) : u < 4.9 ? a + (b - a) * ((u - 4.4) / 0.5) ** 2 * (3 - 2 * (u - 4.4) / 0.5) : u < 5.65 ? b : u < 5.93 ? b + (a - b) * ((u - 5.65) / 0.28) ** 2 : a + 0.07 * Math.sin((u - 5.93) / 0.37 * Math.PI) * (1 - (u - 5.93) / 0.37);
        K.pivot.rotation.x = ang;
        const my = 0.5 - 0.7 * Math.sin(ang), mz = 0.7 * Math.cos(ang), into = ang < -0.3;                         // the mouth of the bamboo; is it under the spout?
        K.trickle.scale.set(0.007, into ? 0.945 - (0.5 - 0.63 * Math.tan(ang) + 0.04) : 0.9, 0.007);
        const pouring = ang > 0.1 && u < 5.5; K.gush.visible = pouring; if (pouring) { K.gush.position.set(0, my, mz + 0.02); K.gush.scale.set(0.02 * (1 - (u - 4.7) / 0.9), my - 0.04, 0.02 * (1 - (u - 4.7) / 0.9)); }
        const ph = u < 4.9 ? 0 : u < 5.93 ? 1 : 2;
        if (ph !== K.phase) {
          K.phase = ph;
          const P = g.player.pos, d = Math.hypot(K.x - P.x, K.z - P.z);
          if (d < 34 && g.state === 'play') {
            const pan = Math.max(-1, Math.min(1, ((K.x - P.x) * Math.cos(g.player.yaw) - (K.z - P.z) * Math.sin(g.player.yaw)) / (d || 1)));
            if (ph === 1) { g.sound.pour(d / 34, pan); for (let i = 0; i < 8; i++) g.gfx.soft.spawn(K.bx + (Math.random() - 0.5) * 0.3, K.y + 0.1, K.bz + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.9, 0.7 + Math.random() * 0.8, (Math.random() - 0.5) * 0.9, { life: 0.5, s0: 0.03, s1: 0.07, r: 0.75, g: 0.86, b: 0.9, a: 0.5, grav: 6, drag: 1 }); }
            if (ph === 2) g.sound.tock(d / 34, pan);
          }
        }
      }
      mt -= dt;
      if (mt <= 0) {                                                   // ground mist
        mt = 0.1;
        const p = g.gfx.camera.position, x = p.x + (Math.random() - 0.5) * 60, z = p.z + (Math.random() - 0.5) * 60;
        g.gfx.soft.spawn(x, world.height(x, z) + 0.3 + Math.random() * 0.6, z, 0.25, 0.02, -0.12, { life: 7 + Math.random() * 4, s0: 2.5, s1: 6, r: 0.72, g: 0.62, b: 0.74, a: 0.06, drag: 0 });
      }
    },
  };
}

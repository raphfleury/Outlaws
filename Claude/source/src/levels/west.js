// Chapter I - a frontier town at golden hour.
import * as THREE from 'three';
import { Heightfield, prismGeo, rockGeo } from '../build.js';
import { makeAmbient, windify } from '../gfx.js';
import { signTexture } from '../tex.js';
import { instanced, fence, barrel, crate, room, bars, steps, shelf, tuftGeo, cactusGeo, horseGeo, gBox, gCyl, gCone, gSph, xf, merge, butte, ladder, den, beast, rod, rubble, table, bench, bed, chest, sacks, rug, cart, woodpile, person, idle, local } from '../props.js';
import { fbm, vnoise, smooth } from '../util.js';

export const west = {
  id: 'west', theme: 'theme-west', chapter: 'Chapter I', title: 'Dry Gulch', place: 'Dry Gulch · Arizona Territory · 1881',
  story: 'The Crowe gang rode in at noon and took the town. The sheriff is dead, the telegraph is cut, and you are the last one with a badge and a loaded gun. Clear the street, the jail, the bank and Boot Hill before sundown.',
  weapon: 'revolver',
  heroes: [
    { look: 'earp', name: 'Wyatt Earp', who: 'Lawman of Tombstone, 1881', trait: 'Iron nerve', effect: 'takes 25% less damage', mods: { armor: 0.75 }, sleeve: 0x18181c, cuff: 0xe8e4d8 },
    { look: 'calamity', name: 'Calamity Jane', who: 'Scout and sharpshooter of Deadwood', trait: 'Frontier scout', effect: 'moves 18% faster', mods: { speed: 1.18 }, sleeve: 0xa67848, cuff: 0x8a623a },
    { look: 'billy', name: 'Billy the Kid', who: 'The fastest gun in New Mexico', trait: 'Quick draw', effect: 'fires and reloads much faster', mods: { fire: 0.68, reload: 0.6 }, sleeve: 0xd9d2c0, cuff: 0x3a2a1c },
  ], weaponName: 'Six-shooter', alt: 'right mouse — take aim',
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> fire &nbsp; <kbd>Right mouse</kbd> aim &nbsp; <kbd>R</kbd> reload',
  foes: 'outlaws left', foesNone: 'The street is yours', bossName: 'Silas Crowe', bossDown: 'Silas Crowe is down', pickupText: 'Tonic  +35',
  deadTitle: 'Boot Hill', deadSub: 'They buried you where you fell.', clearTitle: 'Dry Gulch is free',
  build,
};

function build({ game, gfx, world, B, M, root, rand, shared }) {
  const R = rand;
  // ---- terrain: flat town, dunes beyond ---------------------------------------
  // A dry wash runs north to south between the town and the church: a sunken way from the railroad to the street, shallow where the street fords it.
  const wash = (x, z) => (1 - smooth(1.5, 4.2, Math.abs(x - 50.2 - Math.sin(z * 0.08)))) * smooth(-41, -33, z) * (1 - smooth(11, 19, z)) * (0.4 + 0.6 * smooth(6, 12, Math.abs(z)));
  const hf = new Heightfield(700, 230, (x, z) => {
    const out = Math.max(smooth(96, 180, Math.abs(x)), smooth(62, 134, Math.abs(z)));
    return out * (fbm(x * 0.011 + 3, z * 0.011, 4, 5) * 20 - 5) + out * out * 3 - wash(x, z) * 2.3;
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -102, x1: 96, z0: -66, z1: 66 };
  const cA = new THREE.Color(0xc99866), cB = new THREE.Color(0xa87048), cS = new THREE.Color(0x9c7a58), cR = new THREE.Color(0xb5613c), cW = new THREE.Color(0xd8c4a0), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h) => {
    const n = fbm(x * 0.03, z * 0.03, 4, 9);
    tmp.copy(cA).lerp(cB, n);
    tmp.lerp(cR, smooth(0.55, 0.8, fbm(x * 0.008 + 40, z * 0.008, 3, 2)) * 0.6);
    const street = (1 - smooth(6, 11, Math.abs(z))) * (1 - smooth(70, 86, Math.abs(x)));
    const rut = 0.82 + 0.18 * vnoise(x * 0.15, z * 2.2, 4);
    tmp.lerp(cS, street * 0.75).multiplyScalar(1 - street * (1 - rut) * 0.9);
    return tmp.lerp(cW, wash(x, z) * 0.7);
  }));

  // ---- generic frontier building ----------------------------------------------
  const lights = [];
  const win = (x, y, z, w = 1.1, h = 1.5) => B.geo(M.window, new THREE.BoxGeometry(w, h, 0.07), [x, y + h / 2, z]);
  const signs = [];
  const sign = (text, x, y, z, w, h, o = {}) => {
    const t = signTexture(text, o); t.userData.own = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; m.receiveShadow = true; root.add(m); signs.push(m);
    return m;
  };
  function bld(o) {
    const { x, w, d, h, dir, wall, trim = 0x4a3526, roofC = 0x8a6a52, balcony = false, interior = false, text, signO, door = true, panel = 0x5a2c22, floorC = 0x7a5a3e, ceilC = 0x5a4030 } = o;
    const zf = -8 * dir, zc = zf - dir * d / 2, zp = zf + dir * 1.3, zo = zf + dir * 0.27;
    B.box(M.woodH, w + 1, 0.3, 2.7, x, 0, zp, { c: 0x9a8468, solid: true });
    const H2 = h + 1.5;
    if (!interior) {
      B.box(M.wood, w, h, d, x, 0, zc, { c: wall, solid: true });
      B.box(M.wood, w + 0.5, H2, 0.3, x, 0, zf + dir * 0.1, { c: wall });
      if (door) { B.box(M.woodH, 1.3, 2.3, 0.08, x, 0.3, zo, { c: 0x3a2618 }); B.box(M.wood, 1.6, 0.14, 0.12, x, 2.6, zo, { c: trim }); }
    } else {
      const T = 0.35, gap = 2.2, sw = (w + 0.5 - gap) / 2, zb = zf - dir * (d - T / 2), zw = zf - dir * T / 2 + dir * 0.1, zpan = zf - dir * (d - T - 0.04);
      if (o.back === undefined) { B.box(M.wood, w, h, T, x, 0, zb, { c: wall, solid: true }); B.box(M.wood, w - 0.72, 3.5, 0.06, x, 0.3, zpan, { c: panel }); }
      else {                                           // a back door 1.6 m wide, o.back metres to the right of the middle: a way out to the back lot
        const xb = x + o.back, a = xb - 0.8 - (x - w / 2), b = x + w / 2 - xb - 0.8;
        B.box(M.wood, a, h, T, x - w / 2 + a / 2, 0, zb, { c: wall, solid: true }); B.box(M.wood, b, h, T, x + w / 2 - b / 2, 0, zb, { c: wall, solid: true }); B.box(M.wood, 1.6, h - 2.7, T, xb, 2.7, zb, { c: wall, solid: true });
        B.box(M.wood, a - 0.36, 3.5, 0.06, x - w / 2 + 0.36 + (a - 0.36) / 2, 0.3, zpan, { c: panel }); B.box(M.wood, b - 0.36, 3.5, 0.06, x + w / 2 - 0.36 - (b - 0.36) / 2, 0.3, zpan, { c: panel });
        B.box(M.woodH, 1.6, 0.3, T + 0.1, xb, 0, zb, { c: floorC, solid: true }); B.box(M.woodH, 1.9, 0.15, 0.8, xb, 0, zf - dir * (d + 0.4), { c: 0x9a8468 });
        B.box(M.woodH, 1.9, 0.14, T + 0.12, xb, 2.7, zb, { c: trim }); B.box(M.woodH, 0.08, 2.3, 0.85, xb + 0.84, 0.3, zf - dir * (d + 0.42), { c: 0x3a2618 });      // the door, standing open
      }
      B.box(M.wood, T, h, d, x - w / 2 + T / 2, 0, zc, { c: wall, solid: true });
      B.box(M.wood, T, h, d, x + w / 2 - T / 2, 0, zc, { c: wall, solid: true });
      B.box(M.wood, sw, H2, T, x - gap / 2 - sw / 2, 0, zw, { c: wall, solid: true });
      B.box(M.wood, sw, H2, T, x + gap / 2 + sw / 2, 0, zw, { c: wall, solid: true });
      if (!o.up) B.box(M.wood, gap, H2 - 2.9, T, x, 2.9, zw, { c: wall, solid: true });
      else {                                           // an upper storey: a door out onto the balcony, a step down to it, a ceiling under the roof
        B.box(M.wood, gap, 1.1, T, x, 2.9, zw, { c: wall, solid: true }); B.box(M.wood, gap, H2 - 6.1, T, x, 6.1, zw, { c: wall, solid: true });
        B.box(M.woodH, gap, 0.2, 0.5, x, 3.8, zf - dir * 0.3, { c: ceilC, solid: true }); B.box(M.woodH, 2.0, 0.32, 0.6, x, 3.36, zf + dir * 0.4, { c: 0x8a6a4e, solid: true });
        B.box(M.woodH, gap + 0.3, 0.14, T + 0.12, x, 6.1, zw, { c: trim }); B.box(M.woodH, w - 0.7, 0.2, d - 0.7, x, h - 0.2, zc, { c: ceilC });
      }
      B.box(M.woodH, w - 0.6, 0.3, d - 0.6, x, 0, zc, { c: floorC, solid: true });
      { const X0 = x - w / 2 + 0.25, X1 = x + w / 2 - 0.25, Z0 = zc - d / 2 + 0.25, Z1 = zc + d / 2 - 0.25, [a, b, e, f] = o.well || [X1, X1, Z0, Z1];      // the ceiling, with the stair well left open
        for (const [p, q, r, s] of [[X0, a, Z0, Z1], [b, X1, Z0, Z1], [a, b, Z0, e], [a, b, f, Z1]]) if (q - p > 0.02 && s - r > 0.02) B.box(M.woodH, q - p, 0.2, s - r, (p + q) / 2, 3.8, (r + s) / 2, { c: ceilC, solid: true }); }
      // dark panelling inside
      B.box(M.wood, 0.06, 3.5, d - 0.72, x - w / 2 + T + 0.04, 0.3, zc, { c: panel });
      B.box(M.wood, 0.06, 3.5, d - 0.72, x + w / 2 - T - 0.04, 0.3, zc, { c: panel });
    }
    // cornice + corner boards
    B.box(M.woodH, w + 1, 0.24, 0.6, x, H2, zf + dir * 0.15, { c: trim });
    B.box(M.woodH, w * 0.5, 0.5, 0.3, x, H2 + 0.24, zf + dir * 0.1, { c: wall });
    B.box(M.woodH, w * 0.5 + 0.4, 0.16, 0.5, x, H2 + 0.74, zf + dir * 0.12, { c: trim });
    for (const s of [-1, 1]) B.box(M.wood, 0.22, H2, 0.36, x + s * (w / 2 + 0.2), 0, zf + dir * 0.12, { c: trim });
    if (o.flat) {                                      // a flat roof to stand on behind the false front, reached by the ladder at the back
      B.box(M.woodH, w + 0.3, 0.2, d + 0.1, x, h, zc, { c: 0x6a5240, solid: true });
      for (const s of [-1, 1]) B.box(M.wood, 0.2, 0.5, d, x + s * (w / 2 + 0.05), h + 0.2, zc, { c: wall, solid: true });
      ladder(B, M, x - w / 4, zf - dir * (d + 0.05), 0, -dir, 0, h + 0.2);
    } else B.geo(M.shingle, prismGeo(w + 0.3, 1.5, d + 0.1, 3), [x, h, zc], [0, 0, 0], 1, roofC);
    // windows
    const wx = w * 0.3;
    for (const s of [-1, 1]) { win(x + s * wx, 1.25, zo); B.box(M.woodH, 1.35, 0.1, 0.16, x + s * wx, 1.18, zo, { c: trim }); }
    if (h > 6) for (const s of o.up ? [-1, 1] : [-1, 0, 1]) { win(x + s * wx, 4.5, zo); B.box(M.woodH, 1.35, 0.1, 0.16, x + s * wx, 4.43, zo, { c: trim }); }
    // porch
    const n = Math.max(2, Math.round(w / 3.4)) + 1, zpost = zf + dir * 2.45;
    for (let i = 0; i < n; i++) {
      const px = x - w / 2 + 0.1 + (w - 0.2) * i / (n - 1);
      B.box(M.wood, 0.17, balcony ? 6.0 : 2.85, 0.17, px, 0.3, zpost, { c: trim });
      world.addCyl(px, zpost, 0.13, 0, 3);
    }
    if (balcony) {
      B.box(M.woodH, w + 1, 0.16, 2.7, x, 3.2, zp, { c: 0x8a6a4e, solid: true });
      B.box(M.woodH, w + 1, 0.09, 0.09, x, 4.3, zpost, { c: trim });
      for (let px = x - w / 2 - 0.4; px <= x + w / 2 + 0.4; px += 0.42) B.box(M.wood, 0.05, 0.95, 0.05, px, 3.36, zpost, { c: trim });
      B.box(M.shingle, w + 1.2, 0.1, 3.0, x, 6.3, zf + dir * 1.35, { rx: dir * 0.17, c: roofC });
      if (o.up) { world.addBox(x, zpost, w + 1, 0.1, 0, 3.36, 4.3); for (const s of [-1, 1]) { B.box(M.woodH, 0.09, 0.09, 2.5, x + s * (w / 2 + 0.45), 4.3, zp, { c: trim }); B.box(M.woodH, 0.06, 0.06, 2.5, x + s * (w / 2 + 0.45), 3.8, zp, { c: trim }); world.addBox(x + s * (w / 2 + 0.45), zp, 0.1, 2.7, 0, 3.36, 4.3); } }
    } else B.box(M.shingle, w + 1.2, 0.1, 3.0, x, 3.1, zf + dir * 1.35, { rx: dir * 0.17, c: roofC });
    if (text) sign(text, x, balcony ? h + 0.55 : h + 0.3, zf + dir * 0.3, w * 0.74, 0.95, { ...signO, ry: dir > 0 ? 0 : Math.PI });
    return { zf, zc, zp };
  }

  // north side (fronts face south, +z) and south side
  bld({ x: -40, w: 12, d: 12, h: 5.4, dir: 1, wall: 0x8a4a34, interior: true, panel: 0xa87858, floorC: 0xc8b08a, ceilC: 0xc8b898, back: -1, text: 'LIVERY & FEED', signO: { bg: '#e8d8b0', fg: '#4a1c10' }, roofC: 0x7a5a44 });
  bld({ x: -24, w: 11, d: 10, h: 4.7, dir: 1, wall: 0xc9b68a, interior: true, panel: 0xc8b890, floorC: 0xc8b08a, ceilC: 0xc8b898, flat: true, back: 3.2, text: 'GENERAL STORE', signO: { bg: '#2a4a3a', fg: '#f0e2b0' } });
  const sal = bld({ x: -4, w: 16, d: 13, h: 7.4, dir: 1, wall: 0x9a3a2a, trim: 0xe8d8b0, balcony: true, interior: true, up: true, well: [2.3, 3.8, -15, -10.4], back: 6.7, ceilC: 0xc8a480, text: 'SALOON', signO: { bg: '#f0e0b0', fg: '#7a1810', size: 100 } });
  bld({ x: 12.5, w: 10, d: 11, h: 4.9, dir: 1, wall: 0x9a9080, trim: 0x2a2a2a, interior: true, panel: 0x8a8274, text: 'JAIL', signO: { bg: '#1c1c1c', fg: '#e8e0d0', size: 100 } });
  bld({ x: 26, w: 8, d: 8, h: 4.3, dir: 1, wall: 0x8a7a64, interior: true, panel: 0xb8a078, floorC: 0xc8b08a, ceilC: 0xc8b898, flat: true, text: 'SHERIFF', signO: { bg: '#e8d8b0', fg: '#1c1c1c' } });
  bld({ x: 38, w: 9, d: 9, h: 5.0, dir: 1, wall: 0xb8a48a, trim: 0x3a3a3a, interior: true, panel: 0x3e5244, back: 3, text: 'BANK', signO: { bg: '#1c1c1c', fg: '#d9b23a' } });
  bld({ x: -38, w: 10, d: 9, h: 4.5, dir: -1, wall: 0x5a4a3e, interior: true, panel: 0x6a5a4a, floorC: 0xa89880, ceilC: 0xa89880, flat: true, text: 'BLACKSMITH', signO: { bg: '#1c1410', fg: '#e0a040' } });
  bld({ x: -21, w: 14, d: 11, h: 7.6, dir: -1, wall: 0xd8ceb0, trim: 0x5a6a5a, balcony: true, interior: true, panel: 0xc8b490, floorC: 0xd8c4a0, ceilC: 0xd8c8a8, up: true, well: [-27.8, -26.3, 12.4, 17], back: 2, text: 'GRAND HOTEL', signO: { bg: '#3a5a4a', fg: '#f0e2b0' } });
  bld({ x: -4, w: 8, d: 8, h: 4.5, dir: -1, wall: 0x3a3a40, trim: 0x1c1c1c, interior: true, panel: 0x9a9aa8, floorC: 0xa89880, ceilC: 0xa8a098, back: 2.4, text: 'UNDERTAKER', signO: { bg: '#1c1c1c', fg: '#c9c9c9' } });
  bld({ x: 8, w: 7, d: 8, h: 4.3, dir: -1, wall: 0xb8c4c8, trim: 0x8a2a2a, interior: true, panel: 0xc8d4d0, floorC: 0xd8c4a0, ceilC: 0xd8c8a8, text: 'BARBER', signO: { bg: '#f0f0e8', fg: '#8a1c1c' } });
  bld({ x: 21, w: 8, d: 8, h: 4.5, dir: -1, wall: 0xa88a5a, interior: true, panel: 0xc8a878, floorC: 0xc8b08a, ceilC: 0xc8b898, flat: true, text: 'TELEGRAPH', signO: { bg: '#e8d8b0', fg: '#3a2a1a' } });
  bld({ x: 35, w: 9, d: 9, h: 4.7, dir: -1, wall: 0xc8b8a0, trim: 0x4a5a6a, interior: true, panel: 0xdcdcd0, floorC: 0xd8c4a0, ceilC: 0xd8c8a8, back: -2.5, text: 'DOCTOR', signO: { bg: '#f0f0e8', fg: '#1c3a5a' } });

  // ---- saloon interior ---------------------------------------------------------
  {
    const x = -4, zb = -8 - 13 + 0.5;
    B.box(M.woodH, 8.5, 1.05, 0.8, x - 1.5, 0.3, zb + 2.2, { c: 0x5a3420, solid: true });
    B.box(M.woodH, 8.9, 0.08, 1.0, x - 1.5, 1.35, zb + 2.2, { c: 0x8a5a36 });
    B.box(M.woodH, 8.5, 2.4, 0.4, x - 1.5, 0.3, zb + 0.35, { c: 0x4a2c1c });
    B.geo(M.window, new THREE.BoxGeometry(3.2, 1.3, 0.05), [x - 1.5, 2.1, zb + 0.58]);
    for (let i = 0; i < 26; i++) {
      const bx = x - 5.4 + (i % 13) * 0.62 + (R() - 0.5) * 0.1, by = i < 13 ? 1.42 : 3.0;
      if (i < 13 || Math.abs(bx - (x - 1.5)) > 1.8) B.cyl(M.flat, 0.035, 0.06, 0.3, bx, by - (i < 13 ? 0 : 0.3), zb + 0.5 + (i < 13 ? 1.4 : 0.08), { c: R.pick([0x3a6a3a, 0x9a5a1c, 0xc8c0a0, 0x5a2a1a]), seg: 6 });
    }
    for (const [tx, tz] of [[-8.5, -13.5], [0.8, -12.5], [-3.5, -11.2]]) {
      B.cyl(M.woodH, 0.62, 0.62, 0.07, tx, 1.02, tz, { c: 0x7a4a2a, seg: 14 }); B.cyl(M.wood, 0.07, 0.12, 0.74, tx, 0.3, tz, { c: 0x4a2c1c });
      world.addCyl(tx, tz, 0.5, 0.3, 1.1);
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1 + tx, cx = tx + Math.cos(a) * 1.05, cz = tz + Math.sin(a) * 1.05;
        B.box(M.wood, 0.42, 0.06, 0.42, cx, 0.76, cz, { ry: -a, c: 0x6a4428 }); B.box(M.wood, 0.42, 0.55, 0.05, cx + Math.cos(a) * 0.2, 0.8, cz + Math.sin(a) * 0.2, { ry: -a + Math.PI / 2, c: 0x6a4428 });
        for (const [lx, lz] of [[0.17, 0.17], [-0.17, 0.17], [0.17, -0.17], [-0.17, -0.17]]) B.box(M.wood, 0.05, 0.46, 0.05, cx + lx, 0.3, cz + lz, { c: 0x4a2c1c });
      }
    }
    // piano
    B.box(M.woodH, 1.6, 1.25, 0.65, x + 5.6, 0.3, -18.5, { c: 0x2a1810, solid: true }); B.box(M.flat, 1.4, 0.05, 0.25, x + 5.6, 1.05, -18.05, { c: 0xf0ece0 });
    // wagon-wheel chandeliers
    for (const cz of [-12, -17]) {
      B.geo(M.wood, new THREE.TorusGeometry(0.9, 0.05, 6, 18), [x, 3.1, cz], [Math.PI / 2, 0, 0], 1, 0x4a2c1c);
      B.box(M.metal, 0.03, 0.75, 0.03, x, 3.1, cz, { c: 0x2a2a2a });
      for (let k = 0; k < 6; k++) B.geo(M.glow, new THREE.SphereGeometry(0.07, 6, 5), [x + Math.cos(k * 1.047) * 0.9, 3.25, cz + Math.sin(k * 1.047) * 0.9], [0, 0, 0], 1, 0xffa040);
      const pl = new THREE.PointLight(0xffa650, 46, 15, 1.8); pl.position.set(x, 2.9, cz); root.add(pl);
    }
  }
  // ---- jail: the marshal's office in front, two cells behind -------------------------
  {
    const X0 = 7.85, X1 = 17.15, ZB = -18.65, ZC = -13.4, F = 0.3, TOP = 3.8;
    bars(B, M, X0, ZC, 9.2, ZC, F, TOP); bars(B, M, 10.8, ZC, 14.2, ZC, F, TOP); bars(B, M, 15.8, ZC, X1, ZC, F, TOP);
    bars(B, M, 9.2, ZC, 10.8, ZC, 2.45, TOP); bars(B, M, 14.2, ZC, 15.8, ZC, 2.45, TOP);
    bars(B, M, 12.5, ZC, 12.5, ZB, F, TOP);                                       // between the cells
    bars(B, M, 9.2, ZC, 10.8, ZC, F, 2.45); bars(B, M, 15.8, ZC, 16.5, ZC + 1.4, F, 2.45);   // cell doors: the west one locked on the deputy, the east one swung open
    for (const bx of [8.35, 16.65]) {
      B.box(M.woodH, 0.8, 0.42, 1.9, bx, F, -17.5, { c: 0x5a4030, solid: true }); B.box(M.cloth, 0.76, 0.08, 1.5, bx, F + 0.42, -17.3, { c: 0x6a6a72 }); B.box(M.cloth, 0.5, 0.1, 0.3, bx, F + 0.44, -18.25, { c: 0xc8c0a8 });
      B.cyl(M.metal, 0.15, 0.12, 0.26, bx + (bx < 12 ? 2.6 : -2.6), F, -18.2, { c: 0x4a4a4e, seg: 8 });
    }
    for (const wx of [10, 15]) { B.box(M.flat, 0.9, 0.6, 0.05, wx, 2.5, ZB + 0.03, { c: 0xf0c890 }); bars(B, M, wx - 0.45, ZB + 0.08, wx + 0.45, ZB + 0.08, 2.5, 3.1, { solid: false, gap: 0.15 }); }
    // office
    B.box(M.woodH, 1.8, 0.78, 0.85, 9.7, F, -10.6, { c: 0x5a3a22, solid: true }); B.box(M.woodH, 1.9, 0.05, 0.95, 9.7, F + 0.78, -10.6, { c: 0x7a5232 });
    B.box(M.flat, 0.3, 0.02, 0.4, 9.4, F + 0.84, -10.6, { ry: 0.3, c: 0xe8dcc0 }); B.box(M.glow, 0.1, 0.22, 0.1, 10.3, F + 0.84, -10.8, { c: 0xffb050 });
    B.box(M.wood, 0.45, 0.45, 0.45, 9.7, F, -11.6, { c: 0x6a4428 }); B.box(M.wood, 0.45, 0.6, 0.06, 9.7, F + 0.45, -11.85, { c: 0x6a4428 });
    B.box(M.woodH, 0.12, 1.3, 1.9, X0 + 0.1, F + 0.9, -10.4, { c: 0x4a2c1c });                 // rifle rack
    for (let i = 0; i < 4; i++) { B.cyl(M.metal, 0.018, 0.018, 1.05, X0 + 0.22, F + 1.0, -11.1 + i * 0.46, { c: 0x2a2a2e, seg: 5 }); B.box(M.wood, 0.05, 0.4, 0.08, X0 + 0.22, F + 0.95, -11.1 + i * 0.46, { c: 0x5a3420 }); }
    for (let i = 0; i < 3; i++) { B.box(M.flat, 0.04, 0.62, 0.46, X1 - 0.05, F + 1.5 + (i % 2) * 0.1, -9.6 - i * 0.75, { c: 0xe8d8b0 }); B.box(M.flat, 0.05, 0.26, 0.26, X1 - 0.06, F + 1.72 + (i % 2) * 0.1, -9.6 - i * 0.75, { c: 0x4a3a2a }); }
    B.cyl(M.metal, 0.3, 0.34, 0.9, 16.2, F, -12.3, { c: 0x1c1c1e, solid: true, seg: 10 }); B.cyl(M.metal, 0.09, 0.09, 2.6, 16.2, F + 0.9, -12.3, { c: 0x1c1c1e, seg: 8 });
    B.cyl(M.metal, 0.12, 0.12, 0.03, 12.5, 2.6, ZC + 0.12, { rx: Math.PI / 2, c: 0xb8923a, seg: 10, open: true });   // key ring on the bars
    const pl = new THREE.PointLight(0xffb060, 30, 13, 1.8); pl.position.set(12.5, 3.2, -11); root.add(pl);
  }
  // ---- bank: counter, teller's cage, the safe ---------------------------------------
  {
    const X0 = 33.85, X1 = 42.15, F = 0.3;
    B.box(M.woodH, 6.4, 1.1, 0.7, X0 + 3.2, F, -11.6, { c: 0x4a3020, solid: true }); B.box(M.woodH, 6.5, 0.06, 0.86, X0 + 3.2, F + 1.1, -11.6, { c: 0x7a5232 });
    bars(B, M, X0, -11.6, X0 + 2.4, -11.6, F + 1.16, 2.9, { c: 0xb8923a }); bars(B, M, X0 + 3.6, -11.6, X0 + 6.4, -11.6, F + 1.16, 2.9, { c: 0xb8923a });
    B.box(M.metal, 2.3, 2.5, 1.5, X0 + 1.3, F, -15.75, { c: 0x34383e, solid: true });                                 // the safe
    B.cyl(M.metal, 0.85, 0.85, 0.16, X0 + 1.3, F + 0.45, -14.95, { rx: Math.PI / 2, c: 0x4a4e56, seg: 18 });
    B.geo(M.metal, new THREE.TorusGeometry(0.3, 0.035, 6, 14), [X0 + 1.3, F + 1.3, -14.83], [0, 0, 0], 1, 0xc9a23a);
    for (let k = 0; k < 4; k++) B.box(M.metal, 0.04, 0.62, 0.04, X0 + 1.3, F + 1.0, -14.83, { rz: k * Math.PI / 4, c: 0xc9a23a });
    B.box(M.woodH, 1.5, 0.76, 0.8, 38.6, F, -15.6, { c: 0x5a3a22, solid: true });
    for (let k = 0; k < 6; k++) B.box(M.metal, 0.3, 0.1, 0.14, 38.3 + (k % 3) * 0.33, F + 0.78 + Math.floor(k / 3) * 0.1, -15.6, { c: 0xe0b020 });
    for (const [sx, sz] of [[37.2, -13.2], [37.7, -13.5], [36.9, -13.8]]) B.geo(M.cloth, new THREE.SphereGeometry(0.26, 8, 6), [sx, F + 0.2, sz], [0, 0, 0], [1, 0.8, 1], 0xb8a070);
    B.box(M.flat, 2.2, 0.9, 0.05, 38, 2.2, -16.62, { c: 0x2a3a30 }); B.box(M.flat, 1.9, 0.66, 0.06, 38, 2.32, -16.6, { c: 0xd8c890 });
    const pl = new THREE.PointLight(0xffc070, 30, 12, 1.8); pl.position.set(38, 3.2, -12.6); root.add(pl);
  }
  const extraFoes = [], extraPicks = [];
  // ---- more doors that open: store, sheriff, livery, smithy, undertaker, telegraph -------------
  {
    const F = 0.3;
    // general store
    B.box(M.woodH, 6.2, 1.05, 0.7, -25.4, F, -13.6, { c: 0x6a4a2e, solid: true }); B.box(M.woodH, 6.3, 0.06, 0.85, -25.4, F + 1.05, -13.6, { c: 0x8a6a48 });
    shelf(B, M, -25.5, F, -17.35, 0, 6, 2.4); shelf(B, M, -19.2, F, -12.4, -Math.PI / 2, 3.6, 2.2);
    barrel(B, M, -20, F, -9.6); barrel(B, M, -20.8, F, -9.4); crate(B, M, -28.3, F, -9.3, 0.8, 0.2);
    for (const [sx, sz] of [[-27.6, -16.2], [-28.2, -15.6]]) B.geo(M.cloth, new THREE.SphereGeometry(0.3, 8, 6), [sx, F + 0.22, sz], [0, 0, 0], [1, 0.75, 1], 0xc8b890);
    // sheriff's office with one cell
    B.box(M.woodH, 1.6, 0.78, 0.8, 24, F, -13.2, { c: 0x5a3a22, solid: true }); B.box(M.wood, 0.45, 0.45, 0.45, 24, F, -14.3, { c: 0x6a4428 });
    bars(B, M, 26.6, -12, 27.3, -12, F, 3.8); bars(B, M, 28.9, -12, 29.6, -12, F, 3.8); bars(B, M, 27.3, -12, 28.9, -12, 2.45, 3.8); bars(B, M, 26.6, -12, 26.6, -15.6, F, 3.8); bars(B, M, 27.3, -12, 26.9, -10.6, F, 2.45);
    B.box(M.woodH, 0.8, 0.42, 1.9, 29.1, F, -14.4, { c: 0x5a4030, solid: true }); B.box(M.cloth, 0.76, 0.08, 1.5, 29.1, F + 0.42, -14.3, { c: 0x6a6a72 });
    B.box(M.woodH, 1.4, 1.2, 0.12, 23.2, F + 1.0, -15.5, { c: 0x4a2c1c }); for (let i = 0; i < 3; i++) B.cyl(M.metal, 0.018, 0.018, 1.0, 22.8 + i * 0.4, F + 1.05, -15.4, { c: 0x2a2a2e, seg: 5 });
    // livery stable: stalls, hay, a horse
    for (const sz of [-11.5, -14.5, -17.5]) B.box(M.wood, 3.2, 1.35, 0.14, -43.9, F, sz, { c: 0x6a4a30, solid: true });
    B.geo(M.flat, horseGeo(0x3a2a1c, 0x14100c), [-43.6, F, -13], [0, 1.57, 0]); beast(world, -43.6, -13, 1.57, 0.9, 2.8, F, 2.2, 0.25);
    for (const [hx, hz, hy] of [[-35.4, -18.6, 0], [-36.9, -18.6, 0], [-36.1, -18.6, 0.8], [-35.3, -10.2, 0]]) B.box(M.thatch, 1.5, 0.8, 0.9, hx, F + hy, hz, { c: 0xd8b860, solid: true });
    B.box(M.woodH, 0.5, 0.9, 1.6, -38.6, F, -18.8, { c: 0x5a3a24, solid: true }); B.box(M.cloth, 0.56, 0.2, 0.7, -38.6, F + 0.9, -18.8, { c: 0x6a3420 });
    // blacksmith: forge, anvil, tools
    B.box(M.stone, 1.7, 0.95, 1.3, -40.6, F, 15.3, { c: 0x6a625a, solid: true }); B.box(M.glow, 1.1, 0.06, 0.8, -40.6, F + 0.95, 15.3, { c: 0xff5a1a }); B.box(M.stone, 1.3, 2.6, 0.5, -40.6, F + 0.95, 16.2, { c: 0x6a625a });
    B.cyl(M.wood, 0.3, 0.34, 0.6, -37.6, F, 12.6, { c: 0x5a3a24, seg: 8 }); B.box(M.metal, 0.7, 0.26, 0.28, -37.6, F + 0.6, 12.6, { c: 0x3a3e44 }); world.addCyl(-37.6, 12.6, 0.4, F, 1.2);
    barrel(B, M, -34.4, F, 15.6, 0x4a5a6a); B.box(M.woodH, 0.14, 1.4, 2.2, -42.4, F + 0.9, 11.5, { c: 0x4a2c1c }); for (let i = 0; i < 4; i++) B.box(M.metal, 0.04, 0.9, 0.06, -42.3, F + 1.0, 10.7 + i * 0.5, { c: 0x4a4e56 });
    // undertaker: coffins on trestles and against the wall
    for (const [cx, cz] of [[-5.6, 12], [-3.6, 13.4]]) { B.box(M.wood, 0.62, 0.42, 1.95, cx, F + 0.55, cz, { c: 0x3a2618 }); B.box(M.wood, 0.5, 0.55, 1.5, cx, F, cz, { c: 0x5a4030 }); world.addBox(cx, cz, 0.62, 1.95, 0, F, F + 1.0); }
    for (const cx of [-6.8, -5.9]) B.box(M.wood, 0.62, 1.95, 0.42, cx, F, 15.3, { rx: -0.12, c: 0x2a1c12 }); world.addBox(-6.3, 15.3, 1.7, 0.5, 0, F, F + 2);
    B.box(M.woodH, 1.3, 0.76, 0.7, -1.4, F, 10, { c: 0x2a2018, solid: true });
    // telegraph office: counter, key, a small safe
    B.box(M.woodH, 4.6, 1.05, 0.7, 20.4, F, 12.4, { c: 0x6a4a2e, solid: true }); B.box(M.metal, 0.3, 0.1, 0.2, 19.6, F + 1.08, 12.4, { c: 0xb8923a });
    B.box(M.woodH, 1.5, 0.76, 0.8, 23.4, F, 14.8, { c: 0x5a3a22, solid: true }); B.cyl(M.wood, 0.4, 0.4, 0.5, 18.4, F, 15, { c: 0x8a6a48, seg: 10, solid: true });
    B.box(M.metal, 0.8, 1.0, 0.7, 18.2, F, 9.2, { c: 0x34383e, solid: true });
    extraFoes.push(['bandit', -22, -11.5, { y: 1, patrol: false }], ['cowboy', 25.2, -10, { y: 1, patrol: false }], ['bandit', -38, -12, { y: 1, patrol: false }], ['cowboy', -36.5, 10.5, { y: 1, patrol: false }], ['bandit', 22, 10.2, { y: 1, patrol: false }]);
    extraPicks.push([-28, -16.6, 1], [28.9, -13, 1], [-3.2, 15, 1]);
  }
  // ---- upper floors, the three houses that used to be shut, and the people who stayed in town ----------------
  const people = [];
  const who = (look, x, y, z, yaw, o) => people.push(person(B, M, root, look, x, y, z, yaw, o));
  // a wall inside a house from (x0, z0) to (x1, z1), along X or along Z, with door openings [from, to] measured along it
  const part = (x0, z0, x1, z1, y, h, c, gaps = []) => {
    const ax = z0 === z1, piece = (a, b, yy, hh, solid) => { if (b - a > 0.02) B.box(M.wood, ax ? b - a : 0.14, hh, ax ? 0.14 : b - a, ax ? (a + b) / 2 : x0, yy, ax ? z0 : (a + b) / 2, { c, solid }); };
    let cur = ax ? x0 : z0;
    for (const [a, b] of gaps) { piece(cur, a, y, h, true); piece(a, b, y + 2.15, h - 2.15, false); cur = b; }
    piece(cur, ax ? x1 : z1, y, h, true);
  };
  const rail = (x0, z0, x1, z1, y, c = 0x9a7450) => {          // a hand rail, 0.95 m high
    const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), n = Math.max(1, Math.round(L / 0.5));
    B.box(M.woodH, L, 0.07, 0.09, (x0 + x1) / 2, y + 0.88, (z0 + z1) / 2, { ry, c });
    for (let i = 0; i <= n; i++) B.box(M.wood, 0.05, 0.9, 0.05, x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n, { c });
    world.addBox((x0 + x1) / 2, (z0 + z1) / 2, L, 0.1, ry, y, y + 0.95);
  };
  const flight = (x, z, ry, side, c = 0xc8a878) => {          // stairs from the upper floor (4.0) down to the ground floor (0.3): enemies can follow; a hand rail on one side
    const n = 11, run = 0.42, L = n * run, sn = Math.sin(ry), cs = Math.cos(ry), at = (k, lz) => [x + k * cs + lz * sn, z - k * sn + lz * cs];
    steps(B, M, x, z, ry, 4.0, n, { w: 1.3, rise: 3.7 / 12, run, mat: M.woodH, c });
    { const [fx, fz] = at(0, 0.45); B.box(M.wood, 1.3, 0.5, 0.9, fx, 0.3, fz, { ry, c }); }
    { const [hx, hz] = at(side * 0.62, L / 2); B.box(M.woodH, 0.07, 0.07, Math.hypot(L, 3.4), hx, 3.2, hz, { ry, rx: Math.atan2(3.4, L), c: 0x9a7450 }); }
    for (let i = 0; i < n; i += 2) { const [bx, bz] = at(side * 0.62, (i + 0.5) * run); B.box(M.wood, 0.05, 0.95, 0.05, bx, 4.0 - (i + 1) * 3.7 / 12, bz, { c: 0x9a7450 }); }
  };
  const basin = (x, y, z) => { B.cyl(M.flat, 0.17, 0.1, 0.1, x, y, z, { c: 0xe8e4d8, seg: 10 }); B.cyl(M.flat, 0.06, 0.08, 0.24, x + 0.28, y, z, { c: 0xd8d4c8, seg: 8 }); };
  const LW = 0xc8a878;                                        // pale wood: rooms without a lamp need light colours
  const lamp = (x, y, z) => { B.cyl(M.metal, 0.05, 0.07, 0.08, x, y, z, { c: 0xb8923a, seg: 8 }); B.box(M.glow, 0.07, 0.16, 0.07, x, y + 0.08, z, { c: 0xffb050 }); };
  { // saloon: stairs by the east wall up to a hall, two bedrooms and the balcony; stools at the bar, a card game left lying, the barkeeper and the pianist
    const F = 0.3, U = 4.0, WC = 0xc88a70;
    flight(2.95, -15, 0, -1); rail(2.3, -15, 2.3, -10.4, U); rail(2.3, -10.4, 3.65, -10.4, U);
    part(-11.65, -16.6, 3.65, -16.6, U, 3.2, WC, [[-8.7, -7.3], [-1.7, -0.3]]); part(-4.5, -20.65, -4.5, -16.6, U, 3.2, WC);
    bed(B, M, -10.9, U, -18.8, 0, { c: LW, blanket: 0x7a2a2a }); chest(B, M, -5.3, U, -19.6, Math.PI / 2, { c: LW }); table(B, M, -8, U, -20.3, 0, { c: LW, w: 0.9, d: 0.5, solid: false }); basin(-8.1, U + 0.78, -20.3); rug(B, M, -8.4, U, -18.4, 0, { w: 2.2, d: 1.4, c: 0x4a5a3a });
    bed(B, M, 1.5, U, -19.95, Math.PI / 2, { c: LW, w: 1.3, blanket: 0x3a4a6a }); chest(B, M, -3.8, U, -19.4, Math.PI / 2, { c: 0x6a3a22 }); table(B, M, 3.2, U, -18.6, 0, { c: LW, w: 0.6, d: 0.6, h: 0.6, solid: false }); lamp(3.2, U + 0.6, -18.6); rug(B, M, -1.2, U, -18.4, 0, { w: 2.2, d: 1.4 });
    B.cyl(M.woodH, 0.55, 0.55, 0.06, -7.6, U + 0.7, -12, { c: LW, seg: 14 }); B.cyl(M.wood, 0.07, 0.12, 0.7, -7.6, U, -12, { c: 0x9a7450 }); world.addCyl(-7.6, -12, 0.5, U, U + 0.8);
    bench(B, M, -7.6, U, -13, Math.PI, { c: LW, w: 0.44, d: 0.42, back: 0.5 }); bench(B, M, -8.7, U, -12, Math.PI / 2, { c: LW, w: 0.44, d: 0.42, back: 0.5 }); lamp(-7.6, U + 0.76, -12);
    bench(B, M, -11.3, U, -11.6, Math.PI / 2, { w: 2.2, d: 0.55, back: 0.5, c: 0x7a2a2a }); shelf(B, M, -11.4, U, -9.3, Math.PI / 2, 1.4, 1.8, { goods: [0x8a5a2a, 0xc8c0a0, 0x3a6a3a] }); rug(B, M, -4, U, -10.4, 0, { w: 3.2, d: 2.2, c: 0x7a2a2a });
    B.box(M.glow, 0.12, 0.2, 0.12, 3.5, U + 1.9, -16.2, { c: 0xffb050 }); B.box(M.glow, 0.12, 0.2, 0.12, -11.5, U + 1.9, -14, { c: 0xffb050 });
    for (const sx of [-8.6, -6.6, -4.6, -2.6]) { B.cyl(M.woodH, 0.18, 0.18, 0.05, sx, F + 0.68, -17.4, { c: 0x6a3a22, seg: 10 }); B.cyl(M.wood, 0.04, 0.07, 0.68, sx, F, -17.4, { c: 0x4a2c1c, seg: 6 }); }
    for (const sx of [-10.2, -0.8]) B.cyl(M.metal, 0.11, 0.16, 0.2, sx, F, -17.5, { c: 0xb8923a, seg: 10 });
    for (let i = 0; i < 7; i++) B.box(M.flat, 0.07, 0.006, 0.1, -3.75 + (i % 4) * 0.16, 1.09 + i * 0.001, -11.3 + (i > 3 ? 0.3 : 0), { ry: i * 0.9, c: i % 3 ? 0xf0ece0 : 0x8a1c1c });
    for (const [cx, cz, cc] of [[-3.1, -11.0, 0xb01c1c], [-3.2, -11.5, 0x1c3a6a], [-3.9, -10.9, 0xd9b23a]]) B.cyl(M.flat, 0.03, 0.03, 0.05, cx, 1.09, cz, { c: cc, seg: 8 });
    B.cyl(M.flat, 0.035, 0.06, 0.3, 0.9, 1.09, -12.4, { c: 0x5a2a1a, seg: 6 }); B.cyl(M.window, 0.03, 0.025, 0.09, 0.6, 1.09, -12.6, { seg: 6 });
    B.box(M.woodH, 8.4, 0.16, 1.1, -5.5, F, -19.3, { c: 0x6a4428, solid: true });                 // duckboards behind the bar
    who('westWoman', -8.4, F + 0.16, -19.3, 0, { pose: 'hips', over: { face: ['longhair'], hair: 0xd8a84a, extras: ['dress', 'apron', 'collar'], collar: 0xf0ece0, apron: 0xf0ece0, bib: true, dress: 0x2a7a6a, shirt: 0x2a7a6a, sleeve: 0xf0ece0, pants: 0x2a7a6a } });
    bench(B, M, 1.6, F, -17.55, 0, { w: 0.4, d: 0.4, h: 0.5, c: 0x2a1810 }); who('westMan', 1.6, F, -17.55, Math.PI, { pose: 'sit', seat: 0.5, arms: [-1.15, -1.1], over: { hat: null, vest: 0x6a1c1c } });
  }
  { // Grand Hotel: the lobby with its desk and key board, stairs by the west wall up to a hall, two bedrooms and the balcony
    const F = 0.3, U = 4.0, WC = 0xc8bea0;
    flight(-26.95, 17, Math.PI, -1); rail(-26.3, 12.4, -26.3, 17, U); rail(-27.65, 12.4, -26.3, 12.4, U);
    part(-19.5, 8.25, -19.5, 18.65, U, 3.4, WC, [[10.2, 11.6], [15.4, 16.8]]); part(-19.5, 13.5, -13.65, 13.5, U, 3.4, WC);
    B.box(M.woodH, 0.7, 1.05, 4.0, -17.2, F, 12.2, { c: 0xa87a4e, solid: true }); B.box(M.woodH, 0.86, 0.06, 4.1, -17.2, F + 1.05, 12.2, { c: 0xd0aa78 });
    B.box(M.flat, 0.3, 0.03, 0.42, -17.2, F + 1.11, 12.6, { ry: 0.2, c: 0xe8dcc0 }); B.cyl(M.metal, 0.02, 0.07, 0.07, -17.2, F + 1.11, 11.6, { c: 0xc9a23a, seg: 8 }); lamp(-17.2, F + 1.11, 10.6);
    B.box(M.woodH, 0.06, 1.0, 1.8, -13.7, F + 1.2, 12.2, { c: 0x9a6a40 }); for (let i = 0; i < 10; i++) B.box(M.metal, 0.02, 0.1, 0.04, -13.75, F + 1.4 + (i % 2) * 0.4, 11.5 + (i >> 1) * 0.35, { c: 0xc9a23a });
    rug(B, M, -22.3, F, 12, 0, { w: 3.4, d: 2.4, c: 0x7a2a2a }); table(B, M, -23.4, F, 14.3, 0, { c: LW, w: 0.7, d: 0.7, h: 0.6, solid: false }); lamp(-23.4, F + 0.6, 14.3);
    bench(B, M, -24.4, F, 15.4, Math.PI + 0.4, { w: 0.75, d: 0.6, back: 0.5, c: 0x6a3a2a }); bench(B, M, -22.4, F, 15.4, Math.PI - 0.4, { w: 0.75, d: 0.6, back: 0.5, c: 0x6a3a2a });
    B.box(M.woodH, 0.5, 2.1, 0.3, -23, F, 18.4, { c: 0x9a6a40, solid: true }); B.cyl(M.flat, 0.16, 0.16, 0.02, -23, F + 1.6, 18.24, { rx: Math.PI / 2, c: 0xe8e0c8, seg: 12 });
    chest(B, M, -18.8, F, 9.2, 0.3, { c: LW }); chest(B, M, -19.9, F, 9.6, -0.2, { w: 0.7, h: 0.45, c: 0x6a3a22 });
    B.box(M.woodH, 1.6, 0.14, 3.6, -15.4, F, 12.2, { c: LW, solid: true }); who('westWoman', -15.4, F + 0.14, 12.2, -Math.PI / 2, { pose: 'talk', over: { extras: ['dress', 'collar'], dress: 0x3a4a6a, shirt: 0x3a4a6a, sleeve: 0x3a4a6a, pants: 0x3a4a6a } });
    bed(B, M, -14.3, U, 9.5, 0, { c: LW, blanket: 0x7a2a2a }); chest(B, M, -17.4, U, 8.65, 0, { c: LW }); table(B, M, -14.2, U, 12.7, 0, { c: LW, w: 0.8, d: 0.5, solid: false }); basin(-14.3, U + 0.78, 12.7); rug(B, M, -16.6, U, 11, 0, { w: 2, d: 1.4, c: 0x4a5a3a });
    bed(B, M, -14.3, U, 17.4, Math.PI, { c: LW, blanket: 0x3a5a4a }); chest(B, M, -17.4, U, 18.25, 0, { c: 0x6a3a22 }); table(B, M, -14.2, U, 14.3, 0, { c: LW, w: 0.8, d: 0.5, solid: false }); lamp(-14.2, U + 0.78, 14.3); rug(B, M, -16.6, U, 16, 0, { w: 2, d: 1.4 });
    bench(B, M, -23, U, 18.3, Math.PI, { w: 2, d: 0.5, back: 0.5, c: 0x6a3a2a }); table(B, M, -24.5, U, 8.8, 0, { c: LW, w: 1.2, d: 0.6 }); lamp(-24.5, U + 0.78, 8.8); rug(B, M, -22, U, 11, 0, { w: 3, d: 2.2, c: 0x7a2a2a });
    extraFoes.push(['cowboy', -22.5, 13, { y: 1, patrol: false, yaw: Math.PI }]); extraPicks.push([-16.6, 16, U + 0.5]);
  }
  { // barber: the chair before the mirror, a bench to wait on, a tin bath behind a screen
    const F = 0.3;
    B.cyl(M.metal, 0.2, 0.28, 0.35, 9.4, F, 12.3, { c: 0x3a3a40, seg: 10 }); B.box(M.woodH, 0.6, 0.14, 0.62, 9.4, F + 0.35, 12.3, { c: 0x6a1c1c }); B.box(M.woodH, 0.12, 0.75, 0.6, 9.05, F + 0.45, 12.3, { rz: 0.15, c: 0x6a1c1c });
    B.box(M.metal, 0.3, 0.05, 0.5, 9.9, F + 0.2, 12.3, { c: 0x3a3a40 }); world.addBox(9.4, 12.3, 0.8, 0.7, 0, F, F + 1.2);
    B.box(M.woodH, 0.05, 1.1, 1.5, 11.1, F + 1.15, 12.3, { c: 0x4a2c1c }); B.geo(M.window, new THREE.BoxGeometry(0.03, 0.9, 1.3), [11.06, F + 1.7, 12.3]);
    B.box(M.woodH, 0.3, 0.05, 1.8, 10.95, F + 1.0, 12.3, { c: 0x6a4428 }); for (let i = 0; i < 6; i++) B.cyl(M.flat, 0.035, 0.045, 0.2, 10.95, F + 1.05, 11.6 + i * 0.28, { c: [0x3a6a5a, 0xc8a040, 0x8a2a2a, 0xe8e4d8][i % 4], seg: 6 });
    bench(B, M, 5.3, F, 11.2, Math.PI / 2, { c: LW, w: 2.2, d: 0.45, back: 0.5 });
    B.box(M.metal, 0.75, 0.55, 1.6, 5.6, F, 14.6, { c: 0x8a8a8e, solid: true }); B.box(M.flat, 0.6, 0.02, 1.45, 5.6, F + 0.5, 14.6, { c: 0x3a5a66 });
    for (let i = 0; i < 3; i++) B.box(M.cloth, 0.76, 1.7, 0.04, 5.65 + i * 0.72, F, 13.3 + (i % 2 ? 0.08 : -0.08), { ry: i % 2 ? 0.22 : -0.22, c: 0x8a9a8a }); world.addBox(6.37, 13.3, 2.2, 0.2, 0, F, F + 1.7);
    B.cyl(M.metal, 0.28, 0.32, 0.8, 10.6, F, 15.1, { c: 0x1c1c1e, solid: true, seg: 10 }); B.cyl(M.metal, 0.08, 0.08, 2.7, 10.6, F + 0.8, 15.1, { c: 0x1c1c1e, seg: 8 });
    table(B, M, 10.75, F, 13.9, 0, { c: LW, w: 0.6, d: 0.5, h: 0.8, solid: false }); basin(10.7, F + 0.8, 13.9);
    for (let i = 0; i < 7; i++) B.cyl(M.flat, 0.09, 0.09, 0.2, 10.3, F + 0.6 + i * 0.2, 7.55, { c: [0xb01c1c, 0xf0f0e8, 0x1c3a8a, 0xf0f0e8][i % 4], seg: 10 }); B.geo(M.metal, new THREE.SphereGeometry(0.1, 8, 6), [10.3, F + 2.08, 7.55], [0, 0, 0], 1, 0xc9a23a);
    who('westMan', 8.7, F, 13.1, 2.4, { pose: 'talk', over: { hat: null, extras: ['vest', 'apron'], apron: 0xe6e0d0, shirt: 0xe0d8c8 } });
  }
  { // doctor: the examination table, the medicine cabinet, a cot behind a screen, his desk by the door
    const F = 0.3;
    bed(B, M, 36.6, F, 13, 0, { w: 0.8, l: 1.9, h: 0.8, blanket: 0xe6e0d0, head: 0, c: LW });
    shelf(B, M, 38.9, F, 10.6, -Math.PI / 2, 2.4, 2.0, { c: 0xd8d4c8, goods: [0x8a5a2a, 0x3a6a5a, 0xe6e0d0, 0x5a3a6a] });
    table(B, M, 32.2, F, 9.6, 0, { c: LW, w: 1.4, d: 0.7 }); bench(B, M, 32.2, F, 10.4, Math.PI, { c: LW, w: 0.45, d: 0.42, back: 0.5 });
    B.box(M.flat, 0.42, 0.24, 0.2, 32.6, F + 0.78, 9.6, { c: 0x2a1c14 }); B.box(M.flat, 0.3, 0.02, 0.4, 31.9, F + 0.78, 9.6, { ry: -0.2, c: 0xe8dcc0 }); lamp(32.2, F + 0.78, 9.35);
    bed(B, M, 31.5, F, 13.2, 0, { c: LW, blanket: 0x8a9ab0 });
    for (let i = 0; i < 3; i++) B.box(M.cloth, 0.04, 1.7, 0.76, 33.4 + (i % 2 ? 0.08 : -0.08), F, 12.6 + i * 0.72, { ry: i % 2 ? 0.22 : -0.22, c: 0xe6e0d0 }); world.addBox(33.4, 13.32, 0.2, 2.2, 0, F, F + 1.7);
    B.box(M.flat, 0.03, 0.9, 0.6, 30.92, F + 1.2, 11.2, { c: 0xf0ece0 }); for (let i = 0; i < 4; i++) B.box(M.flat, 0.035, 0.07 - i * 0.012, 0.42 - i * 0.05, 30.93, F + 1.9 - i * 0.18, 11.2, { c: 0x1c1c1c });
    who('westMan', 35.7, F, 13, Math.PI / 2, { pose: 'work', over: { hat: null, shirt: 0xf0ece0, vest: 0x2a2a30, face: ['glasses', 'beard'] } });
  }
  { // what the other houses were missing: the store's scales and bolts of cloth, saddles in the livery, horseshoes and bellows at the forge, batteries and wire at the telegraph
    const F = 0.3;
    B.box(M.metal, 0.04, 0.34, 0.04, -24, F + 1.11, -13.6, { c: 0xb8923a }); B.box(M.metal, 0.5, 0.03, 0.03, -24, F + 1.43, -13.6, { c: 0xb8923a }); for (const s of [-1, 1]) B.cyl(M.metal, 0.11, 0.08, 0.03, -24 + s * 0.24, F + 1.22, -13.6, { c: 0xb8923a, seg: 10 });
    for (let i = 0; i < 4; i++) B.cyl(M.cloth, 0.09, 0.09, 0.75, -27.4 + i * 0.22, F + 1.2 + (i % 2) * 0.01, -13.6, { rx: Math.PI / 2, c: [0x8a2a2a, 0x2a4a7a, 0xd8c060, 0x4a6a4a][i], seg: 8 });
    B.box(M.woodH, 0.1, 0.08, 2.6, -34.9, F + 1.1, -13.2, { c: 0x5a3a24 }); for (const sz of [-14.4, -12]) B.box(M.wood, 0.1, 1.1, 0.1, -34.9, F, sz, { c: 0x5a3a24 }); world.addBox(-34.9, -13.2, 0.5, 2.6, 0, F, F + 1.3);
    for (const sz of [-13.9, -12.6]) { B.box(M.flat, 0.5, 0.16, 0.42, -34.9, F + 1.18, sz, { c: 0x6a3a1c }); B.box(M.flat, 0.34, 0.3, 0.06, -34.9, F + 0.9, sz - 0.2, { c: 0x5a3018 }); B.box(M.flat, 0.34, 0.3, 0.06, -34.9, F + 0.9, sz + 0.2, { c: 0x5a3018 }); B.cyl(M.flat, 0.04, 0.05, 0.14, -34.9, F + 1.34, sz, { c: 0x4a2814, seg: 6 }); }
    for (const sz of [-10.4, -9.6]) B.geo(M.flat, new THREE.TorusGeometry(0.3, 0.07, 6, 12), [-34.42, F + 1.9, sz], [0, Math.PI / 2, 0], [1, 1.25, 1], 0x3a2416);
    for (let i = 0; i < 5; i++) B.geo(M.metal, new THREE.TorusGeometry(0.09, 0.02, 4, 8, 4.4), [-37.4 + i * 0.4, F + 1.8, 16.6], [0, 0, 2.5], 1, 0x4a4e56);
    B.geo(M.flat, new THREE.ConeGeometry(0.34, 0.9, 4), [-39.3, F + 0.75, 15.3], [0, Math.PI / 4, Math.PI / 2], [1, 1, 0.5], 0x5a3a24); B.box(M.wood, 0.08, 0.75, 0.08, -39.2, F, 15.3, { c: 0x4a2c1c });
    B.box(M.woodH, 0.3, 0.05, 2.2, 24.45, F + 1.2, 10.6, { c: 0x6a4428 }); for (let i = 0; i < 6; i++) { B.cyl(M.window, 0.08, 0.08, 0.22, 24.45, F + 1.25, 9.7 + i * 0.36, { seg: 8 }); B.cyl(M.metal, 0.012, 0.012, 0.08, 24.45, F + 1.47, 9.7 + i * 0.36, { c: 0xb8923a, seg: 4 }); }
    B.cyl(M.wood, 0.34, 0.34, 0.05, 24.1, F, 8.9, { c: 0x6a4a2e, seg: 12 }); B.cyl(M.metal, 0.22, 0.22, 0.3, 24.1, F + 0.05, 8.9, { c: 0xa85a2a, seg: 12 }); B.cyl(M.wood, 0.34, 0.34, 0.05, 24.1, F + 0.35, 8.9, { c: 0x6a4a2e, seg: 12 }); world.addCyl(24.1, 8.9, 0.34, F, F + 0.4);
    // people who could not get away: the storekeeper with her hands up, the telegraph operator, the deputy locked in his own cell, the undertaker at his work
    who('westWoman', -25.4, F, -15.4, 0, { pose: 'cheer' }); who('westWoman', 20.2, F, 13.6, Math.PI, { pose: 'talk', over: { extras: ['dress', 'collar'], dress: 0xa85a6a, shirt: 0xa85a6a, sleeve: 0xa85a6a, pants: 0xa85a6a } });
    who('westMan', 8.6, F, -17.2, Math.PI / 2, { pose: 'sit', seat: 0.5, over: { hat: null, extras: ['vest', 'star'] } });
    who('westMan', -2.6, F, 13.3, -Math.PI / 2, { pose: 'work', over: { hat: null, shirt: 0x1c1c20, pants: 0x1c1c20, extras: ['coat'], coat: 0x1c1c20 } });
  }
  // batwing doors
  const doors = [];
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(merge([gBox(0.95, 1.15, 0.05, 0x6a3a22, [s * -0.5, 0, 0]), gBox(0.95, 0.08, 0.07, 0xe8d8b0, [s * -0.5, 0.56, 0])]), M.flat);
    m.position.set(-4 + s * 1.05, 1.45, -8.1); m.castShadow = true; root.add(m); doors.push({ m, s, a: 0, v: 0 });
  }

  // ---- street dressing ----------------------------------------------------------
  const hitch = (x, z) => { for (const s of [-1.3, 1.3]) B.box(M.wood, 0.14, 1.1, 0.14, x + s, 0, z, { c: 0x6a4a30 }); B.box(M.woodH, 3.0, 0.1, 0.1, x, 1.0, z, { c: 0x6a4a30 }); world.addBox(x, z, 3, 0.2, 0, 0, 1.05); };
  hitch(-24, -4.8); hitch(20, -4.8); hitch(-21, 4.8); hitch(21, 4.8); hitch(35, 4.8);
  const trough = (x, z) => { B.box(M.woodH, 2.2, 0.55, 0.8, x, 0, z, { c: 0x6a5038, solid: true }); B.box(M.glow, 1.9, 0.02, 0.5, x, 0.54, z, { c: 0x1a3a44 }); };
  trough(-9, 4.6); trough(30, -4.6);
  for (const [x, z, y] of [[-17.2, -6.9, 0.3], [-16.6, -6.2, 0.3], [9.2, -6.6, 0.3], [-30.2, 6.7, 0.3], [0.9, 6.6, 0.3], [16, 6.7, 0.3], [30.8, -6.8, 0.3], [-46.5, -7, 0.3], [43, -6.5, 0.3], [42.4, -7.1, 0.3]]) barrel(B, M, x, y, z);
  crate(B, M, -18.4, 0.3, -6.7, 0.8, 0.2); crate(B, M, -18.3, 1.1, -6.7, 0.6, 0.5); crate(B, M, 3.4, 0.3, 6.6, 0.9, 0.1); crate(B, M, 25.6, 0.3, 6.7, 0.75, 0.3); crate(B, M, 26.4, 0.3, 6.5, 0.6, 0.8);
  crate(B, M, 20, 0, 2.5, 1.0, 0.4); crate(B, M, 21.1, 0, 2.9, 0.8, 1.0); crate(B, M, 20.4, 1.0, 2.6, 0.7, 0.7);
  // lamp posts
  for (const [x, z] of [[-30, -5.1], [-12, 5.1], [4, -5.1], [17, 5.1], [32, -5.1], [44, 5.1]]) {
    B.box(M.wood, 0.14, 3.4, 0.14, x, 0, z, { c: 0x2a2018 }); B.box(M.woodH, 0.7, 0.08, 0.08, x + 0.3, 3.3, z, { c: 0x2a2018 });
    B.box(M.glow, 0.2, 0.28, 0.2, x + 0.55, 2.9, z, { c: 0xffa040 }); B.cyl(M.metal, 0.02, 0.2, 0.12, x + 0.55, 3.18, z, { c: 0x1a1a1a, seg: 4 });
    world.addCyl(x, z, 0.12, 0, 3.4);
  }
  // covered wagon
  const wheel = () => merge([xf(new THREE.TorusGeometry(0.62, 0.055, 6, 18), [0, 0, 0], [0, Math.PI / 2, 0], 1, 0x4a3020), gBox(0.05, 1.2, 0.07, 0x5a3a24, [0, 0, 0]), gBox(0.05, 1.2, 0.07, 0x5a3a24, [0, 0, 0], [Math.PI / 3, 0, 0]), gBox(0.05, 1.2, 0.07, 0x5a3a24, [0, 0, 0], [-Math.PI / 3, 0, 0]), gCyl(0.1, 0.1, 0.16, 0x3a2416, [0, 0, 0], [0, 0, Math.PI / 2])]);
  const wagon = (x, z, ry, cover) => {
    const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    B.box(M.woodH, 1.6, 0.6, 3.4, x, 0.78, z, { ry, c: 0x7a5434 }); B.box(M.woodH, 1.5, 0.1, 3.3, x, 0.7, z, { ry, c: 0x4a3020 });
    for (const [lx, lz] of [[0.92, 1.1], [-0.92, 1.1], [0.92, -1.1], [-0.92, -1.1]]) { const [wx, wz] = P(lx, lz); B.geo(M.flat, wheel(), [wx, 0.67, wz], [0, ry, 0]); }
    const [tx, tz] = P(0, 2.9); B.box(M.wood, 0.1, 0.1, 2.6, tx, 0.62, tz, { ry, rx: 0.2, c: 0x5a3a24 });
    if (cover) {
      const g = new THREE.CylinderGeometry(0.95, 0.95, 3.3, 14, 1, true, 0, Math.PI);
      B.geo(M.cloth, g, [x, 1.3, z], [Math.PI / 2, ry + Math.PI / 2, 0], [1, 1, 1.25], 0xe0d6c0);
    }
    world.addBox(x, z, 2.0, 3.6, ry, 0, cover ? 2.4 : 1.4);
  };
  wagon(-13, 1.5, 0.5, true); wagon(42.5, -2, 1.9, false);
  // stone well at the crossroads
  B.cyl(M.stone, 1.15, 1.25, 0.9, 6, 0, 0.5, { c: 0xb8a890, solid: true, seg: 14 }); B.cyl(M.flat, 0.9, 0.9, 0.02, 6, 0.9, 0.5, { c: 0x10181c, seg: 14 });
  for (const s of [-1, 1]) B.box(M.wood, 0.16, 2.4, 0.16, 6 + s * 1.05, 0.4, 0.5, { c: 0x5a3a24 });
  B.geo(M.shingle, prismGeo(1.8, 0.7, 3.0, 3), [6, 2.8, 0.5], [0, Math.PI / 2, 0], 1, 0x8a6a52); B.cyl(M.wood, 0.06, 0.06, 2.2, 6, 2.5, 0.5, { rz: Math.PI / 2, c: 0x4a3020, seg: 6 });

  // ---- water tower, windmill ------------------------------------------------------
  {
    const x = -52, z = -17;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { B.box(M.wood, 0.3, 7.4, 0.3, x + sx * 2, 0, z + sz * 2, { rz: sx * 0.06, rx: -sz * 0.06, c: 0x6a4a30 }); world.addCyl(x + sx * 2, z + sz * 2, 0.25, 0, 7); }
    for (const y of [2.4, 5]) { B.box(M.woodH, 4.3, 0.16, 0.12, x, y, z + 2, { c: 0x6a4a30 }); B.box(M.woodH, 4.3, 0.16, 0.12, x, y, z - 2, { c: 0x6a4a30 }); B.box(M.woodH, 0.12, 0.16, 4.3, x + 2, y, z, { c: 0x6a4a30 }); B.box(M.woodH, 0.12, 0.16, 4.3, x - 2, y, z, { c: 0x6a4a30 }); }
    // a catwalk round the tank, reached by the ladder on the east side: the highest look-out over the barn and the corral
    B.box(M.woodH, 7.4, 0.25, 7.4, x, 7.3, z, { c: 0x5a4030, solid: true }); world.addCyl(x, z, 2.5, 7.55, 11); ladder(B, M, x + 3.7, z, 1, 0, 0, 7.55); extraPicks.push([x, z - 3.1, 8.05]);
    for (const [a, b, c, e] of [[-3.65, -3.65, 3.65, -3.65], [-3.65, 3.65, 3.65, 3.65], [-3.65, -3.65, -3.65, 3.65], [3.65, -3.65, 3.65, -0.6], [3.65, 0.6, 3.65, 3.65]]) rail(x + a, z + b, x + c, z + e, 7.55, 0x6a4a30);
    B.cyl(M.wood, 2.5, 2.4, 3.4, x, 7.55, z, { c: 0x8a6444, seg: 18 });
    for (const y of [8.2, 10.2]) B.cyl(M.metal, 2.53, 2.53, 0.1, x, y, z, { c: 0x2a2a2e, seg: 18, open: true });
    B.geo(M.shingle, new THREE.ConeGeometry(2.9, 1.5, 18), [x, 11.7, z], [0, 0, 0], 1, 0x6a4e3c);
  }
  const fan = new THREE.Group();
  {
    const x = -60, z = 24;
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { B.box(M.wood, 0.16, 9.2, 0.16, x + sx * 0.75, 0, z + sz * 0.75, { rz: sx * 0.11, rx: -sz * 0.11, c: 0x7a6a58 }); }
    for (const y of [2, 4.4, 6.6]) { const k = 1.5 * (1 - y / 12); B.box(M.woodH, k * 2, 0.08, 0.08, x, y, z + k, { c: 0x7a6a58 }); B.box(M.woodH, k * 2, 0.08, 0.08, x, y, z - k, { c: 0x7a6a58 }); B.box(M.woodH, 0.08, 0.08, k * 2, x + k, y, z, { c: 0x7a6a58 }); B.box(M.woodH, 0.08, 0.08, k * 2, x - k, y, z, { c: 0x7a6a58 }); }
    world.addCyl(x, z, 1.1, 0, 4.4); world.addCyl(x, z, 0.5, 4.4, 9);
    // a platform half-way up the windmill, by ladder
    B.box(M.woodH, 3.6, 0.12, 3.6, x, 4.4, z, { c: 0x7a6a58, solid: true }); ladder(B, M, x, z + 1.8, 0, 1, 0, 4.52, { c: 0x7a6a58 });
    for (const [a, b, c, e] of [[-1.75, -1.75, 1.75, -1.75], [-1.75, -1.75, -1.75, 1.75], [1.75, -1.75, 1.75, 1.75]]) rail(x + a, z + b, x + c, z + e, 4.52, 0x7a6a58);
    const blades = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; blades.push(gBox(0.34, 1.25, 0.02, 0xb8b0a0, [Math.sin(a) * 1.05, Math.cos(a) * 1.05, 0], [0, 0.35, -a])); }
    blades.push(xf(new THREE.TorusGeometry(1.65, 0.03, 5, 24), [0, 0, 0], [0, 0, 0], 1, 0x8a8478), xf(new THREE.TorusGeometry(0.45, 0.03, 5, 16), [0, 0, 0], [0, 0, 0], 1, 0x8a8478));
    const fm = new THREE.Mesh(merge(blades), M.flat2); fm.castShadow = true; fan.add(fm);
    fan.position.set(x - 0.5, 9.4, z); fan.rotation.y = Math.PI / 2; root.add(fan);
    B.box(M.flat, 1.6, 0.06, 0.06, x + 0.5, 9.37, z, { c: 0x6a6258 }); B.box(M.flat2, 0.9, 0.7, 0.03, x + 1.6, 9.05, z, { c: 0xa83a2a });
  }

  // ---- church + boot hill -----------------------------------------------------------
  {
    const x = 62, z = -27, WH = 0xe8e2d2, DK = 0x5a4030, tz = -18.6, TOP = 11, GAL = 3.7, RISE = (TOP - GAL) / 20;
    // The nave. You come in through the base of the tower; the windows are real openings.
    room(B, M, x, 0, z, { w: 8, d: 13, h: 5.6, t: 0.3, mat: M.wood, c: WH, base: 0.4, doors: [{ side: 's', at: 0, w: 1.6, h: 2.5 }],
      wins: [{ side: 's', at: 1.38, w: 1.05, y: GAL, h: 1.85 }, ...[-1, 1].flatMap((sd) => [-3.5, 0, 3.5].map((at) => ({ side: sd > 0 ? 'e' : 'w', at, w: 1.0, y: 1.8, h: 2.2 })))],
      floor: { mat: M.woodH, c: 0x8a6a4a }, ceil: false });
    B.geo(M.shingle, prismGeo(8.8, 3.2, 13.6, 3), [x, 5.6, z], [0, 0, 0], 1, 0x5a4a44);
    for (const zz of [-25, -26.5, -28, -29.5, -31]) for (const [px, pw] of [[60.5, 1.2], [64.2, 2.6]]) {                 // pews, facing the altar
      B.box(M.woodH, pw, 0.45, 0.5, px, 0.06, zz, { c: 0x6a4a30, solid: true }); B.box(M.woodH, pw, 0.9, 0.08, px, 0.06, zz + 0.29, { c: 0x6a4a30 });
    }
    B.box(M.woodH, 2.2, 0.95, 0.9, x, 0.06, -32.6, { c: DK, solid: true }); B.box(M.cloth, 2.3, 0.04, 1.0, x, 1.01, -32.6, { c: 0xf0ece0 });
    B.box(M.woodH, 0.14, 1.7, 0.06, x, 2.3, -33.3, { c: DK }); B.box(M.woodH, 0.9, 0.14, 0.06, x, 3.3, -33.3, { c: DK });
    for (const k of [-0.8, 0.8]) { B.cyl(M.metal, 0.03, 0.05, 0.3, x + k, 1.03, -32.6, { c: 0xb8923a, seg: 6 }); B.geo(M.glow, new THREE.SphereGeometry(0.05, 6, 5), [x + k, 1.42, -32.6], [0, 0, 0], [1, 1.8, 1], 0xffc060); }
    // choir gallery over the entrance, and the stair up to it along the west wall
    B.box(M.woodH, 7.4, 0.2, 2.65, x, GAL - 0.2, -22.125, { c: 0x7a5a3e, solid: true });
    B.box(M.wood, 6.0, 0.9, 0.12, x + 0.65, GAL, -23.39, { c: WH, solid: true });
    steps(B, M, 58.95, -23.45, Math.PI, GAL, 9, { w: 1.3, rise: GAL / 10, run: 0.55, mat: M.woodH, c: 0x7a5a3e });
    B.box(M.woodH, 0.6, 1.1, 1.3, 65.3, GAL, -22.2, { c: DK, solid: true }); B.box(M.flat, 0.06, 0.5, 1.1, 64.98, GAL + 0.75, -22.2, { c: 0xe8e0d0 });   // harmonium
    // The tower: a vestibule at the bottom, then a square spiral of wooden steps round the walls from the gallery up to the bell.
    for (const sd of [-1, 1]) B.box(M.wood, 0.3, TOP + 0.4, 4.1, x + sd * 2.05, -0.4, tz + 0.15, { c: WH, solid: true });
    for (const sd of [-1, 1]) B.box(M.wood, 1.4, TOP + 0.4, 0.3, x + sd * 1.5, -0.4, tz + 2.05, { c: WH, solid: true });
    B.box(M.wood, 1.6, TOP - 2.5, 0.3, x, 2.5, tz + 2.05, { c: WH, solid: true });
    B.box(M.wood, 4.4, TOP - 5.6, 0.3, x, 5.6, tz - 2.05, { c: WH, solid: true });
    B.box(M.woodH, 3.8, 0.46, 3.8, x, -0.4, tz, { c: 0x8a6a4a, solid: true }); B.box(M.woodH, 3.8, 0.2, 3.8, x, GAL - 0.2, tz, { c: 0x7a5a3e, solid: true });
    B.box(M.woodH, 0.08, 2.4, 0.8, x - 0.86, 0.06, tz + 2.62, { c: 0x4a3020 });                                              // the door, standing open
    B.box(M.wood, 0.3, TOP - GAL, 0.3, x, GAL, tz, { c: DK });                                                                // newel post
    { let n = 0; const slab = (lx, lz, w, d) => { n++; B.box(M.woodH, w, 0.2, d, x + lx, GAL + n * RISE - 0.2, tz + lz, { c: n % 2 ? 0x7a5a3e : 0x6a4a30, solid: true }); };
      const R3 = 1.4 / 3;
      for (const [ax, az, dx, dz, cx, cz] of [[1.3, -0.7, 0, 1, 1.3, 1.3], [0.7, 1.3, -1, 0, -1.3, 1.3], [-1.3, 0.7, 0, -1, -1.3, -1.3], [-0.7, -1.3, 1, 0, 1.3, -1.3], [1.3, -0.7, 0, 1, 1.3, 1.3]]) {
        for (let j = 0; j < 3; j++) slab(ax + dx * (j + 0.5) * R3, az + dz * (j + 0.5) * R3, dx ? R3 + 0.03 : 1.2, dz ? R3 + 0.03 : 1.2);
        slab(cx, cz, 1.23, 1.23);                                                                                             // the turn in the corner
      } }
    // the belfry: a floor round the stair well, a parapet to crouch behind, the bell
    B.box(M.woodH, 2.6, 0.2, 2.6, x - 0.6, TOP - 0.2, tz + 0.6, { c: 0x7a5a3e, solid: true }); B.box(M.woodH, 1.2, 0.2, 1.2, x - 1.3, TOP - 0.2, tz - 1.3, { c: 0x7a5a3e, solid: true });
    for (const sd of [-1, 1]) { B.box(M.wood, 0.3, 1.0, 4.4, x + sd * 2.05, TOP, tz, { c: WH, solid: true }); B.box(M.wood, 3.8, 1.0, 0.3, x, TOP, tz + sd * 2.05, { c: WH, solid: true }); }
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) B.box(M.wood, 0.3, 2.2, 0.3, x + sx * 2.05, TOP, tz + sz * 2.05, { c: WH });
    B.geo(M.metal, new THREE.SphereGeometry(0.55, 10, 8), [x, TOP + 1.35, tz], [0, 0, 0], [1, 1.2, 1], 0xb8923a); B.box(M.wood, 0.1, 0.5, 0.1, x, TOP + 1.9, tz, { c: DK }); world.addCyl(x, tz, 0.5, TOP + 0.6, TOP + 2.2);
    B.geo(M.shingle, new THREE.ConeGeometry(3.4, 4.6, 4), [x, TOP + 4.5, tz], [0, Math.PI / 4, 0], 1, 0x5a4a44);
    B.box(M.flat, 0.12, 1.4, 0.12, x, TOP + 6.7, tz, { c: 0xf0f0f0 }); B.box(M.flat, 0.7, 0.12, 0.12, x, TOP + 7.5, tz, { c: 0xf0f0f0 });
    extraFoes.push(['cowboy', x, -29.5, { y: 0.6, patrol: false, yaw: 0 }], ['bandit', x - 1.1, tz + 0.7, { y: TOP + 0.5, static: true, yaw: 2.2 }]); extraPicks.push([61, -22, GAL + 0.5]);
    for (let i = 0; i < 14; i++) {
      const gx = x + 9 + (i % 5) * 2.4 + (R() - 0.5), gz = z - 3 + Math.floor(i / 5) * 3.4 + (R() - 0.5);
      if (i % 3) { B.box(M.wood, 0.1, 1.2, 0.1, gx, 0, gz, { c: 0xd8d0c0, rz: (R() - 0.5) * 0.2 }); B.box(M.wood, 0.7, 0.1, 0.1, gx, 0.8, gz, { c: 0xd8d0c0 }); }
      else B.box(M.stone, 0.6, 0.9, 0.16, gx, 0, gz, { c: 0xb0a898, rx: (R() - 0.5) * 0.2 });
      B.box(M.ground, 0.9, 0.16, 2.0, gx, -0.02, gz + 1.2, { c: 0x9a7048 });
    }
    fence(B, M, x + 7.4, z - 5, x + 21, z - 5, { h: 1.0, rails: 2, c: 0xd8d0c0 }); fence(B, M, x + 21, z - 5, x + 21, z + 9, { h: 1.0, rails: 2, c: 0xd8d0c0 });
  }

  // ---- corral, barn ----------------------------------------------------------------
  {
    fence(B, M, -80, 4, -54, 4); fence(B, M, -80, 22, -54, 22); fence(B, M, -80, 4, -80, 22); fence(B, M, -54, 4, -54, 9.5); fence(B, M, -54, 13.5, -54, 22);
    const horses = [[-70, 12, 0.6, 0x6a4428], [-63, 17, 2.4, 0x2a1c14], [-74, 18, -1.2, 0xb8a080], [-60, 8, 3.6, 0x8a5a36]];
    for (const [hx, hz, ry, c] of horses) { B.geo(M.flat, horseGeo(c, c === 0xb8a080 ? 0xe8e0d0 : 0x14100c), [hx, 0, hz], [0, ry, 0]); beast(world, hx, hz, ry, 0.9, 2.8, 0, 2, 0.25); }
    for (const [hx, hz, ry] of [[-77, 6, 0.2], [-76.4, 7.4, 1.2], [-77.2, 6.4, 0.4]]) B.box(M.thatch, 1.5, 0.8, 0.9, hx, hz === 6.4 ? 0.8 : 0, hz, { ry, c: 0xd8b860, solid: true });
    B.box(M.woodH, 2.6, 0.55, 0.8, -56, 0, 19, { c: 0x6a5038, solid: true }); B.box(M.glow, 2.3, 0.02, 0.5, -56, 0.54, 19, { c: 0x1a3a44 });
    // barn
    const x = -70, z = -20;
    room(B, M, x, 0, z, { w: 13, d: 17, h: 6.2, t: 0.35, mat: M.wood, c: 0x8a2c22, doors: [{ side: 's', at: 0, w: 4.4, h: 4.6 }, { side: 'n', at: 3.6, w: 1.7, h: 2.4 }],
      wins: [{ side: 'e', at: -3, w: 1.3, y: 1.4, h: 1.0 }, { side: 'e', at: -4.8, w: 1.6, y: 3.9, h: 1.3 }, { side: 'w', at: 2, w: 1.3, y: 1.4, h: 1.0 }], floor: { mat: M.ground, c: 0xb89a62 }, ceil: { mat: M.woodH, c: 0x4a2c20 } });
    B.geo(M.shingle, prismGeo(14, 4.2, 17.8, 3), [x, 6.2, z], [0, 0, 0], 1, 0x4a3c38);
    for (const s of [-1, 1]) {
      B.box(M.woodH, 0.22, 4.7, 0.16, x + s * 2.2, 0, z + 8.6, { c: 0xe8e0d0 });
      B.box(M.wood, 2.2, 4.5, 0.1, x + s * 3.45, 0, z + 8.62, { c: 0x6a2018 });                       // door leaves, slid open
      B.box(M.woodH, 2.4, 0.16, 0.12, x + s * 3.45, 2.2, z + 8.68, { rz: s * 1.1, c: 0xe8e0d0 });
    }
    // the hayloft over the north half, by ladder: hay to hide behind, a window that looks over the town
    B.box(M.woodH, 12.3, 0.16, 6.6, x, 3.04, z - 4.85, { c: 0x7a5a3e, solid: true }); B.box(M.woodH, 12.3, 0.3, 0.2, x, 2.74, z - 1.6, { c: 0x5a3a24 });
    ladder(B, M, x - 1, z - 1.55, 0, 1, 0.06, 3.2); rail(x - 6.1, z - 1.6, x - 1.6, z - 1.6, 3.2, 0x6a4a30); rail(x - 0.4, z - 1.6, x + 6.1, z - 1.6, 3.2, 0x6a4a30);
    for (const [hx, hz, ry] of [[-73.5, -26.5, 0.2], [-66.4, -25.2, 0.3], [-68.6, -23.2, 0]]) B.box(M.thatch, 1.5, 0.8, 0.9, hx, 3.2, hz, { ry, c: 0xd8b860, solid: true });
    // inside: stalls, hay, posts
    for (const sz of [-25, -21.5, -18]) { B.box(M.wood, 3.4, 1.35, 0.14, x - 4.4, 0.06, sz, { c: 0x6a4a30, solid: true }); B.box(M.woodH, 0.16, 1.7, 0.16, x - 2.7, 0.06, sz, { c: 0x5a3a24 }); }
    for (const [hx, hz, hy, ry] of [[-65.2, -27.3, 0, 0], [-65.2, -26.3, 0, 0], [-65.2, -26.8, 0.8, 0.1], [-66.8, -27.4, 0, 1.57], [-65, -14.5, 0, 0.2], [-66.3, -13.4, 0, 1.4], [-73.2, -13.2, 0, 0.1], [-68.5, -22, 0, 0.5]])
      B.box(M.thatch, 1.5, 0.8, 0.9, hx, hy + 0.06, hz, { ry, c: 0xd8b860, solid: true });
    for (const pz of [-24.5, -15.5]) for (const s of [-1, 1]) { B.box(M.wood, 0.26, 6.1, 0.26, x + s * 2.3, 0.06, pz, { c: 0x5a3a24 }); world.addCyl(x + s * 2.3, pz, 0.2, 0, 6.2); }
    B.box(M.woodH, 0.1, 0.3, 0.1, x, 4.3, z, { c: 0x2a2018 }); B.box(M.glow, 0.2, 0.28, 0.2, x, 4.0, z, { c: 0xffa040 });
    const pl = new THREE.PointLight(0xffa650, 40, 18, 1.8); pl.position.set(x, 3.8, z); root.add(pl);
    B.box(M.woodH, 4.8, 0.22, 0.16, x, 4.6, z + 8.6, { c: 0xe8e0d0 });
    B.box(M.flat, 1.5, 1.5, 0.1, x, 7, z + 8.9, { c: 0x1a1210 });
    for (const [bx, bz] of [[-63, -10.8], [-62.2, -10.2], [-76.5, -10.6]]) barrel(B, M, bx, 0, bz);
    B.box(M.thatch, 1.5, 0.8, 0.9, -65.5, 0, -10.6, { c: 0xd8b860, solid: true }); B.box(M.thatch, 1.5, 0.8, 0.9, -74, 0, -10.4, { ry: 0.3, c: 0xd8b860, solid: true });
  }

  // ---- homestead south of the corral ---------------------------------------------------
  {
    const x = -38, z = 38;
    room(B, M, x, 0, z, { w: 7.4, d: 6, h: 2.9, t: 0.3, mat: M.wood, c: 0x7a5a3e, doors: [{ side: 'n', at: -1.4, w: 1.6, h: 2.2 }],
      wins: [{ side: 'n', at: 1.7, w: 1.1, y: 1.1, h: 0.9 }, { side: 'e', at: 0, w: 1.1, y: 1.1, h: 0.9 }, { side: 'w', at: 0.6, w: 1.1, y: 1.1, h: 0.9 }, { side: 's', at: 1.2, w: 1.1, y: 1.1, h: 0.9 }], ceil: { mat: M.woodH, c: 0x5a4030 } });
    B.geo(M.shingle, prismGeo(6.6, 1.7, 8.2, 3), [x, 2.9, z], [0, Math.PI / 2, 0], 1, 0x6a5444);
    B.box(M.woodH, 7.6, 0.14, 2.2, x, 0, z - 4.0, { c: 0x8a6a4e, solid: true }); B.box(M.shingle, 7.8, 0.1, 2.5, x, 2.55, z - 4.05, { rx: -0.14, c: 0x6a5444 });
    for (const s of [-1, 0, 1]) { B.box(M.wood, 0.15, 2.5, 0.15, x + s * 3.6, 0.14, z - 5.0, { c: 0x5a3a24 }); world.addCyl(x + s * 3.6, z - 5.0, 0.12, 0, 2.6); }
    B.box(M.stone, 1.1, 4.4, 1.1, x + 3.1, 0, z + 3.4, { c: 0xa89880, solid: true });
    B.box(M.woodH, 1.5, 0.74, 0.9, x + 1.6, 0.06, z + 0.6, { c: 0x6a4428, solid: true }); B.box(M.glow, 0.09, 0.2, 0.09, x + 1.6, 0.8, z + 0.6, { c: 0xffb050 });
    B.box(M.woodH, 0.9, 0.45, 1.9, x - 2.9, 0.06, z + 1.7, { c: 0x5a4030, solid: true }); B.box(M.cloth, 0.86, 0.1, 1.6, x - 2.9, 0.51, z + 1.8, { c: 0x8a3a2a });
    B.cyl(M.metal, 0.28, 0.32, 0.8, x + 2.9, 0.06, z + 2.2, { c: 0x1c1c1e, solid: true, seg: 10 });
    fence(B, M, x - 9, z - 9, x + 9, z - 9); fence(B, M, x - 9, z - 9, x - 9, z + 7); fence(B, M, x + 9, z - 3, x + 9, z + 7); fence(B, M, x - 9, z + 7, x + 9, z + 7);
    for (let i = 0; i < 9; i++) B.cyl(M.wood, 0.13, 0.13, 1.3, x - 6.5, 0.13 + Math.floor(i / 3) * 0.26, z + 3 + (i % 3) * 0.28 + Math.floor(i / 3) * 0.14, { rz: Math.PI / 2, c: 0x8a623a, seg: 7 });
    world.addBox(x - 6.5, z + 3.3, 1.4, 1.0, 0, 0, 0.9);
    B.box(M.wood, 1.2, 2.2, 1.2, x + 6.5, 0, z + 5, { c: 0x6a4a30, solid: true }); B.geo(M.shingle, prismGeo(1.5, 0.5, 1.5, 2), [x + 6.5, 2.2, z + 5], [0, 0, 0], 1, 0x5a4434);
    barrel(B, M, x - 3.4, 0.14, z - 3.6); crate(B, M, x + 3, 0.14, z - 3.7, 0.7, 0.3);
  }
  // ---- Boot Hill: the cemetery beyond the last houses -------------------------------------
  {
    const X0 = 44, X1 = 72, Z0 = 30, Z1 = 52, IRON = 0x24242a, gx = 58;
    const iron = (ax, az, bx, bz) => fence(B, M, ax, az, bx, bz, { h: 1.25, rails: 2, c: IRON, gap: 1.2 });
    iron(X0, Z0, gx - 1.7, Z0); iron(gx + 1.7, Z0, X1, Z0); iron(X0, Z1, X1, Z1); iron(X0, Z0, X0, Z1); iron(X1, Z0, X1, Z1);
    for (const s of [-1, 1]) { B.box(M.stone, 0.7, 3.0, 0.7, gx + s * 1.9, 0, Z0, { c: 0xa89c88, solid: true }); B.box(M.stone, 0.9, 0.2, 0.9, gx + s * 1.9, 3.0, Z0, { c: 0x8a8070 }); }
    sign('BOOT HILL', gx, 3.55, Z0, 4.6, 0.8, { bg: '#1c1c1c', fg: '#d8d0c0', ry: Math.PI });
    B.box(M.metal, 4.4, 0.08, 0.08, gx, 3.1, Z0, { c: IRON });
    for (const s of [-1, 1]) bars(B, M, gx + s * 1.55, Z0, gx + s * 1.9, Z0 + 1.4, 0, 1.9, { c: IRON, gap: 0.2 });     // gate leaves, open
    const stone = [0xb0a898, 0x9a9488, 0xc0b8a8, 0x8a8478];
    let n = 0;
    for (let zz = Z0 + 3.5; zz < Z1 - 2; zz += 3.6) for (let xx = X0 + 2.4; xx < X1 - 1.5; xx += 2.7) {
      n++;
      if (Math.abs(xx - gx) < 3.2 || (xx > 62 && xx < 66 && zz > 35 && zz < 39)) continue;       // the path, the open grave
      const px = xx + (R() - 0.5) * 0.5, pz = zz + (R() - 0.5) * 0.5, k = n % 4, lean = (R() - 0.5) * 0.22;
      B.box(M.ground, 0.95, 0.2, 2.0, px, -0.03, pz - 1.25, { c: 0x9a7048 });
      if (k === 0) { B.box(M.wood, 0.11, 1.35, 0.11, px, 0, pz, { c: 0xd8d0c0, rz: lean }); B.box(M.wood, 0.75, 0.11, 0.11, px, 0.9, pz, { c: 0xd8d0c0, rz: lean }); world.addCyl(px, pz, 0.14, 0, 1.3); }
      else if (k === 1) { B.box(M.stone, 0.7, 0.75, 0.18, px, 0, pz, { c: R.pick(stone), rx: lean }); B.cyl(M.stone, 0.35, 0.35, 0.18, px, 0.4, pz, { rx: Math.PI / 2, c: R.pick(stone), seg: 12 }); world.addBox(px, pz, 0.8, 0.3, 0, 0, 1.1); }
      else if (k === 2) { B.box(M.stone, 0.62, 1.0, 0.2, px, 0, pz, { c: R.pick(stone), rx: lean }); world.addBox(px, pz, 0.7, 0.3, 0, 0, 1.0); }
      else { B.box(M.stone, 0.5, 0.3, 0.5, px, 0, pz, { c: 0x8a8478 }); B.box(M.stone, 0.12, 1.2, 0.12, px, 0.3, pz, { c: 0xb0a898 }); B.box(M.stone, 0.6, 0.12, 0.12, px, 1.05, pz, { c: 0xb0a898 }); world.addCyl(px, pz, 0.3, 0, 1.5); }
    }
    // an open grave, waiting
    B.box(M.flat, 1.0, 0.03, 2.1, 64, 0.0, 37, { c: 0x120c08 }); B.geo(M.ground, new THREE.SphereGeometry(1, 8, 6), [65.6, 0, 37.2], [0, 0, 0], [0.9, 0.55, 1.3], 0x8a6040); world.addCyl(65.6, 37.2, 0.8, 0, 0.5);
    B.box(M.wood, 0.62, 0.42, 1.95, 62.5, 0, 37, { ry: 0.08, c: 0x6a4a2e, solid: true }); B.box(M.wood, 0.06, 1.3, 0.06, 65.4, 0.3, 36.6, { rz: 0.5, c: 0x7a5a3a }); B.box(M.metal, 0.22, 0.3, 0.03, 65.75, 1.42, 36.6, { rz: 0.5, c: 0x4a4a4e });
    // crypt of the town's founder
    const cx = gx, cz = Z1 - 5;
    room(B, M, cx, 0, cz, { w: 4.8, d: 5.4, h: 3.0, t: 0.4, mat: M.stone, c: 0xa8a090, doors: [{ side: 'n', at: 0, w: 1.7, h: 2.3 }], floor: { mat: M.stone, c: 0x7a7468 }, ceil: { mat: M.stone, c: 0x8a8478 } });
    B.geo(M.stone, prismGeo(5.3, 1.3, 5.9, 2), [cx, 3.2, cz], [0, 0, 0], 1, 0x8a8478);
    for (const s of [-1, 1]) B.cyl(M.stone, 0.2, 0.24, 2.5, cx + s * 1.25, 0, cz - 2.95, { c: 0xc0b8a8, seg: 10, solid: true });
    B.box(M.stone, 3.4, 0.3, 0.6, cx, 2.5, cz - 2.95, { c: 0x9a9488 }); B.box(M.stone, 0.14, 1.1, 0.14, cx, 4.5, cz - 2.6, { c: 0xc0b8a8 }); B.box(M.stone, 0.6, 0.14, 0.14, cx, 5.15, cz - 2.6, { c: 0xc0b8a8 });
    B.box(M.stone, 0.95, 0.75, 2.2, cx - 1.1, 0.06, cz + 0.4, { c: 0x9a9488, solid: true }); B.box(M.stone, 1.05, 0.1, 2.3, cx - 1.1, 0.81, cz + 0.4, { c: 0xb8b0a0 });
    for (const [lx, lz] of [[1.6, 1.9], [1.75, 1.6]]) { B.cyl(M.flat, 0.03, 0.03, 0.22, cx + lx, 0.06, cz + lz, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.04, 5, 4), [cx + lx, 0.33, cz + lz], [0, 0, 0], [1, 1.6, 1], 0xffb040); }
    // the hanging tree
    const tx = 49.5, tz = 47.5;
    B.cyl(M.wood, 0.22, 0.42, 4.6, tx, 0, tz, { c: 0x4a3a2e, seg: 8 }); world.addCyl(tx, tz, 0.4, 0, 5);
    for (const [a, len, up, y0] of [[0.4, 3.2, 0.7, 3.6], [2.3, 2.6, 0.9, 4.1], [4.2, 2.9, 0.6, 3.3], [5.4, 2.0, 1.0, 4.4], [3.2, 1.6, 1.2, 4.5]])
      B.cyl(M.wood, 0.05, 0.14, len, tx + Math.cos(a) * len * 0.42 * Math.sin(up + 0.5), y0 - 0.2 + len * 0.18, tz - Math.sin(a) * len * 0.42 * Math.sin(up + 0.5), { ry: a, rz: -(Math.PI / 2 - up * 0.6), c: 0x4a3a2e, seg: 6 });
    B.box(M.flat, 0.03, 1.2, 0.03, tx + 1.2, 2.5, tz - 0.5, { c: 0xb8a070 });
    wagon(52, 26.2, 1.4, false);                                                                  // the undertaker's cart
    B.box(M.wood, 0.62, 0.42, 1.95, 52, 1.38, 26.2, { ry: 1.4, c: 0x2a2018 });
  }

  // ---- Lookout Butte south of town: a zigzag stair to a flat top that overlooks the street; a root cellar to crawl into ----
  butte(B, M, 6, 48, { topC: 0xc99866 });
  extraFoes.push(['bandit', 3, 44.5, { y: 12.5, patrol: false, yaw: Math.PI }]); extraPicks.push([10, 50, 12.5]);
  den(B, M, 30, 0, 38, Math.PI, { mat: M.plaster, c: 0xb89a70 }); B.box(M.ground, 4.4, 0.5, 4.2, 30, 1.95, 38, { c: 0xb07a52 }); extraPicks.push([30, 38.5, 0.5]);
  for (const [lx, lz, lw2, ld] of [[-14, 33, 5, 0.5], [-17, 35.5, 0.5, 4], [-9.5, 36, 0.5, 3]]) B.box(M.plaster, lw2, 1.05, ld, lx, -0.1, lz, { c: 0xb89a70, solid: true });   // the low walls of a ruined adobe: cover for someone who crouches

  // ---- the back lots behind both rows of houses: a second way through town, out of sight of the street ---------------------
  {
    const privy = (x, z, ry, c = 0x8a6a4a) => {             // an outhouse to step into: three walls, a seat, the door standing open (the open side is local +Z)
      const P = local(x, z, ry);
      { const [px, pz] = P(0, -0.65); B.box(M.wood, 1.3, 2.2, 0.1, px, 0, pz, { ry, c, solid: true }); }
      for (const s of [-1, 1]) { const [px, pz] = P(s * 0.6, 0); B.box(M.wood, 0.1, 2.2, 1.4, px, 0, pz, { ry, c, solid: true }); }
      { const [px, pz] = P(0, -0.38); B.box(M.woodH, 1.1, 0.5, 0.45, px, 0, pz, { ry, c: 0xb89a6a, solid: true }); }
      B.box(M.shingle, 1.6, 0.08, 1.8, x, 2.2, z, { ry, rx: 0.12, c: 0x6a5444 });
      { const [px, pz] = P(0.98, 0.95); B.box(M.wood, 0.75, 2.0, 0.06, px, 0, pz, { ry: ry + 0.6, c }); }
      { const [px, pz] = P(0, 0.68); B.box(M.wood, 1.3, 0.22, 0.08, px, 1.98, pz, { ry, c }); }
    };
    const hen = (x, z, ry, c) => { B.geo(M.flat, new THREE.SphereGeometry(0.13, 8, 6), [x, 0.2, z], [0, ry, 0], [0.8, 0.9, 1.25], c); B.geo(M.flat, new THREE.SphereGeometry(0.06, 6, 5), [x + Math.sin(ry) * 0.15, 0.36, z + Math.cos(ry) * 0.15], [0, 0, 0], 1, c);
      B.box(M.flat, 0.02, 0.05, 0.05, x + Math.sin(ry) * 0.15, 0.4, z + Math.cos(ry) * 0.15, { ry, c: 0xb01c1c }); B.geo(M.flat, new THREE.ConeGeometry(0.02, 0.06, 4), [x + Math.sin(ry) * 0.22, 0.35, z + Math.cos(ry) * 0.22], [Math.PI / 2, ry, 0], 1, 0xd8a030); };
    // north lot: washing on the line and the woman hanging it, a hay cart to crawl under, firewood, the saloon's privy, a hen house
    for (const px of [-33.5, -27]) { B.box(M.wood, 0.1, 2.1, 0.1, px, 0, -24.5, { c: 0x6a4a30 }); world.addCyl(px, -24.5, 0.1, 0, 2.1); }
    rod(B, M.flat, [-33.5, 2.0, -24.5], [-27, 2.0, -24.5], 0.012, 0xc8b890);
    for (const [sx, sw, sh, c] of [[-32.6, 1.3, 1.5, 0xf0ece0], [-31.1, 1.0, 1.1, 0xd8cdb0], [-29.9, 0.7, 0.8, 0x8a9ab0], [-28.6, 1.3, 1.4, 0xf0ece0]]) B.box(M.cloth, sw, sh, 0.03, sx, 1.99 - sh, -24.5, { c });
    B.cyl(M.thatch, 0.3, 0.24, 0.3, -29.6, 0, -25.6, { c: 0xc8a868, seg: 10 }); B.geo(M.cloth, new THREE.SphereGeometry(0.26, 8, 5), [-29.6, 0.3, -25.6], [0, 0, 0], [1, 0.5, 1], 0xf0ece0);
    who('westWoman', -30.5, 0, -25.25, 0, { arms: [-2.3, -2.2] });
    cart(B, M, -37.5, 0, -25, 1.2, { load: 'hay' }); woodpile(B, M, -14.5, 0, -23.2, 0.1, { w: 3 }); privy(-7, -26, 0); privy(31.8, -20.6, 0);
    crate(B, M, -24.4, 0, -19.2, 0.9, 0.2); crate(B, M, -23.4, 0, -19.3, 0.7, -0.3); barrel(B, M, -18.9, 0, -18.9); barrel(B, M, -42.7, 0, -20.6); barrel(B, M, 0.8, 0, -21.5, 0x4a5a6a);
    B.box(M.wood, 2.2, 0.9, 1.1, 19.5, 0.4, -23.2, { c: 0x9a7a52 }); B.box(M.shingle, 2.5, 0.08, 1.5, 19.5, 1.32, -23.2, { rx: 0.2, c: 0x6a5444 }); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(M.wood, 0.1, 0.4, 0.1, 19.5 + a, 0, -23.2 + b * 0.45, { c: 0x5a3a24 });
    B.box(M.flat, 0.5, 0.45, 0.03, 19.5, 0.6, -22.63, { c: 0x1a1210 }); B.box(M.woodH, 0.4, 0.04, 0.9, 19.5, 0.2, -22.2, { rx: 0.42, c: 0x7a5a3a }); world.addBox(19.5, -23.2, 2.2, 1.1, 0, 0, 1.4);
    hen(18.3, -21.6, 0.6, 0xf0ece0); hen(20.6, -21.9, 2.4, 0x8a5a2a); hen(19.2, -21.1, 4, 0xc8a070); hen(21.3, -23, 1.2, 0xf0ece0);
    // south lot: the hotel's privy and firewood, coffin boards and a coffin in the making behind the undertaker, wire drums behind the telegraph, the doctor's buggy, coal for the forge
    privy(-24.5, 23.6, Math.PI); woodpile(B, M, -15.5, 0, 20.4, 0, { w: 2.6 });
    woodpile(B, M, -6.2, 0, 17.7, Math.PI / 2, { w: 1.0, h: 0.7, d: 3.4, c: 0xc8a878 });
    B.box(M.wood, 0.62, 0.42, 1.95, -3.6, 0.55, 20, { ry: 1.3, c: 0xc8a878 }); for (const k of [-0.6, 0.6]) B.box(M.wood, 0.7, 0.55, 0.08, -3.6 + Math.sin(1.3) * k, 0, 20 + Math.cos(1.3) * k, { ry: 1.3, c: 0x6a4a30 }); world.addBox(-3.6, 20, 0.62, 1.95, 1.3, 0, 0.97);
    barrel(B, M, 6, 0, 16.8); barrel(B, M, 6.8, 0, 16.9, 0x4a5a6a); crate(B, M, 10.4, 0, 16.9, 0.8, 0.1);
    for (const [dx, dz] of [[22.6, 17.2], [23.5, 18.1]]) { for (const y of [0, 0.62]) B.cyl(M.wood, 0.48, 0.48, 0.06, dx, y, dz, { c: 0x7a5a3a, seg: 12 }); B.cyl(M.metal, 0.3, 0.3, 0.56, dx, 0.06, dz, { c: 0xa85a2a, seg: 12 }); world.addCyl(dx, dz, 0.48, 0, 0.68); }
    cart(B, M, 37, 0, 21.2, 1.8);
    B.geo(M.rock, rockGeo(4, 1), [-35.2, 0.3, 19.2], [0, 0.4, 0], [1.4, 0.6, 1.1], 0x1c1c20); world.addCyl(-35.2, 19.2, 0.9, 0, 0.5);
    for (const [wx, k] of [[-37.8, 0.2], [-38.6, -0.15]]) B.geo(M.flat, wheel(), [wx, 0.62, 17.25], [0.25, Math.PI / 2 + k, 0]);
    extraFoes.push(['cowboy', -16, -27, {}]);
  }
  // ---- the dry wash: a foot bridge high enough to walk under, stones in the bed ------------------------------------------
  {
    B.box(M.woodH, 12, 0.14, 1.6, 49.6, 0.08, -21, { c: 0x8a6a4a, solid: true });
    for (const px of [47.6, 51.6]) for (const s of [-1, 1]) B.box(M.wood, 0.16, 2.7, 0.16, px, -2.5, -21 + s * 0.7, { c: 0x5a4028 });
    rail(43.7, -21.75, 55.5, -21.75, 0.22, 0x6a4a30); rail(43.7, -20.25, 55.5, -20.25, 0.22, 0x6a4a30);
    for (let i = 0; i < 12; i++) { const z = -36 + i * 4.3, x = 50.2 + Math.sin(z * 0.08) + Math.sin(i * 2.3) * 1.2, k = 0.3 + (i % 4) * 0.12; B.geo(M.rock, rockGeo(i + 2, 0), [x, world.height(x, z) + k * 0.3, z], [0, i, 0], [k, k * 0.7, k], [0xc8b898, 0xb8a080, 0xa89070][i % 3]); }
  }
  // ---- the telegraph line out of town along the road; the gang felled one pole against the stage office and cut the wire ----
  {
    const PC = 0x5a4632, tops = [27.8, 45.5, 79, 95.5, 113, 131].map((x) => {
      const z = 6.3, y = world.height(x, z); B.cyl(M.wood, 0.09, 0.13, 7.4, x, y - 0.4, z, { c: PC, seg: 7 }); B.box(M.wood, 0.1, 0.1, 1.5, x, y + 6.3, z, { c: PC });
      for (const s of [-0.6, 0.6]) B.cyl(M.flat, 0.04, 0.05, 0.12, x, y + 6.4, z + s, { c: 0x9ab8a8, seg: 6 });
      if (x < 96) world.addCyl(x, z, 0.14, y - 1, y + 7);
      return [x, y + 6.5, z];
    });
    const wire = (a, b) => rod(B, M.flat, a, b, 0.012, 0x1c1c1c, 0.012, 4);
    for (const [i, j] of [[0, 1], [2, 3], [3, 4], [4, 5]]) for (const s of [-0.6, 0.6]) wire([tops[i][0], tops[i][1], 6.3 + s], [tops[j][0], tops[j][1], 6.3 + s]);
    wire([27.8, tops[0][1], 6.9], [25.2, 4.7, 8.3]); wire([45.5, tops[1][1], 6.9], [50.8, world.height(50.8, 7.4) + 0.03, 7.4]); wire([79, tops[2][1], 6.9], [74, 0.03, 8.2]);
    const a = [56.6, world.height(56.6, 6.4) + 0.1, 6.4], b = [60.95, 3.5, 12.45];
    rod(B, M.wood, a, b, 0.12, PC, 0.09, 7); B.cyl(M.wood, 0.13, 0.14, 0.5, 56.25, a[1] - 0.3, 6.1, { c: PC, seg: 7 });
    for (const t of [0.12, 0.26, 0.4]) { const py = a[1] + (b[1] - a[1]) * t; world.addBox(a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t, 0.3, 1.2, 0.62, py - 0.15, py + 0.15); }   // low end: a bar across the way; from the middle on you can duck under it
  }
  // ---- the stage station east of town, beside the road: an adobe office with a flat roof to climb onto, the coach, freight -----
  {
    const SX = 64, SZ = 15, AD = 0xb89a70;
    room(B, M, SX, 0, SZ, { w: 6.4, d: 5, h: 3.0, t: 0.4, mat: M.plaster, c: AD, doors: [{ side: 'n', at: -1.2, w: 1.6, h: 2.2 }], wins: [{ side: 'n', at: 1.6, w: 1.1, y: 1.1, h: 1.0 }],
      floor: { mat: M.ground, c: 0xc8a878 }, ceil: { mat: M.plaster, c: AD } });
    for (const s of [-1, 1]) B.box(M.plaster, 6.4, 0.5, 0.3, SX, 3.2, SZ + s * 2.35, { c: AD, solid: true });
    B.box(M.plaster, 0.3, 0.5, 4.4, SX - 3.05, 3.2, SZ, { c: AD, solid: true }); B.box(M.plaster, 0.3, 0.5, 2.6, SX + 3.05, 3.2, SZ - 0.9, { c: AD, solid: true }); B.box(M.plaster, 0.3, 0.5, 0.6, SX + 3.05, 3.2, SZ + 1.9, { c: AD, solid: true });
    ladder(B, M, SX + 3.2, SZ + 1, 1, 0, 0, 3.2);
    for (let i = 0; i < 5; i++) B.cyl(M.wood, 0.08, 0.08, 0.8, SX - 2.4 + i * 1.2, 2.96, SZ - 2.6, { rx: Math.PI / 2, c: 0x5a3a24, seg: 7 });
    sign('STAGE LINE', SX, 2.56, SZ - 2.55, 3.2, 0.5, { bg: '#3a2a1c', fg: '#e8d8b0', ry: Math.PI });
    for (const px of [SX - 2.9, SX + 2.9]) { B.box(M.wood, 0.16, 2.5, 0.16, px, 0, SZ - 4.5, { c: 0x5a3a24 }); world.addCyl(px, SZ - 4.5, 0.12, 0, 2.5); }
    B.box(M.thatch, 6.6, 0.12, 2.3, SX, 2.44, SZ - 3.6, { c: 0xa88a5a });
    table(B, M, 65.8, 0.06, 13.4, 0, { c: LW, w: 1.2, d: 0.7 }); B.box(M.flat, 0.3, 0.03, 0.42, 65.6, 0.84, 13.4, { ry: 0.3, c: 0xe8dcc0 }); lamp(66.2, 0.84, 13.3);
    bench(B, M, 61.5, 0.06, 15.6, Math.PI / 2, { c: LW, w: 2, d: 0.45, back: 0.5 }); chest(B, M, 66.4, 0.06, 16.8, 0, { c: 0x3a4a3a, band: 0xb8923a }); sacks(B, M, 63.6, 0.06, 16.6, 0, { w: 1.6 }); rug(B, M, 63.6, 0.06, 14.4, 0, { w: 2.2, d: 1.5, c: 0xa8442a, border: 0x2a6a5a });
    const cy = 1.25, C = cart(B, M, 60.2, 0, 8.4, cy, { w: 1.5, l: 3.0, c: 0x7a2a1e, wheel: 0xc8a030 }), P = local(60.2, 8.4, cy);
    B.box(M.wood, 1.5, 1.45, 1.9, 60.2, C.top, 8.4, { ry: cy, c: 0x7a2a1e, solid: true }); B.box(M.woodH, 1.62, 0.08, 2.9, 60.2, C.top + 1.45, 8.4, { ry: cy, c: 0x2a1c14 });
    for (const s of [-1, 1]) { const [px, pz] = P(s * 0.76, 0); B.geo(M.window, new THREE.BoxGeometry(0.03, 0.5, 0.7), [px, C.top + 0.95, pz], [0, cy, 0]); }
    { const [px, pz] = P(0, 1.2); B.box(M.woodH, 1.3, 0.4, 0.5, px, C.top + 0.5, pz, { ry: cy, c: 0x2a1c14 }); }
    for (const [lz, w, c] of [[-0.6, 0.9, 0x6a4a2e], [0.3, 0.7, 0x4a3a2a]]) { const [px, pz] = P(0, lz); B.box(M.woodH, w, 0.4, 0.55, px, C.top + 1.53, pz, { ry: cy + 0.2, c }); }
    crate(B, M, 65.6, 0, 11.4, 0.9, 0.2); crate(B, M, 66.5, 0, 11.5, 0.7, -0.2); crate(B, M, 65.8, 0.9, 11.4, 0.6, 0.5); barrel(B, M, 61.4, 0, 11.8);
    hitch(70, 13.6); for (const [hx, c] of [[69.3, 0x6a4428], [70.8, 0x2a1c14]]) { B.geo(M.flat, horseGeo(c, 0x14100c), [hx, 0, 12], [0, 0.1, 0]); beast(world, hx, 12, 0.1, 0.9, 2.8, 0, 2, 0.25); }
  }
  // ---- the railroad north of town: the track, a freight dock high enough to crawl under, a boxcar to walk through and climb, the station house ----
  {
    const ZT = -50, H = 1.5, RED = 0x7a3024, IR = 0x2a2a2e, GR = 0x9a8a78, TIE = 0x4a3626, RL = 0x4a4a52;
    B.box(M.ground, 190, 0.08, 3.0, -5, 0, ZT, { c: GR }); for (const s of [-1, 1]) B.box(M.metal, 190, 0.1, 0.07, -5, 0.12, ZT + s * 0.72, { c: RL });
    for (let tx = -99.6; tx < 90; tx += 0.8) B.box(M.wood, 0.22, 0.06, 2.3, tx, 0.07, ZT, { c: TIE });
    for (let xa = -100; xa > -160; xa -= 6) {               // westward the line climbs out over the dunes
      const ya = world.height(xa, ZT), yb = world.height(xa - 6, ZT), rz = Math.atan2(ya - yb, 6), L = Math.hypot(6, ya - yb) + 0.05, ym = (ya + yb) / 2;
      B.box(M.ground, L, 0.08, 3.0, xa - 3, ym, ZT, { rz, c: GR }); for (const s of [-1, 1]) B.box(M.metal, L, 0.1, 0.07, xa - 3, ym + 0.12, ZT + s * 0.72, { rz, c: RL });
      for (let k = 0; k < 7; k++) B.box(M.wood, 0.22, 0.06, 2.3, xa - 0.4 - k * 0.857, ya + (yb - ya) * (0.4 + k * 0.857) / 6 + 0.07, ZT, { rz, c: TIE });
    }
    B.box(M.wood, 0.3, 1.1, 2.6, 90.2, 0, ZT, { c: 0x5a3a24, solid: true }); for (const s of [-1, 1]) B.box(M.wood, 0.2, 1.5, 0.2, 90.9, 0, ZT + s * 0.8, { rz: 0.6, c: 0x5a3a24 }); B.cyl(M.flat, 0.3, 0.3, 0.04, 90, 1.2, ZT, { rz: Math.PI / 2, c: 0xb01c1c, seg: 12 });
    // freight dock
    B.box(M.woodH, 16, 0.16, 4.2, 8, H - 0.16, -45.7, { c: 0x8a6a4a, solid: true });
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { B.box(M.wood, 0.18, H + 0.2, 0.18, 0.2 + i * 2.6, -0.3, -45.7 + s * 1.95, { c: 0x5a4028 }); if (i % 2 === 0) world.addCyl(0.2 + i * 2.6, -45.7 + s * 1.95, 0.1, -1, H - 0.16); }
    steps(B, M, 3, -43.6, 0, H, 6, { w: 1.8, rise: H / 7, run: 0.4, mat: M.woodH, c: 0x8a6a4a });
    crate(B, M, 5.4, H, -44.4, 0.9, 0.2); crate(B, M, 6.4, H, -44.5, 0.7, -0.2); crate(B, M, 5.6, H + 0.9, -44.4, 0.6, 0.5); barrel(B, M, 12, H, -44.2); barrel(B, M, 12.8, H, -44.4); sacks(B, M, 14.4, H, -46.6, 0.3);
    extraPicks.push([9.5, -45.7, 0.5]);
    // rolling stock: each car stands on two trucks, with room to crawl under between them
    const truck = (tx) => { B.box(M.metal, 1.9, 0.3, 1.7, tx, 0.75, ZT, { c: IR }); for (const a of [-0.6, 0.6]) for (const s of [-1, 1]) B.cyl(M.metal, 0.5, 0.5, 0.1, tx + a, 0.62, ZT + s * 0.72, { rx: Math.PI / 2, c: IR, seg: 14 }); world.addBox(tx, ZT, 2.2, 2.4, 0, 0, H - 0.16); };
    B.box(M.woodH, 10, 0.16, 2.8, 8, H - 0.16, ZT, { c: 0xc8a878, solid: true }); truck(4.6); truck(11.4);
    for (const e of [-1, 1]) B.box(M.wood, 0.1, 2.3, 2.8, 8 + e * 4.95, H, ZT, { c: RED, solid: true });
    for (const s of [-1, 1]) { for (const e of [-1, 1]) B.box(M.wood, 3.9, 2.3, 0.1, 8 + e * 3.05, H, ZT + s * 1.35, { c: RED, solid: true });
      B.box(M.wood, 2.2, 2.2, 0.06, 10.3, H + 0.05, ZT + s * 1.44, { c: 0x6a2a20 }); B.box(M.metal, 4.6, 0.06, 0.06, 9.1, H + 2.28, ZT + s * 1.46, { c: IR }); }
    B.box(M.woodH, 10, 0.14, 3.1, 8, H + 2.3, ZT, { c: 0x4a2c22, solid: true }); B.box(M.woodH, 9.6, 0.05, 0.5, 8, H + 2.44, ZT, { c: 0x8a6a4a });
    B.box(M.woodH, 2.0, 0.1, 1.0, 8, H - 0.1, -48.15, { c: 0x9a7a52, solid: true });
    ladder(B, M, 13.0, ZT, 1, 0, 0, H + 2.44, { c: IR });
    sign('A. & D. G. R.R.', 4.95, H + 1.5, ZT + 1.44, 2.8, 0.5, { bg: '#7a3024', fg: '#e8d8b0', border: false });
    crate(B, M, 4.2, H, ZT - 0.6, 0.9, 0.1); crate(B, M, 4.3, H, ZT + 0.5, 0.7, 0.4); sacks(B, M, 11.7, H, ZT, Math.PI / 2, { w: 1.6 });
    B.box(M.woodH, 8.6, 0.16, 2.7, -2.7, H - 0.16, ZT, { c: 0xc8a878, solid: true }); truck(-5.4); truck(0); woodpile(B, M, -2.7, H, ZT, Math.PI / 2, { w: 1.8, h: 0.9, d: 6.4 }); B.box(M.metal, 1.6, 0.14, 0.14, 2.3, 1.05, ZT, { c: IR });
    // station house: a waiting room and, behind the counter, the agent's office
    const SX = 25, SZ = -44;
    room(B, M, SX, 0, SZ, { w: 8, d: 5.4, h: 3.1, t: 0.3, mat: M.wood, c: 0xc8a060, doors: [{ side: 's', at: -2, w: 1.6, h: 2.3 }, { side: 'n', at: -1.5, w: 1.6, h: 2.3 }],
      wins: [{ side: 'n', at: 2.2, w: 1.5, y: 1.0, h: 1.2 }], floor: { mat: M.woodH, c: 0xd8c4a0 }, ceil: { mat: M.woodH, c: 0xd8c8a8 } });
    B.geo(M.shingle, prismGeo(6.4, 1.6, 9.2, 3), [SX, 3.3, SZ], [0, Math.PI / 2, 0], 1, 0x6a4a3c);
    B.box(M.woodH, 13, 0.18, 1.85, 24.5, 0, -47.6, { c: 0x9a7a52, solid: true });
    sign('DRY GULCH', 26, 2.68, SZ - 2.76, 3.4, 0.56, { bg: '#f0e8d0', fg: '#1c1c1c', ry: Math.PI });
    B.box(M.woodH, 0.5, 1.05, 3.0, 25.9, 0.06, -44.9, { c: 0xa87a4e, solid: true }); B.box(M.woodH, 0.62, 0.05, 3.1, 25.9, 1.11, -44.9, { c: 0xd0aa78 }); bars(B, M, 25.9, -46.4, 25.9, -43.4, 1.16, 2.3, { c: 0xb8923a });
    table(B, M, 27.6, 0.06, -45.8, 0, { c: LW, w: 1.3, d: 0.7 }); B.box(M.metal, 0.2, 0.06, 0.12, 27.4, 0.84, -45.8, { c: 0xb8923a }); lamp(28, 0.84, -45.9);
    B.cyl(M.metal, 0.28, 0.32, 0.8, 28.2, 0.06, -42.2, { c: 0x1c1c1e, solid: true, seg: 10 }); B.cyl(M.metal, 0.08, 0.08, 2.3, 28.2, 0.86, -42.2, { c: 0x1c1c1e, seg: 8 }); chest(B, M, 26.9, 0.06, -42, 0, { c: 0x3a4a3a, band: 0xb8923a });
    B.cyl(M.flat, 0.2, 0.2, 0.04, 28.68, 2.0, -44, { rz: Math.PI / 2, c: 0xf0ece0, seg: 14 });
    bench(B, M, 21.65, 0.06, -44, Math.PI / 2, { c: LW, w: 2.4, d: 0.5, back: 0.5 }); chest(B, M, 24.9, 0.06, -42.1, 0, { c: 0x6a3a22 }); B.box(M.cloth, 0.5, 0.32, 0.26, 24.6, 0.06, -45, { ry: 0.3, c: 0x7a2a4a }); B.box(M.flat, 0.03, 0.8, 1.1, 21.33, 1.45, -44, { c: 0xe8dcc0 }); for (let i = 0; i < 5; i++) B.box(M.flat, 0.035, 0.035, 0.9 - (i % 2) * 0.25, 21.34, 2.05 - i * 0.13, -44 + (i % 2) * 0.12, { c: 0x2a2018 });      // the timetable
    who('westWoman', 24.95, 0.06, -45.6, Math.PI, { pose: 'carry', over: { extras: ['dress', 'shawl'] } });                    // a traveller, waiting for a train that will not come today
    B.cyl(M.wood, 0.08, 0.1, 5, 33, 0, -47.8, { c: 0xe8e0d0, seg: 7 }); B.box(M.flat, 1.1, 0.22, 0.05, 33.5, 4.5, -47.8, { c: 0xb01c1c }); world.addCyl(33, -47.8, 0.12, 0, 5);
    extraFoes.push(['bandit', 5.8, ZT, { y: H + 0.6, patrol: false, yaw: 0 }], ['cowboy', 19.5, -42.5, {}]);
  }
  // ---- the Silver Queen mine in a red rock outcrop, south-west: an adit to walk into, a chamber, and a low drift to crawl out through on the north side ----
  {
    const RK = 0xa85436, H = 5.2, rock = (x0, x1, z0, z1, y0 = -1, y1 = H) => B.box(M.rock, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, { c: RK, solid: true });
    rock(-96, -92, 38, 56); rock(-92, -76, 49, 56); rock(-86, -76, 47.1, 49); rock(-86, -76, 38, 44.9); rock(-88.9, -86, 38, 43); rock(-92, -90.2, 38, 43);
    rock(-86, -76, 44.9, 47.1, 2.15); rock(-92, -86, 43, 49, 2.7); rock(-90.2, -88.9, 38, 43, 1.25);
    for (const [y, hh, k, c] of [[2.9, 0.5, 0.12, 0xc98a5a], [4.1, 0.4, 0.1, 0x9a4a2e], [H, 0.7, -0.5, 0xb8623a]]) B.box(M.rock, 20 + 2 * k, hh, 18 + 2 * k, -86, y, 47, { c });
    for (let i = 0; i < 9; i++) B.geo(M.rock, rockGeo(i + 3, 1), [-94.5 + i * 2.1, H + 0.9, 40 + (i * 5.3) % 14], [0, i, 0], [1.5 + (i % 3) * 0.5, 0.8, 1.3], [0xb8623a, 0x9a4a2e, 0xc98a5a][i % 3]);
    for (const [cx, cz, s] of [[-96, 38, 2.2], [-96, 56, 2.4], [-76, 56, 2.2], [-76, 38, 2.0], [-94, 37.6, 1.5], [-83, 37.6, 1.7], [-79, 37.7, 1.3], [-75.7, 40.5, 1.4], [-75.7, 52, 1.6], [-85, 56.3, 1.8], [-96.3, 47, 1.7]])
      B.geo(M.rock, rockGeo(Math.round(cx + cz) & 7, 1), [cx, s * 0.7, cz], [0, cx, 0], [s, s * 1.3, s], [0x9a4a2e, 0xb8623a, 0xa85436][Math.round(cz) % 3]);
    const lin = (x0, x1, z0, z1, y0, y1) => B.box(M.plaster, Math.max(0.04, x1 - x0), y1 - y0, Math.max(0.04, z1 - z0), (x0 + x1) / 2, y0, (z0 + z1) / 2, { c: 0x8a7464 });      // rough grey rock inside
    lin(-86, -76.1, 44.9, 44.9, 0, 2.15); lin(-86, -76.1, 47.1, 47.1, 0, 2.15); lin(-86, -76.1, 44.9, 47.1, 2.13, 2.17); lin(-92, -86, 43, 49, 2.68, 2.72); lin(-92, -92, 43, 49, 0, 2.7); lin(-92, -86, 49, 49, 0, 2.7);
    lin(-86, -86, 43, 44.9, 0, 2.7); lin(-86, -86, 47.1, 49, 0, 2.7); lin(-86, -86, 44.9, 47.1, 2.15, 2.7); lin(-92, -90.2, 43, 43, 0, 2.7); lin(-88.9, -86, 43, 43, 0, 2.7); lin(-90.2, -88.9, 43, 43, 1.25, 2.7); lin(-90.2, -90.2, 38.1, 43, 0, 1.25); lin(-88.9, -88.9, 38.1, 43, 0, 1.25); lin(-90.2, -88.9, 38.1, 43, 1.23, 1.27);
    const T = 0x6a4a30;
    for (const pz of [44.72, 47.28]) B.box(M.wood, 0.26, 2.3, 0.26, -75.85, 0, pz, { c: T }); B.box(M.wood, 0.3, 0.3, 3.1, -75.85, 2.15, 46, { c: T });
    sign('SILVER QUEEN', -75.9, 2.95, 46, 2.8, 0.55, { bg: '#3a2a1c', fg: '#e0c080', ry: Math.PI / 2 });
    for (const tx of [-78.5, -81, -83.5]) { for (const pz of [45, 47]) B.box(M.wood, 0.16, 2.15, 0.16, tx, 0, pz, { c: T }); B.box(M.wood, 0.2, 0.18, 2.2, tx, 1.97, 46, { c: T }); }
    for (const px of [-90.33, -88.77]) B.box(M.wood, 0.2, 1.3, 0.2, px, 0, 37.9, { c: T }); B.box(M.wood, 1.9, 0.2, 0.24, -89.55, 1.25, 37.9, { c: T });
    for (const [lx, ly, lz] of [[-81, 1.75, 45.1], [-91.85, 1.8, 46], [-89, 1.9, 48.9]]) B.box(M.glow, 0.12, 0.18, 0.12, lx, ly, lz, { c: 0xffb050 });
    for (const s of [-0.3, 0.3]) B.box(M.metal, 20, 0.06, 0.05, -80, 0, 46 + s, { c: 0x4a4a52 }); for (let tx = -89.6; tx < -70; tx += 1) B.box(M.wood, 0.16, 0.04, 1.0, tx, 0, 46, { c: 0x4a3626 });
    const tub = (x, z) => { B.box(M.metal, 1.3, 0.6, 0.85, x, 0.3, z, { c: 0x3a3a40, solid: true }); for (const a of [-0.4, 0.4]) for (const s of [-0.3, 0.3]) B.cyl(M.metal, 0.16, 0.16, 0.06, x + a, 0.13, z + s, { rx: Math.PI / 2, c: 0x2a2a2e, seg: 10 }); B.geo(M.rock, rockGeo(5, 0), [x, 0.95, z], [0, 0, 0], [0.55, 0.3, 0.36], 0x8a8a92); };
    tub(-72.5, 46); tub(-87.4, 46);
    crate(B, M, -91.2, 0, 48.2, 0.8, 0.2); barrel(B, M, -91.3, 0, 44); rubble(B, M, -87, 0, 48.2, 0.8, 0x8a8a92, 5); B.box(M.wood, 0.04, 0.9, 0.04, -91.75, 0, 45.3, { rz: 0.3, c: T }); B.box(M.metal, 0.05, 0.05, 0.44, -91.9, 0.84, 45.3, { c: 0x3a3e44 });
    rubble(B, M, -70.5, 0, 50.5, 1.8, 0x9a7a6a); rubble(B, M, -73, 0, 41, 1.3, 0x9a7a6a); woodpile(B, M, -74, 0, 49.4, Math.PI / 2, { w: 1.4, h: 0.8, d: 3 });
    B.geo(M.flat, horseGeo(0x5a4a3a, 0x1c1410), [-68, 0, 46.5], [0, 2, 0], 0.85); beast(world, -68, 46.5, 2, 0.8, 2.4, 0, 1.8, 0.2);
    extraFoes.push(['bandit', -88.4, 47.2, { y: 0.5, patrol: false, yaw: Math.PI / 2 }], ['cowboy', -70, 43, {}]); extraPicks.push([-90.6, 47.2, 0.5]);
  }
  // ---- people about the edges of town: the preacher at his altar, the gravedigger at the open grave, the homesteader's wife sweeping her porch ----
  who('westMan', 62, 0.06, -31.4, Math.PI, { pose: 'pray', over: { hat: null, shirt: 0x1c1c20, pants: 0x1c1c20, extras: ['coat', 'collar'], coat: 0x1c1c20 } });
  who('westMan', 64, 0, 39.1, Math.PI, { pose: 'hips', over: { hat: 'fedora', hatC: 0x3a342c } });
  who('westWoman', -36.8, 0.14, 34, Math.PI, { pose: 'work' }); B.cyl(M.wood, 0.015, 0.015, 1.3, -36.8, 0.14, 33.52, { rx: -0.25, c: 0x8a6a44, seg: 5 }); B.box(M.thatch, 0.3, 0.2, 0.08, -36.8, 0.14, 33.35, { c: 0xc8a850 });

  // ---- far mesas ----------------------------------------------------------------------
  const mesa = (x, z, rx, rz, h, ry) => {
    const y0 = world.height(x, z) - 4, bands = [0x9a4a2e, 0xb8623a, 0xc98a5a, 0xa85436, 0xd09a6a];
    let y = y0, k = 1;
    B.geo(M.rock, new THREE.CylinderGeometry(0.8, 1.6, 1, 9), [x, y0 + h * 0.2, z], [0, ry, 0], [rx, h * 0.4, rz], 0x9a5a3a);
    for (let i = 0; i < 5; i++) {
      const hh = h * (0.14 + ((i * 7) % 5) * 0.035);
      B.geo(M.rock, new THREE.CylinderGeometry(0.93 + (i % 2) * 0.05, 1, 1, 9 + (i % 3)), [x, y + h * 0.3 + hh / 2, z], [0, ry + i * 0.4, 0], [rx * k, hh, rz * k], bands[i]);
      y += hh; k *= 0.93 + (i % 2) * 0.05;
    }
  };
  mesa(-260, -150, 60, 42, 62, 0.3); mesa(-330, 40, 46, 70, 80, 0.8); mesa(-210, 190, 70, 40, 50, 1.2); mesa(60, -280, 90, 50, 70, 0.1);
  mesa(250, -160, 50, 60, 58, 0.5); mesa(300, 90, 60, 44, 74, 2.0); mesa(120, 270, 80, 46, 56, 0.9); mesa(-90, -300, 40, 40, 90, 0.2);
  mesa(-170, -60, 22, 18, 38, 0.6); mesa(190, 30, 20, 26, 34, 1.4); mesa(-140, 120, 18, 22, 30, 0.2);

  // ---- vegetation and rocks ----------------------------------------------------------
  const built = (x, z) => (x > -99 && x < -64 && z > 35 && z < 58) || (x > -9 && x < 35 && z > -53 && z < -40) || (x > 58 && x < 73 && z > 5 && z < 19) || (z > -52 && z < -48);      // the mine, the depot, the stage station, the track
  const openLand = (x, z) => (Math.abs(z) > 27 || Math.abs(x) > 92) && !built(x, z) && !(x > 54 && x < 86 && z < -14 && z > -40) && !(x < -60 && x > -80 && z < -8 && z > -32)
    && !(x > 42 && x < 74 && z > 23 && z < 54) && !(x > -49 && x < -27 && z > 27 && z < 47);
  const cacti = [], rocks = [], sage = [], tufts = [];
  for (let i = 0; i < 2600 && cacti.length < 90; i++) { const x = (R() - 0.5) * 420, z = (R() - 0.5) * 300; if (openLand(x, z)) { cacti.push({ x, y: world.height(x, z) - 0.1, z, ry: R() * 6.28, s: 0.7 + R() * 0.7 }); if (Math.abs(x) < 106 && Math.abs(z) < 70) world.addCyl(x, z, 0.4, -5, 20); } }
  for (let i = 0; i < 400; i++) { const x = (R() - 0.5) * 460, z = (R() - 0.5) * 340; if (openLand(x, z)) { const s = 0.5 + R() * R() * 3.2; rocks.push({ x, y: world.height(x, z) + s * 0.15, z, ry: R() * 6.28, s: [s, s * (0.6 + R() * 0.5), s], c: R.pick([0xb07a52, 0x9a6442, 0xc08a60]) }); if (s > 1.1 && Math.abs(x) < 106 && Math.abs(z) < 70) world.addCyl(x, z, s * 0.85, -5, world.height(x, z) + s * 0.6); } }
  for (let i = 0; i < 1500; i++) { const x = (R() - 0.5) * 380, z = (R() - 0.5) * 280; if (openLand(x, z)) sage.push({ x, y: world.height(x, z) + 0.15, z, ry: R() * 6.28, s: [0.5 + R() * 0.7, 0.35 + R() * 0.35, 0.5 + R() * 0.7], c: R.pick([0x8a9a6a, 0x9aa878, 0x7a8a5a, 0xa89a6a]) }); }
  for (let i = 0; i < 7000; i++) {
    const x = (R() - 0.5) * 300, z = (R() - 0.5) * 200;
    const inStreet = Math.abs(z) < 5.2 && Math.abs(x) < 50;
    if (inStreet || (Math.abs(z) < 21 && Math.abs(z) > 5 && Math.abs(x) < 46 && !(Math.abs(z) > 8 && false))) continue;
    if ((Math.abs(z) < 21 && Math.abs(x) < 46) || built(x, z)) continue;
    tufts.push({ x, y: world.height(x, z), z, ry: R() * 6.28, s: [0.3 + R() * 0.3, 0.18 + R() * 0.3, 0.3 + R() * 0.3], c: R.pick([0xe8d090, 0xd8b870, 0xc8aa68, 0xf0dca0]) });
  }
  { const inB = (x, z) => (x > -10 && x < 22 && z > 33 && z < 64) || (x > 27 && x < 33 && z > 34.5 && z < 41) || (x > -19 && x < -7 && z > 31 && z < 39);      // nothing grows through the butte, the cellar or the ruin
    for (const L of [cacti, rocks, sage, tufts]) for (const it of L) if (inB(it.x, it.z)) it.s = 0;
    world.cyls = world.cyls.filter((c) => !inB(c.x, c.z)); }
  root.add(instanced(cactusGeo(), M.flat, cacti));
  root.add(instanced(rockGeo(3, 1), M.rock, rocks, { solid: true }));
  root.add(instanced(new THREE.IcosahedronGeometry(1, 1), M.rock, sage, { cast: true }));
  const grassMat = windify(M.flat2.clone(), shared, 0.22, 1, 2.2);
  root.add(instanced(tuftGeo(7, 0xb89a60, 0xffffff), grassMat, tufts, { cast: false, thin: true }));

  // ---- things that move ----------------------------------------------------------------
  const weeds = [];
  const twigs = [];
  for (let k = 0; k < 46; k++) twigs.push(xf(new THREE.TorusGeometry(0.3 + R() * 0.25, 0.008, 3, 9, 2 + R() * 4), [(R() - 0.5) * 0.25, (R() - 0.5) * 0.25, (R() - 0.5) * 0.25], [R() * 6.3, R() * 6.3, R() * 6.3], 1, R.pick([0x9a7a48, 0x7a5a34, 0xb89a60])));
  const weedGeo = merge(twigs);
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(weedGeo, M.flat); m.scale.setScalar(0.9 + R() * 0.5); m.castShadow = true; root.add(m);
    weeds.push({ m, x: -80 + R() * 160, z: (R() - 0.5) * 12 + (i > 2 ? 30 : 0), v: 2.5 + R() * 2.5, ph: R() * 6, r: 0.55 });
  }
  root.add(makeAmbient(shared, { count: 1100, box: 34, boxY: 14, size: 0.05, colorA: 0xffd9a0, colorB: 0xffb870, additive: true, alpha: 0.55, bright: 1.5, fall: -0.04, wind: [0.9, 0, 0.25], flutter: 0.5 }));

  const enemies = [
    ['cowboy', 44, 3, { yaw: 1.4 }], ['cowboy', 33, -3.5, {}], ['bandit', 24.5, 4.4, {}], ['cowboy', 9, -4, { patrol: true }],
    ['bandit', -23.5, 6.7, { y: 4, static: true, yaw: 3.1 }], ['cowboy', -6.5, -6.7, { y: 4, static: true, yaw: 0 }],
    ['cowboy', -8, -15, { y: 1, patrol: false, yaw: 0.6 }], ['bandit', -0.5, -17.5, { y: 1, patrol: false, yaw: -0.4 }],
    ['cowboy', -14.5, -1.5, {}], ['bandit', -27, -4.5, {}], ['cowboy', -34, 3.5, { patrol: true }], ['bandit', -46, -2, {}],
    ['cowboy', -57, 11.5, {}], ['bandit', -62, -6, { patrol: true }], ['westBoss', -68, -9, { yaw: 1.2, patrol: false }],
    ['bandit', 15, -10.5, { y: 1, patrol: false, yaw: 0.3 }], ['cowboy', 36.4, -14, { y: 1, patrol: false, yaw: 0.2 }], ['bandit', -72.5, -23, { y: 0.5, patrol: false, yaw: 0.4 }],
    ['bandit', 50, 40, {}], ['cowboy', 67, 43, { patrol: true }], ['cowboy', 59.2, 47.8, { y: 0.5, ambush: 9, yaw: Math.PI }],
    ['bandit', -36.5, 39.4, { y: 0.5, patrol: false, yaw: Math.PI }], ['cowboy', -44, 31, {}],
  ];
  const tonicGeo = merge([gCyl(0.075, 0.085, 0.24, 0x8a4a14, [0, 0, 0], [0, 0, 0], 1, 8), gCyl(0.03, 0.06, 0.1, 0x8a4a14, [0, 0.17, 0], [0, 0, 0], 1, 8), gCyl(0.034, 0.034, 0.04, 0xc8a878, [0, 0.24, 0], [0, 0, 0], 1, 6), gCyl(0.088, 0.088, 0.1, 0xf0e8d0, [0, -0.01, 0], [0, 0, 0], 1, 8)]);

  let t0 = 0;
  return {
    env: {
      sunDir: [-0.86, 0.31, 0.40], sunColor: 0xffb26b, sunLight: 0xffc993, sunIntensity: 4.4,
      skyTop: 0x2f6ac2, skyHorizon: 0xf6bf80, skyGround: 0xb98a5e, haze: 0.42,
      fogColor: 0xe6b88a, fogDensity: 0.0024, hemiSky: 0x9db6e6, hemiGround: 0x8f5c3a, hemiIntensity: 1.7, envIntensity: 0.6,
      cloudCover: 0.5, cloudScale: 0.42, cloudLit: 0xffe6c4, cloudShade: 0xd08a72,
      bloom: 0.32, bloomRadius: 0.65, bloomThreshold: 1.35, rays: 0.42, rayThreshold: 1.75, exposure: 1.18,
      saturation: 1.1, contrast: 1.08, vignette: 0.32, tintHi: 0xfff0dc, tintLo: 0xe6ecff, shadowRange: 85,
    },
    spawn: { x: 72, z: 0.5, yaw: Math.PI / 2 },
    vista: { c: [0, 4, 0], r: 60, h: 4.5, a: 0.0, swing: 0.11, speed: 0.08, up: 1.5 },
    enemies: enemies.concat(extraFoes), pickups: [[27.5, -6.6, 1], [-9.5, -18.5, 1], [-31, 6.6, 1], [-50, 1, 1], [-58, -12, 1], [16.4, -17.2, 1], [41.3, -15.6, 1], [59.6, 48.6, 0.5], [-40.4, 39.6, 0.5], [-74.8, -26.6, 0.5]].concat(extraPicks),
    dust: [0.72, 0.52, 0.34],
    makePickup: () => new THREE.Mesh(tonicGeo, M.flat),
    update(dt, t, g) {
      fan.rotation.z -= dt * 2.4; idle(people, t);
      for (const w of weeds) {
        w.x += w.v * dt; w.z += Math.sin(t * 0.3 + w.ph) * dt * 0.4;
        if (w.x > 90) { w.x = -92; w.z = (R() - 0.5) * 12; }
        const y = world.height(w.x, w.z) + w.r + Math.abs(Math.sin(t * 2.2 + w.ph)) * 0.35;
        w.m.position.set(w.x, y, w.z); w.m.rotation.z -= w.v * dt / w.r; w.m.rotation.x += dt * 0.3;
      }
      // batwing doors swing when someone walks through
      const near = (px, pz) => Math.hypot(px + 4, pz + 8.1) < 1.5;
      let push = 0;
      if (near(g.player.pos.x, g.player.pos.z)) push = g.player.vel.z < 0 ? -1 : 1;
      for (const e of g.enemies) if (e.alive && near(e.pos.x, e.pos.z)) push = 1;
      for (const d of doors) {
        d.v += (-d.a * 30 - d.v * 2.2 + push * 60 * d.s * -1) * dt; d.a += d.v * dt; d.a = Math.max(-1.4, Math.min(1.4, d.a));
        d.m.rotation.y = d.a * d.s * -1 * (push >= 0 ? 1 : 1);
      }
      // low dust drifting across the street
      t0 -= dt;
      if (t0 <= 0) {
        t0 = 0.12;
        const p = g.gfx.camera.position;
        g.gfx.soft.spawn(p.x + (Math.random() - 0.6) * 50, world.height(p.x, p.z) + 0.2 + Math.random() * 0.5, p.z + (Math.random() - 0.5) * 40, 2.2 + Math.random() * 2, 0.15, 0.6,
          { life: 4 + Math.random() * 3, s0: 0.6, s1: 3.4, r: 0.9, g: 0.62, b: 0.4, a: 0.07, drag: 0.05 });
      }
    },
  };
}

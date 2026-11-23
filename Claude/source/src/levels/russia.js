// Chapter VII - a Soviet city in winter, 1974.
import * as THREE from 'three';
import { Heightfield, prismGeo } from '../build.js';
import { makeAmbient } from '../gfx.js';
import { signTexture, drawTexture } from '../tex.js';
import { makeHumanoid } from '../actors.js';
import { instanced, room, bars, steps, shelf, barrel, crate, gCyl, merge, ladder, den, rod, table, bed, sacks, rug, pots, deck, stall, crawlway, person, idle } from '../props.js';
import { fbm, smooth } from '../util.js';

export const russia = {
  id: 'russia', theme: 'theme-russia', chapter: 'Chapter VII', title: 'Stalnogorsk', place: 'Stalnogorsk · Soviet Union · winter of 1974',
  story: 'The Committee has seized the manuscript that names every camp and every grave. It lies in the grey tower on the square, behind agents, militia and dogs. Cross the district, break into the Committee building and bring the truth out.',
  weapon: 'revolver', weaponName: 'Pistol & knife', alt: 'right mouse — aim   ·   F — knife', knife: true,
  heroes: [
    { look: 'solzhenitsyn', name: 'Aleksandr Solzhenitsyn', who: 'Artillery captain, prisoner, writer', trait: 'Frontline officer', effect: 'submachine gun; takes 15% less damage', weapon: 'sten', weaponName: 'Submachine gun & knife', mods: { armor: 0.85 }, sleeve: 0x4e4e46, cuff: 0x3a3a34 },
    { look: 'sakharov', name: 'Andrei Sakharov', who: 'Physicist, and the conscience of a country', trait: 'Precision', effect: 'pistol whose shots hit 60% harder', mods: { gun: 1.6 }, sleeve: 0x4a4a54, cuff: 0xe8e4d8 },
    { look: 'nureyev', name: 'Rudolf Nureyev', who: 'The dancer who leapt to freedom in 1961', trait: 'The leap', effect: 'moves 25% faster; agents notice him later', mods: { speed: 1.25, stealth: 0.75 }, sleeve: 0x1c1c22, cuff: 0xf0ece0 },
  ],
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> fire &nbsp; <kbd>Right mouse</kbd> aim &nbsp; <kbd>R</kbd> reload &nbsp; <kbd>F</kbd> knife',
  foes: 'agents remain', foesNone: 'The square is silent', bossName: 'Colonel Voronin', bossDown: 'The Committee has lost its colonel', pickupText: 'Hot tea  +35',
  deadTitle: 'The cellar', deadSub: 'No one will ask where you went.', clearTitle: 'The manuscript is out',
  build,
};

const SNOW = 0xe6eaf0, CONC = 0x9a9c9c, GRAN = 0x6e6a6c, RED = 0xb81c1c, IRON = 0x4a4c50;

function build({ game, gfx, world, B, M, root, rand, shared }) {
  const R = rand, PI = Math.PI;
  // ---- ground: flat, snowed-in, with cleared roads ------------------------------------
  const hf = new Heightfield(760, 150, (x, z) => {
    const paved = Math.max(1 - smooth(9, 13, Math.abs(x)), (1 - smooth(46, 52, Math.abs(x))) * (1 - smooth(30, 36, Math.abs(z + 6))), z < -30 ? 1 - smooth(52, 58, Math.abs(x)) : 0,
      (1 - smooth(11, 15, Math.abs(x - 90))) * (1 - smooth(68, 74, Math.abs(z - 38))),          // level ground under the goods siding
      (1 - smooth(11, 14, Math.abs(x + 92))) * (1 - smooth(22, 26, Math.abs(z + 13))),          // and under the old church and the boiler house
      (1 - smooth(21, 25, Math.abs(x - 49))) * (1 - smooth(12, 15, Math.abs(z - 39))),           // over the metro
      (1 - smooth(12, 15, Math.abs(x + 92))) * (1 - smooth(8, 11, Math.abs(z - 19))));           // under the church of St Nicholas
    return (fbm(x * 0.06, z * 0.06, 3, 4) - 0.5) * 0.4 * (1 - paved);
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { x0: -104, x1: 104, z0: -86, z1: 104 };
  world.maxSlope = 0.95; world.waterY = -50;
  const cS = new THREE.Color(0xdfe5ec), cS2 = new THREE.Color(0xc4ccd6), cD = new THREE.Color(0x8a8e94), tmp = new THREE.Color();
  const ground = hf.mesh(M.ground, (x, z) => tmp.copy(cS).lerp(cS2, fbm(x * 0.05, z * 0.05, 3, 6)).lerp(cD, (1 - smooth(8, 16, Math.abs(x))) * 0.5));
  { // the ground is not drawn over the well of the metro's escalators, inside the pavilion (x 29.5 to 33.8, z 33.6 to 37.2)
    const m = (ground.material = M.ground.clone());
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vHoleXZ;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHoleXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vHoleXZ;').replace('void main() {', 'void main() {\n  if (vHoleXZ.x > 29.45 && vHoleXZ.x < 33.85 && vHoleXZ.y > 33.55 && vHoleXZ.y < 37.25) discard;');
    };
    m.customProgramCacheKey = () => 'metro-hole';
  }
  root.add(ground);
  B.box(M.flat, 15, 0.08, 140, 0, -0.03, 34, { c: 0x46484c });                             // the prospekt
  for (const s of [-1, 1]) { B.box(M.metal, 0.09, 0.03, 140, s * 0.75, 0.05, 34, { c: 0x7a7c80 }); B.box(M.flat, 0.5, 0.2, 140, s * 7.7, -0.04, 34, { c: 0x8a8c90 }); }
  for (let z = 100; z > -30; z -= 6) B.box(M.flat, 0.16, 0.01, 2.4, 3.6, 0.055, z, { c: 0xc8c8c4 });
  B.box(M.cobble, 100, 0.1, 62, 0, -0.04, -6, { c: 0x9a9a9e });                           // the square
  B.box(M.flat, 100, 0.08, 24, 0, -0.03, -46, { c: 0x505256 });

  // ---- pieces ---------------------------------------------------------------------------
  const lights = [];
  const lamp = (x, y, z, i = 26, d = 16, c = 0xffc070) => { if (lights.length >= 7) return; const l = new THREE.PointLight(c, i, d, 1.7); l.position.set(x, y, z); root.add(l); lights.push(l); };
  const sign = (text, x, y, z, w, h, o = {}) => {
    const t = signTexture(text, { font: '"Arial Black", Arial, sans-serif', border: false, bg: '#8a1414', fg: '#f0e0b8', ...o }); t.userData.own = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.position.set(x, y, z); m.rotation.y = o.ry || 0; root.add(m);
  };
  // panel-block facade: 8 x 8 windows, some of them lit, tiled over plain boxes
  const pat = []; for (let i = 0; i < 64; i++) pat.push(R() < 0.26);
  const drawF = (lit) => (g, w, h) => {
    g.fillStyle = lit ? '#000' : '#cacac6'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      const x = i * 32, y = j * 32, on = pat[j * 8 + i];
      if (lit) { if (on) { g.fillStyle = '#f2c468'; g.fillRect(x + 7, y + 8, 18, 15); } continue; }
      g.strokeStyle = 'rgba(40,40,44,0.4)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, 32, 32);
      g.fillStyle = on ? '#f2c468' : '#2a3442'; g.fillRect(x + 7, y + 8, 18, 15); g.fillStyle = 'rgba(30,30,34,0.55)'; g.fillRect(x + 15.5, y + 8, 1, 15);
      if ((i + j) % 3 === 0) { g.fillStyle = '#8c8e8e'; g.fillRect(x + 4, y + 24, 24, 5); }
    }
  };
  const mkT = (lit) => { const t = drawTexture(256, 256, drawF(lit)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.own = true; return t; };
  const FAC = new THREE.MeshStandardMaterial({ map: mkT(false), emissiveMap: mkT(true), emissive: new THREE.Color(1.5, 1.05, 0.5), vertexColors: true, roughness: 0.95 });
  FAC.userData.tile = 24;
  const roofed = (x, y, z, w, d) => { B.box(M.flat, w + 0.4, 0.5, d + 0.4, x, y, z, { c: 0x4a4c50 }); B.box(M.flat, w - 0.4, 0.22, d - 0.4, x, y + 0.5, z, { c: SNOW }); };
  /** Prefabricated block. o.doors: -1 / +1 = side of the stairwell doors. */
  const block = (x, z, w, d, h, c = 0xffffff, o = {}) => {
    if (o.gap) {                                                    // a stretch of the ground floor is left out: a flat is built there
      const [a, b] = o.gap, x0 = x - w / 2, x1 = x + w / 2;
      B.box(FAC, w, h - 3, d, x, 2.7, z, { c, solid: true }); B.box(FAC, a - x0, 3, d, (a + x0) / 2, -0.3, z, { c, solid: true }); B.box(FAC, x1 - b, 3, d, (b + x1) / 2, -0.3, z, { c, solid: true });
    } else B.box(FAC, w, h, d, x, -0.3, z, { c, solid: true });
    roofed(x, h - 0.3, z, w, d);
    if (!o.doors) return;
    const along = w >= d, n = Math.max(1, Math.round((along ? w : d) / 12)), s = o.doors;
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n - 0.5) * (along ? w : d), px = along ? x + t : x + s * (w / 2 + 0.7), pz = along ? z + s * (d / 2 + 0.7) : z + t;
      B.box(M.flat, along ? 2.6 : 1.5, 0.18, along ? 1.5 : 2.6, px, 2.5, pz, { c: 0x5a5c60 });
      if (i !== o.open) B.box(M.flat, along ? 1.3 : 0.12, 2.2, along ? 0.12 : 1.3, along ? px : x + s * (w / 2 + 0.04), 0, along ? z + s * (d / 2 + 0.04) : pz, { c: 0x4a3626 });
      B.box(M.stone, along ? 2.4 : 1.3, 0.3, along ? 1.3 : 2.4, px, -0.14, pz, { c: 0x8a8a8a, solid: true });
    }
  };
  const car = (x, z, ry, c = 0x16161a, van = false) => {
    const cs = Math.cos(ry), sn = Math.sin(ry), P = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    B.box(M.flat, 1.75, van ? 1.5 : 0.6, van ? 4.4 : 4.3, x, 0.32, z, { ry, c });
    if (!van) { const [a, b] = P(0, -0.2); B.box(M.flat, 1.55, 0.52, 2.1, a, 0.92, b, { ry, c }); B.box(M.flat, 1.58, 0.34, 1.86, a, 1.0, b, { ry, c: 0x1c2630 }); B.box(M.flat, 1.4, 0.06, 1.9, a, 1.44, b, { ry, c: SNOW }); }
    else { const [a, b] = P(0, 1.35); B.box(M.flat, 1.77, 0.5, 1.2, a, 1.22, b, { ry, c: 0x1c2630 }); B.box(M.flat, 1.78, 0.2, 4.42, x, 0.95, z, { ry, c: 0x2a4a9a }); B.box(M.glow, 0.3, 0.14, 0.2, x, 1.84, z, { ry, c: 0x3a6aff }); }
    for (const [lx, lz] of [[0.85, 1.4], [-0.85, 1.4], [0.85, -1.4], [-0.85, -1.4]]) { const [a, b] = P(lx, lz); B.geo(M.flat, new THREE.CylinderGeometry(0.33, 0.33, 0.22, 10), [a, 0.33, b], [0, ry, PI / 2], 1, 0x121214); }
    for (const k of [-0.6, 0.6]) { const [a, b] = P(k, van ? 2.21 : 2.16); B.box(M.glow, 0.24, 0.12, 0.04, a, 0.66, b, { ry, c: 0xfff0c0 }); }
    world.addBox(x, z, 1.9, 4.5, ry, -1, van ? 1.9 : 1.5);
  };
  const street = (x, z, lit = false) => {
    const s = x > 0 ? -1 : 1;
    B.cyl(M.metal, 0.07, 0.1, 7, x, 0, z, { c: IRON, seg: 6 }); B.box(M.metal, 1.7, 0.08, 0.08, x + s * 0.8, 6.9, z, { c: IRON }); B.box(M.glow, 0.5, 0.12, 0.22, x + s * 1.5, 6.78, z, { c: 0xffd9a0 });
    world.addCyl(x, z, 0.12, 0, 7); if (lit) lamp(x + s * 1.5, 6.1, z, 70, 24, 0xffd0a0);
  };
  const cwall = (ax, az, bx, bz, h = 2.6, c = CONC) => {
    const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    B.box(M.plaster, L, h + 0.4, 0.3, mx, -0.4, mz, { ry, c, solid: true }); B.box(M.flat, L, 0.12, 0.4, mx, h, mz, { ry, c: SNOW });
  };
  const bench = (x, z, ry = 0) => { B.box(M.woodH, 1.8, 0.1, 0.45, x, 0.4, z, { ry, c: 0x6a5a3a }); B.box(M.woodH, 1.8, 0.4, 0.08, x - Math.sin(ry) * 0.2, 0.55, z - Math.cos(ry) * 0.2, { ry, c: 0x6a5a3a }); world.addBox(x, z, 1.8, 0.5, ry, 0, 0.9); };
  const statue = (x, y, z, ry, s, spec, pose) => {
    const c = 0x5e6468, f = makeHumanoid(M, { lip: c, skin: c, hair: c, shirt: c, sleeve: c, pants: c, boots: c, belt: c, coat: c, ...spec, scale: s });
    f.group.position.set(x, y, z); f.group.rotation.y = ry; pose(f); root.add(f.group);
  };
  const people = [], extraFoes = [], extraPicks = [];
  /** Somebody who takes no part in the fight; stands on the ground unless o.y says otherwise. */
  const folk = (look, x, z, yaw, o = {}) => { people.push(person(B, M, root, look, x, o.y ?? world.height(x, z), z, yaw, o)); };
  /** A bank of snow left by the plough: cover as high as a crouching man. */
  const bank = (x, z, ry = 0, len = 4.4) => { B.geo(M.flat, new THREE.SphereGeometry(1, 9, 6), [x, 0.15, z], [0, ry, 0], [len / 2, 1, 1], 0xdfe5ec); world.addBox(x, z, len * 0.8, 1.3, ry, -1, 1.0); };
  const trees = [];
  const birch =(x, z) => { trees.push({ x, y: world.height(x, z) - 0.1, z, ry: R() * 6.28, s: 0.8 + R() * 0.5 }); world.addCyl(x, z, 0.2, -1, 6); };

  // ---- the prospekt -----------------------------------------------------------------------
  for (const [z, lit] of [[90, 0], [66, 1], [42, 0], [14, 1]]) { street(-9.2, z, !!lit); street(9.2, z + 6, false); }
  car(-5.6, 84, 0.04, 0x8a2a22); car(5.4, 74, PI + 0.03, 0xc8c4b8); car(-5.6, 46, 0, 0x3a5a6a); car(5.5, 56, PI, 0x16161a);
  { // bus shelter
    const x = 11.6, z = 68; B.box(M.flat, 0.1, 2.3, 4.2, x + 1.0, 0, z, { c: 0x7a9aa6, solid: true }); B.box(M.flat, 2.2, 0.12, 4.6, x, 2.3, z, { c: 0x5a5c60 }); B.box(M.flat, 2.0, 0.1, 4.4, x, 2.42, z, { c: SNOW });
    for (const k of [-2, 2]) { B.cyl(M.metal, 0.05, 0.05, 2.3, x - 0.9, 0, z + k, { c: IRON, seg: 5 }); world.addCyl(x - 0.9, z + k, 0.08, 0, 2.3); }
    B.box(M.woodH, 0.4, 0.08, 3.2, x + 0.6, 0.45, z, { c: 0x6a5a3a }); B.box(M.flat, 0.5, 0.5, 0.04, x - 0.9, 2.7, z + 2, { c: 0xe8c020 });
  }
  { // news kiosk
    const x = -12.5, z = 31; B.box(M.plaster, 2.6, 2.5, 2.6, x, -0.2, z, { c: 0x4a6a8a, solid: true }); B.box(M.flat, 3.0, 0.14, 3.0, x, 2.3, z, { c: 0x3a4a5a }); B.box(M.flat, 2.8, 0.1, 2.8, x, 2.44, z, { c: SNOW });
    B.box(M.glow, 0.05, 0.8, 1.6, x + 1.31, 1.1, z, { c: 0xffe0a0 }); sign('ГАЗЕТЫ', x + 1.34, 2.05, z, 2.2, 0.36, { ry: PI / 2, bg: '#e8e0d0', fg: '#1c2a4a' });
  }
  // ---- the south-west courtyard ---------------------------------------------------------------
  block(-50, 80, 16, 11, 15, 0xd8d8d2, { doors: -1 }); block(-22, 80, 16, 11, 15, 0xd8d8d2, { doors: -1 });   // between the two, the section with its stairwell and flats (below) block(-62, 52, 11, 42, 15, 0xcfd4d0, { doors: 1 }); block(-32, 36, 40, 11, 15, 0xd4d0c8, { doors: 1, gap: [-33, -23], open: 1 });
  { // a ground-floor flat in that block, and the stairwell beside it that runs right through: a short cut from the courtyard to the square
    const x = -28, z = 36, F = 0.16, WC = 0xc8c4ba, H = 2.34;
    room(B, M, x, 0.1, z, { w: 10, d: 11, h: 2.4, t: 0.3, mat: M.plaster, c: WC, base: 0.6, doors: [{ side: 's', at: -4, w: 1.6, h: 2.2 }, { side: 'n', at: -4, w: 1.6, h: 2.2 }],
      wins: [{ side: 's', at: 1.6, w: 1.6, y: 0.9, h: 1.3 }, { side: 'n', at: 1.6, w: 1.6, y: 0.9, h: 1.3 }], floor: { mat: M.woodH, c: 0x6a5a48 }, ceil: { mat: M.plaster, c: 0xb8b4ac } });
    B.box(M.stone, 2.4, 0.3, 1.3, x - 4, -0.14, z - 6.2, { c: 0x8a8a8a, solid: true });
    B.box(M.plaster, 0.15, H, 4.2, x - 3.05, F, z - 3.1, { c: WC, solid: true }); B.box(M.plaster, 0.15, H, 4.2, x - 3.05, F, z + 3.1, { c: WC, solid: true }); B.box(M.plaster, 0.15, H - 2.1, 2, x - 3.05, F + 2.1, z, { c: WC, solid: true });
    B.box(M.metal, 0.08, 0.5, 1.3, x - 4.66, F + 1.1, z + 3.4, { c: 0x3a5a8a }); for (let k = 0; k < 4; k++) B.box(M.flat, 0.02, 0.4, 0.02, x - 4.61, F + 1.15, z + 2.95 + k * 0.3, { c: 0x1c2a4a });      // letter boxes in the stairwell
    B.box(M.metal, 0.12, 0.6, 1.2, x - 4.62, F + 0.15, z - 3, { c: 0xb8b4a8 });                                                                                                                       // a radiator
    // the kitchen
    B.box(M.metal, 0.6, 0.85, 0.6, x + 4.3, F, z - 4.85, { c: 0xe8e4dc, solid: true }); B.box(M.flat, 0.56, 0.03, 0.56, x + 4.3, F + 0.85, z - 4.85, { c: 0x1c1c1e }); B.cyl(M.metal, 0.11, 0.13, 0.16, x + 4.3, F + 0.88, z - 4.85, { c: 0x3a6a8a, seg: 8 });
    B.box(M.woodH, 2.1, 0.85, 0.55, x + 2.85, F, z - 4.9, { c: 0x8a9a8a, solid: true }); B.box(M.metal, 0.6, 0.03, 0.45, x + 2.4, F + 0.85, z - 4.9, { c: 0xc8ccd0 });
    B.box(M.metal, 0.6, 1.4, 0.6, x - 2.6, F, z - 4.85, { c: 0xe8e8e2, solid: true });
    table(B, M, x - 0.4, F, z - 2.6, 0, { w: 1.2, d: 0.8, c: 0x6a4a30, top: 0x8ab0c8 }); for (const k of [-1, 1]) B.box(M.woodH, 0.34, 0.45, 0.34, x - 0.4 + k * 0.95, F, z - 2.6, { c: 0x6a4a30 });
    B.cyl(M.metal, 0.12, 0.09, 0.32, x - 0.6, F + 0.8, z - 2.6, { c: 0xc9a23a, seg: 10 }); B.cyl(M.metal, 0.045, 0.08, 0.12, x - 0.6, F + 1.12, z - 2.6, { c: 0xc9a23a, seg: 8 }); B.cyl(M.flat, 0.04, 0.035, 0.09, x - 0.1, F + 0.78, z - 2.4, { c: 0xb8601c, seg: 7 });
    // the room: iron bed under a wall carpet, wardrobe, the radio on the sideboard
    bed(B, M, x + 4.15, F, z + 3.9, 0, { c: 0x3a3a3e, blanket: 0x7a3a2a });
    B.box(M.cloth, 0.04, 1.3, 2.3, x + 4.67, F + 0.75, z + 3.9, { c: 0x7a2a26 }); B.box(M.cloth, 0.05, 0.8, 1.6, x + 4.665, F + 1.0, z + 3.9, { c: 0xb8863a }); B.box(M.cloth, 0.06, 0.4, 0.8, x + 4.66, F + 1.2, z + 3.9, { c: 0x2a3a5a });
    B.box(M.woodH, 1.5, 0.75, 0.45, x + 1.6, F, z + 4.95, { c: 0x5a3c26, solid: true }); B.box(M.woodH, 0.5, 0.3, 0.22, x + 1.4, F + 0.75, z + 4.95, { c: 0x6a4a30 }); B.box(M.glow, 0.22, 0.06, 0.02, x + 1.4, F + 0.86, z + 4.83, { c: 0xffd9a0 });
    B.box(M.woodH, 0.6, 1.9, 1.4, x - 2.6, F, z + 4.2, { c: 0x4a3020, solid: true });
    rug(B, M, x + 1, F, z + 2.2, 0, { w: 3, d: 2.2, c: 0x6a2a2a });
    B.cyl(M.flat, 0.01, 0.01, 0.3, x + 1, 2.2, z, { c: 0x1c1c1e, seg: 4 }); B.geo(M.cloth, new THREE.ConeGeometry(0.3, 0.24, 10, 1, true), [x + 1, 2.14, z], [0, 0, 0], 1, 0xc8742a); B.geo(M.glow, new THREE.SphereGeometry(0.07, 6, 5), [x + 1, 2.07, z], [0, 0, 0], 1, 0xffe0b0);
    extraFoes.push(['militia', x - 4, z - 1.5, { patrol: false }]);
  }
  {
    // swing
    for (const s of [-1, 1]) for (const k of [-1, 1]) B.cyl(M.metal, 0.045, 0.045, 2.6, -40 + s * 1.5, 0, 62 + k * 0.5, { rx: k * -0.2, c: 0x3a6a9a, seg: 6 });
    B.box(M.metal, 3.2, 0.08, 0.08, -40, 2.45, 62, { c: 0x3a6a9a }); for (const k of [-0.5, 0.5]) { B.box(M.metal, 0.02, 1.8, 0.02, -40 + k, 0.65, 62, { c: 0x2a2a2e }); } B.box(M.woodH, 0.5, 0.05, 0.22, -40.5, 0.62, 62, { c: 0xb83a2a }); B.box(M.woodH, 0.5, 0.05, 0.22, -39.5, 0.62, 62, { c: 0xb83a2a });
    world.addBox(-40, 62, 3.2, 0.5, 0, 0, 2.5);
    // the rocket every Soviet playground had
    B.cyl(M.metal, 0.55, 0.7, 2.6, -28, 0.6, 58, { c: 0xb8bcc2, seg: 10 }); B.geo(M.metal, new THREE.ConeGeometry(0.55, 1.5, 10), [-28, 3.95, 58], [0, 0, 0], 1, RED);
    for (let k = 0; k < 3; k++) B.box(M.metal, 0.06, 1.3, 0.9, -28 + Math.cos(k * 2.09) * 0.75, 0, 58 + Math.sin(k * 2.09) * 0.75, { ry: -k * 2.09 + PI / 2, c: RED }); world.addCyl(-28, 58, 0.9, 0, 4);
    B.box(M.woodH, 3, 0.3, 3, -34, -0.1, 52, { c: 0x8a6a3a, solid: true }); B.box(M.flat, 2.6, 0.06, 2.6, -34, 0.2, 52, { c: SNOW });
    for (const s of [-1, 1]) B.cyl(M.metal, 0.04, 0.04, 2.0, -46 + s * 1.3, 0, 66, { c: IRON, seg: 5 }); B.box(M.metal, 2.7, 0.05, 0.05, -46, 1.95, 66, { c: IRON }); B.box(M.cloth, 2.0, 1.3, 0.04, -46, 0.62, 66, { c: 0x8a3a3a }); world.addBox(-46, 66, 2.7, 0.2, 0, 0, 2);
    bench(-22, 66, 0.2); bench(-48, 48, 1.4);
    for (const [x, z] of [[-18, 48], [-17, 49.6]]) { B.box(M.metal, 1.5, 1.25, 1.1, x, 0, z, { c: 0x4a6a4a, solid: true }); B.box(M.flat, 1.4, 0.08, 1.0, x, 1.25, z, { c: SNOW }); }
    for (const [x, z] of [[-24, 50], [-44, 58], [-36, 68], [-20, 62], [-50, 68], [-30, 46]]) birch(x, z);
    car(-16.5, 58, 0.1, 0x5a6a3a);
  }
  // ---- the south-east: blocks, the food shop, garages -------------------------------------------
  block(38, 86, 44, 11, 15, 0xd6d6d0, { doors: -1 }); block(68, 56, 11, 46, 15, 0xccd0d0, { doors: -1 });
  {
    const x = 28, z = 50;
    room(B, M, x, 0, z, { w: 22, d: 11, h: 4.2, t: 0.4, mat: M.plaster, c: 0xb8b6ae, base: 0.6, doors: [{ side: 'w', at: 0, w: 2.4, h: 2.5 }, { side: 'e', at: 1.5, w: 1.6, h: 2.2 }], wins: [{ side: 's', at: -5.5, w: 4, y: 1.0, h: 1.8 }, { side: 's', at: 4.5, w: 4, y: 1.0, h: 1.8 }],
      floor: { mat: M.cobble, c: 0x8a8a84 }, ceil: { mat: M.plaster, c: 0x9a9a94 } });
    roofed(x, 4.4, z, 22, 11);
    sign('ГАСТРОНОМ', x - 11.1, 3.4, z, 8, 0.9, { ry: -PI / 2, bg: '#1c3a2a', fg: '#f0e8c8' }); sign('ПРОДУКТЫ', x, 3.4, z + 5.58, 9, 0.9, { bg: '#1c3a2a', fg: '#f0e8c8' });
    B.box(M.woodH, 14, 1.05, 0.8, x + 2, 0.06, z - 2.4, { c: 0x6a6a62, solid: true }); B.box(M.flat, 14.1, 0.05, 0.9, x + 2, 1.11, z - 2.4, { c: 0xc8c8c0 });
    B.box(M.woodH, 16, 2.3, 0.5, x + 2, 0.06, z - 4.7, { c: 0x7a6a52, solid: true }); for (let i = 0; i < 9; i++) B.box(M.flat, 0.3, 0.3, 0.22, x - 4.5 + i * 1.6, 0.9 + (i % 3) * 0.55, z - 4.4, { c: [0xb83a2a, 0x3a5a8a, 0xd8c060][i % 3] });
    B.box(M.metal, 0.5, 0.3, 0.4, x - 1, 1.14, z - 2.4, { c: 0xc8ccd0 }); B.box(M.flat, 1.2, 1.0, 1.2, x - 8.6, 0.06, z + 3.6, { c: 0x5a5a52, solid: true }); B.box(M.metal, 0.5, 0.35, 0.45, x - 8.6, 1.06, z + 3.6, { c: 0x3a3a3e });
    crate(B, M, x + 9.4, 0.06, z + 3.6, 0.9, 0.2, 0x8a7a5a); crate(B, M, x + 8.2, 0.06, z + 4.2, 0.7, 0.6, 0x8a7a5a); crate(B, M, x + 9.5, 0.96, z + 3.7, 0.6, 0.4, 0x8a7a5a);
    for (const k of [-1, 1]) B.box(M.glow, 3.0, 0.08, 0.3, x + k * 5, 4.1, z, { c: 0xf0f4ff }); lamp(x, 3.7, z, 30, 15, 0xf0f4ff);
    // more of the shop: a cooled counter with next to nothing in it, tins in a pyramid, a barrel of pickles, the abacus, a rail for the queue
    B.box(M.metal, 4, 0.9, 0.8, x - 7.4, 0.06, z - 2.4, { c: 0xe8e8e4, solid: true }); B.box(M.flat, 3.9, 0.3, 0.5, x - 7.4, 0.96, z - 2.5, { c: 0xa8c8d8 }); for (const k of [-1.2, 0.4]) B.box(M.metal, 0.5, 0.04, 0.24, x - 7.4 + k, 0.97, z - 2.13, { c: 0xc8ccd0 });
    table(B, M, x - 0.5, 0.06, z + 4.3, 0, { w: 1.4, d: 0.8, c: 0x6a6a62 }); for (let r = 0; r < 4; r++) for (let i = 0; i < 4 - r; i++) B.cyl(M.metal, 0.07, 0.07, 0.14, x - 0.5 + (i - (3 - r) / 2) * 0.16, 0.84 + r * 0.14, z + 4.3, { c: r % 2 ? 0xb83a2a : 0x3a5a8a, seg: 7 });
    barrel(B, M, x - 2.2, 0.06, z + 4.4, 0x5a4a32);
    B.box(M.wood, 0.36, 0.26, 0.04, x + 1, 1.14, z - 2.4, { rx: -0.5, c: 0x5a3c26 }); for (let k = 0; k < 3; k++) B.box(M.flat, 0.28, 0.03, 0.05, x + 1, 1.19 + k * 0.06, z - 2.36 + k * 0.035, { rx: -0.5, c: [0x1c1c1e, 0xb83a2a, 0x1c1c1e][k] });
    B.box(M.metal, 5, 0.05, 0.05, x - 0.5, 0.98, z - 1, { c: 0xc8ccd0 }); for (const k of [-2.5, 0, 2.5]) B.cyl(M.metal, 0.03, 0.03, 0.95, x - 0.5 + k, 0.06, z - 1, { c: 0xc8ccd0, seg: 6 }); world.addBox(x - 0.5, z - 1, 5, 0.1, 0, 0, 1.0);
    // the store room behind a partition, with the back door to the yard; a ladder outside goes up to the flat roof
    B.box(M.plaster, 0.15, 4.14, 2, x + 7.4, 0.06, z - 1, { c: 0xb8b6ae, solid: true }); B.box(M.plaster, 0.15, 4.14, 3.3, x + 7.4, 0.06, z + 3.45, { c: 0xb8b6ae, solid: true }); B.box(M.plaster, 0.15, 1.9, 1.8, x + 7.4, 2.3, z + 0.9, { c: 0xb8b6ae, solid: true });
    sacks(B, M, x + 9.9, 0.06, z - 1.2, PI / 2, { w: 1.6 }); B.box(M.stone, 1.2, 0.3, 2.2, x + 11.6, -0.26, z + 1.5, { c: 0x8a8a8a, solid: true });
    world.addBox(x, z, 22.4, 11.4, 0, 4.4, 4.9); world.addBox(x, z, 21.6, 10.6, 0, 4.9, 5.12); ladder(B, M, x + 11.2, z - 3.4, 1, 0, world.height(x + 11.7, z - 3.4) - 0.1, 4.9, { c: 0x7a7a6a });
    B.box(M.plaster, 21.6, 0.6, 0.25, x, 5.12, z + 5.15, { c: 0xa8a69e, solid: true }); B.box(M.plaster, 0.25, 0.6, 10.6, x - 10.65, 5.12, z, { c: 0xa8a69e, solid: true });
    B.box(M.metal, 1.2, 1.0, 1.2, x - 4, 5.12, z - 1, { c: 0x7a7c80, solid: true }); B.box(M.metal, 1.6, 0.9, 1.0, x + 5, 5.12, z + 1.5, { c: 0x7a7c80, solid: true });
    // the saleswoman at her counter, and the people waiting outside for the delivery
    folk('russianWoman', x, z - 3.6, 0, { y: 0.06, pose: 'hips', over: { kerchief: 0xf0ece0, extras: ['dress', 'apron'], apron: 0xf0ece0, shirt: 0xe4e0d6, sleeve: 0xe4e0d6, dress: 0xe4e0d6 } });
    folk('russianWoman', 15.4, 53, -0.69, { pose: 'talk' }); folk('russianWoman', 14.5, 54.1, 2.46, { pose: 'hips' }); folk('russianWoman', 22.5, 56.7, PI, { arms: [-0.5, -0.2] }); folk('russianMan', 15.05, 46, PI / 2, { pose: 'sit', seat: 0.5 });
    // garages
    for (const [gx, open] of [[46, 0], [50.4, 1], [54.8, 0], [59.2, 1]]) {
      if (open) room(B, M, gx, 0, 73, { w: 4.2, d: 6.6, h: 2.5, t: 0.25, mat: M.plaster, c: 0x8a8c8c, base: 0.5, doors: [{ side: 's', at: 0, w: 3.0, h: 2.2 }], floor: { mat: M.flat, c: 0x5a5a5c }, ceil: { mat: M.flat, c: 0x6a6c6c } });
      else { B.box(M.plaster, 4.2, 2.9, 6.6, gx, -0.3, 73, { c: 0x8a8c8c, solid: true }); B.box(M.metal, 3.0, 2.2, 0.08, gx, 0, 76.32, { c: 0x4a6a4a }); }
      B.box(M.flat, 4.3, 0.14, 6.8, gx, 2.62, 73, { c: SNOW });
    }
    barrel(B, M, 51.6, 0.06, 71, 0x5a6a7a); barrel(B, M, 50.6, 0.06, 70.6, 0x5a6a7a); crate(B, M, 59.4, 0.06, 71, 1.0, 0.3, 0x7a7a6a); B.box(M.woodH, 1.6, 0.85, 0.7, 60.3, 0.06, 73.6, { c: 0x5a4a3a, solid: true });
    car(48, 64, 1.5, 0xb8a04a); car(40, 62, 0.2, 0x2a3a5a);
    for (const [bx, bz] of [[22, 62], [30, 66], [56, 46], [44, 40], [36, 72]]) birch(bx, bz);
    bench(15, 46, PI / 2);
  }
  // ---- checkpoint before the square -------------------------------------------------------------
  for (const s of [-1, 1]) { B.box(M.plaster, 3.2, 1.0, 0.9, s * 5.6, -0.1, 25, { c: CONC, solid: true }); B.box(M.flat, 3.0, 0.08, 0.8, s * 5.6, 0.9, 25, { c: SNOW }); }
  B.box(M.plaster, 2.2, 2.7, 2.2, -10.4, -0.2, 25, { c: 0x5a6a5a, solid: true }); B.box(M.glow, 1.2, 0.6, 0.04, -10.4, 1.4, 26.12, { c: 0xffe0a0 }); B.box(M.flat, 2.5, 0.14, 2.5, -10.4, 2.5, 25, { c: SNOW });
  B.cyl(M.metal, 0.06, 0.06, 1.2, -4.2, 0, 25, { c: IRON, seg: 6 }); for (let i = 0; i < 6; i++) B.box(M.flat, 0.09, 1.05, 0.09, -4.2 + 0.26 * (i + 1), 1.1 + i * 0.98, 25, { rz: -0.26, c: i % 2 ? 0xf0f0f0 : RED });   // barrier, raised
  car(5.6, 31, 0.12, 0xd8c020, true);

  // ---- the square: the monument, the flags ---------------------------------------------------------
  B.box(M.stone, 10, 0.9, 10, 0, -0.2, -4, { c: GRAN, solid: true }); B.box(M.stone, 6.4, 6.6, 6.4, 0, 0.7, -4, { c: 0x7a3a36, solid: true }); B.box(M.stone, 7.2, 0.4, 7.2, 0, 7.3, -4, { c: GRAN });
  statue(0, 7.7, -4, 0, 7, { face: ['baldtop', 'beard'], extras: ['coat'] }, (f) => { f.armR.rotation.x = -1.45; f.armR.rotation.z = 0.2; f.armL.rotation.x = -0.35; f.legL.rotation.x = -0.18; f.legR.rotation.x = 0.14; });
  sign('ВПЕРЁД К ПОБЕДЕ', 0, 4.0, -0.74, 5.4, 0.9, { bg: '#5a2a26', fg: '#e0c890' });
  for (const s of [-1, 1]) for (const k of [14, 24, 34]) { B.cyl(M.metal, 0.06, 0.09, 10, s * k, 0, -31, { c: 0xb8bcc2, seg: 6 }); B.box(M.cloth, 2.6, 1.6, 0.04, s * k + 1.4, 8.2, -31, { c: RED }); world.addCyl(s * k, -31, 0.12, 0, 10); }
  for (const [x, z, ry] of [[-18, 12, 0.3], [20, 14, -0.4], [-26, -14, 1.2], [24, -18, 0.9]]) bench(x, z, ry);
  for (const [x, z] of [[-30, 14], [-36, 6], [32, 16], [38, -2], [-34, -22], [36, -24]]) { B.box(M.stone, 3, 0.5, 3, x, -0.1, z, { c: GRAN, solid: true }); B.geo(M.flat, new THREE.ConeGeometry(1.1, 3.6, 7), [x, 2.2, z], [0, 0, 0], 1, 0x2a4a3a); B.geo(M.flat, new THREE.ConeGeometry(0.9, 1.4, 7), [x, 3.6, z], [0, 0, 0], 1, SNOW); world.addCyl(x, z, 0.8, 0, 4); }
  street(-44, 20, false); street(44, -26, false);
  { // winter on the square: an ice slide (stairs up one side, the chute down the other), a fort of snow blocks with its snowman, and the banks the ploughs have left
    const x = -24, z = -6, L = 6.4, rx = Math.atan2(2.2, L);
    deck(B, M, x, 0, z, 0, { w: 2.4, d: 2.4, h: 2.2, c: 0x8a6a48, post: 0x6a4a30, rails: 'ew', steps: 'n', stepW: 1.5 });
    for (let i = 0; i < 7; i++) { const f = (i + 0.5) / 7, top = 2.2 * (1 - f), zc = z + 1.2 + L * f; B.box(M.flat, 1.5, top + 0.1, L / 7 + 0.02, x, -0.3, zc, { c: SNOW }); world.addBox(x, zc, 1.5, L / 7 + 0.02, 0, -1, top); }
    B.box(M.flat, 1.2, 0.06, Math.hypot(L, 2.2), x, 1.1, z + 1.2 + L / 2, { rx, c: 0xc4dcec }); for (const s of [-1, 1]) B.box(M.woodH, 0.08, 0.34, Math.hypot(L, 2.2), x + s * 0.68, 1.02, z + 1.2 + L / 2, { rx, c: 0x6a4a30 });
    for (const [fx, fz, w, d] of [[22, -11, 6, 0.8], [19.4, -8.6, 0.8, 4], [24.6, -8.6, 0.8, 4]]) {
      B.box(M.flat, w, 1.1, d, fx, -0.05, fz, { c: 0xe2e8ee, solid: true });
      for (let k = 0; k < Math.floor(Math.max(w, d) / 1.2); k++) B.box(M.flat, w > d ? 0.6 : w + 0.04, 0.3, w > d ? d + 0.04 : 0.6, w > d ? fx - w / 2 + 0.6 + k * 1.2 : fx, 1.05, w > d ? fz : fz - d / 2 + 0.6 + k * 1.2, { c: 0xd4dce6 });
    }
    for (const [r, y] of [[0.45, 0.38], [0.32, 1.0], [0.22, 1.43]]) B.geo(M.flat, new THREE.SphereGeometry(r, 10, 8), [22, y, -7.4], [0, 0, 0], 1, 0xeef2f6);
    B.cyl(M.metal, 0.15, 0.19, 0.22, 22, 1.6, -7.4, { c: 0x5a6a7a, seg: 9 }); B.geo(M.flat, new THREE.ConeGeometry(0.035, 0.22, 6), [22, 1.44, -7.12], [PI / 2, 0, 0], 1, 0xd8641c); world.addCyl(22, -7.4, 0.45, 0, 1.7);
    for (const [bx, bz, ry] of [[-8.9, 78, PI / 2], [-8.9, 54, PI / 2], [-8.9, 35, PI / 2], [8.9, 84, PI / 2], [8.9, 60, PI / 2], [8.9, 38, PI / 2], [-11, 14, 0.3], [12, 11, -0.2], [-40, -12, 1.3], [40, 6, 1.4], [11, -27, 0], [-12, -27, 0.1]]) bank(bx, bz, ry);
  }
  { // a tram halted on the prospekt under its wire: walk in at any of the four doors, keep low between the seats
    const z = 52, RD = 0xa8302a, CR = 0xd8cca0, F = 0.46;
    B.box(M.woodH, 2.5, F, 13, 0, 0, z, { c: 0x5a4a3a, solid: true }); B.box(M.metal, 2.5, 0.2, 13, 0, 2.75, z, { c: CR, solid: true });                                   // floor and roof
    for (const s of [-1, 1]) {                                                                                                                                              // sides: panels below the windows, posts between them, the doors left open
      for (const [a, b] of [[-6.5, -4.35], [-2.85, 2.85], [4.35, 6.5]]) B.box(M.metal, 0.12, 0.9, b - a, s * 1.19, F, z + (a + b) / 2, { c: RD, solid: true });
      for (const pz of [-6.44, -4.41, -2.79, 0, 2.79, 4.41, 6.44]) B.box(M.metal, 0.12, 1.2, 0.12, s * 1.19, F + 0.9, z + pz, { c: RD });
      B.box(M.metal, 2.26, 0.9, 0.12, 0, F, z + s * 6.44, { c: RD, solid: true });
    }
    B.box(M.metal, 2.56, 0.42, 13.06, 0, 0.02, z, { c: 0x3a3a3e }); B.box(M.metal, 2.54, 0.3, 13.04, 0, 2.52, z, { c: CR }); B.box(M.flat, 2.2, 0.08, 12.6, 0, 2.95, z, { c: SNOW });
    for (const s of [-1, 1]) { for (let k = -2; k <= 2; k++) { B.box(M.woodH, 0.45, 0.42, 0.45, s * 0.86, F, z + k * 1.1, { c: 0x6a4a30 }); B.box(M.woodH, 0.45, 0.5, 0.06, s * 0.86, F + 0.42, z + k * 1.1 + 0.2, { c: 0x6a4a30 }); } world.addBox(s * 0.86, z, 0.45, 4.9, 0, F, F + 0.9); }
    B.box(M.woodH, 2.2, 0.42, 0.45, 0, F, z + 6.1, { c: 0x6a4a30, solid: true }); B.box(M.metal, 1.5, 0.9, 0.4, 0, F, z - 6.1, { c: 0x2a2a2e, solid: true }); B.box(M.woodH, 0.45, 0.45, 0.45, 0, F, z - 5.4, { c: 0x3a2a22 });
    for (const s of [-1, 1]) B.box(M.metal, 0.03, 0.03, 11.4, s * 0.5, 2.4, z, { c: 0xc8ccd0 });
    for (const s of [-1, 1]) B.box(M.glow, 0.26, 0.18, 0.04, s * 0.75, 0.6, z - 6.53, { c: 0xfff0c0 }); sign('7', 0, 2.67, z - 6.57, 0.6, 0.24, { bg: '#f0ece0', fg: '#1c1c1c' });
    for (const s of [-1, 1]) rod(B, M.metal, [s * 0.4, 2.95, z + 1], [s * 0.25, 4.6, z - 0.6], 0.025, IRON); B.box(M.metal, 1.3, 0.05, 0.08, 0, 4.58, z - 0.6, { c: IRON }); B.box(M.metal, 0.025, 0.025, 76, 0, 4.63, 66, { c: 0x2a2a2e });
  }
  // east side: the ministry and the pair of workers
  block(68, -6, 16, 44, 24, 0xc8c8c8); for (const k of [-10, 10]) B.box(M.metal, 0.2, 4.2, 0.2, 60.4, 23.7, -6 + k, { c: IRON });
  sign('СЛАВА ТРУДУ', 60.2, 26.4, -6, 26, 3.2, { ry: -PI / 2 });
  B.box(M.stone, 6, 4.4, 5, 44, -0.2, -6, { c: GRAN, solid: true });
  statue(44, 4.2, -5.2, -PI / 2, 4.2, { hair: 0x5e6468, extras: ['smock'], weapon: 'club' }, (f) => { f.armR.rotation.x = -2.7; f.armR.rotation.z = -0.2; f.legL.rotation.x = -0.45; f.legR.rotation.x = 0.4; });
  statue(44, 4.2, -6.8, -PI / 2, 4.0, { face: ['longhair'], extras: ['smock', 'robe'], robe: 0x5e6468 }, (f) => { f.armL.rotation.x = -2.7; f.armL.rotation.z = 0.2; f.legL.rotation.x = 0.35; f.legR.rotation.x = -0.4; });
  // west side: the Palace of Culture, with its hall
  {
    const x = -64, z = -6, F = 0.96;
    room(B, M, x, 0.9, z, { w: 30, d: 22, h: 8, t: 0.6, mat: M.plaster, c: 0xd8d0b4, base: 1.6, doors: [{ side: 'e', at: 0, w: 3.2, h: 3.2 }], floor: { mat: M.woodH, c: 0x6a4a30 }, ceil: { mat: M.plaster, c: 0xc8c0a8 } });
    B.box(M.plaster, 30, 4.2, 22, x, 9.1, z, { c: 0xd8d0b4, solid: true }); roofed(x, 13.3, z, 30, 22);
    B.box(M.stone, 4.6, 1.2, 21, -46.7, -0.3, z, { c: GRAN, solid: true }); steps(B, M, -44.4, z, PI / 2, 0.9, 3, { w: 21, rise: 0.3, run: 0.6, c: GRAN });
    for (let i = 0; i < 6; i++) { const cz = z - 8.5 + i * 3.4; if (i === 2 || i === 3) { B.cyl(M.plaster, 0.5, 0.56, 8.6, -45.4, 0.9, cz + (i === 2 ? -0.5 : 0.5), { c: 0xe8e2d0, seg: 12 }); world.addCyl(-45.4, cz + (i === 2 ? -0.5 : 0.5), 0.6, 0, 9.5); } else { B.cyl(M.plaster, 0.5, 0.56, 8.6, -45.4, 0.9, cz, { c: 0xe8e2d0, seg: 12 }); world.addCyl(-45.4, cz, 0.6, 0, 9.5); } }
    B.box(M.plaster, 3.2, 1.6, 21, -46.4, 9.5, z, { c: 0xe8e2d0 }); B.geo(M.plaster, prismGeo(21, 3.0, 3.2, 3), [-46.4, 11.1, z], [0, PI / 2, 0], 1, 0xe8e2d0);
    sign('ДВОРЕЦ КУЛЬТУРЫ', -44.74, 10.3, z, 15, 1.0, { ry: PI / 2, bg: '#d8d0b4', fg: '#7a1c1c' });
    B.box(M.woodH, 7, 1.0, 17, x - 10.6, F, z, { c: 0x5a3c26, solid: true }); steps(B, M, x - 7.1, z, PI / 2, F + 1.0, 3, { w: 3, rise: 0.25, run: 0.6, mat: M.woodH, c: 0x5a3c26 });
    for (const s of [-1, 1]) B.box(M.cloth, 0.3, 6.4, 3.4, x - 7.4, F, z + s * 8.2, { c: 0x8a1414 }); B.box(M.cloth, 0.3, 1.3, 20, x - 7.4, F + 5.6, z, { c: 0x7a1010 });
    B.box(M.woodH, 2.6, 1.0, 1.5, x - 11.5, F + 1.0, z - 3, { c: 0x121214, solid: true }); B.box(M.flat, 1.3, 0.05, 0.3, x - 10.1, F + 1.75, z - 3, { c: 0xf0ece0 });
    for (let r = 0; r < 6; r++) for (const s of [-1, 1]) { B.box(M.cloth, 0.75, 0.95, 6.6, x - 4 + r * 2.5, F, z + s * 5.4, { c: 0x8a1c1c, solid: true }); }
    B.geo(M.metal, new THREE.TorusGeometry(1.5, 0.07, 6, 18), [x + 2, 7.6, z], [PI / 2, 0, 0], 1, 0xc9a23a); for (let k = 0; k < 8; k++) B.geo(M.glow, new THREE.SphereGeometry(0.12, 6, 5), [x + 2 + Math.cos(k * 0.785) * 1.5, 7.75, z + Math.sin(k * 0.785) * 1.5], [0, 0, 0], 1, 0xffd9a0);
    lamp(x + 2, 6.6, z, 50, 26, 0xffe0b0);
  }
  // the park behind the Palace of Culture
  {
    B.cyl(M.metal, 6.5, 6.5, 0.06, -80, world.height(-80, 20) + 0.02, 20, { c: 0x8ab8c8, seg: 22 });
    const bx = -62, bz = 20; B.cyl(M.woodH, 3.4, 3.4, 0.5, bx, -0.1, bz, { c: 0x8a8a84, seg: 8, solid: true }); for (let k = 0; k < 8; k++) { const a = k * 0.785 + 0.39; B.cyl(M.wood, 0.1, 0.1, 3, bx + Math.cos(a) * 3, 0.4, bz + Math.sin(a) * 3, { c: 0xe8e4d8, seg: 6 }); world.addCyl(bx + Math.cos(a) * 3, bz + Math.sin(a) * 3, 0.14, 0, 3.5); }
    B.geo(M.shingle, new THREE.ConeGeometry(4.2, 1.8, 8), [bx, 4.3, bz], [0, 0.39, 0], 1, 0x4a6a5a); B.geo(M.flat, new THREE.ConeGeometry(3.6, 1.1, 8), [bx, 4.9, bz], [0, 0.39, 0], 1, SNOW);
    for (const [x, z] of [[-96, 12], [-90, 26], [-86, 10], [-72, 28], [-70, 10], [-94, 20], [-66, 27], [-58, 12], [-76, 34], [-88, 34], [-100, 30], [-56, 26]]) birch(x, z);
    bench(-72, 14, 0.4); bench(-86, 22, -1.2);
  }

  // ---- the Committee: lobby, cells and archive under the tower ----------------------------------------
  {
    const F = 1.46, WALL = 0x8a8682;
    cwall(-52, -34, -10.2, -34, 3); cwall(10.2, -34, 31, -34, 3); cwall(33, -34, 52, -34, 3);
    // a meltwater drain under the wall east of the gate: crawl through and come out behind the black cars
    crawlway(B, M, 32, 0, -34, 0, { len: 2.2, w: 1.4, h: 1.2, mat: M.plaster, c: CONC }); B.box(M.plaster, 2, 1.5, 0.3, 32, 1.5, -34, { c: CONC, solid: true }); B.box(M.flat, 2, 0.12, 0.4, 32, 3, -34, { c: SNOW });
    B.box(M.flat, 1.1, 0.02, 10, 32, 0.045, -31.5, { c: 0x34363a });
    for (const s of [-1, 1]) { B.box(M.stone, 1.3, 3.8, 1.3, s * 9.5, -0.2, -34, { c: GRAN, solid: true }); B.geo(M.glow, new THREE.SphereGeometry(0.3, 8, 6), [s * 9.5, 3.9, -34], [0, 0, 0], 1, 0xffe0b0);
      B.box(M.plaster, 2, 2.6, 2, s * 12.4, -0.2, -37.2, { c: 0x5a6a5a, solid: true }); B.box(M.flat, 2.3, 0.14, 2.3, s * 12.4, 2.4, -37.2, { c: SNOW }); }
    car(22, -38.5, PI / 2, 0x0c0c0e); car(29, -38.5, PI / 2, 0x0c0c0e); car(-24, -38.5, -PI / 2, 0x0c0c0e);
    B.box(M.stone, 18, 1.7, 5.2, 0, -0.3, -41.5, { c: GRAN, solid: true }); steps(B, M, 0, -38.9, 0, 1.4, 4, { w: 18, rise: 0.34, run: 0.6, c: GRAN });
    for (const px of [-7.4, -3.4, 3.4, 7.4]) { B.box(M.stone, 1.1, 9.4, 1.1, px, 1.4, -40.4, { c: WALL }); world.addBox(px, -40.4, 1.1, 1.1, 0, 0, 11); }
    B.box(M.stone, 18, 1.6, 2.2, 0, 10.8, -40.6, { c: WALL }); sign('КОМИТЕТ', 0, 11.6, -39.46, 8, 1.0, { bg: '#2a2826', fg: '#c9a23a' });
    room(B, M, 0, 1.4, -52, { w: 32, d: 16, h: 6.4, t: 0.7, mat: M.stone, c: WALL, base: 2, doors: [{ side: 's', at: 0, w: 4, h: 3.6 }, { side: 'w', at: 2, w: 1.8, h: 2.4 }, { side: 'e', at: 0.5, w: 1.8, h: 2.4 }], floor: { mat: M.cobble, c: 0x8a7a76 }, ceil: { mat: M.plaster, c: 0x9a9690 } });
    room(B, M, -27, 1.4, -52, { w: 22, d: 16, h: 4.2, t: 0.6, mat: M.plaster, c: WALL, base: 2, doors: [{ side: 'e', at: 2, w: 1.8, h: 2.4 }, { side: 'w', at: 3, w: 1.6, h: 2.4 }], floor: { mat: M.plaster, c: 0x6a6a6a }, ceil: { mat: M.plaster, c: 0x7a7a78 } });
    room(B, M, 27, 1.4, -52, { w: 22, d: 16, h: 4.2, t: 0.6, mat: M.plaster, c: WALL, base: 2, doors: [{ side: 'w', at: 0.5, w: 1.8, h: 2.4 }, { side: 'e', at: 2, w: 1.8, h: 2.4 }], floor: { mat: M.woodH, c: 0x5a4030 }, ceil: { mat: M.plaster, c: 0x8a8680 } });
    B.box(FAC, 32, 18, 16, 0, 8, -52, { c: 0xa29e98, solid: true }); B.box(FAC, 22, 20, 16, -27, 5.8, -52, { c: 0x9a9690, solid: true }); B.box(FAC, 22, 19.9, 16, 27, 5.8, -52, { c: 0x9a9690, solid: true });
    roofed(0, 26, -52, 32, 16); roofed(-27, 25.8, -52, 22, 16); roofed(27, 25.7, -52, 22, 16);
    steps(B, M, 38, -50, PI / 2, 1.4, 4, { w: 2.4, rise: 0.34, run: 0.5, c: GRAN }); steps(B, M, -38, -49, -PI / 2, 1.4, 4, { w: 2.2, rise: 0.34, run: 0.5, c: GRAN });      // side doors: the colonel's own, and the service door of the cells
    crate(B, M, -41.4, 0, -45.4, 0.9, 0.3, 0x7a7a6a); barrel(B, M, -42.6, 0, -45.9, 0x5a6a7a); crate(B, M, 41.6, 0, -46.2, 1.0, 0.2, 0x7a7a6a);
    B.box(FAC, 24, 54, 20, 0, -0.3, -72, { c: 0xa6a29c, solid: true }); B.box(FAC, 17, 12, 14, 0, 53.7, -72, { c: 0xa6a29c }); B.box(M.plaster, 9, 9, 9, 0, 65.7, -72, { c: 0xa6a29c });
    B.geo(M.metal, new THREE.ConeGeometry(2.6, 18, 8), [0, 83.7, -72], [0, 0, 0], 1, 0xb8a060); B.geo(M.glow, new THREE.OctahedronGeometry(1.5, 0), [0, 94, -72], [0, 0, 0], [1, 1, 0.4], 0xff2a1a);
    for (const s of [-1, 1]) { B.box(FAC, 30, 21, 16, s * 37, -0.3, -72, { c: 0x9a9690, solid: true }); roofed(s * 37, 20.7, -72, 30, 16); B.box(M.plaster, 5, 6, 5, s * 9, 53.7, -65, { c: 0xa6a29c }); B.geo(M.metal, new THREE.ConeGeometry(1.6, 6, 6), [s * 9, 62.7, -65], [0, 0, 0], 1, 0xb8a060); }
    // lobby
    for (const px of [-6, 6]) for (const pz of [-49, -55]) { B.box(M.stone, 1.0, 6.4, 1.0, px, F, pz, { c: 0x7a3a36 }); world.addBox(px, pz, 1.0, 1.0, 0, F - 0.2, F + 6.4); }
    B.box(M.cloth, 2.6, 0.02, 9, 0, F + 0.01, -49.5, { c: 0x8a1414 });
    B.box(M.woodH, 4.4, 1.1, 1.0, -10.5, F, -47.2, { c: 0x3a2a1c, solid: true }); B.box(M.glow, 0.14, 0.3, 0.14, -9, F + 1.1, -47.2, { c: 0x60ff90 }); B.box(M.metal, 0.4, 0.2, 0.3, -11.6, F + 1.1, -47.2, { c: 0x1a1a1c });
    B.box(M.cloth, 7, 3.4, 0.06, 0, F + 2.6, -59.24, { c: RED }); B.box(M.woodH, 1.9, 2.4, 0.1, 0, F + 3.1, -59.18, { c: 0xc9a23a }); B.box(M.flat, 1.6, 2.1, 0.12, 0, F + 3.25, -59.16, { c: 0x4a4a4e });
    for (const pz of [-48, -55]) { B.box(M.woodH, 0.6, 0.45, 3, 14.6, F, pz, { c: 0x4a3626, solid: true }); }
    // archive cage behind bars, with the manuscript
    bars(B, M, -8, -56.4, -1.1, -56.4, F, F + 3.4); bars(B, M, 1.1, -56.4, 8, -56.4, F, F + 3.4); bars(B, M, -1.1, -56.4, 1.1, -56.4, F + 2.5, F + 3.4); bars(B, M, -8, -56.4, -8, -59.3, F, F + 3.4); bars(B, M, 8, -56.4, 8, -59.3, F, F + 3.4);
    bars(B, M, 1.1, -56.4, 2.2, -55.2, F, F + 2.5);
    for (const s of [-1, 1]) { B.box(M.metal, 2.2, 2.4, 0.6, s * 5.6, F, -58.8, { c: 0x4a5248, solid: true }); for (let i = 0; i < 10; i++) B.box(M.flat, 0.16, 0.34, 0.3, s * 5.6 - 0.9 + i * 0.2, F + 0.5 + (i % 3) * 0.6, -58.5, { c: [0x8a7a5a, 0x5a6a7a, 0x7a5a4a][i % 3] }); }
    B.box(M.woodH, 1.4, 0.8, 0.8, 0, F, -58.5, { c: 0x4a3626, solid: true }); B.box(M.glow, 0.34, 0.07, 0.46, 0, F + 0.8, -58.5, { ry: 0.3, c: 0xfff2c0 });
    lamp(0, F + 5.6, -52, 50, 24, 0xffe8c0);
    // cells in the west wing
    const X0 = -37.4, X1 = -16.6, ZC = -55.2, ZB = -59.4;
    bars(B, M, X0, ZC, -34.6, ZC, F, F + 4.2); bars(B, M, -32.9, ZC, -27.6, ZC, F, F + 4.2); bars(B, M, -25.9, ZC, -20.6, ZC, F, F + 4.2); bars(B, M, -18.9, ZC, X1, ZC, F, F + 4.2);
    for (const gx of [-33.75, -26.75, -19.75]) { bars(B, M, gx - 0.85, ZC, gx + 0.85, ZC, F + 2.4, F + 4.2); bars(B, M, gx + 0.85, ZC, gx + 1.6, ZC + 1.5, F, F + 2.4); }
    bars(B, M, -30.3, ZC, -30.3, ZB, F, F + 4.2); bars(B, M, -23.3, ZC, -23.3, ZB, F, F + 4.2);
    for (const bx of [-36.6, -29.5, -22.5]) { B.box(M.metal, 0.8, 0.4, 1.9, bx, F, -57.6, { c: 0x4a4c50, solid: true }); B.box(M.cloth, 0.76, 0.08, 1.8, bx, F + 0.4, -57.6, { c: 0x6a6a62 }); }
    B.box(M.woodH, 1.8, 0.8, 0.9, -32, F, -47.4, { c: 0x3a2a1c, solid: true }); B.box(M.glow, 0.2, 0.2, 0.2, -31.4, F + 1.3, -47.4, { c: 0xfff0c0 }); B.cyl(M.metal, 0.02, 0.02, 0.5, -31.4, F + 0.8, -47.4, { c: 0x1a1a1c, seg: 5 });
    B.box(M.wood, 0.45, 0.45, 0.45, -32, F, -48.6, { c: 0x4a3626 }); B.box(M.wood, 0.45, 0.45, 0.45, -32, F, -46.0, { c: 0x4a3626 });
    for (let i = 0; i < 3; i++) B.box(M.metal, 0.8, 1.7, 0.6, -24 + i * 0.9, F, -45.2, { c: 0x5a6258, solid: i === 0 }); world.addBox(-23.1, -45.2, 2.7, 0.6, 0, F, F + 1.7);
    lamp(-27, F + 3.4, -51, 22, 14, 0xd0e0ff);
    // two people held in the cells, in plain grey, sitting on their bunks
    const GREY = { hat: null, coat: 0x6e6e6a, shirt: 0x6e6e6a, sleeve: 0x6e6e6a, pants: 0x5c5c58, dress: 0x5c5c58, boots: 0x2a2826 };
    folk('russianMan', -36.5, -57.9, PI / 2, { y: F, pose: 'sit', seat: 0.48, over: { ...GREY, face: [] } }); folk('russianWoman', -29.4, -57.3, PI / 2, { y: F, pose: 'sit', seat: 0.48, over: { ...GREY, kerchief: 0x8a8a84 } });
    // the east wing: the records room, and the colonel's office with its own door to the yard
    B.box(M.plaster, 0.3, 4.14, 9.8, 28, F, -54.5, { c: WALL, solid: true }); B.box(M.plaster, 0.3, 4.14, 2.2, 28, F, -45.7, { c: WALL, solid: true }); B.box(M.plaster, 0.3, 1.74, 2.8, 28, F + 2.4, -48.2, { c: WALL, solid: true });
    for (const sx of [20, 23.6]) shelf(B, M, sx, F, -55.6, PI / 2, 6, 2.3, { c: 0x4a4038, goods: [0x8a7a5a, 0x5a6a7a, 0x7a5a4a, 0x9a8a6a] });
    B.box(M.metal, 9, 1.35, 0.55, 22, F, -45.0, { c: 0x5a6258, solid: true }); for (let i = 0; i < 9; i++) for (let k = 0; k < 3; k++) B.box(M.flat, 0.5, 0.05, 0.03, 18 + i, F + 0.3 + k * 0.42, -45.29, { c: 0x2a2a2e });      // filing cabinets
    table(B, M, 26.9, F, -57.6, PI / 2, { w: 1.6, d: 0.8, c: 0x4a3626 }); B.box(M.metal, 0.5, 0.3, 0.6, 26.9, F + 0.78, -57.6, { c: 0x3a3e44 }); B.box(M.flat, 0.22, 0.02, 0.5, 26.9, F + 1.08, -57.2, { rx: -0.6, c: 0xf0ece0 });   // the teleprinter
    B.box(M.woodH, 2.6, 0.8, 1.2, 33, F, -56, { c: 0x3a2a1c, solid: true }); B.box(M.cloth, 2.2, 0.012, 0.9, 33, F + 0.8, -56, { c: 0x2a4a3a });                                                                         // the colonel's desk
    B.cyl(M.metal, 0.02, 0.06, 0.34, 32.1, F + 0.81, -56.2, { c: 0xc9a23a, seg: 6 }); B.cyl(M.glow, 0.07, 0.16, 0.12, 32.1, F + 1.13, -56.2, { c: 0x60ff90, seg: 10 });
    B.box(M.flat, 0.3, 0.11, 0.2, 33.9, F + 0.81, -56.1, { c: 0x121214 }); B.box(M.flat, 0.3, 0.015, 0.42, 33.1, F + 0.815, -55.8, { ry: 0.2, c: 0xe8e0d0 });
    B.box(M.woodH, 0.6, 0.5, 0.6, 33, F, -57.5, { c: 0x2a1c14, solid: true }); B.box(M.woodH, 0.6, 0.7, 0.1, 33, F + 0.5, -57.8, { c: 0x2a1c14 });
    B.box(M.flat, 3.6, 2.2, 0.05, 33, F + 1.3, -59.36, { c: 0xd8d0b8 }); for (const [mx, my, w, h, c] of [[-0.9, 0.5, 1.2, 0.9, 0xb8c8a0], [0.5, 0.9, 1.5, 0.9, 0xd8b8a0], [0.2, 0.3, 1.0, 0.5, 0xa8c0d0]]) B.box(M.flat, w, h, 0.02, 33 + mx, F + 1.3 + my, -59.32, { c });   // a wall map
    B.box(M.metal, 0.9, 1.5, 0.8, 36.9, F, -58.95, { c: 0x3a4a3e, solid: true }); B.cyl(M.metal, 0.09, 0.09, 0.05, 36.9, F + 0.8, -58.52, { rx: PI / 2, c: 0xc8ccd0, seg: 8 });                                             // the safe
    B.box(M.cloth, 2.6, 0.45, 0.85, 32.5, F, -45.1, { c: 0x3a2a22, solid: true }); B.box(M.cloth, 2.6, 0.5, 0.2, 32.5, F + 0.45, -44.78, { c: 0x3a2a22 });
    table(B, M, 29.2, F, -58.8, 0, { w: 0.9, d: 0.7, c: 0x4a3626 }); B.cyl(M.metal, 0.13, 0.1, 0.36, 29.2, F + 0.82, -58.8, { c: 0xc9a23a, seg: 10 }); B.cyl(M.metal, 0.05, 0.09, 0.14, 29.2, F + 1.18, -58.8, { c: 0xc9a23a, seg: 8 });   // a samovar
    rug(B, M, 33, F, -52.4, 0, { w: 4.4, d: 3, c: 0x7a1c1c, border: 0x2a1c14 });
    B.box(M.woodH, 9.2, 1.1, 0.05, 32.8, F, -59.36, { c: 0x4a3020 }); B.box(M.woodH, 0.05, 1.1, 9.6, 37.36, F, -54.5, { c: 0x4a3020 });                                                                                  // panelling, a clock, the coat stand by the door
    B.cyl(M.woodH, 0.22, 0.22, 0.06, 30.4, F + 2.4, -59.34, { rx: PI / 2, c: 0x3a2a1c, seg: 12 }); B.cyl(M.flat, 0.18, 0.18, 0.07, 30.4, F + 2.4, -59.33, { rx: PI / 2, c: 0xe8e0d0, seg: 12 });
    B.cyl(M.wood, 0.03, 0.05, 1.8, 36.7, F, -47.4, { c: 0x3a2a1c, seg: 6 }); B.box(M.cloth, 0.42, 0.9, 0.16, 36.7, F + 0.85, -47.25, { c: 0x50564c });
    for (const lx of [22, 33]) B.box(M.glow, 0.3, 0.06, 3, lx, 5.52, -52, { c: 0xfff0d0 });
    extraFoes.push(['agent', 31.5, -51, { up: 1.9, patrol: false }]); extraPicks.push([35.6, -54.6, 0, 1.9]);
  }
  // ---- the works in the north-east ---------------------------------------------------------------------
  {
    const x = 80, z = -50;
    room(B, M, x, 0, z, { w: 28, d: 16, h: 7, t: 0.5, mat: M.plaster, c: 0x8a6a5a, base: 0.6, doors: [{ side: 'w', at: 0, w: 3.6, h: 3.6 }, { side: 's', at: 8, w: 1.8, h: 2.4 }], wins: [{ side: 's', at: -4, w: 5, y: 2.2, h: 2.0 }],
      floor: { mat: M.plaster, c: 0x5a5a5c }, ceil: { mat: M.metal, c: 0x5a5c60 } });
    roofed(x, 7.2, z, 28, 16); sign('ЗАВОД', x - 14.1, 5.4, z, 6, 1.1, { ry: -PI / 2, bg: '#3a3a3e', fg: '#e0d8c0' });
    for (const [mx, mz, w] of [[76, -54, 3], [84, -54, 2.4], [88, -47, 2.6], [74, -46, 2]]) { B.box(M.metal, w, 1.5, 1.4, mx, 0.06, mz, { c: 0x4a6a5a, solid: true }); B.cyl(M.metal, 0.5, 0.5, 0.2, mx, 1.56, mz, { rx: PI / 2, c: 0x8a8c90, seg: 12 }); B.box(M.metal, 0.3, 0.8, 0.3, mx + w * 0.3, 1.56, mz, { c: 0x3a3a3e }); }
    crate(B, M, 70, 0.06, -55, 1.1, 0.2, 0x7a7a6a); crate(B, M, 70.2, 1.16, -55, 0.8, 0.5, 0x7a7a6a); crate(B, M, 91, 0.06, -55, 1.0, 0.4, 0x7a7a6a);
    // a steel gallery along the back wall with stairs up from the shop floor, the lockers, two lathes and the man at one of them, the furnace
    B.box(M.metal, 22, 0.16, 2, x, 3.3, z - 6.4, { c: 0x5a5c60, solid: true }); steps(B, M, x, z - 5.4, 0, 3.46, 9, { w: 1.6, rise: 3.4 / 9, run: 0.5, mat: M.metal, c: 0x5a5c60 });
    for (let k = -2; k <= 2; k++) rod(B, M.metal, [x + k * 5.2, 2.3, z - 7.45], [x + k * 5.2, 3.3, z - 5.5], 0.05, IRON);
    for (const [a, b] of [[-11, -0.8], [0.8, 11]]) { const m = x + (a + b) / 2; B.box(M.metal, b - a, 0.06, 0.06, m, 4.4, z - 5.46, { c: IRON }); B.box(M.metal, b - a, 0.05, 0.05, m, 3.95, z - 5.46, { c: IRON }); for (let q = a; q <= b; q += 1.7) B.box(M.metal, 0.05, 1, 0.05, x + q, 3.46, z - 5.46, { c: IRON }); world.addBox(m, z - 5.46, b - a, 0.1, 0, 3.46, 4.46); }
    B.box(M.metal, 0.6, 1.9, 4, x + 13.1, 0.06, z - 2, { c: 0x5a6a7a, solid: true }); for (let k = 0; k < 5; k++) B.box(M.flat, 0.02, 1.8, 0.03, x + 12.79, 0.1, z - 4 + k, { c: 0x2a3440 });
    for (const lx of [x, x + 3.6]) {
      B.box(M.metal, 2.2, 0.75, 0.7, lx, 0.06, z + 6.3, { c: 0x4a5a6a, solid: true }); B.box(M.metal, 0.6, 0.45, 0.6, lx - 0.75, 0.81, z + 6.3, { c: 0x4a5a6a }); B.box(M.metal, 0.3, 0.3, 0.3, lx + 0.85, 0.81, z + 6.3, { c: 0x4a5a6a });
      rod(B, M.metal, [lx - 0.45, 1.03, z + 6.3], [lx - 0.3, 1.03, z + 6.3], 0.16, 0x8a8c90, 0.16, 10); rod(B, M.metal, [lx - 0.3, 1.03, z + 6.3], [lx + 0.7, 1.03, z + 6.3], 0.05, 0xc8ccd0);
    }
    folk('russianMan', x, z + 5.1, 0, { y: 0.06, pose: 'work', over: { hat: 'beret', hatC: 0x3a3a44, extras: [], shirt: 0x3a4a6a, pants: 0x3a4a6a } });
    B.box(M.plaster, 2.4, 2.8, 2.2, x + 11.9, 0.06, z + 6.2, { c: 0x7a4a3a, solid: true }); B.box(M.glow, 0.05, 0.6, 0.8, x + 10.68, 0.6, z + 6.2, { c: 0xff7a20 }); B.cyl(M.metal, 0.3, 0.3, 4.2, x + 11.9, 2.86, z + 6.2, { c: 0x3a3a3e, seg: 8 });
    // the flat roof, by the ladder on the west wall: from its edge you look down on the Committee's forecourt
    world.addBox(x, z, 28.4, 16.4, 0, 7.2, 7.7); world.addBox(x, z, 27.6, 15.6, 0, 7.7, 7.92); ladder(B, M, x - 14.2, z + 6, -1, 0, world.height(x - 14.8, z + 6) - 0.1, 7.7, { c: IRON });
    B.box(M.plaster, 0.25, 0.7, 11, x - 13.65, 7.92, z - 2.3, { c: 0x8a6a5a, solid: true }); B.box(M.metal, 3, 0.8, 2, x - 4, 7.92, z, { c: 0x5a5c60, solid: true }); B.box(M.flat, 2.6, 0.04, 1.6, x - 4, 8.72, z, { c: 0x8ab0c0 });
    extraFoes.push(['agent', x + 6, z - 6.4, { up: 3.6, patrol: false }]);
    for (const [cx, cz, h] of [[86, -66, 36], [94, -64, 28]]) { B.cyl(M.plaster, 1.1, 1.8, h, cx, -0.3, cz, { c: 0x9a5a4a, seg: 12, solid: true }); for (let k = 0; k < 3; k++) B.cyl(M.flat, 1.14 + (2 - k) * 0.05, 1.2 + (2 - k) * 0.05, 1.5, cx, h - 2.2 - k * 3.4, cz, { c: k % 2 ? 0xe8e4dc : RED, seg: 12, open: true }); }
    rod(B, M.metal, [53, 3.88, -62.5], [75, 3.88, -62.5], 0.28, 0x8a8478, 0.28, 8); for (const px of [56, 64, 72]) { B.box(M.metal, 0.2, 3.6, 0.2, px, 0, -62.5, { c: IRON }); world.addCyl(px, -62.5, 0.2, 0, 3.6); }
    cwall(60, -36, 60, -64, 2.4, 0x8a8c8c); car(66, -40, 1.6, 0x5a6a4a, true);
  }
  root.add(instanced(merge([gCyl(0.07, 0.13, 5, 0xe6e4de, [0, 2.5, 0], [0, 0, 0], 1, 6), gCyl(0.02, 0.07, 2.6, 0xd8d6d0, [0, 6.2, 0], [0, 0, 0], 1, 5),
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => gCyl(0.012, 0.045, 2.4, 0x3a3432, [Math.cos(i * 2.2) * 0.75, 3.7 + i * 0.36, Math.sin(i * 2.2) * 0.75], [Math.sin(i * 2.2) * 0.8, 0, -Math.cos(i * 2.2) * 0.8], 1, 4))]), M.flat, trees));
  // ---- the hammer and sickle: on the flags, the tower, the monument, the palace -------------------------
  const EMB =new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: (() => {
    const t = drawTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#b01414'; g.fillRect(0, 0, w, h); g.fillStyle = g.strokeStyle = '#f2c230'; g.lineCap = 'round';
      const D = Math.PI / 180;
      g.beginPath(); g.arc(128, 118, 82, 125 * D, -125 * D, true); g.arc(120, 112, 64, -118 * D, 118 * D, false); g.closePath(); g.fill();      // the sickle's blade
      g.lineWidth = 20; g.beginPath(); g.moveTo(86, 176); g.lineTo(58, 212); g.stroke();                                                    // its handle
      g.lineWidth = 15; g.beginPath(); g.moveTo(198, 214); g.lineTo(96, 104); g.stroke();                                                   // the hammer's handle
      g.save(); g.translate(88, 96); g.rotate(Math.atan2(-110, -102)); g.fillRect(-14, -36, 30, 72); g.restore();                           // and its head
    });
    t.userData.own = true; return t; })() });
  const emblem = (x, y, z, sz, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), EMB); m.position.set(x, y, z); m.rotation.y = ry; root.add(m); };
  for (const sg of [-1, 1]) for (const k of [14, 24, 34]) { emblem(sg * k + 0.72, 9.32, -30.97, 0.78); emblem(sg * k + 0.72, 9.32, -31.03, 0.78, PI); }
  emblem(0, 41, -61.9, 7.5); emblem(0, 5.95, -0.76, 1.7); emblem(-44.7, 12.35, -6, 1.9, PI / 2); emblem(59.9, 19.5, -6, 4.6, -PI / 2);

  { // metro pavilion south of the square: turnstiles, a ticket window, the way down closed by a grille
    const x = 28, z = 34.5;
    room(B, M, x, 0, z, { w: 12, d: 8, h: 4.4, t: 0.4, mat: M.plaster, c: 0xc8c2b4, base: 0.6, doors: [{ side: 'w', at: 0, w: 2.8, h: 2.8 }, { side: 'n', at: -2.5, w: 2.8, h: 2.8 }], wins: [{ side: 's', at: -1.5, w: 5, y: 1.2, h: 1.8 }],
      floor: false, ceil: { mat: M.plaster, c: 0xb8b2a4 } });
    // the floor, with the well of the escalators cut out of it (x 29.5 to 33.8, z 33.6 to 37.2), and a balustrade round the well
    for (const [ax, bx, az, bz] of [[22.2, 29.5, 30.7, 38.3], [29.5, 33.8, 30.7, 33.6], [29.5, 33.8, 37.2, 38.3]]) B.box(M.cobble, bx - ax, 0.66, bz - az, (ax + bx) / 2, -0.6, (az + bz) / 2, { c: 0x9a8a80, solid: true });
    for (const bz of [33.6, 37.2]) B.box(M.stone, 4.3, 1.0, 0.16, 31.65, 0.06, bz, { c: 0xd8d2c4, solid: true });
    B.box(M.stone, 0.16, 1.0, 3.6, 33.72, 0.06, 35.4, { c: 0xd8d2c4, solid: true });
    sign('ВХОД', 29.2, 2.6, 35.4, 1.4, 0.4, { ry: -PI / 2, bg: '#1c2a4a', fg: '#f0e8c8' });
    roofed(x, 4.6, z, 12, 8);
    sign('МЕТРО', x - 6.1, 3.65, z, 4.2, 0.8, { ry: -PI / 2, bg: '#1c2a4a', fg: '#f0e8c8' }); sign('МЕТРО', x - 2.5, 3.65, z - 4.1, 4.2, 0.8, { ry: PI, bg: '#1c2a4a', fg: '#f0e8c8' });
    B.box(M.metal, 0.16, 2.0, 0.16, x - 5, 5.3, z - 3, { c: IRON }); sign('М', x - 5, 8.1, z - 3, 1.7, 1.7, { ry: -PI / 4, bg: '#f0ece0', fg: '#d01818' });
    for (const k of [-3.3, -1.25, 0.8]) { B.box(M.metal, 1.3, 1.0, 0.35, x - 1.5, 0.06, z + k, { c: 0x6a6e74, solid: true }); B.box(M.glow, 0.16, 0.06, 0.2, x - 2.0, 1.07, z + k, { c: 0x40ff70 }); }
    B.box(M.plaster, 2.4, 2.7, 2.5, x - 1.5, 0.06, z + 2.3, { c: 0x8a9aa6, solid: true }); B.box(M.glow, 0.05, 0.7, 1.2, x - 2.72, 1.2, z + 2.3, { c: 0xffe0a0 }); sign('КАССА', x - 2.74, 2.25, z + 2.3, 1.6, 0.36, { ry: -PI / 2, bg: '#e8e0d0', fg: '#1c2a4a' });

    emblem(x + 5.42, 3.55, z - 1.4, 1.0, -PI / 2);
    B.box(M.woodH, 0.5, 0.45, 2.6, x - 5.2, 0.06, z + 2.4, { c: 0x6a5a3a, solid: true });
    for (const k of [-3, 3]) B.box(M.glow, 2.6, 0.08, 0.3, x + k, 4.3, z, { c: 0xf0f4ff });
    extraFoes.push(['militia', x - 3.6, z - 0.4, { patrol: false }]); extraPicks.push([x - 4.4, z - 2.8]);
  }
  { // the district library: rows of shelves to hide between
    const x = -80, z = -44;
    room(B, M, x, 0, z, { w: 18, d: 12, h: 4.4, t: 0.45, mat: M.plaster, c: 0xd0c8b0, base: 0.6, doors: [{ side: 'e', at: 2.5, w: 2.4, h: 2.6 }, { side: 's', at: 5.5, w: 2.0, h: 2.5 }], wins: [{ side: 's', at: -3, w: 5, y: 1.1, h: 1.9 }],
      floor: { mat: M.woodH, c: 0x7a5a3a }, ceil: { mat: M.plaster, c: 0xc0b8a0 } });
    roofed(x, 4.6, z, 18, 12); sign('БИБЛИОТЕКА', x + 9.1, 3.7, z + 2.5, 6.4, 0.8, { ry: PI / 2, bg: '#d0c8b0', fg: '#2a2a4a' });
    for (let i = 0; i < 4; i++) shelf(B, M, x - 6.2 + i * 2.6, 0.06, z - 2.7, PI / 2, 5.6, 2.3, { c: 0x5a4028, goods: [0x7a2a22, 0x2a4a6a, 0x8a7a4a, 0x3a5a3a] });
    for (const [tx, tz] of [[x - 3.5, z + 3.3], [x + 1.5, z + 3.3]]) { B.box(M.woodH, 2.6, 0.78, 1.1, tx, 0.06, tz, { c: 0x6a4a30, solid: true }); B.box(M.glow, 0.3, 0.16, 0.2, tx, 1.1, tz, { c: 0x60d080 }); B.cyl(M.metal, 0.02, 0.02, 0.3, tx, 0.84, tz, { c: 0x2a2a2e, seg: 5 }); B.box(M.flat, 0.4, 0.04, 0.3, tx + 0.7, 0.84, tz, { ry: 0.3, c: 0xe8e0d0 }); }
    B.box(M.woodH, 1.0, 1.05, 2.6, x + 6.4, 0.06, z - 2.6, { c: 0x4a3626, solid: true }); B.box(M.woodH, 1.8, 1.5, 0.5, x + 4.4, 0.06, z - 5.2, { c: 0x5a4028, solid: true });
    B.box(M.cloth, 2.4, 1.5, 0.05, x + 6, 2.3, z - 5.5, { c: RED }); emblem(x + 6, 3.05, z - 5.46, 1.0);
    for (const k of [-5, 0, 5]) B.box(M.glow, 0.3, 0.08, 4, x + k, 4.3, z, { c: 0xfff0d0 });
    extraFoes.push(['agent', x - 4.9, z - 3, { patrol: false }], ['agent', x + 4, z + 0.6, { patrol: false }]); extraPicks.push([x - 7.6, z - 4.6]);
  }
  { // a new block going up: bare concrete frame, a slab you can climb to, a tower crane, the builders' hut
    const x = -86, z = 62, C2 = 0xa8a8a4, YEL = 0xd8a020;
    for (const px of [-7, 0, 7]) for (const pz of [-5, 0, 5]) { B.box(M.plaster, 0.6, 6.4, 0.6, x + px, -0.2, z + pz, { c: C2 }); world.addBox(x + px, z + pz, 0.6, 0.6, 0, -1, 6.2); }
    B.box(M.plaster, 15, 0.3, 11, x, 2.9, z, { c: C2, solid: true }); B.box(M.plaster, 8, 0.3, 11, x - 3.5, 5.9, z, { c: C2, solid: true });
    steps(B, M, x + 4.6, z + 5.5, 0, 3.2, 9, { w: 2.2, rise: 0.355, run: 0.55, mat: M.plaster, c: C2 });
    B.box(M.plaster, 6.6, 2.9, 0.25, x - 3.5, 0, z - 5.3, { c: 0xb8b4ac, solid: true }); B.box(M.plaster, 0.25, 2.9, 4.6, x - 7.3, 0, z - 2.6, { c: 0xb8b4ac, solid: true }); B.box(M.plaster, 7, 1.1, 0.25, x - 3.5, 3.2, z - 5.3, { c: 0xb8b4ac, solid: true });
    for (let k = 0; k < 4; k++) B.box(M.plaster, 3, 0.22, 2.6, x + 11.5, -0.05 + k * 0.26, z - 2.5, { ry: k * 0.03, c: 0xb8b4ac }); world.addBox(x + 11.5, z - 2.5, 3, 2.6, 0, -1, 1.0);
    crate(B, M, x - 5, 3.2, z + 3, 0.9, 0.3, 0x8a7a5a); crate(B, M, x + 2, 0.02, z - 2, 1.0, 0.5, 0x8a7a5a); barrel(B, M, x + 3.4, 0.02, z - 2.6, 0x5a6a7a);
    B.geo(M.flat, new THREE.ConeGeometry(2.2, 1.3, 9), [x + 10, 0.6, z + 6.5], [0, 0, 0], 1, 0xc8b88a); world.addCyl(x + 10, z + 6.5, 1.5, -1, 0.9);
    B.cyl(M.metal, 0.55, 0.7, 1.0, x + 7.6, 0.5, z + 9.5, { rx: 0.5, c: 0xc86a20, seg: 10 }); B.box(M.metal, 0.9, 0.5, 1.2, x + 7.6, 0, z + 9.3, { c: 0x3a3a3e }); world.addCyl(x + 7.6, z + 9.4, 0.8, -1, 1.6);
    { const cx = x - 11.5, cz = z + 8.5;                                                               // the crane
      B.box(M.metal, 2.4, 0.5, 2.4, cx, -0.1, cz, { c: 0x4a4a4e, solid: true });
      for (const a of [-1, 1]) for (const b of [-1, 1]) B.box(M.metal, 0.14, 26, 0.14, cx + a * 0.55, 0.3, cz + b * 0.55, { c: YEL });
      for (let k = 0; k < 13; k++) for (const a of [-1, 1]) { B.box(M.metal, 0.06, 2.3, 0.06, cx + a * 0.55, 0.3 + k * 2, cz, { rx: (k % 2 ? 1 : -1) * 0.5, c: YEL }); B.box(M.metal, 0.06, 2.3, 0.06, cx, 0.3 + k * 2, cz + a * 0.55, { rz: (k % 2 ? 1 : -1) * 0.5, c: YEL }); }
      world.addBox(cx, cz, 1.3, 1.3, 0, 0, 26);
      B.box(M.metal, 2.0, 1.8, 2.0, cx, 26.3, cz, { c: 0xe8e4dc }); B.box(M.flat, 1.6, 0.8, 0.05, cx + 0.2, 27.0, cz - 1.01, { c: 0x1c2630 });
      B.box(M.metal, 24, 0.7, 0.7, cx + 11, 28.1, cz - 1.5, { ry: 0.3, c: YEL }); B.box(M.metal, 7, 0.7, 0.7, cx - 3.6, 28.1, cz + 1.2, { ry: 0.3, c: YEL }); B.box(M.plaster, 2, 1.4, 1.2, cx - 6, 26.9, cz + 1.9, { ry: 0.3, c: 0x7a7a7e });
      B.box(M.metal, 0.05, 15.6, 0.05, x + 1, 12.5, z - 2, { c: 0x2a2a2e }); B.box(M.plaster, 3.2, 2.6, 0.22, x + 1, 9.9, z - 2, { ry: 0.3, c: 0xb8b4ac });
    }
    { const hx = x + 13.5, hz = z - 8.5;                                                               // the builders' hut
      room(B, M, hx, 0, hz, { w: 5, d: 3.2, h: 2.5, t: 0.2, mat: M.plaster, c: 0x4a6a8a, base: 0.5, doors: [{ side: 'w', at: 0, w: 1.7, h: 2.1 }], wins: [{ side: 's', at: 0.6, w: 1.2, y: 1.0, h: 0.9 }], floor: { mat: M.woodH, c: 0x6a5a3a }, ceil: { mat: M.woodH, c: 0x5a4a3a } });
      B.box(M.flat, 5.3, 0.14, 3.5, hx, 2.56, hz, { c: SNOW }); B.box(M.woodH, 1.6, 0.75, 0.7, hx + 1.4, 0.06, hz - 0.9, { c: 0x5a4a3a, solid: true }); B.cyl(M.metal, 0.3, 0.3, 0.9, hx + 1.9, 0.06, hz + 0.9, { c: 0x2a2a2e, seg: 9, solid: true }); B.geo(M.glow, new THREE.SphereGeometry(0.1, 6, 5), [hx + 1.58, 0.5, hz + 0.9], [0, 0, 0], 1, 0xff7a20);
      extraPicks.push([hx + 0.2, hz + 0.6]);
    }
    cwall(-99, 76, -72, 76, 2.2, 0x7a6a4a); cwall(-99, 47, -80, 47, 2.2, 0x7a6a4a); cwall(-99, 47, -99, 76, 2.2, 0x7a6a4a);
    sign('СТРОЙКА  ·  ОПАСНО', -84, 1.5, 76.22, 6, 0.6, { bg: '#e8c020', fg: '#1a1a1a' });
    extraFoes.push(['militia', x + 3, z + 1.5, {}], ['agent', x - 4, z - 9, {}]); extraPicks.push([x - 2, z + 2, 3.6]);
  }

  { // a ladder onto the garage roofs, then along the whole row; a cellar hatch to crawl into
    ladder(B, M, 43.8, 72.6, -1, 0, 0, 2.74, { c: 0x7a7a6a });
    B.box(M.flat, 17.6, 0.12, 6.8, 52.6, 2.62, 73, { c: SNOW, solid: true }); B.box(M.plaster, 17.6, 0.6, 0.2, 52.6, 2.74, 69.7, { c: 0x8a8c8c, solid: true });
    den(B, M, -18, 0, 67.6, 0, { mat: M.plaster, c: 0x8a8c8c, floor: { mat: M.flat, c: 0x5a5a5c } }); B.box(M.flat, 3.8, 0.14, 3.6, -18, 1.97, 67.6, { c: SNOW }); extraPicks.push([-18, 67.8, 0.6]);
  }

  { // the goods siding along the east edge: a loading dock, a van standing open beside it, another to crawl under: the long way round from the garages to the works
    const X = 92, RB = 0x6a3a2e, DK = 0x2a2a2e;
    B.box(M.flat, 3.4, 0.1, 133, X, -0.04, 37.5, { c: 0x5e5a56 }); for (const s of [-1, 1]) B.box(M.metal, 0.08, 0.14, 133, X + s * 0.76, 0.04, 37.5, { c: 0x5a5046 });
    for (let k = 0; k < 66; k++) B.box(M.wood, 2.6, 0.1, 0.24, X, -0.01, -28 + k * 2, { c: 0x3a3028 });
    B.box(M.wood, 2.6, 0.5, 0.4, X, 0.6, -29.2, { c: RED, solid: true }); for (const s of [-1, 1]) B.box(M.metal, 0.2, 1.2, 0.5, X + s * 0.9, 0, -29.2, { c: DK });      // the buffer stop
    const van = (z, open) => {
      for (const wz of [-2.9, 2.9]) { rod(B, M.metal, [X - 0.95, 0.68, z + wz], [X + 0.95, 0.68, z + wz], 0.07, DK);
        for (const s of [-1, 1]) { rod(B, M.metal, [X + s * 0.7, 0.68, z + wz], [X + s * 0.82, 0.68, z + wz], 0.5, DK, 0.5, 14); world.addBox(X + s * 0.76, z + wz, 0.14, 1.0, 0, -0.5, 1.2); } }
      for (const e of [-1, 1]) for (const s of [-1, 1]) rod(B, M.metal, [X + s * 0.85, 1.38, z + e * 4.5], [X + s * 0.85, 1.38, z + e * 4.8], 0.14, DK, 0.17, 8);
      if (open) { room(B, M, X, 1.39, z, { w: 2.9, d: 9, h: 2.4, t: 0.12, mat: M.woodH, c: RB, base: 0.14, doors: [{ side: 'w', at: 0, w: 2, h: 2.15 }, { side: 'e', at: 0, w: 2, h: 2.15 }], floor: { mat: M.woodH, c: 0x5a4a3a }, ceil: { mat: M.woodH, c: RB } });
        for (const s of [-1, 1]) B.box(M.woodH, 0.06, 2.15, 2, X + s * 1.5, 1.45, z + 2.1, { c: 0x5a3026 }); }
      else { B.box(M.woodH, 2.9, 2.74, 9, X, 1.25, z, { c: RB, solid: true }); for (const s of [-1, 1]) { B.box(M.woodH, 0.06, 2.2, 2.1, X + s * 1.47, 1.5, z, { c: 0x5a3026 }); B.box(M.metal, 0.05, 0.06, 4.4, X + s * 1.5, 3.76, z + 1, { c: DK }); } }
      B.box(M.metal, 3.1, 0.1, 9.2, X, 3.99, z, { c: 0x4a4a4e }); B.box(M.flat, 2.7, 0.1, 8.9, X, 4.09, z, { c: SNOW });
    };
    van(2, true); van(24, false);
    B.box(M.plaster, 8, 1.6, 14, X - 5.45, -0.3, 2, { c: CONC, solid: true }); B.box(M.flat, 0.3, 0.02, 14, X - 1.65, 1.3, 2, { c: 0xd8b020 });
    steps(B, M, X - 5.45, 9, 0, 1.3, 4, { w: 4, rise: 0.325, run: 0.6, mat: M.plaster, c: CONC }); steps(B, M, X - 5.45, -5, PI, 1.3, 4, { w: 4, rise: 0.325, run: 0.6, mat: M.plaster, c: CONC });
    for (const [px, pz] of [[-8.9, 3.6], [-8.9, 8.6], [-2.2, 3.6], [-2.2, 8.6]]) B.box(M.metal, 0.16, 3, 0.16, X + px, 1.3, pz, { c: IRON });      // a roof over the south half of the dock
    B.box(M.metal, 7.6, 0.12, 6.6, X - 5.55, 4.3, 5.8, { c: 0x5a5c60 }); B.box(M.flat, 7.2, 0.1, 6.2, X - 5.55, 4.42, 5.8, { c: SNOW });
    crate(B, M, X - 8, 1.3, -2.6, 1.0, 0.2, 0x8a7a5a); crate(B, M, X - 7.9, 2.3, -2.6, 0.7, 0.5, 0x8a7a5a); crate(B, M, X - 6.6, 1.3, -3.4, 0.8, 0.1, 0x8a7a5a); sacks(B, M, X - 7.6, 1.3, 6.6, PI / 2, { w: 2 }); barrel(B, M, X - 3.4, 1.3, 7.6, 0x5a6a7a); barrel(B, M, X - 4.3, 1.3, 7.9, 0x5a6a7a);
    crate(B, M, X + 0.7, 1.45, 5.6, 0.9, 0.2, 0x8a7a5a); crate(B, M, X - 0.6, 1.45, -1.6, 0.8, 0.4, 0x8a7a5a);
    B.cyl(M.metal, 0.05, 0.05, 1.3, X - 1.9, 0, 13.5, { c: DK, seg: 6 }); B.box(M.glow, 0.16, 0.16, 0.1, X - 1.9, 1.3, 13.5, { c: 0x3a6aff });                                               // a shunting signal
    extraFoes.push(['militia', X - 6, 0, { up: 1.5 }]); extraPicks.push([X + 0.4, 3.4, 1.6]);
  }
  { // the kolkhoz market between the Palace and the flats: stalls to duck behind on the way to the square
    for (const [sx, c1] of [[-44.5, 0x6a7a5a], [-40.5, 0x8a6a4a], [-27, 0x5a6a7a], [-23, 0x8a6a4a]]) stall(B, M, sx, world.height(sx, 26.5) - 0.06, 26.5, PI, { cloth: c1, cloth2: 0xd8d4c8, goods: [0x8a6a3a, 0xd8c8a0, 0x5a7a3a, 0xb8502a, 0xc8a84a] });
    sacks(B, M, -25, world.height(-25, 28.6) - 0.04, 28.6, 0, { w: 1.6 }); pots(B, M, -37.6, world.height(-37.6, 27.2) - 0.04, 27.2, { n: 4, s: 1.2, c: [0x6a7a5a, 0x8a8a6a, 0x5a6a5a], solid: false }); crate(B, M, -43, world.height(-43, 28.5) - 0.05, 28.5, 0.8, 0.3, 0x8a7a5a);
    folk('russianWoman', -40.5, 26.9, PI, { pose: 'talk', over: { extras: ['dress', 'coat', 'apron'], apron: 0xd8d4c8 } }); folk('russianMan', -27, 26.9, PI, { pose: 'hips' });
  }
  { // the district boiler house behind the Palace, and its heating main on trestles: duck under the pipe, or walk through where it arches over the path
    const x = -93, z = -27, BR = 0x8a5a4a, F = 0.16, PC = 0xa8a49a, Y = 1.52;
    room(B, M, x, 0.1, z, { w: 10, d: 7, h: 4.6, t: 0.4, mat: M.plaster, c: BR, base: 0.6, doors: [{ side: 's', at: 2, w: 1.8, h: 2.4 }, { side: 'n', at: 3, w: 1.5, h: 2.2 }], wins: [{ side: 's', at: -2.5, w: 2.4, y: 1.7, h: 1.4 }],
      floor: { mat: M.plaster, c: 0x4a4a4c }, ceil: { mat: M.plaster, c: 0x6a6a68 } });
    roofed(x, 4.9, z, 10, 7); B.cyl(M.plaster, 0.7, 1.0, 16, x - 6.4, -0.3, z, { c: BR, seg: 10, solid: true }); sign('КОТЕЛЬНАЯ', x + 2, 3.5, z + 3.58, 3.4, 0.5, { bg: '#3a3a3e', fg: '#e0d8c0' });
    for (const bz of [-1.6, 1.6]) {                                                                                                         // two boilers in their brick settings, fire doors glowing
      B.box(M.plaster, 3.2, 1.9, 1.9, x - 2.8, F, z + bz, { c: 0x6a4034, solid: true }); rod(B, M.metal, [x - 4.3, F + 2.0, z + bz], [x - 1.3, F + 2.0, z + bz], 0.75, 0x3a3e44, 0.75, 12);
      B.box(M.glow, 0.05, 0.4, 0.5, x - 1.18, F + 0.4, z + bz, { c: 0xff7a20 }); B.cyl(M.metal, 0.09, 0.09, 0.04, x - 1.17, F + 1.4, z + bz + 0.5, { rz: PI / 2, c: 0xe8e4d8, seg: 10 });
      rod(B, M.metal, [x - 2.8, F + 2.6, z + bz], [x - 2.8, 3.3, z + bz], 0.14, PC); rod(B, M.metal, [x - 2.8, 3.3, z + bz], [x + 5.3, 3.3, z + 1.4], 0.14, PC);
    }
    B.geo(M.flat, new THREE.ConeGeometry(0.9, 0.8, 7), [x + 3.9, F + 0.4, z - 0.4], [0, 0, 0], 1, 0x1a1a1c); world.addCyl(x + 3.9, z - 0.4, 0.7, F, F + 0.6); rod(B, M.wood, [x + 3.1, F, z - 0.9], [x + 3.4, F + 1.3, z - 0.5], 0.02, 0x6a4a2e);
    B.geo(M.flat, new THREE.ConeGeometry(2.4, 1.5, 9), [x - 3.5, 0.65, z + 5.8], [0, 0, 0], 1, 0x1a1a1c); for (const [r, h] of [[2.1, 0.4], [1.4, 0.8], [0.7, 1.2]]) world.addCyl(x - 3.5, z + 5.8, r, -1, h);      // the coal heap outside: climb it
    // the heating main: out of the east wall, north behind the Palace and in through its back wall, with one arch over the path
    const run = (a, b, low) => { rod(B, M.metal, a, b, 0.3, PC, 0.3, 9); if (low) world.addBox((a[0] + b[0]) / 2, (a[2] + b[2]) / 2, Math.abs(b[0] - a[0]) + 0.7, Math.abs(b[2] - a[2]) + 0.7, 0, 1.2, 1.85); };
    const pts = [[x + 5.4, 3.3, z + 1.4], [x + 5.4, Y, z + 1.4], [-84, Y, z + 1.4], [-84, Y, -21], [-84, 3, -21], [-84, 3, -17], [-84, Y, -17], [-84, Y, -12], [-79, Y, -12]];
    for (let i = 0; i < pts.length - 1; i++) run(pts[i], pts[i + 1], pts[i][1] === Y && pts[i + 1][1] === Y);
    for (const [px, pz] of [[x + 5.4, z + 1.4], [-84, -21], [-84, -17]]) world.addCyl(px, pz, 0.34, 0, 3.3);
    for (const [tx, tz] of [[-86.5, z + 1.4], [-84, -23.6], [-84, -14.6], [-81.5, -12]]) B.box(M.plaster, 0.3, 1.5, 0.3, tx, -0.3, tz, { c: CONC });
    extraFoes.push(['agent', x + 2.6, z + 6, {}]);
  }
  { // a small church, closed long ago and used as a store: the cross is gone from the dome, the windows are boarded, the nave is stacked with crates and sacks
    const x = -94, z = -6, WH = 0xd2cec2, F = 0.36, RF = 0x56605a;
    room(B, M, x, 0.3, z, { w: 9, d: 7, h: 5, t: 0.5, mat: M.plaster, c: WH, base: 0.8, doors: [{ side: 'w', at: 0, w: 1.8, h: 2.6 }, { side: 's', at: 2, w: 1.5, h: 2.2 }], floor: { mat: M.stone, c: 0x8a8478 }, ceil: { mat: M.plaster, c: 0xb8b4a8 } });
    B.box(M.stone, 1.2, 0.3, 2.6, x - 5.1, -0.1, z, { c: 0x8a8478, solid: true }); B.box(M.stone, 2.2, 0.3, 1.1, x + 2, -0.1, z + 4.05, { c: 0x8a8478, solid: true });
    const pyr = (h, k, y, c) => { const g = new THREE.ConeGeometry(1, h, 4); g.rotateY(PI / 4); B.geo(M.shingle, g, [x, y + h / 2, z], [0, 0, 0], [9.9 / 1.414 * k, 1, 7.9 / 1.414 * k], c); };
    pyr(2.4, 1, 5.5, RF); pyr(1.9, 0.8, 6.1, SNOW);
    B.cyl(M.plaster, 1.0, 1.0, 2.4, x, 6.8, z, { c: WH, seg: 10 }); for (let k = 0; k < 4; k++) B.box(M.flat, 0.3, 1.0, 0.06, x + Math.sin(k * PI / 2) * 0.98, 7.9, z + Math.cos(k * PI / 2) * 0.98, { ry: k * PI / 2, c: 0x1c1c22 });
    B.geo(M.metal, new THREE.LatheGeometry([[0.02, 0], [1.05, 0.02], [1.3, 0.5], [1.15, 1.1], [0.6, 1.7], [0.2, 2.2], [0.06, 2.7]].map(([r, y]) => new THREE.Vector2(r, y)), 12), [x, 9.2, z], [0, 0, 0], 1, RF);
    B.cyl(M.metal, 0.04, 0.05, 0.3, x, 11.85, z, { c: 0x3a3632, seg: 5 });                                                              // the stump where the cross stood
    B.cyl(M.plaster, 1.6, 1.6, 4.3, x + 5.7, -0.3, z, { c: WH, seg: 12, solid: true }); B.geo(M.shingle, new THREE.SphereGeometry(1.7, 12, 6, 0, PI * 2, 0, PI / 2), [x + 5.7, 4.0, z], [0, 0, 0], [1, 0.7, 1], RF);
    for (const [wx, s] of [[-2, -1], [1.5, -1], [-2, 1]]) for (const q of [3.5, 3.0]) { B.box(M.flat, 0.9, 1.9, 0.04, x + wx, 2, z + s * (q + 0.005), { c: 0x1c1c22 }); for (let k = 0; k < 3; k++) B.box(M.wood, 1.15, 0.24, 0.05, x + wx, 2.25 + k * 0.6, z + s * (q + (q > 3.2 ? 0.04 : -0.04)), { rz: (k - 1) * 0.07, c: 0x6a5a48 }); }      // the windows, boarded up inside and out
    sign('СКЛАД № 4', x - 4.58, 3.5, z, 2.2, 0.45, { ry: -PI / 2, bg: '#c8c0a8', fg: '#2a2a2a' });
    // inside: stores along the walls; the east end is left bare, with the frame of the old screen and pale patches where the icons hung
    crate(B, M, x - 2, F, z - 2.3, 1.0, 0.1, 0x8a7a5a); crate(B, M, x - 2, F + 1.0, z - 2.3, 0.8, 0.4, 0x8a7a5a); crate(B, M, x - 0.8, F, z - 2.2, 0.9, 0.3, 0x8a7a5a); crate(B, M, x + 0.6, F, z - 2.3, 1.1, 0, 0x8a7a5a); crate(B, M, x + 0.6, F + 1.1, z - 2.3, 0.9, 0.2, 0x8a7a5a); crate(B, M, x + 1.9, F, z - 2.2, 0.8, 0.5, 0x8a7a5a);
    sacks(B, M, x - 1.6, F, z + 2.2, PI, { w: 2.2 }); barrel(B, M, x - 3.4, F, z + 2.5, 0x5a6a7a); barrel(B, M, x - 3.5, F, z - 2.5, 0x5a6a7a);
    B.box(M.woodH, 0.12, 0.2, 5.6, x + 3.3, F + 3, z, { c: 0x5a4028 }); for (const pz of [-2.7, -0.9, 0.9, 2.7]) B.box(M.woodH, 0.12, 3, 0.12, x + 3.3, F, z + pz, { c: 0x5a4028 });
    for (const pz of [-1.8, 1.8]) B.box(M.flat, 0.02, 1.1, 0.75, x + 3.98, F + 1.2, z + pz, { c: 0xe4e0d4 });
    extraFoes.push(['agent', x + 0.5, z + 0.4, { patrol: false }]); extraPicks.push([x - 3.2, z + 0.9, 0.6]);
  }
  { // the building site: a ladder to the top slab, and a long one to a perch on the crane's mast
    const x = -86, z = 62, cx = -97.5, cz = 70.5;
    ladder(B, M, x + 0.5, z + 2.5, 1, 0, 3.2, 6.2); B.box(M.plaster, 0.25, 1.0, 5, x - 7.3, 6.2, z + 2, { c: 0xb8b4ac, solid: true }); crate(B, M, x - 5.4, 6.2, z - 3.6, 0.9, 0.3, 0x8a7a5a);
    B.box(M.metal, 2.4, 0.12, 2.4, cx + 1.85, 8.88, cz, { c: 0x4a4a4e, solid: true }); for (const s of [-1, 1]) { rod(B, M.metal, [cx + 0.6, 7.4, cz + s * 0.55], [cx + 3, 8.9, cz + s * 1.1], 0.05, 0xd8a020);
      B.box(M.metal, 2.4, 0.05, 0.05, cx + 1.85, 9.95, cz + s * 1.15, { c: 0xd8a020 }); for (const k of [-1.15, 0, 1.15]) B.box(M.metal, 0.05, 1, 0.05, cx + 1.85 + k, 9, cz + s * 1.15, { c: 0xd8a020 }); world.addBox(cx + 1.85, cz + s * 1.15, 2.4, 0.1, 0, 9, 10); }
    ladder(B, M, cx + 3.05, cz, 1, 0, world.height(cx + 4.2, cz), 9, { c: 0xb8922a, lean: 0.12 });
    extraPicks.push([x - 3.5, z, 6.4]);
  }
  { // people of the district who take no part: the yard-keeper clearing snow, two pensioners at chess, a man fishing through the ice, the librarian
    folk('russianMan', -27, 64.5, 0.9, { pose: 'work', over: { extras: ['coat', 'apron'], apron: 0xc8c0a8 } }); rod(B, M.wood, [-26.75, 1.15, 64.75], [-26.2, 0.1, 65.4], 0.02, 0x8a6a44); B.box(M.metal, 0.3, 0.03, 0.34, -26.1, 0.05, 65.5, { ry: 0.9, c: 0x8a8c90 });
    B.geo(M.flat, new THREE.SphereGeometry(1, 8, 5), [-25.4, 0.05, 66.3], [0, 0, 0], [0.9, 0.45, 0.7], 0xe6eaf0);
    const ty = world.height(-39, 46.5) - 0.03; table(B, M, -39, ty, 46.5, 0, { w: 0.9, d: 0.9, h: 0.75 }); B.box(M.flat, 0.44, 0.02, 0.44, -39, ty + 0.75, 46.5, { c: 0xd8c8a0 });
    for (let k = 0; k < 6; k++) B.cyl(M.flat, 0.018, 0.024, 0.07, -39.16 + (k % 3) * 0.14, ty + 0.77, 46.36 + (k > 2 ? 0.28 : 0) + (k % 2) * 0.05, { c: k > 2 ? 0x1c1c1e : 0xf0ece0, seg: 6 });
    for (const s of [-1, 1]) { B.box(M.woodH, 0.4, 0.45, 0.4, -39 + s * 0.85, ty, 46.5, { c: 0x6a5a3a }); folk('russianMan', -39 + s * 0.85, 46.5, -s * PI / 2, { y: ty, pose: 'sit', seat: 0.45, arms: s < 0 ? [-1.0, -0.4] : [-0.5, -0.5] }); }
    const py = world.height(-80, 20) + 0.08; B.cyl(M.flat, 0.22, 0.22, 0.02, -80.4, py, 21, { c: 0x16222e, seg: 10 }); B.box(M.wood, 0.4, 0.4, 0.4, -81.2, py, 21, { c: 0x6a5a3a });
    folk('russianMan', -81.2, 21, PI / 2, { y: py, pose: 'sit', seat: 0.4, arms: [-0.9, -0.4] }); rod(B, M.wood, [-80.85, py + 0.8, 21.12], [-80.4, py + 0.55, 21], 0.012, 0x8a6a44); rod(B, M.flat, [-80.4, py + 0.55, 21], [-80.4, py, 21], 0.004, 0x1c1c1e);
    folk('russianWoman', -72.3, -46.6, -PI / 2, { y: 0.06, arms: [-0.7, -0.6], over: { face: ['bun', 'glasses'], extras: ['dress', 'shawl'], shawl: 0x6a4a5a, shirt: 0x8a8a7a, sleeve: 0x8a8a7a, dress: 0x4a4a52 } });
  }

  // ---- below ground: the metro station under the pavilion ----------------------------------------------------------------
  // An escalator hall goes down 9 m from the pavilion to a platform between two tracks, in the manner of the Moscow stations:
  // marble columns, arches, bronze chandeliers, the name of the station on the walls; a train stands at the platform with its
  // doors open. The ground there is cut away (world.height is lowered under the hall at the end of the build).
  const METRO = { y: -9.0, pit: -10.3, x0: 44.5, x1: 68, z0: 29.5, z1: 48.5, sx0: 29.5, sz0: 33.6, sz1: 37.2 }, MARBLE = 0xd8d2c4, GRANITE = 0x7a6a64, BRONZE = 0xb8903a;
  {
    const { y: PY, pit: PIT, x0, x1, z0, z1, sx0, sz0, sz1 } = METRO, zc = (sz0 + sz1) / 2, SW = sz1 - sz0, N = 30, RISE = (0.06 - PY) / N, RUN = (x0 - sx0) / N;
    // the flight of steps (each a solid block down to the bottom, so that nothing thinks there is room under it)
    for (let i = 0; i < N; i++) { const top = 0.06 - RISE * (i + 1); B.box(M.stone, RUN, top - PIT + 0.1, SW, sx0 + RUN * (i + 0.5), PIT - 0.1, zc, { c: i % 2 ? GRANITE : 0x6e605a, solid: true }); }
    // the escalator shaft: marble walls, a vault that follows the slope, bronze lamps on the balustrades
    for (const s of [-1, 1]) B.box(M.plaster, x0 - sx0 + 0.3, -PIT + 0.4, 0.3, (sx0 + x0) / 2, PIT - 0.4, zc + s * (SW / 2 + 0.15), { c: MARBLE, solid: true });
    for (let x = 34; x < x0; x += 1.5) { const yt = 0.06 - RISE * ((x - sx0) / RUN) + 3.4; if (yt < -0.5) B.box(M.plaster, 1.55, 0.25, SW + 0.6, x + 0.75, yt, zc, { c: 0xe8e2d4 }); }
    for (const dz of [-0.6, 0.6]) for (let i = 0; i < N; i += 1) { const x = sx0 + RUN * (i + 0.5), top = 0.06 - RISE * (i + 1); B.box(M.woodH, RUN + 0.02, 0.9, 0.1, x, top, zc + dz, { c: 0x3a2a20 }); }
    for (let i = 2; i < N; i += 5) { const x = sx0 + RUN * (i + 0.5), top = 0.06 - RISE * (i + 1); for (const dz of [-0.6, 0.6]) { B.cyl(M.metal, 0.04, 0.05, 0.6, x, top + 0.9, zc + dz, { c: BRONZE, seg: 6 }); B.geo(M.glow, new THREE.CylinderGeometry(0.09, 0.07, 0.22, 8), [x, top + 1.6, zc + dz], [0, 0, 0], 1, 0xfff0c0); } }
    // the ground over the shaft and the hall: one can still walk across it up there
    for (const [ax, bx, az, bz] of [[33.8, x1 + 0.4, sz0 - 0.4, sz1 + 0.4], [x0 - 0.3, x1 + 0.4, z0 - 0.4, z1 + 0.4]]) { const b = world.addBox((ax + bx) / 2, (az + bz) / 2, bx - ax, bz - az, 0, -0.45, 0); b.noMap = true; }
    // the hall: walls, the platform between the two tracks, the vault
    B.box(M.stone, x1 - x0, PY - PIT + 0.1, 11, (x0 + x1) / 2, PIT - 0.1, 38.5, { c: GRANITE, solid: true });                                  // the platform, z 33 to 44
    for (const s of [-1, 1]) B.box(M.stone, x1 - x0, 0.06, 0.4, (x0 + x1) / 2, PY - 0.03, 38.5 + s * 5.3, { c: 0xe8d8a0 });                      // its pale edges
    const wallZ = (z, y0, y1) => B.box(M.plaster, x1 - x0 + 0.6, y1 - y0, 0.3, (x0 + x1) / 2, y0, z, { c: MARBLE, solid: true });
    wallZ(z0 - 0.15, PIT - 0.2, PY + 5.4); wallZ(z1 + 0.15, PIT - 0.2, PY + 5.4);
    B.box(M.plaster, 0.3, PY + 5.4 - PIT, z1 - z0, x1 + 0.15, PIT - 0.2, (z0 + z1) / 2, { c: MARBLE, solid: true });
    B.box(M.plaster, 0.3, PY + 5.4 - PIT, sz0 - z0, x0 - 0.15, PIT - 0.2, (z0 + sz0) / 2, { c: MARBLE, solid: true }); B.box(M.plaster, 0.3, PY + 5.4 - PIT, z1 - sz1, x0 - 0.15, PIT - 0.2, (sz1 + z1) / 2, { c: MARBLE, solid: true });
    B.box(M.plaster, 0.3, 2.2, SW, x0 - 0.15, PY + 3.2, zc, { c: MARBLE, solid: true });
    for (const [z, dir] of [[z0 + 0.05, 1], [z1 - 0.05, -1]]) for (const x of [x0 + 0.2, x1 - 0.2]) B.box(M.flat, 0.4, 3.6, 3.2, x, PIT, z + dir * 1.75, { c: 0x050506 });   // the dark mouths of the tunnels
    for (let x = x0; x < x1; x += 2) { B.box(M.plaster, 2.05, 0.3, z1 - z0 + 0.6, x + 1, PY + 5.4, (z0 + z1) / 2, { c: 0xf0ead8 }); }
    for (let x = x0 + 1; x < x1; x += 3.5) B.geo(M.plaster, new THREE.TorusGeometry(2.7, 0.18, 6, 16, Math.PI), [x, PY + 2.7, 38.5], [0, Math.PI / 2, 0], [1, 1, 1], 0xf4eedc);
    // the tracks: rails on sleepers in the two pits
    for (const zt of [31.25, 46.25]) { for (const d of [-0.76, 0.76]) B.box(M.metal, x1 - x0, 0.14, 0.08, (x0 + x1) / 2, PIT + 0.12, zt + d, { c: 0x6a6c70 }); for (let x = x0 + 0.3; x < x1; x += 0.7) B.box(M.woodH, 0.22, 0.12, 2.4, x, PIT, zt, { c: 0x3a2e26 }); B.box(M.metal, x1 - x0, 0.12, 0.1, (x0 + x1) / 2, PIT + 0.2, zt + (zt < 38 ? -1.3 : 1.3), { c: 0x5a5a60 }); }
    // columns of marble with bronze capitals, chandeliers between them, the name of the station, benches
    for (let x = x0 + 2.7; x < x1 - 1; x += 3.5) for (const zz of [35.2, 41.8]) { B.box(M.plaster, 0.95, 5.4, 0.95, x, PY, zz, { c: 0xe4dccc, solid: true }); B.box(M.metal, 1.15, 0.3, 1.15, x, PY + 5.1, zz, { c: BRONZE }); B.box(M.stone, 1.1, 0.25, 1.1, x, PY, zz, { c: GRANITE }); }
    for (let x = x0 + 4.45; x < x1 - 2; x += 7) {
      B.cyl(M.metal, 0.02, 0.02, 1.2, x, PY + 3.9, 38.5, { c: BRONZE, seg: 4 }); B.geo(M.metal, new THREE.TorusGeometry(0.7, 0.04, 5, 16), [x, PY + 3.9, 38.5], [Math.PI / 2, 0, 0], 1, BRONZE);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; B.geo(M.glow, new THREE.SphereGeometry(0.1, 7, 5), [x + Math.cos(a) * 0.7, PY + 4.02, 38.5 + Math.sin(a) * 0.7], [0, 0, 0], 1, 0xfff0c8); }
      B.geo(M.glow, new THREE.SphereGeometry(0.22, 9, 7), [x, PY + 3.75, 38.5], [0, 0, 0], 1, 0xfff4d8);
    }
    for (const [z, ry] of [[z0 + 0.32, 0], [z1 - 0.32, PI]]) for (const x of [x0 + 8, x1 - 8]) sign('ПЛОЩАДЬ РЕВОЛЮЦИИ', x, PY + 3.3, z, 7.2, 0.7, { ry, bg: '#e8e0cc', fg: '#8a1414' });
    sign('СЛАВА ТРУДУ', x1 - 0.18, PY + 4.3, 38.5, 5, 0.7, { ry: -PI / 2, bg: '#8a1414', fg: '#f0d890' }); emblem(x1 - 0.2, PY + 2.4, 38.5, 1.4, -PI / 2);
    for (const x of [x0 + 6, x0 + 13, x0 + 20]) { B.box(M.woodH, 2.2, 0.1, 0.5, x, PY + 0.45, 38.5, { c: 0x6a4a30 }); B.box(M.woodH, 2.2, 0.5, 0.08, x, PY + 0.55, 38.5, { c: 0x6a4a30 }); world.addBox(x, 38.5, 2.2, 0.6, 0, PY, PY + 0.9); }
    // the train at the north platform, its doors open: two cars to walk through
    for (const [cx, n] of [[51.5, 0], [61.8, 1]]) {
      const FL = PY - 0.1, zt = 31.25, L = 9.6, BL = 0x2a4a8a;
      room(B, M, cx, FL, zt, { w: L, d: 2.7, h: 2.3, t: 0.08, mat: M.metal, c: BL, base: 0.9, doors: [-3.2, 0, 3.2].map((at) => ({ side: 's', at, w: 1.2, h: 1.95 })),
        wins: [-3.2, 0, 3.2].map((at) => ({ side: 'n', at, w: 1.6, y: 0.85, h: 0.75 })).concat([-1.6, 1.6].map((at) => ({ side: 's', at, w: 1.4, y: 0.85, h: 0.75 }))), floor: { mat: M.woodH, c: 0x6a5a4a }, ceil: { mat: M.metal, c: 0xd8d4c8 } });
      B.box(M.metal, L + 0.04, 0.36, 2.74, cx, FL + 0.9, zt, { c: 0xd8cca8 }); B.box(M.metal, L, 0.5, 2.5, cx, FL - 0.95, zt, { c: 0x1c1c20 });    // the cream band, the bogies
      for (const s of [-1, 1]) B.box(M.woodH, L - 1, 0.1, 0.45, cx, FL + 0.45, zt - s * 1.0, { c: 0x8a6a40 });                                       // the seats along the sides
      for (let k = -1; k <= 1; k++) B.box(M.glow, 1.6, 0.04, 0.12, cx + k * 3.2, FL + 2.25, zt, { c: 0xf0f4ff });
      if (n === 1) { B.box(M.metal, 0.06, 1.2, 1.6, cx + L / 2 + 0.03, FL + 0.9, zt, { c: 0xd8cca8 }); B.geo(M.glow, new THREE.SphereGeometry(0.12, 7, 5), [cx + L / 2 + 0.05, FL + 0.6, zt - 0.8], [0, 0, 0], 1, 0xfff0c0); B.geo(M.glow, new THREE.SphereGeometry(0.12, 7, 5), [cx + L / 2 + 0.05, FL + 0.6, zt + 0.8], [0, 0, 0], 1, 0xfff0c0); }
    }
    // who is down there: people waiting for the next train, a cleaner, and the Committee's men
    folk('russianWoman', x0 + 9, 37, 0.4, { y: PY, pose: 'carry', over: { extras: ['coat', 'shawl'], coat: 0x5a4a3a, shawl: 0x8a2a2a } });
    folk('russianMan', x0 + 15, 40, PI + 0.3, { y: PY, pose: 'talk', over: { extras: ['coat'], coat: 0x3a3a44, hat: 'ushanka' } });
    folk('russianWoman', x0 + 21.5, 36.8, -0.8, { y: PY, pose: 'work', over: { extras: ['dress', 'apron'], apron: 0x8ab0c8, kerchief: 0xe8e0d0 } });
    folk('russianMan', x0 + 13, 38.5, PI / 2, { y: PY, pose: 'sit', seat: 0.45, arms: [-1.1, -1.1], over: { extras: ['coat'], coat: 0x4a4034 } });
    extraFoes.push(['militia', x0 + 5, 38, { y: PY + 0.3 }], ['agent', x0 + 17, 41, { y: PY + 0.3 }], ['agent', 51.5, 31.3, { y: PY + 0.2, patrol: false }], ['dog', x0 + 19, 36, { y: PY + 0.3 }]);
    extraPicks.push([x0 + 13.3, 38.6, PY + 0.6]);
  }

  // ---- a block one can go up: a stairwell with five floors and a flat on each ---------------------------------------------
  // In the long block on the north side of the courtyard a section is not prefabricated wall but rooms: a stairwell from the
  // courtyard up to the fifth floor, and on every landing the door of a flat (hall, kitchen, living room), each furnished in its
  // own way. Windows look out on the courtyard and behind. Enemies can follow up the stairs (see World.ladders, 'stair').
  const FLATS = { x0: -42, x1: -30, z0: 74.5, z1: 85.5, n: 5, FH: 2.9 };
  {
    const { x0, x1, z0, z1, n, FH } = FLATS, WC = 0xd8d8d2, IN = 0xe4dcc8, Y = (k) => 0.16 + FH * k, sx1 = -38.4, oz0 = 77.0, oz1 = 81.3;
    const slab = (ax, bx, az, bz, top, c = 0x8a8a86) => B.box(M.stone, bx - ax, 0.26, bz - az, (ax + bx) / 2, top - 0.26, (az + bz) / 2, { c, solid: true });
    const wallX = (z, y0, y1, holes, t = 0.3, c = WC) => {          // a wall along x at z, from x0 to x1, with openings [a, b, ya, yb]
      let cur = x0; const piece = (a, b, ya, yb) => { if (b - a > 0.02 && yb - ya > 0.02) B.box(M.plaster, b - a, yb - ya, t, (a + b) / 2, ya, z, { c, solid: true }); };
      for (const [a, b, ya, yb] of holes.sort((p, q) => p[0] - q[0])) { piece(cur, a, y0, y1); piece(a, b, y0, ya); piece(a, b, yb, y1); cur = b; }
      piece(cur, x1, y0, y1);
    };
    const wallZ = (x, za, zb, y0, y1, doorA, doorB, c = IN, dh = 2.1) => {   // a partition along z at x, with a door from doorA to doorB
      const piece = (a, b, ya, yb) => { if (b - a > 0.02) B.box(M.plaster, 0.14, yb - ya, b - a, x, ya, (a + b) / 2, { c, solid: true }); };
      if (doorA === undefined) piece(za, zb, y0, y1); else { piece(za, doorA, y0, y1); piece(doorB, zb, y0, y1); piece(doorA, doorB, y0 + dh, y1); }
    };
    const wallX2 = (z, xa, xb, y0, y1, doorA, doorB, c = IN, dh = 2.1) => {
      const piece = (a, b, ya, yb) => { if (b - a > 0.02) B.box(M.plaster, b - a, yb - ya, 0.14, (a + b) / 2, ya, z, { c, solid: true }); };
      piece(xa, doorA, y0, y1); piece(doorB, xb, y0, y1); piece(doorA, doorB, y0 + dh, y1);
    };
    B.box(M.stone, x1 - x0, 0.46, z1 - z0, (x0 + x1) / 2, -0.3, (z0 + z1) / 2, { c: 0x8a8a86, solid: true });          // ground floor
    for (let k = 0; k < n; k++) {
      const y = Y(k), top = y + FH;
      if (k > 0) { slab(x0, x1, z0 + 0.3, oz0, y); slab(sx1, x1, oz0, z1 - 0.3, y); slab(x0, sx1, oz1, z1 - 0.3, y); }
      const winF = [[-35.6, -34.4, y + 0.9, y + 2.2], [-31.8, -30.6, y + 0.9, y + 2.2]], winB = [[-35.2, -33.6, y + 0.9, y + 2.2], [-32, -30.8, y + 0.9, y + 2.2], [-41.2, -39.8, y + 1.45 + 0.6, y + 1.45 + 1.9]];
      if (k === 0) winF.push([-40.8, -39.4, y - 0.1, y + 2.25]);                                                      // the door of the stairwell
      else winF.push([-41.2, -39.8, y + 1.0, y + 2.0]);
      wallX(z0 + 0.15, y - 0.26, top - 0.26 + (k === n - 1 ? 0.3 : 0), winF); wallX(z1 - 0.15, y - 0.26, top - 0.26 + (k === n - 1 ? 0.3 : 0), winB);
      // the flight up from this floor: five steps along the west side, a landing, five steps back along the east side
      if (k < n - 1) {
        for (let i = 0; i < 5; i++) B.box(M.stone, 1.7, 0.24, 0.5, -41.1, y + 0.29 * (i + 1) - 0.24, oz0 + 0.25 + 0.5 * i, { c: 0x9a9690, solid: true });
        B.box(M.stone, 3.5, 0.24, oz1 - (oz0 + 2.5), -40.2, y + 1.45 - 0.24, (oz0 + 2.5 + oz1) / 2, { c: 0x9a9690, solid: true });
        for (let j = 0; j < 5; j++) B.box(M.stone, 1.7, 0.24, 0.5, -39.3, y + 1.45 + 0.29 * (j + 1) - 0.24, oz0 + 2.25 - 0.5 * j, { c: 0x9a9690, solid: true });
        B.box(M.plaster, 0.1, FH - 0.3, oz0 + 2.5 - oz0, -40.2, y, oz0 + 1.25, { c: IN, solid: true });                     // the wall between the two flights
        B.box(M.metal, 0.05, 0.9, 2.5, -40.2, y + 2.9 - 0.05, oz0 + 1.25, { c: 0x3a5a3a });                                // the handrail
        world.ladders.push({ stair: true, pts: [[-41.1, y, oz0 - 0.4], [-41.1, y + 1.45, oz0 + 2.9], [-39.3, y + 1.45, oz0 + 2.9], [-39.3, y + FH, oz0 - 0.4]], x: -39.3, z: oz0 - 0.4, nx: 0, nz: -1, y0: y, y1: y + FH });
      } else B.box(M.metal, 1.8, 1.0, 0.06, -41.1, y, oz0, { c: 0x3a5a3a, solid: true });                                   // the top landing: a rail over the stairs
      B.box(M.metal, 0.06, 1.0, oz1 - oz0, sx1 + 0.1, y, (oz0 + oz1) / 2, { c: 0x3a5a3a });
      // the flat: its door from the landing, a hall, a kitchen at the front, a living room at the back
      wallZ(sx1, z0 + 0.3, z1 - 0.3, y, top - 0.26, 75.3, 76.3);
      B.box(M.woodH, 0.06, 2.05, 0.95, sx1 + 0.12, y, 76.85, { c: [0x6a3a22, 0x8a6a4a, 0x5a2a1c, 0x7a5a3a, 0x4a3020][k] });   // its door, standing open against the wall
      wallX2(79.8, sx1, x1, y, top - 0.26, -36.3, -35.3); wallZ(-34.2, z0 + 0.3, 79.8, y, top - 0.26, 77.9, 78.8);
      for (const [lx, lz] of [[-36.3, 77.3], [-32.1, 77.3], [-34.2, 82.5]]) B.geo(M.glow, new THREE.SphereGeometry(0.13, 7, 5), [lx, top - 0.55, lz], [0, 0, 0], 1, 0xffe8b8);
      // the hall: coats on hooks, boots
      B.box(M.woodH, 0.1, 0.1, 1.2, sx1 + 0.12, y + 1.7, 77.6, { c: 0x5a3a24 }); B.box(M.cloth, 0.3, 1.0, 0.5, sx1 + 0.25, y + 0.75, 77.4, { c: [0x3a3a44, 0x5a4a3a, 0x4a2a2a][k % 3] });
      // the kitchen
      B.box(M.metal, 0.6, 0.85, 0.6, -30.7, y, 75.3, { c: 0xe8e4dc, solid: true }); B.box(M.flat, 0.56, 0.03, 0.56, -30.7, y + 0.85, 75.3, { c: 0x1c1c1e });
      B.box(M.woodH, 1.8, 0.85, 0.6, -32.4, y, 75.25, { c: [0x8a9a8a, 0xb8b0a0, 0x9aa8b8, 0xc8c0a8, 0x8a7a6a][k], solid: true }); B.box(M.metal, 0.6, 0.03, 0.45, -32.9, y + 0.85, 75.25, { c: 0xc8ccd0 });
      B.box(M.metal, 0.6, 1.5, 0.6, -30.7, y, 79.1, { c: 0xe8e8e2, solid: true });
      table(B, M, -32.4, y, 77.6, 0, { w: 1.0, d: 0.7, c: 0x6a4a30, top: [0x8ab0c8, 0xc8a8a0, 0xa8c8a0, 0xd8d0b0, 0xb8b8c8][k] });
      for (const s of [-1, 1]) B.box(M.woodH, 0.34, 0.45, 0.34, -32.4 + s * 0.8, y, 77.6, { c: 0x6a4a30 });
      B.cyl(M.metal, 0.12, 0.09, 0.3, -32.6, y + 0.8, 77.6, { c: 0xc9a23a, seg: 10 });
      // the living room, each different: a bed or a sofa, the wall carpet, the wardrobe, the radio or the television, books
      const rc = [0x7a2a26, 0x2a3a6a, 0x6a2a4a, 0x3a5a3a, 0x8a5a2a][k];
      B.box(M.cloth, 2.4, 1.4, 0.04, -33, y + 0.9, z1 - 0.33, { c: rc }); B.box(M.cloth, 1.8, 0.9, 0.05, -33, y + 1.15, z1 - 0.34, { c: 0xb8863a });
      if (k % 2 === 0) bed(B, M, -33, y, 84.3, PI / 2, { c: 0x3a3a3e, blanket: rc });
      else { B.box(M.woodH, 2.2, 0.45, 0.8, -33, y, 84.6, { c: 0x5a4a3a, solid: true }); B.box(M.cloth, 2.1, 0.12, 0.7, -33, y + 0.45, 84.6, { c: rc }); B.box(M.cloth, 2.1, 0.5, 0.15, -33, y + 0.57, 84.95, { c: rc }); }
      B.box(M.woodH, 1.2, 2.0, 0.55, -37.6, y, 84.7, { c: 0x4a3020, solid: true });
      B.box(M.woodH, 1.4, 0.75, 0.45, -30.6, y, 82.3, { ry: PI / 2, c: 0x5a3c26, solid: true });
      if (k % 2) { B.box(M.flat, 0.5, 0.42, 0.45, -30.6, y + 0.75, 82.3, { c: 0x3a2a1c }); B.box(M.glow, 0.02, 0.28, 0.36, -30.84, y + 0.82, 82.3, { c: 0x9ab8d8 }); }
      else { B.box(M.woodH, 0.5, 0.3, 0.22, -30.6, y + 0.75, 82.6, { c: 0x6a4a30 }); B.box(M.glow, 0.02, 0.06, 0.22, -30.73, y + 0.86, 82.6, { c: 0xffd9a0 }); }
      shelf(B, M, -37.8, y, 81.5, PI / 2, 1.6, 1.9, { c: 0x5a3c26 });
      rug(B, M, -34, y, 82.4, 0, { w: 3, d: 2.2, c: rc });
      if (k === 2 || k === 3) folk(k === 2 ? 'russianWoman' : 'russianMan', -35.6, 77.4, PI / 2, { y, pose: k === 2 ? 'work' : 'talk', over: { extras: k === 2 ? ['dress', 'apron'] : ['vest'] } });
    }
    roofed((x0 + x1) / 2, Y(n) - 0.12, (z0 + z1) / 2, x1 - x0, z1 - z0);
    B.box(M.flat, 2.6, 0.18, 1.5, -40.1, 2.5, z0 - 0.7, { c: 0x5a5c60 }); B.box(M.stone, 2.4, 0.3, 1.3, -40.1, -0.14, z0 - 0.7, { c: 0x8a8a8a, solid: true });
    sign('ПОДЪЕЗД 2', -40.1, 2.95, z0 - 0.02, 1.4, 0.3, { bg: '#2a4a6a', fg: '#f0f0e8' });
    extraFoes.push(['agent', -35, 75.3, { y: Y(2), static: true, yaw: PI }], ['militia', -31.2, 76.1, { y: Y(4), static: true, yaw: PI }], ['agent', -33, 82, { y: Y(3), patrol: false, static: true, yaw: PI }]);
    extraPicks.push([-32.4, 77.6, Y(1) + 0.8], [-33.6, 83, Y(4) + 0.5]);
  }

  // ---- the church of St Nicholas: still open, with its priest -----------------------------------------------------------
  // A parish church in the old Moscow manner: a white cube under five onion domes, blue with gold stars, a low refectory and a bell
  // tower with a tented roof to the west. Inside, the gilded screen of icons, candle stands, the chandelier; the priest, and two old
  // women at prayer.
  const CHURCH = { x: -86, z: 19 };
  {
    const { x, z } = CHURCH, F = world.height(x, z) + 0.3, WH = 0xf0ece2, BLUE = 0x2a4a8a, GOLD = 0xd8b040, GREEN = 0x4a7a5a;
    room(B, M, x, F, z, { w: 9, d: 9, h: 7, t: 0.5, mat: M.plaster, c: WH, base: 0.9, doors: [{ side: 'w', at: 0, w: 2.4, h: 3.2 }], wins: [-2.5, 2.5].flatMap((at) => [{ side: 'n', at, w: 0.9, y: 2.6, h: 2.2 }, { side: 's', at, w: 0.9, y: 2.6, h: 2.2 }]),
      floor: { mat: M.stone, c: 0x9a8c7a }, ceil: { mat: M.plaster, c: 0xe8dcc0 } });
    room(B, M, x - 7.25, F, z, { w: 5.5, d: 7, h: 4.5, t: 0.45, mat: M.plaster, c: WH, base: 0.9, doors: [{ side: 'w', at: 0, w: 1.5, h: 2.4 }, { side: 's', at: 0, w: 1.6, h: 2.5 }, { side: 'e', at: 0, w: 2.4, h: 3.2 }],
      wins: [{ side: 'n', at: 0, w: 0.9, y: 1.6, h: 1.6 }], floor: { mat: M.stone, c: 0x9a8c7a }, ceil: { mat: M.plaster, c: 0xe8dcc0 } });
    room(B, M, x - 11.75, F, z, { w: 3.5, d: 3.5, h: 8.5, t: 0.45, mat: M.plaster, c: WH, base: 0.9, doors: [{ side: 'w', at: 0, w: 1.4, h: 2.6 }, { side: 'e', at: 0, w: 1.4, h: 2.4 }], floor: { mat: M.stone, c: 0x9a8c7a }, ceil: { mat: M.plaster, c: 0xe8dcc0 } });
    B.box(M.stone, 2.6, 0.3, 2.2, x - 14.2, F - 0.45, z, { c: 0x8a8478, solid: true }); B.box(M.stone, 2.2, 0.3, 1.6, x - 7.25, F - 0.45, z + 4.2, { c: 0x8a8478, solid: true });
    // the roofs: the cube's four slopes in green, the refectory's, and the apse to the east
    const hip = (cx, cy, cz, w, d, h, c) => { const g = new THREE.ConeGeometry(1, h, 4); g.rotateY(PI / 4); B.geo(M.shingle, g, [cx, cy + h / 2, cz], [0, 0, 0], [w / 1.414, 1, d / 1.414], c); };
    hip(x, F + 7, z, 10, 10, 2.2, GREEN); hip(x - 7.25, F + 4.5, z, 6.3, 7.8, 1.6, GREEN);
    B.geo(M.plaster, new THREE.CylinderGeometry(2.8, 2.8, 5.2, 14, 1, false, 0, PI), [x + 4.5, F - 0.4 + 2.6, z], [0, 0, 0], 1, WH); world.addBox(x + 5.6, z, 2.4, 5.4, 0, F - 1, F + 5);
    B.geo(M.shingle, new THREE.SphereGeometry(2.9, 12, 6, 0, PI, 0, PI / 2), [x + 4.5, F + 4.8, z], [0, PI / 2, 0], [1, 0.6, 1], GREEN);
    // five domes: a drum on each, an onion of blue with gold stars (the middle one gilded), a gold cross on top
    const ONION = [[0.02, 0], [0.9, 0.05], [1.18, 0.55], [1.05, 1.15], [0.62, 1.75], [0.22, 2.25], [0.05, 2.75]].map(([r, y]) => new THREE.Vector2(r, y));
    const cross = (cx, cy, cz, s) => { B.box(M.metal, 0.08 * s, 1.5 * s, 0.08 * s, cx, cy, cz, { c: GOLD }); B.box(M.metal, 0.08 * s, 0.08 * s, 0.75 * s, cx, cy + 1.0 * s, cz, { c: GOLD }); B.box(M.metal, 0.08 * s, 0.08 * s, 0.4 * s, cx, cy + 1.3 * s, cz, { c: GOLD }); B.box(M.metal, 0.08 * s, 0.08 * s, 0.5 * s, cx, cy + 0.45 * s, cz, { rx: 0.4, c: GOLD }); };
    for (const [dx, dz, s, gold] of [[0, 0, 1.3, true], [-2.7, -2.7, 0.7, false], [2.7, -2.7, 0.7, false], [-2.7, 2.7, 0.7, false], [2.7, 2.7, 0.7, false]]) {
      const cx = x + dx, cz = z + dz, base = F + 7 + (gold ? 1.4 : 0.9), dh = gold ? 3 : 1.6;
      B.cyl(M.plaster, 1.25 * s, 1.25 * s, dh, cx, base - 0.6, cz, { c: WH, seg: 14 });
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; B.box(M.flat, 0.3 * s, dh * 0.5, 0.05, cx + Math.cos(a) * 1.24 * s, base - 0.3 + dh * 0.15, cz + Math.sin(a) * 1.24 * s, { ry: -a + PI / 2, c: 0x2a2a30 }); }
      const top = base - 0.6 + dh;
      B.geo(M.metal, new THREE.LatheGeometry(ONION, 14), [cx, top, cz], [0, 0, 0], s, gold ? GOLD : BLUE);
      if (!gold) for (let k = 0; k < 7; k++) { const a = k * 2.4, h = 0.5 + (k % 3) * 0.45; B.geo(M.metal, new THREE.SphereGeometry(0.06 * s, 5, 4), [cx + Math.cos(a) * (1.1 - Math.abs(h - 0.9) * 0.4) * s, top + h * s, cz + Math.sin(a) * (1.1 - Math.abs(h - 0.9) * 0.4) * s], [0, 0, 0], 1, GOLD); }
      cross(cx, top + 2.7 * s, cz, s * 1.1);
    }
    // the bell tower: an open belfry with its bells, a tall tented roof, a small dome and a cross
    { const tx = x - 11.75, ty = F + 8.5;
      B.box(M.stone, 3.7, 0.3, 3.7, tx, ty, z, { c: 0x9a9488, solid: true });
      for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) B.box(M.plaster, 0.55, 2.8, 0.55, tx + dx, ty + 0.3, z + dz, { c: WH, solid: true });
      B.box(M.plaster, 3.9, 0.5, 3.9, tx, ty + 3.1, z, { c: WH });
      for (const [dx, s] of [[0, 1.0], [-0.9, 0.55], [0.9, 0.55]]) B.geo(M.metal, new THREE.CylinderGeometry(0.22 * s, 0.55 * s, 0.8 * s, 12, 1, true), [tx + dx, ty + 2.4 - 0.4 * s, z], [0, 0, 0], 1, 0x8a6a2a);
      const g = new THREE.ConeGeometry(1, 4.6, 8); B.geo(M.shingle, g, [tx, ty + 3.6 + 2.3, z], [0, PI / 8, 0], [1.95, 1, 1.95], GREEN);
      B.geo(M.metal, new THREE.LatheGeometry(ONION, 12), [tx, ty + 8.1, z], [0, 0, 0], 0.45, GOLD); cross(tx, ty + 9.3, z, 0.6); }
    // inside: the screen of icons in gold, its open royal doors, icons in rows, the candle stands, the chandelier, the lectern
    { const ix = x + 3.6, H = 5.2;
      for (const [za, zb] of [[z - 4.2, z - 0.8], [z + 0.8, z + 4.2]]) B.box(M.metal, 0.25, H, zb - za, ix, F, (za + zb) / 2, { c: GOLD, solid: true });
      B.box(M.metal, 0.25, H - 3.2, 1.6, ix, F + 3.2, z, { c: GOLD, solid: true });
      for (const s of [-1, 1]) B.box(M.metal, 0.06, 2.6, 0.75, ix - 0.4, F, z + s * 1.15, { ry: s * 0.9, c: GOLD });
      const icon = (iz, iy, w, h, c) => { B.box(M.flat, 0.04, h, w, ix - 0.14, iy, iz, { c: 0x2a1c12 }); B.box(M.flat, 0.03, h - 0.1, w - 0.1, ix - 0.165, iy + 0.05, iz, { c }); B.geo(M.metal, new THREE.CircleGeometry(w * 0.22, 12), [ix - 0.19, iy + h * 0.7, iz], [0, -PI / 2, 0], 1, GOLD); B.box(M.flat, 0.02, h * 0.35, w * 0.32, ix - 0.185, iy + h * 0.18, iz, { c: [0x8a2a22, 0x2a3a6a, 0x3a5a3a][Math.round(iz * 3) % 3 < 0 ? 0 : Math.round(iz * 3) % 3] }); };
      for (const iz of [z - 3.3, z - 1.9, z + 1.9, z + 3.3]) icon(iz, F + 0.9, 1.1, 1.7, 0x6a4a2a);
      for (let k = 0; k < 7; k++) icon(z - 3.6 + k * 1.2, F + 3.3, 0.85, 1.0, 0x5a3a22);
      for (let k = 0; k < 5; k++) icon(z - 2.4 + k * 1.2, F + 4.35, 0.7, 0.75, 0x4a3020);
      B.geo(M.metal, new THREE.CircleGeometry(0.5, 16), [ix - 0.2, F + 4.75, z], [0, -PI / 2, 0], 1, 0xe8c860);
      for (const cz of [z - 2.6, z + 2.6]) { B.cyl(M.metal, 0.05, 0.08, 1.0, ix - 2.4, F, cz, { c: BRONZE, seg: 6 }); B.cyl(M.metal, 0.4, 0.4, 0.05, ix - 2.4, F + 1.0, cz, { c: BRONZE, seg: 14 }); world.addCyl(ix - 2.4, cz, 0.4, F, F + 1.1);
        for (let k = 0; k < 11; k++) { const a = k * 2.4, r = 0.08 + (k % 4) * 0.08; B.cyl(M.flat, 0.012, 0.012, 0.16 + (k % 3) * 0.05, ix - 2.4 + Math.cos(a) * r, F + 1.05, cz + Math.sin(a) * r, { c: 0xf0e8c8, seg: 4 }); B.geo(M.glow, new THREE.SphereGeometry(0.018, 4, 3), [ix - 2.4 + Math.cos(a) * r, F + 1.24 + (k % 3) * 0.05, cz + Math.sin(a) * r], [0, 0, 0], 1, 0xffc060); } }
      B.cyl(M.metal, 0.012, 0.012, 1.8, x, F + 5.2, z, { c: BRONZE, seg: 4 }); B.geo(M.metal, new THREE.TorusGeometry(1.3, 0.05, 5, 24), [x, F + 5.2, z], [PI / 2, 0, 0], 1, BRONZE);
      for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; B.geo(M.glow, new THREE.SphereGeometry(0.05, 5, 4), [x + Math.cos(a) * 1.3, F + 5.33, z + Math.sin(a) * 1.3], [0, 0, 0], 1, 0xffd890); }
      B.box(M.woodH, 0.5, 1.15, 0.5, ix - 3.4, F, z, { c: 0x5a3a24, solid: true }); B.box(M.cloth, 0.56, 0.06, 0.56, ix - 3.4, F + 1.15, z, { rz: 0.3, c: 0x8a1c22 });
      rug(B, M, x - 1, F, z, 0, { w: 6, d: 1.4, c: 0x8a1c22 });
      for (const [wz, s] of [[z - 4.22, 1], [z + 4.22, -1]]) for (const wx of [x - 2.6, x + 0.2]) { B.box(M.flat, 0.9, 1.3, 0.04, wx, F + 1.4, wz + s * 0.03, { c: 0x3a2414 }); B.box(M.flat, 0.78, 1.18, 0.03, wx, F + 1.46, wz + s * 0.05, { c: 0x7a5a2a }); B.geo(M.metal, new THREE.CircleGeometry(0.18, 10), [wx, F + 2.3, wz + s * 0.07], [0, s > 0 ? 0 : PI, 0], 1, GOLD); }
      folk('orthodoxPriest', ix - 1.0, z, -PI / 2, { y: F, pose: 'talk' });
      folk('russianWoman', x - 1.2, z - 1.4, PI / 2, { y: F, pose: 'pray', over: { extras: ['coat', 'shawl'], coat: 0x3a3a44, shawl: 0x6a5a4a, kerchief: 0xe8e0d0 } });
      folk('russianWoman', x - 2.4, z + 1.2, PI / 2 - 0.2, { y: F, pose: 'pray', over: { extras: ['dress', 'shawl'], shawl: 0x3a2a3a } });
      folk('russianWoman', x - 16, z - 2.4, PI / 2, { y: world.height(x - 16, z - 2.4), pose: 'stand', over: { extras: ['coat', 'shawl'], coat: 0x4a3a2a, shawl: 0x8a8a7a } });
      extraPicks.push([x - 7.25, z + 2.6, F + 0.5]);
    }
  }

  // ---- the rest of the city, beyond reach ------------------------------------------------------------
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * 6.283 + R() * 0.1, r = 135 + R() * 120, x = Math.cos(a) * r, z = Math.sin(a) * r - 10, h = 15 + Math.floor(R() * 4) * 6, along = R() < 0.5;
    B.box(FAC, along ? 40 + R() * 20 : 12, h, along ? 12 : 40 + R() * 20, x, -0.3, z, { ry: R() < 0.3 ? 0.4 : 0, c: [0xc8c8c4, 0xb8bcc0, 0xd0ccc4][i % 3] });
  }
  B.cyl(M.plaster, 1.2, 4, 150, -210, 0, -230, { c: 0x9a9c9c, seg: 10 }); B.cyl(M.metal, 0.3, 1.0, 60, -210, 150, -230, { c: 0xb83a2a, seg: 6 }); B.cyl(M.plaster, 6, 4, 8, -210, 96, -230, { c: 0x8a8c8c, seg: 12 });
  for (const [x, z, h] of [[190, -150, 60], [205, -138, 48], [-170, 190, 54]]) B.cyl(M.plaster, 2, 3.4, h, x, 0, z, { c: 0x8a5a4a, seg: 10 });

  root.add(makeAmbient(shared, { count: 1500, box: 34, boxY: 18, size: 0.05, colorA: 0xffffff, colorB: 0xdfeaff, alpha: 0.9, fall: 1.1, wind: [0.5, 0, 0.3], flutter: 0.8 }));

  const enemies = [
    ['agent', 3, 80, {}], ['dog', -2, 75, {}], ['militia', -5, 64, { patrol: true }], ['agent', 12.2, 61, {}],
    ['agent', -30, 61, {}], ['dog', -41, 54, {}], ['militia', -21, 52, {}],
    ['agent', 24, 51, { patrol: false }], ['militia', 34, 52.5, { patrol: false }], ['agent', 53, 66, {}], ['dog', 45, 60, {}],
    ['militia', -4.5, 28, {}], ['agent', 3.6, 21, {}], ['dog', 0, 18, {}],
    ['agent', -15, 5, { patrol: true }], ['agent', 16, -9, {}], ['militia', -21, -19, {}], ['militia', 29, 7, {}], ['dog', 9, -21, {}],
    ['agent', -58, -6, { up: 1.8, patrol: false }], ['agent', -74, -9, { up: 2.6, patrol: false, yaw: 1.57 }], ['agent', -75, 22, {}], ['dog', -64, 13, {}],
    ['militia', 78, -50, { patrol: false }], ['agent', 62, -42, {}],
    ['militia', -7, -36.5, {}], ['militia', 7, -36.5, {}], ['dog', 0, -30, {}],
    ['agent', -11, -51, { up: 1.9, patrol: false }], ['agent', 10, -54, { up: 1.9, patrol: false }], ['agent', -27, -49.5, { up: 1.9, patrol: false }],
    ['russiaBoss', 0, -47.5, { up: 1.9, yaw: 0, patrol: false }],
  ];
  const tea = merge([gCyl(0.07, 0.06, 0.2, 0xb8601c, [0, 0, 0], [0, 0, 0], 1, 9), gCyl(0.078, 0.07, 0.11, 0xc8ccd0, [0, -0.05, 0], [0, 0, 0], 1, 9), gCyl(0.012, 0.012, 0.1, 0xc8ccd0, [0.1, -0.02, 0], [0, 0, 0], 1, 5), gCyl(0.012, 0.012, 0.06, 0xc8ccd0, [0.085, 0.03, 0], [0, 0, 1.2], 1, 5)]);
  // below the metro the ground is cut away: the hall and the escalator shaft are 10 m down (the terrain mesh, seen from below, is
  // not drawn; the surface over them is carried by a slab, see above)
  { const base = world.height, H = [[METRO.sx0, METRO.x0, METRO.sz0, METRO.sz1], [METRO.x0, METRO.x1, METRO.z0, METRO.z1]], PIT = METRO.pit;
    world.height = (x, z) => { for (const [a, b, c, d] of H) if (x > a && x < b && z > c && z < d) return PIT; return base(x, z); }; }
  let st = 0;
  return {
    env: {
      sunDir: [-0.52, 0.2, 0.62], sunColor: 0xffc8a0, sunLight: 0xd6dcea, sunIntensity: 1.7, sunSize: 0.0006,
      skyTop: 0x5c6676, skyHorizon: 0xb8b4b2, skyGround: 0x6a6e76, haze: 0.75,
      fogColor: 0xa2a6ae, fogDensity: 0.0072, hemiSky: 0xc4d0e4, hemiGround: 0x8a8e98, hemiIntensity: 2.3, envIntensity: 0.8,
      cloudCover: 0.93, cloudScale: 0.3, cloudLit: 0xd8d4d0, cloudShade: 0x6a7080,
      bloom: 0.42, bloomRadius: 0.7, bloomThreshold: 1.2, rays: 0.12, rayThreshold: 2.4, exposure: 1.02,
      saturation: 0.84, contrast: 1.08, vignette: 0.42, tintHi: 0xf2f6ff, tintLo: 0xe0e8ff, shadowRange: 85,
    },
    spawn: { x: 0, z: 97, yaw: 0 },
    vista: { c: [0, 8, -6], r: 62, h: 18, a: 1.5, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[-12.6, 34.4], [34.5, 53], [-36, 57], [1, 12], [-55, -12, 0, 1.8], [82, -56, 0, 1], [-34, -57.6, 0, 1.9], [6.4, -57.4, 0, 1.9]].concat(extraPicks),
    dust: [0.86, 0.9, 0.94], water: [], heroLight: 40,
    makePickup: () => new THREE.Mesh(tea, M.flat),
    update(dt, t, g) {
      idle(people, t);
      st -= dt;
      if (st <= 0) {                                                      // smoke from the works' chimneys
        st = 0.22;
        for (const [x, y, z] of [[86, 36, -66], [94, 28, -64], [-99.4, 15.8, -27]]) g.gfx.soft.spawn(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), 2.2 + Math.random(), 2.2, 1.2, { life: 9 + Math.random() * 4, s0: 2.5, s1: 13, r: 0.42, g: 0.42, b: 0.45, a: 0.3, drag: 0.04 });
      }
    },
  };
}

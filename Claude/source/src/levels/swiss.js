// Chapter III - an alpine valley on the Lake of Uri, 1307.
import * as THREE from 'three';
import { Heightfield, prismGeo, rockGeo } from '../build.js';
import { makeAmbient, makeWater, windify } from '../gfx.js';
import { drawTexture } from '../tex.js';
import { makeHumanoid, lookFor } from '../actors.js';
import { instanced, fence, barrel, crate, room, steps, tuftGeo, pineGeo, gBox, gCyl, gCone, gSph, gCap, xf, merge, stand, boulder, beast, ladder, rod, horseGeo,
  local, table, bench, bed, chest, pots, sacks, rug, hearth, woodpile, cart, deck, person, idle, animal } from '../props.js';
import { fbm, ridged, smooth } from '../util.js';

export const swiss = {
  id: 'swiss', theme: 'theme-swiss', chapter: 'Chapter III', title: 'Uri', place: 'Lake of Uri · the Waldstätten · 1307',
  story: 'The Habsburg bailiff has set his hat on a pole and ordered free men to bow to it. You did not bow. Now his soldiers hold the village and the camp by the lake. Cross the valley, crossbow in hand, and end his rule.',
  weapon: 'crossbow',
  heroes: [
    { look: 'tell', name: 'Wilhelm Tell', who: 'The crossbowman of Bürglen, Uri', trait: 'Master shot', effect: 'reloads the crossbow 40% faster', mods: { reload: 0.6 }, sleeve: 0xcfc6ae, cuff: 0x6a5a40 },
    { look: 'winkelried', name: 'Arnold von Winkelried', who: 'Hero of Sempach, from Nidwalden', trait: 'Breaks the line', effect: 'starts with 150 health', mods: { hp: 150 }, sleeve: 0x8a8f96, cuff: 0x6a6f76 },
    { look: 'stauffacher', name: 'Werner Stauffacher', who: 'Man of Schwyz, of the Rütli oath', trait: 'Steadfast', effect: 'slowly recovers health out of danger', mods: { regen: 3 }, sleeve: 0x8a1c1c, cuff: 0x4a3020 },
  ], weaponName: 'Crossbow & halberd', alt: 'right mouse — aim   ·   F — halberd',
  keys: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move &nbsp; <kbd>Shift</kbd> run &nbsp; <kbd>Space</kbd> jump<br><kbd>Left mouse</kbd> shoot a bolt &nbsp; <kbd>Right mouse</kbd> aim &nbsp; <kbd>F</kbd> halberd thrust',
  foes: 'soldiers remain', foesNone: 'The valley is free', bossName: 'The Bailiff', bossDown: 'The bailiff has fallen', pickupText: 'Alp cheese  +35',
  deadTitle: 'Fallen', deadSub: 'The mountains will remember.', clearTitle: 'The valley is free',
  build,
};

function dPoly(pts, x, z) {
  let best = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}

function uriFlag(c, w, h) {
  c.fillStyle = '#f5c60c'; c.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.5, s = h / 100;
  c.fillStyle = '#111';
  for (const k of [-1, 1]) {                                     // horns, ears
    c.beginPath(); c.moveTo(cx + k * 13 * s, cy - 24 * s); c.bezierCurveTo(cx + k * 30 * s, cy - 26 * s, cx + k * 41 * s, cy - 33 * s, cx + k * 37 * s, cy - 46 * s);
    c.bezierCurveTo(cx + k * 34 * s, cy - 36 * s, cx + k * 27 * s, cy - 31 * s, cx + k * 14 * s, cy - 14 * s); c.fill();
    c.beginPath(); c.ellipse(cx + k * 27 * s, cy - 11 * s, 10 * s, 5 * s, k * 0.45, 0, 7); c.fill();
  }
  c.beginPath(); c.moveTo(cx - 20 * s, cy - 24 * s); c.quadraticCurveTo(cx, cy - 33 * s, cx + 20 * s, cy - 24 * s);
  c.bezierCurveTo(cx + 25 * s, cy - 4 * s, cx + 16 * s, cy + 12 * s, cx + 13 * s, cy + 25 * s); c.quadraticCurveTo(cx, cy + 35 * s, cx - 13 * s, cy + 25 * s);
  c.bezierCurveTo(cx - 16 * s, cy + 12 * s, cx - 25 * s, cy - 4 * s, cx - 20 * s, cy - 24 * s); c.fill();
  for (const k of [-1, 1]) {
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cx + k * 10 * s, cy - 8 * s, 5 * s, 3.4 * s, k * 0.3, 0, 7); c.fill();
    c.fillStyle = '#111'; c.beginPath(); c.arc(cx + k * 9.4 * s, cy - 8 * s, 1.8 * s, 0, 7); c.fill();
    c.fillStyle = '#f5c60c'; c.beginPath(); c.ellipse(cx + k * 5 * s, cy + 23 * s, 2.2 * s, 1.5 * s, 0, 0, 7); c.fill();
  }
  c.fillStyle = '#d81e1e'; c.beginPath(); c.ellipse(cx, cy + 37 * s, 4.2 * s, 7 * s, 0, 0, 7); c.fill();   // tongue
  c.strokeStyle = '#d81e1e'; c.lineWidth = 3.4 * s; c.beginPath(); c.arc(cx, cy + 27 * s, 10 * s, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();   // nose ring
}
const austriaFlag = (c, w, h) => { c.fillStyle = '#c81c1c'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4f0e6'; c.fillRect(0, h / 3, w, h / 3); };
const schwyzFlag = (c, w, h) => { c.fillStyle = '#d01c1c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(w * 0.72, h * 0.1, w * 0.06, h * 0.26); c.fillRect(w * 0.64, h * 0.19, w * 0.22, h * 0.08); };

function build({ game, gfx, world, B, M, root, rand, shared }) {
  const R = rand;
  const STREAM = [[96, 22], [62, 15], [36, 4], [14, -14], [0, -36], [-4, -60]];
  const PATH = [[-32, 60], [-22, 48], [-6, 34], [10, 18], [21, 1], [29, -11], [38, -20], [44, -30]];
  const LANE = [[70, 8], [72, -6], [69, -18], [68, -30]];        // the sunken lane east of the camp
  const SUONE = [[100.35, 23.9], [97.35, 30.6], [97.35, 50.3], [92, 64.5], [88, 67.4], [84, 68], [80, 66.8], [76, 66.5], [70, 67], [64, 67.5], [58, 67], [52, 66], [48, 65.5], [44, 63.3], [40, 59.8], [36, 57.5]];   // the line of the Suone, from the fall to the last plot
  const DELL = [[97, 60], [92.5, 53]];                           // a hollow in the meadow north of the fall: the Suone crosses it on trestles
  // ---- terrain: valley, lake basin, ring of mountains -------------------------------
  const hf = new Heightfield(1200, 400, (x, z) => {
    let base = 4.2 + (z + 50) * 0.07 + (fbm(x * 0.02, z * 0.02, 4, 2) - 0.5) * 4.5;
    const lake = smooth(-50, -76, z);
    base = base * (1 - lake) - 8 * lake;
    base -= (1 - smooth(1.5, 5.5, dPoly(STREAM, x, z))) * 1.4 * (1 - lake);
    base -= (1 - smooth(1.5, 6.5, dPoly(LANE, x, z))) * 1.3;
    base -= (1 - smooth(1.5, 6.5, dPoly(DELL, x, z))) * 1.9;
    base -= (1 - smooth(2.5, 6.5, Math.hypot(x - 101, z - 22.5))) * 0.8;                   // the basin the waterfall drops into
    const r = Math.hypot(x * 0.95, z < 0 ? z * 0.4 : z * 0.92);
    const m = smooth(124, 340, r);
    return base + m * (36 + ridged(x * 0.0042 + 3, z * 0.0042 + 7, 5, 4) * 340) + smooth(108, 168, r) * 16 * fbm(x * 0.02 + 7, z * 0.02, 3, 9);
  });
  world.height = (x, z) => hf.h(x, z);
  world.bounds = { r: 137, x: 6, z: 2 };
  world.maxSlope = 0.95; world.waterY = -0.9;
  const forest = (x, z) => fbm(x * 0.011 + 31, z * 0.011, 3, 5);
  const cG1 = new THREE.Color(0x587f36), cG2 = new THREE.Color(0x7c9c48), cF = new THREE.Color(0x36522a), cRock = new THREE.Color(0x85827c), cRock2 = new THREE.Color(0xa39d92),
    cSnow = new THREE.Color(0xf6f8fc), cShore = new THREE.Color(0xa59f8c), cPath = new THREE.Color(0x8a6f4c), tmp = new THREE.Color();
  root.add(hf.mesh(M.ground, (x, z, h, ny) => {
    const n = fbm(x * 0.03, z * 0.03, 3, 6);
    tmp.copy(cG1).lerp(cG2, n).lerp(cF, smooth(0.5, 0.62, forest(x, z)) * 0.6);
    tmp.lerp(cPath, Math.max((1 - smooth(0.8, 2.6, dPoly(PATH, x, z))) * 0.85, (1 - smooth(0.6, 2.6, dPoly(LANE, x, z))) * 0.7));
    tmp.lerp(cShore, 1 - smooth(0.3, 1.6, h));
    const steep = 1 - smooth(0.66, 0.84, ny), high = smooth(80, 125, h + (n - 0.5) * 40);
    tmp.lerp(tmp.clone().copy(cRock).lerp(cRock2, n), Math.max(steep, high));
    tmp.lerp(cSnow, smooth(112, 150, h + (n - 0.5) * 50) * (1 - steep * 0.45));
    return tmp;
  }));
  // ---- water: lake, stream, waterfall ----------------------------------------------------
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), makeWater(shared, { deep: 0x0b3946, scale: 0.35, flow: [0.12, 0.05], alpha: 0.9 }));
  lake.rotation.x = -Math.PI / 2; lake.position.y = 0; root.add(lake);
  {
    const P = [], pts = [];
    for (let i = 0; i < STREAM.length - 1; i++) for (let k = 0; k < 8; k++) { const t = k / 8; pts.push([STREAM[i][0] + (STREAM[i + 1][0] - STREAM[i][0]) * t, STREAM[i][1] + (STREAM[i + 1][1] - STREAM[i][1]) * t]); }
    pts.push(STREAM[STREAM.length - 1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), nx = -dz / l * 2.1, nz = dx / l * 2.1;
      const ya = Math.max(0.02, hf.h(ax, az) + 0.5), yb = Math.max(0.02, hf.h(bx, bz) + 0.5);
      P.push(ax - nx, ya, az - nz, ax + nx, ya, az + nz, bx + nx, yb, bz + nz, ax - nx, ya, az - nz, bx + nx, yb, bz + nz, bx - nx, yb, bz - nz);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    root.add(new THREE.Mesh(g, makeWater(shared, { deep: 0x1c5a60, scale: 2.2, flow: [-0.9, -0.7], alpha: 0.75 })));
  }
  const fallX = 97, fallZ = 22.5, poolY = hf.h(fallX, fallZ) + 0.9, topY = poolY + 34, ledgeY = poolY + 1.0;
  {
    for (let i = 0; i < 22; i++) { R(); R(); R(); R(); R(); R.pick([0, 0, 0]); }     // (the same draws as the old crag, so the rest of the valley stays where it was)
    // A crag built rock by rock around a grotto: the water leaps from an overhang, and a ledge runs behind it.
    const G = [0x7c7a76, 0x8c8880, 0x6e6c6a], crag = [], rock = (x, y, z, sx, sy, sz, ry = 0) => crag.push({ x, y: poolY + y, z: fallZ + z, ry, s: [sx, sy, sz], c: G[crag.length % 3] });
    for (const dz of [-13, -4.5, 4.5, 13]) rock(114.5, 3, dz, 5, 9, 5.6, dz > 0 ? 0 : Math.PI);           // the wall at the back of the grotto
    for (const k of [-1, 1]) rock(104.5, 3.5, k * 13.2, 6.5, 10, 4.5, k > 0 ? 0 : Math.PI);                // a buttress on each side
    for (const dz of [-6, 6]) rock(107.2, 10.6, dz, 5.6, 5.4, 8, dz > 0 ? 0 : Math.PI);                    // the overhang
    for (const dz of [-10, 0, 10]) rock(115, 12.5, dz, 6, 6, 7);
    for (const dz of [-9.5, -2, 6, 13.5]) rock(112, 18.5, dz, 6, 6, 6.5, 1);
    for (const dz of [-6.5, 3, 11]) rock(115, 25.5, dz, 5.5, 6, 6, 2);
    for (const k of [-1, 1]) { rock(108.5, 25, k * 7.2, 4.6, 8, 4.4, k); rock(117.5, 31.5, k * 5, 5, 5, 6, 3); }
    for (const dz of [-3.3, -1.4, 1.6, 3.4]) rock(101.5, 0.75, dz, 0.75, 0.55, 0.95, dz);                  // small rocks on the lip of the ledge
    root.add(instanced(rockGeo(9, 1), M.rock, crag, { solid: true }));
    B.box(M.rock, 6.6, 3, 15, 104.7, ledgeY - 3, fallZ, { c: 0x6a6866, solid: true });                     // the ledge behind the water
    for (const k of [-1, 1]) {
      steps(B, M, 101.4, fallZ + k * 5.7, -Math.PI / 2, ledgeY, 3, { w: 3.4, rise: 0.3, run: 0.65, mat: M.rock, c: 0x7c7a76 });
      world.addBox(104.2, fallZ + k * 12.7, 9.2, 9.6, 0, poolY - 3, poolY + 10);
    }
    world.addBox(111.6, fallZ, 7, 42, 0, poolY - 3, poolY + 12);
    const prof = [[110.5, 34], [108, 30], [106, 25.5], [103.8, 20], [102, 15.2], [100.7, 11.6], [100.4, 7.5], [100.3, 3.5], [100.3, -0.1]], n = prof.length - 1, Pp = [], U = [];
    for (let i = 0; i < n; i++) {
      const x0 = prof[i][0], y0 = poolY + prof[i][1], x1 = prof[i + 1][0], y1 = poolY + prof[i + 1][1], w0 = 1.9 + i / n * 1.5, w1 = 1.9 + (i + 1) / n * 1.5;
      Pp.push(x0, y0, fallZ - w0, x0, y0, fallZ + w0, x1, y1, fallZ + w1, x0, y0, fallZ - w0, x1, y1, fallZ + w1, x1, y1, fallZ - w1);
      U.push(0, i / n, 1, i / n, 1, (i + 1) / n, 0, i / n, 1, (i + 1) / n, 0, (i + 1) / n);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    const fall = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        float h(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){ float t = uTime*1.7; float a = n(vec2(vUv.x*16., vUv.y*5. - t*2.2))*0.6 + n(vec2(vUv.x*40., vUv.y*9. - t*3.4))*0.5;
          a = smoothstep(0.32, 0.9, a + 0.25); float edge = smoothstep(0., 0.22, vUv.x)*smoothstep(1., 0.78, vUv.x);
          gl_FragColor = vec4(mix(vec3(0.72,0.86,0.95), vec3(1.25), a), (0.4 + a*0.5)*edge); }`,
    }));
    fall.renderOrder = 3; root.add(fall);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 24), makeWater(shared, { deep: 0x1c5a60, scale: 2.4, flow: [-0.5, 0.2], alpha: 0.8 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(fallX + 0.5, poolY, fallZ); root.add(pool);
  }

  // ---- buildings --------------------------------------------------------------------------
  const frame = (x, z, ry) => { const c = Math.cos(ry), s = Math.sin(ry); return (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c]; };
  const LOG = 0x9a6a40, LOG2 = 0x8a6240;
  const extraFoes = [], extraPicks = [], people = [];            // enemies and pickups that belong to a place built below; everybody who takes no part in the fight
  const chalet = (x, z, ry, w = 8.5, d = 7.5, upper = false) => {  // upper: an outside stair climbs to the balcony, and the room under the roof can be walked into
    const P = frame(x, z, ry), yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, y = yf + 1.7, rh = 2.3, rw = w + 3.2, U = yf + 2.8, zr = d / 2 + (upper ? 2.0 : 1.35);
    // ground floor of stone: one room with a door under the balcony
    room(B, M, x, yf, z, { w: w + 0.3, d: d + 0.3, h: 2.6, t: 0.4, ry, mat: M.stone, c: 0xc4bdae, base: 2.6, doors: [{ side: 's', at: 0, w: 1.7, h: 2.1 }],
      wins: [{ side: 'w', at: -1.3, w: 1.1, y: 1.15, h: 0.85 }, { side: 'n', at: 0, w: 1.1, y: 1.15, h: 0.85 }].concat(upper ? [] : [{ side: 'e', at: 0, w: 1.1, y: 1.15, h: 0.85 }]), floor: { mat: M.woodH, c: 0x6a4a30 }, ceil: { mat: M.woodH, c: 0x5a3c26 } });
    steps(B, M, ...P(0, d / 2 + 0.15), ry, yf + 0.06, 6, { w: 2.0, c: 0xb0a898 });
    { const f = yf + 0.06;
      const [tx, tz] = P(-w * 0.2, -d * 0.1); B.box(M.woodH, 1.5, 0.74, 0.8, tx, f, tz, { ry, c: 0x7a5232, solid: true });
      for (const k of [-1, 1]) { const [bx, bz] = P(-w * 0.2, -d * 0.1 + k * 0.75); B.box(M.woodH, 1.4, 0.42, 0.28, bx, f, bz, { ry, c: 0x6a4428 }); }
      const [cx, cz] = P(-w * 0.2 + 0.3, -d * 0.1); B.cyl(M.flat, 0.2, 0.2, 0.12, cx, f + 0.74, cz, { c: 0xe8b838, seg: 12 });
      const [ox, oz] = P(w * 0.32, 0); B.box(M.stone, 0.95, 1.3, 0.95, ox, f, oz, { ry, c: 0xb0a898, solid: true }); B.box(M.stone, 0.7, 1.3, 0.7, ox, f + 1.3, oz, { ry, c: 0xb0a898 });
      const [ex, ez] = P(w / 2 - 0.95, -d / 2 + 1.35); B.box(M.woodH, 0.95, 0.5, 1.9, ex, f, ez, { ry, c: 0x5a4030, solid: true }); B.box(M.cloth, 0.9, 0.1, 1.55, ex, f + 0.5, ez, { ry, c: 0xb01c1c });
      const [hx, hz] = P(-w / 2 + 0.85, -d / 2 + 0.6); chest(B, M, hx, f, hz, ry, { c: 0x5a4030 });                                              // a chest for the linen, a cross in the corner over the table, jars by the door
      const [kx, kz] = P(-w * 0.2 - 0.9, -d / 2 + 0.24); B.box(M.wood, 0.05, 0.42, 0.04, kx, f + 1.5, kz, { ry, c: 0x2a1c12 }); B.box(M.wood, 0.26, 0.05, 0.04, kx, f + 1.76, kz, { ry, c: 0x2a1c12 });
      const [jx, jz] = P(-w / 2 + 0.8, d / 2 - 0.75); pots(B, M, jx, f, jz, { n: 3, s: 1.1, c: [0x8a6a4a, 0x6a5038, 0x9a7a52] }); }
    if (upper) {
      room(B, M, x, U, z, { w: w + 0.3, d: d + 0.3, h: 2.6, t: 0.3, ry, mat: M.woodH, c: LOG, base: 0, doors: [{ side: 's', at: 0, w: 1.5, h: 2.1 }],
        wins: [{ side: 's', at: -w * 0.27, w: 0.8, y: 0.6, h: 0.85 }, { side: 's', at: w * 0.27, w: 0.8, y: 0.6, h: 0.85 }, { side: 'n', at: 0, w: 1.0, y: 0.8, h: 0.85 }, { side: 'w', at: 0, w: 1.0, y: 0.8, h: 0.85 }], floor: false, ceil: { mat: M.woodH, c: 0x9a7a52 } });
      B.box(M.woodH, w - 0.3, 0.03, d - 0.3, x, U, z, { ry, c: 0xb08a5a });
      // the balcony runs past the corner of the house to a landing, and the stair comes up to it along the side wall
      const bw = w + 2.2, sx = w / 2 + 1.1, [bx, bz] = P(0.95, d / 2 + 1.1), rail = (lx, lz, len, along) => { const [qx, qz] = P(lx, lz); B.box(M.woodH, along ? 0.08 : len, 0.1, along ? len : 0.08, qx, U + 0.95, qz, { ry, c: LOG2 }); world.addBox(qx, qz, along ? 0.12 : len, along ? len : 0.12, ry, U, U + 1.0);
        for (let i = 0; i <= Math.round(len / 0.7); i++) { const t = -len / 2 + i * len / Math.round(len / 0.7), [px, pz] = along ? P(lx, lz + t) : P(lx + t, lz); B.box(M.wood, 0.07, 0.95, 0.05, px, U, pz, { ry, c: LOG2 }); } };
      B.box(M.woodH, bw, 0.2, 1.9, bx, U - 0.2, bz, { ry, c: LOG2, solid: true });
      rail(0.95, zr, bw, false); rail(-w / 2 - 0.1, d / 2 + 1.1, 1.9, true); rail(w / 2 + 2.0, d / 2 + 1.1, 1.9, true);
      let n = 7; while (n < 18 && U - n * 0.35 > world.height(...P(sx, d / 2 + 0.15 - (n + 0.5) * 0.45)) + 0.3) n++;
      steps(B, M, ...P(sx, d / 2 + 0.15), ry + Math.PI, U, n, { w: 1.8, rise: 0.35, run: 0.45, c: 0xb0a898 });
      { const [ax, az] = P(sx + 0.86, d / 2 + 0.15), [cx, cz] = P(sx + 0.86, d / 2 + 0.15 - n * 0.45); rod(B, M.wood, [ax, U + 0.95, az], [cx, U - n * 0.35 + 0.95, cz], 0.045, 0x8a6240); B.box(M.wood, 0.09, 1.1, 0.09, cx, U - n * 0.35 - 0.1, cz, { ry, c: LOG2 }); }
      { const [dx, dz] = P(-0.8, d / 2 + 0.62); B.box(M.woodH, 0.08, 2.05, 0.9, dx, U, dz, { ry, c: LOG2 }); }                                     // the door to the balcony, standing open
    } else B.box(M.woodH, w + 0.3, 2.9, d + 0.3, x, y + 0.9, z, { ry, c: LOG, solid: true });
    for (const s of [-1, 1]) { const [gx, gz] = P(0, s * (d / 2 + 0.05)); B.geo(M.woodH, prismGeo(w + 0.3, rh - 0.3, 0.25, 2), [gx, y + 3.8, gz], [0, ry, 0], 1, LOG); }
    { const [gx, gz] = P(0, upper ? 0.3 : 0); B.geo(M.shingle, prismGeo(rw, rh, d + (upper ? 3.6 : 3), 3), [gx, y + 3.8, gz], [0, ry, 0], 1, 0x7c7468); }
    const ang = Math.atan2(rh, rw / 2);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) for (const k of [0.3, 0.72]) {                // stones weighing down the roof
      const [sx, sz] = P(s * k * rw / 2, -d / 2 - 0.9 + i * (d + 1.8) / 3 + (k > 0.5 ? 0.9 : 0));
      B.geo(M.rock, rockGeo(i + 2, 0), [sx, y + 3.8 + rh * (1 - k) + 0.12, sz], [0, ry + i, s * -ang], [0.3, 0.16, 0.26], 0x9a968c);
    }
    // balcony with flowers across the front (+Z)
    if (!upper) { const [bx, bz] = P(0, d / 2 + 0.75); B.box(M.woodH, w + 0.3, 0.14, 1.3, bx, y + 0.9, bz, { ry, c: LOG2 }); const [rx, rz] = P(0, zr); B.box(M.woodH, w + 0.3, 0.1, 0.08, rx, y + 1.85, rz, { ry, c: LOG2 });
      for (let i = 0; i <= 12; i++) { const [px, pz] = P(-w / 2 - 0.1 + i * (w + 0.2) / 12, zr); B.box(M.wood, 0.07, 0.9, 0.05, px, y + 1.0, pz, { ry, c: LOG2 }); } }
    for (let i = 0; i < 16; i++) { const [fx, fz] = P(-w / 2 + 0.3 + i * (w - 0.6) / 15, zr + 0.07); B.geo(M.flat, new THREE.IcosahedronGeometry(0.13, 0), [fx, (upper ? U + 1.02 : y + 1.98) + (i % 2) * 0.04, fz], [i, i, 0], 1, i % 3 ? 0xd4202c : 0xf0607a); }
    for (const lx of [-w * 0.27, w * 0.27]) {
      const [wx, wz] = P(lx, d / 2 + 0.17);
      if (!upper) { B.box(M.flat, 1.0, 1.1, 0.06, wx, y + 1.55, wz, { ry, c: 0xf0ece0 }); B.box(M.flat, 0.78, 0.86, 0.08, wx, y + 1.67, wz, { ry, c: 0x1a232c }); }
      for (const s of [-1, 1]) { const [sx, sz] = P(lx + s * (upper ? 0.62 : 0.72), d / 2 + 0.18); B.box(M.woodH, 0.4, 1.1, 0.05, sx, upper ? U + 0.48 : y + 1.55, sz, { ry, c: 0x35582f }); }
    }
    { const [dx, dz] = P(-1.0, d / 2 + 0.75); B.box(M.woodH, 0.1, 2.0, 1.1, dx, yf, dz, { ry, c: LOG2 }); }   // door, standing open
    { const [cx, cz] = P(w * 0.32, 0); B.box(M.stone, 0.8, 1.6, 0.8, cx, y + 4.6, cz, { ry, c: 0xb0a898 }); }
    { const [sx, sz] = P(-w / 2 - 0.55, 0.5); B.box(M.wood, 0.9, 1.9, 2.0, sx, yf - 0.9, sz, { ry, c: 0xc8a878 }); }   // firewood
    return { P, f: yf + 0.06, U, w, d, ry };
  };
  let stadelN = 0;
  const stadel = (x, z, ry) => {                                 // barn on staddle stones, open to visit: hay, cheese or tools inside
    const P = frame(x, z, ry), y = world.height(x, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) { const [px, pz] = P(sx * 1.9, sz * 1.7); B.cyl(M.wood, 0.16, 0.2, 0.8, px, y - 0.1, pz, { c: LOG2, seg: 6 }); B.cyl(M.rock, 0.5, 0.5, 0.12, px, y + 0.7, pz, { c: 0x9a968c, seg: 8 }); }
    const kind = ['hay', 'cheese', 'hay', 'tools'][stadelN++ % 4], f = y + 0.88;
    room(B, M, x, y + 0.82, z, { w: 5, d: 4.6, h: 2.7, t: 0.25, ry, mat: M.woodH, c: LOG2, base: 0.12, doors: [{ side: 's', at: 0, w: 1.7, h: 2.0 }], floor: { mat: M.woodH, c: 0x7a5a3a }, ceil: { mat: M.woodH, c: 0x5a4028 } });
    steps(B, M, ...P(0, 2.3), ry, f, 3, { w: 1.8, rise: 0.3, run: 0.45, mat: M.woodH, c: 0x6a4c30 });
    if (kind === 'hay') for (const [lx, lz, ly] of [[-1.3, -1.4, 0], [0.3, -1.5, 0], [-0.5, -1.45, 0.8], [1.5, -0.2, 0]]) { const [hx, hz] = P(lx, lz); B.box(M.thatch, 1.5, 0.8, 0.9, hx, f + ly, hz, { ry: ry + (ly ? 0.2 : 0), c: 0xd8bc68, solid: true }); }
    else if (kind === 'cheese') { const [sx, sz] = P(0, -1.75); B.box(M.woodH, 4, 1.9, 0.5, sx, f, sz, { ry, c: 0x6a4c30, solid: true }); for (let i = 0; i < 8; i++) { const [cx, cz] = P(-1.6 + (i % 4) * 1.05, -1.5); B.cyl(M.flat, 0.24, 0.24, 0.14, cx, f + 0.75 + Math.floor(i / 4) * 0.62, cz, { c: 0xe8b838, seg: 12 }); } }
    else { const [bx, bz] = P(1.5, -1.3); barrel(B, M, bx, f, bz); const [wx, wz] = P(-0.4, -1.4); crate(B, M, wx, f, wz, 0.9, ry);
      for (let i = 0; i < 3; i++) { const [tx, tz] = P(-2.05, -1.4 + i * 0.6); B.box(M.wood, 0.05, 2.0, 0.05, tx, f, tz, { rz: 0.15, c: 0x6a4c30 }); B.box(M.metal, 0.04, 0.08, 0.5, tx, f + 1.9, tz, { c: 0xb8bcc2 }); } }
    B.geo(M.shingle, prismGeo(6.6, 1.5, 6, 3), [x, y + 3.52, z], [0, ry, 0], 1, 0x6e6a64);
    const [dx, dz] = P(-1.45, 2.8); B.box(M.woodH, 0.08, 1.9, 1.0, dx, y + 0.88, dz, { ry, c: 0x2a1c12 });          // the door stands open
  };
  chalet(-45, 51, 0.9); stadel(-37, 69, 0.3); stadel(2, 47, 1.2); stadel(18, 41, -0.4); stadel(-78, 35, 0.5);
  { // the house by the path: upstairs is the parlour, where a woman spins wool from the distaff; two beds, a chest, a table by the window
    const { P, U, w, d, ry } = chalet(-8, 39, -0.35, 9, 7.5, true), at = (lx, lz, fn) => fn(...P(lx, lz));
    at(-w / 2 + 0.85, -d / 2 + 1.4, (px, pz) => bed(B, M, px, U, pz, ry, { blanket: 0x3a4a6a })); at(w / 2 - 0.85, -d / 2 + 1.4, (px, pz) => bed(B, M, px, U, pz, ry, { blanket: 0x7a2a22 }));
    at(1.2, -d / 2 + 0.6, (px, pz) => chest(B, M, px, U, pz, ry, { w: 1.2 })); at(0, 0.2, (px, pz) => rug(B, M, px, U, pz, ry, { w: 2.6, d: 1.8, c: 0x6a3a2a, border: 0x3a2a22 }));
    at(w / 2 - 0.9, 1.3, (px, pz) => { const top = table(B, M, px, U, pz, ry + Math.PI / 2, { w: 1.5, d: 0.8 }); B.cyl(M.flat, 0.13, 0.09, 0.09, px, top, pz, { c: 0x8a6a4a, seg: 9 }); B.geo(M.flat, new THREE.SphereGeometry(0.1, 7, 5), [px + 0.1, top + 0.06, pz + 0.35], [0, 0, 0], [1, 0.7, 1], 0xb08a52); });
    at(w / 2 - 1.75, 1.3, (px, pz) => bench(B, M, px, U, pz, ry + Math.PI / 2, { w: 1.4 }));
    at(-w / 2 + 1.5, d / 2 - 1.3, (px, pz) => { bench(B, M, px, U, pz, ry, { w: 0.42, d: 0.42 }); people.push(person(B, M, root, 'swissWoman', px, U, pz, ry + 1.9, { pose: 'sit', seat: 0.45, arms: [-0.9, -0.55], over: { face: ['kerchief'], kerchief: 0xe6e0d0, dress: 0x4a5a34, pants: 0x4a5a34 } })); });
    at(-w / 2 + 2.15, d / 2 - 0.85, (px, pz) => { B.cyl(M.wood, 0.02, 0.025, 1.35, px, U, pz, { c: 0x6a4a2e, seg: 5 }); B.geo(M.cloth, new THREE.SphereGeometry(0.17, 8, 6), [px, U + 1.25, pz], [0, 0, 0], [1, 1.5, 1], 0xe8e2d2); B.cyl(M.wood, 0.14, 0.1, 0.1, px, U, pz, { c: 0x4a3420, seg: 8 }); });   // the distaff with its wool
    at(-w / 2 + 2.1, d / 2 - 1.75, (px, pz) => { B.cyl(M.flat, 0.24, 0.18, 0.24, px, U, pz, { c: 0x9a7a4a, seg: 10 }); B.geo(M.cloth, new THREE.SphereGeometry(0.2, 8, 5), [px, U + 0.24, pz], [0, 0, 0], [1, 0.5, 1], 0xe8e2d2); });                                                   // a basket of fleece
  }
  { // the house below it: the chamber under the roof has the beds of the family and what they put by for the winter
    const { P, U, w, d, ry } = chalet(11, 29, 0.95, 8, 7, true), at = (lx, lz, fn) => fn(...P(lx, lz));
    at(-w / 2 + 0.85, -d / 2 + 1.4, (px, pz) => bed(B, M, px, U, pz, ry, { blanket: 0x4a5a34 })); at(-w / 2 + 2.0, -d / 2 + 1.4, (px, pz) => bed(B, M, px, U, pz, ry, { blanket: 0x8a3a2a })); at(w / 2 - 0.8, -d / 2 + 1.25, (px, pz) => bed(B, M, px, U, pz, ry, { w: 0.8, l: 1.6, blanket: 0x3a4a6a }));
    at(w / 2 - 1.0, 0.6, (px, pz) => sacks(B, M, px, U, pz, ry + Math.PI / 2, { w: 1.6 })); at(w / 2 - 0.8, 2.3, (px, pz) => pots(B, M, px, U, pz, { n: 3, s: 1.3, c: [0x8a6a4a, 0x6a5038, 0x9a7a52] }));
    at(-w / 2 + 0.75, 1.6, (px, pz) => chest(B, M, px, U, pz, ry + Math.PI / 2, { w: 1.1 })); at(0.3, -0.4, (px, pz) => { rug(B, M, px, U, pz, ry, { w: 2.2, d: 1.5, c: 0x4a5a6a, border: 0x2a2a32 }); extraPicks.push([px, pz, U + 0.3]); });
    at(2.6, d / 2 + 1.0, (px, pz) => extraFoes.push(['crossbowman', px, pz, { y: U + 0.2, static: true, yaw: ry }]));
  }
  { // the alp above the village: in the herdsmen's hut the cheese is made, in a copper cauldron that swings over the fire on a wooden arm
    const { P, f, w, d, ry } = chalet(-86, 22, 1.2, 7.5, 6.5), at = (lx, lz, fn) => fn(...P(lx, lz));
    at(w / 2 - 1.35, d / 2 - 1.35, (px, pz) => { hearth(B, M, px, f, pz, { r: 0.5 }); B.cyl(M.metal, 0.5, 0.36, 0.55, px, f + 0.5, pz, { c: 0xb86a3a, seg: 14, open: true }); B.cyl(M.flat, 0.47, 0.47, 0.02, px, f + 0.98, pz, { c: 0xf0ead8, seg: 14 }); B.cyl(M.metal, 0.36, 0.36, 0.03, px, f + 0.5, pz, { c: 0x8a4a2a, seg: 14 });
      const [qx, qz] = P(w / 2 - 0.45, d / 2 - 0.45); B.box(M.wood, 0.14, 2.3, 0.14, qx, f, qz, { ry, c: 0x4a3420 }); rod(B, M.wood, [qx, f + 2.1, qz], [px, f + 2.1, pz], 0.05, 0x4a3420); rod(B, M.wood, [qx, f + 1.3, qz], [px, f + 2.05, pz], 0.04, 0x4a3420); rod(B, M.metal, [px, f + 2.1, pz], [px, f + 1.05, pz], 0.012, 0x2a2a2e); });
    at(-w / 2 + 0.75, d / 2 - 2.4, (px, pz) => { const top = table(B, M, px, f, pz, ry + Math.PI / 2, { w: 1.5, d: 0.7, h: 0.6, c: 0x6a4c30 });                                                    // the press: fresh cheeses under a board and a stone
      for (const k of [-0.4, 0.4]) { const [cx, cz] = P(-w / 2 + 0.75, d / 2 - 2.4 + k); B.cyl(M.flat, 0.24, 0.24, 0.16, cx, top, cz, { c: 0xf0e6c0, seg: 12 }); } B.box(M.woodH, 0.6, 0.05, 1.4, px, top + 0.16, pz, { ry, c: 0x7a5a3a }); B.geo(M.rock, rockGeo(5, 0), [px, top + 0.36, pz], [0, 1, 0], [0.3, 0.2, 0.28], 0x8a8882); });
    for (const [lx, lz, s] of [[1.2, 2.4, 1], [1.75, 2.55, 0.8], [-0.6, -d / 2 + 0.7, 1.15]]) at(lx, lz, (px, pz) => { B.cyl(M.wood, 0.17 * s, 0.14 * s, 0.34 * s, px, f, pz, { c: 0x9a7a52, seg: 10 }); B.cyl(M.flat, 0.15 * s, 0.15 * s, 0.02, px, f + 0.3 * s, pz, { c: 0xf4f0e6, seg: 10 }); });   // pails of milk
    at(w / 2 - 2.3, d / 2 - 1.35, (px, pz) => people.push(person(B, M, root, 'swissMan', px, f, pz, ry + Math.PI / 2, { pose: 'work', over: { hat: null, shirt: 0xcfc6ae } })));
    at(-2.6, d / 2 + 2.2, (px, pz) => { const py = world.height(px, pz); people.push(person(B, M, root, 'swissWoman', px, py, pz, ry + 0.5, { pose: 'carry', over: { face: ['plaits'], apron: 0xe6e0d0 } }));
      const [bx, bz] = P(-2.6 + Math.sin(0.5) * 0.42, d / 2 + 2.2 + Math.cos(0.5) * 0.42); B.cyl(M.wood, 0.16, 0.13, 0.3, bx, py + 0.78, bz, { c: 0x9a7a52, seg: 10 }); B.cyl(M.flat, 0.14, 0.14, 0.02, bx, py + 1.05, bz, { c: 0xf4f0e6, seg: 10 }); });
  }
  // chapel
  {
    const x = -44, z = 14, ry = 0.5, P = frame(x, z, ry), w = 5, d = 8, y = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05;
    room(B, M, x, y, z, { w, d, h: 3.6, t: 0.35, ry, mat: M.plaster, c: 0xf2efe6, base: 2.6, doors: [{ side: 's', at: 0, w: 1.7, h: 2.3 }],
      wins: [{ side: 'e', at: 0, w: 0.6, y: 1.2, h: 1.4 }, { side: 'w', at: 0, w: 0.6, y: 1.2, h: 1.4 }], floor: { mat: M.stone, c: 0xb8b0a0 }, ceil: { mat: M.woodH, c: 0x5c463a } });
    steps(B, M, ...P(0, d / 2), ry, y + 0.06, 6, { w: 2.0, c: 0xb0a898 });
    { const f = y + 0.06;
      const [ax, az] = P(0, -3.1); B.box(M.stone, 1.4, 1.0, 0.7, ax, f, az, { ry, c: 0xd8d0c0, solid: true }); B.box(M.cloth, 1.5, 0.04, 0.8, ax, f + 1.0, az, { ry, c: 0xf0ece0 });
      const [kx, kz] = P(0, -3.55); B.box(M.wood, 0.08, 1.1, 0.08, kx, f + 1.5, kz, { c: 0x3a2618 }); B.box(M.wood, 0.5, 0.08, 0.08, kx, f + 2.2, kz, { ry, c: 0x3a2618 });
      for (const sx of [-1, 1]) { const [qx, qz] = P(sx * 0.5, -3.1); B.cyl(M.flat, 0.03, 0.03, 0.25, qx, f + 1.02, qz, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.04, 5, 4), [qx, f + 1.33, qz], [0, 0, 0], [1, 1.6, 1], 0xffb040);
        for (const lz of [-0.7, 0.8]) { const [px, pz] = P(sx * 1.45, lz); B.box(M.woodH, 1.2, 0.45, 0.4, px, f, pz, { ry, c: 0x5a3c26, solid: true }); } } }
    B.geo(M.shingle, prismGeo(6, 3.6, 9, 3), [x, y + 3.6, z], [0, ry, 0], 1, 0x5c463a);
    const [tx, tz] = P(0, 3); B.box(M.plaster, 1.5, 2.2, 1.5, tx, y + 6.2, tz, { ry, c: 0xf2efe6 });
    B.geo(M.shingle, new THREE.ConeGeometry(1.35, 2.8, 4), [tx, y + 9.8, tz], [0, ry + Math.PI / 4, 0], 1, 0x5c463a);
    B.box(M.flat, 0.1, 1.0, 0.1, tx, y + 11.2, tz, { c: 0x2a2a2a }); B.box(M.flat, 0.55, 0.1, 0.1, tx, y + 11.75, tz, { ry, c: 0x2a2a2a });
    { const [dx, dz] = P(-1.0, 4.6); B.box(M.woodH, 0.1, 2.3, 1.2, dx, y, dz, { ry, c: 0x3a2618 }); }
    { // a woodshed leans against the back wall: the firewood for the winter, and behind its plank sides room to stand unseen
      const [sx, sz] = P(0, -5.15), g = world.height(sx, sz);
      for (const k of [-1, 1]) { const [px, pz] = P(k * 1.75, -6.25), [qx, qz] = P(k * 1.78, -5.15); B.box(M.wood, 0.14, 2.2, 0.14, px, g - 0.3, pz, { ry, c: 0x5a4028 }); B.box(M.woodH, 0.08, 2.0, 2.3, qx, g - 0.3, qz, { ry, c: 0xa8845a, solid: true }); }
      B.box(M.woodH, 4.0, 0.08, 2.7, sx, g + 2.0, sz, { ry, rx: -0.2, c: 0x5c463a });
      { const [wx, wz] = P(-0.5, -4.6); woodpile(B, M, wx, g - 0.1, wz, ry, { w: 2.2, h: 1.3, d: 0.8 }); const [cx, cz] = P(1.15, -5.0); B.cyl(M.wood, 0.28, 0.3, 0.5, cx, g - 0.1, cz, { c: 0x7a5a3a, seg: 9, solid: true }); B.box(M.wood, 0.04, 0.6, 0.04, cx, g + 0.4, cz, { rz: 0.5, c: 0x6a4a2e }); B.box(M.metal, 0.16, 0.1, 0.03, cx - 0.12, g + 0.42, cz, { c: 0x5a5e66 }); }
    }
  }
  // Habsburg watchtower on the eastern meadow
  {
    const x = 74, z = 34, ry = 0, P = frame(x, z, ry), w = 6, d = 6, y = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05;
    room(B, M, x, y, z, { w, d, h: 3.4, t: 0.6, ry, mat: M.stone, c: 0xb8b0a2, base: 3, doors: [{ side: 'w', at: 0, w: 1.7, h: 2.3 }],
      wins: [{ side: 'n', at: 0, w: 0.5, y: 1.2, h: 1.2 }, { side: 's', at: 0, w: 0.5, y: 1.2, h: 1.2 }, { side: 'e', at: 0, w: 0.5, y: 1.2, h: 1.2 }], floor: { mat: M.stone, c: 0x8a8478 }, ceil: { mat: M.woodH, c: 0x4a3626 } });
    steps(B, M, x - w / 2, z, -Math.PI / 2, y + 0.06, 6, { w: 2.0, c: 0xa8a294 });
    B.box(M.stone, w, 5.2, d, x, y + 3.6, z, { c: 0xb8b0a2, solid: true });
    // the fighting gallery under the roof: a long ladder leans against it on the north side, and from its parapet the whole east meadow lies open
    const G = y + 9.05;
    B.box(M.woodH, w + 1.6, 0.25, d + 1.6, x, y + 8.8, z, { c: 0x5a4028, solid: true });
    for (const [lx, lz, sw, sd] of [[0, 3.7, 7.6, 0.16], [3.7, 0, 0.16, 7.6], [-3.7, 0, 0.16, 7.6], [-2.2, -3.7, 3.2, 0.16], [2.2, -3.7, 3.2, 0.16]]) B.box(M.woodH, sw, 1.1, sd, x + lx, G, z + lz, { c: 0x6a4c30, solid: true });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [1, 0], [-1, 0]]) B.box(M.wood, 0.2, 2.45, 0.2, x + a * 3.68, G, z + b * 3.68, { c: 0x5a4028 });
    B.geo(M.shingle, new THREE.ConeGeometry(6.2, 3.6, 4), [x, G + 4.2, z], [0, Math.PI / 4, 0], 1, 0x5c463a);
    ladder(B, M, x, z - 3.8, 0, -1, world.height(x, z - 5), G, { lean: 0.12 });
    crate(B, M, x - 2.6, G, z + 2.6, 0.8, 0.4); barrel(B, M, x + 2.7, G, z - 2.6); extraPicks.push([x + 1.6, z + 1.8, G + 0.3]);
    for (const s of [-1, 1]) B.box(M.flat, 0.5, 1.0, 0.1, x + s * 1.6, y + 6.2, z + d / 2 + 0.03, { c: 0x0c1014 });
    B.box(M.cloth, 1.5, 0.5, 0.05, x, y + 7.3, z + d / 2 + 0.06, { c: 0xb01c1c }); B.box(M.cloth, 1.5, 0.5, 0.05, x, y + 6.8, z + d / 2 + 0.06, { c: 0xf0ece0 }); B.box(M.cloth, 1.5, 0.5, 0.05, x, y + 6.3, z + d / 2 + 0.06, { c: 0xb01c1c });
    barrel(B, M, x + 1.6, y + 0.06, z - 1.6); crate(B, M, x + 1.5, y + 0.06, z + 1.5, 0.8, 0.3);
    B.box(M.woodH, 1.6, 1.4, 0.14, x - 1.2, y + 0.9, z - 2.3, { c: 0x4a3626 }); for (let i = 0; i < 4; i++) B.box(M.metal, 0.03, 1.9, 0.03, x - 1.8 + i * 0.4, y + 0.06, z - 2.2, { rx: 0.12, c: 0xc8ccd0 });
  }
  { // the great hay barn: a cart can drive straight through
    const x = 26, z = 52, ry = 0.3, w = 9, d = 7, P = frame(x, z, ry);
    const yf = Math.max(world.height(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06;
    room(B, M, x, yf, z, { w, d, h: 3.6, t: 0.3, ry, mat: M.woodH, c: LOG2, base: 2.6, doors: [{ side: 'e', at: 0, w: 3, h: 3 }, { side: 'w', at: 0, w: 3, h: 3 }], wins: [{ side: 's', at: 0, w: 1.2, y: 2.0, h: 0.9 }],
      floor: { mat: M.ground, c: 0xb89a62 }, ceil: { mat: M.woodH, c: 0x5a4028 } });
    B.geo(M.shingle, prismGeo(d + 1.8, 2.8, w + 1.6, 3), [x, yf + 3.6, z], [0, ry + Math.PI / 2, 0], 1, 0x6e6a64);
    steps(B, M, ...P(w / 2, 0), ry + Math.PI / 2, f, 6, { w: 3.2, c: 0xb0a898 }); steps(B, M, ...P(-w / 2, 0), ry - Math.PI / 2, f, 6, { w: 3.2, c: 0xb0a898 });
    for (const [lx, lz, ly, r] of [[-3.3, -2.6, 0, 0], [3.3, 2.6, 0, 0.1], [1.8, 2.7, 0, 0], [-3.4, 2.5, 0, 0.2], [-3.2, 2.5, 1.5, 0.1], [-2.1, 2.45, 1.5, -0.2], [3.1, 2.4, 1.5, 0.3]]) { const [hx, hz] = P(lx, lz); B.box(M.thatch, 1.5, 0.8, 0.9, hx, f + ly, hz, { ry: ry + r, c: 0xd8bc68, solid: true }); }
    // a hay wagon stands in the drive (there is room to crawl under it), and over the south half a loft has been laid on posts: a ladder leads up to it, and under it one can only crouch
    { const [cx, cz] = P(0.2, -2.15), [lx, lz] = P(0, 1.9); cart(B, M, cx, f, cz, ry + Math.PI / 2, { l: 2.8, load: 'hay', shafts: false }); deck(B, M, lx, f, lz, ry, { w: 8.3, d: 2.6, h: 1.5, c: 0x8a6a44, ladder: 'n', at: -2.6 }); }
    { const [hx, hz] = P(0.7, 2.3); B.geo(M.thatch, new THREE.SphereGeometry(1, 8, 6), [hx, f + 1.5, hz], [0, ry, 0], [1.5, 0.5, 0.8], 0xd8bc68); }
    extraFoes.push(['halberdier', x, z, { up: 1.8, patrol: false }], ['crossbowman', 2, 47, { up: 1.7, patrol: false }], ['halberdier', 31, 46, {}]);
    extraPicks.push([18, 41, 0, 1.7]);
    extraFoes.push(['crossbowman', 105.2, fallZ + 1.5, { up: 1.2, patrol: false, yaw: -Math.PI / 2 }]); extraPicks.push([105.6, fallZ - 3.5, 0, 1.2]);   // behind the waterfall
  }
  // paddock with cows, fountain trough, hay
  fence(B, M, -22, 40, -22, 52, { c: 0x8a7458 }); fence(B, M, -22, 52, -8, 54, { c: 0x8a7458 }); fence(B, M, -8, 54, -4, 46, { c: 0x8a7458 }); fence(B, M, -22, 40, -14, 39, { c: 0x8a7458 });
  const cow = (c1, c2) => merge([gCap(0.44, 1.15, c1, [0, 1.12, 0], [Math.PI / 2, 0, 0], [1, 1, 1.1]), gSph(0.3, c2, [0.22, 1.3, 0.25], [1, 1, 1.5]), gSph(0.28, c2, [-0.25, 1.15, -0.5], [1, 1, 1.4]),
    gCap(0.19, 0.3, c1, [0, 1.2, 1.05], [1.3, 0, 0]), gBox(0.26, 0.2, 0.2, 0xe8c8b8, [0, 1.02, 1.36]), gCone(0.045, 0.2, 0xf0ece0, [0.17, 1.42, 1.05], [0, 0, -0.6]), gCone(0.045, 0.2, 0xf0ece0, [-0.17, 1.42, 1.05], [0, 0, 0.6]),
    ...[[0.24, 0.6], [-0.24, 0.6], [0.24, -0.6], [-0.24, -0.6]].flatMap(([x, z]) => [gCap(0.085, 0.6, c1, [x, 0.42, z]), gBox(0.14, 0.1, 0.16, 0x2a2018, [x, 0.05, z])]),
    gSph(0.17, 0xf0b8b8, [0, 0.72, -0.4]), gCap(0.03, 0.7, c1, [0, 0.95, -0.98], [0.15, 0, 0]), gCyl(0.07, 0.1, 0.13, 0xd9b23a, [0, 0.84, 0.9])]);
  for (const [x, z, ry, a, b] of [[-16, 46, 0.5, 0x7a4a2c, 0xf2ece0], [-11, 50, 2.6, 0xf2ece0, 0x3a2a20], [-18, 50.5, -1.2, 0x8a5a36, 0xf2ece0], [24, 22, 1.9, 0x7a4a2c, 0xf2ece0], [-28, 30, 0.2, 0x3a2a20, 0xf2ece0]]) {
    animal(B, M, root, 'cow', cow(a, b), x, world.height(x, z), z, ry, { coat: a, box: [1.0, 2.7, 1.55, 0.15] });
  }
  { const x = 1, z = 35, y = world.height(x, z); B.box(M.woodH, 3.2, 0.6, 0.9, x, y, z, { ry: 0.4, c: 0x5a4028, solid: true }); B.box(M.glow, 2.8, 0.02, 0.55, x, y + 0.6, z, { ry: 0.4, c: 0x1c4450 }); B.box(M.wood, 0.22, 1.5, 0.22, x - 1.6, y, z + 0.7, { c: 0x5a4028 }); }
  for (const [x, z] of [[-27, 44], [5, 23], [-2, 52]]) { const y = world.height(x, z); B.geo(M.thatch, new THREE.ConeGeometry(1.5, 2.6, 9), [x, y + 1.2, z], [0, 0, 0], 1, 0xd8bc68); B.box(M.wood, 0.1, 3.2, 0.1, x, y, z, { c: 0x5a4028 }); world.addCyl(x, z, 1.1, y - 1, y + 2.4); }
  // wooden bridge over the stream
  {
    const x = 25, z = -5.5, ry = 0.89, P = frame(x, z, ry), y = Math.max(world.height(...P(-5, 0)), world.height(...P(5, 0))) + 0.15;
    B.box(M.woodH, 11, 0.28, 3, x, y - 0.28, z, { ry, c: 0x7a5a3a, solid: true });
    for (const s of [-1, 1]) { const [rx, rz] = P(0, s * 1.4); B.box(M.woodH, 11, 0.1, 0.1, rx, y + 0.95, rz, { ry, c: 0x5a4028 }); world.addBox(rx, rz, 11, 0.2, ry, y - 1, y + 1.1);
      for (let i = 0; i <= 5; i++) { const [px, pz] = P(-5.4 + i * 2.16, s * 1.4); B.box(M.wood, 0.14, 1.9, 0.14, px, y - 0.9, pz, { ry, c: 0x5a4028 }); } }
  }

  let wheel = null;
  { // the mill on the stream: a breastshot wheel turns on its upstream gable, fed by a wooden channel on trestles that crosses the stream from a spring on the south bank.
    // On that bank the channel hangs so low that it can only be passed crouching.
    const x = 48.6, z = 13.2, ry = -0.4, w = 6.5, d = 5.5, P = frame(x, z, ry), yf = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06, at = (lx, lz, fn) => fn(...P(lx, lz));
    room(B, M, x, yf, z, { w, d, h: 3.2, t: 0.4, ry, mat: M.stone, c: 0xc4bdae, base: 2.6, doors: [{ side: 's', at: -1.0, w: 1.6, h: 2.1 }],
      wins: [{ side: 's', at: 1.7, w: 0.9, y: 1.1, h: 0.85 }, { side: 'w', at: 0, w: 0.9, y: 1.1, h: 0.85 }, { side: 'n', at: -1.5, w: 0.9, y: 1.1, h: 0.85 }], floor: { mat: M.woodH, c: 0x9a7a52 }, ceil: { mat: M.woodH, c: 0x9a7a52 } });
    B.geo(M.shingle, prismGeo(d + 1.8, 2.5, w + 1.4, 3), [x, yf + 3.4, z], [0, ry + Math.PI / 2, 0], 1, 0x6e6a64);
    at(-1.9, d / 2 + 0.6, (px, pz) => B.box(M.woodH, 0.1, 2.05, 1.1, px, yf, pz, { ry, c: 0x3a2618 }));                                                        // the door, standing open
    const FL = Math.max(...[-9, -10.5, -12, -13.5, -15, -16.5].map((lz) => world.height(...P(3.85, lz)))) + 1.25, AX = FL - 0.45, RW = 1.8, [wx, wz] = P(3.85, -1.9), WOOD = 0x6a4c30;
    { // the wheel: two rims, their spokes, sixteen floats; it turns (see update)
      const parts = [gCyl(0.16, 0.16, 1.7, 0x4a3420, [-0.35, 0, 0], [0, 0, Math.PI / 2], 1, 8)];
      for (const k of [-0.33, 0.33]) { parts.push(xf(new THREE.TorusGeometry(RW - 0.06, 0.06, 5, 22), [k, 0, 0], [0, Math.PI / 2, 0], 1, WOOD)); for (let i = 0; i < 4; i++) parts.push(gBox(0.07, 2 * RW - 0.14, 0.09, WOOD, [k, 0, 0], [i * Math.PI / 4, 0, 0])); }
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; parts.push(gBox(0.78, 0.4, 0.04, i % 2 ? 0x7a5a3a : 0x86643e, [0, Math.sin(a) * (RW - 0.2), Math.cos(a) * (RW - 0.2)], [Math.PI / 2 - a, 0, 0])); }
      wheel = new THREE.Mesh(merge(parts), M.flat); wheel.position.set(wx, AX, wz); wheel.rotation.order = 'YXZ'; wheel.rotation.y = ry; wheel.castShadow = true; root.add(wheel);
      world.addBox(wx, wz, 0.95, 2 * RW, ry, AX - RW - 1, AX + RW);
    }
    at(3.85, -10.15, (px, pz) => { B.box(M.woodH, 0.62, 0.07, 12.9, px, FL, pz, { ry, c: WOOD }); B.box(M.glow, 0.46, 0.03, 12.9, px, FL + 0.2, pz, { ry, c: 0x1c4450 }); world.addBox(px, pz, 0.7, 12.9, ry, FL, FL + 0.45); });
    for (const k of [-1, 1]) at(3.85 + k * 0.3, -10.15, (px, pz) => B.box(M.woodH, 0.06, 0.42, 12.9, px, FL, pz, { ry, c: 0x7a5a3a }));
    for (let lz = -4.6; lz > -17; lz -= 2.05) { at(3.85, lz, (px, pz) => B.box(M.wood, 1.3, 0.1, 0.1, px, FL - 0.1, pz, { ry, c: 0x4a3420 }));
      for (const k of [-1, 1]) at(3.85 + k * 0.5, lz, (px, pz) => { const g = world.height(px, pz); B.box(M.wood, 0.1, FL - g + 0.4, 0.1, px, g - 0.4, pz, { ry, c: 0x4a3420 }); }); }
    at(3.85, -3.72, (px, pz) => B.box(M.glow, 0.4, 1.1, 0.05, px, AX - 0.75, pz, { ry, c: 0x6a9ab0 }));                                                           // the water, falling on the floats
    at(3.85, -17.25, (px, pz) => { const g = world.height(px, pz); B.box(M.stone, 1.5, 1.1, 1.3, px, g - 0.3, pz, { ry, c: 0xa8a294, solid: true }); B.box(M.glow, 1.1, 0.02, 0.9, px, g + 0.8, pz, { ry, c: 0x1c4450 });   // the spring, caught in a stone basin
      B.geo(M.rock, rockGeo(7, 1), [px + 0.9, g + 0.5, pz - 1.3], [0, 0.8, 0], [1.5, 1.4, 1.2], 0x8c8880); world.addCyl(px + 0.9, pz - 1.3, 1.1, g - 1, g + 1.5); rod(B, M.wood, [px + 0.5, g + 1.25, pz - 0.75], [px, FL + 0.3, pz + 0.55], 0.07, 0x4a3420); });
    // inside: the shaft and its gear, the two stones on their frame with the hopper over them, the flour chest, sacks of grain and of meal
    at(2.5, -1.9, (px, pz) => { B.geo(M.wood, new THREE.CylinderGeometry(0.66, 0.66, 0.12, 14), [px, AX, pz], [0, ry, Math.PI / 2], 1, 0x5a4028); B.geo(M.wood, new THREE.CylinderGeometry(0.12, 0.12, 1.0, 8), [px + Math.cos(ry) * 0.3, AX, pz - Math.sin(ry) * 0.3], [0, ry, Math.PI / 2], 1, 0x4a3420); });
    at(1.35, -1.35, (px, pz) => { B.box(M.woodH, 1.9, 1.0, 1.9, px, f, pz, { ry, c: 0x6a4c30, solid: true }); B.cyl(M.stone, 0.64, 0.64, 0.22, px, f + 1.0, pz, { c: 0x9a968c, seg: 14 }); B.cyl(M.stone, 0.62, 0.62, 0.24, px, f + 1.24, pz, { c: 0xb4b0a4, seg: 14 });
      B.geo(M.woodH, new THREE.ConeGeometry(0.55, 0.6, 4), [px, f + 2.1, pz], [Math.PI, ry + Math.PI / 4, 0], 1, 0x7a5a3a); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(1.35 + a * 0.5, -1.35 + b * 0.5, (qx, qz) => B.box(M.wood, 0.06, 1.3, 0.06, qx, f + 1.0, qz, { ry, c: 0x4a3420 })); });
    at(1.35, 0.1, (px, pz) => { chest(B, M, px, f, pz, ry, { w: 1.1, h: 0.7, c: 0x7a5a3a }); B.box(M.cloth, 0.95, 0.03, 0.42, px, f + 0.7, pz, { ry, c: 0xf0ead8 }); });
    at(-1.9, -1.5, (px, pz) => sacks(B, M, px, f, pz, ry, { w: 1.6 })); at(2.1, 1.45, (px, pz) => sacks(B, M, px, f, pz, ry + Math.PI / 2, { w: 1.4, c: 0xe2dccb })); at(-2.4, 0.4, (px, pz) => barrel(B, M, px, f, pz));
    at(-2.4, 4.6, (px, pz) => { const py = world.height(px, pz), yaw = ry + 2.3; people.push(person(B, M, root, 'swissWoman', px, py, pz, yaw, { pose: 'carry', over: { face: ['kerchief'], kerchief: 0xd8cdb0, dress: 0x5a3a4a, pants: 0x5a3a4a, apron: 0xc8c0a8 } }));
      B.geo(M.cloth, new THREE.CapsuleGeometry(0.17, 0.34, 3, 8), [px + Math.sin(yaw) * 0.4, py + 1.0, pz + Math.cos(yaw) * 0.4], [0, yaw, Math.PI / 2], 1, 0xb8a47c); });   // the miller's wife, a sack of grain in her arms
    at(2.5, 6.5, (px, pz) => extraFoes.push(['halberdier', px, pz, {}]));
  }
  // ---- the lake landing: jetty, boat, warehouse ----------------------------------------------
  { // the jetty and the Nauen moored to it: the flat-bottomed boat that carries the goods of the Gotthard road down the lake. It can be boarded.
    const jx = -16, bx = jx + 2.65, bz = -65.5, F = 0.55, HULL = 0x3a2a1c, DECK = 0x8a6a48;
    B.box(M.woodH, 2.6, 0.16, 12.5, jx, 0.84, -63.75, { c: 0x7a5a3a, solid: true });
    for (let i = 0; i < 6; i++) for (const k of [-1, 1]) B.box(M.wood, 0.16, 3.5, 0.16, jx + k * 1.18, -2.5, -57.7 - i * 2.4, { c: 0x5a4028 });
    for (const [px, pz] of [[jx - 1.35, -69.8], [jx + 1.35, -69.8], [jx - 1.35, -64]]) B.cyl(M.wood, 0.11, 0.13, 3.4, px, -1.6, pz, { c: 0x4a3420, seg: 7 });      // mooring posts
    B.box(M.woodH, 2.9, 0.95, 7, bx, -0.45, bz, { c: HULL }); B.box(M.woodH, 2.66, 0.05, 6.96, bx, F - 0.05, bz, { c: DECK }); world.addBox(bx, bz, 2.9, 7, 0, -2, F);
    B.box(M.woodH, 2.05, 0.95, 2.05, bx, -0.45, bz - 3.5, { ry: Math.PI / 4, c: HULL }); B.box(M.woodH, 1.88, 0.05, 1.88, bx, F - 0.05, bz - 3.5, { ry: Math.PI / 4, c: DECK }); world.addBox(bx, bz - 3.5, 2.05, 2.05, Math.PI / 4, -2, F);
    for (const [lx, lz, len] of [[1.39, 0, 7], [-1.39, -1.25, 4.5], [-1.39, 3.05, 0.9]]) B.box(M.woodH, 0.12, 0.5, len, bx + lx, F, bz + lz, { c: HULL, solid: true });   // the sides, open where the boat lies against the jetty
    B.box(M.woodH, 2.9, 0.5, 0.12, bx, F, bz + 3.44, { c: HULL, solid: true });
    for (const k of [-1, 1]) B.box(M.woodH, 2.1, 0.7, 0.12, bx + k * 0.725, F, bz - 4.225, { ry: -k * Math.PI / 4, c: HULL, solid: true });
    B.box(M.wood, 0.14, 1.3, 0.14, bx, F, bz - 4.9, { c: HULL });
    B.cyl(M.wood, 0.09, 0.12, 6.2, bx, F, bz - 0.9, { c: 0x6a4a2e, seg: 7, solid: true }); B.box(M.woodH, 0.5, 0.2, 0.5, bx, F, bz - 0.9, { c: 0x5a4028 });                    // mast, yard and the furled sail
    B.box(M.wood, 4.4, 0.1, 0.1, bx, F + 5.5, bz - 0.9, { c: 0x6a4a2e }); B.geo(M.cloth, new THREE.CylinderGeometry(0.2, 0.2, 4.0, 8), [bx, F + 5.28, bz - 0.9], [0, 0, Math.PI / 2], 1, 0xe2dccb);
    rod(B, M.flat, [bx, F + 6.1, bz - 0.9], [bx, F + 1.3, bz - 4.9], 0.02, 0x2a2018); rod(B, M.flat, [bx, F + 6.1, bz - 0.9], [bx, F + 0.5, bz + 3.44], 0.02, 0x2a2018);
    rod(B, M.wood, [bx + 1.0, F + 1.25, bz + 2.9], [bx + 1.25, -0.7, bz + 4.7], 0.05, 0x6a4a2e); B.box(M.wood, 0.06, 1.1, 0.4, bx + 1.27, -1.3, bz + 4.75, { rx: 0.25, c: 0x6a4a2e });   // the steering oar
    for (const k of [0, 1]) rod(B, M.wood, [bx + 1.15 - k * 0.14, F + 0.1 + k * 0.08, bz - 2.9], [bx + 1.15 - k * 0.14, F + 0.1 + k * 0.08, bz + 2.6], 0.04, 0x8a6a44);          // the long sweeps, shipped
    rod(B, M.flat, [bx - 1.39, F + 0.5, bz - 2.6], [jx + 1.35, 1.6, -69.8], 0.02, 0xb8a070);
    barrel(B, M, bx + 0.85, F, bz + 2.85); barrel(B, M, bx + 0.1, F, bz + 2.95); crate(B, M, bx + 0.75, F, bz - 1.9, 0.8, 0.2); sacks(B, M, bx - 0.2, F, bz - 2.9, 0, { w: 1.5 });
    extraPicks.push([bx - 0.5, bz + 0.4, 1]);
    // on the shore: nets hung up to dry, and a fishing skiff turned keel up
    for (const [x, z, ry] of [[-22.5, -56.2, 0.15], [-27, -55.8, -0.1]]) { const y = world.height(x, z), P = frame(x, z, ry);
      for (const k of [-1, 1]) { const [px, pz] = P(k * 1.6, 0); B.box(M.wood, 0.1, 2.3, 0.1, px, y - 0.4, pz, { c: 0x5a4028 }); }
      B.box(M.wood, 3.4, 0.08, 0.08, x, y + 1.8, z, { ry, c: 0x5a4028 }); B.box(M.flat, 3.1, 1.45, 0.02, x, y + 0.33, z, { ry, c: 0x4a4638 });
      for (let i = 0; i < 6; i++) { const [px, pz] = P(-1.4 + i * 0.56, 0.03); B.geo(M.flat, new THREE.SphereGeometry(0.06, 6, 4), [px, y + 0.4, pz], [0, 0, 0], 1, 0xb08a52); }
      world.addBox(x, z, 3.3, 0.2, ry, y - 1, y + 1.8); }
    { const x = -9.5, z = -56.6, y = world.height(x, z); B.geo(M.woodH, new THREE.SphereGeometry(1, 10, 6, 0, 6.2832, 0, 1.5708), [x, y - 0.1, z], [0, 1.2, 0], [0.75, 0.7, 2.3], 0x4a3626); B.box(M.wood, 0.08, 0.08, 4.5, x, y + 0.56, z, { ry: 1.2, c: 0x2a2018 }); world.addBox(x, z, 1.3, 4.2, 1.2, y - 1, y + 0.55); }
  }
  { // the Sust: the warehouse, open toward the lake, where bales, casks and jars wait for the boat or for the pack animals; two mules stand tethered beside it
    const x = -22, z = -44.5, ry = Math.PI, w = 11, d = 6.5, P = frame(x, z, ry), yf = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(...P(a * w / 2, b * d / 2)))) + 0.05, f = yf + 0.06, at = (lx, lz, fn) => fn(...P(lx, lz));
    room(B, M, x, yf, z, { w, d, h: 3.3, t: 0.45, ry, mat: M.stone, c: 0xbcb4a4, base: 2.6, doors: [{ side: 's', at: 0, w: 9.8, h: 3.3 }], wins: [{ side: 'n', at: -3, w: 0.7, y: 1.4, h: 0.8 }, { side: 'n', at: 3, w: 0.7, y: 1.4, h: 0.8 }],
      floor: { mat: M.stone, c: 0x9a9284 }, ceil: { mat: M.woodH, c: 0x8a6a48 } });
    B.geo(M.shingle, prismGeo(d + 2.2, 2.6, w + 1.6, 3), [x, yf + 3.5, z], [0, ry + Math.PI / 2, 0], 1, 0x6e6a64);
    steps(B, M, ...P(0, d / 2), ry, f, 2, { w: 9.8, rise: 0.3, run: 0.5, c: 0xa8a294 });
    for (const lx of [-3.3, 3.3]) at(lx, d / 2 - 0.25, (px, pz) => { B.box(M.wood, 0.3, 3.3, 0.3, px, yf, pz, { c: 0x5a4028 }); world.addCyl(px, pz, 0.2, yf, yf + 3.3); });
    const bale = (lx, lz, yy, turn, c) => at(lx, lz, (px, pz) => { B.box(M.cloth, 1.0, 0.55, 0.7, px, yy, pz, { ry: ry + turn, c }); for (const k of [-0.28, 0.28]) B.box(M.flat, 0.05, 0.57, 0.72, px + Math.cos(ry + turn) * k, yy, pz - Math.sin(ry + turn) * k, { ry: ry + turn, c: 0x4a3a2a }); });
    for (const [lx, lz, yy, turn, c] of [[-4.3, -2.2, 0, 0, 0xcfc6ae], [-3.2, -2.25, 0, 0.05, 0xb8a47c], [-2.1, -2.2, 0, -0.04, 0xcfc6ae], [-3.75, -2.2, 0.55, 0.03, 0x9a7a52], [-2.65, -2.2, 0.55, -0.06, 0xcfc6ae], [-3.2, -2.2, 1.1, 0.08, 0xb8a47c]]) bale(lx, lz, f + yy, turn, c);
    at(-3.2, -2.2, (px, pz) => world.addBox(px, pz, 3.3, 0.8, ry, f, f + 1.1));
    for (const lx of [-0.9, -0.1, 0.7]) at(lx, -2.3, (px, pz) => barrel(B, M, px, f, pz)); at(-0.5, -1.55, (px, pz) => barrel(B, M, px, f, pz, 0x7a5a3a));
    at(1.9, -2.2, (px, pz) => crate(B, M, px, f, pz, 0.9, ry + 0.1)); at(2.85, -2.3, (px, pz) => crate(B, M, px, f, pz, 0.7, ry - 0.2)); at(1.95, -2.2, (px, pz) => crate(B, M, px, f + 0.9, pz, 0.6, ry + 0.5));
    at(4.1, -1.9, (px, pz) => { pots(B, M, px, f, pz, { n: 3, s: 2, c: [0xb0683c, 0x9a5a34, 0xa86a42], solid: false }); world.addCyl(px, pz, 0.95, f, f + 1.1); }); at(4.2, 0.9, (px, pz) => sacks(B, M, px, f, pz, ry + Math.PI / 2, { w: 1.8 }));
    at(-4.2, 1.0, (px, pz) => { const top = table(B, M, px, f, pz, ry + Math.PI / 2, { w: 1.5, d: 0.75, c: 0x6a4c30 });                                       // the keeper's table with the scales
      B.box(M.metal, 0.03, 0.5, 0.03, px, top, pz, { c: 0x5a5e66 }); B.box(M.metal, 0.03, 0.03, 0.6, px, top + 0.5, pz, { ry, c: 0x5a5e66 }); for (const k of [-0.28, 0.28]) B.cyl(M.metal, 0.1, 0.07, 0.03, px, top + 0.18, pz + k, { c: 0xb8923a, seg: 10 }); });
    // the mules, packed for the road up the valley
    for (const [mz, coat] of [[-42.9, 0x6a5e52], [-46.3, 0x7a6248]]) {             // the packs are part of the mule: they go where it goes
      const mx = -13.3, y = world.height(mx, mz), k = 1 / 0.85;
      const geo = merge([horseGeo(coat, 0x2a2018), ...[-1, 1].map((q) => gBox(0.3 * k, 0.45 * k, 0.7 * k, q > 0 ? 0xb8a47c : 0xcfc6ae, [q * 0.42 * k, (1.0 + 0.225) * k, -0.05 * k])), gBox(1.0 * k, 0.06 * k, 0.8 * k, 0x7a3a2a, [0, 1.45 * k, -0.05 * k])]);
      animal(B, M, root, 'mule', geo, mx, y, mz, -Math.PI / 2, { s: 0.85, coat, box: [1.05, 2.8, 1.7, 0.1] });
    }
    B.box(M.wood, 0.1, 0.1, 6.2, -14.9, world.height(-14.9, -44.6) + 1.05, -44.6, { c: 0x5a4028 }); for (const pz of [-47.5, -44.6, -41.7]) B.box(M.wood, 0.14, 1.4, 0.14, -14.9, world.height(-14.9, pz) - 0.25, pz, { c: 0x5a4028 });
    world.addBox(-14.9, -44.6, 0.2, 6.2, 0, world.height(-14.9, -44.6) - 1, world.height(-14.9, -44.6) + 1.15);
    at(-3.2, 1.2, (px, pz) => people.push(person(B, M, root, 'swissMan', px, f, pz, ry - Math.PI / 2, { pose: 'talk', over: { hat: 'felt', hatC: 0x4a3a2a, shirt: 0x6a5a40 } })));
    { const px = -15.2, pz = -51.2, py = world.height(px, pz); people.push(person(B, M, root, 'swissWoman', px, py, pz, 2.5, { pose: 'carry', over: { face: ['kerchief'], kerchief: 0x8a3a2a, dress: 0x3a4a6a, pants: 0x3a4a6a } }));
      B.cyl(M.flat, 0.22, 0.16, 0.2, px + Math.sin(2.5) * 0.42, py + 0.8, pz + Math.cos(2.5) * 0.42, { c: 0x9a7a4a, seg: 10 }); B.geo(M.flat, new THREE.SphereGeometry(0.19, 8, 5), [px + Math.sin(2.5) * 0.42, py + 1.0, pz + Math.cos(2.5) * 0.42], [0, 0, 0], [1, 0.45, 1], 0xd8cdb0); }
    { const px = -17.1, pz = -61.5; people.push(person(B, M, root, 'swissMan', px, 1.0, pz, 1.6, { pose: 'hips', over: { hat: null, shirt: 0x5a6a4a } })); }                         // the boatman, on the jetty
    { const px = -24.4, pz = -54.9, py = world.height(px, pz); people.push(person(B, M, root, 'swissWoman', px, py, pz, 2.9, { pose: 'work', over: { face: ['plaits'], dress: 0x6a4a2a, pants: 0x6a4a2a } })); }   // a woman mending the nets
    extraFoes.push(['halberdier', -21, -52.5, {}], ['crossbowman', -10.5, -54.5, {}]);
  }
  { // a slab of rock that runs out into the lake west of the landing: rock steps lead up from the shore, and from its top the whole bay can be watched
    const x = -34, z = -60.5, T = 5.4, G = [0x8c8880, 0x767470, 0x9a968c];
    B.box(M.rock, 7, T + 4, 6, x, -4, z, { c: G[0], solid: true }); B.box(M.ground, 6.4, 0.05, 5.4, x, T, z, { c: 0x6a7a44 });
    steps(B, M, x - 0.8, z + 3, 0, T, 7, { w: 2.6, rise: 0.4, run: 0.6, mat: M.rock, c: G[1] });
    for (const [lx, yy, lz, sx, sy, sz, r] of [[-3.0, 2.7, -0.4, 2.4, 3.3, 4.3, 0.4], [3.0, 2.6, 0.4, 2.4, 3.4, 4.3, 2.1], [0.2, 2.6, -2.6, 4.7, 3.4, 2.3, 1.3], [2.5, 2.8, 2.7, 2.3, 3.1, 2.1, 3.3], [-3.2, 2.7, 2.7, 1.5, 3.2, 2.0, 0.9], [-4.4, 0.4, -2.9, 2.4, 2.2, 2.6, 2.6], [4.5, 0.3, -2.6, 2.5, 2.0, 2.7, 4.1], [4.3, 1.2, 3.6, 1.8, 1.8, 1.6, 5.0]])
      B.geo(M.rock, rockGeo(Math.round(sx * 7), 1), [x + lx, yy, z + lz], [0, r, 0], [sx, sy, sz], G[Math.round(r * 3) % 3]);
    for (const [lx, lz, s] of [[-2.2, -1.9, 1.0], [1.6, -2.1, 0.8], [2.4, 0.6, 0.9]]) { B.geo(M.rock, rockGeo(Math.round(s * 9), 1), [x + lx, T + s * 0.3, z + lz], [0, lx, 0], [s * 1.1, s * 0.95, s * 0.8], G[2]); world.addBox(x + lx, z + lz, s * 1.7, s * 1.2, -lx, T - 0.2, T + s * 0.95); }
  }
  { // the Rütli: a quiet meadow above the lake, where a spring rises under a boulder. Three men of the three valleys have met here and swear to stand together.
    const x = -70, z = -44, y = world.height(x, z);
    B.geo(M.rock, rockGeo(11, 1), [x - 2.6, y + 0.9, z - 1.2], [0, 0.7, 0], [2.3, 2.0, 1.9], 0x8c8880); world.addCyl(x - 2.6, z - 1.2, 1.75, y - 1, y + 2.2);
    B.geo(M.ground, rockGeo(8, 2), [x - 2.6, y + 2.1, z - 1.2], [0, 0.3, 0], [1.5, 0.3, 1.3], 0x6a7a44);
    B.cyl(M.rock, 0.95, 1.05, 0.22, x - 0.75, world.height(x - 0.75, z - 0.5) - 0.06, z - 0.5, { c: 0x7a7872, seg: 9 }); B.cyl(M.glow, 0.78, 0.78, 0.02, x - 0.75, world.height(x - 0.75, z - 0.5) + 0.15, z - 0.5, { c: 0x1c4450, seg: 12 });
    const men = [[{ hair: 0xd8d4c8, face: ['longbeard'], hat: 'cowl', hatC: 0x5a4632, shirt: 0x6a5a40, pants: 0x4a4030 }, 0.97], [{ hair: 0x5a3a1c, face: ['beard'], hat: 'felt', hatC: 0x3a4a2a, shirt: 0xcfc6ae, pants: 0x5a4a34 }, 1.03], [{ hair: 0xb8904a, face: [], hat: null, shirt: 0x8a7a5a, pants: 0x3a3a34 }, 1]];
    men.forEach(([over, scale], i) => { const a = 0.5 + i * 2.094, px = x + 2.3 + Math.sin(a) * 0.72, pz = z + 1.2 + Math.cos(a) * 0.72;
      people.push(person(B, M, root, 'swissMan', px, world.height(px, pz), pz, a + Math.PI, { over: { ...over, scale }, pose: (f) => { f.armR.rotation.x = -2.55; f.armR.rotation.z = -0.12; f.armL.rotation.x = -1.0; f.armL.rotation.z = -0.25; } })); });
    extraPicks.push([x + 0.4, z - 2.4, y + 0.5]);
  }

  // ---- the Austrian camp ---------------------------------------------------------------------
  const palisade = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 0.44);
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t + (R() - 0.5) * 0.08, z = z0 + (z1 - z0) * t + (R() - 0.5) * 0.08, y = world.height(x, z), h = 2.9 + R() * 0.5;
      B.cyl(M.wood, 0.2, 0.22, h, x, y - 0.3, z, { c: R.pick([0x7a5a3a, 0x6a4c30, 0x86643e]), seg: 6 }); B.geo(M.wood, new THREE.ConeGeometry(0.2, 0.5, 6), [x, y + h - 0.05, z], [0, 0, 0], 1, 0x8a6a44); }
    world.addBox((x0 + x1) / 2, (z0 + z1) / 2, len, 0.5, Math.atan2(-(z1 - z0), x1 - x0), -5, world.height((x0 + x1) / 2, (z0 + z1) / 2) + 3);
  };
  palisade(30, -17, 40.5, -17); palisade(47.5, -17, 62, -17); palisade(30, -17, 30, -37.2); palisade(30, -38.8, 30, -46); palisade(62, -17, 62, -34);
  { // a gap in the west palisade: three stakes have been sawn off above the knee and hang from a rail, so whoever crouches slips into the camp unseen
    const x = 30, z = -38, y = world.height(x, z);
    for (const dz of [-0.42, 0, 0.42]) B.cyl(M.wood, 0.2, 0.22, 1.9, x, y + 1.3, z + dz, { c: 0x6a4c30, seg: 6 });
    B.box(M.wood, 0.12, 0.2, 2.6, x + 0.26, y + 2.1, z, { c: 0x4a3420 }); B.box(M.wood, 0.12, 0.2, 2.6, x + 0.26, y + 2.8, z, { c: 0x4a3420 });
    world.addBox(x, z, 0.5, 1.7, 0, y + 1.25, y + 3.3);
    for (const [dx, dz, s] of [[-1.3, 1.2, 0.9], [-1.6, -1.1, 0.7], [1.2, 1.4, 0.6]]) B.geo(M.ground, rockGeo(4, 2), [x + dx, world.height(x + dx, z + dz) + 0.05, z + dz], [0, dz, 0], [s, s * 0.4, s], 0x7a6248);   // the earth that was dug out
    for (const dz of [-0.5, 0.1, 0.55]) B.cyl(M.wood, 0.19, 0.2, 1.2, x - 0.9, world.height(x - 0.9, z - 2.3) - 0.42, z + dz - 2.3, { rx: Math.PI / 2, ry: 0.3, c: 0x7a5a3a, seg: 6 });   // the sawn-off ends, thrown aside
    woodpile(B, M, x + 2.2, world.height(x + 2.2, z), z, Math.PI / 2, { w: 2.4, h: 1.5, d: 1.0 });                                                                                 // seen from the camp, a stack of firewood hides the gap
  }
  const tent = (x, z, s = 1, top = 0xb81c1c) => {
    const y = world.height(x, z);
    B.geo(M.cloth, new THREE.ConeGeometry(2.3 * s, 3.1 * s, 8), [x, y + 1.5 * s, z], [0, R() * 3, 0], 1, 0xf0e8d8);
    B.geo(M.cloth, new THREE.ConeGeometry(1.0 * s, 1.36 * s, 8), [x, y + 2.42 * s, z], [0, 0, 0], 1.02, top);
    B.box(M.wood, 0.07, 1.0 * s, 0.07, x, y + 3.0 * s, z, { c: 0x4a3222 }); B.box(M.cloth, 0.5, 0.25, 0.02, x + 0.27, y + 3.7 * s, z, { c: top });
    world.addCyl(x, z, 1.8 * s, y - 1, y + 2.6 * s);
  };
  tent(35, -33); tent(55, -23); tent(36.5, -41, 0.9);
  { // one soldiers' tent stands open toward the fire: a ridge tent with four straw pallets, a place to wait until a patrol has passed
    const x = 36, z = -24, ry = 1.99, y = world.height(x, z);
    const P = room(B, M, x, y, z, { w: 3.6, d: 4.4, h: 2.2, t: 0.08, ry, mat: M.cloth, c: 0xf0e8d8, base: 0.8, doors: [{ side: 's', at: 0, w: 3.3, h: 2.2 }], floor: false, ceil: { mat: M.cloth, c: 0xe6dece } });
    B.geo(M.cloth, prismGeo(3.9, 1.3, 4.7, 2), [x, y + 2.2, z], [0, ry, 0], 1, 0xf0e8d8); B.box(M.cloth, 0.7, 0.05, 4.74, x, y + 3.47, z, { ry, c: 0xb81c1c });
    for (const lz of [-2.3, 2.3]) { const [px, pz] = P(0, lz); B.box(M.wood, 0.08, 3.9, 0.08, px, y - 0.2, pz, { ry, c: 0x4a3222 }); }
    for (const [lx, lz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 0.95], [1.3, 0.95]]) { const [px, pz] = P(lx, lz); bed(B, M, px, world.height(px, pz) - 0.04, pz, ry, { w: 0.8, l: 1.9, h: 0.3, c: 0xb89a62, blanket: lx * lz > 0 ? 0x6a5a40 : 0x5a3a2a, pillow: 0xb8a47c, head: 0 }); }
    { const [px, pz] = P(0, -1.75), cy = world.height(px, pz); chest(B, M, px, cy, pz, ry, { w: 0.9 }); B.geo(M.metal, new THREE.SphereGeometry(0.2, 10, 6, 0, 6.283, 0, 1.6), [px, cy + 0.6, pz], [0, 0, 0], [1, 0.8, 1], 0x8a8f96); B.cyl(M.metal, 0.3, 0.3, 0.02, px, cy + 0.6, pz, { c: 0x8a8f96, seg: 12 }); }
  }
  let pavTop = 0;
  { // the bailiff's pavilion: a round tent that can be walked into, with his bed, his strongbox, his table and his armour
    const x = 52, z = -34, N = 12, R0 = 3.3, a0 = 2.43, yF = Math.max(...Array.from({ length: 8 }, (_, i) => world.height(x + Math.cos(i * 0.785) * R0, z + Math.sin(i * 0.785) * R0))) + 0.05, P = local(x, z, -0.86);
    pavTop = yF + 5.1;
    B.cyl(M.woodH, 3.42, 3.42, 1.5, x, yF - 1.5, z, { c: 0x6a4c30, seg: 24 }); for (let i = 0; i < 4; i++) world.addBox(x, z, 6.6, 2.75, i * Math.PI / 4, yF - 2, yF);
    B.cyl(M.cloth, 2.7, 2.7, 0.02, x, yF, z, { c: 0x3a2a22, seg: 20 }); B.cyl(M.cloth, 2.45, 2.45, 0.03, x, yF, z, { c: 0x7a1c22, seg: 20 });
    for (let i = 1; i < N; i++) { const a = a0 + i * 6.2832 / N; B.box(M.cloth, 1.76, 3.2, 0.06, x + Math.cos(a) * R0, yF - 0.9, z + Math.sin(a) * R0, { ry: -a + Math.PI / 2, c: i % 2 ? 0xf0e8d8 : 0xb81c1c, solid: true }); }
    for (const k of [-1, 1]) { const a = a0 + k * 0.27; B.box(M.cloth, 0.34, 2.3, 0.12, x + Math.cos(a) * (R0 + 0.06), yF, z + Math.sin(a) * (R0 + 0.06), { ry: -a + Math.PI / 2, c: 0xb81c1c }); }   // the door flaps, tied back
    B.geo(M.cloth, new THREE.ConeGeometry(3.9, 2.8, 14), [x, yF + 3.7, z], [0, 0, 0], 1, 0xb81c1c);
    B.geo(M.metal, new THREE.SphereGeometry(0.22, 8, 6), [x, yF + 5.2, z], [0, 0, 0], 1, 0xd9b23a);
    B.cyl(M.wood, 0.07, 0.08, 4.2, x, yF, z, { c: 0x4a3222, seg: 6, solid: true });
    { const [px, pz] = P(0.3, -2.25); bed(B, M, px, yF, pz, -0.86 + Math.PI / 2, { w: 1.1, l: 2.0, h: 0.55, c: 0x4a3020, blanket: 0x7a1010, head: 0.6 }); B.box(M.cloth, 0.9, 0.06, 1.0, px, yF + 0.6, pz, { ry: -0.86 + Math.PI / 2, c: 0x8a7458 }); }
    { const [px, pz] = P(-2.1, -1.0); chest(B, M, px, yF, pz, -0.86 + 1.1, { w: 1.1, h: 0.7, c: 0x4a3020, band: 0xb8923a }); }
    { const [px, pz] = P(2.05, 0.2), [gx, gz] = P(2.0, 0.7), [cx, cz] = P(2.2, -0.25), [sx, sz] = P(1.15, 0.2), top = table(B, M, px, yF, pz, -0.86 + Math.PI / 2, { w: 1.4, d: 0.8, c: 0x5a3c26 });
      B.box(M.cloth, 0.7, 0.012, 0.5, px, top, pz, { ry: -0.5, c: 0xd8cdb0 }); B.cyl(M.metal, 0.05, 0.035, 0.16, gx, top, gz, { c: 0xc9a23a, seg: 8 });                      // a parchment, a goblet, a candle
      B.cyl(M.flat, 0.025, 0.025, 0.2, cx, top, cz, { c: 0xe8e0c8, seg: 5 }); B.geo(M.glow, new THREE.SphereGeometry(0.035, 5, 4), [cx, top + 0.25, cz], [0, 0, 0], [1, 1.6, 1], 0xffb040);
      bench(B, M, sx, yF, sz, 0, { w: 0.42, d: 0.42 }); }
    { const [px, pz] = P(-2.0, 1.1), ar = -0.86 + 1.9;                                                    // his mail and surcoat on a stand, the helm on top
      B.box(M.wood, 0.08, 1.6, 0.08, px, yF, pz, { c: 0x4a3222 }); B.box(M.wood, 0.9, 0.07, 0.07, px, yF + 1.35, pz, { ry: ar, c: 0x4a3222 }); B.box(M.cloth, 0.62, 0.95, 0.2, px, yF + 0.5, pz, { ry: ar, c: 0x7a1010 });
      B.box(M.metal, 0.66, 0.3, 0.22, px, yF + 1.16, pz, { ry: ar, c: 0x8a8f96 }); B.geo(M.metal, new THREE.SphereGeometry(0.15, 10, 8), [px, yF + 1.74, pz], [0, 0, 0], [1, 1.15, 1], 0x9a9fa6); world.addCyl(px, pz, 0.35, yF, yF + 1.8); }
    { const [px, pz] = P(-0.7, -0.6); extraPicks.push([px, pz, yF + 0.3]); }
  }
  // campfire, racks, supplies
  const fire = { x: 45, z: -28, y: world.height(45, -28) };
  for (let i = 0; i < 5; i++) B.cyl(M.wood, 0.09, 0.1, 1.1, fire.x, fire.y + 0.1, fire.z, { rz: 1.2, ry: i * 1.25, c: 0x2a1a10, seg: 5 });
  for (let i = 0; i < 9; i++) B.geo(M.rock, rockGeo(i, 0), [fire.x + Math.cos(i * 0.7) * 0.75, fire.y + 0.08, fire.z + Math.sin(i * 0.7) * 0.75], [0, i, 0], 0.2, 0x8a8880);
  B.geo(M.glow, new THREE.ConeGeometry(0.28, 0.7, 6), [fire.x, fire.y + 0.5, fire.z], [0, 0, 0], 1, 0xff7a20);
  const fl = new THREE.PointLight(0xff8a3a, 40, 16, 1.8); fl.position.set(fire.x, fire.y + 1.1, fire.z); root.add(fl);
  for (const [x, z] of [[41, -19.5], [42, -20], [58, -30], [58.6, -31]]) barrel(B, M, x, world.height(x, z), z);
  crate(B, M, 33, world.height(33, -20), -20, 0.9, 0.3); crate(B, M, 33.2, world.height(33, -21.2), -21.2, 0.7, 0.9); crate(B, M, 57, world.height(57, -40), -40, 1.0, 0.2);
  { const x = 40, z = -36, y = world.height(x, z); B.box(M.wood, 2.4, 0.1, 0.1, x, y + 1.5, z, { c: 0x5a4028 }); for (const s of [-1, 1]) B.box(M.wood, 0.1, 1.6, 0.1, x + s * 1.2, y, z, { c: 0x5a4028 });
    for (let i = 0; i < 4; i++) { B.cyl(M.wood, 0.025, 0.025, 2.6, x - 0.9 + i * 0.6, y + 1.2, z + 0.25, { rx: -0.18, c: 0x6a4a2a, seg: 5 }); B.box(M.metal, 0.02, 0.34, 0.24, x - 0.9 + i * 0.6, y + 2.25, z + 0.48, { c: 0xc9ced6 }); } world.addBox(x, z, 2.6, 0.6, 0, y - 1, y + 1.6); }
  // the hat on the pole
  { const x = 44, z = -21.5, y = world.height(x, z); B.cyl(M.wood, 0.07, 0.09, 4.6, x, y - 0.2, z, { c: 0x5a4028, seg: 6, solid: true });
    B.cyl(M.flat, 0.36, 0.38, 0.04, x, y + 4.4, z, { c: 0x2a4a2a, seg: 12 }); B.geo(M.flat, new THREE.ConeGeometry(0.24, 0.42, 10), [x, y + 4.63, z], [0, 0, 0.15], 1, 0x2a4a2a);
    B.box(M.flat2, 0.03, 0.6, 0.12, x - 0.2, y + 4.7, z, { rz: 0.5, c: 0xf0f0f0 }); B.box(M.stone, 1.1, 0.4, 1.1, x, y - 0.1, z, { c: 0xa8a294 }); }
  // stone keep under construction ("Zwing Uri"): the ground floor is the masons' store, and three ladders on the scaffold of the north face lead to the top
  let keepTop = 0;
  {
    const x = 67, z = -47, yf = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => world.height(x + a * 3.5, z + b * 3.5))) + 0.05, f = yf + 0.06, T = keepTop = yf + 10, zs = z + 4.5;
    room(B, M, x, yf, z, { w: 7, d: 7, h: 3.4, t: 1, mat: M.stone, c: 0xb5ad9c, base: 3, doors: [{ side: 'w', at: 0, w: 1.6, h: 2.3 }],
      wins: [{ side: 's', at: 0, w: 0.4, y: 1.2, h: 1.2 }, { side: 'e', at: 0, w: 0.4, y: 1.2, h: 1.2 }], floor: { mat: M.stone, c: 0x8a8478 }, ceil: { mat: M.woodH, c: 0x4a3626 } });
    steps(B, M, x - 3.5, z, -Math.PI / 2, f, 3, { w: 2.2, rise: 0.3, c: 0xa8a294 });
    B.box(M.stone, 7, T - yf - 3.6, 7, x, yf + 3.6, z, { c: 0xb5ad9c, solid: true });
    for (let i = 1; i < 12; i++) { const a = i % 3, s = Math.floor(i / 3); const off = (a - 1) * 2.7; const p = s === 0 ? [x + off, z + 3.2] : s === 1 ? [x + off, z - 3.2] : s === 2 ? [x + 3.2, z + off] : [x - 3.2, z + off]; B.box(M.stone, s < 2 ? 1.5 : 0.6, 1.0, s < 2 ? 0.6 : 1.5, p[0], T, p[1], { c: 0xb5ad9c, solid: true }); }
    B.box(M.woodH, 1.4, 2.3, 0.12, x - 4.12, f - 0.3, z + 1.14, { ry: 0.5, c: 0x3a2618 });                                                                          // the door, standing open
    // inside: lime in barrels, dressed stone, the masons' bench with mallet and chisels, a coil of rope
    for (const [bx, bz] of [[2.0, 2.0], [1.2, 2.05]]) { barrel(B, M, x + bx, f, z + bz, 0x9a8a6a); B.cyl(M.flat, 0.3, 0.3, 0.03, x + bx, f + 0.93, z + bz, { c: 0xe8e4d8, seg: 12 }); }
    B.box(M.stone, 1.7, 0.5, 0.8, x + 1.55, f, z - 2.0, { c: 0xc8c0ae, solid: true }); B.box(M.stone, 1.1, 0.45, 0.75, x + 1.75, f + 0.5, z - 2.0, { ry: 0.08, c: 0xbcb4a2 });
    { const top = table(B, M, x - 1.0, f, z - 2.05, 0, { w: 1.9, d: 0.75, c: 0x6a4c30 }); B.box(M.wood, 0.14, 0.14, 0.3, x - 1.5, top, z - 2.05, { ry: 0.5, c: 0x8a6a44 }); B.box(M.wood, 0.04, 0.04, 0.28, x - 1.5, top + 0.05, z - 1.85, { ry: 0.5, c: 0x6a4a2e });
      for (let i = 0; i < 3; i++) B.box(M.metal, 0.03, 0.03, 0.26, x - 0.9 + i * 0.14, top, z - 2.1, { ry: 0.2 * i, c: 0x5a5e66 }); B.box(M.stone, 0.4, 0.22, 0.3, x - 0.3, top, z - 2.0, { c: 0xc8c0ae }); }
    for (const k of [0, 1]) B.geo(M.flat, new THREE.TorusGeometry(0.3 - k * 0.04, 0.08, 5, 12), [x - 2.0, f + 0.08 + k * 0.14, z + 2.0], [Math.PI / 2, 0, 0], 1, 0xb8a070);
    // the scaffold: three plank floors, each shorter than the one below, and a ladder from each to the next
    const yg = world.height(x, zs + 1), floorAt = (x0, x1, yy) => { B.box(M.woodH, x1 - x0, 0.14, 2, (x0 + x1) / 2, yy - 0.14, zs, { c: 0x8a6a44, solid: true }); B.box(M.wood, x1 - x0, 0.07, 0.07, (x0 + x1) / 2, yy + 0.95, zs + 0.95, { c: 0x7a5a3a }); };
    floorAt(x - 3.5, x + 1.9, yf + 3.3); B.box(M.woodH, 1.6, 0.14, 2, x + 2.7, yf + 3.16, zs, { c: 0x8a6a44, solid: true }); floorAt(x - 3.5, x + 1.3, yf + 6.6); floorAt(x - 3.5, x - 1.2, T);
    ladder(B, M, x + 2.7, zs + 1, 0, 1, world.height(x + 2.7, zs + 1.5), yf + 3.3); ladder(B, M, x + 1.3, zs, 1, 0, yf + 3.3, yf + 6.6); ladder(B, M, x - 1.2, zs, 1, 0, yf + 6.6, T);
    for (const px of [-3.4, -1.1, 1.4, 3.4]) { B.box(M.wood, 0.14, T + 1.8 - yg, 0.14, x + px, yg - 0.6, zs + 0.95, { c: 0x7a5a3a }); for (const yy of [yf + 3.1, yf + 6.4, T - 0.2]) if (px < 2 || yy < yf + 4) B.box(M.wood, 0.1, 0.1, 2.1, x + px, yy - 0.12, zs, { c: 0x6a4c30 }); }
    extraPicks.push([x + 1.5, z - 1.5, T + 0.3]);
  }
  { // the masons' yard east of the keep: a quarry face cut in three steps (rock stairs lead from one to the next, and the top looks down on keep and camp),
    // the treadwheel crane that lifts the stones, and the lodge where they are dressed. Men of the valley are made to work here.
    const qx = 84, qz = -44, yq = world.height(qx, qz), G = [0x8c8880, 0x9a968c, 0x7c7a76];
    [[0, 9, 1.5], [1.5, 6, 3.0], [3, 3, 4.5]].forEach(([cx, wx, h], i) => { B.box(M.rock, wx, h + 3, 7, qx + cx, yq - 3, qz, { c: G[i], solid: true });
      steps(B, M, qx + cx - wx / 2, qz + (i === 1 ? -1.8 : 1.8), -Math.PI / 2, yq + h, 4, { w: 2.2, rise: 0.375, run: 0.55, mat: M.rock, c: G[(i + 1) % 3] }); });
    for (const [lx, yy, lz, s, r] of [[5.3, 1.0, -2.2, 2.6, 0.5], [5.5, 0.9, 1.7, 2.6, 2.2], [3.7, 1.0, -4.2, 2.4, 1.1], [3.5, 1.1, 4.3, 2.4, 3.0], [-0.2, 0.4, -4.0, 1.9, 4.0], [-0.1, 0.5, 4.0, 1.8, 5.2], [-3.3, -0.1, -3.9, 1.2, 0.2], [-3.2, -0.1, 3.9, 1.2, 1.9]])
      B.geo(M.rock, rockGeo(Math.round(s * 5), 1), [qx + lx, yq + yy, qz + lz], [0, r, 0], [s, s * 1.2, s * 0.9], G[Math.round(r) % 3]);
    for (const lz of [-2.7, -0.7]) { B.geo(M.rock, rockGeo(lz < -1 ? 5 : 8, 1), [qx + 2.0, yq + 4.75, qz + lz], [0, lz, 0], [0.5, 0.6, 0.95], G[1]); world.addBox(qx + 2.0, qz + lz, 0.8, 1.6, 0, yq + 4.3, yq + 5.4); }   // stones to crouch behind, on the top step
    for (const [bx, bz, r, c] of [[77.6, -46.4, 0.2, 0xc8c0ae], [78.9, -47.6, -0.5, 0xbcb4a2], [77.2, -48.6, 1.2, 0xc8c0ae]]) B.box(M.stone, 1.5, 0.6, 0.8, bx, world.height(bx, bz) - 0.05, bz, { ry: r, c, solid: true });   // blocks, cut and waiting
    { const cx = 73.8, cz = -46.6, y = world.height(cx, cz), jib = [71.3, keepTop + 1.6, cz];                                                                       // the crane: two men walk inside the wheel, and the rope runs over the jib
      B.geo(M.wood, new THREE.CylinderGeometry(1.5, 1.5, 1.0, 16, 1, true), [cx, y + 1.75, cz], [Math.PI / 2, 0, 0], 1, 0x7a5a3a); B.geo(M.wood, new THREE.CylinderGeometry(1.42, 1.42, 0.98, 16, 1, true), [cx, y + 1.75, cz], [Math.PI / 2, 0, 0], [1, -1, 1], 0x6a4c30);
      for (const k of [-0.5, 0.5]) for (const a of [0, Math.PI / 2]) B.box(M.wood, 2.96, 0.09, 0.07, cx, y + 1.705, cz + k, { rz: a + 0.3, c: 0x5a4028 });
      for (const k of [-0.75, 0.75]) for (const a of [-1, 1]) rod(B, M.wood, [cx + a * 1.3, y - 0.2, cz + k], [cx, y + 1.85, cz + k], 0.07, 0x4a3420);
      rod(B, M.wood, [cx - 0.2, y + 1.75, cz - 0.75], [cx - 0.2, y + 1.75, cz + 0.75], 0.09, 0x4a3420); rod(B, M.wood, [cx + 1.0, y - 0.1, cz], jib, 0.13, 0x6a4a2e, 0.09); rod(B, M.flat, [cx, y + 3.25, cz], jib, 0.02, 0xb8a070);
      rod(B, M.flat, jib, [jib[0], keepTop - 2.4, cz], 0.02, 0xb8a070); B.box(M.stone, 1.0, 0.5, 0.7, jib[0], keepTop - 2.9, cz, { c: 0xc8c0ae }); world.addBox(cx, cz, 3.2, 1.7, 0, y - 1, y + 3.3); }
    { const lx = 77, lz = -37.5, y = world.height(lx, lz);                                                                                                           // the lodge: a roof on four posts, open to the yard
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(M.wood, 0.16, b < 0 ? 2.25 : 2.85, 0.16, lx + a * 2.2, y - 0.3, lz + b * 1.3, { c: 0x5a4028 });
      B.box(M.woodH, 5.0, 0.1, 3.4, lx, y + 2.25, lz, { rx: -0.2, c: 0x5c463a }); B.box(M.woodH, 4.6, 2.3, 0.1, lx, y - 0.2, lz + 1.36, { c: 0x6a4c30, solid: true });
      const top = table(B, M, lx - 1.0, y, lz + 0.7, 0, { w: 1.9, d: 0.7, c: 0x6a4c30 }); B.box(M.wood, 0.14, 0.14, 0.3, lx - 1.5, top, lz + 0.7, { ry: 0.6, c: 0x8a6a44 }); for (let i = 0; i < 3; i++) B.box(M.metal, 0.03, 0.03, 0.26, lx - 0.9 + i * 0.15, top, lz + 0.7, { ry: 0.3 * i, c: 0x5a5e66 });
      B.box(M.stone, 1.1, 0.5, 0.6, lx + 1.2, y + 0.42, lz + 0.4, { c: 0xc8c0ae }); for (const k of [-0.35, 0.35]) B.box(M.wood, 0.1, 0.42, 0.7, lx + 1.2 + k, y, lz + 0.4, { c: 0x5a4028 }); world.addBox(lx + 1.2, lz + 0.4, 1.1, 0.7, 0, y - 0.3, y + 0.92);
      for (let i = 0; i < 7; i++) B.geo(M.rock, rockGeo(i + 2, 0), [lx + 0.5 + Math.cos(i * 2.2) * 0.9, y + 0.04, lz - 0.5 + Math.sin(i * 1.7) * 0.5], [0, i, 0], [0.12, 0.06, 0.1], 0xc8c0ae);
      people.push(person(B, M, root, 'swissMan', lx + 1.2, y, lz - 0.55, 0, { pose: 'work', over: { hat: null, shirt: 0x8a7a5a, hair: 0x3a2a1a } }));
      const cx = 78.6, cz = -39.4, cy = world.height(cx, cz); people.push(person(B, M, root, 'swissMan', cx, cy, cz, 1.45, { pose: 'carry', over: { hat: 'cowl', hatC: 0x6a5a40, shirt: 0x6a5a40 } }));
      B.box(M.stone, 0.5, 0.3, 0.34, cx + Math.sin(1.45) * 0.42, cy + 0.82, cz + Math.cos(1.45) * 0.42, { ry: 1.45, c: 0xc8c0ae }); }
    extraFoes.push(['halberdier', 75.5, -41, {}]);
  }
  // flags (they wave in the wind)
  const flag = (draw, x, y, z, w = 1.9, h = 1.9, pole = 5.2) => {
    const t = drawTexture(256, 256, draw); t.userData.own = true;
    const g = new THREE.PlaneGeometry(w, h, 16, 6); g.translate(w / 2, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = shared.uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float fk = position.x / ${w.toFixed(2)}; transformed.z += sin(position.x*2.6 - uTime*4.2 + position.y) * 0.16 * fk; transformed.y += sin(position.x*1.7 - uTime*3.1) * 0.05 * fk;`); };
    mat.customProgramCacheKey = () => 'flag' + w;
    const m = new THREE.Mesh(g, mat); m.position.set(x, y + pole - h / 2 - 0.1, z); m.rotation.y = -0.5; m.castShadow = true; root.add(m);
    B.cyl(M.wood, 0.045, 0.06, pole, x, y, z, { c: 0x5a4028, seg: 6 }); B.geo(M.metal, new THREE.ConeGeometry(0.07, 0.3, 6), [x, y + pole + 0.15, z], [0, 0, 0], 1, 0xd9b23a);
  };
  flag(uriFlag, -36.5, world.height(-36.5, 56.5), 56.5, 2.2, 2.2, 5.6); flag(schwyzFlag, -27.5, world.height(-27.5, 64), 64, 1.6, 1.6, 4.6);
  flag(austriaFlag, 40.5, world.height(40.5, -17), -17, 2.2, 1.5, 6); flag(austriaFlag, 47.5, world.height(47.5, -17), -17, 2.2, 1.5, 6); flag(austriaFlag, 69.4, keepTop, -49.4, 2.6, 1.8, 4.5); flag(austriaFlag, 52, pavTop, -34, 1.4, 1.0, 2.2);
  // free men of the Waldstaetten, halberds in hand, see you off
  for (const [x, z, yaw] of [[-35.4, 57.6, 1.1], [-37.9, 55.6, 0.8], [-28.6, 62.6, -0.5]]) {
    const f = makeHumanoid(M, lookFor('confederate', R));
    f.group.position.set(x, world.height(x, z), z); f.group.rotation.y = yaw; f.armR.rotation.x = -1.25; f.armR.rotation.z = 0.12; f.armL.rotation.z = 0.1;
    root.add(f.group); world.addCyl(x, z, 0.4, -5, world.height(x, z) + 1.8);
  }
  { // people of the valley at their work: at the trough, in and before the chapel, in the meadow
    { const px = 1.37, pz = 35.87; people.push(person(B, M, root, 'swissWoman', px, world.height(px, pz), pz, 0.4 + Math.PI, { pose: 'work', over: { face: ['kerchief'], kerchief: 0xe6e0d0, dress: 0x7a2a22, pants: 0x7a2a22 } })); }   // washing at the trough
    { const P = frame(-44, 14, 0.5), [ax, az] = P(-2.3, 6.2), [bx, bz] = P(-0.6, -1.7), fy = world.groundAt(bx, bz, world.height(bx, bz) + 1.8);
      people.push(person(B, M, root, 'monk', ax, world.height(ax, az), az, 0.1, { pose: 'talk', over: { skin: 0xd6a37c, shirt: 0x2a2622, sleeve: 0x2a2622, pants: 0x2a2622, robe: 0x2a2622, sash: 0x2a2622, belt: 0xd8cdb0, boots: 0x3a2818 } }));   // the priest
      people.push(person(B, M, root, 'swissWoman', bx, fy, bz, 0.5 + Math.PI, { pose: 'pray', over: { face: ['kerchief'], kerchief: 0x3a2a22, dress: 0x3a4a6a, pants: 0x3a4a6a } })); }                                                // a woman at prayer before the altar
    { const px = -25.2, pz = 45.6, py = world.height(px, pz), yaw = 2.2; people.push(person(B, M, root, 'swissWoman', px, py, pz, yaw, { pose: 'work', over: { face: ['plaits'], dress: 0x4a5a34, pants: 0x4a5a34 } }));                 // raking hay
      rod(B, M.wood, [px + Math.sin(yaw) * 0.35 + 0.1, py + 1.25, pz + Math.cos(yaw) * 0.35], [px + Math.sin(yaw) * 1.7, py + 0.06, pz + Math.cos(yaw) * 1.7], 0.022, 0x8a6a44); B.box(M.wood, 0.6, 0.05, 0.05, px + Math.sin(yaw) * 1.7, py + 0.04, pz + Math.cos(yaw) * 1.7, { ry: yaw, c: 0x8a6a44 }); }
    { const px = -13.2, pz = 47.6, py = world.height(px, pz); people.push(person(B, M, root, 'swissMan', px, py, pz, -2.2, { pose: 'hips', over: { hat: 'felt', hatC: 0x3a4a2a } })); B.cyl(M.wood, 0.025, 0.03, 1.7, px - 0.45, py, pz - 0.2, { rz: 0.12, c: 0x6a4a2e, seg: 5 }); }   // the herdsman among his cows
  }

  // ---- forest, meadow, boulders ----------------------------------------------------------------
  // ---- the Suone: a bisse, the irrigation channel of the Valais. It takes its water beside the waterfall and leads it about a hundred
  //      metres to the meadows east of the great hay barn: caught in a wooden launder, cut into the rock, hung on the rock face beside the
  //      keeper's plank, carried over a hollow on trestles, then dug in the earth with its bank and footpath on the downhill side. A small
  //      wheel in the ditch lifts a mallet and lets it knock on a board: as long as it knocks, the water runs. Every length of wood breaks
  //      on its own; below a break the channel is dry and the hammer falls silent (see `update`). -------------------------------------
  const suone = { flow: [], tail: [], t: 0, cut: -1, hit: false };
  {
    const K = suone, PI = Math.PI, WOOD = 0x6a4c30, LARCH = 0x7a5632, DARK = 0x4a3420, GREY = [0x7c7a76, 0x8c8880, 0x6e6c6a], EARTH = 0x6e5a3c, TROD = 0x8a6f4c, MUD = 0x3a3226;
    const gy = (x, z) => world.height(x, z), water = (fx, fz) => makeWater(shared, { deep: 0x2a6a72, scale: 5, flow: [fx, fz], alpha: 0.78 });
    /** A band of water along points [x, y, z], hw to each side. */
    const ribbon = (pts, hw, mat) => {
      const P = [], N = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1; return [-(b[2] - a[2]) / l * hw, (b[0] - a[0]) / l * hw]; });
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1], [nx, nz] = N[i], [mx, mz] = N[i + 1];
        P.push(ax - nx, ay, az - nz, ax + nx, ay, az + nz, bx + mx, by, bz + mz, ax - nx, ay, az - nz, bx + mx, by, bz + mz, bx - mx, by, bz - mz); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); const m = new THREE.Mesh(g, mat); root.add(m); return m;
    };
    /** Water spreading over the grass from (x0, z0) down the slope (dx, dz): a sheet that lies on the ground. */
    const sheet = (x0, z0, dx, dz, len, spread) => {
      const P = [], nu = 6, nv = 7, pt = (u, v) => { const w = (0.22 + v / nv * spread) * (1 + 0.22 * Math.sin(v * 2.1 + x0)), a = (u / nu - 0.5) * 2 * w, d = v / nv * len * (1 - 0.7 * (u / nu - 0.5) ** 2), x = x0 + dx * d - dz * a, z = z0 + dz * d + dx * a; return [x, gy(x, z) + 0.06, z]; };
      for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) P.push(...pt(u, v), ...pt(u + 1, v), ...pt(u + 1, v + 1), ...pt(u, v), ...pt(u + 1, v + 1), ...pt(u, v + 1));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      const mat = makeWater(shared, { deep: 0x5a9a86, scale: 6, flow: [dx * 0.25, dz * 0.25], alpha: 0.3 }); mat.side = THREE.DoubleSide; const m = new THREE.Mesh(g, mat); root.add(m); return m;
    };

    // -- the ditch in the earth (E) and the stretch with the openings (G): the water lies just above the ground and never rises on its way
    const LINE = SUONE.slice(3), D = [];
    { let s = 0; for (let i = 0; i < LINE.length - 1; i++) { const [ax, az] = LINE[i], [bx, bz] = LINE[i + 1], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(l / (i < 8 ? 1.85 : 1.5)));
        for (let k = 0; k < n; k++) D.push({ x: ax + (bx - ax) * k / n, z: az + (bz - az) * k / n, s: s + l * k / n, field: i >= 8 }); s += l; }
      D.push({ x: LINE[LINE.length - 1][0], z: LINE[LINE.length - 1][1], s, field: true }); }
    for (let i = 0; i < D.length; i++) { const a = D[Math.max(0, i - 1)], b = D[Math.min(D.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.z - a.z), p = D[i]; p.tx = (b.x - a.x) / l; p.tz = (b.z - a.z) / l; p.nx = -p.tz; p.nz = p.tx; }
    const sd = D.reduce((q, p) => q + gy(p.x - p.nx * 2, p.z - p.nz * 2) - gy(p.x + p.nx * 2, p.z + p.nz * 2), 0) > 0 ? 1 : -1;           // the downhill side: that of (nx, nz) * sd
    for (let i = D.length - 1; i >= 0; i--) { const p = D[i], g = Math.max(gy(p.x, p.z), gy(p.x + p.nx * 0.3, p.z + p.nz * 0.3), gy(p.x - p.nx * 0.3, p.z - p.nz * 0.3)) + 0.09;
      p.y = i === D.length - 1 ? g : Math.max(g, D[i + 1].y + (D[i + 1].s - p.s) * 0.01); p.nx *= sd; p.nz *= sd; }
    const iF = D.findIndex((p) => p.field), gate = new Map([2, 4, 6, 8, 10].map((k, j) => [iF + k, j === 1 || j === 3]));                    // five openings in the downhill bank; two are in use
    for (let i = 0; i < D.length - 1; i++) {
      const a = D[i], b = D[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, nx = -uz * sd, nz = ux * sd, ry = Math.atan2(-dz, dx), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const base = Math.min(gy(a.x, a.z), gy(b.x, b.z), gy(mx + nx * 1.1, mz + nz * 1.1)) - 0.6, top = Math.max(a.y, b.y);
      B.box(M.flat, l + 0.06, (a.y + b.y) / 2 - 0.035 - base, 0.66, mx, base, mz, { ry, c: MUD });                                               // the bed
      const c0 = gate.has(i) ? 0.3 : -0.05, c1 = gate.has(i + 1) ? 0.3 : -0.05, bo = (c0 - c1) / 2;
      B.box(M.flat, l - c0 - c1, top + 0.14 - base, 0.8, mx + ux * bo + nx * 0.72, base, mz + uz * bo + nz * 0.72, { ry, c: TROD, solid: true });  // the bank on the downhill side: the keeper's path runs on it
      B.box(M.flat, l + 0.06, top + 0.08 - base, 0.32, mx - nx * 0.48, base, mz - nz * 0.48, { ry, c: EARTH });                                 // the low bank on the uphill side
    }
    K.tail.push(ribbon(D.slice(0, iF + 1).map((p) => [p.x, p.y, p.z]), 0.3, water(-0.9, 0.05)), ribbon(D.slice(iF).map((p) => [p.x, p.y, p.z]), 0.3, water(-0.75, -0.5)));
    B.noTrinkets++;
    for (const [j, used] of gate) {                                                                                                             // each opening: two posts and its board
      const p = D[j], ry = Math.atan2(-p.tz, p.tx), gx = p.x + p.nx * 0.72, gz = p.z + p.nz * 0.72;
      for (const k of [-1, 1]) B.box(M.wood, 0.09, 0.66, 0.09, gx + p.tx * k * 0.33, p.y - 0.2, gz + p.tz * k * 0.33, { ry, c: 0x7a5a3a });
      B.box(M.flat, 0.58, 0.5, 0.86, gx, p.y - 0.52, gz, { ry, c: MUD });
      if (!used) B.box(M.woodH, 0.58, 0.38, 0.045, p.x + p.nx * 0.4, p.y - 0.1, p.z + p.nz * 0.4, { ry, c: 0xa8845a });                              // shut
      else {                                                                                                                                    // in use: the board stands across the Suone, the water turns through the opening
        B.box(M.woodH, 0.045, 0.3, 0.7, p.x + p.tx * 0.45, p.y - 0.14, p.z + p.tz * 0.45, { ry, c: 0xa8845a });
        B.box(M.woodH, 0.58, 0.38, 0.045, gx + p.tx * 0.75 + p.nx * 0.3, p.y + 0.13, gz + p.tz * 0.75 + p.nz * 0.3, { ry, rx: 0.3, c: 0xa8845a });  // (the board of the opening, laid aside on the bank)
        const side = []; for (let k = 0; k <= 6; k++) { const d = 0.2 + k * 0.5, x = p.x + p.nx * d, z = p.z + p.nz * d; side.push([x, Math.min(p.y - 0.01, gy(x, z) + 0.07), z]); }
        const e = side[side.length - 1]; K.tail.push(ribbon(side, 0.2, water(p.nx * 0.8, p.nz * 0.8)), sheet(e[0], e[2], p.nx, p.nz, 7.5, 2.8));
      }
    }
    B.noTrinkets--;
    { const p = D[D.length - 1]; K.tail.push(sheet(p.x, p.z, p.nx, p.nz, 5, 2)); }   // the end: what is left runs out over the last plot

    // -- levels of the water upstream of the ditch, each stretch a little higher than the next
    const yAq1 = D[0].y + 0.03, yAq0 = yAq1 + 0.42, yHu0 = yAq0 + 0.14, yNo0 = yHu0 + 0.09, yLa1 = yNo0 + 0.02, yLa0 = yLa1 + 0.07;
    const CX = 97.35, Z0 = 30.6, Z1 = 38.5, Z2 = 50.3, FACE = 97.75, wN = water(0, 0.9);                         // the line along the rock: x; start of the cut, of the hung stretch, of the aqueduct; the rock face
    /** A length of wooden channel from a to b (water levels ay, by): bottom and two sides; returns its water. */
    const trough = (ax, az, ay, bx, bz, by, mat, c = WOOD) => {
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = (ay + by) / 2 - 0.25, nx = -dz / l, nz = dx / l;
      B.box(M.woodH, l + 0.08, 0.07, 0.56, mx, y, mz, { ry, c, solid: true });
      for (const k of [-1, 1]) B.box(M.woodH, l + 0.08, 0.36, 0.06, mx + nx * k * 0.27, y, mz + nz * k * 0.27, { ry, c });
      return ribbon([[ax, ay, az], [bx, by, bz]], 0.22, mat);
    };
    /** n lengths of channel from a to b, each a piece that breaks on its own; they go into the list of the flow, in order. */
    const run = (ax, az, ay, bx, bz, by, n, mat, c) => {
      for (let k = 0; k < n; k++) { const u0 = k / n, u1 = (k + 1) / n, x0 = ax + (bx - ax) * u0, z0 = az + (bz - az) * u0, y0 = ay + (by - ay) * u0, x1 = ax + (bx - ax) * u1, z1 = az + (bz - az) * u1, y1 = ay + (by - ay) * u1;
        const p = B.piece({ hp: 70, kind: 'wood', color: c ?? WOOD, x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 0.25, z: (z0 + z1) / 2, r: Math.hypot(x1 - x0, z1 - z0) / 2 + 0.1, top: (y0 + y1) / 2 + 0.11 });
        const w = trough(x0, z0, y0, x1, z1, y1, mat, c); B.endPiece(); K.flow.push({ p, w, x: x0, y: y0, z: z0 }); }
    };
    /** A trestle astride the line (tx, tz) at (x, z), its cap beam up to yTop; what rests on it comes down with it. */
    const trestle = (x, z, tx, tz, yTop) => {
      const nx = -tz, nz = tx, g = Math.min(gy(x + nx * 0.62, z + nz * 0.62), gy(x - nx * 0.62, z - nz * 0.62)) - 0.3;
      B.piece({ hp: 110, kind: 'wood', color: DARK, x, y: g + 0.3, z, r: 0.75, top: yTop });
      B.box(M.wood, 0.14, 0.14, 1.0, x, yTop - 0.14, z, { ry: Math.atan2(-tz, tx), c: DARK });
      for (const k of [-1, 1]) { rod(B, M.wood, [x + nx * k * 0.62, g, z + nz * k * 0.62], [x + nx * k * 0.3, yTop - 0.1, z + nz * k * 0.3], 0.06, DARK); world.addCyl(x + nx * k * 0.46, z + nz * k * 0.46, 0.1, g, yTop - 0.1); }
      rod(B, M.wood, [x + nx * 0.5, g + (yTop - g) * 0.4, z + nz * 0.5], [x - nx * 0.42, g + (yTop - g) * 0.75, z - nz * 0.42], 0.035, DARK);
      B.endPiece();
    };

    // -- the rock: a wall that carries the cut and the hung stretch, in front of the buttress north of the waterfall and on beyond it
    { const zs = [30.4, 34.6, 39.2, 43.6, 47.6, 50.7], tops = [6.2, 7.2, 6.0, 6.9, 5.2];
      for (let i = 0; i < 5; i++) { const z = (zs[i] + zs[i + 1]) / 2, g = Math.min(gy(FACE, zs[i]), gy(FACE, zs[i + 1])) - 1.5; B.box(M.rock, 3.9 + (i % 2) * 0.5, yNo0 + tops[i] - 2.3 - g, zs[i + 1] - zs[i] + 0.05, FACE + 1.95 + (i % 2) * 0.25, g, z, { c: GREY[i % 3], solid: true }); }
      for (const [x, y, z, sx, sy, sz, r] of [[99.3, 4.6, 31.6, 3.0, 2.6, 2.6, 0.4], [99.6, 5.6, 36.6, 3.3, 2.8, 3.1, 1.9], [99.2, 4.5, 41.4, 2.9, 2.5, 2.8, 3.1], [99.6, 5.3, 45.6, 3.2, 2.7, 2.7, 4.4], [99.3, 3.9, 49.6, 2.8, 2.4, 2.4, 5.2],   // natural rock above the hewn face,
        [100.6, 3.0, 30.2, 2.0, 2.6, 1.2, 2.7], [100.2, 0.6, 51.6, 2.4, 3.2, 2.0, 3.6], [102.6, 1.2, 43.4, 3.2, 4.6, 3.4, 0.9], [103, 0.8, 48.2, 3.4, 4.2, 3.2, 2.2],                                                                    // at its ends and behind it,
        [96.9, -2.6, 36.8, 1.2, 0.9, 1.6, 1.3], [97.6, -2.5, 41.5, 1.3, 0.9, 1.5, 4.0], [97.7, -2.4, 46.5, 1.5, 1.0, 1.3, 5.6]])                                                                                                          // and boulders at its foot
        B.geo(M.rock, rockGeo(Math.round(sx * 5 + z), 1), [x, yNo0 + y, z], [0, r, 0], [sx, sy, sz], GREY[Math.round(r * 2) % 3]);
      world.addBox(102.6, 46.6, 5.4, 9.4, 0, gy(102, 46) - 1, yNo0 + 3); world.addCyl(100.6, 52.4, 1.7, gy(100.6, 52.4) - 1, yNo0 + 0.6); }

    // -- A: the intake. A launder catches water at the side of the fall and carries it over to the rock; a sluice board at its end
    run(100.35, 23.9, yLa0, CX, Z0, yLa1, 2, water(-0.37, 0.83));
    { const dx = CX - 100.35, dz = Z0 - 23.9, l = Math.hypot(dx, dz); trestle(100.35 + dx / 2, 23.9 + dz / 2, dx / l, dz / l, (yLa0 + yLa1) / 2 - 0.25);
      rod(B, M.wood, [101.6, yLa0 - 1.5, 24.9], [100.35, yLa0 - 0.3, 24.2], 0.07, DARK); rod(B, M.wood, [101.6, yLa0 - 1.5, 23.2], [100.35, yLa0 - 0.3, 23.7], 0.07, DARK);            // two struts from the rock hold its end in the fall
      B.noTrinkets++; for (const k of [-1, 1]) B.box(M.wood, 0.1, 1.0, 0.1, CX + k * 0.38, yLa1 - 0.3, Z0 + 0.25, { c: DARK }); B.box(M.wood, 0.9, 0.09, 0.1, CX, yLa1 + 0.7, Z0 + 0.25, { c: DARK });
      B.box(M.woodH, 0.62, 0.5, 0.05, CX, yLa1 + 0.12, Z0 + 0.25, { c: WOOD }); B.noTrinkets--; }                                                                                  // the sluice board, drawn half up

    // -- B: cut into the rock. A shelf hewn along the face, the water running in it behind a lip of rock; steps cut in the rock lead up to it
    B.box(M.rock, FACE - 96.7 + 0.1, yNo0 - 0.22 - (gy(97, 34) - 1.5), Z1 - 30.3, (FACE + 96.7) / 2 + 0.05, gy(97, 34) - 1.5, (Z1 + 30.3) / 2, { c: GREY[1], solid: true });
    B.box(M.rock, 0.3, 0.36, Z1 - 32.1, 96.85, yNo0 - 0.24, (Z1 + 32.1) / 2, { c: GREY[0], solid: true });                                   // (the lip begins beyond the head of the steps)
    K.flow.push({ p: null, w: ribbon([[CX, yLa1, Z0 - 0.1], [CX, yNo0, Z0 + 0.6], [CX, yHu0 + 0.01, Z1]], 0.33, wN), x: CX, y: yNo0, z: Z0 });
    steps(B, M, 96.7, 31.25, -PI / 2, yNo0 - 0.22, Math.ceil((yNo0 - 0.22 - gy(91.6, 31.25)) / 0.3), { w: 1.3, rise: 0.3, run: 0.65, mat: M.rock, c: GREY[0] });

    // -- C: hung on the rock face. Beams wedged into the rock carry channels of larch and, outside them, the keeper's plank
    { const n = 4, L = (Z2 - Z1) / n, walk = (yHu0 + yAq0) / 2 - 0.26;
      for (let k = 0; k <= n; k++) { const z = Z1 + k * L - (k === n ? 0.12 : 0) + (k === 0 ? 0.12 : 0);
        B.piece({ hp: 90, kind: 'wood', color: DARK, x: 96.9, y: walk - 0.2, z, r: 0.9, top: walk - 0.06 });
        B.box(M.wood, 1.9, 0.14, 0.15, 96.9, walk - 0.2, z, { c: DARK }); rod(B, M.wood, [FACE, walk - 1.15, z], [96.25, walk - 0.2, z], 0.05, DARK); B.endPiece(); }
      run(CX, Z1, yHu0, CX, Z2, yAq0, n, wN, LARCH);
      for (let k = 0; k < n; k++) { const z = Z1 + (k + 0.5) * L; B.piece({ hp: 60, kind: 'wood', color: 0x8a6a48, x: 96.6, y: walk - 0.06, z, r: L / 2 + 0.1, top: walk });
        B.box(M.woodH, 0.72, 0.06, L + 0.04, 96.6, walk - 0.06, z, { c: k % 2 ? 0x8a6a48 : 0x7e6040, solid: true }); B.endPiece(); }
      steps(B, M, 96.24, Z2 - 0.75, -PI / 2, walk, Math.ceil((walk - gy(93.2, Z2 - 0.75)) / 0.3), { w: 1.2, rise: 0.3, run: 0.65, mat: M.rock, c: GREY[2] }); }

    // -- D: the aqueduct. Six lengths of channel on trestles, across the hollow to where the ditch begins
    { const bx = D[0].x, bz = D[0].z, dx = bx - CX, dz = bz - Z2, l = Math.hypot(dx, dz), n = 6;
      run(CX, Z2, yAq0, bx, bz, yAq1, n, water(dx / l * 0.95, dz / l * 0.95));
      for (let k = 1; k < n; k++) trestle(CX + dx * k / n, Z2 + dz * k / n, dx / l, dz / l, yAq0 + (yAq1 - yAq0) * k / n - 0.25); }
    K.flow.push({ p: null, w: K.tail[0], x: D[0].x, y: D[0].y, z: D[0].z });

    // -- F: the hammer and the keeper's hut
    { let iH = 0; for (let i = 0; i < iF - 1; i++) if (Math.hypot(D[i].x - 54, D[i].z - 66.3) < Math.hypot(D[iH].x - 54, D[iH].z - 66.3)) iH = i;
      const p = D[iH], y = p.y, ax = (d, a) => [p.x + p.tx * d + p.nx * a, p.z + p.tz * d + p.nz * a];                                            // (along the flow, across towards the downhill side)
      K.hp = B.piece({ hp: 60, kind: 'wood', color: WOOD, x: p.x + p.nx * 0.5, y, z: p.z + p.nz * 0.5, r: 1.3, top: y + 0.8 });
      for (const a of [-0.5, 0.5, 1.25]) { const [x, z] = ax(0, a); B.box(M.wood, 0.1, a > 1 ? 0.78 : 0.86, 0.1, x, y - 0.2, z, { c: 0x7a5a3a }); }                // the posts of the axle
      { const [x, z] = ax(-0.85, 0.95); B.box(M.wood, 0.12, 0.72, 0.12, x, y - 0.2, z, { c: 0x7a5a3a }); }                                                           // the post the mallet turns on
      { const [x, z] = ax(0.1, 0.95); B.box(M.woodH, 0.34, 0.05, 0.6, x, y + 0.2, z, { ry: Math.atan2(-p.tz, p.tx), c: 0x9a7a52 });                             // the board it knocks on, on two blocks
        for (const k of [-0.24, 0.24]) { const [qx, qz] = ax(0.1, 0.95 + k); B.box(M.wood, 0.3, 0.42, 0.08, qx, y - 0.2, qz, { ry: Math.atan2(-p.tz, p.tx), c: DARK }); } }
      B.endPiece();
      const mesh = (parts) => { const m = new THREE.Mesh(merge(parts), M.flat); m.castShadow = true; m.rotation.order = 'YXZ'; root.add(m); return m; };
      K.wheel = mesh([gCyl(0.035, 0.035, 2.0, DARK, [0, 0, 0.42], [PI / 2, 0, 0], 1, 6), gBox(0.06, 0.2, 0.06, DARK, [0, 0.1, 0.95]),                             // the axle and the peg that lifts the mallet,
        ...[0, 1, 2, 3, 4, 5].map((i) => gBox(0.03, 0.34, 0.4, 0x8a6a48, [-Math.sin(i * PI / 3) * 0.23, Math.cos(i * PI / 3) * 0.23, 0], [0, 0, i * PI / 3])),     // six floats,
        ...[-0.21, 0.21].map((lz) => gCyl(0.16, 0.16, 0.03, WOOD, [0, 0, lz], [PI / 2, 0, 0], 1, 10))]);                                                           // between two discs
      K.wheel.position.set(p.x, y + 0.42, p.z); K.wheel.rotation.y = Math.atan2(p.nx, p.nz); K.spin = sd;
      K.arm = mesh([gBox(0.05, 0.05, 1.0, WOOD, [0, 0, 0.45]), gBox(0.16, 0.2, 0.16, 0x5a4028, [0, -0.05, 0.95])]);
      { const [x, z] = ax(-0.85, 0.95); K.arm.position.set(x, y + 0.42, z); K.arm.rotation.y = Math.atan2(p.tx, p.tz); }
      K.x = p.x; K.z = p.z;
      // the hut: one room of planks under a shingle roof, its door towards the Suone
      const hx = p.x - p.nx * 3.7 + p.tx * 1.2, hz = p.z - p.nz * 3.7 + p.tz * 1.2, hr = Math.atan2(p.nx, p.nz), hw = 2.8, hd = 2.4, HP = frame(hx, hz, hr), hy = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => gy(...HP(a * hw / 2, b * hd / 2)))) + 0.05;
      room(B, M, hx, hy, hz, { w: hw, d: hd, h: 2.0, t: 0.14, ry: hr, mat: M.woodH, c: 0x7a5a3a, doors: [{ side: 's', at: -0.5, w: 0.85, h: 1.75 }], wins: [{ side: 'e', at: 0, w: 0.5, y: 1.0, h: 0.45 }], floor: { mat: M.woodH, c: 0x8a6a48 }, ceil: false });
      B.geo(M.shingle, prismGeo(hd + 0.9, 1.0, hw + 0.8, 3), [hx, hy + 2.0, hz], [0, hr + PI / 2, 0], 1, 0x6e6a64);
      { const [bx, bz] = HP(0.75, -0.55); bench(B, M, bx, hy + 0.06, bz, hr); const [sx, sz] = HP(1.05, 1.32); rod(B, M.wood, [sx, hy, sz + 0.25], [sx, hy + 1.7, sz], 0.022, 0x8a6a44); }
    }

    // -- the keeper clears the ditch with his long hoe; a woman has set her board and waters her plot
    { let iK = 0; for (let i = 0; i < iF; i++) if (Math.abs(D[i].x - 72) < Math.abs(D[iK].x - 72)) iK = i;
      const p = D[iK], f = person(B, M, root, 'swissMan', p.x + p.nx * 0.78, p.y + 0.14, p.z + p.nz * 0.78, Math.atan2(-p.nx, -p.nz), { pose: 'work', over: { hat: null } });
      const hoe = new THREE.Mesh(merge([gCyl(0.018, 0.018, 1.7, 0x9a7a52, [0, -0.75, 0.04]), gBox(0.15, 0.035, 0.11, 0x3a3a40, [0, -1.6, 0.09])]), M.flat); hoe.castShadow = true; f.armR.add(hoe); people.push(f);
      const q = D[iF + 4]; people.push(person(B, M, root, 'swissWoman', q.x + q.nx * 0.8 - q.tx * 0.75, q.y + 0.14, q.z + q.nz * 0.8 - q.tz * 0.75, Math.atan2(-q.nx + q.tx * 0.6, -q.nz + q.tz * 0.6), { pose: 'work' })); }
    K.spill = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1, 0.1).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: 0xb8d8e2, transparent: true, opacity: 0.6, depthWrite: false })); K.spill.visible = false; root.add(K.spill);
  }

  const nearBuilt = (x, z) => dPoly(PATH, x, z) < 4 || dPoly(STREAM, x, z) < 5 || (x > 26 && x < 72 && z < -12 && z > -56) || (Math.hypot(x + 10, z - 44) < 34) || Math.hypot(x + 44, z - 14) < 8 || Math.hypot(x - fallX, z - fallZ) < 14 || Math.hypot(x + 34, z - 58) < 17 || Math.hypot(x + 84, z - 27) < 16 || Math.hypot(x - 26, z - 52) < 10 || Math.hypot(x + 52, z + 17) < 16 || Math.hypot(x - 74, z - 34) < 13
    || dPoly(LANE, x, z) < 5.5 || Math.hypot(x + 20, z + 50) < 18 || Math.hypot(x + 34, z + 58) < 9 || Math.hypot(x + 70, z + 43) < 11 || Math.hypot(x - 49, z - 14) < 11 || (x > 51 && x < 62 && z > -4 && z < 9) || Math.hypot(x - 80, z + 42) < 14
    || dPoly(SUONE, x, z) < 4.5 || (x > 95 && x < 107 && z > 29 && z < 55) || (x > 34 && x < 52 && z > 47 && z < 66);
  const bare = [[52, -34, 3.6], [67, -47, 3.4], [36, -24, 2.7], [-25, -44.5, 3.7], [-19, -44.5, 3.7], [48.6, 13.2, 3.9]];   // floors that lie on the ground: no grass grows through them
  const pines = [];
  for (let i = 0; i < 60000 && pines.length < 2100; i++) {
    const x = (R() - 0.5) * 900, z = (R() - 0.5) * 900, h = world.height(x, z), d = Math.hypot(x - 6, z - 2);
    if (h < 1.5 || h > 128) continue;
    if (d < 131) { if (nearBuilt(x, z) || fbm(x * 0.035 + 50, z * 0.035, 2, 3) < 0.6) continue; } else if (forest(x, z) < 0.47 && R() < 0.85) continue;
    if (world.height(x + 2, z) - h > 3.2 || h - world.height(x - 2, z) > 3.2) continue;
    const s = 0.75 + R() * 0.9;
    pines.push({ x, y: h - 0.3, z, ry: R() * 6.28, s: [s, s * (0.9 + R() * 0.35), s], c: R.pick([0xffffff, 0xd8e8d0, 0xb8d0b0, 0xe8e0c0]) });
    if (d < 142) world.addCyl(x, z, 0.4 * s, h - 2, h + 9);
  }
  { // the sunken lane east of the camp: an old cart track worn deep between banks of earth and rock, with firs on both sides. It leads from the stream to the keep
    // out of sight of the camp; a fallen trunk lies across it, low enough that a man has to duck under it.
    const G = [0x8c8880, 0x767470, 0x7c7a76];
    for (let i = 0; i < LANE.length - 1; i++) { const [ax, az] = LANE[i], [bx, bz] = LANE[i + 1], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
      for (const k of [-1, 1]) { const ox = -uz * k * 3.1, oz = ux * k * 3.1, mx = (ax + bx) / 2 + ox, mz = (az + bz) / 2 + oz;
        world.addBox(mx, mz, len + 1.4, 1.7, Math.atan2(-uz, ux), world.height(mx, mz) - 4, world.height(mx, mz) + 2.2);
        for (let t = 0.5; t < len; t += 1.8) { const j = Math.round(t * 3) + i * 7 + k, e = 1 + 0.08 * Math.sin(j * 1.7), px = ax + ux * t + ox * e, pz = az + uz * t + oz * e, y = world.height(px, pz);
          if (j % 3) B.geo(M.ground, rockGeo(j % 9 + 3, 2), [px, y + 0.45, pz], [0, j, 0], [1.9, 1.5 + (j % 4) * 0.14, 1.7], j % 2 ? 0x587f36 : 0x4f7030); else B.geo(M.rock, rockGeo(j % 7 + 2, 1), [px, y + 0.6, pz], [0, j, 0], [1.5, 1.5, 1.3], G[j % 3]);
          if (j % 4 === 1) { const tx = px + ox * 0.75, tz = pz + oz * 0.75, h = world.height(tx, tz), s = 0.9 + (j % 5) * 0.14; pines.push({ x: tx, y: h - 0.3, z: tz, ry: j, s: [s, s * 1.1, s], c: [0xffffff, 0xd8e8d0, 0xb8d0b0][j % 3] }); world.addCyl(tx, tz, 0.4 * s, h - 2, h + 9); } } } }
    const tx = 70.5, tz = -12, ty = world.height(tx, tz) + 1.3, px = 0.97, pz = -0.243;
    rod(B, M.wood, [tx - px * 4.2, ty + 0.75, tz - pz * 4.2], [tx + px * 3.9, ty + 0.1, tz + pz * 3.9], 0.34, 0x4a3420, 0.25, 8); world.addBox(tx, tz, 7.6, 0.7, 0.245, ty, ty + 0.9);
    for (const [k, a] of [[-1.6, 0.9], [0.6, -0.8], [2.2, 0.6]]) rod(B, M.wood, [tx + px * k, ty + 0.35, tz + pz * k], [tx + px * k + a * 0.3, ty + 1.3, tz + pz * k + a], 0.06, 0x4a3420, 0.03);
    B.geo(M.ground, rockGeo(6, 1), [tx - px * 4.5, ty + 0.9, tz - pz * 4.5], [0, 0.4, 1.2], [1.2, 0.5, 1.3], 0x5a4632);                                         // the root plate, torn out of the bank
    extraFoes.push(['crossbowman', 69.3, -23, {}]);
  }
  root.add(instanced(pineGeo(), windify(M.rock.clone(), shared, 0.16, 9, 1.1), pines));
  const tufts = [], flowers = [], rocks = [];
  for (let i = 0; i < 120000 && tufts.length < 42000; i++) {
    const a = R() * 6.283, r = Math.sqrt(R()) * 131, x = 6 + Math.cos(a) * r, z = 2 + Math.sin(a) * r, h = world.height(x, z);
    if (h < 0.7 || dPoly(PATH, x, z) < 1.3 || dPoly(STREAM, x, z) < 2.6 || dPoly(SUONE, x, z) < 1.35 || bare.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br)) continue;
    tufts.push({ x, y: h, z, ry: R() * 6.28, s: [0.35 + R() * 0.4, 0.2 + R() * 0.4, 0.35 + R() * 0.4], c: R.pick([0x86a84e, 0x74983e, 0x94b058, 0x688c3a]) });
    if (i % 5 === 0) flowers.push({ x: x + 0.3, y: h, z: z + 0.2, ry: R() * 6, s: 0.7 + R() * 0.7, c: R.pick([0xffffff, 0xffe04a, 0xffffff, 0x6a8cf0, 0xf07aa8, 0xffe04a]) });
  }
  root.add(instanced(tuftGeo(5, 0x8a9a6a, 0xffffff), windify(M.flat2.clone(), shared, 0.22, 1, 1.9), tufts, { cast: false, thin: true }));
  const flowerGeo = merge([gBox(0.012, 0.3, 0.012, 0x2a5a1c, [0, 0.15, 0]), xf(new THREE.IcosahedronGeometry(0.06, 0), [0, 0.32, 0], [0, 0, 0], [1, 0.6, 1], 0xffffff)]);
  root.add(instanced(flowerGeo, windify(M.flat.clone(), shared, 0.2, 0.4, 1.9), flowers, { cast: false, thin: true }));
  for (let i = 0; i < 260; i++) {
    const x = (R() - 0.5) * 330, z = (R() - 0.5) * 330, h = world.height(x, z); if (h < 0.5 || nearBuilt(x, z)) continue;
    const s = 0.4 + R() * R() * 3;
    rocks.push({ x, y: h + s * 0.2, z, ry: R() * 6, s: [s, s * 0.8, s], c: R.pick([0x8a8882, 0x9a968e, 0x7a7a76]) });
    if (s > 1 && Math.hypot(x - 6, z - 2) < 140) world.addCyl(x, z, s * 0.85, h - 2, h + s * 0.7);
  }
  root.add(instanced(rockGeo(4, 1), M.rock, rocks, { solid: true }));

  // ---- atmosphere ------------------------------------------------------------------------------
  root.add(makeAmbient(shared, { count: 420, box: 40, boxY: 14, size: 0.045, colorA: 0xffffff, colorB: 0xfff8d0, alpha: 0.7, fall: -0.03, wind: [0.5, 0, 0.3], flutter: 0.9 }));
  const eagle = new THREE.Mesh(merge([gBox(2.6, 0.03, 0.5, 0x2a2018, [0, 0, 0]), gBox(0.3, 0.06, 1.0, 0x2a2018, [0, 0, 0.1]), gBox(0.5, 0.03, 0.3, 0x2a2018, [0, 0, 0.6])]), M.flat);
  root.add(eagle);

  { // a great boulder in the meadow west of the path, with a summit cross on its grassy top and a ladder leaning against its flank; a hunter's high seat near the start
    const clearAt = (x, z, r) => { world.cyls = world.cyls.filter((c) => Math.hypot(c.x - x, c.z - z) > r + c.r); };
    clearAt(-52, -17, 15);
    const rk = boulder(B, M, -52, 5.1, -19, { rx: 8, rz: 7, h: 7.5, seed: 3, ladder: 0.35, cross: true });
    extraFoes.push(['crossbowman', -51, -20.5, { y: rk.top + 0.5, static: true, yaw: 0 }]); extraPicks.push([-54, -17.5, rk.top + 0.5]);
    clearAt(-44, 65, 4); stand(B, M, -44, world.height(-44, 64.7), 64.7, 0, { c: 0x7a5a3a, roof: 0x5a4632 });
  }
  const enemies = [
    ['halberdier', -15, 41, {}], ['crossbowman', -2, 44.5, {}], ['halberdier', 5, 24, { patrol: true }], ['crossbowman', 17, 33, {}],
    ['halberdier', -39, 18, { patrol: true }], ['halberdier', 21, 0, {}], ['crossbowman', 29.5, -10, {}], ['knight', 32, -15, {}],
    ['halberdier', 42, -23, {}], ['crossbowman', 37.5, -29, {}], ['halberdier', 48, -29.5, { patrol: true }], ['crossbowman', 56, -26, {}],
    ['knight', 46, -40, {}], ['halberdier', 58, -42, {}], ['crossbowman', 67, -47, { y: 30, static: true, yaw: -2.2 }], ['swissBoss', 60, -48, { yaw: -2.4, patrol: false }],
    ['halberdier', -8, 39, { up: 1.8, patrol: false }], ['halberdier', -79, 27, {}], ['crossbowman', -91, 31, {}],
    ['crossbowman', 74, 34, { up: 1.8, patrol: false }], ['halberdier', 67, 37, {}], ['halberdier', 79, 29, { patrol: true }],
  ];
  const cheese = merge([gCyl(0.2, 0.2, 0.12, 0xe8b838, [0, 0, 0], [0, 0, 0], 1, 12), gCyl(0.205, 0.205, 0.03, 0xb88a20, [0, 0.06, 0], [0, 0, 0], 1, 12), gCyl(0.205, 0.205, 0.03, 0xb88a20, [0, -0.06, 0], [0, 0, 0], 1, 12)]);
  cheese.rotateX(1.1);
  let ft = 0;
  return {
    env: {
      sunDir: [-0.72, 0.56, 0.22], sunColor: 0xfff0d0, sunLight: 0xfff4e0, sunIntensity: 4.6, sunSize: 0.0005,
      skyTop: 0x1857c4, skyHorizon: 0xb8d6f2, skyGround: 0x8aa8c0, haze: 0.62,
      fogColor: 0xb2cde6, fogDensity: 0.0011, hemiSky: 0xa9c9ff, hemiGround: 0x54703c, hemiIntensity: 1.9, envIntensity: 0.75,
      cloudCover: 0.55, cloudScale: 0.36, cloudLit: 0xffffff, cloudShade: 0x93a4bc,
      bloom: 0.28, bloomRadius: 0.6, bloomThreshold: 1.25, rays: 0.25, rayThreshold: 2.6, exposure: 0.95,
      saturation: 1.16, contrast: 1.07, vignette: 0.3, tintHi: 0xfffaf0, tintLo: 0xe8f0ff, shadowRange: 95,
    },
    spawn: { x: -32, z: 60, yaw: -0.71 },
    vista: { c: [0, 6, 20], r: 60, h: 14, a: 2.2, speed: 0.03 },
    enemies: enemies.concat(extraFoes), pickups: [[-9.5, 32.5], [19, 4], [38.5, -19.5], [-41, 20], [-44.96, 12.24, 0, 1.8], [75.6, 35.6, 0, 1.8]].concat(extraPicks),
    dust: [0.45, 0.42, 0.3], water: [[fallX, fallZ, 60], [25, -5.5, 16]],
    makePickup: () => new THREE.Mesh(cheese, M.flat),
    update(dt, t, g) {
      eagle.position.set(20 + Math.cos(t * 0.12) * 70, 85 + Math.sin(t * 0.3) * 4, -10 + Math.sin(t * 0.12) * 70); eagle.rotation.set(0, -t * 0.12, 0.25);
      fl.intensity = 34 + Math.sin(t * 17) * 6 + Math.sin(t * 7.3) * 5;
      idle(people, t); wheel.rotation.x = t * 0.8;
      { // the Suone: the water runs as far as the first broken length of wood; while it reaches the wheel, the hammer knocks every second and a half
        const K = suone, cut = K.flow.findIndex((f) => f.p && f.p.broken);
        if (cut !== K.cut) { K.cut = cut; K.flow.forEach((f, i) => { f.w.visible = cut < 0 || i < cut; }); for (const m of K.tail) m.visible = cut < 0; K.spill.visible = cut >= 0;
          if (cut >= 0) { const f = K.flow[cut]; K.spill.position.set(f.x, f.y, f.z); K.spill.scale.y = Math.max(0.3, f.y - world.height(f.x, f.z)); } }
        K.wheel.visible = K.arm.visible = !K.hp.broken;
        if (cut < 0 && !K.hp.broken) {
          K.t += dt; const ph = K.t / 1.5 % 1, hit = ph >= 0.86;
          K.wheel.rotation.z = K.t / 1.5 * 6.2832 * K.spin; K.arm.rotation.x = ph < 0.8 ? -0.36 * ph / 0.8 : hit ? 0 : -0.36 * (1 - ((ph - 0.8) / 0.06) ** 2);
          if (hit && !K.hit && g.state === 'play' && g.sound.ctx) {
            const P = g.player.pos, d = Math.hypot(K.x - P.x, K.z - P.z);
            if (d < 42) { const S = g.sound, v = (1 - d / 42) ** 1.5, dest = S.side(Math.max(-1, Math.min(1, ((K.x - P.x) * Math.cos(g.player.yaw) - (K.z - P.z) * Math.sin(g.player.yaw)) / (d || 1))), S.sfx);
              S.noise({ type: 'bandpass', f0: 950, f1: 520, dur: 0.07, vol: 0.55 * v, q: 1.4, att: 0.002, dest }); S.tone({ type: 'triangle', f0: 250, f1: 175, dur: 0.11, vol: 0.5 * v, att: 0.002, rev: 0.3, dest }); }
          }
          K.hit = hit;
        } else K.arm.rotation.x = Math.min(0, K.arm.rotation.x + dt * 3);
      }
      ft -= dt;
      if (ft <= 0) {
        ft = 0.05;
        g.gfx.glow.spawn(fire.x + (Math.random() - 0.5) * 0.3, fire.y + 0.5, fire.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.6, { life: 0.7 + Math.random() * 0.6, s0: 0.3, s1: 0.03, r: 3, g: 1.1, b: 0.25, a: 0.9 });
        g.gfx.soft.spawn(fire.x, fire.y + 1.2, fire.z, 0.4, 1.4, 0.2, { life: 3, s0: 0.3, s1: 1.8, r: 0.5, g: 0.5, b: 0.5, a: 0.18, drag: 0.2 });
        for (let i = 0; i < 2; i++) g.gfx.soft.spawn(fallX - 1 + (Math.random() - 0.5) * 4, poolY + 0.5, fallZ + (Math.random() - 0.5) * 5, -1.2 - Math.random(), 1.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5, { life: 3 + Math.random() * 2, s0: 1.2, s1: 6, r: 0.95, g: 0.97, b: 1, a: 0.16, drag: 0.4 });
      }
    },
  };
}

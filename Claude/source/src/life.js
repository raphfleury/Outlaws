// Life that has nothing to do with the fight:
//  - birds: small flocks peck on open ground and take wing when a shot rings out or someone comes too near, circle, and settle elsewhere;
//    in every chapter, crows, sparrows, gulls or egrets as the place has them;
//  - wind: now and then a gust lifts the dust (or the snow) and drives it along the ground; on dry plains a dust devil wanders across;
//  - chapter I: a train comes in from the west along the line, stops short of the depot with its bell ringing, and backs out again;
//  - chapter VII: a tank grinds across the town along the street that crosses the prospekt, turns round at the far end, and goes back.
// The train and the tank are solid (they push whoever stands in their way, and a heavy knock hurts); they are the same in both
// browsers of a duel only roughly: each browser drives its own, from the same timetable.
import * as THREE from 'three';
import { gBox, gCyl, gCone, gSph } from './actors.js';
import { merge } from './build.js';

const BIRDS = {
  west: { n: [6, 9], c: 0x18181c, size: 1.15, flocks: 3 }, japan: { n: [5, 8], c: 0x141418, size: 1.1, flocks: 3 }, swiss: { n: [7, 11], c: 0x6a5238, size: 0.7, flocks: 3 },
  greece: { n: [5, 8], c: 0xe8ecef, size: 1.25, flocks: 3, wing: 0x9aa0a8 }, north: { n: [4, 7], c: 0xdfe4e8, size: 1.25, flocks: 2, wing: 0x8a9096 }, war: { n: [5, 8], c: 0xe0e4e8, size: 1.2, flocks: 3, wing: 0x8a9096 },
  russia: { n: [6, 10], c: 0x5a5e66, size: 0.95, flocks: 3 }, tibet: { n: [5, 8], c: 0x121216, size: 1.1, flocks: 3, beak: 0xc81c1c }, aztec: { n: [5, 8], c: 0xf2f2ee, size: 1.3, flocks: 3, wing: 0xe8e8e4 },
};
const WIND = { west: { dust: true, devil: true }, greece: { dust: true }, tibet: { dust: true, devil: true }, aztec: { dust: true }, russia: { snow: true }, north: { snow: true }, swiss: { dust: true } };

export class Life {
  constructor(game) { this.game = game; this.flocks = []; this.train = null; this.tank = null; this.car = null; this.gustT = 6; this.devil = null; this.devilT = 20; this._v = new THREE.Vector3(); }

  /** After a chapter is built (and its route grid made). */
  setup() {
    const G = this.game;
    this.flocks = []; this.train = null; this.tank = null; this.car = null; this.devil = null; this.gustT = 4 + Math.random() * 4; this.devilT = 15 + Math.random() * 15;
    if (!G.nav) return;
    const id = G.def.id, B = BIRDS[id];
    if (B) this.makeBirds(B);
    if (id === 'west') this.makeTrain();
    if (id === 'russia') { this.makeTank(); this.makeCar(); }
    const w = Math.random() * 6.283; this.wind = { x: Math.cos(w), z: Math.sin(w) };
  }

  // ---- birds ---------------------------------------------------------------------------------
  makeBirds(B) {
    const G = this.game, wingC = B.wing ?? B.c, s = 0.17 * B.size;
    const body = merge([gSph(1, B.c, [0, 0, 0], [0.55, 0.5, 1.2], 8), gSph(0.45, B.c, [0, 0.25, 1.0], 1, 7), gCone(0.14, 0.4, B.beak ?? 0xd8a030, [0, 0.22, 1.5], [Math.PI / 2, 0, 0], 1, 5), gCone(0.35, 0.8, B.c, [0, 0.05, -1.4], [-Math.PI / 2, 0, 0], [1, 1, 0.3], 5)]);
    const wingG = merge([gBox(1.9, 0.06, 0.9, wingC, [0.95, 0, 0])]);
    for (let f = 0; f < B.flocks; f++) {
      const spot = this.spot(); if (!spot) continue;
      const n = B.n[0] + Math.floor(Math.random() * (B.n[1] - B.n[0] + 1)), birds = [];
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group(), b = new THREE.Mesh(body, G.M.flat), wl = new THREE.Mesh(wingG, G.M.flat), wr = new THREE.Mesh(wingG, G.M.flat);
        wr.scale.x = -1; b.castShadow = true; g.add(b, wl, wr); g.scale.setScalar(s); G.gfx.root.add(g);
        birds.push({ g, wl, wr, ox: (Math.random() - 0.5) * 4, oz: (Math.random() - 0.5) * 4, oy: (Math.random() - 0.5) * 2, ph: Math.random() * 6, hop: Math.random() * 3 });
      }
      const fl = { birds, state: 'ground', x: spot.x, y: spot.y, z: spot.z, t: 0, vx: 0, vy: 0, vz: 0, cx: 0, cz: 0, R: 0, tx: 0, ty: 0, tz: 0 };
      if (f === 0) this.takeOff(fl, spot.x + 5, spot.z, true);                    // one flock is already in the air
      this.flocks.push(fl);
    }
  }
  /** A place for birds to settle: open ground under the open sky, not right by the player. */
  spot() {
    const G = this.game, nav = G.nav, W = G.world, P = G.player.pos, o = { x: 0, y: 0, z: 0 }, up = { x: 0, y: 1, z: 0 };
    for (let i = 0; i < 40; i++) {
      const k = Math.floor(Math.random() * nav.free.length);
      if (!nav.free[k] || !nav.onT[k]) continue;
      const x = nav.x0 + ((k % nav.nx) + 0.5) * nav.cell, z = nav.z0 + (Math.floor(k / nav.nx) + 0.5) * nav.cell, y = nav.hgt[k];
      if ((x - P.x) ** 2 + (z - P.z) ** 2 < 400) continue;
      o.x = x; o.y = y + 0.3; o.z = z; if (W.raycast(o, up, 40)) continue;
      return { x, y, z };
    }
    return null;
  }
  takeOff(fl, fromX, fromZ, quiet) {
    if (fl.state === 'fly' || fl.state === 'up') return;
    const dx = fl.x - fromX, dz = fl.z - fromZ, d = Math.hypot(dx, dz) || 1;
    fl.state = 'up'; fl.t = 0; fl.vx = dx / d * 7; fl.vz = dz / d * 7; fl.vy = 5;
    fl.cx = fl.x + dx / d * 30; fl.cz = fl.z + dz / d * 30; fl.R = 14 + Math.random() * 14; fl.alt = fl.y + 18 + Math.random() * 14; fl.circle = 12 + Math.random() * 18;
    if (!quiet) this.game.sound.flutter(Math.min(1, Math.hypot(fl.x - this.game.player.pos.x, fl.z - this.game.player.pos.z) / 60));
  }
  /** A shot, a blast: the birds around take wing. */
  alarm(x, z, r) { for (const fl of this.flocks) if (fl.state === 'ground' && (fl.x - x) ** 2 + (fl.z - z) ** 2 < r * r) this.takeOff(fl, x, z); }
  birds(dt, t) {
    const G = this.game, P = G.player;
    for (const fl of this.flocks) {
      fl.t += dt;
      if (fl.state === 'ground') {
        const near = P.sneaking || P.crouch ? 3.5 : 8;
        if ((fl.x - P.pos.x) ** 2 + (fl.z - P.pos.z) ** 2 < near * near && !P.dead) this.takeOff(fl, P.pos.x, P.pos.z);
      } else if (fl.state === 'up') {                                   // away from the danger and up
        fl.vy = Math.max(1.5, fl.vy - dt * 1.2); fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.z += fl.vz * dt;
        if (fl.y > fl.alt || fl.t > 6) { fl.state = 'fly'; fl.t = 0; fl.ang = Math.atan2(fl.z - fl.cz, fl.x - fl.cx); }
      } else if (fl.state === 'fly') {                                  // circling, then off to settle somewhere else
        fl.ang += dt * 8 / fl.R; fl.x = fl.cx + Math.cos(fl.ang) * fl.R; fl.z = fl.cz + Math.sin(fl.ang) * fl.R; fl.y += (fl.alt - fl.y) * Math.min(1, dt);
        if (fl.t > fl.circle) { const s = this.spot(); if (s) { fl.state = 'down'; fl.t = 0; fl.tx = s.x; fl.ty = s.y; fl.tz = s.z; } else fl.t = 0; }
      } else if (fl.state === 'down') {                                 // the glide down
        const dx = fl.tx - fl.x, dy = fl.ty - fl.y, dz = fl.tz - fl.z, d = Math.hypot(dx, dy, dz), sp = Math.min(9, d * 1.2 + 1.5);
        if (d < 0.3) { fl.state = 'ground'; fl.x = fl.tx; fl.y = fl.ty; fl.z = fl.tz; fl.t = 0; }
        else { fl.x += dx / d * sp * dt; fl.y += dy / d * sp * dt; fl.z += dz / d * sp * dt; }
      }
      const flying = fl.state !== 'ground', heading = flying ? (fl.state === 'fly' ? fl.ang + Math.PI / 2 : Math.atan2(fl.state === 'up' ? fl.vx : fl.tx - fl.x, fl.state === 'up' ? fl.vz : fl.tz - fl.z)) : 0;
      for (const b of fl.birds) {
        const g = b.g;
        if (flying) {
          const flap = Math.sin(t * (fl.state === 'down' ? 9 : 16) + b.ph) * (fl.state === 'fly' && Math.sin(t * 0.7 + b.ph) > 0.4 ? 0.15 : 0.9);   // flapping, or now and then a glide
          g.position.set(fl.x + b.ox * 1.4, fl.y + b.oy + Math.sin(t * 1.3 + b.ph) * 0.4, fl.z + b.oz * 1.4);
          g.rotation.set(fl.state === 'up' ? -0.4 : fl.state === 'down' ? 0.25 : 0, fl.state === 'fly' ? -fl.ang : heading, fl.state === 'fly' ? 0.35 : 0, 'YXZ');
          b.wl.rotation.z = flap; b.wr.rotation.z = -flap;
        } else {                                                         // pecking and hopping about
          b.hop -= dt;
          if (b.hop <= 0) { b.hop = 0.6 + Math.random() * 2.5; b.ox = Math.max(-3, Math.min(3, b.ox + (Math.random() - 0.5) * 0.8)); b.oz = Math.max(-3, Math.min(3, b.oz + (Math.random() - 0.5) * 0.8)); b.yaw = Math.random() * 6.283; }
          const peck = Math.max(0, Math.sin(t * 7 + b.ph)) * 0.6, x = fl.x + b.ox, z = fl.z + b.oz;
          g.position.set(x, G.world.groundAt(x, z, fl.y + 0.5) + 0.09 * g.scale.x / 0.17 + (b.hop > 0.45 ? 0 : Math.sin(b.hop / 0.45 * Math.PI) * 0.1), z);
          g.rotation.set(peck, b.yaw ?? 0, 0, 'YXZ'); b.wl.rotation.z = 0.05; b.wr.rotation.z = -0.05;
        }
      }
    }
  }

  // ---- wind ----------------------------------------------------------------------------------
  gusts(dt, t) {
    const G = this.game, w = WIND[G.def.id]; if (!w) return;
    const P = G.player.pos, S = G.gfx.soft, dust = G.level.dust || [0.7, 0.6, 0.5], snow = w.snow;
    const c = snow ? [0.95, 0.97, 1] : [dust[0] * 0.95, dust[1] * 0.9, dust[2] * 0.85];
    this.gustT -= dt;
    if (this.gustT <= 0) {                                              // a gust: a sheet of dust or snow swept along the ground past the player
      this.gustT = 5 + Math.random() * 9;
      const W = this.wind, side = (Math.random() - 0.5) * 30, ux = P.x - W.x * 18 - W.z * side, uz = P.z - W.z * 18 + W.x * side;
      this.gust = { x: ux, z: uz, t: 3.2 };
      G.sound.gust(WIND[G.def.id].snow);
    }
    if (this.gust && (this.gust.t -= dt) > 0) {
      const g = this.gust, W = this.wind;
      g.x += W.x * 7 * dt; g.z += W.z * 7 * dt;
      for (let i = 0; i < 6; i++) {
        const along = (Math.random() - 0.5) * 6, x = g.x - W.z * along * 2 + (Math.random() - 0.5) * 3, z = g.z + W.x * along * 2 + (Math.random() - 0.5) * 3, y = G.world.height(x, z);
        S.spawn(x, y + Math.random() * 0.4, z, W.x * (5 + Math.random() * 4), 0.3 + Math.random() * 0.8, W.z * (5 + Math.random() * 4), { life: 1.4 + Math.random() * 1.2, s0: 0.25, s1: 1.6, r: c[0], g: c[1], b: c[2], a: snow ? 0.32 : 0.22, grav: -0.15, drag: 0.6 });
      }
    }
    if (w.devil) {                                                     // a dust devil wandering across the open ground
      this.devilT -= dt;
      if (!this.devil && this.devilT <= 0) {
        const a = Math.random() * 6.283, x = P.x + Math.cos(a) * 30, z = P.z + Math.sin(a) * 30, k = G.nav.idx(x, z);
        if (k >= 0 && G.nav.onT[k]) this.devil = { x, z, t: 9, vx: this.wind.x * 2 + (Math.random() - 0.5), vz: this.wind.z * 2 + (Math.random() - 0.5) };
        this.devilT = 25 + Math.random() * 25;
      }
      const d = this.devil;
      if (d) {
        d.t -= dt; d.x += d.vx * dt; d.z += d.vz * dt; const y = G.world.height(d.x, d.z), k = Math.min(1, d.t / 2, (9 - d.t) / 2);
        for (let i = 0; i < 5; i++) {
          const h = Math.random() * 6, a = t * 6 + Math.random() * 6.283, r = 0.3 + h * 0.25;
          S.spawn(d.x + Math.cos(a) * r, y + h, d.z + Math.sin(a) * r, -Math.sin(a) * 5 + d.vx, 1.5 + Math.random(), Math.cos(a) * 5 + d.vz, { life: 1.1, s0: 0.3, s1: 1.1, r: c[0], g: c[1], b: c[2], a: 0.3 * k, grav: -0.3, drag: 1.2 });
        }
        if (d.t <= 0) this.devil = null;
      }
    }
  }

  // ---- chapter I: the train ------------------------------------------------------------------
  makeTrain() {
    const G = this.game, M = G.M, ZT = -50, X = Math.PI / 2, BL = 0x1c1c20, RD = 0x8a1c1c, BR = 0xc9a050, IR = 0x2a2a2e;
    const wheels = (list, xs, r = 0.5, c = IR) => { for (const x of xs) for (const s of [-1, 1]) list.push(gCyl(r, r, 0.12, c, [x, r, s * 0.72], [X, 0, 0], 1, 14)); };
    const loco = [], locoM = [];
    loco.push(gBox(6.4, 0.35, 2.3, BL, [0, 0.95, 0]), gBox(2.3, 2.5, 2.5, RD, [-2.0, 2.3, 0]), gBox(2.6, 0.18, 2.8, BL, [-2.0, 3.62, 0]),
      gBox(0.9, 0.7, 0.05, 0x2a2018, [-2.0, 2.9, 1.26]), gBox(0.9, 0.7, 0.05, 0x2a2018, [-2.0, 2.9, -1.26]), gCone(0.9, 1.3, RD, [3.65, 0.75, 0], [0, 0, -X], [1, 1, 1.4], 4));
    locoM.push(gCyl(0.78, 0.78, 4.3, BL, [1.15, 2.05, 0], [0, 0, X], 1, 14), gCyl(0.82, 0.82, 0.1, BR, [3.25, 2.05, 0], [0, 0, X], 1, 14), gCyl(0.25, 0.55, 1.2, BL, [2.6, 3.25, 0], [0, 0, 0], 1, 10),
      gSph(0.35, BR, [0.6, 2.9, 0]), gCyl(0.22, 0.22, 0.35, 0xf8e8b0, [3.35, 2.95, 0], [0, 0, X], 1, 10));
    wheels(locoM, [1.8, 0.1, -1.6], 0.72, RD); wheels(locoM, [3.0], 0.42);
    const tender = [gBox(3.6, 1.5, 2.4, BL, [0, 1.55, 0]), gBox(3.3, 0.35, 2.1, 0x101010, [0, 2.4, 0])], tenderM = []; wheels(tenderM, [-1.1, 1.1], 0.45);
    const box = [gBox(8.6, 2.6, 2.6, 0x7a3024, [0, 2.3, 0]), gBox(8.8, 0.2, 2.8, 0x5a2018, [0, 3.7, 0]), gBox(1.6, 2.2, 0.05, 0x5a2018, [0, 2.2, 1.32])], boxM = []; wheels(boxM, [-3.2, -2.2, 2.2, 3.2], 0.45);
    const coach = [gBox(9, 2.5, 2.6, 0x2c4a32, [0, 2.3, 0]), gBox(9.4, 0.25, 2.9, 0x1c2a1e, [0, 3.65, 0])], coachM = []; wheels(coachM, [-3.4, -2.4, 2.4, 3.4], 0.45);
    for (let i = -3; i <= 3; i++) for (const s of [-1, 1]) coach.push(gBox(0.7, 0.6, 0.05, 0xf0d890, [i * 1.2, 2.6, s * 1.31]));
    const part = (flat, metal, len) => { const g = new THREE.Group(); g.add(new THREE.Mesh(merge(flat), M.flat)); if (metal.length) g.add(new THREE.Mesh(merge(metal), M.metal)); g.traverse((o) => { o.castShadow = true; }); G.gfx.root.add(g); return { g, len }; };
    const cars = [part(loco, locoM, 7.4), part(tender, tenderM, 3.8), part(box, boxM, 8.8), part(coach, coachM, 9.4)];
    for (const c of cars) { G.world.addBox(-400, ZT, c.len, 2.8, 0, -1, 4); c.col = G.world.boxes[G.world.boxes.length - 1]; }
    this.train = { cars, x: -400, v: 0, state: 'away', t: 18 + Math.random() * 15, ZT, chuff: 0, stop: -32, start: -185 };
  }
  trainUpdate(dt) {
    const T = this.train, G = this.game, W = G.world, P = G.player;
    T.t -= dt;
    if (T.state === 'away' && T.t <= 0) { T.state = 'in'; T.x = T.start; T.v = 9; G.sound.whistle(this.far(T.x, T.ZT)); }
    else if (T.state === 'in') { const left = T.stop - T.x; T.v = Math.max(0.6, Math.min(9, Math.sqrt(Math.max(0, left) * 1.6))); if (left <= 0.05) { T.state = 'wait'; T.v = 0; T.t = 16 + Math.random() * 8; T.bell = 0; } }
    else if (T.state === 'wait') { T.bell -= dt; if (T.bell <= 0 && T.t > 4) { T.bell = 1.1; G.sound.bell(this.far(T.x, T.ZT)); } if (T.t <= 0) { T.state = 'out'; G.sound.whistle(this.far(T.x, T.ZT)); } }
    else if (T.state === 'out') { T.v = Math.max(-9, T.v - dt * 1.2); if (T.x < T.start - 30) { T.state = 'away'; T.t = 80 + Math.random() * 80; T.x = -400; T.v = 0; } }
    T.x += T.v * dt;
    // the cars, one behind the other along the line; on the dunes west of the town they ride up and down with the ground
    let x = T.x;
    for (const c of T.cars) {
      const cx = x - c.len / 2, y0 = cx < -100 ? W.height(cx, T.ZT) : 0, ya = cx - 2 < -100 ? W.height(cx - 2, T.ZT) : 0, yb = cx + 2 < -100 ? W.height(cx + 2, T.ZT) : 0;
      c.g.position.set(cx, y0 + 0.12, T.ZT); c.g.rotation.z = Math.atan2(yb - ya, 4); c.g.visible = T.state !== 'away';
      c.col.x = T.state === 'away' ? -400 : cx; c.col.y0 = y0 - 1; c.col.y1 = y0 + 3.9;
      x -= c.len + 0.5;
    }
    if (T.state === 'away') return;
    const sp = Math.abs(T.v);
    T.chuff -= dt * (0.6 + sp * 0.55);
    if (T.chuff <= 0) {                                                 // the beat of the engine, and its smoke
      T.chuff = 1; const f = this.far(T.x, T.ZT);
      if (sp > 0.2) G.sound.chuff(f);
      const sy = (T.x - 3.7 < -100 ? W.height(T.x - 3.7, T.ZT) : 0) + 4;         // out of the smokestack, near the front of the engine
      for (let i = 0; i < 4; i++) G.gfx.soft.spawn(T.x - 1.1, sy, T.ZT + (Math.random() - 0.5) * 0.3, -T.v * 0.3 + (Math.random() - 0.5), 2.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8, { life: 3 + Math.random() * 2, s0: 0.6, s1: 3.5, r: 0.85, g: 0.84, b: 0.82, a: 0.45, grav: -0.4, drag: 0.4 });
    }
    this.knock(T.cars.map((c) => c.col), sp, 'train');
  }

  // ---- chapter VII: the tank -----------------------------------------------------------------
  makeTank() {
    const G = this.game, W = G.world, M = G.M, X = Math.PI / 2, GR = 0x4a5236, DK = 0x2a2e22;
    // its road: the street that crosses the prospekt at z = 22, clear of everything solid for a body as wide as the tank from x = 88 (near the
    // eastern edge, where it comes in) to x = -56, where it stops, turns round and goes back
    const route = { z: 22, x0: 88, x1: -56 };
    const hull = [gBox(6.4, 1.0, 3.2, GR, [0, 1.2, 0]), gBox(1.6, 0.6, 3.1, GR, [3.6, 1.0, 0], [0, 0, 0.5]), gBox(6.8, 0.25, 3.4, DK, [0, 1.75, 0])];
    for (const s of [-1, 1]) { hull.push(gBox(7.0, 1.0, 0.65, DK, [0, 0.55, s * 1.45])); for (let i = -3; i <= 3; i++) hull.push(gCyl(0.38, 0.38, 0.7, 0x22261c, [i * 0.9, 0.45, s * 1.45], [X, 0, 0], 1, 10)); }
    const turret = [gCyl(1.25, 1.45, 0.75, GR, [0, 0.38, 0], [0, 0, 0], [1, 1, 1.05], 18), gSph(0.9, GR, [0, 0.75, 0], [1, 0.4, 1], 12), gBox(0.25, 0.25, 0.04, 0xc81c1c, [0.2, 0.45, 1.36]), gBox(0.25, 0.25, 0.04, 0xc81c1c, [0.2, 0.45, -1.36])];
    const gun = [gCyl(0.1, 0.12, 4.2, DK, [2.6, 0, 0], [0, 0, X], 1, 10), gCyl(0.16, 0.16, 0.4, DK, [4.6, 0, 0], [0, 0, X], 1, 10)];
    const g = new THREE.Group(), tur = new THREE.Group(), gm = new THREE.Mesh(merge(gun), M.metal);
    g.add(new THREE.Mesh(merge(hull), M.metal)); tur.add(new THREE.Mesh(merge(turret), M.metal), gm); gm.position.y = 0.4; tur.position.y = 1.85; g.add(tur);
    g.traverse((q) => { q.castShadow = true; }); g.visible = false; G.gfx.root.add(g);      // the model's front is its +X
    W.addBox(-400, route.z, 7.2, 3.4, 0, -1, 2.7); const col = W.boxes[W.boxes.length - 1];
    this.tank = { g, tur, col, route, x: -400, z: route.z, ry: Math.PI, v: 0, state: 'away', t: 25 + Math.random() * 25, rumble: 0 };
  }
  tankUpdate(dt, t) {
    const T = this.tank, G = this.game, W = G.world, R = T.route;
    T.t -= dt;
    if (T.state === 'away') { T.g.visible = false; T.col.x = -400; if (T.t > 0) return; T.state = 'in'; T.x = R.x0; T.ry = Math.PI; T.v = 0; }
    if (T.state === 'in') { T.v = Math.min(4.2, T.v + dt * 1.2, Math.max(0.4, (T.x - R.x1) * 0.6)); T.x -= T.v * dt; if (T.x <= R.x1 + 0.05) { T.state = 'turn'; T.t = 4.5; T.v = 0; } }
    else if (T.state === 'turn') { T.ry = Math.PI + Math.PI * Math.min(1, 1 - T.t / 4.5); if (T.t <= 0) { T.state = 'wait'; T.t = 6 + Math.random() * 6; } }   // round on its tracks
    else if (T.state === 'wait') { if (T.t <= 0) T.state = 'out'; }
    else if (T.state === 'out') { T.ry = 0; T.v = Math.min(4.2, T.v + dt * 1.2); T.x += T.v * dt; if (T.x >= R.x0) { T.state = 'away'; T.t = 50 + Math.random() * 60; T.v = 0; } }
    const y = W.height(T.x, T.z), moving = T.state === 'in' || T.state === 'out' || T.state === 'turn';
    T.g.visible = true; T.g.position.set(T.x, y + (moving ? Math.sin(t * 9) * 0.02 : 0), T.z); T.g.rotation.y = T.ry;
    T.tur.rotation.y = Math.sin(t * 0.17) * 0.9;                       // the turret looks slowly from side to side
    T.col.x = T.x; T.col.z = T.z; T.col.c = Math.cos(T.ry); T.col.s = Math.sin(T.ry); T.col.y0 = y - 1; T.col.y1 = y + 2.7;
    T.rumble -= dt;
    if (T.rumble <= 0) {
      T.rumble = moving ? 0.14 : 0.3; const f = this.far(T.x, T.z);
      if (f < 1) G.sound.rumble(f + (moving ? 0 : 0.3));
      if (Math.random() < 0.5) G.gfx.soft.spawn(T.x - Math.cos(T.ry) * 3.6, y + 1.5, T.z + Math.sin(T.ry) * 3.6, (Math.random() - 0.5) * 0.6, 0.8, (Math.random() - 0.5) * 0.6, { life: 2.5, s0: 0.4, s1: 2, r: 0.2, g: 0.2, b: 0.2, a: 0.35, grav: -0.3, drag: 0.5 });
    }
    if (moving && Math.random() < dt * 2) G.crowd.alarm(T.x, T.z, 14, T.x, T.z);        // people get out of its way
    // crushing: a crate or a fence in its way goes
    for (const p of W.pieces) if (!p.broken && Math.abs(p.x - T.x) < 3.8 + p.r && Math.abs(p.z - T.z) < 2 + p.r) G.havoc.breakPiece(p, false);
    this.knock([T.col], moving ? Math.max(T.v, 2.5) : 0, 'tank');
  }

  /** Something heavy moving: whoever stands in its way is pushed aside (World.collide does that), and a knock at speed hurts the player. */
  knock(cols, speed, what) {
    const G = this.game, P = G.player;
    this.hurtT = Math.max(0, (this.hurtT || 0) - 1 / 60);
    if (speed < 2 || P.dead || this.hurtT > 0) return;
    for (const b of cols) {
      const dx = P.pos.x - b.x, dz = P.pos.z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      if (Math.abs(lx) < b.hw + 0.45 && Math.abs(lz) < b.hd + 0.45 && P.pos.y < b.y1 && P.pos.y + 1.7 > b.y0) { this.hurtT = 1.5; G.hurtPlayer(what === 'train' ? 40 : 30, { x: b.x, z: b.z }, true); G.say(what === 'train' ? 'Hit by the train' : what === 'car' ? 'Hit by a car' : 'Knocked down by the tank'); break; }
    }
  }
  far(x, z) { const P = this.game.player.pos; return Math.min(1, Math.hypot(x - P.x, z - P.z) / 140); }

  update(dt, t) {
    if (!this.game.nav) return;
    this.birds(dt, t);
    this.gusts(dt, t);
    if (this.train) this.trainUpdate(dt);
    if (this.tank) this.tankUpdate(dt, t);
    if (this.car) this.carUpdate(dt, t);
  }

  // ---- chapter VII: a Volga up the prospekt ----------------------------------------------------
  // A black car of the Committee drives in from the south along the prospekt (between the tram and the parked cars), as far as
  // the checkpoint, turns round there and drives out again; then, a minute later, another time. It pushes whoever is in its way.
  makeCar() {
    const G = this.game, W = G.world, M = G.M, X = Math.PI / 2, C = 0x16161a, GL = 0x1c2630;
    const parts = [gBox(1.8, 0.6, 4.6, C, [0, 0.55, 0]), gBox(1.6, 0.5, 2.3, C, [0, 1.1, -0.2]), gBox(1.62, 0.36, 2.0, GL, [0, 1.12, -0.2]), gBox(1.78, 0.08, 4.62, 0xb8bcc0, [0, 0.62, 0])];
    for (const [x, z] of [[0.85, 1.45], [-0.85, 1.45], [0.85, -1.45], [-0.85, -1.45]]) parts.push(gCyl(0.33, 0.33, 0.22, 0x101012, [x, 0.33, z], [0, 0, X], 1, 10));
    const g = new THREE.Group(); g.add(new THREE.Mesh(merge(parts), M.metal));
    const lights = merge([gBox(0.26, 0.14, 0.04, 0xfff0c0, [0.6, 0.66, 2.31]), gBox(0.26, 0.14, 0.04, 0xfff0c0, [-0.6, 0.66, 2.31]), gBox(0.22, 0.1, 0.04, 0xff3020, [0.65, 0.68, -2.31]), gBox(0.22, 0.1, 0.04, 0xff3020, [-0.65, 0.68, -2.31])]);
    g.add(new THREE.Mesh(lights, M.glow)); g.traverse((q) => { q.castShadow = true; }); g.visible = false; G.gfx.root.add(g);   // the model's front is its +Z
    const col = W.addBox(-400, 0, 1.9, 4.7, 0, -1, 1.5);
    this.car = { g, col, x: -3.3, z: 115, ry: Math.PI, v: 0, state: 'away', t: 8 + Math.random() * 20, hum: 0, turn: 0 };
  }
  carUpdate(dt, t) {
    const C = this.car, G = this.game, W = G.world, LANE = 3.3, STOP = 37, R = LANE;
    C.t -= dt;
    if (C.state === 'away') { C.g.visible = false; C.col.x = -400; if (C.t > 0) return; C.state = 'in'; C.x = -LANE; C.z = 115; C.ry = Math.PI; C.v = 0; }
    if (C.state === 'in') { C.v = Math.min(9, C.v + dt * 3, Math.max(1.2, (C.z - STOP) * 0.7)); C.z -= C.v * dt; if (C.z <= STOP + 0.05) { C.state = 'turn'; C.turn = 0; } }
    else if (C.state === 'turn') {                                   // round in a half circle to the other side of the road
      C.turn = Math.min(Math.PI, C.turn + dt * 0.9); C.x = -R * Math.cos(C.turn); C.z = STOP - R * Math.sin(C.turn); C.ry = Math.PI - C.turn;
      if (C.turn >= Math.PI) { C.state = 'out'; C.v = 2; }
    } else if (C.state === 'out') { C.ry = 0; C.v = Math.min(9, C.v + dt * 3); C.x = LANE; C.z += C.v * dt; if (C.z >= 115) { C.state = 'away'; C.t = 40 + Math.random() * 50; } }
    const y = W.height(C.x, C.z); C.g.visible = true; C.g.position.set(C.x, y, C.z); C.g.rotation.y = C.ry;
    C.col.x = C.x; C.col.z = C.z; C.col.c = Math.cos(C.ry); C.col.s = Math.sin(C.ry); C.col.y0 = y - 1; C.col.y1 = y + 1.5;
    C.hum -= dt; if (C.hum <= 0) { C.hum = 0.18; const f = this.far(C.x, C.z) * 1.6; if (f < 1) G.sound.engine(f); }
    if (Math.random() < dt * 3) G.crowd.alarm(C.x + Math.sin(C.ry) * 4, C.z + Math.cos(C.ry) * 4, 4, C.x, C.z);     // out of its way
    this.knock([C.col], C.v, 'car');
  }
}

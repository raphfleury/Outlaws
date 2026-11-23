// Things that break and things that blow up.
//  - Crates, barrels and jars are "pieces" (see Builder.piece): shot or struck often enough, they vanish from the merged meshes,
//    lose their colliders, fly apart in splinters or shards, and whatever stood on them comes down too.
//  - In the chapters of gunpowder, one barrel in three is a red powder keg: it explodes, and so do the bombs the player throws.
//  - In a duel, a piece broken by a shot is reported to the other browser, which breaks the same piece; explosions are worked out
//    in each browser for its own player (and, on the host, for the computer enemies).
import * as THREE from 'three';

const _c = new THREE.Color();

export class Havoc {
  constructor(game) {
    this.game = game; this.debris = []; this.queue = []; this.mats = new Map(); this.fires = [];
    this.chunk = new THREE.BoxGeometry(1, 1, 1);
  }
  reset() { for (const d of this.debris) d.mesh.removeFromParent(); this.debris = []; this.queue = []; this.tgrid = null; this.fires = []; }

  /**
   * A Molotov cocktail bursts: a pool of fire of radius 3 m burns for about seven seconds. It hurts whoever stands in it (this player,
   * and the enemies simulated here), sets the bystanders running and burns the wooden things around. A ghost fire (the other player's)
   * does not break pieces here: that is reported from the browser where it was thrown.
   */
  fire(x, y, z, o = {}) {
    const G = this.game, W = G.world, fl = W.groundAt ? W.groundAt(x, z, y + 0.3) : W.height(x, z);
    const f = { x, y: Math.max(fl, y - 1.5), z, r: 3, t: 7, tick: 0, ghost: !!o.ghost, from: o.from };
    this.fires.push(f);
    G.flashLight.position.set(x, f.y + 1, z); G.flashLight.intensity = 260;
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 5; G.gfx.glow.spawn(x, f.y + 0.3, z, Math.cos(a) * v, 1 + Math.random() * 3, Math.sin(a) * v, { life: 0.4 + Math.random() * 0.4, s0: 0.7, s1: 0.2, r: 4, g: 1.8 + Math.random(), b: 0.4, a: 1, drag: 2.5 }); }
    G.sound.flame(this.far(x, z));
    if (!o.ghost) { G.makeNoise(x, z, 15, true); G.crowd.alarm(x, z, 14, x, z); }
  }
  updateFires(dt) {
    const G = this.game, P = G.player, S = G.gfx.soft, Gl = G.gfx.glow, D = G.duel && G.duel.cfg ? G.duel : null;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i]; f.t -= dt;
      if (f.t <= 0) { this.fires.splice(i, 1); continue; }
      const k = Math.min(1, f.t / 1.5);                              // it dies down at the end
      for (let n = 0; n < 3; n++) if (Math.random() < dt * 60 * k) {
        const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * f.r;
        Gl.spawn(f.x + Math.cos(a) * r, f.y + 0.1, f.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 0.6, { life: 0.35 + Math.random() * 0.35, s0: 0.45, s1: 0.08, r: 4, g: 1.5 + Math.random() * 0.8, b: 0.3, a: 1, drag: 1.5, grav: -1 });
      }
      if (Math.random() < dt * 8 * k) S.spawn(f.x + (Math.random() - 0.5) * 3, f.y + 1.2, f.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.8, 1.5 + Math.random(), (Math.random() - 0.5) * 0.8, { life: 2.5 + Math.random() * 1.5, s0: 0.8, s1: 3, r: 0.12, g: 0.1, b: 0.09, a: 0.55, grav: -0.4, drag: 0.8 });
      if (Math.random() < dt * 2.5) G.sound.crackle(this.far(f.x, f.z));
      f.tick -= dt; if (f.tick > 0) continue;
      f.tick = 0.3;
      const inside = (x, y, z, h = 2) => Math.hypot(x - f.x, z - f.z) < f.r && y > f.y - 1 && y < f.y + h;
      if (!P.dead && inside(P.pos.x, P.pos.y, P.pos.z) && !(f.ghost && D && D.mateOf(f.from))) { if (f.ghost && D) D.blame(f.from); G.hurtPlayer(7, { x: f.x, z: f.z }, false); }   // a team-mate's fire does not burn
      for (const e of G.enemies) {
        if (!e.alive || e.remote || e.puppet || e.state === 'hidden' || !inside(e.pos.x, e.pos.y, e.pos.z)) continue;
        G.hitEnemy(e, 9, false, e.pos.x, e.pos.y + 0.5, e.pos.z, f.x, f.z, true);
        if (e.alive && e.flee) e.flee(f.x, f.z);                     // nobody stays in a fire
      }
      for (const w of G.crowd.list) if (!w.dead && inside(w.px, w.py, w.pz)) G.crowd.hit(w, 6, w.px, w.py + 0.5, w.pz, !f.ghost, !f.ghost);
      if (!f.ghost) for (const q of G.world.pieces) {
        if (q.broken || (q.kind !== 'wood' && q.kind !== 'straw' && q.kind !== 'cloth' && q.kind !== 'paper')) continue;
        if (Math.hypot(q.x - f.x, q.z - f.z) < f.r + q.r * 0.5 && q.y < f.y + 1.5 && q.top > f.y - 0.5) this.damage(q, q.wall ? 14 : 9);
      }
    }
  }

  // ---- small things (trinkets): no collider, found by their bounding spheres in a grid of 2 m cells ------------------
  grid() {
    if (this.tgrid) return this.tgrid;
    const m = (this.tgrid = new Map());
    for (const p of this.game.world.trinkets) {
      if (p.broken) continue;
      for (let i = Math.floor((p.x - p.r) / 2); i <= Math.floor((p.x + p.r) / 2); i++) for (let j = Math.floor((p.z - p.r) / 2); j <= Math.floor((p.z + p.r) / 2); j++) {
        const k = i * 65536 + j; let a = m.get(k); if (!a) m.set(k, (a = [])); a.push(p);
      }
    }
    return m;
  }
  /** Every small thing a ray from o along d meets before distance max: they break, and the shot goes on (a bottle does not stop a bullet). */
  trinketsAlong(o, d, max, send = true) {
    if (!this.game.world.trinkets.length) return;
    const m = this.grid(), seen = new Set(), lim = Math.min(max, 160);
    for (let s = 0; s <= lim + 1; s += 1) {
      const k = Math.floor((o.x + d.x * s) / 2) * 65536 + Math.floor((o.z + d.z * s) / 2);
      if (seen.has(k)) continue; seen.add(k);
      const a = m.get(k); if (!a) continue;
      for (const p of a) {
        if (p.broken) continue;
        const ox = o.x - p.x, oy = o.y - p.cy, oz = o.z - p.z, b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - p.r * p.r, disc = b * b - c;
        if (disc < 0) continue;
        const t = -b - Math.sqrt(disc);
        if (t > -p.r && t < max) this.breakPiece(p, send);
      }
    }
  }

  /** A hit on a piece at (x, y, z): chips fly off in its colour, and it breaks when its strength is used up. */
  damage(p, amount, x, y, z) {
    if (!p || p.broken) return;
    p.hp -= amount;
    if (x !== undefined) {
      _c.set(p.color);
      for (let i = 0; i < 6; i++) this.game.gfx.soft.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3, { life: 0.5 + Math.random() * 0.4, s0: 0.06, s1: 0.04, r: _c.r * 1.4, g: _c.g * 1.4, b: _c.b * 1.4, a: 0.95, grav: 9, drag: 0.5 });
    }
    if (p.hp <= 0) this.breakPiece(p, true);
    else if (x !== undefined) this.wear(p, x, y, z);
  }
  /**
   * The damage shows before the thing gives way. Where it was hit, its surface is dented and blackened (a hole, a split, a crack);
   * and the weaker it gets, the more it leans over on its base, as a fence or a stack of crates does when it is about to go.
   */
  wear(p, x, y, z) {
    const frac = 1 - p.hp / p.hp0, lean = (p.kind === 'clay' ? 0.07 : p.kind === 'straw' || p.kind === 'cloth' ? 0.12 : 0.2) * Math.min(1, p.r) ** 0.3;
    if (p.axis === undefined) { p.axis = Math.random() * 6.283; p.leaned = 0; }
    const da = (frac - p.leaned) * lean; p.leaned = frac;
    const ax = Math.cos(p.axis), az = Math.sin(p.axis), ca = Math.cos(da), sa = Math.sin(da), R = Math.min(0.26, 0.12 + p.r * 0.12), R2 = R * R;
    for (const r of p.ranges) {
      const pos = r.mesh.geometry.attributes.position, col = r.mesh.geometry.attributes.color, a = pos.array, c = col ? col.array : null;
      for (let i = r.start * 3; i < (r.start + r.count) * 3; i += 3) {
        // lean: a turn of da about a level axis through the base (Rodrigues' formula, the axis has no y)
        let vx = a[i] - p.x, vy = a[i + 1] - p.y, vz = a[i + 2] - p.z;
        if (da) {
          const dot = vx * ax + vz * az, cx = az * vy, cy = ax * vz - az * vx, cz = -ax * vy;            // axis × v, with axis = (ax, 0, az)
          vx = vx * ca + cx * sa + ax * dot * (1 - ca); vy = vy * ca + cy * sa; vz = vz * ca + cz * sa + az * dot * (1 - ca);
          a[i] = p.x + vx; a[i + 1] = p.y + vy; a[i + 2] = p.z + vz;
        }
        // the dent and the mark where the shot went in
        const hx = a[i] - x, hy = a[i + 1] - y, hz = a[i + 2] - z, d2 = hx * hx + hy * hy + hz * hz;
        if (d2 < R2) {
          const k = 1 - Math.sqrt(d2) / R, ox = p.x - a[i], oz = p.z - a[i + 2], ol = Math.hypot(ox, oz) || 1;
          a[i] += ox / ol * 0.04 * k + (Math.random() - 0.5) * 0.02 * k; a[i + 1] += (Math.random() - 0.5) * 0.02 * k; a[i + 2] += oz / ol * 0.04 * k + (Math.random() - 0.5) * 0.02 * k;
          if (c) { const m = 1 - 0.6 * k; c[i] *= m; c[i + 1] *= m; c[i + 2] *= m; }
        }
      }
      pos.addUpdateRange(r.start * 3, r.count * 3); pos.needsUpdate = true;
      if (col) { col.addUpdateRange(r.start * 3, r.count * 3); col.needsUpdate = true; }
    }
  }
  /** What a level laid on a table or a chest (merged into the world with everything else): every triangle lying wholly in the space above its top is made to vanish with it. */
  sweep(p) {
    const W = this.game.world, sw = p.sweep, cs = Math.cos(sw.ry || 0), sn = Math.sin(sw.ry || 0);
    const y0 = p.y + (sw.y0 ?? p.top - p.y - 0.04), y1 = p.y + (sw.y1 ?? p.top - p.y + 0.6), hw = sw.hw + 0.05, hd = sw.hd + 0.05, R = Math.hypot(hw, hd);
    const inside = (a, i) => { const y = a[i + 1]; if (y < y0 || y > y1) return false; const dx = a[i] - p.x, dz = a[i + 2] - p.z; if (dx * dx + dz * dz > R * R) return false; return Math.abs(dx * cs - dz * sn) <= hw && Math.abs(dx * sn + dz * cs) <= hd; };
    for (const mesh of W.meshes || []) {
      const at = mesh.geometry.attributes.position, a = at.array; let lo = Infinity, hi = -1;
      for (let i = 0; i < a.length; i += 9) {
        if (!inside(a, i) || !inside(a, i + 3) || !inside(a, i + 6)) continue;
        a[i + 3] = a[i + 6] = a[i]; a[i + 4] = a[i + 7] = a[i + 1]; a[i + 5] = a[i + 8] = a[i + 2];
        lo = Math.min(lo, i); hi = Math.max(hi, i + 9);
      }
      if (hi > 0) { at.addUpdateRange(lo, hi - lo); at.needsUpdate = true; }
    }
    for (const q of W.pieces) {                     // a jar or a crate standing there breaks with it
      if (q.broken || q === p || q.y < y0 - 0.1 || q.y > y1) continue;
      const dx = q.x - p.x, dz = q.z - p.z;
      if (Math.abs(dx * cs - dz * sn) <= hw && Math.abs(dx * sn + dz * cs) <= hd) this.queue.push({ t: 0.1, p: q });
    }
  }

  /** Break a piece. send: tell the other browser of a duel (only for breaks caused here by a shot or a blow). */
  breakPiece(p, send = false) {
    if (p.broken) return;
    const G = this.game, W = G.world;
    p.broken = true;
    if (G.makeNoise) G.makeNoise(p.x, p.z, p.trinket ? 5 : p.wall ? 14 : 9, false);      // something breaking: those near look, the clever go to see
    for (const r of p.ranges) {                     // its shapes collapse to a point inside the merged mesh: they no longer draw
      const a = r.mesh.geometry.attributes.position, arr = a.array, i0 = r.start * 3, x = arr[i0], y = arr[i0 + 1], z = arr[i0 + 2];
      for (let i = i0; i < (r.start + r.count) * 3; i += 3) { arr[i] = x; arr[i + 1] = y; arr[i + 2] = z; }
      a.addUpdateRange(i0, r.count * 3); a.needsUpdate = true;
    }
    if (p.cols.length) W.removeCols(p);
    if (p.sweep) this.sweep(p);
    if (G.nav && p.cols.length) G.nav.refresh(p.x - p.r, p.z - p.r, p.x + p.r, p.z + p.r);
    if (p.seat) G.crowd.seatGone(p);                         // whoever sat on it gets up in a hurry
    // splinters or shards, and a puff of dust
    const soft = p.kind === 'straw' || p.kind === 'cloth' || p.kind === 'paper', big = Math.min(1, p.r / 1.2);
    const n = p.trinket ? 3 : Math.round((p.kind === 'clay' ? 7 : 10) + big * 8 + (p.wall ? 6 : 0)), h = Math.max(0.2, p.top - p.y), floor = W.groundAt(p.x, p.z, p.y + 0.05), cs = Math.min(p.r, 0.7);
    for (let i = 0; i < n; i++) {
      const s = cs * (p.kind === 'clay' ? 0.45 : soft ? 0.5 : 0.55) * (0.5 + Math.random() * 0.6);
      const mesh = new THREE.Mesh(this.chunk, this.mat(p.color, i % 3 === 0));
      if (soft) mesh.scale.set(s, s * 0.45, s * 0.8); else mesh.scale.set(s * (p.kind === 'clay' ? 1 : 1.6), s * (p.kind === 'clay' ? 0.35 : 0.22), s * (p.kind === 'clay' ? 0.8 : 0.4));
      mesh.position.set(p.x + (Math.random() - 0.5) * p.r, p.y + Math.random() * h, p.z + (Math.random() - 0.5) * p.r);
      mesh.castShadow = true; G.gfx.root.add(mesh);
      const a = Math.random() * 6.283, v = 1.5 + Math.random() * 3;
      this.debris.push({ mesh, vx: Math.cos(a) * v, vy: 2 + Math.random() * 3, vz: Math.sin(a) * v, rx: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14, floor, life: 4 + Math.random() * 2, s: mesh.scale.clone() });
    }
    while (this.debris.length > 90) this.debris.shift().mesh.removeFromParent();
    let dust = G.level.dust || [0.6, 0.5, 0.4];
    if (soft) { _c.set(p.color); dust = [_c.r, _c.g, _c.b]; }                    // straw and grain: a cloud of their own colour
    for (let i = 0; i < 12 + big * 12; i++) G.gfx.soft.spawn(p.x + (Math.random() - 0.5) * p.r, p.y + Math.random() * h, p.z + (Math.random() - 0.5) * p.r, (Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2,
      { life: 0.9 + Math.random() * 0.6, s0: 0.2, s1: 0.9 + big, r: dust[0], g: dust[1], b: dust[2], a: soft ? 0.7 : 0.5, grav: soft ? 0.8 : 0.3, drag: 2 });
    G.sound.smash(p.kind, this.far(p.x, p.z));
    // whatever stood on it comes down as well
    for (const q of W.pieces) if (!q.broken && q !== p && Math.abs(q.y - p.top) < 0.2 && Math.hypot(q.x - p.x, q.z - p.z) < p.r + q.r) this.queue.push({ t: 0.12, p: q });
    if (p.boom) this.queue.push({ t: 0.05, x: p.x, y: p.y + 0.5, z: p.z, boom: true });
    if (send && G.duel && G.duel.active) G.duel.send({ t: 'brk', i: p.id });
    G.pieceBroken(p);
  }
  /** How far a sound is from the player, 0 (here) .. 1 (far off). */
  far(x, z) { const P = this.game.player.pos; return Math.min(1, Math.hypot(x - P.x, z - P.z) / 90); }
  mat(color, dark) {
    const key = color + (dark ? 'd' : '');
    let m = this.mats.get(key);
    if (!m) { _c.set(color); if (dark) _c.multiplyScalar(0.6); m = new THREE.MeshStandardMaterial({ color: _c.clone(), roughness: 0.9 }); this.mats.set(key, m); }
    return m;
  }

  /**
   * An explosion at (x, y, z): fire, smoke, a blast that hurts this player and (where they are simulated here) the enemies,
   * breaks the pieces around it and sets off other kegs. Walls between the blast and a body soften it.
   */
  explode(x, y, z, o = {}) {
    const G = this.game, W = G.world, P = G.player, R = o.r ?? 6.5, DMG = o.dmg ?? 140, S = G.gfx.soft, Gl = G.gfx.glow;
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.283, e = Math.random() * 1.4 - 0.2, v = 4 + Math.random() * 9; Gl.spawn(x, y, z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 2, Math.sin(a) * Math.cos(e) * v, { life: 0.3 + Math.random() * 0.4, s0: 0.9, s1: 0.15, r: 4, g: 2 + Math.random(), b: 0.5, a: 1, drag: 3 }); }
    for (let i = 0; i < 26; i++) Gl.spawn(x, y, z, (Math.random() - 0.5) * 22, Math.random() * 14, (Math.random() - 0.5) * 22, { life: 0.6 + Math.random() * 0.6, s0: 0.06, s1: 0.01, r: 3, g: 1.6, b: 0.5, a: 1, grav: 12 });
    for (let i = 0; i < 34; i++) S.spawn(x + (Math.random() - 0.5) * 2, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 5, 1 + Math.random() * 3, (Math.random() - 0.5) * 5,
      { life: 2 + Math.random() * 2, s0: 1, s1: 4.5, r: 0.16, g: 0.15, b: 0.14, a: 0.7, grav: -0.5, drag: 1.4 });
    G.flashLight.position.set(x, y + 1, z); G.flashLight.intensity = 600;
    const dp = Math.hypot(P.pos.x - x, P.pos.y + 1 - y, P.pos.z - z);
    G.sound.boom(Math.min(1, dp / 140));
    if (dp < 30 && !P.dead) P.recoil((Math.random() - 0.5) * 3 * (1 - dp / 30));
    // the blast
    const shield = (bx, by, bz) => (W.clear(x, y, z, bx, by, bz) ? 1 : 0.35);
    if (dp < R && !(o.ghost && G.duel && G.duel.mateOf(o.from))) { if (o.ghost && G.duel) G.duel.blame(o.from); G.hurtPlayer(DMG * 0.6 * (1 - dp / R) * shield(P.pos.x, P.pos.y + 1, P.pos.z), { x, z }, false); }   // a team-mate's bomb does not hurt
    for (const e of G.enemies) {
      if (!e.alive || e.remote || e.puppet || e.state === 'hidden') continue;      // the other player and the host's enemies are worked out in their own browser
      const d = Math.hypot(e.pos.x - x, e.pos.y + 1 - y, e.pos.z - z);
      if (d < R * 1.15) G.hitEnemy(e, DMG * (1 - d / (R * 1.15)) * shield(e.pos.x, e.pos.y + 1, e.pos.z), false, e.pos.x, e.pos.y + 1.2, e.pos.z, x, z, true);
      else if (d < 45 && e.state === 'idle' && !e.static) e.alert(0.3 + Math.random() * 0.5);
    }
    G.noise = 1.5;
    G.crowd.blast(x, y, z, R, DMG * 0.6);
    for (const q of W.pieces) { if (q.broken) continue; const d = Math.hypot(q.x - x, (q.y + q.top) / 2 - y, q.z - z); if (d < R * 0.85) this.queue.push({ t: 0.02 + d * 0.025, p: q }); }
  }

  update(dt) {
    if (this.fires.length) this.updateFires(dt);
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i]; q.t -= dt;
      if (q.t > 0) continue;
      this.queue.splice(i, 1);
      if (q.boom) this.explode(q.x, q.y, q.z); else this.breakPiece(q.p, false);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i], m = d.mesh;
      d.life -= dt;
      if (d.life <= 0) { m.removeFromParent(); this.debris.splice(i, 1); continue; }
      if (d.life < 0.6) m.scale.copy(d.s).multiplyScalar(d.life / 0.6);
      if (d.rest) continue;
      d.vy -= 14 * dt; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt;
      m.rotation.x += d.rx * dt; m.rotation.z += d.rz * dt;
      const fl = Math.max(d.floor, this.game.world.height(m.position.x, m.position.z));
      if (m.position.y < fl + 0.03) {
        m.position.y = fl + 0.03; d.vy = -d.vy * 0.3; d.vx *= 0.5; d.vz *= 0.5; d.rx *= 0.5; d.rz *= 0.5;
        if (Math.abs(d.vy) < 0.6) { d.rest = true; m.rotation.x = Math.round(m.rotation.x / Math.PI) * Math.PI; m.rotation.z = Math.round(m.rotation.z / Math.PI) * Math.PI; }
      }
    }
  }
}

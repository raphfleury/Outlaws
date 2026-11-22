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
    this.game = game; this.debris = []; this.queue = []; this.mats = new Map();
    this.chunk = new THREE.BoxGeometry(1, 1, 1);
  }
  reset() { for (const d of this.debris) d.mesh.removeFromParent(); this.debris = []; this.queue = []; }

  /** A hit on a piece at (x, y, z): chips fly off in its colour, and it breaks when its strength is used up. */
  damage(p, amount, x, y, z) {
    if (!p || p.broken) return;
    p.hp -= amount;
    if (x !== undefined) {
      _c.set(p.color);
      for (let i = 0; i < 6; i++) this.game.gfx.soft.spawn(x, y, z, (Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3, { life: 0.5 + Math.random() * 0.4, s0: 0.06, s1: 0.04, r: _c.r * 1.4, g: _c.g * 1.4, b: _c.b * 1.4, a: 0.95, grav: 9, drag: 0.5 });
    }
    if (p.hp <= 0) this.breakPiece(p, true);
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
    for (const r of p.ranges) {                     // its shapes collapse to a point inside the merged mesh: they no longer draw
      const a = r.mesh.geometry.attributes.position, arr = a.array, i0 = r.start * 3, x = arr[i0], y = arr[i0 + 1], z = arr[i0 + 2];
      for (let i = i0; i < (r.start + r.count) * 3; i += 3) { arr[i] = x; arr[i + 1] = y; arr[i + 2] = z; }
      a.addUpdateRange(i0, r.count * 3); a.needsUpdate = true;
    }
    W.removeCols(p);
    if (p.sweep) this.sweep(p);
    if (G.nav) G.nav.refresh(p.x - p.r, p.z - p.r, p.x + p.r, p.z + p.r);
    // splinters or shards, and a puff of dust
    const soft = p.kind === 'straw' || p.kind === 'cloth', big = Math.min(1, p.r / 1.2);
    const n = Math.round((p.kind === 'clay' ? 7 : 10) + big * 8), h = Math.max(0.2, p.top - p.y), floor = W.groundAt(p.x, p.z, p.y + 0.05), cs = Math.min(p.r, 0.7);
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
    if (dp < R) G.hurtPlayer(DMG * 0.6 * (1 - dp / R) * shield(P.pos.x, P.pos.y + 1, P.pos.z), { x, z }, false);
    for (const e of G.enemies) {
      if (!e.alive || e.remote || e.puppet || e.state === 'hidden') continue;      // the other player and the host's enemies are worked out in their own browser
      const d = Math.hypot(e.pos.x - x, e.pos.y + 1 - y, e.pos.z - z);
      if (d < R * 1.15) G.hitEnemy(e, DMG * (1 - d / (R * 1.15)) * shield(e.pos.x, e.pos.y + 1, e.pos.z), false, e.pos.x, e.pos.y + 1.2, e.pos.z, x, z, true);
      else if (d < 45 && e.state === 'idle' && !e.static) e.alert(0.3 + Math.random() * 0.5);
    }
    G.noise = 1.5;
    for (const q of W.pieces) { if (q.broken) continue; const d = Math.hypot(q.x - x, (q.y + q.top) / 2 - y, q.z - z); if (d < R * 0.85) this.queue.push({ t: 0.02 + d * 0.025, p: q }); }
  }

  update(dt) {
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

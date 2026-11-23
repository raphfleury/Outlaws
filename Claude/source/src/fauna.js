// The animals of the chapters (made by `animal` in props.js): horses, ponies and mules, cattle, yaks, goats, pigs, sheep, hens, a dog.
// Left in peace they breathe, shift their weight and graze. A shot, a blast or a fright near them sends them running a little way.
// They can be hurt (blood) and killed (they fall on their side). Some of the larger ones, and some goats and pigs, when hurt and still
// standing, turn on the player: the animal becomes an enemy (TYPES.horseBeast and the others in actors.js), as strong as the chapter's
// enemies and no more, driven like a guard dog.
// Online, each browser has its own animals; one killed by a player is reported to the others by its number, and none turns on a player.
import { Enemy, TYPES } from './actors.js';
import { damp } from './util.js';

/** hp; the share of them that fight back (decided once per animal); what they become; how fast they run; the radius of the body. */
export const KINDS = {
  horse: { hp: 90, fight: 0.5, beast: 'horseBeast', speed: 7, r: 0.36, name: 'The horse' },
  pony: { hp: 70, fight: 0.4, beast: 'horseBeast', speed: 6.5, r: 0.36, name: 'The pony' },
  mule: { hp: 75, fight: 0.4, beast: 'horseBeast', speed: 5.5, r: 0.36, name: 'The mule' },
  cow: { hp: 110, fight: 0.35, beast: 'cowBeast', speed: 4.5, r: 0.44, name: 'The cow' },
  ox: { hp: 120, fight: 0.6, beast: 'cowBeast', speed: 4.5, r: 0.4, name: 'The ox' },
  yak: { hp: 120, fight: 0.6, beast: 'yakBeast', speed: 4.8, r: 0.5, name: 'The yak' },
  goat: { hp: 35, fight: 0.3, beast: 'goatBeast', speed: 5.5, r: 0.16, name: 'The goat' },
  pig: { hp: 40, fight: 0.25, beast: 'pigBeast', speed: 4.5, r: 0.24, name: 'The pig' },
  sheep: { hp: 30, fight: 0, speed: 4.5, r: 0.28, name: 'The sheep' },
  hen: { hp: 6, fight: 0, speed: 3, r: 0.1, name: 'The hen' },
  dog: { hp: 35, fight: 0.8, beast: 'dog', speed: 7, r: 0.2, name: 'The dog' },
};

export class Fauna {
  constructor(game) { this.game = game; this.list = []; this.p = { x: 0, y: 0, z: 0 }; }

  /** The animals of the chapter just built (World.animals). */
  setup(animals) {
    this.list = (animals || []).map((a, i) => {
      const K = KINDS[a.kind] || KINDS.sheep, q = ((i * 7919 + 31) % 97) / 97;
      return Object.assign(a, { i, K, hp: K.hp, state: 'idle', t: 0, dead: false, gone: false, px: a.x, py: a.y, pz: a.z, yaw: a.ry, ph: q * 20, fight: q < K.fight, walk: 0, dir: 0, side: q < 0.5 ? 1 : -1 });
    });
  }
  /** Where a sound at (x, z) comes from, for the stereo, and how far it is (0..1 within 60 m). */
  place(x, z) {
    const V = this.game.voices; if (V) return V.place(x, z, 60);
    return { pan: 0, far: 0 };
  }

  // ---- what happens to them --------------------------------------------------------
  /** A hit by a shot, a missile or a blow: blood; killed at the end of its strength; otherwise it runs, or turns on the player. */
  hit(a, dmg, x, y, z, byPlayer = true, send = true) {
    if (!a || a.dead || a.gone) return;
    const G = this.game, P = G.player.pos;
    a.hp -= dmg;
    for (let i = 0; i < 9; i++) G.gfx.soft.spawn(x, y, z, (Math.random() - 0.5) * 2.4, Math.random() * 2, (Math.random() - 0.5) * 2.4, { life: 0.5 + Math.random() * 0.3, s0: 0.05, s1: 0.16, r: 0.32, g: 0.02, b: 0.02, a: 0.85, grav: 6, drag: 1 });
    G.sound.thud();
    const fx = byPlayer ? P.x : x, fz = byPlayer ? P.z : z;
    if (a.hp <= 0) { this.die(a, fx, fz, byPlayer, send); return; }
    const { pan, far } = this.place(a.px, a.pz); G.sound.beast(a.kind, far, pan, true);
    if (a.fight && byPlayer && a.K.beast && !(G.duel && G.duel.active) && G.state === 'play') this.enrage(a);
    else this.flee(a, fx, fz);
  }
  /** It turns on the player: in its place, an enemy of its kind, as hurt as it was. */
  enrage(a) {
    const G = this.game, P = G.player.pos, type = a.K.beast, cfg = TYPES[type];
    const e = new Enemy(G, type, a.px, a.pz, { y: a.py + 0.5, yaw: Math.atan2(P.x - a.px, P.z - a.pz), coat: a.coat, patrol: false });
    if (a.s !== 1 && e.rig) { e.rig.scale = e.scale = a.s; e.rig.group.scale.setScalar(a.s); }
    e.hp = Math.max(1, Math.round(cfg.hp * Math.max(0.35, a.hp / a.K.hp)));
    this.remove(a);
    G.enemies.push(e); e.alert(0); G.cache = {};
    G.say(a.K.name + ' turns on you');
  }
  /** Taken out of the world (it became an enemy). */
  remove(a) {
    const W = this.game.world;
    a.gone = a.dead = true; a.state = 'gone'; a.mesh.removeFromParent();
    W.boxes = W.boxes.filter((b) => b !== a.box);
  }
  die(a, fromX, fromZ, byPlayer, send = true) {
    if (a.dead) return;
    const G = this.game, W = G.world;
    a.dead = true; a.state = 'dead'; a.t = 0;
    W.boxes = W.boxes.filter((b) => b !== a.box);
    const lx = (fromX - a.px) * Math.cos(a.yaw) - (fromZ - a.pz) * Math.sin(a.yaw); a.side = lx > 0 ? -1 : 1;   // it falls away from the blow
    const { pan, far } = this.place(a.px, a.pz); G.sound.beast(a.kind, far, pan, true);
    if (byPlayer) { G.stats.animals = (G.stats.animals || 0) + 1; if (send && G.duel && G.duel.active) G.duel.send({ t: 'ak', i: a.i }); }
    this.alarm(a.px, a.pz, 12, fromX, fromZ);
  }
  flee(a, sx, sz) {
    if (a.dead || a.lying) return;
    const dx = a.px - sx, dz = a.pz - sz, d = Math.hypot(dx, dz);
    a.dir = (d > 0.3 ? Math.atan2(dx, dz) : Math.random() * 6.283) + (Math.random() - 0.5) * 0.9;
    a.state = 'flee'; a.t = Math.max(a.t, 2.5 + Math.random() * 2.5); a.stuck = 0;
  }
  /** Something frightening happened at (x, z): the animals within r run from (sx, sz). */
  alarm(x, z, r, sx = x, sz = z) {
    for (const a of this.list) if (!a.dead && (a.px - x) ** 2 + (a.pz - z) ** 2 < r * r) this.flee(a, sx, sz);
  }
  /** A blast at (x, y, z). */
  blast(x, y, z, R, DMG) {
    for (const a of this.list) {
      if (a.dead) continue;
      const d = Math.hypot(a.px - x, a.py + a.high * 0.5 - y, a.pz - z);
      if (d < R * 1.15) this.hit(a, DMG * (1 - d / (R * 1.15)), a.px, a.py + a.high * 0.6, a.pz, false, false);
    }
    this.alarm(x, z, 45, x, z);
  }
  /** Online: another player killed animal i. */
  killed(i) { const a = this.list[i]; if (a && !a.dead) this.die(a, a.px + 1, a.pz, false, false); }

  /** A step along the ground, around walls and fences, not into deep water. Returns the distance gone. */
  move(a, vx, vz, dt) {
    const W = this.game.world, p = this.p, b = a.box, r = Math.min(0.6, Math.max(0.15, a.wide * 0.5));
    b.x += 1e6;                                               // its own collider is not in its way
    p.x = a.px; p.y = a.py; p.z = a.pz;
    const nx = p.x + vx * dt, nz = p.z + vz * dt;
    if (W.walkable(p.x, p.z, nx, nz, p.y)) { p.x = nx; p.z = nz; }
    W.collide(p, r, Math.max(0.5, a.high));
    const gy = W.groundAt(p.x, p.z, p.y + 0.5); p.y = gy > p.y ? gy : Math.max(gy, p.y - 9 * dt);
    const moved = Math.hypot(p.x - a.px, p.z - a.pz);
    a.px = p.x; a.py = p.y; a.pz = p.z;
    b.x = a.px + Math.sin(a.yaw) * a.fwd; b.z = a.pz + Math.cos(a.yaw) * a.fwd; b.c = Math.cos(a.yaw); b.s = Math.sin(a.yaw); b.y0 = a.py - 1; b.y1 = a.py + a.high;
    return moved;
  }

  // ---- every frame ------------------------------------------------------------------------
  update(dt) {
    const G = this.game, P = G.player.pos, t = G.time;
    for (const a of this.list) {
      if (a.gone) continue;
      const m = a.mesh;
      if (a.dead) {                                         // the fall, onto its side
        if (a.t > 1) continue;
        a.t += dt; const e = Math.min(1, a.t / 0.6) ** 2;
        if (!a.lying) { m.rotation.z = a.side * 1.45 * e; m.rotation.x = 0; m.position.y = a.py + a.K.r * a.s * 0.85 * e; }
        continue;
      }
      if ((P.x - a.px) ** 2 + (P.z - a.pz) ** 2 > 110 * 110 && a.state === 'idle') continue;    // too far to be seen
      if (a.state === 'flee') {
        a.t -= dt;
        const sp = a.K.speed * Math.min(1, 0.6 + a.t), moved = this.move(a, Math.sin(a.dir) * sp, Math.cos(a.dir) * sp, dt);
        if (moved < sp * dt * 0.3) { a.stuck += dt; if (a.stuck > 0.3) { a.stuck = 0; a.dir += (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()); } } else a.stuck = 0;
        let d = a.dir - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * Math.min(1, dt * 6);
        a.walk += moved * 2.4 / Math.max(0.4, a.s * (a.K.r > 0.3 ? 1 : 0.5));
        m.position.set(a.px, a.py + Math.abs(Math.sin(a.walk)) * 0.07 * a.s, a.pz);
        m.rotation.set(Math.sin(a.walk * 2) * 0.05, a.yaw, 0);
        if (a.t <= 0) { a.state = 'idle'; m.rotation.x = 0; }
        continue;
      }
      // in peace: it breathes, its weight shifts, now and then it lowers its head to graze
      const ph = a.ph;
      m.scale.set(a.s, a.s * (1 + Math.sin(t * 1.7 + ph) * 0.012), a.s);
      if (!a.lying) {
        m.rotation.y = a.yaw + Math.sin(t * 0.13 + ph) * 0.1;
        m.rotation.x = damp(m.rotation.x, Math.max(0, Math.sin(t * 0.21 + ph)) ** 6 * 0.06, 3, dt);
      }
    }
  }
}

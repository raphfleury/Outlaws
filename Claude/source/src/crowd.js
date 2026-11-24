// The people who take no part in the fight (the bystanders made by `person` in props.js) come alive:
//  - shots, blasts and missiles landing near them frighten them: they run away from the danger, crouch with their hands over
//    their heads, and when all has been quiet for a while walk back to where they were and take up their work again;
//  - when the player stands near one of them for a moment without fighting, the bystander turns to him and talks, waves,
//    nods or shrugs; aimed at, a bystander raises his hands;
//  - they can be hurt (a wound, a flash, blood) and killed (they fall); the end of the chapter counts those the player killed;
//  - about one in four, hurt by the player and still standing, fights back: he becomes an enemy of the chapter's commonest kind, with
//    that enemy's weapon and strength, and his own looks (not online, where each browser has its own bystanders);
//  - those who stay on a boat do not stroll or run: they crouch where they are.
// Each browser of a duel has its own bystanders; a bystander killed by a player is reported to the other browser by its number.
import * as THREE from 'three';
import { stride, wound, Enemy, lookFor } from './actors.js';
import { damp } from './util.js';

const HP = 30;
const JOINTS = ['hips', 'armL', 'armR', 'legL', 'legR', 'shinL', 'shinR'];
const GESTURES = ['talk', 'wave', 'nod', 'shrug', 'talk', 'point'];

export class Crowd {
  constructor(game) { this.game = game; this.list = []; this.p = { x: 0, y: 0, z: 0 }; this.calm = 9; this._v = new THREE.Vector3(); this._f = new THREE.Vector3(); }

  /** The bystanders of the chapter just built (World.people). */
  setup(people) {
    this.list = (people || []).map((w, i) => {
      const f = w.f, saved = {};
      for (const k of JOINTS) if (f[k]) saved[k] = f[k].rotation.clone();
      saved.pos = f.group.position.clone(); saved.rot = f.group.rotation.clone();
      f.busy = false;
      const q = ((i * 4801 + 7) % 89) / 89;
      return Object.assign(w, { fighter: !w.stay && q < 0.25, gone: false, i, hp: HP, state: 'idle', t: 0, dead: false, px: w.x, py: w.y, pz: w.z, dir: 0, walk: Math.random() * 6, moving: 0, flash: 0, saved, stuck: 0, gest: 'talk', gT: 0, away: 0, act: this.activityOf(w, i) });
    });
    this.calm = 9;
  }

  /**
   * What a bystander does while left in peace, from the pose the level gave him: one at work keeps working (hammering, scrubbing,
   * hoeing), one talking keeps talking with his hands, one seated takes a drink now and then, one at prayer bows; and some of those
   * standing about go for a stroll (to look at something a few steps away, to the next house) and come back.
   */
  activityOf(w, i) {
    const r = ((i * 7919 + 13) % 101) / 101;
    if (w.stay) return { kind: w.pose === 'stand' ? 'chat' : 'work', ph: r * 6, soft: true };   // on a boat: paddling, poling, or talking
    if (w.pose === 'work') return { kind: 'work', ph: r * 6 };
    if (w.pose === 'talk') return { kind: 'chat', ph: r * 6 };
    if (w.pose === 'pray') return { kind: 'pray', ph: r * 6 };
    if (w.pose === 'wait') return { kind: 'chat', ph: r * 6, soft: true };   // one in a line keeps his place
    if (w.sit) return { kind: 'sip', t: 3 + r * 8 };
    if ((w.pose === 'stand' || w.pose === 'hips' || w.pose === 'carry' || w.pose === 'point' || w.pose === 'custom') && r < 0.7) return { kind: 'stroll', phase: 'wait', t: 2 + r * 9 };
    return { kind: 'chat', ph: r * 6, soft: true };          // everyone else: talking, looking about (nobody stands like a statue)
  }
  /** One frame of what he does while left in peace (see activityOf). */
  activity(w, f, dt, t) {
    const a = w.act, S = w.saved; if (!a) return;
    const k = 8;
    switch (a.kind) {
      case 'work': {                       // two-handed, the rhythm of a hammer, a scrubbing brush, a hoe
        f.busy = true; const ph = t * 4.2 + a.ph, s = Math.sin(ph), b = Math.max(0, Math.sin(ph));
        f.armR.rotation.x = damp(f.armR.rotation.x, S.armR.x - 0.55 * b + 0.15, k, dt); f.armL.rotation.x = damp(f.armL.rotation.x, S.armL.x - 0.35 * b + 0.1, k, dt);
        f.hips.rotation.x = damp(f.hips.rotation.x, S.hips.x + 0.08 * s, k, dt); f.hips.rotation.y = damp(f.hips.rotation.y, S.hips.y + 0.12 * Math.sin(ph * 0.5), 4, dt);
        break;
      }
      case 'chat': {                       // talking with whoever is there, with the hands
        f.busy = true; const ph = t + a.ph, k = a.soft ? 0.3 : 1;    // soft: one standing about, who mostly looks around
        f.armR.rotation.x = damp(f.armR.rotation.x, S.armR.x + Math.sin(ph * 3.1) * 0.35 * k, 6, dt); f.armL.rotation.x = damp(f.armL.rotation.x, S.armL.x + Math.sin(ph * 2.3 + 1) * 0.2 * k, 6, dt);
        f.hips.rotation.y = damp(f.hips.rotation.y, S.hips.y + Math.sin(ph * 0.4) * 0.25, 3, dt);
        break;
      }
      case 'pray': { f.busy = true; const b = Math.max(0, Math.sin(t * 0.9 + a.ph)) ** 3; f.hips.rotation.x = damp(f.hips.rotation.x, S.hips.x + 0.35 * b, 5, dt); break; }   // bowing, slowly
      case 'sip': {                        // seated: a drink from the cup now and then
        a.t -= dt; f.busy = true;
        const up = a.t < 0 && a.t > -1.6 ? Math.sin(Math.min(1, -a.t / 1.6) * Math.PI) : 0;
        f.armR.rotation.x = damp(f.armR.rotation.x, S.armR.x - up * 1.6, 7, dt); f.armR.rotation.z = damp(f.armR.rotation.z, S.armR.z + up * 0.5, 7, dt);
        if (a.t < -1.6) a.t = 5 + Math.random() * 9;
        break;
      }
      case 'stroll': {
        a.t -= dt;
        if (a.phase === 'wait') {                                  // standing at home
          if (a.t > 0) return;
          const W = this.game.world;
          for (let n = 0; n < 6; n++) {                            // somewhere a few steps away that he can walk to in a straight line
            const ang = Math.random() * 6.283, d = 4 + Math.random() * 6, tx = w.x + Math.sin(ang) * d, tz = w.z + Math.cos(ang) * d;
            if (!W.clear(w.x, w.y + 0.6, w.z, tx, w.y + 0.6, tz) || !W.clear(w.x, w.y + 1.5, w.z, tx, w.y + 1.5, tz) || Math.abs(W.groundAt(tx, tz, w.y + 0.5) - w.y) > 0.4) continue;
            a.tx = tx; a.tz = tz; a.phase = 'go'; this.standUp(w); return;
          }
          a.t = 4 + Math.random() * 6; return;
        }
        if (a.phase === 'there') {                                 // looking at something, then home again
          for (const q of ['legL', 'legR', 'shinL', 'shinR']) f[q].rotation.x = damp(f[q].rotation.x, 0, 6, dt);
          f.armR.rotation.x = damp(f.armR.rotation.x, 0, 4, dt); f.armL.rotation.x = damp(f.armL.rotation.x, 0, 4, dt); f.group.position.set(w.px, w.py, w.pz);
          if (a.t <= 0) a.phase = 'back';
          return;
        }
        const [gx, gz] = a.phase === 'go' ? [a.tx, a.tz] : [w.x, w.z], hx = gx - w.px, hz = gz - w.pz, hd = Math.hypot(hx, hz);
        if (hd < 0.35) { if (a.phase === 'go') { a.phase = 'there'; a.t = 3 + Math.random() * 5; } else { this.restore(w); a.phase = 'wait'; a.t = 6 + Math.random() * 12; } return; }
        const sp = 1.1, moved = this.move(w, hx / hd * sp, hz / hd * sp, dt);
        if (moved < sp * dt * 0.3) { w.stuck += dt; if (w.stuck > 1.5) { w.stuck = 0; a.phase = a.phase === 'go' ? 'back' : 'back'; if (a.phase === 'back' && Math.hypot(w.x - w.px, w.z - w.pz) < 0.5) { this.restore(w); a.phase = 'wait'; a.t = 5; } } } else w.stuck = 0;
        this.walking(w, f, moved, dt, 0);
        let d = Math.atan2(hx, hz) - f.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.group.rotation.y += d * Math.min(1, dt * 5);
        break;
      }
    }
  }

  // ---- what happens to them --------------------------------------------------------
  /** Something dangerous happened at (x, z): everyone within r runs from (sx, sz). */
  alarm(x, z, r, sx = x, sz = z) {
    this.calm = 0;
    if (this.game.life) this.game.life.alarm(x, z, r * 1.5);           // the birds take wing too
    if (this.game.fauna) this.game.fauna.alarm(x, z, r * 1.2, sx, sz);   // and the animals run
    for (const w of this.list) if (!w.dead && (w.px - x) ** 2 + (w.pz - z) ** 2 < r * r) this.frighten(w, sx, sz);
  }
  frighten(w, sx, sz) {
    if (w.dead) return;
    if (w.state === 'panic') { w.t = Math.max(w.t, 2.5); return; }
    if (w.stay) { if (w.state !== 'cower') { this.standUp(w); w.state = 'cower'; } w.t = Math.max(w.t, 5 + Math.random() * 4); return; }   // on a boat: down where he is
    const dx = w.px - sx, dz = w.pz - sz, d = Math.hypot(dx, dz);
    w.dir = (d > 0.3 ? Math.atan2(dx, dz) : Math.random() * 6.283) + (Math.random() - 0.5) * 1.1;
    this.standUp(w);
    w.state = 'panic'; w.t = 4 + Math.random() * 3; w.stuck = 0;
    if (Math.random() < 0.5) this.game.sound.scream(this.far(w));
  }
  /** A hit: a wound, a flash, blood; killed at the end of his strength. byPlayer: the player did it (counted, and in a duel reported). */
  hit(w, dmg, x, y, z, byPlayer = true, send = true) {
    if (!w || w.dead) return;
    const G = this.game, f = w.f;
    w.hp -= dmg; w.flash = 1;
    wound(f, x, y, z);
    for (let i = 0; i < 9; i++) G.gfx.soft.spawn(x, y, z, (Math.random() - 0.5) * 2.4, Math.random() * 2, (Math.random() - 0.5) * 2.4, { life: 0.5 + Math.random() * 0.3, s0: 0.05, s1: 0.16, r: 0.32, g: 0.02, b: 0.02, a: 0.85, grav: 6, drag: 1 });
    G.sound.thud();
    const P = G.player.pos;
    if (w.hp <= 0) this.die(w, byPlayer ? P.x : x, byPlayer ? P.z : z, byPlayer, send);
    else if (!(w.fighter && byPlayer && this.recruit(w))) this.frighten(w, byPlayer ? P.x : x, byPlayer ? P.z : z);
  }
  /** One who fights back: in his place an enemy of the chapter's commonest kind, with his looks, that enemy's weapon, as hurt as he was. */
  recruit(w) {
    const G = this.game; if ((G.duel && G.duel.active) || G.state !== 'play') return false;
    const type = G.footType(); if (!type) return false;
    const W = G.world, P = G.player.pos, arms = lookFor(type, G.rand);
    const e = new Enemy(G, type, w.px, w.pz, { look: w.look, over: { ...w.spec, weapon: arms.weapon ?? null, weapon2: null }, y: w.py + 0.6, yaw: Math.atan2(P.x - w.px, P.z - w.pz), patrol: false });
    e.hp = Math.max(1, Math.round(e.cfg.hp * Math.max(0.35, w.hp / HP)));
    w.dead = w.gone = true; w.state = 'gone'; w.f.group.removeFromParent();
    if (w.cyl) W.cyls = W.cyls.filter((c) => c !== w.cyl);
    G.enemies.push(e); e.alert(0); G.cache = {};
    G.say('Someone you hurt fights back');
    return true;
  }
  die(w, fromX, fromZ, byPlayer, send = true) {
    if (w.dead) return;
    const G = this.game, W = G.world, f = w.f;
    w.dead = true; w.state = 'dead'; w.t = 0; f.busy = true;
    if (w.cyl) W.cyls = W.cyls.filter((c) => c !== w.cyl);
    if (w.sit && !w.stood) w.slump = true;                    // sitting: he sinks where he sits
    else {
      this.standUp(w);
      w.yaw0 = Math.atan2(fromX - w.px, fromZ - w.pz); f.group.rotation.set(0, w.yaw0, 0);
      const fx = Math.sin(w.yaw0), fz = Math.cos(w.yaw0), y = w.py + 0.7;
      w.fall = W.clear(w.px, y, w.pz, w.px - fx * 1.9, y, w.pz - fz * 1.9) ? -1 : W.clear(w.px, y, w.pz, w.px + fx * 1.9, y, w.pz + fz * 1.9) ? 1 : 0;
      if (!w.fall) w.slump = true;
    }
    G.sound.scream(this.far(w), true);
    if (byPlayer) { G.stats.innocents = (G.stats.innocents || 0) + 1; G.say('You killed someone who took no part in the fight'); if (send && G.duel && G.duel.active) G.duel.send({ t: 'bk', i: w.i }); }
    this.alarm(w.px, w.pz, 14, fromX, fromZ);
  }
  /** A blast at (x, y, z): hurts those near it (worked out in each browser of a duel, so not reported). */
  blast(x, y, z, R, DMG) {
    for (const w of this.list) {
      if (w.dead) continue;
      const d = Math.hypot(w.px - x, w.py + 1 - y, w.pz - z);
      if (d < R * 1.1) this.hit(w, DMG * (1 - d / (R * 1.1)), w.px, w.py + 1.1, w.pz, true, false);
    }
    this.alarm(x, z, 40, x, z);
  }
  far(w) { const P = this.game.player.pos; return Math.min(1, Math.hypot(w.px - P.x, w.pz - P.z) / 60); }

  // ---- poses ---------------------------------------------------------------------------
  /** Back to the pose and the place the level gave him. */
  restore(w) {
    const f = w.f, S = w.saved;
    if (Math.hypot(w.px - w.x, w.pz - w.z) > 0.5) { this.standUp(w); w.state = 'return'; w.stuck = 0; w.t = 25; if (w.act && w.act.kind === 'stroll') w.act.phase = 'wait'; return; }   // away from his place (on a stroll): he walks back first
    for (const k of JOINTS) if (S[k]) f[k].rotation.copy(S[k]);
    f.group.position.copy(S.pos); f.group.rotation.copy(S.rot);
    w.px = w.x; w.py = w.y; w.pz = w.z; w.stood = false; f.busy = false; w.state = 'idle';
    this.follow(w);
  }
  /** A seated bystander gets up before doing anything else. */
  standUp(w) {
    const f = w.f;
    w.f.busy = true;
    if (w.sit && !w.stood) { w.stood = true; f.group.position.y = w.py; }
    for (const k of JOINTS) if (f[k]) f[k].rotation.set(0, 0, 0);
    f.group.rotation.x = 0; f.group.rotation.z = 0;
  }
  /** His collider goes where he goes. */
  follow(w) { const c = w.cyl; if (c) { c.x = w.px; c.z = w.pz; if (w.state !== 'idle') { c.y0 = w.py - 1; c.y1 = w.py + 1.8; } } }

  /** A step: along the ground, around walls and furniture, not into deep water. Returns the distance gone. */
  move(w, vx, vz, dt) {
    const W = this.game.world, P = this.game.player.pos, p = this.p, c = w.cyl;
    if (c) c.x += 1e6;                                       // his own collider is not in his way
    p.x = w.px; p.y = w.py; p.z = w.pz;
    const nx = p.x + vx * dt, nz = p.z + vz * dt;
    if (W.walkable(p.x, p.z, nx, nz, p.y)) { p.x = nx; p.z = nz; }
    W.collide(p, 0.3, 1.7);
    const ex = p.x - P.x, ez = p.z - P.z, d2 = ex * ex + ez * ez;
    if (d2 < 0.64 && d2 > 1e-6) { const d = Math.sqrt(d2); p.x = P.x + ex / d * 0.8; p.z = P.z + ez / d * 0.8; }
    const gy = W.groundAt(p.x, p.z, p.y); p.y = gy > p.y ? gy : Math.max(gy, p.y - 9 * dt);
    const moved = Math.hypot(p.x - w.px, p.z - w.pz);
    w.px = p.x; w.py = p.y; w.pz = p.z;
    if (c) c.x -= 1e6;
    this.follow(w);
    return moved;
  }

  // ---- every frame ------------------------------------------------------------------------
  update(dt) {
    const G = this.game, P = G.player, fw = P.forward(this._f);
    this.calm = G.noise > 0 ? 0 : this.calm + dt;
    const still = Math.hypot(P.vel.x, P.vel.z) < 1.2 && !P.dead, aiming = P.aim > 0.5 && !P.dead && P.weapon && !P.weapon.slot && P.weapon.kind !== 'fists';
    for (const w of this.list) {
      const f = w.f, s = f.scale || 1;
      if (w.flash > 0) { w.flash = Math.max(0, w.flash - dt * 6); f.mat.emissive.setRGB(w.flash * 0.8, 0, 0); }
      if (w.gone) continue;                                      // he became an enemy
      if (w.dead) { this.fallen(w, dt); continue; }
      const dx = P.pos.x - w.px, dz = P.pos.z - w.pz, dist = Math.hypot(dx, dz);
      let aimed = false;
      if (aiming && dist < 35) { const vx = w.px - P.pos.x, vy = w.py + 1.2 - (P.pos.y + 1.6), vz = w.pz - P.pos.z, l = Math.hypot(vx, vy, vz); aimed = (vx * fw.x + vy * fw.y + vz * fw.z) / l > 0.995; }
      w.t -= dt; w.gT -= dt;
      switch (w.state) {
        case 'idle':
          if (aimed) { this.standUp(w); w.state = 'hands'; w.away = 0; }
          else if (dist < 3.3 && this.calm > 1.5 && still && Math.abs(P.pos.y - w.py) < 1.5) { w.state = 'greet'; w.gT = 0; w.away = 0; f.busy = true; }
          else if (dist < 90) this.activity(w, f, dt, G.time);       // near enough to be seen: at work, chatting, strolling
          break;
        case 'greet': {                     // he turns to the player and talks, waves, nods...
          if (dist > 5 || this.calm < 0.3) { this.restore(w); break; }
          if (w.gT <= 0) { w.gest = GESTURES[Math.floor(Math.random() * GESTURES.length)]; w.gT = 2.2 + Math.random() * 1.4; if (Math.random() < 0.6) { if (G.voices) G.voices.greet(w); else G.sound.murmur(this.far(w)); } }
          const want = Math.atan2(dx, dz);
          if (w.sit && !w.stood) { let d = want - w.saved.rot.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.hips.rotation.y = damp(f.hips.rotation.y, Math.max(-0.9, Math.min(0.9, d)), 4, dt); }
          else { let d = want - f.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.group.rotation.y += d * Math.min(1, dt * 4); }
          this.gesture(w, f, G.time, dt);
          if (aimed) { this.standUp(w); w.state = 'hands'; w.away = 0; }
          break;
        }
        case 'hands': {                     // aimed at: hands up, trembling, facing the gun
          const want = Math.atan2(dx, dz); let d = want - f.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.group.rotation.y += d * Math.min(1, dt * 5);
          const tr = Math.sin(G.time * 31 + w.i) * 0.05;
          f.armR.rotation.x = damp(f.armR.rotation.x, -2.95 + tr, 10, dt); f.armL.rotation.x = damp(f.armL.rotation.x, -2.95 - tr, 10, dt);
          f.armR.rotation.z = damp(f.armR.rotation.z, -0.28, 10, dt); f.armL.rotation.z = damp(f.armL.rotation.z, 0.28, 10, dt);
          f.hips.rotation.x = damp(f.hips.rotation.x, -0.08, 6, dt);
          w.away = aimed ? 0 : w.away + dt;
          if (w.away > 1.2) this.restore(w);
          break;
        }
        case 'panic': {                     // running from the danger, arms over the head
          const sp = 4.6 + (w.i % 3) * 0.4, vx = Math.sin(w.dir) * sp, vz = Math.cos(w.dir) * sp, moved = this.move(w, vx, vz, dt);
          if (moved < sp * dt * 0.3) { w.stuck += dt; if (w.stuck > 0.25) { w.stuck = 0; w.dir += (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.2); } } else w.stuck = 0;
          this.walking(w, f, moved, dt, 1);
          let d = w.dir - f.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.group.rotation.y += d * Math.min(1, dt * 10);
          const fl = Math.sin(w.walk) * 0.5;
          f.armR.rotation.x = -2.5 + fl; f.armL.rotation.x = -2.5 - fl; f.armR.rotation.z = -0.35; f.armL.rotation.z = 0.35;
          if (w.t <= 0) { w.state = 'cower'; w.t = 6 + Math.random() * 5; }
          break;
        }
        case 'cower': {                     // crouched, hands over the head, until it has been quiet for a while
          f.legL.rotation.x = damp(f.legL.rotation.x, -1.35, 8, dt); f.legR.rotation.x = damp(f.legR.rotation.x, -0.9, 8, dt);
          f.shinL.rotation.x = damp(f.shinL.rotation.x, 2.3, 8, dt); f.shinR.rotation.x = damp(f.shinR.rotation.x, 2.0, 8, dt);
          f.hips.rotation.x = damp(f.hips.rotation.x, 0.75, 8, dt);
          const tr = Math.sin(G.time * 27 + w.i) * 0.04;
          f.armR.rotation.x = damp(f.armR.rotation.x, -2.75 + tr, 8, dt); f.armL.rotation.x = damp(f.armL.rotation.x, -2.75 - tr, 8, dt);
          f.armR.rotation.z = damp(f.armR.rotation.z, 0.45, 8, dt); f.armL.rotation.z = damp(f.armL.rotation.z, -0.45, 8, dt);
          f.group.position.set(w.px, w.py - 0.36 * s, w.pz);
          if (this.calm < 0.5) w.t = Math.max(w.t, 4);
          if (w.t <= 0) { this.standUp(w); w.state = 'return'; w.stuck = 0; w.t = 25; }
          break;
        }
        case 'return': {                    // walking back home
          const hx = w.x - w.px, hz = w.z - w.pz, hd = Math.hypot(hx, hz);
          if (hd < 0.35) { this.restore(w); break; }
          const sp = 1.4, moved = this.move(w, hx / hd * sp, hz / hd * sp, dt);
          if (moved < sp * dt * 0.3) w.stuck += dt; else w.stuck = Math.max(0, w.stuck - dt);
          this.walking(w, f, moved, dt, 0);
          let d = Math.atan2(hx, hz) - f.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); f.group.rotation.y += d * Math.min(1, dt * 5);
          f.armR.rotation.z = damp(f.armR.rotation.z, -0.06, 6, dt); f.armL.rotation.z = damp(f.armL.rotation.z, 0.06, 6, dt);
          if (w.stuck > 3 || w.t <= 0) w.state = 'stand';     // no way back: he stays where he is
          break;
        }
        case 'stand': {
          for (const k of ['legL', 'legR', 'shinL', 'shinR']) f[k].rotation.x = damp(f[k].rotation.x, 0, 6, dt);
          f.armR.rotation.x = damp(f.armR.rotation.x, Math.sin(G.time * 0.8 + w.i) * 0.05, 4, dt); f.armL.rotation.x = damp(f.armL.rotation.x, Math.sin(G.time * 0.7 + w.i) * 0.05, 4, dt);
          f.hips.rotation.x = damp(f.hips.rotation.x, 0, 4, dt); f.group.position.set(w.px, w.py, w.pz);
          if (dist < 3.3 && this.calm > 1.5 && still) { w.state = 'greet'; w.gT = 0; }
          break;
        }
      }
    }
  }
  /** Legs, arms and bob of a walking (run 0) or running (run 1) bystander. */
  walking(w, f, moved, dt, run) {
    w.moving = damp(w.moving, Math.min(1, moved / Math.max(dt, 1e-3) / 3), 10, dt); w.walk += moved * 2.6;
    const sw = stride(f, w.walk, w.moving, run);
    if (!run) { f.armR.rotation.x = damp(f.armR.rotation.x, sw * 0.8, 12, dt); f.armL.rotation.x = damp(f.armL.rotation.x, -sw * 0.8, 12, dt); }
    f.hips.rotation.x = damp(f.hips.rotation.x, run ? 0.28 : 0.06, 6, dt);
    f.group.position.set(w.px, w.py + Math.abs(Math.cos(w.walk)) * (0.04 + 0.04 * run) * w.moving, w.pz);
  }
  /** Talking to the player. */
  gesture(w, f, t, dt) {
    const k = 10, ph = t + w.i * 1.7;
    let ar = -0.15, al = -0.1, arz = -0.08, alz = 0.08, hx = w.sit && !w.stood ? w.saved.hips.x : 0;
    switch (w.gest) {
      case 'talk': ar = -0.95 + Math.sin(ph * 5) * 0.3; al = -0.55 + Math.sin(ph * 4.1 + 1) * 0.25; arz = 0.25; alz = -0.2; break;
      case 'wave': ar = -2.7; arz = -0.25 + Math.sin(ph * 10) * 0.4; break;
      case 'nod': hx += Math.max(0, Math.sin(ph * 6)) * 0.12; ar = -0.3; al = -0.3; arz = 0.3; alz = -0.3; break;
      case 'shrug': ar = -0.5; al = -0.5; arz = -0.55 - Math.max(0, Math.sin(ph * 3)) * 0.2; alz = 0.55 + Math.max(0, Math.sin(ph * 3)) * 0.2; break;
      case 'point': ar = -1.55; arz = 0.15; break;
    }
    f.armR.rotation.x = damp(f.armR.rotation.x, ar, k, dt); f.armL.rotation.x = damp(f.armL.rotation.x, al, k, dt);
    f.armR.rotation.z = damp(f.armR.rotation.z, arz, k, dt); f.armL.rotation.z = damp(f.armL.rotation.z, alz, k, dt);
    f.hips.rotation.x = damp(f.hips.rotation.x, hx, 6, dt);
  }
  /** The fall of one who was killed. */
  fallen(w, dt) {
    const f = w.f;
    if (w.t > 1) return;
    w.t += dt;
    const e = Math.min(1, w.t / 0.55) ** 2, s = f.scale || 1;
    if (w.slump) { f.hips.rotation.x = 0.9 * e; f.armR.rotation.x = 0.3 * e; f.armL.rotation.x = 0.25 * e; if (!w.sit || w.stood) { f.group.position.y = w.py - e * 0.55 * s; f.legL.rotation.x = f.legR.rotation.x = -1.3 * e; f.shinL.rotation.x = f.shinR.rotation.x = 1.4 * e; } }
    else {
      f.group.rotation.set(w.fall * e * 1.5, w.yaw0, 0);          // -1: backward, away from the shot
      f.group.position.set(w.px, w.py + e * 0.14 * s, w.pz);
      f.armL.rotation.x = -0.6 * e; f.armR.rotation.x = 0.5 * e; f.armL.rotation.z = 0.9 * e; f.armR.rotation.z = -0.7 * e;
      f.legL.rotation.x = 0.25 * e; f.legR.rotation.x = -0.2 * e; f.shinL.rotation.x = 0.35 * e;
    }
  }
  /** A bench or a bed has been broken: whoever sat or lay on it gets up and runs. */
  seatGone(p) {
    for (const w of this.list) if (!w.dead && w.sit && !w.stood && Math.hypot(w.x - p.x, w.z - p.z) < p.r + 0.4 && Math.abs(w.y - p.y) < 0.6) this.frighten(w, p.x, p.z);
  }
  /** Duel: the other player killed bystander i. */
  killed(i) { const w = this.list[i]; if (w && !w.dead) this.die(w, w.px + 1, w.pz, false, false); }
}

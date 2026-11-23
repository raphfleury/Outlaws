// Two players online, one in each browser, in a chapter's world. Four ways to play:
//  - rounds: each kill ends a round, the first to win five rounds wins;
//  - timed: seven minutes, the most kills wins;
//  - ctf (capture the flag): each player's flag stands at his end of the map; take the other's and bring it to yours while yours
//    is there. First to three captures, or the most after seven minutes. The host's browser keeps the flags and decides;
//  - coop (together): the two players against the chapter's enemies (3 to 24), no harm between them, each counting his own kills;
//    the mission is over when the last enemy falls.
import * as THREE from 'three';
import { Enemy, TYPES, stride } from './actors.js';
import { Link } from './net.js';
import { damp } from './util.js';

/** Weapons are tuned to fell computer enemies in one or two hits; between players they hit less hard. */
export const DUEL_DMG = 0.6;
export const RULES = { rounds: 'First to 5 rounds', timed: '7 minutes, most kills', ctf: 'Capture the flag', coop: 'Together against the enemy' };
const WIN_ROUNDS = 5, TIMED = 420, RESPAWN = 3, CAPTURES = 3, FLAG_BACK = 25;
const shuffle = (a, rand) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;

/** The other player, as a figure in this player's world. It sits in game.enemies, so every weapon can hit it. */
export class RemotePlayer extends Enemy {
  constructor(game, hero) {
    super(game, 'duelist', 0, 0, { look: hero.look, patrol: false, static: true });
    this.remote = true; this.hero = hero.name; this.name = (game.duel && game.duel.theirName) || hero.name; this.mods = { stealth: 1, ...hero.mods };   // the name the other player gave, or his hero's
    this.vel = new THREE.Vector3(); this.net = null; this.aimF = 0; this.swing = 0; this.duck = 0;
    this.rig.group.visible = false;                    // until the first report arrives
  }
  get dead() { return !this.alive; }
  /** The other player sneaks (X): enemies notice him later, and he does not show on the map. */
  get sneaking() { return !!this.net && !!(this.net.f & 16); }
  /** The other player has used his Vanish skill: enemies lose sight of him, and he is hardly to be seen. */
  get cloak() { return !!this.net && !!(this.net.f & 32); }
  skillOn(id) { return id === 'vanish' && this.cloak; }
  /** In the game together, the other player is a team-mate: what this player throws or shoots passes him by (see Game.friend). */
  /** A crouching opponent is hit where the figure is drawn: half a metre lower. */
  rayHit(o, d, max) { const k = 0.5 * this.duck; this.pos.y -= k; const h = super.rayHit(o, d, max); this.pos.y += k; return h; }
  /** A hit by this player's weapon: the damage is applied in the other browser. */
  damage(amount, head, fromX, fromZ) {
    if (!this.alive || this.game.duel.cfg.rules === 'coop') return false;
    this.flinch = 1; this.flash = 1; this.hurtT = 0;
    this.game.duel.send({ t: 'hit', d: r2(amount * (head ? 2.5 : 1) * DUEL_DMG), x: r2(fromX), z: r2(fromZ) });
    return false;
  }
  fall(fromX, fromZ) { if (this.alive) { this.hp = 1; super.damage(999, false, fromX, fromZ); } }
  revive() {
    this.state = 'idle'; this.hp = 100; this.slump = false; this.deathT = 0;
    const rig = this.rig; rig.group.rotation.set(0, this.yaw, 0);
    for (const k of ['armL', 'armR', 'legL', 'legR', 'hips', 'shinL', 'shinR']) if (rig[k]) rig[k].rotation.set(0, 0, 0);
    rig.group.traverse((o) => { if (o.userData.wound) o.removeFromParent(); }); rig.wounds = 0;     // a new round: no wounds
  }
  update(dt) {
    if (this.state === 'dead') { super.update(dt); return; }
    const rig = this.rig, n = this.net;
    this.flash = Math.max(0, this.flash - dt * 7); this.flinch = Math.max(0, this.flinch - dt * 5); this.hurtT += dt;
    rig.mat.emissive.setScalar(this.flash * 0.7);
    if (!n) return;
    if (n.h !== undefined) { this.hp = n.h; this.maxHp = n.mh || 100; }          // the other player's health, as his browser reports it
    rig.group.visible = true;
    const ghost = !!(n.f & 32);
    if (ghost !== !!this.ghostly) {                    // vanished: the figure all but fades away (what he carries, made of shared materials, is hidden)
      this.ghostly = ghost; const m = rig.mat; m.transparent = ghost; m.opacity = ghost ? (this.game.duel.cfg.rules === 'coop' ? 0.45 : 0.12) : 1; m.depthWrite = !ghost; m.needsUpdate = true;
      rig.group.traverse((o) => { if (o.material && o.material !== m) o.visible = !ghost; });
    }
    const bx = this.pos.x, bz = this.pos.z, k = Math.min(1, dt * 14), inv = 1 / Math.max(dt, 1e-3);
    if (Math.hypot(n.x - bx, n.z - bz) > 6) this.pos.set(n.x, n.y, n.z);                    // a respawn: jump, do not slide
    else { this.pos.x += (n.x - bx) * k; this.pos.y += (n.y - this.pos.y) * k; this.pos.z += (n.z - bz) * k; }
    const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
    this.vel.set(moved < 3 ? (this.pos.x - bx) * inv : 0, 0, moved < 3 ? (this.pos.z - bz) * inv : 0);
    let dy = n.yaw + Math.PI - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * k;   // the figure faces +Z, a player looks down -Z
    this.moving = damp(this.moving, Math.min(1, moved * inv / 3), 10, dt); this.walk += Math.min(moved, 1) * 2.6;
    this.runK = damp(this.runK, Math.max(0, Math.min(1, (moved * inv - 2.4) / 3)), 6, dt);
    this.sync();
    const sw = -stride(rig, this.walk, this.moving, this.runK, this.hp < this.maxHp * 0.4 ? 1 : 0);
    rig.group.position.y = this.pos.y + Math.abs(Math.cos(this.walk)) * 0.04 * this.moving;
    rig.hips.rotation.x = this.moving * 0.08 - this.flinch * 0.35;
    const dk = (this.duck = damp(this.duck, n.f & 8 ? 1 : 0, 12, dt));
    if (dk > 0.01) { rig.group.position.y -= 0.5 * dk; rig.legL.rotation.x = rig.legL.rotation.x * (1 - dk) - 1.35 * dk; rig.legR.rotation.x = rig.legR.rotation.x * (1 - dk) + 0.9 * dk; rig.hips.rotation.x += 0.25 * dk;
      if (rig.shinL) { rig.shinL.rotation.x = rig.shinL.rotation.x * (1 - dk) + 1.35 * dk; rig.shinR.rotation.x = rig.shinR.rotation.x * (1 - dk) + 1.6 * dk; } }   // down on one knee
    this.aimF = damp(this.aimF, n.f & 1 ? 1 : 0.6, 12, dt);
    this.swing = n.f & 2 ? Math.min(1, this.swing + dt * 5) : Math.max(0, this.swing - dt * 6);
    rig.armR.rotation.x = (-Math.PI / 2 - n.pitch) * this.aimF + sw * 0.5 * (1 - this.aimF) - Math.sin(this.swing * Math.PI) * 1.2;
    rig.armR.rotation.z = -0.08; rig.armL.rotation.x = sw * -0.7; rig.armL.rotation.z = 0.08;
  }
}

export class Duel {
  constructor(game) {
    this.game = game; this.link = new Link(); this.phase = 'lobby'; this.isHost = false; this.cfg = null;
    this.score = [0, 0]; this.round = 0; this.myPick = -1; this.theirPick = -1; this.remote = null; this.ai = [];
    this.sendT = 0; this.enT = 0; this.wait = 0; this.next = ''; this.clock = TIMED; this.flags = null; this.flT = 0; this.ftT = [0, 0]; this.guestHit = false;
    this.link.onmsg = (m) => this.onmsg(m); this.link.onopen = () => this.connected(); this.link.onclose = () => this.lost();
  }
  get active() { return this.phase !== 'lobby' && this.phase !== 'left'; }
  send(m) { this.link.send(m); }

  connected() {
    this.game.voice.attach(this.link);
    this.send({ t: 'name', n: this.game.myName || '' });
    if (this.isHost) { this.send({ t: 'setup', c: this.cfg }); this.enterPick(); }
    else this.game.duelStatus('Connected. Waiting for the host…');
  }
  lost() { this.game.voice.close(); if (this.phase !== 'over' && this.phase !== 'left') this.finish('left'); }
  enterPick() { this.phase = 'pick'; this.myPick = this.theirPick = -1; this.remote = null; this.ai = []; this.wait = 0; this.game.openLevel(this.cfg.level); }
  /** After a duel the two browsers stay connected: back to the Duel screen, where the host starts the next one. */
  again() { if (this.phase === 'over' && this.link.open) { this.phase = 'lounge'; this.game.duelLounge(); } }
  /** Host: start another duel over the same connection, with the same or new settings. */
  startNext(cfg) { if (!this.isHost || !this.link.open || this.phase === 'pick' || this.phase === 'play') return; this.cfg = cfg; this.send({ t: 'setup', c: cfg }); this.enterPick(); }

  /**
   * The chapter's computer enemies in this game (the host chose how many, 3 to 24 by threes, or none). Together against them: a random
   * choice of all of them, the boss included. Against each other: walkers only (no boss, nobody on a perch or in ambush). The game's seed,
   * the same in both browsers, makes the same choice and the same places on both sides.
   */
  enemyList(list, rand) {
    const n = Math.min(24, Math.max(0, Math.round(this.cfg.foes || 0)));
    if (!n) return [];
    if (this.cfg.rules === 'coop') {
      const boss = list.filter(([t]) => TYPES[t].boss), rest = shuffle(list.filter(([t]) => !TYPES[t].boss), rand);
      return boss.concat(rest).slice(0, n);
    }
    const ok = shuffle(list.filter(([type, , , o]) => !TYPES[type].boss && !(o && (o.static || o.ambush || o.up !== undefined || o.y !== undefined))), rand);
    return ok.slice(0, n);
  }

  pick(k) { if (this.myPick >= 0) return; this.myPick = k; this.send({ t: 'pick', k }); this.game.duelPickInfo(); this.tryStart(); }
  tryStart() { if (this.isHost && this.myPick >= 0 && this.theirPick >= 0 && this.phase === 'pick') { this.send({ t: 'go' }); this.startMatch(); } }

  startMatch() {
    const G = this.game;
    this.ai = G.enemies.slice(); this.ai.forEach((e, i) => { e.idx = i; e.puppet = !this.isHost; });
    this.remote = new RemotePlayer(G, G.roster()[this.theirPick]); G.enemies.push(this.remote);
    G.voice.paint();
    this.score = [0, 0]; this.round = 0; this.clock = TIMED;
    if (this.cfg.rules === 'ctf') this.makeFlags();
    G.practice = false; document.body.classList.remove('practice');          // no practice mode in a duel
    this.startRound();
  }
  /** The two ends of the map: where the chapter starts, and where its boss stands. */
  spawnPoints() {
    const G = this.game, L = G.level, a = L.spawn;
    let b = null;
    for (const [type, x, z, o] of L.enemies) if (TYPES[type].boss) b = { x, z, o: o || {} };
    if (!b) b = { x: -a.x, z: -a.z, o: {} };
    const hint = b.o.up !== undefined ? G.world.height(b.x, b.z) + b.o.up : b.o.y ?? 2;
    return [{ x: a.x, z: a.z, yaw: a.yaw }, { x: b.x, z: b.z, hint, yaw: Math.atan2(-(a.x - b.x), -(a.z - b.z)) }];
  }
  startRound() {
    const G = this.game, pts = this.spawnPoints();
    this.round++; this.phase = 'play'; this.wait = 0;
    G.shots.clear();
    if (this.remote && !this.remote.alive) this.remote.revive();
    this.place(this.base(pts));
    const r = this.cfg.rules;
    G.say(r === 'rounds' ? 'Round ' + this.round : r === 'ctf' ? 'Take the red flag, bring it to yours' : r === 'coop' ? 'Together with ' + this.remote.name + ': ' + this.ai.length + ' enemies' : 'Find ' + this.remote.name);
  }
  place(pt) {
    const G = this.game, P = G.player, h = G.roster()[this.myPick];
    P.spawn(pt.x, pt.z, pt.yaw, h.weapon ?? G.def.weapon);
    P.pos.y = G.world.groundAt(pt.x, pt.z, pt.hint ?? G.world.height(pt.x, pt.z) + 1); P.camY = P.pos.y + 1.65; P.roll = 0;
    P.setWeapon(h.weapon ?? G.def.weapon, h.sleeve, h.cuff);
    G.gfx.damage = 0; G.cache = {};
    G.setState('play'); if (!G.input.free) G.input.lock();
    this.sendState();
  }
  /**
   * Where this player starts: in rounds the players change ends every round; with flags each player keeps his own end (the host the
   * chapter's start, the guest the boss's place); together, both start at the chapter's start, side by side.
   */
  base(pts) {
    const r = this.cfg.rules;
    if (r === 'ctf') return pts[this.isHost ? 0 : 1];
    if (r === 'coop') { const p = pts[0], s = this.isHost ? -1.3 : 1.3; return { ...p, x: p.x + Math.cos(p.yaw) * s, z: p.z - Math.sin(p.yaw) * s }; }
    return pts[(this.round + (this.isHost ? 1 : 0)) % 2];
  }
  /** After a death (timed, flags, together): back at one's own end, or in the timed game at the end farther from the opponent. */
  respawn() {
    const pts = this.spawnPoints(), R = this.remote.pos, d = (p) => (p.x - R.x) ** 2 + (p.z - R.z) ** 2;
    this.place(this.cfg.rules === 'timed' ? (d(pts[0]) > d(pts[1]) ? pts[0] : pts[1]) : this.base(pts));
  }

  localDied() {
    const r = this.cfg.rules;
    if (r === 'rounds' || r === 'timed') this.score[1]++;                       // with flags or together, a death scores nothing
    if (r === 'ctf' && this.isHost) this.dropFlag('h', this.game.player.pos);
    this.send({ t: 'died' }); this.afterKill(false);
  }
  afterKill(mine) {
    const G = this.game, r = this.cfg.rules;
    if (r === 'coop') { if (!mine) { G.say('You are down — back in a moment'); this.wait = 5; this.next = 'respawn'; } else G.say(this.remote.name + ' is down'); G.cache = {}; return; }
    G.say(mine ? 'You got ' + this.remote.name : this.remote.name + ' got you');
    if (r === 'rounds' && Math.max(this.score[0], this.score[1]) >= WIN_ROUNDS) { this.wait = 2.2; this.next = 'over'; }
    else if (r === 'rounds') { this.wait = RESPAWN; this.next = 'round'; }
    else if (!mine) { this.wait = r === 'ctf' ? 4 : RESPAWN; this.next = 'respawn'; }
    G.cache = {};
  }
  finish(why) {
    if (this.phase === 'over' || this.phase === 'left') return;
    const [a, b] = this.score, was = this.phase, r = this.cfg.rules;
    this.phase = 'over';
    if (was === 'lobby' || was === 'pick' || was === 'lounge') { this.game.duelAborted(); return; }
    const title = why === 'left' ? (r === 'coop' ? 'Your team-mate left' : 'Your opponent left') : r === 'coop' ? 'Mission accomplished'
      : a > b ? (r === 'ctf' ? 'You took the most flags' : 'You win the duel') : a < b ? (r === 'ctf' ? 'They took more flags' : 'You lose the duel') : 'A draw';
    this.game.duelOver(title, a, b);
  }

  // ---- together: kills counted for each player (the host's browser counts them) ------------------------------------
  /** Host: one of the computer enemies has fallen. A blow reported by the guest (see 'ehit') counts for the guest, anything else for the host. */
  enemyKilled() {
    if (!this.isHost || this.cfg.rules !== 'coop' || this.phase !== 'play') return;
    this.score[this.guestHit ? 1 : 0]++;
    this.send({ t: 'kills', s: this.score.slice(), left: this.ai.filter((e) => e.alive).length });
    this.game.cache = {};
  }

  // ---- capture the flag ------------------------------------------------------------------------------------------------
  /** The two flags, at the two ends of the map: flags[0] the host's, flags[1] the guest's. Mine is blue, the other red. */
  makeFlags() {
    const G = this.game, pts = this.spawnPoints(), mine = this.isHost ? 0 : 1;
    this.caps = [0, 0]; this.saidFl = '';
    this.flags = [0, 1].map((i) => {
      const p = pts[i], y = G.world.groundAt(p.x, p.z, (p.hint ?? G.world.height(p.x, p.z)) + 1), col = i === mine ? 0x2a62d8 : 0xd8322a;
      const mesh = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.25 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 6), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 })); pole.position.y = 1.3;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6, 6, 1), mat); cloth.position.set(0.5, 2.25, 0); mesh.add(pole, cloth);
      mesh.traverse((o) => { o.castShadow = true; }); G.gfx.root.add(mesh);
      return { i, home: { x: p.x, y, z: p.z }, x: p.x, y, z: p.z, by: null, atHome: true, dropT: 0, mesh, cloth };
    });
  }
  /** Is a flag carried by 'me' or by 'them'? */
  carrying(who) {
    if (!this.flags) return false;
    const me = this.isHost ? 'h' : 'g', them = this.isHost ? 'g' : 'h';
    return this.flags.some((f) => f.by === (who === 'me' ? me : them));
  }
  /** Host: player who ('h' or 'g') touches flag i. */
  touch(who, i) {
    const f = this.flags[i], owner = i === 0 ? 'h' : 'g', other = this.flags[1 - i];
    if (f.by || this.phase !== 'play') return;
    if (who !== owner) { f.by = who; f.atHome = false; }                                         // the other's flag: taken
    else if (!f.atHome) { f.atHome = true; f.x = f.home.x; f.y = f.home.y; f.z = f.home.z; }   // one's own, lying out there: back home
    else if (other.by === who) {                                                                // one's own at home, the other's in hand: a capture
      other.by = null; other.atHome = true; other.x = other.home.x; other.y = other.home.y; other.z = other.home.z;
      this.caps[who === 'h' ? 0 : 1]++;
      if (Math.max(...this.caps) >= CAPTURES) { this.sendFlags(); this.send({ t: 'over' }); this.wait = 0; this.applyFlags(); this.finish('score'); return; }
    } else return;
    this.sendFlags(); this.applyFlags();
  }
  /** Host: a carrier has fallen: the flag lies where he fell, and goes home by itself after a while. */
  dropFlag(who, pos) {
    if (!this.flags) return;
    for (const f of this.flags) if (f.by === who) { f.by = null; f.atHome = false; f.x = pos.x; f.y = this.game.world.groundAt(pos.x, pos.z, pos.y + 0.5); f.z = pos.z; f.dropT = FLAG_BACK; }
    this.sendFlags(); this.applyFlags();
  }
  sendFlags() { this.send({ t: 'fl', f: this.flags.map((f) => [f.by || '', f.atHome ? 1 : 0, r2(f.x), r2(f.y), r2(f.z)]), c: this.caps }); }
  /** The flags' state as the host decided it: the score, and a word when something happened. */
  applyFlags() {
    const G = this.game, me = this.isHost ? 'h' : 'g', mine = this.flags[this.isHost ? 0 : 1], theirs = this.flags[this.isHost ? 1 : 0];
    const before = this.score.slice(); this.score = this.isHost ? this.caps.slice() : [this.caps[1], this.caps[0]];
    const said = (k, t) => { if (this.saidFl !== k) { this.saidFl = k; G.say(t); G.sound.pickup(); } };
    if (this.score[0] > before[0]) said('cap' + this.score[0], 'You captured their flag!');
    else if (this.score[1] > before[1]) said('lost' + this.score[1], this.remote.name + ' captured your flag');
    else if (theirs.by === me) said('have', 'You have their flag — bring it to yours');
    else if (mine.by && mine.by !== me) said('took', this.remote.name + ' has taken your flag!');
    else if (!mine.atHome && !mine.by) said('lies', 'Your flag lies out there — touch it to send it home');
    else said('', '');
    G.cache = {};
  }
  /** Every frame: the flags follow their carriers and wave; this player touching one tells the host. */
  tickFlags(dt) {
    const G = this.game, P = G.player, me = this.isHost ? 'h' : 'g';
    for (const f of this.flags) {
      if (f.by) { const who = f.by === me ? P.pos : this.remote.pos, yaw = f.by === me ? P.yaw : this.remote.yaw + Math.PI; f.x = who.x - Math.sin(yaw) * -0.35; f.y = who.y + 0.3; f.z = who.z - Math.cos(yaw) * -0.35; }
      f.mesh.position.set(f.x, f.y, f.z); f.mesh.visible = !(f.by === me);                    // one's own carried flag would only hide the view
      f.cloth.rotation.y = Math.sin(G.time * 3 + f.i) * 0.25;
      if (this.isHost && !f.by && !f.atHome) { f.dropT -= dt; if (f.dropT <= 0) { f.atHome = true; f.x = f.home.x; f.y = f.home.y; f.z = f.home.z; this.sendFlags(); this.applyFlags(); } }
      if (P.dead || f.by) continue;
      if ((f.x - P.pos.x) ** 2 + (f.z - P.pos.z) ** 2 < 2.9 && Math.abs(f.y - P.pos.y) < 2) {
        if (this.isHost) this.touch('h', f.i);
        else if ((this.ftT[f.i] -= dt) <= 0) { this.ftT[f.i] = 0.4; this.send({ t: 'ft', i: f.i }); }
      }
    }
    if (this.isHost) { this.flT -= dt; if (this.flT <= 0) { this.flT = 1; this.sendFlags(); } }
  }
  leave() { this.game.voice.close(); if (this.phase !== 'left') { this.send({ t: 'bye' }); this.phase = 'left'; const l = this.link; setTimeout(() => l.close(), 250); } }

  /** Called every frame. */
  tick(dt) {
    if (this.phase !== 'play') return;
    this.sendT -= dt; if (this.sendT <= 0) { this.sendT = 0.05; this.sendState(); }
    if (this.flags) this.tickFlags(dt);
    if (this.isHost && this.cfg.rules === 'coop' && this.ai.length && this.ai.every((e) => !e.alive) && this.next !== 'over') { this.send({ t: 'over' }); this.wait = 2.5; this.next = 'over'; }   // the last enemy has fallen
    if (this.isHost && this.ai.length) {
      this.enT -= dt;
      if (this.enT <= 0) { this.enT = 0.1; this.send({ t: 'en', e: this.ai.map((e) => [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.yaw), e.state === 'dead' ? 2 : e.state === 'combat' ? 1 : e.state === 'hidden' ? 3 : 0, e.armPose > 0.5 ? 1 : 0, e.sneaking ? 1 : 0, r2(Math.max(0, e.hp) / e.maxHp), r2(e.duckK)]) }); }
    }
    if (this.cfg.rules === 'timed' || this.cfg.rules === 'ctf') {
      this.clock -= dt;
      if (this.isHost && this.clock <= 0) { this.send({ t: 'over' }); this.finish('time'); return; }
    }
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) { if (this.next === 'over') this.finish('score'); else if (this.next === 'round') this.startRound(); else this.respawn(); }
    }
  }
  sendState() {
    const P = this.game.player, w = P.weapon, m = { t: 's', x: r2(P.pos.x), y: r2(P.pos.y), z: r2(P.pos.z), yaw: r3(P.yaw), pitch: r3(P.pitch), f: (P.aim > 0.5 ? 1 : 0) | (w && w.meleeT > 0 ? 2 : 0) | (P.dead ? 4 : 0) | (P.crouch ? 8 : 0) | (P.sneaking ? 16 : 0) | (P.cloak ? 32 : 0), h: Math.max(0, Math.round(P.hp)), mh: P.maxHp };
    if (this.isHost && (this.cfg.rules === 'timed' || this.cfg.rules === 'ctf')) m.c = Math.ceil(this.clock);
    this.send(m);
  }
  // what this player fires, shown in the other browser
  tracer(ax, ay, az, bx, by, bz) { this.send({ t: 'tr', a: [r2(ax), r2(ay), r2(az), r2(bx), r2(by), r2(bz)] }); }
  /** This player used his skill: the other one hears it (a vanishing is shown through the state flags). */
  skill(id) { this.send({ t: 'sk', k: id }); }
  shot(kind, x, y, z, dx, dy, dz, speed, grav) { this.send({ t: 'sh', k: kind, a: [r2(x), r2(y), r2(z), r3(dx), r3(dy), r3(dz), speed], g: grav }); }
  enemyShot(kind, x, y, z, dx, dy, dz, speed, grav) { if (this.isHost) this.send({ t: 'esh', k: kind, a: [r2(x), r2(y), r2(z), r3(dx), r3(dy), r3(dz), speed], g: grav }); }
  /** Host: a computer enemy turns on whichever player is nearer. */
  targetFor(e) {
    const P = this.game.player, R = this.remote;
    if (!this.isHost || !R || !R.alive || !R.net) return P;
    if (P.dead) return R;
    return e.pos.distanceToSquared(R.pos) < e.pos.distanceToSquared(P.pos) ? R : P;
  }
  hud() {
    const [a, b] = this.score, n = this.remote ? this.remote.name : 'opponent', r = this.cfg.rules;
    const clock = () => { const t = Math.max(0, Math.ceil(this.clock)); return ' · ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
    if (r === 'coop') return `Kills: you <b>${a}</b> · <b>${b}</b> ${n} · <b>${this.ai.filter((e) => e.alive).length}</b> left`;
    if (r === 'ctf') return `Flags: you <b>${a}</b>–<b>${b}</b> ${n}${clock()}${this.carrying('me') ? ' · <b>you have their flag</b>' : ''}${this.carrying('them') ? ' · <b>your flag is taken</b>' : ''}`;
    return `You <b>${a}</b>–<b>${b}</b> ${n}${r === 'rounds' ? ' · round ' + this.round : clock()}`;
  }

  onmsg(m) {
    const G = this.game, P = G.player;
    const ghost = () => {
      if (!G.shots.geo[m.k]) return;
      const s = G.shots.spawn(m.k, m.a[0], m.a[1], m.a[2], m.a[3], m.a[4], m.a[5], m.a[6], false, 0, m.g ?? undefined); s.ghost = true; s.foe = m.t === 'esh';   // foe: an enemy's (its bomb hurts both players)
      const d = Math.hypot(m.a[0] - P.pos.x, m.a[2] - P.pos.z);
      if (m.k === 'bullet') { G.muzzle(m.a[0], m.a[1], m.a[2], m.a[3], m.a[4], m.a[5], 0.7); G.sound.gun(Math.max(0.15, 0.8 - d / 90), Math.min(1, d / 70)); } else if (d < 40) G.sound.bow();
    };
    switch (m.t) {
      case 'setup': if (!this.isHost && this.phase !== 'pick' && this.phase !== 'play') { this.cfg = m.c; this.enterPick(); } break;   // the first duel, or the next one
      case 'pick': this.theirPick = m.k; G.duelPickInfo(); this.tryStart(); break;
      case 'go': if (!this.isHost && this.phase === 'pick') this.startMatch(); break;
      case 's':
        if (!this.remote) break;
        this.remote.net = m; if (m.c !== undefined) this.clock = m.c;
        if (!(m.f & 4) && !this.remote.alive && this.cfg.rules !== 'rounds') this.remote.revive();
        break;
      case 'hit': if (this.phase === 'play') G.hurtPlayer(m.d, { x: m.x, z: m.z }, !!m.m); break;
      case 'died': if (this.remote && this.remote.alive) {
        const r = this.cfg.rules;
        if (r === 'ctf' && this.isHost) this.dropFlag('g', this.remote.pos);
        this.remote.fall(P.pos.x, P.pos.z); if (r === 'rounds' || r === 'timed') { this.score[0]++; G.sound.killmark(); } this.afterKill(true);
      } break;
      case 'ft': if (this.isHost && this.flags) this.touch('g', m.i); break;                  // the guest touched a flag
      case 'fl': if (!this.isHost && this.flags) { m.f.forEach((a, i) => { const f = this.flags[i]; f.by = a[0] || null; f.atHome = !!a[1]; if (!f.by) { f.x = a[2]; f.y = a[3]; f.z = a[4]; } }); this.caps = m.c; this.applyFlags(); } break;
      case 'kills': if (!this.isHost) { this.score = [m.s[1], m.s[0]]; G.cache = {}; } break;
      case 'tr': {
        const a = m.a, l = Math.hypot(a[3] - a[0], a[4] - a[1], a[5] - a[2]) || 1, d = Math.hypot(a[0] - P.pos.x, a[2] - P.pos.z);
        G.crowd.alarm(a[0], a[2], 26, a[0], a[2]); G.crowd.alarm(a[3], a[5], 7, a[0], a[2]);
        G.shots.tracer(a[0], a[1], a[2], a[3], a[4], a[5]); G.muzzle(a[0], a[1], a[2], (a[3] - a[0]) / l, (a[4] - a[1]) / l, (a[5] - a[2]) / l, 0.8);
        G.sound.gun(Math.max(0.15, 0.8 - d / 90), Math.min(1, d / 70));
        break;
      }
      case 'sh': case 'esh': ghost(); break;
      case 'sk': G.sound.skill(m.k); break;      // the other player's skill: heard
      case 'mk': if (this.cfg && this.cfg.rules === 'coop') G.map.mateMark(m); break;   // the partner marked a place (or took his mark away)
      case 'drop': if (this.phase === 'play' && m.w && (m.w.type === 'weapon' || m.w.type === 'item')) G.addPickup(m.x, m.z, G.level, m.y, m.w); break;   // something the other player put down
      case 'name': this.theirName = String(m.n || '').slice(0, 16); if (this.remote) this.remote.name = this.theirName || this.remote.hero; if (this.phase === 'pick') G.duelPickInfo(); break;
      case 'en': if (!this.isHost) m.e.forEach((a, i) => { const e = this.ai[i]; if (e) e.net = { x: a[0], y: a[1], z: a[2], yaw: a[3], st: a[4], pose: a[5], sn: a[6], hp: a[7], dk: a[8] || 0 }; }); break;
      case 'bk': G.crowd.killed(m.i); break;                    // a bystander the other player killed
      case 'brk': { const p = G.world.pieces[m.i]; if (p) G.havoc.breakPiece(p, false); break; }   // a crate or a keg the other player shot to pieces
      case 'ehit': if (this.isHost) { const e = this.ai[m.i]; if (e) { this.guestHit = true; e.damage(m.d, !!m.h, m.x, m.z); this.guestHit = false; } } break;
      case 'pk': {                       // the other player took something: the nearest of that kind goes here too (a drop lies where the enemy fell, which can differ a little)
        let best = -1, bd = m.k ? 2.5 : 0.6;
        G.pickups.forEach((q, i) => { const d = Math.hypot(q.x - m.x, q.z - m.z); if (d < bd && (!m.k || G.pickupKey(q.what) === m.k)) { bd = d; best = i; } });
        if (best >= 0) { G.pickups[best].mesh.removeFromParent(); G.pickups.splice(best, 1); }
        break;
      }
      case 'over': if (this.cfg.rules === 'coop') { this.wait = 2.5; this.next = 'over'; } else this.finish('time'); break;
      case 'bye': this.finish('left'); break;
    }
  }
}

/** Wire the lobby screen. */
export function bindDuelUI(G) {
  const $ = (s) => document.querySelector(s);
  G.duelStatus = (t) => { $('#dstatus').textContent = t; };
  const cfg = () => { const rules = $('#drules').value; return { level: +$('#dlevel').value, rules, foes: rules === 'coop' ? Math.max(3, +$('#dfoes').value) : +$('#dfoes').value, seed: (Math.random() * 2 ** 31) | 0, wits: $('#dwits').value, size: $('#dsize').value }; };
  const fresh = (host) => { if (G.duel) G.duel.link.close(); const d = (G.duel = new Duel(G)); d.isHost = host; d.link.onerror = fail; return d; };
  const fail = (e) => G.duelStatus('Could not connect (' + ((e && (e.type || e.message)) || 'unknown error') + '). Check the code and try again; if it still fails, create a new duel.');
  const copy = (text, done) => { const p = navigator.clipboard && navigator.clipboard.writeText(text); if (p) p.then(() => G.duelStatus(done), () => {}); };
  // no letter or digit that is easily taken for another one: no 0/O/Q, 1/I, 2/Z, 5/S, 8/B, G, and neither U nor V
  const code5 = () => { const a = 'ACDEFHJKLMNPRTWXY34679'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  /** Each player gives a name before playing: the other one sees it (scores, messages, the tag over a partner's head). */
  const needName = () => {
    const n = ($('#dname').value || '').trim().replace(/\s+/g, ' ').slice(0, 16);
    if (!n) { G.duelStatus('Write your name first: the other player will see it.'); $('#dname').focus(); return null; }
    try { localStorage.setItem('outlaws.name', n); } catch (e) { /* for this visit */ }
    G.myName = n; return n;
  };
  try { $('#dname').value = localStorage.getItem('outlaws.name') || ''; } catch (e) { /* no storage */ }
  const join = async (code) => {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code) return;
    if (!needName()) return;
    const d = fresh(false); G.duelStatus('Connecting…');
    try { await d.link.join(code); } catch (e) { fail(e); }
  };
  G.duelJoin = join;
  $('#duelbtn').addEventListener('click', () => { G.sound.init(); G.openDuel(); });
  $('#dback').addEventListener('click', () => G.closeDuel());
  $('#dcreate').addEventListener('click', async (e) => {
    e.currentTarget.blur();
    if (!needName()) return;
    const d = fresh(true), code = code5(); d.cfg = cfg(); G.duelStatus('Creating the duel…');
    try {
      await d.link.host(code);
      $('#dlink').value = location.origin + location.pathname + '?duel=' + code; $('#dcodeout').textContent = code; $('#dlinkbox').classList.remove('hidden');
      G.duelStatus('Send the link or the code to your opponent, then wait here.');
    } catch (e) { fail(e); }
  });
  // together, the enemies attack the two of you, and there are at least three
  const foesLabel = () => { const co = $('#drules').value === 'coop'; $('#dfoeslab').textContent = co ? 'Enemies against the two of you' : 'Computer enemies, hostile to both'; $('#dfoes').options[0].disabled = co; if (co && $('#dfoes').value === '0') $('#dfoes').value = '9'; };
  $('#drules').addEventListener('change', foesLabel); G.duelFoesLabel = foesLabel;
  $('#dagain').addEventListener('click', (e) => { e.currentTarget.blur(); if (G.duel) G.duel.startNext(cfg()); });
  $('#dcopy').addEventListener('click', () => copy($('#dlink').value, 'Link copied. Send it to your opponent, then wait here.'));
  $('#djoinbtn').addEventListener('click', (e) => { e.currentTarget.blur(); join($('#dcodein').value); });   // blurred: Enter, which then chooses the hero, must not press Join again
}

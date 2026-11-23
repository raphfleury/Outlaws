// Two to four players online, one in each browser, in a chapter's world, connected through the game server (net.js).
// Four ways to play:
//  - rounds: two sides (one or two players each); a round ends when everyone on one side has fallen; the first side to win
//    five rounds wins;
//  - timed: seven minutes; each fall scores for the other side; the side with more at the end wins;
//  - ctf (capture the flag): each side's flag stands at its end of the map; take the other's and bring it to yours while yours
//    is there. First to three captures, or the most after seven minutes;
//  - coop (together): all the players against the chapter's enemies (3 to 24), no harm between them, each counting his own kills;
//    the mission is over when the last enemy falls.
// The sides: the players in the order they came in, host first, take turns (1 and 3 against 2 and 4).
// The host's browser decides what concerns everyone: the computer enemies, the rounds and the score, the clock, the flags.
// Each browser decides for its own player: where he is, what he hits (it tells the one who was hit), when he falls.
import * as THREE from 'three';
import { Enemy, TYPES, stride } from './actors.js';
import { Link } from './net.js';
import { damp } from './util.js';

/** Weapons are tuned to fell computer enemies in one or two hits; between players they hit less hard. */
export const DUEL_DMG = 0.6;
export const RULES = { rounds: 'First to 5 rounds', timed: '7 minutes, most kills', ctf: 'Capture the flag', coop: 'Together against the enemy' };
export const MAX_PLAYERS = 4;
const WIN_ROUNDS = 5, TIMED = 420, RESPAWN = 3, CAPTURES = 3, FLAG_BACK = 25, BLAME = 6;
const shuffle = (a, rand) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const and = (names) => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];

/** Another player, as a figure in this player's world. It sits in game.enemies, so every weapon can hit it. */
export class RemotePlayer extends Enemy {
  constructor(game, hero, pid, name) {
    super(game, 'duelist', 0, 0, { look: hero.look, patrol: false, static: true });
    this.remote = true; this.pid = pid; this.hero = hero.name; this.name = name || hero.name; this.mods = { stealth: 1, ...hero.mods };
    this.vel = new THREE.Vector3(); this.net = null; this.aimF = 0; this.swing = 0; this.duck = 0;
    this.rig.group.visible = false;                    // until the first report arrives
  }
  get dead() { return !this.alive; }
  /** He sneaks (X): enemies notice him later, and he does not show on the map. */
  get sneaking() { return !!this.net && !!(this.net.f & 16); }
  /** He has used his Vanish skill: enemies lose sight of him, and he is hardly to be seen. */
  get cloak() { return !!this.net && !!(this.net.f & 32); }
  skillOn(id) { return id === 'vanish' && this.cloak; }
  /** A team-mate: what this player throws or shoots passes him by (see Game.friend). */
  get mate() { const D = this.game.duel; return !!D && D.mateOf(this.pid); }
  /** A crouching player is hit where the figure is drawn: half a metre lower. */
  rayHit(o, d, max) { const k = 0.5 * this.duck; this.pos.y -= k; const h = super.rayHit(o, d, max); this.pos.y += k; return h; }
  /** A hit by this player's weapon: the damage is applied in the other player's browser. */
  damage(amount, head, fromX, fromZ) {
    if (!this.alive || this.mate) return false;
    this.flinch = 1; this.flash = 1; this.hurtT = 0;
    this.game.duel.send({ t: 'hit', to: this.pid, d: r2(amount * (head ? 2.5 : 1) * DUEL_DMG), x: r2(fromX), z: r2(fromZ) });
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
    if (n.h !== undefined) { this.hp = n.h; this.maxHp = n.mh || 100; }          // his health, as his browser reports it
    rig.group.visible = true;
    const ghost = !!(n.f & 32);
    if (ghost !== !!this.ghostly) {                    // vanished: the figure all but fades away (what he carries, made of shared materials, is hidden)
      this.ghostly = ghost; const m = rig.mat; m.transparent = ghost; m.opacity = ghost ? (this.mate ? 0.45 : 0.12) : 1; m.depthWrite = !ghost; m.needsUpdate = true;
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
    this.game = game; this.link = new Link(); this.phase = 'lobby'; this.isHost = false; this.cfg = null; this.code = '';
    this.picks = new Map(); this.teams = new Map(); this.remotes = new Map(); this.ai = [];
    this.score = [0, 0]; this.kills = {}; this.round = 0; this.myPick = -1;
    this.sendT = 0; this.enT = 0; this.wait = 0; this.next = ''; this.clock = TIMED; this.flags = null; this.flT = 0; this.ftT = [0, 0];
    this.guestHit = -1; this.blameId = -1; this.blameT = -99;
    const L = this.link;
    L.onmsg = (m, from) => this.onmsg(m, from); L.onjoin = (id, n) => this.joined(id, n); L.onleave = (id) => this.left(id); L.onclose = (why) => this.lost(why);
  }
  get active() { return this.phase !== 'lobby' && this.phase !== 'left'; }
  get me() { return this.link.id; }
  send(m) { this.link.send(m); }

  // ---- who is who --------------------------------------------------------------------------------------------------------
  /** Everyone in the game, this player included, in the order they came in (the host first). */
  ids() {
    const on = (id) => id === this.me || this.link.peers.has(id);
    return (this.teams.size ? [...this.teams.keys()].filter(on) : [this.me, ...this.link.peers.keys()]).sort((a, b) => a - b);   // during a game, those who play it
  }
  get count() { return this.ids().length; }
  nameOf(id) { return id === this.me ? this.game.myName || 'You' : this.link.peers.get(id) || 'Player ' + (id + 1); }
  teamOf(id) { return this.cfg && this.cfg.rules === 'coop' ? 0 : this.teams.get(id) ?? 0; }
  get myTeam() { return this.teamOf(this.me); }
  /** On this player's side (in the game together, everyone is). */
  mateOf(id) { return !!this.cfg && id !== undefined && id >= 0 && this.teamOf(id) === this.myTeam; }
  /** The other players on this player's side, and on the other side. */
  mates() { return [...this.remotes.values()].filter((R) => this.mateOf(R.pid)); }
  foes() { return [...this.remotes.values()].filter((R) => !this.mateOf(R.pid)); }
  alive(id) { if (id === this.me) return !this.game.player.dead; const R = this.remotes.get(id); return !!R && R.alive; }
  /** A side's players, as words: "You & Léo", "Max". */
  sideName(t) { return and(this.ids().filter((id) => this.teamOf(id) === t).map((id) => (id === this.me ? 'you' : this.nameOf(id)))).replace(/^you/, 'You') || 'The other side'; }

  // ---- connection --------------------------------------------------------------------------------------------------------
  /** Connected to the server: everyone waits on the Online screen until the host starts the game. */
  connected() { this.phase = 'lounge'; this.game.voice.attach(this); this.game.duelLounge(); }
  joined(id, n) {
    const G = this.game;
    if (this.isHost && this.cfg) this.send({ t: this.phase === 'pick' ? 'setup' : 'cfg', c: this.cfg, to: id });   // in just as the game was set up: he chooses too
    if (this.phase === 'lounge') G.duelLounge(); else if (this.phase === 'over') G.say(n + ' is in the lobby');
    G.voice.paint();
  }
  left(id) {
    const G = this.game, R = this.remotes.get(id), name = (R && R.name) || this.nameOf(id);
    this.picks.delete(id); G.voice.drop(id);
    if (R) {
      if (this.isHost && this.flags) this.dropFlag(id, R.pos);
      this.remotes.delete(id); const i = G.enemies.indexOf(R); if (i >= 0) G.enemies.splice(i, 1); R.rig.group.removeFromParent();
    }
    G.map.mateMark({ off: 1 }, id);
    if (this.phase === 'lounge') { G.duelLounge(); return; }
    if (this.phase === 'pick') { if (this.count < 2) { this.backToLounge(name + ' left before the game began.'); return; } G.duelPickInfo(); this.tryStart(); return; }
    if (this.phase !== 'play') return;
    G.say(name + ' left the game'); G.cache = {};
    const r = this.cfg.rules, sides = new Set(this.ids().map((i) => this.teamOf(i)));
    if (this.count < 2 || (r !== 'coop' && sides.size < 2)) { this.finish('left'); return; }
    if (this.isHost && r === 'rounds') this.checkRound();
  }
  lost(why) {
    this.game.voice.close();
    if (this.phase === 'over' || this.phase === 'left') { this.phase = 'left'; return; }
    this.finish(why === 'host' ? 'host' : 'lost');
  }
  /** Back to the Online screen, still connected (after a game, or when too few are left to start one). */
  backToLounge(note) {
    this.phase = 'lounge'; this.picks.clear(); this.teams.clear(); this.myPick = -1;
    if (this.isHost) this.link.lock(false);
    this.game.duelLounge(note);
  }
  again() { if (this.phase === 'over' && this.link.open) this.backToLounge(); }
  /** Host: start a game with these settings, for everyone connected. */
  startNext(cfg) {
    if (!this.isHost || !this.link.open || this.phase === 'pick' || this.phase === 'play') return;
    if (this.count < 2) { this.game.duelStatus('Wait until at least one other player has joined.'); return; }
    this.cfg = cfg; this.link.lock(true); this.send({ t: 'setup', c: cfg }); this.enterPick();
  }
  enterPick() {
    this.phase = 'pick'; this.myPick = -1; this.picks.clear(); this.remotes.clear(); this.teams.clear(); this.ai = []; this.wait = 0; this.next = ''; this.flags = null;
    this.game.openLevel(this.cfg.level);
  }

  /**
   * The chapter's computer enemies in this game (the host chose how many, 3 to 24 by threes, or none). Together against them: a random
   * choice of all of them, the boss included. Against each other: walkers only (no boss, nobody on a perch or in ambush). The game's seed,
   * the same in every browser, makes the same choice and the same places everywhere.
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

  // ---- choosing the fighters, the start --------------------------------------------------------------------------------
  pick(k) { if (this.myPick >= 0) return; this.myPick = k; this.picks.set(this.me, k); this.send({ t: 'pick', k }); this.game.duelPickInfo(); this.tryStart(); }
  /** Host: once everyone has chosen, the sides are made and the game begins. */
  tryStart() {
    if (!this.isHost || this.phase !== 'pick' || this.count < 2 || !this.ids().every((id) => this.picks.has(id))) return;
    const ids = this.ids(), teams = ids.map((id, i) => [id, this.cfg.rules === 'coop' ? 0 : i % 2]);
    const picks = ids.map((id) => [id, this.picks.get(id)]);
    this.send({ t: 'go', teams, picks }); this.startMatch(teams, picks);
  }
  startMatch(teams, picks) {
    const G = this.game;
    this.teams = new Map(teams); for (const [id, k] of picks) if (id !== this.me) this.picks.set(id, k);
    this.ai = G.enemies.slice(); this.ai.forEach((e, i) => { e.idx = i; e.puppet = !this.isHost; });
    for (const id of this.ids()) {
      if (id === this.me) continue;
      const R = new RemotePlayer(G, G.roster()[this.picks.get(id) ?? 0] || G.roster()[0], id, this.nameOf(id));
      this.remotes.set(id, R); G.enemies.push(R);
    }
    G.voice.paint();
    this.score = [0, 0]; this.kills = {}; for (const id of this.ids()) this.kills[id] = 0;
    this.clock = TIMED; this.link.batch = true;
    if (this.cfg.rules === 'ctf') this.makeFlags();
    G.practice = false; document.body.classList.remove('practice');          // no practice mode online
    this.startRound(1);
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
  startRound(r) {
    const G = this.game, pts = this.spawnPoints();
    this.round = r; this.phase = 'play'; this.wait = 0; this.next = '';
    G.shots.clear();
    for (const R of this.remotes.values()) if (!R.alive) R.revive();
    this.place(this.base(pts));
    const rule = this.cfg.rules, mates = and(this.mates().map((R) => R.name)), foes = and(this.foes().map((R) => R.name));
    G.say(rule === 'rounds' ? 'Round ' + r : rule === 'ctf' ? 'Take the red flag, bring it to yours' : rule === 'coop' ? 'Together with ' + mates + ': ' + this.ai.length + ' enemies' : 'Find ' + foes);
  }
  place(pt) {
    const G = this.game, P = G.player, h = G.roster()[this.myPick] || G.roster()[0];
    P.spawn(pt.x, pt.z, pt.yaw, h.weapon ?? G.def.weapon);
    P.pos.y = G.world.groundAt(pt.x, pt.z, pt.hint ?? G.world.height(pt.x, pt.z) + 1); P.camY = P.pos.y + 1.65; P.roll = 0;
    P.setWeapon(h.weapon ?? G.def.weapon, h.sleeve, h.cuff);
    G.gfx.damage = 0; G.cache = {};
    G.setState('play'); if (!G.input.free) G.input.lock();
    this.sendState();
  }
  /**
   * Where this player starts: in rounds the sides change ends every round; with flags each side keeps its own end (the host's side
   * the chapter's start, the other the boss's place); together, everyone starts at the chapter's start. Side by side with his team-mates.
   */
  base(pts) {
    const r = this.cfg.rules, t = this.myTeam;
    const p = r === 'ctf' ? pts[t] : r === 'coop' ? pts[0] : pts[(this.round + (t === 0 ? 1 : 0)) % 2];
    const side = this.ids().filter((id) => this.teamOf(id) === t), k = side.indexOf(this.me), s = (k - (side.length - 1) / 2) * 2.6;
    return s ? { ...p, x: p.x + Math.cos(p.yaw) * s, z: p.z - Math.sin(p.yaw) * s } : p;
  }
  /** After a fall (timed, flags, together): back at one's own end, or in the timed game at the end farther from the other side. */
  respawn() {
    const pts = this.spawnPoints();
    if (this.cfg.rules !== 'timed') { this.place(this.base(pts)); return; }
    const near = (p) => Math.min(1e9, ...this.foes().filter((R) => R.alive).map((R) => (p.x - R.pos.x) ** 2 + (p.z - R.pos.z) ** 2));
    this.place(near(pts[0]) > near(pts[1]) ? pts[0] : pts[1]);
  }

  // ---- falls and the score -------------------------------------------------------------------------------------------------
  /** Another player hurt this one (with a weapon or something he threw): if this player falls soon after, the fall is his. */
  blame(id) { if (id >= 0 && id !== this.me) { this.blameId = id; this.blameT = this.game.time; } }
  localDied() {
    const by = this.game.time - this.blameT < BLAME ? this.blameId : -1;
    this.blameId = -1; this.send({ t: 'died', by }); this.fallen(this.me, by);
  }
  /** Someone has fallen (this player, or another one: his browser said so), at the hands of player `by` (or of nobody: -1). */
  fallen(id, by) {
    const G = this.game, P = G.player, r = this.cfg.rules, R = this.remotes.get(id), t = this.teamOf(id);
    if (R) { if (!R.alive) return; R.fall(P.pos.x, P.pos.z); }
    const name = (i) => (i === this.me ? 'you' : this.nameOf(i)), Name = (i) => (i === this.me ? 'You' : this.nameOf(i));
    if (r === 'coop') G.say(id === this.me ? 'You are down — back in a moment' : this.nameOf(id) + ' is down');
    else if (by === this.me && id !== this.me) { G.sound.killmark(); G.say('You got ' + this.nameOf(id)); }
    else if (by >= 0 && by !== id) G.say(Name(by) + ' got ' + name(id));
    else G.say(id === this.me ? 'You fell' : this.nameOf(id) + ' fell');
    if (this.isHost) {
      if (r === 'ctf') this.dropFlag(id, id === this.me ? P.pos : R.pos);
      if (by >= 0 && by !== id && this.teamOf(by) !== t && this.kills[by] !== undefined) this.kills[by]++;
      if (r === 'timed') { this.score[1 - t]++; this.sendScore(); }
      else if (r === 'rounds') this.checkRound();
      else this.sendScore();
    }
    if (id === this.me) {
      if (r === 'rounds') { if (this.mates().some((M) => M.alive)) G.say('You are down — your team-mate fights on'); }
      else { this.wait = r === 'coop' ? 5 : r === 'ctf' ? 4 : RESPAWN; this.next = 'respawn'; }
    }
    G.cache = {};
  }
  /** Host, in rounds: a side with nobody standing loses the round (if both, nobody wins it). */
  checkRound() {
    if (this.next === 'round' || this.next === 'over' || this.phase !== 'play') return;
    const up = [0, 0]; for (const id of this.ids()) if (this.alive(id)) up[this.teamOf(id)]++;
    if (up[0] && up[1]) return;
    const w = up[0] ? 0 : up[1] ? 1 : -1;
    if (w >= 0) this.score[w]++;
    this.sendScore(w); this.roundWon(w);
    if (Math.max(this.score[0], this.score[1]) >= WIN_ROUNDS) { this.wait = 2.2; this.next = 'over'; } else { this.wait = RESPAWN; this.next = 'round'; }
  }
  roundWon(w) {
    const G = this.game, solo = this.mates().length === 0;
    G.say(w < 0 ? 'Nobody takes round ' + this.round : w === this.myTeam ? (solo ? 'You take round ' : 'Your side takes round ') + this.round : this.sideName(w) + ' take' + (this.foes().length > 1 ? '' : 's') + ' round ' + this.round);
  }
  sendScore(w) { const m = { t: 'score', s: this.score.slice(), k: this.kills }; if (w !== undefined) m.w = w; this.send(m); this.game.cache = {}; }
  finish(why) {
    if (this.phase === 'over' || this.phase === 'left') return;
    const was = this.phase, r = this.cfg && this.cfg.rules;
    this.phase = why === 'lost' || why === 'host' ? 'left' : 'over'; this.link.batch = false;
    if (was === 'lobby' || was === 'pick' || was === 'lounge') { this.game.duelAborted(why); return; }
    const t = this.myTeam, a = this.score[t], b = this.score[1 - t], ctf = r === 'ctf';
    const title = why === 'host' ? 'The host left' : why === 'lost' ? 'The connection to the server was lost'
      : why === 'left' ? (r === 'coop' ? 'Your team-mates left' : 'The other side left') : r === 'coop' ? 'Mission accomplished'
        : a > b ? (ctf ? 'Your side took the most flags' : this.mates().length ? 'Your side wins' : 'You win') : a < b ? (ctf ? 'They took more flags' : this.mates().length ? 'Your side loses' : 'You lose') : 'A draw';
    const kills = (id) => this.kills[id] || 0;
    const rows = r === 'coop'
      ? this.ids().map((id) => [this.nameOf(id) + (id === this.me ? ' (you)' : ''), kills(id), 'kills'])
      : [[this.sideName(t), a, ctf ? 'flags' : r === 'rounds' ? 'rounds' : 'kills'], [this.sideName(1 - t), b, ctf ? 'flags' : r === 'rounds' ? 'rounds' : 'kills']];
    const each = r !== 'coop' && this.count > 2 ? this.ids().map((id) => esc(this.nameOf(id)) + ' ' + kills(id)).join(' · ') : '';
    this.game.duelOver(title, rows, each ? 'Kills: ' + each : '');
  }

  // ---- together: kills counted for each player (the host's browser counts them) ------------------------------------
  /** Host: one of the computer enemies has fallen. A blow reported by another player (see 'ehit') counts for him, anything else for the host. */
  enemyKilled() {
    if (!this.isHost || this.cfg.rules !== 'coop' || this.phase !== 'play') return;
    const id = this.guestHit >= 0 ? this.guestHit : this.me; this.kills[id] = (this.kills[id] || 0) + 1;
    this.sendScore();
  }

  // ---- capture the flag ------------------------------------------------------------------------------------------------
  /** The two flags, at the two ends of the map: flags[0] the host's side's, flags[1] the other side's. This player's side's is blue, the other red. */
  makeFlags() {
    const G = this.game, pts = this.spawnPoints(), mine = this.myTeam;
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
  /** Who carries a flag: 'me', a team-'mate', or one of 'them' (who then has this side's flag). */
  carrying(who) {
    if (!this.flags) return false;
    return this.flags.some((f) => f.by !== null && (who === 'me' ? f.by === this.me : who === 'mate' ? f.by !== this.me && this.mateOf(f.by) : !this.mateOf(f.by)));
  }
  carries(id) { return !!this.flags && this.flags.some((f) => f.by === id); }
  home(f) { f.by = null; f.atHome = true; f.x = f.home.x; f.y = f.home.y; f.z = f.home.z; }
  /** Host: player id touches flag i (flag i belongs to side i). */
  touch(id, i) {
    const f = this.flags[i], other = this.flags[1 - i], side = this.teamOf(id);
    if (f.by !== null || this.phase !== 'play' || !this.alive(id)) return;
    if (side !== i) { f.by = id; f.atHome = false; }                                   // the other side's flag: taken
    else if (!f.atHome) this.home(f);                                                  // one's own, lying out there: back home
    else if (other.by === id) {                                                         // one's own at home, the other's in hand: a capture
      this.home(other); this.caps[side]++;
      if (Math.max(...this.caps) >= CAPTURES) { this.sendFlags(); this.send({ t: 'over' }); this.wait = 0; this.applyFlags(); this.finish('score'); return; }
    } else return;
    this.sendFlags(); this.applyFlags();
  }
  /** Host: a carrier has fallen (or left): the flag lies where he was, and goes home by itself after a while. */
  dropFlag(id, pos) {
    if (!this.flags) return;
    for (const f of this.flags) if (f.by === id) { f.by = null; f.atHome = false; f.x = pos.x; f.y = this.game.world.groundAt(pos.x, pos.z, pos.y + 0.5); f.z = pos.z; f.dropT = FLAG_BACK; }
    this.sendFlags(); this.applyFlags();
  }
  sendFlags() { this.send({ t: 'fl', f: this.flags.map((f) => [f.by ?? -1, f.atHome ? 1 : 0, r2(f.x), r2(f.y), r2(f.z)]), c: this.caps }); }
  /** The flags' state as the host decided it: the score, and a word when something happened. */
  applyFlags() {
    const G = this.game, t = this.myTeam, mine = this.flags[t], theirs = this.flags[1 - t], solo = this.mates().length === 0;
    const before = this.score.slice(); this.score = this.caps.slice();
    const said = (k, s) => { if (this.saidFl === k) return; this.saidFl = k; if (s) { G.say(s); G.sound.pickup(); } };   // nothing new: the last word stays
    if (this.score[t] > before[t]) said('cap' + this.score[t], solo ? 'You captured their flag!' : 'Your side captured their flag!');
    else if (this.score[1 - t] > before[1 - t]) said('lost' + this.score[1 - t], 'They captured your flag');
    else if (theirs.by === this.me) said('have', 'You have their flag — bring it to yours');
    else if (theirs.by !== null) said('mate' + theirs.by, this.nameOf(theirs.by) + ' has their flag');
    else if (mine.by !== null) said('took' + mine.by, this.nameOf(mine.by) + ' has taken your flag!');
    else if (!mine.atHome) said('lies', 'Your flag lies out there — touch it to send it home');
    else said('', '');
    G.cache = {};
  }
  /** Every frame: the flags follow their carriers and wave; this player touching one tells the host. */
  tickFlags(dt) {
    const G = this.game, P = G.player;
    for (const f of this.flags) {
      if (f.by !== null) {
        const R = f.by === this.me ? null : this.remotes.get(f.by), at = R ? R.pos : P.pos, yaw = R ? R.yaw + Math.PI : P.yaw;
        if (!R && f.by !== this.me) { if (this.isHost) this.dropFlag(f.by, f); continue; }
        f.x = at.x + Math.sin(yaw) * 0.35; f.y = at.y + 0.3; f.z = at.z + Math.cos(yaw) * 0.35;
      }
      f.mesh.position.set(f.x, f.y, f.z); f.mesh.visible = f.by !== this.me;            // one's own carried flag would only hide the view
      f.cloth.rotation.y = Math.sin(G.time * 3 + f.i) * 0.25;
      if (this.isHost && f.by === null && !f.atHome) { f.dropT -= dt; if (f.dropT <= 0) { this.home(f); this.sendFlags(); this.applyFlags(); } }
      if (P.dead || f.by !== null) continue;
      if ((f.x - P.pos.x) ** 2 + (f.z - P.pos.z) ** 2 < 2.9 && Math.abs(f.y - P.pos.y) < 2) {
        if (this.isHost) this.touch(this.me, f.i);
        else if ((this.ftT[f.i] -= dt) <= 0) { this.ftT[f.i] = 0.4; this.send({ t: 'ft', i: f.i, to: 0 }); }
      }
    }
    if (this.isHost) { this.flT -= dt; if (this.flT <= 0) { this.flT = 1; this.sendFlags(); } }
  }
  /** This player leaves: the server tells the others. */
  leave() { this.game.voice.close(); this.phase = 'left'; this.link.close(); }

  /** Called every frame. */
  tick(dt) {
    this.sendT -= dt; const beat = this.sendT <= 0; if (beat) this.sendT = 0.05;          // twenty times a second
    if (this.phase !== 'play') { if (beat) this.game.voice.pack(); this.link.flush(); return; }
    if (this.flags) this.tickFlags(dt);
    if (this.isHost && this.cfg.rules === 'coop' && this.ai.length && this.ai.every((e) => !e.alive) && this.next !== 'over') { this.send({ t: 'over' }); this.wait = 2.5; this.next = 'over'; }   // the last enemy has fallen
    if (this.cfg.rules === 'timed' || this.cfg.rules === 'ctf') {
      this.clock -= dt;
      if (this.isHost && this.clock <= 0) { this.send({ t: 'over' }); this.link.flush(); this.finish('time'); return; }
    }
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) {
        const n = this.next; this.next = '';
        if (n === 'over') { if (this.isHost && this.cfg.rules !== 'coop') this.send({ t: 'over' }); this.link.flush(); this.finish('score'); return; }
        if (n === 'round') { if (this.isHost) { this.send({ t: 'round', r: this.round + 1 }); this.startRound(this.round + 1); } }
        else if (n === 'respawn') this.respawn();
      }
    }
    if (beat) {                                     // this player's state, with all that happened since the last one
      this.sendState();
      if (this.isHost && this.ai.length && (this.enT = (this.enT || 0) + 1) % 2 === 0) this.send({ t: 'en', e: this.ai.map((e) => [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.yaw), e.state === 'dead' ? 2 : e.state === 'combat' ? 1 : e.state === 'hidden' ? 3 : 0, e.armPose > 0.5 ? 1 : 0, e.sneaking ? 1 : 0, r2(Math.max(0, e.hp) / e.maxHp), r2(e.duckK)]) });
      this.game.voice.pack();
      this.link.flush();
    }
  }
  sendState() {
    const P = this.game.player, w = P.weapon, m = { t: 's', x: r2(P.pos.x), y: r2(P.pos.y), z: r2(P.pos.z), yaw: r3(P.yaw), pitch: r3(P.pitch), f: (P.aim > 0.5 ? 1 : 0) | (w && w.meleeT > 0 ? 2 : 0) | (P.dead ? 4 : 0) | (P.crouch ? 8 : 0) | (P.sneaking ? 16 : 0) | (P.cloak ? 32 : 0), h: Math.max(0, Math.round(P.hp)), mh: P.maxHp };
    if (this.isHost && (this.cfg.rules === 'timed' || this.cfg.rules === 'ctf')) m.c = Math.ceil(this.clock);
    this.send(m);
  }
  // what this player fires, shown in the other browsers
  tracer(ax, ay, az, bx, by, bz, k) { this.send({ t: 'tr', a: [r2(ax), r2(ay), r2(az), r2(bx), r2(by), r2(bz)], k }); }
  /** This player used his skill: the others hear it (a vanishing is shown through the state flags). */
  skill(id) { this.send({ t: 'sk', k: id }); }
  shot(kind, x, y, z, dx, dy, dz, speed, grav) { this.send({ t: 'sh', k: kind, a: [r2(x), r2(y), r2(z), r3(dx), r3(dy), r3(dz), speed], g: grav }); }
  enemyShot(kind, x, y, z, dx, dy, dz, speed, grav) { if (this.isHost) this.send({ t: 'esh', k: kind, a: [r2(x), r2(y), r2(z), r3(dx), r3(dy), r3(dz), speed], g: grav }); }
  /** Host: a computer enemy turns on whichever player is nearest. */
  targetFor(e) {
    const P = this.game.player;
    if (!this.isHost) return P;
    let best = P.dead ? null : P, bd = P.dead ? Infinity : e.pos.distanceToSquared(P.pos);
    for (const R of this.remotes.values()) { if (!R.alive || !R.net) continue; const d = e.pos.distanceToSquared(R.pos); if (d < bd) { bd = d; best = R; } }
    return best || P;
  }
  hud() {
    const r = this.cfg.rules, t = this.myTeam, a = this.score[t], b = this.score[1 - t];
    const clock = () => { const s = Math.max(0, Math.ceil(this.clock)); return ' · ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    if (r === 'coop') return 'Kills: ' + this.ids().map((id) => (id === this.me ? 'you' : esc(this.nameOf(id))) + ` <b>${this.kills[id] || 0}</b>`).join(' · ') + ` · <b>${this.ai.filter((e) => e.alive).length}</b> left`;
    const sides = `${esc(this.sideName(t))} <b>${a}</b>–<b>${b}</b> ${esc(this.sideName(1 - t))}`;
    if (r === 'ctf') return `Flags: ${sides}${clock()}${this.carrying('me') ? ' · <b>you have their flag</b>' : ''}${this.carrying('them') ? ' · <b>your flag is taken</b>' : ''}`;
    return sides + (r === 'rounds' ? ' · round ' + this.round : clock());
  }

  onmsg(m, from) {
    const G = this.game, P = G.player, R = this.remotes.get(from);
    const ghost = () => {
      if (!G.shots.geo[m.k]) return;
      const s = G.shots.spawn(m.k, m.a[0], m.a[1], m.a[2], m.a[3], m.a[4], m.a[5], m.a[6], false, 0, m.g ?? undefined); s.ghost = true; s.foe = m.t === 'esh'; s.from = from;   // foe: an enemy's (its bomb hurts every player)
      const d = Math.hypot(m.a[0] - P.pos.x, m.a[2] - P.pos.z);
      if (m.k === 'bullet') { G.muzzle(m.a[0], m.a[1], m.a[2], m.a[3], m.a[4], m.a[5], 0.7); G.sound.gun(Math.max(0.15, 0.8 - d / 90), Math.min(1, d / 70), m.t === 'esh' ? 'rifle' : 'pistol'); } else if (d < 40) G.sound.bow();
    };
    const host = from === 0;
    switch (m.t) {
      case 'cfg': if (host && !this.isHost) { this.cfg = m.c; if (this.phase === 'lounge') G.duelLounge(); } break;   // the host's settings for the next game
      case 'setup': if (host && !this.isHost && this.phase !== 'pick' && this.phase !== 'play') { this.cfg = m.c; this.enterPick(); } break;
      case 'pick': this.picks.set(from, m.k); if (this.phase === 'pick') G.duelPickInfo(); this.tryStart(); break;
      case 'go': if (host && !this.isHost && this.phase === 'pick') this.startMatch(m.teams, m.picks); break;
      case 'round': if (host && !this.isHost && this.phase === 'play') this.startRound(m.r); break;
      case 's':
        if (!R) break;
        R.net = m; if (host && m.c !== undefined) this.clock = m.c;
        if (!(m.f & 4) && !R.alive && this.cfg.rules !== 'rounds') R.revive();
        break;
      case 'hit':
        if (this.phase !== 'play' || P.dead) break;
        if (!m.ai) { if (this.mateOf(from)) break; this.blame(from); }
        G.hurtPlayer(m.d, { x: m.x, z: m.z }, !!m.m); break;
      case 'died': if (this.phase === 'play') this.fallen(from, m.by ?? -1); break;
      case 'score': if (host && !this.isHost) { this.score = m.s; this.kills = m.k || {}; if (m.w !== undefined) this.roundWon(m.w); G.cache = {}; } break;
      case 'ft': if (this.isHost && this.flags) this.touch(from, m.i); break;                  // another player touched a flag
      case 'fl': if (host && !this.isHost && this.flags) { m.f.forEach((a, i) => { const f = this.flags[i]; f.by = a[0] >= 0 ? a[0] : null; f.atHome = !!a[1]; if (f.by === null) { f.x = a[2]; f.y = a[3]; f.z = a[4]; } }); this.caps = m.c; this.applyFlags(); } break;
      case 'tr': {
        const a = m.a, l = Math.hypot(a[3] - a[0], a[4] - a[1], a[5] - a[2]) || 1, d = Math.hypot(a[0] - P.pos.x, a[2] - P.pos.z);
        G.crowd.alarm(a[0], a[2], 26, a[0], a[2]); G.crowd.alarm(a[3], a[5], 7, a[0], a[2]);
        G.shots.tracer(a[0], a[1], a[2], a[3], a[4], a[5]); G.muzzle(a[0], a[1], a[2], (a[3] - a[0]) / l, (a[4] - a[1]) / l, (a[5] - a[2]) / l, 0.8);
        G.sound.gun(Math.max(0.15, 0.8 - d / 90), Math.min(1, d / 70), m.k || 'rifle');
        break;
      }
      case 'sh': ghost(); break;
      case 'esh': if (host) ghost(); break;
      case 'sk': G.sound.skill(m.k); break;      // another player's skill: heard
      case 'mk': if (this.mateOf(from)) G.map.mateMark(m, from); break;   // a team-mate marked a place (or took his mark away)
      case 'drop': if (this.phase === 'play' && m.w && (m.w.type === 'weapon' || m.w.type === 'item')) G.addPickup(m.x, m.z, G.level, m.y, m.w); break;   // something another player put down
      case 'en': if (host && !this.isHost) m.e.forEach((a, i) => { const e = this.ai[i]; if (e) e.net = { x: a[0], y: a[1], z: a[2], yaw: a[3], st: a[4], pose: a[5], sn: a[6], hp: a[7], dk: a[8] || 0 }; }); break;
      case 'bk': G.crowd.killed(m.i); break;                    // a bystander another player killed
      case 'brk': { const p = G.world.pieces[m.i]; if (p) G.havoc.breakPiece(p, false); break; }   // a crate or a keg another player shot to pieces
      case 'ehit': if (this.isHost) { const e = this.ai[m.i]; if (e) { this.guestHit = from; e.damage(m.d, !!m.h, m.x, m.z); this.guestHit = -1; } } break;
      case 'pk': {                       // another player took something: the nearest of that kind goes here too (a drop lies where the enemy fell, which can differ a little)
        let best = -1, bd = m.k ? 2.5 : 0.6;
        G.pickups.forEach((q, i) => { const d = Math.hypot(q.x - m.x, q.z - m.z); if (d < bd && (!m.k || G.pickupKey(q.what) === m.k)) { bd = d; best = i; } });
        if (best >= 0) { G.pickups[best].mesh.removeFromParent(); G.pickups.splice(best, 1); }
        break;
      }
      case 'v': G.voice.hear(from, m.d); break;
      case 'over': if (!host || this.phase !== 'play') break; if (this.cfg.rules === 'coop') { this.wait = 2.5; this.next = 'over'; } else this.finish('time'); break;
    }
  }
}

/** Wire the Online screen. */
export function bindDuelUI(G) {
  const $ = (s) => document.querySelector(s);
  G.duelStatus = (t) => { $('#dstatus').textContent = t; };
  const cfg = () => { const rules = $('#drules').value; return { level: +$('#dlevel').value, rules, foes: rules === 'coop' ? Math.max(3, +$('#dfoes').value) : +$('#dfoes').value, seed: (Math.random() * 2 ** 31) | 0, wits: $('#dwits').value, size: $('#dsize').value }; };
  const fresh = (host) => { if (G.duel) G.duel.leave(); const d = (G.duel = new Duel(G)); d.isHost = host; return d; };
  const WHY = {
    none: 'There is no game under this code (or its host has left). Check the code with the host.',
    full: 'This game already has four players.', started: 'This game has already started. Ask the host to let you in at the next one.',
    taken: 'This code is in use. Try again.', timeout: 'The game server did not answer. Check your Internet connection and try again.',
    network: 'Could not reach the game server. Check your Internet connection and try again.', address: 'The game server’s address is not right.',
  };
  const fail = (e) => { G.duel = null; G.duelLobbyMode(null); G.duelStatus(WHY[e && e.type] || 'Could not connect (' + ((e && (e.type || e.message)) || 'unknown error') + ').'); };
  const copy = (text, done) => { const p = navigator.clipboard && navigator.clipboard.writeText(text); if (p) p.then(() => G.duelStatus(done), () => {}); };
  // no letter or digit that is easily taken for another one: no 0/O/Q, 1/I, 2/Z, 5/S, 8/B, G, and neither U nor V
  const code5 = () => { const a = 'ACDEFHJKLMNPRTWXY34679'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  /** Each player gives a name before playing: the others see it (scores, messages, the tag over a team-mate's head). */
  const needName = () => {
    const n = ($('#dname').value || '').trim().replace(/\s+/g, ' ').replace(/[<>&"]/g, '').slice(0, 16);
    if (!n) { G.duelStatus('Write your name first: the other players will see it.'); $('#dname').focus(); return null; }
    try { localStorage.setItem('outlaws.name', n); } catch (e) { /* for this visit */ }
    G.myName = n; return n;
  };
  try { $('#dname').value = localStorage.getItem('outlaws.name') || ''; } catch (e) { /* no storage */ }
  let busy = false;
  const join = async (code) => {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code || busy) return;
    const n = needName(); if (!n) return;
    const d = fresh(false); d.code = code; G.duelStatus('Connecting to the game server…'); busy = true;
    try { await d.link.join(code, n); busy = false; if (G.duel === d) d.connected(); } catch (e) { busy = false; if (G.duel === d) fail(e); }
  };
  G.duelJoin = join;
  $('#duelbtn').addEventListener('click', () => { G.sound.init(); G.openDuel(); });
  $('#dback').addEventListener('click', () => G.closeDuel());
  $('#dcreate').addEventListener('click', async (e) => {
    e.currentTarget.blur();
    const n = needName(); if (!n || busy) return;
    const d = fresh(true); d.cfg = cfg(); G.duelStatus('Creating the game…'); busy = true;
    for (let i = 0; i < 3; i++) {                      // a code someone else is using: another one
      d.code = code5();
      try { await d.link.host(d.code, n); busy = false; if (G.duel === d) d.connected(); return; }
      catch (er) { if (er.type !== 'taken' || i === 2) { busy = false; if (G.duel === d) fail(er); return; } }
    }
  });
  // together, the enemies attack all of you, and there are at least three
  const foesLabel = () => { const co = $('#drules').value === 'coop'; $('#dfoeslab').textContent = co ? 'Enemies against all of you' : 'Computer enemies, hostile to all'; $('#dfoes').options[0].disabled = co; if (co && $('#dfoes').value === '0') $('#dfoes').value = '9'; };
  $('#drules').addEventListener('change', foesLabel); G.duelFoesLabel = foesLabel;
  for (const s of ['#dlevel', '#drules', '#dfoes', '#dwits', '#dsize']) $(s).addEventListener('change', () => {   // the host's choice shows on the others' screens
    const D = G.duel; if (D && D.isHost && D.phase === 'lounge') { D.cfg = cfg(); D.send({ t: 'cfg', c: D.cfg }); }
  });
  $('#dagain').addEventListener('click', (e) => { e.currentTarget.blur(); if (G.duel) G.duel.startNext(cfg()); });
  $('#dcopy').addEventListener('click', () => copy($('#dlink').value, 'Link copied. Send it to the other players, then wait here.'));
  $('#djoinbtn').addEventListener('click', (e) => { e.currentTarget.blur(); join($('#dcodein').value); });   // blurred: Enter, which then chooses the hero, must not press Join again
}

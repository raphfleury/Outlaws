// Duel mode: two players, one in each browser, hunting each other in a chapter's world.
import * as THREE from 'three';
import { Enemy, TYPES } from './actors.js';
import { Link } from './net.js';
import { damp } from './util.js';

/** Weapons are tuned to fell computer enemies in one or two hits; between players they hit less hard. */
export const DUEL_DMG = 0.6;
export const RULES = { rounds: 'First to 3 rounds', one: 'One life', timed: '5 minutes, most kills' };
const WIN_ROUNDS = 3, TIMED = 300, RESPAWN = 3;
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;

/** The other player, as a figure in this player's world. It sits in game.enemies, so every weapon can hit it. */
export class RemotePlayer extends Enemy {
  constructor(game, hero) {
    super(game, 'duelist', 0, 0, { look: hero.look, patrol: false, static: true });
    this.remote = true; this.name = hero.name; this.mods = { stealth: 1, ...hero.mods };
    this.vel = new THREE.Vector3(); this.net = null; this.aimF = 0; this.swing = 0; this.duck = 0;
    this.rig.group.visible = false;                    // until the first report arrives
  }
  get dead() { return !this.alive; }
  /** The other player sneaks (X): enemies notice him later, and he does not show on the map. */
  get sneaking() { return !!this.net && !!(this.net.f & 16); }
  /** A crouching opponent is hit where the figure is drawn: half a metre lower. */
  rayHit(o, d, max) { const k = 0.5 * this.duck; this.pos.y -= k; const h = super.rayHit(o, d, max); this.pos.y += k; return h; }
  /** A hit by this player's weapon: the damage is applied in the other browser. */
  damage(amount, head, fromX, fromZ) {
    if (!this.alive) return false;
    this.flinch = 1; this.flash = 1;
    this.game.duel.send({ t: 'hit', d: r2(amount * (head ? 2.5 : 1) * DUEL_DMG), x: r2(fromX), z: r2(fromZ) });
    return false;
  }
  fall(fromX, fromZ) { if (this.alive) { this.hp = 1; super.damage(999, false, fromX, fromZ); } }
  revive() {
    this.state = 'idle'; this.hp = 100; this.slump = false; this.deathT = 0;
    const rig = this.rig; rig.group.rotation.set(0, this.yaw, 0);
    for (const k of ['armL', 'armR', 'legL', 'legR', 'hips']) rig[k].rotation.set(0, 0, 0);
  }
  update(dt) {
    if (this.state === 'dead') { super.update(dt); return; }
    const rig = this.rig, n = this.net;
    this.flash = Math.max(0, this.flash - dt * 7); this.flinch = Math.max(0, this.flinch - dt * 5);
    rig.mat.emissive.setScalar(this.flash * 0.7);
    if (!n) return;
    rig.group.visible = true;
    const bx = this.pos.x, bz = this.pos.z, k = Math.min(1, dt * 14), inv = 1 / Math.max(dt, 1e-3);
    if (Math.hypot(n.x - bx, n.z - bz) > 6) this.pos.set(n.x, n.y, n.z);                    // a respawn: jump, do not slide
    else { this.pos.x += (n.x - bx) * k; this.pos.y += (n.y - this.pos.y) * k; this.pos.z += (n.z - bz) * k; }
    const moved = Math.hypot(this.pos.x - bx, this.pos.z - bz);
    this.vel.set(moved < 3 ? (this.pos.x - bx) * inv : 0, 0, moved < 3 ? (this.pos.z - bz) * inv : 0);
    let dy = n.yaw + Math.PI - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.yaw += dy * k;   // the figure faces +Z, a player looks down -Z
    this.moving = damp(this.moving, Math.min(1, moved * inv / 3), 10, dt); this.walk += Math.min(moved, 1) * 2.6;
    this.sync();
    const sw = Math.sin(this.walk) * 0.75 * this.moving;
    rig.legL.rotation.x = sw; rig.legR.rotation.x = -sw;
    rig.group.position.y = this.pos.y + Math.abs(Math.cos(this.walk)) * 0.04 * this.moving;
    rig.hips.rotation.x = this.moving * 0.08 - this.flinch * 0.35;
    const dk = (this.duck = damp(this.duck, n.f & 8 ? 1 : 0, 12, dt));
    if (dk > 0.01) { rig.group.position.y -= 0.5 * dk; rig.legL.rotation.x = sw * (1 - dk) - 1.35 * dk; rig.legR.rotation.x = -sw * (1 - dk) + 0.9 * dk; rig.hips.rotation.x += 0.25 * dk; }   // down on one knee
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
    this.sendT = 0; this.enT = 0; this.wait = 0; this.next = ''; this.clock = TIMED;
    this.link.onmsg = (m) => this.onmsg(m); this.link.onopen = () => this.connected(); this.link.onclose = () => this.lost();
  }
  get active() { return this.phase !== 'lobby' && this.phase !== 'left'; }
  send(m) { this.link.send(m); }

  connected() {
    this.game.voice.attach(this.link);
    if (this.isHost) { this.send({ t: 'setup', c: this.cfg }); this.enterPick(); }
    else this.game.duelStatus('Connected. Waiting for the host…');
  }
  lost() { this.game.voice.close(); if (this.phase !== 'over' && this.phase !== 'left') this.finish('left'); }
  enterPick() { this.phase = 'pick'; this.myPick = this.theirPick = -1; this.remote = null; this.ai = []; this.wait = 0; this.game.openLevel(this.cfg.level); }
  /** After a duel the two browsers stay connected: back to the Duel screen, where the host starts the next one. */
  again() { if (this.phase === 'over' && this.link.open) { this.phase = 'lounge'; this.game.duelLounge(); } }
  /** Host: start another duel over the same connection, with the same or new settings. */
  startNext(cfg) { if (!this.isHost || !this.link.open || this.phase === 'pick' || this.phase === 'play') return; this.cfg = cfg; this.send({ t: 'setup', c: cfg }); this.enterPick(); }

  /** Which of the chapter's computer enemies stay in a duel: none, or the number the host chose (1 to 9), spread over the map. */
  enemyList(list) {
    if (!this.cfg.foes) return [];
    const ok = list.filter(([type, , , o]) => !TYPES[type].boss && !(o && (o.static || o.ambush || o.up !== undefined || o.y !== undefined)));
    const n = Math.min(Math.max(0, Math.round(this.cfg.foes)), 9, ok.length), out = [];
    for (let i = 0; i < n; i++) out.push(ok[Math.floor((i + 0.5) * ok.length / n)]);
    return out;
  }

  pick(k) { if (this.myPick >= 0) return; this.myPick = k; this.send({ t: 'pick', k }); this.game.duelPickInfo(); this.tryStart(); }
  tryStart() { if (this.isHost && this.myPick >= 0 && this.theirPick >= 0 && this.phase === 'pick') { this.send({ t: 'go' }); this.startMatch(); } }

  startMatch() {
    const G = this.game;
    this.ai = G.enemies.slice(); this.ai.forEach((e, i) => { e.idx = i; e.puppet = !this.isHost; });
    this.remote = new RemotePlayer(G, G.roster()[this.theirPick]); G.enemies.push(this.remote);
    G.voice.paint();
    this.score = [0, 0]; this.round = 0; this.clock = TIMED;
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
    this.place(pts[(this.round + (this.isHost ? 1 : 0)) % 2]);              // the players change ends every round
    G.say(this.cfg.rules === 'rounds' ? 'Round ' + this.round : 'Find ' + this.remote.name);
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
  /** Timed duel: come back at the end of the map that is farther from the opponent. */
  respawn() {
    const pts = this.spawnPoints(), R = this.remote.pos, d = (p) => (p.x - R.x) ** 2 + (p.z - R.z) ** 2;
    this.place(d(pts[0]) > d(pts[1]) ? pts[0] : pts[1]);
  }

  localDied() { this.score[1]++; this.send({ t: 'died' }); this.afterKill(false); }
  afterKill(mine) {
    const G = this.game, r = this.cfg.rules;
    G.say(mine ? 'You got ' + this.remote.name : this.remote.name + ' got you');
    if (r === 'one' || (r === 'rounds' && Math.max(this.score[0], this.score[1]) >= WIN_ROUNDS)) { this.wait = 2.2; this.next = 'over'; }
    else if (r === 'rounds') { this.wait = RESPAWN; this.next = 'round'; }
    else if (!mine) { this.wait = RESPAWN; this.next = 'respawn'; }
    G.cache = {};
  }
  finish(why) {
    if (this.phase === 'over' || this.phase === 'left') return;
    const [a, b] = this.score, was = this.phase;
    this.phase = 'over';
    if (was === 'lobby' || was === 'pick' || was === 'lounge') { this.game.duelAborted(); return; }
    this.game.duelOver(why === 'left' ? 'Your opponent left' : a > b ? 'You win the duel' : a < b ? 'You lose the duel' : 'A draw', a, b);
  }
  leave() { this.game.voice.close(); if (this.phase !== 'left') { this.send({ t: 'bye' }); this.phase = 'left'; const l = this.link; setTimeout(() => l.close(), 250); } }

  /** Called every frame. */
  tick(dt) {
    if (this.phase !== 'play') return;
    this.sendT -= dt; if (this.sendT <= 0) { this.sendT = 0.05; this.sendState(); }
    if (this.isHost && this.ai.length) {
      this.enT -= dt;
      if (this.enT <= 0) { this.enT = 0.1; this.send({ t: 'en', e: this.ai.map((e) => [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.yaw), e.state === 'dead' ? 2 : e.state === 'combat' ? 1 : 0, e.armPose > 0.5 ? 1 : 0, e.sneaking ? 1 : 0]) }); }
    }
    if (this.cfg.rules === 'timed') {
      this.clock -= dt;
      if (this.isHost && this.clock <= 0) { this.send({ t: 'over' }); this.finish('time'); return; }
    }
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) { if (this.next === 'over') this.finish('score'); else if (this.next === 'round') this.startRound(); else this.respawn(); }
    }
  }
  sendState() {
    const P = this.game.player, w = P.weapon, m = { t: 's', x: r2(P.pos.x), y: r2(P.pos.y), z: r2(P.pos.z), yaw: r3(P.yaw), pitch: r3(P.pitch), f: (P.aim > 0.5 ? 1 : 0) | (w && w.meleeT > 0 ? 2 : 0) | (P.dead ? 4 : 0) | (P.crouch ? 8 : 0) | (P.sneaking ? 16 : 0) };
    if (this.isHost && this.cfg.rules === 'timed') m.c = Math.ceil(this.clock);
    this.send(m);
  }
  // what this player fires, shown in the other browser
  tracer(ax, ay, az, bx, by, bz) { this.send({ t: 'tr', a: [r2(ax), r2(ay), r2(az), r2(bx), r2(by), r2(bz)] }); }
  shot(kind, x, y, z, dx, dy, dz, speed, grav) { this.send({ t: 'sh', k: kind, a: [r2(x), r2(y), r2(z), r3(dx), r3(dy), r3(dz), speed], g: grav }); }
  enemyShot(kind, x, y, z, dx, dy, dz, speed) { if (this.isHost) this.send({ t: 'esh', k: kind, a: [r2(x), r2(y), r2(z), r3(dx), r3(dy), r3(dz), speed] }); }
  /** Host: a computer enemy turns on whichever player is nearer. */
  targetFor(e) {
    const P = this.game.player, R = this.remote;
    if (!this.isHost || !R || !R.alive || !R.net) return P;
    if (P.dead) return R;
    return e.pos.distanceToSquared(R.pos) < e.pos.distanceToSquared(P.pos) ? R : P;
  }
  hud() {
    const [a, b] = this.score, n = this.remote ? this.remote.name : 'opponent';
    let extra = '';
    if (this.cfg.rules === 'rounds') extra = ' · round ' + this.round;
    if (this.cfg.rules === 'timed') { const t = Math.max(0, Math.ceil(this.clock)); extra = ' · ' + Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
    return `You <b>${a}</b>–<b>${b}</b> ${n}${extra}`;
  }

  onmsg(m) {
    const G = this.game, P = G.player;
    const ghost = () => {
      if (!G.shots.geo[m.k]) return;
      const s = G.shots.spawn(m.k, m.a[0], m.a[1], m.a[2], m.a[3], m.a[4], m.a[5], m.a[6], false, 0, m.g ?? undefined); s.ghost = true;
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
        if (!(m.f & 4) && !this.remote.alive && this.cfg.rules === 'timed') this.remote.revive();
        break;
      case 'hit': if (this.phase === 'play') G.hurtPlayer(m.d, { x: m.x, z: m.z }, !!m.m); break;
      case 'died': if (this.remote && this.remote.alive) { this.remote.fall(P.pos.x, P.pos.z); this.score[0]++; G.sound.killmark(); this.afterKill(true); } break;
      case 'tr': {
        const a = m.a, l = Math.hypot(a[3] - a[0], a[4] - a[1], a[5] - a[2]) || 1, d = Math.hypot(a[0] - P.pos.x, a[2] - P.pos.z);
        G.shots.tracer(a[0], a[1], a[2], a[3], a[4], a[5]); G.muzzle(a[0], a[1], a[2], (a[3] - a[0]) / l, (a[4] - a[1]) / l, (a[5] - a[2]) / l, 0.8);
        G.sound.gun(Math.max(0.15, 0.8 - d / 90), Math.min(1, d / 70));
        break;
      }
      case 'sh': case 'esh': ghost(); break;
      case 'en': if (!this.isHost) m.e.forEach((a, i) => { const e = this.ai[i]; if (e) e.net = { x: a[0], y: a[1], z: a[2], yaw: a[3], st: a[4], pose: a[5], sn: a[6] }; }); break;
      case 'brk': { const p = G.world.pieces[m.i]; if (p) G.havoc.breakPiece(p, false); break; }   // a crate or a keg the other player shot to pieces
      case 'ehit': if (this.isHost) { const e = this.ai[m.i]; if (e) e.damage(m.d, !!m.h, m.x, m.z); } break;
      case 'pk': {                       // the other player took something: the nearest of that kind goes here too (a drop lies where the enemy fell, which can differ a little)
        let best = -1, bd = m.k ? 2.5 : 0.6;
        G.pickups.forEach((q, i) => { const d = Math.hypot(q.x - m.x, q.z - m.z); if (d < bd && (!m.k || G.pickupKey(q.what) === m.k)) { bd = d; best = i; } });
        if (best >= 0) { G.pickups[best].mesh.removeFromParent(); G.pickups.splice(best, 1); }
        break;
      }
      case 'over': this.finish('time'); break;
      case 'bye': this.finish('left'); break;
    }
  }
}

/** Wire the lobby screen. */
export function bindDuelUI(G) {
  const $ = (s) => document.querySelector(s);
  G.duelStatus = (t) => { $('#dstatus').textContent = t; };
  const cfg = () => ({ level: +$('#dlevel').value, rules: $('#drules').value, foes: +$('#dfoes').value });
  const fresh = (host) => { if (G.duel) G.duel.link.close(); const d = (G.duel = new Duel(G)); d.isHost = host; d.link.onerror = fail; return d; };
  const fail = (e) => G.duelStatus('Could not connect (' + ((e && (e.type || e.message)) || 'unknown error') + '). Check the code and try again; if it still fails, create a new duel.');
  const copy = (text, done) => { const p = navigator.clipboard && navigator.clipboard.writeText(text); if (p) p.then(() => G.duelStatus(done), () => {}); };
  // no letter or digit that is easily taken for another one: no 0/O/Q, 1/I, 2/Z, 5/S, 8/B, G, and neither U nor V
  const code5 = () => { const a = 'ACDEFHJKLMNPRTWXY34679'; let s = ''; for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const join = async (code) => {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code) return;
    const d = fresh(false); G.duelStatus('Connecting…');
    try { await d.link.join(code); } catch (e) { fail(e); }
  };
  G.duelJoin = join;
  $('#duelbtn').addEventListener('click', () => { G.sound.init(); G.openDuel(); });
  $('#dback').addEventListener('click', () => G.closeDuel());
  $('#dcreate').addEventListener('click', async (e) => {
    e.currentTarget.blur();
    const d = fresh(true), code = code5(); d.cfg = cfg(); G.duelStatus('Creating the duel…');
    try {
      await d.link.host(code);
      $('#dlink').value = location.origin + location.pathname + '?duel=' + code; $('#dcodeout').textContent = code; $('#dlinkbox').classList.remove('hidden');
      G.duelStatus('Send the link or the code to your opponent, then wait here.');
    } catch (e) { fail(e); }
  });
  $('#dagain').addEventListener('click', (e) => { e.currentTarget.blur(); if (G.duel) G.duel.startNext(cfg()); });
  $('#dcopy').addEventListener('click', () => copy($('#dlink').value, 'Link copied. Send it to your opponent, then wait here.'));
  $('#djoinbtn').addEventListener('click', (e) => { e.currentTarget.blur(); join($('#dcodein').value); });   // blurred: Enter, which then chooses the hero, must not press Join again
}

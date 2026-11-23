// The player: keyboard/mouse input, first-person movement, and the weapon
// "viewmodels" (the hands and weapon you see at the bottom of the screen).
import * as THREE from 'three';
import { merge, xf } from './build.js';
import { gBox, gCyl, gSph, gCone, gCap, gStar } from './actors.js';
import { clamp, damp, lerp } from './util.js';
import { ROUNDS, MAX_SLOTS, MAX_ITEMS, START, PACK, most, weaponName, MELEE, SECOND, BAG_START } from './loot.js';
import { SKILLS } from './skills.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set(); this.mx = 0; this.my = 0; this.fire = false; this.alt = false; this.locked = false;
    this.active = false;                 // true while the game is being played (set by the game)
    this.fireAt = -1e9; this.altAt = -1e9; // time of the last press: a quick tap is remembered for a moment
    this.cx = 0.5;                       // cursor position across the window, used when the mouse is not captured
    this.pressed = new Set(); this.canvas = canvas; this.free = false;   // free = debug mode without pointer lock
    this.wheel = 0; this.mark = false;   // mouse wheel turned (steps, + = toward you), middle button pressed: both for this frame only
    addEventListener('keydown', (e) => { if (!e.repeat) this.pressed.add(e.code); this.keys.add(e.code); if ((this.locked || this.active) && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('wheel', (e) => { if (!this.active) return; e.preventDefault(); this.wheelAcc = (this.wheelAcc || 0) + e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1); if (Math.abs(this.wheelAcc) >= 40) { this.wheel += Math.sign(this.wheelAcc); this.wheelAcc = 0; } }, { passive: false });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.fire = this.alt = false; });
    addEventListener('mousemove', (e) => {
      // works with the mouse captured (pointer lock) and, as a fallback, without it
      if (this.locked || this.active) { this.mx += e.movementX || 0; this.my += e.movementY || 0; }
      this.cx = e.clientX / Math.max(1, innerWidth);
    });
    addEventListener('mousedown', (e) => {
      if (!this.active) return;
      if (e.button === 0) { this.fire = true; this.fireAt = performance.now(); }
      if (e.button === 2) { this.alt = true; this.altAt = performance.now(); }
      if (e.button === 1) { this.mark = true; e.preventDefault(); }     // the wheel pressed: no scrolling of the page
    });
    addEventListener('auxclick', (e) => { if (e.button === 1 && this.active) e.preventDefault(); });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.fire = false; if (e.button === 2) this.alt = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockerror', () => { this.locked = false; });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (!this.locked) { this.fire = this.alt = false; } this.onLock && this.onLock(this.locked); });
  }
  lock() { const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); }
  /** Fire button: held down, or tapped within the last 200 ms (so short clicks are never lost). */
  get shoot() { return this.fire || performance.now() - this.fireAt < 200; }
  get melee() { return this.alt || performance.now() - this.altAt < 200; }
  endFrame() { this.mx = 0; this.my = 0; this.pressed.clear(); this.wheel = 0; this.mark = false; }
}

const SKIN = 0xcf9c76;
/**
 * A closed hand gripping a vertical handle: palm toward the camera (+Z),
 * four fingers wrapped around the far side, thumb along the side.
 */
function fist(p, r = [0, 0, 0], s = 1, side = 1) {
  const parts = [gSph(0.033, SKIN, [0, 0, 0.02], [1, 1.25, 0.9])];
  for (let i = 0; i < 4; i++) parts.push(gCap(0.0105, 0.04, SKIN, [0, 0.032 - i * 0.021, -0.02], [0, 0, Math.PI / 2]));
  parts.push(gCap(0.0115, 0.03, SKIN, [-0.03 * side, 0.03, -0.002], [Math.PI / 2 - 0.2, 0, 0]));
  return xf(merge(parts), p, r, s);
}
const mesh = (list, mat) => { const m = new THREE.Mesh(merge(list), mat); m.receiveShadow = true; return m; };
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
/** Place a unit-height cylinder so it spans from point a to point b. */
function stretch(m, ax, ay, az, bx, by, bz) {
  _a.set(ax, ay, az); _b.set(bx, by, bz);
  m.position.copy(_a).add(_b).multiplyScalar(0.5);
  const len = _a.distanceTo(_b);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(_up, _b.sub(_a).normalize());
}
const ease = (t) => t * t * (3 - 2 * t);

export class Player {
  constructor(game) {
    this.game = game;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.hp = 100; this.dead = false; this.onGround = true;
    this.crouch = false; this.crouchWant = false; this.duck = 0;      // duck: 0 upright .. 1 crouched, eased
    this.camY = 1.65; this.bob = 0; this.bobAmt = 0; this.kick = 0; this.kickV = 0; this.land = 0; this.roll = 0;
    this.fov = 72; this.aim = 0; this.swayX = 0; this.swayY = 0; this.deadT = 0; this.stepPhase = 0;
    // hero traits: multipliers set by the chosen character (1 = no change)
    this.mods = { hp: 100, armor: 1, speed: 1, fire: 1, reload: 1, draw: 1, melee: 1, reach: 0, regen: 0, power: 1, meleeDmg: 1, gun: 1, stealth: 1 };
    this.maxHp = 100; this.hurtT = 99;
    this.vm = new THREE.Group();               // viewmodel root, scaled down so it never pokes through walls
    this.vm.scale.setScalar(0.3);
    game.gfx.camera.add(this.vm);
    this.flashTex = this.makeFlashTexture();
    this.weapon = null;
    // the arsenal: the hero's own weapon first, then what was taken from the enemy, then the things carried in the bag (see setWeapon)
    this.slots = []; this.slot = 0; this.raise = 0; this.useT = 0;
    this.sneak = false; this.sprinting = false;     // sneaking: X switches it on and off
  }
  /** Moving silently: slower, no footsteps, harder to notice, and not shown on the other player's map. Running ends it for as long as one runs. */
  get sneaking() { return this.sneak && !this.sprinting; }
  stanceLabel() {
    const el = document.getElementById('stance');
    document.body.classList.toggle('crouched', this.crouch); document.body.classList.toggle('sneaking', this.sneak);
    if (el) el.textContent = this.crouch && this.sneak ? 'crouching · sneaking' : this.crouch ? 'crouching' : 'sneaking';
  }

  makeFlashTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,220,130,0.9)'); g.addColorStop(0.6, 'rgba(255,120,30,0.35)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,230,160,0.8)';
    for (let i = 0; i < 5; i++) { x.save(); x.translate(64, 64); x.rotate(i * 1.2566 + 0.3); x.beginPath(); x.moveTo(-5, 0); x.lineTo(0, -62); x.lineTo(5, 0); x.fill(); x.restore(); }
    return new THREE.CanvasTexture(c);
  }

  spawn(x, z, yaw, weaponKind, sleeve) {
    const W = this.game.world;
    this.pos.set(x, W.groundAt(x, z, 100), z); this.vel.set(0, 0, 0); this.dry = null; this.wet = 0;
    this.yaw = yaw; this.pitch = 0; this.hp = this.maxHp; this.hurtT = 99; this.dead = false; this.deadT = 0; this.camY = this.pos.y + 1.65;
    this.mount = null; this.crouch = this.crouchWant = false; this.duck = 0; this.sneak = false; this.stanceLabel();
    this.kick = this.kickV = 0; this.aim = 0;
    this.setWeapon(weaponKind, sleeve);
  }

  /** The hero's own weapon. It never runs out; the arsenal starts again from it (what was picked up is lost). */
  setWeapon(kind, sleeve = 0x9a8a6a, cuff) {
    this.sleeve = sleeve; this.cuff = cuff;
    const G = this.game, id = G.def && G.def.id, make = (k) => { const w = new Weapon(this, k, sleeve, cuff), n = START[k] || 20; w.reserve = MELEE[k] ? null : w.mag > 1 ? n - w.mag : n; return { type: 'weapon', kind: k, own: true, weapon: w }; };
    this.slots = [make(kind)]; this.slots[0].hero = true;      // the hero's own weapon (it too has only so many shots)
    const second = (SECOND[id] || []).find((k) => k !== kind); if (second) this.slots.push(make(second));   // and the second weapon of the chapter
    this.slots.push({ type: 'weapon', kind: 'fists', own: true, fists: true, weapon: new Weapon(this, 'fists', sleeve, cuff) });
    this.slot = 0; this.show(0); this.raise = 0;
    for (const [item, n] of Object.entries(BAG_START[id] || {})) this.addItem(item, n);
  }
  /** The hero's special skill (E): is it at work now? */
  skillOn(id) { return this.skill === id && this.skillT > 0; }
  get cloak() { return this.skillOn('vanish'); }
  /** How much faster the skill makes him go. */
  get boost() { return this.skillOn('dash') ? 1.8 : this.skillOn('fury') ? 1.2 : 1; }
  setSkill(id) { this.skill = id; this.skillT = 0; this.skillCd = 0; }
  useSkill() {
    const G = this.game, k = SKILLS[this.skill];
    if (!k || this.dead) return;
    if (this.skillT > 0) return;
    if (this.skillCd > 0) { G.say(k.name + ': ready in ' + Math.ceil(this.skillCd) + ' s'); return; }
    this.skillT = k.dur; this.skillCd = k.cool; G.sound.skill(this.skill); G.say(k.name + ' — ' + k.line);
    if (this.skill === 'vanish') for (const e of G.enemies) if (e.lose) e.lose(this);       // they lose him: they go where they saw him last
    if (G.duel) G.duel.skill(this.skill);
  }
  /** Put down what is in hand (G): a weapon with the shots it has left, or one of the things in the bag. The fists stay. */
  drop() {
    const G = this.game, sl = this.slots[this.slot], w = sl && sl.weapon;
    if (!sl || this.dead) return;
    if (sl.fists) { G.say('Nothing in hand to put down'); return; }
    if (w && (w.state === 'wind' || w.state === 'use' || w.meleeT > 0)) return;           // not in the middle of a throw or a blow
    let what, line;
    if (sl.type === 'item') {
      what = { type: 'item', id: sl.id }; sl.count--; line = G.itemLabel(sl.id) + ' put down' + (sl.count > 0 ? ' (' + sl.count + ' left)' : '');
    } else {
      const n = MELEE[sl.kind] ? undefined : this.left(w);
      what = { type: 'weapon', kind: sl.kind, rounds: n }; line = (sl.hero ? G.ownName.split(' & ')[0] : weaponName(sl.kind, G.def)) + ' put down';
      this.slots.splice(this.slot, 1); this.slot = Math.max(0, Math.min(this.slot, this.slots.length - 1)); this.show(this.slot);
    }
    if (sl.type === 'item' && sl.count <= 0) { this.slots.splice(this.slot, 1); this.slot = Math.max(0, Math.min(this.slot, this.slots.length - 1)); this.show(this.slot); }
    G.cache.arms = null; G.bagShown = 2.5;
    G.dropPickup(what); G.say(line);
  }
  /** A missile the player threw, picked up again: one more for its weapon (or bag). */
  takeBack(kind) {
    const G = this.game;
    if (kind === 'boulder') return this.addItem('boulder') ? 'A big stone, picked up again' : null;
    const have = this.slots.find((q) => q.type === 'weapon' && q.kind === kind && !q.fists);
    if (have) { if (this.left(have.weapon) >= most(kind)) return null; have.weapon.reserve = (have.weapon.reserve ?? 0) + 1; G.cache.arms = null; return weaponName(kind, G.def) + ': one taken back'; }
    return this.addWeapon(kind, 1) ? weaponName(kind, G.def) + ' taken back' : null;
  }
  /** Shots left in a weapon, loaded and spare. */
  left(w) { return w.reserve === null && w.meleePrimary ? Infinity : (w.reserve ?? 0) + (w.mag > 1 ? w.ammo : 0); }
  /** A box of ammunition: for the weapon in hand if it can take more, otherwise for the hero's own, otherwise for any weapon carried. Returns a line to show, or null. */
  addAmmo() {
    const cur = this.slots[this.slot], order = [cur, this.slots[0], ...this.slots].filter((q) => q && q.type === 'weapon' && !q.fists && !MELEE[q.kind]);
    for (const q of order) {
      const w = q.weapon, room = most(q.kind) - this.left(w);
      if (room <= 0) continue;
      const n = Math.min(room, PACK[q.kind] || 5); w.reserve += n;
      return 'Ammunition: ' + (q.hero ? this.game.ownName.split(' & ')[0] : weaponName(q.kind, this.game.def)) + '  +' + n;
    }
    return null;
  }
  /** Put the weapon or the thing of slot i into the hands. */
  show(i) {
    const sl = this.slots[i]; this.vm.clear(); this.weapon = sl.weapon; this.vm.add(sl.weapon.root); this.raise = 1;
    this.game.cache.arms = null; this.game.bagShown = 2.5;
  }
  select(i) {
    if (i === this.slot || !this.slots[i] || this.dead) return;
    const w = this.weapon;
    if (w) { w.meleeT = 0; if (w.melee) w.melee.visible = false; if (w.state === 'wind' || w.state === 'draw' || w.state === 'use') w.state = 'ready'; w.t = 0; }   // a throw or a draw that was begun is called off
    this.slot = i; this.show(i); this.game.sound.swap();
  }
  cycle(d) { const n = this.slots.length; if (n > 1) this.select((this.slot + d + n) % n); }
  /** A weapon taken from an enemy: a new place in the arsenal, or more shots for one already carried. Returns a line to show, or null if it is of no use. */
  addWeapon(kind, rounds) {
    const have = this.slots.find((s) => s.type === 'weapon' && s.kind === kind && !s.fists);
    if (have && MELEE[kind]) return null;                          // a second knife is of no use
    if (have) { const n = Math.min(rounds ?? ROUNDS[kind] ?? 6, most(kind) - this.left(have.weapon)); if (n <= 0) return null; have.weapon.reserve += n; return '+' + n; }   // more shots for a weapon already carried
    const n = rounds ?? ROUNDS[kind] ?? 6;
    if (this.slots.filter((s) => s.type === 'weapon' && !s.fists).length >= MAX_SLOTS) return null;
    const w = new Weapon(this, kind, this.sleeve, this.cuff); w.reserve = MELEE[kind] ? null : n;
    if (w.mag > 1) { w.ammo = Math.min(w.mag, n); w.reserve = n - w.ammo; }       // it comes loaded
    const at = this.slots.filter((s) => s.type === 'weapon').length;
    this.slots.splice(at, 0, { type: 'weapon', kind, own: false, weapon: w });
    if (this.slot >= at) this.slot++;
    return 'new';
  }
  /** Something for the bag (id: 'heal' or a bomb). Returns false if the bag holds as many as it can. */
  addItem(id, n = 1) {
    let sl = this.slots.find((s) => s.type === 'item' && s.id === id);
    if (sl && sl.count >= MAX_ITEMS) return false;
    if (!sl) { sl = { type: 'item', id, count: 0 }; sl.weapon = new Weapon(this, id, this.sleeve, this.cuff); sl.weapon.slot = sl; this.slots.push(sl); }
    sl.count = Math.min(MAX_ITEMS, sl.count + n); this.game.bagShown = 2.5; this.game.cache.arms = null;
    return true;
  }
  count(id) { const sl = this.slots.find((s) => s.type === 'item' && s.id === id); return sl ? sl.count : 0; }
  /** Drink the tonic (eat the rice cake...) from the bag. */
  heal(sl) {
    const G = this.game;
    if (!sl || sl.count <= 0) return false;
    if (this.hp >= this.maxHp) { G.say('You are not hurt'); return false; }
    sl.count--; this.hp = Math.min(this.maxHp, this.hp + 35); G.gfx.heal = 1; G.sound.gulp(); G.say(G.def.pickupText); G.cache.arms = null;
    return true;
  }
  /** Take empty places out of the arsenal: a weapon with no shots left, a bag item used up. */
  tidy() {
    const i = this.slots.findIndex((s) => !s.own && (s.type === 'item' ? s.count <= 0 : !MELEE[s.kind] && s.weapon.reserve === 0 && (s.weapon.ammo || 0) <= 0) && s.weapon.state === 'ready' && s.weapon.meleeT <= 0);
    if (i < 0) return;
    const cur = this.slots[this.slot], wasCur = i === this.slot;
    if (wasCur && cur.type === 'weapon') this.game.say('Out of ammunition');
    this.slots.splice(i, 1);
    if (wasCur) { this.slot = 0; this.show(0); } else this.slot = this.slots.indexOf(cur);
    this.game.cache.arms = null; this.game.bagShown = 2.5;
  }

  /** Direction the camera is looking. */
  forward(out) { const cp = Math.cos(this.pitch); return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp); }

  update(dt, input, active) {
    const G = this.game, W = G.world, cam = G.gfx.camera;
    if (this.dead) {
      this.deadT += dt;
      this.camY = damp(this.camY, this.pos.y + 0.35, 3, dt);
      this.roll = damp(this.roll, 0.9, 2.5, dt);
      cam.position.set(this.pos.x, this.camY, this.pos.z);
      cam.rotation.set(this.pitch * (1 - Math.min(1, this.deadT)), this.yaw, this.roll);
      this.vm.visible = false;
      return;
    }
    this.vm.visible = true;
    this.hurtT += dt;
    if (this.mods.regen && this.hurtT > 4 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + this.mods.regen * dt);
    if (this.skillT > 0) { this.skillT = Math.max(0, this.skillT - dt); if (this.skill === 'mend') this.hp = Math.min(this.maxHp, this.hp + 12.5 * dt); if (this.skillT === 0) G.say((SKILLS[this.skill] || {}).name + ' is over'); }
    if (this.skillCd > 0) { this.skillCd = Math.max(0, this.skillCd - dt); if (this.skillCd === 0) G.sound.click(1800); }
    const K = input.keys;
    if (active) {
      const sens = 0.0022 * Math.min(1, cam.fov / 72 + 0.06);        // slower when zoomed in
      this.yaw -= input.mx * sens; this.pitch -= input.my * sens;
      if (!input.locked && !input.free) { if (input.cx < 0.04) this.yaw += dt * 1.7; else if (input.cx > 0.96) this.yaw -= dt * 1.7; }
      this.pitch = clamp(this.pitch, -1.45, 1.45);
    }
    let f = 0, s = 0;
    if (active) {
      f = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0);
      s = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0);      // the arrow keys move exactly like W A S D; the mouse turns the view
    }
    // crouching: C toggles it. Half speed, lower eyes and body, harder for enemies to see.
    if (active) {
      if (input.pressed.has('KeyX')) { this.sneak = !this.sneak; this.stanceLabel(); G.say(this.sneak ? 'Sneaking — X to walk normally' : 'Walking'); }
      // the arsenal: the mouse wheel, or the number keys; H uses a healing item from the bag at once
      if (input.wheel) this.cycle(input.wheel > 0 ? 1 : -1);
      for (let k = 1; k <= 9; k++) if (input.pressed.has('Digit' + k) && this.slots[k - 1]) this.select(k - 1);
      if (input.pressed.has('KeyE')) this.useSkill();
      if (input.pressed.has('KeyG')) this.drop();
      if (input.pressed.has('KeyH')) { const sl = this.slots.find((q) => q.type === 'item' && q.id === 'heal'); if (sl) this.heal(sl); else G.say('Nothing to heal with in the bag'); }
      if (input.pressed.has('KeyC')) this.crouchWant = !this.crouchWant;
      if (this.crouch && input.pressed.has('Space')) this.crouchWant = false;
      if (this.crouchWant !== this.crouch) {
        if (this.crouchWant) this.crouch = true;
        else { const t = { x: this.pos.x, y: this.pos.y, z: this.pos.z }; W.collide(t, 0.4, 1.75); if (Math.hypot(t.x - this.pos.x, t.z - this.pos.z) < 0.02) this.crouch = false; }   // stand up only where there is head room
        this.stanceLabel();
      }
    }
    this.tidy();
    { const w = this.weapon, sl = this.slots[this.slot];
      this.dryT = Math.max(0, (this.dryT || 0) - dt);
      if (active && input.fire && sl && sl.own && !sl.fists && !MELEE[sl.kind] && w.state === 'ready' && w.reserve === 0 && (w.mag > 1 ? w.ammo === 0 : true) && !this.dryT) {
        const fi = this.slots.findIndex((q) => q.fists); this.dryT = 2; G.say('Out of ammunition — look for some on the fallen and in crates, or take back what you threw. Fists: ' + (fi + 1)); G.sound.click(900); this.select(fi);
      } }
    this.duck = damp(this.duck, this.crouch ? 1 : 0, 12, dt);
    const H = this.crouch ? 1.05 : 1.75, eye = 1.65 - 0.7 * this.duck;
    const sprint = (this.sprinting = active && !this.crouch && (K.has('ShiftLeft') || K.has('ShiftRight')));
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    // Ladders: face one and walk into it, and you climb. At the top you step onto whatever it leans against.
    const lad = this.crouch ? null : W.ladderFor(this.pos, -sy, -cy), climbing = !!lad && f > 0 && this.pos.y < lad.y1 && !this.mount;
    let wx = -sy * f + cy * s, wz = -cy * f - sy * s;
    const wl = Math.hypot(wx, wz);
    const top = (sprint && f > 0 ? 8.6 : 5.6) * (1 - this.aim * 0.4) * (1 - 0.5 * this.duck) * (this.sneaking ? 0.5 : 1) * this.mods.speed * this.boost;
    if (wl > 0) { wx = wx / wl * top; wz = wz / wl * top; }
    const acc = this.onGround ? 11 : 2.5;
    if (this.mount) {                                       // from the top rung onto the roof or the deck, in a quarter of a second
      const m = this.mount; m.t = Math.min(1, m.t + dt / 0.25);
      this.pos.set(m.x0 + (m.x1 - m.x0) * m.t, m.y, m.z0 + (m.z1 - m.z0) * m.t); this.vel.set(0, 0, 0); if (m.t >= 1) this.mount = null;
    } else if (climbing) {
      const out = 0.47 + (lad.lean || 0) * Math.max(0, lad.y1 - this.pos.y), tx = lad.x + lad.nx * out, tz = lad.z + lad.nz * out, k = Math.min(1, dt * 10);
      this.pos.x += (tx - this.pos.x) * k; this.pos.z += (tz - this.pos.z) * k; this.vel.set(0, 3.4 * this.mods.speed, 0); this.onGround = false;
      this.rung = (this.rung || 0) + 3.4 * dt; if (this.rung > 0.45) { this.rung = 0; G.sound.step(true); }
    } else {
      this.vel.x = damp(this.vel.x, wx, acc, dt); this.vel.z = damp(this.vel.z, wz, acc, dt);
      if (active && this.onGround && !this.crouch && input.pressed.has('Space')) { this.vel.y = 5.8; this.onGround = false; }
      this.vel.y -= 17 * dt;
      if (lad && !this.onGround && this.vel.y < -3.4) this.vel.y = -3.4;         // holding on to the ladder on the way down
    }

    const steps = Math.max(1, Math.ceil(Math.hypot(this.vel.x, this.vel.z) * dt / 0.2));   // small steps: thin walls cannot be skipped
    for (let q = 0; q < steps; q++) {
      const nx = this.pos.x + this.vel.x * dt / steps, nz = this.pos.z + this.vel.z * dt / steps;
      if (W.walkable(this.pos.x, this.pos.z, nx, nz, this.pos.y)) { this.pos.x = nx; this.pos.z = nz; }
      else { this.vel.x *= 0.5; this.vel.z *= 0.5; }
      W.collide(this.pos, 0.4, H);
    }
    for (const e of G.enemies) {               // living bodies are solid
      if (!e.alive || e.state === 'hidden') continue;
      const ex = this.pos.x - e.pos.x, ez = this.pos.z - e.pos.z, d2 = ex * ex + ez * ez, rr = e.cfg.dog ? 0.7 : 0.8;
      if (d2 < rr * rr && d2 > 1e-6 && Math.abs(this.pos.y - e.pos.y) < 1.6) { const d = Math.sqrt(d2); this.pos.x = e.pos.x + ex / d * rr; this.pos.z = e.pos.z + ez / d * rr; }
    }
    W.collide(this.pos, 0.4, H);
    const ground = W.groundAt(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y += this.vel.y * dt;
    if (climbing && this.pos.y >= lad.y1) { this.vel.y = 0; this.mount = { t: 0, x0: this.pos.x, z0: this.pos.z, x1: lad.x - lad.nx * 0.55, z1: lad.z - lad.nz * 0.55, y: lad.y1 + 0.02 }; this.pos.y = lad.y1 + 0.02; }
    if (this.mount) this.onGround = true;
    else if (this.pos.y <= ground) {
      if (!this.onGround && this.vel.y < -6) { this.land = Math.min(0.25, -this.vel.y * 0.02); G.sound.step(false); }
      this.pos.y = ground; this.vel.y = 0; this.onGround = true;
    } else if (this.pos.y - ground > 0.12) this.onGround = false;
    // Deep water: whoever ends up on the bed of a lake or the sea (off a jetty, over a parapet) is put back on the last dry spot he stood on.
    if (W.waterY > -1e6) {
      if (this.onGround && this.pos.y > W.waterY + 0.3) { this.dryT = (this.dryT || 0) + dt; if (this.dryT > 0.4) { this.dryT = 0; (this.dry || (this.dry = new THREE.Vector3())).copy(this.pos); } }
      if (this.pos.y < W.waterY - 1.2 && this.dry) { this.wet = (this.wet || 0) + dt; if (this.wet > 0.9) { this.pos.copy(this.dry); this.vel.set(0, 0, 0); this.wet = 0; G.say('You drag yourself out of the water'); } } else this.wet = 0;
    }

    // camera: head bob, landing dip, recoil
    const spd = Math.hypot(this.vel.x, this.vel.z);
    this.bobAmt = damp(this.bobAmt, this.onGround ? Math.min(1, spd / 5.6) : 0, 8, dt);
    this.bob += spd * dt * 1.75;
    const ph = Math.floor(this.bob / Math.PI);
    if (ph !== this.stepPhase) { this.stepPhase = ph; if (this.onGround && spd > 1.5) G.sound.step(ground > W.height(this.pos.x, this.pos.z) + 0.05, this.sneaking ? 0.2 : 1); }
    this.land = damp(this.land, 0, 9, dt);
    this.kickV += (-this.kick * 90 - this.kickV * 13) * dt; this.kick += this.kickV * dt;
    this.camY = damp(this.camY, this.pos.y + eye, 20, dt);
    if (Math.abs(this.camY - (this.pos.y + eye)) > 1.2) this.camY = this.pos.y + eye;
    this.roll = damp(this.roll, -s * 0.012 * this.bobAmt, 8, dt);
    cam.position.set(this.pos.x, this.camY + Math.abs(Math.sin(this.bob)) * 0.045 * this.bobAmt - this.land, this.pos.z);
    cam.rotation.set(this.pitch + this.kick, this.yaw, this.roll + Math.cos(this.bob) * 0.004 * this.bobAmt);

    const w = this.weapon;
    this.aim = damp(this.aim, active && w.canAim && input.alt && !w.busy && this.raise < 0.3 ? 1 : 0, 14, dt);
    const fov = lerp(72 + (sprint && f > 0 ? 5 * this.bobAmt : 0), w.aimFov, this.aim);
    if (Math.abs(fov - cam.fov) > 0.01) { cam.fov = damp(cam.fov, fov, 16, dt); cam.updateProjectionMatrix(); }
    this.swayX = damp(this.swayX, clamp(-input.mx * 0.0006, -0.05, 0.05), 10, dt);
    this.swayY = damp(this.swayY, clamp(input.my * 0.0006, -0.05, 0.05), 10, dt);
    w.update(dt, input, active);
    this.raise = Math.max(0, this.raise - dt * 4); this.vm.position.y = -0.12 * ease(this.raise); this.vm.rotation.x = -0.5 * ease(this.raise);   // a weapon just taken in hand comes up from below
    if (w.scope && this.aim > 0.8) this.vm.visible = false;          // looking through the scope
  }

  recoil(v) { this.kickV += v; }
}

// ---------------------------------------------------------------------------

class Weapon {
  constructor(player, kind, sleeve, cuff) {
    this.p = player; this.game = player.game; this.kind = kind; this.sleeve = sleeve; this.cuffIn = cuff; this.m = player.mods;
    this.root = new THREE.Group();
    this.cd = 0; this.t = 0; this.state = 'ready'; this.kick = 0; this.kickV = 0; this.meleeT = 0; this.meleeHit = false;
    this.reserve = null;                       // shots left beyond what is loaded: null = no end (the hero's own weapon); taken weapons run out
    this.muzzle = new THREE.Object3D();
    const M = this.game.M;
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: player.flashTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.flash.material.color.setScalar(5); this.flash.visible = false; this.flashT = 0;
    this['build_' + kind](M);
    if (!this.melee && kind !== 'fists' && this.game.def && this.game.def.knife) this.addKnife(M);
    if (this.melee) this.root.add(this.melee);
  }
  get busy() { return this.state === 'reload' || this.state === 'use' || this.meleeT > 0; }
  /** For a thrown weapon: how it leaves the hand (the same numbers as the throw itself), so that its flight can be drawn while aiming. */
  launch() {
    const pw = this.m.power;
    if (this.kind === 'shuriken') return { kind: 'star', speed: 52 * (1 + (pw - 1) * 0.7), grav: 3, lift: 0 };
    if (this.kind === 'sling') return { kind: 'sstone', speed: 46 * (1 + (pw - 1) * 0.5), grav: 8, lift: 0.02 };
    if (this.kind === 'blowgun') return { kind: 'bdart', speed: 72, grav: 1.2, lift: 0 };
    if (this.kind === 'boulder') return { kind: 'boulder', speed: 14 * (1 + (pw - 1) * 0.5), grav: 9.8, lift: 0.12, dmg: 130 * pw };
    if (this.kind === 'molotov') return { kind: 'molotov', speed: 16 * (1 + (pw - 1) * 0.5), grav: 9.8, lift: 0.14 };
    if (this.slot && this.kind !== 'heal') return { kind: this.kind, speed: 17 * (1 + (pw - 1) * 0.5), grav: 9.8, lift: 0.16, bounce: true };
    if (this.thrown && !this.slot) { const sh = this.shot || (this.kind === 'javelin' ? [50, 85, 6] : [36, 80, 7]); return { kind: this.kind, speed: sh[0] * (1 + (pw - 1) * 0.7), grav: sh[2], lift: 0 }; }
    return null;
  }
  /** Ready to throw (a throw is not already under way, and there is something to throw). */
  get loaded() { return this.state === 'ready' && this.meleeT <= 0 && (this.slot ? this.slot.count > 0 : this.stocked); }
  /** Can another shot be loaded or thrown? */
  get stocked() { return this.reserve === null || this.reserve > 0; }
  /** One shot used from the reserve (bows, crossbows, everything thrown). */
  spend() { if (this.reserve !== null) this.reserve = Math.max(0, this.reserve - 1); }
  /** Fill the magazine from the reserve. */
  refill() { if (this.reserve === null) { this.ammo = this.mag; return; } const k = Math.min(this.mag - this.ammo, this.reserve); this.ammo += k; this.reserve -= k; }

  /** Forearm running from the hand down/back toward the camera, with a cuff at the wrist. */
  arm(sleeve, p, r, len = 0.36) {
    const rr = [-r[0], r[1], r[2]];
    const w = new THREE.Vector3(0, len / 2 - 0.01, 0).applyEuler(new THREE.Euler(rr[0], rr[1], rr[2], 'YXZ'));
    return [gCap(0.036, len, sleeve, p, rr), gCyl(0.041, 0.039, 0.06, this.cuff ?? sleeve, [p[0] + w.x, p[1] + w.y, p[2] + w.z], rr)];
  }

  // ---- revolver -------------------------------------------------------------
  build_revolver(M) {
    this.ammo = this.mag = 6; this.canAim = true; this.aimFov = 50; this.cuff = this.cuffIn ?? 0x4a3020;
    this.hip = new THREE.Vector3(0.17, -0.17, -0.4); this.ads = new THREE.Vector3(0, -0.119, -0.36);      // aimed, the gun stays under the crosshair: the target is never hidden behind it
    const g = (this.gun = new THREE.Group()); g.scale.setScalar(1.5);
    const D = 0x34373e, L = 0x6c727c;
    g.add(mesh([
      gBox(0.032, 0.11, 0.05, 0x5a3418, [0, -0.06, 0.035], [-0.35, 0, 0]),
      fist([0.002, -0.058, 0.03], [-0.35, 0, 0], 1.02),
      ...this.arm(this.sleeve, [0.02, -0.145, 0.215], [1.15, 0, 0.1], 0.3),
    ], M.flat));
    g.add(mesh([
      gCyl(0.0125, 0.0135, 0.2, D, [0, 0.03, -0.2], [Math.PI / 2, 0, 0], 1, 8), gCyl(0.005, 0.005, 0.13, L, [0, 0.009, -0.165], [Math.PI / 2, 0, 0], 1, 6),
      gBox(0.024, 0.064, 0.09, D, [0, 0.013, -0.055]), gBox(0.012, 0.008, 0.095, D, [0, 0.051, -0.06]), gBox(0.004, 0.013, 0.012, L, [0, 0.048, -0.292]),
      gBox(0.008, 0.006, 0.05, D, [0, -0.032, -0.03]), gBox(0.006, 0.03, 0.006, L, [0, -0.018, -0.03], [0.3, 0, 0]),
    ], M.metal));
    this.drum = mesh([gCyl(0.0275, 0.0275, 0.056, L, [0, 0, 0], [Math.PI / 2, 0, 0], 1, 6)], M.metal);
    this.drum.position.set(0, 0.022, -0.07); this.drumRot = 0; g.add(this.drum);
    this.hammer = mesh([gBox(0.007, 0.024, 0.01, D, [0, 0.012, 0])], M.metal);
    this.hammer.position.set(0, 0.04, -0.004); g.add(this.hammer);
    this.muzzle.position.set(0, 0.03, -0.31); this.flash.position.set(0, 0.03, -0.36); g.add(this.muzzle, this.flash);
    this.root.add(g);
  }
  update_revolver(dt, input, active) {
    const P = this.p, G = this.game;
    if (this.state === 'reload') {
      this.t += dt / this.m.reload;
      const T = 1.45, k = this.t / T;
      if (!this.clicked && k > 0.35) { this.clicked = 1; G.sound.click(1900); }
      if (this.clicked === 1 && k > 0.6) { this.clicked = 2; G.sound.click(2400); }
      if (this.t >= T) { this.state = 'ready'; this.refill(); G.sound.click(3000); }
    } else if (active) {
      if (this.stocked && ((input.pressed.has('KeyR') && this.ammo < this.mag) || (input.shoot && this.ammo === 0 && this.cd <= 0))) { this.state = 'reload'; this.t = 0; this.clicked = 0; }
      else if (input.shoot && this.cd <= 0 && this.ammo > 0) {
        this.ammo--; this.cd = 0.33 * this.m.fire; this.kickV += 9; P.recoil(0.55); this.drumRot += Math.PI / 3;
        this.flashT = 0.05; this.flash.rotation.z = Math.random() * 6.28; this.flash.scale.setScalar(0.8 + Math.random() * 0.5);
        G.playerHitscan(this.muzzle, P.aim > 0.5 ? 0.002 : 0.012, 35 * this.m.gun);
        G.sound.gun(1, 0);
      }
    }
    const rl = this.state === 'reload' ? Math.sin(Math.min(1, this.t / 1.45) * Math.PI) : 0;
    this.gun.position.lerpVectors(this.hip, this.ads, P.aim);
    this.gun.position.y -= rl * 0.16; this.gun.position.z += this.kick * 0.05;
    this.gun.rotation.set(this.kick * 0.5 + rl * 0.9 + P.swayY, 0.05 * (1 - P.aim) + P.swayX + rl * 0.3, rl * -0.7 + P.swayX * 0.8);
    this.drum.rotation.z = damp(this.drum.rotation.z, this.drumRot + rl * 9, 18, dt);
    this.hammer.rotation.x = this.cd > 0.25 ? 0.2 : -0.5;
  }

  // ---- bow + katana -----------------------------------------------------------
  build_bow(M) {
    this.canAim = false; this.aimFov = 72; this.draw = 0; this.cuff = this.cuffIn ?? 0x1a1e2c;
    const g = (this.gun = new THREE.Group());
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.64, 0.13), new THREE.Vector3(0, -0.38, -0.02), new THREE.Vector3(0, 0, -0.055), new THREE.Vector3(0, 0.5, -0.03), new THREE.Vector3(0, 0.98, 0.17)]);
    const stave = new THREE.TubeGeometry(curve, 28, 0.0115, 6);
    const flat = [gBox(1, 1, 1, 0x1c1410, [0, 0, 0], [0, 0, 0], 0.0001)];
    const staveMesh = new THREE.Mesh(stave, M.flat.clone()); staveMesh.material.vertexColors = false; staveMesh.material.color.set(0x241812); staveMesh.material.roughness = 0.35;
    g.add(staveMesh);
    for (const y of [-0.5, -0.25, 0.25, 0.6, 0.85]) { const p = curve.getPoint((y + 0.64) / 1.62); flat.push(gCyl(0.0135, 0.0135, 0.03, 0xc9a45a, [0, p.y, p.z], [0, 0, 0], 1, 6)); }
    flat.push(gCyl(0.016, 0.016, 0.12, 0x5a1c1c, [0, 0, -0.055], [0, 0, 0], 1, 6));
    flat.push(fist([0, 0, -0.05], [0, 0, 0], 1.05, -1), ...this.arm(this.sleeve, [-0.08, -0.2, 0.16], [0.95, 0, -0.3], 0.4));
    flat.push(gBox(0.09, 0.24, 0.15, this.sleeve, [-0.1, -0.3, 0.25], [-0.95, 0, -0.3]));
    g.add(mesh(flat, M.flat));
    const sm = new THREE.MeshBasicMaterial({ color: 0xe8e0c8 });
    const sg = new THREE.CylinderGeometry(0.0012, 0.0012, 1, 4);
    this.s1 = new THREE.Mesh(sg, sm); this.s2 = new THREE.Mesh(sg, sm); g.add(this.s1, this.s2);
    this.arrow = mesh([gCyl(0.0045, 0.0045, 0.92, 0xb89a62, [0, 0, -0.46], [Math.PI / 2, 0, 0], 1, 5), gCone(0.011, 0.05, 0xb0b4bc, [0, 0, -0.94], [-Math.PI / 2, 0, 0], 1, 5),
      gBox(0.03, 0.003, 0.11, 0xf0ece0, [0, 0, -0.07]), gBox(0.003, 0.03, 0.11, 0xf0ece0, [0, 0, -0.07])], M.flat);
    g.add(this.arrow);
    this.hand = mesh([fist([0.012, -0.012, 0.02], [0, 0.3, 1.2], 1), ...this.arm(this.sleeve, [0.09, -0.1, 0.24], [1.25, 0, 0.42], 0.36),
      gBox(0.085, 0.22, 0.14, this.sleeve, [0.11, -0.18, 0.3], [-1.25, 0, 0.42])], M.flat);
    g.add(this.hand);
    g.position.set(-0.2, -0.1, -0.62); g.rotation.set(0, -0.26, -0.16);
    this.root.add(g);
    if (this.game.def && this.game.def.id === 'aztec') this.addMacuahuitl(M); else this.addKatana(M);
  }
  /** The katana on the right mouse button, held in both hands: shared by the bow and the throwing stars. */
  addKatana(M) {
    const k = (this.melee = new THREE.Group());
    k.add(mesh([gBox(0.03, 0.27, 0.036, 0x16161c, [0, 0, 0]), gCyl(0.05, 0.05, 0.012, 0x2a2418, [0, 0.142, 0], [0, 0, 0], 1, 10),
      fist([0, 0.075, 0.0], [0, 0, 0], 1.05), fist([0, -0.07, 0.0], [0, 0, 0], 1.05, -1),
      ...this.arm(this.sleeve, [0.06, -0.22, 0.14], [0.6, 0, 0.3], 0.4), ...this.arm(this.sleeve, [-0.1, -0.2, 0.14], [0.6, 0, -0.5], 0.4)], M.flat));
    k.add(mesh([gBox(0.007, 0.76, 0.034, 0xdfe4ea, [0, 0.53, 0], [0, 0, 0]), gBox(0.008, 0.04, 0.04, 0xc9a45a, [0, 0.16, 0])], M.metal));
    k.visible = false;
    this.meleeDur = 0.42; this.meleeAt = 0.42; this.meleeRange = 3.3; this.meleeCone = 0.55; this.meleeDmg = 110;
  }

  // ---- throwing stars + katana (Kagemori) --------------------------------------
  // Three stars leave the hand in a narrow fan: deadly close up, where all three strike, and weak far off, where one does.
  build_shuriken(M) {
    this.thrown = true; this.canAim = true; this.aimFov = 60; this.cuff = this.cuffIn ?? 0x1a1e2c;
    const X = Math.PI / 2;
    const star = (p, r, s = 1) => [gStar(0.085 * s, p, r)];
    const g = (this.gun = new THREE.Group());
    this.base = [0.3, -0.27, -0.5, -0.2, 0.05];
    g.add(mesh([fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.2, 0.12], [0.5, 0, 0.2], 0.36)], M.flat));
    this.missile = new THREE.Group();                        // the three stars about to be thrown, held upright like a hand of cards
    this.missile.add(mesh([...star([0, 0.105, -0.04], [0, 0, X], 1.15), ...star([0.014, 0.098, -0.005], [0.55, 0, X], 1.15), ...star([-0.014, 0.098, -0.078], [-0.55, 0, X], 1.15)], M.metal));
    g.add(this.missile); this.root.add(g);
    const off = (this.off = new THREE.Group());             // the left hand, with the stars still to come lying on the palm
    off.add(mesh([fist([0, 0, 0], [X, 0, 0], 1.05, -1), ...this.arm(this.sleeve, [-0.07, -0.16, 0.2], [1.0, 0, -0.35], 0.38)], M.flat));
    off.add(mesh([0, 1, 2, 3].flatMap((i) => star([0, 0.06 + i * 0.016, -0.02], [0, i * 0.42, 0], 1.15)), M.metal));
    off.position.set(-0.4, -0.36, -0.62); off.rotation.set(0.25, 0.45, 0.1); this.root.add(off);
    this.addKatana(M);
  }
  update_shuriken(dt, input, active) {
    const P = this.p, G = this.game, b = this.base, WIND = 0.1, REC = 0.36;
    if (this.state === 'ready') { if (active && input.shoot && this.meleeT <= 0 && this.stocked) { this.state = 'wind'; this.t = 0; } }
    else if (this.state === 'wind') {
      this.t += dt / this.m.fire;
      if (this.t >= WIND) {
        this.state = 'recover'; this.t = 0; this.kickV += 3; P.recoil(0.08); this.spend();
        for (const turn of [0, -0.035, 0.035]) G.playerShoot('star', 52 * (1 + (this.m.power - 1) * 0.7), 26 * this.m.power, undefined, turn);
        G.sound.whiz();
      }
    } else { this.t += dt / this.m.fire; if (this.t >= REC) this.state = 'ready'; }
    const wind = this.state === 'wind' ? ease(Math.min(1, this.t / WIND)) : 0, rec = this.state === 'recover' ? this.t / REC : 1;
    this.missile.visible = this.state !== 'recover' || rec > 0.5;
    const rise = this.state === 'recover' ? 1 - ease(clamp((rec - 0.5) / 0.5, 0, 1)) : 0;          // the next three come up from below
    const fwd = this.state === 'recover' && rec < 0.4 ? Math.sin((rec / 0.4) * Math.PI) : 0;       // the flick: the hand sweeps forward and across
    const m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0, g = this.gun;
    g.position.set(b[0] + wind * 0.1 - fwd * 0.26 - m * 0.2, b[1] - rise * 0.3 - m * 0.4 + wind * 0.04, b[2] + wind * 0.16 - fwd * 0.22 + this.kick * 0.02);
    g.rotation.set(b[3] + P.swayY - wind * 0.3 + fwd * 0.5 - m * 0.4, b[4] + P.swayX + wind * 0.5 - fwd * 0.9, P.swayX * 0.8 - fwd * 0.3);
    this.off.position.set(-0.4 - P.swayX * 0.6 - m * 0.25, -0.36 - P.swayY * 0.4 - m * 0.45, -0.62);
  }
  update_bow(dt, input, active) {
    const P = this.p, G = this.game;
    if (this.state === 'ready') { if (active && input.shoot && this.meleeT <= 0 && this.stocked) { this.state = 'draw'; this.t = 0; } }
    else if (this.state === 'draw') {
      this.t += dt / this.m.draw;
      if (this.t >= 0.34) {
        this.state = 'nock'; this.t = 0; this.kickV += 5; this.spend();
        G.playerShoot('arrow', 82, 60, 7);
        G.sound.bow();
      }
    } else if (this.state === 'nock') { this.t += dt / this.m.draw; if (this.t >= 0.5) this.state = 'ready'; }
    const target = this.state === 'draw' ? ease(Math.min(1, this.t / 0.3)) : 0;
    this.draw = this.state === 'draw' ? target : damp(this.draw, 0, 40, dt);
    const snap = this.state === 'nock' ? Math.sin(this.t * 90) * Math.exp(-this.t * 14) * 0.02 : 0;
    const nz = 0.143 + this.draw * 0.42 + snap, ny = 0.03;
    stretch(this.s1, 0, 0.98, 0.17, 0, ny, nz); stretch(this.s2, 0, -0.64, 0.13, 0, ny, nz);
    const hasArrow = this.state !== 'nock' || this.t > 0.22;
    this.arrow.visible = hasArrow;
    const rise = this.state === 'nock' ? 1 - ease(clamp((this.t - 0.22) / 0.28, 0, 1)) : 0;
    this.arrow.position.set(0.014 + rise * 0.1, ny - rise * 0.35, nz + rise * 0.1);
    this.arrow.rotation.x = rise * -0.5;
    this.hand.position.set(0.014 + rise * 0.1, ny - rise * 0.35, nz + 0.01 + rise * 0.1);
    const g = this.gun, m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0;
    g.position.set(-0.2 - m * 0.25, -0.1 - m * 0.4 + this.kick * 0.01, -0.62 + this.kick * 0.03);
    g.rotation.set(P.swayY - m * 0.4, -0.26 + P.swayX, -0.16 + P.swayX - m * 0.5);
  }

  // ---- crossbow + halberd -------------------------------------------------------
  build_crossbow(M) {
    this.canAim = true; this.aimFov = 38; this.cocked = 1; this.cuff = this.cuffIn ?? 0x6a5a40;
    this.hip = new THREE.Vector3(0.15, -0.19, -0.42); this.ads = new THREE.Vector3(0, -0.098, -0.34);
    const g = (this.gun = new THREE.Group());
    const W1 = 0x5a3a1e, W2 = 0x7a5a30;
    const prod = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.34, 0.012, -0.41), new THREE.Vector3(-0.18, 0.012, -0.5), new THREE.Vector3(0, 0.012, -0.53), new THREE.Vector3(0.18, 0.012, -0.5), new THREE.Vector3(0.34, 0.012, -0.41)]), 20, 0.013, 6);
    const pm = new THREE.Mesh(prod, M.metal.clone()); pm.material.vertexColors = false; pm.material.color.set(0x4a4e56); pm.receiveShadow = true; g.add(pm);
    g.add(mesh([
      gBox(0.046, 0.05, 0.64, W1, [0, 0, -0.2]), gBox(0.05, 0.1, 0.2, W1, [0, -0.025, 0.16]), gBox(0.02, 0.012, 0.4, W2, [0, 0.03, -0.33]),
      gBox(0.06, 0.03, 0.06, 0x2a1c10, [0, 0.012, -0.5]),
      fist([0.004, -0.05, 0.07], [-0.3, 0, 0], 1.05), ...this.arm(this.sleeve, [0.05, -0.15, 0.27], [1.2, 0, 0.15], 0.34),
      fist([0, -0.035, -0.26], [Math.PI / 2, 0, Math.PI], 1.05, -1), ...this.arm(this.sleeve, [-0.1, -0.16, -0.06], [1.05, 0, -0.5], 0.38),
    ], M.flat));
    g.add(mesh([gBox(0.03, 0.02, 0.05, 0x8a8f96, [0, 0.03, -0.12]), gBox(0.008, 0.012, 0.16, 0x6a6f76, [0, -0.04, -0.02], [0.12, 0, 0]),
      xfTorus(0.035, 0.006, [0, 0.0, -0.57])], M.metal));
    const sm = new THREE.MeshBasicMaterial({ color: 0xe0d8c0 }), sg = new THREE.CylinderGeometry(0.0028, 0.0028, 1, 4);
    this.s1 = new THREE.Mesh(sg, sm); this.s2 = new THREE.Mesh(sg, sm); g.add(this.s1, this.s2);
    this.arrow = mesh([gCyl(0.006, 0.006, 0.36, 0x4a3018, [0, 0, -0.18], [Math.PI / 2, 0, 0], 1, 5), gCone(0.013, 0.05, 0xb0b4bc, [0, 0, -0.385], [-Math.PI / 2, 0, 0], 1, 5),
      gBox(0.03, 0.003, 0.08, 0x8a1c1c, [0, 0.004, -0.05])], M.flat);
    this.arrow.position.set(0, 0.044, -0.13); g.add(this.arrow);
    this.muzzle.position.set(0, 0.04, -0.55); g.add(this.muzzle);
    this.root.add(g);
    // halberd (right mouse button while not aiming is "aim"; halberd is on F / middle)
    const h = (this.melee = new THREE.Group());
    h.add(mesh([gCyl(0.017, 0.017, 2.0, 0x5a3a1e, [0, 0, -0.3], [Math.PI / 2, 0, 0], 1, 6),
      fist([0, -0.012, 0.25], [Math.PI / 2, 0, Math.PI], 1.1), fist([0, -0.012, -0.2], [Math.PI / 2, 0, Math.PI], 1.1, -1),
      ...this.arm(this.sleeve, [0.08, -0.14, 0.42], [1.1, 0, 0.3], 0.38), ...this.arm(this.sleeve, [-0.12, -0.14, 0.0], [1.0, 0, -0.5], 0.38)], M.flat));
    h.add(mesh([gBox(0.01, 0.3, 0.26, 0xd4d9df, [0, -0.13, -1.12]), gCone(0.028, 0.42, 0xd4d9df, [0, 0, -1.5], [-Math.PI / 2, 0, 0], 1, 6),
      gBox(0.01, 0.1, 0.1, 0xd4d9df, [0, 0.07, -1.14], [0.6, 0, 0]), gBox(0.03, 0.03, 0.3, 0x8a8f96, [0, 0, -1.15])], M.metal));
    h.visible = false;
    this.meleeDur = 0.55; this.meleeAt = 0.38; this.meleeRange = 3.7; this.meleeCone = 0.72; this.meleeDmg = 95; this.meleeStyle = 'thrust';
  }
  update_crossbow(dt, input, active) {
    const P = this.p, G = this.game;
    if (this.state === 'reload') {
      this.t += dt / this.m.reload;
      const T = 1.0;
      this.cocked = ease(clamp((this.t - 0.2) / 0.5, 0, 1));
      if (!this.clicked && this.t > 0.7) { this.clicked = 1; G.sound.click(1500); }
      if (this.t >= T) { this.state = 'ready'; this.cocked = 1; }
    } else if (active && input.shoot && this.meleeT <= 0 && this.stocked) {
      this.state = 'reload'; this.t = 0; this.clicked = 0; this.cocked = 0; this.kickV += 6; P.recoil(0.25); this.spend();
      G.playerShoot('bolt', 118, 95, 5);
      G.sound.crossbow();
    }
    const zs = lerp(-0.4, -0.13, this.cocked) + (this.state === 'reload' && this.t < 0.2 ? Math.sin(this.t * 120) * 0.012 * (1 - this.t * 5) : 0);
    stretch(this.s1, -0.34, 0.012, -0.41, 0, 0.034, zs); stretch(this.s2, 0.34, 0.012, -0.41, 0, 0.034, zs);
    this.arrow.visible = this.state === 'ready' || this.t > 0.72;
    const rl = this.state === 'reload' ? Math.sin(clamp((this.t - 0.1) / 0.85, 0, 1) * Math.PI) : 0;
    const m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0;
    const g = this.gun;
    g.position.lerpVectors(this.hip, this.ads, P.aim);
    g.position.y -= rl * 0.1 + m * 0.4; g.position.x -= m * 0.2; g.position.z += this.kick * 0.04;
    g.rotation.set(this.kick * 0.25 - rl * 0.55 + P.swayY - m * 0.5, 0.04 * (1 - P.aim) + P.swayX + rl * 0.12, rl * 0.25 + P.swayX * 0.8 + m * 0.5);
  }

  // ---- firearms of 1944: Sten submachine gun and scoped rifle, plus a knife ----
  build_sten(M) {
    this.gunCfg = { interval: 0.085, dmg: 16, hip: 0.03, ads: 0.011, reload: 1.7, kick: 3.2, recoil: 0.13, vol: 0.55 };
    this.ammo = this.mag = 32; this.canAim = true; this.aimFov = 56; this.cuff = this.cuffIn ?? 0x8a7a52;
    this.hip = new THREE.Vector3(0.17, -0.17, -0.42); this.ads = new THREE.Vector3(0, -0.088, -0.34);
    const g = (this.gun = new THREE.Group()), D = 0x2e3136, L = 0x5a5f68, X = Math.PI / 2;
    g.add(mesh([fist([0.002, -0.075, 0.06], [-0.25, 0, 0], 1.02), ...this.arm(this.sleeve, [0.02, -0.16, 0.25], [1.15, 0, 0.1], 0.3),
      fist([-0.12, -0.004, -0.16], [0, 0, X], 1.0, -1), ...this.arm(this.sleeve, [-0.2, -0.1, 0.02], [1.0, 0, -0.7], 0.36)], M.flat));
    g.add(mesh([gCyl(0.02, 0.02, 0.42, D, [0, 0, -0.12], [X, 0, 0], 1, 8), gCyl(0.012, 0.012, 0.2, D, [0, 0, -0.42], [X, 0, 0], 1, 8), gCyl(0.026, 0.026, 0.16, L, [0, 0, -0.27], [X, 0, 0], 1, 8),
      gBox(0.19, 0.03, 0.04, D, [-0.115, 0, -0.16]), gBox(0.02, 0.085, 0.03, D, [0, -0.05, 0.05], [-0.25, 0, 0]), gCyl(0.006, 0.006, 0.3, L, [0, -0.008, 0.24], [X, 0, 0], 1, 5),
      gBox(0.02, 0.09, 0.012, L, [0, -0.03, 0.39]), gBox(0.004, 0.02, 0.01, L, [0, 0.032, -0.5]), gBox(0.02, 0.016, 0.01, L, [0, 0.03, 0.06])], M.metal));
    this.muzzle.position.set(0, 0, -0.53); this.flash.position.set(0, 0, -0.58); g.add(this.muzzle, this.flash);
    this.root.add(g);
  }
  build_rifle(M) {
    this.gunCfg = { interval: 1.15, dmg: 120, hip: 0.02, ads: 0.0006, reload: 2.3, kick: 8, recoil: 0.5, vol: 1, bolt: true };
    this.ammo = this.mag = 5; this.canAim = true; this.aimFov = 15; this.scope = true; this.cuff = this.cuffIn ?? 0x5a5a34;
    this.hip = new THREE.Vector3(0.16, -0.18, -0.4); this.ads = new THREE.Vector3(0, -0.11, -0.3);
    const g = (this.gun = new THREE.Group()), D = 0x2e3136, L = 0x5a5f68, W = 0x6a4426, X = Math.PI / 2;
    g.add(mesh([gBox(0.045, 0.06, 0.62, W, [0, -0.02, -0.2]), gBox(0.045, 0.1, 0.3, W, [0, -0.045, 0.22], [0.12, 0, 0]), gBox(0.04, 0.03, 0.3, W, [0, 0.0, -0.6]),
      fist([0.004, -0.07, 0.1], [-0.3, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.17, 0.29], [1.2, 0, 0.14], 0.32),
      fist([0, -0.055, -0.32], [X, 0, Math.PI], 1.05, -1), ...this.arm(this.sleeve, [-0.1, -0.17, -0.12], [1.05, 0, -0.5], 0.38)], M.flat));
    g.add(mesh([gCyl(0.011, 0.012, 0.86, D, [0, 0.022, -0.5], [X, 0, 0], 1, 8), gBox(0.03, 0.035, 0.2, D, [0, 0.022, 0.0]), gCyl(0.007, 0.007, 0.07, L, [0.04, 0.02, 0.04], [0, 0, X], 1, 5), gSph(0.014, L, [0.078, 0.018, 0.04]),
      ...(this.noScope ? [gBox(0.02, 0.022, 0.02, L, [0, 0.046, -0.02])] : [gCyl(0.018, 0.018, 0.26, D, [0, 0.075, -0.05], [X, 0, 0], 1, 10), gCyl(0.024, 0.024, 0.05, D, [0, 0.075, -0.2], [X, 0, 0], 1, 10), gBox(0.012, 0.03, 0.02, L, [0, 0.05, -0.1]), gBox(0.012, 0.03, 0.02, L, [0, 0.05, 0.02])]),
      gBox(0.004, 0.016, 0.01, L, [0, 0.042, -0.92])], M.metal));
    this.muzzle.position.set(0, 0.022, -0.94); this.flash.position.set(0, 0.022, -1.0); g.add(this.muzzle, this.flash);
    this.root.add(g);
  }
  /** Plain bolt-action rifle with iron sights. */
  build_carbine(M) {
    this.noScope = true; this.build_rifle(M);
    this.gunCfg = { interval: 0.85, dmg: 82, hip: 0.02, ads: 0.003, reload: 2.1, kick: 7, recoil: 0.42, vol: 0.95, bolt: true };
    this.ammo = this.mag = 8; this.aimFov = 34; this.scope = false; this.ads = new THREE.Vector3(0, -0.087, -0.3);
  }
  update_carbine(dt, input, active) { this.updateGun(dt, input, active); }
  update_sten(dt, input, active) { this.updateGun(dt, input, active); }
  update_rifle(dt, input, active) { this.updateGun(dt, input, active); }
  updateGun(dt, input, active) {
    const P = this.p, G = this.game, c = this.gunCfg;
    if (this.state === 'reload') {
      this.t += dt / this.m.reload;
      if (!this.clicked && this.t > c.reload * 0.45) { this.clicked = 1; G.sound.click(1800); }
      if (this.t >= c.reload) { this.state = 'ready'; this.refill(); G.sound.click(2800); }
    } else if (active) {
      if (this.stocked && ((input.pressed.has('KeyR') && this.ammo < this.mag) || (input.shoot && this.ammo === 0 && this.cd <= 0))) { this.state = 'reload'; this.t = 0; this.clicked = 0; }
      else if (input.shoot && this.cd <= 0 && this.ammo > 0 && this.meleeT <= 0) {
        this.ammo--; this.cd = c.interval * this.m.fire; this.kickV += c.kick; P.recoil(c.recoil);
        this.flashT = 0.045; this.flash.rotation.z = Math.random() * 6.28; this.flash.scale.setScalar(0.7 + Math.random() * 0.5);
        G.playerHitscan(this.muzzle, P.aim > 0.5 ? c.ads : c.hip, c.dmg * this.m.gun);
        G.sound.gun(c.vol, 0);
        if (c.bolt) setTimeout(() => G.sound.click(1500), 380);
      }
    }
    const rl = this.state === 'reload' ? Math.sin(Math.min(1, this.t / c.reload) * Math.PI) : 0;
    const bolt = c.bolt && this.cd > 0 ? Math.sin(Math.min(1, (c.interval - this.cd) / 0.8) * Math.PI) * (1 - P.aim) : 0;
    const m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0;
    const g = this.gun;
    g.position.lerpVectors(this.hip, this.ads, P.aim);
    g.position.y -= rl * 0.16 + m * 0.4 + bolt * 0.03; g.position.x -= m * 0.2; g.position.z += this.kick * 0.035;
    g.rotation.set(this.kick * 0.22 + rl * 0.7 + P.swayY - m * 0.5, 0.04 * (1 - P.aim) + P.swayX + rl * 0.25, rl * -0.5 + P.swayX * 0.8 + m * 0.5 + bolt * 0.25);
  }
  /** Fighting knife on F, for the weapons that use the right button to aim. */
  addKnife(M) {
    const k = (this.melee = new THREE.Group()), X = Math.PI / 2;
    k.add(mesh([gBox(0.03, 0.035, 0.12, 0x2a1c12, [0, 0, 0]), gBox(0.07, 0.02, 0.02, 0x4a4a4e, [0, 0, -0.065]), fist([0, 0, 0.0], [X, 0, Math.PI], 1.05),
      ...this.arm(this.sleeve, [0.07, -0.13, 0.2], [1.1, 0, 0.3], 0.36)], M.flat));
    k.add(mesh([gBox(0.006, 0.034, 0.2, 0xd4d9df, [0, 0, -0.175])], M.metal));
    k.visible = false;
    this.meleeDur = 0.36; this.meleeAt = 0.38; this.meleeRange = 2.5; this.meleeCone = 0.6; this.meleeDmg = 90; this.meleeStyle = 'thrust';
  }

  // ---- thrown weapons: javelins (Greece) with a sword, axes (the North) with a flail ----
  build_javelin(M) { this.buildThrown(M, true); }
  build_axe(M) { this.buildThrown(M, false); }
  update_javelin(dt, input, active) { this.updateThrown(dt, input, active, true); }
  update_axe(dt, input, active) { this.updateThrown(dt, input, active, false); }

  buildThrown(M, jav) {
    this.thrown = true; this.canAim = true; this.aimFov = 60; this.cuff = this.cuffIn ?? (jav ? 0xb8893a : 0x4a3a2a);
    const g = (this.gun = new THREE.Group());
    this.base = jav ? [0.3, -0.15, -0.5, 0.05, 0.1] : [0.3, -0.24, -0.5, -0.35, 0.05];
    g.add(mesh(jav ? [fist([0, 0, 0], [Math.PI / 2, 0, Math.PI], 1.05), ...this.arm(this.sleeve, [0.06, -0.11, 0.2], [1.05, 0, 0.3], 0.34)]
      : [fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.2, 0.12], [0.5, 0, 0.2], 0.36)], M.flat));
    this.missile = new THREE.Group();
    if (jav) {
      this.missile.add(mesh([gCyl(0.011, 0.011, 1.5, 0x7a5430, [0, 0.012, -0.25], [Math.PI / 2, 0, 0], 1, 6), gBox(0.03, 0.03, 0.12, 0x3a2414, [0, 0.012, 0])], M.flat));
      this.missile.add(mesh([gCone(0.024, 0.2, 0xd4d9df, [0, 0.012, -1.1], [-Math.PI / 2, 0, 0], 1, 6)], M.metal));
    } else {
      this.missile.add(mesh([gCyl(0.014, 0.016, 0.5, 0x6a4a2a, [0, 0.12, 0], [0, 0, 0], 1, 6)], M.flat));
      this.missile.add(mesh([gBox(0.012, 0.17, 0.15, 0xd4d9df, [0, 0.32, -0.09]), gBox(0.03, 0.055, 0.06, 0x6a6f76, [0, 0.33, 0])], M.metal));
    }
    g.add(this.missile);
    this.root.add(g);
    // rim of the round shield on the left arm
    const sh = mesh(jav ? [gCyl(0.44, 0.44, 0.035, 0xb8893a, [0, 0, 0], [Math.PI / 2, 0, 0], 1, 22), gCyl(0.37, 0.37, 0.04, 0x9a6f2a, [0, 0, 0], [Math.PI / 2, 0, 0], 1, 22)]
      : [gCyl(0.44, 0.44, 0.035, 0x8a1c1c, [0, 0, 0], [Math.PI / 2, 0, 0], 1, 22), gBox(0.88, 0.1, 0.04, 0xe8e0d0, [0, 0, 0]), gBox(0.1, 0.88, 0.04, 0xe8e0d0, [0, 0, 0]),
        gCyl(0.09, 0.09, 0.07, 0x9a9fa6, [0, 0, 0], [Math.PI / 2, 0, 0], 1, 10), gCyl(0.445, 0.445, 0.03, 0x4a3a2a, [0, 0, 0.004], [Math.PI / 2, 0, 0], 1, 22)], M.flat);
    sh.scale.setScalar(0.72); sh.position.set(-0.62, -0.6, -0.7); sh.rotation.set(0.3, 0.7, 0.12); this.shield = sh; this.root.add(sh);
    if (!jav) return this.addFlail(M);
    // sword (right mouse button)
    const k = (this.melee = new THREE.Group()), len = 0.52;
    k.add(mesh([gBox(0.03, 0.17, 0.036, 0x3a2414, [0, 0, 0]), gBox(0.13, 0.03, 0.045, 0xc9a050, [0, 0.095, 0]), gSph(0.03, 0xc9a050, [0, -0.1, 0]),
      fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.06, -0.22, 0.14], [0.6, 0, 0.3], 0.4)], M.flat));
    k.add(mesh([gBox(0.008, len, 0.06, 0xdfe4ea, [0, 0.11 + len / 2, 0])], M.metal));
    k.visible = false;
    this.meleeDur = 0.4; this.meleeAt = 0.42; this.meleeRange = 3.0; this.meleeCone = 0.55; this.meleeDmg = 100; this.meleeStyle = 'cut';
  }
  /**
   * The flail of Jarnvik (right mouse button): a wooden haft and two spiked iron balls on chains. It is whirled once overhead and
   * then swept across: slower than a sword, but it strikes everyone in a wide arc in front, and harder.
   */
  addFlail(M) {
    const X = Math.PI / 2, IRON = 0x3c4046, DARK = 0x26282c, k = (this.melee = new THREE.Group());
    k.add(mesh([gCyl(0.02, 0.026, 0.52, 0x6a4426, [0, 0.14, 0], [0, 0, 0], 1, 8), gCyl(0.029, 0.029, 0.16, 0x3a2414, [0, -0.02, 0], [0, 0, 0], 1, 8),       // haft and leather grip
      ...[0.12, 0.2, 0.28].map((y) => gCyl(0.024, 0.024, 0.014, 0x3a2414, [0, y, 0], [0.35, 0, 0], 1, 8)), gCyl(0.034, 0.03, 0.07, 0x1c1a18, [0, 0.41, 0], [0, 0, 0], 1, 8),
      fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.06, -0.22, 0.14], [0.6, 0, 0.3], 0.4)], M.flat));
    const chain = (len) => {                                 // links alternately turned, then the ball with six spikes; it hangs along +y from the top of the haft
      const g = new THREE.Group(), parts = [], n = Math.round(len / 0.055), R = 0.068, by = len + R;
      for (let i = 0; i < n; i++) parts.push(gBox(i % 2 ? 0.007 : 0.026, 0.06, i % 2 ? 0.026 : 0.007, IRON, [0, 0.03 + i * (len / n), 0]));
      parts.push(gSph(R, DARK, [0, by, 0]));
      for (const [d, r] of [[[0, 1, 0], [0, 0, 0]], [[0, -1, 0], [Math.PI, 0, 0]], [[1, 0, 0], [0, 0, -X]], [[-1, 0, 0], [0, 0, X]], [[0, 0, 1], [X, 0, 0]], [[0, 0, -1], [-X, 0, 0]]])
        parts.push(gCone(0.024, 0.075, IRON, [d[0] * (R + 0.025), by + d[1] * (R + 0.025), d[2] * (R + 0.025)], r, 1, 6));
      g.add(mesh(parts, M.metal)); g.position.set(0, 0.44, 0); k.add(g); return g;
    };
    this.chainA = chain(0.4); this.chainB = chain(0.29);
    k.visible = false;
    this.meleeDur = 0.8; this.meleeAt = 0.6; this.meleeRange = 3.4; this.meleeCone = 0.2; this.meleeDmg = 150; this.meleeStyle = 'flail';
  }
  /** Where the flail is at fraction k of its swing: whirl overhead, sweep from right to left, let it drop. */
  swingFlail(k) {
    const M = this.melee, A = this.chainA, B = this.chainB;
    if (k < 0.42) {                                          // the wind-up: the haft comes up on the right, tilted forward, and the balls go round once in view
      const w = k / 0.42, e = ease(w), s = w * Math.PI * 2.4;
      M.position.set(0.4, lerp(-0.5, -0.2, e), -0.6); M.rotation.set(-0.85, 0, -0.3);
      A.rotation.set(0, s, 1.2); B.rotation.set(0, s + 2.2, 1.0);
    } else {                                                 // the blow: the hand travels from right to left, the balls dragging behind the haft, then it drops
      const e = ease(clamp((k - 0.42) / 0.36, 0, 1)), drop = clamp((k - 0.8) / 0.2, 0, 1), lag = Math.sin(e * Math.PI);
      M.position.set(lerp(0.4, -0.3, e), lerp(-0.2, -0.3, e) - drop * 0.4, -0.6 - lag * 0.08); M.rotation.set(lerp(-0.85, -1.05, e), 0, lerp(-0.3, 0.75, e));
      A.rotation.set(0.15, 0, -0.9 * lag + 0.35 * drop); B.rotation.set(-0.3, 0, -1.2 * lag + 0.6 * drop);
    }
  }
  updateThrown(dt, input, active, jav) {
    const P = this.p, G = this.game, b = this.base, sh = this.shot || (jav ? [50, 85, 6] : [36, 80, 7]), pace = this.pace || 1;
    if (this.state === 'ready') { if (active && input.shoot && this.meleeT <= 0 && this.stocked) { this.state = 'wind'; this.t = 0; } }
    else if (this.state === 'wind') {
      this.t += dt / this.m.fire / pace;
      if (this.t >= 0.16) {
        this.state = 'recover'; this.t = 0; this.kickV += 5; P.recoil(0.2); this.spend();
        G.playerShoot(this.kind, sh[0] * (1 + (this.m.power - 1) * 0.7), sh[1] * this.m.power, sh[2]);
        G.sound.whiz();
      }
    } else { this.t += dt / this.m.fire / pace; if (this.t >= 0.55) this.state = 'ready'; }
    const wind = this.state === 'wind' ? ease(Math.min(1, this.t / 0.16)) : 0;
    const rec = this.state === 'recover' ? this.t / 0.55 : 1;
    this.missile.visible = this.state !== 'recover' || rec > 0.45;
    const rise = this.state === 'recover' ? 1 - ease(clamp((rec - 0.45) / 0.55, 0, 1)) : 0;      // next missile comes up from below
    const fwd = this.state === 'recover' && rec < 0.3 ? Math.sin((rec / 0.3) * Math.PI) : 0;       // follow-through of the throw
    const m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0;
    const g = this.gun;
    g.position.set(b[0] - m * 0.2, b[1] - rise * 0.4 - m * 0.4 + wind * 0.05, b[2] + wind * 0.24 - fwd * 0.3 + this.kick * 0.02);
    g.rotation.set(b[3] + P.swayY - wind * (jav ? 0.12 : 0.7) + fwd * (jav ? 0.2 : 1.0) - m * 0.4, b[4] + P.swayX, P.swayX * 0.8);
    this.shield.position.set(-0.62 - P.swayX * 0.6, -0.6 - P.swayY * 0.4 - fwd * 0.03, -0.7);
  }

  // ---- chapter IX: poisoned darts from a dart-thrower, or stones hurled by hand; each with the obsidian-edged club ----
  build_dart(M) { this.buildMexica(M, true); }
  build_stone(M) { this.buildMexica(M, false); }
  update_dart(dt, input, active) { this.updateThrown(dt, input, active, true); }
  update_stone(dt, input, active) { this.updateThrown(dt, input, active, false); }
  buildMexica(M, dart) {
    this.thrown = true; this.canAim = true; this.aimFov = 60; this.cuff = this.cuffIn ?? 0xd9a820;
    this.shot = dart ? [64, 45, 5] : [30, 120, 13];          // speed, damage, drop: a dart is fast and light (the poison does the rest), a stone slow and heavy
    this.pace = dart ? 0.85 : 1.5;
    const g = (this.gun = new THREE.Group()), X = Math.PI / 2;
    this.base = dart ? [0.3, -0.15, -0.5, 0.05, 0.1] : [0.3, -0.24, -0.5, -0.35, 0.05];
    g.add(mesh(dart ? [fist([0, 0, 0], [X, 0, Math.PI], 1.05), ...this.arm(this.sleeve, [0.06, -0.11, 0.2], [1.05, 0, 0.3], 0.34)]
      : [fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.2, 0.12], [0.5, 0, 0.2], 0.36)], M.flat));
    this.missile = new THREE.Group();
    if (dart) {
      g.add(mesh([gBox(0.036, 0.02, 0.56, 0x6a4a2a, [0, -0.002, 0.1]), gBox(0.05, 0.05, 0.04, 0xd9a820, [0, 0.012, 0.37]), gBox(0.05, 0.022, 0.05, 0x2ac8c0, [0, 0.0, -0.12])], M.flat));   // the thrower: a carved board with a hook
      this.missile.add(mesh([gCyl(0.008, 0.008, 1.3, 0x8a6a3a, [0, 0.03, -0.3], [X, 0, 0], 1, 5), gCone(0.02, 0.11, 0x15161a, [0, 0.03, -1.0], [-X, 0, 0], 1, 5), gSph(0.02, 0x4ad84a, [0, 0.03, -0.93]),
        gBox(0.07, 0.004, 0.16, 0x1f9a5a, [0, 0.03, 0.3]), gBox(0.004, 0.07, 0.16, 0x2ac8c0, [0, 0.03, 0.3])], M.flat));                                                                      // the dart; the green on its point is the poison
    } else this.missile.add(mesh([xf(new THREE.IcosahedronGeometry(0.11, 0), [0, 0.13, 0], [0.4, 0.2, 0], [1, 0.8, 1.1], 0x8a8478)], M.flat));
    g.add(this.missile); this.root.add(g);
    const c1 = dart ? 0x2ac8c0 : 0xb01c1c, c2 = dart ? 0x1f9a5a : 0xe8d8a0;                       // the round shield on the left arm, faced with feathers
    const sh = mesh([gCyl(0.44, 0.44, 0.035, c1, [0, 0, 0], [X, 0, 0], 1, 22), gCyl(0.31, 0.31, 0.04, 0xd9a820, [0, 0, 0], [X, 0, 0], 1, 18), gCyl(0.2, 0.2, 0.045, c2, [0, 0, 0], [X, 0, 0], 1, 14),
      ...[-2, -1, 0, 1, 2].map((i) => gBox(0.05, 0.3, 0.012, i % 2 ? c2 : 0xd9a820, [i * 0.11, -0.52, 0], [0, 0, i * 0.08]))], M.flat);
    sh.scale.setScalar(0.72); sh.position.set(-0.62, -0.6, -0.7); sh.rotation.set(0.3, 0.7, 0.12); this.shield = sh; this.root.add(sh);
    this.addMacuahuitl(M);
  }
  /** The club of the Mexica (right mouse button): a wooden blade set with obsidian along both edges. */
  addMacuahuitl(M) {
    const k = (this.melee = new THREE.Group()), parts = [gBox(0.036, 0.2, 0.04, 0x3a2414, [0, 0, 0]), gBox(0.04, 0.74, 0.09, 0x6a4a2a, [0, 0.47, 0]), fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.06, -0.22, 0.14], [0.6, 0, 0.3], 0.4)];
    for (let i = 0; i < 6; i++) for (const e of [-1, 1]) parts.push(gBox(0.014, 0.1, 0.05, 0x101014, [0, 0.16 + i * 0.118, e * 0.062]));
    k.add(mesh(parts, M.flat)); k.visible = false;
    this.meleeDur = 0.45; this.meleeAt = 0.42; this.meleeRange = 3.1; this.meleeCone = 0.5; this.meleeDmg = 115; this.meleeStyle = 'cut';
  }

  // ---- blades in hand: knife, sword, sabre, halberd. Left button strikes (right button too); silent ----
  build_knife(M) { this.addKnife(M); this.meleeDmg = 70; this.meleeRange = 2.4; this.handMelee([0.3, -0.3, -0.32, 0.05, 0.15, 0.3]); }
  build_sword(M) { this.addSword(M); this.handMelee([0.42, -0.36, -0.55, -0.35, 0, -0.45]); }
  build_sabre(M) { this.addSabre(M); this.handMelee([0.42, -0.36, -0.55, -0.4, 0, -0.5]); }
  build_halberd(M) { this.addHalberd(M); this.meleeDmg = 120; this.handMelee([0.3, -0.32, 0.1, 0.12, 0.2, 0.4]); }
  update_knife() {} update_sword() {} update_sabre() {} update_halberd() {}
  handMelee(rest) { this.meleePrimary = true; this.canAim = false; this.aimFov = 72; this.rest = rest; this.melee.visible = true; this.cuff = this.cuffIn ?? 0x4a3020; }
  /** A straight sword: the xiphos of Ithaca, the long blade of the Norse. */
  addSword(M) {
    const k = (this.melee = new THREE.Group()), len = 0.58;
    k.add(mesh([gBox(0.03, 0.17, 0.036, 0x3a2414, [0, 0, 0]), gBox(0.15, 0.03, 0.045, 0xc9a050, [0, 0.095, 0]), gSph(0.03, 0xc9a050, [0, -0.1, 0]),
      fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.06, -0.22, 0.14], [0.6, 0, 0.3], 0.4)], M.flat));
    k.add(mesh([gBox(0.008, len, 0.06, 0xdfe4ea, [0, 0.11 + len / 2, 0])], M.metal));
    k.visible = false;
    this.meleeDur = 0.4; this.meleeAt = 0.42; this.meleeRange = 3.0; this.meleeCone = 0.55; this.meleeDmg = 100; this.meleeStyle = 'cut';
  }
  /** A curved cavalry sabre with a brass hand guard. */
  addSabre(M) {
    const k = (this.melee = new THREE.Group()), blade = [];
    k.add(mesh([gBox(0.03, 0.16, 0.034, 0x2a1c12, [0, 0, 0]), fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.06, -0.22, 0.14], [0.6, 0, 0.3], 0.4)], M.flat));
    for (let i = 0; i < 8; i++) { const a = i * 0.045; blade.push(gBox(0.007, 0.09, 0.05, 0xdfe4ea, [0, 0.14 + i * 0.085, -Math.pow(i, 1.6) * 0.006], [a, 0, 0])); }
    blade.push(gBox(0.1, 0.025, 0.05, 0xc9a050, [0, 0.09, 0.01]), xfTorus(0.06, 0.006, [0, 0.03, 0.05]));
    k.add(mesh(blade, M.metal)); k.visible = false;
    this.meleeDur = 0.36; this.meleeAt = 0.42; this.meleeRange = 2.9; this.meleeCone = 0.45; this.meleeDmg = 95; this.meleeStyle = 'cut';
  }
  /** The halberd of the Waldstätten: a long thrust. */
  addHalberd(M) {
    const h = (this.melee = new THREE.Group());
    h.add(mesh([gCyl(0.017, 0.017, 2.0, 0x5a3a1e, [0, 0, -0.3], [Math.PI / 2, 0, 0], 1, 6),
      fist([0, -0.012, 0.25], [Math.PI / 2, 0, Math.PI], 1.1), fist([0, -0.012, -0.2], [Math.PI / 2, 0, Math.PI], 1.1, -1),
      ...this.arm(this.sleeve, [0.08, -0.14, 0.42], [1.1, 0, 0.3], 0.38), ...this.arm(this.sleeve, [-0.12, -0.14, 0.0], [1.0, 0, -0.5], 0.38)], M.flat));
    h.add(mesh([gBox(0.01, 0.3, 0.26, 0xd4d9df, [0, -0.13, -1.12]), gCone(0.028, 0.42, 0xd4d9df, [0, 0, -1.5], [-Math.PI / 2, 0, 0], 1, 6),
      gBox(0.01, 0.1, 0.1, 0xd4d9df, [0, 0.07, -1.14], [0.6, 0, 0]), gBox(0.03, 0.03, 0.3, 0x8a8f96, [0, 0, -1.15])], M.metal));
    h.visible = false;
    this.meleeDur = 0.55; this.meleeAt = 0.38; this.meleeRange = 3.7; this.meleeCone = 0.72; this.meleeDmg = 95; this.meleeStyle = 'thrust';
  }

  // ---- the sling: whirled once overhead, a stone flies; aimed with the right button, like everything thrown ----
  build_sling(M) {
    this.thrown = true; this.canAim = true; this.aimFov = 60; this.cuff = this.cuffIn ?? 0x6a5a40;
    const g = (this.gun = new THREE.Group());
    g.add(mesh([fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.2, 0.12], [0.5, 0, 0.2], 0.36)], M.flat));
    const cord = (this.cord = new THREE.Group());                // the two cords and the pouch with its stone, hanging from the hand
    cord.add(mesh([gCyl(0.004, 0.004, 0.42, 0x9a8460, [0.012, -0.2, 0], [0, 0, 0.06], 1, 4), gCyl(0.004, 0.004, 0.42, 0x9a8460, [-0.012, -0.2, 0], [0, 0, -0.06], 1, 4),
      gSph(0.035, 0x6a5038, [0, -0.42, 0], [1.3, 0.6, 1.1])], M.flat));
    this.missile = mesh([xf(new THREE.IcosahedronGeometry(0.03, 0), [0, -0.42, 0], [0, 0, 0], 1, 0x9a948a)], M.flat); cord.add(this.missile);
    g.add(cord); this.base = [0.3, -0.18, -0.55];
    this.root.add(g);
    if (this.game.def && this.game.def.knife) this.addKnife(M);
  }
  update_sling(dt, input, active) {
    const P = this.p, G = this.game, b = this.base;
    if (this.state === 'ready') { if (active && input.shoot && this.meleeT <= 0 && this.stocked) { this.state = 'wind'; this.t = 0; } }
    else if (this.state === 'wind') {
      this.t += dt / this.m.fire;
      if (this.t >= 0.42) { this.state = 'recover'; this.t = 0; this.kickV += 3; P.recoil(0.1); this.spend(); const L = this.launch(); G.playerShoot(L.kind, L.speed, 55 * this.m.power, L.grav); G.sound.sling(); }
    } else { this.t += dt / this.m.fire; if (this.t >= 0.45) this.state = 'ready'; }
    const whirl = this.state === 'wind' ? this.t / 0.42 : 0, g = this.gun, c = this.cord;
    c.rotation.set(this.state === 'wind' ? whirl * Math.PI * 4 : Math.sin(G.time * 1.7) * 0.1, 0, 0);       // round and round overhead, then it lets go
    this.missile.visible = this.state !== 'recover';
    g.position.set(b[0], b[1] + (this.state === 'wind' ? 0.12 : 0), b[2]); g.rotation.set(P.swayY + (this.state === 'wind' ? -0.4 : 0), P.swayX, P.swayX * 0.8);
  }

  // ---- the blowgun: a long cane held to the mouth; with the right button it is brought up to the eye and the view narrows (a sniper's
  // weapon, and a silent one). Its darts are poisoned. ----
  build_blowgun(M) {
    this.canAim = true; this.aimFov = 24; this.cuff = this.cuffIn ?? 0x4a3a2a;
    this.hip = new THREE.Vector3(0.12, -0.16, -0.42); this.ads = new THREE.Vector3(0, -0.055, -0.3);
    const g = (this.gun = new THREE.Group()), X = Math.PI / 2;
    g.add(mesh([gCyl(0.016, 0.019, 1.5, 0x6a7a3a, [0, 0, -0.62], [X, 0, 0], 1, 8), gCyl(0.022, 0.022, 0.05, 0x3a2a1a, [0, 0, 0.1], [X, 0, 0], 1, 8),
      ...[-0.2, -0.55, -0.9, -1.2].map((z) => gCyl(0.02, 0.02, 0.02, 0x4a5a2a, [0, 0, z], [X, 0, 0], 1, 8)),
      fist([0, -0.02, -0.06], [-0.2, 0, 0], 1.0), ...this.arm(this.sleeve, [0.03, -0.12, 0.17], [1.2, 0, 0.1], 0.3),
      fist([-0.02, -0.02, -0.42], [-0.2, 0, 0], 1.0, -1), ...this.arm(this.sleeve, [-0.1, -0.14, -0.2], [1.1, 0, -0.5], 0.36)], M.flat));
    this.muzzle.position.set(0, 0, -1.4); g.add(this.muzzle);
    this.root.add(g); this.ready = 1;
  }
  update_blowgun(dt, input, active) {
    const P = this.p, G = this.game;
    if (this.state === 'reload') { this.t += dt / this.m.reload; if (this.t >= 0.9) this.state = 'ready'; }
    else if (active && input.shoot && this.meleeT <= 0 && this.stocked && this.cd <= 0) {
      this.state = 'reload'; this.t = 0; this.cd = 0.2; this.spend(); this.kickV += 1.5;
      const L = this.launch(); G.playerShoot(L.kind, L.speed, 40 * this.m.power, L.grav, 0, 0, P.aim > 0.5 ? 0 : 0.01);
      G.sound.blow();
    }
    const g = this.gun, rl = this.state === 'reload' ? Math.sin(Math.min(1, this.t / 0.9) * Math.PI) : 0;
    g.position.lerpVectors(this.hip, this.ads, P.aim); g.position.y -= rl * 0.05; g.position.z += this.kick * 0.03;
    g.rotation.set(P.swayY + this.kick * 0.1 - rl * 0.1, P.swayX, P.swayX * 0.6);
  }

  // ---- bare fists: always in the arsenal; they need no ammunition, break things and can fell an enemy ----
  build_fists(M) {
    this.canAim = false; this.aimFov = 72; this.cuff = this.cuffIn ?? 0x4a3020; this.side = 1;
    const X = Math.PI / 2;
    this.fR = new THREE.Group(); this.fR.add(mesh([fist([0, 0, 0], [-0.3, 0, -0.15], 1.25), ...this.arm(this.sleeve, [0.02, -0.1, 0.19], [1.15, 0, 0.12], 0.34)], M.flat));    // knuckles forward, as in a boxer's guard
    this.fL = new THREE.Group(); this.fL.add(mesh([fist([0, 0, 0], [-0.3, 0, 0.15], 1.25, -1), ...this.arm(this.sleeve, [-0.02, -0.1, 0.19], [1.15, 0, -0.12], 0.34)], M.flat));
    void X;
    this.root.add(this.fR, this.fL); this.gun = this.fR;
  }
  update_fists(dt, input, active) {
    const P = this.p, G = this.game;
    if (this.state === 'ready') {
      if (active && (input.shoot || input.melee)) {
        this.state = input.shoot ? 'jab' : 'hook'; this.t = 0; this.hit = false; this.meleeT = 0.0001;
        if (this.state === 'jab') this.side = -this.side; else this.side = 1;
        G.sound.punch(false);
      }
    } else {
      const jab = this.state === 'jab', dur = jab ? 0.34 : 0.6, at = jab ? 0.11 : 0.27;
      this.t += dt / this.m.melee; this.meleeT = this.t;
      if (!this.hit && this.t >= at) { this.hit = true; G.playerMelee(2.1 + this.m.reach, jab ? 0.62 : 0.45, (jab ? 28 : 55) * this.m.meleeDmg, true); }
      if (this.t >= dur) { this.state = 'ready'; this.meleeT = 0; }
    }
    // the guard: both fists up; a jab drives one straight out, a hook swings the right one across
    const k = this.state === 'ready' ? 0 : this.t / (this.state === 'jab' ? 0.34 : 0.6);
    const out = this.state === 'jab' ? (k < 0.35 ? ease(k / 0.35) : 1 - ease((k - 0.35) / 0.65)) : 0;
    const back = this.state === 'hook' ? (k < 0.4 ? ease(k / 0.4) : 0) : 0, sweep = this.state === 'hook' && k >= 0.4 ? Math.sin(Math.min(1, (k - 0.4) / 0.45) * Math.PI) : 0;
    const bob = Math.sin(G.time * 2.2) * 0.008;
    const R = this.side > 0 ? out : 0, L = this.side < 0 ? out : 0;
    this.fR.position.set(0.22 - R * 0.17 + back * 0.12 - sweep * 0.35 + P.swayX * 0.5, -0.24 + R * 0.12 + bob + sweep * 0.06, -0.48 - R * 0.42 + back * 0.12 - sweep * 0.25);
    this.fR.rotation.set(P.swayY - R * 0.2, back * 0.6 - sweep * 0.9, -sweep * 0.5 + P.swayX);
    this.fL.position.set(-0.24 + L * 0.17 + P.swayX * 0.5, -0.25 + L * 0.12 - bob, -0.5 - L * 0.42);
    this.fL.rotation.set(P.swayY - L * 0.2, 0, P.swayX);
  }

  // ---- things from the bag: something that heals (fire to drink or eat it), and bombs (fire to throw) ----
  build_heal(M) {
    this.canAim = false; this.aimFov = 72; this.cuff = this.cuffIn ?? 0x4a3020;
    const g = (this.gun = new THREE.Group());
    g.add(mesh([fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.2, 0.12], [0.5, 0, 0.2], 0.36)], M.flat));
    const L = this.game.level, thing = L && L.makePickup ? L.makePickup() : new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xb8742a }));
    thing.geometry = thing.geometry.clone(); thing.geometry.computeBoundingBox();
    const bb = thing.geometry.boundingBox, size = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 0.3, k = 0.2 / size;
    thing.scale.setScalar(k); thing.position.set(-(bb.max.x + bb.min.x) / 2 * k, 0.02 - bb.min.y * k, -(bb.max.z + bb.min.z) / 2 * k);
    g.add(thing); this.base = [0.26, -0.27, -0.5];
    this.root.add(g);
  }
  update_heal(dt, input, active) {
    const P = this.p, g = this.gun, b = this.base;
    this.warnT = Math.max(0, (this.warnT || 0) - dt);
    if (this.state === 'ready') {
      if (active && input.shoot && this.meleeT <= 0 && this.slot.count > 0) {
        if (P.hp < P.maxHp) { this.state = 'use'; this.t = 0; this.used = false; } else if (!this.warnT) { this.warnT = 1.2; this.game.say('You are not hurt'); }
      }
    } else if (this.state === 'use') {
      this.t += dt;
      if (!this.used && this.t >= 0.45) { this.used = true; P.heal(this.slot); }
      if (this.t >= 0.9) this.state = 'ready';
    }
    const lift = this.state === 'use' ? Math.sin(Math.min(1, this.t / 0.9) * Math.PI) : 0, m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0;
    g.visible = this.slot.count > 0 || this.state === 'use';
    g.position.set(b[0] - lift * 0.24 - m * 0.2, b[1] + lift * 0.17 - m * 0.4, b[2] + lift * 0.22);
    g.rotation.set(P.swayY - lift * 0.9, P.swayX + lift * 0.3, P.swayX * 0.8 + lift * 0.4);
  }
  build_boulder(M) { this.buildBomb(M); }
  build_molotov(M) { this.buildBomb(M); }
  update_boulder(dt, input, active) { this.updateBomb(dt, input, active); }
  update_molotov(dt, input, active) { this.updateBomb(dt, input, active); }
  build_dynamite(M) { this.buildBomb(M); }
  build_grenade(M) { this.buildBomb(M); }
  build_hbomb(M) { this.buildBomb(M); }
  update_dynamite(dt, input, active) { this.updateBomb(dt, input, active); }
  update_grenade(dt, input, active) { this.updateBomb(dt, input, active); }
  update_hbomb(dt, input, active) { this.updateBomb(dt, input, active); }
  buildBomb(M) {
    this.canAim = true; this.aimFov = 60; this.cuff = this.cuffIn ?? 0x4a3020; this.thrown = true;
    const g = (this.gun = new THREE.Group()), X = Math.PI / 2;
    g.add(mesh([fist([0, 0, 0], [0, 0, 0], 1.05), ...this.arm(this.sleeve, [0.04, -0.2, 0.12], [0.5, 0, 0.2], 0.36)], M.flat));
    this.missile = new THREE.Group();
    if (this.kind === 'dynamite') this.missile.add(mesh([0, 1, 2].map((i) => gCyl(0.019, 0.019, 0.2, 0xb02a1c, [(i - 1) * 0.036, 0.1, 0], [0, 0, 0], 1, 8)).concat([gCyl(0.003, 0.003, 0.08, 0xd8c8a0, [0, 0.23, 0], [0.4, 0, 0], 1, 4), gBox(0.11, 0.025, 0.045, 0xd8c8a0, [0, 0.1, 0])]), M.flat));
    else if (this.kind === 'grenade') this.missile.add(mesh([gCyl(0.017, 0.017, 0.24, 0x6a4a2a, [0, 0.06, 0], [0, 0, 0], 1, 8), gCyl(0.04, 0.04, 0.09, 0x4a5236, [0, 0.21, 0], [0, 0, 0], 1, 10), gCyl(0.036, 0.036, 0.012, 0x2a2e22, [0, 0.257, 0], [0, 0, 0], 1, 10)], M.flat));
    else if (this.kind === 'boulder') this.missile.add(mesh([xf(new THREE.IcosahedronGeometry(0.16, 0), [0, 0.16, 0], [0.4, 0.2, 0], [1, 0.85, 1.1], 0x8a8478)], M.flat));
    else if (this.kind === 'molotov') this.missile.add(mesh([gCyl(0.035, 0.04, 0.18, 0x3a6a3a, [0, 0.1, 0], [0, 0, 0], 1, 10), gCyl(0.014, 0.022, 0.07, 0x3a6a3a, [0, 0.22, 0], [0, 0, 0], 1, 8),
      gBox(0.03, 0.07, 0.02, 0xe8dcc0, [0, 0.28, 0], [0, 0, 0.3]), gSph(0.02, 0xffa030, [0, 0.31, 0])], M.flat));
    else this.missile.add(mesh([gSph(0.075, 0x1c1a18, [0, 0.09, 0]), gCyl(0.004, 0.004, 0.07, 0xd8c8a0, [0, 0.19, 0], [0.3, 0, 0], 1, 4), gCyl(0.03, 0.03, 0.03, 0x5a3a22, [0, 0.165, 0], [0, 0, X * 0], 1, 8)], M.flat));
    g.add(this.missile); this.base = [0.3, -0.24, -0.5, -0.35, 0.05];
    this.root.add(g);
  }
  updateBomb(dt, input, active) {
    const P = this.p, G = this.game, b = this.base, sl = this.slot;
    if (this.state === 'ready') { if (active && input.shoot && this.meleeT <= 0 && sl.count > 0) { this.state = 'wind'; this.t = 0; if (this.kind !== 'boulder') G.sound.fuse(); } }
    else if (this.state === 'wind') {
      this.t += dt;
      if (this.t >= 0.3) {
        this.state = 'recover'; this.t = 0; this.kickV += 4; P.recoil(0.15); sl.count--; G.cache.arms = null;
        const L = this.launch(); G.playerShoot(this.kind, L.speed, L.dmg || 0, L.grav, 0, L.lift);
        G.sound.whiz();
      }
    } else { this.t += dt; if (this.t >= 0.6) this.state = 'ready'; }
    const wind = this.state === 'wind' ? ease(Math.min(1, this.t / 0.3)) : 0, rec = this.state === 'recover' ? this.t / 0.6 : 1;
    this.missile.visible = sl.count > 0 && (this.state !== 'recover' || rec > 0.5);
    const rise = this.state === 'recover' ? 1 - ease(clamp((rec - 0.5) / 0.5, 0, 1)) : 0, fwd = this.state === 'recover' && rec < 0.35 ? Math.sin((rec / 0.35) * Math.PI) : 0;
    const m = this.meleeT > 0 ? Math.sin(Math.min(1, this.meleeT / this.meleeDur) * Math.PI) : 0, g = this.gun;
    g.position.set(b[0] - m * 0.2, b[1] - rise * 0.4 - m * 0.4 + wind * 0.12, b[2] + wind * 0.3 - fwd * 0.3);
    g.rotation.set(b[3] + P.swayY - wind * 0.9 + fwd * 1.0 - m * 0.4, b[4] + P.swayX, P.swayX * 0.8);
  }

  // ---- shared -----------------------------------------------------------------
  update(dt, input, active) {
    const G = this.game;
    this.cd = Math.max(0, this.cd - dt);
    this.kickV += (-this.kick * 160 - this.kickV * 16) * dt; this.kick += this.kickV * dt;
    // melee: bow -> katana on right mouse; crossbow -> halberd on F (right mouse aims)
    if (this.melee) {
      const want = active && (input.pressed.has('KeyF') || input.pressed.has('KeyV') || (!this.canAim && input.melee) || (this.meleePrimary && input.shoot));
      if (want && this.meleeT <= 0 && this.state !== 'draw') { this.meleeT = 0.0001; this.meleeHit = false; G.sound.slash(); }
      if (this.meleeT > 0) {
        this.meleeT += dt / this.m.melee * (this.p.skillOn('fury') ? 1.6 : 1);
        const k = this.meleeT / this.meleeDur, M = this.melee;
        M.visible = true;
        if (!this.meleeHit && k >= this.meleeAt) { this.meleeHit = true; G.playerMelee(this.meleeRange + this.m.reach, this.meleeCone, this.meleeDmg * this.m.meleeDmg); }
        if (this.meleeStyle === 'flail') this.swingFlail(Math.min(1, k));
        else if (this.meleeStyle !== 'thrust') {    // diagonal cut, upper right to lower left
          const e = ease(clamp(k * 1.5, 0, 1));
          M.position.set(lerp(0.5, -0.4, e), lerp(0.2, -0.42, e), -0.55);
          M.rotation.set(lerp(-0.5, -1.35, e), 0, lerp(-1.0, 1.9, e));
        } else {                               // forward thrust, then pull back
          const e = k < 0.38 ? ease(k / 0.38) : 1 - ease((k - 0.38) / 0.62);
          M.position.set(lerp(0.3, 0.1, e), lerp(-0.34, -0.14, e), lerp(0.25, -0.7, e));
          M.rotation.set(lerp(0.12, 0.02, e), lerp(0.25, 0.05, e), 0.4);
        }
        if (k >= 1) { this.meleeT = 0; M.visible = !!this.meleePrimary; }
      }
      if (this.meleePrimary && this.meleeT <= 0) {                // the blade in hand, at rest: held up and ready
        const M = this.melee, P = this.p, b = this.rest;
        M.visible = true; M.position.set(b[0] + P.swayX * 0.6, b[1] - P.swayY * 0.4 + Math.sin(G.time * 2.1) * 0.006, b[2]); M.rotation.set(b[3] + P.swayY, b[4] + P.swayX, b[5]);
      }
    }
    this['update_' + this.kind](dt, input, active);
    if (this.flashT > 0) { this.flashT -= dt; this.flash.visible = true; } else this.flash.visible = false;
  }

  hud() {
    if (this.kind === 'fists' || this.meleePrimary) return { ammo: 0, mag: 0, reloading: false };
    if (this.kind === 'blowgun' || this.kind === 'sling') return { ammo: this.state === 'ready' && this.stocked ? 1 : 0, mag: 1, reloading: false };
    if (this.slot) return { ammo: Math.min(12, this.slot.count), mag: Math.min(12, this.slot.count), reloading: false, item: true };
    if (this.kind === 'revolver') return { ammo: this.ammo, mag: this.mag, reloading: this.state === 'reload' };
    if (this.kind === 'bow') return { ammo: this.state === 'nock' ? 0 : 1, mag: 1, reloading: false };
    if (this.thrown) return { ammo: this.state === 'ready' ? 1 : 0, mag: 1, reloading: false };
    if (this.gunCfg) return { ammo: this.ammo, mag: this.mag, reloading: this.state === 'reload' };
    return { ammo: this.state === 'ready' ? 1 : 0, mag: 1, reloading: this.state === 'reload' };
  }
}

function xfTorus(R, r, p) {
  const g = new THREE.TorusGeometry(R, r, 5, 12).toNonIndexed();
  g.translate(p[0], p[1], p[2]);
  const n = g.attributes.position.count, col = new Float32Array(n * 3).fill(0.25);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

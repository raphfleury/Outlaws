// Game shell: loads levels, runs the main loop, owns the rules (damage,
// winning, dying) and drives the HUD and menu screens.
import '@fontsource/rye';
import '@fontsource/pirata-one';
import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/cinzel';
import * as THREE from 'three';
import * as K from './props.js';
import { Gfx } from './gfx.js';
import { Sound } from './audio.js';
import { makeMaterials } from './tex.js';
import { World, Builder, Nav, merge } from './build.js';
import { Player, Input } from './player.js';
import { Enemy, Shots, makeHumanoid, lookFor, TYPES, dropMesh, wound, gBox, RETURNS } from './actors.js';
import { Crowd } from './crowd.js';
import { Arc } from './arc.js';
import { Life } from './life.js';
import { Havoc } from './havoc.js';
import { MapView } from './map.js';
import { Voice } from './voice.js';
import { dropsOf, lootOf, weaponName, weaponAlt, itemName, itemAlt, THROWN, NOISE } from './loot.js';
import { SKILLS, skillOf } from './skills.js';
import { resize } from './outskirts.js';
import { Voices } from './voices.js';
import { rng, clamp, damp } from './util.js';
import { west } from './levels/west.js';
import { japan } from './levels/japan.js';
import { swiss } from './levels/swiss.js';
import { greece } from './levels/greece.js';
import { north } from './levels/north.js';
import { war } from './levels/war.js';
import { russia } from './levels/russia.js';
import { Duel, bindDuelUI, RULES } from './duel.js';
import { VILLAINS } from './villains.js';
import { tibet } from './levels/tibet.js';
import { aztec } from './levels/aztec.js';

const LEVELS = [west, japan, swiss, greece, north, war, russia, tibet, aztec];
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const $ = (s) => document.querySelector(s);
const MAX_FOES = 30;
/**
 * A chapter never fields more than 30 enemies. Where a level lists more (or the player asks for fewer), the surplus is taken away one at a
 * time: never the boss, a kind of which only two are left as late as possible (variety comes first), and otherwise the one who stands closest
 * to a comrade, of the commonest kind, and is not posted on a perch. So crowds are thinned and the lone guards of far places stay.
 */
/** Shuffle a list in place with a seeded random function (Fisher-Yates). */
function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function capFoes(list, max = MAX_FOES) {
  const keep = list.slice();
  let floor = 2;                                            // how many of a kind are left alone; it gives way only when nothing else can go
  while (keep.length > max) {
    const count = {}; for (const [t] of keep) count[t] = (count[t] || 0) + 1;
    let best = -1, low = Infinity;
    keep.forEach(([t, x, z, o], i) => {
      if (TYPES[t].boss || count[t] <= floor) return;
      let near = Infinity; keep.forEach(([, x2, z2], j) => { if (j !== i) near = Math.min(near, Math.hypot(x - x2, z - z2)); });
      const score = near - count[t] * 1.5 + (o && o.static ? 6 : 0);
      if (score < low) { low = score; best = i; }
    });
    if (best < 0) { if (floor-- > 0) continue; break; }
    keep.splice(best, 1);
  }
  return keep;
}
const params = new URLSearchParams(location.search);
const GFX_KEY = 'lonehand-graphics', GFX_NAMES = { auto: 'Automatic', high: 'High', medium: 'Medium', low: 'Low' }, GFX_ORDER = ['high', 'medium', 'low'];

/** How far the enemies hear, by their wits: dull ones not at all (they fight back only when they see), clever ones from much further. */
const HEAR = { low: 0, medium: 1, genius: 1.8 };
/** The sizes of map: how much of the chapter's ground is used (medium: as it was made). */
const SIZES = { small: 1, medium: 1, large: 1 };

class Game {
  constructor() {
    this.canvas = $('#view');
    this.gfx = new Gfx(this.canvas);
    this.sound = new Sound(); this.voices = new Voices(this);
    this.input = new Input(this.canvas);
    this.input.free = params.has('free'); this.peace = params.has('peace');
    this.M = makeMaterials();
    for (const k in this.M) this.M[k].userData.keep = true;
    this.world = new World();
    this.player = new Player(this);
    this.shots = new Shots(this);
    this.enemies = []; this.pickups = []; this.rand = rng(1); this.heroPick = {}; this.heroIndex = 0; this.practice = false; this.typed = '';
    this.foeWant = params.has('foes') ? +params.get('foes') || 0 : params.has('check') ? 0 : 15;   // how many enemies a chapter holds: 15 unless chosen otherwise on the hero screen; 0 = all of them
    { let w = params.get('gfx'); if (!w) try { w = localStorage.getItem(GFX_KEY); } catch (e) { /* no storage: the default */ } this.gfxWant = GFX_NAMES[w] ? w : 'auto'; }
    // the enemies' wits and the size of the map, as chosen on the hero screen (kept for the next visit)
    { const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const w = params.get('wits') || get('outlaws.wits'), z = params.get('size') || get('outlaws.size');
      this.wits = HEAR[w] !== undefined ? w : 'medium'; this.mapSize = SIZES[z] ? z : 'medium'; }
    this.gfx.setQuality(this.gfxWant === 'auto' ? 'high' : this.gfxWant);
    this.time = 0; this.noise = 0; this.state = 'boot'; this.index = 0; this.timeScale = 1; this.slow = 0;
    this.flashLight = new THREE.PointLight(0xffb060, 0, 16, 2);
    this.gfx.scene.add(this.flashLight);
    this.heroLight = new THREE.PointLight(0xffe8d0, 0, 10, 1.4);   // lights the hero on the selection screen in dark chapters
    this.gfx.scene.add(this.heroLight);
    this.stats = { shots: 0, hits: 0, heads: 0, t: 0 };
    this.ui = {
      hp: $('#vital .num'), hpbar: $('#hpbar i'), mate: $('#mate'), placeBan: $('#placeban'), skill: $('#skill'), skillName: $('#skill .sn'), skillBar: $('#skill i'), skillFx: $('#skillfx'), pips: $('#pips'), wname: $('#arms .name'), alt: $('#arms .alt'), foes: $('#foes'),
      boss: $('#boss'), bossName: $('#boss span'), bossBar: $('#boss i'), msg: $('#msg'), hit: $('#hit'),
      dmg: $('#dmg b'), place: $('#place'), cross: [...document.querySelectorAll('#cross i[data-s]')], bag: $('#bag'), bars: $('#bars'),
    };
    this.cache = {}; this.msgT = 0; this.hitT = 0; this.dmgT = 0; this.crossGap = 6;
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._o = { x: 0, y: 0, z: 0 }; this._d = { x: 0, y: 0, z: 0 };
    this.duel = null;
    this.havoc = new Havoc(this); this.map = new MapView(this); this.voice = new Voice(this); this.bagShown = 0;
    this.crowd = new Crowd(this); this.arc = new Arc(this); this.bars = []; this.life = new Life(this);
    this.sound.onchange = () => { this.voice.settings(); this.soundLabel(); };
    this.bindUI();
  }

  /** In the game together, the other player is a team-mate: nothing this player fires or swings can hurt him. */
  friend(e) { return !!(e.remote && this.duel && this.duel.cfg && this.duel.cfg.rules === 'coop'); }
  /** The characters on offer: three heroes, and in a duel the chapter's villains as well. */
  roster() { const d = this.def; return this.duel && this.duel.active ? d.heroes.concat(VILLAINS[d.id] || []) : d.heroes; }

  bindUI() {
    document.querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => { this.sound.init(); this.openLevel(+c.dataset.level); }));
    // hero cards: pointing at one previews that hero in the opening shot, clicking starts the chapter
    const cardOf = (e) => { const c = e.target.closest('.hero'); return c ? +c.dataset.hero : -1; };
    $('#heroes').addEventListener('mouseover', (e) => { const k = cardOf(e); if (k >= 0 && this.state === 'intro' && k !== this.heroIndex && !(this.duel && this.duel.myPick >= 0)) this.applyHero(k); });
    $('#ver').textContent = 'v' + __APP_VERSION__;                // from package.json, at build time
    $('#gfxsel').addEventListener('change', (e) => { this.setGraphics(e.target.value); e.target.blur(); });
    if (params.has('fps')) { this.fpsEl = document.createElement('div'); this.fpsEl.id = 'fps'; document.body.appendChild(this.fpsEl); }
    this.gfxLabel();
    $('#foesel').addEventListener('change', (e) => { this.foeWant = +e.target.value; e.target.blur(); if (this.state === 'intro' && !(this.duel && this.duel.active)) this.spawnEnemies(); });
    $('#witsel').addEventListener('change', (e) => { this.wits = e.target.value; e.target.blur(); try { localStorage.setItem('outlaws.wits', this.wits); } catch (er) { /* for this visit */ } if (this.state === 'intro' && !(this.duel && this.duel.active)) this.spawnEnemies(); });
    $('#sizesel').addEventListener('change', (e) => { this.mapSize = e.target.value; e.target.blur(); try { localStorage.setItem('outlaws.size', this.mapSize); } catch (er) { /* for this visit */ } if (this.state === 'intro' && !(this.duel && this.duel.active)) this.reloadLevel(); });
    $('#heroes').addEventListener('click', (e) => { const k = cardOf(e); if (k >= 0 && this.state === 'intro' && !(this.duel && this.duel.myPick >= 0)) { this.applyHero(k); this.begin(); } });
    bindDuelUI(this);
    this.canvas.addEventListener('mousedown', () => { if (this.state === 'play' && !this.input.locked && !this.input.free) this.input.lock(); });   // a click captures the mouse again
    // Closing the tab or the browser by accident while playing (Ctrl+W, Ctrl+Q...) asks first: the browser shows its "Leave the page?" question.
    addEventListener('beforeunload', (e) => { if (this.state === 'play' || this.state === 'pause' || this.state === 'dead' || (this.duel && this.duel.link.open)) { e.preventDefault(); e.returnValue = ''; } });
    this.bindSound();
    addEventListener('resize', () => this.map.resize()); this.map.resize();
    // the menu buttons of the pause, death and end screens, and the way back from the hero screen
    const act = (a) => {
      if (a === 'title') { this.toTitle(); return true; }
      if (a === 'resume' && this.state === 'pause') { this.setState('play'); this.input.lock(); return true; }
      if (a === 'gfx') { const all = ['auto', ...GFX_ORDER]; this.setGraphics(all[(all.indexOf(this.gfxWant) + 1) % all.length]); return true; }
      if (a === 'retry' && this.state === 'dead') { this.openLevel(this.index, true); return true; }
      if (a === 'heroes' && this.state === 'dead') { this.openLevel(this.index); return true; }
      if (a === 'again' && this.state === 'clear' && !this.duel) { this.openLevel(this.index); return true; }
      return false;
    };
    for (const id of ['#pause', '#dead', '#clear', '#intro']) $(id).addEventListener('click', (e) => { const b = e.target.closest('.menubtn'); if (b && b.dataset.act && b.dataset.act !== 'sound' && b.dataset.act !== 'next') { e.stopPropagation(); b.blur(); act(b.dataset.act); } }, true);
    $('#pause').addEventListener('click', (e) => { if (e.target.closest('.soundbtn')) return; if (this.state === 'pause') { this.setState('play'); this.input.lock(); } });
    $('#dead').addEventListener('click', () => { if (this.state === 'dead' && this.player.deadT > 1) this.openLevel(this.index, true); });
    $('#clear').addEventListener('click', () => { if (this.state !== 'clear') return; if (this.duel) { if (this.duel.link.open) this.duel.again(); else this.toTitle(); return; } if (this.index + 1 < LEVELS.length) this.openLevel(this.index + 1); else this.toTitle(); });
    this.input.onLock = (locked) => {
      if (locked) { if (this.state === 'pause') this.setState('play'); }
      else if (this.state === 'play' && !this.input.free) this.setState('pause');
    };
    addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;             // typing a duel code is not playing
      if (e.code === 'KeyM') { this.sound.init(); const on = this.sound.toggleMusic(); if (this.state === 'play') this.say(on ? 'Music on' : 'Music off'); }   // M: the music only; the other sounds stay
      if (e.code === 'KeyO' && (this.state === 'pause' || this.state === 'title' || this.state === 'duel')) this.soundPanel(!this.soundOpen);
      if (e.code === 'KeyG' && this.state === 'pause') {         // in the pause, G steps through the graphics levels without leaving the chapter (in play, G drops what is in hand)
        const all = ['auto', ...GFX_ORDER]; this.setGraphics(all[(all.indexOf(this.gfxWant) + 1) % all.length]);
        if (this.state === 'play') this.say('Graphics: ' + GFX_NAMES[this.gfxWant]);
      }
      // easter egg: typing PAX ("peace") switches practice mode on and off
      if (e.key && e.key.length === 1) {
        this.typed = (this.typed + e.key.toLowerCase()).slice(-12);
        if (this.typed.endsWith('pax')) {
          this.typed = ''; this.togglePractice();
          if (this.state === 'pause' && this.pausedByP) { this.setState('play'); this.say(this.practice ? 'Practice mode — they cannot hurt you' : 'Practice mode off'); }   // the P of PAX had paused the game
        }
      }
      if (e.code === 'KeyQ' && this.state === 'pause' && !this.soundOpen) this.toTitle();
      if (e.code === 'Escape' && !this.soundOpen && (this.state === 'intro' || this.state === 'dead' || this.state === 'clear')) { this.toTitle(); return; }   // Esc: back to the main menu
      if (e.code === 'Escape' && this.state === 'pause' && !this.soundOpen) { this.setState('play'); this.input.lock(); return; }
      if (e.code === 'Escape' && this.soundOpen) this.soundPanel(false);
      if (this.state === 'intro') {
        const k = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'].indexOf(e.code);  // hero keys
        if (k >= 0 && k < this.roster().length && !(this.duel && this.duel.myPick >= 0)) this.applyHero(k);
        if (e.code === 'Enter') this.begin();
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.state === 'play' && !this.input.locked) { this.pausedByP = e.code === 'KeyP'; this.setState('pause'); }
    });
  }

  /** The player's choice of graphics: 'auto' (start high, step down while the frame rate is poor) or a fixed level. */
  setGraphics(want) {
    this.gfxWant = GFX_NAMES[want] ? want : 'auto';
    try { localStorage.setItem(GFX_KEY, this.gfxWant); } catch (e) { /* no storage: the choice lasts for this visit */ }
    this.gfx.setQuality(this.gfxWant === 'auto' ? 'high' : this.gfxWant);
    this.autoPrev = null; this.autoLock = false; this.perfT = 0; this.perfN = 0; this.skipPerf = true;
    this.gfxLabel();
  }
  gfxLabel() {
    const sel = $('#gfxsel'), now = GFX_NAMES[this.gfx.quality];
    sel.value = this.gfxWant; sel.options[0].textContent = this.gfxWant === 'auto' ? 'Automatic (now ' + now + ')' : 'Automatic';
    $('#gfxnow').textContent = 'Graphics: ' + (this.gfxWant === 'auto' ? 'Automatic, now ' + now : now); $('#gfxbtn').textContent = 'Graphics: ' + (this.gfxWant === 'auto' ? 'Automatic' : now);
  }
  // ---- the sound settings: four volumes, the music on or off, the microphone of the duel ----
  bindSound() {
    const S = this.sound, panel = $('#sound');
    for (const k of ['master', 'effects', 'voice', 'music']) {
      const el = $('#snd-' + k);
      el.value = Math.round(S.set[k] * 100);
      el.addEventListener('input', () => { S.init(); S.change({ [k]: el.value / 100, ...(k === 'music' && +el.value > 0 ? { musicOn: true } : {}) }); });
    }
    $('#snd-musicOn').addEventListener('change', (e) => { S.init(); S.change({ musicOn: e.target.checked }); });
    $('#snd-mic').addEventListener('change', (e) => { S.change({ mic: e.target.value }); e.target.blur(); });
    $('#snd-close').addEventListener('click', () => this.soundPanel(false));
    panel.addEventListener('click', (e) => { e.stopPropagation(); if (e.target === panel) this.soundPanel(false); });
    panel.addEventListener('mousedown', (e) => e.stopPropagation());
    document.querySelectorAll('.soundbtn').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); S.init(); this.soundPanel(true); }));
    this.soundLabel();
  }
  soundPanel(on) { this.soundOpen = on; $('#sound').classList.toggle('on', on); if (on) this.soundLabel(); }
  soundLabel() {
    const S = this.sound.set;
    for (const k of ['master', 'effects', 'voice', 'music']) { $('#snd-' + k).value = Math.round(S[k] * 100); $('#snv-' + k).textContent = Math.round(S[k] * 100) + '%'; }
    $('#snd-musicOn').checked = S.musicOn; $('#snd-mic').value = S.mic;
  }

  /**
   * Automatic graphics, called with the mean frame time of the last 80 frames. Below about 42 frames a second it
   * steps one level down. If a step brought nothing (a display or a processor that sets the pace, not the picture),
   * it is taken back and the game stops trying. On the lowest level it then lowers the resolution a little further.
   */
  autoGraphics(avg) {
    const G = this.gfx;
    if (this.autoLock) return;
    if (this.autoPrev) {
      const { avg: before, from } = this.autoPrev; this.autoPrev = null;
      if (avg > before * 0.93) { G.setQuality(from); this.autoLock = true; this.skipPerf = true; this.gfxLabel(); return; }
    }
    if (avg <= 0.024) return;
    const i = GFX_ORDER.indexOf(G.quality);
    if (i < GFX_ORDER.length - 1) { this.autoPrev = { avg, from: G.quality }; G.setQuality(GFX_ORDER[i + 1]); this.skipPerf = true; this.gfxLabel(); }
    else if (avg > 0.034 && G.pixelRatio > 0.4) { G.pixelRatio = Math.max(0.4, G.pixelRatio - 0.1); G.resize(); }
  }

  /** Practice mode: enemies still fight, but nothing they do can hurt you. */
  togglePractice() {
    if (this.duel && this.duel.active) return;                     // a duel is fought for real
    this.practice = !this.practice;
    document.body.classList.toggle('practice', this.practice);
    this.sound.init(); this.sound.pickup();
    if (this.practice) this.gfx.damage = 0;
    if (this.state === 'play') this.say(this.practice ? 'Practice mode — they cannot hurt you' : 'Practice mode off');
  }

  show(id) { for (const s of ['title', 'intro', 'pause', 'dead', 'clear', 'duel']) $('#' + s).classList.toggle('on', s === id); if (id && id !== 'pause' && this.soundOpen) this.soundPanel(false); }

  setState(s) {
    this.state = s; this.input.active = s === 'play'; if (s === 'play') this.pausedByP = false;
    document.body.classList.toggle('playing', s === 'play'); if (s !== 'play') document.body.classList.remove('scoped');
    document.body.classList.toggle('cine', s === 'title' || s === 'intro' || s === 'duel');
    if (s !== 'play') this.map.big.classList.remove('on');
    this.show(s === 'play' ? null : s);
    if (this.hero) this.hero.visible = s === 'intro';
  }

  // ---- level lifecycle ------------------------------------------------------
  loadLevel(i, backdrop = false) {
    const def = LEVELS[i];
    this.index = i; this.def = def;
    // what changes from one game to the next (where the enemies stand, where things lie): random, or in a duel the host's number, the same in both browsers
    this.seed = this.duel && this.duel.active && this.duel.cfg && this.duel.cfg.seed != null ? this.duel.cfg.seed : (Math.random() * 2 ** 31) | 0;
    if (this.duel && this.duel.active && this.duel.cfg) { this.wits = this.duel.cfg.wits || 'medium'; this.mapSize = this.duel.cfg.size || 'medium'; }   // a game for two: the host's choice, in both browsers
    this.gfx.clearLevel(); this.shots.reset(); this.havoc.reset(); this.enemies = []; this.pickups = [];
    this.world = new World(); this.world.chapter = def.id; this.rand = rng(4242 + i * 977);
    const B = new Builder(this.world);
    const L = (this.level = def.build({ game: this, gfx: this.gfx, world: this.world, B, M: this.M, root: this.gfx.root, rand: this.rand, shared: this.gfx.shared }));
    if (!backdrop) this.rockColliders();
    this.sized = backdrop ? null : resize({ game: this, world: this.world, level: L, B, M: this.M, root: this.gfx.root, def, index: i }, this.mapSize);   // small, medium or large
    L.enemies = capFoes(L.enemies, this.sized && this.sized.large ? 45 : MAX_FOES);
    this.world.meshes = B.build(this.gfx.root);                 // the merged meshes: a broken table takes what lies on it out of them
    if (!backdrop) { const t0 = performance.now(); this.world.setVisual(this.world.meshes, this.M); this.bvhMs = performance.now() - t0; }   // shots and sight stop at what is drawn; roofs can be stood on
    if (backdrop) this.nav = null;                         // the title screen only shows the world; nobody has to find a way
    else { const t0 = performance.now(); this.world.roofsOn = false; this.nav = new Nav(this.world); this.world.roofsOn = true; this.navMs = performance.now() - t0; }   // walkable-area grid for enemy route finding (on the ground and floors, not on roofs)
    this.gfx.setEnvironment(L.env); this.gfx.applyDetail();
    this.spawnEnemies();
    this.crowd.setup(this.world.people);
    this.placeHeals(L);
    this.player.spawn(L.spawn.x, L.spawn.z, L.spawn.yaw, def.weapon);
    this.hero = null;
    const want = params.has('hero') ? +params.get('hero') - 1 : 0;
    this.applyHero(clamp(this.heroPick[def.id] ?? want, 0, this.roster().length - 1));
    for (const c of [...document.body.classList]) if (c.startsWith('theme-')) document.body.classList.remove(c);
    document.body.classList.add(def.theme);
    if (!backdrop) this.map.build(); else this.map.clearMarks();      // the map of this chapter (after its colours are set)
    this.life.setup();                                                // birds, wind, and in some chapters a train or a tank
    this.stats = { shots: 0, hits: 0, heads: 0, t: 0 };
    this.timeScale = 1; this.slow = 0; this.noise = 0; this.cache = {};
    this.ui.boss.classList.remove('on');
    this.gfx.camera.fov = 72; this.gfx.camera.updateProjectionMatrix();
    this.gfx.fade = 0; this.gfx.fadeTarget = 1; this.gfx.damage = 0;
    this.perfT = 0; this.perfN = 0; this.skipPerf = true;        // ignore the loading hitch when measuring speed
    this.autoPrev = null; this.autoLock = false;                 // a new place: automatic graphics may judge again (it keeps the level it reached)
  }

  /** The chapter's enemies as chosen on the hero screen: that many of them, thinned the same way as the cap (crowds first, every kind kept as long as possible, the boss always). */
  foeList(list, rand) {
    const n = Math.round(this.foeWant);
    if (!n || n >= list.length) return list.slice();
    const boss = list.filter(([t]) => TYPES[t].boss), rest = shuffle(list.filter(([t]) => !TYPES[t].boss), rand);     // a different choice every time; the boss always
    return boss.concat(rest.slice(0, Math.max(0, n - boss.length)));
  }
  /**
   * Enemies who walk the ground go to a random free place on open ground, from which the start can be reached on foot: most of them
   * within thirty metres of where the chapter put them (so the chapter keeps its shape), some anywhere. Those posted on a roof, a tower or
   * a perch, those lying in ambush, and the boss keep their places. avoid: [x, z, r] circles to keep clear (the start, a duel's bases).
   */
  scatter(list, rand, avoid) {
    const nav = this.nav, used = [];
    if (!nav) return list;
    const clear = (x, z) => avoid.every(([ax, az, r]) => (x - ax) ** 2 + (z - az) ** 2 > r * r) && used.every(([ux, uz]) => (x - ux) ** 2 + (z - uz) ** 2 > 16);
    const S = this.level.spawn, sy = this.world.groundAt(S.x, S.z, 100);
    return list.map(([type, x, z, o = {}]) => {
      if (TYPES[type].boss || o.static || o.ambush || o.y !== undefined || o.up !== undefined) { used.push([x, z]); return [type, x, z, o]; }
      for (let i = 0; i < 50; i++) {
        let cx, cz;
        if (rand() < 0.3) { cx = nav.x0 + rand() * nav.nx * nav.cell; cz = nav.z0 + rand() * nav.nz * nav.cell; }
        else { const a = rand() * 6.283, r = 5 + rand() * 25; cx = x + Math.cos(a) * r; cz = z + Math.sin(a) * r; }
        const k = nav.idx(cx, cz);
        if (k < 0 || !nav.free[k] || !nav.onT[k] || !clear(cx, cz)) continue;
        if (!nav.path(cx, cz, S.x, S.z, 15000, nav.hgt[k], sy)) continue;
        used.push([cx, cz]); return [type, cx, cz, { ...o, y: nav.hgt[k] + 0.4, moved: true }];
      }
      used.push([x, z]); return [type, x, z, o];
    });
  }
  /** Put the enemies into the loaded chapter (again, when the number is changed on the hero screen). */
  spawnEnemies() {
    for (const e of this.enemies) { e.rig.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); e.rig.group.removeFromParent(); }
    this.enemies = []; this.cache = {};
    const L = this.level, duel = this.duel && this.duel.active, rand = rng(this.seed ^ 0x51ed), S = L.spawn;
    const avoid = duel ? this.duel.spawnPoints().map((p) => [p.x, p.z, 26]) : [[S.x, S.z, 28]];
    const list = this.scatter(duel ? this.duel.enemyList(L.enemies, rand) : this.foeList(L.enemies, rand), rand, avoid);
    for (const [type, x, z, o] of list) this.enemies.push(new Enemy(this, type, x, z, o));
    this.posts();
  }
  /**
   * Enemies of medium or clever wits do not stand just anywhere: each one with a gun or a bow takes up a place near his own with a view
   * and something to hide behind (a wall, a crate, a cart); clever marksmen climb to a roof, a deck or a balcony and stay there.
   * Worked out the same way in both browsers of a game for two.
   */
  posts() {
    if (this.wits === 'low' || !this.nav) return;
    const W = this.world, nav = this.nav, rand = rng(this.seed ^ 0x9057), genius = this.wits === 'genius', taken = [];
    const open = (x, y, z, R = 22) => { let n = 0; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; if (W.clear(x, y, z, x + Math.sin(a) * R, y, z + Math.cos(a) * R)) n++; } return n; };
    for (const e of this.enemies) {
      if (e.remote || e.static || e.state === 'hidden' || !e.cfg.ranged || e.cfg.boss || !e.cfg.sight) continue;
      const sniper = genius && e.cfg.range >= 55 && rand() < 0.5;
      let best = null, bs = -1e9;
      for (let i = 0; i < (sniper ? 40 : 26); i++) {
        const a = rand() * Math.PI * 2, d = 1.5 + rand() * (sniper ? 22 : 11), x = e.pos.x + Math.sin(a) * d, z = e.pos.z + Math.cos(a) * d;
        if (taken.some((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 < 9)) continue;
        let y, sc;
        if (sniper) {                                            // up high, on something flat with room to stand
          const g0 = W.height(x, z); y = W.groundAt(x, z, g0 + 16);
          if (y - g0 < 2.6 || y - g0 > 14 || y < W.waterY + 1) continue;
          if ([[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].some(([ox, oz]) => Math.abs(W.groundAt(x + ox, z + oz, y + 0.3) - y) > 0.12)) continue;
          const p = { x, y, z }; W.collide(p, 0.3, 1.7); if (Math.abs(p.x - x) + Math.abs(p.z - z) > 0.03 || W.inBox(x, z, y, 1.7)) continue;
          sc = (y - g0) * 0.8 + open(x, y + 1.6, z, 30) - d * 0.08;
        } else {                                                 // on the ground, against something
          const k = nav.idx(x, z); if (k < 0 || !nav.free[k]) continue;
          y = nav.hgt[k]; if (Math.abs(y - e.pos.y) > 1.2) continue;
          let cover = 0; for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = nav.idx(x + ox * 0.9, z + oz * 0.9); if (q >= 0 && !nav.free[q]) cover++; }
          if (!cover || cover > 2) continue;
          sc = open(x, y + 1.6, z) + cover * 1.5 - d * 0.12;
        }
        if (sc > bs) { bs = sc; best = { x, y, z }; }
      }
      if (!best) continue;
      taken.push([best.x, best.z]);
      e.pos.set(best.x, best.y, best.z); e.home.copy(e.pos); e.patrol = false; e.post = true;
      if (sniper) { e.static = true; e.sniper = true; }
      let ba = e.yaw, bn = -1;                                   // he faces the way he sees furthest
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; let n = 0; for (let r = 6; r <= 24; r += 6) if (W.clear(best.x, best.y + 1.6, best.z, best.x + Math.sin(a) * r, best.y + 1.6, best.z + Math.cos(a) * r)) n++; if (n > bn) { bn = n; ba = a; } }
      e.yaw = e.homeYaw = ba; e.sync();
    }
  }

  /**
   * The rocks and boulders that the chapters scatter as instanced shapes had nothing to bump into: each one of any size gets a
   * collider now (unless one stands there already), so that nobody walks into a rock or vanishes inside it, and shots stop at it.
   */
  rockColliders() {
    const W = this.world, m4 = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let n = 0;
    for (const o of this.gfx.root.children) {
      if (!o.isInstancedMesh || !o.userData.solid) continue;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      const bs = g.boundingSphere;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4); m4.decompose(p, q, sc);
        const s = Math.max(sc.x, sc.z), r = bs.radius * s * 0.8, top = p.y + (bs.center.y + bs.radius) * sc.y;
        if (r < 0.45 || top - W.height(p.x, p.z) < 0.5) continue;
        if (W.cyls.some((c) => Math.abs(c.x - p.x) < r && Math.abs(c.z - p.z) < r)) continue;
        W.addCyl(p.x, p.z, r, p.y - 2, top); n++;
      }
    }
    this.rockCols = n;
  }

  /** Switch the playable character: figure in the opening shot, hands, and the hero's trait. */
  applyHero(k) {
    const d = this.def, h = this.roster()[k], P = this.player;
    this.heroIndex = k; this.heroPick[d.id] = k;
    if (this.hero) { this.hero.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.hero.removeFromParent(); }
    const rig = makeHumanoid(this.M, lookFor(h.look, this.rand)), look = lookFor(h.look, this.rand);
    rig.group.position.copy(P.pos); rig.group.rotation.y = this.level.spawn.yaw + Math.PI;
    const up = look.weapon === 'halberd' || look.weapon === 'katana';        // carry long weapons upright
    rig.armR.rotation.x = up ? -1.2 : look.weapon === 'bow' ? -0.9 : -0.35; rig.armR.rotation.z = up ? 0.14 : -0.1;
    rig.armL.rotation.x = 0.1; rig.armL.rotation.z = 0.12;
    this.gfx.root.add(rig.group); this.hero = rig.group; this.hero.visible = this.state === 'intro';
    P.mods = { hp: 100, armor: 1, speed: 1, fire: 1, reload: 1, draw: 1, melee: 1, reach: 0, regen: 0, power: 1, meleeDmg: 1, gun: 1, stealth: 1, ...h.mods };
    P.maxHp = P.mods.hp; P.hp = P.maxHp;
    P.setWeapon(h.weapon ?? d.weapon, h.sleeve, h.cuff); P.setSkill(skillOf(h));
    const kind = h.weapon ?? d.weapon;
    this.ownName = h.weaponName ?? d.weaponName; this.ownAlt = THROWN[kind] ? weaponAlt(kind, d) : h.alt ?? d.alt;     // a thrown weapon is aimed with the right button, its blade is on F
    this.ui.wname.textContent = this.ownName; this.ui.alt.textContent = this.ownAlt;
    this.ui.place.textContent = h.name + ' · ' + d.place; this.cache = {};
    document.querySelectorAll('#heroes .hero').forEach((c) => c.classList.toggle('sel', +c.dataset.hero === k));
  }

  /** The same chapter again, from the hero screen (the size of the map was changed). */
  reloadLevel() { this.openLevel(this.index); }
  openLevel(i, direct = false) {
    this.gfx.fadeTarget = 0; this.show(null);
    setTimeout(() => {
      this.loadLevel(i);
      const d = this.def;
      this.fillIntro();
      this.cineT = 0;
      this.sound.startAmbient(d.id); this.sound.startMusic(d.id);
      if (direct) this.begin(); else this.setState('intro');
    }, 380);
  }

  fillIntro() {
    const d = this.def;
    $('#intro .chap').textContent = d.chapter;
    $('#intro h2').innerHTML = (d.kanji ? `<span class="kanji">${d.kanji}</span>` : '') + d.title;
    $('#intro .story').textContent = d.story;
    $('#intro .keys').innerHTML = d.keys.replace('<kbd>Space</kbd> jump', '<kbd>Space</kbd> jump &nbsp; <kbd>C</kbd> crouch &nbsp; <kbd>X</kbd> sneak')
      + '<br><kbd>Wheel</kbd> change weapon &nbsp; <kbd>Middle button</kbd> mark a place &nbsp; <kbd>Tab</kbd> map &nbsp; <kbd>H</kbd> heal from the bag &nbsp; <kbd>E</kbd> special skill &nbsp; <kbd>G</kbd> drop';
    const duel = this.duel && this.duel.active, n = d.heroes.length;
    if (duel) {
      const c = this.duel.cfg;
      $('#intro .chap').textContent = (c.rules === 'coop' ? 'Two players' : 'Duel') + ' · ' + RULES[c.rules];
      const many = c.foes ? (c.foes === 1 ? 'One of the chapter’s enemies' : c.foes + ' of the chapter’s enemies') : '';
      $('#intro .story').textContent = c.rules === 'coop'
        ? `Two players together against ${c.foes} of the chapter’s enemies. Nothing either of you fires can hurt the other; each counts his own kills. One who falls is back in a moment. The mission is over when the last enemy falls.`
        : 'Two players, one world. ' + (c.rules === 'rounds' ? 'Each kill ends a round; the first to win five rounds wins.'
          : c.rules === 'ctf' ? 'Capture the flag: your flag, blue, stands at your end of the map, the other one, red, at the other end. Take the red flag and bring it to yours while yours is there. A carrier who falls drops it; touch your own lying out there to send it home. First to three captures, or the most after seven minutes.'
          : 'Seven minutes: whoever has more kills at the end wins.')
        + (many ? ` ${many} ${c.foes === 1 ? 'is' : 'are'} still about, and attack you both.` : '') + ' Your opponent shows on the map while moving, unless sneaking.';
    }
    $('#intro .pick').textContent = duel ? 'Choose your fighter' : 'Choose your hero';
    $('#witsel').value = this.wits; $('#sizesel').value = this.mapSize;
    { const all = this.level.enemies.length, sel = $('#foesel'), want = Math.round(this.foeWant), steps = [5, 10, 15, 20, 25, 30, 35, 40, 45].filter((k) => k < all).concat(all);       // the list offers 5 to 30 in steps of five, as far as the chapter has that many
      sel.innerHTML = steps.map((k) => `<option value="${k}">${k}</option>`).join(''); sel.value = steps.includes(want) ? want : all; }
    $('#heroes').classList.toggle('many', !!duel); $('#heroes').classList.toggle('lots', !!duel && this.roster().length > 7);
    $('#intro').classList.toggle('duelpick', !!duel);
    const STAR = '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/>';
    const SKULL = '<path d="M12 2C7 2 3.5 5.6 3.5 10.2c0 2.7 1.3 4.9 3.2 6.2V19c0 .8.7 1.5 1.5 1.5h.8v-2h1.5v2h3v-2H15v2h.8c.8 0 1.5-.7 1.5-1.5v-2.6c1.9-1.3 3.2-3.5 3.2-6.2C20.5 5.6 17 2 12 2zM8.5 13a2 2 0 110-4 2 2 0 010 4zm7 0a2 2 0 110-4 2 2 0 010 4zm-3.5 3.2l-1.2-2h2.4z"/>';
    const icon = (bad, cls) => `<svg class="${cls} ${bad ? 'bad' : 'good'}" viewBox="0 0 24 24" aria-hidden="true">${bad ? SKULL : STAR}</svg>`;
    const label = (bad) => duel ? `<div class="hlabel ${bad ? 'bad' : 'good'}">${icon(bad, '')}${bad ? 'Villains' : 'Heroes'}</div>` : '';
    $('#heroes').innerHTML = this.roster().map((h, i) => (i === 0 ? label(false) : i === n ? label(true) : '')
      + `<div class="hero${duel ? (i >= n ? ' bad' : ' good') : ''}${i === this.heroIndex ? ' sel' : ''}" data-hero="${i}" title="${duel ? (i >= n ? 'Villain' : 'Hero') : ''}"><span class="hk">${i + 1}</span>${duel ? icon(i >= n, 'hi') : ''}`
      + `<div class="hn">${h.name}</div><div class="hw">${h.who}</div><div class="ht"><b>${h.trait}</b> — ${h.effect}</div><div class="hs"><kbd>E</kbd> <b>${SKILLS[skillOf(h)].name}</b> — ${SKILLS[skillOf(h)].line}</div></div>`).join('');
  }

  // ---- duel: lobby, choice of fighter, end ---------------------------------------
  openDuel() { this.duelLobbyMode(null); this.setState('duel'); this.duelStatus(''); }
  closeDuel() { if (this.duel) { this.duel.leave(); this.duel = null; } this.duelLobbyMode(null); this.setState('title'); }
  /** The Duel screen has two faces: looking for an opponent, or still connected to one between two duels. */
  duelLobbyMode(d) {
    const el = $('#duel'), linked = !!d;
    el.classList.toggle('linked', linked); el.classList.toggle('host', linked && d.isHost); el.classList.toggle('guest', linked && !d.isHost);
    $('#dlinkbox').classList.add('hidden');
    $('#dhosttitle').textContent = linked ? 'The next game' : 'Create a game';
    $('#dback').textContent = linked ? 'Leave' : 'Back to the chapters';
    if (linked) { $('#dlevel').value = d.cfg.level; $('#drules').value = RULES[d.cfg.rules] ? d.cfg.rules : 'rounds'; $('#dfoes').value = String(Math.round((d.cfg.foes || 0) / 3) * 3); $('#dwits').value = d.cfg.wits || 'medium'; $('#dsize').value = d.cfg.size || 'medium'; }
    else { $('#dwits').value = this.wits; $('#dsize').value = this.mapSize; }
    if (this.duelFoesLabel) this.duelFoesLabel();
  }
  duelLounge() {
    const d = this.duel;
    this.duelLobbyMode(d); this.setState('duel');
    this.duelStatus(d.isHost ? 'Still connected to your opponent. Choose the next duel and start it.' : 'Still connected. Waiting for the host to start the next duel…');
  }
  /** The line under the cards while the two players choose. */
  duelPickInfo() {
    const D = this.duel, r = this.roster(), mine = D.myPick >= 0, theirs = D.theirPick >= 0;
    const n = this.def.heroes.length, as = (k) => r[k].name + (k >= n ? ', a villain' : ', a hero');
    const who = D.theirName || (D.cfg && D.cfg.rules === 'coop' ? 'Your partner' : 'Your opponent');
    $('#intro .pick').textContent = (mine ? 'You are ' + as(D.myPick) + '. ' : 'Choose your fighter. ') + (theirs ? who + ' is ' + as(D.theirPick) + '.' : mine ? 'Waiting for ' + who + '…' : who + ' is still choosing.');
  }
  duelAborted() { this.duel = null; this.duelLobbyMode(null); this.setState('duel'); this.duelStatus('Your opponent left, or the connection was lost. You can create a new duel.'); }
  duelOver(title, a, b) {
    this.setState('clear');
    if (document.pointerLockElement) document.exitPointerLock();
    this.sound.stopMusic(); this.sound.fanfare(this.def.id);
    const r = this.duel.cfg.rules, unit = r === 'coop' || r === 'timed' ? ' · kills' : r === 'ctf' ? ' · flags' : ' · rounds';
    $('#clear .kicker').textContent = (r === 'coop' ? 'Two players' : 'Duel') + ' · ' + RULES[r];
    $('#clear .big').textContent = title;
    $('#clear .stats').innerHTML = `<div><b>${a}</b>You${unit}</div><div><b>${b}</b>${this.duel.remote ? this.duel.remote.name : 'Opponent'}${unit}</div>`;
    $('#clearnext').textContent = this.duel.link.open ? 'Play again' : 'Back to the chapters'; $('#clear [data-act="again"]').style.display = 'none';
  }
  /** Damage dealt by a computer enemy: to this player, or in a duel to the other one. */
  hurtTarget(P, dmg, from, melee) {
    if (P === this.player) this.hurtPlayer(dmg, from, melee);
    else if (this.duel) this.duel.send({ t: 'hit', d: dmg, x: from.x, z: from.z, m: melee ? 1 : 0 });
  }

  begin() {
    if (this.state !== 'intro' && this.state !== 'dead') return;
    if (this.duel && this.duel.active) { this.sound.init(); this.duel.pick(this.heroIndex); return; }   // the duel starts when both have chosen
    this.sound.init();
    this.setState('play');
    if (!this.input.free) this.input.lock();
  }

  toTitle() {
    if (this.duel) { this.duel.leave(); this.duel = null; }
    if (document.pointerLockElement) document.exitPointerLock();
    this.gfx.fadeTarget = 0; this.show(null);
    setTimeout(() => { this.loadLevel(this.randomChapter(), true); this.cineT = 0; this.sound.stopMusic(); this.sound.startAmbient(this.def.id); this.setState('title'); }, 380);
  }
  /** The title screen shows a different chapter on every visit. */
  randomChapter() {
    let i = Math.floor(Math.random() * LEVELS.length);
    if (i === this.index && this.def) i = (i + 1 + Math.floor(Math.random() * (LEVELS.length - 1))) % LEVELS.length;
    return i;
  }

  /** Something to pick up: what = { type: 'item', id: 'heal' } (the chapter's healing food or drink, the default), { type: 'item', id: bomb } or { type: 'weapon', kind }. */
  /**
   * Something to pick up: what = { type: 'item', id: 'heal' } (the chapter's healing food or drink, the default), { type: 'item', id: bomb },
   * { type: 'weapon', kind } or { type: 'ammo' }. Dropped on the ground it floats and turns; o.still: it lies at height o.y on a table,
   * a shelf, a counter or a chest (o.piece), and falls to the floor if that is broken.
   */
  addPickup(x, z, L, hint = 2, what = { type: 'item', id: 'heal' }, o = {}) {
    if (!this.world.inside(x, z, 0.3)) return;                  // beyond the edge of a small map
    const y = o.y ?? this.world.groundAt(x, z, hint);
    let mesh;
    if (what.type === 'weapon') mesh = dropMesh(what.kind, this.M);
    else if (what.type === 'ammo') mesh = this.ammoMesh();
    else if (what.id !== 'heal') { mesh = new THREE.Mesh(this.shots.geo[what.id], this.M.flat); mesh.scale.setScalar(1.6); }
    else mesh = L.makePickup ? L.makePickup() : new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xb8742a }));
    const box = new THREE.Box3().setFromObject(mesh), lift = -box.min.y + 0.005;      // how far its origin lies above its bottom
    mesh.position.set(x, o.still ? y + lift : y + 0.5, z); mesh.castShadow = true;
    this.gfx.root.add(mesh);
    this.pickups.push({ mesh, x, y, z, t: ((x * 7.3 + z * 3.1) % 6 + 6) % 6, what, still: !!o.still, lift, piece: o.piece || null, rot: ((x * 3.7 + z) % 6.28) });
  }
  /** A box of ammunition: a small wooden case with a brass band. */
  ammoMesh() {
    if (!this.ammoGeo) this.ammoGeo = merge([gBox(0.32, 0.16, 0.2, 0x4a5236, [0, 0, 0]), gBox(0.33, 0.03, 0.21, 0xc9a050, [0, 0.02, 0]), gBox(0.08, 0.02, 0.05, 0xe8e0c8, [0.09, 0.085, 0])]);
    return new THREE.Mesh(this.ammoGeo, this.M.flat);
  }
  /** A missile the player threw now lies somewhere (or sticks in a wall, a body): it can be taken back. At most forty are kept. */
  keep(s) {
    if (s.kept) return; s.kept = true;
    this.pickups.push({ mesh: s.mesh, x: s.x, y: s.y, z: s.z, t: 0, what: { type: 'return', kind: s.ret }, ret: s, still: true, lift: 0 });
    const all = this.pickups.filter((q) => q.ret);
    if (all.length > 40) { const old = all[0]; old.ret.taken = true; this.pickups.splice(this.pickups.indexOf(old), 1); }
  }
  itemLabel(id) { return itemName(id, this.def); }
  /** Which sound a gun of the player makes (the revolver of the wars is a pistol; the lever rifle of the West a carbine). */
  gunSound(kind) { const id = this.def && this.def.id; return kind === 'revolver' ? (id === 'west' ? 'revolver' : 'pistol') : kind === 'carbine' ? (id === 'west' ? 'carbine' : 'rifle') : kind === 'rifle' ? 'scoped' : kind === 'sten' ? 'sten' : 'rifle'; }
  /** A named place found for the first time: its name, large, for a few seconds. */
  placeBanner(name) {
    const el = this.ui.placeBan; if (!el || this.state !== 'play') return;
    el.textContent = name; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); this.sound.discover && this.sound.discover();
  }
  pickupKey(w) { return w ? (w.type === 'weapon' ? 'w:' + w.kind : w.type === 'ammo' ? 'a' : 'i:' + w.id) : 'i:heal'; }
  /** Something the player puts down (G): it lies in front of him, for him to take again later, or for his partner. */
  dropPickup(what) {
    const P = this.player, f = P.forward(this._v2), l = Math.hypot(f.x, f.z) || 1;
    let x = P.pos.x + f.x / l * 1.1, z = P.pos.z + f.z / l * 1.1;
    if (!this.world.clear(P.pos.x, P.pos.y + 0.5, P.pos.z, x, P.pos.y + 0.5, z)) { x = P.pos.x; z = P.pos.z; }     // against a wall: at his feet
    this.addPickup(x, z, this.level, P.pos.y + 0.5, what);
    const p = this.pickups[this.pickups.length - 1]; if (p && p.what === what) p.mine = true;
    if (this.duel) this.duel.send({ t: 'drop', x: +x.toFixed(2), z: +z.toFixed(2), y: +(P.pos.y + 0.5).toFixed(2), w: what });
    this.sound.swap();
  }
  /**
   * The chapter's healing food or drink lies where one would put it down: on tables, chests, market counters and shelves, at different
   * places each game. Where there are not enough of those, the rest lie where the chapter put them.
   */
  placeHeals(L) {
    const rand = rng(this.seed ^ 0xbee), W = this.world, chosen = [];
    const orig = shuffle((L.pickups || []).map((p) => [p[0], p[1], p[3] !== undefined ? W.height(p[0], p[1]) + p[3] : p[2]]), rand);
    for (const q of shuffle(W.pieces.filter((q) => q.spot), rand)) {
      if (chosen.length >= orig.length) break;
      let x, y, z;
      const sp = q.spot === 'top' ? { x: q.x, y: q.top, z: q.z, hw: q.sweep.hw - 0.15, hd: q.sweep.hd - 0.12, ry: q.sweep.ry || 0 } : q.spot;
      { const lx = (rand() - 0.5) * 2 * Math.max(0, sp.hw), lz = (rand() - 0.5) * 2 * Math.max(0, sp.hd), cs = Math.cos(sp.ry), sn = Math.sin(sp.ry); x = sp.x + lx * cs + lz * sn; z = sp.z - lx * sn + lz * cs; y = sp.y; }
      if (chosen.some((c) => (c.x - x) ** 2 + (c.z - z) ** 2 < 36)) continue;            // spread over the chapter
      chosen.push({ x, y, z, q });
    }
    for (const c of chosen) this.addPickup(c.x, c.z, L, c.y, { type: 'item', id: 'heal' }, { y: c.y, still: true, piece: c.q });
    for (const p of orig.slice(chosen.length)) this.addPickup(p[0], p[1], L, p[2]);
  }
  /** A breakable thing has gone: what lay on it falls to the floor, and what it held (ammunition, something that heals) comes out. */
  pieceBroken(p) {
    for (const q of this.pickups) if (q.piece === p) { q.piece = null; q.still = false; q.y = this.world.groundAt(q.x, q.z, p.y + 0.2); }
    const what = lootOf(p, this.seed);
    if (what) this.addPickup(p.x, p.z, this.level, p.y + 0.3, what);
  }
  /** An enemy has fallen: it leaves its weapon (and now and then a bomb or something that heals) where it fell. */
  enemyDown(e) {
    if (e.remote || !this.level) return;
    if (this.duel) this.duel.enemyKilled();
    const list = dropsOf(e, this.def.id);
    list.forEach((what, i) => {
      const a = e.yaw + 1.2 + i * 1.9, r = 0.7 + i * 0.35, x = e.pos.x + Math.sin(a) * r, z = e.pos.z + Math.cos(a) * r;
      this.addPickup(x, z, this.level, e.pos.y + 0.6, what);
    });
  }
  /** The player walks over something: is it taken? Returns the line to show, or null if it is of no use now. */
  takePickup(p) {
    const P = this.player, w = p.what || { type: 'item', id: 'heal' };
    if (w.type === 'ammo') return P.addAmmo();
    if (w.type === 'return') return P.takeBack(w.kind);
    if (w.type === 'weapon') {
      const r = P.addWeapon(w.kind, w.rounds); if (!r) return null;
      return r === 'new' ? weaponName(w.kind, this.def) + ' taken — mouse wheel to use it' : weaponName(w.kind, this.def) + '  ' + r;
    }
    if (!P.addItem(w.id)) return null;
    return itemName(w.id, this.def) + ' in the bag (' + P.count(w.id) + ')' + (w.id === 'heal' ? ' — H to use' : ' — mouse wheel to take it');
  }

  // ---- combat ---------------------------------------------------------------
  playerHitscan(muzzleObj, spread, dmg) {
    const P = this.player, o = this.gfx.camera.getWorldPosition(this._v), d = P.forward(this._v2);
    if (P.skillOn('deadeye')) { spread = 0; dmg *= 1.8; }                 // the skill: every shot true, and harder
    d.x += (Math.random() - 0.5) * 2 * spread; d.y += (Math.random() - 0.5) * 2 * spread; d.z += (Math.random() - 0.5) * 2 * spread; d.normalize();
    this.noise = 0.6; this.stats.shots++; this.crossGap = 16;
    const wh = this.world.raycast(o, d, 260);
    let t = wh ? wh.t : 260, target = null, head = false;
    for (const e of this.enemies) { if (this.friend(e)) continue; const h = e.rayHit(o, d, t); if (h) { t = h.t; target = e; head = h.head; } }
    const hx = o.x + d.x * t, hy = o.y + d.y * t, hz = o.z + d.z * t;
    this.havoc.trinketsAlong(o, d, t);                            // bottles, lamps, ornaments on the way break; the shot goes on
    const m = muzzleObj.getWorldPosition(new THREE.Vector3());
    this.shots.tracer(m.x, m.y, m.z, hx, hy, hz);
    if (this.duel) this.duel.tracer(m.x, m.y, m.z, hx, hy, hz, this.gunSound(P.weapon.kind));
    this.muzzle(m.x + d.x * 0.25, m.y + d.y * 0.25, m.z + d.z * 0.25, d.x, d.y, d.z, 1);
    if (target) this.hitEnemy(target, dmg, head, hx, hy, hz, o.x, o.z);
    else if (wh && wh.person) this.crowd.hit(wh.person, dmg * (hy > wh.person.py + 1.45 ? 2.5 : 1), hx, hy, hz, true);
    else if (wh) { this.impact(hx, hy, hz, wh.nx, wh.ny, wh.nz, 'bullet'); if (wh.piece) this.havoc.damage(wh.piece, dmg, hx, hy, hz); }
    this.crowd.alarm(P.pos.x, P.pos.z, P.sneaking ? 14 : 26, P.pos.x, P.pos.z); this.crowd.alarm(hx, hz, 7, P.pos.x, P.pos.z);   // a shot frightens the people around, and more those near where it struck
    this.makeNoise(P.pos.x, P.pos.z, 34, true); this.makeNoise(hx, hz, 8, false);                  // a gunshot gives the shooter away; where it struck, they look
  }

  /**
   * A noise at (x, z), heard loud metres away by an enemy of medium wits (further by a clever one, not at all by a dull one).
   * byPlayer: it gives the player away (a shot, a throw); otherwise it only makes those who hear it look (a crate breaking).
   */
  makeNoise(x, z, loud, byPlayer = false) {
    if (!loud || this.peace) return;
    const k = HEAR[this.wits] ?? 1; if (!k) return;
    const R = loud * k;
    for (const e of this.enemies) {
      if (!e.alive || e.puppet || e.remote || e.state === 'hidden' || e.cfg.sight === 0) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d < R) e.hear(x, z, d / R, byPlayer);
    }
  }

  playerShoot(kind, speed, dmg, grav, turn = 0, lift = 0, spread = 0) {
    const P = this.player, o = this.gfx.camera.getWorldPosition(this._v), d = P.forward(this._v2);
    if (turn) { const c = Math.cos(turn), s = Math.sin(turn), x = d.x * c - d.z * s; d.z = d.x * s + d.z * c; d.x = x; }      // one missile of a fan: turned a little to the side
    const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    if (P.skillOn('deadeye')) { spread = 0; dmg *= 1.8; }
    this.stats.shots++; this.crossGap = 14;
    const sx = o.x + d.x * 0.5 + rx * 0.04, sy = o.y + d.y * 0.5 - 0.07, sz = o.z + d.z * 0.5 + rz * 0.04;
    if (spread) { d.x += (Math.random() - 0.5) * 2 * spread; d.y += (Math.random() - 0.5) * 2 * spread; d.z += (Math.random() - 0.5) * 2 * spread; }
    const shot = this.shots.spawn(kind, sx, sy, sz, d.x, d.y + 0.012 + lift, d.z, speed, true, dmg, grav);
    if (RETURNS[kind] && !turn) shot.ret = RETURNS[kind];            // it can be taken back where it lands (of a fan of stars, the middle one)
    this.makeNoise(P.pos.x, P.pos.z, NOISE[kind] ?? 10, true);       // a bow, a sling, a throw: heard by those near; a blowgun: by nobody
    if (this.duel) this.duel.shot(kind, sx, sy, sz, d.x, d.y + 0.012 + lift, d.z, speed, grav);
  }

  /**
   * A blow (fists, blade, club) of reach range in a cone in front. It lands on every enemy and bystander within reach and on the nearest
   * breakable thing (a small thing, a piece of furniture, a wooden wall); failing those, it strikes whatever wall is in front.
   */
  playerMelee(range, cone, dmg, fist = false) {
    if (this.player.skillOn('fury')) dmg *= 2;
    const P = this.player, f = P.forward(this._v2), ex = P.pos.x, ey = P.pos.y + 1.5, ez = P.pos.z, W = this.world;
    /** Can the blow reach something centred at (x, y, z), of radius r? Returns the distance, or -1. Close by, a thing off-centre is struck too. */
    const reach = (x, y, z, r) => {
      const dx = x - ex, dy = y - ey, dz = z - ez, d = Math.hypot(dx, dy, dz) || 0.01;
      if (d - r > range) return -1;
      if ((dx * f.x + dy * f.y + dz * f.z) / d < cone && d > r + 0.5) return -1;
      const k = Math.max(0, (d - r - 0.08) / d);                   // stop short of the target: its own collider must not hide it
      return W.clear(ex, ey, ez, ex + dx * k, ey + dy * k, ez + dz * k) ? d : -1;
    };
    let any = false;
    for (const w of this.crowd.list) {                          // a bystander within reach
      if (w.dead || reach(w.px, w.py + 1.1, w.pz, 0.36) < 0) continue;
      const dx = w.px - ex, dz = w.pz - ez, dl = Math.hypot(dx, dz) || 1;
      this.crowd.hit(w, dmg, w.px - dx / dl * 0.3, w.py + 1.2, w.pz - dz / dl * 0.3, true); any = true;
    }
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'hidden' || this.friend(e)) continue;
      if (reach(e.pos.x, e.pos.y + (e.cfg.dog ? 0.5 : 1.1), e.pos.z, 0.32) < 0) continue;   // not through walls
      const dx = e.pos.x - ex, dz = e.pos.z - ez, dist = Math.hypot(dx, dz) || 1;
      this.hitEnemy(e, dmg, false, e.pos.x - dx / dist * 0.3, e.pos.y + 1.2, e.pos.z - dz / dist * 0.3, P.pos.x, P.pos.z);
      any = true;
    }
    // the nearest breakable thing within reach: a small thing, furniture, a fence, a wooden wall
    let best = null, bd = 1e9;
    for (const q of W.pieces) {
      if (q.broken) continue;
      const cy = q.cy ?? Math.min(Math.max(ey - 0.4, q.y + 0.1), q.top - 0.05), d = reach(q.x, cy, q.z, Math.min(q.r, q.wall ? q.r : 0.9));
      if (d >= 0 && d < bd) { bd = d; best = q; }
    }
    if (best) {
      const cy = best.cy ?? Math.min(Math.max(ey - 0.4, best.y + 0.1), best.top - 0.05), dx = best.x - ex, dy = cy - ey, dz = best.z - ez, d = Math.hypot(dx, dy, dz) || 1, k = Math.max(0, d - Math.min(best.r, 0.5)) / d;
      this.havoc.damage(best, dmg, ex + dx * k, ey + dy * k, ez + dz * k);
      if (fist) this.sound.punch(true); else this.sound.thud();
      any = true;
    }
    if (any) { this.stats.shots++; P.recoil(0.3); if (fist && !best) this.sound.punch(true); }
    else {
      const o = this.gfx.camera.getWorldPosition(this._v), wh = W.raycast(o, f, range);
      if (wh) { if (fist) this.sound.punch(true); else this.sound.clank(); this.impact(o.x + f.x * wh.t, o.y + f.y * wh.t, o.z + f.z * wh.t, wh.nx, wh.ny, wh.nz, 'bullet'); }
    }
  }

  hitEnemy(e, dmg, head, x, y, z, fromX, fromZ, quiet) {                     // quiet = poison at work: no hit marker, no sound, not counted as a shot that hit
    const wasBoss = e.cfg.boss, killed = e.damage(dmg, head, fromX, fromZ);
    if (!quiet && e.rig && !e.cfg.dog) wound(e.rig, x, y, z);          // the wound shows where the shot went in
    if (quiet && !killed) return;
    if (!quiet) this.stats.hits++; if (head) this.stats.heads++;
    const S = this.gfx.soft;
    for (let i = 0; i < 9; i++) S.spawn(x, y, z, (Math.random() - 0.5) * 2.4, Math.random() * 2, (Math.random() - 0.5) * 2.4, { life: 0.5 + Math.random() * 0.3, s0: 0.05, s1: 0.16, r: 0.32, g: 0.02, b: 0.02, a: 0.85, grav: 6, drag: 1 });
    this.ui.hit.classList.toggle('kill', killed); this.hitT = killed ? 0.4 : 0.18;
    this.sound.thud();
    if (killed) {
      this.sound.killmark();
      if (head) this.say('Headshot');
      if (wasBoss) this.say(this.def.bossDown);
      const left = this.enemies.filter((q) => q.alive).length;
      if (this.duel) { /* a duel ends by its own rules */ } else if (left === 0) { this.slow = 1.6; this.timeScale = 0.25; }
      else if (left <= 3) for (const q of this.enemies) if (q.state === 'idle' && !q.static) q.alert(0.5);
    } else this.sound.hitmark();
  }

  impact(x, y, z, nx, ny, nz, kind) {
    const c = this.level.dust || [0.6, 0.5, 0.4], S = this.gfx.soft, Gl = this.gfx.glow;
    for (let i = 0; i < 7; i++) S.spawn(x, y, z, nx * (1 + Math.random() * 2) + (Math.random() - 0.5) * 1.6, ny * (1 + Math.random() * 2) + Math.random() * 1.2, nz * (1 + Math.random() * 2) + (Math.random() - 0.5) * 1.6,
      { life: 0.7 + Math.random() * 0.6, s0: 0.08, s1: 0.5 + Math.random() * 0.4, r: c[0], g: c[1], b: c[2], a: 0.55, grav: 0.6, drag: 2.2 });
    if (kind === 'bullet') for (let i = 0; i < 5; i++) Gl.spawn(x, y, z, nx * 3 + (Math.random() - 0.5) * 5, ny * 3 + Math.random() * 3, nz * 3 + (Math.random() - 0.5) * 5, { life: 0.25 + Math.random() * 0.2, s0: 0.035, s1: 0.01, r: 3, g: 1.6, b: 0.5, a: 1, grav: 9 });
    const P = this.player.pos;
    if ((x - P.x) ** 2 + (z - P.z) ** 2 < 900) this.sound.tick();
  }

  muzzle(x, y, z, dx, dy, dz, scale) {
    const Gl = this.gfx.glow, S = this.gfx.soft;
    for (let i = 0; i < 6; i++) Gl.spawn(x, y, z, dx * (6 + Math.random() * 10) + (Math.random() - 0.5) * 3, dy * 8 + (Math.random() - 0.5) * 3, dz * (6 + Math.random() * 10) + (Math.random() - 0.5) * 3,
      { life: 0.06 + Math.random() * 0.07, s0: 0.12 * scale, s1: 0.02, r: 4, g: 2.2, b: 0.7, a: 1 });
    for (let i = 0; i < 5; i++) S.spawn(x, y, z, dx * (1 + Math.random() * 2.5) + (Math.random() - 0.5) * 0.5, dy * 2 + 0.3 + Math.random() * 0.5, dz * (1 + Math.random() * 2.5) + (Math.random() - 0.5) * 0.5,
      { life: 1 + Math.random() * 0.8, s0: 0.1 * scale, s1: 0.75 * scale, r: 0.75, g: 0.72, b: 0.68, a: 0.3, grav: -0.25, drag: 2.4 });
    this.flashLight.position.set(x, y, z); this.flashLight.intensity = 45 * scale;
  }

  poof(x, y, z) {
    const S = this.gfx.soft;
    for (let i = 0; i < 26; i++) S.spawn(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 1.4, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3,
      { life: 0.9 + Math.random() * 0.7, s0: 0.3, s1: 1.4, r: 0.12, g: 0.12, b: 0.15, a: 0.75, grav: -0.3, drag: 2.5 });
    this.sound.poof();
  }

  hurtPlayer(dmg, from, melee) {
    const P = this.player;
    if (P.dead || this.practice || (this.state !== 'play' && !(this.duel && this.state === 'pause'))) return;
    dmg *= P.mods.armor * (P.skillOn('shield') ? 0.2 : 1); P.hp -= dmg; P.hurtT = 0; this.gfx.damage = Math.min(1.1, this.gfx.damage + 0.45 + dmg / 45);
    P.recoil((Math.random() - 0.3) * (melee ? 1.6 : 0.8));
    const dx = from.x - P.pos.x, dz = from.z - P.pos.z;
    const rel = Math.atan2(Math.cos(P.yaw) * dx - Math.sin(P.yaw) * dz, -Math.sin(P.yaw) * dx - Math.cos(P.yaw) * dz);
    this.ui.dmg.style.transform = `rotate(${rel}rad)`; this.ui.dmg.style.transformOrigin = '70px 190px'; this.dmgT = 0.9;
    this.sound.hurt();
    if (P.hp <= 0 && this.duel) { P.hp = 0; P.dead = true; P.deadT = 0; this.sound.sting(); this.duel.localDied(); return; }
    if (P.hp <= 0) {
      P.hp = 0; P.dead = true; P.deadT = 0; this.state = 'dead'; this.input.active = false;
      document.body.classList.remove('playing');
      this.sound.stopMusic(); this.sound.sting();
      $('#dead .big').textContent = this.def.deadTitle; $('#dead .sub').textContent = this.def.deadSub;
      if (document.pointerLockElement) document.exitPointerLock();
      setTimeout(() => { if (this.state === 'dead') this.show('dead'); }, 1300);
    }
  }

  say(text) { this.ui.msg.textContent = text; this.ui.msg.classList.add('on'); this.msgT = 1.6; }

  levelCleared() {
    const s = this.stats, d = this.def, last = this.index + 1 >= LEVELS.length;
    this.setState('clear');
    if (document.pointerLockElement) document.exitPointerLock();
    this.sound.stopMusic(); this.sound.fanfare(d.id);
    $('#clear .kicker').textContent = (last ? 'The last chapter is written' : d.chapter + ' complete') + (this.practice ? ' · practice mode' : '');
    $('#clear .big').textContent = d.clearTitle;
    const acc = s.shots ? Math.min(100, Math.round((s.hits / s.shots) * 100)) : 0, mm = Math.floor(s.t / 60), ss = String(Math.floor(s.t % 60)).padStart(2, '0');
    $('#clear .stats').innerHTML = `<div><b>${mm}:${ss}</b>Time</div><div><b>${acc}%</b>Accuracy</div><div><b>${s.heads}</b>Headshots</div><div><b>${Math.round(this.player.hp)}</b>Health</div>` + (s.innocents ? `<div><b>${s.innocents}</b>Bystanders killed</div>` : '');
    $('#clearnext').textContent = last ? 'Back to the chapters' : 'Next chapter'; $('#clear [data-act="again"]').style.display = '';
  }

  // ---- per-frame ------------------------------------------------------------
  orbit(cx, cy, cz, r, h, a, lookUp = 0) {
    const cam = this.gfx.camera;
    this._o.x = cx; this._o.y = cy; this._o.z = cz;
    let dx = Math.cos(a) * r, dy = h, dz = Math.sin(a) * r;
    const len = Math.hypot(dx, dy, dz);
    this._d.x = dx / len; this._d.y = dy / len; this._d.z = dz / len;
    const hit = this.world.raycast(this._o, this._d, len + 0.4);
    const k = hit ? Math.max(0.25, (hit.t - 0.35) / len) : 1;
    cam.position.set(cx + dx * k, cy + dy * k, cz + dz * k);
    cam.rotation.set(0, 0, 0);
    cam.lookAt(cx, cy + lookUp, cz);
  }

  updatePlay(dt) {
    const P = this.player;
    this.noise = Math.max(0, this.noise - dt);
    this.stats.t += dt;
    P.update(dt, this.input, this.state === 'play');
    if (this.sized && this.sized.chimneys) for (const c of this.sized.chimneys) {        // smoke from the chimneys of the outskirts
      c.t -= dt; if (c.t > 0) continue; c.t = 0.35 + Math.random() * 0.3;
      if (Math.abs(c.x - P.pos.x) + Math.abs(c.z - P.pos.z) > 220) continue;
      this.gfx.soft.spawn(c.x, c.y, c.z, (Math.random() - 0.5) * 0.3, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, { life: 4 + Math.random() * 2, s0: 0.35, s1: 2.2, r: 0.5, g: 0.48, b: 0.46, a: 0.45, grav: -0.15, drag: 0.3 });
    }
    if (this.voices) this.voices.update(dt);
    this.stepT = (this.stepT || 0) - dt;                    // footsteps are heard: walking a little, running much further, sneaking or crouching not at all
    if (this.stepT <= 0 && this.state === 'play') { this.stepT = 0.5; const v = Math.hypot(P.vel.x, P.vel.z); if (P.onGround && !P.dead && v > 1 && !P.sneaking && !P.crouch) this.makeNoise(P.pos.x, P.pos.z, P.sprinting && v > 6 ? 11 : 4, true); }
    if (this.state === 'play' && this.input.mark && !P.dead) this.map.toggleMark();
    for (const e of this.enemies) e.update(dt);
    this.crowd.update(dt);
    this.life.update(dt, this.time);
    this.shots.update(dt);
    this.havoc.update(dt);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i]; p.t += dt;
      if (p.ret) { p.mesh.getWorldPosition(this._v); p.x = this._v.x; p.y = this._v.y - 0.3; p.z = this._v.z; }   // a thrown weapon where it fell or stuck (it moves with a body)
      else if (p.still) { p.mesh.rotation.y = p.rot; p.mesh.position.y = p.y + p.lift; }           // laid on a table or a shelf: it stays put, a faint glint shows it
      else { p.mesh.rotation.y = p.t * 1.2; p.mesh.position.y = p.y + 0.55 + Math.sin(p.t * 2.2) * 0.08; }
      if (Math.random() < dt * (p.still ? 1.5 : 5)) this.gfx.glow.spawn(p.x + (Math.random() - 0.5) * 0.5, p.y + 0.3, p.z + (Math.random() - 0.5) * 0.5, 0, 0.6 + Math.random() * 0.5, 0, { life: 1.2, s0: 0.05, s1: 0.0, r: 1.2, g: 2.2, b: 0.9, a: 0.9 });
      const near = (p.x - P.pos.x) ** 2 + (p.z - P.pos.z) ** 2 < 1.7 && Math.abs(p.y - P.pos.y) < 2;
      if (p.mine) { if ((p.x - P.pos.x) ** 2 + (p.z - P.pos.z) ** 2 > 6.25) p.mine = false; continue; }      // just dropped: not taken back until one has stepped away
      if (!P.dead && near) {
        const line = this.takePickup(p);
        if (!line) continue;                              // of no use now (the bag is full, or it is the hero's own weapon): it stays where it lies
        this.sound.pickup(); this.say(line);
        if (this.duel) this.duel.send({ t: 'pk', x: p.x, z: p.z, k: this.pickupKey(p.what) });
        if (p.ret) p.ret.taken = true; else p.mesh.removeFromParent();
        this.pickups.splice(i, 1);
      }
    }
    if (this.slow > 0) {
      this.slow -= dt / this.timeScale;
      if (this.slow <= 0) { this.timeScale = 1; if (this.state === 'play') this.levelCleared(); }
    }
  }

  updateHud(dt) {
    const P = this.player, u = this.ui, c = this.cache;
    const hp = Math.ceil(P.hp);
    if (c.hp !== hp) { c.hp = hp; u.hp.textContent = hp; u.hpbar.style.width = Math.min(100, (hp / P.maxHp) * 100) + '%'; }
    const sl = P.slots[P.slot], sig = P.slot + '|' + P.slots.map((q) => q.type === 'item' ? q.count : (q.weapon.reserve ?? '-') + '.' + (q.weapon.ammo ?? '')).join(',');
    if (c.arms !== sig) {
      c.arms = sig;
      const name = sl.fists ? 'Fists' : sl.hero ? this.ownName : sl.type === 'item' ? itemName(sl.id, this.def) : weaponName(sl.kind, this.def);
      u.wname.innerHTML = esc(name) + (sl.type === 'item' ? ` <span class="res">× ${sl.count}</span>` : P.weapon.reserve !== null ? ` <span class="res">${P.weapon.reserve} more</span>` : '');
      u.alt.textContent = sl.fists ? weaponAlt('fists') : sl.hero ? this.ownAlt : sl.type === 'item' ? itemAlt(sl.id) : weaponAlt(sl.kind, this.def);
      u.bag.innerHTML = P.slots.length > 1 ? P.slots.map((q, i) => `<div class="${i === P.slot ? 'sel' : ''}"><kbd>${i + 1}</kbd>${esc(q.fists ? 'Fists' : q.hero ? this.ownName.split(' & ')[0] : q.type === 'item' ? itemName(q.id, this.def) : weaponName(q.kind, this.def))}${q.type === 'item' ? ' × ' + q.count : q.fists || q.weapon.reserve === null ? '' : ' · ' + this.player.left(q.weapon)}</div>`).join('') : '';
    }
    this.bagShown = Math.max(0, this.bagShown - dt); u.bag.classList.toggle('lit', this.bagShown > 0);
    { const k = SKILLS[P.skill], on = P.skillT > 0, key = P.skill + (on ? 'on' + Math.ceil(P.skillT * 4) : P.skillCd > 0 ? Math.ceil(P.skillCd) : 'ready');
      if (k && c.skill !== key) {
        c.skill = key; u.skill.className = on ? 'on' : P.skillCd > 0 ? 'wait' : 'ready';
        u.skillName.textContent = k.name + (on ? '' : P.skillCd > 0 ? ' · ' + Math.ceil(P.skillCd) + ' s' : ' · ready');
        u.skillBar.style.width = (on ? P.skillT / k.dur : 1 - P.skillCd / k.cool) * 100 + '%';
        document.body.classList.toggle('skillfx', on); if (on) u.skillFx.style.setProperty('--tint', k.tint);
      } }
    const h = P.weapon.hud(), key = h.ammo + '/' + h.mag + h.reloading;
    if (c.ammo !== key) {
      c.ammo = key; u.pips.className = h.mag === 1 ? 'long' : h.mag > 10 ? 'many' : '';
      u.pips.innerHTML = Array.from({ length: h.mag }, (_, i) => `<i class="${i < h.ammo ? '' : 'off'}"></i>`).join('');
    }
    const alive = this.enemies.filter((e) => e.alive);
    if (this.duel) { const t = this.duel.hud(); if (c.foes !== t) { c.foes = t; u.foes.innerHTML = t; } }
    else if (c.foes !== alive.length) { c.foes = alive.length; u.foes.innerHTML = alive.length ? `<b>${alive.length}</b>${this.def.foes}` : this.def.foesNone; }
    // the boss's health, while he fights (the enemies' positions are on the map)
    const boss = alive.find((e) => e.cfg.boss && e.state === 'combat');
    u.boss.classList.toggle('on', !!boss);
    if (boss) { u.bossName.textContent = this.def.bossName; u.bossBar.style.width = Math.max(0, boss.hp / boss.cfg.hp) * 100 + '%'; }
    // crosshair
    const spd = Math.hypot(P.vel.x, P.vel.z);
    this.crossGap = damp(this.crossGap, 5 + spd * 0.9 - P.aim * 4, 12, dt);
    const g = this.crossGap;
    for (const el of u.cross) {
      const s = el.dataset.s;
      if (s === 'l') el.style.left = -(g + 9) + 'px'; else if (s === 'r') el.style.left = g + 'px';
      else if (s === 'u') el.style.top = -(g + 9) + 'px'; else el.style.top = g + 'px';
    }
    document.body.classList.toggle('scoped', !!P.weapon.scope && P.aim > 0.8 && !P.dead);
    this.hitT = Math.max(0, this.hitT - dt); u.hit.style.opacity = Math.min(1, this.hitT * 8);
    this.dmgT = Math.max(0, this.dmgT - dt); u.dmg.style.opacity = Math.min(1, this.dmgT * 2);
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) u.msg.classList.remove('on'); }
    this.map.update(dt, this.input);
    this.arc.update();
    this.healthBars(alive); this.mateTag();
  }
  /** A small health bar over each enemy who was hit in the last few seconds (and over the other player of a duel while hurt), if in sight. */
  /** Together: the partner's name, distance and health over his head, seen through walls; at the edge of the screen when he is out of view. */
  mateTag() {
    const D = this.duel, el = this.ui.mate, R = D && D.remote;
    const on = this.state === 'play' && D && D.cfg && D.cfg.rules === 'coop' && R && R.net;
    if (!on) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    const P = this.player, d = Math.hypot(R.pos.x - P.pos.x, R.pos.z - P.pos.z);
    const v = this._v.set(R.pos.x, R.pos.y + 2.2 - 0.5 * (R.duck || 0), R.pos.z).project(this.gfx.camera);
    let x = v.x, y = v.y, off = false;
    if (v.z > 1) { x = -x; y = -y; off = true; if (Math.abs(x) + Math.abs(y) < 1e-3) y = -1; }   // behind: to the edge, on his side
    const m = Math.max(Math.abs(x) / 0.93, Math.abs(y) / 0.86);
    if (off || m > 1) { x /= Math.max(m, 1e-6); y /= Math.max(m, 1e-6); off = true; }
    el.style.display = 'block'; el.style.left = (x * 0.5 + 0.5) * innerWidth + 'px'; el.style.top = (-y * 0.5 + 0.5) * innerHeight + 'px';
    el.classList.toggle('off', off); el.classList.toggle('down', !R.alive);
    const key = R.name + '|' + Math.round(d) + '|' + Math.round(R.hp) + R.alive;
    if (el.dataset.k !== key) { el.dataset.k = key; el.innerHTML = `<b>${esc(R.name)}</b><span>${R.alive ? Math.round(d) + ' m' : 'down'}</span><i><u style="width:${Math.max(0, Math.min(100, R.hp / (R.maxHp || 100) * 100))}%"></u></i>`; }
  }
  healthBars(alive) {
    const cam = this.gfx.camera, P = this.player, W = this.world, box = this.ui.bars, w = innerWidth, h = innerHeight;
    let n = 0;
    const eagle = P.skillOn('eagle');                      // the skill: every enemy near enough is marked, walls or not
    for (const e of alive) {
      if (e.state === 'hidden') continue;
      const top = e.pos.y + 2.05 * (e.scale || 1) + (e.cfg.rider ? 0.9 : 0), d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
      const mark = eagle && d < 90 && !this.friend(e);
      if (!mark && (!(e.hurtT < 4 || (e.remote && e.hp < e.maxHp)) || d > 70)) continue;
      const v = this._v.set(e.pos.x, top, e.pos.z).project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || (!mark && !W.clear(P.pos.x, P.pos.y + 1.6, P.pos.z, e.pos.x, top - 0.3, e.pos.z))) continue;
      let el = this.bars[n];
      if (!el) { el = this.bars[n] = document.createElement('div'); el.className = 'hb'; el.innerHTML = '<i></i>'; box.appendChild(el); }
      el.style.display = 'block'; el.classList.toggle('eg', mark); el.style.left = (v.x * 0.5 + 0.5) * w + 'px'; el.style.top = (-v.y * 0.5 + 0.5) * h + 'px';
      el.style.opacity = e.remote || mark ? 1 : Math.min(1, (4 - e.hurtT) * 2);
      el.firstChild.style.width = Math.max(0, Math.min(1, e.hp / e.maxHp)) * 100 + '%';
      n++;
    }
    for (let i = n; i < this.bars.length; i++) this.bars[i].style.display = 'none';
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const raw = (now - (this.last || now)) / 1000, real = Math.max(0, Math.min(0.05, raw)); this.last = now;   // never negative: the first animation frame can carry a time stamp older than the start-up call
    if (raw < 0.5) { this.perfT = (this.perfT || 0) + raw; this.perfN = (this.perfN || 0) + 1; }
    if (this.perfN >= 80) {
      const avg = this.perfT / this.perfN; this.perfT = 0; this.perfN = 0;
      const skip = this.skipPerf; this.skipPerf = false;
      if (!skip && this.gfxWant === 'auto') this.autoGraphics(avg);
    }
    if (this.fpsEl && raw < 0.5) {
      this.fpsT = (this.fpsT || 0) + raw; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsT >= 0.5) { const c = this.canvas; this.fpsEl.textContent = Math.round(this.fpsN / this.fpsT) + ' fps · ' + GFX_NAMES[this.gfx.quality] + (this.gfxWant === 'auto' ? ' (auto)' : '') + ' · ' + c.width + '×' + c.height; this.fpsT = 0; this.fpsN = 0; }
    }
    const dt = real * this.timeScale, L = this.level, P = this.player;
    this.time += dt;
    this.flashLight.intensity = Math.max(0, this.flashLight.intensity - real * 700);
    if (this.duel) this.duel.tick(real);
    this.voice.update(this.input);
    this.map.setPinsVisible(this.state === 'play');
    if (this.state === 'title' || this.state === 'intro' || this.state === 'duel') {
      this.cineT += real;
      P.vm.visible = false;
      if (this.state !== 'intro') {
        const v = L.vista, a = v.swing ? v.a + Math.sin(this.cineT * (v.speed ?? 0.05)) * v.swing : v.a + this.cineT * (v.speed ?? 0.03);
        this.orbit(v.c[0], v.c[1], v.c[2], v.r, v.h, a, v.up ?? 0);
      }
      else {
        const a = -P.yaw - Math.PI / 2 + 0.55 - this.cineT * 0.11;   // start in front of the hero, drift around
        this.orbit(P.pos.x, P.pos.y + 1.25, P.pos.z, 3.6 + Math.sin(this.cineT * 0.2) * 0.5, 0.55, a, 0.15);
        this.gfx.camera.rotateY(0.52);                                 // keep the hero right of the text
        this.heroLight.position.copy(this.gfx.camera.position).y += 0.6;
      }
    } else if (this.state === 'play' || this.state === 'dead' || this.state === 'clear' || (this.duel && this.state === 'pause')) this.updatePlay(dt);   // a duel does not stop for a pause
    this.heroLight.intensity = this.state === 'intro' ? (L.heroLight || 0) : 0;
    if (L.update) L.update(dt, this.time, this);
    if (L.water && this.sound.ctx) {
      let v = 0;
      for (const w of L.water) v = Math.max(v, 1 - Math.hypot(P.pos.x - w[0], P.pos.z - w[1]) / w[2]);
      this.sound.setWater(Math.max(0, v));
    }
    this.gfx.update(dt, this.time);
    if (this.state === 'play') this.updateHud(real);
    this.gfx.render();
    this.input.endFrame();
  }

  /** Debug: freeze the game and place the camera (used for screenshots). */
  shot(x, y, z, yaw = 0, pitch = 0, fov = 72) {
    this.state = 'shot'; this.show(null); document.body.classList.remove('cine', 'playing');
    const c = this.gfx.camera; c.position.set(x, y, z); c.rotation.set(pitch, yaw, 0); c.fov = fov; c.updateProjectionMatrix();
    this.player.vm.visible = false; if (this.hero) this.hero.visible = true;
  }

  /** Debug (?kit): every shared piece of furniture and every bystander look in three rows beside the place where the player starts. */
  kitDemo() {
    const W = this.world, B = new Builder(W), M = this.M, root = this.gfx.root, P = this.player.pos, x0 = P.x - 14, z0 = P.z, y = W.height(P.x, P.z);
    const looks = ['westWoman', 'westMan', 'japanWoman', 'japanMan', 'swissWoman', 'swissMan', 'greekWoman', 'greekMan', 'norseWoman', 'norseMan', 'frenchWoman', 'frenchMan', 'cure', 'russianWoman', 'russianMan', 'tibetWoman', 'nepalWoman', 'pilgrimWoman', 'tibetMan', 'nun', 'monk', 'mexicaWoman', 'mexicaMan'];
    looks.forEach((k, i) => { K.person(B, M, root, k, x0 + i * 1.25, y, z0 - 4, 0); K.person(B, M, root, k, x0 + i * 1.25, y, z0 - 6.5, 0.5, { pose: ['talk', 'carry', 'work', 'pray', 'point', 'hips', 'cheer'][i % 7] }); });
    let x = x0;
    K.table(B, M, x, y, z0 - 9); K.bench(B, M, x, y, z0 - 8.2); K.person(B, M, root, 'westWoman', x - 0.4, y, z0 - 8.2, 0, { pose: 'sit', seat: 0.45 }); K.person(B, M, root, 'norseMan', x + 1.6, y, z0 - 8.4, 0, { pose: 'sit', seat: 0 }); x += 3.4;
    K.bed(B, M, x, y, z0 - 9); K.person(B, M, root, 'tibetWoman', x, y, z0 - 9, 0, { pose: 'lie', seat: 0.45 }); x += 2;
    K.chest(B, M, x, y, z0 - 9); x += 1.8; K.pots(B, M, x, y, z0 - 9); x += 1.6; K.pots(B, M, x, y, z0 - 9, { n: 2, s: 2.6 }); x += 2.4;
    K.sacks(B, M, x, y, z0 - 9); x += 2.6; K.rug(B, M, x, y, z0 - 9); K.hearth(B, M, x, y, z0 - 9, { pot: true }); x += 3;
    K.cart(B, M, x, y, z0 - 9.5, 0.3, { load: 'hay' }); x += 4; K.stall(B, M, x, y, z0 - 9.5); x += 4;
    K.deck(B, M, x, y, z0 - 10, 0, { rails: 'nw', steps: 'e', ladder: 's' }); x += 6.5; K.crawlway(B, M, x, y, z0 - 10, 1.57); x += 4; K.woodpile(B, M, x, y, z0 - 9.5); x += 3.2; K.haystack(B, M, x, y, z0 - 9.5);
    B.build(root);
  }

  /** Debug (?check): can every enemy that walks find a way to where the player starts, and can the places listed in &reach=x,z,y;x,z,y be reached on foot from there? The answer is written into the page. */
  selfCheck() {
    const kinds = {}; for (const e of this.enemies) kinds[e.type] = (kinds[e.type] || 0) + 1;
    const P = this.player.pos, nav = this.nav, out = { level: this.def.id, kinds, bounds: this.world.bounds, spawn: [+P.x.toFixed(1), +P.y.toFixed(1), +P.z.toFixed(1)], enemies: this.enemies.length, boxes: this.world.boxes.length, cyls: this.world.cyls.length, ladders: this.world.ladders.length, navMs: Math.round(this.navMs || 0), noRoute: [], reach: [] };
    if (nav) {
      for (const e of this.enemies) { if (e.static) continue; if (!nav.path(e.pos.x, e.pos.z, P.x, P.z, 60000, e.pos.y, P.y)) out.noRoute.push([e.type, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1), +e.pos.y.toFixed(1)]); }
      for (const q of (params.get('reach') || '').split(';').filter(Boolean)) { const [x, z, y] = q.split(',').map(Number), yy = y ?? this.world.groundAt(x, z, 200); out.reach.push([x, z, +(+yy).toFixed(1), !!nav.path(P.x, P.z, x, z, 60000, P.y, yy)]); }
    }
    const el = document.createElement('pre'); el.id = 'check'; el.textContent = 'CHECK ' + JSON.stringify(out) + ' ENDCHECK'; document.body.appendChild(el);
  }

  async start() {
    await Promise.all(['48px Rye', '48px "Pirata One"', '48px "IM Fell English"', '48px Cinzel'].map((f) => document.fonts.load(f).catch(() => {})));
    const lv = params.has('level') ? clamp(+params.get('level') - 1, 0, LEVELS.length - 1) : params.has('title') ? clamp(+params.get('title') - 1, 0, LEVELS.length - 1) : this.randomChapter();
    this.loadLevel(lv, !params.has('level')); this.cineT = 0;
    if (params.has('level')) { this.fillIntro(); this.setState('intro'); if (params.has('free')) this.begin(); }
    else this.setState('title');
    if (params.has('duel')) { this.openDuel(); $('#dcodein').value = params.get('duel').toUpperCase(); this.duelJoin(params.get('duel')); }   // opened from an invite link
    $('#load').classList.add('off'); $('#load').classList.remove('on');
    if (params.has('cam')) { const v = params.get('cam').split(',').map(Number); this.shot(v[0], v[1], v[2], v[3] || 0, v[4] || 0, v[5] || 72);
      const st = document.createElement('style'); st.textContent = '*{transition:none!important;animation:none!important}#load{display:none!important}'; document.head.appendChild(st); this.gfx.fade = this.gfx.fadeTarget = 1; }   // debug: a still picture from a given place
    if (params.has('kit')) this.kitDemo();
    if (params.has('check')) this.selfCheck();
    this.frame(performance.now());
  }
}

const game = new Game();
window.game = game;
game.start();

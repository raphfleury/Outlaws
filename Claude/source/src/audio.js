// All sound is synthesised live with the Web Audio API - no audio files.
// Effects are shaped noise/tones; music is a small generative band per level
// (plucked strings via the Karplus-Strong algorithm + a lead voice).

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
/**
 * The shots of each kind of gun: the crack of the bullet, the blast (a band of noise closing down), the bark in the middle,
 * the thump in the chest (a low sine falling away), and the echo that rolls back from the buildings.
 */
const GUNS = {
  revolver: { crack: 4500, body: 2600, bark: 700, sub: 82, dur: 0.34, tail: 0.95, rev: 0.7, size: 1.0 },
  pistol: { crack: 6200, body: 3300, bark: 1150, sub: 108, dur: 0.22, tail: 0.6, rev: 0.5, size: 0.75 },
  carbine: { crack: 5600, body: 3000, bark: 820, sub: 76, dur: 0.36, tail: 1.15, rev: 0.75, size: 1.05 },
  rifle: { crack: 7000, body: 3800, bark: 900, sub: 68, dur: 0.4, tail: 1.3, rev: 0.8, size: 1.15 },
  scoped: { crack: 8000, body: 4300, bark: 860, sub: 60, dur: 0.48, tail: 1.7, rev: 0.9, size: 1.3 },
  sten: { crack: 5000, body: 2300, bark: 1350, sub: 104, dur: 0.15, tail: 0.42, rev: 0.35, size: 0.8 },
  mg: { crack: 6000, body: 2800, bark: 1000, sub: 82, dur: 0.2, tail: 0.6, rev: 0.5, size: 1.0 },
  musket: { crack: 3000, body: 1800, bark: 520, sub: 58, dur: 0.65, tail: 1.7, rev: 0.9, size: 1.3 },
  cannon: { crack: 2400, body: 1300, bark: 300, sub: 44, dur: 1.1, tail: 2.4, rev: 1.0, size: 1.8 },
};
/** The resonances of the mouth for a few vowels (a, e, i, o, u, and the one of 'but'), in Hz. */
const VOWELS = [[800, 1200, 2500], [500, 1800, 2500], [300, 2250, 3000], [500, 900, 2400], [350, 800, 2300], [650, 1150, 2600]];

export const SOUND_KEY = 'lonehand-sound';
/** The player's sound settings: four volumes (0..1), music on or off (M), and the microphone of the online voice chat. */
export const SOUND_DEFAULTS = { master: 0.8, effects: 1, voice: 1, music: 0.7, musicOn: true, mic: 'open' };

export class Sound {
  constructor() {
    this.ctx = null; this.mus = null; this.amb = []; this.pluckCache = new Map();
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(SOUND_KEY) || '{}') || {}; } catch (e) { /* no storage: the defaults */ }
    this.set = { ...SOUND_DEFAULTS, ...saved };
    this.onchange = () => {};
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(c.destination);
    // four channels, each with its own volume: effects (shots, steps, the world around), voices (shouts, and in a duel the other player), music
    this.fx = c.createGain(); this.fx.connect(this.master);
    this.voice = c.createGain(); this.voice.connect(this.master);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.fx);
    this.music = c.createGain(); this.music.gain.value = 0.5; this.music.connect(this.musicBus);
    this.ambient = c.createGain(); this.ambient.gain.value = 0.6; this.ambient.connect(this.fx);
    // reverb: convolution with a burst of decaying noise; the music has its own, so that silencing the music silences its echo too
    const len = c.sampleRate * 2.4, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = ir;
    const rg = c.createGain(); rg.gain.value = 0.5; this.rev.connect(rg); rg.connect(this.fx);
    this.revM = c.createConvolver(); this.revM.buffer = ir;
    const rm = c.createGain(); rm.gain.value = 0.5; this.revM.connect(rm); rm.connect(this.musicBus);
    const nb = (this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate));
    const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.apply();
  }
  /** Change one or more settings, keep them for the next visit and apply them at once. */
  change(o) {
    Object.assign(this.set, o);
    try { localStorage.setItem(SOUND_KEY, JSON.stringify(this.set)); } catch (e) { /* no storage: the change lasts for this visit */ }
    this.apply(); this.onchange(this.set);
  }
  apply() {
    const S = this.set;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, to = (g, v) => g.gain.setTargetAtTime(v, t, 0.03);
    to(this.master, S.master); to(this.fx, S.effects); to(this.voice, S.voice); to(this.musicBus, S.musicOn ? S.music : 0);
  }
  toggleMusic() { this.change({ musicOn: !this.set.musicOn }); return this.set.musicOn; }
  get t() { return this.ctx.currentTime; }

  // --- building blocks -----------------------------------------------------
  /** Filtered noise burst. */
  noise(o) {
    const c = this.ctx; if (!c) return;
    const t = o.t ?? c.currentTime, s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'lowpass'; f.Q.value = o.q ?? 0.8;
    f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + (o.att ?? 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(o.dest || this.sfx);
    if (o.rev) { const r = c.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(o.dest === this.music ? this.revM : this.rev); }
    s.start(t, Math.random()); s.stop(t + o.dur + 0.05);
  }
  /** Pitched tone with a decay envelope. */
  tone(o) {
    const c = this.ctx; if (!c) return;
    const t = o.t ?? c.currentTime, os = c.createOscillator(); os.type = o.type || 'sine';
    os.frequency.setValueAtTime(o.f0, t); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + (o.att ?? 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let out = os;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; os.connect(f); out = f; }
    out.connect(g); g.connect(o.dest || this.sfx);
    if (o.rev) { const r = c.createGain(); r.gain.value = o.rev; g.connect(r); r.connect(o.dest === this.music ? this.revM : this.rev); }
    os.start(t); os.stop(t + o.dur + 0.05);
  }

  // --- effects ---------------------------------------------------------------
  /** A shot: deep and full near by, a dull thud with a long echo far away; each kind of gun its own (see GUNS). */
  gun(vol = 1, far = 0, kind = 'rifle') {
    if (!this.ctx) return;
    const G = GUNS[kind] || GUNS.rifle, hf = 1 - far * 0.85, v = vol, j = 0.94 + Math.random() * 0.12;
    this.noise({ type: 'highpass', f0: G.crack * hf + 500, dur: 0.012 + 0.012 * G.size, vol: 0.85 * v * hf, att: 0.001 });
    this.noise({ type: 'lowpass', f0: (G.body * hf + 350) * j, f1: 170, dur: G.dur, vol: 1.0 * v, att: 0.002, rev: G.rev });
    this.noise({ type: 'bandpass', f0: G.bark * j, f1: G.bark * 0.45, dur: G.dur * 0.6, vol: 0.55 * v * (0.4 + 0.6 * hf), q: 0.9, att: 0.002 });
    this.tone({ type: 'sine', f0: G.sub * j, f1: G.sub * 0.38, dur: G.dur * 1.15, vol: 1.15 * v * G.size, att: 0.002 });
    this.noise({ t: this.t + 0.08 + far * 0.12, type: 'lowpass', f0: 650, f1: 110, dur: G.tail, vol: 0.32 * v * G.size, att: 0.05, rev: 0.6 });
  }
  /** Something that sounds from (pan): -1 left, +1 right. Returns the node to connect to. */
  side(pan, dest) {
    if (!pan || !this.ctx.createStereoPanner) return dest;
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)) * 0.8; p.connect(dest); return p;
  }
  /**
   * A voice saying something: syllables of a buzzing tone (its pitch rising and falling as speech does) shaped by three formant
   * filters that move from vowel to vowel, with a consonant before some of them. o: { far, pan, female, loud (a shout), n (syllables) }.
   */
  babble(o = {}) {
    if (!this.ctx) return;
    const c = this.ctx, far = o.far ?? 0, v = Math.max(0.04, 1 - far) * (o.loud ? 0.42 : 0.16), base = (o.female ? 215 : 118) * (o.loud ? 1.45 : 1) * (0.9 + Math.random() * 0.2);
    const n = o.n ?? 3 + Math.floor(Math.random() * 4), syl = o.loud ? 0.17 : 0.14, t0 = this.t + 0.02, end = t0 + n * syl;
    const os = c.createOscillator(); os.type = 'sawtooth';
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600 - far * 2400;
    const fs = [0, 1, 2].map((i) => { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = [5, 8, 9][i]; const fg = c.createGain(); fg.gain.value = [1.0, 0.55, 0.3][i]; os.connect(f); f.connect(fg); fg.connect(lp); return f; });
    lp.connect(g); g.connect(this.side(o.pan, this.voice));
    const r = c.createGain(); r.gain.value = 0.18; g.connect(r); r.connect(this.rev);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * syl, V = VOWELS[Math.floor(Math.random() * VOWELS.length)], up = k === n - 1 && Math.random() < 0.3 ? 1.15 : 1;
      const p = base * (1 + 0.12 * Math.sin(k * 1.7 + Math.random())) * (1 - 0.18 * k / n) * up * (o.female ? 1.08 : 1);
      os.frequency.setTargetAtTime(p, t, 0.025);
      fs.forEach((f, i) => f.frequency.setTargetAtTime(V[i] * (o.female ? 1.15 : 1), t, 0.02));
      g.gain.setTargetAtTime(v, t + 0.01, 0.015); g.gain.setTargetAtTime(v * 0.15, t + syl * 0.72, 0.02);
      if (Math.random() < 0.55) this.noise({ t, type: Math.random() < 0.5 ? 'highpass' : 'bandpass', f0: 2600 + Math.random() * 2400, dur: 0.035 + Math.random() * 0.03, vol: v * 0.45, q: 1.2, dest: this.side(o.pan, this.voice) });
    }
    g.gain.setTargetAtTime(0.0001, end, 0.03);
    os.start(t0); os.stop(end + 0.25);
  }
  /** A man's (or woman's) cry as he falls: a short open 'ah' that breaks and falls away, with breath in it. */
  cry(o = {}) {
    if (!this.ctx) return;
    const c = this.ctx, far = o.far ?? 0, v = Math.max(0.05, 1 - far) * 0.32, t = this.t, d = 0.42 + Math.random() * 0.25, b = (o.female ? 330 : 190) * (0.9 + Math.random() * 0.25);
    const os = c.createOscillator(); os.type = 'sawtooth';
    os.frequency.setValueAtTime(b * 1.25, t); os.frequency.linearRampToValueAtTime(b * 1.45, t + 0.07); os.frequency.exponentialRampToValueAtTime(b * 0.55, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    const out = this.side(o.pan, this.voice), A = VOWELS[0], U = VOWELS[4];
    for (let i = 0; i < 3; i++) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6; f.frequency.setValueAtTime(A[i], t); f.frequency.linearRampToValueAtTime(U[i], t + d); const fg = c.createGain(); fg.gain.value = [1, 0.5, 0.25][i]; os.connect(f); f.connect(fg); fg.connect(g); }
    g.connect(out); const r = c.createGain(); r.gain.value = 0.3; g.connect(r); r.connect(this.rev);
    this.noise({ t: t + d * 0.6, type: 'bandpass', f0: 1200, f1: 500, dur: 0.3, vol: v * 0.3, q: 0.8, dest: out });
    os.start(t); os.stop(t + d + 0.05);
  }
  /** A car's engine going by: a low hum with a little rattle. */
  engine(far = 0) { if (!this.ctx) return; const v = Math.max(0.03, 1 - far); this.noise({ type: 'lowpass', f0: 380, f1: 220, dur: 0.22, vol: v * 0.18 }); this.tone({ type: 'sawtooth', f0: 52 + Math.random() * 6, dur: 0.2, vol: v * 0.06, lp: 300 }); }
  /** A dog's last whimper. */
  /**
   * An animal's cry: a horse neighs, cattle low, a yak grunts, a goat or a sheep bleats, a pig squeals, a hen clucks.
   * hurt: the cry of a wounded or dying animal (higher, shorter).
   */
  beast(kind, far = 0, pan = 0, hurt = false) {
    if (!this.ctx) return;
    const v = Math.max(0.05, 1 - far), t = this.t, dest = this.side(pan, this.sfx), k = hurt ? 1.25 : 1;
    const say = (o) => this.tone({ dest, rev: 0.12, ...o });
    switch (kind) {
      case 'horse': case 'pony': case 'mule':                // a neigh: high, shaking, falling away
        for (let i = 0; i < 7; i++) say({ t: t + i * 0.09, type: 'sawtooth', f0: (950 - i * 70) * k, f1: (820 - i * 70) * k, dur: 0.11, vol: v * 0.13, lp: 2400 });
        this.noise({ t: t + 0.66, type: 'bandpass', f0: 900, dur: 0.25, vol: v * 0.12, q: 0.8, dest });   // and a snort
        break;
      case 'cow': case 'ox': say({ type: 'sawtooth', f0: 150 * k, f1: 118 * k, dur: hurt ? 0.7 : 1.3, vol: v * 0.3, lp: 650, att: 0.12 }); break;
      case 'yak': say({ type: 'sawtooth', f0: 105 * k, f1: 78 * k, dur: hurt ? 0.5 : 0.8, vol: v * 0.32, lp: 480, att: 0.06 }); break;
      case 'goat': case 'sheep':                               // a bleat: a trembling voice
        for (let i = 0; i < 6; i++) say({ t: t + i * 0.075, type: 'sawtooth', f0: (kind === 'goat' ? 560 : 430) * k, f1: (kind === 'goat' ? 520 : 400) * k, dur: 0.08, vol: v * 0.12, lp: 1800 });
        break;
      case 'pig': say({ type: 'square', f0: 820 * k, f1: 1250 * k, dur: 0.18, vol: v * 0.08, lp: 3000 }); say({ t: t + 0.18, type: 'square', f0: 1250 * k, f1: 700, dur: 0.25, vol: v * 0.08, lp: 3000 }); break;
      case 'hen': for (let i = 0; i < 3; i++) say({ t: t + i * 0.13, type: 'triangle', f0: 720 * k, f1: 520, dur: 0.07, vol: v * 0.12 }); break;
      case 'dog': if (hurt) this.whimper(far, pan); else this.bark(); break;
    }
  }
  whimper(far = 0, pan = 0) { if (!this.ctx) return; const v = Math.max(0.05, 1 - far) * 0.2; this.tone({ type: 'triangle', f0: 900, f1: 420, dur: 0.45, vol: v, dest: this.side(pan, this.voice) }); }
  bow() {
    this.tone({ type: 'sawtooth', f0: 210, f1: 80, dur: 0.16, vol: 0.35, lp: 1800 });
    this.noise({ type: 'bandpass', f0: 900, f1: 2600, dur: 0.22, vol: 0.28, q: 1.4 });
  }
  crossbow() {
    this.tone({ type: 'square', f0: 130, f1: 55, dur: 0.1, vol: 0.4, lp: 1200 });
    this.noise({ type: 'highpass', f0: 2500, dur: 0.05, vol: 0.4 });
    this.noise({ type: 'bandpass', f0: 800, f1: 2400, dur: 0.2, vol: 0.25, q: 1.2 });
  }
  slash() {
    this.noise({ type: 'bandpass', f0: 700, f1: 4200, dur: 0.2, vol: 0.5, q: 1.8, att: 0.03 });
    this.tone({ type: 'triangle', f0: 3200, f1: 5200, dur: 0.25, vol: 0.05, rev: 0.5 });
  }
  clank() {
    for (const f of [1900, 2850, 4300]) this.tone({ type: 'triangle', f0: f, dur: 0.35, vol: 0.12, rev: 0.4 });
    this.noise({ type: 'highpass', f0: 3000, dur: 0.05, vol: 0.4 });
  }
  thud() { this.noise({ type: 'lowpass', f0: 600, f1: 150, dur: 0.12, vol: 0.7 }); this.tone({ f0: 110, f1: 60, dur: 0.1, vol: 0.5 }); }
  tick() { this.noise({ type: 'highpass', f0: 1800, dur: 0.05, vol: 0.3 }); }
  hitmark() { this.tone({ type: 'triangle', f0: 1250, dur: 0.07, vol: 0.2 }); }
  killmark() { this.tone({ type: 'triangle', f0: 880, dur: 0.12, vol: 0.22 }); this.tone({ type: 'triangle', f0: 1320, dur: 0.2, vol: 0.2, t: this.ctx ? this.t + 0.08 : 0 }); }
  hurt() { this.tone({ type: 'sawtooth', f0: 150, f1: 70, dur: 0.28, vol: 0.45, lp: 900 }); this.noise({ type: 'lowpass', f0: 800, dur: 0.15, vol: 0.5 }); }
  step(wood, k = 1) {
    this.noise({ type: 'lowpass', f0: wood ? 1100 : 650, f1: 200, dur: 0.08, vol: (wood ? 0.16 : 0.11) * k });
    if (wood) this.tone({ f0: 150 + Math.random() * 40, f1: 90, dur: 0.07, vol: 0.12 * k });
  }
  click(f = 2600) { this.noise({ type: 'bandpass', f0: f, dur: 0.035, vol: 0.4, q: 3 }); }
  whiz() { this.noise({ type: 'bandpass', f0: 3200, f1: 900, dur: 0.16, vol: 0.3, q: 4, att: 0.02 }); }
  pickup() { if (!this.ctx) return; this.tone({ f0: 660, dur: 0.25, vol: 0.2, rev: 0.4 }); this.tone({ f0: 990, dur: 0.4, vol: 0.2, t: this.t + 0.1, rev: 0.4 }); }
  shout() {
    if (!this.ctx) return;
    const f = 160 + Math.random() * 90;
    this.tone({ type: 'sawtooth', f0: f * 1.2, f1: f * 0.8, dur: 0.22, vol: 0.16, lp: 1100, rev: 0.3, dest: this.voice });
  }
  bark() {
    if (!this.ctx) return;
    for (const d of [0, 0.16]) { this.tone({ t: this.t + d, type: 'sawtooth', f0: 420, f1: 190, dur: 0.11, vol: 0.3, lp: 1500, rev: 0.25 }); this.noise({ t: this.t + d, type: 'bandpass', f0: 900, dur: 0.09, vol: 0.2, q: 1.5 }); }
  }
  /** Something breaks: wood splinters, or a clay jar shatters. */
  smash(kind = 'wood', far = 0) {
    if (!this.ctx) return;
    const v = Math.max(0.15, 1 - far);
    if (kind === 'paper') { this.noise({ type: 'highpass', f0: 1800, f1: 900, dur: 0.25, vol: 0.35 * v, att: 0.01 }); return; }
    if (kind === 'straw' || kind === 'cloth') { this.noise({ type: 'lowpass', f0: 1400, f1: 300, dur: 0.35, vol: 0.55 * v, att: 0.02 }); return; }
    if (kind === 'clay') { this.noise({ type: 'highpass', f0: 2600, dur: 0.18, vol: 0.45 * v }); for (const f of [2300, 3400]) this.tone({ type: 'triangle', f0: f * (0.9 + Math.random() * 0.2), dur: 0.12, vol: 0.06 * v }); }
    else { this.noise({ type: 'bandpass', f0: 900, f1: 300, dur: 0.22, vol: 0.6 * v, q: 0.9 }); for (let i = 0; i < 3; i++) this.noise({ t: this.t + 0.03 + i * 0.045, type: 'bandpass', f0: 1800 + Math.random() * 900, dur: 0.05, vol: 0.25 * v, q: 2 }); }
  }
  /** An explosion: the crack, the deep boom and the rumble that rolls on. */
  boom(far = 0) {
    if (!this.ctx) return;
    const v = Math.max(0.12, 1 - far);
    this.noise({ type: 'lowpass', f0: 5000 - far * 4000, f1: 120, dur: 1.4, vol: 1.1 * v, rev: 0.9 });
    this.tone({ f0: 90, f1: 28, dur: 0.9, vol: 1.0 * v });
    this.noise({ t: this.t + 0.08, type: 'lowpass', f0: 400, f1: 80, dur: 2.2, vol: 0.5 * v, att: 0.2, rev: 0.6 });
  }
  /** A bystander cries out in fright (or, short, when hit). On the voices channel. */
  scream(far = 0, short = false) {
    if (!this.ctx) return;
    const v = Math.max(0.1, 1 - far) * 0.16, f = 520 + Math.random() * 380, d = short ? 0.28 : 0.6 + Math.random() * 0.3, c = this.ctx, t = this.t;
    const os = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
    os.type = 'sawtooth'; os.frequency.setValueAtTime(f, t); os.frequency.linearRampToValueAtTime(f * 1.25, t + d * 0.3); os.frequency.exponentialRampToValueAtTime(f * 0.7, t + d);
    lfo.frequency.value = 9; lg.gain.value = f * 0.04; lfo.connect(lg); lg.connect(os.frequency);
    lp.type = 'bandpass'; lp.frequency.value = 1400; lp.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    os.connect(lp); lp.connect(g); g.connect(this.voice);
    const r = c.createGain(); r.gain.value = 0.3; g.connect(r); r.connect(this.rev);
    os.start(t); lfo.start(t); os.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
  }
  /** A bystander says something to the player: a few murmured syllables. */
  murmur(far = 0) {
    if (!this.ctx) return;
    const v = Math.max(0.1, 1 - far) * 0.1, base = 140 + Math.random() * 110;
    for (let i = 0, n = 3 + Math.floor(Math.random() * 4); i < n; i++) {
      const f = base * (0.9 + Math.random() * 0.35);
      this.tone({ t: this.t + i * 0.17, type: 'sawtooth', f0: f, f1: f * (0.85 + Math.random() * 0.3), dur: 0.13, vol: v, lp: 900 + Math.random() * 500, dest: this.voice });
    }
  }
  /** A punch: the swish of the fist, and the blow when it lands. */
  punch(hit = false) { this.noise({ type: 'bandpass', f0: 600, f1: 1800, dur: 0.12, vol: 0.25, q: 1.2, att: 0.02 }); if (hit) { this.noise({ type: 'lowpass', f0: 500, f1: 120, dur: 0.1, vol: 0.7 }); this.tone({ f0: 95, f1: 55, dur: 0.09, vol: 0.5 }); } }

  /** Birds taking wing all at once. */
  flutter(far = 0) { if (!this.ctx) return; const v = Math.max(0.08, 1 - far) * 0.3; for (let i = 0; i < 7; i++) this.noise({ t: this.t + i * 0.05 + Math.random() * 0.03, type: 'bandpass', f0: 1300 + Math.random() * 900, dur: 0.06, vol: v, q: 1.5 }); }
  /** A gust of wind. */
  gust(snow = false) { if (!this.ctx) return; this.noise({ type: 'bandpass', f0: snow ? 900 : 600, f1: snow ? 1600 : 1100, dur: 2.6, vol: 0.12, q: 0.6, att: 0.8, dest: this.ambient }); }
  /** The train: a steam whistle, the bell, and the beat of the engine. */
  whistle(far = 0) { if (!this.ctx) return; const v = Math.max(0.06, 1 - far) * 0.16; for (const f of [587, 740, 880]) this.tone({ type: 'triangle', f0: f, dur: 1.3, vol: v, att: 0.08, rev: 0.6 }); this.noise({ type: 'bandpass', f0: 2400, dur: 1.3, vol: v * 0.6, q: 3, att: 0.08 }); }
  bell(far = 0) { if (!this.ctx) return; const v = Math.max(0.05, 1 - far) * 0.12; for (const f of [1046, 1568, 2637]) this.tone({ type: 'triangle', f0: f, dur: 0.9, vol: v * (f > 2000 ? 0.4 : 1), rev: 0.5 }); }
  /** The deer scarer of a Japanese garden: its hollow bamboo knocks on a stone (tock), and before that empties its water into the basin (pour). far 0..1, pan -1 (left)..1. */
  tock(far = 0, pan = 0) { if (!this.ctx) return; const v = Math.max(0, 1 - far) ** 1.5, d = this.side(pan, this.sfx); this.tone({ type: 'triangle', f0: 560, f1: 430, dur: 0.12, vol: 0.6 * v, att: 0.002, rev: 0.5, dest: d }); this.tone({ f0: 1180, f1: 900, dur: 0.05, vol: 0.22 * v, att: 0.001, dest: d }); this.noise({ type: 'bandpass', f0: 1700, dur: 0.03, vol: 0.45 * v, q: 2.5, att: 0.001, dest: d }); }
  pour(far = 0, pan = 0) { if (!this.ctx) return; const v = Math.max(0, 1 - far) ** 2; this.noise({ type: 'bandpass', f0: 2600, f1: 1300, dur: 0.7, vol: 0.12 * v, q: 0.9, att: 0.08, dest: this.side(pan, this.sfx) }); }
  chuff(far = 0) { if (!this.ctx) return; this.noise({ type: 'lowpass', f0: 1400 - far * 900, f1: 300, dur: 0.22, vol: Math.max(0.04, 1 - far) * 0.35, att: 0.01 }); }
  /** The tank: the engine's growl and the clatter of the tracks. */
  rumble(far = 0) { if (!this.ctx) return; const v = Math.max(0.04, 1 - far); this.noise({ type: 'lowpass', f0: 260, f1: 140, dur: 0.18, vol: v * 0.32 }); if (Math.random() < 0.5) this.noise({ type: 'bandpass', f0: 1800, dur: 0.04, vol: v * 0.08, q: 4 }); }
  /** A pin put on the map, or taken away. */
  mark(on = true, mate = false) {
    if (!this.ctx) return;
    if (mate) { for (const [i, f] of [[0, 988], [1, 1319], [2, 1760]]) this.tone({ t: this.t + i * 0.09, type: 'sine', f0: f, dur: 0.22, vol: 0.16, rev: 0.4 }); return; }   // the partner's mark: a clear three-note ping
   this.tone({ type: 'triangle', f0: on ? 1320 : 990, dur: 0.12, vol: 0.12 }); this.tone({ type: 'triangle', f0: on ? 1760 : 740, dur: 0.16, vol: 0.1, t: this.t + 0.07 }); }
  /** Weapons changed in the hands. */
  swap() { this.noise({ type: 'bandpass', f0: 1300, dur: 0.06, vol: 0.22, q: 2 }); this.noise({ t: this.ctx ? this.t + 0.09 : 0, type: 'bandpass', f0: 2100, dur: 0.04, vol: 0.18, q: 3 }); }
  /** Drinking or eating. */
  gulp() { if (!this.ctx) return; for (let i = 0; i < 3; i++) this.tone({ t: this.t + i * 0.16, type: 'sine', f0: 260 + i * 30, f1: 160, dur: 0.1, vol: 0.18, lp: 900 }); }
  /** A special skill set going: a short rising chord (lower for strength, higher for the eye). */
  skill(id) { if (!this.ctx) return; const f = { fury: 160, shield: 200, dash: 300, mend: 330, vanish: 440, deadeye: 520, eagle: 600 }[id] || 300; for (const [i, m] of [[0, 1], [1, 1.5], [2, 2]]) this.tone({ t: this.t + i * 0.06, type: 'triangle', f0: f * m, f1: f * m * 1.06, dur: 0.35, vol: 0.12, att: 0.02, rev: 0.5 }); }
  /** A named place found: a soft low chord. */
  discover() { if (!this.ctx) return; for (const [i, f] of [[0, 220], [1, 277], [2, 330]]) this.tone({ t: this.t + i * 0.05, type: 'triangle', f0: f, dur: 1.4, vol: 0.07, att: 0.15, rev: 0.7 }); }
  /** A blowgun: a short puff of breath, hardly heard. */
  blow() { this.noise({ type: 'bandpass', f0: 1100, f1: 500, dur: 0.09, vol: 0.18, q: 0.8, att: 0.01 }); }
  /** A sling let fly: the strap cracks. */
  sling() { this.noise({ type: 'bandpass', f0: 2600, f1: 1200, dur: 0.07, vol: 0.3, q: 2 }); }
  /** A blade through the air. */
  swish() { this.noise({ type: 'bandpass', f0: 1600, f1: 4200, dur: 0.16, vol: 0.22, q: 1.6, att: 0.03 }); }
  /** A bottle of oil bursting into flame, and the fire crackling. */
  flame(far = 0) { if (!this.ctx) return; const v = Math.max(0.08, 1 - far); this.noise({ type: 'highpass', f0: 3000, dur: 0.12, vol: 0.4 * v }); this.noise({ type: 'lowpass', f0: 1600, f1: 300, dur: 1.2, vol: 0.7 * v, att: 0.05, rev: 0.4 }); }
  crackle(far = 0) { if (!this.ctx) return; const v = Math.max(0.05, 1 - far) * 0.2; for (let i = 0; i < 4; i++) this.noise({ t: this.t + Math.random() * 0.3, type: 'bandpass', f0: 1500 + Math.random() * 2500, dur: 0.03, vol: v, q: 3 }); }
  fuse() { this.noise({ type: 'highpass', f0: 4200, dur: 0.5, vol: 0.12, att: 0.05 }); }
  poof() { this.noise({ type: 'lowpass', f0: 2400, f1: 300, dur: 0.4, vol: 0.4, att: 0.02 }); }
  fanfare(kind) {
    if (!this.ctx) return;
    const base = kind === 'japan' ? [62, 67, 69, 74] : kind === 'swiss' ? [65, 69, 72, 77] : kind === 'greece' ? [62, 65, 69, 74] : kind === 'north' ? [50, 57, 62, 65] : kind === 'war' ? [57, 60, 64, 72] : kind === 'russia' ? [52, 57, 60, 64] : kind === 'tibet' ? [62, 64, 69, 74] : [57, 60, 64, 69];
    base.forEach((n, i) => this.pluck(n, this.t + i * 0.16, 0.5, 0.7));
    this.pluck(base[0] - 12, this.t, 0.5, 0.5);
  }
  sting() { if (!this.ctx) return; [45, 44, 40].forEach((n, i) => this.pluck(n, this.t + i * 0.35, 0.6, 0.3)); }

  // --- music -----------------------------------------------------------------
  /** Karplus-Strong plucked string: a noise burst circulating in a short, slowly damped loop. */
  pluckBuffer(freq, bright) {
    const key = Math.round(freq * 10) + ':' + bright;
    let b = this.pluckCache.get(key);
    if (b) return b;
    const sr = this.ctx.sampleRate, N = Math.max(2, Math.round(sr / freq)), len = Math.floor(sr * 2.2);
    b = this.ctx.createBuffer(1, len, sr);
    const out = b.getChannelData(0), ring = new Float32Array(N);
    let prev = 0;
    for (let i = 0; i < N; i++) { const w = Math.random() * 2 - 1; prev = prev + (w - prev) * bright; ring[i] = prev; }
    const decay = 0.9955 - Math.min(0.004, freq / 400000);
    for (let i = 0, k = 0; i < len; i++) {
      out[i] = ring[k];
      const nx = (k + 1) % N;
      ring[k] = (ring[k] + ring[nx]) * 0.5 * decay;
      k = nx;
    }
    this.pluckCache.set(key, b);
    return b;
  }
  pluck(note, t, vol = 0.4, bright = 0.5, dest) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.pluckBuffer(midi(note), bright);
    const g = this.ctx.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(dest || this.music);
    const r = this.ctx.createGain(); r.gain.value = 0.35; g.connect(r); r.connect(dest && dest !== this.music ? this.rev : this.revM);
    s.start(t);
  }
  /** Sustained lead voice. kind: whistle | flute | horn */
  lead(kind, note, t, dur, vol = 0.12) {
    const c = this.ctx; if (!c) return;
    const f = midi(note), os = c.createOscillator(), g = c.createGain();
    os.type = kind === 'horn' ? 'sawtooth' : kind === 'flute' ? 'triangle' : 'sine';
    const scoop = kind === 'flute' ? 0.955 : kind === 'horn' ? 0.985 : 0.97;
    os.frequency.setValueAtTime(f * scoop, t); os.frequency.exponentialRampToValueAtTime(f, t + (kind === 'flute' ? 0.22 : 0.08));
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = kind === 'horn' ? 4.2 : 5.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur * 0.7, 0.6));
    lfo.connect(lg); lg.connect(os.frequency);
    const att = kind === 'horn' ? 0.14 : kind === 'flute' ? 0.12 : 0.05;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + Math.max(att, dur - 0.12)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
    let out = os;
    if (kind === 'horn') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 1.2; os.connect(lp); out = lp; }
    out.connect(g); g.connect(this.music);
    const r = c.createGain(); r.gain.value = 0.7; g.connect(r); r.connect(this.revM);
    os.start(t); lfo.start(t); os.stop(t + dur + 0.2); lfo.stop(t + dur + 0.2);
    if (kind !== 'horn') this.noise({ t, type: 'bandpass', f0: f * 2, q: 6, dur: dur + 0.1, vol: vol * (kind === 'flute' ? 0.5 : 0.18), att, dest: this.music, rev: 0.5 });
  }

  startMusic(kind) {
    this.stopMusic();
    if (!this.ctx) return;
    const dt = { west: 0.29, japan: 0.4, swiss: 0.46, greece: 0.23, north: 0.34, war: 0.27, russia: 0.3, tibet: 0.44, aztec: 0.24 }[kind] || 0.3;
    this.mus = { kind, k: 0, next: this.t + 0.4, dt, walk: 2 };
    this.mus.timer = setInterval(() => {
      const m = this.mus; if (!m || !this.ctx) return;
      while (m.next < this.t + 0.5) { this['music_' + m.kind](m.k, m.next, m); m.next += m.dt; m.k++; }
    }, 110);
  }
  stopMusic() { if (this.mus) { clearInterval(this.mus.timer); this.mus = null; } }

  music_west(k, t, m) {
    const chords = [[45, 57, 60, 64], [48, 60, 64, 67], [43, 59, 62, 67], [45, 57, 60, 64], [50, 57, 62, 65], [45, 57, 60, 64], [40, 59, 64, 68], [45, 57, 60, 64]];
    const bar = Math.floor(k / 8) % 8, s = k % 8, ch = chords[bar];
    if (s === 0) this.pluck(ch[0], t, 0.5, 0.35);
    if (s === 4) this.pluck(ch[0] + 7, t, 0.38, 0.35);
    if (s === 2 || s === 3 || s === 6 || s === 7) this.pluck(ch[1 + ((s + bar) % 3)], t, 0.22, 0.6);
    if (s === 0 && bar % 2 === 0) this.tone({ t, f0: 90, f1: 50, dur: 0.3, vol: 0.25, dest: this.music });
    const mel = [[[0, 3, 76], [3, 5, 81]], [[0, 3, 79], [3, 5, 76]], [[0, 3, 74], [3, 1, 76], [4, 4, 74]], [[0, 2, 72], [2, 6, 69]],
      [[0, 3, 74], [3, 5, 77]], [[0, 3, 76], [3, 5, 72]], [[0, 3, 71], [3, 2, 74], [5, 3, 76]], [[0, 7, 69]]];
    if (Math.floor(k / 64) % 2 === 1) for (const n of mel[bar]) if (n[0] === s) this.lead('whistle', n[2], t, n[1] * m.dt * 0.95, 0.1);
  }
  music_japan(k, t, m) {
    const sc = [62, 63, 67, 69, 70, 74, 75, 79];
    const s = k % 16;
    if (s === 0) this.pluck(38, t, 0.5, 0.3);
    if (s === 8 && Math.random() < 0.6) this.pluck(50, t, 0.35, 0.4);
    if (Math.random() < (s % 2 === 0 ? 0.55 : 0.2)) {
      m.walk = Math.max(0, Math.min(sc.length - 1, m.walk + Math.floor(Math.random() * 5) - 2));
      this.pluck(sc[m.walk], t, 0.36, 0.85);
      if (Math.random() < 0.18) this.pluck(sc[Math.max(0, m.walk - 1)], t + m.dt * 0.5, 0.25, 0.85);
    }
    if (k % 32 === 4) { const n = [69, 74, 70, 67][Math.floor(k / 32) % 4]; this.lead('flute', n, t, m.dt * 9, 0.11); this.lead('flute', n - 2, t + m.dt * 10, m.dt * 4, 0.08); }
    if (k % 64 === 0) { this.tone({ t, f0: 85, f1: 48, dur: 0.6, vol: 0.5, dest: this.music, rev: 0.5 }); }
  }
  music_swiss(k, t, m) {
    const chords = [[41, 57, 60], [41, 57, 60], [36, 55, 60], [36, 58, 64], [41, 57, 60], [46, 58, 62], [36, 55, 64], [41, 57, 60]];
    const bar = Math.floor(k / 3) % 8, s = k % 3, ch = chords[bar];
    if (s === 0) this.pluck(ch[0], t, 0.5, 0.35);
    else { this.pluck(ch[1], t, 0.2, 0.6); this.pluck(ch[2], t + 0.02, 0.2, 0.6); }
    const mel = [[[0, 3, 72]], [[0, 1, 69], [1, 2, 72]], [[0, 3, 67]], [[0, 1, 67], [1, 1, 70], [2, 1, 72]], [[0, 1, 69], [1, 2, 72]], [[0, 3, 74]], [[0, 2, 72], [2, 1, 67]], [[0, 3, 65]]];
    if (Math.floor(k / 24) % 2 === 1) for (const n of mel[bar]) if (n[0] === s) this.lead('horn', n[2] - 12, t, n[1] * m.dt * 0.95, 0.2);
  }

  music_aztec(k, t, m) {
    // the great drum and the two-toned slit drum, rattles, a clay flute in five notes, and now and then a conch
    const s = k % 16, bar = Math.floor(k / 16), sc = [62, 65, 67, 69, 72, 74, 77];
    if (s === 0 || s === 6 || s === 10) this.tone({ t, f0: 96, f1: 52, dur: 0.34, vol: s === 0 ? 0.5 : 0.3, dest: this.music, rev: 0.3 });
    if ([2, 3, 5, 8, 11, 13, 14].includes(s)) this.tone({ t, type: 'triangle', f0: s % 3 === 2 ? 330 : 247, dur: 0.09, vol: 0.15, dest: this.music });
    if (s % 2 === 1) this.noise({ t, type: 'highpass', f0: 5200, dur: 0.05, vol: 0.045, q: 0.7, dest: this.music });
    if (bar % 4 >= 2 && (s === 0 || s === 4 || s === 7 || s === 12)) { m.walk = Math.max(0, Math.min(sc.length - 1, m.walk + Math.floor(Math.random() * 5) - 2)); this.lead('flute', sc[m.walk] + 12, t, m.dt * (s === 12 ? 3.5 : 2.6), 0.1); }
    if (bar % 8 === 7 && s === 0) this.lead('horn', 50, t, m.dt * 14, 0.2);
  }

  music_greece(k, t, m) {
    // lyre and reed pipe in the Dorian mode, in a limping 7-beat measure (3+2+2)
    const sc = [62, 64, 65, 67, 69, 71, 72, 74, 76], s = k % 7, bar = Math.floor(k / 7);
    if (s === 0) { this.pluck(38, t, 0.5, 0.3); this.tone({ t, f0: 110, f1: 70, dur: 0.22, vol: 0.3, dest: this.music }); }
    if (s === 3 || s === 5) { this.tone({ t, f0: 190, f1: 120, dur: 0.1, vol: 0.14, dest: this.music }); this.pluck(50, t, 0.3, 0.4); }
    const arp = [0, 4, 2, 4, 1, 3, 2][s] + (bar % 4 === 2 ? 1 : 0) + (bar % 8 > 5 ? 2 : 0);
    this.pluck(sc[Math.min(sc.length - 1, arp)], t, 0.26, 0.8);
    const mel = [[0, 3, 69], [3, 2, 72], [5, 2, 71]], mel2 = [[0, 3, 74], [3, 4, 72]], mel3 = [[0, 2, 71], [2, 1, 69], [3, 4, 67]], mel4 = [[0, 7, 69]];
    if (Math.floor(bar / 8) % 2 === 1) for (const n of [mel, mel2, mel3, mel4][bar % 4]) if (n[0] === s) this.lead('flute', n[2], t, n[1] * m.dt * 0.95, 0.09);
  }
  music_north(k, t, m) {
    // slow war drum, a droning bowed lyre and a distant horn
    const s = k % 8, bar = Math.floor(k / 8), roots = [38, 38, 36, 38, 41, 38, 36, 38][bar % 8];
    if (s === 0 || s === 5) this.tone({ t, f0: 82, f1: 44, dur: 0.5, vol: s === 0 ? 0.5 : 0.32, dest: this.music, rev: 0.5 });
    if (s === 3) this.noise({ t, type: 'bandpass', f0: 240, dur: 0.12, vol: 0.12, q: 2, dest: this.music });
    if (s === 0) { this.pluck(roots, t, 0.5, 0.25); this.pluck(roots + 7, t + 0.03, 0.3, 0.25); }
    if (s === 2 || s === 6) this.pluck([62, 65, 57, 60, 62, 67, 65, 62][(bar + s) % 8], t, 0.24, 0.5);
    const mel = [[[0, 6, 50]], [[0, 3, 53], [4, 4, 50]], [[0, 6, 48]], [[0, 8, 50]]];
    if (Math.floor(bar / 4) % 2 === 1) for (const n of mel[bar % 4]) if (n[0] === s) this.lead('horn', n[2], t, n[1] * m.dt * 0.95, 0.2);
  }

  music_war(k, t, m) {
    // muffled snare march, low strings and a lone bugle in A minor
    const s = k % 8, bar = Math.floor(k / 8), chords = [[45, 57, 60], [45, 57, 60], [41, 57, 60], [43, 55, 59], [45, 57, 60], [38, 57, 62], [40, 56, 59], [45, 57, 60]], ch = chords[bar % 8];
    if (s === 0 || s === 4) this.tone({ t, f0: 70, f1: 46, dur: 0.3, vol: 0.3, dest: this.music });
    if ([2, 3, 6].includes(s) || (s === 7 && bar % 2)) this.noise({ t, type: 'bandpass', f0: 1700, dur: 0.07, vol: s === 3 ? 0.1 : 0.16, q: 1.2, dest: this.music });
    if (s === 0) { this.pluck(ch[0], t, 0.45, 0.25); this.pluck(ch[1], t + 0.02, 0.2, 0.3); }
    if (s === 4) this.pluck(ch[2], t, 0.2, 0.3);
    const mel = [[[0, 6, 57]], [[0, 2, 60], [2, 6, 64]], [[0, 6, 65]], [[0, 3, 62], [4, 4, 59]], [[0, 6, 60]], [[0, 2, 62], [2, 6, 65]], [[0, 6, 64]], [[0, 8, 57]]];
    if (Math.floor(bar / 8) % 2 === 1) for (const n of mel[bar % 8]) if (n[0] === s) this.lead('horn', n[2], t, n[1] * m.dt * 0.95, 0.16);
  }

  music_russia(k, t, m) {
    // a slow minor waltz: bass, two soft chords, and a balalaika trembling above
    const chords = [[45, 57, 60], [45, 57, 60], [50, 57, 62], [45, 57, 60], [52, 56, 59], [45, 57, 60], [50, 53, 57], [52, 56, 59]];
    const bar = Math.floor(k / 6) % 8, s = k % 6, ch = chords[bar];
    if (s === 0) { this.pluck(ch[0] - 12, t, 0.5, 0.25); this.tone({ t, f0: 80, f1: 52, dur: 0.3, vol: 0.2, dest: this.music }); }
    if (s === 2 || s === 4) { this.pluck(ch[1], t, 0.18, 0.5); this.pluck(ch[2], t + 0.02, 0.18, 0.5); }
    const mel = [76, 72, 74, 69, 71, 72, 77, 76][bar], mel2 = [72, 69, 77, 72, 68, 69, 74, 71][bar];
    if (Math.floor(k / 48) % 2 === 1) for (let i = 0; i < 2; i++) this.pluck(s < 3 ? mel : mel2, t + i * m.dt * 0.5, 0.2, 0.9);
    if (k % 96 === 48) this.lead('horn', 45, t, m.dt * 10, 0.12);
  }
  music_tibet(k, t, m) {
    // long horns, a singing bowl, a few bells and a flute in the five notes of the plateau
    const s = k % 16, bar = Math.floor(k / 16), sc = [62, 64, 67, 69, 71, 74, 76, 79];
    if (s === 0) { this.lead('horn', 38, t, m.dt * 13, 0.2); if (bar % 2 === 0) this.lead('horn', 45, t + m.dt * 2, m.dt * 10, 0.1); }
    if (s === 8) { this.tone({ t, type: 'sine', f0: 587, dur: 2.6, vol: 0.06, dest: this.music, rev: 0.8 }); this.tone({ t, type: 'sine', f0: 880.5, dur: 2.0, vol: 0.03, dest: this.music, rev: 0.8 }); }
    if (s % 4 === 2 && Math.random() < 0.5) this.tone({ t, type: 'triangle', f0: 1760 + Math.random() * 400, dur: 0.5, vol: 0.035, dest: this.music, rev: 0.9 });
    if (s === 0 && bar % 4 === 3) this.tone({ t, f0: 70, f1: 44, dur: 0.8, vol: 0.4, dest: this.music, rev: 0.6 });
    if (bar % 4 >= 2 && (s === 4 || s === 9 || s === 12)) { m.walk = Math.max(0, Math.min(sc.length - 1, m.walk + Math.floor(Math.random() * 5) - 2)); this.lead('flute', sc[m.walk], t, m.dt * (s === 12 ? 3.5 : 3), 0.09); }
  }

  // --- ambience ----------------------------------------------------------------
  startAmbient(kind) {
    this.stopAmbient();
    const c = this.ctx; if (!c) return;
    const loop = (type, freq, q, vol) => {
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(this.ambient); s.start();
      this.amb.push(s);
      return { g, f };
    };
    const wind = loop('bandpass', 420, 0.5, kind === 'west' || kind === 'russia' ? 0.3 : kind === 'north' || kind === 'tibet' ? 0.42 : 0.16);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(wind.f.frequency); lfo.start(); this.amb.push(lfo);
    this.fall = null;
    if (kind === 'swiss') this.fall = loop('lowpass', 1500, 0.4, 0);
    if (kind === 'japan') this.fall = loop('lowpass', 2600, 0.3, 0);
    if (kind === 'greece' || kind === 'north' || kind === 'war' || kind === 'aztec') this.fall = loop('lowpass', 700, 0.3, 0);          // surf on the shore
    this.ambKind = kind;
    this.ambTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const r = Math.random(), t = this.t;
      if (kind === 'swiss') {
        if (r < 0.5) { const f = 2600 + Math.random() * 1800; for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++) this.tone({ t: t + i * 0.11, f0: f, f1: f * (1.1 + Math.random() * 0.3), dur: 0.08, vol: 0.05, dest: this.ambient, rev: 0.4 }); }
        else if (r < 0.75) for (const f of [520, 1310, 1740]) this.tone({ t, type: 'triangle', f0: f * (0.9 + Math.random() * 0.2), dur: 0.5, vol: 0.035, dest: this.ambient, rev: 0.6 });
      } else if (kind === 'japan') {
        if (r < 0.6) { const f = 3900 + Math.random() * 600; for (let i = 0; i < 9; i++) this.tone({ t: t + i * 0.055, f0: f, dur: 0.04, vol: 0.022, dest: this.ambient }); }
        else if (r < 0.7) { this.tone({ t, type: 'triangle', f0: 760, f1: 620, dur: 0.14, vol: 0.12, dest: this.ambient, rev: 0.9 }); }
      } else if (kind === 'greece') {
        if (r < 0.7) { const f = 4400 + Math.random() * 500; for (let i = 0; i < 16; i++) this.tone({ t: t + i * 0.035, type: 'square', f0: f, dur: 0.02, vol: 0.008, dest: this.ambient }); }   // cicadas
        else if (r < 0.82) this.tone({ t, type: 'sawtooth', f0: 1500, f1: 1100, dur: 0.35, vol: 0.02, lp: 2600, dest: this.ambient, rev: 0.6 });                                              // gull
      } else if (kind === 'war') {
        if (r < 0.5) this.tone({ t, f0: 60 + Math.random() * 30, f1: 30, dur: 1.2, vol: 0.07 + Math.random() * 0.08, dest: this.ambient, rev: 0.9 });                 // guns far out at sea
        else if (r < 0.62) for (let i = 0; i < 7; i++) this.noise({ t: t + i * 0.085, type: 'bandpass', f0: 900, dur: 0.05, vol: 0.02, q: 1, dest: this.ambient, rev: 0.6 });     // distant machine gun
      } else if (kind === 'russia') {
        if (r < 0.14) this.tone({ t, type: 'sawtooth', f0: 760, f1: 620, dur: 0.22, vol: 0.02, lp: 1800, dest: this.ambient, rev: 0.7 });                                // a crow
        else if (r < 0.2) for (const f of [1180, 1570]) this.tone({ t, type: 'triangle', f0: f, dur: 0.7, vol: 0.02, dest: this.ambient, rev: 0.8 });                   // a tram bell, far off
      } else if (kind === 'aztec') {
        if (r < 0.45) { const f = 4100 + Math.random() * 700; for (let i = 0; i < 12; i++) this.tone({ t: t + i * 0.05, type: 'square', f0: f, dur: 0.025, vol: 0.007, dest: this.ambient }); }   // crickets at dusk
        else if (r < 0.6) for (let i = 0; i < 3; i++) this.tone({ t: t + i * 0.2, type: 'square', f0: 190, f1: 150, dur: 0.1, vol: 0.02, lp: 900, dest: this.ambient, rev: 0.5 });                // frogs in the reeds
        else if (r < 0.68) this.tone({ t, type: 'sawtooth', f0: 1900, f1: 1300, dur: 0.3, vol: 0.016, lp: 3000, dest: this.ambient, rev: 0.6 });                                              // a parrot
        else if (r < 0.76) for (let i = 0; i < 4; i++) this.tone({ t: t + i * 0.42, f0: 70, f1: 44, dur: 0.5, vol: 0.09, dest: this.ambient, rev: 0.9 });                                       // the drum on the Great Temple, far off
      } else if (kind === 'tibet') {
        if (r < 0.3) for (let i = 0; i < 5; i++) this.noise({ t: t + i * 0.09, type: 'bandpass', f0: 1400 + Math.random() * 600, dur: 0.07, vol: 0.02, q: 0.8, dest: this.ambient });   // prayer flags snapping
        else if (r < 0.36) this.tone({ t, type: 'sawtooth', f0: 92, f1: 88, dur: 2.2, vol: 0.03, lp: 500, dest: this.ambient, rev: 0.9 });                                // a long horn from the monastery
      } else if (kind === 'north') {
        if (r < 0.1) this.tone({ t, type: 'sawtooth', f0: 520, f1: 380, dur: 1.4, vol: 0.016, lp: 900, dest: this.ambient, rev: 0.9 });                                                         // far wolf
      } else if (r < 0.12) {
        this.tone({ t, type: 'sawtooth', f0: 1900, f1: 1300, dur: 0.7, vol: 0.02, lp: 2600, dest: this.ambient, rev: 0.8 });   // distant hawk
      }
    }, 1300);
  }
  /** Loudness of running water, 0..1 (driven by distance to it). */
  setWater(v) { if (this.fall && this.ctx) this.fall.g.gain.setTargetAtTime(v * 0.5, this.t, 0.2); }
  stopAmbient() {
    for (const s of this.amb) { try { s.stop(); } catch (e) { /* already stopped */ } }
    this.amb = []; clearInterval(this.ambTimer); this.fall = null;
  }
}

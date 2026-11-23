// Voice chat between the players of an online game: microphone and speakers.
// The voice goes through the game server with the rest of the game. This player's microphone is read sixteen thousand times a
// second, each reading coded in 8 bits (µ-law, as on a telephone line), and sent with the game's twenty messages a second
// (see Duel.tick); while nobody speaks, nothing is sent. Each other player's voice plays as it comes, after a short wait that
// evens out the network's hiccups, on the "Voices" channel of the sound settings.
// Microphone: 'off', 'open' (always on; T mutes and unmutes) or 'ptt' (push to talk: hold T).

const RATE = 16000, QUIET = 0.012, HANG = 12;
/** The capture, in the audio thread: the microphone's samples in pieces of 1024. */
const WORKLET = `class LhMic extends AudioWorkletProcessor {
  constructor() { super(); this.b = new Float32Array(1024); this.n = 0; }
  process(inputs) { const c = inputs[0] && inputs[0][0]; if (c) for (let i = 0; i < c.length; i++) { this.b[this.n++] = c[i]; if (this.n === 1024) { this.port.postMessage(this.b.slice(0)); this.n = 0; } } return true; }
}
registerProcessor('lh-mic', LhMic);`;

// G.711 µ-law
const BIAS = 0x84, CLIP = 32635;
function encode(x) {
  let s = Math.round(Math.max(-1, Math.min(1, x)) * 32767); const sign = s < 0 ? 0x80 : 0; if (sign) s = -s;
  s = Math.min(s, CLIP) + BIAS;
  let exp = 7; for (let mask = 0x4000; (s & mask) === 0 && exp > 0; exp--, mask >>= 1);
  return ~(sign | (exp << 4) | ((s >> (exp + 3)) & 0x0f)) & 0xff;
}
const DECODE = new Float32Array(256);
for (let u = 0; u < 256; u++) { const v = ~u & 0xff, exp = (v >> 4) & 7; const s = (((v & 0x0f) << 3) + BIAS << exp) - BIAS; DECODE[u] = (v & 0x80 ? -s : s) / 32768; }

export class Voice {
  constructor(game) {
    this.game = game; this.duel = null; this.stream = null; this.src = null; this.node = null; this.sink = null;
    this.out = []; this.acc = 0; this.n = 0; this.pos = 0; this.ratio = 3; this.quiet = HANG;
    this.muted = false; this.sending = false; this.state = '';   // state: '', 'asking', 'on', 'denied', 'none'
    this.ears = new Map(); this.sig = ''; this.ui = document.getElementById('voice');
  }
  get mode() { return this.game.sound.set.mic; }

  /** Connected to an online game: send this player's voice (if the settings say so), and hear the others. */
  attach(duel) { this.close(); this.duel = duel; this.start(); this.paint(); }
  /** Switch the microphone on or off, as the settings say. */
  async start() {
    if (!this.duel) return;
    if (this.mode === 'off') { this.stopSending(); this.paint(); return; }
    if (this.stream || this.state === 'asking') { this.paint(); return; }
    const S = this.game.sound; S.init();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !S.ctx) { this.state = 'none'; this.paint(); return; }
    this.state = 'asking'; this.paint();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, video: false }); }
    catch (e) { this.state = 'denied'; this.paint(); this.game.say('The browser did not give the microphone'); return; }
    if (!this.duel || this.mode === 'off') { for (const t of stream.getTracks()) t.stop(); this.state = ''; this.paint(); return; }
    const ctx = S.ctx; this.stream = stream; this.ratio = ctx.sampleRate / RATE;
    this.src = ctx.createMediaStreamSource(stream);
    try {
      if (!this.loaded) { const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })); await ctx.audioWorklet.addModule(url); this.loaded = true; }
      this.node = new AudioWorkletNode(ctx, 'lh-mic'); this.node.port.onmessage = (e) => this.take(e.data);
    } catch (e) {                                        // an older browser: the same in the page's own thread
      this.node = ctx.createScriptProcessor(2048, 1, 1);
      this.node.onaudioprocess = (ev) => { this.take(ev.inputBuffer.getChannelData(0)); ev.outputBuffer.getChannelData(0).fill(0); };
    }
    if (!this.stream) return;                            // switched off meanwhile
    this.sink = ctx.createGain(); this.sink.gain.value = 0;  // the capture must lead somewhere to run: into silence
    this.src.connect(this.node); this.node.connect(this.sink); this.sink.connect(ctx.destination);
    this.state = 'on'; this.paint();
  }
  stopSending() {
    for (const n of [this.src, this.node, this.sink]) if (n) try { n.disconnect(); } catch (e) { /* gone */ }
    if (this.node && this.node.port) this.node.port.onmessage = null;
    if (this.stream) for (const t of this.stream.getTracks()) t.stop();
    this.stream = this.src = this.node = this.sink = null; this.state = ''; this.sending = false; this.out = [];
  }
  /** Samples from the microphone (at the sound card's rate): down to 16 000 a second, averaged (which also takes away the highs). */
  take(f) {
    if (!this.sending) { this.acc = 0; this.n = 0; return; }
    const r = this.ratio, out = this.out;
    for (let i = 0; i < f.length; i++) { this.acc += f[i]; this.n++; if (++this.pos >= r) { this.pos -= r; out.push(this.acc / this.n); this.acc = 0; this.n = 0; } }
    if (out.length > RATE) out.splice(0, out.length - RATE);   // never more than a second behind
  }
  /** Twenty times a second: what the microphone took since, as a message for the others (nothing while it is quiet). */
  pack() {
    const out = this.out; if (!out.length || !this.duel) return;
    this.out = [];
    let pk = 0; for (const v of out) pk = Math.max(pk, Math.abs(v));
    if (pk < QUIET) { if (this.quiet >= HANG) return; this.quiet++; } else this.quiet = 0;   // a little more after the voice stops, then silence
    let s = ''; for (const v of out) s += String.fromCharCode(encode(v));
    this.duel.send({ t: 'v', d: btoa(s) });
  }
  /** A piece of another player's voice. */
  hear(id, d) {
    const S = this.game.sound, ctx = S.ctx; if (!ctx || typeof d !== 'string' || !this.duel) return;
    let bin; try { bin = atob(d); } catch (e) { return; }
    const n = bin.length, r = ctx.sampleRate / RATE, len = Math.max(1, Math.floor(n * r)); if (!n) return;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0), x = new Float32Array(n);
    let pk = 0; for (let i = 0; i < n; i++) { x[i] = DECODE[bin.charCodeAt(i)]; pk = Math.max(pk, Math.abs(x[i])); }
    for (let j = 0; j < len; j++) { const p = j / r, i = Math.floor(p), k = p - i; ch[j] = x[Math.min(n - 1, i)] * (1 - k) + x[Math.min(n - 1, i + 1)] * k; }   // back to the card's rate
    let e = this.ears.get(id);
    if (!e) { e = { at: 0, lv: 0, t: 0, gain: ctx.createGain() }; e.gain.gain.value = 1.3; e.gain.connect(S.voice); this.ears.set(id, e); }
    const now = ctx.currentTime;
    if (e.at < now + 0.02 || e.at > now + 0.6) e.at = now + 0.12;       // begin after a short wait; fallen far behind: catch up
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(e.gain); src.start(e.at); e.at += buf.duration;
    e.lv = pk; e.t = performance.now();
  }
  /** A player left. */
  drop(id) { const e = this.ears.get(id); if (e) { try { e.gain.disconnect(); } catch (er) { /* gone */ } this.ears.delete(id); } this.paint(); }
  /** The settings changed: the microphone mode (the volume is that of the Voices channel). */
  settings() { if (this.duel) this.start(); }
  close() {
    this.stopSending();
    for (const id of [...this.ears.keys()]) this.drop(id);
    this.duel = null; this.muted = false; this.sig = ''; this.paint();
  }

  /** Every frame: push to talk, muting, and the little lights. */
  update(input) {
    const typing = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);     // a game code being typed is not a T for the microphone
    if (input && !typing && input.pressed.has('KeyT') && this.mode === 'open' && this.stream) { this.muted = !this.muted; this.game.say(this.muted ? 'Microphone muted — T to speak again' : 'Microphone on'); }
    this.sending = !!this.stream && this.state === 'on' && (this.mode === 'open' ? !this.muted : this.mode === 'ptt' && !!input && !typing && input.keys.has('KeyT'));
    if (!this.duel) return;
    const now = performance.now(), heard = [...this.ears].filter(([, e]) => now - e.t < 260 && e.lv > 0.03).map(([id]) => id).join(',');
    const sig = this.sending + '|' + heard + '|' + this.state + '|' + this.muted + '|' + this.mode + '|' + [...this.duel.link.peers.keys()].join(',');
    if (sig !== this.sig) { this.sig = sig; this.heard = new Set(heard ? heard.split(',').map(Number) : []); this.paint(); }
  }
  paint() {
    const el = this.ui; if (!el) return;
    const D = this.duel, on = !!D;
    el.classList.toggle('on', on);
    if (!on) return;
    const me = this.state === 'denied' ? 'Microphone blocked by the browser' : this.state === 'none' ? 'No microphone' : this.state === 'asking' ? 'Asking for the microphone…'
      : this.mode === 'off' || !this.stream ? 'Microphone off' : this.mode === 'ptt' ? (this.sending ? 'Speaking' : 'Hold T to speak') : this.muted ? 'Muted — T' : 'Microphone on — T mutes';
    const heard = this.heard || new Set(), esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    el.innerHTML = `<span class="me${this.sending ? ' live' : ''}">${MIC}${me}</span>` + [...D.link.peers.keys()].sort().map((id) => `<span class="them${heard.has(id) ? ' live' : ''}">${SPK}${esc(D.nameOf(id))}</span>`).join('');
  }
}

const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V22h2v-3.1a7 7 0 006-6.9z"/></svg>';
const SPK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z"/></svg>';

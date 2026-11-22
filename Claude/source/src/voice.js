// Voice chat between the two players of a duel: microphone and speakers.
// The voice travels straight from one browser to the other, beside the game's data (a WebRTC audio call through the same PeerJS peer).
// Each player who has a microphone switched on calls the other and sends only his own voice; the other answers without sending
// anything back, so a player without a microphone still hears. The other player's voice plays through an <audio> element
// (so that the browser's echo cancellation works), at the volume of "Voices" times "General" in the sound settings.
// Microphone: 'off', 'open' (always on; T mutes and unmutes) or 'ptt' (push to talk: hold T).

export class Voice {
  constructor(game) {
    this.game = game; this.link = null; this.stream = null; this.call = null; this.incoming = null; this.audio = null;
    this.muted = false; this.sending = false; this.level = 0; this.state = '';   // state: '', 'asking', 'on', 'denied', 'none'
    this.buf = null; this.an = null; this.ui = document.getElementById('voice');
  }
  get mode() { return this.game.sound.set.mic; }

  /** The duel's connection is open: listen for the other player's voice, and send ours. */
  attach(link) {
    this.close(); this.link = link;
    if (!link.peer) return;
    link.peer.on('call', (call) => {
      if (this.incoming) try { this.incoming.close(); } catch (e) { /* gone */ }
      this.incoming = call; call.answer();
      call.on('stream', (st) => this.hear(st));
      call.on('close', () => { if (this.incoming === call) { this.incoming = null; this.stopHearing(); } });
    });
    this.start();
  }
  /** Switch the microphone on (and call the other player) or off, as the settings say. */
  async start() {
    if (!this.link || !this.link.open) return;
    if (this.mode === 'off') { this.stopSending(); this.paint(); return; }
    if (!this.stream) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { this.state = 'none'; this.paint(); return; }
      this.state = 'asking'; this.paint();
      try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
      catch (e) { this.state = 'denied'; this.paint(); this.game.say('The browser did not give the microphone'); return; }
      if (!this.link || !this.link.open || this.mode === 'off') { this.stopSending(); return; }
    }
    this.state = 'on'; this.update();
    if (!this.call && this.link.conn) {
      const call = (this.call = this.link.peer.call(this.link.conn.peer, this.stream));
      if (call) call.on('close', () => { if (this.call === call) this.call = null; });
    }
    this.paint();
  }
  stopSending() {
    if (this.call) try { this.call.close(); } catch (e) { /* gone */ }
    this.call = null;
    if (this.stream) for (const t of this.stream.getTracks()) t.stop();
    this.stream = null; this.state = ''; this.sending = false;
  }
  hear(stream) {
    this.stopHearing();
    const a = (this.audio = new Audio()); a.srcObject = stream; a.autoplay = true; a.volume = this.game.sound.voiceLevel;
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    const S = this.game.sound;                       // a level meter, to show when the other one speaks (it is not connected to the speakers)
    if (S.ctx) try { const src = S.ctx.createMediaStreamSource(stream); this.an = S.ctx.createAnalyser(); this.an.fftSize = 512; src.connect(this.an); this.buf = new Uint8Array(this.an.fftSize); } catch (e) { this.an = null; }
    this.paint();
  }
  stopHearing() { if (this.audio) { this.audio.pause(); this.audio.srcObject = null; } this.audio = null; this.an = null; this.level = 0; this.paint(); }
  /** The settings changed: the volume, or the microphone mode. */
  settings() { if (this.audio) this.audio.volume = this.game.sound.voiceLevel; if (this.link) this.start(); }
  close() {
    this.stopSending();
    if (this.incoming) try { this.incoming.close(); } catch (e) { /* gone */ }
    this.incoming = null; this.stopHearing(); this.link = null; this.muted = false; this.paint();
  }

  /** Every frame: push to talk, muting, and the two little lights. */
  update(input) {
    const typing = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);     // a duel code being typed is not a T for the microphone
    if (input && !typing && input.pressed.has('KeyT') && this.mode === 'open' && this.stream) { this.muted = !this.muted; this.game.say(this.muted ? 'Microphone muted — T to speak again' : 'Microphone on'); }
    const talk = !!this.stream && (this.mode === 'open' ? !this.muted : this.mode === 'ptt' && !!input && !typing && input.keys.has('KeyT'));
    if (this.stream) for (const t of this.stream.getAudioTracks()) t.enabled = talk;
    let lv = 0;
    if (this.an) { this.an.getByteTimeDomainData(this.buf); for (let i = 0; i < this.buf.length; i += 4) lv = Math.max(lv, Math.abs(this.buf[i] - 128)); }
    const heard = lv > 10;
    if (talk !== this.sending || heard !== this.heard) { this.sending = talk; this.heard = heard; this.paint(); }
  }
  paint() {
    const el = this.ui; if (!el) return;
    const on = !!this.link;
    el.classList.toggle('on', on);
    if (!on) return;
    const name = this.game.duel && this.game.duel.remote ? this.game.duel.remote.name : 'Opponent';
    const me = this.state === 'denied' ? 'Microphone blocked by the browser' : this.state === 'none' ? 'No microphone' : this.state === 'asking' ? 'Asking for the microphone…'
      : this.mode === 'off' || !this.stream ? 'Microphone off' : this.mode === 'ptt' ? (this.sending ? 'Speaking' : 'Hold T to speak') : this.muted ? 'Muted — T' : 'Microphone on — T mutes';
    el.innerHTML = `<span class="me${this.sending ? ' live' : ''}">${MIC}${me}</span><span class="them${this.heard ? ' live' : ''}">${SPK}${this.audio ? name : name + ' — no voice'}</span>`;
  }
}

const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.9V22h2v-3.1a7 7 0 006-6.9z"/></svg>';
const SPK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z"/></svg>';

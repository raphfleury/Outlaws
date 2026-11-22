// Connection between the two browsers of a duel.
// The data always flows directly from one browser to the other (WebRTC data channel).
// The first handshake goes through the public PeerJS broker, under a short code (the invite link).
import { Peer } from 'peerjs';

const PREFIX = 'lonehand-duel-';
/** Debug: ?broker=host:port uses another PeerJS server (one run locally for testing) in place of the public one. */
const BROKER = (() => { const b = new URLSearchParams(location.search).get('broker'); if (!b) return undefined; const [host, port] = b.split(':'); return { host, port: +port || 9000, path: '/', secure: false }; })();

export class Link {
  constructor() { this.open = false; this.onopen = this.onclose = this.onmsg = this.onerror = () => {}; }

  // ---- invite link ------------------------------------------------------------
  /** Wait for an opponent under a short code. Resolves once the code is registered. */
  host(code) {
    return new Promise((res, rej) => {
      const p = (this.peer = new Peer(PREFIX + code, BROKER));
      p.on('open', () => res(code));
      p.on('error', (e) => { if (!this.open) rej(e); });
      p.on('connection', (c) => { if (!this.conn) this.adopt(c); else c.close(); });      // a duel has two players
    });
  }
  /** Connect to the player who is waiting under this code. */
  join(code) {
    return new Promise((res, rej) => {
      const p = (this.peer = BROKER ? new Peer(BROKER) : new Peer());
      p.on('open', () => { this.adopt(p.connect(PREFIX + code, { reliable: true, serialization: 'json' })); res(); });
      p.on('error', (e) => { if (!this.open) { rej(e); this.onerror(e); } });        // for example: nobody is waiting under this code
    });
  }
  adopt(c) {
    this.conn = c;
    c.on('open', () => { this.open = true; this.onopen(); });
    c.on('data', (d) => this.onmsg(d));
    c.on('close', () => this.closed());
  }

  send(o) {
    if (!this.open) return;
    try { this.conn.send(o); } catch (e) { /* the channel is closing */ }
  }
  closed() { if (this.open) { this.open = false; this.onclose(); } }
  close() {
    this.open = false;
    try { if (this.conn) this.conn.close(); if (this.peer) this.peer.destroy(); } catch (e) { /* already gone */ }
  }
}

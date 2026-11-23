// Connection of this browser to the game server (Claude/server), which passes every message on to the other players of the
// game (up to four, the first the host). Every player only connects out to the server, as to any website: no box, firewall
// or network stands in the way, whichever network each player is on.
// While playing, the messages of one moment are sent together, twenty times a second (see flush): the server's free plan
// counts the messages it receives.
//
// The server's address: SERVER below, or ?server=host[:port] in the game's address (for a test server: ws:// on this computer).

const SERVER = 'lonehand.raphfleury.workers.dev';
const SERVER_AT = (() => {
  const s = new URLSearchParams(location.search).get('server') || SERVER;
  if (/^wss?:\/\//.test(s)) return s.replace(/\/+$/, '');
  return (/^(localhost|127\.|192\.168\.|10\.)/.test(s) ? 'ws://' : 'wss://') + s.replace(/\/+$/, '');
})();
/** Messages that only matter while fresh: when the connection lags behind, an older one is not worth sending. */
const LOSSY = new Set(['s', 'en', 'v']);
const WAIT = 12000;            // how long to wait for the server before giving up

export class Link {
  constructor() {
    this.open = false; this.id = -1; this.peers = new Map(); this.q = []; this.batch = false; this.ws = null;
    this.onmsg = this.onjoin = this.onleave = this.onclose = () => {};
  }
  /** Create the game under this code, as its host. Resolves once the server has it. */
  host(code, name) { return this.connect(code, 'host', name); }
  /** Join the game under this code. Rejects with { type: 'none' | 'full' | 'started' | 'timeout' | 'network' | ... }. */
  join(code, name) { return this.connect(code, 'join', name); }

  connect(code, role, name) {
    return new Promise((res, rej) => {
      let done = false, ws;
      const fail = (type) => { if (done) return; done = true; clearTimeout(timer); try { ws.close(); } catch (e) { /* gone */ } rej({ type }); };
      const timer = setTimeout(() => fail('timeout'), WAIT);
      try { ws = this.ws = new WebSocket(`${SERVER_AT}/game/${code}?role=${role}&name=${encodeURIComponent(name || '')}`); }
      catch (e) { fail('address'); return; }
      ws.onmessage = (e) => {
        const d = e.data; if (typeof d !== 'string' || d === 'pong') return;
        if (d[0] === 'S') {
          let m; try { m = JSON.parse(d.slice(1)); } catch (er) { return; }
          if (m.t === 'hello') { done = true; clearTimeout(timer); this.id = m.id; this.open = true; for (const [i, n] of m.peers) this.peers.set(i, n); this.keep(); res(m.id); }
          else if (m.t === 'no') fail(m.why);
          else if (m.t === 'join') { this.peers.set(m.id, m.n); this.onjoin(m.id, m.n); }
          else if (m.t === 'leave') { this.peers.delete(m.id); if (m.id === 0) this.closed('host'); else this.onleave(m.id); }
          return;
        }
        const from = d.charCodeAt(0) - 48; if (from < 0 || from > 9) return;
        let list; try { list = JSON.parse(d.slice(1)); } catch (er) { return; }
        if (!Array.isArray(list)) return;
        for (const m of list) if (m && (m.to === undefined || m.to === this.id)) this.onmsg(m, from);
      };
      ws.onclose = () => { if (!done) fail('network'); else this.closed('lost'); };
      ws.onerror = () => { if (!done) fail('network'); };
    });
  }
  /** The server gets a word every 20 seconds, so that a quiet connection (in the lobby) is not dropped on the way. */
  keep() { clearInterval(this.ping); this.ping = setInterval(() => { if (this.ws && this.ws.readyState === 1) this.ws.send('ping'); }, 20000); }

  /** Send a message to the other players (with m.to, to one of them only). While batch is on, it waits for the next flush. */
  send(m) { if (!this.open) return; this.q.push(m); if (!this.batch) this.flush(); }
  flush() {
    const ws = this.ws; if (!this.q.length || !ws || ws.readyState !== 1) return;
    let q = this.q; this.q = [];
    if (ws.bufferedAmount > 64 * 1024) { q = q.filter((m) => !LOSSY.has(m.t)); if (!q.length) return; }   // lagging behind: only what must arrive
    try { ws.send(JSON.stringify(q)); } catch (e) { /* closing */ }
  }
  /** Host: the game has started (nobody else may come in), or is between two games (others may). */
  lock(on) { if (this.ws && this.ws.readyState === 1) this.ws.send(on ? '!lock' : '!open'); }
  closed(why) { if (this.open) { this.open = false; clearInterval(this.ping); this.onclose(why); } }
  close() {
    if (this.open) this.flush();
    this.open = false; clearInterval(this.ping);
    const ws = this.ws; this.ws = null;
    if (ws) setTimeout(() => { try { ws.close(1000, 'bye'); } catch (e) { /* gone */ } }, 120);
  }
}

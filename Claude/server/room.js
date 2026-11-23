// One game on the server: up to four players, the first of them the host (who created it under its code).
// The server takes no part in the game. It passes what each player's browser sends to the browsers of the others,
// with the sender's number in front, and tells everyone when a player comes or goes.
// It runs in a Cloudflare Durable Object (worker.js), which gives it `io` to reach the connections.
//
// What a browser sends: a text, passed on as it is; or a word for the server, starting with "!" (the host only):
//   !lock  the game has started: nobody else may come in;   !open  between two games: others may come in again.
// What a browser receives: "<n><text>" from player n (0 is the host), or "S<json>" from the server:
//   {t:'hello', id, peers:[[id, name], ...]}  you are in, as player id, with these others;
//   {t:'join', id, n}  a player came in;   {t:'leave', id}  a player left (if it is the host, the game is over).
//   {t:'no', why}  you are not let in: why is 'none' (no such game), 'full', 'started', 'taken' (host: code in use) or 'bad'.
// A connection that is not let in is then closed with one of the codes in CLOSE.

export const MAX_PLAYERS = 4;
export const CLOSE = { bad: 4000, taken: 4001, full: 4003, none: 4004, started: 4005, hostLeft: 4006 };
const MAX_TEXT = 64 * 1024;
const clean = (s) => String(s || '').replace(/[\u0000-\u001f\u007f<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

export class RoomCore {
  /**
   * io: { all() -> [{ ws, meta }] (open connections), meta(ws), setMeta(ws, meta), send(ws, text), close(ws, code, reason) }.
   * meta is { id, n, host, lock, gone } once a connection is let in.
   */
  constructor(io) { this.io = io; }
  players(but) { return this.io.all().filter((p) => p.meta && !p.meta.gone && p.ws !== but); }

  /** A new connection: role 'host' (creates the game) or 'join'. False if it was refused (and closed). */
  open(ws, role, name) {
    const others = this.players(ws), host = others.find((p) => p.meta.host);
    let id;
    if (role === 'host') {
      if (host) return this.refuse(ws, 'taken');
      id = 0;
    } else if (role === 'join') {
      if (!host) return this.refuse(ws, 'none');
      if (host.meta.lock) return this.refuse(ws, 'started');
      if (others.length >= MAX_PLAYERS) return this.refuse(ws, 'full');
      id = 1; while (others.some((p) => p.meta.id === id)) id++;
    } else return this.refuse(ws, 'bad');
    const n = clean(name) || 'Player ' + (id + 1);
    this.io.setMeta(ws, { id, n, host: id === 0, lock: false, gone: false });
    this.io.send(ws, 'S' + JSON.stringify({ t: 'hello', id, peers: others.map((p) => [p.meta.id, p.meta.n]) }));
    const word = 'S' + JSON.stringify({ t: 'join', id, n });
    for (const p of others) this.io.send(p.ws, word);
    return true;
  }
  refuse(ws, why) { this.io.send(ws, 'S' + JSON.stringify({ t: 'no', why })); this.io.close(ws, CLOSE[why], why); return false; }

  /** Something a player sent. */
  message(ws, text) {
    const me = this.io.meta(ws);
    if (!me || me.gone || typeof text !== 'string' || text.length > MAX_TEXT) return;
    if (text[0] === '!') {
      if (me.host && (text === '!lock' || text === '!open')) { me.lock = text === '!lock'; this.io.setMeta(ws, me); }
      return;
    }
    const out = me.id + text;
    for (const p of this.players(ws)) this.io.send(p.ws, out);
  }

  /** A connection closed (or failed). If it was the host's, the game is over for everyone. */
  closed(ws) {
    const me = this.io.meta(ws);
    if (!me || me.gone) return;
    me.gone = true; this.io.setMeta(ws, me);
    const word = 'S' + JSON.stringify({ t: 'leave', id: me.id });
    for (const p of this.players(ws)) {
      this.io.send(p.ws, word);
      if (me.host) { p.meta.gone = true; this.io.setMeta(p.ws, p.meta); this.io.close(p.ws, CLOSE.hostLeft, 'host left'); }
    }
  }
}

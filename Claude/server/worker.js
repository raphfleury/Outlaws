// The game server of Lone Hand, for Cloudflare Workers (see README.md for how to put it online).
// Each game, under its code, is one Durable Object: every player of that game is connected to the same one, which passes the
// messages on (room.js). The connections use the WebSocket Hibernation API, so that a quiet game (in the lobby) can sleep;
// the browsers' keep-alive ("ping", every 20 seconds) gets an automatic answer.
//   wss://<the worker's address>/game/<CODE>?role=host|join&name=<name>   a player's connection
//   https://<the worker's address>/                                         a line saying the server runs
import { DurableObject } from 'cloudflare:workers';
import { RoomCore } from './room.js';

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.core = new RoomCore({
      all: () => ctx.getWebSockets().filter((ws) => ws.readyState === 1).map((ws) => ({ ws, meta: ws.deserializeAttachment() })),
      meta: (ws) => ws.deserializeAttachment(),
      setMeta: (ws, m) => ws.serializeAttachment(m),
      send: (ws, text) => { try { ws.send(text); } catch (e) { /* closing */ } },
      close: (ws, code, why) => { try { ws.close(code, why); } catch (e) { /* closed already */ } },
    });
  }
  async fetch(request) {
    const url = new URL(request.url), [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    this.core.open(server, url.searchParams.get('role'), url.searchParams.get('name'));
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) { if (typeof msg === 'string') this.core.message(ws, msg); }
  webSocketClose(ws, code) { this.core.closed(ws); try { ws.close(code >= 4000 && code < 5000 ? code : 1000, 'bye'); } catch (e) { /* closed already */ } }
  webSocketError(ws) { this.core.closed(ws); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), m = url.pathname.match(/^\/game\/([A-Z0-9]{4,12})$/);
    if (!m) return new Response('Lone Hand game server: running.\n', { headers: { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' } });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('A game is joined with a WebSocket.\n', { status: 426 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
  },
};

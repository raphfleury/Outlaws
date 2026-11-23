# The game server of Lone Hand

Games online (two to four players) go through this small server. Every player's browser
connects to it, as to a website, and it passes each player's messages to the other players
of the same game. It runs on [Cloudflare Workers](https://developers.cloudflare.com/workers/),
on the free plan: one Worker, and one Durable Object per game code.

| File | What it does |
| --- | --- |
| [worker.js](worker.js) | The Worker: `/game/<CODE>` leads a player's WebSocket to the game's Durable Object; `/` answers that the server runs. The `Room` class is the Durable Object, with the WebSocket Hibernation API. |
| [room.js](room.js) | One game: who is in (at most four, the first the host), passing the messages on, refusing a fifth player or a newcomer once a game has started, telling everyone when a player comes or goes. |
| [wrangler.toml](wrangler.toml) | Cloudflare's configuration: the Worker's name (`lonehand`), the Durable Object, its SQLite migration (needed on the free plan). |

The server keeps nothing: no accounts, no scores, no record of the games.

## Putting it online

The game looks for the server at `lonehand.raphfleury.workers.dev` (the `SERVER` line at the
top of [../source/src/net.js](../source/src/net.js)). A Worker named `lonehand` in a
Cloudflare account whose workers.dev subdomain is `raphfleury` has that address. With another
subdomain, change that line and build the game again.

**From GitHub, without installing anything.** In the Cloudflare dashboard, under *Workers &
Pages*, create an application by importing a repository: connect GitHub, choose this
repository, keep the name `lonehand` (it must match `name` in `wrangler.toml`), set the root
directory to `Claude/server`, and keep the deploy command `npx wrangler deploy`. Cloudflare
then deploys the server, and deploys it again after each push to the main branch.

**From a computer with Node.js.** In this folder:

```bash
npx wrangler login
```

```bash
npx wrangler deploy
```

Then open `https://lonehand.<subdomain>.workers.dev/`: it answers
`Lone Hand game server: running.`

## Trying it at home

```bash
npx wrangler dev --port 8787
```

runs the server on this computer, in Cloudflare's own runtime. Open the game with
`?server=127.0.0.1:8787` added to its address (for example
`index.html?server=127.0.0.1:8787`), in several tabs.

## The messages

A player connects to `wss://<server>/game/<CODE>?role=host|join&name=<name>`.

- The server says `S{"t":"hello","id":n,"peers":[[id,name],...]}`: the player is in, as
  number `n` (0 is the host). Or `S{"t":"no","why":...}`, then closes: `none` (no game under
  that code), `full`, `started`, `taken` (a host's code already in use), `bad`.
- Then `S{"t":"join","id":n,"n":name}` and `S{"t":"leave","id":n}` as players come and go.
  When the host leaves, the game is over: the others are disconnected.
- Anything else a player sends is passed to the others with his number in front:
  `2[...]` came from player 2. The game sends a JSON list of the messages of one moment,
  twenty times a second; a message with `to` is for that player only (the others skip it).
- The host sends `!lock` when a game starts (nobody else may come in) and `!open` between
  two games. Every player sends `ping` every 20 seconds, so that a quiet connection is not
  dropped; the Durable Object answers `pong` with an automatic response.

## What the free plan allows

The free plan of Workers counts 100,000 requests a day for Durable Objects, and a WebSocket
message received counts as one twentieth of a request (messages sent out are free). Each
player's browser sends about 17 messages a second while playing. So a game of four uses about
12,000 requests an hour, and the plan allows about **eight hours of play a day with four
players, or sixteen with two**, shared by all the games of that day. Past the limit, games stop
connecting until the count is reset at midnight UTC. The free plan also counts 13,000 GB-s of
Durable Object time a day, which these hours stay well under. Cloudflare's paid plan lifts
these limits.

These figures are Cloudflare's as of November 2026; see
[Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

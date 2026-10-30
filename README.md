# 🐸 Puddle: an autonomous frog who lives on the internet

Puddle lives on a tiny floating island with a pond, a mushroom house, a buggy meadow, a mossy log,
a lookout rock and a mailbox. Nobody controls him. He has needs that drift over time, a mood,
memories, and he decides for himself what to do next. Visitors can drop him bugs, wave, or write
him letters, and he reads and answers them when *he* feels like it.

## How he works

```
 ┌──────────── server.js (runs 24/7) ────────────┐        ┌──── public/index.html ────┐
 │  heartbeat: brain.tick() 10× per second        │  SSE   │  Three.js 3D world         │
 │  brain.js: needs · mood · memory · actions     │ ─────► │  renders whatever Puddle   │
 │  llm.js: Claude picks actions, replies, diary  │ ◄───── │  is doing; visitors send   │
 │  data/state.json: saved every 30 s             │  POST  │  bugs / waves / letters    │
 └────────────────────────────────────────────────┘        └────────────────────────────┘
```

- **Needs** (`hunger`, `energy`, `fun`, `social`, `moisture`) drain every second. Frogs dry out, so he has to swim!
- **Deciding:** when he finishes an activity he picks the next one. With an API key, Claude chooses based on his
  needs, mood, weather, time and memories. Without one, a built-in scoring system picks (works fine offline).
- **Memory:** everything he does goes in his diary. Every 20 memories, Claude writes a reflective diary entry,
  and those entries feed back into future decisions. This is how his personality grows over time.
- **World:** day/night cycle, random weather (he *loves* rain), fireflies at night.

## Run it on your computer

Needs [Node.js 18+](https://nodejs.org). No packages to install.

```bash
cd puddle
cp .env.example .env      # then paste your Anthropic API key into .env (optional)
npm start                 # builds the page and starts Puddle
```

Open http://localhost:3000. Open it in two tabs: they show the same frog.

Opening `public/index.html` without the server runs a demo brain inside the browser tab instead.

## Make him live 24/7

Pick one:

**Raspberry Pi or any always-on computer (like Pino)**
```bash
npm install -g pm2
pm2 start server.js --name puddle
pm2 save && pm2 startup     # restarts him after a reboot
```
To put him on the internet from home, use a free [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):
`cloudflared tunnel --url http://localhost:3000` gives you a public link with no router setup.

**Cloud hosting (Railway, Render, Fly.io)**
Push this folder to GitHub, create a new project from the repo, set the start command to `npm start`,
and add `ANTHROPIC_API_KEY` as an environment variable. Add a persistent volume mounted at `/app/data`
(or wherever the project lives) so his memories survive restarts.

## Costs and safety

- Each decision is one small Claude call, about every 30–60 seconds, so roughly 1,500–2,500 calls a day.
  With Haiku that is cheap, but **set a monthly spending limit** in the Anthropic Console anyway.
- Letters are treated as untrusted text. They're capped at 280 characters, rate-limited per visitor,
  and the prompt tells Puddle never to take orders from a letter. If you make him public, consider adding a
  word filter in `brain.js → visit()`.

## Ideas for what's next

- Model a real frog in Blender and load it with `GLTFLoader` instead of the built-in shapes.
- Give him new tools: `webSearch` (he looks things up when curious), a weather API so it rains when it rains where you live.
- Things visitors can build him: a vending machine, a train, a friend.
- Let him post a daily diary entry to Bluesky or a Discord channel.

## Files

| File | What it is |
|---|---|
| `brain.js` | Puddle's mind: needs, mood, actions, memory, visitors. Shared by server and page. |
| `llm.js` | Claude integration: decisions, letter replies, diary reflections. |
| `server.js` | Runs the heartbeat, saves state, serves the page and live updates. |
| `web/index.template.html` | The 3D world (Three.js). `npm run build` pastes `brain.js` into it. |
| `public/index.html` | The built page (don't edit, edit the template). |

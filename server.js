// server.js: keeps Puddle alive 24/7 and shares him with every visitor.
//   node server.js        then open http://localhost:3000
// No npm packages needed (Node 18+).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Brain, timeStr } from './brain.js';
import { makeClaude } from './llm.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Tiny .env loader so you don't need the dotenv package.
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env file, that's fine */ }

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PAGE = path.join(ROOT, 'public', 'index.html');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- wake Puddle up ----------
let saved = null;
try { saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { }

const claude = process.env.ANTHROPIC_API_KEY
  ? makeClaude({ apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.CLAUDE_MODEL || 'claude-haiku-5-5' })
  : null;

const brain = new Brain({
  saved: saved?.state,
  decider: claude?.decider,
  replier: claude?.replier,
  realClock: process.env.REAL_CLOCK === '1',
});

if (saved?.savedAt) {
  const mins = Math.round((Date.now() - saved.savedAt) / 60000);
  if (mins >= 1) brain.remember(`The world paused for ${mins} min. Weird. Anyway, I'm back!`);
}

let lastError = 0;
brain.on('error', (err) => {
  if (Date.now() - lastError > 60000) console.error('[brain] Claude call failed, using built-in rules instead:', err.message);
  lastError = Date.now();
});

// Every 20 new memories, Puddle writes a diary entry (needs Claude).
let sinceReflect = 0, reflecting = false;
brain.on('memory', () => {
  if (!claude || reflecting || ++sinceReflect < 20) return;
  sinceReflect = 0; reflecting = true;
  claude.reflect(brain)
    .then((text) => { if (text) { brain.s.diary.push({ day: brain.s.day, time: timeStr(brain.s.clock), text }); brain.s.diary = brain.s.diary.slice(-30); console.log('[diary]', text); } })
    .catch((e) => console.error('[diary] failed:', e.message))
    .finally(() => { reflecting = false; });
});
brain.on('start', ({ action, thought }) => console.log(`[${timeStr(brain.s.clock)}] ${action}: ${thought}`));

// ---------- the heartbeat ----------
let last = Date.now();
setInterval(() => { const now = Date.now(); brain.tick(Math.min(1, (now - last) / 1000)); last = now; }, 100);

function save() {
  const tmp = STATE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ state: brain.serialize(), savedAt: Date.now() }));
  fs.renameSync(tmp, STATE_FILE);
}
setInterval(save, 30000);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { save(); console.log('\nSaved Puddle. Goodnight!'); process.exit(0); });

// ---------- live updates to every open page (Server-Sent Events) ----------
const clients = new Set();
function broadcast() {
  const msg = `data: ${JSON.stringify(brain.snapshot())}\n\n`;
  for (const res of clients) res.write(msg);
}
setInterval(broadcast, 500);

// ---------- web server ----------
const lastVisitByIp = new Map();
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return fs.readFile(PAGE, (err, buf) => err ? send(res, 500, 'Run "npm run build" first.', 'text/plain') : send(res, 200, buf.toString(), 'text/html; charset=utf-8'));
  }
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, brain.snapshot());

  if (req.method === 'GET' && url.pathname === '/api/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write(`data: ${JSON.stringify(brain.snapshot())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/visit') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const now = Date.now();
    if (now - (lastVisitByIp.get(ip) || 0) < 2500) return send(res, 429, { ok: false, error: 'Easy there! Puddle needs a second.' });
    lastVisitByIp.set(ip, now);
    if (lastVisitByIp.size > 5000) lastVisitByIp.clear();

    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      let evt;
      try { evt = JSON.parse(body); } catch { return send(res, 400, { ok: false, error: 'Bad request' }); }
      const result = brain.visit({ type: evt.type, name: evt.name, text: evt.text });
      broadcast();
      send(res, result.ok ? 200 : 400, result);
    });
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`🐸 Puddle is alive at http://localhost:${PORT}`);
  console.log(claude ? `   Brain: Claude (${process.env.CLAUDE_MODEL || 'claude-haiku-5-5'})` : '   Brain: built-in rules (set ANTHROPIC_API_KEY in .env to give him a Claude brain)');
});

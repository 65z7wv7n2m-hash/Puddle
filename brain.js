// brain.js: the mind of Puddle the frog.
// Plain JavaScript with no imports, so the same file runs in Node (the 24/7 server)
// and inside the web page (the demo brain).

export const FROG_NAME = 'Puddle';

// Where things are on the island (x/z in world units; face = direction he looks when he arrives).
export const PLACES = {
  home:     { x: -6.0, z: -1.7, face: 0,          label: 'his mushroom house' },
  meadow:   { x:  6.0, z: -4.6, face: 0.6,        label: 'the buggy meadow' },
  pond:     { x:  1.6, z:  0.6, face: 0.8,        label: 'the pond' },
  lilypad:  { x:  3.3, z:  2.3, face: 0.4,        label: 'his favorite lily pad' },
  log:      { x: -5.0, z:  4.8, face: 0.2,        label: 'the mossy log' },
  rock:     { x: -1.2, z: -8.0, face: Math.PI,    label: 'the lookout rock' },
  mailbox:  { x:  1.1, z:  7.5, face: 0,          label: 'the visitor mailbox' },
  clearing: { x: -2.8, z:  1.5, face: 0,          label: 'the clearing' },
};
export const POND = { x: 2, z: 1, r: 3.6 };
export const HOUSE = { x: -6, z: -4.2, r: 2.0 };
export const ISLAND_R = 10.5;

export const NEEDS = ['hunger', 'energy', 'fun', 'social', 'moisture'];
export const NEED_LABELS = { hunger: 'Full', energy: 'Energy', fun: 'Fun', social: 'Social', moisture: 'Moisture' };

// How fast each need runs down (points per second). 100 = fully satisfied, 0 = desperate.
const DRIFT = { hunger: 0.20, energy: 0.11, fun: 0.24, social: 0.14, moisture: 0.28 };

// Everything Puddle can choose to do. fx = total change to needs over the whole activity.
export const ACTIONS = {
  eat:     { place: 'meadow',   jitter: 0.8, dur: 22, anim: 'hunt',   fx: { hunger: 50, fun: 6, energy: -3 },   verb: 'hunting bugs',           desc: 'Hop to the meadow and catch bugs with your tongue. Fixes hunger.' },
  nap:     { place: 'home',     jitter: 0,   dur: 45, anim: 'sleep',  fx: { energy: 70 },                        verb: 'napping',                desc: 'Sleep at your mushroom house. Restores energy.' },
  swim:    { place: 'pond',     jitter: 0.5, dur: 26, anim: 'swim',   fx: { moisture: 80, fun: 12, energy: -5 }, verb: 'swimming',               desc: 'Swim in the pond. Keeps your skin wet and is a bit fun.' },
  lilypad: { place: 'lilypad',  jitter: 0,   dur: 28, anim: 'sit',    fx: { moisture: 30, energy: 10, fun: 5 },  verb: 'lounging on a lily pad', desc: 'Relax on your favorite lily pad.' },
  sing:    { place: 'log',      jitter: 0,   dur: 18, anim: 'croak',  fx: { fun: 15, social: 14, energy: -4 },   verb: 'singing',                desc: 'Croak songs from the mossy log so everyone can hear.' },
  explore: { place: 'random',   jitter: 0,   dur: 24, anim: 'wander', fx: { fun: 24, energy: -8 },               verb: 'exploring',              desc: 'Wander around somewhere on the island.' },
  gaze:    { place: 'rock',     jitter: 0,   dur: 26, anim: 'sit',    fx: { fun: 12, energy: 6 },                verb: 'watching the sky',       desc: 'Sit on the lookout rock and watch clouds (or stars at night).' },
  mail:    { place: 'mailbox',  jitter: 0,   dur: 16, anim: 'read',   fx: { social: 30, fun: 4 },                verb: 'reading his mail',       desc: 'Go to the mailbox, read letters from visitors and reply.' },
  dance:   { place: 'clearing', jitter: 0.6, dur: 20, anim: 'dance',  fx: { fun: 28, moisture: 20, social: 5 },  verb: 'dancing in the rain',    desc: 'Rain dance in the clearing. Only possible while it is raining.' },
  browse:  { place: 'log',      jitter: 0,   dur: 30, anim: 'read',   fx: { fun: 22, social: 4 },                verb: 'browsing the internet',  desc: 'Sit on the mossy log and look something up on the internet.' },
};

const THOUGHTS = {
  eat:     ['My tummy is rumbling. Bug hunt time!', "I can hear the meadow buzzing. Snack o'clock.", 'Thinking about crunchy beetles... to the meadow!', 'A frog cannot live on vibes alone. Bugs, please.'],
  nap:     ['My eyelids are so heavy. Nap time.', 'The mushroom house is calling my name.', 'A little nap never hurt a frog.'],
  napNight:['It is dark out. Time for bed.', 'Goodnight, pond. Goodnight, stars.', 'Sleepy frog hours have begun.'],
  swim:    ['My skin feels dry. Splash time!', 'The pond looks perfect right now.', 'Gotta stay slippery. Swimming!'],
  lilypad: ['I will just float on my lily pad for a bit.', 'Lily pad lounging. Very important frog business.', 'My favorite lily pad misses me.'],
  sing:    ['I feel a song coming on. Ribbit!', 'The mossy log has the best acoustics.', 'Time to croak my heart out.'],
  singNight:['Night croak concert, starring me.', 'Frogs sing at night. It is the law.'],
  explore: ['I wonder what is over there...', 'Adventure time! Let me see what is new on the island.', 'Feeling curious. Going for a hop.'],
  gaze:    ['That cloud looks like a fly. Better go look closer.', 'Going to watch the clouds from the lookout rock.'],
  gazeNight:['The stars are so bright tonight. To the rock!', 'I want to count the stars again. I got to 12 last time.'],
  mail:    ['Ooh, I think I have mail!', 'Someone wrote to me? Going to check!'],
  mailNone:['Maybe someone left me a letter...', 'I will go say hi to whoever is watching.'],
  dance:   ['RAIN! Rain dance time!!', 'Raindrops on my skin. Best day ever. Dancing!'],
  browse:  ['I just thought of a question. To the internet!', 'I wonder... I bet the internet knows.', 'Feeling curious. Time to look something up.'],
};

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const clean = (str, max = 24) => String(str ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const trim = (str, n) => (str.length > n ? str.slice(0, n - 1) + '…' : str);
export const timeStr = (c) => {
  const m = Math.floor(c) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

// If a straight line would go through the mushroom house, add a waypoint around it.
function routeAround(from, to) {
  const o = HOUSE, dx = to.x - from.x, dz = to.z - from.z, L2 = dx * dx + dz * dz;
  if (L2 < 1e-6) return [to];
  const t = clamp(((o.x - from.x) * dx + (o.z - from.z) * dz) / L2, 0, 1);
  const px = from.x + dx * t, pz = from.z + dz * t;
  if (Math.hypot(px - o.x, pz - o.z) >= o.r + 0.3) return [to];
  let nx = px - o.x, nz = pz - o.z, n = Math.hypot(nx, nz);
  if (n < 1e-3) { nx = -dz; nz = dx; n = Math.hypot(nx, nz); }
  const k = (o.r + 0.9) / n;
  return [{ x: o.x + nx * k, z: o.z + nz * k }, to];
}

export class Brain {
  constructor({ saved = null, decider = null, replier = null, browser = null, browseEveryHours = 3, realClock = false } = {}) {
    this.decider = decider;   // optional async (brain) => { action, thought, say }
    this.replier = replier;   // optional async (brain, letters) => [reply, ...]
    this.browser = browser;   // optional async (brain) => { topic, learned, say }
    this.browseEveryMs = browseEveryHours * 3600 * 1000;
    this.realClock = realClock;
    this.pending = false;
    this.listeners = {};
    this.s = saved && saved.v === 1 ? saved : Brain.fresh();
    this.s.discoveries ||= [];
    this.s.lastBrowseAt ??= 0;
    const f = this.s.frog;
    if (!['travel', 'doing'].includes(f.phase) || !ACTIONS[f.action]) { f.phase = 'thinking'; f.timer = 2; }
  }

  static fresh() {
    return {
      v: 1, t: 0, clock: 8 * 60, day: 1,
      needs: { hunger: 72, energy: 85, fun: 60, social: 45, moisture: 70 },
      weather: 'sunny', weatherT: 180,
      frog: {
        x: 0.5, z: 5.5, face: 0, action: 'waking', phase: 'thinking', timer: 3, path: [],
        thought: 'Good morning, pond! What should I do first?', placeLabel: '',
        say: 'Good morning!', sayUntil: 5, sayQueue: [], moving: false,
        lick: 0, lickAt: null, lickTimer: 0, count: 0, wanderT: 0,
      },
      lastAction: null, memories: [{ day: 1, time: '08:00', text: 'I woke up on my little island. Hello, world!' }],
      diary: [], friends: {}, mailbox: [], replies: [], letterId: 0, visitSeq: 0, lastVisit: null,
      discoveries: [], lastBrowseAt: 0,
      stats: { bugsEaten: 0, swims: 0, songs: 0, lettersRead: 0, naps: 0 },
    };
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { for (const fn of this.listeners[evt] || []) { try { fn(data); } catch (e) { /* ignore */ } } }

  isNight() { const c = this.s.clock; return c < 6 * 60 || c >= 20 * 60; }
  isAsleep() { const f = this.s.frog; return f.action === 'nap' && f.phase === 'doing'; }
  inPond() { const f = this.s.frog; return Math.hypot(f.x - POND.x, f.z - POND.z) < POND.r; }

  remember(text) {
    const s = this.s, m = { day: s.day, time: timeStr(s.clock), text };
    s.memories.push(m);
    if (s.memories.length > 80) s.memories.splice(0, s.memories.length - 80);
    this.emit('memory', m);
  }

  say(text, secs = 6) {
    const f = this.s.frog;
    if (!f.say) { f.say = text; f.sayUntil = this.s.t + secs; }
    else if (f.sayQueue.length < 4) f.sayQueue.push({ text, secs });
  }

  mood() {
    const n = this.s.needs, vals = NEEDS.map((k) => n[k]);
    let v = (vals.reduce((a, b) => a + b, 0) / vals.length) * 0.7 + Math.min(...vals) * 0.3;
    if (this.s.weather === 'rain') v += 6;
    v = clamp(v);
    let label, emoji;
    if (n.moisture < 18) { label = 'dried out'; emoji = '🥵'; }
    else if (n.hunger < 18) { label = 'hangry'; emoji = '😤'; }
    else if (n.energy < 20) { label = 'sleepy'; emoji = '😪'; }
    else if (v >= 80) { label = 'joyful'; emoji = '😄'; }
    else if (v >= 62) { label = 'content'; emoji = '🙂'; }
    else if (v >= 45) { label = 'okay'; emoji = '😐'; }
    else if (v >= 28) { label = 'grumpy'; emoji = '😒'; }
    else { label = 'miserable'; emoji = '😣'; }
    return { value: Math.round(v), label, emoji };
  }

  // ---------- the main loop: call this every frame/tick with seconds elapsed ----------
  tick(dt) {
    const s = this.s, f = s.frog;
    s.t += dt;

    if (this.realClock) {
      const d = new Date(), c = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      if (c < s.clock - 600) { s.day++; this.remember(`A new day began (day ${s.day}).`); }
      s.clock = c;
    } else {
      s.clock += dt * 2; // one in-game day = 12 real minutes
      if (s.clock >= 1440) { s.clock -= 1440; s.day++; this.remember(`A new day began (day ${s.day}).`); }
    }

    s.weatherT -= dt;
    if (s.weatherT <= 0) this.changeWeather();

    // needs drift
    const asleep = this.isAsleep(), night = this.isNight();
    for (const k of NEEDS) {
      let d = DRIFT[k];
      if (k === 'energy') d = asleep ? 0 : night ? d * 1.6 : d;
      if (asleep && (k === 'fun' || k === 'social')) d *= 0.25;
      if (asleep && k === 'hunger') d *= 0.5;
      if (k === 'moisture') { if (this.inPond()) d = -1.5; else if (s.weather === 'rain') d = -0.5; }
      s.needs[k] = clamp(s.needs[k] - d * dt);
    }

    if (f.lickAt != null && s.t >= f.lickAt) { f.lick++; f.lickAt = null; }

    this.checkUrgent();

    if (f.phase === 'thinking') {
      f.timer -= dt;
      if (f.timer <= 0 && !this.pending) this.decide();
    } else if (f.phase === 'travel') {
      if (this.moveAlong(dt, 1.6)) {
        const a = ACTIONS[f.action];
        f.phase = 'doing'; f.timer = a.dur; f.count = 0;
        const p = PLACES[a.place];
        if (p && p.face != null && a.place !== 'meadow' && a.place !== 'pond') f.face = p.face;
        this.arrive();
      }
    } else if (f.phase === 'doing') {
      const a = ACTIONS[f.action];
      for (const k in a.fx) s.needs[k] = clamp(s.needs[k] + (a.fx[k] / a.dur) * dt);
      this.during(dt);
      f.timer -= dt;
      if (f.timer <= 0 && !this.replying) this.finish();
    }

    if (f.say && s.t >= f.sayUntil) f.say = null;
    if (!f.say && f.sayQueue.length) { const n = f.sayQueue.shift(); f.say = n.text; f.sayUntil = s.t + n.secs; }
  }

  moveAlong(dt, speed) {
    const f = this.s.frog;
    if (!f.path.length) { f.moving = false; return true; }
    const p = f.path[0], dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz), step = speed * dt;
    if (d <= step) { f.x = p.x; f.z = p.z; f.path.shift(); }
    else { f.x += (dx / d) * step; f.z += (dz / d) * step; f.face = Math.atan2(dx, dz); }
    f.moving = f.path.length > 0;
    return !f.path.length;
  }
  goTo(p) { const f = this.s.frog; f.path = routeAround(f, p); f.moving = true; }

  randomSpot(near = null, radius = 3) {
    for (let i = 0; i < 30; i++) {
      let x, z;
      if (near) { const a = rnd(0, Math.PI * 2), r = rnd(1, radius); x = near.x + Math.cos(a) * r; z = near.z + Math.sin(a) * r; }
      else { const a = rnd(0, Math.PI * 2), r = rnd(2, ISLAND_R); x = Math.cos(a) * r; z = Math.sin(a) * r; }
      if (Math.hypot(x, z) > ISLAND_R) continue;
      if (Math.hypot(x - HOUSE.x, z - HOUSE.z) < HOUSE.r + 0.6) continue;
      return { x, z };
    }
    return { x: 0, z: 4 };
  }

  // ---------- deciding ----------
  browseDue() { return !!this.browser && Date.now() - (this.s.lastBrowseAt || 0) >= this.browseEveryMs; }
  allowedActions() {
    return Object.keys(ACTIONS).filter((k) => (k !== 'dance' || this.s.weather === 'rain') && (k !== 'browse' || this.browseDue()));
  }

  scores() {
    const s = this.s, n = s.needs, night = this.isNight();
    const w = (k) => ((100 - n[k]) / 100) ** 2;
    const sc = {
      eat: w('hunger') * 1.7 - (night ? 0.15 : 0),
      nap: w('energy') * 1.6 + (night ? 0.55 : 0) - (!night && n.energy > 60 ? 0.3 : 0),
      swim: w('moisture') * 1.6 + w('fun') * 0.25 + (s.weather === 'sunny' ? 0.05 : 0),
      lilypad: w('moisture') * 0.5 + w('energy') * 0.35 + 0.12,
      sing: w('social') * 0.8 + w('fun') * 0.45 + (night ? 0.2 : 0),
      explore: w('fun') * 1.1 + (night ? -0.25 : 0.12),
      gaze: w('fun') * 0.55 + (night ? 0.35 : 0.06),
      mail: w('social') * 1.0 + (s.mailbox.length ? 0.9 : 0),
      dance: s.weather === 'rain' ? 0.55 + w('fun') * 0.6 : -9,
    };
    if (s.lastAction && sc[s.lastAction] != null) sc[s.lastAction] -= 0.3;
    for (const k in sc) sc[k] += Math.random() * 0.22; // a little personality / randomness
    return sc;
  }

  utilityChoice() {
    const sc = this.scores();
    let best = 'lilypad', bv = -1e9;
    for (const k in sc) if (sc[k] > bv) { bv = sc[k]; best = k; }
    return { action: best, thought: this.makeThought(best) };
  }

  makeThought(name) {
    const night = this.isNight();
    if (name === 'nap' && night) return pick(THOUGHTS.napNight);
    if (name === 'sing' && night) return pick(THOUGHTS.singNight);
    if (name === 'gaze' && night) return pick(THOUGHTS.gazeNight);
    if (name === 'mail' && !this.s.mailbox.length) return pick(THOUGHTS.mailNone);
    return pick(THOUGHTS[name] || ['Hmm.']);
  }

  decide() {
    // Every few hours curiosity wins: he goes and looks something up.
    if (this.browseDue() && this.s.needs.energy > 15) { this.s.lastBrowseAt = Date.now(); return this.start('browse', this.makeThought('browse')); }
    const go = (d) => {
      let { action, thought, say } = d || {};
      if (!ACTIONS[action] || !this.allowedActions().includes(action)) {
        const u = this.utilityChoice(); action = u.action; thought = u.thought; say = null;
      }
      this.start(action, thought, say);
    };
    if (this.decider) {
      this.pending = true;
      Promise.resolve().then(() => this.decider(this)).then(
        (d) => { this.pending = false; go(d); },
        (err) => { this.pending = false; this.emit('error', err); go(null); },
      );
    } else go(this.utilityChoice());
  }

  start(name, thought, say) {
    const s = this.s, f = s.frog, a = ACTIONS[name];
    f.action = name; f.phase = 'travel'; f.count = 0; f.lickTimer = 1; f.wanderT = 0;
    f.thought = clean(thought || this.makeThought(name), 160);
    let p;
    if (a.place === 'random') { p = this.randomSpot(); f.placeLabel = 'somewhere new'; }
    else { const b = PLACES[a.place]; p = { x: b.x + rnd(-a.jitter, a.jitter), z: b.z + rnd(-a.jitter, a.jitter) }; f.placeLabel = b.label; }
    this.goTo(p);
    s.lastAction = name;
    if (say) this.say(clean(say, 140), 5);
    this.emit('start', { action: name, thought: f.thought });
  }

  // Emergencies override whatever he is doing.
  checkUrgent() {
    const s = this.s, f = s.frog, n = s.needs;
    if (this.pending || f.phase === 'thinking') return;
    let u = null;
    if (n.moisture < 8 && f.action !== 'swim') u = ['swim', 'My skin is SO dry. Pond, now!', 'Had to rush to the pond before I dried out.'];
    else if (n.hunger < 6 && f.action !== 'eat') u = ['eat', 'Too hungry to think. Bugs!', 'Got so hungry I dropped everything to find bugs.'];
    else if (n.energy < 4 && f.action !== 'nap') u = ['nap', 'Can... barely... keep my eyes open...', 'Got so tired I had to go straight to bed.'];
    if (u) { this.say(u[1], 4); this.remember(u[2]); this.start(u[0], u[1]); }
  }

  arrive() {
    const f = this.s.frog, a = f.action, asleepSoon = a === 'nap';
    if (a === 'mail') return this.readMail();
    if (a === 'browse') return this.browse();
    if (asleepSoon) { this.s.stats.naps++; return; }
    if (Math.random() < 0.55) {
      const lines = {
        eat: ['Bugs, bugs, bugs!', 'Hello, delicious.'],
        swim: ['Splash!', 'Ahh, cool water.'],
        lilypad: ['Ahh, my lily pad.', 'Perfect.'],
        sing: ['Ahem. Mi mi mi... RIBBIT!'],
        gaze: this.isNight() ? ['So many stars...'] : ['That cloud looks like a beetle.'],
        dance: ['Rain rain rain!'],
        explore: ['Ooh, what is this?'],
      };
      if (lines[a]) this.say(pick(lines[a]), 4);
    }
  }

  during(dt) {
    const s = this.s, f = s.frog;
    if (f.action === 'eat') {
      f.lickTimer -= dt;
      if (f.lickTimer <= 0) { f.lick++; f.count++; s.stats.bugsEaten++; f.lickTimer = rnd(2, 3.2); }
    } else if (f.action === 'explore') {
      f.wanderT -= dt;
      if (f.wanderT <= 0 && !f.path.length) { this.goTo(this.randomSpot(f, 3.5)); f.wanderT = rnd(3, 6); }
      this.moveAlong(dt, 1.3);
    } else if (f.action === 'swim') {
      f.wanderT -= dt;
      if (f.wanderT <= 0 && !f.path.length) {
        const a = rnd(0, Math.PI * 2), r = rnd(0.5, POND.r - 1);
        this.goTo({ x: POND.x + Math.cos(a) * r, z: POND.z + Math.sin(a) * r }); f.wanderT = rnd(3, 6);
      }
      this.moveAlong(dt, 0.8);
    }
  }

  finish() {
    const s = this.s, f = s.frog, a = f.action, night = this.isNight();
    const mem = {
      eat: `Caught ${f.count} bug${f.count === 1 ? '' : 's'} in the meadow.`,
      nap: night ? 'Slept in my mushroom house.' : 'Took a nap in my mushroom house.',
      swim: 'Went for a swim in the pond.',
      lilypad: 'Lounged on my favorite lily pad.',
      sing: night ? 'Sang a night song on the mossy log.' : 'Sang on the mossy log.',
      explore: 'Went exploring around the island.',
      gaze: night ? 'Watched the stars from the lookout rock.' : 'Watched the clouds from the lookout rock.',
      mail: null,
      dance: 'Danced in the rain!',
      browse: null,
    }[a];
    if (a === 'swim') s.stats.swims++;
    if (a === 'sing') s.stats.songs++;
    if (mem) this.remember(mem);
    f.phase = 'thinking'; f.timer = rnd(1.5, 3.5); f.path = []; f.moving = false;
  }

  changeWeather() {
    const s = this.s, prev = s.weather, r = Math.random();
    s.weather = r < 0.5 ? 'sunny' : r < 0.78 ? 'cloudy' : 'rain';
    s.weatherT = rnd(120, 300);
    if (s.weather === prev) return;
    if (s.weather === 'rain') { this.remember('It started raining! Best. Weather. Ever.'); if (!this.isAsleep()) this.say(pick(['Rain!! 🌧️', 'Ooh, raindrops!']), 4); }
    else if (prev === 'rain') this.remember('The rain stopped. I miss it already.');
  }

  // ---------- visitors ----------
  visit(evt = {}) {
    const s = this.s, f = s.frog, name = clean(evt.name) || 'A visitor', asleep = this.isAsleep();
    if (evt.type === 'letter') {
      const text = clean(evt.text, 280);
      if (!text) return { ok: false, error: 'Write something first!' };
      if (s.mailbox.length >= 12) return { ok: false, error: 'The mailbox is full. Try again in a bit!' };
      s.mailbox.push({ id: ++s.letterId, name, text });
      s.needs.social = clamp(s.needs.social + 2);
      this.remember(`A letter arrived from ${name}.`);
      if (!asleep) this.say(pick(['Ooh, was that the mailbox?', 'Mail! I think I got mail!']), 4);
    } else if (evt.type === 'bug') {
      s.needs.hunger = clamp(s.needs.hunger + (asleep ? 8 : 14));
      s.stats.bugsEaten++;
      if (asleep) this.remember(`${name} left me a bug while I was asleep. Found it later!`);
      else { f.lickAt = s.t + 1.6; this.say(pick(['A snack! Thank you!', '*SLURP* ...delicious.', 'Mmm, crunchy!']), 4); this.remember(`${name} dropped a bug for me. Yum!`); }
    } else if (evt.type === 'wave') {
      s.needs.social = clamp(s.needs.social + (asleep ? 1 : 5));
      if (!asleep) this.say(pick(['Hi there! 👋', 'Oh, hello!', '*waves a tiny webbed hand*', 'Ribbit! Hi!']), 4);
      if (!this._lastWave || s.t - this._lastWave > 60) { this.remember(asleep ? 'Someone waved while I was sleeping.' : 'A visitor waved at me!'); this._lastWave = s.t; }
    } else return { ok: false, error: 'Unknown visit' };
    s.visitSeq++;
    s.lastVisit = { seq: s.visitSeq, type: evt.type, name, asleep };
    return { ok: true, asleep };
  }

  readMail() {
    const s = this.s, f = s.frog, letters = s.mailbox.splice(0, 3);
    if (!letters.length) { this.say(pick(['No mail... hi anyway!', 'Empty mailbox. Hello, whoever is watching!']), 4); this.remember('Checked the mailbox. Empty, but I waved at the visitors anyway.'); return; }
    f.timer = Math.max(ACTIONS.mail.dur, letters.length * 8 + 4);
    const done = (replies) => {
      letters.forEach((L, i) => {
        const reply = clean((replies && replies[i]) || this.templateReply(L), 200);
        s.replies.push({ name: L.name, text: L.text, reply, day: s.day, time: timeStr(s.clock) });
        if (s.replies.length > 30) s.replies.shift();
        (s.friends[L.name] ||= { letters: 0 }).letters++;
        s.stats.lettersRead++;
        this.say(reply, 8);
        this.remember(`Read a letter from ${L.name}: "${trim(L.text, 70)}" I replied: "${trim(reply, 70)}"`);
      });
    };
    if (this.replier) {
      this.replying = true;
      Promise.resolve().then(() => this.replier(this, letters)).then(
        (r) => { this.replying = false; done(r); },
        (err) => { this.replying = false; this.emit('error', err); done(null); },
      );
    } else done(null);
  }

  browse() {
    const s = this.s, f = s.frog;
    s.lastBrowseAt = Date.now();
    this.say(pick(['Let me look this up...', 'Searching the internet...', '*tap tap tap*']), 4);
    this.replying = true;
    Promise.resolve().then(() => this.browser(this)).then(
      (r) => {
        this.replying = false;
        if (!r || !r.topic) throw new Error('no result');
        const topic = clean(r.topic, 80), learned = clean(r.learned, 240);
        f.thought = clean(`I looked up ${topic}!`, 160);
        this.say(clean(r.say || learned, 160), 8);
        s.discoveries.push({ day: s.day, time: timeStr(s.clock), topic, learned });
        if (s.discoveries.length > 30) s.discoveries.shift();
        this.remember(`Looked up "${topic}" on the internet. I learned: ${learned}`);
        f.timer = Math.max(f.timer, 10);
      },
    ).catch((err) => {
      this.replying = false;
      if (err?.message !== 'no result') this.emit('error', err);
      this.say('Hmm, the internet is not working for me right now.', 5);
      this.remember('Tried to look something up, but the internet would not load.');
    });
  }

  templateReply(L) {
    const t = L.text.toLowerCase(), n = L.name, again = (this.s.friends[n]?.letters || 0) > 0;
    if (/\b(bug|bugs|fly|flies|snack|food|eat)\b/.test(t)) return pick([`Did someone say bugs? ${n}, you get me.`, `${n}, my tummy says thank you for thinking of snacks.`]);
    if (/\brain\b/.test(t)) return `${n}, rain is the best weather. I'm going to dance in the next one!`;
    if (/\b(song|sing|music)\b/.test(t)) return `${n}, I'll croak a song just for you tonight. Ribbit!`;
    if (t.includes('?')) return pick([`Hmm, good question, ${n}. I'll think about it on my lily pad.`, `${n}, I'm just a frog, but I think... yes? Maybe? Ribbit.`]);
    if (/\b(hi|hello|hey|yo|sup|howdy)\b/.test(t)) return again ? `${n}! You came back! Hi again!` : `Hi ${n}! Welcome to my pond!`;
    if (/\b(love|cute|nice|cool|awesome|best)\b/.test(t)) return `Aww, ${n}. You're making my cheeks pink.`;
    return pick([`Thank you for the letter, ${n}! I'll keep it in my mushroom house.`, `${n}, I read every word. Twice. Ribbit!`, `Got it, ${n}! Writing that in my diary.`]);
  }

  // ---------- for the AI prompt and for web pages ----------
  promptContext() {
    const s = this.s, m = this.mood();
    return [
      `Time: day ${s.day}, ${timeStr(s.clock)} (${this.isNight() ? 'night' : 'daytime'}). Weather: ${s.weather}.`,
      `Needs (0 = desperate, 100 = fully satisfied): ${NEEDS.map((k) => `${k} ${Math.round(s.needs[k])}`).join(', ')}.`,
      `Mood: ${m.label}. Letters waiting in the mailbox: ${s.mailbox.length}. Last activity: ${s.lastAction || 'none'}.`,
      `Recent memories:\n${s.memories.slice(-12).map((x) => `- [day ${x.day} ${x.time}] ${x.text}`).join('\n')}`,
      `Diary notes:\n${s.diary.slice(-5).map((d) => `- ${d.text}`).join('\n') || '- (none yet)'}`,
      `Things you have learned on the internet:\n${(s.discoveries || []).slice(-5).map((d) => `- ${d.topic}: ${d.learned}`).join('\n') || '- (nothing yet)'}`,
    ].join('\n');
  }

  snapshot() {
    const s = this.s, f = s.frog, a = ACTIONS[f.action];
    const anim = f.phase === 'doing' ? a?.anim || 'sit' : f.phase === 'thinking' ? 'think' : 'hop';
    const verb = f.phase === 'thinking' ? 'thinking about what to do' : f.phase === 'travel' ? (f.placeLabel === 'somewhere new' ? 'heading somewhere new' : `heading to ${f.placeLabel}`) : a?.verb || '';
    return {
      name: FROG_NAME, t: s.t, clock: s.clock, time: timeStr(s.clock), day: s.day, night: this.isNight(), weather: s.weather,
      needs: { ...s.needs }, mood: this.mood(),
      frog: { x: f.x, z: f.z, face: f.face, action: f.action, phase: f.phase, anim, verb, thought: f.thought, say: f.say, moving: f.moving, lick: f.lick },
      memories: s.memories.slice(-30), diary: s.diary.slice(-10), replies: s.replies.slice(-10),
      mailbox: s.mailbox.length, stats: { ...s.stats }, lastVisit: s.lastVisit, llm: !!this.decider,
    };
  }

  serialize() { return JSON.parse(JSON.stringify(this.s)); }
}

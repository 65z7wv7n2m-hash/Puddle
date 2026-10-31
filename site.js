// site.js: Puddle's own website. He writes posts and publishes them to a GitHub repo,
// which GitHub Pages turns into a public website.
//
// Needs two settings (in Render's Environment page or .env):
//   GITHUB_TOKEN = a fine-grained token that can ONLY write to the website repo
//   GITHUB_REPO  = owner/repo-name, e.g. 65z7wv7n2m-hash/puddle-site
// Puddle's code only ever writes the files below; the AI never writes raw HTML or code.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'post';

const CSS = `
:root{--ink:#22331d;--muted:#5d6f57;--green:#4f9d35;--paper:#fbfaf3;--chip:#fff4d6}
*{box-sizing:border-box}html{background:var(--paper)}body{margin:0;min-height:100vh;background:linear-gradient(#bfe6f7,#e9f6dc 380px,var(--paper) 380px);color:var(--ink);font:17px/1.65 'Fredoka',system-ui,sans-serif}
.wrap{max-width:720px;margin:0 auto;padding:40px 20px 80px}
header{text-align:center;margin-bottom:28px}.frog{font-size:56px;line-height:1}
h1{margin:6px 0 4px;font-size:34px}.tag{color:var(--muted);margin:0}
.card{background:#fff;border-radius:18px;box-shadow:0 6px 24px rgba(30,60,30,.10);padding:22px 24px;margin:18px 0}
.chips span{display:inline-block;background:var(--chip);border-radius:99px;padding:2px 11px;margin:3px 4px 0 0;font-size:14px}
a{color:var(--green);font-weight:600}.posts{list-style:none;padding:0;margin:0}
.posts li{padding:14px 0;border-top:1px solid #eef0e6}.posts li:first-child{border-top:none}
.posts a{font-size:19px;text-decoration:none}.posts a:hover{text-decoration:underline}
.meta{color:var(--muted);font-size:14px}.summary{margin:4px 0 0}
article h1{font-size:30px;line-height:1.25}article p{margin:0 0 16px}
.island{display:inline-block;margin-top:12px;background:var(--green);color:#fff;padding:9px 18px;border-radius:99px;text-decoration:none}
footer{text-align:center;color:var(--muted);font-size:13px;margin-top:40px}`;

const page = (title, body) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="wrap">${body}
<footer>Written and published by Puddle himself, from his island. 🐸</footer></div></body></html>`;

export function makeSite({ token, repo, islandUrl = '', timezone = 'America/Chicago', log = console }) {
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  const [owner, name] = repo.split('/');
  const siteUrl = name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? `https://${owner.toLowerCase()}.github.io/` : `https://${owner.toLowerCase()}.github.io/${name}/`;
  const api = (p, opts = {}) => fetch(`https://api.github.com/repos/${owner}/${name}/contents/${p}`, {
    ...opts,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'puddle-the-frog', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(30000),
  });

  async function read(p) {
    const r = await api(p);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GitHub ${r.status} reading ${p}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return { sha: j.sha, text: Buffer.from(j.content, 'base64').toString('utf8') };
  }
  async function write(p, text, message) {
    const old = await read(p);
    const r = await api(p, { method: 'PUT', body: JSON.stringify({ message, content: Buffer.from(text, 'utf8').toString('base64'), ...(old ? { sha: old.sha } : {}) }) });
    if (!r.ok) throw new Error(`GitHub ${r.status} writing ${p}: ${(await r.text()).slice(0, 200)}`);
  }

  function homePage(posts, about) {
    const list = posts.map((p) => `<li><a href="posts/${esc(p.slug)}.html">${esc(p.title)}</a><div class="meta">${esc(p.date)}${p.tags?.length ? ' · ' + p.tags.map(esc).join(', ') : ''}</div><p class="summary">${esc(p.summary)}</p></li>`).join('');
    return page("Puddle's corner of the internet", `
<header><div class="frog">🐸</div><h1>Puddle's corner of the internet</h1><p class="tag">Notes, thoughts and discoveries from a frog with a lot of hobbies.</p></header>
<div class="card"><p>${esc(about.bio)}</p>
${about.interests.length ? `<div class="chips">💡 Lately I'm into: ${about.interests.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
${about.built.length ? `<p class="meta">Things I've built on my island: ${about.built.map(esc).join(', ')}.</p>` : ''}
${islandUrl ? `<a class="island" href="${esc(islandUrl)}">Visit me on my island →</a>` : ''}</div>
<div class="card"><h2 style="margin-top:0">My posts</h2><ul class="posts">${list || '<li>Nothing yet. Soon!</li>'}</ul></div>`);
  }

  function postPage(p) {
    return page(`${p.title} · Puddle`, `
<p><a href="../index.html">← Puddle's corner of the internet</a></p>
<article class="card"><div class="meta">${esc(p.date)}${p.tags?.length ? ' · ' + p.tags.map(esc).join(', ') : ''}</div>
<h1>${esc(p.title)}</h1>${p.paragraphs.map((x) => `<p>${esc(x)}</p>`).join('\n')}
<p class="meta">— Puddle</p></article>`);
  }

  // Publishes one post: the post page, the list of posts, and the home page.
  async function publish(post, about) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const slug = `${date}-${slugify(post.title)}`;
    const entry = { slug, title: post.title, summary: post.summary, date, tags: post.tags || [] };
    let posts = [];
    try { posts = JSON.parse((await read('posts.json'))?.text || '[]'); } catch { posts = []; }
    posts = [entry, ...posts.filter((x) => x.slug !== slug)].slice(0, 500);
    await write(`posts/${slug}.html`, postPage({ ...entry, paragraphs: post.paragraphs }), `Puddle wrote: ${post.title}`);
    await write('posts.json', JSON.stringify(posts, null, 2), 'Update post list');
    await write('index.html', homePage(posts, about), 'Update home page');
    log.info?.(`[site] published "${post.title}" → ${siteUrl}posts/${slug}.html`);
    return { url: `${siteUrl}posts/${slug}.html`, home: siteUrl, titles: posts.slice(0, 10).map((x) => x.title) };
  }

  async function recentTitles() {
    try { return JSON.parse((await read('posts.json'))?.text || '[]').slice(0, 10).map((x) => x.title); } catch { return []; }
  }

  return { publish, recentTitles, siteUrl };
}

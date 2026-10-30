// Builds public/index.html by pasting brain.js into the page template,
// so the page and the server always share the exact same brain code.
import fs from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const tpl = fs.readFileSync(here('./web/index.template.html'), 'utf8');
const brain = fs.readFileSync(here('./brain.js'), 'utf8');
fs.mkdirSync(here('./public/'), { recursive: true });
fs.writeFileSync(here('./public/index.html'), tpl.replace('/*__BRAIN__*/', () => brain));
console.log('Built public/index.html');

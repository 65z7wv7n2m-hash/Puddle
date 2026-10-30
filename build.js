// Builds public/index.html by pasting brain.js into the page template.
import fs from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const tplFile = fs.existsSync(here('./web/index.template.html'))
  ? './web/index.template.html'
  : './index.template.html';
const tpl = fs.readFileSync(here(tplFile), 'utf8');
const brain = fs.readFileSync(here('./brain.js'), 'utf8');
fs.mkdirSync(here('./public/'), { recursive: true });
fs.writeFileSync(here('./public/index.html'), tpl.replace('/*__BRAIN__*/', () => brain));
console.log('Built public/index.html');

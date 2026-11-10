import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
const root = resolve('dist');
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
async function walk(dir) { const result = []; for (const entry of await readdir(dir, { withFileTypes: true })) { const p = resolve(dir, entry.name); result.push(...(entry.isDirectory() ? await walk(p) : [p])); } return result; }
const files = await walk(root);
const pages = files.filter(f => f.endsWith('.html'));
const failures = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let href = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    const [pathname, hash] = href.split('#');
    let clean = decodeURIComponent(pathname.split('?')[0]);
    if (base && clean.startsWith(base + '/')) clean = clean.slice(base.length);
    let target = !clean ? page : clean.startsWith('/') ? resolve(root, '.' + clean) : resolve(dirname(page), clean);
    if (!target.startsWith(root + '/') && target !== root) { failures.push(`${relative(root, page)}: outside build directory: ${href}`); continue; }
    try {
      if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
      await stat(target);
      if (hash && target.endsWith('.html')) {
        const targetHtml = await readFile(target, 'utf8');
        const ids = [...targetHtml.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
        if (!ids.includes(decodeURIComponent(hash))) failures.push(`${relative(root, page)}: missing anchor ${href}`);
      }
    } catch { failures.push(`${relative(root, page)}: missing ${href}`); }
    checked++;
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Checked ${pages.length} HTML pages and ${checked} internal links/assets. All resolve.`);

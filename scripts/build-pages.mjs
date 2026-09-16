import { build } from 'esbuild';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
await mkdir('.site-build', { recursive: true });
await build({ stdin: { contents: `export { App } from './src/App'; export { Photography } from './src/Photography'; export { workProjects } from './src/portfolioData';`, resolveDir: process.cwd(), loader: 'tsx' }, outfile: '.site-build/pages.cjs', bundle: true, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' } });
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { App, Photography, workProjects } = require('../.site-build/pages.cjs');
global.window = { location: { pathname: '/' } };
const template = await readFile('dist/index.html', 'utf8');
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
async function page(route, title, description, content, photography = false) {
  let html = template.replace(/<title>.*?<\/title>/s, '<title>' + escape(title) + '</title>')
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/s, '$1' + escape(description) + '$2')
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/s, '$1' + escape(title) + '$2')
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/s, '$1' + escape(description) + '$2')
    .replace('<div id="root"></div>', '<div id="root">' + content + '</div>');
  if (photography) html = html.replace('<html lang="en">','<html lang="en" data-photography="true">').replace(/<meta\s+property="og:image"[^>]*>/s,'');
  await mkdir('dist/' + route, { recursive: true });
  await writeFile('dist/' + route + (route ? '/' : '') + 'index.html', html);
}
await page('', 'Gala X Ci — Ci Song / Design', 'Ci Song’s portfolio: product design, conversational AI, spatial experiences and physical interfaces.', renderToStaticMarkup(React.createElement(App)) + '<noscript><p>Browse projects: ' + workProjects.map(p=>'<a href="/work/'+p.slug+'/">'+escape(p.title)+'</a>').join(' · ') + '</p></noscript>');
await page('photography', 'Ci Song — Photography & Film', 'Portraits, restaurants, spaces and live performances. Photography portfolio layout preview; images coming soon.', renderToStaticMarkup(React.createElement(Photography)), true);
for (const project of workProjects) {
 const content = '<main style="padding:5vw;max-width:1100px;margin:auto"><a href="/">← Gala X Ci / All work</a><h1>'+escape(project.title)+'</h1><p>'+escape(project.summary)+'</p><img src="'+project.image+'" alt="'+escape(project.imageAlt)+'" width="'+project.imageWidth+'" height="'+project.imageHeight+'" style="width:100%;height:auto">'+project.overview.map(p=>'<p>'+escape(p)+'</p>').join('')+project.highlights.map(h=>'<section><h2>'+escape(h.title)+'</h2><p>'+escape(h.body)+'</p></section>').join('')+'</main>';
 await page('work/'+project.slug, project.title+' — Ci Song / Gala X Ci', project.summary, content);
}
await writeFile('dist/404.html', template.replace('<div id="root"></div>', '<main><h1>Page not found</h1><a href="/">Design portfolio</a> · <a href="/photography/">Photography &amp; Film</a></main>').replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/g,''));
// Publish the approved glass-and-starlight site at its branded entry. Keep the
// previous design available separately; Photography and direct case URLs retain
// their existing bundles. The development entries remain independent.
await mkdir('dist/legacy', { recursive: true });
await writeFile('dist/legacy/index.html', await readFile('dist/index.html', 'utf8'));
await mkdir('dist/galaxci', { recursive: true });
await writeFile('dist/galaxci/index.html', await readFile('dist/v-next/index.html', 'utf8'));
// Preserve bookmarked project hashes and query options when entering at /. The
// replacement avoids an extra Back-button step through this forwarding page.
await writeFile('dist/index.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gala X Ci — Ci Song</title><script>location.replace("/galaxci/" + location.search + location.hash);</script><noscript><meta http-equiv="refresh" content="0;url=/galaxci/"></noscript></head><body><a href="/galaxci/">Open Gala X Ci</a></body></html>');
// This offline palette contact sheet is a review artifact, not a site asset.
await rm('dist/v-next/work-background/palette-review.jpg', { force: true });
await rm('.site-build',{recursive:true,force:true});
console.log('Published /galaxci/ with root forwarding, legacy design, photography, seven project routes and a 404 page.');

/**
 * Copie hors ligne du plan : un seul fichier HTML, utilisable sans réseau (ouvert depuis le disque,
 * envoyé par e-mail, posé sur un intranet).
 *
 * Après `vite build --mode hors-ligne` (code en un seul fichier, polices intégrées), ce script :
 *   - intègre le code et les styles dans la page ;
 *   - y ajoute les données de la maquette (scene.json) et l'image du plan d'origine ;
 *   - retire les liens vers des fichiers externes.
 * Le PDF d'implantation confidentiel n'y figure jamais.
 *
 * Usage : npm run build:hors-ligne → dist-hors-ligne/ocellis-plan-hors-ligne.html
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sortie = join(racine, 'dist-hors-ligne');
const pub = join(racine, 'public');

let html = readFileSync(join(sortie, 'index.html'), 'utf8');
const assets = readdirSync(join(sortie, 'assets'));
const js = assets.filter((f) => f.endsWith('.js'));
const css = assets.filter((f) => f.endsWith('.css'));
if (js.length !== 1) throw new Error(`un seul fichier JS attendu, trouvé : ${js.join(', ')}`);

/** Texte sûr dans une balise <script> ou <style>. */
const sur = (t) => t.replace(/<\/(script|style)/gi, '<\\/$1');

// Données intégrées : scène de la maquette et image du plan d'origine (data URL).
const config = JSON.parse(readFileSync(join(racine, 'src/config/espaces.json'), 'utf8'));
const images = {};
const image = config.plan?.image ?? config.image;
for (const chemin of [image].filter(Boolean)) {
  if (/plan-pdf/.test(chemin)) continue; // jamais le PDF d'implantation
  const ext = chemin.split('.').pop().toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
  images[chemin.replace(/^\//, '')] = `data:${type};base64,${readFileSync(join(pub, chemin)).toString('base64')}`;
}
const scene = readFileSync(join(pub, 'maquette/scene.json'), 'utf8');
const donnees =
  `<script>window.__OCELLIS_SCENE__=${sur(scene)};` +
  `window.__OCELLIS_IMAGES__=${sur(JSON.stringify(images))};</script>`;

const favicon = `data:image/png;base64,${readFileSync(join(pub, 'favicon.png')).toString('base64')}`;
html = html
  .replace(/\s*<!--[^>]*-->\s*<link rel="preload"[^>]*scene\.json[^>]*>/, '')
  .replace(/<link rel="preload"[^>]*scene\.json[^>]*>/, '')
  .replace(/href="\.\/favicon\.png"/, `href="${favicon}"`);
for (const f of css) {
  const re = new RegExp(`<link rel="stylesheet"[^>]*href="\\./assets/${f.replace(/\./g, '\\.')}"[^>]*>`);
  if (!re.test(html)) throw new Error(`feuille de style introuvable dans index.html : ${f}`);
  html = html.replace(re, () => `<style>${sur(readFileSync(join(sortie, 'assets', f), 'utf8'))}</style>`);
}
const reJs = new RegExp(`<script type="module"[^>]*src="\\./assets/${js[0].replace(/\./g, '\\.')}"[^>]*></script>`);
if (!reJs.test(html)) throw new Error('script principal introuvable dans index.html');
html = html.replace(reJs, '');
// Le code va en fin de page : #root existe déjà quand il s'exécute.
html = html.replace('</body>', () => `${donnees}\n<script type="module">${sur(readFileSync(join(sortie, 'assets', js[0]), 'utf8'))}</script>\n</body>`);

if (/(src|href)="\.\/(assets|maquette|plan)\//.test(html)) throw new Error('un lien vers un fichier externe subsiste');
const dest = join(sortie, 'ocellis-plan-hors-ligne.html');
writeFileSync(dest, html);
console.log(`${dest} (${Math.round(html.length / 1024)} Ko)`);

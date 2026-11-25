import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Le PDF d'implantation (public/plan/plan-pdf.jpg) porte la mention « ne peut être
 * communiqué sans accord » : il n'est copié dans le site publié qu'avec VITE_CALQUE_PDF=1.
 */
function retirerPlanPdf(actif: boolean): Plugin {
  return {
    name: 'retirer-plan-pdf',
    apply: 'build',
    closeBundle() {
      if (!actif) rmSync(resolve(__dirname, 'dist/plan/plan-pdf.jpg'), { force: true });
    },
  };
}

/**
 * Version des données de la maquette (empreinte de scene.json) : ajoutée à son adresse
 * (`scene.json?v=…`) pour que chaque mise en ligne soit vue tout de suite, sans attendre
 * l'expiration du cache du navigateur.
 */
function versionScene(): string {
  try {
    return createHash('sha1').update(readFileSync(resolve(__dirname, 'public/maquette/scene.json'))).digest('hex').slice(0, 10);
  } catch {
    return '0';
  }
}

function adresseScene(version: string): Plugin {
  return {
    name: 'adresse-scene',
    transformIndexHtml: (html) => html.replace('./maquette/scene.json"', `./maquette/scene.json?v=${version}"`),
  };
}

// `base: './'` permet de déployer l'application dans n'importe quel
// sous-dossier (intranet, SharePoint, Netlify, GitHub Pages…) sans reconfiguration.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Copie hors ligne (npm run build:hors-ligne) : un seul fichier JS, polices et images
  // intégrées ; outils/copie-hors-ligne.mjs assemble ensuite un unique fichier HTML.
  const horsLigne = mode === 'hors-ligne';
  const scene = versionScene();
  return {
    base: './',
    plugins: [react(), retirerPlanPdf(env.VITE_CALQUE_PDF === '1'), adresseScene(scene)],
    define: {
      'import.meta.env.VITE_SCENE_VERSION': JSON.stringify(scene),
      // Identifiant de la mise en ligne : nomme le cache du service worker (public/sw.js).
      'import.meta.env.VITE_BUILD': JSON.stringify(Date.now().toString(36)),
    },
    build: horsLigne
      ? {
          outDir: 'dist-hors-ligne',
          emptyOutDir: true,
          copyPublicDir: false,
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          modulePreload: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : undefined,
  };
});

import { rmSync } from 'node:fs';
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

// `base: './'` permet de déployer l'application dans n'importe quel
// sous-dossier (intranet, SharePoint, Netlify, GitHub Pages…) sans reconfiguration.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [react(), retirerPlanPdf(env.VITE_CALQUE_PDF === '1')],
  };
});

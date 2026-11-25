import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Typographies de la charte Ocellis : Poppins (titres), Roboto (texte), EB Garamond (exergues).
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource-variable/roboto';
import '@fontsource/eb-garamond/400.css';
// Écriture manuscrite des bulles de nom (style planche illustrée).
import '@fontsource/caveat/600.css';
import '@fontsource/eb-garamond/400-italic.css';
import './styles/theme.css';
import './styles/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Ouvertures suivantes plus rapides : le service worker garde le code, les polices et les données
// de la maquette sur l'appareil (la page elle-même est toujours redemandée au réseau, pour voir
// chaque mise à jour). Pas sur la copie hors ligne ni en développement.
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  location.protocol === 'https:' &&
  !(window as { __OCELLIS_SCENE__?: unknown }).__OCELLIS_SCENE__
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${import.meta.env.VITE_BUILD}`).catch(() => {});
  });
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Typographies de la charte Ocellis : Poppins (titres), Roboto (texte), EB Garamond (exergues).
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource-variable/roboto';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import './styles/theme.css';
import './styles/app.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

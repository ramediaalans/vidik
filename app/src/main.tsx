import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { reloadOnceForNewBuild } from './safeStorage';
import './fonts.css';
import './styles.css';
import './redesign.css';

// Vite сообщает, что не смог догрузить чанк (обычно после нового деплоя) —
// перезагружаем страницу один раз, чтобы получить актуальную сборку.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewBuild()) event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import './app.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Missing #root — index.html must provide the mount point before the bundle runs.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

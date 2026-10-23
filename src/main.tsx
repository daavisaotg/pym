// Precisa vir primeiro: aplica os rascunhos do painel quando a prévia está ligada.
import '@/app/applyDrafts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/tokens.css';
import '@/styles/base.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

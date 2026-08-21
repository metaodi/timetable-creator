import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { TimetableProvider } from './state/TimetableContext';
import './styles/app.css';
import './styles/print.css';

const container = document.getElementById('root');
if (!container) throw new Error('Element #root fehlt in index.html.');

createRoot(container).render(
  <StrictMode>
    <TimetableProvider>
      <App />
    </TimetableProvider>
  </StrictMode>,
);

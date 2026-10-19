import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tailwind.css';
import './styles/styles.css';
import './styles/amrut.css';
import './legacy';
import { bump } from './utils/legacyBus';
import App from './app/App';
import { AppProviders } from './app/providers';

/* Legacy screens call AS.render() after changing data; route it to a React re-render. */
window.AS.render = bump;

/* Clean URLs (/today). Old "#/today" bookmarks are rewritten to the same path before the router starts. */
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1));
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);

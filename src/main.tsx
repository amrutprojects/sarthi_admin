import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './assets/css/styles.css';
import './assets/css/amrut.css';
import './legacy';
import { AuthProvider } from './context/AuthContext';
import { bump } from './utils/legacyBus';
import App from './App';

/* Legacy screens call AS.render() after changing data; route it to a React re-render. */
window.AS.render = bump;

/* Clean URLs (/today). Old "#/today" bookmarks are rewritten to the same path before the router starts. */
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', window.location.hash.slice(1));
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

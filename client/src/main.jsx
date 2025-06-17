// Rewrite/client/src/main.jsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client'; // <-- Import hydrateRoot
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async'; // <-- Import HelmetProvider
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './assets/css/main.css';

// Use hydrateRoot instead of createRoot
hydrateRoot(
  document.getElementById('root'),
  <React.StrictMode>
    <Router>
      <HelmetProvider> {/* Wrap App with HelmetProvider */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </HelmetProvider>
    </Router>
  </React.StrictMode>
);

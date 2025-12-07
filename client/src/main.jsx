import React from 'react';
import { hydrateRoot } from 'react-dom/client'; // Assuming you kept SSR hydration
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google'; // Import Provider
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './assets/css/main.css';

// Get Client ID from env
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const container = document.getElementById('root');

// Ensure you use createRoot or hydrateRoot based on your setup. 
// If you reverted SSR as per previous discussions, switch this to createRoot.
// Below assumes hydration is still present or standard createRoot logic.
import { createRoot } from 'react-dom/client';

if (import.meta.env.MODE === 'development' && container.hasChildNodes()) {
    hydrateRoot(
      container,
      <React.StrictMode>
        <GoogleOAuthProvider clientId={googleClientId}>
          <Router>
            <HelmetProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </HelmetProvider>
          </Router>
        </GoogleOAuthProvider>
      </React.StrictMode>
    );
}
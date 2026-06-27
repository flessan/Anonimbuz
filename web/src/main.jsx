// web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { FeatureFlagProvider } from './context/FeatureFlagContext.jsx';
import './styles.css';
import api from './api.js';
import { auditAllEndpoints } from './utils/apiAudit.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';

window.api = api;
window.auditAPI = auditAllEndpoints;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <FeatureFlagProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </FeatureFlagProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);  
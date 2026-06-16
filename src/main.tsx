import React from 'react';
import ReactDOM from 'react-dom/client';
import { createRouterProvider } from '@tanstack/react-router';
import { Router } from './routes/__root';

// Create the router provider
const routerProvider = createRouterProvider(Router);

// Render the application
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <routerProvider />
  </React.StrictMode>
);
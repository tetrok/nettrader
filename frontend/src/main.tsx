/**
 * NetTrader 2 — Point d'Entrée Client React 18
 *
 * Usage:
 *   Initialise le rendu de l'application SPA dans le DOM via ReactDOM.createRoot.
 *
 * Logique & Fonctionnement:
 *   - Monte le composant racine <App /> au sein du conteneur HTML #root.
 *   - Active le mode strict (React.StrictMode) pour le contrôle de qualité en développement.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { analytics } from './services/analytics';
import './index.css';

// Initialisation de la télémétrie et de l'analytique
analytics.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);


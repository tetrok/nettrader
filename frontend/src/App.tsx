/**
 * NetTrader 2 — Composant Racine de l'Application (App)
 *
 * Usage:
 *   Structure globale de l'interface utilisateur web moderne.
 *   Enveloppe les pages dans les contextes d'authentification et de routage.
 *
 * Logique & Fonctionnement:
 *   - Initialise BrowserRouter et AuthProvider pour propager l'état utilisateur à toute l'arborescence.
 *   - Intègre la barre de navigation (Navbar), le bandeau de cotation (MarketTicker),
 *     la zone principale de rendu des routes (AppRoutes) et le pied de page (Footer).
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { MarketTicker } from './components/layout/MarketTicker';
import { Footer } from './components/layout/Footer';
import { AppRoutes } from './router';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
          <Navbar />
          <MarketTicker />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

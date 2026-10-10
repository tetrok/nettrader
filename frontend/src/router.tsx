/**
 * NetTrader 2 — Configuration du Routage & Gardes d'Accès (Router)
 *
 * Usage:
 *   Définit l'ensemble des routes de l'application frontend SPA et contrôle les droits d'accès.
 *
 * Logique & Fonctionnement:
 *   - ProtectedRoute : restreint l'accès aux utilisateurs authentifiés (redirection vers /login).
 *   - AdminRoute : restreint l'accès aux administrateurs (authlevel >= 99, redirection vers /).
 *   - Mappe chaque chemin d'URL vers la page correspondante (Portfolio, Market, Trading, Admin, Forums, etc.).
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { MarketPage } from './pages/MarketPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { MessagesPage } from './pages/MessagesPage';
import { ForumsPage } from './pages/ForumsPage';
import { TopicPage } from './pages/TopicPage';
import { ProfilePage } from './pages/ProfilePage';
import { MyTeamPage } from './pages/MyTeamPage';
import { HelpPage } from './pages/HelpPage';
import { AdminPage } from './pages/AdminPage';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Admin Route wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/market" element={<MarketPage />} />
      <Route path="/stocks/:code" element={<StockDetailPage />} />
      <Route path="/leaderboards" element={<LeaderboardPage />} />
      <Route path="/teams/:id" element={<TeamDetailPage />} />
      <Route path="/forums" element={<ForumsPage />} />
      <Route path="/forums/topic/:id" element={<TopicPage />} />
      <Route path="/help" element={<HelpPage />} />

      {/* Protected Routes */}
      <Route
        path="/portfolio"
        element={
          <ProtectedRoute>
            <PortfolioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-team"
        element={
          <ProtectedRoute>
            <MyTeamPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

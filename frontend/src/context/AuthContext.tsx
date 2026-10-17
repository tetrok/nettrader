/**
 * NetTrader 2 — Contexte Global d'Authentification (AuthContext)
 *
 * Usage:
 *   Fournit l'état de connexion de l'utilisateur et les fonctions d'authentification à tous les composants.
 *
 * Logique & Fonctionnement:
 *   - Stocke l'utilisateur actif (User) et son jeton de session dans le state React et localStorage.
 *   - Vérifie la session active au chargement initial via l'appel API /api/auth/me.
 *   - Expose les méthodes login(), register(), logout() et refreshUser() via le hook useAuth().
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../api/auth';
import { getToken } from '../api/client';
import { analytics } from '../services/analytics';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (login: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (getToken()) {
        const currentUser = await authApi.getMe();
        setUser(currentUser);
        if (currentUser) {
          analytics.identify(currentUser.id, {
            pseudo: currentUser.pseudo,
            email: currentUser.email,
            level: currentUser.level,
            vad: currentUser.vad,
            is_admin: currentUser.isAdmin,
          });
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (loginStr: string, pass: string) => {
    const res = await authApi.login(loginStr, pass);
    setUser(res.user);
    if (res.user) {
      analytics.identify(res.user.id, {
        pseudo: res.user.pseudo,
        email: res.user.email,
        level: res.user.level,
        vad: res.user.vad,
        is_admin: res.user.isAdmin,
      });
      analytics.track('user_logged_in', { method: 'password' });
    }
  };

  const logout = async () => {
    analytics.track('user_logged_out');
    await authApi.logout();
    setUser(null);
    analytics.reset();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  Briefcase,
  Layers,
  Trophy,
  Users,
  MessageSquare,
  Mail,
  User as UserIcon,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2 text-emerald-400 font-bold text-xl tracking-tight">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-white">Net<span className="text-emerald-400">Trader</span></span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                2.0
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 ml-6 text-sm">
              <Link to="/market" className="px-3 py-2 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                Cotations
              </Link>
              {user && (
                <>
                  <Link to="/portfolio" className="px-3 py-2 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-sky-400" />
                    Portefeuille
                  </Link>
                  <Link to="/history" className="px-3 py-2 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
                    Historique
                  </Link>
                </>
              )}
              <Link to="/leaderboards" className="px-3 py-2 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Classements
              </Link>
              <Link to="/forums" className="px-3 py-2 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Forums
              </Link>
              <Link to="/help" className="px-3 py-2 rounded-md font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                Règles & Aide
              </Link>
            </nav>
          </div>

          {/* Right Action Section */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                {/* Cashback balance pill */}
                <div className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-sm">
                  <span className="text-slate-400 text-xs">Liquidités :</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {user.cashback.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>

                <Link
                  to="/messages"
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700/50 relative"
                  title="Messagerie"
                >
                  <Mail className="w-4 h-4" />
                </Link>

                <Link
                  to="/profile"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-slate-200 hover:text-white hover:border-slate-600 flex items-center gap-1.5"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>{user.pseudo}</span>
                </Link>

                {user.isAdmin && (
                  <Link
                    to="/admin"
                    className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg border border-amber-500/30"
                    title="Administration"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/30"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 border border-slate-700"
                >
                  <LogIn className="w-4 h-4" />
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                >
                  <UserPlus className="w-4 h-4" />
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {user && (
            <div className="py-2 px-3 bg-slate-800/80 rounded-lg mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">{user.pseudo}</span>
              <span className="font-mono text-sm text-emerald-400 font-semibold">
                {user.cashback.toLocaleString('fr-FR')} €
              </span>
            </div>
          )}
          <Link
            to="/market"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            Cotations Boursières
          </Link>
          {user && (
            <>
              <Link
                to="/portfolio"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Portefeuille & Ordres
              </Link>
              <Link
                to="/history"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Historique des transactions
              </Link>
              <Link
                to="/messages"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Messagerie privée
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                Mon Profil
              </Link>
              {user.isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-amber-400 hover:bg-slate-800"
                >
                  Administration
                </Link>
              )}
            </>
          )}
          <Link
            to="/leaderboards"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            Classements
          </Link>
          <Link
            to="/forums"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            Forums Communautaires
          </Link>
          <Link
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            Règles & Aide
          </Link>

          <div className="pt-2 border-t border-slate-800">
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-slate-800"
              >
                Déconnexion
              </button>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 rounded-lg bg-slate-800 text-white font-medium"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

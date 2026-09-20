import React, { useEffect, useState } from 'react';
import { accountApi, ProfileData } from '../api/account';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Key,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Save,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState(1);
  const [mailDaily, setMailDaily] = useState(false);
  const [mailWeekly, setMailWeekly] = useState(false);
  const [profFeedback, setProfFeedback] = useState<string | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdFeedback, setPwdFeedback] = useState<string | null>(null);

  // RAZ form
  const [razPassword, setRazPassword] = useState('');
  const [razConfirm, setRazConfirm] = useState('');
  const [razFeedback, setRazFeedback] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      const data = await accountApi.getProfile();
      setProfile(data);
      setEmail(data.email);
      setLevel(data.level);
      setMailDaily(data.mailDaily);
      setMailWeekly(data.mailWeekly);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accountApi.updateProfile({ email, level, mailDaily, mailWeekly });
      setProfFeedback('Profil mis à jour avec succès.');
      refreshUser();
      setTimeout(() => setProfFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await accountApi.changePassword(currentPassword, newPassword, confirmPassword);
      setPwdFeedback('Mot de passe modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (razConfirm !== 'OK') {
      alert("Veuillez taper 'OK' pour confirmer.");
      return;
    }
    try {
      const res = await accountApi.resetAccount(razPassword, 'OK');
      setRazFeedback("Compte réinitialisé à 10 000 € avec succès !");
      setRazPassword('');
      setRazConfirm('');
      refreshUser();
      loadProfile();
      setTimeout(() => setRazFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Mon Compte & Paramètres</h1>
        <p className="text-xs text-slate-400 mt-1">
          Gérez vos informations de trader, vos préférences de notification et vos accès
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Profil du Trader</h3>
              <span className="text-xs text-slate-400">Pseudonyme : <strong className="text-white">{profile?.pseudo}</strong></span>
            </div>
          </div>

          {profFeedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{profFeedback}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Adresse E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Niveau de Difficulté</label>
              <select
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
              >
                <option value={1}>1 - Débutant (Comptant standard)</option>
                <option value={2}>2 - Initié (Passage d'ordres à seuils)</option>
                <option value={3}>3 - Expert (Vente à découvert & effet de levier)</option>
              </select>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailDaily}
                  onChange={(e) => setMailDaily(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500"
                />
                <span>Recevoir les statistiques quotidiennes par e-mail</span>
              </label>
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mailWeekly}
                  onChange={(e) => setMailWeekly(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500"
                />
                <span>Recevoir le bilan hebdomadaire et classements</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sécurité & Mot de passe</h3>
              <span className="text-xs text-slate-400">Modifiez votre mot de passe de connexion</span>
            </div>
          </div>

          {pwdFeedback && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{pwdFeedback}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Key className="w-4 h-4" />
              <span>Mettre à jour le mot de passe</span>
            </button>
          </form>
        </div>
      </div>

      {/* RAZ (Remise à Zéro) Danger Zone */}
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Remise à Zéro du Compte (RAZ 10 000 €)</h3>
            <span className="text-xs text-rose-300/80">
              Réinitialisez votre solde à 10 000 € et purgez vos positions pour recommencer une partie
            </span>
          </div>
        </div>

        {razFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{razFeedback}</span>
          </div>
        )}

        <form onSubmit={handleResetAccount} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <input
              type="password"
              placeholder="Votre mot de passe"
              value={razPassword}
              onChange={(e) => setRazPassword(e.target.value)}
              className="w-full bg-slate-950 border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-rose-500"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Tapez 'OK' pour valider"
              value={razConfirm}
              onChange={(e) => setRazConfirm(e.target.value)}
              className="w-full bg-slate-950 border border-rose-900/50 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:border-rose-500"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Confirmer la RAZ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

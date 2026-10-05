import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamsApi } from '../api/teams';
import { useAuth } from '../context/AuthContext';
import {
  MyTeamStatus,
  TeamInvitation,
  TeamMember,
} from '../types';
import {
  Users,
  Crown,
  Globe,
  MessageSquare,
  LogOut,
  UserPlus,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const MyTeamPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamStatus, setTeamStatus] = useState<MyTeamStatus | null>(null);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab for leader
  const [activeLeaderTab, setActiveLeaderTab] = useState<'roster' | 'invite' | 'settings'>('roster');

  // Candidate search (for leader)
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<{ userId: number; pseudo: string }[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  // Team creation / edit form state
  const [formName, setFormName] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);

  const loadData = async () => {
    try {
      const [status, invs] = await Promise.all([
        teamsApi.getMyTeam(),
        teamsApi.getMyInvitations(),
      ]);
      setTeamStatus(status);
      setInvitations(invs);

      // Pre-fill form if leader
      if (status.team && status.isLeader) {
        setFormName(status.team.name);
        setFormTag(status.team.tag);
        setFormWebsite(status.team.website);
        setFormDescription(status.team.description);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (success: string | null, error: string | null = null) => {
    setSuccessMsg(success);
    setErrorMsg(error);
    if (success) {
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  // Search candidate players
  const handleSearchCandidates = async (query: string) => {
    if (!teamStatus?.team) return;
    setSearchingCandidates(true);
    try {
      const res = await teamsApi.searchCandidates(teamStatus.team.id, query);
      setCandidates(res);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSearchingCandidates(false);
    }
  };

  useEffect(() => {
    if (teamStatus?.isLeader && activeLeaderTab === 'invite') {
      const timer = setTimeout(() => {
        handleSearchCandidates(candidateQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [candidateQuery, activeLeaderTab]);

  // Actions
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setErrorMsg(null);
    try {
      await teamsApi.createTeam({
        name: formName,
        tag: formTag,
        website: formWebsite,
        description: formDescription,
      });
      showNotification("Votre demande de création d'équipe a été soumise à la modération de l'administrateur !");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamStatus?.team) return;
    setSubmittingForm(true);
    setErrorMsg(null);
    try {
      await teamsApi.updateTeam(teamStatus.team.id, {
        name: formName,
        tag: formTag,
        website: formWebsite,
        description: formDescription,
      });
      showNotification("Modifications soumises à la modération administrateur.");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la modification');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleJoinTeam = async (teamId: number) => {
    try {
      await teamsApi.joinTeam(teamId);
      showNotification("Félicitations, vous avez rejoint l'équipe !");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRejectInvitation = async (teamId: number) => {
    try {
      await teamsApi.rejectInvitation(teamId);
      showNotification("Invitation refusée.");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleLeaveTeam = async () => {
    const isLeader = teamStatus?.isLeader;
    const confirmText = isLeader
      ? "Êtes-vous sûr de vouloir quitter l'équipe ? En tant que chef, la responsabilité sera transmise au membre le plus ancien ou le club sera dissous s'il ne reste aucun membre."
      : "Êtes-vous sûr de vouloir quitter cette équipe ?";

    if (!window.confirm(confirmText)) return;

    try {
      await teamsApi.leaveTeam();
      showNotification("Vous avez quitté l'équipe.");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleInvitePlayer = async (targetUserId: number) => {
    if (!teamStatus?.team) return;
    try {
      await teamsApi.invitePlayer(teamStatus.team.id, targetUserId);
      showNotification("Invitation envoyée avec succès !");
      loadData();
      handleSearchCandidates(candidateQuery);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCancelInvite = async (targetUserId: number) => {
    if (!teamStatus?.team) return;
    try {
      await teamsApi.cancelInvitation(teamStatus.team.id, targetUserId);
      showNotification("Invitation annulée.");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleKickMember = async (targetUserId: number, pseudo: string) => {
    if (!teamStatus?.team) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir exclure ${pseudo} de l'équipe ?`)) return;

    try {
      await teamsApi.kickMember(teamStatus.team.id, targetUserId);
      showNotification(`${pseudo} a été retiré de l'équipe.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const team = teamStatus?.team;
  const isLeader = teamStatus?.isLeader;
  const pendingApproval = teamStatus?.pendingApproval;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Gestion des Équipes & Clubs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {team ? team.name : 'Mon Équipe'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {team
              ? `Espace collaboratif et gestion de votre club de trading [${team.tag}]`
              : 'Rejoignez un club de traders, consultez vos invitations ou fondez votre propre équipe'}
          </p>
        </div>

        <Link
          to="/leaderboards"
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 self-start transition"
        >
          <ExternalLink className="w-4 h-4 text-amber-400" />
          Voir le classement des équipes
        </Link>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Demande en cours de modération */}
      {pendingApproval && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-300">
              Demande d'équipe en cours de modération par l'administrateur
            </h4>
            <p className="text-xs text-amber-200/80">
              Vous avez soumis une demande pour{' '}
              <strong>[{pendingApproval.tag}] {pendingApproval.name}</strong> ({pendingApproval.isModification ? 'mise à jour' : 'création'}). Un administrateur doit la valider avant activation.
            </p>
          </div>
        </div>
      )}

      {/* CAS 1 : L'UTILISATEUR FAIT PARTIE D'UNE ÉQUIPE */}
      {team ? (
        <div className="space-y-6">
          {/* Fiche d'équipe */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    [{team.tag}]
                  </span>
                  {isLeader && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Chef d'équipe
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Chef : <strong>{team.leader.pseudo}</strong>
                  </span>
                  {team.website && (
                    <>
                      <span>•</span>
                      <a
                        href={team.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-400 hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Site officiel
                      </a>
                    </>
                  )}
                  {team.forumId && (
                    <>
                      <span>•</span>
                      <Link
                        to={`/forums`}
                        className="flex items-center gap-1 text-indigo-400 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Forum privé du club
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Médailles & bouton quitter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
                  <span>Palmarès :</span>
                  <span className="font-semibold text-amber-400">🥇 {team.medals.gold}</span>
                  <span className="font-semibold text-slate-300">🥈 {team.medals.silver}</span>
                  <span className="font-semibold text-amber-700">🥉 {team.medals.bronze}</span>
                </div>

                <button
                  onClick={handleLeaveTeam}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Quitter l'équipe
                </button>
              </div>
            </div>

            {team.description && (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {team.description}
              </div>
            )}
          </div>

          {/* Navigation des onglets (si Chef) */}
          {isLeader && (
            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl max-w-md">
              <button
                onClick={() => setActiveLeaderTab('roster')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeLeaderTab === 'roster'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Membres ({team.members.length})
              </button>
              <button
                onClick={() => setActiveLeaderTab('invite')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeLeaderTab === 'invite'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Recrutement
                {(team.pendingInvitesSent?.length ?? 0) > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                    {team.pendingInvitesSent?.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveLeaderTab('settings')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeLeaderTab === 'settings'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Paramètres
              </button>
            </div>
          )}

          {/* ONGLET 1 : COMPOSITION DU CLUB */}
          {(!isLeader || activeLeaderTab === 'roster') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Composition de l'équipe ({team.members.length} membres)
                </h3>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Trader</th>
                      <th className="px-5 py-3.5">Date d'adhésion</th>
                      <th className="px-5 py-3.5 text-right">Capital Entrée</th>
                      <th className="px-5 py-3.5 text-right">Capital Actuel</th>
                      <th className="px-5 py-3.5 text-right">Progression</th>
                      {isLeader && <th className="px-5 py-3.5 text-center w-24">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {team.members.map((m: TeamMember) => {
                      const isGain = m.performance >= 0;
                      return (
                        <tr key={m.userId} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-3.5 font-sans font-medium text-white flex items-center gap-2">
                            {m.isLeader && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{m.pseudo}</span>
                            {m.userId === user?.id && (
                              <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                vous
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-400 font-sans">{m.joinDate}</td>
                          <td className="px-5 py-3.5 text-right text-slate-400">{m.capitalJoin.toFixed(2)} €</td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-200">
                            {m.currentCapital.toFixed(2)} €
                          </td>
                          <td
                            className={`px-5 py-3.5 text-right font-bold ${
                              isGain ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isGain ? '+' : ''}{m.performance.toFixed(2)}%
                          </td>
                          {isLeader && (
                            <td className="px-5 py-3.5 text-center">
                              {!m.isLeader ? (
                                <button
                                  onClick={() => handleKickMember(m.userId, m.pseudo)}
                                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                  title="Exclure de l'équipe"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-xs text-slate-600">-</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ONGLET 2 : RECRUTEMENT & INVITATIONS (Chef) */}
          {isLeader && activeLeaderTab === 'invite' && (
            <div className="space-y-6">
              {/* Invitations envoyées en attente */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Invitations envoyées en attente ({team.pendingInvitesSent?.length ?? 0})
                </h3>

                {(!team.pendingInvitesSent || team.pendingInvitesSent.length === 0) ? (
                  <p className="text-xs text-slate-400">Aucune invitation en attente pour le moment.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {team.pendingInvitesSent.map((inv) => (
                      <div
                        key={inv.userId}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                      >
                        <span className="font-semibold text-white">{inv.pseudo}</span>
                        <button
                          onClick={() => handleCancelInvite(inv.userId)}
                          className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Annuler
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rechercher et inviter un joueur */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    Inviter un nouveau trader
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Recherchez parmi les traders inscrits qui ne font partie d'aucun club.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={candidateQuery}
                    onChange={(e) => setCandidateQuery(e.target.value)}
                    placeholder="Tapez le pseudo d'un joueur..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {searchingCandidates ? (
                  <div className="py-4 text-center text-xs text-slate-400">Recherche...</div>
                ) : candidates.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Aucun joueur disponible correspondant à la recherche.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {candidates.map((c) => (
                      <div
                        key={c.userId}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
                      >
                        <span className="text-xs font-semibold text-white">{c.pseudo}</span>
                        <button
                          onClick={() => handleInvitePlayer(c.userId)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1 transition shadow-sm"
                        >
                          <UserPlus className="w-3 h-3" />
                          Inviter
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ONGLET 3 : PARAMÈTRES / MODIFICATION D'ÉQUIPE (Chef) */}
          {isLeader && activeLeaderTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-400" />
                  Modifier les informations du club
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Toute mise à jour du nom, du sigle ou du site nécessite une validation par un administrateur.
                </p>
              </div>

              <form onSubmit={handleUpdateTeam} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Nom de l'équipe</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Sigle (Tag)</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Site Web officiel (optionnel)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Présentation & description</label>
                  <textarea
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
                >
                  {submittingForm ? 'Transmission...' : 'Soumettre les modifications'}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* CAS 2 : LE JOUEUR N'A PAS D'ÉQUIPE */
        <div className="space-y-8">
          {/* Section 1 : Invitations reçues */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              Invitations reçues ({invitations.length})
            </h3>

            {invitations.length === 0 ? (
              <p className="text-xs text-slate-400">
                Vous n'avez aucune invitation en attente. Vous pouvez fonder votre propre club ci-dessous ou demander à un chef de club de vous inviter.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {invitations.map((inv) => (
                  <div
                    key={inv.teamId}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{inv.name}</h4>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            [{inv.tag}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 pt-0.5">
                          Chef d'équipe : <strong>{inv.leader.pseudo}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleJoinTeam(inv.teamId)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                          Rejoindre
                        </button>
                        <button
                          onClick={() => handleRejectInvitation(inv.teamId)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-rose-500/20 text-rose-400 border border-slate-800 rounded-lg text-xs font-semibold transition"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>

                    {inv.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{inv.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 : Créer une équipe */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 max-w-2xl">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                <Crown className="w-4 h-4" />
                <span>Nouveau Club de Trading</span>
              </div>
              <h3 className="text-xl font-bold text-white">Fonder une équipe</h3>
              <p className="text-xs text-slate-400 mt-1">
                Créez votre club, rassemblez des investisseurs et grimpez dans le classement mensuel inter-équipes.
                Conformément aux règles du jeu, chaque création est soumise à validation par un administrateur.
              </p>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Nom complet de l'équipe *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex : Golden Bulls Trading"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Sigle / Tag (2-10 car.) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Ex : GBT"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Site Web officiel (optionnel)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description & Devise du club</label>
                <textarea
                  rows={4}
                  placeholder="Présentez la stratégie ou l'esprit de votre équipe..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submittingForm || pendingApproval !== null}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
              >
                {submittingForm ? 'Envoi en cours...' : "Soumettre la création de l'équipe"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

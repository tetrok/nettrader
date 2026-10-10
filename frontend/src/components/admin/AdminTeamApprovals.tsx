/**
 * NetTrader 2 — Modération et Approbation des Équipes (AdminTeamApprovals)
 *
 * Usage:
 *   Interface administrateur pour valider, suspendre ou modifier les équipes de joueurs.
 */

import React, { useState } from 'react';
import { teamsApi } from '../../api/teams';
import { Shield, Check, X, Globe, User, Clock, AlertCircle } from 'lucide-react';
import { PendingTeamApproval } from '../../types';

interface AdminTeamApprovalsProps {
  approvals: PendingTeamApproval[];
  onRefresh: () => void;
}

export const AdminTeamApprovals: React.FC<AdminTeamApprovalsProps> = ({
  approvals,
  onRefresh,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [commentModal, setCommentModal] = useState<{
    id: number;
    action: 'approve' | 'reject';
    teamName: string;
  } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (id: number, action: 'approve' | 'reject', customComment: string = '') => {
    setProcessingId(id);
    setError(null);
    try {
      await teamsApi.reviewPendingApproval(id, action, customComment);
      setCommentModal(null);
      setComment('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du traitement.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Demandes d'Équipes en Attente de Modération
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Validez ou rejetez les demandes de création et modification de clubs soumises par les joueurs
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
          {approvals.length} demande{approvals.length > 1 ? 's' : ''} en attente
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
          <p className="text-sm font-medium text-slate-300">Aucune demande d'équipe en attente de modération.</p>
          <p className="text-xs text-slate-500 mt-1">Toutes les créations d'équipes ont été traitées.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {approvals.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-white">{app.name}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      [{app.tag}]
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        app.isModification
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      }`}
                    >
                      {app.isModification ? 'Modification' : 'Nouvelle Équipe'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Responsable : <strong>{app.pseudo}</strong> ({app.email})
                    </span>
                    {app.website && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Globe className="w-3.5 h-3.5" />
                        <a href={app.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {app.website}
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    disabled={processingId === app.id}
                    onClick={() => handleAction(app.id, 'approve')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approuver
                  </button>
                  <button
                    disabled={processingId === app.id}
                    onClick={() => {
                      setCommentModal({
                        id: app.id,
                        action: 'reject',
                        teamName: app.name,
                      });
                      setComment('');
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Refuser
                  </button>
                </div>
              </div>

              {app.description && (
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {app.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Motif de rejet / commentaire */}
      {commentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <X className="w-4 h-4 text-rose-400" />
              Refuser la demande : {commentModal.teamName}
            </h3>
            <p className="text-xs text-slate-400">
              Veuillez indiquer au chef d'équipe le motif du refus (ce message lui sera transmis).
            </p>

            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex : Nom ou tag inapproprié, lien invalide..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCommentModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={() => handleAction(commentModal.id, 'reject', comment)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition disabled:opacity-50"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

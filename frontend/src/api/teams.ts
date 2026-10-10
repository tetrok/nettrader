/**
 * NetTrader 2 — Client API des Équipes de Joueurs
 *
 * Usage:
 *   Expose les requêtes pour la gestion collaborative d'équipe : création, adhésion, membres, invitations.
 */

import { apiClient } from './client';
import {
  TeamRank,
  TeamDetail,
  TeamInvitation,
  MyTeamStatus,
  PendingTeamApproval,
} from '../types';

export const teamsApi = {
  /**
   * Classement général des équipes
   */
  getTeams: async (): Promise<{
    items: TeamRank[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    return apiClient('leaderboard/teams');
  },

  /**
   * Détails d'une équipe par son ID
   */
  getTeam: async (id: number): Promise<TeamDetail> => {
    return apiClient<TeamDetail>(`teams/${id}`);
  },

  /**
   * Statut et équipe du joueur connecté
   */
  getMyTeam: async (): Promise<MyTeamStatus> => {
    return apiClient<MyTeamStatus>('teams/my-team');
  },

  /**
   * Liste des invitations reçues par le joueur connecté
   */
  getMyInvitations: async (): Promise<TeamInvitation[]> => {
    return apiClient<TeamInvitation[]>('teams/invitations');
  },

  /**
   * Refuser une invitation reçue
   */
  rejectInvitation: async (teamId: number): Promise<void> => {
    await apiClient(`teams/invitations/${teamId}/reject`, {
      method: 'POST',
    });
  },

  /**
   * Créer (demander) une nouvelle équipe
   */
  createTeam: async (payload: {
    name: string;
    tag: string;
    description: string;
    website: string;
  }): Promise<void> => {
    await apiClient('teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Rejoindre une équipe (acceptation d'invitation)
   */
  joinTeam: async (id: number): Promise<void> => {
    await apiClient(`teams/${id}/join`, {
      method: 'POST',
    });
  },

  /**
   * Quitter son équipe actuelle
   */
  leaveTeam: async (): Promise<void> => {
    await apiClient('teams/leave', {
      method: 'POST',
    });
  },

  /**
   * Mettre à jour les informations de son équipe (chef uniquement)
   */
  updateTeam: async (
    teamId: number,
    payload: {
      name: string;
      tag: string;
      description: string;
      website: string;
    }
  ): Promise<void> => {
    await apiClient(`teams/${teamId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Rechercher des traders candidats invitables (chef uniquement)
   */
  searchCandidates: async (
    teamId: number,
    query: string = ''
  ): Promise<{ userId: number; pseudo: string }[]> => {
    const q = encodeURIComponent(query);
    return apiClient<{ userId: number; pseudo: string }[]>(
      `teams/${teamId}/candidates?q=${q}`
    );
  },

  /**
   * Inviter un joueur (chef uniquement)
   */
  invitePlayer: async (teamId: number, targetUserId: number): Promise<void> => {
    await apiClient(`teams/${teamId}/invitations`, {
      method: 'POST',
      body: JSON.stringify({ userId: targetUserId }),
    });
  },

  /**
   * Annuler une invitation envoyée (chef uniquement)
   */
  cancelInvitation: async (
    teamId: number,
    targetUserId: number
  ): Promise<void> => {
    await apiClient(`teams/${teamId}/invitations/${targetUserId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Exclure un joueur de l'équipe (chef uniquement)
   */
  kickMember: async (teamId: number, targetUserId: number): Promise<void> => {
    await apiClient(`teams/${teamId}/members/${targetUserId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Récupérer les demandes de création/modification d'équipes en attente (admin)
   */
  getPendingApprovals: async (): Promise<PendingTeamApproval[]> => {
    return apiClient<PendingTeamApproval[]>('admin/teams/pending');
  },

  /**
   * Valider ou rejeter une demande d'équipe (admin)
   */
  reviewPendingApproval: async (
    id: number,
    action: 'approve' | 'reject',
    comment: string = ''
  ): Promise<void> => {
    await apiClient(`admin/teams/pending/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, comment }),
    });
  },
};

import { apiClient } from './client';
import { PlayerRank, TeamRank, TeamDetail } from '../types';

export const leaderboardApi = {
  getPlayers: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    period?: string;
  } = {}): Promise<{
    items: PlayerRank[];
    total: number;
    page: number;
    totalPages: number;
    availablePeriods: Record<string, string>;
    currentPeriod: string;
  }> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.period) searchParams.set('period', params.period);

    return apiClient(`leaderboard/players?${searchParams.toString()}`);
  },

  getTeams: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    period?: string;
  } = {}): Promise<{
    items: TeamRank[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.period) searchParams.set('period', params.period);

    return apiClient(`leaderboard/teams?${searchParams.toString()}`);
  },

  getTeam: async (id: number): Promise<TeamDetail> => {
    return apiClient<TeamDetail>(`teams/${id}`);
  },

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

  joinTeam: async (id: number): Promise<void> => {
    await apiClient(`teams/${id}/join`, {
      method: 'POST',
    });
  },

  leaveTeam: async (): Promise<void> => {
    await apiClient('teams/leave', {
      method: 'POST',
    });
  },
};

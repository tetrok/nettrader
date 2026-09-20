import { apiClient } from './client';
import { Forum, Topic, TopicMessage } from '../types';

export const forumsApi = {
  getForums: async (): Promise<Forum[]> => {
    return apiClient<Forum[]>('forums');
  },

  getTopics: async (forumId: number, page = 1, limit = 20): Promise<{
    forum: { id: number; name: string; description: string };
    topics: Topic[];
    page: number;
    limit: number;
    total: number;
  }> => {
    return apiClient(`forums/${forumId}/topics?page=${page}&limit=${limit}`);
  },

  getTopicMessages: async (topicId: number, page = 1, limit = 20): Promise<{
    topic: { id: number; title: string; forumId: number; forumName: string };
    messages: TopicMessage[];
    page: number;
    limit: number;
    total: number;
  }> => {
    return apiClient(`forums/topics/${topicId}?page=${page}&limit=${limit}`);
  },

  postMessage: async (payload: {
    forumId?: number;
    topicId?: number;
    subject?: string;
    content: string;
    editMessageId?: number;
  }): Promise<void> => {
    await apiClient('forums/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

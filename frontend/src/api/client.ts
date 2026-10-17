/**
 * NetTrader 2 — Client HTTP Centralisé (Fetch Wrapper)
 *
 * Usage:
 *   Couche réseau de base utilisée par tous les modules d'API pour communiquer avec le backend.
 *
 * Logique & Fonctionnement:
 *   - Injecte automatiquement les en-têtes JSON et le token Bearer d'authentification s'il est présent.
 *   - Active credentials: 'include' pour la compatibilité avec les cookies de session.
 *   - Analyse et unifie les réponses d'erreur retournées par l'API ({ success: false, error: string }).
 */

import { analytics } from '../services/analytics';

const API_BASE = '/api';

export class ApiError extends Error {
  statusCode: number;
  data: any;

  constructor(message: string, statusCode: number, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export function getToken(): string | null {
  return localStorage.getItem('nt_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('nt_token', token);
  } else {
    localStorage.removeItem('nt_token');
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const startTime = performance.now();
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.replace(/^\//, '');
  const url = `${API_BASE}/${cleanEndpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const durationMs = Math.round(performance.now() - startTime);
    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      const errorMessage = json.error || response.statusText || 'Une erreur est survenue';
      
      // Télémétrie d'erreur API
      analytics.captureError(
        new Error(errorMessage),
        {
          endpoint: cleanEndpoint,
          method: options.method || 'GET',
          statusCode: response.status,
          durationMs,
          data: json.data,
        },
        'API_ERROR',
      );

      throw new ApiError(errorMessage, response.status, json.data);
    }

    if (json && typeof json === 'object' && 'data' in json && json.data !== undefined) {
      return json.data as T;
    }
    return (json ?? {}) as T;
  } catch (error: any) {
    if (error.name !== 'ApiError') {
      const durationMs = Math.round(performance.now() - startTime);
      analytics.captureError(
        error,
        {
          endpoint: cleanEndpoint,
          method: options.method || 'GET',
          durationMs,
        },
        'NETWORK_ERROR',
      );
    }
    throw error;
  }
}


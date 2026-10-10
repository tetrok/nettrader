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
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}/${endpoint.replace(/^\//, '')}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.success === false) {
    throw new ApiError(
      json.error || response.statusText || 'Une erreur est survenue',
      response.status,
      json.data
    );
  }

  return json.data as T;
}

/**
 * NetTrader 2 — Service Centralisé d'Analytique & Télémétrie Monobloc
 *
 * Usage:
 *   Gère la collecte des usages, des pratiques de trading et des erreurs en local,
 *   et transmet les données au backend NestJS (/api/analytics/collect) par lots (batches).
 *
 * Caractéristiques :
 *   - 100% Autonome : Aucune dépendance externe (pas de PostHog ni de service tiers).
 *   - Respect de la vie privée : Anonymisation des sessions, aucun mot de passe transmis.
 *   - Non bloquant & Résilient : Envoi asynchrone par lot avec déchargement propre (sendBeacon).
 */

const FLUSH_INTERVAL_MS = 4000;
const MAX_QUEUE_SIZE = 15;

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem('nt_analytics_session_id');
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
      sessionStorage.setItem('nt_analytics_session_id', sid);
    }
    return sid;
  } catch {
    return 'sid_fallback_' + Date.now();
  }
}

interface QueuedEvent {
  eventName: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: string;
}

interface QueuedError {
  errorType: string;
  message: string;
  route?: string;
  statusCode?: number;
  stackTrace?: string;
  context?: Record<string, any>;
}

class AnalyticsService {
  private sessionId: string;
  private currentUserId: number | null = null;
  private userTraits: Record<string, any> = {};
  private eventsQueue: QueuedEvent[] = [];
  private errorsQueue: QueuedError[] = [];
  private flushTimer: any = null;
  private isInitialized = false;

  constructor() {
    this.sessionId = getOrCreateSessionId();
  }

  /**
   * Initialise les écouteurs de déchargement de page pour la vidange sécurisée
   */
  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.isInitialized = true;
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);

    // Envoi avant fermeture de l'onglet / rafraîchissement
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });

    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });
  }

  /**
   * Associe les événements à l'utilisateur connecté
   */
  public identify(userId: string | number, traits: Record<string, any> = {}): void {
    this.currentUserId = typeof userId === 'number' ? userId : parseInt(String(userId), 10) || null;
    this.userTraits = { ...traits };
    this.track('user_identified', { userId: this.currentUserId, ...traits }, 'auth');
  }

  /**
   * Réinitialise l'identité lors de la déconnexion
   */
  public reset(): void {
    this.track('user_reset', { previousUserId: this.currentUserId }, 'auth');
    this.currentUserId = null;
    this.userTraits = {};
    this.flush();
  }

  /**
   * Enregistre un changement de page / navigation
   */
  public pageView(path: string, properties: Record<string, any> = {}): void {
    this.track('page_view', { path, ...properties }, 'navigation');
  }

  /**
   * Enregistre un événement métier (ordre, action, clic critique)
   */
  public track(eventName: string, properties: Record<string, any> = {}, category = 'general'): void {
    this.eventsQueue.push({
      eventName,
      category,
      properties: {
        ...this.userTraits,
        ...properties,
        url: typeof window !== 'undefined' ? window.location.pathname : '',
      },
      timestamp: new Date().toISOString(),
    });

    if (this.eventsQueue.length >= MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  /**
   * Capture une erreur (API, crash UI, rejet d'ordre)
   */
  public captureError(
    error: Error | any,
    context: Record<string, any> = {},
    errorType = 'API_ERROR',
  ): void {
    const message = error?.message || (typeof error === 'string' ? error : 'Erreur inconnue');
    const stackTrace = error?.stack || null;
    const route = typeof window !== 'undefined' ? window.location.pathname : null;
    const statusCode = context?.statusCode || (typeof error?.statusCode === 'number' ? error.statusCode : null);

    this.errorsQueue.push({
      errorType,
      message,
      route: route || undefined,
      statusCode: statusCode || undefined,
      stackTrace: stackTrace || undefined,
      context,
    });

    // Les erreurs sont immédiatement envoyées si critique
    if (this.errorsQueue.length >= 3 || errorType === 'UI_CRASH') {
      this.flush();
    }
  }

  /**
   * Envoie le lot d'événements et erreurs accumulés au serveur
   */
  public async flush(isBeacon = false): Promise<void> {
    if (this.eventsQueue.length === 0 && this.errorsQueue.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      userId: this.currentUserId,
      events: [...this.eventsQueue],
      errors: [...this.errorsQueue],
    };

    // Vider les files locales immédiatement pour éviter les doublons
    this.eventsQueue = [];
    this.errorsQueue = [];

    const url = '/api/analytics/collect';
    const jsonBody = JSON.stringify(payload);

    if (isBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([jsonBody], { type: 'application/json' });
        const success = navigator.sendBeacon(url, blob);
        if (success) return;
      } catch {
        // Fallback fetch
      }
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
        keepalive: true,
      });
    } catch (err) {
      // Éviter les boucles d'erreur si le réseau est coupé
      console.warn('[Analytics] Échec de transmission télémétrique :', err);
    }
  }
}

export const analytics = new AnalyticsService();

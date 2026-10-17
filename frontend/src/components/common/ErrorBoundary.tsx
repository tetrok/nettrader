/**
 * NetTrader 2 — Composant Limiteur d'Erreurs React (ErrorBoundary)
 *
 * Usage:
 *   Enveloppe l'application ou des sous-composants critiques pour éviter les écrans blancs
 *   en cas d'exception non interceptée dans le cycle de rendu React.
 *
 * Télémétrie:
 *   Envoie automatiquement l'erreur, la trace d'appel et la pile de composants à PostHog
 *   afin de permettre le diagnostic immédiat et le rejeu de session (Session Replay).
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { analytics } from '../../services/analytics';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Exception non gérée interceptée :', error, errorInfo);

    // Télémétrie d'erreur native NetTrader
    analytics.captureError(
      error,
      {
        source: 'ReactErrorBoundary',
        componentStack: errorInfo.componentStack,
      },
      'UI_CRASH',
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-900/40 rounded-2xl p-6 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-900/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-800/30">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Une erreur inattendue est survenue
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Nos équipes et la télémétrie ont été notifiées de cet incident. Vous pouvez recharger la page ou revenir à l'accueil.
            </p>

            {this.state.error && (
              <div className="text-left bg-slate-950/80 border border-slate-800 rounded-lg p-3 mb-6 max-h-32 overflow-y-auto">
                <p className="text-xs font-mono text-red-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition text-sm shadow-lg shadow-emerald-900/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recharger la page
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition text-sm border border-slate-700"
              >
                <Home className="w-4 h-4 mr-2" />
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

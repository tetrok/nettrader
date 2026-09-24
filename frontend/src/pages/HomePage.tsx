import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketApi } from '../api/market';
import { leaderboardApi } from '../api/leaderboard';
import { MarketSummary, Stock, PlayerRank } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Trophy,
  Users,
  ChevronRight,
  Newspaper,
  Gamepad2,
  Medal,
  Wallet,
  Sparkles,
  Zap,
  Target,
  Compass,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [topPlayers, setTopPlayers] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      marketApi.getSummary().catch(() => null),
      leaderboardApi.getPlayers({ limit: 3 }).catch(() => ({ items: [] })),
    ])
      .then(([marketData, leaderboardData]) => {
        if (marketData) setSummary(marketData);
        if (leaderboardData?.items) setTopPlayers(leaderboardData.items);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Hero Section : Gaming & Simulation */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-12 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Texte d'accroche */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-wide shadow-sm">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Jeu de simulation boursière • 100% Gratuit & Virtuel</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Testez votre flair boursier,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                affrontez les autres joueurs.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Démarrez la compétition avec <strong className="text-white">10 000 € de capital virtuel</strong>. Spéculez sur les vraies cotations réelles, multipliez vos gains fictifs et grimpez sur le podium des meilleurs traders !
            </p>

            {/* Note de réassurance & clarification du jeu */}
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 max-w-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Jeu sans risque :</strong> Monnaie fictive, gains et pertes 100% virtuels. Aucun euro réel engagé.
              </span>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {user ? (
                <Link
                  to="/portfolio"
                  className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                >
                  <Wallet className="w-5 h-5" />
                  <span>Accéder à mon Portefeuille</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Rejoindre la Partie (Gratuit)</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/help"
                    className="px-5 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700 flex items-center gap-2"
                  >
                    <span>Règles du Jeu</span>
                  </Link>
                </>
              )}
              <Link
                to="/market"
                className="px-4 py-3.5 text-xs sm:text-sm text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                <span>Voir les cotations en direct</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Carte visuelle du jeu / Démonstrateur de portefeuille */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-2xl border border-slate-700/80 p-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Fiche Joueur</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                  Simulation Active
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Solde Virtuel de Simulation</div>
                  <div className="text-2xl font-black text-white font-mono mt-0.5">10 000,00 €</div>
                  <div className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Capital fictif alloué à chaque trader</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-slate-400">Objectif</div>
                    <div className="font-bold text-slate-200 mt-1 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-sky-400" />
                      <span>Top du Classement</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-slate-400">Ordres Autorisés</div>
                    <div className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Comptant & VAD</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-400 font-mono tracking-tight">
                    🎮 100% Virtuel • Gains & pertes sans incidence financière
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Halo lumineux d'ambiance */}
        <div className="absolute right-0 top-0 -mr-24 -mt-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. Bandeau "Les Atouts du Jeu" (4 Piliers) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Gains 100% Virtuels</h3>
            <p className="text-xs text-slate-400 mt-1">10 000 € fictifs, aucun argent réel. Testez vos stratégies sans aucune pression financière.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 shrink-0 border border-sky-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">+160 Actions Réelles</h3>
            <p className="text-xs text-slate-400 mt-1">Cotations authentiques de la Bourse (CAC 40, SRD) avec seulement 15 minutes de différé.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 border border-amber-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Ligue & Compétition</h3>
            <p className="text-xs text-slate-400 mt-1">Classements périodiques, médailles et défis de performance face aux autres traders.</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0 border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Équipes & Forums</h3>
            <p className="text-xs text-slate-400 mt-1">Fondez votre team d'investisseurs, partagez vos analyses et progressez ensemble.</p>
          </div>
        </div>
      </section>

      {/* 3. Section "Comment Jouer ?" (3 Étapes simples) */}
      <section className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 sm:p-10">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Gameplay Simple & Réaliste</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Comment fonctionne la simulation ?</h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Trois étapes pour vous lancer et vivre le frisson des marchés boursiers en toute sécurité.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
              1
            </div>
            <h4 className="text-white font-bold text-base">Recevez 10 000 € virtuels</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Créez votre compte joueur en 30 secondes. Votre compte est instantanément approvisionné avec 10 000 € de capital virtuel pour lancer votre partie.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm border border-sky-500/30">
              2
            </div>
            <h4 className="text-white font-bold text-base">Tradez les vraies valeurs</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Passez vos ordres d'achat ou de vente au comptant. Testez la vente à découvert (VAD) pour miser sur la baisse des cours et optimisez vos positions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 relative space-y-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm border border-amber-500/30">
              3
            </div>
            <h4 className="text-white font-bold text-base">Hissez-vous sur le podium</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Faites fructifier vos gains virtuels, gagnez des médailles sur les classements mensuels et fondez une équipe pour dominer la ligue collective !
            </p>
          </div>
        </div>
      </section>

      {/* 4. Podium des Meilleurs Traders en Direct & Opportunités Boursières */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Podium / Hall of Fame */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Podium des Joueurs</h3>
                <p className="text-[11px] text-slate-400">Meilleures performances virtuelles</p>
              </div>
            </div>
            <Link
              to="/leaderboards"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
            >
              <span>Classement complet</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topPlayers.length > 0 ? (
            <div className="space-y-3">
              {topPlayers.map((player, idx) => (
                <div
                  key={player.userId || idx}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : idx === 1
                      ? 'bg-slate-800/60 border-slate-700/80'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold font-mono text-xs">
                      {idx === 0 && <Medal className="w-5 h-5 text-amber-400 fill-amber-400/20" />}
                      {idx === 1 && <Medal className="w-5 h-5 text-slate-300 fill-slate-300/20" />}
                      {idx === 2 && <Medal className="w-5 h-5 text-amber-700 fill-amber-700/20" />}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{player.pseudo}</span>
                        {player.teamName && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                            {player.teamName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Capital : {player.capital?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div
                      className={`text-xs font-bold flex items-center justify-end ${
                        player.performance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {player.performance >= 0 ? '+' : ''}
                      {player.performance?.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-slate-400">Gain virtuel</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
              Chargement du classement de la saison en cours...
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <p className="text-xs text-slate-300">
              Prêt à les défier ?{' '}
              <Link to="/register" className="text-emerald-400 font-bold hover:underline">
                Inscrivez-vous gratuitement
              </Link>{' '}
              et tentez d'atteindre le top 3 !
            </p>
          </div>
        </div>

        {/* Cotations du Jour : Tops Hausses et Baisses */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Plus Fortes Hausses</h3>
                </div>
                <Link to="/market" className="text-xs text-slate-400 hover:text-emerald-400 transition">
                  Marché &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-800/60">
                {summary?.topGainers?.slice(0, 5).map((s: Stock) => (
                  <Link
                    key={s.code}
                    to={`/stocks/${s.code}`}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
                  >
                    <div>
                      <div className="font-semibold text-white text-xs">{s.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.ticker}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-semibold text-slate-200">{s.price?.toFixed(2)} €</div>
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-end">
                        <ArrowUpRight className="w-3 h-3" />+{s.variation?.toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Top Losers */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Opportunités VAD (Baisses)</h3>
                </div>
                <Link to="/market" className="text-xs text-slate-400 hover:text-rose-400 transition">
                  Marché &rarr;
                </Link>
              </div>

              <div className="divide-y divide-slate-800/60">
                {summary?.topLosers?.slice(0, 5).map((s: Stock) => (
                  <Link
                    key={s.code}
                    to={`/stocks/${s.code}`}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
                  >
                    <div>
                      <div className="font-semibold text-white text-xs">{s.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.ticker}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs font-semibold text-slate-200">{s.price?.toFixed(2)} €</div>
                      <div className="text-[11px] font-bold text-rose-400 flex items-center justify-end">
                        <ArrowDownRight className="w-3 h-3" />{s.variation?.toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Actualités du Jeu & de la Communauté */}
          {summary?.recentNews && summary.recentNews.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-white text-sm">Actualités & Annonces de la Simulation</h3>
                </div>
                <Link to="/forums" className="text-xs text-slate-400 hover:text-sky-400 transition">
                  Forums &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.recentNews.slice(0, 2).map((n: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium text-slate-300">{n.author}</span>
                      <span>{new Date(n.date * 1000).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <h4 className="font-bold text-white text-xs line-clamp-1">{n.title}</h4>
                    <p
                      className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: n.content }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

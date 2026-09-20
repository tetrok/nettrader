import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { forumsApi } from '../api/forums';
import { Forum, Topic } from '../types';
import { MessageSquare, Folder, ArrowRight, RefreshCw, PlusCircle } from 'lucide-react';

export const ForumsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryForumId = parseInt(searchParams.get('id') || searchParams.get('forumId') || '', 10);

  const [forums, setForums] = useState<Forum[]>([]);
  const [selectedForumId, setSelectedForumId] = useState<number | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loadingForums, setLoadingForums] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    forumsApi
      .getForums()
      .then((data: Forum[]) => {
        setForums(data);
        if (data.length > 0) {
          if (!isNaN(queryForumId) && data.some((f) => f.id === queryForumId)) {
            setSelectedForumId(queryForumId);
          } else {
            setSelectedForumId(data[0].id);
          }
        }
      })
      .finally(() => setLoadingForums(false));
  }, [queryForumId]);

  useEffect(() => {
    if (selectedForumId) {
      setLoadingTopics(true);
      forumsApi
        .getTopics(selectedForumId)
        .then((res) => setTopics(res.topics))
        .finally(() => setLoadingTopics(false));
    }
  }, [selectedForumId]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Forums Communautaires</h1>
        <p className="text-xs text-slate-400 mt-1">
          Échangez avec les traders, posez vos questions et partagez vos stratégies
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forums Categories List */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            Rubriques & Espaces
          </h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 space-y-1">
            {loadingForums ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400 mb-1" />
                Chargement...
              </div>
            ) : (
              forums.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedForumId(f.id)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-start gap-3 ${
                    selectedForumId === f.id
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <Folder className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">{f.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{f.description}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {f.topicsCount} sujet(s) • {f.messagesCount} message(s)
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Topics in Selected Forum */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Discussions en cours
            </h3>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loadingTopics ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Chargement des discussions...
              </div>
            ) : topics.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Aucune discussion dans cette rubrique pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {topics.map((t) => (
                  <Link
                    key={t.id}
                    to={`/forums/topic/${t.id}`}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-800/40 transition group"
                  >
                    <div className="space-y-1 pr-4">
                      <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                        {t.title}
                      </h4>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>Par <strong className="text-slate-300">{t.author}</strong></span>
                        <span>•</span>
                        <span>Dernier message par {t.lastPoster} ({new Date(t.lastPostDate * 1000).toLocaleDateString('fr-FR')})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
                      <span className="hidden sm:inline bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {t.repliesCount} rép.
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

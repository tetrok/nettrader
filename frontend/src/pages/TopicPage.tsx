import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { forumsApi } from '../api/forums';
import { adminApi } from '../api/admin';
import { TopicMessage, AdminForumItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  RefreshCw,
  User as UserIcon,
  Trash2,
  Edit2,
  FolderInput,
  Shield,
  AlertTriangle,
  X,
} from 'lucide-react';
import { ForumMessageContent } from '../components/forum/ForumMessageContent';

export const TopicPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topicInfo, setTopicInfo] = useState<{ id: number; title: string; forumId: number; forumName: string } | null>(null);
  const [messages, setMessages] = useState<TopicMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin moderation states
  const [forumsList, setForumsList] = useState<AdminForumItem[]>([]);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetForumId, setTargetForumId] = useState<number>(0);
  const [movingTopic, setMovingTopic] = useState(false);

  const [editMsgModal, setEditMsgModal] = useState<{ id: number; content: string } | null>(null);
  const [savingMsgEdit, setSavingMsgEdit] = useState(false);

  const [msgToDelete, setMsgToDelete] = useState<number | null>(null);
  const [deletingMsg, setDeletingMsg] = useState(false);

  const [deleteTopicModal, setDeleteTopicModal] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState(false);

  const loadTopic = async () => {
    if (!id) return;
    try {
      const res = await forumsApi.getTopicMessages(parseInt(id, 10));
      setTopicInfo(res.topic);
      setMessages(res.messages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopic();
  }, [id]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText || !id) return;

    setSubmitting(true);
    try {
      await forumsApi.postMessage({
        topicId: parseInt(id, 10),
        content: replyText,
      });
      setReplyText('');
      await loadTopic();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la réponse.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMoveTopic = async () => {
    try {
      const frms = await adminApi.getAdminForums();
      setForumsList(frms);
      if (topicInfo) {
        setTargetForumId(topicInfo.forumId);
      }
      setMoveModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Erreur chargement des forums.');
    }
  };

  const handleConfirmMoveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !targetForumId) return;
    setMovingTopic(true);
    try {
      await adminApi.updateAdminTopic(parseInt(id, 10), { forumId: targetForumId });
      setMoveModalOpen(false);
      await loadTopic();
    } catch (err: any) {
      alert(err.message || 'Erreur lors du déplacement.');
    } finally {
      setMovingTopic(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!id) return;
    setDeletingTopic(true);
    try {
      await adminApi.deleteAdminTopic(parseInt(id, 10));
      navigate(topicInfo?.forumId ? `/forums?id=${topicInfo.forumId}` : '/forums');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression.');
      setDeletingTopic(false);
    }
  };

  const handleSaveMsgEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMsgModal || !editMsgModal.content.trim()) return;
    setSavingMsgEdit(true);
    try {
      await adminApi.updateAdminMessage(editMsgModal.id, editMsgModal.content);
      setEditMsgModal(null);
      await loadTopic();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la modération.');
    } finally {
      setSavingMsgEdit(false);
    }
  };

  const handleDeleteMsg = async () => {
    if (!msgToDelete) return;
    setDeletingMsg(true);
    try {
      await adminApi.deleteAdminMessage(msgToDelete);
      setMsgToDelete(null);
      await loadTopic();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression du message.');
    } finally {
      setDeletingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Link
        to={topicInfo?.forumId ? `/forums?id=${topicInfo.forumId}` : '/forums'}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux forums
      </Link>

      {/* Topic Title & Admin Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          {topicInfo?.forumName && (
            <Link
              to={`/forums?id=${topicInfo.forumId}`}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider hover:underline transition inline-block"
            >
              {topicInfo.forumName}
            </Link>
          )}
          <h1 className="text-2xl font-extrabold text-white mt-1">{topicInfo?.title}</h1>
        </div>

        {user?.isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenMoveTopic}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Déplacer</span>
            </button>
            <button
              onClick={() => setDeleteTopicModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer le sujet</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages Thread */}
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-800 rounded-lg text-emerald-400">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-white">{m.authorPseudo}</span>
                {m.teamName && (
                  m.teamId ? (
                    <Link
                      to={`/teams/${m.teamId}`}
                      className="text-emerald-400 hover:text-emerald-300 font-mono hover:underline transition"
                    >
                      [{m.teamName}]
                    </Link>
                  ) : (
                    <span className="text-emerald-400 font-mono">[{m.teamName}]</span>
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-mono">
                  {new Date(m.date * 1000).toLocaleString('fr-FR')}
                </span>

                {user?.isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditMsgModal({ id: m.id, content: m.content })}
                      title="Modérer ce message"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setMsgToDelete(m.id)}
                      title="Supprimer ce message"
                      className="p-1 rounded bg-slate-800 hover:bg-rose-950/60 text-rose-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <ForumMessageContent content={m.content} formattedContent={m.formattedContent} />
          </div>
        ))}
      </div>

      {/* Reply Box */}
      {user ? (
        <form onSubmit={handlePostReply} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-white">Répondre à cette discussion</h3>
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Écrivez votre message..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Publication...' : 'Publier ma réponse'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-sm text-slate-400">
          <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
            Connectez-vous
          </Link>{' '}
          pour participer à cette discussion.
        </div>
      )}

      {/* Admin Modal: Move Topic */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-sky-400" />
                <span>Déplacer cette discussion</span>
              </h3>
              <button
                onClick={() => setMoveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmMoveTopic} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Rubrique de destination</label>
                <select
                  value={targetForumId}
                  onChange={(e) => setTargetForumId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition"
                >
                  {forumsList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.sectionName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMoveModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={movingTopic}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {movingTopic ? 'Déplacement...' : 'Déplacer le sujet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal: Delete Topic */}
      {deleteTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Supprimer toute la discussion ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement ce sujet et l’ensemble de ses réponses ?
              Cette action est irréversible.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTopicModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingTopic}
                onClick={handleDeleteTopic}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deletingTopic ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Modal: Edit Message */}
      {editMsgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Modérer le message #{editMsgModal.id}</span>
              </h3>
              <button
                onClick={() => setEditMsgModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMsgEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Contenu modéré *</label>
                <textarea
                  rows={6}
                  required
                  value={editMsgModal.content}
                  onChange={(e) => setEditMsgModal({ ...editMsgModal, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-mono transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditMsgModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingMsgEdit}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {savingMsgEdit ? 'Sauvegarde...' : 'Appliquer la modération'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal: Delete Message */}
      {msgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Supprimer ce message ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le message #{msgToDelete} ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMsgToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingMsg}
                onClick={handleDeleteMsg}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deletingMsg ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

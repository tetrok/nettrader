import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import {
  AdminForumSection,
  AdminForumItem,
  AdminTopicItem,
  AdminMessageItem,
} from '../../types';
import {
  Folder,
  MessageSquare,
  MessageCircle,
  Shield,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FolderInput,
  X,
} from 'lucide-react';

export const AdminForumManagement: React.FC = () => {
  const [subTab, setSubTab] = useState<'forums' | 'topics' | 'messages'>('forums');

  // Global feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // -------------------------------------------------------------
  // 1. DATA: FORUMS & SECTIONS
  // -------------------------------------------------------------
  const [sections, setSections] = useState<AdminForumSection[]>([]);
  const [forums, setForums] = useState<AdminForumItem[]>([]);
  const [loadingForums, setLoadingForums] = useState(false);

  // Modal: Create / Edit Forum
  const [forumModalOpen, setForumModalOpen] = useState(false);
  const [editingForum, setEditingForum] = useState<AdminForumItem | null>(null);
  const [forumForm, setForumForm] = useState({
    name: '',
    description: '',
    sectionId: 1,
    authread: 'ouvert',
    authwrite: 'identifie',
  });
  const [savingForum, setSavingForum] = useState(false);

  // New section inline
  const [showNewSectionInput, setShowNewSectionInput] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Delete Forum confirm
  const [forumToDelete, setForumToDelete] = useState<AdminForumItem | null>(null);
  const [deletingForum, setDeletingForum] = useState(false);

  const loadForumsAndSections = async () => {
    setLoadingForums(true);
    try {
      const [sec, frm] = await Promise.all([
        adminApi.getForumSections(),
        adminApi.getAdminForums(),
      ]);
      setSections(sec);
      setForums(frm);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors du chargement des rubriques.');
    } finally {
      setLoadingForums(false);
    }
  };

  useEffect(() => {
    loadForumsAndSections();
  }, []);

  const handleOpenCreateForum = () => {
    setEditingForum(null);
    setForumForm({
      name: '',
      description: '',
      sectionId: sections.length > 0 ? sections[0].id : 1,
      authread: 'ouvert',
      authwrite: 'identifie',
    });
    setShowNewSectionInput(false);
    setForumModalOpen(true);
  };

  const handleOpenEditForum = (f: AdminForumItem) => {
    setEditingForum(f);
    setForumForm({
      name: f.name,
      description: f.description,
      sectionId: f.sectionId,
      authread: f.authread,
      authwrite: f.authwrite,
    });
    setShowNewSectionInput(false);
    setForumModalOpen(true);
  };

  const handleSaveForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumForm.name.trim()) return;

    setSavingForum(true);
    try {
      let finalSectionId = forumForm.sectionId;

      // Créer la section si nécessaire
      if (showNewSectionInput && newSectionName.trim()) {
        const createdSec = await adminApi.createForumSection(newSectionName.trim());
        finalSectionId = createdSec.id;
      }

      if (editingForum) {
        await adminApi.updateAdminForum(editingForum.id, {
          ...forumForm,
          sectionId: finalSectionId,
        });
        showFeedback('success', `La rubrique « ${forumForm.name} » a été modifiée.`);
      } else {
        await adminApi.createAdminForum({
          ...forumForm,
          sectionId: finalSectionId,
        });
        showFeedback('success', `La rubrique « ${forumForm.name} » a été créée.`);
      }
      setForumModalOpen(false);
      setNewSectionName('');
      setShowNewSectionInput(false);
      await loadForumsAndSections();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de l’enregistrement de la rubrique.');
    } finally {
      setSavingForum(false);
    }
  };

  const handleSyncForum = async (f: AdminForumItem) => {
    try {
      await adminApi.syncAdminForum(f.id);
      showFeedback('success', `Les compteurs de « ${f.name} » ont été resynchronisés.`);
      await loadForumsAndSections();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la resynchronisation.');
    }
  };

  const handleDeleteForumConfirm = async () => {
    if (!forumToDelete) return;
    setDeletingForum(true);
    try {
      await adminApi.deleteAdminForum(forumToDelete.id);
      showFeedback('success', `La rubrique « ${forumToDelete.name} » a été supprimée.`);
      setForumToDelete(null);
      await loadForumsAndSections();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la suppression.');
    } finally {
      setDeletingForum(false);
    }
  };

  // -------------------------------------------------------------
  // 2. DATA: TOPICS
  // -------------------------------------------------------------
  const [topics, setTopics] = useState<AdminTopicItem[]>([]);
  const [topicForumFilter, setTopicForumFilter] = useState<number>(0);
  const [topicSearch, setTopicSearch] = useState<string>('');
  const [topicPage, setTopicPage] = useState(1);
  const [topicTotalPages, setTopicTotalPages] = useState(1);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Move / Rename modal
  const [topicToEdit, setTopicToEdit] = useState<AdminTopicItem | null>(null);
  const [topicEditTitle, setTopicEditTitle] = useState('');
  const [topicEditForumId, setTopicEditForumId] = useState(0);
  const [savingTopicEdit, setSavingTopicEdit] = useState(false);

  // Delete topic modal
  const [topicToDelete, setTopicToDelete] = useState<AdminTopicItem | null>(null);
  const [deletingTopic, setDeletingTopic] = useState(false);

  const loadTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await adminApi.getAdminTopics(topicPage, 15, topicForumFilter, topicSearch);
      setTopics(res.items);
      setTopicTotalPages(res.totalPages || 1);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors du chargement des sujets.');
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (subTab === 'topics') {
      loadTopics();
    }
  }, [subTab, topicForumFilter, topicPage]);

  const handleSearchTopics = (e: React.FormEvent) => {
    e.preventDefault();
    setTopicPage(1);
    loadTopics();
  };

  const handleOpenEditTopic = (t: AdminTopicItem) => {
    setTopicToEdit(t);
    setTopicEditTitle(t.title);
    setTopicEditForumId(t.forumId);
  };

  const handleSaveEditTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicToEdit) return;
    setSavingTopicEdit(true);
    try {
      await adminApi.updateAdminTopic(topicToEdit.id, {
        title: topicEditTitle,
        forumId: topicEditForumId,
      });
      showFeedback('success', 'Le sujet a été mis à jour avec succès.');
      setTopicToEdit(null);
      await loadTopics();
      await loadForumsAndSections();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la modification du sujet.');
    } finally {
      setSavingTopicEdit(false);
    }
  };

  const handleDeleteTopicConfirm = async () => {
    if (!topicToDelete) return;
    setDeletingTopic(true);
    try {
      await adminApi.deleteAdminTopic(topicToDelete.id);
      showFeedback('success', `Le sujet « ${topicToDelete.title} » et ses messages ont été supprimés.`);
      setTopicToDelete(null);
      await loadTopics();
      await loadForumsAndSections();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la suppression du sujet.');
    } finally {
      setDeletingTopic(false);
    }
  };

  // -------------------------------------------------------------
  // 3. DATA: MESSAGES
  // -------------------------------------------------------------
  const [messages, setMessages] = useState<AdminMessageItem[]>([]);
  const [msgQuery, setMsgQuery] = useState('');
  const [msgAuthor, setMsgAuthor] = useState('');
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotalPages, setMsgTotalPages] = useState(1);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Edit message modal
  const [msgToEdit, setMsgToEdit] = useState<AdminMessageItem | null>(null);
  const [msgEditContent, setMsgEditContent] = useState('');
  const [savingMsgEdit, setSavingMsgEdit] = useState(false);

  // Delete message modal
  const [msgToDelete, setMsgToDelete] = useState<AdminMessageItem | null>(null);
  const [deletingMsg, setDeletingMsg] = useState(false);

  const loadMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await adminApi.getAdminMessages(msgPage, 15, msgQuery, msgAuthor);
      setMessages(res.items);
      setMsgTotalPages(res.totalPages || 1);
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la recherche des messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (subTab === 'messages') {
      loadMessages();
    }
  }, [subTab, msgPage]);

  const handleSearchMessages = (e: React.FormEvent) => {
    e.preventDefault();
    setMsgPage(1);
    loadMessages();
  };

  const handleOpenEditMessage = (m: AdminMessageItem) => {
    setMsgToEdit(m);
    setMsgEditContent(m.content);
  };

  const handleSaveEditMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgToEdit || !msgEditContent.trim()) return;
    setSavingMsgEdit(true);
    try {
      await adminApi.updateAdminMessage(msgToEdit.id, msgEditContent);
      showFeedback('success', `Le message #${msgToEdit.id} a été modéré.`);
      setMsgToEdit(null);
      await loadMessages();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la modération du message.');
    } finally {
      setSavingMsgEdit(false);
    }
  };

  const handleDeleteMessageConfirm = async () => {
    if (!msgToDelete) return;
    setDeletingMsg(true);
    try {
      await adminApi.deleteAdminMessage(msgToDelete.id);
      showFeedback('success', `Le message #${msgToDelete.id} a été supprimé.`);
      setMsgToDelete(null);
      await loadMessages();
      await loadForumsAndSections();
    } catch (err: any) {
      showFeedback('error', err.message || 'Erreur lors de la suppression du message.');
    } finally {
      setDeletingMsg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('forums')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              subTab === 'forums'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Rubriques & Forums ({forums.length})</span>
          </button>
          <button
            onClick={() => setSubTab('topics')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              subTab === 'topics'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Discussions & Sujets</span>
          </button>
          <button
            onClick={() => setSubTab('messages')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              subTab === 'messages'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Modération des Messages</span>
          </button>
        </div>

        {subTab === 'forums' && (
          <button
            onClick={handleOpenCreateForum}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Rubrique</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 1: FORUMS & SECTIONS                                 */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'forums' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loadingForums ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Chargement des rubriques...
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">ID</th>
                    <th className="px-4 py-3.5">Catégorie</th>
                    <th className="px-4 py-3.5">Nom & Description</th>
                    <th className="px-4 py-3.5 text-center">Accès</th>
                    <th className="px-4 py-3.5 text-right">Stats</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {forums.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/40 transition font-sans">
                      <td className="px-4 py-3.5 font-mono text-slate-400">#{f.id}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                          {f.sectionName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                        <div className="font-bold text-white text-sm">{f.name}</div>
                        <div className="text-slate-400 text-xs line-clamp-1 mt-0.5">
                          {f.description || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1 font-mono text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              f.authread === 'ouvert'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : f.authread === 'admin'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                            }`}
                          >
                            Lecture: {f.authread}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded ${
                              f.authwrite === 'admin'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            Écriture: {f.authwrite}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-300">
                        <div>{f.topicsCount} sujet(s)</div>
                        <div className="text-[11px] text-slate-400">{f.messagesCount} message(s)</div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSyncForum(f)}
                            title="Resynchroniser les compteurs"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditForum(f)}
                            title="Modifier les paramètres"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setForumToDelete(f)}
                            title="Supprimer la rubrique"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 2: TOPICS                                             */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'topics' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <form
            onSubmit={handleSearchTopics}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                placeholder="Rechercher par titre de discussion ou pseudo auteur..."
                className="bg-transparent text-white placeholder-slate-400 focus:outline-none w-full"
              />
            </div>

            <div className="min-w-[180px]">
              <select
                value={topicForumFilter}
                onChange={(e) => {
                  setTopicForumFilter(parseInt(e.target.value, 10));
                  setTopicPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value={0}>Tous les forums</option>
                {forums.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Filtrer</span>
            </button>
          </form>

          {/* Topics Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loadingTopics ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Chargement des discussions...
              </div>
            ) : topics.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Aucun sujet trouvé correspondant aux critères.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">ID</th>
                    <th className="px-4 py-3.5">Titre</th>
                    <th className="px-4 py-3.5">Forum</th>
                    <th className="px-4 py-3.5">Auteur</th>
                    <th className="px-4 py-3.5 text-center">Rép.</th>
                    <th className="px-4 py-3.5 text-right">Dernier Post</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {topics.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition font-sans">
                      <td className="px-4 py-3.5 font-mono text-slate-400">#{t.id}</td>
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-md">
                        <Link
                          to={`/forums/topic/${t.id}`}
                          className="font-bold text-white hover:text-emerald-400 transition flex items-center gap-1.5 group"
                        >
                          <span>{t.title}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {t.forumName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-300">{t.authorPseudo}</td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400">
                        {t.repliesCount}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-400 text-[11px]">
                        <div>{t.lastPoster}</div>
                        <div className="font-mono text-[10px]">
                          {t.lastPostDate ? new Date(t.lastPostDate * 1000).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditTopic(t)}
                            title="Déplacer ou renommer le sujet"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                          >
                            <FolderInput className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTopicToDelete(t)}
                            title="Supprimer la discussion"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {topicTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div>Page {topicPage} sur {topicTotalPages}</div>
              <div className="flex gap-1.5">
                <button
                  disabled={topicPage <= 1}
                  onClick={() => setTopicPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Précédent
                </button>
                <button
                  disabled={topicPage >= topicTotalPages}
                  onClick={() => setTopicPage((p) => Math.min(topicTotalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 3: MESSAGES MODERATION                                */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'messages' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <form
            onSubmit={handleSearchMessages}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={msgQuery}
                onChange={(e) => setMsgQuery(e.target.value)}
                placeholder="Rechercher par mot-clé dans le contenu des messages..."
                className="bg-transparent text-white placeholder-slate-400 focus:outline-none w-full"
              />
            </div>

            <div className="w-[180px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
              <input
                type="text"
                value={msgAuthor}
                onChange={(e) => setMsgAuthor(e.target.value)}
                placeholder="Pseudo auteur..."
                className="bg-transparent text-white placeholder-slate-400 focus:outline-none w-full"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Rechercher</span>
            </button>
          </form>

          {/* Messages list */}
          <div className="space-y-3">
            {loadingMessages ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                Recherche de messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center text-slate-400 text-xs">
                Aucun message trouvé pour ces critères de recherche.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400">#{m.id}</span>
                      <span className="font-bold text-white">{m.authorPseudo}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400">dans</span>
                      <Link
                        to={`/forums/topic/${m.topicId}`}
                        className="text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>{m.topicTitle}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {m.forumName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(m.date * 1000).toLocaleString('fr-FR')}
                      </span>
                      <button
                        onClick={() => handleOpenEditMessage(m)}
                        title="Modérer ce message"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMsgToDelete(m)}
                        title="Supprimer ce message"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-slate-200 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 font-sans whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {msgTotalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div>Page {msgPage} sur {msgTotalPages}</div>
              <div className="flex gap-1.5">
                <button
                  disabled={msgPage <= 1}
                  onClick={() => setMsgPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Précédent
                </button>
                <button
                  disabled={msgPage >= msgTotalPages}
                  onClick={() => setMsgPage((p) => Math.min(msgTotalPages, p + 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CREATE / EDIT FORUM                                    */}
      {/* ------------------------------------------------------------- */}
      {forumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-emerald-400" />
                <span>{editingForum ? 'Modifier la Rubrique' : 'Nouvelle Rubrique'}</span>
              </h3>
              <button
                onClick={() => setForumModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForum} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Nom de la rubrique *</label>
                <input
                  type="text"
                  required
                  value={forumForm.name}
                  onChange={(e) => setForumForm({ ...forumForm, name: e.target.value })}
                  placeholder="Ex: Stratégies & Analyse Technique"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={forumForm.description}
                  onChange={(e) => setForumForm({ ...forumForm, description: e.target.value })}
                  placeholder="Description courte affichée aux membres..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Catégorie / Section parente *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewSectionInput(!showNewSectionInput)}
                    className="text-emerald-400 hover:underline text-[11px]"
                  >
                    {showNewSectionInput ? 'Choisir une section existante' : '+ Nouvelle section'}
                  </button>
                </div>

                {showNewSectionInput ? (
                  <input
                    type="text"
                    required
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="Nom de la nouvelle catégorie (ex: International)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                ) : (
                  <select
                    value={forumForm.sectionId}
                    onChange={(e) =>
                      setForumForm({ ...forumForm, sectionId: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Autorisation de lecture</label>
                  <select
                    value={forumForm.authread}
                    onChange={(e) => setForumForm({ ...forumForm, authread: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="ouvert">Public (Tout le monde)</option>
                    <option value="identifie">Membres connectés</option>
                    <option value="admin">Administrateurs uniquement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Autorisation d'écriture</label>
                  <select
                    value={forumForm.authwrite}
                    onChange={(e) => setForumForm({ ...forumForm, authwrite: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="identifie">Membres connectés</option>
                    <option value="admin">Administrateurs uniquement</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setForumModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingForum}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {savingForum ? 'Enregistrement...' : editingForum ? 'Sauvegarder' : 'Créer la rubrique'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE FORUM CONFIRMATION                              */}
      {/* ------------------------------------------------------------- */}
      {forumToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Supprimer la rubrique ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la rubrique{' '}
              <strong className="text-white">« {forumToDelete.name} »</strong> ?
            </p>

            {forumToDelete.topicsCount > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl">
                ⚠️ Cette rubrique contient{' '}
                <strong>{forumToDelete.topicsCount} discussion(s)</strong> et{' '}
                <strong>{forumToDelete.messagesCount} message(s)</strong> qui seront également supprimés.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setForumToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingForum}
                onClick={handleDeleteForumConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deletingForum ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MOVE / RENAME TOPIC                                    */}
      {/* ------------------------------------------------------------- */}
      {topicToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-sky-400" />
                <span>Déplacer ou Renommer le Sujet</span>
              </h3>
              <button
                onClick={() => setTopicToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTopic} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Titre de la discussion *</label>
                <input
                  type="text"
                  required
                  value={topicEditTitle}
                  onChange={(e) => setTopicEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Rubrique de destination *</label>
                <select
                  value={topicEditForumId}
                  onChange={(e) => setTopicEditForumId(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-sky-500 transition"
                >
                  {forums.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.sectionName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTopicToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingTopicEdit}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {savingTopicEdit ? 'Mise à jour...' : 'Appliquer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE TOPIC CONFIRMATION                              */}
      {/* ------------------------------------------------------------- */}
      {topicToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Supprimer la discussion ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le sujet{' '}
              <strong className="text-white">« {topicToDelete.title} »</strong> ainsi que tous ses messages associés ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTopicToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deletingTopic}
                onClick={handleDeleteTopicConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deletingTopic ? 'Suppression...' : 'Supprimer le sujet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT MESSAGE                                           */}
      {/* ------------------------------------------------------------- */}
      {msgToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Modération du Message #{msgToEdit.id}</span>
              </h3>
              <button
                onClick={() => setMsgToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Auteur: <strong className="text-slate-200">{msgToEdit.authorPseudo}</strong> dans la discussion{' '}
              <strong className="text-slate-200">« {msgToEdit.topicTitle} »</strong>
            </div>

            <form onSubmit={handleSaveEditMessage} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Contenu modéré *</label>
                <textarea
                  rows={8}
                  required
                  value={msgEditContent}
                  onChange={(e) => setMsgEditContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 font-mono transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMsgToEdit(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingMsgEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition disabled:opacity-50"
                >
                  {savingMsgEdit ? 'Sauvegarde...' : 'Appliquer la modération'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DELETE MESSAGE CONFIRMATION                            */}
      {/* ------------------------------------------------------------- */}
      {msgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Supprimer le message ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le message #{msgToDelete.id} rédigé par{' '}
              <strong className="text-white">{msgToDelete.authorPseudo}</strong> ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
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
                onClick={handleDeleteMessageConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {deletingMsg ? 'Suppression...' : 'Supprimer le message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

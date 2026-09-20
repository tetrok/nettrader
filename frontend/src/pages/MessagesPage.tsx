import React, { useEffect, useState } from 'react';
import { messagesApi } from '../api/messages';
import { Message } from '../types';
import { Mail, Send, Trash2, PlusCircle, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // New message modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Read message modal
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await messagesApi.getInbox(page, 20);
      setMessages(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [page]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !title || !content) return;

    setSending(true);
    setFeedback(null);

    try {
      await messagesApi.sendMessage({ recipient, title, content });
      setFeedback({ type: 'success', message: 'Message envoyé avec succès !' });
      setRecipient('');
      setTitle('');
      setContent('');
      setTimeout(() => {
        setComposeOpen(false);
        setFeedback(null);
        loadMessages();
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors de l'envoi." });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
      try {
        await messagesApi.deleteMessage(id);
        if (activeMessage?.id === id) setActiveMessage(null);
        loadMessages();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Messagerie Interne</h1>
          <p className="text-xs text-slate-400 mt-1">
            Communiquez avec les autres traders de la communauté ({total} message(s))
          </p>
        </div>

        <button
          onClick={() => setComposeOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nouveau Message</span>
        </button>
      </div>

      {/* Messages List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Mail className="w-10 h-10 mx-auto text-slate-700 mb-3" />
            Votre boîte de réception est vide.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {messages.map((m) => (
              <div
                key={m.id}
                onClick={() => setActiveMessage(m)}
                className={`p-4 sm:p-5 flex items-center justify-between hover:bg-slate-800/40 transition cursor-pointer ${
                  !m.isRead ? 'bg-slate-800/20 font-semibold' : ''
                }`}
              >
                <div className="space-y-1 pr-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">{m.senderPseudo}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">
                      {new Date(m.date * 1000).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-white">{m.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-1">{m.content}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(m.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Read Modal */}
      {activeMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{activeMessage.title}</h3>
                <div className="text-xs text-slate-400 mt-1">
                  De : <strong className="text-emerald-400">{activeMessage.senderPseudo}</strong> le{' '}
                  {new Date(activeMessage.date * 1000).toLocaleString('fr-FR')}
                </div>
              </div>
              <button
                onClick={() => setActiveMessage(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap py-2">
              {activeMessage.content}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between">
              <button
                onClick={() => handleDelete(activeMessage.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer
              </button>
              <button
                onClick={() => {
                  setRecipient(activeMessage.senderPseudo);
                  setTitle(`Re: ${activeMessage.title}`);
                  setActiveMessage(null);
                  setComposeOpen(true);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-600 transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Répondre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Nouveau Message</h3>
              <button onClick={() => setComposeOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Destinataire (Pseudo)</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="ex: Administrateur"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Titre du message</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sujet..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Corps du message</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Rédigez votre message ici..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'Envoi...' : 'Envoyer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

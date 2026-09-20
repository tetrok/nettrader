import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { HelpCircle, BookOpen, Send, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const [tab, setTab] = useState<'rules' | 'faq' | 'contact'>('rules');

  // Contact form
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      await apiClient('content/contact', {
        method: 'POST',
        body: JSON.stringify({
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
        }),
      });
      setFeedback({ type: 'success', message: 'Votre message a été transmis avec succès.' });
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || "Erreur lors de l'envoi." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Centre d'Aide & Règlement</h1>
        <p className="text-xs text-slate-400 mt-1">
          Comprendre le fonctionnement du jeu, les règles de cotation et contacter l'administrateur
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'rules' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Règles du Jeu
        </button>
        <button
          onClick={() => setTab('faq')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'faq' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Foire Aux Questions (FAQ)
        </button>
        <button
          onClick={() => setTab('contact')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
            tab === 'contact' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          Contacter l'équipe
        </button>
      </div>

      {/* Rules Content */}
      {tab === 'rules' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>Principes Généraux de la Simulation NetTrader</span>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-semibold text-base">1. Capital de départ</h4>
            <p>
              Chaque trader inscrit dispose d'un montant virtuel initial de <strong>10 000,00 €</strong>. 
              Ce capital peut être utilisé pour acheter des actions du CAC 40, du SRD ou des SICAV.
            </p>

            <h4 className="text-white font-semibold text-base">2. Frais de courtage et fiscalité</h4>
            <p>
              Pour simuler fidèlement les conditions réelles de marché, chaque transaction d'achat ou de vente
              est soumise à des frais de courtage (0,30% avec TVA 19,6% et un minimum forfaitaire de 4,95 € par ordre).
            </p>

            <h4 className="text-white font-semibold text-base">3. Types d'ordres</h4>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><strong>Au marché :</strong> exécution immédiate au dernier cours connu.</li>
              <li><strong>À cours limité / seuil :</strong> l'ordre est conservé dans le carnet d'ordres et s'exécute dès que la cotation franchit vos bornes (min/max).</li>
              <li><strong>Vente à Découvert (VAD) :</strong> autorisée pour les traders de niveau Initié et Expert selon les règles de marge de couverture.</li>
            </ul>

            <h4 className="text-white font-semibold text-base">4. Horaires de Bourse</h4>
            <p>
              La bourse de Paris est ouverte les jours ouvrés de <strong>09h15 à 17h55</strong>. En dehors de ces plages,
              les ordres au marché passés restent en attente jusqu'à la prochaine ouverture.
            </p>
          </div>
        </div>
      )}

      {/* FAQ Content */}
      {tab === 'faq' && (
        <div className="space-y-4">
          {[
            {
              q: "Comment les cours sont-ils actualisés ?",
              a: "Les cours proviennent de flux financiers réels et sont mis à jour périodiquement (toutes les 100 secondes environ pendant les séances de cotation).",
            },
            {
              q: "Puis-je réinitialiser mon compte si j'ai perdu trop d'argent ?",
              a: "Oui ! Dans la section 'Mon Profil', vous trouverez l'option 'Remise à Zéro' (RAZ) qui vous permet de purger votre historique et de repartir avec 10 000 €.",
            },
            {
              q: "Qu'est-ce qu'une équipe / club de traders ?",
              a: "Les traders peuvent se regrouper en équipes. La performance moyenne de l'équipe est calculée en temps réel pour figurer au classement des clubs.",
            },
            {
              q: "Puis-je continuer à utiliser l'ancienne interface PHP ?",
              a: "Absolument. La nouvelle IHM React et l'ancienne interface PHP partagent la même base de données et fonctionnent en parfaite harmonie.",
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h4 className="font-bold text-white text-sm">{item.q}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      )}

      {/* Contact Form */}
      {tab === 'contact' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Formulaire de Contact</h3>
              <p className="text-xs text-slate-400">Une question ou une suggestion ? Écrivez-nous</p>
            </div>
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

          <form onSubmit={handleSendContact} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Votre Adresse Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Sujet de votre message</label>
              <input
                type="text"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="ex: Question sur le passage d'ordres"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Votre Message</label>
              <textarea
                rows={5}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Détaillez votre demande..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Envoi en cours...' : 'Envoyer le message'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

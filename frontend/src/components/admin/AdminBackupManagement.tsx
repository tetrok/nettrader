/**
 * NetTrader 2 — Composant d'Administration des Sauvegardes MariaDB (AdminBackupManagement)
 *
 * Usage:
 *   Surveillance des sauvegardes automatiques (horaires et quotidiennes)
 *   et déclenchement manuel de dumps MariaDB avec téléchargement direct.
 */

import React, { useEffect, useState } from 'react';
import { adminApi, BackupItem, BackupStatusResponse } from '../../api/admin';
import {
  Database,
  RefreshCw,
  Download,
  Play,
  Clock,
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Info,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export const AdminBackupManagement: React.FC = () => {
  const [data, setData] = useState<BackupStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'manual' | 'daily' | 'hourly'>('manual');
  const [filterType, setFilterType] = useState<'all' | 'manual' | 'daily' | 'hourly'>('all');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      const res = await adminApi.getBackups();
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du chargement des sauvegardes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await adminApi.triggerBackup(selectedType);
      setSuccessMsg(res.message || 'Sauvegarde créée avec succès.');
      await loadBackups();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du déclenchement de la sauvegarde.');
    } finally {
      setTriggering(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setDownloadingFile(filename);
    try {
      await adminApi.downloadBackup(filename);
    } catch (err: any) {
      alert(`Erreur téléchargement: ${err.message}`);
    } finally {
      setDownloadingFile(null);
    }
  };

  const filteredItems = (data?.items || []).filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Planification & Intégrité des Données</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Sauvegardes de la Base MariaDB
          </h2>
          <p className="text-xs text-slate-400">
            Suivi des archives rotatives (horaires et journalières) et déclenchement de snapshots à la demande.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              loadBackups();
            }}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 px-2 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="manual" className="bg-slate-900 text-white">Type : Manuelle</option>
              <option value="daily" className="bg-slate-900 text-white">Type : Journalière</option>
              <option value="hourly" className="bg-slate-900 text-white">Type : Horaire</option>
            </select>

            <button
              onClick={handleTriggerBackup}
              disabled={triggering}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
            >
              {triggering ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950" />
              )}
              <span>{triggering ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPIs & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sauvegardes Totales</span>
            <FileArchive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {summary?.totalCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-400">
            Horaires: {summary?.countsByType.hourly ?? 0} • Jour: {summary?.countsByType.daily ?? 0} • Manuel: {summary?.countsByType.manual ?? 0}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Volume Stocké</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary?.totalSizeFormatted ?? '0 B'}
          </div>
          <div className="text-[11px] text-slate-400">
            Archives compressées (.sql.gz)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Dernière Sauvegarde Réalisée</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          {summary?.lastBackup ? (
            <div>
              <div className="text-sm font-bold font-mono text-white truncate">
                {summary.lastBackup.filename}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                <span>
                  Date : {new Date(summary.lastBackup.createdAt).toLocaleString('fr-FR')}
                </span>
                <span>•</span>
                <span>Taille : {summary.lastBackup.sizeFormatted}</span>
                <span>•</span>
                <span className="capitalize text-amber-300">Type : {summary.lastBackup.type}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 py-1">
              Aucune sauvegarde enregistrée pour le moment.
            </div>
          )}
        </div>
      </div>

      {/* Information Banner on Cron Schedule */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white">Politique de Continuité & Rotation des Sauvegardes</div>
          <p className="text-slate-400">
            • <strong>Sauvegarde horaire :</strong> déclenchée toutes les heures à H:00 (rétention glissante de 24 heures).<br />
            • <strong>Sauvegarde journalière :</strong> déclenchée chaque nuit à 02:00 UTC (rétention glissante de 30 jours).<br />
            • <strong>Sauvegardes manuelles :</strong> conservées sans expiration automatique dans le sous-dossier <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">backups/manual/</code>.<br />
            • <strong>Restauration :</strong> les archives produites sont directement compatibles avec le script utilitaire <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300">./scripts/restore-backup.sh</code>.
          </p>
        </div>
      </div>

      {/* Filters and Backups Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileArchive className="w-4 h-4 text-emerald-400" />
            <span>Fichiers de Sauvegarde ({filteredItems.length})</span>
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toutes ({data?.items.length ?? 0})
            </button>
            <button
              onClick={() => setFilterType('manual')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'manual'
                  ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Manuelles ({summary?.countsByType.manual ?? 0})
            </button>
            <button
              onClick={() => setFilterType('daily')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'daily'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Journalières ({summary?.countsByType.daily ?? 0})
            </button>
            <button
              onClick={() => setFilterType('hourly')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterType === 'hourly'
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Horaires ({summary?.countsByType.hourly ?? 0})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Nom du Fichier</th>
                <th className="px-5 py-3.5">Date de Création</th>
                <th className="px-5 py-3.5 text-right">Taille</th>
                <th className="px-5 py-3.5 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 font-sans">
                    Aucun fichier de sauvegarde ne correspond à ce filtre.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-sans">
                      {item.type === 'manual' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Manuelle
                        </span>
                      )}
                      {item.type === 'daily' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Journalière
                        </span>
                      )}
                      {item.type === 'hourly' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          Horaire
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-200 font-medium font-mono text-xs">
                      {item.filename}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-sans">
                      {new Date(item.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-300">
                      {item.sizeFormatted}
                    </td>
                    <td className="px-5 py-3.5 text-center font-sans">
                      <button
                        onClick={() => handleDownload(item.filename)}
                        disabled={downloadingFile === item.filename}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 mx-auto transition disabled:opacity-50"
                        title="Télécharger l'archive SQL gzip"
                      >
                        {downloadingFile === item.filename ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Télécharger</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

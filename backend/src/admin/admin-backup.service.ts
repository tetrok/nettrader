/**
 * NetTrader 2 — Service de Sauvegarde de Base de Données (AdminBackupService)
 *
 * Usage:
 *   Gère l'inventaire, le suivi et le déclenchement des sauvegardes de la base MariaDB.
 *
 * Logique & Fonctionnement:
 *   - Liste les sauvegardes horaires, quotidiennes et manuelles dans `backups/`.
 *   - Calcule les métriques globales (nombre total, taille cumulée, dernière sauvegarde).
 *   - Exécute des dumps MariaDB complets compressés en gzip (nettrader_manual_YYYYMMDD_HHMMSS.sql.gz).
 *   - Fournit le flux sécurisé pour le téléchargement direct d'archives de backup.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

export interface BackupItem {
  id: string;
  filename: string;
  type: 'hourly' | 'daily' | 'manual';
  size: number;
  sizeFormatted: string;
  createdAt: string;
  timestamp: number;
}

export interface BackupStatusResponse {
  items: BackupItem[];
  summary: {
    totalCount: number;
    totalSize: number;
    totalSizeFormatted: string;
    lastBackup: BackupItem | null;
    countsByType: {
      hourly: number;
      daily: number;
      manual: number;
    };
  };
  storagePath: string;
}

@Injectable()
export class AdminBackupService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Résout le répertoire racine de stockage des sauvegardes.
   */
  getBackupDir(): string {
    if (process.env.BACKUP_DIR && fs.existsSync(process.env.BACKUP_DIR)) {
      return process.env.BACKUP_DIR;
    }

    const candidates = [
      path.resolve(process.cwd(), '../backups'),
      path.resolve(process.cwd(), 'backups'),
      '/app/backups',
      '/workspace/backups',
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }

    const fallback = path.resolve(process.cwd(), '../backups');
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }

  /**
   * Formate une taille en octets de manière lisible.
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Échappe une valeur pour injection sécurisée dans un script SQL de dump.
   */
  private escapeSqlValue(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (Buffer.isBuffer(val)) return `X'${val.toString('hex')}'`;
    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
    const str = String(val);
    const escaped = str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
    return `'${escaped}'`;
  }

  /**
   * Récupère la liste ordonnée et les métriques des sauvegardes disponibles.
   */
  async getBackups(): Promise<BackupStatusResponse> {
    const rootDir = this.getBackupDir();
    const dirs: Array<{ path: string; type: 'hourly' | 'daily' | 'manual' }> = [
      { path: path.join(rootDir, 'hourly'), type: 'hourly' },
      { path: path.join(rootDir, 'daily'), type: 'daily' },
      { path: path.join(rootDir, 'manual'), type: 'manual' },
    ];

    const items: BackupItem[] = [];

    for (const d of dirs) {
      if (!fs.existsSync(d.path)) {
        try {
          fs.mkdirSync(d.path, { recursive: true });
        } catch {
          // ignore directory creation error
        }
        continue;
      }

      let files: string[] = [];
      try {
        files = fs.readdirSync(d.path);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith('.sql.gz') && !file.endsWith('.sql')) continue;
        const filePath = path.join(d.path, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile() && stat.size > 0) {
            items.push({
              id: file,
              filename: file,
              type: d.type,
              size: stat.size,
              sizeFormatted: this.formatBytes(stat.size),
              createdAt: stat.mtime.toISOString(),
              timestamp: Math.floor(stat.mtime.getTime() / 1000),
            });
          }
        } catch {
          // ignore unreadable file
        }
      }
    }

    items.sort((a, b) => b.timestamp - a.timestamp);

    const totalSize = items.reduce((acc, curr) => acc + curr.size, 0);
    const countsByType = {
      hourly: items.filter((i) => i.type === 'hourly').length,
      daily: items.filter((i) => i.type === 'daily').length,
      manual: items.filter((i) => i.type === 'manual').length,
    };

    return {
      items,
      summary: {
        totalCount: items.length,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        lastBackup: items.length > 0 ? items[0] : null,
        countsByType,
      },
      storagePath: rootDir,
    };
  }

  /**
   * Déclenche une sauvegarde complète de la base compressée en gzip.
   */
  async createManualBackup(type: 'manual' | 'daily' | 'hourly' = 'manual'): Promise<BackupItem> {
    const backupDir = this.getBackupDir();
    const destDir = path.join(backupDir, type);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `nettrader_${type}_${timestamp}.sql.gz`;
    const destPath = path.join(destDir, filename);

    // Récupérer toutes les tables
    const tablesRes = await this.dataSource.query('SHOW TABLES');
    const tableKey = Object.keys(tablesRes[0] || {})[0];
    const tableNames: string[] = tablesRes
      .map((r: any) => r[tableKey])
      .filter((t: string) => !!t && !t.startsWith('_dummy'));

    const gzip = zlib.createGzip({ level: 9 });
    const output = fs.createWriteStream(destPath);
    gzip.pipe(output);

    const writeString = async (str: string) => {
      if (!gzip.write(str)) {
        await new Promise((resolve) => gzip.once('drain', resolve));
      }
    };

    // Header SQL
    await writeString(`-- NetTrader 2 MariaDB Backup\n`);
    await writeString(`-- Type: ${type}\n`);
    await writeString(`-- Generated on: ${now.toISOString()}\n\n`);
    await writeString(`SET FOREIGN_KEY_CHECKS=0;\n`);
    await writeString(`SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";\n\n`);

    for (const table of tableNames) {
      await writeString(`-- --------------------------------------------------------\n`);
      await writeString(`-- Structure de la table \`${table}\`\n`);
      await writeString(`-- --------------------------------------------------------\n`);
      await writeString(`DROP TABLE IF EXISTS \`${table}\`;\n`);

      const createRes = await this.dataSource.query(`SHOW CREATE TABLE \`${table}\``);
      if (createRes && createRes[0] && createRes[0]['Create Table']) {
        await writeString(`${createRes[0]['Create Table']};\n\n`);
      }

      // Données
      const rows = await this.dataSource.query(`SELECT * FROM \`${table}\``);
      if (rows && rows.length > 0) {
        await writeString(`-- Contenu de la table \`${table}\` (${rows.length} lignes)\n`);
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const chunk = rows.slice(i, i + batchSize);
          const valuesSql = chunk
            .map((row: any) => {
              const vals = Object.values(row).map((val) => this.escapeSqlValue(val));
              return `(${vals.join(', ')})`;
            })
            .join(',\n');
          await writeString(`INSERT INTO \`${table}\` VALUES\n${valuesSql};\n`);
        }
        await writeString(`\n`);
      }
    }

    await writeString(`SET FOREIGN_KEY_CHECKS=1;\n`);
    await writeString(`-- Dump completed on ${new Date().toISOString()}\n`);

    gzip.end();

    await new Promise<void>((resolve, reject) => {
      output.on('finish', () => resolve());
      output.on('error', (err) => reject(err));
      gzip.on('error', (err) => reject(err));
    });

    const stat = fs.statSync(destPath);
    return {
      id: filename,
      filename,
      type,
      size: stat.size,
      sizeFormatted: this.formatBytes(stat.size),
      createdAt: now.toISOString(),
      timestamp: Math.floor(now.getTime() / 1000),
    };
  }

  /**
   * Retourne le chemin sécurisé d'un fichier de sauvegarde pour téléchargement.
   */
  getBackupFilePath(filename: string): string {
    if (!/^[a-zA-Z0-9_.-]+\.(sql|sql\.gz)$/.test(filename) || filename.includes('..')) {
      throw new BadRequestException('Nom de fichier invalide');
    }

    const rootDir = this.getBackupDir();
    const candidatePaths = [
      path.join(rootDir, 'manual', filename),
      path.join(rootDir, 'daily', filename),
      path.join(rootDir, 'hourly', filename),
      path.join(rootDir, filename),
    ];

    for (const cp of candidatePaths) {
      if (fs.existsSync(cp)) {
        return cp;
      }
    }

    throw new NotFoundException(`Fichier de sauvegarde ${filename} introuvable`);
  }
}

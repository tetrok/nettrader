/**
 * NetTrader 2 — Entité TypeORM Journal des Synchronisations de Marché (MarketSyncLog)
 *
 * Usage:
 *   Mappe la table `market_sync_log` enregistrant les métriques de chaque passage du fetcher Yahoo Finance.
 *
 * Logique & Fonctionnement:
 *   - Stocke l'horodatage, le nombre total d'actions interrogées, le nombre de succès, d'échecs et la durée du cycle.
 */

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('market_sync_log')
export class MarketSyncLog {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'sync_time', type: 'decimal', precision: 10, scale: 0 })
  syncTime: number;

  @Column({ name: 'total_stocks', type: 'int' })
  totalStocks: number;

  @Column({ name: 'success_count', type: 'int' })
  successCount: number;

  @Column({ name: 'error_count', type: 'int' })
  errorCount: number;

  @Column({ name: 'duration_seconds', type: 'float' })
  durationSeconds: number;

  @Column({ name: 'details', type: 'text', nullable: true })
  details: string;
}

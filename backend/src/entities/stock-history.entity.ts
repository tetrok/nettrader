/**
 * NetTrader 2 — Entité TypeORM Historique des Cotations (StockHistory)
 *
 * Usage:
 *   Mappe la table `stock_history` utilisée pour le tracé des graphiques interactifs (1J, 1S, 1M, 1A).
 *
 * Logique & Fonctionnement:
 *   - Enregistre les points chronologiques (codesico, temps UNIX, valeur) générés par le fetcher ou le seeder.
 */

import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('stock_history')
export class StockHistory {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'codesico', type: 'mediumint', unsigned: true })
  code: number;

  @Index()
  @Column({ name: 'temps', type: 'int', unsigned: true })
  time: number;

  @Column({ name: 'valeur', type: 'double' })
  price: number;
}

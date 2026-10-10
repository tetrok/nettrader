/**
 * NetTrader 2 — Entité TypeORM Action Boursière (Stock)
 *
 * Usage:
 *   Mappe la table `cacval` contenant le catalogue des valeurs négociables sur Euronext Paris.
 *
 * Logique & Fonctionnement:
 *   - Stocke le code SICAV, le symbole Yahoo Finance, le nom, la dernière valeur, l'horodatage de cotation,
 *     les compteurs de pannes de synchronisation (fail_count, retry_count) et les drapeaux (authachat, down, is_archived).
 */

import { Entity, PrimaryColumn, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { StockMaj } from './stock-maj.entity';
import { Sector } from './sector.entity';
import { MarketEntity } from './market.entity';

@Entity('cacval')
export class Stock {
  @PrimaryColumn({ name: 'codesico', type: 'mediumint', unsigned: true })
  code: number;

  @Column({ name: 'yahooname', type: 'varchar', length: 25 })
  ticker: string;

  @Column({ name: 'nom', type: 'varchar', length: 35 })
  name: string;

  @Column({ name: 'valeur', type: 'double', default: 0 })
  price: number;

  @Column({ name: 'lasttime', type: 'decimal', precision: 10, scale: 0, default: 0 })
  lastTime: number;

  @Column({ name: 'lasttimedown', type: 'decimal', precision: 10, scale: 0, default: 0 })
  lastTimeDown: number;

  @Column({ name: 'last_attempt', type: 'decimal', precision: 10, scale: 0, default: 0 })
  lastAttempt: number;

  @Column({ name: 'last_status', type: 'enum', enum: ['success', 'failed', 'pending'], default: 'pending' })
  lastStatus: string;

  @Column({ name: 'fail_count', type: 'int', unsigned: true, default: 0 })
  failCount: number;

  @Column({ name: 'total_fails', type: 'int', unsigned: true, default: 0 })
  totalFails: number;

  @Column({ name: 'retry_count', type: 'int', unsigned: true, default: 0 })
  retryCount: number;

  @Column({ name: 'last_error', type: 'varchar', length: 255, nullable: true })
  lastError: string;

  @Column({ name: 'authachat', type: 'enum', enum: ['1', '0'], default: '1' })
  authBuy: string;

  @Column({ name: 'down', type: 'enum', enum: ['1', '0'], default: '1' })
  down: string;

  @Column({ name: 'idsecteur', type: 'smallint', unsigned: true, default: 22 })
  idsecteur: number;

  @Column({ name: 'idmarket', type: 'smallint', unsigned: true, default: 1 })
  idmarket: number;

  @Column({ name: 'is_archived', type: 'enum', enum: ['1', '0'], default: '0' })
  isArchived: string;

  @OneToOne(() => StockMaj, { nullable: true })
  @JoinColumn({ name: 'codesico', referencedColumnName: 'code' })
  maj: StockMaj;

  @ManyToOne(() => Sector, { nullable: true })
  @JoinColumn({ name: 'idsecteur', referencedColumnName: 'id' })
  sector: Sector;

  @ManyToOne(() => MarketEntity, { nullable: true })
  @JoinColumn({ name: 'idmarket', referencedColumnName: 'id' })
  market: MarketEntity;

  get isAuthBuy(): boolean {
    return this.authBuy === '1';
  }

  get isTracked(): boolean {
    return this.down === '1';
  }
}

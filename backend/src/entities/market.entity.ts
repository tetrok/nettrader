/**
 * NetTrader 2 — Entité TypeORM Marché Financier (Market)
 *
 * Usage:
 *   Mappe la table `marche` catégorisant les places de cotation (ex: Euronext Paris, Alternext).
 */

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('market')
export class MarketEntity {
  @PrimaryGeneratedColumn({ name: 'idmarket', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'marketname', type: 'varchar', length: 80 })
  name: string;

  @Column({ name: 'openday', type: 'smallint', default: 0 })
  openDay: number;

  @Column({ name: 'closeday', type: 'smallint', default: 6 })
  closeDay: number;

  @Column({ name: 'openhour', type: 'smallint', unsigned: true, default: 0 })
  openHour: number;

  @Column({ name: 'openminute', type: 'smallint', unsigned: true, default: 1 })
  openMinute: number;

  @Column({ name: 'closehour', type: 'smallint', unsigned: true, default: 23 })
  closeHour: number;

  @Column({ name: 'closeminute', type: 'smallint', unsigned: true, default: 59 })
  closeMinute: number;
}

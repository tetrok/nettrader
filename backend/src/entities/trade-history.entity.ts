/**
 * NetTrader 2 — Entité TypeORM Historique des Transactions Réalisées (TradeHistory)
 *
 * Usage:
 *   Mappe la table `trade_history` archivant toutes les transactions exécutées pour chaque joueur.
 *
 * Logique & Fonctionnement:
 *   - Consigne la date, le titre, le sens (achat/vente), le volume, le prix d'exécution unitaire et les taxes perçues.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Stock } from './stock.entity';

@Entity('historique')
export class TradeHistory {
  @PrimaryGeneratedColumn({ name: 'idhisto', type: 'int' })
  id: number;

  @Column({ name: 'temps', type: 'decimal', precision: 10, scale: 0, default: 0 })
  time: number;

  @Column({ name: 'codesico', type: 'mediumint', unsigned: true, default: 0 })
  stockCode: number;

  @Index()
  @Column({ name: 'idcompte', type: 'smallint', unsigned: true, default: 0 })
  userId: number;

  @Column({ name: 'sens', type: 'enum', enum: ['Achat', 'Vente'], default: 'Achat' })
  sens: string;

  @Column({ name: 'nbr', type: 'bigint', default: 0 })
  quantity: number;

  @Column({ name: 'valeurunique', type: 'double', default: 0 })
  price: number;

  @Column({ name: 'taxe', type: 'double', default: 0 })
  tax: number;

  @Column({ name: 'profit', type: 'float', precision: 10, scale: 2, default: 0 })
  profit: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idcompte' })
  user: User;

  @ManyToOne(() => Stock)
  @JoinColumn({ name: 'codesico' })
  stock: Stock;
}

/**
 * NetTrader 2 — Entité TypeORM Session Utilisateur Active (Session)
 *
 * Usage:
 *   Mappe la table `session` stockant les jetons cryptographiques de session CSPRNG et leur échéance temporelle.
 */

import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('session')
export class Session {
  @PrimaryColumn({ name: 'idSession', type: 'varchar', length: 64 })
  idSession: string;

  @Column({ name: 'idcompte', type: 'smallint', unsigned: true, default: 0 })
  idcompte: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idcompte' })
  user: User;

  @Column({ name: 'tempsLimite', type: 'decimal', precision: 10, scale: 0, default: 0 })
  tempsLimite: number;

  @Column({ name: 'tempsconnect', type: 'decimal', precision: 10, scale: 0, default: 0 })
  tempsconnect: number;

  get isExpired(): boolean {
    const now = Math.floor(Date.now() / 1000);
    return Number(this.tempsLimite) < now;
  }
}

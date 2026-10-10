/**
 * NetTrader 2 — Entité TypeORM Membre d'Équipe (GroupMember)
 *
 * Usage:
 *   Mappe la table `groupemembres` associant un compte joueur à son équipe avec son capital de référence d'adhésion.
 */

import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';

@Entity('membregroupe')
export class GroupMember {
  @PrimaryColumn({ name: 'idcompte', type: 'smallint', unsigned: true })
  userId: number;

  @Column({ name: 'idgroupe', type: 'smallint', unsigned: true, default: 0 })
  groupId: number;

  @Column({ name: 'datejoint', type: 'decimal', precision: 10, scale: 0, default: 0 })
  joinDate: number;

  @Column({ name: 'capitalinscr', type: 'float', precision: 10, scale: 2, default: 0 })
  capitalJoin: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idcompte' })
  user: User;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'idgroupe' })
  group: Group;
}

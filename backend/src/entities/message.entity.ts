/**
 * NetTrader 2 — Entité TypeORM Message Privé Interne (Message)
 *
 * Usage:
 *   Mappe la table `messages` stockant les correspondances privées échangées entre joueurs.
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

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ name: 'idmsg', type: 'int', unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'idcompte', type: 'smallint', unsigned: true, default: 0 })
  recipientId: number;

  @Column({ name: 'idenvoyeur', type: 'smallint', unsigned: true, default: 0 })
  senderId: number;

  @Column({ name: 'datemess', type: 'decimal', precision: 10, scale: 0, default: 0 })
  date: number;

  @Column({ name: 'titre', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'corps', type: 'text' })
  content: string;

  @Column({ name: 'etat', type: 'enum', enum: ['non lu', 'lu'], default: 'non lu' })
  status: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idenvoyeur' })
  sender: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idcompte' })
  recipient: User;
}

/**
 * NetTrader 2 — Entité TypeORM File d'Attente E-mail (MailToSend)
 *
 * Usage:
 *   Mappe la table `mail_tosend` contenant les messages électroniques en attente d'expédition SMTP.
 */

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('mail_tosend')
export class MailToSend {
  @PrimaryGeneratedColumn({ name: 'idmail', type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'dateenvoi', type: 'decimal', precision: 10, scale: 0, default: 0 })
  sendDate: number;

  @Column({ name: 'from_mail', type: 'varchar', length: 120, default: '' })
  fromMail: string;

  @Column({ name: 'from_pseudo', type: 'varchar', length: 120, default: '' })
  fromPseudo: string;

  @Column({ name: 'to_mail', type: 'varchar', length: 120, default: '' })
  toMail: string;

  @Column({ name: 'to_pseudo', type: 'varchar', length: 120, default: '' })
  toPseudo: string;

  @Column({ name: 'titre', type: 'varchar', length: 255, default: '' })
  subject: string;

  @Column({ name: 'corps', type: 'text' })
  body: string;

  @Column({
    name: 'etat',
    type: 'enum',
    enum: ['attente', 'traitement', 'traite', 'erreur'],
    default: 'attente',
  })
  status: 'attente' | 'traitement' | 'traite' | 'erreur';
}

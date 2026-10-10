/**
 * NetTrader 2 — Entité TypeORM Contenu Textuel d'un Message (TopicPostContent)
 *
 * Usage:
 *   Mappe la table `topicpostcontent` stockant le texte brut et les balises BBCode d'un message.
 */

import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('f_corps')
export class TopicPostContent {
  @PrimaryColumn({ name: 'idmessage', type: 'mediumint', unsigned: true })
  id: number;

  @Column({ name: 'contenu', type: 'text' })
  content: string;
}

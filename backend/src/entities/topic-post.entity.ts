/**
 * NetTrader 2 — Entité TypeORM Métadonnées d'un Message de Forum (TopicPost)
 *
 * Usage:
 *   Mappe la table `topicpost` liant un message à son sujet, à son auteur et à sa date de publication.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Topic } from './topic.entity';
import { User } from './user.entity';
import { TopicPostContent } from './topic-post-content.entity';

@Entity('f_message')
export class TopicPost {
  @PrimaryGeneratedColumn({ name: 'idmessage', type: 'mediumint', unsigned: true })
  id: number;

  @Column({ name: 'idsujet', type: 'mediumint', unsigned: true })
  topicId: number;

  @Column({ name: 'datepost', type: 'decimal', precision: 10, scale: 0, default: 0 })
  date: number;

  @Column({ name: 'idcompte', type: 'smallint', unsigned: true, default: 0 })
  authorId: number;

  @ManyToOne(() => Topic, (topic) => topic.posts)
  @JoinColumn({ name: 'idsujet' })
  topic: Topic;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idcompte' })
  author: User;

  @OneToOne(() => TopicPostContent, { cascade: true })
  @JoinColumn({ name: 'idmessage' })
  postContent: TopicPostContent;
}

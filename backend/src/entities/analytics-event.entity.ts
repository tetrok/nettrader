/**
 * NetTrader 2 — Entité TypeORM Événement d'Analytique & Usages (AnalyticsEvent)
 *
 * Usage:
 *   Stocke les événements de télémétrie, navigation et pratiques métier (trading, forum, etc.).
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_event')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Index('idx_analytics_event_session')
  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId: string;

  @Index('idx_analytics_event_user')
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Index('idx_analytics_event_name')
  @Column({ name: 'event_name', type: 'varchar', length: 64 })
  eventName: string;

  @Column({ name: 'category', type: 'varchar', length: 32, default: 'general' })
  category: string;

  @Column({ name: 'properties', type: 'longtext', nullable: true })
  properties: string | null;

  @Index('idx_analytics_event_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}

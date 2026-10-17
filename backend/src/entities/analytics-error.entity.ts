/**
 * NetTrader 2 — Entité TypeORM Erreurs & Incidents Utilisateur (AnalyticsError)
 *
 * Usage:
 *   Stocke les erreurs API 4xx/5xx, crashs UI React, et rejets d'ordres boursiers.
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_error')
export class AnalyticsError {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'session_id', type: 'varchar', length: 64 })
  sessionId: string;

  @Index('idx_analytics_error_user')
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Index('idx_analytics_error_type')
  @Column({ name: 'error_type', type: 'varchar', length: 32, default: 'API_ERROR' })
  errorType: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'route', type: 'varchar', length: 255, nullable: true })
  route: string | null;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ name: 'stack_trace', type: 'mediumtext', nullable: true })
  stackTrace: string | null;

  @Column({ name: 'context', type: 'longtext', nullable: true })
  context: string | null;

  @Index('idx_analytics_error_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}

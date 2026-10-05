import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('market_sync_log')
export class MarketSyncLog {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'sync_time', type: 'decimal', precision: 10, scale: 0 })
  syncTime: number;

  @Column({ name: 'total_stocks', type: 'int' })
  totalStocks: number;

  @Column({ name: 'success_count', type: 'int' })
  successCount: number;

  @Column({ name: 'error_count', type: 'int' })
  errorCount: number;

  @Column({ name: 'duration_seconds', type: 'float' })
  durationSeconds: number;

  @Column({ name: 'details', type: 'text', nullable: true })
  details: string;
}

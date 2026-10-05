import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('cacvalmaj')
export class StockMaj {
  @PrimaryColumn({ name: 'codesico', type: 'mediumint', unsigned: true })
  code: number;

  @Column({ name: 'yahooname', type: 'varchar', length: 25 })
  ticker: string;

  @Column({ name: 'nom', type: 'varchar', length: 35 })
  name: string;

  @Column({ name: 'valeur', type: 'double', default: 0 })
  price: number;

  @Column({ name: 'lasttime', type: 'decimal', precision: 10, scale: 0, default: 0 })
  lastTime: number;

  @Column({ name: 'lasttimedown', type: 'decimal', precision: 10, scale: 0, default: 0 })
  lastTimeDown: number;

  @Column({ name: 'authachat', type: 'enum', enum: ['1', '0'], default: '1' })
  authBuy: string;

  @Column({ name: 'down', type: 'enum', enum: ['1', '0'], default: '1' })
  down: string;

  @Column({ name: 'idsecteur', type: 'smallint', unsigned: true, default: 0 })
  idsecteur: number;
}

import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('stock_history')
export class StockHistory {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Index()
  @Column({ name: 'codesico', type: 'mediumint', unsigned: true })
  code: number;

  @Index()
  @Column({ name: 'temps', type: 'int', unsigned: true })
  time: number;

  @Column({ name: 'valeur', type: 'double' })
  price: number;
}

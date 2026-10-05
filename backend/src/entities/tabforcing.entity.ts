import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tabforcing')
export class TabForcing {
  @PrimaryGeneratedColumn({ name: 'idforcing', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'idcompte', type: 'smallint', unsigned: true, default: 0 })
  idcompte: number;

  @Column({ name: 'dateforcing', type: 'decimal', precision: 10, scale: 0, default: 0 })
  dateforcing: number;
}

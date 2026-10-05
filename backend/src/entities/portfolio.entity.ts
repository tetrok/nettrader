import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Stock } from './stock.entity';

@Entity('portef')
export class Portfolio {
  @PrimaryColumn({ name: 'idcompte', type: 'smallint', unsigned: true })
  userId: number;

  @PrimaryColumn({ name: 'codesico', type: 'mediumint', unsigned: true })
  stockCode: number;

  @Column({ name: 'quant', type: 'bigint', default: 0 })
  quantity: number;

  @Column({ name: 'ansvaleur', type: 'float', default: 0 })
  buyPrice: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idcompte' })
  user: User;

  @ManyToOne(() => Stock)
  @JoinColumn({ name: 'codesico' })
  stock: Stock;

  get isVad(): boolean {
    return Number(this.quantity) < 0;
  }
}

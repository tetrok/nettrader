import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Stock } from './stock.entity';

@Entity('ordre')
export class Order {
  @PrimaryGeneratedColumn({ name: 'idordre', type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'codesico', type: 'int', default: 0 })
  stockCode: number;

  @Column({ name: 'idcompte', type: 'int', default: 0 })
  userId: number;

  @Column({ name: 'datecreation', type: 'decimal', precision: 10, scale: 0, default: 0 })
  dateCreation: number;

  @Column({ name: 'sens', type: 'enum', enum: ['achat', 'vente'], default: 'achat' })
  sens: string;

  @Column({ name: 'nbr', type: 'int', default: 0 })
  quantity: number;

  @Column({ name: 'pourc', type: 'float', nullable: true, default: 0 })
  pourc: number;

  @Column({ name: 'tempslim', type: 'decimal', precision: 10, scale: 0, default: 0 })
  tempsLimite: number;

  @Column({ name: 'coursmin', type: 'double', default: 0 })
  coursMin: number;

  @Column({ name: 'coursmax', type: 'double', default: 0 })
  coursMax: number;

  @Column({ name: 'etat', type: 'enum', enum: ['1', '0'], default: '1' })
  etat: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idcompte' })
  user: User;

  @ManyToOne(() => Stock)
  @JoinColumn({ name: 'codesico' })
  stock: Stock;

  get isPending(): boolean {
    return this.etat === '1';
  }
}

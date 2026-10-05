import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';

@Entity('groupe')
export class Group {
  @PrimaryGeneratedColumn({ name: 'idgroupe', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'idcompte', type: 'smallint', unsigned: true, default: 0 })
  leaderId: number;

  @Column({ name: 'titregroupe', type: 'varchar', length: 250 })
  name: string;

  @Column({ name: 'initialgroupe', type: 'varchar', length: 5 })
  tag: string;

  @Column({ name: 'urlsite', type: 'varchar', length: 250, default: '' })
  website: string;

  @Column({ name: 'etat', type: 'enum', enum: ['inactif', 'actif'], default: 'inactif' })
  status: string;

  @Column({ name: 'descriptiongroupe', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'medor', type: 'tinyint', unsigned: true, default: 0 })
  goldMedals: number;

  @Column({ name: 'medargent', type: 'tinyint', unsigned: true, default: 0 })
  silverMedals: number;

  @Column({ name: 'medbronze', type: 'tinyint', unsigned: true, default: 0 })
  bronzeMedals: number;

  @Column({ name: 'datecreation', type: 'decimal', precision: 10, scale: 0, default: 0 })
  createdDate: number;

  @Column({ name: 'idforum', type: 'smallint', unsigned: true, nullable: true })
  forumId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'idcompte' })
  leader: User;
}

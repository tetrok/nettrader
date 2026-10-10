/**
 * NetTrader 2 — Entité TypeORM Section de Forum (ForumSection)
 *
 * Usage:
 *   Mappe la table `forumsection` regroupant logiquement plusieurs rubriques de discussion.
 */

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Forum } from './forum.entity';

@Entity('f_section')
export class ForumSection {
  @PrimaryGeneratedColumn({ name: 'idsection', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'libellesection', type: 'varchar', length: 255 })
  title: string;

  get name(): string {
    return this.title;
  }

  @OneToMany(() => Forum, (forum) => forum.section)
  forums: Forum[];
}

/**
 * NetTrader 2 — Entité TypeORM Secteur d'Activité (Sector)
 *
 * Usage:
 *   Mappe la table `secteur` catégorisant les branches économiques des entreprises cotées (Technologies, Santé, etc.).
 */

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('secteurent')
export class Sector {
  @PrimaryGeneratedColumn({ name: 'idsecteur', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'libellesecteur', type: 'varchar', length: 100 })
  name: string;
}

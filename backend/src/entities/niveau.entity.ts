/**
 * NetTrader 2 — Entité TypeORM Niveau d'Expertise (Niveau)
 *
 * Usage:
 *   Mappe la table `niveau` définissant les règles et droits associés à chaque niveau (comptant, limites, VAD).
 */

import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('niveau')
export class Niveau {
  @PrimaryColumn({ name: 'idniveau', type: 'mediumint', unsigned: true })
  id: number;

  @Column({ name: 'texteniveau', type: 'text' })
  texte: string;

  @Column({ name: 'seuil', type: 'smallint', default: 0 })
  seuil: number;

  @Column({ name: 'vad', type: 'enum', enum: ['0', '1'], default: '0' })
  vad: string;

  @Column({ name: 'plage', type: 'enum', enum: ['0', '1'], default: '0' })
  plage: string;
}

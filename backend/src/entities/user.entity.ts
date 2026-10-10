/**
 * NetTrader 2 — Entité TypeORM Compte Joueur (User)
 *
 * Usage:
 *   Mappe la table `compte` représentant les utilisateurs, traders et administrateurs du jeu.
 *
 * Logique & Fonctionnement:
 *   - Gère le pseudonyme, l'e-mail, le mot de passe haché (bcrypt), le solde liquide (cashback),
 *     le niveau d'expertise (authlevel : 1 Débutant, 2 Initié, 3 Expert, 99 Admin), et les options de notification.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Niveau } from './niveau.entity';
import { Skin } from './skin.entity';

@Entity('compte')
export class User {
  @PrimaryGeneratedColumn({ name: 'idcompte', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'pseudonyme', type: 'varchar', length: 30 })
  pseudo: string;

  @Column({ name: 'nom', type: 'varchar', length: 50, default: '' })
  nom: string;

  @Column({ name: 'prenom', type: 'varchar', length: 50, default: '' })
  prenom: string;

  @Column({ name: 'passe', type: 'varchar', length: 255 })
  passe: string;

  @Column({ name: 'dateinscr', type: 'decimal', precision: 10, scale: 0, default: 0 })
  dateinscr: number;

  @Column({ name: 'adresse', type: 'varchar', length: 100, default: '' })
  adresse: string;

  @Column({ name: 'cp', type: 'varchar', length: 10, default: '' })
  cp: string;

  @Column({ name: 'ville', type: 'varchar', length: 50, default: '' })
  ville: string;

  @Column({ name: 'tel', type: 'varchar', length: 20, default: '' })
  tel: string;

  @Column({ name: 'email', type: 'varchar', length: 100 })
  email: string;

  @Column({ name: 'etablissement', type: 'varchar', length: 100, default: '' })
  etablissement: string;

  @Column({ name: 'idniveau', type: 'tinyint', unsigned: true, default: 1 })
  idniveau: number;

  @ManyToOne(() => Niveau, { nullable: true })
  @JoinColumn({ name: 'idniveau' })
  niveau: Niveau;

  @Column({ name: 'cashback', type: 'decimal', precision: 10, scale: 2, default: 10000.0 })
  cashback: number;

  @Column({ name: 'maildaily', type: 'tinyint', default: 0 })
  maildaily: number;

  @Column({ name: 'mailweekly', type: 'tinyint', default: 0 })
  mailweekly: number;

  @Column({ name: 'lastpostaction', type: 'decimal', precision: 10, scale: 0, default: 0 })
  lastpostaction: number;

  @Column({ name: 'dateactivite', type: 'decimal', precision: 10, scale: 0, default: 0 })
  dateactivite: number;

  @Column({ name: 'authlevel', type: 'tinyint', default: 1 })
  authlevel: number;

  @Column({ name: 'histonbl', type: 'smallint', unsigned: true, default: 20 })
  histonbl: number;

  @Column({ name: 'msgnbl', type: 'smallint', unsigned: true, default: 10 })
  msgnbl: number;

  @Column({ name: 'classenbl', type: 'smallint', unsigned: true, default: 30 })
  classenbl: number;

  @Column({ name: 'idskin', type: 'tinyint', unsigned: true, default: 1 })
  idskin: number;

  @ManyToOne(() => Skin, { nullable: true })
  @JoinColumn({ name: 'idskin' })
  skinEntity: Skin;

  @Column({ name: 'cookiesess', type: 'varchar', length: 32, default: '' })
  cookiesess: string;

  @Column({ name: 'nbpostforum', type: 'int', unsigned: true, default: 0 })
  nbpostforum: number;

  @Column({ name: 'toutvuforum', type: 'decimal', precision: 10, scale: 0, default: 0 })
  toutvuforum: number;

  get isAdmin(): boolean {
    return this.id === 1 || this.authlevel > 1;
  }

  get isVadAllowed(): boolean {
    return this.niveau ? this.niveau.vad === '1' : false;
  }
}

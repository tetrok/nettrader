import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('skin')
export class Skin {
  @PrimaryColumn({ name: 'idskin', type: 'int', default: 0 })
  id: number;

  @Column({ name: 'nomskin', type: 'varchar', length: 25, default: '' })
  nom: string;

  @Column({ name: 'repskin', type: 'varchar', length: 25, default: 'default' })
  repertoire: string;

  @Column({ name: 'descriptionskin', type: 'varchar', length: 255, default: '' })
  description: string;
}

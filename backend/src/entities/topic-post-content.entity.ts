import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('f_corps')
export class TopicPostContent {
  @PrimaryColumn({ name: 'idmessage', type: 'mediumint', unsigned: true })
  id: number;

  @Column({ name: 'contenu', type: 'text' })
  content: string;
}

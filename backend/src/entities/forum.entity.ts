import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ForumSection } from './forum-section.entity';
import { Topic } from './topic.entity';

@Entity('f_forum')
export class Forum {
  @PrimaryGeneratedColumn({ name: 'idforum', type: 'smallint', unsigned: true })
  id: number;

  @Column({ name: 'idsection', type: 'smallint', unsigned: true, nullable: true })
  sectionId: number;

  @Column({ name: 'nomforum', type: 'char', length: 50 })
  name: string;

  @Column({ name: 'descriptionforum', type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ name: 'nbsujets', type: 'mediumint', unsigned: true, default: 0 })
  topicsCount: number;

  @Column({ name: 'nbmessages', type: 'mediumint', unsigned: true, default: 0 })
  messagesCount: number;

  @Column({ name: 'idlastmessage', type: 'mediumint', unsigned: true, nullable: true })
  lastMessageId: number;

  @Column({
    name: 'authread',
    type: 'enum',
    enum: ['ouvert', 'admin', 'groupe', 'identifie'],
    default: 'ouvert',
  })
  authRead: string;

  @Column({
    name: 'authwrite',
    type: 'enum',
    enum: ['identifie', 'admin', 'groupe'],
    default: 'identifie',
  })
  authWrite: string;

  @ManyToOne(() => ForumSection, (section) => section.forums, { nullable: true })
  @JoinColumn({ name: 'idsection' })
  section: ForumSection;

  @OneToMany(() => Topic, (topic) => topic.forum)
  topics: Topic[];
}

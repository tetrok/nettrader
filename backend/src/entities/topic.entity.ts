import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Forum } from './forum.entity';
import { User } from './user.entity';
import { TopicPost } from './topic-post.entity';

@Entity('f_sujet')
export class Topic {
  @PrimaryGeneratedColumn({ name: 'idsujet', type: 'mediumint', unsigned: true })
  id: number;

  @Column({ name: 'idforum', type: 'smallint', unsigned: true })
  forumId: number;

  @Column({ name: 'idcompteauteur', type: 'mediumint', unsigned: true, default: 0 })
  authorId: number;

  @Column({ name: 's_nbmessages', type: 'mediumint', unsigned: true, default: 0 })
  messagesCount: number;

  @Column({ name: 'txtsujet', type: 'char', length: 80 })
  title: string;

  @Column({ name: 'nblectures', type: 'smallint', unsigned: true, default: 0 })
  viewsCount: number;

  @Column({ name: 'idlastmessage', type: 'mediumint', unsigned: true, nullable: true })
  lastMessageId: number;

  @ManyToOne(() => Forum, (forum) => forum.topics)
  @JoinColumn({ name: 'idforum' })
  forum: Forum;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'idcompteauteur' })
  author: User;

  @OneToMany(() => TopicPost, (post) => post.topic)
  posts: TopicPost[];
}

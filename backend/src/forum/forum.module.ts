import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumSection } from '../entities/forum-section.entity';
import { Forum } from '../entities/forum.entity';
import { Topic } from '../entities/topic.entity';
import { TopicPost } from '../entities/topic-post.entity';
import { TopicPostContent } from '../entities/topic-post-content.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ForumSection,
      Forum,
      Topic,
      TopicPost,
      TopicPostContent,
    ]),
    AuthModule,
  ],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService, TypeOrmModule],
})
export class ForumModule {}

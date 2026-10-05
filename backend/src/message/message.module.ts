import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User]), AuthModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService, TypeOrmModule],
})
export class MessageModule {}

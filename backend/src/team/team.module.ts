import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { User } from '../entities/user.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember, User, Portfolio]),
    AuthModule,
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService, TypeOrmModule],
})
export class TeamModule {}

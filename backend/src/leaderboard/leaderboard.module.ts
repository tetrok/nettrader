/**
 * NetTrader 2 — Module NestJS des Classements
 *
 * Usage:
 *   Assemble LeaderboardController, LeaderboardService et les entités associées.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../entities/user.entity';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { Portfolio } from '../entities/portfolio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Group, GroupMember, Portfolio])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService, TypeOrmModule],
})
export class LeaderboardModule {}

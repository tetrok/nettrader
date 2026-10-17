/**
 * NetTrader 2 — Module d'Analytique et Télémétrie (AnalyticsModule)
 *
 * Usage:
 *   Assemble les contrôleurs de collecte, le contrôleur admin et le service d'analytique
 *   avec les entités TypeORM AnalyticsEvent, AnalyticsError, User et Session.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { AnalyticsError } from '../entities/analytics-error.entity';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsEvent, AnalyticsError, User, Session]),
    AuthModule,
  ],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

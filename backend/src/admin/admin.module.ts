/**
 * NetTrader 2 — Module NestJS d'Administration
 *
 * Usage:
 *   Assemble l'ensemble des contrôleurs et services d'administration et supervise la gestion globale du jeu.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { Order } from '../entities/order.entity';
import { Stock } from '../entities/stock.entity';
import { StockMaj } from '../entities/stock-maj.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { TradeHistory } from '../entities/trade-history.entity';
import { Sector } from '../entities/sector.entity';
import { MarketEntity } from '../entities/market.entity';
import { MarketSyncLog } from '../entities/market-sync-log.entity';
import { ForumSection } from '../entities/forum-section.entity';
import { Forum } from '../entities/forum.entity';
import { Topic } from '../entities/topic.entity';
import { TopicPost } from '../entities/topic-post.entity';
import { TopicPostContent } from '../entities/topic-post-content.entity';
import { MailToSend } from '../entities/mail-to-send.entity';
import { TradingModule } from '../trading/trading.module';
import { MarketModule } from '../market/market.module';
import { YahooFinanceService } from './yahoo-finance.service';
import { MarketSyncService } from './market-sync.service';
import { MarketSyncScheduler } from './market-sync.scheduler';
import { MailerQueueService } from './mailer-queue.service';
import { AdminStockService } from './admin-stock.service';
import { AdminForumService } from './admin-forum.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminJobsService } from './admin-jobs.service';
import { AdminBackupService } from './admin-backup.service';
import { AdminController } from './admin.controller';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Session,
      Order,
      Stock,
      StockMaj,
      StockHistory,
      Portfolio,
      TradeHistory,
      Sector,
      MarketEntity,
      MarketSyncLog,
      ForumSection,
      Forum,
      Topic,
      TopicPost,
      TopicPostContent,
      MailToSend,
    ]),
    TradingModule,
    MarketModule,
  ],
  providers: [
    YahooFinanceService,
    MarketSyncService,
    MarketSyncScheduler,
    MailerQueueService,
    AdminStockService,
    AdminForumService,
    AdminDashboardService,
    AdminJobsService,
    AdminBackupService,
  ],
  controllers: [AdminController, JobsController],
  exports: [MarketSyncService, AdminJobsService, MarketSyncScheduler, MailerQueueService, AdminBackupService],
})
export class AdminModule {}

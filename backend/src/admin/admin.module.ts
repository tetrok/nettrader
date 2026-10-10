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
import { TradingModule } from '../trading/trading.module';
import { YahooFinanceService } from './yahoo-finance.service';
import { MarketSyncService } from './market-sync.service';
import { AdminStockService } from './admin-stock.service';
import { AdminForumService } from './admin-forum.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminJobsService } from './admin-jobs.service';
import { AdminController } from './admin.controller';
import { CmdController } from './cmd.controller';

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
    ]),
    TradingModule,
  ],
  providers: [
    YahooFinanceService,
    MarketSyncService,
    AdminStockService,
    AdminForumService,
    AdminDashboardService,
    AdminJobsService,
  ],
  controllers: [AdminController, CmdController],
  exports: [MarketSyncService, AdminJobsService],
})
export class AdminModule {}

/**
 * NetTrader 2 — Module Racine de l'Application NestJS
 *
 * Usage:
 *   Déclare et assemble l'ensemble des modules fonctionnels et la configuration globale TypeORM.
 *
 * Logique & Fonctionnement:
 *   - TypeOrmModule.forRootAsync : initialise la connexion MariaDB/MySQL avec les entités de l'application.
 *   - Importation des modules métier : AuthModule, AccountModule, TradingModule, MarketModule,
 *     LeaderboardModule, TeamModule, MessageModule, ForumModule, ContentModule, AdminModule.
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { MarketModule } from './market/market.module';
import { TradingModule } from './trading/trading.module';
import { AccountModule } from './account/account.module';
import { TeamModule } from './team/team.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { MessageModule } from './message/message.module';
import { ForumModule } from './forum/forum.module';
import { ContentModule } from './content/content.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mariadb',
        host: config.get<string>('DB_HOST', 'db'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USER', 'nettrader_user'),
        password: config.get<string>('DB_PASSWORD', 'nettrader_password'),
        database: config.get<string>('DB_NAME', 'nettrader'),
        autoLoadEntities: true,
        synchronize: false, // Ne jamais synchroniser pour préserver la DB legacy
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    MarketModule,
    TradingModule,
    AccountModule,
    TeamModule,
    LeaderboardModule,
    MessageModule,
    ForumModule,
    ContentModule,
    AdminModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

/**
 * NetTrader 2 — Module NestJS du Compte Utilisateur
 *
 * Usage:
 *   Assemble AccountController, AccountService et les entités User et Session.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { TradeHistory } from '../entities/trade-history.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, TradeHistory]),
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService, TypeOrmModule],
})
export class AccountModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { User } from '../entities/user.entity';
import { Stock } from '../entities/stock.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { Order } from '../entities/order.entity';
import { TradeHistory } from '../entities/trade-history.entity';
import { MarketModule } from '../market/market.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Stock, Portfolio, Order, TradeHistory]),
    MarketModule,
    AuthModule,
  ],
  controllers: [TradingController],
  providers: [TradingService],
  exports: [TradingService, TypeOrmModule],
})
export class TradingModule {}

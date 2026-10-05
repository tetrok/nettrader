import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { Stock } from '../entities/stock.entity';
import { StockMaj } from '../entities/stock-maj.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { Message } from '../entities/message.entity';
import { Sector } from '../entities/sector.entity';
import { MarketEntity } from '../entities/market.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, StockMaj, StockHistory, Message, Sector, MarketEntity])],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService, TypeOrmModule],
})
export class MarketModule {}

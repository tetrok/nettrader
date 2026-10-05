import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MarketService, ChartPeriod } from './market.service';

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Résumé du marché boursier, statut, top hausses et baisses' })
  async getSummary() {
    return this.marketService.getSummary();
  }

  @Get('stocks')
  @ApiOperation({ summary: 'Liste des actions négociables avec cours et variation' })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom, ticker ou code' })
  async getStocks(@Query('search') search?: string) {
    return this.marketService.getStocksWithVariation(search);
  }

  @Get('stocks/:code')
  @ApiOperation({ summary: 'Fiche détaillée d\'une action' })
  @ApiQuery({ name: 'period', required: false, enum: ['1d', '1w', '1m', '1y'] })
  async getStock(
    @Param('code', ParseIntPipe) code: number,
    @Query('period') period?: ChartPeriod,
  ) {
    return this.marketService.getStock(code, period || '1m');
  }

  @Get('stocks/:code/history')
  @ApiOperation({ summary: 'Historique des cours d\'une action' })
  @ApiQuery({ name: 'period', required: false, enum: ['1d', '1w', '1m', '1y'] })
  async getStockHistory(
    @Param('code', ParseIntPipe) code: number,
    @Query('period') period?: ChartPeriod,
  ) {
    const p = period || '1m';
    const history = await this.marketService.getStockHistory(code, p);
    return {
      code,
      period: p,
      history,
    };
  }
}

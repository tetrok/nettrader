/**
 * NetTrader 2 — Contrôleur REST des Opérations de Trading
 *
 * Usage:
 *   Expose l'ensemble des endpoints de courtage (/api/trading) : portefeuille, carnet d'ordres, simulations et historique.
 *
 * Logique & Fonctionnement:
 *   - getPortfolio() : retourne la valorisation totale, les liquidités et le détail des positions.
 *   - getPendingOrders() : liste les ordres d'achat et de vente en carnet.
 *   - placeOrder() : passe un ordre d'achat ou de vente (au marché, limité, ou à seuil).
 *   - cancelOrder() / cancelAllOrders() : annule un ordre ou tous les ordres en attente.
 *   - updateOrder() : met à jour la quantité ou les seuils de prix d'un ordre en attente.
 *   - simulateOrder() : calcule les frais et taxes avant validation de l'ordre.
 *   - getHistory() : consulte l'historique des transactions passées.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TradingService } from './trading.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Trading')
@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  @Get('portfolio')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Portefeuille complet et valorisation du joueur' })
  async getPortfolio(@CurrentUser() user: User) {
    return this.tradingService.getPortfolio(user.id);
  }

  @Get('orders')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des ordres en attente du joueur' })
  async getOrders(@CurrentUser() user: User) {
    return this.tradingService.getOrders(user.id);
  }

  @Post('orders')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Passage d\'un ordre d\'achat ou de vente' })
  async placeOrder(@CurrentUser() user: User, @Body() dto: PlaceOrderDto) {
    return this.tradingService.placeOrder(user.id, dto);
  }

  @Put('orders/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modification d\'un ordre en attente' })
  async updateOrder(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.tradingService.updateOrder(user.id, id, dto);
  }

  @Post('orders/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modification d\'un ordre en attente (POST alternatif)' })
  async updateOrderPost(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.tradingService.updateOrder(user.id, id, dto);
  }

  @Delete('orders')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annulation de tous les ordres en attente ou d\'un ordre via query ?id=' })
  @ApiQuery({ name: 'id', required: false, description: 'Identifiant d\'ordre facultatif' })
  async cancelOrders(@CurrentUser() user: User, @Query('id') id?: string) {
    if (id && id.trim()) {
      return this.tradingService.cancelOrder(user.id, id.trim());
    }
    return this.tradingService.cancelAllOrders(user.id);
  }

  @Delete('orders/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Annulation d\'un ordre spécifique' })
  async cancelOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.tradingService.cancelOrder(user.id, id);
  }

  @Get('history')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des transactions financières' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tradingService.getHistory(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('simulate')
  @ApiOperation({ summary: 'Simulation de frais et capacité d\'achat/vente' })
  @ApiQuery({ name: 'codesico', required: true, example: 101 })
  @ApiQuery({ name: 'quantity', required: false, example: 1 })
  async simulate(
    @Req() req: any,
    @Query('codesico') codesico: number,
    @Query('quantity') quantity?: number,
  ) {
    const authHeader = req.headers['authorization'];
    const userId = await this.tradingService.resolveUserIdFromToken(authHeader);
    return this.tradingService.calculateSimulation(
      userId,
      Number(codesico),
      quantity ? Number(quantity) : 1,
    );
  }
}

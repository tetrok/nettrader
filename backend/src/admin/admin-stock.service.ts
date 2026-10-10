/**
 * NetTrader 2 — Service de Gestion du Catalogue des Actions
 *
 * Usage:
 *   Permet aux administrateurs d'ajouter, modifier, archiver, diviser (split) ou supprimer des valeurs boursières.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Stock } from '../entities/stock.entity';
import { Sector } from '../entities/sector.entity';
import { MarketEntity } from '../entities/market.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { Order } from '../entities/order.entity';
import { TradeHistory } from '../entities/trade-history.entity';
import { User } from '../entities/user.entity';
import { TradingService } from '../trading/trading.service';
import { YahooFinanceService } from './yahoo-finance.service';

@Injectable()
export class AdminStockService {
  private readonly logger = new Logger(AdminStockService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Sector)
    private readonly sectorRepository: Repository<Sector>,
    @InjectRepository(MarketEntity)
    private readonly marketRepository: Repository<MarketEntity>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(TradeHistory)
    private readonly tradeHistoryRepository: Repository<TradeHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tradingService: TradingService,
    private readonly yahooService: YahooFinanceService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Métadonnées pour les formulaires d'actions (secteurs et marchés).
   */
  async getStockMetadata() {
    const sectors = await this.sectorRepository.find({ order: { name: 'ASC' } });
    const markets = await this.marketRepository.find({ order: { name: 'ASC' } });

    return {
      sectors: sectors.map((s) => ({ id: Number(s.id), name: s.name })),
      markets: markets.map((m) => ({ id: Number(m.id), name: m.name })),
    };
  }

  /**
   * Catalogue des actions avec filtres d'administration.
   */
  async getAdminStocks(params: {
    page?: number;
    limit?: number;
    search?: string;
    sectorId?: number;
    marketId?: number;
    authBuy?: string;
    isTracked?: string;
    isArchived?: string;
    sort?: string;
    order?: string;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(200, Math.max(5, Number(params.limit || 25)));
    const search = params.search?.trim();
    const sectorId = Number(params.sectorId || 0);
    const marketId = Number(params.marketId || 0);
    const authBuy = params.authBuy;
    const isTracked = params.isTracked;
    const isArchived = params.isArchived !== undefined ? params.isArchived : '0';
    const sortField = params.sort || 'nom';
    const sortOrder = (params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC';

    const qb = this.stockRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.sector', 'sec')
      .leftJoinAndSelect('s.market', 'mkt');

    if (search) {
      if (!isNaN(Number(search))) {
        qb.andWhere('(s.nom LIKE :search OR s.yahooname LIKE :search OR s.codesico = :code)', {
          search: `%${search}%`,
          code: Number(search),
        });
      } else {
        qb.andWhere('(s.nom LIKE :search OR s.yahooname LIKE :search)', {
          search: `%${search}%`,
        });
      }
    }

    if (sectorId > 0) {
      qb.andWhere('s.idsecteur = :sectorId', { sectorId });
    }

    if (marketId > 0) {
      qb.andWhere('s.idmarket = :marketId', { marketId });
    }

    if (authBuy && authBuy !== 'all') {
      qb.andWhere('s.authachat = :authBuy', { authBuy });
    }

    if (isTracked && isTracked !== 'all') {
      qb.andWhere('s.down = :isTracked', { isTracked });
    }

    if (isArchived !== 'all' && isArchived !== '') {
      qb.andWhere('s.is_archived = :isArchived', { isArchived });
    }

    const sortMap: Record<string, string> = {
      nom: 's.name',
      yahooname: 's.ticker',
      valeur: 's.price',
      lasttime: 's.lastTime',
      last_attempt: 's.lastAttempt',
      fail_count: 's.failCount',
      codesico: 's.code',
    };
    const orderColumn = sortMap[sortField] || 's.name';
    qb.orderBy(orderColumn, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const items = rows.map((s) => ({
      codesico: Number(s.code),
      ticker: s.ticker,
      name: s.name,
      price: Number(s.price),
      authBuy: s.authBuy === '1',
      isTracked: s.down === '1',
      sectorId: Number(s.idsecteur),
      marketId: Number(s.idmarket),
      sectorName: s.sector?.name || 'Inconnu',
      marketName: s.market?.name || 'Inconnu',
      lastTime: Number(s.lastTime),
      lastAttempt: Number(s.lastAttempt),
      lastStatus: s.lastStatus,
      failCount: Number(s.failCount),
      isArchived: s.isArchived === '1',
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Création manuelle d'une action.
   */
  async createStock(payload: any) {
    const code = Number(payload.codesico);
    const ticker = String(payload.yahooname || '').trim();
    const name = String(payload.nom || '').trim();
    const price = Number(payload.valeur || 0);

    if (code <= 0) {
      throw new BadRequestException('Le code SICOVAM doit être supérieur à zéro.');
    }
    if (!ticker) {
      throw new BadRequestException('Le symbole/ticker boursier est obligatoire.');
    }
    if (!name) {
      throw new BadRequestException("Le nom de l'action est obligatoire.");
    }
    if (price < 0) {
      throw new BadRequestException('Le cours initial ne peut être négatif.');
    }

    const existingCode = await this.stockRepository.findOne({ where: { code } });
    if (existingCode) {
      throw new ConflictException(`Une action avec ce code (${code}) existe déjà.`);
    }

    const existingTicker = await this.stockRepository.findOne({ where: { ticker } });
    if (existingTicker) {
      throw new ConflictException(`Une action avec ce ticker (${ticker}) existe déjà.`);
    }

    const now = Math.floor(Date.now() / 1000);
    const authBuy = payload.authachat === '0' || payload.authachat === false ? '0' : '1';
    const down = payload.down === '0' || payload.down === false ? '0' : '1';

    await this.stockRepository.save({
      code,
      ticker,
      name,
      price,
      lastTime: now,
      lastTimeDown: now,
      lastAttempt: 0,
      lastStatus: 'pending',
      authBuy,
      down,
      idsecteur: Number(payload.idsecteur || 22),
      idmarket: Number(payload.idmarket || 1),
      isArchived: '0',
    });

    return { codesico: code };
  }

  /**
   * Mise à jour d'une action existante.
   */
  async updateStock(code: number, payload: any) {
    const stock = await this.stockRepository.findOne({ where: { code } });
    if (!stock) {
      throw new NotFoundException('Action introuvable.');
    }

    if (payload.yahooname && payload.yahooname.trim() !== stock.ticker) {
      const existing = await this.stockRepository.findOne({
        where: { ticker: payload.yahooname.trim() },
      });
      if (existing && existing.code !== code) {
        throw new ConflictException('Le ticker spécifié est déjà utilisé.');
      }
    }

    const updateData: Partial<Stock> = {};
    if (payload.nom !== undefined) updateData.name = String(payload.nom).trim();
    if (payload.yahooname !== undefined) updateData.ticker = String(payload.yahooname).trim();
    if (payload.valeur !== undefined) updateData.price = Number(payload.valeur);
    if (payload.authachat !== undefined) {
      updateData.authBuy = payload.authachat === '1' || payload.authachat === true ? '1' : '0';
    }
    if (payload.down !== undefined) {
      updateData.down = payload.down === '1' || payload.down === true ? '1' : '0';
    }
    if (payload.idsecteur !== undefined) updateData.idsecteur = Number(payload.idsecteur);
    if (payload.idmarket !== undefined) updateData.idmarket = Number(payload.idmarket);

    await this.stockRepository.update(code, updateData);
    return { codesico: code };
  }

  /**
   * Suppression d'une action.
   */
  async deleteStock(code: number) {
    const stock = await this.stockRepository.findOne({ where: { code } });
    if (!stock) {
      throw new NotFoundException('Action introuvable.');
    }

    // Vérifier si des joueurs possèdent encore cette action
    const posCount = await this.portfolioRepository.count({
      where: { stockCode: code },
    });
    if (posCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer l'action : ${posCount} joueur(s) possèdent des titres en portefeuille. Veuillez l'archiver d'abord.`,
      );
    }

    await this.orderRepository.delete({ stockCode: code });
    await this.tradeHistoryRepository.delete({ stockCode: code });
    await this.stockRepository.delete(code);

    return { success: true };
  }

  /**
   * Bascule d'autorisation d'achat (authachat: '1' <-> '0').
   */
  async toggleStockAuthBuy(code: number): Promise<{ codesico: number; authBuy: boolean }> {
    const stock = await this.stockRepository.findOne({ where: { code } });
    if (!stock) {
      throw new NotFoundException('Action introuvable.');
    }

    const newAuth = stock.authBuy === '1' ? '0' : '1';
    await this.stockRepository.update(code, { authBuy: newAuth });

    return {
      codesico: code,
      authBuy: newAuth === '1',
    };
  }

  /**
   * Opération sur titre : Split (multiplication) ou Reverse-Split (division).
   */
  async splitStock(payload: { codesico: number; type: 'multiplier' | 'diviser'; factor: number }) {
    const { codesico, type, factor } = payload;
    if (factor <= 0) {
      throw new BadRequestException('Le facteur doit être strictement positif.');
    }

    const stock = await this.stockRepository.findOne({ where: { code: codesico } });
    if (!stock) {
      throw new NotFoundException('Action introuvable.');
    }

    const now = Math.floor(Date.now() / 1000);
    const isMultiply = type === 'multiplier';

    await this.dataSource.transaction(async (manager) => {
      // 1. Mise à jour des portefeuilles et enregistrement dans historique
      const positions = await manager.find(Portfolio, {
        where: { stockCode: codesico },
      });

      for (const pos of positions) {
        if (pos.quantity === 0) continue;
        const quant = Number(pos.quantity);
        const buyPrice = Number(pos.buyPrice);

        const newQuant = isMultiply ? Math.round(quant * factor) : Math.round(quant / factor);
        const newBuyPrice = isMultiply ? buyPrice / factor : buyPrice * factor;
        const deltaShares = Math.abs(newQuant - quant);

        // Historique
        const sens = quant > 0 ? (isMultiply ? 'Achat' : 'Vente') : isMultiply ? 'Vente' : 'Achat';
        await manager.save(TradeHistory, {
          timestamp: now,
          stockCode: codesico,
          userId: pos.userId,
          direction: sens,
          quantity: deltaShares,
          unitPrice: 0,
          fee: 0,
          profit: 0,
        });

        // Mise à jour portefeuille
        await manager.update(
          Portfolio,
          { userId: pos.userId, stockCode: codesico },
          { quantity: newQuant, buyPrice: newBuyPrice },
        );
      }

      // 2. Mise à jour du cours de l'action
      const currentPrice = Number(stock.price);
      const newPrice = isMultiply
        ? Math.round((currentPrice / factor) * 10000) / 10000
        : Math.round(currentPrice * factor * 10000) / 10000;

      await manager.update(Stock, codesico, { price: newPrice });
    });

    const updated = await this.stockRepository.findOne({ where: { code: codesico } });
    return {
      success: true,
      newPrice: updated ? Number(updated.price) : 0,
    };
  }

  /**
   * Archivage d'une action et liquidation au dernier cours des positions ouvertes.
   */
  async archiveStock(code: number) {
    const stock = await this.stockRepository.findOne({ where: { code } });
    if (!stock) {
      throw new NotFoundException('Action introuvable.');
    }

    const price = Number(stock.price);
    const now = Math.floor(Date.now() / 1000);
    let positionsClosed = 0;
    let totalCashCredited = 0;

    await this.dataSource.transaction(async (manager) => {
      // 1. Annulation de tous les ordres en attente
      await manager.delete(Order, { stockCode: code });

      // 2. Liquidation des positions en portefeuille
      const positions = await manager.find(Portfolio, { where: { stockCode: code } });

      for (const pos of positions) {
        const quant = Number(pos.quantity);
        const buyPrice = Number(pos.buyPrice);
        if (quant === 0) continue;

        if (quant > 0) {
          // Long : vente
          const gross = quant * price;
          const tax = this.tradingService.calculateTax(price, quant);
          const net = Math.max(0, gross - tax);
          const totalTaxes = tax + this.tradingService.calculateTax(buyPrice, quant);
          const profit = (price - buyPrice) * quant - totalTaxes;

          await manager.query(
            'UPDATE compte SET cashback = ROUND(cashback + ?, 2) WHERE idcompte = ?',
            [net, pos.userId],
          );

          await manager.save(TradeHistory, {
            timestamp: now,
            stockCode: code,
            userId: pos.userId,
            direction: 'Vente',
            quantity: quant,
            unitPrice: price,
            fee: -tax,
            profit: Math.round(profit * 100) / 100,
          });

          positionsClosed++;
          totalCashCredited += net;
        } else {
          // Short (VAD) : rachat forcé
          const absQuant = Math.abs(quant);
          const cost = absQuant * price;
          const tax = this.tradingService.calculateTax(price, absQuant);
          const netDebit = cost + tax;
          const totalTaxes = tax + this.tradingService.calculateTax(buyPrice, absQuant);
          const profit = (buyPrice - price) * absQuant - totalTaxes;

          await manager.query(
            'UPDATE compte SET cashback = ROUND(cashback - ?, 2) WHERE idcompte = ?',
            [netDebit, pos.userId],
          );

          await manager.save(TradeHistory, {
            timestamp: now,
            stockCode: code,
            userId: pos.userId,
            direction: 'Achat',
            quantity: absQuant,
            unitPrice: price,
            fee: -tax,
            profit: Math.round(profit * 100) / 100,
          });

          positionsClosed++;
        }

        await manager.delete(Portfolio, { userId: pos.userId, stockCode: code });
      }

      // 3. Marquage archivé
      await manager.update(Stock, code, {
        isArchived: '1',
        authBuy: '0',
        down: '0',
      });
    });

    return {
      success: true,
      codesico: code,
      ticker: stock.ticker,
      name: stock.name,
      settlementPrice: price,
      positionsClosed,
      totalCashCredited: Math.round(totalCashCredited * 100) / 100,
    };
  }

  /**
   * Désarchivage d'une action.
   */
  async unarchiveStock(code: number) {
    const stock = await this.stockRepository.findOne({ where: { code } });
    if (!stock) {
      throw new NotFoundException('Action introuvable.');
    }

    await this.stockRepository.update(code, { isArchived: '0' });
    return { success: true, codesico: code };
  }

  /**
   * Archivage en masse.
   */
  async archiveBulkStocks(codes: number[]) {
    if (!Array.isArray(codes) || codes.length === 0) {
      throw new BadRequestException('Aucune action spécifiée pour archivage.');
    }

    let archivedCount = 0;
    let totalPositionsClosed = 0;
    const errors: string[] = [];

    for (const code of codes) {
      try {
        const res = await this.archiveStock(code);
        archivedCount++;
        totalPositionsClosed += res.positionsClosed;
      } catch (err) {
        errors.push(`Action ${code}: ${err.message}`);
      }
    }

    return {
      success: true,
      archivedCount,
      totalPositionsClosed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Suppression en masse d'actions après vérification du mot de passe admin.
   */
  async deleteBulkStocks(codes: number[], adminPassword: string, adminUser: User) {
    if (!adminPassword) {
      throw new BadRequestException('Le mot de passe administrateur est requis.');
    }
    if (!Array.isArray(codes) || codes.length === 0) {
      throw new BadRequestException('Aucune action sélectionnée pour suppression.');
    }

    const isMatch = await bcrypt.compare(adminPassword, adminUser.passe);
    if (!isMatch) {
      throw new ForbiddenException('Mot de passe administrateur incorrect. Suppression annulée.');
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const code of codes) {
      try {
        await this.deleteStock(code);
        deletedCount++;
      } catch (err) {
        errors.push(`Action ${code}: ${err.message}`);
      }
    }

    return {
      success: deletedCount > 0,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Découverte Yahoo Finance Screener ou Recherche.
   */
  async discoverYahooMarket(params: { limit?: number; offset?: number; search?: string }) {
    const limit = Math.min(100, Math.max(1, Number(params.limit || 25)));
    const offset = Math.max(0, Number(params.offset || 0));
    const search = (params.search || '').trim();

    const screen = await this.yahooService.screenParisEquities(limit, offset, search);
    const symbols = screen.items.map((it) => it.symbol);

    let existingStocks: Stock[] = [];
    if (symbols.length > 0) {
      existingStocks = await this.stockRepository.find({
        where: { ticker: In(symbols) },
      });
    }

    const stockMap = new Map<string, Stock>();
    for (const s of existingStocks) {
      stockMap.set(s.ticker, s);
    }

    const items = screen.items.map((it) => {
      const existing = stockMap.get(it.symbol);
      return {
        ...it,
        inDatabase: !!existing,
        codesico: existing ? Number(existing.code) : null,
        isTracked: existing ? existing.down === '1' : false,
        isAuthBuy: existing ? existing.authBuy === '1' : false,
        currentDbPrice: existing ? Number(existing.price) : null,
      };
    });

    return {
      total: screen.total,
      limit,
      offset,
      items,
    };
  }

  /**
   * Importation d'actions depuis Yahoo Finance.
   */
  async importYahooStocks(items: Array<{
    symbol?: string;
    yahooname?: string;
    name?: string;
    nom?: string;
    price?: number;
    valeur?: number;
    idsecteur?: number;
    idmarket?: number;
  }>) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException("Aucune action spécifiée pour l'import.");
    }

    let created = 0;
    let updated = 0;
    const skipped: string[] = [];

    // Déterminer le prochain codesico disponible
    const maxCodeRaw = await this.stockRepository
      .createQueryBuilder('s')
      .select('MAX(s.code)', 'maxCode')
      .getRawOne();
    let nextCode = Math.max(900000, Number(maxCodeRaw?.maxCode || 0) + 1);

    for (const item of items) {
      const ticker = String(item.yahooname || item.symbol || '').trim();
      if (!ticker) continue;

      let name = String(item.nom || item.name || '').trim();
      let price = Number(item.valeur || item.price || 0);

      // Si le nom ou le cours manquent, interroger Yahoo pour les métadonnées fraîches
      if (!name || price <= 0) {
        const quote = await this.yahooService.getQuote(ticker);
        if (quote) {
          if (!name) name = quote.name;
          if (price <= 0) price = quote.price;
        }
      }

      if (price <= 0) {
        skipped.push(ticker);
        continue;
      }

      const existing = await this.stockRepository.findOne({ where: { ticker } });
      const now = Math.floor(Date.now() / 1000);

      if (existing) {
        await this.stockRepository.update(existing.code, {
          price,
          authBuy: '1',
          down: '1',
          name: name || existing.name,
          lastTime: now,
          lastAttempt: now,
          lastStatus: 'success',
          failCount: 0,
        });
        updated++;
      } else {
        await this.stockRepository.save({
          code: nextCode,
          ticker,
          name: name || ticker,
          price,
          authBuy: '1',
          down: '1',
          idsecteur: Number(item.idsecteur || 22),
          idmarket: Number(item.idmarket || 1),
          isArchived: '0',
          lastTime: now,
          lastTimeDown: now,
          lastAttempt: now,
          lastStatus: 'success',
          failCount: 0,
          totalFails: 0,
          retryCount: 0,
        });
        nextCode++;
        created++;
      }
    }

    if (created === 0 && updated === 0) {
      throw new BadRequestException(
        `Aucune action importée. Symboles sans cotation ignorés : ${skipped.join(', ') || 'aucun'}`,
      );
    }

    return {
      success: true,
      created,
      updated,
      total: created + updated,
      skipped,
    };
  }
}

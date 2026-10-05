import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockMaj } from '../entities/stock-maj.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { MarketSyncLog } from '../entities/market-sync-log.entity';
import { YahooFinanceService } from './yahoo-finance.service';

@Injectable()
export class MarketSyncService {
  private readonly logger = new Logger(MarketSyncService.name);

  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockMaj)
    private readonly stockMajRepository: Repository<StockMaj>,
    @InjectRepository(StockHistory)
    private readonly stockHistoryRepository: Repository<StockHistory>,
    @InjectRepository(MarketSyncLog)
    private readonly syncLogRepository: Repository<MarketSyncLog>,
    private readonly yahooService: YahooFinanceService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Vue d'ensemble du suivi des cotations.
   */
  async getOverview() {
    const totalStocks = await this.stockRepository.count();
    const totalTracked = await this.stockRepository.count({ where: { down: '1' } });
    const totalDisabled = await this.stockRepository.count({ where: { down: '0' } });
    const totalSuccess = await this.stockRepository.count({
      where: { down: '1', lastStatus: 'success' },
    });
    const totalFailed = await this.stockRepository.count({
      where: { down: '1', lastStatus: 'failed' },
    });
    const totalPending = await this.stockRepository.count({
      where: { down: '1', lastStatus: 'pending' },
    });

    const withRetriesRaw = await this.stockRepository
      .createQueryBuilder('s')
      .where("s.down = '1' AND s.retry_count > 0")
      .getCount();

    const sumFailsRaw = await this.stockRepository
      .createQueryBuilder('s')
      .select('COALESCE(SUM(s.total_fails), 0)', 'total')
      .getRawOne();
    const totalFailuresAllTime = Number(sumFailsRaw?.total || 0);

    const lastLog = await this.syncLogRepository.findOne({
      where: {},
      order: { syncTime: 'DESC' },
    });

    const recentLogsEntities = await this.syncLogRepository.find({
      order: { syncTime: 'DESC' },
      take: 15,
    });

    const recentLogs = recentLogsEntities.map((l) => ({
      id: Number(l.id),
      syncTime: Number(l.syncTime),
      totalStocks: Number(l.totalStocks),
      successCount: Number(l.successCount),
      errorCount: Number(l.errorCount),
      durationSeconds: Number(l.durationSeconds),
      details: l.details || '',
    }));

    const completedCount = totalSuccess + totalFailed;
    let successRate = 0;
    if (completedCount > 0) {
      successRate = Math.round((totalSuccess / completedCount) * 1000) / 10;
    } else if (lastLog && Number(lastLog.totalStocks) > 0) {
      successRate = Math.round((Number(lastLog.successCount) / Number(lastLog.totalStocks)) * 1000) / 10;
    } else if (totalTracked > 0) {
      successRate = Math.round((totalSuccess / totalTracked) * 1000) / 10;
    }

    return {
      overview: {
        totalStocks,
        totalTracked,
        totalDisabled,
        totalSuccess,
        totalFailed,
        totalPending,
        totalWithRetries: withRetriesRaw,
        totalFailuresAllTime,
        successRate,
        lastSyncTime: lastLog ? Number(lastLog.syncTime) : null,
        lastSyncDuration: lastLog ? Number(lastLog.durationSeconds) : null,
        lastSyncSuccess: lastLog ? Number(lastLog.successCount) : null,
        lastSyncError: lastLog ? Number(lastLog.errorCount) : null,
      },
      recentLogs,
    };
  }

  /**
   * Liste paginée des valeurs pour le monitoring des cotations.
   */
  async getStocks(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
    order?: string;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(200, Math.max(5, Number(params.limit || 25)));
    const search = params.search?.trim();
    const status = params.status || 'all';
    const sortField = params.sort || 'last_attempt';
    const sortOrder = (params.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

    const qb = this.stockRepository.createQueryBuilder('s');

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

    if (status === 'success') {
      qb.andWhere("s.down = '1' AND s.last_status = 'success'");
    } else if (status === 'failed') {
      qb.andWhere("s.down = '1' AND s.last_status = 'failed'");
    } else if (status === 'pending') {
      qb.andWhere("s.down = '1' AND s.last_status = 'pending'");
    } else if (status === 'disabled') {
      qb.andWhere("s.down = '0'");
    } else if (status === 'retried') {
      qb.andWhere("s.down = '1' AND s.retry_count > 0");
    }

    // Mappage du tri sécurisé
    const sortMap: Record<string, string> = {
      nom: 's.nom',
      yahooname: 's.yahooname',
      valeur: 's.valeur',
      lasttime: 's.lasttime',
      last_attempt: 's.last_attempt',
      fail_count: 's.fail_count',
      total_fails: 's.total_fails',
      retry_count: 's.retry_count',
      last_status: 's.last_status',
    };
    const orderColumn = sortMap[sortField] || 's.last_attempt';
    qb.orderBy(orderColumn, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    const items = rows.map((s) => ({
      codesico: Number(s.code),
      ticker: s.ticker,
      name: s.name,
      price: Number(s.price),
      lastTime: Number(s.lastTime),
      lastAttempt: Number(s.lastAttempt),
      lastStatus: s.lastStatus,
      failCount: Number(s.failCount),
      totalFails: Number(s.totalFails),
      retryCount: Number(s.retryCount),
      lastError: s.lastError || null,
      isTracked: s.down === '1',
      authAchat: s.authBuy === '1',
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
   * Bascule l'état de suivi d'une valeur (down: '1' <-> '0').
   */
  async toggleTracking(codesico: number): Promise<{ codesico: number; isTracked: boolean }> {
    const stock = await this.stockRepository.findOne({ where: { code: codesico } });
    if (!stock) {
      throw new NotFoundException('Valeur introuvable.');
    }

    const newDown = stock.down === '1' ? '0' : '1';
    await this.stockRepository.update(codesico, { down: newDown });

    return {
      codesico,
      isTracked: newDown === '1',
    };
  }

  /**
   * Réinitialise les compteurs d'échecs pour une valeur donnée.
   */
  async resetStockErrors(codesico: number): Promise<{ codesico: number }> {
    const stock = await this.stockRepository.findOne({ where: { code: codesico } });
    if (!stock) {
      throw new NotFoundException('Valeur introuvable.');
    }

    await this.stockRepository.update(codesico, {
      failCount: 0,
      totalFails: 0,
      retryCount: 0,
      lastError: null as any,
      lastStatus: 'pending',
    });

    return { codesico };
  }

  /**
   * Réinitialise les compteurs d'échecs pour l'ensemble des valeurs.
   */
  async resetAllStockErrors(): Promise<void> {
    await this.stockRepository
      .createQueryBuilder()
      .update(Stock)
      .set({
        failCount: 0,
        totalFails: 0,
        retryCount: 0,
        lastError: null as any,
        lastStatus: 'pending',
      })
      .execute();
  }

  /**
   * Synchronise les cotations Yahoo Finance pour un titre ou l'ensemble des titres suivis.
   */
  async syncQuotes(targetCode?: number): Promise<{
    totalStocks: number;
    successCount: number;
    errorCount: number;
    durationSeconds: number;
  }> {
    const startTime = Date.now();
    const nowSec = Math.floor(startTime / 1000);

    const qb = this.stockRepository.createQueryBuilder('s');
    qb.where("s.is_archived = '0'");
    if (targetCode) {
      qb.andWhere('s.codesico = :code', { code: targetCode });
    } else {
      qb.andWhere("s.down = '1'");
    }

    const stocks = await qb.getMany();
    if (stocks.length === 0) {
      return { totalStocks: 0, successCount: 0, errorCount: 0, durationSeconds: 0 };
    }

    const tickers = stocks.map((s) => s.ticker).filter(Boolean);
    const quotes = await this.yahooService.getQuotes(tickers);

    let successCount = 0;
    let errorCount = 0;
    const errorDetails: string[] = [];

    for (const stock of stocks) {
      const quote = quotes[stock.ticker];
      if (quote && quote.price > 0) {
        // Enregistrement ancien cours dans cacvalmaj si différent
        const oldPrice = Number(stock.price);
        if (oldPrice > 0 && Math.abs(oldPrice - quote.price) > 0.0001) {
          const existingMaj = await this.stockMajRepository.findOne({ where: { code: stock.code } });
          if (existingMaj) {
            await this.stockMajRepository.update(stock.code, {
              price: oldPrice,
              lastTime: Number(stock.lastTime),
            });
          } else {
            await this.stockMajRepository.save({
              code: stock.code,
              ticker: stock.ticker,
              name: stock.name,
              price: oldPrice,
              lastTime: Number(stock.lastTime),
              lastTimeDown: Number(stock.lastTimeDown || 0),
              authBuy: stock.authBuy,
              down: stock.down,
              idsecteur: stock.idsecteur || 0,
            });
          }
        }

        // Mise à jour cacval
        await this.stockRepository.update(stock.code, {
          price: quote.price,
          lastTime: quote.time || nowSec,
          lastAttempt: nowSec,
          lastStatus: 'success',
          failCount: 0,
          retryCount: quote.retried ? (stock.retryCount || 0) + 1 : stock.retryCount,
          lastError: null as any,
        });

        // Historique de cours
        await this.stockHistoryRepository.save({
          code: stock.code,
          time: nowSec,
          price: quote.price,
        });

        successCount++;
      } else {
        errorCount++;
        const newFailCount = Number(stock.failCount || 0) + 1;
        const newTotalFails = Number(stock.totalFails || 0) + 1;
        const lastErr = `Cotation introuvable sur Yahoo Finance pour ${stock.ticker}`;
        errorDetails.push(`${stock.ticker}: ${lastErr}`);

        await this.stockRepository.update(stock.code, {
          lastAttempt: nowSec,
          lastStatus: 'failed',
          failCount: newFailCount,
          totalFails: newTotalFails,
          lastError: lastErr,
        });
      }
    }

    const durationSeconds = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;

    // Enregistrement dans les logs si synchronisation globale
    if (!targetCode) {
      await this.syncLogRepository.save({
        syncTime: nowSec,
        totalStocks: stocks.length,
        successCount,
        errorCount,
        durationSeconds,
        details: errorDetails.slice(0, 10).join('; ') || 'Synchronisation réussie',
      });
    }

    return {
      totalStocks: stocks.length,
      successCount,
      errorCount,
      durationSeconds,
    };
  }
}

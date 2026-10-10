/**
 * NetTrader 2 — Service des Données de Marché & Cotations
 *
 * Usage:
 *   Récupère les cotations boursières, agrège les statistiques de variations et filtre les séries temporelles d'historique.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockHistory } from '../entities/stock-history.entity';
import { Message } from '../entities/message.entity';

export type ChartPeriod = '1d' | '1w' | '1m' | '1y';

export interface FormattedStock {
  code: number;
  ticker: string;
  name: string;
  price: number;
  prevPrice: number;
  variation: number;
  authBuy: boolean;
  lastTime: number;
}

@Injectable()
export class MarketService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(StockHistory)
    private readonly stockHistoryRepository: Repository<StockHistory>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Vérifie si le marché boursier est actuellement ouvert.
   */
  isMarketOpen(timestamp?: number): boolean {
    if (process.env.IGNORE_MARKET_HOURS === '1') {
      return true;
    }

    const now = timestamp ? new Date(timestamp * 1000) : new Date();
    // En heure de Paris
    const parisHoursStr = now.toLocaleTimeString('fr-FR', {
      timeZone: 'Europe/Paris',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const [hourStr, minStr] = parisHoursStr.split(':');
    const decimalHour = parseInt(hourStr, 10) + parseInt(minStr, 10) / 60;

    // Jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
    const dayOfWeek = now.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isHours = decimalHour >= 9.25 && decimalHour <= 17.917;

    return isWeekday && isHours;
  }

  /**
   * Récupère la liste des actions avec variation par rapport à la veille.
   */
  async getStocksWithVariation(search?: string, trackedOnly = false): Promise<FormattedStock[]> {
    let sql = `
      SELECT c.codesico AS code, c.yahooname AS ticker, c.nom AS name,
             c.valeur AS price, c.authachat AS authBuy, c.lasttime AS lastTime,
             COALESCE(m.valeur, c.valeur) AS prevPrice
      FROM cacval c
      LEFT JOIN cacvalmaj m ON (c.codesico = m.codesico)
      WHERE c.is_archived = '0'
    `;
    const params: any[] = [];

    if (trackedOnly) {
      sql += ` AND (c.down = '1' OR c.valeur > 0)`;
    }

    if (search && search.trim()) {
      const q = search.trim();
      if (!isNaN(Number(q))) {
        sql += ` AND (c.nom LIKE ? OR c.yahooname LIKE ? OR c.codesico = ?)`;
        params.push(`%${q}%`, `%${q}%`, Number(q));
      } else {
        sql += ` AND (c.nom LIKE ? OR c.yahooname LIKE ?)`;
        params.push(`%${q}%`, `%${q}%`);
      }
    }

    sql += ` ORDER BY c.nom ASC`;

    const rawRows = await this.dataSource.query(sql, params);

    return rawRows.map((r: any) => {
      const price = Number(r.price) || 0.0;
      const prevPrice = Number(r.prevPrice) || price;
      const variation =
        prevPrice > 0 ? Number((((price - prevPrice) / prevPrice) * 100).toFixed(2)) : 0.0;

      return {
        code: Number(r.code),
        ticker: String(r.ticker || ''),
        name: String(r.name || ''),
        price: Number(price.toFixed(2)),
        prevPrice: Number(prevPrice.toFixed(2)),
        variation,
        authBuy: r.authBuy === '1',
        lastTime: Number(r.lastTime) || 0,
      };
    });
  }

  /**
   * Résumé complet du marché (indices, statut, top hausses, top baisses, actualités).
   */
  async getSummary() {
    const now = Math.floor(Date.now() / 1000);
    const isMarketOpen = this.isMarketOpen(now);

    const allStocks = await this.getStocksWithVariation(undefined, true);
    const totalStocks = allStocks.length;

    // Palmarès des hausses
    const gainers = [...allStocks]
      .filter((s) => s.variation > 0)
      .sort((a, b) => b.variation - a.variation)
      .slice(0, 5);

    // Palmarès des baisses
    const losers = [...allStocks]
      .filter((s) => s.variation < 0)
      .sort((a, b) => a.variation - b.variation)
      .slice(0, 5);

    // Dernières annonces / actualités du jeu
    const rawNews = await this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .where('m.recipientId = :recipientId', { recipientId: 0 })
      .orderBy('m.date', 'DESC')
      .take(5)
      .getMany();

    const recentNews = rawNews.map((n) => ({
      id: Number(n.id),
      author: n.sender?.pseudo || 'Admin',
      date: Number(n.date),
      title: n.title,
      content: n.content,
    }));

    return {
      isMarketOpen,
      marketTime: now,
      currentTime: now,
      totalStocks,
      topGainers: gainers,
      topLosers: losers,
      recentNews,
    };
  }

  /**
   * Fiche détaillée d'une action avec historique pour les graphiques.
   */
  async getStock(code: number, period: ChartPeriod = '1m') {
    const stocks = await this.getStocksWithVariation(String(code));
    const stock = stocks.find((s) => s.code === code);

    if (!stock) {
      throw new NotFoundException('Action introuvable');
    }

    const history = await this.getStockHistory(code, period);

    return {
      ...stock,
      period,
      history,
    };
  }

  /**
   * Récupère et échantillonne l'historique d'une valeur pour une période donnée.
   */
  async getStockHistory(
    code: number,
    period: ChartPeriod = '1m',
    maxPoints = 80,
  ): Promise<Array<{ time: number; price: number }>> {
    const now = Math.floor(Date.now() / 1000);
    let startTime = now - 30 * 86400; // 1m défaut

    switch (period) {
      case '1d':
        startTime = now - 86400;
        break;
      case '1w':
        startTime = now - 7 * 86400;
        break;
      case '1y':
        startTime = now - 365 * 86400;
        break;
      case '1m':
      default:
        startTime = now - 30 * 86400;
        break;
    }

    const rows = await this.stockHistoryRepository
      .createQueryBuilder('h')
      .select(['h.time', 'h.price'])
      .where('h.code = :code AND h.time >= :startTime', { code, startTime })
      .orderBy('h.time', 'ASC')
      .getMany();

    let points = rows.map((r) => ({
      time: Number(r.time),
      price: Number(Number(r.price).toFixed(2)),
    }));

    // Si aucun point dans stock_history, créer 2 points synthétiques
    if (points.length === 0) {
      const stock = await this.stockRepository.findOne({
        where: { code },
        relations: ['maj'],
      });
      if (stock) {
        const curPrice = Number(stock.price);
        const prevPrice = stock.maj ? Number(stock.maj.price) : curPrice;
        points = [
          { time: startTime, price: prevPrice > 0 ? prevPrice : curPrice },
          { time: now, price: curPrice },
        ];
      }
    }

    // Downsampling régulier si trop de points
    if (points.length > maxPoints && maxPoints > 2) {
      const sampled: Array<{ time: number; price: number }> = [];
      const total = points.length;
      const step = (total - 1) / (maxPoints - 1);

      for (let i = 0; i < maxPoints; i++) {
        const idx = Math.min(Math.round(i * step), total - 1);
        sampled.push(points[idx]);
      }
      sampled[0] = points[0];
      sampled[sampled.length - 1] = points[total - 1];
      return sampled;
    }

    return points;
  }
}

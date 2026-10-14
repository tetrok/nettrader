/**
 * NetTrader 2 — Service du Tableau de Bord d'Administration
 *
 * Usage:
 *   Calcule les indicateurs globaux du jeu (traders enregistrés, sessions actives, volume d'ordres, statut des cotations).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { Session } from '../entities/session.entity';
import { Stock } from '../entities/stock.entity';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tableau de bord administration avec métriques temps réel.
   */
  async getDashboard() {
    const now = Math.floor(Date.now() / 1000);

    const totalPlayers = await this.userRepository.count();
    const pendingOrders = await this.orderRepository.count({ where: { etat: '1' } });
    const activeSessions = await this.sessionRepository.count({
      where: { tempsLimite: MoreThan(now) },
    });
    const totalStocks = await this.stockRepository.count();

    let pendingTeamApprovals = 0;
    try {
      const res = await this.dataSource.query('SELECT COUNT(*) as c FROM verifgroupe');
      pendingTeamApprovals = Number(res?.[0]?.c || 0);
    } catch {
      pendingTeamApprovals = 0;
    }

    return {
      totalPlayers,
      pendingOrders,
      activeSessions,
      totalStocks,
      pendingTeamApprovals,
      nodeVersion: `${process.version} (Node.js / NestJS)`,
      backendVersion: `${process.version} (NestJS 10)`,
      phpVersion: `${process.version} (NestJS)`,
      serverTime: now,
    };
  }

  /**
   * Liste des joueurs pour modération.
   */
  async getPlayers(page?: any, limit?: any, search = '') {
    const pageNum = Math.max(1, Number(page) || 1);
    const take = Math.min(100, Math.max(5, Number(limit) || 25));
    const skip = (pageNum - 1) * take;

    const qb = this.userRepository.createQueryBuilder('u');

    if (search.trim()) {
      qb.where('(u.pseudonyme LIKE :search OR u.email LIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    qb.orderBy('u.idcompte', 'DESC');
    qb.skip(skip).take(take);

    const [rows, total] = await qb.getManyAndCount();

    const items = rows.map((u) => ({
      id: Number(u.id),
      pseudo: u.pseudo,
      email: u.email,
      cashback: Number(u.cashback),
      registeredAt: Number(u.dateinscr),
      lastActive: Number(u.dateactivite),
      level: Number(u.idniveau),
      authLevel: Number(u.authlevel),
    }));

    return {
      items,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }
}

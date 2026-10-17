/**
 * NetTrader 2 — Service du Tableau de Bord d'Administration
 *
 * Usage:
 *   Calcule les indicateurs globaux du jeu (traders enregistrés, sessions actives, volume d'ordres, statut des cotations).
 */

import { Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * Liste des demandes de création/modification d'équipes en attente de validation.
   */
  async getPendingTeams() {
    try {
      const rows = await this.dataSource.query(`
        SELECT vg.*, c.pseudonyme, c.email
        FROM verifgroupe vg
        JOIN compte c ON vg.idcompte = c.idcompte
        ORDER BY vg.idverifgroupe ASC
      `);
      return rows.map((r: any) => ({
        id: Number(r.idverifgroupe),
        teamId: Number(r.idgroupe || 0),
        isModification: Number(r.idgroupe || 0) > 0,
        userId: Number(r.idcompte),
        pseudo: String(r.pseudonyme || ''),
        email: String(r.email || ''),
        name: String(r.titregroupe || ''),
        tag: String(r.initialgroupe || ''),
        website: String(r.urlsite || ''),
        description: String(r.descriptiongroupe || ''),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Valider ou rejeter une demande d'équipe.
   */
  async reviewPendingTeam(id: number, action: string, comment = '') {
    const rows = await this.dataSource.query(
      `SELECT * FROM verifgroupe WHERE idverifgroupe = ?`,
      [id],
    );
    if (!rows || rows.length === 0) {
      throw new NotFoundException("Demande d'équipe introuvable.");
    }
    const groupe = rows[0];
    const isApprove = action === 'approve';

    if (isApprove) {
      const now = Math.floor(Date.now() / 1000);
      if (Number(groupe.idgroupe) === 0) {
        // Nouvelle équipe
        const insertRes = await this.dataSource.query(
          `INSERT INTO \`groupe\` (\`idcompte\`, \`titregroupe\`, \`initialgroupe\`, \`urlsite\`, \`etat\`, \`descriptiongroupe\`, \`medor\`, \`medargent\`, \`medbronze\`, \`datecreation\`, \`idforum\`)
           VALUES (?, ?, ?, ?, 'actif', ?, 0, 0, 0, ?, 0)`,
          [
            groupe.idcompte,
            groupe.titregroupe,
            groupe.initialgroupe,
            groupe.urlsite || '',
            groupe.descriptiongroupe || '',
            now,
          ],
        );
        const newGroupId = insertRes.insertId;
        await this.dataSource.query(
          `INSERT INTO \`membregroupe\` (\`idcompte\`, \`idgroupe\`, \`datejoint\`, \`capitalinscr\`)
           VALUES (?, ?, ?, 10000)`,
          [groupe.idcompte, newGroupId, now],
        );
      } else {
        // Modification
        await this.dataSource.query(
          `UPDATE \`groupe\` SET \`idcompte\` = ?, \`titregroupe\` = ?, \`initialgroupe\` = ?, \`urlsite\` = ?, \`descriptiongroupe\` = ?
           WHERE \`idgroupe\` = ?`,
          [
            groupe.idcompte,
            groupe.titregroupe,
            groupe.initialgroupe,
            groupe.urlsite || '',
            groupe.descriptiongroupe || '',
            groupe.idgroupe,
          ],
        );
      }
    }

    await this.dataSource.query(
      `DELETE FROM \`verifgroupe\` WHERE \`idverifgroupe\` = ?`,
      [id],
    );

    return {
      success: true,
      message: isApprove
        ? "La demande d'équipe a été approuvée."
        : "La demande d'équipe a été rejetée.",
    };
  }
}

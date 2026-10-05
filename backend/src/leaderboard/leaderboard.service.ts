import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { Portfolio } from '../entities/portfolio.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepository: Repository<GroupMember>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Classement des joueurs avec valorisation en temps réel.
   */
  async getPlayers(page = 1, limit = 30, search = '', period = '') {
    const take = Math.min(100, Math.max(5, limit));
    const skip = (Math.max(1, page) - 1) * take;

    // Requête SQL optimisée avec calcul direct du portefeuille et jointure d'équipe
    let sql = `
      SELECT c.idcompte AS userId, c.pseudonyme AS pseudo, c.cashback,
             COALESCE(port.totalVal, 0) AS portValue,
             g.titregroupe AS teamName, g.idgroupe AS teamId
      FROM compte c
      LEFT JOIN (
        SELECT p.idcompte, SUM(p.quant * val.valeur) AS totalVal
        FROM portef p
        JOIN cacval val ON p.codesico = val.codesico
        GROUP BY p.idcompte
      ) port ON c.idcompte = port.idcompte
      LEFT JOIN membregroupe mg ON c.idcompte = mg.idcompte
      LEFT JOIN groupe g ON mg.idgroupe = g.idgroupe
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      sql += ` AND c.pseudonyme LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    sql += ` ORDER BY (c.cashback + COALESCE(port.totalVal, 0)) DESC`;

    const allPlayers = await this.dataSource.query(sql, params);
    const total = allPlayers.length;

    const items = allPlayers.slice(skip, skip + take).map((r: any, idx: number) => {
      const capital = Number((Number(r.cashback) + Number(r.portValue)).toFixed(2));
      const performance = Number((((capital - 10000.0) / 10000.0) * 100).toFixed(2));

      return {
        rank: skip + idx + 1,
        userId: Number(r.userId),
        pseudo: String(r.pseudo),
        capital,
        performance,
        teamName: r.teamName ? String(r.teamName) : null,
        teamId: r.teamId ? Number(r.teamId) : null,
      };
    });

    const now = new Date();
    const currentPeriod = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    return {
      items,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
      availablePeriods: { [currentPeriod]: 'Mois en cours' },
      currentPeriod,
    };
  }

  /**
   * Classement des équipes.
   */
  async getTeams(page = 1, limit = 30, search = '', period = '') {
    const take = Math.min(100, Math.max(5, limit));
    const skip = (Math.max(1, page) - 1) * take;

    let sql = `
      SELECT g.idgroupe AS teamId, g.titregroupe AS name, g.initialgroupe AS tag,
             g.medor AS gold, g.medargent AS silver, g.medbronze AS bronze,
             COUNT(mg.idcompte) AS membersCount,
             COALESCE(AVG(((c.cashback + COALESCE(port.totalVal, 0) - 10000.0) / 10000.0) * 100), 0) AS performance
      FROM groupe g
      LEFT JOIN membregroupe mg ON g.idgroupe = mg.idgroupe
      LEFT JOIN compte c ON mg.idcompte = c.idcompte
      LEFT JOIN (
        SELECT p.idcompte, SUM(p.quant * val.valeur) AS totalVal
        FROM portef p
        JOIN cacval val ON p.codesico = val.codesico
        GROUP BY p.idcompte
      ) port ON c.idcompte = port.idcompte
      WHERE g.etat = 'actif'
    `;
    const params: any[] = [];

    if (search && search.trim()) {
      sql += ` AND (g.titregroupe LIKE ? OR g.initialgroupe LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ` GROUP BY g.idgroupe ORDER BY performance DESC`;

    const allTeams = await this.dataSource.query(sql, params);
    const total = allTeams.length;

    const items = allTeams.slice(skip, skip + take).map((r: any, idx: number) => ({
      rank: skip + idx + 1,
      teamId: Number(r.teamId),
      name: String(r.name),
      tag: String(r.tag),
      performance: Number(Number(r.performance).toFixed(2)),
      membersCount: Number(r.membersCount) || 0,
      medals: {
        gold: Number(r.gold) || 0,
        silver: Number(r.silver) || 0,
        bronze: Number(r.bronze) || 0,
      },
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

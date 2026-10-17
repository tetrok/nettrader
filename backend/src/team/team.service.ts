/**
 * NetTrader 2 — Service de Gestion des Équipes de Joueurs
 *
 * Usage:
 *   Gère les règles d'adhésion, les invitations, les candidatures, la composition
 *   des équipes et les soumissions à la modération administrative (verifgroupe).
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { User } from '../entities/user.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Récupère le capital total d'un joueur (cashback + valorisation portefeuille).
   */
  async getPlayerTotalCapital(userId: number): Promise<{ capital: number; performance: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return { capital: 10000.0, performance: 0.0 };

    const positions = await this.dataSource.getRepository(Portfolio).find({
      where: { userId },
      relations: ['stock'],
    });

    let portValue = 0.0;
    for (const pos of positions) {
      const price = pos.stock ? Number(pos.stock.price) : 0.0;
      portValue += Number(pos.quantity) * price;
    }

    const capital = Number((Number(user.cashback) + portValue).toFixed(2));
    const performance = Number((((capital - 10000.0) / 10000.0) * 100).toFixed(2));
    return { capital, performance };
  }

  /**
   * Détails et composition d'une équipe.
   */
  async getTeam(id: number) {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['leader'],
    });

    if (!group) {
      throw new NotFoundException('Équipe introuvable');
    }

    const rawMembers = await this.memberRepository.find({
      where: { groupId: id },
      relations: ['user'],
    });

    const members: any[] = [];
    for (const m of rawMembers) {
      const u = m.user;
      if (!u) continue;
      const { capital, performance } = await this.getPlayerTotalCapital(u.id);

      members.push({
        userId: Number(u.id),
        pseudo: u.pseudo,
        joinDate: new Date(Number(m.joinDate) * 1000).toLocaleDateString('fr-FR'),
        capitalJoin: Number(m.capitalJoin) || 10000.0,
        currentCapital: capital,
        performance,
        isLeader: u.id === group.leaderId,
      });
    }

    return {
      id: Number(group.id),
      name: group.name,
      tag: group.tag,
      description: group.description || '',
      website: group.website || '',
      forumId: group.forumId ? Number(group.forumId) : null,
      leader: {
        id: group.leader ? Number(group.leader.id) : 0,
        pseudo: group.leader ? group.leader.pseudo : 'Inconnu',
      },
      medals: {
        gold: Number(group.goldMedals) || 0,
        silver: Number(group.silverMedals) || 0,
        bronze: Number(group.bronzeMedals) || 0,
      },
      members,
    };
  }

  /**
   * Statut et équipe du joueur connecté (MyTeam).
   */
  async getMyTeam(userId: number) {
    const membership = await this.memberRepository.findOne({ where: { userId } });
    const ledGroup = await this.groupRepository.findOne({ where: { leaderId: userId } });
    const groupId = membership ? membership.groupId : ledGroup ? ledGroup.id : null;

    let team: any = null;
    let isLeader = false;

    if (groupId) {
      team = await this.getTeam(groupId);
      isLeader = team.leader.id === userId;

      if (isLeader) {
        const pendingInvites = await this.dataSource.query(
          `SELECT c.idcompte AS userId, c.pseudonyme AS pseudo
           FROM invitegroupe ig
           JOIN compte c ON ig.idcompte = c.idcompte
           WHERE ig.idgroupe = ?
           ORDER BY c.pseudonyme ASC`,
          [groupId],
        );
        team.pendingInvitesSent = (pendingInvites || []).map((r: any) => ({
          userId: Number(r.userId),
          pseudo: String(r.pseudo),
        }));
      } else {
        team.pendingInvitesSent = [];
      }
    }

    const verifRows = await this.dataSource.query(
      `SELECT * FROM verifgroupe WHERE idcompte = ? ORDER BY idverifgroupe DESC LIMIT 1`,
      [userId],
    );

    let pendingApproval: any = null;
    if (verifRows && verifRows.length > 0) {
      const v = verifRows[0];
      pendingApproval = {
        id: Number(v.idverifgroupe),
        name: String(v.titregroupe),
        tag: String(v.initialgroupe),
        website: String(v.urlsite || ''),
        description: String(v.descriptiongroupe || ''),
        isModification: Number(v.idgroupe || 0) > 0,
      };
    }

    return {
      hasTeam: team !== null,
      isLeader,
      team,
      pendingApproval,
    };
  }

  /**
   * Liste des invitations reçues par le joueur.
   */
  async getMyInvitations(userId: number) {
    const rows = await this.dataSource.query(
      `SELECT g.idgroupe AS teamId, g.titregroupe AS name, g.initialgroupe AS tag,
              g.descriptiongroupe AS description, g.urlsite AS website,
              c.idcompte AS leaderId, c.pseudonyme AS leaderPseudo
       FROM invitegroupe ig
       JOIN groupe g ON ig.idgroupe = g.idgroupe
       JOIN compte c ON g.idcompte = c.idcompte
       WHERE ig.idcompte = ?
       ORDER BY g.titregroupe ASC`,
      [userId],
    );

    return (rows || []).map((r: any) => ({
      teamId: Number(r.teamId),
      name: String(r.name),
      tag: String(r.tag),
      description: String(r.description || ''),
      website: String(r.website || ''),
      leader: {
        id: Number(r.leaderId),
        pseudo: String(r.leaderPseudo || ''),
      },
    }));
  }

  /**
   * Refuser une invitation reçue.
   */
  async rejectInvitation(userId: number, teamId: number) {
    await this.dataSource.query(
      `DELETE FROM invitegroupe WHERE idcompte = ? AND idgroupe = ?`,
      [userId, teamId],
    );
    return { message: 'Invitation refusée.' };
  }

  /**
   * Création d'une nouvelle équipe (soumission pour modération admin).
   */
  async createTeam(userId: number, dto: CreateTeamDto) {
    const existingMember = await this.memberRepository.findOne({ where: { userId } });
    const existingLeader = await this.groupRepository.findOne({ where: { leaderId: userId } });

    if (existingMember || existingLeader) {
      throw new ConflictException("Vous êtes déjà membre ou responsable d'une équipe.");
    }

    const pendingVerif = await this.dataSource.query(
      `SELECT idverifgroupe FROM verifgroupe WHERE idcompte = ? LIMIT 1`,
      [userId],
    );
    if (pendingVerif && pendingVerif.length > 0) {
      throw new ConflictException("Vous avez déjà une demande d'équipe en attente de modération.");
    }

    const name = dto.name.trim();
    const tag = dto.tag.trim().toUpperCase();

    const existingName = await this.groupRepository.findOne({
      where: [{ name }, { tag }],
    });
    if (existingName) {
      throw new ConflictException("Ce nom d'équipe ou ce sigle est déjà utilisé par une autre équipe.");
    }

    await this.dataSource.query(
      `INSERT INTO \`verifgroupe\` (\`idgroupe\`, \`idcompte\`, \`titregroupe\`, \`initialgroupe\`, \`urlsite\`, \`descriptiongroupe\`)
       VALUES (0, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        tag,
        dto.website ? dto.website.trim() : '',
        dto.description ? dto.description.trim() : '',
      ],
    );

    return { message: "Votre demande de création d'équipe a été soumise à la modération de l'administrateur !" };
  }

  /**
   * Modification d'une équipe existante (soumission pour modération admin).
   */
  async updateTeam(userId: number, teamId: number, dto: CreateTeamDto) {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException('Équipe introuvable.');
    }
    if (group.leaderId !== userId) {
      throw new ForbiddenException("Seul le chef d'équipe peut modifier les informations.");
    }

    const name = dto.name.trim();
    const tag = dto.tag.trim().toUpperCase();

    const existingOther = await this.dataSource.query(
      `SELECT idgroupe FROM groupe WHERE (titregroupe = ? OR initialgroupe = ?) AND idgroupe != ? LIMIT 1`,
      [name, tag, teamId],
    );
    if (existingOther && existingOther.length > 0) {
      throw new ConflictException("Ce nom d'équipe ou ce sigle est déjà utilisé par une autre équipe.");
    }

    await this.dataSource.query(`DELETE FROM verifgroupe WHERE idgroupe = ?`, [teamId]);
    await this.dataSource.query(
      `INSERT INTO \`verifgroupe\` (\`idgroupe\`, \`idcompte\`, \`titregroupe\`, \`initialgroupe\`, \`urlsite\`, \`descriptiongroupe\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        teamId,
        userId,
        name,
        tag,
        dto.website ? dto.website.trim() : '',
        dto.description ? dto.description.trim() : '',
      ],
    );

    return { message: 'Modifications soumises à la modération administrateur.' };
  }

  /**
   * Rejoindre une équipe suite à invitation.
   */
  async joinTeam(userId: number, teamId: number) {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException('Équipe introuvable.');
    }

    const currentMember = await this.memberRepository.findOne({ where: { userId } });
    const currentLeader = await this.groupRepository.findOne({ where: { leaderId: userId } });
    if (currentMember || currentLeader) {
      throw new ConflictException("Vous appartenez déjà à une équipe. Veuillez d'abord la quitter avant d'en rejoindre une nouvelle.");
    }

    const invite = await this.dataSource.query(
      `SELECT 1 FROM invitegroupe WHERE idcompte = ? AND idgroupe = ?`,
      [userId, teamId],
    );
    if (!invite || invite.length === 0) {
      throw new ForbiddenException("Vous n'avez pas reçu d'invitation pour rejoindre cette équipe.");
    }

    const now = Math.floor(Date.now() / 1000);
    const { capital } = await this.getPlayerTotalCapital(userId);

    await this.dataSource.query(`DELETE FROM invitegroupe WHERE idcompte = ?`, [userId]);
    await this.dataSource.query(`DELETE FROM verifgroupe WHERE idcompte = ?`, [userId]);

    await this.memberRepository.save({
      userId,
      groupId: teamId,
      joinDate: now,
      capitalJoin: capital,
    });

    return { message: "Félicitations, vous avez rejoint l'équipe !" };
  }

  /**
   * Quitter une équipe.
   */
  async leaveTeam(userId: number) {
    const membership = await this.memberRepository.findOne({ where: { userId } });
    const ledGroup = await this.groupRepository.findOne({ where: { leaderId: userId } });
    const groupId = membership ? membership.groupId : ledGroup ? ledGroup.id : null;

    if (!groupId) {
      throw new BadRequestException("Vous ne faites partie d'aucune équipe.");
    }

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (group && group.leaderId === userId) {
      const otherMembers = await this.memberRepository.find({
        where: { groupId },
      });
      const successor = otherMembers.find((m) => m.userId !== userId);
      if (successor) {
        group.leaderId = successor.userId;
        await this.groupRepository.save(group);
      } else {
        await this.dataSource.query(`DELETE FROM invitegroupe WHERE idgroupe = ?`, [groupId]);
        await this.dataSource.query(`DELETE FROM verifgroupe WHERE idgroupe = ?`, [groupId]);
        await this.groupRepository.delete(group.id);
      }
    }

    await this.memberRepository.delete({ userId });
    return { message: "Vous avez quitté l'équipe." };
  }

  /**
   * Recherche des joueurs disponibles pouvant être invités dans une équipe.
   */
  async searchCandidates(userId: number, teamId: number, query = '') {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException('Équipe introuvable.');
    }
    if (group.leaderId !== userId) {
      throw new ForbiddenException("Seul le chef d'équipe peut rechercher des candidats.");
    }

    let sql = `
      SELECT c.idcompte AS userId, c.pseudonyme AS pseudo
      FROM compte c
      WHERE c.authlevel >= 1
        AND c.idcompte NOT IN (SELECT idcompte FROM membregroupe)
        AND c.idcompte NOT IN (SELECT idcompte FROM invitegroupe WHERE idgroupe = ?)
    `;
    const params: any[] = [teamId];

    if (query && query.trim().length > 0) {
      sql += ` AND c.pseudonyme LIKE ? ORDER BY c.pseudonyme ASC`;
      params.push(`%${query.trim()}%`);
    } else {
      sql += ` ORDER BY c.dateactivite DESC`;
    }
    sql += ` LIMIT 20`;

    const rows = await this.dataSource.query(sql, params);
    return (rows || []).map((r: any) => ({
      userId: Number(r.userId),
      pseudo: String(r.pseudo),
    }));
  }

  /**
   * Inviter un joueur dans l'équipe.
   */
  async invitePlayer(userId: number, teamId: number, targetUserId: number) {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException('Équipe introuvable.');
    }
    if (group.leaderId !== userId) {
      throw new ForbiddenException("Seul le chef d'équipe peut inviter des membres.");
    }

    if (!targetUserId || targetUserId <= 0) {
      throw new BadRequestException('Identifiant de joueur requis.');
    }

    const targetMember = await this.memberRepository.findOne({ where: { userId: targetUserId } });
    if (targetMember) {
      throw new BadRequestException("Ce joueur fait déjà partie d'une équipe.");
    }

    const existingInvite = await this.dataSource.query(
      `SELECT 1 FROM invitegroupe WHERE idgroupe = ? AND idcompte = ?`,
      [teamId, targetUserId],
    );
    if (existingInvite && existingInvite.length > 0) {
      throw new BadRequestException("Ce joueur a déjà été invité dans cette équipe.");
    }

    await this.dataSource.query(
      `INSERT INTO invitegroupe (idgroupe, idcompte) VALUES (?, ?)`,
      [teamId, targetUserId],
    );

    // Message privé de notification au joueur
    try {
      const now = Math.floor(Date.now() / 1000);
      await this.dataSource.query(
        `INSERT INTO message (idreceveur, idexpediteur, titremessage, corpsmessage, datemessage, statutmessage)
         VALUES (?, ?, ?, ?, ?, 'non lu')`,
        [
          targetUserId,
          userId,
          `Invitation à rejoindre l'équipe ${group.name}`,
          `Bonjour,\n\nLe chef de [${group.tag}] ${group.name} vous invite à rejoindre son club de trading.\nVous pouvez consulter et accepter cette invitation depuis l'onglet Équipes.`,
          now,
        ],
      );
    } catch {
      // Ignorer si échec
    }

    return { message: 'Invitation envoyée avec succès !' };
  }

  /**
   * Annuler une invitation envoyée.
   */
  async cancelInvitation(userId: number, teamId: number, targetUserId: number) {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException('Équipe introuvable.');
    }
    if (group.leaderId !== userId) {
      throw new ForbiddenException("Seul le chef d'équipe peut annuler une invitation.");
    }

    await this.dataSource.query(
      `DELETE FROM invitegroupe WHERE idgroupe = ? AND idcompte = ?`,
      [teamId, targetUserId],
    );

    return { message: 'Invitation annulée.' };
  }

  /**
   * Exclure un membre de l'équipe (chef uniquement).
   */
  async kickMember(userId: number, teamId: number, targetUserId: number) {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException('Équipe introuvable.');
    }
    if (group.leaderId !== userId) {
      throw new ForbiddenException("Seul le chef d'équipe peut exclure des membres.");
    }
    if (targetUserId === userId) {
      throw new BadRequestException("Le chef ne peut pas s'exclure lui-même. Utilisez 'Quitter l'équipe'.");
    }

    await this.memberRepository.delete({ groupId: teamId, userId: targetUserId });

    // Notification à l'exclu
    try {
      const now = Math.floor(Date.now() / 1000);
      await this.dataSource.query(
        `INSERT INTO message (idreceveur, idexpediteur, titremessage, corpsmessage, datemessage, statutmessage)
         VALUES (?, ?, ?, ?, ?, 'non lu')`,
        [
          targetUserId,
          userId,
          "Exclusion d'équipe",
          `Vous avez été retiré de l'équipe ${group.name}.`,
          now,
        ],
      );
    } catch {
      // Ignorer si échec
    }

    return { message: "Le membre a été exclu de l'équipe." };
  }
}

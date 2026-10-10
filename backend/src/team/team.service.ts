/**
 * NetTrader 2 — Service de Gestion des Équipes de Joueurs
 *
 * Usage:
 *   Gère les règles d'adhésion, les invitations, les performances collectives et la composition des équipes.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
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
   * Création d'une nouvelle équipe.
   */
  async createTeam(userId: number, dto: CreateTeamDto) {
    const existingMember = await this.memberRepository.findOne({ where: { userId } });
    const existingLeader = await this.groupRepository.findOne({ where: { leaderId: userId } });

    if (existingMember || existingLeader) {
      throw new ConflictException("Vous êtes déjà membre ou responsable d'une équipe.");
    }

    const existingName = await this.groupRepository.findOne({
      where: [{ name: dto.name }, { tag: dto.tag }],
    });
    if (existingName) {
      throw new ConflictException("Ce nom d'équipe ou ce sigle est déjà utilisé.");
    }

    const now = Math.floor(Date.now() / 1000);
    const { capital } = await this.getPlayerTotalCapital(userId);

    const group = await this.groupRepository.save({
      leaderId: userId,
      name: dto.name,
      tag: dto.tag,
      description: dto.description || '',
      website: dto.website || '',
      forumId: 0,
      status: 'actif',
      goldMedals: 0,
      silverMedals: 0,
      bronzeMedals: 0,
      createdDate: now,
    });

    await this.memberRepository.save({
      userId,
      groupId: group.id,
      joinDate: now,
      capitalJoin: capital,
    });

    return { message: "Équipe créée avec succès !" };
  }

  /**
   * Rejoindre une équipe.
   */
  async joinTeam(userId: number, teamId: number) {
    const group = await this.groupRepository.findOne({ where: { id: teamId } });
    if (!group) {
      throw new NotFoundException("Équipe introuvable.");
    }

    const currentMember = await this.memberRepository.findOne({ where: { userId } });
    if (currentMember) {
      throw new ConflictException("Vous appartenez déjà à une équipe.");
    }

    const now = Math.floor(Date.now() / 1000);
    const { capital } = await this.getPlayerTotalCapital(userId);

    await this.memberRepository.save({
      userId,
      groupId: teamId,
      joinDate: now,
      capitalJoin: capital,
    });

    return { message: "Vous avez rejoint l'équipe avec succès !" };
  }

  /**
   * Quitter une équipe.
   */
  async leaveTeam(userId: number) {
    const membership = await this.memberRepository.findOne({ where: { userId } });
    if (!membership) {
      throw new BadRequestException("Vous ne faites partie d'aucune équipe.");
    }

    const group = await this.groupRepository.findOne({ where: { id: membership.groupId } });
    if (group && group.leaderId === userId) {
      // Trouver un autre membre pour devenir leader ou dissoudre
      const otherMembers = await this.memberRepository.find({
        where: { groupId: membership.groupId },
      });
      const successor = otherMembers.find((m) => m.userId !== userId);
      if (successor) {
        group.leaderId = successor.userId;
        await this.groupRepository.save(group);
      } else {
        await this.groupRepository.delete(group.id);
      }
    }

    await this.memberRepository.delete({ userId });
    return { message: "Vous avez quitté l'équipe." };
  }
}

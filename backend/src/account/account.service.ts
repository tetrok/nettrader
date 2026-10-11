/**
 * NetTrader 2 — Service de Gestion du Compte Utilisateur
 *
 * Usage:
 *   Implémente la logique de mise à jour du profil joueur, de sécurité du mot de passe et de réinitialisation de capital.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { Portfolio } from '../entities/portfolio.entity';
import { Order } from '../entities/order.entity';
import { TradeHistory } from '../entities/trade-history.entity';
import { Message } from '../entities/message.entity';
import { GroupMember } from '../entities/group-member.entity';
import { Group } from '../entities/group.entity';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  ResetAccountDto,
} from './dto/account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(TradeHistory)
    private readonly tradeHistoryRepository: Repository<TradeHistory>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Profil complet du joueur connecté.
   */
  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['niveau', 'skinEntity'],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const totalTransactions = await this.tradeHistoryRepository.count({
      where: { userId },
    });

    return {
      id: Number(user.id),
      pseudo: user.pseudo,
      email: user.email,
      level: Number(user.idniveau || 1),
      cashback: Number(user.cashback),
      mailDaily: user.maildaily === 1,
      mailWeekly: user.mailweekly === 1,
      skin: user.skinEntity?.repertoire || 'default',
      dateRegistered: Number(user.dateinscr),
      totalTransactions,
    };
  }

  /**
   * Mise à jour du profil.
   */
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (dto.email && dto.email.trim()) {
      const email = dto.email.trim();
      const existing = await this.userRepository.findOne({
        where: { email, id: Not(userId) },
      });
      if (existing) {
        throw new ConflictException(
          'Cette adresse email est déjà utilisée par un autre joueur.',
        );
      }
      user.email = email;
    }

    if (dto.level !== undefined && dto.level >= 1 && dto.level <= 3) {
      if (dto.level < (user.idniveau || 1)) {
        // Vérifier s'il détient des positions courtes (VAD)
        const hasVad = await this.dataSource.getRepository(Portfolio)
          .createQueryBuilder('p')
          .where('p.userId = :userId AND p.quantity < 0', { userId })
          .getOne();

        if (hasVad) {
          throw new BadRequestException(
            "Impossible de rétrograder votre niveau : vous détenez actuellement des positions de vente à découvert (VAD) ouvertes dans votre portefeuille."
          );
        }

        // Vérifier s'il détient des ordres en attente incompatibles pour le niveau débutant
        if (dto.level === 1) {
          const complexOrders = await this.dataSource.getRepository(Order)
            .createQueryBuilder('o')
            .where('o.userId = :userId AND o.etat = :etat AND (o.coursMin > 0 AND o.coursMax > 0)', {
              userId,
              etat: '1',
            })
            .getOne();

          if (complexOrders) {
            throw new BadRequestException(
              "Impossible de rétrograder votre niveau : vous avez des ordres à plage de cours en attente dans le carnet d'ordres."
            );
          }
        }
      }
      user.idniveau = dto.level;
    }

    if (dto.mailDaily !== undefined) {
      user.maildaily = dto.mailDaily ? 1 : 0;
    }

    if (dto.mailWeekly !== undefined) {
      user.mailweekly = dto.mailWeekly ? 1 : 0;
    }

    await this.userRepository.save(user);
    return null;
  }

  /**
   * Modification du mot de passe.
   */
  async changePassword(userId: number, dto: ChangePasswordDto, currentToken?: string) {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Veuillez renseigner votre mot de passe actuel et le nouveau mot de passe.');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('La confirmation du mot de passe ne correspond pas.');
    }

    if (dto.newPassword.length < 6) {
      throw new BadRequestException('Le nouveau mot de passe doit comporter au moins 6 caractères.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const match = await bcrypt.compare(dto.currentPassword, user.passe);
    if (!match) {
      throw new ForbiddenException('Le mot de passe actuel est incorrect.');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    user.passe = hashed;
    await this.userRepository.save(user);

    // Révocation des autres sessions
    if (currentToken) {
      await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .where('idcompte = :userId AND idSession != :token', { userId, token: currentToken })
        .execute();
    }

    return null;
  }

  /**
   * Remise à zéro (RAZ) du compte du joueur.
   */
  async resetAccount(userId: number, dto: ResetAccountDto) {
    if (dto.confirmText !== 'OK') {
      throw new BadRequestException("Veuillez saisir le texte de confirmation 'OK'.");
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const match = await bcrypt.compare(dto.password, user.passe);
    if (!match) {
      throw new ForbiddenException('Mot de passe incorrect.');
    }

    // Transaction atomique de RAZ
    await this.dataSource.transaction(async (manager) => {
      // 1. Purge portefeuille
      await manager.delete(Portfolio, { userId });
      // 2. Purge ordres en attente
      await manager.delete(Order, { userId });
      // 3. Purge historique des transactions
      await manager.delete(TradeHistory, { userId });
      // 4. Purge messagerie reçue
      await manager.delete(Message, { recipientId: userId });
      // 5. Départ équipe
      await manager.delete(GroupMember, { userId });
      // 6. Si leader d'un groupe, désassignation
      await manager.update(Group, { leaderId: userId }, { leaderId: 0 });
      // 7. Reset cashback à 10 000 €
      await manager.update(User, userId, {
        cashback: 10000.0,
        dateactivite: Math.floor(Date.now() / 1000),
      });
    });

    return { cashback: 10000.0 };
  }
}

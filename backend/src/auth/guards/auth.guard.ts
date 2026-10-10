/**
 * NetTrader 2 — Guard NestJS d'Authentification Utilisateur
 *
 * Usage:
 *   Protège les endpoints nécessitant un compte joueur connecté.
 *
 * Logique & Fonctionnement:
 *   - Extrait le token depuis l'en-tête "Authorization: Bearer <token>" ou le cookie de session.
 *   - Valide l'existence et la non-expiration du jeton en base de données (table `session`).
 *   - Injecte l'entité User correspondante dans l'objet Request (request.user).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || '';

    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (request.query?.token) {
      token = String(request.query.token).trim();
    }

    if (!token) {
      throw new UnauthorizedException('Non authentifié');
    }

    // Rejet strict des jetons de réinitialisation ou formats anormaux
    if (token.startsWith('reset_') || !/^[a-f0-9]{32,64}$/i.test(token)) {
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    const now = Math.floor(Date.now() / 1000);
    const session = await this.sessionRepository.findOne({
      where: { idSession: token },
    });

    if (!session || Number(session.tempsLimite) < now) {
      throw new UnauthorizedException('Session invalide ou expirée');
    }

    const user = await this.userRepository.findOne({
      where: { id: session.idcompte },
      relations: ['niveau', 'skinEntity'],
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    request.user = user;
    request.sessionId = token;

    return true;
  }
}

/**
 * NetTrader 2 — Guard NestJS d'Autorisation Administrateur
 *
 * Usage:
 *   Protège les endpoints d'administration réservés aux super-utilisateurs (/api/admin/*).
 *
 * Logique & Fonctionnement:
 *   - Vérifie que l'utilisateur est authentifié et que son niveau d'autorisation atteint le palier administrateur (authlevel >= 99).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '../../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('Non authentifié');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }

    return true;
  }
}

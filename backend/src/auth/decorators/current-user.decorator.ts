/**
 * NetTrader 2 — Décorateur de Paramètre @CurrentUser()
 *
 * Usage:
 *   Injecte facilement l'entité utilisateur connectée dans les méthodes de contrôleur.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return null;
    return data ? user[data] : user;
  },
);

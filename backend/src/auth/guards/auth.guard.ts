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

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { TabForcing } from '../entities/tabforcing.entity';
import { Niveau } from '../entities/niveau.entity';
import { Skin } from '../entities/skin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, TabForcing, Niveau, Skin]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard, TypeOrmModule],
})
export class AuthModule {}

/**
 * NetTrader 2 — Contrôleur REST d'Authentification NestJS
 *
 * Usage:
 *   Expose les routes /api/auth pour la connexion, l'inscription, la consultation de session et la déconnexion.
 *
 * Logique & Fonctionnement:
 *   - login() : valide les identifiants, migre le hash si nécessaire, génère un token CSPRNG et initialise la session.
 *   - register() : crée un nouveau compte avec capital initial de 10 000 € après validation du pseudo et de l'e-mail.
 *   - me() : retourne le profil complet de l'utilisateur actif via le token Bearer.
 *   - logout() : révoque la session active en base de données.
 *   - requestPasswordReset() / resetPassword() : gère la réinitialisation de mot de passe par jeton temporaire.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetDto, ConfirmPasswordResetDto } from './dto/password-reset.dto';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscription d\'un nouvel utilisateur' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion (GET)' })
  async logoutGet(@Req() req: any) {
    const token = req.headers['authorization']?.replace('Bearer ', '')?.trim();
    const userId = req.user?.id;
    return this.authService.logout(token, userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déconnexion (POST)' })
  async logoutPost(@Req() req: any) {
    const token = req.headers['authorization']?.replace('Bearer ', '')?.trim();
    const userId = req.user?.id;
    return this.authService.logout(token, userId);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Informations sur l\'utilisateur connecté' })
  async me(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demande de réinitialisation de mot de passe' })
  async requestPasswordReset(@Body() dto: PasswordResetDto) {
    return this.authService.requestPasswordReset(dto.login);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmation et exécution de la réinitialisation de mot de passe' })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto.token, dto.newPassword);
  }
}

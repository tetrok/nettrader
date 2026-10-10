/**
 * NetTrader 2 — DTO de Réinitialisation de Mot de Passe
 *
 * Usage:
 *   Valide les données de demande et de confirmation de réinitialisation de mot de passe.
 */

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDto {
  @ApiProperty({ example: 'trader42', description: 'Pseudo ou adresse e-mail pour réinitialiser le mot de passe' })
  @IsNotEmpty({ message: 'Veuillez renseigner votre pseudo ou votre email.' })
  @IsString()
  login: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ example: 'a1b2c3d4...', description: 'Jeton sécurisé reçu par e-mail' })
  @IsNotEmpty({ message: 'Le jeton de validation est obligatoire.' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NouveauMotDePasse123!', description: 'Nouveau mot de passe' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire.' })
  @IsString()
  newPassword: string;
}

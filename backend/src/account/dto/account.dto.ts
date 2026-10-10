/**
 * NetTrader 2 — DTOs de Gestion de Compte
 *
 * Usage:
 *   Valide les payloads de mise à jour de profil et de changement de mot de passe.
 */

import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'trader@example.com' })
  @IsOptional()
  @IsEmail({}, { message: "Format d'adresse e-mail invalide." })
  @Length(5, 100, { message: "L'adresse e-mail doit comporter entre 5 et 100 caractères." })
  email?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  level?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  mailDaily?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  mailWeekly?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mot de passe actuel' })
  @IsNotEmpty({ message: 'Le mot de passe actuel est obligatoire.' })
  @IsString()
  @Length(1, 128, { message: 'Le mot de passe actuel ne doit pas dépasser 128 caractères.' })
  currentPassword: string;

  @ApiProperty({ description: 'Nouveau mot de passe' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe est obligatoire.' })
  @IsString()
  @Length(6, 128, { message: 'Le nouveau mot de passe doit comporter entre 6 et 128 caractères.' })
  newPassword: string;

  @ApiProperty({ description: 'Confirmation du nouveau mot de passe' })
  @IsNotEmpty({ message: 'La confirmation du nouveau mot de passe est obligatoire.' })
  @IsString()
  @Length(6, 128, { message: 'La confirmation doit comporter entre 6 et 128 caractères.' })
  confirmPassword: string;
}

export class ResetAccountDto {
  @ApiProperty({ description: 'Mot de passe de confirmation' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire.' })
  @IsString()
  @Length(1, 128)
  password: string;

  @ApiProperty({ example: 'OK', description: 'Texte de confirmation (OK)' })
  @IsNotEmpty({ message: "Le texte de confirmation 'OK' est obligatoire." })
  @IsString()
  @Length(2, 2, { message: "Veuillez saisir exactement 'OK'." })
  confirmText: string;
}

import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'trader42', description: 'Pseudonyme' })
  @IsNotEmpty({ message: 'Le pseudo est obligatoire.' })
  @IsString()
  @Length(3, 30, { message: 'Le pseudonyme doit comporter entre 3 et 30 caractères.' })
  @Matches(/^[a-zA-Z0-9_\-\. ]+$/, {
    message: 'Le pseudonyme contient des caractères non autorisés.',
  })
  pseudo: string;

  @ApiProperty({ example: 'trader@example.com', description: 'Adresse e-mail' })
  @IsNotEmpty({ message: "L'email est obligatoire." })
  @IsEmail({}, { message: "Format d'adresse e-mail invalide." })
  email: string;

  @ApiProperty({ example: 'secret123', description: 'Mot de passe' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire.' })
  @IsString()
  @Length(6, 128, { message: 'Le mot de passe doit comporter entre 6 et 128 caractères.' })
  password: string;

  @ApiPropertyOptional({ example: 1, description: 'Niveau du joueur (1=Débutant, 2=Initié, 3=Expert)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  level?: number = 1;

  @ApiPropertyOptional({ example: false, description: 'Recevoir les stats journalières' })
  @IsOptional()
  mailDaily?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Recevoir les stats hebdomadaires' })
  @IsOptional()
  mailWeekly?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Alias pour mailDaily' })
  @IsOptional()
  mailJour?: number;

  @ApiPropertyOptional({ example: 0, description: 'Alias pour mailWeekly' })
  @IsOptional()
  mailSemaine?: number;
}

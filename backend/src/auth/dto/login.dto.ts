import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'Administrateur', description: 'Pseudo ou adresse e-mail' })
  @IsNotEmpty({ message: 'Veuillez renseigner votre identifiant.' })
  @IsString()
  login: string;

  @ApiProperty({ example: 'password123', description: 'Mot de passe' })
  @IsNotEmpty({ message: 'Veuillez renseigner votre mot de passe.' })
  @IsString()
  password: string;
}

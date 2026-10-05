import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetDto {
  @ApiProperty({ example: 'trader42', description: 'Pseudo ou adresse e-mail pour réinitialiser le mot de passe' })
  @IsNotEmpty({ message: 'Veuillez renseigner votre pseudo ou votre email.' })
  @IsString()
  login: string;
}

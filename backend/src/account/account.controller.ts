import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountService } from './account.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  ResetAccountDto,
} from './dto/account.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Account')
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil détaillé du joueur connecté' })
  async getProfile(@CurrentUser() user: User) {
    return this.accountService.getProfile(user.id);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mise à jour du profil (PUT)' })
  async updateProfilePut(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(user.id, dto);
  }

  @Post('profile')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mise à jour du profil (POST)' })
  async updateProfilePost(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.accountService.updateProfile(user.id, dto);
  }

  @Put('password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changement de mot de passe (PUT)' })
  async changePasswordPut(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.accountService.changePassword(user.id, dto, req.sessionId);
  }

  @Post('password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changement de mot de passe (POST)' })
  async changePasswordPost(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
  ) {
    return this.accountService.changePassword(user.id, dto, req.sessionId);
  }

  @Post('reset')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remise à zéro du compte joueur (RAZ à 10 000 €)' })
  async resetAccount(
    @CurrentUser() user: User,
    @Body() dto: ResetAccountDto,
  ) {
    return this.accountService.resetAccount(user.id, dto);
  }
}

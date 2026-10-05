import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { PostMessageDto } from './dto/forum.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Forums')
@Controller('forums')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des rubriques du forum' })
  async getForums(@Headers('authorization') authHeader?: string) {
    const user = await this.forumService.resolveUserFromToken(authHeader);
    return this.forumService.getForums(user);
  }

  @Get(':id/topics')
  @ApiOperation({ summary: 'Liste des sujets d\'un forum' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getTopics(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authHeader?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const user = await this.forumService.resolveUserFromToken(authHeader);
    return this.forumService.getTopics(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      user,
    );
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Liste des messages d\'un sujet' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getTopicMessages(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authHeader?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const user = await this.forumService.resolveUserFromToken(authHeader);
    return this.forumService.getTopicMessages(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      user,
    );
  }

  @Post('posts')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publication d\'un message ou création de sujet' })
  async postMessage(@CurrentUser() user: User, @Body() dto: PostMessageDto) {
    return this.forumService.postMessage(user, dto);
  }
}

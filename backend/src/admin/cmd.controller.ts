import { Controller, Get, Post, Query, Headers, Res } from '@nestjs/common';
import { Response } from 'express';
import { AdminJobsService } from './admin-jobs.service';

@Controller('cmd.php')
export class CmdController {
  constructor(private readonly jobsService: AdminJobsService) {}

  @Get()
  async handleGet(
    @Query('do') doAction: string,
    @Query('action') action: string,
    @Query('key') key: string,
    @Headers('x-cron-key') headerKey: string,
    @Res() res: Response,
  ) {
    const act = doAction || action || '';
    const secret = key || headerKey || '';
    const result = await this.jobsService.handleCmdPhp(act, secret);
    return res.type('text/plain').send(result);
  }

  @Post()
  async handlePost(
    @Query('do') doAction: string,
    @Query('action') action: string,
    @Query('key') key: string,
    @Headers('x-cron-key') headerKey: string,
    @Res() res: Response,
  ) {
    const act = doAction || action || '';
    const secret = key || headerKey || '';
    const result = await this.jobsService.handleCmdPhp(act, secret);
    return res.type('text/plain').send(result);
  }
}

import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { TelegramRelayService } from './telegram-relay.service';

@ApiTags('telegram-relay')
@Controller('telegram-relay')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.EMPLOYEE)
@ApiBearerAuth()
export class TelegramRelayController {
  constructor(private readonly telegramRelayService: TelegramRelayService) {}

  @Get('team-inbox')
  @ApiOperation({ summary: 'Активные Telegram-обращения команды менеджера' })
  async getTeamInbox(@Request() req: RequestWithUser) {
    const managerId = await this.telegramRelayService.getManagerIdForActor(req.user!.userId, req.user!.role);
    if (!managerId) return [];
    return this.telegramRelayService.getTeamInboxThreads(managerId);
  }

  @Post('threads/:id/claim')
  @ApiOperation({ summary: 'Взять Telegram-обращение в работу из веб-панели' })
  async claim(@Request() req: RequestWithUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.telegramRelayService.claimThreadFromWeb(id, req.user!.userId, req.user!.role);
    return { ok: true };
  }
}

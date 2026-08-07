/**
 * Payouts Controller — баланс и заявки на вывод для моделей/менеджеров,
 * очередь одобрения для admin/moderator.
 */

import { Body, Controller, Get, Param, Post, Put, Query, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { PayoutRequestStatus } from '@escort/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { PayoutsService } from './payouts.service';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { TransitionPayoutRequestDto } from './dto/transition-payout-request.dto';

@ApiTags('Payouts')
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODEL, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Баланс заработанного (модель/менеджер): заработано/выплачено/в ожидании/доступно' })
  async getBalance(@Request() req: RequestWithUser) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.payoutsService.getBalance(userId, req.user!.role);
  }

  @Post('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MODEL, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать заявку на вывод (не больше доступного баланса)' })
  async createRequest(@Request() req: RequestWithUser, @Body() body: CreatePayoutRequestDto) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.payoutsService.createRequest(userId, req.user!.role, body.amount, body.requisites);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'paid', 'rejected'] })
  @ApiOperation({
    summary: 'Список заявок — модель/менеджер видит свои, admin/moderator видят все',
  })
  async listRequests(@Request() req: RequestWithUser, @Query('status') status?: PayoutRequestStatus) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.payoutsService.listRequests(userId, req.user!.role, status);
  }

  @Put('requests/:id/transition')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Одобрить/отклонить/отметить выплаченной (admin/moderator)' })
  async transitionRequest(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: TransitionPayoutRequestDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    return this.payoutsService.transitionRequest(userId, id, body.status, body.note);
  }
}

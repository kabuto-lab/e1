/**
 * Escrow Controller - endpoints для эскроу транзакций
 */

import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EscrowService } from './escrow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';

class CreateEscrowDto {
  bookingId: string;
  amount: string;
  paymentProvider: 'yookassa' | 'cryptomus' | 'manual';
}

@ApiTags('Escrow')
@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика эскроу' })
  async getStats() {
    return this.escrowService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Транзакция по ID' })
  async getById(@Param('id') id: string) {
    return this.escrowService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать эскроу транзакцию' })
  async create(@Body() body: CreateEscrowDto) {
    return this.escrowService.createTransaction(body);
  }

  @Post(':id/fund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить финансирование' })
  async fund(@Param('id') id: string) {
    return this.escrowService.confirmFunding(id);
  }

  @Post(':id/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Освободить средства (выплата)' })
  async release(@Param('id') id: string, @Body('payoutAmount') payoutAmount?: string) {
    return this.escrowService.release(id, payoutAmount);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Вернуть средства' })
  async refund(@Param('id') id: string) {
    return this.escrowService.refund(id);
  }
}

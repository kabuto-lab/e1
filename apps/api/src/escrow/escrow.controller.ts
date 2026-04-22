/**
 * Escrow Controller - endpoints для эскроу транзакций
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { EscrowService } from './escrow.service';
import { TonEscrowService } from './ton-escrow.service';
import { BroadcastTonJettonDto } from './dto/broadcast-ton-jetton.dto';
import { ConfirmTonRefundDto } from './dto/confirm-ton-refund.dto';
import { ConfirmTonReleaseDto } from './dto/confirm-ton-release.dto';
import { CreateTonIntentDto } from './dto/create-ton-intent.dto';
import { RecordTonDepositDto } from './dto/record-ton-deposit.dto';
import { RecordTonDepositResponseDto } from './dto/record-ton-deposit.response';
import { TonEscrowClientViewResponseDto } from './dto/ton-escrow-client-view.response';
import { TonEscrowDepositGuard } from './guards/ton-escrow-deposit.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { Throttle, SkipThrottle } from '../security/rate-limit.config';

class CreateEscrowDto {
  bookingId: string;
  amount: string;
  paymentProvider: 'yookassa' | 'cryptomus' | 'manual';
}

@ApiTags('Escrow')
@Controller('escrow')
export class EscrowController {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly tonEscrowService: TonEscrowService,
  ) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика эскроу' })
  async getStats() {
    return this.escrowService.getStats();
  }

  @Get('ton/booking/:bookingId')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiTags('TON USDT escrow')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'TON USDT: эскроу по bookingId (клиент брони или admin/manager)',
    description:
      'Для ЛК: memo, treasury, jetton master, суммы (atomic + human-readable), статус. Нет TON эскроу → 404.',
  })
  @ApiParam({ name: 'bookingId', format: 'uuid' })
  @ApiOkResponse({ type: TonEscrowClientViewResponseDto })
  async getTonEscrowByBooking(
    @Request() req: RequestWithUser,
    @Param('bookingId', new ParseUUIDPipe({ version: '4' })) bookingId: string,
  ) {
    const user = req.user;
    if (!user?.userId) {
      throw new UnauthorizedException();
    }
    return this.tonEscrowService.getTonEscrowByBookingForViewer(
      user.userId,
      user.role ?? 'client',
      bookingId,
    );
  }

  @Post('ton/intent')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiTags('TON USDT escrow')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать TON USDT escrow intent (memo, сумма, адреса из env)' })
  @ApiBody({ type: CreateTonIntentDto })
  @ApiOkResponse({ type: TonEscrowClientViewResponseDto })
  async createTonIntent(@Request() req: RequestWithUser, @Body() body: CreateTonIntentDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tonEscrowService.createIntent(userId, body);
  }

  @Post('ton/deposit')
  @SkipThrottle()
  @UseGuards(TonEscrowDepositGuard)
  @ApiTags('TON USDT escrow')
  @ApiSecurity('ton-escrow-ingest')
  @ApiOperation({
    summary: 'Записать входящий TON USDT депозит (индексер; заголовок x-ton-escrow-ingest)',
  })
  @ApiBody({ type: RecordTonDepositDto })
  @ApiOkResponse({ type: RecordTonDepositResponseDto })
  async recordTonDeposit(@Body() body: RecordTonDepositDto) {
    return this.tonEscrowService.recordDeposit(body);
  }

  @Post('ton/:id/confirm-release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiTags('TON USDT escrow')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'TON USDT: зафиксировать выплату (хеш tx после отправки jetton; роли admin/manager)',
  })
  @ApiBody({ type: ConfirmTonReleaseDto })
  @ApiOkResponse({ type: TonEscrowClientViewResponseDto })
  async confirmTonRelease(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: ConfirmTonReleaseDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tonEscrowService.confirmRelease(userId, id, body);
  }

  @Post('ton/:id/confirm-refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiTags('TON USDT escrow')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'TON USDT: зафиксировать возврат клиенту (хеш tx; бронь → cancelled при возможном переходе)',
  })
  @ApiBody({ type: ConfirmTonRefundDto })
  @ApiOkResponse({ type: TonEscrowClientViewResponseDto })
  async confirmTonRefund(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: ConfirmTonRefundDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tonEscrowService.confirmRefund(userId, id, body);
  }

  @Post('ton/:id/broadcast-release')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiTags('TON USDT escrow')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'TON USDT: отправить jetton с hot wallet (mnemonic) и зафиксировать release (TON_HOT_WALLET_MNEMONIC)',
  })
  @ApiBody({ type: BroadcastTonJettonDto })
  @ApiOkResponse({ type: TonEscrowClientViewResponseDto })
  async broadcastTonRelease(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: BroadcastTonJettonDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tonEscrowService.broadcastRelease(userId, id, body);
  }

  @Post('ton/:id/broadcast-refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiTags('TON USDT escrow')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'TON USDT: отправить jetton клиенту с hot wallet и зафиксировать refund (TON_HOT_WALLET_MNEMONIC)',
  })
  @ApiBody({ type: BroadcastTonJettonDto })
  @ApiOkResponse({ type: TonEscrowClientViewResponseDto })
  async broadcastTonRefund(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: BroadcastTonJettonDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.tonEscrowService.broadcastRefund(userId, id, body);
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
  @ApiOperation({ summary: '[DEPRECATED] Создать эскроу транзакцию (fiat-заглушка)', deprecated: true })
  async create(@Body() body: CreateEscrowDto) {
    return this.escrowService.createTransaction(body);
  }

  @Post(':id/fund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEPRECATED] Подтвердить финансирование (fiat-заглушка)', deprecated: true })
  async fund(@Param('id') id: string) {
    return this.escrowService.confirmFunding(id);
  }

  @Post(':id/release')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEPRECATED] Освободить средства (fiat-заглушка)', deprecated: true })
  async release(@Param('id') id: string, @Body('payoutAmount') payoutAmount?: string) {
    return this.escrowService.release(id, payoutAmount);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[DEPRECATED] Вернуть средства (fiat-заглушка)', deprecated: true })
  async refund(@Param('id') id: string) {
    return this.escrowService.refund(id);
  }
}

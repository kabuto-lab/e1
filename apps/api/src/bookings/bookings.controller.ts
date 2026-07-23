/**
 * Bookings Controller - endpoints для бронирований
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsIn, Min, IsPhoneNumber, IsEmail, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingsService } from './bookings.service';
import { ModelsService } from '../models/models.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import { ConfigService } from '@nestjs/config';
import { ContactService } from '../contact/contact.service';
import type { Booking } from '@escort/db';

class CreateBookingDto {
  @IsString()
  modelId: string;

  @IsString()
  startTime: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationHours: number;

  @IsOptional()
  @IsIn(['incall', 'outcall', 'travel', 'hotel', 'dacha'])
  locationType?: 'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha';

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  totalAmount?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

class CreateGuestBookingDto {
  @IsString()
  modelId: string;

  @IsString()
  @MaxLength(100)
  guestName: string;

  @IsString()
  @MaxLength(30)
  guestPhone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  guestEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  guestMessage?: string;

  @IsString()
  startTime: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  durationHours: number;

  @IsOptional()
  @IsString()
  totalAmount?: string;
}

class TransitionDto {
  status: string;
  reason?: string;
}

class DeclineBookingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class ProposeTimeDto {
  @IsString()
  proposedStartTime: string;
}

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly modelsService: ModelsService,
    private readonly configService: ConfigService,
    private readonly contactService: ContactService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои бронирования' })
  async getMyBookings(@Request() req): Promise<Booking[]> {
    // Simplified - in production determine role from user
    return this.bookingsService.findByUser(req.user.userId, 'client');
  }

  @Get('as-model')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Брони текущей модели (role=model)' })
  async getAsModel(@Request() req): Promise<Booking[]> {
    const profile = await this.modelsService.findByUserId(req.user.userId);
    if (!profile) return [];
    return this.bookingsService.findByUser(profile.id, 'model');
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Все бронирования (admin/manager/moderator)' })
  async getAll(@Request() req: { user: { role: string; userId: string } }): Promise<Booking[]> {
    const managerId = req.user.role === 'manager' ? req.user.userId : undefined;
    return this.bookingsService.findAll(managerId);
  }

  @Get('model/:modelId/busy-slots')
  @ApiOperation({ summary: 'Занятые интервалы модели (публично, для UI создания брони)' })
  async getModelBusySlots(@Param('modelId') modelId: string): Promise<{ start: string; end: string }[]> {
    return this.bookingsService.getBusyRanges(modelId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика по бронированиям' })
  async getStats(): Promise<any> {
    return this.bookingsService.getStats();
  }

  @Post('guest')
  @ApiOperation({ summary: 'Гостевая заявка на бронь (без регистрации, 5.16)' })
  @ApiBody({ type: CreateGuestBookingDto })
  @ApiResponse({ status: 201, description: 'Заявка принята' })
  async createGuest(@Body() body: CreateGuestBookingDto): Promise<Booking> {
    const booking = await this.bookingsService.createGuestBooking({
      modelId: body.modelId,
      guestName: body.guestName,
      guestPhone: body.guestPhone,
      guestEmail: body.guestEmail,
      guestMessage: body.guestMessage,
      startTime: new Date(body.startTime),
      durationHours: body.durationHours,
      totalAmount: body.totalAmount ?? '0',
    });

     // Telegram-уведомление менеджеру (best-effort, не блокирует ответ).
    this.notifyManagerGuest(booking.id, body.guestName, body.guestPhone).catch(() => {});

    // Email-уведомления гостю (если указал email) - тоже best-effort.
    if (body.guestEmail) {
      this.contactService.sendGuestBookingConfirmation({
        email: body.guestEmail,
        name: body.guestName,
        bookingId: booking.id,
        startTime: new Date(body.startTime),
        durationHours: body.durationHours,
      }).catch(() => {});
    }

    return booking;
  }

  private async notifyManagerGuest(bookingId: string, name: string, phone: string): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const adminIds = this.configService.get<string>('TELEGRAM_ADMIN_IDS') ?? '';
    if (!token || !adminIds) return;

    const short = bookingId.slice(0, 8);
    const text = `📋 *Новая гостевая заявка*\nИмя: ${name}\nТелефон: \`${phone}\`\nID брони: \`${short}…\``;

    await Promise.allSettled(
      adminIds.split(',').map((id) =>
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: id.trim(), text, parse_mode: 'Markdown' }),
        }),
      ),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Бронирование по ID' })
  async getById(@Param('id') id: string): Promise<Booking | null> {
    return this.bookingsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать бронирование' })
  @ApiResponse({ status: 201, description: 'Бронирование создано' })
  async create(@Body() body: CreateBookingDto, @Request() req): Promise<Booking> {
    if (!body.modelId || !body.startTime || !body.durationHours) {
      throw new BadRequestException('modelId, startTime, and durationHours are required');
    }

    const model = await this.modelsService.findById(body.modelId);
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.rateHourly == null || Number(model.rateHourly) <= 0) {
      throw new BadRequestException('У модели не указан почасовой тариф');
    }
    const totalAmount = (Number(model.rateHourly) * body.durationHours).toFixed(2);

    return this.bookingsService.createBooking({
      clientId: req.user.userId,
      modelId: body.modelId,
      startTime: new Date(body.startTime),
      durationHours: body.durationHours,
      locationType: body.locationType,
      totalAmount,
      specialRequests: body.specialRequests,
    });
  }

  /** Резолвит id анкеты модели для actor'а с ролью model (для авторизации confirm/decline/propose-time/cancel). */
  private async resolveActorModelProfileId(req: { user: { userId: string; role: string } }): Promise<string | null> {
    if (req.user.role !== 'model') return null;
    const profile = await this.modelsService.findByUserId(req.user.userId);
    return profile?.id ?? null;
  }

  @Put(':id/transition')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Изменить статус (state machine)' })
  async transition(
    @Param('id') id: string,
    @Body() body: TransitionDto,
    @Request() req,
  ): Promise<Booking> {
    return this.bookingsService.transitionState(id, body.status, req.user.userId, body.reason);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить заявку (исполнитель или её менеджер) — до оплаты' })
  async confirm(@Param('id') id: string, @Request() req): Promise<Booking> {
    const actorModelProfileId = await this.resolveActorModelProfileId(req);
    return this.bookingsService.confirmForActor(id, req.user.userId, req.user.role, actorModelProfileId);
  }

  @Post(':id/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отклонить заявку (исполнитель или её менеджер) — до оплаты' })
  async decline(@Param('id') id: string, @Body() body: DeclineBookingDto, @Request() req): Promise<Booking> {
    const actorModelProfileId = await this.resolveActorModelProfileId(req);
    return this.bookingsService.declineForActor(id, req.user.userId, req.user.role, actorModelProfileId, body.reason);
  }

  @Post(':id/propose-time')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Предложить другое время встречи (исполнитель или её менеджер)' })
  async proposeTime(@Param('id') id: string, @Body() body: ProposeTimeDto, @Request() req): Promise<Booking> {
    const actorModelProfileId = await this.resolveActorModelProfileId(req);
    return this.bookingsService.proposeTimeForActor(
      id,
      req.user.userId,
      req.user.role,
      actorModelProfileId,
      new Date(body.proposedStartTime),
    );
  }

  @Post(':id/accept-proposed-time')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Клиент принимает предложенное время встречи' })
  async acceptProposedTime(@Param('id') id: string, @Request() req): Promise<Booking> {
    return this.bookingsService.acceptProposedTime(id, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отменить бронирование' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Request() req): Promise<Booking> {
    const actorModelProfileId = await this.resolveActorModelProfileId(req);
    return this.bookingsService.cancel(id, req.user.userId, req.user.role, actorModelProfileId, reason);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Завершить бронирование' })
  async complete(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.complete(id);
  }

  @Post(':id/dispute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Начать спор' })
  async dispute(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.startDispute(id);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Вернуть деньги (после спора)' })
  async refund(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.refund(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить бронирование (draft/cancelled only)' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.bookingsService.delete(id);
  }
}

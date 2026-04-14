/**
 * Bookings Controller - endpoints для бронирований
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../auth/guards/roles.guard';
import type { Booking } from '@escort/db';

class CreateBookingDto {
  modelId: string;
  startTime: string;
  durationHours: number;
  locationType?: 'incall' | 'outcall' | 'travel' | 'hotel' | 'dacha';
  specialRequests?: string;
}

class TransitionDto {
  status: string;
  reason?: string;
}

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Мои бронирования' })
  async getMyBookings(@Request() req): Promise<Booking[]> {
    // Simplified - in production determine role from user
    return this.bookingsService.findByUser(req.user.userId, 'client');
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Все бронирования (admin/manager)' })
  async getAll(): Promise<Booking[]> {
    return this.bookingsService.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика по бронированиям' })
  async getStats(): Promise<any> {
    return this.bookingsService.getStats();
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

    return this.bookingsService.createBooking({
      clientId: req.user.userId,
      modelId: body.modelId,
      startTime: new Date(body.startTime),
      durationHours: body.durationHours,
      locationType: body.locationType,
      totalAmount: '5000', // TODO: Calculate from model rates
      specialRequests: body.specialRequests,
    });
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
  @ApiOperation({ summary: 'Подтвердить бронирование' })
  async confirm(@Param('id') id: string): Promise<Booking> {
    return this.bookingsService.confirm(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отменить бронирование' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Request() req): Promise<Booking> {
    return this.bookingsService.cancel(id, req.user.userId, reason);
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

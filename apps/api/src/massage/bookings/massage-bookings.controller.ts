import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { MassageBookingsService } from './massage-bookings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../auth/guards/roles.guard';
import type { MassageBooking } from '@escort/db';

class CreateMassageBookingDto {
  @IsUUID() masterId: string;
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsString() @MinLength(1) @MaxLength(100) contact: string;
  @IsOptional() @IsString() @MaxLength(50) desiredDate?: string;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

@ApiTags('massage-bookings')
@Controller('massage/bookings')
export class MassageBookingsController {
  constructor(private readonly bookingsService: MassageBookingsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Заявка на бронь у мастера (без авторизации)' })
  async create(@Body() body: CreateMassageBookingDto): Promise<MassageBooking> {
    return this.bookingsService.create(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список заявок на бронь (staff)' })
  async getAll(): Promise<MassageBooking[]> {
    return this.bookingsService.getAll();
  }
}

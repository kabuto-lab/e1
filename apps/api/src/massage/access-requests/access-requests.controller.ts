import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AccessRequestsService } from './access-requests.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../auth/guards/roles.guard';
import type { MassageAccessRequest } from '@escort/db';

class CreateAccessRequestDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsString() @MinLength(1) @MaxLength(100) contact: string;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

@ApiTags('massage-access-requests')
@Controller('massage/access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestsService: AccessRequestsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Запрос доступа к закрытому каталогу мастеров (без авторизации)' })
  async create(@Body() body: CreateAccessRequestDto): Promise<MassageAccessRequest> {
    return this.accessRequestsService.create(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список запросов доступа (staff)' })
  async getAll(): Promise<MassageAccessRequest[]> {
    return this.accessRequestsService.getAll();
  }
}

import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../auth/guards/roles.guard';
import type { MassageServiceProgram } from '@escort/db';

class CreateProgramDto {
  @IsUUID() masterId: string;
  @IsString() @MinLength(1) @MaxLength(150) name: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsNumber() @Min(0) durationMinutes?: number;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class UpdateProgramDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) durationMinutes?: number;
  @IsOptional() @IsNumber() sortOrder?: number;
}

@ApiTags('massage-programs')
@Controller('massage/programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @ApiQuery({ name: 'masterId', required: true, type: String })
  @ApiOperation({ summary: 'Программы мастера (публично)' })
  async getByMaster(@Query('masterId') masterId: string): Promise<MassageServiceProgram[]> {
    return this.programsService.getByMaster(masterId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать программу (staff)' })
  async create(@Body() body: CreateProgramDto): Promise<MassageServiceProgram> {
    return this.programsService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить программу (staff)' })
  async update(@Param('id') id: string, @Body() body: UpdateProgramDto): Promise<MassageServiceProgram> {
    return this.programsService.update(id, body as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить программу (staff)' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.programsService.delete(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { TenantGuard } from '../tenant-context/tenant.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import {
  AppointmentResponseDto,
  ListAppointmentsResponseDto,
} from './dto/appointment-response.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'appointments', version: '1' })
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({
    summary: 'Создать запись клиента к мастеру на услугу. Idempotent через Idempotency-Key.',
    description:
      'endsAt вычисляется как startsAt + durationMin. Overlap-protection: транзакция с ' +
      'SELECT FOR UPDATE по записям мастера; 409 APPOINTMENT_OVERLAP если slot занят. ' +
      'Передайте Idempotency-Key заголовок — повторный POST с тем же ключом вернёт уже созданную запись.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'UUID или другая уникальная строка для защиты от дублей при retry.',
  })
  create(
    @Body() dto: CreateAppointmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<AppointmentResponseDto> {
    return this.service.createAppointment(dto, idempotencyKey);
  }

  @Get()
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Список записей с фильтрами по salon/staff/client/status/дате' })
  list(@Query() query: ListAppointmentsQueryDto): Promise<ListAppointmentsResponseDto> {
    return this.service.listAppointments(query);
  }

  @Get(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({ summary: 'Детали записи' })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<AppointmentResponseDto> {
    return this.service.getAppointment(id);
  }

  @Patch(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @ApiOperation({
    summary: 'Сменить статус записи / заметку. Валидирует переходы (booked → confirmed → completed).',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.service.updateAppointment(id, dto);
  }

  @Delete(':id')
  @RequireRole('tenant-admin', 'salon-manager', 'master')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить запись (status=cancelled). Физического удаления нет.' })
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Headers('x-cancellation-reason') reason?: string,
  ): Promise<AppointmentResponseDto> {
    return this.service.cancelAppointment(id, reason);
  }
}

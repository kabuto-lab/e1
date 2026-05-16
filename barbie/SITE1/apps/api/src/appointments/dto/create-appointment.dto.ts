import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid', description: 'Салон, в котором проходит запись' })
  @IsUUID()
  salonId!: string;

  @ApiProperty({ format: 'uuid', description: 'Клиент' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ format: 'uuid', description: 'Мастер (staff)' })
  @IsUUID()
  staffId!: string;

  @ApiProperty({ format: 'uuid', description: 'Услуга — берём её priceKopecks и duration по умолчанию' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({
    description: 'Начало записи (ISO timestamp). endsAt = startsAt + durationMin (вычисляется в сервисе).',
    example: '2026-05-20T14:30:00Z',
  })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiPropertyOptional({
    description:
      'Длительность в минутах. Если не передано — берётся из service.durationMin.',
    minimum: 5,
    maximum: 1440,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMin?: number;

  @ApiPropertyOptional({
    description:
      'Кастомная цена (копейки) — если не передано, берётся из service.priceKopecks. Передаётся строкой для BigInt-safety.',
    pattern: '^\\d+$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'priceKopecks должно быть положительным целым в виде строки' })
  priceKopecks?: string;

  @ApiPropertyOptional({ enum: ['web', 'admin', 'tg', 'phone', 'walk-in'], default: 'admin' })
  @IsOptional()
  @IsIn(['web', 'admin', 'tg', 'phone', 'walk-in'])
  source?: 'web' | 'admin' | 'tg' | 'phone' | 'walk-in';

  @ApiPropertyOptional({ description: 'Заметка администратора / мастера' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

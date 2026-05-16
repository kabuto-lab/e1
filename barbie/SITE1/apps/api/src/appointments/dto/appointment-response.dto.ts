import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() salonId!: string;
  @ApiProperty() clientId!: string;
  @ApiProperty() staffId!: string;
  @ApiProperty() serviceId!: string;

  @ApiProperty({ format: 'date-time' }) startsAt!: string;
  @ApiProperty({ format: 'date-time' }) endsAt!: string;
  @ApiProperty() durationMin!: number;

  @ApiProperty({ description: 'Цена в копейках, BigInt-safe строка' })
  priceKopecks!: string;
  @ApiProperty({ example: 'RUB' }) currency!: string;

  @ApiProperty({ enum: ['booked', 'confirmed', 'completed', 'cancelled', 'noshow'] })
  status!: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';

  @ApiProperty({ enum: ['web', 'admin', 'tg', 'phone', 'walk-in'] })
  source!: 'web' | 'admin' | 'tg' | 'phone' | 'walk-in';

  @ApiPropertyOptional() notes?: string | null;
  @ApiPropertyOptional() cancellationReason?: string | null;
  @ApiPropertyOptional() idempotencyKey?: string | null;

  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ListAppointmentsResponseDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data!: AppointmentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

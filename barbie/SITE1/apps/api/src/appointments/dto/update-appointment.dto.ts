import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ enum: ['booked', 'confirmed', 'completed', 'cancelled', 'noshow'] })
  @IsOptional()
  @IsIn(['booked', 'confirmed', 'completed', 'cancelled', 'noshow'])
  status?: 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';

  @ApiPropertyOptional({ description: 'Изменить заметку' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Причина отмены — обязательна когда status переводится в cancelled' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

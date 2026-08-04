import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TbankRefundDto {
  @ApiPropertyOptional({ description: 'Причина отмены/возврата (для истории брони)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmTonRefundDto {
  @ApiProperty({ description: 'Хеш исходящего on-chain возврата клиенту' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  refundTxHash!: string;

  @ApiProperty({ description: 'TON-адрес клиента (получатель возврата), для аудита' })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  recipientAddress!: string;

  @ApiPropertyOptional({ description: 'Причина / комментарий к отмене брони' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

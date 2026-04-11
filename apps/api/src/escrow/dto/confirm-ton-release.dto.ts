import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmTonReleaseDto {
  @ApiProperty({ description: 'Хеш исходящей on-chain операции (после отправки с treasury/hot wallet)' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  releaseTxHash!: string;

  @ApiProperty({
    description: 'TON-адрес получателя выплаты (модель), для аудита; сверка с цепью не выполняется',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  recipientAddress!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

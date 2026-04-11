import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateTonIntentDto {
  @ApiProperty({ format: 'uuid', description: 'ID бронирования (одна запись эскроу на бронь)' })
  @IsUUID('4')
  bookingId!: string;

  @ApiProperty({
    example: '10500000',
    description: 'Ожидаемая сумма в минимальных единицах jetton (строка из цифр, без пробелов)',
  })
  @IsString()
  @Matches(/^\d+$/, { message: 'expectedAmountAtomic must be a non-negative integer string' })
  expectedAmountAtomic!: string;

  @ApiPropertyOptional({
    default: 6,
    description: 'Decimals актива (USDT jetton обычно 6)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(18)
  assetDecimals?: number;
}

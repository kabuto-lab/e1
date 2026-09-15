import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import type { PayoutRequestMethod } from '@escort/db';

export class CreatePayoutRequestDto {
  @ApiProperty({ example: '1500.00', description: 'Сумма в рублях (decimal-строка, до 2 знаков)' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a decimal string, e.g. "1500.00"' })
  amount!: string;

  @ApiProperty({ enum: ['bank', 'ton_wallet'], description: 'Способ получения выплаты' })
  @IsEnum(['bank', 'ton_wallet'])
  method!: PayoutRequestMethod;

  @ApiPropertyOptional({
    example: 'Т-Банк, карта 2200 xxxx xxxx 1234, Иванов И.И.',
    description: 'Реквизиты для перевода (обязательно при method=bank)',
  })
  @ValidateIf((o: CreatePayoutRequestDto) => o.method === 'bank')
  @IsString()
  @MinLength(3, { message: 'requisites must be at least 3 characters' })
  requisites?: string;

  @ApiPropertyOptional({
    example: 'UQDWjUGiV3x2pCTqButaqRWK5MTp4rBmdH34YrRyqs7OzWIp',
    description: 'TON-адрес получателя (обязательно при method=ton_wallet)',
  })
  @ValidateIf((o: CreatePayoutRequestDto) => o.method === 'ton_wallet')
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  tonWalletAddress?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class CreatePayoutRequestDto {
  @ApiProperty({ example: '1500.00', description: 'Сумма в рублях (decimal-строка, до 2 знаков)' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a decimal string, e.g. "1500.00"' })
  amount!: string;

  @ApiProperty({ example: 'Т-Банк, карта 2200 xxxx xxxx 1234, Иванов И.И.', description: 'Реквизиты для перевода' })
  @IsString()
  @MinLength(3, { message: 'requisites must be at least 3 characters' })
  requisites!: string;
}

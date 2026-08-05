import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CreatePayoutRequestDto {
  @ApiProperty({ example: '1500.00', description: 'Сумма в рублях (decimal-строка, до 2 знаков)' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amount must be a decimal string, e.g. "1500.00"' })
  amount!: string;
}

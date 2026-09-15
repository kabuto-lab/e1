import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTonIntentDto {
  @ApiProperty({ format: 'uuid', description: 'ID бронирования (одна запись эскроу на бронь)' })
  @IsUUID('4')
  bookingId!: string;

  @ApiProperty({
    example: 'kQDWjUGiV3x2pCTqButaqRWK5MTp4rBmdH34YrRyqs7OzWIp',
    description:
      'TON-адрес клиента (friendly или raw) для возврата средств, если бронь будет отменена ' +
      'после оплаты — сохраняется вместе с эскроу, чтобы не запрашивать его вручную при рефанде.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  clientRefundAddress!: string;
}

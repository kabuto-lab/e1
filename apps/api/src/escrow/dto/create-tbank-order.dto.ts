import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateTbankOrderDto {
  @ApiProperty({ format: 'uuid', description: 'ID бронирования (одна запись эскроу на бронь)' })
  @IsUUID('4')
  bookingId!: string;
}

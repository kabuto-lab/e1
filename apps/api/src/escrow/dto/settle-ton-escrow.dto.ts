import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Завершить TON-эскроу без прямой on-chain отправки — см. TonEscrowService.settleWithoutPayout. */
export class SettleTonEscrowDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

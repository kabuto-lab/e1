import { ApiProperty } from '@nestjs/swagger';
import { TonEscrowClientViewResponseDto } from './ton-escrow-client-view.response';

export class RecordTonDepositResponseDto {
  @ApiProperty()
  idempotent!: boolean;

  @ApiProperty({ description: 'Полная сумма по эскроу достигнута' })
  fullyFunded!: boolean;

  @ApiProperty({ type: TonEscrowClientViewResponseDto })
  escrow!: TonEscrowClientViewResponseDto;
}

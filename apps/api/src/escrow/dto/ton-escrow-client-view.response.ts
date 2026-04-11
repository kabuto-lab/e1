import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Сериализованный эскроу `ton_usdt` для ЛК / Swagger (bigint → string).
 */
export class TonEscrowClientViewResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ enum: ['ton_usdt'] })
  paymentProvider!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  amountHeld!: string;

  @ApiPropertyOptional()
  currency?: string | null;

  @ApiPropertyOptional({ description: 'Ожидаемая сумма в минимальных единицах jetton' })
  expectedAmountAtomic?: string | null;

  @ApiPropertyOptional({ description: 'Уже учтённая сумма' })
  receivedAmountAtomic?: string | null;

  @ApiPropertyOptional()
  assetDecimals?: number | null;

  @ApiPropertyOptional({ enum: ['ton_mainnet', 'ton_testnet'] })
  network?: string | null;

  @ApiPropertyOptional({ description: 'Адрес jetton master (USDT)' })
  jettonMasterAddress?: string | null;

  @ApiPropertyOptional({ description: 'Treasury (куда слать jetton)' })
  treasuryAddress?: string | null;

  @ApiPropertyOptional({ description: 'Memo для перевода' })
  expectedMemo?: string | null;

  @ApiPropertyOptional()
  fundedTxHash?: string | null;

  @ApiPropertyOptional()
  releaseTxHash?: string | null;

  @ApiPropertyOptional()
  refundTxHash?: string | null;

  @ApiProperty()
  confirmations!: number;

  @ApiPropertyOptional({ description: 'Человекочитаемая ожидаемая сумма (jetton)' })
  expectedAmountHuman?: string | null;

  @ApiPropertyOptional({ description: 'Человекочитаемая полученная сумма' })
  receivedAmountHuman?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  fundedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  releasedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  refundedAt?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

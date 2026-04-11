import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { EscrowTonNetwork } from '@escort/db';

export class RecordTonDepositDto {
  @ApiProperty({ description: 'Memo из цепочки, должен совпадать с expected_memo эскроу' })
  @IsString()
  @MaxLength(128)
  memo!: string;

  @ApiProperty({ description: 'Хеш транзакции (уникален в системе)' })
  @IsString()
  @MaxLength(128)
  txHash!: string;

  @ApiProperty({ description: 'Отправитель (raw или нормализованная строка для БД)' })
  @IsString()
  @MaxLength(128)
  fromAddressRaw!: string;

  @ApiProperty({ description: 'Treasury, должен совпадать с эскроу' })
  @IsString()
  @MaxLength(128)
  treasuryAddressRaw!: string;

  @ApiProperty({ description: 'Jetton master, должен совпадать с эскроу' })
  @IsString()
  @MaxLength(128)
  jettonMasterRaw!: string;

  @ApiProperty({ example: '10500000', description: 'Сумма в минимальных единицах jetton' })
  @IsString()
  @Matches(/^\d+$/)
  amountAtomic!: string;

  @ApiPropertyOptional({ description: 'Подтверждения (блоки/индексер)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  confirmationCount?: number;

  @ApiPropertyOptional({ description: 'Logical time из TON (строка bigint)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  logicalTime?: string;

  @ApiPropertyOptional({ maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  indexerSource?: string;

  @ApiPropertyOptional({ description: 'Сырой payload индексера' })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['ton_mainnet', 'ton_testnet'] })
  @IsOptional()
  @IsIn(['ton_mainnet', 'ton_testnet'] satisfies EscrowTonNetwork[])
  network?: EscrowTonNetwork;
}

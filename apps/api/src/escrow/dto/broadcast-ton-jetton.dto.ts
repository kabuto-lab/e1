import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Тело для broadcast jetton (release или refund): адрес владельца получателя в TON. */
export class BroadcastTonJettonDto {
  @ApiProperty({ description: 'Friendly или raw TON-адрес владельца получателя (не jetton-wallet)' })
  @IsString()
  @MinLength(10)
  @MaxLength(120)
  recipientAddress!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ description: 'Только refund: причина отмены брони' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

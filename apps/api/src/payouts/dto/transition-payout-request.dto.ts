import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionPayoutRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected', 'paid'] })
  @IsEnum(['approved', 'rejected', 'paid'])
  status!: 'approved' | 'rejected' | 'paid';

  @ApiPropertyOptional({ description: 'Комментарий (например причина отказа или платёжная ссылка)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

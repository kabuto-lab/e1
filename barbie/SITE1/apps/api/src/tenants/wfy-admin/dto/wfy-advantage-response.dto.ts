/**
 * Response DTO для wfy-advantages эндпоинтов.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WfyAdvantageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'lucide-icon name или symbol-key' })
  iconName!: string | null;
  @ApiProperty() ord!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListWfyAdvantagesResponseDto {
  @ApiProperty({ type: [WfyAdvantageResponseDto] }) data!: WfyAdvantageResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

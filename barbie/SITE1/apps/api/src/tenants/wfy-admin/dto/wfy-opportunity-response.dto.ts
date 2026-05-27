/**
 * Response DTO для wfy-opportunities эндпоинтов.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WfyOpportunityResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) headline!: string | null;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'S3 key, module=wfy-opp' })
  coverImageKey!: string | null;
  @ApiProperty() ord!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListWfyOpportunitiesResponseDto {
  @ApiProperty({ type: [WfyOpportunityResponseDto] }) data!: WfyOpportunityResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

/**
 * Response DTO для wfy-partner-salons эндпоинтов.
 *
 * MVP: возвращаем raw logoMediaId (UUID). UI может отдельно запросить
 * /v1/media/:id для preview. Joined hydrate (logoMedia: MediaResponseDto)
 * — Iteration 2 если станет узким местом.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WfyPartnerSalonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) externalLink!: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'UUID медиа из nas.media' })
  logoMediaId!: string | null;
  @ApiProperty() ord!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListWfyPartnerSalonsResponseDto {
  @ApiProperty({ type: [WfyPartnerSalonResponseDto] }) data!: WfyPartnerSalonResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

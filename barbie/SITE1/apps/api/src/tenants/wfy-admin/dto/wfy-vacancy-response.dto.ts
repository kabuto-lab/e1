/**
 * Response DTO для wfy-vacancies эндпоинтов.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WfyVacancyResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tenantId!: string;
  @ApiProperty({ description: 'slug-код позиции, уникален в тенанте' }) code!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) summary!: string | null;
  @ApiProperty({ type: [String] }) requirements!: string[];
  @ApiProperty({ type: [String] }) conditions!: string[];
  @ApiProperty() ord!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListWfyVacanciesResponseDto {
  @ApiProperty({ type: [WfyVacancyResponseDto] }) data!: WfyVacancyResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

/**
 * Response DTO для girls-эндпоинтов.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GirlResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true, description: 'Свободные параметры (age/height/weight/breast/silicon/active/inactiveMedia)' })
  params!: Record<string, unknown>;
  @ApiProperty({ type: [String] }) mediaKeys!: string[];
  @ApiProperty() ord!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListGirlsResponseDto {
  @ApiProperty({ type: [GirlResponseDto] }) data!: GirlResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}

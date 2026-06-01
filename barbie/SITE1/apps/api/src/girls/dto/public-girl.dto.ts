/**
 * Public-facing DTO для каталога моделей на сайтах тенантов.
 *
 * В отличие от admin `GirlResponseDto` — отдаёт только публичные поля и уже
 * отфильтрованный список видимых фото (mediaKeys минус params.inactiveMedia).
 * Служебные флаги (active / activeTenants / inactiveMedia) наружу не уходят.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicGirlDto {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) age!: number | null;
  @ApiPropertyOptional({ nullable: true }) height!: number | null;
  @ApiPropertyOptional({ nullable: true }) weight!: number | null;
  @ApiPropertyOptional({ nullable: true }) breast!: number | null;
  @ApiProperty() silicon!: boolean;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: [String], description: 'Видимые фото-ключи по порядку; обложка первая' })
  photos!: string[];
}

export class PublicGirlsListDto {
  @ApiProperty({ type: [PublicGirlDto] }) data!: PublicGirlDto[];
  @ApiProperty() total!: number;
}

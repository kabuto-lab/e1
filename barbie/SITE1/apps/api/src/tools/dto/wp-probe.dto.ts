/**
 * WpProbeDto / WpProbeResultDto — payload для POST /v1/tools/wp-probe.
 *
 * Wizard вызывает этот endpoint после успешного /tools/analyze-site, чтобы
 * детектировать WordPress и понять, сколько контента в нём (pages/media/posts/menus).
 * Если isWp=true — UI предложит «import everything» путь через
 * /platform/tenants/bootstrap-wp вместо обычного /bootstrap.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class WpProbeDto {
  @ApiProperty({
    description: 'URL сайта-донора (любая публичная страница, чаще всего root).',
    example: 'https://example-spa.ru',
  })
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2000)
  url!: string;
}

export class WpProbeCountsDto {
  @ApiProperty({ description: 'Кол-во pages. -1 если endpoint ответил, но X-WP-Total отсутствует.' })
  pages!: number;
  @ApiProperty() media!: number;
  @ApiProperty() posts!: number;
  @ApiProperty({ description: 'Кол-во nav-menus (если есть /wp/v2/menus или плагин).' })
  menus!: number;
}

export class WpProbeResultDto {
  @ApiProperty({ description: 'true если /wp-json отвечает и содержит namespace wp/v2.' })
  isWp!: boolean;

  @ApiPropertyOptional({ description: 'Канонический /wp-json URL (без trailing slash).' })
  restApiUrl!: string | null;

  @ApiProperty({ type: WpProbeCountsDto })
  counts!: WpProbeCountsDto;

  @ApiPropertyOptional() siteName!: string | null;
  @ApiPropertyOptional() description!: string | null;

  @ApiProperty({
    type: [String],
    description: 'Дополнительные предупреждения/диагностика (для inline-показа в wizard).',
  })
  notes!: string[];
}

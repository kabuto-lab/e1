/**
 * /v1/public/girls — публичный каталог моделей для сайтов тенантов.
 * Без JWT, без tenant context. Отдаёт только активные карточки и видимые фото.
 *
 * ?tenant=<slug> — фильтр по params.activeTenants (модель показана на тенанте,
 * если activeTenants отсутствует/не массив = глобально, или содержит slug).
 * Без ?tenant — глобальный список всех активных (Class-G).
 */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { SkipTenant } from '../tenant-context/tenant.decorator';
import { GirlsService } from './girls.service';
import { PublicGirlDto, PublicGirlsListDto } from './dto/public-girl.dto';

@ApiTags('public · girls')
@Public()
@SkipTenant()
@Controller({ path: 'public/girls', version: '1' })
export class PublicGirlsController {
  constructor(private readonly service: GirlsService) {}

  @Get()
  @ApiOperation({ summary: 'Активные модели тенанта (фильтр по activeTenants)' })
  @ApiQuery({ name: 'tenant', required: false, description: 'slug тенанта' })
  list(@Query('tenant') tenant?: string): Promise<PublicGirlsListDto> {
    return this.service.listPublic(tenant);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Публичная карточка модели по slug' })
  getBySlug(@Param('slug') slug: string): Promise<PublicGirlDto> {
    return this.service.getPublicBySlug(slug);
  }
}

/**
 * /v1/public/tenants/:slug/menu — public read-only for tenant landing pages.
 * Без JWT, без tenant context. Возвращает только active items активного тенанта.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { SkipTenant } from '../tenant-context/tenant.decorator';
import { MenuService } from './menu.service';
import { PublicMenuResponseDto } from './dto/menu-item-response.dto';

@ApiTags('public · menu')
@Public()
@SkipTenant()
@Controller({ path: 'public/tenants', version: '1' })
export class PublicMenuController {
  constructor(private readonly service: MenuService) {}

  @Get(':slug/menu')
  @ApiOperation({ summary: 'Public menu tree by tenant slug (active items only)' })
  getBySlug(@Param('slug') slug: string): Promise<PublicMenuResponseDto> {
    return this.service.getPublicMenuBySlug(slug);
  }
}

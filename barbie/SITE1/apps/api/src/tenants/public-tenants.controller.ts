/**
 * /v1/public/tenants — public read для landing-страниц.
 * Без JWT, без tenant context. Доступ к данным только активных тенантов.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { SkipTenant } from '../tenant-context/tenant.decorator';
import { TenantsService } from './tenants.service';
import { PublicTenantResponseDto } from './dto/public-tenant.dto';

@ApiTags('public · tenants')
@Public()
@SkipTenant()
@Controller({ path: 'public/tenants', version: '1' })
export class PublicTenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get tenant landing data by slug (active tenants only)' })
  getBySlug(@Param('slug') slug: string): Promise<PublicTenantResponseDto> {
    return this.service.getPublicTenantBySlug(slug);
  }

  @Get('by-slug/:slug/wfy-bundle')
  @ApiOperation({
    summary: 'Get bundled wfy-city-dir tenant data (cities/opps/advs/salons/vacancies). ' +
      '404 when tenant is missing, not active, or site_type ≠ wfy-city-dir.',
  })
  getWfyBundle(@Param('slug') slug: string) {
    return this.service.getWfyBundle(slug);
  }
}

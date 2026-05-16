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
}

import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SkipTenant } from '../tenant-context/tenant.decorator';
import { TenantGuard } from '../tenant-context/tenant.guard';
import { RequireRole } from '../common/decorators/require-role.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { ToolsService } from './tools.service';
import { AnalyzeSiteDto } from './dto/analyze-site.dto';
import { SiteAnalysisDto } from './dto/site-analysis.dto';
import { WpProbeDto, WpProbeResultDto } from './dto/wp-probe.dto';

@ApiTags('tools')
@ApiBearerAuth()
@UseGuards(TenantGuard, RolesGuard)
@Controller({ path: 'tools', version: '1' })
export class ToolsController {
  constructor(private readonly service: ToolsService) {}

  @Post('analyze-site')
  @SkipTenant() // tool глобальный, не зависит от тенанта; JWT всё равно требуем
  @RequireRole('tenant-admin', 'salon-manager', 'platform-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch a public URL and extract identity / typography / palette / structure.',
    description:
      'SSRF-protected: blocks private/loopback/CGNAT IPs and *.local / *.lvh.me hostnames. ' +
      'Body capped at 2MB, fetch timeout 10s. Returns structured analysis for prototype generation.',
  })
  analyzeSite(@Body() dto: AnalyzeSiteDto): Promise<SiteAnalysisDto> {
    return this.service.analyzeSite(dto);
  }

  @Post('wp-probe')
  @SkipTenant()
  @RequireRole('platform-admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Детектировать WordPress по URL + посчитать pages/media/posts/menus.',
    description:
      'Пробует /wp-json + namespace wp/v2; для каждого resource type делает per_page=1 GET ' +
      'и читает X-WP-Total. Используется wizard /admin/projects/new чтобы предложить ' +
      'full-import маршрут (bootstrap-wp) вместо обычного bootstrap.',
  })
  wpProbe(@Body() dto: WpProbeDto): Promise<WpProbeResultDto> {
    return this.service.probeWordPress(dto.url);
  }
}

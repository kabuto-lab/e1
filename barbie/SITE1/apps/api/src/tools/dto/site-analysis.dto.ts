import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NavItemDto {
  @ApiProperty({ description: 'Текст пункта меню', example: 'Услуги' })
  label!: string;

  @ApiProperty({
    description: 'href как был указан в HTML, normalized to absolute URL when possible.',
    example: '/services',
  })
  href!: string;

  @ApiProperty({
    description: '0 = root-уровень, 1 = nested. Извлекается из вложенности <ul><li><a>.',
    example: 0,
  })
  depth!: number;
}

export class GuessedRolesDto {
  @ApiProperty({ description: 'Фон (lightest)', example: '#FFFFFF' })
  bg!: string;

  @ApiProperty({ description: 'Heading / тёмный контраст', example: '#0A0A0A' })
  head!: string;

  @ApiProperty({ description: 'Accent / самый насыщенный', example: '#D4AF37' })
  acc!: string;
}

export class SiteIdentityDto {
  @ApiProperty() url!: string;
  @ApiProperty() finalUrl!: string;
  @ApiProperty() httpStatus!: number;
  @ApiProperty() bytesFetched!: number;
  @ApiProperty() durationMs!: number;
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() lang?: string;
  @ApiPropertyOptional() ogTitle?: string;
  @ApiPropertyOptional() ogDescription?: string;
  @ApiPropertyOptional() ogImage?: string;
  @ApiPropertyOptional() favicon?: string;
}

export class TypographyDto {
  @ApiProperty({ type: [String] }) fontFamilies!: string[];
  @ApiProperty({ type: [String] }) googleFonts!: string[];
  @ApiProperty({ type: [String] }) stylesheets!: string[];
}

export class ColorEntryDto {
  @ApiProperty() value!: string;
  @ApiProperty() count!: number;
}

export class PaletteDto {
  @ApiProperty({ type: [ColorEntryDto] }) hex!: ColorEntryDto[];
  @ApiProperty({ type: [ColorEntryDto] }) rgb!: ColorEntryDto[];
}

export class StructureDto {
  @ApiProperty() h1Count!: number;
  @ApiProperty() h2Count!: number;
  @ApiProperty() h3Count!: number;
  @ApiProperty() sectionCount!: number;
  @ApiProperty({ type: [String] }) h1Texts!: string[];
  @ApiProperty({ type: [String] }) h2Texts!: string[];
  @ApiProperty({ type: [String] }) ctaTexts!: string[];
}

export class ImageEntryDto {
  @ApiProperty() src!: string;
  @ApiPropertyOptional() alt?: string;
}

export class SiteAnalysisDto {
  @ApiProperty({ type: SiteIdentityDto }) identity!: SiteIdentityDto;
  @ApiProperty({ type: TypographyDto }) typography!: TypographyDto;
  @ApiProperty({ type: PaletteDto }) palette!: PaletteDto;
  @ApiProperty({ type: StructureDto }) structure!: StructureDto;
  @ApiProperty({ type: [ImageEntryDto] }) images!: ImageEntryDto[];

  @ApiProperty({
    type: [NavItemDto],
    description: 'Извлечённые <nav>/<header> пункты меню (max 30).',
  })
  navigation!: NavItemDto[];

  @ApiProperty({
    description:
      'Эвристика: page выглядит как SPA-shell (h1=0, sections=0, images<3). ' +
      'Wizard показывает warning — content может быть hydrated JS и недоступен парсеру.',
  })
  isSpa!: boolean;

  @ApiProperty({
    type: GuessedRolesDto,
    description:
      'Предложение auto-assign: bg = lightest hex, head = darkest, acc = max saturation. ' +
      'Пользователь может переопределить через color picker.',
  })
  guessedRoles!: GuessedRolesDto;

  @ApiProperty({ description: 'Notes / warnings raised during analysis', type: [String] })
  notes!: string[];
}

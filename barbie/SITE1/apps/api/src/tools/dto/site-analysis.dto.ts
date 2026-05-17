import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ description: 'Notes / warnings raised during analysis', type: [String] })
  notes!: string[];
}

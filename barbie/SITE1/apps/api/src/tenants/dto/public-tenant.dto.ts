import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicProgramDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional() duration?: string | null;
  @ApiPropertyOptional() price?: string | null;
  @ApiProperty() description!: string;
}

export class PublicRoomDto {
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
}

export class PublicStaffDto {
  @ApiProperty() name!: string;
  @ApiProperty() tag!: string;
  @ApiPropertyOptional() age?: number | null;
}

export class PublicAddressDto {
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() street?: string | null;
  @ApiPropertyOptional() metro?: string | null;
}

export class PublicSocialDto {
  @ApiPropertyOptional() telegram?: string | null;
  @ApiPropertyOptional() instagram?: string | null;
  @ApiPropertyOptional() whatsapp?: string | null;
}

export class PublicDesignTokensDto {
  @ApiProperty() bg!: string;
  @ApiProperty() headColor!: string;
  @ApiProperty() headFont!: string;
  @ApiProperty() accColor!: string;
  @ApiProperty() accFont!: string;
  @ApiProperty() bodyColor!: string;
  @ApiProperty() bodyFont!: string;
  @ApiProperty({ enum: ['top-classic', 'mega-images', 'vertical-side'] })
  navTemplate!: 'top-classic' | 'mega-images' | 'vertical-side';
}

export class PublicTenantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() brand!: string;
  @ApiPropertyOptional() primaryDomain?: string | null;
  @ApiProperty() domain!: string;
  @ApiProperty() tagline!: string;
  @ApiProperty() positioning!: string;
  @ApiProperty() aesthetic!: string;
  @ApiProperty({ type: PublicAddressDto }) address!: PublicAddressDto;
  @ApiProperty({ type: [String] }) phones!: string[];
  @ApiPropertyOptional() workingHours?: string | null;
  @ApiProperty({ type: [PublicProgramDto] }) programs!: PublicProgramDto[];
  @ApiProperty({ type: [PublicRoomDto] }) rooms!: PublicRoomDto[];
  @ApiProperty({ type: [PublicStaffDto] }) staff!: PublicStaffDto[];
  @ApiProperty({ type: [String] }) navigation!: string[];
  @ApiProperty({ type: PublicSocialDto }) social!: PublicSocialDto;
  @ApiProperty({ type: PublicDesignTokensDto }) designTokens!: PublicDesignTokensDto;
}

/**
 * Shape of `tenants.settings.landingContent` jsonb.
 * Not declared on the TenantSettings type in schema (would require spine touch);
 * read with a runtime cast in the service layer.
 */
export interface TenantLandingContent {
  brand?: string;
  tagline?: string;
  positioning?: string;
  aesthetic?: string;
  address?: { city?: string | null; street?: string | null; metro?: string | null };
  phones?: string[];
  workingHours?: string | null;
  programs?: { name: string; duration?: string | null; price?: string | null; description: string }[];
  rooms?: { name: string; description: string }[];
  staff?: { name: string; tag: string; age?: number | null }[];
  navigation?: string[];
  social?: { telegram?: string | null; instagram?: string | null; whatsapp?: string | null };
}

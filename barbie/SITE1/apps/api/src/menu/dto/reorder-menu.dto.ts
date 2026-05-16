import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderChangeDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderMenuDto {
  @ApiProperty({ type: [ReorderChangeDto], description: 'List of items to update in one transaction' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderChangeDto)
  changes!: ReorderChangeDto[];
}

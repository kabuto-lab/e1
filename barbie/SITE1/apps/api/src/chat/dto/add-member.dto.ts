import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ['member', 'admin'], required: false, default: 'member' })
  @IsOptional()
  @IsIn(['member', 'admin'])
  role?: 'member' | 'admin';
}

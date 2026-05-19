import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class SetStaffRolePermissionDepartmentsDto {
  @IsInt()
  @Type(() => Number)
  role_id: number;

  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  department_ids: number[];
}

export class GetStaffRolePermissionDepartmentsQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  role_id?: number;

  @IsOptional()
  @IsString()
  role_code?: string;
}

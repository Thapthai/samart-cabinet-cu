import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  RegenerateClientSecretDto,
  StaffLoginDto,
} from '../auth/dto/staff-user.dto';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from '../auth/dto/staff-role.dto';
import { BulkUpdateStaffRolePermissionsDto } from '../auth/dto/staff-role-permission.dto';
import {
  GetStaffRolePermissionDepartmentsQueryDto,
  SetStaffRolePermissionDepartmentsDto,
} from '../auth/dto/staff-role-permission-department.dto';

@Controller('staff-users')
export class StaffUsersController {
  constructor(private readonly staffService: StaffService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: StaffLoginDto) {
    return this.staffService.loginStaffUser(dto.email, dto.password);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
  ) {
    const params = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword: keyword?.trim() || undefined,
    };
    return this.staffService.findAllStaffUsers(params);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOneStaffUser(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto) {
    try {
      return await this.staffService.createStaffUser(dto);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const message = err?.message ?? String(err);
      if (err?.code === 'P2003') throw new BadRequestException('Department or role not found. Please check department_id and role.');
      throw new BadRequestException(message || 'Failed to create staff user');
    }
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffUserDto,
  ) {
    return this.staffService.updateStaffUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.deleteStaffUser(id);
  }

  @Post(':id/regenerate-secret')
  async regenerateSecret(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegenerateClientSecretDto,
  ) {
    return this.staffService.regenerateClientSecret(id, dto);
  }
}

@Controller('staff-roles')
export class StaffRolesController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll() {
    return this.staffService.findAllStaffRoles();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.findOneStaffRole(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffRoleDto) {
    return this.staffService.createStaffRole(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffRoleDto,
  ) {
    return this.staffService.updateStaffRole(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.staffService.deleteStaffRole(id);
  }
}

@Controller('staff-role-permissions')
export class StaffRolePermissionsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll() {
    return this.staffService.findAllStaffRolePermissions();
  }

  @Get(':role')
  async getByRole(@Param('role') role: string) {
    return this.staffService.findPermissionsByRoleCode(role);
  }

  @Put('bulk')
  async bulkUpdate(@Body() dto: BulkUpdateStaffRolePermissionsDto) {
    const list = (dto.permissions ?? []).map((p) => ({
      role_code: p.role_code,
      role_id: p.role_id,
      menu_href: p.menu_href,
      can_access: p.can_access ?? true,
    }));
    return this.staffService.bulkUpdateStaffRolePermissions(list);
  }
}

@Controller('staff-role-permission-departments')
export class StaffRolePermissionDepartmentsController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async getByRole(@Query() query: GetStaffRolePermissionDepartmentsQueryDto) {
    if (query.role_id == null && !query.role_code?.trim()) {
      throw new BadRequestException('role_id or role_code is required');
    }
    return this.staffService.getStaffRolePermissionDepartments({
      role_id: query.role_id,
      role_code: query.role_code,
    });
  }

  @Put()
  async set(@Body() dto: SetStaffRolePermissionDepartmentsDto) {
    return this.staffService.setStaffRolePermissionDepartments(
      dto.role_id,
      dto.department_ids ?? [],
    );
  }
}

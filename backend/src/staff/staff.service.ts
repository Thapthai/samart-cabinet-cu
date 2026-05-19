import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ClientCredentialStrategy } from '../auth/strategies/client-credential.strategy';
import {
  CreateStaffUserDto,
  UpdateStaffUserDto,
  RegenerateClientSecretDto,
} from '../auth/dto/staff-user.dto';
import { CreateStaffRoleDto, UpdateStaffRoleDto } from '../auth/dto/staff-role.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientCredentialStrategy: ClientCredentialStrategy,
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
  ) {}

  private staffWhere(id?: number): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = { is_admin: false };
    if (id != null) base.id = id;
    return base;
  }

  private async resolveRoleId(role_code?: string, role_id?: number): Promise<number | null> {
    if (role_id != null) return role_id;
    if (!role_code?.trim()) return null;
    const role = await this.prisma.staffRole.findUnique({
      where: { code: role_code.trim() },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  /** ใช้ login รวมจาก AuthService — response มี userType */
  async loginStaffUser(email: string, password: string) {
    return this.authService.login({ email, password });
  }

  async findAllStaffUsers(params?: { page?: number; limit?: number; keyword?: string }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 50));
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = { is_admin: false };
    if (params?.keyword?.trim()) {
      const k = params.keyword.trim();
      where.OR = [
        { email: { contains: k } },
        { fname: { contains: k } },
        { lname: { contains: k } },
        { client_id: { contains: k } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          role: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const list = data.map((u) => ({
      id: u.id,
      email: u.email,
      fname: u.fname,
      lname: u.lname,
      role: u.role?.code ?? null,
      role_id: u.role_id,
      client_id: u.client_id,
      expires_at: u.expires_at?.toISOString?.() ?? null,
      is_active: u.is_active,
      created_at: u.created_at?.toISOString?.() ?? null,
      updated_at: u.updated_at?.toISOString?.() ?? null,
    }));
    return { success: true, data: list, total, page, limit, lastPage: Math.ceil(total / limit) };
  }

  async createStaffUser(dto: CreateStaffUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.trim() } });
    if (existing) throw new BadRequestException('Email already exists');

    let roleId: number | null = null;
    const requestedRoleId = dto.role_id ?? dto.role;
    if (requestedRoleId != null) {
      const role = await this.prisma.staffRole.findUnique({
        where: { id: requestedRoleId },
        select: { id: true },
      });
      if (!role) throw new BadRequestException(`Role with ID ${requestedRoleId} not found`);
      roleId = role.id;
    }

    const password =
      dto.password?.trim() && dto.password.length >= 8
        ? await bcrypt.hash(dto.password, 10)
        : await bcrypt.hash('password123', 10);

    const { client_id, client_secret, client_secret_hash } =
      this.clientCredentialStrategy.generateClientCredential();

    const expiresAt = dto.expires_at?.trim() ? new Date(dto.expires_at) : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.trim(),
        fname: dto.fname.trim(),
        lname: dto.lname.trim(),
        role_id: roleId,
        password,
        is_admin: false,
        client_id,
        client_secret: client_secret_hash,
        expires_at: expiresAt,
      },
    });
    return {
      success: true,
      message: 'Staff user created',
      data: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        client_id,
        client_secret,
      },
    };
  }

  async findOneStaffUser(id: number) {
    const user = await this.prisma.user.findFirst({
      where: this.staffWhere(id),
      include: {
        role: { select: { id: true, code: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('Staff user not found');
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fname: user.fname,
        lname: user.lname,
        role: user.role?.code ?? null,
        role_id: user.role_id,
        client_id: user.client_id,
        expires_at: user.expires_at?.toISOString?.() ?? null,
        is_active: user.is_active,
        created_at: user.created_at?.toISOString?.() ?? null,
        updated_at: user.updated_at?.toISOString?.() ?? null,
      },
    };
  }

  async updateStaffUser(id: number, dto: UpdateStaffUserDto) {
    const user = await this.prisma.user.findFirst({ where: this.staffWhere(id) });
    if (!user) throw new NotFoundException('Staff user not found');

    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email.trim();
    if (dto.fname !== undefined) data.fname = dto.fname.trim();
    if (dto.lname !== undefined) data.lname = dto.lname.trim();
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    if (dto.expires_at !== undefined) data.expires_at = dto.expires_at?.trim() ? new Date(dto.expires_at) : null;

    const roleId = await this.resolveRoleId(dto.role_code, dto.role_id);
    if (dto.role_code !== undefined || dto.role_id !== undefined) {
      if (roleId == null) throw new BadRequestException('role_code or role_id is invalid');
      data.role = { connect: { id: roleId } };
    }

    if (dto.password?.trim() && dto.password.length >= 8) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({ where: { id }, data });
    return { success: true, message: 'Staff user updated' };
  }

  async deleteStaffUser(id: number) {
    const user = await this.prisma.user.findFirst({ where: this.staffWhere(id) });
    if (!user) throw new NotFoundException('Staff user not found');
    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'Staff user deleted' };
  }

  async regenerateClientSecret(id: number, dto?: RegenerateClientSecretDto) {
    const user = await this.prisma.user.findFirst({ where: this.staffWhere(id) });
    if (!user) throw new NotFoundException('Staff user not found');

    const { client_id, client_secret, client_secret_hash } =
      this.clientCredentialStrategy.generateClientCredential();
    const expiresAt = dto?.expires_at?.trim() ? new Date(dto.expires_at) : user.expires_at;

    await this.prisma.user.update({
      where: { id },
      data: { client_secret: client_secret_hash, client_id, expires_at: expiresAt },
    });
    return {
      success: true,
      message: 'Client secret regenerated',
      data: { client_id, client_secret },
    };
  }

  async findAllStaffRoles() {
    const list = await this.prisma.staffRole.findMany({
      orderBy: { code: 'asc' },
    });
    return { success: true, data: list };
  }

  async findOneStaffRole(id: number) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    return { success: true, data: role };
  }

  async createStaffRole(dto: CreateStaffRoleDto) {
    const existing = await this.prisma.staffRole.findUnique({ where: { code: dto.code.trim() } });
    if (existing) throw new BadRequestException('Role code already exists');
    const role = await this.prisma.staffRole.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        is_active: dto.is_active ?? true,
      },
    });
    return { success: true, message: 'Role created', data: role };
  }

  async updateStaffRole(id: number, dto: UpdateStaffRoleDto) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    const data: Prisma.StaffRoleUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;
    await this.prisma.staffRole.update({ where: { id }, data });
    return { success: true, message: 'Role updated' };
  }

  async deleteStaffRole(id: number) {
    const role = await this.prisma.staffRole.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Staff role not found');
    await this.prisma.staffRole.delete({ where: { id } });
    return { success: true, message: 'Role deleted' };
  }

  async findAllStaffRolePermissions() {
    const list = await this.prisma.staffRolePermission.findMany({
      orderBy: [{ role_id: 'asc' }, { menu_href: 'asc' }],
      include: {
        role: { select: { id: true, code: true, name: true } },
      },
    });
    const data = list.map((p) => ({
      id: p.id,
      role_id: p.role_id,
      role_code: p.role?.code ?? null,
      menu_href: p.menu_href,
      can_access: p.can_access,
      created_at: p.created_at?.toISOString?.() ?? null,
      updated_at: p.updated_at?.toISOString?.() ?? null,
      role: p.role ? { code: p.role.code, name: p.role.name } : null,
    }));
    return { success: true, data };
  }

  async findPermissionsByRoleCode(roleCode: string) {
    const role = await this.prisma.staffRole.findUnique({
      where: { code: roleCode.trim() },
      select: { id: true },
    });
    if (!role) return { success: true, data: [] };
    const list = await this.prisma.staffRolePermission.findMany({
      where: { role_id: role.id },
      orderBy: { menu_href: 'asc' },
      select: { menu_href: true, can_access: true },
    });
    return { success: true, data: list };
  }

  async bulkUpdateStaffRolePermissions(
    permissions: Array<{ role_code?: string; role_id?: number; menu_href: string; can_access: boolean }>,
  ) {
    let updated = 0;
    for (const p of permissions) {
      const roleId = await this.resolveRoleId(p.role_code, p.role_id);
      if (roleId == null || !p.menu_href?.trim()) continue;
      const menu_href = p.menu_href.trim();
      await this.prisma.staffRolePermission.upsert({
        where: {
          role_menu_href: { role_id: roleId, menu_href },
        },
        create: { role_id: roleId, menu_href, can_access: p.can_access ?? true },
        update: { can_access: p.can_access ?? true },
      });
      updated++;
    }
    return { success: true, message: 'Permissions updated', updatedCount: updated };
  }

  /** แผนกที่ role เข้าถึงได้ — ไม่มีแถว = unrestricted (เห็นทุกแผนก) */
  async getStaffRolePermissionDepartments(params: {
    role_id?: number;
    role_code?: string;
  }) {
    const roleId = await this.resolveRoleId(params.role_code, params.role_id);
    if (roleId == null) throw new NotFoundException('Staff role not found');

    const role = await this.prisma.staffRole.findUnique({
      where: { id: roleId },
      select: { id: true, code: true, name: true },
    });
    if (!role) throw new NotFoundException('Staff role not found');

    const rows = await this.prisma.staffRolePermissionDepartment.findMany({
      where: { role_id: roleId },
      orderBy: { department_id: 'asc' },
      include: {
        department: { select: { ID: true, DepName: true, DepName2: true } },
      },
    });

    return {
      success: true,
      data: {
        role_id: roleId,
        role_code: role.code,
        role_name: role.name,
        unrestricted: rows.length === 0,
        departments: rows.map((r) => ({
          id: r.department_id,
          DepName: r.department?.DepName ?? null,
          DepName2: r.department?.DepName2 ?? null,
        })),
      },
    };
  }

  async setStaffRolePermissionDepartments(roleId: number, departmentIds: number[]) {
    const role = await this.prisma.staffRole.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Staff role not found');

    const uniqueIds = [...new Set(departmentIds.filter((id) => Number.isInteger(id) && id > 0))];

    if (uniqueIds.length > 0) {
      const found = await this.prisma.department.findMany({
        where: { ID: { in: uniqueIds } },
        select: { ID: true },
      });
      const foundSet = new Set(found.map((d) => d.ID));
      const missing = uniqueIds.filter((id) => !foundSet.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(`ไม่พบแผนก ID: ${missing.join(', ')}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.staffRolePermissionDepartment.deleteMany({ where: { role_id: roleId } });
      if (uniqueIds.length > 0) {
        await tx.staffRolePermissionDepartment.createMany({
          data: uniqueIds.map((department_id) => ({ role_id: roleId, department_id })),
        });
      }
    });

    return {
      success: true,
      message:
        uniqueIds.length === 0
          ? 'ไม่จำกัดแผนก — Role นี้เห็นทุก Division'
          : `บันทึกจำกัดแผนก ${uniqueIds.length} รายการ`,
      data: { role_id: roleId, department_count: uniqueIds.length },
    };
  }
}

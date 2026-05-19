import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ClientCredentialStrategy } from '../auth/strategies/client-credential.strategy';
import { StaffService } from './staff.service';
import {
  StaffUsersController,
  StaffRolesController,
  StaffRolePermissionsController,
  StaffRolePermissionDepartmentsController,
} from './staff.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    StaffUsersController,
    StaffRolesController,
    StaffRolePermissionsController,
    StaffRolePermissionDepartmentsController,
  ],
  providers: [StaffService, ClientCredentialStrategy],
  exports: [StaffService],
})
export class StaffModule {}

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplate } from '../email/dto/email.dto';
import {
  LoginDto,
  RegisterDto,
  ApiKeyCreateDto,
  RefreshTokenDto,
  FirebaseLoginDto,
} from './dto/auth.dto';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ClientCredentialStrategy } from './strategies/client-credential.strategy';
import { TOTPService } from './services/totp.service';
import { EmailOTPService } from './services/email-otp.service';
import { FirebaseService } from './services/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
    private email: EmailService,
    private apiKeyStrategy: ApiKeyStrategy,
    private clientCredentialStrategy: ClientCredentialStrategy,
    private totpService: TOTPService,
    private emailOTPService: EmailOTPService,
    private firebaseService: FirebaseService,
  ) {}

  private async sendWelcomeEmail(email: string, name: string) {
    return this.email.sendTemplateEmail({
      to: email,
      template: EmailTemplate.WELCOME,
      templateData: {
        name,
        email,
        appName: process.env.APP_NAME || 'POSE',
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
        createdAt: new Date().toLocaleString('th-TH'),
      },
    });
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: registerDto.email } });
    if (existing) return { success: false, message: 'User already exists' };
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
      },
    });
    const token = this.jwt.sign({ sub: user.id, email: user.email, name: user.name });
    this.sendWelcomeEmail(user.email, user.name).catch((e) => console.error('Welcome email failed', e));
    return {
      success: true,
      message: 'User registered successfully',
      data: { user: { id: user.id, email: user.email, name: user.name }, token },
    };
  }

  /** รายการผู้ใช้ JWT (ตาราง app_microservice_users) — ไม่ส่งรหัสผ่าน */
  async listAdminUsers(filters?: { search?: string; isActive?: boolean }) {
    const where: Prisma.UserWhereInput = {};
    const q = filters?.search?.trim();
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { name: { contains: q } },
      ];
    }
    if (filters?.isActive !== undefined) {
      where.is_active = filters.isActive;
    }

    const rows = await this.prisma.user.findMany({
      where,
      take: 500,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
        email_verified: true,
        preferred_auth_method: true,
        last_login_at: true,
        two_factor_enabled: true,
        created_at: true,
        updated_at: true,
        password: true,
      },
    });

    const data = rows.map(({ password, ...rest }) => ({
      ...rest,
      has_password: Boolean(password),
    }));

    return { success: true, data };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email } });
    if (!user) return { success: false, message: 'Invalid credentials' };
    if (!user.is_active) return { success: false, message: 'Account is deactivated' };
    if (!user.password) return { success: false, message: 'Please use OAuth login' };
    const valid = await bcrypt.compare(loginDto.password, user.password);
    if (!valid) return { success: false, message: 'Invalid credentials' };

    if (user.two_factor_enabled) {
      const tempToken = this.jwt.sign(
        { sub: user.id, email: user.email, temp2FA: true },
        { expiresIn: '10m' },
      );
      return {
        success: true,
        message: '2FA verification required',
        requiresTwoFactor: true,
        data: { tempToken, user: { id: user.id, email: user.email, name: user.name, two_factor_enabled: true } },
      };
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    const token = this.jwt.sign({ sub: user.id, email: user.email, name: user.name });
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          two_factor_enabled: user.two_factor_enabled,
          preferred_auth_method: user.preferred_auth_method,
          hasPassword: !!user.password,
        },
        token,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwt.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, is_active: true, two_factor_enabled: true, preferred_auth_method: true },
      });
      if (!user || !user.is_active) return { success: false, message: 'User not found or inactive' };
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            two_factor_enabled: user.two_factor_enabled,
            preferred_auth_method: user.preferred_auth_method,
            hasPassword: true,
          },
        },
      };
    } catch {
      return { success: false, message: 'Invalid token' };
    }
  }

  async firebaseLogin(dto: FirebaseLoginDto) {
    try {
      const decoded = await this.firebaseService.verifyIdToken(dto.idToken);
      let user = await this.prisma.user.findUnique({ where: { firebase_uid: decoded.uid } });
      if (!user) {
        user = await this.prisma.user.findUnique({ where: { email: decoded.email } });
        if (user) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { firebase_uid: decoded.uid, profile_picture: decoded.picture ?? user.profile_picture },
          });
        } else {
          user = await this.prisma.user.create({
            data: {
              email: decoded.email || `${decoded.uid}@firebase`,
              name: decoded.name || decoded.email || 'User',
              firebase_uid: decoded.uid,
              profile_picture: decoded.picture,
            },
          });
        }
      }
      if (!user.is_active) return { success: false, message: 'Account is deactivated' };
      await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
      const token = this.jwt.sign({ sub: user.id, email: user.email, name: user.name });
      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            two_factor_enabled: user.two_factor_enabled,
            preferred_auth_method: user.preferred_auth_method,
            hasPassword: !!user.password,
          },
          token,
        },
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Firebase login failed' };
    }
  }

  async enable2FA(data: { user_id: number; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: data.user_id } });
    if (!user) return { success: false, message: 'User not found' };
    if (user.two_factor_enabled) return { success: false, message: '2FA is already enabled' };
    if (user.password && !(await bcrypt.compare(data.password, user.password))) {
      return { success: false, message: 'Invalid password' };
    }
    const totpSetup = await this.totpService.generateTOTPSetup(user.email);
    return {
      success: true,
      message: '2FA setup initiated',
      data: { qrCodeUrl: totpSetup.qrCodeDataURL, secret: totpSetup.secret },
    };
  }

  async verify2FASetup(data: { user_id: number; secret: string; token: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: data.user_id } });
    if (!user) return { success: false, message: 'User not found' };
    if (!this.totpService.verifyTOTP(data.token, data.secret)) {
      return { success: false, message: 'Invalid verification code' };
    }
    const backup_codes = this.totpService.generateBackupCodes();
    const hashed = this.totpService.hashBackupCodes(backup_codes);
    await this.prisma.user.update({
      where: { id: data.user_id },
      data: {
        two_factor_enabled: true,
        two_factor_secret: data.secret,
        backup_codes: JSON.stringify(hashed),
        two_factor_verified_at: new Date(),
      },
    });
    return { success: true, message: '2FA enabled successfully', data: { backup_codes } };
  }

  async disable2FA(user_id: number, password: string, token?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) return { success: false, message: 'User not found' };
    if (!user.two_factor_enabled) return { success: false, message: '2FA is not enabled' };
    if (user.password && !(await bcrypt.compare(password, user.password))) {
      return { success: false, message: 'Invalid password' };
    }
    if (user.two_factor_secret && token && !this.totpService.verifyTOTP(token, user.two_factor_secret)) {
      const ok = user.backup_codes && this.totpService.verifyBackupCode(token, user.backup_codes);
      if (!ok) return { success: false, message: 'Invalid 2FA code' };
    }
    await this.prisma.user.update({
      where: { id: user_id },
      data: { two_factor_enabled: false, two_factor_secret: null, backup_codes: null, two_factor_verified_at: null },
    });
    return { success: true, message: '2FA disabled' };
  }

  async loginWith2FA(tempToken: string, code: string, type: string = 'totp') {
    try {
      const payload = this.jwt.verify(tempToken);
      if (!payload.temp2FA) return { success: false, message: 'Invalid token' };
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.two_factor_enabled) return { success: false, message: 'User not found or 2FA not enabled' };
      let valid = false;
      if (type === 'totp' && user.two_factor_secret) valid = this.totpService.verifyTOTP(code, user.two_factor_secret);
      else if (type === 'backup_code' && user.backup_codes) valid = this.totpService.verifyBackupCode(code, user.backup_codes);
      else if (type === 'email_otp') {
        const res = await this.emailOTPService.verifyEmailOTP(user.id, code);
        valid = res.success;
      }
      if (!valid) return { success: false, message: 'Invalid 2FA code' };
      await this.prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
      const token = this.jwt.sign({ sub: user.id, email: user.email, name: user.name });
      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            two_factor_enabled: user.two_factor_enabled,
            preferred_auth_method: user.preferred_auth_method,
            hasPassword: !!user.password,
          },
          token,
        },
      };
    } catch {
      return { success: false, message: '2FA login failed' };
    }
  }

  async getUserProfile(user_id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { id: true, email: true, name: true, profile_picture: true, email_verified: true, two_factor_enabled: true, preferred_auth_method: true, created_at: true },
    });
    if (!user) return { success: false, message: 'User not found' };
    return { success: true, data: user };
  }

  async updateUserProfile(user_id: number, updateData: { name?: string; email?: string; preferred_auth_method?: string }, currentPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) return { success: false, message: 'User not found' };
    if (user.password && !currentPassword) return { success: false, message: 'Password required' };
    if (user.password && currentPassword && !(await bcrypt.compare(currentPassword, user.password))) {
      return { success: false, message: 'Invalid password' };
    }
    if (updateData.email && updateData.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: updateData.email } });
      if (exists) return { success: false, message: 'Email already in use' };
    }
    const updated = await this.prisma.user.update({
      where: { id: user_id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.email && { email: updateData.email }),
        ...(updateData.preferred_auth_method && { preferred_auth_method: updateData.preferred_auth_method }),
      },
    });
    return { success: true, data: updated };
  }

  async changePassword(user_id: number, currentPassword: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) return { success: false, message: 'Passwords do not match' };
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user || !user.password) return { success: false, message: 'User not found or cannot change password' };
    if (!(await bcrypt.compare(currentPassword, user.password))) return { success: false, message: 'Current password incorrect' };
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: user_id }, data: { password: hashed } });
    return { success: true, message: 'Password changed' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: true, message: 'If the email exists, a reset link will be sent' };
    // TODO: generate reset token and send email
    return { success: true, message: 'If the email exists, a reset link will be sent' };
  }

  async createApiKey(user_id: number, dto: ApiKeyCreateDto) {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) return { success: false, message: 'User not found' };
    const { key, hash, prefix } = this.apiKeyStrategy.generateApiKey();
    const apiKey = await this.prisma.apiKey.create({
      data: {
        user_id,
        name: dto.name,
        description: dto.description,
        key_hash: hash,
        prefix,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      },
    });
    return { success: true, message: 'API key created', data: { id: apiKey.id, name: apiKey.name, key, prefix, expires_at: apiKey.expires_at } };
  }

  async listApiKeys(user_id: number) {
    const list = await this.prisma.apiKey.findMany({
      where: { user_id, is_active: true },
      select: { id: true, name: true, description: true, prefix: true, last_used_at: true, expires_at: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data: list };
  }

  async revokeApiKey(user_id: number, apiKeyId: number) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: apiKeyId, user_id } });
    if (!key) return { success: false, message: 'API key not found' };
    await this.prisma.apiKey.update({ where: { id: apiKeyId }, data: { is_active: false } });
    return { success: true, message: 'API key revoked' };
  }

  async createClientCredential(user_id: number, dto: ApiKeyCreateDto) {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) return { success: false, message: 'User not found' };
    const { client_id, client_secret, client_secret_hash } = this.clientCredentialStrategy.generateClientCredential();
    const cc = await this.prisma.clientCredential.create({
      data: {
        user_id,
        name: dto.name,
        description: dto.description,
        client_id,
        client_secret_hash,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      },
    });
    return { success: true, message: 'Client credential created', data: { id: cc.id, client_id, client_secret, expires_at: cc.expires_at } };
  }

  async listClientCredentials(user_id: number) {
    const list = await this.prisma.clientCredential.findMany({
      where: { user_id, is_active: true },
      select: { id: true, name: true, description: true, client_id: true, expires_at: true, last_used_at: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
    return { success: true, data: list };
  }

  async revokeClientCredential(user_id: number, credentialId: number) {
    const cc = await this.prisma.clientCredential.findFirst({ where: { id: credentialId, user_id } });
    if (!cc) return { success: false, message: 'Credential not found' };
    await this.prisma.clientCredential.update({ where: { id: credentialId }, data: { is_active: false } });
    return { success: true, message: 'Credential revoked' };
  }

  async updateClientCredential(user_id: number, credentialId: number, dto: { expires_at?: string | null }) {
    const cc = await this.prisma.clientCredential.findFirst({ where: { id: credentialId, user_id } });
    if (!cc) return { success: false, message: 'Credential not found' };
    await this.prisma.clientCredential.update({
      where: { id: credentialId },
      data: { expires_at: dto.expires_at != null ? (dto.expires_at ? new Date(dto.expires_at) : null) : undefined },
    });
    return { success: true, message: 'Updated' };
  }

  async validateClientCredential(client_id: string, client_secret: string) {
    const cc = await this.prisma.clientCredential.findFirst({
      where: { client_id, is_active: true },
      include: { user: { select: { id: true, email: true, name: true, is_active: true } } },
    });
    if (!cc || !cc.user.is_active) return { success: false, message: 'Invalid client' };
    if (this.clientCredentialStrategy.isExpired(cc.expires_at)) return { success: false, message: 'Credential expired' };
    const valid = await this.clientCredentialStrategy.verifyClientSecret(client_secret, cc.client_secret_hash);
    if (!valid) return { success: false, message: 'Invalid secret' };
    await this.prisma.clientCredential.update({ where: { id: cc.id }, data: { last_used_at: new Date() } });
    return { success: true, data: { user: cc.user } };
  }

  async refresh_tokens(dto: RefreshTokenDto) {
    // Optional: implement refresh token rotation
    return { success: false, message: 'Use login to get a new token' };
  }

  async sendEmailOTP(user_id: number, purpose?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: user_id } });
    if (!user) return { success: false, message: 'User not found' };
    return this.emailOTPService.sendEmailOTP(user_id, user.email, purpose || 'login');
  }
}

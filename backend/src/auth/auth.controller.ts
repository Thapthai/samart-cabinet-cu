import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard, AuthContext } from './guards/auth.guard';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  FirebaseLoginDto,
  ApiKeyCreateDto,
  RefreshTokenDto,
  Enable2FADto,
  Verify2FASetupDto,
  Disable2FADto,
  LoginWith2FADto,
  ChangePasswordDto,
  UpdateUserProfileDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('validate')
  async validate(@Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : auth;
    return this.authService.validateToken(token || '');
  }

  @Post('firebase/login')
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(@Body() dto: FirebaseLoginDto) {
    return this.authService.firebaseLogin(dto);
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async enable2FA(@Body() dto: Enable2FADto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.enable2FA({ user_id, password: dto.password });
  }

  @Post('2fa/verify-setup')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify2FASetup(@Body() dto: Verify2FASetupDto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.verify2FASetup({ user_id, secret: dto.secret, token: dto.token });
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async disable2FA(@Body() dto: Disable2FADto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.disable2FA(user_id, dto.password, dto.token);
  }

  @Post('2fa/login')
  @HttpCode(HttpStatus.OK)
  async loginWith2FA(@Body() dto: LoginWith2FADto) {
    return this.authService.loginWith2FA(dto.tempToken, dto.code, dto.type);
  }

  @Post('2fa/send-email-otp')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendEmailOTP(@Body() body: { purpose?: string }, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.sendEmailOTP(user_id, body.purpose);
  }

  @Get('admin-users')
  @UseGuards(AuthGuard)
  async listAdminUsers(
    @Query('search') search?: string,
    @Query('is_active') isActiveParam?: string,
  ) {
    const isActive =
      isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;
    return this.authService.listAdminUsers({ search, isActive });
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Req() req: Request & { auth?: AuthContext }) {
    const user_id = req.auth?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.getUserProfile(user_id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Body() dto: UpdateUserProfileDto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.updateUserProfile(
      user_id,
      { name: dto.name, email: dto.email, preferred_auth_method: dto.preferred_auth_method },
      dto.currentPassword,
    );
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.changePassword(user_id, dto.currentPassword, dto.newPassword, dto.confirmPassword);
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: ResetPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('apikey')
  @UseGuards(AuthGuard)
  async createApiKey(@Body() dto: ApiKeyCreateDto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.createApiKey(user_id, dto);
  }

  @Get('apikey')
  @UseGuards(AuthGuard)
  async listApiKeys(@Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.listApiKeys(user_id);
  }

  @Post('apikey/revoke')
  @UseGuards(AuthGuard)
  async revokeApiKey(@Body() body: { id: number }, @Req() req: Request & { auth?: AuthContext }) {
    const user_id = req.auth?.user?.id;
    if (!user_id || body?.id == null) return { success: false, message: 'Unauthorized' };
    return this.authService.revokeApiKey(user_id, Number(body.id));
  }

  @Post('client-credential')
  @UseGuards(AuthGuard)
  async createClientCredential(@Body() dto: ApiKeyCreateDto, @Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.createClientCredential(user_id, dto);
  }

  @Get('client-credential')
  @UseGuards(AuthGuard)
  async listClientCredentials(@Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const v = await this.authService.validateToken(token);
    const user_id = (v as any).data?.user?.id;
    if (!user_id) return { success: false, message: 'Unauthorized' };
    return this.authService.listClientCredentials(user_id);
  }

  @Post('client-credential/validate')
  @HttpCode(HttpStatus.OK)
  async validateClientCredential(@Body() body: { client_id: string; client_secret: string }) {
    return this.authService.validateClientCredential(body.client_id, body.client_secret);
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh_tokens(dto);
  }

}

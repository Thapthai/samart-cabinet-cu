import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { ClientCredentialStrategy } from './strategies/client-credential.strategy';
import { AuthGuard } from './guards/auth.guard';
import { TOTPService } from './services/totp.service';
import { EmailOTPService } from './services/email-otp.service';
import { FirebaseService } from './services/firebase.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeyStrategy,
    ClientCredentialStrategy,
    AuthGuard,
    TOTPService,
    EmailOTPService,
    FirebaseService,
  ],
  exports: [AuthService, AuthGuard, ApiKeyStrategy, ClientCredentialStrategy, JwtModule],
})
export class AuthModule {}

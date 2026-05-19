import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyStrategy } from '../strategies/api-key.strategy';
import { AuthMethod } from '../dto/auth.dto';

export interface AuthContext {
  user: any;
  authMethod: AuthMethod;
  apiKey?: any;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private apiKeyStrategy: ApiKeyStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authResult = await this.tryAuthenticate(request);
    if (!authResult) {
      throw new UnauthorizedException('Invalid or missing authentication');
    }
    request.auth = authResult;
    return true;
  }

  private async tryAuthenticate(request: any): Promise<AuthContext | null> {
    const authHeader = request.headers.authorization;
    const apiKeyHeader = request.headers['x-api-key'];

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtResult = await this.authenticateJWT(token);
      if (jwtResult) return jwtResult;
    }

    if (authHeader) {
      const apiKey = this.apiKeyStrategy.extractApiKeyFromHeader(authHeader);
      if (apiKey) {
        const apiKeyResult = await this.authenticateApiKey(apiKey);
        if (apiKeyResult) return apiKeyResult;
      }
    }

    if (apiKeyHeader) {
      const apiKeyResult = await this.authenticateApiKey(apiKeyHeader);
      if (apiKeyResult) return apiKeyResult;
    }

    return null;
  }

  private async authenticateJWT(token: string): Promise<AuthContext | null> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, fname: true, lname: true, is_active: true, preferred_auth_method: true },
      });
      if (!user || !user.is_active) return null;
      return { user, authMethod: AuthMethod.JWT };
    } catch {
      return null;
    }
  }

  private async authenticateApiKey(key: string): Promise<AuthContext | null> {
    try {
      if (!this.apiKeyStrategy.isValidApiKeyFormat(key)) return null;
      const prefix = this.apiKeyStrategy.getApiKeyPrefix(key);
      const apiKeyRecord = await this.prisma.apiKey.findFirst({
        where: { prefix, is_active: true },
        include: {
          user: {
            select: { id: true, email: true, fname: true, lname: true, is_active: true, preferred_auth_method: true },
          },
        },
      });
      if (!apiKeyRecord || !apiKeyRecord.user.is_active) return null;
      if (apiKeyRecord.expires_at && this.apiKeyStrategy.isApiKeyExpired(apiKeyRecord.expires_at)) return null;
      const isValid = await this.apiKeyStrategy.verifyApiKey(key, apiKeyRecord.key_hash);
      if (!isValid) return null;
      await this.prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { last_used_at: new Date() },
      });
      return {
        user: apiKeyRecord.user,
        authMethod: AuthMethod.API_KEY,
        apiKey: { id: apiKeyRecord.id, name: apiKeyRecord.name, prefix: apiKeyRecord.prefix },
      };
    } catch {
      return null;
    }
  }
}

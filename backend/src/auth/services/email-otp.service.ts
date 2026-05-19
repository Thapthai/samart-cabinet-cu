import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { EmailTemplate } from '../../email/dto/email.dto';

export interface EmailOTPResult {
  success: boolean;
  message: string;
  expiresIn?: number;
}

@Injectable()
export class EmailOTPService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async sendEmailOTP(user_id: number, email: string, purpose: string = 'login'): Promise<EmailOTPResult> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires_at = new Date();
      expires_at.setMinutes(expires_at.getMinutes() + 5);

      await this.prisma.twoFactorToken.create({
        data: { user_id, token: otp, type: 'email_otp', expires_at },
      });

      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
        select: { fname: true, lname: true, email: true },
      });
      if (!user) return { success: false, message: 'User not found' };

      const result = await this.emailService.sendTemplateEmail({
        to: email,
        template: EmailTemplate.EMAIL_OTP,
        templateData: {
          name: `${user.fname} ${user.lname}`.trim(),
          email: user.email,
          otp,
          purpose,
          expiresIn: '5',
          appName: process.env.APP_NAME || 'POSE',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
        },
      });

      if (!result.success) return { success: false, message: 'Failed to send OTP email' };
      return { success: true, message: 'OTP sent to your email', expiresIn: 5 };
    } catch (err) {
      console.error('Send Email OTP error:', err);
      return { success: false, message: 'Failed to send OTP' };
    }
  }

  async verifyEmailOTP(user_id: number, inputOTP: string): Promise<{ success: boolean; message: string }> {
    try {
      const otpRecord = await this.prisma.twoFactorToken.findFirst({
        where: {
          user_id,
          token: inputOTP,
          type: 'email_otp',
          isUsed: false,
          expires_at: { gt: new Date() },
        },
      });
      if (!otpRecord) return { success: false, message: 'Invalid or expired OTP' };
      await this.prisma.twoFactorToken.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      return { success: true, message: 'OTP verified successfully' };
    } catch {
      return { success: false, message: 'OTP verification failed' };
    }
  }
}

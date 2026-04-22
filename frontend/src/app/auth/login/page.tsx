'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithGoogle } from '@/lib/firebase';
import TwoFactorModal from '@/components/TwoFactorModal';
import { authApi } from '@/lib/api';
import { ASSETS } from '@/lib/assets';

export default function LoginPage() {
  const [error, setError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tempToken, setTempToken] = useState<string>('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Email/Password Login
  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      setEmailError('');
      setPasswordError('');
      setLoading(true);

      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        roleType: 'admin', // ระบุชัดเจนว่าเป็น admin login
        redirect: false,
      });

      if (result?.error) {
        // Check if error indicates 2FA is required
        if (result.error.includes('2FA') || result.error.includes('verification required')) {

          try {
            const loginResponse = await authApi.login(data);
            if ((loginResponse as any).requiresTwoFactor && loginResponse.data?.tempToken) {
              setTempToken(loginResponse.data.tempToken);
              setShow2FAModal(true);
              return;
            }
          } catch (apiError) {
            // Continue with regular error handling
          }
        }
        
        // Check for specific error types
        const errorMessage = result.error;

        console.log(errorMessage);
        
        if (errorMessage.includes('Invalid credentials')) {
          // Show error in alert box and red borders on both fields
          setEmailError('error'); // Just mark as error for styling
          setPasswordError('error'); // Just mark as error for styling
          setError(errorMessage);
          toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else if (errorMessage.includes('disabled') || errorMessage.includes('deactivated')) {
          setError(errorMessage);
          toast.error(errorMessage);
        } else if (errorMessage.includes('Google Login') || errorMessage.includes('OAuth')) {
          setError(errorMessage);
          toast.error(errorMessage);
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ');
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA verification
  const handle2FAVerify = async (code: string) => {
    try {
      setTwoFactorLoading(true);

      const response = await authApi.loginWith2FA(tempToken, code);

      if (response.success && response.data) {
        const { user, token } = response.data;

        // Store the token and user data in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        }

        // Create NextAuth session and WAIT for it to complete
        const result = await signIn('credentials', {
          email: user.email,
          password: 'bypass-2fa-verified',
          '2fa_token': token,
          redirect: false,
        });

        if (result?.ok) {
          setShow2FAModal(false);
          toast.success('เข้าสู่ระบบสำเร็จ');
          router.push('/admin/dashboard');
        } else if (result?.error) {
          throw new Error(result.error);
        } else {
          throw new Error('Failed to create session');
        }
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'รหัสไม่ถูกต้อง');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Firebase Login
  const handleFirebaseLogin = async () => {
    try {
      setError('');
      setFirebaseLoading(true);

      // Sign in with Firebase to get ID token
      const { idToken } = await signInWithGoogle();

      // Use NextAuth with Firebase provider
      const result = await signIn('firebase', {
        idToken,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ');
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Firebase');
      toast.error(err.message || 'Failed to sign in with Firebase');
    } finally {
      setFirebaseLoading(false);
    }
  };

  return (
    <>
      <TwoFactorModal
        isOpen={show2FAModal}
        onClose={() => {
          setShow2FAModal(false);
          setTempToken('');
        }}
        onVerify={handle2FAVerify}
        loading={twoFactorLoading}
      />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="flex justify-center mb-4">
              <img
                src={ASSETS.LOGO}
                alt="POSE Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              เข้าสู่ระบบ
            </CardTitle>
            <CardDescription className="text-gray-600">
              เข้าสู่ระบบจัดการเวชภัณฑ์ POSE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Firebase Login Button */}
            {/* <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 bg-gradient-to-r from-blue-50 to-cyan-50"
                onClick={handleFirebaseLogin}
                disabled={firebaseLoading || loading}
              >
                {firebaseLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                    </svg>
                    <span className="font-medium">เข้าสู่ระบบด้วย Google</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-[1px] bg-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-500 font-medium">หรือ</span>
              </div>
            </div> */}

            {/* Email/Password Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className={`text-sm font-medium transition-colors ${
                    errors.email || emailError ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  อีเมล *
                </Label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
                    errors.email || emailError ? 'text-red-400' : 'text-gray-400'
                  }`} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className={`pl-10 h-12 border-2 transition-all duration-200 ${
                      errors.email || emailError
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 shadow-sm shadow-red-100 animate-shake' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>⚠️</span>
                    <span>{errors.email.message}</span>
                  </p>
                )}
                {emailError && !errors.email && emailError !== 'error' && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>❌</span>
                    <span>{emailError}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className={`text-sm font-medium transition-colors ${
                    errors.password || passwordError ? 'text-red-600' : 'text-gray-700'
                  }`}
                >
                  รหัสผ่าน *
                </Label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
                    errors.password || passwordError ? 'text-red-400' : 'text-gray-400'
                  }`} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pl-10 pr-10 h-12 border-2 transition-all duration-200 ${
                      errors.password || passwordError
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 shadow-sm shadow-red-100 animate-shake' 
                        : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>⚠️</span>
                    <span>{errors.password.message}</span>
                  </p>
                )}
                {passwordError && !errors.password && passwordError !== 'error' && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium animate-shake">
                    <span>❌</span>
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50/80 border-2 border-red-200 p-4 rounded-xl flex items-center justify-center space-x-2 animate-shake shadow-lg shadow-red-100">
                  <span className="text-lg">❌</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-13 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 text-white font-semibold text-base transition-all duration-300 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] rounded-xl border border-blue-400/20"
                disabled={loading || firebaseLoading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>เข้าสู่ระบบ</span>
                  </div>
                )}
              </Button>

              {/* <div className="text-center text-sm pt-4">
                <span className="text-gray-600">ยังไม่มีบัญชี? </span>
                <Link
                  href="/auth/register"
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                  สมัครสมาชิก
                </Link>
              </div> */}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">หรือ</span>
                </div>
              </div>

              <div className="space-y-2">
                {/* <Link href="/auth/staff/login">
                  <Button variant="outline" className="w-full border-2 hover:bg-green-50 hover:border-green-600 transition-all">
                    เข้าสู่ระบบ Staff
                  </Button>
                </Link> */}
                
                <Link href="/">
                  <Button variant="ghost" className="w-full text-gray-600 hover:text-gray-900">
                    ← กลับหน้าหลัก
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

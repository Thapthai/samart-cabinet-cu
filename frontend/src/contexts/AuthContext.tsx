'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { signInWithGoogle, signOutFirebase } from '@/lib/firebase';
import type { User, LoginDto, RegisterAdminDto } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginDto) => Promise<{ requiresTwoFactor?: boolean; tempToken?: string }>;
  registerAdmin: (data: RegisterAdminDto) => Promise<void>;
  loginWithFirebase: () => Promise<void>;
  loginWith2FA: (tempToken: string, code: string) => Promise<void>;
  setAuthData: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize user from localStorage synchronously to prevent null flash
  const getInitialUser = (): User | null => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      const savedToken = localStorage.getItem('token');
 
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          const user = userData.user || userData;
 
          return user;
        } catch (error) {
          console.error('❌ getInitialUser: Failed to parse saved user:', error);
          return null;
        }
      }
    }
 
    return null;
  };

  const [user, setUser] = useState<User | null>(getInitialUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');


      if (token && savedUser) {
        try {
          // Parse user data from localStorage
          const userData = JSON.parse(savedUser);
          const actualUser = userData.user || userData;

          // Set user immediately from localStorage
          setUser(actualUser);

          // Then validate token with backend (optional, don't wait for it)
          authApi.getProfile()
            .then(response => {
              if (response.success && response.data) {
                setUser(response.data);
              }
            })
            .catch(error => {
              console.warn('⚠️ AuthContext: Token validation failed, using cached user data:', error);
              // Keep using cached user data even if validation fails
            });
        } catch (error) {
          console.error('❌ AuthContext: Failed to parse user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginDto) => {
    try {
      const response = await authApi.login(data);

      // Handle new response format with nested data structure
      if (response.success && response.data) {
        // Check if 2FA is required
        if ((response as any).requiresTwoFactor && response.data.tempToken) {
          return {
            requiresTwoFactor: true,
            tempToken: response.data.tempToken,
          };
        }

        const { user, token } = response.data;

        if (user && token) {
          setUser(user);
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          return {};
        } else {
          throw new Error(response.message || 'Login failed - missing user or token');
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  const registerAdmin = async (data: RegisterAdminDto) => {
    try {
      const response = await authApi.registerAdmin(data);
      if (response.success && response.data?.user) {
        return;
      }
      throw new Error(response.message || 'Registration failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  };

  const setAuthData = (user: User, token: string) => {
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const loginWith2FA = async (tempToken: string, code: string) => {
    try {
      const response = await authApi.loginWith2FA(tempToken, code);

      if (response.success && response.data) {
        const { user, token } = response.data;

        if (user && token) {
          setUser(user);
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          throw new Error(response.message || '2FA verification failed - missing user or token');
        }
      } else {
        throw new Error(response.message || '2FA verification failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || '2FA verification failed');
    }
  };

  const loginWithFirebase = async () => {
    try {
      // Sign in with Firebase

      const { idToken } = await signInWithGoogle();
 
      const response = await authApi.firebaseLogin(idToken);
 

      if (response.success && response.data) {
        // Extract user and token - handle both direct data and nested data
        const userData = response.data.user || response.data;
        const tokenData = response.data.token || response.data.accessToken;

        if (userData && tokenData) {
          setUser(userData);
          localStorage.setItem('token', tokenData);
          localStorage.setItem('user', JSON.stringify(userData));
 
        } else {
          console.error('❌ Missing user or token:', { user: userData, token: tokenData });
          throw new Error(response.message || 'Firebase login failed - missing user or token');
        }
      } else {
        console.error('❌ Backend response not successful:', response);
        throw new Error(response.message || 'Firebase login failed');
      }
    } catch (error: any) {
      console.error('❌ Firebase login error:', error);
      // Sign out from Firebase on error
      await signOutFirebase();
      throw new Error(error.response?.data?.message || error.message || 'Firebase login failed');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    registerAdmin,
    loginWithFirebase,
    loginWith2FA,
    setAuthData,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

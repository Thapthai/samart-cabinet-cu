import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { isSessionForThisApp } from '@/lib/appAuth';

export function useAuth() {
  const { data: session, status } = useSession();
  
  const user = useMemo(() => {
    if (session && (session as any).user && isSessionForThisApp(session as { appname?: string; user?: { appname?: string } })) {
      const userData = (session as any).user;
      // Ensure user has required properties
      return {
        id: userData.id || parseInt(userData.id),
        email: userData.email,
        name: userData.name,
        profile_image: userData.profile_image || userData.image,
        accessToken: (session as any).accessToken,
        ...userData,
      };
    }
    return null;
  }, [session]);

  const loading = status === 'loading';
  const isAuthenticated = !!session && !!user;

  return {
    user,
    loading,
    isAuthenticated,
    session,
    status,
  };
}


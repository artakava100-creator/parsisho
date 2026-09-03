import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { AuthUser, AuthState, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { authService } from '@/services/auth.service';
import { profileService } from '@/services/profile.service';
import { useToastStore } from '@/stores/toast-store';
import { getQueryClient } from '@/providers/query-client';

interface AuthContextValue {
  user: AuthUser | null;
  state: AuthState;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resendEmailVerification: (email: string) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface SessionUserInfo {
  id: string;
  email: string;
  emailVerified: boolean;
}

function extractUserInfo(session: {
  user: { id: string; email?: string; email_confirmed_at?: string | null };
}): SessionUserInfo {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    emailVerified: Boolean(session.user.email_confirmed_at),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [state, setState] = useState<AuthState>('initializing');
  const initialSessionResolved = useRef(false);

  const buildAuthUser = useCallback(
    async (userInfo: SessionUserInfo): Promise<AuthUser> => {
      try {
        const profile = await profileService.getByUserId(userInfo.id);
        return {
          id: userInfo.id,
          email: userInfo.email,
          emailVerified: userInfo.emailVerified,
          displayName: profile?.displayName ?? 'کاربر پارسیشو',
          role: profile?.role ?? 'user',
          avatarUrl: profile?.avatarUrl ?? undefined,
          profile,
        };
      } catch (err) {
        logger.warn('Profile fetch failed', err);
        return {
          id: userInfo.id,
          email: userInfo.email,
          emailVerified: userInfo.emailVerified,
          displayName: 'کاربر پارسیشو',
          role: 'user' as UserRole,
          profile: null,
        };
      }
    },
    [],
  );

  const clearUserState = useCallback(() => {
    setUser(null);
    setState('unauthenticated');
    useToastStore.getState().clear();
    getQueryClient().clear();
  }, []);

  useEffect(() => {
    if (!env.hasSupabaseConfig) {
      setState('unauthenticated');
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!mounted) return;
        initialSessionResolved.current = true;

        if (error) {
          logger.warn('Session check failed', error);
          setState('unauthenticated');
          return;
        }
        if (data.session) {
          const authUser = await buildAuthUser(extractUserInfo(data.session));
          if (!mounted) return;
          setUser(authUser);
          setState('authenticated');
        } else {
          setState('unauthenticated');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        logger.warn('Session check threw', err);
        initialSessionResolved.current = true;
        setState('unauthenticated');
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        clearUserState();
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !initialSessionResolved.current) {
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        (async () => {
          const authUser = await buildAuthUser(extractUserInfo(session));
          if (!mounted) return;
          setUser(authUser);
          setState('authenticated');
        })();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [buildAuthUser, clearUserState]);

  const signIn = useCallback(async (email: string, password: string) => {
    await authService.signIn(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    await authService.signUp(email, password, displayName);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authService.signInWithGoogle();
  }, []);

  const resendEmailVerification = useCallback(async (email: string) => {
    await authService.resendVerification(email);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
    } catch (err) {
      logger.warn('Sign out error', err);
    }
    clearUserState();
  }, [clearUserState]);

  const reloadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await profileService.getByUserId(user.id);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              displayName: profile?.displayName ?? prev.displayName,
              role: profile?.role ?? prev.role,
              avatarUrl: profile?.avatarUrl ?? prev.avatarUrl,
              profile,
            }
          : prev,
      );
    } catch (err) {
      logger.warn('Profile reload failed', err);
    }
  }, [user]);

  const isLoading = state === 'initializing';

  return (
    <AuthContext.Provider
      value={{
        user,
        state,
        isLoading,
        isAuthenticated: state === 'authenticated',
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        resendEmailVerification,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

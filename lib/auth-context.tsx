import { auth } from '@/lib/firebase';
import { checkRateLimit } from '@/lib/rate-limit';
import { supabase } from '@/lib/supabase';
import { validateLoginCredentials } from '@/lib/validation';
import type { UserProfile, UserRole } from '@/types';
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string, fallbackEmail?: string, fallbackName?: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, created_at, updated_at')
      .eq('id', userId)
      .single();
    if (data) return data as UserProfile;
    if (fallbackEmail)
      return {
        id: userId,
        email: fallbackEmail,
        full_name: fallbackName ?? undefined,
        role: 'student',
      };
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setState((s) => ({ ...s, profile: null }));
      return;
    }
    const profile = await fetchProfile(user.uid, user.email ?? undefined, user.displayName ?? undefined);
    setState((s) => ({ ...s, profile }));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let profile: UserProfile | null = null;
      if (user) {
        profile = await fetchProfile(user.uid, user.email ?? undefined, user.displayName ?? undefined);
      }
      setState({
        user,
        profile,
        isLoading: false,
        isAuthenticated: !!user,
      });
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const validation = validateLoginCredentials({ email, password });
    if (!validation.ok) return { error: new Error(validation.errors[0]) };
    try {
      checkRateLimit({ key: `auth:login:${email.toLowerCase()}` });
    } catch (err) {
      return { error: err as Error };
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
    const validation = validateLoginCredentials({ email, password });
    if (!validation.ok) return { error: new Error(validation.errors[0]) };
    try {
      checkRateLimit({ key: `auth:signup:${email.toLowerCase()}` });
    } catch (err) {
      return { error: err as Error };
    }
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return { error: new Error('Google sign-in not supported yet') };
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value: AuthContextValue = {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useUserRole(): UserRole {
  const { profile } = useAuth();
  return profile?.role ?? 'student';
}
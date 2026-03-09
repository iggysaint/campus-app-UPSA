import { auth, db } from '@/lib/firebase';
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit';
import { validateLoginCredentials } from '@/lib/validation';
import type { UserProfile, UserRole } from '@/types';
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface AuthState {
  user: FirebaseUser | null;
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

// Now reads actual role from Firestore instead of hardcoding 'student'
async function fetchProfile(userId: string, fallbackEmail?: string, fallbackName?: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userId,
        email: data.email || fallbackEmail || '',
        full_name: data.full_name || fallbackName,
        role: data.role || 'student',
      };
    }
    // Fallback if no Firestore doc exists
    return {
      id: userId,
      email: fallbackEmail || '',
      full_name: fallbackName,
      role: 'student',
    };
  } catch {
    return {
      id: userId,
      email: fallbackEmail || '',
      full_name: fallbackName,
      role: 'student',
    };
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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setState((s) => ({ ...s, profile: null }));
      return;
    }
    const profile = await fetchProfile(
      currentUser.uid,
      currentUser.email ?? undefined,
      currentUser.displayName ?? undefined
    );
    setState((s) => ({ ...s, profile }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      let profile: UserProfile | null = null;

      if (user) {
        profile = await fetchProfile(
          user.uid,
          user.email ?? undefined,
          user.displayName ?? undefined
        );
      }

      if (!cancelled) {
        setState({
          user,
          profile,
          isLoading: false,
          isAuthenticated: !!user,
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const validation = validateLoginCredentials({ email, password });
    if (!validation.ok) {
      return { error: new Error(validation.errors[0]) };
    }

    try {
      checkRateLimit({
        key: `auth:login:${email.toLowerCase() || 'anonymous'}`,
      });
    } catch (err) {
      return { error: err as Error };
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { error: null };
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        return { error: new RateLimitError() };
      }
      return { error: error as Error };
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const validation = validateLoginCredentials({ email, password });
      if (!validation.ok) {
        return { error: new Error(validation.errors[0]) };
      }

      try {
        checkRateLimit({
          key: `auth:signup:${email.toLowerCase() || 'anonymous'}`,
        });
      } catch (err) {
        return { error: err as Error };
      }

      try {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        return { error: null };
      } catch (error: any) {
        return { error: error as Error };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      checkRateLimit({ key: 'auth:google', limit: 20 });
    } catch (err) {
      return { error: err as Error };
    }
    return { error: new Error('Google sign-in not yet implemented') };
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

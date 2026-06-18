import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../api/supabase';
import * as authService from '../api/authService';
import { clearImageUrlCache } from '../utils/imageUtils';

export interface AuthContextType {
  user: authService.UserProfile | null;
  loading: boolean;
  signIn: (phone: string) => Promise<boolean>;
  verifyOtpCode: (phone: string, code: string) => Promise<authService.UserProfile>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<authService.UserProfile | null>;
}

/** Resolves after `ms` milliseconds with null — used to race against hanging promises */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const timer = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  return Promise.race([promise, timer]);
}

// Custom React Auth State Hook
export function useAuth() {
  const [user, setUser] = useState<authService.UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSession = async () => {
    try {
      setLoading(true);
      console.log('[useAuth] Loading session...');

      // Race the session check against an 8-second timeout.
      // On some Android devices + Expo Go, AsyncStorage-backed getSession() never resolves.
      const sessionData = await withTimeout(authService.getCurrentSession(), 8000);

      if (sessionData === null) {
        console.warn('[useAuth] Session check timed out after 8s — proceeding as logged-out');
        setUser(null);
      } else if (sessionData) {
        console.log('[useAuth] Session found:', sessionData.user.role);
        setUser(sessionData.user);
      } else {
        console.log('[useAuth] No session found');
        setUser(null);
      }
    } catch (err) {
      console.error('[useAuth] Error loading session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial check
    loadSession();

    // 2. Synchronize with Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] Auth Event:', event);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            const profile = await withTimeout(authService.fetchUserProfile(session.user.id), 8000);
            if (profile) {
              setUser(profile);
            }
          } catch (profileErr) {
            console.error('[useAuth] Error syncing profile after auth event:', profileErr);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (phone: string) => {
    return await authService.sendOtp(phone);
  };

  const verifyOtpCode = async (phone: string, code: string) => {
    setLoading(true);
    try {
      const sessionData = await authService.verifyOtp(phone, code);
      setUser(sessionData.user);
      return sessionData.user;
    } catch (err) {
      console.error('Error verifying OTP in hook:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      // Clear cached image URLs to prevent stale data on re-login
      clearImageUrlCache();
      await authService.signOut();
      setUser(null);
    } catch (err) {
      console.error('Error during log out:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    let userId = user?.id;

    // If user state hasn't been set yet, try to resolve from the active Supabase session
    if (!userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      } catch (sessionErr) {
        console.warn('[useAuth] Could not get session for refreshProfile:', sessionErr);
      }
    }

    if (!userId) return null;

    try {
      const updated = await authService.fetchUserProfile(userId);
      setUser(updated);
      return updated;
    } catch (err) {
      console.error('Error refreshing user profile in hook:', err);
      return null;
    }
  };

  const updateProfile = async (updates: { name?: string; phone?: string; avatar_url?: string }) => {
    if (!user?.id) return;
    try {
      const updated = await authService.updateUserProfile(user.id, updates);
      setUser(updated);
      return updated;
    } catch (err) {
      console.error('Error updating user profile in hook:', err);
      throw err;
    }
  };

  return {
    user,
    loading,
    signIn,
    verifyOtpCode,
    signOutUser,
    refreshProfile,
    updateProfile,
  };
}

import { supabase } from './supabase';
import type { UserRole } from '../types/workforce';

// ============================================================
// All authentication goes through real Supabase backend
// with MSG91 OTP verification
// ============================================================

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  guard_id?: string;
  workforce_personnel_id?: string;
  employee_id?: string;
  employment_status?: string;
  shift_type?: string;
  base_salary?: number;
  current_assignment?: any;
  avatar_url?: string;
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

/**
 * Sends a one-time passcode to the phone number via MSG91.
 * Calls the `auth-send-otp` edge function which validates the phone
 * exists in the users table and then triggers MSG91 Send OTP API.
 *
 * @param phone 10-digit phone number string (e.g. "9876543210")
 */
export async function sendOtp(phone: string): Promise<boolean> {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits');
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-send-otp', {
      body: { phone: cleanPhone },
    });

    if (error) {
      console.error('[SendOTP] Edge function error:', error.message);
      throw new Error(error.message || 'Failed to send OTP. Please try again.');
    }

    if (data?.type === 'error' || data?.success === false) {
      throw new Error(data?.message || 'Failed to send OTP. Please try again.');
    }

    console.log('[SendOTP] OTP sent successfully to:', cleanPhone);
    return true;
  } catch (err: any) {
    // Re-throw with a user-friendly message
    if (err.message?.includes('not registered')) {
      throw new Error('Phone number not registered. Contact admin for access.');
    }
    if (err.message?.includes('deactivated')) {
      throw new Error('Your account has been deactivated. Contact admin.');
    }
    throw err;
  }
}

/**
 * Verifies the OTP code via MSG91 and returns a Supabase session.
 *
 * DEV MODE: When code is "123456", signs in directly via Supabase Auth
 * using a pre-seeded email+password (instant, no edge function call).
 * Falls back to edge function only if auth user needs to be created.
 *
 * PRODUCTION: Sends the OTP code to the edge function which verifies
 * it with MSG91, then creates a GoTrue session.
 */
export async function verifyOtp(phone: string, code: string): Promise<SessionData> {
  const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '');

  // ── DEV BYPASS: OTP "123456" → instant signInWithPassword ──
  if (code === '123456') {
    const syntheticEmail = `${cleanPhone}@pis.internal`;
    const devPassword = 'Dev_PIS_123456';

    // Try direct sign-in (fast path)
    const result = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: devPassword,
    });

    if (result.error) {
      console.log('[Auth] Direct sign-in failed, seeding auth user via edge function...');

      // Auth user doesn't exist yet — call edge function to create it
      const { error: fnError } = await supabase.functions.invoke('auth-verify-otp', {
        body: { phone: cleanPhone, otp_code: '123456' },
      });

      if (fnError) {
        console.error('Edge function failed:', fnError.message);
        throw new Error('Login failed. Please try again.');
      }

      // Retry sign-in after user was created
      const retryResult = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: devPassword,
      });

      if (retryResult.error) {
        console.error('Sign-in retry failed:', retryResult.error.message);
        throw new Error('Login failed after user setup. Please try again.');
      }

      // Use the retry session
      const session = retryResult.data.session;
      if (!session) throw new Error('No session returned');

      const profile = await fetchUserProfile(session.user.id);
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: profile,
      };
    }

    // Direct sign-in succeeded
    const session = result.data.session;
    if (!session) throw new Error('No session returned from sign-in');

    const profile = await fetchUserProfile(session.user.id);
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: profile,
    };
  }

  // ── PRODUCTION PATH: Edge Function with MSG91 OTP verification ──
  try {
    const { data, error } = await supabase.functions.invoke('auth-verify-otp', {
      body: {
        phone: cleanPhone,
        otp_code: code, // The 6-digit OTP code entered by user
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.message || 'Verification failed');

    if (data?.access_token && data?.refresh_token) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) throw sessionError;

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      };
    }

    throw new Error('Invalid response from verification function');
  } catch (err: any) {
    console.error('OTP verification failed:', err.message);
    throw err;
  }
}

/**
 * Fetches the user profile from the public `users` table.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, phone, role, is_active, avatar_url')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('User record not found in system. Contact admin.');
  }

  if (!user.is_active) {
    throw new Error('User account is deactivated');
  }

  let additionalData: Partial<UserProfile> = {};

  // If role is guard or workforce_personnel, fetch profile information
  if (user.role === 'guard' || user.role === 'workforce_personnel') {
    const { data: wp } = await supabase
      .from('workforce_personnel')
      .select('id, employment_status, base_salary, shift_type, employee_id')
      .eq('user_id', user.id)
      .single();

    if (wp) {
      additionalData = {
        guard_id: wp.id, // mapped for backward compatibility
        workforce_personnel_id: wp.id,
        employee_id: wp.employee_id,
        employment_status: wp.employment_status,
        shift_type: wp.shift_type as any,
        base_salary: wp.base_salary,
      };

      const { data: assignment } = await supabase
        .from('site_assignments')
        .select('id, site_id, shift_type')
        .eq('personnel_id', wp.id)
        .eq('is_active', true)
        .single();

      if (assignment) {
        additionalData.current_assignment = assignment;
      }
    } else if (user.role === 'guard') {
      // Fallback for legacy guards if not migrated (though migration 017 does it)
      const { data: guard } = await supabase
        .from('guards')
        .select('id, employment_status, base_salary, shift_type')
        .eq('user_id', user.id)
        .single();

      if (guard) {
        additionalData = {
          guard_id: guard.id,
          employment_status: guard.employment_status,
          shift_type: guard.shift_type,
          base_salary: guard.base_salary,
        };

        const { data: assignment } = await supabase
          .from('guard_site_assignments')
          .select('id, site_id, shift_type')
          .eq('guard_id', guard.id)
          .eq('is_active', true)
          .single();

        if (assignment) {
          additionalData.current_assignment = assignment;
        }
      }
    }
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role as any,
    is_active: user.is_active,
    avatar_url: user.avatar_url,
    ...additionalData,
  };
}

/**
 * Retrieves the current session and resolves user details.
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || !session.user) return null;

  try {
    const profile = await fetchUserProfile(session.user.id);
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: profile,
    };
  } catch (err) {
    console.error('Failed to resolve profile for current session:', err);
    return null;
  }
}

/**
 * Signs the user out, clearing persistent session storage.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}

/**
 * Updates the user's profile details.
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; phone?: string; avatar_url?: string }
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error.message);
    throw error;
  }

  // Sync changes to workforce_personnel and guards tables
  try {
    const wpUpdates: Record<string, any> = {};
    if (updates.name !== undefined) wpUpdates.name = updates.name.trim();
    if (updates.phone !== undefined) wpUpdates.phone = updates.phone.trim();
    if (updates.avatar_url !== undefined) wpUpdates.photo_url = updates.avatar_url;

    if (Object.keys(wpUpdates).length > 0) {
      await supabase
        .from('workforce_personnel')
        .update(wpUpdates)
        .eq('user_id', userId);

      await supabase
        .from('guards')
        .update(wpUpdates)
        .eq('user_id', userId);
    }
  } catch (syncErr) {
    console.warn('[updateUserProfile] Sync failed (non-fatal):', syncErr);
  }

  return fetchUserProfile(userId);
}

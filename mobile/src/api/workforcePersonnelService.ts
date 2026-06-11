// =============================================================================
// Workforce Personnel Service
// =============================================================================
// Task 6: CRUD operations for workforce_personnel table.
// Uses direct supabase.from() calls. Handles employee ID generation,
// dual-write to legacy guards table, and soft delete (termination).
// =============================================================================

import { supabase } from './supabase';
import type { WorkforcePersonnel, EmploymentStatus, ShiftType } from '../types/workforce';
import { USE_MOCK_DATA, mockDelay } from '../__mocks__/mockConfig';
import { mockAllPersonnel, getPersonnelByCategory } from '../__mocks__/mockData';

/**
 * Task 6.1: Fetches workforce personnel with optional filters:
 * - category_id
 * - category_ids (array of category IDs; empty array or undefined = no filter, shows all)
 * - site_id (checks active assignment in site_assignments)
 * - status (employment_status)
 * - search (ilike match on name, phone, or employee_id)
 * 
 * IMPORTANT: Empty categoryIds array is treated as "no filter" (shows all personnel).
 * This allows the "All Personnel" category filter to work correctly.
 */
export async function getPersonnel(filters?: {
  category_id?: string;
  category_ids?: string[];
  site_id?: string;
  status?: EmploymentStatus;
  search?: string;
}): Promise<WorkforcePersonnel[]> {
  // MOCK DATA MODE
  if (USE_MOCK_DATA) {
    await mockDelay();
    
    let filtered = [...mockAllPersonnel];
    
    // Filter by category_id
    if (filters?.category_id) {
      filtered = filtered.filter(p => p.category_id === filters.category_id);
    }
    
    // Filter by category_ids
    if (filters?.category_ids && filters.category_ids.length > 0) {
      filtered = getPersonnelByCategory(filters.category_ids);
    }
    
    // Filter by status
    if (filters?.status) {
      filtered = filtered.filter(p => p.employment_status === filters.status);
    }
    
    // Filter by search
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.phone.includes(searchLower) ||
        p.employee_id.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by site_id (simplified - in real app would check site_assignments)
    if (filters?.site_id) {
      // For mock, just return a subset
      filtered = filtered.slice(0, Math.floor(filtered.length * 0.7));
    }
    
    return filtered;
  }
  
  // REAL API MODE
  // If filtering by site_id, we need to join site_assignments in an inner-like way
  let query = supabase.from('workforce_personnel').select(`
    *,
    category:workforce_categories(*)
  `);

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  } else if (filters?.category_ids && filters.category_ids.length > 0) {
    query = query.in('category_id', filters.category_ids);
  }

  if (filters?.status) {
    query = query.eq('employment_status', filters.status);
  }

  if (filters?.search) {
    const searchVal = `%${filters.search}%`;
    query = query.or(`name.ilike.${searchVal},phone.ilike.${searchVal},employee_id.ilike.${searchVal}`);
  }

  if (filters?.site_id) {
    // To filter by site_id, we query site_assignments first to get active personnel IDs
    const { data: assignments, error: assignError } = await supabase
      .from('site_assignments')
      .select('personnel_id')
      .eq('site_id', filters.site_id)
      .eq('is_active', true);

    if (assignError) {
      console.error('Error fetching site assignments for filter:', assignError.message);
      throw new Error(assignError.message || 'Failed to filter personnel by site');
    }

    const personnelIds = (assignments || []).map(a => a.personnel_id);
    if (personnelIds.length === 0) {
      return [];
    }
    query = query.in('id', personnelIds);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching personnel:', error.message);
    throw new Error(error.message || 'Failed to retrieve workforce personnel');
  }

  return data || [];
}

/**
 * Task 6.2: Fetches a single personnel record by ID.
 * Joins category, today's attendance record, and computes rating_summary in JS.
 */
export async function getPersonnelById(id: string): Promise<WorkforcePersonnel> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch personnel and category details
  const { data: personnel, error } = await supabase
    .from('workforce_personnel')
    .select(`
      *,
      category:workforce_categories(*)
    `)
    .eq('id', id)
    .single();

  if (error || !personnel) {
    console.error('Error fetching personnel by ID:', error?.message);
    throw new Error(error?.message || 'Workforce personnel not found');
  }

  // Fetch today's attendance (if any)
  const { data: attendance } = await supabase
    .from('workforce_attendance')
    .select('*')
    .eq('personnel_id', id)
    .eq('attendance_date', todayStr)
    .limit(1);

  // Fetch ratings to compute summary
  const { data: ratings } = await supabase
    .from('workforce_ratings')
    .select('rating, appreciation, review_date')
    .eq('personnel_id', id);

  // Fetch open complaints count assigned to this person's user
  let openComplaintCount = 0;
  if (personnel.user_id) {
    const { count } = await supabase
      .from('complaints')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', personnel.user_id)
      .not('status', 'in', '("resolved","closed")');
    openComplaintCount = count || 0;
  }

  // Calculate rating summary
  const ratingCount = ratings?.length || 0;
  const totalRating = ratings?.reduce((sum, r) => sum + r.rating, 0) || 0;
  const average_rating = ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(2)) : 0;
  const appreciation_count = ratings?.filter(r => r.appreciation).length || 0;
  const last_review_date = ratings && ratings.length > 0
    ? ratings.reduce((max, r) => r.review_date > max ? r.review_date : max, ratings[0].review_date)
    : null;

  return {
    ...personnel,
    today_attendance: attendance && attendance.length > 0 ? attendance[0] : null,
    rating_summary: {
      average_rating,
      open_complaint_count: openComplaintCount,
      appreciation_count,
      last_review_date
    }
  };
}

/**
 * Task 6.3: Creates a new workforce personnel profile.
 * Creates/resolves a user record, generates employee_id, inserts personnel profile,
 * and attempts a dual-write to the legacy guards table (recovering on failure).
 */
export async function createPersonnel(data: {
  name: string;
  phone: string;
  category_id: string;
  base_salary: number;
  joining_date?: string;
  shift_type?: ShiftType;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  aadhaar_number?: string;
  pan_number?: string;
  address?: string;
  photo_url?: string;
}): Promise<WorkforcePersonnel> {
  // Step 1: Ensure user record exists in users table and validate uniqueness
  let userId: string;

  const { data: existingUser } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('phone', data.phone.trim())
    .maybeSingle();

  if (existingUser) {
    // Check if they already have a profile in workforce_personnel or guards
    const { data: existingWP } = await supabase
      .from('workforce_personnel')
      .select('id, employee_id')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    const { data: existingGuard } = await supabase
      .from('guards')
      .select('id')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    if (existingWP || existingGuard) {
      throw new Error(`Phone number is already registered to ${existingUser.name || 'another personnel'} (Employee ID: ${existingWP?.employee_id || 'Legacy Guard'})`);
    }

    userId = existingUser.id;
  } else {
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: data.name.trim(),
        phone: data.phone.trim(),
        role: 'workforce_personnel',
        is_active: true
      })
      .select('id')
      .single();

    if (userError || !newUser) {
      console.error('Error creating user record for personnel:', userError?.message);
      throw new Error(userError?.message || 'Failed to create user record');
    }
    userId = newUser.id;
  }

  // Step 2: Call generate_employee_id RPC
  const { data: employeeId, error: rpcError } = await supabase.rpc('generate_employee_id', {
    p_category_id: data.category_id
  });

  if (rpcError || !employeeId) {
    console.error('Error generating employee ID via RPC:', rpcError?.message);
    throw new Error(rpcError?.message || 'Failed to generate unique employee ID');
  }

  // Step 3: Insert into workforce_personnel
  const { data: created, error: createError } = await supabase
    .from('workforce_personnel')
    .insert({
      user_id: userId,
      category_id: data.category_id,
      employee_id: employeeId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      photo_url: data.photo_url || null,
      base_salary: data.base_salary,
      joining_date: data.joining_date || new Date().toISOString().split('T')[0],
      shift_type: data.shift_type || 'day',
      employment_status: 'active',
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      bank_account_number: data.bank_account_number || null,
      bank_ifsc: data.bank_ifsc || null,
      bank_name: data.bank_name || null,
      aadhaar_number: data.aadhaar_number || null,
      pan_number: data.pan_number || null,
      address: data.address || null
    })
    .select()
    .single();

  if (createError || !created) {
    console.error('Error creating workforce personnel profile:', createError?.message);
    throw new Error(createError?.message || 'Failed to create workforce personnel profile');
  }

  // Step 4: Dual-write to legacy guards table. Log error on failure but do NOT throw.
  try {
    const { error: guardError } = await supabase
      .from('guards')
      .insert({
        id: created.id, // Syncing IDs
        user_id: userId,
        aadhaar_number: data.aadhaar_number || null,
        pan_number: data.pan_number || null,
        address: data.address || null,
        photo_url: data.photo_url || null,
        base_salary: data.base_salary,
        joining_date: data.joining_date || new Date().toISOString().split('T')[0],
        shift_type: data.shift_type || 'day',
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        bank_account_number: data.bank_account_number || null,
        bank_ifsc: data.bank_ifsc || null,
        bank_name: data.bank_name || null,
        employment_status: 'active'
      });

    if (guardError) {
      console.warn('Dual-write insert into legacy guards table failed (logged, no rollback):', guardError.message);
    }
  } catch (guardErr: any) {
    console.warn('Dual-write insert into legacy guards table failed (logged, no rollback):', guardErr?.message || guardErr);
  }

  return created;
}

/**
 * Task 6.4: Updates an existing workforce personnel profile.
 * Excludes employee_id from updates. Updates joined user name/phone,
 * and attempts a dual-write update to legacy guards.
 */
export async function updatePersonnel(
  id: string,
  updates: Partial<Omit<WorkforcePersonnel, 'id' | 'employee_id'>>
): Promise<WorkforcePersonnel> {
  // Ensure we exclude employee_id
  const { employee_id, category, today_attendance, rating_summary, ...validUpdates } = updates as any;

  // 1. Update workforce_personnel
  const { data: updated, error } = await supabase
    .from('workforce_personnel')
    .update(validUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error('Error updating personnel:', error?.message);
    throw new Error(error?.message || 'Failed to update workforce personnel');
  }

  // 2. If name or phone is updated, update the user record
  if (updated.user_id && (validUpdates.name || validUpdates.phone)) {
    const userUpdates: Record<string, any> = {};
    if (validUpdates.name) userUpdates.name = validUpdates.name.trim();
    if (validUpdates.phone) userUpdates.phone = validUpdates.phone.trim();

    const { error: userError } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', updated.user_id);

    if (userError) {
      console.warn('Failed to update users table during updatePersonnel:', userError.message);
    }
  }

  // 3. Dual-write update to legacy guards table
  try {
    const { error: guardError } = await supabase
      .from('guards')
      .update({
        aadhaar_number: updated.aadhaar_number,
        pan_number: updated.pan_number,
        address: updated.address,
        photo_url: updated.photo_url,
        base_salary: updated.base_salary,
        joining_date: updated.joining_date,
        shift_type: updated.shift_type,
        emergency_contact_name: updated.emergency_contact_name,
        emergency_contact_phone: updated.emergency_contact_phone,
        bank_account_number: updated.bank_account_number,
        bank_ifsc: updated.bank_ifsc,
        bank_name: updated.bank_name,
        employment_status: updated.employment_status
      })
      .eq('id', id);

    if (guardError) {
      console.warn('Dual-write update to legacy guards failed (logged, no rollback):', guardError.message);
    }
  } catch (guardErr: any) {
    console.warn('Dual-write update to legacy guards failed (logged, no rollback):', guardErr?.message || guardErr);
  }

  return updated;
}

/**
 * Task 6.5: Terminates workforce personnel (soft delete only).
 * Sets employment_status = 'terminated', deactivates active assignments,
 * sets joined user to inactive, and updates legacy guards.
 */
export async function terminatePersonnel(id: string): Promise<void> {
  // 1. Update workforce_personnel employment_status
  const { data: personnel, error } = await supabase
    .from('workforce_personnel')
    .update({ employment_status: 'terminated' })
    .eq('id', id)
    .select('user_id')
    .single();

  if (error) {
    console.error('Error terminating personnel:', error.message);
    throw new Error(error.message || 'Failed to terminate personnel');
  }

  // 2. Deactivate active assignments
  const { error: assignError } = await supabase
    .from('site_assignments')
    .update({
      is_active: false,
      end_date: new Date().toISOString().split('T')[0]
    })
    .eq('personnel_id', id)
    .eq('is_active', true);

  if (assignError) {
    console.warn('Failed to deactivate assignments during termination:', assignError.message);
  }

  // 3. Mark user inactive
  if (personnel?.user_id) {
    const { error: userError } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', personnel.user_id);

    if (userError) {
      console.warn('Failed to mark user inactive during termination:', userError.message);
    }
  }

  // 4. Update legacy guards
  try {
    const { error: guardError } = await supabase
      .from('guards')
      .update({ employment_status: 'terminated' })
      .eq('id', id);

    if (guardError) {
      console.warn('Dual-write termination on legacy guards failed (logged, no rollback):', guardError.message);
    }
  } catch (guardErr: any) {
    console.warn('Dual-write termination on legacy guards failed (logged, no rollback):', guardErr?.message || guardErr);
  }
}

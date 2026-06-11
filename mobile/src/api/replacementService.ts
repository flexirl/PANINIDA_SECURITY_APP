// =============================================================================
// Replacement Service
// =============================================================================
// Task 32: replacement CRUD, vacancy assignment, and availability checks
// =============================================================================

import { supabase } from './supabase';
import type { Replacement } from '../types/workforce';

/**
 * Task 32.1: Retrieves replacement records for a site, with optional date filter.
 */
export async function getReplacementsForSite(
  siteId: string,
  date?: string
): Promise<Replacement[]> {
  let query = supabase
    .from('replacements')
    .select(`
      *,
      site:sites(*),
      absent_personnel:workforce_personnel!replacements_absent_personnel_id_fkey(*, category:workforce_categories(*)),
      replacement_personnel:workforce_personnel!replacements_replacement_personnel_id_fkey(*, category:workforce_categories(*))
    `)
    .eq('site_id', siteId);

  if (date) {
    query = query.eq('shift_date', date);
  }

  const { data, error } = await query.order('shift_date', { ascending: false });

  if (error) {
    console.error('Error fetching replacements for site:', error.message);
    throw error;
  }

  return (data || []) as any[];
}

/**
 * Retrieves replacements for a list of site IDs (used by Supervisor/Manager dashboards).
 */
export async function getReplacementsForSites(siteIds: string[]): Promise<Replacement[]> {
  if (siteIds.length === 0) return [];

  const { data, error } = await supabase
    .from('replacements')
    .select(`
      *,
      site:sites(*),
      absent_personnel:workforce_personnel!replacements_absent_personnel_id_fkey(*, category:workforce_categories(*)),
      replacement_personnel:workforce_personnel!replacements_replacement_personnel_id_fkey(*, category:workforce_categories(*))
    `)
    .in('site_id', siteIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching replacements for sites:', error.message);
    throw error;
  }

  return (data || []) as any[];
}

/**
 * Task 32.2: Assigns a replacement personnel member to an open vacancy.
 * Enforces a conflict check: verifies that the replacement personnel is not already
 * assigned as a replacement on the same date.
 */
export async function assignReplacement(
  replacementId: string,
  replacementPersonnelId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Fetch the target replacement details
  const { data: replacement, error: fetchErr } = await supabase
    .from('replacements')
    .select('shift_date, site_id')
    .eq('id', replacementId)
    .single();

  if (fetchErr || !replacement) {
    throw new Error('Replacement request not found.');
  }

  const shiftDate = replacement.shift_date;

  // 2. Conflict Check: check if the replacement personnel is already assigned as a replacement on this date
  const { data: conflict, error: conflictErr } = await supabase
    .from('replacements')
    .select('id')
    .eq('replacement_personnel_id', replacementPersonnelId)
    .eq('shift_date', shiftDate)
    .not('status', 'eq', 'cancelled')
    .limit(1);

  if (conflictErr) throw conflictErr;

  if (conflict && conflict.length > 0) {
    throw new Error('This personnel member is already assigned as a replacement on this date.');
  }

  // 3. Update replacement record: status='assigned', client_notified=true
  const { error: updateErr } = await supabase
    .from('replacements')
    .update({
      replacement_personnel_id: replacementPersonnelId,
      status: 'assigned',
      assigned_by: user.id,
      client_notified: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', replacementId);

  if (updateErr) {
    console.error('Error assigning replacement:', updateErr.message);
    throw new Error(updateErr.message);
  }

  // 4. Wire notification to site client user(s) (Task 40.4)
  try {
    const { data: clients } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('site_id', replacement.site_id)
      .eq('is_active', true);

    if (clients && clients.length > 0) {
      const notifications = clients.map(client => ({
        user_id: client.user_id,
        title: 'Replacement Assigned',
        body: 'A replacement staff member has been assigned for your shift.',
        type: 'replacement_assigned',
        data: { replacement_id: replacementId, site_id: replacement.site_id }
      }));
      
      await supabase.from('notifications').insert(notifications);
    }
  } catch (err: any) {
    console.warn('[Notification Wiring Error] Failed to notify client user (logged, no rollback):', err?.message || err);
  }
}

/**
 * Task 32.3: Cancels a replacement request.
 */
export async function cancelReplacement(replacementId: string): Promise<void> {
  const { error } = await supabase
    .from('replacements')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', replacementId);

  if (error) {
    console.error('Error cancelling replacement:', error.message);
    throw error;
  }
}

/**
 * Task 32.4: Completes a replacement, recording the vacancy end time.
 */
export async function completeReplacement(replacementId: string): Promise<void> {
  const { error } = await supabase
    .from('replacements')
    .update({
      status: 'completed',
      vacancy_end: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', replacementId);

  if (error) {
    console.error('Error completing replacement:', error.message);
    throw error;
  }
}

/**
 * Fetches available replacement personnel for a given site and shift date.
 * Excludes personnel currently assigned to any active role at this site, or
 * already assigned as a replacement elsewhere on this shift date.
 */
export async function getAvailableReplacementPersonnel(
  siteId: string,
  shiftDate: string
): Promise<any[]> {
  // Get active assignments at the target site (should not pick them)
  const { data: activeAssignments } = await supabase
    .from('site_assignments')
    .select('personnel_id')
    .eq('site_id', siteId)
    .eq('is_active', true);

  const excludedIds = activeAssignments?.map(a => a.personnel_id) || [];

  // Get personnel already assigned as replacements on this date
  const { data: activeReplacements } = await supabase
    .from('replacements')
    .select('replacement_personnel_id')
    .eq('shift_date', shiftDate)
    .not('status', 'eq', 'cancelled')
    .is('replacement_personnel_id', 'not.null');

  activeReplacements?.forEach(r => {
    if (r.replacement_personnel_id) {
      excludedIds.push(r.replacement_personnel_id);
    }
  });

  // Fetch all active workforce personnel who are NOT in the excluded list
  let query = supabase
    .from('workforce_personnel')
    .select('*, category:workforce_categories(*)')
    .eq('employment_status', 'active');

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching available replacements:', error.message);
    throw error;
  }

  return data || [];
}

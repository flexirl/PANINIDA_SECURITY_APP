// =============================================================================
// Site Assignment Service
// =============================================================================
// Task 10: CRUD operations for site_assignments table, roster retrieval,
// and site dashboard metrics computation.
// =============================================================================

import { supabase } from './supabase';
import type { SiteAssignment, SiteDashboardMetrics, WorkforcePersonnel, ShiftType } from '../types/workforce';

/**
 * Task 10.1: Fetches all assignments for a site.
 * Defaults to fetching active assignments only.
 * 
 * @param categoryIds Optional array of category IDs to filter by.
 *                    Empty array or undefined = no filter (shows all personnel).
 *                    This allows the "All Personnel" category filter to work correctly.
 */
export async function getAssignmentsForSite(
  siteId: string,
  isActiveOnly: boolean = true,
  categoryIds?: string[]
): Promise<SiteAssignment[]> {
  let query = supabase
    .from('site_assignments')
    .select(`
      *,
      personnel:workforce_personnel!inner(
        *,
        category:workforce_categories(*)
      )
    `)
    .eq('site_id', siteId);

  if (isActiveOnly) {
    query = query.eq('is_active', true);
  }

  if (categoryIds && categoryIds.length > 0) {
    query = query.in('personnel.category_id', categoryIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assignments for site:', error.message);
    throw new Error(error.message || 'Failed to retrieve site assignments');
  }

  return data || [];
}

/**
 * Task 10.2: Assigns workforce personnel to a site.
 * The DB trigger "trg_deactivate_prev_site_assignment" automatically deactivates
 * any existing active assignments for the same personnel.
 * Also performs a dual-write to the legacy "guard_site_assignments" table.
 */
export async function assignPersonnelToSite(data: {
  site_id: string;
  personnel_id: string;
  shift_type: ShiftType;
  start_date?: string;
}): Promise<SiteAssignment> {
  const { data: created, error } = await supabase
    .from('site_assignments')
    .insert({
      site_id: data.site_id,
      personnel_id: data.personnel_id,
      shift_type: data.shift_type,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      is_active: true
    })
    .select()
    .single();

  if (error || !created) {
    console.error('Error assigning personnel to site:', error?.message);
    throw new Error(error?.message || 'Failed to assign personnel to site');
  }

  // Dual-write to legacy guard_site_assignments
  try {
    // Map shift_type to 'day' or 'night' since legacy check constraint is strict
    const legacyShift = data.shift_type === 'night' ? 'night' : 'day';
    const { error: guardAssignError } = await supabase
      .from('guard_site_assignments')
      .insert({
        id: created.id, // Keep IDs matching
        guard_id: data.personnel_id,
        site_id: data.site_id,
        shift_type: legacyShift,
        assigned_date: data.start_date || new Date().toISOString().split('T')[0],
        is_active: true
      });

    if (guardAssignError) {
      console.warn('Dual-write to legacy guard_site_assignments failed (logged, no rollback):', guardAssignError.message);
    }
  } catch (err: any) {
    console.warn('Dual-write to legacy guard_site_assignments failed (logged, no rollback):', err?.message || err);
  }

  return created;
}

/**
 * Task 10.3: Computes all 7 site dashboard metrics:
 * - total_workforce (active personnel count)
 * - security_count (Guard, Gunman, Rifleman, PSO, Bouncer, Security Officer)
 * - housekeeping_count (Housekeeping, Sweeper)
 * - supervisor_count (Supervisor)
 * - present_today (checked in today)
 * - absent_today (absent today, only for attendance-required categories)
 * - vacant_positions (workforce_strength - total_workforce, or 'not_configured')
 */
export async function getSiteDashboardMetrics(siteId: string, categoryIds?: string[]): Promise<SiteDashboardMetrics> {
  // 1. Fetch site workforce strength
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('workforce_strength')
    .eq('id', siteId)
    .single();

  if (siteError || !site) {
    console.error('Error fetching site details for metrics:', siteError?.message);
    throw new Error(siteError?.message || 'Site not found');
  }

  // 2. Fetch all active assignments with categories
  const activeAssignments = await getAssignmentsForSite(siteId, true, categoryIds);

  // 3. Category definitions
  const securityPrefixes = ['PIS', 'GM', 'RM', 'PSO', 'BNC', 'SO'];
  const housekeepingPrefixes = ['HK', 'SWP'];
  const supervisorPrefixes = ['SUP'];

  let securityCount = 0;
  let housekeepingCount = 0;
  let supervisorCount = 0;

  const personnelIds: string[] = [];
  const attendanceRequiredMap = new Map<string, boolean>();

  activeAssignments.forEach(a => {
    const p = a.personnel;
    if (!p) return;
    personnelIds.push(p.id);

    const prefix = p.category?.prefix_code || '';
    if (securityPrefixes.includes(prefix)) {
      securityCount++;
    } else if (housekeepingPrefixes.includes(prefix)) {
      housekeepingCount++;
    } else if (supervisorPrefixes.includes(prefix)) {
      supervisorCount++;
    }

    attendanceRequiredMap.set(p.id, p.category?.attendance_required ?? true);
  });

  // 4. Fetch today's attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: attendanceList } = personnelIds.length > 0
    ? await supabase
        .from('workforce_attendance')
        .select('personnel_id, status')
        .eq('site_id', siteId)
        .eq('attendance_date', todayStr)
        .in('personnel_id', personnelIds)
    : { data: [] };

  const attendanceStatusMap = new Map<string, string>();
  attendanceList?.forEach(a => {
    attendanceStatusMap.set(a.personnel_id, a.status);
  });

  let presentToday = 0;
  let absentToday = 0;

  personnelIds.forEach(pid => {
    const status = attendanceStatusMap.get(pid);
    const requiresAttendance = attendanceRequiredMap.get(pid) ?? true;

    if (status && status !== 'absent') {
      presentToday++;
    } else {
      if (requiresAttendance) {
        absentToday++;
      }
    }
  });

  const totalWorkforce = activeAssignments.length;
  const vacantPositions =
    site.workforce_strength === null || site.workforce_strength === undefined
      ? 'not_configured'
      : Math.max(0, site.workforce_strength - totalWorkforce);

  return {
    total_workforce: totalWorkforce,
    security_count: securityCount,
    housekeeping_count: housekeepingCount,
    supervisor_count: supervisorCount,
    present_today: presentToday,
    absent_today: absentToday,
    vacant_positions: vacantPositions
  };
}

/**
 * Task 10.4: Retrieves the active workforce roster for a site grouped by category name.
 * Returns a SectionList-friendly structure: Array<{ title: string; data: WorkforcePersonnel[] }>.
 */
export async function getWorkforceRoster(
  siteId: string,
  categoryIds?: string[]
): Promise<{ title: string; data: (WorkforcePersonnel & { shift_type?: ShiftType; assignment_id: string })[] }[]> {
  const assignments = await getAssignmentsForSite(siteId, true, categoryIds);

  const personnelIds = assignments.map(a => a.personnel?.id).filter(Boolean) as string[];

  // Fetch today's attendance
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: attendanceList } = personnelIds.length > 0
    ? await supabase
        .from('workforce_attendance')
        .select('*')
        .eq('site_id', siteId)
        .eq('attendance_date', todayStr)
        .in('personnel_id', personnelIds)
    : { data: [] };

  const attendanceMap = new Map<string, any>();
  attendanceList?.forEach(a => {
    attendanceMap.set(a.personnel_id, a);
  });

  // Group active personnel by category name
  const groups: Record<string, any[]> = {};
  assignments.forEach(a => {
    const p = a.personnel;
    if (!p) return;

    const catName = p.category?.name || 'Uncategorized';
    if (!groups[catName]) {
      groups[catName] = [];
    }

    const todayAttendance = attendanceMap.get(p.id) || null;
    groups[catName].push({
      ...p,
      shift_type: a.shift_type,
      assignment_id: a.id,
      today_attendance: todayAttendance
    });
  });

  // Convert to SectionList structure
  return Object.keys(groups).map(title => ({
    title,
    data: groups[title]
  }));
}

/**
 * Task 10.5: Deactivates a site assignment.
 * Sets is_active = false and end_date = today.
 * Also performs a dual-write deactivation on the legacy table.
 */
export async function deactivateAssignment(id: string): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('site_assignments')
    .update({
      is_active: false,
      end_date: todayStr
    })
    .eq('id', id);

  if (error) {
    console.error('Error deactivating assignment:', error.message);
    throw new Error(error.message || 'Failed to deactivate site assignment');
  }

  // Dual-write legacy deactivation
  try {
    const { error: guardDeassignError } = await supabase
      .from('guard_site_assignments')
      .update({ is_active: false })
      .eq('id', id);

    if (guardDeassignError) {
      console.warn('Dual-write deactivation on legacy guard_site_assignments failed (logged, no rollback):', guardDeassignError.message);
    }
  } catch (err: any) {
    console.warn('Dual-write deactivation on legacy guard_site_assignments failed (logged, no rollback):', err?.message || err);
  }
}

// =============================================================================
// Supervisor Service
// =============================================================================
// Task 28: Supervisor dashboard aggregates and management actions
// =============================================================================

import { supabase } from './supabase';
import { raiseComplaint } from './complaintService';
import type {
  Site,
  WorkforcePersonnel,
  WorkforceAttendance,
  SupervisorDashboard
} from '../types/workforce';

/**
 * Helper to fetch current logged-in supervisor's workforce personnel record.
 */
export async function getSupervisorPersonnelRecord(): Promise<WorkforcePersonnel> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: wp, error } = await supabase
    .from('workforce_personnel')
    .select('*, category:workforce_categories(*)')
    .eq('user_id', user.id)
    .single();

  if (error || !wp) {
    throw new Error('Supervisor personnel record not found. User must be registered as workforce personnel.');
  }

  return wp;
}

/**
 * Task 28.1: Fetch all sites assigned to the current supervisor.
 */
export async function getAssignedSites(): Promise<Site[]> {
  const wp = await getSupervisorPersonnelRecord();

  const { data: sites, error } = await supabase
    .from('sites')
    .select('*')
    .eq('assigned_supervisor_id', wp.id)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching assigned sites:', error.message);
    throw error;
  }

  return sites || [];
}

/**
 * Task 28.2: Get supervisor dashboard aggregated metrics across all assigned sites.
 */
export async function getSupervisorDashboard(): Promise<SupervisorDashboard> {
  const sites = await getAssignedSites();
  const siteIds = sites.map(s => s.id);

  if (siteIds.length === 0) {
    return {
      assigned_sites: [],
      total_personnel: 0,
      open_complaint_count: 0,
      today_attendance_summary: { present: 0, absent: 0, late: 0, total: 0 },
      vacancy_count: 0
    };
  }

  // 1. Fetch total personnel (active assignments)
  const { count: totalPersonnel, error: countErr } = await supabase
    .from('site_assignments')
    .select('id', { count: 'exact', head: true })
    .in('site_id', siteIds)
    .eq('is_active', true);

  if (countErr) throw countErr;

  // 2. Fetch open complaints count
  const { count: openComplaints, error: compErr } = await supabase
    .from('complaints')
    .select('id', { count: 'exact', head: true })
    .in('site_id', siteIds)
    .not('status', 'in', '("resolved","closed")');

  if (compErr) throw compErr;

  // 3. Fetch today's attendance summary
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: attendance, error: attErr } = await supabase
    .from('workforce_attendance')
    .select('status, personnel_id, personnel:workforce_personnel(category:workforce_categories(attendance_required))')
    .in('site_id', siteIds)
    .eq('attendance_date', todayStr);

  if (attErr) throw attErr;

  const { data: activeAssignments, error: assignErr } = await supabase
    .from('site_assignments')
    .select('personnel_id, personnel:workforce_personnel(category:workforce_categories(attendance_required))')
    .in('site_id', siteIds)
    .eq('is_active', true);

  if (assignErr) throw assignErr;

  const expectedReqPersonnelIds = activeAssignments
    ?.filter(a => a.personnel?.category?.attendance_required !== false)
    .map(a => a.personnel_id) || [];

  const totalExpected = expectedReqPersonnelIds.length;

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  const recordedPersonnelIds = new Set<string>();

  attendance?.forEach(a => {
    if (expectedReqPersonnelIds.includes(a.personnel_id)) {
      recordedPersonnelIds.add(a.personnel_id);
      if (a.status === 'present' || a.status === 'corrected') {
        presentCount++;
      } else if (a.status === 'late') {
        lateCount++;
        presentCount++;
      } else if (a.status === 'half_day') {
        presentCount += 0.5;
      } else if (a.status === 'absent') {
        absentCount++;
      }
    }
  });

  const missingCount = Math.max(0, totalExpected - recordedPersonnelIds.size);
  absentCount += missingCount;

  // 4. Fetch vacancies (replacements requested but not yet assigned)
  const { count: vacancyCount, error: vacErr } = await supabase
    .from('replacements')
    .select('id', { count: 'exact', head: true })
    .in('site_id', siteIds)
    .eq('status', 'requested');

  if (vacErr) throw vacErr;

  return {
    assigned_sites: sites,
    total_personnel: totalPersonnel || 0,
    open_complaint_count: openComplaints || 0,
    today_attendance_summary: {
      present: Math.round(presentCount),
      absent: Math.round(absentCount),
      late: lateCount,
      total: totalExpected
    },
    vacancy_count: vacancyCount || 0
  };
}

/**
 * Task 28.3: Retrieve pending attendance corrections (manual entries not yet approved) for supervisor's sites.
 */
export async function getPendingAttendanceCorrections(): Promise<WorkforceAttendance[]> {
  const sites = await getAssignedSites();
  const siteIds = sites.map(s => s.id);

  if (siteIds.length === 0) return [];

  const { data, error } = await supabase
    .from('workforce_attendance')
    .select('*, personnel:workforce_personnel(*, category:workforce_categories(*))')
    .in('site_id', siteIds)
    .eq('is_manual_entry', true)
    .is('approved_by', null)
    .order('attendance_date', { ascending: false });

  if (error) {
    console.error('Error fetching pending corrections:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Task 28.5: Submits a new supervisor incident report as an incident complaint.
 */
export async function submitIncidentReport(data: {
  site_id: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}): Promise<any> {
  return raiseComplaint({
    site_id: data.site_id,
    category: data.category,
    description: data.description,
    severity: data.severity,
    incident_reported: true
  });
}

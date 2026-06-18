import { supabase } from './supabase';
import { USE_MOCK_DATA, mockDelay } from '../__mocks__/mockConfig';
import { getDashboardOverviewByCategory } from '../__mocks__/mockData';

export interface DashboardOverview {
  guards: {
    total: number;
    active: number;
    assigned: number;
  };
  sites: {
    total: number;
    active: number;
  };
  today: {
    present: number;
    late: number;
    absent: number;
  };
  payroll: {
    pending: number;
  };
  recruitment: {
    active_candidates: number;
  };
  incidents: {
    last_7_days: number;
  };
}

/**
 * Fetches the overview metrics for the Admin Dashboard.
 * 
 * @param categoryIds Optional array of category IDs to filter by.
 *                    Empty array or undefined = no filter (shows all personnel).
 *                    This allows the "All Personnel" category filter to work correctly.
 */
export async function getDashboardOverview(categoryIds?: string[]): Promise<DashboardOverview> {
  // MOCK DATA MODE
  if (USE_MOCK_DATA) {
    await mockDelay();
    return getDashboardOverviewByCategory(categoryIds || []);
  }
  
  // REAL API MODE
  const today = new Date().toISOString().split('T')[0];

  // 1. Personnel Queries
  let totalPersonnelQuery = supabase.from('workforce_personnel').select('id', { count: 'exact', head: true });
  let activePersonnelQuery = supabase.from('workforce_personnel').select('id', { count: 'exact', head: true }).eq('employment_status', 'active');
  if (categoryIds && categoryIds.length > 0) {
    totalPersonnelQuery = totalPersonnelQuery.in('category_id', categoryIds);
    activePersonnelQuery = activePersonnelQuery.in('category_id', categoryIds);
  }

  // 2. Active Site Assignments Query
  let activeAssignmentsQuery;
  if (categoryIds && categoryIds.length > 0) {
    activeAssignmentsQuery = supabase
      .from('site_assignments')
      .select('id, personnel:workforce_personnel!inner(category_id, category:workforce_categories!inner(attendance_required))', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('personnel.category_id', categoryIds)
      .eq('personnel.category.attendance_required', true);
  } else {
    activeAssignmentsQuery = supabase
      .from('site_assignments')
      .select('id, personnel:workforce_personnel!inner(category:workforce_categories!inner(attendance_required))', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('personnel.category.attendance_required', true);
  }

  // 3. Today's Attendance Queries
  let attendanceQuery;
  let lateAttendanceQuery;
  if (categoryIds && categoryIds.length > 0) {
    attendanceQuery = supabase
      .from('workforce_attendance')
      .select('id, personnel:workforce_personnel!inner(category_id)', { count: 'exact', head: true })
      .eq('attendance_date', today)
      .in('personnel.category_id', categoryIds);
    lateAttendanceQuery = supabase
      .from('workforce_attendance')
      .select('id, personnel:workforce_personnel!inner(category_id)', { count: 'exact', head: true })
      .eq('attendance_date', today)
      .eq('status', 'late')
      .in('personnel.category_id', categoryIds);
  } else {
    attendanceQuery = supabase
      .from('workforce_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('attendance_date', today);
    lateAttendanceQuery = supabase
      .from('workforce_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('attendance_date', today)
      .eq('status', 'late');
  }

  // 4. Pending Payroll Query
  let payrollQuery;
  if (categoryIds && categoryIds.length > 0) {
    payrollQuery = supabase
      .from('payroll')
      .select('id, guards:workforce_personnel!inner(category_id)', { count: 'exact', head: true })
      .in('status', ['draft', 'generated'])
      .in('guards.category_id', categoryIds);
  } else {
    payrollQuery = supabase
      .from('payroll')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'generated']);
  }

  // 5. Global Queries
  const sitesTotalQuery = supabase.from('sites').select('id', { count: 'exact', head: true });
  const sitesActiveQuery = supabase.from('sites').select('id', { count: 'exact', head: true }).eq('is_active', true);
  const candidatesQuery = supabase.from('candidates').select('id', { count: 'exact', head: true }).not('status', 'in', '(hired,rejected)');
  const incidentsQuery = supabase.from('inspections').select('id', { count: 'exact', head: true })
    .eq('incident_reported', true)
    .gte('inspection_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const [
    { count: totalGuards },
    { count: activeGuards },
    { count: activeAssignments },
    { count: todayPresent },
    { count: todayLate },
    { count: pendingPayrolls },
    { count: totalSites },
    { count: activeSites },
    { count: totalCandidates },
    { count: recentIncidents },
  ] = await Promise.all([
    totalPersonnelQuery,
    activePersonnelQuery,
    activeAssignmentsQuery,
    attendanceQuery,
    lateAttendanceQuery,
    payrollQuery,
    sitesTotalQuery,
    sitesActiveQuery,
    candidatesQuery,
    incidentsQuery,
  ]);

  return {
    guards: {
      total: totalGuards || 0,
      active: activeGuards || 0,
      assigned: activeAssignments || 0,
    },
    sites: {
      total: totalSites || 0,
      active: activeSites || 0,
    },
    today: {
      present: todayPresent || 0,
      late: todayLate || 0,
      absent: Math.max(0, (activeAssignments || 0) - (todayPresent || 0)),
    },
    payroll: {
      pending: pendingPayrolls || 0,
    },
    recruitment: {
      active_candidates: totalCandidates || 0,
    },
    incidents: {
      last_7_days: recentIncidents || 0,
    },
  };
}

/**
 * Fetches the attendance statistics.
 * @param date YYYY-MM-DD date string
 * @param categoryIds Optional array of category IDs to filter by
 */
export async function getDailyAttendanceReport(date: string, categoryIds?: string[]): Promise<any> {
  let url = `dashboard?view=attendance&date=${encodeURIComponent(date)}`;
  
  if (categoryIds && categoryIds.length > 0) {
    url += `&category_ids=${categoryIds.join(',')}`;
  }

  const { data, error } = await supabase.functions.invoke(url, {
    method: 'GET',
  });

  if (error) {
    console.error('Error fetching attendance report:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to fetch attendance report');
  }

  return data;
}

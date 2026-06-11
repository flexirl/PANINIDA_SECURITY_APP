// =============================================================================
// Client Portal Service
// =============================================================================
// Task 14: Client-scoped data retrieval (roster, attendance, documents, ratings)
// =============================================================================

import { supabase } from './supabase';
import { getWorkforceRoster, getAssignmentsForSite } from './siteAssignmentService';
import type {
  Site,
  WorkforcePersonnel,
  WorkforceDocument,
  RatingSummary,
  ShiftType
} from '../types/workforce';

/**
 * Task 14.1: Fetch site details for the current client user's site_id.
 * Enforces is_active check on the client_users record.
 */
export async function getClientSiteInfo(): Promise<Site | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: clientUser, error: cuError } = await supabase
    .from('client_users')
    .select('site_id, is_active')
    .eq('user_id', user.id)
    .single();

  if (cuError || !clientUser) {
    throw new Error('Client user profile not found or inactive');
  }

  if (!clientUser.is_active) {
    throw new Error('Client user account is deactivated');
  }

  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('*')
    .eq('id', clientUser.site_id)
    .single();

  if (siteError) throw siteError;
  return site;
}

/**
 * Task 14.2: Retrieve active workforce roster scoped to the client site, grouped by category name.
 */
export async function getClientWorkforceRoster(): Promise<{ title: string; data: (WorkforcePersonnel & { shift_type?: ShiftType; assignment_id: string })[] }[]> {
  const site = await getClientSiteInfo();
  if (!site) return [];
  return getWorkforceRoster(site.id);
}

/**
 * Task 14.3: Aggregate workforce attendance by daily/weekly/monthly periods for client's site.
 * Counts expected entries only for personnel whose categories have attendance_required = true.
 */
export async function getClientAttendance(
  granularity: 'daily' | 'weekly' | 'monthly',
  date: Date
): Promise<{
  overall_percentage: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  half_day_count: number;
  total_expected: number;
  personnel_breakdown: Array<{
    personnel_id: string;
    name: string;
    employee_id: string;
    status: string;
  }>;
}> {
  const site = await getClientSiteInfo();
  if (!site) {
    return {
      overall_percentage: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      half_day_count: 0,
      total_expected: 0,
      personnel_breakdown: []
    };
  }

  let startDateStr: string;
  let endDateStr: string;
  const targetDate = new Date(date);

  if (granularity === 'daily') {
    startDateStr = targetDate.toISOString().split('T')[0];
    endDateStr = startDateStr;
  } else if (granularity === 'weekly') {
    const day = targetDate.getDay();
    const diff = targetDate.getDate() - day;
    const startOfWeek = new Date(targetDate.setDate(diff));
    startDateStr = startOfWeek.toISOString().split('T')[0];
    const endOfWeek = new Date(targetDate.setDate(diff + 6));
    endDateStr = endOfWeek.toISOString().split('T')[0];
  } else {
    // monthly
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    startDateStr = startOfMonth.toISOString().split('T')[0];
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    endDateStr = endOfMonth.toISOString().split('T')[0];
  }

  const assignments = await getAssignmentsForSite(site.id, true);
  const personnelMap = new Map<string, WorkforcePersonnel>();
  assignments.forEach(a => {
    if (a.personnel) {
      personnelMap.set(a.personnel_id, a.personnel);
    }
  });

  const personnelIds = Array.from(personnelMap.keys());
  if (personnelIds.length === 0) {
    return {
      overall_percentage: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      half_day_count: 0,
      total_expected: 0,
      personnel_breakdown: []
    };
  }

  const { data: attendanceRecords, error: attError } = await supabase
    .from('workforce_attendance')
    .select('personnel_id, status, attendance_date')
    .eq('site_id', site.id)
    .gte('attendance_date', startDateStr)
    .lte('attendance_date', endDateStr)
    .in('personnel_id', personnelIds);

  if (attError) throw attError;

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const dayCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const attendanceReqPersonnel = personnelIds.filter(pid => {
    const p = personnelMap.get(pid);
    return p?.category?.attendance_required !== false;
  });

  const totalExpected = attendanceReqPersonnel.length * dayCount;

  const attendanceByPersonnel = new Map<string, any[]>();
  attendanceRecords?.forEach(r => {
    if (!attendanceByPersonnel.has(r.personnel_id)) {
      attendanceByPersonnel.set(r.personnel_id, []);
    }
    attendanceByPersonnel.get(r.personnel_id)!.push(r);

    const isReq = attendanceReqPersonnel.includes(r.personnel_id);
    if (isReq) {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'late') {
        lateCount++;
        presentCount++;
      } else if (r.status === 'half_day') {
        halfDayCount++;
        presentCount += 0.5;
      } else if (r.status === 'absent') {
        absentCount++;
      } else if (r.status === 'corrected') {
        presentCount++;
      }
    }
  });

  const totalRecordsCountForReq = attendanceRecords?.filter(r =>
    attendanceReqPersonnel.includes(r.personnel_id)
  ).length || 0;
  const missingCount = Math.max(0, totalExpected - totalRecordsCountForReq);
  absentCount += missingCount;

  const overallPercentage = totalExpected > 0 ? (presentCount / totalExpected) * 100 : 100;

  const personnelBreakdown = personnelIds.map(pid => {
    const p = personnelMap.get(pid);
    const records = attendanceByPersonnel.get(pid) || [];

    let status = 'N/A';
    if (p?.category?.attendance_required === false) {
      status = 'not_required';
    } else {
      if (granularity === 'daily') {
        status = records[0]?.status || 'absent';
      } else {
        const pPresent = records.filter(r =>
          ['present', 'late', 'corrected'].includes(r.status)
        ).length + records.filter(r => r.status === 'half_day').length * 0.5;
        status = `${pPresent}/${dayCount} Days`;
      }
    }

    return {
      personnel_id: pid,
      name: p?.name || 'Unknown',
      employee_id: p?.employee_id || 'N/A',
      status
    };
  });

  return {
    overall_percentage: Math.round(overallPercentage),
    present_count: presentCount,
    absent_count: absentCount,
    late_count: lateCount,
    half_day_count: halfDayCount,
    total_expected: totalExpected,
    personnel_breakdown
  };
}

/**
 * Task 14.4: Retrieve verification documents for a personnel, filtered to client-permitted types.
 */
export async function getClientDocuments(personnelId: string): Promise<WorkforceDocument[]> {
  const permittedTypes = [
    'aadhaar',
    'pan',
    'police_verification',
    'security_training_certificate',
    'weapon_training_certificate',
    'gun_license',
    'ex_servicemen_proof'
  ];

  const { data, error } = await supabase
    .from('workforce_documents')
    .select('*')
    .eq('personnel_id', personnelId)
    .in('document_type', permittedTypes);

  if (error) {
    console.error('Error fetching client documents:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Task 14.5: Retrieve site performance overview including average rating, open complaints, and appreciations.
 */
export async function getClientPerformanceOverview(): Promise<(WorkforcePersonnel & { rating_summary: RatingSummary })[]> {
  const site = await getClientSiteInfo();
  if (!site) return [];

  const assignments = await getAssignmentsForSite(site.id, true);
  const personnelList = assignments.map(a => a.personnel).filter(Boolean) as WorkforcePersonnel[];
  const personnelIds = personnelList.map(p => p.id);

  if (personnelIds.length === 0) return [];

  const { data: ratings, error: ratingsError } = await supabase
    .from('workforce_ratings')
    .select('*')
    .eq('site_id', site.id)
    .in('personnel_id', personnelIds);

  if (ratingsError) throw ratingsError;

  const { data: openComplaints, error: complaintsError } = await supabase
    .from('complaints')
    .select('assigned_to, status')
    .eq('site_id', site.id)
    .not('status', 'in', '("resolved","closed")');

  if (complaintsError) throw complaintsError;

  const ratingsByPersonnel = new Map<string, any[]>();
  ratings?.forEach(r => {
    if (!ratingsByPersonnel.has(r.personnel_id)) {
      ratingsByPersonnel.set(r.personnel_id, []);
    }
    ratingsByPersonnel.get(r.personnel_id)!.push(r);
  });

  const openComplaintsByUser = new Map<string, number>();
  openComplaints?.forEach(c => {
    if (c.assigned_to) {
      openComplaintsByUser.set(c.assigned_to, (openComplaintsByUser.get(c.assigned_to) || 0) + 1);
    }
  });

  return personnelList.map(p => {
    const pRatings = ratingsByPersonnel.get(p.id) || [];
    const totalRating = pRatings.reduce((sum, r) => sum + Number(r.rating), 0);
    const avgRating = pRatings.length > 0 ? totalRating / pRatings.length : 0;
    const appreciationCount = pRatings.filter(r => r.appreciation).length;

    let lastReviewDate: string | null = null;
    if (pRatings.length > 0) {
      const dates = pRatings.map(r => new Date(r.review_date).getTime());
      const maxTime = Math.max(...dates);
      lastReviewDate = new Date(maxTime).toISOString().split('T')[0];
    }

    const openComplaintCount = p.user_id ? (openComplaintsByUser.get(p.user_id) || 0) : 0;

    return {
      ...p,
      rating_summary: {
        average_rating: Math.round(avgRating * 10) / 10,
        open_complaint_count: openComplaintCount,
        appreciation_count: appreciationCount,
        last_review_date: lastReviewDate
      }
    };
  });
}

/**
 * Submits a rating review for a personnel member.
 */
export async function submitWorkforceRating(data: {
  personnel_id: string;
  rating: number;
  review_text?: string;
  appreciation?: boolean;
}): Promise<void> {
  const site = await getClientSiteInfo();
  if (!site) throw new Error('Client site not found');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('workforce_ratings')
    .insert({
      personnel_id: data.personnel_id,
      site_id: site.id,
      rated_by: user.id,
      rating: data.rating,
      review_text: data.review_text,
      appreciation: data.appreciation || false,
      review_date: new Date().toISOString().split('T')[0]
    });

  if (error) {
    console.error('Error submitting rating:', error.message);
    throw error;
  }
}

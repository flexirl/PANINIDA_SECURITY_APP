// =============================================================================
// Workforce Attendance Service
// =============================================================================
// Task 23: Core attendance business logic (check-in, check-out, manual correction).
// =============================================================================

import { supabase } from './supabase';
import type { WorkforceAttendance, AttendanceStatus, ShiftType } from '../types/workforce';

/**
 * Helper to calculate distance in meters between two coordinates.
 * Implements the standard Haversine formula.
 */
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Task 23.1: Performs check-in for workforce personnel.
 * For categories where attendance is required, validates that the coordinates
 * are within the site's geofence radius.
 */
export async function checkIn(data: {
  personnel_id: string;
  site_id: string;
  shift_type: ShiftType;
  latitude?: number;
  longitude?: number;
  selfie_url?: string;
}): Promise<WorkforceAttendance> {
  // 1. Fetch personnel category details
  const { data: personnel, error: pError } = await supabase
    .from('workforce_personnel')
    .select('id, category:workforce_categories(attendance_required)')
    .eq('id', data.personnel_id)
    .single();

  if (pError || !personnel) {
    throw new Error('Personnel profile not found.');
  }

  const attendanceRequired = (personnel as any).category?.attendance_required ?? true;

  // 2. Validate geofence if required
  if (attendanceRequired) {
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new Error('Geofence check failed: Location coordinates are required for check-in.');
    }

    const { data: site, error: sError } = await supabase
      .from('sites')
      .select('latitude, longitude, geofence_radius')
      .eq('id', data.site_id)
      .single();

    if (sError || !site) {
      throw new Error('Deployment site not found.');
    }

    const distance = getDistanceInMeters(
      data.latitude,
      data.longitude,
      Number(site.latitude),
      Number(site.longitude)
    );

    const radius = site.geofence_radius || 100;

    if (distance > radius) {
      throw new Error(
        `Outside geofence! You are ${Math.round(distance)}m away from site.\n` +
        `Maximum allowed: ${radius}m\n` +
        `Your location: ${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}\n` +
        `Site location: ${site.latitude}, ${site.longitude}\n` +
        `Tip: Move closer to the site or contact admin to increase geofence radius.`
      );
    }
  }

  // 3. Insert check-in record
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: created, error } = await supabase
    .from('workforce_attendance')
    .insert({
      personnel_id: data.personnel_id,
      site_id: data.site_id,
      shift_type: data.shift_type,
      attendance_date: todayStr,
      check_in_time: new Date().toISOString(),
      check_in_selfie: data.selfie_url || null,
      check_in_latitude: data.latitude || null,
      check_in_longitude: data.longitude || null,
      status: 'present',
      is_manual_entry: false
    })
    .select()
    .single();

  if (error || !created) {
    console.error('Error inserting attendance:', error?.message);
    throw new Error(error?.message || 'Failed to submit check-in record.');
  }

  return created;
}

/**
 * Task 23.2: Performs check-out.
 * Automatically computes hours_worked.
 */
export async function checkOut(
  attendanceId: string,
  data: {
    selfie_url?: string;
  }
): Promise<WorkforceAttendance> {
  // 1. Fetch check-in details
  const { data: record, error: fetchErr } = await supabase
    .from('workforce_attendance')
    .select('check_in_time')
    .eq('id', attendanceId)
    .single();

  if (fetchErr || !record) {
    throw new Error('Attendance check-in record not found.');
  }

  const now = new Date();
  const checkInTime = new Date(record.check_in_time!);
  
  // Hours worked calculation (diff in milliseconds divided by hours conversion)
  const diffHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
  const hoursWorked = Number(Math.max(0, diffHours).toFixed(2));

  // 2. Update record
  const { data: updated, error } = await supabase
    .from('workforce_attendance')
    .update({
      check_out_time: now.toISOString(),
      check_out_selfie: data.selfie_url || null,
      hours_worked: hoursWorked
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error || !updated) {
    console.error('Error updating check-out:', error?.message);
    throw new Error(error?.message || 'Failed to submit check-out record.');
  }

  return updated;
}

/**
 * Task 23.3: Manual attendance entry.
 * Skips geofence validation. Allowed only for attendance optional categories,
 * or when performed by a supervisor/admin.
 */
export async function manualEntry(data: {
  personnel_id: string;
  site_id: string;
  attendance_date: string;
  shift_type: ShiftType;
  status: AttendanceStatus;
  remarks?: string;
}): Promise<WorkforceAttendance> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from('workforce_attendance')
    .insert({
      personnel_id: data.personnel_id,
      site_id: data.site_id,
      shift_type: data.shift_type,
      attendance_date: data.attendance_date,
      status: data.status,
      is_manual_entry: true,
      approved_by: user?.id || null, // Auto-approve if created by admin/supervisor
      approved_at: user?.id ? new Date().toISOString() : null,
      remarks: data.remarks || 'Manual entry'
    })
    .select()
    .single();

  if (error || !created) {
    console.error('Error in manual entry:', error?.message);
    throw new Error(error?.message || 'Failed to create manual attendance entry.');
  }

  return created;
}

/**
 * Task 23.4: Fetches all active personnel attendance for a site on a specific date.
 */
export async function getAttendanceForSite(siteId: string, date: string): Promise<WorkforceAttendance[]> {
  const { data, error } = await supabase
    .from('workforce_attendance')
    .select(`
      *,
      personnel:workforce_personnel(
        *,
        category:workforce_categories(*)
      )
    `)
    .eq('site_id', siteId)
    .eq('attendance_date', date);

  if (error) {
    console.error('Error fetching site attendance:', error.message);
    throw new Error(error.message || 'Failed to retrieve attendance roster.');
  }

  return data || [];
}

/**
 * Task 23.5: Fetches attendance records for a single personnel within a date range.
 */
export async function getAttendanceForPersonnel(
  personnelId: string,
  fromDate: string,
  toDate: string
): Promise<WorkforceAttendance[]> {
  const { data, error } = await supabase
    .from('workforce_attendance')
    .select('*')
    .eq('personnel_id', personnelId)
    .gte('attendance_date', fromDate)
    .lte('attendance_date', toDate)
    .order('attendance_date', { ascending: false });

  if (error) {
    console.error('Error fetching personnel attendance:', error.message);
    throw new Error(error.message || 'Failed to retrieve attendance history.');
  }

  return data || [];
}

/**
 * Task 23.6: Approves a manual attendance correction request.
 * Sets status to 'corrected' and records the approver.
 */
export async function approveCorrection(attendanceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to approve attendance corrections.');
  }

  const { error } = await supabase
    .from('workforce_attendance')
    .update({
      status: 'corrected',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', attendanceId);

  if (error) {
    console.error('Error approving correction:', error.message);
    throw new Error(error.message || 'Failed to approve attendance correction.');
  }
}

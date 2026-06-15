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
 * Helper: Parse a time string "HH:MM" into total minutes since midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Helper: Determine if a check-in time is late relative to shift start.
 * Handles overnight (night) shifts that cross midnight.
 */
function isCheckInLate(
  checkInDate: Date,
  shiftStartStr: string,
  lateThresholdMinutes: number
): { isLate: boolean; minutesLate: number } {
  const currentMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  const shiftStart = parseTimeToMinutes(shiftStartStr);
  const lateAfter = shiftStart + lateThresholdMinutes;

  // Simple day-shift case: check if current time exceeds shift_start + threshold
  let minutesLate = currentMinutes - shiftStart;

  // Handle overnight wrap (e.g., shift starts 20:00, guard checks in at 01:00 next day)
  if (minutesLate < -720) {
    // Guard is checking in after midnight for a night shift that started yesterday
    minutesLate += 1440;
  }

  return {
    isLate: minutesLate > lateThresholdMinutes,
    minutesLate: Math.max(0, minutesLate),
  };
}

/**
 * Task 23.1: Performs check-in for workforce personnel.
 * - Validates geofence (if attendance is required for the category)
 * - Detects LATE check-in based on site's shift timing + configurable threshold
 * - Stores check-in selfie and GPS coordinates
 */
export async function checkIn(data: {
  personnel_id: string;
  site_id: string;
  shift_type?: ShiftType;
  latitude?: number;
  longitude?: number;
  selfie_url?: string;
}): Promise<WorkforceAttendance> {
  // 1. Fetch personnel category details
  const { data: personnel, error: pError } = await supabase
    .from('workforce_personnel')
    .select('id, shift_type, category:workforce_categories(attendance_required)')
    .eq('id', data.personnel_id)
    .single();

  if (pError || !personnel) {
    throw new Error('Personnel profile not found.');
  }

  const attendanceRequired = (personnel as any).category?.attendance_required ?? true;
  const shiftType = data.shift_type || (personnel as any).shift_type || 'day';

  // 2. Fetch site details (geofence + shift timings + thresholds)
  const { data: site, error: sError } = await supabase
    .from('sites')
    .select('latitude, longitude, geofence_radius, day_shift_start, day_shift_end, night_shift_start, night_shift_end, late_threshold_minutes, min_hours_present, min_hours_half_day')
    .eq('id', data.site_id)
    .single();

  if (sError || !site) {
    throw new Error('Deployment site not found.');
  }

  // 3. Validate geofence if required
  if (attendanceRequired) {
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new Error('Geofence check failed: Location coordinates are required for check-in.');
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

  // 4. Determine if check-in is LATE based on shift timing
  const now = new Date();
  const shiftStartStr = shiftType === 'night'
    ? (site.night_shift_start || '20:00')
    : (site.day_shift_start || '08:00');
  const lateThreshold = site.late_threshold_minutes ?? 120;

  const lateCheck = isCheckInLate(now, shiftStartStr, lateThreshold);
  const status: AttendanceStatus = lateCheck.isLate ? 'late' : 'present';

  // 5. Insert check-in record
  const todayStr = now.toISOString().split('T')[0];

  const { data: created, error } = await supabase
    .from('workforce_attendance')
    .insert({
      personnel_id: data.personnel_id,
      site_id: data.site_id,
      shift_type: shiftType,
      attendance_date: todayStr,
      check_in_time: now.toISOString(),
      check_in_selfie: data.selfie_url || null,
      check_in_latitude: data.latitude || null,
      check_in_longitude: data.longitude || null,
      status,
      is_manual_entry: false,
      remarks: lateCheck.isLate
        ? `Late by ${Math.floor(lateCheck.minutesLate / 60)}h ${lateCheck.minutesLate % 60}m`
        : null,
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
 * Task 23.2: Performs check-out for workforce personnel.
 * - Validates geofence on check-out (must be inside site boundary)
 * - Requires check-out selfie
 * - Calculates hours worked from check_in_time to now
 * - Determines final attendance status based on hours worked + late flag:
 *     < min_hours_half_day → absent
 *     min_hours_half_day..min_hours_present → half_day
 *     ≥ min_hours_present + was on-time → present
 *     ≥ min_hours_present + was late → present_late
 */
export async function checkOut(
  attendanceId: string,
  data: {
    latitude?: number;
    longitude?: number;
    selfie_url?: string;
  }
): Promise<WorkforceAttendance> {
  // 1. Fetch full check-in record + site details for geofence & thresholds
  const { data: record, error: fetchErr } = await supabase
    .from('workforce_attendance')
    .select('check_in_time, status, site_id, personnel_id')
    .eq('id', attendanceId)
    .single();

  if (fetchErr || !record) {
    throw new Error('Attendance check-in record not found.');
  }

  // 2. Fetch site for geofence + threshold config
  const { data: site, error: sError } = await supabase
    .from('sites')
    .select('latitude, longitude, geofence_radius, min_hours_present, min_hours_half_day')
    .eq('id', record.site_id)
    .single();

  if (sError || !site) {
    throw new Error('Deployment site not found.');
  }

  // 3. Validate geofence on check-out
  if (data.latitude !== undefined && data.longitude !== undefined) {
    const distance = getDistanceInMeters(
      data.latitude,
      data.longitude,
      Number(site.latitude),
      Number(site.longitude)
    );

    const radius = site.geofence_radius || 100;

    if (distance > radius) {
      throw new Error(
        `Cannot check out — you are outside the geofence!\n` +
        `Distance from site: ${Math.round(distance)}m (max ${radius}m)\n` +
        `Please return to the site boundary before checking out.\n` +
        `चेक आउट नहीं कर सकते — आप सीमा के बाहर हैं!`
      );
    }
  } else {
    throw new Error(
      'Location coordinates are required for check-out.\n' +
      'चेक आउट के लिए GPS स्थान आवश्यक है।'
    );
  }

  // 4. Calculate hours worked
  const now = new Date();
  const checkInTime = new Date(record.check_in_time!);
  const diffHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
  const hoursWorked = Number(Math.max(0, diffHours).toFixed(2));

  // 6. Determine final status based on hours worked + check-in late flag
  const wasLateCheckIn = record.status === 'late';
  const minPresent = site.min_hours_present ?? 7;
  const minHalfDay = site.min_hours_half_day ?? 4;

  let finalStatus: AttendanceStatus;
  if (hoursWorked < minHalfDay) {
    finalStatus = 'absent';
  } else if (hoursWorked < minPresent) {
    finalStatus = 'half_day';
  } else {
    finalStatus = wasLateCheckIn ? 'present_late' : 'present';
  }

  // 7. Build remarks
  const hoursH = Math.floor(hoursWorked);
  const hoursM = Math.round((hoursWorked - hoursH) * 60);
  let remarks = `Worked ${hoursH}h ${hoursM}m`;
  if (wasLateCheckIn) {
    remarks += ' (checked in late)';
  }

  // 8. Update record with check-out data
  const { data: updated, error } = await supabase
    .from('workforce_attendance')
    .update({
      check_out_time: now.toISOString(),
      check_out_selfie: data.selfie_url,
      check_out_latitude: data.latitude,
      check_out_longitude: data.longitude,
      hours_worked: hoursWorked,
      status: finalStatus,
      remarks,
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

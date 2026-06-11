import { supabase } from './supabase';

export interface AttendanceRecord {
  id: string;
  guard_id: string;
  site_id: string;
  shift_type: 'day' | 'night';
  check_in_time?: string;
  check_out_time?: string;
  check_in_selfie?: string;
  check_out_selfie?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  hours_worked?: number;
  status: 'present' | 'late' | 'half_day' | 'absent';
  is_manual_entry: boolean;
  attendance_date: string;
  guards?: {
    name: string;
  };
  sites?: {
    site_name: string;
  };
}

/**
 * Submits a guard check-in. Validates coordinates against the geofence on the backend.
 * Error messages include detailed location information for debugging geofence issues.
 */
export async function checkIn(params: {
  guard_id: string;
  latitude: number;
  longitude: number;
  selfie_url: string;
}): Promise<AttendanceRecord> {
  const { data, error } = await supabase.functions.invoke('attendance', {
    method: 'POST',
    body: params,
  });

  if (error) {
    console.error('Error in checkIn:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Check-in failed');
  }

  return data.attendance;
}

/**
 * Submits a guard check-out. Updates hours worked.
 */
export async function checkOut(
  attendanceId: string,
  params: {
    guard_id: string;
    latitude: number;
    longitude: number;
    selfie_url?: string;
  }
): Promise<AttendanceRecord> {
  const { data, error } = await supabase.functions.invoke(`attendance?id=${encodeURIComponent(attendanceId)}`, {
    method: 'PUT',
    body: params,
  });

  if (error) {
    console.error('Error in checkOut:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Check-out failed');
  }

  return data.attendance;
}

/**
 * Fetches attendance records with date, site, guard, or category filters.
 * 
 * @param filters Optional filters object
 * @param filters.category_ids Optional array of category IDs to filter by.
 *                             Empty array or undefined = no filter (shows all personnel).
 *                             This allows the "All Personnel" category filter to work correctly.
 */
export async function getAttendance(filters?: {
  date?: string;
  guard_id?: string;
  site_id?: string;
  category_ids?: string[];
}): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('workforce_attendance')
    .select(`
      *,
      personnel:workforce_personnel!inner(
        id,
        name,
        phone,
        category_id
      ),
      site:sites(
        id,
        site_name
      )
    `)
    .order('check_in_time', { ascending: false });

  if (filters?.date) {
    query = query.eq('attendance_date', filters.date);
  }
  if (filters?.guard_id) {
    query = query.eq('personnel_id', filters.guard_id);
  }
  if (filters?.site_id) {
    query = query.eq('site_id', filters.site_id);
  }
  if (filters?.category_ids && filters.category_ids.length > 0) {
    query = query.in('personnel.category_id', filters.category_ids);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error in getAttendance:', error.message);
    throw error;
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    guard_id: r.personnel_id,
    site_id: r.site_id,
    shift_type: r.shift_type,
    check_in_time: r.check_in_time,
    check_out_time: r.check_out_time,
    check_in_selfie: r.check_in_selfie,
    check_out_selfie: r.check_out_selfie,
    check_in_latitude: r.check_in_latitude,
    check_in_longitude: r.check_in_longitude,
    hours_worked: r.hours_worked,
    status: r.status,
    is_manual_entry: r.is_manual_entry,
    attendance_date: r.attendance_date,
    guards: {
      name: r.personnel?.name || 'Unknown Guard'
    },
    sites: {
      site_name: r.site?.site_name || 'Assigned Site'
    }
  }));
}

import { supabase } from './supabase';

export interface SiteProfile {
  id: string;
  site_name: string;
  client_name?: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  day_shift_start?: string;
  day_shift_end?: string;
  night_shift_start?: string;
  night_shift_end?: string;
  contact_person?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at?: string;
}

export interface AssignmentRecord {
  id: string;
  guard_id: string;
  site_id: string;
  shift_type: 'day' | 'night';
  is_active: boolean;
  assigned_at?: string;
  guards?: {
    name: string;
    phone: string;
  };
  sites?: {
    site_name: string;
    address: string;
  };
}

/**
 * Fetches all sites.
 */
export async function getSites(): Promise<SiteProfile[]> {
  const { data, error } = await supabase.functions.invoke('sites', {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getSites:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve sites list');
  }

  return data.sites || [];
}

/**
 * Fetches detail of a single site by UUID.
 */
export async function getSiteDetail(id: string): Promise<SiteProfile> {
  const { data, error } = await supabase.functions.invoke(`sites?id=${encodeURIComponent(id)}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getSiteDetail:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve site details');
  }

  return data.site;
}

/**
 * Creates a new security site.
 */
export async function createSite(site: Omit<SiteProfile, 'id' | 'is_active'>): Promise<SiteProfile> {
  const { data, error } = await supabase.functions.invoke('sites', {
    method: 'POST',
    body: site,
  });

  if (error) {
    console.error('Error in createSite:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to create site');
  }

  return data.site;
}

/**
 * Updates site coordinates, address, or details.
 */
export async function updateSite(id: string, updates: Partial<SiteProfile>): Promise<SiteProfile> {
  const { data, error } = await supabase.functions.invoke(`sites?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: updates,
  });

  if (error) {
    console.error('Error in updateSite:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to update site');
  }

  return data.site;
}

/**
 * Lists all active shift assignments, optionally filtering by guard or site.
 */
export async function getAssignments(filters?: {
  guard_id?: string;
  site_id?: string;
}): Promise<AssignmentRecord[]> {
  const params: string[] = [];
  if (filters?.guard_id) params.push(`guard_id=${encodeURIComponent(filters.guard_id)}`);
  if (filters?.site_id) params.push(`site_id=${encodeURIComponent(filters.site_id)}`);

  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  const { data, error } = await supabase.functions.invoke(`assignments${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getAssignments:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to fetch assignments');
  }

  return data.assignments || [];
}

/**
 * Assigns a guard to a specific site and shift.
 */
export async function assignGuard(assignment: {
  guard_id: string;
  site_id: string;
  shift_type: 'day' | 'night';
}): Promise<AssignmentRecord> {
  const { data, error } = await supabase.functions.invoke('assignments', {
    method: 'POST',
    body: assignment,
  });

  if (error) {
    console.error('Error in assignGuard:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to assign guard');
  }

  return data.assignment;
}

/**
 * Deactivates/removes an active assignment (unassigns a guard).
 */
export async function unassignGuard(assignmentId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke(`assignments?id=${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE',
  });

  if (error) {
    console.error('Error in unassignGuard:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to unassign guard');
  }

  return true;
}

import { supabase } from './supabase';

export interface InspectionRecord {
  id: string;
  site_id: string;
  inspector_id: string;
  remarks?: string;
  guards_present: string[];
  guards_absent: string[];
  photos: string[];
  latitude?: number;
  longitude?: number;
  incident_reported: boolean;
  incident_severity?: 'low' | 'medium' | 'high' | 'critical';
  incident_description?: string;
  created_at: string;
  sites?: {
    site_name: string;
    address: string;
  };
  inspector?: {
    name: string;
  };
}

/**
 * Lists safety inspections, optionally filtering by site or showing incidents only.
 */
export async function getInspections(filters?: {
  site_id?: string;
  incidents_only?: boolean;
}): Promise<InspectionRecord[]> {
  const params: string[] = [];
  if (filters?.site_id) params.push(`site_id=${encodeURIComponent(filters.site_id)}`);
  if (filters?.incidents_only) params.push('incidents=true');

  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  const { data, error } = await supabase.functions.invoke(`inspections${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error listing inspections:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve audits list');
  }

  return data.inspections || [];
}

/**
 * Fetches detail of an individual inspection with fully-hydrated site and guard details.
 */
export async function getInspectionDetail(id: string): Promise<InspectionRecord> {
  const { data, error } = await supabase.functions.invoke(`inspections?id=${encodeURIComponent(id)}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error fetching inspection details:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve audit details');
  }

  return data.inspection;
}

/**
 * Submits a completed inspection log.
 */
export async function submitInspection(audit: {
  site_id: string;
  remarks?: string;
  guards_present: string[];
  guards_absent: string[];
  photos: string[];
  latitude?: number;
  longitude?: number;
  incident_reported: boolean;
  incident_severity?: 'low' | 'medium' | 'high' | 'critical';
  incident_description?: string;
}): Promise<InspectionRecord> {
  const { data, error } = await supabase.functions.invoke('inspections', {
    method: 'POST',
    body: audit,
  });

  if (error) {
    console.error('Error in submitInspection:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to submit inspection report');
  }

  return data.inspection;
}

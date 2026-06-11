import { supabase } from './supabase';

export interface CandidateProfile {
  id: string;
  name: string;
  phone: string;
  height?: number;
  weight?: number;
  education?: string;
  experience_years?: number;
  preferred_location?: string;
  salary_expectation?: number;
  status: 'new' | 'contacted' | 'interested' | 'interview_scheduled' | 'selected' | 'hired' | 'rejected';
  notes?: string;
  recruiter_id?: string;
  created_at?: string;
}

/**
 * Lists candidates with optional status filter or search parameters.
 */
export async function getCandidates(filters?: {
  status?: string;
  search?: string;
}): Promise<CandidateProfile[]> {
  const queryParams: string[] = [];
  if (filters?.status) queryParams.push(`status=${encodeURIComponent(filters.status)}`);
  if (filters?.search) queryParams.push(`search=${encodeURIComponent(filters.search)}`);

  const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  const { data, error } = await supabase.functions.invoke(`candidates${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getCandidates:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to fetch candidate directory');
  }

  return data.candidates || [];
}

/**
 * Fetches a single candidate profile by UUID.
 */
export async function getCandidateDetail(id: string): Promise<CandidateProfile> {
  const { data, error } = await supabase.functions.invoke(`candidates?id=${encodeURIComponent(id)}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getCandidateDetail:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to fetch candidate details');
  }

  // Backend may return single candidate or candidates array
  return data.candidate || (data.candidates && data.candidates[0]) || data;
}

/**
 * Adds a new candidate profile to the recruitment pipeline.
 */
export async function addCandidate(candidate: Omit<CandidateProfile, 'id' | 'status' | 'created_at'>): Promise<CandidateProfile> {
  const { data, error } = await supabase.functions.invoke('candidates', {
    method: 'POST',
    body: candidate,
  });

  if (error) {
    console.error('Error in addCandidate:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to submit candidate');
  }

  return data.candidate;
}

/**
 * Updates a candidate's pipeline status or information.
 */
export async function updateCandidate(id: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile> {
  const { data, error } = await supabase.functions.invoke(`candidates?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: updates,
  });

  if (error) {
    console.error('Error in updateCandidate:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to update candidate pipeline');
  }

  return data.candidate;
}

/**
 * Triggers a Deno backend database trigger workflow to hire a candidate and convert their
 * profile into a security guard record.
 */
export async function convertToGuard(
  id: string,
  params: {
    base_salary: number;
    shift_type: 'day' | 'night' | 'rotational';
  }
): Promise<any> {
  const { data, error } = await supabase.functions.invoke(`candidates?id=${encodeURIComponent(id)}&action=convert`, {
    method: 'POST',
    body: params,
  });

  if (error) {
    console.error('Error converting candidate to guard:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to hire and convert candidate');
  }

  return data;
}

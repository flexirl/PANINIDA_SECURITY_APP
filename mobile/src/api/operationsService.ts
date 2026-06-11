// =============================================================================
// Operations Manager Service
// =============================================================================
// Task 41: Service layer operations for the Operations Manager dashboard
// and escalated complaints.
// =============================================================================

import { supabase } from './supabase';
import type { Site, Complaint } from '../types/workforce';

export interface ManagedSiteDashboardData {
  site: Site;
  workforceCount: number;
  vacancyCount: number;
  escalatedComplaintCount: number;
}

export interface OperationsDashboardSummary {
  managedSites: ManagedSiteDashboardData[];
  totalEscalatedComplaintsCount: number;
}

/**
 * Fetch all sites managed by the current logged-in operations manager.
 */
export async function getManagedSites(): Promise<Site[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('site_manager_id', user.id)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching managed sites:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Fetch dashboard data for the operations manager.
 * Returns site list with counts, and total system L2/L3 escalated complaints count.
 */
export async function getOperationsDashboardData(): Promise<OperationsDashboardSummary> {
  const sites = await getManagedSites();
  const siteIds = sites.map(s => s.id);

  // 1. Fetch total L2/L3 complaints count across the system (as operations_manager can read all complaints)
  const { count: escalatedCount, error: compErr } = await supabase
    .from('complaints')
    .select('id', { count: 'exact', head: true })
    .in('current_level', [2, 3])
    .not('status', 'in', '("resolved","closed")');

  if (compErr) {
    console.error('Error fetching escalated complaints count:', compErr.message);
    throw compErr;
  }

  if (siteIds.length === 0) {
    return {
      managedSites: [],
      totalEscalatedComplaintsCount: escalatedCount || 0
    };
  }

  // 2. Fetch active workforce count (active assignments) for each managed site
  const { data: assignments, error: assignErr } = await supabase
    .from('site_assignments')
    .select('site_id')
    .in('site_id', siteIds)
    .eq('is_active', true);

  if (assignErr) {
    console.error('Error fetching site assignments:', assignErr.message);
    throw assignErr;
  }

  // Group assignments by site_id
  const workforceCounts: Record<string, number> = {};
  siteIds.forEach(id => { workforceCounts[id] = 0; });
  assignments?.forEach(a => {
    if (workforceCounts[a.site_id] !== undefined) {
      workforceCounts[a.site_id]++;
    }
  });

  // 3. Fetch vacancies (replacements requested but not yet assigned/completed)
  const { data: replacements, error: repErr } = await supabase
    .from('replacements')
    .select('site_id')
    .in('site_id', siteIds)
    .eq('status', 'requested');

  if (repErr) {
    console.error('Error fetching vacancies:', repErr.message);
    throw repErr;
  }

  // Group vacancies by site_id
  const vacancyCounts: Record<string, number> = {};
  siteIds.forEach(id => { vacancyCounts[id] = 0; });
  replacements?.forEach(r => {
    if (vacancyCounts[r.site_id] !== undefined) {
      vacancyCounts[r.site_id]++;
    }
  });

  // 4. Fetch escalated complaints for each managed site
  const { data: complaints, error: siteCompErr } = await supabase
    .from('complaints')
    .select('site_id')
    .in('site_id', siteIds)
    .in('current_level', [2, 3])
    .not('status', 'in', '("resolved","closed")');

  if (siteCompErr) {
    console.error('Error fetching site complaints:', siteCompErr.message);
    throw siteCompErr;
  }

  const complaintCounts: Record<string, number> = {};
  siteIds.forEach(id => { complaintCounts[id] = 0; });
  complaints?.forEach(c => {
    if (complaintCounts[c.site_id] !== undefined) {
      complaintCounts[c.site_id]++;
    }
  });

  const managedSites: ManagedSiteDashboardData[] = sites.map(site => ({
    site,
    workforceCount: workforceCounts[site.id] || 0,
    vacancyCount: vacancyCounts[site.id] || 0,
    escalatedComplaintCount: complaintCounts[site.id] || 0
  }));

  return {
    managedSites,
    totalEscalatedComplaintsCount: escalatedCount || 0
  };
}

/**
 * Fetch all escalated complaints (L2/L3) across all sites.
 */
export async function getEscalatedComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select(`
      *,
      site:sites(*),
      raised_by_user:client_users(
        user:users(name, role)
      )
    `)
    .in('current_level', [2, 3])
    .not('status', 'in', '("resolved","closed")')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching escalated complaints:', error.message);
    throw error;
  }

  // Format raised_by_user structure
  return (data || []).map((c: any) => ({
    ...c,
    raised_by_user: {
      name: c.raised_by_user?.user?.name || 'Client',
      role: c.raised_by_user?.user?.role || 'client_user'
    }
  }));
}

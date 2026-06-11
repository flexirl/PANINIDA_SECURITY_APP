// =============================================================================
// Analytics Service
// =============================================================================
// Task 35: 7 analytics computations + CSV export with zero-denominator guards
// =============================================================================

import { supabase } from './supabase';
import type {
  AnalyticsFilters,
  CategoryDistribution,
  AttendanceTrendPoint,
  SiteDeploymentPoint,
  ComplaintTrendPoint,
  TurnoverRate,
  VacancyRatePoint
} from '../types/workforce';

/**
 * Helper to apply standard filters (site_ids, category_ids, date range) to query.
 */
function applyFilters(query: any, filters: AnalyticsFilters, dateColumn: string = 'created_at') {
  let q = query;
  if (filters.from_date) {
    q = q.gte(dateColumn, filters.from_date);
  }
  if (filters.to_date) {
    q = q.lte(dateColumn, filters.to_date);
  }
  return q;
}

/**
 * Task 35.1: Get active personnel count grouped by category.
 */
export async function getWorkforceDistribution(
  filters: AnalyticsFilters
): Promise<CategoryDistribution[]> {
  let query = supabase
    .from('workforce_personnel')
    .select(`
      id,
      category_id,
      category:workforce_categories(name, prefix_code)
    `)
    .eq('employment_status', 'active');

  if (filters.category_ids && filters.category_ids.length > 0) {
    query = query.in('category_id', filters.category_ids);
  }

  const { data, error } = await query;
  if (error) throw error;

  const counts: Record<string, { name: string; prefix: string; count: number }> = {};
  data?.forEach((p: any) => {
    const catId = p.category_id;
    const catName = p.category?.name || 'Unknown';
    const prefix = p.category?.prefix_code || 'UNK';
    
    if (!counts[catId]) {
      counts[catId] = { name: catName, prefix, count: 0 };
    }
    counts[catId].count++;
  });

  return Object.keys(counts).map(catId => ({
    category_id: catId,
    category_name: counts[catId].name,
    prefix_code: counts[catId].prefix,
    count: counts[catId].count
  }));
}

/**
 * Task 35.2: Get daily attendance trend points over a date range.
 * Guaranteed zero-denominator guard.
 */
export async function getAttendanceTrend(
  filters: AnalyticsFilters
): Promise<AttendanceTrendPoint[]> {
  let query = supabase
    .from('workforce_attendance')
    .select('attendance_date, status, personnel_id, personnel:workforce_personnel!inner(category_id)');

  query = applyFilters(query, filters, 'attendance_date');
  if (filters.site_ids && filters.site_ids.length > 0) {
    query = query.in('site_id', filters.site_ids);
  }
  if (filters.category_ids && filters.category_ids.length > 0) {
    query = query.in('personnel.category_id', filters.category_ids);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group records by date
  const recordsByDate: Record<string, { present: number; expected: number }> = {};
  
  data?.forEach((r: any) => {
    const date = r.attendance_date;
    if (!recordsByDate[date]) {
      recordsByDate[date] = { present: 0, expected: 0 };
    }
    
    recordsByDate[date].expected++;
    if (['present', 'late', 'corrected'].includes(r.status)) {
      recordsByDate[date].present++;
    } else if (r.status === 'half_day') {
      recordsByDate[date].present += 0.5;
    }
  });

  return Object.keys(recordsByDate).sort().map(date => {
    const { present, expected } = recordsByDate[date];
    const pct = expected > 0 ? (present / expected) * 100 : 0;
    return {
      date,
      attendance_percentage: Math.round(pct * 10) / 10,
      total_expected: expected,
      total_present: present
    };
  });
}

/**
 * Task 35.3: Get active deployment count per site.
 */
export async function getSiteDeployment(
  filters: AnalyticsFilters
): Promise<SiteDeploymentPoint[]> {
  let query = supabase
    .from('site_assignments')
    .select(`
      site_id,
      site:sites(site_name, workforce_strength),
      personnel:workforce_personnel!inner(category_id)
    `)
    .eq('is_active', true);

  if (filters.site_ids && filters.site_ids.length > 0) {
    query = query.in('site_id', filters.site_ids);
  }
  if (filters.category_ids && filters.category_ids.length > 0) {
    query = query.in('personnel.category_id', filters.category_ids);
  }

  const { data, error } = await query;
  if (error) throw error;

  const counts: Record<string, { name: string; strength: number | null; count: number }> = {};
  data?.forEach((a: any) => {
    const siteId = a.site_id;
    const name = a.site?.site_name || 'Unknown Site';
    const strength = a.site?.workforce_strength || null;

    if (!counts[siteId]) {
      counts[siteId] = { name, strength, count: 0 };
    }
    counts[siteId].count++;
  });

  return Object.keys(counts).map(siteId => ({
    site_id: siteId,
    site_name: counts[siteId].name,
    active_assignments: counts[siteId].count,
    workforce_strength: counts[siteId].strength
  }));
}

/**
 * Task 35.4: Get complaint creation and resolution trends.
 */
export async function getComplaintTrends(
  filters: AnalyticsFilters
): Promise<ComplaintTrendPoint[]> {
  let query = supabase
    .from('complaints')
    .select('created_at, status');

  query = applyFilters(query, filters, 'created_at');
  if (filters.site_ids && filters.site_ids.length > 0) {
    query = query.in('site_id', filters.site_ids);
  }

  const { data, error } = await query;
  if (error) throw error;

  const points: Record<string, { total: number; resolved: number; escalated: number }> = {};

  data?.forEach((c: any) => {
    const date = c.created_at.split('T')[0];
    if (!points[date]) {
      points[date] = { total: 0, resolved: 0, escalated: 0 };
    }
    points[date].total++;
    if (c.status === 'resolved' || c.status === 'closed') {
      points[date].resolved++;
    } else if (c.status.startsWith('escalated')) {
      points[date].escalated++;
    }
  });

  return Object.keys(points).sort().map(date => ({
    date,
    total: points[date].total,
    resolved: points[date].resolved,
    escalated: points[date].escalated
  }));
}

/**
 * Task 35.5: Compute average resolution time in seconds per site.
 */
export async function getAverageResolutionTime(
  filters: AnalyticsFilters
): Promise<{ site_name: string; avg_time_hours: number }[]> {
  let query = supabase
    .from('complaints')
    .select('site_id, time_to_resolve_seconds, site:sites(site_name)')
    .eq('status', 'resolved')
    .not('time_to_resolve_seconds', 'is', null);

  if (filters.site_ids && filters.site_ids.length > 0) {
    query = query.in('site_id', filters.site_ids);
  }

  const { data, error } = await query;
  if (error) throw error;

  const timesBySite: Record<string, { name: string; totalSeconds: number; count: number }> = {};
  data?.forEach((c: any) => {
    const siteId = c.site_id;
    const name = c.site?.site_name || 'Unknown Site';
    const seconds = Number(c.time_to_resolve_seconds);

    if (!timesBySite[siteId]) {
      timesBySite[siteId] = { name, totalSeconds: 0, count: 0 };
    }
    timesBySite[siteId].totalSeconds += seconds;
    timesBySite[siteId].count++;
  });

  return Object.keys(timesBySite).map(siteId => {
    const { name, totalSeconds, count } = timesBySite[siteId];
    const avgHours = count > 0 ? (totalSeconds / count) / 3600 : 0;
    return {
      site_name: name,
      avg_time_hours: Math.round(avgHours * 10) / 10
    };
  });
}

/**
 * Task 35.6: Compute staff turnover rate.
 * Turnover Rate = Terminations / Avg Headcount.
 * Returns 'N/A' when average active headcount is 0.
 */
export async function getStaffTurnoverRate(
  filters: AnalyticsFilters
): Promise<TurnoverRate> {
  // Query terminated personnel in date range
  let termQuery = supabase
    .from('workforce_personnel')
    .select('id', { count: 'exact', head: true })
    .eq('employment_status', 'terminated');
  termQuery = applyFilters(termQuery, filters, 'updated_at');

  if (filters.category_ids && filters.category_ids.length > 0) {
    termQuery = termQuery.in('category_id', filters.category_ids);
  }

  const { count: terminatedCount, error: termErr } = await termQuery;
  if (termErr) throw termErr;

  // Query average active headcount during period
  let activeQuery = supabase
    .from('workforce_personnel')
    .select('id', { count: 'exact', head: true })
    .eq('employment_status', 'active');

  if (filters.category_ids && filters.category_ids.length > 0) {
    activeQuery = activeQuery.in('category_id', filters.category_ids);
  }

  const { count: activeCount, error: activeErr } = await activeQuery;
  if (activeErr) throw activeErr;

  const averageHeadcount = (activeCount || 0) + (terminatedCount || 0) / 2;

  if (averageHeadcount === 0) {
    return { rate: 'N/A', terminated_count: terminatedCount || 0, average_headcount: 0 };
  }

  const rate = ((terminatedCount || 0) / averageHeadcount) * 100;
  return {
    rate: Math.round(rate * 10) / 10,
    terminated_count: terminatedCount || 0,
    average_headcount: Math.round(averageHeadcount)
  };
}

/**
 * Task 35.7: Compute vacancy rate per site.
 * Vacancy Rate = vacancy duration days / (workforce_strength * period days) per site.
 */
export async function getVacancyRate(
  filters: AnalyticsFilters
): Promise<VacancyRatePoint[]> {
  // 1. Fetch sites with configured workforce strength
  let siteQuery = supabase
    .from('sites')
    .select('id, site_name, workforce_strength')
    .eq('is_active', true);
  
  if (filters.site_ids && filters.site_ids.length > 0) {
    siteQuery = siteQuery.in('id', filters.site_ids);
  }

  const { data: sites, error: siteErr } = await siteQuery;
  if (siteErr) throw siteErr;

  // 2. Fetch completed/active replacements to calculate vacancy duration
  let repQuery = supabase
    .from('replacements')
    .select('site_id, vacancy_start, vacancy_end, absent_personnel:workforce_personnel!inner(category_id)');
  
  repQuery = applyFilters(repQuery, filters, 'vacancy_start');
  if (filters.category_ids && filters.category_ids.length > 0) {
    repQuery = repQuery.in('absent_personnel.category_id', filters.category_ids);
  }

  const { data: replacements, error: repErr } = await repQuery;
  if (repErr) throw repErr;

  const start = new Date(filters.from_date);
  const end = new Date(filters.to_date);
  const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // Group vacancy duration (in days) by site_id
  const vacancyDaysBySite: Record<string, number> = {};
  replacements?.forEach((r: any) => {
    const vStart = new Date(r.vacancy_start);
    const vEnd = r.vacancy_end ? new Date(r.vacancy_end) : new Date(); // fallback to now if active vacancy
    
    const durationMs = vEnd.getTime() - vStart.getTime();
    const durationDays = Math.max(0, durationMs / (1000 * 60 * 60 * 24));
    
    vacancyDaysBySite[r.site_id] = (vacancyDaysBySite[r.site_id] || 0) + durationDays;
  });

  return sites.map((s: any) => {
    const strength = s.workforce_strength || 0;
    const vacancyDays = vacancyDaysBySite[s.id] || 0;
    const capacityDays = strength * periodDays;

    const rate = capacityDays > 0 ? (vacancyDays / capacityDays) * 100 : 0;

    return {
      site_id: s.id,
      site_name: s.site_name,
      vacancy_rate: Math.round(rate * 10) / 10,
      vacancy_days: Math.round(vacancyDays * 10) / 10,
      total_capacity_days: capacityDays
    };
  });
}

/**
 * Task 35.8: Export computed metrics to CSV string format.
 */
export async function exportAnalyticsCSV(filters: AnalyticsFilters): Promise<string> {
  const distribution = await getWorkforceDistribution(filters);
  const deployment = await getSiteDeployment(filters);
  const vacancy = await getVacancyRate(filters);
  const resolution = await getAverageResolutionTime(filters);
  const turnover = await getStaffTurnoverRate(filters);

  let csv = '=== PAN INDIA SECURITY ANALYTICS REPORT ===\n';
  csv += `Report Period: ${filters.from_date} to ${filters.to_date}\n\n`;

  // 1. Workforce Distribution
  csv += '1. WORKFORCE DISTRIBUTION BY CATEGORY\n';
  csv += 'Category,Prefix Code,Active Count\n';
  distribution.forEach(d => {
    csv += `"${d.category_name}",${d.prefix_code},${d.count}\n`;
  });
  csv += '\n';

  // 2. Site Deployments
  csv += '2. SITE DEPLOYMENT PROFILE\n';
  csv += 'Site Name,Active Staff Deployed,Configured Strength\n';
  deployment.forEach(d => {
    csv += `"${d.site_name}",${d.active_assignments},${d.workforce_strength || 'Not Configured'}\n`;
  });
  csv += '\n';

  // 3. Vacancy Rates
  csv += '3. VACANCY METRICS\n';
  csv += 'Site Name,Vacancy Rate (%),Cumulative Vacancy Days,Total Expected Capacity Days\n';
  vacancy.forEach(v => {
    csv += `"${v.site_name}",${v.vacancy_rate}%,${v.vacancy_days},${v.total_capacity_days}\n`;
  });
  csv += '\n';

  // 4. Resolution Times
  csv += '4. COMPLAINT AVERAGE RESOLUTION TIMES\n';
  csv += 'Site Name,Average Resolution Time (Hours)\n';
  resolution.forEach(r => {
    csv += `"${r.site_name}",${r.avg_time_hours}\n`;
  });
  csv += '\n';

  // 5. Staff Turnover
  csv += '5. STAFF TURNOVER METRICS\n';
  csv += `Staff Turnover Rate: ${turnover.rate === 'N/A' ? 'N/A' : turnover.rate + '%'}\n`;
  csv += `Terminated Count during period: ${turnover.terminated_count}\n`;
  csv += `Average headcount during period: ${turnover.average_headcount}\n`;

  return csv;
}

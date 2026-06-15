import { supabase } from './supabase';

// ============================================================
// Manager Permissions Service
// ============================================================
// Controls which modules a manager can access in the app.
// Admin assigns permissions per-manager via Role Management.
// ============================================================

/** All toggleable modules a manager can be granted */
export interface ManagerModule {
  key: string;
  label: string;
  description: string;
  icon: string;
  alwaysOn?: boolean;   // Cannot be toggled off (e.g. dashboard)
  alwaysOff?: boolean;  // Cannot be toggled on (e.g. settings for manager)
}

export const MANAGER_MODULES: ManagerModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Overview stats, alerts, and activity feed',
    icon: 'dashboard',
    alwaysOn: true,
  },
  {
    key: 'workforce',
    label: 'Workforce Management',
    description: 'View, onboard, and manage personnel',
    icon: 'people',
  },
  {
    key: 'sites',
    label: 'Site Management',
    description: 'View and manage sites, assign personnel',
    icon: 'location-on',
  },
  {
    key: 'payroll',
    label: 'Payroll',
    description: 'Generate and approve salary slips',
    icon: 'payments',
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    description: 'Candidate pipeline and onboarding',
    icon: 'person-add',
  },
  {
    key: 'inspections',
    label: 'Inspections',
    description: 'Site inspection reports',
    icon: 'fact-check',
  },
  {
    key: 'uniforms',
    label: 'Uniforms',
    description: 'Track uniform issuance and returns',
    icon: 'checkroom',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Export data and generate reports',
    icon: 'assessment',
  },
  {
    key: 'categories',
    label: 'Workforce Categories',
    description: 'Manage Guard, Gunman, etc. categories',
    icon: 'category',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'System alerts and reminders',
    icon: 'notifications',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'App preferences and role management',
    icon: 'settings',
    alwaysOff: true, // Managers cannot access settings/role mgmt
  },
];

/** Toggleable modules only (excludes alwaysOn and alwaysOff) */
export const TOGGLEABLE_MODULES = MANAGER_MODULES.filter(
  (m) => !m.alwaysOn && !m.alwaysOff
);

/** Returns default permissions: all toggleable modules ON */
export function getDefaultPermissions(): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  TOGGLEABLE_MODULES.forEach((m) => {
    perms[m.key] = true;
  });
  return perms;
}

/**
 * Checks if a manager has access to a specific module.
 * - If permissions is null/undefined → full access (backward-compatible)
 * - If permissions exists → check the specific key
 * - alwaysOn modules always return true
 * - alwaysOff modules always return false
 */
export function hasModuleAccess(
  permissions: Record<string, boolean> | null | undefined,
  moduleKey: string
): boolean {
  const moduleDef = MANAGER_MODULES.find((m) => m.key === moduleKey);
  if (moduleDef?.alwaysOn) return true;
  if (moduleDef?.alwaysOff) return false;

  // If no permissions set → full access (backward-compatible)
  if (!permissions) return true;

  // Explicit check — default to true if key missing
  return permissions[moduleKey] !== false;
}

/**
 * Fetches manager permissions for a specific role assignment.
 */
export async function getManagerPermissions(
  assignmentId: string
): Promise<Record<string, boolean> | null> {
  const { data, error } = await supabase
    .from('role_assignments')
    .select('permissions')
    .eq('id', assignmentId)
    .single();

  if (error) {
    console.warn('[ManagerPermissions] Fetch failed:', error.message);
    return null;
  }

  return data?.permissions || null;
}

/**
 * Fetches manager permissions by phone number.
 * Used during login to attach permissions to user profile.
 */
export async function getManagerPermissionsByPhone(
  phone: string
): Promise<Record<string, boolean> | null> {
  const cleanPhone = phone.replace(/\D/g, '');

  const { data, error } = await supabase
    .from('role_assignments')
    .select('permissions')
    .eq('phone', cleanPhone)
    .eq('assigned_role', 'manager')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.warn('[ManagerPermissions] Fetch by phone failed:', error.message);
    return null;
  }

  return data?.permissions || null;
}

/**
 * Updates manager permissions for a specific role assignment.
 */
export async function updateManagerPermissions(
  assignmentId: string,
  permissions: Record<string, boolean>
): Promise<void> {
  const { error } = await supabase
    .from('role_assignments')
    .update({ permissions })
    .eq('id', assignmentId);

  if (error) {
    console.error('[ManagerPermissions] Update failed:', error.message);
    throw new Error(error.message || 'Failed to update permissions');
  }
}

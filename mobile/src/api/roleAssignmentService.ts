import { supabase } from './supabase';

// ============================================================
// Role Assignment Service
// ============================================================
// Manages phone-to-role assignments from admin settings.
// Admin adds a phone number under a role (e.g., Supervisor),
// and the system updates/creates the corresponding user record
// so the person gets routed to the correct dashboard on login.
// ============================================================

export interface RoleAssignment {
  id: string;
  phone: string;
  assigned_role: string;
  assigned_by?: string;
  label?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleGroup {
  role: string;
  displayName: string;
  description: string;
  icon: string;
  assignments: RoleAssignment[];
}

/** The roles an admin can assign from settings */
export const ASSIGNABLE_ROLES = [
  {
    role: 'manager',
    displayName: 'Manager',
    description: 'Full admin dashboard access, payroll management, reports',
    icon: 'admin-panel-settings',
  },
  {
    role: 'operations_manager',
    displayName: 'Operations Manager',
    description: 'Operations dashboard, site oversight, escalated complaints',
    icon: 'engineering',
  },
  {
    role: 'supervisor',
    displayName: 'Supervisor',
    description: 'Supervisor dashboard, assigned sites, attendance monitoring',
    icon: 'supervisor-account',
  },
  {
    role: 'client_user',
    displayName: 'Society President / Client',
    description: 'Client portal, workforce roster, complaints, performance',
    icon: 'apartment',
  },
  {
    role: 'inspector',
    displayName: 'Inspector',
    description: 'Site inspections module, incident reporting',
    icon: 'fact-check',
  },
] as const;

/**
 * Fetch all active role assignments, grouped by role.
 */
export async function getRoleAssignments(): Promise<RoleAssignment[]> {
  const { data, error } = await supabase
    .from('role_assignments')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[RoleAssignment] Fetch failed:', error.message);
    throw new Error('Failed to load role assignments');
  }

  return data || [];
}

/**
 * Add a phone number to a role.
 * Also upserts the user record so the phone gets the correct role on login.
 */
export async function addRoleAssignment(
  phone: string,
  role: string,
  label?: string,
  assignedBy?: string
): Promise<RoleAssignment> {
  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length !== 10) {
    throw new Error('Phone number must be exactly 10 digits');
  }

  // 1. Check if this phone+role combo already exists
  const { data: existing } = await supabase
    .from('role_assignments')
    .select('id')
    .eq('phone', cleanPhone)
    .eq('assigned_role', role)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    throw new Error('This phone number is already assigned to this role');
  }

  // 2. Insert role assignment record
  const insertPayload: any = {
    phone: cleanPhone,
    assigned_role: role,
    label: label || null,
    is_active: true,
  };

  if (assignedBy) {
    insertPayload.assigned_by = assignedBy;
  }

  const { data, error } = await supabase
    .from('role_assignments')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[RoleAssignment] Insert failed:', error.message);
    throw new Error(error.message || 'Failed to add role assignment');
  }

  // 3. Upsert the user record — create if missing, update role if exists
  await upsertUserRole(cleanPhone, role, label);

  return data;
}

/**
 * Remove (deactivate) a role assignment.
 */
export async function removeRoleAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('role_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId);

  if (error) {
    console.error('[RoleAssignment] Remove failed:', error.message);
    throw new Error('Failed to remove role assignment');
  }
}

/**
 * Upsert user record: if phone already exists in `users`, update role.
 * If not, create a new user record with that phone and role.
 */
async function upsertUserRole(phone: string, role: string, name?: string) {
  try {
    // Check if user with this phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('phone', phone)
      .maybeSingle();

    if (existingUser) {
      // Update the role
      const { error: updateError } = await supabase
        .from('users')
        .update({ role })
        .eq('id', existingUser.id);

      if (updateError) {
        console.warn('[RoleAssignment] User role update failed:', updateError.message);
      }
    } else {
      // Create new user record (without auth user — auth user gets created on first OTP login)
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          phone,
          role,
          name: name || `User ${phone.slice(-4)}`,
          is_active: true,
        });

      if (insertError) {
        console.warn('[RoleAssignment] User creation failed:', insertError.message);
      }
    }
  } catch (err) {
    console.warn('[RoleAssignment] upsertUserRole error (non-fatal):', err);
  }
}

/**
 * Check if a phone number is already assigned to any role.
 * Returns the existing role name or null.
 */
export async function checkExistingUserRole(phone: string): Promise<string | null> {
  const cleanPhone = phone.replace(/\D/g, '');

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('phone', cleanPhone)
    .maybeSingle();

  return data?.role || null;
}

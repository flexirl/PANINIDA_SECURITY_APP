export type UserRole = 'admin' | 'manager' | 'recruiter' | 'guard';

/**
 * Checks if the user is a Super Admin.
 */
export function isAdmin(role?: string): boolean {
  return role === 'admin';
}

/**
 * Checks if the user is a Field Operations Manager.
 */
export function isManager(role?: string): boolean {
  return role === 'manager';
}

/**
 * Checks if the user is a Recruiter.
 */
export function isRecruiter(role?: string): boolean {
  return role === 'recruiter';
}

/**
 * Checks if the user is a Security Guard.
 */
export function isGuard(role?: string): boolean {
  return role === 'guard';
}

/**
 * Validates if the current role is authorized against an array of allowed roles.
 */
export function hasAccess(currentRole?: string, allowedRoles: UserRole[] = []): boolean {
  if (!currentRole) return false;
  
  // Super Admin bypasses all checks
  if (currentRole === 'admin') return true;

  return allowedRoles.includes(currentRole as UserRole);
}

/**
 * Gets a human-readable label for a role.
 */
export function getRoleLabel(role?: string): string {
  switch (role) {
    case 'admin':
      return 'Super Admin / मुख्य प्रशासक';
    case 'manager':
      return 'Ops Manager / प्रबंधक';
    case 'recruiter':
      return 'Recruiter / भर्ती अधिकारी';
    case 'guard':
      return 'Security Guard / सुरक्षा गार्ड';
    default:
      return 'Authorized User';
  }
}

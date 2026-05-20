// Validation schemas for Edge Functions
// Using manual validation (no external deps for Deno edge functions)

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================
// GUARD VALIDATION
// ============================================================
export function validateGuard(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.push({ field: "name", message: "Name is required (min 2 characters)" });
  }
  if (!data.phone || typeof data.phone !== "string" || !/^\d{10}$/.test(data.phone)) {
    errors.push({ field: "phone", message: "Valid 10-digit phone number required" });
  }
  if (data.aadhaar_number && typeof data.aadhaar_number === "string" && !/^\d{12}$/.test(data.aadhaar_number)) {
    errors.push({ field: "aadhaar_number", message: "Aadhaar must be 12 digits" });
  }
  if (data.pan_number && typeof data.pan_number === "string" && !/^[A-Z]{5}\d{4}[A-Z]$/.test(data.pan_number)) {
    errors.push({ field: "pan_number", message: "Invalid PAN format (e.g., ABCDE1234F)" });
  }
  if (!data.base_salary || typeof data.base_salary !== "number" || data.base_salary <= 0) {
    errors.push({ field: "base_salary", message: "Base salary must be a positive number" });
  }
  if (!data.shift_type || !["day", "night", "rotational"].includes(data.shift_type as string)) {
    errors.push({ field: "shift_type", message: "Shift type must be: day, night, or rotational" });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// SITE VALIDATION
// ============================================================
export function validateSite(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.site_name || typeof data.site_name !== "string" || data.site_name.trim().length < 2) {
    errors.push({ field: "site_name", message: "Site name is required (min 2 characters)" });
  }
  if (!data.address || typeof data.address !== "string") {
    errors.push({ field: "address", message: "Address is required" });
  }
  if (typeof data.latitude !== "number" || data.latitude < -90 || data.latitude > 90) {
    errors.push({ field: "latitude", message: "Valid latitude required (-90 to 90)" });
  }
  if (typeof data.longitude !== "number" || data.longitude < -180 || data.longitude > 180) {
    errors.push({ field: "longitude", message: "Valid longitude required (-180 to 180)" });
  }
  if (data.geofence_radius && (typeof data.geofence_radius !== "number" || data.geofence_radius < 50 || data.geofence_radius > 1000)) {
    errors.push({ field: "geofence_radius", message: "Geo-fence radius must be 50-1000 meters" });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// ATTENDANCE VALIDATION
// ============================================================
export function validateAttendance(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof data.latitude !== "number" || data.latitude < -90 || data.latitude > 90) {
    errors.push({ field: "latitude", message: "Valid latitude required" });
  }
  if (typeof data.longitude !== "number" || data.longitude < -180 || data.longitude > 180) {
    errors.push({ field: "longitude", message: "Valid longitude required" });
  }
  if (!data.selfie_base64 || typeof data.selfie_base64 !== "string") {
    errors.push({ field: "selfie_base64", message: "Selfie image is required" });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// CANDIDATE VALIDATION
// ============================================================
export function validateCandidate(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.push({ field: "name", message: "Name is required (min 2 characters)" });
  }
  if (!data.phone || typeof data.phone !== "string" || !/^\d{10}$/.test(data.phone)) {
    errors.push({ field: "phone", message: "Valid 10-digit phone number required" });
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// INSPECTION VALIDATION
// ============================================================
export function validateInspection(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.site_id || typeof data.site_id !== "string") {
    errors.push({ field: "site_id", message: "Site ID is required" });
  }
  if (!data.remarks || typeof data.remarks !== "string") {
    errors.push({ field: "remarks", message: "Remarks are required" });
  }
  if (data.incident_reported === true) {
    if (!data.incident_severity || !["low", "medium", "high", "critical"].includes(data.incident_severity as string)) {
      errors.push({ field: "incident_severity", message: "Incident severity required when reporting incident" });
    }
    if (!data.incident_description || typeof data.incident_description !== "string") {
      errors.push({ field: "incident_description", message: "Incident description required" });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// USER VALIDATION
// ============================================================
export function validateUser(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.name || typeof data.name !== "string" || data.name.trim().length < 2) {
    errors.push({ field: "name", message: "Name is required (min 2 characters)" });
  }
  if (!data.phone || typeof data.phone !== "string" || !/^\d{10}$/.test(data.phone)) {
    errors.push({ field: "phone", message: "Valid 10-digit phone number required" });
  }
  if (!data.role || !["admin", "manager", "recruiter", "guard"].includes(data.role as string)) {
    errors.push({ field: "role", message: "Role must be: admin, manager, recruiter, or guard" });
  }

  return { valid: errors.length === 0, errors };
}

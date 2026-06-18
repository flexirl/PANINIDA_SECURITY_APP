// ============================================================
// Shared Upload Utilities for Edge Functions
// Used by: upload-file, get-signed-url, cleanup-orphaned-files
// ============================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Category Configuration (Req 3) ───

export interface CategoryConfig {
  bucket: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  isPublic: boolean;
  requiresRef: string | null; // Which FK is required
  allowedRoles: string[];     // Who can upload to this category
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  profiles: {
    bucket: "profiles",
    maxSizeBytes: 2 * 1024 * 1024,       // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png"],
    isPublic: true,
    requiresRef: null,                     // personnel_id optional for profiles
    allowedRoles: ["admin", "manager", "recruiter", "guard", "workforce_personnel"],
  },
  documents: {
    bucket: "documents",
    maxSizeBytes: 10 * 1024 * 1024,       // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    isPublic: false,
    requiresRef: "personnelId",
    allowedRoles: ["admin", "manager", "recruiter", "guard", "workforce_personnel"],
  },
  sites: {
    bucket: "sites",
    maxSizeBytes: 5 * 1024 * 1024,        // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png"],
    isPublic: true,
    requiresRef: "siteId",
    allowedRoles: ["admin", "manager"],
  },
  incidents: {
    bucket: "incidents",
    maxSizeBytes: 5 * 1024 * 1024,        // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png"],
    isPublic: true,
    requiresRef: "incidentId",
    allowedRoles: ["admin", "manager", "recruiter", "guard", "workforce_personnel"],
  },
  attendance: {
    bucket: "attendance",
    maxSizeBytes: 1 * 1024 * 1024,        // 1MB
    allowedMimeTypes: ["image/jpeg"],
    isPublic: false,
    requiresRef: null,                     // attendance_id set post-upload
    allowedRoles: ["admin", "manager", "guard", "workforce_personnel"],
  },
  inspections: {
    bucket: "inspection-photos",
    maxSizeBytes: 5 * 1024 * 1024,        // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png"],
    isPublic: true,
    requiresRef: null,
    allowedRoles: ["admin", "manager", "supervisor", "inspector"],
  },
};

// ─── Error Codes (Req 14) ───

export const ERROR_CODES = {
  MISSING_FILE: "MISSING_FILE",
  INVALID_CATEGORY: "INVALID_CATEGORY",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FORMAT: "INVALID_FORMAT",
  MISSING_REFERENCE: "MISSING_REFERENCE",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR",
  NOT_FOUND: "NOT_FOUND",
  PROCESSING_ERROR: "PROCESSING_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
} as const;

// ─── Validation (Req 3, 4) ───

export interface ValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
}

export interface UploadRefs {
  personnelId?: string | null;
  siteId?: string | null;
  attendanceId?: string | null;
  incidentId?: string | null;
}

/**
 * Validates an upload request against category-specific rules.
 */
export function validateUploadRequest(
  file: File | null,
  category: string,
  refs: UploadRefs,
  userRole: string
): ValidationResult {
  // Check file exists
  if (!file) {
    return { valid: false, code: ERROR_CODES.MISSING_FILE, message: "No file provided" };
  }

  // Check category
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return {
      valid: false,
      code: ERROR_CODES.INVALID_CATEGORY,
      message: `Invalid file category '${category}'. Valid: ${Object.keys(CATEGORY_CONFIG).join(", ")}`,
    };
  }

  // Check file size
  if (file.size > config.maxSizeBytes) {
    const maxMB = (config.maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      code: ERROR_CODES.FILE_TOO_LARGE,
      message: `File exceeds maximum size limit of ${maxMB}MB.`,
    };
  }

  // Check MIME type
  if (!config.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      code: ERROR_CODES.INVALID_FORMAT,
      message: `File type '${file.type}' not allowed. Accepted: ${config.allowedMimeTypes.join(", ")}`,
    };
  }

  // Check role-based permission
  if (!config.allowedRoles.includes(userRole)) {
    return {
      valid: false,
      code: ERROR_CODES.PERMISSION_DENIED,
      message: `Role '${userRole}' cannot upload to category '${category}'.`,
    };
  }

  // Check required reference (skip for profiles and attendance which don't strictly require one)
  if (config.requiresRef) {
    const refValue = refs[config.requiresRef as keyof UploadRefs];
    if (!refValue) {
      return {
        valid: false,
        code: ERROR_CODES.MISSING_REFERENCE,
        message: `'${config.requiresRef}' is required for category '${category}'.`,
      };
    }
  }

  return { valid: true };
}

// ─── File Path Generation ───

/**
 * Generates a unique storage path for an uploaded file.
 * Format: {userId-prefix}/{timestamp}-{random}.{ext}
 */
export function generateFilePath(
  userId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const ext = originalFilename.split(".").pop() || "jpg";
  const userPrefix = userId.slice(0, 8);
  return `${userPrefix}/${timestamp}-${random}.${ext}`;
}

// ─── MD5 Hash (Req 15) ───

/**
 * Computes MD5 hash of file data for integrity verification.
 * Uses Web Crypto API (available in Deno runtime).
 */
export async function computeFileHash(data: ArrayBuffer): Promise<string> {
  // Deno supports crypto.subtle — use SHA-256 as a more secure alternative to MD5
  // MD5 is not available in Web Crypto API; we use SHA-256 and truncate for practical purposes
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Audit Logging (Req 6) ───

export interface AuditLogEntry {
  file_id?: string;
  operation: "upload" | "access" | "delete" | "signed_url";
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an audit log entry for a file operation.
 * Uses service client to bypass RLS.
 */
export async function createAuditLog(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  const { error } = await supabase.from("upload_audit_logs").insert({
    file_id: entry.file_id || null,
    operation: entry.operation,
    user_id: entry.user_id,
    ip_address: entry.ip_address || "unknown",
    user_agent: entry.user_agent || "unknown",
    metadata: entry.metadata || {},
  });

  if (error) {
    // Log but don't fail the main operation for audit log errors
    console.error("[AuditLog] Failed to create audit entry:", error.message);
  }
}

/**
 * Extracts client IP from request headers (handles proxies).
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

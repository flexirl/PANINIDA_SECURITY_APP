// ============================================================
// GET-SIGNED-URL — Signed URL Generation Edge Function
// POST /functions/v1/get-signed-url
//
// Generates time-limited signed URLs for private files
// Req 4  — Signed URLs with 1-hour expiration
// Req 6  — Audit log for signed URL generation
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import {
  CATEGORY_CONFIG,
  ERROR_CODES,
  createAuditLog,
  getClientIP,
} from "../_shared/upload-utils.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  // ── 1. Authenticate ──
  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return jsonResponse(
      { error: true, code: ERROR_CODES.UNAUTHORIZED, message: authError || "Unauthorized" },
      401
    );
  }

  const supabase = getServiceClient();

  try {
    const body = await req.json();
    const { filePath, bucket, expiresIn = 3600 } = body;

    if (!filePath || !bucket) {
      return errorResponse("'filePath' and 'bucket' are required.");
    }

    // ── 2. Verify the file exists in registry ──
    const { data: fileRecord } = await supabase
      .from("uploaded_files")
      .select("id, category, uploaded_by, personnel_id")
      .eq("file_path", filePath)
      .eq("bucket_name", bucket)
      .is("deleted_at", null)
      .maybeSingle();

    // ── 3. Permission check ──
    // Admins and managers can access all files
    // Guards can only access their own uploads
    if (fileRecord && user.role === "guard") {
      if (fileRecord.uploaded_by !== user.id) {
        return jsonResponse(
          { error: true, code: ERROR_CODES.PERMISSION_DENIED, message: "You can only access your own files." },
          403
        );
      }
    }

    // ── 4. Generate signed URL ──
    const clampedExpiry = Math.min(Math.max(expiresIn, 60), 7200); // 1 min to 2 hours
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, clampedExpiry);

    if (error) {
      console.error("[GetSignedUrl] Generation error:", error);
      return errorResponse("Failed to generate signed URL.", 500);
    }

    // ── 5. Audit log ──
    await createAuditLog(supabase, {
      file_id: fileRecord?.id,
      operation: "signed_url",
      user_id: user.id,
      ip_address: getClientIP(req),
      user_agent: req.headers.get("user-agent") || "unknown",
      metadata: {
        bucket,
        file_path: filePath,
        expires_in: clampedExpiry,
      },
    });

    return jsonResponse({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        expiresIn: clampedExpiry,
        expiresAt: new Date(Date.now() + clampedExpiry * 1000).toISOString(),
      },
    });
  } catch (err) {
    console.error("[GetSignedUrl] Unhandled error:", err);
    return errorResponse("Internal server error.", 500);
  }
});

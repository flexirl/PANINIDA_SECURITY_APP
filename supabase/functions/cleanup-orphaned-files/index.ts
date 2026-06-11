// ============================================================
// CLEANUP-ORPHANED-FILES — Scheduled Cleanup Edge Function
// Triggered via pg_cron daily at 02:00 UTC
//
// Req 7 — Orphaned file detection and cleanup
// - Soft deletes orphaned files (no FK references, >30 days old)
// - Hard deletes files soft-deleted >7 days ago
// - Logs all operations to audit trail
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import { createAuditLog } from "../_shared/upload-utils.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  // Authenticate — requires admin or service role
  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return jsonResponse({ error: true, message: authError || "Unauthorized" }, 401);
  }

  if (user.role !== "admin") {
    return errorResponse("Only administrators can trigger cleanup.", 403);
  }

  const supabase = getServiceClient();
  const stats = {
    hardDeleted: 0,
    softDeleted: 0,
    hardDeleteErrors: 0,
    softDeleteErrors: 0,
  };

  try {
    console.log("[Cleanup] Starting orphaned file cleanup...");

    // ── Phase 1: Hard delete files that were soft-deleted >7 days ago ──
    const hardDeleteCutoff = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: hardDeleteFiles, error: hdErr } = await supabase
      .from("uploaded_files")
      .select("id, file_path, bucket_name")
      .not("deleted_at", "is", null)
      .lt("deleted_at", hardDeleteCutoff)
      .limit(100); // Process in batches

    if (hdErr) {
      console.error("[Cleanup] Error fetching hard-delete candidates:", hdErr);
    }

    for (const file of hardDeleteFiles || []) {
      try {
        // Delete from storage
        const { error: storageErr } = await supabase.storage
          .from(file.bucket_name)
          .remove([file.file_path]);

        if (storageErr) {
          console.warn(`[Cleanup] Storage delete failed for ${file.file_path}:`, storageErr.message);
          stats.hardDeleteErrors++;
          continue;
        }

        // Delete from registry
        await supabase.from("uploaded_files").delete().eq("id", file.id);

        // Audit log
        await createAuditLog(supabase, {
          file_id: file.id,
          operation: "delete",
          user_id: user.id,
          metadata: {
            type: "hard_delete",
            file_path: file.file_path,
            bucket: file.bucket_name,
          },
        });

        stats.hardDeleted++;
        console.log(`[Cleanup] Hard deleted: ${file.bucket_name}/${file.file_path}`);
      } catch (fileErr) {
        console.error(`[Cleanup] Error hard-deleting ${file.file_path}:`, fileErr);
        stats.hardDeleteErrors++;
      }
    }

    // ── Phase 2: Soft delete orphaned files (no references, >30 days old) ──
    const orphanCutoff = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: orphanedFiles, error: orphErr } = await supabase
      .from("uploaded_files")
      .select("id, file_path, bucket_name, category")
      .is("personnel_id", null)
      .is("site_id", null)
      .is("attendance_id", null)
      .is("incident_id", null)
      .is("deleted_at", null)
      .lt("created_at", orphanCutoff)
      .limit(100);

    if (orphErr) {
      console.error("[Cleanup] Error fetching orphan candidates:", orphErr);
    }

    for (const file of orphanedFiles || []) {
      try {
        // Soft delete (mark for future hard deletion)
        const { error: updateErr } = await supabase
          .from("uploaded_files")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", file.id);

        if (updateErr) {
          console.warn(`[Cleanup] Soft delete failed for ${file.file_path}:`, updateErr.message);
          stats.softDeleteErrors++;
          continue;
        }

        // Audit log
        await createAuditLog(supabase, {
          file_id: file.id,
          operation: "delete",
          user_id: user.id,
          metadata: {
            type: "soft_delete_orphan",
            file_path: file.file_path,
            bucket: file.bucket_name,
            category: file.category,
          },
        });

        stats.softDeleted++;
        console.log(`[Cleanup] Soft deleted orphan: ${file.bucket_name}/${file.file_path}`);
      } catch (fileErr) {
        console.error(`[Cleanup] Error soft-deleting ${file.file_path}:`, fileErr);
        stats.softDeleteErrors++;
      }
    }

    console.log("[Cleanup] Complete:", JSON.stringify(stats));

    return jsonResponse({
      success: true,
      message: "Cleanup completed successfully.",
      stats,
    });
  } catch (err) {
    console.error("[Cleanup] Unhandled error:", err);
    return errorResponse("Internal server error during cleanup.", 500);
  }
});

// ============================================================
// UPLOAD-FILE — Centralized File Upload Edge Function
// POST /functions/v1/upload-file
//
// Accepts multipart/form-data with file + metadata
// Validates, uploads to storage, creates registry entry, audit logs
//
// Req 2  — Centralized upload interface
// Req 3  — Category organization
// Req 4  — Security / access control
// Req 5  — Server-side validation (compression done client-side)
// Req 6  — Audit logging
// Req 13 — Metadata storage
// Req 14 — Error codes
// Req 15 — MD5 hash for integrity
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  errorResponse,
  corsHeaders,
} from "../_shared/auth-middleware.ts";
import {
  CATEGORY_CONFIG,
  ERROR_CODES,
  validateUploadRequest,
  generateFilePath,
  computeFileHash,
  createAuditLog,
  getClientIP,
} from "../_shared/upload-utils.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only POST allowed
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
    // ── 2. Parse multipart form data ──
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "";
    const personnelId = formData.get("personnelId") as string | null;
    const siteId = formData.get("siteId") as string | null;
    const attendanceId = formData.get("attendanceId") as string | null;
    const incidentId = formData.get("incidentId") as string | null;
    const documentType = formData.get("documentType") as string | null;
    const metadataStr = formData.get("metadata") as string | null;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    // Add documentType to metadata if provided
    if (documentType) {
      metadata.document_type = documentType;
    }

    // ── 3. Validate ──
    const validation = validateUploadRequest(
      file,
      category,
      { personnelId, siteId, attendanceId, incidentId },
      user.role
    );

    if (!validation.valid) {
      return jsonResponse(
        { error: true, code: validation.code, message: validation.message },
        400
      );
    }

    // TypeScript narrowing — file is guaranteed non-null after validation
    const uploadFile = file!;
    const config = CATEGORY_CONFIG[category];

    // ── 4. Read file data and compute hash ──
    const arrayBuffer = await uploadFile.arrayBuffer();
    const fileHash = await computeFileHash(arrayBuffer);

    // ── 5. Check for duplicate (same hash = same file already uploaded) ──
    const { data: existingFile } = await supabase
      .from("uploaded_files")
      .select("id, file_path, bucket_name")
      .eq("md5_hash", fileHash)
      .eq("category", category)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingFile) {
      // File already exists — return existing record instead of duplicating
      let url: string;
      if (config.isPublic) {
        const { data: publicUrlData } = supabase.storage
          .from(config.bucket)
          .getPublicUrl(existingFile.file_path);
        url = publicUrlData.publicUrl;
      } else {
        const { data: signedUrlData } = await supabase.storage
          .from(config.bucket)
          .createSignedUrl(existingFile.file_path, 3600);
        url = signedUrlData?.signedUrl || "";
      }

      return jsonResponse({
        success: true,
        deduplicated: true,
        data: {
          fileId: existingFile.id,
          filePath: existingFile.file_path,
          url,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
        },
      });
    }

    // ── 6. Generate unique file path and upload to storage ──
    const filePath = generateFilePath(user.id, uploadFile.name);

    const { data: storageData, error: storageError } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, arrayBuffer, {
        contentType: uploadFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (storageError) {
      console.error("[UploadFile] Storage error:", storageError);
      return jsonResponse(
        { error: true, code: ERROR_CODES.UPLOAD_FAILED, message: "Failed to upload file to storage." },
        500
      );
    }

    // ── 7. Insert metadata into uploaded_files registry ──
    const { data: fileRecord, error: dbError } = await supabase
      .from("uploaded_files")
      .insert({
        file_path: filePath,
        bucket_name: config.bucket,
        file_size_bytes: uploadFile.size,
        mime_type: uploadFile.type,
        category: category,
        uploaded_by: user.id,
        personnel_id: personnelId || null,
        site_id: siteId || null,
        attendance_id: attendanceId || null,
        incident_id: incidentId || null,
        original_filename: uploadFile.name,
        md5_hash: fileHash,
        metadata: metadata,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete uploaded file from storage
      console.error("[UploadFile] Database error:", dbError);
      await supabase.storage.from(config.bucket).remove([filePath]);
      return jsonResponse(
        { error: true, code: ERROR_CODES.DATABASE_ERROR, message: "File uploaded but failed to save metadata. Upload rolled back." },
        500
      );
    }

    // ── 8. Create audit log entry ──
    await createAuditLog(supabase, {
      file_id: fileRecord.id,
      operation: "upload",
      user_id: user.id,
      ip_address: getClientIP(req),
      user_agent: req.headers.get("user-agent") || "unknown",
      metadata: {
        category,
        file_size: uploadFile.size,
        mime_type: uploadFile.type,
        original_filename: uploadFile.name,
      },
    });

    // ── 9. Generate access URL ──
    let url: string;
    if (config.isPublic) {
      const { data: publicUrlData } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(filePath);
      url = publicUrlData.publicUrl;
    } else {
      const { data: signedUrlData } = await supabase.storage
        .from(config.bucket)
        .createSignedUrl(filePath, 3600); // 1 hour
      url = signedUrlData?.signedUrl || "";
    }

    // ── 10. If this is a profile photo, also update personnel records ──
    if (category === "profiles" && personnelId) {
      // Update workforce_personnel photo_url
      await supabase
        .from("workforce_personnel")
        .update({ photo_url: url })
        .eq("id", personnelId);

      // Also update legacy guards table
      await supabase
        .from("guards")
        .update({ photo_url: url })
        .eq("id", personnelId);
    }

    // ── 11. If this is a document upload, also upsert workforce_documents ──
    if (category === "documents" && personnelId && documentType) {
      await supabase
        .from("workforce_documents")
        .upsert(
          {
            personnel_id: personnelId,
            document_type: documentType,
            file_url: url,
            uploaded_by: user.id,
            verified: false,
            verified_by: null,
            verified_at: null,
          },
          { onConflict: "personnel_id,document_type" }
        );
    }

    console.log(`[UploadFile] Success: ${category}/${filePath} (${uploadFile.size} bytes) by ${user.id}`);

    return jsonResponse(
      {
        success: true,
        data: {
          fileId: fileRecord.id,
          filePath: filePath,
          url: url,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
          category: category,
        },
      },
      201
    );
  } catch (err) {
    console.error("[UploadFile] Unhandled error:", err);
    return jsonResponse(
      { error: true, code: ERROR_CODES.PROCESSING_ERROR, message: "Internal server error during file upload." },
      500
    );
  }
});

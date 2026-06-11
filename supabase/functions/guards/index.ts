// ============================================================
// GUARDS MANAGEMENT — Edge Function
// Admin-only: Full CRUD for security guards
//
// POST   /functions/v1/guards                → Create guard (+ user record)
// GET    /functions/v1/guards                → List guards (with filters)
// GET    /functions/v1/guards?id=X           → Get guard detail
// PUT    /functions/v1/guards?id=X           → Update guard
// PUT    /functions/v1/guards?id=X&action=status  → Change employment status
// POST   /functions/v1/guards?id=X&action=document → Upload document
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import { validateGuard } from "../_shared/validators.ts";
import {
  computeFileHash,
  createAuditLog,
  getClientIP,
} from "../_shared/upload-utils.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return errorResponse(authError || "Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const url = new URL(req.url);
  const guardId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  try {
    // ======================================================
    // CREATE GUARD (Admin only)
    // Creates both a user record (role: guard) and guard profile
    // ======================================================
    if (req.method === "POST" && !guardId) {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();

      // Validate guard fields
      const validation = validateGuard(body);
      if (!validation.valid) {
        return jsonResponse({ error: true, errors: validation.errors }, 400);
      }

      // Check if phone already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", body.phone)
        .single();

      if (existingUser) {
        return errorResponse("A user with this phone number already exists", 409);
      }

      // Step 1: Create user record
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          name: body.name.trim(),
          phone: body.phone.trim(),
          role: "guard",
          is_active: true,
        })
        .select("id")
        .single();

      if (userError || !newUser) {
        console.error("Create guard user error:", userError);
        return errorResponse("Failed to create guard user record", 500);
      }

      // Step 2: Create guard profile
      const { data: newGuard, error: guardError } = await supabase
        .from("guards")
        .insert({
          user_id: newUser.id,
          aadhaar_number: body.aadhaar_number || null,
          pan_number: body.pan_number || null,
          address: body.address || null,
          height: body.height || null,
          weight: body.weight || null,
          education: body.education || null,
          police_verification: body.police_verification || false,
          base_salary: body.base_salary,
          joining_date: body.joining_date || new Date().toISOString().split("T")[0],
          shift_type: body.shift_type,
          emergency_contact_name: body.emergency_contact_name || null,
          emergency_contact_phone: body.emergency_contact_phone || null,
          bank_account_number: body.bank_account_number || null,
          bank_ifsc: body.bank_ifsc || null,
          bank_name: body.bank_name || null,
          employment_status: "active",
        })
        .select("*")
        .single();

      if (guardError || !newGuard) {
        // Rollback: delete the user record
        await supabase.from("users").delete().eq("id", newUser.id);
        console.error("Create guard profile error:", guardError);
        return errorResponse("Failed to create guard profile", 500);
      }

      return jsonResponse(
        {
          success: true,
          message: "Guard created successfully",
          guard: { ...newGuard, user_id: newUser.id, name: body.name, phone: body.phone },
        },
        201
      );
    }

    if (req.method === "POST" && guardId && action === "document") {
      if (user.role === "guard" && user.guard_id !== guardId) {
        return errorResponse("Cannot upload documents for other guards", 403);
      }
      const roleError = requireRole(user, ["admin", "guard"]);
      if (roleError) return roleError;

      const formData = await req.formData();
      const file = formData.get("file") as File;
      const documentType = formData.get("document_type") as string;

      if (!file) {
        return errorResponse("File is required");
      }
      if (!documentType || !["aadhaar", "pan", "photo", "police_verification", "address_proof", "other"].includes(documentType)) {
        return errorResponse("Valid document_type is required");
      }

      // Upload to storage
      const fileName = `guards/${guardId}/${documentType}_${Date.now()}.${file.name.split(".").pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("guard-documents")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return errorResponse("Failed to upload document", 500);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("guard-documents")
        .getPublicUrl(fileName);

      // Save record in guard_documents table
      const { data: docRecord, error: docError } = await supabase
        .from("guard_documents")
        .insert({
          guard_id: guardId,
          document_type: documentType,
          document_url: urlData.publicUrl,
          document_name: file.name,
        })
        .select("*")
        .single();

      if (docError) {
        console.error("Document record error:", docError);
        return errorResponse("File uploaded but failed to save record", 500);
      }

      // ─── Register in uploaded_files registry & Audit Log (Req 6, 13) ───
      try {
        const fileData = await file.arrayBuffer();
        const hash = await computeFileHash(fileData);
        const category = documentType === "photo" ? "profiles" : "documents";

        const { data: fileRecord, error: registryError } = await supabase
          .from("uploaded_files")
          .insert({
            file_path: fileName,
            bucket_name: "guard-documents",
            file_size_bytes: file.size,
            mime_type: file.type,
            category: category,
            uploaded_by: user.id,
            personnel_id: guardId,
            original_filename: file.name,
            md5_hash: hash,
            metadata: { source: "legacy_guards_api", document_type: documentType }
          })
          .select("id")
          .single();

        if (registryError) {
          console.error("Failed to register file in registry:", registryError.message);
        } else if (fileRecord) {
          await createAuditLog(supabase, {
            file_id: fileRecord.id,
            operation: "upload",
            user_id: user.id,
            ip_address: getClientIP(req),
            user_agent: req.headers.get("user-agent") || "unknown",
            metadata: { source: "legacy_guards_api", document_type: documentType }
          });
        }
      } catch (err: any) {
        console.error("Failed to create audit log / registry entry:", err.message);
      }

      // If it's a photo, also update guard's photo_url
      if (documentType === "photo") {
        await supabase
          .from("guards")
          .update({ photo_url: urlData.publicUrl })
          .eq("id", guardId);
      }

      return jsonResponse({
        success: true,
        message: "Document uploaded",
        document: docRecord,
      }, 201);
    }

    // ======================================================
    // LIST GUARDS (Admin, Manager for assigned sites)
    // ======================================================
    if (req.method === "GET" && !guardId) {
      const roleError = requireRole(user, ["admin", "manager"]);
      if (roleError) return roleError;

      const status = url.searchParams.get("status"); // active, inactive, terminated
      const siteId = url.searchParams.get("site_id");
      const shiftType = url.searchParams.get("shift_type");
      const search = url.searchParams.get("search");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      let query = supabase
        .from("guards")
        .select(
          `
          *,
          users!inner(name, phone, is_active),
          guard_site_assignments(
            site_id, shift_type, is_active,
            sites(site_name, client_name)
          )
        `,
          { count: "exact" }
        );

      // Filters
      if (status) query = query.eq("employment_status", status);
      if (shiftType) query = query.eq("shift_type", shiftType);
      if (search) {
        query = query.or(`users.name.ilike.%${search}%,users.phone.ilike.%${search}%,aadhaar_number.ilike.%${search}%`);
      }
      if (siteId) {
        query = query.eq("guard_site_assignments.site_id", siteId)
                     .eq("guard_site_assignments.is_active", true);
      }

      query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

      const { data: guards, error: listError, count } = await query;

      if (listError) {
        console.error("List guards error:", listError);
        return errorResponse("Failed to fetch guards", 500);
      }

      // Format response
      const formatted = (guards || []).map((g: any) => ({
        id: g.id,
        user_id: g.user_id,
        name: g.users?.name,
        phone: g.users?.phone,
        photo_url: g.photo_url,
        employment_status: g.employment_status,
        shift_type: g.shift_type,
        base_salary: g.base_salary,
        joining_date: g.joining_date,
        current_site: g.guard_site_assignments?.find((a: any) => a.is_active)?.sites?.site_name || null,
      }));

      return jsonResponse({
        success: true,
        guards: formatted,
        pagination: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
      });
    }

    // ======================================================
    // GET GUARD DETAIL
    // ======================================================
    if (req.method === "GET" && guardId) {
      // Guard can view own profile, admin can view all
      if (user.role === "guard" && user.guard_id !== guardId) {
        return errorResponse("Cannot view other guard's profile", 403);
      }
      const roleError = requireRole(user, ["admin", "manager", "guard"]);
      if (roleError) return roleError;

      const { data: guard, error: detailError } = await supabase
        .from("guards")
        .select(`
          *,
          users(name, phone, is_active, avatar_url),
          guard_documents(id, document_type, document_url, document_name, uploaded_at),
          guard_site_assignments(
            id, site_id, shift_type, is_active, assigned_date,
            sites(site_name, client_name, address)
          ),
          uniforms(id, item_name, item_cost, issued_date, payment_status, amount_paid)
        `)
        .eq("id", guardId)
        .single();

      if (detailError || !guard) {
        return errorResponse("Guard not found", 404);
      }

      return jsonResponse({ success: true, guard });
    }

    if (req.method === "PUT" && guardId && action !== "status") {
      if (user.role === "guard" && user.guard_id !== guardId) {
        return errorResponse("Cannot update other guard's profile", 403);
      }
      const roleError = requireRole(user, ["admin", "guard"]);
      if (roleError) return roleError;

      const body = await req.json();

      // Build update object for guards table
      const guardUpdate: Record<string, unknown> = {};
      const allowedFields = [
        "aadhaar_number", "pan_number", "address", "height", "weight",
        "education", "police_verification", "base_salary", "shift_type",
        "emergency_contact_name", "emergency_contact_phone",
        "bank_account_number", "bank_ifsc", "bank_name",
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          guardUpdate[field] = body[field];
        }
      }

      // Update guard profile
      if (Object.keys(guardUpdate).length > 0) {
        const { error: updateError } = await supabase
          .from("guards")
          .update(guardUpdate)
          .eq("id", guardId);

        if (updateError) {
          console.error("Update guard error:", updateError);
          return errorResponse("Failed to update guard", 500);
        }
      }

      // Update user name/phone if provided
      if (body.name || body.phone) {
        const { data: guard } = await supabase
          .from("guards")
          .select("user_id")
          .eq("id", guardId)
          .single();

        if (guard) {
          const userUpdates: Record<string, any> = {};
          if (body.name) userUpdates.name = body.name.trim();
          if (body.phone) userUpdates.phone = body.phone.trim();
          await supabase
            .from("users")
            .update(userUpdates)
            .eq("id", guard.user_id);
        }
      }

      // Fetch updated record
      const { data: updated } = await supabase
        .from("guards")
        .select("*, users(name, phone)")
        .eq("id", guardId)
        .single();

      return jsonResponse({ success: true, message: "Guard updated", guard: updated });
    }

    // ======================================================
    // CHANGE EMPLOYMENT STATUS (Admin only)
    // ======================================================
    if (req.method === "PUT" && guardId && action === "status") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();
      if (!body.status || !["active", "inactive", "terminated"].includes(body.status)) {
        return errorResponse("Valid status required: active, inactive, terminated");
      }

      // Update guard status
      const { error: statusError } = await supabase
        .from("guards")
        .update({ employment_status: body.status })
        .eq("id", guardId);

      if (statusError) {
        return errorResponse("Failed to update status", 500);
      }

      // If deactivating, also deactivate site assignments and user
      if (body.status !== "active") {
        await supabase
          .from("guard_site_assignments")
          .update({ is_active: false })
          .eq("guard_id", guardId);

        const { data: guard } = await supabase
          .from("guards")
          .select("user_id")
          .eq("id", guardId)
          .single();

        if (guard) {
          await supabase
            .from("users")
            .update({ is_active: false })
            .eq("id", guard.user_id);
        }
      }

      return jsonResponse({
        success: true,
        message: `Guard status changed to ${body.status}`,
      });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Guards error:", err);
    return errorResponse("Internal server error", 500);
  }
});

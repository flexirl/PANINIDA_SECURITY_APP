// ============================================================
// USER MANAGEMENT — Edge Function
// Admin-only: Create, list, update, deactivate users
//
// POST   /functions/v1/manage-users          → Create user
// GET    /functions/v1/manage-users           → List users (with filters)
// PUT    /functions/v1/manage-users?id=X      → Update user
// DELETE /functions/v1/manage-users?id=X      → Deactivate user (soft)
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import { validateUser } from "../_shared/validators.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Authenticate
  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return errorResponse(authError || "Unauthorized", 401);
  }

  // Only admin can manage users
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const supabase = getServiceClient();
  const url = new URL(req.url);

  try {
    // ======================================================
    // CREATE USER
    // ======================================================
    if (req.method === "POST") {
      const body = await req.json();

      // Validate
      const validation = validateUser(body);
      if (!validation.valid) {
        return jsonResponse({ error: true, errors: validation.errors }, 400);
      }

      // Check if phone already exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("phone", body.phone)
        .single();

      if (existing) {
        return errorResponse("User with this phone number already exists", 409);
      }

      // Create user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          name: body.name.trim(),
          phone: body.phone.trim(),
          role: body.role,
          is_active: true,
        })
        .select("id, name, phone, role, is_active, created_at")
        .single();

      if (createError) {
        console.error("Create user error:", createError);
        return errorResponse("Failed to create user", 500);
      }

      return jsonResponse(
        { success: true, message: "User created", user: newUser },
        201
      );
    }

    // ======================================================
    // LIST USERS
    // ======================================================
    if (req.method === "GET") {
      const role = url.searchParams.get("role");
      const active = url.searchParams.get("active");
      const search = url.searchParams.get("search");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      let query = supabase
        .from("users")
        .select("id, name, phone, role, is_active, created_at", {
          count: "exact",
        });

      // Apply filters
      if (role) {
        query = query.eq("role", role);
      }
      if (active !== null) {
        query = query.eq("is_active", active === "true");
      }
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      // Pagination
      query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

      const { data: users, error: listError, count } = await query;

      if (listError) {
        console.error("List users error:", listError);
        return errorResponse("Failed to fetch users", 500);
      }

      return jsonResponse({
        success: true,
        users,
        pagination: {
          page,
          limit,
          total: count,
          total_pages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // ======================================================
    // UPDATE USER
    // ======================================================
    if (req.method === "PUT") {
      const userId = url.searchParams.get("id");
      if (!userId) {
        return errorResponse("User ID is required (pass as ?id=UUID)");
      }

      const body = await req.json();

      // Build update object (only allowed fields)
      const updateData: Record<string, unknown> = {};
      if (body.name) updateData.name = body.name.trim();
      if (body.role && ["admin", "manager", "recruiter", "guard"].includes(body.role)) {
        updateData.role = body.role;
      }
      if (typeof body.is_active === "boolean") {
        updateData.is_active = body.is_active;
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse("No valid fields to update");
      }

      // Prevent admin from deactivating themselves
      if (userId === user.id && updateData.is_active === false) {
        return errorResponse("Cannot deactivate your own account");
      }

      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select("id, name, phone, role, is_active, updated_at")
        .single();

      if (updateError) {
        console.error("Update user error:", updateError);
        return errorResponse("Failed to update user", 500);
      }

      return jsonResponse({ success: true, message: "User updated", user: updated });
    }

    // ======================================================
    // DEACTIVATE USER (soft delete)
    // ======================================================
    if (req.method === "DELETE") {
      const userId = url.searchParams.get("id");
      if (!userId) {
        return errorResponse("User ID is required (pass as ?id=UUID)");
      }

      // Prevent self-deactivation
      if (userId === user.id) {
        return errorResponse("Cannot deactivate your own account");
      }

      const { data: deactivated, error: deleteError } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", userId)
        .select("id, name, phone, role, is_active")
        .single();

      if (deleteError) {
        console.error("Deactivate user error:", deleteError);
        return errorResponse("Failed to deactivate user", 500);
      }

      return jsonResponse({
        success: true,
        message: "User deactivated",
        user: deactivated,
      });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("User management error:", err);
    return errorResponse("Internal server error", 500);
  }
});

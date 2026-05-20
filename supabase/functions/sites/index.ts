// ============================================================
// SITES MANAGEMENT — Edge Function
// Admin: Full CRUD | Manager: Read assigned | Guard: Read own
//
// POST   /functions/v1/sites              → Create site
// GET    /functions/v1/sites              → List sites
// GET    /functions/v1/sites?id=X         → Get site detail
// PUT    /functions/v1/sites?id=X         → Update site
// PUT    /functions/v1/sites?id=X&action=status → Toggle active
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import { validateSite } from "../_shared/validators.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return errorResponse(authError || "Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const url = new URL(req.url);
  const siteId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  try {
    // ======================================================
    // CREATE SITE (Admin only)
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();
      const validation = validateSite(body);
      if (!validation.valid) {
        return jsonResponse({ error: true, errors: validation.errors }, 400);
      }

      const { data: newSite, error: createError } = await supabase
        .from("sites")
        .insert({
          site_name: body.site_name.trim(),
          client_name: body.client_name?.trim() || null,
          address: body.address.trim(),
          latitude: body.latitude,
          longitude: body.longitude,
          geofence_radius: body.geofence_radius || 100,
          day_shift_start: body.day_shift_start || "08:00",
          day_shift_end: body.day_shift_end || "20:00",
          night_shift_start: body.night_shift_start || "20:00",
          night_shift_end: body.night_shift_end || "08:00",
          contact_person: body.contact_person || null,
          contact_phone: body.contact_phone || null,
          is_active: true,
        })
        .select("*")
        .single();

      if (createError) {
        console.error("Create site error:", createError);
        return errorResponse("Failed to create site", 500);
      }

      return jsonResponse({ success: true, message: "Site created", site: newSite }, 201);
    }

    // ======================================================
    // LIST SITES
    // ======================================================
    if (req.method === "GET" && !siteId) {
      const roleError = requireRole(user, ["admin", "manager", "guard"]);
      if (roleError) return roleError;

      const active = url.searchParams.get("active");
      const search = url.searchParams.get("search");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      let query = supabase
        .from("sites")
        .select(`
          *,
          guard_site_assignments(id, guard_id, shift_type, is_active)
        `, { count: "exact" });

      if (active !== null) query = query.eq("is_active", active === "true");
      if (search) {
        query = query.or(`site_name.ilike.%${search}%,client_name.ilike.%${search}%,address.ilike.%${search}%`);
      }

      query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

      const { data: sites, error: listError, count } = await query;
      if (listError) {
        return errorResponse("Failed to fetch sites", 500);
      }

      const formatted = (sites || []).map((s: any) => {
        const activeAssignments = (s.guard_site_assignments || []).filter((a: any) => a.is_active);
        return {
          id: s.id,
          site_name: s.site_name,
          client_name: s.client_name,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          geofence_radius: s.geofence_radius,
          is_active: s.is_active,
          day_guards_count: activeAssignments.filter((a: any) => a.shift_type === "day").length,
          night_guards_count: activeAssignments.filter((a: any) => a.shift_type === "night").length,
          total_guards: activeAssignments.length,
          created_at: s.created_at,
        };
      });

      return jsonResponse({
        success: true,
        sites: formatted,
        pagination: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
      });
    }

    // ======================================================
    // GET SITE DETAIL
    // ======================================================
    if (req.method === "GET" && siteId) {
      const { data: site, error: detailError } = await supabase
        .from("sites")
        .select(`
          *,
          guard_site_assignments(
            id, guard_id, shift_type, is_active, assigned_date,
            guards(id, user_id, photo_url, employment_status, base_salary,
              users(name, phone)
            )
          )
        `)
        .eq("id", siteId)
        .single();

      if (detailError || !site) {
        return errorResponse("Site not found", 404);
      }

      // Separate active assignments by shift
      const assignments = site.guard_site_assignments || [];
      const activeAssignments = assignments.filter((a: any) => a.is_active);

      return jsonResponse({
        success: true,
        site: {
          ...site,
          guard_site_assignments: undefined,
          day_guards: activeAssignments.filter((a: any) => a.shift_type === "day").map((a: any) => ({
            assignment_id: a.id,
            guard_id: a.guard_id,
            name: a.guards?.users?.name,
            phone: a.guards?.users?.phone,
            photo_url: a.guards?.photo_url,
            assigned_date: a.assigned_date,
          })),
          night_guards: activeAssignments.filter((a: any) => a.shift_type === "night").map((a: any) => ({
            assignment_id: a.id,
            guard_id: a.guard_id,
            name: a.guards?.users?.name,
            phone: a.guards?.users?.phone,
            photo_url: a.guards?.photo_url,
            assigned_date: a.assigned_date,
          })),
        },
      });
    }

    // ======================================================
    // UPDATE SITE (Admin only)
    // ======================================================
    if (req.method === "PUT" && siteId && action !== "status") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();
      const updateData: Record<string, unknown> = {};
      const allowed = [
        "site_name", "client_name", "address", "latitude", "longitude",
        "geofence_radius", "day_shift_start", "day_shift_end",
        "night_shift_start", "night_shift_end", "contact_person", "contact_phone",
      ];

      for (const field of allowed) {
        if (body[field] !== undefined) updateData[field] = body[field];
      }

      if (Object.keys(updateData).length === 0) {
        return errorResponse("No valid fields to update");
      }

      const { data: updated, error: updateError } = await supabase
        .from("sites")
        .update(updateData)
        .eq("id", siteId)
        .select("*")
        .single();

      if (updateError) {
        return errorResponse("Failed to update site", 500);
      }

      return jsonResponse({ success: true, message: "Site updated", site: updated });
    }

    // ======================================================
    // TOGGLE SITE STATUS (Admin only)
    // ======================================================
    if (req.method === "PUT" && siteId && action === "status") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();
      if (typeof body.is_active !== "boolean") {
        return errorResponse("is_active (boolean) is required");
      }

      const { error: statusError } = await supabase
        .from("sites")
        .update({ is_active: body.is_active })
        .eq("id", siteId);

      if (statusError) {
        return errorResponse("Failed to update site status", 500);
      }

      // If deactivating, also deactivate all assignments
      if (!body.is_active) {
        await supabase
          .from("guard_site_assignments")
          .update({ is_active: false })
          .eq("site_id", siteId);
      }

      return jsonResponse({
        success: true,
        message: `Site ${body.is_active ? "activated" : "deactivated"}`,
      });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Sites error:", err);
    return errorResponse("Internal server error", 500);
  }
});

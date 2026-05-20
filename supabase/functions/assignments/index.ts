// ============================================================
// GUARD-SITE ASSIGNMENTS — Edge Function
// Admin only: Assign/unassign guards to sites
//
// POST   /functions/v1/assignments           → Assign guard to site
// GET    /functions/v1/assignments            → List assignments (filter by site/guard)
// DELETE /functions/v1/assignments?id=X       → Unassign (deactivate)
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return errorResponse(authError || "Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const url = new URL(req.url);

  try {
    // ======================================================
    // ASSIGN GUARD TO SITE (Admin only)
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const { guard_id, site_id, shift_type } = await req.json();

      if (!guard_id) return errorResponse("guard_id is required");
      if (!site_id) return errorResponse("site_id is required");
      if (!shift_type || !["day", "night"].includes(shift_type)) {
        return errorResponse("shift_type must be 'day' or 'night'");
      }

      // Validate guard exists and is active
      const { data: guard, error: guardErr } = await supabase
        .from("guards")
        .select("id, employment_status, user_id, users(name)")
        .eq("id", guard_id)
        .single();

      if (guardErr || !guard) return errorResponse("Guard not found", 404);
      if (guard.employment_status !== "active") {
        return errorResponse("Cannot assign inactive/terminated guard");
      }

      // Validate site exists and is active
      const { data: site, error: siteErr } = await supabase
        .from("sites")
        .select("id, site_name, is_active")
        .eq("id", site_id)
        .single();

      if (siteErr || !site) return errorResponse("Site not found", 404);
      if (!site.is_active) return errorResponse("Cannot assign to inactive site");

      // The DB trigger (trg_deactivate_prev_assignments) will auto-deactivate
      // any previous active assignment for this guard
      const { data: assignment, error: assignErr } = await supabase
        .from("guard_site_assignments")
        .insert({
          guard_id,
          site_id,
          shift_type,
          is_active: true,
          assigned_date: new Date().toISOString().split("T")[0],
        })
        .select(`
          id, guard_id, site_id, shift_type, is_active, assigned_date,
          guards(users(name)),
          sites(site_name)
        `)
        .single();

      if (assignErr) {
        console.error("Assignment error:", assignErr);
        return errorResponse("Failed to create assignment", 500);
      }

      return jsonResponse({
        success: true,
        message: `${guard.users?.name} assigned to ${site.site_name} (${shift_type} shift)`,
        assignment,
      }, 201);
    }

    // ======================================================
    // LIST ASSIGNMENTS
    // ======================================================
    if (req.method === "GET") {
      const roleError = requireRole(user, ["admin", "manager", "guard"]);
      if (roleError) return roleError;

      const guardId = url.searchParams.get("guard_id");
      const siteId = url.searchParams.get("site_id");
      const activeOnly = url.searchParams.get("active") !== "false";

      let query = supabase
        .from("guard_site_assignments")
        .select(`
          id, guard_id, site_id, shift_type, is_active, assigned_date, created_at,
          guards(id, photo_url, employment_status, users(name, phone)),
          sites(id, site_name, client_name, address, latitude, longitude, geofence_radius)
        `)
        .order("created_at", { ascending: false });

      if (guardId) query = query.eq("guard_id", guardId);
      if (siteId) query = query.eq("site_id", siteId);
      if (activeOnly) query = query.eq("is_active", true);

      // Guards can only see their own assignments
      if (user.role === "guard" && user.guard_id) {
        query = query.eq("guard_id", user.guard_id);
      }

      const { data: assignments, error: listErr } = await query;

      if (listErr) {
        return errorResponse("Failed to fetch assignments", 500);
      }

      return jsonResponse({ success: true, assignments });
    }

    // ======================================================
    // UNASSIGN (Deactivate assignment) — Admin only
    // ======================================================
    if (req.method === "DELETE") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const assignmentId = url.searchParams.get("id");
      if (!assignmentId) return errorResponse("Assignment ID required (?id=UUID)");

      const { data: deactivated, error: delErr } = await supabase
        .from("guard_site_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId)
        .select("id, guard_id, site_id, is_active")
        .single();

      if (delErr) {
        return errorResponse("Failed to deactivate assignment", 500);
      }

      return jsonResponse({
        success: true,
        message: "Guard unassigned from site",
        assignment: deactivated,
      });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Assignments error:", err);
    return errorResponse("Internal server error", 500);
  }
});

// ============================================================
// INSPECTIONS — Edge Function
// Manager submits site inspection reports with GPS + photos
//
// POST   /functions/v1/inspections             → Submit inspection
// GET    /functions/v1/inspections              → List inspections
// GET    /functions/v1/inspections?id=X         → Inspection detail
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import { isValidCoordinates, isWithinGeofence } from "../_shared/geo-utils.ts";
import { validateInspection } from "../_shared/validators.ts";

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
    // SUBMIT INSPECTION (Manager / Admin)
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin", "manager", "operations_manager", "supervisor", "inspector"]);
      if (roleError) return roleError;

      const body = await req.json();
      const validation = validateInspection(body);
      if (!validation.valid) {
        return jsonResponse({ error: true, errors: validation.errors }, 400);
      }

      // Verify site exists
      const { data: site, error: siteErr } = await supabase
        .from("sites")
        .select("id, site_name, latitude, longitude, geofence_radius")
        .eq("id", body.site_id)
        .single();

      if (siteErr || !site) {
        return errorResponse("Site not found", 404);
      }

      // Geofence check for inspector (if coordinates provided)
      let geoInfo = null;
      if (body.latitude && body.longitude && isValidCoordinates(body.latitude, body.longitude)) {
        const geoCheck = isWithinGeofence(
          body.latitude,
          body.longitude,
          parseFloat(site.latitude),
          parseFloat(site.longitude),
          (site.geofence_radius || 100) * 5 // Allow 5x radius for inspectors
        );
        geoInfo = {
          within_range: geoCheck.withinFence,
          distance_from_site: `${geoCheck.distanceMeters}m`,
        };
      }

      // Get assigned guards for this site
      const { data: assignments } = await supabase
        .from("guard_site_assignments")
        .select("guard_id")
        .eq("site_id", body.site_id)
        .eq("is_active", true);

      const totalExpected = (assignments || []).length;

      const { data: inspection, error: insertErr } = await supabase
        .from("inspections")
        .insert({
          site_id: body.site_id,
          inspector_id: user.id === "service-role" ? null : user.id,
          inspection_date: new Date().toISOString(),
          guards_present: body.guards_present || [],
          guards_absent: body.guards_absent || [],
          total_guards_expected: totalExpected,
          photos: body.photos || [],
          remarks: body.remarks,
          incident_reported: body.incident_reported || false,
          incident_severity: body.incident_reported ? body.incident_severity : null,
          incident_description: body.incident_reported ? body.incident_description : null,
          latitude: body.latitude || null,
          longitude: body.longitude || null,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Inspection insert error:", insertErr);
        return errorResponse("Failed to submit inspection", 500);
      }

      return jsonResponse({
        success: true,
        message: `Inspection submitted for ${site.site_name}`,
        geofence: geoInfo,
        inspection,
      }, 201);
    }

    // ======================================================
    // LIST INSPECTIONS
    // ======================================================
    if (req.method === "GET" && !url.searchParams.get("id")) {
      const roleError = requireRole(user, ["admin", "manager", "operations_manager", "supervisor", "inspector"]);
      if (roleError) return roleError;

      const siteId = url.searchParams.get("site_id");
      const inspectorId = url.searchParams.get("inspector_id");
      const fromDate = url.searchParams.get("from");
      const toDate = url.searchParams.get("to");
      const incidentOnly = url.searchParams.get("incidents") === "true";

      let query = supabase
        .from("inspections")
        .select(`
          *,
          sites(site_name, client_name),
          users:inspector_id(name, phone)
        `)
        .order("inspection_date", { ascending: false });

      // Managers see only their inspections
      if (user.role === "manager" && user.id !== "service-role") {
        query = query.eq("inspector_id", user.id);
      }

      if (siteId) query = query.eq("site_id", siteId);
      if (inspectorId) query = query.eq("inspector_id", inspectorId);
      if (fromDate) query = query.gte("inspection_date", fromDate);
      if (toDate) query = query.lte("inspection_date", toDate);
      if (incidentOnly) query = query.eq("incident_reported", true);

      const { data: inspections, error: listErr } = await query.limit(100);

      if (listErr) {
        return errorResponse("Failed to fetch inspections", 500);
      }

      return jsonResponse({ success: true, inspections });
    }

    // ======================================================
    // INSPECTION DETAIL
    // ======================================================
    if (req.method === "GET" && url.searchParams.get("id")) {
      const inspectionId = url.searchParams.get("id");

      const { data: inspection, error: detailErr } = await supabase
        .from("inspections")
        .select(`
          *,
          sites(site_name, client_name, address),
          users:inspector_id(name, phone)
        `)
        .eq("id", inspectionId)
        .single();

      if (detailErr || !inspection) {
        return errorResponse("Inspection not found", 404);
      }

      return jsonResponse({ success: true, inspection });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Inspections error:", err);
    return errorResponse("Internal server error", 500);
  }
});

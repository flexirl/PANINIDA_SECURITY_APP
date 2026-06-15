// ============================================================
// ATTENDANCE — Edge Function with Geo-fence Validation
// Guards check-in/out with GPS + selfie verification
//
// POST   /functions/v1/attendance              → Check-in (validates geofence)
// PUT    /functions/v1/attendance?id=X          → Check-out
// GET    /functions/v1/attendance               → List attendance (filters)
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import {
  isWithinGeofence,
  isValidCoordinates,
  isWithinShiftTiming,
  calculateAttendanceStatus,
} from "../_shared/geo-utils.ts";

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
    // CHECK-IN (Guard marks attendance with GPS + selfie)
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin", "guard"]);
      if (roleError) return roleError;

      const body = await req.json();
      const { guard_id, latitude, longitude, selfie_url } = body;

      // Use guard_id from body (admin) or from authenticated user (guard)
      const targetGuardId = user.role === "guard" ? user.guard_id : guard_id;
      if (!targetGuardId) {
        return errorResponse("guard_id is required");
      }

      // Validate GPS coordinates
      if (!isValidCoordinates(latitude, longitude)) {
        return errorResponse("Valid latitude and longitude are required");
      }

      // Get guard's active site assignment
      const { data: assignment, error: assignErr } = await supabase
        .from("guard_site_assignments")
        .select(`
          id, site_id, shift_type,
          sites(id, site_name, latitude, longitude, geofence_radius,
                day_shift_start, day_shift_end, night_shift_start, night_shift_end,
                late_threshold_minutes, min_hours_present, min_hours_half_day)
        `)
        .eq("guard_id", targetGuardId)
        .eq("is_active", true)
        .single();

      if (assignErr || !assignment) {
        return errorResponse("Guard has no active site assignment. Assign to a site first.", 400);
      }

      const site = assignment.sites as any;
      const shiftType = assignment.shift_type;

      // ── GEO-FENCE VALIDATION ──
      const geoCheck = isWithinGeofence(
        latitude,
        longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude),
        site.geofence_radius || 100
      );

      if (!geoCheck.withinFence) {
        return errorResponse(
          `Outside geofence! You are ${geoCheck.distanceMeters}m away from ${site.site_name}. ` +
          `Must be within ${site.geofence_radius || 100}m to check in.`,
          403
        );
      }

      // ── SHIFT TIMING CHECK (uses site-configurable late threshold, default 120 min = 2 hours) ──
      const shiftStart = shiftType === "day" ? site.day_shift_start : site.night_shift_start;
      const shiftEnd = shiftType === "day" ? site.day_shift_end : site.night_shift_end;
      const lateThreshold = site.late_threshold_minutes ?? 120;
      const shiftCheck = isWithinShiftTiming(shiftStart, shiftEnd, 30, lateThreshold);

      let status = "present";
      if (shiftCheck.isLate) {
        status = "late";
      }

      // ── CHECK FOR DUPLICATE (same guard, same day, same shift) ──
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("guard_id", targetGuardId)
        .eq("attendance_date", today)
        .eq("shift_type", shiftType)
        .maybeSingle();

      if (existing) {
        return errorResponse(
          `Guard has already checked in for ${shiftType} shift today (${today})`,
          409
        );
      }

      // ── INSERT ATTENDANCE ──
      const { data: attendance, error: insertErr } = await supabase
        .from("attendance")
        .insert({
          guard_id: targetGuardId,
          site_id: site.id,
          shift_type: shiftType,
          check_in_time: new Date().toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          check_in_distance: geoCheck.distanceMeters,
          check_in_selfie: selfie_url || null,
          attendance_date: today,
          status,
          is_manual_entry: user.role === "admin",
          manual_entry_by: user.role === "admin" ? user.id : null,
          remarks: shiftCheck.isLate
            ? `Late by ${Math.floor(shiftCheck.minutesOff / 60)}h ${shiftCheck.minutesOff % 60}m`
            : null,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Attendance insert error:", insertErr);
        // Handle unique constraint violation
        if (insertErr.code === "23505") {
          return errorResponse("Guard has already checked in for this shift today", 409);
        }
        return errorResponse("Failed to record attendance", 500);
      }

      return jsonResponse({
        success: true,
        message: `Check-in recorded at ${site.site_name}`,
        geofence: {
          within_fence: true,
          distance_from_site: `${geoCheck.distanceMeters}m`,
          allowed_radius: `${site.geofence_radius || 100}m`,
        },
        shift: {
          type: shiftType,
          status,
          late_by_minutes: shiftCheck.minutesOff || 0,
        },
        attendance,
      }, 201);
    }

    // ======================================================
    // CHECK-OUT (Guard marks check-out with GPS + selfie + status calculation)
    // ======================================================
    if (req.method === "PUT") {
      const roleError = requireRole(user, ["admin", "guard"]);
      if (roleError) return roleError;

      const attendanceId = url.searchParams.get("id");
      const body = await req.json();
      const { latitude, longitude, selfie_url } = body;

      if (!isValidCoordinates(latitude, longitude)) {
        return errorResponse("Valid latitude and longitude are required for check-out");
      }

      // Note: Selfie is no longer required for check-out per user request.

      // Find today's attendance record
      let query = supabase
        .from("attendance")
        .select("*, sites(latitude, longitude, geofence_radius, site_name, min_hours_present, min_hours_half_day)")
        .is("check_out_time", null); // not yet checked out

      if (attendanceId) {
        query = query.eq("id", attendanceId);
      } else {
        // Auto-find today's record for this guard
        const guardId = user.role === "guard" ? user.guard_id : body.guard_id;
        if (!guardId) return errorResponse("guard_id required");
        const today = new Date().toISOString().split("T")[0];
        query = query.eq("guard_id", guardId).eq("attendance_date", today);
      }

      const { data: record, error: findErr } = await query.single();

      if (findErr || !record) {
        return errorResponse("No active check-in found for today", 404);
      }

      const site = record.sites as any;

      // ── ENFORCE GEOFENCE ON CHECK-OUT ──
      const checkoutGeo = isWithinGeofence(
        latitude,
        longitude,
        parseFloat(site.latitude),
        parseFloat(site.longitude),
        site.geofence_radius || 100
      );

      if (!checkoutGeo.withinFence) {
        return errorResponse(
          `Cannot check out — outside geofence! You are ${checkoutGeo.distanceMeters}m away from ${site.site_name}. ` +
          `Must be within ${site.geofence_radius || 100}m to check out.`,
          403
        );
      }

      // ── CALCULATE HOURS WORKED ──
      const now = new Date();
      const checkInTime = new Date(record.check_in_time);
      const diffHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      const hoursWorked = Number(Math.max(0, diffHours).toFixed(2));

      // ── DETERMINE FINAL STATUS ──
      const wasLateCheckIn = record.status === "late";
      const finalStatus = calculateAttendanceStatus(
        hoursWorked,
        wasLateCheckIn,
        site.min_hours_present ?? 7,
        site.min_hours_half_day ?? 4
      );

      // Build remarks
      const hoursH = Math.floor(hoursWorked);
      const hoursM = Math.round((hoursWorked - hoursH) * 60);
      let remarks = `Worked ${hoursH}h ${hoursM}m`;
      if (wasLateCheckIn) remarks += " (checked in late)";

      // Update with checkout info
      const { data: updated, error: updateErr } = await supabase
        .from("attendance")
        .update({
          check_out_time: now.toISOString(),
          check_out_latitude: latitude,
          check_out_longitude: longitude,
          check_out_distance: checkoutGeo.distanceMeters,
          check_out_selfie: selfie_url,
          hours_worked: hoursWorked,
          status: finalStatus,
          remarks,
        })
        .eq("id", record.id)
        .select("*")
        .single();

      if (updateErr) {
        return errorResponse("Failed to record check-out", 500);
      }

      return jsonResponse({
        success: true,
        message: `Check-out recorded at ${site.site_name}`,
        geofence: {
          within_fence: true,
          distance_from_site: `${checkoutGeo.distanceMeters}m`,
        },
        shift: {
          status: finalStatus,
          hours_worked: hoursWorked,
        },
        attendance: updated,
      });
    }

    // ======================================================
    // LIST ATTENDANCE (with filters)
    // ======================================================
    if (req.method === "GET") {
      const roleError = requireRole(user, ["admin", "manager", "guard"]);
      if (roleError) return roleError;

      const guardId = url.searchParams.get("guard_id");
      const siteId = url.searchParams.get("site_id");
      const date = url.searchParams.get("date");
      const fromDate = url.searchParams.get("from");
      const toDate = url.searchParams.get("to");
      const status = url.searchParams.get("status");

      let query = supabase
        .from("attendance")
        .select(`
          *,
          guards(id, user_id, users(name, phone)),
          sites(id, site_name, client_name)
        `)
        .order("attendance_date", { ascending: false })
        .order("check_in_time", { ascending: false });

      // Guards can only see their own attendance
      if (user.role === "guard" && user.guard_id) {
        query = query.eq("guard_id", user.guard_id);
      } else if (guardId) {
        query = query.eq("guard_id", guardId);
      }

      if (siteId) query = query.eq("site_id", siteId);
      if (date) query = query.eq("attendance_date", date);
      if (fromDate) query = query.gte("attendance_date", fromDate);
      if (toDate) query = query.lte("attendance_date", toDate);
      if (status) query = query.eq("status", status);

      const { data: records, error: listErr } = await query.limit(100);

      if (listErr) {
        return errorResponse("Failed to fetch attendance", 500);
      }

      return jsonResponse({ success: true, attendance: records });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Attendance error:", err);
    return errorResponse("Internal server error", 500);
  }
});

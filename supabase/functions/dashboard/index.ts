// ============================================================
// DASHBOARD / REPORTS — Edge Function
// Admin overview, attendance summaries, monthly reports
//
// GET /functions/v1/dashboard?view=overview            → Dashboard stats
// GET /functions/v1/dashboard?view=attendance&date=X    → Daily attendance summary
// GET /functions/v1/dashboard?view=monthly&month=X      → Monthly report
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
    if (req.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    const roleError = requireRole(user, ["admin", "manager"]);
    if (roleError) return roleError;

    const view = url.searchParams.get("view") || "overview";

    // ======================================================
    // DASHBOARD OVERVIEW
    // ======================================================
    if (view === "overview") {
      const today = new Date().toISOString().split("T")[0];

      // Total counts
      const [
        { count: totalGuards },
        { count: activeGuards },
        { count: totalSites },
        { count: activeSites },
        { count: todayPresent },
        { count: pendingPayrolls },
        { count: totalCandidates },
        { count: recentIncidents },
      ] = await Promise.all([
        supabase.from("guards").select("*", { count: "exact", head: true }),
        supabase.from("guards").select("*", { count: "exact", head: true }).eq("employment_status", "active"),
        supabase.from("sites").select("*", { count: "exact", head: true }),
        supabase.from("sites").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("attendance_date", today).not("check_in_time", "is", null),
        supabase.from("payroll").select("*", { count: "exact", head: true }).in("status", ["draft", "generated"]),
        supabase.from("candidates").select("*", { count: "exact", head: true }).not("status", "in", "(hired,rejected)"),
        supabase.from("inspections").select("*", { count: "exact", head: true }).eq("incident_reported", true).gte("inspection_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Today's late count
      const { count: todayLate } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("attendance_date", today)
        .eq("status", "late");

      // Active assignments count
      const { count: activeAssignments } = await supabase
        .from("guard_site_assignments")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return jsonResponse({
        success: true,
        dashboard: {
          guards: {
            total: totalGuards || 0,
            active: activeGuards || 0,
            assigned: activeAssignments || 0,
          },
          sites: {
            total: totalSites || 0,
            active: activeSites || 0,
          },
          today: {
            date: today,
            present: todayPresent || 0,
            late: todayLate || 0,
            expected: activeAssignments || 0,
            absent: (activeAssignments || 0) - (todayPresent || 0),
          },
          payroll: {
            pending: pendingPayrolls || 0,
          },
          recruitment: {
            active_candidates: totalCandidates || 0,
          },
          incidents: {
            last_7_days: recentIncidents || 0,
          },
        },
      });
    }

    // ======================================================
    // DAILY ATTENDANCE SUMMARY
    // ======================================================
    if (view === "attendance") {
      const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

      // Get all active sites with their assigned guards
      const { data: sites } = await supabase
        .from("sites")
        .select("id, site_name, client_name")
        .eq("is_active", true)
        .order("site_name");

      const siteSummaries = [];

      for (const site of sites || []) {
        // Get assigned guards for this site
        const { count: assigned } = await supabase
          .from("guard_site_assignments")
          .select("*", { count: "exact", head: true })
          .eq("site_id", site.id)
          .eq("is_active", true);

        // Get attendance for this site on this date
        const { data: attendanceRecords } = await supabase
          .from("attendance")
          .select("status, guard_id, check_in_time, guards(users(name))")
          .eq("site_id", site.id)
          .eq("attendance_date", date);

        const present = (attendanceRecords || []).filter(
          (a: any) => a.status === "present"
        ).length;
        const late = (attendanceRecords || []).filter(
          (a: any) => a.status === "late"
        ).length;

        siteSummaries.push({
          site_id: site.id,
          site_name: site.site_name,
          client_name: site.client_name,
          total_assigned: assigned || 0,
          present,
          late,
          absent: (assigned || 0) - present - late,
          attendance_records: attendanceRecords || [],
        });
      }

      return jsonResponse({
        success: true,
        date,
        summary: {
          total_sites: siteSummaries.length,
          total_present: siteSummaries.reduce((s, r) => s + r.present, 0),
          total_late: siteSummaries.reduce((s, r) => s + r.late, 0),
          total_absent: siteSummaries.reduce((s, r) => s + r.absent, 0),
        },
        sites: siteSummaries,
      });
    }

    // ======================================================
    // MONTHLY REPORT
    // ======================================================
    if (view === "monthly") {
      const month = url.searchParams.get("month");
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return errorResponse("month required in YYYY-MM format");
      }

      const monthStart = `${month}-01`;
      const monthEnd = new Date(
        parseInt(month.split("-")[0]),
        parseInt(month.split("-")[1]),
        0
      ).toISOString().split("T")[0];

      // Get all payroll records for this month
      const { data: payrolls } = await supabase
        .from("payroll")
        .select("*, guards(users(name, phone))")
        .eq("month", month)
        .order("final_salary", { ascending: false });

      // Get attendance stats
      const { data: attendanceStats } = await supabase
        .from("attendance")
        .select("status")
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd);

      const totalPresent = (attendanceStats || []).filter(
        (a: any) => a.status === "present"
      ).length;
      const totalLate = (attendanceStats || []).filter(
        (a: any) => a.status === "late"
      ).length;

      // Get inspection count
      const { count: inspectionCount } = await supabase
        .from("inspections")
        .select("*", { count: "exact", head: true })
        .gte("inspection_date", monthStart)
        .lte("inspection_date", monthEnd + "T23:59:59");

      const totalSalary = (payrolls || []).reduce(
        (s: number, p: any) => s + parseFloat(p.final_salary || 0), 0
      );

      return jsonResponse({
        success: true,
        month,
        report: {
          payroll: {
            total_guards: (payrolls || []).length,
            total_salary: Math.round(totalSalary * 100) / 100,
            approved: (payrolls || []).filter((p: any) => p.status === "approved" || p.status === "paid").length,
            pending: (payrolls || []).filter((p: any) => p.status === "draft" || p.status === "generated").length,
          },
          attendance: {
            total_checkins: (attendanceStats || []).length,
            present: totalPresent,
            late: totalLate,
          },
          inspections: {
            total: inspectionCount || 0,
          },
        },
        payrolls: payrolls || [],
      });
    }

    return errorResponse("Invalid view. Use: overview, attendance, monthly");
  } catch (err) {
    console.error("Dashboard error:", err);
    return errorResponse("Internal server error", 500);
  }
});

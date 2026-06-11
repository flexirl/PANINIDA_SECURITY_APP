import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  handleCors,
  jsonResponse,
  errorResponse
} from "../_shared/auth-middleware.ts";
import { sendNotificationToMultiple } from "../_shared/notifications.ts";

const SYSTEM_ADMIN_ID = "a0000000-0000-0000-0000-000000000001"; // राजेश कुमार (Admin) pre-seeded ID

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return errorResponse(authError || "Unauthorized", 401);
  }

  // Ensure request is authorized (only admins or service role can run the escalation engine)
  if (user.role !== "admin" && user.id !== "service-role") {
    return errorResponse("Forbidden: Admin privileges required", 403);
  }

  const supabase = getServiceClient();

  try {
    const now = new Date().toISOString();

    // =========================================================================
    // PART 1: COMPLAINT SLA ESCALATION
    // =========================================================================
    // Query complaints with expired SLA deadlines
    const { data: expiredComplaints, error: complaintsErr } = await supabase
      .from("complaints")
      .select("*, site:sites(*)")
      .not("status", "in", '("resolved","closed")')
      .lt("sla_deadline", now);

    if (complaintsErr) throw complaintsErr;

    console.log(`[Escalation Engine] Found ${expiredComplaints?.length || 0} expired SLA complaints.`);

    for (const complaint of (expiredComplaints || [])) {
      const siteName = complaint.site?.site_name || "Assigned Site";
      const nextSlaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours for next level

      if (complaint.current_level === 1) {
        // Escalate L1 → L2
        console.log(`[Escalation L1 -> L2] Escalating complaint ${complaint.id}`);

        // Update complaint
        const { error: updErr } = await supabase
          .from("complaints")
          .update({
            current_level: 2,
            status: "escalated_l2",
            sla_deadline: nextSlaDeadline,
            updated_at: now
          })
          .eq("id", complaint.id);

        if (updErr) {
          console.error(`[Escalation Error] Failed to update complaint ${complaint.id}:`, updErr.message);
          continue;
        }

        // Insert escalation log
        await supabase.from("complaint_escalations").insert({
          complaint_id: complaint.id,
          from_level: 1,
          to_level: 2,
          escalated_at: now,
          escalated_by: "system",
          reason: "L1 SLA deadline exceeded"
        });

        // Insert timeline comment
        await supabase.from("complaint_comments").insert({
          complaint_id: complaint.id,
          author_id: SYSTEM_ADMIN_ID,
          comment_text: "System Escalation: L1 SLA deadline exceeded. Complaint escalated to Level 2 (Site Manager / Operations Manager).",
          action_taken: "Escalated to L2"
        });

        // Notify site manager and operations managers
        const targetUserIds: string[] = [];
        if (complaint.site?.site_manager_id) {
          targetUserIds.push(complaint.site.site_manager_id);
        }

        const { data: opsManagers } = await supabase
          .from("users")
          .select("id")
          .eq("role", "operations_manager")
          .eq("is_active", true);
        
        opsManagers?.forEach(om => targetUserIds.push(om.id));

        if (targetUserIds.length > 0) {
          await sendNotificationToMultiple(supabase, targetUserIds, {
            title: `SLA Escalation (L2): ${complaint.category}`,
            body: `Complaint at ${siteName} exceeded L1 SLA and is escalated to Level 2.`,
            type: "complaint_escalated_l2",
            data: { complaint_id: complaint.id, site_id: complaint.site_id }
          });
        }

      } else if (complaint.current_level === 2) {
        // Escalate L2 → L3
        console.log(`[Escalation L2 -> L3] Escalating complaint ${complaint.id}`);

        // Update complaint
        const { error: updErr } = await supabase
          .from("complaints")
          .update({
            current_level: 3,
            status: "escalated_l3",
            sla_deadline: nextSlaDeadline,
            updated_at: now
          })
          .eq("id", complaint.id);

        if (updErr) {
          console.error(`[Escalation Error] Failed to update complaint ${complaint.id}:`, updErr.message);
          continue;
        }

        // Insert escalation log
        await supabase.from("complaint_escalations").insert({
          complaint_id: complaint.id,
          from_level: 2,
          to_level: 3,
          escalated_at: now,
          escalated_by: "system",
          reason: "L2 SLA deadline exceeded"
        });

        // Insert timeline comment
        await supabase.from("complaint_comments").insert({
          complaint_id: complaint.id,
          author_id: SYSTEM_ADMIN_ID,
          comment_text: "System Escalation: L2 SLA deadline exceeded. Complaint escalated to Level 3 (Admin).",
          action_taken: "Escalated to L3"
        });

        // Notify admins and super admins
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .in("role", ["admin", "super_admin"])
          .eq("is_active", true);

        const targetUserIds = admins?.map(a => a.id) || [];

        if (targetUserIds.length > 0) {
          await sendNotificationToMultiple(supabase, targetUserIds, {
            title: `SLA Escalation (L3): ${complaint.category}`,
            body: `Complaint at ${siteName} exceeded L2 SLA and is escalated to Level 3.`,
            type: "complaint_escalated_l3",
            data: { complaint_id: complaint.id, site_id: complaint.site_id }
          });
        }
      }
    }

    // =========================================================================
    // PART 2: STALE VACANCY ALERT
    // =========================================================================
    // Query requested replacements open for more than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: staleVacancies, error: vacErr } = await supabase
      .from("replacements")
      .select("*, site:sites(*)")
      .eq("status", "requested")
      .lt("vacancy_start", twoHoursAgo);

    if (vacErr) throw vacErr;

    console.log(`[Escalation Engine] Found ${staleVacancies?.length || 0} stale vacancies (>2 hours).`);

    for (const vacancy of (staleVacancies || [])) {
      // Idempotency check: see if we already sent a vacancy_escalated notification for this replacement
      const { data: existingNotif, error: notifCheckErr } = await supabase
        .from("notifications")
        .select("id")
        .eq("type", "vacancy_escalated")
        .eq("title", `Stale Vacancy Alert: ${vacancy.site?.site_name}`)
        .limit(1);

      if (notifCheckErr) continue;

      if (existingNotif && existingNotif.length > 0) {
        // Notification already sent, skip to prevent duplicates
        continue;
      }

      console.log(`[Vacancy Alert] Escalating stale vacancy ${vacancy.id}`);

      // Lookup operations managers to notify
      const { data: opsManagers } = await supabase
        .from("users")
        .select("id")
        .eq("role", "operations_manager")
        .eq("is_active", true);

      const targetUserIds = opsManagers?.map(om => om.id) || [];

      if (targetUserIds.length > 0) {
        await sendNotificationToMultiple(supabase, targetUserIds, {
          title: `Stale Vacancy Alert: ${vacancy.site?.site_name || "Site"}`,
          body: `Replacement shift vacancy remains open for more than 2 hours since vacancy start.`,
          type: "vacancy_escalated",
          data: { replacement_id: vacancy.id, site_id: vacancy.site_id }
        });
      }
    }

    return jsonResponse({ success: true, message: "Escalation engine run completed successfully." });
  } catch (err: any) {
    console.error("[Escalation Engine Exception]:", err.message || err);
    return errorResponse(err.message || "Internal server error", 500);
  }
});

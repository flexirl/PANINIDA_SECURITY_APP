// ============================================================
// NOTIFICATIONS — Edge Function
// In-app notification management
//
// GET    /functions/v1/notifications                    → List my notifications
// PUT    /functions/v1/notifications?id=X               → Mark as read
// PUT    /functions/v1/notifications?action=read-all    → Mark all as read
// POST   /functions/v1/notifications                    → Create notification (Admin)
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
    // CREATE NOTIFICATION (Admin / System)
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();

      if (!body.user_id) return errorResponse("user_id is required");
      if (!body.title) return errorResponse("title is required");

      const validTypes = [
        "shift_reminder", "attendance_alert", "salary_generated",
        "inspection_reminder", "recruitment_update", "general",
      ];

      const { data: notification, error: insertErr } = await supabase
        .from("notifications")
        .insert({
          user_id: body.user_id,
          title: body.title,
          body: body.body || null,
          type: validTypes.includes(body.type) ? body.type : "general",
          data: body.data || null,
          is_read: false,
        })
        .select("*")
        .single();

      if (insertErr) {
        return errorResponse("Failed to create notification", 500);
      }

      return jsonResponse({ success: true, notification }, 201);
    }

    // ======================================================
    // LIST NOTIFICATIONS
    // ======================================================
    if (req.method === "GET") {
      const unreadOnly = url.searchParams.get("unread") === "true";
      const type = url.searchParams.get("type");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Non-admin users see only their own
      if (user.id !== "service-role") {
        query = query.eq("user_id", user.id);
      } else if (url.searchParams.get("user_id")) {
        query = query.eq("user_id", url.searchParams.get("user_id"));
      }

      if (unreadOnly) query = query.eq("is_read", false);
      if (type) query = query.eq("type", type);

      const { data: notifications, error: listErr } = await query;

      if (listErr) {
        return errorResponse("Failed to fetch notifications", 500);
      }

      const unreadCount = (notifications || []).filter((n: any) => !n.is_read).length;

      return jsonResponse({
        success: true,
        notifications,
        unread_count: unreadCount,
      });
    }

    // ======================================================
    // MARK AS READ / MARK ALL READ
    // ======================================================
    if (req.method === "PUT") {
      const notifId = url.searchParams.get("id");
      const action = url.searchParams.get("action");

      // Mark all as read
      if (action === "read-all") {
        const targetUserId = user.id === "service-role"
          ? url.searchParams.get("user_id")
          : user.id;

        if (!targetUserId) return errorResponse("user_id required");

        const { error: updateErr } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", targetUserId)
          .eq("is_read", false);

        if (updateErr) {
          return errorResponse("Failed to mark notifications as read", 500);
        }

        return jsonResponse({ success: true, message: "All notifications marked as read" });
      }

      // Mark single as read
      if (notifId) {
        const { data: updated, error: updateErr } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notifId)
          .select("*")
          .single();

        if (updateErr) {
          return errorResponse("Failed to update notification", 500);
        }

        return jsonResponse({ success: true, notification: updated });
      }

      return errorResponse("Provide ?id=UUID or ?action=read-all");
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Notifications error:", err);
    return errorResponse("Internal server error", 500);
  }
});

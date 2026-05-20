// ============================================================
// UNIFORMS — Edge Function
// Track uniform items issued to guards + payment status
//
// POST   /functions/v1/uniforms              → Issue uniform item
// GET    /functions/v1/uniforms              → List uniforms (filter by guard)
// PUT    /functions/v1/uniforms?id=X         → Update payment status
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";

const VALID_ITEMS = [
  "uniform_set", "shoes", "belt", "cap", "id_card",
  "torch", "baton", "whistle", "other",
];

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
    // ISSUE UNIFORM ITEM (Admin only)
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();

      if (!body.guard_id) return errorResponse("guard_id is required");
      if (!body.item_name || !VALID_ITEMS.includes(body.item_name)) {
        return errorResponse(`item_name must be one of: ${VALID_ITEMS.join(", ")}`);
      }
      if (!body.item_cost || body.item_cost <= 0) {
        return errorResponse("item_cost must be a positive number");
      }

      // Verify guard exists
      const { data: guard } = await supabase
        .from("guards")
        .select("id, users(name)")
        .eq("id", body.guard_id)
        .single();

      if (!guard) return errorResponse("Guard not found", 404);

      const { data: uniform, error: insertErr } = await supabase
        .from("uniforms")
        .insert({
          guard_id: body.guard_id,
          item_name: body.item_name,
          item_cost: body.item_cost,
          issued_date: body.issued_date || new Date().toISOString().split("T")[0],
          payment_status: "pending",
          amount_paid: 0,
          remarks: body.remarks || null,
        })
        .select("*")
        .single();

      if (insertErr) {
        return errorResponse("Failed to issue uniform", 500);
      }

      return jsonResponse({
        success: true,
        message: `${body.item_name} issued to ${(guard.users as any)?.name}`,
        uniform,
      }, 201);
    }

    // ======================================================
    // LIST UNIFORMS
    // ======================================================
    if (req.method === "GET") {
      const roleError = requireRole(user, ["admin", "guard"]);
      if (roleError) return roleError;

      const guardId = url.searchParams.get("guard_id");
      const paymentStatus = url.searchParams.get("status");

      let query = supabase
        .from("uniforms")
        .select("*, guards(id, users(name, phone))")
        .order("issued_date", { ascending: false });

      // Guards see only their own
      if (user.role === "guard" && user.guard_id) {
        query = query.eq("guard_id", user.guard_id);
      } else if (guardId) {
        query = query.eq("guard_id", guardId);
      }

      if (paymentStatus) query = query.eq("payment_status", paymentStatus);

      const { data: uniforms, error: listErr } = await query;

      if (listErr) {
        return errorResponse("Failed to fetch uniforms", 500);
      }

      // Calculate summary
      const totalCost = (uniforms || []).reduce((s: number, u: any) => s + parseFloat(u.item_cost), 0);
      const totalPaid = (uniforms || []).reduce((s: number, u: any) => s + parseFloat(u.amount_paid || 0), 0);

      return jsonResponse({
        success: true,
        uniforms,
        summary: {
          total_items: (uniforms || []).length,
          total_cost: totalCost,
          total_paid: totalPaid,
          total_pending: totalCost - totalPaid,
        },
      });
    }

    // ======================================================
    // UPDATE PAYMENT STATUS (Admin only)
    // ======================================================
    if (req.method === "PUT") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const uniformId = url.searchParams.get("id");
      if (!uniformId) return errorResponse("Uniform ID required (?id=UUID)");

      const body = await req.json();
      const updateFields: Record<string, unknown> = {};

      if (body.payment_status) {
        if (!["pending", "partial", "paid", "deducted"].includes(body.payment_status)) {
          return errorResponse("payment_status must be: pending, partial, paid, or deducted");
        }
        updateFields.payment_status = body.payment_status;
      }
      if (body.amount_paid !== undefined) {
        updateFields.amount_paid = body.amount_paid;
      }
      if (body.deducted_in_month) {
        updateFields.deducted_in_month = body.deducted_in_month;
      }
      if (body.remarks !== undefined) {
        updateFields.remarks = body.remarks;
      }

      const { data: updated, error: updateErr } = await supabase
        .from("uniforms")
        .update(updateFields)
        .eq("id", uniformId)
        .select("*")
        .single();

      if (updateErr) {
        return errorResponse("Failed to update uniform", 500);
      }

      return jsonResponse({ success: true, message: "Uniform updated", uniform: updated });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Uniforms error:", err);
    return errorResponse("Internal server error", 500);
  }
});

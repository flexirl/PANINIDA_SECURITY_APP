// ============================================================
// PAYROLL MANAGEMENT — Edge Function
// Generate, view, approve monthly salary for guards
//
// POST   /functions/v1/payroll                      → Generate payroll for a month
// GET    /functions/v1/payroll                       → List payroll records
// GET    /functions/v1/payroll?id=X                  → Salary slip detail
// PUT    /functions/v1/payroll?id=X&action=approve   → Approve payroll
// PUT    /functions/v1/payroll?id=X                  → Edit adjustments
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
    // GENERATE PAYROLL (Admin only)
    // Calculates salary for all active guards for a given month
    // ======================================================
    if (req.method === "POST") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();
      const { month, guard_id } = body;

      // Validate month format (YYYY-MM)
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return errorResponse("month is required in format YYYY-MM (e.g., 2026-05)");
      }

      // Calculate total days in the month
      const monthStart = new Date(`${month}-01`);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const totalWorkingDays = monthEnd.getDate();

      // Get personnel to process (all categories)
      let guardsQuery = supabase
        .from("workforce_personnel")
        .select("id, user_id, base_salary, users(name, phone)")
        .eq("employment_status", "active");

      if (guard_id) {
        guardsQuery = guardsQuery.eq("id", guard_id);
      }

      const { data: guards, error: guardsErr } = await guardsQuery;

      if (guardsErr || !guards || guards.length === 0) {
        return errorResponse("No active guards found", 404);
      }

      const results: any[] = [];
      const errors: any[] = [];

      for (const guard of guards) {
        try {
          // Check if payroll already exists for this guard/month
          const { data: existing } = await supabase
            .from("payroll")
            .select("id, status")
            .eq("guard_id", guard.id)
            .eq("month", month)
            .maybeSingle();

          if (existing) {
            if (existing.status === "approved" || existing.status === "paid") {
              errors.push({
                guard_id: guard.id,
                name: (guard.users as any)?.name,
                error: `Payroll already ${existing.status} for ${month}`,
              });
              continue;
            }
            // If draft/generated, delete and regenerate
            await supabase.from("payroll").delete().eq("id", existing.id);
          }

          // Get attendance data for this guard in this month
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select("status, hours_worked, shift_type")
            .eq("guard_id", guard.id)
            .gte("attendance_date", `${month}-01`)
            .lte("attendance_date", monthEnd.toISOString().split("T")[0]);

          const daysPresent = (attendanceData || []).filter(
            (a: any) => a.status === "present" || a.status === "late"
          ).length;

          const daysLate = (attendanceData || []).filter(
            (a: any) => a.status === "late"
          ).length;

          const daysAbsent = totalWorkingDays - daysPresent;

          const totalHoursWorked = (attendanceData || []).reduce(
            (sum: number, a: any) => sum + (parseFloat(a.hours_worked) || 0),
            0
          );

          // Calculate overtime (hours beyond 12h shift × days present)
          const expectedHoursPerDay = 12;
          const expectedTotalHours = daysPresent * expectedHoursPerDay;
          const overtimeHours = Math.max(0, totalHoursWorked - expectedTotalHours);
          const perHourRate = guard.base_salary / (totalWorkingDays * expectedHoursPerDay);
          const overtimeAmount = Math.round(overtimeHours * perHourRate * 1.5 * 100) / 100; // 1.5x OT rate

          // Pro-rated salary
          const proRatedSalary = Math.round(
            (guard.base_salary / totalWorkingDays) * daysPresent * 100
          ) / 100;

          // Penalty: ₹200 per late, ₹0 for absent (already deducted via pro-rating)
          const penaltyPerLate = 200;
          const penaltyAmount = daysLate * penaltyPerLate;

          // Get pending uniform deductions
          const { data: uniformItems } = await supabase
            .from("uniforms")
            .select("item_cost, amount_paid")
            .eq("guard_id", guard.id)
            .in("payment_status", ["pending", "partial"]);

          const uniformDeduction = (uniformItems || []).reduce(
            (sum: number, item: any) =>
              sum + (parseFloat(item.item_cost) - parseFloat(item.amount_paid || 0)),
            0
          );

          // Calculate final salary
          const finalSalary = Math.max(
            0,
            Math.round(
              (proRatedSalary + overtimeAmount - penaltyAmount - uniformDeduction) * 100
            ) / 100
          );

          // Insert payroll record
          const { data: payroll, error: insertErr } = await supabase
            .from("payroll")
            .insert({
              guard_id: guard.id,
              month,
              total_working_days: totalWorkingDays,
              days_present: daysPresent,
              days_late: daysLate,
              days_absent: daysAbsent,
              base_salary: guard.base_salary,
              pro_rated_salary: proRatedSalary,
              overtime_hours: Math.round(overtimeHours * 100) / 100,
              overtime_amount: overtimeAmount,
              penalty_amount: penaltyAmount,
              uniform_deduction: uniformDeduction,
              advance_deduction: 0, // Manual entry by admin
              other_deduction: 0,
              final_salary: finalSalary,
              status: "generated",
              generated_at: new Date().toISOString(),
            })
            .select("*")
            .single();

          if (insertErr) {
            console.error(`Payroll error for guard ${guard.id}:`, insertErr);
            errors.push({
              guard_id: guard.id,
              name: (guard.users as any)?.name,
              error: insertErr.message,
            });
            continue;
          }

          results.push({
            guard_id: guard.id,
            name: (guard.users as any)?.name,
            final_salary: finalSalary,
            days_present: daysPresent,
            days_absent: daysAbsent,
            payroll_id: payroll.id,
          });
        } catch (err) {
          errors.push({
            guard_id: guard.id,
            name: (guard.users as any)?.name,
            error: String(err),
          });
        }
      }

      return jsonResponse(
        {
          success: true,
          message: `Payroll generated for ${month}`,
          summary: {
            total_guards: guards.length,
            processed: results.length,
            failed: errors.length,
            total_salary: results.reduce((s, r) => s + r.final_salary, 0),
          },
          payrolls: results,
          errors: errors.length > 0 ? errors : undefined,
        },
        201
      );
    }

    // ======================================================
    // LIST PAYROLL RECORDS
    // ======================================================
    if (req.method === "GET" && !url.searchParams.get("id")) {
      const roleError = requireRole(user, ["admin", "guard", "workforce_personnel"]);
      if (roleError) return roleError;

      const month = url.searchParams.get("month");
      const guardId = url.searchParams.get("guard_id");
      const status = url.searchParams.get("status");

      let query = supabase
        .from("payroll")
        .select(`
          *,
          guards:workforce_personnel(id, user_id, category_id, employee_id, phone, users(name, phone))
        `)
        .order("month", { ascending: false });

      // Guards can only see their own approved/paid slips
      if ((user.role === "guard" || user.role === "workforce_personnel") && user.guard_id) {
        query = query
          .eq("guard_id", user.guard_id)
          .in("status", ["generated", "approved", "paid"]);
      } else {
        if (guardId) query = query.eq("guard_id", guardId);
        if (status) query = query.eq("status", status);
      }

      if (month) query = query.eq("month", month);

      const { data: payrolls, error: listErr } = await query;

      if (listErr) {
        return errorResponse("Failed to fetch payroll records", 500);
      }

      return jsonResponse({ success: true, payrolls });
    }

    // ======================================================
    // SALARY SLIP DETAIL
    // ======================================================
    if (req.method === "GET" && url.searchParams.get("id")) {
      const payrollId = url.searchParams.get("id");

      const { data: slip, error: slipErr } = await supabase
        .from("payroll")
        .select(`
          *,
          guards:workforce_personnel(
            id, user_id, category_id, employee_id, phone, base_salary, bank_account_number, bank_ifsc, bank_name,
            users(name, phone)
          )
        `)
        .eq("id", payrollId)
        .single();

      if (slipErr || !slip) {
        return errorResponse("Salary slip not found", 404);
      }

      // Guards can only see their own generated/approved/paid slips
      if (user.role === "guard" || user.role === "workforce_personnel") {
        if (user.guard_id !== slip.guard_id) {
          return errorResponse("Cannot view other guard's salary", 403);
        }
        if (!["generated", "approved", "paid"].includes(slip.status)) {
          return errorResponse("Salary slip not yet approved", 403);
        }
      }

      // Build detailed breakdown
      const breakdown = {
        earnings: {
          pro_rated_salary: slip.pro_rated_salary,
          overtime_amount: slip.overtime_amount,
          total_earnings:
            parseFloat(slip.pro_rated_salary) + parseFloat(slip.overtime_amount),
        },
        deductions: {
          penalty_amount: slip.penalty_amount,
          uniform_deduction: slip.uniform_deduction,
          advance_deduction: slip.advance_deduction,
          other_deduction: slip.other_deduction,
          other_deduction_reason: slip.other_deduction_reason,
          total_deductions:
            parseFloat(slip.penalty_amount) +
            parseFloat(slip.uniform_deduction) +
            parseFloat(slip.advance_deduction) +
            parseFloat(slip.other_deduction),
        },
        net_salary: slip.final_salary,
      };

      return jsonResponse({
        success: true,
        slip,
        breakdown,
      });
    }

    // ======================================================
    // APPROVE PAYROLL / EDIT ADJUSTMENTS (Admin only)
    // ======================================================
    if (req.method === "PUT") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const payrollId = url.searchParams.get("id");
      const action = url.searchParams.get("action");

      if (!payrollId) return errorResponse("Payroll ID required (?id=UUID)");

      // Fetch current payroll
      const { data: current, error: fetchErr } = await supabase
        .from("payroll")
        .select("*")
        .eq("id", payrollId)
        .single();

      if (fetchErr || !current) {
        return errorResponse("Payroll record not found", 404);
      }

      // ── APPROVE ──
      if (action === "approve") {
        if (current.status === "approved" || current.status === "paid") {
          return errorResponse(`Payroll already ${current.status}`);
        }

        const { data: approved, error: approveErr } = await supabase
          .from("payroll")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: user.id,
          })
          .eq("id", payrollId)
          .select("*")
          .single();

        if (approveErr) {
          return errorResponse("Failed to approve payroll", 500);
        }

        // Mark uniform items as deducted
        if (parseFloat(current.uniform_deduction) > 0) {
          await supabase
            .from("uniforms")
            .update({
              payment_status: "deducted",
              deducted_in_month: current.month,
            })
            .eq("guard_id", current.guard_id)
            .in("payment_status", ["pending", "partial"]);
        }

        return jsonResponse({
          success: true,
          message: "Payroll approved",
          payroll: approved,
        });
      }

      // ── MARK AS PAID ──
      if (action === "paid") {
        if (current.status !== "approved") {
          return errorResponse("Payroll must be approved before marking as paid");
        }

        const { data: paid, error: paidErr } = await supabase
          .from("payroll")
          .update({ status: "paid" })
          .eq("id", payrollId)
          .select("*")
          .single();

        if (paidErr) {
          return errorResponse("Failed to mark as paid", 500);
        }

        return jsonResponse({
          success: true,
          message: "Payroll marked as paid",
          payroll: paid,
        });
      }

      // ── EDIT ADJUSTMENTS (advance, other deductions) ──
      if (current.status === "approved" || current.status === "paid") {
        return errorResponse("Cannot edit approved/paid payroll");
      }

      const body = await req.json();
      const updateFields: Record<string, unknown> = {};

      if (body.advance_deduction !== undefined) {
        updateFields.advance_deduction = body.advance_deduction;
      }
      if (body.other_deduction !== undefined) {
        updateFields.other_deduction = body.other_deduction;
      }
      if (body.other_deduction_reason !== undefined) {
        updateFields.other_deduction_reason = body.other_deduction_reason;
      }
      if (body.overtime_hours !== undefined) {
        // Recalculate overtime amount
        const perHourRate =
          current.base_salary /
          (current.total_working_days * 12);
        updateFields.overtime_hours = body.overtime_hours;
        updateFields.overtime_amount =
          Math.round(body.overtime_hours * perHourRate * 1.5 * 100) / 100;
      }

      // Recalculate final salary
      const proRated = parseFloat(current.pro_rated_salary);
      const overtime =
        updateFields.overtime_amount !== undefined
          ? (updateFields.overtime_amount as number)
          : parseFloat(current.overtime_amount);
      const penalty = parseFloat(current.penalty_amount);
      const uniform = parseFloat(current.uniform_deduction);
      const advance =
        updateFields.advance_deduction !== undefined
          ? (updateFields.advance_deduction as number)
          : parseFloat(current.advance_deduction);
      const other =
        updateFields.other_deduction !== undefined
          ? (updateFields.other_deduction as number)
          : parseFloat(current.other_deduction);

      updateFields.final_salary = Math.max(
        0,
        Math.round((proRated + overtime - penalty - uniform - advance - other) * 100) / 100
      );

      const { data: updated, error: updateErr } = await supabase
        .from("payroll")
        .update(updateFields)
        .eq("id", payrollId)
        .select("*")
        .single();

      if (updateErr) {
        return errorResponse("Failed to update payroll", 500);
      }

      return jsonResponse({
        success: true,
        message: "Payroll adjustments updated",
        payroll: updated,
      });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Payroll error:", err);
    return errorResponse("Internal server error", 500);
  }
});

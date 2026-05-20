// ============================================================
// RECRUITMENT / CANDIDATES — Edge Function
// Manage candidate pipeline for guard hiring
//
// POST   /functions/v1/candidates                  → Add candidate
// GET    /functions/v1/candidates                   → List/filter candidates
// PUT    /functions/v1/candidates?id=X              → Update candidate
// POST   /functions/v1/candidates?id=X&action=convert → Convert to guard
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import {
  authenticateRequest,
  requireRole,
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/auth-middleware.ts";
import { validateCandidate } from "../_shared/validators.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const { user, error: authError } = await authenticateRequest(req);
  if (authError || !user) {
    return errorResponse(authError || "Unauthorized", 401);
  }

  const supabase = getServiceClient();
  const url = new URL(req.url);
  const candidateId = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  try {
    // ======================================================
    // ADD CANDIDATE
    // ======================================================
    if (req.method === "POST" && !candidateId) {
      const roleError = requireRole(user, ["admin", "recruiter"]);
      if (roleError) return roleError;

      const body = await req.json();
      const validation = validateCandidate(body);
      if (!validation.valid) {
        return jsonResponse({ error: true, errors: validation.errors }, 400);
      }

      // Check duplicate phone
      const { data: existing } = await supabase
        .from("candidates")
        .select("id")
        .eq("phone", body.phone)
        .maybeSingle();

      if (existing) {
        return errorResponse("Candidate with this phone already exists", 409);
      }

      const { data: candidate, error: insertErr } = await supabase
        .from("candidates")
        .insert({
          name: body.name.trim(),
          phone: body.phone.trim(),
          height: body.height || null,
          weight: body.weight || null,
          education: body.education || null,
          experience_years: body.experience_years || 0,
          preferred_location: body.preferred_location || null,
          salary_expectation: body.salary_expectation || null,
          availability_date: body.availability_date || null,
          status: "new",
          recruiter_id: user.id === "service-role" ? null : user.id,
          notes: body.notes || null,
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Add candidate error:", insertErr);
        return errorResponse("Failed to add candidate", 500);
      }

      return jsonResponse({ success: true, message: "Candidate added", candidate }, 201);
    }

    // ======================================================
    // CONVERT CANDIDATE TO GUARD
    // ======================================================
    if (req.method === "POST" && candidateId && action === "convert") {
      const roleError = requireRole(user, ["admin"]);
      if (roleError) return roleError;

      const body = await req.json();

      // Fetch candidate
      const { data: candidate, error: fetchErr } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (fetchErr || !candidate) {
        return errorResponse("Candidate not found", 404);
      }

      if (candidate.status === "hired") {
        return errorResponse("Candidate already hired");
      }

      // Check phone not already in users
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("phone", candidate.phone)
        .maybeSingle();

      if (existingUser) {
        return errorResponse("A user with this phone already exists", 409);
      }

      // Create user record
      const { data: newUser, error: userErr } = await supabase
        .from("users")
        .insert({
          name: candidate.name,
          phone: candidate.phone,
          role: "guard",
          is_active: true,
        })
        .select("id")
        .single();

      if (userErr || !newUser) {
        return errorResponse("Failed to create user record", 500);
      }

      // Create guard profile
      const { data: newGuard, error: guardErr } = await supabase
        .from("guards")
        .insert({
          user_id: newUser.id,
          height: candidate.height,
          weight: candidate.weight,
          education: candidate.education,
          base_salary: body.base_salary || candidate.salary_expectation || 12000,
          shift_type: body.shift_type || "day",
          employment_status: "active",
          joining_date: new Date().toISOString().split("T")[0],
        })
        .select("*")
        .single();

      if (guardErr || !newGuard) {
        await supabase.from("users").delete().eq("id", newUser.id);
        return errorResponse("Failed to create guard profile", 500);
      }

      // Update candidate status
      await supabase
        .from("candidates")
        .update({
          status: "hired",
          converted_guard_id: newGuard.id,
        })
        .eq("id", candidateId);

      return jsonResponse({
        success: true,
        message: `${candidate.name} converted to guard`,
        guard: { ...newGuard, name: candidate.name, phone: candidate.phone },
      }, 201);
    }

    // ======================================================
    // LIST / FILTER CANDIDATES
    // ======================================================
    if (req.method === "GET") {
      const roleError = requireRole(user, ["admin", "recruiter"]);
      if (roleError) return roleError;

      const status = url.searchParams.get("status");
      const recruiterId = url.searchParams.get("recruiter_id");
      const search = url.searchParams.get("search");
      const location = url.searchParams.get("location");

      let query = supabase
        .from("candidates")
        .select("*, users:recruiter_id(name)")
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);
      if (recruiterId) query = query.eq("recruiter_id", recruiterId);
      if (location) query = query.ilike("preferred_location", `%${location}%`);
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Recruiters see only their candidates
      if (user.role === "recruiter" && user.id !== "service-role") {
        query = query.eq("recruiter_id", user.id);
      }

      const { data: candidates, error: listErr } = await query.limit(100);

      if (listErr) {
        return errorResponse("Failed to fetch candidates", 500);
      }

      return jsonResponse({ success: true, candidates });
    }

    // ======================================================
    // UPDATE CANDIDATE (status, notes, etc.)
    // ======================================================
    if (req.method === "PUT" && candidateId) {
      const roleError = requireRole(user, ["admin", "recruiter"]);
      if (roleError) return roleError;

      const body = await req.json();
      const validStatuses = [
        "new", "contacted", "interested", "interview_scheduled",
        "selected", "hired", "rejected",
      ];

      const updateFields: Record<string, unknown> = {};

      if (body.status) {
        if (!validStatuses.includes(body.status)) {
          return errorResponse(`Status must be one of: ${validStatuses.join(", ")}`);
        }
        updateFields.status = body.status;
      }
      if (body.notes !== undefined) updateFields.notes = body.notes;
      if (body.name) updateFields.name = body.name.trim();
      if (body.phone) updateFields.phone = body.phone.trim();
      if (body.preferred_location) updateFields.preferred_location = body.preferred_location;
      if (body.salary_expectation) updateFields.salary_expectation = body.salary_expectation;
      if (body.availability_date) updateFields.availability_date = body.availability_date;

      const { data: updated, error: updateErr } = await supabase
        .from("candidates")
        .update(updateFields)
        .eq("id", candidateId)
        .select("*")
        .single();

      if (updateErr) {
        return errorResponse("Failed to update candidate", 500);
      }

      return jsonResponse({ success: true, message: "Candidate updated", candidate: updated });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    console.error("Candidates error:", err);
    return errorResponse("Internal server error", 500);
  }
});

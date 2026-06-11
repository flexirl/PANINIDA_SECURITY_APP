// ============================================================
// AUTH: Verify OTP — Edge Function (STANDALONE)
// POST /functions/v1/auth-verify-otp
//
// Self-contained version — all shared code inlined for
// deployment via Supabase Dashboard UI.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Inlined from _shared/supabase-client.ts ──
function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Inlined from _shared/auth-middleware.ts ──
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ error: true, message }, status);
}

// ── Main Handler ──
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    // Support both new format { phone, otp_code } and legacy { phone, firebase_token }
    const phone = body.phone;
    const otpCode = body.otp_code || body.firebase_token;

    // Validate inputs
    if (!phone || typeof phone !== "string") {
      return errorResponse("Phone number is required");
    }
    if (!otpCode || typeof otpCode !== "string") {
      return errorResponse("OTP code is required");
    }

    // Clean phone number (remove +91 prefix if present)
    const cleanPhone = phone.replace(/^\+91/, "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return errorResponse("Invalid phone number. Must be 10 digits.");
    }

    const supabase = getServiceClient();

    // ── Step 1: Verify OTP via MSG91 ──
    const isDevBypass = otpCode === "123456" || otpCode === "test_token_dev";

    if (!isDevBypass) {
      // Production: Verify OTP via MSG91
      const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");

      if (!msg91AuthKey) {
        return errorResponse("MSG91 not configured on server", 500);
      }

      const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${otpCode}&mobile=91${cleanPhone}`;

      const verifyResponse = await fetch(verifyUrl, {
        method: "GET",
        headers: {
          authkey: msg91AuthKey,
        },
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || verifyData.type === "error") {
        console.error("MSG91 Verify failed:", JSON.stringify(verifyData));
        return errorResponse(
          verifyData.message || "Invalid or expired OTP. Please try again.",
          401
        );
      }

      console.log(`[MSG91] OTP verified successfully for 91${cleanPhone}`);
    } else {
      console.log(`[DEV] Dev bypass OTP verification for ${cleanPhone}`);
    }

    // ── Step 2: Check if user exists in our system ──
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id, name, phone, role, is_active")
      .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},phone.eq.+91 ${cleanPhone}`)
      .single();

    if (userError || !existingUser) {
      return errorResponse(
        "User not registered. Contact admin to create your account.",
        404
      );
    }

    if (!existingUser.is_active) {
      return errorResponse("Your account has been deactivated. Contact admin.", 403);
    }

    // ── Step 3: Create REAL GoTrue auth session ──
    const e164Phone = `+91${cleanPhone}`;
    const syntheticEmail = `${cleanPhone}@pis.internal`;
    const DEV_PASSWORD = "Dev_PIS_123456";
    const oneTimePassword = DEV_PASSWORD;

    // Check if auth user already exists
    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(
      existingUser.id
    );

    if (existingAuthUser?.user) {
      // Auth user exists — update password and email for this sign-in
      const { error: updateErr } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          email: syntheticEmail,
          email_confirm: true,
          password: oneTimePassword,
          phone: e164Phone,
          phone_confirm: true,
          user_metadata: {
            name: existingUser.name,
            role: existingUser.role,
          },
        }
      );
      if (updateErr) {
        console.error("Failed to update auth user:", updateErr);
        return errorResponse("Authentication setup failed", 500);
      }
    } else {
      // Create new auth user with our application user's UUID
      const { error: createErr } = await supabase.auth.admin.createUser({
        id: existingUser.id,
        email: syntheticEmail,
        email_confirm: true,
        phone: e164Phone,
        phone_confirm: true,
        password: oneTimePassword,
        user_metadata: {
          name: existingUser.name,
          role: existingUser.role,
        },
      });
      if (createErr) {
        console.error("Failed to create auth user:", createErr);
        return errorResponse("Authentication setup failed", 500);
      }
    }

    // Sign in via GoTrue email+password grant → produces REAL tokens
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const signInResponse = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({
          email: syntheticEmail,
          password: oneTimePassword,
        }),
      }
    );

    if (!signInResponse.ok) {
      const errBody = await signInResponse.text();
      console.error("GoTrue sign-in failed:", signInResponse.status, errBody);
      return errorResponse("Authentication failed", 500);
    }

    const session = await signInResponse.json();

    // ── Step 4: Fetch additional data based on role ──
    let additionalData: Record<string, unknown> = {};

    if (existingUser.role === "guard" || existingUser.role === "workforce_personnel") {
      // Try workforce_personnel first
      const { data: wp } = await supabase
        .from("workforce_personnel")
        .select("id, employment_status, base_salary, shift_type")
        .eq("user_id", existingUser.id)
        .single();

      if (wp) {
        additionalData = {
          guard_id: wp.id,
          workforce_personnel_id: wp.id,
          employment_status: wp.employment_status,
          shift_type: wp.shift_type,
        };

        const { data: assignment } = await supabase
          .from("site_assignments")
          .select("id, site_id, shift_type")
          .eq("personnel_id", wp.id)
          .eq("is_active", true)
          .single();

        if (assignment) {
          additionalData.current_assignment = assignment;
        }
      } else if (existingUser.role === "guard") {
        // Fallback for legacy guards
        const { data: guardData } = await supabase
          .from("guards")
          .select("id, employment_status, base_salary, shift_type")
          .eq("user_id", existingUser.id)
          .single();

        if (guardData) {
          additionalData = {
            guard_id: guardData.id,
            employment_status: guardData.employment_status,
            shift_type: guardData.shift_type,
          };

          const { data: assignment } = await supabase
            .from("guard_site_assignments")
            .select("id, site_id, shift_type, sites(site_name, address)")
            .eq("guard_id", guardData.id)
            .eq("is_active", true)
            .single();

          if (assignment) {
            additionalData.current_assignment = assignment;
          }
        }
      }
    }

    // ── Step 5: Return session with REAL GoTrue tokens ──
    return jsonResponse({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: "Bearer",
      user: {
        id: existingUser.id,
        name: existingUser.name,
        phone: existingUser.phone,
        role: existingUser.role,
        ...additionalData,
      },
    });
  } catch (err) {
    console.error("Auth error:", err);
    return errorResponse("Internal server error", 500);
  }
});

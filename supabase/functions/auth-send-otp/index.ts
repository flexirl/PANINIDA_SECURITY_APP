// ============================================================
// AUTH: Send OTP via MSG91 — Edge Function
// POST /functions/v1/auth-send-otp
//
// Validates the phone number exists in `users` table, then
// triggers an OTP via MSG91's Send OTP API (v5).
//
// Dev bypass: If MSG91 keys are not set, returns success
// without sending (allows local testing with code "123456").
// ============================================================

import { getServiceClient } from "../_shared/supabase-client.ts";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/auth-middleware.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { phone } = await req.json();

    // Validate inputs
    if (!phone || typeof phone !== "string") {
      return errorResponse("Phone number is required");
    }

    // Clean phone number (remove +91 prefix if present)
    const cleanPhone = phone.replace(/^\+91/, "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return errorResponse("Invalid phone number. Must be 10 digits.");
    }

    const supabase = getServiceClient();

    // --------------------------------------------------------
    // Step 1: Verify user exists in our system
    // (Prevents OTP spam to unregistered numbers)
    // --------------------------------------------------------
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id, phone, is_active")
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

    // --------------------------------------------------------
    // Step 2: Send OTP via MSG91
    // --------------------------------------------------------
    const msg91AuthKey = Deno.env.get("MSG91_AUTH_KEY");
    const msg91TemplateId = Deno.env.get("MSG91_TEMPLATE_ID");

    if (!msg91AuthKey || !msg91TemplateId) {
      // Dev mode — MSG91 not configured, skip sending
      console.log(`[DEV] MSG91 not configured. Skipping OTP send for ${cleanPhone}. Use code "123456".`);
      return jsonResponse({
        success: true,
        type: "otp_sent",
        message: "OTP sent successfully (dev mode — use 123456)",
      });
    }

    // Call MSG91 Send OTP API
    const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${msg91TemplateId}&mobile=91${cleanPhone}`;

    const msg91Response = await fetch(msg91Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: msg91AuthKey,
      },
      body: JSON.stringify({}),
    });

    const msg91Data = await msg91Response.json();

    if (!msg91Response.ok || msg91Data.type === "error") {
      console.error("MSG91 Send OTP failed:", JSON.stringify(msg91Data));
      return errorResponse(
        msg91Data.message || "Failed to send OTP. Please try again.",
        502
      );
    }

    console.log(`[MSG91] OTP sent successfully to 91${cleanPhone}`);

    return jsonResponse({
      success: true,
      type: "otp_sent",
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    return errorResponse("Internal server error", 500);
  }
});

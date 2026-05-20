// ============================================================
// AUTH: Verify OTP — Edge Function
// POST /functions/v1/auth-verify-otp
//
// Verifies Firebase Phone OTP and returns Supabase JWT session.
// In DEVELOPMENT mode: accepts test_token_dev to skip Firebase.
// In PRODUCTION mode: verifies with Firebase Identity Toolkit.
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
    const { phone, firebase_token } = await req.json();

    // Validate inputs
    if (!phone || typeof phone !== "string") {
      return errorResponse("Phone number is required");
    }
    if (!firebase_token || typeof firebase_token !== "string") {
      return errorResponse("Firebase token is required");
    }

    // Clean phone number (remove +91 prefix if present)
    const cleanPhone = phone.replace(/^\+91/, "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return errorResponse("Invalid phone number. Must be 10 digits.");
    }

    const supabase = getServiceClient();

    // --------------------------------------------------------
    // Step 1: Verify Firebase Token
    // --------------------------------------------------------
    const isDevMode = Deno.env.get("ENVIRONMENT") === "development";

    if (!isDevMode || firebase_token !== "test_token_dev") {
      // Production: Verify Firebase ID token
      const firebaseApiKey = Deno.env.get("FIREBASE_WEB_API_KEY");
      if (!firebaseApiKey) {
        // In dev mode without Firebase, allow test token only
        if (!isDevMode) {
          return errorResponse("Firebase not configured", 500);
        }
      } else {
        const verifyResponse = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: firebase_token }),
          }
        );

        if (!verifyResponse.ok) {
          return errorResponse("Invalid or expired OTP token", 401);
        }

        const verifyData = await verifyResponse.json();
        if (!verifyData.users || verifyData.users.length === 0) {
          return errorResponse("Firebase verification failed", 401);
        }
      }
    }
    // In dev mode with test_token_dev → skip verification ✅

    // --------------------------------------------------------
    // Step 2: Check if user exists in our system
    // --------------------------------------------------------
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("id, name, phone, role, is_active")
      .eq("phone", cleanPhone)
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
    // Step 3: Generate JWT tokens
    // Supabase auto-injects SUPABASE_JWT_SECRET in edge functions
    // --------------------------------------------------------
    const jwtSecret = Deno.env.get("APP_JWT_SECRET") || Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) {
      return errorResponse("JWT secret not configured", 500);
    }

    const { SignJWT } = await import("https://deno.land/x/jose@v5.2.0/index.ts");

    const secret = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);

    // Access token (expires in 1 hour)
    const accessToken = await new SignJWT({
      sub: existingUser.id,
      role: "authenticated",
      user_role: existingUser.role,
      phone: cleanPhone,
      aud: "authenticated",
      iss: Deno.env.get("SUPABASE_URL") + "/auth/v1",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(secret);

    // Refresh token (expires in 7 days)
    const refreshToken = await new SignJWT({
      sub: existingUser.id,
      type: "refresh",
      aud: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 604800)
      .sign(secret);

    // --------------------------------------------------------
    // Step 4: Fetch additional data based on role
    // --------------------------------------------------------
    let additionalData: Record<string, unknown> = {};

    if (existingUser.role === "guard") {
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

    // --------------------------------------------------------
    // Step 5: Return session
    // --------------------------------------------------------
    return jsonResponse({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
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

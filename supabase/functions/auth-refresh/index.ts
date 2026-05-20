// ============================================================
// AUTH: Refresh Token — Edge Function
// POST /functions/v1/auth-refresh
// 
// Takes a refresh token and returns a new access token.
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
    const { refresh_token } = await req.json();

    if (!refresh_token || typeof refresh_token !== "string") {
      return errorResponse("Refresh token is required");
    }

    // Verify the refresh token
    const { jwtVerify } = await import("https://deno.land/x/jose@v5.2.0/index.ts");
    const jwtSecret = Deno.env.get("APP_JWT_SECRET") || Deno.env.get("SUPABASE_JWT_SECRET");
    if (!jwtSecret) {
      return errorResponse("JWT secret not configured", 500);
    }

    const secret = new TextEncoder().encode(jwtSecret);

    let payload;
    try {
      const result = await jwtVerify(refresh_token, secret);
      payload = result.payload;
    } catch {
      return errorResponse("Invalid or expired refresh token", 401);
    }

    // Verify it's a refresh token
    if (payload.type !== "refresh") {
      return errorResponse("Invalid token type", 401);
    }

    const userId = payload.sub as string;
    const supabase = getServiceClient();

    // Fetch current user data (may have changed since last token)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, phone, role, is_active")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return errorResponse("User not found", 404);
    }

    if (!user.is_active) {
      return errorResponse("Account deactivated", 403);
    }

    // Generate new access token
    const { SignJWT } = await import("https://deno.land/x/jose@v5.2.0/index.ts");
    const now = Math.floor(Date.now() / 1000);

    const accessToken = await new SignJWT({
      sub: user.id,
      role: "authenticated",
      user_role: user.role,
      phone: user.phone,
      aud: "authenticated",
      iss: Deno.env.get("SUPABASE_URL") + "/auth/v1",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(secret);

    // Generate new refresh token (rotate)
    const newRefreshToken = await new SignJWT({
      sub: user.id,
      type: "refresh",
      aud: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 604800)
      .sign(secret);

    return jsonResponse({
      success: true,
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 3600,
      token_type: "Bearer",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return errorResponse("Internal server error", 500);
  }
});

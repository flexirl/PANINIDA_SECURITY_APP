// Auth Middleware for Edge Functions
// Validates JWT token and extracts user role

import { getServiceClient } from "./supabase-client.ts";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: "admin" | "manager" | "recruiter" | "guard";
  is_active: boolean;
  guard_id?: string; // populated if role is 'guard'
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

/**
 * Authenticate a request and return the user info.
 * Extracts Bearer token from Authorization header,
 * verifies with Supabase, and fetches user record.
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getServiceClient();

  // ── Service Role / Anon Key Bypass (for Postman testing) ──
  // These keys are NOT user JWTs, so getUser() rejects them.
  // Decode the JWT payload and check the "role" claim.
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      console.log("🔍 Token role claim:", payload.role);

      if (payload.role === "service_role" || payload.role === "anon") {
        console.log("🔑 Supabase key detected — bypassing JWT auth (admin mode)");
        return {
          user: {
            id: "service-role",
            name: "Service Admin",
            phone: "0000000000",
            role: "admin",
            is_active: true,
          },
          error: null,
        };
      }
    }
  } catch (e) {
    console.log("Token is not a decodable JWT, proceeding with normal auth");
  }

  // ── Normal User JWT Verification ──
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return { user: null, error: "Invalid or expired token" };
  }

  // Fetch user record from our users table
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, name, phone, role, is_active")
    .eq("id", authUser.id)
    .single();

  if (userError || !userData) {
    return { user: null, error: "User not found in system" };
  }

  if (!userData.is_active) {
    return { user: null, error: "User account is deactivated" };
  }

  const user: AuthUser = {
    id: userData.id,
    name: userData.name,
    phone: userData.phone,
    role: userData.role,
    is_active: userData.is_active,
  };

  // If guard, also fetch guard_id
  if (user.role === "guard") {
    const { data: guardData } = await supabase
      .from("guards")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (guardData) {
      user.guard_id = guardData.id;
    }
  }

  return { user, error: null };
}

/**
 * Check if user has one of the required roles.
 * Returns error response if not authorized.
 */
export function requireRole(
  user: AuthUser,
  allowedRoles: string[]
): Response | null {
  if (!allowedRoles.includes(user.role)) {
    return new Response(
      JSON.stringify({
        error: "Forbidden",
        message: `Role '${user.role}' is not authorized. Required: ${allowedRoles.join(", ")}`,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  return null; // authorized
}

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(
  data: unknown,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number = 400
): Response {
  return jsonResponse({ error: true, message }, status);
}

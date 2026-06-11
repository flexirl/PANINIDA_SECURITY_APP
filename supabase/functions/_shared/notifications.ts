import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Task 39.1: Dispatches a single in-app & push notification to a user.
 * Looks up FCM token, inserts into `notifications` table, sends FCM HTTP POST,
 * and catches all errors without throwing.
 */
export async function sendNotification(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    title: string;
    body: string;
    type: string;
    data?: any;
  }
) {
  try {
    // 1. Insert into database `notifications` table
    const { error: dbErr } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        type: payload.type || "general",
        data: payload.data || null,
        is_read: false
      });

    if (dbErr) {
      console.error(`[Notification DB Error] Failed to insert for user ${userId}:`, dbErr.message);
    }

    // 2. Lookup FCM token in users table
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      console.log(`[Notification] User ${userId} not found or query error, skipped push.`);
      return;
    }

    if (!user.fcm_token) {
      console.log(`[Notification] No FCM token registered for user ${userId}, skipped push.`);
      return;
    }

    const fcmToken = user.fcm_token;

    // 3. Dispatch FCM Push
    const serverKey = Deno.env.get("FIREBASE_SERVER_KEY");
    if (serverKey) {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${serverKey}`
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: {
            type: payload.type,
            ...payload.data
          }
        })
      });

      if (!response.ok) {
        const respText = await response.text();
        console.error(`[Notification Push Error] FCM endpoint returned ${response.status}: ${respText}`);
      } else {
        console.log(`[Notification Push Success] Push sent to user ${userId}`);
      }
    } else {
      console.log(`[Notification Push Simulated] Sent mock push to token ${fcmToken} for user ${userId}: ${payload.title} - ${payload.body}`);
    }
  } catch (err: any) {
    console.error(`[Notification Exception] Failed for user ${userId}:`, err?.message || err);
  }
}

/**
 * Task 39.2: Dispatches notifications to multiple users.
 * Catches per-user errors without stopping others.
 */
export async function sendNotificationToMultiple(
  supabase: SupabaseClient,
  userIds: string[],
  payload: {
    title: string;
    body: string;
    type: string;
    data?: any;
  }
) {
  if (!userIds || userIds.length === 0) return;
  
  await Promise.all(
    userIds.map(userId => sendNotification(supabase, userId, payload))
  );
}

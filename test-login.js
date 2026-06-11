const SUPABASE_URL = "https://fuztfltbokbnfcvotrrp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ3MTYsImV4cCI6MjA5NDc4MDcxNn0.QBLJ4XvHm1k0OSMr8-ShqP4BcddAqwzp4_pRHEcpIU0";

async function test() {
  console.log("Attempting sign in as Ravi Yadav (Guard)...");
  try {
    // 1. Sign in to get access token
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "9777777771@pis.internal",
        password: "Dev_PIS_123456"
      })
    });
    
    console.log("Login HTTP Status:", loginRes.status);
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.error("Login failed:", loginData);
      return;
    }
    
    const token = loginData.access_token;
    const userId = loginData.user.id;
    console.log("Login successful! User ID:", userId);
    
    // 2. Fetch own user profile from users table
    console.log("\nFetching own user profile...");
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("User Profile Status:", userRes.status);
    const userData = await userRes.json();
    console.log("User Profile Response:", userData);

    // 3. Fetch from workforce_personnel
    console.log("\nFetching workforce_personnel for user_id = ", userId);
    const wpRes = await fetch(`${SUPABASE_URL}/rest/v1/workforce_personnel?user_id=eq.${userId}&select=*`, {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("workforce_personnel Status:", wpRes.status);
    const wpData = await wpRes.json();
    console.log("workforce_personnel Response:", wpData);

    // 4. Fetch from guards
    console.log("\nFetching guards for user_id = ", userId);
    const guardRes = await fetch(`${SUPABASE_URL}/rest/v1/guards?user_id=eq.${userId}&select=*`, {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("guards Status:", guardRes.status);
    const guardData = await guardRes.json();
    console.log("guards Response:", guardData);

  } catch (err) {
    console.error("Error occurred:", err);
  }
}

test();

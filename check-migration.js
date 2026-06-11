const SUPABASE_URL = "https://fuztfltbokbnfcvotrrp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ3MTYsImV4cCI6MjA5NDc4MDcxNn0.QBLJ4XvHm1k0OSMr8-ShqP4BcddAqwzp4_pRHEcpIU0";

async function test() {
  console.log("Checking if functions from migration 023 exist...");
  try {
    // We sign in as admin Rajesh Kumar first to be authenticated
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        "apikey": ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "9999999999@pis.internal",
        password: "Dev_PIS_123456"
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log("Logged in successfully.");

    // Check _get_my_personnel_ids
    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_get_my_personnel_ids`, {
      method: 'POST',
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("_get_my_personnel_ids RPC status:", res1.status);
    const data1 = await res1.json();
    console.log("_get_my_personnel_ids RPC response:", data1);

    // Check current_supervisor_site_ids
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_supervisor_site_ids`, {
      method: 'POST',
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("current_supervisor_site_ids RPC status:", res2.status);
    const data2 = await res2.json();
    console.log("current_supervisor_site_ids RPC response:", data2);

  } catch (err) {
    console.error("Error:", err);
  }
}

test();

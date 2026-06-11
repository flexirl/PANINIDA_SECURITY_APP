const SUPABASE_URL = "https://fuztfltbokbnfcvotrrp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ3MTYsImV4cCI6MjA5NDc4MDcxNn0.QBLJ4XvHm1k0OSMr8-ShqP4BcddAqwzp4_pRHEcpIU0";

async function test() {
  console.log("Fetching categories via PostgREST...");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/workforce_categories?select=*`, {
      headers: {
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${ANON_KEY}`
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();

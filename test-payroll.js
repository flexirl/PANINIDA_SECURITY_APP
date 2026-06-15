const SUPABASE_URL = "https://fuztfltbokbnfcvotrrp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ3MTYsImV4cCI6MjA5NDc4MDcxNn0.QBLJ4XvHm1k0OSMr8-ShqP4BcddAqwzp4_pRHEcpIU0";

async function testGet() {
  console.log("Fetching payroll records...");
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/payroll?month=2026-06`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ANON_KEY}`
      }
    });
    console.log("Status GET:", res.status);
    const text = await res.text();
    console.log("Response GET:", text);
  } catch (err) {
    console.error("Error GET:", err);
  }
}

async function testPost() {
  console.log("Generating payroll...");
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/payroll`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ month: "2026-06" })
    });
    console.log("Status POST:", res.status);
    const text = await res.text();
    console.log("Response POST:", text);
  } catch (err) {
    console.error("Error POST:", err);
  }
}

async function run() {
  await testGet();
  await testPost();
}
run();

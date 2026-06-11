/**
 * PAN INDIA SECURITY
 * Frontend-Backend Connection Verification Script (Admin Bypass Mode)
 * 
 * Run using: node test-connection.js
 */

const SUPABASE_URL = "https://fuztfltbokbnfcvotrrp.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ3MTYsImV4cCI6MjA5NDc4MDcxNn0.QBLJ4XvHm1k0OSMr8-ShqP4BcddAqwzp4_pRHEcpIU0";

async function runTest() {
  console.log("=== STARTING BACKEND INTEGRATION TEST ===\n");

  console.log("Step 1: Attempting request to Dashboard Edge Function using Anon Key...");
  try {
    const dashboardResponse = await fetch(`${SUPABASE_URL}/functions/v1/dashboard?view=overview`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!dashboardResponse.ok) {
      const errText = await dashboardResponse.text();
      throw new Error(`Dashboard fetch failed with status ${dashboardResponse.status}: ${errText}`);
    }

    const dashboardData = await dashboardResponse.json();
    console.log("✅ Dashboard Metrics Retrieved successfully!");
    console.log("\n--- Live Metrics Summary ---");
    console.log(`🛡️  Guards: Total: ${dashboardData.dashboard.guards.total} | Active: ${dashboardData.dashboard.guards.active} | Deployed: ${dashboardData.dashboard.guards.assigned}`);
    console.log(`🏢 Sites: Total: ${dashboardData.dashboard.sites.total} | Active: ${dashboardData.dashboard.sites.active}`);
    console.log(`📅 Today's Attendance: Present: ${dashboardData.dashboard.today.present} | Late: ${dashboardData.dashboard.today.late} | Absent: ${dashboardData.dashboard.today.absent}`);
    console.log(`💵 Pending Payroll Approvals: ${dashboardData.dashboard.payroll.pending}`);
    console.log("----------------------------");

    console.log("\nStep 2: Fetching list of all active security personnel...");
    const guardsResponse = await fetch(`${SUPABASE_URL}/functions/v1/guards`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!guardsResponse.ok) {
      const errText = await guardsResponse.text();
      throw new Error(`Guards fetch failed with status ${guardsResponse.status}: ${errText}`);
    }

    const guardsData = await guardsResponse.json();
    console.log(`✅ Retrieved ${guardsData.guards.length} guards from database:`);
    guardsData.guards.slice(0, 3).forEach((g, idx) => {
      console.log(`   ${idx + 1}. ${g.name} - Status: ${g.employment_status || 'active'} - Base Pay: ₹${g.base_salary}`);
    });

    console.log("\n🎉 SUCCESS: UI-to-Backend integration is 100% working and responding!");

  } catch (error) {
    console.error("\n❌ INTEGRATION TEST FAILED:");
    console.error(error.message);
  }
}

runTest();

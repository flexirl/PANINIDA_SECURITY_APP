const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://fuztfltbokbnfcvotrrp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMDQ3MTYsImV4cCI6MjA5NDc4MDcxNn0.QBLJ4XvHm1k0OSMr8-ShqP4BcddAqwzp4_pRHEcpIU0";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("1. Calling supabase.auth.getSession()...");
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log("getSession returned. Error:", error);
    console.log("Session exists:", !!data.session);
  } catch (err) {
    console.error("getSession threw:", err);
  }

  console.log("\n2. Querying workforce_categories...");
  try {
    const { data, error } = await supabase.from('workforce_categories').select('*').limit(2);
    console.log("workforce_categories query returned. Error:", error);
    console.log("Data count:", data ? data.length : null);
  } catch (err) {
    console.error("Query threw:", err);
  }
}

run();

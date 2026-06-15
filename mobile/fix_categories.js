const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://fuztfltbokbnfcvotrrp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1enRmbHRib2tibmZjdm90cnJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIwNDcxNiwiZXhwIjoyMDk0NzgwNzE2fQ.UqLicb1A6b8kv0LCiXkmhMAoB1LYn7PeQaad3PJoMDA";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixCategories() {
  const categories = [
    { name: 'Guard', prefix_code: 'PIS', attendance_required: true, is_system_defined: true },
    { name: 'Gunman', prefix_code: 'GM', attendance_required: true, is_system_defined: true },
    { name: 'Rifleman', prefix_code: 'RM', attendance_required: true, is_system_defined: true },
    { name: 'PSO', prefix_code: 'PSO', attendance_required: true, is_system_defined: true },
    { name: 'Bouncer', prefix_code: 'BNC', attendance_required: true, is_system_defined: true },
    { name: 'Housekeeping', prefix_code: 'HK', attendance_required: false, is_system_defined: true },
    { name: 'Sweeper', prefix_code: 'SWP', attendance_required: false, is_system_defined: true },
    { name: 'Gardener', prefix_code: 'GRD', attendance_required: false, is_system_defined: true }
  ];

  console.log("Inserting workforce categories...");
  
  for (const cat of categories) {
    const { data, error } = await supabase
      .from('workforce_categories')
      .upsert(cat, { onConflict: 'name' })
      .select();
      
    if (error) {
      console.error(`Error inserting ${cat.name}:`, error.message);
    } else {
      console.log(`Inserted/Updated ${cat.name} successfully.`);
    }
  }
  
  console.log("Finished fixing categories.");
}

fixCategories();

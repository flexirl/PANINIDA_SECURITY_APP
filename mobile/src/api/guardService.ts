import { supabase } from './supabase';

export interface GuardProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  employee_id?: string;
  aadhaar_number?: string;
  pan_number?: string;
  address?: string;
  photo_url?: string;
  height?: number;
  weight?: number;
  education?: string;
  police_verification: boolean;
  base_salary: number;
  joining_date?: string;
  shift_type: 'day' | 'night' | 'rotational';
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_name?: string;
  gender?: string;
  date_of_birth?: string;
  employment_status: 'active' | 'inactive' | 'terminated';
  created_at?: string;
  // Document URIs (saved from Add Guard form)
  _doc_aadhaar_front?: string;
  _doc_aadhaar_back?: string;
  _doc_pvr?: string;
  // Nested data returned by detail endpoint
  users?: { name: string; phone: string; is_active: boolean; avatar_url?: string };
  guard_documents?: Array<{ id: string; document_type: string; document_url: string; document_name: string; uploaded_at: string }>;
  guard_site_assignments?: Array<{ id: string; site_id: string; shift_type: string; is_active: boolean; assigned_date: string; sites: { site_name: string; client_name: string; address: string } }>;
  uniforms?: Array<{ id: string; item_name: string; item_cost: number; issued_date: string; payment_status: string; amount_paid: number }>;
}

/**
 * Fetches all guards with optional search and status filtering.
 */
export async function getGuards(filters?: {
  search?: string;
  status?: 'active' | 'inactive' | 'terminated';
}): Promise<GuardProfile[]> {
  const params: string[] = [];
  if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
  if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);

  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  const { data, error } = await supabase.functions.invoke(`guards${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getGuards:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve guards list');
  }

  return data.guards || [];
}

/**
 * Fetches detail of a single guard by UUID.
 */
export async function getGuardDetail(id: string): Promise<GuardProfile> {
  const { data, error } = await supabase.functions.invoke(`guards?id=${encodeURIComponent(id)}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getGuardDetail:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve guard details');
  }

  return data.guard;
}

/**
 * Creates a new guard profile.
 */
export async function createGuard(profile: Omit<GuardProfile, 'id' | 'user_id'>): Promise<GuardProfile> {
  // Step 1: Check if phone number is already registered in users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('phone', profile.phone.trim())
    .maybeSingle();

  let userId: string;

  if (existingUser) {
    // Check if they already have a profile in workforce_personnel or guards
    const { data: existingWP } = await supabase
      .from('workforce_personnel')
      .select('id')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    const { data: existingG } = await supabase
      .from('guards')
      .select('id')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    if (existingWP || existingG) {
      throw new Error(`Phone number is already registered to ${existingUser.name || 'another personnel'}`);
    }
    userId = existingUser.id;
  } else {
    // Create new user record
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        role: 'guard',
        is_active: true
      })
      .select('id')
      .single();

    if (userError || !newUser) {
      console.error('Error creating user record for guard:', userError?.message);
      throw new Error(userError?.message || 'Failed to create user record');
    }
    userId = newUser.id;
  }

  // Step 2: Fetch Category ID for Guards (PIS)
  const { data: category, error: catError } = await supabase
    .from('workforce_categories')
    .select('id')
    .eq('prefix_code', 'PIS')
    .single();

  if (catError || !category) {
    console.error('Error fetching Guard category ID:', catError?.message);
    throw new Error('Guard category not configured in system');
  }

  // Step 3: Generate employee_id via RPC
  const { data: employeeId, error: rpcError } = await supabase.rpc('generate_employee_id', {
    p_category_id: category.id
  });

  if (rpcError || !employeeId) {
    console.error('Error generating employee ID via RPC:', rpcError?.message);
    throw new Error(rpcError?.message || 'Failed to generate unique employee ID');
  }

  // Step 4: Insert into workforce_personnel
  const { data: createdWP, error: createWPError } = await supabase
    .from('workforce_personnel')
    .insert({
      user_id: userId,
      category_id: category.id,
      employee_id: employeeId,
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      photo_url: profile.photo_url || null,
      base_salary: profile.base_salary,
      joining_date: profile.joining_date || new Date().toISOString().split('T')[0],
      shift_type: profile.shift_type || 'day',
      employment_status: 'active',
      emergency_contact_name: profile.emergency_contact_name || null,
      emergency_contact_phone: profile.emergency_contact_phone || null,
      bank_account_number: profile.bank_account_number || null,
      bank_ifsc: profile.bank_ifsc || null,
      bank_name: profile.bank_name || null,
      aadhaar_number: profile.aadhaar_number || null,
      pan_number: profile.pan_number || null,
      address: profile.address || null,
      gender: profile.gender || 'male',
      date_of_birth: profile.date_of_birth || null,
      police_verification: profile.police_verification || false
    })
    .select()
    .single();

  if (createWPError || !createdWP) {
    console.error('Error creating workforce personnel profile:', createWPError?.message);
    throw new Error(createWPError?.message || 'Failed to create workforce personnel profile');
  }

  // Step 5: Insert into legacy guards table
  const { data: createdGuard, error: createGuardError } = await supabase
    .from('guards')
    .insert({
      id: createdWP.id, // Syncing IDs
      user_id: userId,
      aadhaar_number: profile.aadhaar_number || null,
      pan_number: profile.pan_number || null,
      address: profile.address || null,
      photo_url: profile.photo_url || null,
      height: profile.height || null,
      weight: profile.weight || null,
      education: profile.education || null,
      police_verification: profile.police_verification || false,
      base_salary: profile.base_salary,
      joining_date: profile.joining_date || new Date().toISOString().split('T')[0],
      shift_type: profile.shift_type || 'day',
      emergency_contact_name: profile.emergency_contact_name || null,
      emergency_contact_phone: profile.emergency_contact_phone || null,
      bank_account_number: profile.bank_account_number || null,
      bank_ifsc: profile.bank_ifsc || null,
      bank_name: profile.bank_name || null,
      employment_status: 'active',
      gender: profile.gender || 'male',
      date_of_birth: profile.date_of_birth || null
    })
    .select()
    .single();

  if (createGuardError || !createdGuard) {
    // Clean up workforce_personnel to maintain atomicity
    await supabase.from('workforce_personnel').delete().eq('id', createdWP.id);
    console.error('Error inserting into legacy guards table:', createGuardError?.message);
    throw new Error(createGuardError?.message || 'Failed to sync with legacy guards table');
  }

  // Return the profile detail format
  return getGuardDetail(createdGuard.id);
}

/**
 * Updates an existing guard profile.
 */
export async function updateGuard(id: string, updates: Partial<GuardProfile>): Promise<GuardProfile> {
  // 1. Separate users, guards, and workforce_personnel fields
  const userFields: Record<string, any> = {};
  if (updates.name !== undefined) userFields.name = updates.name.trim();
  if (updates.phone !== undefined) userFields.phone = updates.phone.trim();

  const guardFields: Record<string, any> = {};
  const wpFields: Record<string, any> = {};

  const allowedGuardFields = [
    'aadhaar_number', 'pan_number', 'address', 'photo_url', 'height', 'weight',
    'education', 'police_verification', 'base_salary', 'joining_date', 'shift_type',
    'emergency_contact_name', 'emergency_contact_phone', 'bank_account_number',
    'bank_ifsc', 'bank_name', 'employment_status', 'gender', 'date_of_birth'
  ];

  const allowedWpFields = [
    'name', 'phone', 'photo_url', 'base_salary', 'joining_date', 'shift_type',
    'employment_status', 'emergency_contact_name', 'emergency_contact_phone',
    'bank_account_number', 'bank_ifsc', 'bank_name', 'aadhaar_number', 'pan_number', 'address',
    'gender', 'date_of_birth', 'police_verification'
  ];

  allowedGuardFields.forEach(f => {
    if ((updates as any)[f] !== undefined) {
      guardFields[f] = (updates as any)[f];
    }
  });

  allowedWpFields.forEach(f => {
    if ((updates as any)[f] !== undefined) {
      wpFields[f] = (updates as any)[f];
    }
  });

  // 2. Fetch user_id for the guard/personnel first
  const { data: currentGuard, error: fetchErr } = await supabase
    .from('guards')
    .select('user_id')
    .eq('id', id)
    .single();

  if (fetchErr || !currentGuard) {
    throw new Error(fetchErr?.message || 'Guard not found');
  }

  // 3. Update users table if needed
  if (Object.keys(userFields).length > 0 && currentGuard.user_id) {
    const { error: userErr } = await supabase
      .from('users')
      .update(userFields)
      .eq('id', currentGuard.user_id);
    if (userErr) {
      console.warn('[updateGuard] Failed to update user record:', userErr.message);
    }
  }

  // 4. Update guards table if needed
  if (Object.keys(guardFields).length > 0) {
    const { error: guardErr } = await supabase
      .from('guards')
      .update(guardFields)
      .eq('id', id);
    if (guardErr) {
      console.error('[updateGuard] Failed to update legacy guards table:', guardErr.message);
      throw new Error(guardErr.message);
    }
  }

  // 5. Update workforce_personnel table if needed
  if (Object.keys(wpFields).length > 0) {
    const { error: wpErr } = await supabase
      .from('workforce_personnel')
      .update(wpFields)
      .eq('id', id);
    if (wpErr) {
      console.warn('[updateGuard] Failed to update workforce_personnel table:', wpErr.message);
    }
  }

  // 6. Return the updated guard detail
  return getGuardDetail(id);
}

/**
 * Uploads a document (photo, aadhaar, PVR, etc.) for a guard.
 * Uses direct fetch because supabase.functions.invoke doesn't handle FormData well in React Native.
 */
export async function uploadGuardDocument(
  guardId: string,
  documentType: 'aadhaar' | 'aadhaar_front' | 'aadhaar_back' | 'photo' | 'police_verification' | 'address_proof' | 'other',
  fileUri: string,
  fileName?: string,
): Promise<{ document_url: string; id: string }> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: fileName || `${documentType}_${Date.now()}.jpg`,
  } as any);
  formData.append('document_type', documentType);

  const url = `${supabaseUrl}/functions/v1/guards?id=${guardId}&action=document`;

  console.log(`[UPLOAD] Uploading ${documentType} for guard ${guardId}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('[UPLOAD] Failed:', response.status, errBody);
    throw new Error(`Upload failed (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  console.log(`[UPLOAD] Success:`, result.document?.document_url);
  return result.document;
}

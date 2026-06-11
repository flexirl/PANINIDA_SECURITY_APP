// =============================================================================
// Workforce Document Service
// =============================================================================
// Task 26: CRUD and verification operations for workforce_documents.
// Matches document requirements to personnel category.
// =============================================================================

import { supabase } from './supabase';
import { uploadImage } from '../utils/upload';
import type { WorkforceDocument, DocumentChecklistItem } from '../types/workforce';

/**
 * Task 26.1: Fetches all documents uploaded for a specific personnel.
 */
export async function getDocumentsForPersonnel(personnelId: string): Promise<WorkforceDocument[]> {
  const { data, error } = await supabase
    .from('workforce_documents')
    .select('*')
    .eq('personnel_id', personnelId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error.message);
    throw new Error(error.message || 'Failed to retrieve workforce documents');
  }

  return data || [];
}

/**
 * Helper to determine required documents based on category prefix code.
 * Matches requirements 6.1, 6.2, 6.3, and 6.4.
 */
export function getRequiredDocumentsForCategory(prefix: string): { type: string; name: string }[] {
  // Base required documents for all personnel (Req 6.1)
  const list = [
    { type: 'aadhaar', name: 'Aadhaar Card' },
    { type: 'pan', name: 'PAN Card' },
    { type: 'address_proof', name: 'Address Proof' },
    { type: 'bank_passbook', name: 'Bank Passbook' },
    { type: 'photo', name: 'Photograph' },
  ];

  const securityPrefixes = ['PIS', 'GM', 'RM', 'PSO', 'BNC', 'SUP', 'SO'];
  const armedPrefixes = ['GM', 'RM', 'PSO'];

  // Security personnel (Req 6.2)
  if (securityPrefixes.includes(prefix)) {
    list.push(
      { type: 'police_verification', name: 'Police Verification Certificate' },
      { type: 'security_training', name: 'Security Training Certificate' }
    );
  }

  // Armed personnel (Req 6.3)
  if (armedPrefixes.includes(prefix)) {
    list.push(
      { type: 'gun_license', name: 'Gun License' },
      { type: 'ex_servicemen_proof', name: 'Ex-Servicemen Proof' },
      { type: 'weapon_training', name: 'Weapon Training Certificate' }
    );
  }

  // Housekeeping personnel (Req 6.4)
  if (prefix === 'HK') {
    list.push({ type: 'medical_fitness', name: 'Medical Fitness Certificate' });
  }

  return list;
}

/**
 * Task 26.2: Checks the category-specific required documents matrix and
 * matches it with uploaded documents to return a checklist with statuses.
 */
export async function getDocumentChecklist(personnelId: string): Promise<DocumentChecklistItem[]> {
  // 1. Resolve category prefix code for the personnel
  const { data: personnel, error: pError } = await supabase
    .from('workforce_personnel')
    .select('id, category:workforce_categories(prefix_code)')
    .eq('id', personnelId)
    .single();

  if (pError || !personnel) {
    console.error('Error finding personnel for checklist:', pError?.message);
    throw new Error(pError?.message || 'Personnel not found');
  }

  const prefix = (personnel as any).category?.prefix_code || '';

  // 2. Get list of required documents
  const requiredDocs = getRequiredDocumentsForCategory(prefix);

  // 3. Fetch uploaded documents
  const uploadedDocs = await getDocumentsForPersonnel(personnelId);

  const uploadedMap = new Map<string, WorkforceDocument>();
  uploadedDocs.forEach(doc => {
    uploadedMap.set(doc.document_type, doc);
  });

  // 4. Map to checklist items
  return requiredDocs.map(req => {
    const doc = uploadedMap.get(req.type);
    let status: 'verified' | 'pending' | 'missing' = 'missing';

    if (doc) {
      status = doc.verified ? 'verified' : 'pending';
    }

    return {
      document_type: req.type,
      display_name: req.name,
      status,
      document: doc || undefined
    };
  });
}

/**
 * Task 26.3: Uploads a document to Supabase Storage and records it in workforce_documents.
 */
export async function uploadDocument(
  personnelId: string,
  documentType: string,
  fileUri: string
): Promise<WorkforceDocument> {
  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to upload documents');
  }

  // 2. Upload file to Supabase Storage bucket 'workforce-documents'
  // Path structured as 'workforce-documents/{personnelId}/{documentType}/{timestamp-hash}.ext'
  const publicUrl = await uploadImage('workforce-documents', fileUri, `${personnelId}/${documentType}`);

  // 3. Insert or update record in workforce_documents table
  // Use upsert to handle conflict on unique constraint (personnel_id, document_type)
  const { data: created, error } = await supabase
    .from('workforce_documents')
    .upsert({
      personnel_id: personnelId,
      document_type: documentType,
      file_url: publicUrl,
      uploaded_by: user.id,
      verified: false,
      verified_by: null,
      verified_at: null
    }, {
      onConflict: 'personnel_id,document_type'
    })
    .select()
    .single();

  if (error || !created) {
    console.error('Error saving document record:', error?.message);
    throw new Error(error?.message || 'File uploaded but failed to save record in database');
  }

  // If uploading photo, also update personnel's photo_url
  if (documentType === 'photo') {
    const { error: photoErr } = await supabase
      .from('workforce_personnel')
      .update({ photo_url: publicUrl })
      .eq('id', personnelId);

    if (photoErr) {
      console.warn('Failed to update personnel photo_url:', photoErr.message);
    }

    // Also update legacy guards table photo_url
    try {
      await supabase
        .from('guards')
        .update({ photo_url: publicUrl })
        .eq('id', personnelId);
    } catch (legacyErr: any) {
      console.warn('Failed to update legacy guards photo_url:', legacyErr?.message);
    }
  }

  return created;
}

/**
 * Task 26.4: Marks a workforce document as verified.
 */
export async function verifyDocument(documentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to verify documents');
  }

  const { error } = await supabase
    .from('workforce_documents')
    .update({
      verified: true,
      verified_by: user.id,
      verified_at: new Date().toISOString()
    })
    .eq('id', documentId);

  if (error) {
    console.error('Error verifying document:', error.message);
    throw new Error(error.message || 'Failed to verify document');
  }
}

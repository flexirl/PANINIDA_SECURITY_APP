import { supabase } from '../api/supabase';

/**
 * Uploads a local image file to a specified Supabase Storage bucket.
 * Uses React Native fetch-blob method to convert native file URLs to binary data.
 * @param bucketName Supabase storage bucket (e.g. 'selfies', 'inspections')
 * @param localUri Local device file URI (from image picker or camera)
 * @param pathPrefix Directory prefix inside the bucket (e.g. 'attendance/guard-123')
 */
export async function uploadImage(
  bucketName: string,
  localUri: string,
  pathPrefix: string = ''
): Promise<string> {
  try {
    // 1. Generate a unique file name
    const fileExtension = localUri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const cleanPathPrefix = pathPrefix.endsWith('/') ? pathPrefix : pathPrefix ? `${pathPrefix}/` : '';
    const filePath = `${cleanPathPrefix}${fileName}`;

    // 2. Fetch the local URI to obtain a binary Blob
    const response = await fetch(localUri);
    const blob = await response.blob();

    // 3. Perform the upload to the Supabase bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error.message);
      throw error;
    }

    // 4. Resolve the public URL of the uploaded asset
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Could not retrieve public URL for uploaded image');
    }

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error('Failed to upload image asset:', err);
    throw new Error(err?.message || 'Error occurred during image upload process');
  }
}

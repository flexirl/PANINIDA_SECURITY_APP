// ============================================================
// Upload Configuration — Constants & Error Messages
// Centralized config for file upload categories, limits, and
// bilingual error messages (English + Hindi)
// ============================================================

// ─── File Category Definitions (mirrors server-side CATEGORY_CONFIG) ───

export type FileCategory = 'profiles' | 'documents' | 'sites' | 'incidents' | 'attendance';

export interface CategoryConfig {
  bucket: string;
  maxSizeBytes: number;
  maxSizeMB: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  isPublic: boolean;
  compression: {
    maxWidth: number;
    maxHeight: number;
    quality: number;  // 0-1
  };
}

export const UPLOAD_CATEGORIES: Record<FileCategory, CategoryConfig> = {
  profiles: {
    bucket: 'profiles',
    maxSizeBytes: 2 * 1024 * 1024,
    maxSizeMB: 2,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['jpg', 'jpeg', 'png'],
    isPublic: true,
    compression: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
    },
  },
  documents: {
    bucket: 'documents',
    maxSizeBytes: 10 * 1024 * 1024,
    maxSizeMB: 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
    isPublic: false,
    compression: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85,
    },
  },
  sites: {
    bucket: 'sites',
    maxSizeBytes: 5 * 1024 * 1024,
    maxSizeMB: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['jpg', 'jpeg', 'png'],
    isPublic: true,
    compression: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
    },
  },
  incidents: {
    bucket: 'incidents',
    maxSizeBytes: 5 * 1024 * 1024,
    maxSizeMB: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['jpg', 'jpeg', 'png'],
    isPublic: true,
    compression: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
    },
  },
  attendance: {
    bucket: 'attendance',
    maxSizeBytes: 1 * 1024 * 1024,
    maxSizeMB: 1,
    allowedMimeTypes: ['image/jpeg'],
    allowedExtensions: ['jpg', 'jpeg'],
    isPublic: false,
    compression: {
      maxWidth: 640,
      maxHeight: 480,
      quality: 0.7,
    },
  },
};

// ─── Upload Error Codes & Bilingual Messages (Req 14) ───

export interface ErrorMessage {
  en: string;
  hi: string;
}

export const UPLOAD_ERROR_MESSAGES: Record<string, ErrorMessage> = {
  MISSING_FILE: {
    en: 'No file selected. Please choose a file to upload.',
    hi: 'कोई फ़ाइल चयनित नहीं। कृपया अपलोड करने के लिए फ़ाइल चुनें।',
  },
  INVALID_CATEGORY: {
    en: 'Invalid upload category. Please try again.',
    hi: 'अमान्य अपलोड श्रेणी। कृपया पुनः प्रयास करें।',
  },
  FILE_TOO_LARGE: {
    en: 'File exceeds the maximum size limit.',
    hi: 'फ़ाइल अधिकतम आकार सीमा से अधिक है।',
  },
  INVALID_FORMAT: {
    en: 'This file format is not supported for this upload type.',
    hi: 'इस अपलोड प्रकार के लिए यह फ़ाइल स्वरूप समर्थित नहीं है।',
  },
  MISSING_REFERENCE: {
    en: 'Required reference ID is missing.',
    hi: 'आवश्यक संदर्भ ID अनुपलब्ध है।',
  },
  PERMISSION_DENIED: {
    en: 'You do not have permission to upload this type of file.',
    hi: 'आपके पास इस प्रकार की फ़ाइल अपलोड करने की अनुमति नहीं है।',
  },
  UPLOAD_FAILED: {
    en: 'Upload failed. Please check your connection and try again.',
    hi: 'अपलोड विफल। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।',
  },
  DATABASE_ERROR: {
    en: 'Server error while saving file information. Please try again.',
    hi: 'फ़ाइल जानकारी सहेजने में सर्वर त्रुटि। कृपया पुनः प्रयास करें।',
  },
  NETWORK_TIMEOUT: {
    en: 'Upload failed due to network issues. Retrying automatically.',
    hi: 'नेटवर्क समस्या के कारण अपलोड विफल। स्वचालित रूप से पुनः प्रयास हो रहा है।',
  },
  QUOTA_EXCEEDED: {
    en: 'Storage limit reached. Contact administrator.',
    hi: 'भंडारण सीमा पूरी। कृपया व्यवस्थापक से संपर्क करें।',
  },
  PROCESSING_ERROR: {
    en: 'Error processing the file. Please try a different file.',
    hi: 'फ़ाइल प्रसंस्करण में त्रुटि। कृपया अलग फ़ाइल आज़माएं।',
  },
  UNAUTHORIZED: {
    en: 'Session expired. Please log in again.',
    hi: 'सत्र समाप्त। कृपया पुनः लॉग इन करें।',
  },
  CANCELLED: {
    en: 'Upload was cancelled.',
    hi: 'अपलोड रद्द किया गया।',
  },
};

/**
 * Get bilingual error message for an error code.
 * Returns combined "English / Hindi" string for inline display.
 */
export function getUploadErrorMessage(code: string): string {
  const msg = UPLOAD_ERROR_MESSAGES[code];
  if (!msg) {
    return 'An unexpected error occurred. / एक अप्रत्याशित त्रुटि हुई।';
  }
  return `${msg.en} / ${msg.hi}`;
}

/**
 * Get error message for a specific language.
 */
export function getUploadErrorMessageByLang(code: string, lang: 'en' | 'hi' = 'en'): string {
  const msg = UPLOAD_ERROR_MESSAGES[code];
  if (!msg) return lang === 'en' ? 'An unexpected error occurred.' : 'एक अप्रत्याशित त्रुटि हुई।';
  return msg[lang];
}

// ─── Retry Configuration (Req 9) ───

export const RETRY_CONFIG = {
  maxRetries: 3,
  backoffDelays: [2000, 4000, 8000], // milliseconds
  uploadTimeout: 60000, // 60 seconds per attempt
};

// ─── Upload Queue Storage Key ───

export const UPLOAD_QUEUE_STORAGE_KEY = '@pan_india_upload_queue';

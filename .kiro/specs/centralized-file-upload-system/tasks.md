# Implementation Plan: Centralized File Upload System

## Overview

This implementation plan breaks down the centralized file upload system into discrete, testable tasks. The system consolidates scattered upload logic across the React Native application into a unified Supabase Edge Functions-based architecture with comprehensive audit logging and file management.

**Architecture:** React Native (Expo) → Supabase Edge Functions → Supabase Storage + PostgreSQL

## Tasks

- [ ] 1. Create database schema for uploaded files and audit logs
  - Create migration file `025_create_uploaded_files.sql` in `supabase/migrations/`
  - Create `uploaded_files` table with columns: id, file_path, bucket_name, file_size_bytes, mime_type, category, uploaded_by, personnel_id, site_id, attendance_id, incident_id, original_filename, md5_hash, metadata, deleted_at, created_at, updated_at
  - Create indexes on category, uploaded_by, and foreign key columns
  - Create `upload_audit_logs` table with columns: id, file_id, operation, user_id, ip_address, user_agent, metadata, created_at
  - Create indexes on file_id, user_id, operation, created_at
  - Add check constraint for valid category values
  - Add check constraint for at least one foreign key reference
  - Apply migration: `supabase db push`
  - _Requirements: 6 (Audit Logging), 7 (Orphaned File Detection)_

- [ ] 2. Configure Supabase storage buckets and RLS policies
  - Create 5 storage buckets: profiles (public), documents (private), sites (public), incidents (public), attendance (private)
  - Apply RLS policy for profiles bucket: public read, authenticated write
  - Apply RLS policy for documents bucket: authenticated read/write
  - Apply RLS policy for sites bucket: public read, admin/manager write
  - Apply RLS policy for incidents bucket: public read, authenticated write
  - Apply RLS policy for attendance bucket: admin/manager read, guard write
  - Test upload permissions for each role
  - _Requirements: 3 (File Category Organization), 4 (Security and Access Control)_

- [ ] 3. Implement upload-file Edge Function
  - [ ] 3.1 Create function scaffold with JWT authentication
    - Create `supabase/functions/upload-file/index.ts`
    - Implement JWT token extraction and validation
    - Extract user from Supabase auth
    - Return 401 for missing/invalid tokens
    - _Requirements: 10 (Authentication Flow Preservation)_
  
  - [ ] 3.2 Implement request validation logic
    - Parse multipart form data (file, category, personnelId, siteId, attendanceId, incidentId, metadata)
    - Validate category is one of: profiles, documents, sites, incidents, attendance
    - Validate file size limits per category (profiles: 2MB, documents: 10MB, sites: 5MB, incidents: 5MB, attendance: 1MB)
    - Validate MIME types per category
    - Validate required foreign key references per category
    - Validate user role permissions (e.g., only admin/manager can upload sites)
    - Return specific error codes: MISSING_FILE, INVALID_CATEGORY, FILE_TOO_LARGE, INVALID_FORMAT, MISSING_REFERENCE, PERMISSION_DENIED
    - _Requirements: 2 (Centralized Upload Interface), 3 (File Category Organization), 14 (Error Handling)_
  
  - [ ] 3.3 Implement image processing and compression
    - Use ImageScript library to decode uploaded image
    - Resize images exceeding max dimensions per category (profiles/documents/sites/incidents: 1920x1080, attendance: 640x480)
    - Compress images with quality settings per category (profiles/sites/incidents: 80%, documents: 85%, attendance: 70%)
    - Compute MD5 hash for integrity verification
    - Encode as JPEG format
    - Return PROCESSING_ERROR on failure
    - _Requirements: 5 (Image Compression and Optimization), 15 (Round-Trip Testing)_
  
  - [ ] 3.4 Implement file upload and database registration
    - Generate unique file path: `{category}/{timestamp}-{userId_prefix}-{random}.{ext}`
    - Upload compressed image to Supabase Storage bucket
    - Insert record into `uploaded_files` table with all metadata
    - Create audit log entry in `upload_audit_logs` with operation='upload'
    - Generate public URL for public buckets (profiles, sites, incidents)
    - Generate signed URL (1-hour expiry) for private buckets (documents, attendance)
    - Implement rollback: delete uploaded file if database insert fails
    - Return success response with fileId, filePath, url, fileSize, mimeType
    - _Requirements: 6 (Audit Logging), 13 (File Metadata and Searchability)_
  
  - [ ] 3.5 Deploy and test upload-file function
    - Deploy function: `supabase functions deploy upload-file`
    - Test successful upload for each category
    - Test file size limit validation
    - Test invalid MIME type rejection
    - Test missing authorization error
    - Test role-based permission enforcement
    - _Requirements: 2 (Centralized Upload Interface)_

- [ ] 4. Implement get-signed-url Edge Function
  - Create `supabase/functions/get-signed-url/index.ts`
  - Implement JWT authentication
  - Validate user permissions to access requested file
  - Query `uploaded_files` table to verify file exists
  - Generate signed URL with configurable expiry (default 1 hour)
  - Create audit log entry with operation='signed_url'
  - Return signed URL and expiration timestamp
  - Deploy function: `supabase functions deploy get-signed-url`
  - Test signed URL generation for private files
  - Test permission denial for unauthorized users
  - _Requirements: 4 (Security and Access Control), 6 (Audit Logging)_

- [ ] 5. Implement cleanup-orphaned-files Edge Function
  - Create `supabase/functions/cleanup-orphaned-files/index.ts`
  - Use service role key for authentication
  - Query `uploaded_files` for files with deleted_at > 7 days ago (hard delete candidates)
  - Delete files from storage and database records for hard delete candidates
  - Query `uploaded_files` for orphaned files (all FK references NULL, created > 30 days ago, not marked deleted)
  - Soft delete orphaned files by setting deleted_at timestamp
  - Return summary with hardDeleted count and softDeleted count
  - Deploy function: `supabase functions deploy cleanup-orphaned-files`
  - Configure pg_cron job to run daily at 02:00 UTC
  - Test manual invocation and verify cleanup behavior
  - _Requirements: 7 (Orphaned File Detection and Cleanup)_

- [ ] 6. Checkpoint - Ensure backend infrastructure deployed
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Install React Native dependencies
  - Install `expo-image-picker` for image selection
  - Install `expo-image-manipulator` for client-side compression
  - Install `@react-native-async-storage/async-storage` for upload queue persistence
  - Install `@react-native-community/netinfo` for network state monitoring
  - Verify dependencies: `npm install` succeeds
  - _Requirements: 2 (Centralized Upload Interface), 9 (Upload Performance and Reliability)_

- [ ] 8. Create useFileUpload React Native hook
  - [ ] 8.1 Create hook file and interfaces
    - Create `mobile/src/hooks/useFileUpload.ts`
    - Define TypeScript interfaces: UseFileUploadOptions, UploadResult, QueuedUpload
    - Define state variables: uploading, progress, queuedUploads
    - _Requirements: 2 (Centralized Upload Interface)_
  
  - [ ] 8.2 Implement image picker and client-side compression
    - Implement `pickImage()` using expo-image-picker
    - Implement `compressImage()` using expo-image-manipulator
    - Apply category-specific compression settings (attendance: 640x480@0.7, others: 1920x1080@0.8-0.85)
    - _Requirements: 5 (Image Compression and Optimization)_
  
  - [ ] 8.3 Implement upload logic with retry
    - Implement `uploadFile()` function
    - Get Supabase JWT token from auth session
    - Prepare multipart form data with file and metadata
    - Call upload-file Edge Function via fetch
    - Implement retry logic with exponential backoff (3 attempts, delays: 2s, 4s, 8s)
    - Track upload progress and update state
    - Return UploadResult with success/error codes
    - _Requirements: 9 (Upload Performance and Reliability), 14 (Error Handling)_
  
  - [ ] 8.4 Implement offline queue management
    - Implement `queueUpload()` to persist failed uploads to AsyncStorage
    - Implement `processQueue()` to retry queued uploads
    - Add NetInfo listener to auto-trigger processQueue when network restored
    - Remove successfully uploaded items from queue
    - _Requirements: 9 (Upload Performance and Reliability)_

- [ ] 9. Create upload configuration files
  - Create `mobile/src/config/upload.config.ts` with compression settings per category
  - Create `mobile/src/config/featureFlags.ts` for gradual rollout control
  - Add environment variables to `.env` for Edge Function URLs
  - _Requirements: 16 (Deployment Impact Assessment)_

- [ ] 10. Refactor ProfileScreen to use centralized upload
  - Import `useFileUpload` hook
  - Replace direct `uploadImage` call with `uploadFile` from hook
  - Add progress indicator UI (ActivityIndicator + percentage)
  - Add error handling with user-friendly alerts
  - Update profile photo URL after successful upload
  - Handle retry and queue options on error
  - Test upload success, oversized file error, offline queue
  - _Requirements: 2 (Centralized Upload Interface), 12 (Refactoring Existing Upload Points)_

- [ ] 11. Refactor EditGuardProfileScreen to use centralized upload
  - Similar to ProfileScreen refactoring
  - Verify guard can only upload own profile photo
  - Test role-based permissions
  - _Requirements: 12 (Refactoring Existing Upload Points)_

- [ ] 12. Refactor AddGuardScreen for document uploads
  - Use `useFileUpload` for Aadhaar front/back, PVR, and profile photo
  - Upload Aadhaar front with category='documents', metadata={documentType: 'aadhaar_front'}
  - Upload Aadhaar back with category='documents', metadata={documentType: 'aadhaar_back'}
  - Upload PVR with category='documents', metadata={documentType: 'pvr'}
  - Upload profile photo with category='profiles'
  - Display multiple upload progress indicators
  - Validate all required documents uploaded before submission
  - Link uploaded files to guard record via personnelId
  - Implement rollback: delete uploaded files if guard creation fails
  - Test complete guard registration flow
  - _Requirements: 12 (Refactoring Existing Upload Points), 13 (File Metadata and Searchability)_

- [ ] 13. Refactor AddWorkforcePersonnelScreen for document uploads
  - Similar to AddGuardScreen but for workforce personnel
  - Support multiple document types (Aadhaar, PAN, certificates)
  - Dynamic document upload based on personnel category
  - Proper error handling and rollback
  - _Requirements: 12 (Refactoring Existing Upload Points)_

- [ ] 14. Refactor GuardAttendanceScreen for selfie uploads
  - Upload selfie with category='attendance', attendanceId=<record-id>
  - Apply heavy compression (640x480@0.7)
  - Upload before creating attendance record to get URL
  - Link uploaded file to attendance record
  - Handle upload failures gracefully (retry or queue)
  - Verify geofence validation before upload
  - Test check-in with selfie, verify signed URL required for viewing
  - _Requirements: 5 (Image Compression), 12 (Refactoring Existing Upload Points)_

- [ ] 15. Implement feature flag toggle mechanism
  - Feature flags respect configuration in featureFlags.ts
  - Screens check feature flag before choosing upload method
  - Old upload system remains functional (backward compatibility)
  - Feature flags controllable per category
  - Test toggle between old and new systems without data loss
  - _Requirements: 16 (Deployment Impact Assessment)_

- [ ] 16. Checkpoint - Ensure React Native integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Create and execute file migration script
  - [ ] 17.1 Create migration script
    - Create `migrate-existing-files.js` Node.js script
    - Connect to Supabase using service role key
    - Fetch all records from old tables (guard_documents, workforce_documents, attendance with photo URLs)
    - Download files from old storage buckets
    - Compute MD5 hash for each file
    - Upload to new buckets with proper naming convention
    - Register files in `uploaded_files` table
    - Link files to source records via foreign keys
    - Tag files that cannot be linked as "legacy-unlinked"
    - Log errors and continue on failure
    - Generate migration report (total, success, errors, unlinked)
    - _Requirements: 8 (Migration of Existing Files)_
  
  - [ ] 17.2 Execute migration in production
    - Backup current database before migration
    - Run migration script in production
    - Review migration report for errors
    - Manually verify random sample of 20 files per category
    - Verify signed URLs work for private files
    - Verify public URLs work for public files
    - Document any files that failed to migrate
    - _Requirements: 8 (Migration of Existing Files), 15 (Round-Trip Testing)_

- [ ] 18. Set up monitoring and alerts
  - Enable Supabase dashboard monitoring
  - Configure alert for upload success rate < 95%
  - Configure alert for storage quota > 80%
  - Configure alert for Edge Function errors > 5%
  - Configure weekly report of upload metrics
  - Configure audit log retention policy (2 years)
  - _Requirements: 11 (Deployment and Operational Simplicity), 16 (Deployment Impact Assessment)_

- [ ] 19. Remove deprecated code and feature flags
  - Remove old `uploadImage` utility or mark deprecated
  - Remove feature flags and hardcode new system
  - Update any remaining direct Supabase storage calls
  - Clean up unused dependencies
  - Full regression test of all upload scenarios
  - _Requirements: 12 (Refactoring Existing Upload Points)_

- [ ] 20. Create documentation and conduct training
  - Create user guide for uploading files with screenshots
  - Create developer guide for using useFileUpload hook
  - Create operations guide for monitoring and troubleshooting
  - Document rollback procedure
  - Conduct team training session
  - Hold Q&A session
  - _Requirements: 11 (Deployment and Operational Simplicity)_

## Notes

- Tasks marked with decimal notation (e.g., 3.1, 3.2) are sub-tasks of parent tasks
- Feature flags enable gradual rollout by category to mitigate risk
- Backward compatibility maintained during migration period
- Comprehensive testing required at checkpoints before proceeding
- Monitor upload success rate closely during rollout; auto-rollback if < 95%
- Migration script should be tested on staging environment before production
- Cold start latency for Edge Functions typically < 100ms (acceptable for user experience)

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1"]
    },
    {
      "id": 1,
      "tasks": ["2", "3.1"]
    },
    {
      "id": 2,
      "tasks": ["3.2", "3.3", "4"]
    },
    {
      "id": 3,
      "tasks": ["3.4", "5", "7"]
    },
    {
      "id": 4,
      "tasks": ["3.5", "8.1", "9"]
    },
    {
      "id": 5,
      "tasks": ["8.2", "8.3"]
    },
    {
      "id": 6,
      "tasks": ["8.4"]
    },
    {
      "id": 7,
      "tasks": ["10", "11"]
    },
    {
      "id": 8,
      "tasks": ["12", "13", "14"]
    },
    {
      "id": 9,
      "tasks": ["15"]
    },
    {
      "id": 10,
      "tasks": ["17.1", "18"]
    },
    {
      "id": 11,
      "tasks": ["17.2"]
    },
    {
      "id": 12,
      "tasks": ["19", "20"]
    }
  ]
}
```

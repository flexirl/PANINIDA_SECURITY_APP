# Requirements Document: Centralized File Upload System

## Introduction

This document defines requirements for consolidating scattered file upload logic across the Pan India Security React Native application into a centralized, auditable, and maintainable file upload system. The current architecture uses React Native (Expo) + Supabase Edge Functions + Supabase Storage. The proposed solution must address whether introducing a separate NestJS backend is architecturally sound, or if the existing Supabase-based architecture should be enhanced.

**Current State Analysis:**
- Upload logic scattered across 6+ screens (ProfileScreen, GuardDocumentsScreen, AddGuardScreen, AddWorkforcePersonnelScreen, GuardAttendanceScreen, EditGuardProfileScreen)
- Direct Supabase Storage uploads via `uploadImage` utility
- No centralized audit trail for file operations
- Inconsistent compression and validation logic
- Multiple storage buckets without clear governance (guard-documents, workforce-documents, selfies)

**Architectural Decision Context:**
The user's implementation plan proposes introducing a NestJS backend as an intermediate layer between React Native and Supabase. This requirements document will capture the business needs and acceptance criteria to inform whether this architectural change is justified, or if enhancements to the existing Supabase Edge Functions can meet the requirements more efficiently.

## Glossary

- **Upload_System**: The centralized file upload subsystem responsible for handling all file operations
- **Mobile_Client**: The React Native (Expo) mobile application
- **Storage_Backend**: Supabase Storage service for file persistence
- **Edge_Functions**: Supabase Edge Functions (Deno runtime) for serverless business logic
- **Audit_Log**: Persistent record of all file upload, access, and deletion operations
- **RLS_Policy**: Row Level Security policy in Supabase controlling file access
- **Signed_URL**: Time-limited URL for secure access to private files
- **Compression_Engine**: Image processing subsystem that reduces file size before upload
- **User_Role**: One of: admin, manager, recruiter, guard
- **File_Category**: Logical grouping: profiles, documents, sites, incidents, attendance
- **Orphaned_File**: File in storage without corresponding database reference
- **NestJS_Backend**: Proposed Node.js backend service using NestJS framework
- **Backend_Service**: Generic term for server-side processing layer (could be NestJS or Edge Functions)

## Requirements

### Requirement 1: Architectural Decision - Backend Service Strategy

**User Story:** As a system architect, I want to evaluate whether introducing a NestJS backend provides sufficient value over enhancing existing Supabase Edge Functions, so that I choose the simplest architecture that meets all business needs.

#### Acceptance Criteria

1. THE Upload_System SHALL support all file operations (upload, retrieve, delete, audit) regardless of whether the Backend_Service is implemented as Supabase Edge Functions or NestJS
2. THE Architectural_Decision_Document SHALL document the tradeoffs between NestJS and Edge Functions approaches, including: deployment complexity, maintenance overhead, authentication flow, cold start latency, development velocity, and operational costs
3. IF NestJS is chosen, THEN THE NestJS_Backend SHALL authenticate requests using Supabase JWT tokens to maintain single sign-on
4. IF Edge Functions are chosen, THEN THE Edge_Functions SHALL be enhanced with centralized upload logic and audit logging
5. THE Upload_System SHALL NOT introduce breaking changes to existing Mobile_Client authentication flows

### Requirement 2: Centralized Upload Interface

**User Story:** As a mobile developer, I want a single React Native hook or service for all file uploads, so that I have consistent upload behavior across all screens.

#### Acceptance Criteria

1. THE Upload_System SHALL provide a reusable Mobile_Client interface (hook or service) that accepts: file URI, file category, metadata, and optional compression settings
2. WHEN any screen needs to upload a file, THE Mobile_Client SHALL use the centralized upload interface
3. THE Upload_System SHALL handle image compression transparently based on file category defaults
4. THE Upload_System SHALL return upload progress callbacks (percentage complete) to the Mobile_Client
5. WHEN upload fails, THE Upload_System SHALL return specific error codes (network error, quota exceeded, invalid format, geofence violation) to enable appropriate user feedback
6. THE Upload_System SHALL support cancellation of in-progress uploads

### Requirement 3: File Category Organization

**User Story:** As a system administrator, I want files organized into logical categories with appropriate security policies, so that I can control access and manage storage efficiently.

#### Acceptance Criteria

1. THE Upload_System SHALL organize files into five categories: profiles, documents, sites, incidents, attendance
2. FOR EACH File_Category, THE Upload_System SHALL use a dedicated Storage_Backend bucket with category-specific naming conventions
3. THE Upload_System SHALL enforce category-specific file type restrictions (JPEG/PNG for profiles and attendance, PDF/JPEG for documents)
4. THE Upload_System SHALL enforce category-specific size limits (max 2MB for profiles/attendance, max 10MB for documents)
5. WHEN a file is uploaded, THE Upload_System SHALL record the File_Category in the Audit_Log

### Requirement 4: Security and Access Control

**User Story:** As a security officer, I want file access controlled by role-based policies and time-limited signed URLs, so that sensitive documents are not publicly accessible.

#### Acceptance Criteria

1. THE Upload_System SHALL configure RLS_Policy for each Storage_Backend bucket to restrict access by User_Role
2. WHERE the File_Category is "documents", THE Upload_System SHALL generate Signed_URLs with 1-hour expiration for access
3. WHERE the File_Category is "profiles" OR "sites", THE Upload_System SHALL allow public read access via standard URLs
4. WHERE the File_Category is "attendance" OR "incidents", THE Upload_System SHALL allow read access only to admin and manager roles
5. WHEN a user without appropriate role attempts file access, THE Storage_Backend SHALL return HTTP 403 Forbidden
6. THE Upload_System SHALL validate that the authenticated user has permission to upload files for the target personnel, site, or incident record

### Requirement 5: Image Compression and Optimization

**User Story:** As a field guard with limited mobile data, I want images automatically compressed before upload, so that I minimize data usage and upload times.

#### Acceptance Criteria

1. THE Compression_Engine SHALL compress images to maximum 1920x1080 resolution before upload
2. THE Compression_Engine SHALL use JPEG compression with quality setting of 0.8 (80%) for photos
3. WHERE the File_Category is "attendance", THE Compression_Engine SHALL reduce image resolution to maximum 640x480 to prioritize upload speed
4. THE Compression_Engine SHALL preserve EXIF orientation metadata during compression
5. THE Upload_System SHALL allow Mobile_Client to override default compression settings per upload request

### Requirement 6: Comprehensive Audit Logging

**User Story:** As a compliance officer, I want every file operation logged with timestamp, user, and metadata, so that I can audit file access and troubleshoot issues.

#### Acceptance Criteria

1. THE Upload_System SHALL create an Audit_Log entry for every file upload containing: timestamp, user_id, file_path, file_size_bytes, File_Category, operation (upload/delete/access), and client IP address
2. THE Upload_System SHALL create an Audit_Log entry when Signed_URLs are generated
3. THE Audit_Log SHALL be stored in a dedicated database table with indexed search on user_id and timestamp
4. THE Upload_System SHALL retain Audit_Log entries for minimum 2 years
5. THE Upload_System SHALL provide an API endpoint for administrators to query Audit_Log by date range, user, or File_Category

### Requirement 7: Orphaned File Detection and Cleanup

**User Story:** As a system administrator, I want orphaned files automatically detected and removed, so that storage costs remain manageable.

#### Acceptance Criteria

1. THE Upload_System SHALL maintain a database registry of all uploaded files with foreign key references to source records (personnel_id, site_id, attendance_id)
2. WHEN a source record is deleted (e.g., personnel removed), THE Upload_System SHALL mark associated files as candidates for deletion
3. THE Cleanup_Job SHALL run daily at 02:00 UTC to identify Orphaned_Files older than 30 days without database references
4. THE Cleanup_Job SHALL delete Orphaned_Files from Storage_Backend and log deletions in Audit_Log
5. THE Upload_System SHALL provide a manual API endpoint for administrators to trigger cleanup on demand

### Requirement 8: Migration of Existing Files

**User Story:** As a system administrator, I want existing uploaded files migrated to the new centralized system without data loss, so that historical records remain accessible.

#### Acceptance Criteria

1. THE Migration_Script SHALL inventory all files currently in Storage_Backend buckets (guard-documents, workforce-documents, selfies)
2. THE Migration_Script SHALL create database registry entries for all existing files, linking to source records via personnel_id, site_id, or attendance_id
3. WHERE existing files cannot be linked to source records, THE Migration_Script SHALL tag them as "legacy-unlinked" and preserve them
4. THE Migration_Script SHALL verify file accessibility after migration by generating test Signed_URLs
5. THE Migration_Script SHALL produce a migration report listing: total files processed, successfully linked, unlinked legacy files, and any errors

### Requirement 9: Upload Performance and Reliability

**User Story:** As a mobile user in areas with poor connectivity, I want uploads to succeed despite network interruptions, so that I don't lose captured photos.

#### Acceptance Criteria

1. THE Upload_System SHALL implement retry logic with exponential backoff for failed uploads (3 attempts, delays: 2s, 4s, 8s)
2. WHEN upload is interrupted, THE Upload_System SHALL resume from last successfully uploaded chunk if Storage_Backend supports resumable uploads
3. THE Upload_System SHALL timeout individual upload attempts after 60 seconds
4. THE Upload_System SHALL queue failed uploads for retry when network connectivity is restored
5. THE Mobile_Client SHALL persist queued uploads to local storage to survive app restarts

### Requirement 10: Authentication Flow Preservation

**User Story:** As a mobile developer, I want the authentication flow to remain unchanged, so that existing users are not forced to re-login or face authentication issues.

#### Acceptance Criteria

1. THE Upload_System SHALL accept the existing Supabase JWT token from Mobile_Client for authentication
2. IF NestJS_Backend is introduced, THEN THE NestJS_Backend SHALL validate Supabase JWT tokens without requiring separate authentication
3. THE Upload_System SHALL return HTTP 401 Unauthorized when JWT token is expired or invalid
4. THE Upload_System SHALL NOT require changes to existing auth-send-otp or auth-verify-otp Edge Functions
5. THE Upload_System SHALL support the existing role claims (admin, manager, recruiter, guard) from JWT tokens

### Requirement 11: Deployment and Operational Simplicity

**User Story:** As a DevOps engineer, I want minimal deployment complexity and operational overhead, so that I can maintain the system with existing resources.

#### Acceptance Criteria

1. IF NestJS_Backend is chosen, THEN THE deployment process SHALL document: hosting platform, environment configuration, database connection pooling, and monitoring setup
2. IF Edge Functions are chosen, THEN THE deployment process SHALL leverage existing Supabase CLI deployment workflow
3. THE Upload_System SHALL provide health check endpoints for monitoring (Backend_Service status, Storage_Backend connectivity)
4. THE Upload_System SHALL emit structured logs (JSON format) for integration with existing log aggregation tools
5. THE Upload_System SHALL document cold start latency benchmarks for Backend_Service under various load conditions

### Requirement 12: Refactoring Existing Upload Points

**User Story:** As a mobile developer, I want clear guidance on refactoring existing upload code to use the centralized system, so that migration is systematic and error-free.

#### Acceptance Criteria

1. THE Refactoring_Guide SHALL identify all screens currently performing uploads: ProfileScreen, GuardDocumentsScreen, AddGuardScreen, AddWorkforcePersonnelScreen, GuardAttendanceScreen, EditGuardProfileScreen
2. FOR EACH identified screen, THE Refactoring_Guide SHALL provide before/after code examples showing replacement of direct `uploadImage` calls with centralized upload hook
3. THE Upload_System SHALL provide backward compatibility mode that supports both old `uploadImage` utility and new centralized interface during migration period
4. THE Refactoring_Guide SHALL define a migration checklist with testing criteria for each screen
5. THE Upload_System SHALL log warnings (not errors) when deprecated `uploadImage` utility is used to aid migration tracking

### Requirement 13: File Metadata and Searchability

**User Story:** As an administrator, I want to search and filter uploaded files by metadata, so that I can quickly locate specific documents or photos.

#### Acceptance Criteria

1. THE Upload_System SHALL store metadata for each file including: original filename, MIME type, upload timestamp, uploader user_id, File_Category, and associated record IDs
2. THE Upload_System SHALL provide API endpoint to search files by: date range, File_Category, uploader, or associated personnel/site/incident ID
3. THE Upload_System SHALL return search results paginated (50 results per page) with sort options (newest first, oldest first, largest file, smallest file)
4. THE Upload_System SHALL support filtering search results by file status (active, pending deletion, deleted)
5. THE Upload_System SHALL generate thumbnail URLs (200x200px) for image files to accelerate search result display

### Requirement 14: Error Handling and User Feedback

**User Story:** As a mobile user, I want clear, actionable error messages when uploads fail, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN upload fails due to network timeout, THE Upload_System SHALL return error code "NETWORK_TIMEOUT" with message "Upload failed due to network issues. Retrying automatically."
2. WHEN upload fails due to exceeded storage quota, THE Upload_System SHALL return error code "QUOTA_EXCEEDED" with message "Storage limit reached. Contact administrator."
3. WHEN upload fails due to invalid file format, THE Upload_System SHALL return error code "INVALID_FORMAT" with message "Only JPEG and PNG images are supported for this upload type."
4. WHEN upload fails due to file size exceeding limit, THE Upload_System SHALL return error code "FILE_TOO_LARGE" with message "File exceeds maximum size limit of [N]MB."
5. THE Upload_System SHALL localize error messages in English and Hindi based on Mobile_Client language preference

### Requirement 15: Round-Trip Testing for Upload Integrity

**User Story:** As a quality assurance engineer, I want automated tests that verify uploaded files are retrievable and intact, so that data integrity is guaranteed.

#### Acceptance Criteria

1. FOR ALL valid file uploads, THE Upload_System SHALL verify that parsing the returned file URL and downloading the file produces an equivalent file to the original (round-trip property)
2. THE Upload_System SHALL compute MD5 hash of uploaded file and store in database for integrity verification
3. THE Integrity_Checker SHALL periodically verify stored files match their recorded MD5 hashes (weekly scan)
4. WHEN file integrity check fails, THE Upload_System SHALL log critical alert and notify administrators via notification system
5. THE Upload_System SHALL provide API endpoint to manually trigger integrity check for specific files or File_Categories

### Requirement 16: Deployment Impact Assessment

**User Story:** As a product manager, I want to understand what existing functionality will be affected by introducing centralized uploads, so that I can plan user communication and rollback strategy.

#### Acceptance Criteria

1. THE Impact_Assessment_Document SHALL list all existing features that depend on file uploads: guard registration, document verification, attendance check-in, profile photo updates, incident reporting
2. FOR EACH affected feature, THE Impact_Assessment_Document SHALL specify: expected behavior changes (if any), testing requirements, and rollback procedure
3. THE Upload_System SHALL implement feature flags to enable/disable centralized upload per File_Category for gradual rollout
4. THE Upload_System SHALL maintain metrics dashboard showing upload success rate, average upload time, and error rate by File_Category
5. IF upload success rate drops below 95% for any File_Category, THE Upload_System SHALL automatically rollback to previous upload implementation and alert administrators

## Special Requirements Guidance: Parser/Serializer Considerations

**Note:** This feature does not involve parsers or serializers. File uploads are treated as binary blobs. However, metadata stored alongside files (JSON format) will benefit from round-trip testing as specified in Requirement 15.

## Quality Considerations

### Testability Focus

- **Invariants**: File metadata consistency between database registry and Storage_Backend (file_path, file_size, category)
- **Round-Trip Properties**: Upload → Download → Verify equivalence via MD5 hash comparison
- **Idempotence**: Re-uploading same file with same metadata should not create duplicate records
- **Metamorphic Properties**: Compressing an image twice should yield same result as compressing once
- **Error Conditions**: Invalid file formats, oversized files, expired tokens, and geofence violations must be gracefully handled

### Non-Property-Based Test Scenarios

Many acceptance criteria require **integration tests** rather than property-based tests:
- **Authentication flow** (Req 10): Test with 2-3 representative JWT tokens (valid, expired, invalid role)
- **RLS policies** (Req 4): Test with 2-3 user roles (admin can access all, guard can only access own)
- **Storage bucket configuration** (Req 3): Smoke test each bucket is created with correct permissions
- **Cleanup job** (Req 7): Integration test with sample orphaned files (not 100 iterations)

### High-Value Property-Based Tests

- **Compression integrity** (Req 5): For all valid images (various resolutions, EXIF orientations), compressed image should have resolution ≤ max limit and preserve orientation
- **Retry logic** (Req 9): For all transient network errors, Upload_System should retry up to 3 times with correct backoff delays
- **Audit log completeness** (Req 6): For all upload operations (success or failure), exactly one Audit_Log entry should exist
- **File size validation** (Req 3): For all file uploads, files exceeding category size limit should be rejected with FILE_TOO_LARGE error

## Architectural Decision Guidance

The requirements in this document are intentionally **architecture-neutral** where possible. Requirements 1, 10, and 11 explicitly capture the decision criteria for choosing between NestJS and enhanced Edge Functions:

**NestJS Advantages:**
- Mature ecosystem for complex business logic and middleware
- Easier local development and testing with standard Node.js tooling
- Familiar deployment patterns (Docker, Kubernetes, managed Node.js hosts)

**Edge Functions Advantages:**
- Zero deployment complexity (managed by Supabase)
- Native integration with Supabase Auth and Storage
- No cold start optimization needed for typical workloads
- Lower operational overhead (no server provisioning, monitoring, or scaling)

The design phase must evaluate these tradeoffs against the **actual complexity** of the upload logic required by these requirements. If the logic is primarily orchestration (compress → upload → audit log), Edge Functions may suffice. If complex validation, transformation pipelines, or third-party integrations are needed, NestJS may be justified.

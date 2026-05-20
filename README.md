# Pan India Security — Workforce Management System (Backend)

A complete backend for managing security workforce operations including guard management, GPS-based attendance, payroll, recruitment, and field inspections.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | Supabase PostgreSQL |
| API | Supabase Edge Functions (Deno) |
| Auth | Firebase Phone OTP + Supabase JWT |
| Storage | Supabase Storage |
| Notifications | Firebase Cloud Messaging |

## Project Structure

```
supabase/
├── migrations/
│   ├── 001_create_tables.sql      # 11 core tables
│   ├── 002_create_indexes.sql     # Performance indexes
│   ├── 003_rls_policies.sql       # Row-Level Security
│   ├── 004_functions.sql          # DB functions & triggers
│   └── 005_storage_buckets.sql    # File storage setup
├── functions/                     # Edge Functions (API)
│   └── (coming in Week 1 Day 5+)
├── seed.sql                       # Test data
└── config.toml                    # Local dev config
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | All user accounts (admin, manager, recruiter, guard) |
| `guards` | Guard profiles (extends users) |
| `guard_documents` | Uploaded documents per guard |
| `sites` | Client locations with GPS coordinates |
| `guard_site_assignments` | Guard ↔ Site mapping |
| `attendance` | GPS + selfie check-in/check-out |
| `payroll` | Monthly salary calculations |
| `uniforms` | Uniform items issued & payment tracking |
| `candidates` | Recruitment pipeline |
| `inspections` | Site inspection reports |
| `notifications` | Push & in-app notifications |

## Setup

1. Install Supabase CLI: `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. Start local dev: `npx supabase start`
4. Run migrations: `npx supabase db push`
5. Seed test data: `npx supabase db seed`

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full system access |
| **Manager** | Site inspections, guard verification |
| **Recruiter** | Candidate management |
| **Guard** | Own attendance, salary, profile |

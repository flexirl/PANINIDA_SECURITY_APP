# Design Document: Personnel Category Filtering

## Overview

The Personnel Category Filtering feature transforms the Pan India Security workforce management system from a Guard-centric application into a multi-category platform that supports Guards, Gunman Personnel, Bouncers, and Helpers/Housekeeping. The system implements a global category filter with dynamic UI transformation, allowing administrators to view and manage different workforce segments through category-specific lenses while maintaining backward compatibility with the original Guard Management System.

### Key Design Principles

1. **Global State Management**: A single React Context (PersonnelCategoryContext) manages category filter state across all admin screens, ensuring consistency and eliminating prop drilling.

2. **Frontend-First Filtering**: Dashboard metrics are recalculated in the React Native app using cached data, providing instant filter changes without backend round-trips.

3. **Dynamic Label Translation**: A centralized translation engine maps generic UI terms to category-specific terminology, transforming the entire interface based on the active filter.

4. **Role-Based Defaults**: The system defaults to appropriate category views based on user roles (Admins see Guards, Operations Managers see All Personnel) to maintain workflow continuity.

5. **Backward Compatibility**: When "Guards" is selected, the system behaves identically to the original Guard Management System, ensuring zero disruption for existing users.

### Technology Stack

- **Frontend**: React Native 0.81.5 with Expo ~54.0
- **State Management**: React Context API with hooks
- **Backend**: Supabase (PostgreSQL) with Deno Edge Functions
- **Navigation**: React Navigation 7.x
- **Type Safety**: TypeScript 5.9

---

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "React Native App"
        UI[Admin Screens]
        Context[PersonnelCategoryContext]
        Services[Service Layer]
        Cache[Frontend Cache]
    end
    
    subgraph "Supabase Backend"
        DB[(PostgreSQL)]
        EdgeFn[Deno Edge Functions]
    end
    
    UI -->|usePersonnelCategory| Context
    UI -->|fetch data| Services
    Services -->|optional categoryIds| EdgeFn
    EdgeFn -->|filtered query| DB
    Context -->|categoryFilterIds| UI
    UI -->|cache| Cache
    Cache -->|instant recalc| UI

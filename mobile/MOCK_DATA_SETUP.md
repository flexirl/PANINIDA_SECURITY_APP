# Mock Data Setup for Testing Personnel Category Filtering

## Quick Start

To enable mock data for testing the admin module:

### Step 1: Set Mock Mode to TRUE

Open `mobile/src/__mocks__/mockConfig.ts` and ensure:

```typescript
export const USE_MOCK_DATA = true; // Set to true for testing
```

### Step 2: Start Expo

```bash
cd mobile
npm start
```

### Step 3: Test Category Filtering

1. Login as admin (default credentials from your auth setup)
2. You should see the category switcher with 5 options:
   - All Personnel (60 total)
   - Guards (20 personnel)
   - Gunman Personnel (15 personnel)
   - Bouncers (10 personnel)
   - Helpers / Housekeeping (15 personnel)

3. Switch between categories and observe:
   - Dashboard metrics update instantly
   - UI labels change (Guards → Gunmen → Bouncers → Helpers)
   - Attendance data filters correctly
   - Activity feed updates

## Mock Data Summary

### Personnel Distribution
- **Guards**: 20 personnel (PIS-001 to PIS-020)
- **Gunman Personnel**: 15 personnel (GM-001 to GM-005, RM-001 to RM-005, PSO-001 to PSO-005)
- **Bouncers**: 10 personnel (BNC-001 to BNC-010)
- **Helpers/Housekeeping**: 15 personnel (HK-001 to HK-008, SWP-001 to SWP-004, GRD-001 to GRD-003)
- **Total**: 60 personnel

### Attendance Distribution (Today)
- **Present**: ~60% (36 personnel)
- **Late**: ~20% (12 personnel)
- **Absent**: ~20% (12 personnel)

### Dashboard Metrics
- Total Sites: 25 (23 active)
- Pending Payroll: 8
- Active Candidates: 12
- Incidents (Last 7 days): 3

## Troubleshooting

### Error: Cannot find module '__mocks__/mockConfig'

**Solution**: The mock files were created. If you're getting import errors, it means the services are trying to import mock files but TypeScript can't find them. 

**Fix**:
1. Restart the Metro bundler (press 'r' in the terminal)
2. Clear cache: `npm start -- --reset-cache`

### Error: USE_MOCK_DATA is not defined

**Solution**: Make sure `mockConfig.ts` exists at `mobile/src/__mocks__/mockConfig.ts`

### Error: mockCategories is not exported

**Solution**: Make sure `mockData.ts` exists at `mobile/src/__mocks__/mockData.ts`

### Services still calling real API

**Solution**: 
1. Check that `USE_MOCK_DATA = true` in `mockConfig.ts`
2. Verify the service files have been updated with mock data support
3. Restart Expo with cache clear: `npm start -- --reset-cache`

## Switching Back to Real API

To disable mock data and use real Supabase API:

1. Open `mobile/src/__mocks__/mockConfig.ts`
2. Set `USE_MOCK_DATA = false`
3. Restart Expo

## Testing Checklist

- [ ] Category switcher displays all 5 options
- [ ] Switching categories updates dashboard metrics instantly (< 200ms)
- [ ] UI labels change based on selected category
- [ ] "Guards" shows 20 personnel
- [ ] "Gunman Personnel" shows 15 personnel
- [ ] "Bouncers" shows 10 personnel
- [ ] "Helpers / Housekeeping" shows 15 personnel
- [ ] "All Personnel" shows 60 personnel
- [ ] Attendance overview updates with category filter
- [ ] Activity feed filters by category
- [ ] No loading spinners when switching categories (data is cached)

## Mock Data Files

- `mobile/src/__mocks__/mockConfig.ts` - Configuration (enable/disable mock mode)
- `mobile/src/__mocks__/mockData.ts` - Mock data (categories, personnel, attendance)

## Modified Service Files

The following services have been updated to support mock data:
- `mobile/src/api/workforceCategoryService.ts`
- `mobile/src/api/workforcePersonnelService.ts`
- `mobile/src/api/dashboardService.ts`
- `mobile/src/api/attendanceService.ts` (partially)

## Notes

- Mock data simulates 300ms network delay for realistic testing
- All personnel have realistic Indian names, phone numbers, and addresses
- Attendance records are generated for today's date
- Category IDs match the expected format from the database schema

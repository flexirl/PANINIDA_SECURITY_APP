/**
 * Mock Data for Personnel Category Filtering Testing
 * 
 * This file provides comprehensive mock data for testing the admin module
 * with all category groups: Guards, Gunman Personnel, Bouncers, Helpers/Housekeeping
 */

import type { WorkforceCategory, WorkforcePersonnel, EmploymentStatus, ShiftType } from '../types/workforce';

// ============================================================================
// WORKFORCE CATEGORIES
// ============================================================================

export const mockCategories: WorkforceCategory[] = [
  {
    id: 'cat-guard-001',
    name: 'Guard',
    prefix_code: 'PIS',
    attendance_required: true,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-gunman-001',
    name: 'Gunman',
    prefix_code: 'GM',
    attendance_required: true,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-rifleman-001',
    name: 'Rifleman',
    prefix_code: 'RM',
    attendance_required: true,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-pso-001',
    name: 'PSO',
    prefix_code: 'PSO',
    attendance_required: true,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-bouncer-001',
    name: 'Bouncer',
    prefix_code: 'BNC',
    attendance_required: true,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-housekeeping-001',
    name: 'Housekeeping',
    prefix_code: 'HK',
    attendance_required: false,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-sweeper-001',
    name: 'Sweeper',
    prefix_code: 'SWP',
    attendance_required: false,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-gardener-001',
    name: 'Gardener',
    prefix_code: 'GRD',
    attendance_required: false,
    is_system_defined: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// WORKFORCE PERSONNEL - GUARDS (20 personnel)
// ============================================================================

export const mockGuards: WorkforcePersonnel[] = [
  {
    id: 'guard-001',
    user_id: 'user-guard-001',
    category_id: 'cat-guard-001',
    employee_id: 'PIS-001',
    name: 'Rajesh Kumar',
    phone: '+919876543210',
    photo_url: 'https://i.pravatar.cc/150?img=1',
    base_salary: 18000,
    joining_date: '2023-01-15',
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: 'Sunita Kumar',
    emergency_contact_phone: '+919876543211',
    bank_account_number: '1234567890',
    bank_ifsc: 'SBIN0001234',
    bank_name: 'State Bank of India',
    aadhaar_number: '1234-5678-9012',
    pan_number: 'ABCDE1234F',
    address: 'Sector 15, Noida, UP',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z',
    category: mockCategories[0],
  },
  {
    id: 'guard-002',
    user_id: 'user-guard-002',
    category_id: 'cat-guard-001',
    employee_id: 'PIS-002',
    name: 'Amit Singh',
    phone: '+919876543220',
    photo_url: 'https://i.pravatar.cc/150?img=2',
    base_salary: 17500,
    joining_date: '2023-02-01',
    shift_type: 'night' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: 'Priya Singh',
    emergency_contact_phone: '+919876543221',
    bank_account_number: '2345678901',
    bank_ifsc: 'HDFC0001234',
    bank_name: 'HDFC Bank',
    aadhaar_number: '2345-6789-0123',
    pan_number: 'BCDEF2345G',
    address: 'Sector 22, Gurgaon, HR',
    created_at: '2023-02-01T00:00:00Z',
    updated_at: '2023-02-01T00:00:00Z',
    category: mockCategories[0],
  },
  {
    id: 'guard-003',
    user_id: 'user-guard-003',
    category_id: 'cat-guard-001',
    employee_id: 'PIS-003',
    name: 'Vikram Sharma',
    phone: '+919876543230',
    photo_url: 'https://i.pravatar.cc/150?img=3',
    base_salary: 19000,
    joining_date: '2023-03-10',
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: 'Anjali Sharma',
    emergency_contact_phone: '+919876543231',
    bank_account_number: '3456789012',
    bank_ifsc: 'ICIC0001234',
    bank_name: 'ICICI Bank',
    aadhaar_number: '3456-7890-1234',
    pan_number: 'CDEFG3456H',
    address: 'Dwarka, New Delhi',
    created_at: '2023-03-10T00:00:00Z',
    updated_at: '2023-03-10T00:00:00Z',
    category: mockCategories[0],
  },
  // Add 17 more guards with similar structure
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `guard-${String(i + 4).padStart(3, '0')}`,
    user_id: `user-guard-${String(i + 4).padStart(3, '0')}`,
    category_id: 'cat-guard-001',
    employee_id: `PIS-${String(i + 4).padStart(3, '0')}`,
    name: `Guard ${i + 4}`,
    phone: `+9198765432${String(i + 40).padStart(2, '0')}`,
    photo_url: `https://i.pravatar.cc/150?img=${i + 4}`,
    base_salary: 17000 + (i * 500),
    joining_date: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-15`,
    shift_type: (i % 2 === 0 ? 'day' : 'night') as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: `Emergency Contact ${i + 4}`,
    emergency_contact_phone: `+9198765432${String(i + 41).padStart(2, '0')}`,
    bank_account_number: `${i + 4}456789012`,
    bank_ifsc: 'SBIN0001234',
    bank_name: 'State Bank of India',
    aadhaar_number: `${i + 4}456-7890-1234`,
    pan_number: `ABCDE${i + 4}234F`,
    address: `Address ${i + 4}, Delhi NCR`,
    created_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-15T00:00:00Z`,
    updated_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-15T00:00:00Z`,
    category: mockCategories[0],
  })),
];

// ============================================================================
// WORKFORCE PERSONNEL - GUNMAN PERSONNEL (15 personnel)
// ============================================================================

export const mockGunmen: WorkforcePersonnel[] = [
  {
    id: 'gunman-001',
    user_id: 'user-gunman-001',
    category_id: 'cat-gunman-001',
    employee_id: 'GM-001',
    name: 'Suresh Yadav',
    phone: '+919876544210',
    photo_url: 'https://i.pravatar.cc/150?img=21',
    base_salary: 25000,
    joining_date: '2023-01-20',
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: 'Rekha Yadav',
    emergency_contact_phone: '+919876544211',
    bank_account_number: '4567890123',
    bank_ifsc: 'SBIN0002345',
    bank_name: 'State Bank of India',
    aadhaar_number: '4567-8901-2345',
    pan_number: 'DEFGH4567I',
    address: 'Rohini, New Delhi',
    created_at: '2023-01-20T00:00:00Z',
    updated_at: '2023-01-20T00:00:00Z',
    category: mockCategories[1],
  },
  {
    id: 'rifleman-001',
    user_id: 'user-rifleman-001',
    category_id: 'cat-rifleman-001',
    employee_id: 'RM-001',
    name: 'Mahesh Verma',
    phone: '+919876544220',
    photo_url: 'https://i.pravatar.cc/150?img=22',
    base_salary: 27000,
    joining_date: '2023-02-10',
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: 'Geeta Verma',
    emergency_contact_phone: '+919876544221',
    bank_account_number: '5678901234',
    bank_ifsc: 'HDFC0002345',
    bank_name: 'HDFC Bank',
    aadhaar_number: '5678-9012-3456',
    pan_number: 'EFGHI5678J',
    address: 'Vasant Kunj, New Delhi',
    created_at: '2023-02-10T00:00:00Z',
    updated_at: '2023-02-10T00:00:00Z',
    category: mockCategories[2],
  },
  {
    id: 'pso-001',
    user_id: 'user-pso-001',
    category_id: 'cat-pso-001',
    employee_id: 'PSO-001',
    name: 'Ramesh Gupta',
    phone: '+919876544230',
    photo_url: 'https://i.pravatar.cc/150?img=23',
    base_salary: 30000,
    joining_date: '2023-03-05',
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: 'Kavita Gupta',
    emergency_contact_phone: '+919876544231',
    bank_account_number: '6789012345',
    bank_ifsc: 'ICIC0002345',
    bank_name: 'ICICI Bank',
    aadhaar_number: '6789-0123-4567',
    pan_number: 'FGHIJ6789K',
    address: 'Saket, New Delhi',
    created_at: '2023-03-05T00:00:00Z',
    updated_at: '2023-03-05T00:00:00Z',
    category: mockCategories[3],
  },
  // Add 12 more gunman personnel
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `gunman-${String(i + 2).padStart(3, '0')}`,
    user_id: `user-gunman-${String(i + 2).padStart(3, '0')}`,
    category_id: i % 3 === 0 ? 'cat-gunman-001' : i % 3 === 1 ? 'cat-rifleman-001' : 'cat-pso-001',
    employee_id: `${i % 3 === 0 ? 'GM' : i % 3 === 1 ? 'RM' : 'PSO'}-${String(Math.floor(i / 3) + 2).padStart(3, '0')}`,
    name: `Gunman Personnel ${i + 2}`,
    phone: `+9198765442${String(i + 40).padStart(2, '0')}`,
    photo_url: `https://i.pravatar.cc/150?img=${i + 24}`,
    base_salary: 25000 + (i * 1000),
    joining_date: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-20`,
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: `Emergency Contact ${i + 24}`,
    emergency_contact_phone: `+9198765442${String(i + 41).padStart(2, '0')}`,
    bank_account_number: `${i + 7}789012345`,
    bank_ifsc: 'SBIN0002345',
    bank_name: 'State Bank of India',
    aadhaar_number: `${i + 7}789-0123-4567`,
    pan_number: `GHIJK${i + 7}890L`,
    address: `Address ${i + 24}, Delhi NCR`,
    created_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-20T00:00:00Z`,
    updated_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-20T00:00:00Z`,
    category: mockCategories[i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3],
  })),
];

// ============================================================================
// WORKFORCE PERSONNEL - BOUNCERS (10 personnel)
// ============================================================================

export const mockBouncers: WorkforcePersonnel[] = Array.from({ length: 10 }, (_, i) => ({
  id: `bouncer-${String(i + 1).padStart(3, '0')}`,
  user_id: `user-bouncer-${String(i + 1).padStart(3, '0')}`,
  category_id: 'cat-bouncer-001',
  employee_id: `BNC-${String(i + 1).padStart(3, '0')}`,
  name: `Bouncer ${i + 1}`,
  phone: `+9198765453${String(i + 10).padStart(2, '0')}`,
  photo_url: `https://i.pravatar.cc/150?img=${i + 40}`,
  base_salary: 22000 + (i * 800),
  joining_date: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-25`,
  shift_type: (i % 2 === 0 ? 'day' : 'night') as ShiftType,
  employment_status: 'active' as EmploymentStatus,
  emergency_contact_name: `Emergency Contact ${i + 40}`,
  emergency_contact_phone: `+9198765453${String(i + 11).padStart(2, '0')}`,
  bank_account_number: `${i + 8}890123456`,
  bank_ifsc: 'HDFC0003456',
  bank_name: 'HDFC Bank',
  aadhaar_number: `${i + 8}890-1234-5678`,
  pan_number: `HIJKL${i + 8}901M`,
  address: `Address ${i + 40}, Delhi NCR`,
  created_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-25T00:00:00Z`,
  updated_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-25T00:00:00Z`,
  category: mockCategories[4],
}));

// ============================================================================
// WORKFORCE PERSONNEL - HELPERS/HOUSEKEEPING (15 personnel)
// ============================================================================

export const mockHelpers: WorkforcePersonnel[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `housekeeping-${String(i + 1).padStart(3, '0')}`,
    user_id: `user-housekeeping-${String(i + 1).padStart(3, '0')}`,
    category_id: 'cat-housekeeping-001',
    employee_id: `HK-${String(i + 1).padStart(3, '0')}`,
    name: `Housekeeping Staff ${i + 1}`,
    phone: `+9198765464${String(i + 10).padStart(2, '0')}`,
    photo_url: `https://i.pravatar.cc/150?img=${i + 50}`,
    base_salary: 15000 + (i * 500),
    joining_date: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-28`,
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: `Emergency Contact ${i + 50}`,
    emergency_contact_phone: `+9198765464${String(i + 11).padStart(2, '0')}`,
    bank_account_number: `${i + 9}901234567`,
    bank_ifsc: 'ICIC0003456',
    bank_name: 'ICICI Bank',
    aadhaar_number: `${i + 9}901-2345-6789`,
    pan_number: `IJKLM${i + 9}012N`,
    address: `Address ${i + 50}, Delhi NCR`,
    created_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-28T00:00:00Z`,
    updated_at: `2023-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-28T00:00:00Z`,
    category: mockCategories[5],
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `sweeper-${String(i + 1).padStart(3, '0')}`,
    user_id: `user-sweeper-${String(i + 1).padStart(3, '0')}`,
    category_id: 'cat-sweeper-001',
    employee_id: `SWP-${String(i + 1).padStart(3, '0')}`,
    name: `Sweeper ${i + 1}`,
    phone: `+9198765475${String(i + 10).padStart(2, '0')}`,
    photo_url: `https://i.pravatar.cc/150?img=${i + 58}`,
    base_salary: 14000 + (i * 500),
    joining_date: `2023-${String(Math.floor(i / 2) + 2).padStart(2, '0')}-05`,
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: `Emergency Contact ${i + 58}`,
    emergency_contact_phone: `+9198765475${String(i + 11).padStart(2, '0')}`,
    bank_account_number: `${i + 10}012345678`,
    bank_ifsc: 'SBIN0004567',
    bank_name: 'State Bank of India',
    aadhaar_number: `${i + 10}012-3456-7890`,
    pan_number: `JKLMN${i + 10}123O`,
    address: `Address ${i + 58}, Delhi NCR`,
    created_at: `2023-${String(Math.floor(i / 2) + 2).padStart(2, '0')}-05T00:00:00Z`,
    updated_at: `2023-${String(Math.floor(i / 2) + 2).padStart(2, '0')}-05T00:00:00Z`,
    category: mockCategories[6],
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `gardener-${String(i + 1).padStart(3, '0')}`,
    user_id: `user-gardener-${String(i + 1).padStart(3, '0')}`,
    category_id: 'cat-gardener-001',
    employee_id: `GRD-${String(i + 1).padStart(3, '0')}`,
    name: `Gardener ${i + 1}`,
    phone: `+9198765486${String(i + 10).padStart(2, '0')}`,
    photo_url: `https://i.pravatar.cc/150?img=${i + 62}`,
    base_salary: 16000 + (i * 500),
    joining_date: `2023-${String(Math.floor(i / 2) + 3).padStart(2, '0')}-10`,
    shift_type: 'day' as ShiftType,
    employment_status: 'active' as EmploymentStatus,
    emergency_contact_name: `Emergency Contact ${i + 62}`,
    emergency_contact_phone: `+9198765486${String(i + 11).padStart(2, '0')}`,
    bank_account_number: `${i + 11}123456789`,
    bank_ifsc: 'HDFC0004567',
    bank_name: 'HDFC Bank',
    aadhaar_number: `${i + 11}123-4567-8901`,
    pan_number: `KLMNO${i + 11}234P`,
    address: `Address ${i + 62}, Delhi NCR`,
    created_at: `2023-${String(Math.floor(i / 2) + 3).padStart(2, '0')}-10T00:00:00Z`,
    updated_at: `2023-${String(Math.floor(i / 2) + 3).padStart(2, '0')}-10T00:00:00Z`,
    category: mockCategories[7],
  })),
];

// ============================================================================
// ALL PERSONNEL COMBINED
// ============================================================================

export const mockAllPersonnel: WorkforcePersonnel[] = [
  ...mockGuards,
  ...mockGunmen,
  ...mockBouncers,
  ...mockHelpers,
];

// ============================================================================
// ATTENDANCE RECORDS (Today's attendance for all personnel)
// ============================================================================

export const mockAttendanceRecords = mockAllPersonnel.map((personnel, index) => {
  const statuses = ['present', 'present', 'present', 'late', 'absent']; // 60% present, 20% late, 20% absent
  const status = statuses[index % statuses.length];
  
  const today = new Date();
  const checkInTime = status !== 'absent' 
    ? new Date(today.setHours(9, index % 60, 0, 0)).toISOString()
    : null;

  return {
    id: `attendance-${personnel.id}`,
    personnel_id: personnel.id,
    attendance_date: new Date().toISOString().split('T')[0],
    status,
    check_in_time: checkInTime,
    check_in_location: status !== 'absent' ? { lat: 28.6139 + (index * 0.001), lng: 77.2090 + (index * 0.001) } : null,
    check_in_selfie: status !== 'absent' ? personnel.photo_url : null,
    check_out_time: null,
    check_out_location: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    guards: personnel,
    personnel: personnel,
  };
});

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export const mockDashboardOverview = {
  guards: {
    total: mockAllPersonnel.length,
    active: mockAllPersonnel.filter(p => p.employment_status === 'active').length,
    assigned: Math.floor(mockAllPersonnel.length * 0.85), // 85% assigned
  },
  sites: {
    total: 25,
    active: 23,
  },
  today: {
    present: mockAttendanceRecords.filter(a => a.status === 'present').length,
    late: mockAttendanceRecords.filter(a => a.status === 'late').length,
    absent: mockAttendanceRecords.filter(a => a.status === 'absent').length,
  },
  payroll: {
    pending: 8,
  },
  recruitment: {
    active_candidates: 12,
  },
  incidents: {
    last_7_days: 3,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get personnel filtered by category IDs
 */
export function getPersonnelByCategory(categoryIds: string[]): WorkforcePersonnel[] {
  if (categoryIds.length === 0) {
    return mockAllPersonnel; // Empty array means "all"
  }
  return mockAllPersonnel.filter(p => categoryIds.includes(p.category_id));
}

/**
 * Get attendance filtered by category IDs
 */
export function getAttendanceByCategory(categoryIds: string[]): any[] {
  if (categoryIds.length === 0) {
    return mockAttendanceRecords; // Empty array means "all"
  }
  return mockAttendanceRecords.filter(a => {
    const personnel = mockAllPersonnel.find(p => p.id === a.personnel_id);
    return personnel && categoryIds.includes(personnel.category_id);
  });
}

/**
 * Get dashboard overview filtered by category IDs
 */
export function getDashboardOverviewByCategory(categoryIds: string[]): typeof mockDashboardOverview {
  const filteredPersonnel = getPersonnelByCategory(categoryIds);
  const filteredAttendance = getAttendanceByCategory(categoryIds);

  return {
    guards: {
      total: filteredPersonnel.length,
      active: filteredPersonnel.filter(p => p.employment_status === 'active').length,
      assigned: Math.floor(filteredPersonnel.length * 0.85),
    },
    sites: mockDashboardOverview.sites, // Sites don't change with category filter
    today: {
      present: filteredAttendance.filter(a => a.status === 'present').length,
      late: filteredAttendance.filter(a => a.status === 'late').length,
      absent: filteredAttendance.filter(a => a.status === 'absent').length,
    },
    payroll: mockDashboardOverview.payroll, // Payroll doesn't change with category filter
    recruitment: mockDashboardOverview.recruitment,
    incidents: mockDashboardOverview.incidents,
  };
}

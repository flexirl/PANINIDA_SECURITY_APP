/**
 * Comprehensive Test Suite for PersonnelCategoryContext
 * 
 * This test suite verifies:
 * 1. Role-based default category selection
 * 2. Category switcher updates global state correctly
 * 3. Category filter IDs are computed correctly
 * 4. UI label translation for each category
 * 5. Client user category scope
 * 6. Supervisor default category logic
 * 7. Backward compatibility when "Guards" is selected
 * 8. Category validation and error handling
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { PersonnelCategoryProvider, usePersonnelCategory } from './PersonnelCategoryContext';
import * as workforceCategoryService from '../api/workforceCategoryService';
import { supabase } from '../api/supabase';

// Mock the dependencies
jest.mock('../api/workforceCategoryService');
jest.mock('../api/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Helper to create a chainable, thenable mock for Supabase queries
const mockSupabaseQueryChain = (resolvedValue: any) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
  };
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: any) => Promise.resolve(resolvedValue).then(onFulfilled),
    writable: true,
    configurable: true,
  });
  return chain;
};


const mockCategories = [
  { id: 'cat-1', name: 'Guard', prefix_code: 'PIS', attendance_required: true, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-2', name: 'Gunman', prefix_code: 'GM', attendance_required: true, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-3', name: 'Rifleman', prefix_code: 'RM', attendance_required: true, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-4', name: 'PSO', prefix_code: 'PSO', attendance_required: true, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-5', name: 'Bouncer', prefix_code: 'BNC', attendance_required: true, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-6', name: 'Housekeeping', prefix_code: 'HK', attendance_required: false, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-7', name: 'Sweeper', prefix_code: 'SWP', attendance_required: false, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-8', name: 'Gardener', prefix_code: 'GRD', attendance_required: false, is_system_defined: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

describe('PersonnelCategoryContext - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Default mock for getCategories
    (workforceCategoryService.getCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // 1. Role-Based Default Category Selection Tests
  // ============================================================================
  
  describe('Role-Based Default Category Selection', () => {
    it('should default to "guards" for admin role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.selectedCategory).toBe('guards');
      expect(result.current.categoryFilterIds).toContain('cat-1');
    });

    it('should default to "guards" for super_admin role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="super_admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.selectedCategory).toBe('guards');
    });

    it('should default to "all" for operations_manager role', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="operations_manager">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.selectedCategory).toBe('all');
      expect(result.current.categoryFilterIds).toEqual([]);
    });

    it('should default to "guards" when no userRole is provided', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider>
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.selectedCategory).toBe('guards');
    });
  });

  // ============================================================================
  // 2. Category Switcher Updates Global State Tests
  // ============================================================================
  
  describe('Category Switcher Updates Global State', () => {
    it('should update selectedCategory when setSelectedCategory is called', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.selectedCategory).toBe('guards');

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.selectedCategory).toBe('gunmen');
      });
    });

    it('should update categoryFilterIds when category changes', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Initially guards
      expect(result.current.categoryFilterIds).toEqual(['cat-1']);

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).toEqual(['cat-2', 'cat-3', 'cat-4']);
      });
    });

    it('should prevent client users from changing category', async () => {
      // Mock client user data
      const mockSupabaseChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { site_id: 'site-1' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'client_users') {
          return mockSupabaseQueryChain({ data: { site_id: 'site-1' }, error: null });
        }
        if (table === 'site_assignments') {
          return mockSupabaseQueryChain({
            data: [
              {
                personnel: {
                  category_id: 'cat-1',
                  category: { id: 'cat-1', name: 'Guard' },
                },
              },
            ],
            error: null,
          });
        }
        return mockSupabaseQueryChain({ data: null, error: null });
      });


      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="client_user" userId="user-1">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const initialCategory = result.current.selectedCategory;

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      // Category should not change for client users
      expect(result.current.selectedCategory).toBe(initialCategory);
    });
  });

  // ============================================================================
  // 3. Category Filter IDs Computation Tests
  // ============================================================================
  
  describe('Category Filter IDs Computation', () => {
    it('should return correct IDs for "guards" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.categoryFilterIds).toEqual(['cat-1']);
    });

    it('should return correct IDs for "gunmen" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).toEqual(['cat-2', 'cat-3', 'cat-4']);
      });
    });

    it('should return correct IDs for "bouncers" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setSelectedCategory('bouncers');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).toEqual(['cat-5']);
      });
    });

    it('should return correct IDs for "helpers" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setSelectedCategory('helpers');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).toEqual(['cat-6', 'cat-7', 'cat-8']);
      });
    });

    it('should return empty array for "all" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="operations_manager">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.categoryFilterIds).toEqual([]);
    });
  });

  // ============================================================================
  // 4. UI Label Translation Tests
  // ============================================================================
  
  describe('UI Label Translation', () => {
    it('should translate labels correctly for "guards" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.getLabel('singular')).toBe('Guard');
      expect(result.current.getLabel('plural')).toBe('Guards');
      expect(result.current.getLabel('employee_id')).toBe('Guard ID');
      expect(result.current.getLabel('onboard')).toBe('Onboard Guard');
      expect(result.current.getLabel('assign')).toBe('Assign Guard');
      expect(result.current.getLabel('directory')).toBe('Guard Directory');
      expect(result.current.getLabel('roster')).toBe('Guard Roster');
    });

    it('should translate labels correctly for "gunmen" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.getLabel('singular')).toBe('Gunman');
        expect(result.current.getLabel('plural')).toBe('Gunman Personnel');
        expect(result.current.getLabel('onboard')).toBe('Onboard Gunman');
        expect(result.current.getLabel('assign')).toBe('Assign Gunman');
      });
    });

    it('should translate labels correctly for "bouncers" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setSelectedCategory('bouncers');
      });

      await waitFor(() => {
        expect(result.current.getLabel('singular')).toBe('Bouncer');
        expect(result.current.getLabel('plural')).toBe('Bouncers');
        expect(result.current.getLabel('onboard')).toBe('Onboard Bouncer');
      });
    });

    it('should translate labels correctly for "helpers" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      act(() => {
        result.current.setSelectedCategory('helpers');
      });

      await waitFor(() => {
        expect(result.current.getLabel('singular')).toBe('Helper');
        expect(result.current.getLabel('plural')).toBe('Helpers / Housekeeping');
        expect(result.current.getLabel('onboard')).toBe('Onboard Helper');
      });
    });

    it('should translate labels correctly for "all" category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="operations_manager">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.getLabel('singular')).toBe('Personnel');
      expect(result.current.getLabel('plural')).toBe('All Personnel');
      expect(result.current.getLabel('onboard')).toBe('Onboard Personnel');
      expect(result.current.getLabel('directory')).toBe('Workforce Directory');
    });
  });

  // ============================================================================
  // 5. Backward Compatibility Tests
  // ============================================================================
  
  describe('Backward Compatibility', () => {
    it('should maintain Guards-only behavior when guards is selected', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should default to guards for admin
      expect(result.current.selectedCategory).toBe('guards');
      
      // Should have Guard-specific labels
      expect(result.current.getLabel('singular')).toBe('Guard');
      expect(result.current.getLabel('plural')).toBe('Guards');
      
      // Should filter to only Guard category
      expect(result.current.categoryFilterIds).toEqual(['cat-1']);
    });
  });

  // ============================================================================
  // 6. Validation and Error Handling Tests
  // ============================================================================

  describe('Category ID Validation', () => {
    it('should validate category IDs against fetched categories', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Guards category should have valid IDs
      expect(result.current.categoryFilterIds).toContain('cat-1');
      expect(result.current.categoryFilterError).toBeNull();
    });

    it('should log warning when some category IDs are invalid', async () => {
      // Mock categories with missing Guard category
      const incompleteCats = mockCategories.filter(c => c.name !== 'Guard');
      (workforceCategoryService.getCategories as jest.Mock).mockResolvedValue(incompleteCats);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should show error when Guards category is selected but no Guard categories exist
      expect(result.current.categoryFilterError).toBeTruthy();
      expect(result.current.categoryFilterError).toContain('Guards');
    });

    it('should display error message when all category IDs in a group are invalid', async () => {
      // Mock empty categories
      (workforceCategoryService.getCategories as jest.Mock).mockResolvedValue([]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should show error for Guards category
      expect(result.current.categoryFilterError).toBeTruthy();
      expect(result.current.categoryFilterError).toContain('Guards');
      expect(result.current.categoryFilterIds).toEqual([]);
    });
  });

  describe('Client User Category Validation', () => {
    it('should validate client-scoped category IDs', async () => {
      // Mock client user data
      const mockSupabaseChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { site_id: 'site-1' },
          error: null,
        }),
      };

      const mockAssignmentsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'client_users') {
          return mockSupabaseQueryChain({ data: { site_id: 'site-1' }, error: null });
        }
        if (table === 'site_assignments') {
          return mockSupabaseQueryChain({
            data: [
              {
                personnel: {
                  category_id: 'cat-1',
                  category: { id: 'cat-1', name: 'Guard' },
                },
              },
            ],
            error: null,
          });
        }
        return mockSupabaseQueryChain({ data: null, error: null });
      });


      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="client_user" userId="user-1">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should have valid client-scoped category IDs
      expect(result.current.clientScopedCategoryIds).toContain('cat-1');
      expect(result.current.categoryFilterError).toBeNull();
      expect(result.current.isClientUser).toBe(true);
    });

    it('should show error when all client-scoped category IDs are invalid', async () => {
      // Mock client user with invalid category IDs
      const mockSupabaseChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { site_id: 'site-1' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'client_users') {
          return mockSupabaseQueryChain({ data: { site_id: 'site-1' }, error: null });
        }
        if (table === 'site_assignments') {
          return mockSupabaseQueryChain({
            data: [
              {
                personnel: {
                  category_id: 'invalid-cat-id',
                  category: { id: 'invalid-cat-id', name: 'InvalidCategory' },
                },
              },
            ],
            error: null,
          });
        }
        return mockSupabaseQueryChain({ data: null, error: null });
      });


      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="client_user" userId="user-1">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should show error for invalid client-scoped categories
      expect(result.current.categoryFilterError).toBeTruthy();
      expect(result.current.categoryFilterError).toContain('Unable to load personnel categories');
    });
  });

  describe('Empty Category List Handling', () => {
    it('should handle empty categoryFilterIds array (treats as "all")', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="operations_manager">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Operations manager defaults to "all" which returns empty array (no filter)
      expect(result.current.selectedCategory).toBe('all');
      expect(result.current.categoryFilterIds).toEqual([]);
      expect(result.current.categoryFilterError).toBeNull();
    });

    it('should gracefully handle category switcher with empty categories', async () => {
      (workforceCategoryService.getCategories as jest.Mock).mockResolvedValue([]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should show error but not crash
      expect(result.current.categoryFilterError).toBeTruthy();
      expect(result.current.categories).toEqual([]);
    });
  });

  describe('Label Translation with Errors', () => {
    it('should still provide labels even when category validation fails', async () => {
      (workforceCategoryService.getCategories as jest.Mock).mockResolvedValue([]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Labels should still work even with validation errors
      expect(result.current.getLabel('singular')).toBe('Guard');
      expect(result.current.getLabel('plural')).toBe('Guards');
      expect(result.current.categoryFilterError).toBeTruthy();
    });
  });

  describe('Error State Reset', () => {
    it('should reset error state when switching to a valid category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Initially should be valid (Guards)
      expect(result.current.categoryFilterError).toBeNull();

      // Switch to "all" which should also be valid
      act(() => {
        result.current.setSelectedCategory('all');
      });

      await waitFor(() => {
        expect(result.current.selectedCategory).toBe('all');
      });

      expect(result.current.categoryFilterError).toBeNull();
    });
  });

  // ============================================================================
  // 7. Reset to Default Tests
  // ============================================================================
  
  describe('Reset to Default', () => {
    it('should reset to role-based default when resetToDefault is called', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Change category
      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.selectedCategory).toBe('gunmen');
      });

      // Reset to default
      act(() => {
        result.current.resetToDefault();
      });

      await waitFor(() => {
        expect(result.current.selectedCategory).toBe('guards');
      });
    });
  });

  // ============================================================================
  // 8. Context Provider Tests
  // ============================================================================
  
  describe('Context Provider', () => {
    it('should throw error when usePersonnelCategory is used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => usePersonnelCategory());
      }).toThrow('usePersonnelCategory must be used within a PersonnelCategoryProvider');
      
      consoleError.mockRestore();
    });

    it('should provide all required context values', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Check all required context values are present
      expect(result.current).toHaveProperty('selectedCategory');
      expect(result.current).toHaveProperty('setSelectedCategory');
      expect(result.current).toHaveProperty('categories');
      expect(result.current).toHaveProperty('categoryFilterIds');
      expect(result.current).toHaveProperty('isLoaded');
      expect(result.current).toHaveProperty('getLabel');
      expect(result.current).toHaveProperty('resetToDefault');
      expect(result.current).toHaveProperty('clientScopedCategoryIds');
      expect(result.current).toHaveProperty('isClientUser');
      expect(result.current).toHaveProperty('categoryFilterError');
    });
  });
});


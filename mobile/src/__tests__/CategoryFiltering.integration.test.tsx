/**
 * Integration Test Suite for Category Filtering
 * 
 * This test suite verifies category filtering works correctly across:
 * 1. All screens filter data by active category
 * 2. Frontend metric recalculation accuracy
 * 3. Client users see correct category scope
 * 4. Supervisors see correct default category
 * 5. Performance (category switch < 200ms)
 * 6. Category filter persists during navigation
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { PersonnelCategoryProvider, usePersonnelCategory } from '../context/PersonnelCategoryContext';
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

describe('Category Filtering Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    (workforceCategoryService.getCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // 1. All Screens Filter Data by Active Category
  // ============================================================================
  
  describe('Data Filtering Across Screens', () => {
    it('should filter personnel data by selected category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Guards selected - should only include Guard category
      expect(result.current.categoryFilterIds).toEqual(['cat-1']);

      // Switch to Gunman Personnel
      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).toEqual(['cat-2', 'cat-3', 'cat-4']);
      });

      // Switch to All Personnel - should return empty array (no filter)
      act(() => {
        result.current.setSelectedCategory('all');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).toEqual([]);
      });
    });

    it('should maintain consistent filter IDs across multiple category switches', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Test multiple switches
      const categoryTests = [
        { category: 'guards' as const, expectedIds: ['cat-1'] },
        { category: 'gunmen' as const, expectedIds: ['cat-2', 'cat-3', 'cat-4'] },
        { category: 'bouncers' as const, expectedIds: ['cat-5'] },
        { category: 'helpers' as const, expectedIds: ['cat-6', 'cat-7', 'cat-8'] },
        { category: 'all' as const, expectedIds: [] },
      ];

      for (const test of categoryTests) {
        act(() => {
          result.current.setSelectedCategory(test.category);
        });

        await waitFor(() => {
          expect(result.current.categoryFilterIds).toEqual(test.expectedIds);
        });
      }
    });
  });

  // ============================================================================
  // 2. Frontend Metric Recalculation Accuracy
  // ============================================================================
  
  describe('Frontend Metric Recalculation', () => {
    it('should recalculate metrics when category changes', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Simulate metric recalculation by checking filter IDs change
      const initialFilterIds = result.current.categoryFilterIds;

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds).not.toEqual(initialFilterIds);
      });
    });

    it('should provide correct category IDs for aggregation', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Guards: single category
      expect(result.current.categoryFilterIds.length).toBe(1);

      // Gunman Personnel: multiple categories
      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds.length).toBe(3);
      });

      // Helpers: multiple categories
      act(() => {
        result.current.setSelectedCategory('helpers');
      });

      await waitFor(() => {
        expect(result.current.categoryFilterIds.length).toBe(3);
      });
    });
  });

  // ============================================================================
  // 3. Client Users See Correct Category Scope
  // ============================================================================
  
  describe('Client User Category Scope', () => {
    it('should scope client users to their site categories', async () => {
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
              {
                personnel: {
                  category_id: 'cat-2',
                  category: { id: 'cat-2', name: 'Gunman' },
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

      // Should have client-scoped category IDs
      expect(result.current.clientScopedCategoryIds).toContain('cat-1');
      expect(result.current.clientScopedCategoryIds).toContain('cat-2');
      expect(result.current.isClientUser).toBe(true);
    });

    it('should prevent client users from changing category filter', async () => {
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
      const initialFilterIds = result.current.categoryFilterIds;

      // Attempt to change category
      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      // Category should not change
      expect(result.current.selectedCategory).toBe(initialCategory);
      expect(result.current.categoryFilterIds).toEqual(initialFilterIds);
    });

    it('should use "Workforce" labels for client users with multiple category groups', async () => {
      // Mock client user with multiple category groups
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
              {
                personnel: {
                  category_id: 'cat-6',
                  category: { id: 'cat-6', name: 'Housekeeping' },
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

      // Should default to "all" for multiple category groups
      expect(result.current.selectedCategory).toBe('all');
      
      // Should use "Workforce" labels
      expect(result.current.getLabel('plural')).toBe('Workforce');
      expect(result.current.getLabel('singular')).toBe('Personnel');
    });
  });

  // ============================================================================
  // 4. Supervisors See Correct Default Category
  // ============================================================================
  
  describe('Supervisor Default Category Logic', () => {
    it('should default to single category group when supervisor site has one category', async () => {
      // Mock supervisor data
      const mockSupabaseChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'personnel-1' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'workforce_personnel') {
          return mockSupabaseQueryChain({ data: { id: 'personnel-1' }, error: null });
        }
        if (table === 'site_assignments') {
          const chain = {
            select: jest.fn().mockImplementation((selectStr: string) => {
              let data: any = [];
              if (selectStr.includes('site_id') && !selectStr.includes('personnel')) {
                data = [{ site_id: 'site-1' }];
              } else {
                data = [
                  {
                    personnel: {
                      category_id: 'cat-1',
                      category: { name: 'Guard' },
                    },
                  },
                ];
              }
              return mockSupabaseQueryChain({ data, error: null });
            }),
          };
          return chain;
        }
        return mockSupabaseQueryChain({ data: null, error: null });
      });


      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="supervisor" userId="user-1">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should default to guards
      expect(result.current.selectedCategory).toBe('guards');
    });

    it('should default to "all" when supervisor site has multiple category groups', async () => {
      // Mock supervisor data with multiple categories
      const mockSupabaseChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'personnel-1' },
          error: null,
        }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'workforce_personnel') {
          return mockSupabaseQueryChain({ data: { id: 'personnel-1' }, error: null });
        }
        if (table === 'site_assignments') {
          const chain = {
            select: jest.fn().mockImplementation((selectStr: string) => {
              let data: any = [];
              if (selectStr.includes('site_id') && !selectStr.includes('personnel')) {
                data = [{ site_id: 'site-1' }];
              } else {
                data = [
                  {
                    personnel: {
                      category_id: 'cat-1',
                      category: { name: 'Guard' },
                    },
                  },
                  {
                    personnel: {
                      category_id: 'cat-6',
                      category: { name: 'Housekeeping' },
                    },
                  },
                ];
              }
              return mockSupabaseQueryChain({ data, error: null });
            }),
          };
          return chain;
        }
        return mockSupabaseQueryChain({ data: null, error: null });
      });


      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="supervisor" userId="user-1">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should default to all
      expect(result.current.selectedCategory).toBe('all');
    });
  });

  // ============================================================================
  // 5. Performance Tests
  // ============================================================================
  
  describe('Performance', () => {
    it('should update category within 200ms', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const startTime = Date.now();

      act(() => {
        result.current.setSelectedCategory('gunmen');
      });

      await waitFor(() => {
        expect(result.current.selectedCategory).toBe('gunmen');
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 200ms
      expect(duration).toBeLessThan(200);
    });

    it('should handle rapid category switches without errors', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Rapidly switch categories
      const categories = ['guards', 'gunmen', 'bouncers', 'helpers', 'all'] as const;

      for (const category of categories) {
        act(() => {
          result.current.setSelectedCategory(category);
        });
      }

      // Should end up at the last category
      await waitFor(() => {
        expect(result.current.selectedCategory).toBe('all');
      });

      // Should not have any errors
      expect(result.current.categoryFilterError).toBeNull();
    });
  });

  // ============================================================================
  // 6. Category Filter Persistence During Navigation
  // ============================================================================
  
  describe('Category Filter Persistence', () => {
    it('should maintain selected category across context re-renders', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result, rerender } = renderHook(() => usePersonnelCategory(), { wrapper });

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

      // Rerender
      rerender();

      // Category should persist
      expect(result.current.selectedCategory).toBe('gunmen');
      expect(result.current.categoryFilterIds).toEqual(['cat-2', 'cat-3', 'cat-4']);
    });

    it('should reset to default when resetToDefault is called', async () => {
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
  // 7. Edge Cases and Error Scenarios
  // ============================================================================
  
  describe('Edge Cases', () => {
    it('should handle missing categories gracefully', async () => {
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

      // Should show error
      expect(result.current.categoryFilterError).toBeTruthy();
      
      // Should still provide labels
      expect(result.current.getLabel('singular')).toBe('Guard');
    });

    it('should handle API errors during category fetch', async () => {
      (workforceCategoryService.getCategories as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <PersonnelCategoryProvider userRole="admin">
          {children}
        </PersonnelCategoryProvider>
      );

      const { result } = renderHook(() => usePersonnelCategory(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // Should handle error gracefully
      expect(result.current.categories).toEqual([]);
    });
  });
});

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCategories } from '../api/workforceCategoryService';
import { supabase } from '../api/supabase';
import type { WorkforceCategory, UserRole } from '../types/workforce';

export type CategoryFilterType = 'guards' | 'gunmen' | 'bouncers' | 'helpers' | 'all';

export type LabelType =
  | 'singular'
  | 'plural'
  | 'employee_id'
  | 'onboard'
  | 'assign'
  | 'directory'
  | 'roster';

interface PersonnelCategoryContextType {
  selectedCategory: CategoryFilterType;
  setSelectedCategory: (category: CategoryFilterType) => void;
  categories: WorkforceCategory[];
  categoryFilterIds: string[];
  isLoaded: boolean;
  getLabel: (type: LabelType) => string;
  resetToDefault: () => void;
  clientScopedCategoryIds: string[]; // For client users: specific category IDs at their site
  isClientUser: boolean; // Flag to indicate if current user is a client user
  categoryFilterError: string | null; // Error message if category validation fails
}

const PersonnelCategoryContext = createContext<PersonnelCategoryContextType | undefined>(undefined);

interface PersonnelCategoryProviderProps {
  children: React.ReactNode;
  userRole?: UserRole;
  userId?: string;
}

export const PersonnelCategoryProvider: React.FC<PersonnelCategoryProviderProps> = ({ 
  children, 
  userRole,
  userId 
}) => {
  const [defaultCategory, setDefaultCategory] = useState<CategoryFilterType>('guards');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterType>('guards');
  const [categories, setCategories] = useState<WorkforceCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [clientScopedCategoryIds, setClientScopedCategoryIds] = useState<string[]>([]);
  const [categoryFilterError, setCategoryFilterError] = useState<string | null>(null);

  // Wrapper for setSelectedCategory that prevents client users from changing their category
  const handleSetSelectedCategory = (category: CategoryFilterType) => {
    // Client users cannot change their category filter - it's fixed to their site's deployed categories
    if (userRole === 'client_user') {
      console.warn('Client users cannot change category filter. Category is fixed to site-deployed categories.');
      return;
    }
    setSelectedCategory(category);
  };

  // Fetch categories on mount or when user credentials/role changes
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoaded(false);
        // Defensive check: verify getCategories was imported correctly
        if (typeof getCategories !== 'function') {
          console.error(
            'PersonnelCategoryContext: getCategories is not a function. ' +
            'This may indicate a circular import or bundler issue. ' +
            'Type:', typeof getCategories
          );
          setCategoryFilterError('Failed to initialize category service. Please restart the app.');
          return;
        }

        console.log('PersonnelCategoryContext: Fetching categories...');
        const catData = await getCategories();
        console.log('PersonnelCategoryContext: Fetched categories:', catData.length);
        
        if (catData.length === 0) {
          console.error('PersonnelCategoryContext: No categories found in database. Please run QUICK_START_CATEGORIES.sql in Supabase SQL Editor.');
        }
        
        setCategories(catData);
      } catch (err) {
        console.error('Error fetching categories in PersonnelCategoryContext:', err);
        setCategoryFilterError('Failed to load workforce categories. Please check your connection and try again.');
      } finally {
        setIsLoaded(true);
      }
    };
    fetchCategories();
  }, [userRole, userId]);

  // Determine default category based on user role
  useEffect(() => {
    const determineDefaultCategory = async () => {
      if (!isLoaded) return;

      // If no user role provided (logged out), reset to guards default
      if (!userRole) {
        setDefaultCategory('guards');
        setSelectedCategory('guards');
        return;
      }

      try {
        let defaultCat: CategoryFilterType = 'guards';

        // Admin and Super Admin → Guards
        if (userRole === 'admin' || userRole === 'super_admin') {
          defaultCat = 'guards';
        }
        // Operations Manager → All Personnel
        else if (userRole === 'operations_manager') {
          defaultCat = 'all';
        }
        // Supervisor → Determine by site assignments
        else if (userRole === 'supervisor' && userId) {
          defaultCat = await determineSupervisorDefaultCategory(userId);
        }
        // Client User → Determine by site assignments
        else if (userRole === 'client_user' && userId) {
          defaultCat = await determineClientUserDefaultCategory(userId);
        }
        // Legacy roles and workforce_personnel → Guards (backward compatibility)
        else {
          defaultCat = 'guards';
        }

        setDefaultCategory(defaultCat);
        setSelectedCategory(defaultCat);
      } catch (err) {
        console.error('Error determining default category:', err);
        // Fallback to guards on error
        setDefaultCategory('guards');
        setSelectedCategory('guards');
      }
    };

    determineDefaultCategory();
  }, [userRole, userId, isLoaded]);

  /**
   * Determines the default category for a supervisor based on their assigned sites.
   * If sites have personnel from only one category group, default to that group.
   * If sites have personnel from multiple category groups, default to "All Personnel".
   */
  const determineSupervisorDefaultCategory = async (supervisorUserId: string): Promise<CategoryFilterType> => {
    try {
      // 1. Find the workforce_personnel record for this supervisor
      const { data: personnel, error: personnelError } = await supabase
        .from('workforce_personnel')
        .select('id')
        .eq('user_id', supervisorUserId)
        .single();

      if (personnelError || !personnel) {
        console.warn('Supervisor personnel record not found, defaulting to all');
        return 'all';
      }

      // 2. Get all active site assignments for this supervisor
      const { data: assignments, error: assignmentError } = await supabase
        .from('site_assignments')
        .select('site_id')
        .eq('personnel_id', personnel.id)
        .eq('is_active', true);

      if (assignmentError || !assignments || assignments.length === 0) {
        console.warn('No active site assignments found for supervisor, defaulting to all');
        return 'all';
      }

      const siteIds = assignments.map(a => a.site_id);

      // 3. Get all personnel assigned to these sites with their categories
      const { data: sitePersonnel, error: sitePersonnelError } = await supabase
        .from('site_assignments')
        .select(`
          personnel:workforce_personnel!inner(
            category_id,
            category:workforce_categories(name)
          )
        `)
        .in('site_id', siteIds)
        .eq('is_active', true);

      if (sitePersonnelError || !sitePersonnel || sitePersonnel.length === 0) {
        return 'all';
      }

      // 4. Determine which category groups are present
      const categoryGroups = new Set<CategoryFilterType>();
      
      sitePersonnel.forEach((sp: any) => {
        const categoryName = sp.personnel?.category?.name?.toLowerCase();
        if (!categoryName) return;

        // Map category names to category groups
        if (categoryName.includes('guard')) {
          categoryGroups.add('guards');
        } else if (categoryName.includes('gunman') || categoryName.includes('rifleman') || categoryName.includes('pso')) {
          categoryGroups.add('gunmen');
        } else if (categoryName.includes('bouncer')) {
          categoryGroups.add('bouncers');
        } else {
          // Non-security categories (housekeeping, etc.)
          categoryGroups.add('helpers');
        }
      });

      // 5. If only one category group, return it; otherwise return 'all'
      if (categoryGroups.size === 1) {
        return Array.from(categoryGroups)[0];
      } else {
        return 'all';
      }
    } catch (err) {
      console.error('Error determining supervisor default category:', err);
      return 'all';
    }
  };

  /**
   * Determines the default category for a client user based on their assigned site.
   * Returns the category group(s) deployed at their site and stores the actual category IDs.
   * 
   * IMPORTANT: For client users, the category filter is FIXED for the entire session.
   * They cannot change it via the category switcher (which is hidden for them).
   * All data queries will be automatically scoped to only the categories deployed at their site.
   */
  const determineClientUserDefaultCategory = async (clientUserId: string): Promise<CategoryFilterType> => {
    try {
      // 1. Find the client_user record to get their site_id
      const { data: clientUser, error: clientError } = await supabase
        .from('client_users')
        .select('site_id')
        .eq('user_id', clientUserId)
        .eq('is_active', true)
        .single();

      if (clientError || !clientUser) {
        console.warn('Client user record not found, defaulting to all');
        setClientScopedCategoryIds([]);
        return 'all';
      }

      // 2. Get all personnel assigned to this site with their categories
      const { data: sitePersonnel, error: sitePersonnelError } = await supabase
        .from('site_assignments')
        .select(`
          personnel:workforce_personnel!inner(
            category_id,
            category:workforce_categories(id, name)
          )
        `)
        .eq('site_id', clientUser.site_id)
        .eq('is_active', true);

      if (sitePersonnelError || !sitePersonnel || sitePersonnel.length === 0) {
        setClientScopedCategoryIds([]);
        return 'all';
      }

      // 3. Collect unique category IDs and determine which category groups are present
      const categoryGroups = new Set<CategoryFilterType>();
      const uniqueCategoryIds = new Set<string>();
      
      sitePersonnel.forEach((sp: any) => {
        const categoryId = sp.personnel?.category_id;
        const categoryName = sp.personnel?.category?.name?.toLowerCase();
        
        if (!categoryName || !categoryId) return;

        // Store the actual category ID
        uniqueCategoryIds.add(categoryId);

        // Map category names to category groups
        if (categoryName.includes('guard')) {
          categoryGroups.add('guards');
        } else if (categoryName.includes('gunman') || categoryName.includes('rifleman') || categoryName.includes('pso')) {
          categoryGroups.add('gunmen');
        } else if (categoryName.includes('bouncer')) {
          categoryGroups.add('bouncers');
        } else {
          // Non-security categories (housekeeping, etc.)
          categoryGroups.add('helpers');
        }
      });

      // Store the actual category IDs for this client user
      setClientScopedCategoryIds(Array.from(uniqueCategoryIds));

      // 4. If only one category group, return it; otherwise return 'all'
      if (categoryGroups.size === 1) {
        return Array.from(categoryGroups)[0];
      } else {
        return 'all';
      }
    } catch (err) {
      console.error('Error determining client user default category:', err);
      setClientScopedCategoryIds([]);
      return 'all';
    }
  };

  /**
   * Resets the selected category to the role-based default.
   * Useful for session management and logout scenarios.
   */
  const resetToDefault = () => {
    setSelectedCategory(defaultCategory);
  };

  /**
   * Pure function to compute category filter IDs — no side effects (no setState).
   * This is safe to call inside useMemo.
   */
  const getIdsForCategory = (catType: CategoryFilterType): { ids: string[]; error: string | null } => {
    // For client users, ALWAYS return their site-scoped category IDs regardless of selected category
    // Client users cannot change their category filter - it's fixed to their site's deployed categories
    if (userRole === 'client_user' && clientScopedCategoryIds.length > 0) {
      // Validate that client-scoped category IDs exist in fetched categories
      const validClientIds = clientScopedCategoryIds.filter(id => 
        categories.some(c => c.id === id)
      );
      
      if (validClientIds.length === 0 && clientScopedCategoryIds.length > 0) {
        console.warn('All client-scoped category IDs are invalid. No matching categories found in database.');
        return {
          ids: [],
          error: 'Unable to load personnel categories for your site. Please contact support.',
        };
      } else if (validClientIds.length < clientScopedCategoryIds.length) {
        const invalidIds = clientScopedCategoryIds.filter(id => !validClientIds.includes(id));
        console.warn(`Some client-scoped category IDs are invalid and will be excluded: ${invalidIds.join(', ')}`);
      }
      
      return { ids: validClientIds, error: null };
    }

    let categoryIds: string[] = [];
    
    switch (catType) {
      case 'guards':
        categoryIds = categories.filter(c => c.name.toLowerCase().includes('guard')).map(c => c.id);
        break;
      case 'gunmen':
        categoryIds = categories.filter(c => {
          const n = c.name.toLowerCase();
          return n.includes('gunman') || n.includes('rifleman') || n.includes('pso');
        }).map(c => c.id);
        break;
      case 'bouncers':
        categoryIds = categories.filter(c => c.name.toLowerCase().includes('bouncer')).map(c => c.id);
        break;
      case 'helpers':
        const securityCatNames = ['guard', 'gunman', 'rifleman', 'pso', 'bouncer', 'supervisor', 'officer'];
        categoryIds = categories.filter(c => {
          const n = c.name.toLowerCase();
          return !securityCatNames.some(sn => n.includes(sn));
        }).map(c => c.id);
        break;
      case 'all':
      default:
        return { ids: [], error: null }; // Empty means no filter (shows all)
    }
    
    // Validation: Check if any category IDs were found for the selected group
    // Only warn if categories have actually been loaded (length > 0 means data is available)
    if (categoryIds.length === 0 && catType !== 'all') {
      if (categories.length === 0) {
        // Categories haven't loaded yet — don't warn, just return empty (no filter applied)
        return { ids: [], error: null };
      }

      const categoryGroupNames: Record<CategoryFilterType, string> = {
        guards: 'Guards',
        gunmen: 'Gunman Personnel',
        bouncers: 'Bouncers',
        helpers: 'Helpers/Housekeeping',
        all: 'All Personnel'
      };
      
      console.warn(`No categories found in database for category group "${catType}". This may indicate missing category data.`);
      return {
        ids: [],
        error: `No ${categoryGroupNames[catType]} categories found. Please ensure categories are configured in the system.`,
      };
    }
    
    return { ids: categoryIds, error: null };
  };

  const getLabel = (type: LabelType): string => {
    // For client users with 'all' selected (multiple category groups), use "Workforce" labels
    if (userRole === 'client_user' && selectedCategory === 'all') {
      switch (type) {
        case 'singular': return 'Personnel';
        case 'plural': return 'Workforce';
        case 'employee_id': return 'Employee ID';
        case 'onboard': return 'Onboard Personnel';
        case 'assign': return 'Assign Personnel';
        case 'directory': return 'Workforce Directory';
        case 'roster': return 'Workforce Roster';
      }
    }

    switch (selectedCategory) {
      case 'guards':
        switch (type) {
          case 'singular': return 'Guard';
          case 'plural': return 'Guards';
          case 'employee_id': return 'Guard ID';
          case 'onboard': return 'Onboard Guard';
          case 'assign': return 'Assign Guard';
          case 'directory': return 'Guard Directory';
          case 'roster': return 'Guard Roster';
        }
      case 'gunmen':
        switch (type) {
          case 'singular': return 'Gunman';
          case 'plural': return 'Gunman Personnel';
          case 'employee_id': return 'Gunman ID';
          case 'onboard': return 'Onboard Gunman';
          case 'assign': return 'Assign Gunman';
          case 'directory': return 'Gunman Directory';
          case 'roster': return 'Gunman Roster';
        }
      case 'bouncers':
        switch (type) {
          case 'singular': return 'Bouncer';
          case 'plural': return 'Bouncers';
          case 'employee_id': return 'Bouncer ID';
          case 'onboard': return 'Onboard Bouncer';
          case 'assign': return 'Assign Bouncer';
          case 'directory': return 'Bouncer Directory';
          case 'roster': return 'Bouncer Roster';
        }
      case 'helpers':
        switch (type) {
          case 'singular': return 'Helper';
          case 'plural': return 'Helpers';
          case 'employee_id': return 'Helper ID';
          case 'onboard': return 'Onboard Helper';
          case 'assign': return 'Assign Helper';
          case 'directory': return 'Helper Directory';
          case 'roster': return 'Helper Roster';
        }
      case 'all':
      default:
        switch (type) {
          case 'singular': return 'Personnel';
          case 'plural': return 'All Personnel';
          case 'employee_id': return 'Employee ID';
          case 'onboard': return 'Onboard Personnel';
          case 'assign': return 'Assign Personnel';
          case 'directory': return 'Workforce Directory';
          case 'roster': return 'Workforce Roster';
        }
    }
  };

  // Pure computation — no setState calls inside useMemo
  const categoryFilterResult = React.useMemo(() => {
    return getIdsForCategory(selectedCategory);
  }, [selectedCategory, categories, clientScopedCategoryIds, userRole]);

  const categoryFilterIds = categoryFilterResult.ids;

  // Sync error state via useEffect (side effects belong here, NOT in useMemo)
  useEffect(() => {
    setCategoryFilterError(categoryFilterResult.error);
  }, [categoryFilterResult.error]);

  return (
    <PersonnelCategoryContext.Provider
      value={{
        selectedCategory,
        setSelectedCategory: handleSetSelectedCategory,
        categories,
        categoryFilterIds,
        isLoaded,
        getLabel,
        resetToDefault,
        clientScopedCategoryIds,
        isClientUser: userRole === 'client_user',
        categoryFilterError,
      }}
    >
      {children}
    </PersonnelCategoryContext.Provider>
  );
};

export const usePersonnelCategory = () => {
  const context = useContext(PersonnelCategoryContext);
  if (!context) {
    throw new Error('usePersonnelCategory must be used within a PersonnelCategoryProvider');
  }
  return context;
};

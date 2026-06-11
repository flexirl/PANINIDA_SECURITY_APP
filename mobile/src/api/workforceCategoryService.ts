// =============================================================================
// Workforce Category Service
// =============================================================================
// Task 5: CRUD operations for workforce_categories table.
// Uses direct supabase.from() calls since RLS policies handle access control.
// =============================================================================

import { supabase } from './supabase';
import type { WorkforceCategory } from '../types/workforce';
import { USE_MOCK_DATA, mockDelay } from '../__mocks__/mockConfig';
import { mockCategories } from '../__mocks__/mockData';

/**
 * Task 5.1: Fetches all workforce categories, ordered by name.
 */
export async function getCategories(): Promise<WorkforceCategory[]> {
  // MOCK DATA MODE
  if (USE_MOCK_DATA) {
    await mockDelay();
    return [...mockCategories].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // REAL API MODE
  const { data, error } = await supabase
    .from('workforce_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error.message);
    throw new Error(error.message || 'Failed to retrieve workforce categories');
  }

  return data || [];
}

/**
 * Task 5.2: Fetches a single category by ID.
 */
export async function getCategoryById(id: string): Promise<WorkforceCategory> {
  const { data, error } = await supabase
    .from('workforce_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching category:', error.message);
    throw new Error(error.message || 'Failed to retrieve category');
  }

  if (!data) {
    throw new Error('Category not found');
  }

  return data;
}

/**
 * Task 5.3: Creates a new workforce category.
 * Validates prefix format (^[A-Z]{2,5}$) and checks for duplicate names
 * (case-insensitive) before inserting.
 */
export async function createCategory(data: {
  name: string;
  prefix_code: string;
  attendance_required: boolean;
}): Promise<WorkforceCategory> {
  // Client-side prefix format validation
  const prefixRegex = /^[A-Z]{2,5}$/;
  if (!prefixRegex.test(data.prefix_code)) {
    throw new Error('Prefix code must be 2-5 uppercase letters (A-Z)');
  }

  // Check for duplicate name (case-insensitive)
  const { data: existing } = await supabase
    .from('workforce_categories')
    .select('id')
    .ilike('name', data.name)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error(`A category named "${data.name}" already exists`);
  }

  const { data: created, error } = await supabase
    .from('workforce_categories')
    .insert({
      name: data.name,
      prefix_code: data.prefix_code,
      attendance_required: data.attendance_required,
      is_system_defined: false,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations from the database
    if (error.code === '23505') {
      if (error.message.includes('prefix')) {
        throw new Error(`Prefix code "${data.prefix_code}" is already in use`);
      }
      throw new Error(`A category named "${data.name}" already exists`);
    }
    console.error('Error creating category:', error.message);
    throw new Error(error.message || 'Failed to create category');
  }

  return created;
}

/**
 * Task 5.4: Updates an existing workforce category.
 * Blocks prefix_code changes on system-defined categories.
 */
export async function updateCategory(
  id: string,
  updates: Partial<Pick<WorkforceCategory, 'name' | 'prefix_code' | 'attendance_required'>>
): Promise<WorkforceCategory> {
  // If trying to change prefix_code, check if it's system-defined
  if (updates.prefix_code !== undefined) {
    const { data: category } = await supabase
      .from('workforce_categories')
      .select('is_system_defined')
      .eq('id', id)
      .single();

    if (category?.is_system_defined) {
      throw new Error('Cannot change the prefix code of a system-defined category');
    }

    // Validate prefix format
    const prefixRegex = /^[A-Z]{2,5}$/;
    if (!prefixRegex.test(updates.prefix_code)) {
      throw new Error('Prefix code must be 2-5 uppercase letters (A-Z)');
    }
  }

  const { data: updated, error } = await supabase
    .from('workforce_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('A category with this name or prefix already exists');
    }
    console.error('Error updating category:', error.message);
    throw new Error(error.message || 'Failed to update category');
  }

  return updated;
}

/**
 * Task 5.5: Deletes a workforce category.
 * Blocks deletion of system-defined categories.
 * Will fail with a descriptive error if personnel are assigned to this category.
 */
export async function deleteCategory(id: string): Promise<void> {
  // Check if system-defined
  const { data: category, error: fetchError } = await supabase
    .from('workforce_categories')
    .select('is_system_defined, name')
    .eq('id', id)
    .single();

  if (fetchError || !category) {
    throw new Error(fetchError?.message || 'Category not found');
  }

  if (category.is_system_defined) {
    throw new Error('Cannot delete system-defined categories');
  }

  // Check if any personnel are assigned to this category
  const { count, error: countError } = await supabase
    .from('workforce_personnel')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) {
    throw new Error(countError.message || 'Failed to verify category usage');
  }

  if (count && count > 0) {
    throw new Error(
      `Cannot delete "${category.name}" — ${count} personnel are assigned to this category. Please reassign them first.`
    );
  }

  const { error } = await supabase
    .from('workforce_categories')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error('Cannot delete this category because it is still referenced by other records');
    }
    throw new Error(error.message || 'Failed to delete category');
  }
}


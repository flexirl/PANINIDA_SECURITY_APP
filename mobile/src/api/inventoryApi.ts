import { supabase } from './supabase';

export interface InventoryItem {
  id: string;
  product_name: string;
  category: string;
  serial_number?: string;
  status: 'Active' | 'In Repair' | 'Lost' | 'Decommissioned' | string;
  current_holder_name?: string;
  current_holder_contact?: string;
  current_holder_address?: string;
  site_id?: string;
  date_of_issue?: string;
  next_maintenance_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryLog {
  id: string;
  inventory_item_id: string;
  action: string;
  previous_holder_name?: string;
  new_holder_name?: string;
  previous_status?: string;
  new_status?: string;
  notes?: string;
  logged_by?: string;
  created_at?: string;
}

export const fetchInventoryItems = async (filters?: { category?: string; status?: string }) => {
  try {
    let query = supabase.from('inventory_items').select('*').order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as InventoryItem[];
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
};

export const fetchInventoryItemById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, sites(site_name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching inventory item details:', error);
    throw error;
  }
};

export const createInventoryItem = async (item: Partial<InventoryItem>, userId?: string) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([item])
      .select()
      .single();
      
    if (error) throw error;
    
    // Log creation
    if (data) {
      await logInventoryAction({
        inventory_item_id: data.id,
        action: 'CREATED',
        new_status: data.status,
        new_holder_name: data.current_holder_name,
        logged_by: userId
      });
    }

    return data as InventoryItem;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (
  id: string, 
  updates: Partial<InventoryItem>, 
  previousItem: InventoryItem,
  userId?: string
) => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;

    // Log if holder changed
    if (updates.current_holder_name && updates.current_holder_name !== previousItem.current_holder_name) {
      await logInventoryAction({
        inventory_item_id: id,
        action: 'UPDATED_HOLDER',
        previous_holder_name: previousItem.current_holder_name,
        new_holder_name: updates.current_holder_name,
        logged_by: userId
      });
    }

    // Log if status changed
    if (updates.status && updates.status !== previousItem.status) {
      await logInventoryAction({
        inventory_item_id: id,
        action: 'STATUS_CHANGED',
        previous_status: previousItem.status,
        new_status: updates.status,
        logged_by: userId
      });
    }

    return data as InventoryItem;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

export const fetchInventoryLogs = async (itemId: string) => {
  try {
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*, users(name)')
      .eq('inventory_item_id', itemId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    throw error;
  }
};

const logInventoryAction = async (log: Partial<InventoryLog>) => {
  try {
    const { error } = await supabase
      .from('inventory_logs')
      .insert([log]);
    if (error) console.error('Failed to log inventory action:', error);
  } catch (error) {
    console.error('Error logging inventory action:', error);
  }
};

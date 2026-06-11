import { supabase } from './supabase';

export interface UniformItem {
  id: string;
  guard_id: string;
  item_name: 'uniform_set' | 'shoes' | 'belt' | 'cap' | 'id_card' | 'torch' | 'baton' | 'whistle' | 'other';
  item_cost: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'deducted';
  amount_paid: number;
  remarks?: string;
  issued_date: string;
  guards?: {
    name: string;
    phone: string;
  };
}

/**
 * Lists all issued uniforms.
 */
export async function getUniformIssues(filters?: {
  guard_id?: string;
  status?: 'pending' | 'partial' | 'paid' | 'deducted';
}): Promise<UniformItem[]> {
  const params: string[] = [];
  if (filters?.guard_id) params.push(`guard_id=${encodeURIComponent(filters.guard_id)}`);
  if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);

  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  const { data, error } = await supabase.functions.invoke(`uniforms${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error in getUniformIssues:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve uniform ledger');
  }

  return data.uniforms || [];
}

/**
 * Issues a new uniform item to a guard.
 */
export async function issueUniform(issue: {
  guard_id: string;
  item_name: string;
  item_cost: number;
  remarks?: string;
}): Promise<UniformItem> {
  const { data, error } = await supabase.functions.invoke('uniforms', {
    method: 'POST',
    body: issue,
  });

  if (error) {
    console.error('Error in issueUniform:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to record gear issue');
  }

  return data.uniform;
}

/**
 * Updates payment status or manual payment amounts collected for an issue.
 */
export async function updateUniformPayment(
  id: string,
  params: {
    payment_status: 'pending' | 'partial' | 'paid' | 'deducted';
    amount_paid: number;
    remarks?: string;
  }
): Promise<UniformItem> {
  const { data, error } = await supabase.functions.invoke(`uniforms?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: params,
  });

  if (error) {
    console.error('Error updating uniform payment:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to update payment status');
  }

  return data.uniform;
}

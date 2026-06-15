import { supabase } from './supabase';

export interface PayrollRecord {
  id: string;
  guard_id: string;
  month: string; // YYYY-MM
  total_working_days: number;
  days_present: number;
  base_salary: number;
  pro_rated_salary: number;
  overtime_amount: number;
  penalty_amount: number;
  uniform_deduction: number;
  advance_deduction: number;
  other_deduction?: number;
  other_deduction_reason?: string;
  final_salary: number;
  status: 'draft' | 'generated' | 'approved' | 'paid';
  created_at?: string;
  guards?: {
    name: string;
    phone: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    bank_name?: string;
  };
}

/**
 * Generates the payroll register for all active guards in a specific month.
 */
export async function generatePayroll(month: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('payroll', {
    method: 'POST',
    body: { month },
  });

  if (error) {
    console.error('Error generating payroll:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to generate payroll');
  }

  return true;
}

/**
 * Fetches the payroll records with optional filters.
 */
export async function getPayrollRecords(filters?: {
  month?: string;
  status?: 'draft' | 'generated' | 'approved' | 'paid';
}): Promise<PayrollRecord[]> {
  const params: string[] = [];
  if (filters?.month) params.push(`month=${encodeURIComponent(filters.month)}`);
  if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);

  const queryStr = params.length > 0 ? `?${params.join('&')}` : '';

  const { data, error } = await supabase.functions.invoke(`payroll${queryStr}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error listing payroll records:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to fetch payroll list');
  }

  return data.payrolls || [];
}

/**
 * Fetches salary slip details by UUID.
 */
export async function getSalarySlipDetail(id: string): Promise<PayrollRecord> {
  const { data, error } = await supabase.functions.invoke(`payroll?id=${encodeURIComponent(id)}`, {
    method: 'GET',
  });

  if (error) {
    console.error('Error fetching payroll detail:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to retrieve salary slip');
  }

  return data.slip;
}

/**
 * Approves a salary slip.
 */
export async function approvePayrollRecord(id: string): Promise<PayrollRecord> {
  const { data, error } = await supabase.functions.invoke(`payroll?id=${encodeURIComponent(id)}&action=approve`, {
    method: 'PUT',
  });

  if (error) {
    console.error('Error approving payroll:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to approve payroll');
  }

  return data.payroll;
}

/**
 * Marks a salary slip as paid.
 */
export async function markAsPaid(id: string): Promise<PayrollRecord> {
  const { data, error } = await supabase.functions.invoke(`payroll?id=${encodeURIComponent(id)}&action=paid`, {
    method: 'PUT',
  });

  if (error) {
    console.error('Error marking payroll as paid:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to record payment');
  }

  return data.payroll;
}

/**
 * Modifies payroll adjustments (deductions, overtime benefits) for a draft record.
 */
export async function updateAdjustments(
  id: string,
  adjustments: {
    advance_deduction?: number;
    uniform_deduction?: number;
    other_deduction?: number;
    other_deduction_reason?: string;
    overtime_amount?: number;
  }
): Promise<PayrollRecord> {
  const { data, error } = await supabase.functions.invoke(`payroll?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: adjustments,
  });

  if (error) {
    console.error('Error updating payroll adjustments:', error.message);
    throw error;
  }

  if (data?.error) {
    throw new Error(data.message || 'Failed to update adjustments');
  }

  return data.payroll;
}

import { supabase } from './supabase';
import { VisitorLog } from '../types/workforce';

export const getVisitorLogsForSite = async (siteId: string): Promise<VisitorLog[]> => {
  try {
    // Get start of today and start of tomorrow in local time, then convert to UTC ISO strings
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('visitor_logs')
      .select('*')
      .eq('site_id', siteId)
      .gte('check_in_time', startOfToday.toISOString())
      .lt('check_in_time', startOfTomorrow.toISOString())
      .order('check_in_time', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching visitor logs:', error);
    throw error;
  }
};

export const logVisitor = async (
  logData: Omit<VisitorLog, 'id' | 'created_at' | 'check_in_time' | 'check_out_time' | 'status'>
): Promise<VisitorLog> => {
  try {
    const { data, error } = await supabase
      .from('visitor_logs')
      .insert([logData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding visitor log:', error);
    throw error;
  }
};

export const checkoutVisitor = async (logId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('visitor_logs')
      .update({
        check_out_time: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', logId);

    if (error) throw error;
  } catch (error) {
    console.error('Error checking out visitor:', error);
    throw error;
  }
};

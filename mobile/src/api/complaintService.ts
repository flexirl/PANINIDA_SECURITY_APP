// =============================================================================
// Complaint Service
// =============================================================================
// Task 19: CRUD operations for complaints, timeline comments, and escalations.
// Resolution is atomic (database transaction via RPC).
// =============================================================================

import { supabase } from './supabase';
import type { Complaint, ComplaintComment, ComplaintEscalation, ComplaintStatus, ComplaintSeverity } from '../types/workforce';

/**
 * Task 19.1: Raises a new complaint.
 * Automatically computes sla_deadline = NOW() + 24 hours.
 * If the user raising it is a supervisor/admin, resolves the first active client_user of the site.
 */
export async function raiseComplaint(data: {
  site_id: string;
  category: string;
  description: string;
  severity: ComplaintSeverity;
  incident_reported?: boolean;
}): Promise<Complaint> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to raise a complaint.');
  }

  // 1. Resolve the raised_by FK (must reference a client_user.id)
  let raisedById: string;

  // Check if current user is a client user
  const { data: clientUser } = await supabase
    .from('client_users')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (clientUser) {
    raisedById = clientUser.id;
  } else {
    // Current user is a supervisor or admin. Lookup first active client_user for the site.
    const { data: siteClient } = await supabase
      .from('client_users')
      .select('id')
      .eq('site_id', data.site_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!siteClient) {
      throw new Error('Cannot raise complaint: No active Client User registered for this site.');
    }
    raisedById = siteClient.id;
  }

  // 2. Compute 24-hour SLA deadline
  const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // 3. Insert complaint
  const { data: created, error } = await supabase
    .from('complaints')
    .insert({
      site_id: data.site_id,
      raised_by: raisedById,
      category: data.category,
      description: data.description,
      severity: data.severity,
      incident_reported: data.incident_reported ?? false,
      status: 'open',
      current_level: 1,
      sla_deadline: slaDeadline
    })
    .select()
    .single();

  if (error || !created) {
    console.error('Error raising complaint:', error?.message);
    throw new Error(error?.message || 'Failed to file complaint.');
  }

  // 4. Wire notification to site supervisor (Task 40.1)
  try {
    const { data: site } = await supabase
      .from('sites')
      .select('assigned_supervisor_id, site_name')
      .eq('id', data.site_id)
      .single();

    if (site?.assigned_supervisor_id) {
      const { data: supervisor } = await supabase
        .from('workforce_personnel')
        .select('user_id')
        .eq('id', site.assigned_supervisor_id)
        .single();

      if (supervisor?.user_id) {
        await supabase.from('notifications').insert({
          user_id: supervisor.user_id,
          title: `New Complaint: ${data.category}`,
          body: `A new complaint has been filed for ${site.site_name}.`,
          type: 'complaint_raised',
          data: { complaint_id: created.id, site_id: created.site_id }
        });
      }
    }
  } catch (err: any) {
    console.warn('[Notification Wiring Error] Failed to notify supervisor (logged, no rollback):', err?.message || err);
  }

  return created;
}

/**
 * Task 19.2: Fetches all complaints for a site, with optional status filter.
 */
export async function getComplaintsForSite(
  siteId: string,
  status?: ComplaintStatus
): Promise<Complaint[]> {
  let query = supabase
    .from('complaints')
    .select(`
      *,
      site:sites(*),
      raised_by_user:client_users(
        client_role,
        user:users(name, role)
      )
    `)
    .eq('site_id', siteId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching complaints:', error.message);
    throw new Error(error.message || 'Failed to retrieve complaints.');
  }

  // Format to match UI expected types
  return (data || []).map((c: any) => ({
    ...c,
    raised_by_user: {
      name: c.raised_by_user?.user?.name || 'Client',
      role: c.raised_by_user?.user?.role || 'client_user'
    }
  }));
}

/**
 * Task 19.3: Fetches details of a single complaint by ID.
 * Returns joined timeline comments (ordered by created_at ASC) and escalations.
 */
export async function getComplaintById(
  id: string
): Promise<Complaint & { comments: ComplaintComment[]; escalations: ComplaintEscalation[] }> {
  // Fetch complaint details
  const { data: complaint, error } = await supabase
    .from('complaints')
    .select(`
      *,
      site:sites(*),
      raised_by_user:client_users(
        user:users(name, role)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !complaint) {
    console.error('Error fetching complaint details:', error?.message);
    throw new Error(error?.message || 'Complaint not found.');
  }

  // Fetch comments (timeline) ordered by created_at ASC (Req 4.8)
  const { data: comments } = await supabase
    .from('complaint_comments')
    .select(`
      *,
      author:users(name, role)
    `)
    .eq('complaint_id', id)
    .order('created_at', { ascending: true });

  // Fetch escalations
  const { data: escalations } = await supabase
    .from('complaint_escalations')
    .select('*')
    .eq('complaint_id', id)
    .order('escalated_at', { ascending: true });

  return {
    ...complaint,
    raised_by_user: {
      name: complaint.raised_by_user?.user?.name || 'Client',
      role: complaint.raised_by_user?.user?.role || 'client_user'
    },
    comments: (comments || []).map((c: any) => ({
      ...c,
      author: {
        name: c.author?.name || 'System',
        role: c.author?.role || 'system'
      }
    })),
    escalations: escalations || []
  };
}

/**
 * Task 19.4: Adds a comment to a complaint's timeline.
 */
export async function addComment(
  complaintId: string,
  commentText: string,
  actionTaken?: string
): Promise<ComplaintComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to add comments.');
  }

  const { data: created, error } = await supabase
    .from('complaint_comments')
    .insert({
      complaint_id: complaintId,
      author_id: user.id,
      comment_text: commentText.trim(),
      action_taken: actionTaken || null
    })
    .select()
    .single();

  if (error || !created) {
    console.error('Error adding comment:', error?.message);
    throw new Error(error?.message || 'Failed to post comment.');
  }

  return created;
}

/**
 * Task 19.5: Resolves a complaint atomically.
 * Invokes the resolve_complaint database RPC.
 */
export async function resolveComplaint(
  complaintId: string,
  resolutionNote: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to resolve complaints.');
  }

  const { error } = await supabase.rpc('resolve_complaint', {
    p_complaint_id: complaintId,
    p_resolution_note: resolutionNote.trim(),
    p_author_id: user.id
  });

  if (error) {
    console.error('Error invoking resolve_complaint RPC:', error.message);
    throw new Error(error.message || 'Failed to resolve complaint.');
  }
}

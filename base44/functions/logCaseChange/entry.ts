import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Logs a change to the CaseHistory entity for audit trail
 * Called by automations on entity changes
 * 
 * Payload:
 * {
 *   case_id: string,
 *   entity_type: "Argument" | "Evidence" | "Deadline" | "Case" | "Risk",
 *   entity_id: string,
 *   entity_title: string (snapshot),
 *   action: "create" | "update" | "delete",
 *   field_changed: string (for updates),
 *   old_value: any,
 *   new_value: any,
 *   summary: string (human-readable)
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      case_id,
      entity_type,
      entity_id,
      entity_title = '—',
      action,
      field_changed,
      old_value,
      new_value,
      summary
    } = payload;

    if (!case_id || !entity_type || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create history entry
    const historyEntry = {
      case_id,
      entity_type,
      entity_id,
      entity_title,
      action,
      field_changed: field_changed || null,
      old_value: typeof old_value === 'string' ? old_value : JSON.stringify(old_value || null),
      new_value: typeof new_value === 'string' ? new_value : JSON.stringify(new_value || null),
      summary: summary || generateSummary(action, entity_type, field_changed),
      user_email: user.email,
      timestamp: new Date().toISOString()
    };

    const result = await base44.entities.CaseHistory.create(historyEntry);
    return Response.json({ success: true, history_id: result.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateSummary(action, entityType, fieldChanged) {
  if (action === 'create') return `${entityType} erstellt`;
  if (action === 'delete') return `${entityType} gelöscht`;
  if (action === 'update') return `${entityType}: ${fieldChanged} geändert`;
  return `${entityType} ${action}`;
}
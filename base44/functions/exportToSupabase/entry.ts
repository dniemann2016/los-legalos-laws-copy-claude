import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 400 });
    }

    // Get Supabase project ref from OAuth
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const projects = await projectsRes.json();
    const projectRef = projects[0]?.ref;
    
    if (!projectRef) {
      return Response.json({ error: 'No Supabase project found' }, { status: 400 });
    }

    const baseUrl = `https://${projectRef}.supabase.co/rest/v1`;
    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    // Fetch all entities
    const entities = ['Case', 'Argument', 'Evidence', 'Person', 'Deadline', 'Document', 'Task', 'JudgeProfile'];
    const results = {};

    for (const entityName of entities) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list();
        if (!data || data.length === 0) continue;

        const tableName = entityName.toLowerCase();
        const res = await fetch(`${baseUrl}/${tableName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        });

        if (res.ok) {
          results[entityName] = { success: true, count: data.length };
          console.log(`✓ ${entityName}: ${data.length} records written`);
        } else {
          const error = await res.text();
          results[entityName] = { success: false, error: error.substring(0, 200) };
          console.warn(`⚠ ${entityName}: ${res.status}`);
        }
      } catch (e) {
        results[entityName] = { success: false, error: e.message };
        console.error(`✗ ${entityName}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      project: projectRef,
      results,
      message: `Export zu Supabase (${projectRef}) abgeschlossen`
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
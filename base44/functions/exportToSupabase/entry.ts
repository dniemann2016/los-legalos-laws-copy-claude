import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase access
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

    // 1. Get Supabase project ref
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const projects = await projectsRes.json();
    if (!projects || projects.length === 0) {
      return Response.json({ error: 'No Supabase projects found' }, { status: 400 });
    }
    const projectRef = projects[0].ref;
    console.log(`Using Supabase project: ${projectRef}`);

    // 2. Get service role key
    const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const keys = await keysRes.json();
    const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
    if (!serviceKey) {
      return Response.json({ error: 'Service role key not found' }, { status: 400 });
    }

    // 3. Fetch all entities from this app
    const entities = ['Case', 'Argument', 'Evidence', 'Person', 'Deadline', 'Document', 'Task', 'JudgeProfile'];
    const allData = {};

    for (const entityName of entities) {
      try {
        const data = await base44.asServiceRole.entities[entityName].list();
        allData[entityName] = data || [];
        console.log(`Exported ${entityName}: ${data?.length || 0} records`);
      } catch (e) {
        console.warn(`Could not fetch ${entityName}:`, e.message);
        allData[entityName] = [];
      }
    }

    // 4. Create/update tables in Supabase and insert data
    const baseUrl = `https://${projectRef}.supabase.co/rest/v1`;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    };

    const exportLog = [];

    for (const [entityName, records] of Object.entries(allData)) {
      if (records.length === 0) continue;

      const tableName = entityName.toLowerCase();
      
      try {
        // Try to insert records (Supabase will create table if it doesn't exist with RLS disabled)
        const insertRes = await fetch(`${baseUrl}/${tableName}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(records.slice(0, 100)) // Batch insert
        });

        if (insertRes.ok) {
          exportLog.push(`✓ ${entityName}: ${records.length} records exported`);
          console.log(`Inserted ${records.length} records into ${tableName}`);
        } else {
          const error = await insertRes.text();
          exportLog.push(`⚠ ${entityName}: ${insertRes.status} - ${error.substring(0, 100)}`);
          console.warn(`Error inserting ${tableName}:`, error);
        }
      } catch (e) {
        exportLog.push(`✗ ${entityName}: ${e.message}`);
        console.error(`Error with ${entityName}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      project: projectRef,
      exported: allData,
      log: exportLog,
      message: `Exported ${Object.keys(allData).filter(k => allData[k].length > 0).length} entity types to Supabase`
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
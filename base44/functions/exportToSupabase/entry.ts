import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all entities from this app
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

    // Generate export JSON
    const exportData = {
      exportedAt: new Date().toISOString(),
      entities: allData,
      summary: Object.entries(allData).map(([name, records]) => ({
        entity: name,
        count: records.length
      }))
    };

    // Return as downloadable JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="lexara-export.json"'
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
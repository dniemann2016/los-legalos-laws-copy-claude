import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { caseId, recipientEmail } = await req.json();
  if (!caseId || !recipientEmail) return Response.json({ error: 'caseId and recipientEmail required' }, { status: 400 });

  const [cases, deadlines, args] = await Promise.all([
    base44.entities.Case.filter({ id: caseId }),
    base44.entities.Deadline.filter({ case_id: caseId }),
    base44.entities.Argument.filter({ case_id: caseId }),
  ]);

  const caseData = cases[0];
  if (!caseData) return Response.json({ error: 'Case not found' }, { status: 404 });

  const openDeadlines = deadlines
    .filter(d => d.status === "offen" && new Date(d.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const nextDeadline = openDeadlines[0];
  const daysUntil = nextDeadline ? Math.ceil((new Date(nextDeadline.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  const completed = deadlines.filter(d => d.status === "erledigt").length;
  const progressPct = deadlines.length > 0 ? Math.round((completed / deadlines.length) * 100) : 0;

  const topArgs = args.filter(a => a.side === "eigen").sort((a, b) => (b.strength || 0) - (a.strength || 0)).slice(0, 3);

  const nextFristLine = nextDeadline
    ? `📅 Nächste Frist: ${nextDeadline.title} — ${new Date(nextDeadline.due_date).toLocaleDateString('de-DE')} (noch ${daysUntil} Tage)`
    : "✅ Keine offenen Fristen";

  const argsLine = topArgs.length > 0
    ? `\nUnsere stärksten Argumente:\n${topArgs.map(a => `  • ${a.title}`).join('\n')}`
    : "";

  const body = `Sehr geehrte/r Mandant/in,

wir möchten Sie über den aktuellen Stand Ihres Falls informieren.

🗂 Fall: ${caseData.fallname}${caseData.aktenzeichen ? ` (Az. ${caseData.aktenzeichen})` : ""}
📊 Erfolgsprognose: ${caseData.prognose || 0}%
📈 Fortschritt: ${progressPct}% (${completed}/${deadlines.length} Meilensteine)

${nextFristLine}

${caseData.prozessziel ? `🎯 Prozessziel: ${caseData.prozessziel}\n` : ""}${caseData.zentrale_rechtsfrage ? `⚖️ Zentrale Rechtsfrage: ${caseData.zentrale_rechtsfrage}\n` : ""}${argsLine}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihre Kanzlei`;

  await base44.integrations.Core.SendEmail({
    to: recipientEmail,
    subject: `📋 Fallupdate: ${caseData.fallname}`,
    body,
  });

  return Response.json({ success: true });
});
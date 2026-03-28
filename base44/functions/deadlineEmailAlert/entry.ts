import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const allDeadlines = await base44.asServiceRole.entities.Deadline.list();
  const upcoming = allDeadlines.filter(d => {
    if (!d.due_date || d.status !== "offen") return false;
    const due = new Date(d.due_date);
    return due >= now && due <= in7Days;
  });

  if (upcoming.length === 0) {
    return Response.json({ sent: 0, message: "Keine Fristen in den nächsten 7 Tagen" });
  }

  const allCases = await base44.asServiceRole.entities.Case.list();
  const caseMap = {};
  allCases.forEach(c => { caseMap[c.id] = c; });

  const allUsers = await base44.asServiceRole.entities.User.list();

  let sent = 0;
  for (const user of allUsers) {
    const userDeadlines = upcoming.filter(d => !d.responsible || d.responsible.toLowerCase().includes(user.email?.split('@')[0]?.toLowerCase() || '') || d.responsible === user.full_name);
    const relevantDeadlines = userDeadlines.length > 0 ? userDeadlines : upcoming;

    const daysUntil = (d) => Math.ceil((new Date(d.due_date) - now) / (1000 * 60 * 60 * 24));
    const deadlineRows = relevantDeadlines.map(d => {
      const c = caseMap[d.case_id];
      const days = daysUntil(d);
      return `• [${days} Tage] ${d.title} — Fall: ${c?.fallname || "Unbekannt"} | Aktenzeichen: ${c?.aktenzeichen || "–"} | Fällig: ${new Date(d.due_date).toLocaleDateString('de-DE')}`;
    }).join('\n');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `⚠️ ${relevantDeadlines.length} Frist(en) in den nächsten 7 Tagen`,
      body: `Sehr geehrte/r ${user.full_name || user.email},\n\nfolgende Fristen stehen in den nächsten 7 Tagen an:\n\n${deadlineRows}\n\nBitte handeln Sie rechtzeitig.\n\nMit freundlichen Grüßen\nMachiavelLEX`
    });
    sent++;
  }

  return Response.json({ sent, deadlines: upcoming.length });
});
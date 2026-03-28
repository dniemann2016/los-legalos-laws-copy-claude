import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function pad(n) { return String(n).padStart(2, "0"); }

function toIcalDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}`;
}

function escapeIcal(str) {
  return (str || "").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { caseId } = await req.json();

  // Auth optional — allow unauthenticated for calendar link access
  let deadlines = [];
  let caseData = null;

  if (caseId) {
    const [cases, dl] = await Promise.all([
      base44.asServiceRole.entities.Case.filter({ id: caseId }),
      base44.asServiceRole.entities.Deadline.filter({ case_id: caseId }),
    ]);
    caseData = cases[0];
    deadlines = dl;
  } else {
    deadlines = await base44.asServiceRole.entities.Deadline.list("due_date", 500);
  }

  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  let vcal = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MachiavelLEX//DE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:${escapeIcal(caseData ? `Fristen – ${caseData.fallname}` : "Alle Rechtsfristen")}\r\nX-WR-CALDESC:Automatisch generiert von MachiavelLEX\r\n`;

  for (const d of deadlines) {
    if (!d.due_date) continue;
    const uid = `frist-${d.id}@machiavellex`;
    const dateStr = toIcalDate(d.due_date);
    // Alarm 3 days before
    const alarmDate = new Date(d.due_date);
    alarmDate.setDate(alarmDate.getDate() - 3);
    const alarmStr = toIcalDate(alarmDate.toISOString());

    const summary = escapeIcal(`⚖️ ${d.title}${d.status === "erledigt" ? " ✓" : d.status === "versaeumt" ? " ⚠" : ""}`);
    const desc = escapeIcal([
      d.frist_type ? `Typ: ${d.frist_type}` : "",
      d.paragraph ? `Paragraph: ${d.paragraph}` : "",
      d.responsible ? `Verantwortlich: ${d.responsible}` : "",
      d.side ? `Seite: ${d.side}` : "",
      d.status ? `Status: ${d.status}` : "",
      d.prognoseabzug ? `Prognoseabzug: ${d.prognoseabzug}` : "",
    ].filter(Boolean).join("\\n"));

    vcal += `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:${stamp}\r\nDTSTART;VALUE=DATE:${dateStr}\r\nDTEND;VALUE=DATE:${dateStr}\r\nSUMMARY:${summary}\r\nDESCRIPTION:${desc}\r\nSTATUS:${d.status === "erledigt" ? "COMPLETED" : "CONFIRMED"}\r\nBEGIN:VALARM\r\nTRIGGER;VALUE=DATE-TIME:${alarmStr}T090000Z\r\nACTION:DISPLAY\r\nDESCRIPTION:Erinnerung: ${summary}\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
  }

  vcal += `END:VCALENDAR\r\n`;

  return new Response(vcal, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="fristen${caseId ? `-${caseId}` : ""}.ics"`,
    },
  });
});
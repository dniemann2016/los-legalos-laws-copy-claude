import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { caseId } = await req.json();
    if (!caseId) return Response.json({ error: 'caseId required' }, { status: 400 });

    const [cases, args, evs, pers, deadlines] = await Promise.all([
      base44.entities.Case.filter({ id: caseId }),
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
    ]);

    const c = cases[0];
    if (!c) return Response.json({ error: 'Case not found' }, { status: 404 });

    const doc = new jsPDF();
    let y = 20;

    const addLine = (text, size = 10, bold = false, color = [30, 30, 30]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(size);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ""), 170);
      doc.text(lines, 20, y);
      y += lines.length * (size * 0.4 + 2);
    };

    const addSection = (title) => {
      y += 4;
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y - 4, 180, 10, "F");
      addLine(title, 11, true, [30, 30, 30]);
      y += 2;
    };

    // Header
    addLine("MachiavelLEX – Fallbericht", 18, true, [10, 10, 10]);
    addLine(`Erstellt am ${new Date().toLocaleDateString("de-DE")}`, 9, false, [120, 120, 120]);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 8;

    // Case basics
    addSection("1. Basisdaten");
    addLine(`Fallname: ${c.fallname}`, 10, true);
    if (c.aktenzeichen) addLine(`Aktenzeichen: ${c.aktenzeichen}`);
    if (c.gericht) addLine(`Gericht: ${c.gericht}`);
    if (c.rechtsgebiet) addLine(`Rechtsgebiet: ${c.rechtsgebiet}`);
    if (c.status) addLine(`Status: ${c.status}`);
    if (c.instanz) addLine(`Instanz: ${c.instanz}`);
    if (c.streitwert) addLine(`Streitwert: ${c.streitwert.toLocaleString("de-DE")} €`);

    // Prognose
    addSection("2. KI-Prognose");
    addLine(`Erfolgswahrscheinlichkeit: ${Math.round(c.prognose || 0)} %`, 11, true);
    if (c.zentrale_rechtsfrage) addLine(`Zentrale Rechtsfrage: ${c.zentrale_rechtsfrage}`);
    if (c.prozessziel) addLine(`Prozessziel: ${c.prozessziel}`);

    // Argumente
    addSection("3. Argumentketten");
    const eigenArgs = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");
    addLine(`Eigene Argumente (${eigenArgs.length}):`, 10, true);
    eigenArgs.forEach((a, i) => {
      addLine(`${i + 1}. ${a.title} (Stärke: ${a.strength || "-"}/10)`);
      if (a.description) addLine(`   ${a.description}`, 9, false, [80, 80, 80]);
    });
    y += 2;
    addLine(`Gegner-Argumente (${gegnerArgs.length}):`, 10, true);
    gegnerArgs.forEach((a, i) => {
      addLine(`${i + 1}. ${a.title} (Stärke: ${a.strength || "-"}/10)`);
    });

    // Beweise
    addSection("4. Beweislage");
    evs.forEach((e, i) => {
      addLine(`${i + 1}. ${e.title} – Gewicht: ${e.weight || "-"}/10`);
      if (e.description) addLine(`   ${e.description}`, 9, false, [80, 80, 80]);
    });
    if (evs.length === 0) addLine("Keine Beweise erfasst.");

    // Personen
    addSection("5. Beteiligte Personen");
    pers.forEach((p, i) => {
      addLine(`${i + 1}. ${p.name} – ${p.role || ""}${p.organization ? ` (${p.organization})` : ""}`);
      if (p.glaubwuerdigkeit) addLine(`   Glaubwürdigkeit: ${p.glaubwuerdigkeit}%`, 9, false, [80, 80, 80]);
    });
    if (pers.length === 0) addLine("Keine Personen erfasst.");

    // Fristen
    addSection("6. Fristen");
    const sortedDeadlines = [...deadlines].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    sortedDeadlines.forEach((d, i) => {
      const date = new Date(d.due_date).toLocaleDateString("de-DE");
      addLine(`${i + 1}. ${d.title} – Fällig: ${date} [${d.status || "offen"}]`);
    });
    if (deadlines.length === 0) addLine("Keine Fristen erfasst.");

    // KI Berater
    if (c.ki_berater_result) {
      addSection("7. KI-Berater Empfehlungen");
      const ki = c.ki_berater_result;
      if (ki.taktik) { addLine("Taktik:", 10, true); addLine(ki.taktik); }
      if (ki.script) { addLine("Verhandlungsscript:", 10, true); addLine(ki.script); }
    }

    // Footer
    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 6;
    addLine("MachiavelLEX – Legal Intelligence Platform", 8, false, [150, 150, 150]);

    const pdfBytes = doc.output("arraybuffer");
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=Fallbericht_${c.fallname.replace(/\s+/g, "_")}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
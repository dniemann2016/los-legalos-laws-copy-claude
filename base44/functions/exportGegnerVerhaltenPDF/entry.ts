import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
    }

    const caseId = body?.caseId;
    if (!caseId) {
      return new Response(JSON.stringify({ error: "caseId is required" }), { status: 400 });
    }

    // Load data
    const caseList = await base44.entities.Case.filter({ id: caseId });
    if (!caseList || caseList.length === 0) {
      return new Response(JSON.stringify({ error: "Case not found" }), { status: 404 });
    }

    const fallData = caseList[0];
    const behaviors = await base44.entities.GegnerVerhalten.filter({ case_id: caseId }, "-datum");

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("GEGNER-VERHALTENSANALYSE", 10, yPos);
    yPos += 12;

    // Case info
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("FALLINFORMATIONEN", 10, yPos);
    doc.setFillColor(242, 242, 242);
    doc.rect(10, yPos - 3, pageWidth - 20, 8, "F");
    yPos += 10;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);
    const caseInfo = [
      ["Fallname:", fallData.fallname || "—"],
      ["Aktenzeichen:", fallData.aktenzeichen || "—"],
      ["Gericht:", fallData.gericht || "—"],
      ["Rechtsgebiet:", fallData.rechtsgebiet || "—"],
      ["Status:", fallData.status || "—"],
    ];
    caseInfo.forEach(([label, value]) => {
      doc.setFont(undefined, "bold");
      doc.text(label, 12, yPos);
      doc.setFont(undefined, "normal");
      doc.text(String(value), 50, yPos);
      yPos += 5;
    });
    yPos += 3;

    // Statistics
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("ÜBERBLICK", 10, yPos);
    doc.setFillColor(242, 242, 242);
    doc.rect(10, yPos - 3, pageWidth - 20, 8, "F");
    yPos += 10;

    const versaeumtCount = behaviors.filter(b => b.typ === "versaeumte_frist").length;
    const vergleichAbgelehnt = behaviors.filter(b => b.typ === "vergleichsreaktion" && b.reaktion === "abgelehnt").length;
    const vergleichAngenommen = behaviors.filter(b => b.typ === "vergleichsreaktion" && b.reaktion === "angenommen").length;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(0, 0, 0);
    const stats = [
      `Einträge erfasst: ${behaviors.length}`,
      `Versäumte Fristen: ${versaeumtCount}`,
      `Vergleiche abgelehnt: ${vergleichAbgelehnt}`,
      `Vergleiche angenommen: ${vergleichAngenommen}`,
    ];
    stats.forEach(stat => {
      doc.text(stat, 14, yPos);
      yPos += 4;
    });
    yPos += 3;

    // Entries
    if (behaviors.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(102, 51, 153);
      doc.text("ERFASSTE VERHALTENMUSTER", 10, yPos);
      doc.setFillColor(243, 232, 255);
      doc.rect(10, yPos - 3, pageWidth - 20, 8, "F");
      yPos += 10;

      behaviors.forEach((entry, idx) => {
        if (yPos > pageHeight - 35) {
          doc.addPage();
          yPos = 15;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, "bold");
        doc.setTextColor(102, 51, 153);
        doc.text(`${idx + 1}. ${entry.titel || "—"}`, 12, yPos);
        yPos += 5;

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(80, 80, 80);

        if (entry.datum) {
          doc.text(`Datum: ${entry.datum}`, 14, yPos);
          yPos += 3;
        }
        if (entry.typ) {
          const typMap = {
            versaeumte_frist: "Versäumte Frist",
            vergleichsreaktion: "Vergleichsreaktion",
            taktik: "Taktik",
            prozessverhalten: "Prozessverhalten",
            sonstiges: "Sonstiges",
          };
          doc.text(`Typ: ${typMap[entry.typ] || entry.typ}`, 14, yPos);
          yPos += 3;
        }
        if (entry.reaktion) {
          const reaktionMap = {
            abgelehnt: "Abgelehnt",
            angenommen: "Angenommen",
            ignoriert: "Ignoriert",
            verzoegert: "Verzögert",
            gegenvorschlag: "Gegenvorschlag",
            keine_reaktion: "Keine Reaktion",
          };
          doc.text(`Reaktion: ${reaktionMap[entry.reaktion] || entry.reaktion}`, 14, yPos);
          yPos += 3;
        }
        if (entry.beschreibung) {
          const lines = doc.splitTextToSize(`„${entry.beschreibung}"`, pageWidth - 20);
          doc.setFont(undefined, "italic");
          doc.text(lines, 14, yPos);
          yPos += lines.length * 3 + 1;
        }
        if (entry.ergebnis) {
          doc.setFont(undefined, "bold");
          doc.text("Ergebnis:", 14, yPos);
          yPos += 3;
          doc.setFont(undefined, "normal");
          const resLines = doc.splitTextToSize(entry.ergebnis, pageWidth - 20);
          doc.text(resLines, 16, yPos);
          yPos += resLines.length * 3 + 3;
        } else {
          yPos += 2;
        }
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")} | MachiavelLEX`, 10, pageHeight - 8);

    // Output
    const pdfBytes = doc.output("arraybuffer");
    const filename = `Gegner-Verhaltensanalyse_${caseId}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF Export Error:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || "PDF generation failed" }),
      { status: 500 }
    );
  }
});
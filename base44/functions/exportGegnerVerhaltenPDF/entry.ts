import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

const TYP_LABELS = {
  versaeumte_frist: "Versäumte Frist",
  vergleichsreaktion: "Vergleichsreaktion",
  taktik: "Taktik",
  prozessverhalten: "Prozessverhalten",
  sonstiges: "Sonstiges",
};

const REAKTION_LABELS = {
  abgelehnt: "Abgelehnt",
  angenommen: "Angenommen",
  ignoriert: "Ignoriert",
  verzoegert: "Verzögert",
  gegenvorschlag: "Gegenvorschlag",
  keine_reaktion: "Keine Reaktion",
};

const PATTERN_LABELS = {
  verzoegerungstaktik: "Verzögerungstaktik",
  druckmittel: "Druckmittel",
  konzessionsbereit: "Konzessionsbereit",
  konfrontativ: "Konfrontativ",
  kooperativ: "Kooperativ",
  unberechenbar: "Unberechenbar",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const { caseId } = await req.json();
    if (!caseId) return new Response(JSON.stringify({ error: "caseId required" }), { status: 400 });

    // Load data
    const [caseData, behaviors] = await Promise.all([
      base44.entities.Case.filter({ id: caseId }),
      base44.entities.GegnerVerhalten.filter({ case_id: caseId }, "-datum"),
    ]);

    const fallData = caseData[0];
    if (!fallData) return new Response(JSON.stringify({ error: "Fall nicht gefunden" }), { status: 404 });

    // Build PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Helper functions
    const addText = (text, size = 12, bold = false, color = [0, 0, 0]) => {
      doc.setFontSize(size);
      doc.setFont(undefined, bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, pageWidth - 20);
      doc.text(lines, 10, yPos);
      yPos += lines.length * (size * 0.35) + 2;
    };

    const addSection = (title, color = [31, 41, 55]) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }
      doc.setFillColor(...color);
      doc.rect(10, yPos - 3, pageWidth - 20, 8, "F");
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(title, 12, yPos + 2);
      yPos += 10;
    };

    const addTable = (rows, colWidths) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 15;
      }
      const colCount = colWidths.length;
      const rowHeight = 6;
      doc.setFontSize(9);

      rows.forEach((row, rowIdx) => {
        let xPos = 10;
        const isHeader = rowIdx === 0;
        if (isHeader) {
          doc.setFont(undefined, "bold");
          doc.setFillColor(242, 242, 242);
        } else {
          doc.setFont(undefined, "normal");
          const [r, g, b] = rowIdx % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
          doc.setFillColor(r, g, b);
        }

        row.forEach((cell, colIdx) => {
          const w = colWidths[colIdx];
          doc.rect(xPos, yPos, w, rowHeight, "F");
          doc.setDrawColor(220, 220, 220);
          doc.rect(xPos, yPos, w, rowHeight);
          doc.setTextColor(isHeader ? 0 : 50, isHeader ? 0 : 50, isHeader ? 0 : 50);
          const cellLines = doc.splitTextToSize(String(cell), w - 2);
          doc.text(cellLines, xPos + 1, yPos + 3);
          xPos += w;
        });
        yPos += rowHeight;
      });
      yPos += 4;
    };

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("GEGNER-VERHALTENSANALYSE", 10, yPos);
    yPos += 12;

    // Fall info
    addSection("FALLINFORMATIONEN");
    const fallInfo = [
      ["Fallname:", fallData.fallname || "—"],
      ["Aktenzeichen:", fallData.aktenzeichen || "—"],
      ["Gericht:", fallData.gericht || "—"],
      ["Rechtsgebiet:", fallData.rechtsgebiet || "—"],
      ["Status:", fallData.status || "—"],
    ];
    fallInfo.forEach(([label, value]) => {
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(label, 12, yPos);
      doc.setFont(undefined, "normal");
      doc.text(String(value), 50, yPos);
      yPos += 5;
    });
    yPos += 3;

    // Statistics
    addSection("ÜBERSICHT & STATISTIKEN");
    const versaeumtCount = behaviors.filter(b => b.typ === "versaeumte_frist").length;
    const vergleichAbgelehnt = behaviors.filter(b => b.typ === "vergleichsreaktion" && b.reaktion === "abgelehnt").length;
    const vergleichAngenommen = behaviors.filter(b => b.typ === "vergleichsreaktion" && b.reaktion === "angenommen").length;
    const dominantPattern = behaviors.reduce((acc, b) => {
      if (b.pattern_tag) acc[b.pattern_tag] = (acc[b.pattern_tag] || 0) + 1;
      return acc;
    }, {});
    const topPattern = Object.entries(dominantPattern).sort((a, b) => b[1] - a[1])[0];

    const stats = [
      [`Einträge erfasst`, String(behaviors.length)],
      [`Versäumte Fristen`, String(versaeumtCount)],
      [`Vergleiche abgelehnt`, String(vergleichAbgelehnt)],
      [`Vergleiche angenommen`, String(vergleichAngenommen)],
      [`Dominantes Muster`, topPattern ? `${PATTERN_LABELS[topPattern[0]]} (${topPattern[1]}×)` : "—"],
    ];
    addTable([["Metrik", "Wert"], ...stats], [100, 80]);

    // Behavior entries
    if (behaviors.length > 0) {
      addSection("ERFASSTE VERHALTENMUSTER", [102, 51, 153]);
      behaviors.forEach((entry, idx) => {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 15;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.setTextColor(102, 51, 153);
        doc.text(`${idx + 1}. ${entry.titel || "—"}`, 12, yPos);
        yPos += 5;

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(80, 80, 80);

        const details = [
          `Datum: ${entry.datum || "—"}`,
          `Typ: ${TYP_LABELS[entry.typ] || entry.typ || "—"}`,
          entry.pattern_tag ? `Muster: ${PATTERN_LABELS[entry.pattern_tag] || entry.pattern_tag}` : null,
          entry.reaktion ? `Reaktion: ${REAKTION_LABELS[entry.reaktion] || entry.reaktion}` : null,
          entry.verzoegerung_tage ? `Verzögerung: +${entry.verzoegerung_tage} Tage` : null,
          entry.auswirkung_prognose && entry.auswirkung_prognose !== 0 ? `Prognose-Einfluss: ${entry.auswirkung_prognose > 0 ? "+" : ""}${entry.auswirkung_prognose}%` : null,
        ].filter(Boolean);

        details.forEach(detail => {
          const lines = doc.splitTextToSize(detail, pageWidth - 20);
          doc.text(lines, 14, yPos);
          yPos += lines.length * 3 + 1;
        });

        if (entry.beschreibung) {
          doc.setFont(undefined, "italic");
          const descLines = doc.splitTextToSize(`„${entry.beschreibung}"`, pageWidth - 20);
          doc.text(descLines, 14, yPos);
          yPos += descLines.length * 3 + 2;
        }

        if (entry.ergebnis) {
          doc.setFont(undefined, "bold");
          doc.text("Ergebnis:", 14, yPos);
          yPos += 3;
          doc.setFont(undefined, "normal");
          const resLines = doc.splitTextToSize(entry.ergebnis, pageWidth - 20);
          doc.text(resLines, 16, yPos);
          yPos += resLines.length * 3 + 4;
        }
      });
    }

    // Pattern summary
    if (Object.keys(dominantPattern).length > 0) {
      addSection("MUSTERZUSAMMENFASSUNG", [59, 130, 246]);
      const patterns = Object.entries(dominantPattern)
        .sort((a, b) => b[1] - a[1])
        .map(([p, c]) => [`${PATTERN_LABELS[p] || p}`, `${c} Einträge (${Math.round(c / behaviors.length * 100)}%)`]);
      addTable([["Muster", "Häufigkeit"], ...patterns], [100, 80]);
    }

    // Recommendations
    addSection("EMPFEHLUNGEN FÜR VERHANDLUNGEN", [34, 197, 94]);
    const recs = [];
    if (versaeumtCount > 0) recs.push(`• Gegenseite zeigt Verfahrenslässigkeit — Zeitdruckargumente prüfen`);
    if (vergleichAbgelehnt > vergleichAngenommen) recs.push(`• Häufige Vergleichsablehnung → konfrontativere Strategie erwägen`);
    if (topPattern && topPattern[0] === "verzoegerungstaktik") recs.push(`• Typische Verzögerungstaktik erkannt — schnelle Fristen setzen`);
    if (topPattern && topPattern[0] === "kooperativ") recs.push(`• Gegenseite signalisiert Kooperativität — Vergleichspotenzial nutzen`);
    if (recs.length === 0) recs.push("• Datenbasis für spezifische Empfehlungen noch nicht ausreichend");

    recs.forEach(rec => {
      const lines = doc.splitTextToSize(rec, pageWidth - 20);
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(lines, 12, yPos);
      yPos += lines.length * 4 + 1;
    });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")} | MachiavelLEX Gegner-Verhaltensanalyse`, 10, pageHeight - 8);

    // Return PDF
    const pdfBytes = doc.output("arraybuffer");
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Gegner-Verhaltensanalyse_${fallData.fallname || fallData.aktenzeichen || caseId}.pdf"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
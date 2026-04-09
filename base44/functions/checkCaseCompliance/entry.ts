import { createClientFromRequest } from "npm:@base44/sdk@0.8.23";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { caseId } = await req.json();

    if (!caseId) {
      return Response.json({ error: "caseId erforderlich" }, { status: 400 });
    }

    // Hole alle Fall-Daten
    const [caseData, args, evidence, deadlines, persons] = await Promise.all([
      base44.entities.Case.filter({ id: caseId }).then((c) => c[0]),
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
    ]);

    if (!caseData) {
      return Response.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    // Lösche alte Warnungen (außer behobene)
    const oldWarnings = await base44.entities.CaseWarning.filter({
      case_id: caseId,
      resolved: false,
    });
    for (const w of oldWarnings) {
      await base44.entities.CaseWarning.delete(w.id);
    }

    const warnings = [];

    // 1. DISKREPANZEN: Prüfe Argumente gegen Beweise
    for (const arg of args) {
      if (!arg.evidence_ids || arg.evidence_ids.length === 0) {
        if (arg.strength > 6) {
          warnings.push({
            case_id: caseId,
            warning_type: "unterstuetzung_fehlt",
            severity: "hoch",
            element_type: "argument",
            element_id: arg.id,
            element_title: arg.title,
            title: `Starkes Argument ohne Beweise: "${arg.title}"`,
            description: `Das Argument hat eine Stärke von ${arg.strength}/10, aber keine verknüpften Beweise. Dies könnte bei der Verhandlung problematisch sein.`,
            suggestion: `Fügen Sie unterstützende Beweise hinzu oder reduzieren Sie die Stärke-Bewertung, falls das Argument zu spekulativ ist.`,
            resolved: false,
          });
        }
      }
    }

    // 2. WIDERSPRÜCHE: Gegensätzliche Argumente auf gleicher Stärke
    const ownArgs = args.filter((a) => a.side === "eigen");
    const oppArgs = args.filter((a) => a.side === "gegner");

    for (const own of ownArgs) {
      for (const opp of oppArgs) {
        if (
          own.title.toLowerCase().includes(opp.title.toLowerCase().substring(0, 10)) ||
          opp.title.toLowerCase().includes(own.title.toLowerCase().substring(0, 10))
        ) {
          const ownStr = own.ki_strength || own.strength || 5;
          const oppStr = opp.ki_strength || opp.strength || 5;
          if (Math.abs(ownStr - oppStr) < 2) {
            warnings.push({
              case_id: caseId,
              warning_type: "diskrepanz",
              severity: "kritisch",
              element_type: "argument",
              element_id: own.id,
              element_title: own.title,
              title: `Ähnlich starke gegensätzliche Argumente`,
              description: `Ihr Argument "${own.title}" (Stärke: ${ownStr}) und das gegnerische "${opp.title}" (Stärke: ${oppStr}) sind ähnlich gewichtet. Ein Gericht könnte diese Stellungnahme kritisch sehen.`,
              suggestion: `Verstärken Sie Ihre Argumente mit zusätzlichen Beweisen oder Rechtsprechung.`,
              resolved: false,
            });
          }
        }
      }
    }

    // 3. VERALTETE RECHTSPRECHUNG: Nutze KI zur Analyse
    if (args.length > 0 || evidence.length > 0) {
      const argSummary = args.slice(0, 3).map((a) => a.title).join(", ");
      const evSummary = evidence.slice(0, 3).map((e) => e.title).join(", ");

      try {
        const aiCheck = await base44.integrations.Core.InvokeLLM({
          prompt: `Du bist ein Rechtsanwalt. Prüfe diesen Fall auf Compliance mit aktueller Rechtsprechung:

Fall: ${caseData.fallname}
Rechtsgebiet: ${caseData.rechtsgebiet}
Zentrale Frage: ${caseData.zentrale_rechtsfrage}
Argumente: ${argSummary}
Beweise: ${evSummary}

Antworte mit JSON:
{
  "has_issues": boolean,
  "issues": [
    {
      "type": "veraltete_rspr|fehlender_beleg|unterstuetzung_fehlt",
      "severity": "kritisch|hoch|mittel|niedrig",
      "beschreibung": string,
      "empfehlung": string,
      "rspr_referenz": string (z.B. "BGH NJW 2023, 456")
    }
  ]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              has_issues: { type: "boolean" },
              issues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    severity: { type: "string" },
                    beschreibung: { type: "string" },
                    empfehlung: { type: "string" },
                    rspr_referenz: { type: "string" },
                  },
                },
              },
            },
          },
          model: "gemini_3_flash",
        });

        if (aiCheck.has_issues && aiCheck.issues?.length > 0) {
          for (const issue of aiCheck.issues) {
            warnings.push({
              case_id: caseId,
              warning_type: issue.type || "veraltete_rspr",
              severity: issue.severity || "mittel",
              element_type: "argument",
              element_id: "",
              element_title: "Fallanalyse",
              title: `Rechtsprechungs-Issue: ${issue.beschreibung?.substring(0, 50)}...`,
              description: issue.beschreibung,
              suggestion: issue.empfehlung,
              rspr_reference: issue.rspr_referenz,
              resolved: false,
            });
          }
        }
      } catch (e) {
        console.error("KI-Analyse fehler:", e);
      }
    }

    // 4. FEHLENDE FRISTEN: Prüfe auf Lücken
    if (deadlines.length === 0 && args.length > 0) {
      warnings.push({
        case_id: caseId,
        warning_type: "fehlender_beleg",
        severity: "mittel",
        element_type: "frist",
        element_id: "",
        element_title: "Fristen",
        title: `Keine Fristen definiert`,
        description: `Der Fall hat ${args.length} Argumente, aber keine einzige Frist ist eingetragen. Dies ist ungewöhnlich und könnte kritisch sein.`,
        suggestion: `Überprüfen Sie die relevanten Verfahrensfristen im ${caseData.rechtsgebiet} und tragen Sie sie ein.`,
        resolved: false,
      });
    }

    // 5. SCHWACHE BEWEISE: Beweise mit niedriger Gewichtung
    for (const ev of evidence) {
      if ((ev.ki_weight || ev.weight || 5) < 3) {
        warnings.push({
          case_id: caseId,
          warning_type: "unterstuetzung_fehlt",
          severity: "niedrig",
          element_type: "beweis",
          element_id: ev.id,
          element_title: ev.title,
          title: `Schwaches Beweis-Element: "${ev.title}"`,
          description: `Dieses Beweismittel hat nur eine Gewichtung von ${ev.ki_weight || ev.weight || 5}/10. Überdenken Sie, ob es wirklich nützlich ist.`,
          suggestion: `Ersetzen Sie es durch stärkere Beweise oder entfernen Sie es.`,
          resolved: false,
        });
      }
    }

    // Speichere alle Warnungen
    if (warnings.length > 0) {
      await base44.entities.CaseWarning.bulkCreate(warnings);
    }

    return Response.json({
      caseId,
      warnings_count: warnings.length,
      warnings: warnings.map((w) => ({
        type: w.warning_type,
        severity: w.severity,
        title: w.title,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
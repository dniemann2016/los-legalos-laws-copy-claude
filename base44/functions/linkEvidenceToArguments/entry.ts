/**
 * linkEvidenceToArguments — Backend-Funktion
 * 
 * Verknüpft automatisch neu erstellte Beweise mit passenden Argumenten
 * im selben Fall, basierend auf semantischer Ähnlichkeit (KI-Analyse).
 * 
 * Wird nach analyzeDocument aufgerufen — verändert keine bestehenden Daten.
 * Setzt nur evidence.argument_id und argument.evidence_ids.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { caseId, docId } = await req.json();
    if (!caseId) return Response.json({ error: 'caseId erforderlich' }, { status: 400 });

    // Lade alle Argumente und Beweise des Falls
    const [args, allEvidence] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]);

    if (args.length === 0 || allEvidence.length === 0) {
      return Response.json({ success: true, linked: 0, message: 'Keine Argumente oder Beweise vorhanden' });
    }

    // Nur Beweise ohne bestehende Verknüpfung betrachten
    // (docId = nur Beweise aus dem neu hochgeladenen Dokument, dessen Quelle = doc.title)
    let evidenceToLink = allEvidence.filter(e => !e.argument_id);

    // Falls docId übergeben: filtere auf Beweise aus diesem Dokument
    if (docId) {
      const docs = await base44.entities.Document.filter({ id: docId });
      const doc = docs[0];
      if (doc?.title) {
        const fromDoc = allEvidence.filter(e => !e.argument_id && e.source === doc.title);
        // Wenn es Beweise aus diesem Dokument gibt, nur diese verknüpfen
        if (fromDoc.length > 0) evidenceToLink = fromDoc;
      }
    }

    if (evidenceToLink.length === 0) {
      return Response.json({ success: true, linked: 0, message: 'Alle Beweise sind bereits verknüpft' });
    }

    // KI-basierte Zuordnung: Welcher Beweis passt zu welchem Argument?
    const prompt = `Du bist ein erfahrener Prozessanwalt. Ordne jeden Beweis dem passendsten Argument zu.

ARGUMENTE (${args.length}):
${args.map((a, i) => `[${i}] ID="${a.id}" | Titel: "${a.title}" | Seite: ${a.side} | Beschreibung: ${(a.description || "").slice(0, 150)}`).join('\n')}

BEWEISE ZUM ZUORDNEN (${evidenceToLink.length}):
${evidenceToLink.map((e, i) => `[${i}] ID="${e.id}" | Titel: "${e.title}" | Typ: ${e.type || ""} | Beschreibung: ${(e.description || "").slice(0, 150)}`).join('\n')}

REGELN:
- Ordne jeden Beweis dem semantisch passendsten Argument zu (gleiche Partei bevorzugt)
- Nur zuordnen wenn es eine inhaltliche Verbindung gibt — besser kein Match als falsches Match
- Ein Beweis kann höchstens einem Argument zugeordnet werden
- Gib die exakten IDs zurück`;

    // Prompt kürzen wenn zu viele Einträge (Rate-Limit-Schutz)
    const argsToUse = args.slice(0, 15);
    const evidenceToUse = evidenceToLink.slice(0, 10);
    const shortPrompt = `Du bist ein Prozessanwalt. Ordne jeden Beweis dem passendsten Argument zu.

ARGUMENTE (${argsToUse.length}):
${argsToUse.map((a, i) => `[${i}] ID="${a.id}" | "${a.title}" | ${a.side}`).join('\n')}

BEWEISE (${evidenceToUse.length}):
${evidenceToUse.map((e, i) => `[${i}] ID="${e.id}" | "${e.title}"`).join('\n')}

Nur zuordnen wenn inhaltliche Verbindung klar. Gib exakte IDs zurück.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: shortPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          zuordnungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                evidence_id: { type: "string" },
                argument_id: { type: "string" },
                begruendung: { type: "string" },
                konfidenz: { type: "string", enum: ["hoch", "mittel", "niedrig"] }
              }
            }
          }
        }
      }
    });

    const zuordnungen = (result?.zuordnungen || []).filter(z =>
      z.evidence_id && z.argument_id &&
      z.konfidenz !== "niedrig" &&
      evidenceToLink.find(e => e.id === z.evidence_id) &&
      argsToUse.find(a => a.id === z.argument_id)
    );

    if (zuordnungen.length === 0) {
      return Response.json({ success: true, linked: 0, message: 'Keine passenden Zuordnungen gefunden' });
    }

    // Updates parallel ausführen
    const updatePromises = [];

    for (const z of zuordnungen) {
      const ev = evidenceToLink.find(e => e.id === z.evidence_id);
      const arg = args.find(a => a.id === z.argument_id);
      if (!ev || !arg) continue;

      // Evidence: argument_id setzen
      updatePromises.push(
        base44.entities.Evidence.update(z.evidence_id, {
          argument_id: z.argument_id,
        })
      );

      // Argument: evidence_ids erweitern (ohne Duplikate)
      const existingIds = Array.isArray(arg.evidence_ids) ? arg.evidence_ids : [];
      if (!existingIds.includes(z.evidence_id)) {
        updatePromises.push(
          base44.entities.Argument.update(z.argument_id, {
            evidence_ids: [...existingIds, z.evidence_id],
          })
        );
      }
    }

    await Promise.allSettled(updatePromises);

    return Response.json({
      success: true,
      linked: zuordnungen.length,
      zuordnungen: zuordnungen.map(z => ({
        evidence_id: z.evidence_id,
        argument_id: z.argument_id,
        konfidenz: z.konfidenz,
        begruendung: z.begruendung,
      })),
    });

  } catch (error) {
    console.error('linkEvidenceToArguments Fehler:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
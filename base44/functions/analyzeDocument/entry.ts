import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { docId, caseId } = await req.json();
    if (!docId || !caseId) return Response.json({ error: 'docId und caseId erforderlich' }, { status: 400 });

    // Lade Dokument und Fall parallel
    const [docs, cases] = await Promise.all([
      base44.entities.Document.filter({ id: docId }),
      base44.entities.Case.filter({ id: caseId }),
    ]);

    const doc = docs[0];
    const caseData = cases[0];
    if (!doc) return Response.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    if (!caseData) return Response.json({ error: 'Fall nicht gefunden' }, { status: 404 });

    // ── SCHRITT 1: Text extrahieren (nur wenn möglich) ──────────────────────
    let ocrText = "";
    const fileUrl = doc.file_url || "";
    const fileType = doc.file_type || "";
    const isExtractable = fileType.includes("pdf") || fileType.includes("word") ||
      fileType.includes("document") || fileType.includes("text") ||
      fileUrl.toLowerCase().match(/\.(pdf|docx|xlsx|csv|txt|pages|numbers)$/);

    if (isExtractable && fileUrl) {
      try {
        const ocrResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: { type: "object", properties: { volltext: { type: "string" } } }
        });
        if (ocrResult.status === "success" && ocrResult.output?.volltext) {
          ocrText = ocrResult.output.volltext.slice(0, 15000);
        }
      } catch (e) {
        console.log("OCR fehlgeschlagen, fahre ohne Text fort:", e.message);
      }
    }

    const isImage = fileType.startsWith("image/");
    const isVideo = fileType.startsWith("video/");

    // ── SCHRITT 2: KI-Analyse ──────────────────────────────────────────────
    const prompt = `Du bist ein erfahrener Rechtsanwalt auf Senior-Partner-Niveau und analysierst ein juristisches Dokument für einen Fall.

FALLKONTEXT:
- Fallname: ${caseData.fallname || "Unbekannt"}
- Rechtsgebiet: ${caseData.rechtsgebiet || "Nicht angegeben"}
- Gericht: ${caseData.gericht || "Nicht angegeben"}
- Prozessziel: ${caseData.prozessziel || "Nicht angegeben"}
- Zentrale Rechtsfrage: ${caseData.zentrale_rechtsfrage || "Nicht angegeben"}

DOKUMENT: "${doc.title}" (Typ: ${fileType || "unbekannt"})
${ocrText ? `\nDOKUMENTINHALT:\n${ocrText}` : "(Kein Volltext extrahierbar — analysiere aus Datei-URL)"}
${isImage ? "\nHINWEIS: Dies ist ein Bild. Analysiere Bildinhalt, Personen, Ort, Datum und juristische Beweisrelevanz." : ""}
${isVideo ? "\nHINWEIS: Dies ist ein Video. Analysiere den möglichen Inhalt, Personen, Orte und Beweiswert." : ""}

AUFGABE: Analysiere das Dokument und extrahiere NUR was tatsächlich im Dokument steht. Erfinde NICHTS. Lasse Felder leer wenn die Information nicht vorhanden ist.

REGELN:
- Basisdaten (Gericht, AZ etc.) nur eintragen wenn explizit im Dokument genannt
- Argumente nur wenn konkrete rechtliche Positionen erkennbar sind — extrahiere IMMER das Datum (YYYY-MM-DD) wenn ein Datum oder Zeitraum zum Argument erkennbar ist (z.B. Vertragsdatum, Ereignisdatum, Schreiben-Datum)
- Beweise nur wenn konkrete Beweismittel erkennbar sind — extrahiere IMMER das Datum (YYYY-MM-DD) wenn ein Datum erkennbar ist (z.B. Dokumentdatum, Ausstellungsdatum, Ereignisdatum)
- Fristen nur wenn konkrete Daten genannt werden (Format: YYYY-MM-DD)
- Personen nur wenn namentlich erwähnt
- Gegneranalyse nur wenn Gegnerposition erkennbar ist
- Strategie/Risiko/Simulation nur wenn daraus Ableitungen möglich sind
- Gib kurze, präzise Texte — keine langen Aufsätze`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrl ? [fileUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          zusammenfassung: { type: "string" },
          basisdaten: {
            type: "object",
            properties: {
              gericht: { type: "string" },
              aktenzeichen: { type: "string" },
              rechtsgebiet: { type: "string" },
              prozessziel: { type: "string" },
              zentrale_rechtsfrage: { type: "string" },
              instanz: { type: "string" },
            }
          },
          streitwert: { type: "number" },
          argumente: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                seite: { type: "string" },
                staerke: { type: "number" },
                datum: { type: "string", description: "Datum der Argumentation (YYYY-MM-DD) falls im Dokument erkennbar" },
              }
            }
          },
          beweise: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                typ: { type: "string" },
                gewicht: { type: "number" },
                datum: { type: "string", description: "Datum des Beweises / Ereignisses (YYYY-MM-DD) falls erkennbar" },
              }
            }
          },
          fristen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                datum: { type: "string" },
                fristtyp: { type: "string" },
              }
            }
          },
          personen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                rolle: { type: "string" },
                organisation: { type: "string" },
              }
            }
          },
          schritt3_gegneranalyse: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              taktiken: { type: "array", items: { type: "string" } },
              schwachstellen: { type: "array", items: { type: "string" } },
              gegner_profil: { type: "string" },
            }
          },
          schritt4_rechtliche_analyse: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              relevante_paragrafen: { type: "array", items: { type: "string" } },
              praezedenzfaelle: { type: "array", items: { type: "string" } },
              compliance_risiken: { type: "array", items: { type: "string" } },
            }
          },
          schritt5_strategie: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              empfohlene_strategie: { type: "string" },
              staerken: { type: "array", items: { type: "string" } },
              schwaechen: { type: "array", items: { type: "string" } },
            }
          },
          schritt6_risiko: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              risiken: { type: "array", items: { type: "string" } },
              risiko_level: { type: "string" },
            }
          },
          schritt7_simulation: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              vergleichswert_eur: { type: "number" },
              prognose_einfluss: { type: "string" },
            }
          },
          schritt8_aktion: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              naechste_schritte: { type: "array", items: { type: "string" } },
              erforderliche_dokumente: { type: "array", items: { type: "string" } },
            }
          },
          schritt9_cockpit: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              prognose_delta_pct: { type: "number" },
            }
          },
          schritt10_abschluss: {
            type: "object",
            properties: {
              zusammenfassung: { type: "string" },
              prozessziel_erreichbar: { type: "boolean" },
              vergleichsempfehlung: { type: "string" },
            }
          },
          informationsluecken: {
            type: "array",
            items: {
              type: "object",
              properties: {
                schritt: { type: "string" },
                hinweis: { type: "string" },
              }
            }
          }
        }
      },
      model: "automatic"
    });

    // InvokeLLM mit response_json_schema gibt das Objekt direkt zurück (kein .response wrapper)
    const result = llmResponse?.response || llmResponse || {};

    // ── SCHRITT 3: Daten in Entities & Case speichern ──────────────────────
    await base44.entities.Document.update(docId, {
      ai_summary: result.zusammenfassung || "",
      ai_raw: result,
    });

    // Case-Update aufbauen (nur nicht-leere Felder)
    const bd = result.basisdaten || {};
    const caseUpdate = {};

    // Schritt 1: Basisdaten — nur wenn leer im Case, und nicht "Nicht angegeben"
    const isValid = (v) => v?.trim() && !v.includes("Nicht angegeben") && v.trim().length > 2;
    if (isValid(bd.gericht) && !caseData.gericht) caseUpdate.gericht = bd.gericht;
    if (isValid(bd.aktenzeichen) && !caseData.aktenzeichen) caseUpdate.aktenzeichen = bd.aktenzeichen;
    if (isValid(bd.rechtsgebiet) && !caseData.rechtsgebiet) caseUpdate.rechtsgebiet = bd.rechtsgebiet;
    if (isValid(bd.prozessziel) && !caseData.prozessziel) caseUpdate.prozessziel = bd.prozessziel;
    if (isValid(bd.zentrale_rechtsfrage) && !caseData.zentrale_rechtsfrage) caseUpdate.zentrale_rechtsfrage = bd.zentrale_rechtsfrage;
    if (isValid(bd.instanz) && !caseData.instanz) caseUpdate.instanz = bd.instanz;
    if (result.streitwert > 0 && !caseData.streitwert) caseUpdate.streitwert = result.streitwert;

    // Schritt 3: Gegneranalyse → Case.gegner_profil
    const g3 = result.schritt3_gegneranalyse;
    if (g3?.zusammenfassung?.trim()) {
      const existing = caseData.gegner_profil || {};
      caseUpdate.gegner_profil = {
        ...existing,
        ki_zusammenfassung: g3.zusammenfassung,
        taktiken: [...(existing.taktiken || []), ...(g3.taktiken || [])].slice(0, 20),
        schwachstellen: [...(existing.schwachstellen || []), ...(g3.schwachstellen || [])].slice(0, 20),
        profil_text: g3.gegner_profil || existing.profil_text || "",
      };
    }

    // Schritt 4: Rechtliche Analyse → ki_berater_result
    const g4 = result.schritt4_rechtliche_analyse;
    const existingKi = caseData.ki_berater_result || {};
    const newKiData = { ...existingKi };
    let kiChanged = false;

    if (g4?.relevante_paragrafen?.length) {
      newKiData.relevante_paragrafen = [...new Set([...(existingKi.relevante_paragrafen || []), ...g4.relevante_paragrafen])].slice(0, 30);
      kiChanged = true;
    }
    if (g4?.praezedenzfaelle?.length) {
      newKiData.praezedenzfaelle = [...new Set([...(existingKi.praezedenzfaelle || []), ...g4.praezedenzfaelle])].slice(0, 20);
      kiChanged = true;
    }

    // Schritt 5: Strategie → notes
    const notizTeile = [];
    const g5 = result.schritt5_strategie;
    if (g5?.empfohlene_strategie?.trim()) {
      notizTeile.push(`📋 Strategie aus "${doc.title}":\n${g5.empfohlene_strategie}`);
    }

    // Schritt 6: Risiko → notes + ki_berater_result
    const g6 = result.schritt6_risiko;
    if (g6?.zusammenfassung?.trim()) {
      notizTeile.push(`⚠ Risikohinweis aus "${doc.title}" [${g6.risiko_level || "?"}]:\n${g6.zusammenfassung}`);
      if (g6.risiko_level) { newKiData.risiko_aus_dokument = g6.risiko_level; kiChanged = true; }
    }

    // Schritt 7: Simulation → ki_berater_result
    const g7 = result.schritt7_simulation;
    if (g7?.prognose_einfluss?.trim()) { newKiData.simulation_hinweis = g7.prognose_einfluss; kiChanged = true; }
    if (g7?.vergleichswert_eur > 0) { newKiData.vergleichswert_eur = g7.vergleichswert_eur; kiChanged = true; }

    // Schritt 8: Aktion → notes
    const g8 = result.schritt8_aktion;
    if (g8?.naechste_schritte?.length) {
      notizTeile.push(`→ Nächste Schritte aus "${doc.title}":\n${g8.naechste_schritte.map(s => `• ${s}`).join("\n")}`);
    }

    // Schritt 9: Cockpit → ki_berater_result
    const g9 = result.schritt9_cockpit;
    if (g9?.prognose_delta_pct != null && g9.prognose_delta_pct !== 0) {
      newKiData.prognose_delta = (existingKi.prognose_delta || 0) + g9.prognose_delta_pct;
      kiChanged = true;
    }

    // Schritt 10: Abschluss → ki_berater_result
    const g10 = result.schritt10_abschluss;
    if (g10?.vergleichsempfehlung?.trim()) { newKiData.vergleichsempfehlung = g10.vergleichsempfehlung; kiChanged = true; }

    if (notizTeile.length > 0) {
      caseUpdate.notes = [caseData.notes || "", ...notizTeile].filter(Boolean).join("\n\n---\n");
    }
    if (kiChanged) caseUpdate.ki_berater_result = newKiData;

    if (Object.keys(caseUpdate).length > 0) {
      await base44.entities.Case.update(caseId, caseUpdate);
    }

    // Schritt 2: Argumente, Beweise, Fristen, Personen — parallel anlegen
    const createPromises = [];

    for (const arg of (result.argumente || [])) {
      if (!arg.titel?.trim()) continue;
      // Normalisiere seite: "1" oder "eigen" oder alles was nicht "gegner" ist → "eigen"
      const seiteRaw = (arg.seite || "").toLowerCase();
      const side = seiteRaw.includes("gegner") || seiteRaw === "2" ? "gegner" : "eigen";
      createPromises.push(
        base44.entities.Argument.create({
          case_id: caseId,
          title: arg.titel,
          description: `${arg.beschreibung || ""}\n[KI aus: ${doc.title}]`,
          side,
          strength: Math.min(10, Math.max(1, Math.round(Number(arg.staerke) || 5))),
          type: "Rechtsargument",
          zeitpunkt: arg.datum || null,
        })
      );
    }

    for (const bew of (result.beweise || [])) {
      if (!bew.titel?.trim()) continue;
      createPromises.push(
        base44.entities.Evidence.create({
          case_id: caseId,
          title: bew.titel,
          description: `${bew.beschreibung || ""}\n[KI aus: ${doc.title}]`,
          type: bew.typ || "Dokument",
          weight: Math.min(10, Math.max(1, Math.round(Number(bew.gewicht) || 5))),
          source: doc.title,
          datum: bew.datum || null,
        })
      );
    }

    for (const frist of (result.fristen || [])) {
      if (!frist.titel?.trim() || !frist.datum?.trim()) continue;
      const datumValid = /^\d{4}-\d{2}-\d{2}$/.test(frist.datum);
      if (!datumValid) continue;
      createPromises.push(
        base44.entities.Deadline.create({
          case_id: caseId,
          title: frist.titel,
          frist_type: frist.fristtyp || "Sonstige",
          due_date: frist.datum,
          side: "Eigene",
          status: "offen",
        })
      );
    }

    for (const person of (result.personen || [])) {
      if (!person.name?.trim()) continue;
      const erlaubteRollen = ["Richter", "Zeuge", "Sachverständiger", "Partei", "Anwalt", "Gutachter"];
      const rolle = erlaubteRollen.find(r => person.rolle?.includes(r)) || "Partei";
      createPromises.push(
        base44.entities.Person.create({
          case_id: caseId,
          name: person.name,
          role: rolle,
          organization: person.organisation || "",
        })
      );
    }

    // Entity-Erstellungen in Batches von 5 aufteilen (Rate-Limit-Schutz)
    const BATCH_SIZE = 5;
    let failed = 0;
    for (let i = 0; i < createPromises.length; i += BATCH_SIZE) {
      const batch = createPromises.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch);
      failed += batchResults.filter(r => r.status === "rejected").length;
      // Kleine Pause zwischen Batches
      if (i + BATCH_SIZE < createPromises.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    if (failed > 0) console.log(`${failed} von ${createPromises.length} Entity-Erstellungen fehlgeschlagen`);

    // ── Auto-Verknüpfung: Beweise → Argumente (mit Delay, non-blocking) ──
    let linkStats = { linked: 0 };
    const neueBeweise = (result.beweise || []).filter(b => b.titel?.trim()).length;
    const neueArgumente = (result.argumente || []).filter(a => a.titel?.trim()).length;
    if (neueBeweise > 0 && neueArgumente > 0) {
      try {
        // Kurze Pause damit neue Entities persistiert sind bevor linking startet
        await new Promise(resolve => setTimeout(resolve, 1000));
        const linkRes = await base44.functions.invoke('linkEvidenceToArguments', { caseId, docId });
        linkStats = linkRes?.data || { linked: 0 };
      } catch (e) {
        console.log('Auto-Verknüpfung fehlgeschlagen (non-blocking):', e.message);
      }
    }

    return Response.json({
      success: true,
      result,
      stats: {
        argumente: neueArgumente,
        beweise: neueBeweise,
        fristen: (result.fristen || []).filter(f => f.titel?.trim() && f.datum?.trim()).length,
        personen: (result.personen || []).filter(p => p.name?.trim()).length,
        case_felder_aktualisiert: Object.keys(caseUpdate).length,
        verknuepfungen: linkStats.linked || 0,
      }
    });

  } catch (error) {
    console.error("analyzeDocument Fehler:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
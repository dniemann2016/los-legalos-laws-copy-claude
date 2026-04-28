import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─────────────────────────────────────────────────────────────────────────────
// analyzeDocumentV2 — optimierte Pipeline für Lexara
//
// Architektur:
// 1. Einmaliger Vorverarbeitungslauf: Text extrahieren → strukturiertes JSON
//    (gespeichert als doc.ai_raw.structured_json — nie wieder Originaldokument)
// 2. Parallele Tiefenanalyse-Jobs (Steps 2–10) auf dem strukturierten JSON
// 3. Modellabstufung: gpt_5_mini für Strukturextraktion, claude_sonnet_4_6 für Tiefenbewertung
// 4. Chunking bei Dokumenten über ~50 Chunks (großes Volltext)
// 5. Performance-Logging pro Step
// 6. Caching: wenn doc.ai_raw.structured_json bereits vorhanden → nur Tiefenanalyse
// ─────────────────────────────────────────────────────────────────────────────

const perf = {};
const log = (step, model, tokens, ms) => {
  perf[step] = { model, tokens: tokens || 0, ms: ms || 0 };
  console.log(`[PERF] ${step}: ${ms}ms | model=${model} | tokens≈${tokens || "?"}`);
};

// ── HELPERS ──────────────────────────────────────────────────────────────────
const t = () => Date.now();

function chunkText(text, chunkSize = 12000) {
  if (text.length <= chunkSize) return [text];
  const chunks = [];
  // Teile an Absatzgrenzen
  const paragraphs = text.split(/\n{2,}/);
  let current = "";
  for (const para of paragraphs) {
    if ((current + para).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── SCHRITT A: Strukturextraktion (schnelles Modell, einmalig) ───────────────
async function extractStructured(base44, text, fileUrl, fileType, docTitle, caseData) {
  const isImage = fileType?.startsWith("image/");
  const hasText = text.length > 100;

  // Für Bilder: direkt Sonnet mit file_url
  if (isImage && !hasText) {
    const start = t();
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysiere dieses Bild juristisch. Extrahiere: Beteiligte Parteien, Daten, Orte, Sachverhalt, Beweisrelevanz. Sei präzise und vollständig.`,
      file_urls: [fileUrl],
      response_json_schema: {
        type: "object",
        properties: {
          volltext_rekonstruiert: { type: "string" },
          parteien: { type: "array", items: { type: "object", properties: { name: { type: "string" }, rolle: { type: "string" } } } },
          daten: { type: "array", items: { type: "string" } },
          schluessel_fakten: { type: "array", items: { type: "string" } },
          klauseln: { type: "array", items: { type: "object", properties: { typ: { type: "string" }, text: { type: "string" } } } },
          fristen: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
          betraege: { type: "array", items: { type: "object", properties: { betrag: { type: "number" }, beschreibung: { type: "string" } } } },
          gesetze: { type: "array", items: { type: "string" } },
          doc_typ: { type: "string" },
        }
      },
      model: "claude_sonnet_4_6"
    });
    log("A_image_extract", "claude_sonnet_4_6", null, t() - start);
    return r;
  }

  // Für Texte: Chunking + parallele Extraktion mit schnellem Modell
  const chunks = chunkText(text || "", 12000);
  console.log(`[CHUNKING] ${chunks.length} Chunks für "${docTitle}"`);

  const chunkSchema = {
    type: "object",
    properties: {
      klauseln: { type: "array", items: { type: "object", properties: { typ: { type: "string" }, text: { type: "string" } } } },
      parteien: { type: "array", items: { type: "object", properties: { name: { type: "string" }, rolle: { type: "string" } } } },
      fristen: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
      betraege: { type: "array", items: { type: "object", properties: { betrag: { type: "number" }, beschreibung: { type: "string" } } } },
      patentansprueche: { type: "array", items: { type: "string" } },
      gesetze: { type: "array", items: { type: "string" } },
      schluessel_fakten: { type: "array", items: { type: "string" } },
    }
  };

  const start = t();
  // Alle Chunks parallel verarbeiten (schnelles Modell)
  const chunkResults = await Promise.all(chunks.map((chunk, i) =>
    base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein juristischer Datenextraktor. Extrahiere EXAKT die folgenden Daten aus diesem Textabschnitt (${i + 1}/${chunks.length}) des Dokuments "${docTitle}". Nur was explizit steht — kein Raten.

FALLKONTEXT: ${caseData.rechtsgebiet || ""} | ${caseData.prozessziel || ""}

TEXT:
${chunk}`,
      response_json_schema: chunkSchema,
      model: "gpt_5_mini"
    }).catch(e => {
      console.log(`Chunk ${i + 1} fehlgeschlagen:`, e.message);
      return {};
    })
  ));
  log("A_text_extract", "gpt_5_mini", chunks.length * 2000, t() - start);

  // Chunks zusammenführen (dedup)
  const merge = (key) => {
    const all = chunkResults.flatMap(r => r[key] || []);
    if (typeof all[0] === "string") return [...new Set(all)];
    // Objekte: dedup by JSON
    const seen = new Set();
    return all.filter(item => {
      const k = JSON.stringify(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  return {
    klauseln: merge("klauseln"),
    parteien: merge("parteien"),
    fristen: merge("fristen"),
    betraege: merge("betraege"),
    patentansprueche: merge("patentansprueche"),
    gesetze: merge("gesetze"),
    schluessel_fakten: merge("schluessel_fakten"),
    volltext_rekonstruiert: text.slice(0, 3000), // Kurzreferenz für Tiefenanalyse
  };
}

// ── SCHRITT B: Parallele Tiefenanalyse-Jobs (Sonnet nur wo nötig) ────────────
async function runParallelDeepAnalysis(base44, structured, fileUrl, fileType, docTitle, caseData) {
  const ctx = `FALL: ${caseData.fallname || ""} | ${caseData.rechtsgebiet || ""} | ${caseData.prozessziel || ""}
DOK: "${docTitle}"`;

  // Token-effizient: jeder Job bekommt NUR seine relevante JSON-Sektion

  const jobs = {
    // ── Job 1: Basisdaten (schnell — gpt_5_mini) ───────────────────────
    basisdaten: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Extrahiere Basisdaten aus diesen Fakten: ${JSON.stringify(structured.schluessel_fakten?.slice(0, 15) || [])}
Parteien: ${JSON.stringify(structured.parteien?.slice(0, 10) || [])}
Nur wenn explizit vorhanden. Kein Raten.`,
        response_json_schema: {
          type: "object",
          properties: {
            gericht: { type: "string" }, aktenzeichen: { type: "string" },
            rechtsgebiet: { type: "string" }, prozessziel: { type: "string" },
            zentrale_rechtsfrage: { type: "string" }, instanz: { type: "string" },
            streitwert: { type: "number" }, zusammenfassung: { type: "string" },
          }
        },
        model: "gpt_5_mini"
      });
      log("B_basisdaten", "gpt_5_mini", null, t() - start);
      return r;
    },

    // ── Job 2: Argumente & Beweise (schnell — gpt_5_mini) ──────────────
    argumente_beweise: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Identifiziere juristische Argumente und Beweismittel.
Klauseln: ${JSON.stringify(structured.klauseln?.slice(0, 20) || [])}
Fakten: ${JSON.stringify(structured.schluessel_fakten?.slice(0, 15) || [])}
Parteien: ${JSON.stringify(structured.parteien?.slice(0, 8) || [])}
Nur was explizit belegt ist. Gib jedem Argument eine Stärke 1–10.`,
        response_json_schema: {
          type: "object",
          properties: {
            argumente: { type: "array", items: { type: "object", properties: {
              titel: { type: "string" }, beschreibung: { type: "string" },
              seite: { type: "string" }, staerke: { type: "number" }
            }}},
            beweise: { type: "array", items: { type: "object", properties: {
              titel: { type: "string" }, beschreibung: { type: "string" },
              typ: { type: "string" }, gewicht: { type: "number" }
            }}}
          }
        },
        model: "gpt_5_mini"
      });
      log("B_argumente_beweise", "gpt_5_mini", null, t() - start);
      return r;
    },

    // ── Job 3: Fristen & Personen (schnell — gpt_5_mini) ───────────────
    fristen_personen: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Extrahiere Fristen und Personen.
Fristen aus Strukturextraktion: ${JSON.stringify(structured.fristen?.slice(0, 15) || [])}
Parteien: ${JSON.stringify(structured.parteien?.slice(0, 15) || [])}
Daten: ${JSON.stringify(structured.schluessel_fakten?.filter(f => /\d{4}/.test(f)).slice(0, 10) || [])}
Fristen müssen exaktes Datum haben (YYYY-MM-DD). Personen nur wenn namentlich erwähnt.`,
        response_json_schema: {
          type: "object",
          properties: {
            fristen: { type: "array", items: { type: "object", properties: {
              titel: { type: "string" }, datum: { type: "string" }, fristtyp: { type: "string" }
            }}},
            personen: { type: "array", items: { type: "object", properties: {
              name: { type: "string" }, rolle: { type: "string" }, organisation: { type: "string" }
            }}}
          }
        },
        model: "gpt_5_mini"
      });
      log("B_fristen_personen", "gpt_5_mini", null, t() - start);
      return r;
    },

    // ── Job 4: Gegneranalyse (Sonnet — juristische Tiefenbewertung) ─────
    gegneranalyse: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Du bist Senior-Partner. Analysiere die Gegenpartei.
Bekannte Parteien: ${JSON.stringify(structured.parteien?.slice(0, 10) || [])}
Schlüssel-Klauseln (Gegenposition): ${JSON.stringify(structured.klauseln?.filter(k => ["haftung","ausschluss","widerspruch","kündigung","penalty"].some(w => k.typ?.toLowerCase().includes(w) || k.text?.toLowerCase().includes(w))).slice(0, 8) || [])}
Fakten: ${JSON.stringify(structured.schluessel_fakten?.slice(0, 12) || [])}
Gesetze: ${JSON.stringify(structured.gesetze?.slice(0, 10) || [])}`,
        response_json_schema: {
          type: "object",
          properties: {
            zusammenfassung: { type: "string" },
            taktiken: { type: "array", items: { type: "string" } },
            schwachstellen: { type: "array", items: { type: "string" } },
            gegner_profil: { type: "string" }
          }
        },
        model: "claude_sonnet_4_6"
      });
      log("B_gegneranalyse", "claude_sonnet_4_6", null, t() - start);
      return r;
    },

    // ── Job 5: Rechtliche Analyse (Sonnet) ─────────────────────────────
    rechtliche_analyse: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Rechtliche Tiefenanalyse.
Gesetze & Paragraphen: ${JSON.stringify(structured.gesetze?.slice(0, 20) || [])}
Patentansprüche (falls vorhanden): ${JSON.stringify(structured.patentansprueche?.slice(0, 5) || [])}
Schlüsselfakten: ${JSON.stringify(structured.schluessel_fakten?.slice(0, 12) || [])}
Klauseln: ${JSON.stringify(structured.klauseln?.slice(0, 10) || [])}`,
        response_json_schema: {
          type: "object",
          properties: {
            zusammenfassung: { type: "string" },
            relevante_paragrafen: { type: "array", items: { type: "string" } },
            praezedenzfaelle: { type: "array", items: { type: "string" } },
            compliance_risiken: { type: "array", items: { type: "string" } }
          }
        },
        model: "claude_sonnet_4_6"
      });
      log("B_rechtliche_analyse", "claude_sonnet_4_6", null, t() - start);
      return r;
    },

    // ── Job 6: Strategie + Risiko (Sonnet — kombiniert für Effizienz) ───
    strategie_risiko: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Erstelle Prozessstrategie und Risikoanalyse.
Klauseln: ${JSON.stringify(structured.klauseln?.slice(0, 12) || [])}
Gesetze: ${JSON.stringify(structured.gesetze?.slice(0, 10) || [])}
Beträge: ${JSON.stringify(structured.betraege?.slice(0, 8) || [])}
Fakten: ${JSON.stringify(structured.schluessel_fakten?.slice(0, 12) || [])}
Gib konkrete Handlungsempfehlungen auf Senior-Partner-Niveau.`,
        response_json_schema: {
          type: "object",
          properties: {
            schritt5_strategie: { type: "object", properties: {
              zusammenfassung: { type: "string" }, empfohlene_strategie: { type: "string" },
              staerken: { type: "array", items: { type: "string" } },
              schwaechen: { type: "array", items: { type: "string" } }
            }},
            schritt6_risiko: { type: "object", properties: {
              zusammenfassung: { type: "string" },
              risiken: { type: "array", items: { type: "string" } },
              risiko_level: { type: "string" }
            }}
          }
        },
        model: "claude_sonnet_4_6"
      });
      log("B_strategie_risiko", "claude_sonnet_4_6", null, t() - start);
      return r;
    },

    // ── Job 7: Simulation + Cockpit + Abschluss (Sonnet — kombiniert) ──
    simulation_abschluss: async () => {
      const start = t();
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `${ctx}
Verhandlungssimulation, Cockpit-Prognose und Abschlussempfehlung.
Beträge: ${JSON.stringify(structured.betraege?.slice(0, 8) || [])}
Fristen: ${JSON.stringify(structured.fristen?.slice(0, 8) || [])}
Schlüsselfakten: ${JSON.stringify(structured.schluessel_fakten?.slice(0, 10) || [])}
Schätze Vergleichswert und Prognose-Einfluss dieses Dokuments auf den Fall.`,
        response_json_schema: {
          type: "object",
          properties: {
            schritt7_simulation: { type: "object", properties: {
              zusammenfassung: { type: "string" }, vergleichswert_eur: { type: "number" }, prognose_einfluss: { type: "string" }
            }},
            schritt8_aktion: { type: "object", properties: {
              zusammenfassung: { type: "string" },
              naechste_schritte: { type: "array", items: { type: "string" } },
              erforderliche_dokumente: { type: "array", items: { type: "string" } }
            }},
            schritt9_cockpit: { type: "object", properties: {
              zusammenfassung: { type: "string" }, prognose_delta_pct: { type: "number" }
            }},
            schritt10_abschluss: { type: "object", properties: {
              zusammenfassung: { type: "string" }, prozessziel_erreichbar: { type: "boolean" }, vergleichsempfehlung: { type: "string" }
            }},
            informationsluecken: { type: "array", items: { type: "object", properties: {
              schritt: { type: "string" }, hinweis: { type: "string" }
            }}}
          }
        },
        model: "claude_sonnet_4_6"
      });
      log("B_simulation_abschluss", "claude_sonnet_4_6", null, t() - start);
      return r;
    },
  };

  // ALLE Jobs parallel starten
  const startAll = t();
  const [basisdaten, argBeweise, fristenPersonen, gegner, rechtlich, strategieRisiko, simAbschluss] = await Promise.all([
    jobs.basisdaten(),
    jobs.argumente_beweise(),
    jobs.fristen_personen(),
    jobs.gegneranalyse(),
    jobs.rechtliche_analyse(),
    jobs.strategie_risiko(),
    jobs.simulation_abschluss(),
  ]);
  log("B_total_parallel", "all", null, t() - startAll);

  return {
    basisdaten: { ...basisdaten },
    streitwert: basisdaten.streitwert || null,
    zusammenfassung: basisdaten.zusammenfassung || "",
    argumente: argBeweise.argumente || [],
    beweise: argBeweise.beweise || [],
    fristen: fristenPersonen.fristen || [],
    personen: fristenPersonen.personen || [],
    schritt3_gegneranalyse: gegner,
    schritt4_rechtliche_analyse: rechtlich,
    schritt5_strategie: strategieRisiko.schritt5_strategie || {},
    schritt6_risiko: strategieRisiko.schritt6_risiko || {},
    schritt7_simulation: simAbschluss.schritt7_simulation || {},
    schritt8_aktion: simAbschluss.schritt8_aktion || {},
    schritt9_cockpit: simAbschluss.schritt9_cockpit || {},
    schritt10_abschluss: simAbschluss.schritt10_abschluss || {},
    informationsluecken: simAbschluss.informationsluecken || [],
  };
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const totalStart = t();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { docId, caseId, forceReprocess } = await req.json();
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

    const fileUrl = doc.file_url || "";
    const fileType = doc.file_type || "";

    // ── CACHING: Wenn structured_json bereits vorhanden und kein forceReprocess ─
    let structured = doc.ai_raw?.structured_json || null;
    const cacheHit = !!structured && !forceReprocess;

    if (!cacheHit) {
      // ── SCHRITT A: Text extrahieren (einmalig, nie wieder) ─────────────
      let ocrText = "";
      const isExtractable = fileType.includes("pdf") || fileType.includes("word") ||
        fileType.includes("document") || fileType.includes("text") ||
        fileUrl.toLowerCase().match(/\.(pdf|docx|xlsx|csv|txt|pages|numbers)$/);

      if (isExtractable && fileUrl) {
        const ocrStart = t();
        try {
          const ocrResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: { type: "object", properties: { volltext: { type: "string" } } }
          });
          if (ocrResult.status === "success" && ocrResult.output?.volltext) {
            // Kein hartes 15k-Limit mehr — Chunking übernimmt die Kontrolle
            ocrText = ocrResult.output.volltext;
          }
        } catch (e) {
          console.log("OCR fehlgeschlagen:", e.message);
        }
        log("A_ocr", "extract", null, t() - ocrStart);
      }

      // ── Strukturextraktion (einmaliger Vorverarbeitungslauf) ────────────
      structured = await extractStructured(base44, ocrText, fileUrl, fileType, doc.title, caseData);

      // Strukturiertes JSON sofort in DB speichern (Cache-Basis)
      await base44.entities.Document.update(docId, {
        ai_raw: { ...(doc.ai_raw || {}), structured_json: structured, cache_ts: new Date().toISOString() }
      });
      console.log(`[CACHE] structured_json gespeichert für ${docId}`);
    } else {
      console.log(`[CACHE HIT] structured_json wiederverwendet für ${docId}`);
      log("A_cache_hit", "none", 0, 0);
    }

    // ── SCHRITT B: Parallele Tiefenanalyse auf strukturiertem JSON ────────
    const result = await runParallelDeepAnalysis(base44, structured, fileUrl, fileType, doc.title, caseData);

    // ── SCHRITT C: Alles in Entities & Case speichern (parallel) ─────────
    await base44.entities.Document.update(docId, {
      ai_summary: result.zusammenfassung || "",
      ai_raw: { ...(doc.ai_raw || {}), ...result, structured_json: structured, perf_log: perf },
    });

    const bd = result.basisdaten || {};
    const caseUpdate = {};
    const isValid = (v) => v?.trim() && !v.includes("Nicht angegeben") && v.trim().length > 2;

    if (isValid(bd.gericht) && !caseData.gericht) caseUpdate.gericht = bd.gericht;
    if (isValid(bd.aktenzeichen) && !caseData.aktenzeichen) caseUpdate.aktenzeichen = bd.aktenzeichen;
    if (isValid(bd.rechtsgebiet) && !caseData.rechtsgebiet) caseUpdate.rechtsgebiet = bd.rechtsgebiet;
    if (isValid(bd.prozessziel) && !caseData.prozessziel) caseUpdate.prozessziel = bd.prozessziel;
    if (isValid(bd.zentrale_rechtsfrage) && !caseData.zentrale_rechtsfrage) caseUpdate.zentrale_rechtsfrage = bd.zentrale_rechtsfrage;
    if (isValid(bd.instanz) && !caseData.instanz) caseUpdate.instanz = bd.instanz;
    if (result.streitwert > 0 && !caseData.streitwert) caseUpdate.streitwert = result.streitwert;

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

    const notizTeile = [];
    const g5 = result.schritt5_strategie;
    if (g5?.empfohlene_strategie?.trim()) notizTeile.push(`📋 Strategie aus "${doc.title}":\n${g5.empfohlene_strategie}`);

    const g6 = result.schritt6_risiko;
    if (g6?.zusammenfassung?.trim()) {
      notizTeile.push(`⚠ Risikohinweis aus "${doc.title}" [${g6.risiko_level || "?"}]:\n${g6.zusammenfassung}`);
      if (g6.risiko_level) { newKiData.risiko_aus_dokument = g6.risiko_level; kiChanged = true; }
    }

    const g7 = result.schritt7_simulation;
    if (g7?.prognose_einfluss?.trim()) { newKiData.simulation_hinweis = g7.prognose_einfluss; kiChanged = true; }
    if (g7?.vergleichswert_eur > 0) { newKiData.vergleichswert_eur = g7.vergleichswert_eur; kiChanged = true; }

    const g8 = result.schritt8_aktion;
    if (g8?.naechste_schritte?.length) notizTeile.push(`→ Nächste Schritte aus "${doc.title}":\n${g8.naechste_schritte.map(s => `• ${s}`).join("\n")}`);

    const g9 = result.schritt9_cockpit;
    if (g9?.prognose_delta_pct != null && g9.prognose_delta_pct !== 0) {
      newKiData.prognose_delta = (existingKi.prognose_delta || 0) + g9.prognose_delta_pct;
      kiChanged = true;
    }

    const g10 = result.schritt10_abschluss;
    if (g10?.vergleichsempfehlung?.trim()) { newKiData.vergleichsempfehlung = g10.vergleichsempfehlung; kiChanged = true; }

    if (notizTeile.length > 0) caseUpdate.notes = [caseData.notes || "", ...notizTeile].filter(Boolean).join("\n\n---\n");
    if (kiChanged) caseUpdate.ki_berater_result = newKiData;

    // Entity-Erstellungen + Case-Update parallel
    const createPromises = [];

    for (const arg of (result.argumente || [])) {
      if (!arg.titel?.trim()) continue;
      const seiteRaw = (arg.seite || "").toLowerCase();
      const side = seiteRaw.includes("gegner") || seiteRaw === "2" ? "gegner" : "eigen";
      createPromises.push(base44.entities.Argument.create({
        case_id: caseId, title: arg.titel,
        description: `${arg.beschreibung || ""}\n[KI aus: ${doc.title}]`,
        side, strength: Math.min(10, Math.max(1, Math.round(Number(arg.staerke) || 5))),
        type: "Rechtsargument",
      }));
    }

    for (const bew of (result.beweise || [])) {
      if (!bew.titel?.trim()) continue;
      createPromises.push(base44.entities.Evidence.create({
        case_id: caseId, title: bew.titel,
        description: `${bew.beschreibung || ""}\n[KI aus: ${doc.title}]`,
        type: bew.typ || "Dokument",
        weight: Math.min(10, Math.max(1, Math.round(Number(bew.gewicht) || 5))),
        source: doc.title,
      }));
    }

    for (const frist of (result.fristen || [])) {
      if (!frist.titel?.trim() || !frist.datum?.trim()) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(frist.datum)) continue;
      createPromises.push(base44.entities.Deadline.create({
        case_id: caseId, title: frist.titel,
        frist_type: frist.fristtyp || "Sonstige",
        due_date: frist.datum, side: "Eigene", status: "offen",
      }));
    }

    for (const person of (result.personen || [])) {
      if (!person.name?.trim()) continue;
      const erlaubteRollen = ["Richter", "Zeuge", "Sachverständiger", "Partei", "Anwalt", "Gutachter"];
      const rolle = erlaubteRollen.find(r => person.rolle?.includes(r)) || "Partei";
      createPromises.push(base44.entities.Person.create({
        case_id: caseId, name: person.name, role: rolle, organization: person.organisation || "",
      }));
    }

    if (Object.keys(caseUpdate).length > 0) createPromises.push(base44.entities.Case.update(caseId, caseUpdate));

    const createResults = await Promise.allSettled(createPromises);
    const failed = createResults.filter(r => r.status === "rejected").length;
    if (failed > 0) console.log(`${failed} von ${createPromises.length} Entity-Erstellungen fehlgeschlagen`);

    const totalMs = t() - totalStart;
    log("TOTAL", "pipeline", null, totalMs);

    return Response.json({
      success: true,
      result,
      cache_hit: cacheHit,
      stats: {
        argumente: (result.argumente || []).filter(a => a.titel?.trim()).length,
        beweise: (result.beweise || []).filter(b => b.titel?.trim()).length,
        fristen: (result.fristen || []).filter(f => f.titel?.trim() && f.datum?.trim()).length,
        personen: (result.personen || []).filter(p => p.name?.trim()).length,
        case_felder_aktualisiert: Object.keys(caseUpdate).length,
        total_ms: totalMs,
        cache_hit: cacheHit,
        perf_log: perf,
      }
    });

  } catch (error) {
    console.error("analyzeDocumentV2 Fehler:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
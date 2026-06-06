/**
 * VizConfig.js
 * 
 * Zentrale Konfiguration für Visualisierungs-Prompts und Tabs.
 */

export const VIZ_TABS = [
  { id: "heatmap",   label: "01 · Heatmap",       icon: "🔥", desc: "Wo liegt das Risiko?" },
  { id: "wirkung",   label: "02 · Wirkungsbaum",  icon: "🌳", desc: "Wie wirkt die Klausel?" },
  { id: "zeitachse", label: "03 · Zeitachse",     icon: "⏱", desc: "Wann wird sie scharf?" },
  { id: "optionen",  label: "04 · Optionen",      icon: "⚖️", desc: "Was kann ich tun?" },
  { id: "quadrant",  label: "05 · Quadrant",      icon: "📊", desc: "Gesamtportfolio?" },
  { id: "vergleich", label: "10 · Vorher/Nachher", icon: "✏️", desc: "Wie neu formulieren?" },
];

// KI-Prompts pro Visualisierungsformat
export const VIZ_PROMPTS = {
  heatmap: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein Senior-Vertragsrechtler. Analysiere die folgenden Klauseln speziell für eine Risiko-Heatmap-Darstellung. Vergib für jede Klausel einen präzisen Risiko-Score (0-10), begründe die Einstufung und priorisiere nach Handlungsbedarf für das Unternehmen.

Unternehmenskontext: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"})
Klauseln: ${klauseln.map(k => `${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung}`).join("\n")}

Erstelle für JEDE Klausel eine Heatmap-Bewertung: exakter Score, Hauptrisiko in einem Satz, sofortiger Handlungsbedarf (ja/nein) und Priorität (1=höchste).`,
    response_json_schema: {
      type: "object",
      properties: {
        bewertungen: { type: "array", items: { type: "object", properties: {
          klausel_typ: { type: "string" },
          score: { type: "number" },
          hauptrisiko: { type: "string" },
          sofortiger_handlungsbedarf: { type: "boolean" },
          prioritaet: { type: "number" },
          ki_hinweis: { type: "string" }
        }}},
        gesamt_heatmap_fazit: { type: "string" },
        top3_kritische_klauseln: { type: "array", items: { type: "string" } }
      }
    }
  }),

  wirkung: (klauseln, klausel, ctx) => ({
    prompt: `Du bist Unternehmensberater und Vertragsrechtler. Analysiere die Klausel "${klausel?.klausel_typ}" speziell für einen Wirkungsbaum: Wie wirkt diese Klausel konkret ins Unternehmen hinein? Welche Abteilungen, Prozesse, Finanzen und strategischen Ziele sind betroffen?

Klausel: ${klausel?.klausel_typ}
Beschreibung: ${klausel?.kurzbeschreibung}
Mechanik: ${klausel?.rechtliche_mechanik || "—"}
Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"}, Umsatz ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"Mio. EUR" : "unbekannt"})

Erstelle konkrete Wirkungspfade mit quantifizierten Auswirkungen (in EUR wo möglich).`,
    response_json_schema: {
      type: "object",
      properties: {
        wirkungspfade: { type: "array", items: { type: "object", properties: {
          bereich: { type: "string" },
          beschreibung: { type: "string" },
          finanzieller_einfluss_eur: { type: "number" },
          zeitrahmen: { type: "string" },
          positiv: { type: "boolean" },
          betroffene_abteilungen: { type: "array", items: { type: "string" } }
        }}},
        gesamteinfluss_eur: { type: "number" },
        kritischster_pfad: { type: "string" },
        empfehlung: { type: "string" }
      }
    }
  }),

  zeitachse: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein strategischer Rechtsberater. Analysiere die Klausel "${klausel?.klausel_typ}" speziell für eine Zeitachse: Wann und unter welchen Bedingungen wird diese Klausel scharf? Welche konkreten Trigger-Ereignisse gibt es in welchem Zeitraum?

Klausel: ${klausel?.klausel_typ} [${klausel?.risiko_stufe}]
Beschreibung: ${klausel?.kurzbeschreibung}
Vorhandene Szenarien: ${JSON.stringify(klausel?.szenarien || [])}
Kontext: ${ctx.sachverhalt_lang?.slice(0, 200) || "—"}

Erstelle eine präzise Zeitachsen-Analyse mit konkreten Meilensteinen, Wahrscheinlichkeiten und Frühwarnsignalen.`,
    response_json_schema: {
      type: "object",
      properties: {
        meilensteine: { type: "array", items: { type: "object", properties: {
          zeitpunkt: { type: "string" },
          ereignis: { type: "string" },
          trigger: { type: "string" },
          wahrscheinlichkeit_pct: { type: "number" },
          handlungsfenster_tage: { type: "number" },
          kritisch: { type: "boolean" }
        }}},
        fruehwarnsignale: { type: "array", items: { type: "string" } },
        kritischer_zeitpunkt: { type: "string" },
        empfohlene_ueberwachung: { type: "string" }
      }
    }
  }),

  optionen: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein strategischer Verhandlungsexperte und Senior-Anwalt. Analysiere die Klausel "${klausel?.klausel_typ}" und erarbeite alle konkreten Handlungsoptionen — von der einfachsten Akzeptanz bis zum Klauselangriff. Jede Option soll realistisch, mit Kosten, Wahrscheinlichkeit und strategischem Wert bewertet sein.

Klausel: ${klausel?.klausel_typ} [Risiko: ${klausel?.risiko_stufe}]
${klausel?.kurzbeschreibung}
Verhandlungsempfehlung bisher: ${klausel?.verhandlungsempfehlung || "—"}
Durchsetzbar: ${klausel?.durchsetzbar ? "Ja" : "Nein"} — ${klausel?.durchsetzbarkeit || "—"}
Unternehmen: ${ctx.unternehmen_name || "—"} (Gegenpartei: ${ctx.gegner_name || "—"})

Erstelle 4-6 differenzierte Optionen von konservativ bis aggressiv.`,
    response_json_schema: {
      type: "object",
      properties: {
        optionen: { type: "array", items: { type: "object", properties: {
          id: { type: "string" },
          titel: { type: "string" },
          beschreibung: { type: "string" },
          vorgehen: { type: "string" },
          kosten_eur: { type: "number" },
          kosten_label: { type: "string" },
          wahrscheinlichkeit_pct: { type: "number" },
          strategischer_wert: { type: "string" },
          zeitaufwand: { type: "string" },
          empfohlen: { type: "boolean" },
          risiken: { type: "array", items: { type: "string" } }
        }}},
        beste_option_begruendung: { type: "string" },
        verhandlungsstrategie: { type: "string" }
      }
    }
  }),

  quadrant: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein Portfolio-Risikostratege. Analysiere ALLE Klauseln dieses Vertrags für eine Chancen-Risiken-Portfolio-Analyse. Positioniere jede Klausel im Quadrant nach Eintrittswahrscheinlichkeit und Wirkungstiefe.

Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"})
Alle Klauseln:
${klauseln.map(k => `- ${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung?.slice(0, 80)}`).join("\n")}

Gib für jede Klausel: genaue Koordinaten (x=Wahrscheinlichkeit 0-100, y=Wirkungstiefe 0-10), Quadrant-Kategorie und strategische Einordnung. Leite daraus Portfolio-Empfehlungen ab.`,
    response_json_schema: {
      type: "object",
      properties: {
        portfolio: { type: "array", items: { type: "object", properties: {
          klausel_typ: { type: "string" },
          x_wahrscheinlichkeit: { type: "number" },
          y_wirkungstiefe: { type: "number" },
          quadrant: { type: "string" },
          strategische_einordnung: { type: "string" },
          sofortmassnahme: { type: "string" }
        }}},
        portfolio_fazit: { type: "string" },
        top_prioritaet: { type: "string" },
        gesamtrisiko_score: { type: "number" }
      }
    }
  }),

  vergleich: (klauseln, klausel, ctx) => ({
    prompt: `Du bist ein Vertragsformulierungsexperte und Senior-Anwalt für Vertragsrecht. Erstelle für die Klausel "${klausel?.klausel_typ}" eine professionelle Vorher-Nachher-Analyse: IST-Formulierung mit allen Risiken, und optimierte SOLL-Formulierung die die Risiken minimiert aber wirtschaftlich realistisch ist.

IST-Klausel: ${klausel?.klausel_typ}
Beschreibung: ${klausel?.kurzbeschreibung}
Risiko: ${klausel?.risiko_stufe}
Bisherige Nachteile: ${(klausel?.juristische_nachteile || []).join("; ")}
Bisherige Verhandlungsempfehlung: ${klausel?.verhandlungsempfehlung || "—"}
Bisherige Alternativformulierung: ${klausel?.alternativ_formulierung || "—"}
Gegenpartei: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})

Erstelle eine vollständige, juristisch präzise Neuformulierung mit Begründung und Verhandlungsstrategie.`,
    response_json_schema: {
      type: "object",
      properties: {
        ist_formulierung: { type: "string" },
        ist_probleme: { type: "array", items: { type: "string" } },
        soll_formulierung: { type: "string" },
        soll_vorteile: { type: "array", items: { type: "string" } },
        risiko_reduktion_pct: { type: "number" },
        verhandlungsargument: { type: "string" },
        gegner_einwand: { type: "string" },
        kompromiss_formulierung: { type: "string" },
        rechtliche_grundlage: { type: "string" }
      }
    }
  }),
};
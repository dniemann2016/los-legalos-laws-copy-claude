import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Info, X, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

function InfoModal({ title, explanation, formula, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{explanation}</p>
        {formula && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Formel / Methodik</p>
            <code className="text-xs text-blue-800 font-mono whitespace-pre-wrap">{formula}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBtn({ title, explanation, formula }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-blue-500 transition-colors ml-1" title="Wie kommt die KI darauf?">
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && <InfoModal title={title} explanation={explanation} formula={formula} onClose={() => setOpen(false)} />}
    </>
  );
}

const EMPTY_PROFIL = { gegner_name:"", gegner_groesse:"", gegner_finanzlage:"", gegner_branche:"", entscheider_name:"", entscheider_alter:"", entscheider_persoenlichkeit:"", entscheider_karriere:"", entscheider_schwaechen:"", anwalt_kanzlei:"", anwalt_bekannt_fuer:"", anwalt_schwaechen:"", verhalten_verhandlung:"", verhalten_taktik:"", verhalten_fehler:"", eigene_staerken:"", eigene_schwaechen:"", ziel_maximal:"", ziel_realistisch:"", ziel_minimal:"", nicht_verhandelbar:"", kontext_oeffentlichkeit:"", kontext_zeitdruck:"", kontext_weitere:"" };

export default function TabKIBerater({ caseId, caseData, onUpdate, kiMode = true }) {
  const [acknowledged, setAcknowledged] = useState(!!(caseData?.ki_berater_result));
  const [profil, setProfil] = useState(caseData?.gegner_profil || EMPTY_PROFIL);
  const [showProfil, setShowProfil] = useState(false);

  // ── History Stack: alle KI-Ergebnisse ────────────────────────────────────
  const buildInitialHistory = () => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`ki_history_${caseId}`) || "[]"); } catch { return []; }
    })();
    if (stored.length > 0) return stored;
    if (caseData?.ki_berater_result) return [{ result: caseData.ki_berater_result, ts: Date.now() }];
    return [];
  };

  const [history, setHistory] = useState(buildInitialHistory);
  const [historyIdx, setHistoryIdx] = useState(() => {
    const h = buildInitialHistory();
    return h.length > 0 ? h.length - 1 : -1;
  });

  const result = historyIdx >= 0 && history[historyIdx] ? history[historyIdx].result : null;

  const pushHistory = (newResult) => {
    const entry = { result: newResult, ts: Date.now() };
    // Schneide alles nach dem aktuellen Index ab (kein redo nach neuem run)
    const newHistory = [...history.slice(0, historyIdx + 1), entry];
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    try { localStorage.setItem(`ki_history_${caseId}`, JSON.stringify(newHistory.slice(-10))); } catch {}
  };

  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [args, setArgs] = useState([]);

  useEffect(() => { base44.entities.Argument.filter({case_id:caseId}).then(setArgs); }, [caseId]);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysisError(null);
    try {
      const eigene = args.filter(a=>a.side==="eigen");
      const gegner = args.filter(a=>a.side==="gegner");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein hochspezialisierter juristischer Berater und strategischer Analytiker auf Senior-Partner-Niveau einer Großkanzlei. Du beherrschst DACH-Recht (BGB, HGB, AktG, GmbHG, InsO, ZPO, DSGVO, UWG, GWB, ArbR) und US-Recht (UCC, common law, securities law) und kombinierst juristische Präzision mit strategischer Verhandlungsführung nach Harvard-Methode, FBI-Taktiken (Voss) und Machiavelli-Prinzipien.

Analysiere diesen Fall vollständig und gib NUR valides JSON zurück (kein Markdown, keine Erklärung außerhalb des JSON).

Fall: ${caseData?.fallname||""} 
Rechtsgebiet: ${caseData?.rechtsgebiet||""} | Instanz: ${caseData?.instanz||""} | Prognose: ${caseData?.prognose||0}%
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage||""}
Prozessziel: ${caseData?.prozessziel||""}
Eigene Argumente: ${eigene.map(a=>`${a.title} (${a.strength||5}/10)`).join(", ")||"keine"}
Gegner-Argumente: ${gegner.map(a=>`${a.title} (${a.strength||5}/10)`).join(", ")||"keine"}
Gegner-Organisation: ${profil.gegner_name||"unbekannt"} | Branche: ${profil.gegner_branche||""} | Finanzlage: ${profil.gegner_finanzlage||""}
Entscheider: ${profil.entscheider_name||""} | Persönlichkeit: ${profil.entscheider_persoenlichkeit||""} | Schwächen: ${profil.entscheider_schwaechen||""}
Gegner-Anwalt: ${profil.anwalt_kanzlei||""} | Bekannt für: ${profil.anwalt_bekannt_fuer||""} | Schwächen: ${profil.anwalt_schwaechen||""}
Bisheriges Verhalten: ${profil.verhalten_taktik||""} | Fehler: ${profil.verhalten_fehler||""}
Unsere Stärken: ${profil.eigene_staerken||""} | Schwächen: ${profil.eigene_schwaechen||""}
Ziele: Max ${profil.ziel_maximal||""} | Realistisch ${profil.ziel_realistisch||""} | Minimal ${profil.ziel_minimal||""} | Nicht verhandelbar: ${profil.nicht_verhandelbar||""}
Externe Faktoren: ${profil.kontext_zeitdruck||""} ${profil.kontext_oeffentlichkeit||""} ${profil.kontext_weitere||""}

DEINE AUFGABE – erstelle eine vollständige juristische + strategische Analyse:

1. RECHTLICHE EINORDNUNG: Identifiziere alle relevanten Anspruchsgrundlagen (BGB/HGB/ZPO oder US-Recht), Prüfungsaufbau, typische Gegenargumente der Gegenseite und kritische Schwachstellen unserer Position.
2. ISSUE SPOTTING: Welche rechtlichen Risiken sind noch nicht erfasst? (DD-Lücken, Compliance-Risiken, prozessrechtliche Fallstricke)
3. PSYCHOLOGISCHES PROFIL des Gegners nach Big Five und Dark Triad.
4. DRUCKMITTEL: Alle Hebelpunkte (juristische wie außerjuristische).
5. STRATEGIEOPTIONEN: 3-5 Optionen von kooperativ bis aggressiv, mit Erfolgswahrscheinlichkeit.
6. TIMING & MOMENTUM: Kritische Zeitfenster, nächster Schritt.
7. INFORMATIONSSTRATEGIE: Was offenlegen/verbergen/bluffen.
8. VERHANDLUNGSSKRIPT nach Harvard/FBI/Machiavelli.
9. COMPLIANCE-CHECK: Gibt es Compliance-, Kartellrecht- oder DSGVO-Risiken im Fall?`,
        response_json_schema: {
          type: "object",
          properties: {
            rechtliche_einordnung: { type: "object", properties: {
              anspruchsgrundlagen: { type: "array", items: { type: "string" } },
              pruefungsschema: { type: "string" },
              gegner_gegenargumente: { type: "array", items: { type: "string" } },
              kritische_schwachstellen: { type: "array", items: { type: "string" } }
            }},
            issue_spotting: { type: "array", items: { type: "object", properties: {
              risiko: { type: "string" }, kategorie: { type: "string" },
              empfehlung: { type: "string" }, prioritaet: { type: "string" }
            }}},
            psychologisches_profil: { type: "object", properties: {
              big_five: { type: "object", properties: {
                Offenheit: { type: "number" }, Gewissenhaftigkeit: { type: "number" },
                Extraversion: { type: "number" }, Verträglichkeit: { type: "number" }, Neurotizismus: { type: "number" }
              }},
              dark_triad: { type: "object", properties: {
                Narzissmus: { type: "number" }, Machiavelismus: { type: "number" }, Psychopathie: { type: "number" }
              }},
              trigger: { type: "array", items: { type: "object", properties: {
                trigger: { type: "string" }, beschreibung: { type: "string" }, intensitaet: { type: "string" }
              }}},
              empfehlung: { type: "string" }
            }},
            druckmittel: { type: "array", items: { type: "object", properties: {
              titel: { type: "string" }, kategorie: { type: "string" },
              wie_nutzen: { type: "string" }, timing: { type: "string" },
              risiko: { type: "string" }, staerke: { type: "number" }
            }}},
            strategien: { type: "array", items: { type: "object", properties: {
              name: { type: "string" }, stil: { type: "string" },
              schritte: { type: "array", items: { type: "string" } },
              risiko: { type: "string" }, zitat: { type: "string" }, erfolg_pct: { type: "number" }
            }}},
            timing: { type: "object", properties: {
              momentum: { type: "string" }, momentum_pct: { type: "number" },
              zeitfenster: { type: "array", items: { type: "object", properties: {
                zeitraum: { type: "string" }, aktion: { type: "string" }
              }}},
              naechster_schritt: { type: "string" }
            }},
            informationsstrategie: { type: "object", properties: {
              sofort_offenlegen: { type: "array", items: { type: "string" } },
              verbergen: { type: "array", items: { type: "string" } },
              als_bluff: { type: "array", items: { type: "string" } }
            }},
            verhandlungsskript: { type: "object", properties: {
              vorbereitung: { type: "string" }, opening: { type: "string" },
              argumentation: { type: "string" }, closing: { type: "string" },
              einwand: { type: "string" }, backup: { type: "string" },
              psycho_notizen: { type: "array", items: { type: "string" } }
            }},
            compliance_check: { type: "object", properties: {
              risiken: { type: "array", items: { type: "string" } },
              empfehlungen: { type: "array", items: { type: "string" } }
            }},
            empfehlung: { type: "string" }
          }
        },
        model: "claude_sonnet_4_6"
      });

      if (!res || typeof res !== "object") throw new Error("Kein gültiges Ergebnis erhalten.");

      pushHistory(res);
      await base44.entities.Case.update(caseId, { ki_berater_result: res, gegner_profil: profil });
      onUpdate({ ...caseData, ki_berater_result: res, gegner_profil: profil });
    } catch (err) {
      setAnalysisError(`Fehler: ${err?.message || "Unbekannter Fehler. Bitte erneut versuchen."}`);
    }
    setLoading(false);
  };

  if (!acknowledged) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">⚠️ Rechtshinweis & Vertraulichkeit</h3>
          <p className="text-sm text-gray-600 mb-4">Diese Analyse dient <strong>ausschließlich der Vorbereitung</strong> auf mögliche gegnerische Taktiken und der Entwicklung legitimer Verhandlungsstrategien.</p>
          <ul className="space-y-1 text-sm text-gray-600 mb-4">
            {["Absolut vertraulich (§ 203 StGB Anwaltsgeheimnis)","Keine Anleitung zu unlauteren Methoden (§ 138 ZPO)","Defensive Taktik-Analyse, kein Rechtsbruch","Endverantwortung liegt IMMER beim Anwalt"].map(i=>(
              <li key={i} className="flex items-center gap-2"><span className="text-gray-400">•</span> {i}</li>
            ))}
          </ul>
          <Button onClick={() => setAcknowledged(true)} className="w-full bg-gray-900 text-white rounded-xl">
            Verstanden – Strategischen Berater öffnen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Gegner-Profil */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <button onClick={() => setShowProfil(!showProfil)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 w-full">
          🎯 Gegner-Profil & Kontext eingeben ({showProfil?"ausblenden":"anzeigen"})
        </button>
        {showProfil && (
          <div className="mt-4 space-y-4">
            {[
              ["🏢 Gegner-Organisation",[["Name","gegner_name","z.B. ABC GmbH"],["Größe","gegner_groesse","z.B. Mittelstand, 200 MA"],["Finanzlage","gegner_finanzlage","z.B. Liquiditätsprobleme"],["Branche","gegner_branche","z.B. Pharma"]]],
              ["👤 Entscheider (CEO/GF)",[["Name/Titel","entscheider_name","z.B. Dr. Max Müller (CEO)"],["Alter","entscheider_alter","z.B. 58"],["Persönlichkeit","entscheider_persoenlichkeit","z.B. Dominant, risikoscheu"],["Karrierephase","entscheider_karriere","z.B. Kurz vor Ruhestand"],["Schwächen","entscheider_schwaechen","z.B. Angst vor Medienberichten"]]],
              ["⚖️ Anwalt Gegenseite",[["Kanzlei","anwalt_kanzlei","z.B. Schmidt & Partner"],["Bekannt für","anwalt_bekannt_fuer","z.B. Aggressive Taktik"],["Schwächen","anwalt_schwaechen","z.B. Überzieht oft, Richter genervt"]]],
              ["📋 Bisheriges Verhalten",[["Verhandlungsbereitschaft","verhalten_verhandlung","z.B. Öffentlich: Null. Privat: Signale"],["Taktik","verhalten_taktik","z.B. Verzögerung, viele Beweisanträge"],["Fehler","verhalten_fehler","z.B. Widerspruch zwischen Schriftsätzen"]]],
              ["💪 Eigene Position",[["Stärken","eigene_staerken","z.B. Klare Beweislage"],["Schwächen","eigene_schwaechen","z.B. Mandant finanziell limitiert"],["Ziel maximal","ziel_maximal","z.B. 500.000€ + Unterlassung"],["Ziel realistisch","ziel_realistisch","z.B. 300.000€"],["Ziel minimal","ziel_minimal","z.B. 150.000€"],["Nicht verhandelbar","nicht_verhandelbar","z.B. Öffentliche Entschuldigung"]]],
              ["🌐 Externe Faktoren",[["Öffentlichkeit","kontext_oeffentlichkeit","z.B. Medieninteresse vorhanden"],["Zeitdruck","kontext_zeitdruck","z.B. Fusion in 6 Monaten"],["Weitere Faktoren","kontext_weitere","z.B. Hauptversammlung"]]],
            ].map(([sectionTitle, fields]) => (
              <div key={sectionTitle}>
                <p className="text-xs font-semibold text-gray-600 mb-2">{sectionTitle}</p>
                <div className="grid grid-cols-2 gap-2">
                  {fields.map(([label, field, placeholder]) => (
                    <div key={field}>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{label}</label>
                      <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-gray-50" placeholder={placeholder} value={profil[field]||""} onChange={e=>setProfil({...profil,[field]:e.target.value})} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!kiMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-lg">✏️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Manuell-Modus — KI-Analyse deaktiviert</p>
            <p className="text-xs text-amber-600">Der KI-Berater ist ausgeschaltet. Aktiviere den KI-Modus oben, um die Analyse zu starten.</p>
          </div>
        </div>
      )}

      {/* Analyse-Module + History-Steuerung */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">🎯 Analyse-Module</h3>
          {/* ── History Navigator ── */}
          {history.length > 1 && (
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
              <button
                onClick={() => setHistoryIdx(i => Math.max(0, i - 1))}
                disabled={historyIdx <= 0}
                className="p-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
                title="Vorherige Analyse"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <span className="text-[10px] font-semibold text-gray-500 px-1">
                Analyse {historyIdx + 1} / {history.length}
              </span>
              <button
                onClick={() => setHistoryIdx(i => Math.min(history.length - 1, i + 1))}
                disabled={historyIdx >= history.length - 1}
                className="p-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
                title="Nächste Analyse"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm("History löschen?")) {
                    setHistory([]);
                    setHistoryIdx(-1);
                    localStorage.removeItem(`ki_history_${caseId}`);
                  }
                }}
                className="p-1 rounded hover:bg-red-50 transition-colors ml-1"
                title="History löschen"
              >
                <RotateCcw className="w-3 h-3 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          )}
        </div>

        {/* Zeitstempel der aktuell angezeigten Analyse */}
        {history.length > 0 && historyIdx >= 0 && (
          <p className="text-[10px] text-gray-400 mb-3">
            🕐 {historyIdx === history.length - 1 ? "Aktuellste Analyse" : `Frühere Analyse`} vom{" "}
            {new Date(history[historyIdx]?.ts || Date.now()).toLocaleString("de-DE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            ["👤","Psychologisches Profil","Big Five + Dark Triad Assessment der Gegenpartei.",!!result?.psychologisches_profil],
            ["🎯","Druckmittel-Analyse","Systematische Identifikation aller Schwachstellen.",!!(result?.druckmittel?.length)],
            ["⚔️","Strategieempfehlungen","3–5 taktische Optionen mit Erfolgswahrscheinlichkeit.",!!(result?.strategien?.length)],
            ["⏰","Timing & Momentum","Optimaler Zeitpunkt für jeden Schritt.",!!result?.timing],
            ["🔒","Informationsstrategie","Was offenlegen, verbergen oder als Bluff nutzen?",!!result?.informationsstrategie],
            ["💬","Verhandlungsskript","FBI-Taktiken (Calibrated Questions) und konkrete Formulierungen.",!!result?.verhandlungsskript],
          ].map(([icon,title,desc,done]) => (
            <div key={title} className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-semibold text-gray-700">{title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              {done && <p className="text-[10px] text-green-600 mt-1.5">✓ Ergebnis vorhanden</p>}
            </div>
          ))}
        </div>

        {kiMode ? (
          <Button onClick={runAnalysis} disabled={loading} className="w-full bg-gray-900 text-white rounded-xl gap-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analysiere mit KI...</> : result ? "🔄 Neue Analyse starten (wird in History gespeichert)" : "🎯 Vollständige Analyse starten"}
          </Button>
        ) : (
          <div className="text-center py-3 text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-200">
            ✏️ KI-Analyse ist im Manuell-Modus deaktiviert
          </div>
        )}
        {analysisError && <p className="text-xs text-red-500 mt-2 text-center">⚠️ {analysisError}</p>}
        <p className="text-[10px] text-amber-600 text-center mt-2">⚠️ Diese Analyse kann 30–60 Sekunden dauern</p>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">

          {/* Rechtliche Einordnung */}
          {result.rechtliche_einordnung && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">⚖️ Rechtliche Einordnung</h3>
              {(result.rechtliche_einordnung.anspruchsgrundlagen||[]).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Anspruchsgrundlagen</p>
                  {result.rechtliche_einordnung.anspruchsgrundlagen.map((a,i) => <p key={i} className="text-xs text-gray-600">• {a}</p>)}
                </div>
              )}
              {result.rechtliche_einordnung.pruefungsschema && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Prüfungsschema</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{result.rechtliche_einordnung.pruefungsschema}</p>
                </div>
              )}
              {(result.rechtliche_einordnung.kritische_schwachstellen||[]).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1">⚠ Kritische Schwachstellen</p>
                  {result.rechtliche_einordnung.kritische_schwachstellen.map((s,i) => <p key={i} className="text-xs text-red-600">• {s}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Psychologisches Profil */}
          {result.psychologisches_profil && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">👤 Psychologisches Profil – Ergebnis
                <InfoBtn title="Wie wird das psychologische Profil berechnet?" explanation="Die KI analysiert alle eingegebenen Informationen über den Gegner und ordnet diese den wissenschaftlich anerkannten Persönlichkeitsmodellen zu. Das Big Five Modell (OCEAN) bewertet 5 Dimensionen von 1–10. Das Dark Triad Modell erfasst Narzissmus, Machiavelismus und Psychopathie." formula={"Big Five Score (1–10): Basiert auf Verhaltenssignalen.\nDark Triad (1–10):\nNarzissmus = Ego-Signale / Karrierephase\nMachiavelismus = Taktik-Signale\nPsychopathie = Impulsivitäts-Signale"} />
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">📊 Big Five Analyse</p>
                  {result.psychologisches_profil.big_five && Object.entries(result.psychologisches_profil.big_five).map(([k,v]) => (
                    <div key={k} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-500 w-40">{k}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-700 rounded-full" style={{width:`${(v||5)*10}%`}} /></div>
                      <span className="text-xs text-gray-600">{v||5}/10</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">🎭 Dark Triad</p>
                  {result.psychologisches_profil.dark_triad && Object.entries(result.psychologisches_profil.dark_triad).map(([k,v]) => (
                    <div key={k} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-500 w-24">{k}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-700 rounded-full" style={{width:`${(v||5)*10}%`}} /></div>
                      <span className="text-xs text-gray-600">{v||5}/10</span>
                    </div>
                  ))}
                  {(result.psychologisches_profil.trigger||[]).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">⚡ Psychologische Trigger</p>
                      {result.psychologisches_profil.trigger.map((t,i) => (
                        <div key={i} className="text-xs mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded mr-1 ${t.intensitaet==="hoch"?"bg-red-100 text-red-600":t.intensitaet==="mittel"?"bg-yellow-100 text-yellow-600":"bg-blue-100 text-blue-600"}`}>{t.intensitaet}</span>
                          <strong>{t.trigger}</strong>: <span className="text-gray-500">{t.beschreibung}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {result.psychologisches_profil.empfehlung && <p className="text-xs text-gray-600 mt-4 p-3 bg-gray-50 rounded-lg italic">🎯 <strong>Empfohlener Ansatz:</strong> {result.psychologisches_profil.empfehlung}</p>}
            </div>
          )}

          {/* Druckmittel */}
          {(result.druckmittel||[]).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">🎯 Druckmittel-Analyse – Ergebnis
                <InfoBtn title="Wie wird die Druckmittel-Stärke berechnet?" explanation="Die KI identifiziert Hebelpunkte aus dem Profil. Jedes Druckmittel erhält eine Stärke (1–10) basierend auf Wirksamkeit, Risikofreiheit und Zeitnähe." formula={"Stärke = Wirksamkeit×0.5 + Risikofreiheit×0.3 + Zeitnähe×0.2"} />
              </h3>
              <div className="space-y-3">
                {result.druckmittel.map((d,i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-800">{d.titel}</span>
                      {d.staerke && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-600 rounded-full" style={{width:`${d.staerke*10}%`}} /></div>
                          <span className="text-xs text-gray-500">{d.staerke}/10</span>
                        </div>
                      )}
                    </div>
                    {d.kategorie && <p className="text-[10px] text-gray-400 mb-1">{d.kategorie}</p>}
                    {d.wie_nutzen && <p className="text-xs text-gray-600">→ {d.wie_nutzen}</p>}
                    {d.timing && <p className="text-xs text-blue-600 mt-1">⏰ {d.timing}</p>}
                    {d.risiko && <p className="text-xs text-amber-600 mt-0.5">⚠️ {d.risiko}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timing & Momentum */}
          {result.timing && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">⏰ Timing & Momentum – Ergebnis
                <InfoBtn title="Wie wird das Momentum berechnet?" explanation="Das Momentum (0–100%) bewertet, wie günstig der aktuelle Zeitpunkt für unsere Seite ist." formula={"Momentum = Externe Faktoren×0.35 + Prognose×0.35 + Verhandlungsposition×0.30"} />
              </h3>
              {result.timing.momentum && (
                <div className="mb-3 flex items-center gap-3">
                  <p className="text-xs text-gray-600 flex-1">{result.timing.momentum}</p>
                  {result.timing.momentum_pct !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{width:`${result.timing.momentum_pct}%`}} /></div>
                      <span className="text-xs text-gray-500">{result.timing.momentum_pct}%</span>
                    </div>
                  )}
                </div>
              )}
              {(result.timing.zeitfenster||[]).length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-xs font-semibold text-gray-600">Kritische Zeitfenster:</p>
                  {result.timing.zeitfenster.map((z,i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs">
                      {typeof z === "object" ? Object.entries(z).map(([k,v]) => <span key={k} className="mr-3 text-gray-600"><strong>{k}:</strong> {v}</span>) : z}
                    </div>
                  ))}
                </div>
              )}
              {result.timing.naechster_schritt && <p className="text-xs text-gray-900 bg-blue-50 rounded-lg p-3">→ <strong>Nächster Schritt:</strong> {result.timing.naechster_schritt}</p>}
            </div>
          )}

          {/* Informationsstrategie */}
          {result.informationsstrategie && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">🔒 Informationsstrategie – Ergebnis
                <InfoBtn title="Wie klassifiziert die KI die Informationen?" explanation="Die KI bewertet jede Information: Offenlegen (stärkt uns), Verbergen (würde Gegner stärken), Bluff (Wahrnehmungswert höher als tatsächlicher Wert). Ethisch-rechtliche Grenzen (§ 138 ZPO) werden berücksichtigt." formula={"Offenlegen: Eigenwert hoch + Kein Schaden\nVerbergen: Gegnervorteil wenn bekannt\nBluff: Wahrnehmungswert >> tatsächlicher Wert"} />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[["sofort_offenlegen","✅ Sofort offenlegen","bg-green-50 border-green-100 text-green-700"],["verbergen","🔒 Verbergen","bg-red-50 border-red-100 text-red-700"],["als_bluff","🎭 Als Bluff nutzen","bg-amber-50 border-amber-100 text-amber-700"]].map(([key,label,cls]) => (
                  (result.informationsstrategie[key]||[]).length > 0 && (
                    <div key={key} className={`rounded-xl border p-3 ${cls}`}>
                      <p className="text-xs font-semibold mb-2">{label}</p>
                      <ul className="space-y-1">{(result.informationsstrategie[key]||[]).map((item,i) => <li key={i} className="text-xs">• {item}</li>)}</ul>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Strategien */}
          {(result.strategien||[]).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">⚔️ Strategieempfehlungen – Ergebnis
                <InfoBtn title="Wie werden die Erfolgswahrscheinlichkeiten berechnet?" explanation="Die KI berechnet für jede Strategie eine Erfolgswahrscheinlichkeit basierend auf: Fallprognose, psychologischem Profil, Argumentenstärke und Timing/Momentum." formula={"Erfolg_pct = Basis_Prognose × Profil-Match × Druckmittel × Timing"} />
              </h3>
              <div className="space-y-4">
                {result.strategien.map((s,i) => (
                  <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h4 className="font-semibold text-gray-800">{s.name}</h4>
                      <span className="text-xs text-gray-400">{s.erfolg_pct ? `${s.erfolg_pct}% Erfolg` : ""}</span>
                    </div>
                    {s.stil && <p className="text-xs text-gray-500 italic mb-2">{s.stil}</p>}
                    {(s.schritte||[]).map((step,j) => <p key={j} className="text-xs text-gray-600">→ {step}</p>)}
                    {s.risiko && <p className="text-xs text-amber-600 mt-1">⚠️ Risiko: {s.risiko}</p>}
                    {s.zitat && <p className="text-xs text-gray-400 italic mt-1">"{s.zitat}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verhandlungsskript */}
          {result.verhandlungsskript && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">💬 Verhandlungsskript – Ergebnis
                <InfoBtn title="Wie wird das Verhandlungsskript generiert?" explanation="Das Skript kombiniert Harvard-Methode, FBI-Taktiken nach Chris Voss (Calibrated Questions, Mirroring) und Machiavelli-Prinzipien." formula={"Skript-Gewichtung nach Gegner-Profil:\nHoher Narzissmus → Ego-Framing\nHoher Machiavelismus → Gegentaktik\nHohe Psychopathie → Eskalations-Kontrolle"} />
              </h3>
              {[["🎯 Vorbereitung","vorbereitung"],["🎬 Opening","opening"],["⚔️ Argumentation","argumentation"],["🤝 Closing","closing"],["📋 Backup Plan","backup"],["💬 Einwandbehandlung","einwand"]].map(([label, key]) => (
                result.verhandlungsskript[key] ? (
                  <div key={key} className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-600 mb-1">{label}</h4>
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">{result.verhandlungsskript[key]}</p>
                  </div>
                ) : null
              ))}
              {(result.verhandlungsskript.psycho_notizen||[]).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">🧠 Psychologische Notizen</h4>
                  {result.verhandlungsskript.psycho_notizen.map((n,i) => <p key={i} className="text-xs text-gray-600">✓ {n}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Compliance */}
          {result.compliance_check && (result.compliance_check.risiken||[]).length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🛡️ Compliance-Check</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1">Risiken</p>
                  {result.compliance_check.risiken.map((r,i) => <p key={i} className="text-xs text-gray-600">• {r}</p>)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-1">Empfehlungen</p>
                  {(result.compliance_check.empfehlungen||[]).map((e,i) => <p key={i} className="text-xs text-gray-600">• {e}</p>)}
                </div>
              </div>
            </div>
          )}

          {result.empfehlung && (
            <div className="bg-gray-900 text-white rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-2">🎯 Gesamtempfehlung</h3>
              <p className="text-sm">{result.empfehlung}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
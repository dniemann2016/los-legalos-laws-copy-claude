import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Sparkles, Target, Shield, Zap, AlertTriangle, Calculator, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computePrognose, computeBreakEven } from "@/lib/legalAlgorithms";

// Einfache Laienerklärungen pro Berechnungsschritt-Label
const SIMPLE_EXPLANATIONS = {
  "Prior-Wahrscheinlichkeit (Basisrate)":
    "💡 Einfach erklärt: Bevor wir irgendetwas über den Fall wissen, fragen wir: Wie oft gewinnt der Kläger in diesem Rechtsgebiet statistisch? Das ist unser Startpunkt – wie ein Wettertipp vor Betrachtung der Wolken.",
  "Argumentationsbilanz":
    "💡 Einfach erklärt: Wie stark sind unsere Argumente im Vergleich zu den gegnerischen? Starke eigene Argumente verbessern die Prognose, starke Gegenargumente verschlechtern sie – ähnlich wie bei einer Waage.",
  "Beweisqualität & -quantität":
    "💡 Einfach erklärt: Mehr gute Beweise = bessere Chancen. Aber mehr Beweise bringen immer weniger zusätzlichen Nutzen (der 10. Beweis zählt weniger als der 1.). Die Qualität jedes Beweises fließt gewichtet ein.",
  "Richter-Statistik (Bayesianisch)":
    "💡 Einfach erklärt: Wenn wir wissen, wie oft dieser Richter den Kläger gewinnen lässt, passen wir unsere Prognose entsprechend an – wie ein Tipp auf einen Tennisspieler, wenn man dessen Siegquote auf diesem Platz kennt.",
  "Richter-Statistik":
    "💡 Einfach erklärt: Kein Richter bekannt – deshalb bleibt die Prognose an dieser Stelle unverändert.",
  "Fristenrisiko (Malus)":
    "💡 Einfach erklärt: Versäumte Fristen schaden dem Fall erheblich – Gerichte nehmen das sehr ernst. Jede versäumte Frist zieht die Prognose nach unten, wie ein Strafstoß beim Fußball.",
  "Vergleichsangebot-Signal":
    "💡 Einfach erklärt: Ein hohes Vergleichsangebot der Gegenseite zeigt, dass die Gegner nervös sind – ein positives Zeichen für uns. Ein niedriges Angebot deutet auf ihre Stärke hin.",
  "Finale Wahrscheinlichkeit (Logistische Transformation)":
    "💡 Einfach erklärt: Alle Faktoren wurden auf einer technischen Skala addiert. Die logistische Funktion wandelt diese Summe in eine echte Prozentzahl zwischen 0% und 100% um – wie ein Thermometer, das eine Zahl in 'heiß' oder 'kalt' übersetzt.",
  "90%-Konfidenzintervall (Fehlerfortpflanzung)":
    "💡 Einfach erklärt: Kein Ergebnis ist 100% sicher. Das Konfidenzintervall zeigt den realistischen Korridor: 'Mit 90% Wahrscheinlichkeit liegt die echte Chance zwischen X% und Y%.' Je breiter der Bereich, desto unsicherer die Datenlage.",
};

function AlgoStepCard({ step, index }) {
  const [open, setOpen] = useState(false);
  const wert = typeof step.wert === "number"
    ? `${step.wert > 0 ? "+" : ""}${step.wert.toFixed(4)} ${step.einheit || ""}`
    : typeof step.wert === "object" && step.wert?.ciLow !== undefined
      ? `[${(step.wert.ciLow * 100).toFixed(1)}%, ${(step.wert.ciHigh * 100).toFixed(1)}%]`
      : "";
  const simpleExpl = SIMPLE_EXPLANATIONS[step.label];
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
        <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
        <span className="flex-1 text-xs font-medium text-gray-700">{step.label}</span>
        <code className="text-[10px] text-violet-700 font-mono">{wert}</code>
        {open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100 space-y-2 pt-2">
          {step.formel && (
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-gray-400 mb-0.5">FORMEL</p>
              <code className="text-[10px] text-blue-800 font-mono break-all">{step.formel}</code>
            </div>
          )}
          <p className="text-xs text-gray-600">{step.erklaerung}</p>
          {simpleExpl && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-800 leading-relaxed">{simpleExpl}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ value, max = 10, color = "bg-blue-500" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-10 text-right">{value?.toFixed(1)}/10</span>
    </div>
  );
}

function ScoreCard({ label, manual, ki, icon }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
      <p className="text-xs font-semibold text-gray-600">{icon} {label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-16">Manuell</span>
          <ScoreBar value={manual} color="bg-blue-400" />
        </div>
        {ki !== null && ki !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-violet-500 w-16">KI</span>
            <ScoreBar value={ki} color="bg-violet-500" />
          </div>
        )}
      </div>
    </div>
  );
}

const avg = (arr, field) => {
  const vals = arr.map(x => x[field]).filter(v => v !== undefined && v !== null && !isNaN(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
};

export default function TabGesamtbewertung({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [persons, setPersons] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [kiAnalysis, setKiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [algoResult, setAlgoResult] = useState(null);
  const [showAlgoSteps, setShowAlgoSteps] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
    ]).then(([a, e, p, d]) => { setArgs(a); setEvidence(e); setPersons(p); setDeadlines(d); setLoaded(true); });
  }, [caseId]);

  const eigeneArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  // Algorithmus-Prognose
  const algoPrognose = loaded
    ? computePrognose({ args, evidence, deadlines, persons, caseData })
    : null;
  const breakEven = loaded ? computeBreakEven({ caseData }) : null;

  // Manual scores
  const manEigeneArg = avg(eigeneArgs, "strength");
  const manGegnerArg = avg(gegnerArgs, "strength");
  const manEv = avg(evidence, "weight");

  // KI scores (if available)
  const kiEigeneArg = avg(eigeneArgs.filter(a => a.ki_strength !== undefined && a.ki_strength !== null), "ki_strength");
  const kiGegnerArg = avg(gegnerArgs.filter(a => a.ki_strength !== undefined && a.ki_strength !== null), "ki_strength");
  const kiEv = avg(evidence.filter(e => e.ki_weight !== undefined && e.ki_weight !== null), "ki_weight");

  const hasKiWeights = eigeneArgs.some(a => a.ki_strength !== null && a.ki_strength !== undefined) ||
    evidence.some(e => e.ki_weight !== null && e.ki_weight !== undefined);

  // Overall score (manual)
  const manualScore = eigeneArgs.length + evidence.length === 0 ? 0 :
    (manEigeneArg * 0.4 + Math.max(0, 10 - manGegnerArg) * 0.3 + manEv * 0.3);
  const kiScore = !hasKiWeights ? null :
    (kiEigeneArg * 0.4 + Math.max(0, 10 - kiGegnerArg) * 0.3 + kiEv * 0.3);

  const runKiAnalysis = async () => {
    setAnalyzing(true);
    try {
      const eigArg = eigeneArgs.slice(0, 5).map(a => `"${a.title}" Stärke:${a.ki_strength ?? a.strength ?? 5}/10`).join(", ");
      const gegArg = gegnerArgs.slice(0, 5).map(a => `"${a.title}" Stärke:${a.ki_strength ?? a.strength ?? 5}/10`).join(", ");
      const ev = evidence.slice(0, 5).map(e => `"${e.title}" Gewicht:${e.ki_weight ?? e.weight ?? 5}/10`).join(", ");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist erfahrener Strafverteidiger. Analysiere diesen Fall tiefgehend:

Fall: "${caseData?.fallname}" | ${caseData?.rechtsgebiet || ""} | Gericht: ${caseData?.gericht || ""}
Zentrale Frage: ${caseData?.zentrale_rechtsfrage || ""}
Eigene Argumente: ${eigArg || "keine"}
Gegnerargumente (bekannte): ${gegArg || "keine"}
Beweise: ${ev || "keine"}
Fallnotizen: ${caseData?.notes || ""}

Gib eine JSON mit:
1. Erfolgswahrscheinlichkeit (0-100)
2. 3 unsere beste Taktiken (titel, beschreibung kurz)
3. 3 Gegner Strategien (titel, beschreibung, gefahr: hoch/mittel/niedrig)
4. 3 Gegner Asse (titel, beschreibung kurz)
5. 3 unsere Schwachstellen (titel, risiko kurz)
6. Gesamtstrategie (1-2 Sätze)
7. gegner_argumente: 5 konkrete juristische Argumente die die Gegenseite (Staatsanwaltschaft/Kläger) wahrscheinlich vorbringen wird – spezifisch auf den Fallinhalt bezogen, mit Paragraphen und Beweismitteln
8. gegner_vorgehen: Schritt-für-Schritt wie die Gegenseite in diesem Verfahren konkret vorgehen wird (Eröffnung, Beweisanträge, Befragungen, Plädoyer etc.) – sehr spezifisch auf diesen Fall`,
        response_json_schema: {
          type: "object",
          properties: {
            erfolgswahrscheinlichkeit: { type: "integer", minimum: 0, maximum: 100 },
            erfolgswahrscheinlichkeit_begruendung: { type: "string" },
            unsere_taktiken: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: { 
                  titel: { type: "string", maxLength: 100 }, 
                  beschreibung: { type: "string", maxLength: 200 }
                },
                required: ["titel", "beschreibung"]
              }
            },
            gegner_strategien: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: { 
                  titel: { type: "string", maxLength: 100 }, 
                  beschreibung: { type: "string", maxLength: 200 }, 
                  gefahr: { type: "string", enum: ["hoch", "mittel", "niedrig"] }
                },
                required: ["titel", "beschreibung", "gefahr"]
              }
            },
            gegner_asse: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: { 
                  titel: { type: "string", maxLength: 100 }, 
                  beschreibung: { type: "string", maxLength: 200 }
                },
                required: ["titel", "beschreibung"]
              }
            },
            unsere_schwachstellen: {
              type: "array",
              maxItems: 3,
              items: { 
                type: "object", 
                properties: { 
                  titel: { type: "string", maxLength: 100 }, 
                  risiko: { type: "string", maxLength: 150 }
                }, 
                required: ["titel"] 
              }
            },
            gesamtstrategie: { type: "string", maxLength: 300 },
            gegner_argumente: {
              type: "array",
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  argument: { type: "string", maxLength: 300 },
                  paragraphen: { type: "string", maxLength: 100 },
                  staerke: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
                  unsere_antwort: { type: "string", maxLength: 200 }
                },
                required: ["argument", "staerke"]
              }
            },
            gegner_vorgehen: {
              type: "array",
              maxItems: 6,
              items: {
                type: "object",
                properties: {
                  phase: { type: "string", maxLength: 60 },
                  beschreibung: { type: "string", maxLength: 300 },
                  risiko: { type: "string", enum: ["hoch", "mittel", "niedrig"] }
                },
                required: ["phase", "beschreibung"]
              }
            }
          },
          required: ["erfolgswahrscheinlichkeit", "unsere_taktiken", "gegner_strategien"]
        },
        model: "gemini_3_flash"
      });

      setKiAnalysis(result);
    } catch (error) {
      console.error("KI-Analyse fehler:", error);
      // Fallback mit einfacher Struktur
      setKiAnalysis({
        erfolgswahrscheinlichkeit: Math.round(caseData?.prognose || 50),
        erfolgswahrscheinlichkeit_begruendung: "KI-Analyse konnte nicht vollständig durchgeführt werden. Bitte versuchen Sie es später.",
        unsere_taktiken: [],
        gegner_strategien: [],
        gegner_asse: [],
        unsere_schwachstellen: [],
        gesamtstrategie: "Bitte starten Sie die Analyse erneut."
      });
    }
    setAnalyzing(false);
  };

  if (!loaded) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  const algoScore = algoPrognose?.score ?? 0;
  const algoCI = algoPrognose ? `[${algoPrognose.ci_low}%–${algoPrognose.ci_high}%]` : "";

  const GEFAHR_COLORS = { hoch: "bg-red-50 border-red-200 text-red-700", mittel: "bg-amber-50 border-amber-200 text-amber-700", niedrig: "bg-green-50 border-green-200 text-green-700" };

  return (
    <div className="space-y-5">
      {/* Header: Algorithmische Prognose */}
      <div className="bg-gray-900 text-white rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Gesamtbewertung · {caseData?.fallname}</p>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-bold">{algoScore}%</p>
              <p className="text-sm text-gray-400 pb-1.5">90%-CI: {algoCI}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-800 rounded-xl px-3 py-2">
            <Calculator className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-300">Algorithmus</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{args.length} Argumente · {evidence.length} Beweise · {eigeneArgs.length} eigen · {gegnerArgs.length} Gegner</p>
      </div>

      {/* Berechnungsschritte aufklappbar */}
      {algoPrognose && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <button
            onClick={() => setShowAlgoSteps(o => !o)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-sm font-semibold text-gray-700">🧮 Berechnungsschritte (aufklappbar)</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>σ={((algoPrognose.sigma || 0)*100).toFixed(1)}% Unsicherheit</span>
              {showAlgoSteps ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>
          {showAlgoSteps && (
            <div className="mt-3 space-y-4">
              {(() => {
                const grouped = {};
                (algoPrognose.steps || []).forEach((step, i) => {
                  const cat = step.kategorie || "Sonstige";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push({ ...step, index: i });
                });
                return Object.entries(grouped).map(([kategorie, steps]) => (
                  <div key={kategorie} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowAlgoSteps(k => k === kategorie ? false : kategorie)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left bg-gray-50 font-semibold text-sm text-gray-700"
                    >
                      <span className="w-1 h-1 rounded-full bg-gray-900" />
                      {kategorie}
                      <span className="ml-auto text-xs text-gray-400">({steps.length})</span>
                    </button>
                    <div className={kategorie === "Inhaltliche Fallbewertung" ? "grid grid-cols-2 gap-3 p-3" : "space-y-2 p-3"}>
                      {steps.map((step, i) => (
                        <AlgoStepCard key={i} step={step} index={step.index} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
          {!showAlgoSteps && (
            <div className="mt-2 flex gap-1 flex-wrap">
              {(algoPrognose.steps || []).map((s, i) => (
                <span key={i} className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{i+1}. {s.label}</span>
              ))}
            </div>
          )}
          {breakEven?.break_even_pct !== null && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Break-Even-Schwelle</p>
                  <p className="text-[10px] text-gray-400">{breakEven?.formel}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{breakEven?.break_even_pct}%</p>
                  <p className="text-[10px] text-gray-400">Mindest-Erfolgsquote</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-800 leading-relaxed">
                  💡 <strong>Einfach erklärt:</strong> Der Break-Even-Punkt beantwortet die Frage: „Ab wann lohnt sich dieser Rechtsstreit finanziell überhaupt?" Wenn unsere Erfolgschance unter {breakEven?.break_even_pct}% liegt, verlieren wir im Erwartungswert Geld – selbst wenn wir manchmal gewinnen. Liegt die Prognose darüber, ist die Klage wirtschaftlich sinnvoll. {breakEven?.empfehlung}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score comparison */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">📊 Gewichtungsvergleich</h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Manuell</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500" /> KI</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ScoreCard label="Eigene Argumente" manual={manEigeneArg} ki={hasKiWeights ? kiEigeneArg : null} icon="⚖️" />
          <ScoreCard label="Gegner-Argumente" manual={manGegnerArg} ki={hasKiWeights ? kiGegnerArg : null} icon="🔴" />
          <ScoreCard label="Beweise" manual={manEv} ki={hasKiWeights ? kiEv : null} icon="📄" />
        </div>

        {/* Overall */}
        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-1">Gesamtscore manuell</p>
            <p className="text-3xl font-bold text-blue-600">{manualScore.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400">von 10</p>
          </div>
          {kiScore !== null ? (
            <div className="text-center">
              <p className="text-xs text-violet-500 mb-1">Gesamtscore KI</p>
              <p className="text-3xl font-bold text-violet-600">{kiScore.toFixed(1)}</p>
              <p className="text-[10px] text-gray-400">von 10</p>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-xs text-gray-400 mb-2">KI-Gewichtung fehlt</p>
              <p className="text-[10px] text-gray-400">Nutze KI-Gewichtung in Tab 2 & 3</p>
            </div>
          )}
        </div>
      </div>

      {/* KI Analysis (optional) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">🧠 KI-Strategieanalyse (optional)</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Liefert Rspr., Taktiken & Gegnerstrategien – keine eigene Risikoberechnung</p>
          </div>
          <Button onClick={runKiAnalysis} disabled={analyzing} size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-xl gap-1.5">
            {analyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {analyzing ? "Analysiere…" : kiAnalysis ? "Neu analysieren" : "Analyse starten"}
          </Button>
        </div>

        {!kiAnalysis && !analyzing && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>Starte die KI-Analyse für eine vollständige strategische Bewertung</p>
            <p className="text-xs mt-1">Taktiken · Gegnerstrategien · Asse im Ärmel · Schwachstellen</p>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center py-8 gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm">KI analysiert alle Falldaten…</p>
          </div>
        )}

        {kiAnalysis && (
          <div className="space-y-5">
            {/* Probability */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">KI-Erfolgswahrscheinlichkeit</p>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">{kiAnalysis.erfolgswahrscheinlichkeit}%</p>
                <div className="flex-1 pb-1">
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${kiAnalysis.erfolgswahrscheinlichkeit}%` }} />
                  </div>
                </div>
              </div>
              {kiAnalysis.erfolgswahrscheinlichkeit_begruendung && (
                <p className="text-xs text-gray-300 mt-2">{kiAnalysis.erfolgswahrscheinlichkeit_begruendung}</p>
              )}
            </div>

            {/* Gesamtstrategie */}
            {kiAnalysis.gesamtstrategie && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-2">🎯 Empfohlene Gesamtstrategie</p>
                <p className="text-sm text-blue-900">{kiAnalysis.gesamtstrategie}</p>
              </div>
            )}

            {/* Our tactics */}
            {(kiAnalysis.unsere_taktiken || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">⚔️ Unsere Taktiken</p>
                <div className="space-y-2">
                  {kiAnalysis.unsere_taktiken.map((t, i) => (
                    <div key={i} className="bg-green-50 border border-green-100 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-green-900">{t.titel}</p>
                          <p className="text-xs text-green-700 mt-0.5">{t.beschreibung}</p>
                          {t.wann && <p className="text-[10px] text-green-500 mt-1">📅 Einsatz: {t.wann}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opponent strategies */}
            {(kiAnalysis.gegner_strategien || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🛡️ Erwartete Gegnerstrategien</p>
                <div className="space-y-2">
                  {kiAnalysis.gegner_strategien.map((s, i) => (
                    <div key={i} className={`border rounded-xl p-3 ${GEFAHR_COLORS[s.gefahr] || "bg-gray-50 border-gray-200 text-gray-700"}`}>
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{s.titel}</p>
                            <span className="text-[10px] px-1.5 py-0.5 bg-white/60 rounded font-medium">{s.gefahr}</span>
                          </div>
                          <p className="text-xs mt-0.5">{s.beschreibung}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opponent aces */}
            {(kiAnalysis.gegner_asse || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🃏 Asse im Ärmel des Gegners</p>
                <div className="space-y-2">
                  {kiAnalysis.gegner_asse.map((a, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-800">{a.titel}</p>
                          <p className="text-xs text-red-700 mt-0.5">{a.beschreibung}</p>
                          {a.gegenmaßnahme && <p className="text-[10px] text-red-500 mt-1">🛡️ Gegenmaßnahme: {a.gegenmaßnahme}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Our weaknesses */}
            {(kiAnalysis.unsere_schwachstellen || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">⚠️ Unsere kritischen Schwachstellen</p>
                <div className="space-y-2">
                  {kiAnalysis.unsere_schwachstellen.map((sw, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900">{sw.titel}</p>
                          {sw.risiko && <p className="text-xs text-amber-700 mt-0.5">{sw.risiko}</p>}
                          {sw.empfehlung && <p className="text-[10px] text-amber-500 mt-1">💡 {sw.empfehlung}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gegner-Argumente (neu) */}
            {(kiAnalysis.gegner_argumente || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">⚖️ Konkrete Argumente der Gegenseite</p>
                <div className="space-y-2">
                  {kiAnalysis.gegner_argumente.map((g, i) => {
                    const staerkeColor = g.staerke === "hoch"
                      ? "border-red-200 bg-red-50"
                      : g.staerke === "mittel"
                      ? "border-amber-200 bg-amber-50"
                      : "border-gray-200 bg-gray-50";
                    const staerkeDot = g.staerke === "hoch" ? "#ef4444" : g.staerke === "mittel" ? "#f59e0b" : "#9ca3af";
                    return (
                      <div key={i} className={`border rounded-xl p-3 ${staerkeColor}`}>
                        <div className="flex items-start gap-2">
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: staerkeDot, flexShrink: 0, marginTop: 4 }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">{g.argument}</p>
                              {g.paragraphen && (
                                <span className="text-[10px] font-mono bg-white/70 border border-current/20 rounded px-1.5 py-0.5 text-gray-600 flex-shrink-0">
                                  {g.paragraphen}
                                </span>
                              )}
                            </div>
                            {g.unsere_antwort && (
                              <p className="text-xs mt-1.5 text-gray-600">
                                <span className="font-semibold">Unsere Antwort: </span>{g.unsere_antwort}
                              </p>
                            )}
                          </div>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/60 text-gray-500 flex-shrink-0">{g.staerke}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gegner-Vorgehen (neu) */}
            {(kiAnalysis.gegner_vorgehen || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🗂️ Vorgehensweise der Gegenseite (Schritt für Schritt)</p>
                <div className="relative">
                  <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.08)" }} />
                  <div className="space-y-2 pl-8">
                    {kiAnalysis.gegner_vorgehen.map((v, i) => {
                      const risikoColor = v.risiko === "hoch" ? "#ef4444" : v.risiko === "mittel" ? "#f59e0b" : "#9ca3af";
                      return (
                        <div key={i} className="relative bg-white border border-gray-100 rounded-xl p-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                          <div style={{
                            position: "absolute", left: -22, top: 12,
                            width: 14, height: 14, borderRadius: "50%",
                            background: "#fff", border: `2px solid ${risikoColor}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 8, fontWeight: 700, color: risikoColor,
                          }}>{i + 1}</div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{v.phase}</p>
                              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{v.beschreibung}</p>
                            </div>
                            {v.risiko && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: risikoColor, textTransform: "uppercase", flexShrink: 0 }}>
                                {v.risiko}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Counter-arguments list (legacy) */}
            {(kiAnalysis.gegenargumente_gegner || []).length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🔴 Spezifische Gegenargumente der Gegenseite</p>
                <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-1">
                  {kiAnalysis.gegenargumente_gegner.map((g, i) => (
                    <p key={i} className="text-xs text-gray-700 flex items-start gap-2">
                      <span className="text-red-400 flex-shrink-0">•</span> {g}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
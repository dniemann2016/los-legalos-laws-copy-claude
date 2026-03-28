import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, AlertTriangle, TrendingUp, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const RISIKO_FAKTOREN = [
  { key: "beweis_risiko", label: "Beweislage", icon: "📄", desc: "Qualität und Vollständigkeit der Beweise" },
  { key: "richter_risiko", label: "Richterrisiko", icon: "⚖️", desc: "Klägerquote und Stil des zuständigen Richters" },
  { key: "rechts_risiko", label: "Rechtsunsicherheit", icon: "§", desc: "Klarheit der Rechtslage und Präzedenzfälle" },
  { key: "kosten_risiko", label: "Kostenrisiko", icon: "💶", desc: "Verhältnis Streitwert zu Prozesskosten" },
  { key: "zeit_risiko", label: "Zeitrisiko", icon: "⏰", desc: "Fristdruck und Verfahrensdauer" },
  { key: "gegner_risiko", label: "Gegnerstärke", icon: "🥊", desc: "Ressourcen und Erfahrung der Gegenseite" },
  { key: "reputation_risiko", label: "Reputationsrisiko", icon: "📰", desc: "Öffentliche Aufmerksamkeit und Medien" },
  { key: "vergleich_chance", label: "Vergleichschance", icon: "🤝", desc: "Wahrscheinlichkeit einer außergerichtlichen Einigung" },
];

const AMPEL_FARBEN = { hoch: "bg-red-100 text-red-700 border-red-200", mittel: "bg-amber-100 text-amber-700 border-amber-200", niedrig: "bg-green-100 text-green-700 border-green-200" };

function AmpelBadge({ level }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${AMPEL_FARBEN[level] || AMPEL_FARBEN.mittel}`}>{level?.toUpperCase()}</span>;
}

export default function TabRisiko({ caseId, caseData, onUpdate }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [persons, setPersons] = useState([]);
  const [result, setResult] = useState(
    caseData?.ki_berater_result?.risiko_analyse ||
    (caseData?.ki_berater_result?.gesamtrisiko ? caseData.ki_berater_result : null) ||
    null
  );
  const [loading, setLoading] = useState(false);
  const [manualScores, setManualScores] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
    ]).then(([a, e, d, p]) => { setArgs(a); setEvidence(e); setDeadlines(d); setPersons(p); });
  }, [caseId]);

  const runAnalyse = async () => {
    setLoading(true);
    const offeneFristen = deadlines.filter(d => d.status === "offen");
    const ueberfaellig = deadlines.filter(d => d.status === "versaeumt");
    const eigeneArgs = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");
    const richter = persons.find(p => p.role === "Richter");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Prozessanwalt und Risiko-Analyst. Führe eine vollständige Chancen-Risiken-Analyse für folgenden Fall durch:

FALL: ${caseData?.fallname || ""} | ${caseData?.rechtsgebiet || ""} | Streitwert: ${caseData?.streitwert ? `${caseData.streitwert.toLocaleString("de-DE")}€` : "unbekannt"}
PROGNOSE: ${caseData?.prognose || 0}% | Gericht: ${caseData?.gericht || ""} | Instanz: ${caseData?.instanz || ""}
ZENTRALE RECHTSFRAGE: ${caseData?.zentrale_rechtsfrage || "nicht definiert"}

ARGUMENTE: Eigene (${eigeneArgs.length}): ${eigeneArgs.map(a => `${a.title} [${a.strength}/10]`).join(", ") || "keine"} | Gegner (${gegnerArgs.length}): ${gegnerArgs.map(a => `${a.title} [${a.strength}/10]`).join(", ") || "keine"}
BEWEISE: ${evidence.length} gesamt (Ø Gewicht: ${evidence.length ? (evidence.reduce((s, e) => s + (e.weight || 0), 0) / evidence.length).toFixed(1) : 0}/10)
FRISTEN: ${offeneFristen.length} offen, ${ueberfaellig.length} versäumt
RICHTER: ${richter ? `${richter.name} (Klägerquote: ${richter.klaeger_rate || "?"}%, Vergleichsrate: ${richter.vergleich_rate || "?"}%)` : "unbekannt"}

Erstelle eine präzise Analyse mit konkreten Prozentzahlen und Handlungsempfehlungen.`,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          gesamtrisiko: { type: "string", enum: ["niedrig", "mittel", "hoch"] },
          gesamtchance: { type: "number" },
          executive_summary: { type: "string" },
          faktoren: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                score: { type: "number" },
                level: { type: "string" },
                bewertung: { type: "string" },
                massnahme: { type: "string" }
              }
            }
          },
          top_chancen: { type: "array", items: { type: "object", properties: { titel: { type: "string" }, beschreibung: { type: "string" }, potenzial_pct: { type: "number" } } } },
          top_risiken: { type: "array", items: { type: "object", properties: { titel: { type: "string" }, beschreibung: { type: "string" }, wahrscheinlichkeit_pct: { type: "number" }, schadenspotenzial: { type: "string" } } } },
          szenarien: {
            type: "object",
            properties: {
              best_case: { type: "object", properties: { wahrscheinlichkeit: { type: "number" }, ergebnis: { type: "string" }, voraussetzungen: { type: "array", items: { type: "string" } } } },
              base_case: { type: "object", properties: { wahrscheinlichkeit: { type: "number" }, ergebnis: { type: "string" }, voraussetzungen: { type: "array", items: { type: "string" } } } },
              worst_case: { type: "object", properties: { wahrscheinlichkeit: { type: "number" }, ergebnis: { type: "string" }, voraussetzungen: { type: "array", items: { type: "string" } } } }
            }
          },
          empfohlene_strategie: { type: "string", enum: ["Klage fortsetzen", "Vergleich anstreben", "Verhandlung vorbereiten", "Rechtsmittel prüfen", "Sofortvergleich"] },
          sofortmassnahmen: { type: "array", items: { type: "string" } },
          kosten_nutzen: { type: "object", properties: { empfehlung: { type: "string" }, break_even_pct: { type: "number" }, vergleichsempfehlung: { type: "string" } } }
        }
      }
    });

    if (!res || Object.keys(res).length === 0) { setLoading(false); return; }
    setResult(res);
    const currentKi = caseData?.ki_berater_result || {};
    const updated = await base44.entities.Case.update(caseId, {
      ki_berater_result: { ...currentKi, risiko_analyse: res }
    });
    onUpdate(updated);
    setLoading(false);
  };

  const radarData = result?.faktoren?.map(f => ({ subject: RISIKO_FAKTOREN.find(r => r.key === f.key)?.label || f.key, A: f.score })) || [];
  const STRATEGIE_FARBEN = { "Klage fortsetzen": "bg-blue-600", "Vergleich anstreben": "bg-amber-500", "Verhandlung vorbereiten": "bg-indigo-600", "Rechtsmittel prüfen": "bg-purple-600", "Sofortvergleich": "bg-red-600" };

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Chancen & Risiken Analyse</h3>
            <p className="text-xs text-gray-500">KI-gestützte Bewertung aller prozessrelevanten Faktoren</p>
          </div>
          {result && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-[10px] text-gray-400">Gesamtrisiko</p>
                <AmpelBadge level={result.gesamtrisiko} />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400">Erfolgschance</p>
                <div className="text-xl font-bold text-gray-900">{result.gesamtchance}%</div>
              </div>
            </div>
          )}
        </div>

        <Button onClick={runAnalyse} disabled={loading} className="w-full bg-gray-900 text-white rounded-xl gap-2">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analysiere alle Faktoren…</> : result ? "🔄 Analyse aktualisieren" : "🎯 Vollständige Risiko-Analyse starten"}
        </Button>
        {loading && <p className="text-[10px] text-amber-600 text-center mt-2">⚠️ Verwendet Claude Sonnet (mehr KI-Credits)</p>}
      </div>

      {result && (
        <>
          {/* Executive Summary + Strategie */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">📋 Executive Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed">{result.executive_summary}</p>
            </div>
            <div className="bg-gray-900 text-white rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-xs text-gray-400 mb-1">Empfohlene Strategie</p>
              <p className="text-lg font-bold">{result.empfohlene_strategie}</p>
              {result.kosten_nutzen?.break_even_pct !== undefined && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-[10px] text-gray-400">Break-Even bei</p>
                  <p className="text-2xl font-bold">{result.kosten_nutzen.break_even_pct}%</p>
                </div>
              )}
            </div>
          </div>

          {/* Radar + Faktoren */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {radarData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-600 mb-3">🕸️ Risiko-Radar</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#f3f4f6" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#9ca3af" }} />
                    <Radar dataKey="A" stroke="#1f2937" fill="#1f2937" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-600 mb-3">📊 Faktoren-Scores</p>
              <div className="space-y-2">
                {(result.faktoren || []).map((f, i) => {
                  const meta = RISIKO_FAKTOREN.find(r => r.key === f.key);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-600">{meta?.icon} {meta?.label || f.key}</span>
                        <div className="flex items-center gap-1.5">
                          <AmpelBadge level={f.level} />
                          <span className="text-xs text-gray-500 w-8 text-right">{f.score}/10</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${f.level === "hoch" ? "bg-red-500" : f.level === "mittel" ? "bg-amber-400" : "bg-green-500"}`} style={{ width: `${f.score * 10}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chancen & Risiken */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-green-700 mb-3">✅ Top-Chancen</p>
              <div className="space-y-3">
                {(result.top_chancen || []).map((c, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-green-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-800">{c.titel}</p>
                      <span className="text-xs font-bold text-green-600">+{c.potenzial_pct}%</span>
                    </div>
                    <p className="text-xs text-gray-600">{c.beschreibung}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-red-700 mb-3">⚠️ Top-Risiken</p>
              <div className="space-y-3">
                {(result.top_risiken || []).map((r, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 border border-red-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-800">{r.titel}</p>
                      <span className="text-xs font-bold text-red-600">{r.wahrscheinlichkeit_pct}%</span>
                    </div>
                    <p className="text-xs text-gray-600">{r.beschreibung}</p>
                    {r.schadenspotenzial && <p className="text-[10px] text-red-500 mt-1">Schadenpotenzial: {r.schadenspotenzial}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Szenarien */}
          {result.szenarien && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs font-semibold text-gray-600 mb-3">🎬 Szenarien-Analyse</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "best_case", label: "Best Case", color: "border-green-200 bg-green-50", pColor: "text-green-700" },
                  { key: "base_case", label: "Base Case", color: "border-blue-200 bg-blue-50", pColor: "text-blue-700" },
                  { key: "worst_case", label: "Worst Case", color: "border-red-200 bg-red-50", pColor: "text-red-700" },
                ].map(({ key, label, color, pColor }) => {
                  const s = result.szenarien[key];
                  if (!s) return null;
                  return (
                    <div key={key} className={`rounded-xl border p-3 ${color}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-gray-700">{label}</p>
                        <span className={`text-sm font-bold ${pColor}`}>{s.wahrscheinlichkeit}%</span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium mb-2">{s.ergebnis}</p>
                      {(s.voraussetzungen || []).map((v, i) => <p key={i} className="text-[10px] text-gray-500">→ {v}</p>)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sofortmaßnahmen */}
          {(result.sofortmassnahmen || []).length > 0 && (
            <div className="bg-gray-900 text-white rounded-2xl p-5">
              <p className="text-sm font-semibold mb-3">⚡ Sofortmaßnahmen</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.sofortmassnahmen.map((m, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
              {result.kosten_nutzen?.vergleichsempfehlung && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Vergleichsempfehlung</p>
                  <p className="text-sm">{result.kosten_nutzen.vergleichsempfehlung}</p>
                </div>
              )}
            </div>
          )}

          {/* Massnahmen pro Faktor */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3">🛠️ Maßnahmen pro Risikofaktor</p>
            <div className="space-y-2">
              {(result.faktoren || []).filter(f => f.massnahme).map((f, i) => {
                const meta = RISIKO_FAKTOREN.find(r => r.key === f.key);
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm">{meta?.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-700">{meta?.label}</p>
                      <p className="text-xs text-gray-500">{f.massnahme}</p>
                    </div>
                    <AmpelBadge level={f.level} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
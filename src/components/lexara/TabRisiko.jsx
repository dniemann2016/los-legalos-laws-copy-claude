import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Sparkles, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeVollanalyse } from "@/lib/legalAlgorithms";
import { AlgoRisikoPanel } from "./TabRisikoAlgo";

export default function TabRisiko({ caseId, caseData, onUpdate }) {
  const [args, setArgs]         = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [persons, setPersons]   = useState([]);
  const [loaded, setLoaded]     = useState(false);

  // Algorithmus-Ergebnis (immer berechnet)
  const [algoResult, setAlgoResult] = useState(null);

  // KI-Ergebnis (optional, manuell auslösbar)
  const [kiResult, setKiResult] = useState(
    caseData?.ki_berater_result?.risiko_analyse || null
  );
  const [kiLoading, setKiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("algo"); // "algo" | "ki"

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
    ]).then(([a, e, d, p]) => {
      setArgs(a); setEvidence(e); setDeadlines(d); setPersons(p);
      setLoaded(true);
    });
  }, [caseId]);

  // Algorithmus läuft automatisch nach Datenladen
  useEffect(() => {
    if (!loaded) return;
    const result = computeVollanalyse({ args, evidence, deadlines, persons, caseData });
    setAlgoResult(result);
  }, [loaded, args, evidence, deadlines, persons]);

  const runKiAnalyse = async () => {
    setKiLoading(true);
    const eigeneArgs = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");
    const richter = persons.find(p => p.role === "Richter");
    const offeneFristen = deadlines.filter(d => d.status === "offen");
    const ueberfaellig = deadlines.filter(d => d.status === "versaeumt");

    const res = await base44.integrations.Core.InvokeLLM({
      model: "gpt_5",
      prompt: `Du bist Rechtsprechungsexperte und lieferst NUR Informationen zu relevanter Rechtsprechung (BGH, OLG, BVerfG), Literaturhinweise und Taktikempfehlungen. KEINE Risikoberechnung - diese wurde bereits algorithmisch ermittelt.

Fall: ${caseData?.fallname || "Unbekannt"} | ${caseData?.rechtsgebiet || ""} | Streitwert: ${caseData?.streitwert ? caseData.streitwert.toLocaleString("de-DE") + "€" : "unbekannt"}
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || "nicht definiert"}
Eigene Argumente: ${eigeneArgs.map(a => a.title).join(", ") || "keine"}
Gegner-Argumente: ${gegnerArgs.map(a => a.title).join(", ") || "keine"}
Richter: ${richter ? `${richter.name} (Klägerquote: ${richter.klaeger_rate || "?"}%)` : "unbekannt"}

Liefere:
1. Relevante BGH/OLG-Entscheidungen zum Rechtsgebiet und zur Rechtsfrage
2. Wichtige Literaturhinweise (Kommentare, Aufsätze)
3. Typische Taktiken der Gegenseite in diesem Rechtsgebiet
4. Außergewöhnliche rechtliche Aspekte/Risiken die ein Algorithmus übersehen könnte`,
      response_json_schema: {
        type: "object",
        properties: {
          rechtsprechung: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gericht: { type: "string" },
                aktenzeichen: { type: "string" },
                datum: { type: "string" },
                leitsatz: { type: "string" },
                relevanz: { type: "string" },
              }
            }
          },
          literatur: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                autor: { type: "string" },
                relevanz: { type: "string" },
              }
            }
          },
          gegner_taktiken: {
            type: "array",
            items: { type: "string" }
          },
          besondere_aspekte: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" },
                typ: { type: "string", enum: ["chance", "risiko", "hinweis"] }
              }
            }
          },
          zusammenfassung: { type: "string" }
        }
      }
    });

    if (res && Object.keys(res).length > 0) {
      setKiResult(res);
      setActiveTab("ki");
      const currentKi = caseData?.ki_berater_result || {};
      const updated = await base44.entities.Case.update(caseId, {
        ki_berater_result: { ...currentKi, risiko_analyse: res }
      });
      onUpdate(updated);
    }
    setKiLoading(false);
  };

  if (!loaded || !algoResult) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          <p className="text-sm">Berechne algorithmische Risikoanalyse…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Chancen & Risiken Analyse</h3>
            <p className="text-xs text-gray-500 mt-0.5">Stochastische Berechnung · Bayesianisch · Monte Carlo</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setActiveTab("algo")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === "algo"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Algorithmus
              </button>
              <button
                onClick={() => kiResult ? setActiveTab("ki") : null}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${
                  activeTab === "ki"
                    ? "bg-violet-700 text-white"
                    : kiResult
                      ? "bg-white text-gray-500 hover:bg-gray-50"
                      : "bg-gray-50 text-gray-300 cursor-not-allowed"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                KI-Infos
              </button>
            </div>
            <Button
              onClick={runKiAnalyse}
              disabled={kiLoading}
              size="sm"
              variant="outline"
              className="rounded-xl text-xs gap-1.5 text-violet-700 border-violet-200 hover:bg-violet-50"
            >
              {kiLoading
                ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Lade Rspr…</>
                : <><Sparkles className="w-3.5 h-3.5" /> {kiResult ? "Rspr. aktualisieren" : "Rechtsprechung laden"}</>
              }
            </Button>
          </div>
        </div>
        {kiLoading && (
          <p className="text-[10px] text-amber-600 text-center mt-2">
            ⚠️ KI wird nur für Rechtsprechungs- und Taktikhinweise verwendet (keine Risikoberechnung)
          </p>
        )}
      </div>

      {/* Algorithmus-Tab */}
      {activeTab === "algo" && <AlgoRisikoPanel result={algoResult} />}

      {/* KI-Infos-Tab */}
      {activeTab === "ki" && kiResult && (
        <div className="space-y-4">
          {/* Zusammenfassung */}
          {kiResult.zusammenfassung && (
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-violet-700 mb-2">📋 KI-Zusammenfassung (Rspr. & Taktik)</p>
              <p className="text-sm text-violet-900">{kiResult.zusammenfassung}</p>
            </div>
          )}

          {/* Rechtsprechung */}
          {(kiResult.rechtsprechung || []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">⚖️ Relevante Rechtsprechung</p>
              <div className="space-y-3">
                {kiResult.rechtsprechung.map((r, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-800">{r.gericht}</span>
                      <span className="text-[10px] text-gray-400">{r.aktenzeichen}</span>
                      {r.datum && <span className="text-[10px] text-gray-400">{r.datum}</span>}
                    </div>
                    <p className="text-xs text-gray-700 font-medium mb-1">{r.leitsatz}</p>
                    {r.relevanz && <p className="text-[10px] text-blue-600">→ Relevanz: {r.relevanz}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Literatur */}
          {(kiResult.literatur || []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">📚 Literaturhinweise</p>
              <div className="space-y-2">
                {kiResult.literatur.map((l, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 text-xs mt-0.5">•</span>
                    <div>
                      <p className="text-xs font-medium text-gray-800">{l.titel}</p>
                      {l.autor && <p className="text-[10px] text-gray-400">{l.autor}</p>}
                      {l.relevanz && <p className="text-[10px] text-blue-600 mt-0.5">{l.relevanz}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gegner-Taktiken */}
          {(kiResult.gegner_taktiken || []).length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-red-700 mb-3">🥊 Typische Gegner-Taktiken (Rechtsgebiet)</p>
              <div className="space-y-1">
                {kiResult.gegner_taktiken.map((t, i) => (
                  <p key={i} className="text-xs text-red-800 flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5">•</span>{t}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Besondere Aspekte */}
          {(kiResult.besondere_aspekte || []).length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">💡 Besondere Aspekte</p>
              <div className="space-y-2">
                {kiResult.besondere_aspekte.map((a, i) => {
                  const cls = a.typ === "chance"
                    ? "bg-green-50 border-green-100 text-green-800"
                    : a.typ === "risiko"
                      ? "bg-red-50 border-red-100 text-red-800"
                      : "bg-blue-50 border-blue-100 text-blue-800";
                  const icon = a.typ === "chance" ? "✅" : a.typ === "risiko" ? "⚠️" : "💡";
                  return (
                    <div key={i} className={`border rounded-xl p-3 ${cls}`}>
                      <p className="text-xs font-semibold mb-0.5">{icon} {a.titel}</p>
                      <p className="text-xs">{a.beschreibung}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400">
              ℹ️ KI liefert nur Recherche-Hinweise. Alle Risikowerte und Prognosen basieren auf dem Algorithmus-Tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
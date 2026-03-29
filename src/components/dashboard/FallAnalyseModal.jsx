import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Scale, Loader2, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function FallAnalyseModal({ cases, onClose, jurisdiction = "DE", t = {} }) {
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const analyse = async () => {
    if (!selectedCase) return;
    setLoading(true);
    setResult(null);

    const [args, evidence, deadlines] = await Promise.all([
      base44.entities.Argument.filter({ case_id: selectedCase.id }),
      base44.entities.Evidence.filter({ case_id: selectedCase.id }),
      base44.entities.Deadline.filter({ case_id: selectedCase.id }),
    ]);

    const isUS = jurisdiction === "US";
    const prompt = isUS
      ? `You are an experienced American attorney. Analyze the following case and provide:
1. A concise case summary (2–3 paragraphs)
2. A preliminary legal assessment of the likelihood of success with specific reasoning
3. Key strengths and weaknesses of the client's position
4. Strategic recommendations for next steps

**Case:** ${selectedCase.fallname}
**Docket Number:** ${selectedCase.aktenzeichen || "–"}
**Practice Area:** ${selectedCase.rechtsgebiet || "–"}
**Court:** ${selectedCase.gericht || "–"}
**Court Level:** ${selectedCase.instanz || "–"}
**Status:** ${selectedCase.status || "–"}
**Amount in Controversy:** ${selectedCase.streitwert ? `$${Number(selectedCase.streitwert).toLocaleString("en-US")}` : "–"}
**Legal Objective:** ${selectedCase.prozessziel || "–"}
**Central Legal Issue:** ${selectedCase.zentrale_rechtsfrage || "–"}
**Current Win Probability:** ${selectedCase.prognose ? `${selectedCase.prognose}%` : "–"}

**Arguments (${args.length}):**
${args.map(a => `- [${a.side === "eigen" ? "CLIENT" : "OPPOSING"}] ${a.title}: ${a.description || ""} (Strength: ${a.strength || "–"}/10)`).join("\n") || "None recorded"}

**Evidence (${evidence.length}):**
${evidence.map(e => `- ${e.title}: ${e.description || ""} (Weight: ${e.weight || "–"}/10)`).join("\n") || "None recorded"}

**Open Deadlines (${deadlines.filter(d => d.status === "offen").length}):**
${deadlines.filter(d => d.status === "offen").map(d => `- ${d.title} (due: ${d.due_date})`).join("\n") || "No open deadlines"}

**Notes:** ${selectedCase.notes || "–"}

Respond in English, structured with Markdown headings. Be precise and practice-oriented.`
      : `Du bist ein erfahrener Rechtsanwalt und Jurist. Analysiere den folgenden Fall und erstelle:
1. Eine präzise Zusammenfassung des Falls (2–3 Absätze)
2. Eine rechtliche Ersteinschätzung der Erfolgsaussichten mit konkreter Begründung
3. Die wichtigsten Stärken und Schwächen der eigenen Position
4. Empfehlungen für die weitere Strategie

**Fall:** ${selectedCase.fallname}
**Aktenzeichen:** ${selectedCase.aktenzeichen || "–"}
**Rechtsgebiet:** ${selectedCase.rechtsgebiet || "–"}
**Gericht:** ${selectedCase.gericht || "–"}
**Instanz:** ${selectedCase.instanz || "–"}
**Status:** ${selectedCase.status || "–"}
**Streitwert:** ${selectedCase.streitwert ? `${selectedCase.streitwert.toLocaleString("de-DE")} €` : "–"}
**Prozessziel:** ${selectedCase.prozessziel || "–"}
**Zentrale Rechtsfrage:** ${selectedCase.zentrale_rechtsfrage || "–"}
**Bisherige Prognose:** ${selectedCase.prognose ? `${selectedCase.prognose}%` : "–"}

**Argumente (${args.length}):**
${args.map(a => `- [${a.side === "eigen" ? "EIGEN" : "GEGNER"}] ${a.title}: ${a.description || ""} (Stärke: ${a.strength || "–"}/10)`).join("\n") || "Keine erfasst"}

**Beweise (${evidence.length}):**
${evidence.map(e => `- ${e.title}: ${e.description || ""} (Gewicht: ${e.weight || "–"}/10)`).join("\n") || "Keine erfasst"}

**Offene Fristen (${deadlines.filter(d => d.status === "offen").length}):**
${deadlines.filter(d => d.status === "offen").map(d => `- ${d.title} (fällig: ${d.due_date})`).join("\n") || "Keine offenen Fristen"}

**Notizen:** ${selectedCase.notes || "–"}

Antworte auf Deutsch, strukturiert mit Markdown-Überschriften. Sei präzise und praxisorientiert.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
    });

    setResult(res);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{t.kiFallanalyse || "KI-Fallanalyse"}</h2>
              <p className="text-xs text-gray-400">{jurisdiction === "US" ? "Automated Summary & Legal Assessment" : "Automatisierte Zusammenfassung & Einschätzung"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Case Select */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {t.fallAuswaehlen || "Fall auswählen"}
            </label>
            <div className="relative">
              <select
                value={selectedCaseId}
                onChange={e => { setSelectedCaseId(e.target.value); setResult(null); }}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 pr-10"
              >
                <option value="">{jurisdiction === "US" ? "– Select a case –" : "– Fall wählen –"}</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fallname} {c.aktenzeichen ? `(${c.aktenzeichen})` : ""} {c.status ? `· ${c.status}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Case Preview */}
          {selectedCase && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  ["Rechtsgebiet", selectedCase.rechtsgebiet],
                  ["Gericht", selectedCase.gericht],
                  ["Instanz", selectedCase.instanz],
                  ["Status", selectedCase.status],
                  ["Streitwert", selectedCase.streitwert ? `${Number(selectedCase.streitwert).toLocaleString("de-DE")} €` : null],
                  ["Prognose", selectedCase.prognose ? `${selectedCase.prognose}%` : null],
                ].filter(([_, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{label}:</span>
                    <span className="text-xs font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
              {selectedCase.prozessziel && (
                <p className="text-xs text-gray-500 pt-1 border-t border-gray-200 mt-1">
                  <span className="font-medium text-gray-600">Ziel: </span>{selectedCase.prozessziel}
                </p>
              )}
            </div>
          )}

          {/* Analyse Button */}
          {selectedCase && !loading && !result && (
            <button onClick={analyse}
              className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
              <Scale className="w-4 h-4" /> {t.analyseStarten || "KI-Analyse starten"}
            </button>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">{jurisdiction === "US" ? "Generating analysis…" : "Analyse wird generiert…"}</p>
              <p className="text-xs text-gray-400">{jurisdiction === "US" ? "This may take 15–30 seconds" : "Dies kann 15–30 Sekunden dauern"}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Analyse-Ergebnis</h3>
                <button onClick={() => setResult(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">{jurisdiction === "US" ? "New Analysis" : "Neue Analyse"}</button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 prose prose-sm prose-slate max-w-none text-sm leading-relaxed
                [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-4 [&_h1]:mb-2
                [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-3 [&_h2]:mb-1.5
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-2 [&_h3]:mb-1
                [&_ul]:pl-4 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-gray-900">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <p className="text-xs text-gray-400 text-center">
                {t.analyseWarning} {jurisdiction === "US" ? "Uses Claude Sonnet (higher integration credits)." : "Verwendet Claude Sonnet (mehr Integrationskredite)."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
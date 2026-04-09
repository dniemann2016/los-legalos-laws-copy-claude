import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Scale, Loader2, ChevronDown } from "lucide-react";
import { getAIContext, JURISDICTION_META } from "../../lib/jurisdictionConfig";
import { useUserProfile } from "../../hooks/useUserProfile";
import ReactMarkdown from "react-markdown";
import FeedbackWidget from "../FeedbackWidget";

export default function FallAnalyseModal({ cases, onClose, t = {} }) {
  const { jurisdiction, usState, language } = useUserProfile();
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectedCase = cases.find(c => c.id === selectedCaseId);
  const meta = JURISDICTION_META[jurisdiction] || JURISDICTION_META.DE;
  const isEnglish = ["EN", "US", "SE", "NO", "DK", "FI"].includes(jurisdiction) || language === "EN";
  const isFrench = jurisdiction === "LU" || language === "FR";

  const analyse = async () => {
    if (!selectedCase) return;
    setLoading(true);
    setResult(null);

    const [args, evidence, deadlines] = await Promise.all([
      base44.entities.Argument.filter({ case_id: selectedCase.id }),
      base44.entities.Evidence.filter({ case_id: selectedCase.id }),
      base44.entities.Deadline.filter({ case_id: selectedCase.id }),
    ]);

    const aiContext = getAIContext(jurisdiction, usState);
    const outputLang = isFrench ? "French" : isEnglish ? "English" : "German";
    const caseFields = isEnglish
      ? `**Case:** ${selectedCase.fallname}\n**Docket:** ${selectedCase.aktenzeichen || "–"}\n**Practice Area:** ${selectedCase.rechtsgebiet || "–"}\n**Court:** ${selectedCase.gericht || "–"}\n**Court Level:** ${selectedCase.instanz || "–"}\n**Status:** ${selectedCase.status || "–"}\n**Amount in Controversy:** ${selectedCase.streitwert ? `${meta.name[language]} ${Number(selectedCase.streitwert).toLocaleString("en-US")}` : "–"}\n**Legal Objective:** ${selectedCase.prozessziel || "–"}\n**Central Legal Issue:** ${selectedCase.zentrale_rechtsfrage || "–"}\n**Win Probability:** ${selectedCase.prognose ? `${selectedCase.prognose}%` : "–"}`
      : `**Fall:** ${selectedCase.fallname}\n**Aktenzeichen:** ${selectedCase.aktenzeichen || "–"}\n**Rechtsgebiet:** ${selectedCase.rechtsgebiet || "–"}\n**Gericht:** ${selectedCase.gericht || "–"}\n**Instanz:** ${selectedCase.instanz || "–"}\n**Status:** ${selectedCase.status || "–"}\n**Streitwert:** ${selectedCase.streitwert ? `${selectedCase.streitwert.toLocaleString("de-DE")} €` : "–"}\n**Prozessziel:** ${selectedCase.prozessziel || "–"}\n**Zentrale Rechtsfrage:** ${selectedCase.zentrale_rechtsfrage || "–"}\n**Bisherige Prognose:** ${selectedCase.prognose ? `${selectedCase.prognose}%` : "–"}`;

    const argLines = args.map(a => `- [${a.side === "eigen" ? (isEnglish ? "CLIENT" : "EIGEN") : (isEnglish ? "OPPOSING" : "GEGNER")}] ${a.title}: ${a.description || ""} (${isEnglish ? "Strength" : "Stärke"}: ${a.strength || "–"}/10)`).join("\n") || (isEnglish ? "None recorded" : "Keine erfasst");
    const evLines = evidence.map(e => `- ${e.title}: ${e.description || ""} (${isEnglish ? "Weight" : "Gewicht"}: ${e.weight || "–"}/10)`).join("\n") || (isEnglish ? "None recorded" : "Keine erfasst");
    const dlLines = deadlines.filter(d => d.status === "offen").map(d => `- ${d.title} (${isEnglish ? "due" : "fällig"}: ${d.due_date})`).join("\n") || (isEnglish ? "No open deadlines" : "Keine offenen Fristen");

    const prompt = `${aiContext}

${isEnglish
  ? `Analyze the following case and provide:
1. A concise case summary (2–3 paragraphs)
2. A preliminary legal assessment of the likelihood of success with specific legal reasoning
3. Key strengths and weaknesses
4. Strategic recommendations

${caseFields}

**Arguments (${args.length}):**
${argLines}

**Evidence (${evidence.length}):**
${evLines}

**Open Deadlines (${deadlines.filter(d => d.status === "offen").length}):**
${dlLines}

**Notes:** ${selectedCase.notes || "–"}

Respond in ${outputLang}, structured with Markdown headings. Cite applicable statutes and case law. Be precise and practice-oriented.`
  : `Analysiere den folgenden Fall und erstelle:
1. Eine präzise Zusammenfassung des Falls (2–3 Absätze)
2. Eine rechtliche Ersteinschätzung der Erfolgsaussichten mit konkreter Begründung
3. Die wichtigsten Stärken und Schwächen der eigenen Position
4. Empfehlungen für die weitere Strategie

${caseFields}

**Argumente (${args.length}):**
${argLines}

**Beweise (${evidence.length}):**
${evLines}

**Offene Fristen (${deadlines.filter(d => d.status === "offen").length}):**
${dlLines}

**Notizen:** ${selectedCase.notes || "–"}

Antworte auf ${outputLang}, strukturiert mit Markdown-Überschriften. Zitiere konkrete §§ und einschlägige Rechtsprechung der anwendbaren Rechtsordnung. Sei präzise und praxisorientiert.`}`;

    const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6" });
    setResult(res);
    setLoading(false);
  };

  const labelSelect = language === "FR" ? "– Sélectionner un dossier –" : language === "EN" ? "– Select a case –" : "– Fall wählen –";
  const labelResult = language === "FR" ? "Résultat de l'analyse" : language === "EN" ? "Analysis Result" : "Analyse-Ergebnis";
  const labelNew = language === "FR" ? "Nouvelle analyse" : language === "EN" ? "New Analysis" : "Neue Analyse";
  const labelLoading1 = language === "FR" ? "Génération de l'analyse…" : language === "EN" ? "Generating analysis…" : "Analyse wird generiert…";
  const labelLoading2 = language === "FR" ? "Cela peut prendre 15–30 secondes" : language === "EN" ? "This may take 15–30 seconds" : "Dies kann 15–30 Sekunden dauern";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">{t.kiFallanalyse || "KI-Fallanalyse"}</h2>
              <p className="text-xs text-gray-400">{meta.flag} {meta.name[language] || meta.name.EN} · {meta.system}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t.fallAuswaehlen || "Fall auswählen"}</label>
            <div className="relative">
              <select value={selectedCaseId} onChange={e => { setSelectedCaseId(e.target.value); setResult(null); }}
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-gray-400 pr-10">
                <option value="">{labelSelect}</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.fallname} {c.aktenzeichen ? `(${c.aktenzeichen})` : ""} {c.status ? `· ${c.status}` : ""}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {selectedCase && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  [t.rechtsgebiet || "Rechtsgebiet", selectedCase.rechtsgebiet],
                  [t.gericht || "Gericht", selectedCase.gericht],
                  [t.instanz || "Instanz", selectedCase.instanz],
                  [t.aktiv || "Status", selectedCase.status],
                  [t.streitwert || "Streitwert", selectedCase.streitwert ? `${Number(selectedCase.streitwert).toLocaleString("de-DE")} ${meta.name.DE === "Schweiz" ? "CHF" : "€"}` : null],
                  [t.prognose || "Prognose", selectedCase.prognose ? `${selectedCase.prognose}%` : null],
                ].filter(([_, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{label}:</span>
                    <span className="text-xs font-medium text-gray-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCase && !loading && !result && (
            <button onClick={analyse} className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
              <Scale className="w-4 h-4" /> {t.analyseStarten || "KI-Analyse starten"}
            </button>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">{labelLoading1}</p>
              <p className="text-xs text-gray-400">{labelLoading2}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{labelResult}</h3>
                <button onClick={() => setResult(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">{labelNew}</button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 prose prose-sm prose-slate max-w-none text-sm leading-relaxed
                [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-4 [&_h1]:mb-2
                [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-gray-800 [&_h2]:mt-3 [&_h2]:mb-1.5
                [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-700 [&_h3]:mt-2 [&_h3]:mb-1
                [&_ul]:pl-4 [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-gray-900">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <p className="text-xs text-gray-400 text-center">{t.analyseWarning}</p>
              <FeedbackWidget
                jurisdiction={jurisdiction}
                topic={`case_analysis_${selectedCase?.rechtsgebiet || "general"}`}
                context={result?.slice(0, 500)}
                language={language}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
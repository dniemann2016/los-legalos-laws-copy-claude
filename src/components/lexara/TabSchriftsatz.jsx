import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOC_TYPES = [
  { value: "klageschrift", label: "Klageschrift" },
  { value: "klageerweiterung", label: "Klageerweiterung" },
  { value: "erwiderung", label: "Klageerwiderung" },
  { value: "berufungsschrift", label: "Berufungsschrift" },
  { value: "schlussvortrag", label: "Schlussvortrag / Plädoyer" },
  { value: "vergleichsangebot", label: "Vergleichsangebot" },
];

export default function TabSchriftsatz({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [docType, setDocType] = useState("klageschrift");
  const [anwaltName, setAnwaltName] = useState("");
  const [kanzlei, setKanzlei] = useState("");
  const [mandant, setMandant] = useState("");
  const [gegner, setGegner] = useState("");
  const [freitext, setFreitext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]).then(([a, e]) => { setArgs(a); setEvidence(e); });
  }, [caseId]);

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    const eigene = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");

    const evByArg = (argId) => evidence.filter(e => e.argument_id === argId);

    const argBlock = eigene.map((a, i) => {
      const evList = evByArg(a.id);
      return `${i + 1}. ${a.title} (Stärke: ${a.strength || 5}/10)\n   ${a.description || ""}\n   Beweise: ${evList.map(e => `[${e.title}]`).join(", ") || "keine"}`;
    }).join("\n\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener deutscher Rechtsanwalt und verfasst juristische Schriftsätze im professionellen deutschen Kanzleistil.

Erstelle einen vollständigen ${DOC_TYPES.find(d => d.value === docType)?.label || "Schriftsatz"} mit folgenden Angaben:

FALLDATEN:
- Fallname: ${caseData?.fallname || "[Fallname]"}
- Aktenzeichen: ${caseData?.aktenzeichen || "[Aktenzeichen]"}
- Gericht: ${caseData?.gericht || "[Gericht]"}
- Rechtsgebiet: ${caseData?.rechtsgebiet || "[Rechtsgebiet]"}
- Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || "[Rechtsfrage]"}
- Prozessziel: ${caseData?.prozessziel || "[Prozessziel]"}
- Prognose: ${caseData?.prognose || 0}%

PARTEIEN:
- Anwalt/Kanzlei: ${anwaltName || "[RA Name]"} / ${kanzlei || "[Kanzlei]"}
- Mandant (Kläger/Beklagter): ${mandant || "[Mandant]"}
- Gegner: ${gegner || "[Gegner]"}

EIGENE ARGUMENTE UND BEWEISE:
${argBlock || "Keine Argumente vorhanden"}

GEGNER-ARGUMENTE (zum Entkräften):
${gegnerArgs.map(a => `- ${a.title}: ${a.description || ""}`).join("\n") || "Keine"}

${freitext ? `ZUSÄTZLICHE ANWEISUNGEN:\n${freitext}` : ""}

ANFORDERUNGEN:
- Verwende professionellen juristischen deutschen Kanzleistil
- Füge Platzhalter [ANLAGE X] für Beweisdokumente ein
- Gliedere in: Rubrum, Antrag, Sachverhalt, Rechtliche Würdigung, Beweisangebote, Schluss
- Zitiere relevante Normen (§§)
- Markiere Platzhalter für variable Daten mit [...]`,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          schriftsatz: { type: "string" },
          anlagen_liste: { type: "array", items: { type: "string" } },
          hinweise: { type: "string" }
        }
      }
    });
    setResult(res);
    setGenerating(false);
  };

  const copyText = () => {
    if (result?.schriftsatz) {
      navigator.clipboard.writeText(result.schriftsatz);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadTxt = () => {
    if (!result?.schriftsatz) return;
    const blob = new Blob([result.schriftsatz], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}_${caseData?.fallname || caseId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-gray-900">📝 Schriftsatz-Generator</h2>
        <p className="text-xs text-gray-400 mt-0.5">KI erstellt einen vollständigen juristischen Schriftsatz basierend auf Ihren Argumenten und Beweisen</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Schriftsatz-Typ *</label>
            <div className="flex gap-2 flex-wrap">
              {DOC_TYPES.map(t => (
                <button key={t.value} onClick={() => setDocType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${docType === t.value ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Rechtsanwalt / Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Dr. Max Mustermann" value={anwaltName} onChange={e => setAnwaltName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Kanzlei</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Kanzlei Mustermann & Partner" value={kanzlei} onChange={e => setKanzlei(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Mandant (Kläger/Beklagter)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Max Mustermann GmbH" value={mandant} onChange={e => setMandant(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Gegner</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Schmidt AG" value={gegner} onChange={e => setGegner(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Zusätzliche Anweisungen (optional)</label>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="z.B. Schwerpunkt auf §§ 280, 281 BGB, einstweilige Verfügung beantragen..." value={freitext} onChange={e => setFreitext(e.target.value)} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex gap-4 flex-wrap">
          <span><strong>{args.filter(a => a.side === "eigen").length}</strong> eigene Argumente</span>
          <span><strong>{args.filter(a => a.side === "gegner").length}</strong> Gegner-Argumente</span>
          <span><strong>{evidence.length}</strong> Beweismittel</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          ⚠️ Dieser Schriftsatz ist ein KI-Entwurf und muss vor Einreichung von einem Rechtsanwalt geprüft und angepasst werden. Platzhalter [...] und [ANLAGE X] sind zu ersetzen.
        </div>

        <Button onClick={generate} disabled={generating} className="w-full bg-gray-900 text-white rounded-xl gap-2">
          {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generiere Schriftsatz (Claude Sonnet)...</> : <><Sparkles className="w-4 h-4" /> Schriftsatz generieren</>}
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          {result.hinweise && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Hinweise der KI</p>
              <p className="text-xs text-blue-800">{result.hinweise}</p>
            </div>
          )}

          {result.anlagen_liste?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">📎 Anlagenverzeichnis</p>
              <div className="space-y-1">
                {result.anlagen_liste.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="text-gray-400 font-mono">Anlage {i + 1}:</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{DOC_TYPES.find(d => d.value === docType)?.label}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyText} className="gap-1 text-xs rounded-lg">
                  {copied ? <><Check className="w-3 h-3 text-green-500" /> Kopiert</> : <><Copy className="w-3 h-3" /> Kopieren</>}
                </Button>
                <Button size="sm" variant="outline" onClick={downloadTxt} className="gap-1 text-xs rounded-lg">
                  ↓ TXT
                </Button>
              </div>
            </div>
            <div className="p-5">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-xl p-4 max-h-[600px] overflow-y-auto">
                {result.schriftsatz}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
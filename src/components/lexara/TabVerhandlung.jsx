import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabVerhandlung({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [fokus, setFokus] = useState("");
  const [richterStil, setRichterStil] = useState(caseData?.ki_berater_result ? "Neutral" : "Neutral");

  useEffect(() => {
    base44.entities.Argument.filter({ case_id: caseId }).then(setArgs);
  }, [caseId]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    const eigene = args.filter(a => a.side === "eigen");
    const gegner = args.filter(a => a.side === "gegner");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist Verhandlungscoach für den Anwalt. Erstelle Reaktionsskripte für die Verhandlung.
Fall: ${caseData?.fallname || ""}, Rechtsgebiet: ${caseData?.rechtsgebiet || ""}, Prognose: ${caseData?.prognose || 0}%
Eigene Argumente (${eigene.length}): ${eigene.map(a => `${a.title} (Stärke ${a.strength}/10)`).join("; ")}
Gegner-Argumente (${gegner.length}): ${gegner.map(a => `${a.title} (Stärke ${a.strength}/10)`).join("; ")}
Richter-Stil: ${richterStil}
${fokus ? `Fokus: ${fokus}` : ""}
Erstelle 3–5 realistische Verhandlungsszenarien, jeweils mit: dem wahrscheinlichen Einwand der Gegenseite, einem präzisen Reaktionsskript (was der Anwalt sagen soll), einer Alternativreaktion und einer Einschätzung, ob das Szenario günstig oder ungünstig ist.`,
      response_json_schema: {
        type: "object",
        properties: {
          szenarien: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                einwand: { type: "string" },
                reaktion_primaer: { type: "string" },
                reaktion_alternativ: { type: "string" },
                bewertung: { type: "string", enum: ["günstig", "neutral", "ungünstig"] },
                taktik_hinweis: { type: "string" }
              }
            }
          },
          gesamtempfehlung: { type: "string" }
        }
      }
    });
    if (!res || !res.szenarien) {
      setError("KI konnte keine Szenarien generieren. Bitte erneut versuchen.");
      setLoading(false);
      return;
    }
    setResult(res);
    setLoading(false);
  };

  const bewertungStyle = { "günstig": "bg-green-100 text-green-700", "neutral": "bg-gray-100 text-gray-600", "ungünstig": "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Verhandlungsszenarien</h2>
        <p className="text-xs text-gray-400 mt-0.5">KI simuliert gegnerische Einwände und generiert Reaktionsskripte</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Richter-Stil</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={richterStil} onChange={e => setRichterStil(e.target.value)}>
              {["Neutral","Kooperativ","Streng","Prozessaktiv","Vergleichsorientiert"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Fokus / Schwerpunkt (optional)</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="z.B. Schadensersatzanspruch" value={fokus} onChange={e => setFokus(e.target.value)} />
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
          <strong>{args.filter(a=>a.side==="eigen").length}</strong> eigene · <strong>{args.filter(a=>a.side==="gegner").length}</strong> Gegner-Argumente geladen
          {args.length === 0 && <span className="text-amber-500 ml-2">⚠️ Keine Argumente – bitte erst im Tab „Argumente" hinzufügen</span>}
        </div>
        <Button onClick={generate} disabled={loading || args.length === 0} className="w-full bg-gray-900 text-white rounded-xl gap-2">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Simuliere Szenarien...</> : "⚔️ Verhandlungsszenarien generieren"}
        </Button>
        {error && <p className="text-xs text-red-500">⚠️ {error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          {(result.szenarien || []).map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{s.titel}</h3>
                {s.bewertung && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bewertungStyle[s.bewertung] || "bg-gray-100 text-gray-600"}`}>{s.bewertung}</span>}
              </div>
              <div className="space-y-3">
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-1">⚔️ Einwand Gegenseite</p>
                  <p className="text-xs text-gray-700 italic">„{s.einwand}"</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-1">✅ Primäre Reaktion</p>
                  <p className="text-xs text-gray-700">{s.reaktion_primaer}</p>
                </div>
                {s.reaktion_alternativ && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">↩ Alternativreaktion</p>
                    <p className="text-xs text-gray-600">{s.reaktion_alternativ}</p>
                  </div>
                )}
                {s.taktik_hinweis && (
                  <p className="text-[10px] text-amber-600">💡 Taktik: {s.taktik_hinweis}</p>
                )}
              </div>
            </div>
          ))}
          {result.gesamtempfehlung && (
            <div className="bg-gray-900 text-white rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-2">🎯 Gesamtempfehlung</h3>
              <p className="text-sm">{result.gesamtempfehlung}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
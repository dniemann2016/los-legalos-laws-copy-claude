import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, ArrowRight } from "lucide-react";

const KAT_ICONS = { "Richter": "⚖️", "Anwalt": "👔", "Kanzlei": "🏛️", "Zeuge": "👁️", "Sachverständiger": "🔬", "Partei": "🏢", "Sonstiges": "📋" };
const DYNAMIK_COLOR = {
  positiv: "bg-green-100 text-green-800 border-green-200",
  neutral: "bg-gray-100 text-gray-600 border-gray-200",
  angespannt: "bg-amber-100 text-amber-800 border-amber-200",
  konfliktiv: "bg-red-100 text-red-800 border-red-200",
};

export default function AkteureBeziehungen({ profile, allProfiles, cases }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(profile.beziehungsanalyse || null);
  const [expanded, setExpanded] = useState(null);

  const sharedCaseActors = allProfiles.filter(p => {
    if (p.id === profile.id) return false;
    const profileCases = cases.filter(c =>
      c.richter_name === profile.name || c.gegner_anwalt === profile.name
    );
    return profileCases.some(c =>
      c.richter_name === p.name || c.gegner_anwalt === p.name
    );
  });

  const experienceActors = allProfiles.filter(p => {
    if (p.id === profile.id) return false;
    const expTexts = (profile.erfahrungen || []).map(e => e.text + " " + e.fall_kontext).join(" ").toLowerCase();
    return expTexts.includes(p.name.toLowerCase());
  });

  const relevantActors = [...new Map([...sharedCaseActors, ...experienceActors].map(a => [a.id, a])).values()];

  const runAnalysis = async () => {
    setLoading(true);

    const allActorsInfo = allProfiles
      .filter(p => p.id !== profile.id)
      .map(p => `- ${p.name} (${p.kategorie || "Richter"}, ${p.gericht})${
        (p.erfahrungen || []).length > 0 ? ` | ${p.erfahrungen.length} Erfahrungen` : ""
      }`).join("\n");

    const sharedCasesInfo = cases
      .filter(c => c.richter_name === profile.name)
      .map(c => `Fall: "${c.fallname}" (${c.rechtsgebiet || "-"}) - Prognose: ${c.prognose || "?"}% - Status: ${c.status || "?"}`)
      .join("\n") || "Keine direkt verknuepften Faelle.";

    const expText = (profile.erfahrungen || [])
      .map(e => `[${e.datum}] ${e.autor || "Anonym"}: "${e.text}" (Vergleichsbereitschaft: ${e.vergleichsbereitschaft}/10, Geschwindigkeit: ${e.entscheidungsgeschwindigkeit}/10)`)
      .join("\n") || "Keine Erfahrungen dokumentiert.";

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein juristischer Strategie- und Netzwerkanalyst. Analysiere die Beziehungsdynamiken zwischen dem folgenden Akteur und anderen bekannten Prozessbeteiligten.

HAUPTAKTEUR:
Name: ${profile.name}
Kategorie: ${profile.kategorie || "Richter"}
Institution: ${profile.gericht}
Stil: ${profile.stil || "Neutral"}
Klaegerquote: ${profile.klaeger_rate || 0}%
Vergleichsrate: ${profile.vergleich_rate || 0}%
Bekannt fuer: ${profile.bekannt_fuer || "-"}

KANZLEI-ERFAHRUNGEN MIT DIESEM AKTEUR:
${expText}

VERKNUEPFTE FAELLE:
${sharedCasesInfo}

ANDERE BEKANNTE AKTEURE IM SYSTEM:
${allActorsInfo || "Noch keine anderen Akteure erfasst."}

AUFGABEN:
1. Identifiziere alle Akteure, mit denen ${profile.name} wahrscheinlich oder nachweislich interagiert hat (basierend auf gemeinsamen Faellen, Nennungen in Erfahrungen, Institution, Rechtsgebiet).
2. Fuer jeden relevanten Akteur: Analysiere die Beziehungsdynamik. Wie verhalten sie sich zueinander? Gibt es Muster?
3. Erkenne taktisch relevante Konstellationen: Welche Kombinationen sind vorteilhaft fuer unsere Partei? Welche sind riskant?
4. Gib eine Gesamteinschaetzung des Akteursnetzwerks und strategische Empfehlungen.`,
      response_json_schema: {
        type: "object",
        properties: {
          beziehungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                akteur_name: { type: "string" },
                akteur_kategorie: { type: "string" },
                dynamik: { type: "string", enum: ["positiv", "neutral", "angespannt", "konfliktiv"] },
                verbindungstyp: { type: "string" },
                beschreibung: { type: "string" },
                taktische_relevanz: { type: "string" },
                gemeinsame_faelle: { type: "array", items: { type: "string" } },
                empfehlung: { type: "string" }
              }
            }
          },
          netzwerk_einschaetzung: { type: "string" },
          kritische_konstellationen: { type: "array", items: { type: "string" } },
          strategische_empfehlungen: { type: "array", items: { type: "string" } }
        }
      }
    });

    if (res) {
      await base44.entities.JudgeProfile.update(profile.id, {
        beziehungsanalyse: { ...res, berechnet: new Date().toISOString() }
      });
      setResult(res);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Beziehungsnetz & Taktische Dynamiken
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">KI erkennt Verbindungen zwischen Akteuren und Verhaltensmustern</p>
          </div>
          <Button onClick={runAnalysis} disabled={loading} className="bg-gray-900 text-white rounded-xl text-xs h-8 gap-1.5">
            {loading
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analysiere...</>
              : <><Users className="w-3.5 h-3.5" /> {result ? "Neu analysieren" : "Beziehungen analysieren"}</>
            }
          </Button>
        </div>

        {relevantActors.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Erkannte direkte Verbindungen</p>
            <div className="flex flex-wrap gap-2">
              {relevantActors.map(a => (
                <span key={a.id} className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-full px-2.5 py-1">
                  {KAT_ICONS[a.kategorie || "Richter"]} {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && (
          <p className="text-sm text-gray-400 text-center py-8">
            {allProfiles.length <= 1
              ? "Legen Sie weitere Akteure an, damit die KI Beziehungen analysieren kann."
              : "Klicken Sie auf Beziehungen analysieren um Dynamiken zwischen Akteuren zu erkennen."
            }
          </p>
        )}
      </div>

      {result && (
        <>
          {(result.beziehungen || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Erkannte Beziehungen</p>
              {result.beziehungen.map((b, i) => (
                <div key={i}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${DYNAMIK_COLOR[b.dynamik] || DYNAMIK_COLOR.neutral}`}
                  onClick={() => setExpanded(expanded === i ? null : i)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{KAT_ICONS[b.akteur_kategorie] || "📋"}</span>
                      <div>
                        <p className="text-xs font-semibold">{b.akteur_name}</p>
                        <p className="text-[10px] opacity-70">{b.verbindungstyp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold border ${DYNAMIK_COLOR[b.dynamik]}`}>{b.dynamik}</span>
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform ${expanded === i ? "rotate-90" : ""}`} />
                    </div>
                  </div>
                  {expanded === i && (
                    <div className="mt-3 pt-3 border-t border-black border-opacity-10 space-y-2">
                      {b.beschreibung && <p className="text-xs">{b.beschreibung}</p>}
                      {(b.gemeinsame_faelle || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {b.gemeinsame_faelle.map((f, j) => (
                            <span key={j} className="text-[9px] bg-white bg-opacity-60 rounded px-2 py-0.5 font-mono">{f}</span>
                          ))}
                        </div>
                      )}
                      {b.taktische_relevanz && <p className="text-xs font-medium">🎯 {b.taktische_relevanz}</p>}
                      {b.empfehlung && <p className="text-xs italic opacity-80">→ {b.empfehlung}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(result.kritische_konstellationen || []).length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 mb-2">⚠️ Kritische Konstellationen</p>
              <ul className="space-y-1">
                {result.kritische_konstellationen.map((k, i) => (
                  <li key={i} className="text-xs text-red-800">• {k}</li>
                ))}
              </ul>
            </div>
          )}

          {(result.strategische_empfehlungen || []).length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-2">🧭 Strategische Empfehlungen</p>
              <ul className="space-y-1">
                {result.strategische_empfehlungen.map((e, i) => (
                  <li key={i} className="text-xs text-indigo-800">✓ {e}</li>
                ))}
              </ul>
            </div>
          )}

          {result.netzwerk_einschaetzung && (
            <div className="bg-gray-900 text-white rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-300 mb-1">Netzwerk-Gesamteinschätzung</p>
              <p className="text-sm">{result.netzwerk_einschaetzung}</p>
            </div>
          )}

          {result.berechnet && (
            <p className="text-[10px] text-gray-400 text-right">Analysiert: {new Date(result.berechnet).toLocaleString("de-DE")}</p>
          )}
        </>
      )}
    </div>
  );
}
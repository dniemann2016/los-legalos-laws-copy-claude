import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMPTY_PROFIL = { gegner_name:"", gegner_groesse:"", gegner_finanzlage:"", gegner_branche:"", entscheider_name:"", entscheider_alter:"", entscheider_persoenlichkeit:"", entscheider_karriere:"", entscheider_schwaechen:"", anwalt_kanzlei:"", anwalt_bekannt_fuer:"", anwalt_schwaechen:"", verhalten_verhandlung:"", verhalten_taktik:"", verhalten_fehler:"", eigene_staerken:"", eigene_schwaechen:"", ziel_maximal:"", ziel_realistisch:"", ziel_minimal:"", nicht_verhandelbar:"", kontext_oeffentlichkeit:"", kontext_zeitdruck:"", kontext_weitere:"" };

export default function TabKIBerater({ caseId, caseData, onUpdate }) {
  const [acknowledged, setAcknowledged] = useState(!!(caseData?.ki_berater_result));
  const [profil, setProfil] = useState(caseData?.gegner_profil || EMPTY_PROFIL);
  const [showProfil, setShowProfil] = useState(false);
  const [result, setResult] = useState(caseData?.ki_berater_result || null);
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
      prompt: `Du bist ein strategischer Berater für juristische Verhandlungen (Machiavelli + Harvard + FBI-Taktiken).
Fall: ${caseData?.fallname||""}, Rechtsgebiet: ${caseData?.rechtsgebiet||""}, Prognose: ${caseData?.prognose||0}%
Eigene Argumente (${eigene.length}): ${eigene.map(a=>`${a.title} (${a.strength}/10)`).join(", ")}
Gegner-Argumente (${gegner.length}): ${gegner.map(a=>`${a.title} (${a.strength}/10)`).join(", ")}
Gegner-Profil: ${JSON.stringify(profil)}
Führe folgende Analysen durch: Psychologisches Profil (Big Five + Dark Triad Assessment der Gegenpartei. Identifiziert Trigger, Schwachpunkte und optimalen Verhandlungsansatz.), Druckmittel-Analyse (Systematische Identifikation aller Schwachstellen: Zeitdruck, Finanzen, Reputation, persönliche Risiken.), Strategieempfehlungen (3–5 taktische Optionen von kooperativ bis aggressiv. Erfolgswahrscheinlichkeit und Risikoabwägung.), Timing & Momentum (Optimaler Zeitpunkt für jeden Schritt. Identifiziert kritische Zeitfenster und Schwächephasen des Gegners.), Informationsstrategie (Was offenlegen, verbergen oder als Bluff nutzen? Ethische Klassifizierung jeder Maßnahme.), Verhandlungsskript mit Opening/Argumentation/Closing/Einwandbehandlung (Maßgeschneidertes Skript mit FBI-Taktiken (Calibrated Questions) und konkreten Formulierungen.).`,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          psychologisches_profil: { type: "object", properties: { big_five: {type:"object"}, dark_triad: {type:"object"}, trigger: {type:"array",items:{type:"object"}}, empfehlung: {type:"string"} } },
          druckmittel: { type: "array", items: { type:"object", properties: { kategorie:{type:"string"}, titel:{type:"string"}, wie_nutzen:{type:"string"}, timing:{type:"string"}, risiko:{type:"string"}, staerke:{type:"number"} } } },
          strategien: { type: "array", items: { type:"object", properties: { name:{type:"string"}, stil:{type:"string"}, schritte:{type:"array",items:{type:"string"}}, risiko:{type:"string"}, zitat:{type:"string"}, erfolg_pct:{type:"number"} } } },
          timing: { type: "object", properties: { momentum:{type:"string"}, momentum_pct:{type:"number"}, zeitfenster:{type:"array",items:{type:"object"}}, naechster_schritt:{type:"string"} } },
          informationsstrategie: { type: "object", properties: { sofort_offenlegen:{type:"array",items:{type:"string"}}, verbergen:{type:"array",items:{type:"string"}}, als_bluff:{type:"array",items:{type:"string"}} } },
          verhandlungsskript: { type: "object", properties: { vorbereitung:{type:"string"}, opening:{type:"string"}, argumentation:{type:"string"}, closing:{type:"string"}, einwand:{type:"string"}, backup:{type:"string"}, psycho_notizen:{type:"array",items:{type:"string"}} } },
          empfehlung: { type: "string" },
        }
      }
    });
    if (!res || Object.keys(res).length === 0) {
      setAnalysisError("KI-Analyse fehlgeschlagen oder kein Ergebnis. Bitte erneut versuchen.");
      setLoading(false);
      return;
    }
    setResult(res);
    const updated = await base44.entities.Case.update(caseId, { ki_berater_result: res, gegner_profil: profil });
    onUpdate(updated);
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
            {[["🏢 Gegner-Organisation — Name, Größe, Finanzlage, Branche",[["Name","gegner_name","z.B. ABC GmbH"],["Größe","gegner_groesse","z.B. Mittelstand, 200 MA"],["Finanzlage","gegner_finanzlage","z.B. Liquiditätsprobleme"],["Branche","gegner_branche","z.B. Pharma"]]],["👤 Entscheider (CEO/GF) — Persönlichkeit, Schwächen, Karrierephase",[["Name/Titel","entscheider_name","z.B. Dr. Max Müller (CEO)"],["Alter","entscheider_alter","z.B. 58"],["Persönlichkeit","entscheider_persoenlichkeit","z.B. Dominant, risikoscheu"],["Karrierephase","entscheider_karriere","z.B. Kurz vor Ruhestand"],["Schwächen","entscheider_schwaechen","z.B. Angst vor Medienberichten"]]],["⚖️ Anwalt Gegenseite — Kanzlei, Stärken, Schwächen",[["Kanzlei","anwalt_kanzlei","z.B. Schmidt & Partner"],["Bekannt für","anwalt_bekannt_fuer","z.B. Aggressive Taktik"],["Schwächen","anwalt_schwaechen","z.B. Überzieht oft, Richter genervt"]]],["📋 Bisheriges Verhalten — Verhandlungsbereitschaft, Taktiken, Fehler",[["Verhandlungsbereitschaft","verhalten_verhandlung","z.B. Öffentlich: Null. Privat: Signale"],["Taktik","verhalten_taktik","z.B. Verzögerung, viele Beweisanträge"],["Fehler","verhalten_fehler","z.B. Widerspruch zwischen Schriftsätzen"]]],["💪 Eigene Position — Stärken, Schwächen, Verhandlungsziele",[["Stärken","eigene_staerken","z.B. Klare Beweislage"],["Schwächen","eigene_schwaechen","z.B. Mandant finanziell limitiert"],["Ziel maximal","ziel_maximal","z.B. 500.000€ + Unterlassung"],["Ziel realistisch","ziel_realistisch","z.B. 300.000€"],["Ziel minimal","ziel_minimal","z.B. 150.000€"],["Nicht verhandelbar","nicht_verhandelbar","z.B. Öffentliche Entschuldigung"]]],["🌐 Kontext & Externe Faktoren — Öffentlichkeit, Zeitdruck, Fusionen",[["Öffentlichkeit","kontext_oeffentlichkeit","z.B. Medieninteresse vorhanden"],["Zeitdruck","kontext_zeitdruck","z.B. Fusion in 6 Monaten"],["Weitere Faktoren","kontext_weitere","z.B. Hauptversammlung"]]]].map(([sectionTitle, fields]) => (
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

      {/* Analyse-Module */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 Analyse-Module</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[["👤","Psychologisches Profil","Big Five + Dark Triad Assessment der Gegenpartei. Identifiziert Trigger, Schwachpunkte und optimalen Verhandlungsansatz.",!!result?.psychologisches_profil],["🎯","Druckmittel-Analyse","Systematische Identifikation aller Schwachstellen: Zeitdruck, Finanzen, Reputation, persönliche Risiken.",!!(result?.druckmittel?.length)],["⚔️","Strategieempfehlungen","3–5 taktische Optionen von kooperativ bis aggressiv. Erfolgswahrscheinlichkeit und Risikoabwägung.",!!(result?.strategien?.length)],["⏰","Timing & Momentum","Optimaler Zeitpunkt für jeden Schritt. Identifiziert kritische Zeitfenster und Schwächephasen des Gegners.",!!result?.timing],["🔒","Informationsstrategie","Was offenlegen, verbergen oder als Bluff nutzen? Ethische Klassifizierung jeder Maßnahme.",!!result?.informationsstrategie],["💬","Verhandlungsskript","Maßgeschneidertes Skript mit FBI-Taktiken (Calibrated Questions) und konkreten Formulierungen.",!!result?.verhandlungsskript]].map(([icon,title,desc,done]) => (
            <div key={title} className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-xs font-semibold text-gray-700">{title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              {done && <p className="text-[10px] text-green-600 mt-1.5">✓ Ergebnis</p>}
            </div>
          ))}
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="w-full bg-gray-900 text-white rounded-xl gap-2">
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analysiere mit KI...</> : "🎯 Vollständige Analyse starten"}
        </Button>
        {analysisError && <p className="text-xs text-red-500 mt-2 text-center">⚠️ {analysisError}</p>}
        <p className="text-[10px] text-amber-600 text-center mt-2">⚠️ Diese Analyse verwendet Claude Sonnet (mehr KI-Credits)</p>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Psychologisches Profil */}
          {result.psychologisches_profil && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">👤 Psychologisches Profil – Ergebnis</h3>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 Druckmittel-Analyse – Ergebnis</h3>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">⏰ Timing & Momentum – Ergebnis</h3>
              {result.timing.momentum && (
                <div className="mb-3">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-xs text-gray-600 flex-1">{result.timing.momentum}</p>
                    {result.timing.momentum_pct !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{width:`${result.timing.momentum_pct}%`}} /></div>
                        <span className="text-xs text-gray-500">{result.timing.momentum_pct}%</span>
                      </div>
                    )}
                  </div>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔒 Informationsstrategie – Ergebnis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[[["sofort_offenlegen","✅ Sofort offenlegen","bg-green-50 border-green-100 text-green-700"],["verbergen","🔒 Verbergen","bg-red-50 border-red-100 text-red-700"],["als_bluff","🎭 Als Bluff nutzen","bg-amber-50 border-amber-100 text-amber-700"]]].flat().map(([key,label,cls]) => (
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
              <h3 className="text-sm font-semibold text-gray-700 mb-4">⚔️ Strategieempfehlungen – Ergebnis</h3>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-4">💬 Verhandlungsskript – Ergebnis</h3>
              {[["🎯 Vorbereitung","vorbereitung"],["🎬 Opening (Erste Minuten)","opening"],["⚔️ Argumentation","argumentation"],["🤝 Closing","closing"],["📋 Backup Plan","backup"],["💬 Einwandbehandlung","einwand"]].map(([label, key]) => (
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
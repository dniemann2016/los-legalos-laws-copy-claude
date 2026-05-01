import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/kiProvider";
import { Button } from "@/components/ui/button";
import { RefreshCw, Save, User, Briefcase, Brain, Shield, ChevronDown, ChevronUp } from "lucide-react";

const EMPTY_PROFIL = {
  partei_name: "",
  partei_typ: "Privatperson",
  partei_beschreibung: "",
  anwalt_name: "",
  anwalt_kanzlei: "",
  anwalt_bekannt_fuer: "",
  anwalt_stil: "",
  bekannte_taktiken: "",
  bisherige_reaktionen: "",
  interessen: "",
  schwaechen: "",
};

export default function GegnerProfilSimulation({ caseId, caseData, onUpdate }) {
  const [profil, setProfil] = useState(EMPTY_PROFIL);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    if (caseData?.gegner_profil) {
      setProfil(prev => ({ ...EMPTY_PROFIL, ...caseData.gegner_profil }));
      if (caseData.gegner_profil.simulation) {
        setSimulation(caseData.gegner_profil.simulation);
        setShowForm(false);
      }
    }
  }, [caseData]);

  const saveProfil = async () => {
    setSaving(true);
    await base44.entities.Case.update(caseId, { gegner_profil: { ...profil, simulation } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    if (onUpdate) onUpdate();
  };

  const runSimulation = async () => {
    setSimulating(true);
    const result = await invokeLLM({
      model: "claude_sonnet_4_6",
      prompt: `Du bist ein erfahrener Prozessstratege und Psychologe. Analysiere die Gegenpartei und erstelle eine taktische Simulation.

FALLKONTEXT:
Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Prozessziel: ${caseData?.prozessziel || ""}
Instanz: ${caseData?.instanz || ""}

GEGENPARTEI-PROFIL:
Name: ${profil.partei_name || "unbekannt"}
Typ: ${profil.partei_typ}
Beschreibung: ${profil.partei_beschreibung || "–"}

ANWALT DER GEGENSEITE:
Name: ${profil.anwalt_name || "unbekannt"}
Kanzlei: ${profil.anwalt_kanzlei || "–"}
Bekannt für: ${profil.anwalt_bekannt_fuer || "–"}
Verhandlungsstil: ${profil.anwalt_stil || "–"}

BEKANNTE INFORMATIONEN:
Bekannte Taktiken: ${profil.bekannte_taktiken || "–"}
Bisherige Reaktionen: ${profil.bisherige_reaktionen || "–"}
Interessen der Gegenseite: ${profil.interessen || "–"}
Schwächen/Verwundbarkeiten: ${profil.schwaechen || "–"}

AUFGABEN:
1. Simuliere die 3 wahrscheinlichsten nächsten Schachzüge der Gegenseite (mit Wahrscheinlichkeit %)
2. Entwickle für jeden Schachzug die taktisch effektivste Verteidigungsstrategie
3. Erstelle ein psychologisches Profil der Gegenpartei
4. Identifiziere Hebelpunkte und Verhandlungsschwächen
5. Empfehle die übergeordnete Verteidigungsstrategie`,
      response_json_schema: {
        type: "object",
        properties: {
          naechste_zuege: {
            type: "array",
            items: {
              type: "object",
              properties: {
                zug: { type: "string" },
                wahrscheinlichkeit: { type: "number" },
                begruendung: { type: "string" },
                verteidigung: { type: "string" },
                dringlichkeit: { type: "string", enum: ["sofort", "kurz", "mittel"] }
              }
            }
          },
          psycho_profil: {
            type: "object",
            properties: {
              motivation: { type: "string" },
              risikobereitschaft: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
              verhandlungstyp: { type: "string" },
              schwaechen: { type: "array", items: { type: "string" } },
              hebelpunkte: { type: "array", items: { type: "string" } }
            }
          },
          top_strategie: {
            type: "object",
            properties: {
              name: { type: "string" },
              beschreibung: { type: "string" },
              massnahmen: { type: "array", items: { type: "string" } },
              erfolgsquote: { type: "number" }
            }
          },
          warnung: { type: "string" }
        }
      }
    });

    if (result) {
      setSimulation(result);
      setShowForm(false);
      await base44.entities.Case.update(caseId, { gegner_profil: { ...profil, simulation: result } });
      if (onUpdate) onUpdate();
    }
    setSimulating(false);
  };

  const DRINGLICHKEIT_COLOR = { sofort: "bg-red-100 text-red-700", kurz: "bg-amber-100 text-amber-700", mittel: "bg-blue-100 text-blue-700" };

  return (
    <div className="space-y-5">
      {/* Profil-Formular */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-900">Gegenpartei-Profil</span>
          {profil.partei_name && <span className="text-xs text-gray-400 ml-1">· {profil.partei_name}</span>}
          <span className="ml-auto">{showForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</span>
        </button>

        {showForm && (
          <div className="p-5 border-t border-gray-100 space-y-5">
            {/* Gegenpartei */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Gegenpartei</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Name / Firma</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    placeholder="z.B. Max Mustermann GmbH"
                    value={profil.partei_name} onChange={e => setProfil(p => ({ ...p, partei_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Typ</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    value={profil.partei_typ} onChange={e => setProfil(p => ({ ...p, partei_typ: e.target.value }))}>
                    {["Privatperson", "Unternehmen", "GmbH", "AG", "Versicherung", "Behörde", "Sonstiges"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Beschreibung / Hintergrund</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" rows={2}
                    placeholder="Branche, Größe, Reputation, relevante Hintergrundinformationen..."
                    value={profil.partei_beschreibung} onChange={e => setProfil(p => ({ ...p, partei_beschreibung: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Interessen & Ziele der Gegenseite</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" rows={2}
                    placeholder="Was will die Gegenseite wirklich erreichen? Finanzielle Ziele, Reputationsschutz..."
                    value={profil.interessen} onChange={e => setProfil(p => ({ ...p, interessen: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Bekannte Schwächen / Verwundbarkeiten</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" rows={2}
                    placeholder="Finanzielle Engpässe, Reputationsrisiken, Widersprüche in deren Vortrag..."
                    value={profil.schwaechen} onChange={e => setProfil(p => ({ ...p, schwaechen: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Anwalt */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Anwalt der Gegenseite</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Name</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    placeholder="Dr. Max Muster"
                    value={profil.anwalt_name} onChange={e => setProfil(p => ({ ...p, anwalt_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Kanzlei</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    placeholder="Kanzlei XYZ"
                    value={profil.anwalt_kanzlei} onChange={e => setProfil(p => ({ ...p, anwalt_kanzlei: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Bekannt für</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    placeholder="Aggressive Verhandlungsführung, Verzögerungstaktik..."
                    value={profil.anwalt_bekannt_fuer} onChange={e => setProfil(p => ({ ...p, anwalt_bekannt_fuer: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Verhandlungsstil</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    value={profil.anwalt_stil} onChange={e => setProfil(p => ({ ...p, anwalt_stil: e.target.value }))}>
                    {["", "Kooperativ", "Aggressiv", "Prozessaktiv", "Vergleichsorientiert", "Verzögernd", "Formal-rigide"].map(s => <option key={s} value={s}>{s || "— wählen —"}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Bekannte Taktiken</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" rows={2}
                    placeholder="Massenhafte Beweisanträge, späte Schriftsätze, Vergleichsangebote kurz vor Termin..."
                    value={profil.bekannte_taktiken} onChange={e => setProfil(p => ({ ...p, bekannte_taktiken: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block mb-1">Bisherige Reaktionen in diesem Fall</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" rows={2}
                    placeholder="Hat Vergleich abgelehnt, hat Fristverlängerung beantragt, hat Widerklage angedroht..."
                    value={profil.bisherige_reaktionen} onChange={e => setProfil(p => ({ ...p, bisherige_reaktionen: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={saveProfil} disabled={saving} variant="outline" className="text-xs gap-1.5">
                <Save className="w-3.5 h-3.5" /> {saved ? "Gespeichert ✓" : saving ? "Speichern..." : "Speichern"}
              </Button>
              <Button size="sm" onClick={runSimulation} disabled={simulating}
                className="bg-gray-900 text-white text-xs gap-1.5 flex-1">
                {simulating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Simuliere KI-Schachzüge...</> : <><Brain className="w-3.5 h-3.5" /> KI-Simulation starten</>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Simulation Ergebnisse */}
      {simulation && (
        <div className="space-y-4">
          {/* Warnung */}
          {simulation.warnung && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 font-medium">
              ⚠️ {simulation.warnung}
            </div>
          )}

          {/* Nächste Schachzüge */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              ♟️ Wahrscheinlichste nächste Schachzüge der Gegenseite
            </h3>
            <div className="space-y-3">
              {(simulation.naechste_zuege || []).map((zug, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-300">#{i + 1}</span>
                      <span className="text-sm font-bold text-gray-900">{zug.zug}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {zug.dringlichkeit && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${DRINGLICHKEIT_COLOR[zug.dringlichkeit]}`}>
                          {zug.dringlichkeit.toUpperCase()}
                        </span>
                      )}
                      <div className="text-right">
                        <div className="text-lg font-black text-red-600">{zug.wahrscheinlichkeit}%</div>
                        <div className="text-[9px] text-gray-400">Wahrscheinlichkeit</div>
                      </div>
                    </div>
                  </div>
                  {zug.begruendung && <p className="text-xs text-gray-600">{zug.begruendung}</p>}
                  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <p className="text-[10px] font-bold text-green-700 mb-0.5">🛡️ Empfohlene Verteidigung</p>
                    <p className="text-xs text-green-800">{zug.verteidigung}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top-Strategie */}
          {simulation.top_strategie && (
            <div className="bg-gray-900 text-white rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Optimale Gesamtstrategie</p>
                    <h3 className="text-base font-black text-white">{simulation.top_strategie.name}</h3>
                  </div>
                </div>
                {simulation.top_strategie.erfolgsquote && (
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-400">{simulation.top_strategie.erfolgsquote}%</div>
                    <div className="text-[9px] text-gray-500">Erfolgsquote</div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-300 mb-4">{simulation.top_strategie.beschreibung}</p>
              {simulation.top_strategie.massnahmen?.length > 0 && (
                <ul className="space-y-2">
                  {simulation.top_strategie.massnahmen.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                      {m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Psycho-Profil */}
          {simulation.psycho_profil && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" /> Psychologisches Profil
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {simulation.psycho_profil.motivation && (
                  <div className="col-span-2 bg-purple-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Motivation</p>
                    <p className="text-xs text-gray-700">{simulation.psycho_profil.motivation}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Risikobereitschaft</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${simulation.psycho_profil.risikobereitschaft === "hoch" ? "bg-red-100 text-red-700" : simulation.psycho_profil.risikobereitschaft === "mittel" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {simulation.psycho_profil.risikobereitschaft?.toUpperCase()}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Verhandlungstyp</p>
                  <p className="text-xs text-gray-700 font-medium">{simulation.psycho_profil.verhandlungstyp}</p>
                </div>
                {simulation.psycho_profil.hebelpunkte?.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Hebelpunkte</p>
                    <div className="flex flex-wrap gap-2">
                      {simulation.psycho_profil.hebelpunkte.map((h, i) => (
                        <span key={i} className="text-xs bg-amber-100 text-amber-800 rounded-full px-3 py-1">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button onClick={() => { setShowForm(true); setSimulation(null); }}
            className="w-full text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors">
            ↩ Profil bearbeiten & neu simulieren
          </button>
        </div>
      )}
    </div>
  );
}
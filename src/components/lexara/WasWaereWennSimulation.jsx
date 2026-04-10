import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff, RefreshCw, Brain, AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

function computePrognose(args, evidence, persons, deadlines, hiddenIds, caseData) {
  const activeArgs = args.filter(a => !hiddenIds.has(a.id));
  const activeEvidence = evidence.filter(e => !hiddenIds.has(e.id));
  const activeDeadlines = deadlines.filter(d => !hiddenIds.has(d.id));

  const eigene = activeArgs.filter(x => x.side === "eigen");
  const gegner = activeArgs.filter(x => x.side === "gegner");
  const eigenStaerke = eigene.reduce((s, x) => s + (x.strength || 5), 0);
  const gegnerStaerke = gegner.reduce((s, x) => s + (x.strength || 5), 0);
  const argBasis = (eigene.length > 0 || gegner.length > 0)
    ? Math.max(0, ((eigenStaerke / Math.max(1, eigene.length)) - (gegnerStaerke / Math.max(1, gegner.length))) * 5 + 50)
    : 50;
  const avgEvidW = activeEvidence.length > 0 ? activeEvidence.reduce((s, x) => s + (x.weight || 5), 0) / activeEvidence.length : 5;
  const beweisBoost = 1 + (avgEvidW / 10) * 0.5;
  const contradictions = activeArgs.filter(x => x.is_contradiction).length;
  const kantenEffekt = Math.max(0.2, 1 - contradictions * 0.2);
  const judges = persons.filter(x => x.role === "Richter");
  const avgGlaubw = judges.length > 0 ? judges.reduce((s, x) => s + (x.glaubwuerdigkeit || 80), 0) / judges.length : 80;
  const zeugenMult = 0.70 + (avgGlaubw / 100) * 0.30;
  const richterRate = judges[0]?.klaeger_rate || caseData?.richter_klaeger_rate || 50;
  const richterAdj = 1 + (richterRate - 50) / 100 * 0.15;
  const versaeumt = activeDeadlines.filter(x => x.status === "versaeumt").length;
  const fristenFaktor = Math.max(0.5, 1 - versaeumt * 0.30);
  const raw = argBasis * beweisBoost * kantenEffekt * zeugenMult * richterAdj * fristenFaktor;
  return Math.min(99, Math.max(1, Math.round(raw)));
}

function ToggleRow({ item, type, isHidden, onToggle, badge, badgeColor }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isHidden ? "opacity-40 bg-gray-50 border-gray-100" : "bg-white border-gray-200"}`}>
      <button onClick={() => onToggle(item.id)} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isHidden ? "line-through text-gray-400" : "text-gray-800"}`}>{item.title || item.name || item.fallname}</p>
        {item.due_date && <p className="text-[10px] text-gray-400">{item.due_date} · {item.status}</p>}
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${badgeColor}`}>{badge}</span>
    </div>
  );
}

function PrognoseBar({ value, label, delta }) {
  const color = value >= 60 ? "bg-green-600" : value >= 40 ? "bg-amber-500" : "bg-red-600";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{value}%</span>
          {delta !== undefined && delta !== 0 && (
            <span className={`text-xs font-semibold ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
              {delta > 0 ? "+" : ""}{delta}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function WasWaereWennSimulation({ args, evidence, deadlines, persons, caseData, basePrognose }) {
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [motives, setMotives] = useState(null);
  const [loadingMotives, setLoadingMotives] = useState(false);
  const [motiveError, setMotiveError] = useState(null);
  const [expandedSection, setExpandedSection] = useState("args");

  const toggleHidden = (id) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetAll = () => setHiddenIds(new Set());

  const simPrognose = computePrognose(args, evidence, persons, deadlines, hiddenIds, caseData);
  const delta = simPrognose - (basePrognose || 0);

  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  const runMotiveAnalysis = async () => {
    setLoadingMotives(true);
    setMotiveError(null);
    try {
      const gegnerDeadlines = deadlines.filter(d => d.side === "Gegner");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Prozessanwalt und Verhaltensstratege (Sun Tzu + Machiavelli).
Analysiere die TIMING-STRATEGIE der Gegenseite in diesem Rechtstreit.

Fall: ${caseData?.fallname || ""} | Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}

GEGNER-ARGUMENTE (${gegnerArgs.length} gesamt):
${gegnerArgs.map(a => `- "${a.title}" (Stärke: ${a.strength || 5}/10): ${a.description || ""}`).join("\n")}

FRISTEN VON GEGENSEITE (${gegnerDeadlines.length}):
${gegnerDeadlines.map(d => `- "${d.title}" bis ${d.due_date} [${d.status}]`).join("\n")}

EIGENE ARGUMENTE (${eigenArgs.length}):
${eigenArgs.map(a => `- "${a.title}" (Stärke: ${a.strength || 5}/10)`).join("\n")}

Analysiere:
1. Warum argumentiert die Gegenseite JETZT so (Timing, nicht Inhalt)?
2. Warum wurden DIESE Fristen JETZT gesetzt?
3. Welche verdeckten Ziele/Ängste hat der Gegner?
4. Welche psychologischen Druckmittel werden eingesetzt?
5. Was plant der Gegner als nächsten Schritt?
6. Unsere beste Gegenreaktion auf das Timing?`,
        response_json_schema: {
          type: "object",
          properties: {
            timing_analyse: { type: "string" },
            fristen_hintergedanken: { type: "string" },
            verdeckte_ziele: { type: "array", items: { type: "string" } },
            psychologische_taktiken: { type: "array", items: { type: "object", properties: { taktik: { type: "string" }, beweis: { type: "string" }, intensitaet: { type: "string" } } } },
            naechster_schritt_gegner: { type: "string" },
            empfohlene_reaktion: { type: "string" },
            rote_flaggen: { type: "array", items: { type: "string" } },
          }
        },
      });
      setMotives(result);
    } catch (e) {
      setMotiveError(e?.message || "Unbekannter Fehler. Bitte erneut versuchen.");
    }
    setLoadingMotives(false);
  };

  const Section = ({ id, label, children }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        {expandedSection === id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expandedSection === id && <div className="p-3 space-y-2 bg-white">{children}</div>}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header + Prognose */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">🔮 Was-wäre-wenn-Simulation</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Blende Argumente, Beweise oder Fristen aus, um ihre Auswirkung zu messen.</p>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll} className="text-xs gap-1.5">
            <RefreshCw className="w-3 h-3" /> Zurücksetzen
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrognoseBar value={basePrognose || 0} label="Aktuelle Prognose (real)" />
          <PrognoseBar value={simPrognose} label="Simulierte Prognose" delta={delta} />
        </div>

        {hiddenIds.size > 0 && (
          <div className={`mt-4 rounded-xl px-4 py-3 border text-sm font-medium flex items-center gap-2 ${delta > 0 ? "bg-green-50 border-green-200 text-green-800" : delta < 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {hiddenIds.size} Element{hiddenIds.size > 1 ? "e" : ""} ausgeblendet →{" "}
              {delta > 0 ? `Prognose steigt um ${delta}% wenn wir diese Elemente gewinnen` : delta < 0 ? `Prognose sinkt um ${Math.abs(delta)}% ohne diese Elemente` : "Kein Einfluss auf Prognose"}
            </span>
          </div>
        )}
      </div>

      {/* Toggle Lists */}
      <div className="space-y-2">
        <Section id="args_e" label={`✅ Eigene Argumente (${eigenArgs.length})`}>
          {eigenArgs.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine eigenen Argumente</p>}
          {eigenArgs.map(a => (
            <ToggleRow key={a.id} item={a} type="arg" isHidden={hiddenIds.has(a.id)} onToggle={toggleHidden}
              badge={`${a.strength || 5}/10`} badgeColor="bg-green-100 text-green-700" />
          ))}
        </Section>

        <Section id="args_g" label={`⚔️ Gegner-Argumente (${gegnerArgs.length})`}>
          {gegnerArgs.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine Gegner-Argumente</p>}
          {gegnerArgs.map(a => (
            <ToggleRow key={a.id} item={a} type="arg" isHidden={hiddenIds.has(a.id)} onToggle={toggleHidden}
              badge={`${a.strength || 5}/10`} badgeColor="bg-red-100 text-red-700" />
          ))}
        </Section>

        <Section id="evidence" label={`🔍 Beweise (${evidence.length})`}>
          {evidence.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine Beweise</p>}
          {evidence.map(e => (
            <ToggleRow key={e.id} item={e} type="ev" isHidden={hiddenIds.has(e.id)} onToggle={toggleHidden}
              badge={`${e.weight || 5}/10`} badgeColor="bg-blue-100 text-blue-700" />
          ))}
        </Section>

        <Section id="deadlines" label={`⏰ Fristen (${deadlines.length})`}>
          {deadlines.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine Fristen</p>}
          {deadlines.map(d => (
            <ToggleRow key={d.id} item={{ ...d, title: d.title }} type="dl" isHidden={hiddenIds.has(d.id)} onToggle={toggleHidden}
              badge={d.side || "–"} badgeColor={d.side === "Gegner" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"} />
          ))}
        </Section>
      </div>

      {/* Motive / Hintergedanken Analysis */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" /> Hintergedanken & Timing-Analyse</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Warum argumentiert / setzt der Gegner JETZT Fristen? Was sind die verdeckten Motive?</p>
          </div>
          <Button onClick={runMotiveAnalysis} disabled={loadingMotives} size="sm" className="bg-purple-700 hover:bg-purple-800 text-white text-xs gap-1.5">
            {loadingMotives ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analysiere...</> : "🔍 Motive aufdecken"}
          </Button>
        </div>
        {loadingMotives && (
          <div className="text-center py-6 text-xs text-gray-400">KI analysiert Timing-Strategie der Gegenseite… (30–60s)</div>
        )}
        {motiveError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">⚠️ {motiveError}</div>
        )}
        {motives && (
          <div className="space-y-4 mt-4">
            {motives.rote_flaggen?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-700 mb-2">🚩 Rote Flaggen</p>
                {motives.rote_flaggen.map((f, i) => <p key={i} className="text-xs text-red-600">• {f}</p>)}
              </div>
            )}

            {motives.timing_analyse && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">⏰ Warum JETZT?</p>
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3">{motives.timing_analyse}</p>
              </div>
            )}

            {motives.fristen_hintergedanken && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">📅 Fristen-Hintergedanken</p>
                <p className="text-sm text-gray-700 bg-orange-50 border border-orange-100 rounded-xl p-3 flex gap-2"><Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />{motives.fristen_hintergedanken}</p>
              </div>
            )}

            {motives.verdeckte_ziele?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🎭 Verdeckte Ziele</p>
                <div className="space-y-1">
                  {motives.verdeckte_ziele.map((z, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-purple-500 flex-shrink-0">→</span>{z}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {motives.psychologische_taktiken?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🧠 Psychologische Taktiken</p>
                <div className="space-y-2">
                  {motives.psychologische_taktiken.map((t, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800">{t.taktik}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${t.intensitaet === "hoch" ? "bg-red-100 text-red-600" : t.intensitaet === "mittel" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>{t.intensitaet}</span>
                      </div>
                      <p className="text-xs text-gray-500">{t.beweis}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {motives.naechster_schritt_gegner && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">🔮 Nächster Schritt des Gegners</p>
                <p className="text-sm text-gray-700 bg-slate-50 border border-slate-200 rounded-xl p-3">{motives.naechster_schritt_gegner}</p>
              </div>
            )}

            {motives.empfohlene_reaktion && (
              <div className="bg-green-900 text-white rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-green-300">✅ Empfohlene Reaktion</p>
                <p className="text-sm">{motives.empfohlene_reaktion}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
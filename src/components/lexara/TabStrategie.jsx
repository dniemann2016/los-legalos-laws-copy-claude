import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ArgumentEvidenceGraph from "./ArgumentEvidenceGraph";
import WasWaereWennSimulation from "./WasWaereWennSimulation";
import TimelineVisualization from "./TimelineVisualization";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useKIProtokoll } from "@/hooks/useKIProtokoll";

function PrognoseCircle({ value }) {
  const r = 42, circ = 2 * Math.PI * r, offset = circ - (value/100)*circ;
  const color = value>=60?"#16a34a":value>=40?"#d97706":"#dc2626";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" style={{transform:"rotate(-90deg)"}}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5"/>
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-bold text-gray-900">{Math.round(value)}%</div>
        <div className="text-[10px] text-gray-400">Prognose</div>
      </div>
    </div>
  );
}

export default function TabStrategie({ caseId, caseData, onUpdate, kiMode = true, activeSub = 0 }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [persons, setPersons] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [gegnerVerhalten, setGegnerVerhalten] = useState([]);
  const [sortMode, setSortMode] = useState("staerke");
  const [prognose, setPrognose] = useState(caseData?.prognose || 0);
  const [algorithm, setAlgorithm] = useState({});
  const [saving, setSaving] = useState(false);
  const [chartView, setChartView] = useState("overlap");
  const [showTacticalInfo, setShowTacticalInfo] = useState(false);
  const [kiPrognose, setKiPrognose] = useState(null);
  const [kiPrognoseLoading, setKiPrognoseLoading] = useState(false);
  // activeSub: 0=strategie, 1=simulation, 2=timeline
  const activeView = activeSub === 1 ? "simulation" : activeSub === 2 ? "timeline" : "strategie";
  const { logKI } = useKIProtokoll(caseId);

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const [a,e,p,d,gv] = await Promise.all([base44.entities.Argument.filter({case_id:caseId}),base44.entities.Evidence.filter({case_id:caseId}),base44.entities.Person.filter({case_id:caseId}),base44.entities.Deadline.filter({case_id:caseId}),base44.entities.GegnerVerhalten.filter({case_id:caseId})]);
    setArgs(a); setEvidence(e); setPersons(p); setDeadlines(d); setGegnerVerhalten(gv);
    computePrognose(a, e, p, d);
  };

  const computePrognose = (a, e, p, d) => {
    const eigene = a.filter(x=>x.side==="eigen"), gegner = a.filter(x=>x.side==="gegner");
    const eigenStaerke = eigene.reduce((s,x)=>s+(x.strength||5),0), gegnerStaerke = gegner.reduce((s,x)=>s+(x.strength||5),0);
    const argBasis = (eigene.length>0||gegner.length>0) ? Math.max(0, ((eigenStaerke/Math.max(1,eigene.length))-(gegnerStaerke/Math.max(1,gegner.length)))*5+50) : 50;
    const avgEvidW = e.length>0 ? e.reduce((s,x)=>s+(x.weight||5),0)/e.length : 5;
    const beweisBoost = 1+(avgEvidW/10)*0.5;
    const contradictions = a.filter(x=>x.is_contradiction).length;
    const kantenEffekt = Math.max(0.2, 1-contradictions*0.2);
    const judges = p.filter(x=>x.role==="Richter");
    const avgGlaubw = judges.length>0 ? judges.reduce((s,x)=>s+(x.glaubwuerdigkeit||80),0)/judges.length : 80;
    const zeugenMult = 0.70+(avgGlaubw/100)*0.30;
    const richterRate = judges[0]?.klaeger_rate || caseData?.richter_klaeger_rate || 50;
    const richterAdj = 1+(richterRate-50)/100*0.15;
    const versaeumt = d.filter(x=>x.status==="versaeumt").length;
    const fristenFaktor = Math.max(0.5, 1-versaeumt*0.30);
    const raw = argBasis*beweisBoost*kantenEffekt*zeugenMult*richterAdj*fristenFaktor;
    const final = Math.min(99, Math.max(1, Math.round(raw)));
    setAlgorithm({argBasis:Math.round(argBasis),beweisBoost:Math.round((beweisBoost-1)*100),kantenEffekt:Math.round(kantenEffekt*100)+"%",zeugenMult:Math.round(zeugenMult*100)+"%",richterAdj:Math.round(richterAdj*100)+"%",fristenFaktor:Math.round(fristenFaktor*100)+"%"});
    if (kiMode) setPrognose(final);
  };

  const runKiPrognose = async () => {
    setKiPrognoseLoading(true);
    setKiPrognose(null);
    const eigenA = args.filter(a=>a.side==="eigen");
    const gegnerA = args.filter(a=>a.side==="gegner");

    const inputSummary = `Fall: ${caseData?.fallname||""} | Rechtsgebiet: ${caseData?.rechtsgebiet||""} | Instanz: ${caseData?.instanz||""} | Zentrale Frage: ${caseData?.zentrale_rechtsfrage||""} | Eigene Argumente: ${eigenA.length} | Gegnerargumente: ${gegnerA.length} | Beweise: ${evidence.length} | Fristen: ${deadlines.length}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Prozessanwalt auf Senior-Partner-Niveau und sprichst direkt wie ein Anwalt — nicht im Gutachterstil. Gib klare Einschätzungen, konkrete Empfehlungen und belege sie mit den relevanten §§ und BGH/BVerfG-Urteilen. Keine Einleitungen wie 'Zunächst ist zu prüfen'. Direkt auf den Punkt.

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""} | Instanz: ${caseData?.instanz || ""}
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}

EIGENE ARGUMENTE:
${eigenA.map(a=>`- ${a.title} (Stärke: ${a.strength||5}/10): ${a.description||""}`).join("\n") || "Keine"}

GEGNERARGUMENTE:
${gegnerA.map(a=>`- ${a.title} (Stärke: ${a.strength||5}/10): ${a.description||""}`).join("\n") || "Keine"}

BEWEISE: ${evidence.slice(0,10).map(e=>`${e.title} (${e.type||""}, ${e.weight||5}/10)`).join(", ") || "Keine"}
FRISTEN: ${deadlines.length} gesamt, ${deadlines.filter(d=>d.status==="versaeumt").length} versäumt
Richter-Klägerquote: ${caseData?.richter_klaeger_rate || 50}%

Deine anwaltliche Analyse muss enthalten:
1. ERFOLGSWAHRSCHEINLICHKEIT: Klare Zahl mit kurzer anwaltlicher Begründung — welche §§ und welche BGH-Rspr. stützen oder gefährden unsere Position.
2. DIE 3 STÄRKSTEN GEGENARGUMENTE der Gegenseite — mit der konkreten Norm auf die sich der Gegner stützen wird und dem Gefahrengrad (hoch/mittel/niedrig).
3. DIE 2 KRITISCHSTEN SCHWACHSTELLEN unserer Position — direkte Aussage: "Hier liegt das Problem, weil §X uns nicht schützt / das Tatbestandsmerkmal fehlt."
4. STRATEGISCHE GESAMTEMPFEHLUNG: Klare Aussage: Klagen, Vergleich anstreben oder aufgeben — mit anwaltlicher Begründung und Normbezug.
5. JURISTISCHE GEGENMASSSNAHMEN: Alle prozessualen und materiell-rechtlichen Mittel zur Stärkung unserer Position (z.B. Widerklage § 33 ZPO, einstweilige Verfügung §§ 935 ff. ZPO, Prozesskostensicherheit § 110 ZPO, Befangenheitsantrag § 42 ZPO, Streitverkündung § 72 ZPO, Aufrechnung § 387 BGB). Für jede Maßnahme: Rechtsgrundlage + konkretes Ziel.`,
      response_json_schema: {
        type: "object",
        properties: {
          erfolgswahrscheinlichkeit: { type: "number", minimum: 0, maximum: 100 },
          begruendung: { type: "string" },
          staerkste_gegenargumente: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                gefahr: { type: "string" },
                schwere: { type: "string" }
              }
            }
          },
          kritische_schwachstellen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                beschreibung: { type: "string" }
              }
            }
          },
          strategische_empfehlung: { type: "string" },
          gegenmassnahmen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                massnahme: { type: "string" },
                ziel: { type: "string" },
                rechtsgrundlage: { type: "string" },
                aggressivitaet: { type: "string" }
              }
            }
          }
        }
      },
      model: "claude_sonnet_4_6"
    });

    setKiPrognose(result);

    // Protokollieren
    await logKI({
      kiName: "KI-Urteilsprognose & Strategie",
      eingabe: inputSummary,
      ausgabe: result,
      modell: "claude_sonnet_4_6"
    });

    setKiPrognoseLoading(false);
  };

  const savePrognose = async () => {
    setSaving(true);
    const updated = await base44.entities.Case.update(caseId, { prognose });
    onUpdate(updated);
    setSaving(false);
  };

  const eigenArgs = args.filter(a=>a.side==="eigen"), gegnerArgs = args.filter(a=>a.side==="gegner");
  const sortArgs = (list) => { if(sortMode==="staerke") return [...list].sort((a,b)=>(b.strength||0)-(a.strength||0)); return list; };
  const recommendation = prognose>=55?"Streitiges Verfahren — Vollsieg anstreben":prognose>=40?"Vergleich anstreben":"Risiken abwägen — Aufgabe prüfen";
  const recTag = prognose>=55?"Klage":prognose>=40?"Vergleich":"Aufgabe";

  const maxLen = Math.max(eigenArgs.length, gegnerArgs.length, 1);
  const overlapData = Array.from({length: maxLen}, (_,i) => ({
    name: `Arg ${i+1}`,
    Eigene: eigenArgs[i] ? (eigenArgs[i].strength||5)*10 : null,
    Gegner: gegnerArgs[i] ? (gegnerArgs[i].strength||5)*10 : null,
  }));

  const evidenceData = args.slice(0,8).map(a => ({
    name: a.title?.slice(0,12) || "?",
    Stärke: (a.strength||5)*10,
    Beweise: evidence.filter(e=>e.argument_id===a.id).reduce((s,e)=>s+(e.weight||5),0)*10 || 10,
  }));

  const radarData = [
    {subject: "Argumente", Eigen: eigenArgs.length>0?Math.round(eigenArgs.reduce((s,a)=>s+(a.strength||5),0)/eigenArgs.length*10):0, Gegner: gegnerArgs.length>0?Math.round(gegnerArgs.reduce((s,a)=>s+(a.strength||5),0)/gegnerArgs.length*10):0},
    {subject: "Beweise", Eigen: evidence.filter(e=>eigenArgs.find(a=>a.id===e.argument_id)).length*15, Gegner: evidence.filter(e=>gegnerArgs.find(a=>a.id===e.argument_id)).length*15},
    {subject: "Prognose", Eigen: prognose, Gegner: 100-prognose},
    {subject: "Richter", Eigen: caseData?.richter_klaeger_rate||50, Gegner: 100-(caseData?.richter_klaeger_rate||50)},
    {subject: "Fristen", Eigen: Math.max(0,100-deadlines.filter(d=>d.status==="versaeumt").length*30), Gegner: deadlines.filter(d=>d.status==="versaeumt").length*30},
    {subject: "Personen", Eigen: persons.filter(p=>p.side!=="Gegner").length*20, Gegner: persons.filter(p=>p.role==="Zeuge"||p.role==="Gutachter").length*15},
  ].map(d=>({...d, Eigen: Math.min(100,d.Eigen||0), Gegner: Math.min(100,d.Gegner||0)}));

  return (
    <div className="space-y-6">
      {activeView === "simulation" && (
        <WasWaereWennSimulation
          args={args}
          evidence={evidence}
          deadlines={deadlines}
          persons={persons}
          caseData={caseData}
          basePrognose={prognose}
        />
      )}

      {activeView === "timeline" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Zeitstrahl — Fristen & Ereignisse</h3>
          <TimelineVisualization caseId={caseId} args={args} />
        </div>
      )}

      {activeView === "strategie" && !kiMode && (
        <div className="rounded-lg p-3 flex items-center gap-3" style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)" }}>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "#555" }}>Manuell-Modus aktiv — KI-Funktionen deaktiviert</p>
            <p className="text-xs" style={{ color: "#888", marginTop: 2 }}>Alle Prognose-Werte können manuell eingestellt werden.</p>
          </div>
        </div>
      )}

      {activeView === "strategie" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Gesamtprognose — {caseData?.fallname}</p>
            {!kiMode && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="text-xs text-amber-700 font-medium block mb-1">Prognose manuell einstellen (%)</label>
                <input type="number" min={1} max={99} step={1} className="border border-amber-300 rounded-lg px-3 py-1.5 text-sm w-32 bg-white" value={prognose} onChange={e => setPrognose(Math.min(99, Math.max(1, +e.target.value)))} />
              </div>
            )}
            <div className="flex items-start gap-6">
              <PrognoseCircle value={prognose} />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-700">{recommendation}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: prognose>=55?"#34C759":prognose>=40?"#FF9500":"#FF3B30", color: "#fff" }}>{recTag}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Berechnung auf Basis von {args.length} Argumenten, {evidence.length} Beweisstücken, {persons.length} Personen, {deadlines.length} Fristen.</p>
                <Button onClick={savePrognose} disabled={saving} className="mt-3 bg-gray-900 text-white rounded-xl text-xs px-4 py-2 h-auto">
                  {saving?"Speichern...": "Prognose speichern"}
                </Button>
              </div>
            </div>
          </div>

          {/* KI-Urteilsprognose & Gegenargumente */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">KI-Urteilsprognose & Gegenargumente</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Ganzheitliche KI-Analyse des gesamten Falls · Erfolgswahrscheinlichkeit + kritische Gegenargumente</p>
              </div>
              <Button onClick={runKiPrognose} disabled={kiPrognoseLoading}
                className="text-white rounded-lg text-xs" style={{ background: "#34C759", border: "none" }}>
                {kiPrognoseLoading ? "Analysiere…" : "KI-Analyse starten"}
              </Button>
            </div>
            {!kiPrognose && !kiPrognoseLoading && (
              <div className="text-center py-8" style={{ color: "#bbb" }}>
                <p className="text-sm">Noch keine KI-Analyse durchgeführt.</p>
                <p className="text-xs mt-1">Klicken Sie auf „KI-Analyse starten" für eine vollständige Fallbewertung.</p>
              </div>
            )}
            {kiPrognoseLoading && (
              <div className="text-center py-8" style={{ color: "#888" }}>
                <div className="inline-block w-5 h-5 border-2 rounded-full animate-spin mb-2" style={{ borderColor: "rgba(52,199,89,0.2)", borderTopColor: "#34C759" }} />
                <p className="text-xs">KI analysiert den gesamten Fall…</p>
              </div>
            )}
            {kiPrognose && (
              <div className="space-y-4">
                <div className="flex items-start gap-5">
                  <div className="relative flex-shrink-0" style={{width:80,height:80}}>
                    <svg width="80" height="80" style={{transform:"rotate(-90deg)"}}>
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="5"/>
                      <circle cx="40" cy="40" r="32" fill="none"
                        stroke={(kiPrognose.erfolgswahrscheinlichkeit||0)>=60?"#16a34a":(kiPrognose.erfolgswahrscheinlichkeit||0)>=40?"#d97706":"#dc2626"}
                        strokeWidth="5"
                        strokeDasharray={2*Math.PI*32}
                        strokeDashoffset={2*Math.PI*32*(1-(kiPrognose.erfolgswahrscheinlichkeit||0)/100)}
                        strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-black text-gray-900">{Math.round(kiPrognose.erfolgswahrscheinlichkeit||0)}%</span>
                      <span className="text-[9px] text-gray-400">KI</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${(kiPrognose.erfolgswahrscheinlichkeit||0)>=60?"text-green-700":(kiPrognose.erfolgswahrscheinlichkeit||0)>=40?"text-amber-700":"text-red-700"}`}>
                      {(kiPrognose.erfolgswahrscheinlichkeit||0)>=60?"Günstige Prozesslage":(kiPrognose.erfolgswahrscheinlichkeit||0)>=40?"Ausgeglichene Lage":"Kritische Prozesslage"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{kiPrognose.begruendung}</p>
                  </div>
                </div>

                {(kiPrognose.staerkste_gegenargumente||[]).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-2">Stärkste Gegenargumente der Gegenseite</p>
                    <div className="space-y-2">
                      {kiPrognose.staerkste_gegenargumente.map((g,i) => (
                        <div key={i} className={`rounded-xl border p-3 ${g.schwere==="hoch"?"bg-red-50 border-red-200":g.schwere==="mittel"?"bg-amber-50 border-amber-200":"bg-gray-50 border-gray-200"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${g.schwere==="hoch"?"bg-red-200 text-red-800":g.schwere==="mittel"?"bg-amber-200 text-amber-800":"bg-gray-200 text-gray-600"}`}>{g.schwere}</span>
                            <span className="text-xs font-semibold text-gray-800">{g.titel}</span>
                          </div>
                          <p className="text-[11px] text-gray-600">{g.gefahr}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(kiPrognose.kritische_schwachstellen||[]).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-2">Kritische Schwachstellen unserer Position</p>
                    <div className="space-y-2">
                      {kiPrognose.kritische_schwachstellen.map((s,i) => (
                        <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-amber-800">{s.titel}</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">{s.beschreibung}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {kiPrognose.strategische_empfehlung && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Strategische Empfehlung</p>
                    <p className="text-xs text-blue-700">{kiPrognose.strategische_empfehlung}</p>
                  </div>
                )}

                {(kiPrognose.gegenmassnahmen||[]).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-900 mb-2">Aggressive Gegenmaßnahmen — Juristische Angriffstaktiken</p>
                    <p className="text-[10px] text-gray-400 mb-3">Alle juristischen Mittel zur Schwächung, Ablenkung und Druckausübung auf die Gegenseite</p>
                    <div className="space-y-2">
                      {kiPrognose.gegenmassnahmen.map((g, i) => {
                        const agColor = g.aggressivitaet === "sehr hoch" ? "bg-red-50 border-red-200" : g.aggressivitaet === "hoch" ? "bg-orange-50 border-orange-200" : g.aggressivitaet === "mittel" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200";
                        const tagColor = g.aggressivitaet === "sehr hoch" ? "bg-red-200 text-red-800" : g.aggressivitaet === "hoch" ? "bg-orange-200 text-orange-800" : g.aggressivitaet === "mittel" ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-600";
                        return (
                          <div key={i} className={`rounded-xl border p-3 ${agColor}`}>
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-bold text-gray-900 flex-1">{g.massnahme}</p>
                              {g.aggressivitaet && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${tagColor}`}>{g.aggressivitaet}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-700 mb-1"><span className="font-semibold">Ziel:</span> {g.ziel}</p>
                            {g.rechtsgrundlage && (
                              <p className="text-[10px] text-gray-500"><span className="font-semibold">Rechtsgrundlage:</span> {g.rechtsgrundlage}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prozessstärke-Gesamtscore */}
          {(() => {
            const eigenArgs = args.filter(a=>a.side==="eigen"), gegnerArgs = args.filter(a=>a.side==="gegner");
            const eigenStaerke = eigenArgs.length ? eigenArgs.reduce((s,a)=>s+(a.strength||5),0)/eigenArgs.length : 5;
            const gegnerStaerke = gegnerArgs.length ? gegnerArgs.reduce((s,a)=>s+(a.strength||5),0)/gegnerArgs.length : 5;
            const argScore = Math.min(100, Math.max(0, (eigenStaerke - gegnerStaerke) * 5 + 50));
            const beweisScore = evidence.length > 0 ? Math.min(100, evidence.reduce((s,e)=>s+(e.weight||5),0)/evidence.length*10) : 50;
            const versaeumtCount = deadlines.filter(d=>d.status==="versaeumt").length;
            const ueberfaellig = deadlines.filter(d=>d.status==="offen" && d.due_date && new Date(d.due_date) < new Date()).length;
            const fristenScore = Math.max(0, 100 - versaeumtCount*25 - ueberfaellig*10);
            const gvSum = gegnerVerhalten.reduce((s,g)=>s+(g.auswirkung_prognose||0),0);
            const gegnerScore = Math.min(100, Math.max(0, 50 + gvSum));
            const richterScore = caseData?.richter_klaeger_rate || 50;
            const gesamtScore = Math.round(argScore*0.30 + beweisScore*0.20 + fristenScore*0.20 + gegnerScore*0.15 + richterScore*0.15);
            const scoreColor = gesamtScore>=60?"text-green-700 bg-green-50 border-green-200":gesamtScore>=40?"text-amber-700 bg-amber-50 border-amber-200":"text-red-700 bg-red-50 border-red-200";
            const faktoren = [
              {label:"Argumente-Balance",score:Math.round(argScore),gewicht:"30%",desc:`Ø ${eigenStaerke.toFixed(1)} eigen vs. ${gegnerStaerke.toFixed(1)} gegner`},
              {label:"Beweislage",score:Math.round(beweisScore),gewicht:"20%",desc:`${evidence.length} Beweise · Ø-Gewicht ${evidence.length?Math.round(evidence.reduce((s,e)=>s+(e.weight||5),0)/evidence.length*10)/10:"–"}/10`},
              {label:"Fristen-Risiko",score:fristenScore,gewicht:"20%",desc:`${versaeumtCount} versäumt · ${ueberfaellig} überfällig`},
              {label:"Gegnerverhalten",score:Math.round(gegnerScore),gewicht:"15%",desc:`${gegnerVerhalten.length} Einträge · Σ Auswirkung: ${gvSum>0?"+":""}${gvSum}%`},
              {label:"Richter-Profil",score:richterScore,gewicht:"15%",desc:`Klägerquote ${richterScore}%`},
            ];
            return (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Prozessstärke-Gesamtscore (Algorithmus)</h3>
                <p className="text-[10px] text-gray-400 mb-4">Rein algorithmisch · keine KI · gewichtete Faktoren</p>
                <div className="flex items-center gap-5 mb-5">
                  <div className={`text-3xl font-black px-5 py-3 rounded-2xl border-2 ${scoreColor}`}>{gesamtScore}<span className="text-base font-medium">/100</span></div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{gesamtScore>=60?"Starke Prozessposition":gesamtScore>=40?"Ausgeglichene Lage":"Kritische Prozesslage"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{gesamtScore>=60?"Vollsieg anstreben — klarer Vorteil":gesamtScore>=40?"Vergleich prüfen — Balance der Kräfte":"Risiken abwägen — strukturelle Schwächen"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {faktoren.map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-36 flex-shrink-0">{f.label}</span>
                      <span className="text-[10px] text-gray-300 w-7 flex-shrink-0">{f.gewicht}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${f.score>=60?"bg-green-500":f.score>=40?"bg-amber-400":"bg-red-400"}`} style={{width:`${f.score}%`}} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-7 text-right">{f.score}</span>
                      <span className="text-[10px] text-gray-400 w-44 text-right hidden md:block">{f.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">6-Stufen-Algorithmus (vollständig einsehbar)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[["Stufe 1","Argument-Basisgewichtung",algorithm.argBasis||0,`${args.filter(a=>a.side==="eigen").length} eigene vs. ${args.filter(a=>a.side==="gegner").length} gegnerische Argumente`],["Stufe 2","Beweisboost",`+${algorithm.beweisBoost||0}%`,"Kettenergebnis × 0.5 Boost-Faktor"],["Stufe 3","Kanteneffekte",algorithm.kantenEffekt||"100%","Widersprüche und Ausschluss-Kanten"],["Stufe 4","Zeugenmultiplikator",algorithm.zeugenMult||"100%","Mult = 0.70 + (Glaubwürdigkeit/100) × 0.30"],["Stufe 5","Richter-Kalibrierung",algorithm.richterAdj||"100%",`Klägerquote: ${caseData?.richter_klaeger_rate||50}%`],["Stufe 6","Fristenkorrektur",algorithm.fristenFaktor||"100%",`${deadlines.filter(d=>d.status==="versaeumt").length} versäumte Fristen`]].map(([step,title,val,desc]) => (
                <div key={step} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-0.5">{step}</p>
                  <div className="flex items-baseline justify-between"><p className="text-xs font-semibold text-gray-700">{title}</p><span className="text-base font-bold text-gray-900">{val}</span></div>
                  <p className="text-[10px] text-gray-400 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-700">Datenvisualisierung</h3>
              <div className="flex gap-1 flex-wrap">
                {[["overlap","Überlappend"],["bar","Balken"],["radar","Radar"],["evidence","Beweise"]].map(([v,l]) => (
                  <button key={v} onClick={()=>setChartView(v)} className={`text-xs px-3 py-1 rounded-lg border transition-all ${chartView===v?"bg-gray-900 text-white border-gray-900":"text-gray-500 border-gray-200 hover:bg-gray-50"}`}>{l}</button>
                ))}
              </div>
            </div>
            {chartView==="overlap" && (<div><div className="flex items-center gap-4 mb-2"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-600" /><span className="text-xs text-gray-500">Eigene Argumente</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-gray-500">Gegnerische Argumente</span></div></div><ResponsiveContainer width="100%" height={200}><LineChart data={overlapData}><XAxis dataKey="name" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} domain={[0,100]} /><Tooltip formatter={(v,n)=>[`${v}%`,n]} /><Legend wrapperStyle={{fontSize:11}} /><Line type="monotone" dataKey="Eigene" stroke="#16a34a" strokeWidth={2.5} dot={{r:4,fill:"#16a34a"}} connectNulls /><Line type="monotone" dataKey="Gegner" stroke="#dc2626" strokeWidth={2.5} dot={{r:4,fill:"#dc2626"}} connectNulls /></LineChart></ResponsiveContainer><p className="text-[10px] text-gray-400 mt-1 text-center">Stärke je Argument (0–100) — Eigene vs. Gegner überlappend</p></div>)}
            {chartView==="bar" && (<div><ResponsiveContainer width="100%" height={220}><BarChart data={overlapData} barGap={4}><XAxis dataKey="name" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} domain={[0,100]} /><Tooltip formatter={(v,n)=>[`${v}%`,n]} /><Legend wrapperStyle={{fontSize:11}} /><Bar dataKey="Eigene" fill="#16a34a" radius={[4,4,0,0]} /><Bar dataKey="Gegner" fill="#dc2626" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer><p className="text-[10px] text-gray-400 mt-1 text-center">Balkenvergleich Argumentstärke — Eigene vs. Gegner</p></div>)}
            {chartView==="radar" && (<div><div className="flex items-center gap-4 mb-2"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-600" /><span className="text-xs text-gray-500">Eigene Position</span></div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-gray-500">Gegnerposition</span></div></div><ResponsiveContainer width="100%" height={260}><RadarChart data={radarData}><PolarGrid stroke="#f3f4f6" /><PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:"#6b7280"}} /><Radar dataKey="Eigen" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} strokeWidth={2} /><Radar dataKey="Gegner" stroke="#dc2626" fill="#dc2626" fillOpacity={0.15} strokeWidth={2} /></RadarChart></ResponsiveContainer><p className="text-[10px] text-gray-400 mt-1 text-center">Alle Faktoren: Argumente · Beweise · Prognose · Richter · Fristen · Personen</p></div>)}
            {chartView==="evidence" && (<div><ResponsiveContainer width="100%" height={220}><BarChart data={evidenceData} barGap={4}><XAxis dataKey="name" tick={{fontSize:9}} /><YAxis tick={{fontSize:10}} domain={[0,100]} /><Tooltip formatter={(v,n)=>[`${Math.round(v/10)}/10`,n]} /><Legend wrapperStyle={{fontSize:11}} /><Bar dataKey="Stärke" fill="#1d4ed8" radius={[4,4,0,0]} /><Bar dataKey="Beweise" fill="#7c3aed" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer><p className="text-[10px] text-gray-400 mt-1 text-center">Argumentstärke vs. Beweisstärke je Argument</p></div>)}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Beweisketten-Graph</h3>
            <ArgumentEvidenceGraph args={args} evidence={evidence} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Sortierung</h3>
              <div className="flex gap-2">
                {[["chrono","Chronologisch"],["staerke","Stärke"],["manuell","Manuell"]].map(([m,l]) => (
                  <button key={m} onClick={()=>setSortMode(m)} className={`text-xs px-3 py-1 rounded-lg ${sortMode===m?"bg-gray-900 text-white":"text-gray-500 hover:bg-gray-100"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[["Eigene Argumente",sortArgs(eigenArgs)],["Gegnerische Argumente",sortArgs(gegnerArgs)]].map(([label,list]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">{label} ({list.length})</p>
                  <div className="space-y-2">
                    {list.map(arg => (
                      <div key={arg.id} className="text-xs border-l-2 border-gray-200 pl-3 py-1">
                        <div className="flex items-center justify-between"><span className="font-medium text-gray-800 flex-1 pr-2">{arg.title}</span><span className="text-gray-500">{arg.strength||5}/10</span></div>
                        {arg.description && <p className="text-gray-400 mt-0.5 line-clamp-2">{arg.description}</p>}
                        {evidence.filter(e=>e.argument_id===arg.id).length > 0 && <span className="text-gray-400">· {evidence.filter(e=>e.argument_id===arg.id).length} Beweise</span>}
                      </div>
                    ))}
                    {list.length === 0 && <p className="text-gray-400 text-xs">Keine Argumente</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Taktisches Arsenal</h4>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Juristische Hebel</p>
              <div className="space-y-2">
                {eigenArgs.filter(a=>(a.strength||0)>=7).slice(0,3).map(a => (
                  <div key={a.id}><p className="text-xs font-medium text-gray-700">{a.title}</p>{(a.paragraphs||[]).slice(0,1).map(p=><p key={p} className="text-[10px] text-gray-400">{p}</p>)}</div>
                ))}
                {eigenArgs.filter(a=>(a.strength||0)>=7).length === 0 && <p className="text-xs text-gray-400">Keine starken Argumente ≥7/10</p>}
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-xs font-semibold text-gray-700">Taktische Einschätzung</h4>
                  <button onClick={() => setShowTacticalInfo(!showTacticalInfo)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>
                {showTacticalInfo && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 text-[10px] text-blue-800 space-y-1">
                    <p><strong>Historische Konsistenz:</strong> Prognose × 0,85 (bei Beweise vorhanden)</p>
                    <p><strong>Kompetenzniveau:</strong> Prognose × 0,75 (bei Personen erfasst)</p>
                    <p><strong>Interessenkonflikt:</strong> max(20, Prognose − 15) (bei Richter-Daten vorhanden)</p>
                    <p><strong>Verborgene Motive:</strong> max(15, Prognose − 20) (bei Gegner-Argumente)</p>
                    <p><strong>Selbstschutz:</strong> Prognose × 0,60 (bei eigene Argumente)</p>
                    <p><strong>Angstfaktor:</strong> Prognose × 0,70 (bei Gegner-Strategie erkannt)</p>
                  </div>
                )}
                <div className="space-y-2">
                  {[
                    ["Historische Konsistenz", evidence.length > 0 ? Math.round(prognose*0.85) : "unbekannt"],
                    ["Kompetenzniveau", persons.length > 0 ? Math.round(prognose*0.75) : "unbekannt"],
                    ["Interessenkonflikt", caseData?.richter_klaeger_rate ? Math.round(Math.max(20,prognose-15)) : "unbekannt"],
                    ["Verborgene Motive", gegnerArgs.length > 0 ? Math.round(Math.max(15,prognose-20)) : "unbekannt"],
                    ["Selbstschutz", eigenArgs.length > 0 ? Math.round(prognose*0.60) : "unbekannt"],
                    ["Angstfaktor", gegnerArgs.length > 0 ? Math.round(prognose*0.70) : "unbekannt"]
                  ].map(([l,v]) => (
                    <div key={l} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-40">{l}</span>
                      {typeof v === "number" ? (
                        <><div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-700 rounded-full" style={{width:`${v}%`}} /></div><span className="text-xs text-gray-600 w-6">{v}</span></>
                      ) : (
                        <span className="text-xs text-gray-400 italic flex-1">— {v}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
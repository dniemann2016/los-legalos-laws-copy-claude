import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ArgumentEvidenceGraph from "./ArgumentEvidenceGraph";
import WasWaereWennSimulation from "./WasWaereWennSimulation";
import TimelineVisualization from "./TimelineVisualization";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

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

export default function TabStrategie({ caseId, caseData, onUpdate, kiMode = true }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [persons, setPersons] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [sortMode, setSortMode] = useState("staerke");
  const [prognose, setPrognose] = useState(caseData?.prognose || 0);
  const [algorithm, setAlgorithm] = useState({});
  const [saving, setSaving] = useState(false);
  const [chartView, setChartView] = useState("overlap");
  const [showTacticalInfo, setShowTacticalInfo] = useState(false);
  const [activeView, setActiveView] = useState("strategie");

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const [a,e,p,d] = await Promise.all([base44.entities.Argument.filter({case_id:caseId}),base44.entities.Evidence.filter({case_id:caseId}),base44.entities.Person.filter({case_id:caseId}),base44.entities.Deadline.filter({case_id:caseId})]);
    setArgs(a); setEvidence(e); setPersons(p); setDeadlines(d);
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
      {/* View Switcher */}
      <div className="flex gap-2">
        {[["strategie","📊 Strategie & Graph"],["simulation","🔮 Was-wäre-wenn"],["timeline","📅 Zeitstrahl"]].map(([v,l]) => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`text-sm px-4 py-2 rounded-xl border font-medium transition-all ${activeView===v?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
            {l}
          </button>
        ))}
      </div>

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
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📅 Zeitstrahl — Fristen & Ereignisse</h3>
          <TimelineVisualization caseId={caseId} args={args} />
        </div>
      )}

      {activeView === "strategie" && !kiMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-lg">✏️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Manuell-Modus aktiv — KI-Funktionen deaktiviert</p>
            <p className="text-xs text-amber-600">Alle Prognose-Werte können manuell eingestellt werden. Wechsle zu KI-Modus für automatische Berechnungen.</p>
          </div>
        </div>
      )}

      {activeView === "strategie" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">GESAMTPROGNOSE — {caseData?.fallname?.toUpperCase()}</p>
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
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${prognose>=55?"bg-green-600 text-white":prognose>=40?"bg-yellow-500 text-white":"bg-red-600 text-white"}`}>⚖️ {recTag}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Berechnung auf Basis von {args.length} Argumenten, {evidence.length} Beweisstücken, {persons.length} Personen, {deadlines.length} Fristen.</p>
                <Button onClick={savePrognose} disabled={saving} className="mt-3 bg-gray-900 text-white rounded-xl text-xs px-4 py-2 h-auto">
                  {saving?"Speichern...": "Prognose speichern"}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 6-Stufen-Algorithmus (vollständig einsehbar)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[["Stufe 1","Argument-Basisgewichtung",algorithm.argBasis||0,`${eigenArgs.length} eigene vs. ${gegnerArgs.length} gegnerische Argumente`],["Stufe 2","Beweisboost",`+${algorithm.beweisBoost||0}%`,"Kettenergebnis × 0.5 Boost-Faktor"],["Stufe 3","Kanteneffekte",algorithm.kantenEffekt||"100%","Widersprüche und Ausschluss-Kanten"],["Stufe 4","Zeugenmultiplikator",algorithm.zeugenMult||"100%","Mult = 0.70 + (Glaubwürdigkeit/100) × 0.30"],["Stufe 5","Richter-Kalibrierung",algorithm.richterAdj||"100%",`Klägerquote: ${caseData?.richter_klaeger_rate||50}%`],["Stufe 6","Fristenkorrektur",algorithm.fristenFaktor||"100%",`${deadlines.filter(d=>d.status==="versaeumt").length} versäumte Fristen`]].map(([step,title,val,desc]) => (
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
              <h3 className="text-sm font-semibold text-gray-700">📊 Datenvisualisierung</h3>
              <div className="flex gap-1 flex-wrap">
                {[["overlap","↔ Überlappend"],["bar","▦ Balken"],["radar","🕸 Radar"],["evidence","🔍 Beweise"]].map(([v,l]) => (
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
            <h3 className="text-sm font-semibold text-gray-700 mb-4">🔗 Beweisketten-Graph</h3>
            <ArgumentEvidenceGraph args={args} evidence={evidence} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">SORTIERUNG</h3>
              <div className="flex gap-2">
                {[["chrono","⏰ Chronologisch"],["staerke","💪 Stärke"],["manuell","🔢 Manuell"]].map(([m,l]) => (
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
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">JURISTISCHE HEBEL</p>
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
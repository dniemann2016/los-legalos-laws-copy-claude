import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import TabBasisdaten from "../components/lexara/TabBasisdaten";
import TabArgumente from "../components/lexara/TabArgumente";
import TabBeweise from "../components/lexara/TabBeweise";
import TabVerkettung from "../components/lexara/TabVerkettung";
import TabPersonen from "../components/lexara/TabPersonen";
import TabFristen from "../components/lexara/TabFristen";
import TabStrategie from "../components/lexara/TabStrategie";
import TabKIBerater from "../components/lexara/TabKIBerater";
import TabAnalyse from "../components/lexara/TabAnalyse";
import TabDokumente from "../components/lexara/TabDokumente";
import TabGesamtbewertung from "../components/lexara/TabGesamtbewertung";
import TabVerhandlung from "../components/lexara/TabVerhandlung";
import TabRisiko from "../components/lexara/TabRisiko";
import TabSchriftsatz from "../components/lexara/TabSchriftsatz";
import TabCockpit from "../components/lexara/TabCockpit";
import TabVerhandlungssimulation from "../components/lexara/TabVerhandlungssimulation";
import { exportCasePDF } from "@/functions/exportCasePDF";

const TABS = [
  {id:1,label:"Basisdaten"},{id:2,label:"Argumente"},{id:3,label:"Beweise"},
  {id:4,label:"Verkettung"},{id:5,label:"Personen"},{id:6,label:"Fristen"},
  {id:7,label:"Strategie"},{id:8,label:"KI-Berater"},{id:9,label:"Analyse"},{id:10,label:"Risiken"},{id:11,label:"Simulation"},{id:12,label:"Dokumente"},{id:13,label:"Gesamtbewertung"},{id:14,label:"Verhandlung"},{id:15,label:"Schriftsatz"},{id:16,label:"Cockpit"},
];

function PrognoseCircle({ value = 0 }) {
  const r = 18, circ = 2 * Math.PI * r, offset = circ - (value/100)*circ;
  return (
    <svg width="46" height="46" style={{transform:"rotate(-90deg)"}}>
      <circle cx="23" cy="23" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3"/>
      <circle cx="23" cy="23" r={r} fill="none" stroke="#1f2937" strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      <text x="23" y="23" dominantBaseline="central" textAnchor="middle"
        style={{transform:"rotate(90deg)",transformOrigin:"23px 23px",fontSize:10,fontWeight:700,fill:"#111827"}}>
        {Math.round(value)}
      </text>
    </svg>
  );
}

export default function CaseDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseId = urlParams.get("id");
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(1);
  const [caseData, setCaseData] = useState(null);
  const [counts, setCounts] = useState({args:0,evidence:0,persons:0,deadlines:0});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    const [args, evs, pers, deadlines] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
    ]);

    const sections = [];

    // Case header
    sections.push("=== FALLDATEN ===");
    sections.push(`Fallname,${caseData.fallname||""}`);
    sections.push(`Aktenzeichen,${caseData.aktenzeichen||""}`);
    sections.push(`Gericht,${caseData.gericht||""}`);
    sections.push(`Rechtsgebiet,${caseData.rechtsgebiet||""}`);
    sections.push(`Status,${caseData.status||""}`);
    sections.push(`Prognose,${caseData.prognose||0}%`);
    sections.push(`Streitwert,${caseData.streitwert||""} EUR`);
    sections.push("");

    // Arguments
    sections.push("=== ARGUMENTE ===");
    sections.push("Titel,Seite,Typ,Stärke,Beschreibung");
    args.forEach(a => sections.push(`"${a.title||""}",${a.side||""}, ${a.type||""}, ${a.strength||5},"${(a.description||"").replace(/"/g,"'")}"`) );
    sections.push("");

    // Evidence
    sections.push("=== BEWEISE ===");
    sections.push("Titel,Typ,Gewicht,Quelle,Beschreibung");
    evs.forEach(e => sections.push(`"${e.title||""}","${e.type||""}",${e.weight||5},"${e.source||""}","${(e.description||"").replace(/"/g,"'")}"`));
    sections.push("");

    // Persons
    sections.push("=== PERSONEN ===");
    sections.push("Name,Rolle,Organisation,Glaubwürdigkeit %");
    pers.forEach(p => sections.push(`"${p.name||""}",${p.role||""},"${p.organization||""}",${p.glaubwuerdigkeit||""}`));
    sections.push("");

    // Deadlines
    sections.push("=== FRISTEN ===");
    sections.push("Titel,Fristtyp,Fälligkeitsdatum,Status,Seite");
    deadlines.forEach(d => sections.push(`"${d.title||""}","${d.frist_type||""}",${d.due_date||""},${d.status||""},${d.side||""}`));

    const csv = sections.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fallbericht_${caseData.fallname||caseId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    const response = await exportCasePDF({ caseId });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fallbericht_${caseData?.fallname || caseId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  useEffect(() => {
    if (!caseId) { navigate("/lexara"); return; }
    loadCase();
  }, [caseId]);

  const loadCase = async () => {
    setLoading(true);
    const [cs, args, evs, pers, deadlines] = await Promise.all([
      base44.entities.Case.filter({id:caseId}),
      base44.entities.Argument.filter({case_id:caseId}),
      base44.entities.Evidence.filter({case_id:caseId}),
      base44.entities.Person.filter({case_id:caseId}),
      base44.entities.Deadline.filter({case_id:caseId}),
    ]);
    setCaseData(cs[0]||null);
    setCounts({args:args.length,evidence:evs.length,persons:pers.length,deadlines:deadlines.length});
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"/></div>;
  if (!caseData) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Fall nicht gefunden.</p></div>;

  const completedTabs = [!!caseData.fallname,counts.args>0,counts.evidence>0,counts.args>1,counts.persons>0,counts.deadlines>0,!!caseData.prognose,!!caseData.ki_berater_result,!!caseData.streitwert,!!(caseData.ki_berater_result?.risiko_analyse),false,false,!!caseData.notes,false,false,false];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link to="/lexara" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> Fälle</Link>
            {caseData.aktenzeichen && <><span className="text-gray-300">·</span><span className="text-xs text-gray-400">{caseData.aktenzeichen}</span></>}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-900 text-base">{caseData.fallname}</h1>
              <button onClick={handleExportPDF} disabled={exporting}
                className="ml-2 flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                {exporting ? "..." : "↓ PDF"}
              </button>
              <button onClick={handleExportCSV} disabled={exporting}
                className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <div className="flex items-center gap-2">
              {caseData.rechtsgebiet && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{caseData.rechtsgebiet}</span>}
              {caseData.status && <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{caseData.status}</span>}
              <PrognoseCircle value={caseData.prognose||0}/>
            </div>
          </div>
          <div className="flex gap-0 mt-3 overflow-x-auto pb-px">
            {TABS.map((tab,i) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-all
                  ${activeTab===tab.id?"border-gray-900 text-gray-900":"border-transparent text-gray-400 hover:text-gray-600"}`}>
                {completedTabs[i] ? (
                  <span className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white"/></span>
                ) : (
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${activeTab===tab.id?"border-gray-900 text-gray-900":"border-gray-300 text-gray-400"}`}>{tab.id}</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-xs text-gray-400 mb-4">SCHRITT {activeTab} VON 14</p>
        {activeTab===1 && <TabBasisdaten caseId={caseId} caseData={caseData} onUpdate={d=>{setCaseData(d);}} />}
        {activeTab===2 && <TabArgumente caseId={caseId} caseData={caseData} onCountChange={loadCase} />}
        {activeTab===3 && <TabBeweise caseId={caseId} />}
        {activeTab===4 && <TabVerkettung caseId={caseId} />}
        {activeTab===5 && <TabPersonen caseId={caseId} onCountChange={loadCase} />}
        {activeTab===6 && <TabFristen caseId={caseId} onCountChange={loadCase} />}
        {activeTab===7 && <TabStrategie caseId={caseId} caseData={caseData} onUpdate={d=>{setCaseData(d);}} />}
        {activeTab===8 && <TabKIBerater caseId={caseId} caseData={caseData} onUpdate={d=>{setCaseData(d);}} />}
        {activeTab===9 && <TabAnalyse caseId={caseId} caseData={caseData} onUpdate={d=>{setCaseData(d);}} />}
        {activeTab===10 && <TabRisiko caseId={caseId} caseData={caseData} onUpdate={d=>{setCaseData(d);}} />}
        {activeTab===11 && <TabVerhandlungssimulation caseId={caseId} caseData={caseData} />}
        {activeTab===12 && <TabDokumente caseId={caseId} />}
        {activeTab===13 && <TabGesamtbewertung caseId={caseId} caseData={caseData} />}
        {activeTab===14 && <TabVerhandlung caseId={caseId} caseData={caseData} />}
        {activeTab===15 && <TabSchriftsatz caseId={caseId} caseData={caseData} />}
        {activeTab===16 && <TabCockpit caseId={caseId} caseData={caseData} />}

        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
          <button onClick={() => setActiveTab(t=>Math.max(1,t-1))} disabled={activeTab===1} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30">
            <ArrowLeft className="w-4 h-4"/> Zurück
          </button>
          <div className="flex gap-1">
            {TABS.map((_,i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${activeTab===i+1?"bg-gray-800":completedTabs[i]?"bg-gray-400":"bg-gray-200"}`}/>)}
          </div>
          <button onClick={() => setActiveTab(t=>Math.min(16,t+1))} disabled={activeTab===16} className="flex items-center gap-1 text-sm text-gray-800 font-medium hover:text-gray-600 disabled:opacity-30">
            Weiter <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">{counts.args} Argumente · {counts.evidence} Beweise · {counts.persons} Personen · {counts.deadlines} Fristen</p>
      </div>
    </div>
  );
}
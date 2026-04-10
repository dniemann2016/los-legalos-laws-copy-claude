import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Tab1Fallerfassung from "../components/lexara/Tab1Fallerfassung";
import Tab2Fallsubstanz from "../components/lexara/Tab2Fallsubstanz";
import Tab3Gegneranalyse from "../components/lexara/Tab3Gegneranalyse";
import Tab4RechtlicheAnalyse from "../components/lexara/Tab4RechtlicheAnalyse";
import TabStrategie from "../components/lexara/TabStrategie";
import Tab6Risiko from "../components/lexara/Tab6Risiko";
import Tab7Simulation from "../components/lexara/Tab7Simulation";
import Tab8Aktion from "../components/lexara/Tab8Aktion";
import Tab9Cockpit from "../components/lexara/Tab9Cockpit";
import Tab10Abschluss from "../components/lexara/Tab10Abschluss";
import TabHistory from "../components/lexara/TabHistory";
import { exportCasePDF } from "@/functions/exportCasePDF";

const TABS = [
  {id:1,label:"Fallerfassung"},
  {id:2,label:"Fallsubstanz"},
  {id:3,label:"Gegneranalyse"},
  {id:4,label:"Rechtl. Analyse"},
  {id:5,label:"Strategie"},
  {id:6,label:"Risiko"},
  {id:7,label:"Simulation"},
  {id:8,label:"Aktion"},
  {id:9,label:"Cockpit"},
  {id:10,label:"Abschluss & KI-Kalibrierung"},
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
  const [kiMode, setKiMode] = useState(() => localStorage.getItem('lexara_ki_mode') !== 'false');

  const toggleKiMode = () => setKiMode(prev => {
    const next = !prev;
    localStorage.setItem('lexara_ki_mode', String(next));
    return next;
  });

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

  const completedTabs = [
    !!caseData.fallname,
    counts.args > 0 && counts.evidence > 0,
    !!caseData.ki_berater_result,
    !!caseData.streitwert,
    !!caseData.prognose,
    !!(caseData.ki_berater_result?.risiko_analyse),
    false,
    !!caseData.notes,
    false,
    false,
  ];

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
              {/* KI / Manuell Toggle */}
              <button
                onClick={toggleKiMode}
                title={kiMode ? "KI-Modus aktiv – klicken um zu deaktivieren" : "Manuell-Modus aktiv – klicken um KI zu aktivieren"}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  kiMode
                    ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                    : "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                }`}>
                {kiMode ? "🤖 KI-Modus" : "✏️ Manuell"}
              </button>
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
        <p className="text-xs text-gray-400 mb-4">SCHRITT {activeTab} VON 10</p>
        {activeTab===1 && <Tab1Fallerfassung caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} onDataImport={loadCase} kiMode={kiMode} />}
        {activeTab===2 && <Tab2Fallsubstanz caseId={caseId} caseData={caseData} onCountChange={loadCase} kiMode={kiMode} />}
        {activeTab===3 && <Tab3Gegneranalyse caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} />}
        {activeTab===4 && <Tab4RechtlicheAnalyse caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} />}
        {activeTab===5 && <TabStrategie caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} />}
        {activeTab===6 && <Tab6Risiko caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} />}
        {activeTab===7 && <Tab7Simulation caseId={caseId} caseData={caseData} kiMode={kiMode} />}
        {activeTab===8 && <Tab8Aktion caseId={caseId} caseData={caseData} kiMode={kiMode} />}
        <div className={activeTab===9 ? "" : "hidden"}><Tab9Cockpit caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
        <div className={activeTab===10 ? "" : "hidden"}><Tab10Abschluss caseId={caseId} caseData={caseData} kiMode={kiMode} /></div>
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
          <button onClick={() => setActiveTab(t=>Math.max(1,t-1))} disabled={activeTab===1} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30">
            <ArrowLeft className="w-4 h-4"/> Zurück
          </button>
          <div className="flex gap-1">
            {TABS.map((_,i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${activeTab===i+1?"bg-gray-800":completedTabs[i]?"bg-gray-400":"bg-gray-200"}`}/>)}
          </div>
          <button onClick={() => setActiveTab(t=>Math.min(10,t+1))} disabled={activeTab===10} className="flex items-center gap-1 text-sm text-gray-800 font-medium hover:text-gray-600 disabled:opacity-30">
            Weiter <ArrowRight className="w-4 h-4"/>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">{counts.args} Argumente · {counts.evidence} Beweise · {counts.persons} Personen · {counts.deadlines} Fristen</p>
      </div>
    </div>
  );
}
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
import TabKIProtokoll from "../components/lexara/TabKIProtokoll";
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
  {id:10,label:"Abschluss"},
  {id:11,label:"KI-Protokoll"},
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
    false,
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Numbers-style document toolbar */}
      <div className="sticky top-0 z-30" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-5">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-2 pt-2.5 pb-1.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <Link to="/lexara" className="flex items-center gap-1 text-[11px] font-medium transition-colors" style={{ color: "#888" }}
              onMouseEnter={e => e.currentTarget.style.color="#333"} onMouseLeave={e => e.currentTarget.style.color="#888"}>
              <ArrowLeft className="w-3 h-3" /> Fallübersicht
            </Link>
            <span style={{ color: "#ccc" }}>›</span>
            <span className="text-[11px]" style={{ color: "#555" }}>{caseData.fallname}</span>
            {caseData.aktenzeichen && <><span style={{ color: "#ccc" }}>·</span><span className="text-[11px] font-mono" style={{ color: "#999" }}>{caseData.aktenzeichen}</span></>}
          </div>

          {/* Main toolbar row */}
          <div className="flex items-center justify-between py-2 gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[14px] font-semibold" style={{ color: "#1a1a1a", letterSpacing: "-0.1px" }}>{caseData.fallname}</h1>
              {caseData.rechtsgebiet && (
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)", color: "#555", fontWeight: 500 }}>
                  {caseData.rechtsgebiet}
                </span>
              )}
              {caseData.status && (
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)", color: "#555", fontWeight: 500 }}>
                  {caseData.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleKiMode}
                className="text-[11px] font-medium px-2.5 py-1 rounded transition-all"
                style={{
                  background: kiMode ? "rgba(52,199,89,0.12)" : "rgba(0,0,0,0.06)",
                  color: kiMode ? "#1a7f37" : "#666",
                  border: kiMode ? "1px solid rgba(52,199,89,0.3)" : "1px solid rgba(0,0,0,0.1)",
                }}>
                {kiMode ? "KI-Modus" : "Manuell"}
              </button>
              <button onClick={handleExportPDF} disabled={exporting}
                className="text-[11px] font-medium px-2.5 py-1 rounded transition-all"
                style={{ background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.1)" }}>
                {exporting ? "..." : "PDF"}
              </button>
              <button onClick={handleExportCSV} disabled={exporting}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded transition-all"
                style={{ background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.1)" }}>
                <Download className="w-3 h-3" /> CSV
              </button>
              <PrognoseCircle value={caseData.prognose||0}/>
            </div>
          </div>

          {/* Tab bar — Numbers sheet tabs style */}
          <div className="flex gap-0 overflow-x-auto" style={{ marginBottom: "-1px" }}>
            {TABS.map((tab,i) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 whitespace-nowrap transition-all"
                style={{
                  padding: "6px 12px 7px",
                  fontSize: "11px",
                  fontWeight: activeTab===tab.id ? 600 : 400,
                  color: activeTab===tab.id ? "#1a1a1a" : "#888",
                  borderBottom: activeTab===tab.id ? "2px solid #34C759" : "2px solid transparent",
                  background: "transparent",
                }}>
                {completedTabs[i] ? (
                  <Check className="w-3 h-3" style={{ color: "#34C759" }} />
                ) : (
                  <span style={{
                    width: 14, height: 14, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700,
                    background: activeTab===tab.id ? "#1a1a1a" : "transparent",
                    border: `1px solid ${activeTab===tab.id ? "#1a1a1a" : "#ccc"}`,
                    color: activeTab===tab.id ? "#fff" : "#aaa",
                    flexShrink: 0,
                  }}>{tab.id}</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-5">
        <p className="text-[10px] font-medium uppercase tracking-widest mb-4" style={{ color: "#bbb", letterSpacing: "0.08em" }}>Schritt {activeTab} von 10</p>
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
        {activeTab===11 && <TabKIProtokoll caseId={caseId} caseData={caseData} />}
        <div className="flex items-center justify-between mt-8 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <button onClick={() => setActiveTab(t=>Math.max(1,t-1))} disabled={activeTab===1}
            className="flex items-center gap-1 text-[12px] font-medium disabled:opacity-30 transition-colors"
            style={{ color: "#666" }}>
            <ArrowLeft className="w-3.5 h-3.5"/> Zurück
          </button>
          <div className="flex gap-1">
            {TABS.map((_,i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", transition: "all 0.15s",
                background: activeTab===i+1 ? "#1a1a1a" : completedTabs[i] ? "#34C759" : "#ddd"
              }}/>
            ))}
          </div>
          <button onClick={() => setActiveTab(t=>Math.min(11,t+1))} disabled={activeTab===11}
            className="flex items-center gap-1 text-[12px] font-semibold disabled:opacity-30 transition-colors"
            style={{ color: "#1a1a1a" }}>
            Weiter <ArrowRight className="w-3.5 h-3.5"/>
          </button>
        </div>
        <p className="text-center text-[10px] mt-4" style={{ color: "#bbb" }}>
          {counts.args} Argumente · {counts.evidence} Beweise · {counts.persons} Personen · {counts.deadlines} Fristen
        </p>
      </div>
    </div>
  );
}
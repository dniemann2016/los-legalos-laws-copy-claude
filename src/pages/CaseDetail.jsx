import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Tab1Fallerfassung from "../components/lexara/Tab1Fallerfassung";
import Tab2SubstanzCore from "../components/lexara/Tab2SubstanzCore";
import Tab3AkteureFristen from "../components/lexara/Tab3AkteureFristen";
import Tab3Gegneranalyse from "../components/lexara/Tab3Gegneranalyse";
import Tab4RechtlicheAnalyse from "../components/lexara/Tab4RechtlicheAnalyse";
import TabStrategiePrognose from "../components/lexara/TabStrategiePrognose";
import TabSimulationCockpit from "../components/lexara/TabSimulationCockpit";
import Tab8Aktion from "../components/lexara/Tab8Aktion";
import TabAbschlussProtokoll from "../components/lexara/TabAbschlussProtokoll";
import { exportCasePDF } from "@/functions/exportCasePDF";

// LEXARA — Anwalts-optimierte 9-Reiter-Struktur
// Arbeitslogik: Erfassen → Verstehen → Delegieren → Analysieren → Entscheiden → Handeln → Abschließen
const TABS = [
  {id:1, label:"Fallakte",          subs:["Basisdaten","Dokumente & KI-Analyse"]},
  {id:2, label:"Substanz",          subs:["Argumente & Beweise","Dokumentenanalyse / Zeitstrahl"]},
  {id:3, label:"Akteure & Fristen", subs:["Personen & Beteiligte","Fristen & Termine"]},
  {id:4, label:"Gegner",            subs:["Profil & Simulation","KI-Berater","Verhaltenstracking","Risikomatrix"]},
  {id:5, label:"Recht & Compliance",subs:["Compliance-Prüfung","Kostenanalyse","Präzedenzfälle"]},
  {id:6, label:"Strategie & Prognose", subs:["Strategie & KI-Prognose","Was-wäre-wenn","Monte Carlo","KI-Risikomatrix"]},
  {id:7, label:"Simulation & Cockpit", subs:["Verhandlungssimulation","Gesamtbewertung","Fall-Cockpit","Fallanalyse-Netzwerk"]},
  {id:8, label:"Aktion",            subs:["Verhandlungsführung","Schriftsatz-Generator"]},
  {id:9, label:"Abschluss",         subs:["Abschluss & Monte Carlo","KI-Protokoll","Zeitstrahl (Gesamt)"]},
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
  const [activeSub, setActiveSub] = useState(0);
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

  const handleExportSupabase = async () => {
    setExporting(true);
    try {
      const result = await base44.functions.invoke('exportToSupabase', {});
      alert(`✓ Export erfolgreich: ${Object.keys(result.results).filter(k => result.results[k].success).length} Tabellen synchronisiert`);
    } catch (error) {
      alert(`⚠️ Export-Fehler: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!caseId) { navigate("/lexara"); return; }
    loadCase();
  }, [caseId]);

  // Reset sub-tab when main tab changes
  const switchTab = (tabId) => { setActiveTab(tabId); setActiveSub(0); };

  // Listen for sidebar step navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.step) { setActiveTab(e.detail.step); setActiveSub(0); }
    };
    window.addEventListener("lexara_goto_step", handler);
    return () => window.removeEventListener("lexara_goto_step", handler);
  }, []);

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
    !!caseData.fallname,                            // 1 Fallakte
    counts.args > 0 && counts.evidence > 0,         // 2 Substanz
    counts.persons > 0 || counts.deadlines > 0,     // 3 Akteure & Fristen
    !!caseData.ki_berater_result,                   // 4 Gegner
    !!caseData.streitwert,                          // 5 Recht & Compliance
    !!caseData.prognose,                            // 6 Strategie & Prognose
    !!(caseData.ki_berater_result?.risiko_analyse), // 7 Simulation & Cockpit
    !!caseData.notes,                               // 8 Aktion
    false,                                          // 9 Abschluss
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>
      {/* Document toolbar */}
      <div className="sticky top-0 z-30" style={{ background: "rgba(248,248,248,0.97)", borderBottom: "1px solid rgba(0,0,0,0.09)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          {/* Breadcrumb row */}
          <div className="flex items-center gap-2" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", padding: "8px 0 6px" }}>
            <Link to="/lexara" className="flex items-center gap-1 transition-colors" style={{ fontSize: 11, fontWeight: 500, color: "#999" }}
              onMouseEnter={e => e.currentTarget.style.color="#333"} onMouseLeave={e => e.currentTarget.style.color="#999"}>
              <ArrowLeft className="w-3 h-3" /> Fallübersicht
            </Link>
            <span style={{ color: "#ddd", fontSize: 12 }}>›</span>
            <span style={{ fontSize: 11, color: "#555" }}>{caseData.fallname}</span>
            {caseData.aktenzeichen && <><span style={{ color: "#ddd" }}>·</span><span style={{ fontSize: 11, fontFamily: "monospace", color: "#aaa" }}>{caseData.aktenzeichen}</span></>}
          </div>

          {/* Main toolbar row */}
          <div className="flex items-center justify-between gap-4" style={{ padding: "10px 0 8px" }}>
            <div className="flex items-center gap-3">
              <h1 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.025em", margin: 0 }}>{caseData.fallname}</h1>
              {caseData.rechtsgebiet && (
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 6, background: "rgba(0,0,0,0.06)", color: "#555", fontWeight: 500 }}>
                  {caseData.rechtsgebiet}
                </span>
              )}
              {caseData.status && (
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 6, background: "rgba(0,0,0,0.06)", color: "#555", fontWeight: 500 }}>
                  {caseData.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleKiMode}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.14s",
                  background: kiMode ? "rgba(52,199,89,0.1)" : "rgba(0,0,0,0.05)",
                  color: kiMode ? "#1a7f37" : "#666",
                  border: kiMode ? "1px solid rgba(52,199,89,0.25)" : "1px solid rgba(0,0,0,0.09)",
                }}>
                {kiMode ? "KI-Modus" : "Manuell"}
              </button>
              <button onClick={handleExportPDF} disabled={exporting}
                style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.09)" }}>
                {exporting ? "…" : "PDF"}
              </button>
              <button onClick={handleExportCSV} disabled={exporting}
                className="flex items-center gap-1"
                style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.09)" }}>
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={handleExportSupabase} disabled={exporting}
                style={{ fontSize: 11, fontWeight: 500, padding: "5px 12px", borderRadius: 8, cursor: "pointer", background: "rgba(0,0,0,0.05)", color: "#555", border: "1px solid rgba(0,0,0,0.09)" }}>
                {exporting ? "…" : "Supabase"}
              </button>
              <PrognoseCircle value={caseData.prognose||0}/>
            </div>
          </div>

          {/* Main tab bar */}
          <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", gap: 0, scrollbarWidth: "thin", scrollbarColor: "#ccc transparent" }}>
            {TABS.map((tab,i) => (
              <button key={tab.id} onClick={() => switchTab(tab.id)}
                className="flex items-center gap-1.5 whitespace-nowrap transition-all"
                style={{
                  padding: "8px 14px 9px",
                  fontSize: 12,
                  fontWeight: activeTab===tab.id ? 600 : 400,
                  color: activeTab===tab.id ? "#1a1a1a" : "#999",
                  borderBottom: activeTab===tab.id ? "2px solid #34C759" : "2px solid transparent",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  marginBottom: "-1px",
                }}>
                {completedTabs[i] ? (
                  <Check className="w-3 h-3" style={{ color: "#34C759" }} />
                ) : (
                  <span style={{
                    width: 15, height: 15, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    background: activeTab===tab.id ? "#1a1a1a" : "transparent",
                    border: `1px solid ${activeTab===tab.id ? "#1a1a1a" : "#ccc"}`,
                    color: activeTab===tab.id ? "#fff" : "#bbb",
                  }}>{tab.id}</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab bar */}
          {(() => {
            const currentTab = TABS.find(t => t.id === activeTab);
            if (!currentTab?.subs?.length) return null;
            return (
              <div className="flex overflow-x-auto" style={{ background: "rgba(0,0,0,0.015)", scrollbarWidth: "none" }}>
                {currentTab.subs.map((sub, i) => (
                  <button key={i} onClick={() => setActiveSub(i)}
                    className="whitespace-nowrap transition-all"
                    style={{
                      padding: "6px 14px 7px",
                      fontSize: 11,
                      fontWeight: activeSub === i ? 600 : 400,
                      color: activeSub === i ? "#1a7f37" : "#aaa",
                      borderBottom: activeSub === i ? "2px solid #34C759" : "2px solid transparent",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      marginBottom: "-1px",
                    }}>
                    {sub}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 48px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#ccc", marginBottom: 20 }}>Schritt {activeTab} von 9</p>
        {activeTab===1 && <Tab1Fallerfassung caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} onDataImport={loadCase} kiMode={kiMode} activeSub={activeSub} />}
        {activeTab===2 && <Tab2SubstanzCore caseId={caseId} caseData={caseData} onCountChange={loadCase} kiMode={kiMode} activeSub={activeSub} />}
        {activeTab===3 && <Tab3AkteureFristen caseId={caseId} caseData={caseData} onCountChange={loadCase} kiMode={kiMode} activeSub={activeSub} />}
        {activeTab===4 && <Tab3Gegneranalyse caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} activeSub={activeSub} />}
        {activeTab===5 && <Tab4RechtlicheAnalyse caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} activeSub={activeSub} />}
        {activeTab===6 && <TabStrategiePrognose caseId={caseId} caseData={caseData} onUpdate={d=>setCaseData(d)} kiMode={kiMode} activeSub={activeSub} />}
        <div className={activeTab===7 ? "" : "hidden"}><TabSimulationCockpit caseId={caseId} caseData={caseData} kiMode={kiMode} activeSub={activeSub} /></div>
        {activeTab===8 && <Tab8Aktion caseId={caseId} caseData={caseData} kiMode={kiMode} activeSub={activeSub} />}
        <div className={activeTab===9 ? "" : "hidden"}><TabAbschlussProtokoll caseId={caseId} caseData={caseData} kiMode={kiMode} activeSub={activeSub} /></div>
        <div className="flex items-center justify-between" style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <button onClick={() => setActiveTab(t=>Math.max(1,t-1))} disabled={activeTab===1}
            className="flex items-center gap-1.5 disabled:opacity-30 transition-colors"
            style={{ fontSize: 12, fontWeight: 500, color: "#666", background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft style={{ width: 14, height: 14 }}/> Zurück
          </button>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {TABS.map((_,i) => (
              <div key={i} style={{
                width: activeTab===i+1 ? 18 : 6, height: 6,
                borderRadius: 3, transition: "all 0.2s",
                background: activeTab===i+1 ? "#1a1a1a" : completedTabs[i] ? "#34C759" : "#ddd"
              }}/>
            ))}
          </div>
          <button onClick={() => setActiveTab(t=>Math.min(9,t+1))} disabled={activeTab===9}
            className="flex items-center gap-1.5 disabled:opacity-30 transition-colors"
            style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", background: "none", border: "none", cursor: "pointer" }}>
            Weiter <ArrowRight style={{ width: 14, height: 14 }}/>
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 10.5, marginTop: 14, color: "#ccc", letterSpacing: "0.02em" }}>
          {counts.args} Argumente · {counts.evidence} Beweise · {counts.persons} Personen · {counts.deadlines} Fristen
        </p>
      </div>
    </div>
  );
}
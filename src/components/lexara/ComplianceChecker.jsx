import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Loader2, Zap, AlertCircle, ChevronDown, ChevronRight, Check, Info, BookOpen, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEVERITY_CONFIG = {
  kritisch: { label: "Kritisch", dot: "#1C1C1E", weight: 700 },
  hoch:     { label: "Hoch",     dot: "#636366", weight: 600 },
  mittel:   { label: "Mittel",   dot: "#8E8E93", weight: 500 },
  niedrig:  { label: "Niedrig",  dot: "#AEAEB2", weight: 400 },
};

const WARNING_TYPE_LABELS = {
  diskrepanz:          "Diskrepanz",
  fehlender_beleg:     "Fehlender Beleg",
  veraltete_rspr:      "Veraltete Rechtsprechung",
  unterstuetzung_fehlt:"Unterstützung fehlt",
  widerspruch:         "Widerspruch",
};

const SF = { fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif" };
const C = {
  label:  "#1C1C1E",
  label2: "#636366",
  label3: "#AEAEB2",
  sep:    "rgba(0,0,0,0.08)",
  card:   "#FFFFFF",
  bg:     "#F4F4F4",
};

export default function ComplianceChecker({ caseId, caseData }) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => { loadWarnings(); }, [caseId]);

  const loadWarnings = async () => {
    setLoading(true);
    const data = await base44.entities.CaseWarning.filter({ case_id: caseId, resolved: false });
    setWarnings(data.sort((a, b) => {
      const o = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };
      return o[a.severity] - o[b.severity];
    }));
    setLoading(false);
  };

  const runCompliance = async () => {
    setChecking(true);
    try {
      await base44.functions.invoke("checkCaseCompliance", { caseId });
      setLastCheck(new Date());
      await loadWarnings();
    } catch (error) {
      console.error("Compliance-Prüfung Fehler:", error);
    }
    setChecking(false);
  };

  const resolveWarning = async (warningId) => {
    await base44.entities.CaseWarning.update(warningId, {
      resolved: true,
      resolved_date: new Date().toISOString(),
    });
    await loadWarnings();
  };

  const filteredWarnings = filter === "all" ? warnings : warnings.filter(w => w.severity === filter);
  const criticalCount = warnings.filter(w => w.severity === "kritisch").length;
  const highCount     = warnings.filter(w => w.severity === "hoch").length;

  if (loading) {
    return (
      <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
        <div style={{ width:20, height:20, border:"2px solid rgba(0,0,0,0.1)", borderTopColor:"#1C1C1E", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ ...SF, display:"flex", flexDirection:"column", gap:16 }}>

      {/* Header */}
      <div style={{
        background: C.card, border:`1px solid ${C.sep}`, borderRadius:16,
        padding:"18px 20px", display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div>
          <p style={{ fontSize:9.5, fontWeight:700, color:C.label3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>
            KI-Compliance-Prüfung
          </p>
          <h3 style={{ fontSize:15, fontWeight:700, color:C.label, letterSpacing:"-0.02em", margin:0, marginBottom:4 }}>
            Fall gegen Rechtsprechung prüfen
          </h3>
          <p style={{ fontSize:11.5, color:C.label2, margin:0, lineHeight:1.5, maxWidth:420 }}>
            Analysiert Argumente, Beweise und Fristen gegen aktuelle Rechtsprechung und erkennt Lücken.
          </p>
          {lastCheck && (
            <p style={{ fontSize:10, color:C.label3, marginTop:6 }}>
              Letzte Prüfung: {new Date(lastCheck).toLocaleString("de-DE")}
            </p>
          )}
        </div>
        <button
          onClick={runCompliance}
          disabled={checking}
          style={{
            display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
            background: C.label, color:"#fff", border:"none", borderRadius:10,
            fontSize:12, fontWeight:600, cursor: checking ? "not-allowed" : "pointer",
            opacity: checking ? 0.6 : 1, flexShrink:0,
          }}
        >
          {checking
            ? <><Loader2 style={{ width:13, height:13, animation:"spin 0.8s linear infinite" }} /> Prüfe…</>
            : <><Zap style={{ width:13, height:13 }} /> Scan starten</>
          }
        </button>
      </div>

      {/* Summary */}
      {warnings.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:10 }}>
          {[
            { label:"Insgesamt", value: warnings.length },
            criticalCount > 0 && { label:"Kritisch", value: criticalCount },
            highCount > 0      && { label:"Hoch",     value: highCount },
            { label:"Offen",    value: warnings.filter(w => !w.resolved).length },
          ].filter(Boolean).map((item, i) => (
            <div key={i} style={{
              background: C.card, border:`1px solid ${C.sep}`, borderRadius:12,
              padding:"12px 14px", boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <p style={{ fontSize:9.5, fontWeight:700, color:C.label3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>
                {item.label}
              </p>
              <p style={{ fontSize:22, fontWeight:700, color:C.label, margin:0, letterSpacing:"-0.03em" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {warnings.length > 0 && (
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {["all", "kritisch", "hoch", "mittel", "niedrig"].map(sev => (
            <button key={sev} onClick={() => setFilter(sev)} style={{
              padding:"5px 12px", borderRadius:8, fontSize:11.5, fontWeight:600,
              border: filter === sev ? `1px solid ${C.label}` : `1px solid ${C.sep}`,
              background: filter === sev ? C.label : "rgba(0,0,0,0.03)",
              color: filter === sev ? "#fff" : C.label2,
              cursor:"pointer", transition:"all 0.14s",
            }}>
              {sev === "all" ? "Alle" : SEVERITY_CONFIG[sev].label}
            </button>
          ))}
        </div>
      )}

      {/* Warnings list */}
      {filteredWarnings.length === 0 ? (
        <div style={{
          background: C.card, border:`1px solid ${C.sep}`, borderRadius:14,
          padding:"32px 24px", textAlign:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <CheckCircle style={{ width:28, height:28, color:C.label3, margin:"0 auto 10px" }} />
          <p style={{ fontSize:13, fontWeight:600, color:C.label, marginBottom:4 }}>Keine Warnungen</p>
          <p style={{ fontSize:11.5, color:C.label2 }}>
            {warnings.length === 0
              ? "Führen Sie eine Compliance-Prüfung durch, um Lücken zu erkennen."
              : "Alle gefilterten Warnungen wurden behoben."}
          </p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filteredWarnings.map((warning, idx) => {
            const sev = SEVERITY_CONFIG[warning.severity] || SEVERITY_CONFIG.niedrig;
            const expanded = expandedId === warning.id;
            return (
              <div key={warning.id} style={{
                background: C.card, border:`1px solid ${C.sep}`, borderRadius:13,
                overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
              }}>
                {/* Row header */}
                <button onClick={() => setExpandedId(expanded ? null : warning.id)} style={{
                  width:"100%", textAlign:"left", padding:"13px 16px",
                  background:"transparent", border:"none", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:12,
                }}>
                  {/* Severity dot */}
                  <div style={{
                    width:8, height:8, borderRadius:"50%", flexShrink:0,
                    background: sev.dot, opacity: 0.75 + (0 - ["kritisch","hoch","mittel","niedrig"].indexOf(warning.severity)) * 0.05,
                  }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:sev.weight, color:C.label, margin:0, lineHeight:1.3 }}>
                      {warning.title}
                    </p>
                    {warning.element_title && (
                      <p style={{ fontSize:11, color:C.label3, margin:0, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {warning.element_title}
                      </p>
                    )}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <span style={{
                      fontSize:10, fontWeight:600, color:C.label2, padding:"3px 8px",
                      border:`1px solid ${C.sep}`, borderRadius:6, background:"rgba(0,0,0,0.03)",
                    }}>
                      {WARNING_TYPE_LABELS[warning.warning_type] || warning.warning_type}
                    </span>
                    <span style={{ fontSize:11, fontWeight:600, color:C.label3, minWidth:16 }}>
                      {sev.label}
                    </span>
                    {expanded
                      ? <ChevronDown style={{ width:14, height:14, color:C.label3 }} />
                      : <ChevronRight style={{ width:14, height:14, color:C.label3 }} />
                    }
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{ borderTop:`1px solid ${C.sep}`, padding:"14px 16px", display:"flex", flexDirection:"column", gap:12, background:"rgba(0,0,0,0.015)" }}>
                    {warning.description && (
                      <div>
                        <p style={{ fontSize:10, fontWeight:700, color:C.label3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:5 }}>Beschreibung</p>
                        <p style={{ fontSize:12.5, color:C.label, lineHeight:1.6, margin:0 }}>{warning.description}</p>
                      </div>
                    )}

                    {warning.suggestion && (
                      <div style={{
                        background: C.card, border:`1px solid ${C.sep}`, borderRadius:10, padding:"10px 12px",
                        display:"flex", gap:10, alignItems:"flex-start",
                      }}>
                        <Lightbulb style={{ width:13, height:13, color:C.label2, flexShrink:0, marginTop:1 }} />
                        <div>
                          <p style={{ fontSize:10, fontWeight:700, color:C.label2, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Empfohlene Maßnahme</p>
                          <p style={{ fontSize:12.5, color:C.label, lineHeight:1.55, margin:0 }}>{warning.suggestion}</p>
                        </div>
                      </div>
                    )}

                    {warning.rspr_reference && (
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <BookOpen style={{ width:12, height:12, color:C.label3, flexShrink:0, marginTop:2 }} />
                        <div>
                          <p style={{ fontSize:10, fontWeight:700, color:C.label3, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>Rechtsprechungs-Referenz</p>
                          <p style={{ fontSize:12, color:C.label2, fontFamily:"'SF Mono','Menlo',monospace", margin:0 }}>{warning.rspr_reference}</p>
                        </div>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:8, paddingTop:4 }}>
                      <button onClick={() => resolveWarning(warning.id)} style={{
                        flex:1, padding:"8px 12px", borderRadius:9, fontSize:12, fontWeight:600,
                        border:`1px solid ${C.sep}`, background: C.label, color:"#fff", cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                      }}>
                        <Check style={{ width:12, height:12 }} /> Als behoben markieren
                      </button>
                      <button style={{
                        flex:1, padding:"8px 12px", borderRadius:9, fontSize:12, fontWeight:600,
                        border:`1px solid ${C.sep}`, background:"rgba(0,0,0,0.03)", color:C.label2, cursor:"pointer",
                      }}>
                        Mehr erfahren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div style={{
        background: C.card, border:`1px solid ${C.sep}`, borderRadius:13,
        padding:"13px 16px", display:"flex", gap:10, alignItems:"flex-start",
        boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <Info style={{ width:13, height:13, color:C.label3, flexShrink:0, marginTop:1 }} />
        <div>
          <p style={{ fontSize:11.5, fontWeight:600, color:C.label, marginBottom:4 }}>Wie die Prüfung funktioniert</p>
          <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:3 }}>
            {[
              "Argumente ohne Beweise prüfen",
              "Gegensätzliche Argumente mit ähnlicher Stärke erkennen",
              "KI-Analyse gegen aktuelle Rechtsprechung",
              "Fehlende Fristen und schwache Beweise identifizieren",
            ].map((t, i) => (
              <li key={i} style={{ fontSize:11, color:C.label2, display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:3, height:3, borderRadius:"50%", background:C.label3, flexShrink:0 }} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
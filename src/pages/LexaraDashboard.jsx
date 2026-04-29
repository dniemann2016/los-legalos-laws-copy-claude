import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, X, Scale, TrendingUp, Clock, AlertCircle, LogIn, Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import FolderOrganizer, { AssignFolderDropdown } from "@/components/lexara/FolderOrganizer";

/* ── Design tokens (SwiftUI / Apple HIG) ─────────── */
const C = {
  bg:          "#F2F2F7",
  card:        "#FFFFFF",
  cardSecond:  "#F9F9F9",
  separator:   "rgba(0,0,0,0.08)",
  label:       "#1C1C1E",
  label2:      "#636366",
  label3:      "#AEAEB2",
  emerald:     "#1DB954",
  emeraldDim:  "rgba(29,185,84,0.10)",
  emeraldText: "#166F38",
  ocean:       "#0A84FF",
  bordeaux:    "#B81C3A",
  bordeauxDim: "rgba(184,28,58,0.09)",
  shadowSm:    "0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)",
  shadow:      "0 4px 20px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.05)",
};
const SF = { fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif" };

/* ── Prognose arc ─────────────────────────────────── */
function PrognoseArc({ value = 0 }) {
  const color = value >= 65 ? C.emerald : value >= 40 ? "#FF9500" : C.bordeaux;
  const r = 15, circ = 2 * Math.PI * r, offset = circ - (value / 100) * circ;
  return (
    <div style={{ position:"relative", width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <svg width="38" height="38" style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
        <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="3" />
        <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 0.5s ease" }} />
      </svg>
      <span style={{ position:"relative", fontSize:9, fontWeight:700, color }}>{Math.round(value)}</span>
    </div>
  );
}

/* ── Case card ────────────────────────────────────── */
function CaseCard({ caseData, counts, folders, onReload }) {
  const navigate = useNavigate();
  const total = 9;
  const done = [caseData.fallname, caseData.gericht, caseData.zentrale_rechtsfrage,
    counts.args > 0, counts.evidence > 0, counts.persons > 0,
    counts.deadlines > 0, caseData.prognose, caseData.streitwert].filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const progColor = (caseData.prognose||0) >= 65 ? C.emerald : (caseData.prognose||0) >= 40 ? "#FF9500" : C.bordeaux;

  const statusStyle = {
    Aktiv:         { bg: C.emeraldDim, color: C.emeraldText },
    Vorbereitung:  { bg: "rgba(10,132,255,0.09)", color: "#0A5FC4" },
    Abgeschlossen: { bg: "rgba(0,0,0,0.05)", color: C.label2 },
    Ruhend:        { bg: "rgba(255,149,0,0.09)", color: "#BF7200" },
  }[caseData.status] || { bg: "rgba(0,0,0,0.05)", color: C.label2 };

  return (
    <div
      onClick={() => navigate(`/lexara/case?id=${caseData.id}`)}
      style={{
        background: C.card,
        border: `1px solid ${C.separator}`,
        borderRadius: 18,
        boxShadow: C.shadowSm,
        cursor: "pointer",
        transition: "box-shadow 0.18s, transform 0.18s, border-color 0.18s",
        display: "flex", flexDirection: "column",
        ...SF,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = C.shadow;
        e.currentTarget.style.borderColor = "rgba(29,185,84,0.28)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = C.shadowSm;
        e.currentTarget.style.borderColor = C.separator;
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Header */}
      <div style={{ padding:"18px 20px 14px", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          {caseData.aktenzeichen && (
            <p style={{ fontFamily:"'SF Mono',Menlo,monospace", fontSize:9.5, color:C.label3, letterSpacing:"0.04em", marginBottom:4 }}>
              {caseData.aktenzeichen}
            </p>
          )}
          <h3 style={{ fontSize:13.5, fontWeight:600, color:C.label, lineHeight:1.35, marginBottom:8 }}>
            {caseData.fallname}
          </h3>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {caseData.status && (
              <span style={{ fontSize:10.5, fontWeight:600, padding:"2px 8px", borderRadius:6, background:statusStyle.bg, color:statusStyle.color }}>
                {caseData.status}
              </span>
            )}
            {caseData.rechtsgebiet && (
              <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:6, background:"rgba(0,0,0,0.04)", color:C.label2 }}>
                {caseData.rechtsgebiet}
              </span>
            )}
            {caseData.instanz && caseData.instanz !== "Erstinstanz" && (
              <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:6, background:"rgba(0,0,0,0.04)", color:C.label2 }}>
                {caseData.instanz}
              </span>
            )}
          </div>
        </div>
        <div style={{ flexShrink:0, textAlign:"right" }}>
          <p style={{ fontSize:22, fontWeight:700, color:progColor, lineHeight:1, letterSpacing:"-0.03em" }}>{Math.round(caseData.prognose||0)}%</p>
          <p style={{ fontSize:9, color:C.label3, marginTop:2 }}>Prognose</p>
        </div>
      </div>

      {/* Progress */}
      <div style={{ paddingInline:20, paddingBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontSize:10, color:C.label3 }}>Vollständigkeit</span>
          <span style={{ fontSize:10, fontWeight:600, color:C.label2 }}>{pct}%</span>
        </div>
        <div style={{ height:4, background:"rgba(0,0,0,0.06)", borderRadius:99, overflow:"hidden" }}>
          <div style={{
            height:"100%", borderRadius:99,
            width:`${pct}%`,
            background: pct >= 80 ? C.emerald : pct >= 50 ? "#FF9500" : "rgba(0,0,0,0.15)",
            transition:"width 0.35s ease",
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(4,1fr)",
        borderTop:`1px solid ${C.separator}`,
        paddingBlock:12,
      }}>
        {[["Argum.", counts.args], ["Beweise", counts.evidence], ["Personen", counts.persons], ["Fristen", counts.deadlines]].map(([l, v]) => (
          <div key={l} style={{ textAlign:"center" }}>
            <p style={{ fontSize:15, fontWeight:700, color:C.label, lineHeight:1 }}>{v}</p>
            <p style={{ fontSize:9.5, color:C.label3, marginTop:3 }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Ordner-Zuordnung */}
      <div style={{ paddingInline:16, paddingBottom:12, borderTop:`1px solid ${C.separator}`, paddingTop:10 }}
        onClick={e => e.stopPropagation()}>
        <AssignFolderDropdown
          caseId={caseData.id}
          currentFolderId={caseData.folder_id}
          folders={folders}
          onAssigned={onReload}
        />
      </div>
    </div>
  );
}

/* ── KPI chip ─────────────────────────────────────── */
function KpiChip({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      background: C.card,
      border:`1px solid ${C.separator}`,
      borderRadius:16,
      padding:"16px 18px",
      display:"flex", alignItems:"center", gap:14,
      boxShadow: C.shadowSm,
    }}>
      <div style={{
        width:40, height:40, borderRadius:12,
        background: accent ? `${accent}14` : "rgba(0,0,0,0.05)",
        display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0,
      }}>
        <Icon style={{ width:18, height:18, color: accent || C.label3 }} />
      </div>
      <div>
        <p style={{ fontSize:22, fontWeight:700, color:C.label, lineHeight:1, letterSpacing:"-0.03em" }}>{value}</p>
        <p style={{ fontSize:10.5, color:C.label3, marginTop:4 }}>{label}</p>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────── */
export default function LexaraDashboard() {
  const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [cases, setCases]         = useState([]);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase]     = useState({ fallname:"", aktenzeichen:"", rechtsgebiet:"", status:"Aktiv", instanz:"Erstinstanz" });
  const [caseCounts, setCaseCounts] = useState({});
  const [creating, setCreating]   = useState(false);
  const [folders, setFolders]     = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    const [cs, args, evs, pers, deadlines, folds] = await Promise.all([
      base44.entities.Case.list("-created_date"),
      base44.entities.Argument.filter({}),
      base44.entities.Evidence.filter({}),
      base44.entities.Person.filter({}),
      base44.entities.Deadline.filter({}),
      base44.entities.CaseFolder.list("-created_date"),
    ]);
    setCases(cs);
    setFolders(folds);
    const counts = {};
    cs.forEach(c => {
      counts[c.id] = {
        args:      args.filter(a => a.case_id === c.id).length,
        evidence:  evs.filter(e => e.case_id === c.id).length,
        persons:   pers.filter(p => p.case_id === c.id).length,
        deadlines: deadlines.filter(d => d.case_id === c.id).length,
      };
    });
    setCaseCounts(counts);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newCase.fallname.trim()) return;
    setCreating(true);
    await base44.entities.Case.create(newCase);
    setNewCase({ fallname:"", aktenzeichen:"", rechtsgebiet:"", status:"Aktiv", instanz:"Erstinstanz" });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const filtered = cases.filter(c => {
    const matchSearch = c.fallname?.toLowerCase().includes(search.toLowerCase()) ||
      c.aktenzeichen?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchFolder = !selectedFolder || c.folder_id === selectedFolder;
    return matchSearch && matchStatus && matchFolder;
  });

  // Folder case counts
  const folderCaseCounts = {
    total: cases.length,
    ...Object.fromEntries(folders.map(f => [f.id, cases.filter(c => c.folder_id === f.id).length])),
  };

  const aktiv      = cases.filter(c => c.status === "Aktiv").length;
  const avgPrognose = cases.length ? Math.round(cases.reduce((s,c)=>s+(c.prognose||0),0)/cases.length) : 0;
  const totalArgs  = Object.values(caseCounts).reduce((s,c)=>s+c.args,0);
  const totalDead  = Object.values(caseCounts).reduce((s,c)=>s+c.deadlines,0);

  if (isLoadingAuth) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:26, height:26, border:"3px solid rgba(0,0,0,0.08)", borderTopColor:C.emerald, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    </div>
  );

  if (!isAuthenticated) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", ...SF }}>
      <div style={{ background:C.card, border:`1px solid ${C.separator}`, borderRadius:22, padding:44, textAlign:"center", maxWidth:340, boxShadow:C.shadow }}>
        <div style={{ width:52, height:52, background:C.emeraldDim, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
          <Scale style={{ width:24, height:24, color:C.emerald }} />
        </div>
        <h2 style={{ fontSize:17, fontWeight:700, color:C.label, marginBottom:8, letterSpacing:"-0.025em" }}>Anmeldung erforderlich</h2>
        <p style={{ fontSize:12.5, color:C.label2, marginBottom:26, lineHeight:1.6 }}>Um Fälle zu verwalten, bitte anmelden.</p>
        <button onClick={navigateToLogin} style={{
          width:"100%", background:C.emerald, color:"#fff", fontSize:13, fontWeight:600,
          padding:"11px", borderRadius:12, border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          boxShadow:`0 4px 16px rgba(29,185,84,0.35)`,
        }}>
          <LogIn style={{ width:15, height:15 }} /> Jetzt anmelden
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, ...SF }}>

      {/* Toolbar */}
      <div style={{
        position:"sticky", top:0, zIndex:20,
        background:"rgba(242,242,247,0.96)",
        borderBottom:`1px solid ${C.separator}`,
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 28px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setSidebarOpen(o => !o)} title="Ordner ein-/ausblenden" style={{
            width:32, height:32, borderRadius:9, border:`1px solid ${C.separator}`,
            background: sidebarOpen ? "rgba(10,132,255,0.08)" : "rgba(0,0,0,0.04)",
            color: sidebarOpen ? "#0A84FF" : C.label3,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
          }}>
            <Folder style={{ width:14, height:14 }} />
          </button>
          <div style={{ marginRight:"auto" }}>
            <p style={{ fontSize:15, fontWeight:700, color:C.label, letterSpacing:"-0.025em" }}>Fallübersicht</p>
            <p style={{ fontSize:11, color:C.label3, marginTop:1 }}>{cases.length} Mandate verwaltet</p>
          </div>
          <div style={{ position:"relative" }}>
            <Search style={{ width:13, height:13, position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.label3 }} />
            <input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} style={{
              paddingLeft:30, paddingRight:12, width:170, height:32, fontSize:12.5,
              background:"rgba(0,0,0,0.05)", border:`1px solid ${C.separator}`,
              borderRadius:10, outline:"none", color:C.label,
            }} />
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            background:C.emerald, color:"#fff", fontSize:12, fontWeight:600,
            padding:"7px 16px", borderRadius:10, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:6,
            boxShadow:`0 2px 10px rgba(29,185,84,0.35)`,
            transition:"all 0.14s",
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow=`0 4px 18px rgba(29,185,84,0.45)`}
            onMouseLeave={e => e.currentTarget.style.boxShadow=`0 2px 10px rgba(29,185,84,0.35)`}
          >
            <Plus style={{ width:13, height:13 }} /> Neuer Fall
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:"0 auto", padding:"28px 28px 60px", display:"flex", gap:24 }}>

        {/* Ordner-Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 220, flexShrink: 0, background: C.card, border: `1px solid ${C.separator}`,
            borderRadius: 18, padding: "14px 10px", boxShadow: C.shadowSm,
            height: "fit-content", position: "sticky", top: 80,
          }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: C.label3, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 4px", marginBottom: 10 }}>
              Ordner
            </p>
            <FolderOrganizer
              folders={folders}
              selectedFolderId={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onFoldersChanged={loadData}
              caseCounts={folderCaseCounts}
            />
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* KPIs */}
        {cases.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
            <KpiChip icon={Scale}        label="Aktive Mandate"  value={aktiv}           accent={C.ocean} />
            <KpiChip icon={TrendingUp}   label="Ø Erfolgsquote" value={`${avgPrognose}%`} accent={C.emerald} />
            <KpiChip icon={AlertCircle}  label="Argumente ges."  value={totalArgs}        accent={C.label2} />
            <KpiChip icon={Clock}        label="Offene Fristen"  value={totalDead}        accent={C.bordeaux} />
          </div>
        )}

        {/* Filters */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          {["all","Aktiv","Vorbereitung","Ruhend","Abgeschlossen"].map(s => {
            const active = statusFilter === s;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding:"5px 13px", borderRadius:8, fontSize:12, fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? "rgba(29,185,84,0.3)" : C.separator}`,
                background: active ? C.emeraldDim : C.card,
                color: active ? C.emeraldText : C.label2,
                cursor:"pointer", transition:"all 0.13s",
              }}>
                {s === "all" ? "Alle" : s}
                {s !== "all" && <span style={{ marginLeft:6, opacity:0.5, fontSize:10 }}>{cases.filter(c=>c.status===s).length}</span>}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", paddingBlock:100 }}>
            <div style={{ width:26, height:26, border:"3px solid rgba(0,0,0,0.07)", borderTopColor:C.emerald, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:18 }}>
            {filtered.map(c => (
              <CaseCard key={c.id} caseData={c} counts={caseCounts[c.id] || { args:0, evidence:0, persons:0, deadlines:0 }} folders={folders} onReload={loadData} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign:"center", paddingBlock:80 }}>
            <div style={{ width:48, height:48, background:C.card, border:`1px solid ${C.separator}`, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:C.shadowSm }}>
              <Scale style={{ width:22, height:22, color:C.label3 }} />
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:C.label2, marginBottom:5 }}>
              {search || statusFilter !== "all" ? "Keine Treffer" : "Noch keine Fälle"}
            </p>
            <p style={{ fontSize:12, color:C.label3 }}>
              {search || statusFilter !== "all" ? "Filter oder Suche anpassen" : "Neuen Fall anlegen um zu beginnen"}
            </p>
          </div>
        )}
        </div>{/* end main content */}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position:"fixed", inset:0, zIndex:50,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.38)", backdropFilter:"blur(10px)",
        }} onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="animate-modal" style={{
            background:"rgba(250,250,250,0.98)",
            border:`1px solid ${C.separator}`,
            borderRadius:22, padding:28, width:"100%", maxWidth:420,
            boxShadow:"0 24px 60px rgba(0,0,0,0.22)",
            ...SF,
          }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <div>
                <h2 style={{ fontSize:15, fontWeight:700, color:C.label, letterSpacing:"-0.02em" }}>Neuen Fall anlegen</h2>
                <p style={{ fontSize:11, color:C.label3, marginTop:3 }}>Grunddaten — weitere Details im Fall</p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ color:C.label3, padding:6, borderRadius:8, border:"none", background:"transparent", cursor:"pointer" }}>
                <X style={{ width:16, height:16 }} />
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { ph:"Fallname *", key:"fallname" },
                { ph:"Aktenzeichen", key:"aktenzeichen" },
                { ph:"Rechtsgebiet", key:"rechtsgebiet" },
              ].map(f => (
                <input key={f.key} style={{
                  width:"100%", padding:"9px 12px", fontSize:13,
                  background:"rgba(0,0,0,0.04)", border:`1px solid ${C.separator}`,
                  borderRadius:10, outline:"none", color:C.label, boxSizing:"border-box",
                }}
                  placeholder={f.ph} value={newCase[f.key]}
                  onChange={e => setNewCase({ ...newCase, [f.key]: e.target.value })}
                  onKeyDown={e => e.key==="Enter" && f.key==="fallname" && handleCreate()} />
              ))}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[
                  { key:"status",  opts:["Aktiv","Vorbereitung","Abgeschlossen","Ruhend"] },
                  { key:"instanz", opts:["Erstinstanz","Berufung","Revision"] },
                ].map(f => (
                  <select key={f.key} value={newCase[f.key]} onChange={e => setNewCase({ ...newCase, [f.key]: e.target.value })} style={{
                    padding:"9px 12px", fontSize:13,
                    background:"rgba(0,0,0,0.04)", border:`1px solid ${C.separator}`,
                    borderRadius:10, outline:"none", color:C.label,
                  }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginTop:22 }}>
              <button onClick={handleCreate} disabled={!newCase.fallname.trim() || creating} style={{
                flex:1, background:C.emerald, color:"#fff", fontSize:13, fontWeight:600,
                padding:"11px", borderRadius:12, border:"none", cursor:"pointer",
                opacity:(!newCase.fallname.trim() || creating) ? 0.45 : 1,
                boxShadow:`0 3px 12px rgba(29,185,84,0.35)`,
                transition:"opacity 0.12s",
              }}>
                {creating ? "Erstelle…" : "Fall erstellen"}
              </button>
              <button onClick={() => setShowCreate(false)} style={{
                padding:"11px 18px", fontSize:13, background:"transparent",
                border:`1px solid ${C.separator}`, borderRadius:12, color:C.label2, cursor:"pointer",
              }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, X, Scale, TrendingUp, Clock, AlertCircle, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const STATUS_CONFIG = {
  Aktiv:        { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-1 ring-emerald-200" },
  Vorbereitung: { text: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-1 ring-blue-200" },
  Abgeschlossen:{ text: "text-slate-500",   bg: "bg-slate-100",  ring: "" },
  Ruhend:       { text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-1 ring-amber-200" },
};

function PrognoseArc({ value = 0 }) {
  const color = value >= 65 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  const r = 16, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg width="40" height="40" style={{ transform: "rotate(-90deg)" }} className="absolute inset-0">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#f1f5f9" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="relative text-[10px] font-bold" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

function CaseCard({ caseData, counts }) {
  const navigate = useNavigate();
  const total = 9;
  const done = [caseData.fallname, caseData.gericht, caseData.zentrale_rechtsfrage,
    counts.args > 0, counts.evidence > 0, counts.persons > 0,
    counts.deadlines > 0, caseData.prognose, caseData.streitwert].filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const progColor = (caseData.prognose||0) >= 65 ? "#34C759" : (caseData.prognose||0) >= 40 ? "#FF9500" : "#FF3B30";

  return (
    <div
      onClick={() => navigate(`/lexara/case?id=${caseData.id}`)}
      className="cursor-pointer flex flex-col gap-0 transition-all duration-150"
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "10px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
        e.currentTarget.style.borderColor = "rgba(52,199,89,0.3)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "none";
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          {caseData.aktenzeichen && (
            <p className="font-mono mb-1" style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.05em" }}>{caseData.aktenzeichen}</p>
          )}
          <h3 className="font-semibold leading-snug" style={{ fontSize: 13, color: "#1a1a1a" }}>{caseData.fallname}</h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {caseData.status && (
              <span style={{ fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 4, background: "rgba(0,0,0,0.05)", color: "#555" }}>
                {caseData.status}
              </span>
            )}
            {caseData.rechtsgebiet && (
              <span style={{ fontSize: 10, fontWeight: 400, padding: "1px 7px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: "#777" }}>
                {caseData.rechtsgebiet}
              </span>
            )}
            {caseData.instanz && caseData.instanz !== "Erstinstanz" && (
              <span style={{ fontSize: 10, fontWeight: 400, padding: "1px 7px", borderRadius: 4, background: "rgba(0,0,0,0.04)", color: "#777" }}>
                {caseData.instanz}
              </span>
            )}
          </div>
        </div>
        {/* Prognose indicator */}
        <div className="flex-shrink-0 text-right">
          <p style={{ fontSize: 18, fontWeight: 700, color: progColor, lineHeight: 1 }}>{Math.round(caseData.prognose||0)}%</p>
          <p style={{ fontSize: 9, color: "#aaa", marginTop: 1 }}>Prognose</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex justify-between mb-1" style={{ fontSize: 10, color: "#aaa" }}>
          <span>Vollständigkeit</span>
          <span style={{ color: "#666", fontWeight: 500 }}>{pct}%</span>
        </div>
        <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: pct >= 80 ? "#34C759" : pct >= 50 ? "#FF9500" : "#ccc", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-0 px-4 pt-2.5 pb-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        {[["Argum.", counts.args], ["Beweise", counts.evidence], ["Personen", counts.persons], ["Fristen", counts.deadlines]].map(([l, v]) => (
          <div key={l} className="text-center">
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{v}</p>
            <p style={{ fontSize: 9, color: "#aaa", marginTop: 2 }}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LexaraDashboard() {
  const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ fallname: "", aktenzeichen: "", rechtsgebiet: "", status: "Aktiv", instanz: "Erstinstanz" });
  const [caseCounts, setCaseCounts] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    const [cs, args, evs, pers, deadlines] = await Promise.all([
      base44.entities.Case.list("-created_date"),
      base44.entities.Argument.filter({}),
      base44.entities.Evidence.filter({}),
      base44.entities.Person.filter({}),
      base44.entities.Deadline.filter({}),
    ]);
    setCases(cs);
    const counts = {};
    cs.forEach(c => {
      counts[c.id] = {
        args: args.filter(a => a.case_id === c.id).length,
        evidence: evs.filter(e => e.case_id === c.id).length,
        persons: pers.filter(p => p.case_id === c.id).length,
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
    setNewCase({ fallname: "", aktenzeichen: "", rechtsgebiet: "", status: "Aktiv", instanz: "Erstinstanz" });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const filtered = cases.filter(c => {
    const matchSearch = c.fallname?.toLowerCase().includes(search.toLowerCase()) ||
      c.aktenzeichen?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const aktiv = cases.filter(c => c.status === "Aktiv").length;
  const avgPrognose = cases.length ? Math.round(cases.reduce((s, c) => s + (c.prognose || 0), 0) / cases.length) : 0;
  const totalArgs = Object.values(caseCounts).reduce((s, c) => s + c.args, 0);
  const totalDeadlines = Object.values(caseCounts).reduce((s, c) => s + c.deadlines, 0);

  const sf = { fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#f0f0f0" }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "#34C759" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#f0f0f0", ...sf }}>
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 14, padding: 40, textAlign: "center", maxWidth: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 48, height: 48, background: "rgba(52,199,89,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Scale className="w-6 h-6" style={{ color: "#34C759" }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Anmeldung erforderlich</h2>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 24, lineHeight: 1.6 }}>Um Fälle zu verwalten und auf alle Funktionen zuzugreifen, bitte anmelden.</p>
          <button onClick={navigateToLogin}
            style={{ width: "100%", background: "#34C759", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <LogIn className="w-4 h-4" /> Jetzt anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#f0f0f0", ...sf }}>
      {/* Toolbar */}
      <div className="sticky top-0 z-20" style={{ background: "rgba(246,246,246,0.97)", borderBottom: "1px solid rgba(0,0,0,0.1)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3">
          <div className="mr-auto">
            <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1 }}>Fallübersicht</p>
            <p style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{cases.length} Mandate verwaltet</p>
          </div>
          <div className="relative hidden sm:block">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#aaa" }} />
            <input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 26, paddingRight: 10, width: 160, height: 28, fontSize: 12, background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, outline: "none", color: "#333" }} />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 transition-all"
            style={{ background: "#34C759", color: "#fff", fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "none" }}>
            <Plus className="w-3 h-3" /> Neuer Fall
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-5 space-y-5">
        {/* KPIs */}
        {cases.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Scale, label: "Aktive Mandate", value: aktiv },
              { icon: TrendingUp, label: "Ø Erfolgsquote", value: `${avgPrognose}%` },
              { icon: AlertCircle, label: "Argumente ges.", value: totalArgs },
              { icon: Clock, label: "Offene Fristen", value: totalDeadlines },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#aaa" }} />
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{k.value}</p>
                    <p style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{k.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "Aktiv", "Vorbereitung", "Ruhend", "Abgeschlossen"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: statusFilter===s ? 600 : 400, border: "1px solid",
                borderColor: statusFilter===s ? "#34C759" : "rgba(0,0,0,0.1)",
                background: statusFilter===s ? "rgba(52,199,89,0.1)" : "#fff",
                color: statusFilter===s ? "#1a7f37" : "#666", transition: "all 0.12s",
              }}>
              {s === "all" ? "Alle" : s}
              {s !== "all" && <span style={{ marginLeft: 5, opacity: 0.5, fontSize: 10 }}>{cases.filter(c => c.status === s).length}</span>}
            </button>
          ))}
        </div>

        {/* Cases grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "#34C759" }} />
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <CaseCard key={c.id} caseData={c} counts={caseCounts[c.id] || { args: 0, evidence: 0, persons: 0, deadlines: 0 }} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div style={{ width: 44, height: 44, background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Scale className="w-5 h-5" style={{ color: "#ccc" }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 4 }}>
              {search || statusFilter !== "all" ? "Keine Treffer" : "Noch keine Fälle"}
            </p>
            <p style={{ fontSize: 11, color: "#aaa" }}>
              {search || statusFilter !== "all" ? "Filter oder Suche anpassen" : "Neuen Fall anlegen um zu beginnen"}
            </p>
          </div>
        )}
      </div>

      {/* Create modal — Numbers-style sheet dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}
          onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div style={{ background: "rgba(248,248,248,0.98)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", ...sf }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Neuen Fall anlegen</h2>
                <p style={{ fontSize: 11, color: "#999", marginTop: 2 }}>Grunddaten — weitere Details im Fall</p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ color: "#aaa", padding: 4, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {[
                { ph: "Fallname *", key: "fallname", full: true },
                { ph: "Aktenzeichen", key: "aktenzeichen" },
                { ph: "Rechtsgebiet", key: "rechtsgebiet" },
              ].map(f => (
                <input key={f.key}
                  className={f.full ? "w-full" : ""}
                  style={{ display: "block", width: "100%", padding: "8px 10px", fontSize: 12, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 7, outline: "none", color: "#1a1a1a" }}
                  placeholder={f.ph} value={newCase[f.key]} onChange={e => setNewCase({ ...newCase, [f.key]: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && f.key === "fallname" && handleCreate()} />
              ))}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: "status", opts: ["Aktiv","Vorbereitung","Abgeschlossen","Ruhend"] },
                  { key: "instanz", opts: ["Erstinstanz","Berufung","Revision"] },
                ].map(f => (
                  <select key={f.key} value={newCase[f.key]} onChange={e => setNewCase({ ...newCase, [f.key]: e.target.value })}
                    style={{ padding: "8px 10px", fontSize: 12, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 7, outline: "none", color: "#1a1a1a" }}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleCreate} disabled={!newCase.fallname.trim() || creating}
                style={{ flex: 1, background: "#34C759", color: "#fff", fontSize: 12, fontWeight: 600, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer", opacity: (!newCase.fallname.trim() || creating) ? 0.5 : 1 }}>
                {creating ? "Erstelle…" : "Fall erstellen"}
              </button>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: "9px 16px", fontSize: 12, background: "transparent", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, color: "#555", cursor: "pointer" }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
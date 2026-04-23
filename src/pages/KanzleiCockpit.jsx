import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import { ChevronRight, AlertTriangle, TrendingUp, Scale, Clock, Search, CheckCircle2, Circle, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const SF = { fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" };

function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      padding: "22px 24px",
      ...SF,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg || "rgba(0,0,0,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon style={{ width: 20, height: 20, color: iconColor || "#888" }} />
        </div>
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#888", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function SectionCard({ title, children, action }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
      ...SF,
    }}>
      <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</p>
        {action}
      </div>
      <div style={{ padding: "16px 24px 22px" }}>
        {children}
      </div>
    </div>
  );
}

function getRisikoLevel(c) {
  const p = c.prognose || 0;
  if (p >= 65) return "niedrig";
  if (p >= 40) return "mittel";
  return "hoch";
}

export default function KanzleiCockpit() {
  const navigate = useNavigate();
  const { language } = useUserProfile();
  const t = getTByLanguage(language);
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Case.list("-updated_date", 100),
      base44.entities.Deadline.list("-due_date", 200),
      base44.entities.Task.list("-created_date", 50),
    ]).then(([c, d, tk]) => { setCases(c); setDeadlines(d); setTasks(tk); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f2f2f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(0,0,0,0.1)", borderTopColor: "#34C759", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const aktiv = cases.filter(c => c.status === "Aktiv");
  const gesamtStreitwert = cases.reduce((s, c) => s + (c.streitwert || 0), 0);
  const avgPrognose = cases.length ? Math.round(cases.reduce((s, c) => s + (c.prognose || 0), 0) / cases.length) : 0;
  const today = new Date();
  const naechsteFristen = deadlines
    .filter(d => d.status === "offen" && new Date(d.due_date) > today)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 6);
  const ueberfaellig = deadlines.filter(d => d.status === "offen" && new Date(d.due_date) < today);

  const risikoVerteilung = [
    { name: "Niedrig", value: cases.filter(c => (c.prognose || 0) >= 65).length, color: "#34C759" },
    { name: "Mittel",  value: cases.filter(c => (c.prognose || 0) >= 40 && (c.prognose || 0) < 65).length, color: "#FF9500" },
    { name: "Hoch",    value: cases.filter(c => (c.prognose || 0) < 40).length, color: "#FF3B30" },
  ];

  const rechtsgebietData = Object.entries(
    cases.reduce((acc, c) => { const rg = c.rechtsgebiet || "Sonstige"; acc[rg] = (acc[rg] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const hochrisikoFaelle = cases.filter(c => (c.prognose || 0) < 40 && c.status === "Aktiv").slice(0, 5);
  const topChancen = cases.filter(c => (c.prognose || 0) >= 70 && c.status === "Aktiv").slice(0, 5);

  const nextDeadlineMap = {};
  deadlines.filter(d => d.status === "offen" && new Date(d.due_date) >= today)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .forEach(d => { if (!nextDeadlineMap[d.case_id]) nextDeadlineMap[d.case_id] = d; });

  const openTasks = tasks.filter(tk => tk.status !== "erledigt")
    .sort((a, b) => new Date(a.due_date || "9999") - new Date(b.due_date || "9999"))
    .slice(0, 6);

  const filteredCases = cases.filter(c => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return c.fallname?.toLowerCase().includes(q) || c.aktenzeichen?.toLowerCase().includes(q) || c.rechtsgebiet?.toLowerCase().includes(q);
  });

  const loc = language === "EN" ? "en-US" : language === "FR" ? "fr-FR" : "de-DE";

  return (
    <div style={{ minHeight: "100vh", background: "#f2f2f7", ...SF }}>
      {/* Top bar */}
      <div style={{ background: "rgba(242,242,247,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.2px" }}>{t.cockpitTitle}</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{t.portfolioSub(cases.length)}</p>
          </div>
          <Link to="/lexara" style={{
            background: "#34C759", color: "#fff", fontSize: 13, fontWeight: 600,
            padding: "9px 18px", borderRadius: 12, border: "none", cursor: "pointer",
            textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 8px rgba(52,199,89,0.3)",
          }}>
            + {t.newCaseLinkLabel}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KpiCard icon={Briefcase} label={t.aktiveFaelleLabel} value={aktiv.length} sub={`${cases.length} ${t.allMandatesSub}`} iconBg="rgba(0,122,255,0.12)" iconColor="#007AFF" />
          <KpiCard icon={Scale} label={t.totalClaimLabel} value={`${(gesamtStreitwert/1000000).toFixed(1)}M€`} sub={t.allMandatesSub} iconBg="rgba(52,199,89,0.12)" iconColor="#34C759" />
          <KpiCard icon={TrendingUp} label={t.avgPrognosisLabel} value={`${avgPrognose}%`} sub={t.weightedAvgSub} iconBg="rgba(255,149,0,0.12)" iconColor="#FF9500" />
          <KpiCard icon={AlertTriangle} label={t.overdueDeadlinesLabel} value={ueberfaellig.length}
            sub={ueberfaellig.length > 0 ? t.actNow : t.allOnTrack}
            iconBg={ueberfaellig.length > 0 ? "rgba(255,59,48,0.12)" : "rgba(52,199,89,0.12)"}
            iconColor={ueberfaellig.length > 0 ? "#FF3B30" : "#34C759"} />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
          <SectionCard title={t.risikoverteilung}>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={risikoVerteilung} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={4}>
                  {risikoVerteilung.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ` Fälle`, n]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
              {risikoVerteilung.map(r => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: r.color }} />
                  <span style={{ fontSize: 11, color: "#888" }}>{r.name} <strong style={{ color: "#444" }}>({r.value})</strong></span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t.faelleNachRechtsgebiet}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rechtsgebietData} layout="vertical" margin={{ left: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} width={120} />
                <Tooltip formatter={v => [v + " Fälle"]} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12 }} />
                <Bar dataKey="value" fill="#007AFF" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Risk + Chancen */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Hochrisiko */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: 20, border: "1px solid rgba(255,59,48,0.12)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,59,48,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle style={{ width: 16, height: 16, color: "#FF3B30" }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#FF3B30", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.highRiskLabel}</p>
            </div>
            {hochrisikoFaelle.length === 0 ? (
              <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "20px 0" }}>{t.noHighRisk}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hochrisikoFaelle.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lexara/case?id=${c.id}`)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,59,48,0.05)", border: "1px solid rgba(255,59,48,0.1)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.fallname}</p>
                      <p style={{ fontSize: 11, color: "#aaa" }}>{c.rechtsgebiet || "—"}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#FF3B30" }}>{c.prognose || 0}%</span>
                      <ChevronRight style={{ width: 14, height: 14, color: "#ccc" }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Top Chancen */}
          <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: 20, border: "1px solid rgba(52,199,89,0.12)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(52,199,89,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp style={{ width: 16, height: 16, color: "#34C759" }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#34C759", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.topChancesLabel}</p>
            </div>
            {topChancen.length === 0 ? (
              <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "20px 0" }}>{t.noTopChancesText}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {topChancen.map(c => (
                  <button key={c.id} onClick={() => navigate(`/lexara/case?id=${c.id}`)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(52,199,89,0.05)", border: "1px solid rgba(52,199,89,0.1)", borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.fallname}</p>
                      <p style={{ fontSize: 11, color: "#aaa" }}>{c.rechtsgebiet || "—"}{c.streitwert ? ` · ${(c.streitwert/1000).toFixed(0)}k€` : ""}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#34C759" }}>{c.prognose || 0}%</span>
                      <ChevronRight style={{ width: 14, height: 14, color: "#ccc" }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fristen */}
        <SectionCard
          title={t.nextDeadlinesLabel}
          action={<Link to="/zeitleiste" style={{ fontSize: 13, color: "#007AFF", fontWeight: 600, textDecoration: "none" }}>{t.showAllLink}</Link>}
        >
          {naechsteFristen.length === 0 ? (
            <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "16px 0" }}>{t.noOpenDeadlinesText}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {naechsteFristen.map((d, i) => {
                const days = Math.ceil((new Date(d.due_date) - today) / 86400000);
                const c = cases.find(ca => ca.id === d.case_id);
                const urgColor = days <= 3 ? "#FF3B30" : days <= 7 ? "#FF9500" : "#007AFF";
                const urgBg = days <= 3 ? "rgba(255,59,48,0.08)" : days <= 7 ? "rgba(255,149,0,0.08)" : "rgba(0,122,255,0.08)";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < naechsteFristen.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: urgBg, color: urgColor, minWidth: 36, textAlign: "center" }}>
                        {days}T
                      </span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{d.title}</p>
                        <p style={{ fontSize: 11, color: "#aaa" }}>{c?.fallname || "—"}{d.frist_type ? ` · ${d.frist_type}` : ""}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{new Date(d.due_date).toLocaleDateString(loc)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Aufgaben */}
        <SectionCard
          title={language === "EN" ? "Upcoming Tasks" : "Anstehende Aufgaben"}
          action={<Link to="/aufgaben" style={{ fontSize: 13, color: "#007AFF", fontWeight: 600, textDecoration: "none" }}>{language === "EN" ? "View all →" : "Alle anzeigen →"}</Link>}
        >
          {openTasks.length === 0 ? (
            <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "16px 0" }}>{language === "EN" ? "No open tasks ✓" : "Keine offenen Aufgaben ✓"}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {openTasks.map((task, i) => {
                const daysLeft = task.due_date ? Math.ceil((new Date(task.due_date) - new Date()) / 86400000) : null;
                const urgColor = daysLeft !== null && daysLeft <= 0 ? "#FF3B30" : daysLeft !== null && daysLeft <= 3 ? "#FF9500" : "#aaa";
                const pColors = { hoch: { bg: "rgba(255,59,48,0.1)", c: "#FF3B30" }, mittel: { bg: "rgba(255,149,0,0.1)", c: "#FF9500" }, niedrig: { bg: "rgba(52,199,89,0.1)", c: "#34C759" } };
                const pc = pColors[task.priority] || { bg: "rgba(0,0,0,0.05)", c: "#888" };
                return (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < openTasks.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {task.status === "in_bearbeitung"
                        ? <Clock style={{ width: 15, height: 15, color: "#007AFF", flexShrink: 0 }} />
                        : <Circle style={{ width: 15, height: 15, color: "#ccc", flexShrink: 0 }} />}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                        {task.case_name && <p style={{ fontSize: 11, color: "#aaa" }}>{task.case_name}</p>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {task.priority && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 7, fontWeight: 600, background: pc.bg, color: pc.c }}>
                          {task.priority}
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span style={{ fontSize: 12, color: urgColor, fontWeight: 500 }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}T überf.` : daysLeft === 0 ? "Heute" : `${daysLeft}T`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Mandats-Tabelle */}
        <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{t.allMandatesLabel}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <Search style={{ width: 13, height: 13, position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#bbb" }} />
                <input value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                  placeholder={language === "EN" ? "Search…" : "Suchen…"}
                  style={{ paddingLeft: 28, paddingRight: 12, height: 32, fontSize: 12, background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, outline: "none", width: 180, color: "#333" }} />
              </div>
              <span style={{ fontSize: 11, color: "#bbb" }}>{t.entriesLabel(filteredCases.length)}</span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  {["", t.tableHeaderCase, t.rechtsgebiet, t.tableHeaderCourt, t.tableHeaderClaimValue, t.prognose, t.tableHeaderStatus, "Aktualisiert", "Nächste Frist", ""].map((h, i) => (
                    <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c, ri) => {
                  const nextDl = nextDeadlineMap[c.id];
                  const dlDays = nextDl ? Math.ceil((new Date(nextDl.due_date) - new Date()) / 86400000) : null;
                  const rl = getRisikoLevel(c);
                  const dotColor = rl === "niedrig" ? "#34C759" : rl === "mittel" ? "#FF9500" : "#FF3B30";
                  return (
                    <tr key={c.id}
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      onClick={() => navigate(`/lexara/case?id=${c.id}`)}>
                      <td style={{ paddingLeft: 20, paddingTop: 14, paddingBottom: 14 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor }} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.fallname}</p>
                        {c.aktenzeichen && <p style={{ fontSize: 10, color: "#bbb", fontFamily: "monospace", marginTop: 1 }}>{c.aktenzeichen}</p>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#888", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.rechtsgebiet || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#888" }}>{c.gericht || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, fontWeight: 500, color: "#555" }}>{c.streitwert ? `${(c.streitwert/1000).toFixed(0)}k€` : "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 40, height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${c.prognose || 0}%`, background: (c.prognose||0) >= 65 ? "#34C759" : (c.prognose||0) >= 40 ? "#FF9500" : "#FF3B30" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>{c.prognose || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 8, fontWeight: 600,
                          background: c.status === "Aktiv" ? "rgba(0,122,255,0.1)" : c.status === "Abgeschlossen" ? "rgba(52,199,89,0.1)" : c.status === "Vorbereitung" ? "rgba(255,149,0,0.1)" : "rgba(0,0,0,0.05)",
                          color: c.status === "Aktiv" ? "#007AFF" : c.status === "Abgeschlossen" ? "#34C759" : c.status === "Vorbereitung" ? "#FF9500" : "#888",
                        }}>{c.status || "—"}</span>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 11, color: "#bbb" }}>
                        {c.updated_date ? new Date(c.updated_date).toLocaleDateString(loc) : "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {nextDl ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: dlDays !== null && dlDays <= 7 ? "#FF3B30" : dlDays !== null && dlDays <= 14 ? "#FF9500" : "#aaa" }}>
                            {new Date(nextDl.due_date).toLocaleDateString(loc)}
                          </span>
                        ) : <span style={{ fontSize: 11, color: "#ddd" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}><ChevronRight style={{ width: 14, height: 14, color: "#ddd" }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
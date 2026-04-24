import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Users, FileText, RefreshCw, Trophy, Timer } from "lucide-react";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getT, getTByLanguage } from "../lib/jurisdictionConfig";
import { useUserProfile } from "../hooks/useUserProfile";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart, ReferenceLine,
} from "recharts";
import FallAnalyseModal from "../components/dashboard/FallAnalyseModal";
import AkteureAnalytik from "../components/lexara/AkteureAnalytik";
import KonzernRechtsgebietDashboard from "../components/lexara/KonzernRechtsgebietDashboard";

const SF = { fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" };
const APPLE_COLORS = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#5856D6", "#AF52DE", "#FF2D55", "#00C7BE"];

// ── Reusable Apple-style card ──────────────────────────────────────────────────
function AppleCard({ title, children, style = {} }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
      ...style,
    }}>
      {title && (
        <div style={{ padding: "20px 24px 0" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</p>
        </div>
      )}
      <div style={{ padding: title ? "14px 24px 22px" : "22px 24px" }}>
        {children}
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <AppleCard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg || "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 20, height: 20, color: iconColor || "#888" }} />
        </div>
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#888", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>{sub}</p>}
    </AppleCard>
  );
}

// ── Erfolgsrate Gauge ─────────────────────────────────────────────────────────
function ErfolgsrateGauge({ rate }) {
  const r = 70, circ = 2 * Math.PI * r;
  const half = circ / 2;
  const offset = half - (rate / 100) * half;
  const color = rate >= 65 ? "#34C759" : rate >= 40 ? "#FF9500" : "#FF3B30";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={180} height={110} viewBox="0 0 180 110">
        {/* Track */}
        <path d={`M 20 95 A ${r} ${r} 0 0 1 160 95`} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={12} strokeLinecap="round" />
        {/* Fill */}
        <path d={`M 20 95 A ${r} ${r} 0 0 1 160 95`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={half} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        {/* Value */}
        <text x="90" y="86" textAnchor="middle" fontSize="26" fontWeight="700" fill="#1a1a1a" fontFamily="-apple-system">{rate}%</text>
        <text x="90" y="104" textAnchor="middle" fontSize="10" fill="#aaa" fontFamily="-apple-system">Ø Erfolgsrate</text>
      </svg>
      <div style={{ display: "flex", gap: 16 }}>
        {[["Hoch ≥65%","#34C759"],["Mittel ≥40%","#FF9500"],["Niedrig","#FF3B30"]].map(([l,c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 10, color: "#aaa" }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KanzleiAnalytik() {
  const [cases, setCases] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [arguments_, setArguments] = useState([]);
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterLabel, setFilterLabel] = useState(null);
  const [filteredCases, setFilteredCases] = useState([]);
  const { jurisdiction } = useJurisdiction();
  const { language } = useUserProfile();
  const t = language === "EN" || language === "FR" ? getTByLanguage(language) : getT(jurisdiction);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cs, dl, args, qs] = await Promise.all([
      base44.entities.Case.list(),
      base44.entities.Deadline.list(),
      base44.entities.Argument.list(),
      base44.entities.CaseQuestionnaire.list().catch(() => []),
    ]);
    setCases(cs || []);
    setDeadlines(dl || []);
    setArguments(args || []);
    setQuestionnaires(qs || []);
    setLoading(false);
  };

  // ── Core metrics ──────────────────────────────────────────────────────────
  const activeCases = cases.filter(c => c.status === "Aktiv").length;
  const closedCases = cases.filter(c => c.status === "Abgeschlossen");
  const openDeadlines = deadlines.filter(d => d.status === "offen").length;
  const overdueDeadlines = deadlines.filter(d => d.status === "offen" && new Date(d.due_date) < new Date()).length;
  const avgPrognose = cases.length
    ? Math.round(cases.filter(c => c.prognose).reduce((a, c) => a + (c.prognose || 0), 0) / (cases.filter(c => c.prognose).length || 1))
    : 0;

  // ── ERFOLGSRATE: aus abgeschlossenen Fällen + Fragebögen ──────────────────
  // Basis: Prognose der abgeschlossenen Fälle >= 50 = "gewonnen"
  const gewonnenCases = closedCases.filter(c => (c.prognose || 0) >= 50).length;
  const erfolgsrate = closedCases.length > 0 ? Math.round((gewonnenCases / closedCases.length) * 100) : avgPrognose;

  // Ergänze mit Fragebögen wenn vorhanden
  const qGewonnen = questionnaires.filter(q => q.ziel_erreicht === true).length;
  const qGesamt = questionnaires.filter(q => q.ziel_erreicht !== undefined && q.ziel_erreicht !== null).length;
  const erfolgsrateAnzeige = qGesamt > 0 ? Math.round((qGewonnen / qGesamt) * 100) : erfolgsrate;

  // Erfolgsrate pro Rechtsgebiet
  const erfolgsNachRG = Object.entries(
    cases.filter(c => c.status === "Abgeschlossen" && c.rechtsgebiet).reduce((acc, c) => {
      const rg = c.rechtsgebiet;
      if (!acc[rg]) acc[rg] = { total: 0, won: 0 };
      acc[rg].total++;
      if ((c.prognose || 0) >= 50) acc[rg].won++;
      return acc;
    }, {})
  ).map(([name, { total, won }]) => ({ name, rate: Math.round((won / total) * 100), total }))
    .filter(d => d.total >= 1)
    .sort((a, b) => b.rate - a.rate).slice(0, 7);

  // Erfolgsrate nach Gericht
  const erfolgsNachGericht = Object.entries(
    cases.filter(c => c.status === "Abgeschlossen" && c.gericht).reduce((acc, c) => {
      const g = c.gericht;
      if (!acc[g]) acc[g] = { total: 0, won: 0 };
      acc[g].total++;
      if ((c.prognose || 0) >= 50) acc[g].won++;
      return acc;
    }, {})
  ).map(([name, { total, won }]) => ({ name: name.slice(0, 20), rate: Math.round((won / total) * 100), total }))
    .filter(d => d.total >= 1)
    .sort((a, b) => b.rate - a.rate).slice(0, 5);

  // ── VERFAHRENSDAUER ───────────────────────────────────────────────────────
  // Aus CaseQuestionnaire.dauer_monate oder aus Case.created_date → abgeschlossen
  const dauerWerte = [
    ...questionnaires.filter(q => q.dauer_monate > 0).map(q => ({ monate: q.dauer_monate, name: q.case_name || "Fall" })),
    ...closedCases
      .filter(c => c.created_date && !questionnaires.find(q => q.case_id === c.id))
      .map(c => {
        const start = new Date(c.created_date);
        const end = new Date(c.updated_date || Date.now());
        const monate = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)));
        return { monate, name: c.fallname?.slice(0, 20) || "Fall" };
      }),
  ].slice(0, 10);

  const avgDauer = dauerWerte.length > 0
    ? Math.round(dauerWerte.reduce((s, d) => s + d.monate, 0) / dauerWerte.length)
    : null;

  // Dauer nach Rechtsgebiet
  const dauerNachRG = Object.entries(
    cases.filter(c => c.status === "Abgeschlossen" && c.rechtsgebiet && c.created_date).reduce((acc, c) => {
      const rg = c.rechtsgebiet;
      const q = questionnaires.find(q => q.case_id === c.id);
      const monate = q?.dauer_monate || Math.max(1, Math.round((new Date(c.updated_date || Date.now()) - new Date(c.created_date)) / (1000 * 60 * 60 * 24 * 30)));
      if (!acc[rg]) acc[rg] = [];
      acc[rg].push(monate);
      return acc;
    }, {})
  ).map(([name, arr]) => ({ name, avg: Math.round(arr.reduce((s,v)=>s+v,0)/arr.length), count: arr.length }))
    .sort((a, b) => b.avg - a.avg).slice(0, 6);

  // ── Chart data ────────────────────────────────────────────────────────────
  const statusData = ["Aktiv", "Vorbereitung", "Abgeschlossen", "Ruhend"]
    .map(s => ({ name: s, value: cases.filter(c => c.status === s).length }))
    .filter(d => d.value > 0);

  const rechtsgebietMap = {};
  cases.forEach(c => { if (c.rechtsgebiet) rechtsgebietMap[c.rechtsgebiet] = (rechtsgebietMap[c.rechtsgebiet] || 0) + 1; });
  const rechtsgebietData = Object.entries(rechtsgebietMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count).slice(0, 7);

  const fristenData = [
    { name: "Offen", value: deadlines.filter(d => d.status === "offen" && new Date(d.due_date) >= new Date()).length },
    { name: "Überfällig", value: overdueDeadlines },
    { name: "Erledigt", value: deadlines.filter(d => d.status === "erledigt").length },
    { name: "Versäumt", value: deadlines.filter(d => d.status === "versaeumt").length },
  ].filter(d => d.value > 0);

  const prognoseRanges = [
    { name: "0–25%",   count: cases.filter(c => (c.prognose || 0) <= 25).length,  fill: "#FF3B30" },
    { name: "26–50%",  count: cases.filter(c => (c.prognose || 0) > 25 && (c.prognose || 0) <= 50).length, fill: "#FF9500" },
    { name: "51–75%",  count: cases.filter(c => (c.prognose || 0) > 50 && (c.prognose || 0) <= 75).length, fill: "#007AFF" },
    { name: "76–100%", count: cases.filter(c => (c.prognose || 0) > 75).length,  fill: "#34C759" },
  ];

  const instanzMap = {};
  cases.forEach(c => { if (c.instanz) instanzMap[c.instanz] = (instanzMap[c.instanz] || 0) + 1; });
  const instanzData = Object.entries(instanzMap).map(([name, value]) => ({ name, value }));

  const upcoming = deadlines
    .filter(d => d.status === "offen")
    .map(d => ({ ...d, daysLeft: Math.ceil((new Date(d.due_date) - new Date()) / 86400000) }))
    .filter(d => d.daysLeft >= 0 && d.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  const tooltipStyle = { borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12, fontFamily: SF.fontFamily };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f2f2f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(0,0,0,0.1)", borderTopColor: "#007AFF", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f2f2f7", ...SF, paddingBottom: 60 }}>
      {/* Top bar */}
      <div style={{ background: "rgba(242,242,247,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.2px" }}>{t.module?.[5]?.title || "Kanzlei-Analytik"}</p>
            <p style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{t.mandatesSub(cases.length, activeCases)}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowModal(true)} style={{
              background: "#007AFF", color: "#fff", fontSize: 13, fontWeight: 600,
              padding: "9px 18px", borderRadius: 12, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(0,122,255,0.3)",
            }}>
              <TrendingUp style={{ width: 15, height: 15 }} /> {t.kiFallanalyse}
            </button>
            <button onClick={loadData} style={{ padding: 8, borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.8)", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <RefreshCw style={{ width: 15, height: 15, color: "#888" }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          <KpiCard icon={FileText} label={t.aktiveFaelleLabel} value={activeCases} sub={t.ofTotalLabel(cases.length)} iconBg="rgba(0,122,255,0.12)" iconColor="#007AFF" />
          <KpiCard icon={AlertTriangle} label={t.offeeneFristenLabel} value={openDeadlines}
            sub={overdueDeadlines > 0 ? `${overdueDeadlines} überfällig` : t.allOnTrack}
            iconBg={overdueDeadlines > 0 ? "rgba(255,59,48,0.12)" : "rgba(52,199,89,0.12)"}
            iconColor={overdueDeadlines > 0 ? "#FF3B30" : "#34C759"} />
          <KpiCard icon={TrendingUp} label={t.avgPrognoseLabel} value={`${avgPrognose}%`} sub={t.winProbabilityLabel} iconBg="rgba(255,149,0,0.12)" iconColor="#FF9500" />
          <KpiCard icon={Users} label={t.argumenteLabel} value={arguments_.length} sub={t.totalRecordedLabel} iconBg="rgba(88,86,214,0.12)" iconColor="#5856D6" />
        </div>

        {/* ══ ERFOLGSRATE & DAUER (NEU – prominent oben) ══════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Erfolgsrate Gauge + Breakdown */}
          <AppleCard title="Erfolgsrate bei Gericht">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <ErfolgsrateGauge rate={erfolgsrateAnzeige} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>Basis</p>
                  <p style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 600 }}>
                    {qGesamt > 0 ? `${qGewonnen} von ${qGesamt} Fragebögen` : `${gewonnenCases} von ${closedCases.length} Abgeschlossene`}
                  </p>
                  <p style={{ fontSize: 11, color: "#aaa", marginTop: 10, marginBottom: 4 }}>Ø Prognose (alle Fälle)</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, width: `${avgPrognose}%`, background: avgPrognose >= 65 ? "#34C759" : avgPrognose >= 40 ? "#FF9500" : "#FF3B30" }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{avgPrognose}%</span>
                  </div>
                </div>
              </div>

              {/* Erfolgsrate nach Rechtsgebiet */}
              {erfolgsNachRG.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Nach Rechtsgebiet</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {erfolgsNachRG.map(d => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: "#555", minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                        <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${d.rate}%`, background: d.rate >= 65 ? "#34C759" : d.rate >= 40 ? "#FF9500" : "#FF3B30", transition: "width 0.6s ease" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: d.rate >= 65 ? "#34C759" : d.rate >= 40 ? "#FF9500" : "#FF3B30", minWidth: 35, textAlign: "right" }}>{d.rate}%</span>
                        <span style={{ fontSize: 10, color: "#ccc" }}>({d.total})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {closedCases.length === 0 && (
                <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "8px 0" }}>Noch keine abgeschlossenen Fälle vorhanden.</p>
              )}
            </div>
          </AppleCard>

          {/* Verfahrensdauer */}
          <AppleCard title="Ø Verfahrensdauer">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Große Kennzahl */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(88,86,214,0.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <Timer style={{ width: 28, height: 28, color: "#5856D6", marginBottom: 2 }} />
                </div>
                <div>
                  <p style={{ fontSize: 36, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-1px", lineHeight: 1 }}>
                    {avgDauer !== null ? avgDauer : "—"}
                  </p>
                  <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Monate (Ø abgeschl. Fälle)</p>
                  {avgDauer !== null && (
                    <p style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>= ca. {Math.round(avgDauer / 12 * 10) / 10} Jahre</p>
                  )}
                </div>
              </div>

              {/* Dauer pro Fall (Balken) */}
              {dauerWerte.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Einzelne Fälle</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={dauerWerte} margin={{ left: -10, right: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#bbb" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#bbb" }} allowDecimals={false} unit="M" />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [v + " Monate"]} />
                      <ReferenceLine y={avgDauer} stroke="#5856D6" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "Ø", fill: "#5856D6", fontSize: 10 }} />
                      <Bar dataKey="monate" fill="#5856D6" radius={[6, 6, 0, 0]} name="Monate" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Dauer nach Rechtsgebiet */}
              {dauerNachRG.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Nach Rechtsgebiet</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {dauerNachRG.map(d => {
                      const maxDauer = Math.max(...dauerNachRG.map(x => x.avg));
                      return (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#555", minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                          <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 3, width: `${(d.avg / maxDauer) * 100}%`, background: "#5856D6", transition: "width 0.6s ease" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#5856D6", minWidth: 40, textAlign: "right" }}>{d.avg}M</span>
                          <span style={{ fontSize: 10, color: "#ccc" }}>({d.count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {dauerWerte.length === 0 && (
                <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", padding: "8px 0" }}>Noch keine abgeschlossenen Fälle oder Fragebögen.</p>
              )}
            </div>
          </AppleCard>
        </div>

        {/* Erfolgsrate nach Gericht */}
        {erfolgsNachGericht.length > 0 && (
          <AppleCard title="Erfolgsrate nach Gericht">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={erfolgsNachGericht} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
                <YAxis tick={{ fontSize: 11, fill: "#aaa" }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [v + "%", "Erfolgsrate"]} />
                <ReferenceLine y={50} stroke="rgba(0,0,0,0.1)" strokeDasharray="4 3" />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]} name="Erfolgsrate">
                  {erfolgsNachGericht.map((d, i) => (
                    <Cell key={i} fill={d.rate >= 65 ? "#34C759" : d.rate >= 40 ? "#FF9500" : "#FF3B30"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AppleCard>
        )}

        {/* ══ Standard Charts ════════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <AppleCard title={t.faelleNachRechtsgebiet}>
            {filterLabel && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "#1a1a1a" }}>Filter: <strong style={{ color: "#007AFF" }}>{filterLabel}</strong> · {filteredCases.length} Fälle</p>
                <button onClick={() => { setFilterLabel(null); setFilteredCases([]); }} style={{ fontSize: 11, color: "#aaa", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{t.filterResetBtn}</button>
              </div>
            )}
            {rechtsgebietData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rechtsgebietData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  onClick={data => { if (!data?.activePayload) return; const l = data.activePayload[0]?.payload?.name; if (!l) return; setFilterLabel(l); setFilteredCases(cases.filter(c => c.rechtsgebiet === l)); }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#aaa" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="count" fill="#007AFF" radius={[8, 8, 0, 0]} name="Fälle" style={{ cursor: "pointer" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>{t.noDataShort}</div>
            )}
          </AppleCard>

          <AppleCard title={t.statusVerteilung}>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" nameKey="name" paddingAngle={4}>
                    {statusData.map((_, i) => <Cell key={i} fill={APPLE_COLORS[i % APPLE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>{t.noDataShort}</div>
            )}
          </AppleCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <AppleCard title={t.prognoseVerteilung}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={prognoseRanges} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
                <YAxis tick={{ fontSize: 11, fill: "#aaa" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Fälle" radius={[8, 8, 0, 0]}>
                  {prognoseRanges.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AppleCard>

          <AppleCard title={t.fristenUebersicht}>
            {fristenData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fristenData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={4}>
                    {fristenData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "Überfällig" ? "#FF3B30" : entry.name === "Versäumt" ? "#FF9500" : entry.name === "Erledigt" ? "#34C759" : "#007AFF"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>{t.noDeadlinesShort}</div>
            )}
          </AppleCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <AppleCard title={t.naechste14Tage}>
            {upcoming.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {upcoming.map((d, i) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < upcoming.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{d.title}</p>
                      <p style={{ fontSize: 11, color: "#aaa" }}>{d.frist_type || "Frist"}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
                      background: d.daysLeft <= 2 ? "rgba(255,59,48,0.1)" : d.daysLeft <= 5 ? "rgba(255,149,0,0.1)" : "rgba(0,122,255,0.1)",
                      color: d.daysLeft <= 2 ? "#FF3B30" : d.daysLeft <= 5 ? "#FF9500" : "#007AFF",
                    }}>
                      {d.daysLeft === 0 ? t.todayShort : `${d.daysLeft}T`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>{t.noUpcomingShort}</div>
            )}
          </AppleCard>

          <AppleCard title={t.instanzVerteilung}>
            {instanzData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={instanzData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" paddingAngle={4}>
                    {instanzData.map((_, i) => <Cell key={i} fill={APPLE_COLORS[i % APPLE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>{t.noDataShort}</div>
            )}
          </AppleCard>
        </div>

        <AkteureAnalytik />

        {/* ══ KONZERN-BENCHMARKS ══════════════════════════════════════════ */}
        <KonzernRechtsgebietDashboard cases={cases} questionnaires={questionnaires} />

      </div>

      {showModal && (
        <FallAnalyseModal cases={cases} jurisdiction={jurisdiction} t={t} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
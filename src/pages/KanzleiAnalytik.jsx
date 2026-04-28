import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
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
// SwiftUI-aligned monochrome palette — graphs still distinguishable
const APPLE_COLORS = ["#0A84FF","#1DB954","#636366","#8E8E93","#3A3A3C","#48484A","#30D158","#0071E3"];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.38, ease: [0.4, 0, 0.2, 1] } }),
};

// ── SwiftUI-style card ────────────────────────────────────────────────────────
function AppleCard({ title, children, style = {}, animIndex = 0 }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={animIndex}
      style={{
        background: "#FFFFFF",
        borderRadius: 22,
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
        ...style,
      }}
    >
      {title && (
        <div style={{ padding: "22px 28px 0" }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#AEAEB2", textTransform: "uppercase", letterSpacing: "0.09em" }}>{title}</p>
        </div>
      )}
      <div style={{ padding: title ? "16px 28px 28px" : "28px" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor, animIndex = 0 }) {
  return (
    <AppleCard animIndex={animIndex}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, background: iconBg || "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 20, height: 20, color: iconColor || "#8E8E93" }} />
        </div>
      </div>
      <p style={{ fontSize: 32, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: "#AEAEB2", marginTop: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "#C7C7CC", marginTop: 4 }}>{sub}</p>}
    </AppleCard>
  );
}

// ── Erfolgsrate Gauge ─────────────────────────────────────────────────────────
function ErfolgsrateGauge({ rate }) {
  const r = 70, circ = 2 * Math.PI * r;
  const half = circ / 2;
  const offset = half - (rate / 100) * half;
  const color = rate >= 65 ? "#1DB954" : rate >= 40 ? "#636366" : "#B81C3A";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg width={180} height={110} viewBox="0 0 180 110">
        <path d={`M 20 95 A ${r} ${r} 0 0 1 160 95`} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={12} strokeLinecap="round" />
        <path d={`M 20 95 A ${r} ${r} 0 0 1 160 95`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={half} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x="90" y="84" textAnchor="middle" fontSize="27" fontWeight="700" fill="#1C1C1E" fontFamily="-apple-system" letterSpacing="-2">{rate}%</text>
        <text x="90" y="103" textAnchor="middle" fontSize="10" fill="#AEAEB2" fontFamily="-apple-system" letterSpacing="0.5">Ø ERFOLGSRATE</text>
      </svg>
      <div style={{ display: "flex", gap: 18 }}>
        {[["≥65% Hoch","#1DB954"],["≥40% Mittel","#636366"],["Niedrig","#B81C3A"]].map(([l,c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
            <span style={{ fontSize: 10, color: "#AEAEB2" }}>{l}</span>
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
    { name: "0–25%",   count: cases.filter(c => (c.prognose || 0) <= 25).length,  fill: "#B81C3A" },
    { name: "26–50%",  count: cases.filter(c => (c.prognose || 0) > 25 && (c.prognose || 0) <= 50).length, fill: "#8E8E93" },
    { name: "51–75%",  count: cases.filter(c => (c.prognose || 0) > 50 && (c.prognose || 0) <= 75).length, fill: "#3A3A3C" },
    { name: "76–100%", count: cases.filter(c => (c.prognose || 0) > 75).length,  fill: "#1DB954" },
  ];

  const instanzMap = {};
  cases.forEach(c => { if (c.instanz) instanzMap[c.instanz] = (instanzMap[c.instanz] || 0) + 1; });
  const instanzData = Object.entries(instanzMap).map(([name, value]) => ({ name, value }));

  const upcoming = deadlines
    .filter(d => d.status === "offen")
    .map(d => ({ ...d, daysLeft: Math.ceil((new Date(d.due_date) - new Date()) / 86400000) }))
    .filter(d => d.daysLeft >= 0 && d.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

  const tooltipStyle = { borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 8px 28px rgba(0,0,0,0.12)", fontSize: 12, fontFamily: SF.fontFamily, background: "#fff", padding: "8px 14px" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F2F2F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(0,0,0,0.08)", borderTopColor: "#1DB954", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F2F2F7", ...SF, paddingBottom: 70 }}>
      {/* Top bar */}
      <div style={{ background: "rgba(242,242,247,0.96)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1C1C1E", letterSpacing: "-0.025em" }}>{t.module?.[5]?.title || "Kanzlei-Analytik"}</p>
            <p style={{ fontSize: 11.5, color: "#8E8E93", marginTop: 2 }}>{t.mandatesSub(cases.length, activeCases)}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowModal(true)} style={{
              background: "#0A84FF", color: "#fff", fontSize: 13, fontWeight: 600,
              padding: "9px 20px", borderRadius: 12, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7, boxShadow: "0 3px 12px rgba(10,132,255,0.30)",
            }}>
              <TrendingUp style={{ width: 14, height: 14 }} /> {t.kiFallanalyse}
            </button>
            <button onClick={loadData} style={{ padding: 9, borderRadius: 11, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <RefreshCw style={{ width: 14, height: 14, color: "#8E8E93" }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 36px", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
          <KpiCard icon={FileText} label={t.aktiveFaelleLabel} value={activeCases} sub={t.ofTotalLabel(cases.length)} iconBg="rgba(10,132,255,0.10)" iconColor="#0A84FF" animIndex={0} />
          <KpiCard icon={AlertTriangle} label={t.offeeneFristenLabel} value={openDeadlines}
            sub={overdueDeadlines > 0 ? `${overdueDeadlines} überfällig` : t.allOnTrack}
            iconBg={overdueDeadlines > 0 ? "rgba(184,28,58,0.09)" : "rgba(29,185,84,0.09)"}
            iconColor={overdueDeadlines > 0 ? "#B81C3A" : "#1DB954"} animIndex={1} />
          <KpiCard icon={TrendingUp} label={t.avgPrognoseLabel} value={`${avgPrognose}%`} sub={t.winProbabilityLabel} iconBg="rgba(29,185,84,0.09)" iconColor="#1DB954" animIndex={2} />
          <KpiCard icon={Users} label={t.argumenteLabel} value={arguments_.length} sub={t.totalRecordedLabel} iconBg="rgba(99,99,102,0.09)" iconColor="#636366" animIndex={3} />
        </div>

        {/* ══ ERFOLGSRATE & DAUER (NEU – prominent oben) ══════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Erfolgsrate Gauge + Breakdown */}
          <AppleCard title="Erfolgsrate bei Gericht" animIndex={1}>
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
                        <span style={{ fontSize: 11.5, color: "#636366", minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                        <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 99, width: `${d.rate}%`, background: d.rate >= 65 ? "#1DB954" : d.rate >= 40 ? "#636366" : "#B81C3A", transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: d.rate >= 65 ? "#1DB954" : d.rate >= 40 ? "#636366" : "#B81C3A", minWidth: 35, textAlign: "right" }}>{d.rate}%</span>
                        <span style={{ fontSize: 10, color: "#C7C7CC" }}>({d.total})</span>
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
          <AppleCard title="Ø Verfahrensdauer" animIndex={2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Große Kennzahl */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(58,58,60,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <Timer style={{ width: 28, height: 28, color: "#3A3A3C", marginBottom: 2 }} />
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
                      <ReferenceLine y={avgDauer} stroke="#636366" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "Ø", fill: "#636366", fontSize: 10 }} />
                      <Bar dataKey="monate" fill="#3A3A3C" radius={[6, 6, 0, 0]} name="Monate" />
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
                            <div style={{ height: "100%", borderRadius: 99, width: `${(d.avg / maxDauer) * 100}%`, background: "#3A3A3C", transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#3A3A3C", minWidth: 40, textAlign: "right" }}>{d.avg}M</span>
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
          <AppleCard title="Erfolgsrate nach Gericht" animIndex={3}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={erfolgsNachGericht} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#aaa" }} />
                <YAxis tick={{ fontSize: 11, fill: "#aaa" }} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [v + "%", "Erfolgsrate"]} />
                <ReferenceLine y={50} stroke="rgba(0,0,0,0.1)" strokeDasharray="4 3" />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]} name="Erfolgsrate">
                {erfolgsNachGericht.map((d, i) => (
                  <Cell key={i} fill={d.rate >= 65 ? "#1DB954" : d.rate >= 40 ? "#636366" : "#B81C3A"} />
                ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AppleCard>
        )}

        {/* ══ Tortendiagramm: Strategieerfolg nach Rechtsgebiet ═══════════════ */}
        {erfolgsNachRG.length > 0 && (
          <AppleCard title="Strategieerfolg nach Rechtsgebiet" animIndex={4}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={erfolgsNachRG}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={100}
                    dataKey="rate"
                    nameKey="name"
                    paddingAngle={3}
                    label={({ name, rate }) => `${rate}%`}
                    labelLine={false}
                  >
                    {erfolgsNachRG.map((d, i) => (
                      <Cell key={i} fill={d.rate >= 65 ? "#1DB954" : d.rate >= 40 ? "#636366" : "#B81C3A"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name, props) => [`${v}% Erfolgsrate (${props.payload.total} Fälle)`, props.payload.name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Legende</p>
                {erfolgsNachRG.map((d, i) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: d.rate >= 65 ? "#1DB954" : d.rate >= 40 ? "#636366" : "#B81C3A" }} />
                    <span style={{ fontSize: 12, color: "#333", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.rate >= 65 ? "#1DB954" : d.rate >= 40 ? "#636366" : "#B81C3A" }}>{d.rate}%</span>
                    <span style={{ fontSize: 10, color: "#C7C7CC" }}>({d.total})</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 14 }}>
                  {[["≥65% Hoch","#1DB954"],["≥40% Mittel","#636366"],["<40% Niedrig","#B81C3A"]].map(([l,c]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                      <span style={{ fontSize: 10, color: "#aaa" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AppleCard>
        )}

        {/* ══ Standard Charts ════════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <AppleCard title={t.faelleNachRechtsgebiet} animIndex={5}>
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

          <AppleCard title={t.statusVerteilung} animIndex={6}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <AppleCard title={t.prognoseVerteilung} animIndex={7}>
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

          <AppleCard title={t.fristenUebersicht} animIndex={8}>
            {fristenData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={fristenData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" paddingAngle={4}>
                    {fristenData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "Überfällig" ? "#B81C3A" : entry.name === "Versäumt" ? "#8E8E93" : entry.name === "Erledigt" ? "#1DB954" : "#3A3A3C"} />
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

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <AppleCard title={t.naechste14Tage} animIndex={9}>
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

          <AppleCard title={t.instanzVerteilung} animIndex={10}>
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
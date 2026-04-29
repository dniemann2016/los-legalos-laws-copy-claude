import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Scale, MessageSquare, Users, Bot, LayoutDashboard,
  BarChart2, Sword, CheckSquare, Calendar, LogOut, ChevronDown,
  ChevronRight, FileText, Gavel, Brain, AlertTriangle, Activity,
  TrendingUp, ClipboardList, Archive, Clock, UserCheck, Search,
  BookOpen, Layers, BarChart, Settings
} from "lucide-react";
import JurisdictionToggle from "./JurisdictionToggle";

const C = {
  bg:         "#F2F2F7",   // systemGroupedBackground
  toolbar:    "rgba(248,248,248,0.96)",
  sidebar:    "rgba(245,245,245,0.98)",
  separator:  "rgba(0,0,0,0.08)",
  label:      "#1C1C1E",
  label2:     "#636366",
  label3:     "#AEAEB2",
  emerald:    "#1DB954",
  emeraldDim: "rgba(29,185,84,0.11)",
  emeraldText:"#166F38",
  content:    "#EBEBF0",
};

const NAV_ITEMS = [
  { path: "/",                     label: "Übersicht",    icon: LayoutDashboard, exact: true },
  { path: "/lexara",               label: "Lexara",       icon: Scale },
  { path: "/richterprofile",       label: "Beteiligte",   icon: Users },
  { path: "/aufgaben",             label: "Aufgaben",     icon: CheckSquare },
  { path: "/zeitleiste",           label: "Fristen",      icon: Calendar },
  { path: "/cockpit",              label: "Cockpit",      icon: Activity },
  { path: "/analytik",             label: "Analytik",     icon: BarChart2 },
  { path: "/strategic-analysis",   label: "Strategie",    icon: Sword },
  { path: "/chat/fall-assistent",  label: "KI-Assistent", icon: MessageSquare },
  { path: "/plattform-agent",      label: "Agent",        icon: Bot },
];

const SIDEBAR_MAP = {
  "/lexara": {
    title: "Fallverwaltung",
    sections: [
      { label: "Fallübersicht", items: [
        { label: "Alle Fälle", icon: Layers, path: "/lexara" },
        { label: "Neuer Fall", icon: FileText, path: "/lexara?new=1" },
      ]},
      { label: "Fall-Schritte", items: [
        { label: "1 · Fallerfassung",   icon: ClipboardList, step: 1 },
        { label: "2 · Fallsubstanz",    icon: FileText,      step: 2 },
        { label: "3 · Gegneranalyse",   icon: Search,        step: 3 },
        { label: "4 · Rechtl. Analyse", icon: BookOpen,      step: 4 },
        { label: "5 · Strategie",       icon: Sword,         step: 5 },
        { label: "6 · Risiko",          icon: AlertTriangle, step: 6 },
        { label: "7 · Simulation",      icon: Brain,         step: 7 },
        { label: "8 · Aktion",          icon: Gavel,         step: 8 },
        { label: "9 · Cockpit",         icon: Activity,      step: 9 },
        { label: "10 · Abschluss",      icon: Archive,       step: 10 },
        { label: "11 · KI-Protokoll",   icon: BarChart,      step: 11 },
      ]},
    ],
  },
  "/richterprofile": {
    title: "Prozessbeteiligte",
    sections: [{ label: "Kategorien", items: [
      { label: "Alle Profile",         icon: Users,       path: "/richterprofile" },
      { label: "Richter",              icon: Gavel,       path: "/richterprofile?kat=Richter" },
      { label: "Anwälte & Kanzleien",  icon: UserCheck,   path: "/richterprofile?kat=Anwalt" },
      { label: "Sachverständige",      icon: BookOpen,    path: "/richterprofile?kat=Sachverständiger" },
      { label: "Zeugen",               icon: MessageSquare,path: "/richterprofile?kat=Zeuge" },
    ]}],
  },
  "/aufgaben": {
    title: "Aufgaben",
    sections: [{ label: "Filter", items: [
      { label: "Alle Aufgaben",  icon: CheckSquare, path: "/aufgaben" },
      { label: "Offen",          icon: Clock,       path: "/aufgaben?status=offen" },
      { label: "In Bearbeitung", icon: Activity,    path: "/aufgaben?status=in_bearbeitung" },
      { label: "Erledigt",       icon: Archive,     path: "/aufgaben?status=erledigt" },
    ]}],
  },
  "/zeitleiste": {
    title: "Fristenverwaltung",
    sections: [{ label: "Ansicht", items: [
      { label: "Alle Fristen", icon: Calendar,      path: "/zeitleiste" },
      { label: "Überfällig",   icon: AlertTriangle, path: "/zeitleiste?filter=overdue" },
      { label: "Diese Woche",  icon: Clock,         path: "/zeitleiste?filter=week" },
    ]}],
  },
  "/cockpit":  { title: "Kanzlei-Cockpit",    sections: [{ label: "Module", items: [
    { label: "Dashboard", icon: Activity,  path: "/cockpit" },
    { label: "Analytik",  icon: BarChart2, path: "/analytik" },
  ]}]},
  "/analytik": { title: "Analytik", sections: [{ label: "Berichte", items: [
    { label: "Überblick",      icon: BarChart2,   path: "/analytik" },
    { label: "KI-Performance", icon: Brain,       path: "/analytik?view=ki" },
    { label: "Erfolgsquoten",  icon: TrendingUp,  path: "/analytik?view=erfolg" },
  ]}]},
  "/strategic-analysis": { title: "Strategische Analyse", sections: [{ label: "Module", items: [
    { label: "Sun Tzu / Machiavelli", icon: Sword,  path: "/strategic-analysis" },
    { label: "Gegner-Profil",         icon: Search, path: "/strategic-analysis?tab=gegner" },
  ]}]},
  "/chat/fall-assistent": { title: "KI-Assistent", sections: [{ label: "Chats", items: [
    { label: "Fall-Assistent", icon: MessageSquare, path: "/chat/fall-assistent" },
  ]}]},
  "/plattform-agent": { title: "Plattform-Agent", sections: [{ label: "Agenten", items: [
    { label: "Plattform-Optimierer", icon: Bot, path: "/plattform-agent" },
  ]}]},
  "/": { title: "Übersicht", sections: [{ label: "Navigation", items: [
    { label: "Startseite", icon: LayoutDashboard, path: "/" },
    { label: "Onboarding", icon: Settings,        path: "/onboarding" },
  ]}]},
};

const SF = { fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif" };

export default function AppShell() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const [userMenuOpen,      setUserMenuOpen]      = useState(false);
  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const activeNavItem = NAV_ITEMS.find(isActive) || NAV_ITEMS[0];
  const sidebarKey    = Object.keys(SIDEBAR_MAP).find(k =>
    k === "/" ? location.pathname === "/" : location.pathname.startsWith(k)
  ) || "/";
  const sidebar       = SIDEBAR_MAP[sidebarKey];
  const isCaseDetail  = location.pathname === "/lexara/case";
  const caseIdInUrl   = new URLSearchParams(location.search).get("id");

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "?";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: C.content, ...SF }}>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        height: 46,
        display: "flex",
        alignItems: "center",
        paddingInline: 16,
        gap: 10,
        background: C.toolbar,
        borderBottom: `1px solid ${C.separator}`,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        zIndex: 60,
        boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, minWidth:148 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(145deg,#1DB954 0%,#14843C 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(29,185,84,0.35)",
          }}>
            <Scale style={{ width:14, height:14, color:"#fff" }} />
          </div>
          <div>
            <p style={{ fontSize:12.5, fontWeight:700, color:C.label, lineHeight:1.1, letterSpacing:"-0.02em" }}>MachSun Law</p>
            <p style={{ fontSize:9.5,  color:C.label3, lineHeight:1 }}>Niehoff & Partner</p>
          </div>
        </div>

        <div style={{ width:1, height:22, background:C.separator, flexShrink:0 }} />

        {/* Nav tabs */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:2, overflowX:"auto", scrollbarWidth:"none" }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                style={{
                  flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  background: active ? C.emeraldDim : "transparent",
                  color: active ? C.emeraldText : C.label2,
                  border: active ? `1px solid rgba(29,185,84,0.22)` : "1px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.14s",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background="rgba(0,0,0,0.05)"; e.currentTarget.style.color=C.label; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.label2; }}}
              >
                <item.icon style={{ width:11, height:11, flexShrink:0 }} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <JurisdictionToggle compact />
          <div style={{ width:1, height:18, background:C.separator }} />
          <div style={{ position:"relative" }}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"4px 8px", borderRadius:8, border:"none",
                background: userMenuOpen ? "rgba(0,0,0,0.07)" : "transparent",
                cursor:"pointer", transition:"all 0.12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.05)"}
              onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background="transparent"; }}
            >
              <div style={{
                width:24, height:24, borderRadius:"50%",
                background: "linear-gradient(145deg,#2DC76D,#17803D)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 1px 4px rgba(29,185,84,0.4)",
              }}>
                <span style={{ fontSize:9.5, fontWeight:700, color:"#fff" }}>{initials}</span>
              </div>
              <span style={{ fontSize:12, color:C.label, maxWidth:72, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {currentUser?.full_name?.split(" ")[0] || "Nutzer"}
              </span>
              <ChevronDown style={{ width:11, height:11, color:C.label3 }} />
            </button>

            {userMenuOpen && (
              <div className="animate-modal" style={{
                position:"absolute", right:0, top:"calc(100% + 6px)",
                width:210, borderRadius:14,
                background:"rgba(250,250,250,0.98)",
                border:`1px solid ${C.separator}`,
                boxShadow:"0 12px 40px rgba(0,0,0,0.15)",
                backdropFilter:"blur(24px)",
                zIndex:100, overflow:"hidden",
              }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.separator}` }}>
                  <p style={{ fontSize:13, fontWeight:600, color:C.label }}>{currentUser?.full_name || "Nutzer"}</p>
                  <p style={{ fontSize:11, color:C.label3 }}>{currentUser?.email || ""}</p>
                </div>
                <button onClick={() => { base44.auth.logout(); setUserMenuOpen(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 16px", border:"none", background:"transparent", color:"#B81C3A", cursor:"pointer", fontSize:13, fontWeight:500 }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(184,28,58,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <LogOut style={{ width:14, height:14 }} />
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────────── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* SIDEBAR */}
        <aside style={{
          flexShrink: 0,
          width: sidebarCollapsed ? 38 : 208,
          background: C.sidebar,
          borderRight: `1px solid ${C.separator}`,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 40,
        }}>
          {/* Sidebar header */}
          <div style={{
            height: 36, display:"flex", alignItems:"center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            paddingInline: sidebarCollapsed ? 0 : "10px 8px",
            borderBottom:`1px solid ${C.separator}`,
            flexShrink: 0,
          }}>
            {!sidebarCollapsed && (
              <p style={{ fontSize:11, fontWeight:700, color:C.label, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.01em" }}>
                {sidebar?.title || activeNavItem.label}
              </p>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                width:22, height:22, border:"none", background:"transparent",
                borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(0,0,0,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
              title={sidebarCollapsed ? "Öffnen" : "Schließen"}
            >
              <ChevronRight style={{
                width:12, height:12, color:C.label2,
                transform: sidebarCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 0.2s",
              }} />
            </button>
          </div>

          {/* Sidebar items */}
          {!sidebarCollapsed && (
            <div style={{ flex:1, overflowY:"auto", padding:"12px 0", scrollbarWidth:"none" }}>
              {sidebar?.sections?.map((section, si) => (
                <div key={si} style={{ marginBottom:20 }}>
                  <p style={{
                    fontSize:9, fontWeight:700, color:C.label3,
                    textTransform:"uppercase", letterSpacing:"0.1em",
                    padding:"0 16px 6px",
                  }}>
                    {section.label}
                  </p>
                  {section.items.map((item, ii) => {
                    const isItemActive = item.path && (
                      item.path === location.pathname + location.search ||
                      location.pathname === item.path.split("?")[0]
                    );
                    return (
                      <button key={ii}
                        onClick={() => {
                          if (item.path) navigate(item.path);
                          else if (item.step && isCaseDetail && caseIdInUrl)
                            window.dispatchEvent(new CustomEvent("lexara_goto_step", { detail: { step: item.step } }));
                          else if (item.step) navigate("/lexara");
                        }}
                        style={{
                          width:"100%", display:"flex", alignItems:"center", gap:8,
                          padding: isItemActive ? "7px 14px 7px 11px" : "7px 14px 7px 13.5px",
                          fontSize:12,
                          fontWeight: isItemActive ? 600 : 400,
                          background: isItemActive ? C.emeraldDim : "transparent",
                          color: isItemActive ? C.emeraldText : C.label2,
                          border:"none",
                          borderLeft: isItemActive ? `2.5px solid ${C.emerald}` : "2.5px solid transparent",
                          cursor:"pointer",
                          textAlign:"left",
                          lineHeight: 1.35,
                          transition:"all 0.12s",
                        }}
                        onMouseEnter={e => { if (!isItemActive) { e.currentTarget.style.background="rgba(0,0,0,0.04)"; e.currentTarget.style.color=C.label; }}}
                        onMouseLeave={e => { if (!isItemActive) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.label2; }}}
                      >
                        <item.icon style={{ width:12, height:12, flexShrink:0, opacity: isItemActive ? 1 : 0.7 }} />
                        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* MAIN */}
        <main style={{ flex:1, overflowY:"auto", background:C.content }}
          onClick={() => setUserMenuOpen(false)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
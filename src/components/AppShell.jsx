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

// ── TOP NAV ──────────────────────────────────────────────
const NAV_ITEMS = [
  { path: "/", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { path: "/lexara", label: "Lexara", icon: Scale },
  { path: "/richterprofile", label: "Beteiligte", icon: Users },
  { path: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
  { path: "/zeitleiste", label: "Fristen", icon: Calendar },
  { path: "/cockpit", label: "Cockpit", icon: Activity },
  { path: "/analytik", label: "Analytik", icon: BarChart2 },
  { path: "/strategic-analysis", label: "Strategie", icon: Sword },
  { path: "/chat/fall-assistent", label: "KI-Assistent", icon: MessageSquare },
  { path: "/plattform-agent", label: "Agent", icon: Bot },
];

// ── SIDEBAR CONTEXT per main section ────────────────────
const SIDEBAR_MAP = {
  "/lexara": {
    title: "Fallverwaltung",
    sections: [
      {
        label: "Fallübersicht",
        items: [
          { label: "Alle Fälle", icon: Layers, path: "/lexara" },
          { label: "Neuer Fall", icon: FileText, path: "/lexara?new=1" },
        ],
      },
      {
        label: "Fall-Schritte",
        items: [
          { label: "1 · Fallerfassung", icon: ClipboardList, step: 1 },
          { label: "2 · Fallsubstanz", icon: FileText, step: 2 },
          { label: "3 · Gegneranalyse", icon: Search, step: 3 },
          { label: "4 · Rechtl. Analyse", icon: BookOpen, step: 4 },
          { label: "5 · Strategie", icon: Sword, step: 5 },
          { label: "6 · Risiko", icon: AlertTriangle, step: 6 },
          { label: "7 · Simulation", icon: Brain, step: 7 },
          { label: "8 · Aktion", icon: Gavel, step: 8 },
          { label: "9 · Cockpit", icon: Activity, step: 9 },
          { label: "10 · Abschluss", icon: Archive, step: 10 },
          { label: "11 · KI-Protokoll", icon: BarChart, step: 11 },
        ],
      },
    ],
  },
  "/richterprofile": {
    title: "Prozessbeteiligte",
    sections: [
      {
        label: "Kategorien",
        items: [
          { label: "Alle Profile", icon: Users, path: "/richterprofile" },
          { label: "Richter", icon: Gavel, path: "/richterprofile?kat=Richter" },
          { label: "Anwälte & Kanzleien", icon: UserCheck, path: "/richterprofile?kat=Anwalt" },
          { label: "Sachverständige", icon: BookOpen, path: "/richterprofile?kat=Sachverständiger" },
          { label: "Zeugen", icon: MessageSquare, path: "/richterprofile?kat=Zeuge" },
        ],
      },
    ],
  },
  "/aufgaben": {
    title: "Aufgaben",
    sections: [
      {
        label: "Filter",
        items: [
          { label: "Alle Aufgaben", icon: CheckSquare, path: "/aufgaben" },
          { label: "Offen", icon: Clock, path: "/aufgaben?status=offen" },
          { label: "In Bearbeitung", icon: Activity, path: "/aufgaben?status=in_bearbeitung" },
          { label: "Erledigt", icon: Archive, path: "/aufgaben?status=erledigt" },
        ],
      },
    ],
  },
  "/zeitleiste": {
    title: "Fristenverwaltung",
    sections: [
      {
        label: "Ansicht",
        items: [
          { label: "Alle Fristen", icon: Calendar, path: "/zeitleiste" },
          { label: "Überfällig", icon: AlertTriangle, path: "/zeitleiste?filter=overdue" },
          { label: "Diese Woche", icon: Clock, path: "/zeitleiste?filter=week" },
        ],
      },
    ],
  },
  "/cockpit": {
    title: "Kanzlei-Cockpit",
    sections: [
      {
        label: "Module",
        items: [
          { label: "Dashboard", icon: Activity, path: "/cockpit" },
          { label: "Analytik", icon: BarChart2, path: "/analytik" },
        ],
      },
    ],
  },
  "/analytik": {
    title: "Analytik",
    sections: [
      {
        label: "Berichte",
        items: [
          { label: "Überblick", icon: BarChart2, path: "/analytik" },
          { label: "KI-Performance", icon: Brain, path: "/analytik?view=ki" },
          { label: "Erfolgsquoten", icon: TrendingUp, path: "/analytik?view=erfolg" },
        ],
      },
    ],
  },
  "/strategic-analysis": {
    title: "Strategische Analyse",
    sections: [
      {
        label: "Module",
        items: [
          { label: "Sun Tzu / Machiavelli", icon: Sword, path: "/strategic-analysis" },
          { label: "Gegner-Profil", icon: Search, path: "/strategic-analysis?tab=gegner" },
        ],
      },
    ],
  },
  "/chat/fall-assistent": {
    title: "KI-Assistent",
    sections: [
      {
        label: "Chats",
        items: [
          { label: "Fall-Assistent", icon: MessageSquare, path: "/chat/fall-assistent" },
        ],
      },
    ],
  },
  "/plattform-agent": {
    title: "Plattform-Agent",
    sections: [
      {
        label: "Agenten",
        items: [
          { label: "Plattform-Optimierer", icon: Bot, path: "/plattform-agent" },
        ],
      },
    ],
  },
  "/": {
    title: "Übersicht",
    sections: [
      {
        label: "Navigation",
        items: [
          { label: "Startseite", icon: LayoutDashboard, path: "/" },
          { label: "Onboarding", icon: Settings, path: "/onboarding" },
        ],
      },
    ],
  },
};

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const activeNavItem = NAV_ITEMS.find(item => isActive(item)) || NAV_ITEMS[0];

  // Determine sidebar context
  const sidebarKey = Object.keys(SIDEBAR_MAP).find(key => {
    if (key === "/") return location.pathname === "/";
    return location.pathname.startsWith(key);
  }) || "/";
  const sidebar = SIDEBAR_MAP[sidebarKey];

  // Check if we're on a case detail page
  const isCaseDetail = location.pathname === "/lexara/case";
  const urlParams = new URLSearchParams(location.search);
  const caseIdInUrl = urlParams.get("id");

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "?";

  const sf = { fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif" };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#e8e8e8", ...sf }}>

      {/* ── TOP TOOLBAR ─────────────────────────────────── */}
      <header className="flex-shrink-0" style={{
        background: "rgba(246,246,246,0.98)",
        borderBottom: "1px solid rgba(0,0,0,0.13)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        zIndex: 60,
        height: 44,
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        paddingRight: 12,
        gap: 8,
      }}>
        {/* App identity */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 140 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(145deg,#34C759 0%,#28a046 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Scale style={{ width: 13, height: 13, color: "#fff" }} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.1 }}>MachSun Law</p>
            <p style={{ fontSize: 9.5, color: "#999", lineHeight: 1 }}>Niehoff & Partner</p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />

        {/* Main nav tabs */}
        <div className="flex-1 flex items-center justify-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex-shrink-0 flex items-center gap-1.5 transition-all"
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  background: active ? "rgba(52,199,89,0.15)" : "transparent",
                  color: active ? "#1a7f37" : "#555",
                  border: active ? "1px solid rgba(52,199,89,0.3)" : "1px solid transparent",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "#222"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555"; }}}
              >
                <item.icon style={{ width: 11, height: 11, flexShrink: 0 }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: jurisdiction + user */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <JurisdictionToggle compact />
          <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.1)" }} />
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all"
              style={{ background: userMenuOpen ? "rgba(0,0,0,0.08)" : "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
              onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#34C759", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{initials}</span>
              </div>
              <span style={{ fontSize: 11, color: "#444", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.full_name?.split(" ")[0] || "Nutzer"}
              </span>
              <ChevronDown style={{ width: 11, height: 11, color: "#aaa" }} />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-[100]" style={{
                width: 200,
                background: "rgba(250,250,250,0.98)",
                border: "1px solid rgba(0,0,0,0.12)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
                backdropFilter: "blur(20px)",
              }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{currentUser?.full_name || "Nutzer"}</p>
                  <p style={{ fontSize: 11, color: "#999" }}>{currentUser?.email || ""}</p>
                </div>
                <button onClick={() => { base44.auth.logout(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                  style={{ color: "#e53935" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(229,57,53,0.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <LogOut style={{ width: 13, height: 13 }} />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Abmelden</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY: sidebar + content ─────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <aside
          className="flex-shrink-0 flex flex-col overflow-hidden transition-all duration-200"
          style={{
            width: sidebarCollapsed ? 36 : 200,
            background: "rgba(242,242,242,0.97)",
            borderRight: "1px solid rgba(0,0,0,0.1)",
            zIndex: 40,
          }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between flex-shrink-0 px-2" style={{ height: 34, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            {!sidebarCollapsed && (
              <p style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a", paddingLeft: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {sidebar?.title || activeNavItem.label}
              </p>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex items-center justify-center rounded transition-all flex-shrink-0"
              style={{ width: 22, height: 22, marginLeft: sidebarCollapsed ? "auto" : 0, marginRight: sidebarCollapsed ? "auto" : 0 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              title={sidebarCollapsed ? "Seitenleiste öffnen" : "Seitenleiste schließen"}
            >
              <ChevronRight style={{ width: 12, height: 12, color: "#888", transform: sidebarCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }} />
            </button>
          </div>

          {/* Sidebar items */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
              {sidebar?.sections?.map((section, si) => (
                <div key={si} className="mb-3">
                  <p style={{ fontSize: 9.5, fontWeight: 600, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.07em", padding: "4px 14px 3px" }}>
                    {section.label}
                  </p>
                  {section.items.map((item, ii) => {
                    const isItemActive = item.path && (item.path === location.pathname + location.search || location.pathname === item.path.split("?")[0]);
                    return (
                      <button
                        key={ii}
                        onClick={() => {
                          if (item.path) {
                            navigate(item.path);
                          } else if (item.step && isCaseDetail && caseIdInUrl) {
                            // Dispatch a custom event to switch tabs in CaseDetail
                            window.dispatchEvent(new CustomEvent("lexara_goto_step", { detail: { step: item.step } }));
                          } else if (item.step) {
                            // Navigate to lexara and remember step
                            navigate("/lexara");
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all"
                        style={{
                          background: isItemActive ? "rgba(52,199,89,0.1)" : "transparent",
                          color: isItemActive ? "#1a7f37" : "#444",
                          fontSize: 12,
                          fontWeight: isItemActive ? 600 : 400,
                          borderLeft: isItemActive ? "2px solid #34C759" : "2px solid transparent",
                          paddingLeft: isItemActive ? 10 : 12,
                        }}
                        onMouseEnter={e => { if (!isItemActive) { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; e.currentTarget.style.color = "#1a1a1a"; }}}
                        onMouseLeave={e => { if (!isItemActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#444"; }}}
                      >
                        <item.icon style={{ width: 12, height: 12, flexShrink: 0 }} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* MAIN CONTENT */}
        <main
          className="flex-1 overflow-auto"
          style={{ background: "#f0f0f0" }}
          onClick={() => setUserMenuOpen(false)}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
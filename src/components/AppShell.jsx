import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Scale, MessageSquare, Users, Bot, LayoutDashboard,
  BarChart2, Sword, CheckSquare, Calendar, LogOut, ChevronDown
} from "lucide-react";
import JurisdictionToggle from "./JurisdictionToggle";

const NAV_ITEMS = [
  { path: "/", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { path: "/lexara", label: "Fallverwaltung", icon: Scale },
  { path: "/richterprofile", label: "Prozessbeteiligte", icon: Users },
  { path: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
  { path: "/zeitleiste", label: "Fristen", icon: Calendar },
  { path: "/cockpit", label: "Kanzlei-Cockpit", icon: LayoutDashboard },
  { path: "/analytik", label: "Analytik", icon: BarChart2 },
  { path: "/strategic-analysis", label: "Strategie & KI", icon: Sword },
  { path: "/chat/fall-assistent", label: "KI-Assistent", icon: MessageSquare },
  { path: "/plattform-agent", label: "Plattform-Agent", icon: Bot },
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const activeItem = NAV_ITEMS.find(item => isActive(item)) || NAV_ITEMS[0];

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--numbers-canvas-bg, #e8e8e8)", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>

      {/* ── NUMBERS-STYLE TOOLBAR (top bar) ── */}
      <header
        className="flex-shrink-0 flex flex-col"
        style={{
          background: "rgba(246,246,246,0.97)",
          borderBottom: "1px solid rgba(0,0,0,0.12)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          zIndex: 50,
        }}
      >
        {/* Top row: logo + tabs + user */}
        <div className="flex items-center px-3 h-[44px] gap-2">
          {/* Left: App icon + name */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(145deg, #34C759 0%, #28a046 100%)" }}
            >
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-[12px] font-semibold text-[#1a1a1a] leading-none">MachSun Law</p>
              <p className="text-[10px] text-[#888] leading-none mt-0.5">Niehoff & Partner</p>
            </div>
          </div>

          {/* Center: Sheet tabs (navigation) */}
          <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-medium transition-all duration-150"
                  style={{
                    background: active ? "#34C759" : "transparent",
                    color: active ? "#fff" : "#444",
                    fontWeight: active ? 600 : 400,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.07)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <item.icon style={{ width: 12, height: 12, flexShrink: 0 }} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Jurisdiction + User */}
          <div className="flex items-center gap-2 min-w-[160px] justify-end">
            <JurisdictionToggle compact />

            {/* User button */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all"
                style={{ background: userMenuOpen ? "rgba(0,0,0,0.08)" : "transparent" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.07)"}
                onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = "transparent"; }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "#34C759" }}
                >
                  <span className="text-[9px] font-bold text-white">{initials}</span>
                </div>
                <span className="text-[11px] text-[#444] hidden sm:block max-w-[80px] truncate">
                  {currentUser?.full_name?.split(" ")[0] || "Nutzer"}
                </span>
                <ChevronDown className="w-3 h-3 text-[#888]" />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 rounded-xl overflow-hidden z-[100]"
                  style={{
                    background: "rgba(250,250,250,0.97)",
                    border: "1px solid rgba(0,0,0,0.12)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <div className="px-3 py-2.5 border-b border-black/8">
                    <p className="text-[12px] font-semibold text-[#1a1a1a]">{currentUser?.full_name || "Nutzer"}</p>
                    <p className="text-[11px] text-[#888]">{currentUser?.email || ""}</p>
                  </div>
                  <button
                    onClick={() => { base44.auth.logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                    style={{ color: "#e53935" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(229,57,53,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-[12px] font-medium">Abmelden</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider bar */}
        <div style={{ height: "1px", background: "rgba(0,0,0,0.09)" }} />

        {/* Breadcrumb / current section bar */}
        <div
          className="flex items-center gap-2 px-4 h-[30px]"
          style={{ background: "rgba(242,242,242,0.9)" }}
        >
          <activeItem.icon className="w-3 h-3 text-[#888]" />
          <span className="text-[11px] text-[#666] font-medium">{activeItem.label}</span>
        </div>
      </header>

      {/* ── MAIN CANVAS AREA ── */}
      <main
        className="flex-1 overflow-auto"
        style={{ background: "#f0f0f0" }}
        onClick={() => setUserMenuOpen(false)}
      >
        {/* Content wrapper: Numbers-like "paper on canvas" feeling */}
        <div
          className="min-h-full"
          style={{ background: "#f0f0f0" }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
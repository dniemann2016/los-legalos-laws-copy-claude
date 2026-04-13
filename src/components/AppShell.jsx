import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Scale, MessageSquare, Users, Bot, LayoutDashboard,
  BarChart2, Sword, CheckSquare, Calendar, ChevronLeft, ChevronRight, LogOut
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
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200"
        style={{
          width: collapsed ? 60 : 220,
          background: "#0f1629",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 min-h-[64px]">
          <div className="w-8 h-8 rounded-lg bg-[#2d4a8a] flex items-center justify-center flex-shrink-0">
            <Scale className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-[13px] leading-tight whitespace-nowrap">MachSun Law</p>
              <p className="text-white/40 text-[10px] leading-tight whitespace-nowrap">Niehoff & Partner</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/30 hover:text-white/70 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 relative transition-colors group"
                style={{
                  background: active ? "rgba(45,74,138,0.35)" : "transparent",
                }}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#4d7fd4]" />
                )}
                <item.icon
                  className="flex-shrink-0 transition-colors"
                  style={{
                    width: 16, height: 16,
                    color: active ? "#7eaaff" : "rgba(255,255,255,0.45)",
                  }}
                />
                {!collapsed && (
                  <span
                    className="text-[12.5px] font-medium whitespace-nowrap transition-colors"
                    style={{ color: active ? "#e8efff" : "rgba(255,255,255,0.55)" }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: user + jurisdiction */}
        <div className="border-t border-white/10 p-3 space-y-2">
          {!collapsed && <JurisdictionToggle dark />}
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-full bg-[#2d4a8a] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-[11px] font-medium truncate">{currentUser?.full_name || currentUser?.email || "Nutzer"}</p>
                  <p className="text-white/30 text-[10px] truncate">{currentUser?.role || "user"}</p>
                </div>
                <button
                  onClick={() => base44.auth.logout()}
                  className="text-white/30 hover:text-white/70 transition-colors"
                  title="Abmelden"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto bg-[#fafafa]">
        <Outlet />
      </main>
    </div>
  );
}
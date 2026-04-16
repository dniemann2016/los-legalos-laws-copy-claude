import { useNavigate } from "react-router-dom";
import { Scale, Users, Bot, LayoutDashboard, MessageSquare, BarChart2, Sword, CheckSquare, Calendar } from "lucide-react";
import { useJurisdiction } from "../hooks/useJurisdiction";
import { getT } from "../lib/jurisdictionConfig";
import { useAuth } from "@/lib/AuthContext";

const PATHS = [
  "/chat/fall-assistent",
  "/lexara",
  "/richterprofile",
  "/plattform-agent",
  "/cockpit",
  "/analytik",
  "/strategic-analysis",
];

const ICONS = [MessageSquare, Scale, Users, Bot, LayoutDashboard, BarChart2, Sword];

const ICON_COLORS = [
  { bg: "#eef0ff", icon: "#5856D6" },
  { bg: "#e8f5e9", icon: "#34C759" },
  { bg: "#e3f2fd", icon: "#007AFF" },
  { bg: "#f3e5f5", icon: "#AF52DE" },
  { bg: "#fff8e1", icon: "#FF9500" },
  { bg: "#fce4ec", icon: "#FF3B30" },
  { bg: "#e8eaf6", icon: "#5856D6" },
];

export default function Modules() {
  const navigate = useNavigate();
  const { jurisdiction } = useJurisdiction();
  const t = getT(jurisdiction);
  const { currentUser } = useAuth();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const quickLinks = [
    { label: "Fristen", sub: "Zeitleiste", path: "/zeitleiste", icon: Calendar, bg: "#fff8e1", icon_c: "#FF9500" },
    { label: "Aufgaben", sub: "Offene Aufgaben", path: "/aufgaben", icon: CheckSquare, bg: "#e8f5e9", icon_c: "#34C759" },
    { label: "KI-Chat", sub: "Fall-Assistent", path: "/chat/fall-assistent", icon: MessageSquare, bg: "#eef0ff", icon_c: "#5856D6" },
    { label: "Cockpit", sub: "Risiko-Überblick", path: "/cockpit", icon: LayoutDashboard, bg: "#e3f2fd", icon_c: "#007AFF" },
  ];

  return (
    <div
      className="min-h-full p-6"
      style={{ background: "#f0f0f0", fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* Numbers-style "document sheet" white panel */}
      <div
        className="max-w-3xl mx-auto rounded-xl overflow-hidden"
        style={{
          background: "#fff",
          boxShadow: "0 2px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Sheet header – like Numbers document title area */}
        <div
          className="px-8 pt-8 pb-5"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="text-[22px] font-bold leading-tight"
                style={{ color: "#1a1a1a", letterSpacing: "-0.3px" }}
              >
                {greeting()}{currentUser?.full_name ? `, ${currentUser.full_name.split(" ")[0]}` : ""}
              </h1>
              <p className="text-[13px] mt-1" style={{ color: "#888" }}>{t.platformSub}</p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(145deg, #34C759 0%, #28a046 100%)" }}
            >
              <Scale className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Quick access tiles – like Numbers sheet tabs area */}
        <div className="px-8 py-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "#aaa", letterSpacing: "0.08em" }}
          >
            Schnellzugriff
          </p>
          <div className="grid grid-cols-4 gap-3">
            {quickLinks.map(q => {
              const Icon = q.icon;
              return (
                <button
                  key={q.path}
                  onClick={() => navigate(q.path)}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all duration-150"
                  style={{ background: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.07)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(52,199,89,0.06)";
                    e.currentTarget.style.border = "1px solid rgba(52,199,89,0.25)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(52,199,89,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.025)";
                    e.currentTarget.style.border = "1px solid rgba(0,0,0,0.07)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: q.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: q.icon_c }} />
                  </div>
                  <div className="text-center leading-none">
                    <p className="text-[12px] font-semibold" style={{ color: "#1a1a1a" }}>{q.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>{q.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module list – like Numbers table rows */}
        <div className="px-8 py-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#aaa", letterSpacing: "0.08em" }}
          >
            Module
          </p>

          <div className="space-y-0">
            {t.module.map((mod, i) => {
              const Icon = ICONS[i];
              const col = ICON_COLORS[i] || ICON_COLORS[0];
              const isLast = i === t.module.length - 1;
              return (
                <button
                  key={mod.title}
                  onClick={() => navigate(PATHS[i])}
                  className="w-full flex items-center gap-4 py-3 text-left transition-all duration-100 group"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid rgba(0,0,0,0.05)",
                    borderRadius: "0",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(52,199,89,0.04)";
                    e.currentTarget.style.borderRadius = "8px";
                    e.currentTarget.style.paddingLeft = "8px";
                    e.currentTarget.style.paddingRight = "8px";
                    e.currentTarget.style.marginLeft = "-8px";
                    e.currentTarget.style.marginRight = "-8px";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderRadius = "0";
                    e.currentTarget.style.paddingLeft = "0";
                    e.currentTarget.style.paddingRight = "0";
                    e.currentTarget.style.marginLeft = "0";
                    e.currentTarget.style.marginRight = "0";
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: col.bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: col.icon }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-[10px] font-medium uppercase tracking-widest"
                        style={{ color: "#bbb" }}
                      >
                        {mod.category}
                      </p>
                    </div>
                    <p
                      className="text-[13px] font-semibold leading-snug"
                      style={{ color: "#1a1a1a" }}
                    >
                      {mod.title}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 line-clamp-1"
                      style={{ color: "#888" }}
                    >
                      {mod.description}
                    </p>
                  </div>

                  {/* Numbers-style right arrow/disclosure */}
                  <div
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
                    style={{ color: "#ccc" }}
                  >
                    <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                      <path d="M1.5 1.5L6.5 6.5L1.5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.015)" }}
        >
          <p className="text-[10px]" style={{ color: "#ccc" }}>{t.copyright}</p>
          <p className="text-[10px]" style={{ color: "#ccc" }}>{t.dsgvo}</p>
        </div>
      </div>
    </div>
  );
}
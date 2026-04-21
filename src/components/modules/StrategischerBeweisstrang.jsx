import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GitBranch, ChevronDown } from "lucide-react";
import ArgumentationskettenVisualisierung from "@/components/lexara/ArgumentationskettenVisualisierung";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StrategischerBeweisstrang() {
  const { isAuthenticated, navigateToLogin } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    base44.entities.Case.list("-updated_date", 20).then(cs => {
      setCases(cs);
      if (cs.length > 0) setSelectedCaseId(cs[0].id);
      setLoading(false);
    });
  }, [isAuthenticated]);

  const sf = { fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" };

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 16px rgba(0,0,0,0.10)", ...sf }}
      >
        <div className="px-8 py-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#e8eaf6" }}>
              <GitBranch className="w-4 h-4" style={{ color: "#5856D6" }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "#1a1a1a" }}>Strategischer Beweisstrang</p>
              <p className="text-[10px]" style={{ color: "#999" }}>Argumentationsketten & Lückenanalyse</p>
            </div>
          </div>
        </div>
        <div className="px-8 py-10 text-center">
          <p className="text-[12px]" style={{ color: "#888", marginBottom: 16 }}>Bitte anmelden, um Argumentationsketten zu sehen.</p>
          <button onClick={navigateToLogin}
            style={{ background: "#5856D6", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            Anmelden
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl flex items-center justify-center py-12" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,0,0,0.1)", borderTopColor: "#5856D6" }} />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 16px rgba(0,0,0,0.10)", ...sf }}
      >
        <div className="px-8 py-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#e8eaf6" }}>
              <GitBranch className="w-4 h-4" style={{ color: "#5856D6" }} />
            </div>
            <p className="text-[13px] font-semibold" style={{ color: "#1a1a1a" }}>Strategischer Beweisstrang</p>
          </div>
        </div>
        <div className="px-8 py-10 text-center">
          <p className="text-[12px]" style={{ color: "#888", marginBottom: 16 }}>Noch keine Fälle vorhanden.</p>
          <button onClick={() => navigate("/lexara")}
            style={{ background: "#34C759", color: "#fff", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            Fall anlegen
          </button>
        </div>
      </div>
    );
  }

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 16px rgba(0,0,0,0.10)", ...sf }}
    >
      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between gap-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#e8eaf6" }}>
            <GitBranch className="w-4 h-4" style={{ color: "#5856D6" }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#1a1a1a" }}>Strategischer Beweisstrang</p>
            <p className="text-[10px]" style={{ color: "#999" }}>Argumentationsketten & KI-Lückenanalyse</p>
          </div>
        </div>

        {/* Fall-Auswahl */}
        <div className="relative">
          <select
            value={selectedCaseId || ""}
            onChange={e => setSelectedCaseId(e.target.value)}
            style={{
              appearance: "none",
              padding: "5px 28px 5px 10px",
              fontSize: 11,
              fontWeight: 500,
              background: "rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 7,
              color: "#333",
              cursor: "pointer",
              outline: "none",
              maxWidth: 220,
            }}
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.fallname}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none w-3 h-3" style={{ color: "#aaa" }} />
        </div>
      </div>

      {/* Visualizer */}
      <div className="px-6 py-5">
        {selectedCaseId && (
          <ArgumentationskettenVisualisierung caseId={selectedCaseId} />
        )}
      </div>

      {/* Footer link */}
      <div className="px-8 py-3 flex justify-end" style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}>
        <button
          onClick={() => navigate(`/lexara/case?id=${selectedCaseId}`)}
          style={{ fontSize: 11, color: "#5856D6", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
        >
          Im Fall öffnen →
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle, RefreshCw, Loader2, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEVERITY_CONFIG = {
  kritisch: { color: "bg-red-50 border-red-200 text-red-700", icon: "🔴", label: "Kritisch" },
  hoch: { color: "bg-orange-50 border-orange-200 text-orange-700", icon: "🟠", label: "Hoch" },
  mittel: { color: "bg-yellow-50 border-yellow-200 text-yellow-700", icon: "🟡", label: "Mittel" },
  niedrig: { color: "bg-blue-50 border-blue-200 text-blue-700", icon: "🔵", label: "Niedrig" },
};

const WARNING_TYPE_LABELS = {
  diskrepanz: "Diskrepanz",
  fehlender_beleg: "Fehlender Beleg",
  veraltete_rspr: "Veraltete Rechtsprechung",
  unterstuetzung_fehlt: "Unterstützung fehlt",
  widerspruch: "Widerspruch",
};

export default function ComplianceChecker({ caseId, caseData }) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    loadWarnings();
  }, [caseId]);

  const loadWarnings = async () => {
    setLoading(true);
    const data = await base44.entities.CaseWarning.filter({
      case_id: caseId,
      resolved: false,
    });
    setWarnings(data.sort((a, b) => {
      const severityOrder = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }));
    setLoading(false);
  };

  const runCompliance = async () => {
    setChecking(true);
    try {
      const response = await base44.functions.invoke("checkCaseCompliance", { caseId });
      setLastCheck(new Date());
      await loadWarnings();
    } catch (error) {
      console.error("Compliance-Prüfung fehler:", error);
    }
    setChecking(false);
  };

  const resolveWarning = async (warningId) => {
    await base44.entities.CaseWarning.update(warningId, {
      resolved: true,
      resolved_date: new Date().toISOString(),
    });
    await loadWarnings();
  };

  const filteredWarnings =
    filter === "all" ? warnings : warnings.filter((w) => w.severity === filter);

  const criticalCount = warnings.filter((w) => w.severity === "kritisch").length;
  const highCount = warnings.filter((w) => w.severity === "hoch").length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header mit Run-Button */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">KI-Compliance-Prüfung</p>
            <h3 className="text-lg font-bold">Fall gegen Rechtsprechung prüfen</h3>
          </div>
          <Button
            onClick={runCompliance}
            disabled={checking}
            className="bg-white text-gray-900 hover:bg-gray-100 gap-2"
            size="sm"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Prüfe...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Scan starten
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-300 mb-2">
          Analysiert Ihre Argumente, Beweise und Fristen gegen aktuelle Rechtsprechung und erkennt Lücken.
        </p>
        {lastCheck && (
          <p className="text-[10px] text-gray-400">
            Letzte Prüfung: {new Date(lastCheck).toLocaleString("de-DE")}
          </p>
        )}
      </div>

      {/* Summary */}
      {warnings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 font-semibold mb-1">INSGESAMT</p>
            <p className="text-2xl font-bold text-gray-900">{warnings.length}</p>
          </div>
          {criticalCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600 font-semibold mb-1">KRITISCH</p>
              <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
            </div>
          )}
          {highCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs text-orange-600 font-semibold mb-1">HOCH</p>
              <p className="text-2xl font-bold text-orange-700">{highCount}</p>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-semibold mb-1">GELÖST</p>
            <p className="text-2xl font-bold text-blue-700">0</p>
          </div>
        </div>
      )}

      {/* Filter */}
      {warnings.length > 0 && (
        <div className="flex gap-2 flex-wrap bg-white p-3 rounded-lg border border-gray-200">
          {["all", "kritisch", "hoch", "mittel", "niedrig"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(sev)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filter === sev
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {sev === "all" ? "Alle" : SEVERITY_CONFIG[sev].label}
            </button>
          ))}
        </div>
      )}

      {/* Warnings */}
      {filteredWarnings.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-800 mb-1">Keine Warnungen</p>
          <p className="text-xs text-green-700">
            {warnings.length === 0
              ? "Führen Sie eine Compliance-Prüfung durch, um Lücken zu erkennen."
              : "Alle gefilterten Warnungen wurden behoben."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWarnings.map((warning) => {
            const config = SEVERITY_CONFIG[warning.severity];
            return (
              <div
                key={warning.id}
                className={`border rounded-lg overflow-hidden transition-all ${config.color}`}
              >
                <button
                  onClick={() =>
                    setExpandedId(expandedId === warning.id ? null : warning.id)
                  }
                  className="w-full text-left p-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-0.5">{warning.title}</p>
                      <p className="text-xs opacity-75">{warning.element_title}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold px-2 py-1 rounded bg-white/30">
                        {WARNING_TYPE_LABELS[warning.warning_type] || warning.warning_type}
                      </span>
                      <span className="text-lg">
                        {expandedId === warning.id ? "▼" : "▶"}
                      </span>
                    </div>
                  </div>
                </button>

                {expandedId === warning.id && (
                  <div className={`border-t border-current/20 p-4 bg-white/40 space-y-3`}>
                    {warning.description && (
                      <div>
                        <p className="text-xs font-semibold opacity-75 mb-1">Beschreibung</p>
                        <p className="text-sm">{warning.description}</p>
                      </div>
                    )}

                    {warning.suggestion && (
                      <div className="bg-white/60 rounded-lg p-3">
                        <p className="text-xs font-semibold opacity-75 mb-1">💡 Empfohlene Maßnahme</p>
                        <p className="text-sm">{warning.suggestion}</p>
                      </div>
                    )}

                    {warning.rspr_reference && (
                      <div>
                        <p className="text-xs font-semibold opacity-75 mb-1">📚 Rechtsprechungs-Referenz</p>
                        <p className="text-sm font-mono">{warning.rspr_reference}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => resolveWarning(warning.id)}
                        className="flex-1 px-3 py-2 bg-white/80 rounded text-sm font-medium hover:bg-white transition-all"
                      >
                        ✓ Behoben
                      </button>
                      <button
                        className="flex-1 px-3 py-2 bg-white/30 rounded text-sm font-medium hover:bg-white/50 transition-all"
                      >
                        Mehr erfahren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Wie die Prüfung funktioniert:</p>
            <ul className="text-xs space-y-1 opacity-85">
              <li>• Argumente ohne Beweise prüfen</li>
              <li>• Gegensätzliche Argumente mit ähnlicher Stärke erkennen</li>
              <li>• KI-Analyse gegen aktuelle Rechtsprechung</li>
              <li>• Fehlende Fristen und schwache Beweise identifizieren</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
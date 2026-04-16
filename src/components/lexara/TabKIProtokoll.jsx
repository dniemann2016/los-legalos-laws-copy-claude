import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, RefreshCw, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

function LogCard({ log }) {
  const [open, setOpen] = useState(false);
  const ts = log.timestamp ? new Date(log.timestamp) : new Date(log.created_date);
  const timeStr = ts.toLocaleDateString("de-DE") + " " + ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  let outputParsed = null;
  try { outputParsed = JSON.parse(log.output); } catch {}

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <FileText className="w-4 h-4 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded">{log.ki_function || "KI"}</span>
            <span className="text-[10px] text-gray-400">{timeStr}</span>
            {log.model && log.model !== "standard" && (
              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{log.model}</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{log.input_summary}</p>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📥 Eingabe / Fragestellung</p>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {log.input_summary}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📤 KI-Antwort & Begründung</p>
            {outputParsed && typeof outputParsed === "object" ? (
              <div className="space-y-2">
                {Object.entries(outputParsed).map(([key, val]) => (
                  <div key={key} className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{key.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {log.output}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TabKIProtokoll({ caseId, caseData }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterKI, setFilterKI] = useState("alle");

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.KIUsageLog.filter({ case_id: caseId }, "-timestamp", 200);
    setLogs(data);
    setLoading(false);
  };

  const kiNames = ["alle", ...Array.from(new Set(logs.map(l => l.ki_function).filter(Boolean)))];
  const filtered = filterKI === "alle" ? logs : logs.filter(l => l.ki_function === filterKI);

  const exportPDF = () => {
    setExporting(true);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, margin = 15, lineH = 5;
    let y = margin;

    const addLine = (text, fontSize = 10, bold = false, color = [30, 30, 30]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ""), W - margin * 2);
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += lineH;
      });
    };

    const separator = () => {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, W - margin, y);
      y += 3;
    };

    // Header
    doc.setFillColor(30, 30, 50);
    doc.rect(0, 0, W, 22, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("KI-Protokoll", margin, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, W - margin, 12, { align: "right" });
    y = 30;

    // Falldaten
    addLine("FALLDATEN", 11, true, [100, 100, 200]);
    separator();
    addLine(`Fall: ${caseData?.fallname || "–"}`);
    addLine(`Aktenzeichen: ${caseData?.aktenzeichen || "–"}`);
    addLine(`Gericht: ${caseData?.gericht || "–"}`);
    addLine(`Rechtsgebiet: ${caseData?.rechtsgebiet || "–"}`);
    addLine(`Status: ${caseData?.status || "–"}`);
    addLine(`Prognose: ${caseData?.prognose || 0}%`);
    y += 4;

    // Protokolleinträge
    addLine(`KI-PROTOKOLL (${filtered.length} Einträge)`, 11, true, [100, 100, 200]);
    separator();

    filtered.forEach((log, idx) => {
      if (y > 265) { doc.addPage(); y = margin; }
      const ts = log.timestamp ? new Date(log.timestamp) : new Date(log.created_date);
      const timeStr = ts.toLocaleDateString("de-DE") + " " + ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

      // Entry header
      doc.setFillColor(245, 245, 250);
      doc.rect(margin, y - 3, W - margin * 2, 8, "F");
      addLine(`[${idx + 1}] ${log.ki_function || "KI"} — ${timeStr}`, 9, true, [60, 60, 120]);
      if (log.model && log.model !== "standard") addLine(`Modell: ${log.model}`, 8, false, [120, 120, 120]);

      y += 1;
      addLine("EINGABE:", 8, true, [80, 80, 80]);
      addLine(log.input_summary || "–", 8, false, [60, 60, 60]);

      y += 1;
      addLine("ANTWORT / BEGRÜNDUNG:", 8, true, [80, 80, 80]);
      let outputText = log.output || "–";
      try {
        const parsed = JSON.parse(log.output);
        outputText = Object.entries(parsed).map(([k, v]) =>
          `${k.toUpperCase().replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`
        ).join("\n");
      } catch {}
      addLine(outputText.slice(0, 1500), 8, false, [60, 60, 60]);

      y += 3;
      separator();
    });

    doc.save(`KI-Protokoll_${caseData?.fallname || caseId}_${new Date().toISOString().slice(0, 10)}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">📋 KI-Protokoll</h2>
          <p className="text-xs text-gray-400 mt-0.5">Vollständige Historie aller KI-Anfragen und -Antworten für diesen Fall</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} className="rounded-xl text-xs gap-1">
            <RefreshCw className="w-3 h-3" /> Aktualisieren
          </Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting || filtered.length === 0}
            className="bg-gray-900 text-white rounded-xl text-xs gap-1">
            <Download className="w-3 h-3" /> {exporting ? "Exportiere…" : "PDF exportieren"}
          </Button>
        </div>
      </div>

      {/* Filter */}
      {kiNames.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {kiNames.map(name => (
            <button key={name} onClick={() => setFilterKI(name)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${filterKI === name ? "bg-violet-600 text-white border-violet-600" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
              {name === "alle" ? `Alle (${logs.length})` : name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm">Noch keine KI-Anfragen protokolliert.</p>
          <p className="text-xs mt-1">Nutze eine KI-Funktion in einem der Tabs, um das Protokoll zu starten.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => <LogCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}
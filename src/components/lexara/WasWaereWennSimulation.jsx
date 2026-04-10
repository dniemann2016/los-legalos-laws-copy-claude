import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, EyeOff, RefreshCw, Brain, AlertTriangle, Clock, ChevronDown, ChevronUp, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

function computePrognose(args, evidence, persons, deadlines, hiddenIds, caseData) {
  const activeArgs = args.filter(a => !hiddenIds.has(a.id));
  const activeEvidence = evidence.filter(e => !hiddenIds.has(e.id));
  const activeDeadlines = deadlines.filter(d => !hiddenIds.has(d.id));

  const eigene = activeArgs.filter(x => x.side === "eigen");
  const gegner = activeArgs.filter(x => x.side === "gegner");
  const eigenStaerke = eigene.reduce((s, x) => s + (x.strength || 5), 0);
  const gegnerStaerke = gegner.reduce((s, x) => s + (x.strength || 5), 0);
  const argBasis = (eigene.length > 0 || gegner.length > 0)
    ? Math.max(0, ((eigenStaerke / Math.max(1, eigene.length)) - (gegnerStaerke / Math.max(1, gegner.length))) * 5 + 50)
    : 50;
  const avgEvidW = activeEvidence.length > 0 ? activeEvidence.reduce((s, x) => s + (x.weight || 5), 0) / activeEvidence.length : 5;
  const beweisBoost = 1 + (avgEvidW / 10) * 0.5;
  const contradictions = activeArgs.filter(x => x.is_contradiction).length;
  const kantenEffekt = Math.max(0.2, 1 - contradictions * 0.2);
  const judges = persons.filter(x => x.role === "Richter");
  const avgGlaubw = judges.length > 0 ? judges.reduce((s, x) => s + (x.glaubwuerdigkeit || 80), 0) / judges.length : 80;
  const zeugenMult = 0.70 + (avgGlaubw / 100) * 0.30;
  const richterRate = judges[0]?.klaeger_rate || caseData?.richter_klaeger_rate || 50;
  const richterAdj = 1 + (richterRate - 50) / 100 * 0.15;
  const versaeumt = activeDeadlines.filter(x => x.status === "versaeumt").length;
  const fristenFaktor = Math.max(0.5, 1 - versaeumt * 0.30);
  const raw = argBasis * beweisBoost * kantenEffekt * zeugenMult * richterAdj * fristenFaktor;
  return Math.min(99, Math.max(1, Math.round(raw)));
}

function ToggleRow({ item, type, isHidden, onToggle, badge, badgeColor }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isHidden ? "opacity-40 bg-gray-50 border-gray-100" : "bg-white border-gray-200"}`}>
      <button onClick={() => onToggle(item.id)} className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isHidden ? "line-through text-gray-400" : "text-gray-800"}`}>{item.title || item.name || item.fallname}</p>
        {item.due_date && <p className="text-[10px] text-gray-400">{item.due_date} · {item.status}</p>}
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${badgeColor}`}>{badge}</span>
    </div>
  );
}

function PrognoseBar({ value, label, delta }) {
  const color = value >= 60 ? "bg-green-600" : value >= 40 ? "bg-amber-500" : "bg-red-600";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{value}%</span>
          {delta !== undefined && delta !== 0 && (
            <span className={`text-xs font-semibold ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
              {delta > 0 ? "+" : ""}{delta}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Section({ id, label, children, expandedSection, setExpandedSection }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpandedSection(expandedSection === id ? null : id)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        {expandedSection === id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {expandedSection === id && <div className="p-3 space-y-2 bg-white">{children}</div>}
    </div>
  );
}

export default function WasWaereWennSimulation({ args, evidence, deadlines, persons, caseData, basePrognose }) {
  const [hiddenIds, setHiddenIds] = useState({});
  const [exportLoading, setExportLoading] = useState(false);
  const [motives, setMotives] = useState(null);
  const [loadingMotives, setLoadingMotives] = useState(false);
  const [motiveError, setMotiveError] = useState(null);
  const [expandedSection, setExpandedSection] = useState("args_e");

  const toggleHidden = (id) => {
    setHiddenIds(prev => {
      const next = { ...prev };
      next[id] ? delete next[id] : (next[id] = true);
      return next;
    });
  };

  const resetAll = () => setHiddenIds({});

  const hiddenSet = new Set(Object.keys(hiddenIds));
  const baseSimPrognose = computePrognose(args, evidence, persons, deadlines, new Set(), caseData);
  const simPrognose = computePrognose(args, evidence, persons, deadlines, hiddenSet, caseData);
  const delta = simPrognose - baseSimPrognose;
  const hiddenCount = Object.keys(hiddenIds).length;

  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  const exportPDF = async () => {
    setExportLoading(true);
    try {
      const eigenArgs = args.filter(a => a.side === "eigen");
      const gegnerArgs = args.filter(a => a.side === "gegner");
      const gegnerDeadlines = deadlines.filter(d => d.side === "Gegner");

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Prozessanwalt. Erstelle eine vollständige taktische Analyse für folgendes Verfahren.

Fall: ${caseData?.fallname || ""}
Aktenzeichen: ${caseData?.aktenzeichen || ""}
Gericht: ${caseData?.gericht || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}
Instanz: ${caseData?.instanz || ""}
Prognose: ${baseSimPrognose}%

EIGENE ARGUMENTE (${eigenArgs.length}):
${eigenArgs.map(a => `- ${a.title} (Stärke: ${a.strength || 5}/10): ${a.description || ""}`).join("\n")}

GEGNER-ARGUMENTE (${gegnerArgs.length}):
${gegnerArgs.map(a => `- ${a.title} (Stärke: ${a.strength || 5}/10): ${a.description || ""}`).join("\n")}

GEGNER-FRISTEN:
${gegnerDeadlines.map(d => `- ${d.title} bis ${d.due_date} [${d.status}]`).join("\n")}

Erstelle eine umfassende Prozessnotiz mit:
1. ALLE möglichen Strategien der Gegenseite (mindestens 5-8)
2. Für jede Strategie: konkrete Gegenmaßnahme
3. Timing-Analyse: Warum agiert der Gegner JETZT so?
4. Psychologische Taktiken der Gegenseite
5. Empfohlene Verhandlungsführung
6. Kritische Warnsignale
7. Gesamtstrategie-Empfehlung`,
        response_json_schema: {
          type: "object",
          properties: {
            zusammenfassung: { type: "string" },
            gegner_strategien: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  strategie: { type: "string" },
                  beschreibung: { type: "string" },
                  wahrscheinlichkeit: { type: "string" },
                  gegenmasnahme: { type: "string" },
                  timing: { type: "string" }
                }
              }
            },
            timing_analyse: { type: "string" },
            psychologische_taktiken: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  taktik: { type: "string" },
                  beschreibung: { type: "string" },
                  gegenmasnahme: { type: "string" }
                }
              }
            },
            verhandlungsfuehrung: { type: "string" },
            warnsignale: { type: "array", items: { type: "string" } },
            gesamtempfehlung: { type: "string" }
          }
        },
        model: "claude_sonnet_4_6"
      });

      // Generate PDF
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210, margin = 18, contentW = pageW - margin * 2;
      let y = 20;

      const checkPage = (needed = 10) => {
        if (y + needed > 275) { doc.addPage(); y = 20; }
      };

      const addText = (text, size = 10, style = "normal", color = [30,30,30]) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", style);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(String(text || ""), contentW);
        checkPage(lines.length * (size * 0.4 + 1.5));
        doc.text(lines, margin, y);
        y += lines.length * (size * 0.4 + 1.5) + 2;
      };

      const addSection = (title) => {
        checkPage(14);
        y += 4;
        doc.setFillColor(20, 40, 80);
        doc.rect(margin, y, contentW, 7, "F");
        doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text(title, margin + 3, y + 5);
        y += 10;
        doc.setTextColor(30, 30, 30);
      };

      const addBox = (color, text, size = 9) => {
        const lines = doc.splitTextToSize(String(text || ""), contentW - 8);
        const h = lines.length * (size * 0.4 + 1.5) + 6;
        checkPage(h + 4);
        doc.setFillColor(...color);
        doc.roundedRect(margin, y, contentW, h, 2, 2, "F");
        doc.setFontSize(size); doc.setFont("helvetica", "normal"); doc.setTextColor(30,30,30);
        doc.text(lines, margin + 4, y + 5);
        y += h + 3;
      };

      // Header
      doc.setFillColor(20, 40, 80);
      doc.rect(0, 0, 210, 35, "F");
      doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(255,255,255);
      doc.text("PROZESSNOTIZ — TAKTISCHE ANALYSE", margin, 14);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Fall: ${caseData?.fallname || ""}`, margin, 21);
      doc.text(`Az: ${caseData?.aktenzeichen || "–"}  |  Gericht: ${caseData?.gericht || "–"}  |  Prognose: ${baseSimPrognose}%`, margin, 27);
      doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")}  |  VERTRAULICH — Anwaltsgeheimnis § 203 StGB`, margin, 33);
      y = 42;

      // Zusammenfassung
      if (analysis.zusammenfassung) {
        addSection("EXECUTIVE SUMMARY");
        addBox([240,245,255], analysis.zusammenfassung);
      }

      // Gegner-Strategien
      if (analysis.gegner_strategien?.length) {
        addSection(`MÖGLICHE STRATEGIEN DER GEGENSEITE (${analysis.gegner_strategien.length})`);
        analysis.gegner_strategien.forEach((s, i) => {
          checkPage(30);
          doc.setFillColor(248, 250, 252);
          const estimatedH = 28;
          doc.roundedRect(margin, y, contentW, estimatedH, 2, 2, "F");
          doc.setFillColor(220, 38, 38);
          doc.circle(margin + 5, y + 5, 3.5, "F");
          doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255,255,255);
          doc.text(String(i+1), margin + 3.8, y + 6.2);
          doc.setTextColor(30,30,30);
          doc.setFontSize(10); doc.setFont("helvetica", "bold");
          doc.text(s.strategie || "", margin + 11, y + 5.5);
          if (s.wahrscheinlichkeit) {
            doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100,100,100);
            doc.text(`Wahrscheinlichkeit: ${s.wahrscheinlichkeit}`, margin + 11, y + 10);
          }
          doc.setTextColor(30,30,30);
          const descLines = doc.splitTextToSize(s.beschreibung || "", contentW - 14);
          doc.setFontSize(9); doc.setFont("helvetica", "normal");
          doc.text(descLines, margin + 11, y + 14);
          y += Math.max(estimatedH, descLines.length * 4.5 + 16);
          // Counter
          checkPage(14);
          doc.setFillColor(220, 252, 231);
          const cLines = doc.splitTextToSize(`→ GEGENMASSNAHME: ${s.gegenmasnahme || ""}`, contentW - 8);
          const cH = cLines.length * 4.5 + 6;
          doc.roundedRect(margin, y, contentW, cH, 2, 2, "F");
          doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(21, 128, 61);
          doc.text(cLines, margin + 4, y + 5);
          y += cH + 5;
        });
      }

      // Timing
      if (analysis.timing_analyse) {
        addSection("TIMING-ANALYSE — WARUM JETZT?");
        addBox([255, 251, 235], analysis.timing_analyse);
      }

      // Psychologische Taktiken
      if (analysis.psychologische_taktiken?.length) {
        addSection("PSYCHOLOGISCHE TAKTIKEN DER GEGENSEITE");
        analysis.psychologische_taktiken.forEach(t => {
          checkPage(20);
          addText(t.taktik, 10, "bold");
          addText(t.beschreibung, 9, "normal", [60,60,60]);
          if (t.gegenmasnahme) addBox([240,253,244], `→ ${t.gegenmasnahme}`, 9);
          y += 2;
        });
      }

      // Verhandlungsführung
      if (analysis.verhandlungsfuehrung) {
        addSection("EMPFOHLENE VERHANDLUNGSFÜHRUNG");
        addBox([240,245,255], analysis.verhandlungsfuehrung);
      }

      // Warnsignale
      if (analysis.warnsignale?.length) {
        addSection("KRITISCHE WARNSIGNALE");
        analysis.warnsignale.forEach(w => addBox([255, 243, 243], `⚠ ${w}`, 9));
      }

      // Gesamtempfehlung
      if (analysis.gesamtempfehlung) {
        addSection("GESAMTSTRATEGIE-EMPFEHLUNG");
        addBox([20,40,80], analysis.gesamtempfehlung, 10);
        // Fix text color for dark box
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(150,150,150);
        doc.text(`VERTRAULICH — Anwaltsgeheimnis § 203 StGB | ${caseData?.fallname || ""} | Seite ${i}/${pageCount}`, margin, 290);
      }

      doc.save(`Prozessnotiz_${(caseData?.fallname || "Fall").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      alert("PDF-Export fehlgeschlagen: " + e.message);
    }
    setExportLoading(false);
  };

  const runMotiveAnalysis = async () => {
    setLoadingMotives(true);
    setMotiveError(null);
    try {
      const gegnerDeadlines = deadlines.filter(d => d.side === "Gegner");
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Prozessanwalt und Verhaltensstratege (Sun Tzu + Machiavelli).
Analysiere die TIMING-STRATEGIE der Gegenseite in diesem Rechtstreit.

Fall: ${caseData?.fallname || ""} | Rechtsgebiet: ${caseData?.rechtsgebiet || ""}
Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}

GEGNER-ARGUMENTE (${gegnerArgs.length} gesamt):
${gegnerArgs.map(a => `- "${a.title}" (Stärke: ${a.strength || 5}/10): ${a.description || ""}`).join("\n")}

FRISTEN VON GEGENSEITE (${gegnerDeadlines.length}):
${gegnerDeadlines.map(d => `- "${d.title}" bis ${d.due_date} [${d.status}]`).join("\n")}

EIGENE ARGUMENTE (${eigenArgs.length}):
${eigenArgs.map(a => `- "${a.title}" (Stärke: ${a.strength || 5}/10)`).join("\n")}

Analysiere:
1. Warum argumentiert die Gegenseite JETZT so (Timing, nicht Inhalt)?
2. Warum wurden DIESE Fristen JETZT gesetzt?
3. Welche verdeckten Ziele/Ängste hat der Gegner?
4. Welche psychologischen Druckmittel werden eingesetzt?
5. Was plant der Gegner als nächsten Schritt?
6. Unsere beste Gegenreaktion auf das Timing?`,
        response_json_schema: {
          type: "object",
          properties: {
            timing_analyse: { type: "string" },
            fristen_hintergedanken: { type: "string" },
            verdeckte_ziele: { type: "array", items: { type: "string" } },
            psychologische_taktiken: { type: "array", items: { type: "object", properties: { taktik: { type: "string" }, beweis: { type: "string" }, intensitaet: { type: "string" } } } },
            naechster_schritt_gegner: { type: "string" },
            empfohlene_reaktion: { type: "string" },
            rote_flaggen: { type: "array", items: { type: "string" } },
          }
        },
      });
      setMotives(result);
    } catch (e) {
      setMotiveError(e?.message || "Unbekannter Fehler. Bitte erneut versuchen.");
    }
    setLoadingMotives(false);
  };



  return (
    <div className="space-y-5">
      {/* Header + Prognose */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">🔮 Was-wäre-wenn-Simulation</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Blende Argumente, Beweise oder Fristen aus, um ihre Auswirkung zu messen.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetAll} className="text-xs gap-1.5">
              <RefreshCw className="w-3 h-3" /> Zurücksetzen
            </Button>
            <Button size="sm" onClick={exportPDF} disabled={exportLoading} className="text-xs gap-1.5 bg-gray-900 text-white hover:bg-gray-800">
              <FileDown className="w-3 h-3" />
              {exportLoading ? "Erstelle PDF…" : "Prozessnotiz PDF"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrognoseBar value={baseSimPrognose} label="Basis (alle Elemente aktiv)" />
          <PrognoseBar value={simPrognose} label="Simulierte Prognose" delta={delta} />
        </div>

        {hiddenCount > 0 && (
          <div className={`mt-4 rounded-xl px-4 py-3 border text-sm font-medium flex items-center gap-2 ${delta > 0 ? "bg-green-50 border-green-200 text-green-800" : delta < 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {hiddenCount} Element{hiddenCount > 1 ? "e" : ""} ausgeblendet →{" "}
              {delta > 0 ? `Prognose steigt um ${delta}% wenn wir diese Elemente gewinnen` : delta < 0 ? `Prognose sinkt um ${Math.abs(delta)}% ohne diese Elemente` : "Kein Einfluss auf Prognose"}
            </span>
          </div>
        )}
      </div>

      {/* Toggle Lists */}
      <div className="space-y-2">
        <Section id="args_e" label={`✅ Eigene Argumente (${eigenArgs.length})`} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
          {eigenArgs.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine eigenen Argumente</p>}
          {eigenArgs.map(a => (
            <ToggleRow key={a.id} item={a} type="arg" isHidden={!!hiddenIds[a.id]} onToggle={toggleHidden}
              badge={`${a.strength || 5}/10`} badgeColor="bg-green-100 text-green-700" />
          ))}
        </Section>

        <Section id="args_g" label={`⚔️ Gegner-Argumente (${gegnerArgs.length})`} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
          {gegnerArgs.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine Gegner-Argumente</p>}
          {gegnerArgs.map(a => (
            <ToggleRow key={a.id} item={a} type="arg" isHidden={!!hiddenIds[a.id]} onToggle={toggleHidden}
              badge={`${a.strength || 5}/10`} badgeColor="bg-red-100 text-red-700" />
          ))}
        </Section>

        <Section id="evidence" label={`🔍 Beweise (${evidence.length})`} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
          {evidence.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine Beweise</p>}
          {evidence.map(e => (
            <ToggleRow key={e.id} item={e} type="ev" isHidden={!!hiddenIds[e.id]} onToggle={toggleHidden}
              badge={`${e.weight || 5}/10`} badgeColor="bg-blue-100 text-blue-700" />
          ))}
        </Section>

        <Section id="deadlines" label={`⏰ Fristen (${deadlines.length})`} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
          {deadlines.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Keine Fristen</p>}
          {deadlines.map(d => (
            <ToggleRow key={d.id} item={{ ...d, title: d.title }} type="dl" isHidden={!!hiddenIds[d.id]} onToggle={toggleHidden}
              badge={d.side || "–"} badgeColor={d.side === "Gegner" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"} />
          ))}
        </Section>
      </div>

      {/* Motive / Hintergedanken Analysis */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" /> Hintergedanken & Timing-Analyse</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Warum argumentiert / setzt der Gegner JETZT Fristen? Was sind die verdeckten Motive?</p>
          </div>
          <Button onClick={runMotiveAnalysis} disabled={loadingMotives} size="sm" className="bg-purple-700 hover:bg-purple-800 text-white text-xs gap-1.5">
            {loadingMotives ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analysiere...</> : "🔍 Motive aufdecken"}
          </Button>
        </div>
        {loadingMotives && (
          <div className="text-center py-6 text-xs text-gray-400">KI analysiert Timing-Strategie der Gegenseite… (30–60s)</div>
        )}
        {motiveError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">⚠️ {motiveError}</div>
        )}
        {motives && (
          <div className="space-y-4 mt-4">
            {motives.rote_flaggen?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-700 mb-2">🚩 Rote Flaggen</p>
                {motives.rote_flaggen.map((f, i) => <p key={i} className="text-xs text-red-600">• {f}</p>)}
              </div>
            )}

            {motives.timing_analyse && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">⏰ Warum JETZT?</p>
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl p-3">{motives.timing_analyse}</p>
              </div>
            )}

            {motives.fristen_hintergedanken && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">📅 Fristen-Hintergedanken</p>
                <p className="text-sm text-gray-700 bg-orange-50 border border-orange-100 rounded-xl p-3 flex gap-2"><Clock className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />{motives.fristen_hintergedanken}</p>
              </div>
            )}

            {motives.verdeckte_ziele?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🎭 Verdeckte Ziele</p>
                <div className="space-y-1">
                  {motives.verdeckte_ziele.map((z, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-purple-500 flex-shrink-0">→</span>{z}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {motives.psychologische_taktiken?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🧠 Psychologische Taktiken</p>
                <div className="space-y-2">
                  {motives.psychologische_taktiken.map((t, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800">{t.taktik}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-semibold ${t.intensitaet === "hoch" ? "bg-red-100 text-red-600" : t.intensitaet === "mittel" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>{t.intensitaet}</span>
                      </div>
                      <p className="text-xs text-gray-500">{t.beweis}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {motives.naechster_schritt_gegner && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">🔮 Nächster Schritt des Gegners</p>
                <p className="text-sm text-gray-700 bg-slate-50 border border-slate-200 rounded-xl p-3">{motives.naechster_schritt_gegner}</p>
              </div>
            )}

            {motives.empfohlene_reaktion && (
              <div className="bg-green-900 text-white rounded-2xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-green-300">✅ Empfohlene Reaktion</p>
                <p className="text-sm">{motives.empfohlene_reaktion}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
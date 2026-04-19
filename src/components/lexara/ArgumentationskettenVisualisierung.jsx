import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle, XCircle, ArrowRight, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── CONFIG ────────────────────────────────────────────────────────────────────

const CONN_COLORS = {
  "stützt":       { bg: "#e8f5e9", border: "#34C759", text: "#1a7f37",  arrow: "#34C759" },
  "verstärkt":    { bg: "#e8f5e9", border: "#34C759", text: "#1a7f37",  arrow: "#34C759" },
  "entkräftet":   { bg: "#fce4ec", border: "#FF3B30", text: "#c0392b",  arrow: "#FF3B30" },
  "widerspricht":  { bg: "#fff3e0", border: "#FF9500", text: "#a05f00",  arrow: "#FF9500" },
  "schwächt":     { bg: "#fff3e0", border: "#FF9500", text: "#a05f00",  arrow: "#FF9500" },
  "schließt aus": { bg: "#f5f5f5", border: "#9E9E9E", text: "#555",     arrow: "#9E9E9E" },
  "kausal":       { bg: "#e3f2fd", border: "#007AFF", text: "#005ec4",  arrow: "#007AFF" },
};

const GAP_TYPES = {
  no_evidence:      { label: "Kein Beweis verknüpft", color: "#FF3B30", icon: "🔴" },
  weak_chain:       { label: "Schwache Kette",         color: "#FF9500", icon: "🟠" },
  contradiction:    { label: "Widerspruch",            color: "#FF9500", icon: "⚡" },
  isolated:         { label: "Isoliertes Argument",    color: "#9E9E9E", icon: "⚫" },
  missing_counter:  { label: "Kein Gegenargument",    color: "#007AFF", icon: "🔵" },
};

// ── GAP DETECTION ─────────────────────────────────────────────────────────────

function detectGaps(args, evidence) {
  const gaps = [];
  const allConnections = [];
  args.forEach(a => (a.connections || []).forEach(c => allConnections.push({ from: a.id, to: c.targetId, type: c.type })));

  args.forEach(arg => {
    // No evidence linked
    const hasEvidence = evidence.some(e => e.argument_id === arg.id);
    if (!hasEvidence) {
      gaps.push({ argId: arg.id, type: "no_evidence", desc: `Argument "${arg.title.slice(0, 40)}" hat keinen Beweis verknüpft.` });
    }

    // Isolated (no connections in or out)
    const connected = allConnections.some(c => c.from === arg.id || c.to === arg.id);
    if (!connected && args.length > 1) {
      gaps.push({ argId: arg.id, type: "isolated", desc: `Argument "${arg.title.slice(0, 40)}" ist isoliert — keine Verknüpfung zu anderen Argumenten.` });
    }

    // Contradictions
    const incomingContra = allConnections.filter(c => c.to === arg.id && (c.type === "widerspricht" || c.type === "entkräftet" || c.type === "schließt aus"));
    const hasSupport = allConnections.some(c => c.to === arg.id && (c.type === "stützt" || c.type === "verstärkt"));
    if (incomingContra.length > 0 && !hasSupport) {
      gaps.push({ argId: arg.id, type: "contradiction", desc: `Argument "${arg.title.slice(0, 40)}" wird entkräftet/widerlegt aber nicht gestützt.` });
    }

    // Weak chain: strength < 4
    if ((arg.strength || arg.ki_strength || 5) < 4 && arg.side === "eigen") {
      gaps.push({ argId: arg.id, type: "weak_chain", desc: `Eigenes Argument "${arg.title.slice(0, 40)}" ist schwach (Stärke < 4).` });
    }
  });

  // Missing counter for very strong opponent args
  const strongGegner = args.filter(a => a.side === "gegner" && (a.strength || 5) >= 7);
  strongGegner.forEach(ga => {
    const hasCounter = allConnections.some(c => c.to === ga.id && (c.type === "entkräftet" || c.type === "widerspricht" || c.type === "schließt aus"));
    if (!hasCounter) {
      gaps.push({ argId: ga.id, type: "missing_counter", desc: `Starkes Gegenargument "${ga.title.slice(0, 40)}" hat kein Gegenargument.` });
    }
  });

  return gaps;
}

// ── ARGUMENT NODE ─────────────────────────────────────────────────────────────

function ArgNode({ arg, gaps, evidence, selected, onClick }) {
  const argGaps = gaps.filter(g => g.argId === arg.id);
  const argEvidence = evidence.filter(e => e.argument_id === arg.id);
  const isEigen = arg.side === "eigen";
  const strength = arg.ki_strength || arg.strength || 5;
  const strengthColor = strength >= 7 ? "#34C759" : strength >= 4 ? "#FF9500" : "#FF3B30";

  return (
    <div
      onClick={() => onClick(arg)}
      className="cursor-pointer rounded-xl border-2 p-3 transition-all hover:shadow-md"
      style={{
        background: isEigen ? "#f0f8ff" : "#fff5f5",
        borderColor: selected ? "#1a1a1a" : isEigen ? "#007AFF40" : "#FF3B3040",
        minWidth: 160, maxWidth: 220,
        boxShadow: selected ? "0 0 0 3px rgba(26,26,26,0.15)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{ background: isEigen ? "#007AFF18" : "#FF3B3018", color: isEigen ? "#005ec4" : "#c0392b" }}>
          {isEigen ? "EIGEN" : "GEGNER"}
        </span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: strengthColor + "18", color: strengthColor }}>
          {strength}/10
        </span>
      </div>

      <p className="text-xs font-semibold text-gray-800 leading-snug">{arg.title}</p>

      {/* Evidence count */}
      <div className="flex items-center gap-2 mt-1.5">
        {argEvidence.length > 0
          ? <span className="text-[9px] text-green-600 flex items-center gap-0.5"><CheckCircle style={{width:9,height:9}}/> {argEvidence.length} Beweis{argEvidence.length > 1 ? "e" : ""}</span>
          : <span className="text-[9px] text-red-500 flex items-center gap-0.5"><XCircle style={{width:9,height:9}}/> Kein Beweis</span>
        }
      </div>

      {/* Gap badges */}
      {argGaps.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-0.5">
          {argGaps.map((g, i) => (
            <span key={i} className="text-[8px] px-1 py-0.5 rounded font-medium"
              style={{ background: (GAP_TYPES[g.type]?.color || "#999") + "18", color: GAP_TYPES[g.type]?.color || "#999" }}>
              {GAP_TYPES[g.type]?.icon} {GAP_TYPES[g.type]?.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CONNECTION ROW ────────────────────────────────────────────────────────────

function ConnectionRow({ conn, args }) {
  const from = args.find(a => a.id === conn.fromId);
  const to = args.find(a => a.id === conn.toId);
  const cfg = CONN_COLORS[conn.type] || CONN_COLORS["kausal"];
  if (!from || !to) return null;

  return (
    <div className="flex items-center gap-2 text-xs py-1.5 border-b border-gray-50 last:border-0">
      <span className="font-medium text-gray-700 flex-shrink-0 max-w-[130px] truncate">{from.title}</span>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 border"
        style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
        {conn.type}
      </span>
      <ArrowRight style={{ width: 12, height: 12, color: cfg.arrow, flexShrink: 0 }} />
      <span className="font-medium text-gray-700 flex-shrink-0 max-w-[130px] truncate">{to.title}</span>
      {conn.intensitaet && (
        <span className="text-[9px] text-gray-400 ml-auto flex-shrink-0">Intensität {conn.intensitaet}/10</span>
      )}
    </div>
  );
}

// ── CHAIN PATH VIEW (visual flow) ─────────────────────────────────────────────

function ChainFlowView({ args, connections, evidence, gaps, onSelectArg, selectedArg }) {
  // Build chains: find root nodes (nodes with no incoming "stützt" or "kausal")
  const incomingStützt = new Set(
    connections.filter(c => c.type === "stützt" || c.type === "kausal" || c.type === "verstärkt").map(c => c.toId)
  );
  const roots = args.filter(a => !incomingStützt.has(a.id));

  // Group by side
  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  return (
    <div className="space-y-6">
      {/* Two-column layout: Eigen vs Gegner */}
      <div className="grid grid-cols-2 gap-6">
        {[["Eigene Argumente", eigenArgs, "#007AFF"], ["Gegenargumente", gegnerArgs, "#FF3B30"]].map(([label, group, color]) => (
          <div key={label}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color }}>{label} ({group.length})</p>
            <div className="space-y-2">
              {group.map(arg => (
                <ArgNode key={arg.id} arg={arg} gaps={gaps} evidence={evidence} selected={selectedArg?.id === arg.id} onClick={onSelectArg} />
              ))}
              {group.length === 0 && <p className="text-xs text-gray-300 italic">Keine vorhanden</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Connections */}
      {connections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Argumentketten ({connections.length})</p>
          {connections.map((c, i) => <ConnectionRow key={i} conn={c} args={args} />)}
        </div>
      )}
    </div>
  );
}

// ── GAPS PANEL ────────────────────────────────────────────────────────────────

function GapsPanel({ gaps, args, onSelect }) {
  if (gaps.length === 0) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-700">Keine logischen Lücken erkannt</p>
          <p className="text-xs text-green-600 mt-0.5">Alle Argumente sind gestützt und verknüpft.</p>
        </div>
      </div>
    );
  }

  const grouped = {};
  gaps.forEach(g => {
    if (!grouped[g.type]) grouped[g.type] = [];
    grouped[g.type].push(g);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-semibold text-gray-700">{gaps.length} logische Lücke{gaps.length > 1 ? "n" : ""} erkannt</p>
      </div>
      {Object.entries(grouped).map(([type, items]) => {
        const cfg = GAP_TYPES[type] || { label: type, color: "#999", icon: "●" };
        return (
          <div key={type} className="rounded-xl border p-3" style={{ background: cfg.color + "08", borderColor: cfg.color + "30" }}>
            <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: cfg.color }}>
              {cfg.icon} {cfg.label} ({items.length})
            </p>
            {items.map((g, i) => {
              const arg = args.find(a => a.id === g.argId);
              return (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }} />
                  <p className="text-xs text-gray-600 flex-1">{g.desc}</p>
                  {arg && (
                    <button onClick={() => onSelect(arg)} className="text-[9px] text-blue-500 hover:text-blue-700 flex-shrink-0 underline">
                      anzeigen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── SELECTED ARG DETAIL ───────────────────────────────────────────────────────

function ArgDetail({ arg, args, connections, evidence }) {
  const argEvidence = evidence.filter(e => e.argument_id === arg.id);
  const outgoing = connections.filter(c => c.fromId === arg.id);
  const incoming = connections.filter(c => c.toId === arg.id);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mr-2"
            style={{ background: arg.side === "eigen" ? "#007AFF18" : "#FF3B3018", color: arg.side === "eigen" ? "#005ec4" : "#c0392b" }}>
            {arg.side === "eigen" ? "Eigenes Argument" : "Gegenargument"}
          </span>
          <h4 className="text-sm font-semibold text-gray-900 mt-1">{arg.title}</h4>
        </div>
        <span className="text-xs font-bold" style={{ color: (arg.strength || 5) >= 7 ? "#34C759" : (arg.strength || 5) >= 4 ? "#FF9500" : "#FF3B30" }}>
          Stärke {arg.ki_strength || arg.strength || 5}/10
        </span>
      </div>

      {arg.description && <p className="text-xs text-gray-600">{arg.description}</p>}

      {/* Evidence */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Verknüpfte Beweise ({argEvidence.length})</p>
        {argEvidence.length === 0
          ? <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Kein Beweis verknüpft — Lücke!</p>
          : argEvidence.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0"/>
                <span>{e.title}</span>
                {e.weight && <span className="text-gray-400 text-[9px]">Gewicht: {e.weight}/10</span>}
              </div>
            ))
        }
      </div>

      {/* Outgoing connections */}
      {outgoing.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Wirkt auf</p>
          {outgoing.map((c, i) => {
            const target = args.find(a => a.id === c.toId);
            const cfg = CONN_COLORS[c.type] || CONN_COLORS["kausal"];
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold border" style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>{c.type}</span>
                <ArrowRight style={{ width: 11, height: 11, color: cfg.arrow }} />
                <span className="text-gray-600">{target?.title?.slice(0, 45)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Incoming */}
      {incoming.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Wird beeinflusst von</p>
          {incoming.map((c, i) => {
            const source = args.find(a => a.id === c.fromId);
            const cfg = CONN_COLORS[c.type] || CONN_COLORS["kausal"];
            return (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-600">{source?.title?.slice(0, 45)}</span>
                <ArrowRight style={{ width: 11, height: 11, color: cfg.arrow }} />
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold border" style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>{c.type}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function ArgumentationskettenVisualisierung({ caseId }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArg, setSelectedArg] = useState(null);
  const [view, setView] = useState("kette"); // "kette" | "luecken"
  const [kiAnalyzing, setKiAnalyzing] = useState(false);
  const [kiLuecken, setKiLuecken] = useState(null);

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    setLoading(true);
    const [a, e] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]);
    setArgs(a);
    setEvidence(e);
    setLoading(false);
  };

  const connections = [];
  args.forEach(arg => {
    (arg.connections || []).forEach(c => {
      if (c.targetId) connections.push({ fromId: arg.id, fromTitle: arg.title, toId: c.targetId, type: c.type, intensitaet: c.intensitaet ?? 5, explanation: c.explanation || "" });
    });
  });

  const gaps = detectGaps(args, evidence);

  const runKILueckenAnalyse = async () => {
    if (args.length < 2) return;
    setKiAnalyzing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Experte für juristische Beweisführung und Argumentationslogik. Analysiere die folgende Argumentationskette auf logische Lücken.

Argumente (${args.length}):
${args.map(a => `- [${a.side}] "${a.title}" | Stärke: ${a.ki_strength || a.strength || 5}/10 | ${(a.connections||[]).length} Verbindungen`).join("\n")}

Beweise (${evidence.length}):
${evidence.map(e => `- "${e.title}" → Argument-ID: ${e.argument_id || "keine Zuweisung"} | Gewicht: ${e.ki_weight || e.weight || 5}/10`).join("\n")}

Verbindungen (${connections.length}):
${connections.map(c => `- "${args.find(a=>a.id===c.fromId)?.title?.slice(0,30)}" --[${c.type}]--> "${args.find(a=>a.id===c.toId)?.title?.slice(0,30)}"`).join("\n")}

Identifiziere:
1. Logische Lücken (fehlende Kausalzusammenhänge)
2. Ungestützte Argumente (kein Beweis, kein stützendes Argument)
3. Widersprüche innerhalb der eigenen Argumentation
4. Starke gegnerische Argumente ohne Gegenstrategie
5. Empfehlungen zur Stärkung der Beweisführung`,
      response_json_schema: {
        type: "object",
        properties: {
          gesamtbewertung: { type: "string" },
          staerke_eigene_kette: { type: "number" },
          luecken: {
            type: "array",
            items: {
              type: "object",
              properties: {
                typ: { type: "string" },
                beschreibung: { type: "string" },
                empfehlung: { type: "string" },
                schwere: { type: "string" }
              }
            }
          },
          empfehlungen: { type: "array", items: { type: "string" } }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setKiLuecken(result);
    setKiAnalyzing(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-10"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>;
  }

  if (args.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
        <Info className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">Noch keine Argumente vorhanden</p>
        <p className="text-xs text-gray-400 mt-1">Fügen Sie zuerst Argumente unter „Argumente" hinzu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Argumentationsketten-Visualisierung</h3>
          <p className="text-xs text-gray-400 mt-0.5">{args.length} Argumente · {connections.length} Verbindungen · {evidence.length} Beweise · {gaps.length} Lücken</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
            {[["kette","Argumentkette"],["luecken","Lückenanalyse"],["ki","KI-Analyse"]].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 transition-colors"
                style={{ background: view === v ? "#1a1a1a" : "transparent", color: view === v ? "#fff" : "#666", fontWeight: view === v ? 600 : 400 }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gap summary bar */}
      {gaps.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>{gaps.length} logische Lücke{gaps.length > 1 ? "n" : ""}</strong> in der Beweisführung erkannt —
            {gaps.filter(g => g.type === "no_evidence").length > 0 && ` ${gaps.filter(g => g.type === "no_evidence").length}× kein Beweis,`}
            {gaps.filter(g => g.type === "isolated").length > 0 && ` ${gaps.filter(g => g.type === "isolated").length}× isoliert,`}
            {gaps.filter(g => g.type === "contradiction").length > 0 && ` ${gaps.filter(g => g.type === "contradiction").length}× Widerspruch`}
          </p>
          <button onClick={() => setView("luecken")} className="ml-auto text-[10px] text-amber-600 underline flex-shrink-0">Zeigen</button>
        </div>
      )}

      {/* CHAIN VIEW */}
      {view === "kette" && (
        <div className="space-y-4">
          <ChainFlowView
            args={args}
            connections={connections}
            evidence={evidence}
            gaps={gaps}
            onSelectArg={setSelectedArg}
            selectedArg={selectedArg}
          />
          {selectedArg && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Detail-Ansicht</p>
                <button onClick={() => setSelectedArg(null)} className="text-[10px] text-gray-400 hover:text-gray-600">Schließen</button>
              </div>
              <ArgDetail arg={selectedArg} args={args} connections={connections} evidence={evidence} />
            </div>
          )}
        </div>
      )}

      {/* GAPS VIEW */}
      {view === "luecken" && (
        <GapsPanel gaps={gaps} args={args} onSelect={(a) => { setSelectedArg(a); setView("kette"); }} />
      )}

      {/* KI ANALYSIS */}
      {view === "ki" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">KI-Lückenanalyse der Beweisführung</p>
              <p className="text-xs text-gray-400 mt-0.5">Die KI analysiert die vollständige Argumentationskette auf logische Lücken, Widersprüche und Schwachstellen.</p>
            </div>
            <Button size="sm" onClick={runKILueckenAnalyse} disabled={kiAnalyzing || args.length < 2}
              className="flex-shrink-0 bg-violet-600 text-white rounded-lg text-xs gap-1">
              <Sparkles className="w-3 h-3" /> {kiAnalyzing ? "Analysiere…" : kiLuecken ? "Neu analysieren" : "Analyse starten"}
            </Button>
          </div>

          {kiLuecken && (
            <div className="space-y-3">
              {/* Overall score */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: (kiLuecken.staerke_eigene_kette || 5) >= 7 ? "#34C759" : (kiLuecken.staerke_eigene_kette || 5) >= 4 ? "#FF9500" : "#FF3B30" }}>
                    {kiLuecken.staerke_eigene_kette || "–"}<span className="text-sm font-normal text-gray-400">/10</span>
                  </p>
                  <p className="text-[9px] text-gray-400 uppercase font-semibold">Kettenstärke</p>
                </div>
                <p className="text-xs text-gray-700 flex-1">{kiLuecken.gesamtbewertung}</p>
              </div>

              {/* Gaps */}
              {kiLuecken.luecken?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Identifizierte Lücken ({kiLuecken.luecken.length})</p>
                  {kiLuecken.luecken.map((l, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-100 p-3">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800">{l.typ}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: l.schwere === "kritisch" ? "#FF3B3018" : l.schwere === "hoch" ? "#FF950018" : "#9E9E9E18", color: l.schwere === "kritisch" ? "#FF3B30" : l.schwere === "hoch" ? "#FF9500" : "#888" }}>
                          {l.schwere}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{l.beschreibung}</p>
                      {l.empfehlung && <p className="text-[10px] text-green-700 mt-1 flex items-start gap-1"><CheckCircle style={{width:10,height:10,flexShrink:0,marginTop:1}}/>{l.empfehlung}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Empfehlungen */}
              {kiLuecken.empfehlungen?.length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-green-700 uppercase mb-2">Empfehlungen zur Stärkung</p>
                  {kiLuecken.empfehlungen.map((e, i) => (
                    <p key={i} className="text-xs text-green-700 mb-1">→ {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
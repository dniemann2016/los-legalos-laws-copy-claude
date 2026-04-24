import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Check, AlertTriangle, Download, Link2, Clock } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, SF } from "../AppleCard";

function SyncRow({ label, value, synced, conflict, onResolve }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: conflict ? "rgba(255,59,48,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${conflict ? "rgba(255,59,48,0.15)" : "rgba(0,0,0,0.06)"}`, borderRadius: 10, marginBottom: 6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#1a1a1a" }}>{label}</p>
        {value && <p style={{ fontSize: 11, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 10 }}>
        {conflict ? (
          <>
            <AlertTriangle style={{ width: 13, height: 13, color: "#FF9500" }} />
            <span style={{ fontSize: 10, color: "#FF9500", fontWeight: 600 }}>Konflikt</span>
            {onResolve && <button onClick={onResolve} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, background: "#FF9500", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Lösen</button>}
          </>
        ) : synced ? (
          <>
            <Check style={{ width: 13, height: 13, color: "#34C759" }} />
            <span style={{ fontSize: 10, color: "#34C759", fontWeight: 600 }}>Sync</span>
          </>
        ) : (
          <span style={{ fontSize: 10, color: "#aaa" }}>Ausstehend</span>
        )}
      </div>
    </div>
  );
}

export default function Step6LexaraSync({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const mat = scenario.szenario_matrix || {};
  const act = scenario.aktionsplan || {};
  const emp = scenario.strategos_empfehlung || {};
  const [sync, setSync] = useState(scenario.lexara_sync || { sync_frequenz: "manuell", synchronisierte_felder: [], sync_log: [], konflikte: [] });
  const [syncing, setSyncing] = useState(false);
  const [lexCases, setLexCases] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadCases = async () => {
    if (loaded) return;
    const c = await base44.entities.Case.list("-updated_date", 50);
    setLexCases(c);
    setLoaded(true);
  };

  const runSync = async () => {
    setSyncing(true);
    const linkedId = ctx.lexara_case_id;
    const logEntry = { timestamp: new Date().toISOString(), felder: [], status: "ok", konflikte: [] };

    if (linkedId) {
      const existingCase = await base44.entities.Case.filter({ id: linkedId }).then(r => r[0] || null);
      if (existingCase) {
        const updates = {};
        const konflikte = [];
        const syncedFields = [];

        // Sync: Prognose aus Situation
        if (sit.gesamt_risiko) {
          const newProg = Math.max(0, 100 - (sit.gesamt_risiko * 10));
          if (existingCase.prognose && Math.abs(existingCase.prognose - newProg) > 10) {
            konflikte.push({ feld: "prognose", lexara_wert: existingCase.prognose, strategos_wert: newProg });
          } else {
            updates.prognose = newProg;
            syncedFields.push("prognose");
          }
        }

        // Sync: Notizen mit Strategos-Empfehlung
        if (emp.machtposition) {
          const note = `[STRATEGOS ${new Date().toLocaleDateString("de-DE")}] ${emp.machtposition}`;
          updates.notes = (existingCase.notes ? existingCase.notes + "\n\n" : "") + note;
          syncedFields.push("notes");
        }

        if (Object.keys(updates).length > 0) {
          await base44.entities.Case.update(linkedId, updates);
        }

        logEntry.felder = syncedFields;
        logEntry.konflikte = konflikte;
        if (konflikte.length > 0) logEntry.status = "konflikt";
      }
    }

    const newSync = {
      ...sync,
      letzter_sync: new Date().toISOString(),
      synchronisierte_felder: [...new Set([...(sync.synchronisierte_felder || []), ...logEntry.felder])],
      sync_log: [...(sync.sync_log || []).slice(-9), logEntry],
      konflikte: logEntry.konflikte,
    };
    setSync(newSync);
    await onSave({ lexara_sync: newSync });
    setSyncing(false);
  };

  const exportReport = async () => {
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Erstelle einen professionellen Executive Summary Bericht.

UNTERNEHMEN: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche})
SITUATION: ${ctx.sachverhalt_lang}
GESAMT-RISIKO: ${sit.gesamt_risiko || "—"}/10 | EXPOSURE: ${sit.gesamt_exposure_eur || "—"}€
TOP-SZENARIEN: ${(mat.szenarien || []).slice(0, 3).map(s => `${s.bezeichnung}(${s.erfolg_pct}%)`).join("; ")}
AKTIONSPLAN: ${(act.massnahmen || []).length} Maßnahmen
GRUNDHALTUNG: ${emp.grundhaltung || "—"}
MACHTPOSITION: ${emp.machtposition || "—"}
GROESSTE HEBEL: ${(emp.groesste_hebel || []).join("; ")}

Schreibe einen 3-seitigen Executive Summary auf Deutsch für Vorstand/Aufsichtsrat.
Struktur: 1. Executive Summary (3 Sätze), 2. Ausgangslage, 3. Risikoprofil, 4. Empfohlene Strategie, 5. Nächste Schritte`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          ausgangslage: { type: "string" },
          risikoprofil: { type: "string" },
          empfohlene_strategie: { type: "string" },
          naechste_schritte: { type: "array", items: { type: "string" } }
        }
      },
      model: "claude_sonnet_4_6"
    });

    const text = `STRATEGOS ENTERPRISE — EXECUTIVE SUMMARY
${ctx.unternehmen_name} | ${new Date().toLocaleDateString("de-DE")}
${"=".repeat(60)}

EXECUTIVE SUMMARY
${r.executive_summary}

AUSGANGSLAGE
${r.ausgangslage}

RISIKOPROFIL
${r.risikoprofil}

EMPFOHLENE STRATEGIE
${r.empfohlene_strategie}

NÄCHSTE SCHRITTE
${(r.naechste_schritte || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

${"=".repeat(60)}
Vertraulich — Erstellt mit STRATEGOS Enterprise · ${new Date().toLocaleDateString("de-DE")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Strategos_Executive_Summary_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
  };

  const SYNC_ITEMS = [
    { label: "Prognose", value: sit.gesamt_risiko ? `${Math.max(0, 100 - sit.gesamt_risiko * 10)}% (aus Risikoanalyse)` : null, field: "prognose" },
    { label: "Strategische Notizen", value: emp.machtposition ? emp.machtposition.slice(0, 60) + "…" : null, field: "notes" },
    { label: "Kritische Punkte", value: (sit.kritische_punkte || []).join(", ").slice(0, 70) || null, field: "zentrale_rechtsfrage" },
    { label: "Szenarien-Export", value: `${(mat.szenarien || []).length} Szenarien`, field: "ki_berater_result" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#007AFF", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 6 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>LEXARA-Sync & Export</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Synchronisation mit laufenden LEXARA-Fällen · Executive Summary</p>
      </div>

      {/* Status */}
      <AppleCard title="Sync-Status" accentColor="#007AFF">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
              {ctx.lexara_case_id ? "Verknüpfter LEXARA-Fall" : "Kein Fall verknüpft"}
            </p>
            {sync.letzter_sync && (
              <p style={{ fontSize: 11, color: "#888", marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                <Clock style={{ width: 10, height: 10 }} />
                Letzter Sync: {new Date(sync.letzter_sync).toLocaleString("de-DE")}
              </p>
            )}
            {sync.synchronisierte_felder?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {sync.synchronisierte_felder.map(f => <ApplePill key={f} color="#34C759">{f}</ApplePill>)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <AppleButton onClick={runSync} disabled={syncing || !ctx.lexara_case_id} variant="primary" icon={RefreshCw}>
              {syncing ? "Synchronisiert…" : "Jetzt synchronisieren"}
            </AppleButton>
            <AppleButton onClick={exportReport} variant="ghost" icon={Download}>Executive Summary</AppleButton>
          </div>
        </div>

        {!ctx.lexara_case_id && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,149,0,0.08)", borderRadius: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle style={{ width: 14, height: 14, color: "#FF9500", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11, color: "#666" }}>Verknüpfen Sie in Schritt 1 einen LEXARA-Fall, um Daten zu synchronisieren.</p>
          </div>
        )}
      </AppleCard>

      {/* Sync-Felder */}
      <AppleCard title="Synchronisierbare Felder" accentColor="#34C759">
        {SYNC_ITEMS.map((item, i) => (
          <SyncRow key={i} label={item.label} value={item.value} synced={(sync.synchronisierte_felder || []).includes(item.field)} conflict={(sync.konflikte || []).some(k => k.feld === item.field)} onResolve={null} />
        ))}
      </AppleCard>

      {/* Konflikte */}
      {sync.konflikte?.length > 0 && (
        <AppleCard title="⚠ Konflikte" accentColor="#FF9500">
          {sync.konflikte.map((k, i) => (
            <div key={i} style={{ padding: "10px 12px", background: "rgba(255,149,0,0.06)", border: "1px solid rgba(255,149,0,0.2)", borderRadius: 10, marginBottom: 7 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{k.feld}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                <div style={{ padding: "7px 10px", background: "rgba(0,122,255,0.08)", borderRadius: 8 }}>
                  <p style={{ fontSize: 9, color: "#007AFF", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>LEXARA-Wert</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{k.lexara_wert}</p>
                </div>
                <div style={{ padding: "7px 10px", background: "rgba(175,82,222,0.08)", borderRadius: 8 }}>
                  <p style={{ fontSize: 9, color: "#AF52DE", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>STRATEGOS-Wert</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{k.strategos_wert}</p>
                </div>
              </div>
            </div>
          ))}
        </AppleCard>
      )}

      {/* Sync-Log */}
      {sync.sync_log?.length > 0 && (
        <AppleCard title="Sync-Verlauf" accentColor="#8E8E93">
          {sync.sync_log.slice().reverse().map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < sync.sync_log.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.status === "ok" ? "#34C759" : entry.status === "konflikt" ? "#FF9500" : "#FF3B30", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: "#1a1a1a", fontWeight: 600 }}>{new Date(entry.timestamp).toLocaleString("de-DE")}</p>
                <p style={{ fontSize: 10, color: "#888" }}>{entry.felder?.length > 0 ? entry.felder.join(", ") : "Keine Felder"} · {entry.konflikte?.length > 0 ? `${entry.konflikte.length} Konflikt(e)` : "Kein Konflikt"}</p>
              </div>
              <ApplePill color={entry.status === "ok" ? "#34C759" : "#FF9500"}>{entry.status === "ok" ? "✓ OK" : "⚠ Konflikt"}</ApplePill>
            </div>
          ))}
        </AppleCard>
      )}

      {/* Vollständigkeit */}
      <AppleCard title="Analyse-Vollständigkeit" accentColor="#5856D6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 8 }}>
          {[
            ["1 · Kontext", Object.keys(ctx).length > 3, "#007AFF"],
            ["2 · Analyse", (sit.module?.length || 0) > 0, "#FF9500"],
            ["3 · Szenarien", (mat.szenarien?.length || 0) > 0, "#5856D6"],
            ["4 · Aktionsplan", (act.massnahmen?.length || 0) > 0, "#34C759"],
            ["5 · Empfehlung", Object.keys(emp).length > 0, "#AF52DE"],
            ["6 · LEXARA-Sync", !!sync.letzter_sync, "#007AFF"],
          ].map(([label, done, color]) => (
            <div key={label} style={{ padding: "10px 13px", background: done ? `${color}10` : "rgba(0,0,0,0.03)", border: `1px solid ${done ? color + "30" : "rgba(0,0,0,0.07)"}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? color : "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done ? <Check style={{ width: 10, height: 10, color: "#fff" }} /> : null}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: done ? color : "#888" }}>{label}</span>
            </div>
          ))}
        </div>
      </AppleCard>
    </div>
  );
}
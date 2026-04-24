import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Plus, CheckCircle2, CircleDot, Circle, Trash2, Download, Flame, Zap, Target, Rocket } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, AppleInput, AppleSelect, AppleTextarea, AppleField, SF } from "../AppleCard";

const ROLLEN = ["Rechtsabteilung intern", "Externer Anwalt", "Vorstand / GF", "Compliance", "Steuerberater", "Patentanwalt", "Kombination"];
const HORIZONTE = {
  sofort: { label: "SOFORT", sub: "0–7 Tage", icon: Flame, color: "#FF3B30" },
  kurzfristig: { label: "KURZFRISTIG", sub: "7–90 Tage", icon: Zap, color: "#FF9500" },
  mittelfristig: { label: "MITTELFRISTIG", sub: "3–18 Monate", icon: Target, color: "#007AFF" },
  langfristig: { label: "LANGFRISTIG", sub: "18+ Monate", icon: Rocket, color: "#34C759" },
};
const STATUS_MAP = {
  offen: { icon: Circle, color: "#8E8E93" },
  in_bearbeitung: { icon: CircleDot, color: "#FF9500" },
  erledigt: { icon: CheckCircle2, color: "#34C759" },
};

function MCard({ m, onUpdate, onRemove }) {
  const h = HORIZONTE[m.horizont] || HORIZONTE.sofort;
  const s = STATUS_MAP[m.status || "offen"];
  const SI = s.icon;
  const nextStatus = m.status === "erledigt" ? "offen" : m.status === "offen" ? "in_bearbeitung" : "erledigt";
  return (
    <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(0,0,0,0.07)", borderLeft: `4px solid ${h.color}`, borderRadius: 14, padding: "12px 14px", marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <button onClick={() => onUpdate({ status: nextStatus })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2, flexShrink: 0 }}>
          <SI style={{ width: 17, height: 17, color: s.color }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 4 }}>
            <ApplePill color={h.color}>{h.label}</ApplePill>
            {m.rechtsgebiet && <ApplePill color="#5856D6">{m.rechtsgebiet}</ApplePill>}
            {m.aufwand && <ApplePill color="#888">{m.aufwand}</ApplePill>}
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", textDecoration: m.status === "erledigt" ? "line-through" : "none", opacity: m.status === "erledigt" ? 0.55 : 1 }}>{m.titel}</p>
          {m.wirkung && <p style={{ fontSize: 11, color: "#555", marginTop: 3 }}><strong>Wirkung:</strong> {m.wirkung}</p>}
          {m.risiko_unterlassen && <p style={{ fontSize: 11, color: "#FF3B30", marginTop: 2 }}><strong>Risiko:</strong> {m.risiko_unterlassen}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 6, marginTop: 7 }}>
            {m.verantwortlich && <p style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Verantw.: </span><strong>{m.verantwortlich}</strong></p>}
            {m.frist && <p style={{ fontSize: 11 }}><span style={{ color: "#888" }}>Frist: </span><strong style={{ color: h.color }}>{m.frist}</strong></p>}
            {m.kosten_eur ? <p style={{ fontSize: 11 }}><span style={{ color: "#888" }}>€: </span><strong>{m.kosten_eur.toLocaleString()}€</strong></p> : null}
            {m.stunden_intern ? <p style={{ fontSize: 11 }}><span style={{ color: "#888" }}>h: </span><strong>{m.stunden_intern}h</strong></p> : null}
          </div>
          {m.abhaengigkeiten && <p style={{ fontSize: 10, color: "#888", marginTop: 5, fontStyle: "italic" }}>↳ {m.abhaengigkeiten}</p>}
          {m.erfolgsmessung && <p style={{ fontSize: 10, color: "#34C759", marginTop: 3 }}>✓ {m.erfolgsmessung}</p>}
          <div style={{ marginTop: 6 }}>
            <AppleSelect value={m.assignee || ""} onChange={e => onUpdate({ assignee: e.target.value })} style={{ fontSize: 11, padding: "5px 8px", maxWidth: 220 }}>
              <option value="">Zuweisung…</option>
              {ROLLEN.map(r => <option key={r} value={r}>{r}</option>)}
            </AppleSelect>
          </div>
        </div>
        <button onClick={onRemove} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ccc", padding: 3, flexShrink: 0 }}>
          <Trash2 style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );
}

export default function Step4Aktionsplan({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const mat = scenario.szenario_matrix || {};
  const [plan, setPlan] = useState(scenario.aktionsplan || { massnahmen: [], ressourcen_gesamt: {} });
  const [gen, setGen] = useState(false);
  const [customF, setCustomF] = useState(null);
  const [filter, setFilter] = useState("alle");

  const persist = (u) => { setPlan(u); onSave({ aktionsplan: u }); };

  const generate = async () => {
    setGen(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Senior-Strategieberater. Konkreter, spezifischer Aktionsplan — KEINE abstrakten Empfehlungen.
KONTEXT: ${ctx.unternehmen_name} (${ctx.branche}), MA: ${ctx.mitarbeiter}
SACHVERHALT: ${ctx.sachverhalt_lang}
TOP-RISIKEN: ${(sit.kritische_punkte || []).join(" | ")}
SZENARIEN: ${(mat.szenarien || []).slice(0, 3).map(s => s.bezeichnung).join("; ")}
Erzeuge 10-15 Maßnahmen auf 4 Horizonte (sofort/kurzfristig/mittelfristig/langfristig).
Pro Maßnahme: titel(präzise!), rechtsgebiet, verantwortlich(aus: ${ROLLEN.join(", ")}),
wirkung(ein Satz), risiko_unterlassen, aufwand(Gering/Mittel/Hoch/Sehr hoch),
kosten_eur, stunden_intern, frist(konkret/relativ), abhaengigkeiten, erfolgsmessung, horizont.
Plus: ressourcen_gesamt{anwaltsstunden_gesamt, budget_extern_eur, budget_intern_eur, anzahl_personen}.`,
      response_json_schema: {
        type: "object",
        properties: {
          massnahmen: { type: "array", items: { type: "object", properties: {
            titel: { type: "string" }, rechtsgebiet: { type: "string" }, verantwortlich: { type: "string" },
            wirkung: { type: "string" }, risiko_unterlassen: { type: "string" }, aufwand: { type: "string" },
            kosten_eur: { type: "number" }, stunden_intern: { type: "number" }, frist: { type: "string" },
            abhaengigkeiten: { type: "string" }, erfolgsmessung: { type: "string" }, horizont: { type: "string" }
          }}},
          ressourcen_gesamt: { type: "object", properties: {
            anwaltsstunden_gesamt: { type: "number" }, budget_extern_eur: { type: "number" },
            budget_intern_eur: { type: "number" }, anzahl_personen: { type: "number" }
          }}
        }
      },
      model: "claude_sonnet_4_6"
    });
    const withIds = (r.massnahmen || []).map((m, i) => ({ ...m, id: `m_${Date.now()}_${i}`, status: "offen" }));
    persist({ massnahmen: withIds, ressourcen_gesamt: r.ressourcen_gesamt || {} });
    setGen(false);
  };

  const addCustom = () => {
    if (!customF?.titel?.trim()) return;
    persist({ ...plan, massnahmen: [...(plan.massnahmen || []), { ...customF, id: `c_${Date.now()}`, status: "offen", user_generated: true }] });
    setCustomF(null);
  };
  const updateM = (id, u) => persist({ ...plan, massnahmen: plan.massnahmen.map(m => m.id === id ? { ...m, ...u } : m) });
  const removeM = (id) => persist({ ...plan, massnahmen: plan.massnahmen.filter(m => m.id !== id) });

  const exportPlan = () => {
    const rows = [["Titel", "Horizont", "Rechtsgebiet", "Verantwortlich", "Frist", "Aufwand", "Kosten €", "Stunden", "Status"]];
    (plan.massnahmen || []).forEach(m => rows.push([m.titel, m.horizont, m.rechtsgebiet, m.verantwortlich, m.frist, m.aufwand, m.kosten_eur || "", m.stunden_intern || "", m.status]));
    const csv = rows.map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Strategos_Aktionsplan_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const all = plan.massnahmen || [];
  const filtered = filter === "alle" ? all : all.filter(m => m.horizont === filter);
  const erl = all.filter(m => m.status === "erledigt").length;
  const res = plan.ressourcen_gesamt || {};
  const totalBudget = res.budget_extern_eur || all.reduce((s, m) => s + (m.kosten_eur || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 4 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Handlungsoptionen</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Priorisierter Aktionsplan — zugeordnet, terminiert, messbar</p>
      </div>

      <AppleCard title="Aktionsplan generieren" accentColor="#34C759">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, color: "#555", flex: 1, minWidth: 180 }}>KI generiert vollständigen Plan basierend auf allen vorherigen Schritten.</p>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <AppleButton onClick={generate} disabled={gen} variant="accent" icon={Sparkles}>{gen ? "Generiert…" : all.length > 0 ? "Neu" : "KI-Plan"}</AppleButton>
            <AppleButton onClick={() => setCustomF({ titel: "", horizont: "sofort", status: "offen" })} variant="ghost" icon={Plus}>Maßnahme</AppleButton>
            {all.length > 0 && <AppleButton onClick={exportPlan} variant="ghost" icon={Download}>CSV</AppleButton>}
          </div>
        </div>
      </AppleCard>

      {customF && (
        <AppleCard title="Neue Maßnahme">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <AppleField label="Titel"><AppleInput value={customF.titel} onChange={e => setCustomF({ ...customF, titel: e.target.value })} /></AppleField>
            <AppleField label="Horizont"><AppleSelect value={customF.horizont} onChange={e => setCustomF({ ...customF, horizont: e.target.value })}>{Object.entries(HORIZONTE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</AppleSelect></AppleField>
            <AppleField label="Verantwortlich"><AppleSelect value={customF.verantwortlich || ""} onChange={e => setCustomF({ ...customF, verantwortlich: e.target.value })}><option value="">—</option>{ROLLEN.map(r => <option key={r} value={r}>{r}</option>)}</AppleSelect></AppleField>
            <AppleField label="Frist"><AppleInput value={customF.frist || ""} onChange={e => setCustomF({ ...customF, frist: e.target.value })} /></AppleField>
            <AppleField label="Wirkung"><AppleTextarea rows={2} value={customF.wirkung || ""} onChange={e => setCustomF({ ...customF, wirkung: e.target.value })} /></AppleField>
            <AppleField label="Kosten €"><AppleInput type="number" value={customF.kosten_eur || ""} onChange={e => setCustomF({ ...customF, kosten_eur: Number(e.target.value) })} /></AppleField>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <AppleButton onClick={addCustom} variant="accent">Speichern</AppleButton>
            <AppleButton onClick={() => setCustomF(null)} variant="ghost">Abbrechen</AppleButton>
          </div>
        </AppleCard>
      )}

      {all.length > 0 && (
        <>
          <AppleCard title="Ressourcen-Planer" accentColor="#007AFF">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 9 }}>
              {[["Maßnahmen", all.length, "#007AFF"], ["Erledigt", erl, "#34C759"], ["Std.", res.anwaltsstunden_gesamt || all.reduce((s, m) => s + (m.stunden_intern || 0), 0), "#5856D6"], ["Budget", `${(totalBudget / 1000).toFixed(0)}k€`, "#FF9500"], ["Personen", res.anzahl_personen || "—", "#00BCD4"]].map(([l, v, c]) => (
                <div key={l} style={{ padding: "11px 13px", background: `${c}10`, border: `1px solid ${c}25`, borderRadius: 12 }}>
                  <p style={{ fontSize: 10, color: c, fontWeight: 700, textTransform: "uppercase" }}>{l}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginTop: 2 }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 11, paddingTop: 11, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#888", marginBottom: 4 }}>
                <span>Fortschritt</span><span>{erl}/{all.length}</span>
              </div>
              <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${all.length > 0 ? (erl / all.length) * 100 : 0}%`, background: "linear-gradient(90deg,#34C759,#007AFF)", borderRadius: 4, transition: "width 0.6s" }} />
              </div>
            </div>
          </AppleCard>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <ApplePill onClick={() => setFilter("alle")} active={filter === "alle"} color="#666">Alle ({all.length})</ApplePill>
            {Object.entries(HORIZONTE).map(([k, v]) => {
              const c = all.filter(m => m.horizont === k).length;
              return <ApplePill key={k} onClick={() => setFilter(k)} active={filter === k} color={v.color}>{v.label} ({c})</ApplePill>;
            })}
          </div>

          {(filter === "alle" ? Object.keys(HORIZONTE) : [filter]).map(h => {
            const ms = filtered.filter(m => m.horizont === h);
            if (ms.length === 0) return null;
            const meta = HORIZONTE[h];
            const IconC = meta.icon;
            return (
              <div key={h}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconC style={{ width: 15, height: 15, color: meta.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{meta.label} <span style={{ color: "#aaa", fontWeight: 400 }}>· {meta.sub}</span></p>
                    <p style={{ fontSize: 11, color: "#888" }}>{ms.length} Maßnahme{ms.length !== 1 ? "n" : ""}</p>
                  </div>
                </div>
                {ms.map(m => <MCard key={m.id} m={m} onUpdate={u => updateM(m.id, u)} onRemove={() => removeM(m.id)} />)}
              </div>
            );
          })}
        </>
      )}

      {all.length === 0 && !customF && (
        <AppleCard>
          <div style={{ textAlign: "center", padding: "26px 16px" }}>
            <Target style={{ width: 26, height: 26, color: "#ccc", margin: "0 auto 6px" }} />
            <p style={{ fontSize: 12, color: "#888" }}>Noch kein Aktionsplan. Starten Sie die KI-Generierung.</p>
          </div>
        </AppleCard>
      )}
    </div>
  );
}
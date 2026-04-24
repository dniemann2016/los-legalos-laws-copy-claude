import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Plus, Shield, Sword, Pause, TrendingUp, Eye, X, GitCompare } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, AppleInput, AppleSelect, AppleField, SF } from "../AppleCard";

const FRAGEN = [
  "Was passiert wenn wir handeln?",
  "Was passiert wenn wir nichts tun?",
  "Was passiert wenn die Gegenpartei handelt?",
  "Vergleiche Option A vs. Option B",
  "Was ist die beste Handlung in dieser Situation?",
];

const TYPEN = {
  "aktiv-offensiv": { icon: Sword, color: "#FF3B30", label: "Aktiv-offensiv" },
  "aktiv-defensiv": { icon: Shield, color: "#007AFF", label: "Aktiv-defensiv" },
  "passiv-abwartend": { icon: Pause, color: "#8E8E93", label: "Passiv" },
  "strategisch-langfristig": { icon: TrendingUp, color: "#34C759", label: "Strategisch" },
};

function SzCard({ sz, expanded, onExpand, selected, onSelect, onRemove }) {
  const t = TYPEN[sz.handlungstyp] || TYPEN["aktiv-defensiv"];
  const Icon = t.icon;
  const awC = sz.auswirkungsgrad === "existenziell" ? "#FF3B30" : sz.auswirkungsgrad === "hoch" ? "#FF9500" : sz.auswirkungsgrad === "mittel" ? "#007AFF" : "#34C759";
  return (
    <div style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", border: selected ? `2px solid ${t.color}` : "1px solid rgba(0,0,0,0.07)", borderRadius: 16, boxShadow: selected ? `0 4px 16px ${t.color}20` : "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden", ...SF }}>
      <div style={{ padding: "13px 15px", cursor: "pointer" }} onClick={onExpand}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon style={{ width: 14, height: 14, color: t.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, flexWrap: "wrap" }}>
              <ApplePill color={t.color}>{t.label}</ApplePill>
              {sz.auswirkungsgrad && <ApplePill color={awC}>{sz.auswirkungsgrad}</ApplePill>}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{sz.bezeichnung}</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{sz.zeithorizont || "—"}</p>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {onRemove && (
              <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: "rgba(255,59,48,0.1)", border: "none", borderRadius: 6, padding: 4, cursor: "pointer", color: "#FF3B30" }}>
                <X style={{ width: 10, height: 10 }} />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onSelect(); }} style={{ width: 22, height: 22, borderRadius: 6, border: selected ? "none" : "1px solid rgba(0,0,0,0.15)", background: selected ? t.color : "rgba(255,255,255,0.8)", color: selected ? "#fff" : "#ccc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GitCompare style={{ width: 11, height: 11 }} />
            </button>
          </div>
        </div>
        <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <p style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>Erfolg</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <div style={{ flex: 1, height: 5, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${sz.erfolg_pct || 0}%`, background: t.color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{sz.erfolg_pct || 0}%</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>Finanz</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", marginTop: 2 }}>{sz.finanzielle_folge_eur ? `${(sz.finanzielle_folge_eur / 1000).toFixed(0)}k€` : "—"}</p>
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "11px 15px", background: "rgba(0,0,0,0.015)" }}>
          {sz.konsequenzen?.length > 0 && (
            <div style={{ marginBottom: 9 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Konsequenzen</p>
              {sz.konsequenzen.map((k, i) => (
                <div key={i} style={{ fontSize: 11, color: "#333", marginBottom: 3, display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: t.color, minWidth: 70 }}>{k.art}:</span>
                  <span style={{ flex: 1 }}>{k.text}</span>
                </div>
              ))}
            </div>
          )}
          {sz.gegner_reaktion && (
            <div style={{ marginBottom: 9, padding: "7px 10px", background: "rgba(255,59,48,0.06)", borderRadius: 9 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#FF3B30", textTransform: "uppercase", marginBottom: 3 }}>🎯 Gegner-Reaktion (Zug 1)</p>
              <p style={{ fontSize: 11, color: "#333" }}>{sz.gegner_reaktion}</p>
            </div>
          )}
          {sz.gegen_gegen_reaktion && (
            <div style={{ marginBottom: 9, padding: "7px 10px", background: "rgba(52,199,89,0.06)", borderRadius: 9 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#34C759", textTransform: "uppercase", marginBottom: 3 }}>♟ Unsere Gegen-Reaktion (Zug 2)</p>
              <p style={{ fontSize: 11, color: "#333" }}>{sz.gegen_gegen_reaktion}</p>
            </div>
          )}
          {sz.strategos_empfehlung && (
            <div style={{ marginBottom: 9, padding: "7px 10px", background: "linear-gradient(135deg,rgba(88,86,214,0.08),rgba(175,82,222,0.08))", borderRadius: 9 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", marginBottom: 3 }}>✨ Strategos — {sz.strategos_quelle || "Empfehlung"}</p>
              <p style={{ fontSize: 11, color: "#333" }}>{sz.strategos_empfehlung}</p>
            </div>
          )}
          {sz.rechtliche_grundlage && (
            <p style={{ fontSize: 10, color: "#666", fontFamily: "SF Mono, Monaco, monospace", marginBottom: 6 }}><strong>Norm:</strong> {sz.rechtliche_grundlage}</p>
          )}
          {sz.kosten && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: "#555" }}>
              {sz.kosten.anwaltskosten_eur ? <p>Anwalt: <strong>{sz.kosten.anwaltskosten_eur.toLocaleString()}€</strong></p> : null}
              {sz.kosten.gerichtskosten_eur ? <p>Gericht: <strong>{sz.kosten.gerichtskosten_eur.toLocaleString()}€</strong></p> : null}
              {sz.kosten.interne_ressourcen ? <p>Intern: <strong>{sz.kosten.interne_ressourcen}</strong></p> : null}
              {sz.kosten.externe_berater ? <p>Extern: <strong>{sz.kosten.externe_berater}</strong></p> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Step3Matrix({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const sit = scenario.situationsanalyse || {};
  const [matrix, setMatrix] = useState(scenario.szenario_matrix || { szenarien: [], ausgangsfrage: "" });
  const [frage, setFrage] = useState(matrix.ausgangsfrage || FRAGEN[0]);
  const [gen, setGen] = useState(false);
  const [expId, setExpId] = useState(null);
  const [selIds, setSelIds] = useState([]);
  const [customF, setCustomF] = useState(null);
  const [view, setView] = useState("cards");

  const persist = (u) => { setMatrix(u); onSave({ szenario_matrix: u }); };

  const generate = async () => {
    setGen(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Strategischer Senior-Berater. Generiere Handlungsoptionen mit 2-Zug-Gegnerprognose.
KONTEXT: ${ctx.unternehmen_name} (${ctx.branche}), Sachverhalt: ${ctx.sachverhalt_lang}
Gegner: ${ctx.gegner_name} (${ctx.gegner_rolle}), Zeitkritikalität: ${ctx.zeitkritikalitaet}/10
TOP-RISIKEN: ${(sit.kritische_punkte || []).join(" | ")}
EXPOSURE: ${sit.gesamt_exposure_eur || "—"}€
FRAGE: ${frage}
Generiere 5-7 differenzierte Szenarien. Pro Szenario:
bezeichnung, handlungstyp(aktiv-offensiv/aktiv-defensiv/passiv-abwartend/strategisch-langfristig),
erfolg_pct, zeithorizont, auswirkungsgrad(gering/mittel/hoch/existenziell),
konsequenzen(4-6 Objekte mit art: finanziell/operativ/rechtlich/reputation/praezedenz + text),
finanzielle_folge_eur, gegner_reaktion(Zug 1), gegen_gegen_reaktion(Zug 2 unsererseits),
strategos_empfehlung(Sun-Tzu für Offensive, Machiavelli für Machterhalt, Harvard für Kooperation — DIREKTE Handlungsanleitung!),
strategos_quelle, rechtliche_grundlage(§§),
kosten{anwaltskosten_eur, gerichtskosten_eur, interne_ressourcen, externe_berater}.`,
      response_json_schema: {
        type: "object",
        properties: {
          szenarien: { type: "array", items: { type: "object", properties: {
            bezeichnung: { type: "string" },
            handlungstyp: { type: "string" },
            erfolg_pct: { type: "number" },
            zeithorizont: { type: "string" },
            auswirkungsgrad: { type: "string" },
            konsequenzen: { type: "array", items: { type: "object", properties: { art: { type: "string" }, text: { type: "string" } } } },
            finanzielle_folge_eur: { type: "number" },
            gegner_reaktion: { type: "string" },
            gegen_gegen_reaktion: { type: "string" },
            strategos_empfehlung: { type: "string" },
            strategos_quelle: { type: "string" },
            rechtliche_grundlage: { type: "string" },
            kosten: { type: "object", properties: {
              anwaltskosten_eur: { type: "number" },
              gerichtskosten_eur: { type: "number" },
              interne_ressourcen: { type: "string" },
              externe_berater: { type: "string" }
            }}
          }}}
        }
      },
      model: "claude_sonnet_4_6"
    });
    const existing = (matrix.szenarien || []).filter(s => s.user_generated);
    const ki = (r.szenarien || []).map((s, i) => ({ ...s, id: `ki_${Date.now()}_${i}`, ki_generated: true }));
    persist({ ...matrix, ausgangsfrage: frage, szenarien: [...existing, ...ki] });
    setGen(false);
  };

  const addCustom = () => {
    if (!customF?.bezeichnung?.trim()) return;
    persist({ ...matrix, szenarien: [...(matrix.szenarien || []), { ...customF, id: `u_${Date.now()}`, user_generated: true }] });
    setCustomF(null);
  };

  const remove = (id) => { persist({ ...matrix, szenarien: matrix.szenarien.filter(s => s.id !== id) }); setSelIds(i => i.filter(x => x !== id)); };
  const toggleSel = (id) => setSelIds(i => i.includes(id) ? i.filter(x => x !== id) : i.length < 2 ? [...i, id] : [i[1], id]);

  const szs = matrix.szenarien || [];
  const scA = szs.find(s => s.id === selIds[0]);
  const scB = szs.find(s => s.id === selIds[1]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 3 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Szenario-Matrix</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Handlungsoptionen mit Gegner-Reaktionsprognose (2 Züge)</p>
      </div>

      <AppleCard title="Ausgangsfrage" accentColor="#5856D6">
        <AppleSelect value={frage} onChange={e => setFrage(e.target.value)}>
          {FRAGEN.map(f => <option key={f} value={f}>{f}</option>)}
        </AppleSelect>
        <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap", alignItems: "center" }}>
          <AppleButton onClick={generate} disabled={gen} variant="violet" icon={Sparkles}>
            {gen ? "Generiert…" : szs.filter(s => s.ki_generated).length > 0 ? "Neu generieren" : "KI-Szenarien"}
          </AppleButton>
          <AppleButton onClick={() => setCustomF({ bezeichnung: "", handlungstyp: "aktiv-defensiv", erfolg_pct: 50 })} variant="ghost" icon={Plus}>Eigenes</AppleButton>
          {szs.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginLeft: "auto", background: "rgba(0,0,0,0.04)", padding: 2, borderRadius: 8 }}>
              {["cards", "table"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, background: view === v ? "#fff" : "transparent", color: view === v ? "#1a1a1a" : "#888", border: "none", borderRadius: 6, cursor: "pointer", boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                  {v === "cards" ? "Karten" : "Matrix"}
                </button>
              ))}
            </div>
          )}
        </div>
      </AppleCard>

      {customF && (
        <AppleCard title="Eigenes Szenario" accentColor="#34C759" action={<button onClick={() => setCustomF(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa" }}><X style={{ width: 14, height: 14 }} /></button>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <AppleField label="Bezeichnung">
              <AppleInput value={customF.bezeichnung} onChange={e => setCustomF({ ...customF, bezeichnung: e.target.value })} />
            </AppleField>
            <AppleField label="Typ">
              <AppleSelect value={customF.handlungstyp} onChange={e => setCustomF({ ...customF, handlungstyp: e.target.value })}>
                {Object.entries(TYPEN).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </AppleSelect>
            </AppleField>
          </div>
          <AppleButton onClick={addCustom} variant="accent" style={{ marginTop: 10 }}>Hinzufügen</AppleButton>
        </AppleCard>
      )}

      {view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 12 }}>
          {szs.map(sz => (
            <SzCard key={sz.id} sz={sz}
              expanded={expId === sz.id} onExpand={() => setExpId(expId === sz.id ? null : sz.id)}
              selected={selIds.includes(sz.id)} onSelect={() => toggleSel(sz.id)}
              onRemove={sz.user_generated ? () => remove(sz.id) : null} />
          ))}
        </div>
      )}

      {view === "table" && szs.length > 0 && (
        <AppleCard title="Matrix-Ansicht">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  {["Szenario", "Typ", "Erfolg", "Auswirkung", "Zeithorizont", "€-Folge", "Anwalt"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {szs.map(sz => {
                  const t = TYPEN[sz.handlungstyp] || TYPEN["aktiv-defensiv"];
                  return (
                    <tr key={sz.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1a1a1a" }}>{sz.bezeichnung}</td>
                      <td style={{ padding: "10px 12px" }}><ApplePill color={t.color}>{t.label}</ApplePill></td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: t.color }}>{sz.erfolg_pct || 0}%</td>
                      <td style={{ padding: "10px 12px" }}>{sz.auswirkungsgrad}</td>
                      <td style={{ padding: "10px 12px", color: "#666" }}>{sz.zeithorizont || "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{sz.finanzielle_folge_eur ? `${(sz.finanzielle_folge_eur / 1000).toFixed(0)}k€` : "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>{sz.kosten?.anwaltskosten_eur ? `${(sz.kosten.anwaltskosten_eur / 1000).toFixed(0)}k€` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AppleCard>
      )}

      {scA && scB && (
        <AppleCard title="Direktvergleich" accentColor="#007AFF">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[scA, scB].map((s, i) => (
              <div key={i} style={{ padding: 13, background: "rgba(0,122,255,0.04)", borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 7 }}>{s.bezeichnung}</p>
                {[["Erfolg", `${s.erfolg_pct}%`], ["Auswirkung", s.auswirkungsgrad], ["Zeit", s.zeithorizont], ["€", s.finanzielle_folge_eur ? `${s.finanzielle_folge_eur.toLocaleString()}€` : "—"]].map(([l, v]) => (
                  <div key={l} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "#888" }}>{l}</span>
                    <strong style={{ color: "#1a1a1a" }}>{v}</strong>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </AppleCard>
      )}

      {szs.length === 0 && !customF && (
        <AppleCard>
          <div style={{ textAlign: "center", padding: "26px 16px" }}>
            <Eye style={{ width: 26, height: 26, color: "#ccc", margin: "0 auto 6px" }} />
            <p style={{ fontSize: 12, color: "#888" }}>Noch keine Szenarien. Starten Sie die KI-Generierung.</p>
          </div>
        </AppleCard>
      )}
    </div>
  );
}
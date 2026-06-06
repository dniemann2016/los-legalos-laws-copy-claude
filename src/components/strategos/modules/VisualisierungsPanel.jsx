/**
 * VisualisierungsPanel.jsx
 * 
 * Zeigt alle 6 Visualisierungsformate mit separaten KI-Analyse-Buttons.
 * Jede Visualisierung hat ihren eigenen dedizierten KI-Analyse-Button.
 */

import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, Sparkles } from "lucide-react";
import KlauselHeatmap from "../visualisierung/KlauselHeatmap";
import WirkungsBaum from "../visualisierung/WirkungsBaum";
import ZeitachseSzenarien from "../visualisierung/ZeitachseSzenarien";
import OptionenCards from "../visualisierung/OptionenCards";
import ChancenRisikoQuadrant from "../visualisierung/ChancenRisikoQuadrant";
import KlauselVergleich from "../visualisierung/KlauselVergleich";
import { VIZ_TABS, VIZ_PROMPTS } from "./VizConfig";

// ── Inline-Komponenten (KlauselSelector, VizKIPanel) ─────────────────────────
function KlauselSelector({ sorted, selectedIdx, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Klausel auswählen</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {sorted.map((k, i) => {
          const color = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" }[k.risiko_stufe] || "#888";
          return (
            <button key={i} onClick={() => onChange(i)}
              style={{
                padding: "4px 10px", borderRadius: 7, border: `1px solid ${selectedIdx === i ? color : "rgba(0,0,0,0.1)"}`,
                background: selectedIdx === i ? `${color}12` : "transparent",
                fontSize: 10, fontWeight: selectedIdx === i ? 700 : 400,
                color: selectedIdx === i ? color : "#555", cursor: "pointer",
              }}>
              {k.klausel_typ?.slice(0, 22) || `#${i + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VizKIPanel({ tabId, kiResult, loading, onAnalyse }) {
  const labels = {
    heatmap:   { title: "KI-Heatmap-Analyse", color: "#B81C3A" },
    wirkung:   { title: "KI-Wirkungsbaum-Analyse", color: "#5856D6" },
    zeitachse: { title: "KI-Zeitachsen-Analyse", color: "#FF9500" },
    optionen:  { title: "KI-Optionen-Analyse", color: "#1DB954" },
    quadrant:  { title: "KI-Quadrant-Portfolio-Analyse", color: "#0A84FF" },
    vergleich: { title: "KI-Vorher/Nachher-Analyse", color: "#FF2D55" },
  };
  const { title, color } = labels[tabId] || { title: "KI-Analyse", color: "#5856D6" };

  return (
    <div style={{ background: "#fff", border: `1px solid ${color}25`, borderRadius: 13, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${color}15`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{title}</p>
          <p style={{ fontSize: 10, color: "#888", marginTop: 1 }}>Dedizierte KI-Analyse für diese Visualisierung</p>
        </div>
        <div onClick={loading ? undefined : onAnalyse}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 13px", fontSize: 11, fontWeight: 700, background: loading ? "rgba(0,0,0,0.06)" : color, color: loading ? "#aaa" : "#fff", border: `1px solid ${loading ? "rgba(0,0,0,0.1)" : color}`, borderRadius: 9, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s", userSelect: "none", flexShrink: 0 }}>
          <Sparkles style={{ width: 12, height: 12, color: loading ? "#aaa" : "#fff" }} />
          {loading ? "Analysiert…" : kiResult ? "Neu analysieren" : "KI analysieren"}
        </div>
      </div>

      {/* KI-Ergebnis anzeigen (wenn vorhanden) */}
      {kiResult && (
        <div style={{ padding: "12px 14px" }}>
          {/* Heatmap result */}
          {tabId === "heatmap" && kiResult.bewertungen && (
            <div>
              {kiResult.gesamt_heatmap_fazit && <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5, marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>{kiResult.gesamt_heatmap_fazit}</p>}
              {kiResult.top3_kritische_klauseln?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 5 }}>Top 3 kritischste Klauseln</p>
                  {kiResult.top3_kritische_klauseln.map((k, i) => <p key={i} style={{ fontSize: 11, color: "#333", marginBottom: 3 }}>{i+1}. {k}</p>)}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {kiResult.bewertungen?.sort((a,b) => b.score - a.score).map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: b.score >= 8 ? "#B81C3A" : b.score >= 6 ? "#FF9500" : b.score >= 4 ? "#0A84FF" : "#1DB954", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: "#fff" }}>{b.score?.toFixed(1)}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{b.klausel_typ}</p>
                      <p style={{ fontSize: 10, color: "#666" }}>{b.hauptrisiko}</p>
                    </div>
                    {b.sofortiger_handlungsbedarf && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#B81C3A", padding: "2px 7px", borderRadius: 5 }}>SOFORT</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wirkungsbaum result */}
          {tabId === "wirkung" && kiResult.wirkungspfade && (
            <div>
              {kiResult.kritischster_pfad && <p style={{ fontSize: 12, color: "#333", marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>⚡ {kiResult.kritischster_pfad}</p>}
              {kiResult.gesamteinfluss_eur && <p style={{ fontSize: 13, fontWeight: 800, color: color, marginBottom: 8 }}>Gesamteinfluss: {kiResult.gesamteinfluss_eur > 0 ? "+" : ""}{kiResult.gesamteinfluss_eur?.toLocaleString()} EUR</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {kiResult.wirkungspfade.map((p, i) => (
                  <div key={i} style={{ padding: "8px 11px", background: p.positiv ? "rgba(29,185,84,0.06)" : "rgba(184,28,58,0.06)", border: `1px solid ${p.positiv ? "rgba(29,185,84,0.2)" : "rgba(184,28,58,0.2)"}`, borderRadius: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{p.bereich}</p>
                      {p.finanzieller_einfluss_eur && <span style={{ fontSize: 11, fontWeight: 800, color: p.positiv ? "#1DB954" : "#B81C3A" }}>{p.finanzieller_einfluss_eur > 0 ? "+" : ""}{p.finanzieller_einfluss_eur?.toLocaleString()} €</span>}
                    </div>
                    <p style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{p.beschreibung}</p>
                    {p.betroffene_abteilungen?.length > 0 && <p style={{ fontSize: 9, color: "#888", marginTop: 3 }}>Betroffene Bereiche: {p.betroffene_abteilungen.join(", ")}</p>}
                  </div>
                ))}
              </div>
              {kiResult.empfehlung && <p style={{ fontSize: 11, color: "#1a1a1a", marginTop: 10, padding: "8px 11px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>{kiResult.empfehlung}</p>}
            </div>
          )}

          {/* Zeitachse result */}
          {tabId === "zeitachse" && kiResult.meilensteine && (
            <div>
              {kiResult.kritischer_zeitpunkt && <p style={{ fontSize: 12, color: "#FF9500", fontWeight: 700, marginBottom: 10 }}>⏰ Kritischer Zeitpunkt: {kiResult.kritischer_zeitpunkt}</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {kiResult.meilensteine.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 11px", background: m.kritisch ? "rgba(184,28,58,0.06)" : "rgba(0,0,0,0.025)", border: `1px solid ${m.kritisch ? "rgba(184,28,58,0.2)" : "rgba(0,0,0,0.06)"}`, borderRadius: 9 }}>
                    <div style={{ textAlign: "center", minWidth: 52, flexShrink: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: m.kritisch ? "#B81C3A" : "#555" }}>{m.zeitpunkt}</p>
                      <p style={{ fontSize: 9, color: "#888" }}>{m.wahrscheinlichkeit_pct}%</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{m.ereignis}</p>
                      {m.trigger && <p style={{ fontSize: 10, color: "#666" }}>Trigger: {m.trigger}</p>}
                      {m.handlungsfenster_tage && <p style={{ fontSize: 9, color: "#0A84FF" }}>Handlungsfenster: {m.handlungsfenster_tage} Tage</p>}
                    </div>
                  </div>
                ))}
              </div>
              {kiResult.fruehwarnsignale?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#FF9500", textTransform: "uppercase", marginBottom: 5 }}>Frühwarnsignale</p>
                  {kiResult.fruehwarnsignale.map((s, i) => <p key={i} style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>⚠ {s}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Optionen result */}
          {tabId === "optionen" && kiResult.optionen && (
            <div>
              {kiResult.beste_option_begruendung && <p style={{ fontSize: 12, color: "#333", marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>{kiResult.beste_option_begruendung}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                {kiResult.optionen.map((opt, i) => (
                  <div key={i} style={{ border: `2px solid ${opt.empfohlen ? color : color + "30"}`, borderRadius: 11, overflow: "hidden", background: opt.empfohlen ? `${color}07` : "#fafafa", position: "relative" }}>
                    {opt.empfohlen && <div style={{ position: "absolute", top: 0, right: 0, background: color, padding: "2px 8px", borderBottomLeftRadius: 8 }}><p style={{ fontSize: 8, fontWeight: 800, color: "#fff" }}>EMPFOHLEN</p></div>}
                    <div style={{ background: opt.empfohlen ? color : color + "18", padding: "9px 12px" }}>
                      <p style={{ fontSize: 13, fontWeight: 900, color: opt.empfohlen ? "#fff" : color }}>{opt.id}</p>
                      <p style={{ fontSize: 11, fontWeight: 700, color: opt.empfohlen ? "#fff" : color }}>{opt.titel}</p>
                    </div>
                    <div style={{ padding: "9px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                      <p style={{ fontSize: 10, color: "#555", lineHeight: 1.3 }}>{opt.beschreibung}</p>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><p style={{ fontSize: 9, color: "#aaa" }}>Erfolg</p><p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{opt.wahrscheinlichkeit_pct}%</p></div>
                        <div><p style={{ fontSize: 9, color: "#aaa" }}>Kosten</p><p style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>{opt.kosten_label || (opt.kosten_eur ? opt.kosten_eur?.toLocaleString()+"€" : "—")}</p></div>
                        <div><p style={{ fontSize: 9, color: "#aaa" }}>Wert</p><p style={{ fontSize: 11, fontWeight: 700, color: opt.strategischer_wert === "hoch" ? "#1DB954" : opt.strategischer_wert === "niedrig" ? "#B81C3A" : "#0A84FF" }}>{opt.strategischer_wert}</p></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {kiResult.verhandlungsstrategie && <p style={{ fontSize: 11, color: "#333", marginTop: 10, padding: "8px 11px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>Verhandlungsstrategie: {kiResult.verhandlungsstrategie}</p>}
            </div>
          )}

          {/* Quadrant result */}
          {tabId === "quadrant" && kiResult.portfolio && (
            <div>
              {kiResult.portfolio_fazit && <p style={{ fontSize: 12, color: "#333", marginBottom: 10, padding: "8px 11px", background: `${color}08`, borderRadius: 9 }}>{kiResult.portfolio_fazit}</p>}
              {kiResult.gesamtrisiko_score && <p style={{ fontSize: 13, fontWeight: 800, color: kiResult.gesamtrisiko_score >= 7 ? "#B81C3A" : kiResult.gesamtrisiko_score >= 5 ? "#FF9500" : "#1DB954", marginBottom: 8 }}>Gesamtrisiko-Score: {kiResult.gesamtrisiko_score}/10</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {kiResult.portfolio.sort((a,b) => (b.y_wirkungstiefe * b.x_wahrscheinlichkeit/100) - (a.y_wirkungstiefe * a.x_wahrscheinlichkeit/100)).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8 }}>
                    <div style={{ minWidth: 60, flexShrink: 0 }}>
                      <p style={{ fontSize: 9, color: "#888" }}>W:{p.x_wahrscheinlichkeit}% / T:{p.y_wirkungstiefe}</p>
                      <p style={{ fontSize: 9, fontWeight: 700, color: color }}>{p.quadrant}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>{p.klausel_typ}</p>
                      <p style={{ fontSize: 10, color: "#555" }}>{p.strategische_einordnung}</p>
                      {p.sofortmassnahme && <p style={{ fontSize: 10, color: color, marginTop: 2 }}>→ {p.sofortmassnahme}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {kiResult.top_prioritaet && <p style={{ fontSize: 11, color: "#B81C3A", fontWeight: 700, marginTop: 8 }}>🎯 Top-Priorität: {kiResult.top_prioritaet}</p>}
            </div>
          )}

          {/* Vergleich result */}
          {tabId === "vergleich" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {kiResult.risiko_reduktion_pct && <p style={{ fontSize: 13, fontWeight: 800, color: "#1DB954" }}>Risikoreduktion durch SOLL-Formulierung: -{kiResult.risiko_reduktion_pct}%</p>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ border: "2px solid rgba(184,28,58,0.35)", borderRadius: 11, overflow: "hidden" }}>
                  <div style={{ background: "#B81C3A", padding: "8px 12px" }}><p style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>IST-FORMULIERUNG</p></div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5 }}>„{kiResult.ist_formulierung}"</p>
                    {kiResult.ist_probleme?.map((p, i) => <p key={i} style={{ fontSize: 10, color: "#B81C3A", marginTop: 4 }}>■ {p}</p>)}
                  </div>
                </div>
                <div style={{ border: "2px solid rgba(29,185,84,0.35)", borderRadius: 11, overflow: "hidden" }}>
                  <div style={{ background: "#1DB954", padding: "8px 12px" }}><p style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>SOLL-FORMULIERUNG</p></div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "#333", fontStyle: "italic", lineHeight: 1.5 }}>„{kiResult.soll_formulierung}"</p>
                    {kiResult.soll_vorteile?.map((v, i) => <p key={i} style={{ fontSize: 10, color: "#1DB954", marginTop: 4 }}>■ {v}</p>)}
                  </div>
                </div>
              </div>
              {kiResult.kompromiss_formulierung && (
                <div style={{ padding: "9px 12px", background: "rgba(10,132,255,0.07)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 9 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#0A84FF", textTransform: "uppercase", marginBottom: 3 }}>Kompromissformulierung</p>
                  <p style={{ fontSize: 11, color: "#333", fontStyle: "italic" }}>„{kiResult.kompromiss_formulierung}"</p>
                </div>
              )}
              {kiResult.verhandlungsargument && <p style={{ fontSize: 11, color: "#333", padding: "8px 11px", background: "rgba(29,185,84,0.07)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>Verhandlungsargument: {kiResult.verhandlungsargument}</p>}
              {kiResult.gegner_einwand && <p style={{ fontSize: 11, color: "#666", padding: "8px 11px", background: "rgba(184,28,58,0.05)", borderRadius: 9, borderLeft: "3px solid #B81C3A" }}>Gegner-Einwand: {kiResult.gegner_einwand}</p>}
              {kiResult.rechtliche_grundlage && <p style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Rechtliche Grundlage: {kiResult.rechtliche_grundlage}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function VisualisierungsPanel({ result, scenario }) {
  const [selectedKlauselIdx, setSelectedKlauselIdx] = useState(0);
  const [kiResults, setKiResults] = useState({});
  const [kiLoading, setKiLoading] = useState({});

  const ctx = scenario?.unternehmenskontext || {};
  const sorted = result?.klauseln?.length ? [...result.klauseln].sort((a, b) =>
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(a.risiko_stufe) -
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(b.risiko_stufe)
  ) : [];
  const selectedKlausel = sorted[selectedKlauselIdx] || sorted[0];

  const runVizAnalysis = async (tabId) => {
    setKiLoading(prev => ({ ...prev, [tabId]: true }));
    try {
      const promptConfig = VIZ_PROMPTS[tabId](sorted, selectedKlausel, ctx);
      const r = await base44.integrations.Core.InvokeLLM({
        ...promptConfig,
        model: "claude_sonnet_4_6",
      });
      setKiResults(prev => ({ ...prev, [tabId]: r }));
    } catch (err) {
      console.error(`KI-Analyse [${tabId}] fehlgeschlagen:`, err?.message);
      alert(`Analyse fehlgeschlagen: ${err?.message || "Netzwerkfehler"}`);
    }
    setKiLoading(prev => ({ ...prev, [tabId]: false }));
  };

  // Auto-Analyse beim ersten Laden für ALLE Formate
  useEffect(() => {
    if (sorted?.length > 0 && Object.keys(kiResults).length === 0) {
      // Starte Analyse für alle 6 Formate nacheinander
      VIZ_TABS.forEach((t, idx) => {
        setTimeout(() => runVizAnalysis(t.id), idx * 300);
      });
    }
  }, [sorted?.length]);

  if (!result?.klauseln?.length) return null;

  return (
    <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", marginTop: 2 }}>
      <div style={{ padding: "14px 16px" }}>
        {/* ALLE Visualisierungen gleichzeitig anzeigen mit jeweils eigenem KI-Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {VIZ_TABS.map((t, idx) => {
            const tabNeedsKlausel = ["wirkung", "zeitachse", "optionen", "vergleich"].includes(t.id);
            return (
              <div key={t.id} style={{ borderBottom: idx < VIZ_TABS.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none", paddingBottom: 16, marginBottom: idx < VIZ_TABS.length - 1 ? 16 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{t.label}</p>
                    <p style={{ fontSize: 10, color: "#888" }}>{t.desc}</p>
                  </div>
                </div>
                {tabNeedsKlausel && (
                  <KlauselSelector sorted={sorted} selectedIdx={selectedKlauselIdx} onChange={setSelectedKlauselIdx} />
                )}
                {/* Diagramm + KI-Optionen SOFORT anzeigen */}
                {t.id === "heatmap" && (
                  <>
                    <KlauselHeatmap klauseln={sorted} onSelect={setSelectedKlauselIdx} selectedIdx={selectedKlauselIdx} />
                    <VizKIPanel tabId={t.id} kiResult={kiResults[t.id]} loading={!!kiLoading[t.id]} onAnalyse={() => runVizAnalysis(t.id)} />
                  </>
                )}
                {t.id === "wirkung" && (
                  <>
                    <WirkungsBaum klausel={selectedKlausel} kiResult={kiResults[t.id]} />
                    <VizKIPanel tabId={t.id} kiResult={kiResults[t.id]} loading={!!kiLoading[t.id]} onAnalyse={() => runVizAnalysis(t.id)} />
                  </>
                )}
                {t.id === "zeitachse" && (
                  <>
                    <ZeitachseSzenarien klausel={selectedKlausel} kiResult={kiResults[t.id]} />
                    <VizKIPanel tabId={t.id} kiResult={kiResults[t.id]} loading={!!kiLoading[t.id]} onAnalyse={() => runVizAnalysis(t.id)} />
                  </>
                )}
                {t.id === "optionen" && (
                  <>
                    <OptionenCards klausel={selectedKlausel} kiResult={kiResults[t.id]} />
                    <VizKIPanel tabId={t.id} kiResult={kiResults[t.id]} loading={!!kiLoading[t.id]} onAnalyse={() => runVizAnalysis(t.id)} />
                  </>
                )}
                {t.id === "quadrant" && (
                  <>
                    <ChancenRisikoQuadrant klauseln={sorted} kiResult={kiResults[t.id]} />
                    <VizKIPanel tabId={t.id} kiResult={kiResults[t.id]} loading={!!kiLoading[t.id]} onAnalyse={() => runVizAnalysis(t.id)} />
                  </>
                )}
                {t.id === "vergleich" && (
                  <>
                    <KlauselVergleich klausel={selectedKlausel} kiResult={kiResults[t.id]} />
                    <VizKIPanel tabId={t.id} kiResult={kiResults[t.id]} loading={!!kiLoading[t.id]} onAnalyse={() => runVizAnalysis(t.id)} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
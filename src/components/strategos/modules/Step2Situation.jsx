import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Clock, Sparkles, Calculator, Link2 } from "lucide-react";
import { AppleCard, AppleButton, ApplePill, SF } from "../AppleCard";

const RG_META = {
  vertragsrecht: { label: "Vertragsrecht", color: "#007AFF", icon: "📝" },
  gesellschaftsrecht: { label: "Gesellschaftsrecht", color: "#5856D6", icon: "🏢" },
  kartellrecht: { label: "Kartellrecht", color: "#AF52DE", icon: "⚖️" },
  steuerrecht: { label: "Steuerrecht", color: "#34C759", icon: "💰" },
  arbeitsrecht: { label: "Arbeitsrecht", color: "#FF9500", icon: "👥" },
  datenschutz: { label: "Datenschutz", color: "#00BCD4", icon: "🔒" },
  ip_recht: { label: "IP / Patent", color: "#FF2D55", icon: "®️" },
  compliance: { label: "Compliance", color: "#4CAF50", icon: "✅" },
  strafrecht: { label: "Wirtschaftsstrafrecht", color: "#FF3B30", icon: "🚨" },
};

function RiskRing({ score }) {
  const c = score >= 7 ? "#FF3B30" : score >= 4 ? "#FF9500" : "#34C759";
  const r = 23;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 56, height: 56 }}>
      <svg width={56} height={56}>
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={5} />
        <circle cx={28} cy={28} r={r} fill="none" stroke={c} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 10)}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "28px 28px", transition: "stroke-dashoffset 0.6s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: c }}>{score}</span>
        <span style={{ fontSize: 8, color: "#aaa" }}>/10</span>
      </div>
    </div>
  );
}

function ModulPanel({ m, onQuantify, loading }) {
  const meta = RG_META[m.rechtsgebiet] || { label: m.rechtsgebiet, color: "#888", icon: "📋" };
  const sc = m.risiko_score || 0;
  const col = sc >= 7 ? "#FF3B30" : sc >= 4 ? "#FF9500" : "#34C759";
  return (
    <AppleCard accentColor={meta.color}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1 }}>
          <span style={{ fontSize: 24 }}>{meta.icon}</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{meta.label}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: `0 0 0 3px ${col}30` }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: col }}>
                {sc >= 7 ? "Sofortiger Handlungsbedarf" : sc >= 4 ? "Mittelfristig relevant" : "Kein akutes Risiko"}
              </span>
            </div>
          </div>
        </div>
        <RiskRing score={sc} />
      </div>

      {m.findings?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Findings</p>
          {m.findings.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "6px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, minWidth: 14 }}>{i + 1}.</span>
              <span style={{ fontSize: 12, color: "#333", lineHeight: 1.4 }}>{typeof f === "string" ? f : f.text}</span>
            </div>
          ))}
        </div>
      )}

      {m.fristen?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#FF9500", textTransform: "uppercase", marginBottom: 5 }}>⏰ Fristen</p>
          {m.fristen.map((f, i) => (
            <div key={i} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
              <Clock style={{ width: 11, height: 11, color: "#FF9500" }} />
              <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{f.datum || "—"}</span>
              <span style={{ color: "#666" }}>{f.beschreibung}</span>
            </div>
          ))}
        </div>
      )}

      {m.normen?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Relevante Normen</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {m.normen.map((n, i) => <ApplePill key={i} color={meta.color}>{n}</ApplePill>)}
          </div>
        </div>
      )}

      {m.querverbindungen?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#5856D6", textTransform: "uppercase", marginBottom: 5 }}>🔗 Querverbindungen</p>
          {m.querverbindungen.map((q, i) => (
            <div key={i} style={{ fontSize: 11, color: "#555", display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
              <Link2 style={{ width: 10, height: 10, color: "#5856D6", marginTop: 2 }} />
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}

      {m.quantifizierung ? (
        <div style={{ padding: "10px 12px", background: "linear-gradient(135deg,rgba(88,86,214,0.08),rgba(0,122,255,0.08))", borderRadius: 10, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[["Eintritt", `${m.quantifizierung.eintritt_pct}%`], ["Schaden", `${(m.quantifizierung.schaden_eur || 0).toLocaleString()}€`], ["Reputation", m.quantifizierung.reputation], ["Präzedenz", m.quantifizierung.praezedenz]].map(([l, v]) => (
            <div key={l}>
              <p style={{ fontSize: 9, color: "#888", textTransform: "uppercase", fontWeight: 600 }}>{l}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <AppleButton onClick={() => onQuantify(m)} disabled={loading} variant="violet" icon={Calculator}>
          {loading ? "Berechnet…" : "Quantifizieren"}
        </AppleButton>
      )}
    </AppleCard>
  );
}

export default function Step2Situation({ scenario, onSave }) {
  const ctx = scenario.unternehmenskontext || {};
  const rechtsgebiete = ctx.rechtsgebiete || [];
  const [sit, setSit] = useState(scenario.situationsanalyse || { module: [] });
  const [analyzing, setAnalyzing] = useState(false);
  const [qId, setQId] = useState(null);

  const run = async () => {
    setAnalyzing(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Senior-Partner Großkanzlei. Analysiere den Sachverhalt pro Rechtsgebiet detailliert.
UNTERNEHMEN: ${ctx.unternehmen_name} (${ctx.rechtsform}, ${ctx.branche}), Umsatz ${ctx.umsatz}€, MA ${ctx.mitarbeiter}
HAUPTSITZ: ${ctx.hauptsitz_land}, MÄRKTE: ${(ctx.operative_maerkte || []).join(",")}
SITUATION: ${ctx.situationstyp}, ZEITKRITIKALITÄT: ${ctx.zeitkritikalitaet}/10
SACHVERHALT: ${ctx.sachverhalt_lang}
GEGNER: ${ctx.gegner_name} (${ctx.gegner_rolle})
ZU ANALYSIERENDE RECHTSGEBIETE: ${rechtsgebiete.join(", ")}
Pro Rechtsgebiet: risiko_score(0-10), findings(3-5), fristen(mit Datum), normen(konkret mit §§), querverbindungen.
Plus: gesamt_risiko(0-10), kritische_punkte(Top-3), gesamt_exposure_eur, zeitachse(Entscheidungspunkte).`,
      response_json_schema: {
        type: "object",
        properties: {
          module: { type: "array", items: { type: "object", properties: {
            rechtsgebiet: { type: "string" },
            risiko_score: { type: "number" },
            findings: { type: "array", items: { type: "string" } },
            fristen: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
            normen: { type: "array", items: { type: "string" } },
            querverbindungen: { type: "array", items: { type: "string" } }
          }}},
          gesamt_risiko: { type: "number" },
          kritische_punkte: { type: "array", items: { type: "string" } },
          gesamt_exposure_eur: { type: "number" },
          zeitachse: { type: "array", items: { type: "object", properties: { wann: { type: "string" }, was_muss_entschieden_sein: { type: "string" } } } }
        }
      },
      model: "claude_sonnet_4_6"
    });
    setSit(r);
    await onSave({ situationsanalyse: r });
    setAnalyzing(false);
  };

  const quantify = async (m) => {
    setQId(m.rechtsgebiet);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Quantifiziere das Risiko für ${m.rechtsgebiet}.
Unternehmen: ${ctx.unternehmen_name}, Umsatz ${ctx.umsatz}€
Findings: ${(m.findings || []).join(" | ")}
Normen: ${(m.normen || []).join(", ")}
Berechne: eintritt_pct(%), schaden_eur(€), reputation(gering/mittel/hoch/existenziell), praezedenz(nur_dieser_fall/alle_aehnlichen).`,
      response_json_schema: {
        type: "object",
        properties: {
          eintritt_pct: { type: "number" },
          schaden_eur: { type: "number" },
          reputation: { type: "string" },
          praezedenz: { type: "string" }
        }
      }
    });
    const u = { ...sit, module: sit.module.map(x => x.rechtsgebiet === m.rechtsgebiet ? { ...x, quantifizierung: r } : x) };
    setSit(u);
    await onSave({ situationsanalyse: u });
    setQId(null);
  };

  const has = sit.module?.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 2 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Situationsanalyse</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>KI-Tiefenanalyse pro Rechtsgebiet</p>
      </div>

      {has && (
        <AppleCard title="KI-Gesamtbewertung" accentColor="#FF3B30">
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 16, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <RiskRing score={sit.gesamt_risiko || 0} />
              <p style={{ fontSize: 10, color: "#888", marginTop: 4, fontWeight: 600 }}>Gesamt</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Top-3 Kritisch</p>
              {(sit.kritische_punkte || []).slice(0, 3).map((p, i) => (
                <p key={i} style={{ fontSize: 12, color: "#1a1a1a", marginBottom: 3, display: "flex", gap: 6 }}>
                  <AlertTriangle style={{ width: 11, height: 11, color: "#FF3B30", flexShrink: 0, marginTop: 2 }} />
                  <span>{p}</span>
                </p>
              ))}
            </div>
            {sit.gesamt_exposure_eur > 0 && (
              <div style={{ padding: "13px 15px", background: "rgba(255,59,48,0.08)", borderRadius: 12, textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "#FF3B30", fontWeight: 700, textTransform: "uppercase" }}>Gesamt-Exposure</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#FF3B30", marginTop: 2 }}>{(sit.gesamt_exposure_eur / 1000000).toFixed(1)}M€</p>
              </div>
            )}
          </div>
          {sit.zeitachse?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 7 }}>Zeitachse</p>
              {sit.zeitachse.map((z, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 10px", background: "rgba(0,0,0,0.025)", borderRadius: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#FF9500", minWidth: 80 }}>{z.wann}</span>
                  <span style={{ fontSize: 11, color: "#333" }}>{z.was_muss_entschieden_sein}</span>
                </div>
              ))}
            </div>
          )}
        </AppleCard>
      )}

      <AppleCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{has ? "Analyse aktualisieren" : "Analyse starten"}</p>
            <p style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{rechtsgebiete.length} Rechtsgebiet{rechtsgebiete.length !== 1 ? "e" : ""} · Claude Sonnet</p>
          </div>
          <AppleButton onClick={run} disabled={analyzing || rechtsgebiete.length === 0} variant="warning" icon={Sparkles}>
            {analyzing ? "Analysiert…" : has ? "Neu analysieren" : "KI-Analyse starten"}
          </AppleButton>
        </div>
        {rechtsgebiete.length === 0 && <p style={{ marginTop: 8, fontSize: 11, color: "#FF3B30" }}>⚠ Bitte in Schritt 1 Rechtsgebiete wählen.</p>}
      </AppleCard>

      {sit.module?.map((m, i) => (
        <ModulPanel key={i} m={m} onQuantify={quantify} loading={qId === m.rechtsgebiet} />
      ))}
    </div>
  );
}
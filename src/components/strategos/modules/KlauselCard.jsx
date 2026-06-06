/**
 * KlauselCard.jsx
 * 
 * Zeigt eine einzelne Klausel mit erweiterbaren Details.
 */

import { useState } from "react";
import { AlertTriangle, CheckCircle, MinusCircle } from "lucide-react";
import { ApplePill } from "../AppleCard";

const RISIKO_FARBEN = {
  kritisch: { bg: "rgba(184,28,58,0.08)", border: "rgba(184,28,58,0.25)", text: "#B81C3A", icon: AlertTriangle },
  hoch:     { bg: "rgba(255,149,0,0.08)", border: "rgba(255,149,0,0.25)", text: "#FF9500", icon: AlertTriangle },
  mittel:   { bg: "rgba(10,132,255,0.06)", border: "rgba(10,132,255,0.2)", text: "#0A84FF", icon: MinusCircle },
  niedrig:  { bg: "rgba(29,185,84,0.07)", border: "rgba(29,185,84,0.2)", text: "#1DB954", icon: CheckCircle },
  positiv:  { bg: "rgba(29,185,84,0.07)", border: "rgba(29,185,84,0.2)", text: "#1DB954", icon: CheckCircle },
};

export default function KlauselCard({ k, idx }) {
  const [open, setOpen] = useState(false);
  const cfg = RISIKO_FARBEN[k.risiko_stufe] || RISIKO_FARBEN.mittel;
  const Icon = cfg.icon;

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Icon style={{ width: 15, height: 15, color: cfg.text, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>{k.klausel_typ || `Klausel ${idx + 1}`}</span>
            <ApplePill color={cfg.text}>{k.risiko_stufe || "mittel"}</ApplePill>
            {k.norm && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#666", background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 5 }}>{k.norm}</span>}
          </div>
          <p style={{ fontSize: 11, color: "#555", marginTop: 4, lineHeight: 1.4 }}>{k.kurzbeschreibung}</p>
        </div>
        <span style={{ fontSize: 14, color: "#bbb", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 14px 13px", borderTop: `1px solid ${cfg.border}` }}>
          {k.rechtliche_mechanik && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Rechtliche Mechanik</p>
              <p style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>{k.rechtliche_mechanik}</p>
            </div>
          )}
          {(k.juristische_vorteile?.length > 0 || k.juristische_nachteile?.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {k.juristische_vorteile?.length > 0 && (
                <div style={{ padding: "7px 10px", background: "rgba(29,185,84,0.07)", borderRadius: 8 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 4 }}>Juristische Vorteile</p>
                  {k.juristische_vorteile.map((v, i) => <p key={i} style={{ fontSize: 10, color: "#333", marginBottom: 2 }}>+ {v}</p>)}
                </div>
              )}
              {k.juristische_nachteile?.length > 0 && (
                <div style={{ padding: "7px 10px", background: "rgba(184,28,58,0.07)", borderRadius: 8 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#B81C3A", textTransform: "uppercase", marginBottom: 4 }}>Juristische Nachteile</p>
                  {k.juristische_nachteile.map((v, i) => <p key={i} style={{ fontSize: 10, color: "#333", marginBottom: 2 }}>− {v}</p>)}
                </div>
              )}
            </div>
          )}
          {k.illegale_umgehung && (
            <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(184,28,58,0.08)", border: "2px solid rgba(184,28,58,0.4)", borderRadius: 9 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#B81C3A", textTransform: "uppercase", marginBottom: 4 }}>⚠ ILLEGALE UMGEHUNGSMÖGLICHKEIT — NUR ZUR INFORMATION</p>
              <p style={{ fontSize: 11, color: "#B81C3A" }}>{k.illegale_umgehung}</p>
            </div>
          )}
          {k.szenarien?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 5 }}>Szenario-Projektionen & Reaktionsempfehlungen</p>
              {k.szenarien.map((s, i) => (
                <div key={i} style={{ padding: "7px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 8, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.horizont === "kurzfristig" ? "#FF3B30" : s.horizont === "mittelfristig" ? "#FF9500" : "#34C759", textTransform: "uppercase" }}>{s.horizont}</span>
                    {s.eintrittsbedingung && <span style={{ fontSize: 10, color: "#888" }}>→ wenn: {s.eintrittsbedingung}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#333", marginBottom: s.empfohlene_reaktion ? 4 : 0 }}>{s.beschreibung}</p>
                  {s.empfohlene_reaktion && (
                    <div style={{ padding: "4px 8px", background: "rgba(29,185,84,0.08)", borderRadius: 6, borderLeft: "2px solid #1DB954" }}>
                      <p style={{ fontSize: 10, color: "#1DB954", fontWeight: 600 }}>Empfohlene Reaktion: {s.empfohlene_reaktion}</p>
                    </div>
                  )}
                  {s.chancen && <p style={{ fontSize: 10, color: "#1DB954", marginTop: 3 }}>+ {s.chancen}</p>}
                  {s.risiken && <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 2 }}>− {s.risiken}</p>}
                </div>
              ))}
            </div>
          )}
          {k.verhandlungsempfehlung && (
            <div style={{ marginTop: 10, padding: "8px 11px", background: "rgba(29,185,84,0.08)", borderRadius: 9, borderLeft: "3px solid #1DB954" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#1DB954", textTransform: "uppercase", marginBottom: 3 }}>Verhandlungsempfehlung</p>
              <p style={{ fontSize: 11, color: "#333" }}>{k.verhandlungsempfehlung}</p>
              {k.alternativ_formulierung && (
                <div style={{ marginTop: 6, padding: "6px 9px", background: "rgba(255,255,255,0.7)", borderRadius: 7, fontFamily: "monospace", fontSize: 11, color: "#1DB954" }}>
                  📝 {k.alternativ_formulierung}
                </div>
              )}
            </div>
          )}
          {k.durchsetzbarkeit && (
            <p style={{ fontSize: 10, marginTop: 8, color: "#888" }}>⚖ Durchsetzbarkeit: <strong style={{ color: k.durchsetzbar ? "#1DB954" : "#FF3B30" }}>{k.durchsetzbar ? "Durchsetzbar" : "Angreifbar"}</strong> — {k.durchsetzbarkeit}</p>
          )}
        </div>
      )}
    </div>
  );
}
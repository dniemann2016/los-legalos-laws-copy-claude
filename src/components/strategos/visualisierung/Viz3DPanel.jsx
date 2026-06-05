/**
 * 3D-VISUALISIERUNGSSYSTEM — 4 Formate aus Konzeptpapier Q2/2026
 * Implementiert mit Three.js (Canvas-basiert, kein Plotly-Dep)
 * Formate: Risikoraum · Wirkungslandschaft · Optionsraum · Portfolio-Würfel
 */
import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, RotateCcw, Info } from "lucide-react";

// ── Farb-Hilfsfunktionen ─────────────────────────────────────────────────────
const RISIKO_COLOR = (score) => {
  if (score >= 8) return "#B81C3A";
  if (score >= 6) return "#FF9500";
  if (score >= 4) return "#0A84FF";
  return "#1DB954";
};

// ── Mini 3D-Canvas-Renderer (isometrische Projektion, kein WebGL-Dep) ────────
function iso(x, y, z, cx, cy, scale = 38) {
  const ix = (x - z) * Math.cos(Math.PI / 6) * scale;
  const iy = (x + z) * Math.sin(Math.PI / 6) * scale - y * scale;
  return [cx + ix, cy + iy];
}

function drawGrid(ctx, cx, cy, size, scale) {
  ctx.strokeStyle = "rgba(0,0,0,0.07)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i <= size; i++) {
    ctx.beginPath();
    const [x0, y0] = iso(i, 0, 0, cx, cy, scale);
    const [x1, y1] = iso(i, 0, size, cx, cy, scale);
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    const [x2, y2] = iso(0, 0, i, cx, cy, scale);
    const [x3, y3] = iso(size, 0, i, cx, cy, scale);
    ctx.moveTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
  }
  // Axes
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const [ax0, ay0] = iso(0, 0, 0, cx, cy, scale);
  const [ax1, ay1] = iso(size + 0.5, 0, 0, cx, cy, scale);
  ctx.moveTo(ax0, ay0); ctx.lineTo(ax1, ay1); ctx.stroke();
  ctx.beginPath();
  const [bx0, by0] = iso(0, 0, 0, cx, cy, scale);
  const [bx1, by1] = iso(0, 0, size + 0.5, cx, cy, scale);
  ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by1); ctx.stroke();
  ctx.beginPath();
  const [yx0, yy0] = iso(0, 0, 0, cx, cy, scale);
  const [yx1, yy1] = iso(0, size + 0.5, 0, cx, cy, scale);
  ctx.moveTo(yx0, yy0); ctx.lineTo(yx1, yy1); ctx.stroke();
}

function drawAxisLabels(ctx, cx, cy, scale, labels) {
  ctx.font = "10px -apple-system,Helvetica Neue,sans-serif";
  ctx.fillStyle = "#888";
  ctx.textAlign = "center";
  const [lx, ly] = iso(3.2, 0, -0.5, cx, cy, scale);
  ctx.fillText(labels.x, lx, ly);
  const [lz, lzz] = iso(-0.5, 0, 3.2, cx, cy, scale);
  ctx.fillText(labels.z, lz, lzz);
  const [ly0, ly1] = iso(-0.3, 3.5, -0.3, cx, cy, scale);
  ctx.fillText(labels.y, ly0, ly1);
}

// ── FORMAT A: Klausel-Risikoraum ─────────────────────────────────────────────
function RisikoRaum({ klauseln, kiData }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const pointsRef = useRef([]);

  const data = kiData?.punkte?.length
    ? kiData.punkte
    : klauseln.map((k, i) => {
        const rMap = { kritisch: 0.85, hoch: 0.65, mittel: 0.45, niedrig: 0.25, positiv: 0.2 };
        return {
          name: k.klausel_typ?.slice(0, 14) || `#${i + 1}`,
          x: rMap[k.risiko_stufe] || 0.5,
          y: rMap[k.risiko_stufe] || 0.5,
          z: k.szenarien?.[0]?.horizont === "kurzfristig" ? 0.1 : k.szenarien?.[1] ? 0.5 : 0.8,
          color: RISIKO_COLOR((rMap[k.risiko_stufe] || 0.5) * 10),
          score: (rMap[k.risiko_stufe] || 0.5) * 10,
        };
      });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.45, cy = H * 0.72, scale = 40;

    drawGrid(ctx, cx, cy, 3, scale);
    drawAxisLabels(ctx, cx, cy, scale, { x: "Wahrscheinlichkeit →", z: "Zeithorizont →", y: "↑ Wirkungstiefe" });

    const pts = [];
    data.forEach((d, i) => {
      const px = d.x * 3, py = d.y * 3, pz = d.z * 3;
      const [sx, sy] = iso(px, py, pz, cx, cy, scale);
      // Shadow
      const [shx, shy] = iso(px, 0, pz, cx, cy, scale);
      ctx.beginPath(); ctx.arc(shx, shy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fill();
      // Stem
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(sx, sy);
      ctx.strokeStyle = d.color + "60"; ctx.lineWidth = 1; ctx.stroke();
      // Bubble
      const r = 7 + d.score * 0.8;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = d.color + "cc"; ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.stroke();
      // Label
      ctx.font = "bold 8px -apple-system,sans-serif";
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(d.name.slice(0, 6), sx, sy + 3);
      pts.push({ sx, sy, r, d, i });
    });
    pointsRef.current = pts;
  }, [data]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = pointsRef.current.find(p => Math.hypot(p.sx - mx, p.sy - my) < p.r + 4);
    setHovered(hit?.d || null);
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={500} height={340} onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}
        style={{ width: "100%", maxWidth: 500, cursor: "crosshair", display: "block", margin: "0 auto" }} />
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 9, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: 200 }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a" }}>{hovered.name}</p>
          <p style={{ color: "#888", marginTop: 2 }}>W: {(hovered.x * 100).toFixed(0)}% · T: {hovered.y.toFixed(1)} · Z: {(hovered.z * 5).toFixed(1)}J</p>
          {hovered.einordnung && <p style={{ color: "#555", marginTop: 3 }}>{hovered.einordnung}</p>}
        </div>
      )}
    </div>
  );
}

// ── FORMAT B: Wirkungslandschaft (Surface-Plot als Grid) ─────────────────────
function Wirkungslandschaft({ klausel, kiData }) {
  const canvasRef = useRef(null);

  const bereiche = ["Vertrieb", "Produktion", "F&E", "Finanz.", "Reputation", "Strategie"];
  const zeiten = ["Q1", "Q2", "Q4", "J2", "J3", "J5"];

  const grid = kiData?.grid?.length
    ? kiData.grid
    : bereiche.map((_, bi) => zeiten.map((_, ti) => {
        const base = klausel?.risiko_stufe === "kritisch" ? -4 : klausel?.risiko_stufe === "hoch" ? -2 : -0.5;
        return base * Math.sin(bi * 0.8 + 0.5) * Math.cos(ti * 0.6 + 0.3) + (bi === 3 ? -8 : 0);
      }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.38, cy = H * 0.78, scale = 28;

    const NB = bereiche.length, NT = zeiten.length;
    const allVals = grid.flat();
    const minV = Math.min(...allVals), maxV = Math.max(...allVals);
    const norm = (v) => (v - minV) / (maxV - minV || 1);

    // Draw surface cells back-to-front
    for (let bi = NB - 1; bi >= 0; bi--) {
      for (let ti = NT - 1; ti >= 0; ti--) {
        if (bi >= grid.length || ti >= (grid[bi]?.length || 0)) continue;
        const v = grid[bi][ti];
        const n = norm(v);
        const r = v < 0 ? Math.round(184 + (1 - n) * 40) : 29;
        const g = v < 0 ? Math.round(28 + n * 40) : 185;
        const b = v < 0 ? 58 : 84;
        const alpha = 0.7;
        const yscale = (v / (Math.abs(minV) || 1)) * 2.5;

        const corners = [
          [bi / (NB - 1) * 3, yscale, ti / (NT - 1) * 3],
          [(bi + 1) / (NB - 1) * 3, yscale, ti / (NT - 1) * 3],
          [(bi + 1) / (NB - 1) * 3, yscale, (ti + 1) / (NT - 1) * 3],
          [bi / (NB - 1) * 3, yscale, (ti + 1) / (NT - 1) * 3],
        ];
        ctx.beginPath();
        corners.forEach(([x, y, z], idx) => {
          const [px, py] = iso(x, y, z, cx, cy, scale);
          idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
    }

    // Labels
    ctx.font = "9px -apple-system,sans-serif"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
    bereiche.forEach((b, bi) => {
      const [px, py] = iso(bi / (NB - 1) * 3 + 0.2, 0, -0.3, cx, cy, scale);
      ctx.fillText(b, px, py);
    });
    zeiten.forEach((t, ti) => {
      const [px, py] = iso(-0.4, 0, ti / (NT - 1) * 3, cx, cy, scale);
      ctx.fillText(t, px, py);
    });
    ctx.fillStyle = "#5856D6";
    const [lx, ly] = iso(1.5, 2.8, -0.8, cx, cy, scale);
    ctx.fillText("€-Wirkung (Mio) ↑", lx, ly - 8);
  }, [grid, klausel]);

  return (
    <canvas ref={canvasRef} width={480} height={320}
      style={{ width: "100%", maxWidth: 480, display: "block", margin: "0 auto" }} />
  );
}

// ── FORMAT C: Optionsraum ─────────────────────────────────────────────────────
function Optionsraum({ kiData, klausel }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const pointsRef = useRef([]);

  const defaultOptions = [
    { name: "A: Akzeptieren", x: 0.9, y: 0.05, z: 0.1, color: "#888" },
    { name: "B: Nachverh.", x: 0.62, y: 0.4, z: 0.7, color: "#0A84FF", empfohlen: true },
    { name: "C: Strukturen", x: 0.5, y: 0.6, z: 0.5, color: "#FF9500" },
    { name: "D: Kompens.", x: 0.45, y: 0.7, z: 0.45, color: "#FF9500" },
    { name: "E: Garantien", x: 0.35, y: 0.5, z: 0.55, color: "#5856D6" },
    { name: "F: Klauselangriff", x: 0.28, y: 0.9, z: 0.95, color: "#B81C3A" },
  ];

  const data = kiData?.optionen?.length
    ? kiData.optionen.map(o => ({
        name: o.name,
        x: Math.min(1, (o.erfolg || 50) / 100),
        y: Math.min(1.2, (o.kosten_mio || 0.5)),
        z: Math.min(1, (o.wert || 0.5)),
        color: o.empfohlen ? "#1DB954" : "#0A84FF",
        empfohlen: o.empfohlen,
        detail: o.detail,
      }))
    : defaultOptions;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.45, cy = H * 0.72, scale = 42;

    drawGrid(ctx, cx, cy, 3, scale);
    drawAxisLabels(ctx, cx, cy, scale, { x: "Erfolgsw. →", z: "Kosten (Mio€) →", y: "↑ Strat. Wert" });

    const pts = [];
    data.forEach((d) => {
      const px = d.x * 3, py = d.z * 3, pz = d.y * 3;
      const [sx, sy] = iso(px, py, pz, cx, cy, scale);
      const [shx, shy] = iso(px, 0, pz, cx, cy, scale);
      ctx.beginPath(); ctx.arc(shx, shy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(sx, sy);
      ctx.strokeStyle = d.color + "50"; ctx.lineWidth = 1; ctx.stroke();
      const r = d.empfohlen ? 16 : 11;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = d.color + "bb"; ctx.fill();
      if (d.empfohlen) { ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.font = "bold 7px -apple-system,sans-serif";
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(d.name.slice(0, 8), sx, sy + 3);
      pts.push({ sx, sy, r, d });
    });
    pointsRef.current = pts;
  }, [data]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleX;
    const hit = pointsRef.current.find(p => Math.hypot(p.sx - mx, p.sy - my) < p.r + 6);
    setHovered(hit?.d || null);
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={500} height={340} onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}
        style={{ width: "100%", maxWidth: 500, cursor: "crosshair", display: "block", margin: "0 auto" }} />
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 9, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: 200 }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a" }}>{hovered.name}</p>
          <p style={{ color: "#888", marginTop: 2 }}>Erfolg: {(hovered.x * 100).toFixed(0)}% · Kosten: {hovered.y.toFixed(2)}M€</p>
          <p style={{ color: "#555" }}>Strategischer Wert: {(hovered.z * 10).toFixed(1)}/10</p>
          {hovered.empfohlen && <p style={{ color: "#1DB954", fontWeight: 700 }}>★ EMPFOHLEN</p>}
          {hovered.detail && <p style={{ color: "#666", marginTop: 3 }}>{hovered.detail}</p>}
        </div>
      )}
    </div>
  );
}

// ── FORMAT D: Portfolio-Würfel ────────────────────────────────────────────────
function PortfolioWuerfel({ klauseln, kiData }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const pointsRef = useRef([]);

  const RISIKO_SCORE = { kritisch: 8.5, hoch: 6.5, mittel: 4.5, niedrig: 2.5, positiv: 2 };

  const data = kiData?.vertraege?.length
    ? kiData.vertraege
    : klauseln.map((k, i) => ({
        name: k.klausel_typ?.slice(0, 16) || `#${i + 1}`,
        x: 10 + Math.random() * 140,
        y: RISIKO_SCORE[k.risiko_stufe] || 5,
        z: k.szenarien?.length ? (k.szenarien[0]?.horizont === "langfristig" ? 6 : k.szenarien[0]?.horizont === "mittelfristig" ? 4 : 1) : 3,
        color: RISIKO_COLOR(RISIKO_SCORE[k.risiko_stufe] || 5),
        score: RISIKO_SCORE[k.risiko_stufe] || 5,
      }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.42, cy = H * 0.76, scale = 26;

    drawGrid(ctx, cx, cy, 3, scale);
    drawAxisLabels(ctx, cx, cy, scale, { x: "Volumen (Mio€) →", z: "Restlaufzeit (J) →", y: "↑ Risiko-Score" });

    const pts = [];
    data.forEach((d) => {
      const px = (d.x / 200) * 3, py = (d.y / 10) * 3, pz = (Math.min(d.z, 8) / 8) * 3;
      const [sx, sy] = iso(px, py, pz, cx, cy, scale);
      const [shx, shy] = iso(px, 0, pz, cx, cy, scale);
      ctx.beginPath(); ctx.arc(shx, shy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.07)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(sx, sy);
      ctx.strokeStyle = d.color + "40"; ctx.lineWidth = 1; ctx.stroke();
      const r = 6 + d.score * 0.7;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = d.color + "bb"; ctx.fill();
      ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = "bold 7px -apple-system,sans-serif";
      ctx.fillStyle = "#fff"; ctx.textAlign = "center";
      ctx.fillText(d.name.slice(0, 7), sx, sy + 2.5);
      pts.push({ sx, sy, r, d });
    });
    pointsRef.current = pts;
  }, [data]);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleX;
    const hit = pointsRef.current.find(p => Math.hypot(p.sx - mx, p.sy - my) < p.r + 5);
    setHovered(hit?.d || null);
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={500} height={340} onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)}
        style={{ width: "100%", maxWidth: 500, cursor: "crosshair", display: "block", margin: "0 auto" }} />
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 9, padding: "8px 12px", fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxWidth: 200 }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a" }}>{hovered.name}</p>
          <p style={{ color: "#888", marginTop: 2 }}>Volumen: {hovered.x?.toFixed(0)}M€ · Risiko: {hovered.y?.toFixed(1)}/10</p>
          <p style={{ color: "#555" }}>Restlaufzeit: {hovered.z?.toFixed(1)} Jahre</p>
        </div>
      )}
    </div>
  );
}

// ── KI-Prompts für 3D-Analysen ────────────────────────────────────────────────
const PROMPTS_3D = {
  risikoraum: (klauseln, ctx) => ({
    prompt: `Erstelle für den 3D-Klausel-Risikoraum (Wahrscheinlichkeit × Wirkungstiefe × Zeithorizont) eine präzise Positionierung aller Klauseln im Raum. Jede Klausel soll als Punkt in einem 3D-Würfel positioniert werden.

Klauseln: ${klauseln.map(k => `${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung?.slice(0,60)}`).join("\n")}
Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"})

Pro Klausel: x (Eintrittswahrscheinlichkeit 0-1), y (Wirkungstiefe 0-1), z (Zeithorizont 0=sofort bis 1=langfristig 5J+), Einordnung in einem Satz, strategische Priorität.`,
    response_json_schema: {
      type: "object", properties: {
        punkte: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, x: { type: "number" }, y: { type: "number" }, z: { type: "number" },
          color: { type: "string" }, score: { type: "number" }, einordnung: { type: "string" }, prioritaet: { type: "number" }
        }}},
        gesamt_fazit: { type: "string" }, kritische_zone: { type: "string" }
      }
    }
  }),
  wirkungslandschaft: (klauseln, klausel, ctx) => ({
    prompt: `Erstelle eine Wirkungslandschaft (Surface-Plot) für die Klausel "${klausel?.klausel_typ}": Wie wirkt sie über die Zeit auf verschiedene Konzernbereiche in Euro?

Klausel: ${klausel?.klausel_typ} [${klausel?.risiko_stufe}]
${klausel?.kurzbeschreibung}
Unternehmen: ${ctx.unternehmen_name || "—"} (Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(1)+"M€" : "unbekannt"})

Erstelle ein 6×6 Grid (Bereiche × Zeitpunkte) mit Euro-Wirkung in Millionen (negativ=Schaden, positiv=Vorteil).
Bereiche: Vertrieb, Produktion, F&E, Finanzierung, Reputation, Strategie
Zeitpunkte: Q1, Q2, Q4, J2, J3, J5`,
    response_json_schema: {
      type: "object", properties: {
        grid: { type: "array", items: { type: "array", items: { type: "number" } } },
        gesamteinfluss_mio: { type: "number" },
        kritischer_bereich: { type: "string" },
        kritischer_zeitpunkt: { type: "string" },
        fazit: { type: "string" }
      }
    }
  }),
  optionsraum: (klauseln, klausel, ctx) => ({
    prompt: `Erstelle den 3D-Optionsraum für die Klausel "${klausel?.klausel_typ}": alle Handlungsoptionen als Punkte in einem Raum aus Erfolgswahrscheinlichkeit × Kosten × Strategischem Wert.

Klausel: ${klausel?.klausel_typ} [${klausel?.risiko_stufe}]
Gegenpartei: ${ctx.gegner_name || "—"}
Bisherige Empfehlung: ${klausel?.verhandlungsempfehlung || "—"}

Erstelle 5-7 Optionen von konservativ bis aggressiv. Jede Option mit: Erfolgswahrscheinlichkeit (0-1), Kosten in Mio Euro (0-1.5), strategischer Wert (0-1), ob empfohlen.`,
    response_json_schema: {
      type: "object", properties: {
        optionen: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, erfolg: { type: "number" }, kosten_mio: { type: "number" },
          wert: { type: "number" }, empfohlen: { type: "boolean" }, detail: { type: "string" }
        }}},
        beste_option: { type: "string" }, pareto_hinweis: { type: "string" }
      }
    }
  }),
  portfolio: (klauseln, klausel, ctx) => ({
    prompt: `Erstelle den Portfolio-Würfel für alle Klauseln dieses Vertrags: jede Klausel als Punkt im Raum aus Vertragsvolumen × Risikoscore × Restlaufzeit.

Klauseln: ${klauseln.map(k => `${k.klausel_typ} [${k.risiko_stufe}]`).join(", ")}
Unternehmen: ${ctx.unternehmen_name || "—"}, Jahresumsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(0)+"M€" : "unbekannt"}

Pro Klausel: geschätztes jährliches Vertragsvolumen (x, in Mio€), Risikoscore (y, 0-10), Restlaufzeit (z, in Jahren 0-8).
Identifiziere die kritische Zone (hohes Risiko + lange Laufzeit + hohes Volumen).`,
    response_json_schema: {
      type: "object", properties: {
        vertraege: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, x: { type: "number" }, y: { type: "number" }, z: { type: "number" },
          color: { type: "string" }, score: { type: "number" }
        }}},
        kritische_zone: { type: "string" }, gesamtrisiko_bewertung: { type: "string" }
      }
    }
  }),
};

const TABS_3D = [
  { id: "risikoraum",         label: "3D·01 Risikoraum",        icon: "🎯", desc: "Wahrscheinlichkeit × Wirkung × Zeit" },
  { id: "wirkungslandschaft", label: "3D·03 Wirkungslandschaft", icon: "🏔", desc: "Surface: Bereiche × Zeit × €" },
  { id: "optionsraum",        label: "3D·04 Optionsraum",        icon: "🚀", desc: "Erfolg × Kosten × Strat. Wert" },
  { id: "portfolio",          label: "3D·12 Portfolio-Würfel",   icon: "💎", desc: "Volumen × Risiko × Restlaufzeit" },
];

const NEEDS_KLAUSEL = ["wirkungslandschaft", "optionsraum"];

export default function Viz3DPanel({ result, scenario }) {
  const [activeTab, setActiveTab] = useState("risikoraum");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [kiResults, setKiResults] = useState({});
  const [kiLoading, setKiLoading] = useState({});
  const [error, setError] = useState(null);

  const sortedRef = useRef([]);
  const selectedIdxRef = useRef(0);
  const ctxRef = useRef({});

  if (!result?.klauseln?.length) return null;

  const ctx = scenario?.unternehmenskontext || {};
  const sorted = [...result.klauseln].sort((a, b) =>
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(a.risiko_stufe) -
    ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(b.risiko_stufe)
  );
  const selectedKlausel = sorted[selectedIdx] || sorted[0];

  sortedRef.current = sorted;
  selectedIdxRef.current = selectedIdx;
  ctxRef.current = ctx;

  const runAnalysis = async (tabId) => {
    const cur = sortedRef.current;
    const klausel = cur[selectedIdxRef.current] || cur[0];
    const context = ctxRef.current;
    if (!cur.length) return;
    setKiLoading(p => ({ ...p, [tabId]: true }));
    setError(null);
    try {
      const cfg = PROMPTS_3D[tabId](cur, klausel, context);
      const r = await base44.integrations.Core.InvokeLLM({ ...cfg, model: "claude_sonnet_4_6" });
      setKiResults(p => ({ ...p, [tabId]: r }));
    } catch (err) {
      setError(err?.message || "Analyse fehlgeschlagen");
    }
    setKiLoading(p => ({ ...p, [tabId]: false }));
  };

  const activeKI = kiResults[activeTab];
  const isLoading = !!kiLoading[activeTab];
  const activeTabInfo = TABS_3D.find(t => t.id === activeTab);
  const needsKlausel = NEEDS_KLAUSEL.includes(activeTab);

  return (
    <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", marginTop: 2 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🧊</span>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>3D-Visualisierungssystem — Räumliche Analyse (x · y · z)</p>
          <span style={{ fontSize: 9, color: "#888", marginLeft: "auto" }}>Interaktiv · Hover für Details · KI-kalibriert</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {TABS_3D.map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "5px 11px", borderRadius: 8, cursor: "pointer",
                fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500,
                background: activeTab === t.id ? "#5856D6" : "rgba(0,0,0,0.05)",
                color: activeTab === t.id ? "#fff" : "#555",
                border: activeTab === t.id ? "1px solid #5856D6" : "1px solid transparent",
                transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4, userSelect: "none",
              }}>
              <span>{t.icon}</span>{t.label}
              {kiResults[t.id] && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1DB954", flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(88,86,214,0.05)", borderRadius: 9, marginBottom: 12, border: "1px solid rgba(88,86,214,0.12)" }}>
          <Info style={{ width: 12, height: 12, color: "#5856D6", flexShrink: 0 }} />
          <p style={{ fontSize: 10, color: "#5856D6" }}>
            <strong>{activeTabInfo?.label}</strong> — {activeTabInfo?.desc}
            {!activeKI && " · KI-Analyse für präzise Koordinaten starten"}
          </p>
        </div>

        {/* Klausel-Selektor */}
        {needsKlausel && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Klausel für Detailansicht</p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {sorted.map((k, i) => {
                const c = { kritisch: "#B81C3A", hoch: "#FF9500", mittel: "#0A84FF", niedrig: "#1DB954", positiv: "#1DB954" }[k.risiko_stufe] || "#888";
                return (
                  <button key={i} onClick={() => setSelectedIdx(i)}
                    style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${selectedIdx === i ? c : "rgba(0,0,0,0.1)"}`,
                      background: selectedIdx === i ? `${c}12` : "transparent", fontSize: 10, fontWeight: selectedIdx === i ? 700 : 400,
                      color: selectedIdx === i ? c : "#555", cursor: "pointer" }}>
                    {k.klausel_typ?.slice(0, 20) || `#${i + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* KI-Trigger */}
        <div style={{ background: "#fff", border: "1px solid rgba(88,86,214,0.2)", borderRadius: 11, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#1a1a1a" }}>KI-3D-Kalibrierung</p>
            <p style={{ fontSize: 10, color: "#888", marginTop: 1 }}>
              {activeKI ? "KI-Daten aktiv — Visualisierung ist präzise kalibriert" : "Ohne KI: Fallback-Koordinaten aus Klausel-Rohdaten"}
            </p>
            {error && <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 2 }}>⚠ {error}</p>}
          </div>
          <div onClick={isLoading ? undefined : () => runAnalysis(activeTab)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700,
              background: isLoading ? "rgba(0,0,0,0.06)" : "#5856D6", color: isLoading ? "#aaa" : "#fff",
              border: `1px solid ${isLoading ? "rgba(0,0,0,0.1)" : "#5856D6"}`, borderRadius: 9, cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s", userSelect: "none", flexShrink: 0 }}>
            <Sparkles style={{ width: 12, height: 12 }} />
            {isLoading ? "Analysiert…" : activeKI ? "Neu kalibrieren" : "KI kalibrieren"}
          </div>
        </div>

        {/* KI-Fazit */}
        {activeKI && (activeKI.gesamt_fazit || activeKI.fazit || activeKI.kritische_zone || activeKI.gesamtrisiko_bewertung) && (
          <div style={{ padding: "9px 12px", background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: 9, marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>
              {activeKI.gesamt_fazit || activeKI.fazit || activeKI.gesamtrisiko_bewertung}
            </p>
            {(activeKI.kritische_zone || activeKI.kritischer_bereich) && (
              <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 4 }}>
                🎯 Kritische Zone: {activeKI.kritische_zone || activeKI.kritischer_bereich}
              </p>
            )}
            {activeKI.gesamteinfluss_mio != null && (
              <p style={{ fontSize: 12, fontWeight: 800, color: activeKI.gesamteinfluss_mio < 0 ? "#B81C3A" : "#1DB954", marginTop: 4 }}>
                Gesamteinfluss: {activeKI.gesamteinfluss_mio > 0 ? "+" : ""}{activeKI.gesamteinfluss_mio.toFixed(1)} Mio €
              </p>
            )}
            {activeKI.pareto_hinweis && <p style={{ fontSize: 10, color: "#5856D6", marginTop: 3 }}>📐 {activeKI.pareto_hinweis}</p>}
          </div>
        )}

        {/* 3D Visualisierung */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", padding: "12px 8px", overflow: "hidden" }}>
          {activeTab === "risikoraum"         && <RisikoRaum klauseln={sorted} kiData={activeKI} />}
          {activeTab === "wirkungslandschaft" && <Wirkungslandschaft klausel={selectedKlausel} kiData={activeKI} />}
          {activeTab === "optionsraum"        && <Optionsraum klausel={selectedKlausel} kiData={activeKI} />}
          {activeTab === "portfolio"          && <PortfolioWuerfel klauseln={sorted} kiData={activeKI} />}
        </div>

        {/* Legende */}
        <p style={{ fontSize: 9, color: "#bbb", marginTop: 8, textAlign: "center", fontStyle: "italic" }}>
          Isometrische 3D-Darstellung · Hover über Punkte für Details · KI-Analyse für präzise Koordinaten
        </p>
      </div>
    </div>
  );
}
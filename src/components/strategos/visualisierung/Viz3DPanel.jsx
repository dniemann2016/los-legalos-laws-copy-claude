/**
 * 3D-VISUALISIERUNGSSYSTEM — 4 Formate nach Konzeptpapier Q2/2026
 *
 * FORMAT 01 — Klausel-Risikoraum
 *   X: Eintrittswahrscheinlichkeit (0=nie, 1=sicher)
 *   Y: Wirkungstiefe ökonomisch (0=irrelevant, 1=existenzbedrohend)
 *   Z: Zeithorizont (0=heute, 1=langfristig 5+J)
 *
 * FORMAT 03 — Wirkungslandschaft (Surface)
 *   X: Konzernbereiche (Vertrieb, Produktion, F&E, Finanzierung, Reputation, Strategie)
 *   Y: Zeitpunkte (Q1 bis J5)
 *   Z: Euro-Wirkung in Mio, positiv wie negativ
 *
 * FORMAT 04 — Optionsraum
 *   X: Erfolgswahrscheinlichkeit (0=aussichtslos, 1=sicher)
 *   Y: Kosten in Mio Euro
 *   Z: Strategischer Wert (0=neutral, 1=transformativ)
 *
 * FORMAT 12 — Portfolio-Würfel
 *   X: Vertragsvolumen pro Jahr in Mio Euro
 *   Y: Risikoscore (0–10)
 *   Z: Restlaufzeit in Jahren
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Info, RotateCcw } from "lucide-react";

// ── 3D-Projektion mit Rotation, Zoom und Pan ─────────────────────────────────
function project3D(x, y, z, rotX, rotY, cx, cy, scale, zoom = 1, pan = { x: 0, y: 0 }) {
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x1 =  x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;
  const fov = 6;
  const w = fov / (fov + z2 * 0.3 + 1);
  const effectiveScale = scale * zoom;
  return [cx + pan.x + x1 * effectiveScale * w, cy + pan.y - y2 * effectiveScale * w, w];
}

// ── Vollständige 3D-Controls: Rotate (LMB drag) + Zoom (scroll/pinch) + Pan (RMB/MMB drag) ──
function useRotation(defaultRotX = 0.45, defaultRotY = -0.6) {
  const [rot, setRot] = useState({ x: defaultRotX, y: defaultRotY });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null); // { mode: "rotate"|"pan", mx, my, rx, ry, px, py }
  const pinch = useRef(null); // { dist, zoom }

  // ── Mouse Down: LMB = rotate, RMB/MMB = pan ──
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    if (e.button === 0) {
      drag.current = { mode: "rotate", mx: e.clientX, my: e.clientY, rx: rot.x, ry: rot.y };
    } else if (e.button === 1 || e.button === 2) {
      drag.current = { mode: "pan", mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    }
  }, [rot, pan]);

  const onMouseMove = useCallback((e) => {
    if (!drag.current) return;
    if (drag.current.mode === "rotate") {
      const dx = (e.clientX - drag.current.mx) * 0.008;
      const dy = (e.clientY - drag.current.my) * 0.008;
      setRot({
        x: Math.max(-1.2, Math.min(1.2, drag.current.rx + dy)),
        y: drag.current.ry + dx,
      });
    } else {
      const dx = (e.clientX - drag.current.mx) * 0.5;
      const dy = (e.clientY - drag.current.my) * 0.5;
      setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
    }
  }, []);

  const onMouseUp = useCallback(() => { drag.current = null; }, []);

  // ── Scroll Wheel: Zoom ──
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(4, z * delta)));
  }, []);

  // ── Touch: 1-finger rotate, 2-finger pinch-zoom + pan ──
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      drag.current = { mode: "rotate", mx: t.clientX, my: t.clientY, rx: rot.x, ry: rot.y };
      pinch.current = null;
    } else if (e.touches.length === 2) {
      drag.current = null;
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      pinch.current = { dist: Math.hypot(dx, dy), zoom, px: pan.x, py: pan.y,
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
    }
  }, [rot, zoom, pan]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current?.mode === "rotate") {
      const t = e.touches[0];
      const dx = (t.clientX - drag.current.mx) * 0.008;
      const dy = (t.clientY - drag.current.my) * 0.008;
      setRot({
        x: Math.max(-1.2, Math.min(1.2, drag.current.rx + dy)),
        y: drag.current.ry + dx,
      });
    } else if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.hypot(dx, dy);
      const scale = newDist / pinch.current.dist;
      setZoom(Math.max(0.3, Math.min(4, pinch.current.zoom * scale)));
      // Two-finger pan
      const newCx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const newCy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setPan({
        x: pinch.current.px + (newCx - pinch.current.cx) * 0.5,
        y: pinch.current.py + (newCy - pinch.current.cy) * 0.5,
      });
    }
  }, []);

  const onTouchEnd = useCallback(() => { drag.current = null; pinch.current = null; }, []);

  // Prevent context menu on right-click
  const onContextMenu = useCallback((e) => e.preventDefault(), []);

  const reset = useCallback(() => {
    setRot({ x: defaultRotX, y: defaultRotY });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [defaultRotX, defaultRotY]);

  return { rot, zoom, pan, onMouseDown, onMouseMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd, onContextMenu, reset };
}

// Achsengitter mit echter 3D-Rotation + Zoom/Pan
function drawRotatedBox(ctx, rotX, rotY, cx, cy, scale, size = 3, zoom = 1, pan = { x: 0, y: 0 }) {
  const proj = (x, y, z) => project3D(x - size/2, y - size/2, z - size/2, rotX, rotY, cx, cy, scale, zoom, pan);

  // Bodengitter
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i <= size; i++) {
    ctx.beginPath();
    let [px, py] = proj(i, 0, 0); ctx.moveTo(px, py);
    [px, py] = proj(i, 0, size); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath();
    [px, py] = proj(0, 0, i); ctx.moveTo(px, py);
    [px, py] = proj(size, 0, i); ctx.lineTo(px, py); ctx.stroke();
  }
  // Rückwände (transparent)
  ctx.strokeStyle = "rgba(0,0,0,0.05)"; ctx.lineWidth = 0.5;
  for (let i = 0; i <= size; i++) {
    ctx.beginPath();
    let [px, py] = proj(0, i, 0); ctx.moveTo(px, py);
    [px, py] = proj(0, i, size); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath();
    [px, py] = proj(0, 0, i); ctx.moveTo(px, py);
    [px, py] = proj(0, size, i); ctx.lineTo(px, py); ctx.stroke();
  }
  // Achslinien
  ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.8;
  const axes = [
    [[0,0,0],[size+0.5,0,0]],
    [[0,0,0],[0,size+0.5,0]],
    [[0,0,0],[0,0,size+0.5]],
  ];
  axes.forEach(([a, b]) => {
    ctx.beginPath();
    let [px, py] = proj(...a); ctx.moveTo(px, py);
    [px, py] = proj(...b); ctx.lineTo(px, py); ctx.stroke();
  });
}

function drawRotatedLabels(ctx, rotX, rotY, cx, cy, scale, labels, size = 3, zoom = 1, pan = { x: 0, y: 0 }) {
  const proj = (x, y, z) => project3D(x - size/2, y - size/2, z - size/2, rotX, rotY, cx, cy, scale, zoom, pan);
  ctx.font = "bold 9px -apple-system,'Helvetica Neue',sans-serif"; ctx.textAlign = "center";
  // X-Label
  ctx.fillStyle = "#555";
  let [lx, ly] = proj(size * 0.5, -0.7, -0.3); ctx.fillText(labels.x, lx, ly);
  // Z-Label
  [lx, ly] = proj(-0.3, -0.7, size * 0.5); ctx.fillText(labels.z, lx, ly);
  // Y-Label
  ctx.fillStyle = "#5856D6";
  [lx, ly] = proj(-0.6, size * 0.5, -0.3); ctx.fillText(labels.y, lx, ly);
}

// ── Farb-Hilfsfunktionen ──────────────────────────────────────────────────────
const RISIKO_COLOR = (score) => {
  if (score >= 8) return "#B81C3A";
  if (score >= 6) return "#FF9500";
  if (score >= 4) return "#0A84FF";
  return "#1DB954";
};

const RISIKO_SCORE_MAP = { kritisch: 8.5, hoch: 6.5, mittel: 4.5, niedrig: 2.5, positiv: 2 };



// ── Bubble mit Schatten & Stiel ───────────────────────────────────────────────
function drawBubble(ctx, sx, sy, shx, shy, r, color, label, empfohlen = false) {
  // Schatten am Boden
  ctx.beginPath(); ctx.arc(shx, shy, Math.max(2, r * 0.4), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fill();
  // Stiel
  ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(sx, sy);
  ctx.strokeStyle = color + "55"; ctx.lineWidth = 1; ctx.stroke();
  // Bubble
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = color + "cc"; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = empfohlen ? 2.5 : 1.5; ctx.stroke();
  if (empfohlen) {
    ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = color + "44"; ctx.lineWidth = 2; ctx.stroke();
  }
  // Label
  ctx.font = `bold ${Math.max(6, r * 0.55)}px -apple-system,sans-serif`;
  ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.fillText(label.slice(0, 7), sx, sy + Math.max(2, r * 0.22));
}

// ── Overlay: Zoom-Anzeige + Reset + Steuerhinweis ────────────────────────────
function Controls({ zoom, reset }) {
  return (
    <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#aaa", background: "rgba(255,255,255,0.85)", padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.07)" }}>
          LMB: drehen · RMB: verschieben · Scroll: zoom · Pinch: touch
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, pointerEvents: "all" }}>
        <span style={{ fontSize: 9, color: "#888", background: "rgba(255,255,255,0.85)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.07)" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={reset} title="Ansicht zurücksetzen"
          style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 10, color: "#555", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <RotateCcw style={{ width: 10, height: 10 }} /> Reset
        </button>
      </div>
    </div>
  );
}

// ── FORMAT 01: Klausel-Risikoraum ─────────────────────────────────────────────
function RisikoRaum({ klauseln, kiData }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const pointsRef = useRef([]);
  const { rot, zoom, pan, onMouseDown, onMouseMove: onRotMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd, onContextMenu, reset } = useRotation(0.4, -0.55);

  const data = kiData?.punkte?.length
    ? kiData.punkte.map(p => ({
        name: p.name || "?",
        x: Math.min(1, Math.max(0, p.x || 0)),
        y: Math.min(1, Math.max(0, p.y || 0)),
        z: Math.min(1, Math.max(0, p.z || 0)),
        color: RISIKO_COLOR((p.score || p.y * 10) || 5),
        score: p.score || p.y * 10 || 5,
        einordnung: p.einordnung,
      }))
    : klauseln.map((k, i) => {
        const rMap = { kritisch: 0.85, hoch: 0.65, mittel: 0.45, niedrig: 0.25, positiv: 0.2 };
        const horizMap = { kurzfristig: 0.1, mittelfristig: 0.5, langfristig: 0.85 };
        return {
          name: k.klausel_typ?.slice(0, 12) || `§${i + 1}`,
          x: rMap[k.risiko_stufe] || 0.5,
          y: rMap[k.risiko_stufe] || 0.5,
          z: horizMap[k.szenarien?.[0]?.horizont] ?? 0.6,
          color: RISIKO_COLOR((rMap[k.risiko_stufe] || 0.5) * 10),
          score: (rMap[k.risiko_stufe] || 0.5) * 10,
          einordnung: k.kurzbeschreibung?.slice(0, 60),
        };
      });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5, scale = 58;

    drawRotatedBox(ctx, rot.x, rot.y, cx, cy, scale, 3, zoom, pan);
    drawRotatedLabels(ctx, rot.x, rot.y, cx, cy, scale, {
      x: "X: Wahrscheinlichkeit", z: "Z: Zeithorizont", y: "Y: Wirkungstiefe",
    }, 3, zoom, pan);

    const proj = (x, y, z) => project3D(x - 1.5, y - 1.5, z - 1.5, rot.x, rot.y, cx, cy, scale, zoom, pan);
    const pts = [];
    [...data].sort((a, b) => {
      const [,,wa] = proj(a.x * 3, a.y * 3, a.z * 3);
      const [,,wb] = proj(b.x * 3, b.y * 3, b.z * 3);
      return wa - wb;
    }).forEach((d) => {
      const [sx, sy] = proj(d.x * 3, d.y * 3, d.z * 3);
      const [shx, shy] = proj(d.x * 3, 0, d.z * 3);
      const r = 7 + d.score * 0.85;
      drawBubble(ctx, sx, sy, shx, shy, r, d.color, d.name);
      pts.push({ sx, sy, r, d });
    });
    pointsRef.current = pts;
  }, [data, rot, zoom, pan]);

  const handleMouseMove = (e) => {
    onRotMove(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sx;
    const hit = pointsRef.current.find(p => Math.hypot(p.sx - mx, p.sy - my) < p.r + 5);
    setHovered(hit?.d || null);
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={540} height={360}
        onMouseDown={onMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={() => { onMouseUp(); setHovered(null); }}
        onWheel={onWheel} onContextMenu={onContextMenu}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ width: "100%", maxWidth: 540, cursor: "grab", display: "block", margin: "0 auto", userSelect: "none", touchAction: "none" }} />
      <Controls zoom={zoom} reset={reset} />
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "9px 13px", fontSize: 11, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxWidth: 220, zIndex: 10, pointerEvents: "none" }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{hovered.name}</p>
          <p style={{ color: "#888" }}>X Wahrsch.: {(hovered.x * 100).toFixed(0)}%</p>
          <p style={{ color: "#888" }}>Y Wirkung: {(hovered.y * 10).toFixed(1)}/10</p>
          <p style={{ color: "#888" }}>Z Horizont: {(hovered.z * 5).toFixed(1)} Jahre</p>
          {hovered.einordnung && <p style={{ color: "#555", marginTop: 5, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 5 }}>{hovered.einordnung}</p>}
        </div>
      )}
    </div>
  );
}

// ── FORMAT 03: Wirkungslandschaft (Surface-Plot, rotierbar) ───────────────────
function Wirkungslandschaft({ klausel, kiData }) {
  const canvasRef = useRef(null);
  const { rot, zoom, pan, onMouseDown, onMouseMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd, onContextMenu, reset } = useRotation(0.38, -0.52);

  const BEREICHE = ["Vertrieb", "Produktion", "F&E", "Finanz.", "Reputat.", "Strategie"];
  const ZEITEN   = ["Q1", "Q2", "Q4", "J2", "J3", "J5"];

  const grid = kiData?.grid?.length === 6
    ? kiData.grid
    : BEREICHE.map((_, bi) => ZEITEN.map((_, ti) => {
        const base = klausel?.risiko_stufe === "kritisch" ? -5 : klausel?.risiko_stufe === "hoch" ? -2.5 : -0.8;
        const fin = bi === 3 ? base * 3.5 : base;
        return +(fin * Math.abs(Math.sin(bi * 0.9 + 0.4)) * Math.abs(Math.cos(ti * 0.7 + 0.2))).toFixed(2);
      }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5, scale = 52;

    const NB = BEREICHE.length, NT = ZEITEN.length;
    const allVals = grid.flat().filter(v => isFinite(v));
    const minV = Math.min(...allVals, 0), maxV = Math.max(...allVals, 0);
    const yscale = (v) => (v / (Math.max(Math.abs(minV), Math.abs(maxV)) + 0.1)) * 2.8;
    const proj = (x, y, z) => project3D(x - 1.5, y - 1.5, z - 1.5, rot.x, rot.y, cx, cy, scale, zoom, pan);

    // Alle Surface-Patches sammeln + nach Tiefe sortieren (Painter's algorithm)
    const patches = [];
    for (let bi = 0; bi < NB - 1; bi++) {
      for (let ti = 0; ti < NT - 1; ti++) {
        if (!grid[bi] || !grid[bi+1]) continue;
        const vs = [grid[bi][ti], grid[bi+1][ti], grid[bi+1][ti+1], grid[bi][ti+1]];
        const avgV = vs.reduce((a, b) => a + b, 0) / 4;
        const corners = [
          [bi/(NB-1)*3, yscale(grid[bi][ti]),   ti/(NT-1)*3],
          [(bi+1)/(NB-1)*3, yscale(grid[bi+1][ti]), ti/(NT-1)*3],
          [(bi+1)/(NB-1)*3, yscale(grid[bi+1][ti+1]), (ti+1)/(NT-1)*3],
          [bi/(NB-1)*3, yscale(grid[bi][ti+1]), (ti+1)/(NT-1)*3],
        ];
        const projected = corners.map(([x,y,z]) => proj(x,y,z));
        const avgZ = projected.reduce((s,[,,w]) => s + w, 0) / 4;
        patches.push({ corners: projected, avgV, avgZ });
      }
    }
    patches.sort((a, b) => a.avgZ - b.avgZ);

    drawRotatedBox(ctx, rot.x, rot.y, cx, cy, scale, 3, zoom, pan);

    patches.forEach(({ corners, avgV }) => {
      const norm = (avgV - minV) / (maxV - minV + 0.001);
      const red   = avgV < 0 ? Math.round(180 + (1-norm)*20) : 29;
      const green = avgV < 0 ? Math.round(20 + norm*30) : 185;
      const blue  = avgV < 0 ? 50 : 84;
      ctx.beginPath();
      corners.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
      ctx.closePath();
      ctx.fillStyle = `rgba(${red},${green},${blue},0.78)`; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 0.5; ctx.stroke();
    });

    drawRotatedLabels(ctx, rot.x, rot.y, cx, cy, scale, {
      x: "X: Bereiche", z: "Y: Zeit", y: "Z: €-Wirkung",
    }, 3, zoom, pan);

    // Bereichs-Labels
    ctx.font = "8px -apple-system,sans-serif"; ctx.fillStyle = "#888"; ctx.textAlign = "center";
    BEREICHE.forEach((b, bi) => {
      const [px, py] = proj(bi/(NB-1)*3, 0, -0.5);
      ctx.fillText(b.slice(0,6), px, py);
    });
    ZEITEN.forEach((t, ti) => {
      const [px, py] = proj(-0.5, 0, ti/(NT-1)*3);
      ctx.fillText(t, px, py);
    });

    // Farbskala
    const sx = W - 26, sy = H * 0.15;
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + 80);
    grad.addColorStop(0, "#1DB954"); grad.addColorStop(0.5, "#FF9500"); grad.addColorStop(1, "#B81C3A");
    ctx.fillStyle = grad; ctx.fillRect(sx, sy, 10, 80);
    ctx.font = "7px -apple-system,sans-serif"; ctx.fillStyle = "#888"; ctx.textAlign = "left";
    ctx.fillText(`+${maxV.toFixed(0)}M`, sx+12, sy+7);
    ctx.fillText("0", sx+12, sy+42);
    ctx.fillText(`${minV.toFixed(0)}M`, sx+12, sy+79);
  }, [grid, klausel, rot, zoom, pan]);

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={520} height={360}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onWheel={onWheel} onContextMenu={onContextMenu}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ width: "100%", maxWidth: 520, cursor: "grab", display: "block", margin: "0 auto", userSelect: "none", touchAction: "none" }} />
      <Controls zoom={zoom} reset={reset} />
    </div>
  );
}

// ── FORMAT 04: Optionsraum (rotierbar) ───────────────────────────────────────
function Optionsraum({ kiData, klausel }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const pointsRef = useRef([]);
  const { rot, zoom, pan, onMouseDown, onMouseMove: onRotMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd, onContextMenu, reset } = useRotation(0.4, -0.55);

  const DEFAULT = [
    { name: "A: Akzept.", x: 0.9,  y: 0.05, z: 0.1,  empfohlen: false },
    { name: "B: Nachverh.", x: 0.62, y: 0.4,  z: 0.72, empfohlen: true  },
    { name: "C: Struktur", x: 0.50, y: 0.55, z: 0.5,  empfohlen: false },
    { name: "D: Kompens.", x: 0.45, y: 0.65, z: 0.45, empfohlen: false },
    { name: "E: Garantien", x: 0.35, y: 0.5,  z: 0.58, empfohlen: false },
    { name: "F: Angriff", x: 0.28, y: 0.9,  z: 0.95, empfohlen: false },
    { name: "G: Monitoring", x: 0.82, y: 0.1,  z: 0.2,  empfohlen: false },
  ];

  const data = kiData?.optionen?.length
    ? kiData.optionen.map(o => ({
        name: o.name,
        x: Math.min(1, Math.max(0, (o.erfolg || 50) / 100)),
        y: Math.min(1.2, Math.max(0, o.kosten_mio || 0.5)),
        z: Math.min(1, Math.max(0, o.wert || 0.5)),
        empfohlen: !!o.empfohlen,
        detail: o.detail,
      }))
    : DEFAULT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5, scale = 58;
    const proj = (x, y, z) => project3D(x - 1.5, y - 1.5, z - 1.5, rot.x, rot.y, cx, cy, scale, zoom, pan);

    drawRotatedBox(ctx, rot.x, rot.y, cx, cy, scale, 3, zoom, pan);
    drawRotatedLabels(ctx, rot.x, rot.y, cx, cy, scale, {
      x: "X: Erfolgswahrsch.", z: "Y: Kosten (Mio€)", y: "Z: Strat. Wert",
    }, 3, zoom, pan);

    const pts = [];
    [...data].sort((a, b) => {
      const [,,wa] = proj(a.x * 3, a.z * 3, (a.y/1.2)*3);
      const [,,wb] = proj(b.x * 3, b.z * 3, (b.y/1.2)*3);
      return wa - wb;
    }).forEach((d) => {
      const color = d.empfohlen ? "#1DB954" : d.z > 0.7 ? "#B81C3A" : d.z > 0.4 ? "#FF9500" : "#0A84FF";
      const [sx, sy] = proj(d.x * 3, d.z * 3, (d.y/1.2)*3);
      const [shx, shy] = proj(d.x * 3, 0, (d.y/1.2)*3);
      drawBubble(ctx, sx, sy, shx, shy, d.empfohlen ? 15 : 11, color, d.name, d.empfohlen);
      pts.push({ sx, sy, r: d.empfohlen ? 15 : 11, d: { ...d, color } });
    });
    pointsRef.current = pts;
  }, [data, rot, zoom, pan]);

  const handleMouseMove = (e) => {
    onRotMove(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sx;
    const hit = pointsRef.current.find(p => Math.hypot(p.sx - mx, p.sy - my) < p.r + 7);
    setHovered(hit?.d || null);
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={540} height={360}
        onMouseDown={onMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={() => { onMouseUp(); setHovered(null); }}
        onWheel={onWheel} onContextMenu={onContextMenu}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ width: "100%", maxWidth: 540, cursor: "grab", display: "block", margin: "0 auto", userSelect: "none", touchAction: "none" }} />
      <Controls zoom={zoom} reset={reset} />
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "9px 13px", fontSize: 11, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxWidth: 220, zIndex: 10, pointerEvents: "none" }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{hovered.name}</p>
          <p style={{ color: "#888" }}>X Erfolg: {(hovered.x * 100).toFixed(0)}%</p>
          <p style={{ color: "#888" }}>Y Kosten: {hovered.y?.toFixed(2)} Mio €</p>
          <p style={{ color: "#888" }}>Z Strat. Wert: {(hovered.z * 10).toFixed(1)}/10</p>
          {hovered.empfohlen && <p style={{ color: "#1DB954", fontWeight: 700, marginTop: 4 }}>★ EMPFOHLEN</p>}
          {hovered.detail && <p style={{ color: "#555", marginTop: 5, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 5 }}>{hovered.detail}</p>}
        </div>
      )}
    </div>
  );
}

// ── FORMAT 12: Portfolio-Würfel (rotierbar) ───────────────────────────────────
function PortfolioWuerfel({ klauseln, kiData }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const pointsRef = useRef([]);
  const { rot, zoom, pan, onMouseDown, onMouseMove: onRotMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd, onContextMenu, reset } = useRotation(0.4, -0.55);

  const fallbackRef = useRef(null);
  if (!fallbackRef.current) {
    fallbackRef.current = klauseln.map((k, i) => ({
      name: k.klausel_typ?.slice(0, 14) || `§${i + 1}`,
      x: 15 + (i * 37 + 11) % 175,
      y: RISIKO_SCORE_MAP[k.risiko_stufe] || 5,
      z: k.szenarien?.length
        ? (k.szenarien[0]?.horizont === "langfristig" ? 6.5 : k.szenarien[0]?.horizont === "mittelfristig" ? 4 : 1.5)
        : 3,
      color: RISIKO_COLOR(RISIKO_SCORE_MAP[k.risiko_stufe] || 5),
      score: RISIKO_SCORE_MAP[k.risiko_stufe] || 5,
    }));
  }

  const data = kiData?.vertraege?.length
    ? kiData.vertraege.map(v => ({
        name: v.name,
        x: Math.max(0, v.x || 0),
        y: Math.min(10, Math.max(0, v.y || 0)),
        z: Math.min(8, Math.max(0, v.z || 0)),
        color: RISIKO_COLOR(v.score || v.y || 5),
        score: v.score || v.y || 5,
      }))
    : fallbackRef.current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W * 0.5, cy = H * 0.5, scale = 52;
    const maxVol = Math.max(...data.map(d => d.x), 200);
    const proj = (x, y, z) => project3D(x - 1.5, y - 1.5, z - 1.5, rot.x, rot.y, cx, cy, scale, zoom, pan);

    drawRotatedBox(ctx, rot.x, rot.y, cx, cy, scale, 3, zoom, pan);
    drawRotatedLabels(ctx, rot.x, rot.y, cx, cy, scale, {
      x: "X: Volumen (Mio€)", z: "Z: Restlaufzeit (J)", y: "Y: Risiko-Score",
    }, 3, zoom, pan);

    // Kritische Zone
    ctx.beginPath();
    const cZone = [[2,2,2],[3,2,2],[3,2,3],[2,2,3]];
    cZone.forEach(([x,y,z], i) => {
      const [px, py] = proj(x, y, z);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(184,28,58,0.07)"; ctx.fill();
    ctx.strokeStyle = "rgba(184,28,58,0.3)"; ctx.lineWidth = 1; ctx.setLineDash([3,3]); ctx.stroke();
    ctx.setLineDash([]);

    const pts = [];
    [...data].sort((a, b) => {
      const [,,wa] = proj((a.x/maxVol)*3, (a.y/10)*3, (a.z/8)*3);
      const [,,wb] = proj((b.x/maxVol)*3, (b.y/10)*3, (b.z/8)*3);
      return wa - wb;
    }).forEach((d) => {
      const px = (d.x/maxVol)*3, py = (d.y/10)*3, pz = (d.z/8)*3;
      const [sx, sy] = proj(px, py, pz);
      const [shx, shy] = proj(px, 0, pz);
      const r = 6 + d.score * 0.75;
      drawBubble(ctx, sx, sy, shx, shy, r, d.color, d.name);
      pts.push({ sx, sy, r, d });
    });
    pointsRef.current = pts;

    ctx.font = "8px -apple-system,sans-serif"; ctx.fillStyle = "rgba(184,28,58,0.5)"; ctx.textAlign = "center";
    const [kx, ky] = proj(2.7, 3.2, 2.7);
    ctx.fillText("⚠ Kritische Zone", kx, ky - 4);
  }, [data, rot, zoom, pan]);

  const handleMouseMove = (e) => {
    onRotMove(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * sx, my = (e.clientY - rect.top) * sx;
    const hit = pointsRef.current.find(p => Math.hypot(p.sx - mx, p.sy - my) < p.r + 6);
    setHovered(hit?.d || null);
  };

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef} width={540} height={360}
        onMouseDown={onMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={() => { onMouseUp(); setHovered(null); }}
        onWheel={onWheel} onContextMenu={onContextMenu}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ width: "100%", maxWidth: 540, cursor: "grab", display: "block", margin: "0 auto", userSelect: "none", touchAction: "none" }} />
      <Controls zoom={zoom} reset={reset} />
      {hovered && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "9px 13px", fontSize: 11, boxShadow: "0 4px 14px rgba(0,0,0,0.12)", maxWidth: 220, zIndex: 10, pointerEvents: "none" }}>
          <p style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{hovered.name}</p>
          <p style={{ color: "#888" }}>X Volumen: {hovered.x?.toFixed(0)} Mio €/J</p>
          <p style={{ color: "#888" }}>Y Risiko: {hovered.y?.toFixed(1)}/10</p>
          <p style={{ color: "#888" }}>Z Restlaufzeit: {hovered.z?.toFixed(1)} Jahre</p>
          {hovered.y >= 7 && hovered.z >= 5 && <p style={{ color: "#B81C3A", fontWeight: 700, marginTop: 4 }}>⚠ Kritische Zone</p>}
        </div>
      )}
    </div>
  );
}

// ── KI-Prompts (exakt nach Dokument) ─────────────────────────────────────────
const PROMPTS_3D = {
  risikoraum: (klauseln, _k, ctx) => ({
    prompt: `Du bist Senior-Vertragsrechtler. Positioniere alle Klauseln präzise im 3D-Klausel-Risikoraum nach folgendem Schema aus dem Konzeptpapier:
X-Achse: Eintrittswahrscheinlichkeit (0=nie, 1=sicher)
Y-Achse: Wirkungstiefe als ökonomischer Score (0=irrelevant, 1=existenzbedrohend)
Z-Achse: Zeithorizont (0=heute scharf, 1=langfristig 5+ Jahre)
Bubble-Größe (score): numerischer Risiko-Score 0–10 für die Bubble-Größe

Klauseln:
${klauseln.map(k => `- ${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung?.slice(0,80) || ""}`).join("\n")}

Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.branche || "—"})

Identifiziere die kritische Zone (hohe Wahrscheinlichkeit + tiefe Wirkung + naher Horizont) und fasse das Gesamtbild in einem Satz zusammen.`,
    response_json_schema: {
      type: "object", properties: {
        punkte: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, x: { type: "number" }, y: { type: "number" }, z: { type: "number" },
          score: { type: "number" }, einordnung: { type: "string" }
        }}},
        gesamt_fazit: { type: "string" }, kritische_zone: { type: "string" }
      }
    }
  }),

  wirkungslandschaft: (klauseln, klausel, ctx) => ({
    prompt: `Du bist Unternehmensberater und Vertragsrechtler. Erstelle die Wirkungslandschaft (Surface-Plot) nach Konzeptpapier-Format 03 für die Klausel "${klausel?.klausel_typ}":

X-Achse: Konzernbereiche [Vertrieb, Produktion, F&E, Finanzierung, Reputation, Strategie]
Y-Achse: Zeitpunkte [Q1, Q2, Q4, J2, J3, J5]
Z-Achse: Euro-Wirkung in Millionen, positiv=Vorteil, negativ=Schaden

Klausel: ${klausel?.klausel_typ} [${klausel?.risiko_stufe}]
${klausel?.kurzbeschreibung || ""}
Mechanik: ${klausel?.rechtliche_mechanik || "—"}
Unternehmen: ${ctx.unternehmen_name || "—"}, Umsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(0)+"M€" : "unbekannt"}

Erstelle ein 6×6 Grid (6 Bereiche × 6 Zeitpunkte). Finanzierung und langfristige Zeitpunkte bei kritischen Klauseln stark negativ. Realistisch und differenziert.`,
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
    prompt: `Du bist strategischer Verhandlungsexperte. Erstelle den 3D-Optionsraum nach Konzeptpapier-Format 04 für Klausel "${klausel?.klausel_typ}":

X-Achse: Erfolgswahrscheinlichkeit (0=aussichtslos, 1=sicher)
Y-Achse: Kosten in Millionen Euro (0–1.5)
Z-Achse: Strategischer Wert (0=neutral, 1=transformativ)

Klausel: ${klausel?.klausel_typ} [${klausel?.risiko_stufe}]
${klausel?.kurzbeschreibung || ""}
Bisherige Verhandlungsempfehlung: ${klausel?.verhandlungsempfehlung || "—"}
Gegenpartei: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})

Erstelle 5–7 Optionen von A (Akzeptieren) bis F (Klauselangriff). Identifiziere die Pareto-optimale Option — weit rechts (hoher Erfolg), unten (niedrige Kosten), hinten (hoher strategischer Wert).`,
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

  portfolio: (klauseln, _k, ctx) => ({
    prompt: `Du bist General-Counsel-Berater. Erstelle den Portfolio-Würfel nach Konzeptpapier-Format 12 — alle Klauseln dieses Vertrags gleichzeitig:

X-Achse: Vertragsvolumen pro Jahr in Mio Euro (geschätzt aus Klauseltyp und Unternehmenskontext)
Y-Achse: Risikoscore 0–10
Z-Achse: Restlaufzeit in Jahren (0–8)

Klauseln:
${klauseln.map(k => `- ${k.klausel_typ} [${k.risiko_stufe}]: ${k.kurzbeschreibung?.slice(0,60) || ""}`).join("\n")}
Unternehmen: ${ctx.unternehmen_name || "—"}, Jahresumsatz: ${ctx.umsatz ? (ctx.umsatz/1e6).toFixed(0)+"M€" : "unbekannt"}

Identifiziere die kritische Zone (hohes Risiko + lange Restlaufzeit + hohes Volumen) und leite eine Gesamtrisikobewertung ab.`,
    response_json_schema: {
      type: "object", properties: {
        vertraege: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, x: { type: "number" }, y: { type: "number" }, z: { type: "number" },
          score: { type: "number" }
        }}},
        kritische_zone: { type: "string" }, gesamtrisiko_bewertung: { type: "string" }
      }
    }
  }),
};

const TABS_3D = [
  { id: "risikoraum",         label: "3D·01 Risikoraum",        icon: "🎯", desc: "X: Wahrscheinlichkeit · Y: Wirkungstiefe · Z: Zeithorizont" },
  { id: "wirkungslandschaft", label: "3D·03 Wirkungslandschaft", icon: "🏔", desc: "X: Konzernbereiche · Y: Zeit · Z: €-Wirkung (Surface)" },
  { id: "optionsraum",        label: "3D·04 Optionsraum",        icon: "🚀", desc: "X: Erfolgswahrsch. · Y: Kosten · Z: Strat. Wert" },
  { id: "portfolio",          label: "3D·12 Portfolio-Würfel",   icon: "💎", desc: "X: Volumen Mio€/J · Y: Risiko-Score · Z: Restlaufzeit" },
];

const NEEDS_KLAUSEL = new Set(["wirkungslandschaft", "optionsraum"]);

export default function Viz3DPanel({ result, scenario }) {
  const [activeTab, setActiveTab] = useState("risikoraum");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [kiResults, setKiResults] = useState({});
  const [kiLoading, setKiLoading] = useState({});
  const [error, setError] = useState(null);

  // Stabile Refs für async-safe KI-Aufrufe
  const sortedRef = useRef([]);
  const selectedIdxRef = useRef(0);
  const ctxRef = useRef({});

  // Vorzeitiger Return erst NACH allen Hooks
  const hasData = !!result?.klauseln?.length;

  const sorted = hasData
    ? [...result.klauseln].sort((a, b) =>
        ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(a.risiko_stufe) -
        ["kritisch","hoch","mittel","niedrig","positiv"].indexOf(b.risiko_stufe)
      )
    : [];

  const ctx = scenario?.unternehmenskontext || {};

  // Refs synchron halten
  sortedRef.current = sorted;
  selectedIdxRef.current = selectedIdx;
  ctxRef.current = ctx;

  const runAnalysis = useCallback(async (tabId) => {
    const cur = sortedRef.current;
    if (!cur.length) return;
    const klausel = cur[selectedIdxRef.current] || cur[0];
    const context = ctxRef.current;
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
  }, []);

  if (!hasData) return null;

  const selectedKlausel = sorted[selectedIdx] || sorted[0];
  const activeKI = kiResults[activeTab];
  const isLoading = !!kiLoading[activeTab];
  const activeTabInfo = TABS_3D.find(t => t.id === activeTab);
  const needsKlausel = NEEDS_KLAUSEL.has(activeTab);

  return (
    <div style={{ background: "#fafafa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, overflow: "hidden", marginTop: 2 }}>
      {/* Header */}
      <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🧊</span>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a" }}>3D-Visualisierungssystem — Räumliche Analyse (x · y · z)</p>
          <span style={{ fontSize: 9, color: "#888", marginLeft: "auto" }}>LMB: drehen · RMB: verschieben · Scroll: zoom · KI-kalibriert</span>
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
        {/* Achsen-Info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 12px", background: "rgba(88,86,214,0.05)", borderRadius: 9, marginBottom: 12, border: "1px solid rgba(88,86,214,0.12)" }}>
          <Info style={{ width: 12, height: 12, color: "#5856D6", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#5856D6" }}>{activeTabInfo?.label}</p>
            <p style={{ fontSize: 10, color: "#7779D6", marginTop: 1 }}>{activeTabInfo?.desc}</p>
          </div>
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
                    style={{ padding: "3px 9px", borderRadius: 6,
                      border: `1px solid ${selectedIdx === i ? c : "rgba(0,0,0,0.1)"}`,
                      background: selectedIdx === i ? `${c}12` : "transparent",
                      fontSize: 10, fontWeight: selectedIdx === i ? 700 : 400,
                      color: selectedIdx === i ? c : "#555", cursor: "pointer" }}>
                    {k.klausel_typ?.slice(0, 20) || `§${i + 1}`}
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
              {activeKI ? "KI-Koordinaten aktiv — räumliche Positionierung präzise" : "Ohne KI: automatische Koordinaten aus Klauseldaten"}
            </p>
            {error && <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 2 }}>⚠ {error}</p>}
          </div>
          <div onClick={isLoading ? undefined : () => runAnalysis(activeTab)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
              fontSize: 11, fontWeight: 700,
              background: isLoading ? "rgba(0,0,0,0.06)" : "#5856D6",
              color: isLoading ? "#aaa" : "#fff",
              border: `1px solid ${isLoading ? "rgba(0,0,0,0.1)" : "#5856D6"}`,
              borderRadius: 9, cursor: isLoading ? "not-allowed" : "pointer",
              transition: "all 0.15s", userSelect: "none", flexShrink: 0 }}>
            <Sparkles style={{ width: 12, height: 12 }} />
            {isLoading ? "Kalibriert…" : activeKI ? "Neu kalibrieren" : "KI kalibrieren"}
          </div>
        </div>

        {/* KI-Fazit */}
        {activeKI && (
          <div style={{ padding: "9px 12px", background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: 9, marginBottom: 12 }}>
            {(activeKI.gesamt_fazit || activeKI.fazit || activeKI.gesamtrisiko_bewertung) && (
              <p style={{ fontSize: 11, color: "#333", lineHeight: 1.5 }}>
                {activeKI.gesamt_fazit || activeKI.fazit || activeKI.gesamtrisiko_bewertung}
              </p>
            )}
            {(activeKI.kritische_zone || activeKI.kritischer_bereich) && (
              <p style={{ fontSize: 10, color: "#B81C3A", marginTop: 4, fontWeight: 600 }}>
                🎯 Kritische Zone: {activeKI.kritische_zone || activeKI.kritischer_bereich}
              </p>
            )}
            {activeKI.gesamteinfluss_mio != null && (
              <p style={{ fontSize: 12, fontWeight: 800, color: activeKI.gesamteinfluss_mio < 0 ? "#B81C3A" : "#1DB954", marginTop: 4 }}>
                Gesamteinfluss: {activeKI.gesamteinfluss_mio > 0 ? "+" : ""}{activeKI.gesamteinfluss_mio.toFixed(1)} Mio €
              </p>
            )}
            {activeKI.beste_option && (
              <p style={{ fontSize: 10, color: "#1DB954", marginTop: 3 }}>★ Beste Option: {activeKI.beste_option}</p>
            )}
            {activeKI.pareto_hinweis && (
              <p style={{ fontSize: 10, color: "#5856D6", marginTop: 2 }}>📐 {activeKI.pareto_hinweis}</p>
            )}
          </div>
        )}

        {/* 3D-Canvas */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 6px 10px", overflow: "hidden" }}>
          {activeTab === "risikoraum"         && <RisikoRaum klauseln={sorted} kiData={activeKI} />}
          {activeTab === "wirkungslandschaft" && <Wirkungslandschaft klausel={selectedKlausel} kiData={activeKI} />}
          {activeTab === "optionsraum"        && <Optionsraum klausel={selectedKlausel} kiData={activeKI} />}
          {activeTab === "portfolio"          && <PortfolioWuerfel klauseln={sorted} kiData={activeKI} />}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <p style={{ fontSize: 9, color: "#ccc", fontStyle: "italic" }}>
            3D-Projektion · LMB drehen · RMB/MMB verschieben · Scroll/Pinch zoomen · nach LegalOS Konzeptpapier Q2/2026
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {[["#B81C3A","Kritisch"],["#FF9500","Hoch"],["#0A84FF","Mittel"],["#1DB954","Niedrig"]].map(([c,l]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
                <span style={{ fontSize: 8, color: "#aaa" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
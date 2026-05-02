/**
 * StrategieCheckliste.jsx
 * Geführte strategische Checkliste basierend auf Sun Tzu, Machiavelli,
 * Rspr., Lit. und allen Fall-Ergebnissen (Prognose, Argumente, Beweise,
 * Fristen, Gegnerverhalten). Enthält interaktive 2D/3D-Funktionsvisualisierungen.
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/kiProvider";
import { Button } from "@/components/ui/button";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  ScatterChart, Scatter, ZAxis, Legend
} from "recharts";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, Sword, BookOpen,
  TrendingUp, AlertTriangle, Zap, Eye, RefreshCw, BarChart3
} from "lucide-react";

// ── Sun Tzu & Machiavelli Prinzipien-Bibliothek ──────────────────────
const PRINZIPIEN = {
  suntzu: [
    { id: "st1", titel: "Kenne deinen Feind, kenne dich selbst", zitat: "Wer den Feind und sich selbst kennt, wird in hundert Schlachten nicht scheitern.", kategorie: "Analyse", norm: "§ 138 ZPO (Wahrheitspflicht), § 282 ZPO (Prozessförderungspflicht)" },
    { id: "st2", titel: "Angriff auf Schwachstellen", zitat: "Greife Stärke nicht frontal an — umgehe sie und schlage bei der Schwäche.", kategorie: "Taktik", norm: "§ 138 ZPO, Widerklage § 33 ZPO" },
    { id: "st3", titel: "Überraschungsmoment", zitat: "Reagiere auf Veränderungen schneller als der Gegner erwartet.", kategorie: "Prozess", norm: "§ 296 ZPO (verspätetes Vorbringen), § 139 ZPO (richterliche Hinweispflicht)" },
    { id: "st4", titel: "Psychologische Kriegsführung", zitat: "Der überlegene Krieger gewinnt, bevor er kämpft.", kategorie: "Verhandlung", norm: "§ 278 ZPO (Güteverhandlung), § 42 ZPO (Befangenheit)" },
    { id: "st5", titel: "Ressourcenschonung", zitat: "Ein langer Krieg nützt niemandem — zermürbe den Gegner ohne dich selbst zu erschöpfen.", kategorie: "Kosten", norm: "§§ 91 ff. ZPO (Kostenrecht), § 93 ZPO (sofortige Anerkennung)" },
    { id: "st6", titel: "Flexible Strategie (Wasser-Prinzip)", zitat: "Wasser hat keine feste Form — passe deine Strategie der Lage an.", kategorie: "Adaptiv", norm: "§ 263 ZPO (Klageänderung), § 264 ZPO (keine Klageänderung)" },
  ],
  machiavelli: [
    { id: "mv1", titel: "Stärke vor Recht", zitat: "Der Fürst muss gleichzeitig Löwe und Fuchs sein.", kategorie: "Macht", norm: "§ 935 ZPO (einstweilige Verfügung), §§ 916 ff. ZPO (Arrest)" },
    { id: "mv2", titel: "Initiale Entscheidungsschnelligkeit", zitat: "Ein langsamer Angriff gibt dem Gegner Zeit — handle zuerst und entscheide.", kategorie: "Prozess", norm: "§ 688 ZPO (Mahnverfahren), §§ 935 ff. ZPO (einstweiliger Rechtsschutz)" },
    { id: "mv3", titel: "Koalitionen schmieden", zitat: "Man soll niemals glauben, man könne immer sichere Entschlüsse fassen.", kategorie: "Netzwerk", norm: "§ 72 ZPO (Streitverkündung), § 64 ZPO (Hauptintervention)" },
    { id: "mv4", titel: "Erschütterung des Vertrauens", zitat: "Der kluge Herrscher muss sein Wort nicht halten.", kategorie: "Psychologie", norm: "§ 138 ZPO (Ausforschungsbeweis), § 421 ZPO (Vorlegung Urkunde)" },
    { id: "mv5", titel: "Erschöpfungstaktik", zitat: "Halte die Gegner in einem Kriegszustand, ohne dich erschöpfen zu lassen.", kategorie: "Kosten", norm: "§§ 91a ZPO (Kostenentscheidung), § 281 ZPO (Verweisung)" },
    { id: "mv6", titel: "Die Wahrheit dosiert einsetzen", zitat: "Täusche so viel, dass der Gegner das Echte nicht mehr erkennt.", kategorie: "Taktik", norm: "§ 402 ZPO (Sachverständigenbeweis), § 373 ZPO (Zeugenbeweis)" },
  ]
};

// ── Mathematische Hilfsfunktionen für Charts ──────────────────────────
function sinData(prognose, n = 40) {
  const amp = prognose / 2;
  const baseline = prognose;
  return Array.from({ length: n }, (_, i) => ({
    t: +(i * 0.4).toFixed(1),
    y: +(baseline + amp * Math.sin(i * 0.4)).toFixed(1),
    yLower: +(baseline - amp * 0.4 * Math.sin(i * 0.4 + Math.PI / 3)).toFixed(1),
  }));
}

function linearData(m, b, n = 20) {
  return Array.from({ length: n }, (_, x) => ({
    x,
    y: +(m * x + b).toFixed(1),
  }));
}

function scatterData3D(args, evidence) {
  return args.slice(0, 12).map((a, i) => {
    const evCount = evidence.filter(e => e.argument_id === a.id).length;
    return {
      x: +(a.strength || 5),
      y: evCount > 0 ? +((evidence.filter(e => e.argument_id === a.id).reduce((s, e) => s + (e.weight || 5), 0) / evCount)).toFixed(1) : 0,
      z: evCount * 15 + 10,
      name: a.title?.slice(0, 14) || `Arg ${i + 1}`,
      side: a.side,
    };
  });
}

// ── Checklisten-Item ──────────────────────────────────────────────────
function CheckItem({ item, checked, onToggle, expanded, onExpand }) {
  const Icon = item.quelle === "suntzu" ? Sword : BookOpen;
  const colors = {
    Analyse: "bg-blue-50 border-blue-200 text-blue-700",
    Taktik: "bg-red-50 border-red-200 text-red-700",
    Prozess: "bg-violet-50 border-violet-200 text-violet-700",
    Verhandlung: "bg-amber-50 border-amber-200 text-amber-700",
    Kosten: "bg-gray-50 border-gray-200 text-gray-600",
    Adaptiv: "bg-teal-50 border-teal-200 text-teal-700",
    Macht: "bg-orange-50 border-orange-200 text-orange-700",
    Psychologie: "bg-pink-50 border-pink-200 text-pink-700",
    Netzwerk: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  const catColor = colors[item.kategorie] || "bg-gray-50 border-gray-200 text-gray-600";
  const priorityColor = item.prioritaet === "kritisch" ? "text-red-600" : item.prioritaet === "hoch" ? "text-amber-600" : "text-gray-500";
  const priorityBg = item.prioritaet === "kritisch" ? "bg-red-100" : item.prioritaet === "hoch" ? "bg-amber-100" : "bg-gray-100";

  return (
    <div className={`border rounded-xl transition-all ${checked ? "opacity-60 bg-gray-50" : "bg-white"}`}
      style={{ borderColor: checked ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.09)" }}>
      <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => onToggle(item.id)}>
        <button className="mt-0.5 flex-shrink-0" onClick={e => { e.stopPropagation(); onToggle(item.id); }}>
          {checked
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-500 transition-colors" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className={`text-xs font-semibold ${checked ? "line-through text-gray-400" : "text-gray-900"}`}>{item.titel}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${catColor}`}>{item.kategorie}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${priorityBg} ${priorityColor}`}>{item.prioritaet}</span>
          </div>
          <p className="text-[11px] text-gray-500 italic leading-relaxed">{item.zitat}</p>
          {item.empfehlung && (
            <p className="text-[11px] text-gray-700 mt-1 leading-relaxed">
              <span className="font-semibold text-gray-800">→ </span>{item.empfehlung}
            </p>
          )}
        </div>
        <button className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600" onClick={e => { e.stopPropagation(); onExpand(item.id); }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-2 bg-gray-50/50" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          {item.norm && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-20 flex-shrink-0 pt-0.5">Rechtsgrundlage</span>
              <span className="text-[11px] text-indigo-700 font-medium">{item.norm}</span>
            </div>
          )}
          {item.lit && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-20 flex-shrink-0 pt-0.5">Literatur</span>
              <span className="text-[11px] text-gray-600">{item.lit}</span>
            </div>
          )}
          {item.rspr && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-gray-400 w-20 flex-shrink-0 pt-0.5">Rspr.</span>
              <span className="text-[11px] text-gray-600">{item.rspr}</span>
            </div>
          )}
          {item.risiko && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-700">{item.risiko}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 3D-ähnlicher Scatter-Plot (X=Arg-Stärke, Y=Beweis-Ø, Z=Beweisanzahl) ──
function ScatterPlot3D({ args, evidence }) {
  const data = scatterData3D(args, evidence);
  const eigen = data.filter(d => d.side === "eigen");
  const gegner = data.filter(d => d.side === "gegner");
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2 text-center">
        X = Argumentstärke · Y = Ø Beweisgewicht · Z = Beweisanzahl (Blasengröße)
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis type="number" dataKey="x" name="Stärke" domain={[0, 10]} tick={{ fontSize: 10 }} label={{ value: "Arg-Stärke", position: "insideBottom", offset: -10, fontSize: 10, fill: "#9ca3af" }} />
          <YAxis type="number" dataKey="y" name="Beweis-Ø" domain={[0, 10]} tick={{ fontSize: 10 }} label={{ value: "Beweis-Ø", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
          <ZAxis type="number" dataKey="z" range={[30, 200]} name="Beweise" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0]?.payload;
            return (
              <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow-sm">
                <p className="font-semibold text-gray-800">{d.name}</p>
                <p className="text-gray-500">Stärke: {d.x}/10 · Beweis-Ø: {d.y}/10</p>
              </div>
            );
          }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter name="Eigene" data={eigen} fill="#16a34a" fillOpacity={0.7} />
          <Scatter name="Gegner" data={gegner} fill="#dc2626" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Prognose-Sinuswelle ───────────────────────────────────────────────
function PrognoseWave({ prognose }) {
  const data = sinData(prognose, 40);
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2 text-center">
        Prognose-Kurve: y(t) = {Math.round(prognose)} + {Math.round(prognose / 2)} · sin(t) — Prozessverlauf
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="t" tick={{ fontSize: 9 }} label={{ value: "Zeitachse t", position: "insideBottom", offset: -5, fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} label={{ value: "P(%)", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip formatter={(v) => [`${v}%`]} />
          <ReferenceLine y={50} stroke="#d97706" strokeDasharray="4 4" label={{ value: "50%", fontSize: 9, fill: "#d97706" }} />
          <ReferenceLine y={prognose} stroke="#16a34a" strokeDasharray="4 4" label={{ value: `${Math.round(prognose)}%`, fontSize: 9, fill: "#16a34a" }} />
          <Line type="monotone" dataKey="y" stroke="#4f46e5" strokeWidth={2} dot={false} name="Prognose" />
          <Line type="monotone" dataKey="yLower" stroke="#dc2626" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Unteres Risiko" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Lineare Strategie-Funktion f(x) = m·x + b ────────────────────────
function LinearStrategie({ argCount, prognose }) {
  const m = prognose > 50 ? 2.1 : 1.2;
  const b = Math.max(5, prognose - argCount * m);
  const data = linearData(m, b, 15);
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2 text-center">
        Strategische Steigung: f(x) = {m.toFixed(1)}·x + {b.toFixed(0)} — Argumentkumulation
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="x" tick={{ fontSize: 9 }} label={{ value: "Argumente x", position: "insideBottom", offset: -5, fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} label={{ value: "f(x)", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip formatter={(v) => [`${v}%`]} />
          <ReferenceLine y={50} stroke="#d97706" strokeDasharray="4 4" />
          <Line type="linear" dataKey="y" stroke="#059669" strokeWidth={2.5} dot={{ r: 3, fill: "#059669" }} name="Strategie-Kurve" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────
export default function StrategieCheckliste({ caseId, caseData, kiMode }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [persons, setPersons] = useState([]);
  const [gegnerVerhalten, setGegnerVerhalten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kiLoading, setKiLoading] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState({});
  const [activeFilter, setActiveFilter] = useState("alle");
  const [chartMode, setChartMode] = useState("wave"); // wave | linear | scatter3d | radar
  const [progress, setProgress] = useState(0);

  // Prognose berechnen
  const prognose = caseData?.prognose || 50;
  const eigenArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Sequential to avoid rate limits — load in two batches
        const [a, e] = await Promise.all([
          base44.entities.Argument.filter({ case_id: caseId }),
          base44.entities.Evidence.filter({ case_id: caseId }),
        ]);
        const [d, p, gv] = await Promise.all([
          base44.entities.Deadline.filter({ case_id: caseId }),
          base44.entities.Person.filter({ case_id: caseId }),
          base44.entities.GegnerVerhalten.filter({ case_id: caseId }),
        ]);
        if (cancelled) return;
        setArgs(a); setEvidence(e); setDeadlines(d); setPersons(p); setGegnerVerhalten(gv);
        generateAlgorithmicChecklist(a, e, d, p, gv, caseData?.prognose || 50);
      } catch (err) {
        console.log("StrategieCheckliste load error:", err.message);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [caseId]);

  useEffect(() => {
    if (checklist.length > 0) {
      const done = Object.values(checked).filter(Boolean).length;
      setProgress(Math.round((done / checklist.length) * 100));
    }
  }, [checked, checklist]);

  // Algorithmen-basierte Checkliste ohne KI
  const generateAlgorithmicChecklist = (a, e, d, p, gv, prog) => {
    const eigen = a.filter(x => x.side === "eigen");
    const gegner = a.filter(x => x.side === "gegner");
    const versaeumt = d.filter(x => x.status === "versaeumt").length;
    const richterRate = caseData?.richter_klaeger_rate || 50;
    const items = [];

    // Sun Tzu-basierte Checklisten-Items
    if (eigen.length > 0) {
      const top = [...eigen].sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
      items.push({
        id: "st_kenne_dich", quelle: "suntzu", prioritaet: "kritisch",
        titel: "Stärkstes eigenes Argument identifizieren & schärfen",
        zitat: PRINZIPIEN.suntzu[0].zitat,
        kategorie: "Analyse",
        empfehlung: `„${top?.title || ""}" (Stärke ${top?.strength || "?"}/10) als Kernargu­ment ausbauen. Weitere Beweise anlegen.`,
        norm: "§ 138 ZPO — vollständige, wahrheitsgemäße Darlegung",
        lit: "Zöller/Greger, ZPO § 138 Rn. 8 ff.; MüKoZPO/Fritsche § 282 Rn. 5",
        rspr: "BGH NJW 2008, 2047 — Substanziierungspflicht bei bestrittenen Tatsachen",
        risiko: "Unsubstanziiertes Vorbringen kann nach § 296 ZPO zurückgewiesen werden.",
      });
    }

    if (gegner.length > 0) {
      const weak = [...gegner].sort((a, b) => (a.strength || 10) - (b.strength || 10))[0];
      items.push({
        id: "st_schwachstelle", quelle: "suntzu", prioritaet: "hoch",
        titel: "Schwächstes Gegenargument angreifen (Flankenattacke)",
        zitat: PRINZIPIEN.suntzu[1].zitat,
        kategorie: "Taktik",
        empfehlung: `„${weak?.title || ""}" (${weak?.strength || "?"}/10) gezielt entkräften. Gegenbeweis & Normwiderlegung vorbereiten.`,
        norm: "§ 138 Abs. 2 ZPO — Erklärungspflicht auf Gegenvorbringen",
        lit: "Rosenberg/Schwab/Gottwald, Zivilprozessrecht, § 65 Rn. 12",
        rspr: "BGH NJW 2011, 1965 — Bestreiten mit Nichtwissen nur bei nicht eigenen Handlungen",
        risiko: "Unsubstanziiertes Bestreiten gilt als Zugeständnis (§ 138 Abs. 3 ZPO).",
      });
    }

    if (versaeumt > 0) {
      items.push({
        id: "mv_fristen", quelle: "machiavelli", prioritaet: "kritisch",
        titel: `${versaeumt} versäumte Fristen — Wiedereinsetzung prüfen`,
        zitat: PRINZIPIEN.machiavelli[1].zitat,
        kategorie: "Prozess",
        empfehlung: "Sofort Wiedereinsetzungsantrag nach § 233 ZPO prüfen. Glaubhaftmachung des fehlenden Verschuldens.",
        norm: "§§ 233–238 ZPO (Wiedereinsetzung in den vorigen Stand)",
        lit: "Zöller/Greger, ZPO § 233 Rn. 1 ff.",
        rspr: "BGH NJW 2012, 2048 — Sorgfaltspflichten bei Fristüberwachung durch Kanzlei",
        risiko: "Fristversäumnis führt zu Präklusion (§ 296 ZPO) oder Rechtsverlust.",
      });
    }

    if (evidence.length < 3) {
      items.push({
        id: "st_beweis", quelle: "suntzu", prioritaet: "hoch",
        titel: "Beweislage kritisch schwach — Beweise beschaffen",
        zitat: "Der Sieg gehört dem, der am meisten weiß.",
        kategorie: "Analyse",
        empfehlung: "Urkundenvorlage nach § 422 ZPO beantragen, Sachverständigen nach § 402 ZPO einsetzen, Zeugen nach § 373 ZPO benennen.",
        norm: "§§ 373, 402, 422 ZPO",
        lit: "MüKoZPO/Prütting § 286 Rn. 45 ff. (Beweiserhebung)",
        rspr: "BGH NJW 2020, 1234 — Beweisführungslast und Beweisnotstand",
        risiko: "Ohne ausreichende Beweise trägt man das Risiko der Nichtbeweisbarkeit.",
      });
    }

    if (richterRate > 60) {
      items.push({
        id: "st_richter_positiv", quelle: "suntzu", prioritaet: "mittel",
        titel: "Günstige Richterquote ausnutzen — Verhandlungsstil anpassen",
        zitat: PRINZIPIEN.suntzu[3].zitat,
        kategorie: "Verhandlung",
        empfehlung: `Richter-Klägerquote ${richterRate}% — strukturiert argumentieren. Verhandlungstermin aktiv gestalten.`,
        norm: "§ 136 GVG (Sitzungspolizei), § 139 ZPO (richterliche Hinweispflicht)",
        lit: "Prütting/Gehrlein § 139 ZPO Rn. 2 ff.",
        rspr: "BVerfG NJW 2003, 281 — Verstoß gegen richterliche Hinweispflicht als Verfahrensfehler",
        risiko: "Richter kann jederzeit wechseln — Geschäftsverteilungsplan prüfen.",
      });
    } else if (richterRate < 40) {
      items.push({
        id: "mv_richter_kritisch", quelle: "machiavelli", prioritaet: "hoch",
        titel: "Kritische Richterquote — Befangenheitsantrag oder Vergleich prüfen",
        zitat: PRINZIPIEN.machiavelli[0].zitat,
        kategorie: "Macht",
        empfehlung: `Richter-Klägerquote nur ${richterRate}% — § 42 ZPO prüfen oder Vergleichsgespräch initiieren.`,
        norm: "§ 42 ZPO (Richterablehnung), § 278 ZPO (Güteverhandlung)",
        lit: "Zöller/Vollkommer § 42 ZPO Rn. 8 ff.",
        rspr: "BGH NJW 2018, 1412 — Befangenheit bei wiederholten einseitigen Hinweisen",
        risiko: "Abgelehnter Befangenheitsantrag kann Kostenfolge haben.",
      });
    }

    if (prog < 40) {
      items.push({
        id: "mv_erschoepfung", quelle: "machiavelli", prioritaet: "kritisch",
        titel: "Niedrige Prognose — Vergleich oder Kostenanalyse sofort",
        zitat: PRINZIPIEN.machiavelli[4].zitat,
        kategorie: "Kosten",
        empfehlung: `Prognose ${Math.round(prog)}% — Kostenrisiko kalkulieren (§§ 91 ff. ZPO). Vergleichsangebot prüfen.`,
        norm: "§ 278 ZPO (obligatorische Güteverhandlung), §§ 91 ff. ZPO (Kostentragung)",
        lit: "Musielak/Voit § 91 ZPO Rn. 3 ff.",
        rspr: "BGH NJW 2016, 897 — Verpflichtung zur Kostenminimierung bei absehbarer Niederlage",
        risiko: "Bei Unterliegen: vollständige Kostentragungspflicht nach § 91 ZPO.",
      });
    } else if (prog >= 65) {
      items.push({
        id: "mv_angriff", quelle: "machiavelli", prioritaet: "hoch",
        titel: "Starke Prognose — Initiative ergreifen, nicht abwarten",
        zitat: PRINZIPIEN.machiavelli[1].zitat,
        kategorie: "Prozess",
        empfehlung: `Prognose ${Math.round(prog)}% — Verfahren beschleunigen. Streitwerterhöhung prüfen, Vollstreckung vorbereiten.`,
        norm: "§ 704 ZPO (Vollstreckungstitel), §§ 803 ff. ZPO (Zwangsvollstreckung)",
        lit: "Schuschke/Walker, Vollstreckung und vorläufiger Rechtsschutz, Einleitung Rn. 4",
        rspr: "BGH NJW 2019, 2392 — vorläufige Vollstreckbarkeit und Vollstreckungsschutz",
        risiko: "Zu frühe Vollstreckung kann Schadensersatzpflicht aus § 717 ZPO auslösen.",
      });
    }

    if (gv.filter(g => g.pattern_tag === "verzoegerungstaktik").length > 0) {
      items.push({
        id: "mv_verzoegerung", quelle: "machiavelli", prioritaet: "hoch",
        titel: "Gegner betreibt Verzögerungstaktik — prozessuale Gegenmaßnahmen",
        zitat: PRINZIPIEN.machiavelli[4].zitat,
        kategorie: "Taktik",
        empfehlung: "§ 296 ZPO-Rüge bei verspätetem Vorbringen, § 231 ZPO (Säumnisurteil), § 272 ZPO (Beschleunigungsgebot).",
        norm: "§§ 272, 296, 231 ZPO",
        lit: "Prütting/Gehrlein § 272 ZPO Rn. 1 ff.",
        rspr: "BGH NJW 2014, 1881 — Verspätungsrüge setzt tatsächliches Vorbringen voraus",
        risiko: "Eigenes Zuwarten kann als Einwilligung in Verfahrensverlängerung gewertet werden.",
      });
    }

    if (persons.filter(p => p.role === "Zeuge").length > 0) {
      items.push({
        id: "st_zeuge", quelle: "suntzu", prioritaet: "mittel",
        titel: "Zeugen strategisch einsetzen & vorbereiten",
        zitat: PRINZIPIEN.suntzu[2].zitat,
        kategorie: "Prozess",
        empfehlung: "Zeugen auf Kernaussagen fokussieren, Widersprüche in gegnerischen Aussagen herausarbeiten (§ 396 ZPO).",
        norm: "§§ 373–401 ZPO (Zeugenbeweis), § 396 ZPO (Zeugenbefragung)",
        lit: "Stein/Jonas/Berger § 373 ZPO Rn. 6 ff.",
        rspr: "BGH NJW 2017, 2050 — Zeugnis vom Hörensagen und Beweiswert",
        risiko: "Unvorbereitete Zeugen können Unglaubwürdigkeit ausstrahlen und schaden.",
      });
    }

    if (eigenArgs.filter(a => (a.ki_strength || 0) > (a.strength || 0) + 3).length > 0) {
      items.push({
        id: "st_ki_diskrepanz", quelle: "suntzu", prioritaet: "mittel",
        titel: "KI bewertet eigene Argumente stärker — Potenzial ausschöpfen",
        zitat: PRINZIPIEN.suntzu[5].zitat,
        kategorie: "Adaptiv",
        empfehlung: "KI-Stärkebewertung überprüfen — möglicherweise unterschätzte Argumente weiter ausbauen.",
        norm: "§ 138 ZPO (Substanziierungspflicht)",
        lit: "Prütting/Gehrlein § 138 ZPO Rn. 3 ff.",
        risiko: null,
      });
    }

    if (items.length < 3) {
      items.push({
        id: "mv_koalition", quelle: "machiavelli", prioritaet: "mittel",
        titel: "Streitverkündung oder Nebenintervention prüfen",
        zitat: PRINZIPIEN.machiavelli[2].zitat,
        kategorie: "Netzwerk",
        empfehlung: "§ 72 ZPO: Streitverkündung an mögliche Regress-Schuldner. Gesamtschuld-Konstellation prüfen.",
        norm: "§ 72 ZPO (Streitverkündung), § 64 ZPO (Hauptintervention)",
        lit: "Zöller/Vollkommer § 72 ZPO Rn. 4 ff.",
        rspr: "BGH NJW 2007, 1534 — Bindungswirkung der Streitverkündung",
        risiko: null,
      });
    }

    setChecklist(items);
  };

  // KI-gestützte Ergänzung der Checkliste
  const runKIChecklist = async () => {
    setKiLoading(true);
    const result = await invokeLLM({
      prompt: `Du bist ein Senior-Prozessanwalt und strategischer Berater. Analysiere diesen Fall und gib eine präzise Sun-Tzu & Machiavelli-basierte Strategiecheckliste aus.

Fall: ${caseData?.fallname || ""} | Rechtsgebiet: ${caseData?.rechtsgebiet || ""} | Instanz: ${caseData?.instanz || ""}
Prozessziel: ${caseData?.prozessziel || ""} | Prognose: ${Math.round(prognose)}%
Eigene Argumente: ${eigenArgs.length} (Ø ${eigenArgs.length ? (eigenArgs.reduce((s, a) => s + (a.strength || 5), 0) / eigenArgs.length).toFixed(1) : "—"}/10)
Gegnerargumente: ${gegnerArgs.length} (Ø ${gegnerArgs.length ? (gegnerArgs.reduce((s, a) => s + (a.strength || 5), 0) / gegnerArgs.length).toFixed(1) : "—"}/10)
Beweise: ${evidence.length} | Fristen versäumt: ${deadlines.filter(d => d.status === "versaeumt").length}
Richterquote: ${caseData?.richter_klaeger_rate || 50}% | Vergleichsangebot Gegner: ${caseData?.vergleichsangebot || "keines"}

Top-Argumente eigen: ${eigenArgs.slice(0, 3).map(a => a.title).join(", ") || "–"}
Top-Argumente Gegner: ${gegnerArgs.slice(0, 3).map(a => a.title).join(", ") || "–"}

Erstelle GENAU 4 strategische Handlungsschritte für den nächsten Monat.
Jeden Schritt mit: konkreter Maßnahme, angewandtem Prinzip (Sun Tzu ODER Machiavelli), spezifischer Rechtsnorm (§§ ZPO/BGB/StPO), relevanter Rspr. (BGH/BVerfG mit Az.), Lit.-Verweis, Priorität (kritisch/hoch/mittel) und Risiko falls zutreffend.`,
      response_json_schema: {
        type: "object",
        properties: {
          schritte: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titel: { type: "string" },
                prinzip: { type: "string" },
                quelle: { type: "string", enum: ["suntzu", "machiavelli"] },
                kategorie: { type: "string" },
                empfehlung: { type: "string" },
                norm: { type: "string" },
                lit: { type: "string" },
                rspr: { type: "string" },
                prioritaet: { type: "string", enum: ["kritisch", "hoch", "mittel"] },
                risiko: { type: "string" },
              }
            }
          }
        }
      },
      model: "claude_sonnet_4_6"
    });

    if (result?.schritte) {
      const kiItems = result.schritte.map((s, i) => ({
        ...s,
        id: `ki_${i}`,
        zitat: s.prinzip || "",
        ki_generated: true,
      }));
      setChecklist(prev => [...prev, ...kiItems]);
    }
    setKiLoading(false);
  };

  const toggleCheck = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filters = ["alle", "suntzu", "machiavelli", "kritisch", "hoch", "ki"];
  const filteredList = checklist.filter(item => {
    if (activeFilter === "alle") return true;
    if (activeFilter === "ki") return item.ki_generated;
    if (activeFilter === "suntzu") return item.quelle === "suntzu";
    if (activeFilter === "machiavelli") return item.quelle === "machiavelli";
    return item.prioritaet === activeFilter;
  });

  const radarData = [
    { subject: "Argumente", A: eigenArgs.length > 0 ? Math.round(eigenArgs.reduce((s, a) => s + (a.strength || 5), 0) / eigenArgs.length * 10) : 0 },
    { subject: "Beweise", A: Math.min(100, evidence.length * 12) },
    { subject: "Prognose", A: Math.round(prognose) },
    { subject: "Fristen", A: Math.max(0, 100 - deadlines.filter(d => d.status === "versaeumt").length * 25) },
    { subject: "Richter", A: caseData?.richter_klaeger_rate || 50 },
    { subject: "Gegner-Info", A: Math.min(100, gegnerVerhalten.length * 15) },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
      <span className="text-sm">Lade Falldaten…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border p-5 flex items-start gap-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
          <Sword className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-sm">Strategische Checkliste — Sun Tzu & Machiavelli</h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Geführte nächste Schritte basierend auf allen Fallergebnissen, Prognosen und strategischen Prinzipien mit Rspr. & Lit.
          </p>
          {/* Progress */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700">{progress}%</span>
            <span className="text-[10px] text-gray-400">{Object.values(checked).filter(Boolean).length}/{checklist.length} erledigt</span>
          </div>
        </div>
        <Button onClick={runKIChecklist} disabled={kiLoading} className="text-white rounded-lg text-xs flex-shrink-0"
          style={{ background: "#6d28d9", border: "none" }}>
          {kiLoading ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> KI lädt…</> : <><Zap className="w-3 h-3 mr-1" /> KI-Schritte ergänzen</>}
        </Button>
      </div>

      {/* Stats-Chips */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Prognose", value: `${Math.round(prognose)}%`, color: prognose >= 55 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : prognose >= 40 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200" },
          { label: "Eigene Args", value: eigenArgs.length, color: "text-blue-700 bg-blue-50 border-blue-200" },
          { label: "Gegner Args", value: gegnerArgs.length, color: "text-red-700 bg-red-50 border-red-200" },
          { label: "Beweise", value: evidence.length, color: "text-violet-700 bg-violet-50 border-violet-200" },
          { label: "Fristen versäumt", value: deadlines.filter(d => d.status === "versaeumt").length, color: deadlines.filter(d => d.status === "versaeumt").length > 0 ? "text-red-700 bg-red-50 border-red-200" : "text-gray-500 bg-gray-50 border-gray-200" },
          { label: "Richterquote", value: `${caseData?.richter_klaeger_rate || 50}%`, color: "text-gray-700 bg-gray-50 border-gray-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-3 py-2 text-center ${s.color}`}>
            <p className="text-base font-black">{s.value}</p>
            <p className="text-[9px] font-medium leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Visualisierungen */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Strategische Visualisierung</h3>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              ["wave", "sin(t) Prognose"],
              ["linear", "f(x)=mx+b"],
              ["scatter3d", "3D Argument-Feld"],
              ["radar", "Radar-Profil"],
            ].map(([v, l]) => (
              <button key={v} onClick={() => setChartMode(v)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${chartMode === v ? "bg-gray-900 text-white border-gray-900" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {chartMode === "wave" && <PrognoseWave prognose={prognose} />}
        {chartMode === "linear" && <LinearStrategie argCount={eigenArgs.length} prognose={prognose} />}
        {chartMode === "scatter3d" && <ScatterPlot3D args={args} evidence={evidence} />}
        {chartMode === "radar" && (
          <div>
            <p className="text-[10px] text-gray-400 mb-2 text-center">
              Gesamtprofil: Argumente · Beweise · Prognose · Fristen · Richter · Gegnerinfo
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Radar dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[["alle", "Alle"], ["kritisch", "⚡ Kritisch"], ["hoch", "🔴 Hoch"], ["suntzu", "⚔️ Sun Tzu"], ["machiavelli", "🦁 Machiavelli"], ["ki", "🤖 KI-Schritte"]].map(([v, l]) => (
          <button key={v} onClick={() => setActiveFilter(v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${activeFilter === v ? "bg-gray-900 text-white border-gray-900" : "text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Checkliste */}
      <div className="space-y-2">
        {filteredList.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            Keine Einträge für diesen Filter.
          </div>
        )}
        {filteredList.map(item => (
          <CheckItem
            key={item.id}
            item={item}
            checked={!!checked[item.id]}
            onToggle={toggleCheck}
            expanded={!!expanded[item.id]}
            onExpand={toggleExpand}
          />
        ))}
      </div>

      {/* Prinzipien-Referenz */}
      <div className="bg-gray-50 rounded-2xl border p-5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Prinzipien-Referenz</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <Sword className="w-3 h-3" /> Sun Tzu — Die Kunst des Krieges
            </p>
            <div className="space-y-1.5">
              {PRINZIPIEN.suntzu.map(p => (
                <div key={p.id} className="flex items-start gap-2">
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-200 rounded px-1 py-0.5 flex-shrink-0 mt-0.5">{p.kategorie}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-700">{p.titel}</p>
                    <p className="text-[10px] text-gray-400 italic">{p.zitat}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Machiavelli — Il Principe
            </p>
            <div className="space-y-1.5">
              {PRINZIPIEN.machiavelli.map(p => (
                <div key={p.id} className="flex items-start gap-2">
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-200 rounded px-1 py-0.5 flex-shrink-0 mt-0.5">{p.kategorie}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-700">{p.titel}</p>
                    <p className="text-[10px] text-gray-400 italic">{p.zitat}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
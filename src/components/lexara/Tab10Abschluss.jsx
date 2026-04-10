import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── Stochastic Monte Carlo Engine ───────────────────────────────────────────
function runMonteCarlo(inputs, n = 2000) {
  // inputs: { algoPrognose, kiPrognose, kiAvail, complianceScore, risikoScore, arguements, evidence }
  const { algoPrognose, kiPrognose, kiAvail, complianceScore, risikoScore, argCount, evidenceCount } = inputs;

  // Uncertainties: hard data (low std), KI data (high std)
  const ALGO_STD = 5;      // ±5% std for purely algorithmic result
  const KI_STD = 12;       // ±12% std for KI-derived estimates
  const COMPLIANCE_STD = 8;
  const RISK_STD = 7;

  const randn = () => {
    // Box-Muller
    const u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const results = [];
  for (let i = 0; i < n; i++) {
    let score = algoPrognose + randn() * ALGO_STD;
    if (kiAvail) {
      const kiAdj = (kiPrognose - algoPrognose) * 0.4 + randn() * KI_STD;
      score += kiAdj;
    }
    score += (complianceScore * 10) + randn() * COMPLIANCE_STD;
    score -= (risikoScore * 8) + randn() * RISK_STD;
    // Boost for good data coverage
    score += Math.min(argCount, 10) * 0.3 + Math.min(evidenceCount, 10) * 0.2;
    results.push(Math.min(99, Math.max(1, score)));
  }
  results.sort((a, b) => a - b);
  const p5 = results[Math.floor(n * 0.05)];
  const p25 = results[Math.floor(n * 0.25)];
  const p50 = results[Math.floor(n * 0.50)];
  const p75 = results[Math.floor(n * 0.75)];
  const p95 = results[Math.floor(n * 0.95)];
  const mean = results.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(results.reduce((s, v) => s + (v - mean) ** 2, 0) / n);

  // Histogram buckets 0-100 in steps of 5
  const hist = Array.from({ length: 20 }, (_, i) => ({ range: `${i * 5}–${i * 5 + 5}`, count: 0 }));
  results.forEach(v => { const b = Math.min(19, Math.floor(v / 5)); hist[b].count++; });

  // KI influence: how much variance comes from KI vs. algo
  const kiInfluence = kiAvail ? Math.round((KI_STD ** 2) / (ALGO_STD ** 2 + KI_STD ** 2 + COMPLIANCE_STD ** 2 / 2) * 100) : 0;

  return { p5, p25, p50, p75, p95, mean: Math.round(mean), std: Math.round(std * 10) / 10, hist, kiInfluence };
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
function PrognoseGauge({ value, p5, p95 }) {
  const r = 55, circ = Math.PI * r; // half-circle
  const toOffset = (v) => circ - (Math.min(99, Math.max(1, v)) / 100) * circ;
  const color = value >= 60 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
        {/* confidence band */}
        <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={toOffset(p5)} opacity="0.2" />
        {/* main arc */}
        <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={toOffset(value)} />
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{Math.round(value)}</text>
        <text x="70" y="79" textAnchor="middle" fontSize="9" fill="#6b7280">%</text>
      </svg>
      <p className="text-[10px] text-gray-400 mt-1">
        90%-Konfidenzband: <span className="font-semibold text-gray-600">{Math.round(p5)}% – {Math.round(p95)}%</span>
      </p>
    </div>
  );
}

// ─── KI Influence Bar ─────────────────────────────────────────────────────────
function KiInfluenceBar({ pct }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
        <span>🔢 Algorithmisch (Fakten)</span>
        <span>🤖 KI-Einfluss</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${100 - pct}%` }} />
        <div className="h-full bg-violet-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] mt-1">
        <span className="text-blue-700 font-semibold">{100 - pct}% faktisch</span>
        <span className="text-violet-600 font-semibold">{pct}% KI-basiert</span>
      </div>
      {pct > 50 && (
        <p className="text-[10px] text-amber-600 mt-1 bg-amber-50 border border-amber-100 rounded px-2 py-1">
          ⚠️ Hoher KI-Einfluss — Ergebnis mit größerer Unsicherheit behaftet. Mehr Faktendaten verbessern die Genauigkeit.
        </p>
      )}
    </div>
  );
}

export default function Tab10Abschluss({ caseId, caseData, kiMode }) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [mcResult, setMcResult] = useState(null);
  const [manualNotes, setManualNotes] = useState(caseData?.notes || "");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [args, evs, warnings, behaviors] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.CaseWarning.filter({ case_id: caseId, resolved: false }),
      base44.entities.GegnerVerhalten.filter({ case_id: caseId }),
    ]);
    setData({ args, evs, warnings, behaviors });
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const runAnalysis = () => {
    if (!data) return;
    setRunning(true);

    const algoPrognose = caseData?.prognose || 50;
    const kiResult = caseData?.ki_berater_result;
    const kiPrognose = kiResult?.timing?.momentum_pct
      ? (algoPrognose * 0.6 + kiResult.timing.momentum_pct * 0.4)
      : algoPrognose;

    // Compliance: fewer warnings = better score (0–1)
    const complianceScore = Math.max(0, 1 - (data.warnings.filter(w => w.severity === "kritisch").length * 0.3 + data.warnings.filter(w => w.severity === "hoch").length * 0.1));

    // Risk: versäumte Fristen / pattern as risk
    const negativeBehaviors = data.behaviors.filter(b => b.auswirkung_prognose < 0).length;
    const risikoScore = Math.min(1, negativeBehaviors * 0.15);

    const inputs = {
      algoPrognose,
      kiPrognose,
      kiAvail: !!kiResult,
      complianceScore,
      risikoScore,
      argCount: data.args.length,
      evidenceCount: data.evs.length,
    };

    // Run in next tick to not block UI
    setTimeout(() => {
      const result = runMonteCarlo(inputs, 3000);
      setMcResult(result);
      setRunning(false);
    }, 50);
  };

  const saveResults = async () => {
    setSaving(true);
    await base44.entities.Case.update(caseId, {
      notes: manualNotes,
      prognose: mcResult ? mcResult.mean : caseData?.prognose,
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;

  const eigenArgs = data.args.filter(a => a.side === "eigen");
  const gegnerArgs = data.args.filter(a => a.side === "gegner");
  const criticalWarnings = data.warnings.filter(w => w.severity === "kritisch");

  const factors = [
    { label: "Eigene Argumente", value: eigenArgs.length, max: 10, type: "algo", desc: `${eigenArgs.length} erfasst, Ø-Stärke ${eigenArgs.length ? (eigenArgs.reduce((s,a) => s+(a.strength||5),0)/eigenArgs.length).toFixed(1) : "–"}/10` },
    { label: "Beweise", value: data.evs.length, max: 10, type: "algo", desc: `${data.evs.length} Beweisstücke` },
    { label: "Gegner-Argumente", value: Math.max(0, 10 - gegnerArgs.length), max: 10, type: "algo", desc: `${gegnerArgs.length} gegnerische Argumente (weniger = besser)` },
    { label: "Compliance", value: Math.round((1 - criticalWarnings.length * 0.25) * 10), max: 10, type: "algo", desc: `${criticalWarnings.length} kritische Warnungen offen` },
    { label: "KI-Strategie", value: caseData?.ki_berater_result ? 8 : 0, max: 10, type: "ki", desc: caseData?.ki_berater_result ? "KI-Berater-Analyse vorhanden" : "Keine KI-Analyse" },
    { label: "Gegnerverhalten", value: data.behaviors.length > 0 ? Math.min(10, data.behaviors.length * 2) : 0, max: 10, type: "ki", desc: `${data.behaviors.length} Verhaltensmuster erfasst` },
    { label: "Algorithmus-Prognose", value: Math.round((caseData?.prognose || 50) / 10), max: 10, type: "algo", desc: `${caseData?.prognose || 50}% algorithmische Prognose` },
  ];

  const algoFactors = factors.filter(f => f.type === "algo");
  const kiFactors = factors.filter(f => f.type === "ki");
  const algoScore = algoFactors.reduce((s, f) => s + f.value, 0) / algoFactors.reduce((s, f) => s + f.max, 0) * 100;
  const kiScore = kiFactors.reduce((s, f) => s + f.value, 0) / kiFactors.reduce((s, f) => s + f.max, 0) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-2xl p-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Schritt 10 / Abschluss & Kalibrierung</p>
        <h2 className="text-xl font-bold mb-2">Stochastische Gesamtbewertung</h2>
        <p className="text-sm text-gray-300">Kumuliert alle Faktoren, KI-Analysen und Falldaten zu einer finalen Prognose mit Konfidenzintervall und KI-Einflussmaß.</p>
        <Button onClick={runAnalysis} disabled={running} className="mt-4 bg-white text-gray-900 hover:bg-gray-100 gap-2 text-sm">
          {running ? <><RefreshCw className="w-4 h-4 animate-spin" /> Monte Carlo läuft…</> : "🎲 Analyse starten (3.000 Simulationen)"}
        </Button>
      </div>

      {/* Factor overview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">📊 Eingabefaktoren</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">🔢 Algorithmische Faktoren (harte Daten)</p>
            {algoFactors.map(f => (
              <div key={f.label} className="mb-2">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-gray-600 font-medium">{f.label}</span>
                  <span className="text-gray-400">{f.value}/{f.max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(f.value / f.max) * 100}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
            <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5">
              Algorithmus-Score: {Math.round(algoScore)}%
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-2">🤖 KI-basierte Faktoren (höhere Unsicherheit)</p>
            {kiFactors.map(f => (
              <div key={f.label} className="mb-2">
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-gray-600 font-medium">{f.label}</span>
                  <span className="text-gray-400">{f.value}/{f.max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(f.value / f.max) * 100}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
            <div className="mt-2 text-xs font-semibold text-violet-700 bg-violet-50 rounded-lg px-3 py-1.5">
              KI-Score: {Math.round(kiScore)}%
            </div>
          </div>
        </div>
      </div>

      {/* Monte Carlo Results */}
      {mcResult && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4">🎯 Monte Carlo Ergebnis (n=3.000)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <PrognoseGauge value={mcResult.mean} p5={mcResult.p5} p95={mcResult.p95} />
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[["P5 (pessimistisch)", mcResult.p5, "text-red-600"], ["Median (P50)", mcResult.p50, "text-gray-900 text-lg font-bold"], ["P95 (optimistisch)", mcResult.p95, "text-green-600"]].map(([l, v, cls]) => (
                    <div key={l} className="bg-gray-50 rounded-xl p-3">
                      <div className={`text-base font-bold ${cls}`}>{Math.round(v)}%</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                  <span className="text-xs text-gray-500">Standardabweichung: </span>
                  <span className="text-sm font-bold text-gray-900">±{mcResult.std}%</span>
                  <span className="text-xs text-gray-400 ml-2">(Ungenauigkeitsmaß)</span>
                </div>
                <KiInfluenceBar pct={mcResult.kiInfluence} />
              </div>
            </div>
          </div>

          {/* Distribution histogram */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1">📈 Wahrscheinlichkeitsverteilung der Prognose</h3>
            <p className="text-[11px] text-gray-400 mb-4">Häufigkeit der simulierten Ergebnisse — breitere Verteilung = höhere Unsicherheit</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={mcResult.hist} barSize={12}>
                <XAxis dataKey="range" tick={{ fontSize: 8 }} interval={2} />
                <YAxis hide />
                <Tooltip formatter={(v) => [`${v} Simulationen`]} labelFormatter={(l) => `Bereich: ${l}%`} />
                <ReferenceLine x={`${Math.floor(mcResult.mean / 5) * 5}–${Math.floor(mcResult.mean / 5) * 5 + 5}`} stroke="#1d4ed8" strokeDasharray="4 2" label={{ value: "Ø", fontSize: 9, fill: "#1d4ed8" }} />
                <Bar dataKey="count" fill="#6366f1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interpretation */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-800">🧾 Interpretation & Handlungsempfehlung</h3>
            <div className={`rounded-xl p-4 border ${mcResult.mean >= 60 ? "bg-green-50 border-green-200" : mcResult.mean >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-sm font-bold mb-1">
                {mcResult.mean >= 60 ? "✅ Empfehlung: Streitiges Verfahren — Vollsieg anstreben"
                  : mcResult.mean >= 40 ? "⚖️ Empfehlung: Vergleich in Betracht ziehen"
                  : "⚠️ Empfehlung: Risiken abwägen — Aufgabe oder Vergleich prüfen"}
              </p>
              <p className="text-xs text-gray-600">
                Mit {Math.round(mcResult.mean)}% Median-Prognose und einem 90%-Konfidenzintervall von {Math.round(mcResult.p5)}%–{Math.round(mcResult.p95)}%
                {mcResult.std > 15 ? " ist die Prognose mit erheblicher Unsicherheit behaftet — mehr Daten empfohlen." : " ist die Prognose relativ stabil."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ["Datenbasis", `${data.args.length + data.evs.length} Einträge`, data.args.length + data.evs.length > 5 ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"],
                ["KI-Abdeckung", caseData?.ki_berater_result ? "Vollständig" : "Fehlend", caseData?.ki_berater_result ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"],
                ["Compliance", `${criticalWarnings.length} kritisch offen`, criticalWarnings.length === 0 ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"],
              ].map(([l, v, cls]) => (
                <div key={l} className={`rounded-xl p-3 ${cls}`}>
                  <div className="font-bold">{v}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Notes + Save */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-800">📝 Fallnotizen & Abschluss-Kommentar</h3>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 resize-none"
          rows={4}
          placeholder="Abschließende Einschätzung, Lernpunkte, Strategiehinweise für ähnliche Fälle…"
          value={manualNotes}
          onChange={e => setManualNotes(e.target.value)}
        />
        <Button onClick={saveResults} disabled={saving} className="gap-2 bg-gray-900 text-white text-sm">
          <Save className="w-4 h-4" />
          {saving ? "Speichern…" : saved ? "✓ Gespeichert!" : "Ergebnisse & Notizen speichern"}
        </Button>
        <p className="text-[10px] text-gray-400">Speichert Fallnotizen und überschreibt die Prognose mit dem Monte-Carlo-Median (falls Simulation ausgeführt).</p>
      </div>
    </div>
  );
}
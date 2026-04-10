import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Save, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import KIFeedbackPanel, { useFeedbackAdjustedAccuracy } from "./KIFeedbackPanel";

// ─── Info Tooltip ─────────────────────────────────────────────────────────────
function InfoTip({ title, formula, explanation }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-blue-100 text-gray-500 hover:text-blue-700 transition-colors ml-1 flex-shrink-0" title="Mathematische Erklärung">
        <Info className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-800">{title}</h4>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {explanation && <p className="text-xs text-gray-600 leading-relaxed mb-3">{explanation}</p>}
            {formula && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Formel / Berechnung</p>
                <code className="text-xs text-blue-800 font-mono whitespace-pre-wrap">{formula}</code>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Stochastic Monte Carlo Engine ───────────────────────────────────────────
function runMonteCarlo(inputs, n = 3000) {
  const { algoPrognose, kiPrognose, kiAvail, complianceScore, risikoScore, argCount, evidenceCount, kiCorrect } = inputs;

  const ALGO_STD = 5;
  const KI_STD_CORRECT = 8;   // KI correct → tighter std
  const KI_STD_WRONG = 18;    // KI wrong → very wide std
  const COMPLIANCE_STD = 6;
  const RISK_STD = 5;

  const randn = () => {
    const u = Math.max(1e-10, 1 - Math.random()), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const simulate = (kiStd) => {
    const results = [];
    for (let i = 0; i < n; i++) {
      let score = algoPrognose + randn() * ALGO_STD;
      if (kiAvail) {
        const kiAdj = (kiPrognose - algoPrognose) * 0.4 + randn() * kiStd;
        score += kiAdj;
      }
      score += (complianceScore * 10) + randn() * COMPLIANCE_STD;
      score -= (risikoScore * 8) + randn() * RISK_STD;
      score += Math.min(argCount, 10) * 0.3 + Math.min(evidenceCount, 10) * 0.2;
      results.push(Math.min(99, Math.max(1, score)));
    }
    results.sort((a, b) => a - b);
    const mean = results.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(results.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    const hist = Array.from({ length: 20 }, (_, i) => ({ range: `${i * 5}-${i * 5 + 5}`, count: 0 }));
    results.forEach(v => { const b = Math.min(19, Math.floor(v / 5)); hist[b].count++; });
    return {
      p5: results[Math.floor(n * 0.05)],
      p50: results[Math.floor(n * 0.50)],
      p95: results[Math.floor(n * 0.95)],
      mean: Math.round(mean * 10) / 10,
      std: Math.round(std * 10) / 10,
      hist,
    };
  };

  const correct = simulate(KI_STD_CORRECT);
  const wrong = simulate(KI_STD_WRONG);

  // Weighted combined result
  const w = kiAvail ? inputs.kiAccuracy / 100 : 0;
  const combinedMean = w * correct.mean + (1 - w) * wrong.mean;
  const combinedP5 = w * correct.p5 + (1 - w) * wrong.p5;
  const combinedP95 = w * correct.p95 + (1 - w) * wrong.p95;
  const combinedStd = Math.round(Math.sqrt(w * correct.std ** 2 + (1 - w) * wrong.std ** 2) * 10) / 10;

  // Merged histogram (weighted)
  const combinedHist = correct.hist.map((b, i) => ({
    range: b.range,
    count: Math.round(w * b.count + (1 - w) * wrong.hist[i].count),
  }));

  // KI influence: variance share from KI
  const kiInfluence = kiAvail
    ? Math.round((KI_STD_CORRECT ** 2) / (ALGO_STD ** 2 + KI_STD_CORRECT ** 2 + COMPLIANCE_STD ** 2 / 2) * 100)
    : 0;

  return { correct, wrong, combinedMean: Math.round(combinedMean), combinedP5, combinedP95, combinedStd, combinedHist, kiInfluence };
}

// ─── KI Accuracy estimator ────────────────────────────────────────────────────
function estimateKiAccuracy(args, evs, warnings, behaviors, kiResult) {
  if (!kiResult) return { accuracy: 0, factors: [] };
  let score = 50; // base
  const factors = [];

  const argScore = Math.min(args.length / 8, 1);
  score += argScore * 15;
  factors.push({ label: "Argumentabdeckung", delta: Math.round(argScore * 15), formula: `min(Argumente/8, 1) × 15 = +${Math.round(argScore * 15)}%` });

  const evScore = Math.min(evs.length / 6, 1);
  score += evScore * 12;
  factors.push({ label: "Beweisabdeckung", delta: Math.round(evScore * 12), formula: `min(Beweise/6, 1) × 12 = +${Math.round(evScore * 12)}%` });

  const critWarn = warnings.filter(w => w.severity === "kritisch").length;
  const warnPenalty = -critWarn * 8;
  score += warnPenalty;
  factors.push({ label: "Offene krit. Warnungen", delta: warnPenalty, formula: `Kritische × (-8) = ${warnPenalty}%` });

  const behaviorBonus = Math.min(behaviors.length * 3, 12);
  score += behaviorBonus;
  factors.push({ label: "Verhaltensdaten", delta: behaviorBonus, formula: `min(Einträge × 3, 12) = +${behaviorBonus}%` });

  return { accuracy: Math.min(92, Math.max(20, Math.round(score))), factors };
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
function PrognoseGauge({ value, p5, p95, color = null }) {
  const r = 50, circ = Math.PI * r;
  const toOffset = (v) => circ - (Math.min(99, Math.max(1, v)) / 100) * circ;
  const col = color || (value >= 60 ? "#16a34a" : value >= 40 ? "#d97706" : "#dc2626");
  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="76" viewBox="0 0 130 76">
        <path d="M 15 70 A 50 50 0 0 1 115 70" fill="none" stroke="#e5e7eb" strokeWidth="9" strokeLinecap="round" />
        <path d="M 15 70 A 50 50 0 0 1 115 70" fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={toOffset(value)} />
        <text x="65" y="62" textAnchor="middle" fontSize="20" fontWeight="800" fill={col}>{Math.round(value)}</text>
        <text x="65" y="72" textAnchor="middle" fontSize="8" fill="#6b7280">%</text>
      </svg>
      {p5 !== undefined && (
        <p className="text-[9px] text-gray-400">Band: {Math.round(p5)}%–{Math.round(p95)}%</p>
      )}
    </div>
  );
}

// ─── Histogram ────────────────────────────────────────────────────────────────
function Histogram({ hist, color, label }) {
  return (
    <div>
      {label && <p className="text-[10px] text-gray-500 mb-1 font-medium">{label}</p>}
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={hist} barSize={10}>
          <XAxis dataKey="range" tick={{ fontSize: 7 }} interval={3} />
          <YAxis hide />
          <Tooltip formatter={(v) => [`${v} Sim.`]} labelFormatter={(l) => `${l}%`} />
          <Bar dataKey="count" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Tab10Abschluss({ caseId, caseData, kiMode }) {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [mcResult, setMcResult] = useState(null);
  const [kiAccData, setKiAccData] = useState(null);
  const [manualNotes, setManualNotes] = useState(caseData?.notes || "");
  const [saved, setSaved] = useState(false);
  const feedbackAdjustedAccuracy = useFeedbackAdjustedAccuracy(caseId, kiAccData?.accuracy ?? 50);

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

    const complianceScore = Math.max(0, 1 - (data.warnings.filter(w => w.severity === "kritisch").length * 0.3 + data.warnings.filter(w => w.severity === "hoch").length * 0.1));
    const negativeBehaviors = data.behaviors.filter(b => b.auswirkung_prognose < 0).length;
    const risikoScore = Math.min(1, negativeBehaviors * 0.15);

    const kiAcc = estimateKiAccuracy(data.args, data.evs, data.warnings, data.behaviors, kiResult);
    setKiAccData(kiAcc);
    // feedbackAdjustedAccuracy will update reactively via hook
    const inputs = {
      algoPrognose, kiPrognose, kiAvail: !!kiResult,
      complianceScore, risikoScore,
      argCount: data.args.length, evidenceCount: data.evs.length,
      kiAccuracy: feedbackAdjustedAccuracy,
    };

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
      prognose: mcResult ? mcResult.combinedMean : caseData?.prognose,
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
    {
      label: "Eigene Argumente", value: eigenArgs.length, max: 10, type: "algo",
      desc: `${eigenArgs.length} erfasst, Ø-Stärke ${eigenArgs.length ? (eigenArgs.reduce((s, a) => s + (a.strength || 5), 0) / eigenArgs.length).toFixed(1) : "–"}/10`,
      infoTitle: "Eigene Argumente — Berechnung",
      infoFormula: "Score = Anzahl eigener Argumente (max. 10)\nGewichtung im Algorithmus: direkt als Faktorwert",
      infoExpl: "Jedes erfasste Argument erhöht die Stärke der eigenen Position. Die Argumentanzahl fließt direkt als Score ein, begrenzt auf 10.",
    },
    {
      label: "Beweise", value: data.evs.length, max: 10, type: "algo",
      desc: `${data.evs.length} Beweisstücke`,
      infoTitle: "Beweise — Berechnung",
      infoFormula: "Score = Anzahl Beweisstücke (max. 10)\nBeweisboost im MC: +0.2 pro Beweis (max. 10)",
      infoExpl: "Beweisstücke stärken die algorithmische Grundlage. Je mehr Beweise, desto geringer die Simulation-Unsicherheit.",
    },
    {
      label: "Gegner-Argumente", value: Math.max(0, 10 - gegnerArgs.length), max: 10, type: "algo",
      desc: `${gegnerArgs.length} gegnerische Argumente (weniger = besser)`,
      infoTitle: "Gegner-Argumente — inverse Bewertung",
      infoFormula: "Score = max(0, 10 − Anzahl Gegner-Argumente)\nWeniger Gegner-Argumente → höherer Score",
      infoExpl: "Mehr Gegner-Argumente senken unsere Position. Die Metrik ist invertiert: 0 Gegner-Argumente ergibt Score=10.",
    },
    {
      label: "Compliance", value: Math.round((1 - criticalWarnings.length * 0.25) * 10), max: 10, type: "algo",
      desc: `${criticalWarnings.length} kritische Warnungen offen`,
      infoTitle: "Compliance-Score — Berechnung",
      infoFormula: "Score = max(0, (1 − kritische_Warnungen × 0.25)) × 10\nBeispiel: 2 kritische → (1 − 0.5) × 10 = 5",
      infoExpl: "Jede offene kritische Warnung reduziert den Compliance-Score um 2.5 Punkte (Faktor 0.25).",
    },
    {
      label: "KI-Strategie", value: caseData?.ki_berater_result ? 8 : 0, max: 10, type: "ki",
      desc: caseData?.ki_berater_result ? "KI-Berater-Analyse vorhanden" : "Keine KI-Analyse",
      infoTitle: "KI-Strategie-Score",
      infoFormula: "Score = 8 wenn KI-Berater-Analyse vorhanden, sonst 0\nDieser Score fließt in die KI-basierte Seite ein.",
      infoExpl: "Sobald eine vollständige KI-Berater-Analyse (Psychologisches Profil, Druckmittel etc.) vorliegt, wird ein fixer Score von 8/10 vergeben.",
    },
    {
      label: "Gegnerverhalten", value: data.behaviors.length > 0 ? Math.min(10, data.behaviors.length * 2) : 0, max: 10, type: "ki",
      desc: `${data.behaviors.length} Verhaltensmuster erfasst`,
      infoTitle: "Gegnerverhalten-Score",
      infoFormula: "Score = min(Anzahl Einträge × 2, 10)\nBeispiel: 4 Einträge → 4 × 2 = 8",
      infoExpl: "Jeder erfasste Verhaltenseintrag des Gegners verbessert die KI-Prognosequalität um 2 Punkte (max. 10).",
    },
    {
      label: "Algorithmus-Prognose", value: Math.round((caseData?.prognose || 50) / 10), max: 10, type: "algo",
      desc: `${caseData?.prognose || 50}% algorithmische Prognose`,
      infoTitle: "Algorithmus-Prognose als Score",
      infoFormula: "Score = Prognose (%) ÷ 10\nBeispiel: 65% → Score = 6.5 ≈ 7",
      infoExpl: "Die 6-Stufen-Algorithmus-Prognose wird normiert auf eine 0–10 Skala und als Ankerpunkt für die Monte-Carlo-Simulation verwendet.",
    },
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
        <p className="text-sm text-gray-300">Kumuliert alle Faktoren, KI-Analysen und Falldaten. Berechnet zwei Szenarien: KI liegt richtig vs. falsch. Gewichtet nach geschätzter KI-Treffsicherheit.</p>
        <Button onClick={runAnalysis} disabled={running} className="mt-4 bg-white text-gray-900 hover:bg-gray-100 gap-2 text-sm">
          {running ? <><RefreshCw className="w-4 h-4 animate-spin" /> Monte Carlo läuft…</> : "🎲 Analyse starten (3.000 Simulationen)"}
        </Button>
      </div>

      {/* Factor overview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center">
          📊 Eingabefaktoren
          <InfoTip
            title="Wie werden Eingabefaktoren gewichtet?"
            explanation="Alle Faktoren werden auf einer 0–10 Skala normiert. Algorithmische Faktoren basieren auf harten Daten (Argumente, Beweise, Fristen). KI-Faktoren basieren auf KI-Analysen mit höherer inhärenter Unsicherheit."
            formula={"Score_gesamt = Σ(Faktorwert) / Σ(max_Faktorwert) × 100\n\nAlgo-Score = (ArgScore + BewScore + GegnerScore + CompScore + ProgScore) / 50 × 100\nKI-Score = (KI-Strategie + Verhalten) / 20 × 100"}
          />
        </h3>
        <p className="text-[10px] text-gray-400 mb-4">Klicke das ℹ️ an jedem Faktor für die genaue Formel</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">🔢 Algorithmische Faktoren (harte Daten, σ=±5%)</p>
            {algoFactors.map(f => (
              <div key={f.label} className="mb-2.5">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-gray-600 font-medium flex items-center gap-0.5">
                    {f.label}
                    <InfoTip title={f.infoTitle} formula={f.infoFormula} explanation={f.infoExpl} />
                  </span>
                  <span className="text-gray-400">{f.value}/{f.max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(f.value / f.max) * 100}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
            <div className="mt-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 flex items-center">
              Algorithmus-Score: {Math.round(algoScore)}%
              <InfoTip title="Algorithmus-Gesamtscore" formula={`Score = ${algoFactors.map(f => f.value).join(' + ')} = ${algoFactors.reduce((s,f)=>s+f.value,0)} von ${algoFactors.reduce((s,f)=>s+f.max,0)} möglichen Punkten\n→ ${Math.round(algoScore)}%`} explanation="Summe aller algorithmischen Faktorwerte, normiert auf Prozent." />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-2">🤖 KI-basierte Faktoren (höhere Unsicherheit, σ=±8–18%)</p>
            {kiFactors.map(f => (
              <div key={f.label} className="mb-2.5">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-gray-600 font-medium flex items-center gap-0.5">
                    {f.label}
                    <InfoTip title={f.infoTitle} formula={f.infoFormula} explanation={f.infoExpl} />
                  </span>
                  <span className="text-gray-400">{f.value}/{f.max}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(f.value / f.max) * 100}%` }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
            <div className="mt-2 text-xs font-semibold text-violet-700 bg-violet-50 rounded-lg px-3 py-1.5 flex items-center">
              KI-Score: {Math.round(kiScore)}%
              <InfoTip title="KI-Gesamtscore" formula={`Score = ${kiFactors.map(f => f.value).join(' + ')} = ${kiFactors.reduce((s,f)=>s+f.value,0)} von ${kiFactors.reduce((s,f)=>s+f.max,0)} möglichen Punkten\n→ ${Math.round(kiScore)}%`} explanation="Summe aller KI-basierten Faktorwerte, normiert auf Prozent. Höhere Unsicherheit als Algorithmus-Faktoren." />
            </div>
          </div>
        </div>
      </div>

      {/* Monte Carlo Results */}
      {mcResult && kiAccData && (
        <>
          {/* KI Accuracy */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center">
              🎯 Geschätzte KI-Treffsicherheit
              <InfoTip
                title="KI-Treffsicherheit — Berechnung"
                explanation="Die Wahrscheinlichkeit, dass die KI-Analyse korrekt ist, wird aus der Qualität der Eingabedaten abgeleitet. Mehr Daten = höhere KI-Verlässlichkeit."
                formula={`Basis: 50%\n+ Argumentabdeckung: min(Argumente/8, 1) × 15\n+ Beweisabdeckung: min(Beweise/6, 1) × 12\n- Kritische Warnungen: Anzahl × 8\n+ Verhaltensdaten: min(Einträge × 3, 12)\n→ Ergebnis: ${kiAccData.accuracy}% (begrenzt: 20%–92%)`}
              />
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">Abgeleitet aus Datenvollständigkeit und offenen Compliance-Warnungen</p>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-600 font-semibold">❌ KI falsch ({100 - kiAccData.accuracy}%)</span>
                  <span className="text-green-600 font-semibold">✅ KI richtig ({kiAccData.accuracy}%)</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-red-400 transition-all duration-700" style={{ width: `${100 - kiAccData.accuracy}%` }} />
                  <div className="h-full bg-green-500 transition-all duration-700" style={{ width: `${kiAccData.accuracy}%` }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800">{kiAccData.accuracy}%</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {kiAccData.factors.map((f, i) => (
                <div key={i} className={`text-[10px] rounded-lg px-2 py-1.5 flex items-center justify-between ${f.delta >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  <span>{f.label}</span>
                  <span className="font-bold ml-2">{f.delta >= 0 ? "+" : ""}{f.delta}%
                    <InfoTip title={`Formel: ${f.label}`} formula={f.formula} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Two scenarios + combined */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center">
              📊 Zwei Szenarien — KI richtig vs. KI falsch
              <InfoTip
                title="Szenario-Berechnung"
                explanation="Monte Carlo simuliert 3.000 Durchläufe pro Szenario. Wenn KI richtig: engere Streuung (σ_KI=±8%). Wenn KI falsch: breite Streuung (σ_KI=±18%), da KI-Einfluss zu zufälligem Rauschen wird. Das gewichtete Ergebnis kombiniert beide Szenarien nach der KI-Treffsicherheit."
                formula={`Szenario 'KI richtig': σ_KI = ±8% → enger Korridor\nSzenario 'KI falsch': σ_KI = ±18% → breiter Korridor\n\nGewichtetes Ergebnis:\nMean = P(richtig) × Mean_richtig + P(falsch) × Mean_falsch\n     = ${kiAccData.accuracy/100} × ${mcResult.correct.mean} + ${(100-kiAccData.accuracy)/100} × ${mcResult.wrong.mean}\n     ≈ ${mcResult.combinedMean}%\n\nσ_kombiniert = √(P_r × σ_r² + P_f × σ_f²)\n             ≈ ±${mcResult.combinedStd}%`}
              />
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">σ_KI = ±8% wenn richtig / ±18% wenn falsch — gewichtet nach Treffsicherheit {kiAccData.accuracy}%/{100-kiAccData.accuracy}%</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* KI richtig */}
              <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                <p className="text-xs font-bold text-green-800 mb-3 flex items-center">
                  ✅ KI liegt richtig ({kiAccData.accuracy}%)
                  <InfoTip title="Szenario: KI richtig" formula={`σ_KI = ±8% (enges Band)\nMittelwert: ${mcResult.correct.mean}%\nStd: ±${mcResult.correct.std}%\nP5: ${Math.round(mcResult.correct.p5)}% | P95: ${Math.round(mcResult.correct.p95)}%`} explanation="Wenn die KI korrekt liegt, ist ihre Schätzung nahe am wahren Wert. Die Unsicherheit kommt hauptsächlich aus der Datenvariabilität." />
                </p>
                <PrognoseGauge value={mcResult.correct.mean} p5={mcResult.correct.p5} p95={mcResult.correct.p95} color="#16a34a" />
                <div className="mt-2 space-y-1 text-[10px] text-green-800">
                  <div>Mittelwert: <strong>{mcResult.correct.mean}%</strong></div>
                  <div>Std: <strong>±{mcResult.correct.std}%</strong></div>
                  <div>Band: <strong>{Math.round(mcResult.correct.p5)}%–{Math.round(mcResult.correct.p95)}%</strong></div>
                </div>
                <Histogram hist={mcResult.correct.hist} color="#16a34a" />
              </div>

              {/* KI falsch */}
              <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                <p className="text-xs font-bold text-red-800 mb-3 flex items-center">
                  ❌ KI liegt falsch ({100 - kiAccData.accuracy}%)
                  <InfoTip title="Szenario: KI falsch" formula={`σ_KI = ±18% (breites Band)\nMittelwert: ${mcResult.wrong.mean}%\nStd: ±${mcResult.wrong.std}%\nP5: ${Math.round(mcResult.wrong.p5)}% | P95: ${Math.round(mcResult.wrong.p95)}%`} explanation="Wenn die KI falsch liegt, wird ihr Einfluss zum zufälligen Rauschen. Die Verteilung wird breiter und die Unsicherheit steigt stark." />
                </p>
                <PrognoseGauge value={mcResult.wrong.mean} p5={mcResult.wrong.p5} p95={mcResult.wrong.p95} color="#dc2626" />
                <div className="mt-2 space-y-1 text-[10px] text-red-800">
                  <div>Mittelwert: <strong>{mcResult.wrong.mean}%</strong></div>
                  <div>Std: <strong>±{mcResult.wrong.std}%</strong></div>
                  <div>Band: <strong>{Math.round(mcResult.wrong.p5)}%–{Math.round(mcResult.wrong.p95)}%</strong></div>
                </div>
                <Histogram hist={mcResult.wrong.hist} color="#dc2626" />
              </div>

              {/* Gewichtet */}
              <div className="border border-gray-200 bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-800 mb-3 flex items-center">
                  ⚖️ Gewichtetes Ergebnis
                  <InfoTip title="Gewichtetes Gesamtergebnis" formula={`Mean = ${kiAccData.accuracy}% × ${mcResult.correct.mean} + ${100-kiAccData.accuracy}% × ${mcResult.wrong.mean}\n     = ${mcResult.combinedMean}%\n\nσ = √(${kiAccData.accuracy/100} × ${mcResult.correct.std}² + ${(100-kiAccData.accuracy)/100} × ${mcResult.wrong.std}²)\n  ≈ ±${mcResult.combinedStd}%`} explanation="Das finale Ergebnis gewichtet beide Szenarien nach der geschätzten KI-Treffsicherheit. Dies ist die robusteste Gesamtprognose." />
                </p>
                <PrognoseGauge value={mcResult.combinedMean} p5={mcResult.combinedP5} p95={mcResult.combinedP95} />
                <div className="mt-2 space-y-1 text-[10px] text-gray-700">
                  <div>Mittelwert: <strong>{mcResult.combinedMean}%</strong></div>
                  <div>Std: <strong>±{mcResult.combinedStd}%</strong></div>
                  <div>Band: <strong>{Math.round(mcResult.combinedP5)}%–{Math.round(mcResult.combinedP95)}%</strong></div>
                </div>
                <Histogram hist={mcResult.combinedHist} color="#6366f1" />
              </div>
            </div>
          </div>

          {/* KI Influence */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
              🔬 KI-Einfluss auf das Ergebnis
              <InfoTip
                title="KI-Einfluss — Varianzanalyse"
                explanation="Der KI-Einfluss misst, wie viel der Gesamtvarianz aus KI-basierten Schätzungen stammt, verglichen mit algorithmischen Faktoren."
                formula={`KI-Einfluss (%) = σ²_KI / (σ²_Algo + σ²_KI + σ²_Compliance/2) × 100\n= ${8}² / (${5}² + ${8}² + ${6}²/2) × 100\n= ${64} / (${25} + ${64} + ${18}) × 100\n≈ ${mcResult.kiInfluence}%`}
              />
            </h3>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>🔢 Faktisch (σ=±5%)</span>
              <span>🤖 KI-Anteil an Varianz (σ=±8–18%)</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-600" style={{ width: `${100 - mcResult.kiInfluence}%` }} />
              <div className="h-full bg-violet-500" style={{ width: `${mcResult.kiInfluence}%` }} />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-blue-700 font-semibold">{100 - mcResult.kiInfluence}% faktisch</span>
              <span className="text-violet-600 font-semibold">{mcResult.kiInfluence}% KI-basiert</span>
            </div>
            {mcResult.kiInfluence > 50 && (
              <p className="text-[10px] text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                ⚠️ Hoher KI-Einfluss — Ergebnis mit größerer Unsicherheit. Mehr Faktendaten (Argumente, Beweise) verbessern die Zuverlässigkeit.
              </p>
            )}
          </div>

          {/* Interpretation */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center">
              🧾 Interpretation & Handlungsempfehlung
              <InfoTip title="Empfehlung — Schwellenwerte" formula={"≥ 60% → Klage / Vollsieg\n40%–59% → Vergleich prüfen\n< 40% → Risiken abwägen"} explanation="Die Schwellenwerte basieren auf typischen anwaltlichen Kosten-Nutzen-Kalkülen im deutschen Zivilprozessrecht." />
            </h3>
            <div className={`rounded-xl p-4 border ${mcResult.combinedMean >= 60 ? "bg-green-50 border-green-200" : mcResult.combinedMean >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
              <p className="text-sm font-bold mb-1">
                {mcResult.combinedMean >= 60 ? "✅ Empfehlung: Streitiges Verfahren — Vollsieg anstreben"
                  : mcResult.combinedMean >= 40 ? "⚖️ Empfehlung: Vergleich in Betracht ziehen"
                  : "⚠️ Empfehlung: Risiken abwägen — Aufgabe oder Vergleich prüfen"}
              </p>
              <p className="text-xs text-gray-600">
                Gewichtete Prognose: <strong>{mcResult.combinedMean}%</strong> · 90%-Band: {Math.round(mcResult.combinedP5)}%–{Math.round(mcResult.combinedP95)}% · σ=±{mcResult.combinedStd}%
                {mcResult.combinedStd > 15 ? " — erhebliche Unsicherheit, mehr Daten empfohlen." : " — relativ stabile Prognose."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {[
                ["Datenbasis", `${data.args.length + data.evs.length} Einträge`, data.args.length + data.evs.length > 5 ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"],
                ["KI-Treffsicherheit", `${kiAccData.accuracy}%`, kiAccData.accuracy >= 70 ? "text-green-700 bg-green-50" : kiAccData.accuracy >= 50 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50"],
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

      {/* Feedback Panel */}
      <KIFeedbackPanel caseId={caseId} />

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
        <Button onClick={saveResults} disabled={saving || !mcResult} className="gap-2 bg-gray-900 text-white text-sm">
          <Save className="w-4 h-4" />
          {saving ? "Speichern…" : saved ? "✓ Gespeichert!" : "Ergebnisse & Notizen speichern"}
        </Button>
        <p className="text-[10px] text-gray-400">Speichert Notizen und überschreibt die Fall-Prognose mit dem gewichteten Monte-Carlo-Median.</p>
      </div>
    </div>
  );
}
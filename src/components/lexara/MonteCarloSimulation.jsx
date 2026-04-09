import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Monte-Carlo Simulation für Verhandlungsausgänge
 * Simuliert mehrere tausend Szenarien basierend auf:
 * - Beweisstärke und Varianz
 * - Gegnerische Argumente
 * - Deadlinedruck
 * - Richter-Bias
 */

function runSimulation(args, evidence, deadlines, caseData, iterations = 5000) {
  const eigeneArgs = args.filter(a => a.side === "eigen");
  const gegnerArgs = args.filter(a => a.side === "gegner");
  
  // Base-Stärken
  const eigeneStaerke = eigeneArgs.length ? eigeneArgs.reduce((s, a) => s + (a.strength || 5), 0) / eigeneArgs.length : 5;
  const gegnerStaerke = gegnerArgs.length ? gegnerArgs.reduce((s, a) => s + (a.strength || 5), 0) / gegnerArgs.length : 5;
  
  // Beweis-Gewichte
  const eigeneBeweise = evidence.filter(e => !e.against);
  const gegnerBeweise = evidence.filter(e => e.against);
  const eigeneBeweisStaerke = eigeneBeweise.length ? eigeneBeweise.reduce((s, e) => s + (e.weight || 5), 0) / eigeneBeweise.length : 5;
  const gegnerBeweisStaerke = gegnerBeweise.length ? gegnerBeweise.reduce((s, e) => s + (e.weight || 5), 0) / gegnerBeweise.length : 5;
  
  // Deadline-Druck: je näher die Frist, desto höher der Druck
  const offeneDeadlines = deadlines.filter(d => d.status === "offen");
  const deadlineDruck = offeneDeadlines.length ? 1 - (0.1 * offeneDeadlines.length) : 1;
  
  // Richter-Bias
  const richterKlaegerQuote = caseData?.richter_klaeger_rate || 50;
  
  const outcomes = { Sieg: 0, Vergleich: 0, Niederlage: 0 };
  const scoreHistory = [];
  
  for (let i = 0; i < iterations; i++) {
    // Varianz in den Stärken (±3 Punkte Normal-Verteilung)
    const eigeneVar = eigeneStaerke + (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 3;
    const gegnerVar = gegnerStaerke + (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 3;
    
    // Varianz in Beweisen
    const eigeneBeweisVar = eigeneBeweisStaerke + (Math.random() - 0.5) * 2;
    const gegnerBeweisVar = gegnerBeweisStaerke + (Math.random() - 0.5) * 2;
    
    // Score-Berechnung: Argument + Beweis + Deadline-Druck
    const eigeneScore = (eigeneVar * 0.4 + eigeneBeweisVar * 0.4 + deadlineDruck * 2) * (100 + richterKlaegerQuote) / 150;
    const gegnerScore = (gegnerVar * 0.4 + gegnerBeweisVar * 0.4 + (2 - deadlineDruck) * 1.5) * (100 - richterKlaegerQuote) / 150;
    
    const netScore = eigeneScore - gegnerScore;
    scoreHistory.push(netScore);
    
    // Outcome bestimmen
    if (netScore > 15) {
      outcomes.Sieg++;
    } else if (netScore > -15) {
      outcomes.Vergleich++;
    } else {
      outcomes.Niederlage++;
    }
  }
  
  // Wahrscheinlichkeiten
  const probs = {
    sieg: Math.round((outcomes.Sieg / iterations) * 100),
    vergleich: Math.round((outcomes.Vergleich / iterations) * 100),
    niederlage: Math.round((outcomes.Niederlage / iterations) * 100),
  };
  
  // Konfidenzintervall (95%)
  const sortedScores = scoreHistory.sort((a, b) => a - b);
  const ci_low = sortedScores[Math.floor(iterations * 0.025)];
  const ci_high = sortedScores[Math.floor(iterations * 0.975)];
  const median = sortedScores[Math.floor(iterations * 0.5)];
  
  return {
    outcomes: probs,
    scoreHistory,
    ci_low,
    ci_high,
    median,
    iterations,
  };
}

export default function MonteCarloSimulation({ caseId, caseData }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [iterations, setIterations] = useState(5000);

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
    ]).then(([a, e, d]) => {
      setArgs(a);
      setEvidence(e);
      setDeadlines(d);
    });
  }, [caseId]);

  const runMonteCarlo = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const simResult = runSimulation(args, evidence, deadlines, caseData, iterations);
    setResult(simResult);
    setLoading(false);
  };

  // Histogram-Daten aus scoreHistory
  const histoData = result
    ? (() => {
        const bins = {};
        for (let i = -50; i <= 50; i += 5) {
          bins[i] = 0;
        }
        result.scoreHistory.forEach(score => {
          const bin = Math.floor(score / 5) * 5;
          if (bins[bin] !== undefined) bins[bin]++;
        });
        return Object.entries(bins)
          .map(([bin, count]) => ({
            range: `${bin}-${parseInt(bin) + 5}`,
            count: (count / result.iterations) * 100,
          }))
          .filter(d => d.count > 0);
      })()
    : [];

  // Pie-Daten
  const pieData = result
    ? [
        { name: "Sieg", value: result.outcomes.sieg, color: "#16a34a" },
        { name: "Vergleich", value: result.outcomes.vergleich, color: "#f59e0b" },
        { name: "Niederlage", value: result.outcomes.niederlage, color: "#dc2626" },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">🎲 Monte-Carlo Simulation</h3>
            <p className="text-xs text-gray-500 mt-0.5">Simuliert verschiedene Verhandlungsszenarien basierend auf Beweisstärken & Fristen</p>
          </div>
          <Button
            onClick={runMonteCarlo}
            disabled={loading || args.length === 0}
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-xl"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {loading ? "Simuliere..." : "Simulation starten"}
          </Button>
        </div>

        {args.length === 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">Mindestens ein Argument erforderlich zum Simulieren</p>
          </div>
        )}

        {/* Iterations slider */}
        {result && (
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <label className="text-xs font-semibold text-gray-600 block">
              Iterations: <span className="text-violet-600">{iterations.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="1000"
              max="20000"
              step="1000"
              value={iterations}
              onChange={e => setIterations(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-[10px] text-gray-400">Höhere Werte = genauere Ergebnisse (langsamer)</p>
          </div>
        )}
      </div>

      {!result && !loading && (
        <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Bereit zur Simulation?</p>
          <p className="text-xs text-gray-500">Drücke "Simulation starten" um {iterations.toLocaleString()} Szenarien zu durchlaufen</p>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Führe {iterations.toLocaleString()} Szenarien durch...</p>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{result.outcomes.sieg}%</p>
              <p className="text-xs text-green-700 font-semibold mt-1">Sieg</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{result.outcomes.vergleich}%</p>
              <p className="text-xs text-amber-700 font-semibold mt-1">Vergleich</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{result.outcomes.niederlage}%</p>
              <p className="text-xs text-red-700 font-semibold mt-1">Niederlage</p>
            </div>
          </div>

          {/* Pie chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-widest">Verteilung</p>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={d => `${d.name} ${d.value}%`} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={v => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Histogram */}
          {histoData.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-widest">Score-Verteilung</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={histoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: "Häufigkeit (%)", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={v => `${v.toFixed(1)}%`} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Statistics */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Median Score</p>
              <p className="text-3xl font-bold text-gray-800">{result.median.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">90% Konfidenzintervall</p>
              <p className="text-sm text-gray-700 font-mono">[{result.ci_low.toFixed(1)}, {result.ci_high.toFixed(1)}]</p>
            </div>
          </div>

          {/* Interpretation */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">📊 Interpretation</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>
                • <strong>Sieg:</strong> Score &gt; +15 (klare Überlegenheit der Argumente)
              </li>
              <li>
                • <strong>Vergleich:</strong> Score [-15, +15] (ausgeglichene Chancen)
              </li>
              <li>
                • <strong>Niederlage:</strong> Score &lt; -15 (gegnerische Argumente überwiegen)
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
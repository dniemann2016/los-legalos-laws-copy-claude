/**
 * TabRisikoAlgo – Algorithmus-basierte Risiko-Anzeige-Komponente
 * Zeigt aufklappbare Berechnungsschritte für jeden Faktor.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const RISIKO_META = {
  beweis_risiko:    { label: "Beweislage",       icon: "📄" },
  richter_risiko:   { label: "Richterrisiko",     icon: "⚖️" },
  rechts_risiko:    { label: "Rechtsunsicherheit",icon: "§" },
  kosten_risiko:    { label: "Kostenrisiko",      icon: "💶" },
  zeit_risiko:      { label: "Zeitrisiko",        icon: "⏰" },
  gegner_risiko:    { label: "Gegnerstärke",      icon: "🥊" },
  reputation_risiko:{ label: "Reputationsrisiko", icon: "📰" },
  vergleich_chance: { label: "Vergleichschance",  icon: "🤝" },
};

const AMPEL = {
  niedrig: "bg-green-100 text-green-700 border-green-200",
  mittel:  "bg-amber-100 text-amber-700 border-amber-200",
  hoch:    "bg-red-100 text-red-700 border-red-200",
};

function FaktorCard({ faktor }) {
  const [open, setOpen] = useState(false);
  const meta = RISIKO_META[faktor.key] || { label: faktor.key, icon: "•" };
  const barColor = faktor.level === "hoch" ? "#ef4444" : faktor.level === "mittel" ? "#f59e0b" : "#22c55e";

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-base">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${AMPEL[faktor.level]}`}>
              {faktor.level?.toUpperCase()}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${faktor.score * 10}%`, backgroundColor: barColor }} />
          </div>
        </div>
        <span className="text-xs font-bold text-gray-500 flex-shrink-0 w-8 text-right">{faktor.score}/10</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-2 pt-3">
          <p className="text-xs text-gray-600">{faktor.bewertung}</p>

          {faktor.formel && (
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">🧮 Rechenweg</p>
              <code className="text-[10px] text-blue-800 font-mono break-all">{faktor.formel}</code>
            </div>
          )}

          {faktor.massnahme && (
            <p className="text-xs text-gray-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              💡 <strong>Maßnahme:</strong> {faktor.massnahme}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PrognoseStepCard({ step, index }) {
  const [open, setOpen] = useState(false);
  const wert = typeof step.wert === "number"
    ? `${step.wert > 0 ? "+" : ""}${step.wert.toFixed(4)} ${step.einheit || ""}`
    : typeof step.wert === "object" && step.wert?.ciLow !== undefined
      ? `[${(step.wert.ciLow * 100).toFixed(1)}%, ${(step.wert.ciHigh * 100).toFixed(1)}%]`
      : "";

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
        <span className="flex-1 text-xs font-medium text-gray-700">{step.label}</span>
        <code className="text-[10px] text-violet-700 font-mono">{wert}</code>
        {open ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 bg-gray-50 border-t border-gray-100 space-y-2 pt-2">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-[9px] font-bold text-gray-400 mb-0.5">FORMEL</p>
            <code className="text-[10px] text-blue-800 font-mono break-all">{step.formel}</code>
          </div>
          <p className="text-xs text-gray-600">{step.erklaerung}</p>
        </div>
      )}
    </div>
  );
}

export function AlgoRisikoPanel({ result }) {
  const { prognose, risikofaktoren, monteCarlo, breakEven } = result;
  const [showPrognoseSteps, setShowPrognoseSteps] = useState(false);
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);

  const radarData = (risikofaktoren?.faktoren || []).map(f => ({
    subject: RISIKO_META[f.key]?.label || f.key,
    A: f.score,
  }));

  const SCENARIO_COLORS = ["#22c55e", "#3b82f6", "#ef4444"];
  const szenarien = monteCarlo?.scenarios
    ? [
        { label: "Best Case",  wert: monteCarlo.scenarios.best_case?.wahrscheinlichkeit,  color: "#22c55e", erkl: monteCarlo.scenarios.best_case?.erklaerung },
        { label: "Base Case",  wert: monteCarlo.scenarios.base_case?.wahrscheinlichkeit,  color: "#3b82f6", erkl: monteCarlo.scenarios.base_case?.erklaerung },
        { label: "Worst Case", wert: monteCarlo.scenarios.worst_case?.wahrscheinlichkeit, color: "#ef4444", erkl: monteCarlo.scenarios.worst_case?.erklaerung },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Prognose-Header */}
      <div className="bg-gray-900 text-white rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Algorithmische Prognose</p>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-bold">{prognose.score}%</p>
              <p className="text-sm text-gray-400 pb-1.5">
                90%-CI: [{prognose.ci_low}%, {prognose.ci_high}%]
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 mb-1">Monte Carlo Median</p>
            <p className="text-2xl font-bold text-blue-400">{monteCarlo?.median}%</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{(monteCarlo?.iterations || 0).toLocaleString()} Simulationen</p>
          </div>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full" style={{ width: `${prognose.score}%` }} />
        </div>
        <p className="text-[10px] text-gray-500">
          σ (Gesamtunsicherheit): {(prognose.sigma * 100).toFixed(1)} Prozentpunkte ·
          Argumente: {prognose.inputs.eigeneArgs} eigen / {prognose.inputs.gegnerArgs} Gegner ·
          Beweise: {prognose.inputs.beweise} ·
          Richter: {prognose.inputs.richterBekannt ? "bekannt" : "unbekannt"}
        </p>
      </div>

      {/* Aufklappbare Berechnungsschritte */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <button
          onClick={() => setShowPrognoseSteps(o => !o)}
          className="flex items-center justify-between w-full mb-1"
        >
          <h3 className="text-sm font-semibold text-gray-700">🧮 Berechnungsweg (Prognose)</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Bayesianisch + Log-Odds</span>
            {showPrognoseSteps ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>
        <p className="text-[10px] text-gray-400 mb-3">
          Formel: P_final = σ(logit(P_basis) + Σ Δ_i) · Klicke auf jeden Schritt für Details
        </p>
        {showPrognoseSteps && (
          <div className="space-y-2">
            {(prognose.steps || []).map((step, i) => (
              <PrognoseStepCard key={i} step={step} index={i} />
            ))}
          </div>
        )}
        {!showPrognoseSteps && (
          <div className="flex gap-1 flex-wrap">
            {(prognose.steps || []).map((s, i) => (
              <span key={i} className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{i + 1}. {s.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Break-Even */}
      {breakEven?.break_even_pct !== null && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-amber-800">💶 Break-Even-Analyse</h3>
            <span className="text-2xl font-bold text-amber-700">{breakEven.break_even_pct}%</span>
          </div>
          <p className="text-xs text-amber-700 mb-2">{breakEven.erklaerung}</p>
          <details className="group">
            <summary className="text-[10px] text-amber-600 cursor-pointer hover:text-amber-800">▶ Rechenweg anzeigen</summary>
            <div className="mt-2 bg-white border border-amber-200 rounded-lg p-3 space-y-1 text-[10px] font-mono text-gray-600">
              <p>Eigene Anwaltsgebühren: {breakEven.eigeneKosten?.toLocaleString("de-DE")}€</p>
              <p>Gegnerkosten (bei Verlust): {breakEven.gegnerKosten?.toLocaleString("de-DE")}€</p>
              <p>Gerichtskosten: {breakEven.gerichtkosten?.toLocaleString("de-DE")}€</p>
              {breakEven.svKosten > 0 && <p>SV-Kosten: {breakEven.svKosten?.toLocaleString("de-DE")}€</p>}
              <p className="border-t border-gray-200 pt-1 font-bold">{breakEven.formel}</p>
            </div>
          </details>
          <p className="text-xs text-amber-900 mt-2 font-medium">{breakEven.empfehlung}</p>
        </div>
      )}

      {/* Risikofaktoren */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">📊 Risikofaktoren (8 Dimensionen)</h3>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${AMPEL[risikofaktoren.gesamtrisiko]}`}>
              Gesamt: {risikofaktoren.gesamtrisiko?.toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">{risikofaktoren.gesamtScore}/10</span>
          </div>
        </div>

        {radarData.length > 0 && (
          <ResponsiveContainer width="100%" height={180} className="mb-4">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f3f4f6" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: "#9ca3af" }} />
              <Radar dataKey="A" stroke="#1f2937" fill="#1f2937" fillOpacity={0.12} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        )}

        <div className="space-y-2">
          {(risikofaktoren.faktoren || []).map(f => (
            <FaktorCard key={f.key} faktor={f} />
          ))}
        </div>
      </div>

      {/* Monte Carlo */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <button
          onClick={() => setShowMonteCarlo(o => !o)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-semibold text-gray-700">🎲 Monte-Carlo-Simulation</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{(monteCarlo?.iterations || 0).toLocaleString()} Iterationen</span>
            {showMonteCarlo ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        <div className="mt-3 grid grid-cols-5 gap-2 text-center">
          {[
            { label: "P10",    val: monteCarlo?.p10,    color: "text-red-600" },
            { label: "P25",    val: monteCarlo?.p25,    color: "text-amber-600" },
            { label: "Median", val: monteCarlo?.median, color: "text-blue-600" },
            { label: "P75",    val: monteCarlo?.p75,    color: "text-green-600" },
            { label: "P90",    val: monteCarlo?.p90,    color: "text-green-700" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2">
              <p className="text-[9px] text-gray-400 mb-0.5">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{val}%</p>
            </div>
          ))}
        </div>

        {showMonteCarlo && monteCarlo?.histogram && (
          <div className="mt-4">
            <p className="text-[10px] text-gray-400 mb-2">Wahrscheinlichkeitsverteilung (Histogramm)</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={monteCarlo.histogram} barSize={10}>
                <XAxis dataKey="bin" tick={{ fontSize: 8 }} interval={3} />
                <YAxis hide />
                <Tooltip formatter={(v) => [`${v} Fälle`, ""]} labelFormatter={(l) => `Bin: ${l}`} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {monteCarlo.histogram.map((d, i) => (
                    <Cell key={i} fill={d.pct < 0.3 ? "#ef4444" : d.pct < 0.5 ? "#f59e0b" : d.pct < 0.7 ? "#3b82f6" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Szenarien */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {szenarien.map(({ label, wert, color, erkl }) => (
            <div key={label} className="rounded-xl border p-3 text-center" style={{ borderColor: color + "40", backgroundColor: color + "10" }}>
              <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
              <p className="text-xl font-bold" style={{ color }}>{wert}%</p>
              <p className="text-[9px] text-gray-400 mt-1 leading-tight">{erkl}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
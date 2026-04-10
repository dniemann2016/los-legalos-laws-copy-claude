import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = [
  {
    key: "ki_strategie",
    label: "🤖 KI-Strategieanalyse (Tab 3 — KI-Berater)",
    desc: "War die strategische Empfehlung der KI zutreffend? Waren Druckmittel, Verhandlungstipps korrekt?",
    type: "ki",
  },
  {
    key: "ki_prognose",
    label: "📊 KI-Prognose (Monte Carlo / Tab 10)",
    desc: "Wie treffend war die KI-basierte Erfolgswahrscheinlichkeit im Vergleich zum tatsächlichen Ergebnis?",
    type: "ki",
  },
  {
    key: "ki_risiko",
    label: "⚠️ KI-Risikoanalyse (Tab 6)",
    desc: "Wurden Risiken korrekt erkannt und bewertet?",
    type: "ki",
  },
  {
    key: "ki_gegner",
    label: "🎭 KI-Gegneranalyse (Tab 3 — Muster)",
    desc: "Hat die KI das Verhalten der Gegenseite richtig eingeschätzt?",
    type: "ki",
  },
  {
    key: "ki_dokumente",
    label: "📄 KI-Dokumentenanalyse (Tab 1)",
    desc: "Wurden Argumente, Fristen und Personen korrekt aus Dokumenten extrahiert?",
    type: "ki",
  },
  {
    key: "human_argumente",
    label: "👤 Menschliche Argumentgewichtung",
    desc: "Wie gut haben Sie die Argumente und deren Stärken selbst eingeschätzt? Rückblickend — lagen Ihre Gewichtungen richtig?",
    type: "human",
  },
  {
    key: "human_strategie",
    label: "👤 Eigene strategische Entscheidungen",
    desc: "Waren die eigenen Strategieentscheidungen (Vergleichsangebote, Verhandlungslinie) korrekt?",
    type: "human",
  },
];

function StarRow({ value, onChange }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          className={`w-7 h-7 rounded-md text-xs font-bold transition-all border
            ${(hovered ?? value) >= n
              ? n <= 3 ? "bg-red-500 text-white border-red-500"
              : n <= 6 ? "bg-amber-400 text-white border-amber-400"
              : "bg-green-500 text-white border-green-500"
              : "bg-gray-100 text-gray-400 border-gray-200 hover:border-gray-300"}`}
        >
          {n}
        </button>
      ))}
      {value && (
        <span className="ml-2 text-xs text-gray-500 self-center">
          {value <= 3 ? "❌ Schlecht" : value <= 5 ? "⚠️ Mäßig" : value <= 7 ? "👍 Gut" : "✅ Sehr gut"}
        </span>
      )}
    </div>
  );
}

function FeedbackCard({ cat, caseId, existingLog, onSaved }) {
  const [rating, setRating] = useState(existingLog?.rating || null);
  const [feedback, setFeedback] = useState(existingLog?.feedback || "");
  const [showText, setShowText] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    if (existingLog?.id) {
      await base44.entities.KIUsageLog.update(existingLog.id, { rating, feedback, timestamp: new Date().toISOString() });
    } else {
      await base44.entities.KIUsageLog.create({
        case_id: caseId,
        context: cat.key,
        ki_function: cat.type === "ki" ? "KI-Analyse" : "Manuelle Einschätzung",
        input_summary: cat.label,
        output: cat.desc,
        rating,
        feedback,
        timestamp: new Date().toISOString(),
      });
    }
    setSaved(true);
    setSaving(false);
    onSaved();
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${cat.type === "ki" ? "bg-violet-50 border-violet-100" : "bg-blue-50 border-blue-100"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gray-800">{cat.label}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{cat.desc}</p>
        </div>
        {saved && <span className="text-[10px] text-green-600 font-semibold flex-shrink-0">✓ Gespeichert</span>}
      </div>
      <StarRow value={rating} onChange={setRating} />
      <div>
        <button
          onClick={() => setShowText(v => !v)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
        >
          {showText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showText ? "Text ausblenden" : "Detailliertes Feedback geben (optional)"}
        </button>
        {showText && (
          <textarea
            className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white resize-none"
            rows={3}
            placeholder={cat.type === "ki"
              ? "Was hat die KI falsch gemacht? Was wäre besser gewesen? Welche Information fehlte?"
              : "Wo lagen Sie selbst falsch? Was hätten Sie anders eingeschätzt?"}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
          />
        )}
      </div>
      {rating && (
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? "Speichern…" : "Bewertung speichern"}
        </button>
      )}
    </div>
  );
}

export default function KIFeedbackPanel({ caseId }) {
  const [logs, setLogs] = useState({});
  const [open, setOpen] = useState(true);

  const loadLogs = async () => {
    const existing = await base44.entities.KIUsageLog.filter({ case_id: caseId });
    const map = {};
    existing.forEach(l => { if (l.context) map[l.context] = l; });
    setLogs(map);
  };

  useEffect(() => { loadLogs(); }, [caseId]);

  const ratedCount = Object.keys(logs).filter(k => logs[k]?.rating).length;

  // Compute average KI rating for adjustment signal
  const kiRatings = CATEGORIES
    .filter(c => c.type === "ki" && logs[c.key]?.rating)
    .map(c => logs[c.key].rating);
  const avgKiRating = kiRatings.length ? Math.round(kiRatings.reduce((s, v) => s + v, 0) / kiRatings.length * 10) / 10 : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">⭐ KI- & Eigeneinschätzung bewerten</h3>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{ratedCount}/{CATEGORIES.length} bewertet</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <p className="text-[10px] text-gray-400 mb-4">Bewerte jede KI-Analyse und deine eigene Einschätzung auf einer Skala von 1–10. Die Bewertungen werden gespeichert und fließen in zukünftige Prognosen ein.</p>

      {avgKiRating !== null && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2
          ${avgKiRating >= 7 ? "bg-green-50 border border-green-200 text-green-800"
            : avgKiRating >= 5 ? "bg-amber-50 border border-amber-200 text-amber-800"
            : "bg-red-50 border border-red-200 text-red-800"}`}>
          <span className="text-lg">{avgKiRating >= 7 ? "✅" : avgKiRating >= 5 ? "⚠️" : "❌"}</span>
          <div>
            <p className="font-bold">Ø KI-Bewertung: {avgKiRating}/10</p>
            <p className="font-normal opacity-80">
              {avgKiRating >= 7 ? "KI-Analysen waren überwiegend zuverlässig — die Treffsicherheits-Schätzung wird erhöht."
                : avgKiRating >= 5 ? "KI-Analysen waren mäßig — mittlere Treffsicherheit angesetzt."
                : "KI-Analysen lagen häufig daneben — Treffsicherheit wird gesenkt, mehr manuelle Überprüfung empfohlen."}
            </p>
          </div>
        </div>
      )}

      {open && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">🤖 KI-Analysen</p>
          {CATEGORIES.filter(c => c.type === "ki").map(cat => (
            <FeedbackCard key={cat.key} cat={cat} caseId={caseId} existingLog={logs[cat.key]} onSaved={loadLogs} />
          ))}
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-4 pt-2 border-t border-gray-100">👤 Menschliche Einschätzung</p>
          {CATEGORIES.filter(c => c.type === "human").map(cat => (
            <FeedbackCard key={cat.key} cat={cat} caseId={caseId} existingLog={logs[cat.key]} onSaved={loadLogs} />
          ))}
        </div>
      )}
    </div>
  );
}

// Export helper for Tab10 to get the feedback-adjusted KI accuracy
export function useFeedbackAdjustedAccuracy(caseId, baseAccuracy) {
  const [adjusted, setAdjusted] = useState(baseAccuracy);

  useEffect(() => {
    base44.entities.KIUsageLog.filter({ case_id: caseId }).then(logs => {
      const kiLogs = logs.filter(l => l.context && l.rating &&
        ["ki_strategie", "ki_prognose", "ki_risiko", "ki_gegner", "ki_dokumente"].includes(l.context));
      if (kiLogs.length === 0) { setAdjusted(baseAccuracy); return; }
      const avg = kiLogs.reduce((s, l) => s + l.rating, 0) / kiLogs.length; // 1–10
      // Map avg 1–10 → multiplier 0.6–1.2
      const multiplier = 0.6 + (avg - 1) / 9 * 0.6;
      setAdjusted(Math.min(92, Math.max(20, Math.round(baseAccuracy * multiplier))));
    });
  }, [caseId, baseAccuracy]);

  return adjusted;
}
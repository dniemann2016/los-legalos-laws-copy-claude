import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertCircle, CheckCircle, Zap } from "lucide-react";

export default function AIPerformanceDashboard({ caseId }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [caseId]);

  const loadData = async () => {
    setLoading(true);
    const data = await base44.entities.AIPerformanceFeedback.filter({});
    setFeedbacks(data);
    calculateStats(data);
    setLoading(false);
  };

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const prognosisRatings = data.filter(d => d.prognose_rating).map(d => d.prognose_rating);
    const strategyRatings = data.filter(d => d.strategie_rating).map(d => d.strategie_rating);
    const beraterRatings = data.filter(d => d.ki_berater_rating).map(d => d.ki_berater_rating);
    const overallRatings = data.filter(d => d.gesamtbewertung).map(d => d.gesamtbewertung);

    const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
    const successRate = (data.filter(d => d.fall_erfolgreich).length / data.length * 100).toFixed(1);

    // Finde alle Verbesserungsvorschläge
    const allSuggestions = [];
    data.forEach(d => {
      if (d.verbesserungsvorschlaege?.length > 0) {
        allSuggestions.push(...d.verbesserungsvorschlaege);
      }
    });

    // Gruppiere nach Aspekt
    const suggestionsByAspect = {};
    allSuggestions.forEach(s => {
      if (!suggestionsByAspect[s.aspekt]) {
        suggestionsByAspect[s.aspekt] = [];
      }
      suggestionsByAspect[s.aspekt].push(s);
    });

    setStats({
      totalCases: data.length,
      prognosisAccuracy: avg(prognosisRatings),
      strategyEffectiveness: avg(strategyRatings),
      beraterQuality: avg(beraterRatings),
      overallScore: avg(overallRatings),
      successRate,
      topImprovements: Object.entries(suggestionsByAspect)
        .map(([aspect, suggestions]) => ({
          aspect,
          count: suggestions.length,
          suggestions
        }))
        .sort((a, b) => b.count - a.count),
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>;
  }

  if (!stats) {
    return (
      <div className="bg-gray-50 rounded-2xl border border-gray-100 py-12 text-center">
        <p className="text-gray-500">Noch keine KI-Bewertungen vorhanden</p>
      </div>
    );
  }

  const getColor = (score) => {
    if (score >= 4) return "bg-green-50 border-green-100 text-green-700";
    if (score >= 3) return "bg-yellow-50 border-yellow-100 text-yellow-700";
    return "bg-red-50 border-red-100 text-red-700";
  };

  const getIcon = (score) => {
    if (score >= 4) return <CheckCircle className="w-4 h-4" />;
    if (score >= 3) return <AlertCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prognose-Genauigkeit */}
        <div className={`rounded-2xl border p-5 ${getColor(stats.prognosisAccuracy)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wide">Prognose-Genauigkeit</p>
              <p className="text-2xl font-bold mt-2">{stats.prognosisAccuracy}/5</p>
            </div>
            {getIcon(stats.prognosisAccuracy)}
          </div>
          <p className="text-xs opacity-75 mt-3">Basierend auf {stats.totalCases} Fällen</p>
        </div>

        {/* Strategie-Effektivität */}
        <div className={`rounded-2xl border p-5 ${getColor(stats.strategyEffectiveness)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wide">Strategie-Effektivität</p>
              <p className="text-2xl font-bold mt-2">{stats.strategyEffectiveness}/5</p>
            </div>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs opacity-75 mt-3">Qualität der Strategieempfehlungen</p>
        </div>

        {/* KI-Berater Qualität */}
        <div className={`rounded-2xl border p-5 ${getColor(stats.beraterQuality)}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wide">KI-Berater Qualität</p>
              <p className="text-2xl font-bold mt-2">{stats.beraterQuality}/5</p>
            </div>
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-xs opacity-75 mt-3">Hilfreiche & akkurate Analysen</p>
        </div>

        {/* Erfolgsquote */}
        <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold opacity-75 uppercase tracking-wide">Fallausgänge erfolgreich</p>
              <p className="text-2xl font-bold mt-2">{stats.successRate}%</p>
            </div>
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-xs opacity-75 mt-3">{Math.round(stats.totalCases * stats.successRate / 100)} von {stats.totalCases} Fällen</p>
        </div>
      </div>

      {/* Gesamtbewertung */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">📊 Gesamtbewertung</h3>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-gray-900">{stats.overallScore}</div>
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  stats.overallScore >= 4 ? 'bg-green-500' : 
                  stats.overallScore >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${(stats.overallScore / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {stats.overallScore >= 4 ? "Ausgezeichnete Performance" :
               stats.overallScore >= 3 ? "Gute Performance, Optimierung möglich" :
               "Verbesserungen dringend erforderlich"}
            </p>
          </div>
        </div>
      </div>

      {/* Top Verbesserungsvorschläge */}
      {stats.topImprovements.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">💡 Häufigste Verbesserungsbedarfe</h3>
          <div className="space-y-3">
            {stats.topImprovements.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-semibold">
                  {item.count}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 capitalize">{item.aspect.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.suggestions.slice(0, 2).map(s => s.problem).join(", ")}
                    {item.suggestions.length > 2 ? "..." : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Korrektur Empfehlungen */}
      {stats.overallScore < 4 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm font-semibold text-amber-900 mb-3">🔧 Automatische Verbesserungsempfehlungen</p>
          <ul className="space-y-2 text-xs text-amber-800">
            {stats.prognosisAccuracy < 3 && (
              <li>• Prognosen überprüfen: Zu {stats.prognosisAccuracy < 2 ? 'pessimistisch' : 'optimistisch'} – Kalibrierung empfohlen</li>
            )}
            {stats.strategyEffectiveness < 3 && (
              <li>• Strategieanalyse verstärken: Mehr alternative Taktiken erwägen</li>
            )}
            {stats.beraterQuality < 3 && (
              <li>• KI-Berater Prompts optimieren: Spezifischere Fallanalysen trainieren</li>
            )}
            {stats.successRate < 60 && (
              <li>• Fallauswahl überprüfen: Bessere Erfolgs-Risiko-Balance anstreben</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
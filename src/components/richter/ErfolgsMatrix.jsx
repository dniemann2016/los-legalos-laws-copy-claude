import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

export default function ErfolgsMatrix({ profile, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const matrix = profile.erfolgs_matrix;

  const runAnalysis = async () => {
    setLoading(true);
    const erfahrungen = profile.erfahrungen || [];
    const avgVergleich = erfahrungen.length > 0
      ? erfahrungen.reduce((s, e) => s + (e.vergleichsbereitschaft || 5), 0) / erfahrungen.length
      : 5;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein juristischer Datenanalyst. Berechne für dieses Profil die optimale Prozessstrategie.

PROFIL:
Name: ${profile.name}
Kategorie: ${profile.kategorie || "Richter"}
Gericht/Institution: ${profile.gericht}
Klägerquote/Erfolgsquote: ${profile.klaeger_rate || 50}%
Vergleichsrate: ${profile.vergleich_rate || 30}%
Ø Dauer: ${profile.durchschnitt_dauer_monate || 12} Monate
Verhandlungsstil: ${profile.stil || "Neutral"}
Ø Vergleichsbereitschaft (Kanzleierfahrungen): ${avgVergleich.toFixed(1)}/10
Erfahrungen: ${erfahrungen.length} dokumentiert

Berechne:
1. Erfolgswahrscheinlichkeit bei Strategie "Urteil anstreben" (0-100%)
2. Erfolgswahrscheinlichkeit bei Strategie "Vergleich anstreben" (0-100%)
3. Erwarteter Zeitvorteil Vergleich vs. Urteil (in Monaten)
4. Kostenvorteil Vergleich vs. Urteil (geschätzt als Index 0-100)
5. Empfehlung welche Strategie optimal ist und warum
6. Bewertung in 5 Dimensionen (je 0-100): Zeiteffizienz, Kosteneffizienz, Erfolgsaussicht, Risiko, Kontrolle`,
      response_json_schema: {
        type: "object",
        properties: {
          urteil_erfolg: { type: "number" },
          vergleich_erfolg: { type: "number" },
          zeitvorteil_monate: { type: "number" },
          kosten_index_urteil: { type: "number" },
          kosten_index_vergleich: { type: "number" },
          empfehlung: { type: "string", enum: ["Urteil", "Vergleich", "Situationsabhängig"] },
          begruendung: { type: "string" },
          radar_urteil: {
            type: "object",
            properties: {
              zeiteffizienz: { type: "number" },
              kosteneffizienz: { type: "number" },
              erfolgsaussicht: { type: "number" },
              risiko: { type: "number" },
              kontrolle: { type: "number" }
            }
          },
          radar_vergleich: {
            type: "object",
            properties: {
              zeiteffizienz: { type: "number" },
              kosteneffizienz: { type: "number" },
              erfolgsaussicht: { type: "number" },
              risiko: { type: "number" },
              kontrolle: { type: "number" }
            }
          }
        }
      }
    });

    if (res) {
      const updated = await base44.entities.JudgeProfile.update(profile.id, {
        erfolgs_matrix: { ...res, berechnet: new Date().toISOString() }
      });
      onUpdate(updated);
    }
    setLoading(false);
  };

  const barData = matrix ? [
    { name: "Erfolgswahrscheinlichkeit %", Urteil: matrix.urteil_erfolg, Vergleich: matrix.vergleich_erfolg },
    { name: "Kosteneffizienz (Index)", Urteil: matrix.kosten_index_urteil, Vergleich: matrix.kosten_index_vergleich },
  ] : [];

  const radarData = matrix ? [
    { dimension: "Zeiteffizienz", Urteil: matrix.radar_urteil?.zeiteffizienz || 0, Vergleich: matrix.radar_vergleich?.zeiteffizienz || 0 },
    { dimension: "Kosten", Urteil: matrix.radar_urteil?.kosteneffizienz || 0, Vergleich: matrix.radar_vergleich?.kosteneffizienz || 0 },
    { dimension: "Erfolg", Urteil: matrix.radar_urteil?.erfolgsaussicht || 0, Vergleich: matrix.radar_vergleich?.erfolgsaussicht || 0 },
    { dimension: "Risikoarm", Urteil: matrix.radar_urteil?.risiko || 0, Vergleich: matrix.radar_vergleich?.risiko || 0 },
    { dimension: "Kontrolle", Urteil: matrix.radar_urteil?.kontrolle || 0, Vergleich: matrix.radar_vergleich?.kontrolle || 0 },
  ] : [];

  const EMPF_COLOR = { Urteil: "bg-blue-900 text-white", Vergleich: "bg-purple-900 text-white", Situationsabhängig: "bg-amber-700 text-white" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Erfolgswahrscheinlichkeits-Matrix
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Vergleich vs. Urteil — KI-basierte Strategiebewertung</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="bg-gray-900 text-white rounded-xl text-xs h-8 gap-1.5">
          {loading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Berechne...</> : <><TrendingUp className="w-3.5 h-3.5" /> {matrix ? "Neu berechnen" : "Berechnen"}</>}
        </Button>
      </div>

      {!matrix && !loading && (
        <p className="text-sm text-gray-400 text-center py-8">
          Klicken Sie auf „Berechnen" um die KI-Strategiematrix zu erstellen.
        </p>
      )}

      {matrix && (
        <>
          {/* Empfehlung */}
          <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${EMPF_COLOR[matrix.empfehlung] || "bg-gray-900 text-white"}`}>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Optimale Strategie</p>
              <p className="text-lg font-black">{matrix.empfehlung}</p>
              {matrix.begruendung && <p className="text-xs opacity-80 mt-1">{matrix.begruendung}</p>}
            </div>
            {matrix.zeitvorteil_monate > 0 && (
              <div className="text-center flex-shrink-0">
                <p className="text-2xl font-black">{matrix.zeitvorteil_monate}</p>
                <p className="text-[9px] opacity-70">Mo. schneller<br/>per Vergleich</p>
              </div>
            )}
          </div>

          {/* Vergleichsbars */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Urteil anstreben", value: matrix.urteil_erfolg, color: "bg-blue-500" },
              { label: "Vergleich anstreben", value: matrix.vergleich_erfolg, color: "bg-purple-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-gray-900">{value}%</p>
                <p className="text-[10px] text-gray-500 mb-2">{label}</p>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Direktvergleich</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Urteil" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Vergleich" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">5-Dimensionen-Analyse</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                <Radar name="Urteil" dataKey="Urteil" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Radar name="Vergleich" dataKey="Vergleich" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {matrix.berechnet && (
            <p className="text-[10px] text-gray-400 text-right">Berechnet: {new Date(matrix.berechnet).toLocaleString("de-DE")}</p>
          )}
        </>
      )}
    </div>
  );
}
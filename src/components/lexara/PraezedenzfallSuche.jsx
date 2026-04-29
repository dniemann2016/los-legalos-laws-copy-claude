import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, RefreshCw, BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PraezedenzfallSuche({ caseId, caseData, onImport }) {
  const [results, setResults] = useState([]);
  const [paragraphen, setParagraphen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [imported, setImported] = useState({});
  const [importingId, setImportingId] = useState(null);
  const [searched, setSearched] = useState(false);
  const [customQuery, setCustomQuery] = useState("");

  const rechtsgebiet = caseData?.rechtsgebiet || "";
  const rechtsfrage = caseData?.zentrale_rechtsfrage || "";
  const instanz = caseData?.instanz || "";
  const gericht = caseData?.gericht || "";

  const search = async (query) => {
    setLoading(true);
    setResults([]);
    setParagraphen([]);
    setSearched(false);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein erfahrener Fachanwalt und recherchierst Rechtsprechung und einschlägige Normen für deinen Mandanten. Sprich direkt wie ein Anwalt — keine akademischen Einleitungen, klare Aussagen.

Recherchiere für folgenden Fall:

Rechtsgebiet: ${rechtsgebiet}
Instanz: ${instanz}
Gericht: ${gericht}
Zentrale Rechtsfrage: ${rechtsfrage}
${query ? `\nZusätzliche Suchanfrage: ${query}` : ""}

AUFGABE 1 — EINSCHLÄGIGE PARAGRAPHEN:
Identifiziere die 4-7 wichtigsten Rechtsnormen (§§) die auf diesen Fall direkt anwendbar sind. Für jede Norm erkläre in 1-2 Sätzen als Anwalt WARUM genau diese Norm hier greift — nicht abstrakt, sondern bezogen auf den konkreten Sachverhalt.

AUFGABE 2 — PRÄZEDENZFÄLLE:
Finde 5-8 konkrete, gut belegbare Urteile (BGH, OLG, BVerfG, EuGH wenn relevant). Bevorzuge Urteile der letzten 10 Jahre, beachte auch ältere Leitentscheidungen.

Für jedes Urteil: Aktenzeichen, Gericht, Datum, Leitsatz, Relevanz, ob es uns oder den Gegner stärkt, Stärke 1-10, welche Argumenttypen es stützt.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            paragraphen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  norm: { type: "string" },
                  gesetz: { type: "string" },
                  titel: { type: "string" },
                  warum_relevant: { type: "string" },
                  bedeutung: { type: "string", enum: ["stärkt_uns", "gefährdet_uns", "neutral"] }
                }
              }
            },
            urteile: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  aktenzeichen: { type: "string" },
                  gericht: { type: "string" },
                  datum: { type: "string" },
                  leitsatz: { type: "string" },
                  relevanz_erklaerung: { type: "string" },
                  seite: { type: "string", enum: ["eigen", "gegner", "neutral"] },
                  staerke: { type: "number" },
                  argument_typ: { type: "string" },
                  volltext_url: { type: "string" },
                  schluesselwoerter: { type: "array", items: { type: "string" } }
                }
              }
            },
            suchstrategie: { type: "string" },
            lucken_hinweis: { type: "string" }
          }
        },
        model: "gemini_3_flash"
      });
      setResults(result.urteile || []);
      setParagraphen(result.paragraphen || []);
      setSearched(true);
      if (result.suchstrategie) setSuchInfo({ strategie: result.suchstrategie, luecke: result.lucken_hinweis });
    } catch (e) {
      alert("Suche fehlgeschlagen: " + e.message);
    }
    setLoading(false);
  };

  const [suchInfo, setSuchInfo] = useState(null);

  const importAsArgument = async (urteil, idx) => {
    setImportingId(idx);
    await base44.entities.Argument.create({
      case_id: caseId,
      title: `Präzedenzfall: ${urteil.aktenzeichen}`,
      description: `${urteil.leitsatz}\n\nGericht: ${urteil.gericht} | Datum: ${urteil.datum}\n\nRelevanz: ${urteil.relevanz_erklaerung}\n\n[🔍 Automatisch gefunden via Präzedenzfall-Suche]`,
      side: urteil.seite === "gegner" ? "gegner" : "eigen",
      strength: Math.round(urteil.staerke || 6),
      type: "Rechtsprechung",
      paragraphs: [urteil.aktenzeichen],
    });
    setImported(prev => ({ ...prev, [idx]: "argument" }));
    setImportingId(null);
    onImport && onImport();
  };

  const importAsEvidence = async (urteil, idx) => {
    setImportingId(idx + "_ev");
    await base44.entities.Evidence.create({
      case_id: caseId,
      title: `Urteil: ${urteil.aktenzeichen}`,
      description: `${urteil.leitsatz}\n\nGericht: ${urteil.gericht} | Datum: ${urteil.datum}\n\nRelevanz: ${urteil.relevanz_erklaerung}\n\n[🔍 Automatisch gefunden via Präzedenzfall-Suche]`,
      type: "Rechtsprechung",
      weight: Math.round(urteil.staerke || 6),
      source: `${urteil.gericht}, ${urteil.datum}`,
    });
    setImported(prev => ({ ...prev, [idx + "_ev"]: "beweis" }));
    setImportingId(null);
    onImport && onImport();
  };

  const SEITE_CONFIG = {
    eigen: { label: "Stärkt uns", color: "bg-green-100 text-green-700 border-green-200" },
    gegner: { label: "Gegner-Vorteil", color: "bg-red-100 text-red-700 border-red-200" },
    neutral: { label: "Neutral", color: "bg-gray-100 text-gray-600 border-gray-200" },
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-900">Automatische Präzedenzfall-Suche</p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Sucht nach aktuellen Urteilen basierend auf:
              {rechtsgebiet && <> <strong>{rechtsgebiet}</strong></>}
              {rechtsfrage && <> · {rechtsfrage.slice(0, 80)}{rechtsfrage.length > 80 ? "…" : ""}</>}
            </p>
            {(!rechtsgebiet && !rechtsfrage) && (
              <p className="text-[11px] text-amber-700 mt-1">⚠️ Ergänze Rechtsgebiet und zentrale Rechtsfrage in den Basisdaten für bessere Ergebnisse.</p>
            )}
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs"
            placeholder="Optionale Verfeinerung (z.B. 'Schadensersatz Werkvertrag 2023')"
            value={customQuery}
            onChange={e => setCustomQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search(customQuery)}
          />
          <Button onClick={() => search(customQuery)} disabled={loading} className="bg-gray-900 text-white text-xs gap-1.5">
            {loading ? <><RefreshCw className="w-3 h-3 animate-spin" /> Suche…</> : <><Search className="w-3 h-3" /> Suchen</>}
          </Button>
        </div>
        {!searched && !loading && (
          <div className="flex gap-2 flex-wrap">
            <p className="text-[10px] text-gray-400 w-full">Schnellsuche:</p>
            {[
              "aktuelle BGH-Urteile",
              "OLG-Entscheidungen 2023-2024",
              "EuGH-Rechtsprechung",
              "Leitentscheidungen"
            ].map(q => (
              <button key={q} onClick={() => { setCustomQuery(q); search(q); }}
                className="text-[10px] px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-600 font-medium">Durchsuche aktuelle Rechtsprechung…</p>
          <p className="text-xs text-gray-400">KI recherchiert Urteile mit Internetzugang (30–60s)</p>
        </div>
      )}

      {suchInfo && searched && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suchstrategie</p>
          <p className="text-xs text-gray-600">{suchInfo.strategie}</p>
          {suchInfo.luecke && <p className="text-[10px] text-amber-600">⚠️ {suchInfo.luecke}</p>}
        </div>
      )}

      {/* Paragraphen-Sektion — erscheint ÜBER den Urteilen */}
      {paragraphen.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚖️</span>
            <div>
              <p className="text-xs font-bold text-blue-900">Einschlägige Rechtsnormen</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Die KI hat diese §§ speziell für diesen Fall identifiziert — mit anwaltlicher Begründung warum sie hier greifen</p>
            </div>
          </div>
          <div className="space-y-2">
            {paragraphen.map((p, i) => {
              const bdColor = p.bedeutung === "stärkt_uns"
                ? "border-green-200 bg-green-50"
                : p.bedeutung === "gefährdet_uns"
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50";
              const tagColor = p.bedeutung === "stärkt_uns"
                ? "bg-green-100 text-green-700"
                : p.bedeutung === "gefährdet_uns"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-500";
              const tagLabel = p.bedeutung === "stärkt_uns" ? "stärkt uns" : p.bedeutung === "gefährdet_uns" ? "Risiko" : "neutral";
              return (
                <div key={i} className={`rounded-lg border p-3 ${bdColor}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono font-bold text-blue-800 flex-shrink-0 pt-0.5 min-w-[90px]">{p.norm} {p.gesetz}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {p.titel && <span className="text-xs font-semibold text-gray-800">{p.titel}</span>}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${tagColor}`}>{tagLabel}</span>
                      </div>
                      <p className="text-[11px] text-gray-700 leading-relaxed">{p.warum_relevant}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{results.length} Präzedenzfälle gefunden</p>
          {results.map((urteil, idx) => {
            const seite = SEITE_CONFIG[urteil.seite] || SEITE_CONFIG.neutral;
            const isExpanded = expanded === idx;
            const importedArg = imported[idx];
            const importedEv = imported[idx + "_ev"];
            return (
              <div key={idx} className={`bg-white rounded-xl border overflow-hidden transition-all ${urteil.seite === "eigen" ? "border-green-200" : urteil.seite === "gegner" ? "border-red-200" : "border-gray-200"}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${seite.color}`}>{seite.label}</span>
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">{urteil.gericht}</span>
                        {urteil.datum && <span className="text-[9px] text-gray-400">{urteil.datum}</span>}
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i < Math.round((urteil.staerke || 5) / 2) ? "bg-gray-800" : "bg-gray-200"}`} />
                          ))}
                          <span className="text-[9px] text-gray-400 ml-1">{urteil.staerke}/10</span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-gray-900">{urteil.aktenzeichen}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{urteil.leitsatz}</p>
                    </div>
                    <button onClick={() => setExpanded(isExpanded ? null : idx)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Relevanz für diesen Fall</p>
                        <p className="text-xs text-gray-700">{urteil.relevanz_erklaerung}</p>
                      </div>
                      {urteil.argument_typ && (
                        <p className="text-[10px] text-blue-600">📋 Unterstützt: {urteil.argument_typ}</p>
                      )}
                      {urteil.schluesselwoerter?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {urteil.schluesselwoerter.map((k, ki) => (
                            <span key={ki} className="text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{k}</span>
                          ))}
                        </div>
                      )}
                      {urteil.volltext_url && urteil.volltext_url !== "nicht verfügbar" && (
                        <a href={urteil.volltext_url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline block">🔗 Volltext ansehen</a>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    {importedArg ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Als Argument übernommen
                      </span>
                    ) : (
                      <button
                        onClick={() => importAsArgument(urteil, idx)}
                        disabled={importingId === idx}
                        className="flex items-center gap-1 text-[10px] bg-gray-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" /> {importingId === idx ? "Wird importiert…" : "Als Argument"}
                      </button>
                    )}
                    {importedEv ? (
                      <span className="flex items-center gap-1 text-[10px] text-blue-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Als Beweis übernommen
                      </span>
                    ) : (
                      <button
                        onClick={() => importAsEvidence(urteil, idx)}
                        disabled={importingId === idx + "_ev"}
                        className="flex items-center gap-1 text-[10px] border border-blue-300 text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" /> {importingId === idx + "_ev" ? "Wird importiert…" : "Als Beweis"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-xs text-gray-400">
          Keine Präzedenzfälle gefunden. Versuche eine spezifischere Suchanfrage.
        </div>
      )}
    </div>
  );
}
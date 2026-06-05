import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ComplianceStatusBadge from "./ComplianceStatusBadge";
import { Plus, Trash2, ChevronDown, ChevronUp, Sparkles, RefreshCw, Pencil, Check, AlertTriangle, Link } from "lucide-react";
import { Button } from "@/components/ui/button";

const PARAGRAPHEN_REFERENZ = {
  "Zivilrecht (ZPO / BGB)": [
    { para: "§ 286 ZPO", titel: "Freie Beweiswürdigung", beschreibung: "Das Gericht entscheidet nach freier Überzeugung, ob eine Tatsache als bewiesen gilt." },
    { para: "§ 415 ZPO", titel: "Öffentliche Urkunden", beschreibung: "Volle Beweiskraft für den beurkundeten Vorgang (z.B. notarielle Akte, Behördenakte)." },
    { para: "§ 416 ZPO", titel: "Private Urkunden", beschreibung: "Beweis dafür, dass die enthaltenen Erklärungen vom Aussteller abgegeben wurden." },
    { para: "§ 371 ZPO", titel: "Augenscheinsbeweis", beschreibung: "Unmittelbare Wahrnehmung durch das Gericht (Fotos, Videos, Objekte)." },
    { para: "§ 373 ZPO", titel: "Zeugenbeweis", beschreibung: "Antrag auf Vernehmung benannter Zeugen; Glaubwürdigkeit ist gerichtlich zu würdigen." },
    { para: "§ 402 ZPO", titel: "Sachverständigenbeweis", beschreibung: "Gutachter mit besonderem Fachwissen; gerichtlich bestellt oder privat." },
    { para: "§ 445 ZPO", titel: "Parteivernehmung", beschreibung: "Vernehmung der Partei selbst; subsidiär, wenn andere Beweise fehlen." },
    { para: "§ 253 BGB", titel: "Immaterieller Schaden / Schmerzensgeld", beschreibung: "Geldentschädigung für nichtvermögensrechtliche Schäden (z.B. Körperverletzung)." },
    { para: "§ 249 BGB", titel: "Art und Umfang des Schadenersatzes", beschreibung: "Naturalrestitution als Grundprinzip; Geldersatz wenn Naturalrestitution unmöglich." },
    { para: "§ 280 BGB", titel: "Schadensersatz wegen Pflichtverletzung", beschreibung: "Schuldner haftet bei Verletzung einer Pflicht aus dem Schuldverhältnis." },
  ],
  "Öffentliches Recht (VwGO / GG)": [
    { para: "§ 86 VwGO", titel: "Untersuchungsgrundsatz", beschreibung: "Gericht erforscht den Sachverhalt von Amts wegen; Beweiserhebung auf Antrag oder von Amts wegen." },
    { para: "§ 98 VwGO", titel: "Anwendung der ZPO-Beweisregeln", beschreibung: "Im Verwaltungsprozess gelten die §§ 358–444 ZPO entsprechend." },
    { para: "Art. 19 Abs. 4 GG", titel: "Rechtsschutzgarantie", beschreibung: "Effektiver Rechtsschutz gegen Akte der öffentlichen Gewalt." },
    { para: "Art. 20 Abs. 3 GG", titel: "Rechtsstaatsprinzip", beschreibung: "Bindung der Verwaltung an Gesetz und Recht; Grundlage der Beweisführung im ÖR." },
    { para: "§ 108 VwGO", titel: "Freie Beweiswürdigung (VwGO)", beschreibung: "Richter entscheidet nach seiner freien, aus dem Gesamtergebnis gewonnenen Überzeugung." },
    { para: "§ 74 VwGO", titel: "Klagefrist", beschreibung: "Anfechtungsklage innerhalb eines Monats nach Bekanntgabe; Fristdokumente als Beweise kritisch." },
    { para: "§ 80 VwGO", titel: "Aufschiebende Wirkung", beschreibung: "Widerspruch und Anfechtungsklage haben grds. aufschiebende Wirkung; einstweiliger Rechtsschutz." },
  ],
  "Strafrecht (StPO / StGB)": [
    { para: "§ 261 StPO", titel: "Freie Beweiswürdigung (StPO)", beschreibung: "Gericht entscheidet nach seiner freien, aus dem Inbegriff der Hauptverhandlung geschöpften Überzeugung." },
    { para: "§ 244 StPO", titel: "Beweisantragsrecht", beschreibung: "Recht des Angeklagten, Beweisanträge zu stellen; Ablehnung nur aus gesetzlichen Gründen." },
    { para: "§ 136a StPO", titel: "Verbotene Vernehmungsmethoden", beschreibung: "Aussagen unter Zwang, Täuschung oder Drohung sind unverwertbar – Beweisverwertungsverbot." },
    { para: "§ 252 StPO", titel: "Verwertungsverbot bei Zeugnisverweigerung", beschreibung: "Vernehmungsprotokoll über frühere Aussage nicht verwertbar, wenn Zeuge sein Recht ausübt." },
    { para: "§ 100a StPO", titel: "Telekommunikationsüberwachung", beschreibung: "TKÜ-Protokolle als Beweismittel; nur bei richterlicher Anordnung verwertbar." },
    { para: "§ 94 StPO", titel: "Sicherstellung / Beschlagnahme", beschreibung: "Gegenstände als Beweismittel sicherstellen; Verwertbarkeit abhängig von Rechtmäßigkeit." },
    { para: "§ 170 StPO", titel: "Einstellung des Verfahrens", beschreibung: "Anklageschrift oder Einstellung – Beweislage entscheidet über Anklageerhebung." },
    { para: "§ 46 StGB", titel: "Strafzumessung", beschreibung: "Beweise zur Tatschwere, Schuld, Vorleben des Täters sind strafzumessungsrelevant." },
  ],
};

const BEWEIS_TYPES = ["Gesetzliche Grundlage / Normtext","BGH/BVerfG Entscheidung (einschlägig)","Notarielle Beurkundung","Öffentliche Urkunde §415 ZPO","BGH-Entscheidung (übertragbar)","Gerichtliches SV-Gutachten","OLG-Entscheidung (gleiches BL)","Private Urkunde §416 ZPO","Augenscheinsbeweis","Privates SV-Gutachten","E-Mail / elektronisch","Zeuge (unabhängig)","LG-Entscheidung","Parteivernehmung §445 ZPO","Zeuge (parteinah)","Indizien (kumulativ)","Negative Tatsache"];
const WEIGHTS = {"Gesetzliche Grundlage / Normtext":10,"BGH/BVerfG Entscheidung (einschlägig)":9.5,"Notarielle Beurkundung":9.5,"Öffentliche Urkunde §415 ZPO":9,"BGH-Entscheidung (übertragbar)":8.5,"Gerichtliches SV-Gutachten":8.5,"OLG-Entscheidung (gleiches BL)":7.5,"Private Urkunde §416 ZPO":7.5,"Augenscheinsbeweis":7,"Privates SV-Gutachten":6.5,"E-Mail / elektronisch":6,"Zeuge (unabhängig)":6,"LG-Entscheidung":5,"Parteivernehmung §445 ZPO":4,"Zeuge (parteinah)":3.5,"Indizien (kumulativ)":3.5,"Negative Tatsache":3};

function ScoreBar({ value, max = 10, color = "bg-green-500" }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${((value || 0) / max) * 100}%` }} />
    </div>
  );
}

function EvidenceCard({ ev, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: ev.title, description: ev.description || "", type: ev.type || BEWEIS_TYPES[0], source: ev.source || "", weight: ev.weight || 5, datum: ev.datum || "" });
  const [newPara, setNewPara] = useState("");
  const [paragraphen, setParagraphen] = useState(() => {
    // Paragraphen werden im description-Feld als "[§§: ...]" gespeichert
    const match = (ev.description || "").match(/\[§§: ([^\]]+)\]/);
    return match ? match[1].split(", ").filter(Boolean) : [];
  });
  const [kiWeighting, setKiWeighting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [erschuetterung, setErschuetterung] = useState(null);
  const [erschLoading, setErschLoading] = useState(false);

  const discrepancy = ev.ki_weight !== undefined && ev.ki_weight !== null
    ? Math.abs((ev.weight || 5) - ev.ki_weight)
    : 0;
  const hasDiscrepancy = discrepancy >= 2;

  const addParagraph = () => {
    if (!newPara.trim()) return;
    setParagraphen(p => [...p, newPara.trim()]);
    setNewPara("");
  };

  const removeParagraph = (i) => setParagraphen(p => p.filter((_, j) => j !== i));

  const save = async () => {
    // Paragraphen in die description einbetten (als Anhang)
    let desc = form.description.replace(/\s*\[§§: [^\]]*\]/, "").trim();
    if (paragraphen.length > 0) desc = desc + (desc ? " " : "") + `[§§: ${paragraphen.join(", ")}]`;
    await base44.entities.Evidence.update(ev.id, { ...form, description: desc });
    setEditing(false);
    onSave();
  };

  const kiWeight = async () => {
    setKiWeighting(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Rechtsanwalt. Bewerte die Beweiskraft dieses Beweismittels im deutschen Zivilprozess.\nTitel: "${ev.title}"\nTyp: "${ev.type || ""}"\nBeschreibung: "${ev.description || ""}"\n\nGib ein Gewicht (0-10) UND eine juristische Begründung (2-3 Sätze) zurück, warum dieser Beweis diese Beweiskraft hat.`,
      response_json_schema: {
        type: "object",
        properties: {
          gewicht: { type: "number", minimum: 0, maximum: 10 },
          begruendung: { type: "string" }
        }
      }
    });
    if (result && result.gewicht !== undefined) {
      await base44.entities.Evidence.update(ev.id, {
        ki_weight: Math.min(10, Math.max(0, result.gewicht)),
        ki_reasoning: result.begruendung || ""
      });
      onSave();
    }
    setKiWeighting(false);
  };

  const analyzeDiscrepancy = async () => {
    setAnalyzing(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysiere die Diskrepanz zwischen manueller und KI-Bewertung dieses Beweismittels:\n\nBeweis: "${ev.title}"\nTyp: "${ev.type || ""}"\nBeschreibung: "${ev.description || ""}"\nManuelles Gewicht: ${ev.weight || 5}/10\nKI-Gewicht: ${ev.ki_weight}/10\nDiskrepanz: ${discrepancy.toFixed(1)} Punkte\n\nErkläre warum die Bewertungen abweichen und mache 3 konkrete Verbesserungsvorschläge, um den Beweiswert zu stärken.`,
      response_json_schema: {
        type: "object",
        properties: {
          erklaerung: { type: "string" },
          vorschlaege: { type: "array", items: { type: "string" } }
        }
      }
    });
    setAnalysis(res);
    setAnalyzing(false);
  };

  const analyzeErschuetterung = async () => {
    setErschLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Prozessrechtler. Analysiere, wie leicht die Gegenseite diesen Beweis erschüttern kann.

Beweis: "${ev.title}"
Typ: "${ev.type || ""}"
Beschreibung: "${ev.description || ""}"
Beweiskraft: ${ev.weight || 5}/10

Analysiere:
1. ERSCHÜTTERBARKEIT: Wie leicht ist dieser Beweis angreifbar? (gering/mittel/hoch/sehr hoch)
2. MITTEL DER GEGENSEITE: Mit welchen konkreten juristischen Mitteln kann der Gegner diesen Beweis erschüttern? (3–4 Punkte)
3. AUFWAND FÜR GEGNER: Wie viel Ressourcen muss die Gegenseite investieren? (gering/mittel/erheblich)
4. ERFOLGSAUSSICHT DES ANGRIFFS: Wie hoch ist die Chance, dass der Angriff gelingt? (0–100%)
5. GEGENMASSNAHMEN: Was können wir tun, um diesen Beweis widerstandsfähiger zu machen? (3 Punkte)`,
      response_json_schema: {
        type: "object",
        properties: {
          erschuetterbarkeit: { type: "string" },
          mittel_der_gegenseite: { type: "array", items: { type: "string" } },
          aufwand_gegner: { type: "string" },
          erfolgsaussicht_angriff_pct: { type: "number" },
          gegenmassnahmen: { type: "array", items: { type: "string" } }
        }
      }
    });
    setErschuetterung(res);
    setErschLoading(false);
  };

  return (
    <div className="relative group">
      <div className="absolute -left-6 top-2 w-4 h-4 border-2 border-gray-800 rounded-full bg-white flex items-center justify-center">
        <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
      </div>
      <div className="bg-gray-50 rounded-xl p-3">
        {editing ? (
          <div className="space-y-2">
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titel *" />
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Beschreibung" />
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {BEWEIS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Quelle" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Datum des Beweises</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Manuelles Gewicht:</span>
              <input type="number" min={0} max={10} step={0.5} className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-16 bg-white" value={form.weight} onChange={e => setForm({ ...form, weight: +e.target.value })} />
            </div>
            {/* Paragraphen */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Paragraphen / Normen</label>
              <div className="flex gap-1 mb-1 flex-wrap">
                {paragraphen.map((p, i) => (
                  <span key={i} className="flex items-center gap-1 text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">
                    {p}<button onClick={() => removeParagraph(i)} className="text-blue-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white" placeholder="z.B. § 286 ZPO" value={newPara} onChange={e => setNewPara(e.target.value)} onKeyDown={e => e.key === "Enter" && addParagraph()} />
                <button onClick={addParagraph} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+</button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} className="bg-gray-900 text-white rounded-lg text-xs gap-1"><Check className="w-3 h-3" /> Speichern</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="rounded-lg text-xs">Abbrechen</Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs">📄</span>
                  <span className="font-medium text-sm text-gray-900">{ev.title}</span>
                  {hasDiscrepancy && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Δ {discrepancy.toFixed(1)}
                    </span>
                  )}
                  <ComplianceStatusBadge item={ev} type="evidence" />
                </div>
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">Manuell</span>
                    <div className="flex-1"><ScoreBar value={ev.weight || 5} color="bg-blue-500" /></div>
                    <span className="text-xs font-semibold text-blue-600 w-8 text-right">{ev.weight || 5}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">KI-Gewicht</span>
                    <div className="flex-1">
                      {ev.ki_weight !== undefined && ev.ki_weight !== null
                        ? <ScoreBar value={ev.ki_weight} color="bg-violet-500" />
                        : <div className="w-full h-1.5 bg-gray-100 rounded-full" />}
                    </div>
                    <span className="text-xs font-semibold text-violet-600 w-8 text-right">
                      {ev.ki_weight !== undefined && ev.ki_weight !== null ? ev.ki_weight : "–"}
                    </span>
                  </div>
                </div>
                {ev.description && <p className="text-xs text-gray-500">{ev.description}</p>}
                {ev.type && <p className="text-[10px] text-gray-400 mt-0.5">{ev.type}</p>}
                {ev.datum && <p className="text-[10px] text-orange-500 font-medium">🗓 {new Date(ev.datum).toLocaleDateString("de-DE")}</p>}
                {ev.source && <p className="text-[10px] text-gray-400">Quelle: {ev.source}</p>}
                {paragraphen.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {paragraphen.map((p, i) => (
                      <span key={i} className="text-[9px] font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">{p}</span>
                    ))}
                  </div>
                )}
                {ev.ki_reasoning && (
                  <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg p-2">
                    <p className="text-[10px] font-semibold text-violet-700 mb-0.5">KI-Begründung (Gewicht {ev.ki_weight}/10):</p>
                    <p className="text-[10px] text-violet-600 leading-relaxed">{ev.ki_reasoning}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <button onClick={kiWeight} disabled={kiWeighting}
                    className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 border border-violet-200 rounded px-1.5 py-0.5 disabled:opacity-40">
                    {kiWeighting ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                    KI gewichten
                  </button>
                  {hasDiscrepancy && (
                    <button onClick={analyzeDiscrepancy} disabled={analyzing}
                      className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 border border-amber-200 rounded px-1.5 py-0.5 disabled:opacity-40">
                      {analyzing ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                      Diskrepanz analysieren
                    </button>
                  )}
                  <button onClick={analyzeErschuetterung} disabled={erschLoading}
                    className="flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 border border-red-200 rounded px-1.5 py-0.5 disabled:opacity-40">
                    {erschLoading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <span>⚡</span>}
                    Erschütterungsanalyse
                  </button>
                </div>
                {erschuetterung && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-red-800 uppercase tracking-wide">Erschütterungsanalyse</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${erschuetterung.erschuetterbarkeit === "sehr hoch" ? "bg-red-200 text-red-800" : erschuetterung.erschuetterbarkeit === "hoch" ? "bg-orange-200 text-orange-800" : erschuetterung.erschuetterbarkeit === "mittel" ? "bg-amber-200 text-amber-800" : "bg-green-200 text-green-800"}`}>
                          {erschuetterung.erschuetterbarkeit}
                        </span>
                        {erschuetterung.erfolgsaussicht_angriff_pct !== undefined && (
                          <span className="text-[10px] text-red-700 font-bold">{erschuetterung.erfolgsaussicht_angriff_pct}% Angriffserfolg</span>
                        )}
                      </div>
                    </div>
                    {erschuetterung.mittel_der_gegenseite?.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-red-700 uppercase mb-1">Angriffsmittel der Gegenseite</p>
                        {erschuetterung.mittel_der_gegenseite.map((m, i) => (
                          <p key={i} className="text-[10px] text-red-700 mb-0.5">⚡ {m}</p>
                        ))}
                      </div>
                    )}
                    {erschuetterung.gegenmassnahmen?.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-green-700 uppercase mb-1">Unsere Gegenmassnahmen</p>
                        {erschuetterung.gegenmassnahmen.map((m, i) => (
                          <p key={i} className="text-[10px] text-green-700 mb-0.5">✓ {m}</p>
                        ))}
                      </div>
                    )}
                    {erschuetterung.aufwand_gegner && (
                      <p className="text-[9px] text-gray-500">Aufwand Gegner: <strong>{erschuetterung.aufwand_gegner}</strong></p>
                    )}
                    <button onClick={() => setErschuetterung(null)} className="text-[9px] text-red-400 hover:text-red-600">Schließen</button>
                  </div>
                )}
                {analysis && (
                  <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-amber-800">{analysis.erklaerung}</p>
                    {(analysis.vorschlaege || []).map((v, i) => (
                      <div key={i} className="flex gap-2 text-xs text-gray-700">
                        <span className="text-amber-500 font-bold flex-shrink-0">{i + 1}.</span>
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-blue-500 p-1 opacity-0 group-hover:opacity-100 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(ev.id)} className="text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TabBeweise({ caseId }) {
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [selectedArg, setSelectedArg] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [showPara, setShowPara] = useState(false);
  const [activePara, setActivePara] = useState(null);
  const [showLink, setShowLink] = useState(false);
  const [newEv, setNewEv] = useState({ title: "", description: "", type: BEWEIS_TYPES[0], source: "", datum: "" });
  const [sortBy, setSortBy] = useState("created"); // "created" | "date" | "weight"
  const [argSortBy, setArgSortBy] = useState("created"); // "created" | "strength" | "evidence" | "date"

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const [a, e] = await Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId })
    ]);
    setArgs(a);
    setEvidence(e);
    if (a.length > 0 && !selectedArg) setSelectedArg(a[0].id);
  };

  const addEvidence = async () => {
    if (!newEv.title.trim() || !selectedArg) return;
    await base44.entities.Evidence.create({ case_id: caseId, argument_id: selectedArg, ...newEv, weight: WEIGHTS[newEv.type] || 5 });
    setNewEv({ title: "", description: "", type: BEWEIS_TYPES[0], source: "" });
    setShowAdd(false);
    load();
  };

  const del = async (id) => {
    try {
      await base44.entities.Evidence.delete(id);
    } catch (e) {
      console.warn("Evidence bereits gelöscht oder nicht gefunden:", id);
    }
    load();
  };

  const linkExisting = async (evId) => {
    await base44.entities.Evidence.update(evId, { argument_id: selectedArg });
    load();
  };

  const [kiSuggestions, setKiSuggestions] = useState(null); // { evId: { suggestedArgId, reason } }
  const [kiSugLoading, setKiSugLoading] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState({}); // evId -> argId

  const runKiSuggestions = async () => {
    if (!unlinkedEvidence.length || !args.length) return;
    setKiSugLoading(true);
    setKiSuggestions(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Rechtsanwalt. Weise die folgenden Beweismittel den passendsten Argumenten zu.

ARGUMENTE:
${args.map(a => `ID: ${a.id} | Seite: ${a.side} | Titel: ${a.title}`).join('\n')}

BEWEISE (unverknüpft):
${unlinkedEvidence.map(e => `ID: ${e.id} | Titel: ${e.title} | Typ: ${e.type || ''} | Beschreibung: ${e.description || ''}`).join('\n')}

Gib für jeden Beweis die ID des am besten passenden Arguments an und eine kurze Begründung (max. 1 Satz).`,
      response_json_schema: {
        type: "object",
        properties: {
          zuordnungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                evidence_id: { type: "string" },
                argument_id: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });
    const suggestions = {};
    const pending = {};
    (result?.zuordnungen || []).forEach(z => {
      suggestions[z.evidence_id] = { argId: z.argument_id, reason: z.reason };
      pending[z.evidence_id] = z.argument_id;
    });
    setKiSuggestions(suggestions);
    setPendingAssignments(pending);
    setKiSugLoading(false);
  };

  const applyAllSuggestions = async () => {
    await Promise.all(
      Object.entries(pendingAssignments).map(([evId, argId]) =>
        base44.entities.Evidence.update(evId, { argument_id: argId })
      )
    );
    setKiSuggestions(null);
    setPendingAssignments({});
    await load();
  };

  const selectedArgData = args.find(a => a.id === selectedArg);
  const sortEvidence = (list) => list.slice().sort((a, b) => {
    if (sortBy === "date") {
      const da = a.datum ? new Date(a.datum).getTime() : 0;
      const db = b.datum ? new Date(b.datum).getTime() : 0;
      return db - da;
    }
    if (sortBy === "weight") return (b.ki_weight ?? b.weight ?? 0) - (a.ki_weight ?? a.weight ?? 0);
    return 0;
  });
  const argEvidence = sortEvidence(evidence.filter(e =>
    e.argument_id === selectedArg ||
    (selectedArgData?.evidence_ids || []).includes(e.id)
  ));
  const unlinkedEvidence = evidence.filter(e =>
    !e.argument_id &&
    !(selectedArgData?.evidence_ids || []).includes(e.id)
  );

  return (
    <div className="flex gap-4" style={{ minHeight: "400px" }}>
      <div className="w-52 flex-shrink-0 overflow-y-auto space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Argumente</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {[["created", "Neu"], ["strength", "Stärke"], ["evidence", "Beweise"], ["date", "Datum"]].map(([s, l]) => (
            <button key={s} onClick={() => setArgSortBy(s)}
              className={`px-1.5 py-0.5 rounded text-[9px] border transition-all ${argSortBy === s ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-400 hover:border-gray-400"}`}>{l}</button>
          ))}
        </div>
        {[...args].sort((a, b) => {
          if (argSortBy === "strength") return (b.ki_strength ?? b.strength ?? 0) - (a.ki_strength ?? a.strength ?? 0);
          if (argSortBy === "evidence") return evidence.filter(e => e.argument_id === b.id).length - evidence.filter(e => e.argument_id === a.id).length;
          if (argSortBy === "date") {
            const da = a.zeitpunkt ? new Date(a.zeitpunkt).getTime() : 0;
            const db = b.zeitpunkt ? new Date(b.zeitpunkt).getTime() : 0;
            return db - da;
          }
          return 0;
        }).map(arg => (
          <button key={arg.id} onClick={() => setSelectedArg(arg.id)}
            className={`w-full text-left rounded-xl p-3 text-xs transition-all ${selectedArg === arg.id ? "bg-gray-900 text-white" : "bg-white border border-gray-100 text-gray-700 hover:border-gray-200"}`}>
            <div className={`text-[9px] font-medium mb-0.5 ${selectedArg === arg.id ? "text-gray-300" : "text-gray-400"}`}>{arg.side === "eigen" ? "Eigen" : "Gegner"}</div>
            <div className="font-medium leading-snug">{arg.title}</div>
            <div className="mt-1 text-[10px] text-gray-400">{evidence.filter(e => e.argument_id === arg.id).length} Beweise · {arg.ki_strength ?? arg.strength ?? "–"}/10</div>
          </button>
        ))}
        {args.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Keine Argumente</p>}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {selectedArgData ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selectedArgData.side === "eigen" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                  {selectedArgData.side === "eigen" ? "Eigenes Argument" : "Gegner-Argument"}
                </span>
                <h3 className="font-semibold text-gray-900 mt-1">{selectedArgData.title}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-gray-400">Sort:</span>
                {[["created", "Neu"], ["date", "Datum"], ["weight", "Gewicht"]].map(([s, l]) => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${sortBy === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500 hover:border-gray-400"}`}>{l}</button>
                ))}
                <Button size="sm" variant="outline" onClick={() => setShowLink(!showLink)}
                  className="rounded-xl text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50">
                  🔗 Verknüpfen {unlinkedEvidence.length > 0 && `(${unlinkedEvidence.length})`}
                </Button>
                <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white rounded-xl text-xs gap-1">
                  <Plus className="w-3 h-3" /> Beweis
                </Button>
              </div>
            </div>

            {showLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-blue-700">🔗 Beweise Argumenten zuordnen</p>
                  <Button size="sm" onClick={runKiSuggestions} disabled={kiSugLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs gap-1">
                    {kiSugLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {kiSugLoading ? "KI analysiert…" : "KI-Zuordnung"}
                  </Button>
                </div>

                {unlinkedEvidence.length === 0 && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ Alle Beweise sind Argumenten zugeordnet.</p>
                )}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {unlinkedEvidence.map(ev => {
                    const sug = kiSuggestions?.[ev.id];
                    return (
                      <div key={ev.id} className="bg-white rounded-xl border border-blue-100 p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                            {ev.type && <p className="text-[10px] text-gray-400">{ev.type}</p>}
                            {sug?.reason && <p className="text-[10px] text-violet-600 mt-1 italic">{sug.reason}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={pendingAssignments[ev.id] || ev.argument_id || ""}
                            onChange={e => setPendingAssignments(p => ({ ...p, [ev.id]: e.target.value }))}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-300">
                            <option value="">-- Argument wählen --</option>
                            {args.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.side === "eigen" ? "✦" : "◆"} {a.title}
                                {sug?.argId === a.id ? " ★ KI" : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const argId = pendingAssignments[ev.id];
                              if (argId) linkExisting(ev.id).then(() => {
                                setKiSuggestions(s => { const n = { ...s }; delete n[ev.id]; return n; });
                                setPendingAssignments(p => { const n = { ...p }; delete n[ev.id]; return n; });
                              });
                            }}
                            disabled={!pendingAssignments[ev.id]}
                            className="flex-shrink-0 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded px-2 py-1.5 transition-colors">
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {kiSuggestions && Object.keys(pendingAssignments).length > 0 && (
                  <Button onClick={applyAllSuggestions} size="sm"
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs gap-1">
                    <Check className="w-3 h-3" /> Alle KI-Vorschläge übernehmen
                  </Button>
                )}

                <button onClick={() => { setShowLink(false); setKiSuggestions(null); setPendingAssignments({}); }}
                  className="text-[10px] text-blue-500 hover:text-blue-700">Schließen</button>
              </div>
            )}

            {showAdd && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Titel *" value={newEv.title} onChange={e => setNewEv({ ...newEv, title: e.target.value })} />
                <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Beschreibung" rows={2} value={newEv.description} onChange={e => setNewEv({ ...newEv, description: e.target.value })} />
                <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value })}>
                  {BEWEIS_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Quelle" value={newEv.source} onChange={e => setNewEv({ ...newEv, source: e.target.value })} />
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Datum des Beweises</label>
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white" value={newEv.datum} onChange={e => setNewEv({ ...newEv, datum: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addEvidence} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="rounded-lg text-xs">Abbrechen</Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">📋 Beweisstrang</h4>
              <p className="text-xs text-gray-400 mb-4">Hover über einen Beweis, um Bearbeiten/Löschen zu sehen.</p>
              <div className="relative pl-6 space-y-4">
                {argEvidence.map(ev => (
                  <EvidenceCard key={ev.id} ev={ev} onDelete={del} onSave={load} />
                ))}
                {argEvidence.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Noch keine Beweise.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <button onClick={() => setShowRef(!showRef)} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700">
                📖 Referenztabelle {showRef ? "ausblenden" : "anzeigen"}
                {showRef ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showRef && (
                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1 font-medium">Typ</th>
                      <th className="text-center py-1 font-medium">Gewicht</th>
                      <th className="text-right py-1 font-medium">Kategorie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(WEIGHTS).map(([type, w]) => (
                      <tr key={type} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 text-gray-700">{type}</td>
                        <td className="py-1.5 text-center font-medium">{w}</td>
                        <td className="py-1.5 text-right text-gray-400">{w >= 8 ? "Beweis" : w >= 6 ? "Rspr." : "Beweis"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Paragraphen-Referenz */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <button onClick={() => setShowPara(!showPara)} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 w-full text-left">
                ⚖️ Paragraphen-Referenz (Zivil-, Öffentlich- & Strafrecht) {showPara ? "ausblenden" : "anzeigen"}
                {showPara ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>
              {showPara && (
                <div className="mt-3 space-y-3">
                  {/* Rechtsgebiet-Tabs */}
                  <div className="flex gap-1 flex-wrap">
                    {Object.keys(PARAGRAPHEN_REFERENZ).map(gebiet => (
                      <button key={gebiet} onClick={() => setActivePara(activePara === gebiet ? null : gebiet)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${activePara === gebiet ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                        {gebiet}
                      </button>
                    ))}
                  </div>
                  {activePara && (
                    <div className="space-y-1.5">
                      {PARAGRAPHEN_REFERENZ[activePara].map((p, i) => (
                        <div key={i} className="flex gap-3 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
                          <span className="text-[10px] font-mono font-bold text-blue-700 flex-shrink-0 w-28 pt-0.5">{p.para}</span>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{p.titel}</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{p.beschreibung}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">Wählen Sie ein Argument aus der Liste</div>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const EMPTY_EXP = { datum: new Date().toISOString().split("T")[0], autor: "", fall_kontext: "", vergleichsbereitschaft: 5, entscheidungsgeschwindigkeit: 5, sachkompetenz: 5, text: "" };

function StarRating({ value, onChange, max = 10 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button" onClick={() => onChange && onChange(i + 1)}
          className={`w-5 h-5 rounded-full text-[10px] font-bold transition-colors ${i < value ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400"}`}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

export default function RichterDetail({ profile, cases, onBack, onUpdate }) {
  const [showExpForm, setShowExpForm] = useState(false);
  const [expForm, setExpForm] = useState(EMPTY_EXP);
  const [kiLoading, setKiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const erfahrungen = profile.erfahrungen || [];
  const linkedCases = cases.filter(c => c.richter_name === profile.name);

  const saveErfahrung = async () => {
    if (!expForm.text.trim()) return;
    setSaving(true);
    const neu = [...erfahrungen, expForm];
    const updated = await base44.entities.JudgeProfile.update(profile.id, { erfahrungen: neu });
    onUpdate(updated);
    setExpForm(EMPTY_EXP);
    setShowExpForm(false);
    setSaving(false);
  };

  const runKIAnalyse = async () => {
    setKiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      add_context_from_internet: true,
      model: "gemini_3_flash",
      prompt: `Du bist ein juristischer Strategieberater und Rechtsrecherche-Experte. Deine Aufgabe ist eine vollständige Analyse des folgenden Richters.

Richterprofil:
- Name: ${profile.name}
- Gericht: ${profile.gericht} ${profile.kammer ? `· ${profile.kammer}` : ""}
- Rechtsgebiet: ${profile.rechtsgebiet || "unbekannt"}
- Verhandlungsstil: ${profile.stil || "Neutral"}
- Klägerquote: ${profile.klaeger_rate || 0}%
- Vergleichsrate: ${profile.vergleich_rate || 0}%
- Ø Verfahrensdauer: ${profile.durchschnitt_dauer_monate || 0} Monate
- Urteile gesamt: ${profile.urteile_gesamt || 0}
- Bekannt für: ${profile.bekannt_fuer || "–"}

Kanzlei-Erfahrungen (${erfahrungen.length}):
${erfahrungen.map((e, i) => `${i + 1}. ${e.datum}: Vergleichsbereitschaft ${e.vergleichsbereitschaft}/10, Geschwindigkeit ${e.entscheidungsgeschwindigkeit}/10, Sachkompetenz ${e.sachkompetenz}/10 – "${e.text}"`).join("\n") || "Noch keine Erfahrungen dokumentiert."}

Verknüpfte Fälle: ${linkedCases.map(c => `${c.fallname} (${c.rechtsgebiet}, Prognose ${c.prognose}%)`).join(", ") || "–"}

AUFGABE 1 – Internetrecherche: Suche im Internet nach echten Urteilen und Entscheidungen von Richter/in "${profile.name}" am ${profile.gericht}${profile.kammer ? ` (${profile.kammer})` : ""}. Suche in:
- juris.de, dejure.org, rewis.io, openJur.de
- Bundesrechtsprechungsdatenbanken
- Anwaltsblogs und Kommentare zu Entscheidungen
- Pressemitteilungen des Gerichts

Für jeden gefundenen Fall: Aktenzeichen, Datum, Streitgegenstand, Ergebnis (Urteil/Vergleich), wie der Richter argumentiert hat, welche rechtlichen Maßstäbe angelegt wurden.

AUFGABE 2 – Musteranalyse: Leite aus den gefundenen Fällen + Kanzleierfahrungen ab:
- Typische Argumentationsmuster des Richters
- Bevorzugte Rechtsnormen und Auslegungsmethoden
- Wie er/sie mit Beweismitteln umgeht
- Wann er/sie zu Vergleichen neigt
- Typische Fallstricke für Anwälte bei diesem Richter

AUFGABE 3 – Taktische Empfehlungen für Anwälte basierend auf allem Obigen.`,
      response_json_schema: {
        type: "object",
        properties: {
          zusammenfassung: { type: "string" },
          gefundene_urteile: {
            type: "array",
            items: {
              type: "object",
              properties: {
                aktenzeichen: { type: "string" },
                datum: { type: "string" },
                streitgegenstand: { type: "string" },
                ergebnis: { type: "string" },
                argumentationsweise: { type: "string" },
                quelle: { type: "string" }
              }
            }
          },
          argumentationsmuster: { type: "array", items: { type: "string" } },
          bevorzugte_normen: { type: "array", items: { type: "string" } },
          umgang_beweismittel: { type: "string" },
          staerken_klaeger: { type: "array", items: { type: "string" } },
          risiken_klaeger: { type: "array", items: { type: "string" } },
          verhandlungstipps: { type: "array", items: { type: "object", properties: { tipp: { type: "string" }, begruendung: { type: "string" }, prioritaet: { type: "string" } } } },
          vergleichsstrategie: { type: "string" },
          timing_empfehlung: { type: "string" },
          do_dont: { type: "object", properties: { dos: { type: "array", items: { type: "string" } }, donts: { type: "array", items: { type: "string" } } } },
          gesamteinschaetzung: { type: "string" }
        }
      }
    });
    const updated = await base44.entities.JudgeProfile.update(profile.id, { ki_analyse: { ...res, erstellt: new Date().toISOString() } });
    onUpdate(updated);
    setKiLoading(false);
  };

  const ki = profile.ki_analyse;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Übersicht
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.gericht}{profile.kammer ? ` · ${profile.kammer}` : ""}</p>
            {profile.rechtsgebiet && <p className="text-xs text-gray-400 mt-0.5">{profile.rechtsgebiet}</p>}
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            { Kooperativ: "bg-green-100 text-green-700", Streng: "bg-red-100 text-red-700", Neutral: "bg-gray-100 text-gray-600", Prozessaktiv: "bg-blue-100 text-blue-700", Vergleichsorientiert: "bg-purple-100 text-purple-700" }[profile.stil] || "bg-gray-100 text-gray-600"
          }`}>{profile.stil}</span>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-50">
          {[["Klägerquote", `${profile.klaeger_rate || 0}%`, "text-blue-600"], ["Vergleichsrate", `${profile.vergleich_rate || 0}%`, "text-purple-600"], ["Ø Dauer", `${profile.durchschnitt_dauer_monate || 0} Mo.`, "text-gray-700"], ["Urteile", profile.urteile_gesamt || 0, "text-gray-700"]].map(([l, v, cls]) => (
            <div key={l} className="text-center">
              <p className={`text-xl font-bold ${cls}`}>{v}</p>
              <p className="text-[10px] text-gray-400">{l}</p>
            </div>
          ))}
        </div>
        {profile.bekannt_fuer && <p className="text-xs text-gray-500 italic mt-3 bg-gray-50 rounded-lg p-3">„{profile.bekannt_fuer}"</p>}
        {linkedCases.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {linkedCases.map(c => <span key={c.id} className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{c.fallname}</span>)}
          </div>
        )}
      </div>

      {/* Erfahrungen */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">📝 Kanzlei-Erfahrungen ({erfahrungen.length})</h3>
          <Button size="sm" onClick={() => setShowExpForm(!showExpForm)} className="bg-gray-900 text-white rounded-xl text-xs h-7 gap-1">
            <Plus className="w-3 h-3" /> Erfahrung
          </Button>
        </div>

        {showExpForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3 border border-gray-200">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Datum</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" value={expForm.datum} onChange={e => setExpForm({ ...expForm, datum: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Autor / Anwalt</label>
                <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" placeholder="RA Müller" value={expForm.autor} onChange={e => setExpForm({ ...expForm, autor: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Fallkontext (optional)</label>
              <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" placeholder="z.B. Markenrechtssache, Verhandlung 2025" value={expForm.fall_kontext} onChange={e => setExpForm({ ...expForm, fall_kontext: e.target.value })} />
            </div>
            <div className="space-y-2">
              {[["Vergleichsbereitschaft", "vergleichsbereitschaft"], ["Entscheidungsgeschwindigkeit", "entscheidungsgeschwindigkeit"], ["Sachkompetenz", "sachkompetenz"]].map(([l, f]) => (
                <div key={f}>
                  <label className="text-[10px] text-gray-400 block mb-1">{l}</label>
                  <StarRating value={expForm[f]} onChange={v => setExpForm({ ...expForm, [f]: v })} />
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Erfahrungsbericht *</label>
              <textarea className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white" rows={3} placeholder="Was ist aufgefallen? Wie war das Verhalten in der Verhandlung?" value={expForm.text} onChange={e => setExpForm({ ...expForm, text: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveErfahrung} disabled={saving} className="bg-gray-900 text-white rounded-xl text-xs">Speichern</Button>
              <Button size="sm" variant="outline" onClick={() => setShowExpForm(false)} className="rounded-xl text-xs">Abbrechen</Button>
            </div>
          </div>
        )}

        {erfahrungen.length === 0 && !showExpForm ? (
          <p className="text-sm text-gray-400 text-center py-6">Noch keine Erfahrungen dokumentiert.<br/><span className="text-xs">Fügen Sie die erste Erfahrung hinzu.</span></p>
        ) : (
          <div className="space-y-3">
            {[...erfahrungen].reverse().map((e, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{e.autor || "Anonym"}</span>
                    {e.fall_kontext && <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{e.fall_kontext}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400">{e.datum}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[["Vergleich", e.vergleichsbereitschaft], ["Geschwindigkeit", e.entscheidungsgeschwindigkeit], ["Sachkompetenz", e.sachkompetenz]].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-[10px] text-gray-400">{l}</p>
                      <div className="flex items-center gap-1">
                        <div className="flex gap-0.5">{Array.from({ length: 10 }, (_, j) => <div key={j} className={`w-1.5 h-1.5 rounded-full ${j < v ? "bg-gray-800" : "bg-gray-100"}`} />)}</div>
                        <span className="text-[10px] text-gray-600">{v}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600">{e.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KI-Analyse */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">🤖 KI-Taktikanalyse</h3>
          <Button onClick={runKIAnalyse} disabled={kiLoading} className="bg-gray-900 text-white rounded-xl text-xs h-8 gap-1.5">
            {kiLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analysiere...</> : <><Star className="w-3.5 h-3.5" /> {ki ? "Neu analysieren" : "Analyse starten"}</>}
          </Button>
        </div>

        {!ki && !kiLoading && (
          <p className="text-sm text-gray-400 text-center py-6">Starten Sie die KI-Analyse um taktische Empfehlungen auf Basis des Profils und der Kanzlei-Erfahrungen zu erhalten.</p>
        )}

        {ki && (
          <div className="space-y-4">
            {ki.erstellt && <p className="text-[10px] text-gray-400">Letzte Analyse: {new Date(ki.erstellt).toLocaleString("de-DE")} · ⚠️ Diese Analyse verwendet Gemini Pro mit Internetsuche (mehr KI-Credits)</p>}

            {ki.zusammenfassung && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-1">📊 Zusammenfassung</p>
                <p className="text-sm text-gray-700">{ki.zusammenfassung}</p>
              </div>
            )}

            {(ki.gefundene_urteile || []).length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3">🔍 Gefundene Urteile & Entscheidungen ({ki.gefundene_urteile.length})</p>
                <div className="space-y-3">
                  {ki.gefundene_urteile.map((u, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {u.aktenzeichen && <span className="text-[10px] font-mono bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">{u.aktenzeichen}</span>}
                          {u.datum && <span className="text-[10px] text-gray-400">{u.datum}</span>}
                        </div>
                        {u.quelle && <a href={u.quelle.startsWith("http") ? u.quelle : undefined} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline truncate max-w-[120px]">{u.quelle}</a>}
                      </div>
                      {u.streitgegenstand && <p className="text-xs font-medium text-gray-800 mb-1">{u.streitgegenstand}</p>}
                      {u.ergebnis && <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Ergebnis:</span> {u.ergebnis}</p>}
                      {u.argumentationsweise && <p className="text-xs text-gray-500 italic">→ {u.argumentationsweise}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(ki.argumentationsmuster || []).length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2">🧠 Typische Argumentationsmuster</p>
                <ul className="space-y-1">{ki.argumentationsmuster.map((m, i) => <li key={i} className="text-xs text-amber-800">• {m}</li>)}</ul>
              </div>
            )}

            {(ki.bevorzugte_normen || []).length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">§ Bevorzugte Rechtsnormen</p>
                <div className="flex flex-wrap gap-1.5">{ki.bevorzugte_normen.map((n, i) => <span key={i} className="text-[10px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-700 font-mono">{n}</span>)}</div>
              </div>
            )}

            {ki.umgang_beweismittel && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">📜 Umgang mit Beweismitteln</p>
                <p className="text-xs text-blue-800">{ki.umgang_beweismittel}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(ki.staerken_klaeger || []).length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 mb-2">✅ Stärken für Kläger</p>
                  <ul className="space-y-1">{ki.staerken_klaeger.map((s, i) => <li key={i} className="text-xs text-green-800">• {s}</li>)}</ul>
                </div>
              )}
              {(ki.risiken_klaeger || []).length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2">⚠️ Risiken für Kläger</p>
                  <ul className="space-y-1">{ki.risiken_klaeger.map((r, i) => <li key={i} className="text-xs text-red-800">• {r}</li>)}</ul>
                </div>
              )}
            </div>

            {ki.do_dont && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(ki.do_dont.dos || []).length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2">👍 DO</p>
                    <ul className="space-y-1">{ki.do_dont.dos.map((d, i) => <li key={i} className="text-xs text-blue-800">✓ {d}</li>)}</ul>
                  </div>
                )}
                {(ki.do_dont.donts || []).length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-orange-700 mb-2">👎 DON'T</p>
                    <ul className="space-y-1">{ki.do_dont.donts.map((d, i) => <li key={i} className="text-xs text-orange-800">✗ {d}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            {(ki.verhandlungstipps || []).length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-700 mb-3">💡 Verhandlungstipps</p>
                <div className="space-y-3">
                  {ki.verhandlungstipps.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded self-start mt-0.5 font-medium whitespace-nowrap ${t.prioritaet === "hoch" ? "bg-red-100 text-red-600" : t.prioritaet === "mittel" ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-500"}`}>{t.prioritaet}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-800">{t.tipp}</p>
                        <p className="text-xs text-gray-500">{t.begruendung}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ki.vergleichsstrategie && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-purple-700 mb-1">🤝 Vergleichsstrategie</p>
                <p className="text-xs text-purple-800">{ki.vergleichsstrategie}</p>
              </div>
            )}

            {ki.timing_empfehlung && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">⏰ Timing</p>
                <p className="text-xs text-blue-800">{ki.timing_empfehlung}</p>
              </div>
            )}

            {ki.gesamteinschaetzung && (
              <div className="bg-gray-900 text-white rounded-xl p-4">
                <p className="text-xs font-semibold mb-1">🎯 Gesamteinschätzung</p>
                <p className="text-sm">{ki.gesamteinschaetzung}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
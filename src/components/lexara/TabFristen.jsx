import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Check, X, ChevronDown, ChevronUp, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const FRIST_TYPES = ["Berufungsfrist","Berufungsbegründung","Revisionsfrist","Klagebegründung","Schriftsatzfrist","Widerspruch Mahnbescheid","Einspruch Versäumnisurteil","eV-Antragsfrist","Verjährungsfrist","Klagefrist KSchG","BR-Anzeige §102 BetrVG","Vollstreckungsfristen","Sonstige"];
const FRIST_REF = [["Berufungsfrist","§517 ZPO","1 Monat","~60–100%"],["Berufungsbegründung","§520 ZPO","2 Monate","~40–70%"],["Revisionsfrist","§548 ZPO","1 Monat","~100–100%"],["Klagebegründung","§276 ZPO","Richterlich","~20–50%"],["Schriftsatzfrist","§296 ZPO","Richterlich","~10–30%"],["Widerspruch Mahnbescheid","§694 ZPO","2 Wochen","~80–100%"],["Einspruch Versäumnisurteil","§339 ZPO","2 Wochen","~90–100%"],["eV-Antragsfrist","§940 ZPO","Fallabhängig","~30–70%"],["Verjährungsfrist","§§195ff. BGB","3 Jahre","~100–100%"],["Klagefrist KSchG","§4 KSchG","3 Wochen","~100–100%"],["BR-Anzeige §102 BetrVG","§102 BetrVG","1 Woche","+40–20%"],["Vollstreckungsfristen","§§767ff. ZPO","Variabel","~30–60%"]];
const EMPTY = { title:"", frist_type:"eV-Antragsfrist", paragraph:"", due_date:"", responsible:"", side:"Eigene", status:"offen", prognoseabzug:"" };

function daysUntil(d) { if(!d) return null; return Math.ceil((new Date(d)-new Date())/(1000*60*60*24)); }
function FristDot({ days, status }) {
  if(status==="versaeumt") return <div className="w-2 h-2 rounded-full bg-gray-300" />;
  if(status==="erledigt") return <div className="w-2 h-2 rounded-full bg-green-300" />;
  if(days===null) return <div className="w-2 h-2 rounded-full bg-gray-300" />;
  if(days>14) return <div className="w-2 h-2 rounded-full bg-green-500" />;
  if(days>=3) return <div className="w-2 h-2 rounded-full bg-orange-400" />;
  return <div className="w-2 h-2 rounded-full bg-red-500" />;
}

export default function TabFristen({ caseId, onCountChange, caseData }) {
  const [fristen, setFristen] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showRef, setShowRef] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [kiAnalyzing, setKiAnalyzing] = useState(false);
  const [kiResult, setKiResult] = useState(null);

  useEffect(() => { load(); }, [caseId]);

  const load = async (notify = false) => {
    const data = await base44.entities.Deadline.filter({ case_id: caseId });
    setFristen(data.sort((a,b) => new Date(a.due_date)-new Date(b.due_date)));
    if (notify) onCountChange && onCountChange();
  };

  const save = async () => {
    if (!form.title.trim() || !form.due_date) return;
    await base44.entities.Deadline.create({ case_id: caseId, ...form });
    setForm(EMPTY);
    setShowAdd(false);
    load(true);
  };

  const updateStatus = async (id, status) => { await base44.entities.Deadline.update(id, { status }); load(false); };
  const del = async (id) => { await base44.entities.Deadline.delete(id); load(true); };

  const runKIFristenErkennung = async () => {
    setKiAnalyzing(true);
    setKiResult(null);
    // Lade Falldaten + Dokumente + Argumente
    const [docs, args, caseArr] = await Promise.all([
      base44.entities.Document.filter({ case_id: caseId }),
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Case.filter({ id: caseId }),
    ]);
    const fallData = caseArr[0] || caseData || {};

    const sachverhalt = [
      fallData.prozessziel,
      fallData.zentrale_rechtsfrage,
      fallData.rechtsgebiet,
      ...docs.map(d => d.ai_summary || d.description || d.title),
      ...args.map(a => a.title + ": " + (a.description || "")),
    ].filter(Boolean).join("\n");

    const today = new Date().toISOString().slice(0, 10);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Straf- und Verfassungsrechtsanwalt in Deutschland. Analysiere den folgenden Sachverhalt und erkenne ALLE relevanten Fristen — insbesondere:
- Beschwerde gegen Durchsuchungsbeschluss (§ 304 StPO: 2 Wochen, ABER: nachträgliche Überprüfung jederzeit möglich; bei erledigten Maßnahmen: Feststellungsantrag ohne Frist)
- Verfassungsbeschwerde (§ 93 Abs. 1 BVerfGG: 1 Monat nach Zustellung, sonst 1 Jahr nach der Verletzung)
- Grundrechtseingriffe (Art. 13 GG Unverletzlichkeit der Wohnung, Art. 2 Abs. 1 GG, Art. 103 GG)
- Rechtsmittelfristen (Berufung, Revision, Einspruch, Widerspruch)
- Strafprozessuale Fristen (§§ 112ff. StPO Untersuchungshaft, § 116a StPO, § 115 StPO Vorführung)
- Zivilrechtliche Verjährungsfristen (§§ 195ff. BGB)
- Verwaltungsrechtliche Fristen (Widerspruch 1 Monat, Anfechtungsklage 1 Monat)
- DSGVO-Fristen (Art. 77 DSGVO Beschwerde bei Aufsichtsbehörde)
- Sonstige erkannte rechtlich relevante Fristen

Erkennung von Verfassungsverstößen: Prüfe explizit ob Grundrechtsverletzungen vorliegen (Art. 13, 2, 1, 103, 104 GG) und ob eine Verfassungsbeschwerde aussichtsreich wäre.

Sachverhalt:
${sachverhalt || "Strafverfahren / Durchsuchung"}

Fallname: ${fallData.fallname || ""}
Rechtsgebiet: ${fallData.rechtsgebiet || "Strafrecht"}
Heute: ${today}

Erstelle für jede erkannte Frist einen Eintrag mit konkretem Datum (berechne ab heute falls kein Ausgangsdatum bekannt). Wenn kein genaues Ausgangsdatum bekannt, nimm heute als Start und vermerke es in der Beschreibung.`,
      response_json_schema: {
        type: "object",
        properties: {
          fristen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                frist_type: { type: "string" },
                paragraph: { type: "string" },
                due_date: { type: "string" },
                beschreibung: { type: "string" },
                prioritaet: { type: "string" },
                verfassungsrelevanz: { type: "boolean" }
              }
            }
          },
          verfassungsverstoss_erkannt: { type: "boolean" },
          verfassungsverstoss_begruendung: { type: "string" },
          empfehlung: { type: "string" }
        }
      },
      model: "claude_sonnet_4_6"
    });

    setKiResult(result);
    setKiAnalyzing(false);
  };

  const importKIFrist = async (frist) => {
    await base44.entities.Deadline.create({
      case_id: caseId,
      title: frist.title,
      frist_type: frist.frist_type || "Sonstige",
      paragraph: frist.paragraph || "",
      due_date: frist.due_date,
      responsible: "",
      side: "Eigene",
      status: "offen",
      prognoseabzug: frist.prioritaet === "kritisch" ? "–50% bis –100%" : "",
    });
    load(true);
  };

  const importAllKIFristen = async () => {
    if (!kiResult?.fristen?.length) return;
    for (const f of kiResult.fristen) {
      await base44.entities.Deadline.create({
        case_id: caseId,
        title: f.title,
        frist_type: f.frist_type || "Sonstige",
        paragraph: f.paragraph || "",
        due_date: f.due_date,
        responsible: "",
        side: "Eigene",
        status: "offen",
        prognoseabzug: f.prioritaet === "kritisch" ? "–50% bis –100%" : "",
      });
    }
    setKiResult(null);
    load(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">⏰ Fristenmanagement</h3>
          <div className="flex items-center gap-3 mt-1 text-xs">
            {[["bg-green-500","> 14 Tage"],["bg-orange-400","3–14 Tage"],["bg-red-500","< 3 Tage!"],["bg-gray-300","Versäumt"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-full ${c}`} /><span className="text-gray-500">{l}</span></div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runKIFristenErkennung} disabled={kiAnalyzing}
            className="rounded-xl text-xs gap-1 border-violet-200 text-violet-700 hover:bg-violet-50">
            <Sparkles className="w-3 h-3" /> {kiAnalyzing ? "KI analysiert…" : "KI-Fristen erkennen"}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white rounded-xl text-xs gap-1"><Plus className="w-3 h-3" /> Frist</Button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Titel *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          <div className="grid grid-cols-2 gap-2">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={form.frist_type} onChange={e=>setForm({...form,frist_type:e.target.value})}>
              {FRIST_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" placeholder="Paragraph z.B. §940 ZPO" value={form.paragraph} onChange={e=>setForm({...form,paragraph:e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-gray-400 block mb-1">Fälligkeitsdatum *</label><input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} /></div>
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white self-end" placeholder="Verantwortlich" value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={form.side} onChange={e=>setForm({...form,side:e.target.value})}><option value="Eigene">Eigene</option><option value="Gegner">Gegner</option></select>
            <input className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" placeholder="Prognoseabzug z.B. –30% bis –70%" value={form.prognoseabzug} onChange={e=>setForm({...form,prognoseabzug:e.target.value})} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} className="bg-gray-900 text-white rounded-lg text-xs">Frist speichern</Button>
            <Button size="sm" variant="outline" onClick={()=>setShowAdd(false)} className="rounded-lg text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      {/* KI-Ergebnis */}
      {kiResult && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-800">🤖 KI-Fristenerkennung — {kiResult.fristen?.length || 0} Fristen erkannt</p>
            <button onClick={() => setKiResult(null)} className="text-violet-400 hover:text-violet-700"><X className="w-4 h-4" /></button>
          </div>

          {kiResult.verfassungsverstoss_erkannt && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ Verfassungsverstoß erkannt!
              </p>
              <p className="text-xs text-red-600">{kiResult.verfassungsverstoss_begruendung}</p>
            </div>
          )}

          {kiResult.empfehlung && (
            <div className="bg-white border border-violet-100 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-violet-500 uppercase mb-1">KI-Empfehlung</p>
              <p className="text-xs text-gray-700">{kiResult.empfehlung}</p>
            </div>
          )}

          <div className="space-y-2">
            {(kiResult.fristen || []).map((f, i) => (
              <div key={i} className={`bg-white border rounded-lg p-3 flex items-start justify-between gap-3 ${f.verfassungsrelevanz ? "border-red-200" : "border-violet-100"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    {f.verfassungsrelevanz && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">VERFASSUNG</span>}
                    {f.prioritaet === "kritisch" && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">KRITISCH</span>}
                    <span className="text-xs font-semibold text-gray-900">{f.title}</span>
                    {f.paragraph && <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{f.paragraph}</span>}
                  </div>
                  {f.beschreibung && <p className="text-[11px] text-gray-500 mt-0.5">{f.beschreibung}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">Fällig: <strong>{f.due_date ? new Date(f.due_date).toLocaleDateString("de-DE") : "—"}</strong></p>
                </div>
                <Button size="sm" onClick={() => importKIFrist(f)} className="bg-violet-600 text-white rounded-lg text-[10px] px-2 py-1 h-auto flex-shrink-0">
                  + Import
                </Button>
              </div>
            ))}
          </div>

          {kiResult.fristen?.length > 0 && (
            <Button onClick={importAllKIFristen} className="w-full bg-violet-700 text-white rounded-lg text-xs gap-1">
              <Check className="w-3 h-3" /> Alle {kiResult.fristen.length} Fristen importieren
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {fristen.map(f => {
          const days = daysUntil(f.due_date);
          const dateStr = f.due_date ? new Date(f.due_date).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : "";
          return (
            <div key={f.id} className={`bg-white border rounded-xl p-4 ${f.status==="erledigt"?"border-green-100 opacity-70":f.status==="versaeumt"?"border-red-100":"border-gray-100"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="mt-1"><FristDot days={days} status={f.status} /></div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{f.title}</span>
                      {f.paragraph && <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{f.paragraph}</span>}
                      <span className={`text-[10px] rounded-full px-2 py-0.5 ${f.side==="Eigene"?"bg-blue-100 text-blue-700":"bg-red-100 text-red-700"}`}>{f.side}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{dateStr}</span>
                      {days!==null && days>0 && f.status==="offen" && <span className={`font-medium ${days>14?"text-green-600":days>=3?"text-orange-500":"text-red-600"}`}>{days} Tage verbleibend</span>}
                      {days!==null && days<=0 && f.status==="offen" && <span className="text-red-600 font-medium">Überfällig!</span>}
                    </div>
                    {f.responsible && <p className="text-xs text-gray-400">Verantwortlich: {f.responsible}</p>}
                    {f.prognoseabzug && <p className="text-xs text-gray-400">Prognoseabzug bei Versäumnis: {f.prognoseabzug}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {f.status!=="erledigt" && <button onClick={()=>updateStatus(f.id,"erledigt")} className="text-xs text-green-600 border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50 flex items-center gap-1"><Check className="w-3 h-3" /> Erledigt</button>}
                  {f.status==="offen" && <button onClick={()=>updateStatus(f.id,"versaeumt")} className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 flex items-center gap-1"><X className="w-3 h-3" /> Versäumt</button>}
                  <button onClick={()=>del(f.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {fristen.length === 0 && !showAdd && <div className="text-center text-gray-400 text-sm py-10">Noch keine Fristen.</div>}
      </div>

      {fristen.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-4">📅 Fristen-Zeitleiste</p>
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200" />
            <div className="space-y-3">
              {fristen.map(f => {
                const days = daysUntil(f.due_date);
                const dateStr = f.due_date ? new Date(f.due_date).toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}) : "";
                return (
                  <div key={f.id} className="relative">
                    <div className="absolute -left-[18px] top-4"><FristDot days={days} status={f.status} /></div>
                    <div className={`bg-white border rounded-xl p-4 ${f.status==="erledigt"?"border-green-100 opacity-70":f.status==="versaeumt"?"border-red-100":"border-gray-100"}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900">{f.title}</span>
                              {f.paragraph && <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{f.paragraph}</span>}
                              <span className={`text-[10px] rounded-full px-2 py-0.5 ${f.side==="Eigene"?"bg-blue-100 text-blue-700":"bg-red-100 text-red-700"}`}>{f.side}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>{dateStr}</span>
                              {days!==null && days>0 && f.status==="offen" && <span className={`font-medium ${days>14?"text-green-600":days>=3?"text-orange-500":"text-red-600"}`}>{days} Tage verbleibend</span>}
                              {days!==null && days<=0 && f.status==="offen" && <span className="text-red-600 font-medium">Überfällig!</span>}
                            </div>
                            {f.responsible && <p className="text-xs text-gray-400">Verantwortlich: {f.responsible}</p>}
                            {f.prognoseabzug && <p className="text-xs text-gray-400">Prognoseabzug bei Versäumnis: {f.prognoseabzug}</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium flex-shrink-0 ${
                          f.status==="erledigt"?"text-green-600":
                          f.status==="versaeumt"?"text-gray-400":
                          days!==null && days<=0?"text-red-600":
                          days!==null && days<=14?"text-orange-500":"text-gray-400"
                        }`}>
                          {f.status==="erledigt"?"✓ Erledigt":f.status==="versaeumt"?"✗ Versäumt":days!==null && days<=0?"Überfällig":""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <button onClick={() => setShowRef(!showRef)} className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700">
          📖 Fristentypen-Referenz {showRef ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showRef && (
          <table className="mt-3 w-full text-xs">
            <thead><tr className="text-gray-400 border-b border-gray-100"><th className="text-left py-1.5 font-medium">Fristtyp</th><th className="text-left py-1.5 font-medium">Paragraph</th><th className="text-left py-1.5 font-medium">Dauer</th><th className="text-right py-1.5 font-medium">Prognoseabzug</th></tr></thead>
            <tbody>{FRIST_REF.map(([t,p,d,a]) => (<tr key={t} className="border-b border-gray-50 hover:bg-gray-50"><td className="py-1.5 text-gray-700">{t}</td><td className="py-1.5 text-gray-500">{p}</td><td className="py-1.5 text-gray-500">{d}</td><td className="py-1.5 text-right text-gray-500">{a}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
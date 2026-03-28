import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Upload, X, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabArgumente({ caseId, caseData, onCountChange }) {
  const [args, setArgs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showExtraction, setShowExtraction] = useState(false);
  const [extractMode, setExtractMode] = useState("ki");
  const [dsgvo, setDsgvo] = useState(false);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newArg, setNewArg] = useState({ title: "", description: "", side: "eigen", strength: 5, type: "Rechtsargument" });
  const fileRef = useRef(null);

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    const data = await base44.entities.Argument.filter({ case_id: caseId });
    setArgs(data);
    onCountChange && onCountChange();
  };

  const handleExtract = async () => {
    if (!dsgvo || (!file && !text.trim())) return;
    setExtracting(true);
    let fileUrl = null;
    if (file) {
      const res = await base44.integrations.Core.UploadFile({ file });
      fileUrl = res.file_url;
    }
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Rechtsanwalt. Analysiere dieses juristische Dokument und extrahiere alle Argumente.
Fallkontext: ${caseData?.fallname||""}, Rechtsgebiet: ${caseData?.rechtsgebiet||""}, Rechtsfrage: ${caseData?.zentrale_rechtsfrage||""}
${!fileUrl ? "TEXT: " + text : ""}
Extrahiere: eigene Argumente, Gegenseite-Argumente, Widersprüche, Druckmittel, Schwächen, Paragraphen.`,
      file_urls: fileUrl ? [fileUrl] : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          zusammenfassung: { type: "string" },
          eigene_argumente: { type: "array", items: { type: "object", properties: { titel: {type:"string"}, beschreibung: {type:"string"}, typ: {type:"string"}, staerke: {type:"number"}, paragraphen: {type:"array",items:{type:"string"}} }, required:["titel"] } },
          gegenseite_argumente: { type: "array", items: { type: "object", properties: { titel: {type:"string"}, beschreibung: {type:"string"}, typ: {type:"string"}, staerke: {type:"number"} }, required:["titel"] } },
          widersprueche: { type: "array", items: { type: "object", properties: { titel: {type:"string"}, staerke: {type:"number"} }, required:["titel"] } },
          druckmittel: { type: "array", items: { type: "object", properties: { titel: {type:"string"}, staerke: {type:"number"} }, required:["titel"] } },
          relevante_paragraphen: { type: "array", items: { type: "string" } },
        }
      }
    });
    setExtracted(result);
    setExtracting(false);
  };

  const take = async (a, side, argType = "Rechtsargument") => {
    await base44.entities.Argument.create({ case_id: caseId, title: a.titel, description: a.beschreibung||"", side, strength: a.staerke||5, type: argType, paragraphs: a.paragraphen||[] });
    load();
  };

  const takeAll = async () => {
    if (!extracted) return;
    const all = [...(extracted.eigene_argumente||[]).map(a=>({...a,side:"eigen"})), ...(extracted.gegenseite_argumente||[]).map(a=>({...a,side:"gegner"}))];
    for (const a of all) await base44.entities.Argument.create({ case_id: caseId, title: a.titel, description: a.beschreibung||"", side: a.side, strength: a.staerke||5, type: "Rechtsargument", paragraphs: a.paragraphen||[] });
    setExtracted(null);
    load();
  };

  const addManual = async () => {
    if (!newArg.title.trim()) return;
    await base44.entities.Argument.create({ case_id: caseId, ...newArg });
    setNewArg({ title: "", description: "", side: "eigen", strength: 5, type: "Rechtsargument" });
    setShowAdd(false);
    load();
  };

  const del = async (id) => { await base44.entities.Argument.delete(id); load(); };
  const filtered = args.filter(a => filter === "all" || a.side === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[["all","Alle"],["eigen","Eigene"],["gegner","Gegner"]].map(([f,l]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${filter===f?"bg-gray-900 text-white border-gray-900":"border-gray-200 text-gray-600 hover:border-gray-400"}`}>{l}</button>
        ))}
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="bg-gray-900 text-white rounded-xl text-xs gap-1">
            <Plus className="w-3 h-3" /> Argument
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Titel *" value={newArg.title} onChange={e=>setNewArg({...newArg,title:e.target.value})} />
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" placeholder="Beschreibung" rows={2} value={newArg.description} onChange={e=>setNewArg({...newArg,description:e.target.value})} />
          <div className="flex gap-2 flex-wrap items-center">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newArg.side} onChange={e=>setNewArg({...newArg,side:e.target.value})}>
              <option value="eigen">Eigen</option><option value="gegner">Gegner</option>
            </select>
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white" value={newArg.type} onChange={e=>setNewArg({...newArg,type:e.target.value})}>
              <option>Rechtsargument</option><option>Tatsachenargument</option>
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Stärke:</span>
              <input type="number" min={0} max={10} step={0.5} className="border border-gray-200 rounded-lg px-2 py-2 text-xs w-16 bg-white" value={newArg.strength} onChange={e=>setNewArg({...newArg,strength:+e.target.value})} />
            </div>
            <Button size="sm" onClick={addManual} className="bg-gray-900 text-white rounded-lg text-xs">Hinzufügen</Button>
            <Button size="sm" variant="outline" onClick={()=>setShowAdd(false)} className="rounded-lg text-xs">Abbrechen</Button>
          </div>
        </div>
      )}

      {/* Extraction */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <button onClick={() => setShowExtraction(!showExtraction)}
          className="w-full px-4 py-3 flex items-center gap-2 text-sm font-medium hover:bg-gray-50">
          <span>👑 Argument-Extraktion</span>
          <span className="ml-auto text-gray-400 text-xs">Dokumente & Texte analysieren</span>
          {showExtraction ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showExtraction && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">Modus:</span>
              {[["algo","🔧 Algorithmus"],["ki","👑 KI"]].map(([m,l]) => (
                <button key={m} onClick={() => setExtractMode(m)} className={`px-3 py-1 rounded-lg ${extractMode===m?"bg-gray-100 font-medium":"text-gray-400"}`}>{l}</button>
              ))}
              <span className="ml-auto text-gray-400 text-[10px]">{extractMode==="ki"?"KI-gestützte Analyse (DSGVO)":"Rein algorithmisch – sofortige Ergebnisse"}</span>
            </div>
            {extractMode === "ki" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-medium">🔒 DSGVO-Hinweis (Art. 13, 28 DSGVO)</p>
                <ul className="space-y-0.5 text-gray-600">
                  <li>• Dokumente werden <strong>ausschließlich zur Analyse</strong> verarbeitet und <strong>sofort nach Extraktion gelöscht</strong></li>
                  <li>• Es erfolgt <strong>keine dauerhafte Speicherung</strong> der Originaldokumente</li>
                  <li>• <strong>Keine Weitergabe</strong> an Dritte – Daten werden nicht für KI-Training verwendet</li>
                </ul>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input type="checkbox" checked={dsgvo} onChange={e=>setDsgvo(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-blue-600 font-medium">Ich habe den DSGVO-Hinweis gelesen und stimme der Verarbeitung zu</span>
                </label>
                <p className="text-amber-600">⚠️ KI-Vorschläge – müssen juristisch geprüft werden</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.csv" className="hidden" onChange={e=>setFile(e.target.files[0])} />
            <div>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Upload className="w-4 h-4" /> Dokument hochladen <span className="text-gray-400 text-xs">PDF, DOCX, TXT, CSV · max 20MB</span>
              </button>
              {file && <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">📄 {file.name} ({Math.round(file.size/1024)}KB) <button onClick={()=>setFile(null)}><X className="w-3 h-3" /></button></div>}
            </div>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[70px]" placeholder="Oder Text manuell einfügen..." value={text} onChange={e=>setText(e.target.value)} />
            <Button onClick={handleExtract} disabled={extracting||(!file&&!text.trim())||(extractMode==="ki"&&!dsgvo)} className="bg-gray-700 text-white hover:bg-gray-800 gap-2 text-sm">
              {extracting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analysiere...</> : "🔄 Analysieren"}
              {(file||text) && <span className="text-xs opacity-70">{file?"1":"0"} Datei(en)</span>}
            </Button>

            {extracted && (
              <div className="space-y-4 mt-2">
                {extracted.zusammenfassung && <p className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-3">{extracted.zusammenfassung}</p>}
                <div className="flex justify-end">
                  <Button size="sm" onClick={takeAll} className="bg-green-700 text-white hover:bg-green-800 text-xs">✓ Alle übernehmen</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[["EIGENE ARGUMENTE", extracted.eigene_argumente||[], "eigen"],["GEGENSEITE", extracted.gegenseite_argumente||[], "gegner"]].map(([label, items, side]) => (
                    <div key={side}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label} · {items.length}</p>
                      {items.map((a,i) => (
                        <div key={i} className="mb-2 text-xs">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-medium text-gray-800 flex-1">{a.titel}</span>
                            <span className="text-gray-400">{a.staerke||5}/10</span>
                            <button onClick={()=>take(a, side)} className="text-[10px] border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50">Übernehmen</button>
                          </div>
                          {a.typ && <p className="text-gray-400">{a.typ}</p>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {(extracted.widersprueche||[]).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">🔥 WIDERSPRÜCHE ({extracted.widersprueche.length})</p>
                    {extracted.widersprueche.map((w,i) => (
                      <div key={i} className="flex items-center justify-between text-xs mb-1">
                        <span>{w.titel}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{w.staerke||7}/10</span>
                          <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">ANGREIFBAR</span>
                          <button onClick={()=>take(w,"eigen","Widerspruch")} className="text-[10px] border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50">→ Strategie</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(extracted.druckmittel||[]).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">💪 DRUCKMITTEL ({extracted.druckmittel.length})</p>
                    {extracted.druckmittel.map((d,i) => (
                      <div key={i} className="flex items-center justify-between text-xs mb-1">
                        <span>{d.titel}</span>
                        <button onClick={()=>take(d,"eigen","Druckmittel")} className="text-[10px] border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50">Übernehmen</button>
                      </div>
                    ))}
                  </div>
                )}
                {(extracted.relevante_paragraphen||[]).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">📖 RELEVANTE PARAGRAPHEN ({extracted.relevante_paragraphen.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {extracted.relevante_paragraphen.map((p,i) => <span key={i} className="text-[10px] bg-gray-100 border border-gray-200 rounded px-2 py-0.5">{p} (ergänzt)</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(arg => (
          <div key={arg.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all group">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${arg.side==="eigen"?"bg-blue-50 text-blue-700":"bg-red-50 text-red-700"}`}>
                    {arg.side==="eigen"?"Eigen":"Gegner"}
                  </span>
                  {arg.type && <span className="text-[10px] text-gray-400">{arg.type}</span>}
                </div>
                <h4 className="font-medium text-gray-900 text-sm">{arg.title}</h4>
                {arg.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{arg.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${(arg.strength||5)*10}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{arg.strength||5}/10</span>
                  {arg.paragraphs?.length > 0 && <span className="text-[10px] text-gray-400">{arg.paragraphs.length} Beweise</span>}
                </div>
              </div>
              <button onClick={() => del(arg.id)} className="text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-10">
            Noch keine Argumente. Fügen Sie manuell hinzu oder extrahieren Sie aus einem Dokument.
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Trash2, Loader2, Sparkles, File, CheckCircle, RefreshCw, Copy, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import TabDokumenteAnalyseV2 from "./TabDokumenteAnalyseV2";

const DOC_TYPES = [
  { value: "klageschrift", label: "Klageschrift" },
  { value: "klageerweiterung", label: "Klageerweiterung" },
  { value: "erwiderung", label: "Klageerwiderung" },
  { value: "berufungsschrift", label: "Berufungsschrift" },
  { value: "schlussvortrag", label: "Schlussvortrag / Plädoyer" },
  { value: "vergleichsangebot", label: "Vergleichsangebot" },
];

export default function TabDokumente({ caseId, caseData }) {
  const [imported, setImported] = useState({});
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [args, setArgs] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [docType, setDocType] = useState("klageschrift");
  const [anwaltName, setAnwaltName] = useState("");
  const [kanzlei, setKanzlei] = useState("");
  const [mandant, setMandant] = useState("");
  const [gegner, setGegner] = useState("");
  const [freitext, setFreitext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("dokumente");
  const fileRef = useRef();

  useEffect(() => { loadDocs(); }, [caseId]);
  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
    ]).then(([a, e]) => { setArgs(a); setEvidence(e); });
  }, [caseId]);

  const loadDocs = async () => {
    setLoading(true);
    const docs = await base44.entities.Document.filter({ case_id: caseId });
    setDocuments(docs);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.create({
      case_id: caseId,
      title: file.name,
      file_url,
      file_type: file.type,
      description: "",
    });
    await loadDocs();
    setUploading(false);
    fileRef.current.value = "";
  };

  const handleAnalyze = async (doc) => {
    setAnalyzing(doc.id);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist juristischer Experte. Erstelle eine Executive Summary dieses Dokuments.
Extrahiere strukturiert:
1. Kurze Zusammenfassung (2-3 Sätze)
2. Wichtigste Argumente
3. Fristen (Titel, Datum im Format YYYY-MM-DD, Typ)
4. Beteiligte Personen (Name, Rolle)
5. Beweisfragen

Dokument: ${doc.title}`,
      file_urls: [doc.file_url],
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          arguments: { type: "array", items: { type: "string" } },
          fristen: { type: "array", items: { type: "object", properties: { titel: {type:"string"}, datum: {type:"string"}, typ: {type:"string"} } } },
          personen: { type: "array", items: { type: "object", properties: { name: {type:"string"}, rolle: {type:"string"} } } },
          beweisfragen: { type: "array", items: { type: "string" } }
        }
      }
    });
    await base44.entities.Document.update(doc.id, {
      ai_summary: result.summary,
      extracted_arguments: result.arguments,
      ai_raw: result,
    });
    await loadDocs();
    setAnalyzing(null);
  };

  const importFrist = async (caseId, frist) => {
    if (!frist.titel || !frist.datum) return;
    await base44.entities.Deadline.create({ case_id: caseId, title: frist.titel, due_date: frist.datum, frist_type: frist.typ || "Sonstige", status: "offen", side: "Eigene" });
  };

  const importPerson = async (caseId, person) => {
    if (!person.name) return;
    await base44.entities.Person.create({ case_id: caseId, name: person.name, role: person.rolle || "Partei" });
  };

  const handleDelete = async (id) => {
    await base44.entities.Document.delete(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    const eigene = args.filter(a => a.side === "eigen");
    const gegnerArgs = args.filter(a => a.side === "gegner");
    const evByArg = (argId) => evidence.filter(e => e.argument_id === argId);
    const argBlock = eigene.map((a, i) => {
      const evList = evByArg(a.id);
      return `${i + 1}. ${a.title} (Stärke: ${a.strength || 5}/10)\n   ${a.description || ""}\n   Beweise: ${evList.map(e => `[${e.title}]`).join(", ") || "keine"}`;
    }).join("\n\n");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener deutscher Rechtsanwalt und verfasst juristische Schriftsätze im professionellen deutschen Kanzleistil.

Erstelle einen vollständigen ${DOC_TYPES.find(d => d.value === docType)?.label || "Schriftsatz"} mit folgenden Angaben:

FALLDATEN:
- Fallname: ${caseData?.fallname || "[Fallname]"}
- Aktenzeichen: ${caseData?.aktenzeichen || "[Aktenzeichen]"}
- Gericht: ${caseData?.gericht || "[Gericht]"}
- Rechtsgebiet: ${caseData?.rechtsgebiet || "[Rechtsgebiet]"}
- Zentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || "[Rechtsfrage]"}
- Prozessziel: ${caseData?.prozessziel || "[Prozessziel]"}
- Prognose: ${caseData?.prognose || 0}%

PARTEIEN:
- Anwalt/Kanzlei: ${anwaltName || "[RA Name]"} / ${kanzlei || "[Kanzlei]"}
- Mandant (Kläger/Beklagter): ${mandant || "[Mandant]"}
- Gegner: ${gegner || "[Gegner]"}

EIGENE ARGUMENTE UND BEWEISE:
${argBlock || "Keine Argumente vorhanden"}

GEGNER-ARGUMENTE (zum Entkräften):
${gegnerArgs.map(a => `- ${a.title}: ${a.description || ""}`).join("\n") || "Keine"}

${freitext ? `ZUSÄTZLICHE ANWEISUNGEN:\n${freitext}` : ""}

ANFORDERUNGEN:
- Verwende professionellen juristischen deutschen Kanzleistil
- Füge Platzhalter [ANLAGE X] für Beweisdokumente ein
- Gliedere in: Rubrum, Antrag, Sachverhalt, Rechtliche Würdigung, Beweisangebote, Schluss
- Zitiere relevante Normen (§§)
- Markiere Platzhalter für variable Daten mit [...]`,
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          schriftsatz: { type: "string" },
          anlagen_liste: { type: "array", items: { type: "string" } },
          hinweise: { type: "string" }
        }
      }
    });
    setResult(res);
    setGenerating(false);
  };

  const copyText = () => {
    if (result?.schriftsatz) {
      navigator.clipboard.writeText(result.schriftsatz);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadTxt = () => {
    if (!result?.schriftsatz) return;
    const blob = new Blob([result.schriftsatz], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}_${caseData?.fallname || caseId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-gray-100 mb-4">
        <button onClick={() => setActiveTab("dokumente")} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${activeTab === "dokumente" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📄 Dokumente</button>
        <button onClick={() => setActiveTab("schriftsatz")} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all ${activeTab === "schriftsatz" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📝 Schriftsatz-Generator</button>
        <button onClick={() => setActiveTab("analyse_v2")} className={`px-4 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-1 ${activeTab === "analyse_v2" ? "border-green-600 text-green-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}><Zap className="w-3 h-3" /> KI-Analyse V2</button>
      </div>

      {activeTab === "dokumente" && (
      <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Dokumente</h2>
          <p className="text-xs text-gray-400 mt-0.5">PDF & Word-Dateien hochladen und KI-analysieren</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current.click()} disabled={uploading}
            className="bg-gray-900 text-white rounded-xl flex items-center gap-2 h-9 text-sm">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? "Hochladen..." : "Dokument hochladen"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" /></div>
      ) : documents.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Noch keine Dokumente</p>
          <p className="text-xs text-gray-400 mt-1">PDF oder Word-Datei hochladen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <File className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-sm text-gray-900 hover:text-blue-600 truncate block">{doc.title}</a>
                  {doc.file_type && <p className="text-[10px] text-gray-400 mt-0.5">{doc.file_type}</p>}

                  {doc.ai_summary && (
                    <div className="mt-3 bg-blue-50 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-semibold text-blue-700 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Executive Summary</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{doc.ai_summary}</p>
                      {doc.extracted_arguments?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">Argumente:</p>
                          <ul className="space-y-0.5">{doc.extracted_arguments.map((arg, i) => <li key={i} className="text-xs text-gray-600 flex gap-1"><span className="text-blue-400">•</span>{arg}</li>)}</ul>
                        </div>
                      )}
                      {doc.ai_raw?.fristen?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">📅 Extrahierte Fristen</p>
                          <div className="space-y-1">
                            {doc.ai_raw.fristen.map((f, i) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-2 py-1.5">
                                <span className="text-gray-700">{f.titel} {f.datum ? `· ${new Date(f.datum).toLocaleDateString('de-DE')}` : ''}</span>
                                {imported[`frist-${doc.id}-${i}`] ? (
                                  <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Übernommen</span>
                                ) : (
                                  <button onClick={async()=>{ await importFrist(caseId,f); setImported(prev=>({...prev,[`frist-${doc.id}-${i}`]:true})); }} className="text-[10px] border border-blue-200 text-blue-600 rounded px-2 py-0.5 hover:bg-blue-50">→ Fristen-Tab</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {doc.ai_raw?.personen?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">👤 Extrahierte Personen</p>
                          <div className="space-y-1">
                            {doc.ai_raw.personen.map((p, i) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-2 py-1.5">
                                <span className="text-gray-700">{p.name} <span className="text-gray-400">· {p.rolle}</span></span>
                                {imported[`person-${doc.id}-${i}`] ? (
                                  <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Übernommen</span>
                                ) : (
                                  <button onClick={async()=>{ await importPerson(caseId,p); setImported(prev=>({...prev,[`person-${doc.id}-${i}`]:true})); }} className="text-[10px] border border-blue-200 text-blue-600 rounded px-2 py-0.5 hover:bg-blue-50">→ Personen-Tab</button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {doc.ai_raw?.beweisfragen?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-blue-700 mb-1">🔍 Beweisfragen</p>
                          <ul className="space-y-0.5">{doc.ai_raw.beweisfragen.map((b,i) => <li key={i} className="text-xs text-gray-600">• {b}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!doc.ai_summary && (
                    <Button variant="ghost" size="sm" onClick={() => handleAnalyze(doc)}
                      disabled={analyzing === doc.id}
                      className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50">
                      {analyzing === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      KI-Analyse
                    </Button>
                  )}
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {activeTab === "analyse_v2" && (
        <TabDokumenteAnalyseV2 caseId={caseId} caseData={caseData} onDataImport={() => {}} />
      )}

      {activeTab === "schriftsatz" && (
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">📝 Schriftsatz-Generator</h2>
          <p className="text-xs text-gray-400 mt-0.5">KI erstellt einen vollständigen juristischen Schriftsatz basierend auf Ihren Argumenten und Beweisen</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Schriftsatz-Typ *</label>
              <div className="flex gap-2 flex-wrap">
                {DOC_TYPES.map(t => (
                  <button key={t.value} onClick={() => setDocType(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${docType === t.value ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Rechtsanwalt / Name</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Dr. Max Mustermann" value={anwaltName} onChange={e => setAnwaltName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Kanzlei</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Kanzlei Mustermann & Partner" value={kanzlei} onChange={e => setKanzlei(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mandant (Kläger/Beklagter)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Max Mustermann GmbH" value={mandant} onChange={e => setMandant(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Gegner</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Schmidt AG" value={gegner} onChange={e => setGegner(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Zusätzliche Anweisungen (optional)</label>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="z.B. Schwerpunkt auf §§ 280, 281 BGB, einstweilige Verfügung beantragen..." value={freitext} onChange={e => setFreitext(e.target.value)} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex gap-4 flex-wrap">
            <span><strong>{args.filter(a => a.side === "eigen").length}</strong> eigene Argumente</span>
            <span><strong>{args.filter(a => a.side === "gegner").length}</strong> Gegner-Argumente</span>
            <span><strong>{evidence.length}</strong> Beweismittel</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            ⚠️ Dieser Schriftsatz ist ein KI-Entwurf und muss vor Einreichung von einem Rechtsanwalt geprüft und angepasst werden. Platzhalter [...] und [ANLAGE X] sind zu ersetzen.
          </div>

          <Button onClick={generate} disabled={generating} className="w-full bg-gray-900 text-white rounded-xl gap-2">
            {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generiere Schriftsatz (Claude Sonnet)...</> : <><Sparkles className="w-4 h-4" /> Schriftsatz generieren</>}
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {result.hinweise && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-1">💡 Hinweise der KI</p>
                <p className="text-xs text-blue-800">{result.hinweise}</p>
              </div>
            )}

            {result.anlagen_liste?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">📎 Anlagenverzeichnis</p>
                <div className="space-y-1">
                  {result.anlagen_liste.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="text-gray-400 font-mono">Anlage {i + 1}:</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{DOC_TYPES.find(d => d.value === docType)?.label}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyText} className="gap-1 text-xs rounded-lg">
                    {copied ? <><Check className="w-3 h-3 text-green-500" /> Kopiert</> : <><Copy className="w-3 h-3" /> Kopieren</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadTxt} className="gap-1 text-xs rounded-lg">
                    ↓ TXT
                  </Button>
                </div>
              </div>
              <div className="p-5">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-xl p-4 max-h-[600px] overflow-y-auto">
                  {result.schriftsatz}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, Trash2, Loader2, Sparkles, File, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabDokumente({ caseId }) {
  const [imported, setImported] = useState({});
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadDocs(); }, [caseId]);

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

  return (
    <div className="space-y-4">
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
    </div>
  );
}
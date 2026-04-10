import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, RefreshCw, Loader2, X, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabDokumenteAnalyse({ caseId, caseData, onDataImport }) {
  const [docs, setDocs] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState("");
  const [analyzing_doc, setAnalyzing_doc] = useState(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [ocr_status, setOcr_status] = useState({});
  const fileRef = useRef(null);

  const loadDocs = async () => {
    setLoading(true);
    const data = await base44.entities.Document.filter({ case_id: caseId });
    setDocs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [caseId]);

  const analyzeDocument = async (doc) => {
    setAnalyzing_doc(doc.id);
    try {
      // OCR: Volltext aus PDF extrahieren (nur bei PDF)
      let ocrText = "";
      const isPdf = doc.file_type?.includes("pdf") || doc.file_url?.toLowerCase().endsWith(".pdf");
      if (isPdf && doc.file_url) {
        setOcr_status(prev => ({ ...prev, [doc.id]: "extracting" }));
        const ocrResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: doc.file_url,
          json_schema: {
            type: "object",
            properties: { volltext: { type: "string", description: "Kompletter Textinhalt des Dokuments" } }
          }
        });
        if (ocrResult.status === "success" && ocrResult.output?.volltext) {
          ocrText = ocrResult.output.volltext;
          await base44.entities.Document.update(doc.id, { ai_raw: { ...(doc.ai_raw || {}), ocr_text: ocrText } });
        }
        setOcr_status(prev => ({ ...prev, [doc.id]: "done" }));
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist ein Rechtsanwalt. Analysiere dieses juristische Dokument gründlich und extrahiere ALLE relevanten Informationen:\n\nFall: ${caseData?.fallname || ""}\nRechtsgebiet: ${caseData?.rechtsgebiet || ""}\nZentrale Frage: ${caseData?.zentrale_rechtsfrage || ""}\n\nDokument: ${doc.title}\n${ocrText ? `\nVOLLTEXT (OCR-extrahiert):\n${ocrText.slice(0, 8000)}` : ""}\n\nExtrahiere und strukturiere:\n1. ARGUMENTE (welche unterstützen unsere Position, welche die Gegenseite)\n2. BEWEISE (konkrete Fakten, Klauseln, Unterschriften)\n3. FRISTEN (Deadlines, Fristen)\n4. BETEILIGTE (Personen, Organisationen)\n5. LITERATUR & RECHTSPRECHUNG (falls erwähnt)\n6. VERTRÄGE / SONSTIGE (andere wichtige Dokumente/Informationen)`,
        file_urls: doc.file_url ? [doc.file_url] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            argumente: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  seite: { type: "string", enum: ["eigen", "gegner"] },
                  staerke: { type: "number" },
                  verlinkte_beweise: { type: "array", items: { type: "string" } },
                },
              },
            },
            beweise: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  beschreibung: { type: "string" },
                  typ: { type: "string" },
                  gewicht: { type: "number" },
                },
              },
            },
            fristen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  datum: { type: "string" },
                  fristtyp: { type: "string" },
                },
              },
            },
            personen: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  rolle: { type: "string" },
                  organisation: { type: "string" },
                },
              },
            },
            literatur_rspr: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titel: { type: "string" },
                  typ: { type: "string", enum: ["Literatur", "Rechtsprechung"] },
                  verweis: { type: "string" },
                },
              },
            },
            sonstiges: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
              },
            },
          },
        },
        model: "gemini_3_flash",
      });

      // Speichere Analyse in Dokument
      await base44.entities.Document.update(doc.id, {
        ai_summary: result.sonstiges?.zusammenfassung || "",
        ai_raw: result,
      });

      // Verteile Ergebnisse automatisch (markiert als KI-Vorschlag)
      if (result.argumente?.length > 0) {
        for (const arg of result.argumente) {
          await base44.entities.Argument.create({
            case_id: caseId,
            title: arg.titel,
            description: `${arg.beschreibung}\n\n[📄 KI-Vorschlag aus: ${doc.title}]`,
            side: arg.seite || "eigen",
            strength: arg.staerke || 5,
            type: "Rechtsargument",
            evidence_ids: [],
          });
        }
      }

      if (result.beweise?.length > 0) {
        for (const bew of result.beweise) {
          await base44.entities.Evidence.create({
            case_id: caseId,
            title: bew.titel,
            description: `${bew.beschreibung}\n\n[📄 KI-Vorschlag aus: ${doc.title}]`,
            type: bew.typ,
            weight: bew.gewicht || 5,
            source: doc.title,
          });
        }
      }

      if (result.fristen?.length > 0) {
        for (const frist of result.fristen) {
          await base44.entities.Deadline.create({
            case_id: caseId,
            title: frist.titel,
            frist_type: frist.fristtyp,
            due_date: frist.datum,
            side: "Eigene",
            status: "offen",
          });
        }
      }

      if (result.personen?.length > 0) {
        for (const person of result.personen) {
          await base44.entities.Person.create({
            case_id: caseId,
            name: person.name,
            role: person.rolle,
            organisation: person.organisation,
          });
        }
      }

      setResults((prev) => ({ ...prev, [doc.id]: result }));
      onDataImport && onDataImport();
    } catch (error) {
      console.error("Fehler bei Dokumentanalyse:", error);
      setResults((prev) => ({ ...prev, [doc.id]: { error: error.message } }));
    } finally {
      setAnalyzing_doc(null);
    }
  };

  const uploadDocument = async () => {
    if (!file || !docName.trim()) return;
    try {
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const newDoc = await base44.entities.Document.create({
        case_id: caseId,
        title: docName,
        file_url: uploadRes.file_url,
        file_type: file.type,
        description: "",
      });
      setFile(null);
      setDocName("");
      loadDocs();
      // Automatisch analysieren
      setTimeout(() => analyzeDocument(newDoc), 500);
    } catch (error) {
      console.error("Upload-Fehler:", error);
    }
  };

  const deleteDoc = async (id) => {
    await base44.entities.Document.delete(id);
    loadDocs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">📄 Dokument hochladen & analysieren</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Dokumentname (z.B. 'Vertrag vom 01.01.2024')"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Datei
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button onClick={uploadDocument} disabled={!file || !docName.trim()} className="bg-blue-600 text-white">
            Hochladen & Analysieren
          </Button>
        </div>
        {file && <p className="text-xs text-gray-500">📎 {file.name} ({Math.round(file.size / 1024)}KB)</p>}
      </div>

      {/* Documents */}
      <div className="space-y-3">
        {docs.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500 text-sm">
            Noch keine Dokumente hochgeladen
          </div>
        ) : (
          docs.map((doc) => {
            const analysis = results[doc.id];
            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900">{doc.title}</h4>
                    {doc.ai_summary && <p className="text-xs text-gray-600 mt-1">{doc.ai_summary.substring(0, 150)}...</p>}
                    <p className="text-xs text-gray-400 mt-1">{doc.file_type}</p>
                  </div>
                  <div className="flex gap-2">
                    {analysis ? (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        <Check className="w-3 h-3" /> Analysiert
                      </span>
                    ) : analyzing_doc === doc.id ? (
                      <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {ocr_status[doc.id] === "extracting" ? "OCR läuft..." : "Analysiere..."}
                      </span>
                    ) : (
                      <button
                        onClick={() => analyzeDocument(doc)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                      >
                        Analysieren
                      </button>
                    )}
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {analysis && !analysis.error && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {analysis.argumente?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📋 Argumente ({analysis.argumente.length})</p>
                        <div className="flex gap-1 flex-wrap">
                          {analysis.argumente.map((arg, i) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 rounded px-2 py-1">
                              {arg.titel}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.beweise?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">🔍 Beweise ({analysis.beweise.length})</p>
                        <div className="flex gap-1 flex-wrap">
                          {analysis.beweise.map((bew, i) => (
                            <span key={i} className="text-xs bg-white border border-blue-200 text-blue-700 rounded px-2 py-1">
                              {bew.titel}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.fristen?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">⏰ Fristen ({analysis.fristen.length})</p>
                        <div className="flex gap-1 flex-wrap">
                          {analysis.fristen.map((frist, i) => (
                            <span key={i} className="text-xs bg-white border border-amber-200 text-amber-700 rounded px-2 py-1">
                              {frist.titel} ({frist.datum})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.personen?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">👥 Personen ({analysis.personen.length})</p>
                        <div className="flex gap-1 flex-wrap">
                          {analysis.personen.map((person, i) => (
                            <span key={i} className="text-xs bg-white border border-purple-200 text-purple-700 rounded px-2 py-1">
                              {person.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.literatur_rspr?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📚 Literatur & Rechtsprechung ({analysis.literatur_rspr.length})</p>
                        <div className="space-y-1">
                          {analysis.literatur_rspr.map((lit, i) => (
                            <p key={i} className="text-xs text-gray-700">
                              [{lit.typ}] {lit.titel}: {lit.verweis}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-[10px] text-blue-700">
                        <strong>💡 KI-Vorschläge:</strong> Alle Daten wurden automatisch in die relevanten Tabs verteilt. Sie können diese manuell
                        korrigieren oder löschen.
                      </p>
                    </div>
                  </div>
                )}

                {analysis?.error && (
                  <div className="border-t border-gray-100 bg-red-50 p-4">
                    <p className="text-xs text-red-600 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Fehler: {analysis.error}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Calendar, FileText, Edit2, Trash2, Upload, X, Sparkles,
  ChevronDown, ChevronUp, Image, Video, Link2, AlertTriangle, CheckCircle, Clock, ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── CONFIG ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  vertrag:      { label: "Vertrag",       color: "#34C759", bg: "#e8f5e9" },
  zahlung:      { label: "Zahlung",       color: "#007AFF", bg: "#e3f2fd" },
  klage:        { label: "Klage",         color: "#FF3B30", bg: "#fce4ec" },
  urteil:       { label: "Urteil",        color: "#5856D6", bg: "#e8eaf6" },
  frist:        { label: "Frist",         color: "#FF9500", bg: "#fff8e1" },
  verhandlung:  { label: "Verhandlung",   color: "#AF52DE", bg: "#f3e5f5" },
  gutachten:    { label: "Gutachten",     color: "#00BCD4", bg: "#e0f7fa" },
  korrespondenz:{ label: "Korrespondenz", color: "#8BC34A", bg: "#f1f8e9" },
  foto:         { label: "Foto",          color: "#FF6B35", bg: "#fff3ee" },
  video:        { label: "Video",         color: "#C0392B", bg: "#fde8e8" },
  sonstiges:    { label: "Sonstiges",     color: "#9E9E9E", bg: "#fafafa" },
};

const IMPORTANCE_CONFIG = {
  kritisch: { label: "Kritisch", color: "#FF3B30" },
  hoch:     { label: "Hoch",     color: "#FF9500" },
  mittel:   { label: "Mittel",   color: "#007AFF" },
  niedrig:  { label: "Niedrig",  color: "#8E8E93" },
};

const MEDIA_TYPE = {
  image: ["jpg","jpeg","png","gif","webp","heic","bmp","tiff","svg"],
  video: ["mp4","mov","avi","mkv","webm","wmv","flv","m4v"],
  pdf:   ["pdf"],
};

function getMediaType(url = "", mime = "") {
  const ext = url.split(".").pop().toLowerCase().split("?")[0];
  if (MEDIA_TYPE.image.includes(ext) || mime.startsWith("image/")) return "image";
  if (MEDIA_TYPE.video.includes(ext) || mime.startsWith("video/")) return "video";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  return "file";
}

function MediaIcon({ type, size = 12 }) {
  if (type === "image") return <Image style={{ width: size, height: size, color: "#FF6B35" }} />;
  if (type === "video") return <Video style={{ width: size, height: size, color: "#C0392B" }} />;
  return <FileText style={{ width: size, height: size, color: "#555" }} />;
}

// ── RELATION BADGE ────────────────────────────────────────────────────────────

function RelationBadge({ type }) {
  if (type === "beweist")   return <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold flex items-center gap-0.5"><CheckCircle style={{width:9,height:9}}/> bestätigt</span>;
  if (type === "widerlegt") return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold flex items-center gap-0.5"><AlertTriangle style={{width:9,height:9}}/> widerlegt</span>;
  if (type === "überschneidet") return <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold flex items-center gap-0.5"><Link2 style={{width:9,height:9}}/> überschneidet</span>;
  return null;
}

// ── CONTRACT CHECKLIST ────────────────────────────────────────────────────────

function ContractChecklist({ checklist, onChange }) {
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Vertragspunkte / Erfüllung</p>
      {checklist.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
          <button onClick={() => onChange(checklist.map((c,j) => j===i ? {...c, erledigt: !c.erledigt} : c))}
            className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${item.erledigt ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
            {item.erledigt && <CheckCircle style={{width:10,height:10,color:"white",margin:"1px"}}/>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${item.erledigt ? "text-green-700 line-through" : item.faelligUeberschritten ? "text-red-600" : "text-gray-700"}`}>{item.titel}</p>
            {item.faellig && <p className="text-[10px] text-gray-400"><Clock style={{width:9,height:9,display:"inline"}}/> Fällig: {item.faellig}</p>}
            {item.faelligUeberschritten && !item.erledigt && <p className="text-[10px] text-red-500 font-semibold">⚠ Nicht eingehalten!</p>}
            {item.notiz && <p className="text-[10px] text-gray-500 italic">{item.notiz}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FILE ANNOTATION ───────────────────────────────────────────────────────────

function FileAnnotation({ doc, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [annotation, setAnnotation] = useState(doc.annotation || "");
  const mediaType = getMediaType(doc.file_url || "", doc.file_type || "");

  return (
    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
      <div className="flex items-start gap-2">
        <MediaIcon type={mediaType} size={14} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate max-w-[180px]">
              {doc.title || "Datei"}
            </a>
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#f0f0f0", color: "#888" }}>
              {mediaType === "image" ? "Foto" : mediaType === "video" ? "Video" : mediaType === "pdf" ? "PDF" : "Datei"}
            </span>
            {doc.ki_analysiert && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600">KI analysiert</span>}
            {doc.relation_type && <RelationBadge type={doc.relation_type} />}
          </div>

          {/* KI-Analyse-Ergebnis */}
          {doc.ki_analyse && (
            <div className="mt-1 text-[10px] text-violet-700 bg-violet-50 rounded px-2 py-1 whitespace-pre-wrap">{doc.ki_analyse}</div>
          )}

          {/* Video-Sequenz */}
          {doc.ki_sequenz && doc.ki_sequenz.length > 0 && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[9px] font-semibold text-gray-500 uppercase">Video-Ablauf (KI)</p>
              {doc.ki_sequenz.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] text-gray-600 border-l-2 pl-2" style={{ borderColor: "#C0392B" }}>
                  <span className="font-mono text-[9px] text-red-500 flex-shrink-0">{s.zeitstempel || `~${i}s`}</span>
                  <span>{s.beschreibung}</span>
                </div>
              ))}
            </div>
          )}

          {/* Annotation / Beweisfrage */}
          {editing ? (
            <div className="mt-1 flex gap-1">
              <textarea value={annotation} onChange={e => setAnnotation(e.target.value)} rows={2}
                placeholder="Was beweist dieses Foto/Video? Wo war die Person? Was tat sie?"
                className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded resize-none" />
              <div className="flex flex-col gap-1">
                <button onClick={() => { onUpdate({ ...doc, annotation }); setEditing(false); }}
                  className="text-[10px] px-2 py-1 bg-gray-900 text-white rounded">✓</button>
                <button onClick={() => setEditing(false)} className="text-[10px] px-2 py-1 bg-gray-100 rounded">✕</button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-start gap-1">
              {annotation ? (
                <p className="text-[10px] text-gray-600 italic flex-1">💬 {annotation}</p>
              ) : (
                <p className="text-[10px] text-gray-400 flex-1">Keine Annotation</p>
              )}
              <button onClick={() => setEditing(true)} className="text-[10px] text-blue-500 hover:text-blue-700 flex-shrink-0">
                <Edit2 style={{ width: 10, height: 10 }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EVENT CARD ────────────────────────────────────────────────────────────────

function EventCard({ event, onEdit, onDelete, onUpdateDoc, events }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.sonstiges;
  const imp = IMPORTANCE_CONFIG[event.importance] || IMPORTANCE_CONFIG.mittel;
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "–";

  // Count media types
  const docs = event.documents || [];
  const photos = docs.filter(d => getMediaType(d.file_url, d.file_type) === "image");
  const videos = docs.filter(d => getMediaType(d.file_url, d.file_type) === "video");

  // Related events (those that reference this one)
  const related = events.filter(e => e.id !== event.id && e.related_event_id === event.id);

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-3 h-3 rounded-full border-2 flex-shrink-0 z-10" style={{ borderColor: cat.color, background: cat.bg }} />
        <div className="flex-1 w-px min-h-4" style={{ background: "rgba(0,0,0,0.09)" }} />
      </div>

      {/* Event content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="bg-white rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm"
          style={{ borderColor: expanded ? cat.color + "50" : "rgba(0,0,0,0.08)" }}
          onClick={() => setExpanded(!expanded)}>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono" style={{ color: "#888" }}>{dateStr}</span>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: imp.color + "15", color: imp.color }}>{imp.label}</span>
                {photos.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 flex items-center gap-0.5"><Image style={{width:9,height:9}}/>{photos.length} Foto{photos.length > 1 ? "s" : ""}</span>}
                {videos.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 flex items-center gap-0.5"><Video style={{width:9,height:9}}/>{videos.length} Video{videos.length > 1 ? "s" : ""}</span>}
                {event.ki_generated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600">KI</span>}
              </div>
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{event.title}</h4>
              {event.description && !expanded && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
              )}
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
              {event.description && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Beschreibung</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {event.persons_involved?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Beteiligte</p>
                  <div className="flex flex-wrap gap-1">
                    {event.persons_involved.map((p, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract checklist */}
              {event.vertrag_checkliste?.length > 0 && (
                <ContractChecklist
                  checklist={event.vertrag_checkliste}
                  onChange={async (updated) => {
                    await base44.entities.TimelineEvent.update(event.id, { vertrag_checkliste: updated });
                  }}
                />
              )}

              {/* Files with annotations */}
              {docs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Dateien & Beweise</p>
                  <div className="space-y-1.5">
                    {docs.map((doc, i) => (
                      <FileAnnotation key={i} doc={doc} onUpdate={(updated) => {
                        const newDocs = docs.map((d, j) => j === i ? updated : d);
                        onUpdateDoc(event.id, newDocs);
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Related events */}
              {related.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Verknüpfte Ereignisse</p>
                  {related.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs text-gray-500">
                      <RelationBadge type={r.relation_type} />
                      <span>{r.title}</span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {r.date ? new Date(r.date).toLocaleDateString("de-DE") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-50">
                <button onClick={e => { e.stopPropagation(); onEdit(event); }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <Edit2 className="w-3 h-3" /> Bearbeiten
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(event.id); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                  <Trash2 className="w-3 h-3" /> Löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EVENT FORM ────────────────────────────────────────────────────────────────

function EventForm({ event, onSave, onCancel, allEvents }) {
  const [form, setForm] = useState(event || {
    date: new Date().toISOString().slice(0, 10),
    title: "",
    description: "",
    category: "sonstiges",
    importance: "mittel",
    persons_involved: [],
    documents: [],
    related_event_id: "",
    relation_type: "",
    vertrag_checkliste: [],
  });
  const [uploading, setUploading] = useState(false);
  const [analyzingMedia, setAnalyzingMedia] = useState(false);
  const [personInput, setPersonInput] = useState("");
  const [newCheckItem, setNewCheckItem] = useState("");

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newDocs = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newDocs.push({ title: file.name, file_url, file_type: file.type });
    }
    setForm(f => ({ ...f, documents: [...(f.documents || []), ...newDocs] }));
    setUploading(false);
  };

  const analyzeMediaWithKI = async () => {
    const docs = form.documents || [];
    if (!docs.length) return;
    setAnalyzingMedia(true);
    const updatedDocs = await Promise.all(docs.map(async (doc) => {
      const type = getMediaType(doc.file_url || "", doc.file_type || "");
      if (type === "image") {
        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Analysiere dieses Foto für eine rechtliche Fallakte. Beschreibe präzise:
1. Was ist auf dem Foto zu sehen?
2. Welche Personen sind sichtbar und was tun sie?
3. Welche Zeit/Datum ist erkennbar?
4. Welchen rechtlichen Beweiswert hat das Foto (was beweist oder widerlegt es)?
5. Wo wurde das Foto aufgenommen (Ort, Umgebung)?
Sei konkret und juristisch präzise.`,
            file_urls: [doc.file_url],
            model: "claude_sonnet_4_6",
          });
          return { ...doc, ki_analyse: typeof result === "string" ? result : JSON.stringify(result), ki_analysiert: true };
        } catch { return doc; }
      }
      if (type === "video") {
        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Analysiere dieses Video für eine rechtliche Fallakte. Beschreibe:
1. Genaue chronologische Abfolge der Ereignisse im Video (mit Zeitangaben wenn möglich)
2. Welche Personen sind sichtbar und was tun sie wann und wo?
3. Welchen Tathergang zeigt das Video?
4. Welchen rechtlichen Beweiswert hat das Video?
Erstelle eine Sequenz-Liste im Format: ZEITSTEMPEL | BESCHREIBUNG`,
            file_urls: [doc.file_url],
            response_json_schema: {
              type: "object",
              properties: {
                zusammenfassung: { type: "string" },
                sequenz: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      zeitstempel: { type: "string" },
                      beschreibung: { type: "string" }
                    }
                  }
                },
                beweiswert: { type: "string" }
              }
            },
            model: "claude_sonnet_4_6",
          });
          return {
            ...doc,
            ki_analyse: result.zusammenfassung + (result.beweiswert ? `\n\nBeweiswert: ${result.beweiswert}` : ""),
            ki_sequenz: result.sequenz || [],
            ki_analysiert: true
          };
        } catch { return doc; }
      }
      return doc;
    }));
    setForm(f => ({ ...f, documents: updatedDocs }));
    setAnalyzingMedia(false);
  };

  const addPerson = () => {
    if (personInput.trim()) {
      setForm(f => ({ ...f, persons_involved: [...(f.persons_involved || []), personInput.trim()] }));
      setPersonInput("");
    }
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const item = { titel: newCheckItem.trim(), erledigt: false, faellig: "", faelligUeberschritten: false, notiz: "" };
    setForm(f => ({ ...f, vertrag_checkliste: [...(f.vertrag_checkliste || []), item] }));
    setNewCheckItem("");
  };

  const hasMedia = (form.documents || []).some(d => {
    const t = getMediaType(d.file_url, d.file_type);
    return t === "image" || t === "video";
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">{event ? "Ereignis bearbeiten" : "Neues Ereignis"}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Datum *</label>
          <input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Kategorie</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Titel *</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="z.B. Vertragliche Vereinbarung" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Beschreibung</label>
        <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Parteien, Zusammenfassung, Details..." rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Wichtigkeit</label>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(IMPORTANCE_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setForm(f => ({ ...f, importance: k }))}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all"
              style={{
                background: form.importance === k ? v.color + "15" : "transparent",
                borderColor: form.importance === k ? v.color : "rgba(0,0,0,0.1)",
                color: form.importance === k ? v.color : "#666",
                fontWeight: form.importance === k ? 600 : 400,
              }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Persons */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Beteiligte Personen</label>
        <div className="flex gap-2 mb-2">
          <input value={personInput} onChange={e => setPersonInput(e.target.value)}
            placeholder="Name hinzufügen" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPerson())} />
          <Button size="sm" variant="outline" onClick={addPerson} className="rounded-lg">+</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {(form.persons_involved || []).map((p, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded flex items-center gap-1">
              {p}
              <button onClick={() => setForm(f => ({ ...f, persons_involved: f.persons_involved.filter((_, j) => j !== i) }))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Dateien / Fotos / Videos</label>
        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">{uploading ? "Lädt hoch..." : "Dokumente, Fotos oder Videos auswählen"}</span>
          <input type="file" multiple className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.pptx,.ppt,.odt,.ods,.rtf" onChange={handleFileUpload} disabled={uploading} />
        </label>

        {hasMedia && (
          <Button size="sm" variant="outline" onClick={analyzeMediaWithKI} disabled={analyzingMedia}
            className="mt-2 rounded-lg text-xs gap-1 text-violet-700 border-violet-200">
            <Sparkles className="w-3 h-3" /> {analyzingMedia ? "KI analysiert Fotos/Videos…" : "Fotos & Videos mit KI analysieren"}
          </Button>
        )}

        {(form.documents || []).length > 0 && (
          <div className="mt-2 space-y-1.5">
            {form.documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MediaIcon type={getMediaType(doc.file_url, doc.file_type)} size={13} />
                  <span className="text-xs text-gray-700 truncate">{doc.title}</span>
                  {doc.ki_analysiert && <span className="text-[9px] px-1 py-0.5 rounded bg-violet-100 text-violet-600">KI ✓</span>}
                </div>
                <div className="flex items-center gap-2">
                  <select value={doc.relation_type || ""} onChange={e => {
                    const d = [...form.documents];
                    d[i] = { ...d[i], relation_type: e.target.value };
                    setForm(f => ({ ...f, documents: d }));
                  }} className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded bg-white text-gray-600">
                    <option value="">Relation...</option>
                    <option value="beweist">beweist Ereignis</option>
                    <option value="widerlegt">widerlegt</option>
                    <option value="überschneidet">überschneidet</option>
                  </select>
                  <button onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, j) => j !== i) }))}
                    className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Relation to other event */}
      {allEvents?.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">Verknüpft mit Ereignis</label>
            <select value={form.related_event_id || ""} onChange={e => setForm(f => ({ ...f, related_event_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="">Keine Verknüpfung</option>
              {allEvents.filter(e => e.id !== event?.id).map(e => (
                <option key={e.id} value={e.id}>{e.date ? new Date(e.date).toLocaleDateString("de-DE") : "?"} – {e.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase block mb-1">Beziehungstyp</label>
            <select value={form.relation_type || ""} onChange={e => setForm(f => ({ ...f, relation_type: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
              <option value="">Typ wählen</option>
              <option value="beweist">bestätigt/beweist</option>
              <option value="widerlegt">widerlegt</option>
              <option value="überschneidet">überschneidet sich</option>
            </select>
          </div>
        </div>
      )}

      {/* Contract checklist */}
      {(form.category === "vertrag" || form.vertrag_checkliste?.length > 0) && (
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Vertragspunkte / Erfüllungsliste</label>
          <div className="space-y-1.5 mb-2">
            {(form.vertrag_checkliste || []).map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                <button onClick={() => {
                  const c = [...form.vertrag_checkliste];
                  c[i] = { ...c[i], erledigt: !c[i].erledigt };
                  setForm(f => ({ ...f, vertrag_checkliste: c }));
                }} className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${item.erledigt ? "bg-green-500 border-green-500" : "border-gray-300"}`} />
                <div className="flex-1 space-y-1">
                  <input value={item.titel} onChange={e => {
                    const c = [...form.vertrag_checkliste];
                    c[i] = { ...c[i], titel: e.target.value };
                    setForm(f => ({ ...f, vertrag_checkliste: c }));
                  }} className="w-full text-xs border-b border-gray-200 bg-transparent pb-0.5" />
                  <div className="flex gap-2">
                    <input type="date" value={item.faellig || ""} onChange={e => {
                      const c = [...form.vertrag_checkliste];
                      const today = new Date().toISOString().slice(0, 10);
                      c[i] = { ...c[i], faellig: e.target.value, faelligUeberschritten: e.target.value < today };
                      setForm(f => ({ ...f, vertrag_checkliste: c }));
                    }} className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded" />
                    <input value={item.notiz || ""} onChange={e => {
                      const c = [...form.vertrag_checkliste];
                      c[i] = { ...c[i], notiz: e.target.value };
                      setForm(f => ({ ...f, vertrag_checkliste: c }));
                    }} placeholder="Notiz..." className="flex-1 text-[10px] px-1.5 py-0.5 border border-gray-200 rounded" />
                    <button onClick={() => setForm(f => ({ ...f, vertrag_checkliste: f.vertrag_checkliste.filter((_, j) => j !== i) }))}
                      className="text-gray-300 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
              placeholder="z.B. Lieferung bis 15.01. (§4 Vertrag)" className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCheckItem())} />
            <Button size="sm" variant="outline" onClick={addCheckItem} className="rounded-lg text-xs">+ Punkt</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} disabled={!form.date || !form.title.trim()} className="bg-gray-900 text-white rounded-lg flex-1">
          {event ? "Speichern" : "Ereignis erstellen"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-lg">Abbrechen</Button>
      </div>
    </div>
  );
}

// ── CONFLICT LEGEND ───────────────────────────────────────────────────────────

function ConflictLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 bg-white rounded-lg px-3 py-2 border border-gray-100">
      <span className="flex items-center gap-1"><CheckCircle style={{width:10,height:10,color:"#34C759"}}/> bestätigt/beweist</span>
      <span className="flex items-center gap-1"><AlertTriangle style={{width:10,height:10,color:"#FF3B30"}}/> widerlegt</span>
      <span className="flex items-center gap-1"><Link2 style={{width:10,height:10,color:"#FF9500"}}/> überschneidet sich</span>
      <span className="flex items-center gap-1"><Image style={{width:10,height:10,color:"#FF6B35"}}/> Foto</span>
      <span className="flex items-center gap-1"><Video style={{width:10,height:10,color:"#C0392B"}}/> Video (KI-Sequenz)</span>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function TabZeitstrahl({ caseId, caseData, kiMode }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { load(); }, [caseId]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.TimelineEvent.filter({ case_id: caseId }, "date");
    setEvents(data);
    setLoading(false);
  };

  const handleSave = async (form) => {
    if (editEvent) {
      await base44.entities.TimelineEvent.update(editEvent.id, form);
    } else {
      await base44.entities.TimelineEvent.create({ ...form, case_id: caseId });
    }
    setShowForm(false);
    setEditEvent(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.TimelineEvent.delete(id);
    load();
  };

  const handleUpdateDoc = async (eventId, newDocs) => {
    await base44.entities.TimelineEvent.update(eventId, { documents: newDocs });
    setEvents(evs => evs.map(e => e.id === eventId ? { ...e, documents: newDocs } : e));
  };

  const generateFromDocuments = async () => {
    setGenerating(true);
    const docs = await base44.entities.Document.filter({ case_id: caseId });
    if (!docs.length) { setGenerating(false); return; }

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analysiere die folgenden Falldokumente und extrahiere alle relevanten Ereignisse für einen Zeitstrahl.

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}

Dokumente:
${docs.map(d => `- ${d.title}: ${d.ai_summary || d.description || "keine Zusammenfassung"}`).join("\n")}

Erkenne auch Vertragsvereinbarungen mit Fristen und ob sie eingehalten wurden (vertrag_checkliste).
Für jeden erkannten Vertrag: erstelle eine Checkliste mit Punkten (was wurde vereinbart, wann fällig, ob erfüllt).

Wichtig: Erstelle separate Ereignisse für Dokument vs. Foto vs. Video wenn erkennbar.
Markiere Widersprüche zwischen Dokumenten mit relation_type "widerlegt".`,
      response_json_schema: {
        type: "object",
        properties: {
          ereignisse: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                importance: { type: "string" },
                persons_involved: { type: "array", items: { type: "string" } },
                vertrag_checkliste: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      titel: { type: "string" },
                      faellig: { type: "string" },
                      erledigt: { type: "boolean" },
                      faelligUeberschritten: { type: "boolean" },
                      notiz: { type: "string" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      model: "claude_sonnet_4_6"
    });

    const liste = res?.ereignisse || [];
    for (const ev of liste) {
      await base44.entities.TimelineEvent.create({
        case_id: caseId,
        date: ev.date,
        title: ev.title,
        description: ev.description,
        category: ev.category || "sonstiges",
        importance: ev.importance || "mittel",
        persons_involved: ev.persons_involved || [],
        vertrag_checkliste: ev.vertrag_checkliste || [],
        ki_generated: true,
      });
    }
    load();
    setGenerating(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Fallzeitstrahl</h2>
          <p className="text-xs text-gray-400 mt-0.5">Dokumente, Fotos, Videos — chronologisch mit KI-Analyse & Beweisverknüpfung</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {kiMode && (
            <Button size="sm" variant="outline" onClick={generateFromDocuments} disabled={generating} className="rounded-lg text-xs gap-1">
              <Sparkles className="w-3 h-3" /> {generating ? "Generiere..." : "Aus Dokumenten generieren"}
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditEvent(null); setShowForm(true); }} className="bg-gray-900 text-white rounded-lg text-xs gap-1">
            <Plus className="w-3 h-3" /> Ereignis hinzufügen
          </Button>
        </div>
      </div>

      <ConflictLegend />

      {showForm && (
        <EventForm
          event={editEvent}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditEvent(null); }}
          allEvents={events}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Calendar className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Noch keine Ereignisse erfasst</p>
          <p className="text-xs text-gray-400 mt-1">Fügen Sie Ereignisse manuell hinzu oder lassen Sie sie aus Dokumenten generieren.</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-5">
          {events.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              events={events}
              onEdit={ev => { setEditEvent(ev); setShowForm(true); }}
              onDelete={handleDelete}
              onUpdateDoc={handleUpdateDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
}
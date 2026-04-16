import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Calendar, FileText, Edit2, Trash2, Upload, X, RefreshCw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_CONFIG = {
  vertrag: { label: "Vertrag", color: "#34C759", bg: "#e8f5e9" },
  zahlung: { label: "Zahlung", color: "#007AFF", bg: "#e3f2fd" },
  klage: { label: "Klage", color: "#FF3B30", bg: "#fce4ec" },
  urteil: { label: "Urteil", color: "#5856D6", bg: "#e8eaf6" },
  frist: { label: "Frist", color: "#FF9500", bg: "#fff8e1" },
  verhandlung: { label: "Verhandlung", color: "#AF52DE", bg: "#f3e5f5" },
  gutachten: { label: "Gutachten", color: "#00BCD4", bg: "#e0f7fa" },
  korrespondenz: { label: "Korrespondenz", color: "#8BC34A", bg: "#f1f8e9" },
  sonstiges: { label: "Sonstiges", color: "#9E9E9E", bg: "#fafafa" },
};

const IMPORTANCE_CONFIG = {
  kritisch: { label: "Kritisch", color: "#FF3B30" },
  hoch: { label: "Hoch", color: "#FF9500" },
  mittel: { label: "Mittel", color: "#007AFF" },
  niedrig: { label: "Niedrig", color: "#8E8E93" },
};

function EventCard({ event, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[event.category] || CATEGORY_CONFIG.sonstiges;
  const imp = IMPORTANCE_CONFIG[event.importance] || IMPORTANCE_CONFIG.mittel;
  const dateStr = event.date ? new Date(event.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";

  return (
    <div className="relative flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full flex-shrink-0 border-2" style={{ borderColor: cat.color, background: cat.bg }} />
        <div className="flex-1 w-px" style={{ background: "rgba(0,0,0,0.1)" }} />
      </div>

      {/* Event content */}
      <div className="flex-1 pb-5">
        <div
          className="bg-white rounded-lg border p-4 transition-all cursor-pointer"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono" style={{ color: "#888" }}>{dateStr}</span>
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: cat.bg, color: cat.color, fontWeight: 500 }}>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: imp.color + "15", color: imp.color, fontWeight: 500 }}>{imp.label}</span>
                {event.ki_generated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-600">KI</span>}
              </div>
              <h4 className="text-sm font-semibold text-gray-900 leading-snug">{event.title}</h4>
              {event.description && !expanded && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
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
              {event.documents?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Dokumente</p>
                  <div className="space-y-1">
                    {event.documents.map((doc, i) => (
                      <a key={i} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                        <FileText className="w-3 h-3" /> {doc.title || `Dokument ${i + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
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

function EventForm({ event, onSave, onCancel }) {
  const [form, setForm] = useState(event || {
    date: new Date().toISOString().slice(0, 10),
    title: "",
    description: "",
    category: "sonstiges",
    importance: "mittel",
    persons_involved: [],
    documents: [],
  });
  const [uploading, setUploading] = useState(false);
  const [personInput, setPersonInput] = useState("");

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newDocs = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newDocs.push({ title: file.name, file_url, file_type: file.type });
    }
    setForm({ ...form, documents: [...(form.documents || []), ...newDocs] });
    setUploading(false);
  };

  const addPerson = () => {
    if (personInput.trim()) {
      setForm({ ...form, persons_involved: [...(form.persons_involved || []), personInput.trim()] });
      setPersonInput("");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">{event ? "Ereignis bearbeiten" : "Neues Ereignis"}</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Datum *</label>
          <input type="date" value={form.date || ""} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase block mb-1">Kategorie</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white">
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Titel *</label>
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="z.B. Vertragliche Vereinbarung" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Beschreibung</label>
        <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Parteien, Zusammenfassung, Details..." rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none" />
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Wichtigkeit</label>
        <div className="flex gap-2">
          {Object.entries(IMPORTANCE_CONFIG).map(([k, v]) => (
            <button key={k} onClick={() => setForm({ ...form, importance: k })}
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

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Beteiligte Personen</label>
        <div className="flex gap-2 mb-2">
          <input value={personInput} onChange={e => setPersonInput(e.target.value)} placeholder="Name hinzufügen"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPerson())} />
          <Button size="sm" variant="outline" onClick={addPerson} className="rounded-lg">+</Button>
        </div>
        {form.persons_involved?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.persons_involved.map((p, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded flex items-center gap-1">
                {p}
                <button onClick={() => setForm({ ...form, persons_involved: form.persons_involved.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] text-gray-500 uppercase block mb-1">Dokumente anhängen</label>
        <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">{uploading ? "Lädt hoch..." : "Dateien auswählen"}</span>
          <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploading} />
        </label>
        {form.documents?.length > 0 && (
          <div className="mt-2 space-y-1">
            {form.documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <span className="flex items-center gap-1 text-gray-700"><FileText className="w-3 h-3" /> {doc.title}</span>
                <button onClick={() => setForm({ ...form, documents: form.documents.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={() => onSave(form)} disabled={!form.date || !form.title.trim()} className="bg-gray-900 text-white rounded-lg flex-1">
          {event ? "Speichern" : "Ereignis erstellen"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-lg">Abbrechen</Button>
      </div>
    </div>
  );
}

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

  const handleEdit = (ev) => {
    setEditEvent(ev);
    setShowForm(true);
  };

  const generateFromDocuments = async () => {
    setGenerating(true);
    try {
      const docs = await base44.entities.Document.filter({ case_id: caseId });
      if (docs.length === 0) {
        alert("Keine Dokumente im Fall vorhanden.");
        setGenerating(false);
        return;
      }

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysiere die folgenden Falldokumente und extrahiere alle relevanten Ereignisse für einen Zeitstrahl.

Fall: ${caseData?.fallname || ""}
Rechtsgebiet: ${caseData?.rechtsgebiet || ""}

Dokumente:
${docs.map(d => `- ${d.title}: ${d.ai_summary || d.description || "keine Zusammenfassung"}`).join("\n")}

Erstelle eine Liste von Ereignissen im JSON-Format:
[
  {
    "date": "YYYY-MM-DD",
    "title": "Kurzer Titel",
    "description": "Detaillierte Beschreibung mit Parteien und Zusammenfassung",
    "category": "vertrag|zahlung|klage|urteil|frist|verhandlung|gutachten|korrespondenz|sonstiges",
    "importance": "kritisch|hoch|mittel|niedrig",
    "persons_involved": ["Person 1", "Person 2"]
  }
]

Gib NUR valides JSON zurück, keine Erklärungen.`,
        model: "claude_sonnet_4_6"
      });

      let parsed;
      try {
        const match = (typeof res === "string" ? res : JSON.stringify(res)).match(/\[[\s\S]*\]/);
        parsed = JSON.parse(match ? match[0] : res);
      } catch {
        parsed = [];
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const ev of parsed) {
          await base44.entities.TimelineEvent.create({
            case_id: caseId,
            date: ev.date,
            title: ev.title,
            description: ev.description,
            category: ev.category || "sonstiges",
            importance: ev.importance || "mittel",
            persons_involved: ev.persons_involved || [],
            ki_generated: true,
          });
        }
        load();
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Fallzeitstrahl</h2>
          <p className="text-xs text-gray-400 mt-0.5">Chronologische Ereignisse mit Dokumenten und Details</p>
        </div>
        <div className="flex items-center gap-2">
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

      {showForm && (
        <EventForm event={editEvent} onSave={handleSave} onCancel={() => { setShowForm(false); setEditEvent(null); }} />
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
            <EventCard key={ev.id} event={ev} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
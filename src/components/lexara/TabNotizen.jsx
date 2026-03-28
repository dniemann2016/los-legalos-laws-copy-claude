import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill from "react-quill";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
    ["blockquote", "code-block"],
    ["clean"],
  ],
};

const formats = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background",
  "list", "bullet", "indent",
  "blockquote", "code-block",
];

export default function TabNotizen({ caseId, caseData, onUpdate }) {
  const [notes, setNotes] = useState(caseData?.notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotes(caseData?.notes || "");
  }, [caseData]);

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.Case.update(caseId, { notes });
    onUpdate(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Fallnotizen</h2>
          <p className="text-xs text-gray-400 mt-0.5">Formatierte interne Notizen, Checklisten und wichtige Fakten</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Speichern..." : saved ? "✓ Gespeichert" : "Speichern"}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <ReactQuill
          theme="snow"
          value={notes}
          onChange={setNotes}
          modules={modules}
          formats={formats}
          placeholder="Notizen, Checklisten, wichtige Fakten..."
          style={{ minHeight: 420 }}
        />
      </div>

      <style>{`
        .ql-container { font-family: inherit; font-size: 14px; border: none !important; }
        .ql-toolbar { border: none !important; border-bottom: 1px solid #f3f4f6 !important; background: #fafafa; }
        .ql-editor { min-height: 380px; padding: 16px 20px; }
        .ql-editor.ql-blank::before { color: #9ca3af; font-style: normal; }
        .ql-editor ul[data-checked] li { pointer-events: all; }
      `}</style>
    </div>
  );
}
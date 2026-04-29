import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Scale, File } from "lucide-react";
import FallAbschlussFragebogen from "./FallAbschlussFragebogen";
import JudgeComparisonModal from "./JudgeComparisonModal";
import RechtsgebietZusatzfelder, { RECHTSGEBIETE } from "./RechtsgebietFelder";

export default function TabBasisdaten({ caseId, caseData, onUpdate }) {
  const [form, setForm] = useState({
    fallname: caseData?.fallname || "",
    aktenzeichen: caseData?.aktenzeichen || "",
    gericht: caseData?.gericht || "",
    rechtsgebiet: caseData?.rechtsgebiet || "",
    prozessziel: caseData?.prozessziel || "",
    status: caseData?.status || "Aktiv",
    instanz: caseData?.instanz || "Erstinstanz",
    zentrale_rechtsfrage: caseData?.zentrale_rechtsfrage || "",
    richter_name: caseData?.richter_name || "",
    richter_klaeger_rate: caseData?.richter_klaeger_rate || 50,
  });
  const [rechtsgebietMeta, setRechtsgebietMeta] = useState(caseData?.ki_berater_result?._rg_meta || {});
  const [saving, setSaving] = useState(false);
  const [showFragebogen, setShowFragebogen] = useState(false);
  const [showJudgeComparison, setShowJudgeComparison] = useState(false);
  const [caseEntities, setCaseEntities] = useState({ args: [], evidence: [], deadlines: [], persons: [] });
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Argument.filter({ case_id: caseId }),
      base44.entities.Evidence.filter({ case_id: caseId }),
      base44.entities.Deadline.filter({ case_id: caseId }),
      base44.entities.Person.filter({ case_id: caseId }),
      base44.entities.Document.filter({ case_id: caseId }),
    ]).then(([a, e, d, p, docs]) => {
      setCaseEntities({ args: a, evidence: e, deadlines: d, persons: p });
      setDocuments(docs.slice(-10).reverse());
    });
  }, [caseId]);

  // Auto-save with debounce
  useEffect(() => {
    setSaving(true);
    const timer = setTimeout(async () => {
      try {
        const ki_berater_result = { ...(caseData?.ki_berater_result || {}), _rg_meta: rechtsgebietMeta };
        const updated = await base44.entities.Case.update(caseId, { ...form, ki_berater_result });
        onUpdate(updated);
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => {
      clearTimeout(timer);
      setSaving(false);
    };
  }, [form, rechtsgebietMeta, caseId, onUpdate]);

  const handleSave = async () => {
    setSaving(true);
    const ki_berater_result = { ...(caseData?.ki_berater_result || {}), _rg_meta: rechtsgebietMeta };
    const updated = await base44.entities.Case.update(caseId, { ...form, ki_berater_result });
    onUpdate(updated);
    setSaving(false);
    // Trigger questionnaire when status set to Abgeschlossen
    if (form.status === "Abgeschlossen" && caseData?.status !== "Abgeschlossen") {
      setShowFragebogen(true);
    }
  };

  const f = (label, field, type = "text", options, placeholder) => (
    <div key={field}>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      {options ? (
        <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder={placeholder} value={form[field]}
          onChange={e => setForm({ ...form, [field]: type === "number" ? +e.target.value : e.target.value })} />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 Falldaten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {f("Fallname","fallname","text",null,"z.B. Muster ./. GmbH")}
          {f("Aktenzeichen","aktenzeichen","text",null,"z.B. LG-2024-1234")}
          {f("Gericht","gericht","text",null,"z.B. LG Hamburg")}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Rechtsgebiet</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={form.rechtsgebiet}
              onChange={e => setForm({ ...form, rechtsgebiet: e.target.value })}
            >
              <option value="">– bitte wählen –</option>
              {RECHTSGEBIETE.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {f("Prozessziel","prozessziel","text",null,"z.B. Unterlassung + Schadensersatz")}
          {f("Status","status","text",["Aktiv","Vorbereitung","Abgeschlossen","Ruhend"])}
          {f("Instanz","instanz","text",["Erstinstanz","Berufung","Revision"])}
        </div>
      </div>

      {form.rechtsgebiet && (
        <RechtsgebietZusatzfelder
          rechtsgebiet={form.rechtsgebiet}
          meta={rechtsgebietMeta}
          onChange={setRechtsgebietMeta}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">ZENTRALE RECHTSFRAGE</h3>
        <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
          placeholder='„Liegt eine Verwechslungsgefahr i.S.d. §14 MarkenG vor?"'
          value={form.zentrale_rechtsfrage}
          onChange={e => setForm({ ...form, zentrale_rechtsfrage: e.target.value })} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">👨‍⚖️ Richter-Daten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {f("Richter Name","richter_name","text",null,"z.B. Dr. Hoffmann")}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Klägerquote % ({form.richter_klaeger_rate}%)</label>
            <input type="range" min={0} max={100} value={form.richter_klaeger_rate}
              onChange={e => setForm({ ...form, richter_klaeger_rate: +e.target.value })} className="w-full" />
          </div>
        </div>
        <button onClick={() => setShowJudgeComparison(true)} className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-medium transition-colors">
          <Scale className="w-3.5 h-3.5" />
          Richterwechsel simulieren
        </button>
      </div>

      {documents.length > 0 && (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📄 Zuletzt hinzugefügte Dokumente</h3>
        <div className="space-y-2">
          {documents.map(doc => (
            <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <File className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{doc.title}</p>
                {doc.ai_summary && <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{doc.ai_summary}</p>}
              </div>
            </a>
          ))}
        </div>
      </div>
      )}

      {saving && (
        <div className="flex justify-end">
          <p className="text-xs text-gray-400">Speichern...</p>
        </div>
      )}

      {showFragebogen && (
        <FallAbschlussFragebogen
          caseData={{ ...caseData, id: caseId }}
          onClose={() => setShowFragebogen(false)}
          onSaved={() => setShowFragebogen(false)}
        />
      )}

      <JudgeComparisonModal
        isOpen={showJudgeComparison}
        onClose={() => setShowJudgeComparison(false)}
        currentJudgeName={form.richter_name}
        caseId={caseId}
        caseData={caseData}
        args={caseEntities.args}
        evidence={caseEntities.evidence}
        deadlines={caseEntities.deadlines}
        persons={caseEntities.persons}
      />
    </div>
  );
}
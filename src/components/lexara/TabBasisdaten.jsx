import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.Case.update(caseId, form);
    onUpdate(updated);
    setSaving(false);
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
          {f("Rechtsgebiet","rechtsgebiet","text",null,"z.B. Markenrecht")}
          {f("Prozessziel","prozessziel","text",null,"z.B. Unterlassung + Schadensersatz")}
          {f("Status","status","text",["Aktiv","Vorbereitung","Abgeschlossen","Ruhend"])}
          {f("Instanz","instanz","text",["Erstinstanz","Berufung","Revision"])}
        </div>
      </div>

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
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gray-900 text-white rounded-xl px-6">
          {saving ? "Speichern..." : "Falldaten speichern"}
        </Button>
      </div>
    </div>
  );
}
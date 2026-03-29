import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, ChevronDown, ChevronUp, CheckCircle2, Star } from "lucide-react";

const JaNein = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-700">{label}</span>
    <div className="flex gap-2">
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          value === true ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
      >
        Ja
      </button>
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          value === false ? "bg-red-100 text-red-700 ring-1 ring-red-300" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
        }`}
      >
        Nein
      </button>
    </div>
  </div>
);

const TextFeld = ({ label, value, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
    <textarea
      value={value || ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
    />
  </div>
);

const Sektion = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="bg-white px-4 pb-4 space-y-0">{children}</div>}
    </div>
  );
};

export default function FallAbschlussFragebogen({ caseData, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const speichern = async () => {
    setSaving(true);
    await base44.entities.CaseQuestionnaire.create({
      case_id: caseData.id,
      case_name: caseData.fallname,
      ...form,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { onSaved?.(); onClose(); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Abschluss-Fragebogen</h2>
            <p className="text-xs text-gray-400 mt-0.5">{caseData.fallname}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-base font-semibold text-gray-800">Fragebogen gespeichert!</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Ja/Nein Fragen */}
              <Sektion title="Schnell-Bewertung (Ja / Nein)" defaultOpen={true}>
                <JaNein label="Prozessziel erreicht?" value={form.ziel_erreicht} onChange={v => set("ziel_erreicht", v)} />
                <JaNein label="Mandant zufrieden?" value={form.mandant_zufrieden} onChange={v => set("mandant_zufrieden", v)} />
                <JaNein label="Vergleich geschlossen?" value={form.vergleich_geschlossen} onChange={v => set("vergleich_geschlossen", v)} />
                <JaNein label="Kosten im Rahmen geblieben?" value={form.kosten_im_rahmen} onChange={v => set("kosten_im_rahmen", v)} />
                <JaNein label="Alle Fristen eingehalten?" value={form.fristen_eingehalten} onChange={v => set("fristen_eingehalten", v)} />
                <JaNein label="KI-Prognose war zutreffend?" value={form.ki_prognose_korrekt} onChange={v => set("ki_prognose_korrekt", v)} />
              </Sektion>

              {/* Detailangaben */}
              <Sektion title="Detaillierte Angaben">
                <div className="pt-2 space-y-4">
                  <TextFeld label="Ergebnis / Urteil" value={form.ergebnis_urteil} onChange={v => set("ergebnis_urteil", v)}
                    placeholder="Beschreiben Sie das Ergebnis des Verfahrens..." />
                  <TextFeld label="Abweichung von KI-Prognose" value={form.abweichung_prognose} onChange={v => set("abweichung_prognose", v)}
                    placeholder="Falls Prognose nicht zutraf – warum?" />
                  <TextFeld label="Lernpunkte für künftige Fälle" value={form.lernpunkte} onChange={v => set("lernpunkte", v)}
                    placeholder="Was würden Sie beim nächsten ähnlichen Fall anders machen?" />
                  <TextFeld label="Mandanten-Feedback" value={form.mandanten_feedback} onChange={v => set("mandanten_feedback", v)}
                    placeholder="Rückmeldung des Mandanten (optional)..." />
                </div>
              </Sektion>

              {/* Zahlen */}
              <Sektion title="Kennzahlen">
                <div className="pt-3 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gesamtbewertung</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => set("gesamtbewertung", n)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                            form.gesamtbewertung === n ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}>
                          <Star className="w-3.5 h-3.5" /> {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dauer (Monate)</label>
                      <input type="number" value={form.dauer_monate || ""}
                        onChange={e => set("dauer_monate", Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                        placeholder="z.B. 14" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endkosten (€)</label>
                      <input type="number" value={form.endkosten || ""}
                        onChange={e => set("endkosten", Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                        placeholder="z.B. 8500" />
                    </div>
                  </div>
                </div>
              </Sektion>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Überspringen
              </button>
              <button onClick={speichern} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? "Speichert…" : "Fragebogen speichern"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
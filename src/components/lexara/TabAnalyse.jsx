import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ExternalLink } from "lucide-react";

export default function TabAnalyse({ caseId, caseData, onUpdate }) {
  const [args, setArgs] = useState([]);
  const [rechtsprechung, setRechtsprechung] = useState(null);
  const [rpLoading, setRpLoading] = useState(false);
  const [form, setForm] = useState({
    streitwert: caseData?.streitwert || 100000,
    gebuehrenstufe: caseData?.gebuehrenstufe || 1.3,
    sv_kosten: caseData?.sv_kosten || 0,
    reisekosten: caseData?.reisekosten || 0,
    vergleichsangebot: caseData?.vergleichsangebot || 0,
    instanz: caseData?.instanz || "Erstinstanz",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Argument.filter({ case_id: caseId }).then(setArgs);
  }, [caseId]);

  const sucheRechtsprechung = async () => {
    setRpLoading(true);
    setRechtsprechung(null);
    const argList = args.map(a => a.title).join(", ");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein juristischer Rechercheur. Suche im Internet nach aktueller relevanter Rechtsprechung für folgenden Fall:\n\nFall: "${caseData?.fallname || ""}"\nRechtsgebiet: ${caseData?.rechtsgebiet || "Zivilrecht"}\nGericht: ${caseData?.gericht || ""}\nZentrale Rechtsfrage: ${caseData?.zentrale_rechtsfrage || ""}\nArgumente: ${argList || "keine"}\nInstanz: ${caseData?.instanz || "Erstinstanz"}\n\nFinde 5-8 relevante Gerichtsentscheidungen aus Deutschland (BGH, BVerfG, OLG, BAG, BFH etc.) oder international je nach Rechtsordnung (EGMR, EuGH, US Supreme Court, UK Supreme Court etc.). Suche konkret nach Aktenzeichen, Datum, Leitsatz und wie sie auf die Argumente anwendbar sind. Gib NUR Entscheidungen an, die wirklich existieren und über eine Internetsuche verifizierbar sind.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          entscheidungen: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gericht: { type: "string" },
                aktenzeichen: { type: "string" },
                datum: { type: "string" },
                leitsatz: { type: "string" },
                relevanz: { type: "string" },
                anwendung: { type: "string" },
                staerke: { type: "string", enum: ["hoch", "mittel", "niedrig"] }
              },
              required: ["gericht", "leitsatz", "relevanz"]
            }
          },
          zusammenfassung: { type: "string" }
        }
      }
    });
    setRechtsprechung(res);
    setRpLoading(false);
  };

  const prognose = caseData?.prognose || 50;

  const rgvGrundgebuehr = () => {
    const s = form.streitwert;
    if(s<=500) return 49;
    if(s<=1000) return 88.5;
    if(s<=1500) return 127.5;
    if(s<=2000) return 166.5;
    if(s<=3000) return 222;
    if(s<=4000) return 277.5;
    if(s<=5000) return 333;
    if(s<=6000) return 388.5;
    if(s<=7000) return 441;
    if(s<=8000) return 469.5;
    if(s<=9000) return 498;
    if(s<=10000) return 526.5;
    if(s<=13000) return 590;
    if(s<=16000) return 653.5;
    if(s<=19000) return 717;
    if(s<=22000) return 780.5;
    if(s<=25000) return 844;
    if(s<=30000) return 943.5;
    if(s<=35000) return 1043;
    if(s<=40000) return 1142.5;
    if(s<=45000) return 1242;
    if(s<=50000) return 1341.5;
    if(s<=65000) return 1561;
    if(s<=80000) return 1780.5;
    if(s<=95000) return 2000;
    if(s<=110000) return 2219.5;
    if(s<=125000) return 2439;
    if(s<=140000) return 2658.5;
    if(s<=155000) return 2878;
    if(s<=170000) return 3097.5;
    if(s<=185000) return 3317;
    if(s<=200000) return 3536.5;
    return 3536.5 + Math.ceil((s-200000)/50000) * 439.5;
  };

  const grundgebuehr = Math.round(rgvGrundgebuehr());
  const anwalt = Math.round(grundgebuehr * form.gebuehrenstufe + grundgebuehr * 1.2);
  const gericht = Math.round(grundgebuehr * 3);
  const gegnerAnwalt = anwalt;
  const kostenVollsieg = anwalt;
  const kostenNiederlage = anwalt + gegnerAnwalt + gericht;
  const kostenVergleich = Math.round(anwalt*0.8 + gericht*0.5);
  const ewKlage = (prognose/100)*form.streitwert - (1-prognose/100)*(anwalt+gegnerAnwalt+gericht);
  const ewVergleich = form.vergleichsangebot - anwalt*0.8;
  const breakEven = (anwalt+gegnerAnwalt+gericht) / form.streitwert * 100;
  const recommendation = ewKlage > ewVergleich + form.streitwert*0.15 ? "KLAGE" : ewVergleich > 0 ? "VERGLEICH" : "AUFGABE";
  const recColor = recommendation==="KLAGE"?"text-green-700":recommendation==="VERGLEICH"?"text-yellow-600":"text-red-600";

  const saveCosts = async () => {
    setSaving(true);
    const updated = await base44.entities.Case.update(caseId, form);
    onUpdate(updated);
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Algorithm Recommendation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-6">
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">⚖️</div>
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">ALGORITHMUS-EMPFEHLUNG</p>
          <h3 className={`text-xl font-bold ${recColor}`}>{recommendation}</h3>
          <p className="text-xs text-gray-500">
            {recommendation==="KLAGE" ? `Klage eindeutig vorteilhaft (EW ${Math.round(ewKlage).toLocaleString("de-DE")}€ > Vergleich ${Math.round(ewVergleich).toLocaleString("de-DE")}€ + Aufschlag).` :
             recommendation==="VERGLEICH" ? `Vergleich empfehlenswert (EW ${Math.round(ewVergleich).toLocaleString("de-DE")}€ > Klage).` :
             "Aufgabe prüfen – Erwartungswerte negativ."}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{Math.round(prognose)}%</div>
          <div className="text-xs text-gray-400">Prognose</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Kostendaten */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">💰 Kostendaten</h3>
          <div className="space-y-3">
            {[["Streitwert (€)","streitwert","number"],["Gebührenstufe","gebuehrenstufe","number"],["Instanz","instanz","select"],["SV-Kosten (€)","sv_kosten","number"],["Reisekosten (€)","reisekosten","number"],["Vergleichsangebot Gegenseite (€)","vergleichsangebot","number"]].map(([l,f,type]) => (
              <div key={f}>
                <label className="text-xs text-gray-400 block mb-1">{l}</label>
                {type==="select" ? (
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={form[f]} onChange={e=>setForm({...form,[f]:e.target.value})}>
                    <option>Erstinstanz</option><option>Berufung</option><option>Revision</option>
                  </select>
                ) : (
                  <input type="number" step={f==="gebuehrenstufe"?0.1:undefined} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form[f]} onChange={e=>setForm({...form,[f]:+e.target.value})} />
                )}
              </div>
            ))}
            <Button onClick={saveCosts} disabled={saving} className="w-full bg-gray-900 text-white rounded-xl mt-2">
              {saving?"Speichern...":"💾 Kosten speichern"}
            </Button>
          </div>
        </div>

        {/* RVG */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 RVG-Kostenberechnung</h3>
          <div className="space-y-2">
            {[["RVG-Grundgebühr",grundgebuehr],["Anwaltshonorar (1.3×VG + 1.2×TG)",anwalt],["Gerichtsgebühren (3× GKG)",gericht],["Gegneranwalt (Verlustfall)",gegnerAnwalt],["SV-Kosten",form.sv_kosten||0],["Reisekosten",form.reisekosten||0]].map(([l,v]) => (
              <div key={l} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1.5">
                <span className="text-gray-500">{l}</span>
                <span className="font-semibold text-gray-900">{v.toLocaleString("de-DE")} €</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-3">📋 Szenarien-Vergleich</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[["Vollsieg",{eigen:kostenVollsieg,gegner:0,gericht:0,netto:form.streitwert-kostenVollsieg},"text-green-600"],["Niederlage",{eigen:kostenNiederlage,gegner:gegnerAnwalt,gericht,netto:-(kostenNiederlage)},"text-red-600"],["Vergleich",{eigen:kostenVergleich,gegner:0,gericht:Math.round(gericht*0.5),netto:form.vergleichsangebot-kostenVergleich},"text-blue-600"]].map(([name,s,nc]) => (
                <div key={name} className="bg-gray-50 rounded-xl p-2">
                  <p className="font-semibold text-gray-700 mb-1">{name}</p>
                  {[["Eigene Kosten",s.eigen],["Gegnerkosten",s.gegner],["Gerichtskosten",s.gericht]].map(([l,v]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-400">{l}</span><span>{v.toLocaleString("de-DE")} €</span></div>
                  ))}
                  <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-semibold">
                    <span className="text-gray-600">Nettowert</span>
                    <span className={nc}>{s.netto>0?"+":""}{Math.round(s.netto).toLocaleString("de-DE")} €</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Algorithm */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🎯 Entscheidungsalgorithmus — Vergleich vs. Klage vs. Aufgabe</h3>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          {[["Erwartungswert Klage",Math.round(ewKlage),"P(Gewinn) × Streitwert – P(Verlust) × Kosten"],["Erwartungswert Vergleich",Math.round(ewVergleich),"Angebot – bisherige Kosten"],["Break-Even-Prognose",Math.round(breakEven)+"%","✓ Prognose über Break-Even"]].map(([l,v,sub]) => (
            <div key={l} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400">{l}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{typeof v==="number"?v.toLocaleString("de-DE")+" €":v}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-0.5">
          <p><strong>Formel:</strong> EW_Klage = P(Gewinn) × Anspruchswert – P(Verlust) × Gesamtkosten_Verlust</p>
          <p><strong>Break-Even:</strong> Kosten_Niederlage / (Anspruchswert + Kosten_Niederlage)</p>
          <p className={`font-medium mt-1 ${recColor}`}><strong>Empfehlung: {recommendation}</strong> wenn EW_Klage &gt; EW_Vergleich + Risikoaufschlag (15%)</p>
        </div>
      </div>

      {/* Rechtsprechungs-Suche */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">📚 Relevante Rechtsprechung (KI + Internet)</h3>
            <p className="text-xs text-gray-400 mt-0.5">KI sucht live im Internet nach BGH/OLG/BVerfG oder internationalen Entscheidungen passend zu Ihren Argumenten</p>
          </div>
          <Button onClick={sucheRechtsprechung} disabled={rpLoading} size="sm"
            className="bg-violet-700 hover:bg-violet-800 text-white text-xs rounded-xl gap-1.5">
            {rpLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {rpLoading ? "Suche läuft…" : rechtsprechung ? "Neu suchen" : "Rechtsprechung suchen"}
          </Button>
        </div>

        {rpLoading && (
          <div className="flex items-center gap-3 text-gray-400 text-sm py-6 justify-center">
            <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            KI durchsucht Rechtsprechungsdatenbanken im Internet…
          </div>
        )}

        {rechtsprechung && (
          <div className="space-y-3">
            {rechtsprechung.zusammenfassung && (
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                <p className="text-xs text-violet-800">{rechtsprechung.zusammenfassung}</p>
              </div>
            )}
            {(rechtsprechung.entscheidungen || []).map((e, i) => {
              const staerkeColor = { hoch: "bg-green-100 text-green-700", mittel: "bg-amber-100 text-amber-700", niedrig: "bg-gray-100 text-gray-600" };
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-800">{e.gericht}</span>
                        {e.aktenzeichen && <span className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded">{e.aktenzeichen}</span>}
                        {e.datum && <span className="text-xs text-gray-400">{e.datum}</span>}
                        {e.staerke && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${staerkeColor[e.staerke] || ""}`}>{e.staerke} Relevanz</span>}
                      </div>
                      <p className="text-xs font-medium text-gray-700 mt-1.5 italic">„{e.leitsatz}"</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                  </div>
                  {e.relevanz && <p className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2">🎯 Relevanz: {e.relevanz}</p>}
                  {e.anwendung && <p className="text-xs text-gray-600">💡 Anwendung im Fall: {e.anwendung}</p>}
                </div>
              );
            })}
          </div>
        )}

        {!rechtsprechung && !rpLoading && (
          <p className="text-center text-sm text-gray-400 py-4">Noch keine Suche gestartet — KI nutzt Ihre Argumente und Falldaten als Suchgrundlage.</p>
        )}
      </div>
    </div>
  );
}
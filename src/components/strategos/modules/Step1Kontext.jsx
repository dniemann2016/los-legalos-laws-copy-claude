import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, FileUp, Check, Sparkles, Trash2 } from "lucide-react";
import { AppleCard, AppleField, AppleInput, AppleTextarea, AppleSelect, AppleButton, ApplePill, SF } from "../AppleCard";

const RECHTSFORMEN = ["GmbH","AG","GmbH & Co. KG","SE","Ltd.","Inc.","OHG","KG","Einzelunternehmen","Sonstige"];
const BRANCHEN = ["Technologie","Pharma","Automobil","Energie","Finanzdienstleistungen","Handel","Immobilien","Maschinenbau","Chemie","Telekommunikation","Medien","Sonstige"];
const LAENDER = ["Deutschland","Österreich","Schweiz","Niederlande","Frankreich","Italien","Spanien","UK","USA","Sonstige"];
const MAERKTE = ["DE","AT","CH","UK","US","EU","Asien-Pazifik","MENA","LATAM","Global"];
const SITUATIONSTYPEN = [
  { value: "geplante_handlung", label: "Geplante Handlung", icon: "🎯" },
  { value: "bestehende_situation", label: "Bestehende Situation", icon: "🔍" },
  { value: "reaktion_dritte", label: "Reaktion auf Dritten", icon: "⚡" },
  { value: "vertrag_analyse", label: "Vertrag / Dokument", icon: "📄" },
  { value: "risikovorsorge", label: "Compliance-Check", icon: "🛡️" },
];
const RECHTSGEBIETE = [
  { key: "vertragsrecht", label: "Vertragsrecht", icon: "📝", color: "#007AFF" },
  { key: "gesellschaftsrecht", label: "Gesellschaftsrecht", icon: "🏢", color: "#5856D6" },
  { key: "kartellrecht", label: "Kartellrecht", icon: "⚖️", color: "#AF52DE" },
  { key: "steuerrecht", label: "Steuerrecht", icon: "💰", color: "#34C759" },
  { key: "arbeitsrecht", label: "Arbeitsrecht", icon: "👥", color: "#FF9500" },
  { key: "datenschutz", label: "Datenschutz / DSGVO", icon: "🔒", color: "#00BCD4" },
  { key: "ip_recht", label: "IP / Patent / Marken", icon: "®️", color: "#FF2D55" },
  { key: "compliance", label: "Compliance / CSRD", icon: "✅", color: "#4CAF50" },
  { key: "strafrecht", label: "Wirtschaftsstrafrecht", icon: "🚨", color: "#FF3B30" },
];

export default function Step1Kontext({ scenario, onSave }) {
  const [ctx, setCtx] = useState(scenario.unternehmenskontext || {});
  const [docs, setDocs] = useState((scenario.unternehmenskontext || {}).dokumente || []);
  const [uploading, setUploading] = useState(false);
  const [selRG, setSelRG] = useState((scenario.unternehmenskontext || {}).rechtsgebiete || []);
  const [selM, setSelM] = useState((scenario.unternehmenskontext || {}).operative_maerkte || []);
  const [analyzing, setAnalyzing] = useState(false);
  const [lexCases, setLexCases] = useState([]);
  const [linkedCase, setLinkedCase] = useState(null);

  useEffect(() => {
    base44.entities.Case.list("-updated_date", 50).then(setLexCases);
  }, []);

  const persist = (p) => {
    const m = { ...ctx, ...p };
    setCtx(m);
    onSave({ unternehmenskontext: m });
  };

  const toggleM = (m) => {
    const n = selM.includes(m) ? selM.filter(x => x !== m) : [...selM, m];
    setSelM(n);
    persist({ operative_maerkte: n });
  };

  const toggleRG = (k) => {
    const n = selRG.includes(k) ? selRG.filter(x => x !== k) : [...selRG, k];
    setSelRG(n);
    persist({ rechtsgebiete: n });
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const up = [];
    for (const f of files) {
      const r = await base44.integrations.Core.UploadFile({ file: f });
      up.push({ name: f.name, url: r.file_url, type: f.name.split(".").pop().toLowerCase(), uploaded_at: new Date().toISOString() });
    }
    const n = [...docs, ...up];
    setDocs(n);
    persist({ dokumente: n });
    setUploading(false);
  };

  const analyzeDoc = async (doc) => {
    setUploading(true);
    const r = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: doc.url,
      json_schema: {
        type: "object",
        properties: {
          dokumenttyp: { type: "string" },
          parteien: { type: "array", items: { type: "string" } },
          fristen: { type: "array", items: { type: "object", properties: { datum: { type: "string" }, beschreibung: { type: "string" } } } },
          kritische_klauseln: { type: "array", items: { type: "string" } }
        }
      }
    });
    const n = docs.map(d => d.url === doc.url ? { ...d, analyse: r.output } : d);
    setDocs(n);
    persist({ dokumente: n });
    setUploading(false);
  };

  const runAutoKI = async () => {
    setAnalyzing(true);
    const r = await base44.integrations.Core.InvokeLLM({
      prompt: `Wirtschaftsrechtler: Wähle relevante Rechtsgebiete.
Unternehmen: ${ctx.unternehmen_name || "—"} (${ctx.rechtsform || "—"}, ${ctx.branche || "—"})
Umsatz: ${ctx.umsatz || "—"}€, MA: ${ctx.mitarbeiter || "—"}
Situation: ${ctx.situationstyp || "—"}
Sachverhalt: ${ctx.sachverhalt_lang || "—"}
Gegner: ${ctx.gegner_name || "—"} (${ctx.gegner_rolle || "—"})
Verfügbar: ${RECHTSGEBIETE.map(r => r.key).join(", ")}`,
      response_json_schema: {
        type: "object",
        properties: {
          empfohlene_rechtsgebiete: { type: "array", items: { type: "string" } },
          dringlichkeit: { type: "number" }
        }
      }
    });
    if (r.empfohlene_rechtsgebiete?.length) {
      setSelRG(r.empfohlene_rechtsgebiete);
      persist({ rechtsgebiete: r.empfohlene_rechtsgebiete });
    }
    setAnalyzing(false);
  };

  const selectLex = (id) => {
    const c = lexCases.find(x => x.id === id);
    setLinkedCase(c || null);
    persist({ lexara_case_id: id });
  };

  const zk = ctx.zeitkritikalitaet || 5;
  const zkColor = zk >= 8 ? "#FF3B30" : zk >= 5 ? "#FF9500" : "#34C759";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, ...SF }}>
      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#007AFF", letterSpacing: "0.15em", textTransform: "uppercase" }}>Schritt 1 · Enterprise</p>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px", marginTop: 4 }}>Eingabe & Kontext</h2>
        <p style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Grundinformationen für die gesamte KI-Analyse</p>
      </div>

      <AppleCard title="A · Unternehmensidentität" accentColor="#007AFF">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <AppleField label="Unternehmensname" required>
            <AppleInput value={ctx.unternehmen_name || ""} placeholder="ACME AG" onChange={e => setCtx(p => ({ ...p, unternehmen_name: e.target.value }))} onBlur={() => persist({ unternehmen_name: ctx.unternehmen_name })} />
          </AppleField>
          <AppleField label="Rechtsform">
            <AppleSelect value={ctx.rechtsform || ""} onChange={e => persist({ rechtsform: e.target.value })}>
              <option value="">— wählen —</option>
              {RECHTSFORMEN.map(r => <option key={r} value={r}>{r}</option>)}
            </AppleSelect>
          </AppleField>
          <AppleField label="Branche">
            <AppleSelect value={ctx.branche || ""} onChange={e => persist({ branche: e.target.value })}>
              <option value="">— wählen —</option>
              {BRANCHEN.map(b => <option key={b} value={b}>{b}</option>)}
            </AppleSelect>
          </AppleField>
          <AppleField label="Spezialisierung">
            <AppleInput value={ctx.branche_freitext || ""} placeholder="z.B. B2B-SaaS" onChange={e => setCtx(p => ({ ...p, branche_freitext: e.target.value }))} onBlur={() => persist({ branche_freitext: ctx.branche_freitext })} />
          </AppleField>
          <AppleField label="Jahresumsatz">
            <div style={{ display: "flex", gap: 8 }}>
              <AppleInput type="number" value={ctx.umsatz || ""} placeholder="50000000" onChange={e => setCtx(p => ({ ...p, umsatz: Number(e.target.value) }))} onBlur={() => persist({ umsatz: ctx.umsatz })} style={{ flex: 3 }} />
              <AppleSelect value={ctx.waehrung || "EUR"} onChange={e => persist({ waehrung: e.target.value })} style={{ flex: 1 }}>
                <option value="EUR">€</option><option value="USD">$</option><option value="CHF">CHF</option><option value="GBP">£</option>
              </AppleSelect>
            </div>
          </AppleField>
          <AppleField label="Mitarbeiter">
            <AppleInput type="number" value={ctx.mitarbeiter || ""} placeholder="250" onChange={e => setCtx(p => ({ ...p, mitarbeiter: Number(e.target.value) }))} onBlur={() => persist({ mitarbeiter: ctx.mitarbeiter })} />
          </AppleField>
          <AppleField label="Hauptsitz — Land">
            <AppleSelect value={ctx.hauptsitz_land || ""} onChange={e => persist({ hauptsitz_land: e.target.value })}>
              <option value="">— wählen —</option>
              {LAENDER.map(l => <option key={l} value={l}>{l}</option>)}
            </AppleSelect>
          </AppleField>
          <AppleField label="Hauptsitz — Stadt">
            <AppleInput value={ctx.hauptsitz_stadt || ""} placeholder="München" onChange={e => setCtx(p => ({ ...p, hauptsitz_stadt: e.target.value }))} onBlur={() => persist({ hauptsitz_stadt: ctx.hauptsitz_stadt })} />
          </AppleField>
        </div>
        <div style={{ marginTop: 14 }}>
          <AppleField label="Operative Märkte">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {MAERKTE.map(m => <ApplePill key={m} onClick={() => toggleM(m)} active={selM.includes(m)} color="#007AFF">{m}</ApplePill>)}
            </div>
          </AppleField>
        </div>
      </AppleCard>

      <AppleCard title="B · Situation" accentColor="#FF9500">
        <AppleField label="Situationstyp" required>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 8, marginTop: 4 }}>
            {SITUATIONSTYPEN.map(t => {
              const a = ctx.situationstyp === t.value;
              return (
                <button key={t.value} onClick={() => persist({ situationstyp: t.value })} style={{ padding: "10px 12px", border: a ? "2px solid #FF9500" : "1px solid rgba(0,0,0,0.1)", borderRadius: 12, background: a ? "rgba(255,149,0,0.08)" : "rgba(255,255,255,0.6)", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{t.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: a ? "#FF9500" : "#333" }}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </AppleField>
        <div style={{ marginTop: 12 }}>
          <AppleField label="Sachverhalt (min. 3 Sätze)">
            <AppleTextarea rows={5} value={ctx.sachverhalt_lang || ""} placeholder="Detaillierte Beschreibung der Situation, Hintergründe, bisherige Entwicklung..." onChange={e => setCtx(p => ({ ...p, sachverhalt_lang: e.target.value }))} onBlur={() => persist({ sachverhalt_lang: ctx.sachverhalt_lang })} />
          </AppleField>
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <AppleField label="Gegenpartei">
            <AppleInput value={ctx.gegner_name || ""} placeholder="Competitor Corp" onChange={e => setCtx(p => ({ ...p, gegner_name: e.target.value }))} onBlur={() => persist({ gegner_name: ctx.gegner_name })} />
          </AppleField>
          <AppleField label="Rolle">
            <AppleSelect value={ctx.gegner_rolle || ""} onChange={e => persist({ gegner_rolle: e.target.value })}>
              <option value="">—</option><option value="kunde">Kunde</option><option value="lieferant">Lieferant</option>
              <option value="wettbewerber">Wettbewerber</option><option value="behoerde">Behörde</option>
              <option value="investor">Investor</option><option value="mitarbeiter">Mitarbeiter</option>
            </AppleSelect>
          </AppleField>
          <AppleField label="Zeitkritikalität (1–10)">
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, background: "rgba(255,255,255,0.8)" }}>
              <input type="range" min={1} max={10} value={zk} onChange={e => setCtx(p => ({ ...p, zeitkritikalitaet: Number(e.target.value) }))} onMouseUp={() => persist({ zeitkritikalitaet: ctx.zeitkritikalitaet })} style={{ flex: 1, accentColor: zkColor }} />
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: "center", color: zkColor }}>{zk}</span>
            </div>
          </AppleField>
        </div>
      </AppleCard>

      <AppleCard title="C · Dokument-Upload" accentColor="#5856D6" action={
        <label style={{ cursor: "pointer" }}>
          <input type="file" multiple accept=".pdf,.docx,.doc,.txt,.jpg,.png" onChange={handleUpload} style={{ display: "none" }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600, background: "#5856D6", color: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(88,86,214,0.3)" }}>
            <Upload style={{ width: 13, height: 13 }} /> {uploading ? "Lade…" : "Dokumente"}
          </span>
        </label>
      }>
        {docs.length === 0 ? (
          <div style={{ padding: "22px 16px", textAlign: "center", color: "#bbb" }}>
            <FileUp style={{ width: 28, height: 28, margin: "0 auto 6px", opacity: 0.4 }} />
            <p style={{ fontSize: 11 }}>Verträge, Patente, Bilanzen, Gutachten · PDF / DOCX / TXT / JPG</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {docs.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "rgba(88,86,214,0.06)", border: "1px solid rgba(88,86,214,0.15)", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                  <FileUp style={{ width: 14, height: 14, color: "#5856D6", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</p>
                    {d.analyse && <p style={{ fontSize: 10, color: "#5856D6", marginTop: 1 }}>✓ {d.analyse.dokumenttyp || "—"} · {d.analyse.parteien?.length || 0} Parteien · {d.analyse.fristen?.length || 0} Fristen</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  {!d.analyse && <button onClick={() => analyzeDoc(d)} disabled={uploading} style={{ padding: "4px 9px", fontSize: 10, fontWeight: 600, background: "#5856D6", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}>KI-Scan</button>}
                  <button onClick={() => { const n = docs.filter((_, j) => j !== i); setDocs(n); persist({ dokumente: n }); }} style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#ccc" }}><Trash2 style={{ width: 12, height: 12 }} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppleCard>

      <AppleCard title="D · Rechtsgebiete" accentColor="#34C759" action={<AppleButton onClick={runAutoKI} disabled={analyzing} variant="accent" icon={Sparkles}>{analyzing ? "Wählt…" : "KI-Vorauswahl"}</AppleButton>}>
        <p style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>Jedes Gebiet aktiviert in Schritt 2 ein eigenes Analyse-Modul.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 7 }}>
          {RECHTSGEBIETE.map(rg => {
            const a = selRG.includes(rg.key);
            return (
              <button key={rg.key} onClick={() => toggleRG(rg.key)} style={{ padding: "10px 12px", border: a ? `2px solid ${rg.color}` : "1px solid rgba(0,0,0,0.1)", borderRadius: 12, background: a ? `${rg.color}12` : "rgba(255,255,255,0.6)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 16 }}>{rg.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: a ? rg.color : "#333", flex: 1 }}>{rg.label}</span>
                {a && <Check style={{ width: 12, height: 12, color: rg.color }} />}
              </button>
            );
          })}
        </div>
      </AppleCard>

      <AppleCard title="E · LEXARA-Import (optional)" accentColor="#FF3B30">
        <p style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>Laufenden LEXARA-Fall verknüpfen — Prognose, Richter und Argumente fließen ein.</p>
        <AppleField label="LEXARA-Fall">
          <AppleSelect value={ctx.lexara_case_id || ""} onChange={e => selectLex(e.target.value)}>
            <option value="">— nicht verknüpft —</option>
            {lexCases.map(c => <option key={c.id} value={c.id}>{c.fallname} {c.aktenzeichen ? `(${c.aktenzeichen})` : ""}</option>)}
          </AppleSelect>
        </AppleField>
        {linkedCase && (
          <div style={{ marginTop: 11, padding: "11px 13px", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.15)", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{linkedCase.fallname}</p>
              <p style={{ fontSize: 11, color: "#888" }}>{linkedCase.aktenzeichen} · {linkedCase.rechtsgebiet}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: linkedCase.prognose >= 60 ? "#34C759" : linkedCase.prognose >= 40 ? "#FF9500" : "#FF3B30" }}>{linkedCase.prognose || 0}%</p>
              <p style={{ fontSize: 10, color: "#aaa" }}>Prognose</p>
            </div>
          </div>
        )}
      </AppleCard>
    </div>
  );
}
// Konfiguration: Rechtsgebiet → Zusatzfelder
export const RECHTSGEBIETE = [
  "Vertragsrecht",
  "Arbeitsrecht",
  "Mietrecht",
  "Familienrecht",
  "Erbrecht",
  "Gesellschaftsrecht",
  "Insolvenzrecht",
  "Strafrecht",
  "Verwaltungsrecht",
  "Steuerrecht",
  "Markenrecht",
  "Patentrecht",
  "Urheberrecht",
  "Wettbewerbsrecht",
  "Baurecht",
  "Medizinrecht",
  "Versicherungsrecht",
  "Bankrecht",
  "Transportrecht",
  "IT-Recht / Datenschutz",
  "Sozialrecht",
  "Öffentliches Recht",
  "Internationales Recht",
  "Umweltrecht",
];

// Zusatzfelder je Rechtsgebiet: { field, label, type, placeholder, options? }
export const RECHTSGEBIET_FELDER = {
  Patentrecht: [
    { field: "patentnummer", label: "Patentnummer", type: "text", placeholder: "z.B. DE102023001234A1" },
    { field: "anmeldetag", label: "Anmeldetag", type: "date" },
    { field: "prioritaetsdatum", label: "Prioritätsdatum", type: "date" },
    { field: "patentinhaber", label: "Patentinhaber", type: "text", placeholder: "z.B. Muster GmbH" },
    { field: "patentkategorie", label: "Patentkategorie", type: "select", options: ["Erfindungspatent", "Gebrauchsmuster", "Europäisches Patent", "PCT-Anmeldung", "Design/Geschmacksmuster"] },
    { field: "verletzungshandlung", label: "Verletzungshandlung", type: "text", placeholder: "z.B. unerlaubte Herstellung, Vertrieb" },
    { field: "schutzbereich", label: "Schutzbereich / Anspruch 1", type: "textarea", placeholder: "Kernaussage des Hauptanspruchs" },
  ],
  Markenrecht: [
    { field: "markennummer", label: "Markennummer", type: "text", placeholder: "z.B. 302023012345" },
    { field: "markenart", label: "Markenart", type: "select", options: ["Wortmarke", "Bildmarke", "Wort-/Bildmarke", "3D-Marke", "Klangmarke", "Unionsmarke", "Internationale Marke"] },
    { field: "waren_dienstleistungen", label: "Waren-/Dienstleistungsklassen (Nizza)", type: "text", placeholder: "z.B. Klasse 9, 42" },
    { field: "verwechslungsgefahr", label: "Art der Verwechslungsgefahr", type: "select", options: ["Klanglich", "Visuell", "Begrifflich", "Kombiniert"] },
    { field: "markenverletzung_art", label: "Art der Verletzung", type: "text", placeholder: "z.B. identische Benutzung, Imitat" },
  ],
  Urheberrecht: [
    { field: "werktitel", label: "Werktitel / Werkbezeichnung", type: "text", placeholder: "z.B. Musikwerk, Software, Foto" },
    { field: "werkart", label: "Werkart", type: "select", options: ["Sprachwerk", "Musikwerk", "Filmwerk", "Softwarecode", "Fotografie", "Datenbankwerk", "Designwerk", "Sonstiges"] },
    { field: "veroeffentlichungsdatum", label: "Erstveröffentlichung", type: "date" },
    { field: "verletzungsform", label: "Verletzungsform", type: "select", options: ["Vervielfältigung", "Verbreitung", "öffentliche Zugänglichmachung", "Bearbeitung ohne Zustimmung", "Plagiat"] },
    { field: "lizenzmodell", label: "Lizenzmodell", type: "text", placeholder: "z.B. exklusiv, nicht-exklusiv, CC-BY" },
  ],
  Wettbewerbsrecht: [
    { field: "uwg_paragraph", label: "Relevante UWG-Norm", type: "text", placeholder: "z.B. §3, §4 Nr.3, §5 UWG" },
    { field: "wettbewerbshandlung", label: "Wettbewerbshandlung", type: "select", options: ["Irreführende Werbung", "Vergleichende Werbung", "Sklavische Nachahmung", "Anschwärzung", "Spam/Belästigung", "Kartellverstoß"] },
    { field: "marktstellung", label: "Marktstellung des Beklagten", type: "select", options: ["Marktführer", "Oligopolist", "Mitbewerber", "Newcomer"] },
    { field: "abmahnung_vorhanden", label: "Abmahnung vorhanden", type: "select", options: ["Ja – reagiert", "Ja – nicht reagiert", "Nein"] },
  ],
  Arbeitsrecht: [
    { field: "kuendigungsart", label: "Kündigungsart", type: "select", options: ["Ordentliche Kündigung", "Außerordentliche Kündigung", "Änderungskündigung", "Aufhebungsvertrag"] },
    { field: "kuendigungsdatum", label: "Kündigungsdatum", type: "date" },
    { field: "beschaeftigungsdauer", label: "Beschäftigungsdauer (Monate)", type: "number", placeholder: "z.B. 36" },
    { field: "betriebsrat_vorhanden", label: "Betriebsrat vorhanden", type: "select", options: ["Ja – angehört", "Ja – nicht angehört", "Nein"] },
    { field: "sozialauswahl", label: "Sozialauswahl durchgeführt", type: "select", options: ["Ja", "Nein", "Nicht erforderlich"] },
    { field: "abfindungsangebot", label: "Abfindungsangebot (€)", type: "number", placeholder: "z.B. 15000" },
  ],
  Mietrecht: [
    { field: "mietbeginn", label: "Mietbeginn", type: "date" },
    { field: "mietzins", label: "Monatliche Miete (€)", type: "number", placeholder: "z.B. 1200" },
    { field: "kuendigungsgrund_miete", label: "Kündigungsgrund", type: "select", options: ["Eigenbedarf", "Zahlungsverzug", "Vertragswidriges Verhalten", "Wirtschaftliche Verwertung", "Sonstiges"] },
    { field: "wohnflaeche", label: "Wohnfläche (m²)", type: "number", placeholder: "z.B. 75" },
    { field: "kaution", label: "Kaution (€)", type: "number", placeholder: "z.B. 3600" },
    { field: "maengel", label: "Mängel vorhanden", type: "select", options: ["Ja – erheblich", "Ja – geringfügig", "Nein"] },
  ],
  Familienrecht: [
    { field: "familienrechtssache", label: "Art der Familienrechtssache", type: "select", options: ["Scheidung", "Unterhalt", "Sorgerecht", "Umgangsrecht", "Zugewinnausgleich", "Versorgungsausgleich", "Gütertrennung"] },
    { field: "ehedauer", label: "Ehedauer (Jahre)", type: "number", placeholder: "z.B. 8" },
    { field: "kinder_vorhanden", label: "Minderjährige Kinder", type: "select", options: ["Keine", "1 Kind", "2 Kinder", "3+ Kinder"] },
    { field: "unterhaltsbetrag", label: "Unterhalt monatlich (€)", type: "number", placeholder: "z.B. 800" },
    { field: "trennungsdatum", label: "Trennungsdatum", type: "date" },
  ],
  Erbrecht: [
    { field: "nachlasswert", label: "Nachlasswert (€)", type: "number", placeholder: "z.B. 250000" },
    { field: "testament_vorhanden", label: "Testament vorhanden", type: "select", options: ["Ja – notariell", "Ja – eigenhändig", "Nein – gesetzliche Erbfolge"] },
    { field: "erbstreitart", label: "Art des Erbstreits", type: "select", options: ["Testamentsanfechtung", "Pflichtteilsklage", "Erbschaftsanspruch", "Vermächtnisklage", "Auseinandersetzung"] },
    { field: "anzahl_erben", label: "Anzahl Miterben", type: "number", placeholder: "z.B. 3" },
  ],
  Strafrecht: [
    { field: "delikt", label: "Vorgeworfenes Delikt", type: "text", placeholder: "z.B. § 263 StGB Betrug" },
    { field: "strafmass", label: "Strafrahmen / drohendes Strafmaß", type: "text", placeholder: "z.B. bis 5 Jahre Freiheitsstrafe" },
    { field: "haftbefehl", label: "Haftbefehl erlassen", type: "select", options: ["Nein", "Ja – vollzogen", "Ja – außer Vollzug"] },
    { field: "vorstrafe", label: "Vorstrafen vorhanden", type: "select", options: ["Nein", "Ja – einschlägig", "Ja – nicht einschlägig"] },
    { field: "gestaendnis", label: "Geständnis", type: "select", options: ["Nein", "Teilgeständnis", "Vollgeständnis"] },
  ],
  Steuerrecht: [
    { field: "steuerart", label: "Steuerart", type: "select", options: ["Einkommensteuer", "Körperschaftsteuer", "Umsatzsteuer", "Gewerbesteuer", "Erbschaft-/Schenkungsteuer", "Grunderwerbsteuer"] },
    { field: "steuerjahr", label: "Streitiges Steuerjahr", type: "text", placeholder: "z.B. 2021–2023" },
    { field: "steuernachforderung", label: "Steuernachforderung (€)", type: "number", placeholder: "z.B. 45000" },
    { field: "einspruch_eingelegt", label: "Einspruch eingelegt", type: "select", options: ["Ja – fristgerecht", "Ja – verspätet", "Nein"] },
    { field: "betriebspruefung", label: "Betriebsprüfung vorangegangen", type: "select", options: ["Nein", "Ja – Prüfungsjahre angeben"] },
  ],
  Gesellschaftsrecht: [
    { field: "gesellschaftsform", label: "Gesellschaftsform", type: "select", options: ["GmbH", "AG", "OHG", "KG", "GbR", "UG (haftungsbeschränkt)", "SE", "Genossenschaft"] },
    { field: "gesellschaftsstreit", label: "Art des Streits", type: "select", options: ["Gesellschafterausschluss", "Abberufung Geschäftsführer", "Gewinnverteilung", "Auflösung", "Wettbewerbsverstoß des Gesellschafters"] },
    { field: "stammkapital", label: "Stammkapital (€)", type: "number", placeholder: "z.B. 25000" },
    { field: "beteiligungsquote", label: "Beteiligungsquote Mandant (%)", type: "number", placeholder: "z.B. 51" },
  ],
  Insolvenzrecht: [
    { field: "insolvenzart", label: "Insolvenzart", type: "select", options: ["Regelinsolvenz", "Verbraucherinsolvenz", "Planinsolvenz", "Eigenverwaltung"] },
    { field: "insolvenzantragsdatum", label: "Insolvenzantragsdatum", type: "date" },
    { field: "glaeubigerforderung", label: "Gläubigerforderung (€)", type: "number", placeholder: "z.B. 120000" },
    { field: "insolvenzmasse", label: "Geschätzte Insolvenzmasse (€)", type: "number", placeholder: "z.B. 50000" },
    { field: "anfechtungsklage", label: "Anfechtungsklage", type: "select", options: ["Nein", "Ja – §133 InsO", "Ja – §134 InsO", "Ja – §135 InsO"] },
  ],
  Baurecht: [
    { field: "bauvertragsart", label: "Vertragsart", type: "select", options: ["Werkvertrag", "VOB/B-Vertrag", "BGB-Werkvertrag", "Architektenvertrag", "GU-Vertrag"] },
    { field: "baumangel_art", label: "Art des Mangels", type: "text", placeholder: "z.B. Feuchtigkeitsschäden, fehlerhafte Ausführung" },
    { field: "bauvolumen", label: "Auftragsvolumen (€)", type: "number", placeholder: "z.B. 500000" },
    { field: "abnahmedatum", label: "Abnahmedatum", type: "date" },
    { field: "verjährungsfrist", label: "Verjährung läuft ab", type: "date" },
  ],
  Medizinrecht: [
    { field: "behandlungsfehlerart", label: "Art des Behandlungsfehlers", type: "select", options: ["Diagnosefehler", "Therapiefehler", "Aufklärungsfehler", "Dokumentationsfehler", "Hygieneverstoß"] },
    { field: "behandlungszeitraum", label: "Behandlungszeitraum", type: "text", placeholder: "z.B. Januar–März 2023" },
    { field: "gutachten_vorhanden", label: "Sachverständigengutachten vorhanden", type: "select", options: ["Nein", "Ja – für uns", "Ja – für Gegenseite", "Beide Parteien"] },
    { field: "schmerzensgeld_forderung", label: "Schmerzensgeld-Forderung (€)", type: "number", placeholder: "z.B. 50000" },
  ],
  Versicherungsrecht: [
    { field: "versicherungsart", label: "Versicherungsart", type: "select", options: ["Haftpflicht", "Kfz-Versicherung", "Berufsunfähigkeit", "Lebensversicherung", "Gebäudeversicherung", "Rechtsschutz"] },
    { field: "schadenshoehe", label: "Schadenshöhe (€)", type: "number", placeholder: "z.B. 80000" },
    { field: "deckungsablehnung", label: "Deckung abgelehnt am", type: "date" },
    { field: "ablehnungsgrund", label: "Ablehnungsgrund der Versicherung", type: "text", placeholder: "z.B. Obliegenheitsverletzung, Vorsatz" },
  ],
  Verwaltungsrecht: [
    { field: "verwaltungsakt", label: "Art des Verwaltungsakts", type: "text", placeholder: "z.B. Baugenehmigung, Gewerbeuntersagung" },
    { field: "behoerde", label: "Zuständige Behörde", type: "text", placeholder: "z.B. Landratsamt München" },
    { field: "widerspruch_eingelegt", label: "Widerspruch eingelegt", type: "select", options: ["Ja – fristgerecht", "Nein – direkte Klage", "Widerspruch zurückgewiesen"] },
    { field: "klageart", label: "Klageart", type: "select", options: ["Anfechtungsklage", "Verpflichtungsklage", "Feststellungsklage", "Leistungsklage"] },
  ],
  Bankrecht: [
    { field: "bankrechtsstreit", label: "Art des Streits", type: "select", options: ["Kreditkündigung", "Anlageberatung", "Falschberatung Wertpapiere", "Bürgschaft", "Kontoführung", "Sicherheitenverwertung"] },
    { field: "kreditvolumen", label: "Kreditvolumen (€)", type: "number", placeholder: "z.B. 500000" },
    { field: "zinssatz", label: "Zinssatz (%)", type: "number", placeholder: "z.B. 3.5" },
    { field: "kuendigungsdatum_bank", label: "Kündigungsdatum", type: "date" },
  ],
  "IT-Recht / Datenschutz": [
    { field: "it_streitart", label: "Art des Streits", type: "select", options: ["DSGVO-Verletzung", "Softwaremangel", "Lizenzstreit", "Domain-Streit", "SaaS-Vertrag", "Datenleck"] },
    { field: "dsgvo_verstoß_art", label: "DSGVO-Verstoßart", type: "text", placeholder: "z.B. Art. 6 – fehlende Rechtsgrundlage" },
    { field: "betroffene_personen", label: "Anzahl betroffener Personen", type: "number", placeholder: "z.B. 5000" },
    { field: "datenschutzbehoerde", label: "Datenschutzbehörde involviert", type: "select", options: ["Nein", "Ja – laufend", "Ja – Bußgeld erteilt"] },
    { field: "bussgeldbetrag", label: "Bußgeldbetrag (€)", type: "number", placeholder: "z.B. 250000" },
  ],
};

export default function RechtsgebietZusatzfelder({ rechtsgebiet, meta, onChange }) {
  const felder = RECHTSGEBIET_FELDER[rechtsgebiet] || [];
  if (felder.length === 0) return null;

  const handleChange = (field, value) => {
    onChange({ ...meta, [field]: value });
  };

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-blue-800 mb-4">
        ⚖️ {rechtsgebiet} – Spezifische Angaben
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {felder.map(({ field, label, type, placeholder, options }) => (
          <div key={field} className={type === "textarea" ? "md:col-span-2" : ""}>
            <label className="text-xs text-blue-700 block mb-1 font-medium">{label}</label>
            {options ? (
              <select
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={meta?.[field] || ""}
                onChange={e => handleChange(field, e.target.value)}
              >
                <option value="">– bitte wählen –</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : type === "textarea" ? (
              <textarea
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white min-h-[70px]"
                placeholder={placeholder}
                value={meta?.[field] || ""}
                onChange={e => handleChange(field, e.target.value)}
              />
            ) : (
              <input
                type={type}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
                placeholder={placeholder}
                value={meta?.[field] || ""}
                onChange={e => handleChange(field, type === "number" ? +e.target.value : e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
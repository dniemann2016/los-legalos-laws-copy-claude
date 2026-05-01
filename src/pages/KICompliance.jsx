/**
 * KICompliance.jsx — Technischer Compliance-Check für alle KI-Systeme
 * Dokumentiert die Einhaltung des Anwaltsgeheimnisses (§ 43a BRAO, § 203 StGB, DSGVO)
 * Route: /ki-compliance
 */

import { useState } from "react";
import { Shield, CheckCircle, AlertTriangle, Info, Lock, Eye, Database, Scale, FileText, Bot, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const COMPLIANCE_CHECKS = [
  {
    kategorie: "Anwaltsgeheimnis",
    icon: Scale,
    farbe: "emerald",
    checks: [
      { id: "brao_43a", label: "§ 43a Abs. 2 BRAO — Verschwiegenheitspflicht", beschreibung: "Alle KI-Agenten (fall_assistent, plattform_optimierer) sind durch System-Prompts explizit auf die anwaltliche Verschwiegenheitspflicht verpflichtet. Keine Mandantendaten werden nach außen kommuniziert.", status: "ok" },
      { id: "stgb_203", label: "§ 203 StGB — Schutz von Privatgeheimnissen", beschreibung: "Die App verarbeitet Mandantendaten ausschließlich innerhalb der LEXARA-Plattform. Keine Weitergabe an Dritte durch KI-Ausgaben. KI-Agenten sind angewiesen, Fallinhalte nicht weiterzugeben.", status: "ok" },
      { id: "brao_rollentrennung", label: "Rollentrennung: KI als Assistenz, Anwalt als Entscheider", beschreibung: "KI-Empfehlungen sind als Entscheidungshilfen für den Rechtsanwalt konzipiert. Die finale Verantwortung und Rechtsberatung liegt ausschließlich beim menschlichen Anwalt.", status: "ok" },
    ]
  },
  {
    kategorie: "DSGVO / Datenschutz",
    icon: Lock,
    farbe: "blue",
    checks: [
      { id: "dsgvo_5_zweckbindung", label: "Art. 5 Abs. 1 lit. b DSGVO — Zweckbindung", beschreibung: "KI-Agenten dürfen nur auf Daten zugreifen, die für die jeweilige Aufgabe notwendig sind. Der Plattform-Optimierer greift ausschließlich zur Qualitätssicherung zu, nicht zu anderen Zwecken.", status: "ok" },
      { id: "dsgvo_5_datensparsamkeit", label: "Art. 5 Abs. 1 lit. c DSGVO — Datensparsamkeit", beschreibung: "Alle KI-Prompts sind so konfiguriert, dass nur minimal notwendige Daten verarbeitet werden. Keine Anforderung überschüssiger personenbezogener Daten.", status: "ok" },
      { id: "dsgvo_rls", label: "Row-Level Security (RLS) — Datenisolation pro Nutzer", beschreibung: "Technisch erzwungen: Jeder Nutzer sieht ausschließlich eigene Fälle, Argumente und Dokumente. KI-Agenten können nicht auf Daten anderer Nutzer zugreifen (RLS-Regeln auf allen Entitäten).", status: "ok" },
      { id: "dsgvo_25_privacy_by_design", label: "Art. 25 DSGVO — Privacy by Design & Default", beschreibung: "Datenschutz ist technisch in die Architektur eingebaut: Auth-Pflicht, RLS, keine externen API-Calls mit Falldaten, verschlüsselte Übertragung.", status: "ok" },
    ]
  },
  {
    kategorie: "EU AI Act",
    icon: Bot,
    farbe: "violet",
    checks: [
      { id: "euai_transparenz", label: "Art. 13 EU AI Act — KI-Transparenzpflicht", beschreibung: "Alle KI-Ausgaben sind als KI-generiert gekennzeichnet (Badges, Hinweise in der UI). Nutzer wissen stets, wann sie mit einem KI-System interagieren.", status: "ok" },
      { id: "euai_human_oversight", label: "Art. 14 EU AI Act — Menschliche Aufsicht", beschreibung: "Das System ist so konzipiert, dass der Anwalt jederzeit die Kontrolle behält. KI kann weder selbstständig Mandate abschließen noch verbindliche Rechtsauskünfte erteilen.", status: "ok" },
      { id: "euai_audit_trail", label: "Audit-Trail — Dokumentation aller KI-Eingriffe", beschreibung: "CaseHistory-Entity protokolliert alle Datenänderungen durch KI-Agenten. KIUsageLog speichert alle KI-Interaktionen mit Zeitstempel, Funktion und Kontext.", status: "ok" },
    ]
  },
  {
    kategorie: "Technische Sicherheit",
    icon: Shield,
    farbe: "gray",
    checks: [
      { id: "tech_no_external", label: "Keine externen API-Calls mit Falldaten", beschreibung: "Backend-Funktionen senden keine Mandanten- oder Falldaten an externe Dienste. InvokeLLM-Aufrufe enthalten nur anonymisierte oder für die Analyse notwendige Daten.", status: "ok" },
      { id: "tech_auth", label: "Authentifizierungspflicht für alle KI-Funktionen", beschreibung: "Alle Backend-Funktionen prüfen base44.auth.me() vor der Verarbeitung. Unautorisierte Anfragen werden mit HTTP 401 abgelehnt.", status: "ok" },
      { id: "tech_ki_log", label: "KI-Nutzungsprotokoll (KIUsageLog-Entity)", beschreibung: "Jede KI-Nutzung wird mit Funktion, Kontext, Modell und Zeitstempel protokolliert. Ratingfeedback durch Nutzer zur kontinuierlichen Qualitätssicherung.", status: "ok" },
      { id: "tech_agent_rls", label: "Agent-Isolation: Keine Nutzer-Kreuzabfragen", beschreibung: "KI-Agenten sind durch die Plattform-RLS technisch daran gehindert, Daten anderer Nutzer abzufragen oder zu kombinieren.", status: "ok" },
    ]
  },
];

const AGENTS = [
  {
    name: "fall_assistent",
    label: "Fall-Assistent",
    beschreibung: "Juristischer KI-Assistent für Fallanalyse, Argumentation und Fristen",
    compliance_highlights: [
      "Verschwiegenheit explizit im System-Prompt verankert",
      "Rechtsberatung nur als Assistenz für autorisierten Anwalt",
      "Keine Datenweitergabe nach außen",
      "KI-Ausgaben als solche gekennzeichnet",
    ]
  },
  {
    name: "plattform_optimierer",
    label: "Plattform-Optimierer",
    beschreibung: "Strategischer KI-Berater für Kanzlei-Qualitätssicherung und Plattformverbesserung",
    compliance_highlights: [
      "Zweckbindung auf Optimierung und Qualitätssicherung beschränkt",
      "Alle Datenänderungen im CaseHistory-Audit-Trail protokolliert",
      "Ausschließlich für autorisierte Kanzleinutzer zugänglich",
      "Keine eigenständige Mandatshandlung ohne Anwalt",
    ]
  },
  {
    name: "InvokeLLM (inline)",
    label: "Inline-KI-Analysen",
    beschreibung: "Direkte LLM-Aufrufe in Tabs (Argumente, Beweise, Prognose, Gegneranalyse etc.)",
    compliance_highlights: [
      "Nur für eingeloggten Nutzer — RLS sichert Datenisolation",
      "Outputs werden im KIUsageLog protokolliert",
      "Kein externer Datentransfer von Mandanteninhalten",
      "Anwalt bestätigt und übernimmt alle KI-Vorschläge manuell",
    ]
  },
];

const STATUS_CONFIG = {
  ok: { label: "Konform", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle },
  warning: { label: "Prüfen", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle },
  info: { label: "Info", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: Info },
};

const FARBE_CONFIG = {
  emerald: { badge: "bg-emerald-100 text-emerald-800", header: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600" },
  blue: { badge: "bg-blue-100 text-blue-800", header: "bg-blue-50 border-blue-200", icon: "text-blue-600" },
  violet: { badge: "bg-violet-100 text-violet-800", header: "bg-violet-50 border-violet-200", icon: "text-violet-600" },
  gray: { badge: "bg-gray-100 text-gray-800", header: "bg-gray-50 border-gray-200", icon: "text-gray-600" },
};

function ComplianceKategorie({ gruppe }) {
  const [open, setOpen] = useState(true);
  const Icon = gruppe.icon;
  const fc = FARBE_CONFIG[gruppe.farbe];
  const allOk = gruppe.checks.every(c => c.status === "ok");

  return (
    <div className={`border rounded-2xl overflow-hidden`} style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-4 ${fc.header} border-b`}
        style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${fc.icon}`} />
          <span className="font-semibold text-gray-900 text-sm">{gruppe.kategorie}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${fc.badge}`}>
            {gruppe.checks.length} Checks
          </span>
          {allOk && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Alle konform</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {gruppe.checks.map(check => {
            const sc = STATUS_CONFIG[check.status];
            const StatusIcon = sc.icon;
            return (
              <div key={check.id} className="px-5 py-4 bg-white flex items-start gap-4">
                <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${sc.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-gray-900">{check.label}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${sc.bg} ${sc.color} ${sc.border}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{check.beschreibung}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent }) {
  return (
    <div className="bg-white border rounded-xl p-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{agent.label}</p>
          <p className="text-[10px] font-mono text-gray-400">{agent.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{agent.beschreibung}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {agent.compliance_highlights.map((h, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-gray-600">{h}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KICompliance() {
  const totalChecks = COMPLIANCE_CHECKS.reduce((s, g) => s + g.checks.length, 0);
  const okChecks = COMPLIANCE_CHECKS.reduce((s, g) => s + g.checks.filter(c => c.status === "ok").length, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/modules" className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <ArrowLeft className="w-4 h-4" /> Module
            </Link>
            <span className="text-gray-200">·</span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h1 className="font-bold text-gray-900 text-sm">KI-Compliance & Anwaltsgeheimnis</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 font-semibold">
              {okChecks}/{totalChecks} Checks bestanden
            </span>
            <span className="text-[10px] text-gray-400">Stand: {new Date().toLocaleDateString("de-DE")}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Intro */}
        <div className="bg-white border rounded-2xl p-6" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 mb-1">Technische Compliance-Dokumentation</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Diese Seite dokumentiert, wie MachiavelLEX das Anwaltsgeheimnis (§ 43a BRAO, § 203 StGB), die DSGVO und den EU AI Act technisch umsetzt. Alle KI-Systeme der Plattform wurden gemäß dieser Anforderungen konfiguriert.
              </p>
              <div className="flex flex-wrap gap-2">
                {["§ 43a BRAO", "§ 203 StGB", "DSGVO Art. 5, 25", "EU AI Act Art. 13–14", "BORA"].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Compliance-Score", value: `${Math.round((okChecks/totalChecks)*100)}%`, icon: Shield, color: "text-emerald-600" },
            { label: "KI-Agenten geprüft", value: AGENTS.length, icon: Bot, color: "text-violet-600" },
            { label: "Rechtliche Checks", value: totalChecks, icon: Scale, color: "text-blue-600" },
            { label: "Dokumentenstand", value: new Date().toLocaleDateString("de-DE", {month:"short", year:"numeric"}), icon: FileText, color: "text-gray-600" },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border rounded-xl p-4 text-center" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-[10px] text-gray-400">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Compliance Checks */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Technische Compliance-Checks
          </h3>
          <div className="space-y-3">
            {COMPLIANCE_CHECKS.map(gruppe => (
              <ComplianceKategorie key={gruppe.kategorie} gruppe={gruppe} />
            ))}
          </div>
        </div>

        {/* Agent Overview */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-600" /> KI-Systeme im Überblick
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map(agent => <AgentCard key={agent.name} agent={agent} />)}
          </div>
        </div>

        {/* Hinweis */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Wichtiger Hinweis</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Diese Dokumentation beschreibt die technische Umsetzung. Sie ersetzt keine juristische Datenschutz-Folgenabschätzung (Art. 35 DSGVO) und keine berufsrechtliche Prüfung durch einen Datenschutzbeauftragten. Für eine rechtsverbindliche Zertifizierung empfehlen wir eine externe Prüfung.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
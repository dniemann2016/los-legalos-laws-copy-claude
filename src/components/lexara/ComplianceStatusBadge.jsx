/**
 * ComplianceStatusBadge.jsx
 * Zeigt den DSGVO-/Compliance-Status eines einzelnen Arguments oder Beweises als Mini-Badge.
 * Wird direkt in ArgCard (TabArgumente) und EvidenceCard (TabBeweise) eingebettet.
 */

import { Shield, ShieldOff, ShieldQuestion } from "lucide-react";

/**
 * Bewertet ein Argument oder einen Beweis auf datenschutzrechtliche Konformität.
 * Regeln:
 *  - KI-Bewertung vorhanden → vollständig konform (transparent, nachvollziehbar)
 *  - Keine KI-Bewertung + kein Beleg → unklar
 *  - KI-Bewertung + Diskrepanz ≥ 4 → Prüfung empfohlen
 */
export function getComplianceStatus(item, type = "argument") {
  const hasKi = item.ki_strength !== undefined && item.ki_strength !== null
    || item.ki_weight !== undefined && item.ki_weight !== null;
  const discrepancy = type === "argument"
    ? Math.abs((item.strength || 5) - (item.ki_strength ?? item.strength ?? 5))
    : Math.abs((item.weight || 5) - (item.ki_weight ?? item.weight ?? 5));

  if (!hasKi) return "ungeprüft";
  if (discrepancy >= 4) return "prüfen";
  return "konform";
}

const CONFIG = {
  konform: {
    label: "DSGVO-konform",
    icon: Shield,
    classes: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  prüfen: {
    label: "Prüfung empfohlen",
    icon: ShieldOff,
    classes: "text-amber-600 bg-amber-50 border-amber-200",
  },
  ungeprüft: {
    label: "KI-Prüfung ausstehend",
    icon: ShieldQuestion,
    classes: "text-gray-400 bg-gray-50 border-gray-200",
  },
};

export default function ComplianceStatusBadge({ item, type = "argument" }) {
  const status = getComplianceStatus(item, type);
  const cfg = CONFIG[status];
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cfg.classes}`}
      title={cfg.label}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}
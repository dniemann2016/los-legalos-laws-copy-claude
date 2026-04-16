import { base44 } from "@/api/base44Client";

/**
 * Hook zum Protokollieren von KI-Anfragen und -Antworten.
 * Speichert jeden KI-Aufruf als KIUsageLog-Eintrag.
 */
export function useKIProtokoll(caseId) {
  const logKI = async ({ kiName, eingabe, ausgabe, dokumente = [], modell = "standard" }) => {
    const eingabeSummary = typeof eingabe === "string"
      ? eingabe.slice(0, 500)
      : JSON.stringify(eingabe).slice(0, 500);

    const ausgabeText = typeof ausgabe === "string"
      ? ausgabe
      : JSON.stringify(ausgabe, null, 2);

    const docsInfo = dokumente.length > 0
      ? `\nDokumente: ${dokumente.join(", ")}`
      : "";

    await base44.entities.KIUsageLog.create({
      case_id: caseId,
      ki_function: kiName,
      input_summary: eingabeSummary + docsInfo,
      output: ausgabeText,
      model: modell,
      context: kiName,
      timestamp: new Date().toISOString(),
    });
  };

  return { logKI };
}
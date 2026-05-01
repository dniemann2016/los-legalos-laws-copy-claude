/**
 * kiProvider.js — Zentraler KI-Adapter für MachiavelLEX / Strategos
 *
 * ZWECK:
 *   Alle KI-Aufrufe der App laufen über diese Datei.
 *   Um die KI zu wechseln (z.B. auf Ollama, LM Studio, OpenAI-kompatible API),
 *   muss NUR diese Datei angepasst werden — kein einziger Button oder
 *   keine einzige Seite muss geändert werden.
 *
 * AKTUELLER MODUS: "base44" (Standard-Cloud-KI)
 *
 * ──────────────────────────────────────────────
 * UM AUF EINE OFFLINE-KI ZU WECHSELN:
 *   1. Setzen Sie KI_MODE = "offline"
 *   2. Tragen Sie OFFLINE_KI_URL ein (z.B. "http://localhost:11434/api/generate" für Ollama)
 *   3. Optional: OFFLINE_KI_MODEL anpassen (z.B. "llama3", "mistral", "phi3")
 *
 * OFFLINE-KI ANFORDERUNGEN:
 *   - Muss einen HTTP-Endpunkt bereitstellen
 *   - Muss JSON-Antworten zurückgeben
 *   - Empfohlen: OpenAI-kompatible API oder Ollama
 * ──────────────────────────────────────────────
 */

import { base44 } from "@/api/base44Client";

// ── Konfiguration ─────────────────────────────────────────────────────────────
const KI_MODE = "base44"; // "base44" | "offline"
const OFFLINE_KI_URL = "http://localhost:11434/api/chat"; // z.B. Ollama
const OFFLINE_KI_MODEL = "llama3"; // z.B. "llama3", "mistral", "phi3", "gemma"

// ── Haupt-Funktion ────────────────────────────────────────────────────────────
/**
 * invokeLLM — Einheitlicher KI-Aufruf für die gesamte App
 *
 * @param {Object} params
 * @param {string}  params.prompt              - Der Prompt
 * @param {Object}  [params.response_json_schema] - Erwartetes JSON-Schema
 * @param {string[]}[params.file_urls]         - Optionale Datei-URLs
 * @param {boolean} [params.add_context_from_internet] - Web-Kontext
 * @param {string}  [params.model]             - Modell-Override (nur cloud)
 * @returns {Promise<Object|string>}
 */
export async function invokeLLM(params) {
  if (KI_MODE === "offline") {
    return await _invokeOfflineLLM(params);
  }
  // Standard: base44 Cloud-KI
  return await base44.integrations.Core.InvokeLLM(params);
}

// ── Offline-KI Adapter ────────────────────────────────────────────────────────
async function _invokeOfflineLLM({ prompt, response_json_schema, file_urls, model }) {
  const messages = [];

  // System-Anweisung für JSON-Output
  if (response_json_schema) {
    messages.push({
      role: "system",
      content: `Du bist ein juristischer KI-Assistent. Antworte AUSSCHLIESSLICH mit validem JSON. Schema: ${JSON.stringify(response_json_schema)}`
    });
  } else {
    messages.push({
      role: "system",
      content: "Du bist ein juristischer KI-Assistent für Rechtsanwälte."
    });
  }

  // Bilder/Dateien als Text-Hinweis anfügen (falls unterstützt)
  let fullPrompt = prompt;
  if (file_urls && file_urls.length > 0) {
    fullPrompt += `\n\n[Hinweis: ${file_urls.length} Datei(en) wurden hochgeladen, aber können von der Offline-KI möglicherweise nicht direkt verarbeitet werden.]`;
  }

  messages.push({ role: "user", content: fullPrompt });

  const requestBody = {
    model: model || OFFLINE_KI_MODEL,
    messages,
    stream: false,
    ...(response_json_schema ? { format: "json" } : {}),
  };

  const response = await fetch(OFFLINE_KI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Offline-KI Fehler: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Ollama-Antwortformat: data.message.content
  const rawContent =
    data?.message?.content ||
    data?.choices?.[0]?.message?.content || // OpenAI-kompatibel
    data?.response || // Ollama generate endpoint
    "";

  if (!response_json_schema) {
    return rawContent;
  }

  // JSON parsen
  try {
    const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn("[kiProvider] JSON-Parse fehlgeschlagen, gebe Rohtext zurück:", rawContent);
    return {};
  }
}

/**
 * uploadFile — Datei-Upload (bleibt bei base44, da Offline-KIs
 * normalerweise keinen eigenen Upload-Dienst haben)
 */
export async function uploadFile(params) {
  return await base44.integrations.Core.UploadFile(params);
}
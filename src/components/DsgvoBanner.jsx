import { useState } from "react";
import { Shield, X } from "lucide-react";

export default function DsgvoBanner() {
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem("dsgvo_banner_dismissed") === "true"
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem("dsgvo_banner_dismissed", "true");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3">
        <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
        <p className="text-xs text-gray-300 flex-1">
          <span className="font-semibold text-white">Datenschutz & Vertraulichkeit:</span>{" "}
          Alle Daten werden ausschließlich auf EU-Servern verarbeitet und gespeichert. 
          Die Nutzung dieser Plattform ist auf autorisierte Kanzleimitarbeiter beschränkt. 
          Mandantendaten unterliegen der anwaltlichen Schweigepflicht (§ 203 StGB) und werden nicht an Dritte weitergegeben.
        </p>
        <button onClick={dismiss} className="text-gray-400 hover:text-white flex-shrink-0 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
import { useJurisdiction } from "../hooks/useJurisdiction";

export default function JurisdictionToggle({ className = "" }) {
  const { jurisdiction, set } = useJurisdiction();

  return (
    <div className={`flex items-center bg-gray-100 rounded-xl p-1 gap-1 ${className}`}>
      <button
        onClick={() => set("DE")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          jurisdiction === "DE"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        🇩🇪 DE
      </button>
      <button
        onClick={() => set("US")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          jurisdiction === "US"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        🇺🇸 US
      </button>
    </div>
  );
}
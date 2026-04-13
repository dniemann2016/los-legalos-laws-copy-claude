import { useJurisdiction } from "../hooks/useJurisdiction";

export default function JurisdictionToggle({ className = "", dark = false }) {
  const { jurisdiction, set } = useJurisdiction();

  const base = dark
    ? "flex items-center rounded-lg p-0.5 gap-0.5 bg-white/10"
    : "flex items-center bg-gray-100 rounded-xl p-1 gap-1";

  const active = dark
    ? "bg-white/20 text-white"
    : "bg-white text-gray-900 shadow-sm";

  const inactive = dark
    ? "text-white/40 hover:text-white/70"
    : "text-gray-400 hover:text-gray-600";

  return (
    <div className={`${base} ${className}`}>
      <button onClick={() => set("DE")}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${jurisdiction === "DE" ? active : inactive}`}>
        🇩🇪 DE
      </button>
      <button onClick={() => set("US")}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${jurisdiction === "US" ? active : inactive}`}>
        🇺🇸 US
      </button>
    </div>
  );
}
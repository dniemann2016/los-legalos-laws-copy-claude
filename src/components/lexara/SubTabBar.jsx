/**
 * SubTabBar.jsx — Wiederverwendbare Sub-Tab-Navigation
 *
 * Zwei Ebenen:
 *   level="primary"   → Haupt-Unterreiter (größer, mit farbiger Unterstreichung)
 *   level="secondary" → Unter-Unterreiter (kompakter, Pill-Stil)
 */

export default function SubTabBar({ tabs, active, onChange, level = "primary" }) {
  if (level === "secondary") {
    return (
      <div className="flex flex-wrap gap-1.5 px-1 py-1 bg-gray-50 border border-gray-100 rounded-xl">
        {tabs.map((label, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="no-override whitespace-nowrap transition-all"
            style={{
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: active === i ? 600 : 400,
              borderRadius: 8,
              border: active === i ? "1.5px solid #5B7FBF" : "1.5px solid transparent",
              background: active === i ? "rgba(91,127,191,0.10)" : "transparent",
              color: active === i ? "#3B5FA0" : "#6B7280",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  // primary level
  return (
    <div
      className="flex overflow-x-auto"
      style={{
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        gap: 0,
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((label, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="no-override whitespace-nowrap transition-all"
          style={{
            padding: "9px 16px 10px",
            fontSize: 12.5,
            fontWeight: active === i ? 600 : 400,
            color: active === i ? "#1a1a1a" : "#9CA3AF",
            borderBottom: active === i ? "2px solid #5B7FBF" : "2px solid transparent",
            background: "transparent",
            border: "none",
            borderBottom: active === i ? "2px solid #5B7FBF" : "2px solid transparent",
            cursor: "pointer",
            marginBottom: "-1px",
            letterSpacing: active === i ? "-0.01em" : "0",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
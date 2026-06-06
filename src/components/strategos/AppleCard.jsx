// Reusable Apple / SwiftUI style card primitives for STRATEGOS Enterprise
export const SF = { fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" };

export function AppleCard({ title, subtitle, action, children, accentColor }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(20px)",
      borderRadius: 20,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
      ...SF,
    }}>
      {(title || action) && (
        <div style={{
          padding: "18px 22px 12px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: accentColor ? `2px solid ${accentColor}` : "none",
        }}>
          <div>
            {title && <p style={{ fontSize: 11, fontWeight: 700, color: accentColor || "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</p>}
            {subtitle && <p style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 600, marginTop: 3, letterSpacing: "-0.1px" }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: "16px 22px 20px" }}>{children}</div>
    </div>
  );
}

export function AppleField({ label, children, required }) {
  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#FF3B30", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function AppleInput(props) {
  return (
    <input {...props} style={{
      width: "100%",
      padding: "10px 12px",
      fontSize: 13,
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 10,
      background: "rgba(255,255,255,0.8)",
      outline: "none",
      transition: "border-color 0.15s, box-shadow 0.15s",
      ...SF,
      ...(props.style || {}),
    }}
      onFocus={e => { e.target.style.borderColor = "#007AFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,122,255,0.15)"; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
  );
}

export function AppleTextarea(props) {
  return (
    <textarea {...props} style={{
      width: "100%",
      padding: "10px 12px",
      fontSize: 13,
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 10,
      background: "rgba(255,255,255,0.8)",
      outline: "none",
      resize: "vertical",
      fontFamily: SF.fontFamily,
      ...(props.style || {}),
    }}
      onFocus={e => { e.target.style.borderColor = "#007AFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,122,255,0.15)"; props.onFocus?.(e); }}
      onBlur={e => { e.target.style.borderColor = "rgba(0,0,0,0.1)"; e.target.style.boxShadow = "none"; props.onBlur?.(e); }}
    />
  );
}

export function AppleSelect(props) {
  const { children, ...rest } = props;
  return (
    <select {...rest} style={{
      width: "100%",
      padding: "10px 12px",
      fontSize: 13,
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 10,
      background: "rgba(255,255,255,0.8)",
      outline: "none",
      cursor: "pointer",
      fontFamily: SF.fontFamily,
      ...(props.style || {}),
    }}>{children}</select>
  );
}

export function ApplePill({ children, color = "#007AFF", bg, onClick, active }) {
  const actualBg = bg || (color + "15");
  return (
    <button onClick={onClick} style={{
      padding: "5px 11px",
      fontSize: 11,
      fontWeight: 600,
      background: active ? color : actualBg,
      color: active ? "#fff" : color,
      border: active ? "none" : `1px solid ${color}30`,
      borderRadius: 8,
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.15s",
      ...SF,
    }}>{children}</button>
  );
}

export function AppleButton({ children, onClick, variant = "primary", disabled, icon: Icon, style }) {
  const colors = {
    primary: { bg: "#007AFF", color: "#fff", shadow: "0 2px 8px rgba(0,122,255,0.3)" },
    accent: { bg: "#34C759", color: "#fff", shadow: "0 2px 8px rgba(52,199,89,0.3)" },
    violet: { bg: "#5856D6", color: "#fff", shadow: "0 2px 8px rgba(88,86,214,0.3)" },
    warning: { bg: "#FF9500", color: "#fff", shadow: "0 2px 8px rgba(255,149,0,0.3)" },
    ghost: { bg: "rgba(0,0,0,0.05)", color: "#333", shadow: "none" },
  };
  const c = colors[variant] || colors.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "9px 16px",
      fontSize: 12,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      border: "none",
      borderRadius: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      boxShadow: c.shadow,
      transition: "transform 0.1s, box-shadow 0.15s",
      ...SF,
      ...(style || {}),
    }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {Icon && <Icon style={{ width: 14, height: 14 }} />} {children}
    </button>
  );
}
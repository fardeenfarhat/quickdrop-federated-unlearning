import { useState } from "react";

export const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const paths = {
    train:   <><path d="M3 12h2l3-7 4 14 3-7h6"/></>,
    clients: <><circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></>,
    unlearn: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v5M14 11v5"/></>,
    metrics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    play:    <><path d="M6 4l14 8-14 8z" fill="currentColor"/></>,
    pause:   <><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></>,
    reset:   <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></>,
    chevron: <><path d="M9 6l6 6-6 6"/></>,
    check:   <><path d="M4 12l5 5L20 6"/></>,
    x:       <><path d="M6 6l12 12M18 6L6 18"/></>,
    sparkle: <><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></>,
    shield:  <><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></>,
    bolt:    <><path d="M13 3L4 14h7l-1 7 9-11h-7z"/></>,
    arrow:   <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    dot:     <><circle cx="12" cy="12" r="4" fill="currentColor"/></>,
    lock:    <><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>,
    info:    <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

export const Button = ({ kind = "primary", icon, children, onClick, disabled, size = "md" }) => {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: size === "sm" ? "6px 12px" : "9px 16px",
    fontSize: size === "sm" ? 12.5 : 13.5,
    fontWeight: 500, fontFamily: "inherit",
    borderRadius: 6, border: "1px solid transparent",
    transition: "all .15s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    letterSpacing: "-0.005em",
  };
  const styles = {
    primary:      { background: "var(--violet)",   color: "oklch(15% 0.01 280)", borderColor: "var(--violet)" },
    secondary:    { background: "var(--bg-2)",     color: "var(--fg-1)",         borderColor: "var(--line)" },
    ghost:        { background: "transparent",     color: "var(--fg-2)",         borderColor: "transparent" },
    danger:       { background: "var(--coral-bg)", color: "var(--coral)",        borderColor: "var(--coral-2)" },
    dangerSolid:  { background: "var(--coral-2)",  color: "oklch(15% 0.01 280)", borderColor: "var(--coral-2)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...styles[kind] }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = "brightness(1.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

export const Card = ({ title, subtitle, action, children, padding = 20, accent }) => (
  <div style={{
    background: "var(--bg-1)", border: "1px solid var(--line)",
    borderRadius: 10, overflow: "hidden", position: "relative",
  }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
    {(title || action) && (
      <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)" }}>
        <div>
          {title && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
    )}
    <div style={{ padding }}>{children}</div>
  </div>
);

export const Stat = ({ label, value, sub, color = "var(--fg-0)", trend }) => (
  <div style={{ padding: 18, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 10, position: "relative", overflow: "hidden" }}>
    <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</div>
    <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 500, color, marginTop: 8, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && (
      <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
        {trend !== undefined && <TrendArrow trend={trend} />}
        {sub}
      </div>
    )}
  </div>
);

export const TrendArrow = ({ trend }) => (
  <span style={{ display: "inline-flex", alignItems: "center", color: trend > 0 ? "var(--mint)" : "var(--coral)", fontFamily: "var(--mono)", fontSize: 10.5 }}>
    {trend > 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
  </span>
);

export const Field = ({ label, hint, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 11, color: "var(--fg-2)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    {children}
    {hint && <span style={{ fontSize: 11, color: "var(--fg-3)" }}>{hint}</span>}
  </label>
);

export const Input = (props) => (
  <input {...props} style={{
    background: "var(--bg-2)", border: "1px solid var(--line)",
    borderRadius: 6, padding: "8px 12px",
    color: "var(--fg-0)", fontSize: 13,
    fontFamily: props.type === "number" ? "var(--mono)" : "inherit",
    fontWeight: 500, outline: "none", width: "100%",
    transition: "border-color .15s",
    ...props.style,
  }}
  onFocus={e => { e.target.style.borderColor = "var(--violet)"; }}
  onBlur={e => { e.target.style.borderColor = "var(--line)"; }}
  />
);

export const Select = ({ value, onChange, options }) => (
  <div style={{ position: "relative" }}>
    <select value={value} onChange={onChange} style={{
      background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6,
      padding: "8px 32px 8px 12px", color: "var(--fg-0)", fontSize: 13, fontFamily: "inherit",
      outline: "none", width: "100%", appearance: "none", cursor: "pointer", fontWeight: 500,
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "var(--fg-3)", pointerEvents: "none" }}>
      <Icon name="chevron" size={12} />
    </div>
  </div>
);

export const Pill = ({ children, color = "var(--fg-2)", bg = "var(--bg-2)", border }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "3px 9px", borderRadius: 999, fontSize: 11,
    fontWeight: 500, color, background: bg,
    border: border ? `1px solid ${border}` : "1px solid transparent",
    fontFamily: "var(--mono)", letterSpacing: "-0.005em",
  }}>{children}</span>
);

export const StatusDot = ({ status }) => {
  const colors = {
    idle: "var(--fg-3)", training: "var(--amber)", ready: "var(--mint)",
    distilling: "var(--violet)", unlearning: "var(--coral)", complete: "var(--mint)",
  };
  const active = ["training", "distilling", "unlearning"].includes(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: colors[status] || "var(--fg-3)",
        boxShadow: `0 0 0 3px ${(colors[status] || "var(--fg-3)")}40`,
        animation: active ? "pulse 1.4s ease-in-out infinite" : "none",
        display: "inline-block",
      }} />
      {status}
    </span>
  );
};

export const ProgressBar = ({ value, max, color = "var(--violet)", showLabel = true }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--mono)" }}>
          <span>{value} / {max}</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          transition: "width .5s ease",
          boxShadow: `0 0 12px ${color}`,
        }} />
      </div>
    </div>
  );
};

export const PageHeader = ({ eyebrow, title, subtitle, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
    <div>
      {eyebrow && <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--violet)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{eyebrow}</div>}
      <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.02em" }}>{title}</h1>
      {subtitle && <p style={{ color: "var(--fg-2)", fontSize: 14, marginTop: 6, maxWidth: 680, lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
    {right}
  </div>
);

export const Mini = ({ label, value, accent }) => (
  <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--line)" }}>
    <div style={{ fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    <div style={{ fontFamily: "var(--mono)", fontSize: 17, color: accent || "var(--fg-0)", marginTop: 4, fontWeight: 500 }}>{value}</div>
  </div>
);

export const EmptyChart = ({ label }) => (
  <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--line)", borderRadius: 8, color: "var(--fg-3)", fontSize: 12 }}>
    {label}
  </div>
);

export const StepCard = ({ num, title, desc, done, active, children }) => (
  <div style={{
    background: "var(--bg-1)", border: `1px solid ${active ? "var(--violet-2)" : "var(--line)"}`,
    borderRadius: 10, padding: 22, position: "relative", overflow: "hidden",
  }}>
    {active && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, var(--violet), transparent)" }} />}
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: done ? "oklch(40% 0.08 165 / 0.25)" : active ? "var(--violet-bg)" : "var(--bg-2)",
        color: done ? "var(--mint)" : active ? "var(--violet)" : "var(--fg-3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600,
        border: "1px solid",
        borderColor: done ? "var(--mint)" : active ? "var(--violet-2)" : "var(--line)",
      }}>{done ? <Icon name="check" size={14} /> : num}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
    {children}
  </div>
);

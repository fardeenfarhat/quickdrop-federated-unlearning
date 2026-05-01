// Custom SVG charts — no external dependency, full design control

export const LineChart = ({ data, accessor, height = 220, color = "var(--violet)", animated = true, yDomain = [0, 1], yFormat = v => `${(v * 100).toFixed(0)}%`, gridY = 5 }) => {
  const W = 720, H = height, P = { t: 16, r: 16, b: 28, l: 44 };
  if (!data || data.length === 0) return null;
  const xMax = Math.max(1, data.length - 1);
  const [yMin, yMax] = yDomain;
  const xScale = x => P.l + (x / xMax) * (W - P.l - P.r);
  const yScale = y => P.t + (1 - (y - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(accessor(d))}`).join(" ");
  const area = `${path} L ${xScale(xMax)} ${yScale(yMin)} L ${xScale(0)} ${yScale(yMin)} Z`;
  const ticks = Array.from({ length: gridY + 1 }, (_, i) => yMin + (i / gridY) * (yMax - yMin));
  const fillId = `lc-fill-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={yScale(t)} y2={yScale(t)} stroke="oklch(30% 0.012 280)" strokeDasharray="2 4" />
          <text x={P.l - 8} y={yScale(t) + 3} textAnchor="end" fill="oklch(48% 0.012 280)" fontSize="10" fontFamily="JetBrains Mono, monospace">{yFormat(t)}</text>
        </g>
      ))}
      {data.map((d, i) => i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
        <text key={i} x={xScale(i)} y={H - 10} textAnchor="middle" fill="oklch(48% 0.012 280)" fontSize="10" fontFamily="JetBrains Mono, monospace">{i + 1}</text>
      ))}
      <path d={area} fill={`url(#${fillId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={animated ? { strokeDasharray: 2000, strokeDashoffset: 0, animation: "drawLine .9s ease-out" } : {}} />
      {data.length > 0 && (() => {
        const i = data.length - 1;
        const cy = yScale(accessor(data[i]));
        return (
          <g>
            <circle cx={xScale(i)} cy={cy} r="4" fill={color} />
            <circle cx={xScale(i)} cy={cy} r="8" fill={color} opacity="0.2" />
          </g>
        );
      })()}
    </svg>
  );
};

export const BarChart = ({ data, height = 220, colors = ["var(--fg-3)", "var(--violet)"] }) => {
  if (!data || data.length === 0) return null;
  const W = 720, H = height, P = { t: 16, r: 16, b: 36, l: 44 };
  const keys = Object.keys(data[0]).filter(k => k !== "name");
  const allVals = data.flatMap(d => keys.map(k => d[k]));
  const max = Math.max(...allVals) * 1.1 || 100;
  const groupW = (W - P.l - P.r) / data.length;
  const barW = groupW * 0.7 / keys.length;
  const xScale = (i, ki) => P.l + i * groupW + groupW * 0.15 + ki * barW;
  const yScale = y => P.t + (1 - y / max) * (H - P.t - P.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={yScale(t * max)} y2={yScale(t * max)} stroke="oklch(30% 0.012 280)" strokeDasharray="2 4" />
          <text x={P.l - 8} y={yScale(t * max) + 3} textAnchor="end" fill="oklch(48% 0.012 280)" fontSize="10" fontFamily="JetBrains Mono, monospace">{(t * max).toFixed(0)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={i}>
          {keys.map((k, ki) => (
            <rect key={k} x={xScale(i, ki)} width={barW} y={yScale(d[k])} height={Math.max(0, H - P.b - yScale(d[k]))}
              fill={colors[ki % colors.length]} rx="2" style={{ animation: `fadeIn ${0.3 + i * 0.06}s ease both` }} />
          ))}
          <text x={P.l + i * groupW + groupW / 2} y={H - 14} textAnchor="middle" fill="oklch(64% 0.012 280)" fontSize="11">{d.name}</text>
        </g>
      ))}
      <g transform={`translate(${P.l}, 0)`}>
        {keys.map((k, ki) => (
          <g key={k} transform={`translate(${ki * 90}, 0)`}>
            <rect width="10" height="10" y="2" fill={colors[ki % colors.length]} rx="2" />
            <text x="16" y="11" fill="oklch(64% 0.012 280)" fontSize="11">{k}</text>
          </g>
        ))}
      </g>
    </svg>
  );
};

export const RadarChart = ({ axes, height = 280 }) => {
  if (!axes || axes.length === 0) return null;
  const W = 360, H = height, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 36;
  const N = axes.length;
  const angle = i => (-Math.PI / 2) + (i / N) * 2 * Math.PI;
  const point = (i, v) => [cx + Math.cos(angle(i)) * R * v, cy + Math.sin(angle(i)) * R * v];
  const valuePath = axes.map((a, i) => point(i, a.value / 100)).map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height, maxWidth: 360, margin: "0 auto", display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r}
          points={Array.from({ length: N }, (_, i) => point(i, r).join(",")).join(" ")}
          fill="none" stroke="oklch(30% 0.012 280)" strokeDasharray={r === 1 ? "0" : "2 3"} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="oklch(30% 0.012 280)" />;
      })}
      <polygon points={axes.map((a, i) => point(i, a.value / 100).join(",")).join(" ")}
        fill="var(--violet)" fillOpacity="0.18" stroke="var(--violet)" strokeWidth="1.5"
        style={{ animation: "fadeIn .6s ease" }} />
      {axes.map((a, i) => {
        const [px, py] = point(i, a.value / 100);
        return <circle key={`d${i}`} cx={px} cy={py} r="3" fill="var(--violet)" />;
      })}
      {axes.map((a, i) => {
        const [lx, ly] = point(i, 1.15);
        return (
          <g key={`l${i}`}>
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="oklch(82% 0.008 280)" fontSize="11" fontWeight="500">{a.label}</text>
            <text x={lx} y={ly + 13} textAnchor="middle" fill="oklch(48% 0.012 280)" fontSize="10" fontFamily="JetBrains Mono, monospace">{a.value.toFixed(0)}</text>
          </g>
        );
      })}
    </svg>
  );
};

export const DistMini = ({ dist, color = "var(--violet)", height = 22 }) => {
  if (!dist || dist.length === 0) return null;
  const max = Math.max(...dist);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height, width: "100%" }}>
      {dist.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${(v / max) * 100}%`, minHeight: 2,
          background: color, opacity: 0.4 + (v / max) * 0.6, borderRadius: "1px 1px 0 0",
        }} />
      ))}
    </div>
  );
};

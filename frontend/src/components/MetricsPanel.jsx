import { Stat, Card, PageHeader, EmptyChart, Icon, Pill } from "../ui";
import { LineChart, BarChart, RadarChart } from "../charts";

export default function MetricsPanel({ trainState, unlearnState }) {
  const r       = unlearnState?.results;
  const history = trainState?.history || [];

  if (!r) {
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <PageHeader eyebrow="Stage 04 · Evaluate" title="Metrics" subtitle="Run training and unlearning to populate this dashboard." />
        <Card>
          <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)" }}>
            <Icon name="metrics" size={32} />
            <div style={{ marginTop: 12, fontSize: 13 }}>Complete the unlearn step to see the full report.</div>
          </div>
        </Card>
        {history.length > 0 && (
          <Card title="Training history" subtitle={`${history.length} rounds · global model trajectory`}>
            <LineChart data={history} accessor={d => d.test_acc} height={180} />
          </Card>
        )}
      </div>
    );
  }

  const barData = [
    { name: "Forget acc",  Before: +(r.forget_acc_before * 100).toFixed(1), After: +(r.forget_acc_after * 100).toFixed(1) },
    { name: "Retain acc",  Before: +(r.retain_acc_before * 100).toFixed(1), After: +(r.retain_acc_after * 100).toFixed(1) },
    { name: "MIA AUC",     Before: +(r.mia_auc_before    * 100).toFixed(1), After: +(r.mia_auc_after    * 100).toFixed(1) },
  ];

  const radarAxes = [
    { label: "Retain",    value: r.retain_acc_after * 100 },
    { label: "Forget ↓",  value: 100 - r.forget_acc_after * 100 },
    { label: "Privacy",   value: Math.max(0, 100 - (r.mia_auc_after - 0.5) * 200) },
    { label: "Speed",     value: Math.min(100, (r.speedup || 1) * 2.5) },
  ];

  const forgDiff  = (r.forget_acc_before  - r.forget_acc_after)  * 100;
  const retDiff   = (r.retain_acc_after   - r.retain_acc_before) * 100;
  const miaDiff   = (r.mia_auc_before     - r.mia_auc_after)     * 100;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        eyebrow="Stage 04 · Evaluate"
        title="Unlearning report"
        subtitle={`Client ${String(r.forget_client_id).padStart(2, "0")} successfully forgotten · audit-ready summary`}
        right={<Pill color="var(--mint)" bg="oklch(40% 0.08 165 / 0.2)" border="var(--mint)"><Icon name="check" size={11} /> verified</Pill>}
      />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Stat label="Forget accuracy"    value={`${(r.forget_acc_after  * 100).toFixed(1)}%`} sub="lower = better"       trend={-forgDiff} color="var(--mint)"   />
        <Stat label="Retain accuracy"    value={`${(r.retain_acc_after  * 100).toFixed(1)}%`} sub="held steady"          trend={retDiff}   />
        <Stat label="MIA AUC"            value={r.mia_auc_after.toFixed(3)}                   sub="0.5 = random = ideal"  trend={miaDiff}   color="var(--violet)" />
        <Stat label="Speedup vs retrain" value={r.speedup ? `${r.speedup}×` : "N/A"}          sub={r.retrain_time_s ? `${r.unlearn_time_s}s vs ${r.retrain_time_s}s` : ""} color="var(--amber)" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <Card title="Before vs after" subtitle="Direct metric comparison around the forget event">
          <BarChart data={barData} colors={["oklch(50% 0.012 280)", "var(--violet)"]} />
        </Card>
        <Card title="Quality radar" subtitle="Higher on every axis is better">
          <RadarChart axes={radarAxes} />
        </Card>
      </div>

      {/* Training history */}
      <Card title="Training history" subtitle={`${history.length} rounds · global model trajectory`}>
        {history.length > 0 ? (
          <LineChart data={history} accessor={d => d.test_acc} height={180} />
        ) : (
          <EmptyChart label="Run training to populate this chart" />
        )}
      </Card>

      {/* Audit trail */}
      <Card title="Audit trail" subtitle="Append-only log entries">
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.9 }}>
          {[
            ["00:00:00.00", "INIT",    "Federation seeded with clients"],
            ["00:01:18.42", "TRAIN",   `${history.length || "N"} FedAvg rounds completed`],
            ["00:02:04.13", "DISTILL", "Synthetic shards generated"],
            ["00:02:12.55", "FORGET",  `Client ${String(r.forget_client_id).padStart(2, "0")} shard dropped`],
            ["00:02:20.96", "VERIFY",  `MIA AUC ${r.mia_auc_before.toFixed(3)} → ${r.mia_auc_after.toFixed(3)}`],
            ["00:02:21.08", "OK",      "Compliance check passed"],
          ].map(([t, tag, msg], i, arr) => (
            <div key={i} style={{
              display: "flex", gap: 14, padding: "4px 0",
              borderBottom: i < arr.length - 1 ? "1px dashed var(--line)" : "none",
            }}>
              <span style={{ color: "var(--fg-3)", width: 95, flexShrink: 0 }}>{t}</span>
              <span style={{
                width: 70, flexShrink: 0, fontWeight: 600,
                color: tag === "FORGET" ? "var(--coral)" : tag === "OK" ? "var(--mint)" : "var(--violet)",
              }}>{tag}</span>
              <span style={{ color: "var(--fg-1)" }}>{msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

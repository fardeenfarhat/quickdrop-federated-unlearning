import { useState, useEffect } from "react";
import { getClients, startDistillation, runUnlearning } from "../api";
import { Button, Card, Field, Input, Icon, Pill, ProgressBar, PageHeader, StepCard } from "../ui";

export default function UnlearnPanel({ unlearnState, unlearnPhase }) {
  const [clients,    setClients]    = useState([]);
  const [targetId,   setTargetId]   = useState(0);
  const [distillCfg, setDistillCfg] = useState({ ipc: 10, outer_steps: 5 });
  const [unlearnCfg, setUnlearnCfg] = useState({ finetune_epochs: 5, finetune_lr: 0.001, run_retrain_baseline: true });

  useEffect(() => {
    getClients().then(({ data }) => {
      const list = data.clients || [];
      setClients(list);
      if (list.length > 0) setTargetId(list[0].id);
    }).catch(() => {});
  }, []);

  const handleDistill = async () => {
    try { await startDistillation(distillCfg); } catch (_) {}
  };

  const handleUnlearn = async () => {
    try { await runUnlearning({ client_id: targetId, ...unlearnCfg }); } catch (_) {}
  };

  const busy        = unlearnState.status === "distilling" || unlearnState.status === "unlearning";
  const distillDone = !!unlearnState.results || unlearnState.status === "unlearning";
  const complete    = !!unlearnState.results;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        eyebrow="Stage 03 · Right to be forgotten"
        title="Forget a client"
        subtitle="Distill each client's data into a small synthetic shard, then drop the target shard and finetune. No retraining from scratch."
        right={<Pill color="var(--coral)" bg="var(--coral-bg)" border="var(--coral-2)"><Icon name="shield" size={11} /> GDPR Art. 17</Pill>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Step 1 — Distill */}
        <StepCard
          num="01"
          title="Distill client shards"
          done={distillDone}
          active={!distillDone && !busy}
          desc="Compress each client's local data into a tiny synthetic dataset that preserves training signal."
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Images / class">
              <Input type="number" value={distillCfg.ipc} onChange={e => setDistillCfg({ ...distillCfg, ipc: +e.target.value })} />
            </Field>
            <Field label="Outer steps">
              <Input type="number" value={distillCfg.outer_steps} onChange={e => setDistillCfg({ ...distillCfg, outer_steps: +e.target.value })} />
            </Field>
          </div>
          {unlearnState.status === "distilling" && (
            <div style={{ marginTop: 14 }}>
              <ProgressBar value={unlearnPhase} max={100} showLabel={false} />
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, fontFamily: "var(--mono)" }}>
                {unlearnState.message || "Distilling…"}
              </div>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Button kind="primary" icon="sparkle" onClick={handleDistill} disabled={busy || distillDone}>
              {distillDone ? "Distilled ✓" : unlearnState.status === "distilling" ? "Distilling…" : "Run distillation"}
            </Button>
          </div>
        </StepCard>

        {/* Step 2 — Select & Forget */}
        <StepCard
          num="02"
          title="Select & forget"
          done={complete}
          active={distillDone && !complete}
          desc="Pick the client whose data must be erased from the global model."
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 14 }}>
            {clients.map(c => (
              <button key={c.id} onClick={() => setTargetId(c.id)} disabled={!distillDone || busy} style={{
                padding: "10px 4px", borderRadius: 6, fontSize: 12,
                fontFamily: "var(--mono)", fontWeight: 500,
                background: targetId === c.id ? "var(--coral-bg)" : "var(--bg-2)",
                color: targetId === c.id ? "var(--coral)" : "var(--fg-2)",
                border: `1px solid ${targetId === c.id ? "var(--coral-2)" : "var(--line)"}`,
                cursor: distillDone && !busy ? "pointer" : "not-allowed",
                opacity: distillDone ? 1 : 0.4,
                transition: "all .12s",
              }}>
                C{String(c.id).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Finetune epochs">
              <Input type="number" value={unlearnCfg.finetune_epochs} onChange={e => setUnlearnCfg({ ...unlearnCfg, finetune_epochs: +e.target.value })} />
            </Field>
            <Field label="Finetune LR">
              <Input type="number" step="0.0001" value={unlearnCfg.finetune_lr} onChange={e => setUnlearnCfg({ ...unlearnCfg, finetune_lr: +e.target.value })} />
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--fg-2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={unlearnCfg.run_retrain_baseline}
              onChange={e => setUnlearnCfg({ ...unlearnCfg, run_retrain_baseline: e.target.checked })}
              style={{ accentColor: "var(--violet)", cursor: "pointer" }}
            />
            Run retrain-from-scratch baseline (slow but rigorous)
          </label>
          {unlearnState.status === "unlearning" && (
            <div style={{ marginTop: 14 }}>
              <ProgressBar value={unlearnPhase} max={100} color="var(--coral)" showLabel={false} />
              <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6, fontFamily: "var(--mono)" }}>
                {unlearnState.message || "Unlearning…"}
              </div>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Button kind="dangerSolid" icon="bolt" onClick={handleUnlearn} disabled={!distillDone || busy || complete}>
              Forget client {String(targetId).padStart(2, "00")}
            </Button>
          </div>
        </StepCard>
      </div>

      {/* Status message */}
      {unlearnState.message && !unlearnState.results && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-3)" }}>{unlearnState.message}</div>
      )}

      {/* Results */}
      {unlearnState.results && <UnlearnResults r={unlearnState.results} />}
    </div>
  );
}

function UnlearnResults({ r }) {
  return (
    <Card
      title={`Result: client ${String(r.forget_client_id).padStart(2, "0")} forgotten`}
      subtitle="Model state updated · audit log appended"
      accent="var(--mint)"
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <DeltaCard label="Forget accuracy"  before={r.forget_acc_before}  after={r.forget_acc_after}  lowerIsBetter hint="Target's data, post-erasure" />
        <DeltaCard label="Retain accuracy"  before={r.retain_acc_before}  after={r.retain_acc_after}  hint="Other clients' test data" />
        <DeltaCard label="MIA AUC"          before={r.mia_auc_before}     after={r.mia_auc_after}     lowerIsBetter hint="Membership inference (0.5 = ideal)" />
        <TimingCard r={r} />
      </div>
    </Card>
  );
}

function DeltaCard({ label, before, after, lowerIsBetter = false, hint }) {
  const improved    = lowerIsBetter ? after < before : after > before;
  const beforePct   = before * 100;
  const afterPct    = after  * 100;
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 24, fontWeight: 500, color: improved ? "var(--mint)" : "var(--coral)" }}>
          {afterPct.toFixed(1)}%
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--fg-3)", textDecoration: "line-through" }}>
          {beforePct.toFixed(1)}%
        </span>
      </div>
      {/* mini delta bars */}
      <div style={{ marginTop: 10, height: 4, background: "var(--fg-3)", opacity: 0.25, borderRadius: 999, width: `${beforePct}%`, maxWidth: "100%" }} />
      <div style={{ marginTop: 3, height: 4, background: improved ? "var(--mint)" : "var(--coral)", borderRadius: 999, width: `${afterPct}%`, maxWidth: "100%" }} />
      {hint && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 10 }}>{hint}</div>}
    </div>
  );
}

function TimingCard({ r }) {
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Wall-clock</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 24, color: "var(--fg-0)", marginTop: 6, fontWeight: 500 }}>{r.unlearn_time_s}s</div>
      {r.retrain_time_s && (
        <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
          retrain: <span style={{ fontFamily: "var(--mono)" }}>{r.retrain_time_s}s</span>
        </div>
      )}
      {r.speedup && (
        <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px", borderRadius: 4, background: "oklch(40% 0.08 165 / 0.2)", color: "var(--mint)", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600 }}>
          <Icon name="bolt" size={11} /> {r.speedup}× faster
        </div>
      )}
    </div>
  );
}

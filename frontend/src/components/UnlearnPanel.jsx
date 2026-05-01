import { useState, useEffect, useRef } from "react";
import { getClients, startDistillation, runUnlearning, getUnlearnStatus } from "../api";

export default function UnlearnPanel() {
  const [clients, setClients]       = useState([]);
  const [targetId, setTargetId]     = useState(0);
  const [distillCfg, setDistillCfg] = useState({ ipc: 10, outer_steps: 5 });
  const [unlearnCfg, setUnlearnCfg] = useState({ finetune_epochs: 5, finetune_lr: 0.001, run_retrain_baseline: true });
  const [status, setStatus]         = useState({ status: "idle", message: "", results: null });
  const pollRef = useRef(null);

  useEffect(() => {
    getClients().then(({ data }) => setClients(data.clients || [])).catch(() => {});
    getUnlearnStatus().then(({ data }) => setStatus(data)).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  const poll = async () => {
    try {
      const { data } = await getUnlearnStatus();
      setStatus(data);
      if (!["distilling", "unlearning"].includes(data.status)) clearInterval(pollRef.current);
    } catch (_) {}
  };

  const handleDistill = async () => {
    await startDistillation(distillCfg);
    pollRef.current = setInterval(poll, 2000);
  };

  const handleUnlearn = async () => {
    await runUnlearning({ client_id: targetId, ...unlearnCfg });
    pollRef.current = setInterval(poll, 2000);
  };

  const busy = ["distilling", "unlearning"].includes(status.status);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Machine Unlearning</h2>

      {/* Step 1 — Distill */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-sky-700 text-xs font-bold flex items-center justify-center">1</span>
          <h3 className="font-medium text-gray-200">Distill client shards</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Images per class (ipc)</span>
            <input type="number" className="input" value={distillCfg.ipc} onChange={e => setDistillCfg({ ...distillCfg, ipc: +e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Outer steps</span>
            <input type="number" className="input" value={distillCfg.outer_steps} onChange={e => setDistillCfg({ ...distillCfg, outer_steps: +e.target.value })} />
          </label>
        </div>
        <button onClick={handleDistill} disabled={busy} className="btn-primary">
          {status.status === "distilling" ? "Distilling…" : "Run Distillation"}
        </button>
      </section>

      {/* Step 2 — Select & Unlearn */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-sky-700 text-xs font-bold flex items-center justify-center">2</span>
          <h3 className="font-medium text-gray-200">Select client to forget</h3>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => setTargetId(c.id)}
              className={`rounded-lg p-2 text-sm border transition-colors ${
                targetId === c.id
                  ? "border-red-500 bg-red-900/30 text-red-300"
                  : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500"
              }`}
            >
              Client {c.id}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Finetune epochs</span>
            <input type="number" className="input" value={unlearnCfg.finetune_epochs} onChange={e => setUnlearnCfg({ ...unlearnCfg, finetune_epochs: +e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Finetune LR</span>
            <input type="number" step="0.0001" className="input" value={unlearnCfg.finetune_lr} onChange={e => setUnlearnCfg({ ...unlearnCfg, finetune_lr: +e.target.value })} />
          </label>
          <label className="flex items-center gap-2 pt-5">
            <input type="checkbox" checked={unlearnCfg.run_retrain_baseline} onChange={e => setUnlearnCfg({ ...unlearnCfg, run_retrain_baseline: e.target.checked })} className="accent-sky-500" />
            <span className="text-xs text-gray-400">Run retrain baseline</span>
          </label>
        </div>

        <button onClick={handleUnlearn} disabled={busy} className="btn-danger">
          {status.status === "unlearning" ? "Unlearning…" : `Forget Client ${targetId}`}
        </button>
      </section>

      {/* Status */}
      <p className="text-sm text-gray-400">{status.message}</p>

      {/* Results */}
      {status.results && <UnlearnResults r={status.results} />}
    </div>
  );
}

function UnlearnResults({ r }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
      <h3 className="font-semibold text-gray-200">Results — Client {r.forget_client_id} forgotten</h3>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Forget accuracy" before={r.forget_acc_before} after={r.forget_acc_after} lowerIsBetter />
        <MetricCard label="Retain accuracy (test set)" before={r.retain_acc_before} after={r.retain_acc_after} />
        <MetricCard label="MIA AUC" before={r.mia_auc_before} after={r.mia_auc_after} lowerIsBetter />
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Wall-clock time</p>
          <p className="text-2xl font-mono text-sky-300">{r.unlearn_time_s}s</p>
          {r.retrain_time_s && (
            <p className="text-xs text-gray-400 mt-1">
              Retrain: {r.retrain_time_s}s &nbsp;|&nbsp;
              <span className="text-emerald-400 font-semibold">{r.speedup}x faster</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, before, after, lowerIsBetter = false }) {
  const improved = lowerIsBetter ? after < before : after > before;
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <span className="text-gray-400 text-sm font-mono">{(before * 100).toFixed(1)}%</span>
        <span className="text-gray-500">→</span>
        <span className={`text-xl font-mono font-bold ${improved ? "text-emerald-400" : "text-red-400"}`}>
          {(after * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

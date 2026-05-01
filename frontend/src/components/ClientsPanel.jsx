import { useState, useEffect } from "react";
import { getClients, getClientSamples, getClientAccuracy } from "../api";

export default function ClientsPanel() {
  const [clients, setClients]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [samples, setSamples]       = useState(null);
  const [accuracy, setAccuracy]     = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    getClients().then(({ data }) => setClients(data.clients || [])).catch(() => {});
  }, []);

  const inspect = async (client) => {
    setSelected(client);
    setSamples(null);
    setAccuracy(null);
    setLoading(true);
    try {
      const [sampRes, accRes] = await Promise.all([
        getClientSamples(client.id),
        getClientAccuracy(client.id),
      ]);
      setSamples(sampRes.data);
      setAccuracy(accRes.data);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-200">Federated Clients</h2>

      {clients.length === 0 ? (
        <p className="text-gray-500 text-sm">No clients yet. Start training first.</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => inspect(c)}
              className={`rounded-lg p-3 text-left border transition-colors ${
                selected?.id === c.id
                  ? "border-sky-500 bg-sky-900/30"
                  : "border-gray-700 bg-gray-900 hover:border-gray-500"
              }`}
            >
              <div className="text-sm font-medium text-gray-200">Client {c.id}</div>
              <div className="text-xs text-gray-500">{c.num_samples} samples</div>
              {c.has_shard && <div className="text-xs text-emerald-400 mt-0.5">shard ready</div>}
            </button>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-200">Client {selected.id}</h3>
            {accuracy && (
              <span className="text-sm text-sky-400 font-mono">
                Accuracy: {(accuracy.accuracy * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {loading && <p className="text-gray-500 text-sm">Loading…</p>}

          {samples && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Sample images</p>
              <div className="grid grid-cols-8 gap-1">
                {samples.images.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={`data:image/png;base64,${src}`}
                      alt={`label ${samples.labels[i]}`}
                      className="w-full rounded border border-gray-700"
                    />
                    <span className="absolute bottom-0 right-0 bg-black/60 text-gray-300 text-[9px] px-0.5 rounded">
                      {samples.labels[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

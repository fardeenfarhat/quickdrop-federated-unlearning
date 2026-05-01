import { useState, useEffect } from "react";
import { getClients, getClientSamples, getClientAccuracy } from "../api";
import { Card, Mini, Pill, Icon, PageHeader } from "../ui";
import { DistMini } from "../charts";

const CIFAR_LABELS = ["airplane", "auto", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"];
const REGIONS      = ["us-east", "eu-west", "ap-south", "us-west", "eu-north"];
const LAST_SEEN    = ["2m ago", "14s ago", "1m ago", "just now", "31s ago", "5m ago", "47s ago", "2m ago", "1m ago", "12s ago"];

function clientMeta(id) {
  const dominant = id % 10;
  const dist = Array.from({ length: 10 }, (_, k) => {
    if (k === dominant) return 0.38 + ((id * 11) % 15) / 100;
    return ((id * 7 + k * 13) % 10) / 100;
  });
  const sum = dist.reduce((a, b) => a + b, 0);
  return {
    region: REGIONS[id % REGIONS.length],
    dominant_class: CIFAR_LABELS[dominant],
    dist: dist.map(d => d / sum),
    last_seen: LAST_SEEN[id % LAST_SEEN.length],
    hue: (id * 47) % 360,
  };
}

export default function ClientsPanel() {
  const [clients,  setClients]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [samples,  setSamples]  = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    getClients().then(({ data }) => {
      const list = data.clients || [];
      setClients(list);
      if (list.length > 0) inspect(list[0]);
    }).catch(() => {});
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

  if (clients.length === 0) {
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <PageHeader
          eyebrow="Stage 02 · Inspect"
          title="Federated clients"
          subtitle="Each node holds a local data shard. The split is non-IID — clients have a dominant class."
        />
        <Card>
          <div style={{ padding: 30, textAlign: "center", color: "var(--fg-3)" }}>
            <Icon name="clients" size={32} />
            <div style={{ marginTop: 12, fontSize: 13 }}>No clients yet. Start training first.</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        eyebrow="Stage 02 · Inspect"
        title="Federated clients"
        subtitle="Each node holds a local data shard. The split is non-IID — clients have a dominant class."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        {/* Client grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {clients.map(c => {
            const meta = clientMeta(c.id);
            const active = selected?.id === c.id;
            return (
              <button key={c.id} onClick={() => inspect(c)} style={{
                textAlign: "left", padding: 16, borderRadius: 10,
                background: active ? "oklch(28% 0.05 290 / 0.45)" : "var(--bg-1)",
                border: `1px solid ${active ? "var(--violet)" : "var(--line)"}`,
                transition: "all .15s", cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)" }}>
                      Client {String(c.id).padStart(2, "0")}
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                      {meta.region} · {meta.last_seen}
                    </div>
                  </div>
                  {c.has_shard ? (
                    <Pill color="var(--mint)" bg="oklch(40% 0.08 165 / 0.2)">
                      <Icon name="check" size={10} /> shard
                    </Pill>
                  ) : (
                    <Pill color="var(--fg-3)">no shard</Pill>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--fg-0)", fontWeight: 500 }}>
                      {c.num_samples.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>samples</div>
                  </div>
                  <div style={{ width: 110 }}>
                    <DistMini dist={meta.dist} color={active ? "var(--violet)" : "var(--fg-2)"} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                    dominant: <span style={{ color: "var(--fg-1)" }}>{meta.dominant_class}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && <ClientDetail client={selected} meta={clientMeta(selected.id)} samples={samples} accuracy={accuracy} loading={loading} />}
      </div>
    </div>
  );
}

function ClientDetail({ client, meta, samples, accuracy, loading }) {
  return (
    <Card
      title={`Client ${String(client.id).padStart(2, "0")} detail`}
      subtitle={`${meta.region} edge node · last sync ${meta.last_seen}`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        <Mini
          label="Local accuracy"
          value={accuracy ? `${(accuracy.accuracy * 100).toFixed(1)}%` : loading ? "…" : "—"}
          accent="var(--mint)"
        />
        <Mini label="Samples" value={client.num_samples.toLocaleString()} />
      </div>

      <div style={{ marginBottom: 8, fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Sample shard
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "20px 0" }}>Loading samples…</div>
      )}

      {samples && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 18 }}>
          {samples.images.map((src, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "1" }}>
              <img
                src={`data:image/png;base64,${src}`}
                alt={`label ${samples.labels[i]}`}
                style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line)", display: "block" }}
              />
              <span style={{
                position: "absolute", bottom: 1, right: 2,
                fontFamily: "var(--mono)", fontSize: 8, color: "white",
                textShadow: "0 0 3px rgba(0,0,0,0.8)",
              }}>{samples.labels[i]}</span>
            </div>
          ))}
        </div>
      )}

      {!samples && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 18 }}>
          {Array.from({ length: 16 }).map((_, i) => {
            const hue = (meta.hue + i * 17) % 360;
            return (
              <div key={i} style={{
                aspectRatio: "1",
                background: `linear-gradient(135deg, oklch(55% 0.10 ${hue}), oklch(40% 0.08 ${(hue + 30) % 360}))`,
                borderRadius: 4, position: "relative",
                backgroundImage: "repeating-linear-gradient(45deg, oklch(0% 0 0 / 0.18) 0 2px, transparent 2px 5px)",
              }}>
                <span style={{ position: "absolute", bottom: 1, right: 2, fontFamily: "var(--mono)", fontSize: 8, color: "white" }}>
                  {i % 10}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Class distribution
      </div>
      <div style={{ height: 60 }}>
        <DistMini dist={meta.dist} color="var(--violet)" height={60} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--fg-3)" }}>
        {CIFAR_LABELS.map(l => <span key={l} style={{ flex: 1, textAlign: "center" }}>{l.slice(0, 3)}</span>)}
      </div>
    </Card>
  );
}

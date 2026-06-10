import Avatar from "@/components/Avatar";

const HATS = ["none", "classic", "cap", "crown", "hood", "halo"];
const AURA = "#5b4fd4";

export default function AvatarPreview() {
  return (
    <div
      style={{
        background: "#04040a",
        color: "#e0ddd5",
        minHeight: "100vh",
        padding: 40,
        fontFamily: "'IM Fell English', serif",
      }}
    >
      <h2
        className="font-cinzel"
        style={{
          fontSize: 20,
          letterSpacing: "0.18em",
          marginBottom: 32,
          color: "#c8943a",
        }}
      >
        avatar preview — verify against harness
      </h2>

      <h3
        className="font-mono"
        style={{ fontSize: 12, color: "rgba(160,140,200,0.6)", marginBottom: 16 }}
      >
        top-down · 120px
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 40 }}>
        {HATS.map((h) => (
          <div key={h} style={{ textAlign: "center" }}>
            <Avatar hat={h} view="topdown" size={120} auraColor={AURA} />
            <div className="font-mono" style={{ fontSize: 10, marginTop: 8, color: "rgba(160,140,200,0.5)" }}>
              {h}
            </div>
          </div>
        ))}
      </div>

      <h3
        className="font-mono"
        style={{ fontSize: 12, color: "rgba(160,140,200,0.6)", marginBottom: 16 }}
      >
        top-down · 32px (true maze scale)
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 40 }}>
        {HATS.map((h) => (
          <div key={h} style={{ textAlign: "center" }}>
            <Avatar hat={h} view="topdown" size={32} auraColor={AURA} />
            <div className="font-mono" style={{ fontSize: 10, marginTop: 8, color: "rgba(160,140,200,0.5)" }}>
              {h}
            </div>
          </div>
        ))}
      </div>

      <h3
        className="font-mono"
        style={{ fontSize: 12, color: "rgba(160,140,200,0.6)", marginBottom: 16 }}
      >
        front · 150px
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        {HATS.map((h) => (
          <div key={h} style={{ textAlign: "center" }}>
            <Avatar hat={h} view="front" size={150} auraColor={AURA} />
            <div className="font-mono" style={{ fontSize: 10, marginTop: 8, color: "rgba(160,140,200,0.5)" }}>
              {h}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

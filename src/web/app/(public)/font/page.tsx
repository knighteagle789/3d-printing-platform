"use client";
import { useState } from "react";

const FONTS = [
  {
    id: "barlow",
    name: "Barlow Semi Condensed",
    url: "https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@800&display=swap",
    family: "'Barlow Semi Condensed', sans-serif",
    weight: "800",
    tag: "Industrial · Compressed",
    note: "Slightly narrowed letterforms. Feels like spec sheets and CNC tooling.",
    depth: "~0.15em — very shallow",
  },
  {
    id: "archivo",
    name: "Archivo Black",
    url: "https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap",
    family: "'Archivo Black', sans-serif",
    weight: "400",
    tag: "Wide · Punchy · Editorial",
    note: "Full-width heavy grotesque. More approachable and modern.",
    depth: "~0.16em — shallow",
  },
  {
    id: "epilogue",
    name: "Epilogue",
    url: "https://fonts.googleapis.com/css2?family=Epilogue:wght@800&display=swap",
    family: "'Epilogue', sans-serif",
    weight: "800",
    tag: "Geometric · Precise",
    note: "Clean geometry. Closest to Syne in spirit — without the metric issues.",
    depth: "~0.14em — shallowest",
  },
];

const SAMPLES = [
  "Right tool.\nRight material.",
  "From file\nto finished.",
  "Local shop.\nPro results.",
];

export default function FontPreview() {
  const [activeSample, setActiveSample] = useState(0);
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ background: "#0d0a06", minHeight: "100vh", padding: "2rem", color: "white", fontFamily: "system-ui, sans-serif" }}>
      {FONTS.map(f => <link key={f.id} rel="stylesheet" href={f.url} />)}

      {/* Header */}
      <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,158,11,0.7)", marginBottom: "0.4rem" }}>
          NoCo Make Lab · Font Preview
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
          All three at identical size &amp; line-height. Red line = baseline — shows exactly how far descenders dip.
        </p>
      </div>

      {/* Sample switcher */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {SAMPLES.map((s, i) => (
          <button key={i} onClick={() => setActiveSample(i)} style={{
            padding: "0.3rem 0.8rem",
            fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase",
            border: `1px solid ${activeSample === i ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.12)"}`,
            background: activeSample === i ? "rgba(245,158,11,0.08)" : "transparent",
            color: activeSample === i ? "rgb(245,158,11)" : "rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}>
            {s.split("\n")[0]}
          </button>
        ))}
      </div>

      {/* Three columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "1.5rem" }}>
        {FONTS.map(font => {
          const isSelected = selected === font.id;
          return (
            <div key={font.id} onClick={() => setSelected(font.id)} style={{
              background: isSelected ? "rgba(245,158,11,0.05)" : "#0d0a06",
              padding: "1.75rem 1.25rem",
              cursor: "pointer",
              position: "relative",
              outline: isSelected ? "2px solid rgba(245,158,11,0.5)" : "none",
              outlineOffset: "-2px",
            }}>
              {isSelected && (
                <div style={{
                  position: "absolute", top: "0.75rem", right: "0.75rem",
                  background: "rgb(245,158,11)", color: "black",
                  fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.15em",
                  textTransform: "uppercase", padding: "0.18rem 0.45rem",
                }}>✓ Selected</div>
              )}

              {/* Label */}
              <p style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(245,158,11,0.55)", marginBottom: "0.2rem" }}>
                {font.tag}
              </p>
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", marginBottom: "1.25rem" }}>
                {font.name}
              </p>

              {/* Heading sample */}
              <div style={{
                fontFamily: font.family, fontWeight: font.weight,
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                lineHeight: "1.05",
                color: "white",
                marginBottom: "1.5rem",
                whiteSpace: "pre-line",
              }}>
                {SAMPLES[activeSample]}
              </div>

              {/* Descender test */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1rem", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", marginBottom: "0.35rem" }}>
                  Descender test @ line-height 1.0
                </p>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <div style={{
                    fontFamily: font.family, fontWeight: font.weight,
                    fontSize: "1.8rem", lineHeight: "1.0",
                    color: "rgba(245,158,11,0.9)",
                  }}>
                    Gg Yy Pp Qq Jj
                  </div>
                  {/* Baseline indicator */}
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    height: "1px", background: "rgba(255,60,60,0.6)",
                    pointerEvents: "none",
                  }} />
                </div>
                <p style={{ fontSize: "0.55rem", color: "rgba(255,60,60,0.5)", marginTop: "0.2rem" }}>
                  ↑ red = element bottom boundary
                </p>
              </div>

              {/* Notes */}
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.6, marginBottom: "0.5rem" }}>
                {font.note}
              </p>
              <p style={{ fontSize: "0.62rem", color: "rgba(245,158,11,0.4)", lineHeight: 1.5 }}>
                Descender depth: {font.depth}
              </p>
            </div>
          );
        })}
      </div>

      {/* Selection callout */}
      {selected ? (
        <div style={{
          border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)",
          padding: "1.25rem 1.5rem", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "1rem", flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,158,11,0.6)", marginBottom: "0.2rem" }}>Your pick</p>
            <p style={{ fontSize: "1rem", fontWeight: 700 }}>{FONTS.find(f => f.id === selected)?.name}</p>
          </div>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
            Tell me which you want and I'll swap it in everywhere in one pass.
          </p>
        </div>
      ) : (
        <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", padding: "1rem" }}>
          Click any column to select
        </p>
      )}
    </div>
  );
}
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RuleWallet — programmable spending controls for autonomous agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const green = "#159447";
const dark = "#102219";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f7fbf7",
        color: dark,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          backgroundImage:
            "linear-gradient(rgba(21,148,71,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,148,71,.06) 1px, transparent 1px), radial-gradient(circle at 82% 18%, rgba(48,205,105,.25), transparent 31%)",
          backgroundSize: "40px 40px, 40px 40px, auto",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 30,
          display: "flex",
          border: "1px solid rgba(21,148,71,.20)",
          borderRadius: 28,
          background: "rgba(255,255,255,.76)",
        }}
      />

      <div
        style={{
          width: "100%",
          display: "flex",
          position: "relative",
          padding: "58px 64px",
        }}
      >
        <div
          style={{
            width: "62%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <div
              style={{
                display: "flex",
                width: 54,
                height: 54,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                background: green,
                boxShadow: "0 10px 28px rgba(21,148,71,.22)",
              }}
            >
              <svg viewBox="0 0 64 64" width="40" height="40">
                <path d="M20 47V17H33C40.6 17 45 21.2 45 28C45 34.8 40.6 39 33 39H20M33 39L45 47" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ display: "flex", fontSize: 29, fontWeight: 700, letterSpacing: "-1px" }}>RuleWallet</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                width: 278,
                padding: "8px 14px",
                border: "1px solid rgba(21,148,71,.25)",
                borderRadius: 999,
                background: "rgba(21,148,71,.07)",
                color: green,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              PUBLIC TESTNET BETA
            </div>
            <div style={{ display: "flex", marginTop: 20, fontSize: 61, lineHeight: 0.98, letterSpacing: "-3px", fontWeight: 700 }}>
              Give agents a budget.
            </div>
            <div style={{ display: "flex", marginTop: 3, fontSize: 61, lineHeight: 0.98, letterSpacing: "-3px", fontWeight: 700, color: green }}>
              Keep the keys.
            </div>
            <div style={{ display: "flex", marginTop: 23, maxWidth: 620, fontSize: 21, lineHeight: 1.35, color: "#5c6d63" }}>
              Trusted recipients · hard limits · human approvals · public receipts
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#66776d", fontSize: 16 }}>
            <span>rulewallet.vercel.app</span>
            <span style={{ color: "#a5b2aa" }}>•</span>
            <span>Open source</span>
            <span style={{ color: "#a5b2aa" }}>•</span>
            <span>No token</span>
          </div>
        </div>

        <div
          style={{
            width: "38%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 38,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(21,148,71,.24)",
              borderRadius: 24,
              padding: 22,
              background: "rgba(255,255,255,.93)",
              boxShadow: "0 28px 70px rgba(27,70,43,.13)",
              transform: "rotate(1.5deg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "flex", fontSize: 15, fontWeight: 700 }}>Live safety dashboard</span>
              <span style={{ display: "flex", padding: "5px 9px", borderRadius: 999, background: "rgba(21,148,71,.10)", color: green, fontSize: 12 }}>ENFORCING</span>
            </div>
            {[
              ["Per transfer", "0.001 ETH"],
              ["24h remaining", "0.0048 ETH"],
              ["Agent role", "Granted"],
              ["Next payment", "Tomorrow · 09:00"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid #e2ede5", fontSize: 14 }}>
                <span style={{ color: "#75837a" }}>{label}</span>
                <span style={{ fontWeight: 700, color: label === "Agent role" ? green : dark }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", marginTop: 20, padding: "12px 14px", justifyContent: "center", borderRadius: 12, background: green, color: "white", fontWeight: 700, fontSize: 14 }}>
              Inspect public receipt →
            </div>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}

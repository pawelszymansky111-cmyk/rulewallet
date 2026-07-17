import { ImageResponse } from "next/og";

export const alt = "RuleWallet — Agents act. Rules hold.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0a0d0b",
        color: "#f3f7f1",
        padding: "72px 80px",
        fontFamily: "Arial, sans-serif",
        border: "1px solid #253026",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", width: 64, height: 64, borderRadius: 16, alignItems: "center", justifyContent: "center", color: "#c6ff3d", background: "#182313", border: "1px solid #5b7324", fontSize: 26, fontWeight: 700 }}>R/</div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 650 }}>RuleWallet</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", maxWidth: 950, fontSize: 74, lineHeight: 1.03, letterSpacing: "-3px", fontWeight: 700 }}>Give agents authority,<br /><span style={{ color: "#c6ff3d" }}>not your wallet.</span></div>
        <div style={{ display: "flex", marginTop: 30, fontSize: 26, color: "#9fa89e" }}>Policy controls and human approvals for onchain AI agents.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#879086", fontSize: 18 }}><span>Agents act. Rules hold.</span><span>Robinhood Chain testnet · Open source</span></div>
    </div>,
    size,
  );
}

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "RuleWallet hackathon build — autonomous execution, bounded onchain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const launchVisual = await readFile(join(process.cwd(), "public/social/rulewallet-testnet-launch-1200x630.png"));
  const launchVisualData = `data:image/png;base64,${launchVisual.toString("base64")}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#050806", color: "#f3f7f1", fontFamily: "Arial, sans-serif" }}>
      <img src={launchVisualData} alt="" width="1200" height="630" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.58 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(5,8,6,1) 0%, rgba(5,8,6,.94) 42%, rgba(5,8,6,.08) 78%)" }} />
      <div style={{ position: "absolute", inset: 32, display: "flex", border: "1px solid rgba(182,255,0,.18)", borderRadius: 24 }} />
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "62px 68px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}><div style={{ display: "flex", width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", color: "#b6ff00", background: "#14200e", border: "1px solid #587528", fontSize: 22, fontWeight: 700 }}>R/</div><div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>RuleWallet</div></div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}><div style={{ display: "flex", width: 480, padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(182,255,0,.34)", color: "#b6ff00", fontSize: 17 }}>HACKATHON BUILD · ROBINHOOD CHAIN TESTNET</div><div style={{ display: "flex", marginTop: 22, fontSize: 62, lineHeight: 1.02, letterSpacing: "-2.5px", fontWeight: 700 }}>Autonomous execution.<br /><span style={{ color: "#b6ff00" }}>Bounded onchain.</span></div><div style={{ display: "flex", marginTop: 22, maxWidth: 650, fontSize: 22, lineHeight: 1.35, color: "#a9b2a8" }}>Live policy metrics · scheduled strategy · verifiable receipts</div></div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#8d978c", fontSize: 16 }}><span>rulewallet.vercel.app/hackathon</span><span>Mainnet disabled · Open source</span></div>
      </div>
    </div>,
    size,
  );
}

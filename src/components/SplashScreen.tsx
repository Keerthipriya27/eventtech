// ============================================================
// FILE: src/components/SplashScreen.tsx
// CREATE this new file at: src/components/SplashScreen.tsx
// ============================================================

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number; // ms, default 2800
}

export default function SplashScreen({ onFinish, duration = 2800 }: SplashScreenProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("out"), duration - 400);
    const t3 = setTimeout(onFinish, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onFinish]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a12",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.4s ease" : undefined,
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.18); opacity: 1; }
        }
        @keyframes ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ring-spin-rev {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes logo-rise {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tag-rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
        @keyframes particle-float {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
        }
      `}</style>

      {/* Background grid */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
      }} />

      {/* Ambient glow blobs */}
      <div style={{
        position: "absolute",
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        animation: "orb-pulse 3s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
        top: "40%",
        left: "30%",
        animation: "orb-pulse 4s ease-in-out infinite 1s",
      }} />

      {/* Spinning rings */}
      <div style={{ position: "relative", width: 160, height: 160, marginBottom: 32 }}>
        {/* Outer ring */}
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "1.5px solid transparent",
          borderTopColor: "rgba(139,92,246,0.7)",
          borderRightColor: "rgba(139,92,246,0.2)",
          animation: "ring-spin 2.4s linear infinite",
        }} />
        {/* Mid ring */}
        <div style={{
          position: "absolute",
          inset: 14,
          borderRadius: "50%",
          border: "1.5px solid transparent",
          borderBottomColor: "rgba(99,102,241,0.6)",
          borderLeftColor: "rgba(99,102,241,0.15)",
          animation: "ring-spin-rev 1.8s linear infinite",
        }} />
        {/* Inner ring */}
        <div style={{
          position: "absolute",
          inset: 28,
          borderRadius: "50%",
          border: "1px solid transparent",
          borderTopColor: "rgba(167,139,250,0.5)",
          animation: "ring-spin 3s linear infinite 0.5s",
        }} />

        {/* Center icon */}
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            {/* Lightning bolt / event spark icon */}
            <path
              d="M25 4L10 24h12l-3 16 17-22H24L25 4z"
              fill="url(#splash-grad)"
              stroke="rgba(167,139,250,0.4)"
              strokeWidth="0.8"
            />
            <defs>
              <linearGradient id="splash-grad" x1="10" y1="4" x2="27" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#a78bfa" : "#818cf8",
            bottom: "10%",
            left: `${15 + i * 12}%`,
            animation: `particle-float ${1.5 + i * 0.3}s ease-out infinite ${i * 0.4}s`,
          }} />
        ))}
      </div>

      {/* Wordmark */}
      <div style={{
        animation: "logo-rise 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          fontFamily: "'Inter', system-ui, sans-serif",
          background: "linear-gradient(135deg, #e0d7ff 0%, #a78bfa 50%, #818cf8 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
        }}>
          EventTech
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 12,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(167,139,250,0.5)",
          fontFamily: "system-ui, sans-serif",
          animation: "tag-rise 0.5s ease 0.7s both",
        }}>
          Intelligent Event Ecosystem
        </div>
      </div>

      {/* Loading dots */}
      <div style={{
        display: "flex",
        gap: 6,
        marginTop: 40,
        animation: "tag-rise 0.4s ease 0.9s both",
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#7c3aed",
            animation: `dot-blink 1.2s ease-in-out infinite ${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}
// ============================================================
// FILE: src/components/SplashScreen.tsx
// REPLACE the existing file at: src/components/SplashScreen.tsx
// ============================================================

import { CalendarDays, ShieldCheck, QrCode, Trophy, Sparkles, Users } from "lucide-react";
import { useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function SplashScreen({ onFinish, duration = 6500 }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, duration);
    return () => clearTimeout(timer);
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
        background: "#0f172a",
        overflow: "hidden",
        fontFamily: "Space Grotesk, system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @keyframes et-spin1{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes et-spin2{from{transform:rotate(0)}to{transform:rotate(-360deg)}}
        @keyframes et-pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
        @keyframes et-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes et-blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
        @keyframes et-scan{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}
        @keyframes et-progress{from{width:0}to{width:100%}}
        @keyframes et-float-card{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .et-ring{position:absolute;border-radius:50%;border:1.5px solid transparent;}
        .et-r1{inset:0;border-top-color:#00e5b4;border-right-color:rgba(0,229,180,.2);animation:et-spin1 3s linear infinite;}
        .et-r2{inset:14px;border-bottom-color:#00b4ff;border-left-color:rgba(0,180,255,.15);animation:et-spin2 2.2s linear infinite;}
        .et-r3{inset:28px;border-top-color:rgba(0,229,180,.55);animation:et-spin1 4s linear infinite .5s;}
        .et-r4{inset:42px;border-bottom-color:rgba(0,180,255,.35);animation:et-spin2 1.8s linear infinite .3s;}
        .et-badge{padding:5px 13px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid;display:flex;align-items:center;gap:5px;}
        .et-teal{background:rgba(0,229,180,.1);border-color:rgba(0,229,180,.3);color:#00e5b4;}
        .et-blue{background:rgba(0,180,255,.1);border-color:rgba(0,180,255,.3);color:#00b4ff;}
        .et-mint{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.3);color:#4ade80;}
      `}</style>

      {/* Photo atmosphere */}
      <img
        src="/images/splash.jpg"
        alt="Event crowd"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.22,
        }}
      />

      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(0,229,180,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,180,.04) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Ambient glow orbs */}
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(0,229,180,.16) 0%,transparent 70%)",
          width: 520,
          height: 520,
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          animation: "et-pulse 4s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          background: "radial-gradient(circle,rgba(0,120,255,.1) 0%,transparent 70%)",
          width: 300,
          height: 300,
          top: "25%",
          left: "15%",
          animation: "et-pulse 5.5s ease-in-out infinite 2s",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 78% 78% at 50% 50%,transparent 26%,#0f172a 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          right: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
          gap: 10,
          zIndex: 3,
        }}
      >
        {[
          { icon: CalendarDays, title: "Event Builder" },
          { icon: Users, title: "Volunteer Match" },
          { icon: QrCode, title: "Fast Check-In" },
          { icon: Trophy, title: "XP Leaderboard" },
          { icon: ShieldCheck, title: "Authenticator 2FA" },
        ].map((feature, index) => (
          <div
            key={feature.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(15, 23, 42, .6)",
              backdropFilter: "blur(8px)",
              color: "#e2e8f0",
              fontSize: 12,
              animation: `et-float-card ${3 + (index % 3)}s ease-in-out infinite`,
            }}
          >
            <feature.icon size={14} color="#22d3ee" />
            {feature.title}
          </div>
        ))}
      </div>

      {/* Scan line */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: 2,
            background: "linear-gradient(90deg,transparent,rgba(0,229,180,.12),transparent)",
            animation: "et-scan 7s linear infinite",
          }}
        />
      </div>

      {/* Center content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 2,
          position: "relative",
        }}
      >
        {/* Spinning rings + logo */}
        <div style={{ position: "relative", width: 164, height: 164, marginBottom: 28 }}>
          <div className="et-ring et-r1" />
          <div className="et-ring et-r2" />
          <div className="et-ring et-r3" />
          <div className="et-ring et-r4" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: "linear-gradient(135deg,#00c896,#00e5b4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 36px rgba(0,229,180,.45), 0 0 72px rgba(0,229,180,.15)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 30 30" fill="none">
                <path d="M17 3L7 17h9L13 27 23 13h-9L17 3z" fill="white" opacity=".95" />
                <circle cx="22" cy="6" r="2.5" fill="white" opacity=".7" />
                <circle cx="8" cy="24" r="1.8" fill="white" opacity=".5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <div
          style={{
            textAlign: "center",
            animation: "et-rise .7s cubic-bezier(.16,1,.3,1) .4s both",
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: "-.04em",
              lineHeight: 1,
              background: "linear-gradient(135deg,#ffffff 0%,#fde047 35%,#00e5b4 65%,#60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            EventTech
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "rgba(0,229,180,.5)",
              animation: "et-rise .5s ease .8s both",
            }}
          >
            AI-Powered Event Operating System
          </div>
        </div>

        {/* Badges */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 22,
            flexWrap: "wrap",
            justifyContent: "center",
            animation: "et-rise .5s ease 1s both",
          }}
        >
          {[
            { label: "⚡ Hackathons", cls: "et-teal" },
            { label: "🎓 Workshops", cls: "et-blue" },
            { label: "🤝 Networking", cls: "et-mint" },
            { label: "🏆 Gamified XP", cls: "et-teal" },
            { label: "🚀 Sponsors", cls: "et-mint" },
          ].map((b) => (
            <div key={b.label} className={`et-badge ${b.cls}`}>
              {b.label}
            </div>
          ))}
        </div>

        {/* Animated stats */}
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 22,
            animation: "et-rise .5s ease 1.2s both",
          }}
        >
          {[
            { id: "et-s1", label: "AI Accuracy", v: "94" },
            { id: "et-s2", label: "Volunteers", v: "42" },
            { id: "et-s3", label: "Sponsor ROI", v: "18" },
          ].map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {i > 0 && (
                <div style={{ width: 1, height: 28, background: "rgba(255,255,255,.08)" }} />
              )}
              <div style={{ textAlign: "center" }}>
                <div id={s.id} style={{ fontSize: 20, fontWeight: 700, color: "#00e5b4" }}>
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,.3)",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading dots */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 28,
            animation: "et-rise .4s ease 1.4s both",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00e5b4",
                animation: `et-blink 1.4s ease-in-out infinite ${i * 0.22}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* bottom-right picture removed per design request */}

      {/* Progress bar at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(255,255,255,.05)",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "linear-gradient(90deg,#00e5b4,#00b4ff)",
            animation: `et-progress ${duration}ms linear forwards`,
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>
    </div>
  );
}

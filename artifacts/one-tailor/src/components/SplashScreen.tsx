import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false);
  const appName = useAppStore((s) => s.appName);
  const appLogo = useAppStore((s) => s.appLogo);
  const splashImage = useAppStore((s) => s.splashImage);

  const logoSrc = appLogo ?? "/onetailor-logo.png";
  const nameParts = appName.includes(" ")
    ? { first: appName.split(" ")[0], rest: appName.split(" ").slice(1).join(" ") }
    : { first: appName, rest: "" };

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2200);
    const doneTimer = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [onDone]);

  const baseStyle: React.CSSProperties = {
    opacity: fading ? 0 : 1,
    transition: "opacity 0.6s ease-in-out",
    pointerEvents: fading ? "none" : "all",
  };

  /* ── Custom full-screen splash image ── */
  if (splashImage) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          ...baseStyle,
          background: "hsl(218,50%,7%)",
        }}
      >
        {/* Background image fills screen */}
        <img
          src={splashImage}
          alt="Splash"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {/* Subtle dark overlay so text is readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        {/* Logo + name overlaid at bottom */}
        <div
          className="relative flex flex-col items-center gap-3"
          style={{ marginTop: "auto", paddingBottom: 64 }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              overflow: "hidden",
              border: "2px solid rgba(212,160,32,0.5)",
              boxShadow: "0 0 30px rgba(212,160,32,0.25)",
            }}
          >
            <img src={logoSrc} alt={appName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-0.5">
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#F0E8C8" }}>
                {nameParts.first}
              </span>
              {nameParts.rest && (
                <span className="gold-shimmer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800 }}>
                  {nameParts.rest}
                </span>
              )}
            </div>
          </div>
          {/* Loading dots */}
          <div className="flex items-center gap-1.5 mt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                backgroundColor: "rgba(212,160,32,0.7)",
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
      </div>
    );
  }

  /* ── Default branded splash ── */
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg, hsl(218,50%,7%) 0%, hsl(218,47%,12%) 60%, hsl(218,40%,8%) 100%)",
        ...baseStyle,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,160,32,0.18) 0%, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -58%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <div
          className="gold-pulse"
          style={{
            width: 120, height: 120, borderRadius: 28,
            overflow: "hidden",
            border: "2px solid rgba(212,160,32,0.35)",
            boxShadow: "0 0 40px rgba(212,160,32,0.2)",
          }}
        >
          <img src={logoSrc} alt={appName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-baseline gap-0.5">
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, color: "#F0E8C8", letterSpacing: "-0.02em" }}>
              {nameParts.first}
            </span>
            {nameParts.rest && (
              <span className="gold-shimmer" style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {nameParts.rest}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, letterSpacing: "0.22em", fontWeight: 600, color: "rgba(212,160,32,0.6)", textTransform: "uppercase" }}>
            Business tools for tailors
          </p>
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              backgroundColor: "rgba(212,160,32,0.6)",
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>

      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

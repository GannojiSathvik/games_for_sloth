"use client";

// AnimatedBackground — Pure CSS animated background that replaces the 7.4MB video.
// Uses floating diamond particles + gradient shifts for a premium card-game feel.
// Zero network load, GPU-accelerated, works on all devices.

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-950" />

      {/* Slow-moving radial glow */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(220,38,38,0.15), transparent 70%)",
          animation: "bgPulse 8s ease-in-out infinite alternate",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Floating diamond particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute text-red-500/10 select-none"
          style={{
            fontSize: `${20 + i * 12}px`,
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `floatDiamond ${12 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * 2}s`,
          }}
        >
          ♦
        </div>
      ))}

      {/* Dark vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      <style>{`
        @keyframes bgPulse {
          0% { transform: scale(1); opacity: 0.2; }
          100% { transform: scale(1.1); opacity: 0.35; }
        }
        @keyframes floatDiamond {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
          25% { transform: translateY(-30px) rotate(10deg); opacity: 0.15; }
          50% { transform: translateY(-15px) rotate(-5deg); opacity: 0.1; }
          75% { transform: translateY(-40px) rotate(8deg); opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}

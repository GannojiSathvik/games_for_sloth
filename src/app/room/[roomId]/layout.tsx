export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* ── Persistent full-page video background ───────────────────────────────── */}
      {/* Placed in layout so it never re-renders or stutters during page polls */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        style={{ filter: "brightness(0.35)", willChange: "transform" }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 z-[1] bg-black/50 pointer-events-none" />
      
      {/* Page Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}

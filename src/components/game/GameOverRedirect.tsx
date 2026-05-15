"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props { delayMs?: number; }

export default function GameOverRedirect({ delayMs = 8000 }: Props) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(delayMs / 1000));

  useEffect(() => {
    const tick = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    const go   = setTimeout(() => router.push("/"), delayMs);
    return () => { clearInterval(tick); clearTimeout(go); };
  }, [delayMs, router]);

  return (
    <p className="text-zinc-600 text-xs mt-2">
      Returning to home in {secondsLeft}s…
    </p>
  );
}

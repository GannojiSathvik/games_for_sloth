"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2 } from "lucide-react";

interface Props {
  roomCode: string;
  roomId: string;
}

export default function CopyRoomLink({ roomCode, roomId }: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyLink() {
    // Copy the /join/ URL — opens the invite landing page, not the game directly
    const url = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyCode}
        className={`gap-1.5 text-xs border-white/10 transition-all ${
          copiedCode
            ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/30"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copiedCode ? "Copied!" : "Copy Code"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copyLink}
        className={`gap-1.5 text-xs border-white/10 transition-all ${
          copiedLink
            ? "text-emerald-400 border-emerald-500/40 bg-emerald-950/30"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        {copiedLink ? <Check className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
        {copiedLink ? "Link Copied!" : "Copy Invite Link"}
      </Button>
    </div>
  );
}

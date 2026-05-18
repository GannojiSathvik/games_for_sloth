"use client";
// GameOverlays — client-side overlay manager.
// Reads room state changes and shows EliminationOverlay and RuleAnnouncement
// based on props passed down from the server component.

import { useState, useEffect, useRef, memo, useCallback } from "react";
import EliminationOverlay from "./EliminationOverlay";
import RuleAnnouncement   from "./RuleAnnouncement";
import GameClearScreen    from "./GameClearScreen";

interface EliminatedPlayer { username: string; score: number; }

interface Props {
  // Elimination: pass newly-eliminated players (derived from last advanceRound)
  newlyEliminated: EliminatedPlayer[];
  // Rule intro: pass the new rule id + round deadline if it's a rule-intro round
  newRuleId:      string | null;
  deadlineIso:    string | null;
  isRuleIntroRound: boolean;
  // Game clear
  isFinished: boolean;
  winnerUsername: string | null;
  winnerScore:    number | null;
  isWinnerMe:     boolean;
}

export default memo(function GameOverlays({
  newlyEliminated,
  newRuleId,
  deadlineIso,
  isRuleIntroRound,
  isFinished,
  winnerUsername,
  winnerScore,
  isWinnerMe,
}: Props) {
  const [showElim,  setShowElim]  = useState(false);
  const [showRule,  setShowRule]  = useState(false);
  const prevElimRef  = useRef(newlyEliminated.length);
  const prevRuleRef  = useRef<string | null>(newRuleId);

  // Trigger elimination overlay when new players are eliminated
  useEffect(() => {
    if (newlyEliminated.length > prevElimRef.current) {
      prevElimRef.current = newlyEliminated.length;
      setShowElim(true);
    }
  }, [newlyEliminated.length]);

  // Trigger rule announcement on new rule round
  useEffect(() => {
    if (isRuleIntroRound && newRuleId && newRuleId !== prevRuleRef.current) {
      prevRuleRef.current = newRuleId;
      setShowRule(true);
    }
  }, [isRuleIntroRound, newRuleId]);

  const handleElimDismiss = useCallback(() => setShowElim(false), []);

  return (
    <>
      {showElim && newlyEliminated.length > 0 && (
        <EliminationOverlay
          eliminated={newlyEliminated}
          onDismiss={handleElimDismiss}
        />
      )}

      {showRule && newRuleId && deadlineIso && !showElim && (
        <RuleAnnouncement
          newRuleId={newRuleId}
          deadlineIso={deadlineIso}
        />
      )}

      {isFinished && winnerUsername && (
        <GameClearScreen
          winnerUsername={winnerUsername}
          winnerScore={winnerScore ?? 0}
          isMe={isWinnerMe}
        />
      )}
    </>
  );
});

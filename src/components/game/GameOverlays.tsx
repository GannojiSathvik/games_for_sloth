"use client";
// GameOverlays — client-side overlay manager.
// Uses eliminationCount (from room DB) as the stable trigger for the elimination
// overlay, not the array length (which can change for unrelated reasons).

import { useState, useEffect, useRef, memo, useCallback } from "react";
import EliminationOverlay from "./EliminationOverlay";
import RuleUnlockedScreen from "./RuleUnlockedScreen";
import GameClearScreen    from "./GameClearScreen";

interface EliminatedPlayer { username: string; score: number; }

interface Props {
  /** Only the players knocked out by the round that just finished. */
  newlyEliminated: EliminatedPlayer[];
  // Room's official elimination counter — only increments when advanceRound fires
  eliminationCount: number;
  newRuleId:        string | null;
  isRuleIntroRound: boolean;
  isFinished:       boolean;
  winnerUsername:   string | null;
  winnerScore:      number | null;
  isWinnerMe:       boolean;
  roundsPlayed:     number;
}

export default memo(function GameOverlays({
  newlyEliminated,
  eliminationCount,
  newRuleId,
  isRuleIntroRound,
  isFinished,
  winnerUsername,
  winnerScore,
  isWinnerMe,
  roundsPlayed,
}: Props) {
  const [showElim, setShowElim] = useState(false);
  const [showRule, setShowRule] = useState(false);

  // Initialize refs to the CURRENT values so we don't fire on first load
  const prevCountRef = useRef(eliminationCount);
  const prevRuleRef  = useRef<string | null>(newRuleId);

  // Trigger elimination overlay ONLY when eliminationCount increases
  useEffect(() => {
    if (eliminationCount > prevCountRef.current) {
      prevCountRef.current = eliminationCount;
      setShowElim(true);
    }
  }, [eliminationCount]);

  // Trigger rule announcement on new rule round
  useEffect(() => {
    if (isRuleIntroRound && newRuleId && newRuleId !== prevRuleRef.current) {
      prevRuleRef.current = newRuleId;
      setShowRule(true);
    }
  }, [isRuleIntroRound, newRuleId]);

  const handleElimDismiss = useCallback(() => setShowElim(false), []);
  const handleRuleDismiss = useCallback(() => setShowRule(false), []);

  return (
    <>
      {showElim && newlyEliminated.length > 0 && (
        <EliminationOverlay
          eliminated={newlyEliminated}
          onDismiss={handleElimDismiss}
        />
      )}

      {showRule && newRuleId && !showElim && (
        <RuleUnlockedScreen
          ruleId={newRuleId}
          onDismiss={handleRuleDismiss}
        />
      )}

      {isFinished && winnerUsername && (
        <GameClearScreen
          winnerUsername={winnerUsername}
          winnerScore={winnerScore ?? 0}
          isMe={isWinnerMe}
          roundsPlayed={roundsPlayed}
          eliminationCount={eliminationCount}
        />
      )}
    </>
  );
});

# ⚡ KING OF DIAMONDS - OPTIMIZED UI/UX FLOW & PERFORMANCE GUIDE

## 🔴 YOUR PERFORMANCE PROBLEM & FIX

### Why It's Slow
1. **RoomPoller polling every 1500ms** → Triggers full component re-render
2. **All 5 players' data updates** → React re-renders entire tree
3. **Animations running on main thread** → Blocks UI interactions
4. **Heavy calculations** → Math happening in components
5. **Image rendering (acid animation)** → GPU strain

### The Fix (Immediate)
```javascript
// BEFORE (Slow)
const [roomData, setRoomData] = useState(fullRoomObject);
// When poll happens, entire object updates → full re-render

// AFTER (Fast)
const gamePhase = useRef('submit');
const playerScores = useRef(new Map());
const roundResults = useRef(null);
// Updates only change necessary values
```

---

## 🎮 COMPLETE UI FLOW (Screen by Screen)

### SCREEN 1: LOBBY
```
┌─────────────────────────────────────────┐
│         KING OF DIAMONDS                │
│         Room Code: ABC123               │
├─────────────────────────┬─────────────┤
│                         │   RULES     │
│  Players (3/5):         │ ──────────  │
│  • Chishiya             │ • Guess 0-100
│  • Daimon               │ • Closest   │
│  • Kuzuryu              │   wins      │
│  [Ready] [Leave]        │ • -10 = out │
│                         │             │
│                         │ Round: 1    │
│                         │ Timer: 60s  │
└─────────────────────────┴─────────────┘
```

---

### SCREEN 2: SUBMISSION PHASE (MAIN GAME)
```
┌─────────────────────────────────────────┐
│  ROUND 1                  [RULES]       │
│  🕐 00:45                              │
├─────────────────────────┬─────────────┤
│                         │ Current:    │
│  Your Number: [_]       │ No guess    │
│                         │             │
│  ┌─────────────────┐    │ Score: 0    │
│  │ NUMBER PAD      │    │             │
│  │  1 2 3 4 5      │    │ Players: 3  │
│  │  6 7 8 9 0      │    │ Status: ⏳  │
│  │  [Clear] [Confirm]   │             │
│  └─────────────────┘    │             │
│                         │             │
│  OR TYPE: ________      │             │
│  [DELETE] [SUBMIT]      │             │
└─────────────────────────┴─────────────┘
```

**Key Features**:
- Real-time timer (counting down from 60)
- Number pad OR text input
- Display current choice
- Show rules sidebar
- No other players' guesses visible

---

### SCREEN 3: RESULTS PHASE (Show Results Like Netflix)
```
┌──────────────────────────────────────────────┐
│        ⚖️ RESULTS ⚖️                         │
│     Average: 28.67 → Target: 22.93           │
├──────────────────────────────────────────────┤
│                                              │
│  [Player 1]  [Player 2]  [Player 3]         │
│   Avatar      Avatar      Avatar             │
│    Guess        Guess      ✓ WIN             │
│     10          20         20 ← Red Border   │
│   -1 point   -1 point    +0 point           │
│  Score: -1   Score: -1   Score: 0           │
│                                              │
│         [NEXT ROUND] (auto in 20s)          │
└──────────────────────────────────────────────┘
```

**Key Features**:
- Show all players in row
- Highlight winner with RED BORDER
- Show calculations
- Animate: Cards slide in left-to-right
- Display new scores

---

### SCREEN 4: RULE ANNOUNCEMENT (When Rule Changes)
```
┌──────────────────────────────────────────────┐
│                                              │
│          🎯 NEW RULE ACTIVATED 🎯           │
│                                              │
│  After 1 Player Eliminated:                 │
│                                              │
│  RULE 1: DUPLICATE INVALIDITY               │
│  ─────────────────────────────────          │
│  If 2+ players choose the same number:      │
│  • That number becomes INVALID              │
│  • All players who chose it lose -1         │
│  • Even if it was closest to target!        │
│                                              │
│  Next Round starts in: 00:30 (5 min timer)  │
│                                              │
└──────────────────────────────────────────────┘
```

---

### SCREEN 5: FINAL 1v1 (Two Players Left)
```
┌─────────────────────────────────────────┐
│  FINAL ROUND               [RULES]       │
│  🕐 00:32                              │
├─────────────────────────┬─────────────┤
│                         │ Opponent:   │
│  Your Number: [_]       │ Kuzuryu     │
│                         │ Score: -7   │
│  ┌─────────────────┐    │             │
│  │ 1 2 3 4 5       │    │ You: -9     │
│  │ 6 7 8 9 0       │    │ (1 loss = out)
│  │ [Clear] [Confirm]   │             │
│  └─────────────────┘    │ Rules: 1,2,3
│                         │ 0 beats all │
│  OR TYPE: ________      │ 100 beats 0 │
│                         │ 1 beats 100 │
└─────────────────────────┴─────────────┘
```

---

### SCREEN 6: GAME CLEAR (Winner)
```
┌─────────────────────────────────────────┐
│                                         │
│      🏆 GAME CLEAR 🏆                   │
│                                         │
│      CHISHIYA WINS!                     │
│                                         │
│   Final Score: -8                       │
│   Rounds Survived: 13                   │
│                                         │
│  [View Replay] [New Game] [Leave]       │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📊 COMPONENT ARCHITECTURE (Performance Optimized)

### Folder Structure
```
src/
├── components/
│   ├── Game/
│   │   ├── GameContainer.jsx (Main)
│   │   ├── GamePhaseManager.jsx (State logic)
│   │   └── PhaseRenderer.jsx (Decides which screen)
│   │
│   ├── Phases/
│   │   ├── SubmitPhase.jsx (Number pad)
│   │   ├── ResultsPhase.jsx (Results screen)
│   │   ├── RuleAnnouncementPhase.jsx
│   │   └── GameClearPhase.jsx
│   │
│   ├── UI/
│   │   ├── NumberPad.jsx (Memoized)
│   │   ├── PlayerCard.jsx (Memoized)
│   │   ├── RulesSidebar.jsx (Memoized)
│   │   ├── CountdownTimer.jsx (Optimized)
│   │   └── ScaleAnimation.jsx (GPU-accelerated)
│   │
│   └── Animations/
│       ├── ResultSlideIn.jsx
│       ├── AcidPour.jsx
│       └── BalanceScale.jsx
│
├── hooks/
│   ├── useGameState.js (Custom hook)
│   ├── useCountdown.js (Memoized)
│   └── useRoomPolling.js (Optimized)
│
├── utils/
│   ├── calculations.js (Pre-calculated)
│   ├── formatDisplay.js
│   └── animationTiming.js
│
└── styles/
    └── game.css (GPU-accelerated)
```

---

## ⚡ PERFORMANCE OPTIMIZATION STRATEGIES

### 1. Memoization (Prevent Re-renders)
```javascript
// NumberPad.jsx
import { memo } from 'react';

const NumberPad = memo(({ onSelect, currentValue }) => {
  return (
    <div className="number-pad">
      {[1,2,3,4,5,6,7,8,9,0].map(num => (
        <button key={num} onClick={() => onSelect(num)}>
          {num}
        </button>
      ))}
    </div>
  );
}, (prev, next) => {
  // Only re-render if currentValue changed
  return prev.currentValue === next.currentValue;
});
```

### 2. Polling Optimization
```javascript
// useRoomPolling.js
export const useRoomPolling = (roomId) => {
  const lastDataRef = useRef(null);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const poll = async () => {
      const newData = await fetch(`/api/rooms/${roomId}`).then(r => r.json());
      
      // Only update if data actually changed
      if (JSON.stringify(lastDataRef.current) !== JSON.stringify(newData)) {
        lastDataRef.current = newData;
        setGameState(newData); // Triggers minimal re-render
      }
    };

    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [roomId]);

  return gameState;
};
```

### 3. Timer Optimization (No Re-renders Every Second)
```javascript
// CountdownTimer.jsx - uses ref, not state
import { useEffect, useRef } from 'react';

export const CountdownTimer = ({ deadline, onExpire }) => {
  const timerRef = useRef(null);
  const displayRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, deadline - now);
      const seconds = Math.floor(remaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;

      // Update DOM directly, not via state
      displayRef.current.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (remaining <= 0) {
        onExpire();
      }
    };

    tick(); // Initial render
    const interval = setInterval(tick, 100); // Update 10x/second
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  return <div ref={displayRef} className="timer">00:60</div>;
};
```

### 4. Animation on GPU (Not Main Thread)
```css
/* game.css */
.player-card {
  animation: slideInLeft 0.6s ease-out forwards;
  will-change: transform; /* Tell browser: optimize this */
  transform: translateZ(0); /* Force GPU acceleration */
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-100px) translateZ(0);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateZ(0);
  }
}

.acid-pour {
  animation: pourAcid 2s ease-in forwards;
  will-change: opacity, transform;
}

@keyframes pourAcid {
  0% { opacity: 0; transform: translateY(-100px) scaleY(0); }
  50% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scaleY(1); }
}
```

### 5. Lazy Load Heavy Components
```javascript
// GameContainer.jsx
import { lazy, Suspense } from 'react';

const AcidAnimation = lazy(() => import('./Animations/AcidPour'));
const ResultsPhase = lazy(() => import('./Phases/ResultsPhase'));

export const GameContainer = ({ gamePhase }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {gamePhase === 'results' && <ResultsPhase />}
      {gamePhase === 'elimination' && <AcidAnimation />}
    </Suspense>
  );
};
```

---

## 🎨 UI/UX FLOW IMPLEMENTATION STEPS

### Step 1: Build Number Input Component (Fast)
```javascript
// SubmitPhase.jsx
const SubmitPhase = memo(({ onSubmit, timeRemaining }) => {
  const [input, setInput] = useState('');

  const handleNumberClick = (num) => {
    if (input.length < 3) setInput(input + num);
  };

  const handleSubmit = () => {
    const value = parseInt(input);
    if (value >= 0 && value <= 100) {
      onSubmit(value);
      setInput('');
    }
  };

  const handleClear = () => setInput('');

  return (
    <div className="submit-phase">
      <div className="timer-display">{formatTime(timeRemaining)}</div>
      
      <div className="input-section">
        <input 
          type="text" 
          value={input} 
          readOnly 
          placeholder="Your number"
          className="number-display"
        />
      </div>

      <NumberPad onSelect={handleNumberClick} />

      <div className="button-group">
        <button onClick={handleClear}>CLEAR</button>
        <button onClick={handleSubmit} disabled={!input}>SUBMIT</button>
      </div>
    </div>
  );
});
```

### Step 2: Build Results Component (Animated)
```javascript
// ResultsPhase.jsx
const ResultsPhase = ({ results, players }) => {
  return (
    <div className="results-phase">
      <div className="calculation-display">
        <h3>Average: {results.average.toFixed(2)}</h3>
        <h3>Target (×0.8): {results.target.toFixed(2)}</h3>
      </div>

      <div className="players-container">
        {players.map((player, idx) => (
          <PlayerResultCard
            key={player.id}
            player={player}
            guess={results.guesses[player.id]}
            difference={results.differences[player.id]}
            isWinner={results.winnerId === player.id}
            animationDelay={idx * 200} // Stagger animation
          />
        ))}
      </div>

      <div className="scale-display">
        <BalanceScale winner={results.winnerId} />
      </div>

      <div className="next-round-timer">
        Next round in: {formatTime(results.timeRemaining)}
      </div>
    </div>
  );
};

// PlayerResultCard.jsx
const PlayerResultCard = memo(({ 
  player, 
  guess, 
  difference, 
  isWinner, 
  animationDelay 
}) => {
  return (
    <div 
      className={`player-card ${isWinner ? 'winner' : ''}`}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        '--delay': `${animationDelay}ms`
      }}
    >
      <div className="avatar">{player.name[0]}</div>
      <div className="guess-display">{guess}</div>
      <div className="score-change">
        {isWinner ? '+0' : '-1'}
      </div>
      {isWinner && <div className="win-badge">WIN</div>}
    </div>
  );
});
```

### Step 3: Build Phase Manager (State Logic)
```javascript
// GamePhaseManager.jsx
export const GamePhaseManager = ({ roomId }) => {
  const gameState = useRoomPolling(roomId);
  const [localPhase, setLocalPhase] = useState('submit');

  // Map server state to UI phase
  useEffect(() => {
    if (!gameState) return;

    switch (gameState.serverPhase) {
      case 'SUBMIT':
        setLocalPhase('submit');
        break;
      case 'RESULTS':
        setLocalPhase('results');
        break;
      case 'RULE_INTRO':
        setLocalPhase('rule_announcement');
        break;
      case 'GAME_CLEAR':
        setLocalPhase('game_clear');
        break;
      case 'ELIMINATION':
        setLocalPhase('elimination');
        break;
    }
  }, [gameState?.serverPhase]);

  const PhaseComponent = {
    'submit': <SubmitPhase roomId={roomId} />,
    'results': <ResultsPhase results={gameState.results} />,
    'rule_announcement': <RuleAnnouncement rule={gameState.newRule} />,
    'game_clear': <GameClear winner={gameState.winner} />,
    'elimination': <AcidAnimation player={gameState.eliminatedPlayer} />
  }[localPhase];

  return <div className="game-container">{PhaseComponent}</div>;
};
```

---

## 🎬 ANIMATION TIMING GUIDE

### Submission Phase Timing
```javascript
// Timeline (total: 60 seconds)
const PHASE_TIMINGS = {
  submit: 60000,           // 60 seconds to guess
  resultsDisplay: 20000,   // 20 seconds to show results
  ruleIntro: 5000,         // 5 seconds rule announcement
  transition: 2000,        // 2 seconds between rounds
};

// Animation timings
const ANIMATION_TIMINGS = {
  cardSlideIn: 600,        // 0.6s slide from left
  cardStaggerDelay: 200,   // 200ms between each card
  acidPour: 2000,          // 2s acid animation
  scaleBalance: 1500,      // 1.5s scale tipping
};
```

### Example Animation Sequence
```javascript
// ResultsPhase animation timeline
const animationSequence = async () => {
  // t=0: Cards start sliding in (staggered)
  // t=600ms: First card fully visible
  // t=800ms: Second card visible
  // t=1000ms: Third card visible
  // t=1200ms: Fourth card visible
  // t=1400ms: Fifth card visible
  
  await sleep(1500); // Wait for all cards in
  
  // t=1500ms: Scale starts balancing
  await sleep(1500);
  
  // t=3000ms: Display "GAME CLEAR" or start acid animation
  // etc.
};
```

---

## 🚀 COMPLETE IMPLEMENTATION CHECKLIST

### Phase 1: Core Components (Day 1-2)
- [ ] NumberPad component (memoized)
- [ ] Timer component (ref-based, no re-renders)
- [ ] PlayerCard component (memoized)
- [ ] RulesSidebar (static, rarely changes)
- [ ] Phase router (decides which screen to show)

### Phase 2: Styling & Animations (Day 2-3)
- [ ] CSS for submit phase
- [ ] Slide-in animation (CSS)
- [ ] Acid pour animation (CSS)
- [ ] Balance scale animation (CSS or SVG)
- [ ] Color scheme (dark theme with accent colors)

### Phase 3: State Management (Day 3-4)
- [ ] Game state hook (useGameState)
- [ ] Polling hook (useRoomPolling) - optimized
- [ ] Countdown hook (useCountdown) - ref-based
- [ ] Result calculation (memoized)

### Phase 4: Integration (Day 4-5)
- [ ] Connect polling to phase manager
- [ ] Handle all game phases
- [ ] Test all transitions
- [ ] Optimize re-renders with Chrome DevTools

### Phase 5: Polish (Day 5-6)
- [ ] Sound effects (optional)
- [ ] Smooth transitions
- [ ] Mobile responsiveness
- [ ] Accessibility (keyboard, screen readers)

---

## 📱 MOBILE RESPONSIVENESS

```css
@media (max-width: 768px) {
  .submit-phase {
    flex-direction: column;
    padding: 20px;
  }

  .number-pad {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .rules-sidebar {
    position: fixed;
    right: -100%;
    transition: right 0.3s ease;
    z-index: 1000;
  }

  .rules-sidebar.open {
    right: 0;
  }

  .players-container {
    flex-direction: column;
    gap: 20px;
  }
}
```

---

## 🔧 CSS GRID LAYOUT (Fast Rendering)

```css
.game-container {
  display: grid;
  grid-template-columns: 1fr 250px;
  grid-template-rows: auto 1fr auto;
  gap: 20px;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.submit-phase {
  grid-column: 1;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  padding: 40px;
}

.number-pad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
}

.timer-display {
  grid-column: 1 / -1;
  grid-row: 1;
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  color: #00ff00;
}

.rules-sidebar {
  grid-column: 2;
  grid-row: 1 / -1;
  background: rgba(0, 0, 0, 0.5);
  padding: 20px;
  border-left: 2px solid #00ff00;
  overflow-y: auto;
}
```

---

## 🎯 FINAL PERFORMANCE TARGETS

- **First Paint**: < 1 second
- **Time to Interactive**: < 2 seconds
- **Frame Rate**: 60 FPS (animations)
- **Memory Usage**: < 100MB
- **Polling Re-render Time**: < 50ms
- **Animation Jank**: 0 frames dropped

Monitor with:
```javascript
// In DevTools Console
performance.mark('gameStart');
// ... do something
performance.mark('gameEnd');
performance.measure('gamePerf', 'gameStart', 'gameEnd');
console.log(performance.getEntriesByName('gamePerf')[0]);
```

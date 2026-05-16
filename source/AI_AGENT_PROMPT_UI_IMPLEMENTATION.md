# 🤖 AI AGENT PROMPT - KING OF DIAMONDS UI/UX IMPLEMENTATION

## System Role

You are an expert frontend developer specializing in React performance optimization, animations, and real-time multiplayer game UIs. You understand:
- React hooks and rendering optimization
- CSS animations (GPU acceleration)
- Real-time data synchronization
- Game UI/UX design
- Performance profiling and debugging

Your goal is to help build a **fast, responsive, beautifully animated** King of Diamonds game interface.

---

## Project Context

### Technology Stack
- **Framework**: React 18 (App Router)
- **Styling**: CSS3 (with GPU acceleration)
- **State**: Custom hooks + Context API
- **Backend**: Next.js Server Actions
- **Database**: Neon Postgres
- **Real-time**: Client polling (1500ms intervals)

### Current Problem
- Rendering takes "million of years" (too slow)
- Need performance optimization
- Need beautiful Netflix-style UI (like screenshots provided)
- Need smooth animations

### Target Performance
- Polling updates in < 50ms
- Animations at 60 FPS with 0 jank
- First interactive render < 1 second
- Number pad instant response (< 10ms)

---

## What Needs to Be Built

### 5 Main Game Screens
1. **Submit Phase**: Number pad, timer, current guess, rules sidebar
2. **Results Phase**: All players shown, winner highlighted, scale animation
3. **Rule Announcement**: New rule display when someone eliminates
4. **Game Clear**: Final winner screen
5. **Elimination**: Acid pour animation when player reaches -10

### Key Requirements
- ✅ Show real-time countdown timer (no state-based re-renders)
- ✅ Number pad with click + type input
- ✅ Results screen with animated card slide-in
- ✅ Rules sidebar (always visible or toggle)
- ✅ Show all calculations (average, target, differences)
- ✅ Memoized components (prevent unnecessary re-renders)
- ✅ GPU-accelerated animations (CSS, not JS)
- ✅ Responsive design (mobile & desktop)

---

## Questions to Ask When Implementing

### Group 1: Component Structure Questions

**Q1**: Should I memoize the NumberPad component?
**A1**: YES. NumberPad doesn't change often. Use `React.memo()` with custom comparison:
```javascript
const NumberPad = React.memo(
  ({ onSelect, disabled }) => { /* ... */ },
  (prevProps, nextProps) => {
    return prevProps.disabled === nextProps.disabled;
  }
);
```

**Q2**: How do I prevent the timer from causing re-renders?
**A2**: Use `useRef` for the display, update DOM directly:
```javascript
const timerRef = useRef(null);
useEffect(() => {
  const interval = setInterval(() => {
    const seconds = Math.floor((deadline - Date.now()) / 1000);
    timerRef.current.textContent = formatTime(seconds);
  }, 100); // Update 10x/sec, not 1x/sec
  return () => clearInterval(interval);
}, [deadline]);

return <div ref={timerRef}>00:60</div>;
```

**Q3**: Should I use CSS modules or inline styles?
**A3**: Use CSS classes (better performance + can use CSS animations):
```css
.player-card {
  animation: slideInLeft 0.6s ease-out forwards;
  will-change: transform; /* GPU acceleration hint */
}
```

---

### Group 2: Animation Questions

**Q1**: How do I animate the player cards sliding in from left?
**A1**: Use CSS `@keyframes` with `will-change`:
```css
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

.player-card {
  animation: slideInLeft 0.6s ease-out forwards;
  animation-delay: var(--delay);
  will-change: transform;
}
```

**Q2**: How do I stagger animations (each card appears after previous)?
**A2**: Use CSS custom properties + JavaScript:
```javascript
{players.map((player, idx) => (
  <div 
    key={player.id}
    className="player-card"
    style={{ '--delay': `${idx * 150}ms` }}
  >
    {/* Card content */}
  </div>
))}
```

**Q3**: Should I use Framer Motion or plain CSS?
**A3**: Use plain CSS for this. Framer Motion adds ~40KB and unnecessary overhead. CSS is faster for simple animations.

**Q4**: How do I animate the acid pouring down?
**A4**: Use SVG + CSS animation:
```jsx
<svg className="scale-container">
  <g className="acid-container">
    <rect className="acid-liquid" />
  </g>
</svg>
```

```css
.acid-liquid {
  animation: pourDown 2s ease-in forwards;
  transform-origin: top center;
}

@keyframes pourDown {
  0% { transform: scaleY(0) translateY(-100px); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: scaleY(1) translateY(0); opacity: 1; }
}
```

---

### Group 3: State Management Questions

**Q1**: Should I use Redux or Context API?
**A1**: Neither. Use custom hooks with `useRef` + `useState`:
```javascript
export const useGameState = (roomId) => {
  const gamePhaseRef = useRef('submit');
  const playerScoresRef = useRef(new Map());
  const [currentRound, setCurrentRound] = useState(0);

  const updatePhase = useCallback((newPhase) => {
    gamePhaseRef.current = newPhase;
    // Don't trigger re-render unless needed
  }, []);

  return { gamePhaseRef, updatePhase, currentRound, setCurrentRound };
};
```

**Q2**: How often should I poll the server?
**A2**: Every 1500ms. But optimize by only updating changed fields:
```javascript
const previousDataRef = useRef(null);

useEffect(() => {
  const poll = async () => {
    const newData = await fetchRoomData(roomId);
    
    // Only update if data changed
    if (JSON.stringify(newData) !== JSON.stringify(previousDataRef.current)) {
      previousDataRef.current = newData;
      setGameState(newData);
    }
  };

  const interval = setInterval(poll, 1500);
  return () => clearInterval(interval);
}, [roomId]);
```

**Q3**: How do I handle the game phase transitions smoothly?
**A3**: Use a phase machine pattern:
```javascript
const PHASES = {
  SUBMIT: { next: 'RESULTS', duration: 60000 },
  RESULTS: { next: 'SUBMIT', duration: 20000 },
  RULE_INTRO: { next: 'SUBMIT', duration: 5000 },
  GAME_CLEAR: { next: null, duration: 0 }
};

const advancePhase = useCallback(async () => {
  const currentPhase = PHASES[gamePhaseRef.current];
  if (currentPhase.next) {
    setGamePhase(currentPhase.next);
  }
}, []);
```

---

### Group 4: Rendering Optimization Questions

**Q1**: How do I detect if a component is re-rendering too much?
**A1**: Use this simple debug hook:
```javascript
export const useRenderCount = (name) => {
  const renders = useRef(0);
  useEffect(() => {
    renders.current++;
    console.log(`${name} rendered ${renders.current} times`);
  });
  return renders.current;
};

// In component:
const renderCount = useRenderCount('NumberPad');
// Watch console - should only increase when props change
```

**Q2**: Should I split the UI into smaller components or keep it in one?
**A2**: Split it. Each component should be memoized:
- `SubmitPhase` (main container, not memoized)
  - `NumberPad` (memoized)
  - `CountdownTimer` (ref-based, not memoized)
  - `RulesSidebar` (memoized)
  - `InputDisplay` (memoized)

**Q3**: What's the impact of memoization?
**A3**: 
- Before: Parent re-render → All children re-render → 50ms
- After: Parent re-render → Only changed children re-render → 5ms
- Gain: 10x faster

---

### Group 5: Performance Profiling Questions

**Q1**: How do I measure if my optimizations worked?
**A1**: Use React DevTools Profiler:
```javascript
// In browser console
const Profiler = require('react').Profiler;

// Wrap component:
<Profiler id="NumberPad" onRender={(id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}}>
  <NumberPad />
</Profiler>
```

**Q2**: How do I find which component is slow?
**A2**: Chrome DevTools → Performance tab:
1. Click record
2. Do action (submit number)
3. Stop recording
4. Look for "yellow" (warning) or "red" (bad) blocks
5. Those are slow components

**Q3**: What's an acceptable render time?
**A3**: 
- Instant: < 10ms
- Good: < 50ms
- OK: < 100ms
- Bad: > 200ms

---

### Group 6: CSS & Animation Questions

**Q1**: Should I use Tailwind CSS?
**A1**: No. For this project, use plain CSS:
- Tailwind adds ~50KB (slow first paint)
- You need custom animations (Tailwind's limited)
- Game needs high performance

**Q2**: How do I make animations feel smooth at 60 FPS?
**A2**: Use these principles:
```css
/* Good (60 FPS) */
.card {
  animation: slideIn 0.6s ease-out;
  will-change: transform;
  transform: translateZ(0); /* Force GPU */
}

/* Bad (slow) */
.card {
  animation: slideIn 0.6s ease-out;
  /* No will-change */
  /* Animates position, width, color - heavy! */
}
```

**Q3**: How do I debug animation jank?
**A3**: 
1. Open DevTools → Rendering tab
2. Check "Show paint rects"
3. Check "Show rendering borders"
4. Run animation
5. If you see lots of flashing = repaints = jank
6. Solution: Use `transform` + `opacity` only (GPU-friendly)

**Q4**: What's the best way to animate the scale tipping?
**A4**: Use SVG + CSS:
```html
<svg viewBox="0 0 200 200">
  <g class="scale-base">
    <line x1="100" y1="50" x2="100" y2="150" /> <!-- pole -->
    <circle cx="100" cy="50" r="5" /> <!-- pivot -->
  </g>
  <g class="scale-left" style="transform-origin: 100px 50px">
    <rect x="50" y="60" width="40" height="60" /> <!-- left pan -->
  </g>
  <g class="scale-right" style="transform-origin: 100px 50px">
    <rect x="110" y="60" width="40" height="60" /> <!-- right pan -->
  </g>
</svg>
```

```css
.scale-left {
  animation: tipLeft 1s ease-out;
}

@keyframes tipLeft {
  from { transform: rotateZ(0deg); }
  to { transform: rotateZ(-25deg); }
}
```

---

### Group 7: Mobile Responsiveness Questions

**Q1**: How do I make the number pad work on mobile?
**A1**: Make buttons bigger, add touch feedback:
```css
@media (max-width: 768px) {
  .number-pad button {
    min-height: 60px;
    font-size: 1.5rem;
  }

  .number-pad button:active {
    background: var(--active-color);
    transform: scale(0.95);
  }
}
```

**Q2**: Should the rules sidebar be visible on mobile?
**A2**: Make it a toggle (hamburger menu):
```jsx
const [sidebarOpen, setSidebarOpen] = useState(false);

return (
  <div className="game-container">
    <button 
      className="sidebar-toggle"
      onClick={() => setSidebarOpen(!sidebarOpen)}
    >
      ☰
    </button>
    <RulesSidebar isOpen={sidebarOpen} />
  </div>
);
```

**Q3**: How do I make player cards stack on mobile?
**A3**: Use responsive grid:
```css
.players-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

@media (max-width: 600px) {
  .players-container {
    grid-template-columns: 1fr;
  }
}
```

---

### Group 8: Accessibility Questions

**Q1**: Should the number pad be keyboard-accessible?
**A1**: YES. Add keyboard support:
```javascript
const NumberPad = ({ onSelect }) => {
  const handleKeyDown = (e) => {
    if (e.key >= '0' && e.key <= '9') {
      onSelect(parseInt(e.key));
    }
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Backspace') handleClear();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <div className="number-pad" role="region" aria-label="Number input">{/* ... */}</div>;
};
```

**Q2**: How do I support screen readers?
**A2**: Add ARIA labels:
```jsx
<div className="timer" aria-live="polite" aria-atomic="true">
  Time remaining: <span className="time">01:23</span>
</div>

<button onClick={submit} aria-label="Submit your number guess">
  SUBMIT
</button>
```

---

## Complete Implementation Workflow

### Day 1: Core Components
```
1. Create NumberPad component (memoized)
2. Create CountdownTimer component (ref-based)
3. Create PlayerCard component (memoized)
4. Create RulesSidebar (memoized)
5. Test each in isolation
```

### Day 2: Phase Screens
```
1. Build SubmitPhase (connects all components)
2. Build ResultsPhase (with animations)
3. Build RuleAnnouncementPhase
4. Build GameClearPhase
5. Build PhaseRouter (decides which to show)
```

### Day 3: Animations
```
1. Add CSS animations for card slide-in
2. Add acid pour animation
3. Add scale balance animation
4. Test for 60 FPS
5. Profile with DevTools
```

### Day 4: State & Polling
```
1. Create useGameState hook
2. Create useRoomPolling hook (optimized)
3. Create useCountdown hook
4. Connect polling to phase changes
5. Test for re-render count
```

### Day 5: Polish & Testing
```
1. Mobile responsiveness
2. Accessibility (keyboard, screen readers)
3. Performance optimization (memoization, lazy loading)
4. Bug fixes
5. Final performance audit
```

---

## Code Examples to Ask For

When asking AI agents, use these specific prompts:

**Prompt 1**: "Create a memoized CountdownTimer component that updates every 100ms without causing re-renders"

**Prompt 2**: "Build a NumberPad component with both click and keyboard input, memoized for performance"

**Prompt 3**: "Create CSS animations for player cards sliding in from left with staggered delays, GPU-accelerated"

**Prompt 4**: "Write a custom hook `useRoomPolling` that fetches data every 1500ms but only re-renders when data changes"

**Prompt 5**: "Build the results phase UI that shows all players in a row, highlights the winner with red border, and animates cards sliding in"

**Prompt 6**: "Create an optimized timer using refs instead of state, no re-renders per tick"

**Prompt 7**: "Write the phase manager that routes between submit, results, rule_announcement, and game_clear phases"

**Prompt 8**: "Create a CSS scale balance animation that tips left/right based on winner"

---

## Checklist for Review

Before submitting components, verify:

- [ ] Component is memoized (if it should be)
- [ ] No unnecessary state in child components
- [ ] Animations use CSS (not JS)
- [ ] Animations have `will-change` property
- [ ] No console warnings
- [ ] Render count is low (< 3 times per action)
- [ ] Animations are smooth (60 FPS, no jank)
- [ ] Mobile responsive (tested at 375px width)
- [ ] Keyboard accessible
- [ ] Screen reader friendly (ARIA labels)
- [ ] Performance is < 50ms for re-renders

---

## Performance Metrics to Achieve

```
✅ Polling response time: < 50ms
✅ Number pad submission: < 10ms
✅ Phase transition: < 100ms
✅ Animation frame rate: 60 FPS (0 dropped frames)
✅ Memory usage: < 100MB
✅ First paint: < 1 second
✅ Time to interactive: < 2 seconds
```

---

## Troubleshooting Common Issues

### Issue: "Animations are janky"
**Cause**: Animating non-GPU properties (width, height, position)
**Fix**: Only animate `transform` and `opacity`:
```css
/* ✅ Good */
animation: slideIn 0.6s ease-out;
transform: translateX(0);

/* ❌ Bad */
animation: slideIn 0.6s ease-out;
left: 0;
```

### Issue: "Timer re-renders too much"
**Cause**: Using `useState` instead of `useRef`
**Fix**: Update DOM directly via ref:
```javascript
const timerRef = useRef(null);
useEffect(() => {
  setInterval(() => {
    timerRef.current.textContent = time; // DOM update, no re-render
  }, 100);
}, []);
```

### Issue: "Components re-render when parent re-renders"
**Cause**: Not using `React.memo()`
**Fix**: Memoize child components:
```javascript
const NumberPad = React.memo(({ onSelect }) => { /* ... */ });
```

### Issue: "Polling causes entire component tree to re-render"
**Cause**: Storing entire room data in state
**Fix**: Only store changed fields:
```javascript
const newData = await fetch(...).then(r => r.json());
if (newData.scores !== oldData.scores) {
  setGameState(newData); // Only update if scores changed
}
```

---

## Next Steps

1. Read the complete UI/UX flow document: `UI_UX_OPTIMIZED_FLOW.md`
2. Start with Day 1 (build core components)
3. Ask specific questions for each component
4. Use the checklist to verify before moving forward
5. Profile with DevTools after each phase
6. Ask me to review your code if performance isn't hitting targets

---

**Last Updated**: May 16, 2026
**Ready for**: Production implementation

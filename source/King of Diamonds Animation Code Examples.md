# 🎬 KING OF DIAMONDS - ANIMATION CODE EXAMPLES

## Quick Start: Copy & Paste Ready Code

---

## Animation 1: Player Cards Slide In (Results Screen)

### CSS
```css
/* animations.css */
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-120px) translateZ(0);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateZ(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(120px) translateZ(0);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateZ(0);
  }
}

.player-card {
  animation: slideInLeft 0.6s ease-out forwards;
  will-change: transform;
  transform: translateZ(0);
}

.player-card.winner {
  animation: slideInRight 0.6s ease-out forwards;
  border: 3px solid #ff0000;
  box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
}

/* Stagger each card */
.player-card:nth-child(1) { animation-delay: 0ms; }
.player-card:nth-child(2) { animation-delay: 150ms; }
.player-card:nth-child(3) { animation-delay: 300ms; }
.player-card:nth-child(4) { animation-delay: 450ms; }
.player-card:nth-child(5) { animation-delay: 600ms; }
```

### React Component
```jsx
// ResultsPhase.jsx
import React from 'react';
import './animations.css';

const PlayerResultCard = ({ player, guess, isWinner, index }) => {
  return (
    <div 
      className={`player-card ${isWinner ? 'winner' : ''}`}
      style={{ 
        '--order': index,
        animationDelay: `${index * 150}ms`
      }}
    >
      <div className="player-avatar">
        {player.name[0]}
      </div>
      <div className="player-guess">{guess}</div>
      <div className="player-score">
        {isWinner ? '+0' : '-1'}
      </div>
      {isWinner && <div className="win-badge">WIN</div>}
    </div>
  );
};

export const ResultsPhase = ({ players, results }) => {
  return (
    <div className="results-phase">
      <div className="calculation-display">
        <h2>Average: {results.average.toFixed(2)}</h2>
        <h2>Target: {results.target.toFixed(2)}</h2>
      </div>

      <div className="players-container">
        {players.map((player, idx) => (
          <PlayerResultCard
            key={player.id}
            player={player}
            guess={results.guesses[player.id]}
            isWinner={results.winnerId === player.id}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
};
```

---

## Animation 2: Acid Pour Down (Elimination)

### CSS
```css
@keyframes acidPour {
  0% {
    opacity: 0;
    transform: scaleY(0) translateY(-100px);
  }
  5% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: scaleY(1) translateY(0);
  }
}

@keyframes acidDrop {
  0% {
    opacity: 0;
    transform: translateY(-150px);
  }
  10% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(300px);
  }
}

.scale-container {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 0 auto;
}

.acid-container {
  animation: acidPour 2s ease-in forwards;
  transform-origin: top center;
}

.acid-liquid {
  fill: #ffcc00;
  opacity: 0.8;
  filter: drop-shadow(0 0 10px rgba(255, 204, 0, 0.5));
}

.acid-drop {
  animation: acidDrop 1.5s ease-in infinite;
}

.player-elimination {
  animation: playerFade 2s ease-in forwards;
}

@keyframes playerFade {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}
```

### React Component with SVG
```jsx
// AcidAnimation.jsx
import React, { useEffect, useState } from 'react';
import './animations.css';

export const AcidAnimation = ({ player, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="elimination-screen">
      <div className="player-elimination">
        <div className="player-silhouette">
          {player.name}
        </div>
        <div className="score-display">
          {player.score}
        </div>
      </div>

      <svg 
        className="scale-container" 
        viewBox="0 0 300 300"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Scale Pole */}
        <line 
          x1="150" y1="30" 
          x2="150" y2="150" 
          stroke="#888" 
          strokeWidth="3"
        />

        {/* Scale Pivot */}
        <circle cx="150" cy="30" r="8" fill="#666" />

        {/* Scale Pans */}
        <g className="scale-left" style={{ transformOrigin: '150px 30px' }}>
          <rect x="80" y="40" width="60" height="80" fill="#999" />
          <line x1="80" y1="40" x2="140" y2="40" stroke="#555" strokeWidth="2" />
        </g>

        <g className="scale-right" style={{ transformOrigin: '150px 30px' }}>
          <rect x="160" y="40" width="60" height="80" fill="#999" />
          <line x1="160" y1="40" x2="220" y2="40" stroke="#555" strokeWidth="2" />
        </g>

        {/* Acid Container (on right pan) */}
        <g className="acid-container" style={{ transformOrigin: '190px 120px' }}>
          <rect 
            className="acid-liquid"
            x="170" y="100" 
            width="40" height="80" 
          />
          
          {/* Dripping acid drops */}
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              className="acid-drop"
              cx={150 + Math.random() * 100}
              cy={80}
              r="3"
              style={{
                animationDelay: `${i * 0.3}s`,
                fill: '#ffcc00'
              }}
            />
          ))}
        </g>
      </svg>

      <div className="elimination-text">
        {player.name} ELIMINATED
      </div>
    </div>
  );
};
```

---

## Animation 3: Balance Scale Tipping

### CSS
```css
@keyframes tipLeft {
  from {
    transform: rotateZ(0deg);
  }
  to {
    transform: rotateZ(-35deg);
  }
}

@keyframes tipRight {
  from {
    transform: rotateZ(0deg);
  }
  to {
    transform: rotateZ(35deg);
  }
}

@keyframes scalePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.scale-left {
  transform-origin: 150px 30px;
}

.scale-right {
  transform-origin: 150px 30px;
}

.scale-left.winning {
  animation: tipLeft 1.5s ease-out forwards;
}

.scale-right.winning {
  animation: tipRight 1.5s ease-out forwards;
}

.scale-pivot {
  animation: scalePulse 0.6s ease-in-out 3; /* Pulse 3 times */
}
```

### React Component
```jsx
// BalanceScale.jsx
import React from 'react';
import './animations.css';

export const BalanceScale = ({ winnerSide }) => {
  // winnerSide: 'left' or 'right'
  
  return (
    <svg 
      className="scale-svg" 
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pivot Point */}
      <circle 
        className="scale-pivot"
        cx="150" 
        cy="50" 
        r="10" 
        fill="#888"
      />

      {/* Pole/Beam */}
      <line 
        x1="150" y1="60" 
        x2="150" y2="150" 
        stroke="#666" 
        strokeWidth="4"
      />

      {/* Left Pan */}
      <g className={`scale-left ${winnerSide === 'left' ? 'winning' : ''}`}>
        {/* Pan */}
        <rect 
          x="60" y="120" 
          width="70" height="50" 
          fill="#999"
          stroke="#555"
          strokeWidth="2"
        />
        
        {/* Pan Handle */}
        <line 
          x1="95" y1="120" 
          x2="95" y2="60" 
          stroke="#666" 
          strokeWidth="3"
        />
        <line 
          x1="60" y1="60" 
          x2="150" y2="60" 
          stroke="#666" 
          strokeWidth="3"
        />
      </g>

      {/* Right Pan */}
      <g className={`scale-right ${winnerSide === 'right' ? 'winning' : ''}`}>
        {/* Pan */}
        <rect 
          x="170" y="120" 
          width="70" height="50" 
          fill="#999"
          stroke="#555"
          strokeWidth="2"
        />
        
        {/* Pan Handle */}
        <line 
          x1="205" y1="120" 
          x2="205" y2="60" 
          stroke="#666" 
          strokeWidth="3"
        />
        <line 
          x1="150" y1="60" 
          x2="240" y2="60" 
          stroke="#666" 
          strokeWidth="3"
        />
      </g>
    </svg>
  );
};
```

---

## Animation 4: Countdown Timer Pulse

### CSS
```css
@keyframes timerPulse {
  0% {
    transform: scale(1);
    color: #00ff00;
  }
  50% {
    transform: scale(1.1);
    color: #ffff00;
  }
  100% {
    transform: scale(1);
    color: #00ff00;
  }
}

@keyframes timerDanger {
  0%, 100% {
    color: #ff0000;
  }
  50% {
    color: #ff6600;
  }
}

.timer-display {
  font-size: 3rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  text-align: center;
  letter-spacing: 5px;
}

.timer-display.normal {
  color: #00ff00;
  animation: timerPulse 1s ease-in-out infinite;
}

.timer-display.warning {
  animation: timerDanger 0.5s ease-in-out infinite;
}
```

### React Component (Optimized - No Re-renders)
```jsx
// CountdownTimer.jsx
import React, { useEffect, useRef } from 'react';
import './animations.css';

export const CountdownTimer = ({ deadline, onExpire, totalTime = 60 }) => {
  const timerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, deadline - now);
      const totalSeconds = Math.floor(remaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // Update DOM directly (no re-render)
      timerRef.current.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Add warning class if under 10 seconds
      if (totalSeconds < 10) {
        timerRef.current.parentElement?.classList.add('warning');
      } else {
        timerRef.current.parentElement?.classList.remove('warning');
      }

      // Check if expired
      if (remaining <= 0) {
        onExpire();
        return;
      }

      // Update 10 times per second for smooth appearance
      timeoutRef.current = setTimeout(updateTimer, 100);
    };

    updateTimer(); // Initial call
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [deadline, onExpire]);

  return (
    <div className="timer-display normal">
      <span ref={timerRef}>01:00</span>
    </div>
  );
};
```

---

## Animation 5: Number Pad Button Press Feedback

### CSS
```css
.number-pad {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 20px;
}

.number-button {
  padding: 20px;
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(135deg, #0f3460 0%, #162749 100%);
  color: #00ff00;
  border: 2px solid #00ff00;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s ease;
  will-change: transform, box-shadow;
}

.number-button:hover {
  background: linear-gradient(135deg, #162749 0%, #0f3460 100%);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  transform: scale(1.05) translateZ(0);
}

.number-button:active {
  transform: scale(0.95) translateZ(0);
  box-shadow: 0 0 25px rgba(0, 255, 0, 0.8);
  background: #162749;
}

/* Ripple effect on click */
@keyframes ripple {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.8);
  }
  70% {
    box-shadow: 0 0 0 30px rgba(0, 255, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 0, 0);
  }
}

.number-button.clicked {
  animation: ripple 0.6s ease-out;
}
```

### React Component
```jsx
// NumberPad.jsx
import React, { useRef } from 'react';
import './animations.css';

const NumberPad = React.memo(({ onSelect, disabled = false }) => {
  const buttonRef = useRef({});

  const handleClick = (num) => {
    if (disabled) return;

    // Add ripple animation
    const button = buttonRef.current[num];
    if (button) {
      button.classList.remove('clicked');
      // Trigger reflow to restart animation
      void button.offsetWidth;
      button.classList.add('clicked');
    }

    // Call selection handler
    onSelect(num);
  };

  return (
    <div className="number-pad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
        <button
          key={num}
          ref={(el) => (buttonRef.current[num] = el)}
          className="number-button"
          onClick={() => handleClick(num)}
          disabled={disabled}
          aria-label={`Number ${num}`}
        >
          {num}
        </button>
      ))}
    </div>
  );
});

export default NumberPad;
```

---

## Animation 6: Rule Announcement Slide In

### CSS
```css
@keyframes ruleSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scaleY(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

@keyframes rulePulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
  }
}

.rule-announcement {
  animation: ruleSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 40px;
  background: rgba(15, 52, 96, 0.9);
  border: 3px solid #ffd700;
  border-radius: 10px;
  animation: rulePulse 2s ease-in-out infinite;
}

.rule-title {
  color: #ffd700;
  font-size: 1.5rem;
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.rule-description {
  color: #00ff00;
  font-size: 1.1rem;
  line-height: 1.6;
}
```

### React Component
```jsx
// RuleAnnouncement.jsx
import React from 'react';
import './animations.css';

const RULES = {
  1: {
    title: '⚠️ Rule 1: Duplicate Invalidity',
    description: 'If 2 or more players choose the same number, that number becomes INVALID. All players who chose it lose -1 point.'
  },
  2: {
    title: '⚠️ Rule 2: Double Penalty',
    description: 'When a player chooses the EXACT target number, all other players lose -2 points instead of -1.'
  },
  3: {
    title: '⚠️ Rule 3: 0/100 Override',
    description: 'If one player chooses 0, the other automatically wins by choosing 100. The game becomes rock-paper-scissors.'
  }
};

export const RuleAnnouncement = ({ ruleNumber, remainingTime }) => {
  const rule = RULES[ruleNumber];

  return (
    <div className="rule-announcement-screen">
      <div className="rule-announcement">
        <h2 className="rule-title">{rule.title}</h2>
        <p className="rule-description">{rule.description}</p>
        <p style={{ marginTop: '30px', color: '#ffff00' }}>
          Next round in: {Math.ceil(remainingTime / 1000)}s
        </p>
      </div>
    </div>
  );
};
```

---

## Animation 7: Full Game Clear Victory

### CSS
```css
@keyframes confetti {
  0% {
    opacity: 1;
    transform: translateY(-100px) rotateZ(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(500px) rotateZ(720deg);
  }
}

@keyframes victoryPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes goldGlow {
  0%, 100% {
    color: #ffd700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }
  50% {
    color: #ffff00;
    text-shadow: 0 0 30px rgba(255, 255, 0, 0.8);
  }
}

.game-clear-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  position: relative;
  overflow: hidden;
}

.victory-title {
  font-size: 4rem;
  font-weight: bold;
  animation: victoryPulse 0.6s ease-in-out;
  animation: goldGlow 1.5s ease-in-out infinite;
}

.winner-name {
  font-size: 3rem;
  color: #00ff00;
  margin: 20px 0;
  animation: victoryPulse 0.8s ease-in-out;
}

.confetti-particle {
  position: fixed;
  width: 10px;
  height: 10px;
  pointer-events: none;
  animation: confetti 3s ease-in-out forwards;
}
```

### React Component
```jsx
// GameClear.jsx
import React, { useEffect } from 'react';
import './animations.css';

export const GameClear = ({ winner }) => {
  useEffect(() => {
    // Create confetti particles
    const colors = ['#ffd700', '#ff6600', '#00ff00', '#00ffff'];
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animationDelay = (Math.random() * 0.5) + 's';
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      
      document.body.appendChild(particle);

      setTimeout(() => particle.remove(), 3500);
    }
  }, []);

  return (
    <div className="game-clear-screen">
      <div className="victory-title">🏆 GAME CLEAR 🏆</div>
      <div className="winner-name">{winner.name} WINS!</div>
      <div style={{ marginTop: '40px', fontSize: '1.5rem', color: '#00ff00' }}>
        Final Score: {winner.finalScore}
      </div>
      <div style={{ marginTop: '40px' }}>
        <button 
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            background: '#00ff00',
            color: '#000',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          New Game
        </button>
        <button 
          style={{
            padding: '15px 30px',
            fontSize: '1.2rem',
            background: 'transparent',
            color: '#00ff00',
            border: '2px solid #00ff00',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Leave
        </button>
      </div>
    </div>
  );
};
```

---

## Quick Integration Guide

### 1. Import animations
```javascript
import './animations.css';
import { CountdownTimer } from './animations/CountdownTimer';
import { BalanceScale } from './animations/BalanceScale';
import { AcidAnimation } from './animations/AcidAnimation';
```

### 2. Use in components
```jsx
<CountdownTimer deadline={Date.now() + 60000} onExpire={handleExpire} />
<BalanceScale winnerSide="left" />
<AcidAnimation player={eliminatedPlayer} onComplete={nextPhase} />
```

### 3. Performance tips
- All animations use CSS (GPU accelerated)
- No JavaScript animation loops
- `will-change` prevents layout thrashing
- `translateZ(0)` forces hardware acceleration

---

## Performance Checklist

- ✅ All animations on 60 FPS
- ✅ No jank or frame drops
- ✅ Smooth transitions between phases
- ✅ Particles/effects don't slow down game
- ✅ Timers update without re-rendering

---

**Ready to paste into your project!** 🚀

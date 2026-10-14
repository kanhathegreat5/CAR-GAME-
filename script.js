/**
 * ============================================================================
 * HIGHWAY RUSH - ARCADE MOTORSPORT GAME
 * Complete HTML5 Canvas + Vanilla JavaScript Implementation
 * ============================================================================
 */

(function() {
  'use strict';

  /* ==========================================================================
     1. AUDIO SYSTEM (Synthesized with Web Audio API - Zero External Dependencies)
     ========================================================================== */
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.isInitialized = false;
      
      // Engine sound nodes
      this.engineOsc = null;
      this.engineSub = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.isEngineRunning = false;

      // Saved preference
      const savedMute = localStorage.getItem('highway_rush_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    }

    init() {
      if (this.isInitialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio not supported:', e);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('highway_rush_muted', this.isMuted);
      if (this.isMuted) {
        this.stopEngine();
      }
      return this.isMuted;
    }

    startEngine() {
      if (this.isMuted || !this.ctx || this.isEngineRunning) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;

        // Primary engine oscillator (sawtooth for aggressive engine growl)
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(45, now);

        // Sub oscillator (triangle for low rumble)
        this.engineSub = this.ctx.createOscillator();
        this.engineSub.type = 'triangle';
        this.engineSub.frequency.setValueAtTime(22.5, now);

        // Lowpass filter for realistic engine resonance
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(280, now);
        this.engineFilter.Q.setValueAtTime(3.5, now);

        // Gain node
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.08, now);

        // Connect
        this.engineOsc.connect(this.engineFilter);
        this.engineSub.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.start(now);
        this.engineSub.start(now);
        this.isEngineRunning = true;
      } catch (e) {
        console.warn('Could not start engine audio:', e);
      }
    }

    updateEnginePitch(speedRatio, isAccelerating) {
      if (!this.isEngineRunning || !this.ctx || this.isMuted) return;
      try {
        const now = this.ctx.currentTime;
        // Base freq from 40Hz at idle to 150Hz at top speed
        const targetFreq = 42 + speedRatio * 95 + (isAccelerating ? 15 : 0);
        this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
        this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.05);

        // Filter cutoff opens up as car accelerates
        const targetCutoff = 220 + speedRatio * 450 + (isAccelerating ? 120 : 0);
        this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);

        const targetGain = 0.06 + speedRatio * 0.06 + (isAccelerating ? 0.02 : 0);
        this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
      } catch (e) {}
    }

    stopEngine() {
      if (!this.isEngineRunning) return;
      try {
        if (this.engineGain && this.ctx) {
          this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        }
        setTimeout(() => {
          if (this.engineOsc) {
            try { this.engineOsc.stop(); this.engineOsc.disconnect(); } catch (e) {}
            this.engineOsc = null;
          }
          if (this.engineSub) {
            try { this.engineSub.stop(); this.engineSub.disconnect(); } catch (e) {}
            this.engineSub = null;
          }
          this.isEngineRunning = false;
        }, 60);
      } catch (e) {
        this.isEngineRunning = false;
      }
    }

    playCrash() {
      if (this.isMuted || !this.ctx) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;
        
        // Noise burst for crunch
        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.35);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(now);

        // Low pitch thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

        oscGain.gain.setValueAtTime(0.6, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {}
    }

    playBrake() {
      if (this.isMuted || !this.ctx) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;
        // High squeal
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800 + Math.random() * 300, now);
        osc.frequency.linearRampToValueAtTime(900, now + 0.2);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } catch (e) {}
    }

    playRumble() {
      if (this.isMuted || !this.ctx) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
      } catch (e) {}
    }

    playNearMiss() {
      if (this.isMuted || !this.ctx) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } catch (e) {}
    }

    playGameOver() {
      if (this.isMuted || !this.ctx) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;
        const notes = [320, 280, 240, 180];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.15, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.32);
        });
      } catch (e) {}
    }

    playUiBeep() {
      if (this.isMuted || !this.ctx) return;
      try {
        this.resume();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } catch (e) {}
    }
  }

  const audio = new AudioManager();

  /* ==========================================================================
     2. VEHICLE DATA DEFINITIONS & STATS
     ========================================================================== */
  const CAR_PRESETS = {
    inferno: {
      id: 'inferno',
      name: 'INFERNO GT',
      class: 'SUPER SPORT',
      topSpeedKm: 215,
      accelRate: 55,       // km/h per sec
      brakeRate: 85,       // km/h per sec
      handlingRate: 11.5,  // lane lerp speed
      durabilityMult: 1.0, // standard damage
      colorTheme: {
        primary: '#e60026',
        secondary: '#1c1c1c',
        accent: '#ff6200',
        glass: '#0f172a',
        glow: 'rgba(255, 30, 86, 0.7)'
      },
      width: 48,
      height: 94
    },
    apex: {
      id: 'apex',
      name: 'APEX CYBER',
      class: 'HYPER CONCEPT',
      topSpeedKm: 240,
      accelRate: 68,
      brakeRate: 95,
      handlingRate: 14.0,  // very quick lane cuts
      durabilityMult: 1.15,// lighter body = takes 15% more damage
      colorTheme: {
        primary: '#00b4d8',
        secondary: '#03045e',
        accent: '#00f0ff',
        glass: '#030712',
        glow: 'rgba(0, 240, 255, 0.7)'
      },
      width: 46,
      height: 92
    },
    solar: {
      id: 'solar',
      name: 'SOLAR THUNDER',
      class: 'MUSCLE TOURING',
      topSpeedKm: 195,
      accelRate: 46,
      brakeRate: 75,
      handlingRate: 9.5,   // heavier feel
      durabilityMult: 0.75,// reinforced armor = takes 25% less damage!
      colorTheme: {
        primary: '#ffd000',
        secondary: '#1f1a00',
        accent: '#ff7700',
        glass: '#111827',
        glow: 'rgba(255, 208, 0, 0.7)'
      },
      width: 50,
      height: 96
    }
  };

  /* ==========================================================================
     3. HIGHWAY SVG CAR RENDERING ROUTINES (Crisp Procedural Graphics)
     ========================================================================== */
  function createCarSVG(carId, scale = 1) {
    const p = CAR_PRESETS[carId] || CAR_PRESETS.inferno;
    const w = p.width * scale;
    const h = p.height * scale;
    const c = p.colorTheme;

    let details = '';
    if (carId === 'inferno') {
      // Inferno GT: Twin white racing stripes, aggressive hood scoops, aero spoiler
      details = `
        <!-- Dual racing stripes -->
        <rect x="20" y="8" width="3" height="78" fill="#ffffff" opacity="0.9"/>
        <rect x="25" y="8" width="3" height="78" fill="#ffffff" opacity="0.9"/>
        <!-- Hood air vents -->
        <polygon points="15,22 18,22 17,29 14,29" fill="#111" />
        <polygon points="33,22 30,22 31,29 34,29" fill="#111" />
        <!-- Rear wing spoiler -->
        <rect x="6" y="86" width="36" height="5" rx="2" fill="#111" stroke="${c.accent}" stroke-width="1"/>
        <rect x="10" y="82" width="3" height="5" fill="#222"/>
        <rect x="35" y="82" width="3" height="5" fill="#222"/>
      `;
    } else if (carId === 'apex') {
      // Apex Cyber: Stealth angular nose, cyber cockpit, rear neon diffuser
      details = `
        <!-- Cyber accent lines -->
        <path d="M 8 35 L 14 15 L 24 10 L 34 15 L 40 35" fill="none" stroke="${c.accent}" stroke-width="1.5" opacity="0.9"/>
        <path d="M 12 70 L 24 82 L 36 70" fill="none" stroke="${c.accent}" stroke-width="2"/>
        <!-- Stealth cockpit glass -->
        <polygon points="16,30 24,25 32,30 30,55 18,55" fill="#000" stroke="${c.accent}" stroke-width="1"/>
        <!-- Rear diffuser fin -->
        <rect x="22" y="86" width="4" height="6" fill="${c.accent}"/>
      `;
    } else {
      // Solar Thunder: Wide dual black stripes, hood power bulge, chrome quad exhaust
      details = `
        <!-- Muscle stripes -->
        <rect x="18" y="8" width="5" height="78" fill="#000000" opacity="0.85"/>
        <rect x="25" y="8" width="5" height="78" fill="#000000" opacity="0.85"/>
        <!-- Heavy hood scoop -->
        <rect x="19" y="24" width="10" height="12" rx="2" fill="#111" stroke="#333" stroke-width="1"/>
        <!-- Heavy bumpers -->
        <rect x="10" y="88" width="28" height="4" rx="2" fill="#222"/>
        <!-- Quad exhausts -->
        <circle cx="11" cy="91" r="2.5" fill="#bbb"/>
        <circle cx="16" cy="91" r="2.5" fill="#bbb"/>
        <circle cx="32" cy="91" r="2.5" fill="#bbb"/>
        <circle cx="37" cy="91" r="2.5" fill="#bbb"/>
      `;
    }

    return `
      <svg viewBox="0 0 48 94" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="car-shadow-${carId}" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="rgba(0,0,0,0.7)"/>
          </filter>
          <linearGradient id="body-grad-${carId}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${c.secondary}"/>
            <stop offset="25%" stop-color="${c.primary}"/>
            <stop offset="75%" stop-color="${c.primary}"/>
            <stop offset="100%" stop-color="${c.secondary}"/>
          </linearGradient>
          <linearGradient id="glass-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>

        <!-- Wheels / Tires -->
        <rect x="2" y="16" width="7" height="18" rx="3" fill="#111" stroke="#333" stroke-width="1"/>
        <rect x="39" y="16" width="7" height="18" rx="3" fill="#111" stroke="#333" stroke-width="1"/>
        <rect x="2" y="62" width="7" height="20" rx="3" fill="#111" stroke="#333" stroke-width="1"/>
        <rect x="39" y="62" width="7" height="20" rx="3" fill="#111" stroke="#333" stroke-width="1"/>

        <!-- Main Car Body Shell -->
        <path d="M 8 20 
                 C 8 10, 16 6, 24 6 
                 C 32 6, 40 10, 40 20 
                 L 41 40 
                 C 42 50, 42 75, 41 85 
                 C 40 90, 34 92, 24 92 
                 C 14 92, 8 90, 7 85 
                 C 6 75, 6 50, 7 40 
                 Z" 
              fill="url(#body-grad-${carId})" 
              stroke="rgba(255,255,255,0.2)" 
              stroke-width="1.2"
              filter="url(#car-shadow-${carId})"/>

        <!-- Side Mirrors -->
        <polygon points="6,28 2,30 2,33 6,33" fill="${c.secondary}"/>
        <polygon points="42,28 46,30 46,33 42,33" fill="${c.secondary}"/>

        <!-- Windshield & Cockpit Roof -->
        <path d="M 12 32 L 14 46 L 34 46 L 36 32 C 30 28, 18 28, 12 32 Z" fill="url(#glass-grad)" stroke="#1e293b" stroke-width="1"/>
        <!-- Roof panel -->
        <rect x="13" y="46" width="22" height="18" rx="2" fill="${c.secondary}" opacity="0.95"/>
        <!-- Rear window -->
        <path d="M 14 65 L 34 65 L 32 74 L 16 74 Z" fill="url(#glass-grad)" stroke="#1e293b" stroke-width="1"/>

        <!-- Custom Model Details -->
        ${details}

        <!-- Headlights -->
        <polygon points="9,11 15,9 13,16 8,16" fill="#e0f7fa"/>
        <polygon points="39,11 33,9 35,16 40,16" fill="#e0f7fa"/>

        <!-- Tail lights -->
        <rect x="9" y="87" width="8" height="3" rx="1" fill="#ff1744"/>
        <rect x="31" y="87" width="8" height="3" rx="1" fill="#ff1744"/>
      </svg>
    `;
  }

  /* Render preview cars into selection screen and homepage */
  function populateVehicleDisplays() {
    const hero = document.getElementById('home-car-hero');
    if (hero) hero.innerHTML = createCarSVG('inferno', 1.8);

    const stageInferno = document.getElementById('stage-inferno');
    if (stageInferno) stageInferno.innerHTML = createCarSVG('inferno', 1.7);

    const stageApex = document.getElementById('stage-apex');
    if (stageApex) stageApex.innerHTML = createCarSVG('apex', 1.7);

    const stageSolar = document.getElementById('stage-solar');
    if (stageSolar) stageSolar.innerHTML = createCarSVG('solar', 1.7);
  }

  /* ==========================================================================
     4. GAME ENGINE & LOGIC ARCHITECTURE
     ========================================================================== */
  const GameState = {
    HOME: 'HOME',
    CAR_SELECT: 'CAR_SELECT',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
  };

  // Safe Polyfill for CanvasRenderingContext2D.roundRect
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
      if (!radii) radii = 0;
      const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  class HighwayRushGame {
    constructor() {
      this.state = GameState.HOME;
      this.selectedCarId = 'inferno';

      // Canvas & Rendering
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.width = 600;
      this.height = 800;

      // Road Geometry (3 Lanes)
      this.laneCount = 3;
      this.roadWidth = 340;
      this.laneWidth = this.roadWidth / this.laneCount;
      this.roadLeft = (this.width - this.roadWidth) / 2;
      this.laneCenters = [
        this.roadLeft + this.laneWidth * 0.5,
        this.roadLeft + this.laneWidth * 1.5,
        this.roadLeft + this.laneWidth * 2.5
      ];

      // Road Animation state
      this.roadScrollY = 0;
      this.sideScenery = [];
      this.horizonBillboards = [];

      // Player State
      this.playerLane = 1; // 0: Left, 1: Middle, 2: Right
      this.playerX = this.laneCenters[1];
      this.playerY = 640;
      this.playerTilt = 0;
      this.currentSpeedKm = 100;
      this.minSpeedKm = 45;
      this.health = 100;
      this.score = 0;
      this.distanceMeters = 0;
      this.elapsedTime = 0;
      this.maxSpeedReached = 100;
      this.nearMissCount = 0;

      // Damage & Invulnerability
      this.invulnerableTimer = 0;
      this.shakeTimer = 0;
      this.vignetteTimer = 0;

      // Controls State
      this.keys = {
        left: false,
        right: false,
        up: false,
        down: false
      };
      this.laneCooldown = 0;

      // Traffic & Obstacles
      this.traffic = [];
      this.obstacles = [];
      this.particles = [];
      this.popups = [];

      // Timers & Spawners
      this.trafficSpawnTimer = 0;
      this.obstacleSpawnTimer = 0;
      this.gameTime = 0;

      // High scores
      this.highScore = parseInt(localStorage.getItem('highway_rush_best_score') || '0', 10);
      this.bestDistance = parseFloat(localStorage.getItem('highway_rush_best_dist') || '0.0');

      // Delta time tracking
      this.lastTimestamp = 0;

      // Bind methods
      this.gameLoop = this.gameLoop.bind(this);
      this.handleResize = this.handleResize.bind(this);

      this.initDom();
      this.initEvents();
      this.handleResize();
      this.initScenery();
      this.updateHomeScores();
    }

    /* Initialize DOM references and states */
    initDom() {
      this.screens = {
        home: document.getElementById('screen-home'),
        select: document.getElementById('screen-select'),
        game: document.getElementById('screen-game')
      };

      this.modals = {
        instructions: document.getElementById('modal-instructions'),
        pause: document.getElementById('modal-pause'),
        gameover: document.getElementById('modal-gameover')
      };

      this.hud = {
        hpText: document.getElementById('hud-hp-text'),
        hpBar: document.getElementById('hud-hp-bar'),
        speedVal: document.getElementById('hud-speed-val'),
        speedBar: document.getElementById('hud-speed-bar'),
        scoreVal: document.getElementById('hud-score-val'),
        distVal: document.getElementById('hud-distance-val'),
        popups: document.getElementById('hud-popups'),
        speedVignette: document.getElementById('speed-vignette')
      };

      this.soundBtn = document.getElementById('btn-sound-toggle');
      this.soundIconOn = document.getElementById('icon-sound-on');
      this.soundIconOff = document.getElementById('icon-sound-off');
      this.soundBtnText = this.soundBtn.querySelector('.btn-text');
      this.updateSoundButtonUI();

      this.vignetteDamage = document.getElementById('vignette-damage');
      this.screenFlash = document.getElementById('screen-flash');
    }

    updateSoundButtonUI() {
      if (audio.isMuted) {
        this.soundBtn.classList.add('muted');
        this.soundIconOn.classList.add('hidden');
        this.soundIconOff.classList.remove('hidden');
        this.soundBtnText.textContent = 'SOUND: OFF';
      } else {
        this.soundBtn.classList.remove('muted');
        this.soundIconOn.classList.remove('hidden');
        this.soundIconOff.classList.add('hidden');
        this.soundBtnText.textContent = 'SOUND: ON';
      }
    }

    updateHomeScores() {
      const bestScoreEl = document.getElementById('home-best-score');
      const bestDistEl = document.getElementById('home-best-distance');
      if (bestScoreEl) bestScoreEl.textContent = `${this.highScore.toLocaleString()} PTS`;
      if (bestDistEl) bestDistEl.textContent = `${(this.bestDistance / 1000).toFixed(2)} KM`;
    }

    /* Setup Event Listeners */
    initEvents() {
      window.addEventListener('resize', this.handleResize);

      // Sound button
      this.soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.init();
        const muted = audio.toggleMute();
        this.updateSoundButtonUI();
        if (!muted) audio.playUiBeep();
      });

      // Homepage buttons
      document.getElementById('btn-home-play').addEventListener('click', () => {
        audio.init();
        audio.playUiBeep();
        this.switchScreen(GameState.CAR_SELECT);
      });

      document.getElementById('btn-home-how').addEventListener('click', () => {
        audio.init();
        audio.playUiBeep();
        this.modals.instructions.classList.remove('hidden');
      });

      document.getElementById('btn-close-modal').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.instructions.classList.add('hidden');
      });

      document.getElementById('btn-modal-gotit').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.instructions.classList.add('hidden');
      });

      // Car selection buttons
      document.getElementById('btn-select-back').addEventListener('click', () => {
        audio.playUiBeep();
        this.switchScreen(GameState.HOME);
      });

      document.querySelectorAll('.car-card').forEach(card => {
        card.addEventListener('click', () => {
          audio.init();
          audio.playUiBeep();
          const carId = card.getAttribute('data-car');
          this.selectCar(carId);
        });
      });

      document.getElementById('btn-start-game').addEventListener('click', () => {
        audio.init();
        audio.playUiBeep();
        this.startGame();
      });

      // In-game buttons
      document.getElementById('btn-game-pause').addEventListener('click', () => {
        this.togglePause();
      });

      // Pause modal buttons
      document.getElementById('btn-pause-resume').addEventListener('click', () => {
        audio.playUiBeep();
        this.resumeGame();
      });

      document.getElementById('btn-pause-restart').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.pause.classList.add('hidden');
        this.startGame();
      });

      document.getElementById('btn-pause-quit').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.pause.classList.add('hidden');
        this.switchScreen(GameState.HOME);
      });

      // Game Over modal buttons
      document.getElementById('btn-go-restart').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.gameover.classList.add('hidden');
        this.startGame();
      });

      document.getElementById('btn-go-select').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.gameover.classList.add('hidden');
        this.switchScreen(GameState.CAR_SELECT);
      });

      document.getElementById('btn-go-menu').addEventListener('click', () => {
        audio.playUiBeep();
        this.modals.gameover.classList.add('hidden');
        this.switchScreen(GameState.HOME);
      });

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        audio.init();
        if (this.state === GameState.PLAYING) {
          if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            this.keys.left = true;
            this.shiftLane(-1);
          } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            this.keys.right = true;
            this.shiftLane(1);
          } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
            this.keys.up = true;
          } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            this.keys.down = true;
          } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            this.togglePause();
          }
        } else if (this.state === GameState.PAUSED && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
          this.resumeGame();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.keys.left = false;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.keys.right = false;
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          this.keys.up = false;
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          this.keys.down = false;
        }
      });

      // Mobile Touch Controls
      this.bindTouchButton('touch-left', () => this.shiftLane(-1));
      this.bindTouchButton('touch-right', () => this.shiftLane(1));

      this.bindTouchHold('touch-accel', 
        () => { this.keys.up = true; }, 
        () => { this.keys.up = false; }
      );
      this.bindTouchHold('touch-brake', 
        () => { this.keys.down = true; }, 
        () => { this.keys.down = false; }
      );
    }

    bindTouchButton(id, callback) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        audio.init();
        callback();
      }, { passive: false });
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        audio.init();
        callback();
      });
    }

    bindTouchHold(id, onDown, onUp) {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        audio.init();
        onDown();
      };
      const end = (e) => {
        e.preventDefault();
        onUp();
      };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end);
      el.addEventListener('touchcancel', end);
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    }

    selectCar(carId) {
      this.selectedCarId = carId;
      document.querySelectorAll('.car-card').forEach(card => {
        if (card.getAttribute('data-car') === carId) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
      const lbl = document.getElementById('selected-car-label');
      if (lbl) {
        lbl.textContent = CAR_PRESETS[carId].name;
      }
    }

    switchScreen(targetState) {
      this.state = targetState;
      Object.keys(this.screens).forEach(key => {
        this.screens[key].classList.remove('active');
      });

      if (targetState === GameState.HOME) {
        this.screens.home.classList.add('active');
        audio.stopEngine();
      } else if (targetState === GameState.CAR_SELECT) {
        this.screens.select.classList.add('active');
        audio.stopEngine();
      } else if (targetState === GameState.PLAYING) {
        this.screens.game.classList.add('active');
      }
    }

    handleResize() {
      // Dynamic high-DPI scaling
      const wrapper = document.getElementById('canvas-wrapper');
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      this.width = Math.min(rect.width, 700);
      this.height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);

      // Recalculate 3-lane geometry
      this.roadWidth = Math.min(this.width * 0.76, 380);
      this.laneWidth = this.roadWidth / this.laneCount;
      this.roadLeft = (this.width - this.roadWidth) / 2;
      this.laneCenters = [
        this.roadLeft + this.laneWidth * 0.5,
        this.roadLeft + this.laneWidth * 1.5,
        this.roadLeft + this.laneWidth * 2.5
      ];

      // Update player coordinates
      this.playerY = this.height - 150;
      this.playerX = this.laneCenters[this.playerLane];
    }

    /* Initialize roadside scenery (streetlights, palm trees, signs) */
    initScenery() {
      this.sideScenery = [];
      const count = 12;
      const step = this.height / (count / 2);

      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 'left' : 'right';
        const type = (i % 3 === 0) ? 'lamp' : (i % 3 === 1) ? 'tree' : 'sign';
        this.sideScenery.push({
          side,
          type,
          y: (i * step * 0.7) % this.height,
          height: (type === 'lamp' ? 45 : type === 'tree' ? 55 : 35),
          color: (type === 'sign' ? ['#ff0055', '#00e5ff', '#ffb700'][i % 3] : null)
        });
      }
    }

    /* ========================================================================
       5. GAMEPLAY LOOP & LOGIC
       ======================================================================== */
    startGame() {
      const preset = CAR_PRESETS[this.selectedCarId];
      this.playerLane = 1; // Start in middle lane
      this.playerX = this.laneCenters[1];
      this.playerY = this.height - 150;
      this.playerTilt = 0;
      this.currentSpeedKm = 100;
      this.minSpeedKm = 50;
      this.health = 100;
      this.score = 0;
      this.distanceMeters = 0;
      this.elapsedTime = 0;
      this.maxSpeedReached = 100;
      this.nearMissCount = 0;
      this.invulnerableTimer = 0;
      this.shakeTimer = 0;
      this.vignetteTimer = 0;
      this.laneCooldown = 0;

      this.traffic = [];
      this.obstacles = [];
      this.particles = [];
      this.popups = [];
      this.trafficSpawnTimer = 0.5; // Quick initial spawn
      this.obstacleSpawnTimer = 2.5;

      this.switchScreen(GameState.PLAYING);
      this.updateHud();

      audio.startEngine();
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.gameLoop);
    }

    togglePause() {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
        audio.stopEngine();
        document.getElementById('pause-score').textContent = Math.floor(this.score).toLocaleString();
        document.getElementById('pause-distance').textContent = `${(this.distanceMeters / 1000).toFixed(2)} km`;
        this.modals.pause.classList.remove('hidden');
      }
    }

    resumeGame() {
      if (this.state === GameState.PAUSED) {
        this.state = GameState.PLAYING;
        this.modals.pause.classList.add('hidden');
        audio.startEngine();
        this.lastTimestamp = performance.now();
        requestAnimationFrame(this.gameLoop);
      }
    }

    triggerGameOver() {
      if (this.state === GameState.GAMEOVER) return;
      this.state = GameState.GAMEOVER;
      audio.stopEngine();
      audio.playGameOver();

      // Screen flash
      this.screenFlash.classList.add('active');
      setTimeout(() => this.screenFlash.classList.remove('active'), 200);

      // Update High Scores
      const isNewRecord = this.score > this.highScore;
      if (isNewRecord) {
        this.highScore = Math.floor(this.score);
        localStorage.setItem('highway_rush_best_score', this.highScore);
      }
      if (this.distanceMeters > this.bestDistance) {
        this.bestDistance = this.distanceMeters;
        localStorage.setItem('highway_rush_best_dist', this.bestDistance);
      }
      this.updateHomeScores();

      // Fill Game Over Modal
      document.getElementById('go-score').textContent = Math.floor(this.score).toLocaleString();
      document.getElementById('go-distance').textContent = `${(this.distanceMeters / 1000).toFixed(2)} KM`;
      document.getElementById('go-topspeed').textContent = `${Math.floor(this.maxSpeedReached)} KM/H`;
      document.getElementById('go-nearmiss').textContent = this.nearMissCount;
      document.getElementById('go-car-name').textContent = CAR_PRESETS[this.selectedCarId].name;

      const recordBadge = document.getElementById('go-new-record');
      if (isNewRecord && this.score > 200) {
        recordBadge.classList.remove('hidden');
      } else {
        recordBadge.classList.add('hidden');
      }

      setTimeout(() => {
        this.modals.gameover.classList.remove('hidden');
      }, 400);
    }

    shiftLane(direction) {
      if (this.laneCooldown > 0) return;
      const targetLane = this.playerLane + direction;
      // Strict constraint: Exactly 3 lanes (0, 1, 2)
      if (targetLane >= 0 && targetLane < this.laneCount) {
        this.playerLane = targetLane;
        this.laneCooldown = 0.18; // smooth debounce
        this.playerTilt = direction * 0.18; // momentary tilt effect
        audio.playBrake();
      }
    }

    /* Main Game Loop */
    gameLoop(timestamp) {
      if (this.state !== GameState.PLAYING) return;

      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(this.gameLoop);
    }

    /* Update State & Physics */
    update(dt) {
      const preset = CAR_PRESETS[this.selectedCarId];
      this.elapsedTime += dt;

      // Handle Acceleration & Braking
      if (this.keys.up) {
        this.currentSpeedKm += preset.accelRate * dt;
        if (this.currentSpeedKm > preset.topSpeedKm) {
          this.currentSpeedKm = preset.topSpeedKm;
        }
      } else if (this.keys.down) {
        this.currentSpeedKm -= preset.brakeRate * dt;
        if (this.currentSpeedKm < this.minSpeedKm) {
          this.currentSpeedKm = this.minSpeedKm;
        }
      } else {
        // Natural gentle coasting towards cruising speed (~110 km/h)
        const cruiseSpeed = 110;
        if (this.currentSpeedKm > cruiseSpeed) {
          this.currentSpeedKm -= 15 * dt;
        } else if (this.currentSpeedKm < cruiseSpeed) {
          this.currentSpeedKm += 10 * dt;
        }
      }

      if (this.currentSpeedKm > this.maxSpeedReached) {
        this.maxSpeedReached = this.currentSpeedKm;
      }

      // Convert Speed (km/h) to Canvas pixel scroll velocity
      // 100 km/h ≈ 500 px/sec
      const scrollSpeedPx = (this.currentSpeedKm / 100) * 520;
      this.roadScrollY = (this.roadScrollY + scrollSpeedPx * dt) % 100;

      // Distance and Score progression
      const metersPerSecond = (this.currentSpeedKm * 1000) / 3600;
      const distanceDelta = metersPerSecond * dt;
      this.distanceMeters += distanceDelta;

      // Score multiplier based on driving faster
      const speedMultiplier = 1 + (this.currentSpeedKm - this.minSpeedKm) / 100;
      this.score += distanceDelta * 0.8 * speedMultiplier;

      // Lane interpolation (Smooth Lerp)
      const targetX = this.laneCenters[this.playerLane];
      const dx = targetX - this.playerX;
      this.playerX += dx * preset.handlingRate * dt;

      // Restore tilt towards 0
      this.playerTilt += (0 - this.playerTilt) * 10 * dt;

      // Lane cooldown timer
      if (this.laneCooldown > 0) {
        this.laneCooldown -= dt;
      }

      // Invulnerability timer
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= dt;
      }

      // Screen shake and damage vignette timers
      if (this.shakeTimer > 0) {
        this.shakeTimer -= dt;
        if (this.shakeTimer <= 0) {
          this.canvas.classList.remove('shake');
        }
      }
      if (this.vignetteTimer > 0) {
        this.vignetteTimer -= dt;
        if (this.vignetteTimer <= 0) {
          this.vignetteDamage.classList.remove('active');
        }
      }

      // Audio update
      const speedRatio = (this.currentSpeedKm - this.minSpeedKm) / (preset.topSpeedKm - this.minSpeedKm);
      audio.updateEnginePitch(speedRatio, this.keys.up);

      // Scenery motion
      this.sideScenery.forEach(item => {
        item.y += scrollSpeedPx * dt * 0.95;
        if (item.y > this.height + 40) {
          item.y = -60;
        }
      });

      // Spawn Nitro / Exhaust particles when speeding
      if (this.keys.up || this.currentSpeedKm > 140) {
        this.spawnExhaustParticle();
      }

      // Traffic Management
      this.updateTraffic(dt, scrollSpeedPx);

      // Obstacle Management
      this.updateObstacles(dt, scrollSpeedPx);

      // Particles Management
      this.updateParticles(dt);

      // HUD & Visuals
      this.updateHud();
    }

    /* Spawn exhaust fire/smoke particles behind player car */
    spawnExhaustParticle() {
      const p = CAR_PRESETS[this.selectedCarId];
      const w = p.width * 0.5;
      const h = p.height * 0.5;
      
      this.particles.push({
        x: this.playerX - 10 + (Math.random() * 4 - 2),
        y: this.playerY + h + 2,
        vx: (Math.random() - 0.5) * 20,
        vy: 120 + Math.random() * 80,
        size: 3 + Math.random() * 3,
        color: this.keys.up ? '#00f0ff' : '#ff7700',
        alpha: 0.9,
        life: 0.25
      });

      this.particles.push({
        x: this.playerX + 10 + (Math.random() * 4 - 2),
        y: this.playerY + h + 2,
        vx: (Math.random() - 0.5) * 20,
        vy: 120 + Math.random() * 80,
        size: 3 + Math.random() * 3,
        color: this.keys.up ? '#00f0ff' : '#ff7700',
        alpha: 0.9,
        life: 0.25
      });
    }

    /* Traffic Spawn and Update */
    updateTraffic(dt, scrollSpeedPx) {
      // Dynamic difficulty: Traffic density scales with distance & time
      const difficulty = Math.min(this.elapsedTime / 90, 1.0);
      const spawnInterval = 2.4 - difficulty * 1.1; // 2.4s down to 1.3s

      this.trafficSpawnTimer -= dt;
      if (this.trafficSpawnTimer <= 0) {
        this.spawnTrafficVehicle();
        this.trafficSpawnTimer = spawnInterval + Math.random() * 0.6;
      }

      // Update AI vehicles
      const playerPreset = CAR_PRESETS[this.selectedCarId];
      const playerBox = {
        left: this.playerX - playerPreset.width * 0.44,
        right: this.playerX + playerPreset.width * 0.44,
        top: this.playerY - playerPreset.height * 0.45,
        bottom: this.playerY + playerPreset.height * 0.45
      };

      for (let i = this.traffic.length - 1; i >= 0; i--) {
        const car = this.traffic[i];

        // AI vehicle speed in px/sec relative to player's scroll speed
        // player scrollSpeedPx = player speed
        // aiSpeedPx = AI's speed
        const aiSpeedPx = (car.speedKm / 100) * 520;
        const relativeYVelocity = scrollSpeedPx - aiSpeedPx;

        car.y += relativeYVelocity * dt;

        // Bounding box for collision
        const carBox = {
          left: car.x - car.width * 0.45,
          right: car.x + car.width * 0.45,
          top: car.y - car.height * 0.45,
          bottom: car.y + car.height * 0.45
        };

        // Collision Check with Player
        if (this.invulnerableTimer <= 0 && this.checkAABB(playerBox, carBox)) {
          this.handleCollision('traffic', 25, car.x, car.y);
          // Bounce car slightly away
          car.y -= 40;
        }

        // Near-Miss Reward: Passed within 30px lateral clearance without hitting
        if (!car.nearMissAwarded && car.y > this.playerY && car.y < this.playerY + 50) {
          const lateralDistance = Math.abs(this.playerX - car.x);
          if (lateralDistance > playerPreset.width * 0.8 && lateralDistance < playerPreset.width * 1.7) {
            car.nearMissAwarded = true;
            this.nearMissCount++;
            this.score += 150;
            audio.playNearMiss();
            this.showHudPopup('NEAR MISS! +150', 'near-miss');
          }
        }

        // Remove out-of-screen traffic
        if (car.y > this.height + 150 || car.y < -350) {
          this.traffic.splice(i, 1);
        }
      }
    }

    /* Spawn a fair traffic vehicle */
    spawnTrafficVehicle() {
      // Pick a random lane (0, 1, or 2)
      // FAIRNESS RULE: Check if other lanes currently have cars near the top
      // Never block all 3 lanes simultaneously!
      const availableLanes = [0, 1, 2].filter(laneIndex => {
        const laneX = this.laneCenters[laneIndex];
        // Ensure no car is already present in this lane within 180px of spawn zone
        const carInSpawnZone = this.traffic.some(c => c.lane === laneIndex && c.y < 50 && c.y > -220);
        return !carInSpawnZone;
      });

      if (availableLanes.length === 0) return; // Keep road navigable

      // If 2 lanes already have cars within the upcoming 150px, leave 1 lane clear!
      const crowdedLanes = [0, 1, 2].filter(l => 
        this.traffic.some(c => c.lane === l && c.y < 80 && c.y > -150)
      );
      if (crowdedLanes.length >= 2) {
        // Find the safe open lane and do NOT spawn in it
        const openLane = [0, 1, 2].find(l => !crowdedLanes.includes(l));
        const filteredLanes = availableLanes.filter(l => l !== openLane);
        if (filteredLanes.length === 0) return;
      }

      const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

      // Vehicle Types: sedan, taxi, bus, truck, sports, police
      const types = ['sedan', 'taxi', 'bus', 'truck', 'sports', 'police'];
      const weights = [0.35, 0.20, 0.15, 0.12, 0.10, 0.08];
      let r = Math.random();
      let chosenType = 'sedan';
      for (let i = 0; i < types.length; i++) {
        if (r < weights[i]) {
          chosenType = types[i];
          break;
        }
        r -= weights[i];
      }

      let speedKm = 75 + Math.random() * 25; // standard traffic: 75-100 km/h
      let width = 46;
      let height = 90;
      let color = '#ffffff';

      switch (chosenType) {
        case 'sedan':
          color = ['#e2e8f0', '#3b82f6', '#64748b', '#8b5cf6'][Math.floor(Math.random() * 4)];
          speedKm = 80 + Math.random() * 20;
          break;
        case 'taxi':
          color = '#eab308';
          speedKm = 85 + Math.random() * 15;
          break;
        case 'bus':
          color = '#f97316';
          width = 50;
          height = 145; // long vehicle
          speedKm = 65 + Math.random() * 15;
          break;
        case 'truck':
          color = '#10b981';
          width = 52;
          height = 160; // semi cargo truck
          speedKm = 60 + Math.random() * 15;
          break;
        case 'sports':
          color = '#a855f7';
          speedKm = 105 + Math.random() * 20; // fast traffic!
          break;
        case 'police':
          color = '#000000';
          speedKm = 90 + Math.random() * 25;
          break;
      }

      this.traffic.push({
        type: chosenType,
        lane,
        x: this.laneCenters[lane],
        y: -height - 20,
        width,
        height,
        color,
        speedKm,
        nearMissAwarded: false,
        strobeTimer: 0
      });
    }

    /* Obstacle Management (Speed Breakers, Crossing Pedestrians, Animals) */
    updateObstacles(dt, scrollSpeedPx) {
      const obstacleInterval = 5.0 + Math.random() * 3.5;
      this.obstacleSpawnTimer -= dt;
      if (this.obstacleSpawnTimer <= 0) {
        this.spawnObstacle();
        this.obstacleSpawnTimer = obstacleInterval;
      }

      const playerPreset = CAR_PRESETS[this.selectedCarId];
      const playerBox = {
        left: this.playerX - playerPreset.width * 0.44,
        right: this.playerX + playerPreset.width * 0.44,
        top: this.playerY - playerPreset.height * 0.45,
        bottom: this.playerY + playerPreset.height * 0.45
      };

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];

        // Move down with the road
        obs.y += scrollSpeedPx * dt;

        // Crossing movement for pedestrians and animals
        if (obs.type === 'pedestrian' || obs.type === 'animal') {
          obs.x += obs.vx * dt;
          obs.animStep = (obs.animStep + dt * 10) % 4;

          // Reverse direction if hitting highway edge
          if (obs.x < this.roadLeft + 15 || obs.x > this.roadLeft + this.roadWidth - 15) {
            obs.vx *= -1;
          }
        }

        // Bounding box
        const obsBox = {
          left: obs.x - obs.width * 0.5,
          right: obs.x + obs.width * 0.5,
          top: obs.y - obs.height * 0.5,
          bottom: obs.y + obs.height * 0.5
        };

        // Collision Check
        if (this.invulnerableTimer <= 0 && this.checkAABB(playerBox, obsBox)) {
          if (obs.type === 'breaker') {
            this.handleCollision('breaker', 10, obs.x, obs.y);
            // Breaker slows car down
            this.currentSpeedKm = Math.max(this.minSpeedKm, this.currentSpeedKm - 35);
            audio.playRumble();
          } else if (obs.type === 'pedestrian') {
            this.handleCollision('pedestrian', 20, obs.x, obs.y);
          } else if (obs.type === 'animal') {
            this.handleCollision('animal', 15, obs.x, obs.y);
          }
          // Remove hit moving obstacle to prevent repeated instant triggers
          if (obs.type !== 'breaker') {
            this.obstacles.splice(i, 1);
            continue;
          }
        }

        // Remove out-of-screen obstacles
        if (obs.y > this.height + 100) {
          this.obstacles.splice(i, 1);
        }
      }
    }

    /* Spawn Road Obstacles */
    spawnObstacle() {
      // Pick random obstacle type: breaker, pedestrian, animal
      const types = ['breaker', 'pedestrian', 'animal'];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const lane = Math.floor(Math.random() * this.laneCount);

      if (chosen === 'breaker') {
        // Speed breaker sits across a single lane
        this.obstacles.push({
          type: 'breaker',
          lane,
          x: this.laneCenters[lane],
          y: -40,
          width: this.laneWidth * 0.88,
          height: 18
        });
      } else if (chosen === 'pedestrian') {
        // Pedestrian crosses across the lanes
        const startFromLeft = Math.random() > 0.5;
        this.obstacles.push({
          type: 'pedestrian',
          x: startFromLeft ? this.roadLeft + 20 : this.roadLeft + this.roadWidth - 20,
          y: -40,
          vx: (startFromLeft ? 1 : -1) * (45 + Math.random() * 25),
          width: 22,
          height: 22,
          animStep: 0,
          jacketColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)]
        });
      } else {
        // Crossing animal (Cow or Dog)
        const isCow = Math.random() > 0.4;
        const startFromLeft = Math.random() > 0.5;
        this.obstacles.push({
          type: 'animal',
          subtype: isCow ? 'cow' : 'dog',
          x: startFromLeft ? this.roadLeft + 25 : this.roadLeft + this.roadWidth - 25,
          y: -40,
          vx: (startFromLeft ? 1 : -1) * (isCow ? 35 : 60),
          width: isCow ? 42 : 28,
          height: isCow ? 26 : 20,
          animStep: 0
        });
      }
    }

    /* Handle Collisions with Damage and Cooldown */
    handleCollision(type, baseDamage, hitX, hitY) {
      const preset = CAR_PRESETS[this.selectedCarId];
      // Adjusted damage based on car durability
      const actualDamage = Math.round(baseDamage * preset.durabilityMult);

      this.health -= actualDamage;
      if (this.health < 0) this.health = 0;

      // Invulnerability cooldown (~1.2 seconds)
      this.invulnerableTimer = 1.2;

      // Screen shake and damage red vignette
      this.shakeTimer = 0.35;
      this.vignetteTimer = 0.35;
      this.canvas.classList.add('shake');
      this.vignetteDamage.classList.add('active');

      // Audio crash
      audio.playCrash();

      // Spawn collision impact sparks and smoke
      this.spawnCrashParticles(hitX, hitY);

      // Show damage popup
      this.showHudPopup(`-${actualDamage} HP!`, 'damage');

      // Check for Game Over condition
      if (this.health <= 0) {
        this.triggerGameOver();
      }
    }

    /* Crash sparks & debris */
    spawnCrashParticles(x, y) {
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 70 + Math.random() * 150;
        this.particles.push({
          x: x || this.playerX,
          y: y || this.playerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          color: Math.random() > 0.5 ? '#ff1e56' : '#ffd000',
          alpha: 1,
          life: 0.45
        });
      }
    }

    updateParticles(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life / 0.45);

        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }

    /* HUD Popups for Near Misses and Damage */
    showHudPopup(text, type) {
      const popup = document.createElement('div');
      popup.className = `hud-popup ${type}`;
      popup.textContent = text;
      this.hud.popups.appendChild(popup);

      setTimeout(() => {
        if (popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
      }, 1000);
    }

    /* Axis-Aligned Bounding Box Collision Check */
    checkAABB(a, b) {
      return (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
      );
    }

    /* Update In-Game Dashboard HUD */
    updateHud() {
      // Health
      this.hud.hpText.textContent = `${this.health}%`;
      this.hud.hpBar.style.width = `${this.health}%`;
      if (this.health > 50) {
        this.hud.hpBar.style.backgroundColor = 'var(--health-good)';
        this.hud.hpText.style.color = 'var(--health-good)';
      } else if (this.health > 25) {
        this.hud.hpBar.style.backgroundColor = 'var(--health-medium)';
        this.hud.hpText.style.color = 'var(--health-medium)';
      } else {
        this.hud.hpBar.style.backgroundColor = 'var(--health-low)';
        this.hud.hpText.style.color = 'var(--health-low)';
      }

      // Speed
      this.hud.speedVal.textContent = Math.floor(this.currentSpeedKm);
      const preset = CAR_PRESETS[this.selectedCarId];
      const speedPct = (this.currentSpeedKm / preset.topSpeedKm) * 100;
      this.hud.speedBar.style.width = `${speedPct}%`;

      // Speed Vignette Effect
      if (this.currentSpeedKm > 175) {
        const opacity = (this.currentSpeedKm - 175) / (preset.topSpeedKm - 175);
        this.hud.speedVignette.style.opacity = Math.min(opacity * 0.8, 0.85);
      } else {
        this.hud.speedVignette.style.opacity = 0;
      }

      // Score & Distance
      this.hud.scoreVal.textContent = Math.floor(this.score).toString().padStart(6, '0');
      this.hud.distVal.textContent = (this.distanceMeters / 1000).toFixed(2);
    }

    /* ========================================================================
       6. CANVAS RENDERING
       ======================================================================== */
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      // 1. Draw Roadside Scenery / Greenery & Ambient Horizon
      this.renderScenery(ctx);

      // 2. Draw Highway Asphalt & Lanes
      this.renderHighway(ctx);

      // 3. Draw Road Obstacles (Breakers, Crossers)
      this.renderObstacles(ctx);

      // 4. Draw Traffic Vehicles
      this.renderTraffic(ctx);

      // 5. Draw Player Vehicle
      this.renderPlayer(ctx);

      // 6. Draw Particles (Exhaust flames, Crash sparks)
      this.renderParticles(ctx);
    }

    renderScenery(ctx) {
      // Grass / Dirt road borders
      ctx.fillStyle = '#0a101d';
      ctx.fillRect(0, 0, this.roadLeft, this.height);
      ctx.fillRect(this.roadLeft + this.roadWidth, 0, this.width - (this.roadLeft + this.roadWidth), this.height);

      // Draw roadside props
      this.sideScenery.forEach(item => {
        const x = item.side === 'left' ? this.roadLeft - 24 : this.roadLeft + this.roadWidth + 24;
        
        if (item.type === 'lamp') {
          // Streetlight pole & glowing cone
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, item.y);
          ctx.lineTo(item.side === 'left' ? x + 12 : x - 12, item.y - 10);
          ctx.stroke();

          // Lamp head & glow
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.arc(item.side === 'left' ? x + 12 : x - 12, item.y - 10, 4, 0, Math.PI * 2);
          ctx.fill();

          // Soft light cone on the road
          const coneGrad = ctx.createRadialGradient(
            item.side === 'left' ? x + 12 : x - 12, item.y - 10, 2,
            item.side === 'left' ? x + 35 : x - 35, item.y + 10, 60
          );
          coneGrad.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
          coneGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.arc(item.side === 'left' ? x + 35 : x - 35, item.y + 10, 60, 0, Math.PI * 2);
          ctx.fill();

        } else if (item.type === 'tree') {
          // Roadside cyber palm / pine tree
          ctx.fillStyle = '#0f291e';
          ctx.beginPath();
          ctx.arc(x, item.y, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(x, item.y, 11, 0, Math.PI * 2);
          ctx.fill();

        } else if (item.type === 'sign') {
          // Neon billboard sign
          ctx.fillStyle = item.color || '#ff0055';
          ctx.shadowColor = item.color || '#ff0055';
          ctx.shadowBlur = 10;
          ctx.fillRect(x - 10, item.y - 6, 20, 12);
          ctx.shadowBlur = 0;
        }
      });
    }

    renderHighway(ctx) {
      const rl = this.roadLeft;
      const rw = this.roadWidth;

      // Dark asphalt body
      ctx.fillStyle = '#11141e';
      ctx.fillRect(rl, 0, rw, this.height);

      // Outer highway rumble curbs (Red & White alternating stripes)
      const curbWidth = 10;
      const stripeHeight = 25;
      const numStripes = Math.ceil(this.height / stripeHeight) + 2;

      for (let i = -1; i < numStripes; i++) {
        const y = i * stripeHeight + (this.roadScrollY % stripeHeight);
        const isRed = (i + Math.floor(this.roadScrollY / stripeHeight)) % 2 === 0;
        ctx.fillStyle = isRed ? '#ff1e56' : '#ffffff';

        // Left curb
        ctx.fillRect(rl - curbWidth, y, curbWidth, stripeHeight);
        // Right curb
        ctx.fillRect(rl + rw, y, curbWidth, stripeHeight);
      }

      // Outer solid white road shoulder lines
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rl + 2, 0, 3, this.height);
      ctx.fillRect(rl + rw - 5, 0, 3, this.height);

      // Dash lines separating the 3 LANES
      // Lane dividers at 1/3 and 2/3 of roadWidth
      const dashLength = 35;
      const dashGap = 35;
      const cycle = dashLength + dashGap;
      const dashCount = Math.ceil(this.height / cycle) + 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let laneIdx = 1; laneIdx < this.laneCount; laneIdx++) {
        const dividerX = rl + laneIdx * this.laneWidth;

        for (let i = -1; i < dashCount; i++) {
          const dashY = i * cycle + (this.roadScrollY % cycle);
          ctx.fillRect(dividerX - 2, dashY, 4, dashLength);
        }
      }
    }

    renderObstacles(ctx) {
      this.obstacles.forEach(obs => {
        if (obs.type === 'breaker') {
          // Speed breaker: Raised asphalt bump with bold diagonal black & yellow hazard stripes
          ctx.save();
          ctx.translate(obs.x - obs.width / 2, obs.y - obs.height / 2);

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(0, obs.height, obs.width, 4);

          // Yellow base
          ctx.fillStyle = '#ffd000';
          ctx.fillRect(0, 0, obs.width, obs.height);

          // Hazard diagonal stripes
          ctx.fillStyle = '#000000';
          for (let sx = -obs.height; sx < obs.width; sx += 14) {
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + 7, 0);
            ctx.lineTo(sx + 7 - 8, obs.height);
            ctx.lineTo(sx - 8, obs.height);
            ctx.closePath();
            ctx.fill();
          }

          // Top highlight
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(0, 0, obs.width, 2);

          ctx.restore();

        } else if (obs.type === 'pedestrian') {
          // Pedestrian walking across
          ctx.save();
          ctx.translate(obs.x, obs.y);
          
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.ellipse(0, 8, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Walking legs
          const legSwing = Math.sin(obs.animStep * Math.PI) * 5;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-4, 0, 3, 7 + legSwing);
          ctx.fillRect(1, 0, 3, 7 - legSwing);

          // Jacket torso
          ctx.fillStyle = obs.jacketColor;
          ctx.beginPath();
          ctx.arc(0, -2, 7, 0, Math.PI * 2);
          ctx.fill();

          // Head
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.arc(0, -9, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

        } else if (obs.type === 'animal') {
          // Animal crossing (Cow or Dog)
          ctx.save();
          ctx.translate(obs.x, obs.y);

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.ellipse(0, 6, obs.width * 0.45, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          if (obs.subtype === 'cow') {
            // Spotted white & black cow
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-obs.width * 0.45, -obs.height * 0.45, obs.width * 0.9, obs.height * 0.7);

            // Black spots
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(-5, -2, 6, 0, Math.PI * 2);
            ctx.arc(8, 2, 5, 0, Math.PI * 2);
            ctx.fill();

            // Head & horns
            ctx.fillStyle = '#f8fafc';
            const headX = obs.vx > 0 ? obs.width * 0.4 : -obs.width * 0.4;
            ctx.fillRect(headX - 5, -8, 10, 10);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(headX - 4, -12, 2, 4);
            ctx.fillRect(headX + 2, -12, 2, 4);

          } else {
            // Brown Dog
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-obs.width * 0.4, -obs.height * 0.35, obs.width * 0.8, obs.height * 0.7);

            // Head
            const headX = obs.vx > 0 ? obs.width * 0.35 : -obs.width * 0.35;
            ctx.beginPath();
            ctx.arc(headX, -2, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      });
    }

    renderTraffic(ctx) {
      this.traffic.forEach(car => {
        ctx.save();
        ctx.translate(car.x, car.y);

        // Ground Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 4, car.width * 0.52, car.height * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#111';
        ctx.fillRect(-car.width * 0.52, -car.height * 0.35, 6, 16);
        ctx.fillRect(car.width * 0.52 - 6, -car.height * 0.35, 6, 16);
        ctx.fillRect(-car.width * 0.52, car.height * 0.22, 6, 18);
        ctx.fillRect(car.width * 0.52 - 6, car.height * 0.22, 6, 18);

        // Car Body
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.roundRect(-car.width * 0.46, -car.height * 0.46, car.width * 0.92, car.height * 0.92, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Windshields & Roof
        ctx.fillStyle = '#0f172a';
        if (car.type === 'bus' || car.type === 'truck') {
          // Bus / Truck Cabin
          ctx.fillRect(-car.width * 0.4, -car.height * 0.42, car.width * 0.8, 20);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(-car.width * 0.38, -car.height * 0.1, car.width * 0.76, car.height * 0.5);
        } else {
          // Sedan / Taxi / Sports Windshields
          ctx.beginPath();
          ctx.roundRect(-car.width * 0.36, -car.height * 0.2, car.width * 0.72, car.height * 0.44, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(-car.width * 0.3, -car.height * 0.08, car.width * 0.6, car.height * 0.22);
        }

        // Taxi roof lamp
        if (car.type === 'taxi') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-8, -4, 16, 7);
          ctx.fillStyle = '#000000';
          ctx.font = '6px sans-serif';
          ctx.fillText('TAXI', -7, 2);
        }

        // Police flashing strobes
        if (car.type === 'police') {
          const isRed = Math.floor(Date.now() / 150) % 2 === 0;
          ctx.fillStyle = isRed ? '#ff1e56' : '#00f0ff';
          ctx.fillRect(-10, -4, 9, 6);
          ctx.fillStyle = isRed ? '#00f0ff' : '#ff1e56';
          ctx.fillRect(1, -4, 9, 6);
        }

        // Taillights
        ctx.fillStyle = '#ff1e56';
        ctx.fillRect(-car.width * 0.4, car.height * 0.43, 7, 3);
        ctx.fillRect(car.width * 0.4 - 7, car.height * 0.43, 7, 3);

        ctx.restore();
      });
    }

    renderPlayer(ctx) {
      // If invulnerable, flicker car visibility
      if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
        return;
      }

      const p = CAR_PRESETS[this.selectedCarId];
      const w = p.width;
      const h = p.height;
      const c = p.colorTheme;

      ctx.save();
      ctx.translate(this.playerX, this.playerY);
      ctx.rotate(this.playerTilt);

      // Underglow Neon Glow
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 18;

      // Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.ellipse(0, 6, w * 0.54, h * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wheels
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111';
      ctx.fillRect(-w * 0.52, -h * 0.35, 6, 18);
      ctx.fillRect(w * 0.52 - 6, -h * 0.35, 6, 18);
      ctx.fillRect(-w * 0.52, h * 0.22, 6, 20);
      ctx.fillRect(w * 0.52 - 6, h * 0.22, 6, 20);

      // Main Aerodynamic Body Shell
      ctx.fillStyle = c.primary;
      ctx.beginPath();
      ctx.roundRect(-w * 0.46, -h * 0.46, w * 0.92, h * 0.92, 10);
      ctx.fill();

      // Shading Gradient Overlay
      const bodyGrad = ctx.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
      bodyGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      bodyGrad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      bodyGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Distinct Details per Car Model
      if (this.selectedCarId === 'inferno') {
        // Twin white racing stripes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4, -h * 0.44, 3, h * 0.88);
        ctx.fillRect(1, -h * 0.44, 3, h * 0.88);
        // Rear spoiler
        ctx.fillStyle = '#111';
        ctx.fillRect(-w * 0.42, h * 0.42, w * 0.84, 5);
      } else if (this.selectedCarId === 'apex') {
        // Neon cyber lines
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.3, -h * 0.3);
        ctx.lineTo(0, -h * 0.42);
        ctx.lineTo(w * 0.3, -h * 0.3);
        ctx.stroke();
      } else {
        // Solar Thunder: Bold black racing stripes & hood scoop
        ctx.fillStyle = '#111111';
        ctx.fillRect(-6, -h * 0.44, 5, h * 0.88);
        ctx.fillRect(1, -h * 0.44, 5, h * 0.88);
        ctx.fillRect(-5, -h * 0.2, 10, 10);
      }

      // Windshield & Cockpit
      ctx.fillStyle = c.glass;
      ctx.beginPath();
      ctx.roundRect(-w * 0.34, -h * 0.18, w * 0.68, h * 0.4, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-w * 0.28, -h * 0.08, w * 0.56, h * 0.2);

      // Headlight Beams illuminating the road ahead!
      const lightGrad = ctx.createLinearGradient(0, -h * 0.45, 0, -h * 0.45 - 180);
      lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      lightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.moveTo(-w * 0.35, -h * 0.45);
      ctx.lineTo(-w * 0.7, -h * 0.45 - 180);
      ctx.lineTo(-w * 0.1, -h * 0.45 - 180);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.35, -h * 0.45);
      ctx.lineTo(w * 0.7, -h * 0.45 - 180);
      ctx.lineTo(w * 0.1, -h * 0.45 - 180);
      ctx.closePath();
      ctx.fill();

      // Taillights (glow red, brighten when braking)
      const isBraking = this.keys.down;
      ctx.fillStyle = isBraking ? '#ff0033' : '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = isBraking ? 18 : 6;
      ctx.fillRect(-w * 0.42, h * 0.43, 9, 4);
      ctx.fillRect(w * 0.42 - 9, h * 0.43, 9, 4);

      ctx.restore();
    }

    renderParticles(ctx) {
      this.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  /* ==========================================================================
     7. INITIALIZATION ON PAGE LOAD
     ========================================================================== */
  window.addEventListener('DOMContentLoaded', () => {
    populateVehicleDisplays();
    window.game = new HighwayRushGame();
  });

})();

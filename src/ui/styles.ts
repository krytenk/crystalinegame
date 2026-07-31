/** Inject base styles for the DOM shell around the canvas. */
export function injectStyles(): void {
  if (document.getElementById('crystalline-styles')) return;

  // Prefer local FontBundles drops; fall back to Google fonts for demos.
  if (!document.getElementById('crystalline-font-links')) {
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = 'anonymous';
    const g = document.createElement('link');
    g.id = 'crystalline-font-links';
    g.rel = 'stylesheet';
    g.href =
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Nunito:wght@500;600;700;800&display=swap';
    document.head.append(pre1, pre2, g);
  }

  const el = document.createElement('style');
  el.id = 'crystalline-styles';
  el.textContent = `
    /* Galactic Knights — wordmark / big titles (more legible, epic) */
    @font-face {
      font-family: "GalacticKnights";
      src: url("./fonts/GalacticKnights-Regular.woff") format("woff");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    /* Diamond Shape (FontBundles) — buttons, CTAs, gem-game punch */
    @font-face {
      font-family: "CrystallineDisplay";
      src: url("./fonts/display.woff2") format("woff2");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    /* Outline variant for optional logo stroke look */
    @font-face {
      font-family: "CrystallineDisplayOutline";
      src: url("./fonts/display-outline.woff2") format("woff2");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    /* Optional second FontBundles face for UI body — drop as body.woff2 */
    @font-face {
      font-family: "CrystallineBody";
      src: url("./fonts/body.woff2") format("woff2");
      font-weight: 500 800;
      font-style: normal;
      font-display: swap;
    }

    :root {
      color-scheme: dark;
      /*
       * STUDIO CASUAL palette — original crystal-mine IP.
       * Inspired by niche conventions (embossed CTAs, high-contrast board
       * chrome, soft meta polish) without cloning any title's look.
       */
      --bg: #0a0714;
      --panel: #1a1430;
      --panel-2: #241c42;
      --panel-edge: #5a3d9a;
      --panel-edge-hi: #c9a227;
      --text: #fff8ef;
      --muted: #c4b6d8;
      --accent: #5ec8ff;
      --accent-deep: #1a6fd4;
      --gold: #ffd24a;
      --gold-deep: #c47a08;
      --danger: #ff5a72;
      --ok: #4dde8a;
      --sim: #ff9a62;
      --btn-lip: 5px;
      --font-title: "GalacticKnights", "CrystallineDisplay", "Cinzel", serif;
      --font-display: "CrystallineDisplay", "GalacticKnights", "Cinzel", serif;
      --font-display-outline: "CrystallineDisplayOutline", "CrystallineDisplay", "Cinzel", serif;
      --font-body: "CrystallineBody", "Nunito", "Segoe UI", system-ui, sans-serif;
      font-family: var(--font-body);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0; height: 100%;
      background: #020308; color: var(--text);
      overflow: hidden;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #app {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(90, 50, 160, 0.35), transparent 55%),
        linear-gradient(180deg, rgba(8,4,18,0.25), rgba(6,4,14,0.82)),
        url("./bg/mine-cavern.jpg") center / cover no-repeat,
        #0a0714;
    }
    /*
     * Size policy: fill the viewport. Portrait phone aspect is kept, so on a
     * wide monitor the limiting factor is HEIGHT (the game grows as tall as
     * the window). No artificial 560/640px cap — that made demos feel tiny.
     */
    #game-root {
      position: relative;
      width: min(100vw, calc(100vh * 720 / 1280));
      height: min(100vh, calc(100vw * 1280 / 720));
      max-width: 100vw;
      max-height: 100vh;
      filter: drop-shadow(0 18px 50px rgba(0,0,0,0.65));
    }
    /* Desktop / portfolio demos: use almost the full window height */
    @media (min-width: 700px) {
      #game-root {
        width: min(100vw, calc(98vh * 720 / 1280));
        height: min(98vh, calc(100vw * 1280 / 720));
      }
    }
    @media (min-width: 1200px) {
      #game-root {
        width: min(100vw, calc(100vh * 720 / 1280));
        height: min(100vh, calc(100vw * 1280 / 720));
      }
    }
    #game-root canvas {
      width: 100%; height: 100%;
      display: block;
      border-radius: 0;
      box-shadow: none;
    }
    @media (min-width: 700px) {
      #game-root canvas {
        border-radius: 22px;
        box-shadow:
          0 0 0 4px rgba(201, 162, 39, 0.35),
          0 0 0 10px rgba(12, 8, 24, 0.9),
          0 24px 60px rgba(0,0,0,0.55);
      }
    }
    .overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: clamp(10px, 2.5vw, 22px);
      background:
        radial-gradient(ellipse at 50% 12%, rgba(120, 70, 200, 0.22), transparent 50%),
        linear-gradient(180deg, rgba(8,4,20,0.35) 0%, rgba(6,4,16,0.78) 100%);
      backdrop-filter: blur(6px);
      z-index: 10;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    .overlay.hidden { display: none; }
    .panel {
      width: min(100%, 460px);
      flex-shrink: 0;
      margin-top: auto;
      margin-bottom: auto;
      position: relative;
      background:
        linear-gradient(165deg, #2a2050 0%, #18122e 45%, #120e24 100%);
      border: 3px solid var(--panel-edge);
      border-radius: 26px;
      padding: 26px 20px 20px;
      box-shadow:
        0 0 0 2px rgba(201, 162, 39, 0.45),
        0 18px 0 rgba(8, 4, 18, 0.85),
        0 28px 50px rgba(0,0,0,0.55),
        inset 0 2px 0 rgba(255,255,255,0.12),
        inset 0 -3px 12px rgba(0,0,0,0.35);
    }
    .panel::before {
      content: "";
      position: absolute;
      inset: 6px;
      border-radius: 20px;
      border: 1px solid rgba(255, 210, 100, 0.12);
      pointer-events: none;
    }
    .panel.panel-cavern {
      margin-top: 0;
      margin-bottom: 24px;
      max-width: min(100%, 480px);
    }
    .panel.panel-title {
      text-align: center;
      padding-top: 32px;
      background:
        linear-gradient(165deg, rgba(50, 36, 90, 0.92), rgba(16, 12, 32, 0.96) 60%);
      border-color: rgba(201, 162, 39, 0.65);
    }
    .panel h1, .panel h2 {
      margin: 0 0 10px;
      font-weight: 800;
      letter-spacing: 0.02em;
      position: relative;
    }
    .panel h1 {
      font-family: var(--font-title);
      font-size: clamp(1.7rem, 5vw, 2.25rem);
      color: #fff6e8;
      text-shadow:
        0 2px 0 #3a2060,
        0 4px 0 #1a0c30,
        0 0 24px rgba(255, 200, 80, 0.35);
      letter-spacing: 0.04em;
    }
    .panel h2 {
      font-size: 1.15rem;
      color: var(--gold);
      font-family: var(--font-display);
      text-shadow: 0 2px 0 rgba(0,0,0,0.45);
    }
    .panel p {
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.4;
      font-size: 0.98rem;
      font-weight: 700;
    }
    .sim-badge {
      display: none; /* studio shell: research note moved to settings */
    }
    .sim-badge.sim-badge-show {
      display: inline-block;
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,230,200,0.7);
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,154,98,0.3);
      border-radius: 999px;
      padding: 3px 9px;
      margin-bottom: 10px;
    }
    .row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; justify-content: center; }
    /* 3D embossed CTAs — industry casual match-3 language */
    .btn {
      appearance: none; border: 0; cursor: pointer;
      border-radius: 999px;
      padding: 14px 22px;
      min-height: 52px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.02rem;
      letter-spacing: 0.04em;
      color: #fffdf8;
      text-shadow: 0 1px 0 rgba(0,0,0,0.25);
      background: linear-gradient(180deg, #7ad4ff 0%, #2f9aef 48%, #1a6fd4 100%);
      box-shadow:
        0 var(--btn-lip) 0 #0d4a8a,
        0 10px 20px rgba(30, 100, 220, 0.35),
        inset 0 2px 0 rgba(255,255,255,0.45),
        inset 0 -2px 4px rgba(0,0,0,0.15);
      transition: transform 0.08s ease, filter 0.12s ease, box-shadow 0.08s ease;
    }
    .btn:hover { filter: brightness(1.07); }
    .btn:active {
      transform: translateY(4px);
      box-shadow:
        0 1px 0 #0d4a8a,
        0 4px 10px rgba(30, 100, 220, 0.25),
        inset 0 2px 0 rgba(255,255,255,0.3);
    }
    .btn.secondary {
      color: #f5f0ff;
      background: linear-gradient(180deg, #4a3a72 0%, #2a2048 55%, #1a1430 100%);
      box-shadow:
        0 var(--btn-lip) 0 #0c0818,
        0 8px 16px rgba(0,0,0,0.35),
        inset 0 2px 0 rgba(255,255,255,0.12);
      border: 1px solid rgba(180, 150, 255, 0.2);
    }
    .btn.secondary:active { box-shadow: 0 1px 0 #0c0818, inset 0 2px 0 rgba(255,255,255,0.08); }
    .btn.danger {
      background: linear-gradient(180deg, #ff9aa8 0%, #ff4a62 50%, #c82038 100%);
      box-shadow:
        0 var(--btn-lip) 0 #7a1020,
        0 8px 16px rgba(200, 40, 60, 0.3),
        inset 0 2px 0 rgba(255,255,255,0.4);
    }
    .btn.gold {
      background: linear-gradient(180deg, #ffe56a 0%, #ffb820 45%, #e08810 100%);
      color: #3a2000;
      text-shadow: 0 1px 0 rgba(255,255,255,0.35);
      box-shadow:
        0 var(--btn-lip) 0 #8a5008,
        0 10px 22px rgba(240, 160, 20, 0.4),
        inset 0 2px 0 rgba(255,255,255,0.55);
      font-size: 1.18rem;
      padding: 16px 32px;
      letter-spacing: 0.06em;
    }
    .btn.gold:active { box-shadow: 0 1px 0 #8a5008, inset 0 2px 0 rgba(255,255,255,0.4); }
    .btn:disabled { opacity: 0.42; cursor: not-allowed; filter: grayscale(0.35); }
    .booster-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0 4px;
    }
    .booster-chip {
      appearance: none;
      border: 2px solid rgba(180, 140, 255, 0.28);
      border-radius: 18px;
      padding: 12px 12px 10px;
      text-align: left;
      cursor: pointer;
      color: var(--text);
      background:
        linear-gradient(165deg, rgba(60, 48, 100, 0.9), rgba(24, 18, 48, 0.95));
      font-family: var(--font-body);
      font-weight: 800;
      font-size: 0.88rem;
      box-shadow:
        0 4px 0 rgba(8,4,18,0.9),
        inset 0 1px 0 rgba(255,255,255,0.1);
      transition: border-color 0.12s, transform 0.08s, box-shadow 0.12s;
    }
    .booster-chip .meta {
      display: block;
      margin-top: 3px;
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 700;
    }
    .booster-chip.on {
      border-color: rgba(255, 210, 74, 0.85);
      background: linear-gradient(165deg, rgba(90, 70, 40, 0.95), rgba(40, 28, 16, 0.98));
      box-shadow:
        0 4px 0 #5a3808,
        0 0 16px rgba(255, 180, 40, 0.35),
        inset 0 1px 0 rgba(255,255,255,0.2);
    }
    .booster-chip:active:not(:disabled) { transform: translateY(2px); }
    .booster-chip:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 14px 0;
    }
    .stat {
      background: linear-gradient(180deg, rgba(40, 30, 70, 0.9), rgba(16, 12, 32, 0.95));
      border-radius: 16px;
      padding: 12px 12px 10px;
      border: 2px solid rgba(180, 140, 255, 0.2);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 0 rgba(0,0,0,0.35);
    }
    .stat .k {
      font-size: 0.66rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 800;
    }
    .stat .v {
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--gold);
      margin-top: 3px;
      text-shadow: 0 2px 0 rgba(0,0,0,0.4);
    }
    .map-board {
      position: relative;
      margin: 12px 0 8px;
      max-height: min(54vh, 460px);
      overflow: auto;
      border-radius: 20px;
      padding: 12px 8px 16px;
      background: #100c22;
      border: 2px solid rgba(201, 162, 39, 0.35);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 0 rgba(0,0,0,0.35);
    }
    .map-board-bg {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.55;
      pointer-events: none;
      border-radius: 18px;
    }
    .map-path {
      position: absolute;
      inset: 12px 8px 16px;
      width: calc(100% - 16px);
      height: calc(100% - 28px);
      pointer-events: none;
      z-index: 0;
      overflow: visible;
    }
    .map-path-line {
      fill: none;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .map-path-dim {
      stroke: rgba(140, 120, 180, 0.28);
      stroke-width: 1.6;
      stroke-dasharray: 3 2.5;
    }
    .map-path-progress {
      stroke: rgba(255, 200, 80, 0.75);
      stroke-width: 2.2;
      stroke-dasharray: 4 2;
      filter: drop-shadow(0 0 4px rgba(255, 180, 40, 0.55));
      animation: pathShimmer 2.4s linear infinite;
    }
    @keyframes pathShimmer {
      to { stroke-dashoffset: -24; }
    }
    .level-node.next-play {
      animation: nextPulse 1.4s ease-in-out infinite;
      border-color: #ffe06a !important;
      z-index: 2;
    }
    @keyframes nextPulse {
      0%, 100% {
        transform: scale(1.04);
        box-shadow:
          0 5px 0 #8a6010,
          0 0 0 3px rgba(255, 210, 74, 0.35),
          0 0 18px rgba(255, 180, 40, 0.35),
          inset 0 2px 0 rgba(255,255,255,0.35);
      }
      50% {
        transform: scale(1.12);
        box-shadow:
          0 5px 0 #8a6010,
          0 0 0 5px rgba(255, 210, 74, 0.55),
          0 0 28px rgba(255, 200, 60, 0.65),
          inset 0 2px 0 rgba(255,255,255,0.45);
      }
    }
    .map-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin: 0;
      padding: 4px;
    }
    .level-node.cleared {
      border-color: #c9a227;
      background:
        radial-gradient(circle at 32% 28%, rgba(255, 230, 140, 0.65), transparent 42%),
        linear-gradient(160deg, #6a4a20, #3a2810 55%, #241808);
    }
    .level-node {
      aspect-ratio: 1;
      border-radius: 50%;
      border: 3px solid #6a4a18;
      background:
        radial-gradient(circle at 32% 28%, rgba(255, 230, 140, 0.55), transparent 42%),
        radial-gradient(circle at 70% 75%, rgba(80, 40, 160, 0.5), transparent 50%),
        linear-gradient(160deg, #5a3a90, #2a1850 55%, #1a1038);
      color: #fff8ef;
      font-family: var(--font-display);
      font-weight: 800;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      font-size: 1.08rem;
      line-height: 1.05;
      padding: 4px;
      box-shadow:
        0 5px 0 #2a1808,
        0 8px 14px rgba(0,0,0,0.4),
        inset 0 2px 0 rgba(255,255,255,0.25),
        inset 0 -3px 6px rgba(0,0,0,0.25);
      text-shadow: 0 2px 0 rgba(0,0,0,0.45);
    }
    .level-node .level-stars {
      font-size: 0.62rem;
      color: var(--gold);
      letter-spacing: 0.02em;
      min-height: 0.85em;
      font-family: var(--font-body);
      filter: drop-shadow(0 1px 0 rgba(0,0,0,0.5));
    }
    .level-node.locked {
      opacity: 0.38;
      cursor: not-allowed;
      filter: grayscale(0.45);
      box-shadow: 0 4px 0 #1a1020, inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .level-node.current {
      border-color: #ffe06a;
      box-shadow:
        0 5px 0 #8a6010,
        0 0 0 3px rgba(255, 210, 74, 0.45),
        0 0 22px rgba(255, 180, 40, 0.45),
        inset 0 2px 0 rgba(255,255,255,0.35);
      transform: scale(1.06);
    }
    .level-node:active:not(.locked) { transform: translateY(3px) scale(0.98); }
    .sku {
      display: flex; justify-content: space-between; align-items: center;
      gap: 10px;
      padding: 12px 12px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(40, 30, 70, 0.9), rgba(16, 12, 32, 0.95));
      margin-bottom: 10px;
      border: 2px solid rgba(180, 140, 255, 0.18);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .sku .name { font-weight: 800; font-family: var(--font-display); letter-spacing: 0.02em; }
    .sku .blurb { font-size: 0.78rem; color: var(--muted); margin-top: 2px; font-weight: 600; }
    .tag {
      font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
      color: #2a1800; background: linear-gradient(180deg, #ffe56a, #f0b020);
      border-radius: 8px; padding: 3px 7px;
      margin-left: 6px;
      box-shadow: 0 2px 0 #8a5008;
    }
    .ad-modal .timer {
      font-family: var(--font-display);
      font-size: 1.6rem; font-weight: 800; color: var(--accent); margin: 10px 0 4px;
      text-shadow: 0 0 20px rgba(100,180,255,0.4);
    }
    .ad-panel {
      width: min(100%, 420px);
      max-height: 96%;
      overflow: auto;
    }
    .ad-sponsor {
      display: flex; flex-wrap: wrap; gap: 8px 12px;
      align-items: center; justify-content: center;
      margin: 0 0 10px;
      font-size: 0.78rem;
      color: var(--muted);
    }
    .ad-sponsor-label { font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .ad-channel-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 700;
    }
    .ad-channel-link:hover { text-decoration: underline; }
    .ad-player {
      position: relative;
      width: 100%;
      /* Shorts-friendly portrait frame */
      aspect-ratio: 9 / 14;
      max-height: min(52vh, 520px);
      margin: 0 auto 8px;
      border-radius: 14px;
      overflow: hidden;
      background: #000;
      border: 1px solid rgba(126, 208, 255, 0.25);
      box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04);
    }
    .ad-frame {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      border: 0;
      display: block;
      background: #000;
    }
    .ad-hint {
      font-size: 0.72rem;
      color: rgba(180,200,230,0.65);
      margin: 0 0 4px;
    }
    .ad-status {
      font-size: 0.85rem;
      color: rgba(210,225,255,0.85);
      margin: 0 0 10px;
      min-height: 1.3em;
    }
    #ad-skip:disabled, #ad-claim:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .hud-tip {
      font-size: 0.8rem;
      color: rgba(200,220,255,0.7);
      margin-top: 6px;
    }
    .panel .row { justify-content: center; }
    /* Pre-level hero */
    .level-banner {
      position: relative;
      display: flex; gap: 14px; align-items: center;
      margin: 4px 0 14px;
      padding: 0;
      min-height: 108px;
      border-radius: 18px;
      overflow: hidden;
      border: 2px solid rgba(255, 210, 74, 0.4);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
      background: #120c24;
    }
    .level-banner-art {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.85;
      pointer-events: none;
    }
    .level-banner-scrim {
      position: absolute; inset: 0;
      background: linear-gradient(90deg, rgba(12,8,28,0.88) 0%, rgba(12,8,28,0.55) 55%, rgba(12,8,28,0.35) 100%);
      pointer-events: none;
    }
    .level-banner-content {
      position: relative; z-index: 1;
      display: flex; gap: 14px; align-items: center;
      padding: 14px 12px;
      width: 100%;
    }
    .level-banner-num {
      width: 64px; height: 64px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.6rem;
      color: #2a1800;
      background: linear-gradient(180deg, #ffe56a, #f0b020 55%, #c88810);
      box-shadow: 0 4px 0 #8a5008, inset 0 2px 0 rgba(255,255,255,0.5);
      flex-shrink: 0;
    }
    .level-banner-name {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.15rem;
      color: #fff6e8;
      text-shadow: 0 2px 0 rgba(0,0,0,0.4);
    }
    .level-banner-meta {
      font-size: 0.82rem;
      color: var(--muted);
      font-weight: 700;
      margin-top: 2px;
    }
    .level-banner-stars {
      margin-top: 4px;
      color: var(--gold);
      font-size: 1rem;
      letter-spacing: 0.08em;
      text-shadow: 0 1px 0 rgba(0,0,0,0.5);
    }
    .goal-row {
      display: flex; flex-wrap: wrap; gap: 8px;
      margin: 0 0 12px;
    }
    .goal-chip {
      display: flex; flex-direction: column;
      min-width: 88px;
      padding: 10px 12px;
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(40, 30, 70, 0.95), rgba(16, 12, 32, 0.98));
      border: 2px solid rgba(94, 200, 255, 0.35);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35);
    }
    .goal-k {
      font-size: 0.62rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .goal-v {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.25rem;
      color: #5ec8ff;
      margin-top: 2px;
    }
    /* Results burst */
    .results-burst {
      position: relative;
      text-align: center;
      margin: 6px 0 16px;
      padding: 0;
      min-height: 150px;
      border-radius: 22px;
      overflow: hidden;
      border: 3px solid rgba(255, 210, 74, 0.55);
      box-shadow: 0 6px 0 rgba(80, 50, 10, 0.5);
      background: #120c24;
    }
    .results-burst.fail {
      border-color: rgba(180, 120, 255, 0.45);
    }
    .results-burst-art {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.88;
      pointer-events: none;
    }
    .results-burst-scrim {
      position: absolute; inset: 0;
      background:
        linear-gradient(180deg, rgba(12,8,28,0.25), rgba(12,8,28,0.82) 70%, rgba(8,4,18,0.92));
      pointer-events: none;
    }
    .results-burst-content {
      position: relative; z-index: 1;
      padding: 22px 12px 16px;
    }
    .results-burst-stars {
      font-size: 1.6rem;
      color: var(--gold);
      letter-spacing: 0.12em;
      text-shadow: 0 2px 0 rgba(0,0,0,0.45);
      margin-bottom: 6px;
    }
    .results-burst-score {
      font-family: var(--font-title);
      font-size: clamp(2rem, 8vw, 2.6rem);
      font-weight: 800;
      color: #fff6e8;
      text-shadow: 0 3px 0 #3a2060, 0 0 20px rgba(255, 200, 80, 0.35);
      line-height: 1.05;
    }
    .results-burst-label {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: var(--muted);
      margin-top: 4px;
    }
    /* ---- Crystal Cavern meta ---- */
    .essence-gain {
      color: #b8f0ff !important;
      font-weight: 800 !important;
      font-family: var(--font-display);
      text-shadow: 0 0 16px rgba(100, 200, 255, 0.45);
    }
    .cavern-vista {
      position: relative;
      border-radius: 16px;
      min-height: 168px;
      margin: 8px 0 14px;
      overflow: hidden;
      border: 1px solid rgba(126, 208, 255, 0.28);
      background: #080c18;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.45);
      padding: 14px 12px 12px;
    }
    .cavern-vista-bg {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.92;
      pointer-events: none;
    }
    .cavern-vista-scrim {
      position: absolute; inset: 0;
      background:
        linear-gradient(180deg, rgba(4,8,18,0.15), rgba(4,8,18,0.72) 70%, rgba(4,8,18,0.9)),
        radial-gradient(ellipse at 50% 80%, rgba(80, 160, 255, calc(var(--cavern-glow, 0.3))), transparent 60%);
      pointer-events: none;
    }
    .cavern-depth {
      position: relative; z-index: 1;
      display: flex; justify-content: space-between; align-items: center;
      gap: 8px; flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .cavern-label {
      font-family: var(--font-display);
      font-weight: 700;
      color: #c9ecff;
      font-size: 0.95rem;
    }
    .cavern-essence {
      font-weight: 800;
      color: #7ed0ff;
      font-size: 0.9rem;
    }
    .cavern-accents {
      position: relative; z-index: 1;
      display: flex; flex-wrap: wrap; gap: 8px;
      min-height: 44px;
    }
    .cavern-chip {
      display: inline-flex; align-items: center; justify-content: center;
      width: 48px; height: 48px;
      border-radius: 12px;
      background: rgba(0,0,0,0.45);
      border: 1px solid rgba(126, 208, 255, 0.4);
      overflow: hidden;
      box-shadow: 0 0 14px rgba(80, 160, 255, 0.3);
      padding: 0;
    }
    .cavern-chip-img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .cavern-stage-head {
      display: flex; gap: 12px; align-items: flex-start;
      margin-bottom: 6px;
    }
    .cavern-stage-thumb {
      width: 72px; height: 48px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid rgba(126, 208, 255, 0.25);
      flex-shrink: 0;
      background: #0a1020;
    }
    .cavern-stage {
      margin: 12px 0;
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .cavern-stage.locked { opacity: 0.55; }
    .cavern-stage.complete {
      border-color: rgba(92, 224, 160, 0.35);
      box-shadow: inset 0 0 20px rgba(60, 180, 120, 0.08);
    }
    .cavern-stage h2 {
      font-size: 1rem !important;
      margin-bottom: 4px !important;
    }
    .cavern-shop { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .cavern-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(0,0,0,0.28);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .cavern-item.owned {
      border-color: rgba(126, 208, 255, 0.3);
      background: rgba(40, 80, 120, 0.2);
    }
    .cavern-item-art {
      width: 56px; height: 56px;
      border-radius: 12px;
      overflow: hidden;
      flex-shrink: 0;
      background: rgba(20, 30, 50, 0.95);
      border: 1px solid rgba(126, 208, 255, 0.22);
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    }
    .cavern-item-img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    .cavern-item.owned .cavern-item-art {
      border-color: rgba(126, 208, 255, 0.55);
      box-shadow: 0 0 16px rgba(80, 180, 255, 0.35);
    }
    .cavern-item-body { flex: 1; min-width: 0; }
    .cavern-item-body .name {
      font-weight: 800;
      font-family: var(--font-display);
      font-size: 0.92rem;
    }
    .cavern-item-body .blurb {
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 2px;
    }
    .cavern-item-status {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #7ed0ff;
    }
    /* Placement ceremony overlay */
    .place-ceremony {
      position: absolute; inset: 0;
      z-index: 40;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-end;
      padding: 20px 16px 28px;
      background: rgba(2, 4, 12, 0.88);
      animation: placeFadeIn 0.25s ease-out;
    }
    @keyframes placeFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .place-ceremony-video {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.92;
    }
    .place-ceremony-prop {
      position: relative; z-index: 2;
      width: min(42%, 180px);
      height: auto;
      aspect-ratio: 1;
      object-fit: contain;
      margin-bottom: 18%;
      filter: drop-shadow(0 12px 28px rgba(80, 180, 255, 0.55));
      animation: placeDrop 1.35s cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    @keyframes placeDrop {
      0% { transform: translateY(-120%) scale(0.45); opacity: 0; }
      55% { opacity: 1; }
      70% { transform: translateY(6%) scale(1.08); }
      100% { transform: translateY(0) scale(1); }
    }
    .place-ceremony-caption {
      position: relative; z-index: 2;
      text-align: center;
      margin-bottom: 14px;
    }
    .place-ceremony-title {
      font-family: var(--font-title);
      font-size: 1.45rem;
      font-weight: 700;
      color: #c9ecff;
      text-shadow: 0 0 24px rgba(100, 200, 255, 0.5);
    }
    .place-ceremony-sub {
      font-size: 0.85rem;
      color: rgba(200, 220, 255, 0.8);
      margin-top: 4px;
      font-weight: 700;
    }
    .place-ceremony .btn {
      position: relative; z-index: 2;
    }
    /* Panel enter transition */
    .panel-enter {
      animation: panelIn 0.32s cubic-bezier(0.22, 1.15, 0.36, 1) both;
    }
    @keyframes panelIn {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    /* Boot splash */
    .boot-splash {
      text-align: center;
      padding: 24px;
      animation: panelIn 0.4s ease-out both;
    }
    .boot-logo {
      font-family: var(--font-title);
      font-size: clamp(2rem, 8vw, 2.6rem);
      font-weight: 800;
      color: #fff6e8;
      letter-spacing: 0.06em;
      text-shadow:
        0 3px 0 #3a2060,
        0 0 28px rgba(255, 200, 80, 0.45);
      margin-bottom: 12px;
    }
    .boot-sub {
      font-weight: 700;
      color: var(--muted);
      font-size: 0.95rem;
      margin-bottom: 22px;
    }
    .boot-bar {
      width: min(220px, 70vw);
      height: 10px;
      margin: 0 auto;
      border-radius: 999px;
      background: rgba(0,0,0,0.45);
      border: 2px solid rgba(201, 162, 39, 0.4);
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .boot-bar-fill {
      height: 100%;
      width: 35%;
      border-radius: 999px;
      background: linear-gradient(90deg, #5ec8ff, #ffd24a, #5ec8ff);
      background-size: 200% 100%;
      animation: bootLoad 1.1s ease-in-out infinite;
    }
    @keyframes bootLoad {
      0% { width: 18%; background-position: 0% 0; }
      50% { width: 78%; background-position: 100% 0; }
      100% { width: 28%; background-position: 0% 0; }
    }
    /* Win star pop */
    .star-pop {
      display: inline-block;
      font-size: 1.75rem;
      margin: 0 4px;
      color: rgba(255, 255, 255, 0.25);
      transform: scale(0.4);
      opacity: 0;
      animation: starPop 0.45s cubic-bezier(0.22, 1.4, 0.36, 1) forwards;
    }
    .star-pop.on {
      color: var(--gold);
      text-shadow: 0 2px 0 rgba(0,0,0,0.4), 0 0 12px rgba(255, 200, 60, 0.65);
    }
    @keyframes starPop {
      0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
      60% { transform: scale(1.25) rotate(8deg); opacity: 1; }
      100% { transform: scale(1) rotate(0); opacity: 1; }
    }
  `;
  document.head.appendChild(el);
}

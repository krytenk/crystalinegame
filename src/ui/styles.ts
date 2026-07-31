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
      padding-top: 28px;
      padding-bottom: 22px;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(255, 200, 80, 0.12), transparent 55%),
        linear-gradient(165deg, rgba(50, 36, 90, 0.94), rgba(16, 12, 32, 0.97) 60%);
      border-color: rgba(201, 162, 39, 0.7);
      box-shadow:
        0 0 0 2px rgba(201, 162, 39, 0.45),
        0 18px 0 rgba(8, 4, 18, 0.85),
        0 28px 50px rgba(0,0,0,0.55),
        0 0 40px rgba(120, 70, 200, 0.2),
        inset 0 2px 0 rgba(255,255,255,0.12);
    }
    .title-kicker {
      font-family: var(--font-display);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: var(--gold);
      margin-bottom: 4px;
      text-shadow: 0 1px 0 rgba(0,0,0,0.4);
    }
    .title-tagline {
      font-size: 1rem !important;
      color: #e8e0f8 !important;
      margin-bottom: 12px !important;
    }
    .title-features {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin: 0 0 12px;
    }
    .title-feat {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #c9ecff;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(0,0,0,0.35);
      border: 1.5px solid rgba(126, 208, 255, 0.35);
      box-shadow: 0 2px 0 rgba(0,0,0,0.3);
    }
    .title-progress {
      margin-bottom: 4px !important;
      color: rgba(255, 220, 140, 0.9) !important;
      font-weight: 700 !important;
    }
    .title-actions { margin-top: 12px; }
    .title-gems {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .title-gem {
      position: absolute;
      font-size: 1.1rem;
      opacity: 0.35;
      animation: titleGemFloat 4.5s ease-in-out infinite;
      filter: drop-shadow(0 0 8px rgba(126, 208, 255, 0.5));
    }
    .title-gem.g1 { left: 10%; top: 18%; color: #7ed0ff; animation-delay: 0s; }
    .title-gem.g2 { right: 12%; top: 22%; color: #ffd24a; animation-delay: 0.6s; }
    .title-gem.g3 { left: 16%; bottom: 22%; color: #e0c0ff; animation-delay: 1.2s; }
    .title-gem.g4 { right: 14%; bottom: 18%; color: #ff9ab0; animation-delay: 1.8s; }
    @keyframes titleGemFloat {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
      50% { transform: translateY(-10px) scale(1.15); opacity: 0.55; }
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
    /* Per-chapter map section with local path trail */
    .map-section {
      position: relative;
      z-index: 1;
      margin: 0 0 14px;
      padding: 10px 8px 12px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(20, 14, 40, 0.55), rgba(8, 6, 18, 0.35));
      border: 1px solid rgba(201, 162, 39, 0.22);
    }
    .map-section:last-child { margin-bottom: 2px; }
    .map-section.locked { opacity: 0.72; }
    .map-section.done {
      border-color: rgba(126, 208, 255, 0.35);
      box-shadow: inset 0 0 24px rgba(60, 140, 255, 0.08);
    }
    .map-section.depth-mid {
      border-color: rgba(140, 100, 220, 0.3);
    }
    .map-section.depth-deep {
      border-color: rgba(80, 160, 255, 0.32);
      background: linear-gradient(180deg, rgba(12, 24, 48, 0.55), rgba(6, 10, 22, 0.4));
    }
    .map-grid-wrap {
      position: relative;
      margin-top: 6px;
    }
    .map-path {
      position: absolute;
      inset: 4px 2px;
      width: calc(100% - 4px);
      height: calc(100% - 8px);
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
      stroke: rgba(140, 120, 180, 0.32);
      stroke-width: 1.8;
      stroke-dasharray: 3 2.5;
    }
    .map-path-progress {
      stroke: rgba(255, 200, 80, 0.88);
      stroke-width: 2.6;
      stroke-dasharray: 5 2.5;
      filter: drop-shadow(0 0 5px rgba(255, 180, 40, 0.65));
      animation: pathShimmer 2.2s linear infinite;
    }
    .map-path-dot {
      fill: rgba(255, 210, 100, 0.75);
      stroke: rgba(80, 40, 0, 0.35);
      stroke-width: 0.3;
    }
    .map-path-dot-tip {
      fill: #ffe56a;
      filter: drop-shadow(0 0 3px rgba(255, 200, 60, 0.9));
      animation: pathDotPulse 1.2s ease-in-out infinite;
    }
    @keyframes pathShimmer {
      to { stroke-dashoffset: -28; }
    }
    @keyframes pathDotPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    .level-node.next-play {
      animation: nextPulse 1.4s ease-in-out infinite;
      border-color: #ffe06a !important;
      z-index: 2;
      position: relative;
    }
    .level-you {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.48rem;
      font-weight: 900;
      letter-spacing: 0.1em;
      color: #2a1800;
      background: linear-gradient(180deg, #ffe56a, #f0b020);
      padding: 2px 5px;
      border-radius: 6px;
      box-shadow: 0 2px 0 #8a5008;
      line-height: 1.1;
      white-space: nowrap;
      pointer-events: none;
      z-index: 3;
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
    .map-chapter {
      position: relative;
      z-index: 1;
      padding: 2px 4px 6px;
    }
    .map-chapter-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gold);
      text-shadow: 0 2px 0 rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .map-chapter-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px; height: 18px;
      border-radius: 50%;
      font-size: 0.65rem;
      color: #0a1830;
      background: linear-gradient(180deg, #7ed0ff, #3a9ae0);
      box-shadow: 0 2px 0 #1a4060;
    }
    .map-chapter-meta {
      font-size: 0.68rem;
      font-weight: 700;
      color: rgba(200, 220, 255, 0.7);
      margin-top: 3px;
      letter-spacing: 0.02em;
    }
    .map-chapter-track {
      margin-top: 6px;
      height: 6px;
      border-radius: 999px;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(201, 162, 39, 0.3);
      overflow: hidden;
    }
    .map-chapter-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #c9a227, #ffe56a);
      box-shadow: 0 0 8px rgba(255, 200, 60, 0.45);
      transition: width 0.4s ease;
      min-width: 0;
    }
    .level-node.cleared {
      border-color: #c9a227;
      background:
        radial-gradient(circle at 32% 28%, rgba(255, 230, 140, 0.65), transparent 42%),
        linear-gradient(160deg, #6a4a20, #3a2810 55%, #241808);
    }
    .level-node {
      position: relative;
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
    .sku.tagged-bestValue {
      border-color: rgba(255, 210, 74, 0.55);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35), 0 0 16px rgba(255, 180, 40, 0.2);
    }
    .sku.tagged-mostPopular {
      border-color: rgba(126, 208, 255, 0.5);
    }
    .sku.tagged-limited {
      border-color: rgba(255, 120, 160, 0.5);
      background: linear-gradient(180deg, rgba(70, 30, 60, 0.95), rgba(20, 10, 28, 0.98));
    }
    .sku.broke { opacity: 0.72; }
    .sku-glyph {
      width: 48px; height: 48px; flex-shrink: 0;
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem;
      background: linear-gradient(160deg, rgba(80, 50, 140, 0.7), rgba(20, 12, 40, 0.95));
      border: 2px solid rgba(201, 162, 39, 0.35);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
    }
    .sku-body { flex: 1; min-width: 0; }
    .sku .name {
      font-weight: 800; font-family: var(--font-display); letter-spacing: 0.02em;
      display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    }
    .sku .blurb { font-size: 0.78rem; color: var(--muted); margin-top: 2px; font-weight: 600; }
    .sku-grants {
      font-size: 0.72rem;
      font-weight: 800;
      color: #7ed0ff;
      margin-top: 4px;
      letter-spacing: 0.02em;
    }
    .sku .btn { flex-shrink: 0; min-width: 88px; }
    .tag, .tag-bestValue, .tag-mostPopular, .tag-limited {
      font-size: 0.58rem; font-weight: 800; text-transform: uppercase;
      color: #2a1800; background: linear-gradient(180deg, #ffe56a, #f0b020);
      border-radius: 8px; padding: 3px 7px;
      letter-spacing: 0.04em;
      box-shadow: 0 2px 0 #8a5008;
      white-space: nowrap;
    }
    .tag-mostPopular {
      background: linear-gradient(180deg, #7ed0ff, #3a9ae0);
      color: #0a1830;
      box-shadow: 0 2px 0 #1a4060;
    }
    .tag-limited {
      background: linear-gradient(180deg, #ff9ab0, #e04070);
      color: #2a0810;
      box-shadow: 0 2px 0 #7a1020;
    }
    .shop-wallet {
      display: flex; gap: 10px; margin: 4px 0 12px;
    }
    .shop-wallet-chip {
      flex: 1;
      padding: 12px 12px;
      border-radius: 16px;
      text-align: center;
      border: 2px solid rgba(201, 162, 39, 0.35);
      background: linear-gradient(180deg, rgba(40, 30, 70, 0.9), rgba(12, 8, 28, 0.95));
      box-shadow: 0 3px 0 rgba(0,0,0,0.35);
    }
    .shop-wallet-chip.shards {
      border-color: rgba(126, 208, 255, 0.4);
    }
    .shop-wallet-k {
      display: block;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 2px;
    }
    .shop-wallet-v {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.2rem;
      color: var(--gold);
    }
    .shop-wallet-chip.shards .shop-wallet-v { color: #7ed0ff; }
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
    .level-banner-chapter {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 2px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
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
    .level-banner.depth-mid {
      border-color: rgba(180, 140, 255, 0.45);
    }
    .level-banner.depth-deep {
      border-color: rgba(94, 200, 255, 0.5);
    }
    .goal-banner.soft {
      font-size: 0.82rem;
      padding: 8px 12px;
      border-width: 1.5px;
      box-shadow: 0 2px 0 rgba(0,0,0,0.25);
    }
    .hud-tip.star-nudge {
      color: rgba(255, 220, 140, 0.85);
      font-weight: 700;
      margin-bottom: 8px;
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
      min-height: 220px;
      height: clamp(200px, 38vw, 260px);
      margin: 8px 0 14px;
      overflow: hidden;
      border: 2px solid rgba(126, 208, 255, 0.32);
      background: #080c18;
      box-shadow:
        inset 0 0 40px rgba(0,0,0,0.45),
        0 0 24px rgba(60, 140, 255, calc(var(--cavern-glow, 0.3) * 0.55));
      padding: 0;
    }
    .cavern-vista-bg {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.95;
      pointer-events: none;
    }
    .cavern-vista-scrim {
      position: absolute; inset: 0;
      z-index: 1;
      background:
        linear-gradient(180deg, rgba(4,8,18,0.05), transparent 35%, rgba(4,8,18,0.55) 70%, rgba(4,8,18,0.92)),
        radial-gradient(ellipse at 50% 80%, rgba(80, 160, 255, calc(var(--cavern-glow, 0.3))), transparent 60%);
      pointer-events: none;
    }
    /* Live-furnished props on the stage vista */
    .cavern-props {
      position: absolute; inset: 0;
      z-index: 2;
      pointer-events: none;
    }
    .cavern-prop {
      position: absolute;
      width: clamp(52px, 16%, 78px);
      aspect-ratio: 1;
      filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(100, 200, 255, 0.35));
      pointer-events: auto;
      cursor: default;
    }
    .cavern-prop-img {
      width: 100%; height: 100%;
      object-fit: contain;
      display: block;
      border-radius: 10px;
      animation: propPlace 0.55s cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    .cavern-prop.ghost {
      opacity: 0.28;
      filter: grayscale(0.55) drop-shadow(0 2px 6px rgba(0,0,0,0.3));
    }
    .cavern-prop.ghost .cavern-prop-img {
      outline: 1.5px dashed rgba(180, 220, 255, 0.45);
      outline-offset: 2px;
      border-radius: 12px;
      animation: none;
    }
    @keyframes propPlace {
      from { opacity: 0; transform: scale(0.45) translateY(-12px); }
      70% { transform: scale(1.08) translateY(2px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .cavern-depth {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 3;
      display: flex; justify-content: space-between; align-items: center;
      gap: 8px; flex-wrap: wrap;
      padding: 28px 12px 10px;
      background: linear-gradient(180deg, transparent, rgba(4, 8, 18, 0.88));
      pointer-events: none;
    }
    .cavern-label {
      font-family: var(--font-display);
      font-weight: 700;
      color: #c9ecff;
      font-size: 0.9rem;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
    }
    .cavern-essence {
      font-weight: 800;
      color: #7ed0ff;
      font-size: 0.9rem;
      text-shadow: 0 0 12px rgba(100, 200, 255, 0.5);
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
    /* Next-goal retention strip */
    .goal-banner {
      margin: 6px 0 8px;
      padding: 10px 14px;
      border-radius: 14px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.88rem;
      letter-spacing: 0.02em;
      color: #fff6e8;
      text-align: center;
      background:
        linear-gradient(135deg, rgba(90, 50, 160, 0.55), rgba(20, 40, 90, 0.85));
      border: 2px solid rgba(255, 210, 74, 0.4);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
      text-shadow: 0 1px 2px rgba(0,0,0,0.45);
    }
    /* Essence progress toward next cavern piece */
    .essence-track-wrap {
      margin: 0 0 12px;
    }
    .essence-track-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #b8e8ff;
      margin-bottom: 5px;
      letter-spacing: 0.02em;
    }
    .essence-track {
      height: 12px;
      border-radius: 999px;
      background: rgba(0,0,0,0.45);
      border: 2px solid rgba(126, 208, 255, 0.35);
      overflow: hidden;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
    }
    .essence-track-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #3a9ae0, #7ed0ff 45%, #ffd24a);
      box-shadow: 0 0 12px rgba(100, 200, 255, 0.55);
      transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
      min-width: 0;
    }
    /* Daily gift claim modal */
    .daily-gift {
      position: absolute; inset: 0;
      z-index: 50;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      background: rgba(2, 4, 12, 0.82);
      backdrop-filter: blur(6px);
      animation: placeFadeIn 0.28s ease-out;
    }
    .daily-gift-card {
      width: min(340px, 100%);
      padding: 22px 18px 18px;
      border-radius: 22px;
      text-align: center;
      background:
        radial-gradient(circle at 30% 20%, rgba(255, 220, 120, 0.18), transparent 45%),
        linear-gradient(165deg, #3a2868, #141028 55%, #0a0818);
      border: 3px solid rgba(255, 210, 74, 0.55);
      box-shadow:
        0 10px 0 rgba(0,0,0,0.4),
        0 0 40px rgba(255, 180, 60, 0.25),
        inset 0 1px 0 rgba(255,255,255,0.12);
    }
    .daily-gift-kicker {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: var(--gold);
      margin-bottom: 6px;
    }
    .daily-gift-card h2 {
      font-family: var(--font-title);
      font-size: 1.55rem;
      color: #fff6e8;
      margin: 0 0 14px;
      text-shadow: 0 2px 0 #3a2060;
    }
    .daily-gift-rewards {
      display: flex; justify-content: center; gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .daily-gift-chip {
      min-width: 96px;
      padding: 12px 14px;
      border-radius: 16px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.05rem;
      color: #e8f4ff;
      background: linear-gradient(180deg, #3a6a9a, #1a3048);
      border: 2px solid rgba(126, 208, 255, 0.45);
      box-shadow: 0 4px 0 #0a1828, inset 0 1px 0 rgba(255,255,255,0.15);
    }
    .daily-gift-chip.gold {
      color: #fff6e8;
      background: linear-gradient(180deg, #c9a227, #7a5810);
      border-color: rgba(255, 230, 140, 0.55);
      box-shadow: 0 4px 0 #3a2808, inset 0 1px 0 rgba(255,255,255,0.25);
    }
    .daily-gift-card .hud-tip {
      margin-bottom: 14px;
    }
    .daily-gift-card .btn {
      width: 100%;
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
    /* Continue / lives heroes */
    .continue-hero, .lives-hero {
      display: flex; align-items: center; gap: 14px;
      margin: 4px 0 12px;
      padding: 14px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(90, 50, 160, 0.4), rgba(20, 12, 40, 0.95));
      border: 2px solid rgba(255, 210, 74, 0.35);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35);
    }
    .continue-pct {
      font-family: var(--font-title);
      font-size: 1.8rem;
      font-weight: 800;
      color: #ffd24a;
      text-shadow: 0 2px 0 #3a2060;
      min-width: 72px;
      text-align: center;
    }
    .continue-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.1rem;
      color: #fff6e8;
      margin-bottom: 4px;
    }
    .lives-heart {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem;
      background: linear-gradient(180deg, #ff9aa8, #e03050);
      box-shadow: 0 4px 0 #7a1020, inset 0 2px 0 rgba(255,255,255,0.35);
      flex-shrink: 0;
    }
    /* Stage-complete fanfare (Pass 7) */
    .stage-complete {
      position: absolute; inset: 0;
      z-index: 55;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      background: rgba(2, 4, 12, 0.88);
      backdrop-filter: blur(8px);
      animation: placeFadeIn 0.3s ease-out;
      overflow: hidden;
    }
    .stage-complete-sparks {
      position: absolute; inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .stage-spark {
      position: absolute;
      left: var(--x, 50%);
      top: 110%;
      font-size: 0.9rem;
      color: hsl(var(--hue, 40), 90%, 70%);
      opacity: 0;
      animation: stageSpark 2.4s ease-out infinite;
      animation-delay: var(--delay, 0s);
      text-shadow: 0 0 10px currentColor;
    }
    @keyframes stageSpark {
      0% { transform: translateY(0) scale(0.4) rotate(0deg); opacity: 0; }
      15% { opacity: 1; }
      100% { transform: translateY(-120vh) scale(1.1) rotate(180deg); opacity: 0; }
    }
    .stage-complete-card {
      position: relative;
      z-index: 1;
      width: min(360px, 100%);
      padding: 18px 16px 16px;
      border-radius: 22px;
      text-align: center;
      background:
        radial-gradient(circle at 40% 15%, rgba(255, 220, 120, 0.2), transparent 50%),
        linear-gradient(165deg, #3a2868, #141028 55%, #0a0818);
      border: 3px solid rgba(255, 210, 74, 0.6);
      box-shadow:
        0 12px 0 rgba(0,0,0,0.4),
        0 0 48px rgba(255, 180, 60, 0.3),
        inset 0 1px 0 rgba(255,255,255,0.12);
    }
    .stage-complete-art {
      width: 100%;
      height: 110px;
      object-fit: cover;
      border-radius: 14px;
      border: 2px solid rgba(126, 208, 255, 0.35);
      margin-bottom: 12px;
      box-shadow: 0 0 24px rgba(80, 160, 255, 0.25);
    }
    .stage-complete-kicker {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: var(--gold);
      margin-bottom: 4px;
    }
    .stage-complete-title {
      font-family: var(--font-title);
      font-size: 1.45rem;
      font-weight: 700;
      color: #fff6e8;
      margin: 0 0 6px;
      text-shadow: 0 2px 0 #3a2060, 0 0 20px rgba(255, 200, 80, 0.35);
    }
    .stage-complete-sub {
      font-size: 0.88rem;
      font-weight: 700;
      color: rgba(200, 220, 255, 0.85);
      margin: 0 0 14px;
    }
    .stage-complete-card .btn {
      width: 100%;
    }
    /* ---- Pass 8: play dock, settings, shop chrome ---- */
    .play-dock {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: min(100%, 420px);
      margin: 0 auto 14px;
      padding: 10px 12px;
      border-radius: 22px;
      background:
        linear-gradient(180deg, rgba(36, 28, 64, 0.94), rgba(12, 8, 28, 0.96));
      border: 3px solid rgba(201, 162, 39, 0.5);
      box-shadow:
        0 6px 0 rgba(0,0,0,0.45),
        0 12px 28px rgba(0,0,0,0.4),
        inset 0 1px 0 rgba(255,255,255,0.1);
      pointer-events: auto;
    }
    .play-dock-tools {
      display: flex; gap: 10px; flex: 1;
    }
    .play-dock .play-tool {
      flex: 1;
      min-width: 0;
      font-size: 1rem;
      padding: 12px 10px;
    }
    .play-dock .play-tool.armed {
      animation: nextPulse 1.2s ease-in-out infinite;
    }
    .play-dock .play-quit {
      flex-shrink: 0;
      padding: 12px 14px;
    }
    .play-dock .play-pause {
      flex: 0 0 auto;
      min-width: 56px;
      letter-spacing: 0.02em;
    }
    /* Pause menu */
    .pause-card {
      width: min(340px, 100%);
      padding: 22px 18px 18px;
      border-radius: 22px;
      text-align: center;
      pointer-events: auto;
      background:
        radial-gradient(circle at 40% 12%, rgba(255, 220, 120, 0.14), transparent 50%),
        linear-gradient(165deg, #3a2868, #141028 55%, #0a0818);
      border: 3px solid rgba(255, 210, 74, 0.55);
      box-shadow:
        0 12px 0 rgba(0,0,0,0.4),
        0 0 40px rgba(100, 80, 200, 0.25),
        inset 0 1px 0 rgba(255,255,255,0.12);
    }
    .pause-kicker {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.18em;
      color: var(--gold);
      margin-bottom: 4px;
    }
    .pause-card h2 {
      font-family: var(--font-title);
      font-size: 1.35rem;
      color: #fff6e8;
      margin: 0 0 6px;
      text-shadow: 0 2px 0 #3a2060;
    }
    .pause-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
    }
    .pause-actions .btn {
      width: 100%;
    }
    .settings-section {
      margin: 12px 0 16px;
    }
    .settings-section-title {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 8px;
      text-shadow: 0 1px 0 rgba(0,0,0,0.4);
    }
    .settings-toggle {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      text-align: left;
      margin: 0 0 8px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 2px solid rgba(180, 140, 255, 0.22);
      background: linear-gradient(180deg, rgba(40, 30, 70, 0.9), rgba(16, 12, 32, 0.95));
      color: var(--text);
      cursor: pointer;
      box-shadow: 0 3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);
      font-family: var(--font-body);
    }
    .settings-toggle.on {
      border-color: rgba(126, 208, 255, 0.45);
    }
    .settings-toggle:active {
      transform: translateY(2px);
      box-shadow: 0 1px 0 rgba(0,0,0,0.3);
    }
    .settings-toggle-label {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.95rem;
    }
    .settings-toggle-hint {
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 600;
      margin-top: 2px;
    }
    .settings-switch {
      width: 48px; height: 28px; flex-shrink: 0;
      border-radius: 999px;
      background: rgba(0,0,0,0.45);
      border: 2px solid rgba(160, 140, 200, 0.35);
      position: relative;
      transition: background 0.2s, border-color 0.2s;
    }
    .settings-toggle.on .settings-switch {
      background: linear-gradient(180deg, #5ec8ff, #1a6fd4);
      border-color: rgba(180, 230, 255, 0.55);
    }
    .settings-switch-knob {
      position: absolute;
      top: 2px; left: 2px;
      width: 20px; height: 20px;
      border-radius: 50%;
      background: linear-gradient(180deg, #fff8ef, #d8c8e8);
      box-shadow: 0 2px 0 rgba(0,0,0,0.35);
      transition: transform 0.2s cubic-bezier(0.22, 1.2, 0.36, 1);
    }
    .settings-toggle.on .settings-switch-knob {
      transform: translateX(20px);
    }
    .settings-about {
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(0,0,0,0.28);
      border: 1px solid rgba(180, 140, 255, 0.18);
      font-weight: 700;
      font-size: 0.88rem;
    }
    .panel-settings .row,
    .panel-shop .row {
      flex-wrap: wrap;
    }
    /* ---- Pass 10: Geode Warden companion + geode crack ---- */
    .companion-bubble {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 8px 0 12px;
      padding: 10px 12px;
      border-radius: 16px;
      text-align: left;
      background:
        linear-gradient(135deg, rgba(40, 60, 100, 0.55), rgba(16, 12, 32, 0.92));
      border: 2px solid rgba(126, 208, 255, 0.35);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .panel-title .companion-bubble {
      margin: 4px 0 14px;
    }
    .companion-portrait {
      width: 64px; height: 64px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid rgba(255, 210, 74, 0.55);
      box-shadow: 0 0 14px rgba(100, 180, 255, 0.35), 0 3px 0 rgba(0,0,0,0.35);
      background: #0a0714;
    }
    .companion-body { min-width: 0; flex: 1; }
    .companion-name {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 3px;
    }
    .companion-line {
      font-size: 0.88rem;
      font-weight: 700;
      color: #e8f0ff;
      line-height: 1.35;
    }
    .geode-crack {
      position: absolute; inset: 0;
      z-index: 52;
      display: flex; align-items: center; justify-content: center;
      padding: 18px;
      background: rgba(2, 4, 12, 0.86);
      backdrop-filter: blur(7px);
      animation: placeFadeIn 0.28s ease-out;
    }
    .geode-crack-card {
      width: min(360px, 100%);
      padding: 18px 16px 16px;
      border-radius: 22px;
      text-align: center;
      background:
        radial-gradient(circle at 40% 10%, rgba(126, 208, 255, 0.18), transparent 50%),
        linear-gradient(165deg, #2a2860, #121028 55%, #0a0818);
      border: 3px solid rgba(126, 208, 255, 0.5);
      box-shadow:
        0 12px 0 rgba(0,0,0,0.4),
        0 0 40px rgba(80, 160, 255, 0.25),
        inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .geode-crack-kicker {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: #7ed0ff;
      margin: 8px 0 4px;
    }
    .geode-crack-card h2 {
      font-family: var(--font-title);
      font-size: 1.35rem;
      color: #fff6e8;
      margin: 0 0 6px;
      text-shadow: 0 2px 0 #3a2060;
    }
    .geode-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 14px 0 12px;
    }
    .geode-slot {
      appearance: none;
      border: 2px solid rgba(201, 162, 39, 0.45);
      border-radius: 16px;
      padding: 14px 8px;
      min-height: 92px;
      cursor: pointer;
      background:
        radial-gradient(circle at 40% 30%, rgba(126, 208, 255, 0.25), transparent 55%),
        linear-gradient(180deg, #2a2050, #121028);
      color: var(--text);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
      font-family: var(--font-body);
      transition: transform 0.15s, filter 0.15s;
    }
    .geode-slot:active:not(:disabled) {
      transform: translateY(2px);
      box-shadow: 0 2px 0 rgba(0,0,0,0.35);
    }
    .geode-slot-glyph {
      font-size: 1.6rem;
      line-height: 1.2;
      filter: drop-shadow(0 0 8px rgba(126, 208, 255, 0.5));
    }
    .geode-slot-label {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 4px;
    }
    .geode-slot-reward {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1rem;
      color: #ffd24a;
      margin-top: 4px;
    }
    .geode-slot.cracked {
      border-color: rgba(255, 210, 74, 0.7);
      pointer-events: none;
      animation: propPlace 0.4s ease-out both;
    }
    .geode-slot.jackpot {
      box-shadow: 0 0 20px rgba(255, 200, 60, 0.55), 0 4px 0 rgba(0,0,0,0.35);
    }
    .geode-slot.miss {
      opacity: 0.4;
      filter: grayscale(0.5);
      pointer-events: none;
    }
    .geode-crack-card .btn { width: 100%; }
    .geode-crack-card .companion-bubble {
      margin-top: 0;
    }
    /* ---- Live-ops evolution: album, hybrid event, idle, ethics ---- */
    .liveops-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 12px;
    }
    .liveops-chip {
      appearance: none;
      border: 2px solid rgba(126, 208, 255, 0.35);
      background: linear-gradient(180deg, rgba(40, 50, 90, 0.9), rgba(12, 10, 28, 0.95));
      color: #e8f4ff;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.72rem;
      letter-spacing: 0.03em;
      padding: 8px 12px;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 2px 0 rgba(0,0,0,0.3);
    }
    .liveops-chip.event {
      border-color: rgba(255, 180, 100, 0.45);
      color: #ffe8c8;
    }
    .liveops-chip.idle {
      border-color: rgba(120, 220, 160, 0.45);
      color: #c8ffe0;
    }
    .liveops-chip.dim { opacity: 0.7; }
    .liveops-chip:active {
      transform: translateY(1px);
    }
    .album-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 12px 0;
    }
    .album-slot {
      padding: 12px 8px;
      border-radius: 14px;
      text-align: center;
      background: linear-gradient(180deg, rgba(40, 30, 70, 0.9), rgba(12, 8, 28, 0.95));
      border: 2px solid rgba(180, 140, 255, 0.22);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3);
    }
    .album-slot.done {
      border-color: rgba(255, 210, 74, 0.55);
      box-shadow: 0 0 12px rgba(255, 180, 40, 0.2), 0 3px 0 rgba(0,0,0,0.3);
    }
    .album-slot.rarity-uncommon {
      border-color: rgba(126, 208, 255, 0.4);
    }
    .album-slot.rarity-rare {
      border-color: rgba(255, 180, 80, 0.55);
      box-shadow: 0 0 14px rgba(255, 160, 40, 0.22), 0 3px 0 rgba(0,0,0,0.3);
    }
    .album-rarity-tag {
      font-size: 0.55rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 4px;
      color: var(--muted);
    }
    .album-rarity-tag.uncommon { color: #7ed0ff; }
    .album-rarity-tag.rare { color: #ffd24a; }
    .album-glyph { font-size: 1.4rem; margin-bottom: 4px; }
    .album-name {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.72rem;
      color: #fff6e8;
    }
    .album-count {
      font-size: 0.72rem;
      font-weight: 800;
      color: #7ed0ff;
      margin-top: 2px;
    }
    .album-gain {
      color: #e0c0ff !important;
      font-weight: 800 !important;
      font-family: var(--font-display);
    }
    .event-hero {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 8px 0 14px;
      padding: 14px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(90, 50, 40, 0.45), rgba(20, 12, 32, 0.95));
      border: 2px solid rgba(255, 180, 100, 0.4);
    }
    .event-hero-pts {
      font-family: var(--font-title);
      font-size: 2rem;
      font-weight: 800;
      color: #ffd24a;
      min-width: 64px;
      text-align: center;
      text-shadow: 0 2px 0 #3a2060;
    }
    .event-hero-label {
      font-family: var(--font-display);
      font-weight: 800;
      color: #fff6e8;
    }
    .event-mile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      margin-bottom: 8px;
      border-radius: 14px;
      background: rgba(0,0,0,0.28);
      border: 1.5px solid rgba(180, 140, 255, 0.2);
    }
    .event-mile.done { border-color: rgba(126, 208, 255, 0.4); }
    .event-mile.claimed {
      border-color: rgba(80, 200, 120, 0.45);
      opacity: 0.85;
    }
    .event-mile-at {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.78rem;
      color: var(--gold);
      min-width: 52px;
    }
    .event-mile-body { flex: 1; min-width: 0; }
    .event-mile-body .name {
      font-weight: 800;
      font-family: var(--font-display);
      font-size: 0.9rem;
    }
    .event-mile-body .blurb {
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 600;
    }
    .event-mile-flag {
      font-weight: 800;
      color: #7ed0ff;
      font-size: 1.1rem;
    }
    .idle-card {
      margin: 8px 0 12px;
      padding: 12px 14px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(30, 70, 50, 0.4), rgba(12, 20, 18, 0.92));
      border: 2px solid rgba(120, 220, 160, 0.35);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3);
    }
    .idle-card-title {
      font-family: var(--font-display);
      font-weight: 800;
      color: #c8ffe0;
      margin-bottom: 4px;
    }
    .idle-card .btn { width: 100%; margin-top: 8px; }
    .ethics-banner {
      margin: 0 0 10px;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(200, 230, 255, 0.9);
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(126, 208, 255, 0.25);
      line-height: 1.35;
    }
    .conveyor-note {
      color: rgba(160, 210, 255, 0.95) !important;
      font-weight: 800 !important;
    }
  `;
  document.head.appendChild(el);
}

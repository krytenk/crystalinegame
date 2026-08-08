/** Apply theme CSS custom properties (Harbor palette, etc.). */
export function applyThemeCssVars(
  vars: Readonly<Record<string, string>>,
  opts?: { bgImage?: string },
): void {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
  const app = document.getElementById('app');
  if (!app) return;
  // Shell backdrop: Harbor uses docks art; Crystalline keeps mine (or solid --bg)
  if (opts?.bgImage) {
    const url = opts.bgImage.startsWith('url(') ? opts.bgImage : `url("./${opts.bgImage.replace(/^\.\//, '')}")`;
    app.style.background = `
        radial-gradient(ellipse at 50% 0%, rgba(42, 143, 154, 0.28), transparent 55%),
        linear-gradient(180deg, rgba(8,20,30,0.4), rgba(6,14,22,0.88)),
        ${url} center / cover no-repeat,
        ${vars['--bg'] ?? '#0b1c2e'}`;
  } else if (vars['--bg']) {
    // Mine / default: soft amethyst crown light (Harbor uses bgImage path above)
    app.style.background = `
        radial-gradient(ellipse at 50% 0%, rgba(120, 70, 200, 0.28), transparent 55%),
        linear-gradient(180deg, rgba(14, 8, 28, 0.35), rgba(8, 4, 18, 0.9)),
        ${vars['--bg']}`;
  }
}

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
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Fredoka:wght@500;600;700&family=Nunito:wght@500;600;700;800&display=swap';
    document.head.append(pre1, pre2, g);
  }

  const el = document.createElement('style');
  el.id = 'crystalline-styles';
  el.textContent = `
    /*
     * FontBundles stack (commercial licence via FontBundles subscription).
     * Title = epic fantasy wordmark · Display = mobile casual CTAs · Body = readable.
     */
    @font-face {
      font-family: "DragonBlaze";
      src: url("./fonts/DragonBlaze.woff2") format("woff2"),
           url("./fonts/DragonBlaze/DragonBlaze-Regular.woff") format("woff"),
           url("./fonts/DragonBlaze/DragonBlaze-Regular.ttf") format("truetype");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "DragonWarrior";
      src: url("./fonts/DragonWarrior.ttf") format("truetype");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "BjornKnight";
      src: url("./fonts/BjornKnight.ttf") format("truetype");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "ScreenTechno";
      src: url("./fonts/ScreenTechno.ttf") format("truetype");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "HeroicDragon";
      src: url("./fonts/HeroicDragon.ttf") format("truetype");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    /* Legacy / fallback faces still shipped */
    @font-face {
      font-family: "GalacticKnights";
      src: url("./fonts/GalacticKnights-Regular.woff") format("woff");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "CrystallineDisplay";
      src: url("./fonts/display.woff2") format("woff2");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "CrystallineDisplayOutline";
      src: url("./fonts/display-outline.woff2") format("woff2");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "CrystallineBody";
      src: url("./fonts/body.woff2") format("woff2");
      font-weight: 500 800;
      font-style: normal;
      font-display: swap;
    }
    /* Original casual display — Tidepop (OFL). Harbor WORDMARKS only (letters). */
    @font-face {
      font-family: "Tidepop";
      src: url("./fonts/Tidepop/Tidepop-Bold.ttf") format("truetype");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }
    /*
     * Fredoka static instances (OFL). Do NOT ship the variable font as SemiBold —
     * Android WebView mishandles fvar + weight 800 and numbers go missing/broken.
     */
    @font-face {
      font-family: "Fredoka";
      src: url("./fonts/Fredoka/Fredoka-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Fredoka";
      src: url("./fonts/Fredoka/Fredoka-Medium.ttf") format("truetype");
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Fredoka";
      src: url("./fonts/Fredoka/Fredoka-SemiBold.ttf") format("truetype");
      font-weight: 600;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Fredoka";
      src: url("./fonts/Fredoka/Fredoka-Bold.ttf") format("truetype");
      /* Map 700–800 so UI weight:800 still resolves digits */
      font-weight: 700 800;
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
      /* DragonBlaze wordmark · Screen Techno CTAs · Nunito body */
      --font-title: "DragonBlaze", "DragonWarrior", "GalacticKnights", "Cinzel", serif;
      --font-display: "ScreenTechno", "CrystallineDisplay", "Nunito", system-ui, sans-serif;
      --font-display-outline: "CrystallineDisplayOutline", "ScreenTechno", "Cinzel", serif;
      --font-accent: "BjornKnight", "HeroicDragon", "DragonWarrior", serif;
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
      overflow: hidden;
      filter: drop-shadow(0 18px 50px rgba(0,0,0,0.65));
      /* Isolate fixed/absolute ceremonies to this stage */
      transform: translateZ(0);
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
      padding: max(clamp(10px, 2.5vw, 22px), env(safe-area-inset-top, 0px))
        max(clamp(10px, 2.5vw, 22px), env(safe-area-inset-right, 0px))
        max(clamp(10px, 2.5vw, 22px), env(safe-area-inset-bottom, 0px))
        max(clamp(10px, 2.5vw, 22px), env(safe-area-inset-left, 0px));
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
      width: 48px;
      height: 48px;
      object-fit: contain;
      pointer-events: none;
      user-select: none;
      opacity: 0.85;
      animation: titleGemFloat 4.5s ease-in-out infinite;
      filter: drop-shadow(0 0 12px rgba(255, 220, 140, 0.65));
    }
    .title-gem.g1 { left: 8%; top: 14%; animation-delay: 0s; }
    .title-gem.g2 { right: 10%; top: 18%; animation-delay: 0.6s; }
    .title-gem.g3 { left: 14%; bottom: 18%; animation-delay: 1.2s; }
    .title-gem.g4 { right: 12%; bottom: 14%; animation-delay: 1.8s; }
    @keyframes titleGemFloat {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.75; }
      50% { transform: translateY(-10px) scale(1.12); opacity: 1; }
    }
    .panel h1, .panel h2 {
      margin: 0 0 10px;
      font-weight: 800;
      letter-spacing: 0.02em;
      position: relative;
    }
    .panel h1 {
      font-family: var(--font-title);
      font-size: clamp(1.75rem, 5.2vw, 2.35rem);
      color: #fff6e8;
      text-shadow:
        0 2px 0 #3a2060,
        0 4px 0 #1a0c30,
        0 0 24px rgba(255, 200, 80, 0.35);
      letter-spacing: 0.02em;
      font-weight: 700;
    }
    .panel.panel-title h1 {
      letter-spacing: 0.06em;
      font-size: clamp(1.9rem, 6vw, 2.55rem);
    }
    /* Harbor sand material wordmark (hero title only) */
    .title-sand-host {
      width: 100%;
      display: flex;
      justify-content: center;
      margin: 4px 0 8px;
      min-height: 72px;
    }
    .sand-wordmark {
      max-width: 100%;
      filter: drop-shadow(0 2px 0 rgba(20, 40, 50, 0.35))
        drop-shadow(0 0 18px rgba(90, 200, 210, 0.25));
      border-radius: 8px;
    }
    /* Crystalline ore wordmark — amethyst rim glow */
    .panel-title .sand-wordmark {
      cursor: grab;
    }
    .panel-title .sand-wordmark:active {
      cursor: grabbing;
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
      min-width: 48px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      font-family: var(--font-display);
      letter-spacing: 0.04em;
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
      -webkit-appearance: none;
      border: 2px solid rgba(180, 140, 255, 0.28);
      border-radius: 18px;
      padding: 10px 12px 10px 10px;
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
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      overflow: hidden;
    }
    .booster-chip.has-art {
      padding-left: 8px;
    }
    .booster-chip-art {
      width: 52px;
      height: 52px;
      flex-shrink: 0;
      object-fit: contain;
      border-radius: 12px;
      background:
        radial-gradient(circle at 40% 30%, rgba(255,255,255,0.12), transparent 60%),
        rgba(0,0,0,0.35);
      border: 1.5px solid rgba(255,255,255,0.12);
      box-shadow:
        0 2px 0 rgba(0,0,0,0.35),
        0 0 12px rgba(140, 180, 255, 0.25);
      filter: drop-shadow(0 0 6px rgba(160, 200, 255, 0.35));
      pointer-events: none;
      user-select: none;
    }
    .booster-chip.on .booster-chip-art {
      border-color: rgba(255, 210, 74, 0.55);
      box-shadow:
        0 2px 0 rgba(0,0,0,0.35),
        0 0 14px rgba(255, 200, 60, 0.45);
      filter: drop-shadow(0 0 8px rgba(255, 210, 74, 0.45));
    }
    .booster-chip-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      flex: 1;
      gap: 2px;
    }
    .booster-chip-label {
      line-height: 1.2;
    }
    .booster-chip .meta {
      display: block;
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
    .booster-bag {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 6px 0 4px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(8, 16, 32, 0.45);
      border: 1px solid rgba(160, 200, 255, 0.12);
    }
    .booster-bag-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text, #e8f0ff);
    }
    .booster-bag-row .btn {
      min-width: 64px;
      padding: 6px 12px;
      font-size: 0.78rem;
    }
    .shop-tools {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 8px 0 14px;
    }
    .shop-tools-head {
      margin-bottom: 2px;
    }
    .shop-tool-sku {
      align-items: center;
    }
    .shop-tool-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    .shop-tool-actions .btn {
      min-width: 72px;
      padding: 8px 10px;
      font-size: 0.78rem;
    }
    .panel-booster-restock .hud-tip {
      text-align: center;
    }
    .booster-chip:disabled .booster-chip-art {
      filter: grayscale(0.6) brightness(0.75);
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
    .stat.stat-with-icon {
      padding: 10px 12px;
    }
    .stat-icon-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stat-icon {
      width: 36px;
      height: 36px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }
    .stat-text { min-width: 0; flex: 1; }
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
    .streak-line {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: var(--font-display);
      font-weight: 800;
      color: #ffc878;
    }
    .streak-line-icon {
      width: 22px;
      height: 22px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .daily-goal-streak {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .daily-goal-streak img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
    .star-pop-img {
      width: 1.75rem;
      height: 1.75rem;
      margin: 0 4px;
      object-fit: contain;
      transform: scale(0.4);
      opacity: 0;
      animation: starPop 0.45s cubic-bezier(0.22, 1.4, 0.36, 1) forwards;
      filter: grayscale(1) brightness(0.7);
    }
    .star-pop-img.on {
      filter: drop-shadow(0 0 10px rgba(255, 200, 60, 0.65));
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
    /* ---- Retention map home: place postcards + fat PLAY ---- */
    .panel-map-home h1 {
      margin-bottom: 8px;
    }
    .map-home-hud {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 10px;
      padding: 10px 12px;
      border-radius: 16px;
      background: var(
        --map-home-bg,
        linear-gradient(180deg, rgba(36, 24, 64, 0.94), rgba(14, 10, 28, 0.96))
      );
      border: 2px solid var(--map-home-edge, rgba(201, 162, 39, 0.4));
    }
    .map-foot {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
      width: 100%;
    }
    .map-foot > .btn {
      width: 100%;
      min-height: 52px;
      font-size: 1.05rem;
    }
    .map-foot-secondary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .map-foot-secondary .btn {
      min-height: 44px;
      font-size: 0.82rem;
      padding: 10px 8px;
    }
    .map-foot-secondary .btn:only-child {
      grid-column: 1 / -1;
    }
    .panel-map-home .row:empty,
    .panel-pier .row:empty {
      display: none;
    }
    .title-actions-stack {
      flex-direction: column !important;
      width: 100%;
    }
    .title-actions-stack .btn {
      width: 100%;
      min-height: 52px;
    }
    .panel-title-clean .title-tagline {
      margin-bottom: 8px !important;
    }
    .place-list-more {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-align: center;
      color: var(--muted);
      padding: 6px 8px;
      opacity: 0.85;
    }
    .map-home-lives, .map-home-currency {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      color: #fff6e8;
    }
    .map-home-icon {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
    .map-home-next {
      flex: 1;
      text-align: center;
      min-width: 0;
    }
    .map-home-next-k {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .map-home-next-v {
      display: block;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      color: var(--gold);
    }
    .map-retention-strip {
      display: flex;
      gap: 8px;
      margin: 0 0 12px;
      flex-wrap: wrap;
    }
    .map-ret-chip {
      appearance: none;
      border: 2px solid rgba(160, 200, 220, 0.28);
      background: rgba(12, 24, 36, 0.85);
      color: var(--muted);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.72rem;
      border-radius: 999px;
      padding: 8px 12px;
      cursor: pointer;
      min-height: 36px;
    }
    .map-ret-chip.hot {
      border-color: rgba(255, 210, 74, 0.65);
      color: #2a1800;
      background: linear-gradient(180deg, #ffe56a, #f0b020);
      box-shadow: 0 2px 0 #8a5008;
    }
    .map-ret-hot {
      letter-spacing: 0.06em;
    }
    .place-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 0 0 4px;
      max-height: min(48vh, 420px);
      overflow: auto;
      padding: 2px 2px 6px;
    }
    .place-card {
      position: relative;
      display: block;
      width: 100%;
      min-height: 88px;
      border: 0;
      border-radius: 18px;
      overflow: hidden;
      cursor: pointer;
      text-align: left;
      padding: 0;
      box-shadow: 0 4px 0 rgba(0,0,0,0.35);
      -webkit-tap-highlight-color: transparent;
    }
    .place-card:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      filter: grayscale(0.45);
    }
    .place-card-art {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .place-card-scrim {
      position: absolute;
      inset: 0;
      background: var(
        --place-scrim,
        linear-gradient(90deg, rgba(12, 8, 24, 0.9) 0%, rgba(12, 8, 24, 0.5) 55%, rgba(12, 8, 24, 0.22) 100%)
      );
    }
    .place-card-body {
      position: relative;
      z-index: 1;
      padding: 14px 16px;
    }
    .place-card-kicker {
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(200, 230, 240, 0.75);
    }
    .place-card-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.2rem;
      color: #fff6e8;
      margin-top: 2px;
    }
    .place-card-meta {
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(255, 230, 160, 0.9);
      margin-top: 4px;
    }
    .place-card.current {
      box-shadow:
        0 4px 0 #8a6010,
        0 0 0 2px rgba(255, 210, 74, 0.55),
        0 0 18px rgba(255, 180, 40, 0.35);
    }
    .place-card.done .place-card-kicker {
      color: #7ed0ff;
    }
    /* Act I-C region cards (Outer Channels / Under-Crown) */
    .place-card.depth-core.current {
      box-shadow:
        0 4px 0 #5a3060,
        0 0 0 2px rgba(180, 140, 255, 0.5),
        0 0 22px rgba(120, 80, 200, 0.4);
    }
    .place-card.region-new .place-card-kicker {
      color: #ffd679;
    }
    .place-card-region-pill {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 7px;
      border-radius: 999px;
      font-size: 0.58rem;
      letter-spacing: 0.08em;
      background: rgba(90, 200, 210, 0.22);
      border: 1px solid rgba(126, 208, 255, 0.4);
      color: #c9ecff;
      vertical-align: middle;
    }
    /* ---- Pier / place walk (layer 2) ---- */
    .panel-pier .pier-meta {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--muted);
      margin: -4px 0 10px;
    }
    .pier-stage {
      position: relative;
      width: 100%;
      height: min(52vh, 440px);
      border-radius: 20px;
      overflow: hidden;
      border: 2px solid rgba(201, 162, 39, 0.4);
      box-shadow: 0 6px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
      background: #0a1420;
      margin-bottom: 4px;
    }
    .pier-stage-art {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .pier-stage-scrim {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(6, 14, 22, 0.25) 0%, transparent 30%, rgba(6, 14, 22, 0.55) 100%),
        radial-gradient(ellipse at 50% 80%, rgba(42, 143, 154, 0.2), transparent 55%);
      pointer-events: none;
    }
    .pier-stage.pier-region-channel {
      border-color: rgba(90, 200, 212, 0.55);
      box-shadow:
        0 6px 0 rgba(0,0,0,0.35),
        0 0 28px rgba(60, 180, 200, 0.22),
        inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .pier-stage.pier-region-channel .pier-stage-scrim {
      background:
        linear-gradient(180deg, rgba(8, 28, 40, 0.3) 0%, transparent 32%, rgba(6, 20, 32, 0.6) 100%),
        radial-gradient(ellipse at 50% 75%, rgba(60, 200, 210, 0.28), transparent 55%);
    }
    .pier-stage.pier-region-treaty {
      border-color: rgba(200, 140, 255, 0.5);
      box-shadow:
        0 6px 0 rgba(0,0,0,0.35),
        0 0 28px rgba(140, 80, 220, 0.25),
        inset 0 1px 0 rgba(255,255,255,0.1);
    }
    .pier-stage.pier-region-treaty .pier-stage-scrim {
      background:
        linear-gradient(180deg, rgba(28, 12, 40, 0.32) 0%, transparent 32%, rgba(16, 8, 28, 0.62) 100%),
        radial-gradient(ellipse at 50% 75%, rgba(160, 100, 255, 0.26), transparent 55%);
    }
    .pier-motes {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }
    .pier-mote {
      position: absolute;
      left: var(--x);
      bottom: 12%;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #ffe9a8;
      opacity: 0;
      box-shadow: 0 0 8px rgba(255, 220, 120, 0.7);
      animation: pierMoteFloat 3.6s ease-in-out var(--delay) infinite;
    }
    .pier-region-treaty .pier-mote {
      background: #e0c0ff;
      box-shadow: 0 0 8px rgba(180, 120, 255, 0.65);
    }
    @keyframes pierMoteFloat {
      0% { opacity: 0; transform: translateY(8px) scale(0.6); }
      20% { opacity: 0.85; }
      70% { opacity: 0.5; }
      100% { opacity: 0; transform: translateY(-48px) scale(1.1); }
    }
    .pier-path {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    .map-path-glow {
      stroke: rgba(90, 200, 210, 0.22);
      stroke-width: 5.5;
      filter: blur(0.6px);
    }
    .pier-path-treaty .map-path-glow {
      stroke: rgba(180, 120, 255, 0.25);
    }
    .pier-path-channel .map-path-progress {
      stroke: rgba(120, 230, 240, 0.95);
    }
    .pier-path-treaty .map-path-progress {
      stroke: rgba(220, 170, 255, 0.95);
    }
    .map-path-dot {
      pointer-events: none;
    }
    .map-path-dot-dim {
      fill: rgba(180, 170, 200, 0.35);
    }
    .map-path-dot-lit {
      fill: #ffd24a;
      filter: drop-shadow(0 0 1.5px rgba(255, 200, 80, 0.8));
    }
    .pier-path-channel .map-path-dot-lit {
      fill: #7ed0ff;
      filter: drop-shadow(0 0 1.5px rgba(100, 210, 230, 0.85));
    }
    .pier-path-treaty .map-path-dot-lit {
      fill: #e0b0ff;
      filter: drop-shadow(0 0 1.5px rgba(180, 120, 255, 0.85));
    }
    .pier-region-tag {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      vertical-align: middle;
    }
    .pier-region-tag-channel {
      color: #c9ecff;
      background: rgba(40, 120, 140, 0.4);
      border: 1px solid rgba(100, 210, 220, 0.45);
    }
    .pier-region-tag-treaty {
      color: #f0e0ff;
      background: rgba(80, 40, 120, 0.45);
      border: 1px solid rgba(180, 130, 255, 0.45);
    }
    .level-node.pier-ball.pier-ball-channel.next-play {
      box-shadow:
        0 5px 0 #0a4050,
        0 0 0 3px rgba(90, 200, 210, 0.5),
        0 0 22px rgba(80, 200, 220, 0.45),
        inset 0 2px 0 rgba(255,255,255,0.3);
      border-color: #7ed0ff;
    }
    .level-node.pier-ball.pier-ball-treaty.next-play {
      box-shadow:
        0 5px 0 #3a1860,
        0 0 0 3px rgba(180, 120, 255, 0.5),
        0 0 22px rgba(160, 100, 255, 0.45),
        inset 0 2px 0 rgba(255,255,255,0.3);
      border-color: #e0b0ff;
    }
    .panel-pier-channel h1 {
      text-shadow: 0 0 18px rgba(90, 200, 210, 0.35), 0 2px 0 #1a3040;
    }
    .panel-pier-treaty h1 {
      text-shadow: 0 0 18px rgba(160, 100, 255, 0.35), 0 2px 0 #2a1840;
    }
    .pier-markers {
      position: absolute;
      inset: 0;
      z-index: 2;
    }
    .level-node.pier-ball {
      position: absolute;
      width: 56px;
      height: 56px;
      margin: 0;
      transform: translate(-50%, -50%);
      aspect-ratio: auto;
      font-size: 0.95rem;
      padding: 2px;
      z-index: 2;
    }
    .level-node.pier-ball.next-play {
      width: 64px;
      height: 64px;
      z-index: 4;
    }
    .level-node.pier-ball .level-num {
      font-size: 1rem;
    }
    .level-node.pier-ball .level-star-img {
      width: 9px;
      height: 9px;
    }
    .level-node.pier-ball:active:not(.locked) {
      transform: translate(-50%, -50%) translateY(2px) scale(0.96);
    }
    /* Per-chapter map section with local path trail (legacy grid kept for safety) */
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
    .map-section.depth-core {
      border-color: rgba(255, 180, 80, 0.4);
      background: linear-gradient(180deg, rgba(48, 28, 12, 0.55), rgba(18, 10, 8, 0.45));
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
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #2a1800;
      background: linear-gradient(180deg, #ffe56a, #f0b020);
      padding: 2px 5px;
      border-radius: 6px;
      box-shadow: 0 2px 0 #8a5008;
      line-height: 1.1;
      white-space: nowrap;
      pointer-events: none;
      z-index: 3;
      text-shadow: none;
      -webkit-font-smoothing: antialiased;
    }
    .level-belt {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 16px; height: 16px;
      border-radius: 50%;
      font-size: 0.5rem;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      color: #0a1830;
      background: linear-gradient(180deg, #7ed0ff, #3a9ae0);
      box-shadow: 0 2px 0 #1a4060;
      pointer-events: none;
      z-index: 3;
      text-shadow: none;
    }
    .level-node.has-belt {
      border-color: rgba(94, 200, 255, 0.55);
    }
    .daily-goal-card {
      margin: 0 0 12px;
      padding: 12px 14px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(90, 50, 40, 0.4), rgba(20, 12, 32, 0.95));
      border: 2px solid rgba(255, 180, 100, 0.4);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3);
    }
    .daily-goal-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 6px;
    }
    .daily-goal-title {
      font-family: var(--font-display);
      font-weight: 800;
      color: #fff6e8;
      font-size: 0.92rem;
    }
    .daily-goal-streak {
      font-size: 0.72rem;
      font-weight: 800;
      color: #ffc878;
    }
    .daily-goal-card .btn {
      width: 100%;
      margin-top: 10px;
    }
    .streak-gain {
      color: #ffc878 !important;
      font-weight: 800 !important;
      font-family: var(--font-display);
      text-align: center;
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
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gold);
      text-shadow: 0 1px 2px rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      gap: 8px;
      -webkit-font-smoothing: antialiased;
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
      /* 700 only — 800 synthesizes a second stroke on Fredoka and reads as ghosting */
      font-weight: 700;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 1.08rem;
      line-height: 1.05;
      padding: 4px;
      box-shadow:
        0 5px 0 #2a1808,
        0 8px 14px rgba(0,0,0,0.4),
        inset 0 2px 0 rgba(255,255,255,0.25),
        inset 0 -3px 6px rgba(0,0,0,0.25);
      /* Hard offset shadow doubled rounded glyphs — soft blur only */
      text-shadow: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .level-node .level-num {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.12rem;
      line-height: 1;
      letter-spacing: 0;
      color: #fff8ef;
      /* single soft contact shadow, not a hard 2px “ghost” copy */
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
      -webkit-font-smoothing: antialiased;
    }
    .level-node .level-stars {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1px;
      min-height: 12px;
      font-size: 0.58rem;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0;
      font-family: var(--font-body);
      text-shadow: none;
      filter: none;
    }
    .level-node .level-star-img {
      width: 11px;
      height: 11px;
      object-fit: contain;
      flex-shrink: 0;
      /* no drop-shadow filter — caused glow ghosting on small stars */
      filter: none;
    }
    .level-node .level-stars-empty {
      color: rgba(255, 248, 239, 0.45);
      font-size: 0.55rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-shadow: none;
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
    .level-node.boss {
      border-color: #ff6a7a;
      background:
        radial-gradient(circle at 32% 28%, rgba(255, 180, 120, 0.55), transparent 42%),
        radial-gradient(circle at 70% 75%, rgba(160, 20, 80, 0.55), transparent 50%),
        linear-gradient(160deg, #8a2040, #401028 55%, #200818);
      box-shadow:
        0 5px 0 #401018,
        0 0 16px rgba(255, 80, 100, 0.35),
        inset 0 2px 0 rgba(255,255,255,0.2);
    }
    .level-node.boss.current {
      border-color: #ffd24a;
      box-shadow:
        0 5px 0 #8a6010,
        0 0 0 3px rgba(255, 100, 120, 0.5),
        0 0 24px rgba(255, 120, 80, 0.45),
        inset 0 2px 0 rgba(255,255,255,0.3);
    }
    .level-boss-tag {
      position: absolute;
      top: -6px;
      right: -4px;
      font-size: 0.48rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 2px 5px;
      border-radius: 6px;
      background: linear-gradient(180deg, #ff6a7a, #c02040);
      color: #fff8f0;
      box-shadow: 0 2px 0 #601018;
      font-family: var(--font-display);
      text-shadow: none;
      -webkit-font-smoothing: antialiased;
    }
    .level-banner.boss {
      box-shadow: 0 0 0 2px rgba(255, 100, 120, 0.45), 0 12px 28px rgba(0,0,0,0.45);
    }
    /* Prelevel slim title — BOSS badge uses ScreenTechno, not Tidepop (S ≠ 8) */
    .prelevel-title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 0 0 10px;
    }
    .prelevel-title-num {
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      font-size: 1.35rem;
      color: #fff6e8;
      letter-spacing: 0.04em;
    }
    .prelevel-region-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 3px 9px;
      border-radius: 999px;
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.62rem;
      letter-spacing: 0.1em;
      vertical-align: middle;
    }
    .prelevel-region-badge.channel {
      color: #c9ecff;
      background: rgba(30, 90, 110, 0.75);
      border: 1.5px solid rgba(100, 210, 220, 0.55);
      box-shadow: 0 2px 0 rgba(10, 40, 50, 0.6);
    }
    .prelevel-region-badge.treaty {
      color: #f0e0ff;
      background: rgba(70, 30, 100, 0.8);
      border: 1.5px solid rgba(180, 130, 255, 0.55);
      box-shadow: 0 2px 0 rgba(30, 10, 50, 0.6);
    }
    .prelevel-boss-badge {
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      color: #fff6e8;
      background: linear-gradient(180deg, #ff6a7a, #c02040);
      border: 1px solid rgba(255, 180, 160, 0.55);
      border-radius: 8px;
      padding: 5px 10px;
      box-shadow: 0 2px 0 #601018;
      text-shadow: none;
      -webkit-font-smoothing: antialiased;
    }
    .prelevel-best-stars {
      display: flex;
      justify-content: center;
      gap: 4px;
      margin: 0 0 10px;
    }
    .prelevel-best-stars .level-star-img {
      width: 18px;
      height: 18px;
    }
    .panel-prelevel.is-boss {
      border-color: rgba(255, 100, 120, 0.4);
    }
    .play-dock .play-pause-float {
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .boss-callout {
      margin: 0 0 12px;
      padding: 12px 14px;
      border-radius: 16px;
      background:
        linear-gradient(135deg, rgba(120, 30, 50, 0.55), transparent 55%),
        linear-gradient(180deg, rgba(50, 20, 40, 0.95), rgba(16, 8, 20, 0.98));
      border: 2px solid rgba(255, 120, 140, 0.45);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35);
    }
    .boss-callout-k {
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      color: #ff9aaa;
      margin-bottom: 4px;
    }
    .boss-callout-v {
      font-size: 0.86rem;
      font-weight: 600;
      line-height: 1.35;
      color: rgba(255, 240, 245, 0.92);
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
    .sku-glyph-art {
      width: 56px;
      height: 56px;
      padding: 4px;
      overflow: hidden;
      background:
        radial-gradient(circle at 35% 25%, rgba(160, 210, 255, 0.35), transparent 55%),
        linear-gradient(160deg, rgba(40, 70, 120, 0.85), rgba(16, 12, 36, 0.98));
      border-color: rgba(126, 200, 255, 0.45);
    }
    .sku-glyph-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
      pointer-events: none;
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
      aspect-ratio: 9 / 14;
      max-height: min(52vh, 520px);
      margin: 0 auto 8px;
      border-radius: 14px;
      overflow: hidden;
      background: #000;
      border: 1px solid rgba(126, 208, 255, 0.25);
      box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.04);
    }
    .ad-player-gift {
      aspect-ratio: 4 / 3;
      max-height: min(28vh, 240px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: radial-gradient(ellipse at 50% 40%, rgba(255, 220, 140, 0.22), transparent 55%),
        linear-gradient(165deg, #1a1430 0%, #0a0818 100%);
      border-color: rgba(255, 210, 100, 0.35);
    }
    .ad-gift-orb {
      font-size: 3rem;
      line-height: 1;
      filter: drop-shadow(0 0 18px rgba(255, 210, 100, 0.65));
      animation: ad-gift-pulse 1.4s ease-in-out infinite;
    }
    .ad-gift-label {
      margin: 0;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 236, 200, 0.85);
    }
    @keyframes ad-gift-pulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.08); opacity: 1; }
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
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--gold);
      font-size: 0.85rem;
      font-weight: 700;
    }
    .level-banner-star {
      width: 18px;
      height: 18px;
      object-fit: contain;
    }
    .level-banner.depth-mid {
      border-color: rgba(180, 140, 255, 0.45);
    }
    .level-banner.depth-deep {
      border-color: rgba(94, 200, 255, 0.5);
    }
    .level-banner.depth-core {
      border-color: rgba(255, 180, 80, 0.55);
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
      display: flex; flex-direction: column; gap: 10px;
      margin: 0 0 12px;
    }
    .goal-row-free {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
    }
    .goal-chip-free {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      min-width: 56px;
    }
    .goal-chip-free .goal-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: 2px solid rgba(255, 210, 100, 0.4);
      background: rgba(0,0,0,0.25);
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    .goal-chip-free .goal-v {
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      color: #fff6e8;
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
    .goal-chip-visual {
      flex-direction: row;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
      width: 100%;
      padding: 12px 14px;
      border-radius: 16px;
      background:
        linear-gradient(135deg, rgba(60, 40, 100, 0.55), transparent 50%),
        linear-gradient(180deg, rgba(40, 30, 70, 0.98), rgba(12, 8, 28, 0.99));
      border: 2px solid rgba(126, 208, 255, 0.4);
    }
    .goal-icon {
      width: 64px;
      height: 64px;
      border-radius: 14px;
      object-fit: cover;
      flex-shrink: 0;
      background: rgba(0,0,0,0.35);
      border: 2px solid rgba(255, 210, 100, 0.45);
      box-shadow: 0 0 16px rgba(255, 200, 80, 0.25);
    }
    .goal-chip-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
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
      font-size: 1.35rem;
      color: #5ec8ff;
      margin-top: 0;
      line-height: 1.1;
    }
    .goal-how {
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.35;
      color: rgba(230, 220, 255, 0.88);
      margin-top: 4px;
    }
    /* Results ceremony — big win moment, thin noise */
    .panel-results.win {
      border-color: rgba(255, 210, 74, 0.45);
    }
    .panel-results.win.perfect {
      box-shadow:
        0 0 0 1px rgba(255, 210, 74, 0.35),
        0 12px 40px rgba(255, 180, 40, 0.18),
        inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .panel-results.win h1 {
      text-align: center;
      letter-spacing: 0.08em;
      font-size: clamp(1.1rem, 3.8vw, 1.35rem);
      color: rgba(255, 230, 180, 0.85);
      margin-bottom: 6px;
    }
    .results-burst {
      position: relative;
      text-align: center;
      margin: 2px 0 14px;
      padding: 0;
      min-height: 200px;
      border-radius: 24px;
      overflow: hidden;
      border: 3px solid rgba(255, 210, 74, 0.6);
      box-shadow:
        0 8px 0 rgba(80, 50, 10, 0.55),
        0 0 28px rgba(255, 190, 60, 0.22);
      background: #120c24;
      animation: resultsHeroIn 0.45s cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    .results-burst.results-ceremony.perfect {
      border-color: rgba(255, 230, 120, 0.85);
      box-shadow:
        0 8px 0 rgba(100, 60, 0, 0.55),
        0 0 40px rgba(255, 210, 80, 0.4);
    }
    .results-burst.fail {
      border-color: rgba(180, 120, 255, 0.45);
      min-height: 160px;
    }
    @keyframes resultsHeroIn {
      from { opacity: 0; transform: scale(0.92) translateY(16px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .results-burst-art {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.92;
      pointer-events: none;
    }
    .results-burst-scrim {
      position: absolute; inset: 0;
      background:
        linear-gradient(180deg, rgba(12,8,28,0.15), rgba(12,8,28,0.78) 55%, rgba(8,4,18,0.94));
      pointer-events: none;
    }
    .results-burst-content {
      position: relative; z-index: 1;
      padding: 26px 14px 20px;
    }
    .results-hero-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(1.35rem, 5.5vw, 1.85rem);
      letter-spacing: 0.06em;
      color: #fff6e8;
      text-shadow: 0 2px 0 rgba(0,0,0,0.55), 0 0 20px rgba(255, 210, 80, 0.45);
      margin-bottom: 10px;
      animation: resultsTitlePop 0.55s cubic-bezier(0.22, 1.35, 0.36, 1) both;
    }
    @keyframes resultsTitlePop {
      0% { opacity: 0; transform: scale(0.7) translateY(12px); }
      60% { opacity: 1; transform: scale(1.08) translateY(0); }
      100% { transform: scale(1); }
    }
    .results-burst-stars {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      min-height: 52px;
    }
    .results-stars-hero .star-pop-img,
    .results-star-lg {
      width: 2.6rem !important;
      height: 2.6rem !important;
      margin: 0 2px !important;
    }
    .results-burst-score {
      font-family: var(--font-display);
      font-size: clamp(2.4rem, 10vw, 3.2rem);
      font-weight: 700;
      color: #fff6e8;
      text-shadow: 0 3px 0 rgba(0,0,0,0.45), 0 0 24px rgba(255, 200, 80, 0.4);
      line-height: 1.05;
      letter-spacing: 0.02em;
    }
    .results-burst-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      color: rgba(255, 230, 200, 0.7);
      margin-top: 6px;
    }
    .results-rewards {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin: 0 0 12px;
    }
    .results-reward-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: min(46%, 150px);
      flex: 1 1 140px;
      max-width: 100%;
      padding: 12px 14px;
      border-radius: 16px;
      background: linear-gradient(160deg, rgba(40, 55, 70, 0.95), rgba(12, 20, 32, 0.98));
      border: 2px solid rgba(126, 208, 255, 0.35);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35);
      animation: resultsChipIn 0.4s cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    .results-reward-chip:nth-child(1) { animation-delay: 0.35s; }
    .results-reward-chip:nth-child(2) { animation-delay: 0.48s; }
    .results-reward-chip:nth-child(3) { animation-delay: 0.6s; }
    .results-reward-chip:nth-child(4) { animation-delay: 0.72s; }
    @keyframes resultsChipIn {
      from { opacity: 0; transform: translateY(12px) scale(0.92); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .results-reward-chip.kind-currency {
      border-color: rgba(126, 208, 255, 0.55);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35), 0 0 16px rgba(80, 180, 255, 0.2);
    }
    .results-reward-chip.kind-streak {
      border-color: rgba(255, 180, 80, 0.55);
    }
    .results-reward-chip.kind-album {
      border-color: rgba(200, 140, 255, 0.5);
    }
    .results-reward-chip.kind-place {
      border-color: rgba(255, 210, 74, 0.55);
      background: linear-gradient(160deg, rgba(70, 50, 20, 0.95), rgba(28, 18, 8, 0.98));
    }
    .results-reward-icon {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .results-reward-glyph {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.1rem;
      color: #1a1030;
      background: linear-gradient(180deg, #e0c0ff, #a070d0);
      flex-shrink: 0;
    }
    .results-reward-glyph.place {
      background: linear-gradient(180deg, #ffe56a, #f0b020);
      color: #2a1800;
    }
    /* Album loot — hero tray with real atlas gem faces */
    .results-album-loot {
      margin: 0 0 12px;
      padding: 14px 12px 12px;
      border-radius: 18px;
      background: linear-gradient(160deg, rgba(40, 28, 70, 0.55), rgba(12, 10, 28, 0.9));
      border: 2px solid rgba(200, 140, 255, 0.35);
      box-shadow: 0 4px 0 rgba(0,0,0,0.3);
      animation: resultsChipIn 0.45s cubic-bezier(0.22, 1.2, 0.36, 1) 0.4s both;
    }
    .results-album-loot-hero {
      border-color: rgba(255, 200, 100, 0.45);
      box-shadow: 0 4px 0 rgba(0,0,0,0.3), 0 0 20px rgba(160, 100, 255, 0.2);
    }
    .results-album-loot-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .results-album-loot-icon {
      width: 28px;
      height: 28px;
      object-fit: contain;
      filter: drop-shadow(0 0 8px rgba(255, 200, 80, 0.55));
    }
    .results-album-loot-k {
      text-align: center;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(220, 190, 255, 0.95);
    }
    .results-album-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px 10px;
    }
    .results-album-face {
      position: relative;
      width: 72px;
      height: 88px;
      border-radius: 14px;
      background:
        radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.12), transparent 55%),
        rgba(0,0,0,0.4);
      border: 2px solid rgba(255, 210, 100, 0.45);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35), 0 0 14px var(--shard-glow, rgba(126, 208, 255, 0.25));
      overflow: hidden;
      animation: resultsAlbumPop 0.4s cubic-bezier(0.22, 1.35, 0.36, 1) both;
      animation-delay: calc(0.45s + var(--i, 0) * 0.08s);
    }
    .results-album-face.rarity-rare {
      border-color: rgba(255, 200, 80, 0.9);
      box-shadow: 0 3px 0 rgba(0,0,0,0.35), 0 0 18px rgba(255, 180, 40, 0.5);
    }
    .results-album-face.rarity-uncommon {
      border-color: rgba(160, 120, 255, 0.7);
    }
    @keyframes resultsAlbumPop {
      from { opacity: 0; transform: scale(0.5) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .results-album-sprite {
      width: 72px;
      height: 72px;
      background-repeat: no-repeat;
      image-rendering: auto;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45));
    }
    .results-album-sprite-img {
      width: 72px;
      height: 72px;
      object-fit: contain;
      padding: 8px;
    }
    .results-album-face-glow {
      position: absolute;
      inset: 0 0 18px 0;
      pointer-events: none;
      background: radial-gradient(
        circle at 50% 40%,
        color-mix(in srgb, var(--shard-glow, #ffd24a) 28%, transparent),
        transparent 70%
      );
    }
    .results-album-name {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      padding: 2px 3px 3px;
      font-size: 0.48rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-align: center;
      color: #fff6e8;
      background: linear-gradient(180deg, transparent, rgba(0,0,0,0.82) 35%);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.15;
    }
    .results-album-rare-tag {
      position: absolute;
      top: 3px;
      right: 3px;
      font-size: 0.42rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #2a1800;
      background: linear-gradient(180deg, #ffe56a, #f0b020);
      border-radius: 4px;
      padding: 1px 4px;
      z-index: 2;
    }
    .results-album-rare-tag.tag-uncommon {
      color: #f4e8ff;
      background: linear-gradient(180deg, #b080ff, #7040c0);
    }
    .results-album-more {
      width: 48px;
      height: 88px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--muted);
    }
    .results-album-open {
      appearance: none;
      display: block;
      width: 100%;
      margin-top: 10px;
      padding: 8px;
      border: 0;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      color: rgba(220, 200, 255, 0.9);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .results-album-open:active {
      background: rgba(255, 255, 255, 0.12);
    }
    .inline-star {
      width: 12px;
      height: 12px;
      object-fit: contain;
      vertical-align: -1px;
      margin-left: 2px;
    }
    .inline-check {
      width: 12px;
      height: 12px;
      object-fit: contain;
      vertical-align: -2px;
      margin-right: 2px;
    }
    .place-card-meta-stars {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .pier-meta-stars {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .event-mile-flag {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .event-mile-flag.claimed .event-mile-check,
    .event-mile-flag.ready .event-mile-check {
      width: 20px;
      height: 20px;
      object-fit: contain;
    }
    .event-mile-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid rgba(180, 200, 220, 0.45);
      background: transparent;
    }
    /* Place CTA — prop portrait, not a form chip */
    .results-place-cta {
      display: flex !important;
      align-items: center;
      gap: 12px;
      width: 100%;
      max-width: 100%;
      padding: 10px 16px 10px 10px !important;
      border-radius: 18px !important;
      text-align: left;
    }
    .results-place-cta-art {
      width: 52px;
      height: 52px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
      background: rgba(0,0,0,0.2);
      border-radius: 12px;
      padding: 4px;
    }
    .results-place-cta-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .results-place-cta-k {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(40, 24, 0, 0.7);
    }
    .results-place-cta-v {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      color: #2a1800;
      line-height: 1.15;
    }
    .results-reward-text { min-width: 0; }
    .results-reward-k {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .results-reward-v {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.15rem;
      color: #fff6e8;
      margin-top: 2px;
      line-height: 1.15;
    }
    .results-peak-recap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 4px 0 10px;
      padding: 10px 12px;
      border-radius: 16px;
      background:
        radial-gradient(circle at 20% 40%, rgba(90, 200, 210, 0.22), transparent 55%),
        linear-gradient(135deg, rgba(20, 40, 56, 0.95), rgba(12, 10, 28, 0.98));
      border: 2px solid rgba(100, 210, 220, 0.4);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3), 0 0 16px rgba(60, 180, 200, 0.15);
      animation: rewardChipIn 0.4s ease-out 0.28s both;
    }
    .results-peak-icon {
      width: 48px;
      height: 48px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 0 10px rgba(90, 200, 210, 0.55));
    }
    .results-peak-k {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #7ed0ff;
    }
    .results-peak-v {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.05rem;
      color: #fff6e8;
      margin-top: 2px;
    }
    .actic-spotlight {
      position: relative;
      display: block;
      width: 100%;
      min-height: 78px;
      margin: 0 0 12px;
      padding: 0;
      border: 0;
      border-radius: 16px;
      overflow: hidden;
      cursor: pointer;
      text-align: left;
      box-shadow:
        0 4px 0 rgba(0,0,0,0.35),
        0 0 0 2px rgba(90, 200, 210, 0.4),
        0 0 18px rgba(60, 180, 200, 0.2);
      -webkit-tap-highlight-color: transparent;
    }
    .actic-spotlight-art {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .actic-spotlight-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(6, 18, 28, 0.92) 0%, rgba(6, 18, 28, 0.35) 100%);
    }
    .actic-spotlight-body {
      position: relative;
      z-index: 1;
      padding: 14px 16px;
    }
    .actic-spotlight-k {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: #7ed0ff;
    }
    .actic-spotlight-v {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.12rem;
      color: #fff6e8;
      margin-top: 2px;
    }
    .actic-spotlight-meta {
      font-size: 0.72rem;
      font-weight: 700;
      color: rgba(255, 220, 140, 0.9);
      margin-top: 3px;
    }
    .actic-spotlight:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 rgba(0,0,0,0.35), 0 0 0 2px rgba(90, 200, 210, 0.35);
    }
    .event-mile-icon-wrap {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 12px;
      overflow: hidden;
      background:
        radial-gradient(circle at 40% 30%, rgba(255,255,255,0.12), transparent 60%),
        rgba(0,0,0,0.35);
      border: 1.5px solid rgba(255,255,255,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .event-mile-icon {
      width: 32px;
      height: 32px;
      object-fit: contain;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
    }
    .event-mile-icon.ready {
      filter: drop-shadow(0 0 6px rgba(126, 208, 255, 0.6));
    }
    .event-mile-icon.claimed {
      filter: drop-shadow(0 0 6px rgba(80, 220, 140, 0.55));
    }
    .event-mile-at {
      min-width: 36px !important;
      font-size: 0.85rem !important;
    }
    .results-cheer {
      text-align: center;
      font-size: 0.92rem;
      font-weight: 700;
      line-height: 1.35;
      color: rgba(230, 240, 255, 0.88);
      margin: 0 0 4px !important;
      padding: 0 6px;
    }
    .results-fail-hero {
      text-align: center;
      padding: 12px 8px 4px;
    }
    .results-fail-score {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 2rem;
      color: #fff6e8;
      margin-top: 4px;
    }
    .results-fail-copy {
      color: var(--muted) !important;
      font-weight: 700 !important;
      margin: 10px 0 0 !important;
    }
    .panel-results .row {
      margin-top: 14px;
    }
    .panel-results .row .btn {
      min-width: min(100%, 200px);
      flex: 1 1 140px;
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
      border-radius: 0;
      background: transparent;
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
    .cavern-prop.just-placed {
      z-index: 4;
      filter:
        drop-shadow(0 0 18px rgba(255, 220, 100, 0.95))
        drop-shadow(0 6px 14px rgba(0,0,0,0.55));
      animation: propJustPlaced 1.1s cubic-bezier(0.22, 1.3, 0.36, 1) both;
    }
    .cavern-prop.just-placed .cavern-prop-img {
      outline: 2px solid rgba(255, 210, 74, 0.9);
      outline-offset: 3px;
      border-radius: 12px;
    }
    @keyframes propJustPlaced {
      0% { transform: translate(-50%, -50%) scale(0.35); opacity: 0; }
      55% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
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
    /* Soft-currency geode icons (replace ✧ / ◆ pips) */
    .ess-icon {
      display: inline-block;
      vertical-align: -0.28em;
      object-fit: contain;
      flex-shrink: 0;
      pointer-events: none;
      user-select: none;
      filter:
        drop-shadow(0 1px 2px rgba(0,0,0,0.55))
        drop-shadow(0 0 6px rgba(126, 208, 255, 0.4));
    }
    .ess-icon-xs { width: 1.05em; height: 1.05em; min-width: 14px; min-height: 14px; }
    .ess-icon-sm { width: 1.25em; height: 1.25em; min-width: 18px; min-height: 18px; }
    .ess-icon-md { width: 1.7em; height: 1.7em; min-width: 26px; min-height: 26px; }
    .ess-icon-fallback {
      display: inline-block;
      vertical-align: -0.1em;
      color: #ffd24a;
      font-weight: 800;
      line-height: 1;
    }
    .ess-fig {
      display: inline-flex;
      align-items: center;
      gap: 0.22em;
      vertical-align: middle;
      white-space: nowrap;
      line-height: 1.1;
    }
    .ess-fig-n {
      font-variant-numeric: tabular-nums;
      font-weight: 800;
    }
    .ess-line {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.15em 0.2em;
      justify-content: center;
      max-width: 100%;
    }
    .ess-line-wrap {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.2em 0.25em;
      justify-content: center;
    }
    .btn .ess-fig,
    .liveops-chip .ess-fig {
      gap: 0.18em;
    }
    .btn .ess-icon-sm { width: 1.15em; height: 1.15em; }
    .daily-gift-chip.ess-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 1.15rem;
    }
    .cavern-essence .ess-fig {
      color: #b8f0ff;
    }
    .cavern-essence .ess-icon {
      filter:
        drop-shadow(0 1px 2px rgba(0,0,0,0.5))
        drop-shadow(0 0 8px rgba(126, 208, 255, 0.55));
    }
    .goal-banner .ess-line {
      font: inherit;
      color: inherit;
      letter-spacing: inherit;
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
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.2em;
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
      background: transparent;
      border: 1px solid rgba(126, 208, 255, 0.22);
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .cavern-item-img {
      width: 100%; height: 100%;
      object-fit: contain;
      display: block;
      background: transparent;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
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
    /* Ceremonies pinned to game-root — ignore overlay scroll position */
    .ceremony-root-layer.place-ceremony,
    .ceremony-root-layer.stage-complete,
    .ceremony-root-layer.geode-crack,
    .ceremony-root-layer.daily-gift {
      position: absolute;
      inset: 0;
      z-index: 60;
    }
    .place-ceremony {
      position: absolute; inset: 0;
      z-index: 40;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-end;
      padding: max(20px, env(safe-area-inset-top, 0px))
        max(16px, env(safe-area-inset-right, 0px))
        max(28px, env(safe-area-inset-bottom, 0px))
        max(16px, env(safe-area-inset-left, 0px));
      background: rgba(2, 4, 12, 0.88);
      animation: placeFadeIn 0.25s ease-out;
    }
    @keyframes placeFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .place-ceremony-still {
      object-fit: cover;
      filter: brightness(0.72) saturate(1.05);
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
      background: transparent;
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
    .place-ceremony.place-pride .place-ceremony-prop {
      filter: drop-shadow(0 12px 28px rgba(255, 200, 80, 0.55));
    }
    .place-pride-kicker {
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.78rem;
      letter-spacing: 0.16em;
      color: #ffe56a;
      text-shadow: 0 0 16px rgba(255, 200, 60, 0.55);
      margin-bottom: 8px;
    }
    .place-pride-sparks {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      overflow: hidden;
    }
    .place-pride-spark {
      position: absolute;
      left: var(--x);
      bottom: 18%;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ffe56a;
      opacity: 0;
      animation: placePrideSpark 1.4s ease-out var(--delay) infinite;
      box-shadow: 0 0 8px #ffd24a;
    }
    @keyframes placePrideSpark {
      0% { opacity: 0; transform: translateY(20px) scale(0.4); }
      30% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-120px) scale(1.1); }
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
    /* Boot splash — studio plate then product */
    .boot-studio {
      text-align: center;
      padding: 28px 20px;
      animation: bootStudioWipe 1.05s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .boot-studio-mark {
      width: 72px;
      height: 72px;
      margin: 0 auto 16px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-title);
      font-weight: 800;
      font-size: 1.35rem;
      letter-spacing: 0.04em;
      color: #e8f4ff;
      background:
        linear-gradient(145deg, rgba(80, 160, 220, 0.55), rgba(20, 40, 70, 0.9));
      border: 1px solid rgba(160, 210, 255, 0.35);
      box-shadow:
        0 0 40px rgba(80, 160, 220, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    .boot-studio-name {
      font-family: var(--font-title);
      font-size: clamp(1.05rem, 4.2vw, 1.35rem);
      font-weight: 800;
      letter-spacing: 0.14em;
      color: #dcecff;
      text-shadow: 0 2px 12px rgba(60, 140, 200, 0.45);
      margin-bottom: 8px;
    }
    .boot-studio-line {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(180, 210, 235, 0.72);
    }
    @keyframes bootStudioWipe {
      0% {
        opacity: 0;
        transform: translateY(28px) scale(0.96);
        filter: blur(4px);
      }
      55% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .boot-splash {
      text-align: center;
      padding: 24px;
      animation: panelIn 0.45s ease-out both;
    }
    .boot-studio-kicker {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(180, 210, 240, 0.75);
      margin-bottom: 10px;
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
    .title-studio {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(170, 200, 230, 0.78);
      text-align: center;
      margin-bottom: 6px;
    }
    .studio-foot {
      margin-top: 14px;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: rgba(150, 175, 200, 0.55);
      text-align: center;
    }
    .studio-kicker {
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(160, 195, 225, 0.7) !important;
      text-align: center;
      margin: 0 0 4px !important;
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
    /* Continue — peak loss-aversion ceremony */
    .panel-continue {
      text-align: center;
    }
    .continue-ceremony {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin: 4px 0 8px;
      padding: 18px 14px 16px;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(255, 180, 60, 0.22), transparent 55%),
        linear-gradient(180deg, rgba(40, 28, 70, 0.95), rgba(12, 8, 28, 0.98));
      border: 3px solid rgba(255, 210, 74, 0.5);
      box-shadow: 0 6px 0 rgba(0,0,0,0.4), 0 0 28px rgba(255, 180, 40, 0.2);
      animation: resultsHeroIn 0.4s cubic-bezier(0.22, 1.2, 0.36, 1) both;
    }
    .continue-kicker {
      font-family: "ScreenTechno", "Fredoka", system-ui, sans-serif;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      color: #ffc878;
    }
    .continue-pct-ring {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 4px 0;
      background: radial-gradient(circle at 40% 35%, rgba(255, 230, 140, 0.35), transparent 55%),
        rgba(0,0,0,0.35);
      border: 3px solid rgba(255, 210, 74, 0.75);
      box-shadow: 0 0 24px rgba(255, 190, 60, 0.35), inset 0 2px 0 rgba(255,255,255,0.15);
    }
    .continue-pct {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 700;
      color: #ffd24a;
      text-shadow: 0 2px 0 rgba(0,0,0,0.45);
      min-width: 0;
      text-align: center;
      line-height: 1;
    }
    .continue-pct-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 240, 220, 0.7);
      margin-top: 4px;
    }
    .continue-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.35rem;
      color: #fff6e8;
      margin: 4px 0 0;
    }
    .continue-sub {
      margin: 0 !important;
      font-size: 0.9rem !important;
      font-weight: 700 !important;
      color: rgba(230, 220, 255, 0.85) !important;
    }
    .panel-continue .row {
      flex-direction: column;
      align-items: stretch;
    }
    .panel-continue .row .btn {
      width: 100%;
    }
    /* Continue / lives heroes (legacy + lives screen) */
    .continue-hero, .lives-hero {
      display: flex; align-items: center; gap: 14px;
      margin: 4px 0 12px;
      padding: 14px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(90, 50, 160, 0.4), rgba(20, 12, 40, 0.95));
      border: 2px solid rgba(255, 210, 74, 0.35);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35);
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
    .lives-heart-img {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));
    }
    .life-spent-icon {
      width: 72px;
      height: 72px;
      object-fit: contain;
      display: block;
      margin: 0 auto 4px;
      filter: drop-shadow(0 4px 10px rgba(180, 40, 80, 0.45));
      animation: lifeSpentIn 0.55s ease-out both;
    }
    .life-spent-icon-sm {
      width: 40px;
      height: 40px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }
    .life-spent-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 6px 0 4px;
    }
    .life-spent-copy {
      margin: 0;
      font-weight: 700;
      color: rgba(255, 200, 210, 0.92);
    }
    @keyframes lifeSpentIn {
      0% { transform: scale(0.4); opacity: 0; }
      60% { transform: scale(1.12); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
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
    /* ---- Play tools: free-floating (no dock box) ---- */
    .play-dock {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 0 auto max(10px, env(safe-area-inset-bottom, 0px));
      padding: 0 18px 8px;
      pointer-events: auto;
      background: transparent;
      border: none;
      box-shadow: none;
    }
    .play-dock-float {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      /* Sit in the reserved tool band under the board (~11% of stage) */
      padding: 0 18px max(14px, env(safe-area-inset-bottom, 0px));
      margin: 0;
      z-index: 12;
      pointer-events: none; /* only children receive taps */
    }
    .play-dock-tools {
      display: flex;
      gap: 10px;
      flex: 1;
    }
    .play-dock-tools-float {
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      pointer-events: auto;
    }
    .play-dock .play-tool {
      flex: 1;
      min-width: 0;
      font-size: 1rem;
      padding: 14px 12px;
      min-height: 52px;
    }
    .play-dock .play-tool-art {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 8px 10px 6px;
      min-height: 72px;
      background:
        radial-gradient(circle at 40% 20%, rgba(255, 220, 140, 0.18), transparent 55%),
        linear-gradient(180deg, rgba(50, 36, 90, 0.98), rgba(18, 12, 36, 0.99));
      border: 2px solid rgba(201, 162, 39, 0.45);
    }
    .play-dock .play-tool-float {
      flex: 0 0 auto;
      width: 64px;
      min-height: 68px;
      border-radius: 18px;
      background:
        radial-gradient(circle at 40% 18%, rgba(255, 230, 160, 0.28), transparent 50%),
        linear-gradient(180deg, rgba(48, 34, 88, 0.92), rgba(14, 10, 30, 0.94));
      border: 2px solid rgba(255, 210, 100, 0.55);
      box-shadow:
        0 5px 0 rgba(0,0,0,0.4),
        0 10px 22px rgba(0,0,0,0.35),
        0 0 18px rgba(255, 180, 60, 0.12);
    }
    .play-dock .play-tool-art .play-tool-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));
      pointer-events: none;
    }
    .play-dock .play-tool-float .play-tool-img {
      width: 38px;
      height: 38px;
    }
    .play-dock .play-tool-art .play-tool-count {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.85rem;
      color: #ffe9a8;
      line-height: 1;
      text-shadow: 0 1px 0 rgba(0,0,0,0.55);
    }

    .play-dock .play-tool-art.free .play-tool-count {
      color: #7dffb0;
    }
    .play-dock .play-tool-art.is-disabled {
      opacity: 0.42;
      filter: grayscale(0.35);
    }
    .play-dock .play-tool.armed {
      animation: nextPulse 1.2s ease-in-out infinite;
      border-color: #ffe06a !important;
      box-shadow: 0 0 16px rgba(255, 200, 80, 0.45);
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
    .play-dock .play-pause-float {
      width: 58px;
      min-height: 58px;
      border-radius: 50%;
      font-size: 1.05rem;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      background:
        radial-gradient(circle at 35% 25%, rgba(255, 230, 160, 0.35), transparent 50%),
        linear-gradient(180deg, #5a4090, #241848);
      border: 2px solid rgba(255, 210, 100, 0.65);
      box-shadow:
        0 5px 0 rgba(0,0,0,0.4),
        0 0 20px rgba(255, 180, 60, 0.2);
    }
    .shop-wallet-icon {
      width: 28px;
      height: 28px;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
    }
    .shop-wallet-chip {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-inline-icon {
      width: 1.35em;
      height: 1.35em;
      object-fit: contain;
      vertical-align: -0.28em;
      margin-right: 2px;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
      pointer-events: none;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
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
      padding: max(12px, env(safe-area-inset-top, 0px))
        max(12px, env(safe-area-inset-right, 0px))
        max(12px, env(safe-area-inset-bottom, 0px))
        max(12px, env(safe-area-inset-left, 0px));
      background: rgba(2, 4, 12, 0.86);
      backdrop-filter: blur(7px);
      animation: placeFadeIn 0.28s ease-out;
      overflow: hidden;
      box-sizing: border-box;
    }
    .geode-crack-card {
      width: 100%;
      max-width: min(360px, 100%);
      min-width: 0;
      padding: 16px 12px 14px;
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
      overflow: hidden;
      box-sizing: border-box;
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
      /* minmax(0,1fr) is required — default min-width:auto lets 320px imgs blow out right */
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 14px 0 12px;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    .geode-slot {
      appearance: none;
      -webkit-appearance: none;
      border: 2px solid rgba(201, 162, 39, 0.5);
      border-radius: 16px;
      padding: 8px 4px 10px;
      min-width: 0;
      width: 100%;
      max-width: 100%;
      min-height: 0;
      cursor: pointer;
      background:
        radial-gradient(circle at 40% 25%, rgba(126, 208, 255, 0.28), transparent 55%),
        linear-gradient(180deg, #2a2050, #121028);
      color: var(--text);
      box-shadow: 0 4px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
      font-family: var(--font-body);
      transition: transform 0.15s, filter 0.15s, border-color 0.2s;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 2px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .geode-slot:active:not(:disabled) {
      transform: translateY(2px);
      box-shadow: 0 2px 0 rgba(0,0,0,0.35);
    }
    .geode-slot-art {
      position: relative;
      /* Fill the grid cell; never force a fixed 88px that blows out narrow cards */
      width: 100%;
      max-width: 100%;
      aspect-ratio: 1 / 1;
      height: auto;
      margin: 0 auto 2px;
      display: block;
      overflow: hidden;
      flex: 0 0 auto;
    }
    .geode-slot-aura {
      position: absolute;
      inset: 10% 14%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(160, 220, 255, 0.5), transparent 70%);
      animation: geodeAura 2.4s ease-in-out infinite;
      animation-delay: var(--float-delay, 0s);
      pointer-events: none;
      z-index: 1;
    }
    .geode-slot-img {
      position: absolute;
      inset: 4%;
      z-index: 2;
      display: block;
      width: 92%;
      height: 92%;
      max-width: 100%;
      max-height: 100%;
      margin: auto;
      object-fit: contain;
      object-position: center;
      animation: geodeFloat 2.8s ease-in-out infinite;
      animation-delay: var(--float-delay, 0s);
      /* Distinct living veins: slight hue drift per slot */
      filter:
        hue-rotate(calc(var(--vein-i, 0) * 28deg))
        drop-shadow(0 4px 8px rgba(0,0,0,0.5))
        drop-shadow(0 0 10px rgba(126, 208, 255, 0.4));
      pointer-events: none;
      user-select: none;
    }
    .geode-slot-art.cracked .geode-slot-img {
      animation: geodeFloat 2.2s ease-in-out infinite, geodeCrackPop 0.45s ease-out both;
      filter:
        hue-rotate(calc(var(--vein-i, 0) * 28deg))
        drop-shadow(0 4px 8px rgba(0,0,0,0.5))
        drop-shadow(0 0 16px rgba(255, 210, 74, 0.7))
        brightness(1.12);
    }
    .geode-slot-art.miss .geode-slot-img,
    .geode-slot.miss .geode-slot-img {
      animation: none;
      filter: grayscale(0.75) brightness(0.55) drop-shadow(0 3px 5px rgba(0,0,0,0.4));
      opacity: 0.7;
    }
    .geode-slot.miss .geode-slot-aura { opacity: 0.15; animation: none; }
    .geode-slot-sparks {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      overflow: hidden;
    }
    .geode-spark {
      position: absolute;
      left: 50%;
      top: 50%;
      font-size: 0.5rem;
      color: #b8f0ff;
      opacity: 0;
      text-shadow: 0 0 6px currentColor;
      animation: geodeSpark 2.6s ease-in-out infinite;
      animation-delay: var(--delay, 0s);
    }
    .geode-slot-glyph {
      font-size: 1.6rem;
      line-height: 1.2;
      filter: drop-shadow(0 0 8px rgba(126, 208, 255, 0.5));
    }
    .geode-slot-label {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: 2px;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .geode-slot-label.cracked-label {
      color: #ffd24a;
    }
    .geode-slot-reward {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.95rem;
      color: #ffd24a;
      margin-top: 2px;
      text-shadow: 0 0 10px rgba(255, 210, 74, 0.45);
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .geode-slot.cracked {
      border-color: rgba(255, 210, 74, 0.75);
      pointer-events: none;
      animation: propPlace 0.4s ease-out both;
      background:
        radial-gradient(circle at 40% 25%, rgba(255, 210, 74, 0.22), transparent 55%),
        linear-gradient(180deg, #3a2860, #161028);
    }
    .geode-slot.jackpot {
      box-shadow: 0 0 20px rgba(255, 200, 60, 0.55), 0 4px 0 rgba(0,0,0,0.35);
    }
    .geode-slot.miss {
      opacity: 0.55;
      pointer-events: none;
    }
    .geode-crack-card .btn { width: 100%; max-width: 100%; }
    .geode-crack-card .companion-bubble {
      margin-top: 0;
      max-width: 100%;
    }
    @keyframes geodeFloat {
      0%, 100% { transform: translateY(0) rotate(-1.5deg) scale(0.96); }
      50% { transform: translateY(-4px) rotate(1.5deg) scale(0.96); }
    }
    @keyframes geodeAura {
      0%, 100% { opacity: 0.45; transform: scale(0.9); }
      50% { opacity: 0.9; transform: scale(1.05); }
    }
    @keyframes geodeCrackPop {
      0% { transform: scale(0.88); }
      55% { transform: scale(1.06); }
      100% { transform: scale(0.96); }
    }
    @keyframes geodeSpark {
      0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
      20% { opacity: 0.95; }
      100% {
        transform: translate(
          calc(-50% + (var(--i, 0) - 1.5) * 12px),
          calc(-50% - 22px - var(--i, 0) * 3px)
        ) scale(0.35);
        opacity: 0;
      }
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
    .album-hero {
      position: relative;
      width: 100%;
      height: 96px;
      border-radius: 16px;
      overflow: hidden;
      margin: 0 0 12px;
      border: 2px solid rgba(201, 162, 39, 0.4);
      box-shadow: 0 4px 0 rgba(0,0,0,0.3);
    }
    .album-hero-art {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .album-hero-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(8, 6, 20, 0.88) 0%, rgba(8, 6, 20, 0.35) 100%);
    }
    .album-hero-body {
      position: relative;
      z-index: 1;
      padding: 18px 16px;
    }
    .album-hero-k {
      font-size: 0.66rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: rgba(200, 230, 255, 0.75);
    }
    .album-hero-v {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.15rem;
      color: #fff6e8;
      margin-top: 2px;
    }
    .album-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 12px 0;
    }
    .album-slot {
      padding: 10px 8px 12px;
      border-radius: 16px;
      text-align: center;
      background:
        radial-gradient(circle at 50% 28%, var(--shard-glow, rgba(126,208,255,0.2)), transparent 55%),
        linear-gradient(180deg, rgba(40, 30, 70, 0.95), rgba(12, 8, 28, 0.98));
      border: 2px solid rgba(180, 140, 255, 0.22);
      box-shadow: 0 3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);
      transition: transform 0.15s, border-color 0.2s;
    }
    .album-slot:not(.locked):active {
      transform: scale(0.97);
    }
    .album-slot.locked {
      filter: saturate(0.35);
    }
    .album-slot.done {
      border-color: rgba(255, 210, 74, 0.65);
      box-shadow:
        0 0 16px rgba(255, 180, 40, 0.28),
        0 3px 0 rgba(0,0,0,0.3),
        inset 0 0 20px rgba(255, 210, 74, 0.08);
    }
    .album-slot.rarity-uncommon {
      border-color: rgba(126, 208, 255, 0.45);
    }
    .album-slot.rarity-rare {
      border-color: rgba(255, 180, 80, 0.6);
      box-shadow:
        0 0 18px rgba(255, 160, 40, 0.3),
        0 3px 0 rgba(0,0,0,0.3);
    }
    .album-rarity-tag {
      font-size: 0.55rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: var(--muted);
    }
    .album-rarity-tag.uncommon { color: #7ed0ff; }
    .album-rarity-tag.rare { color: #ffd24a; }
    /* Living crystal shard stage */
    .album-shard-stage {
      position: relative;
      width: 78px;
      height: 86px;
      margin: 0 auto 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .album-shard-aura {
      position: absolute;
      inset: 8% 12%;
      border-radius: 50%;
      background: radial-gradient(circle, var(--shard-glow-soft, rgba(126,208,255,0.45)), transparent 70%);
      animation: shardAura 2.4s ease-in-out infinite;
      pointer-events: none;
    }
    .album-shard-stage.empty .album-shard-aura {
      opacity: 0.25;
      animation: none;
    }
    .album-shard-sprite {
      position: relative;
      z-index: 2;
      width: 72px;
      height: 72px;
      background-repeat: no-repeat;
      image-rendering: auto;
      filter:
        drop-shadow(0 6px 10px rgba(0,0,0,0.55))
        drop-shadow(0 0 10px var(--shard-glow-soft, rgba(126,208,255,0.4)));
      animation: shardFloat 2.8s ease-in-out infinite;
      animation-delay: var(--float-delay, 0s);
    }
    .album-slot.locked .album-shard-sprite {
      filter: grayscale(0.85) brightness(0.55) drop-shadow(0 4px 6px rgba(0,0,0,0.4));
      animation: none;
      opacity: 0.55;
    }
    .album-slot.done .album-shard-sprite {
      animation: shardFloat 2.2s ease-in-out infinite, shardShine 3s ease-in-out infinite;
    }
    .album-shard-core {
      position: absolute;
      z-index: 1;
      width: 56px;
      height: 56px;
      object-fit: cover;
      object-position: 0 0;
      border-radius: 50%;
      opacity: 0.85;
      filter: drop-shadow(0 0 12px rgba(255, 220, 100, 0.6));
      animation: shardSpin 6s linear infinite;
      pointer-events: none;
    }
    .album-slot.locked .album-shard-core {
      animation: none;
      opacity: 0.25;
      filter: grayscale(1);
    }
    .album-shard-sparks {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      overflow: hidden;
    }
    .album-spark {
      position: absolute;
      left: 50%;
      top: 50%;
      font-size: 0.55rem;
      color: var(--shard-glow, #7ed0ff);
      opacity: 0;
      text-shadow: 0 0 6px currentColor;
      animation: albumSpark 2.6s ease-in-out infinite;
      animation-delay: var(--delay, 0s);
    }
    .album-slot.locked .album-spark { display: none; }
    .album-shard-meter {
      position: absolute;
      left: 10%;
      right: 10%;
      bottom: 0;
      height: 5px;
      border-radius: 999px;
      background: rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.12);
      overflow: hidden;
      z-index: 4;
    }
    .album-shard-meter-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--shard-glow, #5ec8ff), #ffd24a);
      box-shadow: 0 0 8px var(--shard-glow-soft, rgba(126,208,255,0.5));
      transition: width 0.4s ease;
      min-width: 0;
    }
    @keyframes shardFloat {
      0%, 100% { transform: translateY(0) rotate(-2deg); }
      50% { transform: translateY(-7px) rotate(2deg); }
    }
    @keyframes shardAura {
      0%, 100% { opacity: 0.55; transform: scale(0.92); }
      50% { opacity: 1; transform: scale(1.08); }
    }
    @keyframes shardShine {
      0%, 100% { filter:
        drop-shadow(0 6px 10px rgba(0,0,0,0.55))
        drop-shadow(0 0 10px var(--shard-glow-soft, rgba(126,208,255,0.4))); }
      50% { filter:
        drop-shadow(0 6px 10px rgba(0,0,0,0.55))
        drop-shadow(0 0 18px var(--shard-glow, #ffd24a)); }
    }
    @keyframes shardSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes albumSpark {
      0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
      20% { opacity: 0.9; }
      100% {
        transform:
          translate(
            calc(-50% + (var(--i) - 2) * 14px),
            calc(-50% - 28px - var(--i) * 4px)
          )
          scale(1);
        opacity: 0;
      }
    }
    .album-name {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.72rem;
      color: #fff6e8;
      line-height: 1.15;
      min-height: 2.1em;
    }
    .album-count {
      font-size: 0.72rem;
      font-weight: 800;
      color: #7ed0ff;
      margin-top: 3px;
    }
    .album-slot.done .album-count { color: #ffd24a; }
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
    .event-hero.event-hero-artful {
      position: relative;
      overflow: hidden;
      min-height: 92px;
      padding: 16px 18px;
      border-color: rgba(100, 200, 220, 0.4);
      background: rgba(8, 16, 28, 0.9);
    }
    .event-hero-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.55;
    }
    .event-hero-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, rgba(6, 12, 24, 0.9) 0%, rgba(6, 12, 24, 0.45) 100%);
    }
    .event-hero-artful .event-hero-pts,
    .event-hero-artful .event-hero-copy {
      position: relative;
      z-index: 1;
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
    .event-hero-sub {
      font-size: 0.78rem;
      font-weight: 700;
      color: rgba(200, 220, 240, 0.8);
      margin-top: 2px;
    }
    .event-tagline {
      font-size: 0.9rem !important;
      margin-bottom: 10px !important;
    }
    /* Act I-C unlock ceremony */
    .actic-unlock {
      position: absolute;
      inset: 0;
      z-index: 70;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(2, 6, 14, 0.9);
    }
    .actic-unlock-card {
      width: min(100%, 360px);
      text-align: center;
      padding: 18px 16px 16px;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 50% 0%, rgba(90, 200, 210, 0.2), transparent 55%),
        linear-gradient(165deg, #1a3048, #0a1420 60%);
      border: 3px solid rgba(100, 210, 220, 0.55);
      box-shadow:
        0 12px 0 rgba(0,0,0,0.4),
        0 0 40px rgba(60, 180, 200, 0.25);
    }
    .actic-unlock-art {
      width: 100%;
      height: 140px;
      object-fit: cover;
      border-radius: 14px;
      margin-bottom: 12px;
      border: 1.5px solid rgba(255,255,255,0.12);
    }
    .actic-unlock-kicker {
      font-family: var(--font-display);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: #7ed0ff;
      margin-bottom: 4px;
    }
    .actic-unlock-title {
      font-family: var(--font-title);
      font-size: 1.35rem;
      color: #fff6e8;
      margin: 0 0 8px;
      text-shadow: 0 2px 0 #1a3040;
    }
    .actic-unlock-sub {
      font-size: 0.88rem;
      color: var(--muted);
      margin: 0 0 8px;
      line-height: 1.35;
      font-weight: 700;
    }
    .actic-unlock-meta {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: rgba(255, 210, 100, 0.85);
      margin-bottom: 14px;
    }
    .actic-unlock-card .btn {
      width: 100%;
    }
    .actic-sparks {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }
    .actic-spark {
      position: absolute;
      left: var(--x);
      bottom: 20%;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #7ed0ff;
      opacity: 0;
      box-shadow: 0 0 8px #5ec8d4;
      animation: acticSpark 1.6s ease-out var(--delay) infinite;
    }
    @keyframes acticSpark {
      0% { opacity: 0; transform: translateY(12px) scale(0.4); }
      25% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-70px) scale(1.1); }
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

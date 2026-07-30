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
      --bg: #04060c;
      --panel: rgba(16, 22, 42, 0.92);
      --panel-2: rgba(28, 36, 68, 0.94);
      --text: #f2f6ff;
      --muted: #a7b6d4;
      --accent: #7ed0ff;
      --gold: #ffd679;
      --danger: #ff6b7a;
      --ok: #5ce0a0;
      --sim: #ff9a62;
      /*
       * Hybrid display stack:
       *  - title  = Galactic Knights (readable epic wordmark)
       *  - display = Diamond Shape (crystal / match-3 CTA punch)
       *  - body   = Nunito (or body.woff2 when present)
       */
      --font-title: "GalacticKnights", "CrystallineDisplay", "Cinzel", serif;
      --font-display: "CrystallineDisplay", "GalacticKnights", "Cinzel", "Palatino Linotype", serif;
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
      /* Full-bleed cavern behind the phone frame */
      background:
        linear-gradient(180deg, rgba(4,6,14,0.35), rgba(4,6,14,0.75)),
        url("./bg/mine-cavern.jpg") center / cover no-repeat,
        #04060c;
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
        border-radius: 16px;
        box-shadow:
          0 0 0 3px rgba(120, 170, 255, 0.18),
          0 0 0 8px rgba(10, 14, 28, 0.85);
      }
    }
    .overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: clamp(12px, 3vw, 28px);
      background:
        radial-gradient(ellipse at 50% 20%, rgba(60,40,120,0.25), transparent 55%),
        rgba(4, 8, 18, 0.62);
      backdrop-filter: blur(8px);
      z-index: 10;
      overflow: auto;
    }
    .overlay.hidden { display: none; }
    .panel {
      width: min(100%, 460px);
      background:
        linear-gradient(165deg, rgba(40,52,92,0.95), rgba(14,18,36,0.96) 55%, rgba(10,14,28,0.98));
      border: 1px solid rgba(140, 200, 255, 0.28);
      border-radius: 22px;
      padding: 22px 20px 18px;
      box-shadow:
        0 20px 50px rgba(0,0,0,0.55),
        inset 0 1px 0 rgba(255,255,255,0.08);
    }
    .panel h1, .panel h2 {
      margin: 0 0 8px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .panel h1 {
      font-family: var(--font-title);
      font-size: clamp(1.55rem, 4.5vw, 2.05rem);
      color: #c9ecff;
      text-shadow: 0 0 28px rgba(126, 208, 255, 0.4);
      letter-spacing: 0.06em;
    }
    .panel h2 {
      font-size: 1.12rem;
      color: #ffe6a8;
      font-family: var(--font-display);
    }
    .panel p {
      margin: 0 0 12px;
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.98rem;
      font-weight: 600;
    }
    .sim-badge {
      display: inline-block;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: rgba(255,230,200,0.75);
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,154,98,0.35);
      border-radius: 999px;
      padding: 4px 10px;
      margin-bottom: 12px;
    }
    .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .btn {
      appearance: none; border: 0; cursor: pointer;
      border-radius: 14px;
      padding: 13px 18px;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.03em;
      color: #061018;
      background: linear-gradient(180deg, #b4ecff, #3aa8ff 60%, #2b7fd4);
      box-shadow:
        0 4px 0 #14507a,
        0 8px 18px rgba(40, 140, 255, 0.28);
      transition: transform 0.06s ease, filter 0.12s ease;
    }
    .btn:hover { filter: brightness(1.06); }
    .btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #14507a; }
    .btn.secondary {
      color: var(--text);
      background: linear-gradient(180deg, #3a466e, #1c2440 70%);
      box-shadow: 0 4px 0 #0a1020;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn.danger {
      background: linear-gradient(180deg, #ffb0b8, #ff5a6a 65%, #d03040);
      box-shadow: 0 4px 0 #7a1820;
    }
    .btn.gold {
      background: linear-gradient(180deg, #ffe6a0, #f0b020 65%, #c88810);
      color: #2a1800;
      box-shadow: 0 4px 0 #7a5010;
    }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; filter: grayscale(0.3); }
    .booster-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0 4px;
    }
    .booster-chip {
      appearance: none;
      border: 1px solid rgba(140,200,255,0.22);
      border-radius: 14px;
      padding: 10px 12px;
      text-align: left;
      cursor: pointer;
      color: var(--text);
      background: rgba(0,0,0,0.28);
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 0.86rem;
      transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
    }
    .booster-chip .meta {
      display: block;
      margin-top: 2px;
      font-size: 0.72rem;
      color: var(--muted);
      font-weight: 600;
    }
    .booster-chip.on {
      border-color: rgba(126, 208, 255, 0.75);
      background: rgba(50, 100, 180, 0.35);
      box-shadow: 0 0 0 1px rgba(126,208,255,0.25), 0 0 16px rgba(80,160,255,0.2);
    }
    .booster-chip:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 12px 0;
    }
    .stat {
      background: rgba(0,0,0,0.28);
      border-radius: 12px;
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .stat .k {
      font-size: 0.68rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 800;
    }
    .stat .v {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--gold);
      margin-top: 2px;
    }
    .map-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      max-height: min(52vh, 420px);
      overflow: auto;
      margin: 14px 0;
      padding: 4px;
    }
    .level-node {
      aspect-ratio: 1;
      border-radius: 14px;
      border: 1px solid rgba(160, 200, 255, 0.16);
      background:
        radial-gradient(circle at 30% 25%, rgba(100,160,255,0.18), transparent 55%),
        linear-gradient(160deg, #243058, #141a30);
      color: var(--text);
      font-family: var(--font-display);
      font-weight: 700;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      font-size: 1.05rem;
      line-height: 1.1;
      padding: 4px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
    }
    .level-node .level-stars {
      font-size: 0.7rem;
      color: var(--gold);
      letter-spacing: 0.05em;
      min-height: 0.9em;
      font-family: var(--font-body);
    }
    .level-node.locked { opacity: 0.32; cursor: not-allowed; }
    .level-node.current {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(110,203,255,0.4), 0 0 20px rgba(80,160,255,0.25);
    }
    .sku {
      display: flex; justify-content: space-between; align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 14px;
      background: rgba(0,0,0,0.28);
      margin-bottom: 8px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .sku .name { font-weight: 800; font-family: var(--font-display); letter-spacing: 0.02em; }
    .sku .blurb { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
    .tag {
      font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
      color: #1a1000; background: var(--gold); border-radius: 6px; padding: 2px 6px;
      margin-left: 6px;
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
    .btn.gold {
      font-size: 1.15rem;
      padding: 16px 28px;
      letter-spacing: 0.08em;
    }
  `;
  document.head.appendChild(el);
}

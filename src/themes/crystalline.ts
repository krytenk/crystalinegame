/**
 * Default theme pack — Crystalline (crystal-mine IP). Existing product surface.
 */

import type { ThemeConfig } from './types';
import { ALBUM_CARDS, ALBUM_SHEET } from '@economy/album';
import { META_STAGES, META_UPGRADES } from '@economy/meta';

export const crystallineTheme: ThemeConfig = {
  id: 'crystalline',
  productName: 'Crystalline',
  tagline: 'Match gems. Forge power. Furnish the living mine.',
  storagePrefix: 'crystalline',
  saveKey: 'crystalline.save',
  ahaKey: 'crystalline.ahaDone',
  adShortKey: 'crystalline.adShortIndex',
  softCurrencyName: 'Essence',
  softCurrencyGlyph: '✧',
  premiumCurrencyName: 'Shards',
  metaHubName: 'Crystal Cavern',
  metaHubCta: 'Your Cavern',
  assetRoot: '',
  bgPath: 'bg/mine-cavern-720.webp',
  genManifestPath: 'gen/manifest.json',
  albumSheet: ALBUM_SHEET,
  livingCorePath: 'gen/living_core.webp',
  companion: {
    id: 'geode-warden',
    name: 'Geode Warden',
    role: 'Cavern guide',
    art: 'characters/geode-warden.webp',
    lines: {
      title: [
        'The mountain remembers your steps. Dive when ready.',
        'Match, forge, furnish — I keep the lamps lit.',
        'A clear board feeds the cavern. Shall we?',
      ],
      titleFirst: [
        'First light in the mine. Swap four to forge a power.',
        'Welcome, prospector. I will show you the veins.',
      ],
      win: [
        'Clean cut! Essence drips into the cavern.',
        'The galleries hum for you — well dug.',
        'Another chamber yields. Onward, carefully.',
      ],
      winPerfect: [
        'Three stars — the geode sings. Discovery bonus sealed.',
        'Flawless work. The Deep will hear of this.',
      ],
      lose: [
        'The vein closed early. Breathe — lives return.',
        'Almost. The rock is patient; so are we.',
        'Not this path. Try another cut.',
      ],
      daily: [
        'A daily parcel from the guild. Claim it, friend.',
        'Welcome back. The mine left you a stipend.',
      ],
      cavern: [
        'Place what you can afford — the vista grows with you.',
        'Furnish the open stage. Ghost slots mark what is next.',
      ],
      cavernReady: [
        'You can place a piece right now. Look at the shop below.',
        'Essence is ready — seal it into the chamber.',
      ],
      geode: [
        'Tap a sealed geode. One hides a richer crack.',
        'Three veins. Trust your pick — I will not spoil it.',
      ],
      geodeResult: [
        'Sparkles for the cavern fund!',
        'A fine crack. Bank it and keep diving.',
        'Jackpot vein! The Warden is impressed.',
      ],
      coreSpire: [
        'Core Spire — the mountain’s spine. Conveyors never sleep.',
        'Deep chambers. Steady hands. I am with you still.',
      ],
      streak: [
        'The streak holds. Don’t rush the rock.',
        'Heat in the lamp glass — keep the chain clean.',
      ],
    },
  },
  metaStages: META_STAGES,
  metaUpgrades: META_UPGRADES,
  albumCards: ALBUM_CARDS,
  mapChapters: [
    { roman: 'I', title: 'Mouth of the Mine', depth: 'shallow', minId: 1, maxId: 10 },
    { roman: 'II', title: 'Prism Gallery', depth: 'mid', minId: 11, maxId: 20 },
    { roman: 'III', title: 'Deep Geode', depth: 'deep', minId: 21, maxId: 30 },
    { roman: 'IV', title: 'Core Spire', depth: 'core', minId: 31, maxId: 999 },
  ],
  storeCopy: {},
  palette: {
    ember: '#ad4457',
    aurum: '#bd7032',
    solar: '#ae8d45',
    verdant: '#357a65',
    tidal: '#3e7ab3',
    void: '#94529a',
  },
  labels: {
    powerCrystal: 'Power Crystal',
    livingCore: 'Living Core',
    conveyorActive: 'Conveyor row active',
    slowBelt: 'Slow the belt',
    idleClaim: 'Cavern idle',
    bonusCrack: 'Geode crack',
    eventName: 'Mine Rush',
    dailyGoal: 'Daily dive',
    albumTitle: 'Endless Album',
    playCta: 'DIVE',
    mapTitle: 'The Mine',
  },
  cssVars: {},
  bonusCrackName: 'Geode',
  versionLabel: 'Crystalline v0.1.0 · portfolio demo',
};

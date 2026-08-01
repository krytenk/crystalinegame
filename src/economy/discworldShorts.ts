/**
 * CRYSTALLINE — Discworld in 60 Seconds YouTube Shorts ad inventory.
 *
 * Rotating playlist of @discworldin60seconds shorts used as the
 * simulated interstitial / rewarded "ad" creative. Not a real ad network:
 * we embed public YouTube videos the player already owns the channel for.
 *
 * Playlist source: channel uploads + Shorts shelf (verified via oEmbed).
 */

export interface DiscworldShort {
  readonly id: string;
  /** Optional human label for UI chrome. */
  readonly title?: string;
}

/**
 * Curated video IDs from Discworld in 60 seconds.
 * Keep this list embeddable Shorts / ~60s retellings.
 */
export const DISCWORLD_SHORTS: readonly DiscworldShort[] = [
  { id: '0h39o_zE6FQ' },
  { id: '0nmEbeco0GI' },
  { id: '13BQfcvsp5E' },
  { id: '2fGQAh7_8vc' },
  { id: '2y9EN24VN8c' },
  { id: '4cklhoGWVTc' },
  { id: '5pahmoVOnoQ' },
  { id: '5SkCG0DVcL8' },
  { id: '7TV2y_Irqug' },
  { id: '82C_VGT9aAg' },
  { id: '87WMtjnUwso' },
  { id: '8Ik7Y6dLAbg' },
  { id: '8JglXFrhsVw' },
  { id: '9EJ_YINyA2k' },
  { id: 'au_PGxMeKSc' },
  { id: 'bVL_3c2WryY' },
  { id: 'CFPJXQgbedU' },
  { id: 'ECaio6ykuME' },
  { id: 'ecqe7_6jw84' },
  { id: 'EFkK6zgBQzE' },
  { id: 'ERKA5ID3bgU' },
  { id: 'gFzMXAiAak0' },
  { id: 'hMNUiBvWCAI' },
  { id: 'I64Ynwklctk' },
  { id: 'igXvCAxS_X0' },
  { id: 'IiF3UsdYg_w' },
  { id: 'IUYoZb2_sqU' },
  { id: 'Ka5AfSc-yCw' },
  { id: 'lRBlKzB_KBw' },
  { id: 'LSq9uLslfh4' },
  { id: 'MHxki8vYg54' },
  { id: 'MUeNEoASxPk' },
  { id: 'NRlQWgbASGk' },
  { id: 'ntutbgypOqs' },
  { id: 'nTzwUySlJNo' },
  { id: 'p6ERfoDqdDY' },
  { id: 'prtj_W2_dPU' },
  { id: 'r1nrCAiMewo' },
  { id: 'rcmLOfJZZ0E' },
  { id: 'RKvIzf7CV-E' },
  { id: 'rn-gQGG5I6U' },
  { id: 'SdTTVxNdtQQ' },
  { id: 'tpjVokUYhQc' },
  { id: 'UAgPxvpAszQ' },
  { id: 'uHhYyHT5VZ8' },
  { id: 'V3qHZtTdCKo' },
  { id: 'V6NVrmLyY70' },
  { id: 'VtBRV5r6p4Y' },
  { id: 'VUwFcfzmaZc' },
  { id: 'wMfbXcbh4Qs' },
  { id: 'yHZ_VzBLQ8M' },
  { id: 'Yj2cbx4vhYk' },
  { id: 'ySI1TvXu7bY' },
  { id: 'ZhFA351vQpM' },
  { id: 'ZHvRHmIlIYI' },
  { id: 'ZjS2ZeAELRM' },
];

let rotateKey = 'crystalline.adShortIndex';

/** Theme packs call this so ad rotation indexes never collide across products. */
export function setAdRotateKey(key: string): void {
  rotateKey = key || 'crystalline.adShortIndex';
}

/** Build a YouTube embed URL suitable for in-game ad playback. */
export function youtubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    // Browsers block unmuted autoplay; mute so the short actually starts.
    mute: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    controls: '1',
    fs: '0',
    // Loop off — ad session ends at ECONOMY_CONST.adDurationMs.
    loop: '0',
  });
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/**
 * Pick the next short in rotation. Persists the index so successive ads
 * cycle through the catalogue instead of repeating the first ID.
 */
export function nextDiscworldShort(storage: Storage = localStorage): DiscworldShort {
  const n = DISCWORLD_SHORTS.length;
  if (n === 0) {
    return { id: '8Ik7Y6dLAbg', title: 'Discworld in 60 seconds' };
  }
  let idx = 0;
  try {
    const raw = storage.getItem(rotateKey);
    idx = raw ? Math.max(0, parseInt(raw, 10) || 0) % n : 0;
  } catch {
    idx = 0;
  }
  const short = DISCWORLD_SHORTS[idx]!;
  try {
    storage.setItem(rotateKey, String((idx + 1) % n));
  } catch {
    /* private mode — rotation still works within the session via index 0 */
  }
  return short;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function channelUrl(): string {
  return 'https://www.youtube.com/@discworldin60seconds';
}

import { describe, expect, it } from 'vitest';
import { tierFromMatch } from '../../src/render/vfx';

describe('tierFromMatch', () => {
  it('maps plain threes to tier 3', () => {
    expect(tierFromMatch('three', 3)).toBe(3);
  });

  it('escalates 4 / L / T to at least tier 4', () => {
    expect(tierFromMatch('four', 4)).toBe(4);
    expect(tierFromMatch('L', 4)).toBe(4);
    expect(tierFromMatch('T', 4)).toBe(4);
    // Larger L/T clusters still escalate by cell count.
    expect(tierFromMatch('L', 5)).toBe(5);
  });

  it('five-in-a-row and 5 cells → tier 5; 6+ → supernova', () => {
    expect(tierFromMatch('five', 5)).toBe(5);
    expect(tierFromMatch('five', 6)).toBe(6);
    expect(tierFromMatch('three', 6)).toBe(6);
  });
});

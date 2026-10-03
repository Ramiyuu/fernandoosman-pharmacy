import { describe, expect, it } from 'vitest';

import { buildAspirin, buildKaplanMeier, buildNetwork, distance } from './geometry';
import { buildParticles } from './particles';

describe('scene geometry', () => {
  it('models acetylsalicylic acid: C9H8O4, bonded heavy atoms at chemical distances', () => {
    const { atoms, bonds } = buildAspirin();
    const count = (element: string) => atoms.filter((atom) => atom.element === element).length;
    expect([count('C'), count('H'), count('O')]).toEqual([9, 8, 4]);
    // Every atom is bonded; heavy-atom bonds are 1.2-1.5 Å before scaling (0.66).
    expect(new Set(bonds.flatMap((bond) => [bond.a, bond.b])).size).toBe(atoms.length);
    for (const bond of bonds) {
      const [a, b] = [atoms[bond.a], atoms[bond.b]];
      if (a.element === 'H' || b.element === 'H') continue;
      const length = distance(a.position, b.position) / 0.66;
      expect(length).toBeGreaterThan(1.15);
      expect(length).toBeLessThan(1.62);
    }
  });

  it('simulates Kaplan-Meier curves that only step down and separate the arms', () => {
    const { treatment, control } = buildKaplanMeier();
    for (const curve of [treatment, control]) {
      for (let i = 1; i < curve.steps.length; i++) {
        expect(curve.steps[i][0]).toBeGreaterThanOrEqual(curve.steps[i - 1][0]);
        expect(curve.steps[i][1]).toBeLessThanOrEqual(curve.steps[i - 1][1]);
      }
    }
    const final = (curve: typeof treatment) => curve.steps[curve.steps.length - 1][1];
    expect(final(treatment)).toBeGreaterThan(final(control));
    // Deterministic: the same figure on every render.
    expect(buildKaplanMeier()).toEqual({ treatment, control });
  });

  it('places one node per topic plus the hub', () => {
    const network = buildNetwork([4, 2, 1, 1, 3, 0, 2, 5]);
    expect(network.nodes.filter((node) => node.topic >= 0)).toHaveLength(8);
    expect(network.nodes[0].topic).toBe(-1);
    expect(network.edges.length).toBeGreaterThanOrEqual(8);
  });

  it('samples identical particle counts for every shape', () => {
    const particles = buildParticles(1500, [3, 1, 2]);
    for (const positions of particles.positions) expect(positions.length).toBe(1500 * 3);
    for (const colors of particles.colors) expect(colors.length).toBe(1500 * 3);
    expect(particles.labels).toHaveLength(3);
    expect(particles.positions.every((positions) => positions.every(Number.isFinite))).toBe(true);
  });
});

/**
 * Shapes for the "from molecule to evidence" scene, in scene units (roughly
 * -3…3). Pure and deterministic: the WebGL renderer samples particles from
 * them and the static SVG figures (mobile, reduced motion) draw them directly,
 * so both always show the same thing.
 */

export type Vec3 = [number, number, number];

// ---------------------------------------------------------------------------
// Molecule: acetylsalicylic acid (aspirin), C9H8O4, as a ball-and-stick model.
// Built from an idealised 2D depiction (bond lengths in Å) with the acetyl
// ester rotated out of the ring plane, as it is in the real molecule.
// ---------------------------------------------------------------------------

export type Element = 'C' | 'O' | 'H';

export interface Atom {
  element: Element;
  position: Vec3;
}

export interface Bond {
  a: number;
  b: number;
  order: 1 | 2;
}

export interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
}

/** Display radius per element (scene units, after scaling). */
export const ATOM_RADIUS: Record<Element, number> = { C: 0.3, O: 0.28, H: 0.17 };

const deg = (degrees: number) => (degrees * Math.PI) / 180;
const step = (from: Vec3, length: number, angle: number, dz = 0): Vec3 => [
  from[0] + length * Math.cos(deg(angle)),
  from[1] + length * Math.sin(deg(angle)),
  from[2] + dz,
];

export function buildAspirin(): Molecule {
  const atoms: Atom[] = [];
  const bonds: Bond[] = [];
  const add = (element: Element, position: Vec3) => atoms.push({ element, position }) - 1;
  const bond = (a: number, b: number, order: 1 | 2 = 1) => bonds.push({ a, b, order });

  // Benzene ring (Kekulé structure).
  const ring = Array.from({ length: 6 }, (_, i) => {
    const angle = 150 + i * 60;
    return add('C', [1.4 * Math.cos(deg(angle)), 1.4 * Math.sin(deg(angle)), 0]);
  });
  ring.forEach((atom, i) => bond(atom, ring[(i + 1) % 6], i % 2 === 0 ? 2 : 1));

  // Carboxylic acid on C1.
  const c1 = atoms[ring[0]].position;
  const carboxyl = add('C', step(c1, 1.49, 150, -0.05));
  const carbonylO = add('O', step(atoms[carboxyl].position, 1.23, 90, -0.12));
  const hydroxylO = add('O', step(atoms[carboxyl].position, 1.34, 210, 0.1));
  const acidH = add('H', step(atoms[hydroxylO].position, 0.97, 150, 0.05));
  bond(ring[0], carboxyl);
  bond(carboxyl, carbonylO, 2);
  bond(carboxyl, hydroxylO);
  bond(hydroxylO, acidH);

  // Acetyl ester on C2, twisted out of plane.
  const c2 = atoms[ring[1]].position;
  const esterO = add('O', step(c2, 1.37, 210, 0.3));
  const esterC = add('C', step(atoms[esterO].position, 1.36, 270, 0.55));
  const esterCarbonylO = add('O', step(atoms[esterC].position, 1.21, 210, 0.45));
  const methyl = add('C', step(atoms[esterC].position, 1.5, 330, 0.1));
  bond(ring[1], esterO);
  bond(esterO, esterC);
  bond(esterC, esterCarbonylO, 2);
  bond(esterC, methyl);
  const m = atoms[methyl].position;
  for (const offset of [
    [0.98, -0.42, 0.05],
    [-0.12, -0.62, 0.86],
    [-0.12, -0.62, -0.86],
  ] as Vec3[]) {
    bond(methyl, add('H', [m[0] + offset[0], m[1] + offset[1], m[2] + offset[2]]));
  }

  // Aromatic hydrogens on C3–C6.
  for (const index of ring.slice(2)) {
    const p = atoms[index].position;
    const angle = (Math.atan2(p[1], p[0]) * 180) / Math.PI;
    bond(index, add('H', step(p, 1.08, angle)));
  }

  // Centre on the heavy atoms and scale to scene units.
  const heavy = atoms.filter((atom) => atom.element !== 'H');
  const centre = [0, 1, 2].map((axis) => heavy.reduce((sum, atom) => sum + atom.position[axis], 0) / heavy.length);
  const scale = 0.66;
  for (const atom of atoms) {
    atom.position = atom.position.map((value, axis) => (value - centre[axis]) * scale) as Vec3;
  }
  return { atoms, bonds };
}

// ---------------------------------------------------------------------------
// Trial: two simulated Kaplan-Meier curves (illustrative, seeded so they are
// identical on every render). Plot area in scene units.
// ---------------------------------------------------------------------------

export const PLOT = { left: -2.7, right: 2.7, bottom: -1.65, top: 1.65, months: 24 } as const;

export interface SurvivalCurve {
  /** Step function as [time (months), survival] corners, starting at [0, 1]. */
  steps: Array<[number, number]>;
  /** Censoring times with the survival at that moment. */
  censored: Array<[number, number]>;
  /** 95% band (Greenwood) as [time, lower, upper] per step. */
  band: Array<[number, number, number]>;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateArm(hazardPerMonth: number, patients: number, seed: number): SurvivalCurve {
  const random = mulberry32(seed);
  const observations = Array.from({ length: patients }, () => {
    const event = -Math.log(1 - random()) / hazardPerMonth;
    const censor = 8 + random() * 22; // staggered enrolment
    return event <= censor ? { time: event, event: true } : { time: censor, event: false };
  })
    .filter((o) => o.time <= PLOT.months)
    .sort((a, b) => a.time - b.time);

  let atRisk = patients;
  let survival = 1;
  let greenwood = 0;
  const steps: Array<[number, number]> = [[0, 1]];
  const censored: Array<[number, number]> = [];
  const band: Array<[number, number, number]> = [[0, 1, 1]];
  for (const observation of observations) {
    if (observation.event) {
      steps.push([observation.time, survival]);
      greenwood += 1 / (atRisk * Math.max(atRisk - 1, 1));
      survival *= 1 - 1 / atRisk;
      steps.push([observation.time, survival]);
      const se = survival * Math.sqrt(greenwood);
      band.push([observation.time, Math.max(0, survival - 1.96 * se), Math.min(1, survival + 1.96 * se)]);
    } else {
      censored.push([observation.time, survival]);
    }
    atRisk -= 1;
  }
  steps.push([PLOT.months, survival]);
  band.push([PLOT.months, band[band.length - 1][1], band[band.length - 1][2]]);
  return { steps, censored, band };
}

export interface KaplanMeier {
  treatment: SurvivalCurve;
  control: SurvivalCurve;
}

export function buildKaplanMeier(): KaplanMeier {
  return {
    treatment: simulateArm(0.034, 60, 17),
    control: simulateArm(0.062, 60, 29),
  };
}

/** Plot coordinates (months, survival) to scene units. */
export function plotPoint(time: number, survival: number): [number, number] {
  return [
    PLOT.left + (time / PLOT.months) * (PLOT.right - PLOT.left),
    PLOT.bottom + survival * (PLOT.top - PLOT.bottom),
  ];
}

// ---------------------------------------------------------------------------
// Evidence: the archive's topics as a network around a central hub.
// ---------------------------------------------------------------------------

export interface NetworkNode {
  position: Vec3;
  radius: number;
  /** Index into the topics passed in, or -1 for the hub / unlabelled nodes. */
  topic: number;
}

export interface Network {
  nodes: NetworkNode[];
  edges: Array<[number, number]>;
}

/**
 * One node per topic (sized by its article count) on a flattened sphere
 * around a hub, each linked to the hub and to its two nearest neighbours.
 * With fewer than four topics, unlabelled nodes complete the shape.
 */
export function buildNetwork(counts: number[]): Network {
  const total = Math.max(counts.length, 7);
  const max = Math.max(1, ...counts);
  const nodes: NetworkNode[] = [{ position: [0, 0, 0], radius: 0.34, topic: -1 }];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < total; i++) {
    const y = 1 - ((i + 0.5) / total) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i + 0.6;
    const isTopic = i < counts.length;
    const weight = isTopic ? Math.sqrt(counts[i] / max) : 0;
    nodes.push({
      position: [Math.cos(theta) * r * 2.5, y * 1.75, Math.sin(theta) * r * 1.2],
      radius: isTopic ? 0.16 + weight * 0.14 : 0.1,
      topic: isTopic ? i : -1,
    });
  }

  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();
  const link = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || seen.has(key)) return;
    seen.add(key);
    edges.push([a, b]);
  };
  for (let i = 1; i < nodes.length; i++) {
    link(0, i);
    const nearest = nodes
      .map((node, j) => ({ j, d: distance(node.position, nodes[i].position) }))
      .filter(({ j }) => j !== 0 && j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { j } of nearest) link(i, j);
  }
  return { nodes, edges };
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

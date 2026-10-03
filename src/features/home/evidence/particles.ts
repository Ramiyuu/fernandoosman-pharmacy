import {
  ATOM_RADIUS,
  buildAspirin,
  buildKaplanMeier,
  buildNetwork,
  distance,
  PLOT,
  plotPoint,
  type SurvivalCurve,
  type Vec3,
} from './geometry';

/**
 * Samples the three shapes into particle buffers of identical length, so
 * particle i has a position and colour in every shape and the shader only
 * interpolates. Each shape's points are ordered left to right, which makes
 * the morph sweep across the scene instead of exploding at random.
 */

export interface ParticleBuffers {
  count: number;
  positions: [Float32Array, Float32Array, Float32Array];
  colors: [Float32Array, Float32Array, Float32Array];
  /** Per particle: size factor, stagger seed. */
  meta: Float32Array;
  /** Scene position of each topic node, in topic order. */
  labels: Vec3[];
}

type RGB = [number, number, number];

const COLORS = {
  carbon: [0.78, 0.85, 0.98] as RGB,
  oxygen: [0.12, 0.84, 0.74] as RGB,
  hydrogen: [0.48, 0.56, 0.7] as RGB,
  bond: [0.3, 0.52, 0.96] as RGB,
  axis: [0.42, 0.52, 0.7] as RGB,
  control: [0.5, 0.66, 1] as RGB,
  treatment: [0.1, 0.86, 0.76] as RGB,
  band: [0.05, 0.42, 0.4] as RGB,
  hub: [0.92, 0.96, 1] as RGB,
  nodeA: [0.1, 0.84, 0.74] as RGB,
  nodeB: [0.42, 0.62, 1] as RGB,
  edge: [0.22, 0.36, 0.66] as RGB,
  dust: [0.2, 0.3, 0.5] as RGB,
};

class PointList {
  readonly points: number[] = [];
  push(position: Vec3, color: RGB) {
    this.points.push(position[0], position[1], position[2], color[0], color[1], color[2]);
  }
  get length() {
    return this.points.length / 6;
  }
}

/** Splits `total` into integer parts proportional to `weights`. */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((weight) => (weight / sum) * total);
  const parts = raw.map(Math.floor);
  let rest = total - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((value, index) => ({ index, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (let i = 0; rest > 0; i = (i + 1) % order.length, rest--) parts[order[i].index] += 1;
  return parts;
}

function sphere(list: PointList, centre: Vec3, radius: number, n: number, color: RGB, random: () => number) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const depth = radius * (0.88 + random() * 0.16);
    list.push([centre[0] + Math.cos(theta) * r * depth, centre[1] + y * depth, centre[2] + Math.sin(theta) * r * depth], color);
  }
}

function segment(list: PointList, a: Vec3, b: Vec3, n: number, color: RGB, jitter: number, random: () => number) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    list.push(
      [
        a[0] + (b[0] - a[0]) * t + (random() - 0.5) * jitter,
        a[1] + (b[1] - a[1]) * t + (random() - 0.5) * jitter,
        a[2] + (b[2] - a[2]) * t + (random() - 0.5) * jitter,
      ],
      color,
    );
  }
}

function dust(list: PointList, n: number, random: () => number) {
  for (let i = 0; i < n; i++) {
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const radius = 3 + random() * 2.2;
    const r = Math.sqrt(1 - u * u);
    list.push([Math.cos(theta) * r * radius, u * radius * 0.7, Math.sin(theta) * r * radius * 0.6], COLORS.dust);
  }
}

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function moleculePoints(count: number, random: () => number): PointList {
  const { atoms, bonds } = buildAspirin();
  const list = new PointList();
  const [dustCount, atomCount, bondCount] = allocate(count, [0.1, 0.55, 0.35]);
  dust(list, dustCount, random);

  const atomParts = allocate(
    atomCount,
    atoms.map((atom) => ATOM_RADIUS[atom.element] ** 2),
  );
  atoms.forEach((atom, index) => {
    const color = atom.element === 'C' ? COLORS.carbon : atom.element === 'O' ? COLORS.oxygen : COLORS.hydrogen;
    sphere(list, atom.position, ATOM_RADIUS[atom.element], atomParts[index], color, random);
  });

  const bondParts = allocate(
    bondCount,
    bonds.map((b) => distance(atoms[b.a].position, atoms[b.b].position) * b.order),
  );
  bonds.forEach((b, index) => {
    const from = atoms[b.a];
    const to = atoms[b.b];
    const length = distance(from.position, to.position);
    const direction = from.position.map((value, axis) => (to.position[axis] - value) / length) as Vec3;
    const start = from.position.map((value, axis) => value + direction[axis] * ATOM_RADIUS[from.element] * 0.9) as Vec3;
    const end = to.position.map((value, axis) => value - direction[axis] * ATOM_RADIUS[to.element] * 0.9) as Vec3;
    if (b.order === 1) {
      segment(list, start, end, bondParts[index], COLORS.bond, 0.035, random);
      return;
    }
    // Double bond: two parallel lines, offset perpendicular to the bond in the depiction plane.
    const normal: Vec3 = [-direction[1] * 0.07, direction[0] * 0.07, 0];
    const half = Math.floor(bondParts[index] / 2);
    const shift = (p: Vec3, sign: number): Vec3 => [p[0] + normal[0] * sign, p[1] + normal[1] * sign, p[2]];
    segment(list, shift(start, 1), shift(end, 1), half, COLORS.bond, 0.025, random);
    segment(list, shift(start, -1), shift(end, -1), bondParts[index] - half, COLORS.bond, 0.025, random);
  });
  return list;
}

function polylineLength(points: Array<[number, number]>): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return length;
}

function polyline(list: PointList, points: Array<[number, number]>, n: number, color: RGB, random: () => number) {
  const total = polylineLength(points);
  for (let i = 0; i < n; i++) {
    let target = (i / Math.max(n - 1, 1)) * total;
    for (let j = 1; j < points.length; j++) {
      const [x0, y0] = points[j - 1];
      const [x1, y1] = points[j];
      const length = Math.hypot(x1 - x0, y1 - y0);
      if (target <= length || j === points.length - 1) {
        const t = length === 0 ? 0 : Math.min(target / length, 1);
        list.push([x0 + (x1 - x0) * t + (random() - 0.5) * 0.018, y0 + (y1 - y0) * t + (random() - 0.5) * 0.018, (random() - 0.5) * 0.06], color);
        break;
      }
      target -= length;
    }
  }
}

function curveCorners(curve: SurvivalCurve): Array<[number, number]> {
  return curve.steps.map(([time, survival]) => plotPoint(time, survival));
}

function band(list: PointList, curve: SurvivalCurve, n: number, random: () => number) {
  for (let i = 0; i < n; i++) {
    const time = random() * PLOT.months;
    let row = curve.band[0];
    for (const candidate of curve.band) {
      if (candidate[0] > time) break;
      row = candidate;
    }
    const survival = row[1] + random() * (row[2] - row[1]);
    const [x, y] = plotPoint(time, survival);
    list.push([x, y, (random() - 0.5) * 0.08], COLORS.band);
  }
}

function kaplanMeierPoints(count: number, random: () => number): PointList {
  const { treatment, control } = buildKaplanMeier();
  const list = new PointList();
  const [dustCount, axisCount, tickCount, controlCount, treatmentCount, bandCount, censorCount] = allocate(count, [
    0.1, 0.1, 0.04, 0.2, 0.22, 0.26, 0.08,
  ]);
  dust(list, dustCount, random);

  const origin: Vec3 = [PLOT.left, PLOT.bottom, 0];
  const [xAxis, yAxis] = allocate(axisCount, [PLOT.right - PLOT.left, PLOT.top - PLOT.bottom]);
  segment(list, origin, [PLOT.right, PLOT.bottom, 0], xAxis, COLORS.axis, 0.012, random);
  segment(list, origin, [PLOT.left, PLOT.top, 0], yAxis, COLORS.axis, 0.012, random);

  const ticks: Array<[Vec3, Vec3]> = [
    ...[0, 6, 12, 18, 24].map((month) => {
      const [x] = plotPoint(month, 0);
      return [
        [x, PLOT.bottom, 0],
        [x, PLOT.bottom - 0.12, 0],
      ] as [Vec3, Vec3];
    }),
    ...[0, 0.5, 1].map((survival) => {
      const [, y] = plotPoint(0, survival);
      return [
        [PLOT.left, y, 0],
        [PLOT.left - 0.12, y, 0],
      ] as [Vec3, Vec3];
    }),
  ];
  const tickParts = allocate(tickCount, ticks.map(() => 1));
  ticks.forEach(([a, b], index) => segment(list, a, b, tickParts[index], COLORS.axis, 0.008, random));

  polyline(list, curveCorners(control), controlCount, COLORS.control, random);
  polyline(list, curveCorners(treatment), treatmentCount, COLORS.treatment, random);
  band(list, treatment, bandCount, random);

  const marks = [
    ...treatment.censored.map((point) => ({ point, color: COLORS.treatment })),
    ...control.censored.map((point) => ({ point, color: COLORS.control })),
  ];
  const markParts = allocate(censorCount, marks.map(() => 1));
  marks.forEach(({ point, color }, index) => {
    const [x, y] = plotPoint(point[0], point[1]);
    segment(list, [x, y - 0.07, 0], [x, y + 0.07, 0], markParts[index], color, 0.006, random);
  });
  return list;
}

function networkPoints(count: number, topicCounts: number[], random: () => number): { list: PointList; labels: Vec3[] } {
  const { nodes, edges } = buildNetwork(topicCounts);
  const list = new PointList();
  const [dustCount, nodeCount, edgeCount] = allocate(count, [0.12, 0.46, 0.42]);
  dust(list, dustCount, random);

  const nodeParts = allocate(nodeCount, nodes.map((node) => node.radius ** 2));
  nodes.forEach((node, index) => {
    const color = index === 0 ? COLORS.hub : index % 2 === 0 ? COLORS.nodeA : COLORS.nodeB;
    sphere(list, node.position, node.radius, nodeParts[index], color, random);
  });
  const edgeParts = allocate(edgeCount, edges.map(([a, b]) => distance(nodes[a].position, nodes[b].position)));
  edges.forEach(([a, b], index) => segment(list, nodes[a].position, nodes[b].position, edgeParts[index], COLORS.edge, 0.03, random));

  const labels = nodes.filter((node) => node.topic >= 0).sort((a, b) => a.topic - b.topic).map((node) => node.position);
  return { list, labels };
}

function ordered(list: PointList, count: number, random: () => number): { positions: Float32Array; colors: Float32Array } {
  const items = Array.from({ length: list.length }, (_, index) => ({ index, key: list.points[index * 6] + (random() - 0.5) * 0.35 }));
  items.sort((a, b) => a.key - b.key);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  items.slice(0, count).forEach(({ index }, i) => {
    positions.set(list.points.slice(index * 6, index * 6 + 3), i * 3);
    colors.set(list.points.slice(index * 6 + 3, index * 6 + 6), i * 3);
  });
  return { positions, colors };
}

export function buildParticles(count: number, topicCounts: number[]): ParticleBuffers {
  const random = seeded(20261002);
  const molecule = ordered(moleculePoints(count, random), count, random);
  const trial = ordered(kaplanMeierPoints(count, random), count, random);
  const { list, labels } = networkPoints(count, topicCounts, random);
  const evidence = ordered(list, count, random);

  const meta = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    meta[i * 2] = 0.65 + random() * 0.7;
    meta[i * 2 + 1] = random();
  }
  return {
    count,
    positions: [molecule.positions, trial.positions, evidence.positions],
    colors: [molecule.colors, trial.colors, evidence.colors],
    meta,
    labels,
  };
}

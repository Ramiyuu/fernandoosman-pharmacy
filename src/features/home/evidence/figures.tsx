import { ATOM_RADIUS, buildAspirin, buildKaplanMeier, buildNetwork, PLOT, plotPoint, type Vec3 } from './geometry';

/**
 * Static drawings of the three scene shapes, for phones, reduced motion and
 * browsers without WebGL. Built from the same geometry as the particles.
 */

function project([x, y, z]: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = cy * x + sy * z;
  const z1 = -sy * x + cy * z;
  const y2 = cp * y - sp * z1;
  const z2 = sp * y + cp * z1;
  return [x1, y2, z2];
}

const fmt = (value: number) => Number(value.toFixed(3));

/** `id` namespaces the gradient ids when the figure appears twice on a page. */
export function MoleculeFigure({ title, className, id = 'molecule' }: { title: string; className?: string; id?: string }) {
  const fill = { C: `url(#${id}-carbon)`, O: `url(#${id}-oxygen)`, H: `url(#${id}-hydrogen)` } as const;
  const { atoms, bonds } = buildAspirin();
  const placed = atoms.map((atom) => ({ ...atom, p: project(atom.position, 0.38, -0.18) }));
  const order = placed.map((_, index) => index).sort((a, b) => placed[a].p[2] - placed[b].p[2]);
  const bondLines = bonds.flatMap((bond) => {
    const a = placed[bond.a].p;
    const b = placed[bond.b].p;
    if (bond.order === 1) return [[a, b]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = (-(b[1] - a[1]) / length) * 0.06;
    const ny = ((b[0] - a[0]) / length) * 0.06;
    return [
      [
        [a[0] + nx, a[1] + ny, a[2]],
        [b[0] + nx, b[1] + ny, b[2]],
      ],
      [
        [a[0] - nx, a[1] - ny, a[2]],
        [b[0] - nx, b[1] - ny, b[2]],
      ],
    ];
  });

  return (
    <svg viewBox="-2.9 -2.4 5.8 4.8" role="img" aria-label={title} className={className}>
      <defs>
        <radialGradient id={`${id}-carbon`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#f2f6ff" />
          <stop offset="1" stopColor="#6f86b8" />
        </radialGradient>
        <radialGradient id={`${id}-oxygen`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#99f6e4" />
          <stop offset="1" stopColor="#0d9488" />
        </radialGradient>
        <radialGradient id={`${id}-hydrogen`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#e3e9f4" />
          <stop offset="1" stopColor="#5d6f8f" />
        </radialGradient>
      </defs>
      <g stroke="#4f7fe8" strokeWidth="0.055" strokeLinecap="round">
        {bondLines.map(([a, b], index) => (
          <line key={index} x1={fmt(a[0])} y1={fmt(-a[1])} x2={fmt(b[0])} y2={fmt(-b[1])} />
        ))}
      </g>
      {order.map((index) => {
        const atom = placed[index];
        return (
          <circle
            key={index}
            cx={fmt(atom.p[0])}
            cy={fmt(-atom.p[1])}
            r={fmt(ATOM_RADIUS[atom.element] * (1 + atom.p[2] * 0.06))}
            fill={fill[atom.element]}
          />
        );
      })}
    </svg>
  );
}

export interface SurvivalLabels {
  title: string;
  treatment: string;
  control: string;
  time: string;
  survival: string;
}

export function SurvivalFigure({ labels, className }: { labels: SurvivalLabels; className?: string }) {
  const { treatment, control } = buildKaplanMeier();
  const toSvg = (time: number, survival: number) => {
    const [x, y] = plotPoint(time, survival);
    return `${fmt(x)},${fmt(-y)}`;
  };
  const steps = (curve: typeof treatment) => curve.steps.map(([t, s]) => toSvg(t, s)).join(' ');
  const upper: string[] = [];
  const lower: string[] = [];
  treatment.band.forEach(([time, low, high], index) => {
    const next = treatment.band[index + 1]?.[0] ?? PLOT.months;
    upper.push(toSvg(time, high), toSvg(next, high));
    lower.unshift(toSvg(next, low), toSvg(time, low));
  });

  return (
    <svg viewBox="-3.3 -2 6.5 4.25" role="img" aria-label={labels.title} className={className}>
      <polygon points={[...upper, ...lower].join(' ')} fill="#14b8a6" fillOpacity="0.16" />
      <g stroke="#6b7fa8" strokeWidth="0.02" fill="none">
        <polyline points={`${PLOT.left},${-PLOT.top} ${PLOT.left},${-PLOT.bottom} ${PLOT.right},${-PLOT.bottom}`} />
        {[0, 6, 12, 18, 24].map((month) => {
          const [x] = plotPoint(month, 0);
          return <line key={month} x1={fmt(x)} y1={-PLOT.bottom} x2={fmt(x)} y2={fmt(-PLOT.bottom + 0.1)} />;
        })}
      </g>
      <polyline points={steps(control)} fill="none" stroke="#7aa2ff" strokeWidth="0.045" strokeLinejoin="round" />
      <polyline points={steps(treatment)} fill="none" stroke="#2dd4bf" strokeWidth="0.05" strokeLinejoin="round" />
      <g strokeWidth="0.03">
        {treatment.censored.map(([t, s]) => {
          const [x, y] = plotPoint(t, s);
          return <line key={`t${t}`} x1={fmt(x)} x2={fmt(x)} y1={fmt(-y - 0.07)} y2={fmt(-y + 0.07)} stroke="#2dd4bf" />;
        })}
        {control.censored.map(([t, s]) => {
          const [x, y] = plotPoint(t, s);
          return <line key={`c${t}`} x1={fmt(x)} x2={fmt(x)} y1={fmt(-y - 0.07)} y2={fmt(-y + 0.07)} stroke="#7aa2ff" />;
        })}
      </g>
      <g fill="#c7d2e5" fontSize="0.17" fontFamily="var(--font-sans)">
        <text x={PLOT.right} y={fmt(-PLOT.bottom + 0.34)} textAnchor="end">
          {labels.time}
        </text>
        <text x={fmt(PLOT.left - 0.12)} y={fmt(-PLOT.top - 0.12)}>
          {labels.survival}
        </text>
        <line x1={fmt(PLOT.right - 1.62)} x2={fmt(PLOT.right - 1.38)} y1={fmt(-PLOT.top + 0.14)} y2={fmt(-PLOT.top + 0.14)} stroke="#2dd4bf" strokeWidth="0.05" />
        <text x={fmt(PLOT.right - 1.3)} y={fmt(-PLOT.top + 0.2)}>
          {labels.treatment}
        </text>
        <line x1={fmt(PLOT.right - 1.62)} x2={fmt(PLOT.right - 1.38)} y1={fmt(-PLOT.top + 0.42)} y2={fmt(-PLOT.top + 0.42)} stroke="#7aa2ff" strokeWidth="0.045" />
        <text x={fmt(PLOT.right - 1.3)} y={fmt(-PLOT.top + 0.48)}>
          {labels.control}
        </text>
      </g>
    </svg>
  );
}

export function NetworkFigure({
  title,
  topics,
  className,
}: {
  title: string;
  topics: Array<{ name: string; count: number }>;
  className?: string;
}) {
  const { nodes, edges } = buildNetwork(topics.map((topic) => topic.count));
  const placed = nodes.map((node) => ({ ...node, p: project(node.position, 0.5, 0.22) }));
  return (
    <svg viewBox="-3.9 -2.5 7.8 5" role="img" aria-label={title} className={className}>
      <g stroke="#2f4f8f" strokeWidth="0.025">
        {edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={fmt(placed[a].p[0])}
            y1={fmt(-placed[a].p[1])}
            x2={fmt(placed[b].p[0])}
            y2={fmt(-placed[b].p[1])}
          />
        ))}
      </g>
      {placed.map((node, index) => (
        <circle
          key={index}
          cx={fmt(node.p[0])}
          cy={fmt(-node.p[1])}
          r={fmt(node.radius)}
          fill={index === 0 ? '#eaf2ff' : index % 2 === 0 ? '#14b8a6' : '#6b93ff'}
          fillOpacity={node.topic >= 0 || index === 0 ? 1 : 0.45}
        />
      ))}
      <g className="network-labels" fill="#e3e9f4" fontSize="0.17" fontFamily="var(--font-sans)">
        {placed
          .filter((node) => node.topic >= 0)
          .map((node) => {
            // Labels sit outside their node, pointing away from the hub, so
            // neighbours do not write over each other.
            const length = Math.hypot(node.p[0], node.p[1]) || 1;
            const dx = node.p[0] / length;
            const dy = node.p[1] / length;
            const gap = node.radius + 0.1;
            return (
              <text
                key={node.topic}
                x={fmt(node.p[0] + dx * gap)}
                y={fmt(-(node.p[1] + dy * gap) + 0.06 - dy * 0.06)}
                textAnchor={dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle'}
              >
                {topics[node.topic].name}
              </text>
            );
          })}
      </g>
    </svg>
  );
}

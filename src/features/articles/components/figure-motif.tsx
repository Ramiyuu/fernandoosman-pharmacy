/**
 * Deterministic "figure" artwork used when an article or project has no cover
 * image. The motif is derived from the slug, so a card always looks the same.
 * Motifs are drawn from the vocabulary of clinical papers: survival curves,
 * forest plots, sampling distributions, regressions and dose–response curves.
 * Purely decorative (aria-hidden).
 */

const MOTIFS = ['survival', 'forest', 'distribution', 'scatter', 'dose-response'] as const;
type Motif = (typeof MOTIFS)[number];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 320;
const H = 200;
const PAD = { left: 28, right: 18, top: 22, bottom: 26 };

function Grid() {
  const lines = [];
  for (let x = PAD.left; x <= W - PAD.right; x += 34.8) {
    lines.push(<line key={`v${x}`} x1={x} y1={PAD.top} x2={x} y2={H - PAD.bottom} stroke="#e5e7eb" strokeWidth="0.75" />);
  }
  for (let y = PAD.top; y <= H - PAD.bottom; y += 30.4) {
    lines.push(<line key={`h${y}`} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e5e7eb" strokeWidth="0.75" />);
  }
  return (
    <g>
      {lines}
      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#8a93a3" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#8a93a3" strokeWidth="1" />
    </g>
  );
}

function survivalPath(random: () => number, hazard: number): string {
  const steps = 9;
  let x = PAD.left;
  let y = PAD.top + 4;
  const span = W - PAD.left - PAD.right;
  const height = H - PAD.top - PAD.bottom - 8;
  let d = `M${x},${y}`;
  for (let step = 0; step < steps; step += 1) {
    const nextX = x + (span / steps) * (0.7 + random() * 0.6);
    const drop = height * hazard * (0.6 + random() * 0.8);
    x = Math.min(nextX, W - PAD.right);
    d += ` H${x.toFixed(1)}`;
    y = Math.min(y + drop, H - PAD.bottom - 4);
    d += ` V${y.toFixed(1)}`;
  }
  return `${d} H${W - PAD.right}`;
}

function Survival({ random }: { random: () => number }) {
  return (
    <g fill="none" strokeWidth="2.25" strokeLinejoin="round">
      <path d={survivalPath(random, 0.055)} stroke="#14b8a6" />
      <path d={survivalPath(random, 0.085)} stroke="#142b57" />
    </g>
  );
}

function Forest({ random }: { random: () => number }) {
  const rows = 6;
  const nullX = PAD.left + (W - PAD.left - PAD.right) * 0.58;
  const items = Array.from({ length: rows }, (_, index) => {
    const y = PAD.top + 14 + index * ((H - PAD.top - PAD.bottom - 20) / (rows - 1));
    const isSummary = index === rows - 1;
    const center = nullX - 18 - random() * 70 + (isSummary ? 0 : random() * 40);
    const half = isSummary ? 14 : 16 + random() * 34;
    const size = isSummary ? 0 : 4 + random() * 6;
    return { y, center, half, size, isSummary };
  });
  return (
    <g>
      <line x1={nullX} y1={PAD.top} x2={nullX} y2={H - PAD.bottom} stroke="#8a93a3" strokeDasharray="3 3" />
      {items.map((item) =>
        item.isSummary ? (
          <polygon
            key={item.y}
            points={`${item.center - item.half},${item.y} ${item.center},${item.y - 6} ${item.center + item.half},${item.y} ${item.center},${item.y + 6}`}
            fill="#14b8a6"
          />
        ) : (
          <g key={item.y}>
            <line x1={item.center - item.half} y1={item.y} x2={item.center + item.half} y2={item.y} stroke="#142b57" strokeWidth="1.5" />
            <rect x={item.center - item.size / 2} y={item.y - item.size / 2} width={item.size} height={item.size} fill="#142b57" />
          </g>
        ),
      )}
    </g>
  );
}

function bellPath(mean: number, sd: number, peak: number, close: boolean): string {
  const base = H - PAD.bottom;
  const points: string[] = [];
  for (let x = PAD.left; x <= W - PAD.right; x += 4) {
    const z = (x - mean) / sd;
    const y = base - peak * Math.exp(-0.5 * z * z);
    points.push(`${x},${y.toFixed(1)}`);
  }
  return `M${points.join(' L')}${close ? ` L${W - PAD.right},${base} L${PAD.left},${base} Z` : ''}`;
}

function Distribution({ random }: { random: () => number }) {
  const span = W - PAD.left - PAD.right;
  const meanA = PAD.left + span * (0.36 + random() * 0.08);
  const meanB = meanA + span * (0.16 + random() * 0.12);
  const sd = span * 0.1;
  const peak = H - PAD.top - PAD.bottom - 16;
  return (
    <g>
      <path d={bellPath(meanB, sd, peak, true)} fill="#ccfbf1" />
      <path d={bellPath(meanB, sd, peak, false)} fill="none" stroke="#14b8a6" strokeWidth="2" />
      <path d={bellPath(meanA, sd, peak * 0.92, false)} fill="none" stroke="#142b57" strokeWidth="2" />
      <line x1={meanB - 1.96 * sd} y1={H - PAD.bottom - 6} x2={meanB + 1.96 * sd} y2={H - PAD.bottom - 6} stroke="#0f766e" strokeWidth="1.5" />
    </g>
  );
}

/** Scatter plot with a fitted regression line and confidence band. */
function Scatter({ random }: { random: () => number }) {
  const span = W - PAD.left - PAD.right;
  const height = H - PAD.top - PAD.bottom;
  const slope = 0.35 + random() * 0.4;
  const points = Array.from({ length: 26 }, () => {
    const t = random();
    const noise = (random() - 0.5) * 0.35;
    return { x: PAD.left + 8 + t * (span - 16), y: H - PAD.bottom - 10 - Math.min(Math.max(t * slope + 0.15 + noise, 0.02), 0.95) * height };
  });
  const yAt = (t: number) => H - PAD.bottom - 10 - (t * slope + 0.15) * height;
  const x0 = PAD.left + 8;
  const x1 = W - PAD.right - 8;
  const band = 14;
  return (
    <g>
      <polygon
        points={`${x0},${yAt(0) - band} ${x1},${yAt(1) - band} ${x1},${yAt(1) + band} ${x0},${yAt(0) + band}`}
        fill="#ccfbf1"
      />
      <line x1={x0} y1={yAt(0)} x2={x1} y2={yAt(1)} stroke="#14b8a6" strokeWidth="2" />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3" fill="#142b57" />
      ))}
    </g>
  );
}

/** Sigmoid dose–response (Emax) curves for two compounds. */
function DoseResponse({ random }: { random: () => number }) {
  const span = W - PAD.left - PAD.right;
  const height = H - PAD.top - PAD.bottom - 12;
  const curve = (ec50: number, hill: number, emax: number) => {
    const points: string[] = [];
    for (let x = PAD.left; x <= W - PAD.right; x += 4) {
      const t = (x - PAD.left) / span;
      const response = emax / (1 + Math.exp(-hill * (t - ec50)));
      points.push(`${x},${(H - PAD.bottom - 4 - response * height).toFixed(1)}`);
    }
    return `M${points.join(' L')}`;
  };
  const ec50A = 0.35 + random() * 0.1;
  const ec50B = ec50A + 0.18 + random() * 0.12;
  return (
    <g fill="none" strokeWidth="2.25">
      <path d={curve(ec50A, 12, 0.95)} stroke="#142b57" />
      <path d={curve(ec50B, 10, 0.75)} stroke="#14b8a6" />
      <line x1={PAD.left + span * ec50A} y1={PAD.top} x2={PAD.left + span * ec50A} y2={H - PAD.bottom} stroke="#8a93a3" strokeDasharray="3 3" strokeWidth="1" />
    </g>
  );
}

export function FigureMotif({ seed, className }: { seed: string; className?: string }) {
  const hash = hashString(seed);
  // Mix the bits so similar slugs still spread across motifs.
  const motif: Motif = MOTIFS[(Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0) % MOTIFS.length];
  const random = seededRandom(hash);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
      <rect width={W} height={H} fill="#f5f7fa" />
      <Grid />
      {motif === 'survival' ? <Survival random={random} /> : null}
      {motif === 'forest' ? <Forest random={random} /> : null}
      {motif === 'distribution' ? <Distribution random={random} /> : null}
      {motif === 'scatter' ? <Scatter random={random} /> : null}
      {motif === 'dose-response' ? <DoseResponse random={random} /> : null}
    </svg>
  );
}

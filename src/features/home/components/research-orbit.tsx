import Image from 'next/image';

/** A lightweight scientific motif; no canvas, WebGL or additional runtime. */
export function ResearchOrbit() {
  return (
    <div className="research-orbit" aria-hidden="true">
      <div className="orbit-grid" />
      <div className="orbit-ring orbit-ring-one" />
      <div className="orbit-ring orbit-ring-two" />
      <div className="orbit-ring orbit-ring-three" />
      <div className="orbit-core">
        <Image src="/brand/fo-logo.png" alt="" width={269} height={160} unoptimized priority />
      </div>
      <span className="orbit-node orbit-node-one" />
      <span className="orbit-node orbit-node-two" />
      <span className="orbit-node orbit-node-three" />
      <div className="orbit-label orbit-label-one">
        <span className="orbit-dot" />
        Clinical evidence
      </div>
      <div className="orbit-label orbit-label-two">
        <span className="orbit-dot" />
        Scientific inquiry
      </div>
      <div className="orbit-label orbit-label-three">
        <span className="orbit-dot" />
        Data & discovery
      </div>
      <div className="orbit-caption">Science / Insight / Impact</div>
    </div>
  );
}

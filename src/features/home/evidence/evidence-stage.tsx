'use client';

import { useEffect, useRef } from 'react';

interface EvidenceStageProps {
  topics: Array<{ name: string; count: number }>;
  stepNames: string[];
}

/**
 * The sticky WebGL layer behind the hero and story steps. It starts only on
 * screens at least 768px wide, without prefers-reduced-motion and with WebGL;
 * otherwise the section keeps data-webgl="off" and the static figures show.
 * The renderer is loaded on demand, so phones never download it.
 */
export function EvidenceStage({ topics, stepNames }: EvidenceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const countsKey = topics.map((topic) => topic.count).join(',');

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.closest<HTMLElement>('[data-evidence]');
    if (!canvas || !section) return;

    const wide = window.matchMedia('(min-width: 768px)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const counts = countsKey ? countsKey.split(',').map(Number) : [];
    let dispose: (() => void) | null = null;
    let loading = false;
    let cancelled = false;

    const stop = () => {
      dispose?.();
      dispose = null;
      section.dataset.webgl = 'off';
      delete section.dataset.step;
    };

    const update = () => {
      if (!wide.matches || reduce.matches) {
        stop();
        return;
      }
      if (dispose || loading) return;
      loading = true;
      import('./renderer')
        .then(({ startEvidenceScene }) => {
          loading = false;
          if (cancelled || dispose || !wide.matches || reduce.matches) return;
          section.dataset.webgl = 'on';
          dispose = startEvidenceScene({
            canvas,
            section,
            steps: Array.from(section.querySelectorAll<HTMLElement>('[data-evidence-step]')),
            labels: Array.from(labelsRef.current?.children ?? []) as HTMLElement[],
            topicCounts: counts,
            onFail: stop,
          });
        })
        .catch(() => {
          loading = false;
          stop();
        });
    };

    update();
    wide.addEventListener('change', update);
    reduce.addEventListener('change', update);
    return () => {
      cancelled = true;
      wide.removeEventListener('change', update);
      reduce.removeEventListener('change', update);
      stop();
    };
  }, [countsKey]);

  return (
    <div className="evidence-stage" aria-hidden="true">
      <canvas ref={canvasRef} className="evidence-canvas" />
      <div ref={labelsRef} className="evidence-labels">
        {topics.map((topic) => (
          <span key={topic.name} className="evidence-label">
            {topic.name}
          </span>
        ))}
      </div>
      <ol className="evidence-rail">
        {stepNames.map((name, index) => (
          <li key={name} data-rail-step={index + 1}>
            {name}
          </li>
        ))}
      </ol>
    </div>
  );
}

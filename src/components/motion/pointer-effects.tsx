'use client';

import { useEffect } from 'react';

/**
 * Pointer feedback for cards and calls to action, attached once by event
 * delegation instead of per component:
 *   [data-spotlight]  a soft light follows the cursor along the card's border
 *                     (CSS custom properties --mx / --my);
 *   [data-tilt]       the card leans up to 2.5° toward the cursor (--rx / --ry);
 *   [data-magnetic]   the button drifts up to 6px toward the cursor (--tx / --ty).
 * Fine pointers only. Tilt and drift are skipped under prefers-reduced-motion;
 * the spotlight (a colour change, not movement) stays. Values are written to
 * CSS variables once per animation frame, never through React state.
 */
export function PointerEffects() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches) return;

    let frame = 0;
    let last: PointerEvent | null = null;

    const update = () => {
      frame = 0;
      const event = last;
      if (!event || !(event.target instanceof Element)) return;

      const spot = event.target.closest<HTMLElement>('[data-spotlight]');
      if (spot) {
        const rect = spot.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        spot.style.setProperty('--mx', `${x.toFixed(0)}px`);
        spot.style.setProperty('--my', `${y.toFixed(0)}px`);
        if (spot.hasAttribute('data-tilt') && !reduce.matches) {
          spot.style.setProperty('--rx', `${((0.5 - y / rect.height) * 5).toFixed(2)}deg`);
          spot.style.setProperty('--ry', `${((x / rect.width - 0.5) * 5).toFixed(2)}deg`);
        }
      }

      const magnet = event.target.closest<HTMLElement>('[data-magnetic]');
      if (magnet && !reduce.matches) {
        const rect = magnet.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const clamp = (value: number) => Math.max(-6, Math.min(6, value));
        magnet.style.setProperty('--tx', `${clamp(dx * 0.2).toFixed(1)}px`);
        magnet.style.setProperty('--ty', `${clamp(dy * 0.3).toFixed(1)}px`);
      }
    };

    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Leaving an element (not just moving between its children) resets it.
    const onOut = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      for (const selector of ['[data-tilt]', '[data-magnetic]']) {
        const from = event.target.closest<HTMLElement>(selector);
        if (from && from !== next?.closest(selector)) {
          for (const name of ['--rx', '--ry', '--tx', '--ty']) from.style.removeProperty(name);
        }
      }
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);

  return null;
}

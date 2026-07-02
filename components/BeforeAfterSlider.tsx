'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export type SliderViewMode = 'slider' | 'before' | 'after';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /**
   * Optional controlled view mode.
   * 'before'  -> force full original view (position 0)
   * 'after'   -> force full generated view (position 100)
   * 'slider'  -> free-drag 50/50 comparison (default)
   * If omitted, the slider is fully uncontrolled (defaults to 50/50, freely draggable).
   */
  viewMode?: SliderViewMode;
  /** Called when the user manually drags the handle — lets the parent reset viewMode back to 'slider'. */
  onManualDrag?: () => void;
  /** Fired once each image has actually finished downloading (not just mounted). */
  onBeforeLoad?: () => void;
  onAfterLoad?: () => void;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'Enhanced',
  className,
  viewMode,
  onManualDrag,
  onBeforeLoad,
  onAfterLoad,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    setPosition(Math.max(0, Math.min(100, ((clientX - left) / width) * 100)));
  }, []);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, []);

  // Sync to the controlled view mode whenever it changes (e.g. "Switch to original" button)
  useEffect(() => {
    if (viewMode === 'before') setPosition(0);
    else if (viewMode === 'after') setPosition(100);
    else if (viewMode === 'slider') setPosition(50);
  }, [viewMode]);

  return (
    <div
      ref={containerRef}
      className={className ?? 'relative w-full overflow-hidden rounded-xl cursor-col-resize select-none'}
      style={className ? undefined : { aspectRatio: '4/3' }}
      onMouseDown={(e) => { dragging.current = true; onManualDrag?.(); update(e.clientX); }}
      onMouseMove={(e) => { if (dragging.current) update(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; onManualDrag?.(); update(e.touches[0].clientX); }}
      onTouchMove={(e) => { e.preventDefault(); if (dragging.current) update(e.touches[0].clientX); }}
    >
      {/* After image (base layer) — prioritized since this is now the default view.
          object-contain (not cover) so the full generated image shows at its actual
          proportions instead of being cropped/zoomed to fill the container. */}
      <Image src={afterUrl} alt={afterLabel} fill unoptimized priority className="object-contain" onLoad={onAfterLoad} />
      <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white font-semibold backdrop-blur-sm pointer-events-none">
        {afterLabel}
      </span>

      {/* Before image (clipped to left of slider) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image src={beforeUrl} alt={beforeLabel} fill unoptimized className="object-contain" onLoad={onBeforeLoad} />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white font-semibold backdrop-blur-sm pointer-events-none">
          {beforeLabel}
        </span>
      </div>

      {/* Divider line + handle */}
      <div
        className="absolute inset-y-0 w-px bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-white shadow-xl flex items-center justify-center">
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M5 5H1M1 5L3.5 2.5M1 5L3.5 7.5M9 5H13M13 5L10.5 2.5M13 5L10.5 7.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

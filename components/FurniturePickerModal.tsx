'use client';

import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  X, Wand2, Loader2,
  Sofa, Armchair, Coffee, Tv, LampFloor, Lamp, LampDesk,
  Library, Flower2, Frame, Shirt, BedDouble, BedSingle,
  Bath, ShowerHead, Monitor, Utensils, Umbrella, Car, Wrench,
  LayoutGrid, Package, Flame, Layers, Sparkles,
} from 'lucide-react';
import { getRoomFurniture, STAGING_STYLES, type FurnitureItem } from '@/lib/roomFurniture';

/* ─── Icon registry — add new Lucide icons here as needed ─── */
const ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Coffee, Tv, LampFloor, Lamp, LampDesk,
  Library, Flower2, Frame, Shirt, BedDouble, BedSingle,
  Bath, ShowerHead, Monitor, Utensils, Umbrella, Car, Wrench,
  LayoutGrid, Package, Flame, Layers, Sparkles,
};

function FurnitureIcon({ item, selected }: { item: FurnitureItem; selected: boolean }) {
  if (item.iconType === 'emoji') {
    return <span className="text-[22px] leading-none select-none">{item.icon}</span>;
  }
  const Icon = ICONS[item.icon];
  if (!Icon) return <span className="text-lg text-ink/25">?</span>;
  return <Icon className={`h-6 w-6 transition-colors ${selected ? 'text-analysis' : 'text-ink/40'}`} />;
}

interface FurniturePickerModalProps {
  roomType: string | null;
  onGenerate: (furniture: string[], style: string) => Promise<void>;
  onClose: () => void;
}

export function FurniturePickerModal({ roomType, onGenerate, onClose }: FurniturePickerModalProps) {
  const { room, items } = getRoomFurniture(roomType);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter(i => i.essential).map(i => i.id))
  );
  const [style, setStyle] = useState<string>('modern');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function selectAll() { setSelected(new Set(items.map(i => i.id))); }
  function clearAll()  { setSelected(new Set()); }

  async function handleGenerate() {
    const furniture = items.filter(i => selected.has(i.id)).map(i => i.label);
    if (furniture.length === 0) return;
    setBusy(true);
    try { await onGenerate(furniture, style); }
    finally { setBusy(false); }
  }

  const selectedCount = selected.size;
  const allSelected   = selectedCount === items.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-surface shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-display text-base font-bold leading-tight">Stage this room</h2>
            <p className="text-xs text-ink/45 mt-0.5">{room} · tap to include in the image</p>
          </div>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="ml-3 h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-ink/35 hover:bg-paper hover:text-ink transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 pb-3">

          {/* Furniture section header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Furniture</p>
            <div className="flex items-center gap-2">
              <button
                onClick={allSelected ? clearAll : selectAll}
                className="text-[10px] font-semibold text-analysis hover:underline transition-colors"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Furniture icon grid */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {items.map(item => {
              const sel = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  disabled={busy}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-150 disabled:opacity-50 active:scale-95
                    ${sel
                      ? 'border-analysis bg-analysis-soft shadow-sm scale-[1.02]'
                      : 'border-hairline bg-surface hover:border-analysis/40 hover:bg-paper'}`}
                >
                  <FurnitureIcon item={item} selected={sel} />
                  <span className={`text-center text-[10px] leading-tight line-clamp-2
                    ${sel ? 'font-semibold text-analysis' : 'font-medium text-ink/55'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Style section */}
          <div className="mb-1">
            <p className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide mb-2.5">Style</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGING_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  disabled={busy}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50
                    ${style === s.id
                      ? 'bg-ink text-paper border-ink shadow-sm'
                      : 'border-hairline text-ink/60 hover:border-analysis/50 hover:text-analysis'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-hairline px-5 py-4 flex items-center gap-3">
          <p className="flex-1 text-xs text-ink/45">
            {selectedCount === 0
              ? 'Select at least one item'
              : `${selectedCount} item${selectedCount !== 1 ? 's' : ''} selected`}
          </p>
          <button
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-paper transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleGenerate()}
            disabled={busy || selectedCount === 0}
            className="flex items-center gap-2 rounded-xl bg-analysis px-4 py-2.5 text-sm font-semibold text-white hover:bg-analysis/85 disabled:opacity-40 transition-all shadow-sm"
          >
            {busy
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><Wand2 className="h-4 w-4" /> Generate</>}
          </button>
        </div>
      </div>
    </div>
  );
}

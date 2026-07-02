'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Layers } from 'lucide-react';
import type { Photo, ToolJob } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';

interface RoomGalleryProps {
  photos: Photo[];
  onSelectPhoto: (photoId: string) => void;
  toolJobs?: ToolJob[];
  selectedPhotoIds?: Set<string>;
  onToggleSelect?: (photoId: string) => void;
}

function qualityColor(score: number | null): string {
  if (score == null) return 'text-ink/30';
  if (score >= 7) return 'text-approved';
  if (score >= 5) return 'text-analysis';
  return 'text-gate';
}

export function RoomGallery({ photos, onSelectPhoto, toolJobs, selectedPhotoIds, onToggleSelect }: RoomGalleryProps) {
  if (photos.length === 0) return null;

  const pending  = photos.filter(p => p.status === 'pending');
  const failed   = photos.filter(p => p.status === 'failed');
  const analyzed = photos.filter(p => p.status === 'analyzed');

  const byRoom = new Map<string, Photo[]>();
  for (const photo of analyzed) {
    const room = photo.analysis?.roomType ?? 'Unclassified';
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(photo);
  }

  const roomEntries = Array.from(byRoom.entries()).sort(([a], [b]) => a.localeCompare(b));
  const sharedProps = { toolJobs, selectedPhotoIds, onToggleSelect, onSelectPhoto };

  return (
    <div className="flex gap-5 overflow-x-auto pb-3" style={{ scrollbarWidth: 'thin' }}>
      {pending.length > 0 && (
        <RoomColumn title="Analyzing" badge={pending.length} badgeColor="analysis" photos={pending} {...sharedProps} />
      )}
      {roomEntries.map(([room, roomPhotos]) => (
        <RoomColumn key={room} title={room} badge={roomPhotos.length} photos={roomPhotos} {...sharedProps} />
      ))}
      {failed.length > 0 && (
        <RoomColumn title="Failed" badge={failed.length} badgeColor="skip" photos={failed} {...sharedProps} />
      )}
    </div>
  );
}

function RoomColumn({
  title,
  badge,
  badgeColor = 'ink',
  photos,
  toolJobs,
  selectedPhotoIds,
  onToggleSelect,
  onSelectPhoto,
}: {
  title: string;
  badge: number;
  badgeColor?: string;
  photos: Photo[];
  toolJobs?: ToolJob[];
  selectedPhotoIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectPhoto: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-ink/70 whitespace-nowrap">{title}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold
          ${badgeColor === 'analysis' ? 'bg-analysis-soft text-analysis' :
            badgeColor === 'skip'     ? 'bg-skip-soft text-skip' :
            'bg-paper text-ink/40 border border-hairline'}`}>
          {badge}
        </span>
      </div>
      {/* Stack: first photo on top, ghost cards peeking behind, count + layers icon below */}
      <div className="flex flex-col items-start gap-1">
        <div className="relative" style={{ paddingBottom: photos.length > 1 ? 6 : 0, paddingRight: photos.length > 1 ? 6 : 0 }}>
          {photos.length > 2 && (
            <div className="absolute rounded-xl border border-hairline bg-paper/70 shadow-sm" style={{ width: 112, height: 80, top: 6, left: 6, zIndex: 0 }} />
          )}
          {photos.length > 1 && (
            <div className="absolute rounded-xl border border-hairline bg-paper/85 shadow-sm" style={{ width: 112, height: 80, top: 3, left: 3, zIndex: 1 }} />
          )}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <PhotoThumb
              photo={photos[0]}
              onSelect={onToggleSelect ? () => onToggleSelect(photos[0]._id) : () => onSelectPhoto(photos[0]._id)}
              activeJob={toolJobs?.find(j => j.sourceUrl === photos[0].url)}
              selected={selectedPhotoIds?.has(photos[0]._id) ?? false}
              selectionMode={!!onToggleSelect}
            />
          </div>
        </div>
        {photos.length > 1 && (
          <div className="flex items-center gap-1 text-ink/50">
            <Layers className="h-3 w-3" />
            <span className="text-[10px] font-semibold">{photos.length} photos</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoThumb({
  photo,
  onSelect,
  activeJob,
  selected,
  selectionMode,
}: {
  photo: Photo;
  onSelect: () => void;
  activeJob?: ToolJob;
  selected: boolean;
  selectionMode: boolean;
}) {
  const score      = photo.analysis?.qualityScore ?? null;
  const isPending  = photo.status === 'pending';
  const isFailed   = photo.status === 'failed';
  const isReady    = photo.status === 'analyzed' && photo.enhancementGate === 'approved';
  const isAIEdited = (photo.acceptedFixes?.length ?? 0) > 0;
  const isGenerated = isAIEdited;

  const needsAttention =
    photo.status === 'analyzed' &&
    (!photo.analysis?.roomType || photo.analysis?.emptyRoom || photo.analysis?.suitable === false);

  const hasJobProcessing = activeJob && ['queued', 'processing'].includes(activeJob.status);
  const hasJobReady      = activeJob?.status === 'ready_for_review';

  // The job can flip out of 'processing' before the new image bytes have actually
  // finished downloading, so track real image-load state instead of relying on job
  // status alone to decide when to stop showing the spinner. imageUpdatedAt busts the
  // cache so a completed edit actually triggers a re-fetch of the thumbnail — unlike
  // the generic updatedAt, it's untouched by metadata-only saves (e.g. re-analysis).
  const thumbSrc = resolvePhotoUrl(photo.url, photo.imageUpdatedAt || photo.updatedAt);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const showSpinner = isPending || hasJobProcessing || loadedSrc !== thumbSrc;

  return (
    <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 112 }}>
      {/* Outer div acts as the click-to-view-larger target; inner toggle buttons
          stopPropagation so they don't trigger the navigation. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
        style={{ width: 112, height: 80 }}
        className={`relative overflow-hidden rounded-xl border bg-paper group cursor-pointer focus:outline-none focus:ring-2 focus:ring-analysis/40 transition-all hover:shadow-md
          ${selected
            ? 'border-analysis ring-2 ring-analysis/30 shadow-sm'
            : 'border-hairline hover:border-analysis/40'}`}
        title={selectionMode ? undefined : 'Click to view larger'}
      >
        <Image
          key={thumbSrc}
          src={thumbSrc}
          alt={photo.originalName}
          fill unoptimized
          className={`object-cover transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
          onLoad={() => setLoadedSrc(thumbSrc)}
        />

        {showSpinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </div>
        )}

        {!showSpinner && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            {!selectionMode && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-semibold bg-black/50 px-1.5 py-0.5 rounded-full">
                View
              </span>
            )}
          </div>
        )}

        {selectionMode && (
          <div className={`absolute top-1 left-1 h-5 w-5 rounded flex items-center justify-center border-2 transition-all
            ${selected ? 'bg-analysis border-analysis' : 'bg-black/40 border-white/70'}`}>
            {selected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        )}

        <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
          {hasJobReady && (
            <span className="rounded-full bg-approved px-1.5 py-0.5 text-[8px] font-bold text-white shadow">Review</span>
          )}
          {isGenerated && !hasJobReady && (
            <span className="rounded-full bg-analysis px-1.5 py-0.5 text-[8px] font-bold text-white shadow">AI</span>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-1.5 py-0.5 bg-gradient-to-t from-black/60 to-transparent">
          {score !== null ? (
            <span className={`text-[9px] font-bold drop-shadow ${qualityColor(score)}`}>{score}/10</span>
          ) : <span />}
          <div className="flex gap-0.5">
            {photo.isCover   && <span className="text-[9px] text-yellow-300">★</span>}
            {isReady && !isGenerated && <span className="rounded bg-approved/80 px-1 text-[8px] text-white font-medium">ok</span>}
            {isFailed        && <span className="rounded bg-skip/80 px-1 text-[8px] text-white font-medium">!</span>}
          </div>
        </div>

      </div>

      {needsAttention && (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-gate animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-gate" />
          Needs attention
        </span>
      )}
    </div>
  );
}

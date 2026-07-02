'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { api, resolvePhotoUrl } from '@/lib/api';
import type { ListingDetail, ToolJob } from '@/lib/types';
import { Header } from '@/components/Header';
import { UploadDropzone } from '@/components/UploadDropzone';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { RoomGallery } from '@/components/RoomGallery';
import { MissingRoomsAlert } from '@/components/MissingRoomsAlert';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { PhotoSpotlight } from '@/components/PhotoSpotlight';

const TOOL_NAMES: Record<string, string> = {
  photo_enhancement:      'Photo enhancement',
  defurnishing:           'Defurnishing',
  smart_editing:          'Smart editing',
  multi_image_analysis:   'Photo-set review',
  floor_plan_recognition: 'Floor-plan recognition',
  virtual_staging:        'Furniture suggestion',
  listing_copy:           'Listing preparation',
  content_moderation:     'Content review',
};

/* ─── Furniture plan viewer (for virtual_staging resultData) ─── */
function FurniturePlan({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  function asStr(v: unknown): string { return v != null ? String(v) : ''; }
  function hasVal(v: unknown): boolean { return v != null && v !== ''; }

  const roomLabel = hasVal(data.roomType) ? asStr(data.roomType) : 'Furniture plan';

  return (
    <div className="border-t border-hairline">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-paper transition-colors"
      >
        <span className="text-xs font-semibold text-ink/70">{roomLabel} · furniture plan</span>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-ink/40" />
          : <ChevronDown className="h-3.5 w-3.5 text-ink/40" />}
      </button>

      {/* Collapsible content */}
      {open && (
    <div className="px-4 pb-4 space-y-3 border-t border-hairline pt-3">
      {/* Room */}
      {hasVal(data.roomType) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">Room</p>
          <p className="text-sm font-semibold text-ink">
            {asStr(data.roomType)}{hasVal(data.roomSubtype) ? ` — ${asStr(data.roomSubtype)}` : ''}
          </p>
        </div>
      )}

      {/* Dimensions */}
      {hasVal(data.estimatedDimensions) && typeof data.estimatedDimensions === 'object' && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">Estimated dimensions</p>
          {(() => {
            const d = data.estimatedDimensions as Record<string, unknown>;
            const parts: string[] = [];
            if (hasVal(d.widthMeters))  parts.push(`${d.widthMeters} m wide`);
            if (hasVal(d.lengthMeters)) parts.push(`${d.lengthMeters} m long`);
            if (hasVal(d.areaSqMeters)) parts.push(`${d.areaSqMeters} m²`);
            return <p className="text-xs text-ink/70">{parts.join(' × ') || '—'}</p>;
          })()}
        </div>
      )}

      {/* Style */}
      {hasVal(data.style) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">Style</p>
          <p className="text-xs text-ink/70">{asStr(data.style)}</p>
        </div>
      )}

      {/* Color palette */}
      {Array.isArray(data.colorPalette) && data.colorPalette.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1">Colors</p>
          <div className="flex flex-col gap-0.5">
            {(data.colorPalette as unknown[]).map((c, i) => (
              <p key={i} className="text-xs text-ink/70">• {asStr(c)}</p>
            ))}
          </div>
        </div>
      )}

      {/* Lighting mood */}
      {hasVal(data.lightingMood) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">Lighting mood</p>
          <p className="text-xs text-ink/70">{asStr(data.lightingMood)}</p>
        </div>
      )}

      {/* Pieces */}
      {Array.isArray(data.pieces) && data.pieces.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1.5">Furniture plan</p>
          <div className="flex flex-col gap-1.5">
            {(data.pieces as Array<Record<string, unknown>>).map((piece, i) => (
              <div key={i} className="rounded-lg bg-paper border border-hairline px-3 py-2">
                <p className="text-xs font-semibold text-ink">{asStr(piece.item ?? piece.name ?? '')}</p>
                {hasVal(piece.placement) && (
                  <p className="text-[11px] text-ink/55 mt-0.5">
                    <span className="font-medium">Placement:</span> {asStr(piece.placement)}
                  </p>
                )}
                {hasVal(piece.reason) && (
                  <p className="text-[11px] text-ink/40 mt-0.5">{asStr(piece.reason)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lighting fixtures */}
      {Array.isArray(data.lighting) && data.lighting.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-1">Lighting fixtures</p>
          <div className="flex flex-col gap-0.5">
            {(data.lighting as Array<Record<string, unknown>>).map((l, i) => (
              <p key={i} className="text-xs text-ink/70">
                <span className="font-medium">{asStr(l.type ?? l.name ?? '')}</span>
                {hasVal(l.placement) ? ` — ${asStr(l.placement)}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Window treatments */}
      {hasVal(data.windowTreatments) && typeof data.windowTreatments === 'object' && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mb-0.5">Window treatments</p>
          {(() => {
            const wt = data.windowTreatments as Record<string, unknown>;
            const main = [wt.type, wt.color].filter(hasVal).map(asStr).join(' — ');
            return (
              <p className="text-xs text-ink/70">
                {main}{hasVal(wt.reason) ? `. ${asStr(wt.reason)}` : ''}
              </p>
            );
          })()}
        </div>
      )}

      {/* Summary */}
      {hasVal(data.summary) && (
        <div className="rounded-lg bg-analysis-soft px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-analysis/60 mb-1">Summary</p>
          <p className="text-xs text-ink/70 leading-relaxed">{asStr(data.summary)}</p>
        </div>
      )}
      </div>
      )}
    </div>
  );
}

/* ─── Generic result data viewer (non-furniture jobs) ─── */
function GenericResultData({ data }: { data: Record<string, unknown> }) {
  function renderVal(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
      return val
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return Object.values(item as Record<string, unknown>).map(String).join(' · ');
          }
          return String(item);
        })
        .join('\n');
    }
    if (typeof val === 'object') {
      return Object.entries(val as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(', ');
    }
    return String(val);
  }

  return (
    <div className="px-4 pb-3 space-y-1.5">
      {Object.entries(data).map(([key, val]) => (
        <div key={key}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            {key.replace(/([A-Z])/g, ' $1')}
          </p>
          <p className="text-xs text-ink/70 leading-snug whitespace-pre-wrap">{renderVal(val)}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Job card ─── */
function JobCard({
  job,
  onReview,
  onRetry,
}: {
  job: ToolJob;
  onReview: (jobId: string, decision: 'accept' | 'reject') => Promise<void>;
  onRetry: (jobId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-hairline bg-paper overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">{TOOL_NAMES[job.tool] ?? job.tool}</p>
          <p className="text-xs text-ink/50 mt-0.5">{job.message}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide
          ${job.status === 'ready_for_review' ? 'bg-approved-soft text-approved' :
            job.status === 'queued' || job.status === 'processing' ? 'bg-analysis-soft text-analysis' :
            'bg-paper text-ink/40'}`}>
          {job.status === 'ready_for_review' ? 'Ready' :
           job.status === 'processing'        ? 'Running…' :
           job.status === 'queued'            ? 'Queued' :
           job.status.replace('_', ' ')}
        </span>
      </div>

      {/* Image result — before/after slider */}
      {job.status === 'ready_for_review' && job.resultType === 'image' && job.resultUrl && job.sourceUrl && (
        <div className="px-4 pb-4">
          <BeforeAfterSlider
            beforeUrl={resolvePhotoUrl(job.sourceUrl)}
            afterUrl={resolvePhotoUrl(job.resultUrl)}
          />
        </div>
      )}

      {/* Data result */}
      {job.status === 'ready_for_review' && job.resultType !== 'image' && job.resultData && (
        job.tool === 'virtual_staging'
          ? <FurniturePlan data={job.resultData} />
          : <GenericResultData data={job.resultData} />
      )}

      {/* Accept / Reject */}
      {job.status === 'ready_for_review' && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            disabled={busy}
            onClick={() => void run(() => onReview(job._id, 'accept'))}
            className="flex-1 rounded-xl bg-approved px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 transition-all hover:bg-approved/85"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : 'Accept'}
          </button>
          <button
            disabled={busy}
            onClick={() => void run(() => onReview(job._id, 'reject'))}
            className="flex-1 rounded-xl border border-hairline px-3 py-2 text-xs font-semibold text-ink/60 disabled:opacity-40 transition-all hover:bg-paper"
          >
            Reject
          </button>
        </div>
      )}

      {/* Retry */}
      {(job.status === 'failed' || job.status === 'rejected') && (
        <div className="px-4 pb-3">
          <button
            onClick={() => void run(() => onRetry(job._id))}
            disabled={busy}
            className="text-xs font-semibold text-analysis hover:underline disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3 inline mr-1" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Delete listing modal ─── */
function DeleteListingModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface shadow-2xl p-6">
        <h2 className="font-display text-base font-bold mb-1">Delete &ldquo;{title}&rdquo;?</h2>
        <p className="text-sm text-ink/50 mb-5">All photos will be permanently deleted. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-ink/60 hover:bg-paper transition-all">
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
            className="flex-1 rounded-xl bg-skip px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-skip/85 transition-all"
          >
            {busy ? 'Deleting…' : 'Delete listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPhotoId, setOpenPhotoId] = useState<string | null>(null);
  const [roomPreviewPhotoId, setRoomPreviewPhotoId] = useState<string | null>(null);
  const [roomPreviewViewMode, setRoomPreviewViewMode] = useState<'original' | 'generated'>('generated');
  // Tracks the src that has actually finished downloading, so the preview can show a
  // spinner instead of bare black while a freshly-generated image is still loading.
  const [loadedPreviewSrc, setLoadedPreviewSrc] = useState<string | null>(null);
  const [uploadHint, setUploadHint] = useState<{ roomType: string | null; photoId: string | null } | null>(null);
  // Count of files in the in-flight upload batch — shown as a number in place of the
  // "+" icon on the upload button so the user sees how many are uploading right now
  // (not a running total; resets/replaces on each new batch).
  const [uploadingCount, setUploadingCount] = useState<number | null>(null);
  const [deleteListingConfirm, setDeleteListingConfirm] = useState(false);
  // Local room-type overrides — applied immediately on user input so the UI
  // clears "Needs attention" without waiting for the backend to respond.
  const [roomOverrides, setRoomOverrides] = useState<Record<string, string>>({});
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const data = await api.getListing(params.id);
      setDetail(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load listing');
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Poll while photos are analyzing or jobs are running (single shared interval —
  // avoid two overlapping timers both re-fetching the full listing every 2s).
  useEffect(() => {
    const hasPendingPhotos = detail?.photos.some((p) => p.status === 'pending');
    const hasActiveJobs = detail?.toolJobs.some((j) => ['queued', 'processing'].includes(j.status));
    // Accepting an image job kicks off a background re-analysis on the backend
    // (to refresh roomType/emptyRoom/quality) without flipping photo.status to
    // 'pending' or the job's status away from 'accepted' — so neither check above
    // sees it. Keep polling for a short grace window after acceptance so that
    // result actually reaches the UI instead of leaving stale badges (e.g. "Empty
    // room") showing indefinitely.
    const hasRecentlyAcceptedImageJob = detail?.toolJobs.some((j) => {
      if (j.status !== 'accepted' || j.resultType !== 'image') return false;
      return Date.now() - new Date(j.updatedAt).getTime() < 20000;
    });
    if (!hasPendingPhotos && !hasActiveJobs && !hasRecentlyAcceptedImageJob) return;
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.photos, detail?.toolJobs, params.id]);

  // Custom events from child components
  useEffect(() => {
    function handleUploadRequest(event: Event) {
      const d = (event as CustomEvent<{ roomType?: string | null; photoId?: string | null }>).detail;
      setUploadHint({ roomType: d?.roomType ?? null, photoId: d?.photoId ?? null });
      document.getElementById('property-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function handleFocusPhoto(event: Event) {
      const d = (event as CustomEvent<{ photoId?: string | null }>).detail;
      if (d?.photoId) setOpenPhotoId(d.photoId);
    }
    window.addEventListener('zenrth:upload-request', handleUploadRequest);
    window.addEventListener('zenrth:focus-photo', handleFocusPhoto);
    return () => {
      window.removeEventListener('zenrth:upload-request', handleUploadRequest);
      window.removeEventListener('zenrth:focus-photo', handleFocusPhoto);
    };
  }, []);

  async function handleUpload(files: File[]) {
    setUploadingCount(files.length);
    try {
      await api.uploadPhotos(params.id, files);
      setUploadHint(null);
      await refresh();
    } finally {
      setUploadingCount(null);
    }
  }

  async function handleReanalyze(photoId: string) {
    await api.reanalyzePhoto(photoId);
    await refresh();
  }

  async function handleDeletePhoto(photoId: string) {
    await api.deletePhoto(photoId);
    await refresh();
  }

  async function handleDeleteListing() {
    await api.deleteListing(params.id);
    router.push('/');
  }

  async function handleGuidedAction(actionId: string, prompt?: string) {
    const result = await api.executeAction(params.id, actionId, prompt);
    if (result.type === 'upload') {
      window.dispatchEvent(
        new CustomEvent('zenrth:upload-request', {
          detail: { roomType: result.roomType, photoId: result.photoId },
        })
      );
      return;
    }
    if (result.type === 'furnishing_suggestion') {
      await refresh();
      window.dispatchEvent(
        new CustomEvent('zenrth:focus-photo', { detail: { photoId: result.photoId } })
      );
      return;
    }
    await refresh();
  }

  async function handleApplySuggestionForPhoto(photoId: string, prompt?: string) {
    const action = detail?.guidance.actions.find((a) => a.photoId === photoId && a.kind === 'tool');
    if (action) {
      await handleGuidedAction(action.actionId, prompt);
    } else {
      // No guidance action for this photo — trigger virtual staging directly
      await api.triggerVirtualStaging(params.id, photoId, prompt);
      await refresh();
    }
  }

  async function handleCustomEditForPhoto(photoId: string, prompt: string, sourceJobId?: string) {
    await api.customEditPhoto(params.id, photoId, prompt, sourceJobId);
    await refresh();
  }

  async function handleLabelRoom(photoId: string, roomType: string) {
    // Apply override locally first so the UI clears "Needs attention" instantly
    setRoomOverrides((prev) => ({ ...prev, [photoId]: roomType }));
    try {
      await api.updatePhotoRoomType(photoId, roomType);
    } catch {
      // Backend may not support room-type override — local override still stands
    }
    await refresh();
  }

  async function handleRejectJob(jobId: string) {
    await handleReviewJob(jobId, 'reject');
  }

  async function handleRejectJobAndRegenerate(jobId: string, photoId: string, prompt: string) {
    await api.reviewToolJob(params.id, jobId, 'reject');
    await handleApplySuggestionForPhoto(photoId, prompt);
  }

  async function handleTriggerStaging(photoId: string, prompt: string) {
    await api.triggerVirtualStaging(params.id, photoId, prompt);
    await refresh();
  }

  async function handleTriggerEnhancement(photoId: string) {
    await api.triggerEnhancement(params.id, photoId);
    await refresh();
  }

  async function handleTriggerDefurnishing(photoId: string) {
    await api.triggerDefurnishing(params.id, photoId);
    await refresh();
  }

  async function handlePatchFurnishingPlan(photoId: string, fields: Record<string, unknown>) {
    await api.patchFurnishingSuggestion(params.id, photoId, fields);
    // No full refresh needed — caller updates local state immediately
  }

  async function handleReviewJob(jobId: string, decision: 'accept' | 'reject') {
    try {
      await api.reviewToolJob(params.id, jobId, decision);
    } catch (e) {
      // This job can be reviewed from more than one place on the page (the photo
      // spotlight modal and the job list both show Accept/Reject for the same job).
      // A 409 here means the other surface already resolved it — sync to the real
      // state instead of crashing the page on what's effectively a stale click.
      if (e instanceof Error && /not waiting for review/i.test(e.message)) {
        await refresh();
        return;
      }
      throw e;
    }
    await refresh();
  }

  async function handleRetryJob(jobId: string) {
    await api.retryToolJob(params.id, jobId);
    await refresh();
  }

  async function updateGallery(photoIds: string[], coverPhotoId: string) {
    await api.updateGallery(params.id, photoIds, coverPhotoId);
    await refresh();
  }

  async function handleSetCover(photoId: string) {
    if (!detail) return;
    await updateGallery(detail.photos.map((p) => p._id), photoId);
  }

  async function handleMove(photoId: string, direction: -1 | 1) {
    if (!detail) return;
    const order = detail.photos.map((p) => p._id);
    const index = order.indexOf(photoId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    await updateGallery(order, detail.photos.find((p) => p.isCover)?._id || order[0]);
  }

  async function handleRestoreOriginal(photoId: string) {
    const versions = await api.listVersions(photoId);
    const original = versions.find((v) => v.kind === 'original');
    if (!original) throw new Error('The preserved original is not available.');
    await api.restoreVersion(photoId, original._id);
    await refresh();
  }

  async function handleReviewFurnishingSuggestion(photoId: string, decision: 'accept' | 'dismiss') {
    await api.reviewFurnishingSuggestion(params.id, photoId, decision);
    await refresh();
  }

  if (error) {
    return (
      <div>
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-10">
          <div className="rounded-xl border border-skip/30 bg-skip-soft text-skip text-sm px-4 py-3">{error}</div>
          <Link href="/" className="text-sm text-analysis hover:underline mt-4 inline-block">
            ← Back to listings
          </Link>
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div>
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-10">
          <p className="text-sm text-ink/40">Loading…</p>
        </main>
      </div>
    );
  }

  const { listing, photos, missingRoomTypes, costSummary, toolJobs } = detail;

  // Merge local room-type overrides so "Needs attention" clears immediately after user labels
  const photosWithOverrides = photos.map((p) => {
    const override = roomOverrides[p._id];
    if (!override) return p;
    return {
      ...p,
      analysis: p.analysis
        // emptyRoom and suitable both feed the "needs attention" check in PhotoSpotlight —
        // clearing only emptyRoom left photos with analysis.suitable === false stuck showing
        // the room picker forever, so the AI-suggestion button never had a chance to appear.
        ? { ...p.analysis, roomType: override, emptyRoom: false, suitable: true }
        : p.analysis,
    };
  });

  const allAnalyzed = photosWithOverrides.length > 0 && !photosWithOverrides.some((p) => p.status === 'pending');
  const activeJobs = toolJobs.filter((j) =>
    ['queued', 'processing', 'ready_for_review'].includes(j.status)
  );

  return (
    <div>
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* ── Title + delete ── */}
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-ink/40 hover:text-analysis transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            All listings
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <h1 className="font-display text-2xl font-bold">{listing.title}</h1>
              {listing.address && <p className="text-sm text-ink/50 mt-1">{listing.address}</p>}
            </div>
            <button
              onClick={() => setDeleteListingConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-ink/40 hover:text-skip hover:underline transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete listing
            </button>
          </div>
        </div>

        {/* ── 1. Big spotlight carousel ── */}
        {photosWithOverrides.length > 0 && (
          <div>
            <h2 className="font-display text-base font-bold mb-3">
              Photos ({photosWithOverrides.length})
              {photosWithOverrides.some((p) => p.status === 'pending') && (
                <span className="ml-2 text-xs font-normal text-ink/40 inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-analysis border-t-transparent animate-spin" />
                  Analyzing…
                </span>
              )}
            </h2>
            <PhotoSpotlight
              photos={photosWithOverrides}
              onSelectPhoto={(id) => setOpenPhotoId(id)}
              onLabelRoom={handleLabelRoom}
              onCustomEdit={handleCustomEditForPhoto}
              toolJobs={toolJobs}
              onAcceptJob={(jobId) => handleReviewJob(jobId, 'accept')}
              onRejectJob={handleRejectJob}
              onRejectJobAndRegenerate={handleRejectJobAndRegenerate}
              onTriggerStaging={handleTriggerStaging}
              onTriggerEnhancement={handleTriggerEnhancement}
              onTriggerDefurnishing={handleTriggerDefurnishing}
              onUploadMore={() => addMoreInputRef.current?.click()}
              uploadingCount={uploadingCount}
            />
          </div>
        )}

        {/* ── 2. By room — directly below carousel ── */}
        {photosWithOverrides.length > 0 && (
          <div id="property-photos">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold text-ink/60 uppercase tracking-wide">
                By room
              </h2>
            </div>

            <RoomGallery
              photos={photosWithOverrides}
              onSelectPhoto={(id) => {
                setRoomPreviewPhotoId(prev => prev === id ? null : id);
                setRoomPreviewViewMode('generated');
              }}
              toolJobs={toolJobs}
            />

            {/* ── Inline big-image preview (same 16:9 as the main carousel) ── */}
            {roomPreviewPhotoId && (() => {
              const prev = photosWithOverrides.find(p => p._id === roomPreviewPhotoId);
              if (!prev) return null;
              const analyzedPhotos = photosWithOverrides.filter(p => p.status === 'analyzed');
              const idx = analyzedPhotos.findIndex(p => p._id === roomPreviewPhotoId);
              const previewSrc =
                (prev.acceptedFixes?.length ?? 0) > 0 && roomPreviewViewMode === 'original' && prev.originalUrl
                  ? resolvePhotoUrl(prev.originalUrl)
                  : resolvePhotoUrl(prev.url, prev.imageUpdatedAt || prev.updatedAt);
              return (
                <div className="mt-3 relative rounded-2xl overflow-hidden bg-neutral-300" style={{ aspectRatio: '16/9' }}>
                  <Image
                    key={previewSrc}
                    src={previewSrc}
                    alt={prev.originalName}
                    fill
                    unoptimized
                    className="object-contain"
                    priority
                    onLoad={() => setLoadedPreviewSrc(previewSrc)}
                  />
                  {loadedPreviewSrc !== previewSrc && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                    </div>
                  )}
                  {/* Room label */}
                  {prev.analysis?.roomType && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                        {prev.analysis.roomType}
                      </span>
                    </div>
                  )}
                  {/* Close */}
                  <button
                    onClick={() => setRoomPreviewPhotoId(null)}
                    className="absolute top-4 right-4 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {/* Prev */}
                  {idx > 0 && (
                    <button
                      onClick={() => { setRoomPreviewPhotoId(analyzedPhotos[idx - 1]._id); setRoomPreviewViewMode('generated'); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {/* Next */}
                  {idx < analyzedPhotos.length - 1 && (
                    <button
                      onClick={() => { setRoomPreviewPhotoId(analyzedPhotos[idx + 1]._id); setRoomPreviewViewMode('generated'); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  {/* Original / AI toggle — only for photos with an accepted AI edit */}
                  {(prev.acceptedFixes?.length ?? 0) > 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full bg-black/55 border border-white/20 p-1 backdrop-blur-sm shadow-lg">
                      <button
                        onClick={() => setRoomPreviewViewMode('original')}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                          roomPreviewViewMode === 'original' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/15'
                        }`}
                      >
                        Switch to Original
                      </button>
                      <button
                        onClick={() => setRoomPreviewViewMode('generated')}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                          roomPreviewViewMode === 'generated' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/15'
                        }`}
                      >
                        Switch to Generated
                      </button>
                    </div>
                  )}
                  {/* Counter */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                      {idx + 1} / {analyzedPhotos.length}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 3. Missing rooms — after By room, only once analysis is complete ── */}
        {allAnalyzed && (
          <MissingRoomsAlert missingRoomTypes={missingRoomTypes} />
        )}

        {/* ── 4. Upload dropzone — hidden once photos exist; "+" thumb triggers the hidden input ── */}
        <div id="property-upload">
          {uploadHint && (uploadHint.roomType || uploadHint.photoId) && (
            <div className="mb-3 rounded-xl bg-analysis-soft px-4 py-2.5 text-xs text-analysis font-medium">
              Uploading for: {uploadHint.roomType ?? 'this photo'}
            </div>
          )}
          {photosWithOverrides.length === 0 ? (
            <UploadDropzone onUpload={handleUpload} />
          ) : (
            <input
              ref={addMoreInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length) await handleUpload(files);
              }}
            />
          )}
        </div>

        {/* ── 5. Active AI jobs ── */}
        {activeJobs.length > 0 && (
          <div className="rounded-xl border border-hairline bg-surface p-5">
            <h2 className="font-display text-base font-bold mb-3 flex items-center gap-2">
              AI Results
              {activeJobs.some((j) => j.status === 'ready_for_review') && (
                <span className="rounded-full bg-approved-soft text-approved text-[10px] font-semibold px-2 py-0.5">
                  {activeJobs.filter((j) => j.status === 'ready_for_review').length} ready
                </span>
              )}
            </h2>
            <div className="flex flex-col gap-3">
              {activeJobs.map((job) => (
                <JobCard key={job._id} job={job} onReview={handleReviewJob} onRetry={handleRetryJob} />
              ))}
            </div>
          </div>
        )}

        {photosWithOverrides.length === 0 && (
          <p className="text-sm text-ink/40 text-center py-8">
            No photos yet — upload some above to start the pipeline.
          </p>
        )}

      </main>

      {/* ── Full-screen photo carousel ── */}
      {openPhotoId && (
        <PhotoCarousel
          photos={photosWithOverrides}
          initialPhotoId={openPhotoId}
          qualityThreshold={costSummary.qualityThreshold}
          onClose={() => setOpenPhotoId(null)}
          onReanalyze={handleReanalyze}
          onDelete={handleDeletePhoto}
          onSetCover={handleSetCover}
          onMove={handleMove}
          onRestoreOriginal={handleRestoreOriginal}
          onReviewFurnishingSuggestion={handleReviewFurnishingSuggestion}
          toolJobs={toolJobs}
          onApplySuggestion={handleApplySuggestionForPhoto}
          onReviewJob={handleReviewJob}
          onRetryJob={handleRetryJob}
        />
      )}

      {/* ── Delete listing modal ── */}
      {deleteListingConfirm && (
        <DeleteListingModal
          title={listing.title}
          onConfirm={handleDeleteListing}
          onCancel={() => setDeleteListingConfirm(false)}
        />
      )}
    </div>
  );
}

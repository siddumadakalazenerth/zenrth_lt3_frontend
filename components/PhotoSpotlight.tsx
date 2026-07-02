'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronLeft, ChevronRight, Wand2, Pencil, Check, X,
  RefreshCw, Sparkles, Sofa,
  Armchair, Coffee, Tv, LampFloor, Lamp, LampDesk,
  Library, Flower2, Frame, Shirt, BedDouble, BedSingle,
  Bath, ShowerHead, Monitor, Utensils, Umbrella, Car, Wrench,
  LayoutGrid, Package, Flame, Layers,
} from 'lucide-react';
import type { Photo, ToolJob } from '@/lib/types';
import { resolvePhotoUrl } from '@/lib/api';
import { BeforeAfterSlider, type SliderViewMode } from './BeforeAfterSlider';
import { getRoomFurniture, STAGING_STYLES } from '@/lib/roomFurniture';

const FURNITURE_ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Coffee, Tv, LampFloor, Lamp, LampDesk,
  Library, Flower2, Frame, Shirt, BedDouble, BedSingle,
  Bath, ShowerHead, Monitor, Utensils, Umbrella, Car, Wrench,
  LayoutGrid, Package, Flame, Layers, Sparkles,
};

const ROOM_TYPES = [
  'Living Room', 'Bedroom', 'Kitchen', 'Bathroom',
  'Dining Room', 'Balcony', 'Hallway', 'Garage', 'Exterior', 'Other',
];

function normalizeRoomType(input: string): string {
  const s = input.toLowerCase().trim();
  if (ROOM_TYPES.map(r => r.toLowerCase()).includes(s)) {
    return ROOM_TYPES.find(r => r.toLowerCase() === s)!;
  }
  if (/bed\s*room|bed/.test(s) && !/bathroom/.test(s))  return 'Bedroom';
  if (/bath\s*room|toilet|shower|wc/.test(s))            return 'Bathroom';
  if (/kitchen|cook|pantry/.test(s))                     return 'Kitchen';
  if (/living|lounge|sitting|family\s*room|reception/.test(s)) return 'Living Room';
  if (/dining|dinner/.test(s))                           return 'Dining Room';
  if (/balcony|patio|terrace|veranda/.test(s))           return 'Balcony';
  if (/hall(way)?|corridor|entrance|foyer|lobby/.test(s)) return 'Hallway';
  if (/garage|parking|carport/.test(s))                  return 'Garage';
  if (/exterior|garden|yard|outside|outdoor|front\s*door|backyard/.test(s)) return 'Exterior';
  return 'Other';
}

// Real-estate words that cycle in the staging typewriter
const STAGING_WORDS = [
  'Staging', 'Furnishing', 'Designing', 'Decorating',
  'Arranging', 'Transforming', 'Styling', 'Curating',
  'Crafting', 'Perfecting',
];

// Words that cycle in the defurnishing typewriter
const DEFURNISHING_WORDS = [
  'Clearing', 'Removing', 'Emptying', 'Decluttering',
  'Resetting', 'Stripping', 'Cleaning', 'Vacating',
  'Simplifying', 'Refreshing',
];

// Words that cycle in the enhancement typewriter
const ENHANCEMENT_WORDS = [
  'Enhancing', 'Brightening', 'Sharpening', 'Balancing',
  'Correcting', 'Refining', 'Polishing', 'Clarifying',
  'Optimizing', 'Perfecting',
];

// Furniture icons that cycle in the defurnishing ticker (shown struck-through)
const DEFURNISHING_ITEMS = [
  { id: 'sofa',     icon: 'Sofa',       label: 'Sofa'         },
  { id: 'armchair', icon: 'Armchair',   label: 'Armchair'     },
  { id: 'bed',      icon: 'BedDouble',  label: 'Bed'          },
  { id: 'coffee',   icon: 'Coffee',     label: 'Coffee Table' },
  { id: 'tv',       icon: 'Tv',         label: 'TV Unit'      },
  { id: 'lamp',     icon: 'LampFloor',  label: 'Floor Lamp'   },
  { id: 'shelf',    icon: 'Library',    label: 'Bookshelf'    },
  { id: 'frame',    icon: 'Frame',      label: 'Wall Art'     },
];

interface PhotoSpotlightProps {
  photos: Photo[];
  onSelectPhoto: (photoId: string) => void;
  onLabelRoom: (photoId: string, roomType: string) => Promise<void>;
  // Freeform "regenerate with changes" instructions on an already-staged/generated
  // image — routes to the custom_edit tool instead of whichever guided-action tool
  // the photo happens to already have, since that tool may not allow the requested change.
  onCustomEdit?: (photoId: string, prompt: string, sourceJobId?: string) => Promise<void>;
  toolJobs?: ToolJob[];
  onAcceptJob?: (jobId: string) => Promise<void>;
  onRejectJob?: (jobId: string) => Promise<void>;
  onRejectJobAndRegenerate?: (jobId: string, photoId: string, reason: string) => Promise<void>;
  onTriggerStaging?: (photoId: string, prompt: string) => Promise<void>;
  onTriggerEnhancement?: (photoId: string) => Promise<void>;
  onTriggerDefurnishing?: (photoId: string) => Promise<void>;
  onUploadMore?: () => void;
  // Size of the batch currently being uploaded (e.g. user picked 3 files) — shown as
  // a number + spinner in place of the "+" icon on the upload button. null/undefined
  // when no upload is in flight.
  uploadingCount?: number | null;
}

export function PhotoSpotlight({
  photos,
  onSelectPhoto,
  onLabelRoom,
  onCustomEdit,
  toolJobs,
  onAcceptJob,
  onRejectJob,
  onRejectJobAndRegenerate,
  onTriggerStaging,
  onTriggerEnhancement,
  onTriggerDefurnishing,
  onUploadMore,
  uploadingCount,
}: PhotoSpotlightProps) {
  // Tracked by stable photo _id, not array position — the backend recalculates
  // display order (coverRank, by quality score) on every poll, so the photos
  // array can reorder under the user mid-session. Tracking by index alone meant
  // "position 1" could silently start pointing at a different photo without any
  // per-photo state (toggle buttons, slider mode, etc.) resetting to match.
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(photos[0]?._id ?? null);
  const [customRoom, setCustomRoom]     = useState('');
  const [labelingBusy, setLabelingBusy] = useState(false);
  const [applyBusy, setApplyBusy]       = useState(false);
  const [enhanceBusy, setEnhanceBusy]   = useState(false);
  const [jobBusy, setJobBusy]           = useState(false);
  // The last image src that actually finished loading, painted as a CSS backdrop
  // behind the main image area. Slow image fetches (and switching between the plain
  // photo view and the before/after slider, which unmount/remount) would otherwise
  // show a blank black void until the new src loads — this keeps the previous frame
  // visible underneath so nothing ever goes fully blank.
  const [lastGoodSrc, setLastGoodSrc]   = useState<string | null>(null);



  // Image suggestion review — "Edit" panel (text instruction) + Regenerate flow
  const [showImageRegenPanel, setShowImageRegenPanel] = useState(false);
  const [imageRegenPrompt, setImageRegenPrompt]       = useState('');
  const [imageRegenLoading, setImageRegenLoading]     = useState(false);

  // Furniture picker
  const [showFurniturePicker, setShowFurniturePicker]     = useState(false);
  const [selectedFurnitureIds, setSelectedFurnitureIds]   = useState<Set<string>>(new Set());
  const [pickerStyle, setPickerStyle]                     = useState<string>('modern');
  const [furniturePickerBusy, setFurniturePickerBusy]     = useState(false);
  // Snapshot of selected items captured at Generate-click time, used to render
  // the icon strip in the loading overlay without relying on selectedFurnitureIds
  // still being populated after the picker closes and state may have shifted.
  const [stagingItems, setStagingItems] = useState<{ id: string; label: string; icon: string; iconType: string }[]>([]);
  // Which icon in the ticker is currently being shown (cycles with setInterval)
  const [stagingTickerIdx, setStagingTickerIdx] = useState(0);
  // Stays true from "Enhance" click until the enhanced image job arrives — bridges
  // the gap between the API call returning and jobRunning kicking in on the next poll.
  const [isEnhancing, setIsEnhancing]                     = useState(false);
  // 'furnish' = Furniture picker flow; 'defurnish' = remove furniture flow
  const [furnitureMode, setFurnitureMode]                 = useState<'furnish' | 'defurnish'>('furnish');
  // True from "Defurnish" click until the defurnishing image job arrives
  const [isDefurnishing, setIsDefurnishing]               = useState(false);
  // Brief tooltip shown when user clicks Furniture on an Exterior photo
  const [showExteriorMsg, setShowExteriorMsg]             = useState(false);
  // Brief tooltip shown when room has furniture but defurnishing hasn't been accepted yet
  const [showDefurnishFirstMsg, setShowDefurnishFirstMsg] = useState(false);
  // Enhancement typewriter: which word and how many letters are currently typed
  const [enhWordIdx,    setEnhWordIdx]    = useState(0);
  const [enhLetterCount, setEnhLetterCount] = useState(0);
  // Staging typewriter: which word and how many letters are currently typed
  const [stagWordIdx,    setStagWordIdx]    = useState(0);
  const [stagLetterCount, setStagLetterCount] = useState(0);
  // Defurnishing ticker + typewriter
  const [defurnTickerIdx,   setDefurnTickerIdx]   = useState(0);
  const [defurnWordIdx,     setDefurnWordIdx]     = useState(0);
  const [defurnLetterCount, setDefurnLetterCount] = useState(0);

  // Switch-back-to-original / switch-to-generated toggle for the before/after slider
  const [imageViewMode, setImageViewMode] = useState<SliderViewMode>('slider');
  const [lastImageJobId, setLastImageJobId] = useState<string | null>(null);
  // Id of the last 'failed' job already surfaced to the user, so the error banner
  // doesn't re-show itself as toolJobs keeps polling in with the same failed job.
  const [lastFailedJobId, setLastFailedJobId] = useState<string | null>(null);
  const [jobErrorMessage, setJobErrorMessage] = useState<string | null>(null);

  // Persistent post-accept comparison toggle — once an edit has been accepted, the photo's
  // *bytes* change but its URL stays the same, so we keep a separate "before" view sourced
  // from the stable originalUrl snapshot the backend preserves. This survives reloads.
  const [acceptedViewMode, setAcceptedViewMode] = useState<'original' | 'generated'>('generated');

  const imageContainerRef      = useRef<HTMLDivElement>(null);
  const autoAcceptNextPlanRef  = useRef(false);
  const thumbStripRef          = useRef<HTMLDivElement>(null);
  const thumbSnapTimeoutRef    = useRef<number | null>(null);

  const idIndex       = photos.findIndex(p => p._id === selectedPhotoId);
  const clampedIndex  = idIndex >= 0 ? idIndex : 0;
  const photo         = photos[clampedIndex];
  const { room: pickerRoom, items: furnitureItems } = getRoomFurniture(photo?.analysis?.roomType ?? null);

  // If the selected photo disappears from the array (deleted, or not found yet on
  // first mount), fall back to whichever photo now occupies the first slot.
  useEffect(() => {
    if (photos.length > 0 && !photos.some(p => p._id === selectedPhotoId)) {
      setSelectedPhotoId(photos[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, selectedPhotoId]);

  // Active job derivation (exclude accepted/rejected)
  const _photoJobs = (toolJobs ?? []).filter(
    j => j.sourceUrl === photo?.url && !['accepted', 'rejected'].includes(j.status)
  );
  const _activeJob =
    _photoJobs.find(j => j.status === 'ready_for_review' && j.resultType === 'image') ??
    _photoJobs.find(j => j.status === 'ready_for_review') ??
    _photoJobs.find(j => ['queued', 'processing'].includes(j.status));
  const _jobHasPlan =
    _activeJob?.status === 'ready_for_review' &&
    _activeJob?.resultType !== 'image' &&
    !!_activeJob?.resultData;

  // Reset all per-photo state when the photo changes
  useEffect(() => {
    setCustomRoom('');
    setShowImageRegenPanel(false);
    setImageRegenPrompt('');
    setImageRegenLoading(false);
    setImageViewMode('slider');
    setLastImageJobId(null);
    setLastFailedJobId(null);
    setJobErrorMessage(null);
    setAcceptedViewMode('generated');
    setShowFurniturePicker(false);
    setSelectedFurnitureIds(new Set());
    setPickerStyle('modern');
    setFurniturePickerBusy(false);
    setIsEnhancing(false);
    setIsDefurnishing(false);
    setFurnitureMode('furnish');
    setShowExteriorMsg(false);
    setShowDefurnishFirstMsg(false);
    setStagingItems([]);
    setEnhWordIdx(0); setEnhLetterCount(0);
    setStagWordIdx(0); setStagLetterCount(0);
    setDefurnTickerIdx(0); setDefurnWordIdx(0); setDefurnLetterCount(0);
    setLastGoodSrc(photo ? resolvePhotoUrl(photo.url, photo.imageUpdatedAt || photo.updatedAt) : null);
    autoAcceptNextPlanRef.current = false;
  }, [photo?._id]);

  // Auto-accept every plan job immediately — no plan panel is shown to the user.
  // Accepting a furnishing plan also kicks off the actual image-render job on the
  // backend (see reviewToolJob) — if THAT step throws, the plan job never flips out
  // of ready_for_review, so this effect's dependency never changes and never retries.
  // Without error handling here, that failure was completely silent: no image, no
  // error message, and the "Generating..." overlay spun forever.
  useEffect(() => {
    if (_jobHasPlan && _activeJob && onAcceptJob) {
      autoAcceptNextPlanRef.current = false;
      const jobId = _activeJob._id;
      onAcceptJob(jobId).catch((err) => {
        setJobErrorMessage(err instanceof Error ? err.message : 'Could not generate the staged image. Please try again.');
        setFurniturePickerBusy(false);
        setApplyBusy(false);
        setStagingItems([]);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_jobHasPlan]);

  // When a new (or regenerated) image suggestion lands in ready_for_review, clear the
  // regenerate panel/loading state and show the 50/50 before/after comparison split.
  useEffect(() => {
    const imgJob = (toolJobs ?? []).find(
      j => j.sourceUrl === photo?.url && j.status === 'ready_for_review' && j.resultType === 'image'
    );
    if (imgJob && imgJob._id !== lastImageJobId) {
      setLastImageJobId(imgJob._id);
      setImageRegenLoading(false);
      setShowImageRegenPanel(false);
      setImageRegenPrompt('');
      setImageViewMode('slider');
      setFurniturePickerBusy(false);
      setIsEnhancing(false);
      setIsDefurnishing(false);
      setStagingItems([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolJobs, photo?.url]);

  // If the active job fails (Gemini error, safety block, timeout, etc.), clear every
  // busy/loading flag and surface the error — without this, a failed job (as opposed
  // to one reaching ready_for_review) left the loading overlay spinning forever, since
  // nothing else ever flips isEnhancing/isDefurnishing/furniturePickerBusy back off.
  useEffect(() => {
    const failedJob = (toolJobs ?? []).find(
      j => j.sourceUrl === photo?.url && j.status === 'failed'
    );
    if (failedJob && failedJob._id !== lastFailedJobId) {
      setLastFailedJobId(failedJob._id);
      setJobErrorMessage(failedJob.errorMessage || 'That action failed. Please try again.');
      setIsEnhancing(false);
      setIsDefurnishing(false);
      setFurniturePickerBusy(false);
      setImageRegenLoading(false);
      setShowImageRegenPanel(false);
      setApplyBusy(false);
      setEnhanceBusy(false);
      setJobBusy(false);
      setStagingItems([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolJobs, photo?.url]);

  // Cycle the staging ticker — advances to the next icon every 800ms while busy.
  // The matching CSS animation is also 800ms so each icon completes its
  // enter→hold→exit arc before the next one replaces it.
  useEffect(() => {
    if (!furniturePickerBusy || stagingItems.length === 0) return;
    setStagingTickerIdx(0);
    const id = setInterval(() => {
      setStagingTickerIdx(n => (n + 1) % stagingItems.length);
    }, 800);
    return () => clearInterval(id);
  }, [furniturePickerBusy, stagingItems.length]);

  // Enhancement typewriter — same pattern as staging, cycles through ENHANCEMENT_WORDS.
  useEffect(() => {
    if (!isEnhancing) { setEnhWordIdx(0); setEnhLetterCount(0); return; }
    let cancelled = false;
    function runWord(wIdx: number) {
      if (cancelled) return;
      const word = ENHANCEMENT_WORDS[wIdx % ENHANCEMENT_WORDS.length];
      setEnhWordIdx(wIdx % ENHANCEMENT_WORDS.length);
      let lc = 0;
      function typeNext() {
        if (cancelled) return;
        if (lc < word.length) { lc++; setEnhLetterCount(lc); setTimeout(typeNext, 75); }
        else { setTimeout(eraseNext, 600); }
      }
      function eraseNext() {
        if (cancelled) return;
        if (lc > 0) { lc--; setEnhLetterCount(lc); setTimeout(eraseNext, 42); }
        else { setTimeout(() => runWord(wIdx + 1), 260); }
      }
      setEnhLetterCount(0);
      setTimeout(typeNext, 80);
    }
    runWord(0);
    return () => { cancelled = true; };
  }, [isEnhancing]);

  // Staging typewriter: cycle through STAGING_WORDS, typing and erasing each.
  useEffect(() => {
    if (!furniturePickerBusy) { setStagWordIdx(0); setStagLetterCount(0); return; }
    let cancelled = false;
    function runWord(wIdx: number) {
      if (cancelled) return;
      const word = STAGING_WORDS[wIdx % STAGING_WORDS.length];
      setStagWordIdx(wIdx % STAGING_WORDS.length);
      let lc = 0;
      function typeNext() {
        if (cancelled) return;
        if (lc < word.length) { lc++; setStagLetterCount(lc); setTimeout(typeNext, 75); }
        else { setTimeout(eraseNext, 600); }
      }
      function eraseNext() {
        if (cancelled) return;
        if (lc > 0) { lc--; setStagLetterCount(lc); setTimeout(eraseNext, 42); }
        else { setTimeout(() => runWord(wIdx + 1), 260); }
      }
      setStagLetterCount(0);
      setTimeout(typeNext, 80);
    }
    runWord(0);
    return () => { cancelled = true; };
  }, [furniturePickerBusy]);

  // Defurnishing ticker — cycles through DEFURNISHING_ITEMS every 800ms while busy
  useEffect(() => {
    if (!isDefurnishing) { setDefurnTickerIdx(0); return; }
    setDefurnTickerIdx(0);
    const id = setInterval(() => {
      setDefurnTickerIdx(n => (n + 1) % DEFURNISHING_ITEMS.length);
    }, 800);
    return () => clearInterval(id);
  }, [isDefurnishing]);

  // Defurnishing typewriter — same pattern as staging, uses DEFURNISHING_WORDS
  useEffect(() => {
    if (!isDefurnishing) { setDefurnWordIdx(0); setDefurnLetterCount(0); return; }
    let cancelled = false;
    function runWord(wIdx: number) {
      if (cancelled) return;
      const word = DEFURNISHING_WORDS[wIdx % DEFURNISHING_WORDS.length];
      setDefurnWordIdx(wIdx % DEFURNISHING_WORDS.length);
      let lc = 0;
      function typeNext() {
        if (cancelled) return;
        if (lc < word.length) { lc++; setDefurnLetterCount(lc); setTimeout(typeNext, 75); }
        else { setTimeout(eraseNext, 600); }
      }
      function eraseNext() {
        if (cancelled) return;
        if (lc > 0) { lc--; setDefurnLetterCount(lc); setTimeout(eraseNext, 42); }
        else { setTimeout(() => runWord(wIdx + 1), 260); }
      }
      setDefurnLetterCount(0);
      setTimeout(typeNext, 80);
    }
    runWord(0);
    return () => { cancelled = true; };
  }, [isDefurnishing]);

  const prev = useCallback(() => {
    const i = Math.max(0, clampedIndex - 1);
    setSelectedPhotoId(photos[i]?._id ?? null);
  }, [clampedIndex, photos]);
  const next = useCallback(() => {
    const i = Math.min(photos.length - 1, clampedIndex + 1);
    setSelectedPhotoId(photos[i]?._id ?? null);
  }, [clampedIndex, photos]);

  // Lets hovering the strip and using a normal (vertical) mouse wheel scroll it
  // horizontally, instead of only responding to shift-scroll or a horizontal
  // trackpad swipe. Only hijacks the wheel when the strip actually has somewhere
  // to scroll — otherwise vertical page scrolling over it behaves normally.
  //
  // Attached as a native listener rather than JSX's onWheel: React always registers
  // onWheel as passive, so calling preventDefault() inside it silently fails (logs
  // "Unable to preventDefault inside passive event listener invocation") — the page
  // would keep scrolling vertically underneath the horizontal scroll at the same time.
  // { passive: false } here is the only way to actually stop that.
  useEffect(() => {
    const el = thumbStripRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (el!.scrollWidth <= el!.clientWidth) return;
      e.preventDefault();
      el!.scrollLeft += e.deltaY + e.deltaX;
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const THUMB_SNAP_STEP = 120; // 112px thumb width + 8px gap

  // Once scrolling (wheel, trackpad, or scrollbar drag) pauses, settle on the nearest
  // item boundary instead of resting wherever the gesture happened to stop — otherwise
  // a thumbnail is often left showing partially clipped right before the upload button.
  // Plain CSS scroll-snap can't be used here: it fights the wheel handler above (a
  // `scroll-snap-type` axis blocks/reverts the repeated small `scrollLeft +=`
  // increments a synthetic wheel-to-horizontal conversion relies on), so this settles
  // the position manually via a debounce instead.
  function handleThumbStripScroll() {
    const el = thumbStripRef.current;
    if (!el) return;
    if (thumbSnapTimeoutRef.current) window.clearTimeout(thumbSnapTimeoutRef.current);
    thumbSnapTimeoutRef.current = window.setTimeout(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      const nearest = Math.round(el.scrollLeft / THUMB_SNAP_STEP) * THUMB_SNAP_STEP;
      const clamped = Math.max(0, Math.min(nearest, maxScroll));
      if (Math.abs(clamped - el.scrollLeft) > 1) el.scrollTo({ left: clamped, behavior: 'smooth' });
    }, 120);
  }

  if (!photo || photos.length === 0) return null;

  // Derived display state
  const isPending      = photo.status === 'pending';
  const isAnalyzed     = photo.status === 'analyzed';
  // Only a missing room label actually blocks every action — the user must
  // tell us what room it is before we can do anything useful with it.
  // "emptyRoom" and "suitable === false" are informational signals (shown as
  // a banner below), not reasons to hide Enhance/Furniture/Edit — those tools
  // are often exactly what fixes the issue the AI flagged (e.g. blur, low light).
  // needsAttention is true when Gemini couldn't identify the room at all (null) OR
  // classified it as "Other" — in both cases the user must label it before we can
  // suggest proper furniture, since all furniture lists are keyed by room type.
  const isOtherRoom    = isAnalyzed && photo.analysis?.roomType === 'Other';
  const isExterior     = isAnalyzed && photo.analysis?.roomType === 'Exterior';
  const needsAttention = isAnalyzed && (!photo.analysis?.roomType || isOtherRoom);
  // Room still has furniture (emptyRoom === false) AND defurnishing hasn't been
  // accepted yet → block furnishing until the user defurnishes first.
  const hasFurnitureBlocking =
    isAnalyzed &&
    photo.analysis?.emptyRoom === false &&
    !(photo.acceptedFixes ?? []).includes('defurnishing');
  const hasQualityFlag = isAnalyzed && !needsAttention &&
    (photo.analysis?.emptyRoom || photo.analysis?.suitable === false);
  const hasRoomType    = isAnalyzed && !!photo.analysis?.roomType;

  const activeJob  = _activeJob;
  const jobRunning  = !!activeJob && ['queued', 'processing'].includes(activeJob.status);
  const jobHasImage = activeJob?.status === 'ready_for_review' && activeJob?.resultType === 'image' && !!activeJob?.resultUrl;
  // True while any full-screen loading overlay (enhance/defurnish/stage/regenerate) is
  // covering the image. These states start on click, before jobRunning goes true (which
  // only flips once the backend confirms the job) — so the room label chip and the
  // Enhance/Furniture/Defurnish toolbar, which only checked !jobRunning, stayed
  // rendered underneath the semi-transparent overlay during that gap and showed through.
  const anyOverlayActive = isEnhancing || isDefurnishing || furniturePickerBusy || imageRegenLoading;

  // The plain (non-slider) main image — used post-accept and for the Original/
  // Generated toggle. These can be multi-MB downloads (especially blur-fix
  // recreations), so track whether THIS exact src has actually finished loading
  // (mirrors the pattern in RoomGallery.tsx) instead of assuming it's instant.
  const mainImageSrc = acceptedViewMode === 'original' && photo.originalUrl
    ? resolvePhotoUrl(photo.originalUrl)
    : resolvePhotoUrl(photo.url, photo.imageUpdatedAt || photo.updatedAt);
  const mainImageLoading = !jobHasImage && lastGoodSrc !== mainImageSrc;

  // Try to apply a simple edit instruction directly to the plan without calling AI.
  function buildSuggestionPrompt(extra?: string): string {
    const parts: string[] = [];
    if (photo.analysis?.roomType) parts.push(`Room: ${photo.analysis.roomType}`);
    if (extra) parts.push(extra);
    return parts.join('. ');
  }

  // Summarize the furnishing plan that's currently on this photo (style + pieces
  // + summary) so an edit instruction can be sent as "here's the existing plan,
  // here's what to change" rather than losing all context from the prior generation.
  function buildCurrentPlanSummary(): string {
    const suggestion = photo.furnishingSuggestion;
    if (!suggestion) return '';
    const bits: string[] = [];
    if (suggestion.style) bits.push(`Style: ${suggestion.style}`);
    if (Array.isArray(suggestion.pieces) && suggestion.pieces.length > 0) {
      bits.push(`Pieces: ${suggestion.pieces.map(p => p.item).filter(Boolean).join(', ')}`);
    }
    if (suggestion.summary) bits.push(suggestion.summary);
    return bits.join('. ');
  }

  async function handleLabelRoom(rawInput: string) {
    const normalized = normalizeRoomType(rawInput);
    setLabelingBusy(true);
    try { await onLabelRoom(photo._id, normalized); }
    finally { setLabelingBusy(false); setCustomRoom(''); }
  }

  function openFurniturePicker() {
    setSelectedFurnitureIds(new Set(furnitureItems.filter(i => i.essential).map(i => i.id)));
    setPickerStyle('modern');
    setShowFurniturePicker(true);
  }

  function toggleFurnitureItem(id: string) {
    setSelectedFurnitureIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function handleFurniturePick() {
    setShowFurniturePicker(false);
    if (!onTriggerStaging) return;
    setJobErrorMessage(null);
    // If there's a stale image result pending review, reject it so auto-accept fires
    // correctly for the new plan rather than being shadowed by the old render job.
    if (_activeJob?.resultType === 'image' && _activeJob.status === 'ready_for_review' && onRejectJob) {
      try { await onRejectJob(_activeJob._id); } catch { /* ignore — new generation takes priority */ }
    }
    setApplyBusy(true);
    setStagingItems(
      furnitureItems
        .filter(i => selectedFurnitureIds.has(i.id))
        .map(i => ({ id: i.id, label: i.label, icon: i.icon, iconType: i.iconType }))
    );
    setFurniturePickerBusy(true);
    autoAcceptNextPlanRef.current = true;
    const furniture = furnitureItems.filter(i => selectedFurnitureIds.has(i.id)).map(i => i.label);
    const parts: string[] = [];
    if (pickerStyle)          parts.push(`Style: ${pickerStyle}`);
    if (furniture.length > 0) parts.push(`Furniture: ${furniture.join(', ')}`);
    try {
      await onTriggerStaging(photo._id, buildSuggestionPrompt(parts.join('. ')));
    } catch (err) {
      // A failure here means no ToolJob was ever created (e.g. the initial request
      // itself failed), so there's nothing for the "job failed" effect to catch —
      // without clearing furniturePickerBusy here too, the full-screen "Staging..."
      // overlay would spin forever with no explanation.
      setJobErrorMessage(err instanceof Error ? err.message : 'Could not start furnishing. Please try again.');
      setFurniturePickerBusy(false);
      setStagingItems([]);
    } finally {
      setApplyBusy(false);
    }
  }

  async function handleDefurnish() {
    if (!onTriggerDefurnishing) return;
    setJobErrorMessage(null);
    setIsDefurnishing(true);
    try {
      await onTriggerDefurnishing(photo._id);
    } catch (err) {
      setJobErrorMessage(err instanceof Error ? err.message : 'Could not start defurnishing. Please try again.');
      setIsDefurnishing(false);
    }
  }

  function handleFurnitureClick(mode: 'furnish' | 'defurnish') {
    setFurnitureMode(mode);
    if (isExterior) {
      setShowExteriorMsg(true);
      setTimeout(() => setShowExteriorMsg(false), 3500);
      return;
    }
    if (mode === 'furnish' && hasFurnitureBlocking) {
      setShowDefurnishFirstMsg(true);
      setTimeout(() => setShowDefurnishFirstMsg(false), 4000);
      return;
    }
    if (mode === 'defurnish') {
      void handleDefurnish();
    } else {
      openFurniturePicker();
    }
  }

  async function handleEnhance() {
    if (!onTriggerEnhancement) return;
    setJobErrorMessage(null);
    setEnhanceBusy(true);
    setIsEnhancing(true);
    try {
      await onTriggerEnhancement(photo._id);
    } catch (err) {
      // No ToolJob exists yet if the initial request itself failed, so the
      // "job failed" effect has nothing to catch — clear isEnhancing here too,
      // otherwise the full-screen "Enhancing..." overlay spins forever.
      setJobErrorMessage(err instanceof Error ? err.message : 'Could not start enhancement. Please try again.');
      setIsEnhancing(false);
    } finally {
      setEnhanceBusy(false);
    }
  }

  async function handleAcceptJob() {
    if (!activeJob || !onAcceptJob) return;
    // Proactively snap the backdrop to the generated result so the
    // canonical photo URL loading after accept doesn't flash the old image.
    if (activeJob.resultUrl) setLastGoodSrc(resolvePhotoUrl(activeJob.resultUrl));
    setJobBusy(true);
    try {
      await onAcceptJob(activeJob._id);
      setLastImageJobId(null);
    } finally { setJobBusy(false); }
  }

  async function handleDirectReject() {
    const jobId = activeJob?._id;
    if (!jobId) return;
    setJobBusy(true);
    try {
      if (onRejectJob) await onRejectJob(jobId);
    } finally { setJobBusy(false); }
  }

  // Used by the image-suggestion review panel: edits the SPECIFIC image currently
  // shown (the staged photo awaiting accept/reject), not the original empty room.
  // Previously this rejected the job and re-ran the full plan+restage pipeline from
  // the original photo, which is why a request like "change the bedsheet color"
  // could come back with completely different furniture — it was regenerating from
  // scratch every time, not editing what was already there.
  async function handleImageRegenRegenerate() {
    if (!imageRegenPrompt.trim() || !activeJob) return;
    const instruction = imageRegenPrompt.trim();
    const sourceJobId = activeJob._id;

    setShowImageRegenPanel(false);
    setImageRegenLoading(true);
    setJobBusy(true);
    try {
      if (onCustomEdit) {
        // Edit the actual generated image in place, scoped to just this change.
        await onCustomEdit(photo._id, instruction, sourceJobId);
        // Superseded by the new edit job above — reject so it doesn't linger
        // alongside the new one and create ambiguity about which is "active".
        try { await onRejectJob?.(sourceJobId); } catch { /* already processed */ }
      } else if (onRejectJobAndRegenerate) {
        // Fallback for callers that haven't wired up onCustomEdit yet — note this
        // regenerates the whole staging plan from the original photo rather than
        // editing the current image, so results may differ more than expected.
        const planSummary = buildCurrentPlanSummary();
        const extra = planSummary
          ? `Current plan - ${planSummary}. Changes requested: ${instruction}`
          : `Changes requested: ${instruction}`;
        await onRejectJobAndRegenerate(sourceJobId, photo._id, buildSuggestionPrompt(extra));
      } else {
        try { await onRejectJob?.(sourceJobId); } catch { /* already processed */ }
        await onTriggerStaging?.(photo._id, buildSuggestionPrompt(`Changes requested: ${instruction}`));
      }
      setImageRegenPrompt('');
    } finally {
      setJobBusy(false);
      // imageRegenLoading is cleared automatically once the new image job arrives
      // (see the effect watching toolJobs above); clear it here too as a safety net
      // in case the backend responds without ever reaching ready_for_review.
      setImageRegenLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* ════════════════════ Main image area ════════════════════ */}
      <div
        ref={imageContainerRef}
        className="relative rounded-2xl overflow-hidden bg-neutral-300"
        style={{
          aspectRatio: '4/3',
          // Backdrop = last frame that actually finished loading, so switching
          // between the slider/plain views (which remount) or waiting on a slow
          // image fetch never shows a blank black void — the previous image stays
          // visible underneath until the new one is ready.
          ...(lastGoodSrc ? { backgroundImage: `url(${lastGoodSrc})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}),
        }}
      >

        {/* ── Image, persistent original/generated toggle view, or before/after slider ── */}
        {jobHasImage && activeJob?.sourceUrl && activeJob?.resultUrl ? (() => {
          const isFurnishingAfterDefurnish =
            (activeJob.tool === 'virtual_staging' || activeJob.tool === 'virtual_staging_render') &&
            (photo.acceptedFixes ?? []).includes('defurnishing');
          // When furnishing a defurnished room, show the ORIGINAL (with furniture) as
          // "before" so the comparison is meaningful — not the intermediate defurnished
          // version. Gemini still used the defurnished image as source for generation.
          const sliderBeforeUrl = isFurnishingAfterDefurnish && photo.originalUrl
            ? resolvePhotoUrl(photo.originalUrl)
            : resolvePhotoUrl(activeJob.sourceUrl);
          const sliderAfterUrl = resolvePhotoUrl(activeJob.resultUrl);
          // Labels vary by job type so the user knows what they're comparing
          const sliderBeforeLabel = activeJob.tool === 'defurnishing' ? 'Furnished' : 'Original';
          const sliderAfterLabel  = activeJob.tool === 'defurnishing' ? 'Defurnished' : 'Furnished';
          return (
            <BeforeAfterSlider
              beforeUrl={sliderBeforeUrl}
              afterUrl={sliderAfterUrl}
              beforeLabel={sliderBeforeLabel}
              afterLabel={sliderAfterLabel}
              className="absolute inset-0 cursor-col-resize select-none"
              viewMode={imageViewMode}
              onManualDrag={() => setImageViewMode('slider')}
              onAfterLoad={() => setLastGoodSrc(sliderAfterUrl)}
            />
          );
        })() : (
          <Image
            src={mainImageSrc}
            alt={photo.originalName}
            fill unoptimized priority
            className={`object-contain transition-opacity ${isPending || jobRunning || furniturePickerBusy ? 'opacity-60' : 'opacity-100'}`}
            onLoad={() => setLastGoodSrc(mainImageSrc)}
          />
        )}

        {/* ── Main image still downloading (post-accept swap, or Original/Generated
              toggle) — the backdrop behind this is the previous frame, which on its
              own can read as "still blurry" with no indication anything is happening.
              This makes clear a fresh (often multi-MB) image is actively loading. ── */}
        {mainImageLoading && !isPending && !jobRunning && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Loading image…
            </span>
          </div>
        )}

        {/* ── Persistent "Switch to Original / Switch to Generated" — shown any time this
              photo has an accepted edit on record (photo.originalUrl exists), even long
              after the review job itself is gone. Lets the seller re-compare at any time. ── */}
        {!jobHasImage && !needsAttention && !isPending && !jobRunning && (photo.acceptedFixes?.length ?? 0) > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/55 border border-white/20 p-1 backdrop-blur-sm shadow-lg">
            <button
              onClick={() => setAcceptedViewMode('original')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all
                ${acceptedViewMode === 'original' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/15'}`}
            >
              Switch to Original
            </button>
            <button
              onClick={() => setAcceptedViewMode('generated')}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all
                ${acceptedViewMode === 'generated' ? 'bg-white text-black' : 'text-white/75 hover:bg-white/15'}`}
            >
              Switch to Generated
            </button>
          </div>
        )}

        {/* ── "AI generated" badge — only when photo bytes are actually AI-replaced (acceptedFixes is non-empty) ── */}
        {!jobHasImage && !needsAttention && !isPending && !jobRunning && (photo.acceptedFixes?.length ?? 0) > 0 && acceptedViewMode === 'generated' && (
          <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
            <span className="rounded-full bg-analysis/90 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm shadow-md">
              AI generated
            </span>
          </div>
        )}

        {/* ── Analyzing spinner ── */}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="flex flex-col items-center gap-2">
              <span className="h-8 w-8 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
              <span className="text-xs text-white font-semibold">Analyzing…</span>
            </div>
          </div>
        )}

        {/* ── Full-screen loading overlay — furniture staging ── */}
        {furniturePickerBusy && !isPending && !jobHasImage && (() => {
          const tickerItem = stagingItems[stagingTickerIdx] ?? null;
          const IconComp = tickerItem?.iconType === 'lucide' ? FURNITURE_ICONS[tickerItem.icon] : null;
          return (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            >
              {/* Keyframe: enter from right → hold center → exit to left.
                  Inline so it's definitely in the DOM when the animation fires. */}
              <style>{`
                @keyframes staging-ticker {
                  0%   { opacity: 0; transform: translateX(56px);  }
                  22%  { opacity: 1; transform: translateX(0);      }
                  78%  { opacity: 1; transform: translateX(0);      }
                  100% { opacity: 0; transform: translateX(-56px);  }
                }
              `}</style>

              <span className="h-9 w-9 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
              {/* Typewriter — cycles real-estate words, typing then erasing each */}
              <div className="flex items-center h-6">
                <span className="text-sm font-semibold text-white font-mono">
                  {STAGING_WORDS[stagWordIdx].slice(0, stagLetterCount)}
                </span>
                <span className="text-sm font-semibold text-white animate-pulse ml-0.5">|</span>
              </div>

              {/* Single icon ticker — each icon crosses from right to left, then
                  the next one takes over. key=stagingTickerIdx forces a remount
                  on every index change so the CSS animation resets cleanly. */}
              {tickerItem && (
                <div className="relative h-20 w-44 flex items-center justify-center overflow-x-hidden">
                  <span
                    key={stagingTickerIdx}
                    className="absolute flex flex-col items-center gap-1"
                    style={{
                      animationName: 'staging-ticker',
                      animationDuration: '800ms',
                      animationTimingFunction: 'ease-in-out',
                      animationFillMode: 'both',
                    }}
                  >
                    <span className="flex items-center justify-center h-9 w-9 rounded-full bg-white/20">
                      {tickerItem.iconType === 'emoji'
                        ? <span className="text-xl leading-none">{tickerItem.icon}</span>
                        : IconComp
                          ? <IconComp className="h-5 w-5 text-white" />
                          : null}
                    </span>
                    <span className="text-[10px] font-medium text-white/60 whitespace-nowrap">
                      {tickerItem.label}
                    </span>
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Full-screen loading overlay — defurnishing ── */}
        {isDefurnishing && !furniturePickerBusy && !isPending && !jobHasImage && (() => {
          const defurnItem = DEFURNISHING_ITEMS[defurnTickerIdx];
          const DefurnIcon = FURNITURE_ICONS[defurnItem.icon] ?? null;
          return (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            >
              <style>{`
                @keyframes defurn-ticker {
                  0%   { opacity: 0; transform: translateX(56px);  }
                  22%  { opacity: 1; transform: translateX(0);      }
                  78%  { opacity: 1; transform: translateX(0);      }
                  100% { opacity: 0; transform: translateX(-56px);  }
                }
              `}</style>

              <span className="h-9 w-9 rounded-full border-[3px] border-red-400 border-t-transparent animate-spin" />

              {/* Defurnishing typewriter */}
              <div className="flex items-center h-6">
                <span className="text-sm font-semibold text-white font-mono">
                  {DEFURNISHING_WORDS[defurnWordIdx].slice(0, defurnLetterCount)}
                </span>
                <span className="text-sm font-semibold text-white animate-pulse ml-0.5">|</span>
              </div>

              {/* Icon ticker — same slide animation, but icon has a red strikethrough */}
              <div className="relative h-20 w-44 flex items-center justify-center overflow-x-hidden">
                <span
                  key={defurnTickerIdx}
                  className="absolute flex flex-col items-center gap-1"
                  style={{
                    animationName: 'defurn-ticker',
                    animationDuration: '800ms',
                    animationTimingFunction: 'ease-in-out',
                    animationFillMode: 'both',
                  }}
                >
                  {/* Icon with red diagonal slash overlay */}
                  <span className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white/20">
                    {DefurnIcon && <DefurnIcon className="h-5 w-5 text-white/60" />}
                    {/* Prohibition slash */}
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 36 36"
                      fill="none"
                    >
                      <line x1="9" y1="27" x2="27" y2="9" stroke="rgba(248,113,113,0.95)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-medium text-white/60 whitespace-nowrap line-through decoration-red-400/80">
                    {defurnItem.label}
                  </span>
                </span>
              </div>
            </div>
          );
        })()}

        {/* ── Full-screen loading overlay — photo enhancement ── */}
        {isEnhancing && !furniturePickerBusy && !isDefurnishing && !isPending && !jobHasImage && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <span className="h-9 w-9 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
            {/* Typewriter — cycles real-estate enhancement words, typing then erasing each,
                same pattern as the staging/defurnishing overlays. */}
            <div className="flex items-center h-6">
              <span className="text-sm font-semibold text-white font-mono">
                {ENHANCEMENT_WORDS[enhWordIdx].slice(0, enhLetterCount)}
              </span>
              <span className="text-sm font-semibold text-white animate-pulse ml-0.5">|</span>
            </div>
          </div>
        )}

        {/* ── Small pill for any other queued/processing job (e.g. custom edit, regen) ── */}
        {jobRunning && !furniturePickerBusy && !isEnhancing && !isPending && !jobHasImage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-analysis/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm animate-pulse">
              <span className="h-2 w-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {activeJob?.status === 'queued'
                ? 'AI queued…'
                : activeJob?.tool === 'custom_edit'
                  ? 'Editing…'
                  : 'AI generating…'}
            </span>
          </div>
        )}

        {/* ── Image regenerate loading overlay — shown in the gap between rejecting the
              old image job and the new one arriving (covers the moment jobRunning can't) ── */}
        {imageRegenLoading && !jobRunning && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <span className="h-9 w-9 rounded-full border-[3px] border-white border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-white">AI generating…</p>
            <p className="text-[11px] text-white/55">Creating a new furniture suggestion for you</p>
          </div>
        )}

        {/* ── Action failure banner — Enhance/Furnishing/Defurnish all clear
              their busy overlay into this on failure instead of hanging silently. ── */}
        {jobErrorMessage && !anyOverlayActive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex max-w-[88%] items-start gap-2 rounded-xl bg-black/85 border border-skip/50 px-3.5 py-2.5 shadow-lg backdrop-blur-sm">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-skip" />
            <p className="text-xs font-medium text-white leading-snug">{jobErrorMessage}</p>
            <button
              onClick={() => setJobErrorMessage(null)}
              className="shrink-0 text-white/50 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── Needs attention badge ── */}
        {needsAttention && !isPending && !jobRunning && !anyOverlayActive && (
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gate px-3 py-1.5 text-xs font-bold text-white shadow-lg animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {isOtherRoom ? 'Unknown room — please label' : 'Needs attention'}
            </span>
          </div>
        )}

        {/* ── Room type tag + quality flag (stacked) ── */}
        {hasRoomType && !needsAttention && !jobRunning && !jobHasImage && !anyOverlayActive && (
          <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1.5 max-w-[78%]">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
              {photo.analysis.roomType}
            </span>
            {hasQualityFlag && !isPending && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/85 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm shadow-sm">
                {photo.analysis?.suitable === false
                  ? `Quality flag: ${photo.analysis?.issues?.[0] || 'needs review'} — try Enhance below`
                  : 'Empty room — try Furniture below'}
              </span>
            )}
          </div>
        )}

        {/* ── Photo counter + top-right action buttons ── */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Enhance + Furniture/Defurnish buttons */}
          {hasRoomType && !needsAttention && !jobRunning && !jobHasImage && !isPending && !anyOverlayActive && (
            <>
              <button
                onClick={() => void handleEnhance()}
                disabled={enhanceBusy || applyBusy}
                className="flex items-center gap-1 rounded-full bg-black/60 border border-white/25 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20 backdrop-blur-sm transition-all shadow-md disabled:opacity-50"
              >
                {enhanceBusy
                  ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <><Sparkles className="h-3 w-3" /> Enhance</>}
              </button>

              {/* Furnishing / Defurnishing segmented pill — active segment is highlighted */}
              <div className="relative">
                <div className="flex items-center rounded-full bg-black/60 border border-white/25 backdrop-blur-sm shadow-md overflow-hidden">
                  <button
                    onClick={() => handleFurnitureClick('furnish')}
                    disabled={applyBusy || enhanceBusy}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50
                      ${furnitureMode === 'furnish' ? 'bg-white/90 text-black' : 'text-white hover:bg-white/15'}`}
                  >
                    {applyBusy && furnitureMode === 'furnish'
                      ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      : <Sofa className="h-3 w-3" />}
                    Furnishing
                  </button>
                  <span className="w-px self-stretch bg-white/20" />
                  <button
                    onClick={() => handleFurnitureClick('defurnish')}
                    disabled={applyBusy || enhanceBusy}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50
                      ${furnitureMode === 'defurnish' ? 'bg-white/90 text-black' : 'text-white hover:bg-white/15'}`}
                  >
                    {applyBusy && furnitureMode === 'defurnish'
                      ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      : <Sofa className="h-3 w-3" />}
                    Defurnishing
                  </button>
                </div>
                {/* Exterior rooms can't be furnished */}
                {showExteriorMsg && (
                  <div className="absolute top-9 right-0 z-50 w-52 rounded-xl bg-black/90 border border-white/20 px-3 py-2 text-[11px] text-white shadow-xl backdrop-blur-sm">
                    Exterior rooms can&apos;t be furnished — furniture is only available for indoor rooms.
                  </div>
                )}
                {/* Room has furniture — must defurnish before virtual staging */}
                {showDefurnishFirstMsg && (
                  <div className="absolute top-9 right-0 z-50 w-60 rounded-xl bg-black/90 border border-amber-400/40 px-3 py-2 text-[11px] text-white shadow-xl backdrop-blur-sm">
                    <span className="font-bold text-amber-300">Defurnish first — </span>
                    this room already has furniture. Switch to OFF, defurnish it, accept the result, then furnish.
                  </div>
                )}
              </div>
            </>
          )}
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {clampedIndex + 1} / {photos.length}
          </span>
        </div>

        {/* ════════ BOTTOM OVERLAYS ════════ */}

        {/* 1 · Room labelling */}
        {needsAttention && !isPending && !jobRunning && (
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-5 pt-12 pb-5">
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-2">
              {isOtherRoom
                ? "AI couldn't identify this room type — what is it?"
                : 'What room is this?'}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {ROOM_TYPES.map(room => (
                <button
                  key={room}
                  disabled={labelingBusy}
                  onClick={() => void handleLabelRoom(room)}
                  className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 backdrop-blur-sm transition-all disabled:opacity-40"
                >
                  {room}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customRoom}
                onChange={e => setCustomRoom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customRoom.trim()) void handleLabelRoom(customRoom.trim()); }}
                placeholder="Or type a room name…"
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 backdrop-blur-sm focus:outline-none focus:border-white/50"
              />
              {customRoom.trim() && (
                <button
                  onClick={() => void handleLabelRoom(customRoom.trim())}
                  disabled={labelingBusy}
                  className="rounded-xl bg-analysis px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {labelingBusy ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" /> : 'Set'}
                </button>
              )}
            </div>
          </div>
        )}


        {/* 4 · Switch full-view toggle removed — accept/reject bar is sufficient */}

        {/* 4b · Image job accept/reject/edit — bottom action bar (single row, no duplicates) */}
        {jobHasImage && !showImageRegenPanel && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-5 pt-10 pb-5 flex justify-center">
            {activeJob?.tool === 'defurnishing' ? (
              /* Defurnishing result: only Accept + Delete (no Edit) */
              <div className="flex gap-3">
                <button
                  disabled={jobBusy}
                  onClick={() => void handleDirectReject()}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/60 px-4 py-2.5 text-xs font-bold text-white hover:bg-black/80 backdrop-blur-sm transition-all disabled:opacity-40 shadow-lg"
                >
                  <X className="h-3.5 w-3.5" /> Delete
                </button>
                <button
                  disabled={jobBusy}
                  onClick={() => void handleAcceptJob()}
                  className="flex items-center gap-1.5 rounded-full bg-approved px-5 py-2.5 text-xs font-bold text-white hover:bg-approved/85 transition-all disabled:opacity-50 shadow-lg"
                >
                  {jobBusy
                    ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <><Check className="h-3.5 w-3.5" /> Accept</>}
                </button>
              </div>
            ) : (
              /* All other jobs: Accept + Edit + Reject */
              <div className="flex gap-3">
                <button
                  disabled={jobBusy}
                  onClick={() => void handleDirectReject()}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/60 px-4 py-2.5 text-xs font-bold text-white hover:bg-black/80 backdrop-blur-sm transition-all disabled:opacity-40 shadow-lg"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  disabled={jobBusy}
                  onClick={() => { setImageRegenPrompt(''); setShowImageRegenPanel(true); }}
                  className="flex items-center gap-1.5 rounded-full border border-white/30 bg-black/60 px-4 py-2.5 text-xs font-bold text-white hover:bg-black/80 backdrop-blur-sm transition-all disabled:opacity-40 shadow-lg"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  disabled={jobBusy}
                  onClick={() => void handleAcceptJob()}
                  className="flex items-center gap-1.5 rounded-full bg-approved px-5 py-2.5 text-xs font-bold text-white hover:bg-approved/85 transition-all disabled:opacity-50 shadow-lg"
                >
                  {jobBusy
                    ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    : <><Check className="h-3.5 w-3.5" /> Accept</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4b · Image Edit/Regenerate prompt panel — slides up in place of the buttons above */}
        {jobHasImage && showImageRegenPanel && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/98 via-black/90 to-transparent px-5 pt-12 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-white">Edit This Suggestion</p>
              <button onClick={() => setShowImageRegenPanel(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-white mb-1">What would you like to change?</p>
            <p className="text-[10px] text-white/50 mb-2">
              Describe your instructions and we&apos;ll regenerate a new full furniture suggestion.
            </p>
            <textarea
              value={imageRegenPrompt}
              onChange={e => setImageRegenPrompt(e.target.value)}
              autoFocus
              placeholder="e.g. Use a warmer color palette, swap the sofa for an L-shape, add more lighting…"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/35 backdrop-blur-sm focus:outline-none focus:border-white/50 resize-none h-16"
            />
            <div className="flex items-center gap-3 mt-2.5">
              <button
                onClick={() => setShowImageRegenPanel(false)}
                className="text-xs text-white/55 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!imageRegenPrompt.trim() || jobBusy}
                onClick={() => void handleImageRegenRegenerate()}
                className="flex items-center gap-1.5 rounded-xl bg-analysis px-4 py-2 text-xs font-semibold text-white hover:bg-analysis/85 disabled:opacity-40 transition-all"
              >
                {jobBusy
                  ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <><RefreshCw className="h-3 w-3" /> Regenerate</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Prev / Next navigation ── */}
        {clampedIndex > 0 && (
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {clampedIndex < photos.length - 1 && (
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Click to open full carousel */}
        {!needsAttention && !isPending && !jobHasImage && !jobRunning && !applyBusy && (
          <button
            onClick={() => onSelectPhoto(photo._id)}
            className="absolute inset-0 cursor-zoom-in z-0"
            aria-label="View full screen"
          />
        )}

        {/* ── Furniture picker — left-side vertical strip ── */}
        <div
          className="absolute left-0 inset-y-0 z-30 w-44 flex flex-col bg-black/90 backdrop-blur-md pointer-events-none"
          style={{
            transform: showFurniturePicker ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: showFurniturePicker ? 'auto' : 'none',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-white/10">
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
              {pickerRoom}
            </p>
            <button
              onClick={() => setShowFurniturePicker(false)}
              className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-white/15 text-white/40 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Scrollable items list */}
          <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'none' }}>
            {furnitureItems.map(item => {
              const sel = selectedFurnitureIds.has(item.id);
              const IconComp = item.iconType === 'lucide' ? FURNITURE_ICONS[item.icon] : null;
              return (
                <button
                  key={item.id}
                  onClick={() => toggleFurnitureItem(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-all border-l-2
                    ${sel ? 'border-l-analysis bg-analysis/20' : 'border-l-transparent hover:bg-white/10'}`}
                >
                  <span className="shrink-0 w-4 flex items-center justify-center">
                    {item.iconType === 'emoji'
                      ? <span className="text-sm leading-none">{item.icon}</span>
                      : IconComp
                        ? <IconComp className={`h-3.5 w-3.5 ${sel ? 'text-analysis' : 'text-white/45'}`} />
                        : null}
                  </span>
                  <span className={`flex-1 text-[11px] leading-tight truncate
                    ${sel ? 'text-white font-semibold' : 'text-white/60 font-medium'}`}>
                    {item.label}
                  </span>
                  {sel && <Check className="h-3 w-3 shrink-0 text-analysis" />}
                </button>
              );
            })}
          </div>

          {/* Style chips */}
          <div className="shrink-0 border-t border-white/10 px-3 py-2">
            <p className="text-[8px] font-bold text-white/35 uppercase tracking-widest mb-1.5">Style</p>
            <div className="flex flex-wrap gap-1">
              {STAGING_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setPickerStyle(s.id)}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold transition-all
                    ${pickerStyle === s.id
                      ? 'bg-white text-black'
                      : 'bg-white/15 text-white/60 hover:bg-white/25'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="shrink-0 px-2.5 pb-3 pt-1">
            <button
              onClick={() => void handleFurniturePick()}
              disabled={applyBusy || selectedFurnitureIds.size === 0}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-analysis px-3 py-2 text-xs font-semibold text-white hover:bg-analysis/85 disabled:opacity-40 transition-all"
            >
              {applyBusy
                ? <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><Wand2 className="h-3.5 w-3.5" /> Generate ({selectedFurnitureIds.size})</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Thumbnail strip. The photos live in their own shrink-to-fit scroll box;
            the upload button is a separate flex sibling next to it, never inside the
            same scrolling row. With few photos the scroll box is only as wide as its
            content, so the button sits immediately adjacent — but once there are
            enough photos to need the full available width, the scroll box (shrink,
            not grow) yields space to the button and clips/scrolls internally instead.
            This keeps the button in one fixed, non-overlapping slot at all times —
            unlike `position: sticky`, photos never visibly slide under/behind it. ── */}
      <div className="flex items-stretch gap-2">
        <div
          ref={thumbStripRef}
          onScroll={handleThumbStripScroll}
          className="flex min-w-0 shrink gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.2) transparent' }}
        >
          {photos.map((p, i) => {
            const thumbNeedsAttention =
              p.status === 'analyzed' &&
              (!p.analysis?.roomType || p.analysis?.emptyRoom || p.analysis?.suitable === false);
            const thumbJob      = toolJobs?.find(j => j.sourceUrl === p.url);
            const thumbJobReady = thumbJob?.status === 'ready_for_review';
            return (
              <button
                key={p._id}
                onClick={() => setSelectedPhotoId(p._id)}
                style={{
                  width: 112, height: 80,
                  borderColor: i === clampedIndex ? 'var(--color-analysis, #0E7C7B)' : 'transparent',
                  opacity: i === clampedIndex ? 1 : 0.55,
                }}
                className="relative shrink-0 rounded-lg overflow-hidden border-2 transition-all hover:opacity-80"
              >
                <Image src={resolvePhotoUrl(p.url, p.imageUpdatedAt || p.updatedAt)} alt="" fill unoptimized className="object-cover" />
                {p.status === 'pending' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  </div>
                )}
                {thumbJobReady && (
                  <div className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-approved" />
                )}
                {thumbNeedsAttention && !thumbJobReady && (
                  <div className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-gate animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
        {onUploadMore && (
          <button
            onClick={onUploadMore}
            disabled={uploadingCount != null}
            style={{ width: 112, height: 80 }}
            className="shrink-0 rounded-lg overflow-hidden border-2 border-dashed border-ink/25 bg-paper hover:border-analysis/60 hover:bg-analysis-soft/60 disabled:hover:border-ink/25 disabled:hover:bg-paper transition-all flex items-center justify-center text-ink/40 hover:text-analysis"
            title={uploadingCount != null ? `Uploading ${uploadingCount}…` : 'Add more photos'}
          >
            {uploadingCount != null ? (
              <span className="flex flex-col items-center gap-0.5">
                <span className="h-4 w-4 rounded-full border-2 border-analysis border-t-transparent animate-spin" />
                <span className="text-xs font-bold text-analysis leading-none">{uploadingCount}</span>
              </span>
            ) : (
              <span className="text-2xl font-light leading-none">+</span>
            )}
          </button>
        )}
      </div>

    </div>
  );
}

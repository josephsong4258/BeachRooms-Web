'use client';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface RatingPillsProps {
  up: number;
  down: number;
  /** true = thumbs up, false = thumbs down, null = no vote */
  vote: boolean | null;
  /** Called with the pressed pill's value. Re-clicking the active vote should
      clear it — handle that here, e.g. onVote={(pos) => set(v => v === pos ? null : pos)} */
  onVote: (positive: boolean) => void;
}

const pillBase =
  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ' +
  'transition-colors active:scale-[0.97] motion-reduce:active:scale-100';

// Controlled "Was the room free?" crowdsourcing bar. The active vote highlights
// its pill in the matching status color; the rest stays muted.
export default function RatingPills({ up, down, vote, onVote }: RatingPillsProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3">
      <p className="text-sm font-medium">Was the room free?</p>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() => onVote(true)}
          aria-label="Thumbs up"
          aria-pressed={vote === true}
          className={`${pillBase} ${
            vote === true
              ? 'border-[#7ee8a0] bg-[#e6f9ec] text-[#1a9e3f] hover:bg-[#d9f3e2]'
              : 'border-border text-muted-foreground hover:border-[#7ee8a0] hover:bg-[#e6f9ec]/60 hover:text-[#1a9e3f]'
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          {up}
        </button>
        <button
          onClick={() => onVote(false)}
          aria-label="Thumbs down"
          aria-pressed={vote === false}
          className={`${pillBase} ${
            vote === false
              ? 'border-[#f5a3ab] bg-[#fde8ea] text-[#c9303a] hover:bg-[#fbdadf]'
              : 'border-border text-muted-foreground hover:border-[#f5a3ab] hover:bg-[#fde8ea]/60 hover:text-[#c9303a]'
          }`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          {down}
        </button>
      </div>
    </div>
  );
}

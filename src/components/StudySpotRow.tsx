'use client';
import { ChevronRight, Volume2, VolumeX } from 'lucide-react';
import type { StudyNoise } from '@/data/study-spots';

// A single tappable study-spot row (a library floor, or a Horn Center study
// area). The noise icon — quiet vs. collaborative — is the only marker, so
// quiet and group spots can share one ordered list.
export default function StudySpotRow({
  name,
  note,
  type,
  onClick,
}: {
  name: string;
  note?: string;
  type: StudyNoise;
  onClick: () => void;
}) {
  const quiet = type === 'quiet';
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/40"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          quiet ? 'bg-[#eef2ff] text-[#4f46e5]' : 'bg-[#fef6e6] text-[#b5850b]'
        }`}
      >
        {quiet ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{name}</span>
        {note && (
          <span className="block truncate text-[13px] text-muted-foreground">{note}</span>
        )}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

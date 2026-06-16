'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Users, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Rating from '@/components/Rating';
import Comments from '@/components/Comments';
import SignInDialog from '@/components/SignInDialog';
import { libraryFloorImage, type LibraryFloor } from '@/data/library';

interface LibraryFloorDetailProps {
  floor: LibraryFloor;
  onBack: () => void;
}

export default function LibraryFloorDetail({ floor, onBack }: LibraryFloorDetailProps) {
  const [showSignIn, setShowSignIn] = useState(false);
  const quiet = floor.type === 'quiet';
  const placeId = `library:${floor.id}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{floor.name}</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                quiet
                  ? 'border-[#a5b4fc] bg-[#eef2ff] text-[#4f46e5]'
                  : 'border-[#f5d78a] bg-[#fef6e6] text-[#b5850b]'
              }`}
            >
              {quiet ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {quiet ? 'Quiet study' : 'Group study'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">University Library</p>
        </div>
      </div>

      <SignInDialog
        open={showSignIn}
        onOpenChange={setShowSignIn}
        message="Sign in to rate study spots and leave tips."
      />

      <ScrollArea className="flex-1">
        <div className="relative h-[210px] w-full shrink-0 overflow-hidden bg-muted">
          <Image
            src={libraryFloorImage(floor.id)}
            alt={`${floor.name} of the University Library`}
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            className="object-cover"
          />
        </div>

        <div className="space-y-5 p-4">
          {/* Vibe note */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
            {quiet ? (
              <VolumeX className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Users className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>
              {quiet
                ? 'Designated quiet study area — keep noise to a minimum.'
                : 'Collaborative space — expect it to be noisy.'}
              {floor.note ? ` ${floor.note}.` : ''}
            </span>
          </div>

          <Rating
            table="place_ratings"
            column="place_id"
            subjectId={placeId}
            question="Could you find a seat?"
            onRequireSignIn={() => setShowSignIn(true)}
          />

          <Comments
            table="place_comments"
            column="place_id"
            subjectId={placeId}
            placeholder="Share tips: outlets, noise, seating, busy times, etc"
          />
        </div>
      </ScrollArea>
    </div>
  );
}

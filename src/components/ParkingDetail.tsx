'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Rating from '@/components/Rating';
import Comments from '@/components/Comments';
import SignInDialog from '@/components/SignInDialog';
import { isParkingOpenNow, type ParkingLot } from '@/data/parking';
import { parkingImage } from '@/lib/parking-images';

interface ParkingDetailProps {
  lot: ParkingLot;
  onBack: () => void;
}

function StatusPill({ open, isStudent }: { open: boolean; isStudent: boolean }) {
  const cls = open
    ? 'border-[#7ee8a0] bg-[#e6f9ec] text-[#1a9e3f]'
    : 'border-[#f5a3ab] bg-[#fde8ea] text-[#c9303a]';
  const dot = open ? 'bg-[#1a9e3f]' : 'bg-[#c9303a]';
  const text = open ? (isStudent ? 'Open to students' : 'Open now') : 'Employees only';
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold shadow-md ${cls}`}
    >
      <span className={`h-[7px] w-[7px] rounded-full ${dot}`} />
      {text}
    </span>
  );
}

// Human-readable note about who can park here and when, mirroring the map popup.
function AccessNote({ lot, open }: { lot: ParkingLot; open: boolean }) {
  if (lot.type === 'student') {
    return <p className="text-[13px] text-muted-foreground">Open to all students.</p>;
  }
  if (open) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Employee lot — open to students now (after 5:30 PM weekdays and all weekend).
      </p>
    );
  }
  // Restricted right now: it's a weekday before 5:30 PM; count down to it.
  const now = new Date();
  const minutesUntilOpen = 17 * 60 + 30 - (now.getHours() * 60 + now.getMinutes());
  const h = Math.floor(minutesUntilOpen / 60);
  const m = minutesUntilOpen % 60;
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <p className="text-[13px] text-muted-foreground">
      Employee parking only. Opens to students in{' '}
      <span className="font-semibold text-foreground">{countdown}</span> (5:30 PM).
    </p>
  );
}

export default function ParkingDetail({ lot, onBack }: ParkingDetailProps) {
  const [showSignIn, setShowSignIn] = useState(false);
  const open = isParkingOpenNow(lot);
  const isStudent = lot.type === 'student';
  const imageSrc = parkingImage(lot.id);
  const placeId = `parking:${lot.id}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{lot.name}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Car className="h-3.5 w-3.5" />
            {isStudent ? 'Student parking' : 'Employee parking'}
          </p>
        </div>
      </div>

      <SignInDialog
        open={showSignIn}
        onOpenChange={setShowSignIn}
        message="Sign in to rate parking and leave tips."
      />

      <ScrollArea className="flex-1">
        {/* Photo hero */}
        <div className="relative h-[210px] w-full shrink-0 overflow-hidden bg-muted">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={`${lot.name}`}
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
              className="object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, hsl(var(--muted)) 0 14px, hsl(var(--muted-foreground) / 0.06) 14px 28px)',
              }}
            >
              <span className="font-mono text-xs tracking-wide text-muted-foreground/70">
                {lot.name} photo
              </span>
            </div>
          )}
          <div className="absolute bottom-2.5 right-2.5">
            <StatusPill open={open} isStudent={isStudent} />
          </div>
        </div>

        <div className="space-y-5 p-4">
          {/* Access note */}
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <AccessNote lot={lot} open={open} />
          </div>

          {/* Rating */}
          <Rating
            table="place_ratings"
            column="place_id"
            subjectId={placeId}
            question="Could you find parking here?"
            onRequireSignIn={() => setShowSignIn(true)}
          />

          {/* Comments */}
          <Comments
            table="place_comments"
            column="place_id"
            subjectId={placeId}
            placeholder="Share tips: how full does this lot get, best times, permit/gate notes, etc"
          />
        </div>
      </ScrollArea>
    </div>
  );
}

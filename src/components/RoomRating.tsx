'use client';
import Rating from '@/components/Rating';

// Identifies the recurring free block the room is in (same weekday + window each
// week within a term). Votes are confined to this block so a "was it free?"
// signal for the 1–2:30 PM gap never counts toward another slot.
export type RoomRatingBlock = {
  semester: string;
  day_of_week: number;
  block_start: string;
  block_end: string;
};

interface RoomRatingProps {
  roomId: string;
  block: RoomRatingBlock;
  onRequireSignIn: () => void;
}

export default function RoomRating({ roomId, block, onRequireSignIn }: RoomRatingProps) {
  return (
    <Rating
      table="room_ratings"
      column="classroom_id"
      subjectId={roomId}
      scope={block}
      conflictTarget="classroom_id,user_id,semester,day_of_week,block_start,block_end"
      question="Was the room free?"
      onRequireSignIn={onRequireSignIn}
    />
  );
}

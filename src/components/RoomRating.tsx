'use client';
import Rating from '@/components/Rating';

interface RoomRatingProps {
  roomId: string;
  onRequireSignIn: () => void;
}

export default function RoomRating({ roomId, onRequireSignIn }: RoomRatingProps) {
  return (
    <Rating
      table="room_ratings"
      column="classroom_id"
      subjectId={roomId}
      question="Was the room free?"
      onRequireSignIn={onRequireSignIn}
    />
  );
}

'use client';
import Comments from '@/components/Comments';

interface RoomCommentsProps {
  roomId: string;
}

export default function RoomComments({ roomId }: RoomCommentsProps) {
  return (
    <Comments
      table="comments"
      column="classroom_id"
      subjectId={roomId}
      placeholder="Leave a tip or critique: Was the room open? Noise, outlets, seats, desk sizes, etc"
    />
  );
}

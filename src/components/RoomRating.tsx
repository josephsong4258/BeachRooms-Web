'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RatingPills from '@/components/RatingPills';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-auth';

interface RatingRow {
  user_id: string;
  is_positive: boolean;
}

interface RoomRatingProps {
  roomId: string;
  onRequireSignIn: () => void;
}

export default function RoomRating({ roomId, onRequireSignIn }: RoomRatingProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ['ratings', roomId];

  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<RatingRow[]> => {
      const { data, error } = await supabase
        .from('room_ratings')
        .select('user_id, is_positive')
        .eq('classroom_id', roomId);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const rows = data ?? [];
  const upCount = rows.filter((r) => r.is_positive).length;
  const downCount = rows.length - upCount;
  const myVote = user ? (rows.find((r) => r.user_id === user.id)?.is_positive ?? null) : null;

  const vote = useMutation({
    // Same value again = remove the vote; otherwise insert or flip it
    mutationFn: async (isPositive: boolean) => {
      if (myVote === isPositive) {
        const { error } = await supabase
          .from('room_ratings')
          .delete()
          .eq('classroom_id', roomId)
          .eq('user_id', user!.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('room_ratings')
          .upsert(
            { classroom_id: roomId, user_id: user!.id, is_positive: isPositive },
            { onConflict: 'classroom_id,user_id' }
          );
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async (isPositive) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<RatingRow[]>(queryKey);
      queryClient.setQueryData<RatingRow[]>(queryKey, (rows = []) => {
        const others = rows.filter((r) => r.user_id !== user!.id);
        return myVote === isPositive
          ? others
          : [...others, { user_id: user!.id, is_positive: isPositive }];
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  // The pressed pill's value comes straight through; the mutation interprets
  // "same value again" as clearing the vote.
  function handleVote(isPositive: boolean) {
    if (!user) {
      onRequireSignIn();
      return;
    }
    vote.mutate(isPositive);
  }

  return (
    <RatingPills up={upCount} down={downCount} vote={myVote} onVote={handleVote} />
  );
}

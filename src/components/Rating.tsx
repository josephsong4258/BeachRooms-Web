'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RatingPills from '@/components/RatingPills';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-auth';

interface RatingRow {
  user_id: string;
  is_positive: boolean;
}

interface RatingProps {
  // Which thumbs table + key column to read/write (e.g. room_ratings/classroom_id
  // or place_ratings/place_id).
  table: 'room_ratings' | 'place_ratings';
  column: 'classroom_id' | 'place_id';
  subjectId: string;
  question: string;
  // Optional override for the question's text classes (e.g. a smaller size so a
  // long prompt fits on one line).
  questionClassName?: string;
  // Extra columns that further scope the vote (e.g. a room's recurring free
  // block: day_of_week/block_start/block_end/semester). Every entry is applied
  // to the read filter, the written row, and the delete, so counts and the
  // user's own vote reflect only this scope. Omit for an all-time tally.
  scope?: Record<string, string | number>;
  // Unique-constraint target the upsert conflicts on. Defaults to
  // `${column},user_id`; pass the full composite when using `scope`.
  conflictTarget?: string;
  onRequireSignIn: () => void;
}

// Crowdsourced thumbs bar, generalized over the rating table so rooms, parking
// lots, and library floors share one implementation.
export default function Rating({ table, column, subjectId, question, questionClassName, scope, conflictTarget, onRequireSignIn }: RatingProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  // Sort scope entries so the key is stable regardless of prop order.
  const scopeEntries = Object.entries(scope ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const queryKey = [table, subjectId, ...scopeEntries.flat()];
  const onConflict = conflictTarget ?? `${column},user_id`;

  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<RatingRow[]> => {
      let query = supabase
        .from(table)
        .select('user_id, is_positive')
        .eq(column, subjectId);
      for (const [k, v] of scopeEntries) query = query.eq(k, v);
      const { data, error } = await query;
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
        let del = supabase
          .from(table)
          .delete()
          .eq(column, subjectId)
          .eq('user_id', user!.id);
        for (const [k, v] of scopeEntries) del = del.eq(k, v);
        const { error } = await del;
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from(table)
          .upsert(
            { [column]: subjectId, user_id: user!.id, is_positive: isPositive, ...scope },
            { onConflict }
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

  function handleVote(isPositive: boolean) {
    if (!user) {
      onRequireSignIn();
      return;
    }
    vote.mutate(isPositive);
  }

  return (
    <RatingPills
      up={upCount}
      down={downCount}
      vote={myVote}
      onVote={handleVote}
      question={question}
      questionClassName={questionClassName}
    />
  );
}

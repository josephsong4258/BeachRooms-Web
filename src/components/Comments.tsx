'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignInDialog from '@/components/SignInDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-auth';

const MAX_LENGTH = 500;

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: { display_name: string } | null;
  // One row per upvote; length is the count, presence of the current user is
  // "did I upvote".
  votes: { user_id: string }[];
}

// The two comment tables each have their own votes table + FK column.
const VOTES = {
  comments: { table: 'comment_votes', column: 'comment_id' },
  place_comments: { table: 'place_comment_votes', column: 'place_comment_id' },
} as const;

interface CommentsProps {
  // Which comments table + key column (comments/classroom_id or
  // place_comments/place_id).
  table: 'comments' | 'place_comments';
  column: 'classroom_id' | 'place_id';
  subjectId: string;
  placeholder?: string;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Initial-letter circle only — provider profile pictures are unmoderated
// user content, so they're deliberately not displayed.
function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// Crowdsourced comment thread, generalized over the comments table so rooms,
// parking lots, and library floors share one implementation.
export default function Comments({ table, column, subjectId, placeholder }: CommentsProps) {
  const { user, loading: authLoading } = useUser();
  const [draft, setDraft] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = [table, subjectId];
  const votes = VOTES[table];

  const { data: comments, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data, error } = await supabase
        .from(table)
        .select(
          `id, user_id, content, created_at, profile:profiles(display_name), votes:${votes.table}(user_id)`
        )
        .eq(column, subjectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      // Most-upvoted first, newest as the tiebreak (rows already arrive
      // created_at desc). Sorted once on fetch so live voting doesn't make
      // rows jump around mid-interaction — order settles on the next refetch.
      return (data as unknown as CommentRow[]).sort(
        (a, b) => b.votes.length - a.votes.length
      );
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const postComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from(table)
        .insert({ [column]: subjectId, user_id: user!.id, content });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDraft('');
      invalidate();
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const toggleVote = useMutation({
    mutationFn: async ({ commentId, voted }: { commentId: string; voted: boolean }) => {
      if (voted) {
        const { error } = await supabase
          .from(votes.table)
          .delete()
          .eq(votes.column, commentId)
          .eq('user_id', user!.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from(votes.table)
          .insert({ [votes.column]: commentId, user_id: user!.id });
        // 23505 = unique violation: already upvoted in another tab — fine
        if (error && error.code !== '23505') throw new Error(error.message);
      }
    },
    // Optimistic: flip just this comment's vote without reordering the list
    onMutate: async ({ commentId, voted }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<CommentRow[]>(queryKey);
      queryClient.setQueryData<CommentRow[]>(queryKey, (rows = []) =>
        rows.map((c) =>
          c.id !== commentId
            ? c
            : {
                ...c,
                votes: voted
                  ? c.votes.filter((v) => v.user_id !== user!.id)
                  : [...c.votes, { user_id: user!.id }],
              }
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: invalidate,
  });

  function handleVote(c: CommentRow) {
    if (!user) {
      setShowSignIn(true);
      return;
    }
    toggleVote.mutate({ commentId: c.id, voted: c.votes.some((v) => v.user_id === user.id) });
  }

  const trimmed = draft.trim();

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Comments{comments ? ` (${comments.length})` : ''}
      </p>

      {/* Composer — always visible; focusing it while signed out prompts sign-in */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed && !postComment.isPending) postComment.mutate(trimmed);
        }}
        className="mb-3 space-y-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
          readOnly={!user}
          onFocus={(e) => {
            if (!user && !authLoading) {
              e.currentTarget.blur();
              setShowSignIn(true);
            }
          }}
          placeholder={placeholder ?? 'Leave a tip or critique for other students…'}
          rows={2}
          className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {draft.length}/{MAX_LENGTH}
          </span>
          <Button type="submit" size="sm" disabled={!trimmed || postComment.isPending}>
            {postComment.isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
        {postComment.error && (
          <p className="text-xs text-destructive">{String(postComment.error.message)}</p>
        )}
      </form>

      <SignInDialog
        open={showSignIn}
        onOpenChange={setShowSignIn}
        message="Sign in to join the conversation."
      />

      {/* Comment list */}
      {error ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load comments.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((c) => {
            const name = c.profile?.display_name ?? 'Student';
            const upvotes = c.votes.length;
            const upvoted = !!user && c.votes.some((v) => v.user_id === user.id);
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(c.created_at)}
                    </span>
                    {user?.id === c.user_id && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        disabled={deleteComment.isPending}
                        aria-label="Delete comment"
                        className="ml-auto shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">
                    {c.content}
                  </p>
                  <button
                    onClick={() => handleVote(c)}
                    aria-pressed={upvoted}
                    aria-label={upvoted ? 'Remove upvote' : 'Upvote'}
                    className={cn(
                      'mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                      upvoted
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                    Helpful{upvotes > 0 ? ` · ${upvotes}` : ''}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EditHandleDialog from '@/components/EditHandleDialog';
import SignInDialog from '@/components/SignInDialog';
import { supabase } from '@/lib/supabase';
import { useUser, signOut } from '@/lib/use-auth';
import { useProfile } from '@/lib/use-profile';
import type { RoomComment } from '@/types';

const MAX_LENGTH = 500;

interface RoomCommentsProps {
  roomId: string;
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

async function fetchComments(roomId: string): Promise<RoomComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, classroom_id, user_id, content, created_at, profile:profiles(display_name)')
    .eq('classroom_id', roomId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as RoomComment[];
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

export default function RoomComments({ roomId }: RoomCommentsProps) {
  const { user, loading: authLoading } = useUser();
  const { handle } = useProfile();
  const [draft, setDraft] = useState('');
  const [showEditHandle, setShowEditHandle] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments, isLoading, error } = useQuery({
    queryKey: ['comments', roomId],
    queryFn: () => fetchComments(roomId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['comments', roomId] });

  const postComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('comments')
        .insert({ classroom_id: roomId, user_id: user!.id, content });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setDraft('');
      invalidate();
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });

  const trimmed = draft.trim();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Comments{comments ? ` (${comments.length})` : ''}
        </p>
        {user && (
          <button
            onClick={() => signOut()}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        )}
      </div>

      {/* Composer — always visible; focusing it while signed out prompts sign-in */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed && !postComment.isPending) postComment.mutate(trimmed);
        }}
        className="mb-3 space-y-2"
      >
        {user && (
          <p className="text-xs text-muted-foreground">
            Commenting as{' '}
            <span className="font-medium text-foreground/80">{handle ?? '…'}</span>{' '}
            <button
              type="button"
              onClick={() => setShowEditHandle(true)}
              className="underline-offset-2 hover:underline"
            >
              · Change
            </button>
          </p>
        )}
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
          placeholder="Leave a tip or critique: was it actually free? Noise, outlets, seating, AC..."
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

      <EditHandleDialog open={showEditHandle} onOpenChange={setShowEditHandle} />
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

'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-auth';

// Mirrors the profiles_display_name_check constraint in the database
export const HANDLE_PATTERN = /^[A-Za-z0-9 #_.-]{3,24}$/;
export const HANDLE_RULES = '3-24 characters: letters, numbers, spaces, or # _ . -';

export function useProfile() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ['profile', user?.id];

  const { data } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<{ display_name: string }> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user!.id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const updateHandle = useMutation({
    mutationFn: async (displayName: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user!.id);
      if (error) {
        // 23514 = check constraint violation — translate the raw Postgres
        // message into the rules the user can act on
        throw new Error(error.code === '23514' ? `Handle must be ${HANDLE_RULES}` : error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      // Names are embedded in every room's comment list
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });

  return { handle: data?.display_name ?? null, updateHandle };
}

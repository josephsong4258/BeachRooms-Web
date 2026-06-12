'use client';
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-auth';

interface FavoriteRow {
  classroom_id: string | null;
  building_id: string | null;
}

type FavoriteColumn = 'classroom_id' | 'building_id';

export function useFavorites() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['favorites', user?.id], [user?.id]);

  const { data } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<FavoriteRow[]> => {
      const { data, error } = await supabase
        .from('favorites')
        .select('classroom_id, building_id')
        .eq('user_id', user!.id);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const favoriteRoomIds = useMemo(
    () => new Set((data ?? []).flatMap((r) => (r.classroom_id ? [r.classroom_id] : []))),
    [data]
  );
  const favoriteBuildingIds = useMemo(
    () => new Set((data ?? []).flatMap((r) => (r.building_id ? [r.building_id] : []))),
    [data]
  );

  const toggle = useMutation({
    mutationFn: async ({ column, id, active }: { column: FavoriteColumn; id: string; active: boolean }) => {
      if (active) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user!.id)
          .eq(column, id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user!.id, [column]: id });
        // 23505 = unique violation: already favorited in another tab — fine
        if (error && error.code !== '23505') throw new Error(error.message);
      }
    },
    // Optimistic: flip the star immediately, roll back on failure
    onMutate: async ({ column, id, active }) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<FavoriteRow[]>(queryKey);
      queryClient.setQueryData<FavoriteRow[]>(queryKey, (rows = []) =>
        active
          ? rows.filter((r) => r[column] !== id)
          : [...rows, { classroom_id: null, building_id: null, [column]: id }]
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const { mutate } = toggle;
  const toggleRoomFavorite = useCallback(
    (id: string) => mutate({ column: 'classroom_id', id, active: favoriteRoomIds.has(id) }),
    [mutate, favoriteRoomIds]
  );
  const toggleBuildingFavorite = useCallback(
    (id: string) => mutate({ column: 'building_id', id, active: favoriteBuildingIds.has(id) }),
    [mutate, favoriteBuildingIds]
  );

  return {
    signedIn: !!user,
    favoriteRoomIds,
    favoriteBuildingIds,
    toggleRoomFavorite,
    toggleBuildingFavorite,
  };
}

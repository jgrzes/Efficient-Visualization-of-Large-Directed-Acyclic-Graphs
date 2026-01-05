import { create } from "zustand";

type FavoritesState = {
  favorites: number[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  setFavoritesFromGraph: (indices: number[]) => void;
  clearFavorites: () => void;
  toggleFavorite: (index: number) => void;
  isFavorite: (index: number) => boolean;
};

export const useFavorites = create<FavoritesState>((set, get) => ({
  favorites: [],
  isLoading: false,
  isSaving: false,
  error: null,

  setFavoritesFromGraph: (indices) => {
    const unique = Array.from(
      new Set((indices ?? []).filter((i) => Number.isInteger(i) && i >= 0))
    );
    set({ favorites: unique, error: null });
  },

  clearFavorites: () => {
    set({ favorites: [], error: null });
  },

  toggleFavorite: (index) => {
    if (!Number.isInteger(index) || index < 0) return;

    set((state) => {
      const s = new Set(state.favorites);
      if (s.has(index)) s.delete(index);
      else s.add(index);

      return { favorites: Array.from(s), error: null };
    });
  },

  isFavorite: (index) => {
    return get().favorites.includes(index);
  },
}));

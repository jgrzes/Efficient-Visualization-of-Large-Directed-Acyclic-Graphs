import { create } from "zustand";
import { NodeInfoProps } from "../components/leftsidebar/NodeInfo";

type FavoritesState = {
  favorites: NodeInfoProps[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // actions
  loadFavorites: () => Promise<void>;
  addFavorite: (node: NodeInfoProps) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  toggleFavorite: (node: NodeInfoProps) => Promise<void>;
  isFavorite: (id: string) => boolean;
};

export const useFavorites = create<FavoritesState>((set, get) => ({
  favorites: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadFavorites: async () => {
    // symulacja ładowania
    set({ isLoading: true });
    await new Promise((r) => setTimeout(r, 300));
    set({ isLoading: false, favorites: [] });
  },

  addFavorite: async (node) => {
    const prev = get().favorites;
    if (prev.some((f) => f.id === node.id)) return;
    set({ favorites: [node, ...prev] });
    // symulacja zapisu
    await new Promise((r) => setTimeout(r, 100));
  },

  removeFavorite: async (id) => {
    const prev = get().favorites;
    set({ favorites: prev.filter((f) => f.id !== id) });
    // symulacja zapisu
    await new Promise((r) => setTimeout(r, 100));
  },

  toggleFavorite: async (node) => {
    const exists = get().favorites.some((f) => f.id === node.id);
    if (exists) return get().removeFavorite(node.id);
    return get().addFavorite(node);
  },

  isFavorite: (id) => get().favorites.some((f) => f.id === id),
}));

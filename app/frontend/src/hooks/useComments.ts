// app/frontend/src/hooks/useComments.ts
import { create } from "zustand";
import { nanoid } from "nanoid";
import { NodeInfoProps } from "../components/NodeInfo";

export type CommentItem = {
  id: string;
  nodeId: string;
  nodeName: string;
  namespace?: string;
  text: string;
  createdAt: number; // epoch ms
  updatedAt?: number;
};

type CommentsState = {
  // data
  comments: CommentItem[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // actions (async)
  loadComments: () => Promise<void>;
  addComment: (node: Pick<NodeInfoProps, "id" | "name" | "namespace">, text: string) => Promise<void>;
  editComment: (id: string, text: string) => Promise<void>;
  removeComment: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  // helpers (sync)
  getCommentsForNode: (nodeId: string) => CommentItem[];
  getAllSorted: () => CommentItem[];
};

export const useComments = create<CommentsState>((set, get) => ({
  comments: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadComments: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise((r) => setTimeout(r, 300));
      // tutaj wczytać z API
      set({ comments: [], isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: "Nie udało się załadować komentarzy" });
    }
  },

  addComment: async (node, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const item: CommentItem = {
      id: nanoid(),
      nodeId: node.id,
      nodeName: node.name,
      namespace: node.namespace,
      text: trimmed,
      createdAt: Date.now(),
    };

    const prev = get().comments;
    set({ comments: [item, ...prev], isSaving: true, error: null });
    try {
      // symulacja zapisu
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch (e) {
      set({ isSaving: false, error: "Nie udało się dodać komentarza" });
    }
  },

  editComment: async (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const next = get().comments.map((c) =>
      c.id === id ? { ...c, text: trimmed, updatedAt: Date.now() } : c
    );

    set({ comments: next, isSaving: true, error: null });
    try {
      // symulacja zapisu
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Nie udało się edytować komentarza" });
    }
  },

  removeComment: async (id) => {
    const next = get().comments.filter((c) => c.id !== id);
    set({ comments: next, isSaving: true, error: null });
    try {
      // symulacja usuniecia
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Nie udało się usunąć komentarza" });
    }
  },

  clearAll: async () => {
    set({ comments: [], isSaving: true, error: null });
    try {
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Nie udało się wyczyścić komentarzy" });
    }
  },

  getCommentsForNode: (nodeId) =>
    get()
      .comments.filter((c) => c.nodeId === nodeId)
      .sort((a, b) => b.createdAt - a.createdAt),

  getAllSorted: () => [...get().comments].sort((a, b) => b.createdAt - a.createdAt),
}));

// app/frontend/src/hooks/useComments.ts
import { create } from "zustand";
import { nanoid } from "nanoid";
import { NodeInfoProps } from "../components/leftsidebar/NodeInfo";

export type CommentItem = {
  id: string;
  nodeIndex: number;
  nodeName: string;
  namespace?: string;

  title: string;
  text: string;

  createdAt: number;
  updatedAt?: number;
};

export type NewCommentPayload = {
  name: string;
  text: string;
};

type CommentsState = {
  // data
  comments: CommentItem[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // actions (async)
  loadComments: () => Promise<void>;
  addComment: (
    node: Pick<NodeInfoProps, "index" | "name">,
    comment: NewCommentPayload
  ) => Promise<void>;
  editComment: (id: string, text: string) => Promise<void>;
  removeComment: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  setCommentsFromGraph: (items: CommentItem[]) => void;

  getCommentsForNode: (nodeIndex: number) => CommentItem[];
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
      set({ comments: [], isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: "Failed to load comments" });
    }
  },

  addComment: async (node, comment) => {
    const trimmedText = comment.text.trim();
    const trimmedTitle = comment.name.trim();
    if (!trimmedText || !trimmedTitle) return;

    const idx = node.index;
    if (typeof idx !== "number" || idx < 0) {
      return;
    }

    const item: CommentItem = {
      id: nanoid(),
      nodeIndex: idx,
      nodeName: node.name,
      namespace: node.namespace,
      title: trimmedTitle,
      text: trimmedText,
      createdAt: Date.now(),
    };

    const prev = get().comments;
    set({ comments: [item, ...prev], isSaving: true, error: null });
    try {
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Failed to add comment" });
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
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Failed to edit comment" });
    }
  },

  removeComment: async (id) => {
    const next = get().comments.filter((c) => c.id !== id);
    set({ comments: next, isSaving: true, error: null });
    try {
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Failed to remove comment" });
    }
  },

  clearAll: async () => {
    set({ comments: [], isSaving: true, error: null });
    try {
      await new Promise((r) => setTimeout(r, 120));
      set({ isSaving: false });
    } catch {
      set({ isSaving: false, error: "Failed to clear comments" });
    }
  },

  setCommentsFromGraph: (items) => {
    const normalized: CommentItem[] = (items ?? [])
      .filter((c) => typeof c.nodeIndex === "number" && c.nodeIndex >= 0)
      .map((c) => ({
        ...c,
        id: c.id ?? nanoid(),
        createdAt: c.createdAt ?? Date.now(),
      }));

    set({ comments: normalized });
  },

  getCommentsForNode: (nodeIndex) =>
    get()
      .comments.filter((c) => c.nodeIndex === nodeIndex)
      .sort((a, b) => b.createdAt - a.createdAt),

  getAllSorted: () =>
    [...get().comments].sort((a, b) => b.createdAt - a.createdAt),
}));

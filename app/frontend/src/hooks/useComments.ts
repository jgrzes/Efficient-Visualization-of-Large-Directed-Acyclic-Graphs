// app/frontend/src/hooks/useComments.ts
import { create } from "zustand";
import { nanoid } from "nanoid";
import { NodeInfoProps } from "../components/leftsidebar/NodeInfo";

export type CommentItem = {
  id: string;
  nodeIndex: number;
  nodeName: string;

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
  isLoading: boolean; // kept for UI compatibility, but sync now
  isSaving: boolean;  // kept for UI compatibility, but sync now
  error: string | null;

  // actions (sync now)
  loadComments: () => void;
  addComment: (
    node: Pick<NodeInfoProps, "index" | "name">,
    comment: NewCommentPayload
  ) => void;
  editComment: (id: string, text: string) => void;
  removeComment: (id: string) => void;
  clearAll: () => void;

  setCommentsFromGraph: (items: CommentItem[]) => void;

  getCommentsForNode: (nodeIndex: number) => CommentItem[];
  getAllSorted: () => CommentItem[];
};

export const useComments = create<CommentsState>((set, get) => ({
  comments: [],
  isLoading: false,
  isSaving: false,
  error: null,

  // If you don't load from API, this can just clear errors / no-op
  loadComments: () => {
    set({ isLoading: false, error: null });
  },

  addComment: (node, comment) => {
    const trimmedText = comment.text.trim();
    const trimmedTitle = comment.name.trim();
    if (!trimmedText || !trimmedTitle) return;

    const idx = node.index;
    if (typeof idx !== "number" || idx < 0) return;

    const item: CommentItem = {
      id: nanoid(),
      nodeIndex: idx,
      nodeName: node.name ?? `Node ${idx}`,
      title: trimmedTitle,
      text: trimmedText,
      createdAt: Date.now(),
    };

    set((s) => ({
      comments: [item, ...s.comments],
      isSaving: false,
      error: null,
    }));
  },

  editComment: (id, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === id ? { ...c, text: trimmed, updatedAt: Date.now() } : c
      ),
      isSaving: false,
      error: null,
    }));
  },

  removeComment: (id) => {
    set((s) => ({
      comments: s.comments.filter((c) => c.id !== id),
      isSaving: false,
      error: null,
    }));
  },

  clearAll: () => {
    set({ comments: [], isSaving: false, error: null });
  },

  setCommentsFromGraph: (items) => {
    const normalized: CommentItem[] = (items ?? [])
      .filter((c) => typeof c.nodeIndex === "number" && c.nodeIndex >= 0)
      .map((c) => ({
        ...c,
        id: c.id ?? nanoid(),
        nodeName:
          typeof c.nodeName === "string" && c.nodeName.trim().length > 0
            ? c.nodeName
            : `Node ${c.nodeIndex}`,
        createdAt: typeof c.createdAt === "number" ? c.createdAt : Date.now(),
      }));

    set({ comments: normalized, error: null });
  },

  getCommentsForNode: (nodeIndex) =>
    get()
      .comments.filter((c) => c.nodeIndex === nodeIndex)
      .sort((a, b) => b.createdAt - a.createdAt),

  getAllSorted: () =>
    [...get().comments].sort((a, b) => b.createdAt - a.createdAt),
}));

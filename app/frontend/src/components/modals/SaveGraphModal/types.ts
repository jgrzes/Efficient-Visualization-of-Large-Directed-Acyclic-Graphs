export type GroupInfo = {
  group_name: string;
  created_at?: string;
};

export interface SaveGraphModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (groupName: string | null, password: string | null) => void;
  loading: boolean;
  hash: string | null;
  error: string | null;

  groups: GroupInfo[];
  groupsLoading: boolean;
  onRefreshGroups: () => void;
}

export interface GroupInfo {
  group_name: string;
  created_at?: string;
}

export interface LoadSourceModalProps {
  open: boolean;
  onClose: () => void;

  onSelectFile: () => void;
  onSelectHash: (hash: string) => void | Promise<void>;
  onSelectDb: (groupName: string, password: string) => void | Promise<void>;

  loading: boolean;
  error: string | null;
  groups: GroupInfo[];
  onRefreshGroups: () => void;
}

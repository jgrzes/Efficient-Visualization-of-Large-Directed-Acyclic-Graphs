import type { GraphColors } from "../../../graph/types";

export type Theme = "light" | "dark";

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  pointSize: number;
  colors: GraphColors;
  onApply: (pointSize: number, colors: GraphColors) => void;
}

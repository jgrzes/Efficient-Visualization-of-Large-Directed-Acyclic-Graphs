import { useCallback, useState } from "react";
import type { ToastKind, ToastState } from "../components/modals/AppToastModal";

const initial: ToastState = {
  open: false,
  kind: "info",
  message: "",
};

export function useAppToast() {
  const [toast, setToast] = useState<ToastState>(initial);

  const closeToast = useCallback(() => {
    setToast((t) => ({ ...t, open: false }));
  }, []);

  const showToast = useCallback(
    (kind: ToastKind, message: string, title?: string) => {
      setToast({ open: true, kind, message, title });
    },
    []
  );

  const showError = useCallback(
    (message: string, title?: string) => showToast("error", message, title),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => showToast("info", message, title),
    [showToast]
  );

  return { toast, showToast, showError, showInfo, closeToast };
}

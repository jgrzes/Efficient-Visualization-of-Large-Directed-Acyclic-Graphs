import { useCallback, useContext, useEffect, useRef } from "react";
import { AppContext } from "../context/AppContext";

type KeepAliveType = "interval" | "visible" | "hidden" | "closed";

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useStartKeepAlive(endpoint: string, intervalMs = 10_000) {
  const appContext = useContext(AppContext);
  const uuidRef = useLatestRef(appContext?.currentGraphUUID ?? null);
  const endpointRef = useLatestRef(endpoint);

  const sendKeepAlive = useCallback((type: KeepAliveType = "interval") => {
    const uuid = uuidRef.current;

    return fetch(endpointRef.current, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: Date.now(),
        type,
        uuid,
      }),
    }).catch((err) => {
      console.error("Keepalive failed:", err);
    });
  }, [endpointRef, uuidRef]);

  useEffect(() => {
    const onVisibilityChange = () => {
      void sendKeepAlive(document.hidden ? "hidden" : "visible");
    };

    const onBeforeUnload = () => {
      void sendKeepAlive("closed");
    };

    const onPageHide = () => {
      try {
        const payload = JSON.stringify({
          date: Date.now(),
          type: "closed",
          uuid: uuidRef.current,
        });
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(endpointRef.current, blob);
      } catch {
        void sendKeepAlive("closed");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    onVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [sendKeepAlive, endpointRef, uuidRef]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) void sendKeepAlive("interval");
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [sendKeepAlive, intervalMs]);
}

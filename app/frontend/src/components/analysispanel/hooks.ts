import * as React from "react";
import { clamp, type Pos } from "./utils";

type Mode = "collapsed" | "expanded";

export function useDockedPanelPosition(opts: {
  collapsed: boolean;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  margin?: number;
  headerSafe?: number;
  snapThreshold?: number;
}) {
  const {
    collapsed,
    constraintsRef,
    panelRef,
    margin = 16,
    headerSafe = 64,
    snapThreshold = 90,
  } = opts;

  const getRects = React.useCallback(() => {
    const c = constraintsRef.current?.getBoundingClientRect();
    const p = panelRef.current?.getBoundingClientRect();
    return { c, p };
  }, [constraintsRef, panelRef]);

  const clampToViewport = React.useCallback(
    (next: Pos, mode: Mode) => {
      const { c, p } = getRects();
      if (!c || !p) return { x: -margin, y: -margin };

      const viewportH = c.height;
      const panelH = p.height;

      const x = -margin; // dock right
      const maxY = -margin;

      let minY: number;
      if (mode === "collapsed") {
        minY = -(viewportH - headerSafe - margin);
      } else {
        minY = -(viewportH - panelH - margin);
      }

      if (minY > maxY) {
        minY = -(viewportH - headerSafe - margin);
      }

      return { x, y: clamp(next.y, minY, maxY) };
    },
    [getRects, margin, headerSafe]
  );

  const maybeSnapY = React.useCallback(
    (next: Pos) => {
      const { c, p } = getRects();
      if (!c || !p) return next;

      const viewportH = c.height;
      const panelH = p.height;

      const topY = -(viewportH - panelH - margin);
      const bottomY = -margin;

      if (Math.abs(next.y - topY) < snapThreshold) return { ...next, y: topY };
      if (Math.abs(next.y - bottomY) < snapThreshold) return { ...next, y: bottomY };

      return next;
    },
    [getRects, margin, snapThreshold]
  );

  const mode: Mode = collapsed ? "collapsed" : "expanded";

  const clampNow = React.useCallback(
    (pos: Pos) => clampToViewport(pos, mode),
    [clampToViewport, mode]
  );

  const clampAndSnapNow = React.useCallback(
    (pos: Pos) => maybeSnapY(clampToViewport(pos, mode)),
    [clampToViewport, maybeSnapY, mode]
  );

  // re-clamp on resize
  React.useEffect(() => {
    const onResize = () => {
      // caller ma state, ale tu nie chcemy go trzymać – tylko sygnał.
      // więc oddajemy funkcje, a w AnalysisPanel zrobisz setPos(p => clampNow(p))
    };
    void onResize;
  }, []);

  const reclampAfterLayout = React.useCallback(
    (setPos: React.Dispatch<React.SetStateAction<Pos>>) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPos((p) => clampNow(p));
        });
      });
    },
    [clampNow]
  );

  return {
    mode,
    clampNow,
    clampAndSnapNow,
    reclampAfterLayout,
  };
}

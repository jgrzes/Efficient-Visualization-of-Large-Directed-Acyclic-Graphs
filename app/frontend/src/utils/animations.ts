import { cubicBezier, type Variants } from "framer-motion";

export const easeCurve = cubicBezier(0.22, 0.61, 0.36, 1);

export const makeVariants = (reduced: boolean): Variants => ({
  initial: (dir: number) =>
    reduced ? { opacity: 0 } : { opacity: 0, x: dir > 0 ? 8 : -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.18, ease: easeCurve },
  },
  exit: (dir: number) =>
    reduced
      ? { opacity: 0 }
      : { opacity: 0, x: dir > 0 ? -8 : 8, transition: { duration: 0.14, ease: easeCurve } },
});
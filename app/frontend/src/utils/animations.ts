import { cubicBezier, type Variants } from "framer-motion";

const OFFSET = 8;
export const easeCurve = cubicBezier(0.22, 0.61, 0.36, 1);

type Direction = 1 | -1;

export const makeVariants = (reduced: boolean): Variants => ({
  initial: (dir: Direction) =>
    reduced
      ? { opacity: 0 }
      : { opacity: 0, x: dir > 0 ? OFFSET : -OFFSET },

  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.18, ease: easeCurve },
  },

  exit: (dir: Direction) =>
    reduced
      ? { opacity: 0 }
      : {
          opacity: 0,
          x: dir > 0 ? -OFFSET : OFFSET,
          transition: { duration: 0.14, ease: easeCurve },
        },
});

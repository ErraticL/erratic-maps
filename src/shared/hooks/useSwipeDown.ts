import { useRef } from "react";

/** The drag must move this many pixels before the sheet follows it. */
const MOVE_THRESHOLD = 10;

/** An upward drag longer than this expands the sheet. */
const EXPAND_THRESHOLD = 60;

/**
 * The release speed that closes the sheet, in pixels per millisecond.
 * Sonner ships this value and it is a good default.
 */
const VELOCITY_THRESHOLD = 0.11;

/** The resistance constant of the rubber band. A smaller value resists more. */
const RUBBERBAND_CONSTANT = 0.55;

/** The hook keeps this many recent move samples to measure the speed. */
const MAX_SAMPLES = 6;

/** Samples older than this do not count towards the release speed. */
const SAMPLE_WINDOW_MS = 100;

type Sample = { y: number; t: number };

/**
 * Applies progressive resistance to an overshoot.
 * The result grows more slowly as the overshoot grows.
 */
export function rubberband(
  overshoot: number,
  dim: number,
  c: number = RUBBERBAND_CONSTANT,
): number {
  if (dim <= 0) return overshoot;
  return (overshoot * dim * c) / (dim + c * Math.abs(overshoot));
}

/**
 * Reads the vertical translation that the element shows right now.
 * The value is correct while a transition runs, so a re-grab can start
 * from the live position instead of from zero.
 */
export function readTranslateY(element: HTMLElement): number {
  const { transform } = window.getComputedStyle(element);
  if (!transform || transform === "none") return 0;

  const match = transform.match(/matrix3d\((.+)\)|matrix\((.+)\)/);
  if (!match) return 0;

  const values = (match[1] ?? match[2]).split(",").map((part) => Number(part));
  if (match[1]) return values[13] || 0;
  return values[5] || 0;
}

/**
 * Restricts swipe-to-close to the drag handle only.
 * - `sheetRef`  — attach to the sheet wrapper (receives the translateY transform)
 * - `handleRef` — attach to the handle bar (the only area that initiates a drag)
 *
 * The hook uses Pointer Events, so touch, mouse and stylus follow one path.
 * Scrollable content inside the sheet is unaffected.
 */
export function useSwipeDown(
  onClose: () => void,
  threshold = 80,
  options?: {
    /**
     * The sheet expands. The argument is the vertical offset in pixels that
     * the sheet shows at release. The caller needs it to continue the
     * movement from the position that the user sees.
     */
    onExpand?: (offsetY: number) => void;
  },
) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  const drag = useRef({
    pointerId: -1,
    active: false,
    committed: false,
    startY: 0,
    originY: 0,
    slack: 0,
    samples: [] as Sample[],
  });

  /** Returns the drag distance, with the movement threshold removed. */
  const distanceOf = (clientY: number) =>
    clientY - drag.current.startY - drag.current.slack;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only the primary button starts a drag.
    if (e.button !== 0) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    drag.current.pointerId = e.pointerId;
    drag.current.active = true;
    drag.current.committed = false;
    drag.current.startY = e.clientY;
    // Start from the live position, so a re-grab during a flight does not jump.
    drag.current.originY = readTranslateY(sheet);
    drag.current.slack = 0;
    drag.current.samples = [{ y: e.clientY, t: e.timeStamp }];

    try {
      // The capture keeps the moves on the handle when the finger leaves it.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some pointers refuse the capture. The drag still works without it.
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state.active || e.pointerId !== state.pointerId) return;
    const sheet = sheetRef.current;
    if (!sheet) return;

    if (!state.committed) {
      const raw = e.clientY - state.startY;
      // A tap with a small finger jitter must not move the sheet.
      if (Math.abs(raw) < MOVE_THRESHOLD) return;
      state.committed = true;
      // Remove the threshold, so the sheet does not jump when it engages.
      state.slack = Math.sign(raw) * MOVE_THRESHOLD;
      // The drag takes the sheet over from the entry transition.
      state.originY = readTranslateY(sheet);
      sheet.style.transition = "none";
    }

    state.samples.push({ y: e.clientY, t: e.timeStamp });
    if (state.samples.length > MAX_SAMPLES) state.samples.shift();

    const distance = distanceOf(e.clientY);
    // An upward drag meets progressive resistance.
    const followed =
      distance < 0
        ? rubberband(distance, sheet.offsetHeight || window.innerHeight)
        : distance;

    sheet.style.transform = `translateY(${state.originY + followed}px)`;
  };

  /** Returns the release speed in pixels per millisecond, and its direction. */
  const releaseVelocity = (clientY: number, timeStamp: number) => {
    const samples = drag.current.samples;
    const last: Sample = { y: clientY, t: timeStamp };
    let first = samples[0] ?? last;
    for (const sample of samples) {
      if (last.t - sample.t <= SAMPLE_WINDOW_MS) {
        first = sample;
        break;
      }
    }

    const elapsed = last.t - first.t;
    const travel = last.y - first.y;
    if (elapsed <= 0) return { speed: 0, isDownward: travel > 0 };
    return { speed: Math.abs(travel) / elapsed, isDownward: travel > 0 };
  };

  const finish = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const state = drag.current;
    if (!state.active || e.pointerId !== state.pointerId) return;
    state.active = false;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const sheet = sheetRef.current;
    // The drag never engaged, so the sheet never moved. This was a tap.
    if (!state.committed || !sheet) return;

    const distance = distanceOf(e.clientY);
    const { speed, isDownward } = releaseVelocity(e.clientY, e.timeStamp);
    const offsetY = readTranslateY(sheet);

    // Hand the sheet back to the stylesheet. The transition runs from the
    // position that the user sees to the position that the class sets.
    sheet.style.transition = "";
    sheet.style.transform = "";

    if (cancelled) return;

    if (distance < -EXPAND_THRESHOLD) {
      options?.onExpand?.(offsetY);
      return;
    }

    // A long drag closes the sheet. A fast flick closes it as well, but only
    // when the last samples move down.
    if (distance > threshold || (isDownward && speed > VELOCITY_THRESHOLD)) {
      onClose();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => finish(e, false);
  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) =>
    finish(e, true);

  const handleProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };

  return { sheetRef, handleRef, handleProps };
}

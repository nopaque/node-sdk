import { NopaqueTimeoutError } from './errors.js';

export interface PollIntervalParams {
  base?: number;   // ms
  cap?: number;    // ms
}

const DEFAULT_BASE = 5000;
const DEFAULT_CAP = 15000;

export function pollIntervalCurve(
  step: number,
  { base = DEFAULT_BASE, cap = DEFAULT_CAP }: PollIntervalParams = {}
): number {
  if (step < 2) return base;
  const soft = base * 1.2 ** (step - 1);
  return Math.min(cap, soft);
}

export interface WaitForArgs<T> {
  fetch: () => Promise<T>;
  isTerminal: (doc: T) => boolean;
  timeout?: number;         // ms
  initialInterval?: number; // ms
  intervalCap?: number;     // ms
  onUpdate?: (doc: T) => void;
}

export async function waitFor<T>(args: WaitForArgs<T>): Promise<T> {
  const timeout = args.timeout ?? 600_000;
  const initial = args.initialInterval ?? DEFAULT_BASE;
  const cap = args.intervalCap ?? DEFAULT_CAP;
  const deadline = Date.now() + timeout;
  let step = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const doc = await args.fetch();
    if (args.onUpdate) {
      try { args.onUpdate(doc); } catch { /* never break the wait */ }
    }
    if (args.isTerminal(doc)) return doc;
    const now = Date.now();
    if (now >= deadline) {
      throw new NopaqueTimeoutError(`waitFor timed out after ${timeout}ms`);
    }
    const interval = Math.min(
      pollIntervalCurve(step, { base: initial, cap }),
      Math.max(0, deadline - now)
    );
    await new Promise((r) => setTimeout(r, interval));
    step++;
  }
}

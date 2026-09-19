import { useSyncExternalStore } from 'react';

export type EntryPhase = 'preparing' | 'revealing' | 'complete';
export type EntryPart = 'photo' | 'glass';
export type EntryResult = 'ready' | 'fallback';
export type EntryTransition = {
  id: number;
  /** Absolute performance.now() origin, shared by the DOM and renderer. */
  startedAt: number;
  durationMs: number;
  mode: 'morph' | 'fade';
};
export type EntryBridge = {
  version: string; phase: EntryPhase; startedAt: number; milestones: Record<string, number>;
  parts: Record<EntryPart, EntryResult | 'pending'>;
  appReady: boolean; fontsReady: boolean; reason: string; error: boolean;
  transition: EntryTransition | null;
  subscribe(listener: () => void): () => void;
  markAppReady(): void;
  settlePart(part: EntryPart, result: EntryResult): void;
  release(reason?: string): void;
  fail(reason?: string): void;
  setMorphReady(): void;
  /** Call after the final wordmark frame is drawn; stale transition ids are ignored. */
  finishReveal(id: number): void;
};

declare global { interface Window { __gxcEntry?: EntryBridge } }

const subscribe = (listener: () => void) => window.__gxcEntry?.subscribe(listener) ?? (() => {});
const snapshot = (): EntryPhase => window.__gxcEntry?.phase ?? 'complete';

/** The classic HTML bridge exists before React or its module dependencies load. */
export function useEntryPhase(): EntryPhase { return useSyncExternalStore(subscribe, snapshot, () => 'complete'); }
export function markEntryAppReady() { window.__gxcEntry?.markAppReady(); }
export function settleEntryPart(part: EntryPart, result: EntryResult) { window.__gxcEntry?.settlePart(part, result); }
export function releaseEntry(reason?: string) { window.__gxcEntry?.release(reason); }
export function setEntryMorphReady() { window.__gxcEntry?.setMorphReady(); }
export function finishEntryReveal(id: number) { window.__gxcEntry?.finishReveal(id); }

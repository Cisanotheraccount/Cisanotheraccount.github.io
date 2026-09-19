import { useSyncExternalStore } from 'react';

export type EntryPhase = 'preparing' | 'revealing' | 'complete';
export type EntryPart = 'photo' | 'glass';
export type EntryResult = 'ready' | 'fallback';
export type EntryBridge = {
  version: string; phase: EntryPhase; startedAt: number; milestones: Record<string, number>;
  parts: Record<EntryPart, EntryResult | 'pending'>;
  appReady: boolean; fontsReady: boolean; reason: string; error: boolean;
  subscribe(listener: () => void): () => void;
  markAppReady(): void;
  settlePart(part: EntryPart, result: EntryResult): void;
  release(reason?: string): void;
  fail(reason?: string): void;
};

declare global { interface Window { __gxcEntry?: EntryBridge } }

const subscribe = (listener: () => void) => window.__gxcEntry?.subscribe(listener) ?? (() => {});
const snapshot = (): EntryPhase => window.__gxcEntry?.phase ?? 'complete';

/** The classic HTML bridge exists before React or its module dependencies load. */
export function useEntryPhase(): EntryPhase { return useSyncExternalStore(subscribe, snapshot, () => 'complete'); }
export function markEntryAppReady() { window.__gxcEntry?.markAppReady(); }
export function settleEntryPart(part: EntryPart, result: EntryResult) { window.__gxcEntry?.settlePart(part, result); }
export function releaseEntry(reason?: string) { window.__gxcEntry?.release(reason); }

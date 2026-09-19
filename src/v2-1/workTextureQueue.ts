import { recordTouchMetric, sampleTouchMetric } from './touchDiagnostics';

export interface WorkTextureJob {
  key: object;
  valid(): boolean;
  /** Infinity keeps distant artwork dormant without changing native img loading. */
  priority(): number;
  decode(): Promise<HTMLImageElement>;
  upload(image: HTMLImageElement): void;
  failed(stage: 'decode' | 'upload'): void;
  discarded(): void;
}
type Entry = { job: WorkTextureJob; phase: 'queued' | 'decoding' | 'decoded'; image?: HTMLImageElement };

/** A scheduler client, never an independent RAF. Source ownership stays with workScene. */
export function createWorkTextureQueue(wake: () => void) {
  const entries = new Map<object, Entry>();
  let decoding = 0, disposed = false;
  const valid = (entry: Entry) => !disposed && entries.get(entry.job.key) === entry && entry.job.valid();
  const prune = () => {
    for (const [key, entry] of entries) if (!entry.job.valid()) { entries.delete(key); entry.job.discarded(); }
  };
  const ordered = (phase: Entry['phase']) => [...entries.values()]
    .filter(entry => entry.phase === phase && Number.isFinite(entry.job.priority()))
    .sort((a, b) => a.job.priority() - b.job.priority());
  return {
    enqueue(job: WorkTextureJob) {
      if (disposed) return;
      entries.set(job.key, { job, phase: 'queued' });
      wake();
    },
    cancel(key: object) { const entry = entries.get(key); entries.delete(key); entry?.job.discarded(); },
    prepare() {
      if (disposed) return;
      prune();
      for (const entry of ordered('queued')) {
        if (decoding >= 2) break;
        entry.phase = 'decoding'; decoding++;
        recordTouchMetric('work.decode.started'); sampleTouchMetric('work.decode.concurrent', decoding);
        const started = performance.now();
        void entry.job.decode().then(image => {
          if (!valid(entry)) return;
          entry.image = image; entry.phase = 'decoded';
          recordTouchMetric('work.decode.completed');
          sampleTouchMetric('work.decode.elapsedMs', performance.now() - started);
        }, () => {
          if (!valid(entry)) return;
          entries.delete(entry.job.key); recordTouchMetric('work.decode.failed'); entry.job.failed('decode');
        }).finally(() => {
          decoding--;
          if (!disposed) wake();
        });
      }
    },
    /** Call at most once from each actual render phase; never from decode completion. */
    uploadOne() {
      if (disposed) return false;
      prune();
      const entry = ordered('decoded')[0];
      if (!entry?.image) return false;
      entries.delete(entry.job.key);
      const started = performance.now();
      try {
        entry.job.upload(entry.image);
        recordTouchMetric('work.upload.completed');
        sampleTouchMetric('work.upload.cpuMs', performance.now() - started);
      } catch {
        recordTouchMetric('work.upload.failed'); entry.job.failed('upload');
      }
      return true;
    },
    hasReadyWork() {
      if (disposed) return false;
      prune();
      return [...entries.values()].some(entry => Number.isFinite(entry.job.priority())
        && (entry.phase === 'decoded' || entry.phase === 'queued' && decoding < 2));
    },
    dispose() { disposed = true; entries.clear(); },
  };
}

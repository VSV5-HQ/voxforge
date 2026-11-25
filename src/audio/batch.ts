export type BatchItemStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'outdated'
  | 'error';

export interface BatchQueueSummary {
  total: number;
  queued: number;
  processing: number;
  ready: number;
  outdated: number;
  error: number;
  pendingCount: number;
}

export function sanitizeBaseFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '').trim();
  const cleaned = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'audio-clip';
}

export function buildBatchOutputFilename(
  originalFilename: string,
  effectSlug: string
): string {
  const base = sanitizeBaseFilename(originalFilename);
  const slug = sanitizeBaseFilename(effectSlug);
  return `${base}-${slug}.wav`;
}

export function deduplicateFilenames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf('.');
    if (dot === -1) return `${name}-${count + 1}`;
    return `${name.slice(0, dot)}-${count + 1}${name.slice(dot)}`;
  });
}

export function summarizeBatchStatus(
  statuses: BatchItemStatus[]
): BatchQueueSummary {
  const summary: BatchQueueSummary = {
    total: statuses.length,
    queued: 0,
    processing: 0,
    ready: 0,
    outdated: 0,
    error: 0,
    pendingCount: 0,
  };

  for (const st of statuses) {
    summary[st] += 1;
  }
  summary.pendingCount = summary.queued + summary.outdated;
  return summary;
}

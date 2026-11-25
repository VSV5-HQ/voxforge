import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileAudio,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Archive,
} from 'lucide-react';
import { BatchItemStatus, summarizeBatchStatus } from '../audio/batch';
import { formatTimecode } from '../audio/waveform';

export interface BatchQueueItem {
  id: string;
  originalName: string;
  sourceBuffer: AudioBuffer;
  status: BatchItemStatus;
  renderedBuffer?: AudioBuffer;
  wavBlob?: Blob;
  outputFilename?: string;
  errorMessage?: string;
}

interface BatchQueuePanelProps {
  items: BatchQueueItem[];
  activePresetName: string;
  pitchSemitones: number;
  speed: number;
  isBatchProcessing: boolean;
  isDecodingBatch: boolean;
  previewingId: string | null;
  onAddFiles: (files: FileList) => void;
  onLoadDemoBatch: () => void;
  onProcessAll: () => void;
  onDownloadItem: (item: BatchQueueItem) => void;
  onDownloadAllZip: () => void;
  onPreviewItem: (item: BatchQueueItem) => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
}

export function BatchQueuePanel({
  items,
  activePresetName,
  pitchSemitones,
  speed,
  isBatchProcessing,
  isDecodingBatch,
  previewingId,
  onAddFiles,
  onLoadDemoBatch,
  onProcessAll,
  onDownloadItem,
  onDownloadAllZip,
  onPreviewItem,
  onRemoveItem,
  onClearQueue,
}: BatchQueuePanelProps) {
  const summary = summarizeBatchStatus(items.map((i) => i.status));
  const readyItems = items.filter((i) => i.status === 'ready' && i.wavBlob);

  return (
    <div className="space-y-4">
      {/* Batch Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            {summary.total} {summary.total === 1 ? 'file' : 'files'} queued
          </span>
          <span aria-hidden="true" className="mx-1.5 text-slate-300">
            ·
          </span>
          <span>
            Target: <strong className="font-semibold text-slate-800">{activePresetName}</strong>{' '}
            <span className="font-mono-num">
              ({pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st · {speed.toFixed(2)}x)
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer min-h-[40px] whitespace-nowrap shrink-0">
            <Plus className="h-4 w-4 text-slate-600" aria-hidden="true" />
            {isDecodingBatch ? 'Loading...' : 'Add Audio Files'}
            <input
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onAddFiles(e.target.files);
                }
                e.target.value = '';
              }}
              className="sr-only"
              aria-label="Add multiple audio files to batch queue"
            />
          </label>

          <button
            type="button"
            onClick={onLoadDemoBatch}
            disabled={isBatchProcessing || isDecodingBatch}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load Demo Batch (3)
          </button>

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearQueue}
              disabled={isBatchProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200 disabled:opacity-50 min-h-[40px] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Queue List / Empty State */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
          <FileAudio className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            No audio files in batch queue
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Drop multiple MP3/WAV files here, click Add Audio Files, or load the 3-clip demo batch to test bulk processing.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2.5">
                  File
                </th>
                <th scope="col" className="px-3 py-2.5 text-right whitespace-nowrap">
                  Duration
                </th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isPreviewing = previewingId === item.id;
                const sizeKb = item.wavBlob
                  ? Math.max(1, Math.round(item.wavBlob.size / 1024))
                  : null;
                const displayDuration =
                  item.renderedBuffer?.duration ?? item.sourceBuffer.duration;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="font-medium text-slate-900 truncate">
                        {item.originalName}
                      </div>
                      {item.outputFilename && item.status === 'ready' && (
                        <div className="text-xs text-slate-500 truncate">
                          → {item.outputFilename}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {formatTimecode(displayDuration)}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.status === 'queued' && (
                        <span className="text-xs font-medium text-slate-600">
                          Queued
                        </span>
                      )}
                      {item.status === 'outdated' && (
                        <span className="text-xs font-medium text-amber-700">
                          Settings changed · Re-apply
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Processing
                        </span>
                      )}
                      {item.status === 'ready' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Ready · <span className="font-mono-num">{sizeKb} KB</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          {item.errorMessage ?? 'Failed'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPreviewItem(item)}
                          disabled={isBatchProcessing}
                          aria-label={`Preview ${item.originalName}`}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 ${
                            isPreviewing
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                          {isPreviewing ? 'Stop' : 'Preview'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onDownloadItem(item)}
                          disabled={item.status !== 'ready' || !item.wavBlob}
                          aria-label={`Download ${item.outputFilename ?? item.originalName}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Download className="h-3 w-3" aria-hidden="true" />
                          WAV
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          disabled={isBatchProcessing}
                          aria-label={`Remove ${item.originalName} from queue`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Batch Process & Download Footer Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <button
          type="button"
          onClick={onProcessAll}
          disabled={items.length === 0 || isBatchProcessing || isDecodingBatch}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          {isBatchProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Applying Effects...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Apply Effects to All ({items.length})
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDownloadAllZip}
          disabled={readyItems.length === 0 || isBatchProcessing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <Archive className="h-4 w-4" aria-hidden="true" />
          Download All ({readyItems.length} WAVs as ZIP)
        </button>
      </div>
    </div>
  );
}

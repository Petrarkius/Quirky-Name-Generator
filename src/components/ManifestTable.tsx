import { AlertTriangle, Check, ClipboardCopy, Eye, RotateCw, Settings2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { LoreMap } from '../engine/exporter';
import { ColumnKey, ManifestRow } from '../engine/generator';

export interface ManifestTableProps {
  rows: ManifestRow[];
  activeColumns: ColumnKey[];
  baseSeed: number;
  loreMap: LoreMap;
  onCopyMarkdown: () => void;
  copied: boolean;
  onOpenMarkdownPreview: () => void;
  onRetryLoreRow: (row: ManifestRow) => void;
  onOpenApiConfig: () => void;
  onRestoreAllColumns: () => void;
  isLlmConfigured: boolean;
}

function splitQualifier(text: string): { primary: string; qualifier: string | null } {
  const match = text.match(/^(.*?)\s*\((.+)\)$/);
  if (!match) return { primary: text, qualifier: null };
  return { primary: match[1].trim(), qualifier: match[2].trim() };
}

export function ManifestTable({
  rows,
  activeColumns,
  baseSeed,
  loreMap,
  onCopyMarkdown,
  copied,
  onOpenMarkdownPreview,
  onRetryLoreRow,
  onOpenApiConfig,
  onRestoreAllColumns,
  isLlmConfigured,
}: ManifestTableProps) {
  const [copiedRowSeed, setCopiedRowSeed] = useState<number | null>(null);

  async function handleCopyName(row: ManifestRow) {
    try {
      await navigator.clipboard.writeText(row.name);
      setCopiedRowSeed(row.seed);
      setTimeout(() => {
        setCopiedRowSeed((prev) => (prev === row.seed ? null : prev));
      }, 1500);
    } catch {
      // Clipboard API unavailable
    }
  }

  const exportModeLabel =
    activeColumns.length === 1
      ? 'Bullet list export (1 column)'
      : `Markdown table export (${activeColumns.length} columns)`;

  return (
    <section aria-label="Generated Manifest Table" className="space-y-3">
      {/* Table Action & Metadata Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
          <span>
            {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Base seed {baseSeed}</span>
          {activeColumns.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-sans">{exportModeLabel}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenMarkdownPreview}
            disabled={activeColumns.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-md border border-slate-800 bg-[#0F141D] text-sm font-medium text-slate-300 hover:text-slate-100 hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Preview Markdown</span>
          </button>

          <button
            type="button"
            onClick={onCopyMarkdown}
            disabled={activeColumns.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-md border border-slate-700 bg-[#151C28] text-sm font-medium text-slate-100 hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-emerald-300">Copied Markdown</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Copy to Clipboard</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Empty Columns State */}
      {activeColumns.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-[#0F141D] p-12 text-center space-y-4">
          <p className="text-base font-medium text-slate-200">
            No columns are currently selected for display.
          </p>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Enable at least one column in the controls above to view the generated manifest or export Markdown.
          </p>
          <button
            type="button"
            onClick={onRestoreAllColumns}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-md bg-amber-500 text-[#090C12] text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
          >
            Restore Default Columns
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800/90 bg-[#0F141D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-[#131924] text-xs font-medium text-slate-400">
                  <th scope="col" className="w-12 py-3 pl-4 pr-2 font-mono tabular-nums">
                    #
                  </th>
                  {activeColumns.includes('name') && (
                    <th scope="col" className="py-3 px-4 min-w-[230px]">
                      Name
                    </th>
                  )}
                  {activeColumns.includes('role') && (
                    <th scope="col" className="py-3 px-4 min-w-[240px]">
                      Role
                    </th>
                  )}
                  {activeColumns.includes('personality') && (
                    <th scope="col" className="py-3 px-4 min-w-[220px]">
                      Personality
                    </th>
                  )}
                  {activeColumns.includes('seed') && (
                    <th scope="col" className="py-3 px-4 text-right min-w-[110px]">
                      Seed
                    </th>
                  )}
                  {activeColumns.includes('lore') && (
                    <th scope="col" className="py-3 pl-4 pr-5 min-w-[300px]">
                      Lore Snippet
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {rows.map((row) => {
                  const roleParts = splitQualifier(row.role);
                  const personalityParts = splitQualifier(row.personality);
                  const loreState = loreMap[row.seed];

                  return (
                    <tr
                      key={`${row.index}-${row.seed}`}
                      className="group hover:bg-slate-800/35 transition-colors"
                    >
                      <td className="py-3.5 pl-4 pr-2 font-mono tabular-nums text-xs text-slate-500 align-top">
                        {String(row.index).padStart(2, '0')}
                      </td>

                      {activeColumns.includes('name') && (
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-medium text-slate-100 leading-snug">
                              {row.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyName(row)}
                              title={`Copy "${row.name}"`}
                              aria-label={`Copy ${row.name}`}
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded text-slate-400 hover:text-amber-400 transition-opacity cursor-pointer shrink-0"
                            >
                              {copiedRowSeed === row.seed ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                              ) : (
                                <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}

                      {activeColumns.includes('role') && (
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-slate-200 leading-snug">{roleParts.primary}</div>
                          {roleParts.qualifier && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {roleParts.qualifier}
                            </div>
                          )}
                        </td>
                      )}

                      {activeColumns.includes('personality') && (
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-slate-200 leading-snug">
                            {personalityParts.primary}
                          </div>
                          {personalityParts.qualifier && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {personalityParts.qualifier}
                            </div>
                          )}
                        </td>
                      )}

                      {activeColumns.includes('seed') && (
                        <td className="py-3.5 px-4 text-right align-top font-mono tabular-nums text-amber-300/90">
                          {row.seed}
                        </td>
                      )}

                      {activeColumns.includes('lore') && (
                        <td className="py-3.5 pl-4 pr-5 align-top">
                          {!isLlmConfigured ? (
                            <button
                              type="button"
                              onClick={onOpenApiConfig}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                            >
                              <Settings2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Configure local endpoint</span>
                            </button>
                          ) : loreState?.status === 'loading' ? (
                            <div className="space-y-1.5 py-0.5" aria-label="Generating lore snippet">
                              <div className="h-3.5 w-4/5 rounded bg-slate-800 animate-pulse" />
                              <div className="h-3.5 w-3/5 rounded bg-slate-800/70 animate-pulse" />
                            </div>
                          ) : loreState?.status === 'done' ? (
                            <p className="text-slate-300 leading-relaxed text-[13px]">
                              {loreState.text}
                            </p>
                          ) : loreState?.status === 'error' ? (
                            <div className="flex items-center gap-2 text-xs text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{loreState.error || 'Endpoint unreachable'}</span>
                              <button
                                type="button"
                                onClick={() => onRetryLoreRow(row)}
                                className="inline-flex items-center gap-1 text-slate-300 hover:text-white underline underline-offset-2 cursor-pointer ml-1"
                              >
                                <RotateCw className="w-3 h-3" aria-hidden="true" />
                                <span>Retry</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRetryLoreRow(row)}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>Generate snippet</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

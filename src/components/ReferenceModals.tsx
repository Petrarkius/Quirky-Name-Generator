import { Check, ClipboardCopy, X } from 'lucide-react';
import { useEffect } from 'react';
import { ArchetypeDescriptor } from '../engine/lexicon';
import { MAX_SEED_MODULUS, ROW_SEED_STRIDE } from '../engine/prng';

export interface ArchetypesViewProps {
  archetypes: readonly ArchetypeDescriptor[];
  baseSeed: number;
  onBackToGenerator: () => void;
}

export function ArchetypesView({ archetypes, baseSeed, onBackToGenerator }: ArchetypesViewProps) {
  return (
    <section aria-label="Naming Archetypes and Seeding Specification" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-100">
            Syntactic Archetypes &amp; Seed Architecture
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Every generated identity draws deterministically from four grammatical templates defined in{' '}
            <code className="text-slate-300">/lexicon.yaml</code> and a 32-bit Mulberry32 stream derived from the base seed.
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToGenerator}
          className="px-4 py-2 min-h-[40px] rounded-md border border-slate-700 bg-[#151C28] text-sm font-medium text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Back to Manifest
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {archetypes.map((arch, idx) => (
          <article
            key={arch.id}
            className="rounded-lg border border-slate-800/90 bg-[#0F141D] p-5 space-y-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                0{idx + 1}. {arch.title}
              </h3>
              <span className="text-xs text-slate-400">{arch.inspiration}</span>
            </div>
            <div className="font-mono text-xs text-amber-300 bg-[#0A0D14] border border-slate-800 rounded px-3 py-2">
              {arch.formula}
            </div>
            <ul className="space-y-1 text-sm text-slate-300 pt-1">
              {arch.examples.map((example) => (
                <li key={example} className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-xs" aria-hidden="true">
                    —
                  </span>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800/90 bg-[#0F141D] p-5 space-y-2">
        <h3 className="font-display text-base font-semibold text-slate-100">
          Deterministic Row Seed Formula
        </h3>
        <p className="text-sm text-slate-400">
          Given base seed <span className="font-mono text-slate-200">{baseSeed}</span>, each row{' '}
          <span className="font-mono text-slate-200">i</span> computes an independent unsigned seed before running Mulberry32 sub-streams for Name, Role, and Personality:
        </p>
        <pre className="mt-2 p-3.5 rounded border border-slate-800 bg-[#0A0D14] font-mono text-xs text-amber-300 overflow-x-auto">
          {`RowSeed(i) = (${baseSeed} + i × ${ROW_SEED_STRIDE}) mod ${MAX_SEED_MODULUS}`}
        </pre>
      </div>
    </section>
  );
}

export interface MarkdownPreviewModalProps {
  isOpen: boolean;
  markdown: string;
  activeColumnCount: number;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}

export function MarkdownPreviewModal({
  isOpen,
  markdown,
  activeColumnCount,
  copied,
  onCopy,
  onClose,
}: MarkdownPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="markdown-preview-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-[#0F141D] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 id="markdown-preview-title" className="font-display text-lg font-semibold text-slate-100">
              Markdown Export Preview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeColumnCount === 1
                ? 'Mode B: Single-column flat Markdown bullet list'
                : `Mode A: Multi-column GitHub-flavored Markdown table (${activeColumnCount} columns)`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {markdown ? (
            <pre className="p-4 rounded-md border border-slate-800 bg-[#0A0D14] font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto whitespace-pre">
              {markdown}
            </pre>
          ) : (
            <p className="text-sm text-slate-400">
              Select at least one visible column to generate Markdown output.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[40px] rounded-md border border-slate-700 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!markdown}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-md bg-amber-500 text-[#090C12] text-sm font-semibold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

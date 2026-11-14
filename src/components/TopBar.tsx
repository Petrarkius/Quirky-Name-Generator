import { Settings2 } from 'lucide-react';

export interface TopBarProps {
  activeSection: 'generator' | 'archetypes' | 'markdown';
  onNavigate: (section: 'generator' | 'archetypes' | 'markdown') => void;
  onOpenApiConfig: () => void;
  llmStatus: 'unconfigured' | 'configured' | 'connected' | 'unreachable';
}

export function TopBar({
  activeSection,
  onNavigate,
  onOpenApiConfig,
  llmStatus,
}: TopBarProps) {
  return (
    <header className="border-b border-slate-800/90 bg-[#090C12]/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('generator')}
          className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-100 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 rounded-sm cursor-pointer"
        >
          Quirky Name Generator (QNG)
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium" aria-label="Primary">
          <button
            type="button"
            onClick={() => onNavigate('generator')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 rounded-sm ${
              activeSection === 'generator'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Manifest Generator
          </button>
          <button
            type="button"
            onClick={() => onNavigate('archetypes')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 rounded-sm ${
              activeSection === 'archetypes'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Naming Archetypes
          </button>
          <button
            type="button"
            onClick={() => onNavigate('markdown')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500 rounded-sm ${
              activeSection === 'markdown'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Export Preview
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenApiConfig}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-medium rounded-md border border-slate-700 bg-[#111620] text-slate-100 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <Settings2 className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>API Config</span>
            {llmStatus === 'connected' && (
              <span className="text-xs font-mono text-emerald-400">· Ready</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

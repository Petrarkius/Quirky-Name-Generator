import { AlertTriangle, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiConfigModal } from './components/ApiConfigModal';
import { ControlPanel } from './components/ControlPanel';
import { ManifestTable } from './components/ManifestTable';
import { ArchetypesView, MarkdownPreviewModal } from './components/ReferenceModals';
import { TopBar } from './components/TopBar';
import { COLUMN_DEFINITIONS, formatMarkdownExport, LoreMap } from './engine/exporter';
import { ColumnKey, generateManifest, ManifestRow } from './engine/generator';
import { LexiconData, loadLexicon, PersonalityOption, RoleOption } from './engine/lexicon';
import { createRandomBaseSeed } from './engine/prng';
import { DEFAULT_LLM_CONFIG, fetchLoreSnippet, LlmConfig } from './services/llmClient';

const STORAGE_KEY = 'qng_llm_settings_v1';
const DEFAULT_COLUMNS: ColumnKey[] = ['name', 'role', 'personality', 'seed'];

interface StoredLlmSettings {
  config: LlmConfig;
  configured: boolean;
}

function loadStoredLlmSettings(): StoredLlmSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { config: DEFAULT_LLM_CONFIG, configured: false };
    }
    const parsed = JSON.parse(raw) as Partial<StoredLlmSettings>;
    return {
      config: {
        baseUrl: parsed.config?.baseUrl ?? DEFAULT_LLM_CONFIG.baseUrl,
        apiKey: parsed.config?.apiKey ?? DEFAULT_LLM_CONFIG.apiKey,
        model: parsed.config?.model ?? DEFAULT_LLM_CONFIG.model,
      },
      configured: Boolean(parsed.configured),
    };
  } catch {
    return { config: DEFAULT_LLM_CONFIG, configured: false };
  }
}

export default function App() {
  const initialLlm = useMemo(() => loadStoredLlmSettings(), []);

  const [lexicon, setLexicon] = useState<LexiconData | null>(null);
  const [lexiconError, setLexiconError] = useState<string | null>(null);
  const [lexiconReloadNonce, setLexiconReloadNonce] = useState(0);

  const [count, setCount] = useState<number>(10);
  const [baseSeed, setBaseSeed] = useState<number>(48291);
  const [activeColumns, setActiveColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [activeRoles, setActiveRoles] = useState<RoleOption[]>([]);
  const [activePersonalities, setActivePersonalities] = useState<PersonalityOption[]>([]);

  const [activeSection, setActiveSection] = useState<'generator' | 'archetypes'>('generator');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [llmConfig, setLlmConfig] = useState<LlmConfig>(initialLlm.config);
  const [isLlmConfigured, setIsLlmConfigured] = useState<boolean>(initialLlm.configured);
  const [llmStatus, setLlmStatus] = useState<'unconfigured' | 'configured' | 'connected' | 'unreachable'>(
    initialLlm.configured ? 'configured' : 'unconfigured'
  );

  const [loreMap, setLoreMap] = useState<LoreMap>({});
  const loreMapRef = useRef<LoreMap>({});
  loreMapRef.current = loreMap;

  const [loreGenerationNonce, setLoreGenerationNonce] = useState(0);
  const batchAbortRef = useRef<AbortController | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLexiconError(null);

    loadLexicon('/lexicon.yaml')
      .then((data) => {
        if (cancelled) return;
        setLexicon(data);
        setActiveRoles(data.roles);
        setActivePersonalities(data.personalities);
      })
      .catch((err) => {
        if (cancelled) return;
        setLexiconError(
          err instanceof Error ? err.message : 'Unable to load /lexicon.yaml.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, [lexiconReloadNonce]);

  const rows = useMemo(() => {
    if (!lexicon) return [];
    return generateManifest(
      {
        count,
        baseSeed,
        activeRoles,
        activePersonalities,
      },
      lexicon
    );
  }, [count, baseSeed, activeRoles, activePersonalities, lexicon]);

  const isLoreActive = activeColumns.includes('lore');

  const runLoreBatch = useCallback(
    async (targetRows: ManifestRow[], config: LlmConfig, forceRefresh = false) => {
      if (batchAbortRef.current) {
        batchAbortRef.current.abort();
      }
      const controller = new AbortController();
      batchAbortRef.current = controller;

      const snapshot = loreMapRef.current;
      const queue = targetRows.filter((row) => {
        if (forceRefresh) return true;
        const current = snapshot[row.seed];
        return !current || current.status !== 'done';
      });

      if (queue.length === 0) return;

      setLoreMap((prev) => {
        const next: LoreMap = { ...prev };
        for (const row of queue) {
          next[row.seed] = { status: 'loading', text: '' };
        }
        return next;
      });

      let anySuccess = false;
      let anyFailure = false;
      const concurrency = 2;
      let cursor = 0;

      async function worker() {
        while (cursor < queue.length) {
          if (controller.signal.aborted) return;
          const idx = cursor;
          cursor += 1;
          const row = queue[idx];

          try {
            const text = await fetchLoreSnippet(row, config, controller.signal);
            if (controller.signal.aborted) return;
            anySuccess = true;
            setLoreMap((prev) => ({
              ...prev,
              [row.seed]: { status: 'done', text },
            }));
          } catch (err) {
            if (controller.signal.aborted) return;
            anyFailure = true;
            const message =
              err instanceof Error && err.message.includes('HTTP')
                ? err.message
                : 'Endpoint unreachable';
            setLoreMap((prev) => ({
              ...prev,
              [row.seed]: { status: 'error', text: '', error: message },
            }));
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
      );

      if (!controller.signal.aborted) {
        if (anySuccess) {
          setLlmStatus('connected');
        } else if (anyFailure) {
          setLlmStatus('unreachable');
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!lexicon || !isLoreActive || !isLlmConfigured) {
      if (batchAbortRef.current) {
        batchAbortRef.current.abort();
      }
      return;
    }

    const forceRefresh = loreGenerationNonce > 0;
    void runLoreBatch(rows, llmConfig, forceRefresh);

    return () => {
      if (batchAbortRef.current) {
        batchAbortRef.current.abort();
      }
    };
  }, [lexicon, isLoreActive, isLlmConfigured, rows, llmConfig, loreGenerationNonce, runLoreBatch]);

  async function handleRetryLoreRow(row: ManifestRow) {
    setLoreMap((prev) => ({
      ...prev,
      [row.seed]: { status: 'loading', text: '' },
    }));
    try {
      const text = await fetchLoreSnippet(row, llmConfig);
      setLlmStatus('connected');
      setLoreMap((prev) => ({
        ...prev,
        [row.seed]: { status: 'done', text },
      }));
    } catch (err) {
      setLlmStatus('unreachable');
      const message =
        err instanceof Error && err.message.includes('HTTP')
          ? err.message
          : 'Endpoint unreachable';
      setLoreMap((prev) => ({
        ...prev,
        [row.seed]: { status: 'error', text: '', error: message },
      }));
    }
  }

  function handleToggleColumn(column: ColumnKey) {
    setActiveColumns((prev) => {
      const exists = prev.includes(column);
      const nextSet = exists ? prev.filter((c) => c !== column) : [...prev, column];
      return COLUMN_DEFINITIONS.map((def) => def.key).filter((key) =>
        nextSet.includes(key)
      );
    });
  }

  function handleRandomizeSeed() {
    setBaseSeed(createRandomBaseSeed());
    setLoreGenerationNonce(0);
  }

  function handleGenerateTable() {
    if (isLoreActive && isLlmConfigured) {
      setLoreGenerationNonce((n) => n + 1);
    }
    tableContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleSaveApiConfig(nextConfig: LlmConfig, pingOk: boolean) {
    const configured = Boolean(nextConfig.baseUrl.trim());
    setLlmConfig(nextConfig);
    setIsLlmConfigured(configured);
    setLlmStatus(configured ? (pingOk ? 'connected' : 'configured') : 'unconfigured');
    setIsApiModalOpen(false);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ config: nextConfig, configured })
      );
    } catch {
      // Ignore storage errors in private contexts
    }
    if (configured && isLoreActive) {
      setLoreGenerationNonce((n) => n + 1);
    }
  }

  const markdownOutput = useMemo(
    () => formatMarkdownExport(rows, activeColumns, loreMap),
    [rows, activeColumns, loreMap]
  );

  async function handleCopyMarkdown() {
    if (!markdownOutput) return;
    try {
      await navigator.clipboard.writeText(markdownOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdownOutput;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const isGeneratingLore =
    isLoreActive &&
    isLlmConfigured &&
    rows.some((r) => loreMap[r.seed]?.status === 'loading');

  function handleNavigate(section: 'generator' | 'archetypes' | 'markdown') {
    if (section === 'markdown') {
      setIsPreviewModalOpen(true);
      return;
    }
    setActiveSection(section);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090C12] text-[#F1F5F9]">
      <TopBar
        activeSection={isPreviewModalOpen ? 'markdown' : activeSection}
        onNavigate={handleNavigate}
        onOpenApiConfig={() => setIsApiModalOpen(true)}
        llmStatus={llmStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {lexiconError ? (
          <div className="rounded-lg border border-rose-500/40 bg-[#0F141D] p-8 text-center space-y-4 max-w-xl mx-auto my-12">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="font-display text-lg font-semibold text-slate-100">
                Failed to Load Lexicon
              </h1>
              <p className="text-sm text-slate-400">{lexiconError}</p>
            </div>
            <button
              type="button"
              onClick={() => setLexiconReloadNonce((n) => n + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-md bg-amber-500 text-[#090C12] text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" aria-hidden="true" />
              <span>Retry Loading /lexicon.yaml</span>
            </button>
          </div>
        ) : !lexicon ? (
          <div className="space-y-6" aria-label="Loading lexicon">
            <div className="space-y-2">
              <div className="h-8 w-80 rounded bg-slate-800/80 animate-pulse" />
              <div className="h-4 w-[32rem] max-w-full rounded bg-slate-800/60 animate-pulse" />
            </div>
            <div className="h-44 rounded-lg border border-slate-800/90 bg-[#0F141D] animate-pulse" />
            <div className="h-96 rounded-lg border border-slate-800/90 bg-[#0F141D] animate-pulse" />
          </div>
        ) : activeSection === 'archetypes' ? (
          <ArchetypesView
            archetypes={lexicon.archetypes}
            baseSeed={baseSeed}
            onBackToGenerator={() => setActiveSection('generator')}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-100 text-balance">
                  Superintelligence Registry &amp; Manifest Generator
                </h1>
                <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                  Deterministic procedural identities inspired by Culture Minds and planetary Iterators. Adjust the seed, filter active traits, or attach a local LLM for lore accompaniment.
                </p>
              </div>
              <div className="sm:hidden flex items-center gap-3 text-xs font-medium text-slate-400">
                <button
                  type="button"
                  onClick={() => setActiveSection('archetypes')}
                  className="hover:text-amber-400 underline underline-offset-4 cursor-pointer"
                >
                  Naming Archetypes
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="hover:text-amber-400 underline underline-offset-4 cursor-pointer"
                >
                  Export Preview
                </button>
              </div>
            </div>

            <ControlPanel
              count={count}
              onCountChange={setCount}
              baseSeed={baseSeed}
              onBaseSeedChange={(next) => {
                setBaseSeed(next);
                setLoreGenerationNonce(0);
              }}
              onRandomizeSeed={handleRandomizeSeed}
              activeColumns={activeColumns}
              onToggleColumn={handleToggleColumn}
              roles={lexicon.roles}
              activeRoles={activeRoles}
              onActiveRolesChange={setActiveRoles}
              personalities={lexicon.personalities}
              activePersonalities={activePersonalities}
              onActivePersonalitiesChange={setActivePersonalities}
              onGenerateTable={handleGenerateTable}
              isGeneratingLore={isGeneratingLore}
            />

            <div ref={tableContainerRef}>
              <ManifestTable
                rows={rows}
                activeColumns={activeColumns}
                baseSeed={baseSeed}
                loreMap={loreMap}
                onCopyMarkdown={handleCopyMarkdown}
                copied={copied}
                onOpenMarkdownPreview={() => setIsPreviewModalOpen(true)}
                onRetryLoreRow={handleRetryLoreRow}
                onOpenApiConfig={() => setIsApiModalOpen(true)}
                onRestoreAllColumns={() => setActiveColumns(DEFAULT_COLUMNS)}
                isLlmConfigured={isLlmConfigured}
              />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/70 py-5 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>Quirky Name Generator (QNG) — Deterministic 32-bit Mulberry32 Manifest Engine</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('archetypes')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Seed &amp; Grammar Spec
            </button>
            <button
              type="button"
              onClick={() => setIsApiModalOpen(true)}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Local LLM Endpoint
            </button>
          </div>
        </div>
      </footer>

      <ApiConfigModal
        isOpen={isApiModalOpen}
        config={llmConfig}
        onClose={() => setIsApiModalOpen(false)}
        onSave={handleSaveApiConfig}
      />

      <MarkdownPreviewModal
        isOpen={isPreviewModalOpen}
        markdown={markdownOutput}
        activeColumnCount={activeColumns.length}
        copied={copied}
        onCopy={handleCopyMarkdown}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
}

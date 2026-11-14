import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Wifi, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { LlmConfig, pingLlmEndpoint, PingResult } from '../services/llmClient';

export interface ApiConfigModalProps {
  isOpen: boolean;
  config: LlmConfig;
  onClose: () => void;
  onSave: (config: LlmConfig, pingOk: boolean) => void;
}

export function ApiConfigModal({ isOpen, config, onClose, onSave }: ApiConfigModalProps) {
  const [draft, setDraft] = useState<LlmConfig>(config);
  const [showKey, setShowKey] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(config);
      setPingResult(null);
    }
  }, [isOpen, config]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handlePing() {
    setPinging(true);
    setPingResult(null);
    const result = await pingLlmEndpoint(draft);
    setPingResult(result);
    if (result.ok && result.availableModels && result.availableModels.length > 0) {
      if (!result.availableModels.includes(draft.model)) {
        setDraft((prev) => ({ ...prev, model: result.availableModels![0] }));
      }
    }
    setPinging(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave(draft, pingResult?.ok ?? false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-config-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-[#0F141D] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 id="api-config-title" className="font-display text-lg font-semibold text-slate-100">
              Local LLM API Configuration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Optional OpenAI-compatible endpoint for non-deterministic lore snippets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Presets */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400">Local Runtime Presets</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, baseUrl: 'http://localhost:11434/v1' }))
                }
                className="px-2.5 py-1 text-xs rounded border border-slate-700 bg-[#151C28] text-slate-300 hover:border-amber-500/60 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Ollama (:11434)
              </button>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, baseUrl: 'http://localhost:1234/v1' }))
                }
                className="px-2.5 py-1 text-xs rounded border border-slate-700 bg-[#151C28] text-slate-300 hover:border-amber-500/60 hover:text-amber-300 transition-colors cursor-pointer"
              >
                LM Studio (:1234)
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label htmlFor="llm-base-url" className="block text-xs font-medium text-slate-300">
              Base URL
            </label>
            <input
              id="llm-base-url"
              type="url"
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className="w-full min-h-[40px] px-3.5 py-2 rounded-md border border-slate-800 bg-[#0A0D14] font-mono text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label htmlFor="llm-api-key" className="block text-xs font-medium text-slate-300">
              API Key (Optional)
            </label>
            <div className="relative">
              <input
                id="llm-api-key"
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="bearer local"
                className="w-full min-h-[40px] pl-3.5 pr-10 py-2 rounded-md border border-slate-800 bg-[#0A0D14] font-mono text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <label htmlFor="llm-model-name" className="block text-xs font-medium text-slate-300">
              Model Name
            </label>
            <input
              id="llm-model-name"
              type="text"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              placeholder="llama3"
              className="w-full min-h-[40px] px-3.5 py-2 rounded-md border border-slate-800 bg-[#0A0D14] font-mono text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
            />
            {pingResult?.availableModels && pingResult.availableModels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pingResult.availableModels.slice(0, 6).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, model: m }))}
                    className={`px-2 py-1 text-xs font-mono rounded border transition-colors cursor-pointer ${
                      draft.model === m
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-slate-700 bg-[#151C28] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ping Test */}
          <div className="rounded-md border border-slate-800 bg-[#0A0D14] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs leading-relaxed">
              {pingResult ? (
                <div
                  className={`flex items-start gap-2 ${
                    pingResult.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {pingResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span>{pingResult.message}</span>
                </div>
              ) : (
                <span className="text-slate-400">
                  Numeric seed values are never transmitted to the LLM.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handlePing}
              disabled={pinging || !draft.baseUrl.trim()}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[36px] rounded border border-slate-700 bg-[#151C28] text-xs font-medium text-slate-200 hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
            >
              {pinging ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              )}
              <span>Ping Endpoint</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] rounded-md border border-slate-700 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 min-h-[40px] rounded-md bg-amber-500 text-[#090C12] text-sm font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

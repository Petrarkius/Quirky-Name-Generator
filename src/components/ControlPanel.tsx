import { Check, Dices, RefreshCw } from 'lucide-react';
import { ChangeEvent } from 'react';
import { COLUMN_DEFINITIONS } from '../engine/exporter';
import { ColumnKey } from '../engine/generator';
import { PersonalityOption, RoleOption } from '../engine/lexicon';
import { FilterDropdown } from './FilterDropdown';

export interface ControlPanelProps {
  count: number;
  onCountChange: (count: number) => void;
  baseSeed: number;
  onBaseSeedChange: (seed: number) => void;
  onRandomizeSeed: () => void;
  activeColumns: ColumnKey[];
  onToggleColumn: (column: ColumnKey) => void;
  roles: readonly RoleOption[];
  activeRoles: RoleOption[];
  onActiveRolesChange: (roles: RoleOption[]) => void;
  personalities: readonly PersonalityOption[];
  activePersonalities: PersonalityOption[];
  onActivePersonalitiesChange: (personalities: PersonalityOption[]) => void;
  onGenerateTable: () => void;
  isGeneratingLore: boolean;
}

export function ControlPanel({
  count,
  onCountChange,
  baseSeed,
  onBaseSeedChange,
  onRandomizeSeed,
  activeColumns,
  onToggleColumn,
  roles,
  activeRoles,
  onActiveRolesChange,
  personalities,
  activePersonalities,
  onActivePersonalitiesChange,
  onGenerateTable,
  isGeneratingLore,
}: ControlPanelProps) {
  function handleSeedInput(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      onBaseSeedChange(0);
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      onBaseSeedChange(Math.min(2147483646, Math.max(0, parsed)));
    }
  }

  function handleCountInput(e: ChangeEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(e.target.value, 10);
    if (Number.isFinite(parsed)) {
      onCountChange(Math.max(1, Math.min(20, parsed)));
    }
  }

  return (
    <section
      aria-label="Generator Parameters"
      className="rounded-lg border border-slate-800/90 bg-[#0F141D] p-5 sm:p-6 space-y-6"
    >
      {/* Row 1: Quantity + Base Seed + Generate Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
        {/* Quantity 1-20 */}
        <div className="lg:col-span-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="quantity-input" className="text-xs font-medium text-slate-400">
              Quantity (1–20)
            </label>
            <input
              id="quantity-input"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={handleCountInput}
              className="w-16 h-8 px-2 text-right font-mono tabular-nums text-sm rounded border border-slate-800 bg-[#0A0D14] text-slate-100 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="min-h-[40px] flex items-center">
            <input
              aria-label="Quantity slider"
              type="range"
              min={1}
              max={20}
              value={count}
              onChange={(e) => onCountChange(Number(e.target.value))}
              className="w-full gravitas-slider"
            />
          </div>
        </div>

        {/* Base Seed + Randomize */}
        <div className="lg:col-span-5 space-y-2">
          <label htmlFor="base-seed-input" className="block text-xs font-medium text-slate-400">
            Base Seed (Deterministic 32-bit Integer)
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id="base-seed-input"
              type="text"
              inputMode="numeric"
              value={baseSeed}
              onChange={handleSeedInput}
              className="flex-1 min-w-0 min-h-[40px] px-3.5 py-2 rounded-md border border-slate-800 bg-[#0A0D14] font-mono tabular-nums text-sm text-amber-300 focus:border-amber-500 focus:outline-none"
              placeholder="48291"
            />
            <button
              type="button"
              onClick={onRandomizeSeed}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-md border border-slate-700 bg-[#151C28] text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              <Dices className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span>Random</span>
            </button>
          </div>
        </div>

        {/* Generate / Refresh Action */}
        <div className="lg:col-span-3 flex lg:justify-end">
          <button
            type="button"
            onClick={onGenerateTable}
            className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[40px] rounded-md bg-amber-500 text-[#090C12] text-sm font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            <RefreshCw
              className={`w-4 h-4 shrink-0 ${isGeneratingLore ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Generate Table</span>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800/80" />

      {/* Row 2: Role & Personality Filters + Visible Column Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-3">
          <FilterDropdown
            label="Role Filters"
            options={roles}
            selected={activeRoles}
            onChange={onActiveRolesChange}
          />
        </div>

        <div className="lg:col-span-3">
          <FilterDropdown
            label="Personality Filters"
            options={personalities}
            selected={activePersonalities}
            onChange={onActivePersonalitiesChange}
          />
        </div>

        {/* Visible Columns */}
        <div className="lg:col-span-6">
          <span className="block text-xs font-medium text-slate-400 mb-1.5">
            Visible Columns
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {COLUMN_DEFINITIONS.map((col) => {
              const isChecked = activeColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => onToggleColumn(col.key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-md border text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${
                    isChecked
                      ? 'border-amber-500/45 bg-amber-500/10 text-slate-100'
                      : 'border-slate-800 bg-[#0A0D14] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-amber-500 border-amber-500 text-[#090C12]'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />}
                  </span>
                  <span>{col.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
